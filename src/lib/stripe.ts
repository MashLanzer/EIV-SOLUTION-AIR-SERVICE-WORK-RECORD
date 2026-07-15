import "server-only";

import Stripe from "stripe";

// Stripe is optional: with no keys configured the whole billing UI degrades to
// a "contact us" note, so the app runs fine before the account is set up.
export const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

const secretKey = process.env.STRIPE_SECRET_KEY ?? "";

// True when self-serve checkout can run (needs the secret key + the Pro price).
export const stripeEnabled = Boolean(secretKey && STRIPE_PRICE_PRO);

// True when the platform secret key is present. Connect onboarding + invoice
// payments only need the key (no Pro price), so they gate on this instead.
export const stripeSecretConfigured = Boolean(secretKey);

let client: Stripe | null = null;

// Lazily construct the client. Throws if called without a secret key, so
// callers must gate on stripeEnabled first.
export function getStripe(): Stripe {
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  if (!client) client = new Stripe(secretKey);
  return client;
}
