"use server";

import { redirect } from "next/navigation";
import { createSession, passwordMatches } from "@/lib/auth";
import { credentialsSchema } from "@/lib/auth-schemas";
import { invitationState, redeemInvitation } from "@/lib/invitations";
import { prisma } from "@/lib/prisma";

export async function signIn(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/login?error=invalid");
  const invite = String(formData.get("invite") || "") || null;
  if (invite) {
    const invitation = await invitationState(invite);
    if (invitation.state !== "valid") redirect(`/login?error=${invitation.state}`);
    if (invitation.recipientEmail !== parsed.data.email) redirect("/login?error=email");
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || user.isArchived || !(await passwordMatches(parsed.data.password, user.passwordHash)))
    redirect("/login?error=invalid");
  if (invite) {
    const redeemed = await redeemInvitation({ token: invite, userId: user.id, email: user.email });
    if (redeemed.state !== "valid") redirect(`/login?error=${redeemed.state}`);
  }
  await createSession(user.id);
  redirect("/");
}
