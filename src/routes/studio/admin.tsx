import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { summarizeCloseoutBrief } from "@/lib/closeout-brief";
import { summarizeJobReadiness } from "@/lib/operations-readiness";
import { createTeamInvite, listCrew, listPipeline, listReceipts, listTeamInvites, type CrewRow, type JobRow, type ReceiptRow, type TeamInviteRow, updateTeamInviteStatus } from "@/lib/server/studio";

export const Route = createFileRoute("/studio/admin")({ component: AdminDashboard });

type TeamInvite = {
  id: string;
  name: string;
  role: string;
  team: string;
  status: "Invite sent" | "Waiting on docs" | "Ready to start";
  email: string;
  date: string;
};

function mapInvite(invite: TeamInviteRow): TeamInvite {
  return {
    id: invite.id,
    name: invite.name,
    role: invite.role,
    team: invite.team,
    status: invite.status as TeamInvite["status"],
    email: invite.email,
    date: invite.created_at.slice(0, 10),
  };
}

function AdminDashboard() {
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [form, setForm] = useState({
    name: "",
    role: "Production associate",
    team: "Operations",
    email: "",
  });

  useEffect(() => {
    Promise.all([
      listCrew(),
      listPipeline(),
      listReceipts(),
      listTeamInvites(),
    ])
      .then(([crewRows, jobRows, receiptRows, inviteRows]) => {
        setCrew(crewRows);
        setJobs(jobRows);
        setReceipts(receiptRows);
        setInvites(inviteRows.map(mapInvite));
      })
      .catch(() => {
        setCrew([]);
        setJobs([]);
        setReceipts([]);
        setInvites([]);
      });
  }, []);

  const stats = useMemo(() => {
    const active = crew.filter((person) => ["active", "called", "on-site"].includes(person.status)).length;
    const pending = invites.filter((person) => person.status !== "Ready to start").length;
    const ready = invites.filter((person) => person.status === "Ready to start").length;
    const pipelineValue = jobs.filter((job) => !["inquiry"].includes(job.status)).reduce((sum, job) => sum + job.ballpark, 0);
    const paidValue = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const outstanding = Math.max(pipelineValue - paidValue, 0);
    return { active, pending, ready, total: active + crew.length + invites.length, pipelineValue, paidValue, outstanding };
  }, [crew, invites, jobs, receipts]);

  const readiness = useMemo(() => summarizeJobReadiness(jobs), [jobs]);
  const closeout = useMemo(() => summarizeCloseoutBrief(jobs, receipts.reduce((sum, receipt) => sum + receipt.amount, 0)), [jobs, receipts]);

  async function addInvite() {
    if (!form.name.trim() || !form.email.trim()) return;

    const created = await createTeamInvite({
      data: {
        name: form.name.trim(),
        role: form.role.trim() || "Production associate",
        team: form.team.trim() || "Operations",
        email: form.email.trim(),
      },
    });

    setInvites((current) => [mapInvite(created), ...current]);
    setForm({ name: "", role: "Production associate", team: "Operations", email: "" });
  }

  async function updateInviteStatus(id: string, status: TeamInvite["status"]) {
    const updated = await updateTeamInviteStatus({ data: { id, status } });
    setInvites((current) => current.map((person) => (person.id === id ? mapInvite(updated) : person)));
  }

  return (
    <main className="shell py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Admin dashboard</p>
          <h1 className="mt-2 font-serif text-5xl">People, access and onboarding.</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/studio/receipts">
            <Button variant="line">Receipts ledger</Button>
          </Link>
          <Button variant="primary">Send all invites</Button>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Active floor</p>
          <p className="mt-3 font-serif text-4xl">{stats.active}</p>
          <p className="mt-2 text-sm text-mist">currently on crew or operations</p>
        </div>
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Pending invites</p>
          <p className="mt-3 font-serif text-4xl">{stats.pending}</p>
          <p className="mt-2 text-sm text-mist">waiting for sign-off or docs</p>
        </div>
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Ready to start</p>
          <p className="mt-3 font-serif text-4xl">{stats.ready}</p>
          <p className="mt-2 text-sm text-mist">fully onboarded and cleared</p>
        </div>
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">People in system</p>
          <p className="mt-3 font-serif text-4xl">{stats.total}</p>
          <p className="mt-2 text-sm text-mist">crew plus inbound talent</p>
        </div>
      </section>

      <section className="mt-10 grid gap-3 grid-cols-2 mobile-2up md:grid-cols-3">
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Pipeline value</p>
          <p className="mt-3 font-serif text-4xl">Ksh {stats.pipelineValue.toLocaleString()}</p>
          <p className="mt-2 text-sm text-mist">Commercial value in active and booked work</p>
        </div>
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Paid through receipts</p>
          <p className="mt-3 font-serif text-4xl">Ksh {stats.paidValue.toLocaleString()}</p>
          <p className="mt-2 text-sm text-mist">Confirmed payment proof issued on the ledger</p>
        </div>
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Outstanding demand</p>
          <p className="mt-3 font-serif text-4xl">Ksh {stats.outstanding.toLocaleString()}</p>
          <p className="mt-2 text-sm text-mist">Pending value after issued receipts</p>
        </div>
      </section>

      <section className="mt-10 grid gap-3 grid-cols-2 mobile-2up md:grid-cols-3">
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Readiness index</p>
          <p className="mt-3 font-serif text-4xl">{readiness.score}%</p>
          <p className="mt-2 text-sm text-mist">Operations floor is tracking {readiness.live} live bookings and {readiness.delivered} delivered jobs.</p>
        </div>
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Nearest show</p>
          <p className="mt-3 font-serif text-2xl">{readiness.nearest?.title ?? "No live show"}</p>
          <p className="mt-2 text-sm text-mist">{readiness.nearest?.event_date ? new Date(readiness.nearest.event_date).toLocaleDateString("en-KE", { dateStyle: "medium" }) : "Event date pending"}</p>
        </div>
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Watchlist</p>
          <p className="mt-3 font-serif text-4xl">{readiness.watchlist}</p>
          <p className="mt-2 text-sm text-mist">Inquiries or quotes still needing a decision before they drift.</p>
        </div>
      </section>

      <section className="mt-10 grid gap-3 grid-cols-2 mobile-2up md:grid-cols-3">
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Closeout ready</p>
          <p className="mt-3 font-serif text-4xl">{closeout.readyCount}</p>
          <p className="mt-2 text-sm text-mist">deliverables already aligned for final approval</p>
        </div>
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Watch list</p>
          <p className="mt-3 font-serif text-4xl">{closeout.watchCount}</p>
          <p className="mt-2 text-sm text-mist">final sign-offs and venue budgets still need attention</p>
        </div>
        <div className="glass rounded-lg p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Outstanding closeout</p>
          <p className="mt-3 font-serif text-4xl">Ksh {closeout.outstandingAmount.toLocaleString()}</p>
          <p className="mt-2 text-sm text-mist">remaining settlement after issued receipts</p>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="glass rounded-lg p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Closeout and approvals</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-mist">{closeout.items.length} actions</span>
          </div>

          <div className="mt-5 space-y-3">
            {closeout.items.map((item) => (
              <div key={item.label} className="rounded-md border border-paper/10 bg-ink/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-serif text-xl">{item.label}</p>
                    <p className="text-sm text-mist">{item.detail}</p>
                  </div>
                  <span className={item.state === "ready" ? "rounded-full bg-green/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-green-300" : item.state === "watch" ? "rounded-full bg-amber/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-200" : "rounded-full bg-red/20 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-red-200"}>
                    {item.state}
                  </span>
                </div>
                <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-blue-2">{item.owner}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-lg p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Onboarding pipeline</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-mist">{invites.length} people</span>
          </div>

          <div className="mt-5 space-y-3">
            {invites.map((person) => (
              <div key={person.id} className="rounded-md border border-paper/10 bg-ink/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-serif text-xl">{person.name}</p>
                    <p className="text-sm text-mist">{person.role}</p>
                  </div>
                  <span className="rounded-full border border-blue/30 bg-blue/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-blue-2">
                    {person.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-mist">
                  <span>{person.team}</span>
                  <span>•</span>
                  <span>{person.email}</span>
                  <span>•</span>
                  <span>{person.date}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {person.status !== "Waiting on docs" ? (
                    <Button variant="line" size="sm" onClick={() => updateInviteStatus(person.id, "Waiting on docs")}>
                      Waiting on docs
                    </Button>
                  ) : null}
                  {person.status !== "Ready to start" ? (
                    <Button variant="primary" size="sm" onClick={() => updateInviteStatus(person.id, "Ready to start")}>
                      Mark ready
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-lg p-5">
          <h2 className="font-serif text-2xl">Add new person</h2>
          <div className="mt-5 space-y-3">
            <Input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              placeholder="Full name"
            />
            <Input
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
              placeholder="Email address"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={form.role}
                onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))}
                placeholder="Role"
              />
              <Input
                value={form.team}
                onChange={(e) => setForm((current) => ({ ...current, team: e.target.value }))}
                placeholder="Team"
              />
            </div>
            <Button variant="primary" onClick={addInvite}>Invite to team</Button>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass rounded-lg p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Current floor roster</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-mist">live team</span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {crew.map((person) => (
              <div key={person.id} className="rounded-md border border-paper/10 bg-ink/50 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-serif text-xl">{person.name}</p>
                  <span className="rounded-full border border-paper/15 bg-paper/5 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-mist">
                    {person.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-mist">{person.role}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.14em] text-blue-2">
                  {person.call_time ? `Call ${person.call_time}` : "No call time assigned"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-lg p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Live pipeline</h2>
            <span className="text-[11px] uppercase tracking-[0.18em] text-mist">{jobs.length} jobs</span>
          </div>
          <div className="mt-5 space-y-3">
            {jobs.slice(0, 5).map((job) => (
              <div key={job.id} className="rounded-md border border-paper/10 bg-ink/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-serif text-lg">{job.title}</p>
                  <span className="rounded-full border border-blue/30 bg-blue/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-blue-2">
                    {job.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-mist">{job.client_name} · {job.venue ?? "TBC"}</p>
                <p className="mt-2 text-sm tabular-nums">Ksh {job.ballpark.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
