export type CaseForgeInput = {
  id?: string;
  title: string;
  client_name?: string | null;
  service?: string | null;
  guests?: number | null;
  venue?: string | null;
  event_type?: string | null;
  status?: string | null;
  ballpark?: number | null;
};

export type CaseForgeSummary = {
  id?: string;
  title: string;
  result: string;
  summary: string;
  tags: string[];
  highlights: { label: string; value: string }[];
};

export function summarizeCaseForge(job: CaseForgeInput): CaseForgeSummary {
  const title = job.title || "Untitled project";
  const service = job.service || "production";
  const guestCount = job.guests ?? 0;
  const result = guestCount > 0 ? `${guestCount} guest touchpoints` : "A tight production run";

  const summary = `${job.client_name ?? "Client"} needed a ${service} delivery that felt premium without losing momentum. The ${title} production balanced show flow, guest experience, and clean operational handoff across ${job.venue ?? "the site"}.`;

  return {
    id: job.id,
    title,
    result,
    summary,
    tags: [service, job.event_type ?? "live", job.status ?? "delivered"],
    highlights: [
      { label: "Guest flow", value: `${Math.max(guestCount, 120)} guests managed` },
      { label: "Brand story", value: `${job.client_name ?? "Client"} experience` },
      { label: "Venue", value: job.venue ?? "On-site" },
    ],
  };
}
