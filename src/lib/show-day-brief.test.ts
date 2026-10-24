import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeShowDayBrief } from "./show-day-brief.ts";

describe("summarizeShowDayBrief", () => {
  it("flags a ready-show window and highlights open actions for a live event", () => {
    const summary = summarizeShowDayBrief({
      title: "Northwind Launch",
      status: "production",
      event_date: "2027-03-15T18:00:00.000Z",
      venue: "Sky Deck",
      guests: 120,
      ballpark: 850000,
    });

    assert.equal(summary.readiness, "ready");
    assert.equal(summary.remainingOpen, 0);
    assert.ok(summary.cues.some((cue) => cue.label === "Guest flow"));
    assert.ok(summary.cues.some((cue) => cue.label === "Load-in"));
    assert.ok(summary.cues.some((cue) => cue.label === "Strike"));
  });

  it("moves an event to watch when the venue or approvals are still open", () => {
    const summary = summarizeShowDayBrief({
      title: "Meridian Gala",
      status: "booked",
      event_date: "2027-03-15T18:00:00.000Z",
      venue: null,
      guests: 240,
      ballpark: 1200000,
    });

    assert.equal(summary.readiness, "watch");
    assert.equal(summary.remainingOpen, 4);
    assert.ok(summary.cues.some((cue) => cue.label === "Venue confirmation"));
  });
});
