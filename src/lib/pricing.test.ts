import { describe, expect, it } from "vitest";
import { calculateBookingPricing } from "@/lib/pricing";

describe("calculateBookingPricing", () => {
  it("allocates fixed discounts before tax and keeps deposits separate", () => {
    expect(
      calculateBookingPricing({
        lines: [
          { quantity: 1, unitPriceCents: 10_000, taxable: true },
          { quantity: 1, unitPriceCents: 5_000, taxable: false },
        ],
        discount: { type: "FIXED", value: 3_000 },
        taxRateBasisPoints: 1_000,
        securityDepositCents: 2_000,
      }),
    ).toEqual({
      subtotalCents: 15_000,
      discountCents: 3_000,
      taxCents: 800,
      securityDepositCents: 2_000,
      totalCents: 14_800,
    });
  });

  it("does not include a refundable deposit in rental revenue", () => {
    const pricing = calculateBookingPricing({
      lines: [{ quantity: 1, unitPriceCents: 5_000, taxable: false }],
      discount: null,
      taxRateBasisPoints: 0,
      securityDepositCents: 2_000,
    });
    expect(pricing.totalCents - pricing.securityDepositCents).toBe(5_000);
  });
});
