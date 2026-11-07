import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { getJobPublic, type CueRow, type JobRow } from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/live/$projectId")({ component: LivePage });

function LivePage() {
  const { projectId } = Route.useParams();
  const [job, setJob] = useState<JobRow | null>(null);
  const [cues, setCues] = useState<CueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const failureLoggedRef = useRef(false);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const res = await getJobPublic({ data: { id: projectId } });
      if (requestId !== requestIdRef.current) return;
      if (!res) {
        setJob(null);
        setCues([]);
        setLoadError("This live event is unavailable or has not been approved for sharing.");
        return;
      }
      setJob(res.job);
      setCues(res.cues);
      setLoadError(null);
      failureLoggedRef.current = false;
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (!failureLoggedRef.current) {
        console.error("[live-pulse] Could not load public show-day updates", error);
        failureLoggedRef.current = true;
      }
      setLoadError("Live updates could not be refreshed. We’ll keep trying automatically.");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let on = true;
    const refresh = () => {
      if (on) void load();
    };
    refresh();
    const t = setInterval(refresh, 8000);
    return () => {
      on = false;
      requestIdRef.current += 1;
      clearInterval(t);
    };
  }, [load]);

  const done = cues.filter((c) => c.status === "done").length;
  const pct = cues.length ? Math.round((done / cues.length) * 100) : 0;
  const sound = cues.filter((c) => c.kind === "sound");
  const setup = cues.filter((c) => c.kind === "setup");

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-5 pt-28 pb-20">
        <div className="flex items-center gap-3">
          <span className="live-dot size-2 rounded-full bg-blue" />
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Pulse · live</p>
        </div>
        <h1 className="mt-3 font-serif text-5xl">
          {job?.title ?? (loading ? "Loading the night" : "Live event updates")}
        </h1>
        <p className="mt-2 text-mist">
          {job
            ? [job.venue, job.client_name, "shared with the client in real time"]
                .filter(Boolean)
                .join(" · ")
            : loading
              ? "Checking the latest show-day information."
              : "Show-day details will appear here when an event is approved for sharing."}
        </p>

        {loadError ? (
          <div
            role={loading ? "status" : "alert"}
            className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100"
          >
            <p>{loadError}</p>
            <Button type="button" variant="line" className="min-h-11" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : null}

        {job ? (
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <Stat label="Setup" value={`${setup.filter((c) => c.status === "done").length}/${setup.length}`} />
              <Stat
                label="Sound check"
                value={
                  sound.length === 0
                    ? "Not planned"
                    : sound.some((c) => c.status === "active")
                      ? "Live"
                      : sound.every((c) => c.status === "done")
                        ? "Clear"
                        : "Standby"
                }
              />
              <Stat label="Night" value={`${pct}%`} />
            </div>

            <div
              className="mt-4 h-1 overflow-hidden rounded-full bg-paper/10"
              role="progressbar"
              aria-label="Show-day cue progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div className="h-full bg-blue transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>

            {cues.length ? (
              <ol className="mt-12 space-y-0">
                {cues.map((c, i) => (
                  <li key={c.id} className="grid grid-cols-[72px_16px_1fr] gap-4 py-4">
                    <p className="pt-1 font-sans text-xs tabular-nums text-mist">{c.starts_at}</p>
                    <div className="relative flex justify-center">
                      <span
                        className={cn(
                          "mt-1.5 size-2.5 rounded-full",
                          c.status === "done"
                            ? "bg-blue"
                            : c.status === "active"
                              ? "bg-paper live-dot"
                              : "bg-paper/25",
                        )}
                      />
                      {i < cues.length - 1 ? (
                        <span className="absolute top-4 bottom-[-24px] w-px bg-paper/15" />
                      ) : null}
                    </div>
                    <div>
                      <p className="font-serif text-xl text-paper">{c.title}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-mist">
                        {c.owner} · {c.kind} · {c.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p role="status" className="mt-8 rounded-lg border border-paper/10 bg-ink/60 p-4 text-sm text-mist">
                Show-day cues have not been posted yet. This page will update automatically.
              </p>
            )}
          </>
        ) : null}

        <p className="mt-10 text-sm text-mist">
          Crew advances this board from the{" "}
          <Link to="/studio/live/$projectId" params={{ projectId }} className="text-blue-2">
            studio Pulse
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-mist">{label}</p>
      <p className="mt-2 font-serif text-4xl tabular-nums">{value}</p>
    </div>
  );
}
