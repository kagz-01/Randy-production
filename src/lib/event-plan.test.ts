import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_EVENT_PLAN,
  EVENT_PLAN_HANDOFF_STORAGE_KEY,
  EVENT_PLAN_STORAGE_KEY,
  buildEventPlanHandoff,
  isValidEventDate,
  parseEventPlanHandoff,
  parseEventPlanDraft,
} from "./event-plan.ts";

describe("event planner draft", () => {
  it("round-trips an event brief and room focal points", () => {
    const plan = {
      ...DEFAULT_EVENT_PLAN,
      eventType: "launch" as const,
      guests: 300,
      title: "Product launch",
      eventDate: "2027-03-12",
      venueName: "KICC",
      objective: "Make the product reveal memorable.",
      creativeNotes: "Warm light around the launch wall.",
      moodId: "dramatic" as const,
      focalPoints: [{ kind: "stage" as const, x: 52.5, y: 33 }],
    };

    assert.ok(EVENT_PLAN_STORAGE_KEY.length > 0);
    assert.deepEqual(parseEventPlanDraft(JSON.stringify(plan)), plan);
  });

  it("restores older drafts without bringing quote-only choices into the creative brief", () => {
    const restored = parseEventPlanDraft(JSON.stringify({
      ...DEFAULT_EVENT_PLAN,
      venueType: "garden",
      tier: "black",
      services: ["brand"],
      objective: "A relaxed outdoor ceremony.",
    }));

    assert.deepEqual(restored, {
      ...DEFAULT_EVENT_PLAN,
      objective: "A relaxed outdoor ceremony.",
    });
  });

  it("rejects malformed, oversized, and unsupported saved data", () => {
    assert.equal(parseEventPlanDraft("{"), null);
    assert.equal(parseEventPlanDraft(JSON.stringify({ ...DEFAULT_EVENT_PLAN, guests: 999 })), null);
    assert.equal(parseEventPlanDraft(JSON.stringify({ ...DEFAULT_EVENT_PLAN, title: "x".repeat(101) })), null);
    assert.equal(parseEventPlanDraft(JSON.stringify({
      ...DEFAULT_EVENT_PLAN,
      focalPoints: [{ kind: "stage", x: 120, y: 20 }],
    })), null);
    assert.equal(parseEventPlanDraft(JSON.stringify({ ...DEFAULT_EVENT_PLAN, eventDate: "2027-02-31" })), null);
    assert.equal(parseEventPlanDraft(JSON.stringify({
      ...DEFAULT_EVENT_PLAN,
      focalPoints: Array.from({ length: 9 }, () => ({ kind: "stage", x: 50, y: 50 })),
    })), null);
  });

  it("recognizes real calendar dates", () => {
    assert.equal(isValidEventDate("2028-02-29"), true);
    assert.equal(isValidEventDate("2027-02-29"), false);
  });
});

describe("buildEventPlanHandoff", () => {
  it("carries creative context into the quote without deciding production scope", () => {
    const handoff = buildEventPlanHandoff({
      ...DEFAULT_EVENT_PLAN,
      eventType: "wedding",
      guests: 300,
      title: "Njeri and Kairo",
      eventDate: "2027-06-05",
      venueName: "Nairobi Arboretum",
      objective: "A relaxed outdoor ceremony.",
      creativeNotes: "Keep a covered plan for rain.",
      moodId: "garden",
      focalPoints: [{ kind: "welcome", x: 20, y: 45 }],
    });

    assert.deepEqual(
      {
        eventType: handoff.search.eventType,
        guests: handoff.search.guests,
        plannerHandoff: handoff.search.plannerHandoff,
      },
      {
        eventType: "wedding",
        guests: 300,
        plannerHandoff: "1",
      },
    );
    assert.ok(EVENT_PLAN_HANDOFF_STORAGE_KEY.length > 0);
    assert.equal(JSON.stringify(handoff.search).includes("Nairobi Arboretum"), false);
    assert.equal(JSON.stringify(handoff.search).includes("covered plan for rain"), false);
    const restoredDetails = parseEventPlanHandoff(JSON.stringify(handoff.details));
    assert.equal(restoredDetails?.title, "Njeri and Kairo");
    assert.equal(restoredDetails?.venue, "Nairobi Arboretum");
    assert.equal(restoredDetails?.date, "2027-06-05");
    assert.match(restoredDetails?.message ?? "", /A relaxed outdoor ceremony/);
    assert.match(restoredDetails?.message ?? "", /covered plan for rain/);
    assert.match(restoredDetails?.message ?? "", /Guest welcome/);
    assert.match(restoredDetails?.message ?? "", /not a confirmed floor plan/);
  });

  it("rejects invalid session handoff details", () => {
    assert.equal(parseEventPlanHandoff("{"), null);
    assert.equal(parseEventPlanHandoff(JSON.stringify({ message: "x".repeat(2_001) })), null);
    assert.equal(parseEventPlanHandoff(JSON.stringify({ date: "not-a-date", message: "Brief" })), null);
  });
});
