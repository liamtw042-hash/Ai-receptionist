import Stripe from 'stripe';

let client: Stripe | null = null;

/**
 * Lazily creates the Stripe client. Returns null if STRIPE_SECRET_KEY isn't
 * configured yet so the rest of the API keeps working (billing routes are
 * the only thing that needs this) instead of crashing the whole server on
 * boot in environments where Stripe hasn't been set up.
 */
export function getStripe(): Stripe | null {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client = new Stripe(key, { apiVersion: '2024-06-20' });
  return client;
}

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
