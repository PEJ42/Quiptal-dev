import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncStripeEvent } from "@/lib/payment-service";
import { stripeClient, stripeWebhookSecret } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing Stripe signature", { status: 400 });

  let event;
  try {
    event = stripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      stripeWebhookSecret(),
    );
  } catch {
    return new NextResponse("Invalid Stripe signature", { status: 400 });
  }

  try {
    await prisma.paymentWebhookEvent.create({
      data: { provider: "stripe", providerEventId: event.id, type: event.type },
    });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await syncStripeEvent(event);
  } catch {
    await prisma.paymentWebhookEvent.deleteMany({ where: { providerEventId: event.id } });
    return new NextResponse("Webhook processing failed", { status: 500 });
  }
  return NextResponse.json({ received: true });
}
