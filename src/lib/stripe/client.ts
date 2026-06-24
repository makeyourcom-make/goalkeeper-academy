import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

// `null` when no key is configured yet — callers fall back gracefully
// (the wizard sends the request by email until live keys are added).
export const stripe = secretKey ? new Stripe(secretKey) : null;

export function isStripeConfigured(): boolean {
  return Boolean(secretKey);
}
