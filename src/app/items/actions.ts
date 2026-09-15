"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { dollarsToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { saveItemDocument } from "@/lib/upload-storage";

const itemTypes = ["INDIVIDUAL", "LOT"] as const;
const conditions = ["NEW", "LIKE_NEW", "EXCELLENT", "GOOD", "FAIR", "POOR"] as const;

function optionalText(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function optionalCents(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  const cents = dollarsToCents(text);
  if (typeof cents !== "number") throw new Error("Enter a valid dollar amount.");
  return cents;
}

function itemInput(formData: FormData) {
  const itemType = z.enum(itemTypes).parse(formData.get("itemType"));
  const originalQuantity =
    itemType === "LOT" ? z.coerce.number().int().min(1).parse(formData.get("originalQuantity")) : 1;
  const businessUsePercent = z.coerce
    .number()
    .int()
    .min(0)
    .max(100)
    .parse(formData.get("businessUsePercent") || 100);
  const purchaseCondition = optionalText(formData.get("purchaseCondition"));
  const currentCondition = optionalText(formData.get("currentCondition"));
  if (purchaseCondition) z.enum(conditions).parse(purchaseCondition);
  if (currentCondition) z.enum(conditions).parse(currentCondition);
  return {
    name: z.string().trim().min(1).max(180).parse(formData.get("name")),
    itemType,
    originalQuantity,
    currentQuantity: originalQuantity,
    productId: optionalText(formData.get("productId")),
    category: optionalText(formData.get("category")),
    manufacturer: optionalText(formData.get("manufacturer")),
    model: optionalText(formData.get("model")),
    serialNumber: optionalText(formData.get("serialNumber")),
    assetNumber: optionalText(formData.get("assetNumber")),
    notes: optionalText(formData.get("notes")),
    ownerId: z.string().cuid().parse(formData.get("ownerId")),
    purchaseDate: optionalText(formData.get("purchaseDate"))
      ? new Date(z.string().parse(formData.get("purchaseDate")))
      : null,
    purchasePriceCents: optionalCents(formData.get("purchasePriceDollars")),
    vendor: optionalText(formData.get("vendor")),
    purchaseSource: optionalText(formData.get("purchaseSource")),
    purchaseCondition,
    currentCondition: currentCondition ?? purchaseCondition,
    shippingCostCents: optionalCents(formData.get("shippingDollars")) ?? 0,
    salesTaxCents: optionalCents(formData.get("salesTaxDollars")) ?? 0,
    otherFeesCents: optionalCents(formData.get("otherFeesDollars")) ?? 0,
    totalAcquisitionOverrideCents: optionalCents(formData.get("totalAcquisitionOverrideDollars")),
    businessUsePercent,
    accountingCategory: optionalText(formData.get("accountingCategory")),
    purchaseNotes: optionalText(formData.get("purchaseNotes")),
    replacementValueCents: optionalCents(formData.get("replacementValueDollars")),
  };
}

async function ensureOwnerInTeam(ownerId: string, teamId: string) {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: ownerId, teamId } },
    select: { id: true },
  });
  if (!membership) throw new Error("Choose an owner in your team.");
}

export async function createItem(formData: FormData) {
  const user = await requireAdmin();
  const input = itemInput(formData);
  await ensureOwnerInTeam(input.ownerId, user.membership.teamId);
  const item = await prisma.item.create({ data: { ...input, teamId: user.membership.teamId } });
  const files = formData
    .getAll("documents")
    .filter((value): value is File => value instanceof File);
  for (const file of files) {
    const upload = await saveItemDocument(file);
    if (upload) {
      await prisma.itemDocument.create({
        data: {
          itemId: item.id,
          fileReference: upload.filename,
          mimeType: upload.mimeType,
          originalFilename: upload.originalFilename,
          documentType: "RECEIPT",
        },
      });
    }
  }
  redirect(`/items/${item.id}`);
}

export async function updateItem(formData: FormData) {
  const user = await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const item = await prisma.item.findFirst({ where: { id, teamId: user.membership.teamId } });
  if (!item) redirect("/items");
  const input = itemInput(formData);
  await ensureOwnerInTeam(input.ownerId, user.membership.teamId);
  const {
    originalQuantity: _originalQuantity,
    currentQuantity: _currentQuantity,
    ...editableInput
  } = input;
  await prisma.item.update({ where: { id }, data: editableInput });
  redirect(`/items/${id}`);
}

export async function uploadItemDocuments(formData: FormData) {
  const user = await requireAdmin();
  const itemId = z.string().cuid().parse(formData.get("itemId"));
  const item = await prisma.item.findFirst({
    where: { id: itemId, teamId: user.membership.teamId },
  });
  if (!item) redirect("/items");
  const documentType = optionalText(formData.get("documentType"));
  const description = optionalText(formData.get("description"));
  const files = formData
    .getAll("documents")
    .filter((value): value is File => value instanceof File);
  for (const file of files) {
    const upload = await saveItemDocument(file);
    if (upload)
      await prisma.itemDocument.create({
        data: {
          itemId,
          fileReference: upload.filename,
          mimeType: upload.mimeType,
          originalFilename: upload.originalFilename,
          documentType,
          description,
        },
      });
  }
  revalidatePath(`/items/${itemId}`);
}

export async function deleteItemDocument(formData: FormData) {
  const user = await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const document = await prisma.itemDocument.findFirst({
    where: { id, item: { teamId: user.membership.teamId } },
  });
  if (!document) redirect("/items");
  await prisma.itemDocument.delete({ where: { id } });
  revalidatePath(`/items/${document.itemId}`);
}

export async function archiveItem(formData: FormData) {
  const user = await requireAdmin();
  const itemId = z.string().cuid().parse(formData.get("itemId"));
  const reason = z
    .enum(["SOLD", "RETIRED", "LOST", "DAMAGED", "OTHER"])
    .parse(formData.get("reason"));
  const item = await prisma.item.findFirst({
    where: { id: itemId, teamId: user.membership.teamId },
  });
  if (!item) redirect("/items");
  const quantity =
    item.itemType === "LOT"
      ? z.coerce.number().int().min(1).max(item.currentQuantity).parse(formData.get("quantity"))
      : 1;
  const grossAmountCents = optionalCents(formData.get("grossAmountDollars")) ?? 0;
  const sellingFeesCents = optionalCents(formData.get("sellingFeesDollars")) ?? 0;
  const shippingCostCents = optionalCents(formData.get("sellerShippingDollars")) ?? 0;
  const dateText = optionalText(formData.get("dispositionDate"));
  const currentQuantity = item.currentQuantity - quantity;
  await prisma.$transaction([
    prisma.itemDisposition.create({
      data: {
        itemId,
        type: reason,
        quantity,
        dispositionDate: dateText ? new Date(dateText) : new Date(),
        grossAmountCents,
        sellingFeesCents,
        shippingCostCents,
        netAmountCents: grossAmountCents - sellingFeesCents - shippingCostCents,
        buyer: optionalText(formData.get("buyer")),
        platform: optionalText(formData.get("platform")),
        notes: optionalText(formData.get("saleNotes")),
      },
    }),
    prisma.item.update({
      where: { id: itemId },
      data: {
        currentQuantity,
        ...(item.itemType === "INDIVIDUAL" || currentQuantity === 0
          ? { status: "ARCHIVED", archiveReason: reason, archivedAt: new Date() }
          : {}),
      },
    }),
  ]);
  revalidatePath("/items");
  revalidatePath(`/items/${itemId}`);
}

export async function duplicateItem(formData: FormData) {
  const user = await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const item = await prisma.item.findFirst({ where: { id, teamId: user.membership.teamId } });
  if (!item) redirect("/items");
  const duplicate = await prisma.item.create({
    data: {
      ...item,
      id: undefined,
      serialNumber: null,
      assetNumber: null,
      photoReference: null,
      status: "ACTIVE",
      archiveReason: null,
      archivedAt: null,
      createdAt: undefined,
      updatedAt: undefined,
    },
  });
  redirect(`/items/${duplicate.id}`);
}

export async function updateItemDisposition(formData: FormData) {
  const user = await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const disposition = await prisma.itemDisposition.findFirst({
    where: { id, item: { teamId: user.membership.teamId } },
    include: { item: true },
  });
  if (!disposition) redirect("/items");
  const quantity =
    disposition.item.itemType === "LOT"
      ? z.coerce
          .number()
          .int()
          .min(1)
          .max(disposition.item.currentQuantity + disposition.quantity)
          .parse(formData.get("quantity"))
      : 1;
  const grossAmountCents = optionalCents(formData.get("grossAmountDollars")) ?? 0;
  const sellingFeesCents = optionalCents(formData.get("sellingFeesDollars")) ?? 0;
  const shippingCostCents = optionalCents(formData.get("sellerShippingDollars")) ?? 0;
  const dateText = optionalText(formData.get("dispositionDate"));
  const currentQuantity =
    disposition.item.itemType === "LOT"
      ? disposition.item.currentQuantity + disposition.quantity - quantity
      : 0;
  await prisma.$transaction([
    prisma.itemDisposition.update({
      where: { id },
      data: {
        quantity,
        dispositionDate: dateText ? new Date(dateText) : disposition.dispositionDate,
        grossAmountCents,
        sellingFeesCents,
        shippingCostCents,
        netAmountCents: grossAmountCents - sellingFeesCents - shippingCostCents,
        buyer: optionalText(formData.get("buyer")),
        platform: optionalText(formData.get("platform")),
        notes: optionalText(formData.get("saleNotes")),
      },
    }),
    prisma.item.update({
      where: { id: disposition.itemId },
      data: {
        currentQuantity,
        ...(disposition.item.itemType === "LOT" && currentQuantity > 0
          ? { status: "ACTIVE", archiveReason: null, archivedAt: null }
          : {}),
      },
    }),
  ]);
  revalidatePath("/items");
  revalidatePath(`/items/${disposition.itemId}`);
}
