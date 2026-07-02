import { Router, Response } from 'express';
import { google } from 'googleapis';
import { db } from '../lib/firebase';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';
import { getBusinessSettings } from '../services/businessContext';
import { getOAuthClient, SCOPES, getAuthedClient, appendToSheet, createCalendarEvent } from '../lib/googleAuth';

const router = Router();

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

    // tokens.scope is a space-separated list of every scope the user actually
    // granted — Google can silently drop scopes the user unchecks on the
    // consent screen, so we store it and derive per-feature "connected"
    // flags from it rather than assuming every scope we asked for was granted.
    await db.collection('googleTokens').doc(userId).set({
      access_token: tokens.access_token,
      // Google only issues a refresh_token on the FIRST consent (or when
      // prompt=consent forces re-consent, which we always pass) — but if for
      // any reason this response omits it, don't clobber a previously stored
      // one.
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      expiry_date: tokens.expiry_date,
      scope: tokens.scope || '',
      email: userInfo.data.email,
      connectedAt: new Date().toISOString(),
    }, { merge: true });

    // Keep settings.gmailConnected in sync so the dashboard onboarding
    // checklist / other reads of that field stay accurate without needing
    // to call /google/status.
    const grantedGmail = (tokens.scope || '').includes('gmail');
    if (grantedGmail) {
      await db.collection('settings').doc(userId).set({ gmailConnected: true }, { merge: true });
    }

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
      res.json({ connected: false, sheetsConnected: false, calendarConnected: false, gmailConnected: false });
      return;
    }
    const data = tokenDoc.data()!;
    // Users who connected before Gmail auto-reply existed only granted
    // Sheets/Calendar scopes — gmailConnected reflects what was ACTUALLY
    // granted, not just whether they've connected Google at all, so we
    // correctly prompt those users to reconnect for Gmail specifically.
    const gmailConnected = (data.scope || '').includes('gmail');
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
      gmailConnected,
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
