import { google } from 'googleapis';
import { db } from '../lib/firebase';
import { getAuthedClient } from '../lib/googleAuth';

// Where marketing-site notifications (contact form, newsletter signups) land.
const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'liamtw042@gmail.com';

function buildRawMessage(from: string, to: string, subject: string, body: string): string {
  const raw = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n');
  return Buffer.from(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Basic email-shape guard so a malformed recipient can't reach the Gmail API.
const RECIPIENT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Sends an email FROM the admin's own connected Gmail account (the googleTokens
// doc whose email matches ADMIN_NOTIFY_EMAIL and that granted the Gmail scope)
// to an arbitrary recipient. Best-effort by design: callers always write to
// Firestore first (the source of truth), so a missing/expired Google connection
// logs a warning and returns false instead of throwing.
export async function sendGmailFromAdmin(to: string, subject: string, body: string): Promise<boolean> {
  try {
    if (!RECIPIENT_RE.test(to)) {
      console.warn('adminNotify: refusing to send to a malformed recipient address');
      return false;
    }

    const tokenSnap = await db.collection('googleTokens')
      .where('email', '==', ADMIN_EMAIL)
      .limit(1)
      .get();

    if (tokenSnap.empty) {
      console.warn(`adminNotify: no Google connection found for ${ADMIN_EMAIL} — email skipped`);
      return false;
    }

    const doc = tokenSnap.docs[0];
    const scope: string = doc.data()?.scope || '';
    if (!scope.includes('gmail')) {
      console.warn(`adminNotify: ${ADMIN_EMAIL} connected Google without the Gmail scope — email skipped`);
      return false;
    }

    const auth = await getAuthedClient(doc.id);
    if (!auth) {
      console.warn('adminNotify: could not authenticate admin Google account — email skipped');
      return false;
    }

    const gmail = google.gmail({ version: 'v1', auth });
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: buildRawMessage(ADMIN_EMAIL, to, subject, body) },
    });
    return true;
  } catch (err) {
    console.error('adminNotify: failed to send email:', err);
    return false;
  }
}

// Notification to the admin themselves (contact form, newsletter, waitlist).
export async function sendAdminEmail(subject: string, body: string): Promise<boolean> {
  return sendGmailFromAdmin(ADMIN_EMAIL, subject, body);
}
