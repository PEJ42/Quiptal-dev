"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { productSchema } from "@/lib/catalog-schema";
import { prisma } from "@/lib/prisma";
import { saveCatalogImage } from "@/lib/upload-storage";

function productInput(formData: FormData) {
  return productSchema.safeParse({
    ...Object.fromEntries(formData),
    isTaxable: formData.get("isTaxable") === "on",
    replacementCostCents: formData.get("replacementCostCents") || undefined,
  });
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const parsed = productInput(formData);
  if (!parsed.success) redirect("/products/new?error=invalid");
  let imageReference: string | null = null;
  try {
    imageReference = await saveCatalogImage(formData.get("image") as File | null);
  } catch {
    redirect("/products/new?error=image");
  }
  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      replacementCostCents: parsed.data.replacementCostCents ?? null,
      imageReference,
    },
  });
  redirect(`/products/${product.id}`);
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const parsed = productInput(formData);
  if (!parsed.success) redirect(`/products/${id}?error=invalid`);
  let imageReference: string | undefined;
  try {
    imageReference = (await saveCatalogImage(formData.get("image") as File | null)) ?? undefined;
  } catch {
    redirect(`/products/${id}?error=image`);
  }
  await prisma.product.update({
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      replacementCostCents: parsed.data.replacementCostCents ?? null,
      ...(imageReference ? { imageReference } : {}),
    },
    where: { id },
  });
  revalidatePath("/products");
  revalidatePath("/catalog");
  revalidatePath(`/products/${id}`);
}

export async function toggleProduct(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const archive = formData.get("archive") === "true";
  await prisma.product.update({ where: { id }, data: { archivedAt: archive ? new Date() : null } });
  revalidatePath("/products");
  revalidatePath("/catalog");
  revalidatePath(`/products/${id}`);
}
