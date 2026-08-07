import { describe, expect, it } from "vitest";
import { customerSchema } from "@/lib/customer-schema";

describe("customerSchema", () => {
  it("normalizes email for duplicate matching", () => {
    expect(
      customerSchema.parse({ firstName: "Alex", lastName: "Example", email: " ALEX@EXAMPLE.TEST " })
        .email,
    ).toBe("alex@example.test");
  });
});
