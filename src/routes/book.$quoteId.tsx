import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site/nav";
import { GlassCard, Reveal } from "@/components/site/fx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADDONS, TIERS, VENUE_TYPES, eventLabel } from "@/data/catalog";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  getMyQuote,
  getPaymentAvailability,
  payBalance,
  payDeposit,
  signContract,
} from "@/lib/server/studio";
import { formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/book/$quoteId")({ component: BookPage });

type QuoteLine = { label: string; amount: number };

function isQuoteLine(value: unknown): value is QuoteLine {
  return Boolean(
    value &&
      typeof value === "object" &&
      "label" in value &&
      typeof value.label === "string" &&
      "amount" in value &&
      typeof value.amount === "number" &&
      Number.isSafeInteger(value.amount),
  );
}

function parseQuoteLines(value: string): QuoteLine[] | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every(isQuoteLine) ? parsed : null;
  } catch {
    return null;
  }
}

function BookPage() {
  const { quoteId } = Route.useParams();
  const { user, isPending } = useCurrentUserState();
  const [data, setData] = useState<Awaited<ReturnType<typeof getMyQuote>>>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentAvailable, setPaymentAvailable] = useState(false);
  const [paymentAvailabilityChecked, setPaymentAvailabilityChecked] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getMyQuote({ data: { id: quoteId } });
    setData(next);
  }, [quoteId]);

  useEffect(() => {
    if (!user) return;
    refresh().catch(() => setData(null));
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getPaymentAvailability()
      .then((result) => {
        if (active) setPaymentAvailable(result.available);
      })
      .catch((error) => {
        console.error("[booking] Could not check payment availability", error);
        if (active) setPaymentAvailable(false);
      })
      .finally(() => {
        if (active) setPaymentAvailabilityChecked(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (isPending) {
    return <div className="min-h-dvh" />;
  }
  if (!user) return <RedirectToSignIn />;

  const signed = Boolean(data?.contract);
  const depositInvoice = data?.invoices.find((invoice) => invoice.kind === "deposit");
  const balanceInvoice = data?.invoices.find((invoice) => invoice.kind === "balance");
  const fullyPaid = Boolean(
    data?.invoices.length && data.invoices.every((invoice) => invoice.status === "paid"),
  );
  const planAccepted = data?.agreement?.status === "accepted";
  const productionStarted = data?.job?.status === "production" || data?.job?.status === "delivered";
  const quoteLines = data ? parseQuoteLines(data.quote.breakdown) : null;
  const tierLabel = data
    ? (TIERS.find((tier) => tier.key === data.quote.tier)?.label ?? data.quote.tier)
    : "";
  const venueTypeLabel = data
    ? (VENUE_TYPES.find((venue) => venue.key === data.quote.venue_type)?.label ??
      data.quote.venue_type)
    : "";
  const serviceLabels = data
    ? data.quote.services
        .split(",")
        .filter(Boolean)
        .map((key) => ADDONS.find((addon) => addon.key === key)?.label ?? key)
    : [];
  const step = productionStarted ? 4 : planAccepted ? 3 : signed ? 2 : 1;
  const operationalStatus =
    data?.job?.status === "delivered"
      ? "Delivered"
      : data?.job?.status === "production"
        ? "In production"
        : planAccepted
          ? "Payment terms accepted"
          : signed
            ? "Agree custom milestones in your project workspace"
            : "Awaiting signature";
  const payLegacyInvoice = async (kind: "deposit" | "balance") => {
    setBusy(true);
    try {
      if (kind === "deposit") await payDeposit({ data: quoteId });
      else await payBalance({ data: { quoteId } });
      toast.success("Invoice payment received");
      await refresh();
    } catch (error) {
      console.error("[booking] Could not process invoice payment", error);
      toast.error(error instanceof Error ? error.message : "Could not process invoice payment.");
    } finally {
      setBusy(false);
    }
  };

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
            Review your proposal, sign the scope, and agree a payment plan with your producer that
            fits this project.
          </p>
        </Reveal>

        {data ? <Steps step={step} /> : null}

        {!data ? (
          <p className="mt-10 text-mist">Quote not found on this account.</p>
        ) : (
          <div className="mt-8 space-y-5">
            <Reveal>
              <GlassCard className="overflow-hidden p-0">
                <div className="flex flex-wrap items-start justify-between gap-5 border-b border-paper/10 p-5 md:p-6">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-blue-2">
                      Planning estimate
                    </p>
                    <h2 className="mt-2 font-serif text-3xl text-paper">
                      {data.job?.title || `${eventLabel(data.quote.event_type)} production`}
                    </h2>
                    <p className="mt-2 text-sm text-mist">
                      Prepared for {data.job?.client_name || "Client"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-2/20 bg-blue/5 px-4 py-3 sm:min-w-52 sm:text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-mist">
                      Estimated investment
                    </p>
                    <p className="mt-1 font-serif text-3xl tabular-nums text-paper">
                      {formatMoney(data.quote.amount)}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 md:p-6">
                  <QuoteFact label="Event" value={eventLabel(data.quote.event_type)} />
                  <QuoteFact label="Guests" value={data.quote.guests.toLocaleString()} />
                  <QuoteFact label="Production level" value={tierLabel} />
                  <QuoteFact label="Venue setting" value={venueTypeLabel} />
                  <QuoteFact
                    label="Services"
                    value={serviceLabels.join(", ") || "To be confirmed"}
                  />
                  {data.job?.venue ? <QuoteFact label="Venue" value={data.job.venue} /> : null}
                  {data.job?.event_date ? (
                    <QuoteFact
                      label="Event date"
                      value={new Date(`${data.job.event_date.slice(0, 10)}T00:00:00`).toLocaleDateString(
                        "en-KE",
                        { dateStyle: "medium" },
                      )}
                    />
                  ) : null}
                </div>
                <div className="border-t border-paper/10 px-5 py-4 md:px-6">
                  {quoteLines ? (
                    <details className="group">
                      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-paper marker:hidden">
                        Estimate breakdown
                        <span className="text-xs text-mist">
                          {quoteLines.length} line items
                        </span>
                      </summary>
                      <ul className="mt-2 divide-y divide-paper/10">
                        {quoteLines.map((line, index) => (
                          <li
                            key={`${line.label}-${index}`}
                            className="flex items-start justify-between gap-4 py-2.5 text-sm"
                          >
                            <span className="text-mist">{line.label}</span>
                            <span className="shrink-0 tabular-nums text-paper">
                              {formatMoney(line.amount)}
                            </span>
                          </li>
                        ))}
                        <li className="flex items-center justify-between gap-4 pt-3 font-medium text-paper">
                          <span>Estimated total</span>
                          <span className="tabular-nums">{formatMoney(data.quote.amount)}</span>
                        </li>
                      </ul>
                    </details>
                  ) : (
                    <p role="status" className="text-sm text-amber-100">
                      The saved estimate breakdown is unavailable. The estimate total and project
                      details are still available above.
                    </p>
                  )}
                  <p className="mt-3 text-xs leading-relaxed text-mist">
                    This is a planning estimate, not an invoice or final confirmed price. Your team
                    will review scope and availability; payment milestones are agreed separately.
                  </p>
                </div>
              </GlassCard>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-3">
              <Reveal delay={0.03}>
                <GlassCard className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-mist">Milestones</p>
                  <p className="mt-3 text-base leading-tight text-paper">Agreed per project</p>
                </GlassCard>
              </Reveal>
              <Reveal delay={0.06}>
                <GlassCard className="p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-mist">Invoices</p>
                  <p className="mt-3 text-base leading-tight text-paper">
                    {data?.invoices.length ?? 0} issued
                  </p>
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
                    Randy Production will deliver the scope described in this proposal. Final event
                    details and any project-specific conditions will be recorded with your
                    production team. Payment milestones and due dates are proposed separately and
                    become payable only after both parties accept them.
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
                  <h2 className="font-serif text-3xl">Your project workspace</h2>
                  <p className="mt-4 text-sm leading-relaxed text-mist">
                    Once your team shares a payment proposal, review each milestone there, request
                    changes if needed, and accept the terms before an invoice can be issued.
                  </p>
                  {data.job ? (
                    <Link
                      to="/portal/$projectId"
                      params={{ projectId: data.job.id }}
                      className="mt-5 inline-block"
                    >
                      <Button variant="line">Open project workspace</Button>
                    </Link>
                  ) : null}
                </GlassCard>
              </Reveal>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <Reveal delay={0.18}>
                <GlassCard className="p-6">
                  <h2 className="font-serif text-3xl">
                    {data.invoices.length ? "Issued invoices" : "Custom payment terms"}
                  </h2>
                  {data.invoices.length ? (
                    <div className="mt-4 grid gap-3">
                      {data.invoices.map((invoice) => {
                        const milestone = data.milestones.find(
                          (item) => item.invoice_id === invoice.id,
                        );
                        return (
                          <article
                            key={invoice.id}
                            className="rounded-lg border border-paper/10 bg-void/45 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.16em] text-blue-2">
                                  Invoice
                                </p>
                                <h3 className="mt-1 text-base font-medium capitalize text-paper">
                                  {milestone?.label ?? invoice.kind}
                                </h3>
                                <p className="mt-1 break-all font-mono text-[10px] text-mist">
                                  Ref {invoice.id}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-serif text-2xl tabular-nums text-paper">
                                  {formatMoney(invoice.amount)}
                                </p>
                                <span className="mt-1 inline-flex rounded-full border border-paper/15 px-2.5 py-1 text-[10px] capitalize text-mist">
                                  {invoice.status}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-paper/10 pt-3 text-xs text-mist">
                              <p>
                                {milestone?.due_date
                                  ? `Due ${new Date(`${milestone.due_date.slice(0, 10)}T00:00:00`).toLocaleDateString(
                                      "en-KE",
                                      { dateStyle: "medium" },
                                    )}`
                                  : "Due date as agreed"}
                              </p>
                              <p>
                                {invoice.paid_at
                                  ? `Paid ${new Date(invoice.paid_at).toLocaleDateString("en-KE", {
                                      dateStyle: "medium",
                                    })}`
                                  : "Payment not yet confirmed"}
                              </p>
                            </div>
                            {invoice.provider_reference ? (
                              <p className="mt-2 break-all text-xs text-mist">
                                Payment reference:{" "}
                                <span className="font-mono text-paper">
                                  {invoice.provider_reference}
                                </span>
                              </p>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm leading-relaxed text-mist">
                      No fixed split applies. Your project-specific milestones will appear in the
                      client workspace after Admin proposes them. Nothing is due until you accept
                      the plan and an invoice is issued.
                    </p>
                  )}

                  {fullyPaid ? (
                    <div className="mt-5 rounded-md border border-green-400/20 bg-green-500/5 p-3 text-sm text-green-200">
                      All currently issued invoices are paid. Check the project workspace for
                      remaining milestones and receipts.
                    </div>
                  ) : depositInvoice && depositInvoice.status !== "paid" ? (
                    <Button
                      className="mt-5"
                      disabled={!signed || busy || !paymentAvailable}
                      onClick={() => payLegacyInvoice("deposit")}
                    >
                      Pay existing deposit invoice
                    </Button>
                  ) : balanceInvoice &&
                    balanceInvoice.status !== "paid" &&
                    (!depositInvoice || depositInvoice.status === "paid") ? (
                    <Button
                      className="mt-5"
                      disabled={busy || !paymentAvailable}
                      onClick={() => payLegacyInvoice("balance")}
                    >
                      Pay existing balance invoice
                    </Button>
                  ) : (
                    <div className="mt-5">
                      <p className="text-sm text-mist">
                        Payment is arranged through your project-specific milestone agreement, not a
                        standard deposit split.
                      </p>
                      {data.job ? (
                        <Link
                          to="/portal/$projectId"
                          params={{ projectId: data.job.id }}
                          className="mt-3 inline-block"
                        >
                          <Button variant="paper">Open project workspace</Button>
                        </Link>
                      ) : null}
                    </div>
                  )}
                  {!fullyPaid &&
                  (depositInvoice?.status !== "paid" || balanceInvoice?.status !== "paid") &&
                  paymentAvailabilityChecked &&
                  !paymentAvailable ? (
                    <p
                      role="status"
                      className="mt-4 rounded-md border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100"
                    >
                      Online payments are not set up yet. Your invoice remains due; contact Randy
                      Production for payment options.
                    </p>
                  ) : null}
                </GlassCard>
              </Reveal>

              <Reveal delay={0.21}>
                <GlassCard className="p-6">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-mist">
                    Project snapshot
                  </p>
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

            {productionStarted ? (
              <Reveal delay={0.24}>
                <div className="glass-strong glow-blue relative overflow-hidden rounded-lg p-6">
                  <span aria-hidden className="glass-sheen" />
                  <div className="relative">
                    <h2 className="font-serif text-3xl">
                      {data.job?.status === "delivered"
                        ? "Project delivered."
                        : "Production is underway."}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
                      Follow the project workspace for the current run-of-show, invoices, receipts,
                      and production updates.
                    </p>
                    {data.job ? (
                      <Link
                        to="/portal/$projectId"
                        params={{ projectId: data.job.id }}
                        className="mt-4 inline-block"
                      >
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
  const labels = ["Quote", "Sign", "Payment plan", "Production"];
  return (
    <ol className="mt-8 grid grid-cols-4 gap-2">
      {labels.map((label, index) => (
        <li key={label} className="text-center">
          <span className={`block h-1 rounded-full ${index < step ? "bg-blue" : "bg-paper/15"}`} />
          <span className="mt-2 block text-[10px] uppercase tracking-[0.16em] text-mist">
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function QuoteFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-paper/10 bg-void/35 p-3">
      <p className="text-[9px] uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className="mt-1 break-words text-sm text-paper">{value}</p>
    </div>
  );
}
