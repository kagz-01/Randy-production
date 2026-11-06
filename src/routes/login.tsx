import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { invite?: string } => (
    typeof search.invite === "string" ? { invite: search.invite } : {}
  ),
  component: Login,
});

function Login() {
  const { invite } = Route.useSearch();
  const googleProvider = GROK_PROVIDERS[0];
  const callbackURL = invite ? `/studio?invite=${encodeURIComponent(invite)}` : "/portal";

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5">
      <img
        src="/catalog/wedding/GRA08375.webp"
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-35 ken-burn"
      />
      <div className="absolute inset-0 bg-void/70" />
      <div className="glass-strong relative w-full max-w-md overflow-hidden rounded-xl p-8">
        <span aria-hidden className="glass-sheen" />
        <div className="relative">
          <Link to="/" className="mb-8 flex items-center gap-3">
            <img src="/logo.png" alt="Randy Production" className="h-12 w-12 object-cover" />
            <span className="text-[11px] uppercase tracking-[0.28em] text-mist">Randy Production</span>
          </Link>
          <h1 className="font-serif text-4xl text-paper">{invite ? "Join the Studio." : "Your Randy Production account."}</h1>
          <p className="mt-2 text-sm text-mist">
            {invite
              ? "Continue with the email address this invitation was sent to. Your account is created the first time you continue."
              : "Sign in to your client workspace, or continue to create a client account. Studio access is private and invitation-only."}
          </p>
          <div className="mt-8 grid gap-3">
            {authEnabled ? (
              <>
                {googleProvider ? (
                  <Button
                    type="button"
                    variant="paper"
                    onClick={() => signIn(googleProvider.providerId, { callbackURL })}
                  >
                    {invite ? "Continue with invited Google account" : "Continue with Google"}
                  </Button>
                ) : null}
                <p className="text-center text-xs leading-relaxed text-mist">
                  {invite
                    ? "The invited email must be verified before Studio access can be activated."
                    : "First time here? Continuing with Google securely creates a client account. Staff and Admin access is granted separately."}
                </p>
              </>
            ) : (
              <p className="text-sm text-mist">Sign-in is disabled.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
