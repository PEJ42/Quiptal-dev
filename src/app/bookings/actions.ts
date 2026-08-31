"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addBookingActivity, recalculateBooking } from "@/lib/booking-service";
import { bookingDate, bookingSchema } from "@/lib/booking-schema";
import { requireBookingAccess, requireTeamAdmin, requireWorkspaceUser } from "@/lib/auth";
import { dollarsToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { markContractsForResignature } from "@/lib/signing";
import { parseContractSnapshot } from "@/lib/contract-snapshot";

function bookingNumber() {
  return `B-${new Date().getUTCFullYear()}-${String(Date.now()).slice(-6)}`;
}
export async function createBooking(formData: FormData) {
  const user = await requireWorkspaceUser();
  const parsed = bookingSchema.safeParse({
    ...Object.fromEntries(formData),
    primaryContactId: formData.get("primaryContactId") || undefined,
    title: formData.get("title") || undefined,
    discountType: formData.get("discountType") || undefined,
  });
  if (!parsed.success) redirect("/bookings/new?error=invalid");
  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: parsed.data.customerId },
  });
  const booking = await prisma.booking.create({
    data: {
      ...parsed.data,
      teamId: user.membership.teamId,
      createdByUserId: user.id,
      ownerUserId: user.id,
      startDate: bookingDate(parsed.data.startDate),
      endDate: bookingDate(parsed.data.endDate),
      primaryContactId: parsed.data.primaryContactId || null,
      title: parsed.data.title || null,
      notes: parsed.data.notes || null,
      discountType: parsed.data.discountType || null,
      billingAddressLine1Snapshot: customer.addressLine1,
      billingAddressLine2Snapshot: customer.addressLine2,
      billingCitySnapshot: customer.city,
      billingRegionSnapshot: customer.region,
      billingPostalCodeSnapshot: customer.postalCode,
      billingCountrySnapshot: customer.country,
      bookingNumber: bookingNumber(),
      securityDepositCents: 0,
      securityDepositOverrideCents: null,
    },
  });
  await recalculateBooking(booking.id);
  await addBookingActivity(booking.id, user.id, "CREATED", "Booking created");
  redirect(`/bookings/${booking.id}`);
}
export async function addBookingLine(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const { user } = await requireBookingAccess(bookingId);
  const [kindValue, sourceValue] = z.string().parse(formData.get("source")).split(":");
  const kind = z.enum(["PRODUCT", "BUNDLE", "SERVICE"]).parse(kindValue);
  const sourceId = z.string().cuid().parse(sourceValue);
  const requestedQuantity = z.coerce.number().int().min(1).parse(formData.get("quantity"));
  const displayOrder = await prisma.bookingLine.count({ where: { bookingId } });
  if (kind === "PRODUCT") {
    const p = await prisma.product.findUniqueOrThrow({ where: { id: sourceId } });
    await prisma.bookingLine.create({
      data: {
        bookingId,
        lineType: kind,
        sourceCatalogId: sourceId,
        snapshotName: p.name,
        snapshotDescription: p.description,
        quantity: requestedQuantity,
        unitPriceCents: p.defaultRentalCents,
        taxable: p.isTaxable,
        replacementCostCentsSnapshot: p.replacementCostCents,
        lineSubtotalCents: requestedQuantity * p.defaultRentalCents,
        displayOrder,
      },
    });
  }
  if (kind === "SERVICE") {
    const s = await prisma.service.findUniqueOrThrow({ where: { id: sourceId } });
    await prisma.bookingLine.create({
      data: {
        bookingId,
        lineType: kind,
        sourceCatalogId: sourceId,
        snapshotName: s.name,
        snapshotDescription: s.description,
        quantity: 1,
        unitPriceCents: s.defaultPriceCents,
        taxable: s.isTaxable,
        lineSubtotalCents: s.defaultPriceCents,
        displayOrder,
      },
    });
  }
  if (kind === "BUNDLE") {
    const b = await prisma.bundle.findUniqueOrThrow({
      where: { id: sourceId },
      include: { components: { include: { product: true }, orderBy: { displayOrder: "asc" } } },
    });
    await prisma.bookingLine.create({
      data: {
        bookingId,
        lineType: kind,
        sourceCatalogId: sourceId,
        snapshotName: b.name,
        snapshotDescription: b.description,
        quantity: 1,
        unitPriceCents: b.fixedRentalCents,
        taxable: b.isTaxable,
        lineSubtotalCents: b.fixedRentalCents,
        displayOrder,
        bundleComponentSnapshots: {
          create: b.components.map((c) => ({
            sourceProductId: c.productId,
            productNameSnapshot: c.product.name,
            quantityPerBundle: c.quantity,
            replacementCostCentsSnapshot: c.product.replacementCostCents,
            displayOrder: c.displayOrder,
          })),
        },
      },
    });
  }
  await recalculateBooking(bookingId);
  await markContractsForResignature(bookingId);
  await addBookingActivity(bookingId, user.id, "LINE_ADDED", `${kind.toLowerCase()} line added`);
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}

export async function saveBookingLineQuantities(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const { user } = await requireBookingAccess(bookingId);
  const productLines = await prisma.bookingLine.findMany({
    where: { bookingId, lineType: "PRODUCT" },
    select: { id: true, quantity: true, unitPriceCents: true, priceOverrideCents: true },
  });
  const updates = productLines.flatMap((line) => {
    const rawQuantity = formData.get(`quantity:${line.id}`);
    if (rawQuantity === null) return [];
    const quantity = z.coerce.number().int().min(1).max(10_000).parse(rawQuantity);
    if (quantity === line.quantity) return [];
    const priceCents = line.priceOverrideCents ?? line.unitPriceCents;
    return [
      prisma.bookingLine.update({
        where: { id: line.id },
        data: {
          quantity,
          lineSubtotalCents: quantity * priceCents,
        },
      }),
    ];
  });
  if (updates.length) {
    await prisma.$transaction(updates);
    await recalculateBooking(bookingId);
    await markContractsForResignature(bookingId);
    await addBookingActivity(bookingId, user.id, "LINE_UPDATED", "Product quantities updated");
  }
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}

export async function updateBookingLinePrice(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const { user } = await requireBookingAccess(bookingId);
  const id = z.string().cuid().parse(formData.get("id"));
  const priceOverrideCents = z.coerce
    .number()
    .int()
    .min(0)
    .max(100_000_000)
    .parse(dollarsToCents(formData.get("rentalPriceDollars")));
  const line = await prisma.bookingLine.findFirst({
    where: { id, bookingId },
    select: { quantity: true },
  });
  if (!line) return;
  await prisma.bookingLine.update({
    where: { id },
    data: { priceOverrideCents, lineSubtotalCents: line.quantity * priceOverrideCents },
  });
  await recalculateBooking(bookingId);
  await markContractsForResignature(bookingId);
  await addBookingActivity(bookingId, user.id, "LINE_UPDATED", "Booking line price updated");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}
export async function updateBookingLine(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const { user } = await requireBookingAccess(bookingId);
  const id = z.string().cuid().parse(formData.get("id"));
  const quantity = z.coerce.number().int().min(1).parse(formData.get("quantity"));
  const unitPriceCents = z.coerce.number().int().min(0).parse(formData.get("unitPriceCents"));
  await prisma.bookingLine.update({
    where: { id },
    data: {
      quantity,
      priceOverrideCents: unitPriceCents,
      lineSubtotalCents: quantity * unitPriceCents,
    },
  });
  await recalculateBooking(bookingId);
  await markContractsForResignature(bookingId);
  await addBookingActivity(bookingId, user.id, "LINE_UPDATED", "Booking line updated");
  revalidatePath(`/bookings/${bookingId}`);
}

export async function revertBookingToContractValues(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const { user } = await requireBookingAccess(bookingId);
  const contractId = z.string().cuid().parse(formData.get("contractId"));
  const contract = await prisma.generatedContract.findFirst({
    where: { id: contractId, bookingId },
    include: { signature: true },
  });
  if (!contract) redirect(`/bookings/${bookingId}?error=contract`);

  const snapshot = parseContractSnapshot(contract.pricingSnapshotJson);
  const lines = await prisma.bookingLine.findMany({
    where: { bookingId },
    orderBy: { displayOrder: "asc" },
    select: { id: true, lineType: true, snapshotName: true, quantity: true },
  });
  const hasMatchingItems =
    lines.length === snapshot.lines.length &&
    lines.every(
      (line, index) =>
        line.lineType === snapshot.lines[index]?.type &&
        line.snapshotName === snapshot.lines[index]?.name,
    );
  if (!hasMatchingItems) redirect(`/bookings/${bookingId}?error=contract-items`);

  await prisma.$transaction([
    ...lines.map((line, index) => {
      const snapshotLine = snapshot.lines[index];
      const quantity = line.lineType === "PRODUCT" ? snapshotLine.quantity : line.quantity;
      return prisma.bookingLine.update({
        where: { id: line.id },
        data: {
          quantity,
          priceOverrideCents: snapshotLine.unitPriceCents,
          lineSubtotalCents: quantity * snapshotLine.unitPriceCents,
        },
      });
    }),
    ...(snapshot.pricingSettings
      ? [
          prisma.booking.update({
            where: { id: bookingId },
            data: snapshot.pricingSettings,
          }),
        ]
      : []),
  ]);
  await recalculateBooking(bookingId);
  await markContractsForResignature(bookingId);
  await prisma.generatedContract.update({
    where: { id: contractId },
    data: {
      requiresResignature: false,
      status: contract.signature ? "SIGNED" : "AWAITING_SIGNATURE",
    },
  });
  await addBookingActivity(
    bookingId,
    user.id,
    "LINE_UPDATED",
    `Booking values restored from contract version ${contract.version}`,
  );
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/contracts");
}
export async function removeBookingLine(formData: FormData) {
  const id = z.string().cuid().parse(formData.get("id"));
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const { user } = await requireBookingAccess(bookingId);
  const removed = await prisma.$transaction(async (tx) => {
    const line = await tx.bookingLine.findFirst({
      where: { id, bookingId },
      select: { id: true },
    });
    if (!line) return false;

    await tx.bookingBundleComponentSnapshot.deleteMany({ where: { bookingLineId: id } });
    await tx.bookingLine.delete({ where: { id } });

    const remainingLines = await tx.bookingLine.findMany({
      where: { bookingId },
      orderBy: { displayOrder: "asc" },
      select: { id: true },
    });
    for (const [displayOrder, remainingLine] of remainingLines.entries()) {
      await tx.bookingLine.update({ where: { id: remainingLine.id }, data: { displayOrder } });
    }
    return true;
  });
  if (!removed) {
    revalidatePath(`/bookings/${bookingId}`);
    return;
  }
  await recalculateBooking(bookingId);
  await markContractsForResignature(bookingId);
  await addBookingActivity(bookingId, user.id, "LINE_REMOVED", "Booking line removed");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}
export async function updateBookingStatus(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const { user } = await requireBookingAccess(bookingId);
  const bookingStatusId = z.string().cuid().parse(formData.get("bookingStatusId"));
  await prisma.booking.update({ where: { id: bookingId }, data: { bookingStatusId } });
  await addBookingActivity(bookingId, user.id, "STATUS_CHANGED", "Booking status changed");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}

export async function updateBookingPricing(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const { user } = await requireBookingAccess(bookingId);
  const discountType = z
    .enum(["FIXED", "PERCENT"])
    .optional()
    .parse(formData.get("discountType") || undefined);
  const discountValue = z.coerce
    .number()
    .int()
    .min(0)
    .max(discountType === "PERCENT" ? 10_000 : 100_000_000)
    .parse(formData.get("discountValue"));
  const taxRateBasisPoints = z.coerce
    .number()
    .int()
    .min(0)
    .max(10_000)
    .parse(formData.get("taxRateBasisPoints"));
  const securityDepositMode = z
    .enum(["AUTO", "OVERRIDE"])
    .parse(formData.get("securityDepositMode"));
  const securityDepositOverrideCents =
    securityDepositMode === "OVERRIDE"
      ? z.coerce
          .number()
          .int()
          .min(0)
          .max(100_000_000)
          .parse(dollarsToCents(formData.get("securityDepositOverrideDollars")))
      : null;
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      discountType: discountType || null,
      discountValue,
      taxRateBasisPoints,
      securityDepositOverrideCents,
    },
  });
  await recalculateBooking(bookingId);
  await markContractsForResignature(bookingId);
  await addBookingActivity(bookingId, user.id, "PRICING_UPDATED", "Booking pricing updated");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}

export async function assignBookingOwner(formData: FormData) {
  const admin = await requireTeamAdmin();
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const ownerUserId = z.string().cuid().parse(formData.get("ownerUserId"));
  const membership = await prisma.teamMembership.findFirst({
    where: { userId: ownerUserId, teamId: admin.membership.teamId },
    select: { userId: true },
  });
  if (!membership) return;
  await prisma.booking.updateMany({
    where: { id: bookingId, teamId: admin.membership.teamId },
    data: { ownerUserId },
  });
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}

export async function addBookingMember(formData: FormData) {
  const admin = await requireTeamAdmin();
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const userId = z.string().cuid().parse(formData.get("userId"));
  const [booking, membership] = await Promise.all([
    prisma.booking.findFirst({
      where: { id: bookingId, teamId: admin.membership.teamId },
      select: { id: true },
    }),
    prisma.teamMembership.findFirst({
      where: { userId, teamId: admin.membership.teamId },
      select: { userId: true },
    }),
  ]);
  if (!booking || !membership) return;
  await prisma.bookingMember.upsert({
    where: { bookingId_userId: { bookingId, userId } },
    update: {},
    create: { bookingId, userId },
  });
  revalidatePath(`/bookings/${bookingId}`);
}

export async function removeBookingMember(formData: FormData) {
  const admin = await requireTeamAdmin();
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const userId = z.string().cuid().parse(formData.get("userId"));
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, teamId: admin.membership.teamId },
    select: { id: true },
  });
  if (!booking) return;
  await prisma.bookingMember.deleteMany({ where: { bookingId, userId } });
  revalidatePath(`/bookings/${bookingId}`);
}
