import "server-only";

import { normalizeEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function attachPendingBookingUsers(userId: string, email: string) {
  const pending = await prisma.pendingBookingUserEmail.findMany({
    where: { normalizedEmail: normalizeEmail(email) },
    include: { booking: { select: { teamId: true } } },
  });
  if (!pending.length) return;
  await prisma.$transaction(async (tx) => {
    for (const association of pending) {
      await tx.bookingMember.upsert({
        where: { bookingId_userId: { bookingId: association.bookingId, userId } },
        update: {},
        create: { bookingId: association.bookingId, userId },
      });
      if (association.booking.teamId) {
        await tx.teamMembership.upsert({
          where: { userId_teamId: { userId, teamId: association.booking.teamId } },
          update: {},
          create: { userId, teamId: association.booking.teamId, role: "MEMBER" },
        });
        await tx.user.update({
          where: { id: userId },
          data: { activeTeamId: association.booking.teamId },
        });
      }
    }
    await tx.pendingBookingUserEmail.deleteMany({
      where: { id: { in: pending.map((row) => row.id) } },
    });
  });
}
