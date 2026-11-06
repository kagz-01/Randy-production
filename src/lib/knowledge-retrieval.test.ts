import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankKnowledge, type KnowledgeMatch } from "./knowledge-retrieval.ts";

const entries: KnowledgeMatch[] = [
  {
    id: "weather",
    title: "Outdoor event weather plan",
    content: "Check county weather forecasts and heavy rainfall warnings.",
    tags: "outdoor, weather, rain, garden, forecast",
    source_name: "Kenya Meteorological Department",
    source_url: "https://meteo.go.ke/",
    source_checked_at: "2026-10-31",
    jurisdiction: "Kenya",
    evidence_type: "official_guidance",
  },
  {
    id: "crowd",
    title: "Large gathering risk assessment",
    content: "Plan emergency and health readiness for large gatherings.",
    tags: "large-event, risk-assessment, emergency, health",
    source_name: "World Health Organization",
    source_url: "https://who.int/",
    source_checked_at: "2026-10-31",
    jurisdiction: "International",
    evidence_type: "official_guidance",
  },
];

describe("rankKnowledge", () => {
  it("ranks outdoor weather guidance for a garden event", () => {
    const result = rankKnowledge(entries, {
      eventType: "wedding",
      venueType: "garden",
      focus: "full-production",
      guests: 150,
      weddingWeekend: false,
    });

    assert.equal(result[0]?.id, "weather");
  });

  it("includes high-complexity event guidance for a large event", () => {
    const result = rankKnowledge(entries, {
      eventType: "concert",
      venueType: "hall",
      focus: "full-production",
      guests: 600,
      weddingWeekend: false,
    });

    assert.equal(result[0]?.id, "crowd");
  });

  it("returns no irrelevant material when nothing matches", () => {
    const unrelated = entries.map((entry) => ({ ...entry, title: "Décor colour notes", content: "", tags: "floral" }));

    assert.deepEqual(
      rankKnowledge(unrelated, {
        eventType: "launch",
        venueType: "studio",
        focus: "brand-story",
        guests: 50,
        weddingWeekend: false,
      }),
      [],
    );
  });

  it("does not return generic planning copy as a relevance match", () => {
    const generic = entries.map((entry) => ({
      ...entry,
      title: "Production planning",
      content: "General event planning notes.",
      tags: "planning",
    }));

    assert.deepEqual(
      rankKnowledge(generic, {
        eventType: "wedding",
        venueType: "hall",
        focus: "full-production",
        guests: 150,
      }),
      [],
    );
  });
});
