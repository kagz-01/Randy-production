import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { summarizeReceiptRows } from "@/lib/receipt-summary";
import { generateReceiptForInvoice, listReceipts, type ReceiptRow } from "@/lib/server/studio";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/studio/receipts")({ component: ReceiptsPage });

function ReceiptsPage() {
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    setRows(await listReceipts());
  }

  useEffect(() => {
    refresh().catch(() => setRows([]));
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

  async function reissueReceipt(receipt: ReceiptRow) {
    setBusyId(receipt.id);
    try {
      const nextReceipt = await generateReceiptForInvoice({ data: { invoiceId: receipt.invoice_id } });
      await refresh();
      const target = nextReceipt?.job_id ? `/portal/${nextReceipt.job_id}/receipts/${nextReceipt.id}` : null;
      if (target) {
        window.open(target, "_blank", "noopener,noreferrer");
      }
      toast.success(`Receipt ${nextReceipt?.receipt_no ?? receipt.receipt_no} reissued.`);
    } catch {
      toast.error("Could not generate a digital receipt for that invoice.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Receipts</p>
          <h1 className="mt-2 font-serif text-5xl">Finance ledger</h1>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.18em] text-mist">Issued receipts</p>
          <p className="font-serif text-3xl">{summary.count}</p>
          <p className="text-sm text-mist">{formatMoney(summary.total)}</p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <StatPanel label="Deposit share" value={`${summary.depositShare}%`} detail={`${formatMoney(summary.depositTotal)} in retainer receipts`} />
        <StatPanel label="Balance share" value={`${summary.balanceShare}%`} detail={`${formatMoney(summary.balanceTotal)} in final receipts`} />
        <StatPanel label="Latest issue" value={summary.latest ? formatMoney(summary.latest.amount) : "—"} detail={summary.latest ? new Date(summary.latest.issued_at).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "No receipts issued"} />
      </section>

      <section className="mt-8 grid gap-3">
        {rows.map((receipt) => (
          <article key={receipt.id} className="glass rounded-lg p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">{receipt.receipt_no}</p>
                <h2 className="font-serif text-3xl">{receipt.payer_name}</h2>
                <p className="text-sm text-mist">
                  {receipt.kind} · {new Date(receipt.issued_at).toLocaleString()} · {receipt.status}
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif text-3xl tabular-nums">{formatMoney(receipt.amount)}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-mist">{receipt.payment_method}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Stat label="Job" value={receipt.job_id} />
              <Stat label="Invoice" value={receipt.invoice_id} />
              <Stat label="Issued by" value={receipt.issued_by} />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                variant="line"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${receipt.receipt_no} · ${receipt.amount}`);
                    toast.success("Reference copied");
                  } catch {
                    toast.error("Could not copy reference");
                  }
                }}
              >
                Copy reference
              </Button>
              <Button
                variant="paper"
                size="sm"
                disabled={busyId === receipt.id}
                onClick={() => reissueReceipt(receipt)}
              >
                {busyId === receipt.id ? "Processing…" : "Open digital receipt"}
              </Button>
            </div>
          </article>
        ))}
      </section>
    </main>
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