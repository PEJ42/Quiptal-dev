import { describe, expect, it } from "vitest";
import { bookingVisibilityWhere } from "@/lib/team-access";

describe("bookingVisibilityWhere", () => {
  it("allows an admin to query every booking in their team", () => {
    expect(
      bookingVisibilityWhere({ id: "admin", membership: { teamId: "team-a", role: "ADMIN" } }),
    ).toEqual({ teamId: "team-a" });
  });

  it("limits a member to bookings they created, own, or are assigned", () => {
    expect(
      bookingVisibilityWhere({ id: "member", membership: { teamId: "team-a", role: "MEMBER" } }),
    ).toEqual({
      teamId: "team-a",
      OR: [
        { createdByUserId: "member" },
        { ownerUserId: "member" },
        { members: { some: { userId: "member" } } },
      ],
    });
  });
});
