import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getLivePulse, listPipeline, type JobRow } from "@/lib/server/studio";
import { summarizeStudioHome } from "@/lib/studio-home-summary";
import { cn, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/studio/")({
  component: StudioHome,
});

function StudioHome() {
  const [pulse, setPulse] = useState<{ id: string; title: string; live: boolean } | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    let on = true;
    Promise.all([getLivePulse(), listPipeline()])
      .then(([livePulse, rows]) => {
        if (!on) return;
        setPulse(livePulse);
        setJobs(rows);
      })
      .catch(() => {
        if (on) {
          setPulse(null);
          setJobs([]);
        }
      });
    return () => {
      on = false;
    };
  }, []);

  const summary = useMemo(() => summarizeStudioHome(jobs, pulse), [jobs, pulse]);
  const nextJobs = useMemo(
    () =>
      [...jobs]
        .filter((job) => job.status === "production" || job.status === "booked")
        .sort((a, b) => {
          const aDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER;
          const bDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER;
          return aDate - bDate;
        })
        .slice(0, 4),
    [jobs],
  );

  const cards: {
    to: string;
    params?: Record<string, string>;
    title: string;
    body: string;
  }[] = [
    { to: "/studio/admin", title: "Admin", body: "Roles, onboarding, access, and new team invites — one dashboard for the floor." },
    { to: "/studio/briefs", title: "Briefs", body: "Production run sheets, venue checks, and next-move priorities for the next event." },
    { to: "/studio/runsheet", title: "Run sheet", body: "Day-of schedule, load-in milestones, and key handoff points for the show floor." },
    { to: "/studio/pipeline", title: "Pipeline", body: "Inquiry through delivered. Advance the night in one motion." },
    { to: "/studio/gear", title: "Gear", body: "Sound and decor stock. Service flags before they strand a show." },
    { to: "/studio/crew", title: "Crew", body: "Calls, assignments, a sheet you can print in the van." },
    { to: "/studio/vendors", title: "Vendors", body: "Florals, rigging, linen — lead times in one directory." },
    { to: "/studio/marketing", title: "Case Forge", body: "Delivered jobs mint a page. Testimonials fire themselves." },
    ...(pulse
      ? [
          {
            to: "/studio/live/$projectId",
            params: { projectId: pulse.id },
            title: "Pulse",
            body: `${pulse.live ? "Live now" : "Next show"} · ${pulse.title}. Run-of-show shared with the client.`,
          },
        ]
      : []),
  ];

  const nextEvent = summary.nextEvent;

  return (
    <main className="shell py-8">
      <section className="glass rounded-xl p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Production command</p>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl">Studio operations</h1>
          </div>
          <div className="rounded-full border border-blue/30 bg-blue/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-blue-2">
            {summary.priorityLabel}
          </div>
        </div>

        <div className="mt-6 grid gap-3 grid-cols-2 mobile-2up md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Active jobs" value={String(summary.liveJobs)} detail="Booked and on the floor" />
          <Metric label="Due soon" value={String(summary.dueSoon)} detail="Within 42 days" />
          <Metric label="Risk flags" value={String(summary.riskJobs)} detail="Venue or sign-off gaps" />
          <Metric label="Value in motion" value={formatMoney(summary.activeValue)} detail={nextEvent ? `${nextEvent.title} is next` : "No active show yet"} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-lg border border-paper/10 bg-ink/50 p-4 md:p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Next event</p>
            {nextEvent ? (
              <>
                <h2 className="mt-3 font-serif text-3xl text-paper">{nextEvent.title}</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Detail label="Client" value={nextEvent.client_name} />
                  <Detail label="Venue" value={nextEvent.venue ?? "Venue TBC"} />
                  <Detail label="Date" value={nextEvent.event_date ? new Date(nextEvent.event_date).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "Date pending"} />
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-mist">There is no booked or production job in the board right now.</p>
            )}
          </div>

          <div className="rounded-lg border border-paper/10 bg-ink/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Live queue</p>
            <div className="mt-3 space-y-3">
              {nextJobs.length === 0 ? (
                <p className="text-sm text-mist">No scheduled shows in the work queue.</p>
              ) : (
                nextJobs.map((job) => (
                  <div key={job.id} className="rounded-md border border-paper/10 bg-paper/5 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-serif text-xl text-paper">{job.title}</p>
                      <span className={cn("rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.12em]", job.status === "production" ? "bg-green/20 text-green-300" : "bg-blue/15 text-blue-2")}>{job.status}</span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-mist">{job.venue ?? "Venue TBC"}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-3 grid-cols-2 mobile-2up md:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.title}
            to={c.to}
            params={c.params}
            className="glass rounded-lg p-6 hover:glow-blue"
          >
            <h2 className="font-serif text-3xl">{c.title}</h2>
            <p className="mt-2 text-sm text-mist">{c.body}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-paper/10 bg-ink/50 p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-3 font-serif text-3xl text-paper">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-blue-2">{detail}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-paper/10 bg-paper/5 p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className="mt-2 text-sm text-paper">{value}</p>
    </div>
  );
}
