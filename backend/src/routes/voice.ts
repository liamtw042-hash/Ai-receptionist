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
import { appendToSheet, createCalendarEvent } from '../lib/googleAuth';
import { createJobFromCall } from '../services/jobService';

const router = Router();
const VoiceResponse = twilio.twiml.VoiceResponse;
type Say = ReturnType<InstanceType<typeof VoiceResponse>['say']>;
type SayTarget = InstanceType<typeof VoiceResponse> | ReturnType<InstanceType<typeof VoiceResponse>['gather']>;

// ── Phone voice ───────────────────────────────────────────────────────────────
// Amazon Polly NEURAL en-AU voice. "Olivia" is the only Australian-English
// neural voice Polly offers, and it's dramatically more natural than the old
// standard "Nicole" (which sounded like an automated phone menu). Twilio applies
// a Conversational speaking style to Polly neural voices by default.
// Verified against Twilio's TTS docs; identifier format is `Polly.<Voice>-Neural`.
// Override from the environment (e.g. on Vercel) without a code change.
// Derive the exact attribute types twilio expects (SayVoice / SayLanguage
// literal unions) from the `say` signature, without reaching into the
// declaration namespace.
type SayAttrs = NonNullable<Parameters<InstanceType<typeof VoiceResponse>['say']>[0]>;
// `voice` is env-overridable so it's typed as a plain string; cast to twilio's
// SayVoice literal union (the identifier below is a valid member of it).
const TTS_VOICE = (process.env.TWILIO_TTS_VOICE ||
  'Polly.Olivia-Neural') as SayAttrs['voice'];
const TTS_LANG: SayAttrs['language'] = 'en-AU';
const SAY_OPTS = { voice: TTS_VOICE, language: TTS_LANG } as const;

// Speak a plain line (dynamic AI replies, simple fallbacks). No SSML — the
// neural voice already reads natural prose well.
function say(target: SayTarget, text: string): void {
  target.say(SAY_OPTS, text);
}

// A segment of a scripted line: raw text, or a short pause. We build these via
// the TwiML SSML builder (`addText` / `break`) rather than embedding an SSML
// string in the body, because twilio-node XML-escapes string bodies — a raw
// "<break/>" would be read aloud literally instead of pausing.
type Segment = string | { pause: '300ms' | '400ms' | '500ms' };

// Speak a scripted line with light, deliberate pauses in natural spots. Used
// only for the fixed lines we author (greeting, fallbacks) — never for dynamic
// AI text. Kept sparse on purpose: one or two small breaks, not a stutter.
function sayScripted(target: SayTarget, segments: Segment[]): void {
  // No attributes-only `say` overload exists, so pass an empty message and
  // append the real content via the SSML builder below.
  const s: Say = target.say(SAY_OPTS, '');
  for (const seg of segments) {
    if (typeof seg === 'string') s.addText(seg);
    else s.break({ time: seg.pause });
  }
}

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
      sayScripted(twiml, ['Thanks for calling!', { pause: '300ms' }, "We can't take your call right now, but please try us again soon."]);
      res.type('text/xml').send(twiml.toString());
      return;
    }

    const settings = await getBusinessSettings(userId);
    if (!settings) {
      sayScripted(twiml, ['Thanks for calling!', { pause: '300ms' }, "We can't take your call right now — please try again soon."]);
      res.type('text/xml').send(twiml.toString());
      return;
    }

    let session = getSession(CallSid);

    if (!session) {
      // First turn — greet the caller
      session = createSession(CallSid, userId, From);
      await upsertContact(userId, From, { lastInteraction: new Date() });

      // The greeting must keep the AI disclosure. Transcript stores the plain
      // sentence; the spoken version adds one small breath before the disclosure.
      const greetOpen = `Hi there, thanks for calling ${settings.businessName}.`;
      const greetDisclosure = "I'm their AI assistant — how can I help?";
      const greeting = `${greetOpen} ${greetDisclosure}`;
      addTurn(CallSid, 'assistant', greeting);

      const gather = twiml.gather({
        input: ['speech'],
        speechTimeout: 'auto',
        action: '/api/voice',
        method: 'POST',
        language: 'en-AU',
        speechModel: 'phone_call',
      });
      sayScripted(gather, [greetOpen, { pause: '400ms' }, greetDisclosure]);

      twiml.redirect('/api/voice/no-input');
    } else if (SpeechResult) {
      // Subsequent turns
      addTurn(CallSid, 'user', SpeechResult);

      const isEmergency = /emergency|urgent|flood|gas leak|burst pipe|no power|fire/i.test(SpeechResult);

      let aiReply: string;
      if (isEmergency) {
        aiReply = `Right, that sounds urgent — I'm flagging it as an emergency now. ${settings.traderName} will call you straight back, within 30 minutes. Anything else I should pass on?`;
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
      // Dynamic AI/emergency text — spoken plainly (no injected SSML so the
      // model's own phrasing is never mangled).
      say(gather, aiReply);
      twiml.redirect('/api/voice/no-input');
    } else {
      sayScripted(twiml, ["Sorry, I didn't quite catch that.", { pause: '300ms' }, 'Could you say it again?']);
      const gather = twiml.gather({
        input: ['speech'],
        speechTimeout: 'auto',
        action: '/api/voice',
        method: 'POST',
        language: 'en-AU',
      });
      say(gather, 'So, how can I help?');
    }
  } catch (err) {
    console.error('Voice webhook error:', err);
    sayScripted(twiml, ["Sorry — we're having a bit of a technical glitch our end.", { pause: '300ms' }, 'Do us a favour and call back in a minute?']);
  }

  res.type('text/xml').send(twiml.toString());
});

// No input fallback
router.post('/no-input', (req: Request, res: Response) => {
  const twiml = new VoiceResponse();
  sayScripted(twiml, ["Didn't hear anything there — no worries.", { pause: '300ms' }, 'Give us a call back any time. Cheers!']);
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

      const now = new Date();

      if (outcome === 'job_booked') {
        await sendBookingConfirmationToCaller(From, settings.businessName,
          'Your job has been logged. We\'ll confirm the exact time shortly.');

        // Log it to the Jobs page too — independent of whether Google is
        // connected, this is the in-app source of truth for booked work.
        try {
          const details = extractCallDetails(transcript, summary, outcome, From, now);
          await createJobFromCall(userId, {
            callId: callDoc || CallSid,
            callerName: details.callerName,
            callerNumber: From,
            jobType: details.jobType,
            address: details.address,
            quoteGiven: details.quoteGiven,
            notes: summary,
          });
        } catch (jobErr) {
          console.error('Create job from call error:', jobErr);
        }
      }

      await upsertContact(userId, From, { lastInteraction: new Date(), notes: summary });

      // ── Google integrations ────────────────────────────────────────────────
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
