import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeCaseForge } from "./case-forge.ts";

describe("summarizeCaseForge", () => {
  it("builds a publish-ready case summary from a delivered job", () => {
    const summary = summarizeCaseForge({
      id: "job_123",
      title: "Northwind Launch",
      client_name: "Northwind",
      service: "brand",
      guests: 420,
      venue: "Sky Deck",
      event_type: "launch",
      status: "delivered",
      ballpark: 850000,
    });

    assert.equal(summary.title, "Northwind Launch");
    assert.equal(summary.result, "420 guest touchpoints");
    assert.ok(summary.tags.includes("brand"));
    assert.ok(summary.summary.includes("Northwind"));
    assert.ok(summary.highlights.some((item) => item.label === "Guest flow"));
    assert.ok(summary.highlights.some((item) => item.label === "Brand story"));
  });
});
