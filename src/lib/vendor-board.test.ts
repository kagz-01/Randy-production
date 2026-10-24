import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildVendorBoard } from "./vendor-board.ts";

describe("buildVendorBoard", () => {
  it("groups preferred vendors and flags short lead times", () => {
    const board = buildVendorBoard([
      { id: "1", name: "Petal & Wire", specialty: "Florals", city: "Nairobi", lead_days: 10, rating: 4.9 },
      { id: "2", name: "Volt Rigging", specialty: "Rigging", city: "Nairobi", lead_days: 5, rating: 4.8 },
      { id: "3", name: "Atelier Linen Co.", specialty: "Florals", city: "Mombasa", lead_days: 8, rating: 4.7 },
    ]);

    assert.equal(board.summary.urgent, 1);
    assert.equal(board.summary.averageLeadDays, 7.67);
    assert.ok(board.groups.some((group) => group.specialty === "Florals"));
    assert.ok(board.groups.some((group) => group.specialty === "Rigging"));
    assert.ok(board.groups[1].vendors[0].status.startsWith("Ready") || board.groups[0].vendors.some((vendor) => vendor.status.includes("Ready")));
  });
});
