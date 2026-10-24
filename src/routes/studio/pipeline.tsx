import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { summarizeJobCommandBoard } from "@/lib/job-command-board";
import { listPipeline, moveJob, type JobRow } from "@/lib/server/studio";
import { cn, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/studio/pipeline")({ component: PipelinePage });

const COLS = [
  { key: "inquiry", label: "Inquiry" },
  { key: "quoted", label: "Quoted" },
  { key: "booked", label: "Booked" },
  { key: "production", label: "On the floor" },
  { key: "delivered", label: "Delivered" },
];

function PipelinePage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function refresh() {
    const rows = await listPipeline();
    setJobs(rows);
    if (!selectedId && rows[0]) setSelectedId(rows[0].id);
    if (selectedId && !rows.some((row) => row.id === selectedId)) setSelectedId(rows[0]?.id ?? null);
  }

  useEffect(() => {
    refresh().catch(() => setJobs([]));
  }, []);

  const board = useMemo(() => summarizeJobCommandBoard(jobs), [jobs]);
  const selectedJob = jobs.find((job) => job.id === selectedId) ?? jobs[0] ?? null;

  const checklist = selectedJob
    ? [
        { label: "Venue confirmed", done: Boolean(selectedJob.venue && selectedJob.venue !== "TBC") },
        { label: "Event date locked", done: Boolean(selectedJob.event_date) },
        { label: "Scope approved", done: !["inquiry", "quoted"].includes(selectedJob.status) },
        { label: "Budget in motion", done: Boolean(selectedJob.ballpark > 0) },
      ]
    : [];

  const timeline = selectedJob ? getTimeline(selectedJob) : [];
  const approvals = selectedJob ? getApprovals(selectedJob) : [];
  const procurement = selectedJob ? getProcurement(selectedJob) : [];

  return (
    <main className="shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Job command</p>
          <h1 className="mt-2 font-serif text-5xl">Production floor</h1>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Live value</p>
          <p className="font-serif text-3xl">{formatMoney(board.value)}</p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <Metric label="Live jobs" value={String(board.live)} detail="Booked and in production" />
        <Metric label="Due soon" value={String(board.dueSoon.length)} detail="Within the next 6 weeks" />
        <Metric label="Outstanding" value={String(board.outstanding)} detail="Needs decision or scope lock" />
        <Metric label="Ready / risk" value={board.needsAttention.length ? "Watch" : "Clear"} detail={board.needsAttention.length ? `${board.needsAttention[0].title} needs attention` : "All active jobs are moving"} />
      </section>

      {selectedJob ? (
        <>
          <section className="mt-8 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="glass rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Selected job</p>
                  <h2 className="mt-2 font-serif text-3xl">{selectedJob.title}</h2>
                </div>
                <span className="rounded-full border border-blue/30 bg-blue/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-blue-2">
                  {selectedJob.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <Detail label="Client" value={selectedJob.client_name} />
                <Detail label="Venue" value={selectedJob.venue ?? "TBC"} />
                <Detail label="Budget" value={formatMoney(selectedJob.ballpark)} />
              </div>

              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Action checklist</p>
                <div className="mt-3 space-y-2">
                  {checklist.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-md border border-paper/10 bg-ink/50 px-3 py-2">
                      <span className="text-sm text-paper">{item.label}</span>
                      <span className={cn("rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.12em]", item.done ? "bg-green/20 text-green-300" : "bg-amber/20 text-amber-200")}>
                        {item.done ? "Done" : "Open"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <aside className="glass rounded-lg p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Attention list</p>
              <div className="mt-4 space-y-3">
                {board.needsAttention.length === 0 ? (
                  <p className="text-sm text-mist">No immediate issues across the active floor.</p>
                ) : (
                  board.needsAttention.map((job) => (
                    <button
                      key={job.id ?? job.title}
                      type="button"
                      onClick={() => setSelectedId(job.id ?? null)}
                      className="block w-full rounded-md border border-paper/10 bg-ink/50 p-3 text-left hover:bg-paper/5"
                    >
                      <p className="font-serif text-xl">{job.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.15em] text-mist">{job.status}</p>
                      <p className="mt-2 text-sm text-paper/80">{job.venue ?? "Venue TBC"} · {job.event_date ? new Date(job.event_date).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "Date pending"}</p>
                    </button>
                  ))
                )}
              </div>
            </aside>
          </section>

          <section className="mt-8 grid gap-4 xl:grid-cols-3">
            <article className="glass rounded-lg p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Delivery timeline</p>
              <div className="mt-4 space-y-3">
                {timeline.map((item) => (
                  <div key={item.label} className="rounded-md border border-paper/10 bg-ink/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-paper">{item.label}</p>
                      <span className={cn("rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.12em]", item.tone === "green" ? "bg-green/20 text-green-300" : item.tone === "amber" ? "bg-amber/20 text-amber-200" : "bg-red/20 text-red-200")}>{item.state}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-mist">{item.date}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass rounded-lg p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Approvals</p>
              <div className="mt-4 space-y-3">
                {approvals.map((item) => (
                  <div key={item.label} className="rounded-md border border-paper/10 bg-ink/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-paper">{item.label}</p>
                      <span className={cn("rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.12em]", item.done ? "bg-green/20 text-green-300" : "bg-amber/20 text-amber-200")}>{item.done ? "Signed" : "Pending"}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-mist">{item.owner}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="glass rounded-lg p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Procurement</p>
              <div className="mt-4 space-y-3">
                {procurement.map((item) => (
                  <div key={item.label} className="rounded-md border border-paper/10 bg-ink/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-paper">{item.label}</p>
                      <span className={cn("rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.12em]", item.risk === "low" ? "bg-green/20 text-green-300" : item.risk === "medium" ? "bg-amber/20 text-amber-200" : "bg-red/20 text-red-200")}>{item.risk}</span>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-mist">{item.detail}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      ) : null}

      <div className="mt-8 flex gap-3 overflow-x-auto pb-6 no-scrollbar">
        {COLS.map((col) => {
          const cards = jobs.filter((j) => j.status === col.key);
          return (
            <section key={col.key} className="w-[260px] shrink-0 xl:w-[calc((100%-4rem)/5)]">
              <header className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-mist">{col.label}</h2>
                <span className="tabular-nums text-xs text-blue-2">{cards.length}</span>
              </header>
              <div className="grid gap-2">
                {cards.map((j) => (
                  <article
                    key={j.id}
                    className={cn("glass rounded-md p-4 transition-colors", selectedJob?.id === j.id && "border border-blue/40 bg-blue/5")}
                    onClick={() => setSelectedId(j.id)}
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-blue-2">{j.service}</p>
                    <p className="font-serif text-xl">{j.title}</p>
                    <p className="text-xs text-mist">{j.client_name}</p>
                    <p className="mt-2 text-sm tabular-nums">{formatMoney(j.ballpark)}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {COLS.filter((c) => c.key !== j.status).map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          className={cn("rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-mist hover:bg-paper/10 hover:text-paper")}
                          onClick={async (event) => {
                            event.stopPropagation();
                            try {
                              await moveJob({ data: { id: j.id, status: c.key } });
                              await refresh();
                            } catch {
                              toast.error("Could not move job");
                            }
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function daysUntil(value: string | null | undefined) {
  if (!value) return Number.POSITIVE_INFINITY;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getTimeline(job: JobRow) {
  const days = daysUntil(job.event_date);
  return [
    { label: "Brief lock", state: days <= 10 ? "Tight" : "On track", tone: days <= 10 ? "amber" : "green", date: job.event_date ? `${days}d to show` : "Date pending" },
    { label: "Vendor confirmations", state: job.venue ? "Active" : "Awaiting site", tone: job.venue ? "green" : "amber", date: job.venue ? "Venue confirmed" : "Venue TBC" },
    { label: "Load-in plan", state: days <= 3 ? "Final call" : "Standby", tone: days <= 3 ? "red" : "green", date: days <= 3 ? "This week" : "Ahead of schedule" },
  ];
}

function getApprovals(job: JobRow) {
  const venueDone = Boolean(job.venue && job.venue !== "TBC");
  const budgetDone = job.ballpark > 0;
  return [
    { label: "Client scope", done: !["inquiry", "quoted"].includes(job.status), owner: "Producer + client" },
    { label: "Venue approval", done: venueDone, owner: "Venue coordinator" },
    { label: "Budget sign-off", done: budgetDone, owner: "Finance" },
  ];
}

function getProcurement(job: JobRow) {
  const venueRisk = job.venue && job.venue !== "TBC" ? "low" : "medium";
  const serviceRisk = job.service ? "low" : "medium";
  return [
    { label: job.service || "Production service", risk: serviceRisk, detail: `${job.guests} guests · ${job.event_type}` },
    { label: "Venue logistics", risk: venueRisk, detail: job.venue ?? "Venue to be assigned" },
    { label: "Crew readiness", risk: job.status === "production" ? "low" : "medium", detail: job.status === "production" ? "Call sheet confirmed" : "Roster still needs final check" },
  ];
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      <p className="mt-2 text-sm text-mist">{detail}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-paper/10 bg-ink/50 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-1 break-words text-sm text-paper">{value}</p>
    </div>
  );
}
