import { describe, expect, it } from "vitest";
import {
  calculateBookingPricing,
  recommendedSecurityDepositCents,
  replacementValueCents,
} from "@/lib/pricing";

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

describe("replacement-value deposits", () => {
  it("uses product and bundle component snapshots to recommend 60 percent", () => {
    const lines = [
      {
        quantity: 2,
        replacementCostCentsSnapshot: 50_000,
        bundleComponentSnapshots: [],
      },
      {
        quantity: 3,
        replacementCostCentsSnapshot: null,
        bundleComponentSnapshots: [
          { quantityPerBundle: 1, replacementCostCentsSnapshot: 20_000 },
          { quantityPerBundle: 2, replacementCostCentsSnapshot: 5_000 },
        ],
      },
    ];

    expect(replacementValueCents(lines)).toBe(190_000);
    expect(recommendedSecurityDepositCents(lines)).toBe(114_000);
  });
});
