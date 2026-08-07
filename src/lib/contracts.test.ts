import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { renderContractPdf } from "./contracts";

describe("renderContractPdf", () => {
  it("creates a readable Letter-size document from a booking snapshot", async () => {
    const bytes = await renderContractPdf({
      company: { name: "Example Rentals", address: "1 Example Way" },
      booking: {
        number: "B-2026-100001",
        type: "Wedding",
        startDate: "2026-08-20",
        endDate: "2026-08-22",
        customerName: "Alex Example",
        customerEmail: "alex@example.test",
        billingAddress: "2 Billing Street",
        eventAddress: "3 Event Road",
        createdAt: "2026-08-06",
      },
      lines: [
        {
          name: "Speaker package",
          type: "BUNDLE",
          quantity: 2,
          unitPriceCents: 12500,
          subtotalCents: 25000,
          components: ["Two speakers × 1"],
        },
      ],
      totals: {
        subtotalCents: 25000,
        discountCents: 0,
        taxCents: 2000,
        totalCents: 27000,
        securityDepositCents: 5000,
      },
      title: "Equipment Rental Agreement",
      legalTerms: "Equipment must be returned in substantially the same condition.",
      footerText: "Example Rentals",
    });

    const document = await PDFDocument.load(bytes);
    const firstPage = document.getPages()[0];

    expect(document.getPageCount()).toBeGreaterThan(0);
    expect(firstPage.getWidth()).toBe(612);
    expect(firstPage.getHeight()).toBe(792);
  });
});
