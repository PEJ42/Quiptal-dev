import { describe, expect, it } from "vitest";
import { hashContractSnapshot } from "./contract-snapshot";

describe("hashContractSnapshot", () => {
  it("changes when the immutable contract contents change", () => {
    const base = {
      company: { name: "Example", address: "1 Main" },
      booking: {
        number: "B-1",
        type: "Wedding",
        startDate: "2026-01-01",
        endDate: "2026-01-02",
        customerName: "Alex",
        customerEmail: "alex@example.test",
        billingAddress: "",
        eventAddress: "",
        createdAt: "2026-01-01",
      },
      lines: [],
      totals: {
        subtotalCents: 100,
        serviceChargeCents: 0,
        discountCents: 0,
        taxCents: 0,
        rentalTotalCents: 100,
        totalCents: 160,
        securityDepositCents: 60,
        replacementValueCents: 100,
      },
      title: "Rental Agreement",
      legalTerms: "Terms",
    };
    expect(hashContractSnapshot(base)).not.toBe(
      hashContractSnapshot({ ...base, title: "Revised Agreement" }),
    );
  });
});
