import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getLivePulse } from "@/lib/server/studio";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/work", label: "Portfolio" },
  { to: "/quote", label: "Quote" },
  { to: "/match", label: "Match" },
  { to: "/look", label: "Venue" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pulse, setPulse] = useState<{ id: string } | null>(null);
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let on = true;
    getLivePulse()
      .then((r) => {
        if (on) setPulse(r ? { id: r.id } : null);
      })
      .catch(() => {
        if (on) setPulse(null);
      });
    return () => {
      on = false;
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-2 md:pt-3">
      <div
        className={cn(
          "shell flex items-center justify-between gap-3 rounded-full border border-paper/10 bg-void/78 px-2.5 py-2 shadow-[0_12px_30px_rgb(0_0_0/0.18)] backdrop-blur-xl transition-all duration-200",
          scrolled || open
            ? "border-paper/15 bg-void/85 shadow-[0_18px_42px_rgb(0_0_0/0.28)]"
            : "bg-void/72",
        )}
      >
        <Link to="/" className="flex items-center gap-3 pl-0.5" onClick={() => setOpen(false)}>
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[0.55rem] border border-paper/10 bg-paper/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:h-13 sm:w-13">
            <img
              src="/logo.png"
              alt="Randy Production"
              className="logo-mark h-full w-full object-cover"
            />
          </div>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.28em] text-paper/85 sm:block">
            Randy Production
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-paper/5 bg-paper/[0.015] px-1 py-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-mist transition-all duration-200 hover:bg-paper/[0.04] hover:text-paper"
              activeProps={{ className: "bg-paper/[0.045] text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          {pulse ? (
            <Link
              to="/live/$projectId"
              params={{ projectId: pulse.id }}
              className="rounded-full px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-mist transition-all duration-200 hover:bg-paper/[0.04] hover:text-paper"
              activeProps={{ className: "bg-paper/[0.045] text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" }}
            >
              Pulse
            </Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-2">
          {isPending ? (
            <div className="size-9 animate-pulse rounded-md bg-paper/10" />
          ) : user ? (
            <>
              <SignedIn>
                <Link to="/portal" className="hidden sm:block">
                  <Button variant="ghost" size="sm">
                    Portal
                  </Button>
                </Link>
                <Link to="/studio" className="hidden sm:block">
                  <Button variant="line" size="sm">
                    Studio
                  </Button>
                </Link>
                <UserButton />
              </SignedIn>
            </>
          ) : (
            <SignedOut>
              <Link to="/login">
                <Button variant="paper" size="sm">
                  Enter
                </Button>
              </Link>
            </SignedOut>
          )}
          <button
            type="button"
            className="relative size-11 rounded-md text-paper lg:hidden after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-1/2"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="mx-auto size-5" /> : <Menu className="mx-auto size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="shell mt-2 rounded-lg border border-paper/10 bg-void/95 p-3 shadow-[0_16px_40px_rgb(0_0_0/0.28)] lg:hidden">
          <div className="grid gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-paper"
                activeProps={{ className: "text-blue-2" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
            {pulse ? (
              <Link
                to="/live/$projectId"
                params={{ projectId: pulse.id }}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-paper"
              >
                Pulse
              </Link>
            ) : null}
            <Link to="/portal" onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm text-paper">
              Client portal
            </Link>
            <Link to="/studio" onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-sm text-paper">
              Studio desk
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-paper/10 bg-ink/70 py-12 md:py-16">
      <div className="shell flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <div className="mb-4 flex items-center gap-3">
            <img src="/logo.png" alt="Randy Production" className="logo-mark h-12 w-12 sm:h-14 sm:w-14" />
            <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-paper/80">
              Randy Production
            </span>
          </div>
          <p className="font-serif text-[2rem] leading-[0.96] tracking-[-0.06em] text-paper md:text-[2.6rem]">
            Work people remember.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-mist md:text-[0.96rem]">
            Integrated production for weddings, launches, live events, and brand stories — planned with precision,
            staged with intention, and delivered without the usual agency drag.
          </p>
        </div>

        <div className="flex flex-col gap-5 md:items-end">
          <div className="flex flex-wrap gap-2 md:justify-end">
            {[
              { to: "/", label: "Home" },
              { to: "/work", label: "Portfolio" },
              { to: "/quote", label: "Quote" },
              { to: "/look", label: "Venue" },
              { to: "/studio", label: "Studio" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full border border-paper/10 bg-paper/[0.02] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-mist transition-all duration-200 hover:border-paper/15 hover:text-paper"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <p className="text-[9px] uppercase tracking-[0.22em] text-mist">
            Nairobi • Kenya • Worldwide
          </p>
        </div>
      </div>
    </footer>
  );
}
