"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { bundleComponentSchema, bundleSchema } from "@/lib/catalog-schema";
import { dollarsToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { saveCatalogImage } from "@/lib/upload-storage";

function bundleInput(formData: FormData) {
  return bundleSchema.safeParse({
    ...Object.fromEntries(formData),
    fixedRentalCents: dollarsToCents(formData.get("fixedRentalDollars")),
    isTaxable: formData.get("isTaxable") === "on",
  });
}

export async function createBundle(formData: FormData) {
  await requireAdmin();
  const parsed = bundleInput(formData);
  const component = bundleComponentSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success || !component.success) redirect("/bundles/new?error=invalid");
  let imageReference: string | null = null;
  try {
    imageReference = await saveCatalogImage(formData.get("image") as File | null);
  } catch {
    redirect("/bundles/new?error=image");
  }
  const bundle = await prisma.bundle.create({
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      imageReference,
      components: { create: { ...component.data, displayOrder: 0 } },
    },
  });
  redirect(`/bundles/${bundle.id}`);
}

export async function updateBundle(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const parsed = bundleInput(formData);
  if (!parsed.success) redirect(`/bundles/${id}?error=invalid`);
  let imageReference: string | undefined;
  try {
    imageReference = (await saveCatalogImage(formData.get("image") as File | null)) ?? undefined;
  } catch {
    redirect(`/bundles/${id}?error=image`);
  }
  await prisma.bundle.update({
    where: { id },
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      ...(imageReference ? { imageReference } : {}),
    },
  });
  redirect("/catalog?view=bundles");
}
export async function addBundleComponent(formData: FormData) {
  await requireAdmin();
  const bundleId = z.string().cuid().parse(formData.get("bundleId"));
  const parsed = bundleComponentSchema.parse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  });
  const displayOrder = await prisma.bundleComponent.count({ where: { bundleId } });
  await prisma.bundleComponent.create({ data: { bundleId, ...parsed, displayOrder } });
  revalidatePath(`/bundles/${bundleId}`);
}
export async function updateBundleComponent(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const bundleId = z.string().cuid().parse(formData.get("bundleId"));
  const quantity = z.coerce.number().int().min(1).max(10_000).parse(formData.get("quantity"));
  await prisma.bundleComponent.update({ where: { id }, data: { quantity } });
  revalidatePath(`/bundles/${bundleId}`);
}
export async function removeBundleComponent(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const bundleId = z.string().cuid().parse(formData.get("bundleId"));
  const count = await prisma.bundleComponent.count({ where: { bundleId } });
  if (count > 1) await prisma.bundleComponent.delete({ where: { id } });
  revalidatePath(`/bundles/${bundleId}`);
}
export async function moveBundleComponent(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const bundleId = z.string().cuid().parse(formData.get("bundleId"));
  const direction = z.enum(["up", "down"]).parse(formData.get("direction"));
  const components = await prisma.bundleComponent.findMany({
    where: { bundleId },
    orderBy: { displayOrder: "asc" },
  });
  const index = components.findIndex((component) => component.id === id);
  const current = components[index];
  const other = components[index + (direction === "up" ? -1 : 1)];
  if (!current || !other) return;
  await prisma.$transaction(async (transaction) => {
    await transaction.bundleComponent.update({ where: { id }, data: { displayOrder: -1 } });
    await transaction.bundleComponent.update({
      where: { id: other.id },
      data: { displayOrder: current.displayOrder },
    });
    await transaction.bundleComponent.update({
      where: { id },
      data: { displayOrder: other.displayOrder },
    });
  });
  revalidatePath(`/bundles/${bundleId}`);
}
export async function toggleBundle(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  await prisma.bundle.update({
    where: { id },
    data: { archivedAt: formData.get("archive") === "true" ? new Date() : null },
  });
  revalidatePath("/bundles");
  revalidatePath("/catalog");
  revalidatePath(`/bundles/${id}`);
}
