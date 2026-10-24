import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeCloseoutBrief } from "./closeout-brief.ts";

describe("summarizeCloseoutBrief", () => {
  it("prioritizes ready closeout items for active show work and flags final approvals", () => {
    const summary = summarizeCloseoutBrief([
      { id: "1", title: "Northwind Launch", status: "production", venue: "Sky Deck", event_date: "2026-11-12T18:00:00.000Z", ballpark: 850000 },
      { id: "2", title: "Meridian Gala", status: "delivered", venue: "The Loft", event_date: "2026-11-01T18:00:00.000Z", ballpark: 1200000 },
      { id: "3", title: "Estate Wedding", status: "booked", venue: null, event_date: "2026-12-02T18:00:00.000Z", ballpark: 600000 },
    ], 500000);

    assert.equal(summary.readyCount, 1);
    assert.ok(summary.watchCount >= 1);
    assert.equal(summary.outstandingAmount, 2150000);
    assert.ok(summary.items.some((item) => item.label === "Final client approval"));
  });

  it("keeps venue and settlement gaps in watch state until fixed", () => {
    const summary = summarizeCloseoutBrief([
      { id: "4", title: "Brand Sprint", status: "booked", venue: "TBC", event_date: "2026-10-30T18:00:00.000Z", ballpark: 0 },
    ], 0);

    assert.equal(summary.watchCount, 2);
    assert.ok(summary.items.some((item) => item.label === "Venue confirmation"));
    assert.ok(summary.items.some((item) => item.label === "Budget sign-off"));
  });
});
