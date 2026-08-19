import { describe, expect, it } from "vitest";
import { centsToDollars, dollarsToCents } from "./money";

describe("money helpers", () => {
  it("converts dollar-formatted input to integer cents", () => {
    expect(dollarsToCents("12")).toBe(1200);
    expect(dollarsToCents("12.3")).toBe(1230);
    expect(dollarsToCents("12.34")).toBe(1234);
  });

  it("leaves invalid input for schema validation and formats cents", () => {
    expect(dollarsToCents("12.345")).toBe("12.345");
    expect(centsToDollars(1234)).toBe("12.34");
  });
});
