import twilio, { Twilio } from 'twilio';

// ─────────────────────────────────────────────────────────────────────────────
// Twilio client — LAZILY constructed.
//
// This file used to call twilio(sid, token) at module load. The Twilio SDK
// THROWS synchronously when accountSid is undefined ("username is required") or
// doesn't start with "AC". services/smsService.ts imports this, and both the
// voice and SMS routers import smsService — so a missing TWILIO_ACCOUNT_SID /
// TWILIO_AUTH_TOKEN crashed the serverless cold start and 500'd every route,
// including the very webhooks that needed to answer Twilio.
//
// Same lazy pattern as ./openai.ts, ./anthropic.ts, ./stripe.ts and ./firebase.ts.
// ─────────────────────────────────────────────────────────────────────────────

/** Missing/malformed Twilio credentials. Carries variable NAMES only, never values. */
export class TwilioConfigError extends Error {
  status = 503 as const;
  reason = 'twilio_config' as const;
  missing: string[];
  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = 'TwilioConfigError';
    this.missing = missing;
  }
}

let cached: Twilio | null = null;

function getClient(): Twilio {
  if (cached) return cached;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  const missing = [
    !sid && 'TWILIO_ACCOUNT_SID',
    !token && 'TWILIO_AUTH_TOKEN',
  ].filter(Boolean) as string[];

  if (missing.length) {
    throw new TwilioConfigError(
      `Twilio is not configured — missing: ${missing.join(', ')}. Set these on the backend ` +
      'Vercel project (Settings -> Environment Variables), then redeploy.',
      missing
    );
  }
  if (!sid!.startsWith('AC')) {
    throw new TwilioConfigError(
      'TWILIO_ACCOUNT_SID must start with "AC" — it looks like an API Key SID (SK...) or ' +
      'another identifier was pasted in by mistake.',
      ['TWILIO_ACCOUNT_SID']
    );
  }

  cached = twilio(sid!, token!);
  return cached;
}

/** The number we send FROM. Throws only when we actually try to send. */
export function getTwilioNumber(): string {
  const n = process.env.TWILIO_PHONE_NUMBER;
  if (!n) {
    throw new TwilioConfigError(
      'Twilio is not configured — missing: TWILIO_PHONE_NUMBER (e.g. +61468181349).',
      ['TWILIO_PHONE_NUMBER']
    );
  }
  return n;
}

/** null when Twilio config is present and well-formed, else the reason. Never throws. */
export function twilioStatusMessage(): string | null {
  try {
    getClient();
    getTwilioNumber();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'unknown Twilio init failure';
  }
}

// Lazy client proxy — call sites keep using `twilioClient.messages.create(...)`.
const client: Twilio = new Proxy({} as Twilio, {
  get(_target, prop, receiver) {
    const real = getClient();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === 'function' ? value.bind(real) : value;
  },
  has(_target, prop) {
    return Reflect.has(getClient() as object, prop);
  },
});

export default client;
