import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { approveDraft, getMyJob } from "@/lib/server/studio";
import { cn, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/portal/$projectId")({ component: ProjectPortal });

function ProjectPortal() {
  const { projectId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [tab, setTab] = useState<"timeline" | "drafts" | "invoices" | "pulse">("timeline");
  const [data, setData] = useState<Awaited<ReturnType<typeof getMyJob>>>(null);

  async function refresh() {
    const next = await getMyJob({ data: { id: projectId } });
    setData(next);
  }

  useEffect(() => {
    if (!user) return;
    refresh().catch(() => setData(null));
  }, [user, projectId]);

  if (isPending) return <div className="min-h-dvh bg-void" />;
  if (!user) return <RedirectToSignIn />;
  if (!data) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <p className="px-5 pt-32 text-mist">Project not on this account.</p>
      </div>
    );
  }

  const { job, invoices, drafts, cues } = data;
  const steps = ["inquiry", "quoted", "booked", "production", "delivered"];
  const idx = Math.max(0, steps.indexOf(job.status));

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-5 pt-28 pb-20">
        <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">{job.event_type}</p>
        <h1 className="mt-2 font-serif text-5xl">{job.title}</h1>
        <p className="mt-2 text-mist">
          {job.venue} · {job.event_date ?? "date TBC"}
        </p>

        <div className="mt-8 grid grid-cols-5 gap-2">
          {steps.map((s, i) => (
            <div key={s}>
              <span className={cn("block h-1 rounded-full", i <= idx ? "bg-blue" : "bg-paper/15")} />
              <span className="mt-2 block text-[10px] uppercase tracking-[0.14em] text-mist">{s}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              ["timeline", "Timeline"],
              ["drafts", "Drafts"],
              ["invoices", "Invoices"],
              ["pulse", "Pulse"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={cn(
                "h-11 shrink-0 rounded-md px-4 text-xs uppercase tracking-[0.16em]",
                tab === k ? "bg-paper text-void" : "glass text-mist",
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === "timeline" ? (
            <div className="glass rounded-lg p-6">
              <p className="font-serif text-2xl">How this job moves</p>
              <p className="mt-2 text-sm text-mist">{job.notes}</p>
              <ol className="mt-6 space-y-3 text-sm">
                <li>Inquiry received</li>
                <li>Quote locked at {formatMoney(job.ballpark)}</li>
                <li>Contract and deposit</li>
                <li>Look-Through + draft approvals</li>
                <li>Show day Pulse</li>
              </ol>
            </div>
          ) : null}

          {tab === "drafts" ? (
            <div className="grid gap-3">
              {drafts.length === 0 ? (
                <p className="text-mist">No drafts yet — they appear after we start dressing the room on paper.</p>
              ) : (
                drafts.map((d) => (
                  <div key={d.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-lg p-5">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-blue-2">{d.kind}</p>
                      <p className="font-serif text-xl">{d.title}</p>
                      <p className="text-sm text-mist">{d.note}</p>
                    </div>
                    {d.status === "approved" ? (
                      <span className="text-xs uppercase tracking-[0.16em] text-blue-2">Approved</span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={async () => {
                          await approveDraft({ data: { jobId: job.id, draftId: d.id } });
                          toast.success("Approved");
                          refresh();
                        }}
                      >
                        Approve
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : null}

          {tab === "invoices" ? (
            <div className="grid gap-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="glass flex items-center justify-between rounded-lg p-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-mist">{inv.kind}</p>
                    <p className="font-serif text-3xl tabular-nums">{formatMoney(inv.amount)}</p>
                  </div>
                  <span className={cn("text-xs uppercase tracking-[0.16em]", inv.status === "paid" ? "text-blue-2" : "text-paper")}>
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {tab === "pulse" ? (
            <div>
              {cues.length === 0 ? (
                <p className="text-mist">Pulse goes live on show day.</p>
              ) : (
                <Link to="/live/$projectId" params={{ projectId: job.id }} className="text-blue-2">
                  Open live Pulse →
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
