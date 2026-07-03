import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
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
const ALLOWED_ORIGINS = new Set(
  [
    process.env.FRONTEND_URL,
    'https://tradedesk-au.vercel.app',
    'https://tradedesk-frontend-one.vercel.app',
    'http://localhost:5173',
  ].filter(Boolean) as string[]
);
app.use(cors({
  origin: (origin, cb) => {
    // No Origin header = same-origin request, curl, or server-to-server
    // (Twilio/Stripe webhooks, Vercel cron) — always allow.
    if (!origin || ALLOWED_ORIGINS.has(origin)) cb(null, true);
    else cb(null, false);
  },
  credentials: true,
}));

// Twilio webhooks need raw body for signature validation
app.use('/api/voice', express.urlencoded({ extended: false }));
app.use('/api/voice/status', express.urlencoded({ extended: false }));
// Stripe webhooks also need the raw, unparsed body to verify their signature
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 60_000, max: 100 });
app.use('/api', limiter);

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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'TradeDesk' }));

app.listen(PORT, () => {
  console.log(`TradeDesk backend running on port ${PORT}`);
});

export default app;
