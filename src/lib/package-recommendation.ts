import {
  GUEST_BANDS,
  PACKAGES,
  type EventType,
  type ServiceKey,
  type TierKey,
  type VenueType,
} from "../data/catalog.ts";

export type PackageFocus = "full-production" | "room-design" | "clear-sound" | "brand-story";

export type PackageMatchInput = {
  eventType: EventType;
  guests: number;
  venueType: VenueType;
  focus: PackageFocus;
  weddingWeekend: boolean;
};

export type PackageRecommendation = {
  packageId: string;
  tier: TierKey;
  services: ServiceKey[];
  reasons: string[];
  planningNote: string;
};

function choosePackage(input: PackageMatchInput): { packageId: string; tier: TierKey } {
  if (input.weddingWeekend && ["wedding", "traditional"].includes(input.eventType)) {
    return { packageId: "pkg_harusi", tier: "black" };
  }
  if (input.focus === "room-design") return { packageId: "pkg_look_decor", tier: "signal" };
  if (input.focus === "clear-sound") return { packageId: "pkg_signal_sound", tier: "signal" };
  if (input.focus === "brand-story") {
    if (input.eventType === "campaign" || input.eventType === "film") {
      return { packageId: "pkg_campaign", tier: "floor" };
    }
    if (input.eventType === "press") return { packageId: "pkg_pr", tier: "floor" };
    return { packageId: "pkg_brand_drop", tier: "floor" };
  }
  if (input.eventType === "launch") return { packageId: "pkg_brand_drop", tier: "floor" };
  if (input.eventType === "campaign" || input.eventType === "film") {
    return { packageId: "pkg_campaign", tier: "floor" };
  }
  if (input.eventType === "press") return { packageId: "pkg_pr", tier: "floor" };

  const highComplexity =
    input.guests >= 300 ||
    input.venueType === "warehouse" ||
    ["concert", "conference", "gala", "expo"].includes(input.eventType);
  return highComplexity
    ? { packageId: "pkg_black_gala", tier: "black" }
    : { packageId: "pkg_floor_stage", tier: "floor" };
}

export function recommendPackage(input: PackageMatchInput): PackageRecommendation {
  const selected = choosePackage(input);
  const pkg = PACKAGES.find((item) => item.id === selected.packageId);
  if (!pkg) throw new Error(`Package recommendation is not configured: ${selected.packageId}`);
  const services = pkg.services;
  const guestLabel = GUEST_BANDS.find((band) => band.key === input.guests)?.label ?? String(input.guests);
  const reasons = [
    `${pkg.name} is built around ${services.map((service) => service.replace(/_/g, " ")).join(", ")}.`,
    input.weddingWeekend
      ? "The two-day wedding setting is better planned as one joined production."
      : input.guests >= 300
        ? `${guestLabel} guests make capacity planning and guest flow more important.`
        : `${guestLabel} guests at a ${input.venueType.replace(/_/g, " ")} venue shape the starting scope.`,
  ];

  if (input.weddingWeekend) reasons.unshift("Both wedding events can be planned as one joined production.");
  else if (input.focus === "room-design") reasons.unshift("You said the room design is the main priority.");
  else if (input.focus === "clear-sound") reasons.unshift("You said clear, reliable sound is the main priority.");
  else if (input.focus === "brand-story") reasons.unshift("You said brand and story are the main priorities.");
  else if (input.eventType === "launch") reasons.unshift("A launch needs the brand story, content and live reveal to work as one.");
  else if (input.eventType === "campaign" || input.eventType === "film") reasons.unshift("This brief is content-led, so capture and brand work lead the package.");
  else if (input.eventType === "press") reasons.unshift("A press moment needs a controlled stage, clean audio and usable coverage.");
  else if (input.focus === "full-production") reasons.unshift("You want one team to coordinate the main production elements.");

  const planningNote =
    input.venueType === "garden"
      ? "Outdoor power, weather cover, access and a wet-weather plan need a venue check before the final scope is confirmed."
      : input.venueType === "warehouse"
        ? "Rigging points, loading access, power and safety requirements need a venue survey before the final scope is confirmed."
        : "Confirm access, schedule and final production requirements with the team before the quote is approved.";

  return {
    packageId: selected.packageId,
    tier: selected.tier,
    services,
    reasons,
    planningNote,
  };
}
