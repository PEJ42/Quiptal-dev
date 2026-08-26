# Stripe Payments and Native Signing

The application uses Stripe Checkout in test mode for rental payments. The Checkout Session is created only on the server and can optionally save a customer payment method for an off-session security-deposit authorization. The application stores Stripe IDs and card display metadata only; it never stores card numbers or CVC values.

## Environment

Set `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` in the server `.env`. Use Stripe test keys until the booking, signing, webhook, payment, authorization, capture, release, and refund workflows have been validated.

Configure Stripe to send events to `https://bookings.quiptal.com/api/stripe/webhook`. Signature verification uses the raw request body. Processed Stripe event IDs are stored, so duplicate deliveries are safely acknowledged.

## Workflow

1. Generate a contract from a booking. This stores an immutable pricing and equipment snapshot.
2. Create a signing link. Links contain a high-entropy token, but only a hash is stored; links can be revoked.
3. The customer accepts the electronic-signature and saved-card acknowledgements, enters a legal name, signs, and continues to Stripe Checkout.
4. Stripe webhooks update payment and saved-card records. Browser return URLs are never payment proof.
5. Near pickup, authorize the booking's snapshotted security deposit. Capture, release, or refund only through explicit admin actions and record a booking activity.

Changing booking lines or pricing after a contract is signed marks it as requiring re-signature. The already signed version remains preserved.
