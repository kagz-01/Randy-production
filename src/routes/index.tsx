import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { Aperture, ArrowRight, ArrowDown, Clapperboard, Layers3 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SiteFooter, SiteNav } from "@/components/site/nav";
import { GlassCard, Reveal } from "@/components/site/fx";
import { Button } from "@/components/ui/button";
import { PILLAR_LINE, SERVICES, WORK } from "@/data/catalog";
import { getLivePulse } from "@/lib/server/studio";

export const Route = createFileRoute("/")({ component: Home });

const HERO_VIDEO_URL = "/videos/hero.mp4?v=2026-10-29";
const HERO_POSTER_URL = "/images/hero-poster.webp";

const STORY = [
  {
    step: "01",
    title: "We start with your goal",
    body: "Not a moodboard from another city. What must this night, film, or brand actually do — sell, launch, mourn, celebrate, convince?",
  },
  {
    step: "02",
    title: "Plan the production",
    body: "Agree on the venue, schedule, services and responsibilities before the event day.",
  },
  {
    step: "03",
    title: "Coordinate the event",
    body: "Bring the production plan, crew and suppliers together around the agreed schedule.",
  },
  {
    step: "04",
    title: "Hand over the work",
    body: "Deliver the agreed film, photographs or other project materials after the event.",
  },
] as const;

function Home() {
  const featuredWork = WORK[0];
  const portfolioServices = SERVICES.flatMap((service) => {
    const stories = WORK.filter((story) => story.service === service.key);
    return stories.length > 0 ? [{ ...service, stories }] : [];
  });
  const heroRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [pulseLoadError, setPulseLoadError] = useState(false);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(motionPreference.matches);
    updatePreference();
    motionPreference.addEventListener("change", updatePreference);
    return () => motionPreference.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) heroVideoRef.current?.pause();
  }, [prefersReducedMotion]);

  useEffect(() => {
    let on = true;
    getLivePulse()
      .then((r) => {
        if (on) setPulseId(r?.id ?? null);
      })
      .catch(() => {
        if (on) {
          setPulseId(null);
          setPulseLoadError(true);
        }
      });
    return () => {
      on = false;
    };
  }, []);

  return (
    <div className="relative min-h-dvh overflow-x-hidden pt-16 md:pt-20">
      <SiteNav />

      <section
        ref={heroRef}
        className="relative z-1 min-h-[520px] overflow-hidden md:h-[75dvh] md:min-h-140 md:max-h-[680px] lg:min-h-150"
      >
        <motion.div
          style={prefersReducedMotion ? undefined : { y, scale }}
          className="absolute inset-0"
        >
          <video
            ref={heroVideoRef}
            key={HERO_VIDEO_URL}
            className="size-full object-cover ken-burn"
            autoPlay={!prefersReducedMotion}
            muted
            loop
            playsInline
            preload="metadata"
            poster={HERO_POSTER_URL}
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-linear-to-t from-void via-void/60 to-void/50" />
        </motion.div>

        <motion.div
          style={prefersReducedMotion ? undefined : { opacity }}
          className="shell relative z-10 flex min-h-[520px] flex-col justify-end pb-8 md:h-full md:min-h-0 md:pb-14 lg:pb-16"
        >
          <p className="reveal eyebrow mb-3 md:mb-4">{PILLAR_LINE}</p>
          <h1 className="hero-title max-w-[10.5ch] sm:max-w-[12ch] md:max-w-[13ch]">
            <span className="block bg-linear-to-b from-paper via-paper to-[#9e998f] bg-clip-text text-transparent drop-shadow-[0_10px_30px_rgba(0,0,0,0.42)]">
              We build the moments people remember.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-paper/80 md:text-[1.2rem] md:leading-relaxed">
            A production studio for weddings, live events, launches and brand stories — planned with
            precision, staged with intention, and delivered without the usual agency drag.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-8">
            <Link to="/quote">
              <Button variant="primary" size="lg">
                Get a Quote
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/work">
              <Button variant="line" size="lg">
                See the work
              </Button>
            </Link>
          </div>
          <a
            href="#story"
            className="mt-6 hidden items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-mist transition-colors hover:text-paper md:inline-flex md:mt-8"
          >
            The story
            <ArrowDown className="size-3.5" />
          </a>
        </motion.div>
      </section>

      <StatsTicker />

      <section className="shell relative z-1 py-12 md:py-16" aria-labelledby="start-heading">
        <Reveal>
          <p className="eyebrow">Your next step</p>
          <h2
            id="start-heading"
            className="mt-3 font-serif text-3xl tracking-[-0.05em] text-paper md:text-5xl"
          >
            Start with what you know.
          </h2>
        </Reveal>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Reveal className="h-full">
            <StartPathCard
              to="/quote"
              icon={<Clapperboard className="size-5 text-blue-2" aria-hidden />}
              context="Ready to price"
              title="Get a Quote"
              description="Build your production scope and see the estimate."
              action="Build your quote"
            />
          </Reveal>
          <Reveal delay={0.06} className="h-full">
            <StartPathCard
              to="/match"
              icon={<Aperture className="size-5 text-blue-2" aria-hidden />}
              context="Need a recommendation"
              title="Help Me Choose"
              description="Find a package that fits your event and priorities."
              action="Find my package"
            />
          </Reveal>
          <Reveal delay={0.12} className="h-full">
            <StartPathCard
              to="/look"
              icon={<Layers3 className="size-5 text-blue-2" aria-hidden />}
              context="Have a vision"
              title="Plan Your Event"
              description="Shape the room and share your creative brief."
              action="Create a room concept"
            />
          </Reveal>
        </div>
      </section>

      <section id="story" className="shell relative z-1 scroll-mt-24 py-16 md:py-28">
        <Reveal>
          <Header title="Design is not the brief. Experience is." />
        </Reveal>
        <div className="mt-7 grid gap-7 md:grid-cols-[0.95fr_1.05fr] md:items-end md:gap-12">
          <Reveal delay={0.05}>
            <p className="max-w-lg text-[1rem] leading-relaxed text-paper/80 md:text-[1.2rem] md:leading-relaxed">
              A polished visual is easy. A moment that feels right in the room, on camera, and in
              the memory is what actually matters.
            </p>
          </Reveal>
          <Reveal
            delay={0.12}
            className="space-y-4 text-[0.96rem] leading-relaxed text-mist md:text-base"
          >
            <p>
              We work across events, producing films, visual identity, styling, stage design and
              content systems — all in one flow so the story stays coherent from brief to guest
              arrival.
            </p>
            <p>
              Whether it is a wedding, a launch, a gala, or a live production, we build the
              experience around the real goal: emotion, clarity, trust and a finish that feels
              effortless when the room opens.
            </p>
          </Reveal>
        </div>
        <div className="mt-8 grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {portfolioServices.map((service, i) => (
            <Reveal key={service.key} delay={i * 0.05} className="h-full">
              <Link
                to="/work"
                search={{ service: service.key }}
                className="group grid h-full grid-cols-[7rem_minmax(0,1fr)] overflow-hidden rounded-xl border border-paper/10 bg-ink/60 transition-colors hover:border-blue/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2 sm:grid-cols-[8rem_minmax(0,1fr)]"
              >
                <img
                  src={service.stories[0].image}
                  alt=""
                  loading="lazy"
                  className="size-full min-h-32 object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <span className="flex flex-col justify-center p-4">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-blue-2">
                    {service.label}
                  </span>
                  <span className="mt-2 font-serif text-xl text-paper">
                    {service.stories.length}{" "}
                    {service.stories.length === 1 ? "project story" : "project stories"}
                  </span>
                  <span className="mt-3 text-xs text-mist group-hover:text-paper">
                    Browse this work →
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative z-1 border-y border-paper/10 bg-ink/70 py-20 backdrop-blur-sm md:py-28">
        <div className="shell">
          <Reveal>
            <Header title="From the first brief to the final hand-off." />
          </Reveal>
          <ol className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STORY.map((s, i) => (
              <li key={s.step}>
                <Reveal delay={i * 0.07} className="h-full">
                  <GlassCard className="h-full min-h-[180px] p-4 md:min-h-[220px] md:p-5">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-blue-2">{s.step}</p>
                    <h3 className="mt-3 text-lg leading-tight text-paper md:text-[1.65rem]">
                      {s.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-mist md:text-[0.9rem]">
                      {s.body}
                    </p>
                  </GlassCard>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell relative z-1 py-20 md:py-28">
        <Reveal>
          <Header title="Stories from the full catalog." />
        </Reveal>
        <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-12">
          {featuredWork ? (
            <Reveal className="md:col-span-7">
              <Link
                to="/cases/$slug"
                params={{ slug: featuredWork.id }}
                className="group relative block"
              >
                <div className="relative aspect-16/11 overflow-hidden rounded-lg bg-[#071119]">
                  <img
                    src={featuredWork.image}
                    alt={`${featuredWork.title} — ${featuredWork.event}`}
                    className="size-full object-contain transition-transform duration-700 group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-void/85 via-transparent to-transparent" />
                  <div className="glass-chip absolute right-4 bottom-4 left-4 rounded-md px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">
                      {featuredWork.event}
                    </p>
                    <p className="font-serif text-3xl">{featuredWork.title}</p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ) : null}
          <div className="grid gap-4 md:col-span-5">
            {WORK.slice(1, 3).map((w, i) => (
              <Reveal key={w.id} delay={0.08 + i * 0.06}>
                <Link
                  to="/cases/$slug"
                  params={{ slug: w.id }}
                  className="group relative block overflow-hidden rounded-lg"
                >
                  <div className="relative aspect-16/8 bg-[#071119]">
                    <img
                      src={w.image}
                      alt={`${w.title} — ${w.event}`}
                      className="size-full object-contain transition-transform duration-700 group-hover:scale-[1.01]"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-void via-void/20 to-transparent" />
                    <div className="glass-chip absolute right-4 bottom-3 left-4 rounded-md px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">
                        {w.event}
                      </p>
                      <p className="font-serif text-xl">{w.title}</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
        <div className="mt-8">
          <Link to="/work" className="text-sm text-blue-2 underline-offset-4 hover:underline">
            Explore all catalog stories →
          </Link>
        </div>
      </section>

      {pulseLoadError ? (
        <p role="status" className="shell mt-4 text-sm text-mist">
          Live event status could not be loaded. Please try again later.
        </p>
      ) : null}
      {pulseId ? (
        <div className="shell relative z-1 pb-8">
          <Link
            to="/live/$projectId"
            params={{ projectId: pulseId }}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-blue-2 underline-offset-4 hover:underline"
          >
            View the live event <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : null}

      <section className="relative z-1 border-t border-paper/10 bg-ink/70 backdrop-blur-sm">
        <div className="shell py-12 text-center md:py-16">
          <Reveal>
            <h2 className="mx-auto max-w-4xl font-serif text-4xl text-paper md:text-5xl lg:text-6xl">
              Make the next one unforgettable.
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/quote">
                <Button variant="primary" size="lg">
                  Get a Quote
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link to="/work">
                <Button variant="line" size="lg">
                  See the work
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Header({ title }: { title: string }) {
  return <h2 className="section-title leading-[0.92] tracking-[-0.07em]">{title}</h2>;
}

function StatsTicker() {
  const portfolioFacts = [
    {
      value: WORK.reduce((count, story) => count + story.stills.length + 1, 0),
      label: "catalog photographs",
      suffix: "",
    },
    { value: WORK.length, label: "curated stories", suffix: "" },
    {
      value: new Set(WORK.map((story) => story.service)).size,
      label: "services represented",
      suffix: "",
    },
  ];
  const items = [...portfolioFacts, ...portfolioFacts, ...portfolioFacts];

  return (
    <div className="relative overflow-hidden border-y border-paper/10 bg-ink/80 py-4 backdrop-blur-sm md:py-5">
      <ul className="sr-only">
        {portfolioFacts.map((fact) => (
          <li key={fact.label}>
            {fact.value} {fact.label}
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="ticker-track flex w-max gap-8 pr-8 md:gap-16 md:pr-16">
        {items.map((s, i) => (
          <div
            key={`${s.label}-${i}`}
            className="flex items-baseline gap-2 whitespace-nowrap md:gap-3"
          >
            <span className="font-serif text-2xl tabular-nums text-paper md:text-4xl">
              {s.value}
              {s.suffix}
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-mist md:text-[11px] md:tracking-[0.2em]">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StartPathCard({
  to,
  icon,
  context,
  title,
  description,
  action,
}: {
  to: string;
  icon: ReactNode;
  context: string;
  title: string;
  description: string;
  action: string;
}) {
  return (
    <Link
      to={to}
      className="glass glass-lift group relative flex h-full min-h-52 flex-col overflow-hidden rounded-lg p-5 md:p-6"
    >
      <span aria-hidden className="glass-sheen" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between">
          {icon}
          <span className="text-[9px] uppercase tracking-[0.18em] text-mist">{context}</span>
        </div>
        <h3 className="mt-7 font-serif text-2xl tracking-[-0.035em] text-paper md:text-3xl">
          {title}
        </h3>
        <p className="mt-2 max-w-[28ch] text-sm leading-relaxed text-mist">{description}</p>
        <span className="mt-auto inline-flex items-center gap-2 pt-6 text-xs font-medium text-blue-2">
          {action}
          <ArrowRight
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-1"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}
