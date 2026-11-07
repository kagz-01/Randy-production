import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { eventLabel } from "@/data/catalog";
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    getReceipt({ data: { id: receiptId } })
      .then((result) => {
        if (active) setReceipt(result);
      })
      .catch((error) => {
        console.error("[client-receipt] Could not load receipt", error);
        if (active) {
          setReceipt(null);
          setLoadError("This receipt couldn’t be loaded. Check your connection and try again.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, receiptId, retryCount]);

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
      paymentReference: receipt.provider_reference ?? undefined,
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
  if (loading) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <main className="shell pt-32">
          <p role="status" className="text-sm text-mist">Loading receipt…</p>
        </main>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <main className="shell pt-32">
          <p role="alert" className="max-w-xl text-sm text-red-300">{loadError}</p>
          <Button
            type="button"
            variant="line"
            className="mt-4 min-h-11"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Try again
          </Button>
        </main>
      </div>
    );
  }
  if (!receipt) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <p className="shell pt-32 text-mist">Receipt not found on this account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-void print:bg-white">
      <div className="print:hidden">
        <SiteNav />
      </div>
      <main className="shell pb-20 pt-28 print:max-w-none print:px-0 print:pb-0 print:pt-0">
        <div className="flex flex-wrap items-start justify-between gap-4 print:mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Digital receipt</p>
            <h1 className="mt-2 font-serif text-5xl text-paper print:text-black">{receipt.receipt_no}</h1>
            <p className="mt-2 text-mist print:text-gray-600">
              Issued {new Date(receipt.issued_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button
              variant="line"
              className="min-h-11"
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button
              variant="line"
              className="min-h-11"
              onClick={downloadReceipt}
            >
              Download
            </Button>
            <Link to="/portal/$projectId" params={{ projectId }}>
              <Button variant="paper" className="min-h-11">Back to project</Button>
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_0.95fr] print:mt-0 print:block">
          <article className="glass-strong rounded-lg p-6 print:rounded-none print:border-0 print:bg-white print:p-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2 print:text-gray-600">Payment proof</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Client" value={receipt.payer_name} />
              <Field label="Amount" value={formatMoney(receipt.amount)} />
              <Field label="Payment method" value={receipt.payment_method} />
              <Field label="Payment provider" value={receipt.provider ?? "Legacy / offline"} />
              <Field label="Provider reference" value={receipt.provider_reference ?? "Not recorded"} />
              <Field label="Receipt status" value={receipt.status} />
              <Field label="Invoice kind" value={receipt.kind} />
            </div>

            <div className="mt-6 rounded-md border border-paper/10 bg-void/40 p-4 print:border-gray-200 print:bg-white">
              <p className="text-[11px] uppercase tracking-[0.2em] text-mist print:text-gray-600">Project details</p>
              {snapshot ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {typeof snapshot.jobTitle === "string" ? (
                    <Field label="Project" value={snapshot.jobTitle} />
                  ) : null}
                  {typeof snapshot.eventType === "string" ? (
                    <Field label="Event" value={eventLabel(snapshot.eventType)} />
                  ) : null}
                  {typeof snapshot.venue === "string" && snapshot.venue ? (
                    <Field label="Venue" value={snapshot.venue} />
                  ) : null}
                  {typeof snapshot.eventDate === "string" && snapshot.eventDate ? (
                    <Field label="Event date" value={snapshot.eventDate} />
                  ) : null}
                  {typeof snapshot.guests === "number" ? (
                    <Field label="Guests" value={snapshot.guests.toLocaleString()} />
                  ) : null}
                  {typeof snapshot.tier === "string" ? (
                    <Field label="Production level" value={snapshot.tier} />
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-mist print:text-gray-600">
                  Project details were not included with this receipt.
                </p>
              )}
            </div>
          </article>

          <aside className="glass rounded-lg p-6 print:hidden">
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
    <div className="rounded-md border border-paper/10 bg-void/40 p-3 print:border-gray-200 print:bg-white">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist print:text-gray-600">{label}</p>
      <p className="mt-1 break-words text-sm text-paper print:text-black">{value}</p>
    </div>
  );
}