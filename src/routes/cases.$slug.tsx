import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteFooter, SiteNav } from "@/components/site/nav";
import { WORK } from "@/data/catalog";
import { getJobPublic, type JobRow } from "@/lib/server/studio";

export const Route = createFileRoute("/cases/$slug")({ component: CasePage });

function CasePage() {
  const { slug } = Route.useParams();
  const [job, setJob] = useState<JobRow | null>(null);

  useEffect(() => {
    getJobPublic({ data: { id: slug } })
      .then((r) => setJob(r?.job ?? null))
      .catch(() => setJob(null));
  }, [slug]);

  const work = WORK.find((w) => job?.title.toLowerCase().includes(w.title.split(" ")[0].toLowerCase())) ?? WORK[0];

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main>
        <div className="relative h-[70dvh] min-h-[420px]">
          <img src={work.image} alt="" className="size-full object-cover ken-burn" />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-void/20" />
          <div className="absolute right-6 bottom-10 left-6 mx-auto max-w-5xl">
            <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Case study · forged on delivery</p>
            <h1 className="mt-3 font-serif text-5xl md:text-7xl">{job?.title ?? work.title}</h1>
            <p className="mt-3 text-mist">{job?.client_name} · {job?.venue}</p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl gap-10 px-5 py-16 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="font-serif text-3xl leading-snug text-paper">{work.logline}</p>
            <p className="mt-6 text-mist">
              Auto-built the hour the job moved to delivered: stills, the number that mattered, a page you can
              send before the thank-you email.
            </p>
          </div>
          <aside className="md:col-span-5">
            <div className="glass rounded-lg p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">The number</p>
              <p className="mt-2 font-serif text-3xl">{work.outcome}</p>
              <p className="mt-4 text-sm text-mist">
                {job?.guests} guests · {job?.tier} · {job?.service}
              </p>
            </div>
            <Link to="/quote" className="mt-4 inline-block text-sm text-blue-2">
              Build a night like this →
            </Link>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
