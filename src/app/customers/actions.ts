"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { contactSchema, customerSchema } from "@/lib/customer-schema";
import { prisma } from "@/lib/prisma";

export async function createCustomer(formData: FormData) {
  await requireAdmin();
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/customers/new?error=invalid");
  const duplicate = await prisma.customer.findFirst({
    where: { normalizedEmail: parsed.data.email, archivedAt: null },
  });
  if (duplicate && formData.get("confirmDuplicate") !== "yes")
    redirect(`/customers/new?duplicate=${duplicate.id}`);
  const customer = await prisma.customer.create({
    data: { ...parsed.data, normalizedEmail: parsed.data.email, phone: parsed.data.phone || null },
  });
  redirect(`/customers/${customer.id}`);
}
export async function toggleCustomerArchive(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const archive = formData.get("archive") === "true";
  await prisma.customer.update({
    where: { id },
    data: { archivedAt: archive ? new Date() : null },
  });
  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
}
export async function addContact(formData: FormData) {
  await requireAdmin();
  const customerId = z.string().cuid().parse(formData.get("customerId"));
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await prisma.customerContact.create({
    data: {
      customerId,
      ...parsed.data,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      relationship: parsed.data.relationship || null,
    },
  });
  revalidatePath(`/customers/${customerId}`);
}
export async function toggleContactArchive(formData: FormData) {
  await requireAdmin();
  const id = z.string().cuid().parse(formData.get("id"));
  const customerId = z.string().cuid().parse(formData.get("customerId"));
  const archive = formData.get("archive") === "true";
  await prisma.customerContact.update({
    where: { id },
    data: { archivedAt: archive ? new Date() : null },
  });
  revalidatePath(`/customers/${customerId}`);
}
