import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Compass, Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { GlassCard, Reveal } from "@/components/site/fx";
import { Button } from "@/components/ui/button";
import {
  ADDONS,
  EVENT_TYPES,
  GUEST_BANDS,
  PACKAGES,
  VENUE_TYPES,
  type EventType,
  type VenueType,
} from "@/data/catalog";
import {
  recommendPackage,
  type PackageFocus,
  type PackageRecommendation,
} from "@/lib/package-recommendation";
import { getKnowledgeForMatch, type KnowledgeAssistantResult } from "@/lib/server/knowledge";

export const Route = createFileRoute("/match")({ component: MatchPage });

const FOCUS_OPTIONS: { key: PackageFocus; label: string; detail: string }[] = [
  {
    key: "full-production",
    label: "A coordinated event",
    detail: "Stage, sound and room, managed together",
  },
  {
    key: "room-design",
    label: "The room and its look",
    detail: "Décor, styling and guest experience",
  },
  { key: "clear-sound", label: "Sound that works", detail: "A clean, reliable audio setup" },
  {
    key: "brand-story",
    label: "Brand and content",
    detail: "A launch or story people can see and share",
  },
];

function MatchPage() {
  const knowledgeRequestId = useRef(0);
  const recommendationHeadingRef = useRef<HTMLHeadingElement>(null);
  const [eventType, setEventType] = useState<EventType>("wedding");
  const [guests, setGuests] = useState(150);
  const [venueType, setVenueType] = useState<VenueType>("hall");
  const [focus, setFocus] = useState<PackageFocus>("full-production");
  const [weddingWeekend, setWeddingWeekend] = useState(false);
  const [result, setResult] = useState<PackageRecommendation | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeAssistantResult | null>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState<string | null>(null);

  const event = EVENT_TYPES.find((item) => item.key === eventType) ?? EVENT_TYPES[0];
  const guestBand = GUEST_BANDS.find((band) => band.key === guests)?.label ?? String(guests);
  const packageDetails = result
    ? (PACKAGES.find((item) => item.id === result.packageId) ?? null)
    : null;

  useEffect(() => {
    if (!result || !packageDetails) return;
    recommendationHeadingRef.current?.focus({ preventScroll: true });
    recommendationHeadingRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, [result, packageDetails]);

  function clearRecommendation() {
    knowledgeRequestId.current += 1;
    setResult(null);
    setKnowledge(null);
    setKnowledgeError(null);
    setKnowledgeLoading(false);
  }

  async function updateRecommendation() {
    const requestId = ++knowledgeRequestId.current;
    setResult(recommendPackage({ eventType, guests, venueType, focus, weddingWeekend }));
    setKnowledge(null);
    setKnowledgeError(null);
    setKnowledgeLoading(true);
    try {
      const nextKnowledge = await getKnowledgeForMatch({
        data: { eventType, guests, venueType, focus, weddingWeekend },
      });
      if (requestId === knowledgeRequestId.current) setKnowledge(nextKnowledge);
    } catch (error) {
      console.error("[package-match] Could not load sourced planning knowledge", error);
      if (requestId === knowledgeRequestId.current) {
        setKnowledgeError(
          "The sourced planning notes could not be loaded. Your package recommendation is still available.",
        );
      }
    } finally {
      if (requestId === knowledgeRequestId.current) setKnowledgeLoading(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main className="shell pb-20 pt-28">
        <Reveal>
          <p className="eyebrow">Help me choose · Production guide</p>
          <h1 className="mt-3 max-w-[14ch] text-4xl leading-[0.98] md:text-6xl">
            Find a sensible starting package.
          </h1>
          <p className="section-lead mt-4 max-w-2xl">
            Not sure which production package fits? Tell us the event size and your main priority.
            We’ll recommend a package and explain why. Pricing and quote requests happen in Get a
            Quote.
          </p>
        </Reveal>

        <div className="mt-9 grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.95fr)]">
          <Reveal>
            <GlassCard strong={false} className="p-5 sm:p-7">
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-2">
                A few quick details
              </p>

              <label htmlFor="match-event" className="mt-6 block text-sm font-medium text-paper">
                What are you planning?
              </label>
              <select
                id="match-event"
                value={eventType}
                onChange={(e) => {
                  const next = e.target.value as EventType;
                  setEventType(next);
                  if (!["wedding", "traditional"].includes(next)) setWeddingWeekend(false);
                  clearRecommendation();
                }}
                className="mt-2 min-h-12 w-full rounded-md border border-paper/15 bg-void px-3 text-sm text-paper outline-none focus-visible:border-blue-2 focus-visible:ring-2 focus-visible:ring-blue/30"
              >
                {EVENT_TYPES.map((item) => (
                  <option key={item.key} value={item.key} className="bg-void">
                    {item.label}
                  </option>
                ))}
              </select>

              <fieldset className="mt-6">
                <legend className="text-sm font-medium text-paper">About how many guests?</legend>
                <p className="mt-1 text-xs text-mist">
                  Choose the closest size. We can refine it later.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GUEST_BANDS.map((band) => (
                    <button
                      key={band.key}
                      type="button"
                      aria-pressed={guests === band.key}
                      onClick={() => {
                        setGuests(band.key);
                        clearRecommendation();
                      }}
                      className={`min-h-11 rounded-md border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2 ${
                        guests === band.key
                          ? "border-blue-2/60 bg-blue/10 text-paper"
                          : "border-paper/10 bg-paper/2.5 text-mist hover:border-paper/25 hover:text-paper"
                      }`}
                    >
                      {band.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <label htmlFor="match-venue" className="mt-6 block text-sm font-medium text-paper">
                What kind of venue?
              </label>
              <select
                id="match-venue"
                value={venueType}
                onChange={(e) => {
                  setVenueType(e.target.value as VenueType);
                  clearRecommendation();
                }}
                className="mt-2 min-h-12 w-full rounded-md border border-paper/15 bg-void px-3 text-sm text-paper outline-none focus-visible:border-blue-2 focus-visible:ring-2 focus-visible:ring-blue/30"
              >
                {VENUE_TYPES.map((venue) => (
                  <option key={venue.key} value={venue.key} className="bg-void">
                    {venue.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-mist">
                {VENUE_TYPES.find((venue) => venue.key === venueType)?.note}
              </p>

              <fieldset className="mt-6">
                <legend className="text-sm font-medium text-paper">
                  What matters most to you?
                </legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {FOCUS_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={focus === option.key}
                      onClick={() => {
                        setFocus(option.key);
                        clearRecommendation();
                      }}
                      className={`min-h-18 rounded-md border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2 ${
                        focus === option.key
                          ? "border-blue-2/60 bg-blue/10"
                          : "border-paper/10 bg-paper/2.5 hover:border-paper/25"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2 text-sm font-medium text-paper">
                        {option.label}
                        {focus === option.key ? (
                          <Check className="size-4 text-blue-2" aria-hidden />
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-mist">
                        {option.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {["wedding", "traditional"].includes(eventType) ? (
                <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 text-sm text-paper">
                  <input
                    type="checkbox"
                    checked={weddingWeekend}
                    onChange={(e) => {
                      setWeddingWeekend(e.target.checked);
                      clearRecommendation();
                    }}
                    className="mt-0.5 size-4 accent-blue"
                  />
                  <span>
                    We have two wedding events across the weekend
                    <span className="mt-1 block text-xs text-mist">
                      Select this only if both events should be planned as one joined production.
                    </span>
                  </span>
                </label>
              ) : null}

              <Button
                className="mt-6 min-h-12 w-full"
                onClick={() => void updateRecommendation()}
                disabled={knowledgeLoading}
              >
                {knowledgeLoading ? "Finding cited guidance…" : "Show my recommendation"}
                <Compass className="size-4" aria-hidden />
              </Button>
            </GlassCard>
          </Reveal>
          <Reveal delay={0.08}>
            <GlassCard strong className="p-5 sm:p-7">
              {result && packageDetails ? (
                <>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-blue-2">
                    Recommended starting point
                  </p>
                  <h2
                    ref={recommendationHeadingRef}
                    tabIndex={-1}
                    className="scroll-mt-28 mt-3 font-serif text-3xl leading-tight text-paper focus:outline-none"
                  >
                    {packageDetails.name}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-mist">{packageDetails.blurb}</p>

                  <div className="mt-4 border-y border-paper/10 py-4">
                    <p className="text-xs leading-relaxed text-mist">
                      Matched for {event.label} · {guestBand} guests ·{" "}
                      {VENUE_TYPES.find((venue) => venue.key === venueType)?.label ?? "your venue"}
                    </p>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-sm font-medium text-paper">Why this fits</h3>
                    <ul className="mt-3 space-y-3">
                      {result.reasons.map((reason) => (
                        <li key={reason} className="flex gap-2 text-sm leading-relaxed text-mist">
                          <Check className="mt-0.5 size-4 shrink-0 text-blue-2" aria-hidden />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5">
                    <h3 className="text-sm font-medium text-paper">
                      Included in this starting scope
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {result.services.map((service) => (
                        <li
                          key={service}
                          className="rounded-full border border-paper/10 bg-paper/[0.035] px-3 py-1.5 text-xs text-mist"
                        >
                          {ADDONS.find((addon) => addon.key === service)?.label ?? service}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 flex gap-3 rounded-md border border-paper/10 bg-void/40 p-3">
                    <Info className="mt-0.5 size-4 shrink-0 text-blue-2" aria-hidden />
                    <p className="text-xs leading-relaxed text-mist">{result.planningNote}</p>
                  </div>

                  {knowledgeLoading ? (
                    <p className="mt-5 text-xs text-mist" role="status">
                      Checking approved planning references…
                    </p>
                  ) : null}
                  {knowledgeError ? (
                    <p
                      className="mt-5 rounded-md border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100"
                      role="status"
                    >
                      {knowledgeError}
                    </p>
                  ) : null}
                  {knowledge ? (
                    <section
                      className="mt-5 rounded-md border border-blue/20 bg-blue/5 p-4"
                      aria-label="Sourced planning guidance"
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] text-blue-2">
                        Evidence from the knowledge base
                      </p>
                      {knowledge.insight ? (
                        <div className="mt-3">
                          <h3 className="text-sm font-medium text-paper">AI planning insight</h3>
                          <p className="mt-1 text-sm leading-relaxed text-mist">
                            {knowledge.insight}
                          </p>
                        </div>
                      ) : null}
                      {knowledge.aiMessage ? (
                        <p className="mt-2 text-xs leading-relaxed text-mist">
                          {knowledge.aiMessage}
                        </p>
                      ) : null}
                      {knowledge.entries.length > 0 ? (
                        <ul className="mt-4 space-y-3 border-t border-paper/10 pt-3">
                          {knowledge.entries.map((entry) => (
                            <li key={entry.id}>
                              <h3 className="text-sm font-medium text-paper">{entry.title}</h3>
                              <p className="mt-1 text-xs leading-relaxed text-mist">
                                {entry.content}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-mist">
                                <span>{entry.source_name}</span>
                                <span>·</span>
                                <span>{entry.jurisdiction}</span>
                                <span>·</span>
                                <span>Checked {entry.source_checked_at}</span>
                              </div>
                              {entry.source_url ? (
                                <a
                                  href={entry.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-block text-xs text-blue-2 underline-offset-2 hover:underline"
                                >
                                  View source
                                </a>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="mt-3 border-t border-paper/10 pt-3 text-[10px] leading-relaxed text-mist">
                        Guidance is contextual, not a legal or venue-compliance determination.
                        Verify current requirements with the venue and relevant local authorities.
                      </p>
                    </section>
                  ) : null}

                  <Link
                    to="/quote"
                    search={{
                      eventType,
                      guests,
                      tier: result.tier,
                      venueType,
                      services: result.services.join(","),
                    }}
                    className="mt-6 block"
                  >
                    <Button className="min-h-12 w-full">
                      Price this package in Get a Quote
                      <ArrowRight className="size-4" aria-hidden />
                    </Button>
                  </Link>
                  <p className="mt-3 text-center text-xs text-mist">
                    Your event details and recommended scope will be prefilled there.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-mist">
                    How the guide works
                  </p>
                  <h2 className="mt-3 font-serif text-3xl leading-tight text-paper">
                    Start with your production needs.
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-mist">
                    The guide uses your event format, guest count, venue and main priority to choose
                    a starting package. It does not price or submit anything.
                  </p>
                  <p className="mt-6 border-t border-paper/10 pt-5 text-xs leading-relaxed text-mist">
                    When you are ready, continue to Get a Quote to review the scope, see the
                    estimate and send your brief to the production team.
                  </p>
                </>
              )}
            </GlassCard>
          </Reveal>
        </div>
      </main>
    </div>
  );
}
