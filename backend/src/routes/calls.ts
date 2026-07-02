import { Router, Response } from 'express';
import { db } from '../lib/firebase';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { limit = '50', offset = '0' } = req.query as { limit?: string; offset?: string };

  try {
    const snap = await db.collection('calls')
      .where('userId', '==', req.userId)
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .get();

    const calls = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        callerNumber: data.callerNumber,
        outcome: data.outcome,
        summary: data.summary,
        // durationSeconds is the current field name; fall back to the old
        // `duration` field name for any calls stored before this was fixed.
        durationSeconds: data.durationSeconds ?? data.duration ?? null,
        createdAt: data.createdAt,
        turns: data.turns?.length ?? 0,
        transcript: Array.isArray(data.turns)
          ? data.turns.map((t: { role: string; content: string }) => ({ role: t.role, content: t.content }))
          : [],
      };
    });

    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db.collection('calls').doc(req.params.id).get();
    if (!doc.exists || doc.data()?.userId !== req.userId) {
      res.status(404).json({ error: 'Call not found' });
      return;
    }
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch call' });
  }
});

export { router as callsRouter };
