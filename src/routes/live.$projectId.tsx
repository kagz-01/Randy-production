import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { getJobPublic, type CueRow, type JobRow } from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/live/$projectId")({ component: LivePage });

function LivePage() {
  const { projectId } = Route.useParams();
  const [job, setJob] = useState<JobRow | null>(null);
  const [cues, setCues] = useState<CueRow[]>([]);

  useEffect(() => {
    let on = true;
    async function load() {
      try {
        const res = await getJobPublic({ data: { id: projectId } });
        if (!on || !res) return;
        setJob(res.job);
        setCues(res.cues);
      } catch {
        if (!on) return;
      }
    }
    load();
    const t = setInterval(load, 8000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [projectId]);

  const done = cues.filter((c) => c.status === "done").length;
  const pct = cues.length ? Math.round((done / cues.length) * 100) : 0;
  const sound = cues.filter((c) => c.kind === "sound");
  const setup = cues.filter((c) => c.kind === "setup");

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-5 pt-28 pb-20">
        <div className="flex items-center gap-3">
          <span className="live-dot size-2 rounded-full bg-blue" />
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Pulse · live</p>
        </div>
        <h1 className="mt-3 font-serif text-5xl">{job?.title ?? "Loading the night"}</h1>
        <p className="mt-2 text-mist">
          {job?.venue} · {job?.client_name} · shared with the client in real time
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Stat label="Setup" value={`${setup.filter((c) => c.status === "done").length}/${setup.length || 1}`} />
          <Stat
            label="Sound check"
            value={sound.some((c) => c.status === "active") ? "Live" : sound.every((c) => c.status === "done") ? "Clear" : "Standby"}
          />
          <Stat label="Night" value={`${pct}%`} />
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-paper/10">
          <div className="h-full bg-blue transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>

        <ol className="mt-12 space-y-0">
          {cues.map((c, i) => (
            <li key={c.id} className="grid grid-cols-[72px_16px_1fr] gap-4 py-4">
              <p className="pt-1 font-sans text-xs tabular-nums text-mist">{c.starts_at}</p>
              <div className="relative flex justify-center">
                <span
                  className={cn(
                    "mt-1.5 size-2.5 rounded-full",
                    c.status === "done" ? "bg-blue" : c.status === "active" ? "bg-paper live-dot" : "bg-paper/25",
                  )}
                />
                {i < cues.length - 1 ? <span className="absolute top-4 bottom-[-24px] w-px bg-paper/15" /> : null}
              </div>
              <div>
                <p className="font-serif text-xl text-paper">{c.title}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-mist">
                  {c.owner} · {c.kind} · {c.status}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm text-mist">
          Crew advances this board from the{" "}
          <Link to="/studio/live/$projectId" params={{ projectId }} className="text-blue-2">
            studio Pulse
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-mist">{label}</p>
      <p className="mt-2 font-serif text-4xl tabular-nums">{value}</p>
    </div>
  );
}
