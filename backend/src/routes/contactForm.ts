import { Router, Request, Response } from 'express';
import { db } from '../lib/firebase';
import { sendAdminEmail } from '../services/adminNotify';

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// POST /api/contact-form — PUBLIC (no auth). Fired from the marketing /contact
// page. Writes to the `contact_messages` collection so enquiries actually land
// somewhere instead of being discarded client-side.
router.post('/', async (req: Request, res: Response) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const trade = typeof req.body?.trade === 'string' ? req.body.trade.trim().slice(0, 80) : '';
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 5000) : '';

  if (!name || !message) {
    res.status(400).json({ status: 'invalid', error: 'Name and message are required.' });
    return;
  }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    res.status(400).json({ status: 'invalid', error: 'Please enter a valid email address.' });
    return;
  }

  try {
    await db.collection('contact_messages').add({
      name,
      email,
      trade,
      message,
      source: 'contact-page',
      createdAt: new Date(),
    });

    // Best-effort email alert — the Firestore doc above is the record of
    // truth, so a notification failure must not fail the submission.
    await sendAdminEmail(
      `TradeDesk contact form: ${name}`,
      [`New contact form submission`, '', `Name: ${name}`, `Email: ${email}`, `Trade: ${trade || '—'}`, '', 'Message:', message].join('\n')
    );

    res.status(201).json({ status: 'sent' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ status: 'error', error: 'Something went wrong. Please try again.' });
  }
});

export { router as contactFormRouter };
