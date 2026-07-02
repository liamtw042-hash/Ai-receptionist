import { Router, Response } from 'express';
import { db } from '../lib/firebase';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';
import { getBusinessSettings, buildSystemPrompt, BusinessSettings } from '../services/businessContext';
import { getAIResponse } from '../lib/openai';

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
    'twilioNumber', 'onboardingComplete', 'hasForwardingSetup',
    'smsAlertsEnabled', 'emailSummaryEnabled', 'weeklySummaryEnabled',
    // Deliberately NOT client-settable: gmailConnected. It's derived from
    // actual Google OAuth scope grants (see routes/google.ts) so a client
    // can't just PUT it to true without ever connecting.
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

// POST /api/settings/test-ai — simulates what a caller hears, using either
// the currently-saved settings or an in-progress (unsaved) draft the
// frontend passes in, so users can test changes before hitting Save.
router.post('/test-ai', async (req: AuthRequest, res: Response) => {
  try {
    const saved = await getBusinessSettings(req.userId!);
    const draft = req.body || {};

    const settings: BusinessSettings = {
      businessName: draft.businessName ?? saved?.businessName ?? '',
      traderName: draft.traderName ?? saved?.traderName ?? '',
      tradeType: draft.tradeType ?? saved?.tradeType ?? '',
      suburb: draft.suburb ?? saved?.suburb ?? '',
      pricingGuide: draft.pricingGuide ?? saved?.pricingGuide ?? '',
      availability: draft.availability ?? saved?.availability ?? '',
      mobileNumber: draft.mobileNumber ?? saved?.mobileNumber ?? '',
      services: draft.services ?? saved?.services ?? [],
      emergencyCallbackMinutes: draft.emergencyCallbackMinutes ?? saved?.emergencyCallbackMinutes ?? 30,
    };

    if (!settings.businessName || !settings.traderName || !settings.tradeType) {
      res.status(400).json({ error: 'Add your business name, your name, and trade type in Business Profile first.' });
      return;
    }

    // This is the exact greeting template the AI uses on a real call (see
    // voice.ts) — the greeting itself isn't AI-generated, so this is a
    // faithful preview rather than a guess.
    const greeting = `Hi, thanks for calling ${settings.businessName}, I'm their AI assistant — how can I help you today?`;
    const sampleQuestion = 'How much would it cost to get someone out to have a look at a job?';

    let sampleReply: string | undefined;
    let warning: string | undefined;
    try {
      const systemPrompt = buildSystemPrompt(settings);
      sampleReply = await getAIResponse(systemPrompt, sampleQuestion);
    } catch (err) {
      console.error('Test AI sample reply error:', err);
      warning = "Greeting looks good, but couldn't generate a sample reply right now — check the OpenAI configuration.";
    }

    res.json({ greeting, sampleQuestion, sampleReply, warning });
  } catch (err) {
    console.error('Test AI error:', err);
    res.status(500).json({ error: 'Failed to test AI' });
  }
});

export { router as settingsRouter };
