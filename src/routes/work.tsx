import { useMemo, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/nav";
import { SERVICES, WORK, type ServiceKey } from "@/data/catalog";

export const Route = createFileRoute("/work")({
  validateSearch: (search: Record<string, unknown>): { service?: ServiceKey } => {
    const service = SERVICES.find(({ key }) => key === search.service)?.key;
    return service ? { service } : {};
  },
  component: WorkPage,
});

function WorkPage() {
  const { service: activeService } = Route.useSearch();
  const navigate = useNavigate();
  const serviceFilters = useMemo(
    () => SERVICES.filter((service) => WORK.some((story) => story.service === service.key)),
    [],
  );
  const visibleStories = useMemo(
    () => (activeService ? WORK.filter((story) => story.service === activeService) : WORK),
    [activeService],
  );
  const photoCount = WORK.reduce((count, story) => count + story.stills.length + 1, 0);

  return (
    <div className="min-h-dvh bg-void text-paper">
      <SiteNav />
      <main className="shell pb-20 pt-28 md:pt-32">
        <header className="max-w-3xl">
          <p className="eyebrow text-blue-2">The portfolio · {photoCount} photographs · {WORK.length} stories</p>
          <h1 className="mt-3 max-w-[16ch] text-[2.8rem] leading-[0.88] tracking-[-0.075em] text-paper md:text-[5rem]">
            Real moments, kept in full.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-mist md:text-lg">
            Browse the complete catalog as occasion-led stories. Every photograph stays in its original frame, and
            each description sticks to what the images show.
          </p>
        </header>

        <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filter portfolio by service">
          <ServiceFilter
            active={!activeService}
            onClick={() => void navigate({ to: "/work", search: { service: undefined } })}
          >
            All stories ({WORK.length})
          </ServiceFilter>
          {serviceFilters.map((service) => {
            const count = WORK.filter((story) => story.service === service.key).length;
            return (
              <ServiceFilter
                key={service.key}
                active={activeService === service.key}
                onClick={() => void navigate({ to: "/work", search: { service: service.key } })}
              >
                {service.label} ({count})
              </ServiceFilter>
            );
          })}
        </nav>

        <section className="mt-8" aria-label="Portfolio stories">
          {visibleStories.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleStories.map((story, index) => {
                const imageCount = story.stills.length + 1;
                const serviceLabel = SERVICES.find((service) => service.key === story.service)?.label ?? story.service;

                return (
                  <Link
                    key={story.id}
                    to="/cases/$slug"
                    params={{ slug: story.id }}
                    className="group overflow-hidden rounded-xl border border-paper/10 bg-ink/60 transition-colors hover:border-blue/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-2"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#071119]">
                      <img
                        src={story.image}
                        alt={`${story.title} — ${story.event}`}
                        loading={index < 3 ? "eager" : "lazy"}
                        className="size-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                      <span className="absolute bottom-3 left-3 rounded-full border border-paper/20 bg-void/75 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-paper/85 backdrop-blur">
                        {imageCount} photographs
                      </span>
                    </div>
                    <div className="space-y-3 p-4 md:p-5">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-blue-2">{serviceLabel} · {story.event}</p>
                      <h2 className="font-serif text-2xl leading-tight text-paper">{story.title}</h2>
                      <p className="text-sm leading-relaxed text-mist">{story.logline}</p>
                      <div className="flex items-center justify-between border-t border-paper/10 pt-3 text-[10px] uppercase tracking-[0.16em]">
                        <span className="text-mist">Open story</span>
                        <span className="text-blue-2 transition-transform group-hover:translate-x-1" aria-hidden>
                          →
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="rounded-xl border border-paper/10 bg-ink/60 p-6 text-mist">
              There are no catalog stories in this service yet.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function ServiceFilter({
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
      className={`rounded-full border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors ${
        active
          ? "border-paper bg-paper text-void"
          : "border-paper/15 bg-paper/[0.03] text-mist hover:border-paper/35 hover:text-paper"
      }`}
    >
      {children}
    </button>
  );
}
