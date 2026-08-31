import "server-only";
import { randomBytes } from "crypto";
import { hashToken, normalizeEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type InvitationState =
  | { state: "valid"; teamName: string; recipientEmail: string }
  | { state: "invalid" | "used" | "revoked" | "expired" };

export class InvitationRedemptionError extends Error {
  constructor(readonly state: "invalid" | "used" | "revoked" | "expired" | "email") {
    super(state);
  }
}

export async function invitationState(token: string): Promise<InvitationState> {
  const invitation = await prisma.teamInvitation.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { team: { select: { name: true } } },
  });
  if (!invitation) return { state: "invalid" };
  if (invitation.usedAt) return { state: "used" };
  if (invitation.revokedAt) return { state: "revoked" };
  if (invitation.expiresAt && invitation.expiresAt <= new Date()) return { state: "expired" };
  return {
    state: "valid",
    teamName: invitation.team.name,
    recipientEmail: invitation.recipientEmail,
  };
}

export async function createInvitation({
  teamId,
  createdById,
  recipientEmail,
  expiresAt,
}: {
  teamId: string;
  createdById: string;
  recipientEmail: string;
  expiresAt?: Date;
}) {
  const token = randomBytes(32).toString("base64url");
  const invitation = await prisma.teamInvitation.create({
    data: {
      teamId,
      createdById,
      recipientEmail: normalizeEmail(recipientEmail),
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  return { invitation, token };
}

export async function redeemInvitation({
  token,
  userId,
  email,
}: {
  token: string;
  userId: string;
  email: string;
}): Promise<InvitationState> {
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.teamInvitation.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { team: { select: { name: true } } },
    });
    if (!invitation) return { state: "invalid" };
    if (invitation.usedAt) return { state: "used" };
    if (invitation.revokedAt) return { state: "revoked" };
    if (invitation.expiresAt && invitation.expiresAt <= new Date()) return { state: "expired" };
    if (invitation.recipientEmail !== normalizeEmail(email)) return { state: "invalid" };

    const consumed = await tx.teamInvitation.updateMany({
      where: {
        id: invitation.id,
        usedAt: null,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) return { state: "used" };
    await tx.teamMembership.upsert({
      where: { userId_teamId: { userId, teamId: invitation.teamId } },
      update: {},
      create: { userId, teamId: invitation.teamId, role: "MEMBER" },
    });
    await tx.user.update({ where: { id: userId }, data: { activeTeamId: invitation.teamId } });
    return {
      state: "valid",
      teamName: invitation.team.name,
      recipientEmail: invitation.recipientEmail,
    };
  });
}

export async function createInvitedUser({
  token,
  email,
  passwordHash,
}: {
  token: string;
  email: string;
  passwordHash: string;
}) {
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.teamInvitation.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!invitation) throw new InvitationRedemptionError("invalid");
    if (invitation.usedAt) throw new InvitationRedemptionError("used");
    if (invitation.revokedAt) throw new InvitationRedemptionError("revoked");
    if (invitation.expiresAt && invitation.expiresAt <= new Date()) {
      throw new InvitationRedemptionError("expired");
    }
    if (invitation.recipientEmail !== normalizeEmail(email)) {
      throw new InvitationRedemptionError("email");
    }
    const user = await tx.user.create({
      data: { email: normalizeEmail(email), passwordHash, role: "MEMBER" },
    });
    const consumed = await tx.teamInvitation.updateMany({
      where: {
        id: invitation.id,
        usedAt: null,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) throw new InvitationRedemptionError("used");
    await tx.teamMembership.create({
      data: { userId: user.id, teamId: invitation.teamId, role: "MEMBER" },
    });
    return tx.user.update({
      where: { id: user.id },
      data: { activeTeamId: invitation.teamId },
    });
  });
}
