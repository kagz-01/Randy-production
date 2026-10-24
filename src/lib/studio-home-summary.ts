import type { JobRow } from "@/lib/server/studio";

export type StudioHomeSummary = {
  liveJobs: number;
  dueSoon: number;
  riskJobs: number;
  activeValue: number;
  nextEvent: JobRow | null;
  priorityLabel: "Live now" | "Next event" | "No active show";
};

export function summarizeStudioHome(
  jobs: JobRow[],
  pulse: { id: string; title: string; live: boolean } | null,
): StudioHomeSummary {
  const activeJobs = jobs.filter((job) => job.status === "booked" || job.status === "production");
  const dueSoon = activeJobs.filter((job) => {
    if (!job.event_date) return false;
    const diffMs = new Date(job.event_date).getTime() - Date.now();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 42;
  }).length;

  const riskJobs = activeJobs.filter((job) => !job.venue || !job.event_date || job.ballpark <= 0).length;
  const nextEvent = [...activeJobs]
    .filter((job) => job.event_date)
    .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime())[0] ?? null;

  const priorityLabel: StudioHomeSummary["priorityLabel"] = pulse?.live
    ? "Live now"
    : nextEvent
      ? "Next event"
      : "No active show";

  return {
    liveJobs: activeJobs.length,
    dueSoon,
    riskJobs,
    activeValue: activeJobs.reduce((sum, job) => sum + job.ballpark, 0),
    nextEvent,
    priorityLabel,
  };
}
