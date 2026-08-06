import twilio from 'twilio';
import { config } from './config';
import { FALLBACK_APOLOGY } from './prompt';

// ─────────────────────────────────────────────────────────────────────────────
// Mid-call recovery.
//
// Once a call is inside <Connect><Stream>, the only way to rescue it from the
// bridge is to update the live call with new TwiML via the REST API. That
// detaches the stream and hands control back to Twilio, which then plays the
// apology and records a message. Without this the caller sits in silence until
// they hang up — the failure mode that actually loses the job.
// ─────────────────────────────────────────────────────────────────────────────

let client: ReturnType<typeof twilio> | null = null;
let clientInitialised = false;

function getClient(): ReturnType<typeof twilio> | null {
  if (clientInitialised) return client;
  clientInitialised = true;
  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    client = null;
    return null;
  }
  try {
    client = twilio(config.twilioAccountSid, config.twilioAuthToken);
  } catch (err) {
    console.error('[twilio] failed to construct REST client:', err);
    client = null;
  }
  return client;
}

/** TwiML the caller gets when the realtime leg dies: apologise, then record. */
export function buildFallbackTwiml(): string {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  // Matches the voice used by the legacy route so the handover isn't jarring.
  twiml.say({ voice: 'Polly.Olivia-Neural', language: 'en-AU' }, FALLBACK_APOLOGY);
  twiml.record({
    maxLength: 120,
    playBeep: true,
    // Transcription here is Twilio's, independent of our pipeline — it gives
    // the tradie something readable even though this call bypassed the bridge.
    transcribe: false,
    timeout: 5,
  });
  twiml.say({ voice: 'Polly.Olivia-Neural', language: 'en-AU' }, 'Thanks, we\'ll be in touch. Cheers!');
  twiml.hangup();
  return twiml.toString();
}

/**
 * Test seam. The offline simulator swaps this in so the failover path can be
 * exercised without Twilio credentials or a live call. Never set in production.
 */
type RedirectHook = (callSid: string) => Promise<boolean>;
let redirectHook: RedirectHook | null = null;
export function __setRedirectHookForTests(hook: RedirectHook | null): void {
  redirectHook = hook;
}

/**
 * Redirect a live call away from the (broken) media stream and into voicemail.
 * Returns false if we couldn't — the caller may then hear silence, which is
 * logged loudly by the caller of this function.
 */
export async function redirectCallToFallback(callSid: string): Promise<boolean> {
  if (redirectHook) return redirectHook(callSid);
  const c = getClient();
  if (!c) return false;
  try {
    await c.calls(callSid).update({ twiml: buildFallbackTwiml() });
    console.log(`[twilio] redirected ${callSid} to voicemail fallback`);
    return true;
  } catch (err) {
    console.error(`[twilio] failed to redirect ${callSid}:`, err);
    return false;
  }
}
