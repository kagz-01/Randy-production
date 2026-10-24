import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMyJobs, type JobRow } from "@/lib/server/studio";
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
      <main className="mx-auto max-w-5xl px-5 pt-28 pb-20">
        <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Client portal</p>
        <h1 className="mt-3 font-serif text-5xl">Your floor.</h1>
        <p className="mt-3 text-mist">Timeline, drafts, invoices — one job at a time.</p>

        {jobs.length === 0 ? (
          <div className="glass mt-12 rounded-lg p-8">
            <p className="font-serif text-2xl">No bookings yet.</p>
            <p className="mt-2 text-sm text-mist">Lock a quote and it lands here.</p>
            <Link to="/quote" className="mt-6 inline-block">
              <Button>Build a quote</Button>
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
                  <p className="font-serif text-2xl">{j.title}</p>
                  <p className="text-sm text-mist">{j.venue || j.event_type}</p>
                </div>
                <p className="font-serif text-2xl tabular-nums">{formatMoney(j.ballpark)}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
