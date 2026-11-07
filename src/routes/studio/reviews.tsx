import { createFileRoute } from "@tanstack/react-router";
import { Check, MessageSquare, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createJobDraft,
  deleteJobDraft,
  listJobDrafts,
  listPipeline,
  updateJobDraft,
  type DraftRow,
  type JobRow,
} from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/reviews")({ component: ClientReviewsPage });

type DraftForm = { title: string; kind: string; note: string };
const EMPTY_DRAFT: DraftForm = { title: "", kind: "Design", note: "" };

function ClientReviewsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [newDraft, setNewDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyDraftId, setBusyDraftId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const draftRequestId = useRef(0);

  const reviewJobs = useMemo(
    () => jobs.filter((job) => !["delivered", "cancelled"].includes(job.status)),
    [jobs],
  );
  const selectedJob = reviewJobs.find((job) => job.id === selectedId) ?? null;

  const refreshJobs = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const rows = await listPipeline();
      setJobs(rows);
      setSelectedId((current) =>
        rows.some((job) => job.id === current && !["delivered", "cancelled"].includes(job.status))
          ? current
          : (rows.find((job) => !["delivered", "cancelled"].includes(job.status))?.id ?? ""),
      );
    } catch (error) {
      console.error("[studio-reviews] Could not load productions", error);
      setLoadError("Productions could not be loaded. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDrafts = useCallback(async (jobId: string) => {
    const requestId = ++draftRequestId.current;
    setLoadError(null);
    setLoadingDrafts(true);
    try {
      const rows = await listJobDrafts({ data: { jobId } });
      if (requestId === draftRequestId.current) setDrafts(rows);
    } catch (error) {
      if (requestId !== draftRequestId.current) return;
      console.error("[studio-reviews] Could not load client drafts", error);
      setLoadError("Client review items could not be loaded. Refresh and try again.");
    } finally {
      if (requestId === draftRequestId.current) setLoadingDrafts(false);
    }
  }, []);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  useEffect(() => {
    if (!selectedJob) {
      draftRequestId.current += 1;
      setDrafts([]);
      setLoadingDrafts(false);
      return;
    }
    setNewDraft(EMPTY_DRAFT);
    void refreshDrafts(selectedJob.id);
    return () => {
      draftRequestId.current += 1;
    };
  }, [refreshDrafts, selectedJob]);

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedJob) return;
    setSaving(true);
    try {
      const created = await createJobDraft({
        data: { jobId: selectedJob.id, ...newDraft },
      });
      setDrafts((current) => [...current, created].sort((a, b) => a.title.localeCompare(b.title)));
      setNewDraft(EMPTY_DRAFT);
      toast.success("Draft shared for client review.");
    } catch (error) {
      console.error("[studio-reviews] Could not share client draft", error);
      toast.error(error instanceof Error ? error.message : "The draft could not be shared.");
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft(draft: DraftRow, form: DraftForm): Promise<boolean> {
    setBusyDraftId(draft.id);
    try {
      const updated = await updateJobDraft({
        data: { id: draft.id, jobId: draft.job_id, ...form },
      });
      setDrafts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success("Draft updated and returned to client review.");
      return true;
    } catch (error) {
      console.error("[studio-reviews] Could not update client draft", error);
      toast.error(error instanceof Error ? error.message : "The draft could not be updated.");
      return false;
    } finally {
      setBusyDraftId(null);
    }
  }

  async function removeDraft(draft: DraftRow) {
    if (!window.confirm(`Remove "${draft.title}" from this client review?`)) return;
    setBusyDraftId(draft.id);
    try {
      await deleteJobDraft({ data: { id: draft.id, jobId: draft.job_id } });
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      toast.success("Draft removed.");
    } catch (error) {
      console.error("[studio-reviews] Could not remove client draft", error);
      toast.error(error instanceof Error ? error.message : "The draft could not be removed.");
    } finally {
      setBusyDraftId(null);
    }
  }

  return (
    <main className="shell pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-paper/10 pb-6">
        <div>
          <p className="eyebrow">Client collaboration</p>
          <h1 className="mt-2 text-4xl md:text-5xl">Client reviews</h1>
          <p className="mt-3 max-w-2xl text-sm text-mist">
            Share a real design or content draft, review the client’s response, then update and
            resubmit it.
          </p>
        </div>
        <Button
          type="button"
          variant="line"
          size="sm"
          onClick={() => void refreshJobs()}
          disabled={loading}
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      {loadError ? (
        <p role="alert" className="mt-5 text-sm text-red-300">
          {loadError}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="mt-6 text-sm text-mist">
          Loading current productions…
        </p>
      ) : reviewJobs.length === 0 ? (
        <section className="mt-6 rounded-xl border border-paper/10 bg-ink/60 p-6">
          <h2 className="text-xl font-medium text-paper">No active productions</h2>
          <p className="mt-2 text-sm text-mist">
            Create a production in Jobs before preparing a client review.
          </p>
        </section>
      ) : (
        <>
          <label className="mt-6 grid max-w-2xl gap-2 text-xs font-medium text-mist">
            Production
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="min-h-11 rounded-md border border-paper/15 bg-void px-3 text-sm text-paper"
            >
              {reviewJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} · {job.client_name}
                </option>
              ))}
            </select>
          </label>

          {selectedJob ? (
            <div className="mt-6 space-y-5">
              <section className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">
                      {selectedJob.client_name} · {selectedJob.status}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-paper">{selectedJob.title}</h2>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs",
                      selectedJob.owner_user_id
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        : "border-amber-400/30 bg-amber-400/10 text-amber-200",
                    )}
                  >
                    {selectedJob.owner_user_id
                      ? "Client portal linked"
                      : "No client account linked"}
                  </span>
                </div>
                {!selectedJob.owner_user_id ? (
                  <p className="mt-4 text-sm text-mist">
                    Link a verified client account from Jobs before sharing drafts. Without an
                    account, no client can see or respond to them.
                  </p>
                ) : null}
              </section>

              {selectedJob.owner_user_id ? (
                <form
                  onSubmit={createDraft}
                  className="rounded-xl border border-blue/20 bg-blue/5 p-5 md:p-6"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="size-4 text-blue-2" aria-hidden="true" />
                    <h3 className="text-lg font-medium text-paper">Share a draft</h3>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-xs text-mist">
                      Draft title
                      <Input
                        required
                        maxLength={200}
                        value={newDraft.title}
                        onChange={(event) =>
                          setNewDraft({ ...newDraft, title: event.target.value })
                        }
                        placeholder="e.g. Reception stage layout"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs text-mist">
                      Type
                      <Input
                        required
                        maxLength={80}
                        value={newDraft.kind}
                        onChange={(event) => setNewDraft({ ...newDraft, kind: event.target.value })}
                        placeholder="Design, run of show, content…"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs text-mist sm:col-span-2">
                      Details for the client
                      <textarea
                        maxLength={10000}
                        rows={4}
                        value={newDraft.note}
                        onChange={(event) => setNewDraft({ ...newDraft, note: event.target.value })}
                        className="w-full rounded-md border border-paper/15 bg-void px-3 py-2.5 text-sm text-paper outline-none focus-visible:border-blue-2"
                        placeholder="Describe the draft and what you need the client to review."
                      />
                    </label>
                  </div>
                  <Button type="submit" className="mt-4 min-h-11" disabled={saving}>
                    <MessageSquare className="size-4" />
                    {saving ? "Sharing…" : "Share for review"}
                  </Button>
                </form>
              ) : null}

              <section className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="eyebrow">Project feedback loop</p>
                    <h3 className="mt-2 text-2xl font-semibold text-paper">Shared drafts</h3>
                  </div>
                  <p className="text-xs text-mist">{drafts.length} items</p>
                </div>
                {loadingDrafts ? (
                  <p role="status" className="mt-5 text-sm text-mist">
                    Loading shared drafts…
                  </p>
                ) : drafts.length ? (
                  <ul className="mt-4 space-y-4">
                    {drafts.map((draft) => (
                      <DraftEditor
                        key={draft.id}
                        draft={draft}
                        busy={busyDraftId === draft.id}
                        onSave={(form) => saveDraft(draft, form)}
                        onDelete={() => void removeDraft(draft)}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="mt-5 rounded-lg border border-dashed border-paper/15 px-4 py-5">
                    <p className="text-sm font-medium text-paper">No drafts shared yet</p>
                    <p className="mt-1 text-sm text-mist">
                      Add a draft above to make it available in the linked client’s project
                      workspace.
                    </p>
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}

function DraftEditor({
  draft,
  busy,
  onSave,
  onDelete,
}: {
  draft: DraftRow;
  busy: boolean;
  onSave: (form: DraftForm) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<DraftForm>({
    title: draft.title,
    kind: draft.kind,
    note: draft.note ?? "",
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setForm({ title: draft.title, kind: draft.kind, note: draft.note ?? "" });
    setDirty(false);
  }, [draft.id, draft.title, draft.kind, draft.note, draft.status]);

  function patch<K extends keyof DraftForm>(key: K, value: DraftForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await onSave(form)) setDirty(false);
  }

  return (
    <li className="rounded-lg border border-paper/10 bg-void/35 p-4 md:p-5">
      <form onSubmit={submit}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-blue-2">{draft.kind}</p>
            <p className="mt-1 text-xs capitalize text-mist">
              Status: {draft.status.replaceAll("_", " ")}
            </p>
          </div>
          <Button type="button" variant="line" size="sm" disabled={busy} onClick={onDelete}>
            <Trash2 className="size-3.5" />
            Remove
          </Button>
        </div>
        {draft.client_feedback ? (
          <div className="mt-4 rounded-md border border-amber-400/20 bg-amber-400/5 p-3">
            <p className="flex items-center gap-2 text-xs font-medium text-amber-100">
              <MessageSquare className="size-3.5" />
              Client requested changes
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-mist">{draft.client_feedback}</p>
          </div>
        ) : null}
        {draft.status === "approved" ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-emerald-200">
            <Check className="size-4" />
            Approved by the client
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs text-mist">
            Draft title
            <Input
              required
              maxLength={200}
              value={form.title}
              onChange={(event) => patch("title", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs text-mist">
            Type
            <Input
              required
              maxLength={80}
              value={form.kind}
              onChange={(event) => patch("kind", event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-xs text-mist sm:col-span-2">
            Details shown to the client
            <textarea
              maxLength={10000}
              rows={4}
              value={form.note}
              onChange={(event) => patch("note", event.target.value)}
              className="w-full rounded-md border border-paper/15 bg-void px-3 py-2.5 text-sm text-paper outline-none focus-visible:border-blue-2"
            />
          </label>
        </div>
        <Button
          type="submit"
          variant={draft.status === "changes_requested" ? "primary" : "line"}
          className="mt-4 min-h-10"
          disabled={busy || !dirty}
        >
          <Save className="size-4" />
          {busy
            ? "Saving…"
            : draft.status === "changes_requested"
              ? "Update & resubmit"
              : "Save draft"}
        </Button>
      </form>
    </li>
  );
}
