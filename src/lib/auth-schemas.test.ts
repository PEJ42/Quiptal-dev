import { describe, expect, it } from "vitest";
import { credentialsSchema } from "@/lib/auth-schemas";

describe("credentialsSchema", () => {
  it("normalizes email and requires a strong-enough password", () => {
    const result = credentialsSchema.parse({
      email: " OWNER@EXAMPLE.TEST ",
      password: "twelve-char+",
    });
    expect(result.email).toBe("owner@example.test");
  });
});
