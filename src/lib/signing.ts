import "server-only";

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const ELECTRONIC_SIGNATURE_CONSENT =
  "By selecting Agree & Sign, I agree to use electronic records and signatures and acknowledge that my electronic signature is intended to have the same effect as my handwritten signature.";

export const PENDING_SIGNATURE_STATUS = "AWAITING_SIGNATURE";
export const SUPERSEDED_CONTRACT_STATUS = "SUPERSEDED";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSigningLink(bookingId: string, contractId: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction(async (tx) => {
    const [contract, latestContract] = await Promise.all([
      tx.generatedContract.findFirst({
        where: {
          id: contractId,
          bookingId,
          status: PENDING_SIGNATURE_STATUS,
          requiresResignature: false,
        },
        select: { id: true },
      }),
      tx.generatedContract.findFirst({
        where: { bookingId },
        orderBy: { version: "desc" },
        select: { id: true },
      }),
    ]);
    if (!contract || latestContract?.id !== contractId) {
      throw new Error("Only the newest pending contract can receive a signing link.");
    }

    // Tokens are intentionally stored only as hashes. Replacing an active link on each copy
    // request keeps a single usable URL without persisting a recoverable signing secret.
    await tx.signingLink.updateMany({
      where: { contractId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.signingLink.create({
      data: { bookingId, contractId, tokenHash: hashToken(token) },
    });
  });
  return token;
}

export async function signingLinkForToken(token: string) {
  const link = await prisma.signingLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      booking: { include: { customer: true } },
      contract: { include: { signature: true } },
    },
  });
  if (
    !link ||
    link.revokedAt ||
    (link.expiresAt && link.expiresAt <= new Date()) ||
    link.contract.status !== PENDING_SIGNATURE_STATUS ||
    link.contract.requiresResignature
  ) {
    return null;
  }
  const latestContract = await prisma.generatedContract.findFirst({
    where: { bookingId: link.bookingId },
    orderBy: { version: "desc" },
    select: { id: true },
  });
  if (latestContract?.id !== link.contractId) return null;
  return link;
}

export async function markContractsForResignature(bookingId: string) {
  await prisma.$transaction(async (tx) => {
    const unsignedContracts = await tx.generatedContract.findMany({
      where: { bookingId, status: { not: "SIGNED" } },
      select: { id: true },
    });
    if (unsignedContracts.length) {
      await tx.signingLink.updateMany({
        where: {
          contractId: { in: unsignedContracts.map((contract) => contract.id) },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
    await tx.generatedContract.updateMany({
      where: { bookingId, status: "SIGNED" },
      data: { requiresResignature: true },
    });
    await tx.generatedContract.updateMany({
      where: { bookingId, status: { not: "SIGNED" } },
      data: { requiresResignature: true },
    });
  });
}
