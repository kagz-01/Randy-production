import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { SiteNav } from "@/components/site/nav";
import { BeforeAfter } from "@/components/site/before-after";
import { GlassCard, ParallaxImage, Reveal } from "@/components/site/fx";
import { SERVICES, WORK, type ServiceKey } from "@/data/catalog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/work")({ component: WorkPage });

function WorkPage() {
  const [tab, setTab] = useState<ServiceKey | "all">("all");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(WORK[0]?.id ?? null);

  const serviceLabelMap = useMemo(
    () => Object.fromEntries(SERVICES.map((service) => [service.key, service.label])),
    [],
  );

  const visibleWorks = useMemo(
    () =>
      WORK.filter((item) => {
        return tab === "all" || item.service === tab;
      }),
    [tab],
  );

  useEffect(() => {
    if (!visibleWorks.some((item) => item.id === selectedWorkId)) {
      setSelectedWorkId(visibleWorks[0]?.id ?? null);
    }
  }, [selectedWorkId, visibleWorks]);

  const featuredWork = visibleWorks.find((item) => item.id === selectedWorkId) ?? visibleWorks[0] ?? null;
  const selectedService = tab === "all" ? null : SERVICES.find((service) => service.key === tab) ?? null;

  return (
    <div className="min-h-dvh">
      <SiteNav />
      <main className="w-full px-3 pb-20 pt-28 md:px-5 md:pt-32">
        <Reveal>
          <div className="max-w-4xl">
            <p className="eyebrow text-blue-2">Selected work</p>
            <h1 className="mt-2 max-w-[20ch] text-[2.1rem] leading-[0.76] tracking-[-0.08em] text-paper md:max-w-[25ch] md:text-[3.6rem]">
              Curated stories for rooms, rituals and live moments.
            </h1>
          </div>
        </Reveal>

        <div className="mt-5 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            <TabChip active={tab === "all"} onClick={() => setTab("all")}>
              All stories
            </TabChip>
            {SERVICES.map((s) => (
              <TabChip key={s.key} active={tab === s.key} onClick={() => setTab(s.key)}>
                {s.label}
              </TabChip>
            ))}
          </div>

          <div className="min-h-4 pl-0.5">
            {selectedService ? (
              <p className="text-[9px] uppercase tracking-[0.22em] text-mist">
                <span className="text-paper">Focused on</span> {selectedService.label}
              </p>
            ) : (
              <p className="text-[9px] uppercase tracking-[0.22em] text-mist">All stories in view</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          {featuredWork ? (
            <Reveal>
              <div className="mb-8">
                <Link
                  to="/cases/$slug"
                  params={{ slug: featuredWork.id }}
                  onClick={() => setSelectedWorkId(featuredWork.id)}
                  className="group relative block overflow-hidden bg-ink/60 transition-opacity duration-200 hover:opacity-95"
                  aria-label={`View ${featuredWork.title}`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden md:aspect-[16/10]">
                    <img
                      src={featuredWork.image}
                      alt={featuredWork.title}
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-void/80 via-void/15 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 md:p-5">
                      <div className="max-w-[80%]">
                        <p className="text-[6px] uppercase tracking-[0.22em] text-blue-2">Featured</p>
                        <h2 className="mt-1.5 text-[2rem] leading-[0.9] text-paper md:text-[3.2rem]">{featuredWork.title}</h2>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full border border-paper/20 bg-void/60 px-2 py-1 text-[6px] uppercase tracking-[0.2em] text-paper">
                        View
                        <span aria-hidden>→</span>
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-paper/10 pt-3 pb-1">
                  <div className="flex flex-wrap gap-1 text-[5px] uppercase tracking-[0.14em] text-mist">
                    <span className="rounded-full border border-paper/15 bg-paper/5 px-1.5 py-0.5">
                      {serviceLabelMap[featuredWork.service] ?? featuredWork.service}
                    </span>
                    <span className="rounded-full border border-paper/15 bg-paper/5 px-1.5 py-0.5">{featuredWork.event}</span>
                    <span className="rounded-full border border-paper/15 bg-paper/5 px-1.5 py-0.5">{featuredWork.year}</span>
                  </div>

                  <p className="text-[9px] uppercase tracking-[0.18em] text-paper/75">{featuredWork.outcome}</p>
                </div>
              </div>
            </Reveal>
          ) : null}

          {visibleWorks.filter((work) => work.id !== selectedWorkId).length > 0 ? (
            <PortfolioGrid
              works={visibleWorks.filter((work) => work.id !== selectedWorkId)}
              serviceLabelMap={serviceLabelMap}
              selectedWorkId={selectedWorkId}
              onSelectWork={setSelectedWorkId}
            />
          ) : (
            <EmptyState />
          )}
        </div>
      </main>
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
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full border px-2.5 text-[8px] font-medium uppercase tracking-[0.18em] transition-all duration-200 active:scale-[0.98]",
        active
          ? "border-paper/10 bg-paper text-void shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          : "border-paper/10 bg-paper/[0.02] text-mist hover:border-paper/15 hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}

function PortfolioGrid({
  works,
  serviceLabelMap,
  selectedWorkId,
  onSelectWork,
}: {
  works: typeof WORK;
  serviceLabelMap: Record<string, string>;
  selectedWorkId: string | null;
  onSelectWork: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:gap-3 xl:grid-cols-3">
      {works.map((w, i) => {
        const isSelected = selectedWorkId === w.id;

        return (
          <Reveal key={w.id} delay={Math.min(i, 6) * 0.05}>
            <Link
              to="/cases/$slug"
              params={{ slug: w.id }}
              onClick={() => onSelectWork(w.id)}
              className={cn(
                "group block overflow-hidden rounded-lg border bg-ink/60 transition-all duration-300 hover:-translate-y-1 hover:border-blue/40",
                isSelected ? "border-blue/50 ring-1 ring-blue/40" : "border-paper/10 opacity-80 hover:opacity-100",
              )}
            >
              <article className="relative overflow-hidden">
                <div className="relative aspect-[4/5] overflow-hidden sm:aspect-16/10">
                  <img
                    src={w.image}
                    alt={w.title}
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-void via-void/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                    <div className="flex items-center justify-between gap-2 rounded-full border border-paper/20 bg-void/65 px-2 py-1 backdrop-blur-sm sm:px-2.5 sm:py-1.5">
                      <span className="text-[8px] uppercase tracking-[0.18em] text-blue-2 sm:text-[10px]">
                        {serviceLabelMap[w.service] ?? w.service}
                      </span>
                      <span className="text-[8px] uppercase tracking-[0.18em] text-mist sm:text-[10px]">{w.year}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 bg-ink/80 p-2.5 sm:p-3">
                  <div className="flex items-center justify-between gap-2 text-[7px] uppercase tracking-[0.16em] text-mist sm:text-[8px]">
                    <span className="truncate">{w.event}</span>
                    <span className="text-blue-2">View</span>
                  </div>

                  <h2 className="text-base leading-tight text-paper sm:text-lg">{w.title}</h2>

                  <p className="text-[9px] leading-relaxed text-mist">{w.logline}</p>

                  <div className="flex items-center justify-between gap-2 border-t border-paper/10 pt-1.5">
                    <p className="text-[8px] font-medium uppercase tracking-[0.18em] text-blue-2 sm:text-[9px]">
                      {w.outcome}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-[0.18em] text-paper sm:text-[9px]">
                      Story
                      <span aria-hidden>→</span>
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}

function FeaturedWorkCard({ works }: { works: typeof WORK }) {
  const featured = works[0] ?? WORK[0];
  const serviceSummary = Array.from(new Set(works.map((item) => item.service))).slice(0, 3).join(" • ");

  return (
    <div className="mb-10 grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
      <Reveal>
        <article className="group relative overflow-hidden rounded-2xl border border-paper/10 bg-ink/50">
          <div className="relative aspect-16/11 overflow-hidden">
            <img
              src={featured.image}
              alt={featured.title}
              className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-linear-to-t from-void via-void/30 to-transparent" />
            <div className="absolute left-4 top-4 rounded-full border border-paper/20 bg-void/60 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-blue-2">
              Featured case
            </div>
          </div>
        </article>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="flex h-full flex-col justify-between rounded-2xl border border-paper/10 bg-ink/50 p-5 md:p-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-blue-2">{featured.service}</p>
            <h2 className="mt-3 text-3xl leading-tight text-paper md:text-4xl">{featured.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-mist">
              <span className="rounded-full border border-paper/20 px-2 py-1">{featured.event}</span>
              <span className="rounded-full border border-paper/20 px-2 py-1">{featured.year}</span>
            </div>
          </div>

          <p className="mt-6 text-base leading-relaxed text-mist">{featured.logline}</p>

          <div className="mt-6 space-y-3 border-t border-paper/10 pt-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-2">Result</p>
            <p className="text-lg text-paper">{featured.outcome}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-mist">{serviceSummary}</p>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-paper/20 bg-ink/40 p-8 text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-blue-2">No matches</p>
      <h2 className="mt-3 text-2xl leading-tight text-paper">No work in this event category yet.</h2>
      <p className="mt-3 text-mist">Switch to another service lane or pick a different event type.</p>
    </div>
  );
}

function FilmStrip() {
  const shots = WORK.filter((w) => w.service === "film" || w.service === "brand");
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="glass flex min-w-max gap-0 rounded-lg p-3">
        {shots.flatMap((w) =>
          w.stills.map((src, i) => (
            <div key={`${w.id}-${i}`} className="group relative w-70 shrink-0 md:w-90">
              <div className="relative mx-2 aspect-video overflow-hidden rounded-sm">
                <img
                  src={src}
                  alt={w.title}
                  className="size-full object-cover transition-transform duration-[1.2s] group-hover:scale-110"
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-paper/70">
                  <span className="glass-chip rounded-sm px-1.5 py-0.5">24fps</span>
                  <span className="glass-chip rounded-sm px-1.5 py-0.5">0{i + 1}</span>
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
      <Reveal className="md:col-span-7">
        <div className="relative overflow-hidden rounded-lg">
          <ParallaxImage src={piece.image} alt={piece.title} className="aspect-16/11 w-full" strength={32} />
        </div>
      </Reveal>
      <Reveal delay={0.1} className="flex flex-col justify-between md:col-span-5 md:py-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-blue-2">Campaign</p>
          <h2 className="mt-3 font-serif text-5xl">{piece.title}</h2>
          <p className="mt-6 text-lg leading-relaxed text-paper/80">{piece.logline}</p>
        </div>
        <p className="mt-8 font-serif text-2xl text-blue-2">{piece.outcome}</p>
      </Reveal>
    </div>
  );
}

function StageArchive() {
  const rows = WORK.filter((w) => w.service === "stage" || w.service === "decor");
  return (
    <div className="space-y-4">
      {rows.map((w, i) => (
        <Reveal key={w.id} delay={Math.min(i, 4) * 0.05}>
          <GlassCard className="grid overflow-hidden md:grid-cols-[220px_1fr]">
            <img src={w.image} alt="" className="h-40 w-full object-cover md:h-full" />
            <div className="p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">{w.year}</p>
              <h2 className="font-serif text-3xl">{w.title}</h2>
              <p className="mt-2 text-sm text-mist">{w.logline}</p>
              <p className="mt-4 text-sm text-paper">{w.outcome}</p>
            </div>
          </GlassCard>
        </Reveal>
      ))}
    </div>
  );
}

function SoundDeck() {
  const gigs = WORK.filter((w) => w.service === "sound" || w.service === "stage");
  return (
    <div className="grid gap-4">
      {gigs.map((w, gi) => (
        <Reveal key={w.id} delay={Math.min(gi, 4) * 0.05}>
          <GlassCard className="overflow-hidden p-5 md:p-6">
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
          </GlassCard>
        </Reveal>
      ))}
    </div>
  );
}

function DecorLookbook() {
  return (
    <div className="grid gap-10">
      <Reveal>
        <BeforeAfter
          before="/catalog/decor/IMG_0953.webp"
          after="/catalog/wedding/GRA08375.webp"
          beforeLabel="Undressed"
          afterLabel="Meridian treatment"
        />
      </Reveal>
      <div className="grid gap-4 md:grid-cols-2">
        {WORK.filter((w) => w.service === "decor").map((w, i) => (
          <Reveal key={w.id} delay={i * 0.06}>
            <article>
              <div className="overflow-hidden rounded-lg">
                <ParallaxImage src={w.image} alt={w.title} className="aspect-16/10 w-full" strength={24} />
              </div>
              <h2 className="mt-3 font-serif text-2xl">{w.title}</h2>
              <p className="text-sm text-mist">{w.logline}</p>
            </article>
          </Reveal>
        ))}
      </div>
      <Link to="/look" className="text-sm text-blue-2 underline-offset-4 hover:underline">
        Overlay this treatment on your venue →
      </Link>
    </div>
  );
}
