import { describe, expect, it } from "vitest";
import { contractTermsToBlocks, contractTermsToEditorHtml } from "./contract-terms";

describe("contract terms formatting", () => {
  const legacyTerms =
    "THE RENTAL AGREEMENT applies to this booking. 1. RENTAL EQUIPMENT Owner supplies the listed equipment. 2. ELIGIBILITY Renter must: • Present identification. • Provide a payment method.";

  it("formats legacy plain text into readable sections and bullets", () => {
    expect(contractTermsToEditorHtml(legacyTerms)).toContain(
      "<strong>1. RENTAL EQUIPMENT</strong>",
    );
    expect(contractTermsToEditorHtml(legacyTerms)).toContain("<li>Present identification.</li>");
  });

  it("returns separate blocks for paragraphs and bullets", () => {
    expect(contractTermsToBlocks(legacyTerms).map((block) => block.kind)).toEqual([
      "paragraph",
      "paragraph",
      "paragraph",
      "paragraph",
      "paragraph",
      "bullet",
      "bullet",
    ]);
  });
});
