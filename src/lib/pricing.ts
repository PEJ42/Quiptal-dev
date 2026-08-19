export type PricingLine = { quantity: number; unitPriceCents: number; taxable: boolean };
export type Discount = { type: "FIXED" | "PERCENT"; value: number } | null;
export type ReplacementValueLine = {
  quantity: number;
  replacementCostCentsSnapshot: number | null;
  bundleComponentSnapshots: {
    quantityPerBundle: number;
    replacementCostCentsSnapshot: number | null;
  }[];
};

export function replacementValueCents(lines: ReplacementValueLine[]) {
  return lines.reduce((total, line) => {
    const lineReplacementValue = line.bundleComponentSnapshots.length
      ? line.bundleComponentSnapshots.reduce(
          (bundleTotal, component) =>
            bundleTotal +
            component.quantityPerBundle * (component.replacementCostCentsSnapshot ?? 0),
          0,
        )
      : (line.replacementCostCentsSnapshot ?? 0);
    return total + line.quantity * lineReplacementValue;
  }, 0);
}

export function recommendedSecurityDepositCents(lines: ReplacementValueLine[]) {
  return Math.round(replacementValueCents(lines) * 0.6);
}

export function lineSubtotalCents(line: PricingLine) {
  return line.quantity * line.unitPriceCents;
}

export function calculateBookingPricing({
  lines,
  discount,
  taxRateBasisPoints,
  securityDepositCents,
}: {
  lines: PricingLine[];
  discount: Discount;
  taxRateBasisPoints: number;
  securityDepositCents: number;
}) {
  const subtotalCents = lines.reduce((total, line) => total + lineSubtotalCents(line), 0);
  const rawDiscount =
    discount?.type === "PERCENT"
      ? Math.round((subtotalCents * discount.value) / 10_000)
      : (discount?.value ?? 0);
  const discountCents = Math.min(Math.max(rawDiscount, 0), subtotalCents);
  const taxableSubtotalCents = lines
    .filter((line) => line.taxable)
    .reduce((total, line) => total + lineSubtotalCents(line), 0);
  const taxableDiscountCents =
    subtotalCents === 0 ? 0 : Math.round((discountCents * taxableSubtotalCents) / subtotalCents);
  const taxCents = Math.round(
    (Math.max(taxableSubtotalCents - taxableDiscountCents, 0) * taxRateBasisPoints) / 10_000,
  );
  const totalCents = subtotalCents - discountCents + taxCents + securityDepositCents;
  return { subtotalCents, discountCents, taxCents, securityDepositCents, totalCents };
}
