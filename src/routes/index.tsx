import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Aperture, AudioLines, Clapperboard, Layers3, Radar } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { SiteFooter, SiteNav } from "@/components/site/nav";
import { BeforeAfter } from "@/components/site/before-after";
import { Button } from "@/components/ui/button";
import { OUTCOMES, STATS, TEAM, TIMELINE, WORK } from "@/data/catalog";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  return (
    <div className="relative min-h-dvh overflow-x-hidden bg-void">
      <div className="pointer-events-none fixed inset-0 grain opacity-40" />
      <SiteNav />

      <section ref={heroRef} className="relative h-[100dvh] min-h-[640px] overflow-hidden">
        <motion.div style={{ y, scale }} className="absolute inset-0">
          <video
            className="size-full object-cover ken-burn"
            src="/videos/hero.mp4"
            poster="/images/hero-gala.jpg"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/35 to-void/20" />
          <div className="scan-line pointer-events-none absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-blue/20 to-transparent opacity-40" />
        </motion.div>
        <motion.div
          style={{ opacity }}
          className="relative z-10 flex h-full flex-col justify-end px-5 pb-16 md:px-12 md:pb-20"
        >
          <p className="reveal mb-4 text-[11px] uppercase tracking-[0.38em] text-blue-2">
            Production · Brand · Sound · Decor
          </p>
          <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] text-paper md:text-7xl lg:text-8xl">
            The room does the talking.
          </h1>
          <p className="mt-5 max-w-lg text-base text-paper/75 md:text-lg">
            No manifesto. A floor that sells the work, books the job, and runs the night.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/quote">
              <Button variant="primary" size="lg">
                Build a quote
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/work">
              <Button variant="line" size="lg">
                Watch the proof
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      <StatsTicker />

      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <Header kicker="Evidence" title="If it shipped, it lives here." />
        <div className="mt-10 grid gap-4 md:grid-cols-12">
          <Link to="/work" className="group relative md:col-span-7">
            <div className="relative aspect-[16/11] overflow-hidden rounded-lg">
              <img
                src="/images/hero-gala.jpg"
                alt="Meridian Gala"
                className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
              <div className="absolute right-4 bottom-4 left-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">Stage · 2026</p>
                <p className="font-serif text-3xl">Meridian Gala</p>
              </div>
            </div>
          </Link>
          <div className="grid gap-4 md:col-span-5">
            {WORK.slice(0, 2).map((w) => (
              <Link key={w.id} to="/work" className="group relative overflow-hidden rounded-lg">
                <div className="relative aspect-[16/8]">
                  <img
                    src={w.image}
                    alt={w.title}
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent" />
                  <div className="absolute right-4 bottom-3 left-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">{w.service}</p>
                    <p className="font-serif text-xl">{w.title}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 md:px-8">
        <Header kicker="Look-Through" title="Raw venue. Dressed room. Same photograph." />
        <p className="mt-3 max-w-xl text-mist">
          Clients swipe the night they bought — not a moodboard from another city.
        </p>
        <div className="mt-8">
          <BeforeAfter before="/images/venue-before.jpg" after="/images/venue-after.jpg" />
        </div>
        <div className="mt-6">
          <Link to="/look">
            <Button variant="line">
              Overlay your venue
              <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <Header kicker="The floor" title="Faces. Five seconds. Then the work." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((t, i) => (
            <article
              key={t.id}
              className="group relative overflow-hidden rounded-lg"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="relative aspect-[4/5]">
                <img
                  src={t.image}
                  alt={t.name}
                  className="size-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/25 to-transparent" />
                <div className="absolute right-4 bottom-4 left-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">{t.role}</p>
                  <p className="font-serif text-2xl">{t.name}</p>
                  <p className="mt-2 max-h-0 overflow-hidden text-sm text-paper/80 transition-all duration-300 group-hover:max-h-24">
                    {t.line}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-paper/10 bg-ink py-20">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <Header kicker="Outcomes" title="Logos are cheap. Numbers stay." />
          <div className="mt-10 grid gap-px bg-paper/10 sm:grid-cols-2 lg:grid-cols-3">
            {OUTCOMES.map((o) => (
              <div key={o.client} className="bg-ink p-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">{o.client}</p>
                <p className="mt-3 font-serif text-2xl text-paper">{o.line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <Header kicker="Archive" title="A living timeline. Filter nothing yet — just scroll the years." />
        <ol className="mt-12 space-y-0">
          {TIMELINE.map((t, i) => (
            <li key={t.title} className="grid grid-cols-[88px_16px_1fr] items-start gap-4 py-6 md:grid-cols-[140px_16px_1fr]">
              <p className="pt-1 text-xs uppercase tracking-[0.16em] text-mist">{t.date}</p>
              <div className="relative flex justify-center">
                <span className="mt-2 size-2 rounded-full bg-blue" />
                {i < TIMELINE.length - 1 ? (
                  <span className="absolute top-4 bottom-[-40px] w-px bg-paper/15" />
                ) : null}
              </div>
              <div className="glass rounded-lg p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">{t.service}</p>
                <p className="font-serif text-2xl">{t.title}</p>
                <p className="mt-1 text-sm text-mist">{t.stat}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
        <Header kicker="The OS" title="Three things agencies stitch together. We built them as one floor." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <ToolCard
            to="/look"
            icon={<Layers3 className="size-5 text-blue" />}
            title="Look-Through"
            body="Drop a venue photo. Overlay the dress. Clients approve the room before we truck a single drape."
          />
          <ToolCard
            to="/match"
            icon={<Aperture className="size-5 text-blue" />}
            title="Match"
            body="A mood board in. A decor + sound package out. Grok reads the references so the quote is not a guess."
          />
          <ToolCard
            to="/live/job_meridian"
            icon={<Radar className="size-5 text-blue" />}
            title="Pulse"
            body="Run-of-show, sound check, setup — live, shared with the client. No PDF from this morning."
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <ToolCard
            to="/quote"
            icon={<Clapperboard className="size-5 text-blue" />}
            title="Quote → sign → deposit"
            body="One flow. Ballpark in seconds, contract on the same screen, 30% to lock the date."
          />
          <ToolCard
            to="/studio"
            icon={<AudioLines className="size-5 text-blue" />}
            title="Studio desk"
            body="Pipeline, gear with service flags, call sheets, vendors. The part most pretty sites skip."
          />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Header({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">{kicker}</p>
      <h2 className="mt-3 max-w-3xl font-serif text-4xl text-paper md:text-5xl">{title}</h2>
    </div>
  );
}

function StatsTicker() {
  const items = [...STATS, ...STATS, ...STATS];
  return (
    <div className="relative overflow-hidden border-y border-paper/10 bg-ink py-5">
      <div className="ticker-track flex w-max gap-16 pr-16">
        {items.map((s, i) => (
          <div key={`${s.label}-${i}`} className="flex items-baseline gap-3 whitespace-nowrap">
            <span className="font-serif text-4xl tabular-nums text-paper">
              {s.value}
              {s.suffix}
            </span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-mist">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
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
    <Link to={to} className="glass group rounded-lg p-6 transition-[box-shadow] duration-200 hover:glow-blue">
      <div className="mb-6 flex items-center justify-between">
        {icon}
        <ArrowRight className="size-4 text-mist transition-transform duration-200 group-hover:translate-x-1 group-hover:text-paper" />
      </div>
      <h3 className="font-serif text-2xl">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-mist">{body}</p>
    </Link>
  );
}
