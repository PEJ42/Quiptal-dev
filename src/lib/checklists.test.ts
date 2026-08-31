import { describe, expect, it } from "vitest";
import { checklistSteps } from "@/lib/checklist-definitions";

describe("booking checklist definitions", () => {
  it("uses the required dropoff sequence", () => {
    expect(checklistSteps.DROPOFF.map((step) => step.label)).toEqual([
      "Contract signed",
      "Payment collected / hold initiated",
      "Photos uploaded",
      "Damage report",
      "Confirmed dropped off",
    ]);
  });

  it("uses the required pickup sequence", () => {
    expect(checklistSteps.PICKUP.map((step) => step.label)).toEqual([
      "Damage report",
      "Photos uploaded",
      "Card hold release",
      "Confirm picked up",
    ]);
  });
});
