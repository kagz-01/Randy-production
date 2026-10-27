import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  Check,
  ClipboardList,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ADDONS,
  EVENT_TYPES,
  GUEST_BANDS,
  TIERS,
  VENUE_TYPES,
  type EventType,
  type ServiceKey,
  type TierKey,
  type VenueType,
} from "@/data/catalog";
import { buildProposalSheet, buildProposalSummary, priceQuote } from "@/lib/pricing";
import { refineQuote, saveQuote } from "@/lib/server/studio";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/quote")({ component: QuotePage });

const EVENT_GROUPS: { label: string; description: string; events: EventType[] }[] = [
  {
    label: "Celebrations & culture",
    description: "Personal milestones, ceremonies and family gatherings",
    events: ["wedding", "traditional", "birthday", "graduation", "harambee", "private", "naming", "school"],
  },
  {
    label: "Business & brands",
    description: "Company moments, launches and audience experiences",
    events: ["corporate", "conference", "launch", "gala", "expo", "team"],
  },
  {
    label: "Live & media",
    description: "Public shows, press moments and content production",
    events: ["concert", "press", "campaign", "film"],
  },
];

const EVENT_DESCRIPTIONS: Record<EventType, string> = {
  traditional: "Ruracio and family gatherings",
  wedding: "Ceremony, reception and guest experience",
  birthday: "Milestones and private celebrations",
  graduation: "Graduation and send-off celebrations",
  harambee: "Community and church gatherings",
  corporate: "AGMs, company days and town halls",
  conference: "Summits, forums and multi-session events",
  concert: "Live music and audience production",
  launch: "Brand reveals and product experiences",
  campaign: "Digital campaigns and content days",
  gala: "Awards, dinners and formal occasions",
  press: "Press briefings and media moments",
  expo: "Trade fairs, stands and exhibitions",
  team: "Offsites, retreats and team experiences",
  private: "Intimate celebrations and sherehe",
  naming: "Naming ceremonies and showers",
  school: "Prize days and school celebrations",
  film: "Film sets and production days",
};

const SERVICE_DETAILS: Record<ServiceKey, string> = {
  film: "Photo, video and edited story coverage",
  brand: "Branded environments and visual moments",
  stage: "Stage, scenic build and room layout",
  sound: "PA, microphones and show-day audio",
  decor: "Styling, florals, draping and finish",
};

function QuotePage() {
  const nav = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [eventType, setEventType] = useState<EventType>("wedding");
  const [eventGroupLabel, setEventGroupLabel] = useState(EVENT_GROUPS[0].label);
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
  const activeEventGroup =
    EVENT_GROUPS.find((group) => group.label === eventGroupLabel) ?? EVENT_GROUPS[0];
  const selectedTier = TIERS.find((level) => level.key === tier) ?? TIERS[1];
  const selectedVenue = VENUE_TYPES.find((item) => item.key === venueType) ?? VENUE_TYPES[1];
  const selectedServices = ADDONS.filter((addon) => services.includes(addon.key));
  const contactReady = Boolean(clientName.trim()) && Boolean(email.trim() || phone.trim());
  const priceSummary = useMemo(
    () => priceQuote({ eventType, guests, tier, services, venueType }),
    [eventType, guests, tier, services, venueType],
  );
  const proposalInput = {
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
  };
  const proposalSheet = useMemo(() => buildProposalSheet(proposalInput), [
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
  ]);

  function toggleService(key: ServiceKey) {
    setServices((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    );
  }

  async function lockQuote() {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    if (!contactReady) {
      toast.error("Add the organiser’s name and at least one contact method to continue.");
      document.getElementById("client-details")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    setBusy(true);
    try {
      const result = await saveQuote({
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
      toast.success("Your quote is ready");
      nav({ to: "/book/$quoteId", params: { quoteId: result.quoteId } });
    } catch {
      toast.error("We couldn’t save this quote. Please sign in and try again.");
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
      const result = await refineQuote({ data: { eventType, guests, tier, services } });
      setNote(result.note);
    } catch {
      toast.error("The quote desk is unavailable right now. Your estimate is still here.");
    } finally {
      setBusy(false);
    }
  }

  function downloadProposal() {
    const summary = buildProposalSummary(proposalInput);
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(title || "randy-production-proposal")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("Proposal summary downloaded.");
  }

  function printProposal() {
    const popup = window.open("", "_blank");
    if (!popup) {
      toast.error("Your browser blocked the proposal sheet. Allow pop-ups and try again.");
      return;
    }

    popup.document.write(proposalSheet);
    popup.document.close();
    popup.focus();
    popup.setTimeout(() => popup.print(), 200);
  }

  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main className="shell pb-20 pt-28 md:pt-36">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/work"
              className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.18em] text-mist transition-colors hover:text-paper"
            >
              <span aria-hidden>←</span> Back to work
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full border border-paper/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-mist">
              <span className="size-1.5 rounded-full bg-blue-2" />
              Planning estimate · KES
            </span>
          </div>

          <div className="mt-8 grid gap-8 border-b border-paper/10 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.55fr)] lg:items-end">
            <div>
              <p className="eyebrow">Randy Production · Quote studio</p>
              <h1 className="mt-4 max-w-[13ch] text-5xl leading-[0.92] md:text-7xl">
                Make the moment feel like yours.
              </h1>
              <p className="section-lead mt-5 max-w-2xl">
                Tell us what you’re planning. We’ll shape a production estimate around the
                audience, venue and experience you want people to remember.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 self-end text-[10px] uppercase tracking-[0.12em] text-mist sm:gap-3">
              <StepLink number="01" label="Moment" href="#event-brief" />
              <StepLink number="02" label="Production" href="#production-plan" />
              <StepLink number="03" label="Contact" href="#client-details" />
            </div>
          </div>
        </div>

        <div className="sticky top-20 z-30 mt-4 flex items-center justify-between gap-3 rounded-lg border border-paper/10 bg-void/90 px-4 py-3 shadow-[0_12px_30px_rgb(0_0_0/0.2)] backdrop-blur-xl lg:hidden">
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-mist">Live estimate · KES</p>
            <p className="mt-0.5 font-serif text-xl leading-tight tabular-nums text-paper">
              {formatMoney(priceSummary.amount)}
            </p>
          </div>
          <a
            href="#proposal"
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-paper/15 px-3 text-xs text-paper transition-colors hover:border-blue-2/60"
          >
            View breakdown <ArrowDown className="size-3.5" aria-hidden />
          </a>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.75fr)] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <section
              id="event-brief"
              className="scroll-mt-28 border-b border-paper/10 pb-9 pt-2"
            >
              <SectionHeading
                number="01"
                title="Start with the occasion"
                description="Choose the closest fit. We’ll fine-tune the details with you."
              />

              <div className="mt-7">
                <div
                  role="group"
                  aria-label="Event category"
                  className="grid grid-cols-3 gap-2"
                >
                  {EVENT_GROUPS.map((group) => {
                    const active = eventGroupLabel === group.label;
                    return (
                      <button
                        key={group.label}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setEventGroupLabel(group.label)}
                        className={cn(
                          "min-h-14 rounded-md border px-3 py-2 text-left text-xs font-medium leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2 sm:min-h-12",
                          active
                            ? "border-blue-2/50 bg-blue/10 text-paper"
                            : "border-paper/10 bg-paper/[0.025] text-mist hover:border-paper/25 hover:text-paper",
                        )}
                      >
                        {group.label}
                        <span className="mt-1 block text-[9px] font-normal text-mist">
                          {group.events.length} event types
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5">
                  <div className="mb-3">
                    <h3 className="font-sans text-sm font-medium tracking-normal text-paper">
                      {activeEventGroup.label}
                    </h3>
                    <p className="mt-1 text-xs text-mist">{activeEventGroup.description}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {activeEventGroup.events.map((key) => {
                      const event = EVENT_TYPES.find((item) => item.key === key);
                      if (!event) return null;
                      const active = eventType === key;
                      return (
                        <button
                          key={event.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setEventType(event.key)}
                          className={cn(
                            "group flex min-h-[76px] items-start justify-between gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2",
                            active
                              ? "border-blue-2/60 bg-blue/10"
                              : "border-paper/10 bg-paper/[0.025] hover:border-paper/25 hover:bg-paper/[0.045]",
                          )}
                        >
                          <span>
                            <span className="block text-sm font-medium text-paper">
                              {event.label}
                            </span>
                            <span className="mt-1 block text-xs leading-relaxed text-mist">
                              {EVENT_DESCRIPTIONS[event.key]}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                              active
                                ? "border-blue-2 bg-blue text-paper"
                                : "border-paper/20 text-transparent",
                            )}
                          >
                            {active ? <Check className="size-3" aria-hidden /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <Field label="Expected attendance" hint="Select the closest guest range">
                  <div className="grid grid-cols-2 gap-2">
                    {GUEST_BANDS.map((band) => (
                      <Choice
                        key={band.key}
                        active={guests === band.key}
                        onClick={() => setGuests(band.key)}
                      >
                        {band.label}
                      </Choice>
                    ))}
                  </div>
                </Field>
                <Field label="Event date" hint="A date helps us assess availability">
                  <Input
                    type="date"
                    aria-label="Event date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className="h-12"
                  />
                </Field>
                <Field label="Venue or location" hint="Add a venue name or area if known">
                  <Input
                    value={venue}
                    onChange={(event) => setVenue(event.target.value)}
                    placeholder="e.g. Nairobi Arboretum"
                    aria-label="Venue or location"
                    className="h-12"
                  />
                </Field>
                <Field label="Venue setting" hint="This influences access, power and logistics">
                  <div className="grid gap-2">
                    {VENUE_TYPES.map((item) => (
                      <Choice
                        key={item.key}
                        active={venueType === item.key}
                        onClick={() => setVenueType(item.key)}
                        detail={item.note}
                        alignment="left"
                      >
                        {item.label}
                      </Choice>
                    ))}
                  </div>
                </Field>
              </div>
            </section>

            <section
              id="production-plan"
              className="scroll-mt-28 border-b border-paper/10 py-9"
            >
              <SectionHeading
                number="02"
                title="Shape the production"
                description="Pick a level of support, then add the pieces that matter most."
              />

              <Field label="Production level" hint="You can adjust the scope with our team later">
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {TIERS.map((item) => {
                    const active = tier === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setTier(item.key)}
                        className={cn(
                          "min-h-36 rounded-lg border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2",
                          active
                            ? "border-blue-2/60 bg-blue/10"
                            : "border-paper/10 bg-paper/[0.025] hover:border-paper/25",
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-serif text-2xl text-paper">{item.label}</span>
                          {active ? <Check className="size-4 text-blue-2" aria-hidden /> : null}
                        </span>
                        <span className="mt-2 block text-xs leading-relaxed text-mist">
                          {item.note}
                        </span>
                        <span className="mt-4 block text-[10px] uppercase tracking-[0.14em] text-blue-2">
                          {item.key === "signal"
                            ? "Essential"
                            : item.key === "floor"
                              ? "Full production"
                              : "Flagship"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field
                label="Production services"
                hint="Choose what you’d like us to plan. Leave anything undecided unticked."
              >
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {ADDONS.map((addon) => {
                    const active = services.includes(addon.key);
                    return (
                      <button
                        key={addon.key}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleService(addon.key)}
                        className={cn(
                          "flex min-h-[72px] items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2",
                          active
                            ? "border-blue-2/50 bg-blue/8"
                            : "border-paper/10 bg-paper/[0.025] hover:border-paper/25",
                        )}
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded border",
                            active
                              ? "border-blue-2 bg-blue text-paper"
                              : "border-paper/25 text-transparent",
                          )}
                        >
                          {active ? <Check className="size-3" aria-hidden /> : null}
                        </span>
                        <span>
                          <span className="block text-sm font-medium text-paper">
                            {addon.label}
                          </span>
                          <span className="mt-1 block text-xs text-mist">
                            {SERVICE_DETAILS[addon.key]}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>
            </section>

            <section id="client-details" className="scroll-mt-28 py-9">
              <SectionHeading
                number="03"
                title="A few details to make it yours"
                description="Share the details you already know. You can refine the scope with our team later."
              />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Working title" hint="Optional">
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Njeri & Kairo’s wedding"
                    aria-label="Working title"
                    className="h-12"
                  />
                </Field>
                <Field label="Your name" hint="Required to continue">
                  <Input
                    value={clientName}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="Name of organiser"
                    aria-label="Your name"
                    autoComplete="name"
                    className="h-12"
                  />
                </Field>
                <Field label="Email address" hint="Add email or phone">
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    aria-label="Email address"
                    autoComplete="email"
                    className="h-12"
                  />
                </Field>
                <Field label="Phone number" hint="Add phone or email">
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+254 7XX XXX XXX"
                    aria-label="Phone number"
                    autoComplete="tel"
                    className="h-12"
                  />
                </Field>
              </div>
              <Field label="What should the experience feel like?" hint="Optional">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  aria-label="What should the experience feel like?"
                  placeholder="Share the mood, audience, key moments or practical needs you already know."
                  className="mt-2 min-h-32 w-full resize-y rounded-md border border-paper/10 bg-void/60 p-4 text-sm text-paper outline-none transition-colors placeholder:text-mist/80 focus:border-blue-2/60 focus:ring-2 focus:ring-blue/20"
                />
              </Field>
            </section>

            <div className="flex flex-col gap-3 border-t border-paper/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-md text-xs leading-relaxed text-mist">
                Your estimate is a starting point. Final scope is confirmed after a production
                conversation and venue review.
              </p>
              <Button
                onClick={lockQuote}
                disabled={busy || isPending}
                className="h-12 w-full shrink-0 sm:w-auto"
              >
                {isPending ? "Checking account…" : user ? "Continue to booking" : "Sign in to continue"}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>

          <aside id="proposal" className="min-w-0 scroll-mt-28 lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-xl border border-paper/12 bg-ink/80 shadow-[0_24px_70px_rgb(0_0_0/0.28)]">
              <div className="border-b border-paper/10 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-blue-2">
                    Live estimate
                  </p>
                  <Sparkles className="size-4 text-blue-2" aria-hidden />
                </div>
                <p className="mt-4 font-serif text-4xl tracking-[-0.06em] text-paper sm:text-5xl">
                  {formatMoney(priceSummary.amount)}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-mist">
                  Indicative production estimate in Kenyan shillings. Refined as you shape the brief.
                </p>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-paper/10 pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-mist">
                      Planning range
                    </p>
                    <p className="mt-1 text-sm font-medium tabular-nums text-paper">
                      {formatMoney(priceSummary.budgetBand.min)} –{" "}
                      {formatMoney(priceSummary.budgetBand.max)}
                    </p>
                  </div>
                  <span className="rounded-full border border-paper/10 px-2.5 py-1 text-[10px] text-mist">
                    {priceSummary.budgetBand.label}
                  </span>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <section>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-mist">
                    <ClipboardList className="size-3.5" aria-hidden />
                    Your brief
                  </div>
                  <div className="mt-3 space-y-3">
                    <SummaryRow label="Occasion" value={selectedEvent.label} />
                    <SummaryRow label="Guests" value={`${guests} people`} />
                    <SummaryRow label="Production" value={`${selectedTier.label} level`} />
                    <SummaryRow label="Venue" value={selectedVenue.label} />
                    {date ? <SummaryRow label="Date" value={date} /> : null}
                    {venue ? (
                      <div className="flex items-start gap-2 text-xs text-paper">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-mist" aria-hidden />
                        <span>{venue}</span>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="border-t border-paper/10 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-mist">
                      Selected services
                    </p>
                    <span className="text-xs text-paper">{selectedServices.length}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedServices.length ? (
                      selectedServices.map((item) => (
                        <span
                          key={item.key}
                          className="rounded-full border border-paper/10 bg-paper/[0.035] px-3 py-1.5 text-xs text-paper/85"
                        >
                          {item.label}
                        </span>
                      ))
                    ) : (
                      <p className="text-xs text-mist">No add-on services selected yet.</p>
                    )}
                  </div>
                </section>

                <details className="group border-t border-paper/10 pt-4">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-paper marker:hidden">
                    View estimate breakdown
                    <ArrowDown className="size-4 text-mist transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <ul className="mt-2 space-y-3">
                    {priceSummary.lines.map((line) => (
                      <li
                        key={line.label}
                        className="flex items-start justify-between gap-4 text-xs"
                      >
                        <span className="text-mist">{line.label}</span>
                        <span className="shrink-0 tabular-nums text-paper">
                          {formatMoney(line.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>

                <div className="rounded-lg border border-blue-2/20 bg-blue/5 p-4">
                  <p className="text-xs font-medium text-paper">What the estimate covers</p>
                  <p className="mt-2 text-xs leading-relaxed text-mist">
                    Scope, guest range, venue complexity, crew logistics and estimated VAT are
                    reflected in the breakdown. Venue hire, artist fees and specialist requests
                    are confirmed separately.
                  </p>
                </div>

                {note ? (
                  <div className="rounded-lg border border-paper/10 bg-paper/[0.035] p-4 text-sm leading-relaxed text-paper/85">
                    {note}
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  <Button variant="line" onClick={downloadProposal} className="min-h-11">
                    Download proposal
                  </Button>
                  <Button variant="ghost" onClick={printProposal} className="min-h-11">
                    Print / save as PDF
                  </Button>
                </div>
                <button
                  type="button"
                  disabled={busy || isPending}
                  onClick={refine}
                  className="min-h-11 w-full text-center text-xs text-mist underline decoration-paper/20 underline-offset-4 transition-colors hover:text-paper disabled:opacity-50"
                >
                  Ask the quote desk to refine this
                </button>
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] leading-relaxed text-mist/80">
              The final proposal is subject to a production review and confirmed availability.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

function StepLink({ number, label, href }: { number: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex min-h-12 items-center gap-2 border-b border-paper/15 text-left transition-colors hover:border-blue-2 hover:text-paper"
    >
      <span className="text-blue-2">{number}</span>
      <span>{label}</span>
    </a>
  );
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <span className="mt-1 text-xs tabular-nums text-blue-2">{number}</span>
      <div>
        <h2 className="font-serif text-3xl tracking-[-0.045em] text-paper">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">{description}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-medium text-paper">{label}</p>
        {hint ? <p className="text-[10px] text-mist">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
  detail,
  alignment = "center",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  detail?: string;
  alignment?: "center" | "left";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full flex-col justify-center rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2",
        alignment === "left" ? "items-start text-left" : "items-center text-center",
        active
          ? "border-blue-2/60 bg-blue/10 text-paper"
          : "border-paper/10 bg-paper/[0.025] text-mist hover:border-paper/25 hover:text-paper",
      )}
    >
      <span>{children}</span>
      {detail ? <span className="mt-1 text-[10px] leading-relaxed text-mist">{detail}</span> : null}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="text-mist">{label}</span>
      <span className="text-right text-paper">{value}</span>
    </div>
  );
}
