import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { listVendors, type VendorRow } from "@/lib/server/studio";
import { buildVendorBoard } from "@/lib/vendor-board";

export const Route = createFileRoute("/studio/vendors")({ component: VendorsPage });

function VendorsPage() {
  const [rows, setRows] = useState<VendorRow[]>([]);
  const [filter, setFilter] = useState<"all" | string>("all");

  useEffect(() => {
    listVendors().then(setRows).catch(() => setRows([]));
  }, []);

  const board = useMemo(() => buildVendorBoard(rows), [rows]);
  const visibleGroups = filter === "all" ? board.groups : board.groups.filter((group) => group.specialty === filter);

  return (
    <main className="shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Procurement board</p>
          <h1 className="mt-2 font-serif text-5xl">Vendors and production partners.</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatPill label="Urgent" value={String(board.summary.urgent)} />
          <StatPill label="Avg lead" value={`${board.summary.averageLeadDays}d`} />
          <StatPill label="Preferred" value={String(board.summary.preferred)} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>All</FilterButton>
        {board.groups.map((group) => (
          <FilterButton key={group.specialty} active={filter === group.specialty} onClick={() => setFilter(group.specialty)}>
            {group.specialty}
          </FilterButton>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {visibleGroups.map((group) => (
          <section key={group.specialty} className="glass rounded-lg p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-3xl">{group.specialty}</h2>
              <span className="text-[11px] uppercase tracking-[0.18em] text-mist">{group.vendors.length} partners</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.vendors.map((vendor) => (
                <article key={vendor.id} className="rounded-md border border-paper/10 bg-ink/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-blue-2">{vendor.city}</p>
                      <h3 className="mt-2 font-serif text-2xl">{vendor.name}</h3>
                    </div>
                    <span className="rounded-full border border-paper/15 bg-paper/5 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-mist">
                      {vendor.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-mist">
                    <p>Lead: {vendor.lead_days} days</p>
                    <p>Rating: {vendor.rating.toFixed(1)} / 5</p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="line" size="sm">Request quote</Button>
                    <Button variant="ghost" size="sm">Hold slot</Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-paper/10 bg-paper/5 px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className="mt-1 font-serif text-lg">{value}</p>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "rounded-md bg-paper px-3 py-2 text-xs uppercase tracking-[0.16em] text-void" : "rounded-md border border-paper/10 bg-transparent px-3 py-2 text-xs uppercase tracking-[0.16em] text-mist hover:text-paper"}
    >
      {children}
    </button>
  );
}
