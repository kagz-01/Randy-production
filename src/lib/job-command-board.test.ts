import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeJobCommandBoard } from "./job-command-board.ts";

describe("summarizeJobCommandBoard", () => {
  it("flags show-week jobs and values active bookings accurately", () => {
    const summary = summarizeJobCommandBoard([
      { title: "Meridian Gala", status: "production", event_date: "2026-11-12T18:00:00.000Z", ballpark: 1200000, venue: "The Loft", client_name: "Meridian" },
      { title: "Nairobi Launch", status: "booked", event_date: "2026-11-20T18:00:00.000Z", ballpark: 850000, venue: "Sky Deck", client_name: "Northwind" },
      { title: "Estate Wedding", status: "quoted", event_date: null, ballpark: 600000, venue: null, client_name: "J & M" },
      { title: "Brand Sprint", status: "inquiry", event_date: null, ballpark: 300000, venue: "TBC", client_name: "Form Studio" },
    ]);

    assert.equal(summary.live, 2);
    assert.equal(summary.outstanding, 2);
    assert.equal(summary.value, 2050000);
    assert.ok(summary.dueSoon.some((job) => job.title === "Meridian Gala"));
    assert.equal(summary.needsAttention[0].title, "Estate Wedding");
  });
});
