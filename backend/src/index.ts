import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import twilio from 'twilio';
import { voiceRouter } from './routes/voice';
import { smsRouter } from './routes/sms';
import { callsRouter } from './routes/calls';
import { contactsRouter } from './routes/contacts';
import { settingsRouter } from './routes/settings';
import { emailRouter } from './routes/email';
import { dashboardRouter } from './routes/dashboard';
import { googleRouter } from './routes/google';
import { billingRouter } from './routes/billing';
import { accountRouter } from './routes/account';
import { jobsRouter } from './routes/jobs';
import { newsletterRouter } from './routes/newsletter';
import { contactFormRouter } from './routes/contactForm';
import { chatRouter } from './routes/chat';
import { waitlistRouter } from './routes/waitlist';
import { adminRouter } from './routes/admin';
import { firebaseStatusMessage } from './lib/firebase';
import { twilioStatusMessage } from './lib/twilio';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Vercel (and most PaaS) sit behind a reverse proxy that sets X-Forwarded-For.
// Without this, express-rate-limit v7 THROWS on every request that carries
// that header (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR) — i.e. every production
// request 500s — and req.ip would be the proxy's IP, collapsing all users
// into one rate-limit bucket.
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));

// Allow the configured frontend plus the known production/preview domains.
// A single hard origin here meant any FRONTEND_URL mismatch surfaced in the
// browser as a bare "Failed to fetch" (CORS failures hide the real status).
if (!process.env.FRONTEND_URL) {
  console.warn(
    '⚠️  FRONTEND_URL is not set — set it to https://tradedesk-au.vercel.app on the ' +
    'backend Vercel project. Falling back to the built-in origin allowlist.'
  );
}
const ALLOWED_ORIGINS = new Set(
  ([
    process.env.FRONTEND_URL,
    'https://tradedesk-au.vercel.app',
    'https://tradedesk-frontend-one.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
  ].filter(Boolean) as string[]).map(o => o.replace(/\/+$/, ''))
);
// Vercel preview deployments get per-branch subdomains — allow them too.
const VERCEL_PREVIEW_RE = /^https:\/\/tradedesk-[a-z0-9-]+\.vercel\.app$/;
const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => {
    // No Origin header = same-origin request, curl, or server-to-server
    // (Twilio/Stripe webhooks, Vercel cron) — always allow.
    if (!origin) return cb(null, true);
    const o = origin.replace(/\/+$/, '');
    cb(null, ALLOWED_ORIGINS.has(o) || VERCEL_PREVIEW_RE.test(o));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
// Answer preflights for every route explicitly — some proxies won't forward an
// OPTIONS request to a handler unless one is registered.
app.options('*', cors(corsOptions));

// ── Body parsing ─────────────────────────────────────────────────────────────
// Stripe webhooks need the raw, unparsed body to verify their signature, so raw
// MUST be registered before the generic parsers (body-parser marks the body as
// consumed, so the parsers below no-op for this path).
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// Twilio POSTs application/x-www-form-urlencoded for BOTH voice and SMS webhooks.
// This used to be mounted on '/api/voice' only, so /api/sms/inbound was left with
// nothing but express.json() — which ignores form-encoded bodies. req.body came
// through as {} and From/To/Body were all undefined, meaning the SMS webhook
// silently no-op'd (resolveTwilioUser(undefined) → null → 200 with no reply) even
// once Twilio was pointed at it correctly. Register it globally.
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 60_000, max: 100 });
app.use('/api', limiter);

// ── Health / config diagnostic ───────────────────────────────────────────────
// NOTE: the root vercel.json only routes /api/* to this function, so a bare
// /health never reaches the backend at all. Expose it under /api.
// Reports whether each required env var is PRESENT — never its value.
function configReport() {
  const required = [
    'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
    'OPENAI_API_KEY',
    'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY',
  ];
  const hasServiceAccountJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
  const env: Record<string, boolean> = {};
  for (const key of required) {
    // FIREBASE_SERVICE_ACCOUNT_JSON is an accepted substitute for the three FIREBASE_* vars.
    env[key] = key.startsWith('FIREBASE_') && hasServiceAccountJson
      ? true
      : Boolean(process.env[key]);
  }
  env.FIREBASE_SERVICE_ACCOUNT_JSON = hasServiceAccountJson;

  const firebase = firebaseStatusMessage();
  const twilioCfg = twilioStatusMessage();

  return {
    env,
    firebase: firebase ?? 'ok',
    twilio: twilioCfg ?? 'ok',
    healthy: !firebase && !twilioCfg,
  };
}

app.get('/api/health', (_req: Request, res: Response) => {
  const report = configReport();
  res.status(report.healthy ? 200 : 503).json({
    status: report.healthy ? 'ok' : 'misconfigured',
    service: 'TradeDesk',
    ...report,
  });
});
// Kept for local/non-Vercel use.
app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', service: 'TradeDesk' }));

app.use('/api/voice', voiceRouter);
app.use('/api/sms', smsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/email', emailRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/google', googleRouter);
app.use('/api/billing', billingRouter);
app.use('/api/account', accountRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/newsletter', newsletterRouter);
app.use('/api/contact-form', contactFormRouter);
app.use('/api/chat', chatRouter);
app.use('/api/waitlist', waitlistRouter);
app.use('/api/admin', adminRouter);

// ── Error handler ────────────────────────────────────────────────────────────
// Previously there was none, so anything thrown outside a handler's try/catch
// became a bare, untraceable 500. Now: always log the real error server-side,
// and — critically — answer Twilio's webhooks with valid TwiML even on failure.
// A 5xx to Twilio makes it fall through to the number's *FallbackUrl* (which on
// a new number is still Twilio's demo endpoint — the source of the "Thanks for
// the message. Configure your number's SMS URL..." auto-reply). Returning 200 +
// TwiML keeps us in control of what the caller actually hears/receives.
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(`Unhandled error on ${req.method} ${req.path}:`, err);
  if (res.headersSent) return;

  if (req.path.startsWith('/api/voice')) {
    const twiml = new twilio.twiml.VoiceResponse();
    // Same natural neural voice the call routes use (see routes/voice.ts).
    // Kept env-overridable here too so a voice swap stays a one-place change.
    const voice = (process.env.TWILIO_TTS_VOICE || 'Polly.Olivia-Neural') as 'Polly.Olivia-Neural';
    twiml.say(
      { voice, language: 'en-AU' },
      "Sorry, we're having a technical issue. Please call back shortly."
    );
    res.type('text/xml').status(200).send(twiml.toString());
    return;
  }
  if (req.path.startsWith('/api/sms')) {
    // Empty TwiML = "no reply". Better than a 500, which would hand the
    // conversation to Twilio's fallback/demo responder.
    res.type('text/xml').status(200).send(new twilio.twiml.MessagingResponse().toString());
    return;
  }

  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({
    error: status === 503 ? err.message : 'Internal server error',
    reason: (err as { reason?: string }).reason,
  });
});

// Vercel imports this module and drives it as a serverless handler — calling
// listen() there is pointless (and noisy). Only bind a port when running locally.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    const report = configReport();
    if (!report.healthy) {
      console.warn('⚠️  TradeDesk started with an INCOMPLETE config:');
      if (report.firebase !== 'ok') console.warn('   Firebase:', report.firebase);
      if (report.twilio !== 'ok') console.warn('   Twilio:  ', report.twilio);
      console.warn('   Requests to affected routes will return 503 with this reason.');
    }
    console.log(`TradeDesk backend running on port ${PORT}`);
  });
}

export default app;
