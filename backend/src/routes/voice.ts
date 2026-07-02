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
import { appendToSheet, createCalendarEvent } from './google';

const router = Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Helper: extract structured fields from AI summary for Sheet row
function extractCallDetails(
  transcript: string,
  summary: string,
  outcome: string,
  callerNumber: string,
  now: Date
): Record<string, string> {
  // Try to extract caller name from transcript
  const nameMatch = transcript.match(/(?:my name is|this is|it'?s)\s+([A-Z][a-z]+ ?[A-Z]?[a-z]*)/i);
  const callerName = nameMatch ? nameMatch[1].trim() : '';

  // Try to extract address
  const addrMatch = transcript.match(/(\d+\s+[A-Za-z]+ (?:St|Street|Rd|Road|Ave|Avenue|Dr|Drive|Cl|Close|Pl|Place|Cres|Crescent)[a-z,\s]*)/i);
  const address = addrMatch ? addrMatch[1].trim() : '';

  // Try to extract job type from first user turn
  const jobMatch = transcript.match(/(?:need|want|looking for|fix|repair|install|replace)\s+([a-zA-Z\s]{3,40}?)(?:\.|,|$)/i);
  const jobType = jobMatch ? jobMatch[1].trim() : '';

  // Try to extract quote
  const quoteMatch = transcript.match(/\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?/);
  const quoteGiven = quoteMatch ? quoteMatch[0] : '';

  return {
    date: now.toLocaleDateString('en-AU'),
    time: now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
    callerName,
    callerNumber,
    jobType,
    address,
    quoteGiven,
    outcome: outcome.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    notes: summary.replace(/\n/g, ' ').slice(0, 500),
  };
}

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

      const durationSeconds = req.body.CallDuration ? parseInt(req.body.CallDuration, 10) : undefined;

      const transcript = session.turns.map(t => `${t.role === 'assistant' ? 'AI' : 'Caller'}: ${t.content}`).join('\n');
      const outcome = session.outcome === 'in_progress' ? detectOutcome(transcript) : session.outcome;

      const summaryPrompt = `Summarise this call transcript in 3 bullet points for a tradie. Include: what the caller wanted, any details captured (name, address, job type), and what was agreed.\n\n${transcript}`;
      const summary = await getAIResponse(
        'You are a concise assistant. Summarise call transcripts for tradies in plain English.',
        summaryPrompt
      );

      const callDoc = await finalizeSession(CallSid, summary, outcome, durationSeconds);
      await sendCallSummaryToTradie(settings.mobileNumber, From, summary, outcome.replace(/_/g, ' ').toUpperCase());

      if (outcome === 'job_booked') {
        await sendBookingConfirmationToCaller(From, settings.businessName,
          'Your job has been logged. We\'ll confirm the exact time shortly.');
      }

      await upsertContact(userId, From, { lastInteraction: new Date(), notes: summary });

      // ── Google integrations ────────────────────────────────────────────────
      const now = new Date();
      const tokenDoc = await db.collection('googleTokens').doc(userId).get();

      if (tokenDoc.exists) {
        const tokenData = tokenDoc.data()!;

        // Append to Google Sheets if connected
        if (tokenData.spreadsheetId) {
          try {
            const rowData = extractCallDetails(transcript, summary, outcome, From, now);
            await appendToSheet(userId, rowData);

            // Mark this call as logged in the DB doc if we have the id
            if (callDoc) {
              await db.collection('calls').doc(callDoc).update({ googleSheetLogged: true });
            }
          } catch (sheetErr) {
            console.error('Google Sheets append error:', sheetErr);
          }
        }

        // Create Calendar event if job booked
        if (outcome === 'job_booked') {
          try {
            const details = extractCallDetails(transcript, summary, outcome, From, now);
            // Schedule for next business day 9 AM by default
            const eventStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            eventStart.setHours(9, 0, 0, 0);
            const eventEnd = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);

            await createCalendarEvent(userId, {
              title: `🔧 ${details.jobType || 'Job'} — ${details.callerName || From}`,
              description: [
                `Customer: ${details.callerName || 'Unknown'}`,
                `Phone: ${From}`,
                `Job: ${details.jobType || 'See notes'}`,
                `Address: ${details.address || 'TBC'}`,
                `Quote: ${details.quoteGiven || 'TBC'}`,
                '',
                'Notes:',
                summary,
              ].join('\n'),
              startTime: eventStart.toISOString(),
              endTime: eventEnd.toISOString(),
              location: details.address,
            });
          } catch (calErr) {
            console.error('Google Calendar event error:', calErr);
          }
        }
      }
      // ── End Google integrations ───────────────────────────────────────────
    } catch (err) {
      console.error('Call status error:', err);
    }
  }

  res.sendStatus(200);
});

export { router as voiceRouter };
