import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, isNotFound, notFound } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/nav";
import { NotFoundPage } from "@/lib/not-found-page";
import { WORK } from "@/data/catalog";
import { getJobPublic, type JobRow } from "@/lib/server/studio";

type CaseData = {
  job: JobRow | null;
  work: (typeof WORK)[number];
};

export const Route = createFileRoute("/cases/$slug")({
  loader: async ({ params }): Promise<CaseData> => {
    const byCatalogId = WORK.find((w) => w.id === params.slug) ?? null;
    try {
      const res = await getJobPublic({ data: { id: params.slug } });
      if (res?.job) {
        const title = res.job.title.toLowerCase();
        const match =
          WORK.find((w) => title.includes(w.title.split(" ")[0].toLowerCase())) ?? byCatalogId ?? WORK[0];
        return { job: res.job, work: match };
      }
      if (byCatalogId) return { job: null, work: byCatalogId };
      throw notFound();
    } catch (err) {
      if (isNotFound(err)) throw err;
      if (byCatalogId) return { job: null, work: byCatalogId };
      throw notFound();
    }
  },
  component: CasePage,
  notFoundComponent: CaseNotFound,
});

function CaseNotFound() {
  return <NotFoundPage />;
}

function CasePage() {
  const { job, work } = Route.useLoaderData();
  const title = job?.title ?? work.title;
  const stills = work.stills?.slice(0, 3) ?? [];
  const galleryImages = useMemo(() => [work.image, ...stills].filter(Boolean), [stills, work.image]);
  const storyTitle = work.storyTitle ?? `${work.title} is shaped by craft, atmosphere and intention.`;
  const storyBody = work.storyBody ?? [
    `This project was built around ${work.event.toLowerCase()}, balancing atmosphere, texture and detail with a clear editorial point of view.`,
    "The result is a narrative-rich visual experience that lets the story live in the image, the styling and the feeling of the moment.",
  ];
  const storyTags = work.tags ?? ["Editorial", "Creative Direction", "Storytelling", "Craft"];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openImage = (index: number) => setSelectedIndex(index);
  const closeImage = () => setSelectedIndex(null);
  const goToPrevious = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex - 1 + galleryImages.length) % galleryImages.length);
  };
  const goToNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % galleryImages.length);
  };

  useEffect(() => {
    if (selectedIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeImage();
      if (event.key === "ArrowLeft") goToPrevious();
      if (event.key === "ArrowRight") goToNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, galleryImages.length]);

  return (
    <div className="min-h-dvh bg-void text-paper">
      <SiteNav />

      <main className="pb-12">
        <div className="w-full px-3 pt-28 md:px-5 md:pt-32">
          <section className="h-[74vh] min-h-140 max-h-215 overflow-hidden bg-[#071119]">
            <div className="grid h-full lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
              <div className="flex h-full flex-col justify-center p-6 md:p-8 lg:p-10 lg:py-12">
                <Link
                  to="/work"
                  className="inline-flex w-fit items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-paper/70 transition-colors hover:text-paper"
                >
                  <span aria-hidden>←</span>
                  Back to work
                </Link>

                <p className="mt-8 inline-flex w-fit items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-blue-2">
                  <span className="inline-block h-px w-4 bg-blue-2" aria-hidden />
                  Case study · {work.event}
                </p>

                <h1 className="mt-5 max-w-[7ch] text-[3.2rem] leading-[0.8] tracking-[-0.07em] text-paper md:text-[5rem] lg:text-[5.9rem]">
                  {title}
                </h1>

                <p className="mt-5 max-w-md text-[1rem] leading-normal text-paper/75 md:text-[1.08rem]">
                  {work.logline}
                </p>

                <div className="mt-7 grid max-w-88 grid-cols-3 gap-3 text-[9px] uppercase tracking-[0.18em] text-mist">
                  <div>
                    <span className="mb-1 block text-paper/40">Year</span>
                    <span className="inline-block rounded-full border border-paper/15 bg-paper/5 px-2 py-1.5 text-[9px] text-paper/90">
                      {work.year}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-paper/40">Category</span>
                    <span className="inline-block rounded-full border border-paper/15 bg-paper/5 px-2 py-1.5 text-[9px] text-paper/90">
                      {work.service}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-paper/40">Location</span>
                    <span className="inline-block rounded-full border border-paper/15 bg-paper/5 px-2 py-1.5 text-[9px] text-paper/90">
                      Nairobi
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openImage(0)}
                className="group relative block min-h-90 overflow-hidden border-0 bg-transparent p-0 text-left lg:min-h-135"
                aria-label={`Open ${work.title} image`}
              >
                <img
                  src={work.image}
                  alt={work.title}
                  className="block h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-[#050606]/65 via-[#050606]/12 to-transparent" />
              </button>
            </div>
          </section>

          <section className="mt-8 overflow-hidden bg-[#050d15] px-3 py-5 md:px-5 md:py-7">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] xl:items-start">
              <div className="pt-1">
                <p className="text-[10px] uppercase tracking-[0.22em] text-blue-2">The story</p>
                <h2 className="mt-5 max-w-[12ch] text-[2.7rem] leading-[0.86] tracking-[-0.07em] text-paper md:text-[3.8rem] lg:text-[4.4rem]">
                  {storyTitle}
                </h2>

                <div className="mt-6 space-y-4 text-[1rem] leading-[1.7] text-paper/75 md:text-[1.08rem]">
                  {storyBody.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap gap-2 text-[9px] uppercase tracking-[0.14em] text-paper/75">
                  {storyTags.map((tag) => (
                    <span key={tag} className="rounded-full border border-paper/15 bg-paper/[0.02] px-3 py-1.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                {stills.map((still, index) => (
                  <button
                    key={`${work.id}-still-${index}`}
                    type="button"
                    onClick={() => openImage(index + 1)}
                    className={[
                      'group overflow-hidden rounded-[1.1rem] border border-paper/10 bg-[#09151d] p-0 text-left',
                      index === 0 ? 'sm:col-span-2' : '',
                    ].join(' ')}
                    aria-label={`Open ${work.title} detail ${index + 1}`}
                  >
                    <img
                      src={still}
                      alt={`${work.title} detail ${index + 1}`}
                      className={[
                        'block w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]',
                        index === 0 ? 'h-80 sm:h-90' : 'h-55 sm:h-65',
                      ].join(' ')}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-paper/10 pt-5">
              <Link
                to="/work"
                className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-paper transition-colors hover:text-blue-2"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-paper/15 bg-paper/2 text-[12px]">
                  ◌
                </span>
                View more projects
                <span aria-hidden>→</span>
              </Link>

              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-paper/60">
                <span>03 / 08</span>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Previous project" className="flex h-8 w-8 items-center justify-center rounded-full border border-paper/10 bg-paper/2 text-lg text-paper/80">
                    ‹
                  </button>
                  <button type="button" aria-label="Next project" className="flex h-8 w-8 items-center justify-center rounded-full border border-paper/10 bg-paper/2 text-lg text-paper/80">
                    ›
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {selectedIndex !== null && galleryImages[selectedIndex] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030507]/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl">
            <button
              type="button"
              onClick={closeImage}
              aria-label="Close image viewer"
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full border border-paper/10 bg-[#0d1418]/90 text-xl text-paper shadow-lg transition-colors hover:border-paper/30 hover:bg-[#111b20]"
            >
              ×
            </button>

            <div className="relative overflow-hidden rounded-3xl border border-paper/10 bg-[#071119] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
              <img
                src={galleryImages[selectedIndex]}
                alt={`${work.title} detail ${selectedIndex + 1}`}
                className="block max-h-[82vh] w-full object-contain object-center"
              />

              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={goToPrevious}
                    aria-label="Previous image"
                    className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-paper/10 bg-[#0d1418]/80 text-2xl text-paper shadow-lg transition-colors hover:border-paper/30 hover:bg-[#111b20]"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    aria-label="Next image"
                    className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-paper/10 bg-[#0d1418]/80 text-2xl text-paper shadow-lg transition-colors hover:border-paper/30 hover:bg-[#111b20]"
                  >
                    ›
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
