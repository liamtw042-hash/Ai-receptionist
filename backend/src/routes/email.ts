import { Router, Response } from 'express';
import { google } from 'googleapis';
import { db } from '../lib/firebase';
import { getAIResponse } from '../lib/openai';
import { getBusinessSettings, buildSystemPrompt } from '../services/businessContext';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL}/api/email/callback`
);

router.use(requireAuth);

router.get('/auth-url', (req: AuthRequest, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.modify'],
    state: req.userId,
    prompt: 'consent',
  });
  res.json({ url });
});

router.get('/callback', async (req: AuthRequest, res: Response) => {
  const { code, state: userId } = req.query as { code: string; state: string };

  try {
    const { tokens } = await oauth2Client.getToken(code);
    await db.collection('gmail_tokens').doc(userId).set({
      ...tokens,
      updatedAt: new Date().toISOString(),
    });
    await db.collection('settings').doc(userId).set(
      { gmailConnected: true },
      { merge: true }
    );

    res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?gmail=connected`);
  } catch (err) {
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?gmail=error`);
  }
});

router.post('/process', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  try {
    const tokenDoc = await db.collection('gmail_tokens').doc(userId).get();
    if (!tokenDoc.exists) {
      res.status(400).json({ error: 'Gmail not connected' });
      return;
    }

    oauth2Client.setCredentials(tokenDoc.data() as object);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const settings = await getBusinessSettings(userId);
    if (!settings) { res.status(400).json({ error: 'Settings not found' }); return; }

    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread -from:me',
      maxResults: 5,
    });

    const messages = listRes.data.messages || [];
    const processed: string[] = [];

    for (const msg of messages) {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
      const payload = full.data.payload;
      const headers = payload?.headers || [];

      const from = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const threadId = full.data.threadId!;

      let body = '';
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      } else if (payload?.parts) {
        const textPart = payload.parts.find(p => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
        }
      }

      const systemPrompt = buildSystemPrompt(settings) +
        `\n\nYou are replying to an email. Keep it professional, warm, and under 150 words. Sign off as "${settings.traderName} from ${settings.businessName}".`;

      const reply = await getAIResponse(systemPrompt, `Email from ${from}:\nSubject: ${subject}\n\n${body.slice(0, 1000)}`);

      const replyMessage = [
        `From: me`,
        `To: ${from}`,
        `Subject: Re: ${subject}`,
        `In-Reply-To: ${msg.id}`,
        `References: ${msg.id}`,
        '',
        reply,
      ].join('\n');

      const encoded = Buffer.from(replyMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encoded, threadId },
      });

      await gmail.users.messages.modify({
        userId: 'me',
        id: msg.id!,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });

      processed.push(msg.id!);
    }

    res.json({ processed: processed.length });
  } catch (err) {
    console.error('Email process error:', err);
    res.status(500).json({ error: 'Failed to process emails' });
  }
});

router.get('/status', async (req: AuthRequest, res: Response) => {
  const doc = await db.collection('gmail_tokens').doc(req.userId!).get();
  res.json({ connected: doc.exists });
});

export { router as emailRouter };
