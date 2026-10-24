import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { SiteFooter, SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ADDONS, EVENT_TYPES, GUEST_BANDS, TIERS, type EventType, type ServiceKey, type TierKey } from "@/data/catalog";
import { priceQuote } from "@/lib/pricing";
import { refineQuote, saveQuote } from "@/lib/server/studio";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { formatMoney, cn } from "@/lib/utils";

export const Route = createFileRoute("/quote")({ component: QuotePage });

function QuotePage() {
  const nav = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [eventType, setEventType] = useState<EventType>("corporate");
  const [guests, setGuests] = useState(150);
  const [tier, setTier] = useState<TierKey>("floor");
  const [services, setServices] = useState<ServiceKey[]>(["stage", "sound", "decor"]);
  const [venue, setVenue] = useState("");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const priced = useMemo(
    () => priceQuote({ eventType, guests, tier, services }),
    [eventType, guests, tier, services],
  );

  function toggle(key: ServiceKey) {
    setServices((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  async function lock() {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      const res = await saveQuote({
        data: { eventType, guests, tier, services, venue, date, title: title || undefined },
      });
      toast.success("Quote locked");
      nav({ to: "/book/$quoteId", params: { quoteId: res.quoteId } });
    } catch {
      toast.error("Could not lock quote — sign in and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function refine() {
    if (!user) {
      nav({ to: "/login" });
      return;
    }
    setBusy(true);
    try {
      const res = await refineQuote({ data: { eventType, guests, tier, services } });
      setNote(res.note);
    } catch {
      toast.error("Desk is offline. Ballpark still holds.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="mx-auto grid max-w-6xl gap-8 px-5 pt-28 pb-20 md:grid-cols-[1.1fr_0.9fr] md:px-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Quote desk</p>
          <h1 className="mt-3 font-serif text-5xl">Ballpark in four moves.</h1>
          <p className="mt-3 text-mist">No questionnaire novel. Event, room size, how hard we go, what we bring.</p>

          <Field label="What is the night">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EVENT_TYPES.map((e) => (
                <Choice key={e.key} active={eventType === e.key} onClick={() => setEventType(e.key)}>
                  {e.label}
                </Choice>
              ))}
            </div>
          </Field>

          <Field label="How many bodies">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GUEST_BANDS.map((g) => (
                <Choice key={g.key} active={guests === g.key} onClick={() => setGuests(g.key)}>
                  {g.label}
                </Choice>
              ))}
            </div>
          </Field>

          <Field label="How hard">
            <div className="grid gap-2">
              {TIERS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTier(t.key)}
                  className={cn(
                    "rounded-md p-4 text-left transition-colors",
                    tier === t.key ? "bg-paper text-void" : "glass text-paper hover:bg-paper/5",
                  )}
                >
                  <span className="font-serif text-xl">{t.label}</span>
                  <span className="mt-1 block text-sm opacity-70">{t.note}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="What we bring">
            <div className="flex flex-wrap gap-2">
              {ADDONS.map((a) => (
                <Choice key={a.key} active={services.includes(a.key)} onClick={() => toggle(a.key)}>
                  {a.label}
                </Choice>
              ))}
            </div>
          </Field>
        </div>

        <aside className="h-fit md:sticky md:top-24">
          <div className="glass-strong rounded-xl p-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-blue-2">Ballpark</p>
            <p className="mt-2 font-serif text-6xl tabular-nums text-paper">{formatMoney(priced.amount)}</p>
            <p className="mt-1 text-xs text-mist">Not a contract. A number you can argue with.</p>
            <ul className="mt-6 space-y-2 text-sm">
              {priced.lines.map((l) => (
                <li key={l.label} className="flex justify-between gap-4 text-mist">
                  <span>{l.label}</span>
                  <span className="tabular-nums text-paper">{formatMoney(l.amount)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 grid gap-3">
              <Input placeholder="Working title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Input placeholder="Venue" value={venue} onChange={(e) => setVenue(e.target.value)} />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {note ? <p className="mt-4 text-sm leading-relaxed text-paper/80">{note}</p> : null}
            <div className="mt-6 grid gap-2">
              <Button disabled={busy} onClick={lock}>
                {isPending ? "…" : user ? "Lock quote & book" : "Sign in to lock"}
              </Button>
              <Button variant="line" disabled={busy} onClick={refine}>
                Ask the desk to refine
              </Button>
              <Link to="/look" className="text-center text-xs uppercase tracking-[0.16em] text-mist hover:text-paper">
                Or overlay the venue first
              </Link>
            </div>
          </div>
        </aside>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[11px] uppercase tracking-[0.22em] text-mist">{label}</h2>
      {children}
    </section>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-11 rounded-md px-3 text-sm transition-colors",
        active ? "bg-blue text-paper" : "glass text-mist hover:text-paper",
      )}
    >
      {children}
    </button>
  );
}
