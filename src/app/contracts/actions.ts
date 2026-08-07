"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addBookingActivity } from "@/lib/booking-service";
import { renderContractPdf, storeContract } from "@/lib/contracts";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const address = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(", ");

export async function generateContract(formData: FormData) {
  const user = await requireAdmin();
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const [booking, settings, template] = await Promise.all([
    prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        bookingType: true,
        lines: { include: { bundleComponentSnapshots: true }, orderBy: { displayOrder: "asc" } },
      },
    }),
    prisma.companySettings.findUnique({ where: { id: "default" } }),
    prisma.contractTemplate.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } }),
  ]);
  if (!booking || !template) redirect(`/bookings/${bookingId}?error=contract`);
  const version = (await prisma.generatedContract.count({ where: { bookingId } })) + 1;
  const bytes = await renderContractPdf({
    company: {
      name: settings?.name || "Rental Business",
      address: address(
        settings?.addressLine1,
        settings?.addressLine2,
        settings?.city,
        settings?.region,
        settings?.postalCode,
        settings?.country,
      ),
      phone: settings?.phone,
      email: settings?.email,
    },
    booking: {
      number: booking.bookingNumber,
      title: booking.title,
      type: booking.bookingType.name,
      startDate: booking.startDate.toISOString().slice(0, 10),
      endDate: booking.endDate.toISOString().slice(0, 10),
      customerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      customerEmail: booking.customer.email,
      customerPhone: booking.customer.phone,
      billingAddress: address(
        booking.billingAddressLine1Snapshot,
        booking.billingAddressLine2Snapshot,
        booking.billingCitySnapshot,
        booking.billingRegionSnapshot,
        booking.billingPostalCodeSnapshot,
        booking.billingCountrySnapshot,
      ),
      eventAddress: address(
        booking.eventAddressLine1,
        booking.eventAddressLine2,
        booking.eventCity,
        booking.eventRegion,
        booking.eventPostalCode,
        booking.eventCountry,
      ),
      createdAt: new Date().toISOString().slice(0, 10),
    },
    lines: booking.lines.map((line) => ({
      name: line.snapshotName,
      type: line.lineType,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      subtotalCents: line.lineSubtotalCents,
      components: line.bundleComponentSnapshots.map(
        (component) => `${component.productNameSnapshot} × ${component.quantityPerBundle}`,
      ),
    })),
    totals: {
      subtotalCents: booking.subtotalCents,
      discountCents: booking.discountCents,
      taxCents: booking.taxCents,
      totalCents: booking.totalCents,
      securityDepositCents: booking.securityDepositCents,
    },
    title: template.title,
    legalTerms: template.legalTerms,
    footerText: template.footerText,
  });
  const fileReference = await storeContract(bytes);
  await prisma.generatedContract.create({
    data: {
      bookingId,
      generatedByUserId: user.id,
      templateId: template.id,
      version,
      templateTitleSnapshot: template.title,
      legalTermsSnapshot: template.legalTerms,
      footerTextSnapshot: template.footerText,
      fileReference,
    },
  });
  await addBookingActivity(
    bookingId,
    user.id,
    "CONTRACT_GENERATED",
    `Contract version ${version} generated`,
  );
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/contracts");
}

export async function saveContractTemplate(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const title = z.string().trim().min(1).max(160).parse(formData.get("title"));
  const legalTerms = z.string().trim().min(1).max(20_000).parse(formData.get("legalTerms"));
  const footerText = z
    .string()
    .trim()
    .max(500)
    .parse(formData.get("footerText") || "");
  const template = await prisma.contractTemplate.findUniqueOrThrow({ where: { id } });
  await prisma.contractTemplate.update({
    where: { id },
    data: { title, legalTerms, footerText: footerText || null, version: template.version + 1 },
  });
  revalidatePath("/contracts");
}
