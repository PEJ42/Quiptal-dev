import { describe, expect, it } from "vitest";
import {
  contractTermsPlainText,
  contractTermsToBlocks,
  contractTermsToEditorHtml,
  contractTermsToRuns,
  sanitizeContractTerms,
} from "./contract-terms";

describe("contract terms formatting", () => {
  it("keeps only the supported formatting tags", () => {
    expect(
      sanitizeContractTerms('<p onclick="bad()"><strong>Important</strong><img src=x></p>'),
    ).toBe("<p><strong>Important</strong></p>");
  });

  it("turns legacy plain text into editable paragraphs", () => {
    expect(contractTermsToEditorHtml("First paragraph.\n\nSecond paragraph.")).toBe(
      "<p>First paragraph.</p><p>Second paragraph.</p>",
    );
  });

  it("preserves paragraphs, bullets, and bold runs for PDF rendering", () => {
    const value =
      "<p>Use <strong>care</strong>.</p><ul><li>Return equipment</li><li>Pay fees</li></ul>";
    expect(contractTermsToBlocks(value)).toEqual([
      { kind: "paragraph", html: "Use <strong>care</strong>." },
      { kind: "bullet", html: "Return equipment" },
      { kind: "bullet", html: "Pay fees" },
    ]);
    expect(contractTermsToRuns("Use <strong>care</strong>.")).toEqual([
      { text: "Use ", bold: false },
      { text: "care", bold: true },
      { text: ".", bold: false },
    ]);
    expect(contractTermsPlainText(value)).toContain("Return equipment");
  });
});
