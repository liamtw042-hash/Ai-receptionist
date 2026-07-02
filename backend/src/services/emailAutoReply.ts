import { gmail_v1, google } from 'googleapis';
import { db } from '../lib/firebase';
import { getAuthedClient } from '../lib/googleAuth';
import { getAIResponse } from '../lib/openai';
import { getBusinessSettings, buildSystemPrompt } from '../services/businessContext';
import { storeSMSMessage } from './smsService';

export interface EmailPollResult {
  userId: string;
  connected: boolean;
  processed: number;
  error?: string;
}

// "Dave Smith <dave@smithsplumbing.com.au>" -> { name: "Dave Smith", email: "dave@smithsplumbing.com.au" }
function parseFromHeader(from: string): { name?: string; email: string } {
  const match = from.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const name = match[1].trim();
    return { name: name || undefined, email: match[2].trim() };
  }
  return { email: from.trim() };
}

// Gmail message payloads are a MIME tree — the plain text part can be nested
// several levels deep inside multipart/mixed > multipart/alternative, so this
// walks the whole tree rather than assuming a flat one-level structure.
function extractPlainTextBody(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainTextBody(part);
      if (text) return text;
    }
  }
  // Fall back to stripping tags out of an HTML-only body rather than
  // returning nothing, so the AI still has something to work with.
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    const html = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    return html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return '';
}

function buildRawReply(opts: {
  fromAddress: string;
  toAddress: string;
  subject: string;
  body: string;
  inReplyToMessageId?: string | null;
}): string {
  const subject = opts.subject.toLowerCase().startsWith('re:') ? opts.subject : `Re: ${opts.subject}`;
  const headers = [
    `From: ${opts.fromAddress}`,
    `To: ${opts.toAddress}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  if (opts.inReplyToMessageId) {
    headers.push(`In-Reply-To: ${opts.inReplyToMessageId}`);
    headers.push(`References: ${opts.inReplyToMessageId}`);
  }
  const raw = `${headers.join('\r\n')}\r\n\r\n${opts.body}`;
  return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Processes unread inbox mail for a single user: generates an AI reply using
// the same business-context prompt used for calls/SMS, sends it, marks the
// original read, and logs both sides of the thread to Firestore so it shows
// up in the Messages UI alongside SMS conversations.
export async function pollAndReplyForUser(userId: string): Promise<EmailPollResult> {
  const auth = await getAuthedClient(userId);
  if (!auth) return { userId, connected: false, processed: 0 };

  const tokenDoc = await db.collection('googleTokens').doc(userId).get();
  const grantedScope: string = tokenDoc.exists ? (tokenDoc.data()?.scope || '') : '';
  if (!grantedScope.includes('gmail')) {
    // Connected Google for Sheets/Calendar only — hasn't granted Gmail
    // access, so there's nothing to poll (and calling the Gmail API would
    // just 403).
    return { userId, connected: false, processed: 0 };
  }

  const settings = await getBusinessSettings(userId);
  if (!settings || !settings.businessName || !settings.traderName) {
    return { userId, connected: true, processed: 0, error: 'Business profile incomplete' };
  }

  const myEmail: string = tokenDoc.data()?.email || '';
  const gmail = google.gmail({ version: 'v1', auth });

  try {
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread -from:me in:inbox -category:promotions -category:social',
      maxResults: 10,
    });

    const messages = listRes.data.messages || [];
    let processed = 0;

    for (const msgRef of messages) {
      if (!msgRef.id) continue;

      // Skip if we've already replied to this exact message (protects
      // against double-sending if a previous poll sent the reply but failed
      // to mark it read before crashing/timing out).
      const already = await db.collection('sms_messages')
        .where('userId', '==', userId)
        .where('gmailMessageId', '==', msgRef.id)
        .limit(1)
        .get();
      if (!already.empty) continue;

      const full = await gmail.users.messages.get({ userId: 'me', id: msgRef.id, format: 'full' });
      const payload = full.data.payload;
      const headers = payload?.headers || [];
      const fromHeader = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
      const rfcMessageId = headers.find(h => h.name === 'Message-ID' || h.name === 'Message-Id')?.value;
      const threadId = full.data.threadId || undefined;

      const { email: senderEmail } = parseFromHeader(fromHeader);
      if (!senderEmail) continue;

      const body = extractPlainTextBody(payload).slice(0, 3000);

      const systemPrompt = buildSystemPrompt(settings) +
        `\n\nYou are replying to an email enquiry, not a phone call. Keep it professional, warm, and under 150 words. ` +
        `Sign off as "${settings.traderName} from ${settings.businessName}". Do not use SMS-style abbreviations.`;

      let reply: string;
      try {
        reply = await getAIResponse(systemPrompt, `Email from ${fromHeader}:\nSubject: ${subject}\n\n${body}`);
      } catch (err) {
        console.error(`Email AI reply generation failed for user ${userId}, message ${msgRef.id}:`, err);
        continue;
      }
      if (!reply) continue;

      const raw = buildRawReply({
        fromAddress: myEmail || 'me',
        toAddress: fromHeader || senderEmail,
        subject,
        body: reply,
        inReplyToMessageId: rfcMessageId,
      });

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw, threadId },
      });

      await gmail.users.messages.modify({
        userId: 'me',
        id: msgRef.id,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });

      // Log both sides of the thread using the same collection/shape SMS
      // conversations use, so it appears in the Messages UI automatically.
      await storeSMSMessage(userId, senderEmail, body, 'inbound', {
        channel: 'email', subject, gmailMessageId: msgRef.id, threadId,
      });
      await storeSMSMessage(userId, senderEmail, reply, 'outbound', {
        channel: 'email', subject, threadId,
      });

      processed++;
    }

    return { userId, connected: true, processed };
  } catch (err: any) {
    console.error(`Email poll failed for user ${userId}:`, err?.message || err);
    return { userId, connected: true, processed: 0, error: err?.message || 'Unknown error' };
  }
}

// Runs pollAndReplyForUser for every user who has ever connected Google —
// pollAndReplyForUser itself no-ops (connected: false) for anyone who hasn't
// granted the Gmail scope, so this is safe to run broadly. Called by the
// cron-secured /api/email/poll endpoint.
export async function pollAllUsers(): Promise<EmailPollResult[]> {
  const tokensSnap = await db.collection('googleTokens').get();
  const results: EmailPollResult[] = [];

  for (const doc of tokensSnap.docs) {
    const result = await pollAndReplyForUser(doc.id);
    results.push(result);
  }

  return results;
}
