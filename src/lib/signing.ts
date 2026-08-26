import "server-only";

import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const ELECTRONIC_SIGNATURE_CONSENT =
  "By selecting Agree & Sign, I agree to use electronic records and signatures and acknowledge that my electronic signature is intended to have the same effect as my handwritten signature.";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSigningLink(bookingId: string, contractId: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.signingLink.create({
    data: { bookingId, contractId, tokenHash: hashToken(token) },
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
  if (!link || link.revokedAt || (link.expiresAt && link.expiresAt <= new Date())) return null;
  return link;
}

export async function markContractsForResignature(bookingId: string) {
  await prisma.generatedContract.updateMany({
    where: { bookingId, status: "SIGNED" },
    data: { status: "REQUIRES_RESIGNATURE", requiresResignature: true },
  });
}
