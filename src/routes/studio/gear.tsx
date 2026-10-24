import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listInventory, setInventoryCondition, type InventoryRow } from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/gear")({ component: GearPage });

function GearPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);

  async function refresh() {
    setRows(await listInventory());
  }
  useEffect(() => {
    refresh().catch(() => setRows([]));
  }, []);

  const alerts = rows.filter((r) => r.condition !== "ready");

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      {alerts.length > 0 ? (
        <div className="mb-6 rounded-lg border border-blue/40 bg-blue/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">Service flags</p>
          <p className="mt-1 text-sm">
            {alerts.map((a) => a.name).join(" · ")}
          </p>
        </div>
      ) : null}
      <div className="grid gap-2">
        {rows.map((r) => (
          <article key={r.id} className="glass grid items-center gap-3 rounded-md p-4 sm:grid-cols-[1fr_auto_auto]">
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
            <div className="flex gap-1">
              {["ready", "service", "flag"].map((c) => (
                <button
                  key={c}
                  type="button"
                  className="rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-mist hover:bg-paper/10"
                  onClick={async () => {
                    try {
                      await setInventoryCondition({ data: { id: r.id, condition: c } });
                      await refresh();
                    } catch {
                      toast.error("Update failed");
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
