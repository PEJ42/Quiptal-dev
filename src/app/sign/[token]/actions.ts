"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addBookingActivity } from "@/lib/booking-service";
import { parseContractSnapshot } from "@/lib/contract-snapshot";
import { contractSnapshotPdfModel, renderContractPdf, storeContract } from "@/lib/contracts";
import { createBookingCheckout, rentalAmountCents } from "@/lib/payment-service";
import { prisma } from "@/lib/prisma";
import { ELECTRONIC_SIGNATURE_CONSENT, signingLinkForToken } from "@/lib/signing";

export async function agreeAndSign(formData: FormData) {
  const token = z.string().min(32).parse(formData.get("token"));
  const signerName = z.string().trim().min(3).max(160).parse(formData.get("signerName"));
  if (formData.get("electronicConsent") !== "on" || formData.get("cardConsent") !== "on") {
    redirect(`/sign/${token}?error=consent`);
  }
  const link = await signingLinkForToken(token);
  if (!link || link.contract.status === "SIGNED" || link.contract.signature) {
    redirect(`/sign/${token}?error=unavailable`);
  }
  const snapshot = parseContractSnapshot(link.contract.pricingSnapshotJson);
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
  const signedAt = new Date();
  const signedPdf = await renderContractPdf(contractSnapshotPdfModel(snapshot));
  const signedFileReference = await storeContract(signedPdf);
  await prisma.$transaction([
    prisma.contractSignature.create({
      data: {
        contractId: link.contractId,
        signerName,
        signerEmail: link.booking.customer.email,
        signatureData: `typed:${signerName}`,
        ipAddress,
        userAgent: requestHeaders.get("user-agent"),
        consentText: ELECTRONIC_SIGNATURE_CONSENT,
        consentedAt: signedAt,
        contentHash: link.contract.contentHash || "",
        signedAt,
      },
    }),
    prisma.generatedContract.update({
      where: { id: link.contractId },
      data: {
        status: "SIGNED",
        signedAt,
        fileReference: signedFileReference,
        requiresResignature: false,
      },
    }),
  ]);
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
