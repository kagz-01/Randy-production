import { createFileRoute } from "@tanstack/react-router";
import { Printer, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createJobCue,
  deleteJobCue,
  listJobCues,
  listPipeline,
  setCueStatus,
  updateJobCue,
  type CueRow,
  type JobRow,
} from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/runsheet")({ component: RunSheetPage });

type CueDraft = Pick<CueRow, "title" | "owner" | "kind"> & { starts_at: string };
type NewCueDraft = { startsAt: string; title: string; owner: string; kind: string };
const EMPTY_NEW_CUE: NewCueDraft = { startsAt: "", title: "", owner: "", kind: "" };

function timeValue(value: string) {
  const match = value.match(/(?:T)?(\d{2}:\d{2})/);
  return match?.[1] ?? "";
}

function RunSheetPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [cues, setCues] = useState<CueRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CueDraft>>({});
  const [newCue, setNewCue] = useState<NewCueDraft>(EMPTY_NEW_CUE);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCues, setLoadingCues] = useState(false);
  const [savingCueId, setSavingCueId] = useState<string | null>(null);
  const [savingNewCue, setSavingNewCue] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const cueRequestId = useRef(0);

  const activeJobs = useMemo(
    () =>
      [...jobs]
        .filter((job) => ["booked", "production"].includes(job.status))
        .sort((a, b) => (a.event_date ?? "9999-12-31").localeCompare(b.event_date ?? "9999-12-31")),
    [jobs],
  );
  const selectedJob = activeJobs.find((job) => job.id === selectedJobId) ?? null;

  const refreshJobs = useCallback(async () => {
    setLoadError(null);
    setLoadingJobs(true);
    try {
      const rows = await listPipeline();
      setJobs(rows);
      setSelectedJobId((current) =>
        rows.some((job) => job.id === current && ["booked", "production"].includes(job.status))
          ? current
          : (rows.find((job) => ["booked", "production"].includes(job.status))?.id ?? ""),
      );
    } catch (error) {
      console.error("[studio-runsheet] Could not load productions", error);
      setLoadError("Booked productions could not be loaded. Refresh and try again.");
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const refreshCues = useCallback(async (jobId: string) => {
    const requestId = ++cueRequestId.current;
    setLoadingCues(true);
    setLoadError(null);
    try {
      const rows = await listJobCues({ data: { jobId } });
      if (requestId !== cueRequestId.current) return;
      setCues(rows);
      setDrafts(
        Object.fromEntries(
          rows.map((cue) => [
            cue.id,
            {
              starts_at: timeValue(cue.starts_at),
              title: cue.title,
              owner: cue.owner,
              kind: cue.kind,
            },
          ]),
        ),
      );
    } catch (error) {
      if (requestId !== cueRequestId.current) return;
      console.error("[studio-runsheet] Could not load run-sheet cues", error);
      setLoadError("This run sheet could not be loaded. Refresh and try again.");
    } finally {
      if (requestId === cueRequestId.current) setLoadingCues(false);
    }
  }, []);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  useEffect(() => {
    if (!selectedJobId || !activeJobs.some((job) => job.id === selectedJobId)) {
      cueRequestId.current += 1;
      setCues([]);
      setDrafts({});
      setLoadingCues(false);
      return;
    }
    void refreshCues(selectedJobId);
    return () => {
      cueRequestId.current += 1;
    };
  }, [activeJobs, refreshCues, selectedJobId]);

  function updateDraft(id: string, field: keyof CueDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
  }

  async function saveCue(cue: CueRow) {
    const draft = drafts[cue.id];
    if (!draft) return;
    setSavingCueId(cue.id);
    try {
      const updated = await updateJobCue({
        data: {
          id: cue.id,
          startsAt: draft.starts_at,
          title: draft.title,
          owner: draft.owner,
          kind: draft.kind,
        },
      });
      setCues((current) =>
        current
          .map((item) => (item.id === cue.id ? updated : item))
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at) || a.sort_order - b.sort_order),
      );
      toast.success("Run-sheet cue saved.");
    } catch (error) {
      console.error("[studio-runsheet] Could not save cue", error);
      toast.error(error instanceof Error ? error.message : "The cue could not be saved.");
    } finally {
      setSavingCueId(null);
    }
  }

  async function addCue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedJob) return;
    setSavingNewCue(true);
    try {
      const created = await createJobCue({
        data: { jobId: selectedJob.id, ...newCue },
      });
      setCues((current) =>
        [...current, created].sort(
          (a, b) => a.starts_at.localeCompare(b.starts_at) || a.sort_order - b.sort_order,
        ),
      );
      setDrafts((current) => ({
        ...current,
        [created.id]: {
          starts_at: timeValue(created.starts_at),
          title: created.title,
          owner: created.owner,
          kind: created.kind,
        },
      }));
      setNewCue(EMPTY_NEW_CUE);
      toast.success("Cue added to the run sheet.");
    } catch (error) {
      console.error("[studio-runsheet] Could not add cue", error);
      toast.error(error instanceof Error ? error.message : "The cue could not be added.");
    } finally {
      setSavingNewCue(false);
    }
  }

  async function changeCueStatus(cue: CueRow, status: "pending" | "active" | "done") {
    setSavingCueId(cue.id);
    try {
      await setCueStatus({ data: { id: cue.id, status } });
      setCues((current) =>
        current.map((item) => (item.id === cue.id ? { ...item, status } : item)),
      );
    } catch (error) {
      console.error("[studio-runsheet] Could not update cue status", error);
      toast.error(error instanceof Error ? error.message : "Cue status could not be updated.");
    } finally {
      setSavingCueId(null);
    }
  }

  async function removeCue(cue: CueRow) {
    if (!window.confirm(`Remove "${cue.title}" from this run sheet?`)) return;
    setSavingCueId(cue.id);
    try {
      await deleteJobCue({ data: { id: cue.id } });
      setCues((current) => current.filter((item) => item.id !== cue.id));
      setDrafts((current) =>
        Object.fromEntries(Object.entries(current).filter(([id]) => id !== cue.id)),
      );
      toast.success("Cue removed.");
    } catch (error) {
      console.error("[studio-runsheet] Could not remove cue", error);
      toast.error(error instanceof Error ? error.message : "The cue could not be removed.");
    } finally {
      setSavingCueId(null);
    }
  }

  return (
    <main className="shell pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-paper/10 pb-6">
        <div>
          <p className="eyebrow">Production schedule</p>
          <h1 className="mt-2 text-4xl md:text-5xl">Run sheet</h1>
          <p className="mt-3 max-w-2xl text-sm text-mist">
            Build and maintain the timed cues the crew will follow on show day.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="line"
            size="sm"
            className="min-h-11"
            onClick={() => void refreshJobs()}
            disabled={loadingJobs}
          >
            <RefreshCw className={cn("size-4", loadingJobs && "animate-spin")} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="line"
            size="sm"
            className="min-h-11"
            onClick={() => window.print()}
            disabled={!selectedJob || !cues.length}
          >
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </header>

      {loadError ? (
        <p role="alert" className="mt-5 text-sm text-red-300">
          {loadError}
        </p>
      ) : null}
      {loadingJobs ? (
        <p role="status" className="mt-6 text-sm text-mist">
          Loading booked productions…
        </p>
      ) : activeJobs.length === 0 ? (
        <section className="mt-6 rounded-xl border border-paper/10 bg-ink/60 p-6">
          <h2 className="text-xl font-medium text-paper">No booked production to schedule</h2>
          <p className="mt-2 text-sm text-mist">
            Move a job to Booked in Jobs before creating its show-day run sheet.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-4 rounded-xl border border-paper/10 bg-ink/60 p-5 md:grid-cols-[minmax(0,1fr)_2fr] md:items-end">
            <label className="grid gap-2 text-xs font-medium text-mist">
              Production
              <select
                value={selectedJobId}
                onChange={(event) => setSelectedJobId(event.target.value)}
                className="min-h-11 rounded-md border border-paper/15 bg-void px-3 text-sm text-paper"
              >
                {activeJobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} · {job.status} · {job.event_date ?? "date not set"}
                  </option>
                ))}
              </select>
            </label>
            {selectedJob ? (
              <p className="text-sm text-mist">
                {selectedJob.client_name} · {selectedJob.venue || "Venue not set"} ·{" "}
                {selectedJob.guests} guests
              </p>
            ) : null}
          </section>

          {selectedJob && !loadingCues ? (
            <section className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Saved production cues</p>
                  <h2 className="mt-1 text-2xl font-semibold text-paper">{selectedJob.title}</h2>
                </div>
                <p className="text-xs text-mist">
                  {cues.length} cues · changes save to this production
                </p>
              </div>

              {cues.length ? (
                <ol className="mt-4 divide-y divide-paper/10 border-y border-paper/10">
                  {cues.map((cue) => {
                    const draft = drafts[cue.id];
                    return (
                      <li
                        key={cue.id}
                        className="grid gap-3 py-5 xl:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[130px_minmax(180px,1.5fr)_minmax(140px,1fr)_minmax(120px,0.8fr)]">
                          <label className="grid gap-1 text-xs text-mist">
                            Time
                            <Input
                              type="time"
                              value={draft?.starts_at ?? ""}
                              onChange={(event) =>
                                updateDraft(cue.id, "starts_at", event.target.value)
                              }
                            />
                          </label>
                          <label className="grid gap-1 text-xs text-mist">
                            Cue
                            <Input
                              value={draft?.title ?? ""}
                              onChange={(event) => updateDraft(cue.id, "title", event.target.value)}
                              maxLength={200}
                            />
                          </label>
                          <label className="grid gap-1 text-xs text-mist">
                            Owner
                            <Input
                              value={draft?.owner ?? ""}
                              onChange={(event) => updateDraft(cue.id, "owner", event.target.value)}
                              maxLength={120}
                            />
                          </label>
                          <label className="grid gap-1 text-xs text-mist">
                            Type
                            <Input
                              value={draft?.kind ?? ""}
                              onChange={(event) => updateDraft(cue.id, "kind", event.target.value)}
                              maxLength={80}
                            />
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                          {(["pending", "active", "done"] as const).map((status) => (
                            <button
                              key={status}
                              type="button"
                              aria-pressed={cue.status === status}
                              disabled={savingCueId === cue.id}
                              onClick={() => void changeCueStatus(cue, status)}
                              className={cn(
                                "min-h-11 rounded-md border px-3 text-xs capitalize",
                                cue.status === status
                                  ? "border-blue/40 bg-blue/10 text-blue-2"
                                  : "border-paper/10 text-mist hover:text-paper",
                              )}
                            >
                              {status}
                            </button>
                          ))}
                          <Button
                            type="button"
                            variant="line"
                            size="sm"
                            className="min-h-11"
                            disabled={savingCueId === cue.id}
                            onClick={() => void saveCue(cue)}
                          >
                            {savingCueId === cue.id ? "Saving…" : "Save"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="min-h-11 min-w-11"
                            disabled={savingCueId === cue.id}
                            aria-label={`Remove ${cue.title}`}
                            onClick={() => void removeCue(cue)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-4 rounded-lg border border-paper/10 bg-ink/50 p-5 text-sm text-mist">
                  No cues have been saved for this production. Add the real show-day sequence below.
                </p>
              )}

              <form
                onSubmit={addCue}
                className="mt-6 rounded-xl border border-blue/20 bg-blue/5 p-5"
              >
                <h3 className="font-medium text-paper">Add a show-day cue</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="grid gap-1 text-xs text-mist">
                    Time
                    <Input
                      type="time"
                      required
                      value={newCue.startsAt}
                      onChange={(event) => setNewCue({ ...newCue, startsAt: event.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-mist">
                    Cue
                    <Input
                      required
                      maxLength={200}
                      value={newCue.title}
                      onChange={(event) => setNewCue({ ...newCue, title: event.target.value })}
                      placeholder="e.g. Doors open"
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-mist">
                    Owner
                    <Input
                      required
                      maxLength={120}
                      value={newCue.owner}
                      onChange={(event) => setNewCue({ ...newCue, owner: event.target.value })}
                      placeholder="Person or team"
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-mist">
                    Type
                    <Input
                      required
                      maxLength={80}
                      value={newCue.kind}
                      onChange={(event) => setNewCue({ ...newCue, kind: event.target.value })}
                      placeholder="e.g. sound, setup"
                    />
                  </label>
                </div>
                <Button type="submit" className="mt-4" disabled={savingNewCue}>
                  {savingNewCue ? "Adding…" : "Add cue"}
                </Button>
              </form>
            </section>
          ) : selectedJob && loadingCues ? (
            <p role="status" className="mt-6 text-sm text-mist">
              Loading this production’s cues…
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
