import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeStudioHome } from "./studio-home-summary.ts";

describe("summarizeStudioHome", () => {
  it("counts active work and surfaces the next event heading without chasing a dead pipeline", () => {
    const summary = summarizeStudioHome(
      [
        {
          id: "job-1",
          owner_user_id: null,
          title: "Meridian Gala",
          client_name: "Meridian",
          service: "event",
          event_type: "gala",
          guests: 220,
          tier: "premium",
          status: "production",
          venue: "Sky Deck",
          event_date: "2026-11-12T18:00:00.000Z",
          ballpark: 1100000,
          notes: null,
          is_showcase: false,
        },
        {
          id: "job-2",
          owner_user_id: null,
          title: "Northwind Launch",
          client_name: "Northwind",
          service: "brand",
          event_type: "launch",
          guests: 180,
          tier: "signature",
          status: "booked",
          venue: null,
          event_date: "2026-12-01T18:00:00.000Z",
          ballpark: 950000,
          notes: null,
          is_showcase: false,
        },
        {
          id: "job-3",
          owner_user_id: null,
          title: "Legacy Wedding",
          client_name: "Riviera",
          service: "wedding",
          event_type: "wedding",
          guests: 300,
          tier: "luxury",
          status: "delivered",
          venue: "Boma",
          event_date: "2026-08-12T18:00:00.000Z",
          ballpark: 840000,
          notes: null,
          is_showcase: true,
        },
      ],
      { id: "job-1", title: "Meridian Gala", live: true },
    );

    assert.equal(summary.liveJobs, 2);
    assert.equal(summary.activeValue, 2050000);
    assert.equal(summary.dueSoon, 2);
    assert.equal(summary.riskJobs, 1);
    assert.equal(summary.nextEvent?.title, "Meridian Gala");
    assert.equal(summary.priorityLabel, "Live now");
  });
});
