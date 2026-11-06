import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeJobCommandBoard } from "./job-command-board.ts";

describe("summarizeJobCommandBoard", () => {
  it("flags show-week jobs and values active bookings accurately", () => {
    const summary = summarizeJobCommandBoard([
      { title: "Sample Gala", status: "production", event_date: "2026-11-12T18:00:00.000Z", ballpark: 1200000, venue: "The Loft", client_name: "Sample Client" },
      { title: "Nairobi Launch", status: "booked", event_date: "2026-11-20T18:00:00.000Z", ballpark: 850000, venue: "Sky Deck", client_name: "Northwind" },
      { title: "Estate Wedding", status: "quoted", event_date: null, ballpark: 600000, venue: null, client_name: "J & M" },
      { title: "Brand Sprint", status: "inquiry", event_date: null, ballpark: 300000, venue: "TBC", client_name: "Form Studio" },
    ]);

    assert.equal(summary.live, 2);
    assert.equal(summary.outstanding, 2);
    assert.equal(summary.value, 2050000);
    assert.ok(summary.dueSoon.some((job) => job.title === "Sample Gala"));
    assert.equal(summary.needsAttention[0].title, "Estate Wedding");
  });

  it("keeps closed records out of open-work and counts every upcoming show", () => {
    const showDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const summary = summarizeJobCommandBoard([
      { title: "Active Show", status: "booked", event_date: showDate, ballpark: 400000, venue: "The Hall" },
      { title: "Second Show", status: "booked", event_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), ballpark: 200000, venue: "The Hall" },
      { title: "Third Show", status: "production", event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), ballpark: 200000, venue: "The Hall" },
      { title: "Fourth Show", status: "production", event_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), ballpark: 200000, venue: "The Hall" },
      { title: "Open Quote", status: "quoted", event_date: showDate, ballpark: 0, venue: "TBC" },
      { title: "Finished Show", status: "delivered", event_date: null, venue: null },
      { title: "Cancelled Show", status: "cancelled", event_date: null, venue: null },
    ]);

    assert.equal(summary.live, 4);
    assert.equal(summary.outstanding, 1);
    assert.equal(summary.value, 1000000);
    assert.equal(summary.dueSoon.length, 4);
    assert.deepEqual(summary.needsAttention.map((job) => job.title), ["Open Quote"]);
  });
});
