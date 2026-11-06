import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeStudioHome } from "./studio-home-summary.ts";

function eventDate(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function job(
  id: string,
  status: string,
  eventDateValue: string | null,
  venue: string | null = "Sky Deck",
  ballpark = 1_000,
) {
  return {
    id,
    owner_user_id: null,
    title: id,
    client_name: "Client",
    service: "event",
    event_type: "gala",
    guests: 100,
    tier: "premium",
    status,
    venue,
    event_date: eventDateValue,
    ballpark,
    notes: null,
    is_showcase: false,
  };
}

describe("summarizeStudioHome", () => {
  it("keeps past-dated active work out of the upcoming show slot and prioritizes closeout", () => {
    const summary = summarizeStudioHome([
      job("past-show", "production", eventDate(-3)),
      job("next-show", "booked", eventDate(12), null),
      job("delivered-show", "delivered", eventDate(-30)),
    ]);

    assert.equal(summary.liveJobs, 2);
    assert.equal(summary.dueSoon, 1);
    assert.deepEqual(summary.overdueJobs.map(({ id }) => id), ["past-show"]);
    assert.equal(summary.nextEvent?.id, "next-show");
    assert.equal(summary.actionItems[0]?.job.id, "past-show");
    assert.equal(summary.actionItems[0]?.priority, "urgent");
  });

  it("orders show-readiness gaps before leads and combines missing production details", () => {
    const summary = summarizeStudioHome([
      job("lead", "quoted", null),
      job("incomplete", "booked", null, "TBC", 0),
      job("complete", "production", eventDate(10)),
    ]);

    assert.equal(summary.nextEvent?.id, "complete");
    assert.deepEqual(summary.actionItems.map(({ job: row }) => row.id), ["incomplete", "lead"]);
    assert.equal(summary.actionItems[0]?.detail, "Confirm venue, event date, budget");
    assert.equal(summary.actionItems[1]?.priority, "follow-up");
  });
});
