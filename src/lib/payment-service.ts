import "server-only";

import type Stripe from "stripe";
import { rentalAmountCents } from "@/lib/booking-finance";
import { applicationUrl, stripeClient } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const CARD_CONSENT =
  "I authorize the rental business to save my payment method and use it to authorize or charge the security deposit according to the rental agreement.";

export { CARD_CONSENT, rentalAmountCents };

async function stripeCustomerForBooking(booking: {
  id: string;
  bookingNumber: string;
  customer: { id: string; email: string; firstName: string; lastName: string };
}) {
  const existing = await prisma.payment.findFirst({
    where: { bookingId: booking.id, provider: "stripe", providerCustomerId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { providerCustomerId: true },
  });
  if (existing?.providerCustomerId) return existing.providerCustomerId;
  const stripe = stripeClient();
  const customer = await stripe.customers.create({
    email: booking.customer.email,
    name: `${booking.customer.firstName} ${booking.customer.lastName}`,
    metadata: { bookingId: booking.id, customerId: booking.customer.id },
  });
  return customer.id;
}

export async function createBookingCheckout({
  bookingId,
  contractId,
  successPath,
  cancelPath,
  saveCardForDeposit = false,
}: {
  bookingId: string;
  contractId?: string;
  successPath: string;
  cancelPath: string;
  saveCardForDeposit?: boolean;
}) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { customer: true },
  });
  const amountRequestedCents = rentalAmountCents(booking);
  if (amountRequestedCents < 50) throw new Error("The rental amount must be at least $0.50.");
  const customerId = await stripeCustomerForBooking(booking);
  const payment = await prisma.payment.create({
    data: {
      bookingId,
      contractId: contractId ?? null,
      provider: "stripe",
      status: "PAYMENT_LINK_CREATED",
      providerCustomerId: customerId,
      amountRequestedCents,
      cardConsentText: saveCardForDeposit ? CARD_CONSENT : null,
      cardConsentedAt: saveCardForDeposit ? new Date() : null,
    },
  });
  const stripe = stripeClient();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer: customerId,
      client_reference_id: payment.id,
      success_url: `${applicationUrl()}${successPath}`,
      cancel_url: `${applicationUrl()}${cancelPath}`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Rental payment · ${booking.bookingNumber}` },
            unit_amount: amountRequestedCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        metadata: { bookingId, paymentId: payment.id, contractId: contractId ?? "" },
        ...(saveCardForDeposit ? { setup_future_usage: "off_session" as const } : {}),
      },
      metadata: { bookingId, paymentId: payment.id, contractId: contractId ?? "" },
    },
    { idempotencyKey: `booking-payment-${payment.id}` },
  );
  if (!session.url) throw new Error("Stripe did not provide a checkout URL.");
  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerCheckoutSessionId: session.id, paymentUrl: session.url },
  });
  return { paymentId: payment.id, url: session.url };
}

export async function authorizeDeposit(bookingId: string) {
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  const savedMethod = await prisma.savedPaymentMethod.findFirst({
    where: { bookingId, provider: "stripe" },
    orderBy: { createdAt: "desc" },
  });
  if (!savedMethod) throw new Error("No saved customer card is available for this booking.");
  if (booking.securityDepositCents < 50)
    throw new Error("The security deposit must be at least $0.50.");
  const stripe = stripeClient();
  const intent = await stripe.paymentIntents.create(
    {
      amount: booking.securityDepositCents,
      currency: "usd",
      customer: savedMethod.providerCustomerId,
      payment_method: savedMethod.providerPaymentMethodId,
      confirm: true,
      off_session: true,
      capture_method: "manual",
      metadata: { bookingId, purpose: "security_deposit" },
    },
    { idempotencyKey: `deposit-authorize-${bookingId}-${booking.securityDepositCents}` },
  );
  const captureBefore = (intent as unknown as { capture_before?: number }).capture_before;
  return prisma.depositAuthorization.create({
    data: {
      bookingId,
      savedPaymentMethodId: savedMethod.id,
      provider: "stripe",
      providerPaymentIntentId: intent.id,
      status: intent.status === "requires_capture" ? "AUTHORIZED" : "AUTHORIZATION_PENDING",
      amountAuthorizedCents: intent.amount,
      authorizedAt: intent.status === "requires_capture" ? new Date() : null,
      authorizationExpiresAt: captureBefore ? new Date(captureBefore * 1000) : null,
    },
  });
}

export async function releaseDeposit(depositId: string) {
  const deposit = await prisma.depositAuthorization.findUniqueOrThrow({ where: { id: depositId } });
  if (!deposit.providerPaymentIntentId)
    throw new Error("This deposit has no Stripe authorization.");
  await stripeClient().paymentIntents.cancel(deposit.providerPaymentIntentId);
  return prisma.depositAuthorization.update({
    where: { id: depositId },
    data: { status: "RELEASED", releasedAt: new Date() },
  });
}

export async function captureDeposit(depositId: string, amountCents: number, reason: string) {
  const deposit = await prisma.depositAuthorization.findUniqueOrThrow({ where: { id: depositId } });
  if (
    !deposit.providerPaymentIntentId ||
    amountCents < 1 ||
    amountCents > deposit.amountAuthorizedCents
  ) {
    throw new Error("The requested capture amount is invalid.");
  }
  await stripeClient().paymentIntents.capture(deposit.providerPaymentIntentId, {
    amount_to_capture: amountCents,
  });
  return prisma.depositAuthorization.update({
    where: { id: depositId },
    data: {
      status: amountCents === deposit.amountAuthorizedCents ? "CAPTURED" : "PARTIALLY_CAPTURED",
      amountCapturedCents: amountCents,
      capturedAt: new Date(),
      reason,
    },
  });
}

export async function refundDeposit(depositId: string, amountCents: number, reason: string) {
  const deposit = await prisma.depositAuthorization.findUniqueOrThrow({ where: { id: depositId } });
  if (
    !deposit.providerPaymentIntentId ||
    amountCents < 1 ||
    amountCents > deposit.amountCapturedCents
  ) {
    throw new Error("The requested refund amount is invalid.");
  }
  await stripeClient().refunds.create({
    payment_intent: deposit.providerPaymentIntentId,
    amount: amountCents,
  });
  const refunded = deposit.amountRefundedCents + amountCents;
  return prisma.depositAuthorization.update({
    where: { id: depositId },
    data: {
      status: refunded === deposit.amountCapturedCents ? "REFUNDED" : "PARTIALLY_REFUNDED",
      amountRefundedCents: refunded,
      refundedAt: new Date(),
      reason,
    },
  });
}

export async function syncStripeEvent(event: Stripe.Event) {
  const object = event.data.object as
    Stripe.Checkout.Session | Stripe.PaymentIntent | Stripe.Charge;
  if (event.type === "checkout.session.completed") {
    const session = object as Stripe.Checkout.Session;
    const payment = await prisma.payment.findFirst({
      where: { providerCheckoutSessionId: session.id },
    });
    if (!payment) return;
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerCustomerId:
          typeof session.customer === "string" ? session.customer : payment.providerCustomerId,
        providerPaymentIntentId: paymentIntentId,
        status: session.payment_status === "paid" ? "PAID" : "PAYMENT_PENDING",
        amountPaidCents: session.amount_total ?? 0,
        paidAt: session.payment_status === "paid" ? new Date() : null,
      },
    });
    if (paymentIntentId && typeof session.customer === "string") {
      const intent = await stripeClient().paymentIntents.retrieve(paymentIntentId);
      const methodId = typeof intent.payment_method === "string" ? intent.payment_method : null;
      if (methodId) {
        const method = await stripeClient().paymentMethods.retrieve(methodId);
        await prisma.savedPaymentMethod.upsert({
          where: { providerPaymentMethodId: methodId },
          create: {
            bookingId: payment.bookingId,
            customerId: (
              await prisma.booking.findUniqueOrThrow({ where: { id: payment.bookingId } })
            ).customerId,
            providerCustomerId: session.customer,
            providerPaymentMethodId: methodId,
            cardBrand: method.card?.brand ?? null,
            cardLast4: method.card?.last4 ?? null,
            consentedAt: payment.cardConsentedAt ?? new Date(),
          },
          update: { consentedAt: payment.cardConsentedAt ?? new Date() },
        });
      }
    }
  }
  if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    const intent = object as Stripe.PaymentIntent;
    await prisma.payment.updateMany({
      where: { providerPaymentIntentId: intent.id },
      data: { status: event.type === "payment_intent.canceled" ? "FAILED" : "FAILED" },
    });
    await prisma.depositAuthorization.updateMany({
      where: { providerPaymentIntentId: intent.id },
      data: {
        status: event.type === "payment_intent.canceled" ? "RELEASED" : "FAILED",
        releasedAt: new Date(),
      },
    });
  }
  if (event.type === "payment_intent.amount_capturable_updated") {
    const intent = object as Stripe.PaymentIntent;
    await prisma.depositAuthorization.updateMany({
      where: { providerPaymentIntentId: intent.id },
      data: {
        status: "AUTHORIZED",
        amountAuthorizedCents: intent.amount_capturable,
        authorizedAt: new Date(),
      },
    });
  }
  if (event.type === "payment_intent.succeeded") {
    const intent = object as Stripe.PaymentIntent;
    await prisma.depositAuthorization.updateMany({
      where: { providerPaymentIntentId: intent.id },
      data: {
        status: "CAPTURED",
        amountCapturedCents: intent.amount_received,
        capturedAt: new Date(),
      },
    });
  }
}
