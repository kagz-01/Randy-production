import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getLivePulse, getMe, joinStudio } from "@/lib/server/studio";

export const Route = createFileRoute("/studio")({
  component: StudioLayout,
});

const TABS = [
  { to: "/studio", label: "Desk", exact: true },
  { to: "/studio/admin", label: "Admin" },
  { to: "/studio/briefs", label: "Briefs" },
  { to: "/studio/runsheet", label: "Run sheet" },
  { to: "/studio/pipeline", label: "Pipeline" },
  { to: "/studio/receipts", label: "Receipts" },
  { to: "/studio/gear", label: "Gear" },
  { to: "/studio/crew", label: "Crew" },
  { to: "/studio/vendors", label: "Vendors" },
  { to: "/studio/marketing", label: "Case Forge" },
] as const;

function StudioLayout() {
  const { user, isPending } = useCurrentUserState();
  const [role, setRole] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [pulse, setPulse] = useState<{ id: string; title: string; live: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    getMe()
      .then((p) => setRole(p.role))
      .catch(() => setRole("client"));
  }, [user]);

  useEffect(() => {
    let on = true;
    getLivePulse()
      .then((r) => {
        if (on) setPulse(r);
      })
      .catch(() => {
        if (on) setPulse(null);
      });
    return () => {
      on = false;
    };
  }, []);

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
            Pipeline, gear, call sheets, Pulse. First account joins free; after that an invite code is required.
          </p>
          <div className="mt-6 grid gap-3">
            <Input
              placeholder="Invite code (after first staff)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              autoComplete="off"
            />
            {joinError ? <p className="text-sm text-red-400">{joinError}</p> : null}
            <Button
              disabled={joining}
              onClick={async () => {
                setJoining(true);
                setJoinError(null);
                try {
                  await joinStudio({ data: { inviteCode: inviteCode.trim() || undefined } });
                  setRole("staff");
                } catch {
                  setJoinError("Invite code required. Ask an existing crew member for STAFF_INVITE_CODE.");
                } finally {
                  setJoining(false);
                }
              }}
            >
              {joining ? "Joining…" : "Join the studio floor"}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <div className="shell pt-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Studio desk</p>
            <h1 className="font-serif text-4xl">The floor</h1>
          </div>
          {pulse ? (
            <Link to="/studio/live/$projectId" params={{ projectId: pulse.id }}>
              <Button variant="line" size="sm">
                <span className="live-dot mr-2 inline-block size-2 rounded-full bg-blue" />
                {pulse.live ? "Live" : "Next"} · {pulse.title}
              </Button>
            </Link>
          ) : null}
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
