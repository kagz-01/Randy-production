import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { listPipeline, type JobRow } from "@/lib/server/studio";
import { summarizeShowDayBrief } from "@/lib/show-day-brief";

export const Route = createFileRoute("/studio/runsheet")({ component: RunSheetPage });

const RUN_STEPS = [
  { key: "load-in", label: "Load-in", detail: "Crew, gear, and positioning." },
  { key: "lighting", label: "Lighting / AV", detail: "Rig check and focus." },
  { key: "styling", label: "Styling", detail: "Decor installs and guest flow." },
  { key: "guest-arrival", label: "Guest arrival", detail: "Doors, welcome, and signage." },
  { key: "main-event", label: "Main event", detail: "Live moments and transitions." },
  { key: "wrap", label: "Wrap / pack-out", detail: "Strike and handover." },
] as const;

function RunSheetPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    listPipeline().then(setJobs).catch(() => setJobs([]));
  }, []);

  const nextJob = useMemo(() => {
    const upcoming = [...jobs]
      .filter((job) => job.status !== "delivered")
      .sort((a, b) => {
        const aDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });
    return upcoming[0] ?? null;
  }, [jobs]);

  const timeline = useMemo(() => {
    if (!nextJob) return [];
    const start = nextJob.event_date ? new Date(nextJob.event_date) : new Date();
    return RUN_STEPS.map((step, index) => {
      const at = new Date(start.getTime() + index * 90 * 60 * 1000);
      return {
        ...step,
        time: at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
    });
  }, [nextJob]);

  const showDaySummary = useMemo(() => summarizeShowDayBrief(nextJob ?? {}), [nextJob]);

  if (!nextJob) {
    return (
      <main className="shell py-8">
        <div className="glass rounded-lg p-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.28em] text-blue-2">Run sheet</p>
          <h1 className="mt-3 font-serif text-4xl">No active production yet.</h1>
          <p className="mt-3 text-mist">Once a job moves into booking or production, the show flow appears here.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-blue-2">Run sheet</p>
          <h1 className="mt-2 font-serif text-5xl">{nextJob.title}</h1>
        </div>
        <div className="rounded-full border border-paper/10 bg-paper/5 px-3 py-2 text-sm text-mist">
          {nextJob.event_date ?? "Date TBD"} · {nextJob.venue ?? "Venue pending"}
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Client" value={nextJob.client_name} />
        <SummaryCard label="Guests" value={String(nextJob.guests)} />
        <SummaryCard label="Service" value={nextJob.service} />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Readiness" value={showDaySummary.readiness.toUpperCase()} />
        <SummaryCard label="Countdown" value={`${showDaySummary.countdownDays}d`} />
        <SummaryCard label="Venue" value={showDaySummary.venueState} />
        <SummaryCard label="Crew" value={showDaySummary.crewState} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {showDaySummary.cues.map((cue) => (
          <article key={cue.label} className="glass rounded-lg p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-2">{cue.owner}</p>
              <span className={cue.status === "ready" ? "rounded-full bg-green/20 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-green-300" : cue.status === "watch" ? "rounded-full bg-amber/20 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-amber-200" : "rounded-full bg-red/20 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-red-200"}>{cue.status}</span>
            </div>
            <h2 className="mt-3 font-serif text-3xl">{cue.label}</h2>
            <p className="mt-2 text-sm text-mist">{cue.detail}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {timeline.map((step, index) => (
          <article key={step.key} className="glass rounded-lg p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-2">Stage {index + 1}</p>
              <span className="text-xs text-mist">{step.time}</span>
            </div>
            <h2 className="mt-3 font-serif text-3xl">{step.label}</h2>
            <p className="mt-2 text-sm text-mist">{step.detail}</p>
            <ul className="mt-4 space-y-2 text-sm text-paper/80">
              <li>• Crew call check</li>
              <li>• Gear and styling confirmation</li>
              <li>• Client sign-off before transition</li>
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </div>
  );
}
