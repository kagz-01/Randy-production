import { createFileRoute, Link, Navigate, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { acceptStudioInvite, getLivePulse, getMe } from "@/lib/server/studio";

export const Route = createFileRoute("/studio")({
  validateSearch: (search: Record<string, unknown>): { invite?: string } => (
    typeof search.invite === "string" ? { invite: search.invite } : {}
  ),
  component: StudioLayout,
});

const WORKFLOWS = [
  { to: "/studio", label: "Desk", exact: true, icon: LayoutDashboard },
  { to: "/studio/pipeline", label: "Jobs", icon: BriefcaseBusiness },
  { to: "/studio/briefs", label: "Briefs", icon: FileText },
  { to: "/studio/reviews", label: "Client reviews", icon: ClipboardCheck },
  { to: "/studio/runsheet", label: "Run sheet", icon: CalendarDays },
  { to: "/studio/crew", label: "Crew", icon: Users },
  { to: "/studio/collaboration", label: "Team chat", icon: MessageSquare },
] as const;

const TOOLS = [
  { to: "/studio/gear", label: "Gear", icon: Boxes },
  { to: "/studio/vendors", label: "Vendors", icon: Store },
  { to: "/studio/marketing", label: "Case Forge", icon: Sparkles },
] as const;

function StudioLayout() {
  const { invite } = Route.useSearch();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const { user, isPending } = useCurrentUserState();
  const [role, setRole] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleRetry, setRoleRetry] = useState(0);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [pulse, setPulse] = useState<{ id: string; title: string; live: boolean } | null>(null);
  const [pulseError, setPulseError] = useState(false);
  const [pulseRetry, setPulseRetry] = useState(0);
  const isDesk = pathname === "/studio" || pathname === "/studio/";

  useEffect(() => {
    if (!user) {
      setRole(null);
      setRoleError(null);
      return;
    }
    let active = true;
    setRole(null);
    setRoleError(null);
    getMe()
      .then((p) => {
        if (active) setRole(p.role);
      })
      .catch((error) => {
        console.error("[studio] Could not verify workspace role", error);
        if (active) setRoleError("Studio access couldn’t be verified. Please retry.");
      });
    return () => {
      active = false;
    };
  }, [user, roleRetry]);

  useEffect(() => {
    if (role !== "staff" && role !== "admin") {
      setPulse(null);
      setPulseError(false);
      return;
    }
    let on = true;
    getLivePulse()
      .then((r) => {
        if (on) {
          setPulse(r);
          setPulseError(false);
        }
      })
      .catch((error) => {
        console.error("[studio] Could not load show status", error);
        if (on) {
          setPulse(null);
          setPulseError(true);
        }
      });
    return () => {
      on = false;
    };
  }, [role, pulseRetry]);

  if (isPending || (user && role === null && !roleError)) {
    return <div className="min-h-dvh bg-void" />;
  }
  if (!user) return invite ? <Navigate to="/login" search={{ invite }} /> : <RedirectToSignIn />;

  if (roleError) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <main className="mx-auto max-w-xl px-5 pt-32">
          <p role="alert" className="text-sm text-red-300">{roleError}</p>
          <Button
            type="button"
            variant="line"
            className="mt-4 min-h-11"
            onClick={() => setRoleRetry((count) => count + 1)}
          >
            Retry
          </Button>
        </main>
      </div>
    );
  }

  if (role !== "staff" && role !== "admin") {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <main className="mx-auto max-w-xl px-5 pt-32">
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Studio desk</p>
          <h1 className="mt-3 font-serif text-5xl">{invite ? "Your crew invite." : "Crew only."}</h1>
          <p className="mt-3 text-mist">
            {invite
              ? "Accept this single-use invitation to join the private Studio workspace."
              : "Studio is private to the production team. Ask an Admin for a personal invitation."}
          </p>
          {invite ? <div className="mt-6 grid gap-3">
            {inviteError ? <p role="alert" className="text-sm text-red-400">{inviteError}</p> : null}
            <Button
              disabled={accepting}
              onClick={async () => {
                setAccepting(true);
                setInviteError(null);
                try {
                  await acceptStudioInvite({ data: { token: invite } });
                  setRole("staff");
                  await navigate({ to: "/studio/profile" });
                } catch (error) {
                  console.error("[studio] Could not accept staff invitation", error);
                  setInviteError(error instanceof Error ? error.message : "The invitation could not be accepted.");
                } finally {
                  setAccepting(false);
                }
              }}
            >
              {accepting ? "Accepting…" : "Accept invitation"}
            </Button>
          </div> : null}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <div className="mx-auto grid w-full max-w-[1480px] gap-6 pt-24 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:px-6">
        <aside className="sticky top-24 hidden max-h-[calc(100dvh-6rem)] min-w-0 self-start overflow-y-auto lg:block">
          <nav aria-label="Studio navigation" className="border-r border-paper/10 py-2 pr-5">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">
              Studio
            </p>
            <div className="grid gap-1">
              {WORKFLOWS.map((workflow) => {
                const Icon = workflow.icon;
                return (
                  <Link
                    key={workflow.to}
                    to={workflow.to}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-mist transition-colors hover:bg-paper/[0.05] hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
                    activeOptions={{ exact: "exact" in workflow && workflow.exact }}
                    activeProps={{ className: "bg-paper/[0.08] text-paper hover:bg-paper/[0.1]" }}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {workflow.label}
                  </Link>
                );
              })}
            </div>
            <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist">
              Tools
            </p>
            <div className="grid gap-1">
              {TOOLS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-mist transition-colors hover:bg-paper/[0.05] hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
                    activeProps={{ className: "bg-paper/[0.08] text-paper hover:bg-paper/[0.1]" }}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {tool.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>
        <section className="min-w-0">
          <header className="shell flex min-h-7 flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-2">
              Randy Production <span className="px-1.5 text-mist/50">/</span> Studio
            </p>
            {pulse && !isDesk ? (
              <Link to="/studio/live/$projectId" params={{ projectId: pulse.id }}>
                <Button variant="line" size="sm" className="min-h-11">
                  <span className={pulse.live ? "live-dot mr-2 inline-block size-2 rounded-full bg-blue" : "mr-2 inline-block size-2 rounded-full bg-blue/60"} />
                  {pulse.live ? "Show day" : "Next show"} · {pulse.title}
                </Button>
              </Link>
            ) : null}
            {pulseError && !isDesk ? (
              <button
                type="button"
                onClick={() => setPulseRetry((count) => count + 1)}
                className="min-h-11 text-xs text-mist underline decoration-paper/25 underline-offset-4 hover:text-paper"
              >
                Show status unavailable · Retry
              </button>
            ) : null}
          </header>
          <nav aria-label="Studio navigation" className="shell mt-3 lg:hidden">
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-2">
              {[...WORKFLOWS, ...TOOLS].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-paper/10 px-3 text-xs font-medium text-mist transition-colors hover:bg-paper/[0.05] hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2"
                    activeOptions={{ exact: "exact" in item && item.exact }}
                    activeProps={{ className: "bg-paper/[0.08] text-paper hover:bg-paper/[0.1]" }}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          <Outlet />
        </section>
      </div>
    </div>
  );
}
