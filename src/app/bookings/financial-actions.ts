"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addBookingActivity } from "@/lib/booking-service";
import {
  createBookingCheckout,
  authorizeDeposit,
  captureDeposit,
  refundDeposit,
  releaseDeposit,
} from "@/lib/payment-service";
import { prisma } from "@/lib/prisma";
import { requireBookingAccess } from "@/lib/auth";
import { createSigningLink } from "@/lib/signing";

const bookingIdFrom = (formData: FormData) => z.string().cuid().parse(formData.get("bookingId"));

export async function createCustomerSigningLink(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const { user } = await requireBookingAccess(bookingId);
  const contract = await prisma.generatedContract.findFirst({
    where: {
      bookingId,
      status: { in: ["AWAITING_SIGNATURE", "REQUIRES_RESIGNATURE"] },
      requiresResignature: false,
    },
    orderBy: { version: "desc" },
  });
  if (!contract) redirect(`/bookings/${bookingId}?error=no-contract`);
  const token = await createSigningLink(bookingId, contract.id);
  await addBookingActivity(
    bookingId,
    user.id,
    "SIGNING_LINK_CREATED",
    `Signing link created for contract version ${contract.version}`,
  );
  redirect(`/bookings/${bookingId}?signingLink=${token}`);
}

export async function revokeSigningLinks(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const { user } = await requireBookingAccess(bookingId);
  await prisma.signingLink.updateMany({
    where: { bookingId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await addBookingActivity(
    bookingId,
    user.id,
    "SIGNING_LINK_REVOKED",
    "Active signing links revoked",
  );
  revalidatePath(`/bookings/${bookingId}`);
}

export async function createPaymentLink(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const { user } = await requireBookingAccess(bookingId);
  const contract = await prisma.generatedContract.findFirst({
    where: { bookingId, status: "SIGNED" },
    orderBy: { version: "desc" },
  });
  const payment = await createBookingCheckout({
    bookingId,
    contractId: contract?.id,
    successPath: "/payment/complete",
    cancelPath: "/payment/cancelled",
  });
  await addBookingActivity(
    bookingId,
    user.id,
    "PAYMENT_LINK_CREATED",
    "Stripe payment link created",
    { paymentId: payment.paymentId },
  );
  revalidatePath(`/bookings/${bookingId}`);
}

export async function authorizeBookingDeposit(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const { user } = await requireBookingAccess(bookingId);
  const deposit = await authorizeDeposit(bookingId);
  await addBookingActivity(
    bookingId,
    user.id,
    "DEPOSIT_AUTHORIZED",
    "Security deposit authorization requested",
    { depositId: deposit.id, amountCents: deposit.amountAuthorizedCents },
  );
  revalidatePath(`/bookings/${bookingId}`);
}

export async function releaseBookingDeposit(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const { user } = await requireBookingAccess(bookingId);
  const depositId = z.string().cuid().parse(formData.get("depositId"));
  await releaseDeposit(depositId);
  await addBookingActivity(
    bookingId,
    user.id,
    "DEPOSIT_RELEASED",
    "Security deposit hold released",
    { depositId },
  );
  revalidatePath(`/bookings/${bookingId}`);
}

export async function captureBookingDeposit(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const { user } = await requireBookingAccess(bookingId);
  const depositId = z.string().cuid().parse(formData.get("depositId"));
  const amountCents = z.coerce.number().int().min(1).parse(formData.get("amountCents"));
  const reason = z.string().trim().min(3).max(500).parse(formData.get("reason"));
  await captureDeposit(depositId, amountCents, reason);
  await addBookingActivity(bookingId, user.id, "DEPOSIT_CAPTURED", "Security deposit captured", {
    depositId,
    amountCents,
    reason,
  });
  revalidatePath(`/bookings/${bookingId}`);
}

export async function refundBookingDeposit(formData: FormData) {
  const bookingId = bookingIdFrom(formData);
  const { user } = await requireBookingAccess(bookingId);
  const depositId = z.string().cuid().parse(formData.get("depositId"));
  const amountCents = z.coerce.number().int().min(1).parse(formData.get("amountCents"));
  const reason = z.string().trim().min(3).max(500).parse(formData.get("reason"));
  await refundDeposit(depositId, amountCents, reason);
  await addBookingActivity(bookingId, user.id, "DEPOSIT_REFUNDED", "Security deposit refunded", {
    depositId,
    amountCents,
    reason,
  });
  revalidatePath(`/bookings/${bookingId}`);
}
