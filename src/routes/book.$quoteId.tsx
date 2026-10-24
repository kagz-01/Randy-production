import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site/nav";
import { GlassCard, Reveal } from "@/components/site/fx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMyQuote, payBalance, payDeposit, signContract } from "@/lib/server/studio";
import { eventLabel } from "@/data/catalog";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/book/$quoteId")({ component: BookPage });

function BookPage() {
  const { quoteId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Awaited<ReturnType<typeof getMyQuote>>>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getMyQuote({ data: { id: quoteId } });
    setData(next);
  }, [quoteId]);

  useEffect(() => {
    if (!user) return;
    refresh().catch(() => setData(null));
  }, [user, refresh]);

  if (isPending) {
    return <div className="min-h-dvh" />;
  }
  if (!user) return <RedirectToSignIn />;

  const signed = Boolean(data?.contract);
  const deposit = data?.invoices.find((i) => i.kind === "deposit");
  const balance = data?.invoices.find((i) => i.kind === "balance");
  const depositPaid = deposit?.status === "paid";
  const balancePaid = balance?.status === "paid";
  const fullyPaid = Boolean(depositPaid && balancePaid);
  const step = fullyPaid ? 5 : depositPaid ? 4 : signed ? 2 : 1;
  const quoteAmount = data?.quote.amount ?? 0;
  const depositAmount = deposit?.amount ?? Math.round(quoteAmount * 0.3);
  const balanceAmount = data ? Math.max(quoteAmount - depositAmount, 0) : 0;
  const operationalStatus = fullyPaid
    ? "Production ready"
    : depositPaid
      ? "Deposit received"
      : signed
        ? "Awaiting deposit"
        : "Awaiting signature";

  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 pt-28 pb-20">
        <Reveal>
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Booking</p>
          <h1 className="mt-3 max-w-[12ch] text-4xl text-paper md:text-5xl">
            Production lock-in for {eventLabel(data?.quote.event_type ?? "your event")}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-mist md:text-lg">
            Confirm the live production, lock in the crew, and move from proposal to execution with a proper
            contract and payment schedule.
          </p>
        </Reveal>

        {data ? <Steps step={step} /> : null}

        {!data ? (
          <p className="mt-10 text-mist">Quote not found on this account.</p>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <Reveal>
                <GlassCard className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-mist">Project value</p>
                  <p className="mt-3 text-3xl leading-tight tabular-nums text-paper">{formatMoney(data.quote.amount)}</p>
                </GlassCard>
              </Reveal>
              <Reveal delay={0.03}>
                <GlassCard className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-mist">Deposit</p>
                  <p className="mt-3 text-3xl leading-tight tabular-nums text-paper">{formatMoney(depositAmount)}</p>
                </GlassCard>
              </Reveal>
              <Reveal delay={0.06}>
                <GlassCard className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-mist">Balance</p>
                  <p className="mt-3 text-3xl leading-tight tabular-nums text-paper">{formatMoney(balanceAmount)}</p>
                </GlassCard>
              </Reveal>
              <Reveal delay={0.09}>
                <GlassCard className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-mist">Status</p>
                  <p className="mt-3 text-base font-medium text-blue-2">{operationalStatus}</p>
                </GlassCard>
              </Reveal>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <Reveal delay={0.12}>
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-serif text-3xl">Contract</h2>
                    <span className="rounded-full border border-blue/30 bg-blue/8 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-blue-2">
                      {signed ? "Signed" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-mist">
                    Randy Production will execute the agreed scope for this event on the approved date, venue,
                    and guest count. A 30% deposit reserves the crew and equipment. The remaining balance is due
                    seven days before the event. Any cancellation after the final confirmation window keeps the
                    deposit and releases the event team from staffing obligations.
                  </p>

                  {signed ? (
                    <div className="mt-5 rounded-md border border-paper/10 bg-void/40 p-4 text-sm">
                      <p className="text-mist">Signed by</p>
                      <p className="mt-1 text-paper">{data.contract?.signer_name}</p>
                      <p className="mt-1 text-xs text-mist">
                        {new Date(data.contract!.signed_at).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <form
                      className="mt-5 grid gap-3"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setBusy(true);
                        try {
                          await signContract({ data: { quoteId, signerName: name } });
                          toast.success("Contract signed");
                          await refresh();
                        } catch {
                          toast.error("Could not sign contract");
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
                </GlassCard>
              </Reveal>

              <Reveal delay={0.15}>
                <GlassCard className="p-6">
                  <h2 className="font-serif text-3xl">Production handoff</h2>
                  <div className="mt-5 space-y-4">
                    {[
                      { title: "Timeline lock", detail: "Venue, run-of-show, and crew call sheet confirmed." },
                      { title: "Gear check", detail: "Audio, lighting, and staging inventory are reserved." },
                      { title: "Delivery prep", detail: "Creative and technical team prepares the install plan." },
                    ].map((item) => (
                      <div key={item.title} className="rounded-md border border-paper/10 bg-void/40 p-3">
                        <p className="text-sm font-medium text-paper">{item.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-mist">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </Reveal>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <Reveal delay={0.18}>
                <GlassCard className="p-6">
                  <h2 className="font-serif text-3xl">Payment schedule</h2>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between rounded-md border border-paper/10 bg-void/40 p-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Deposit</p>
                        <p className="mt-1 text-sm text-paper">To reserve the team and gear</p>
                      </div>
                      <p className="font-serif text-2xl tabular-nums">{formatMoney(depositAmount)}</p>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-paper/10 bg-void/40 p-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Final balance</p>
                        <p className="mt-1 text-sm text-paper">Due seven days prior</p>
                      </div>
                      <p className="font-serif text-2xl tabular-nums">{formatMoney(balanceAmount)}</p>
                    </div>
                  </div>

                  {fullyPaid ? (
                    <div className="mt-5 rounded-md border border-green-400/20 bg-green-500/5 p-3 text-sm text-green-200">
                      Full payment received, the event is fully reserved, and receipt proof has been issued.
                    </div>
                  ) : depositPaid ? (
                    <Button
                      className="mt-5"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await payBalance({ data: { quoteId } });
                          toast.success("Final balance received");
                          await refresh();
                        } catch {
                          toast.error("Could not process final balance");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Pay final balance
                    </Button>
                  ) : (
                    <Button
                      className="mt-5"
                      disabled={!signed || busy}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await payDeposit({ data: quoteId });
                          toast.success("Deposit received");
                          await refresh();
                        } catch {
                          toast.error("Could not process deposit");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Pay deposit
                    </Button>
                  )}
                </GlassCard>
              </Reveal>

              <Reveal delay={0.21}>
                <GlassCard className="p-6">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-mist">Project snapshot</p>
                  <div className="mt-4 space-y-3 text-sm text-paper">
                    <div className="flex items-center justify-between rounded-md border border-paper/10 bg-void/40 p-3">
                      <span className="text-mist">Event</span>
                      <span>{eventLabel(data.quote.event_type)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-paper/10 bg-void/40 p-3">
                      <span className="text-mist">Guests</span>
                      <span>{data.quote.guests}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-paper/10 bg-void/40 p-3">
                      <span className="text-mist">Tier</span>
                      <span>{data.quote.tier}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-paper/10 bg-void/40 p-3">
                      <span className="text-mist">Venue</span>
                      <span>{data.job?.venue || "TBC"}</span>
                    </div>
                  </div>
                </GlassCard>
              </Reveal>
            </div>

            {fullyPaid ? (
              <Reveal delay={0.24}>
                <div className="glass-strong glow-blue relative overflow-hidden rounded-lg p-6">
                  <span aria-hidden className="glass-sheen" />
                  <div className="relative">
                    <h2 className="font-serif text-3xl">You are on the floor.</h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
                      The brief is live, the crew is reserved, and the project is moving into planning, execution,
                      and delivery. Continue into the live portal for the run-of-show, invoices, and nightly updates.
                    </p>
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
                </div>
              </Reveal>
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
      {labels.map((label, index) => (
        <li key={label} className="text-center">
          <span className={`block h-1 rounded-full ${index < step ? "bg-blue" : "bg-paper/15"}`} />
          <span className="mt-2 block text-[10px] uppercase tracking-[0.16em] text-mist">{label}</span>
        </li>
      ))}
    </ol>
  );
}
