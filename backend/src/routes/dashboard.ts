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

    const [callsTodaySnap, weekSnap, contactsSnap, settingsSnap, anyCallSnap, jobsTodaySnap, jobsWeekSnap] = await Promise.all([
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
      // "Made a test call" = at least one call has ever come through, regardless of when.
      db.collection('calls').where('userId', '==', req.userId).limit(1).get(),
      // Jobs booked (by creation date, not scheduled date) — the Jobs page
      // is the source of truth here, including manually-added jobs that
      // never went through a call.
      db.collection('jobs')
        .where('userId', '==', req.userId)
        .where('createdAt', '>=', startOfDay.toISOString())
        .get(),
      db.collection('jobs')
        .where('userId', '==', req.userId)
        .where('createdAt', '>=', startOfWeek.toISOString())
        .get(),
    ]);

    const callsToday = callsTodaySnap.size;
    const emergenciesToday = callsTodaySnap.docs.filter(d => d.data().outcome === 'emergency').length;
    const bookedToday = jobsTodaySnap.docs.filter(d => d.data().status !== 'cancelled').length;

    const callsThisWeek = weekSnap.size;
    const jobsThisWeek = jobsWeekSnap.docs.filter(d => d.data().status !== 'cancelled').length;
    const leadsThisWeek = weekSnap.docs.filter(d =>
      ['job_booked', 'quote_given', 'callback_needed'].includes(d.data().outcome)
    ).length;

    const settings = settingsSnap.exists ? settingsSnap.data()! : {};
    const hasBusinessDetails = !!(settings.businessName && settings.traderName && settings.tradeType);
    // Only the user's explicit "I've set this up" confirmation counts. A
    // Twilio number being assigned to the account says nothing about whether
    // the tradie has actually dialled the forwarding codes on their phone —
    // counting it made the checklist tick a step that hadn't happened.
    const hasForwardingSetup = !!settings.hasForwardingSetup;
    const hasMadeTestCall = !anyCallSnap.empty;

    res.json({
      callsToday,
      emergenciesToday,
      bookedToday,
      callsThisWeek,
      jobsThisWeek,
      leadsThisWeek,
      totalContacts: contactsSnap.size,
      hasBusinessDetails,
      hasForwardingSetup,
      hasMadeTestCall,
      onboardingComplete: !!settings.onboardingComplete,
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
