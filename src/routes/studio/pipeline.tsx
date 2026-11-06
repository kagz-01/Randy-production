import { createFileRoute } from "@tanstack/react-router";
import { Plus, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EVENT_TYPES, SERVICES, TIERS } from "@/data/catalog";
import { hasProductionVenue, summarizeJobCommandBoard } from "@/lib/job-command-board";
import {
  createProductionJob,
  listClientAccounts,
  listPipeline,
  moveJob,
  updateProductionJob,
  type ClientAccountRow,
  type ProductionJobInput,
  type JobRow,
} from "@/lib/server/studio";
import { cn, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/studio/pipeline")({
  validateSearch: (search: Record<string, unknown>) => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
  }),
  component: PipelinePage,
});

const COLS = [
  { key: "inquiry", label: "Inquiry" },
  { key: "quoted", label: "Quoted" },
  { key: "booked", label: "Booked" },
  { key: "production", label: "On the floor" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

type JobDraft = {
  title: string;
  client_name: string;
  client_user_id: string;
  service: string;
  event_type: string;
  guests: string;
  tier: string;
  status: string;
  venue: string;
  event_date: string;
  ballpark: string;
  notes: string;
};

const EMPTY_JOB_DRAFT: JobDraft = {
  title: "",
  client_name: "",
  client_user_id: "",
  service: "",
  event_type: "",
  guests: "",
  tier: "",
  status: "inquiry",
  venue: "",
  event_date: "",
  ballpark: "0",
  notes: "",
};

function jobToDraft(job: JobRow): JobDraft {
  return {
    title: job.title,
    client_name: job.client_name,
    client_user_id: job.owner_user_id ?? "",
    service: job.service,
    event_type: job.event_type,
    guests: String(job.guests),
    tier: job.tier,
    status: job.status,
    venue: job.venue ?? "",
    event_date: job.event_date?.slice(0, 10) ?? "",
    ballpark: String(job.ballpark),
    notes: job.notes ?? "",
  };
}

function draftToInput(draft: JobDraft): ProductionJobInput {
  return {
    ...draft,
    guests: Number(draft.guests),
    ballpark: Number(draft.ballpark),
    venue: draft.venue || null,
    event_date: draft.event_date || null,
    notes: draft.notes || null,
  };
}

function PipelinePage() {
  const { jobId: requestedJobId } = Route.useSearch();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [clientAccounts, setClientAccounts] = useState<ClientAccountRow[]>([]);
  const [clientAccountsError, setClientAccountsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newJob, setNewJob] = useState<JobDraft>(EMPTY_JOB_DRAFT);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<JobDraft>(EMPTY_JOB_DRAFT);
  const [savingJob, setSavingJob] = useState(false);
  const selectedIdRef = useRef<string | null>(selectedId);
  selectedIdRef.current = selectedId;

  const refresh = useCallback(async (preferredJobId?: string) => {
    setLoadError(null);
    setLoading(true);
    try {
      const rows = await listPipeline();
      setJobs(rows);
      const currentSelectedId = selectedIdRef.current;
      let nextSelectedId = currentSelectedId;
      if (preferredJobId && rows.some((row) => row.id === preferredJobId)) {
        nextSelectedId = preferredJobId;
      } else if (!currentSelectedId || !rows.some((row) => row.id === currentSelectedId)) {
        nextSelectedId = rows[0]?.id ?? null;
      }
      selectedIdRef.current = nextSelectedId;
      setSelectedId(nextSelectedId);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(requestedJobId).catch((error) => {
      console.error("[production-pipeline] Could not load jobs", error);
      setLoadError("The job board could not be loaded. Refresh and try again.");
    });
  }, [refresh, requestedJobId]);

  useEffect(() => {
    let active = true;
    listClientAccounts()
      .then((accounts) => {
        if (!active) return;
        setClientAccounts(accounts);
        setClientAccountsError(null);
      })
      .catch((error) => {
        console.error("[production-pipeline] Could not load client accounts", error);
        if (active) setClientAccountsError("Client accounts could not be loaded. Refresh before linking an account.");
      });
    return () => {
      active = false;
    };
  }, []);

  const board = useMemo(() => summarizeJobCommandBoard(jobs), [jobs]);
  const selectedJob = jobs.find((job) => job.id === selectedId) ?? jobs[0] ?? null;

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingJob(true);
    try {
      const created = await createProductionJob({ data: draftToInput(newJob) });
      setJobs((current) => [created, ...current]);
      setSelectedId(created.id);
      selectedIdRef.current = created.id;
      setNewJob(EMPTY_JOB_DRAFT);
      setShowCreateForm(false);
      toast.success("Production created.");
    } catch (error) {
      console.error("[production-pipeline] Could not create production", error);
      toast.error(error instanceof Error ? error.message : "The production could not be created.");
    } finally {
      setSavingJob(false);
    }
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingJobId) return;
    setSavingJob(true);
    try {
      const updated = await updateProductionJob({ data: { id: editingJobId, ...draftToInput(editDraft) } });
      setJobs((current) => current.map((job) => job.id === updated.id ? updated : job));
      setEditingJobId(null);
      toast.success("Production details saved.");
    } catch (error) {
      console.error("[production-pipeline] Could not update production", error);
      toast.error(error instanceof Error ? error.message : "Production details could not be saved.");
    } finally {
      setSavingJob(false);
    }
  }

  return (
    <main className="shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Job command</p>
          <h1 className="mt-2 font-serif text-5xl">Production jobs</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 text-right">
            <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Booked & in production</p>
            <p className="font-serif text-2xl">{formatMoney(board.value)}</p>
          </div>
          <Button type="button" variant="line" size="sm" onClick={() => void refresh().catch((error) => {
            console.error("[production-pipeline] Could not refresh jobs", error);
            setLoadError("The job board could not be refreshed.");
          })} disabled={loading}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => setShowCreateForm((open) => !open)}>
            <Plus className="size-4" />
            Add production
          </Button>
        </div>
      </div>

      {loadError ? (
        <p role="alert" className="mt-5 text-sm text-red-300">{loadError}</p>
      ) : null}
      {showCreateForm ? (
        <JobForm
          title="Create production record"
          submitLabel="Create production"
          draft={newJob}
          clientAccounts={clientAccounts}
          clientAccountsError={clientAccountsError}
          clientAccountLocked={false}
          busy={savingJob}
          onChange={setNewJob}
          onSubmit={createJob}
          onCancel={() => setShowCreateForm(false)}
        />
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <Metric label="Live jobs" value={String(board.live)} detail="Booked and in production" />
        <Metric label="Due soon" value={String(board.dueSoon.length)} detail="Within the next 6 weeks" />
        <Metric label="Open inquiries & quotes" value={String(board.outstanding)} detail="Waiting for a next step" />
        <Metric label="Missing date or venue" value={String(board.needsAttention.filter((job) => !hasProductionVenue(job.venue) || !job.event_date).length)} detail="Across active production records" />
      </section>

      {loading && jobs.length === 0 ? (
        <p role="status" className="mt-8 text-sm text-mist">Loading production records…</p>
      ) : null}

      {selectedJob ? (
        <>
          <section className="mt-8 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="glass rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Production record</p>
                  <h2 className="mt-2 font-serif text-3xl">{selectedJob.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-blue/30 bg-blue/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-blue-2">
                    {selectedJob.status}
                  </span>
                  {editingJobId !== selectedJob.id ? (
                    <Button type="button" variant="line" size="sm" onClick={() => {
                      setEditingJobId(selectedJob.id);
                      setEditDraft(jobToDraft(selectedJob));
                    }}>
                      Edit details
                    </Button>
                  ) : null}
                </div>
              </div>

              {editingJobId === selectedJob.id ? (
                <JobForm
                  title="Edit production"
                  submitLabel="Save production"
                  draft={editDraft}
                  clientAccounts={clientAccounts}
                  clientAccountsError={clientAccountsError}
                  clientAccountLocked={Boolean(selectedJob.owner_user_id)}
                  busy={savingJob}
                  onChange={setEditDraft}
                  onSubmit={saveJob}
                  onCancel={() => setEditingJobId(null)}
                />
              ) : (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Detail label="Client" value={selectedJob.client_name} />
                    <Detail label="Service" value={selectedJob.service} />
                    <Detail label="Event type" value={selectedJob.event_type} />
                    <Detail label="Date" value={selectedJob.event_date ?? "Not set"} />
                    <Detail label="Venue" value={selectedJob.venue || "Not set"} />
                    <Detail label="Guests" value={String(selectedJob.guests)} />
                    <Detail label="Tier" value={selectedJob.tier} />
                    <Detail label="Budget" value={formatMoney(selectedJob.ballpark)} />
                    <Detail label="Job status" value={selectedJob.status} />
                  </div>
                  {selectedJob.notes ? (
                    <div className="mt-4 rounded-md border border-paper/10 bg-ink/50 p-4">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-mist">Production notes</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-paper/85">{selectedJob.notes}</p>
                    </div>
                  ) : null}
                </>
              )}
            </article>

            <aside className="glass rounded-lg p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Attention list</p>
              <div className="mt-4 space-y-3">
                {board.needsAttention.length === 0 ? (
                  <p className="text-sm text-mist">No open decisions or missing venue/date details.</p>
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

          <p className="mt-5 text-xs text-mist">
            Stage changes are saved to the production record. Cancelled jobs stay in the board history and can be reopened.
          </p>
        </>
      ) : !loading && !loadError ? (
        <section className="mt-8 rounded-xl border border-paper/10 bg-ink/60 p-6">
          <h2 className="text-xl font-medium text-paper">No production records yet</h2>
          <p className="mt-2 text-sm text-mist">Add a real inquiry or production record to start the workflow.</p>
        </section>
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
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-blue-2">{j.service}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedId(j.id)}
                      className="text-left font-serif text-xl hover:text-blue-2"
                    >
                      {j.title}
                    </button>
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
                            } catch (error) {
                              console.error("[production-pipeline] Could not change job stage", error);
                              toast.error(error instanceof Error ? error.message : "Could not move production.");
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

function JobForm({
  title,
  submitLabel,
  draft,
  clientAccounts,
  clientAccountsError,
  clientAccountLocked,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: {
  title: string;
  submitLabel: string;
  draft: JobDraft;
  clientAccounts: ClientAccountRow[];
  clientAccountsError: string | null;
  clientAccountLocked: boolean;
  busy: boolean;
  onChange: (draft: JobDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const patch = <K extends keyof JobDraft>(key: K, value: JobDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <form onSubmit={onSubmit} className="mt-5 rounded-xl border border-blue/20 bg-blue/5 p-5">
      <h3 className="text-lg font-medium text-paper">{title}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1.5 text-xs text-mist">
          Production title
          <Input required maxLength={200} value={draft.title} onChange={(event) => patch("title", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-xs text-mist">
          Client name
          <Input required maxLength={200} value={draft.client_name} onChange={(event) => patch("client_name", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-xs text-mist">
          Client portal account
          <select
            value={draft.client_user_id}
            disabled={clientAccountLocked || clientAccountsError !== null}
            onChange={(event) => patch("client_user_id", event.target.value)}
            className="min-h-11 rounded-md border border-paper/15 bg-void px-3 text-sm text-paper disabled:opacity-60"
          >
            <option value="">Not linked</option>
            {draft.client_user_id && !clientAccounts.some((account) => account.user_id === draft.client_user_id) ? (
              <option value={draft.client_user_id}>Existing linked client</option>
            ) : null}
            {clientAccounts.map((account) => (
              <option key={account.user_id} value={account.user_id}>
                {account.display_name} · {account.email}
              </option>
            ))}
          </select>
          <span className="text-[11px] leading-relaxed text-mist">
            {clientAccountLocked
              ? "This project is already linked and cannot be reassigned."
              : clientAccountsError ?? "Only verified client accounts can be linked; you can also leave it unlinked."}
          </span>
        </label>
        <label className="grid gap-1.5 text-xs text-mist">
          Service
          <select required value={draft.service} onChange={(event) => patch("service", event.target.value)} className="min-h-11 rounded-md border border-paper/15 bg-void px-3 text-sm text-paper">
            {!draft.service ? <option value="" disabled>Choose a service</option> : null}
            {draft.service && !SERVICES.some((service) => service.key === draft.service) ? <option value={draft.service}>{draft.service}</option> : null}
            {SERVICES.map((service) => <option key={service.key} value={service.key}>{service.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-mist">
          Event type
          <select required value={draft.event_type} onChange={(event) => patch("event_type", event.target.value)} className="min-h-11 rounded-md border border-paper/15 bg-void px-3 text-sm text-paper">
            {!draft.event_type ? <option value="" disabled>Choose an event type</option> : null}
            {draft.event_type && !EVENT_TYPES.some((type) => type.key === draft.event_type) ? <option value={draft.event_type}>{draft.event_type}</option> : null}
            {EVENT_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-mist">
          Status
          <select value={draft.status} onChange={(event) => patch("status", event.target.value)} className="min-h-11 rounded-md border border-paper/15 bg-void px-3 text-sm capitalize text-paper">
            {COLS.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-mist">
          Production tier
          <select required value={draft.tier} onChange={(event) => patch("tier", event.target.value)} className="min-h-11 rounded-md border border-paper/15 bg-void px-3 text-sm text-paper">
            {!draft.tier ? <option value="" disabled>Choose a tier</option> : null}
            {draft.tier && !TIERS.some((tier) => tier.key === draft.tier) ? <option value={draft.tier}>{draft.tier}</option> : null}
            {TIERS.map((tier) => <option key={tier.key} value={tier.key}>{tier.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-mist">
          Event date
          <Input type="date" value={draft.event_date} onChange={(event) => patch("event_date", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-xs text-mist">
          Venue
          <Input maxLength={300} value={draft.venue} onChange={(event) => patch("venue", event.target.value)} placeholder="Not confirmed yet" />
        </label>
        <label className="grid gap-1.5 text-xs text-mist">
          Guest count
          <Input required type="number" min={0} max={100000} step={1} value={draft.guests} onChange={(event) => patch("guests", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-xs text-mist sm:col-span-2 xl:col-span-1">
          Working budget (KES)
          <Input type="number" min={0} max={2000000000} step={1} value={draft.ballpark} onChange={(event) => patch("ballpark", event.target.value)} />
        </label>
        <label className="grid gap-1.5 text-xs text-mist sm:col-span-2 xl:col-span-3">
          Production notes
          <textarea
            maxLength={10000}
            rows={4}
            value={draft.notes}
            onChange={(event) => patch("notes", event.target.value)}
            className="w-full rounded-md border border-paper/15 bg-void px-3 py-2.5 text-sm text-paper outline-none focus-visible:border-blue-2"
            placeholder="Record the real scope, constraints, and decisions."
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          <Save className="size-4" />
          {busy ? "Saving…" : submitLabel}
        </Button>
        <Button type="button" variant="line" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </form>
  );
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
