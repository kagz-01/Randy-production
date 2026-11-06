import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/site/nav";
import { getPublicTransparency } from "@/lib/server/studio";

export const Route = createFileRoute("/transparency")({ component: TransparencyPage });

type PublicStatus = "booked" | "production" | "delivered";

type PublicProduction = {
  id: string;
  title: string;
  event_type: string;
  status: PublicStatus;
  event_date: string | null;
};

const STATUS_GROUPS: {
  status: PublicStatus;
  title: string;
  description: string;
  newestFirst: boolean;
}[] = [
  {
    status: "booked",
    title: "Booked",
    description: "Events confirmed for production.",
    newestFirst: false,
  },
  {
    status: "production",
    title: "In production",
    description: "Work currently being prepared or delivered.",
    newestFirst: false,
  },
  {
    status: "delivered",
    title: "Delivered",
    description: "Completed projects approved to share.",
    newestFirst: true,
  },
];

function TransparencyPage() {
  const [productions, setProductions] = useState<PublicProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const groupedProductions = STATUS_GROUPS.map((group) => ({
    ...group,
    productions: productions
      .filter((production) => production.status === group.status)
      .sort((a, b) => {
        if (!a.event_date) return b.event_date ? 1 : 0;
        if (!b.event_date) return -1;
        const order = a.event_date.localeCompare(b.event_date);
        return group.newestFirst ? -order : order;
      }),
  }));
  const hasPublicUpdates = groupedProductions.some((group) => group.productions.length > 0);

  useEffect(() => {
    let active = true;
    getPublicTransparency()
      .then((rows) => {
        if (active) setProductions(rows);
      })
      .catch((cause) => {
        console.error("[transparency] Could not load public production updates", cause);
        if (active) setError("Production updates are temporarily unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="shell pb-20 pt-32">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-2">Studio Updates · Public view</p>
        <div className="mt-4 max-w-3xl">
          <h1 className="font-serif text-5xl leading-tight text-paper md:text-7xl">What is on the production board.</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-mist">
            See selected events that are booked, in production, or delivered. A project appears here only when it has
            been approved for public sharing.
          </p>
        </div>

        <section className="mt-12 border-t border-paper/10 pt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">Public projects</p>
              <h2 className="mt-1 text-xl font-medium text-paper">Project updates</h2>
            </div>
            <p className="text-xs text-mist">Read-only · status and dates from the production board</p>
          </div>

          {error ? <p role="alert" className="mt-5 text-sm text-red-300">{error}</p> : null}
          {loading ? <p role="status" className="mt-5 text-sm text-mist">Loading public updates…</p> : null}
          {!loading && !error && !hasPublicUpdates ? (
            <div className="mt-5 rounded-xl border border-paper/10 bg-ink/60 p-6 text-sm text-mist">
              There are no approved updates to share right now. New listings appear when a project is cleared for public viewing.
            </div>
          ) : null}
          {!loading && !error
            ? groupedProductions.map((group) =>
                group.productions.length ? (
                  <section key={group.status} className="mt-8" aria-labelledby={`public-${group.status}`}>
                    <div className="border-b border-paper/10 pb-3">
                      <h3 id={`public-${group.status}`} className="text-lg font-medium text-paper">{group.title}</h3>
                      <p className="mt-1 text-sm text-mist">{group.description}</p>
                    </div>
                    <ul className="divide-y divide-paper/10">
                      {group.productions.map((production) => (
                        <li key={production.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div>
                            <p className="font-medium text-paper">{production.title}</p>
                            <p className="mt-1 text-sm capitalize text-mist">{production.event_type.replaceAll("_", " ")}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            <span className="rounded-full border border-blue/25 bg-blue/10 px-2.5 py-1 text-blue-2">
                              {group.title}
                            </span>
                            <time dateTime={production.event_date ?? undefined} className="text-mist">
                              {production.event_date
                                ? new Intl.DateTimeFormat("en-KE", {
                                    dateStyle: "medium",
                                    timeZone: "UTC",
                                  }).format(new Date(`${production.event_date.slice(0, 10)}T12:00:00Z`))
                                : "Date to be announced"}
                            </time>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null,
              )
            : null}
        </section>

        <aside className="mt-12 rounded-xl border border-paper/10 bg-ink/60 p-5 md:p-7">
          <p className="text-sm leading-relaxed text-mist">
            Only project names, event types, statuses and dates approved for public sharing appear here. Client contact
            details, budgets, internal notes and private conversations stay off this page.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/work"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-paper/15 px-5 text-sm text-paper transition-colors hover:border-paper/35"
            >
              Explore our work
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/quote"
              className="inline-flex min-h-11 items-center rounded-md bg-blue px-5 text-sm font-medium text-paper transition-colors hover:bg-blue-2"
            >
              Plan your event
            </Link>
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}
