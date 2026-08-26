import "server-only";

import Stripe from "stripe";

const requiredStripeVariables = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] as const;

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function applicationUrl() {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function stripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to the environment.");
  }
  return new Stripe(secretKey);
}

export function stripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error(
      "Stripe webhooks are not configured. Add STRIPE_WEBHOOK_SECRET to the environment.",
    );
  }
  return webhookSecret;
}

export { requiredStripeVariables };
