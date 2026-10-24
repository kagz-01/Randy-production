export type ServiceKey = "film" | "brand" | "stage" | "sound" | "decor";
export type EventType = "wedding" | "corporate" | "concert" | "launch" | "private" | "film";
export type TierKey = "signal" | "floor" | "black";

export const SERVICES: {
  key: ServiceKey;
  label: string;
  line: string;
}[] = [
  { key: "film", label: "Film", line: "Campaigns, product, recaps" },
  { key: "brand", label: "Brand", line: "Identity, stills, drop kits" },
  { key: "stage", label: "Stage", line: "Galas, launches, offsites" },
  { key: "sound", label: "Sound", line: "Rig, mix, broadcast" },
  { key: "decor", label: "Decor", line: "Drape, lounge, light" },
];

export const EVENT_TYPES: { key: EventType; label: string; base: number }[] = [
  { key: "wedding", label: "Wedding / vows", base: 4200 },
  { key: "corporate", label: "Corporate gala", base: 5600 },
  { key: "concert", label: "Live / concert", base: 7800 },
  { key: "launch", label: "Brand launch", base: 6400 },
  { key: "private", label: "Private dinner", base: 3100 },
  { key: "film", label: "Film day", base: 5200 },
];

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
  { key: "signal", label: "Signal", multiplier: 0.78, note: "Essential rig. One lead. Clean." },
  { key: "floor", label: "Floor", multiplier: 1, note: "Full crew. Look-Through. Pulse on show day." },
  { key: "black", label: "Black", multiplier: 1.55, note: "Flagship. Dual mix. Overnight strike. Film recap." },
];

export const ADDONS: { key: ServiceKey; label: string; factor: number }[] = [
  { key: "film", label: "Capture crew", factor: 0.32 },
  { key: "brand", label: "Brand wrap", factor: 0.22 },
  { key: "sound", label: "Sound plot", factor: 0.28 },
  { key: "decor", label: "Decor build", factor: 0.38 },
];

export const WORK = [
  {
    id: "atelier",
    title: "Atelier Noir",
    service: "brand" as ServiceKey,
    year: "2026",
    outcome: "Launch cycle 6 weeks → 11 days",
    image: "/images/work-brand.jpg",
    stills: ["/images/work-brand.jpg", "/images/work-film.jpg"],
    logline: "A black-silk drop for a perfume house that wanted silence, not slogans.",
  },
  {
    id: "meridian",
    title: "Meridian Gala",
    service: "stage" as ServiceKey,
    year: "2026",
    outcome: "420 seated, 11-minute changeover",
    image: "/images/hero-gala.jpg",
    stills: ["/images/hero-gala.jpg", "/images/venue-after.jpg"],
    logline: "Bank gala in a vault. Blue as the only colour that was allowed to speak.",
  },
  {
    id: "kasa",
    title: "Kasa rooftop",
    service: "decor" as ServiceKey,
    year: "2026",
    outcome: "Setup time −30%",
    image: "/images/work-wedding.jpg",
    stills: ["/images/work-wedding.jpg", "/images/work-decor.jpg"],
    logline: "Vows above the city. Look-Through locked the lounge before a drape went up.",
  },
  {
    id: "lowend",
    title: "Low End Theory",
    service: "sound" as ServiceKey,
    year: "2026",
    outcome: "11 hrs rigged, zero dropouts",
    image: "/images/work-sound.jpg",
    stills: ["/images/work-sound.jpg"],
    logline: "Outdoor line array, broadcast split, and a mix that held the low end.",
  },
  {
    id: "orion",
    title: "Orion Time",
    service: "film" as ServiceKey,
    year: "2026",
    outcome: "18 shots, one take-home film",
    image: "/images/work-film.jpg",
    stills: ["/images/work-film.jpg", "/images/work-brand.jpg"],
    logline: "A watch, a void, a Venice. Product cinema without a boardroom voiceover.",
  },
  {
    id: "sable",
    title: "Sable House",
    service: "decor" as ServiceKey,
    year: "2026",
    outcome: "70 covers, two-room flip",
    image: "/images/work-decor.jpg",
    stills: ["/images/work-decor.jpg", "/images/venue-after.jpg"],
    logline: "Dinner that felt like a private club. Black velvet, white marble, one blue line.",
  },
];

export const TEAM = [
  {
    id: "randy",
    name: "Randy Okello",
    role: "Director",
    line: "I run the floor. 240 rooms dressed. I still walk in first.",
    image: "/images/team-randy.jpg",
  },
  {
    id: "amara",
    name: "Amara Njoroge",
    role: "Sound",
    line: "I run sound. Three hundred shows. If you hear it, I already heard it twice.",
    image: "/images/team-amara.jpg",
  },
  {
    id: "leo",
    name: "Leo Mensah",
    role: "Decor",
    line: "I dress rooms. Raw to black-tie is a geometry problem, not a mood board.",
    image: "/images/work-decor.jpg",
  },
  {
    id: "sanaa",
    name: "Sanaa Reid",
    role: "Film",
    line: "I shoot the proof. If it did not happen on camera, it did not ship.",
    image: "/images/work-film.jpg",
  },
];

export const OUTCOMES = [
  { client: "Atelier Noir", line: "Cut launch film cycle from 6 weeks to 11 days." },
  { client: "Meridian Bank", line: "420-cover gala, 11-minute room changeover." },
  { client: "Kasa & Imani", line: "Look-Through cut decor setup by 30%." },
  { client: "NBO Sessions", line: "900-cap outdoor, zero RF dropouts." },
  { client: "Helix Labs", line: "Offsite brand kit live in 72 hours." },
  { client: "Orion Time", line: "Product film that outsold the lookbook." },
];

export const TIMELINE = [
  { date: "Mar 2026", title: "Low End Theory", service: "sound" as ServiceKey, stat: "11h rig" },
  { date: "Apr 2026", title: "Kasa rooftop vows", service: "decor" as ServiceKey, stat: "−30% setup" },
  { date: "Jun 2026", title: "Atelier Noir drop", service: "brand" as ServiceKey, stat: "11-day film" },
  { date: "Sep 2026", title: "Meridian Gala", service: "stage" as ServiceKey, stat: "Live tonight" },
];

export const PACKAGES = [
  {
    id: "pkg_signal_sound",
    name: "Signal Sound",
    services: ["sound"] as ServiceKey[],
    blurb: "Clean PA, one mix, no theatre. For rooms that already know who they are.",
  },
  {
    id: "pkg_floor_stage",
    name: "Floor Stage",
    services: ["stage", "sound", "decor"] as ServiceKey[],
    blurb: "The house package. Drape, light, mix, Pulse on the night.",
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
    id: "pkg_brand_drop",
    name: "Brand Drop",
    services: ["brand", "film"] as ServiceKey[],
    blurb: "Stills, motion, lockups. A campaign that does not need a paragraph.",
  },
];

export const STATS = [
  { value: 247, label: "events delivered", suffix: "" },
  { value: 1200, label: "hours of sound rigged", suffix: "+" },
  { value: 40, label: "brand campaigns shipped", suffix: "" },
  { value: 18, label: "rooms flipped overnight", suffix: "" },
];
