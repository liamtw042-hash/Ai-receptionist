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

    const [callsTodaySnap, weekSnap, contactsSnap, settingsSnap] = await Promise.all([
      db.collection('calls')
        .where('userId', '==', req.userId)
        .where('createdAt', '>=', startOfDay.toISOString())
        .get(),
      db.collection('calls')
        .where('userId', '==', req.userId)
        .where('createdAt', '>=', startOfWeek.toISOString())
        .get(),
      db.collection('contacts')
        .where('userId', '==', req.userId)
        .get(),
      db.collection('settings').doc(req.userId!).get(),
    ]);

    const callsToday = callsTodaySnap.size;
    const emergenciesToday = callsTodaySnap.docs.filter(d => d.data().outcome === 'emergency').length;
    const bookedToday = callsTodaySnap.docs.filter(d => d.data().outcome === 'job_booked').length;

    const callsThisWeek = weekSnap.size;
    const jobsThisWeek = weekSnap.docs.filter(d => d.data().outcome === 'job_booked').length;
    const leadsThisWeek = weekSnap.docs.filter(d =>
      ['job_booked', 'quote_given', 'callback_needed'].includes(d.data().outcome)
    ).length;

    const settings = settingsSnap.exists ? settingsSnap.data() : null;
    const hasBusinessDetails = !!(settings?.businessName && settings?.traderName);
    const hasMadeTestCall = callsToday > 0 || weekSnap.size > 0 || contactsSnap.size > 0;

    res.json({
      callsToday,
      emergenciesToday,
      bookedToday,
      callsThisWeek,
      jobsThisWeek,
      leadsThisWeek,
      totalContacts: contactsSnap.size,
      hasBusinessDetails,
      hasForwardingSetup: !!(settings?.twilioNumber),
      hasMadeTestCall,
      onboardingComplete: !!(settings?.onboardingComplete),
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
