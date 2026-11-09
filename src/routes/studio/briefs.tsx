import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPipeline, updateJobBrief, type JobRow } from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/briefs")({ component: BriefsPage });

type BriefDraft = { eventDate: string; venue: string; guests: string; notes: string };

function toDraft(job: JobRow): BriefDraft {
  return {
    eventDate: job.event_date?.slice(0, 10) ?? "",
    venue: job.venue ?? "",
    guests: String(job.guests),
    notes: job.notes ?? "",
  };
}

function BriefsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<BriefDraft>({ eventDate: "", venue: "", guests: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const planningJobs = useMemo(
    () =>
      [...jobs]
        .filter((job) => ["inquiry", "quoted", "booked", "production"].includes(job.status))
        .sort((a, b) => (a.event_date ?? "9999-12-31").localeCompare(b.event_date ?? "9999-12-31")),
    [jobs],
  );
  const selectedJob = planningJobs.find((job) => job.id === selectedId) ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listPipeline();
      setJobs(rows);
      setSelectedId((current) =>
        rows.some((job) => job.id === current && ["inquiry", "quoted", "booked", "production"].includes(job.status))
          ? current
          : rows.find((job) => ["inquiry", "quoted", "booked", "production"].includes(job.status))?.id ?? "",
      );
    } catch (error) {
      console.error("[studio-briefs] Could not load production briefs", error);
      setLoadError("Production briefs could not be loaded. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (selectedJob) setDraft(toDraft(selectedJob));
  }, [selectedId, selectedJob]);

  async function saveBrief(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedJob) return;
    const guests = Number(draft.guests);
    if (!Number.isInteger(guests) || guests < 0 || guests > 100_000) {
      toast.error("Guest count must be a whole number between 0 and 100,000.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateJobBrief({
        data: {
          id: selectedJob.id,
          eventDate: draft.eventDate || null,
          venue: draft.venue,
          guests,
          notes: draft.notes,
        },
      });
      setJobs((current) => current.map((job) => job.id === updated.id ? updated : job));
      setDraft(toDraft(updated));
      toast.success("Production brief saved.");
    } catch (error) {
      console.error("[studio-briefs] Could not save production brief", error);
      toast.error(error instanceof Error ? error.message : "The production brief could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const details = selectedJob ? [
    { label: "Event date", complete: Boolean(draft.eventDate), value: draft.eventDate || "Not set" },
    { label: "Venue", complete: Boolean(draft.venue.trim() && draft.venue.trim().toLowerCase() !== "tbc"), value: draft.venue || "Not set" },
    { label: "Guest count", complete: Number(draft.guests) > 0, value: draft.guests || "Not set" },
    { label: "Production notes", complete: Boolean(draft.notes.trim()), value: draft.notes.trim() ? "Recorded" : "None recorded" },
  ] : [];
  const missingDetails = details.filter((item) => !item.complete).length;

  return (
    <main className="shell pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-paper/10 pb-6">
        <div>
          <p className="eyebrow">Production planning</p>
          <h1 className="mt-2 text-4xl md:text-5xl">Production briefs</h1>
          <p className="mt-3 max-w-2xl text-sm text-mist">
            Keep the event date, venue, guest count and working notes accurate before the crew call.
          </p>
        </div>
        <Button type="button" variant="line" size="sm" className="min-h-11" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      {loadError ? <p role="alert" className="mt-5 text-sm text-red-300">{loadError}</p> : null}
      {loading ? (
        <p role="status" className="mt-6 text-sm text-mist">Loading current production records…</p>
      ) : planningJobs.length === 0 ? (
        <section className="mt-6 rounded-xl border border-paper/10 bg-ink/60 p-6">
          <h2 className="text-xl font-medium text-paper">No open production briefs</h2>
          <p className="mt-2 text-sm text-mist">
            New inquiries and active jobs appear here from the Jobs board. Delivered work stays in the archive.
          </p>
          <Link
            to="/studio/pipeline"
            search={{ jobId: undefined }}
            className="mt-4 inline-flex"
          >
            <Button type="button" className="min-h-11">
              Open jobs board
            </Button>
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-4 rounded-xl border border-paper/10 bg-ink/60 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="grid gap-2 text-xs font-medium text-mist">
              Production
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="min-h-11 rounded-md border border-paper/15 bg-void px-3 text-sm text-paper"
              >
                {planningJobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title} · {job.status}</option>
                ))}
              </select>
            </label>
            {selectedJob ? (
              <span className={cn(
                "rounded-full border px-3 py-2 text-xs capitalize",
                missingDetails ? "border-amber-400/30 bg-amber-400/10 text-amber-200" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
              )}>
                {missingDetails ? `${missingDetails} details to confirm` : "Core details recorded"}
              </span>
            ) : null}
          </section>

          {selectedJob ? (
            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <form onSubmit={saveBrief} className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
                <p className="eyebrow">{selectedJob.client_name} · {selectedJob.service}</p>
                <h2 className="mt-2 text-2xl font-semibold text-paper">{selectedJob.title}</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-medium text-mist">
                    Event date
                    <Input type="date" value={draft.eventDate} onChange={(event) => setDraft({ ...draft, eventDate: event.target.value })} />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-mist">
                    Venue
                    <Input maxLength={300} value={draft.venue} onChange={(event) => setDraft({ ...draft, venue: event.target.value })} placeholder="Confirmed venue or leave blank" />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-mist">
                    Expected guests
                    <Input type="number" min={0} max={100000} step={1} value={draft.guests} onChange={(event) => setDraft({ ...draft, guests: event.target.value })} />
                  </label>
                  <div className="grid gap-1.5 text-xs font-medium text-mist">
                    Job stage
                    <p className="flex min-h-11 items-center rounded-md border border-paper/10 px-3 text-sm capitalize text-paper">{selectedJob.status}</p>
                  </div>
                  <label className="grid gap-1.5 text-xs font-medium text-mist sm:col-span-2">
                    Production notes
                    <textarea
                      value={draft.notes}
                      maxLength={10_000}
                      onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                      rows={6}
                      className="w-full rounded-md border border-paper/15 bg-void px-3 py-2.5 text-sm text-paper outline-none focus-visible:border-blue-2"
                      placeholder="Record the real scope, constraints, client decisions and handover notes."
                    />
                    <span className="text-right font-normal">{draft.notes.length}/10,000</span>
                  </label>
                </div>
                <Button type="submit" className="mt-5 min-h-11" disabled={saving}>
                  <Save className="size-4" />
                  {saving ? "Saving brief…" : "Save production brief"}
                </Button>
              </form>

              <aside className="rounded-xl border border-paper/10 bg-ink/60 p-5">
                <p className="eyebrow">Record completeness</p>
                <h3 className="mt-2 text-xl font-medium text-paper">Facts from this brief</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist">
                  These indicators reflect saved production details only; they do not imply client approval or crew sign-off.
                </p>
                <ul className="mt-5 divide-y divide-paper/10">
                  {details.map((item) => (
                    <li key={item.label} className="flex items-start justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm text-paper">{item.label}</p>
                        <p className="mt-1 wrap-break-word text-xs text-mist">{item.value}</p>
                      </div>
                      <span className={item.complete ? "text-xs text-emerald-200" : "text-xs text-amber-200"}>
                        {item.complete ? "Recorded" : "Missing"}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          ) : null}
        </>
      )}
    </main>
  );
}
