import { CATALOG_IMAGE_PATHS } from "./catalog-image-paths.ts";
import type { ServiceKey } from "./catalog.ts";

type PortfolioStoryDefinition = {
  id: string;
  title: string;
  service: ServiceKey;
  event: string;
  logline: string;
  storyTitle: string;
  storyBody: readonly [string, string];
  tags: readonly string[];
  includes: (imagePath: string) => boolean;
  sortImages?: (images: string[]) => string[];
};

function isInFolder(imagePath: string, folder: string): boolean {
  return imagePath.startsWith(`/catalog/${folder}/`);
}

function isInFiles(imagePath: string, folder: string, fileNames: readonly string[]): boolean {
  return isInFolder(imagePath, folder) && fileNames.includes(fileName(imagePath));
}

function fileName(imagePath: string): string {
  return imagePath.slice(imagePath.lastIndexOf("/") + 1);
}

function putFirst(images: string[], heroFileName: string): string[] {
  return [...images].sort(
    (left, right) => Number(fileName(right) === heroFileName) - Number(fileName(left) === heroFileName),
  );
}

function numberedFile(imagePath: string): number | null {
  const match = fileName(imagePath).match(/(\d+)\.webp$/);
  return match ? Number(match[1]) : null;
}

const pinkWeddingNumber = (imagePath: string): number => {
  const number = numberedFile(imagePath);
  return number !== null && number < 1000 ? number + 10_000 : number ?? 0;
};

const curatedFiles = {
  waterfrontCanopy: [
    "IMG_0953.webp", "IMG_0955.webp", "IMG_0957.webp", "IMG_0960.webp",
    "IMG_0962.webp", "IMG_0964.webp", "IMG_0988.webp", "IMG_0991.webp",
    "IMG_0994.webp", "IMG_1001.webp", "IMG_1003.webp", "IMG_1005.webp",
    "IMG_1010.webp", "IMG_1012.webp", "IMG_1019.webp", "IMG_1022.webp",
  ],
  roseLightReception: [
    "_MG_9810.webp", "_MG_9813.webp", "_MG_9814.webp", "_MG_9821.webp",
    "_MG_9823.webp", "_MG_9829.webp", "_MG_9836.webp", "_MG_9838.webp",
    "_MG_9842.webp", "_MG_9845.webp", "_MG_9856.webp", "_MG_9868.webp",
    "_MG_9879.webp", "_MG_9883.webp", "_MG_9907.webp", "_MG_9973.webp",
  ],
  blushWedding: [
    "_MG_9919.webp", "_MG_9926.webp", "_MG_9930.webp", "_MG_9944.webp",
    "_MG_9945.webp", "_MG_9949.webp", "_MG_9950.webp", "_MG_9957.webp",
    "_MG_9958.webp", "_MG_9962.webp", "_MG_9968.webp", "_MG_9976.webp",
    "_MG_9978.webp", "_MG_9993.webp", "_MG_0024.webp", "_MG_0036.webp",
    "_MG_0086.webp", "_MG_0122.webp",
  ],
  beforeTheVows: [
    "_MG_9232.webp", "_MG_9237.webp", "_MG_9250.webp", "_MG_9256.webp",
    "_MG_9265.webp", "_MG_9269.webp", "_MG_9275.webp", "_MG_9285.webp",
    "_MG_9287.webp", "_MG_9292.webp", "_MG_9335.webp", "_MG_9386.webp",
    "_MG_9424.webp", "_MG_9644.webp", "_MG_9689.webp", "_MG_9695.webp",
    "_MG_9719.webp", "_MG_9806.webp",
  ],
  blueStageCeremony: [
    "IMG_8850.webp", "IMG_9054.webp", "IMG_9133.webp", "IMG_9145.webp",
    "IMG_9181.webp", "IMG_9195.webp", "IMG_9235.webp", "IMG_9281.webp",
    "IMG_9299.webp", "IMG_9304.webp", "IMG_9311.webp", "IMG_9330.webp",
    "IMG_9335.webp", "IMG_9341.webp", "IMG_9344.webp", "IMG_9478.webp",
  ],
  woodlandWedding: [
    "GRA08127.webp", "GRA08131.webp", "GRA08140.webp", "GRA08147.webp",
    "GRA08172.webp", "GRA08198.webp", "GRA08249.webp", "GRA08263.webp",
    "GRA08269.webp", "GRA08280.webp", "GRA08299.webp", "GRA08310.webp",
    "GRA08318.webp", "GRA08339.webp", "GRA08344.webp", "GRA08356.webp",
    "GRA08389.webp", "IMG_9653.webp", "IMG_9675.webp", "IMG_9993.webp",
  ],
  langataMatchday: [
    "IMG_8880.webp", "IMG_8901.webp", "IMG_8940.webp", "IMG_8980.webp",
    "IMG_9144.webp", "IMG_9151.webp", "IMG_9196.webp", "IMG_9206.webp",
    "IMG_9281.webp", "IMG_9375.webp", "IMG_9534.webp", "IMG_9598.webp",
    "IMG_9607.webp", "IMG_9634.webp", "IMG_9712.webp", "IMG_9777.webp",
  ],
  pinnovateFootball: [
    "IMG_1335.webp", "IMG_1304.webp", "IMG_1305.webp", "IMG_1366.webp",
    "IMG_1373.webp", "IMG_1417.webp", "IMG_1444.webp", "IMG_1491.webp",
    "IMG_1556.webp", "IMG_1643.webp", "IMG_1662.webp", "IMG_1683.webp",
    "IMG_1704.webp", "IMG_1760.webp", "IMG_1789.webp", "IMG_1820.webp",
  ],
  nairobiBikeRace: [
    "DSC08234.webp", "DSC07680.webp", "DSC07783.webp", "DSC07794.webp",
    "DSC07888.webp", "DSC08187.webp", "DSC08189.webp", "DSC08225.webp",
    "DSC08236.webp", "DSC08243.webp", "DSC08266.webp", "DSC08298.webp",
    "DSC08300.webp", "DSC08309.webp", "DSC08318.webp", "DSC08325.webp",
  ],
} as const;

const definitions: PortfolioStoryDefinition[] = [
  {
    id: "garden-of-expectation",
    title: "A Season of Expectation",
    service: "film",
    event: "Maternity portraits",
    logline: "An outdoor portrait series built around quiet confidence, family and the anticipation of a new arrival.",
    storyTitle: "A personal portrait, held in natural light.",
    storyBody: [
      "The frames move between solo portraits and time with loved ones, keeping the focus on the mother-to-be and the people sharing this season with her.",
      "Greenery and open shade give the series a relaxed setting. The simple white look keeps the images connected without making the moment feel over-produced.",
    ],
    tags: ["Maternity", "Portraits", "Family", "Outdoor"],
    includes: (imagePath) => isInFolder(imagePath, "baby-shower"),
  },
  {
    id: "live-stage-collection",
    title: "Colour on the Stage",
    service: "stage",
    event: "Live performance",
    logline: "A collection of close performer portraits, full-stage moments and changing concert light.",
    storyTitle: "Performance, seen from the stage edge.",
    storyBody: [
      "This live-music collection is told through what the images show: artists in the spotlight, instruments in motion, and the colour shifts that change the feel of a stage.",
      "The photographs are presented as a set of live-performance moments rather than attributed to a single named event or client.",
    ],
    tags: ["Live Music", "Performance", "Stage", "Lighting"],
    includes: (imagePath) =>
      isInFolder(imagePath, "concert") &&
      /^GRA00(?:269|277|301|334|392|396|470|594|763|796|813|823|898)\.webp$/.test(fileName(imagePath)),
  },
  {
    id: "red-light-performance",
    title: "Under Red Light",
    service: "stage",
    event: "Live performance",
    logline: "Three close frames hold a singer's movement against a saturated red stage wash.",
    storyTitle: "A small set with a strong stage colour.",
    storyBody: [
      "The sequence stays close to the performer, letting the gesture, expression and red lighting carry the images.",
      "Keeping these related frames together gives the performance its own clear identity in the larger live-music archive.",
    ],
    tags: ["Live Music", "Performer Portrait", "Red Light"],
    includes: (imagePath) =>
      isInFolder(imagePath, "concert") && /^GRA009(?:39|42|44)\.webp$/.test(fileName(imagePath)),
  },
  {
    id: "stage-and-crowd",
    title: "Stage to Crowd",
    service: "stage",
    event: "Open-air performance",
    logline: "Wide views of the stage and audience show the scale and shared energy of an outdoor performance.",
    storyTitle: "The audience is part of the picture.",
    storyBody: [
      "This short set moves between people on stage and the crowd gathered in front of it, giving the performance a sense of place without inventing a venue or event name.",
      "The wider frames make the scale visible; the closer moments bring the viewer back into the live atmosphere.",
    ],
    tags: ["Open Air", "Live Music", "Audience", "Stage"],
    includes: (imagePath) =>
      isInFolder(imagePath, "concert") &&
      !/^GRA00(?:269|277|301|334|392|396|470|594|763|796|813|823|898)\.webp$/.test(fileName(imagePath)) &&
      !/^GRA009(?:39|42|44)\.webp$/.test(fileName(imagePath)),
  },
  {
    id: "waterfront-canopy",
    title: "A Canopy by the Water",
    service: "decor",
    event: "Outdoor ceremony",
    logline: "A white-draped garden setting photographed from the empty ceremony space through to the gathering.",
    storyTitle: "Open air, soft drape and a clear aisle.",
    storyBody: [
      "The photographs show a ceremony layout under layered white fabric, with rows of white chairs set on the lawn and water visible beyond the ceremony space.",
      "Wide venue views sit alongside the aisle, seating and ceremony moments, so the gallery keeps the relationship between the setting and the occasion intact.",
    ],
    tags: ["Outdoor Ceremony", "Canopy", "White Drape", "Guest Layout"],
    includes: (imagePath) => isInFiles(imagePath, "decor", curatedFiles.waterfrontCanopy),
  },
  {
    id: "gold-canopy-reception",
    title: "Gold Frames Under Canvas",
    service: "decor",
    event: "Marquee reception",
    logline: "A bright tented reception with white round tables, gold chairs and a clean green floor.",
    storyTitle: "A reception layout built around warm metallic detail.",
    storyBody: [
      "The image set focuses on the room itself: white tablecloths, gold cross-back chairs and a light marquee structure arranged across the lawn.",
      "Wide angles make the seating plan readable, while closer views bring attention to the table styling and the contrast between gold, white and green.",
    ],
    tags: ["Marquee", "Reception", "Gold Chairs", "Table Styling"],
    includes: (imagePath) =>
      isInFolder(imagePath, "decor") && /^IMG_50(?:49|51|52|53|55|66|67|68|69)\.webp$/.test(fileName(imagePath)),
  },
  {
    id: "rose-light-under-canvas",
    title: "Rose Light Under Canvas",
    service: "decor",
    event: "Floral reception styling",
    logline: "Blush florals, pink table details, a dessert display and live-fire food moments share one reception story.",
    storyTitle: "A celebration told through its details.",
    storyBody: [
      "The gallery follows a rose-toned reception through its table settings, floral centrepieces, display styling and food preparation. The consistent palette ties the individual details together.",
      "Room-wide views and close studies sit side by side, showing how the guest setting and finishing touches work as one visual experience.",
    ],
    tags: ["Blush Florals", "Reception", "Table Styling", "Food Details"],
    includes: (imagePath) => isInFiles(imagePath, "decor", curatedFiles.roseLightReception),
  },
  {
    id: "violet-table-details",
    title: "Violet Table Details",
    service: "decor",
    event: "Place setting study",
    logline: "Two close views isolate a vivid violet table palette, floral centrepieces and layered place settings.",
    storyTitle: "Colour and texture at the table.",
    storyBody: [
      "These frames centre on the tabletop: violet linens, floral arrangements, glassware and carefully placed details.",
      "Kept as a separate mini-set, the images preserve this palette as its own occasion reference instead of blending it into a different reception.",
    ],
    tags: ["Table Styling", "Violet Palette", "Florals"],
    includes: (imagePath) => isInFolder(imagePath, "decor") && /^1C9A(?:5802|5806)\.webp$/.test(fileName(imagePath)),
  },
  {
    id: "blush-garden-procession",
    title: "A Procession in Blush",
    service: "film",
    event: "Wedding",
    logline: "A wedding story that brings together the couple, their blush-clad party and portraits in the garden.",
    storyTitle: "A wedding day framed by the people around it.",
    storyBody: [
      "The photographs move from the couple and their wedding party to portraits among the garden greenery. The coordinated blush dresses give the group images a distinct, consistent thread.",
      "The camera sequence crosses from the late-numbered frames into the next camera roll; keeping those frames in one album preserves the matching party, setting and visual continuity.",
    ],
    tags: ["Wedding", "Blush Bridal Party", "Garden", "Portraits"],
    includes: (imagePath) => isInFiles(imagePath, "wedding", curatedFiles.blushWedding),
    sortImages: (images) => images.sort((a, b) => pinkWeddingNumber(a) - pinkWeddingNumber(b)),
  },
  {
    id: "before-the-vows",
    title: "Before the Vows",
    service: "film",
    event: "Wedding preparations and ceremony",
    logline: "Personal details, getting-ready moments, wedding party portraits and the ceremony in one visual sequence.",
    storyTitle: "The small details lead into the ceremony.",
    storyBody: [
      "The set begins with the groom's accessories and preparation, then follows the wedding party outdoors and into the ceremony. The repeated people and visual flow make this a single event story rather than a loose selection of wedding images.",
      "Group portraits, the decorated arrival car and close ceremony moments add context around the central exchange.",
    ],
    tags: ["Wedding", "Getting Ready", "Wedding Party", "Ceremony"],
    includes: (imagePath) => isInFiles(imagePath, "wedding", curatedFiles.beforeTheVows),
  },
  {
    id: "blue-stage-ceremony",
    title: "A Ceremony in Blue and Green",
    service: "film",
    event: "Wedding ceremony",
    logline: "An indoor ceremony with a blue-lit backdrop, purple aisle and green-clad wedding party.",
    storyTitle: "A clear palette carries from aisle to portrait.",
    storyBody: [
      "The images share the same blue and purple ceremony setting, with the couple and wedding party appearing across aisle, stage and portrait frames.",
      "Detail photographs and group portraits are kept with the ceremony images, making the album read as one celebration from preparation through the formal moments.",
    ],
    tags: ["Wedding", "Blue Backdrop", "Purple Aisle", "Green Wedding Party"],
    includes: (imagePath) => isInFiles(imagePath, "wedding", curatedFiles.blueStageCeremony),
  },
  {
    id: "woodland-bridge-wedding",
    title: "Vows by the Woodland Bridge",
    service: "film",
    event: "Wedding portraits",
    logline: "Bridal preparation, a wooded setting and portraits around a timber bridge shape this wedding gallery.",
    storyTitle: "A portrait story that moves outdoors.",
    storyBody: [
      "The gallery follows the bride from preparation into portraits among the trees and around the small bridge, then brings the couple and wedding party into the same setting.",
      "The garden greenery and timber structure provide a consistent backdrop, while the paired and group portraits keep the story centred on the people.",
    ],
    tags: ["Wedding", "Woodland", "Bridge Portraits", "Wedding Party"],
    includes: (imagePath) => isInFiles(imagePath, "wedding", curatedFiles.woodlandWedding),
  },
  {
    id: "garden-couple-portraits",
    title: "A Portrait in the Garden",
    service: "film",
    event: "Wedding portraits",
    logline: "A short, distinct set of couple and individual portraits framed by garden greenery.",
    storyTitle: "A quieter frame between the formal moments.",
    storyBody: [
      "This five-image group holds on the couple and their portraits in the garden, with one frame capturing a speech and the others returning to the pair in the outdoor setting.",
      "It remains its own small story so it is not folded into another wedding's gallery without evidence that the events are the same.",
    ],
    tags: ["Wedding", "Couple Portraits", "Garden", "Speech"],
    includes: (imagePath) =>
      isInFolder(imagePath, "wedding") && /^IMG_(?:0037|0040|0090|0112|0114)\.webp$/.test(fileName(imagePath)),
  },
  {
    id: "football-open-play",
    title: "Football in Open Play",
    service: "film",
    event: "Football · Matchday",
    logline: "Team portraits and match action on an open, sunlit pitch.",
    storyTitle: "The game, from line-up to the next pass.",
    storyBody: [
      "The collection moves from a full team portrait into the pace of the match: close challenges, a ball in the air and players opening up the field.",
      "Open sky and the changing touchline keep the attention on the players and the rhythm of play.",
    ],
    tags: ["Football", "Matchday", "Team Portraits", "Action"],
    includes: (imagePath) => isInFolder(imagePath, "football"),
    sortImages: (images) => putFirst(images, "_DSC9008.webp"),
  },
  {
    id: "langata-matchday",
    title: "A Matchday in Langata",
    service: "film",
    event: "Football · Community tournament",
    logline: "A tournament day told through team huddles, sideline moments and play on the pitch.",
    storyTitle: "The people around the game are part of it.",
    storyBody: [
      "The photographs follow teams through their line-ups and warm-ups, then widen to the touchline, supporters and the action between them.",
      "A team huddle, a tournament display and match moments give this collection its own matchday arc.",
    ],
    tags: ["Football", "Langata Collection", "Tournament", "Community"],
    includes: (imagePath) => isInFiles(imagePath, "langata", curatedFiles.langataMatchday),
    sortImages: (images) => putFirst(images, "IMG_8880.webp"),
  },
  {
    id: "pinnovate-football",
    title: "Teams, Touchlines & Kick-off",
    service: "film",
    event: "Football · Tournament coverage",
    logline: "Team line-ups, match action and the people supporting play across the tournament.",
    storyTitle: "More than the final whistle.",
    storyBody: [
      "This collection brings team portraits and on-pitch moments together with the wider matchday scene, including sideline support and event crew.",
      "Different kits and moments across the set keep the gallery focused on the tournament atmosphere rather than a single team.",
    ],
    tags: ["Football", "Tournament", "Team Portraits", "Matchday"],
    includes: (imagePath) => isInFiles(imagePath, "pinnovate", curatedFiles.pinnovateFootball),
    sortImages: (images) => putFirst(images, "IMG_1335.webp"),
  },
  {
    id: "grand-nairobi-bike-race",
    title: "Grand Nairobi Bike Race",
    service: "film",
    event: "Road cycling · Nairobi",
    logline: "Riders, chasing groups and roadside spectators captured along the race route.",
    storyTitle: "The race, moving as one.",
    storyBody: [
      "The collection follows cyclists from the leading riders to the larger group, with bright race kits and the open road giving each frame its energy.",
      "Roadside spectators and support vehicles bring the wider race-day scene into view alongside the action on the bikes.",
    ],
    tags: ["Road Cycling", "Bike Race", "Nairobi", "Race Day"],
    includes: (imagePath) => isInFiles(imagePath, "grand-nairobi-bike", curatedFiles.nairobiBikeRace),
    sortImages: (images) => putFirst(images, "DSC08234.webp"),
  },
];

const assignedImages = new Map<string, string>();

export const WORK = definitions.map((definition) => {
  const matches = CATALOG_IMAGE_PATHS.filter(definition.includes);
  const images = definition.sortImages ? definition.sortImages(matches) : matches;

  if (images.length === 0) {
    throw new Error(`Portfolio story "${definition.id}" has no catalog images.`);
  }

  for (const imagePath of images) {
    const previousStory = assignedImages.get(imagePath);
    if (previousStory) {
      throw new Error(`Catalog image "${imagePath}" is assigned to both "${previousStory}" and "${definition.id}".`);
    }
    assignedImages.set(imagePath, definition.id);
  }

  const { includes: _includes, sortImages: _sortImages, ...story } = definition;
  return {
    ...story,
    image: images[0],
    stills: images.slice(1),
  };
});

const unassignedImages = CATALOG_IMAGE_PATHS.filter((imagePath) => !assignedImages.has(imagePath));

if (unassignedImages.length > 0) {
  throw new Error(`Catalog images are not assigned to a portfolio story: ${unassignedImages.join(", ")}`);
}
