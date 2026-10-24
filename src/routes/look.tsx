import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Reveal } from "@/components/site/fx";
import { Button } from "@/components/ui/button";
import { EVENT_TYPES, PACKAGES, type EventType, type ServiceKey } from "@/data/catalog";
import { cn, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/look")({ component: LookPage });

const TREATMENTS = [
  { id: "gala", label: "Black gala", overlay: "/catalog/concert/GRA00269.webp", blend: "soft-light" as const },
  { id: "lounge", label: "Sable lounge · sherehe", overlay: "/catalog/decor/_MG_9907.webp", blend: "overlay" as const },
  { id: "vows", label: "White wedding · rooftop", overlay: "/catalog/wedding/GRA08375.webp", blend: "soft-light" as const },
  { id: "ruracio", label: "Ruracio · garden tents", overlay: "/catalog/decor/IMG_0953.webp", blend: "soft-light" as const },
  { id: "stage", label: "Meridian stage · corporate", overlay: "/catalog/concert/GRA00392.webp", blend: "overlay" as const },
];

const DEFAULT_EVENT = EVENT_TYPES[5];
const DEFAULT_PACKAGE = PACKAGES[1];

function LookPage() {
  const [base, setBase] = useState("/catalog/decor/IMG_0953.webp");
  const [treatment, setTreatment] = useState(TREATMENTS[0]);
  const [opacity, setOpacity] = useState(62);
  const [eventKey, setEventKey] = useState<EventType>(DEFAULT_EVENT.key);
  const [packageId, setPackageId] = useState(DEFAULT_PACKAGE.id);
  const [guestCount, setGuestCount] = useState(220);
  const [notes, setNotes] = useState("Warm lighting, neutral drape, soft blue glow, and a seated audience flow.");
  const [lights, setLights] = useState<{ x: number; y: number }[]>([
    { x: 22, y: 38 },
    { x: 74, y: 42 },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedEvent = EVENT_TYPES.find((event) => event.key === eventKey) ?? DEFAULT_EVENT;
  const selectedPackage = PACKAGES.find((pkg) => pkg.id === packageId) ?? DEFAULT_PACKAGE;

  const estimate = useMemo(() => {
    const guestFactor =
      guestCount <= 80 ? 0.7 : guestCount <= 180 ? 0.95 : guestCount <= 320 ? 1.15 : guestCount <= 600 ? 1.42 : 1.7;
    const packageFactor =
      selectedPackage.id === "pkg_look_decor"
        ? 0.8
        : selectedPackage.id === "pkg_floor_stage"
          ? 1.2
          : selectedPackage.id === "pkg_black_gala"
            ? 1.55
            : selectedPackage.id === "pkg_harusi"
              ? 1.45
              : selectedPackage.id === "pkg_brand_drop"
                ? 1.5
                : selectedPackage.id === "pkg_campaign"
                  ? 1.18
                  : 1.1;
    const treatmentBoost =
      treatment.id === "gala" ? 1.18 : treatment.id === "stage" ? 1.14 : treatment.id === "lounge" ? 1.08 : 1.05;

    return Math.round(selectedEvent.base * guestFactor * packageFactor * treatmentBoost);
  }, [guestCount, selectedEvent.base, selectedPackage.id, treatment.id]);

  const packageServices = selectedPackage.services.join(" • ");

  function onFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBase(url);
  }

  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main className="shell pt-28 pb-20">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.28em] text-blue-2">Look-Through</p>
          <h1 className="mt-3 max-w-[12ch] text-4xl md:text-5xl">
            Dress the room before we build it.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-mist md:text-lg">
            Upload a venue, choose the event type, and shape the concept. This is the practical pre-visualization step
            before the floor plan, décor, and event production are confirmed.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_360px]">
          <div
            className="relative aspect-16/10 overflow-hidden rounded-lg bg-ink shadow-[0_0_0_1px_rgb(243_241_234/0.12),0_24px_48px_rgb(0_0_0/0.35)]"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setLights((ls) => [
                ...ls,
                { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 },
              ]);
            }}
          >
            <img src={base} alt="Venue" className="absolute inset-0 size-full object-cover" />
            <img
              src={treatment.overlay}
              alt=""
              className="absolute inset-0 size-full object-cover"
              style={{ opacity: opacity / 100, mixBlendMode: treatment.blend }}
            />
            {lights.map((l, i) => (
              <span
                key={`${l.x}-${l.y}-${i}`}
                className="pointer-events-none absolute size-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${l.x}%`,
                  top: `${l.y}%`,
                  background: "radial-gradient(circle, rgb(47 107 255 / 0.55), transparent 68%)",
                }}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-linear-to-t from-void via-void/30 to-transparent p-3">
              <p className="glass-chip rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
                Tap to place a fixture
              </p>
              <p className="glass-chip rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
                {treatment.label}
              </p>
            </div>
          </div>

          <aside className="glass-rail h-fit">
            <Reveal>
              <div className="glass-strong relative overflow-hidden rounded-lg p-5">
                <span aria-hidden className="glass-sheen" />
                <div className="relative space-y-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Concept setup</p>
                    <div className="mt-3 grid gap-2">
                      {TREATMENTS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTreatment(t)}
                          className={cn(
                            "rounded-md px-3 py-3 text-left text-sm transition-colors",
                            treatment.id === t.id ? "bg-paper text-void" : "glass-chip text-paper hover:bg-paper/10",
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-mist">Event type</label>
                    <select
                      value={eventKey}
                      onChange={(e) => setEventKey(e.target.value as EventType)}
                      className="mt-2 w-full rounded-md border border-paper/15 bg-void px-3 py-2.5 text-sm text-paper outline-none"
                    >
                      {EVENT_TYPES.map((event) => (
                        <option key={event.key} value={event.key} className="bg-void text-paper">
                          {event.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-mist">Guest count</label>
                    <input
                      type="range"
                      min={50}
                      max={900}
                      step={10}
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="mt-2 w-full accent-blue"
                    />
                    <div className="mt-2 flex items-center justify-between text-xs text-mist">
                      <span>50</span>
                      <span className="font-medium text-paper">{guestCount} guests</span>
                      <span>900+</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Package</p>
                    <div className="mt-3 grid gap-2">
                      {PACKAGES.map((pkg) => (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setPackageId(pkg.id)}
                          className={cn(
                            "rounded-md border px-3 py-2 text-left transition-colors",
                            packageId === pkg.id
                              ? "border-blue bg-blue/10 text-paper"
                              : "border-paper/10 bg-void/40 text-mist hover:text-paper",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{pkg.name}</span>
                          </div>
                          <p className="mt-1 text-xs text-mist">{pkg.blurb}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="mt-6 block text-[11px] uppercase tracking-[0.2em] text-mist">
                    Overlay {opacity}%
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="mt-2 w-full accent-blue"
                    />
                  </label>

                  <div className="rounded-md border border-paper/10 bg-void/40 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Estimated scope</p>
                    <div className="mt-3 space-y-2 text-sm text-paper">
                      <p>{selectedEvent.label}</p>
                      <p>{selectedPackage.name}</p>
                      <p>{packageServices}</p>
                    </div>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onFile(e.target.files?.[0])}
                  />

                  <div className="grid gap-2">
                    <Button variant="paper" onClick={() => fileRef.current?.click()}>
                      Upload venue photo
                    </Button>
                    <Button variant="ghost" onClick={() => setLights([])}>
                      Clear fixtures
                    </Button>
                    <Link to="/quote">
                      <Button className="w-full">Request this concept</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          </aside>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-paper/10 bg-ink/50 p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">Creative brief</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-3 h-32 w-full resize-none rounded-md border border-paper/10 bg-void/60 p-3 text-sm text-paper outline-none"
            />
          </div>

          <div className="rounded-lg border border-paper/10 bg-ink/50 p-5">
            <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">Proposal summary</p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-mist">Event</span>
                <span className="text-paper">{selectedEvent.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">Guests</span>
                <span className="text-paper">{guestCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-mist">Package</span>
                <span className="text-paper">{selectedPackage.name}</span>
              </div>
              <div className="border-t border-paper/10 pt-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Estimated investment</p>
                <p className="mt-2 text-4xl font-serif text-paper">{formatMoney(estimate)}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
