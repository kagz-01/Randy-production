import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { SiteFooter, SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { PACKAGES } from "@/data/catalog";
import { matchMood } from "@/lib/server/studio";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/match")({ component: MatchPage });

function MatchPage() {
  const { user, isPending } = useCurrentUserState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [notes, setNotes] = useState("Black silk, low furniture, one colour only — blue as the signal.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    packageId: string;
    summary: string;
    rationale: string;
    ai: boolean;
  } | null>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  async function run() {
    if (!user) {
      toast.message("Sign in so the desk can keep the match on your job.");
      return;
    }
    setBusy(true);
    try {
      const res = await matchMood({ data: { notes, imageName: fileName } });
      setResult(res);
    } catch {
      toast.error("Match desk unavailable.");
    } finally {
      setBusy(false);
    }
  }

  const pkg = PACKAGES.find((p) => p.id === result?.packageId) ?? PACKAGES[1];

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 pt-28 pb-20 md:px-8">
        <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Match</p>
        <h1 className="mt-3 max-w-3xl font-serif text-5xl">Mood in. Package out.</h1>
        <p className="mt-4 max-w-xl text-mist">
          Drop a reference. We do not ask for your brand values. We read the room you already want.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-lg p-5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-md bg-ink"
            >
              {preview ? (
                <img src={preview} alt="Mood board" className="size-full object-cover" />
              ) : (
                <span className="text-sm text-mist">Drop a still, a Pinterest export, a phone snap</span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-md bg-paper/5 p-3 text-sm text-paper outline-none shadow-[0_0_0_1px_rgb(243_241_234/0.12)]"
            />
            <Button className="mt-4 w-full" disabled={busy || isPending} onClick={run}>
              {user ? "Match this room" : "Sign in to match"}
            </Button>
          </div>

          <div className="glass-strong rounded-lg p-6">
            {result ? (
              <>
                <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">
                  {result.ai ? "Desk read" : "House default"}
                </p>
                <h2 className="mt-2 font-serif text-4xl">{pkg.name}</h2>
                <p className="mt-4 text-paper/80">{result.summary}</p>
                <p className="mt-4 text-sm leading-relaxed text-mist">{result.rationale}</p>
                <p className="mt-6 text-xs uppercase tracking-[0.16em] text-mist">
                  {pkg.services.join(" · ")}
                </p>
                <Link to="/quote" className="mt-8 block">
                  <Button className="w-full">Build the quote from this</Button>
                </Link>
              </>
            ) : (
              <>
                <p className="text-[11px] uppercase tracking-[0.2em] text-mist">Waiting on a still</p>
                <h2 className="mt-2 font-serif text-4xl">Five house packages.</h2>
                <ul className="mt-6 space-y-4">
                  {PACKAGES.map((p) => (
                    <li key={p.id}>
                      <p className="font-serif text-xl">{p.name}</p>
                      <p className="text-sm text-mist">{p.blurb}</p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
