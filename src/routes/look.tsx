import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { SiteFooter, SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/look")({ component: LookPage });

const TREATMENTS = [
  { id: "gala", label: "Black Gala", overlay: "/images/venue-after.jpg", blend: "soft-light" as const },
  { id: "lounge", label: "Sable Lounge", overlay: "/images/work-decor.jpg", blend: "overlay" as const },
  { id: "vows", label: "Rooftop vows", overlay: "/images/work-wedding.jpg", blend: "soft-light" as const },
  { id: "stage", label: "Meridian stage", overlay: "/images/hero-gala.jpg", blend: "overlay" as const },
];

function LookPage() {
  const [base, setBase] = useState("/images/venue-before.jpg");
  const [treatment, setTreatment] = useState(TREATMENTS[0]);
  const [opacity, setOpacity] = useState(62);
  const [lights, setLights] = useState<{ x: number; y: number }[]>([
    { x: 22, y: 38 },
    { x: 74, y: 42 },
  ]);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBase(url);
  }

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 pt-28 pb-20 md:px-8">
        <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Look-Through</p>
        <h1 className="mt-3 max-w-3xl font-serif text-5xl md:text-6xl">
          Dress the photograph before we dress the room.
        </h1>
        <p className="mt-4 max-w-xl text-mist">
          Upload the empty venue. Pick a treatment. Drag the blue fixtures. This is the conversation — not a PDF of chairs.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div
            className="relative aspect-[16/10] overflow-hidden rounded-lg bg-ink"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setLights((ls) => [...ls, { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }]);
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
            <p className="absolute bottom-3 left-3 rounded-sm glass px-2 py-1 text-[10px] uppercase tracking-[0.16em]">
              Tap to place a fixture
            </p>
          </div>

          <aside className="glass rounded-lg p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Treatment</p>
            <div className="mt-3 grid gap-2">
              {TREATMENTS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTreatment(t)}
                  className={cn(
                    "rounded-md px-3 py-3 text-left text-sm",
                    treatment.id === t.id ? "bg-paper text-void" : "bg-paper/5 text-paper hover:bg-paper/10",
                  )}
                >
                  {t.label}
                </button>
              ))}
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
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <div className="mt-6 grid gap-2">
              <Button variant="paper" onClick={() => fileRef.current?.click()}>
                Upload venue photo
              </Button>
              <Button variant="ghost" onClick={() => setLights([])}>
                Clear fixtures
              </Button>
              <Link to="/quote">
                <Button className="w-full">Quote this treatment</Button>
              </Link>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
