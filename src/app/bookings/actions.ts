"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addBookingActivity, recalculateBooking } from "@/lib/booking-service";
import { bookingDate, bookingSchema } from "@/lib/booking-schema";
import { requireAdmin } from "@/lib/auth";
import { dollarsToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";

function bookingNumber() {
  return `B-${new Date().getUTCFullYear()}-${String(Date.now()).slice(-6)}`;
}
export async function createBooking(formData: FormData) {
  const user = await requireAdmin();
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
  const user = await requireAdmin();
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
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
  await addBookingActivity(bookingId, user.id, "LINE_ADDED", `${kind.toLowerCase()} line added`);
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}

export async function saveBookingLineQuantities(formData: FormData) {
  const user = await requireAdmin();
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const productLines = await prisma.bookingLine.findMany({
    where: { bookingId, lineType: "PRODUCT" },
    select: { id: true, quantity: true, unitPriceCents: true },
  });
  const updates = productLines.flatMap((line) => {
    const rawQuantity = formData.get(`quantity:${line.id}`);
    if (rawQuantity === null) return [];
    const quantity = z.coerce.number().int().min(1).max(10_000).parse(rawQuantity);
    if (quantity === line.quantity) return [];
    return [
      prisma.bookingLine.update({
        where: { id: line.id },
        data: { quantity, lineSubtotalCents: quantity * line.unitPriceCents },
      }),
    ];
  });
  if (updates.length) {
    await prisma.$transaction(updates);
    await recalculateBooking(bookingId);
    await addBookingActivity(bookingId, user.id, "LINE_UPDATED", "Product quantities updated");
  }
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}
export async function updateBookingLine(formData: FormData) {
  const user = await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const quantity = z.coerce.number().int().min(1).parse(formData.get("quantity"));
  const unitPriceCents = z.coerce.number().int().min(0).parse(formData.get("unitPriceCents"));
  await prisma.bookingLine.update({
    where: { id },
    data: { quantity, unitPriceCents, lineSubtotalCents: quantity * unitPriceCents },
  });
  await recalculateBooking(bookingId);
  await addBookingActivity(bookingId, user.id, "LINE_UPDATED", "Booking line updated");
  revalidatePath(`/bookings/${bookingId}`);
}
export async function removeBookingLine(formData: FormData) {
  const user = await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
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
  await addBookingActivity(bookingId, user.id, "LINE_REMOVED", "Booking line removed");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}
export async function updateBookingStatus(formData: FormData) {
  const user = await requireAdmin();
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const bookingStatusId = z.string().cuid().parse(formData.get("bookingStatusId"));
  await prisma.booking.update({ where: { id: bookingId }, data: { bookingStatusId } });
  await addBookingActivity(bookingId, user.id, "STATUS_CHANGED", "Booking status changed");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}

export async function updateBookingPricing(formData: FormData) {
  const user = await requireAdmin();
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
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
  await addBookingActivity(bookingId, user.id, "PRICING_UPDATED", "Booking pricing updated");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}
