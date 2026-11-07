import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getJobPublic, setCueStatus, type CueRow, type JobRow } from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/live/$projectId")({ component: StudioLive });

function StudioLive() {
  const { projectId } = Route.useParams();
  const [job, setJob] = useState<JobRow | null>(null);
  const [cues, setCues] = useState<CueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingCueId, setUpdatingCueId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getJobPublic({ data: { id: projectId } });
      if (!res) {
        setJob(null);
        setCues([]);
        setLoadError("This production is unavailable or not assigned to your workspace.");
        return;
      }
      setJob(res.job);
      setCues(res.cues);
    } catch (error) {
      console.error("[studio-live] Could not load show-day cues", error);
      setLoadError(
        "The show-day run sheet couldn’t be loaded. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function updateCue(cue: CueRow, status: "pending" | "active" | "done") {
    setUpdatingCueId(cue.id);
    try {
      await setCueStatus({ data: { id: cue.id, status } });
      setCues((current) =>
        current.map((item) => (item.id === cue.id ? { ...item, status } : item)),
      );
    } catch (error) {
      console.error("[studio-live] Could not update cue status", error);
      toast.error(error instanceof Error ? error.message : "The cue status could not be updated.");
    } finally {
      setUpdatingCueId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-blue-2">
            <span className="live-dot size-2 rounded-full bg-blue" />
            Crew Pulse
          </p>
          <h1 className="font-serif text-4xl">{job?.title ?? "Show-day run sheet"}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="line"
            className="min-h-11"
            onClick={() => void refresh()}
            disabled={loading}
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
          {job ? (
            <Link to="/live/$projectId" params={{ projectId }}>
              <Button variant="line" className="min-h-11">
                Client view
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
      {loading ? (
        <p role="status" className="mt-6 text-sm text-mist">
          Loading show-day cues…
        </p>
      ) : null}
      {loadError ? (
        <div role="alert" className="mt-6 rounded-lg border border-red/25 bg-red/5 p-4">
          <p className="text-sm text-red-200">{loadError}</p>
          <Button
            type="button"
            variant="line"
            className="mt-3 min-h-11"
            onClick={() => void refresh()}
            disabled={loading}
          >
            Try again
          </Button>
        </div>
      ) : null}
      {!loading && !loadError && cues.length === 0 ? (
        <p className="mt-6 rounded-lg border border-paper/10 bg-ink/50 p-5 text-sm text-mist">
          No cues are on this run sheet yet. Add them in the Run sheet workspace.
        </p>
      ) : null}
      {!loadError ? (
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
              <div className="flex flex-wrap gap-1">
                {(["pending", "active", "done"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={c.status === s}
                    disabled={updatingCueId === c.id}
                    className={cn(
                      "min-h-11 rounded-sm border px-3 text-[10px] uppercase tracking-[0.12em] disabled:opacity-50",
                      c.status === s ? "bg-paper text-void" : "text-mist hover:bg-paper/10",
                    )}
                    onClick={() => void updateCue(c, s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </main>
  );
}
