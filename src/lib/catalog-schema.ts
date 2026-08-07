import { z } from "zod";

const cents = z.coerce.number().int().min(0).max(100_000_000);

export const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1_000).optional(),
  categoryId: z.string().cuid(),
  defaultRentalCents: cents,
  replacementCostCents: cents.optional(),
  isTaxable: z.boolean(),
});

export const bundleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1_000).optional(),
  fixedRentalCents: cents,
  isTaxable: z.boolean(),
});

export const bundleComponentSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().min(1).max(10_000),
});

export const catalogSearchSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  view: z.enum(["all", "products", "bundles"]).optional().default("all"),
  categoryId: z.string().cuid().optional(),
  archived: z.enum(["active", "archived"]).optional().default("active"),
});
