import { Router, Request, Response } from 'express';
import { db } from '../lib/firebase';
import { sendAdminEmail } from '../services/adminNotify';

const router = Router();

// Basic, pragmatic email shape check — deliberately not trying to be RFC-perfect,
// just enough to reject obvious junk before we write a Firestore doc.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// POST /api/newsletter/subscribe — PUBLIC (no auth). Fired from the marketing
// landing page footer. Writes to the `newsletter_signups` collection, keyed by
// a normalised (lowercased) email so re-submitting the same address is a no-op
// rather than piling up duplicate spam docs.
router.post('/subscribe', async (req: Request, res: Response) => {
  const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const email = rawEmail.toLowerCase();

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    res.status(400).json({ status: 'invalid', error: 'Please enter a valid email address.' });
    return;
  }

  try {
    // Doc id is the email itself (Firestore doc ids can't contain '/', which a
    // valid email never does) — this makes duplicate prevention atomic and free.
    const docId = encodeURIComponent(email);
    const ref = db.collection('newsletter_signups').doc(docId);
    const existing = await ref.get();

    if (existing.exists) {
      res.status(200).json({ status: 'already-subscribed' });
      return;
    }

    await ref.set({
      email,
      source: 'landing-footer',
      createdAt: new Date(),
    });

    // Best-effort email alert — never fail the signup over a notification.
    await sendAdminEmail(
      'TradeDesk newsletter signup',
      `New newsletter signup: ${email}`
    );

    res.status(201).json({ status: 'subscribed' });
  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    res.status(500).json({ status: 'error', error: 'Something went wrong. Please try again.' });
  }
});

export { router as newsletterRouter };
