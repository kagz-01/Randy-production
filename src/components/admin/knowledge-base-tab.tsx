import { Archive, BookOpen, Check, ExternalLink, Plus, Save } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listKnowledgeEntries,
  saveKnowledgeEntry,
  updateKnowledgeEntryStatus,
  type KnowledgeEntry,
} from "@/lib/server/knowledge";

type KnowledgeForm = {
  id: string | null;
  title: string;
  content: string;
  tags: string;
  source_name: string;
  source_url: string;
  source_published_at: string;
  source_checked_at: string;
  jurisdiction: string;
  evidence_type: KnowledgeEntry["evidence_type"];
  visibility: KnowledgeEntry["visibility"];
  confirmAnonymized: boolean;
};

const EMPTY_FORM = (): KnowledgeForm => ({
  id: null,
  title: "",
  content: "",
  tags: "",
  source_name: "",
  source_url: "",
  source_published_at: "",
  source_checked_at: new Date().toISOString().slice(0, 10),
  jurisdiction: "Kenya",
  evidence_type: "company_practice",
  visibility: "internal",
  confirmAnonymized: false,
});

const FIELD_CLASS =
  "mt-1 min-h-11 w-full rounded-md border border-paper/15 bg-void px-3 text-sm text-paper outline-none focus-visible:border-blue-2 focus-visible:ring-2 focus-visible:ring-blue/30";

function KnowledgeBaseTab() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [form, setForm] = useState<KnowledgeForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [legalApprovalEntryId, setLegalApprovalEntryId] = useState<string | null>(null);
  const [legalReviewConfirmed, setLegalReviewConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEntries(await listKnowledgeEntries());
    } catch (loadError) {
      console.error("[admin-knowledge] Could not load knowledge entries", loadError);
      setError("Knowledge entries could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  function editEntry(entry: KnowledgeEntry) {
    setForm({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      tags: entry.tags,
      source_name: entry.source_name,
      source_url: entry.source_url ?? "",
      source_published_at: entry.source_published_at ?? "",
      source_checked_at: entry.source_checked_at,
      jurisdiction: entry.jurisdiction,
      evidence_type: entry.evidence_type,
      visibility: entry.visibility,
      confirmAnonymized: false,
    });
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await saveKnowledgeEntry({ data: { ...form, source_url: form.source_url || null } });
      toast.success(form.id ? "Entry saved as a draft for review." : "Knowledge entry added as a draft.");
      setForm(EMPTY_FORM());
      await loadEntries();
    } catch (saveError) {
      console.error("[admin-knowledge] Could not save knowledge entry", saveError);
      toast.error(saveError instanceof Error ? saveError.message : "Knowledge entry could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    entry: KnowledgeEntry,
    status: KnowledgeEntry["status"],
    legalReviewConfirmed = false,
  ) {
    setBusyEntryId(entry.id);
    try {
      await updateKnowledgeEntryStatus({ data: { id: entry.id, status, legalReviewConfirmed } });
      toast.success(status === "approved" ? "Entry approved." : status === "archived" ? "Entry archived." : "Entry returned to draft.");
      setLegalApprovalEntryId(null);
      setLegalReviewConfirmed(false);
      await loadEntries();
    } catch (statusError) {
      console.error("[admin-knowledge] Could not update knowledge status", statusError);
      toast.error(statusError instanceof Error ? statusError.message : "Knowledge status could not be updated.");
    } finally {
      setBusyEntryId(null);
    }
  }

  const activeEntries = entries.filter((entry) => entry.status !== "archived");
  const archivedEntries = entries.filter((entry) => entry.status === "archived");

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-blue/20 bg-blue/5 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 size-5 shrink-0 text-blue-2" aria-hidden />
          <div>
            <h2 className="text-base font-semibold text-paper">A reviewed knowledge base for real production decisions</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mist">
              Only approved, public entries appear in Help Me Choose. Every entry needs a source name,
              jurisdiction, and last-checked date. Editing an approved entry returns it to draft so it
              must be reviewed again. Never add identifiable client details.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-mist">
              External guidance is not automatically Kenyan law. Keep overseas references labelled by jurisdiction;
              add legal or permit claims only after checking official local text.
            </p>
          </div>
        </div>
      </section>

      <section className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)]">
        <div className="min-w-0 rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-paper">Knowledge entries</h2>
              <p className="mt-1 text-xs text-mist">
                {activeEntries.length} active · {activeEntries.filter((entry) => entry.status === "draft").length} awaiting review
              </p>
            </div>
            <Button type="button" variant="line" size="sm" onClick={() => setForm(EMPTY_FORM())}>
              <Plus className="size-3.5" aria-hidden />
              New entry
            </Button>
          </div>

          {loading ? (
            <p className="mt-5 text-sm text-mist">Loading knowledge entries…</p>
          ) : error ? (
            <div className="mt-5 rounded-lg border border-red-300/20 bg-red-300/5 p-4">
              <p role="alert" className="text-sm text-red-200">{error}</p>
              <Button type="button" className="mt-3" variant="line" size="sm" onClick={() => void loadEntries()}>
                Try again
              </Button>
            </div>
          ) : activeEntries.length === 0 ? (
            <p className="mt-5 rounded-lg border border-paper/10 p-4 text-sm text-mist">
              No active entries yet. Add a sourced playbook or research note to begin.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-paper/10">
              {activeEntries.map((entry) => (
                <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-paper">{entry.title}</h3>
                        <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-wider ${
                          entry.status === "approved"
                            ? "bg-emerald-400/10 text-emerald-200"
                            : "bg-amber-400/10 text-amber-200"
                        }`}>
                          {entry.status}
                        </span>
                        <span className="rounded-full bg-paper/5 px-2 py-1 text-[10px] uppercase tracking-wider text-mist">
                          {entry.visibility}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-mist">
                        {entry.source_name} · {entry.jurisdiction} · checked {entry.source_checked_at}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-mist">
                        {entry.evidence_type.replace(/_/g, " ")}
                        {entry.legal_reviewed_at ? ` · legal review ${entry.legal_reviewed_at.slice(0, 10)}` : ""}
                      </p>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-mist">{entry.content}</p>
                      {entry.source_url ? (
                        <a
                          href={entry.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-2 hover:underline"
                        >
                          Open source <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                      <Button type="button" variant="line" size="sm" onClick={() => editEntry(entry)}>
                        Edit
                      </Button>
                      {entry.status === "draft" ? (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={busyEntryId === entry.id}
                          onClick={() => {
                            if (entry.evidence_type === "legislation") {
                              setLegalApprovalEntryId(entry.id);
                              setLegalReviewConfirmed(false);
                            } else {
                              void changeStatus(entry, "approved");
                            }
                          }}
                        >
                          <Check className="size-3.5" aria-hidden />
                          {entry.evidence_type === "legislation" ? "Review legal source" : "Approve"}
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="line"
                            size="sm"
                            disabled={busyEntryId === entry.id}
                            onClick={() => void changeStatus(entry, "draft")}
                          >
                            Return to draft
                          </Button>
                          <Button
                            type="button"
                            variant="line"
                            size="sm"
                            disabled={busyEntryId === entry.id}
                            aria-label={`Archive ${entry.title}`}
                            onClick={() => void changeStatus(entry, "archived")}
                          >
                            <Archive className="size-3.5" aria-hidden />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {legalApprovalEntryId === entry.id ? (
                    <div className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/5 p-3">
                      <p className="text-xs font-medium text-amber-100">Legal reference approval</p>
                      <label className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-amber-100">
                        <input
                          type="checkbox"
                          checked={legalReviewConfirmed}
                          onChange={(event) => setLegalReviewConfirmed(event.target.checked)}
                          className="mt-0.5 size-4 accent-blue"
                        />
                        <span>
                          I verified the current consolidated text, confirmed local applicability, and obtained
                          qualified Kenyan legal or authority review.
                        </span>
                      </label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!legalReviewConfirmed || busyEntryId === entry.id}
                          onClick={() => void changeStatus(entry, "approved", true)}
                        >
                          Confirm review and approve
                        </Button>
                        <Button
                          type="button"
                          variant="line"
                          size="sm"
                          onClick={() => {
                            setLegalApprovalEntryId(null);
                            setLegalReviewConfirmed(false);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {archivedEntries.length > 0 ? (
            <details className="mt-5 border-t border-paper/10 pt-4">
              <summary className="cursor-pointer text-xs font-medium text-mist">
                Archived entries ({archivedEntries.length})
              </summary>
              <ul className="mt-3 space-y-3">
                {archivedEntries.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-paper">{entry.title}</span>
                    <Button type="button" variant="line" size="sm" disabled={busyEntryId === entry.id} onClick={() => void changeStatus(entry, "draft")}>
                      Restore as draft
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        <form onSubmit={saveEntry} className="min-w-0 space-y-4 rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-blue-2">{form.id ? "Edit entry" : "Add knowledge"}</p>
            <h2 className="mt-2 text-lg font-semibold text-paper">
              {form.id ? "Save changes for review" : "Create a sourced entry"}
            </h2>
          </div>
          <label className="block text-xs font-medium text-mist">
            Entry title
            <Input required maxLength={160} className="mt-1" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label className="block text-xs font-medium text-mist">
            Knowledge or planning guidance
            <textarea
              required
              minLength={40}
              maxLength={10_000}
              rows={7}
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              className={`${FIELD_CLASS} resize-y py-3 leading-relaxed`}
            />
          </label>
          <label className="block text-xs font-medium text-mist">
            Search tags <span className="font-normal">(comma-separated)</span>
            <Input maxLength={600} className="mt-1" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="outdoor, weather, garden" />
          </label>
          <label className="block text-xs font-medium text-mist">
            Source name
            <Input required maxLength={200} className="mt-1" value={form.source_name} onChange={(event) => setForm({ ...form, source_name: event.target.value })} />
          </label>
          <label className="block text-xs font-medium text-mist">
            Source URL <span className="font-normal">(HTTPS; required for public external guidance)</span>
            <Input type="url" className="mt-1" value={form.source_url} onChange={(event) => setForm({ ...form, source_url: event.target.value })} placeholder="https://…" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-mist">
              Jurisdiction
              <Input required maxLength={120} className="mt-1" value={form.jurisdiction} onChange={(event) => setForm({ ...form, jurisdiction: event.target.value })} />
            </label>
            <label className="block text-xs font-medium text-mist">
              Evidence type
              <select className={FIELD_CLASS} value={form.evidence_type} onChange={(event) => setForm({ ...form, evidence_type: event.target.value as KnowledgeForm["evidence_type"] })}>
                <option value="official_guidance">Official guidance</option>
                <option value="practice_reference">Practice reference</option>
                <option value="company_practice">Company practice</option>
                <option value="project_learning">Anonymized project learning</option>
                <option value="vendor_learning">Vendor learning</option>
                <option value="legislation">Legislation / regulations (legal review required)</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-mist">
              Visibility
              <select className={FIELD_CLASS} value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as KnowledgeForm["visibility"] })}>
                <option value="internal">Internal only</option>
                <option value="public">Approved for Help Me Choose</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-mist">
              Last checked
              <Input required type="date" className="mt-1" value={form.source_checked_at} onChange={(event) => setForm({ ...form, source_checked_at: event.target.value })} />
            </label>
            <label className="block text-xs font-medium text-mist">
              Publication date <span className="font-normal">(if known)</span>
              <Input type="date" className="mt-1" value={form.source_published_at} onChange={(event) => setForm({ ...form, source_published_at: event.target.value })} />
            </label>
          </div>
          {["project_learning", "vendor_learning"].includes(form.evidence_type) ? (
            <label className="flex items-start gap-3 rounded-md border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100">
              <input
                type="checkbox"
                required
                checked={form.confirmAnonymized}
                onChange={(event) => setForm({ ...form, confirmAnonymized: event.target.checked })}
                className="mt-0.5 size-4 accent-blue"
              />
              <span>
                I confirm this entry contains no identifiable client, vendor, or individual details.
                Contact details are also checked before saving.
              </span>
            </label>
          ) : null}
          <div className="flex flex-wrap gap-2 border-t border-paper/10 pt-4">
            <Button type="submit" disabled={saving} className="min-h-10">
              <Save className="size-4" aria-hidden />
              {saving ? "Saving…" : form.id ? "Save as draft" : "Add as draft"}
            </Button>
            {form.id ? (
              <Button type="button" variant="line" onClick={() => setForm(EMPTY_FORM())}>
                Cancel edit
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] leading-relaxed text-mist">
            Project and vendor learnings must be anonymized before entry. Public entries are source-linked;
            editing always removes approval until an Admin reviews them again.
          </p>
        </form>
      </section>
    </div>
  );
}

export { KnowledgeBaseTab };
