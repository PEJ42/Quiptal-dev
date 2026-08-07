import { z } from "zod";

export const customerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z
    .string()
    .trim()
    .pipe(z.email())
    .transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(32).optional(),
  addressLine1: z.string().trim().max(120).optional(),
  addressLine2: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  region: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(24).optional(),
  country: z.string().trim().max(80).optional(),
});
export const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().pipe(z.email()).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional(),
  relationship: z.string().trim().max(80).optional(),
});
