import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getJobPublic, setCueStatus, type CueRow, type JobRow } from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/live/$projectId")({ component: StudioLive });

function StudioLive() {
  const { projectId } = Route.useParams();
  const [job, setJob] = useState<JobRow | null>(null);
  const [cues, setCues] = useState<CueRow[]>([]);

  async function refresh() {
    const res = await getJobPublic({ data: { id: projectId } });
    if (!res) return;
    setJob(res.job);
    setCues(res.cues);
  }
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [projectId]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-blue-2">
            <span className="live-dot size-2 rounded-full bg-blue" />
            Crew Pulse
          </p>
          <h2 className="font-serif text-4xl">{job?.title}</h2>
        </div>
        <Link to="/live/$projectId" params={{ projectId }}>
          <Button variant="line" size="sm">
            Client view
          </Button>
        </Link>
      </div>
      <ol className="mt-8 divide-y divide-paper/10">
        {cues.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-xs tabular-nums text-mist">{c.starts_at}</p>
              <p className="font-serif text-xl">{c.title}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-mist">
                {c.owner} · {c.kind}
              </p>
            </div>
            <div className="flex gap-1">
              {["pending", "active", "done"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={cn(
                    "rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.12em]",
                    c.status === s ? "bg-paper text-void" : "text-mist hover:bg-paper/10",
                  )}
                  onClick={async () => {
                    try {
                      await setCueStatus({ data: { id: c.id, status: s } });
                      await refresh();
                    } catch {
                      toast.error("Could not update cue");
                    }
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
