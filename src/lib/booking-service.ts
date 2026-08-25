import { prisma } from "@/lib/prisma";
import { calculateBookingPricing, recommendedSecurityDepositCents } from "@/lib/pricing";

export async function recalculateBooking(bookingId: string) {
  const [booking, lines] = await Promise.all([
    prisma.booking.findUniqueOrThrow({ where: { id: bookingId } }),
    prisma.bookingLine.findMany({
      where: { bookingId },
      include: { bundleComponentSnapshots: true },
    }),
  ]);
  // A previous version could create a bundle line with a zero price. Repair only
  // those affected lines; existing non-zero booking snapshots stay unchanged.
  const zeroPricedBundleLines = lines.filter(
    (line) => line.lineType === "BUNDLE" && line.unitPriceCents === 0,
  );
  const zeroPricedBundleSourceIds = zeroPricedBundleLines.flatMap((line) =>
    line.sourceCatalogId ? [line.sourceCatalogId] : [],
  );
  const zeroPricedBundleNames = zeroPricedBundleLines.map((line) => line.snapshotName);
  const currentBundles = zeroPricedBundleLines.length
    ? await prisma.bundle.findMany({
        where: {
          OR: [{ id: { in: zeroPricedBundleSourceIds } }, { name: { in: zeroPricedBundleNames } }],
        },
        select: { id: true, name: true, fixedRentalCents: true },
      })
    : [];
  const bundlePriceById = new Map(
    currentBundles.map((bundle) => [bundle.id, bundle.fixedRentalCents]),
  );
  const bundlePriceByName = new Map(
    currentBundles.map((bundle) => [bundle.name, bundle.fixedRentalCents]),
  );
  const pricedLines = lines.map((line) => {
    const repairedUnitPriceCents =
      line.lineType === "BUNDLE" && line.unitPriceCents === 0 && line.sourceCatalogId
        ? (bundlePriceById.get(line.sourceCatalogId) ??
          bundlePriceByName.get(line.snapshotName) ??
          line.lineSubtotalCents ??
          line.unitPriceCents)
        : line.lineType === "BUNDLE" && line.unitPriceCents === 0
          ? (bundlePriceByName.get(line.snapshotName) ??
            line.lineSubtotalCents ??
            line.unitPriceCents)
          : line.unitPriceCents;
    return { ...line, unitPriceCents: repairedUnitPriceCents };
  });
  const securityDepositCents =
    booking.securityDepositOverrideCents ?? recommendedSecurityDepositCents(lines);
  const pricing = calculateBookingPricing({
    lines: pricedLines.map((line) => ({
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      taxable: line.taxable,
    })),
    discount: booking.discountType
      ? { type: booking.discountType as "FIXED" | "PERCENT", value: booking.discountValue }
      : null,
    taxRateBasisPoints: booking.taxRateBasisPoints,
    securityDepositCents,
  });
  await prisma.$transaction([
    ...pricedLines.map((line) =>
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
