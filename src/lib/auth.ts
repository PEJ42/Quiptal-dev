import "server-only";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "rental_booking_session";
const SESSION_DAYS = 14;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hasAdmin() {
  return (await prisma.user.count({ where: { isArchived: false } })) > 0;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function currentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date() || session.user.isArchived) return null;
  return session.user;
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/login");
  return user;
}

export async function signOut() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}

export async function passwordHash(password: string) {
  return bcrypt.hash(password, 12);
}

export async function passwordMatches(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
