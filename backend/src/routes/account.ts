import { Router, Response } from 'express';
import { db, auth } from '../lib/firebase';
import { getStripe } from '../lib/stripe';
import { requireAuth, AuthRequest } from '../middleware/authMiddleware';

const router = Router();

router.use(requireAuth);

// DELETE /api/account — cancels any active Stripe subscription, wipes all
// Firestore data for this user, then deletes the Firebase Auth account.
router.delete('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  try {
    // Cancel Stripe subscription first, if any, so they're not billed again.
    const stripe = getStripe();
    if (stripe) {
      try {
        const billingDoc = await db.collection('billing').doc(userId).get();
        const subscriptionId = billingDoc.exists ? billingDoc.data()?.subscriptionId : undefined;
        if (subscriptionId) {
          await stripe.subscriptions.cancel(subscriptionId).catch(() => null);
        }
      } catch (err) {
        console.error('Failed to cancel Stripe subscription during account deletion:', err);
      }
    }

    // Delete Firestore data across every collection keyed by userId.
    const collectionsWithUserId = ['calls', 'contacts', 'sms_messages', 'jobs'];
    for (const name of collectionsWithUserId) {
      const snap = await db.collection(name).where('userId', '==', userId).get();
      const batchDeletes = snap.docs.map(d => d.ref.delete());
      await Promise.all(batchDeletes);
    }

    const docsKeyedByUserId = ['settings', 'googleTokens', 'billing'];
    await Promise.all(docsKeyedByUserId.map(name => db.collection(name).doc(userId).delete().catch(() => null)));

    // Finally, delete the Firebase Auth account itself.
    await auth.deleteUser(userId);

    res.json({ success: true });
  } catch (err: any) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete account' });
  }
});

export { router as accountRouter };
