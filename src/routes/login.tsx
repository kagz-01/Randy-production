import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AUTH_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { invite?: string; returnTo?: "quote" } => ({
    ...(typeof search.invite === "string" ? { invite: search.invite } : {}),
    ...(search.returnTo === "quote" ? { returnTo: "quote" } : {}),
  }),
  component: Login,
});

function Login() {
  const { invite, returnTo } = Route.useSearch();
  const googleProvider = AUTH_PROVIDERS[0];
  const callbackURL = invite
    ? `/studio?invite=${encodeURIComponent(invite)}`
    : returnTo === "quote"
      ? "/quote"
      : "/portal";
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  async function handleGoogleSignIn() {
    if (!googleProvider || isSigningIn) return;
    setSignInError(null);
    setIsSigningIn(true);
    try {
      await signIn(googleProvider.providerId, { callbackURL });
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : "Unable to start Google sign-in.");
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSendingLink) return;
    setSignInError(null);
    setLinkSent(false);
    setIsSendingLink(true);
    try {
      const { error } = await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL,
        newUserCallbackURL: callbackURL,
        errorCallbackURL: "/login?error=magic-link",
      });
      if (error) throw new Error(error.message ?? "Unable to send the sign-in email.");
      setLinkSent(true);
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : "Unable to send the sign-in email.");
    } finally {
      setIsSendingLink(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#11100e] px-4 py-8 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(170,127,45,0.12),transparent_48%)]"
      />
      <section className="relative w-full max-w-md rounded-[1.65rem] border border-[#3b362c] bg-[#1c1b19] px-6 py-8 shadow-[0_28px_90px_rgba(0,0,0,0.38)] sm:px-9 sm:py-9">
        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
          <Link
            to="/"
            aria-label="Randy Production home"
            className="group mb-7 inline-flex items-center gap-3"
          >
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-amber-300/35 bg-[#11100e] transition-colors group-hover:border-amber-200/70">
              <img src="/logo.png" alt="" className="size-full object-cover" />
            </span>
            <span className="text-left text-[11px] font-medium uppercase leading-tight tracking-[0.24em] text-paper">
              Randy
              <br />
              Production
            </span>
          </Link>

          <h1 className="font-sans text-[1.7rem] font-semibold leading-tight tracking-[-0.04em] text-paper sm:text-3xl">
            {invite
              ? "Join the Studio"
              : mode === "create"
                ? "Create your account"
                : "Sign in to Randy Production"}
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#b8b2a7]">
            {invite
              ? "Continue with the Google account linked to your studio invitation."
              : returnTo === "quote"
                ? "Sign in to return to your saved quote and continue without re-entering your details."
                : "Access your client workspace, projects, and production updates."}
          </p>

          {!invite ? (
            <div
              aria-label="Account options"
              className="mt-6 grid w-full grid-cols-2 rounded-xl border border-[#403a30] bg-[#191816] p-1"
            >
              {(["signin", "create"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => {
                    setMode(value);
                    setSignInError(null);
                  }}
                  className={`min-h-11 rounded-[0.65rem] border px-3 text-sm font-medium transition-colors ${
                    mode === value
                      ? "border-[#403a30] bg-[#24221e] text-paper"
                      : "border-transparent text-[#aaa499] hover:text-paper"
                  }`}
                >
                  {value === "signin" ? "Sign In" : "Create Account"}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid w-full gap-3">
            {authEnabled ? (
              googleProvider ? (
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#403a30] bg-transparent px-4 text-sm font-medium text-paper transition-colors hover:border-[#5b5140] hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60 disabled:cursor-wait disabled:opacity-60"
                >
                  {isSigningIn ? (
                    <span
                      aria-hidden="true"
                      className="size-4 animate-spin rounded-full border-2 border-paper/25 border-t-paper"
                    />
                  ) : (
                    <GoogleMark />
                  )}
                  {invite
                    ? "Continue with invited Google account"
                    : isSigningIn
                      ? "Connecting to Google…"
                      : "Continue with Google"}
                </button>
              ) : (
                <p className="text-sm text-[#b8b2a7]">Google sign-in is not configured.</p>
              )
            ) : (
              <p className="text-sm text-[#b8b2a7]">Sign-in is disabled.</p>
            )}

            {signInError ? (
              <p
                role="alert"
                className="rounded-lg border border-red-300/20 bg-red-300/5 px-3 py-2 text-left text-sm text-red-100"
              >
                {signInError}
              </p>
            ) : null}

            <div className="my-2 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-[#39352e]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#aaa499]">
                Or use email
              </span>
              <span className="h-px flex-1 bg-[#39352e]" />
            </div>
            <form className="grid gap-3 text-left" onSubmit={handleEmailSignIn}>
              <label htmlFor="magic-link-email" className="text-xs font-medium text-[#c5beb2]">
                Work email address
              </label>
              <input
                id="magic-link-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setLinkSent(false);
                  setSignInError(null);
                }}
                placeholder="you@example.com"
                className="min-h-12 w-full rounded-xl border border-[#403a30] bg-[#191816] px-4 text-sm text-paper outline-none transition-colors placeholder:text-[#777168] focus:border-amber-200/50 focus:ring-2 focus:ring-amber-200/10"
              />
              <button
                type="submit"
                disabled={!authEnabled || isSendingLink || !email.trim()}
                className="min-h-12 w-full rounded-xl bg-[#f3f0e8] px-4 text-sm font-semibold text-[#201e1a] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/60 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSendingLink
                  ? "Sending your sign-in link…"
                  : mode === "create"
                    ? "Create account with email"
                    : "Email me a sign-in link"}
              </button>
              {linkSent ? (
                <p
                  role="status"
                  className="rounded-lg border border-emerald-200/20 bg-emerald-200/5 px-3 py-2 text-sm leading-relaxed text-emerald-100"
                >
                  If an account can be created or signed in with that address, you’ll receive a
                  secure link shortly. Check your inbox and spam folder.
                </p>
              ) : null}
            </form>
            <p className="text-center text-xs leading-relaxed text-[#aaa499]">
              {invite
                ? "Studio access is limited to invited team members."
                : mode === "create"
                  ? "Your account is created securely when you verify your email. Studio access is invitation-only."
                  : "New here? Create an account with Google or your email address."}
            </p>
          </div>
        </div>

        <div className="mt-7 border-t border-[#39352e] pt-5 text-center">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center px-3 text-xs text-[#b8b2a7] transition-colors hover:text-paper"
          >
            Return to Randy Production
          </Link>
        </div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
      <path
        fill="#FFC107"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
      />
      <path
        fill="#FF3D00"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
      />
      <path fill="#4CAF50" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
      <path
        fill="#1976D2"
        d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8A19.4 19.4 0 0 0 24 4 20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z"
      />
    </svg>
  );
}
