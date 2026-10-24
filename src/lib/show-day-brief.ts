export type ShowDayBriefInput = {
  title?: string;
  status?: string | null;
  event_date?: string | null;
  venue?: string | null;
  guests?: number | null;
  ballpark?: number | null;
};

export type ShowDayCue = {
  label: string;
  owner: string;
  status: "ready" | "watch" | "pending";
  detail: string;
};

export type ShowDayBrief = {
  readiness: "ready" | "watch" | "risk";
  countdownDays: number;
  remainingOpen: number;
  venueState: string;
  crewState: string;
  cues: ShowDayCue[];
};

function daysUntil(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function summarizeShowDayBrief(job: ShowDayBriefInput): ShowDayBrief {
  const countdownDays = daysUntil(job.event_date);
  const venueOpen = !job.venue || job.venue === "TBC";
  const scopeOpen = Boolean(job.status && ["inquiry", "quoted"].includes(job.status));
  const budgetOpen = !job.ballpark || job.ballpark <= 0;

  const cues: ShowDayCue[] = [
    {
      label: "Load-in",
      owner: "Production lead",
      status: venueOpen || countdownDays <= 45 ? "watch" : "ready",
      detail: "Crew, gear, and loading plan confirmed.",
    },
    {
      label: "Lighting / AV",
      owner: "Technical lead",
      status: venueOpen || countdownDays <= 30 ? "watch" : "ready",
      detail: "Rig, focus, and signal checks are in motion.",
    },
    {
      label: "Guest flow",
      owner: "Front of house",
      status: (job.guests ?? 0) > 150 || countdownDays <= 14 ? "watch" : "ready",
      detail: "Arrival, welcome, and line management are staged.",
    },
    {
      label: "Strike",
      owner: "Ops team",
      status: countdownDays <= 7 ? "watch" : "ready",
      detail: "Pack-out and venue handoff are planned.",
    },
  ];

  if (venueOpen) {
    cues.unshift({
      label: "Venue confirmation",
      owner: "Venue coordinator",
      status: "pending",
      detail: "Final site, access, and power schedule need sign-off.",
    });
  }

  if (budgetOpen) {
    cues.push({
      label: "Budget / payment",
      owner: "Finance",
      status: "pending",
      detail: "Final spend and client payment are still pending.",
    });
  }

  if (scopeOpen) {
    cues.push({
      label: "Client approval",
      owner: "Producer",
      status: "pending",
      detail: "Client final scope and run-order approval must be locked.",
    });
  }

  const remainingOpen = cues.filter((cue) => cue.status !== "ready").length;
  let readiness: ShowDayBrief["readiness"] = "ready";
  if (countdownDays <= 1 && remainingOpen > 0) readiness = "risk";
  else if (remainingOpen > 2) readiness = "watch";

  return {
    readiness,
    countdownDays,
    remainingOpen,
    venueState: venueOpen ? "Pending" : "Confirmed",
    crewState: job.status === "production" ? "Crew active" : "Roster pending",
    cues,
  };
}
