"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addBookingActivity, recalculateBooking } from "@/lib/booking-service";
import { bookingDate, bookingSchema } from "@/lib/booking-schema";
import {
  normalizeEmail,
  requireBookingAccess,
  requireTeamAdmin,
  requireWorkspaceUser,
} from "@/lib/auth";
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
  const latestContract = await prisma.generatedContract.findFirst({
    where: { bookingId },
    orderBy: { version: "desc" },
    select: { id: true },
  });
  if (latestContract?.id === contractId) {
    await prisma.generatedContract.update({
      where: { id: contractId },
      data: { requiresResignature: false },
    });
  }
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

export async function updateBookingDetails(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const { user } = await requireBookingAccess(bookingId);
  const details = z
    .object({
      eventAddressLine1: z.string().trim().max(120),
      eventAddressLine2: z.string().trim().max(120),
      eventCity: z.string().trim().max(80),
      eventRegion: z.string().trim().max(80),
      eventPostalCode: z.string().trim().max(24),
      eventCountry: z.string().trim().max(80),
      notes: z.string().trim().max(5_000),
    })
    .parse({
      eventAddressLine1: formData.get("eventAddressLine1") || "",
      eventAddressLine2: formData.get("eventAddressLine2") || "",
      eventCity: formData.get("eventCity") || "",
      eventRegion: formData.get("eventRegion") || "",
      eventPostalCode: formData.get("eventPostalCode") || "",
      eventCountry: formData.get("eventCountry") || "",
      notes: formData.get("notes") || "",
    });
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      eventAddressLine1: details.eventAddressLine1 || null,
      eventAddressLine2: details.eventAddressLine2 || null,
      eventCity: details.eventCity || null,
      eventRegion: details.eventRegion || null,
      eventPostalCode: details.eventPostalCode || null,
      eventCountry: details.eventCountry || null,
      notes: details.notes || null,
    },
  });
  await addBookingActivity(bookingId, user.id, "DETAILS_UPDATED", "Booking details updated");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  redirect(`/bookings/${bookingId}`);
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

async function requireBookingAccessManager(bookingId: string) {
  const { user, booking } = await requireBookingAccess(bookingId);
  const canManage =
    user.membership.role === "ADMIN" ||
    booking.createdByUserId === user.id ||
    booking.ownerUserId === user.id;
  if (!canManage || booking.teamId !== user.membership.teamId) redirect(`/bookings/${bookingId}`);
  return { user, booking };
}

export async function addBookingMember(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const userId = z.string().cuid().parse(formData.get("userId"));
  const { booking: accessBooking } = await requireBookingAccessManager(bookingId);
  const [booking, membership] = await Promise.all([
    prisma.booking.findFirst({
      where: { id: bookingId, teamId: accessBooking.teamId },
      select: { id: true },
    }),
    prisma.teamMembership.findFirst({
      where: { userId, teamId: accessBooking.teamId! },
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

export type BookingOwnerActionState = { error?: string; message?: string };

export async function addBookingOwnerAction(
  _state: BookingOwnerActionState,
  formData: FormData,
): Promise<BookingOwnerActionState> {
  const bookingId = z.string().cuid().safeParse(formData.get("bookingId"));
  if (!bookingId.success) return { error: "This booking is not available." };
  const { booking } = await requireBookingAccessManager(bookingId.data);
  const userId = z.string().cuid().safeParse(formData.get("userId"));
  const pendingEmail = String(formData.get("pendingEmail") || "").trim();

  if (userId.success) {
    if (booking.ownerUserId === userId.data)
      return { error: "This person is already the primary owner." };
    const membership = await prisma.teamMembership.findFirst({
      where: { userId: userId.data, teamId: booking.teamId! },
      select: { user: { select: { email: true } } },
    });
    if (!membership) return { error: "Choose a member of this workspace." };
    await prisma.bookingMember.upsert({
      where: { bookingId_userId: { bookingId: bookingId.data, userId: userId.data } },
      update: {},
      create: { bookingId: bookingId.data, userId: userId.data },
    });
    revalidatePath(`/bookings/${bookingId.data}`);
    return { message: `${membership.user.email} can now access this booking.` };
  }

  const email = z.string().trim().pipe(z.email()).safeParse(pendingEmail);
  if (!email.success) return { error: "Choose a team member or enter a valid email address." };
  await prisma.pendingBookingUserEmail.upsert({
    where: {
      bookingId_normalizedEmail: {
        bookingId: bookingId.data,
        normalizedEmail: normalizeEmail(email.data),
      },
    },
    update: {},
    create: { bookingId: bookingId.data, normalizedEmail: normalizeEmail(email.data) },
  });
  revalidatePath(`/bookings/${bookingId.data}`);
  return {
    message: `${email.data} will gain access after creating an account or signing in with that email.`,
  };
}

export async function promoteBookingOwner(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const userId = z.string().cuid().parse(formData.get("userId"));
  const { booking, user } = await requireBookingAccessManager(bookingId);
  const additionalOwner = await prisma.bookingMember.findFirst({
    where: { bookingId, userId },
    select: { id: true },
  });
  if (!additionalOwner) return;
  const previousOwnerId = booking.ownerUserId;
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { ownerUserId: userId } });
    if (previousOwnerId && previousOwnerId !== userId) {
      await tx.bookingMember.upsert({
        where: { bookingId_userId: { bookingId, userId: previousOwnerId } },
        update: {},
        create: { bookingId, userId: previousOwnerId },
      });
    }
    await tx.bookingMember.deleteMany({ where: { bookingId, userId } });
  });
  await addBookingActivity(bookingId, user.id, "OWNER_PROMOTED", "Booking primary owner updated");
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
}

export async function removeBookingMember(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const userId = z.string().cuid().parse(formData.get("userId"));
  await requireBookingAccessManager(bookingId);
  await prisma.bookingMember.deleteMany({ where: { bookingId, userId } });
  revalidatePath(`/bookings/${bookingId}`);
}
