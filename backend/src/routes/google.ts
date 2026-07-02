import { Router, Response } from 'express';
import { google } from 'googleapis';
import { db } from '../lib/firebase';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';
import { getBusinessSettings } from '../services/businessContext';

const router = Router();

// ── OAuth client factory ──────────────────────────────────────────────────────
function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.BACKEND_URL}/api/google/callback`
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
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

// GET /api/google/callback — OAuth callback from Google (must be BEFORE requireAuth)
router.get('/callback', async (req: AuthRequest, res: Response) => {
  const { code, state: userId } = req.query as { code: string; state: string };

  if (!code || !userId) {
    res.status(400).send('Missing code or state');
    return;
  }

  try {
    const oauth2 = getOAuthClient();
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    // Get user email
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
    const userInfo = await oauth2Api.userinfo.get();

    await db.collection('googleTokens').doc(userId).set({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      email: userInfo.data.email,
      connectedAt: new Date().toISOString(),
    }, { merge: true });

    // Redirect to frontend settings page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/settings?google=connected`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard/settings?google=error`);
  }
});

// ── All routes below require auth ─────────────────────────────────────────────
router.use(requireAuth);

// GET /api/google/status
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const tokenDoc = await db.collection('googleTokens').doc(req.userId!).get();
    if (!tokenDoc.exists) {
      res.json({ connected: false, sheetsConnected: false, calendarConnected: false });
      return;
    }
    const data = tokenDoc.data()!;
    res.json({
      connected: true,
      email: data.email || null,
      sheetsConnected: !!data.spreadsheetId,
      spreadsheetId: data.spreadsheetId || null,
      spreadsheetUrl: data.spreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`
        : null,
      calendarConnected: true,
      calendarId: data.calendarId || 'primary',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get Google status' });
  }
});

// GET /api/google/connect — returns the OAuth URL
router.get('/connect', async (req: AuthRequest, res: Response) => {
  try {
    const oauth2 = getOAuthClient();
    const url = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state: req.userId,
    });
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate OAuth URL' });
  }
});

// POST /api/google/disconnect
router.post('/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    await db.collection('googleTokens').doc(req.userId!).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to disconnect Google' });
  }
});

// POST /api/google/create-sheet — creates a pre-formatted Google Sheet
router.post('/create-sheet', async (req: AuthRequest, res: Response) => {
  try {
    const auth = await getAuthedClient(req.userId!);
    if (!auth) {
      res.status(401).json({ error: 'Google not connected' });
      return;
    }

    const settings = await getBusinessSettings(req.userId!);
    const businessName = settings?.businessName || 'TradeDesk';

    const sheets = google.sheets({ version: 'v4', auth });

    // Create the spreadsheet
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `${businessName} — TradeDesk Calls` },
        sheets: [{
          properties: { title: 'Calls', sheetId: 0 },
          data: [{
            startRow: 0,
            startColumn: 0,
            rowData: [{
              values: [
                'Date', 'Time', 'Caller Name', 'Caller Number',
                'Job Type', 'Address', 'Quote Given', 'Outcome', 'Notes',
              ].map(v => ({
                userEnteredValue: { stringValue: v },
                userEnteredFormat: {
                  backgroundColor: { red: 0.23, green: 0.51, blue: 0.98 },
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              })),
            }],
          }],
        }],
      },
    });

    const spreadsheetId = createResponse.data.spreadsheetId!;
    const spreadsheetUrl = createResponse.data.spreadsheetUrl!;

    // Resize columns
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          { autoResizeDimensions: { dimensions: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 9 } } },
          { updateSheetProperties: { properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
        ],
      },
    });

    // Save the spreadsheet ID to the user's token doc
    await db.collection('googleTokens').doc(req.userId!).set(
      { spreadsheetId },
      { merge: true }
    );

    res.json({ success: true, spreadsheetId, spreadsheetUrl });
  } catch (err: any) {
    console.error('Create sheet error:', err);
    res.status(500).json({ error: err.message || 'Failed to create sheet' });
  }
});

// POST /api/google/test-sheet — appends a test row
router.post('/test-sheet', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    await appendToSheet(req.userId!, {
      date: now.toLocaleDateString('en-AU'),
      time: now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
      callerName: 'Test Caller',
      callerNumber: '0400 000 000',
      jobType: 'Test — Plumbing',
      address: '123 Test St, Newcastle NSW',
      quoteGiven: '$150–$250',
      outcome: 'Quote Given',
      notes: 'This is a test row created from TradeDesk to verify your Google Sheets connection is working correctly.',
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to write test row' });
  }
});

// POST /api/google/test-calendar — creates a test calendar event
router.post('/test-calendar', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const start = new Date(now.getTime() + 24 * 60 * 60 * 1000); // tomorrow
    start.setHours(9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour

    await createCalendarEvent(req.userId!, {
      title: '🔧 TEST — TradeDesk Calendar Integration',
      description: 'This is a test event created by TradeDesk to verify your Google Calendar connection is working correctly.\n\nCustomer: Test Customer\nPhone: 0400 000 000\nJob: Test plumbing job',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      location: '123 Test St, Newcastle NSW 2300',
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create test event' });
  }
});

export { router as googleRouter };
