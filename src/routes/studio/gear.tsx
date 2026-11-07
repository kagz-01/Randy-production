import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listInventory, setInventoryCondition, type InventoryRow } from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/gear")({ component: GearPage });

function GearPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await listInventory());
    } catch (error) {
      console.error("[studio-gear] Could not load inventory", error);
      setLoadError("Gear inventory couldn’t be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const alerts = rows.filter((r) => r.condition !== "ready");

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Production tools</p>
          <h1 className="mt-2 text-4xl text-paper">Gear and inventory</h1>
          <p className="mt-2 text-sm text-mist">
            Track availability and flag equipment that needs attention.
          </p>
        </div>
        <Button
          type="button"
          variant="line"
          className="min-h-11"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </header>
      {loadError ? (
        <div role="alert" className="mb-5 rounded-lg border border-red/25 bg-red/5 p-4">
          <p className="text-sm text-red-200">{loadError}</p>
          <Button
            type="button"
            variant="line"
            className="mt-3 min-h-11"
            onClick={() => void refresh()}
            disabled={loading}
          >
            Try again
          </Button>
        </div>
      ) : null}
      {loading ? (
        <p role="status" className="mb-5 text-sm text-mist">
          Loading inventory…
        </p>
      ) : null}
      {!loading && !loadError && rows.length === 0 ? (
        <p className="rounded-lg border border-paper/10 bg-ink/60 p-5 text-sm text-mist">
          No gear has been added to the inventory yet.
        </p>
      ) : null}
      {!loading && alerts.length > 0 ? (
        <div className="mb-6 rounded-lg border border-blue/40 bg-blue/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">Service flags</p>
          <p className="mt-1 text-sm">{alerts.map((a) => a.name).join(" · ")}</p>
        </div>
      ) : null}
      <div className="grid gap-2">
        {!loadError &&
          rows.map((r) => (
            <article
              key={r.id}
              className="glass grid items-center gap-3 rounded-md p-4 sm:grid-cols-[1fr_auto_auto]"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-mist">{r.category}</p>
                <p className="font-serif text-xl">{r.name}</p>
                <p className="text-xs text-mist">
                  {r.available}/{r.qty} on the floor
                  {r.next_service ? ` · service ${r.next_service}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs uppercase tracking-[0.16em]",
                  r.condition === "ready" ? "text-mist" : "text-blue-2",
                )}
              >
                {r.condition}
              </span>
              <div className="flex flex-wrap gap-1">
                {(["ready", "service", "flag"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={r.condition === c}
                    disabled={updatingId === r.id}
                    className={cn(
                      "min-h-11 rounded-sm border px-3 text-[10px] uppercase tracking-[0.12em] disabled:opacity-50",
                      r.condition === c
                        ? "border-blue/40 bg-blue/10 text-blue-2"
                        : "border-transparent text-mist hover:bg-paper/10",
                    )}
                    onClick={async () => {
                      if (r.condition === c) return;
                      setUpdatingId(r.id);
                      try {
                        await setInventoryCondition({ data: { id: r.id, condition: c } });
                        setRows((current) =>
                          current.map((item) =>
                            item.id === r.id ? { ...item, condition: c } : item,
                          ),
                        );
                        toast.success(`${r.name} marked ${c}.`);
                      } catch (error) {
                        console.error("[studio-gear] Could not update gear condition", error);
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "The gear status could not be updated.",
                        );
                      } finally {
                        setUpdatingId(null);
                      }
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </article>
          ))}
      </div>
    </main>
  );
}
