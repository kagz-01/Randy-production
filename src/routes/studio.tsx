import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe, joinStudio } from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({
  component: StudioLayout,
});

const TABS = [
  { to: "/studio", label: "Desk", exact: true },
  { to: "/studio/pipeline", label: "Pipeline" },
  { to: "/studio/gear", label: "Gear" },
  { to: "/studio/crew", label: "Crew" },
  { to: "/studio/vendors", label: "Vendors" },
  { to: "/studio/marketing", label: "Case Forge" },
] as const;

function StudioLayout() {
  const { user, isPending } = useCurrentUserState();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getMe()
      .then((p) => setRole(p.role))
      .catch(() => setRole("client"));
  }, [user]);

  if (isPending || (user && role === null)) return <div className="min-h-dvh bg-void" />;
  if (!user) return <RedirectToSignIn />;

  if (role !== "staff") {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <main className="mx-auto max-w-xl px-5 pt-32">
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Studio desk</p>
          <h1 className="mt-3 font-serif text-5xl">Crew only.</h1>
          <p className="mt-3 text-mist">
            Pipeline, gear, call sheets, Pulse. Join the floor to run the desk.
          </p>
          <Button
            className="mt-8"
            onClick={async () => {
              await joinStudio();
              setRole("staff");
            }}
          >
            Join the studio floor
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <div className="mx-auto max-w-6xl px-5 pt-24 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Studio desk</p>
            <h1 className="font-serif text-4xl">The floor</h1>
          </div>
          <Link to="/studio/live/$projectId" params={{ projectId: "job_meridian" }}>
            <Button variant="line" size="sm">
              <span className="live-dot mr-2 inline-block size-2 rounded-full bg-blue" />
              Tonight · Pulse
            </Button>
          </Link>
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="h-11 shrink-0 rounded-md px-4 text-xs uppercase tracking-[0.16em] text-mist"
              activeOptions={{ exact: "exact" in t && t.exact }}
              activeProps={{ className: "bg-paper text-void" }}
              inactiveProps={{ className: "glass" }}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
      <Outlet />
    </div>
  );
}
