import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyQuote, payDeposit, signContract } from "@/lib/server/studio";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/book/$quoteId")({ component: BookPage });

function BookPage() {
  const { quoteId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Awaited<ReturnType<typeof getMyQuote>>>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const next = await getMyQuote({ data: { id: quoteId } });
    setData(next);
  }

  useEffect(() => {
    if (!user) return;
    refresh().catch(() => setData(null));
  }, [user, quoteId]);

  if (isPending) {
    return <div className="min-h-dvh bg-void" />;
  }
  if (!user) return <RedirectToSignIn />;

  const signed = Boolean(data?.contract);
  const deposit = data?.invoices.find((i) => i.kind === "deposit");
  const paid = deposit?.status === "paid";
  const step = paid ? 3 : signed ? 2 : 1;

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-5 pt-28 pb-20">
        <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Booking</p>
        <h1 className="mt-3 font-serif text-5xl">Quote → sign → lock.</h1>
        <Steps step={step} />

        {!data ? (
          <p className="mt-10 text-mist">Quote not found on this account.</p>
        ) : (
          <div className="mt-10 space-y-4">
            <div className="glass rounded-lg p-6">
              <p className="text-sm text-mist">Ballpark</p>
              <p className="font-serif text-5xl tabular-nums">{formatMoney(data.quote.amount)}</p>
              <p className="mt-2 text-sm text-mist">
                {data.quote.event_type} · {data.quote.guests} · {data.quote.tier}
              </p>
            </div>

            <div className="glass rounded-lg p-6">
              <h2 className="font-serif text-2xl">Contract</h2>
              <p className="mt-3 text-sm leading-relaxed text-mist">
                Randy Production will deliver the named services on the event date. A 30% deposit locks crew
                and gear. Balance due seven days prior. Cancellation inside 14 days keeps the deposit.
              </p>
              {signed ? (
                <p className="mt-4 text-sm text-blue-2">
                  Signed by {data.contract?.signer_name} · {new Date(data.contract!.signed_at).toLocaleString()}
                </p>
              ) : (
                <form
                  className="mt-4 grid gap-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                      await signContract({ data: { quoteId, signerName: name } });
                      toast.success("Signed");
                      await refresh();
                    } catch {
                      toast.error("Could not sign");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Input
                    required
                    placeholder="Full name as signature"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <Button disabled={busy}>E-sign this contract</Button>
                </form>
              )}
            </div>

            <div className="glass rounded-lg p-6">
              <h2 className="font-serif text-2xl">Deposit</h2>
              <p className="mt-2 font-serif text-3xl tabular-nums">
                {formatMoney(deposit?.amount ?? Math.round(data.quote.amount * 0.3))}
              </p>
              {paid ? (
                <p className="mt-3 text-sm text-blue-2">Deposit received. Date is yours.</p>
              ) : (
                <Button
                  className="mt-4"
                  disabled={!signed || busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await payDeposit({ data: quoteId });
                      toast.success("Deposit logged");
                      await refresh();
                    } catch {
                      toast.error("Could not take deposit");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Pay deposit (demo)
                </Button>
              )}
            </div>

            {paid ? (
              <div className="glow-blue rounded-lg bg-ink p-6">
                <h2 className="font-serif text-3xl">You are on the floor.</h2>
                <p className="mt-2 text-sm text-mist">Portal tracks drafts, invoices, and Pulse on the night.</p>
                {data.job ? (
                  <Link to="/portal/$projectId" params={{ projectId: data.job.id }} className="mt-4 inline-block">
                    <Button variant="paper">Open project</Button>
                  </Link>
                ) : (
                  <Link to="/portal" className="mt-4 inline-block">
                    <Button variant="paper">Open portal</Button>
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["Quote", "Sign", "Deposit", "Live"];
  return (
    <ol className="mt-8 grid grid-cols-4 gap-2">
      {labels.map((l, i) => (
        <li key={l} className="text-center">
          <span className={`block h-1 rounded-full ${i < step ? "bg-blue" : "bg-paper/15"}`} />
          <span className="mt-2 block text-[10px] uppercase tracking-[0.16em] text-mist">{l}</span>
        </li>
      ))}
    </ol>
  );
}
