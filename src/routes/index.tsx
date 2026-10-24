import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import {
  Aperture,
  ArrowRight,
  ArrowDown,
  AudioLines,
  Clapperboard,
  Layers3,
  Radar,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SiteFooter, SiteNav } from "@/components/site/nav";
import { BeforeAfter } from "@/components/site/before-after";
import { GlassCard, ParallaxImage, Reveal } from "@/components/site/fx";
import { Button } from "@/components/ui/button";
import { AGENCY_PILLARS, OUTCOMES, PILLAR_LINE, STATS, TEAM, TIMELINE, WORK } from "@/data/catalog";
import { getLivePulse, getPublicStats } from "@/lib/server/studio";

export const Route = createFileRoute("/")({ component: Home });

const HERO_VIDEO_URL = "/videos/hero.mp4?v=2026-10-06";
const HERO_POSTER_URL = "/catalog/concert/GRA00269.webp?v=2026-10-06";

const STORY = [
  {
    step: "01",
    title: "We start with your goal",
    body: "Not a moodboard from another city. What must this night, film, or brand actually do — sell, launch, mourn, celebrate, convince?",
  },
  {
    step: "02",
    title: "One floor builds it",
    body: "Media, events, branding, digital, and PR under one roof. No hand-offs that lose the plot between agencies.",
  },
  {
    step: "03",
    title: "Show day, we run it",
    body: "Call sheets, sound, stage, décor, capture — Pulse live so the programme does not drift while guests arrive.",
  },
  {
    step: "04",
    title: "Proof ships after",
    body: "Film, stills, recap, results. Work people remember — and numbers you can point at next quarter.",
  },
] as const;

function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [activeMember, setActiveMember] = useState<(typeof TEAM)[number] | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let on = true;
    getLivePulse()
      .then((r) => {
        if (on) setPulseId(r?.id ?? null);
      })
      .catch(() => {
        if (on) setPulseId(null);
      });
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    if (!activeMember) {
      document.body.style.overflow = "";
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveMember(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMember]);

  useEffect(() => {
    if (!activeMember) return;
    const video = modalVideoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {
      // Some browsers block autoplay without user interaction; the modal still opens and remains usable.
    });
  }, [activeMember]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden pt-16 md:pt-20">
      <SiteNav />

      <section
        ref={heroRef}
        className="relative z-1 h-[62dvh] min-h-[360px] max-h-[680px] overflow-hidden md:h-[75dvh] md:min-h-140 lg:min-h-150"
      >
        <motion.div style={{ y, scale }} className="absolute inset-0">
          <video
            key={HERO_VIDEO_URL}
            className="size-full object-cover ken-burn"
            src={HERO_VIDEO_URL}
            poster={HERO_POSTER_URL}
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-linear-to-t from-void via-void/45 to-void/30" />
        </motion.div>

        <motion.div
          style={{ opacity }}
          className="shell relative z-10 flex h-full flex-col justify-end pb-8 md:pb-14 lg:pb-16"
        >
          <p className="reveal eyebrow mb-3 md:mb-4">
            {PILLAR_LINE}
          </p>
          <h1 className="hero-title max-w-[10.5ch] sm:max-w-[12ch] md:max-w-[13ch]">
            <span className="block bg-linear-to-b from-paper via-paper to-[#9e998f] bg-clip-text text-transparent drop-shadow-[0_10px_30px_rgba(0,0,0,0.42)]">
              We build the moments people remember.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-[1rem] leading-relaxed text-paper/80 md:text-[1.2rem] md:leading-relaxed">
            A production studio for weddings, live events, launches and brand stories — planned with precision, staged with intention, and delivered without the usual agency drag.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-8">
            <Link to="/quote">
              <Button variant="primary" size="lg">
                Start a project
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

      <section id="story" className="shell relative z-1 scroll-mt-24 py-16 md:py-28">
        <Reveal>
          <Header title="Design is not the brief. Experience is." />
        </Reveal>
        <div className="mt-7 grid gap-7 md:grid-cols-[0.95fr_1.05fr] md:items-end md:gap-12">
          <Reveal delay={0.05}>
            <p className="max-w-lg text-[1rem] leading-relaxed text-paper/80 md:text-[1.2rem] md:leading-relaxed">
              A polished visual is easy. A moment that feels right in the room, on camera, and in the memory is what
              actually matters.
            </p>
          </Reveal>
          <Reveal delay={0.12} className="space-y-4 text-[0.96rem] leading-relaxed text-mist md:text-base">
            <p>
              We work across events, producing films, visual identity, styling, stage design and content systems — all
              in one flow so the story stays coherent from brief to guest arrival.
            </p>
            <p>
              Whether it is a wedding, a launch, a gala, or a live production, we build the experience around the real
              goal: emotion, clarity, trust and a finish that feels effortless when the room opens.
            </p>
          </Reveal>
        </div>
        <div className="mt-8 grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-5">
          {AGENCY_PILLARS.map((p, i) => (
            <Reveal key={p.key} delay={i * 0.05} className="h-full">
              <GlassCard className="h-full min-h-[150px] rounded-[1rem] p-3 md:p-4">
                <p className="text-[9px] uppercase tracking-[0.2em] text-blue-2 md:text-[10px]">{p.label}</p>
                <p className="mt-2 text-[0.72rem] leading-relaxed text-mist md:text-[0.82rem]">{p.line}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative z-1 border-y border-paper/10 bg-ink/70 py-20 backdrop-blur-sm md:py-28">
        <div className="shell">
          <Reveal>
            <Header title="Four moments. One team. No missing cue." />
          </Reveal>
          <ol className="mt-8 grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
            {STORY.map((s, i) => (
              <li key={s.step}>
                <Reveal delay={i * 0.07} className="h-full">
                  <GlassCard className="h-full min-h-[220px] p-4 md:p-5">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-blue-2">{s.step}</p>
                    <h3 className="mt-3 text-lg leading-tight text-paper md:text-[1.65rem]">{s.title}</h3>
                    <p className="mt-3 text-[0.72rem] leading-relaxed text-mist md:text-[0.82rem]">{s.body}</p>
                  </GlassCard>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="shell relative z-1 py-20 md:py-28">
        <Reveal>
          <Header title="Recent work from Nairobi and beyond." />
        </Reveal>
        <div className="mt-8 grid gap-4 grid-cols-1 md:grid-cols-12">
          <Reveal className="md:col-span-7">
            <Link to="/work" className="group relative block">
              <div className="relative aspect-16/11 overflow-hidden rounded-lg">
                <ParallaxImage
                  src="/catalog/concert/GRA00269.webp"
                  alt="Meridian Gala"
                  className="size-full"
                  strength={28}
                />
                <div className="absolute inset-0 bg-linear-to-t from-void via-transparent to-transparent" />
                <div className="glass-chip absolute right-4 bottom-4 left-4 rounded-md px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">Gala production · 2026</p>
                  <p className="font-serif text-3xl">Meridian Gala</p>
                </div>
              </div>
            </Link>
          </Reveal>
          <div className="grid gap-4 md:col-span-5">
            {WORK.slice(0, 2).map((w, i) => (
              <Reveal key={w.id} delay={0.08 + i * 0.06}>
                <Link to="/work" className="group relative block overflow-hidden rounded-lg">
                  <div className="relative aspect-16/8">
                    <img
                      src={w.image}
                      alt={w.title}
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-void via-void/20 to-transparent" />
                    <div className="glass-chip absolute right-4 bottom-3 left-4 rounded-md px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">{w.event ?? w.service}</p>
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
            More rooms in the archive →
          </Link>
        </div>
      </section>

      <section className="shell relative z-1 pb-8">
        <Reveal>
          <Header title="From raw venue to dressed room." />
          <p className="mt-3 max-w-xl text-mist">
            We help clients see the room before the build begins — the layout, the texture, the mood, and the flow
            that will shape the entire guest experience.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-8">
          <BeforeAfter before="/catalog/decor/IMG_0953.webp" after="/catalog/wedding/GRA08375.webp" />
        </Reveal>
        <div className="mt-6">
          <Link to="/look">
            <Button variant="line">
              Overlay your venue
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="relative z-1 mt-16 border-y border-paper/10 bg-ink/70 py-20 backdrop-blur-sm md:py-24">
        <div className="shell">
          <Reveal>
            <Header title="Logos are cheap. Numbers stay." />
          </Reveal>
          <div className="mt-8 grid gap-px bg-paper/10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {OUTCOMES.map((o, i) => (
              <Reveal key={o.client} delay={i * 0.05} className="bg-ink/80">
                <div className="h-full p-6">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">{o.client}</p>
                  <p className="mt-3 font-serif text-2xl text-paper">{o.line}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="shell relative z-1 py-20 md:py-28">
        <Reveal>
          <Header title="Faces first. Then the instruments." />
        </Reveal>
        <div className="mt-8 grid gap-3 grid-cols-2 mobile-2up sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((t, i) => (
            <Reveal key={t.id} delay={i * 0.06}>
              <article className="group relative overflow-hidden rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveMember(t)}
                  className="relative block w-full overflow-hidden text-left"
                  aria-label={`Open video for ${t.name}`}
                >
                  <div className="relative aspect-4/5">
                    <img
                      src={t.image}
                      alt={t.name}
                      className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <video
                      key={`${t.id}-video`}
                      src={t.video}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-void via-void/25 to-transparent" />
                    <div className="glass-chip absolute inset-x-3 bottom-3 max-w-[calc(100%-1.5rem)] rounded-md border border-paper/10 bg-void/45 px-2.5 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition-transform duration-300 group-hover:-translate-y-0.5">
                      <p className="text-[7px] uppercase tracking-[0.22em] text-blue-2">{t.role}</p>
                      <p className="mt-1 font-serif text-[1rem] leading-[1] tracking-[-0.04em] text-paper sm:text-[1.15rem]">
                        {t.name}
                      </p>
                      <p className="mt-2 max-h-0 overflow-hidden text-[10px] leading-relaxed text-paper/75 transition-all duration-300 group-hover:max-h-20">
                        {t.line}
                      </p>
                    </div>
                    <span className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-paper/15 bg-void/55 px-2 py-1 text-[7px] uppercase tracking-[0.18em] text-paper/85 backdrop-blur-sm">
                      Play intro
                    </span>
                  </div>
                </button>
              </article>
            </Reveal>
          ))}
        </div>

        {activeMember ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-paper/10 bg-ink shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
              <button
                type="button"
                onClick={() => setActiveMember(null)}
                className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-paper/10 bg-void/70 text-xl text-paper transition-colors hover:bg-void"
                aria-label="Close video"
              >
                ×
              </button>
              <div className="relative overflow-hidden bg-black">
                <video
                  ref={modalVideoRef}
                  key={`${activeMember.id}-modal`}
                  src={activeMember.video}
                  autoPlay
                  muted
                  playsInline
                  controls
                  className="aspect-video w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-3 border-t border-paper/10 bg-void/80 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-blue-2">{activeMember.role}</p>
                  <p className="font-serif text-2xl text-paper sm:text-3xl">{activeMember.name}</p>
                </div>
                <p className="max-w-xl text-sm leading-relaxed text-mist">{activeMember.line}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-10 grid gap-3 grid-cols-2 mobile-2up md:grid-cols-3">
          <Reveal className="h-full">
            <ToolCard
              to="/look"
              icon={<Layers3 className="size-5 text-blue" />}
              title="Look-Through"
              body="Drop a venue photo. Overlay the dress. Approve the room before we truck a drape."
            />
          </Reveal>
          <Reveal delay={0.06} className="h-full">
            <ToolCard
              to="/match"
              icon={<Aperture className="size-5 text-blue" />}
              title="Match"
              body="A mood or goal in. A package out — so the quote is not a guess."
            />
          </Reveal>
          <Reveal delay={0.12} className="h-full">
            <ToolCard
              to={pulseId ? `/live/${pulseId}` : "/look"}
              icon={<Radar className="size-5 text-blue" />}
              title="Pulse"
              body="Run-of-show, sound check, setup — live with the client. No PDF from this morning."
            />
          </Reveal>
        </div>
        <div className="mt-4 grid gap-3 grid-cols-2 mobile-2up md:grid-cols-2">
          <Reveal className="h-full">
            <ToolCard
              to="/quote"
              icon={<Clapperboard className="size-5 text-blue" />}
              title="Quote → sign → deposit"
              body="Ballpark in seconds, contract on the same screen, 30% to lock the date."
            />
          </Reveal>
          <Reveal delay={0.06} className="h-full">
            <ToolCard
              to="/studio"
              icon={<AudioLines className="size-5 text-blue" />}
              title="Studio desk"
              body="Pipeline, gear, call sheets, vendors — the part most pretty sites skip."
            />
          </Reveal>
        </div>
      </section>

      <section className="relative z-1 border-t border-paper/10 bg-ink/70 backdrop-blur-sm">
        <div className="shell py-20 text-center md:py-28">
          <Reveal>
            <h2 className="mx-auto max-w-4xl font-serif text-4xl text-paper md:text-5xl lg:text-6xl">
              Tell us the moment. We will build the story around it.
            </h2>
            <p className="section-lead mx-auto mt-5 max-w-xl">
              Wedding, brand launch, gala, private sherehe, live stage, or campaign — one clear brief is where the real experience begins.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/quote">
                <Button variant="primary" size="lg">
                  Start a project
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

      <ArchiveStrip />

      <SiteFooter />
    </div>
  );
}

function Header({ title }: { title: string }) {
  return (
    <h2 className="section-title leading-[0.92] tracking-[-0.07em]">{title}</h2>
  );
}

function StatsTicker() {
  const [items, setItems] = useState(() => [...STATS, ...STATS, ...STATS]);

  useEffect(() => {
    let on = true;
    getPublicStats()
      .then((s) => {
        if (!on) return;
        const real = [
          { value: s.delivered || STATS[0].value, label: "events delivered", suffix: "" },
          { value: STATS[1].value, label: STATS[1].label, suffix: STATS[1].suffix },
          { value: s.campaigns || STATS[2].value, label: "brand campaigns shipped", suffix: "" },
          { value: STATS[3].value, label: STATS[3].label, suffix: STATS[3].suffix },
        ];
        setItems([...real, ...real, ...real]);
      })
      .catch(() => undefined);
    return () => {
      on = false;
    };
  }, []);

  return (
    <div className="relative overflow-hidden border-y border-paper/10 bg-ink/80 py-4 backdrop-blur-sm md:py-5">
      <div className="ticker-track flex w-max gap-8 pr-8 md:gap-16 md:pr-16">
        {items.map((s, i) => (
          <div key={`${s.label}-${i}`} className="flex items-baseline gap-2 whitespace-nowrap md:gap-3">
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

function ArchiveStrip() {
  return (
    <section className="shell relative z-1 py-16 md:py-20">
      <Reveal>
        <Header title="A living timeline. Just scroll the years." />
      </Reveal>
      <ol className="mt-10 space-y-0">
        {TIMELINE.map((t, i) => (
          <li
            key={t.title}
            className="grid grid-cols-1 items-start gap-3 py-4 md:grid-cols-[140px_16px_1fr] md:gap-4 xl:grid-cols-[160px_20px_1fr]"
          >
            <p className="pt-1 text-xs uppercase tracking-[0.16em] text-mist">{t.date}</p>
            <div className="relative flex justify-center">
              <span className="mt-2 size-2 rounded-full bg-blue" />
              {i < TIMELINE.length - 1 ? (
                <span className="absolute top-4 -bottom-9 w-px bg-paper/15" />
              ) : null}
            </div>
            <Reveal delay={Math.min(i, 5) * 0.04}>
              <GlassCard className="p-5">
                <p className="eyebrow text-blue-2">{t.service}</p>
                <p className="feature-title">{t.title}</p>
                <p className="mt-1 text-sm text-mist">{t.stat}</p>
              </GlassCard>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ToolCard({
  to,
  icon,
  title,
  body,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link to={to} className="glass glass-lift group relative block h-full overflow-hidden rounded-lg p-4 md:p-6">
      <span aria-hidden className="glass-sheen" />
      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          {icon}
          <ArrowRight className="size-4 text-mist transition-transform duration-200 group-hover:translate-x-1 group-hover:text-paper" />
        </div>
        <h3 className="feature-title">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-mist">{body}</p>
      </div>
    </Link>
  );
}
