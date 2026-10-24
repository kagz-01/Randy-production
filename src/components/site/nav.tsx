import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/work", label: "Work" },
  { to: "/quote", label: "Quote" },
  { to: "/match", label: "Match" },
  { to: "/look", label: "Look-Through" },
  { to: "/live/job_meridian", label: "Pulse" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isPending } = useCurrentUserState();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6">
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-lg px-3 py-2 transition-[background-color,backdrop-filter,box-shadow] duration-200",
          scrolled || open ? "glass-strong" : "bg-transparent",
        )}
      >
        <Link to="/" className="flex items-center gap-3 pl-1" onClick={() => setOpen(false)}>
          <img src="/logo.png" alt="Randy Production" className="logo-mark h-9 w-9 rounded-sm" />
          <span className="hidden font-sans text-[11px] uppercase tracking-[0.28em] text-paper/80 sm:block">
            Randy Production
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-sm px-3 py-2 text-xs uppercase tracking-[0.16em] text-mist transition-colors hover:text-paper"
              activeProps={{ className: "text-paper" }}
            >
              {l.label}
            </Link>
          ))}
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
        <div className="glass-strong mx-auto mt-2 max-w-6xl rounded-lg p-4 lg:hidden">
          <div className="grid gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-sm text-paper"
              >
                {l.label}
              </Link>
            ))}
            <Link to="/portal" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm text-paper">
              Client portal
            </Link>
            <Link to="/studio" onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm text-paper">
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
    <footer className="relative mt-24 border-t border-paper/10 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <img src="/logo.png" alt="" className="logo-mark mb-4 h-12 w-12" />
          <p className="font-serif text-3xl text-paper">Proof, not prose.</p>
          <p className="mt-2 max-w-sm text-sm text-mist">
            Production, brand, sound and decor on one floor. Nairobi, and wherever the room is.
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-xs uppercase tracking-[0.18em] text-mist">
          <Link to="/work" className="hover:text-paper">Work</Link>
          <Link to="/quote" className="hover:text-paper">Quote</Link>
          <Link to="/look" className="hover:text-paper">Look-Through</Link>
          <Link to="/studio" className="hover:text-paper">Studio</Link>
        </div>
      </div>
    </footer>
  );
}
