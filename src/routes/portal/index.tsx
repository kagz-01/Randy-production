import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMyJobs, type JobRow } from "@/lib/server/studio";
import { eventLabel } from "@/data/catalog";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/portal/")({ component: PortalHome });

function PortalHome() {
  const { user, isPending } = useCurrentUserState();
  const [jobs, setJobs] = useState<JobRow[]>([]);

  useEffect(() => {
    if (!user) return;
    listMyJobs().then(setJobs).catch(() => setJobs([]));
  }, [user]);

  if (isPending) return <div className="min-h-dvh bg-void" />;
  if (!user) return <RedirectToSignIn />;

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="shell pt-28 pb-20">
        <p className="text-[10px] uppercase tracking-[0.28em] text-blue-2">Client portal</p>
        <h1 className="mt-3 text-4xl md:text-5xl">Your floor.</h1>
        <p className="mt-3 text-base text-mist md:text-lg">Timeline, drafts, invoices — one job at a time.</p>

        {jobs.length === 0 ? (
          <div className="glass mt-12 rounded-lg p-8">
            <p className="text-2xl leading-tight text-paper">No bookings yet.</p>
            <p className="mt-2 text-sm text-mist">Lock a quote and it lands here.</p>
            <Link to="/quote" className="mt-6 inline-block">
              <Button>Start a project</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-3">
            {jobs.map((j) => (
              <Link
                key={j.id}
                to="/portal/$projectId"
                params={{ projectId: j.id }}
                className="glass flex flex-wrap items-end justify-between gap-3 rounded-lg p-5 hover:glow-blue"
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">{j.status}</p>
                  <p className="text-2xl leading-tight text-paper">{j.title}</p>
                  <p className="text-sm text-mist">
                    {j.venue ? `${j.venue} · ${eventLabel(j.event_type)}` : eventLabel(j.event_type)}
                  </p>
                </div>
                <p className="text-2xl leading-tight tabular-nums text-paper">{formatMoney(j.ballpark)}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
