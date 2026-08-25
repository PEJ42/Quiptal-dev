"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveCompanyLogo } from "@/lib/upload-storage";

const companySchema = z.object({
  name: z.string().trim().max(120).optional(),
  addressLine1: z.string().trim().max(120).optional(),
  addressLine2: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(24).optional(),
  country: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(32).optional(),
  email: z.union([z.literal(""), z.string().trim().pipe(z.email())]),
  website: z.union([z.literal(""), z.string().trim().url()]),
  timezone: z.string().trim().min(1).max(64),
  defaultTaxRateBasisPoints: z.coerce.number().int().min(0).max(10000),
});

const itemSchema = z.object({ name: z.string().trim().min(1).max(100) });
const serviceSchema = itemSchema.extend({
  description: z.string().trim().max(500).optional(),
  defaultPriceCents: z.coerce.number().int().min(0).max(10_000_000),
  isTaxable: z.boolean(),
});

export async function saveCompanySettings(formData: FormData) {
  await requireAdmin();
  const websiteValue = String(formData.get("website") ?? "").trim();
  const website =
    websiteValue && !/^https?:\/\//i.test(websiteValue) ? `https://${websiteValue}` : websiteValue;
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    region: formData.get("region"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    website,
    timezone: formData.get("timezone"),
    defaultTaxRateBasisPoints: formData.get("defaultTaxRateBasisPoints"),
  });
  if (!parsed.success) redirect("/settings?error=company");
  const data = parsed.data;
  const logo = formData.get("logo");
  let logoReference: string | null;
  try {
    logoReference = await saveCompanyLogo(logo instanceof File ? logo : null);
  } catch {
    redirect("/settings?error=logo");
  }
  await prisma.companySettings.upsert({
    where: { id: "default" },
    update: { ...data, ...(logoReference ? { logoReference } : {}) },
    create: { id: "default", ...data, ...(logoReference ? { logoReference } : {}) },
  });
  revalidatePath("/settings");
}

export async function updateCategory(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const name = z.string().trim().min(1).max(100).parse(formData.get("name"));
  try {
    await prisma.productCategory.update({ where: { id }, data: { name } });
  } catch {
    redirect("/settings?error=category");
  }
  revalidatePath("/settings");
}

export async function createSettingItem(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind"));
  const parsed =
    kind === "service"
      ? serviceSchema.safeParse({
          ...Object.fromEntries(formData),
          isTaxable: formData.get("isTaxable") === "on",
        })
      : itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  if (kind === "category")
    await prisma.productCategory
      .create({ data: { name: parsed.data.name, sortOrder: await prisma.productCategory.count() } })
      .catch(() => undefined);
  if (kind === "bookingType")
    await prisma.bookingType
      .create({ data: { name: parsed.data.name, sortOrder: await prisma.bookingType.count() } })
      .catch(() => undefined);
  if (kind === "bookingStatus")
    await prisma.bookingStatus
      .create({ data: { name: parsed.data.name, sortOrder: await prisma.bookingStatus.count() } })
      .catch(() => undefined);
  if (kind === "service") {
    const service = parsed.data as z.infer<typeof serviceSchema>;
    await prisma.service
      .create({
        data: {
          name: service.name,
          description: service.description || null,
          defaultPriceCents: service.defaultPriceCents,
          isTaxable: service.isTaxable,
          sortOrder: await prisma.service.count(),
        },
      })
      .catch(() => undefined);
  }
  revalidatePath("/settings");
}

export async function toggleSettingItem(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const kind = z
    .enum(["category", "bookingType", "bookingStatus", "service"])
    .parse(formData.get("kind"));
  const isActive = formData.get("isActive") === "true";
  if (kind === "category")
    await prisma.productCategory.update({ where: { id }, data: { isActive } });
  if (kind === "bookingType")
    await prisma.bookingType.update({ where: { id }, data: { isActive } });
  if (kind === "bookingStatus")
    await prisma.bookingStatus.update({ where: { id }, data: { isActive } });
  if (kind === "service") await prisma.service.update({ where: { id }, data: { isActive } });
  revalidatePath("/settings");
}
