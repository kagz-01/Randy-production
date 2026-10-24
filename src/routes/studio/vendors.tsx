import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listVendors, type VendorRow } from "@/lib/server/studio";

export const Route = createFileRoute("/studio/vendors")({ component: VendorsPage });

function VendorsPage() {
  const [rows, setRows] = useState<VendorRow[]>([]);
  useEffect(() => {
    listVendors().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((v) => (
          <article key={v.id} className="glass rounded-lg p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">{v.specialty}</p>
            <h2 className="font-serif text-3xl">{v.name}</h2>
            <p className="mt-2 text-sm text-mist">
              {v.city} · {v.lead_days} day lead · {v.rating}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
