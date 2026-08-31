export const checklistFlows = ["DROPOFF", "PICKUP"] as const;
export type ChecklistFlow = (typeof checklistFlows)[number];

export const checklistSteps: Record<
  ChecklistFlow,
  { key: string; label: string; kind: "contract" | "manual" | "photos" | "damage" | "confirm" }[]
> = {
  DROPOFF: [
    { key: "CONTRACT_SIGNED", label: "Contract signed", kind: "contract" },
    { key: "PAYMENT_COLLECTED", label: "Payment collected / hold initiated", kind: "manual" },
    { key: "PHOTOS_UPLOADED", label: "Photos uploaded", kind: "photos" },
    { key: "DAMAGE_REPORT", label: "Damage report", kind: "damage" },
    { key: "CONFIRMED_DROPOFF", label: "Confirmed dropped off", kind: "confirm" },
  ],
  PICKUP: [
    { key: "DAMAGE_REPORT", label: "Damage report", kind: "damage" },
    { key: "PHOTOS_UPLOADED", label: "Photos uploaded", kind: "photos" },
    { key: "CARD_HOLD_RELEASE", label: "Card hold release", kind: "manual" },
    { key: "CONFIRMED_PICKUP", label: "Confirm picked up", kind: "confirm" },
  ],
};

export function isChecklistFlow(value: string): value is ChecklistFlow {
  return checklistFlows.includes(value as ChecklistFlow);
}
