import { describe, expect, it } from "vitest";
import { rentalAmountCents } from "./booking-finance";

describe("rentalAmountCents", () => {
  it("keeps the security deposit separate from the rental payment", () => {
    expect(rentalAmountCents({ totalCents: 28_500, securityDepositCents: 9_000 })).toBe(19_500);
  });

  it("never creates a negative payment amount", () => {
    expect(rentalAmountCents({ totalCents: 2_000, securityDepositCents: 3_000 })).toBe(0);
  });
});
