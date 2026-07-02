import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';
import { pollAndReplyForUser, pollAllUsers } from '../services/emailAutoReply';

const router = Router();

// GET /api/email/poll — hit by the Vercel Cron job (see vercel.json) every
// couple of minutes. Not tied to any one user's session, so it's secured
// with a shared secret instead of requireAuth: set CRON_SECRET in the
// backend env and Vercel automatically sends it as a Bearer token on cron
// invocations (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
router.get('/poll', async (req: Request, res: Response) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    res.status(503).json({ error: 'CRON_SECRET is not configured — refusing to run an unauthenticated batch email poll.' });
    return;
  }
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const results = await pollAllUsers();
    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
    res.json({ usersChecked: results.length, totalProcessed, results });
  } catch (err) {
    console.error('Batch email poll error:', err);
    res.status(500).json({ error: 'Failed to poll email' });
  }
});

// ── Everything below is for a signed-in TradeDesk user ───────────────────────
router.use(requireAuth);

// POST /api/email/process — manual "Process unread now" trigger from Settings,
// scoped to just the current user.
router.post('/process', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pollAndReplyForUser(req.userId!);
    if (!result.connected) {
      res.status(400).json({ error: 'Gmail is not connected yet — connect your Google account in Settings first.' });
      return;
    }
    if (result.error) {
      res.status(500).json({ error: result.error });
      return;
    }
    res.json({ processed: result.processed });
  } catch (err) {
    console.error('Email process error:', err);
    res.status(500).json({ error: 'Failed to process emails' });
  }
});

export { router as emailRouter };
