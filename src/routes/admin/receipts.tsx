import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { summarizeReceiptRows } from "@/lib/receipt-summary";
import {
  getMe,
  listOfflinePaymentReports,
  listReceipts,
  reviewOfflinePaymentReport,
  type OfflinePaymentReportRow,
  type ReceiptRow,
} from "@/lib/server/studio";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/admin/receipts")({ component: ReceiptsPage });

function ReceiptsPage() {
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [paymentReports, setPaymentReports] = useState<OfflinePaymentReportRow[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewingReportId, setReviewingReportId] = useState<string | null>(null);

  async function refresh() {
    const [receipts, reports] = await Promise.all([listReceipts(), listOfflinePaymentReports()]);
    setRows(receipts);
    setPaymentReports(reports);
    setLoadError(null);
  }

  async function reviewReport(
    report: OfflinePaymentReportRow,
    decision: "confirm" | "reject",
    note: string,
  ) {
    setReviewingReportId(report.id);
    try {
      const result = await reviewOfflinePaymentReport({
        data: { reportId: report.id, decision, note },
      });
      toast.success(
        result.status === "confirmed"
          ? "Payment confirmed and receipt issued."
          : "Payment report rejected.",
      );
      try {
        await refresh();
      } catch (error) {
        console.error("[studio-receipts] Review saved but finance data could not refresh", error);
        setLoadError("The review was saved, but the ledger could not refresh. Reload to see the latest status.");
      }
    } catch (error) {
      console.error("[studio-receipts] Could not review payment report", error);
      toast.error(error instanceof Error ? error.message : "The payment report could not be reviewed.");
    } finally {
      setReviewingReportId(null);
    }
  }

  useEffect(() => {
    let active = true;
    getMe()
      .then(async (profile) => {
        if (!active) return;
        if (profile.role !== "admin") {
          setAuthorized(false);
          return;
        }
        setAuthorized(true);
        try {
          await refresh();
        } catch (error) {
          console.error("[studio-receipts] Could not load ledger", error);
          if (active)
            setLoadError("The finance ledger could not be loaded. Try refreshing the page.");
        }
      })
      .catch((error) => {
        console.error("[studio-receipts] Could not verify Admin access", error);
        if (active) {
          setAuthorized(false);
          setLoadError("Admin access could not be verified.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(
    () =>
      summarizeReceiptRows(
        rows.map((row) => ({
          amount: row.amount,
          kind: row.kind,
          status: row.status,
          issued_at: row.issued_at,
        })),
      ),
    [rows],
  );

  if (authorized === null) {
    return <main className="shell py-16 text-sm text-mist">Verifying Admin access…</main>;
  }
  if (!authorized) {
    return (
      <main className="shell py-16">
        <h1 className="font-serif text-4xl text-paper">Admin access required</h1>
        <p className="mt-3 text-sm text-mist">The finance ledger is restricted to Studio Admins.</p>
        {loadError ? (
          <p role="alert" className="mt-4 text-sm text-red-300">
            {loadError}
          </p>
        ) : null}
      </main>
    );
  }

  return (
    <main className="shell py-8">
      {loadError ? (
        <p role="alert" className="mb-5 text-sm text-red-300">
          {loadError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            to="/admin"
            className="text-[11px] uppercase tracking-[0.32em] text-blue-2 hover:text-paper"
          >
            Admin dashboard
          </Link>
          <h1 className="mt-2 font-serif text-5xl">Finance ledger</h1>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Issued receipts</p>
          <p className="font-serif text-3xl">{summary.count}</p>
          <p className="text-sm text-mist">{formatMoney(summary.total)}</p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <StatPanel
          label="Deposit share"
          value={`${summary.depositShare}%`}
          detail={`${formatMoney(summary.depositTotal)} in retainer receipts`}
        />
        <StatPanel
          label="Balance share"
          value={`${summary.balanceShare}%`}
          detail={`${formatMoney(summary.balanceTotal)} in final receipts`}
        />
        <StatPanel
          label="Latest issue"
          value={summary.latest ? formatMoney(summary.latest.amount) : "—"}
          detail={
            summary.latest
              ? new Date(summary.latest.issued_at).toLocaleDateString("en-KE", {
                  dateStyle: "medium",
                })
              : "No receipts issued"
          }
        />
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">Offline payments</p>
            <h2 className="mt-1 font-serif text-3xl">Payment reports</h2>
          </div>
          <p className="text-sm text-mist">
            {paymentReports.filter((report) => report.status === "pending_review").length} awaiting
            review
          </p>
        </div>
        <div className="mt-4 grid gap-3">
          {paymentReports.length ? (
            paymentReports.map((report) => (
              <OfflinePaymentReviewCard
                key={report.id}
                report={report}
                submitting={reviewingReportId === report.id}
                onReview={reviewReport}
              />
            ))
          ) : (
            <p className="rounded-lg border border-paper/10 bg-ink/50 p-5 text-sm text-mist">
              No offline payment reports need review.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">Receipts</p>
            <h2 className="mt-1 font-serif text-3xl">Issued receipts</h2>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {rows.map((receipt) => (
            <article key={receipt.id} className="glass rounded-lg p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">
                    {receipt.receipt_no}
                  </p>
                  <h2 className="font-serif text-3xl">{receipt.payer_name}</h2>
                  <p className="text-sm text-mist">
                    {receipt.kind} · {new Date(receipt.issued_at).toLocaleString()} · {receipt.status}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-3xl tabular-nums">{formatMoney(receipt.amount)}</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mist">
                    {receipt.payment_method}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-5">
                <Stat label="Job" value={receipt.job_id} />
                <Stat label="Invoice" value={receipt.invoice_id} />
                <Stat
                  label="Payment provider"
                  value={
                    receipt.provider?.startsWith("offline_")
                      ? "Offline report"
                      : (receipt.provider ?? "Legacy / offline")
                  }
                />
                <Stat
                  label="Provider reference"
                  value={receipt.provider_reference ?? "Not recorded"}
                />
                <Stat label="Issued by" value={receipt.issued_by} />
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button
                  variant="line"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${receipt.receipt_no} · ${receipt.amount}`,
                      );
                      toast.success("Reference copied");
                    } catch {
                      toast.error("Could not copy reference");
                    }
                  }}
                >
                  Copy reference
                </Button>
                <Link
                  to="/portal/$projectId/receipts/$receiptId"
                  params={{ projectId: receipt.job_id, receiptId: receipt.id }}
                >
                  <Button variant="paper" size="sm">
                    Open digital receipt
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function OfflinePaymentReviewCard({
  report,
  submitting,
  onReview,
}: {
  report: OfflinePaymentReportRow;
  submitting: boolean;
  onReview: (
    report: OfflinePaymentReportRow,
    decision: "confirm" | "reject",
    note: string,
  ) => Promise<void>;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [verified, setVerified] = useState(false);
  const needsReceiptRetry = report.status === "confirmed";

  return (
    <article className="glass rounded-lg p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${
              needsReceiptRetry
                ? "border-blue-300/25 bg-blue-300/5 text-blue-100"
                : "border-amber-300/25 bg-amber-300/5 text-amber-100"
            }`}
          >
            {needsReceiptRetry ? "Confirmed · receipt needed" : "Awaiting review"}
          </span>
          <h3 className="mt-2 font-serif text-2xl">{report.client_name ?? report.account_name ?? "Client"}</h3>
          <p className="text-sm text-mist">{report.job_title ?? report.invoice_kind ?? "Project invoice"}</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-2xl tabular-nums">
            {formatMoney(report.invoice_amount ?? report.reported_amount)}
          </p>
          <p className="text-xs text-mist">{report.invoice_kind ?? "Invoice"}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Payment method" value={report.payment_method.replaceAll("_", " ")} />
        <Stat label="Transaction reference" value={report.transaction_reference} />
        <Stat label="Payment date" value={report.payment_date.slice(0, 10)} />
        <Stat label="Reported by" value={report.account_name ?? report.user_id} />
      </div>
      {report.client_note ? (
        <p className="mt-3 rounded-md border border-paper/10 bg-ink/50 p-3 text-sm text-mist">
          Client note: {report.client_note}
        </p>
      ) : null}
      {needsReceiptRetry ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-mist">
            Payment is confirmed; receipt issuance needs to be retried.
          </p>
          <Button
            type="button"
            variant="line"
            className="min-h-10"
            disabled={submitting}
            onClick={() => void onReview(report, "confirm", "")}
          >
            {submitting ? "Retrying…" : "Retry receipt issue"}
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <label className="flex items-start gap-2 text-xs text-mist">
            <input
              type="checkbox"
              checked={verified}
              onChange={(event) => setVerified(event.target.checked)}
              className="mt-0.5 accent-blue-2"
            />
            I verified this payment against the actual M-Pesa, bank, or cash records.
          </label>
          <label className="grid gap-1.5 text-xs text-mist">
            Review note {report.status === "pending_review" ? "(required to reject)" : "(optional)"}
            <textarea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              maxLength={1000}
              rows={2}
              className="rounded-md border border-paper/15 bg-void px-3 py-2 text-sm text-paper"
              placeholder="Record the verification detail or rejection reason."
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="line"
              className="min-h-10"
              disabled={submitting || !reviewNote.trim()}
              onClick={() => void onReview(report, "reject", reviewNote.trim())}
            >
              Reject report
            </Button>
            <Button
              type="button"
              variant="primary"
              className="min-h-10"
              disabled={submitting || !verified}
              onClick={() => void onReview(report, "confirm", reviewNote.trim())}
            >
              {submitting ? "Saving review…" : "Confirm payment"}
            </Button>
          </div>
          <p className="text-right text-xs text-mist">
            Confirmation marks the invoice paid and issues its client receipt.
          </p>
        </div>
      )}
    </article>
  );
}

function StatPanel({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      <p className="mt-2 text-sm text-mist">{detail}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-paper/10 bg-ink/50 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-1 break-all text-sm text-paper">{value}</p>
    </div>
  );
}
