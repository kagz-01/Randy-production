import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/nav";
import { NotFoundPage } from "@/lib/not-found-page";
import { SERVICES, WORK } from "@/data/catalog";

type CaseData = {
  work: (typeof WORK)[number];
};

export const Route = createFileRoute("/cases/$slug")({
  loader: async ({ params }): Promise<CaseData> => {
    const work = WORK.find((story) => story.id === params.slug);
    if (!work) throw notFound();
    return { work };
  },
  component: CasePage,
  notFoundComponent: CaseNotFound,
});

function CaseNotFound() {
  return <NotFoundPage />;
}

function CasePage() {
  const { work } = Route.useLoaderData();
  const stills = work.stills;
  const galleryImages = useMemo(
    () => [work.image, ...stills].filter(Boolean),
    [stills, work.image],
  );
  const serviceLabel =
    SERVICES.find((service) => service.key === work.service)?.label ?? work.service;
  const storyTitle =
    work.storyTitle ?? `${work.title} is shaped by craft, atmosphere and intention.`;
  const storyBody = work.storyBody ?? [
    `This project was built around ${work.event.toLowerCase()}, balancing atmosphere, texture and detail with a clear editorial point of view.`,
    "The result is a narrative-rich visual experience that lets the story live in the image, the styling and the feeling of the moment.",
  ];
  const storyTags = work.tags ?? ["Editorial", "Creative Direction", "Storytelling", "Craft"];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const openImage = (index: number) => {
    if (selectedIndex === null && document.activeElement instanceof HTMLElement) {
      restoreFocusRef.current = document.activeElement;
    }
    setSelectedIndex(index);
  };
  const closeImage = () => setSelectedIndex(null);

  useEffect(() => {
    if (selectedIndex === null) {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeImage();
      if (event.key === "ArrowLeft") {
        setSelectedIndex((current) =>
          current === null ? current : (current - 1 + galleryImages.length) % galleryImages.length,
        );
      }
      if (event.key === "ArrowRight") {
        setSelectedIndex((current) =>
          current === null ? current : (current + 1) % galleryImages.length,
        );
      }
      if (event.key === "Tab") {
        const focusable =
          lightboxRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    closeButtonRef.current?.focus();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedIndex, galleryImages.length]);

  return (
    <div className="min-h-dvh bg-void text-paper">
      <SiteNav />

      <main className="pb-12">
        <div className="w-full px-3 pt-28 md:px-5 md:pt-32">
          <section className="overflow-hidden bg-[#071119] lg:h-[74vh] lg:min-h-140 lg:max-h-215">
            <div className="grid lg:h-full lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
              <div className="flex flex-col justify-center p-6 md:p-8 lg:h-full lg:p-10 lg:py-12">
                <Link
                  to="/work"
                  className="inline-flex min-h-11 w-fit items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-paper/70 transition-colors hover:text-paper"
                >
                  <span aria-hidden>←</span>
                  Back to work
                </Link>

                <p className="mt-8 inline-flex w-fit items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-blue-2">
                  <span className="inline-block h-px w-4 bg-blue-2" aria-hidden />
                  {work.event}
                </p>

                <h1 className="mt-5 max-w-[10ch] text-[3.2rem] leading-[0.88] tracking-[-0.07em] text-paper md:text-[5rem] lg:text-[5.9rem]">
                  {work.title}
                </h1>

                <p className="mt-5 max-w-md text-[1rem] leading-normal text-paper/75 md:text-[1.08rem]">
                  {work.logline}
                </p>

                <div className="mt-7 grid max-w-96 grid-cols-3 gap-3 text-[10px] uppercase tracking-[0.14em] text-mist">
                  <div>
                    <span className="mb-1 block text-paper/40">Service</span>
                    <span className="inline-block rounded-full border border-paper/15 bg-paper/5 px-2 py-1.5 text-[10px] text-paper/90">
                      {serviceLabel}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-paper/40">Photographs</span>
                    <span className="inline-block rounded-full border border-paper/15 bg-paper/5 px-2 py-1.5 text-[10px] text-paper/90">
                      {galleryImages.length}
                    </span>
                  </div>
                  <div>
                    <span className="mb-1 block text-paper/40">Collection</span>
                    <span className="inline-block rounded-full border border-paper/15 bg-paper/5 px-2 py-1.5 text-[10px] text-paper/90">
                      Catalog
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openImage(0)}
                className="group relative block min-h-72 overflow-hidden border-0 bg-transparent p-0 text-left sm:min-h-90 lg:min-h-135"
                aria-label={`Open ${work.title} image`}
              >
                <img
                  src={work.image}
                  alt={work.title}
                  className="block h-full w-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.01]"
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
                    <span
                      key={tag}
                      className="rounded-full border border-paper/15 bg-paper/2 px-3 py-1.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {stills.map((still, index) => (
                  <button
                    key={`${work.id}-still-${index}`}
                    type="button"
                    onClick={() => openImage(index + 1)}
                    className="group overflow-hidden rounded-[1.1rem] border border-paper/10 bg-[#09151d] p-0 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
                    aria-label={`Open photograph ${index + 2} of ${galleryImages.length} from ${work.title}`}
                  >
                    <img
                      src={still}
                      alt={`${work.title}, photograph ${index + 2} of ${galleryImages.length}`}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-contain object-center transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-paper/10 pt-5">
              <Link
                to="/work"
                className="inline-flex min-h-11 items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-paper transition-colors hover:text-blue-2"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-paper/15 bg-paper/2 text-[12px]">
                  ◌
                </span>
                View more projects
                <span aria-hidden>→</span>
              </Link>
              <span className="text-[10px] uppercase tracking-[0.18em] text-paper/60">
                {galleryImages.length} photographs
              </span>
            </div>
          </section>
        </div>
      </main>

      {selectedIndex !== null && galleryImages[selectedIndex] ? (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${work.title} photograph viewer`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#030507]/80 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeImage();
          }}
        >
          <div className="relative w-full max-w-6xl">
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeImage}
              aria-label="Close image viewer"
              className="absolute -top-12 right-0 flex size-11 items-center justify-center rounded-full border border-paper/10 bg-[#0d1418]/90 text-xl text-paper shadow-lg transition-colors hover:border-paper/30 hover:bg-[#111b20]"
            >
              ×
            </button>

            <div className="relative overflow-hidden rounded-3xl border border-paper/10 bg-[#071119] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
              <img
                src={galleryImages[selectedIndex]}
                alt={`${work.title}, photograph ${selectedIndex + 1} of ${galleryImages.length}`}
                className="block max-h-[82vh] w-full object-contain object-center"
              />
              <p aria-live="polite" className="sr-only">
                Photograph {selectedIndex + 1} of {galleryImages.length}
              </p>

              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIndex((current) =>
                        current === null
                          ? current
                          : (current - 1 + galleryImages.length) % galleryImages.length,
                      )
                    }
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-paper/10 bg-[#0d1418]/80 text-2xl text-paper shadow-lg transition-colors hover:border-paper/30 hover:bg-[#111b20] sm:left-4"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIndex((current) =>
                        current === null ? current : (current + 1) % galleryImages.length,
                      )
                    }
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-paper/10 bg-[#0d1418]/80 text-2xl text-paper shadow-lg transition-colors hover:border-paper/30 hover:bg-[#111b20] sm:right-4"
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
