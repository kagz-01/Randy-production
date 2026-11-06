import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recommendPackage } from "./package-recommendation.ts";

describe("recommendPackage", () => {
  it("recommends the joined wedding package only for a multi-day wedding brief", () => {
    const result = recommendPackage({
      eventType: "traditional",
      guests: 150,
      venueType: "garden",
      focus: "full-production",
      weddingWeekend: true,
    });

    assert.equal(result.packageId, "pkg_harusi");
    assert.equal(result.tier, "black");
    assert.match(result.planningNote, /weather cover/i);
  });

  it("routes brand launches to the integrated launch package", () => {
    const result = recommendPackage({
      eventType: "launch",
      guests: 300,
      venueType: "hall",
      focus: "brand-story",
      weddingWeekend: false,
    });

    assert.equal(result.packageId, "pkg_brand_drop");
    assert.deepEqual(result.services, ["brand", "film", "stage"]);
  });

  it("respects the selected primary need even when an event has a typical package", () => {
    const result = recommendPackage({
      eventType: "launch",
      guests: 150,
      venueType: "hall",
      focus: "room-design",
      weddingWeekend: false,
    });

    assert.equal(result.packageId, "pkg_look_decor");
    assert.ok(result.reasons.some((reason) => reason.includes("room design is the main priority")));
  });

  it("matches an intimate sound-led brief to the sound package", () => {
    const result = recommendPackage({
      eventType: "birthday",
      guests: 50,
      venueType: "studio",
      focus: "clear-sound",
      weddingWeekend: false,
    });

    assert.equal(result.packageId, "pkg_signal_sound");
    assert.deepEqual(result.services, ["sound"]);
  });

  it("scales a large or technically complex full-production brief up", () => {
    const result = recommendPackage({
      eventType: "corporate",
      guests: 600,
      venueType: "warehouse",
      focus: "full-production",
      weddingWeekend: false,
    });

    assert.equal(result.packageId, "pkg_black_gala");
    assert.ok(result.services.length > 0);
    assert.ok(result.reasons.some((reason) => reason.includes("capacity planning and guest flow")));
  });
});
