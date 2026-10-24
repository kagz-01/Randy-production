import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { SiteFooter, SiteNav } from "@/components/site/nav";
import { BeforeAfter } from "@/components/site/before-after";
import { SERVICES, WORK, type ServiceKey } from "@/data/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/work")({ component: WorkPage });

function WorkPage() {
  const [tab, setTab] = useState<ServiceKey | "all">("all");

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 pt-28 pb-20 md:px-8">
        <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Work</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">Five rooms. Five ways of seeing.</h1>
        <p className="mt-4 max-w-xl text-mist">
          Each tab is a different instrument — not a filter chip on the same grid.
        </p>

        <div className="mt-10 flex gap-2 overflow-x-auto no-scrollbar">
          <TabChip active={tab === "all"} onClick={() => setTab("all")}>
            All proof
          </TabChip>
          {SERVICES.map((s) => (
            <TabChip key={s.key} active={tab === s.key} onClick={() => setTab(s.key)}>
              {s.label}
            </TabChip>
          ))}
        </div>

        <div className="mt-10">
          {tab === "all" ? <AllGrid /> : null}
          {tab === "film" ? <FilmStrip /> : null}
          {tab === "brand" ? <BrandSpread /> : null}
          {tab === "stage" ? <StageArchive /> : null}
          {tab === "sound" ? <SoundDeck /> : null}
          {tab === "decor" ? <DecorLookbook /> : null}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function TabChip({
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
        "h-11 shrink-0 rounded-md px-4 text-xs uppercase tracking-[0.16em] transition-colors",
        active ? "bg-paper text-void" : "glass text-mist hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}

function AllGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {WORK.map((w) => (
        <article key={w.id} className="group overflow-hidden rounded-lg">
          <div className="relative aspect-[16/10] overflow-hidden">
            <img
              src={w.image}
              alt={w.title}
              className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
            <div className="absolute right-4 bottom-4 left-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">
                {w.service} · {w.year}
              </p>
              <h2 className="font-serif text-3xl">{w.title}</h2>
              <p className="text-sm text-paper/80">{w.outcome}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function FilmStrip() {
  const shots = WORK.filter((w) => w.service === "film" || w.service === "brand");
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex min-w-max gap-0 rounded-lg bg-ink p-3">
        {shots.flatMap((w) =>
          w.stills.map((src, i) => (
            <div key={`${w.id}-${i}`} className="group relative w-[280px] shrink-0 md:w-[360px]">
              <div className="relative mx-2 aspect-[16/9] overflow-hidden rounded-sm">
                <img
                  src={src}
                  alt={w.title}
                  className="size-full object-cover transition-transform duration-[1.2s] group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-paper/70">
                  <span>24fps</span>
                  <span>0{i + 1}</span>
                </div>
              </div>
              <p className="mt-2 px-2 font-serif text-lg">{w.title}</p>
              <p className="px-2 text-xs text-mist">{w.logline}</p>
            </div>
          )),
        )}
      </div>
    </div>
  );
}

function BrandSpread() {
  const piece = WORK.find((w) => w.service === "brand") ?? WORK[0];
  return (
    <div className="grid gap-6 md:grid-cols-12">
      <div className="relative md:col-span-7">
        <img src={piece.image} alt={piece.title} className="w-full rounded-lg object-cover" />
      </div>
      <div className="flex flex-col justify-between md:col-span-5 md:py-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-blue-2">Campaign</p>
          <h2 className="mt-3 font-serif text-5xl">{piece.title}</h2>
          <p className="mt-6 text-lg leading-relaxed text-paper/80">{piece.logline}</p>
        </div>
        <p className="mt-8 font-serif text-2xl text-blue-2">{piece.outcome}</p>
      </div>
    </div>
  );
}

function StageArchive() {
  const rows = WORK.filter((w) => w.service === "stage" || w.service === "decor");
  return (
    <div className="space-y-4">
      {rows.map((w) => (
        <article key={w.id} className="glass grid overflow-hidden rounded-lg md:grid-cols-[220px_1fr]">
          <img src={w.image} alt="" className="h-40 w-full object-cover md:h-full" />
          <div className="p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">{w.year}</p>
            <h2 className="font-serif text-3xl">{w.title}</h2>
            <p className="mt-2 text-sm text-mist">{w.logline}</p>
            <p className="mt-4 text-sm text-paper">{w.outcome}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function SoundDeck() {
  const gigs = WORK.filter((w) => w.service === "sound" || w.service === "stage");
  return (
    <div className="grid gap-4">
      {gigs.map((w, gi) => (
        <article key={w.id} className="glass overflow-hidden rounded-lg p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">{w.year} · live mix</p>
              <h2 className="font-serif text-3xl">{w.title}</h2>
            </div>
            <p className="text-sm text-mist">{w.outcome}</p>
          </div>
          <div className="mt-6 flex h-24 items-end gap-1">
            {Array.from({ length: 48 }).map((_, i) => (
              <span
                key={i}
                className="wave-bar flex-1 rounded-sm bg-blue"
                style={{
                  height: `${18 + ((i * 17 + gi * 13) % 80)}%`,
                  animationDelay: `${(i % 12) * 80}ms`,
                  opacity: 0.45 + ((i + gi) % 5) * 0.1,
                }}
              />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function DecorLookbook() {
  return (
    <div className="grid gap-10">
      <BeforeAfter
        before="/images/venue-before.jpg"
        after="/images/venue-after.jpg"
        beforeLabel="Undressed"
        afterLabel="Meridian treatment"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {WORK.filter((w) => w.service === "decor").map((w) => (
          <article key={w.id}>
            <img src={w.image} alt={w.title} className="aspect-[16/10] w-full rounded-lg object-cover" />
            <h2 className="mt-3 font-serif text-2xl">{w.title}</h2>
            <p className="text-sm text-mist">{w.logline}</p>
          </article>
        ))}
      </div>
      <Link to="/look" className="text-sm text-blue-2 underline-offset-4 hover:underline">
        Overlay this treatment on your venue →
      </Link>
    </div>
  );
}
