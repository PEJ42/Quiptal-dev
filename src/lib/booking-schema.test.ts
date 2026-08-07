import { describe, expect, it } from "vitest";
import { bookingSchema, isUpcomingBooking } from "@/lib/booking-schema";

describe("booking dates", () => {
  it("rejects an end date before the start date", () => {
    expect(
      bookingSchema.safeParse({
        customerId: "cl123456789012345678901234",
        startDate: "2026-08-10",
        endDate: "2026-08-09",
        bookingTypeId: "cl123456789012345678901234",
        bookingStatusId: "cl123456789012345678901234",
        taxRateBasisPoints: 0,
        securityDepositCents: 0,
      }).success,
    ).toBe(false);
  });
  it("uses a date-only upcoming comparison", () => {
    expect(
      isUpcomingBooking(new Date("2026-08-06T00:00:00.000Z"), new Date("2026-08-06T22:00:00.000Z")),
    ).toBe(true);
  });
});
