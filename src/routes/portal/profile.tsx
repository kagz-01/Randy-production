import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowLeft, Mail, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe } from "@/lib/server/studio";

export const Route = createFileRoute("/portal/profile")({ component: ClientProfile });

function ClientProfile() {
  const { user, isPending } = useCurrentUserState();
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;
  const displayName = user?.isDevFallback
    ? "Randy Production"
    : user?.displayName || "Not provided";
  const email = user?.isDevFallback
    ? "Not shown in presentation mode"
    : user?.primaryEmail || "Not provided";

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setRole(null);
    setError(null);
    getMe()
      .then((profile) => {
        if (active) setRole(profile.role);
      })
      .catch((cause) => {
        console.error("[client-profile] Could not verify workspace role", cause);
        if (active) setError("Your profile could not be verified. Please refresh and try again.");
      });

    return () => {
      active = false;
    };
  }, [userId]);

  if (isPending) return <div className="min-h-dvh bg-void" />;
  if (!user) return <RedirectToSignIn />;
  if (!user.isDevFallback && (role === "staff" || role === "admin")) {
    return <Navigate to="/studio/profile" />;
  }

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="shell pb-20 pt-28">
        <Link
          to="/portal"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-mist transition-colors hover:text-paper"
        >
          <ArrowLeft className="size-4" />
          Client workspace
        </Link>

        <header className="mt-7 border-b border-paper/10 pb-6">
          <p className="eyebrow">Client account</p>
          <h1 className="mt-2 text-4xl md:text-5xl">Your profile.</h1>
          <p className="mt-3 max-w-xl text-sm text-mist">
            The account details connected to your Randy Production workspace.
          </p>
        </header>

        {error ? (
          <p role="alert" className="mt-6 max-w-xl text-sm text-red-300">
            {error}
          </p>
        ) : role === null && !user.isDevFallback ? (
          <p className="mt-6 text-sm text-mist">Verifying your account…</p>
        ) : role && role !== "client" && !user.isDevFallback ? (
          <p role="alert" className="mt-6 max-w-xl text-sm text-red-300">
            Your account does not have client workspace access.
          </p>
        ) : (
          <section className="mt-7 max-w-2xl rounded-xl border border-paper/10 bg-ink/75 p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full border border-paper/15 bg-paper/[0.06] text-lg font-semibold text-paper">
                R
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-paper">{displayName}</p>
                <p className="mt-1 text-sm text-mist">Client account</p>
              </div>
            </div>

            <dl className="mt-6 grid gap-3 border-t border-paper/10 pt-5 sm:grid-cols-2">
              <div className="rounded-lg bg-paper/[0.035] p-4">
                <dt className="flex items-center gap-2 text-xs font-medium text-mist">
                  <UserRound className="size-4" />
                  Name
                </dt>
                <dd className="mt-2 break-words text-sm text-paper">{displayName}</dd>
              </div>
              <div className="rounded-lg bg-paper/[0.035] p-4">
                <dt className="flex items-center gap-2 text-xs font-medium text-mist">
                  <Mail className="size-4" />
                  Email
                </dt>
                <dd className="mt-2 break-all text-sm text-paper">{email}</dd>
              </div>
            </dl>

            <p className="mt-5 text-xs leading-relaxed text-mist">
              To update these details, contact the Randy Production team.
            </p>
            <Link to="/portal" className="mt-6 inline-flex">
              <Button variant="primary" className="min-h-11">
                Back to your projects
              </Button>
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
