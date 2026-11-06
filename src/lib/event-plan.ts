import {
  EVENT_TYPES,
  GUEST_BANDS,
  type EventType,
} from "../data/catalog.ts";

export const EVENT_PLAN_STORAGE_KEY = "randy-production-event-plan-v1";
export const EVENT_PLAN_HANDOFF_STORAGE_KEY = "randy-production-event-plan-handoff-v1";

export const EVENT_PLAN_MOODS = [
  { id: "warm", label: "Warm & welcoming", overlay: "rgba(151, 92, 48, 0.26)" },
  { id: "editorial", label: "Clean & editorial", overlay: "rgba(153, 183, 199, 0.19)" },
  { id: "dramatic", label: "Bold & dramatic", overlay: "rgba(23, 31, 56, 0.34)" },
  { id: "garden", label: "Natural & relaxed", overlay: "rgba(85, 125, 87, 0.25)" },
] as const;

export type EventPlanMoodId = (typeof EVENT_PLAN_MOODS)[number]["id"];
export const EVENT_PLAN_FOCAL_POINTS = [
  { id: "stage", label: "Stage / focal point" },
  { id: "welcome", label: "Guest welcome" },
  { id: "dining", label: "Dining / gathering" },
  { id: "lighting", label: "Lighting moment" },
] as const;
export type EventPlanFocalPointId = (typeof EVENT_PLAN_FOCAL_POINTS)[number]["id"];

export type EventPlanDraft = {
  eventType: EventType;
  guests: number;
  title: string;
  eventDate: string;
  venueName: string;
  objective: string;
  creativeNotes: string;
  moodId: EventPlanMoodId;
  overlayStrength: number;
  focalPoints: { kind: EventPlanFocalPointId; x: number; y: number }[];
};

export const DEFAULT_EVENT_PLAN: EventPlanDraft = {
  eventType: "wedding",
  guests: 150,
  title: "",
  eventDate: "",
  venueName: "",
  objective: "",
  creativeNotes: "",
  moodId: "warm",
  overlayStrength: 55,
  focalPoints: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string" || value.length > maxLength) return null;
  return value.trim();
}

export function isValidEventDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseEventPlanDraft(serialized: string | null): EventPlanDraft | null {
  if (!serialized) return null;
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;

  const eventType = EVENT_TYPES.find((item) => item.key === value.eventType)?.key;
  const guests = GUEST_BANDS.find((item) => item.key === value.guests)?.key;
  const moodId = EVENT_PLAN_MOODS.find((item) => item.id === value.moodId)?.id;
  const title = boundedText(value.title, 100);
  const eventDate = boundedText(value.eventDate, 10);
  const venueName = boundedText(value.venueName, 140);
  const objective = boundedText(value.objective, 400);
  const creativeNotes = boundedText(value.creativeNotes, 1200);
  if (
    !eventType ||
    !guests ||
    !moodId ||
    title === null ||
    eventDate === null ||
    venueName === null ||
    objective === null ||
    creativeNotes === null ||
    (eventDate !== "" && !isValidEventDate(eventDate))
  ) {
    return null;
  }

  if (!Array.isArray(value.focalPoints) || value.focalPoints.length > 8) return null;
  const focalPoints: EventPlanDraft["focalPoints"] = [];
  for (const entry of value.focalPoints) {
    if (!isRecord(entry)) return null;
    const kind = EVENT_PLAN_FOCAL_POINTS.find((point) => point.id === entry.kind)?.id;
    if (
      !kind ||
      typeof entry.x !== "number" ||
      typeof entry.y !== "number" ||
      !Number.isFinite(entry.x) ||
      !Number.isFinite(entry.y) ||
      entry.x < 0 ||
      entry.x > 100 ||
      entry.y < 0 ||
      entry.y > 100
    ) {
      return null;
    }
    focalPoints.push({ kind, x: entry.x, y: entry.y });
  }

  const overlayStrength =
    typeof value.overlayStrength === "number" &&
    Number.isFinite(value.overlayStrength) &&
    value.overlayStrength >= 20 &&
    value.overlayStrength <= 80
      ? value.overlayStrength
      : null;
  if (overlayStrength === null) return null;

  return {
    eventType,
    guests,
    title,
    eventDate,
    venueName,
    objective,
    creativeNotes,
    moodId,
    overlayStrength,
    focalPoints,
  };
}

export function buildEventPlanHandoff(plan: EventPlanDraft) {
  const mood = EVENT_PLAN_MOODS.find((item) => item.id === plan.moodId) ?? EVENT_PLAN_MOODS[0];
  const focalPointLabels = plan.focalPoints.map(
    (point) => EVENT_PLAN_FOCAL_POINTS.find((item) => item.id === point.kind)?.label,
  ).filter(
    (label): label is (typeof EVENT_PLAN_FOCAL_POINTS)[number]["label"] => Boolean(label),
  );
  const message = [
    "Event planner handoff",
    `Visual direction: ${mood.label}.`,
    plan.objective ? `What matters most: ${plan.objective}` : "",
    plan.creativeNotes ? `Creative and practical notes: ${plan.creativeNotes}` : "",
    focalPointLabels.length ? `Room focal points: ${focalPointLabels.join(", ")}.` : "",
    "The visual is a planning reference, not a confirmed floor plan or production rendering.",
  ].filter(Boolean).join("\n");

  return {
    search: {
      eventType: plan.eventType,
      guests: plan.guests,
      plannerHandoff: "1" as const,
    },
    details: {
      title: plan.title || undefined,
      venue: plan.venueName || undefined,
      date: plan.eventDate || undefined,
      message,
    },
  };
}

export function parseEventPlanHandoff(serialized: string | null) {
  if (!serialized) return null;
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return null;
  }
  if (!isRecord(value)) return null;
  const title = value.title === undefined ? undefined : boundedText(value.title, 100);
  const venue = value.venue === undefined ? undefined : boundedText(value.venue, 140);
  const date = value.date === undefined ? undefined : boundedText(value.date, 10);
  const message = boundedText(value.message, 2_000);
  if (
    title === null ||
    venue === null ||
    date === null ||
    (date !== undefined && !isValidEventDate(date)) ||
    message === null
  ) {
    return null;
  }
  return { title, venue, date, message };
}
