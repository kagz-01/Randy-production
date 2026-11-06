import type { JobRow } from "@/lib/server/studio";

export type StudioActionItem = {
  job: JobRow;
  priority: "urgent" | "action" | "follow-up";
  title: string;
  detail: string;
};

export type StudioHomeSummary = {
  liveJobs: number;
  dueSoon: number;
  overdueJobs: JobRow[];
  nextEvent: JobRow | null;
  actionItems: StudioActionItem[];
};

export function summarizeStudioHome(jobs: JobRow[]): StudioHomeSummary {
  const activeJobs = jobs.filter((job) => job.status === "booked" || job.status === "production");
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const dayOffset = (value: string | null) => {
    if (!value) return null;
    const parsedDate = Date.parse(`${value.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(parsedDate)) return null;
    return Math.floor((parsedDate - todayUtc) / 86_400_000);
  };
  const overdueJobs = activeJobs.filter((job) => {
    const days = dayOffset(job.event_date);
    return days !== null && days < 0;
  });
  const dueSoon = activeJobs.filter((job) => {
    const days = dayOffset(job.event_date);
    return days !== null && days >= 0 && days <= 42;
  }).length;
  const nextEvent = [...activeJobs]
    .filter((job) => {
      const days = dayOffset(job.event_date);
      return days !== null && days >= 0;
    })
    .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime())[0] ?? null;

  const actionItems = jobs.flatMap((job): StudioActionItem[] => {
    if (job.status === "booked" || job.status === "production") {
      const days = dayOffset(job.event_date);
      if (days !== null && days < 0) {
        return [{
          job,
          priority: "urgent",
          title: "Close out past show",
          detail: `Event date passed ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"} ago · still marked ${job.status}`,
        }];
      }
      const missing = [
        !job.venue || job.venue === "TBC" ? "venue" : null,
        days === null ? "event date" : null,
        job.ballpark <= 0 ? "budget" : null,
      ].filter((field): field is string => field !== null);
      if (missing.length) {
        return [{
          job,
          priority: "action",
          title: "Complete production details",
          detail: `Confirm ${missing.join(", ")}`,
        }];
      }
    }

    if (job.status === "inquiry" || job.status === "quoted") {
      return [{
        job,
        priority: "follow-up",
        title: "Follow up on open lead",
        detail: `Currently ${job.status}`,
      }];
    }
    return [];
  }).sort((a, b) => {
    const priority = { urgent: 0, action: 1, "follow-up": 2 };
    return priority[a.priority] - priority[b.priority];
  });

  return {
    liveJobs: activeJobs.length,
    dueSoon,
    overdueJobs,
    nextEvent,
    actionItems,
  };
}
