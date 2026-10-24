import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listPipeline, type JobRow } from "@/lib/server/studio";

export const Route = createFileRoute("/studio/briefs")({ component: BriefsPage });

function daysUntil(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getBriefStatus(job: JobRow) {
  const offset = daysUntil(job.event_date);
  if (!job.venue) return { label: "Venue pending", tone: "amber" as const, note: "Need final site confirmation." };
  if (offset <= 3) return { label: "Final lock", tone: "red" as const, note: "Load-in and crew timing need sign-off." };
  if (offset <= 10) return { label: "Tight timeline", tone: "amber" as const, note: "A few final decisions still need clearing." };
  return { label: "On track", tone: "green" as const, note: "Brief and call sheet can stay stable." };
}

function BriefsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    listPipeline().then(setJobs).catch(() => setJobs([]));
  }, []);

  const upcoming = useMemo(
    () =>
      [...jobs]
        .filter((job) => job.status !== "delivered")
        .sort((a, b) => {
          const dateA = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER;
          const dateB = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER;
          return dateA - dateB;
        })
        .slice(0, 5),
    [jobs],
  );

  const summary = useMemo(() => {
    const venuePending = upcoming.filter((job) => !job.venue).length;
    const dueSoon = upcoming.filter((job) => daysUntil(job.event_date) <= 10).length;
    const flagged = upcoming.filter((job) => getBriefStatus(job).tone !== "green").length;
    return { venuePending, dueSoon, flagged };
  }, [upcoming]);

  return (
    <main className="shell py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-blue-2">Production brief</p>
          <h1 className="mt-2 font-serif text-5xl">Run-sheet and next-move board.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label="Upcoming" value={String(upcoming.length)} />
          <StatPill label="Venue pending" value={String(summary.venuePending)} />
          <StatPill label="Due soon" value={String(summary.dueSoon)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {upcoming.map((job) => {
          const days = daysUntil(job.event_date);
          const brief = getBriefStatus(job);
          const progress = Math.min(100, Math.max(18, 100 - (days === Number.POSITIVE_INFINITY ? 0 : days * 5)));
          const checklist = [
            { label: "Venue confirmed", done: Boolean(job.venue) },
            { label: "Client sign-off", done: days <= 21 },
            { label: "Crew call sheet", done: days <= 7 },
            { label: "Load-in plan", done: days <= 3 },
          ];

          return (
            <article key={job.id} className="glass rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-blue-2">{job.service}</p>
                  <h2 className="mt-2 font-serif text-3xl">{job.title}</h2>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.14em] ${brief.tone === "green" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : brief.tone === "amber" ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-red-500/40 bg-red-500/10 text-red-200"}`}>
                  {brief.label}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-mist">
                <p>Client: {job.client_name}</p>
                <p>Event date: {job.event_date ?? "TBC"}</p>
                <p>Venue: {job.venue ?? "Awaiting site"}</p>
                <p>Guests: {job.guests}</p>
              </div>

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-mist">
                  <span>Brief progress</span>
                  <span>{days === Number.POSITIVE_INFINITY ? "TBC" : `${days}d`}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-paper/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-2 to-paper" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {checklist.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border border-paper/10 bg-ink/40 px-2 py-2 text-sm">
                    <span className="text-mist">{item.label}</span>
                    <span className={item.done ? "text-emerald-300" : "text-amber-200"}>
                      {item.done ? "Ready" : "Open"}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-sm text-mist">{brief.note}</p>
              {job.notes ? <p className="mt-3 text-sm text-paper/80">{job.notes}</p> : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-paper/10 bg-paper/5 px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className="mt-1 font-serif text-lg">{value}</p>
    </div>
  );
}
