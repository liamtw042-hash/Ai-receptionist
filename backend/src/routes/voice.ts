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
import { completeCall, completeBridgedCall } from '../services/callCompletionService';
import { CallSession } from '../services/callSessionService';

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
      // The whole post-call pipeline (summary → SMS → Firestore → job →
      // Sheets/Calendar) lives in callCompletionService so the Realtime bridge
      // can run the identical path. Behaviour here is unchanged.
      const durationSeconds = req.body.CallDuration ? parseInt(req.body.CallDuration, 10) : undefined;
      await completeCall({ callSid: CallSid, from: From, called: Called, durationSeconds });
    } catch (err) {
      console.error('Call status error:', err);
    }
  }

  res.sendStatus(200);
});

// ─────────────────────────────────────────────────────────────────────────────
// Realtime voice-bridge endpoints
//
// The bridge (see /voice-bridge) runs on a host that supports long-lived
// websockets, which Vercel's serverless functions cannot. It needs two things
// from this backend, and nothing else:
//   1. the business context for the number that was dialled, so the Realtime
//      session can be given the right persona and pricing;
//   2. a way to hand back the finished transcript so the *existing* post-call
//      pipeline runs unchanged.
//
// Both are guarded by a shared secret rather than a Firebase user token,
// because the caller is a trusted backend service, not a signed-in user.
// ─────────────────────────────────────────────────────────────────────────────

function bridgeAuthorised(req: Request): boolean {
  const expected = process.env.VOICE_BRIDGE_SECRET;
  // Fail closed: with no secret configured the endpoints stay disabled rather
  // than silently accepting anonymous requests.
  if (!expected) return false;
  const provided = req.get('x-bridge-secret');
  if (!provided || provided.length !== expected.length) return false;
  // Constant-time-ish comparison; lengths are already known equal.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

// POST /api/voice/bridge/context — business context for a dialled number.
router.post('/bridge/context', async (req: Request, res: Response) => {
  if (!bridgeAuthorised(req)) { res.status(401).json({ error: 'Unauthorised' }); return; }

  try {
    const called = typeof req.body?.called === 'string' ? req.body.called : '';
    if (!called) { res.status(400).json({ error: 'called is required' }); return; }

    const userId = await resolveTwilioUser(called, db);
    if (!userId) { res.status(404).json({ error: 'No user for that number' }); return; }

    const settings = await getBusinessSettings(userId);
    if (!settings) { res.status(404).json({ error: 'No settings for that user' }); return; }

    res.json({ userId, settings });
  } catch (err) {
    console.error('Bridge context error:', err);
    res.status(500).json({ error: 'Failed to load business context' });
  }
});

// POST /api/voice/bridge/complete — the bridge hands back a finished call.
router.post('/bridge/complete', async (req: Request, res: Response) => {
  if (!bridgeAuthorised(req)) { res.status(401).json({ error: 'Unauthorised' }); return; }

  try {
    const { callSid, from, called, turns, outcome, durationSeconds } = req.body ?? {};
    if (!callSid || !from || !called || !Array.isArray(turns)) {
      res.status(400).json({ error: 'callSid, from, called and turns are required' });
      return;
    }

    const cleanTurns = (turns as unknown[])
      .filter((t): t is { role: string; content: string } =>
        !!t && typeof t === 'object' && typeof (t as any).content === 'string')
      .map(t => ({
        role: t.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: String(t.content).slice(0, 4000),
      }));

    const result = await completeBridgedCall({
      callSid: String(callSid),
      from: String(from),
      called: String(called),
      turns: cleanTurns,
      outcome: outcome as CallSession['outcome'] | undefined,
      durationSeconds: typeof durationSeconds === 'number' ? durationSeconds : undefined,
    });

    if (result !== 'ok') {
      console.error(`Bridge complete for ${callSid} did not finish cleanly: ${result}`);
      res.status(202).json({ status: result });
      return;
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Bridge complete error:', err);
    res.status(500).json({ error: 'Failed to complete bridged call' });
  }
});

export { router as voiceRouter };
