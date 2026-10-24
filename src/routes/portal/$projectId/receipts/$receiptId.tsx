import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getReceipt, type ReceiptRow } from "@/lib/server/studio";
import { buildReceiptSheet } from "@/lib/receipt-sheet";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/portal/$projectId/receipts/$receiptId")({ component: ReceiptPage });

function ReceiptPage() {
  const { projectId, receiptId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [receipt, setReceipt] = useState<ReceiptRow | null>(null);

  useEffect(() => {
    if (!user) return;
    getReceipt({ data: { id: receiptId } })
      .then(setReceipt)
      .catch(() => setReceipt(null));
  }, [user, receiptId]);

  const snapshot = useMemo(() => {
    if (!receipt) return null;
    try {
      return JSON.parse(receipt.snapshot) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [receipt]);

  function downloadReceipt() {
    if (!receipt) return;
    const sheet = buildReceiptSheet({
      receiptNo: receipt.receipt_no,
      clientName: receipt.payer_name,
      amount: receipt.amount,
      paymentMethod: receipt.payment_method,
      invoiceKind: receipt.kind,
      issuedAt: receipt.issued_at,
      jobTitle: typeof snapshot?.jobTitle === "string" ? snapshot.jobTitle : undefined,
      venue: typeof snapshot?.venue === "string" ? snapshot.venue : undefined,
      eventDate: typeof snapshot?.eventDate === "string" ? snapshot.eventDate : undefined,
      projectId: projectId,
    });
    const blob = new Blob([sheet], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${receipt.receipt_no.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (isPending) return <div className="min-h-dvh bg-void" />;
  if (!user) return <RedirectToSignIn />;
  if (!receipt) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <p className="shell pt-32 text-mist">Receipt not found on this account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="shell pt-28 pb-20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Digital receipt</p>
            <h1 className="mt-2 font-serif text-5xl">{receipt.receipt_no}</h1>
            <p className="mt-2 text-mist">Issued {new Date(receipt.issued_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="line"
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button
              variant="line"
              onClick={downloadReceipt}
            >
              Download
            </Button>
            <Link to="/portal/$projectId" params={{ projectId }}>
              <Button variant="paper">Back to project</Button>
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="glass-strong rounded-lg p-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">Payment proof</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Client" value={receipt.payer_name} />
              <Field label="Amount" value={formatMoney(receipt.amount)} />
              <Field label="Payment method" value={receipt.payment_method} />
              <Field label="Receipt status" value={receipt.status} />
              <Field label="Invoice kind" value={receipt.kind} />
              <Field label="Job ID" value={receipt.job_id} />
            </div>

            <div className="mt-6 rounded-md border border-paper/10 bg-void/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Snapshot</p>
              <pre className="mt-3 overflow-auto text-xs leading-relaxed text-paper/80">{JSON.stringify(snapshot ?? {}, null, 2)}</pre>
            </div>
          </article>

          <aside className="glass rounded-lg p-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">Receipt notes</p>
            <div className="mt-4 space-y-3 text-sm text-mist">
              <p>This receipt is immutable once issued.</p>
              <p>It is tied to the paid invoice for this job and can be reprinted from the portal.</p>
              <p>For accounting, this is the proof-of-payment record Randy Production keeps on file.</p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-paper/10 bg-void/40 p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-1 text-sm text-paper">{value}</p>
    </div>
  );
}