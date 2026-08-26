import { createHash } from "crypto";

export type ContractSnapshot = {
  company: { name: string; address: string; phone?: string | null; email?: string | null };
  booking: {
    number: string;
    title?: string | null;
    type: string;
    startDate: string;
    endDate: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string | null;
    billingAddress: string;
    eventAddress: string;
    createdAt: string;
  };
  lines: {
    name: string;
    type: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
    replacementValueCents: number;
    components: { name: string; quantity: number; replacementValueCents: number }[];
  }[];
  totals: {
    subtotalCents: number;
    serviceChargeCents: number;
    discountCents: number;
    taxCents: number;
    rentalTotalCents: number;
    totalCents: number;
    securityDepositCents: number;
    replacementValueCents: number;
  };
  title: string;
  legalTerms: string;
  footerText?: string | null;
};

export function hashContractSnapshot(snapshot: ContractSnapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function parseContractSnapshot(value: string) {
  return JSON.parse(value) as ContractSnapshot;
}
