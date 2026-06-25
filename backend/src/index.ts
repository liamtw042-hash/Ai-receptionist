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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Twilio webhooks need raw body for signature validation
app.use('/api/voice', express.urlencoded({ extended: false }));
app.use('/api/voice/status', express.urlencoded({ extended: false }));
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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'TradeDesk' }));

app.listen(PORT, () => {
  console.log(`TradeDesk backend running on port ${PORT}`);
});

export default app;
