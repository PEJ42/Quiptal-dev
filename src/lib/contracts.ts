import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { contractsDirectory } from "@/lib/app-storage";

export type ContractViewModel = {
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
    components: string[];
  }[];
  totals: {
    subtotalCents: number;
    discountCents: number;
    taxCents: number;
    totalCents: number;
    securityDepositCents: number;
  };
  title: string;
  legalTerms: string;
  footerText?: string | null;
};

const cents = (value: number) => `$${(value / 100).toFixed(2)}`;
const wrap = (text: string, width: number, fontSize: number) => {
  const characters = Math.max(20, Math.floor(width / (fontSize * 0.5)));
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (`${current} ${word}`.trim().length > characters) {
      lines.push(current);
      current = word;
    } else current = `${current} ${word}`.trim();
  }
  if (current) lines.push(current);
  return lines;
};

export async function renderContractPdf(model: ContractViewModel) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = 612;
  const height = 792;
  const margin = 48;
  let page = pdf.addPage([width, height]);
  let y = height - margin;
  const newPage = () => {
    page = pdf.addPage([width, height]);
    y = height - margin;
  };
  const text = (value: string, size = 10, isBold = false, color = rgb(0, 0, 0)) => {
    if (y < margin + 24) newPage();
    page.drawText(value, { x: margin, y, size, font: isBold ? bold : font, color });
    y -= size + 5;
  };
  const paragraph = (value: string, size = 10) =>
    wrap(value, width - margin * 2, size).forEach((line) => text(line, size));
  text(model.company.name, 18, true);
  paragraph(
    [model.company.address, model.company.phone, model.company.email].filter(Boolean).join(" · "),
    9,
  );
  y -= 10;
  text(model.title, 15, true);
  text(`Booking ${model.booking.number} · Created ${model.booking.createdAt}`, 10);
  paragraph(`Customer: ${model.booking.customerName} (${model.booking.customerEmail})`, 10);
  paragraph(
    `Rental period: ${model.booking.startDate} to ${model.booking.endDate} · Type: ${model.booking.type}`,
    10,
  );
  if (model.booking.title) paragraph(`Event: ${model.booking.title}`, 10);
  paragraph(`Event location: ${model.booking.eventAddress || "Not specified"}`, 10);
  paragraph(`Billing address: ${model.booking.billingAddress || "Not specified"}`, 10);
  y -= 8;
  text("Rental items", 12, true);
  const tableHeader = () => {
    if (y < margin + 36) newPage();
    page.drawText("Item", { x: margin, y, size: 9, font: bold });
    page.drawText("Qty", { x: 350, y, size: 9, font: bold });
    page.drawText("Unit price", { x: 400, y, size: 9, font: bold });
    page.drawText("Subtotal", { x: 495, y, size: 9, font: bold });
    y -= 16;
  };
  tableHeader();
  for (const line of model.lines) {
    const componentHeight = line.components.length * 13;
    if (y < margin + 40 + componentHeight) tableHeader();
    const label = `${line.name} (${line.type})`;
    page.drawText(label.length > 42 ? `${label.slice(0, 39)}...` : label, {
      x: margin,
      y,
      size: 10,
      font,
    });
    page.drawText(String(line.quantity), { x: 350, y, size: 9, font });
    page.drawText(cents(line.unitPriceCents), { x: 400, y, size: 9, font });
    page.drawText(cents(line.subtotalCents), { x: 495, y, size: 9, font });
    y -= 15;
    line.components.forEach((component) =>
      text(`  - ${component}`, 8, false, rgb(0.25, 0.25, 0.25)),
    );
    y -= 3;
  }
  y -= 8;
  text(`Subtotal: ${cents(model.totals.subtotalCents)}`, 10);
  text(`Discount: -${cents(model.totals.discountCents)}`, 10);
  text(`Tax: ${cents(model.totals.taxCents)}`, 10);
  text(`Total including taxes: ${cents(model.totals.totalCents)}`, 11, true);
  text(`Refundable security deposit: ${cents(model.totals.securityDepositCents)}`, 10);
  y -= 10;
  text("Rental agreement terms", 12, true);
  paragraph(model.legalTerms, 9);
  y -= 8;
  text("Customer acceptance", 11, true);
  paragraph(
    "Signature or electronic acceptance will be supported in a future version. This generated version does not collect a signature.",
    9,
  );
  const pages = pdf.getPages();
  pages.forEach((currentPage, index) =>
    currentPage.drawText(`${model.footerText || ""}  Page ${index + 1} of ${pages.length}`, {
      x: margin,
      y: 26,
      size: 8,
      font,
      color: rgb(0.35, 0.35, 0.35),
    }),
  );
  return pdf.save();
}

export async function storeContract(bytes: Uint8Array) {
  const filename = `${randomUUID()}.pdf`;
  await mkdir(contractsDirectory, { recursive: true });
  await writeFile(`${contractsDirectory}/${filename}`, bytes);
  return filename;
}
