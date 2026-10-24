import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-void px-5">
      <img
        src="/images/hero-gala.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover opacity-35 ken-burn"
      />
      <div className="absolute inset-0 bg-void/70" />
      <div className="glass-strong relative w-full max-w-md rounded-xl p-8">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="Randy Production" className="h-12 w-12 object-cover" />
          <span className="text-[11px] uppercase tracking-[0.28em] text-mist">Randy Production</span>
        </Link>
        <h1 className="font-serif text-4xl text-paper">Enter the floor.</h1>
        <p className="mt-2 text-sm text-mist">
          Client portal for bookings. Studio desk for the crew. Same login.
        </p>
        <div className="mt-8 grid gap-3">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="paper"
                onClick={() => signIn(p.providerId, { callbackURL: "/portal" })}
              >
                Continue with {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-mist">Sign-in is disabled.</p>
          )}
        </div>
      </div>
    </main>
  );
}
