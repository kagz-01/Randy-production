import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SignOutButton, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getLivePulse, getMe } from "@/lib/server/studio";
import { getWorkspaceNavigation } from "@/lib/workspace-navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/work", label: "Our Work" },
  { to: "/transparency", label: "Studio Updates" },
  { to: "/quote", label: "Get a Quote" },
  { to: "/match", label: "Help Me Choose" },
  { to: "/look", label: "Plan Your Event" },
];

const STUDIO_TOOLS = [
  { to: "/studio/gear", label: "Gear" },
  { to: "/studio/vendors", label: "Vendors" },
  { to: "/studio/merch", label: "Merch" },
  { to: "/studio/marketing", label: "Case Forge" },
] as const;

const PUBLIC_LINK_SECTIONS = [
  { label: "Explore", links: LINKS.slice(0, 3) },
  { label: "Plan", links: LINKS.slice(3) },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pulse, setPulse] = useState<{ id: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id;
  const pathname = useLocation({ select: (location) => location.pathname });
  const isStudio = pathname.startsWith("/studio");
  const isPortal = pathname.startsWith("/portal");
  const isAdminWorkspace = pathname.startsWith("/admin");
  const isWorkspace = isStudio || isPortal || isAdminWorkspace;
  const workspaceNavigation = getWorkspaceNavigation(role, user?.isDevFallback);
  const isAdmin = !user?.isDevFallback && role === "admin";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      return;
    }

    let active = true;
    setRole(null);
    getMe()
      .then((profile) => {
        if (active) setRole(profile.role);
      })
      .catch((error) => {
        console.error("[site-nav] Could not verify workspace role", error);
        if (active) setRole(null);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (isWorkspace) {
      setPulse(null);
      return;
    }
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
  }, [isWorkspace]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

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
              src="/logo/logo.png"
              alt="Randy Production"
              className="logo-mark h-full w-full object-cover"
            />
          </div>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.28em] text-paper/85 sm:block">
            Randy Production
          </span>
          {import.meta.env.VITE_RANDY_PREVIEW_FIXTURES === "true" ? (
            <span className="rounded-full border border-amber-200/25 bg-amber-200/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-100">
              Fixture data
            </span>
          ) : null}
        </Link>

        {!isWorkspace ? (
          <nav className="hidden items-center gap-1 rounded-full border border-paper/5 bg-paper/1.5 px-1 py-1 lg:flex">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-mist transition-all duration-200 hover:bg-paper/4 hover:text-paper"
                activeProps={{
                  className:
                    "bg-paper/[0.045] text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
            {pulse ? (
              <Link
                to="/live/$projectId"
                params={{ projectId: pulse.id }}
                className="rounded-full px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-mist transition-all duration-200 hover:bg-paper/4 hover:text-paper"
                activeProps={{
                  className:
                    "bg-paper/[0.045] text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
                }}
              >
                Pulse
              </Link>
            ) : null}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {isAdmin && isAdminWorkspace ? (
            <Link
              to="/studio"
              className="hidden rounded-md px-3 py-2 text-xs font-medium text-mist transition-colors hover:bg-paper/5 hover:text-paper sm:inline-flex"
            >
              Studio workspace
            </Link>
          ) : null}
          {isAdmin && isStudio ? (
            <Link
              to="/admin"
              className="hidden rounded-md px-3 py-2 text-xs font-medium text-mist transition-colors hover:bg-paper/5 hover:text-paper sm:inline-flex"
            >
              Admin workspace
            </Link>
          ) : null}
          {isPending ? (
            <div className="size-9 animate-pulse rounded-md bg-paper/10" />
          ) : user ? (
            <>
              {!isWorkspace ? (
                user.isDevFallback || role !== null ? (
                  <Link
                    to={workspaceNavigation.workspacePath}
                    aria-label={`Open ${workspaceNavigation.workspaceLabel}`}
                    className="inline-flex"
                  >
                    <Button variant="ghost" size="sm" className="min-h-11 px-2.5 text-xs sm:px-3">
                      <span className="sm:hidden">Dashboard</span>
                      <span className="hidden sm:inline">{workspaceNavigation.workspaceLabel}</span>
                    </Button>
                  </Link>
                ) : null
              ) : null}
              <UserButton to={workspaceNavigation.profilePath} />
              <SignOutButton className="hidden min-h-11 sm:inline-flex" />
            </>
          ) : (
            <Link to="/login">
              <Button variant="paper" size="sm" className="min-h-11">
                Sign in
              </Button>
            </Link>
          )}
          <button
            type="button"
            className="relative size-11 rounded-md text-paper lg:hidden after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-1/2"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-mobile-menu"
          >
            {open ? <X className="mx-auto size-5" /> : <Menu className="mx-auto size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="site-mobile-menu"
          aria-label="Mobile navigation"
          className="shell mt-2 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl border border-paper/10 bg-ink/98 p-3 shadow-[0_20px_56px_rgb(0_0_0/0.48)] backdrop-blur-xl lg:hidden"
        >
          <div className="flex flex-col gap-1">
            {!isWorkspace ? (
              <>
                {PUBLIC_LINK_SECTIONS.map((section) => (
                  <section key={section.label} aria-label={section.label}>
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">
                      {section.label}
                    </p>
                    {section.links.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2",
                          link.to === "/quote"
                            ? "mt-1 border border-blue-2/25 bg-blue-2/10 font-medium text-paper hover:bg-blue-2/15"
                            : "text-paper/80 hover:bg-paper/6 hover:text-paper",
                        )}
                        activeProps={{ className: "bg-paper/[0.08] text-paper" }}
                        activeOptions={{ exact: link.to === "/" }}
                      >
                        {link.label}
                        <span aria-hidden className="text-mist/60">
                          →
                        </span>
                      </Link>
                    ))}
                  </section>
                ))}
              </>
            ) : null}
            {!isWorkspace && pulse ? (
              <Link
                to="/live/$projectId"
                params={{ projectId: pulse.id }}
                onClick={() => setOpen(false)}
                className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
              >
                Pulse
                <span aria-hidden className="text-mist/60">
                  →
                </span>
              </Link>
            ) : null}
            {isStudio ? (
              <>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">
                  Studio
                </p>
                <Link
                  to="/studio"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
                  activeProps={{ className: "bg-paper/[0.08] text-paper" }}
                  activeOptions={{ exact: true }}
                >
                  Desk
                  <span aria-hidden className="text-mist/60">
                    →
                  </span>
                </Link>
                {[
                  ["Jobs", "/studio/pipeline"],
                  ["Briefs", "/studio/briefs"],
                  ["Client reviews", "/studio/reviews"],
                  ["Run sheet", "/studio/runsheet"],
                  ["Crew", "/studio/crew"],
                  ["Team chat", "/studio/collaboration"],
                ].map(([label, to]) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
                    activeProps={{ className: "bg-paper/[0.08] text-paper" }}
                  >
                    {label}
                    <span aria-hidden className="text-mist/60">
                      →
                    </span>
                  </Link>
                ))}
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">
                  Tools
                </p>
                {STUDIO_TOOLS.map((tool) => (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
                    activeProps={{ className: "bg-paper/[0.08] text-paper" }}
                  >
                    {tool.label}
                    <span aria-hidden className="text-mist/60">
                      →
                    </span>
                  </Link>
                ))}
                {isAdmin ? (
                  <>
                    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">
                      Separate workspace
                    </p>
                    <Link
                      to="/admin"
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper"
                    >
                      Admin workspace
                      <span aria-hidden className="text-mist/60">
                        →
                      </span>
                    </Link>
                  </>
                ) : null}
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">
                  Visit
                </p>
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper"
                >
                  Public website
                  <span aria-hidden className="text-mist/60">
                    →
                  </span>
                </Link>
              </>
            ) : null}
            {isAdminWorkspace ? (
              <>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">
                  Administration
                </p>
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper"
                >
                  Admin dashboard
                  <span aria-hidden className="text-mist/60">
                    →
                  </span>
                </Link>
                <Link
                  to="/admin/receipts"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper"
                >
                  Finance &amp; receipts
                  <span aria-hidden className="text-mist/60">
                    →
                  </span>
                </Link>
                <Link
                  to="/studio"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper"
                >
                  Studio workspace
                  <span aria-hidden className="text-mist/60">
                    →
                  </span>
                </Link>
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper"
                >
                  Public website
                  <span aria-hidden className="text-mist/60">
                    →
                  </span>
                </Link>
              </>
            ) : null}
            {isPortal ? (
              <>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">
                  Client
                </p>
                <Link
                  to="/portal"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
                  activeProps={{ className: "bg-paper/[0.08] text-paper" }}
                  activeOptions={{ exact: true }}
                >
                  Client workspace
                  <span aria-hidden className="text-mist/60">
                    →
                  </span>
                </Link>
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm text-paper/80 transition-colors hover:bg-paper/6 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
                >
                  Public website
                  <span aria-hidden className="text-mist/60">
                    →
                  </span>
                </Link>
              </>
            ) : null}
            {!isWorkspace && user ? (
              <Link
                to={workspaceNavigation.workspacePath}
                onClick={() => setOpen(false)}
                className="mt-2 flex min-h-11 w-full items-center justify-between rounded-lg border-t border-paper/10 px-3 pt-3 text-sm font-medium text-paper transition-colors hover:bg-paper/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
              >
                Open {workspaceNavigation.workspaceLabel}
                <span aria-hidden className="text-mist/60">
                  →
                </span>
              </Link>
            ) : null}
            {!user ? (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="mt-2 flex min-h-11 w-full items-center justify-between rounded-lg border-t border-paper/10 px-3 pt-2 text-sm font-medium text-paper transition-colors hover:bg-paper/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
              >
                Sign in or create an account
                <span aria-hidden className="text-mist/60">
                  →
                </span>
              </Link>
            ) : null}
            {user ? (
              <div className="mt-2 border-t border-paper/10 px-3 pb-1 pt-3">
                <p className="truncate text-xs text-mist">
                  {user.isDevFallback
                    ? "Randy Production"
                    : (user.displayName ?? user.primaryEmail ?? "Randy Production account")}
                </p>
                <Link
                  to={workspaceNavigation.profilePath}
                  onClick={() => setOpen(false)}
                  className="mt-2 flex min-h-11 items-center justify-between rounded-lg text-sm text-paper/80 transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
                >
                  My profile
                  <span aria-hidden className="text-mist/60">
                    →
                  </span>
                </Link>
                <SignOutButton className="mt-2 min-h-11 w-full rounded-lg text-left text-paper/70 hover:bg-paper/6 hover:text-paper" />
              </div>
            ) : null}
          </div>
        </nav>
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
            <img
              src="/logo/logo.png"
              alt="Randy Production"
              className="logo-mark h-12 w-12 sm:h-14 sm:w-14"
            />
            <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-paper/80">
              Randy Production
            </span>
          </div>
          <p className="font-serif text-[2rem] leading-[0.96] tracking-[-0.06em] text-paper md:text-[2.6rem]">
            Work people remember.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-mist md:text-[0.96rem]">
            Integrated production for weddings, launches, live events, and brand stories — planned
            with precision, staged with intention, and delivered without the usual agency drag.
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
                className="rounded-full border border-paper/10 bg-paper/2 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-mist transition-all duration-200 hover:border-paper/15 hover:text-paper"
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
