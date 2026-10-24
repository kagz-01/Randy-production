import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site/nav";
import { Reveal } from "@/components/site/fx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADDONS, EVENT_TYPES, GUEST_BANDS, TIERS, VENUE_TYPES, type EventType, type ServiceKey, type TierKey, type VenueType } from "@/data/catalog";
import { buildProposalSheet, buildProposalSummary, priceQuote } from "@/lib/pricing";
import { refineQuote, saveQuote } from "@/lib/server/studio";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatMoney, cn } from "@/lib/utils";

export const Route = createFileRoute("/quote")({ component: QuotePage });

function QuotePage() {
  const nav = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [eventType, setEventType] = useState<EventType>("wedding");
  const [guests, setGuests] = useState(150);
  const [tier, setTier] = useState<TierKey>("floor");
  const [venueType, setVenueType] = useState<VenueType>("hall");
  const [services, setServices] = useState<ServiceKey[]>(["stage", "sound", "decor"]);
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedEvent = EVENT_TYPES.find((event) => event.key === eventType) ?? EVENT_TYPES[1];
  const selectedTier = TIERS.find((level) => level.key === tier) ?? TIERS[1];
  const selectedVenue = VENUE_TYPES.find((venue) => venue.key === venueType) ?? VENUE_TYPES[1];
  const selectedServices = ADDONS.filter((addon) => services.includes(addon.key));
  const contactReady = Boolean(clientName.trim()) && Boolean(email.trim() || phone.trim());
  const priceSummary = useMemo(
    () => priceQuote({ eventType, guests, tier, services, venueType }),
    [eventType, guests, tier, services, venueType],
  );
  const proposalSheet = useMemo(
    () => buildProposalSheet({
      eventType,
      guests,
      tier,
      services,
      venueType,
      title,
      venue,
      date,
      clientName,
      email,
      phone,
      message,
    }),
    [eventType, guests, tier, services, venueType, title, venue, date, clientName, email, phone, message],
  );

  const deliveryNotes = [
    `${selectedTier.label} production tier`,
    `${selectedVenue.label} venue profile`,
    `${selectedServices.length || 1} technical focus${selectedServices.length === 1 ? "" : "es"}`,
    `${guests} guest flow`,
    venue ? `Venue: ${venue}` : "Venue to be confirmed",
  ];

  const includedItems = [
    "Technical planning and site readiness",
    "Production crew for build and show time",
    "Power, rigging and floor coordination",
    "Mood-led styling aligned to the chosen event",
  ];

  const exclusions = [
    "Venue hire, security and public liability cover",
    "Artist rider, talent fees and hospitality",
    "Extra lighting or scenic builds outside the brief",
    "Live streaming and content retention unless quoted separately",
  ];

  function toggle(key: ServiceKey) {
    setServices((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  async function lock() {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    if (!contactReady) {
      toast.error("Add the client name and at least one contact method to lock the quote.");
      return;
    }
    setBusy(true);
    try {
      const res = await saveQuote({
        data: {
          eventType,
          guests,
          tier,
          services,
          venue,
          date,
          title: title || undefined,
          clientName: clientName || undefined,
          email: email || undefined,
          phone: phone || undefined,
          message: message || undefined,
        },
      });
      toast.success("Quote locked");
      nav({ to: "/book/$quoteId", params: { quoteId: res.quoteId } });
    } catch {
      toast.error("Could not lock quote — sign in and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function refine() {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      const res = await refineQuote({ data: { eventType, guests, tier, services } });
      setNote(res.note);
    } catch {
      toast.error("Desk is offline. Ballpark still holds.");
    } finally {
      setBusy(false);
    }
  }

  function downloadProposal() {
    const summary = buildProposalSummary({
      eventType,
      guests,
      tier,
      services,
      venueType,
      title,
      venue,
      date,
      clientName,
      email,
      phone,
      message,
    });
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(title || "randy-production-proposal").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Proposal summary downloaded.");
  }

  function printProposal() {
    if (typeof window === "undefined") {
      return;
    }

    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      toast.error("Your browser blocked the proposal printer. Allow pop-ups and try again.");
      return;
    }

    popup.document.write(proposalSheet);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 150);
    toast.success("Proposal sheet opened for printing.");
  }

  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main className="shell grid gap-8 pt-28 pb-20 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <Reveal>
            <Link
              to="/work"
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-mist transition-colors hover:text-paper"
            >
              <span aria-hidden>←</span>
              Back to work
            </Link>
            <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-blue-2">Quote desk</p>
            <h1 className="mt-3 max-w-[12ch] text-4xl md:text-5xl">Build the room around the story.</h1>
            <p className="mt-3 max-w-xl text-base text-mist md:text-lg">
              A realistic proposal starts with guest flow, production complexity, venue constraints and the level of polish the night needs. This brief helps us price it the way the Kenyan market actually works.
            </p>
          </Reveal>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="glass-strong rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-mist">Budget band</p>
              <p className="mt-2 text-2xl leading-tight text-paper">{priceSummary.budgetBand.label}</p>
              <p className="mt-2 text-sm text-mist">{formatMoney(priceSummary.budgetBand.min)}–{formatMoney(priceSummary.budgetBand.max)}</p>
            </div>
            <div className="glass-strong rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-mist">Lead time</p>
              <p className="mt-2 text-2xl leading-tight text-paper">4–8 weeks</p>
              <p className="mt-2 text-sm text-mist">For full production and venue planning.</p>
            </div>
            <div className="glass-strong rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-mist">Deposit</p>
              <p className="mt-2 text-2xl leading-tight text-paper">30–40%</p>
              <p className="mt-2 text-sm text-mist">Locks crew, venue, and technical schedule.</p>
            </div>
          </div>

          <Field label="What kind of moment is this?">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EVENT_TYPES.map((e) => (
                <Choice key={e.key} active={eventType === e.key} onClick={() => setEventType(e.key)}>
                  {e.label}
                </Choice>
              ))}
            </div>
          </Field>

          <Field label="How many guests">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GUEST_BANDS.map((g) => (
                <Choice key={g.key} active={guests === g.key} onClick={() => setGuests(g.key)}>
                  {g.label}
                </Choice>
              ))}
            </div>
          </Field>

          <Field label="How hard">
            <div className="grid gap-2">
              {TIERS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTier(t.key)}
                  className={cn(
                    "glass-lift rounded-md p-4 text-left transition-colors",
                    tier === t.key
                      ? "bg-paper text-void shadow-none"
                      : "glass text-paper hover:bg-paper/5",
                  )}
                >
                  <span className="font-serif text-xl">{t.label}</span>
                  <span className="mt-1 block text-sm opacity-70">{t.note}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Where does it happen?">
            <div className="grid gap-2 md:grid-cols-2">
              {VENUE_TYPES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVenueType(v.key)}
                  className={cn(
                    "glass-lift rounded-md p-4 text-left transition-colors",
                    venueType === v.key
                      ? "bg-paper text-void shadow-none"
                      : "glass text-paper hover:bg-paper/5",
                  )}
                >
                  <span className="font-serif text-xl">{v.label}</span>
                  <span className="mt-1 block text-sm opacity-70">{v.note}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="What do we need on the floor?">
            <div className="flex flex-wrap gap-2">
              {ADDONS.map((a) => (
                <Choice key={a.key} active={services.includes(a.key)} onClick={() => toggle(a.key)}>
                  {a.label}
                </Choice>
              ))}
            </div>
          </Field>

          <Field label="Project details">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Working title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Venue / location" value={venue} onChange={(e) => setVenue(e.target.value)} />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Input placeholder="Guest count" value={String(guests)} readOnly />
            </div>
          </Field>

          <Field label="Client enquiry">
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Client / organiser name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input type="tel" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input placeholder="Event date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us the mood, target audience, and what must feel special on the night."
              className="mt-3 h-28 w-full resize-none rounded-md border border-paper/10 bg-void/60 p-3 text-sm text-paper outline-none placeholder:text-mist"
            />
          </Field>
        </div>

        <aside className="glass-rail h-fit">
          <div className="glass-strong relative overflow-hidden rounded-xl p-6">
            <span aria-hidden className="glass-sheen" />
            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">Proposal snapshot</p>
              <p className="mt-2 text-5xl font-medium tracking-[-0.06em] tabular-nums text-paper md:text-6xl">{formatMoney(priceSummary.amount)}</p>
              <p className="mt-2 text-xs leading-relaxed text-mist">
                Budget range and proposal snapshot based on current Kenyan AV and event production staffing assumptions — adjusted for guest count, venue complexity, power access and production tier.
              </p>

              <div className="mt-6 rounded-md border border-paper/10 bg-void/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Current brief</p>
                <div className="mt-3 space-y-2 text-sm text-paper">
                  <p>{selectedEvent.label}</p>
                  <p>{guests} guests</p>
                  <p>{selectedTier.label} tier</p>
                  <p>{selectedVenue.label}</p>
                  <p>{selectedServices.map((item) => item.label).join(" • ") || "No add-ons selected"}</p>
                </div>
              </div>

              <div className="mt-6 rounded-md border border-paper/10 bg-void/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Budget reality check</p>
                <p className="mt-3 text-sm text-paper">{priceSummary.budgetBand.note}</p>
                <p className="mt-3 text-sm text-mist">Likely working range: {formatMoney(priceSummary.budgetBand.min)}–{formatMoney(priceSummary.budgetBand.max)}</p>
              </div>

              <ul className="mt-6 space-y-2 text-sm">
                {priceSummary.lines.map((l) => (
                  <li key={l.label} className="flex justify-between gap-4 text-mist">
                    <span>{l.label}</span>
                    <span className="tabular-nums text-paper">{formatMoney(l.amount)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-md border border-paper/10 bg-void/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Delivery assumptions</p>
                <ul className="mt-3 space-y-2 text-sm text-paper">
                  {deliveryNotes.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-2" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <div className="rounded-md border border-paper/10 bg-void/40 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Included</p>
                  <ul className="mt-2 space-y-2 text-sm text-paper">
                    {includedItems.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-md border border-paper/10 bg-void/40 p-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Excluded</p>
                  <ul className="mt-2 space-y-2 text-sm text-paper">
                    {exclusions.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-mist">Enquiry summary</p>
                <div className="rounded-md border border-paper/10 bg-void/40 p-3 text-sm text-paper">
                  <p>{clientName || "Client name pending"}</p>
                  <p className="mt-1 text-mist">{email || "Email pending"}</p>
                  <p className="mt-1 text-mist">{phone || "Phone pending"}</p>
                </div>
              </div>

              <div className="mt-6 rounded-md border border-paper/10 bg-void/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Client approval sheet</p>
                <ul className="mt-3 space-y-2 text-sm text-paper">
                  <li>Event: {selectedEvent.label}</li>
                  <li>Venue: {venue || "Venue to be confirmed"}</li>
                  <li>Date: {date || "To be confirmed"}</li>
                  <li>Client: {clientName || "Client name pending"}</li>
                </ul>
                <Button onClick={printProposal} variant="line" className="mt-4 w-full">
                  Print proposal sheet
                </Button>
              </div>

              <div className="mt-6 rounded-md border border-paper/10 bg-void/40 p-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Next steps</p>
                <ol className="mt-3 space-y-2 text-sm text-paper">
                  <li>1. Confirm venue, guest flow and date.</li>
                  <li>2. Approve the budget band and scope.</li>
                  <li>3. Pay the deposit and we lock the crew.</li>
                </ol>
              </div>

              {note ? <p className="mt-4 text-sm leading-relaxed text-paper/80">{note}</p> : null}

              <div className="mt-6 grid gap-2">
                <Button onClick={downloadProposal} variant="line">
                  Download proposal summary
                </Button>
                <Button onClick={printProposal} variant="ghost">
                  Open proposal for sign-off
                </Button>
                <Button disabled={busy || !contactReady} onClick={lock}>
                  {isPending ? "…" : user ? "Lock quote & book" : "Sign in to lock"}
                </Button>
                <Button variant="line" disabled={busy} onClick={refine}>
                  Ask the desk to refine
                </Button>
                <Link to="/look" className="text-center text-xs uppercase tracking-[0.16em] text-mist hover:text-paper">
                  Or dress the venue photo first
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-mist">{label}</h2>
      {children}
    </section>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-md px-3 text-sm transition-colors",
        active ? "bg-blue text-paper" : "glass glass-lift text-mist hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}
