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

export const AGENCY_PILLARS = [
  { key: "media", label: "Media production", line: "Film, photo, and content that captures defining moments." },
  { key: "events", label: "Event planning & management", line: "Large-scale to intimate — designed, run, and remembered." },
  { key: "branding", label: "Branding", line: "Identity systems that build trust and strengthen brands." },
  { key: "digital", label: "Digital marketing", line: "Campaigns executed end to end, not just pretty posts." },
  { key: "pr", label: "Public relations", line: "Stories, launches, and moments that earn attention." },
] as const;

export const PILLAR_LINE = "Randy Production · Media Production · Events · Branding · Digital · PR · Nairobi";

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

export const WORK = [
  {
    id: "garden-vows",
    title: "Garden Vows",
    service: "decor" as ServiceKey,
    year: "2026",
    event: "Wedding storytelling",
    outcome: "140 guests · soft ritual lighting",
    image: "/catalog/wedding/GRA08375.webp",
    stills: [
      "/catalog/wedding/GRA08375.webp",
      "/catalog/wedding/_MG_9277.webp",
      "/catalog/wedding/IMG_9335.webp",
    ],
    logline: "A romantic garden ceremony built with layered florals, pale fabrics and a warm dusk palette.",
    storyTitle: "A garden ceremony shaped by light, ritual and bloom.",
    storyBody: [
      "Garden Vows was designed as a romantic outdoor celebration that feels intimate, elevated and deeply personal. Layered florals, soft draping and warm evening tones create a ceremony that feels timeless while still contemporary.",
      "Every detail was composed to carry emotion through the space — from the soft palette to the natural textures that frame the couple as they step into a new chapter together.",
    ],
    tags: ["Wedding", "Garden", "Decor", "Luxury Styling"],
  },
  {
    id: "mama-joy",
    title: "Mama Joy",
    service: "decor" as ServiceKey,
    year: "2026",
    event: "Celebration portraiture",
    outcome: "Portrait styling · full-day flow",
    image: "/catalog/baby-shower/IMG_2674.webp",
    stills: [
      "/catalog/baby-shower/IMG_2674.webp",
      "/catalog/baby-shower/IMG_2692.webp",
      "/catalog/baby-shower/IMG_9743.webp",
    ],
    logline: "An elevated maternity concept with soft neutrals, luxury textures and confident portrait composition.",
    storyTitle: "A celebration of motherhood, strength and new beginnings.",
    storyBody: [
      "Mama Joy is a heartwarming maternity campaign designed to capture the beauty, grace and confidence of expectant mothers. The concept blends soft, neutral tones with luxury textures, creating a calm and elegant visual narrative that feels both modern and timeless.",
      "Through carefully composed portraits and natural storytelling, the campaign highlights the joy, strength and anticipation that come with motherhood.",
    ],
    tags: ["Maternity", "Lifestyle", "Portrait", "Brand Campaign"],
  },
  {
    id: "silver-lantern",
    title: "Silver Lantern",
    service: "stage" as ServiceKey,
    year: "2025",
    event: "Private ceremonies",
    outcome: "Lounge ceremony · atmosphere-first design",
    image: "/catalog/wedding/_MG_9277.webp",
    stills: [
      "/catalog/wedding/_MG_9277.webp",
      "/catalog/wedding/GRA08375.webp",
      "/catalog/wedding/_MG_9281.webp",
    ],
    logline: "A tailored ceremony set designed around clean staging, polished draping and light-led emotion.",
    storyTitle: "A quiet ceremony set with polished detail and warm light.",
    storyBody: [
      "Silver Lantern was built around an intimate, atmosphere-first ceremony experience. Clean staging, layered fabric textures and a restrained palette keep the focus on quiet emotion and thoughtful guest flow.",
      "The setup balances elegance and simplicity, turning the ceremony into a space that feels both ceremonial and deeply personal.",
    ],
    tags: ["Ceremony", "Stage", "Private Event", "Atmosphere"],
  },
  {
    id: "glass-tent",
    title: "Glass Tent",
    service: "decor" as ServiceKey,
    year: "2025",
    event: "Private gatherings",
    outcome: "Outdoor event tent · guest styling",
    image: "/catalog/decor/IMG_0953.webp",
    stills: [
      "/catalog/decor/IMG_0953.webp",
      "/catalog/decor/_MG_9810.webp",
      "/catalog/decor/_MG_9907.webp",
    ],
    logline: "A bright garden marquee with sculpted furniture lines, minimal drama and strong guest flow.",
    storyTitle: "A relaxed outdoor gathering shaped by texture, clarity and ease.",
    storyBody: [
      "Glass Tent was designed for a refined outdoor gathering where guest movement, comfort and visual calm mattered as much as the styling. The palette stays fresh and airy while the furniture lines bring structure and intention.",
      "The result is a social space that feels polished, open and welcoming without ever losing the sense of intimacy.",
    ],
    tags: ["Outdoor", "Decor", "Private Gathering", "Guest Flow"],
  },
  {
    id: "night-pulse",
    title: "Night Pulse",
    service: "stage" as ServiceKey,
    year: "2026",
    event: "Live performance",
    outcome: "High-energy lighting · crowd-first stage",
    image: "/catalog/concert/GRA00269.webp",
    stills: [
      "/catalog/concert/GRA00269.webp",
      "/catalog/concert/GRA00392.webp",
      "/catalog/concert/GRA00813.webp",
    ],
    logline: "A live show build that blends intense colour, clean sightlines and stage moments built for performance.",
    storyTitle: "An electrified stage build for movement, sound and impact.",
    storyBody: [
      "Night Pulse brings together immersive lighting, stage architecture and a clear performance rhythm. The design focuses on momentum and crowd energy while keeping every visual cue intentional and readable from the floor.",
      "The set is built to sustain excitement across the night, making each transition feel sharp, cinematic and emotionally charged.",
    ],
    tags: ["Live Show", "Stage", "Lighting", "Performance"],
  },
  {
    id: "villa-rhythm",
    title: "Villa Rhythm",
    service: "decor" as ServiceKey,
    year: "2026",
    event: "Luxe birthdays",
    outcome: "Garden dinner · lounge detail styling",
    image: "/catalog/decor/_MG_9907.webp",
    stills: [
      "/catalog/decor/_MG_9907.webp",
      "/catalog/decor/IMG_1001.webp",
      "/catalog/decor/IMG_1006.webp",
    ],
    logline: "A warm intimate celebration with layered textures, florals, and a relaxed social rhythm.",
    storyTitle: "A warm villa gathering built for conversation, texture and ease.",
    storyBody: [
      "Villa Rhythm is a relaxed luxury birthday setting designed around warmth, movement and social flow. Layered textures, florals and tactile styling create a space that feels collected rather than staged.",
      "The room settles into a natural rhythm — soft light, layered details and comfortable seating that hold the energy of the evening without distraction.",
    ],
    tags: ["Birthday", "Villa", "Lounge", "Social Styling"],
  },
];

export const TEAM = [
  {
    id: "randy",
    name: "Randy Okello",
    role: "Director",
    line: "I run the floor. 240 rooms dressed. I still walk in first.",
    image: "/images/team-randy.jpg",
    video: "/videos/hero.mp4",
  },
  {
    id: "amara",
    name: "Amara Njoroge",
    role: "Sound",
    line: "I run sound. Three hundred shows. If you hear it, I already heard it twice.",
    image: "/images/team-amara.jpg",
    video: "/videos/hero.mp4",
  },
  {
    id: "leo",
    name: "Leo Mensah",
    role: "Decor",
    line: "I dress rooms. Raw to black-tie is a geometry problem, not a mood board.",
    image: "/images/work-decor.jpg",
    video: "/videos/hero.mp4",
  },
  {
    id: "sanaa",
    name: "Sanaa Reid",
    role: "Film",
    line: "I shoot the proof. If it did not happen on camera, it did not ship.",
    image: "/images/work-film.jpg",
    video: "/videos/hero.mp4",
  },
] as const;

export const OUTCOMES = [
  { client: "Atelier Noir", line: "Cut launch film cycle from 6 weeks to 11 days." },
  { client: "Meridian Bank", line: "420-cover gala, 11-minute room changeover." },
  { client: "Kasa & Imani", line: "Look-Through cut decor setup by 30%." },
  { client: "Ngugi family", line: "Ruracio tents for 280 — programme never slipped." },
  { client: "NBO Sessions", line: "900-cap outdoor, zero RF dropouts." },
  { client: "Helix Labs", line: "PR moment live on feed in 72 hours." },
];

export const TIMELINE = [
  { date: "Mar 2026", title: "Low End Theory", service: "sound" as ServiceKey, stat: "11h rig" },
  { date: "Apr 2026", title: "Kasa rooftop vows", service: "decor" as ServiceKey, stat: "−30% setup" },
  { date: "Jun 2026", title: "Atelier Noir drop", service: "brand" as ServiceKey, stat: "11-day film" },
  { date: "Aug 2026", title: "Ngugi hills ruracio", service: "decor" as ServiceKey, stat: "280 seated" },
  { date: "Sep 2026", title: "Meridian Gala", service: "stage" as ServiceKey, stat: "Live tonight" },
];

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

export const STATS = [
  { value: 247, label: "events delivered", suffix: "" },
  { value: 1200, label: "hours of sound rigged", suffix: "+" },
  { value: 40, label: "brand campaigns shipped", suffix: "" },
  { value: 18, label: "rooms flipped overnight", suffix: "" },
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
