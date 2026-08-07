import { prisma } from "@/lib/prisma";
import { calculateBookingPricing } from "@/lib/pricing";

export async function recalculateBooking(bookingId: string) {
  const [booking, lines] = await Promise.all([
    prisma.booking.findUniqueOrThrow({ where: { id: bookingId } }),
    prisma.bookingLine.findMany({ where: { bookingId } }),
  ]);
  const pricing = calculateBookingPricing({
    lines: lines.map((line) => ({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      taxable: line.taxable,
    })),
    discount: booking.discountType
      ? { type: booking.discountType as "FIXED" | "PERCENT", value: booking.discountValue }
      : null,
    taxRateBasisPoints: booking.taxRateBasisPoints,
    securityDepositCents: booking.securityDepositCents,
  });
  await prisma.$transaction([
    ...lines.map((line) =>
      prisma.bookingLine.update({
        where: { id: line.id },
        data: { lineSubtotalCents: line.quantity * line.unitPriceCents },
      }),
    ),
    prisma.booking.update({ where: { id: bookingId }, data: pricing }),
  ]);
  return pricing;
}

export async function addBookingActivity(
  bookingId: string,
  userId: string,
  type: string,
  summary: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.bookingActivity.create({
    data: {
      bookingId,
      userId,
      type,
      summary,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
