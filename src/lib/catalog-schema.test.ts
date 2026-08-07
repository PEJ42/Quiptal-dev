import { describe, expect, it } from "vitest";
import { bundleComponentSchema, catalogSearchSchema, productSchema } from "@/lib/catalog-schema";

describe("catalog validation", () => {
  it("requires non-negative integer cents and a category", () => {
    expect(
      productSchema.safeParse({
        name: "Speaker",
        categoryId: "cl123456789012345678901234",
        defaultRentalCents: 12.5,
        isTaxable: true,
      }).success,
    ).toBe(false);
  });

  it("requires a positive bundle component quantity", () => {
    expect(
      bundleComponentSchema.safeParse({ productId: "cl123456789012345678901234", quantity: 0 })
        .success,
    ).toBe(false);
  });

  it("defaults catalog browsing to active all-record view", () => {
    expect(catalogSearchSchema.parse({})).toMatchObject({ q: "", view: "all", archived: "active" });
  });
});
