import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { assignCrew, listCrew, listPipeline, type CrewRow, type JobRow } from "@/lib/server/studio";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/studio/crew")({ component: CrewPage });

function CrewPage() {
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [sheet, setSheet] = useState(false);

  async function refresh() {
    const [c, j] = await Promise.all([listCrew(), listPipeline()]);
    setCrew(c);
    setJobs(j);
  }
  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  const liveJob = jobs.find((j) => j.status === "production") ?? jobs[0];
  const called = useMemo(
    () => crew.filter((c) => c.assigned_job_id && (c.status === "called" || c.status === "on-site")),
    [crew],
  );

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-mist">Assign a body, get a call sheet.</p>
        <Button variant="line" size="sm" onClick={() => setSheet(true)}>
          Generate call sheet
        </Button>
      </div>
      <div className="grid gap-2">
        {crew.map((c) => (
          <article key={c.id} className="glass flex flex-wrap items-center justify-between gap-3 rounded-md p-4">
            <div>
              <p className="font-serif text-xl">{c.name}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-mist">
                {c.role} · {c.status}
                {c.call_time ? ` · call ${c.call_time}` : ""}
              </p>
            </div>
            {liveJob ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await assignCrew({ data: { crewId: c.id, jobId: liveJob.id, callTime: c.call_time || "14:00" } });
                    toast.success(`Called ${c.name}`);
                    await refresh();
                  } catch {
                    toast.error("Could not assign");
                  }
                }}
              >
                Call to {liveJob.title}
              </Button>
            ) : null}
          </article>
        ))}
      </div>

      {sheet ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-void/80 p-4">
          <div className="glass-strong max-h-[90dvh] w-full max-w-lg overflow-auto rounded-xl p-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-blue-2">Call sheet</p>
            <h2 className="font-serif text-4xl">{liveJob?.title ?? "Untitled"}</h2>
            <p className="mt-1 text-sm text-mist">
              {liveJob?.venue} · {liveJob?.event_date}
            </p>
            <table className="mt-6 w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.16em] text-mist">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Role</th>
                  <th>Call</th>
                </tr>
              </thead>
              <tbody>
                {called.map((c) => (
                  <tr key={c.id} className="border-t border-paper/10">
                    <td className="py-2">{c.name}</td>
                    <td>{c.role}</td>
                    <td className="tabular-nums">{c.call_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Button className="mt-6" variant="paper" onClick={() => setSheet(false)}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
