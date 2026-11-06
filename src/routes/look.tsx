import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  ImagePlus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EVENT_TYPES,
  GUEST_BANDS,
  type EventType,
} from "@/data/catalog";
import {
  DEFAULT_EVENT_PLAN,
  EVENT_PLAN_FOCAL_POINTS,
  EVENT_PLAN_HANDOFF_STORAGE_KEY,
  EVENT_PLAN_MOODS,
  EVENT_PLAN_STORAGE_KEY,
  buildEventPlanHandoff,
  parseEventPlanDraft,
  type EventPlanDraft,
  type EventPlanFocalPointId,
  type EventPlanMoodId,
} from "@/lib/event-plan";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/look")({ component: EventPlannerPage });

const INSPIRATION_IMAGE = "/catalog/decor/IMG_0953.webp";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_FOCAL_POINTS = 8;
const SELECT_CLASS =
  "mt-2 h-12 w-full rounded-md border border-paper/15 bg-void px-3 text-sm text-paper outline-none transition focus-visible:border-blue-2 focus-visible:ring-2 focus-visible:ring-blue/30";
const TEXTAREA_CLASS =
  "mt-2 w-full resize-y rounded-md border border-paper/10 bg-void/60 p-4 text-sm text-paper outline-none transition-colors placeholder:text-mist/80 focus:border-blue-2/60 focus:ring-2 focus:ring-blue/20";

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function EventPlannerPage() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<EventPlanDraft>(DEFAULT_EVENT_PLAN);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"loading" | "saving" | "saved" | "unavailable">("loading");
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [focalPointError, setFocalPointError] = useState<string | null>(null);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [selectedPointKind, setSelectedPointKind] = useState<EventPlanFocalPointId>("stage");
  const uploadUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storageUnavailableRef = useRef(false);

  const selectedEvent = EVENT_TYPES.find((event) => event.key === plan.eventType) ?? EVENT_TYPES[1];
  const selectedMood = EVENT_PLAN_MOODS.find((mood) => mood.id === plan.moodId) ?? EVENT_PLAN_MOODS[0];
  const eventDateInvalid = Boolean(plan.eventDate && plan.eventDate < localDateValue(new Date()));
  const canContinue = !eventDateInvalid;

  useEffect(() => {
    let serialized: string | null;
    try {
      serialized = window.localStorage.getItem(EVENT_PLAN_STORAGE_KEY);
    } catch (error) {
      console.error("[event-planner] Could not read the local draft", error);
      storageUnavailableRef.current = true;
      setSaveState("unavailable");
      setDraftLoaded(true);
      return;
    }

    if (serialized) {
      const restored = parseEventPlanDraft(serialized);
      if (restored) {
        setPlan(restored);
        setSelectedPointKind(restored.focalPoints.at(-1)?.kind ?? "stage");
        setDraftMessage("Your latest plan was restored from this browser.");
      } else {
        console.error("[event-planner] The saved local draft is invalid and was not restored.");
        setDraftMessage("An older saved plan could not be read. You can start a fresh plan.");
      }
    }
    setDraftLoaded(true);
  }, []);

  useEffect(() => {
    if (!draftLoaded || storageUnavailableRef.current) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(EVENT_PLAN_STORAGE_KEY, JSON.stringify(plan));
        storageUnavailableRef.current = false;
        setSaveState("saved");
        setDraftMessage(null);
      } catch (error) {
        console.error("[event-planner] Could not save the local draft", error);
        storageUnavailableRef.current = true;
        setSaveState("unavailable");
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draftLoaded, plan]);

  useEffect(
    () => () => {
      if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    },
    [],
  );

  function updatePlan<K extends keyof EventPlanDraft>(key: K, value: EventPlanDraft[K]) {
    setPlan((current) => ({ ...current, [key]: value }));
    setHandoffError(null);
  }

  function addFocalPoint(kind: EventPlanFocalPointId, x: number, y: number) {
    if (plan.focalPoints.length >= MAX_FOCAL_POINTS) {
      setFocalPointError(`Keep the room plan to ${MAX_FOCAL_POINTS} clear focal points.`);
      return;
    }
    setPlan((current) => ({
      ...current,
      focalPoints: [...current.focalPoints, { kind, x, y }],
    }));
    setFocalPointError(null);
  }

  function placeFocalPoint(event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.detail === 0 ? 50 : ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = event.detail === 0 ? 50 : ((event.clientY - bounds.top) / bounds.height) * 100;
    addFocalPoint(selectedPointKind, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose an image file to preview the venue.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Choose an image smaller than 8 MB.");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    uploadUrlRef.current = nextUrl;
    setUploadUrl(nextUrl);
    setUploadName(file.name);
    setUploadError(null);
  }

  function removePhoto() {
    if (uploadUrlRef.current) URL.revokeObjectURL(uploadUrlRef.current);
    uploadUrlRef.current = null;
    setUploadUrl(null);
    setUploadName(null);
    setUploadError(null);
  }

  function startFreshPlan() {
    if (!window.confirm("Start a fresh event plan? This clears the saved draft in this browser.")) return;
    setPlan(DEFAULT_EVENT_PLAN);
    removePhoto();
    setFocalPointError(null);
    setHandoffError(null);
    setDraftMessage(null);
    try {
      window.localStorage.removeItem(EVENT_PLAN_STORAGE_KEY);
    } catch (error) {
      console.error("[event-planner] Could not clear the local draft", error);
      storageUnavailableRef.current = true;
      setSaveState("unavailable");
    }
  }

  function continueToQuote() {
    if (!canContinue) {
      setHandoffError("Choose today or a future date, or clear the event date if it is not confirmed.");
      return;
    }
    const handoff = buildEventPlanHandoff(plan);
    try {
      window.sessionStorage.setItem(EVENT_PLAN_HANDOFF_STORAGE_KEY, JSON.stringify(handoff.details));
    } catch (error) {
      console.error("[event-planner] Could not prepare the quote handoff", error);
      setHandoffError("This browser could not carry your event details into the quote. Please try again or copy your brief into the quote form.");
      return;
    }
    navigate({ to: "/quote", search: handoff.search });
  }

  const selectedFocalPoint = EVENT_PLAN_FOCAL_POINTS.find(
    (point) => point.id === selectedPointKind,
  ) ?? EVENT_PLAN_FOCAL_POINTS[0];

  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main className="shell pb-20 pt-28 md:pt-36">
        <div className="flex flex-wrap items-start justify-between gap-5 border-b border-paper/10 pb-8">
          <div className="max-w-3xl">
            <p className="eyebrow">Plan Your Event · Randy Production</p>
            <h1 className="mt-4 max-w-[13ch] text-5xl leading-[0.94] md:text-7xl">Shape the room before the quote.</h1>
            <p className="section-lead mt-5 max-w-2xl">
              Capture the event’s creative direction and mark the moments that matter in the room.
              When you are ready, carry the brief into Get a Quote to choose production and see pricing.
            </p>
          </div>
          <div className="min-w-[220px] rounded-lg border border-paper/10 bg-ink/60 p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-mist">Your working draft</p>
            <p className="mt-2 text-sm text-paper" aria-live="polite">
              {saveState === "loading" || saveState === "saving"
                ? "Saving in this browser…"
                : saveState === "unavailable"
                  ? "Browser storage is unavailable."
                  : "Saved in this browser"}
            </p>
            {draftMessage ? <p className="mt-2 text-xs leading-relaxed text-mist">{draftMessage}</p> : null}
            <button
              type="button"
              onClick={startFreshPlan}
              className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs text-mist underline decoration-paper/20 underline-offset-4 hover:text-paper"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Start a fresh plan
            </button>
          </div>
        </div>

        <nav aria-label="Planner sections" className="mt-5 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.14em] text-mist sm:max-w-xl">
          <PlannerStep number="01" label="Event context" href="#event-details" />
          <PlannerStep number="02" label="Room concept" href="#room-concept" />
          <PlannerStep number="03" label="Creative brief" href="#event-intention" />
        </nav>

        <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)] lg:gap-10">
          <div className="min-w-0">
            <section id="event-details" className="scroll-mt-28 border-b border-paper/10 pb-9 pt-2">
              <SectionHeading
                number="01"
                title="Set the event context"
                description="Just enough context to make the creative brief useful. Production choices and pricing come later."
              />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <PlannerField label="What are we planning?">
                  <select
                    value={plan.eventType}
                    onChange={(event) => updatePlan("eventType", event.target.value as EventType)}
                    className={SELECT_CLASS}
                    aria-label="What are we planning?"
                  >
                    {EVENT_TYPES.map((event) => (
                      <option key={event.key} value={event.key} className="bg-void">
                        {event.label}
                      </option>
                    ))}
                  </select>
                </PlannerField>
                <PlannerField label="Working title" hint="Optional">
                  <Input
                    value={plan.title}
                    maxLength={100}
                    onChange={(event) => updatePlan("title", event.target.value)}
                    placeholder="e.g. Njeri & Kairo’s wedding"
                    aria-label="Working title"
                    className="h-12"
                  />
                </PlannerField>
                <PlannerField label="Expected guests">
                  <select
                    value={plan.guests}
                    onChange={(event) => updatePlan("guests", Number(event.target.value))}
                    className={SELECT_CLASS}
                    aria-label="Expected guests"
                  >
                    {GUEST_BANDS.map((band) => (
                      <option key={band.key} value={band.key} className="bg-void">
                        {band.label} guests
                      </option>
                    ))}
                  </select>
                </PlannerField>
                <PlannerField label="Event date" hint="Optional until confirmed">
                  <Input
                    type="date"
                    min={localDateValue(new Date())}
                    value={plan.eventDate}
                    onChange={(event) => updatePlan("eventDate", event.target.value)}
                    aria-label="Event date"
                    aria-invalid={eventDateInvalid}
                    className="h-12"
                  />
                  {eventDateInvalid ? (
                    <p className="mt-2 text-xs text-rose-200">Choose a future date or leave the date blank.</p>
                  ) : null}
                </PlannerField>
                <PlannerField label="Venue or area" hint="Optional if not booked yet">
                  <Input
                    value={plan.venueName}
                    maxLength={140}
                    onChange={(event) => updatePlan("venueName", event.target.value)}
                    placeholder="e.g. Nairobi Arboretum"
                    aria-label="Venue or area"
                    className="h-12"
                  />
                </PlannerField>
              </div>
            </section>

            <section id="room-concept" className="scroll-mt-28 border-b border-paper/10 py-9">
              <SectionHeading
                number="02"
                title="Shape the room direction"
                description="Use a venue photo or a real project image as a visual reference. Place a few points the production team should notice."
              />

              <div className="mt-6 overflow-hidden rounded-xl border border-paper/10 bg-ink/70">
                <button
                  type="button"
                  onClick={placeFocalPoint}
                  aria-label={`Add ${selectedFocalPoint.label} to the room concept. Click or press Enter to place it.`}
                  className="group relative block aspect-[16/10] w-full cursor-crosshair overflow-hidden bg-[#10141a] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-blue-2"
                >
                  <img
                    src={uploadUrl ?? INSPIRATION_IMAGE}
                    alt={uploadName ? `Your venue photo: ${uploadName}` : "Randy Production room styling inspiration"}
                    className="absolute inset-0 size-full object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, ${selectedMood.overlay}, rgba(4, 8, 14, 0.06) 40%, rgba(4, 8, 14, 0.68)), rgba(4, 8, 14, ${plan.overlayStrength / 500})`,
                    }}
                  />
                  {plan.focalPoints.map((point, index) => {
                    const label = EVENT_PLAN_FOCAL_POINTS.find((item) => item.id === point.kind)?.label ?? "Focus";
                    return (
                      <span
                        key={`${point.kind}-${index}`}
                        aria-hidden="true"
                        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      >
                        <span className="flex size-8 items-center justify-center rounded-full border border-white bg-blue text-xs font-semibold text-white shadow-[0_0_24px_rgba(47,107,255,0.8)]">
                          {index + 1}
                        </span>
                        <span className="mt-1 block whitespace-nowrap rounded bg-void/85 px-2 py-1 text-[9px] text-paper">
                          {label}
                        </span>
                      </span>
                    );
                  })}
                  <span className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 bg-gradient-to-t from-void/90 to-transparent p-4 sm:p-5">
                    <span>
                      <span className="block text-[10px] uppercase tracking-[0.18em] text-blue-2">
                        {uploadName ? "Your local venue photo" : "Project image · visual reference"}
                      </span>
                      <span className="mt-1 block text-sm font-medium text-paper">
                        {selectedMood.label}
                      </span>
                    </span>
                    <span className="rounded-full border border-white/30 bg-void/55 px-3 py-2 text-[10px] text-paper">
                      Click to place {selectedFocalPoint.label.toLowerCase()}
                    </span>
                  </span>
                </button>

                <div className="grid gap-5 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-paper">Venue photo</p>
                      <p className="mt-1 text-xs leading-relaxed text-mist">
                        Upload a photo to preview the direction. Your image stays on this device and is not attached to the quote.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="sr-only"
                        aria-label="Upload a venue photo"
                      />
                      <Button variant="line" onClick={() => fileInputRef.current?.click()} className="min-h-11">
                        <ImagePlus className="size-4" aria-hidden />
                        {uploadName ? "Change photo" : "Upload a photo"}
                      </Button>
                      {uploadName ? (
                        <Button variant="ghost" onClick={removePhoto} className="min-h-11">
                          <Trash2 className="size-4" aria-hidden />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {uploadName ? <p className="break-all text-xs text-mist">Selected: {uploadName}</p> : null}
                  {uploadError ? <p role="alert" className="text-xs text-rose-200">{uploadError}</p> : null}

                  <div>
                    <p className="text-xs font-medium text-paper">Overall feeling</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {EVENT_PLAN_MOODS.map((mood) => (
                        <button
                          key={mood.id}
                          type="button"
                          aria-pressed={plan.moodId === mood.id}
                          onClick={() => updatePlan("moodId", mood.id as EventPlanMoodId)}
                          className={cn(
                            "min-h-11 rounded-md border px-3 py-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2",
                            plan.moodId === mood.id
                              ? "border-blue-2/60 bg-blue/10 text-paper"
                              : "border-paper/10 bg-paper/[0.025] text-mist hover:border-paper/25 hover:text-paper",
                          )}
                        >
                          {mood.label}
                        </button>
                      ))}
                    </div>
                    <label className="mt-4 block text-xs text-mist">
                      Colour treatment · {plan.overlayStrength}%
                      <input
                        type="range"
                        min={20}
                        max={80}
                        value={plan.overlayStrength}
                        onChange={(event) => updatePlan("overlayStrength", Number(event.target.value))}
                        className="mt-2 block w-full accent-blue"
                        aria-label="Colour treatment strength"
                      />
                    </label>
                  </div>

                  <div className="border-t border-paper/10 pt-4">
                    <p className="text-xs font-medium text-paper">Room focal points</p>
                    <p className="mt-1 text-xs text-mist">Choose a marker, then click where it belongs on the image.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {EVENT_PLAN_FOCAL_POINTS.map((point) => (
                        <button
                          key={point.id}
                          type="button"
                          aria-pressed={selectedFocalPoint.id === point.id}
                          onClick={() => setSelectedPointKind(point.id)}
                          className={cn(
                            "min-h-10 rounded-full border px-3 text-xs transition-colors",
                            selectedFocalPoint.id === point.id
                              ? "border-blue-2/60 bg-blue/10 text-paper"
                              : "border-paper/10 text-mist hover:text-paper",
                          )}
                        >
                          {point.label}
                        </button>
                      ))}
                    </div>
                    {plan.focalPoints.length ? (
                      <ul className="mt-3 space-y-2">
                        {plan.focalPoints.map((point, index) => {
                          const label = EVENT_PLAN_FOCAL_POINTS.find((item) => item.id === point.kind)?.label ?? "Focus";
                          return (
                            <li key={`${point.kind}-${index}`} className="flex items-center justify-between gap-3 text-xs text-paper">
                              <span>{index + 1}. {label} · {Math.round(point.x)}% across, {Math.round(point.y)}% down</span>
                              <button
                                type="button"
                                onClick={() => updatePlan("focalPoints", plan.focalPoints.filter((_, itemIndex) => itemIndex !== index))}
                                aria-label={`Remove ${label} focal point ${index + 1}`}
                                className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-mist hover:bg-paper/5 hover:text-paper"
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    {focalPointError ? <p role="status" className="mt-2 text-xs text-amber-100">{focalPointError}</p> : null}
                    <button
                      type="button"
                      disabled={plan.focalPoints.length === 0}
                      onClick={() => updatePlan("focalPoints", [])}
                      className="mt-2 min-h-9 text-xs text-mist underline decoration-paper/20 underline-offset-4 hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear all focal points
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section id="event-intention" className="scroll-mt-28 py-9">
              <SectionHeading
                number="03"
                title="Give the team the why"
                description="A useful brief says what success feels like, not just what the room looks like."
              />
              <div className="mt-6 grid gap-5">
                <PlannerField
                  label="What should guests or viewers feel, remember or do?"
                  hint={`${plan.objective.length}/400`}
                >
                  <textarea
                    value={plan.objective}
                    maxLength={400}
                    onChange={(event) => updatePlan("objective", event.target.value)}
                    placeholder="For example: Make the launch feel confident and welcoming, and give guests one clear moment to remember."
                    className={`${TEXTAREA_CLASS} min-h-24`}
                    aria-label="Event goal"
                  />
                </PlannerField>
                <PlannerField
                  label="Creative direction and practical notes"
                  hint={`${plan.creativeNotes.length}/1,200`}
                >
                  <textarea
                    value={plan.creativeNotes}
                    maxLength={1200}
                    onChange={(event) => updatePlan("creativeNotes", event.target.value)}
                    placeholder="Mood, colours, schedule constraints, access, power, accessibility, weather plan, must-haves or things to avoid."
                    className={`${TEXTAREA_CLASS} min-h-36`}
                    aria-label="Creative direction and practical notes"
                  />
                </PlannerField>
              </div>
            </section>
          </div>

          <aside id="plan-summary" className="min-w-0 scroll-mt-28 lg:sticky lg:top-28">
            <div className="overflow-hidden rounded-xl border border-paper/12 bg-ink/80 shadow-[0_24px_70px_rgb(0_0_0/0.28)]">
              <div className="border-b border-paper/10 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-blue-2">Your creative brief</p>
                  <ImagePlus className="size-4 text-blue-2" aria-hidden />
                </div>
                <p className="mt-4 font-serif text-2xl tracking-[-0.04em] text-paper">
                  {plan.title || selectedEvent.label}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-mist">
                  A visual direction to discuss with the production team. No package is selected and no price is calculated here.
                </p>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <section>
                  <div className="mt-3 space-y-3">
                    <SummaryRow label="Occasion" value={selectedEvent.label} />
                    <SummaryRow label="Audience" value={`${GUEST_BANDS.find((band) => band.key === plan.guests)?.label ?? plan.guests} guests`} />
                    {plan.eventDate ? <SummaryRow label="Date" value={plan.eventDate} /> : null}
                    {plan.venueName ? <SummaryRow label="Venue / area" value={plan.venueName} /> : null}
                    <SummaryRow label="Visual direction" value={selectedMood.label} />
                    <SummaryRow label="Room focal points" value={`${plan.focalPoints.length}`} />
                  </div>
                </section>

                <div className="rounded-lg border border-blue-2/20 bg-blue/5 p-4">
                  <p className="text-xs font-medium text-paper">Ready to price the production?</p>
                  <p className="mt-2 text-xs leading-relaxed text-mist">
                    Get a Quote is where you choose package, services and production level, review the estimate,
                    and send your request.
                  </p>
                </div>

                {handoffError ? <p role="alert" className="text-xs leading-relaxed text-rose-200">{handoffError}</p> : null}
                <Button
                  variant="primary"
                  onClick={continueToQuote}
                  disabled={!draftLoaded}
                  className="min-h-12 w-full"
                >
                  Use this brief in Get a Quote
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                <p className="text-center text-[10px] leading-relaxed text-mist">
                  Event context and notes carry over. Your uploaded photo stays on this device.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function PlannerStep({ number, label, href }: { number: string; label: string; href: string }) {
  return (
    <a
      href={href}
      className="flex min-h-11 items-center gap-2 border-b border-paper/15 transition-colors hover:border-blue-2 hover:text-paper"
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
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist">{description}</p>
      </div>
    </div>
  );
}

function PlannerField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="text-mist">{label}</span>
      <span className="text-right text-paper">{value}</span>
    </div>
  );
}
