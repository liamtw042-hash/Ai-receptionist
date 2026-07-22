import { Router, Request, Response } from 'express';
import { db } from '../lib/firebase';
import { sendAdminEmail, sendGmailFromAdmin } from '../services/adminNotify';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// The trades offered in the landing-page dropdown. Anything else is coerced to
// 'other' so a hand-crafted request can't stuff arbitrary strings into the
// tradeType field (which the admin view renders).
const TRADES = ['plumber', 'electrician', 'builder', 'hvac', 'locksmith', 'other'] as const;

// Only reveal the public counter once it's genuinely respectable — the landing
// page hides it entirely below this, so we never show a small/embarrassing (or
// inflatable) number.
const PUBLIC_COUNT_THRESHOLD = 10;

// Trim + hard-cap a free-text field so nothing oversized reaches Firestore or
// the admin table. Returns '' for non-strings.
function clean(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// POST /api/waitlist — PUBLIC (no auth). Landing-page waitlist signup.
// Deduped by lowercased email (doc id), so re-submitting is a friendly no-op.
router.post('/', async (req: Request, res: Response) => {
  const name = clean(req.body?.name, 120);
  const businessName = clean(req.body?.businessName, 160);
  const email = clean(req.body?.email, 254).toLowerCase();
  const phone = clean(req.body?.phone, 40);
  const rawTrade = clean(req.body?.tradeType, 40).toLowerCase();
  const tradeType = (TRADES as readonly string[]).includes(rawTrade) ? rawTrade : 'other';

  if (!name) {
    res.status(400).json({ status: 'invalid', error: 'Please enter your name.' });
    return;
  }
  if (!businessName) {
    res.status(400).json({ status: 'invalid', error: 'Please enter your business name.' });
    return;
  }
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ status: 'invalid', error: 'Please enter a valid email address.' });
    return;
  }

  try {
    // Doc id = encoded email → atomic, free dedupe (a valid email never
    // contains '/', the only char Firestore doc ids forbid).
    const docId = encodeURIComponent(email);
    const ref = db.collection('waitlist').doc(docId);
    const existing = await ref.get();

    if (existing.exists) {
      res.status(200).json({ status: 'already-on-list' });
      return;
    }

    await ref.set({
      name,
      businessName,
      email,
      phone,          // optional — stored as '' when omitted
      tradeType,
      source: 'landing-waitlist',
      createdAt: new Date(),
    });

    // Best-effort emails — the Firestore write above is the record of truth, so
    // neither of these failing should fail the signup.
    await sendGmailFromAdmin(
      email,
      "You're on the TradeDesk waitlist",
      [
        `G'day ${name.split(' ')[0] || 'there'},`,
        '',
        "Thanks for putting your name down for TradeDesk — the AI receptionist that answers the calls you can't, works out what the customer needs, and texts you the details.",
        '',
        "We're putting the finishing touches on it now. As an early waitlister you'll get first access, founding-member pricing, and a free trial when it launches — I'll email you the moment your spot's ready.",
        '',
        "If you ever want to reach me directly, just reply to this email.",
        '',
        'Cheers,',
        'Liam',
        'TradeDesk · Newcastle NSW',
      ].join('\n'),
    );

    await sendAdminEmail(
      `TradeDesk waitlist: ${businessName}`,
      [
        'New waitlist signup:',
        '',
        `Name: ${name}`,
        `Business: ${businessName}`,
        `Trade: ${tradeType}`,
        `Email: ${email}`,
        `Phone: ${phone || '—'}`,
      ].join('\n'),
    );

    res.status(201).json({ status: 'joined' });
  } catch (err) {
    console.error('Waitlist signup error:', err);
    res.status(500).json({ status: 'error', error: 'Something went wrong. Please try again.' });
  }
});

// GET /api/waitlist/count — PUBLIC. Social proof for the landing page.
// Returns the real number ONLY once it clears the threshold; below that the
// count is withheld and the frontend hides the counter entirely, so we never
// display (or expose an inflatable) small number.
router.get('/count', async (_req: Request, res: Response) => {
  try {
    const agg = await db.collection('waitlist').count().get();
    const total = agg.data().count;
    const showPublicly = total >= PUBLIC_COUNT_THRESHOLD;
    res.json({ showPublicly, count: showPublicly ? total : null });
  } catch (err) {
    console.error('Waitlist count error:', err);
    // Fail closed — a broken count just hides the counter, never blocks the page.
    res.json({ showPublicly: false, count: null });
  }
});

export { router as waitlistRouter };
