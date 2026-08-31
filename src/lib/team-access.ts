import type { Prisma } from "@/generated/prisma/client";

export type BookingAccessUser = {
  id: string;
  membership: { teamId: string; role: string };
};

export function bookingVisibilityWhere(user: BookingAccessUser): Prisma.BookingWhereInput {
  if (user.membership.role === "ADMIN") return { teamId: user.membership.teamId };
  return {
    teamId: user.membership.teamId,
    OR: [
      { createdByUserId: user.id },
      { ownerUserId: user.id },
      { members: { some: { userId: user.id } } },
    ],
  };
}
