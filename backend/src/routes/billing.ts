import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db, auth } from '../lib/firebase';
import { getStripe, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET } from '../lib/stripe';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

interface BillingRecord {
  stripeCustomerId?: string;
  subscriptionId?: string;
  // `paused` is reachable only via a no-card trial: when the 7-day trial ends
  // and the customer never added a payment method, Stripe pauses the sub
  // (no invoices generated) rather than failing a charge. It auto-resumes the
  // moment they add a card in the billing portal.
  status: 'none' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid' | 'paused';
  priceId?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  subscriptionStartedAt?: string;
  updatedAt?: string;
}

const DEFAULT_BILLING: BillingRecord = { status: 'none' };

// ── Webhook: must use the raw body for Stripe signature verification, so
// this is mounted BEFORE express.json() in index.ts for this specific path.
router.post('/webhook', async (req: Request, res: Response) => {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: 'Stripe is not configured' }); return; }
  if (!STRIPE_WEBHOOK_SECRET) { res.status(503).json({ error: 'Stripe webhook secret is not configured' }); return; }

  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        if (!userId) break;

        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

        let record: BillingRecord = {
          stripeCustomerId: customerId,
          subscriptionId,
          status: 'active',
          updatedAt: new Date().toISOString(),
        };

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          record = { ...record, ...subscriptionToRecord(sub) };
        }

        await db.collection('billing').doc(userId).set(record, { merge: true });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId || await findUserIdByCustomerId(sub.customer as string);
        if (!userId) break;

        await db.collection('billing').doc(userId).set({
          stripeCustomerId: sub.customer as string,
          subscriptionId: sub.id,
          ...subscriptionToRecord(sub),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId || await findUserIdByCustomerId(sub.customer as string);
        if (!userId) break;

        await db.collection('billing').doc(userId).set({
          status: 'canceled',
          cancelAtPeriodEnd: false,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const userId = await findUserIdByCustomerId(customerId);
        if (!userId) break;

        await db.collection('billing').doc(userId).set({
          status: 'past_due',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
  }

  res.json({ received: true });
});

function subscriptionToRecord(sub: Stripe.Subscription): Partial<BillingRecord> {
  return {
    status: sub.status as BillingRecord['status'],
    priceId: sub.items.data[0]?.price?.id,
    currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    // When the subscription began — lets the admin dashboard chart paying
    // customers over time from real dates instead of guessing.
    subscriptionStartedAt: new Date(sub.created * 1000).toISOString(),
  };
}

async function findUserIdByCustomerId(customerId: string): Promise<string | null> {
  const snap = await db.collection('billing').where('stripeCustomerId', '==', customerId).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

// ── Everything below requires a signed-in TradeDesk user ─────────────────────
router.use(requireAuth);

// GET /api/billing/status
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    const doc = await db.collection('billing').doc(req.userId!).get();
    res.json(doc.exists ? { ...DEFAULT_BILLING, ...doc.data() } : DEFAULT_BILLING);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

// POST /api/billing/create-checkout-session
router.post('/create-checkout-session', async (req: AuthRequest, res: Response) => {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY to the backend environment.' }); return; }
  if (!STRIPE_PRICE_ID) { res.status(503).json({ error: 'Stripe price is not configured yet. Add STRIPE_PRICE_ID to the backend environment.' }); return; }

  try {
    const userId = req.userId!;
    const billingDoc = await db.collection('billing').doc(userId).get();
    let customerId = billingDoc.exists ? billingDoc.data()?.stripeCustomerId : undefined;

    if (!customerId) {
      const userRecord = await auth.getUser(userId);
      const customer = await stripe.customers.create({
        email: userRecord.email,
        name: userRecord.displayName || undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.collection('billing').doc(userId).set(
        { stripeCustomerId: customerId, status: 'none' },
        { merge: true }
      );
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      // The marketing/signup copy promises a genuinely no-credit-card trial, so
      // don't force a card at checkout. `if_required` means Stripe only asks for
      // a card when the amount due today is > $0 — and with a 7-day trial the
      // first payment is $0, so the customer starts the trial card-free.
      payment_method_collection: 'if_required',
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId },
        // What happens when the trial ends and no card was ever added: pause the
        // subscription (no failed charges, no dunning emails, no service billed)
        // instead of the default of trying — and failing — to invoice. The sub
        // sits in `paused` and auto-resumes as soon as they add a card in the
        // billing portal. This is the graceful "add payment to switch back on"
        // path the Settings UI surfaces.
        trial_settings: {
          end_behavior: { missing_payment_method: 'pause' },
        },
      },
      // Lets the marketing/signup pages advertise real promo codes (e.g.
      // FIRSTMONTH) — Stripe's hosted checkout shows a code field and applies
      // whatever coupon/promotion code is configured in the Stripe dashboard.
      allow_promotion_codes: true,
      success_url: `${frontendUrl}/dashboard/settings?billing=success`,
      cancel_url: `${frontendUrl}/dashboard/settings?billing=canceled`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Create checkout session error:', err);
    res.status(500).json({ error: err.message || 'Failed to start checkout' });
  }
});

// POST /api/billing/create-portal-session
router.post('/create-portal-session', async (req: AuthRequest, res: Response) => {
  const stripe = getStripe();
  if (!stripe) { res.status(503).json({ error: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY to the backend environment.' }); return; }

  try {
    const doc = await db.collection('billing').doc(req.userId!).get();
    const customerId = doc.exists ? doc.data()?.stripeCustomerId : undefined;
    if (!customerId) { res.status(400).json({ error: 'No billing account found yet — start a subscription first.' }); return; }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${frontendUrl}/dashboard/settings`,
    });

    res.json({ url: portalSession.url });
  } catch (err: any) {
    console.error('Create portal session error:', err);
    res.status(500).json({ error: err.message || 'Failed to open billing portal' });
  }
});

export { router as billingRouter };
