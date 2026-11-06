export type ServiceKey = "film" | "brand" | "stage" | "sound" | "decor";
export type VenueType = "studio" | "hall" | "garden" | "church" | "warehouse";
export type EventType =
  | "traditional"
  | "wedding"
  | "birthday"
  | "graduation"
  | "harambee"
  | "corporate"
  | "conference"
  | "concert"
  | "launch"
  | "campaign"
  | "gala"
  | "press"
  | "expo"
  | "team"
  | "private"
  | "naming"
  | "school"
  | "film";
export type TierKey = "signal" | "floor" | "black";

export const PILLAR_LINE = "Randy Production · Film · Events · Branding · Live Production · Nairobi";

export const SERVICES: {
  key: ServiceKey;
  label: string;
  line: string;
}[] = [
  { key: "film", label: "Editorial film", line: "Defining moments in motion" },
  { key: "brand", label: "Brand stories", line: "Identity that earns attention" },
  { key: "stage", label: "Event staging", line: "Immersive, polished show sets" },
  { key: "sound", label: "Live sound", line: "Clean rig, clear mix, lasting impact" },
  { key: "decor", label: "Styled spaces", line: "Rooms people remember" },
];

export const EVENT_TYPES: { key: EventType; label: string; base: number }[] = [
  { key: "traditional", label: "Traditional · ruracio", base: 95000 },
  { key: "wedding", label: "White wedding", base: 140000 },
  { key: "birthday", label: "Birthday · milestone", base: 65000 },
  { key: "graduation", label: "Graduation · send-off", base: 75000 },
  { key: "harambee", label: "Harambee · church", base: 85000 },
  { key: "corporate", label: "Corporate · AGM", base: 160000 },
  { key: "conference", label: "Conference · summit", base: 175000 },
  { key: "concert", label: "Concert · live", base: 320000 },
  { key: "launch", label: "Brand launch", base: 190000 },
  { key: "campaign", label: "Digital campaign", base: 95000 },
  { key: "gala", label: "Gala · awards", base: 185000 },
  { key: "press", label: "Press · PR briefing", base: 70000 },
  { key: "expo", label: "Expo · trade fair", base: 150000 },
  { key: "team", label: "Team · offsite", base: 75000 },
  { key: "private", label: "Sherehe · private", base: 70000 },
  { key: "naming", label: "Naming · shower", base: 45000 },
  { key: "school", label: "School prize day", base: 70000 },
  { key: "film", label: "Film day", base: 120000 },
];

export function eventLabel(key: string): string {
  return EVENT_TYPES.find((e) => e.key === key)?.label ?? key.replace(/_/g, " ");
}

export const GUEST_BANDS = [
  { key: 50, label: "Up to 50", multiplier: 0.85 },
  { key: 150, label: "150", multiplier: 1 },
  { key: 300, label: "300", multiplier: 1.35 },
  { key: 600, label: "600+", multiplier: 1.85 },
];

export const TIERS: {
  key: TierKey;
  label: string;
  multiplier: number;
  note: string;
}[] = [
  { key: "signal", label: "Signal", multiplier: 0.75, note: "Essential rig. One lead. Clean." },
  { key: "floor", label: "Floor", multiplier: 1, note: "Full crew. Look-Through. Pulse on show day." },
  { key: "black", label: "Black", multiplier: 1.6, note: "Flagship. Dual mix. Overnight strike. Film recap." },
];

export const VENUE_TYPES: {
  key: VenueType;
  label: string;
  multiplier: number;
  note: string;
}[] = [
  { key: "studio", label: "Studio / private room", multiplier: 0.9, note: "Controlled venue, faster load-in, simpler power." },
  { key: "hall", label: "Hotel / ballroom", multiplier: 1, note: "Standard event venue with reliable access and power." },
  { key: "garden", label: "Garden / outdoor", multiplier: 1.22, note: "Weather, power and access add complexity." },
  { key: "church", label: "Church / heritage", multiplier: 1.15, note: "Tighter timing and access restrictions." },
  { key: "warehouse", label: "Warehouse / industrial", multiplier: 1.3, note: "Heavier rigging, loading and safety coordination." },
];

export const ADDONS: { key: ServiceKey; label: string; factor: number }[] = [
  { key: "film", label: "Capture crew", factor: 0.45 },
  { key: "brand", label: "Brand wrap", factor: 0.35 },
  { key: "stage", label: "Stage plot", factor: 0.3 },
  { key: "sound", label: "Sound plot", factor: 0.4 },
  { key: "decor", label: "Decor build", factor: 0.55 },
];

export { WORK } from "./portfolio.ts";

export const PACKAGES = [
  {
    id: "pkg_signal_sound",
    name: "Signal Sound",
    services: ["sound"] as ServiceKey[],
    blurb: "Clean PA, one mix, no theatre. House, church, or chama hall.",
  },
  {
    id: "pkg_floor_stage",
    name: "Floor Stage",
    services: ["stage", "sound", "decor"] as ServiceKey[],
    blurb: "The house package. Drape, light, mix — Pulse on the night.",
  },
  {
    id: "pkg_black_gala",
    name: "Black Gala",
    services: ["stage", "sound", "decor", "film"] as ServiceKey[],
    blurb: "Flagship. Dual mix, overnight strike, recap film before breakfast.",
  },
  {
    id: "pkg_look_decor",
    name: "Look-Through Decor",
    services: ["decor"] as ServiceKey[],
    blurb: "We dress the photograph of your room first. Then we dress the room.",
  },
  {
    id: "pkg_harusi",
    name: "Harusi Weekend",
    services: ["stage", "sound", "decor", "film"] as ServiceKey[],
    blurb: "Ruracio Saturday, white wedding Sunday. One crew, two programmes.",
  },
  {
    id: "pkg_brand_drop",
    name: "Integrated launch",
    services: ["brand", "film", "stage"] as ServiceKey[],
    blurb: "Identity, content, and the room — one team from goals to show day.",
  },
  {
    id: "pkg_campaign",
    name: "Digital campaign",
    services: ["brand", "film"] as ServiceKey[],
    blurb: "Creative, capture, and cutdowns that execute the campaign, not just tease it.",
  },
  {
    id: "pkg_pr",
    name: "PR moment",
    services: ["stage", "sound", "film"] as ServiceKey[],
    blurb: "Press briefing to public reveal — run of show, cameras, and the story.",
  },
];

export const MERCH_AREAS: { area: string; count: number; examples: string[] }[] = [
  {
    area: "Branded apparel",
    count: 14,
    examples: ["Polo shirts", "Hoodies", "Caps", "Tote bags", "Branded jackets"],
  },
  {
    area: "Event uniforms",
    count: 9,
    examples: ["Staff tees", "Lanyards", "Hi-vis vests", "Aprons"],
  },
  {
    area: "Print-ready promo kits",
    count: 11,
    examples: ["Flyers", "Posters", "Roll-up banners", "Table tents", "Stickers"],
  },
  {
    area: "VIP & gifting",
    count: 7,
    examples: ["Welcome boxes", "Gift bags", "Custom notebooks", "Branded bottles"],
  },
  {
    area: "Stage & signage",
    count: 6,
    examples: ["Step-and-repeat", "Backdrops", "Directional signs", "LED panels"],
  },
  {
    area: "Digital assets",
    count: 5,
    examples: ["Social templates", "Email headers", "Story frames", "Countdown graphics"],
  },
];

export const MERCH_ADD_ONS: string[] = [
  "Custom packaging",
  "Rush production",
  "On-site distribution",
  "Photography of merch in-use",
  "Post-event inventory report",
  "Sustainable material options",
];
