import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  RefreshCw,
  Radio,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { summarizeStudioHome, type StudioActionItem } from "@/lib/studio-home-summary";
import { getLivePulse, listPipeline, type JobRow } from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/")({
  component: StudioHome,
});

function StudioHome() {
  const [pulse, setPulse] = useState<{ id: string; title: string; live: boolean } | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [livePulse, rows] = await Promise.all([getLivePulse(), listPipeline()]);
      setPulse(livePulse);
      setJobs(rows);
    } catch (error) {
      console.error("[studio-desk] Could not load production data", error);
      setLoadError("The production desk couldn’t load. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => summarizeStudioHome(jobs), [jobs]);
  const nextEvent = summary.nextEvent;
  const actionItems = summary.actionItems.slice(0, 5);
  const extraActionCount = Math.max(0, summary.actionItems.length - actionItems.length);

  return (
    <main className="shell pb-16 pt-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-paper/10 pb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-2">
            Production desk · {new Intl.DateTimeFormat("en-KE", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}
          </p>
          <h1 className="mt-2 font-sans text-3xl font-semibold tracking-tight text-paper md:text-4xl">
            Today on the floor
          </h1>
          <p className="mt-2 max-w-xl text-sm text-mist">
            The next show, overdue work, and the jobs that need a decision.
          </p>
        </div>
        <Button
          type="button"
          variant="line"
          size="sm"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Refresh production desk"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      {loadError ? (
        <section className="mt-6 rounded-xl border border-red/25 bg-red/5 p-5" role="alert">
          <p className="font-medium text-paper">{loadError}</p>
          <Button type="button" className="mt-4" variant="line" size="sm" onClick={() => void refresh()}>
            Try again
          </Button>
        </section>
      ) : (
        <>
          <section aria-label="Production workload" className="grid grid-cols-3 divide-x divide-paper/10 border-b border-paper/10 py-5">
            <WorkloadMetric label="Jobs marked active" value={String(summary.liveJobs)} />
            <WorkloadMetric label="Due in 6 weeks" value={String(summary.dueSoon)} />
            <WorkloadMetric
              label="Past event · still active"
              value={String(summary.overdueJobs.length)}
              alert={summary.overdueJobs.length > 0}
            />
          </section>

          <div className="grid min-w-0 gap-5 pt-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
            <section aria-labelledby="desk-attention-title" className="min-w-0">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-2">Your next decisions</p>
                  <h2 id="desk-attention-title" className="mt-1 text-2xl font-semibold text-paper">Needs attention</h2>
                </div>
                <Link
                  to="/studio/pipeline"
                  search={{ jobId: undefined }}
                  className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-mist transition-colors hover:text-paper"
                >
                  All jobs <ArrowUpRight className="size-3.5" />
                </Link>
              </div>

              {loading ? (
                <div className="space-y-2" aria-label="Loading production actions" aria-busy="true">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-[88px] animate-pulse rounded-lg border border-paper/10 bg-paper/[0.025]" />
                  ))}
                </div>
              ) : actionItems.length ? (
                <div className="divide-y divide-paper/10 border-y border-paper/10">
                  {actionItems.map((item) => (
                    <ActionRow key={item.job.id} item={item} />
                  ))}
                  {extraActionCount > 0 ? (
                    <p className="px-1 py-3 text-xs text-mist">
                      Showing the 5 most urgent items · {extraActionCount} more in{" "}
                      <Link to="/studio/pipeline" search={{ jobId: undefined }} className="text-blue-2 hover:text-paper">Pipeline</Link>
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-paper/10 bg-paper/[0.025] p-5">
                  <div className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 text-emerald-300" aria-hidden="true" />
                    <div>
                      <p className="font-medium text-paper">No urgent production actions</p>
                      <p className="mt-1 text-sm text-mist">Open leads and show-readiness gaps will appear here.</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <aside className="min-w-0">
              <section aria-labelledby="desk-next-show-title" className="rounded-xl border border-paper/10 bg-ink/60 p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">
                    {pulse?.live ? "Show day" : "Next scheduled show"}
                  </p>
                  {pulse?.live ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue/25 bg-blue/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-blue-2">
                      <Radio className="size-3" aria-hidden="true" /> Live
                    </span>
                  ) : null}
                </div>

                {loading ? (
                  <div className="mt-5 h-32 animate-pulse rounded-lg bg-paper/[0.04]" />
                ) : nextEvent ? (
                  <>
                    <h2 id="desk-next-show-title" className="mt-4 font-serif text-3xl leading-tight text-paper">
                      {nextEvent.title}
                    </h2>
                    <p className="mt-2 text-sm text-mist">
                      {nextEvent.client_name} · {nextEvent.venue || "Venue to confirm"}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-paper/10 pt-4 text-xs text-mist">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="size-3.5 text-blue-2" aria-hidden="true" />
                        {formatEventDate(nextEvent.event_date)}
                      </span>
                      <span className="inline-flex items-center gap-2 capitalize">
                        <Clock3 className="size-3.5 text-blue-2" aria-hidden="true" />
                        {nextEvent.status}
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link to="/studio/pipeline" search={{ jobId: nextEvent.id }}>
                        <Button variant="primary" size="sm">
                          Open production file <ArrowUpRight className="size-3.5" />
                        </Button>
                      </Link>
                      {pulse?.live && pulse.id === nextEvent.id ? (
                        <Link to="/studio/live/$projectId" params={{ projectId: pulse.id }}>
                          <Button variant="line" size="sm">Open crew Pulse</Button>
                        </Link>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="mt-4">
                    <h2 id="desk-next-show-title" className="font-serif text-2xl text-paper">No upcoming show scheduled</h2>
                    <p className="mt-2 text-sm leading-relaxed text-mist">
                      Past-dated jobs still marked active are listed under Needs attention until they’re closed out.
                    </p>
                    <Link to="/studio/pipeline" search={{ jobId: undefined }} className="mt-4 inline-flex min-h-10 items-center gap-1 text-sm text-blue-2 hover:text-paper">
                      Review the job board <ArrowUpRight className="size-4" />
                    </Link>
                  </div>
                )}
              </section>

            </aside>
          </div>
        </>
      )}
    </main>
  );
}

function WorkloadMetric({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-5">
      <p className="text-[10px] leading-snug text-mist sm:text-xs">{label}</p>
      <p className={cn("mt-1 font-serif text-2xl tabular-nums sm:text-3xl", alert ? "text-amber-200" : "text-paper")}>
        {value}
      </p>
    </div>
  );
}

function ActionRow({ item }: { item: StudioActionItem }) {
  const urgent = item.priority === "urgent";
  return (
    <Link
      to="/studio/pipeline"
      search={{ jobId: item.job.id }}
      className="group flex min-h-20 items-center justify-between gap-3 py-3 transition-colors hover:bg-paper/[0.025]"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn("mt-1 grid size-8 shrink-0 place-items-center rounded-lg", urgent ? "bg-amber-300/10 text-amber-200" : "bg-paper/5 text-mist")}>
          <CircleAlert className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-paper">{item.title}</p>
          <p className="mt-1 truncate text-xs text-mist">{item.job.title} · {item.detail}</p>
        </div>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-mist transition-colors group-hover:text-paper" aria-hidden="true" />
    </Link>
  );
}

function formatEventDate(value: string | null | undefined) {
  if (!value) return "Date to confirm";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Date to confirm";
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
