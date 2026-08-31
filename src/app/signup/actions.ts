"use server";

import { redirect } from "next/navigation";
import { createSession, passwordHash } from "@/lib/auth";
import { credentialsSchema } from "@/lib/auth-schemas";
import { createInvitedUser, InvitationRedemptionError, invitationState } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";

function signupErrorPath(invite: string | null, error: string) {
  return `/signup?${new URLSearchParams({ ...(invite ? { invite } : {}), error }).toString()}`;
}

export async function createAccount(formData: FormData) {
  const invite = String(formData.get("invite") || "") || null;
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect(signupErrorPath(invite, "invalid"));
  if (await prisma.user.findUnique({ where: { email: parsed.data.email } })) {
    redirect(`/login?${new URLSearchParams({ error: "account", ...(invite ? { invite } : {}) })}`);
  }

  if (invite) {
    const invitation = await invitationState(invite);
    if (invitation.state !== "valid") redirect(signupErrorPath(invite, invitation.state));
    if (invitation.recipientEmail !== parsed.data.email) redirect(signupErrorPath(invite, "email"));
    let user;
    try {
      user = await createInvitedUser({
        token: invite,
        email: parsed.data.email,
        passwordHash: await passwordHash(parsed.data.password),
      });
    } catch (error) {
      if (error instanceof InvitationRedemptionError) {
        redirect(signupErrorPath(invite, error.state));
      }
      throw error;
    }
    await createSession(user.id);
    redirect("/");
  }

  const user = await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: { name: `${parsed.data.email.split("@")[0]}'s workspace` },
    });
    const created = await tx.user.create({
      data: {
        email: parsed.data.email,
        passwordHash: await passwordHash(parsed.data.password),
        role: "ADMIN",
        activeTeamId: team.id,
      },
    });
    await tx.teamMembership.create({
      data: { userId: created.id, teamId: team.id, role: "ADMIN" },
    });
    return created;
  });
  await createSession(user.id);
  redirect("/");
}
