import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  FileText,
  Radio,
  RefreshCw,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { eventLabel } from "@/data/catalog";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  payMilestoneInvoice,
  respondToPaymentAgreement,
  getPaymentAvailability,
  getMyJob,
  reportOfflinePayment,
  respondToDraft,
  type CueRow,
  type DraftRow,
  type InvoiceRow,
  type JobRow,
  type OfflinePaymentReportRow,
  type PaymentAgreementRow,
  type PaymentMilestoneWithInvoiceRow,
  type ReceiptRow,
} from "@/lib/server/studio";
import { cn, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/portal/$projectId")({ component: ProjectPortal });

type ProjectData = {
  job: JobRow;
  invoices: InvoiceRow[];
  receipts: ReceiptRow[];
  drafts: DraftRow[];
  cues: CueRow[];
  agreement: PaymentAgreementRow | null;
  milestones: PaymentMilestoneWithInvoiceRow[];
  paymentReports: OfflinePaymentReportRow[];
};

type ProjectSection = "overview" | "approvals" | "billing" | "pulse";

const PROJECT_STEPS = ["inquiry", "quoted", "booked", "production", "delivered"];

function money(amount: number) {
  return formatMoney(amount, "KES");
}

const SECTIONS: { id: ProjectSection; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: CalendarDays },
  { id: "approvals", label: "Approvals", icon: FileCheck2 },
  { id: "billing", label: "Invoices & receipts", icon: WalletCards },
  { id: "pulse", label: "Show timeline", icon: Radio },
];

function ProjectPortal() {
  const { projectId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [section, setSection] = useState<ProjectSection>("overview");
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [respondingDraftId, setRespondingDraftId] = useState<string | null>(null);
  const [respondingAgreementId, setRespondingAgreementId] = useState<string | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [reportingInvoiceId, setReportingInvoiceId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getMyJob({ data: { id: projectId } });
      setData(result);
      if (!result) setLoadError("This project isn’t available on the signed-in account.");
    } catch (error) {
      console.error("[client-project] Could not load project", error);
      setData(null);
      setLoadError("Project details couldn’t be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  const nextCue = useMemo(
    () =>
      data?.cues.find(
        (cue) => !["done", "complete", "completed"].includes(cue.status.toLowerCase()),
      ) ?? null,
    [data?.cues],
  );
  const paidTotal = useMemo(
    () =>
      (data?.invoices ?? [])
        .filter((invoice) => invoice.status.toLowerCase() === "paid")
        .reduce((sum, invoice) => sum + invoice.amount, 0),
    [data?.invoices],
  );
  const balanceDue = useMemo(
    () =>
      (data?.invoices ?? [])
        .filter((invoice) => invoice.status.toLowerCase() !== "paid")
        .reduce((sum, invoice) => sum + invoice.amount, 0),
    [data?.invoices],
  );

  async function respondToProjectDraft(
    draft: DraftRow,
    decision: "approved" | "changes_requested",
    feedback: string,
  ) {
    if (!data) return;
    setRespondingDraftId(draft.id);
    try {
      await respondToDraft({
        data: { jobId: data.job.id, draftId: draft.id, decision, feedback },
      });
      toast.success(
        decision === "approved" ? `${draft.title} approved.` : "Change request sent to your team.",
      );
      await refresh();
    } catch (error) {
      console.error("[client-project] Could not save draft response", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Your response couldn’t be saved. Please try again.",
      );
    } finally {
      setRespondingDraftId(null);
    }
  }

  async function respondToAgreement(
    agreement: PaymentAgreementRow,
    decision: "accepted" | "changes_requested",
    feedback: string,
  ) {
    setRespondingAgreementId(agreement.id);
    try {
      await respondToPaymentAgreement({
        data: { agreementId: agreement.id, decision, feedback },
      });
      toast.success(
        decision === "accepted" ? "Payment terms accepted." : "Change request sent to Admin.",
      );
      await refresh();
    } catch (error) {
      console.error("[client-project] Could not respond to payment terms", error);
      toast.error(error instanceof Error ? error.message : "Your response couldn’t be saved.");
    } finally {
      setRespondingAgreementId(null);
    }
  }

  async function payProjectMilestone(invoiceId: string) {
    setPayingInvoiceId(invoiceId);
    try {
      await payMilestoneInvoice({ data: { invoiceId } });
      toast.success("Payment confirmed and receipt issued.");
      await refresh();
    } catch (error) {
      console.error("[client-project] Could not pay milestone invoice", error);
      toast.error(error instanceof Error ? error.message : "Payment could not be completed.");
    } finally {
      setPayingInvoiceId(null);
    }
  }

  async function reportProjectPayment(data: {
    invoiceId: string;
    paymentMethod: "mpesa" | "bank_transfer" | "cash";
    transactionReference: string;
    paymentDate: string;
    note: string;
  }) {
    setReportingInvoiceId(data.invoiceId);
    try {
      await reportOfflinePayment({
        data: {
          invoiceId: data.invoiceId,
          paymentMethod: data.paymentMethod,
          transactionReference: data.transactionReference,
          paymentDate: data.paymentDate,
          note: data.note,
        },
      });
      toast.success("Payment report sent. The invoice stays due until Admin verifies it.");
      await refresh();
    } catch (error) {
      console.error("[client-project] Could not report offline payment", error);
      toast.error(error instanceof Error ? error.message : "The payment report could not be sent.");
    } finally {
      setReportingInvoiceId(null);
    }
  }

  if (isPending) return <div className="min-h-dvh bg-void" />;
  if (!user) return <RedirectToSignIn />;

  if (loading) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <main className="shell pt-32">
          <ProjectLoading />
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <main className="shell pt-32">
          {loadError?.includes("isn’t available") ? (
            <div className="rounded-xl border border-paper/10 bg-ink/60 p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">
                Client workspace
              </p>
              <h1 className="mt-3 text-3xl text-paper">Project not found.</h1>
              <p className="mt-2 text-sm text-mist">{loadError}</p>
              <Link to="/portal" className="mt-5 inline-block">
                <Button variant="line" className="min-h-11">
                  Back to your projects
                </Button>
              </Link>
            </div>
          ) : (
            <ProjectError
              message={loadError ?? "Project details are unavailable."}
              onRetry={() => void refresh()}
            />
          )}
        </main>
      </div>
    );
  }

  const { job, invoices, receipts, drafts, cues } = data;
  const approvalCount = drafts.filter((draft) => draft.status !== "approved").length;

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="shell pb-20 pt-28">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-mist">
          <Link to="/portal" className="min-h-10 inline-flex items-center hover:text-paper">
            Your projects
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="truncate text-paper">{job.title}</span>
        </div>

        <header className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-2">
                  {eventLabel(job.event_type)}
                </p>
                <ProjectStatus status={job.status} />
              </div>
              <h1 className="mt-2 break-words text-4xl text-paper md:text-5xl">{job.title}</h1>
              <p className="mt-3 text-sm text-mist">
                {job.venue ? `${job.venue} · ` : ""}
                {formatProjectDate(job.event_date)}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[460px]">
              <HeaderFact label="Project value" value={money(job.ballpark)} icon={WalletCards} />
              <HeaderFact label="Paid" value={money(paidTotal)} icon={CheckCheck} />
              <HeaderFact
                label="Outstanding invoices"
                value={invoices.length ? money(balanceDue) : "Not invoiced"}
                icon={ArrowDownRight}
              />
            </div>
          </div>
          <ProjectProgress status={job.status} className="mt-7 max-w-3xl" />
        </header>

        <div className="mt-7 grid min-w-0 gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">
              Project workspace
            </p>
            <div
              className="grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
              role="group"
              aria-label="Project sections"
            >
              {SECTIONS.map((item) => {
                const Icon = item.icon;
                const selected = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "flex min-h-11 min-w-0 items-center gap-2 rounded-lg border px-2 text-left text-xs font-medium transition-colors sm:shrink-0 sm:gap-3 sm:px-3 sm:text-sm lg:w-full",
                      selected
                        ? "border-blue/25 bg-blue/10 text-paper"
                        : "border-transparent text-mist hover:border-paper/10 hover:bg-paper/5 hover:text-paper",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                    {item.id === "approvals" && approvalCount > 0 ? (
                      <span className="ml-auto grid size-5 shrink-0 place-items-center rounded-full bg-amber-300/15 text-[10px] text-amber-100">
                        {approvalCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <section
            aria-label={SECTIONS.find((item) => item.id === section)?.label}
            className="min-w-0"
          >
            {section === "overview" ? (
              <ProjectOverview
                job={job}
                nextCue={nextCue}
                draftCount={drafts.length}
                approvalCount={approvalCount}
                invoices={invoices}
                receiptCount={receipts.length}
                onOpenApprovals={() => setSection("approvals")}
                onOpenBilling={() => setSection("billing")}
                onOpenTimeline={() => setSection("pulse")}
              />
            ) : null}
            {section === "approvals" ? (
              <ApprovalsSection
                drafts={drafts}
                respondingDraftId={respondingDraftId}
                onRespond={respondToProjectDraft}
              />
            ) : null}
            {section === "billing" ? (
              <BillingSection
                job={job}
                invoices={invoices}
                receipts={receipts}
                paidTotal={paidTotal}
                balanceDue={balanceDue}
                agreement={data.agreement}
                milestones={data.milestones}
                paymentReports={data.paymentReports}
                respondingAgreementId={respondingAgreementId}
                payingInvoiceId={payingInvoiceId}
                reportingInvoiceId={reportingInvoiceId}
                onRespond={respondToAgreement}
                onPay={payProjectMilestone}
                onReport={reportProjectPayment}
              />
            ) : null}
            {section === "pulse" ? <TimelineSection job={job} cues={cues} /> : null}
          </section>
        </div>
      </main>
    </div>
  );
}

function ProjectOverview({
  job,
  nextCue,
  draftCount,
  approvalCount,
  invoices,
  receiptCount,
  onOpenApprovals,
  onOpenBilling,
  onOpenTimeline,
}: {
  job: JobRow;
  nextCue: CueRow | null;
  draftCount: number;
  approvalCount: number;
  invoices: InvoiceRow[];
  receiptCount: number;
  onOpenApprovals: () => void;
  onOpenBilling: () => void;
  onOpenTimeline: () => void;
}) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          eyebrow="Design & content"
          title={
            approvalCount
              ? `${approvalCount} approval${approvalCount === 1 ? "" : "s"} waiting`
              : `${draftCount} project drafts`
          }
          detail={
            approvalCount
              ? "Review and respond to items from the team."
              : "Your draft approvals are up to date."
          }
          icon={FileCheck2}
          onClick={onOpenApprovals}
          tone={approvalCount ? "amber" : "neutral"}
        />
        <ActionCard
          eyebrow="Billing"
          title={
            invoices.length
              ? `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`
              : "No invoices yet"
          }
          detail="Review payment status and available receipts."
          icon={WalletCards}
          onClick={onOpenBilling}
          tone="blue"
        />
        <ActionCard
          eyebrow="Show day"
          title={nextCue ? nextCue.title : "Project timeline"}
          detail={
            nextCue
              ? `${nextCue.starts_at} · ${nextCue.owner}`
              : "View the latest event timeline and cues."
          }
          icon={Radio}
          onClick={onOpenTimeline}
          tone="green"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
        <div className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
          <SectionHeading eyebrow="Project brief" title="What we’re making" />
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-mist">
            {job.notes?.trim() ||
              "Your production team will add the latest project brief here as the plan develops."}
          </p>
          <div className="mt-5 grid gap-3 border-t border-paper/10 pt-5 sm:grid-cols-3">
            <SummaryFact label="Event type" value={eventLabel(job.event_type)} />
            <SummaryFact
              label="Guests"
              value={job.guests ? job.guests.toLocaleString() : "To be confirmed"}
            />
            <SummaryFact label="Service" value={job.service.replaceAll("_", " ")} />
          </div>
        </div>

        <div className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
          <SectionHeading eyebrow="Your team" title="What happens next" />
          {job.status === "cancelled" ? (
            <p className="mt-5 rounded-lg border border-paper/10 bg-paper/[0.025] p-4 text-sm text-mist">
              This project was cancelled. Contact the production team if you have questions.
            </p>
          ) : (
            <ol className="mt-5 space-y-0">
              {[
                { label: "Project received", detail: "Your project is in the workspace." },
                { label: "Scope & quote", detail: "Align on the plan and project value." },
                { label: "Production", detail: "Approvals, logistics, and show day." },
                { label: "Delivery", detail: "Final handover and closeout." },
              ].map((step, index) => {
                const stage = PROJECT_STEPS.indexOf(job.status);
                const currentStep =
                  stage >= 4 ? 3 : stage >= 3 ? 2 : stage >= 2 ? 2 : stage >= 1 ? 1 : 0;
                const complete = index < currentStep;
                const current = index === currentStep;
                return (
                  <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < 3 ? (
                      <span
                        className="absolute left-[9px] top-5 h-full w-px bg-paper/10"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span
                      className={cn(
                        "z-10 mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                        complete || current
                          ? "border-blue/40 bg-blue/15 text-blue-2"
                          : "border-paper/15 text-mist",
                      )}
                    >
                      {complete ? (
                        <Check className="size-3" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-current" />
                      )}
                    </span>
                    <div>
                      <p
                        className={cn("text-sm font-medium", current ? "text-paper" : "text-mist")}
                      >
                        {step.label}
                      </p>
                      <p className="mt-0.5 text-xs text-mist">{step.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <button
        type="button"
        onClick={onOpenBilling}
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-paper/10 bg-ink/70 px-4 py-3 text-left transition-colors hover:border-blue/25"
      >
        <span className="flex items-center gap-3">
          <Clock3 className="size-4 text-blue-2" />
          <span className="text-sm text-paper">
            {receiptCount} receipt{receiptCount === 1 ? "" : "s"} issued for this project
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-mist">
          View billing <ChevronRight className="size-4" />
        </span>
      </button>
    </div>
  );
}

function ApprovalsSection({
  drafts,
  respondingDraftId,
  onRespond,
}: {
  drafts: DraftRow[];
  respondingDraftId: string | null;
  onRespond: (
    draft: DraftRow,
    decision: "approved" | "changes_requested",
    feedback: string,
  ) => Promise<void>;
}) {
  const waiting = drafts.filter((draft) => draft.status !== "approved");
  const approved = drafts.filter((draft) => draft.status === "approved");
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
        <SectionHeading
          eyebrow="Your review"
          title="Approvals"
          count={`${waiting.length} waiting · ${approved.length} approved`}
        />
        <p className="mt-2 text-sm text-mist">
          Review the project drafts shared by your production team. Approvals are recorded against
          this project.
        </p>
        {waiting.length ? (
          <ul className="mt-5 divide-y divide-paper/10">
            {waiting.map((draft) => (
              <DraftResponseCard
                key={draft.id}
                draft={draft}
                busy={respondingDraftId !== null}
                saving={respondingDraftId === draft.id}
                onRespond={(decision, feedback) => onRespond(draft, decision, feedback)}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            title={drafts.length ? "You’re all caught up" : "No drafts shared yet"}
            body={
              drafts.length
                ? "There are no project drafts waiting for your approval."
                : "Your team’s design and content drafts will appear here when they’re ready for review."
            }
            icon={drafts.length ? CheckCheck : FileCheck2}
          />
        )}
      </section>
      {approved.length ? (
        <section className="rounded-xl border border-paper/10 bg-ink/50 p-5 md:p-6">
          <SectionHeading
            eyebrow="Completed"
            title="Approved drafts"
            count={`${approved.length} items`}
          />
          <ul className="mt-3 divide-y divide-paper/10">
            {approved.map((draft) => (
              <li key={draft.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-paper">{draft.title}</p>
                  <p className="mt-1 text-xs capitalize text-mist">
                    {draft.kind} · {draft.status}
                  </p>
                </div>
                <CheckCheck className="size-4 shrink-0 text-emerald-200" aria-label="Approved" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function DraftResponseCard({
  draft,
  busy,
  saving,
  onRespond,
}: {
  draft: DraftRow;
  busy: boolean;
  saving: boolean;
  onRespond: (decision: "approved" | "changes_requested", feedback: string) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState(draft.client_feedback ?? "");
  const [requestingChanges, setRequestingChanges] = useState(false);

  return (
    <li className="py-4 first:pt-1">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-blue-2">{draft.kind}</p>
          <h3 className="mt-1 text-xl text-paper">{draft.title}</h3>
          {draft.note ? (
            <p className="mt-1 whitespace-pre-wrap text-sm text-mist">{draft.note}</p>
          ) : null}
          <p className="mt-2 text-xs capitalize text-mist">
            Status: {draft.status.replaceAll("_", " ")}
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          className="min-h-11 shrink-0"
          disabled={busy}
          onClick={() => void onRespond("approved", "")}
        >
          {saving ? <RefreshCw className="size-4 animate-spin" /> : <Check className="size-4" />}
          {saving ? "Saving response…" : "Approve draft"}
        </Button>
      </div>
      <div className="mt-4 border-t border-paper/10 pt-4">
        {draft.status === "changes_requested" && draft.client_feedback ? (
          <p className="mb-3 rounded-md border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">
            Your previous request: {draft.client_feedback}
          </p>
        ) : null}
        <label className="grid gap-1.5 text-xs font-medium text-mist">
          What would you like changed?
          <textarea
            maxLength={2000}
            rows={3}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            className="w-full rounded-md border border-paper/15 bg-void px-3 py-2.5 text-sm text-paper outline-none focus-visible:border-blue-2"
            placeholder="Describe the changes you need. Your production team will see this on the draft."
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-mist">{feedback.length}/2,000 characters</p>
          <Button
            type="button"
            variant="line"
            className="min-h-10"
            disabled={busy || !feedback.trim() || requestingChanges}
            onClick={async () => {
              setRequestingChanges(true);
              try {
                await onRespond("changes_requested", feedback.trim());
              } finally {
                setRequestingChanges(false);
              }
            }}
          >
            {requestingChanges && saving ? "Sending request…" : "Request changes"}
          </Button>
        </div>
      </div>
    </li>
  );
}

function BillingSection({
  job,
  invoices,
  receipts,
  paidTotal,
  balanceDue,
  agreement,
  milestones,
  paymentReports,
  respondingAgreementId,
  payingInvoiceId,
  reportingInvoiceId,
  onRespond,
  onPay,
  onReport,
}: {
  job: JobRow;
  invoices: InvoiceRow[];
  receipts: ReceiptRow[];
  paidTotal: number;
  balanceDue: number;
  agreement: PaymentAgreementRow | null;
  milestones: PaymentMilestoneWithInvoiceRow[];
  paymentReports: OfflinePaymentReportRow[];
  respondingAgreementId: string | null;
  payingInvoiceId: string | null;
  reportingInvoiceId: string | null;
  onRespond: (
    agreement: PaymentAgreementRow,
    decision: "accepted" | "changes_requested",
    feedback: string,
  ) => Promise<void>;
  onPay: (invoiceId: string) => Promise<void>;
  onReport: (data: {
    invoiceId: string;
    paymentMethod: "mpesa" | "bank_transfer" | "cash";
    transactionReference: string;
    paymentDate: string;
    note: string;
  }) => Promise<void>;
}) {
  return (
    <div className="space-y-5">
      <PaymentAgreementSection
        agreement={agreement}
        milestones={milestones}
        paymentReports={paymentReports}
        responding={respondingAgreementId !== null}
        payingInvoiceId={payingInvoiceId}
        reportingInvoiceId={reportingInvoiceId}
        onRespond={onRespond}
        onPay={onPay}
        onReport={onReport}
      />
      <section className="grid gap-3 sm:grid-cols-3">
        <BillingMetric label="Project value" value={money(job.ballpark)} icon={ArrowUpRight} />
        <BillingMetric label="Payments recorded" value={money(paidTotal)} icon={CheckCheck} />
        <BillingMetric
          label="Outstanding invoices"
          value={invoices.length ? money(balanceDue) : "Not invoiced"}
          icon={ArrowDownRight}
        />
      </section>
      <section className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
        <SectionHeading
          eyebrow="Project billing"
          title="Invoices"
          count={`${invoices.length} records`}
        />
        {invoices.length ? (
          <div className="mt-4 grid gap-3">
            {invoices.map((invoice) => {
              const milestone = milestones.find((item) => item.invoice_id === invoice.id);
              return (
                <article
                  key={invoice.id}
                  className="rounded-lg border border-paper/10 bg-void/45 p-4 md:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue/10 text-blue-2">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-blue-2">
                          Invoice
                        </p>
                        <h3 className="mt-1 text-base font-medium text-paper">
                          {milestone?.label ?? invoice.kind}
                        </h3>
                        <p className="mt-1 break-all font-mono text-[10px] text-mist">
                          Ref {invoice.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <p className="font-serif text-2xl tabular-nums text-paper">
                        {money(invoice.amount)}
                      </p>
                      <PaymentStatus status={invoice.status} />
                    </div>
                  </div>
                  {milestone?.note ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-mist">
                      {milestone.note}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-paper/10 pt-3 text-xs text-mist">
                    <p>
                      {milestone?.due_date
                        ? `Due ${formatProjectDate(milestone.due_date)}`
                        : "Due date as agreed"}
                    </p>
                    <p>
                      {invoice.paid_at
                        ? `Paid ${formatProjectDate(invoice.paid_at)}`
                        : "Payment not yet confirmed"}
                    </p>
                  </div>
                  {invoice.provider_reference ? (
                    <p className="mt-2 break-all text-xs text-mist">
                      Payment reference:{" "}
                      <span className="font-mono text-paper">{invoice.provider_reference}</span>
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No invoices yet"
            body="Project invoices will appear here when issued by your team."
            icon={FileText}
          />
        )}
      </section>

      <section className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
        <SectionHeading
          eyebrow="Payment records"
          title="Receipts"
          count={`${receipts.length} issued`}
        />
        {receipts.length ? (
          <ul className="mt-4 divide-y divide-paper/10">
            {receipts.map((receipt) => (
              <li
                key={receipt.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-400/10 text-emerald-200">
                    <CheckCheck className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-paper">{receipt.receipt_no}</p>
                    <p className="mt-1 text-xs capitalize text-mist">
                      {receipt.kind} · issued {formatProjectDate(receipt.issued_at)}
                    </p>
                  </div>
                </div>
                <div className="ml-12 flex items-center gap-3 sm:ml-0">
                  <p className="text-sm tabular-nums text-paper">{money(receipt.amount)}</p>
                  <Link
                    to="/portal/$projectId/receipts/$receiptId"
                    params={{ projectId: job.id, receiptId: receipt.id }}
                  >
                    <Button type="button" variant="line" size="sm" className="min-h-10">
                      View receipt <ChevronRight className="size-3.5" />
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No receipts yet"
            body="Once a payment is recorded, your receipt will be available here to view and download."
            icon={FileCheck2}
          />
        )}
      </section>
    </div>
  );
}

function PaymentAgreementSection({
  agreement,
  milestones,
  paymentReports,
  responding,
  payingInvoiceId,
  reportingInvoiceId,
  onRespond,
  onPay,
  onReport,
}: {
  agreement: PaymentAgreementRow | null;
  milestones: PaymentMilestoneWithInvoiceRow[];
  paymentReports: OfflinePaymentReportRow[];
  responding: boolean;
  payingInvoiceId: string | null;
  reportingInvoiceId: string | null;
  onRespond: (
    agreement: PaymentAgreementRow,
    decision: "accepted" | "changes_requested",
    feedback: string,
  ) => Promise<void>;
  onPay: (invoiceId: string) => Promise<void>;
  onReport: (data: {
    invoiceId: string;
    paymentMethod: "mpesa" | "bank_transfer" | "cash";
    transactionReference: string;
    paymentDate: string;
    note: string;
  }) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState("");
  const [paymentAvailability, setPaymentAvailability] = useState<{
    available: boolean;
    message: string;
  } | null>(null);
  const waitingForClient = agreement && agreement.status !== "accepted";
  const total = milestones.reduce((sum, milestone) => sum + milestone.amount, 0);

  useEffect(() => {
    let active = true;
    getPaymentAvailability()
      .then((result) => {
        if (active) setPaymentAvailability(result);
      })
      .catch((error) => {
        console.error("[client-project] Could not check payment availability", error);
        if (active) {
          setPaymentAvailability({
            available: false,
            message:
              "Online payment status could not be checked. Your invoice remains due; contact Randy Production for payment options.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (!agreement) {
    return (
      <section className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
        <SectionHeading eyebrow="Payment terms" title="Custom milestone agreement" />
        <EmptyState
          title="No payment terms shared yet"
          body="Your production team will propose project-specific milestones. Nothing is due until you and the team agree to the terms and an invoice is issued."
          icon={WalletCards}
        />
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionHeading eyebrow="Payment terms" title="Custom milestone agreement" />
        <span
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs capitalize",
            agreement.status === "accepted"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
              : "border-amber-300/25 bg-amber-300/10 text-amber-100",
          )}
        >
          {agreement.status.replaceAll("_", " ")}
        </span>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-mist">
        {agreement.terms}
      </p>
      {agreement.client_feedback ? (
        <p className="mt-4 whitespace-pre-wrap rounded-md border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">
          Your previous request: {agreement.client_feedback}
        </p>
      ) : null}
      <ul className="mt-5 divide-y divide-paper/10 border-y border-paper/10">
        {milestones.map((milestone) => (
          <li key={milestone.id} className="grid gap-3 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-paper">{milestone.label}</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-mist">
                {milestone.note || "Payment milestone"}
              </p>
              <p className="mt-1 text-xs text-mist">
                {milestone.due_date
                  ? `Due ${formatProjectDate(milestone.due_date)}`
                  : "Due date to be agreed"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm tabular-nums text-paper">{money(milestone.amount)}</p>
                {agreement.status === "accepted" ? (
                  <p className="mt-1 text-[10px] capitalize text-mist">
                    {milestone.invoice_status ?? "Agreed · not invoiced"}
                  </p>
                ) : null}
              </div>
              {agreement.status === "accepted" &&
              milestone.invoice_id &&
              milestone.invoice_status !== "paid" ? (
                paymentAvailability?.available &&
                !paymentReports.some(
                  (report) =>
                    report.invoice_id === milestone.invoice_id &&
                    report.status === "pending_review",
                ) ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="min-h-10"
                    disabled={payingInvoiceId !== null}
                    onClick={() => void onPay(milestone.invoice_id!)}
                  >
                    {payingInvoiceId === milestone.invoice_id ? "Processing…" : "Pay invoice"}
                  </Button>
                ) : null
              ) : null}
            </div>
          </div>
          {agreement.status === "accepted" &&
          milestone.invoice_id &&
          milestone.invoice_status !== "paid" ? (
            <OfflinePaymentReporter
              invoiceId={milestone.invoice_id}
              onlinePaymentAvailable={paymentAvailability?.available ?? false}
              paymentAvailabilityMessage={
                paymentAvailability?.message ?? "Checking online payment availability…"
              }
              report={
                paymentReports
                  .filter((report) => report.invoice_id === milestone.invoice_id)
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
              }
              submitting={reportingInvoiceId === milestone.invoice_id}
              onSubmit={onReport}
            />
          ) : null}
        </li>
      ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-mist">
          Agreed milestone total{" "}
          <span className="font-medium tabular-nums text-paper">{money(total)}</span>
        </p>
        {waitingForClient ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="line"
              className="min-h-10"
              disabled={responding || !feedback.trim()}
              onClick={() => void onRespond(agreement, "changes_requested", feedback.trim())}
            >
              Request changes
            </Button>
            <Button
              type="button"
              variant="primary"
              className="min-h-10"
              disabled={responding}
              onClick={() => void onRespond(agreement, "accepted", "")}
            >
              {responding ? "Saving response…" : "Accept payment terms"}
            </Button>
          </div>
        ) : null}
      </div>
      {waitingForClient ? (
        <label className="mt-4 grid gap-1.5 text-xs font-medium text-mist">
          Request changes (optional)
          <textarea
            maxLength={2000}
            rows={3}
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            className="w-full rounded-md border border-paper/15 bg-void px-3 py-2.5 text-sm text-paper outline-none focus-visible:border-blue-2"
            placeholder="Describe any changes you need before accepting."
          />
        </label>
      ) : agreement.accepted_at ? (
        <p className="mt-4 text-xs text-mist">
          Accepted {new Date(agreement.accepted_at).toLocaleString("en-KE")}.
        </p>
      ) : null}
    </section>
  );
}

function OfflinePaymentReporter({
  invoiceId,
  onlinePaymentAvailable,
  paymentAvailabilityMessage,
  report,
  submitting,
  onSubmit,
}: {
  invoiceId: string;
  onlinePaymentAvailable: boolean;
  paymentAvailabilityMessage: string;
  report: OfflinePaymentReportRow | null;
  submitting: boolean;
  onSubmit: (data: {
    invoiceId: string;
    paymentMethod: "mpesa" | "bank_transfer" | "cash";
    transactionReference: string;
    paymentDate: string;
    note: string;
  }) => Promise<void>;
}) {
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "bank_transfer" | "cash">("mpesa");
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const pending = report?.status === "pending_review";

  if (pending) {
    return (
      <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 p-4">
        <p className="text-sm font-medium text-amber-100">Payment report awaiting review</p>
        <p className="mt-1 text-xs text-mist">
          {report.payment_method.replaceAll("_", " ")} · {report.transaction_reference} ·{" "}
          {formatProjectDate(report.payment_date)}
        </p>
        <p className="mt-2 text-xs text-mist">
          Your invoice remains due until the team verifies the payment and confirms it.
        </p>
      </div>
    );
  }

  return (
    <form
      className="rounded-lg border border-paper/10 bg-void/60 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({
          invoiceId,
          paymentMethod,
          transactionReference: transactionReference.trim(),
          paymentDate,
          note: note.trim(),
        });
      }}
    >
      <div>
        <p className="text-sm font-medium text-paper">Paid another way?</p>
        <p className="mt-1 text-xs text-mist">
          {onlinePaymentAvailable
            ? "If you paid by M-Pesa, bank transfer, or cash, report it here."
            : paymentAvailabilityMessage}
        </p>
      </div>
      {report?.status === "rejected" ? (
        <p role="status" className="mt-3 rounded-md bg-red-300/5 p-3 text-xs text-red-200">
          Previous report was not confirmed{report.review_note ? `: ${report.review_note}` : "."} You
          may submit a corrected report.
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs text-mist">
          Payment method
          <select
            value={paymentMethod}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "mpesa" || value === "bank_transfer" || value === "cash") {
                setPaymentMethod(value);
              }
            }}
            className="min-h-10 rounded-md border border-paper/15 bg-ink px-3 text-sm text-paper"
          >
            <option value="mpesa">M-Pesa</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-mist">
          Payment date
          <input
            type="date"
            required
            max={today}
            value={paymentDate}
            onChange={(event) => setPaymentDate(event.target.value)}
            className="min-h-10 rounded-md border border-paper/15 bg-ink px-3 text-sm text-paper"
          />
        </label>
        <label className="grid gap-1.5 text-xs text-mist sm:col-span-2">
          Transaction reference
          <input
            required
            minLength={4}
            maxLength={100}
            value={transactionReference}
            onChange={(event) => setTransactionReference(event.target.value)}
            placeholder={
              paymentMethod === "cash" ? "Receipt or handover reference" : "e.g. M-Pesa code"
            }
            className="min-h-10 rounded-md border border-paper/15 bg-ink px-3 text-sm text-paper placeholder:text-mist/60"
          />
        </label>
        <label className="grid gap-1.5 text-xs text-mist sm:col-span-2">
          Note (optional)
          <textarea
            maxLength={1000}
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Add any useful detail for the finance team."
            className="rounded-md border border-paper/15 bg-ink px-3 py-2 text-sm text-paper placeholder:text-mist/60"
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs text-mist">
          Reporting does not confirm payment or clear the balance. The team will verify its records
          before issuing a receipt.
        </p>
        <Button
          type="submit"
          variant="line"
          size="sm"
          className="min-h-10"
          disabled={submitting || transactionReference.trim().length < 4 || !paymentDate}
        >
          {submitting ? "Sending report…" : "Report payment"}
        </Button>
      </div>
    </form>
  );
}

function TimelineSection({ job, cues }: { job: JobRow; cues: CueRow[] }) {
  const completed = cues.filter((cue) =>
    ["done", "complete", "completed"].includes(cue.status.toLowerCase()),
  ).length;
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-paper/10 bg-ink/70 p-5 md:p-6">
        <SectionHeading
          eyebrow="Show day"
          title="Production timeline"
          count={`${completed} of ${cues.length} cues complete`}
        />
        <p className="mt-2 text-sm text-mist">
          {job.status === "production"
            ? "Follow the show as the team updates its key moments."
            : "Your team will share show-day cues and updates here as the production gets closer."}
        </p>
        {cues.length ? (
          <ol className="mt-6">
            {cues.map((cue, index) => {
              const isComplete = ["done", "complete", "completed"].includes(
                cue.status.toLowerCase(),
              );
              const isActive = cue.status.toLowerCase() === "active";
              return (
                <li key={cue.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < cues.length - 1 ? (
                    <span
                      className="absolute left-[11px] top-6 h-full w-px bg-paper/10"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span
                    className={cn(
                      "z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                      isComplete
                        ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                        : isActive
                          ? "border-blue/40 bg-blue/15 text-blue-2"
                          : "border-paper/15 bg-ink text-mist",
                    )}
                  >
                    {isComplete ? (
                      <Check className="size-3.5" />
                    ) : (
                      <span
                        className={cn(
                          "size-1.5 rounded-full",
                          isActive ? "bg-blue-2" : "bg-paper/30",
                        )}
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 rounded-lg border border-paper/10 bg-paper/[0.025] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-paper">{cue.title}</p>
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          isActive ? "text-blue-2" : "text-mist",
                        )}
                      >
                        {cue.starts_at}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-mist">
                      <span>{cue.owner}</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{cue.kind}</span>
                      <span className="ml-auto capitalize">{cue.status}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            title="Timeline is being prepared"
            body={
              job.status === "production"
                ? "The latest production cues will show here as the team updates the run of show."
                : "When your team drafts the run of show, the timeline will appear here."
            }
            icon={Radio}
          />
        )}
      </section>
    </div>
  );
}

function HeaderFact({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-paper/10 bg-paper/[0.025] p-3">
      <div className="flex items-center gap-2 text-mist">
        <Icon className="size-3.5" aria-hidden="true" />
        <p className="text-[10px] uppercase tracking-[0.12em]">{label}</p>
      </div>
      <p className="mt-2 text-base font-medium tabular-nums text-paper">{value}</p>
    </div>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-mist">{label}</p>
      <p className="mt-1 text-sm capitalize text-paper">{value}</p>
    </div>
  );
}

function BillingMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-xl border border-paper/10 bg-ink/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.12em] text-mist">{label}</p>
        <Icon className="size-4 text-blue-2" aria-hidden="true" />
      </div>
      <p className="mt-3 text-2xl tabular-nums text-paper">{value}</p>
    </article>
  );
}

function ActionCard({
  eyebrow,
  title,
  detail,
  icon: Icon,
  onClick,
  tone,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  onClick: () => void;
  tone: "amber" | "blue" | "green" | "neutral";
}) {
  const tones = {
    amber: "text-amber-200 bg-amber-300/10",
    blue: "text-blue-2 bg-blue/10",
    green: "text-emerald-200 bg-emerald-400/10",
    neutral: "text-mist bg-paper/5",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-36 rounded-xl border border-paper/10 bg-ink/70 p-4 text-left transition-colors hover:border-blue/25 hover:bg-paper/[0.035] md:p-5"
    >
      <span className={cn("grid size-9 place-items-center rounded-lg", tones)}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-mist">
        {eyebrow}
      </p>
      <p className="mt-1 truncate text-base font-medium text-paper">{title}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-mist">{detail}</p>
    </button>
  );
}

function ProjectStatus({ status }: { status: string }) {
  const className =
    status === "production"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : status === "booked"
        ? "border-blue/25 bg-blue/10 text-blue-2"
        : status === "quoted"
          ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
          : "border-paper/10 bg-paper/5 text-mist";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium capitalize tracking-[0.08em]",
        className,
      )}
    >
      {status.replaceAll("-", " ")}
    </span>
  );
}

function ProjectProgress({ status, className }: { status: string; className?: string }) {
  if (status === "cancelled") {
    return (
      <p className={cn("text-xs text-mist", className)} aria-label="Project cancelled">
        This project was cancelled.
      </p>
    );
  }
  const currentStep = PROJECT_STEPS.indexOf(status);
  const current = Math.max(currentStep, 0);
  return (
    <div className={cn("min-w-0", className)} aria-label={`Project stage: ${status}`}>
      <div className="flex items-center" aria-hidden="true">
        {PROJECT_STEPS.map((step, index) => (
          <div key={step} className="flex min-w-0 flex-1 items-center last:flex-none">
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                index <= current ? "bg-blue-2" : "bg-paper/20",
              )}
            />
            {index < PROJECT_STEPS.length - 1 ? (
              <span
                className={cn("h-px flex-1", index < current ? "bg-blue-2/80" : "bg-paper/15")}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-1 text-[9px] capitalize tracking-wide text-mist sm:text-[10px]">
        {PROJECT_STEPS.map((step) => (
          <span key={step}>{step}</span>
        ))}
      </div>
    </div>
  );
}

function PaymentStatus({ status }: { status: string }) {
  const paid = status.toLowerCase() === "paid";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] capitalize",
        paid
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          : "border-amber-300/25 bg-amber-300/10 text-amber-100",
      )}
    >
      {paid ? <Check className="size-3" /> : <Clock3 className="size-3" />}
      {status}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-2">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl text-paper md:text-3xl">{title}</h2>
      </div>
      {count ? <p className="text-xs text-mist">{count}</p> : null}
    </div>
  );
}

function EmptyState({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: LucideIcon;
}) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-lg border border-dashed border-paper/15 px-4 py-5">
      <Icon className="mt-0.5 size-4 shrink-0 text-mist" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-paper">{title}</p>
        <p className="mt-1 text-sm text-mist">{body}</p>
      </div>
    </div>
  );
}

function ProjectLoading() {
  return (
    <div
      className="grid min-h-64 place-items-center rounded-xl border border-paper/10 bg-ink/50 p-8"
      role="status"
    >
      <div className="flex items-center gap-3 text-sm text-mist">
        <RefreshCw className="size-4 animate-spin text-blue-2" />
        Loading your project…
      </div>
    </div>
  );
}

function ProjectError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-300/20 bg-red-300/5 p-5 md:p-6" role="alert">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-200" />
        <div>
          <p className="font-medium text-paper">Project details unavailable</p>
          <p className="mt-1 text-sm text-mist">{message}</p>
          <Button type="button" variant="line" className="mt-4 min-h-11" onClick={onRetry}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatProjectDate(value: string | null) {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
