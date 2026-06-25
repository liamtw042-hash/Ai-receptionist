import { Router, Response } from 'express';
import { db } from '../lib/firebase';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());

    const callsSnap = await db.collection('calls')
      .where('userId', '==', req.userId)
      .where('createdAt', '>=', startOfDay.toISOString())
      .get();

    const weekLeadsSnap = await db.collection('calls')
      .where('userId', '==', req.userId)
      .where('createdAt', '>=', startOfWeek.toISOString())
      .get();

    const callsToday = callsSnap.size;
    const emergenciesToday = callsSnap.docs.filter(d => d.data().outcome === 'emergency').length;
    const bookedToday = callsSnap.docs.filter(d => d.data().outcome === 'job_booked').length;

    const leadsThisWeek = weekLeadsSnap.docs.filter(d =>
      ['job_booked', 'quote_given', 'callback_needed'].includes(d.data().outcome)
    ).length;

    const contactsSnap = await db.collection('contacts')
      .where('userId', '==', req.userId)
      .get();

    res.json({
      callsToday,
      emergenciesToday,
      bookedToday,
      leadsThisWeek,
      totalContacts: contactsSnap.size,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/recent-calls', async (req: AuthRequest, res: Response) => {
  try {
    const snap = await db.collection('calls')
      .where('userId', '==', req.userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const calls = snap.docs.map(d => ({
      id: d.id,
      callerNumber: d.data().callerNumber,
      outcome: d.data().outcome,
      summary: d.data().summary,
      createdAt: d.data().createdAt,
    }));

    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent calls' });
  }
});

export { router as dashboardRouter };
