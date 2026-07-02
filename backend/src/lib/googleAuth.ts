import { google } from 'googleapis';
import { db } from './firebase';

// ── OAuth client factory ──────────────────────────────────────────────────────
export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL}/api/google/callback`
  );
}

// One consent screen covers everything TradeDesk integrates with Google for:
// Sheets call logging, Calendar bookings, and Gmail auto-reply.
export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ── Helper: load + refresh tokens for a user ─────────────────────────────────
export async function getAuthedClient(userId: string) {
  const tokenDoc = await db.collection('googleTokens').doc(userId).get();
  if (!tokenDoc.exists) return null;

  const tokens = tokenDoc.data()!;
  const oauth2 = getOAuthClient();
  oauth2.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
  });

  // Auto-refresh if expired
  if (tokens.expiry_date && Date.now() > tokens.expiry_date - 60_000) {
    try {
      const { credentials } = await oauth2.refreshAccessToken();
      await db.collection('googleTokens').doc(userId).set({
        ...tokens,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date,
      }, { merge: true });
      oauth2.setCredentials(credentials);
    } catch (err) {
      console.error('Google token refresh failed:', err);
      return null;
    }
  }

  return oauth2;
}

// Whether a user's stored Google connection actually granted Gmail access
// (vs. only Sheets/Calendar from before Gmail auto-reply existed).
export async function hasGmailScope(userId: string): Promise<boolean> {
  const tokenDoc = await db.collection('googleTokens').doc(userId).get();
  if (!tokenDoc.exists) return false;
  const scope: string = tokenDoc.data()?.scope || '';
  return scope.includes('gmail');
}

// ── Helper: append a row to the user's Google Sheet ──────────────────────────
export async function appendToSheet(
  userId: string,
  rowData: Record<string, string>
): Promise<void> {
  const tokenDoc = await db.collection('googleTokens').doc(userId).get();
  if (!tokenDoc.exists) return;
  const { spreadsheetId } = tokenDoc.data()!;
  if (!spreadsheetId) return;

  const auth = await getAuthedClient(userId);
  if (!auth) return;

  const sheets = google.sheets({ version: 'v4', auth });
  const values = [
    rowData.date || '',
    rowData.time || '',
    rowData.callerName || '',
    rowData.callerNumber || '',
    rowData.jobType || '',
    rowData.address || '',
    rowData.quoteGiven || '',
    rowData.outcome || '',
    rowData.notes || '',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Calls!A:I',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

// ── Helper: create a Google Calendar event ───────────────────────────────────
export async function createCalendarEvent(
  userId: string,
  eventData: {
    title: string;
    description: string;
    startTime: string;
    endTime: string;
    location?: string;
  }
): Promise<void> {
  const tokenDoc = await db.collection('googleTokens').doc(userId).get();
  if (!tokenDoc.exists) return;
  const { calendarId } = tokenDoc.data()!;

  const auth = await getAuthedClient(userId);
  if (!auth) return;

  const calendar = google.calendar({ version: 'v3', auth });
  await calendar.events.insert({
    calendarId: calendarId || 'primary',
    requestBody: {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
      start: { dateTime: eventData.startTime, timeZone: 'Australia/Sydney' },
      end: { dateTime: eventData.endTime, timeZone: 'Australia/Sydney' },
    },
  });
}
