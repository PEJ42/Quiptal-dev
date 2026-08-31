"use server";

import { redirect } from "next/navigation";
import { createSession, hasAdmin, passwordHash } from "@/lib/auth";
import { credentialsSchema } from "@/lib/auth-schemas";
import { prisma } from "@/lib/prisma";

export async function createFirstAdmin(formData: FormData) {
  if (await hasAdmin()) redirect("/login");
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/setup?error=invalid");
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
