import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeJobReadiness } from "./operations-readiness.ts";

describe("summarizeJobReadiness", () => {
  it("scores live bookings by production stage and flags the nearest show", () => {
    const summary = summarizeJobReadiness([
      { title: "Meridian Gala", status: "production", event_date: "2026-11-12T18:00:00.000Z", ballpark: 1200000 },
      { title: "Nairobi Launch", status: "booked", event_date: "2026-11-14T18:00:00.000Z", ballpark: 850000 },
      { title: "Estate Wedding", status: "delivered", event_date: "2026-10-02T18:00:00.000Z", ballpark: 650000 },
      { title: "Brand Sprint", status: "inquiry", event_date: "2026-11-20T18:00:00.000Z", ballpark: 300000 },
    ]);

    assert.equal(summary.score, 71);
    assert.equal(summary.live, 2);
    assert.equal(summary.watchlist, 1);
    assert.equal(summary.nearest?.title, "Meridian Gala");
  });
});
