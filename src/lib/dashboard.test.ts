import { describe, expect, it } from "vitest";
import { calculateDashboardMetrics } from "./dashboard";

describe("calculateDashboardMetrics", () => {
  it("uses upcoming bookings for revenue and excludes a past customer", () => {
    const metrics = calculateDashboardMetrics(
      [
        {
          customerId: "customer-a",
          startDate: new Date("2026-08-07T00:00:00.000Z"),
          totalCents: 12500,
        },
        {
          customerId: "customer-a",
          startDate: new Date("2026-08-20T00:00:00.000Z"),
          totalCents: 5000,
        },
        {
          customerId: "customer-b",
          startDate: new Date("2026-07-30T00:00:00.000Z"),
          totalCents: 9900,
        },
      ],
      new Date("2026-08-07T12:00:00.000Z"),
    );

    expect(metrics).toEqual({
      upcomingBookings: 2,
      upcomingRevenueCents: 17500,
      bookingsThisMonth: 2,
      customersWithUpcomingBookings: 1,
    });
  });
});
