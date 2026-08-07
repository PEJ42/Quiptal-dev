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
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash: await passwordHash(parsed.data.password),
      role: "ADMIN",
    },
  });
  await createSession(user.id);
  redirect("/");
}
