import { Router, Response } from 'express';
import { db } from '../lib/firebase';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db.collection('settings').doc(req.userId!).get();
    if (!doc.exists) {
      res.json({});
      return;
    }
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req: AuthRequest, res: Response) => {
  const allowed = [
    'businessName', 'traderName', 'tradeType', 'suburb', 'pricingGuide',
    'availability', 'mobileNumber', 'services', 'emergencyCallbackMinutes',
    'twilioNumber', 'gmailConnected', 'onboardingComplete',
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  try {
    await db.collection('settings').doc(req.userId!).set(
      { ...updates, updatedAt: new Date() },
      { merge: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export { router as settingsRouter };
