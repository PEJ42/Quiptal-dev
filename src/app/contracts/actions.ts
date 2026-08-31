"use server";

import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addBookingActivity } from "@/lib/booking-service";
import { contractSnapshotPdfModel, renderContractPdf, storeContract } from "@/lib/contracts";
import { requireAdmin, requireBookingAccess } from "@/lib/auth";
import { companyLogosDirectory } from "@/lib/app-storage";
import { contractTermsPlainText, sanitizeContractTerms } from "@/lib/contract-terms";
import { hashContractSnapshot, type ContractSnapshot } from "@/lib/contract-snapshot";
import { prisma } from "@/lib/prisma";

const address = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(", ");

async function companyLogo(reference: string | null | undefined) {
  if (!reference || !/^[a-f0-9-]{36}\.(jpg|png)$/.test(reference)) return null;
  try {
    return {
      bytes: new Uint8Array(await readFile(`${companyLogosDirectory}/${reference}`)),
      format: reference.endsWith(".png") ? ("png" as const) : ("jpg" as const),
    };
  } catch {
    return null;
  }
}

export async function generateContract(formData: FormData) {
  const bookingId = z.string().cuid().parse(formData.get("bookingId"));
  const { user } = await requireBookingAccess(bookingId);
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
  const logo = await companyLogo(settings?.logoReference);
  const lines = booking.lines.map((line) => {
    const componentReplacementValue = line.bundleComponentSnapshots.reduce(
      (total, component) =>
        total + component.quantityPerBundle * (component.replacementCostCentsSnapshot ?? 0),
      0,
    );
    const replacementValueCents =
      line.quantity *
      (line.bundleComponentSnapshots.length
        ? componentReplacementValue
        : (line.replacementCostCentsSnapshot ?? 0));
    return {
      name: line.snapshotName,
      type: line.lineType,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      subtotalCents: line.lineSubtotalCents,
      replacementValueCents,
      components: line.bundleComponentSnapshots.map((component) => ({
        name: component.productNameSnapshot,
        quantity: component.quantityPerBundle,
        replacementValueCents: component.replacementCostCentsSnapshot ?? 0,
      })),
    };
  });
  const snapshot: ContractSnapshot = {
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
    lines,
    totals: {
      subtotalCents: booking.subtotalCents,
      serviceChargeCents: lines
        .filter((line) => line.type === "SERVICE")
        .reduce((total, line) => total + line.subtotalCents, 0),
      discountCents: booking.discountCents,
      taxCents: booking.taxCents,
      totalCents: booking.totalCents,
      rentalTotalCents: booking.totalCents - booking.securityDepositCents,
      securityDepositCents: booking.securityDepositCents,
      replacementValueCents: lines.reduce((total, line) => total + line.replacementValueCents, 0),
    },
    pricingSettings: {
      discountType: booking.discountType,
      discountValue: booking.discountValue,
      taxRateBasisPoints: booking.taxRateBasisPoints,
      securityDepositOverrideCents: booking.securityDepositOverrideCents,
    },
    title: template.title,
    legalTerms: template.legalTerms,
    footerText: template.footerText,
  };
  const bytes = await renderContractPdf(contractSnapshotPdfModel(snapshot, logo));
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
      pricingSnapshotJson: JSON.stringify(snapshot),
      contentHash: hashContractSnapshot(snapshot),
      status: "AWAITING_SIGNATURE",
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
  const legalTerms = sanitizeContractTerms(
    z.string().max(20_000).parse(formData.get("legalTerms")),
  );
  z.string().trim().min(1).max(20_000).parse(contractTermsPlainText(legalTerms));
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
