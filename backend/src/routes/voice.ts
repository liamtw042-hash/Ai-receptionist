import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import { db } from '../lib/firebase';
import { getAIResponse } from '../lib/openai';
import { getBusinessSettings, buildSystemPrompt } from '../services/businessContext';
import {
  createSession, getSession, addTurn, finalizeSession, detectOutcome,
} from '../services/callSessionService';
import {
  sendCallSummaryToTradie, sendBookingConfirmationToCaller,
  sendEmergencyAlertToTradie, sendMissedCallWinback, storeSMSMessage,
} from '../services/smsService';
import { upsertContact } from '../services/contactService';
import { resolveTwilioUser } from '../middleware/authMiddleware';

const router = Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Incoming call
router.post('/', async (req: Request, res: Response) => {
  const { CallSid, From, Called, SpeechResult } = req.body;
  const twiml = new VoiceResponse();

  try {
    const userId = await resolveTwilioUser(Called, db);
    if (!userId) {
      twiml.say({ voice: 'Polly.Nicole', language: 'en-AU' }, "Thanks for calling. We're not available right now, please try again later.");
      res.type('text/xml').send(twiml.toString());
      return;
    }

    const settings = await getBusinessSettings(userId);
    if (!settings) {
      twiml.say({ voice: 'Polly.Nicole', language: 'en-AU' }, "Thanks for calling. We're not available right now.");
      res.type('text/xml').send(twiml.toString());
      return;
    }

    let session = getSession(CallSid);

    if (!session) {
      // First turn — greet the caller
      session = createSession(CallSid, userId, From);
      await upsertContact(userId, From, { lastInteraction: new Date() });

      const greeting = `Hi, thanks for calling ${settings.businessName}, I'm their AI assistant — how can I help you today?`;
      addTurn(CallSid, 'assistant', greeting);

      const gather = twiml.gather({
        input: ['speech'],
        speechTimeout: 'auto',
        action: '/api/voice',
        method: 'POST',
        language: 'en-AU',
        speechModel: 'phone_call',
      });
      gather.say({ voice: 'Polly.Nicole', language: 'en-AU' }, greeting);

      twiml.redirect('/api/voice/no-input');
    } else if (SpeechResult) {
      // Subsequent turns
      addTurn(CallSid, 'user', SpeechResult);

      const isEmergency = /emergency|urgent|flood|gas leak|burst pipe|no power|fire/i.test(SpeechResult);

      let aiReply: string;
      if (isEmergency) {
        aiReply = `That sounds urgent. I'm going to flag this as an emergency right now — ${settings.traderName} will call you back within 30 minutes. Is there anything else I need to pass on?`;
        session.outcome = 'emergency';
        await sendEmergencyAlertToTradie(settings.mobileNumber, From, SpeechResult);
      } else {
        const systemPrompt = buildSystemPrompt(settings);
        const history = session.turns.slice(-8).map(t => ({ role: t.role, content: t.content }));
        aiReply = await getAIResponse(systemPrompt, SpeechResult, history.slice(0, -1));
      }

      addTurn(CallSid, 'assistant', aiReply);

      const gather = twiml.gather({
        input: ['speech'],
        speechTimeout: 'auto',
        action: '/api/voice',
        method: 'POST',
        language: 'en-AU',
        speechModel: 'phone_call',
      });
      gather.say({ voice: 'Polly.Nicole', language: 'en-AU' }, aiReply);
      twiml.redirect('/api/voice/no-input');
    } else {
      twiml.say({ voice: 'Polly.Nicole', language: 'en-AU' }, "Sorry, I didn't catch that — could you say that again?");
      const gather = twiml.gather({
        input: ['speech'],
        speechTimeout: 'auto',
        action: '/api/voice',
        method: 'POST',
        language: 'en-AU',
      });
      gather.say({ voice: 'Polly.Nicole', language: 'en-AU' }, "How can I help you today?");
    }
  } catch (err) {
    console.error('Voice webhook error:', err);
    twiml.say({ voice: 'Polly.Nicole', language: 'en-AU' }, "Sorry, we're having a technical issue. Please call back shortly.");
  }

  res.type('text/xml').send(twiml.toString());
});

// No input fallback
router.post('/no-input', (req: Request, res: Response) => {
  const twiml = new VoiceResponse();
  twiml.say({ voice: 'Polly.Nicole', language: 'en-AU' }, "I didn't hear anything — feel free to call back anytime. Cheers!");
  twiml.hangup();
  res.type('text/xml').send(twiml.toString());
});

// Call status callback — fires when call ends
router.post('/status', async (req: Request, res: Response) => {
  const { CallSid, CallStatus, From, Called } = req.body;

  if (CallStatus === 'no-answer' || CallStatus === 'busy') {
    // Missed call win-back
    try {
      const userId = await resolveTwilioUser(Called, db);
      if (userId) {
        const settings = await getBusinessSettings(userId);
        if (settings) {
          await sendMissedCallWinback(From, settings.businessName);
          await storeSMSMessage(userId, From,
            `Hi, sorry we missed your call — this is ${settings.businessName}. How can we help? Reply here and we'll get back to you shortly.`,
            'outbound'
          );
          await upsertContact(userId, From, { lastInteraction: new Date() });
        }
      }
    } catch (err) {
      console.error('Missed call winback error:', err);
    }
    res.sendStatus(200);
    return;
  }

  if (CallStatus === 'completed') {
    try {
      const session = getSession(CallSid);
      if (!session) { res.sendStatus(200); return; }

      const userId = await resolveTwilioUser(Called, db);
      if (!userId) { res.sendStatus(200); return; }

      const settings = await getBusinessSettings(userId);
      if (!settings) { res.sendStatus(200); return; }

      const transcript = session.turns.map(t => `${t.role === 'assistant' ? 'AI' : 'Caller'}: ${t.content}`).join('\n');
      const outcome = session.outcome === 'in_progress' ? detectOutcome(transcript) : session.outcome;

      const summaryPrompt = `Summarise this call transcript in 3 bullet points for a tradie. Include: what the caller wanted, any details captured (name, address, job type), and what was agreed.\n\n${transcript}`;
      const summary = await getAIResponse(
        'You are a concise assistant. Summarise call transcripts for tradies in plain English.',
        summaryPrompt
      );

      await finalizeSession(CallSid, summary, outcome);
      await sendCallSummaryToTradie(settings.mobileNumber, From, summary, outcome.replace(/_/g, ' ').toUpperCase());

      if (outcome === 'job_booked') {
        await sendBookingConfirmationToCaller(From, settings.businessName,
          'Your job has been logged. We\'ll confirm the exact time shortly.');
      }

      await upsertContact(userId, From, { lastInteraction: new Date(), notes: summary });
    } catch (err) {
      console.error('Call status error:', err);
    }
  }

  res.sendStatus(200);
});

export { router as voiceRouter };
