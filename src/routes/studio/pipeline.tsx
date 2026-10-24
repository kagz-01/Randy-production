import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { listPipeline, moveJob, type JobRow } from "@/lib/server/studio";
import { cn, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/studio/pipeline")({ component: PipelinePage });

const COLS = [
  { key: "inquiry", label: "Inquiry" },
  { key: "quoted", label: "Quoted" },
  { key: "booked", label: "Booked" },
  { key: "production", label: "On the floor" },
  { key: "delivered", label: "Delivered" },
];

function PipelinePage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);

  async function refresh() {
    setJobs(await listPipeline());
  }

  useEffect(() => {
    refresh().catch(() => setJobs([]));
  }, []);

  return (
    <main className="px-5 py-8 md:px-8">
      <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
        {COLS.map((col) => {
          const cards = jobs.filter((j) => j.status === col.key);
          return (
            <section key={col.key} className="w-[260px] shrink-0">
              <header className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[11px] uppercase tracking-[0.2em] text-mist">{col.label}</h2>
                <span className="tabular-nums text-xs text-blue-2">{cards.length}</span>
              </header>
              <div className="grid gap-2">
                {cards.map((j) => (
                  <article key={j.id} className="glass rounded-md p-4">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-blue-2">{j.service}</p>
                    <p className="font-serif text-xl">{j.title}</p>
                    <p className="text-xs text-mist">{j.client_name}</p>
                    <p className="mt-2 text-sm tabular-nums">{formatMoney(j.ballpark)}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {COLS.filter((c) => c.key !== j.status).map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          className={cn("rounded-sm px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-mist hover:bg-paper/10 hover:text-paper")}
                          onClick={async () => {
                            try {
                              await moveJob({ data: { id: j.id, status: c.key } });
                              await refresh();
                            } catch {
                              toast.error("Could not move job");
                            }
                          }}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
