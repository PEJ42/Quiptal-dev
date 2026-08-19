import { z } from "zod";

export const bookingSchema = z
  .object({
    customerId: z.string().cuid(),
    primaryContactId: z.string().cuid().optional(),
    title: z.string().trim().max(160).optional(),
    startDate: z.string().date(),
    endDate: z.string().date(),
    bookingTypeId: z.string().cuid(),
    bookingStatusId: z.string().cuid(),
    eventAddressLine1: z.string().trim().max(120).optional(),
    eventAddressLine2: z.string().trim().max(120).optional(),
    eventCity: z.string().trim().max(80).optional(),
    eventRegion: z.string().trim().max(80).optional(),
    eventPostalCode: z.string().trim().max(24).optional(),
    eventCountry: z.string().trim().max(80).optional(),
    notes: z.string().trim().max(5_000).optional(),
    discountType: z.enum(["FIXED", "PERCENT"]).optional(),
    discountValue: z.coerce.number().int().min(0).max(100_000_000).default(0),
    taxRateBasisPoints: z.coerce.number().int().min(0).max(10_000),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date cannot be before start date.",
    path: ["endDate"],
  })
  .refine((value) => value.discountType !== "PERCENT" || value.discountValue <= 10_000, {
    message: "Percentage discount cannot exceed 100%.",
    path: ["discountValue"],
  });

export function bookingDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
export function isUpcomingBooking(startDate: Date, today = new Date()) {
  const todayDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  return startDate >= todayDate;
}
