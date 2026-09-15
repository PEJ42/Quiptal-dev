"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addBookingActivity } from "@/lib/booking-service";
import { markDropoffContractSigned } from "@/lib/checklists";
import { parseContractSnapshot } from "@/lib/contract-snapshot";
import { contractSnapshotPdfModel, renderContractPdf, storeContract } from "@/lib/contracts";
import { createBookingCheckout, rentalAmountCents } from "@/lib/payment-service";
import { prisma } from "@/lib/prisma";
import {
  ELECTRONIC_SIGNATURE_CONSENT,
  PENDING_SIGNATURE_STATUS,
  signingLinkForToken,
} from "@/lib/signing";

export async function agreeAndSign(formData: FormData) {
  const token = z.string().min(32).parse(formData.get("token"));
  const signerName = z.string().trim().min(3).max(160).parse(formData.get("signerName"));
  if (formData.get("electronicConsent") !== "on" || formData.get("cardConsent") !== "on") {
    redirect(`/sign/${token}?error=consent`);
  }
  const link = await signingLinkForToken(token);
  if (
    !link ||
    link.contract.status === "SIGNED" ||
    link.contract.signature ||
    link.contract.requiresResignature
  ) {
    redirect(`/sign/${token}?error=unavailable`);
  }
  const snapshot = parseContractSnapshot(link.contract.pricingSnapshotJson);
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
  const signedAt = new Date();
  const userAgent = requestHeaders.get("user-agent");
  const signedPdf = await renderContractPdf(
    contractSnapshotPdfModel(snapshot, null, { signerName, signedAt, userAgent }),
  );
  const signedFileReference = await storeContract(signedPdf);
  try {
    await prisma.$transaction(async (tx) => {
      const activeLink = await tx.signingLink.findFirst({
        where: {
          id: link.id,
          revokedAt: null,
          contract: { status: PENDING_SIGNATURE_STATUS, requiresResignature: false },
        },
        include: { contract: { select: { id: true, bookingId: true, version: true } } },
      });
      const latestContract = await tx.generatedContract.findFirst({
        where: { bookingId: link.bookingId },
        orderBy: { version: "desc" },
        select: { id: true },
      });
      if (!activeLink || latestContract?.id !== link.contractId) {
        throw new Error("The signing link is no longer current.");
      }
      await tx.contractSignature.create({
        data: {
          contractId: link.contractId,
          signerName,
          signerEmail: link.booking.customer.email,
          signatureData: `typed:${signerName}`,
          ipAddress,
          userAgent,
          consentText: ELECTRONIC_SIGNATURE_CONSENT,
          consentedAt: signedAt,
          contentHash: link.contract.contentHash || "",
          signedAt,
        },
      });
      const updated = await tx.generatedContract.updateMany({
        where: {
          id: link.contractId,
          status: PENDING_SIGNATURE_STATUS,
          requiresResignature: false,
        },
        data: {
          status: "SIGNED",
          signedAt,
          fileReference: signedFileReference,
          requiresResignature: false,
        },
      });
      if (updated.count !== 1) throw new Error("The contract is no longer pending signature.");
    });
  } catch {
    redirect(`/sign/${token}?error=unavailable`);
  }
  await markDropoffContractSigned({ bookingId: link.bookingId, signedAt });
  await addBookingActivity(
    link.bookingId,
    link.contract.generatedByUserId,
    "CONTRACT_SIGNED",
    `Contract version ${link.contract.version} signed by ${signerName}`,
  );
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: link.bookingId } });
  if (rentalAmountCents(booking) === 0) redirect(`/sign/${token}?signed=1`);
  const checkout = await createBookingCheckout({
    bookingId: link.bookingId,
    contractId: link.contractId,
    successPath: `/sign/${token}?payment=complete`,
    cancelPath: `/sign/${token}?payment=cancelled`,
    saveCardForDeposit: true,
  });
  redirect(checkout.url);
}
