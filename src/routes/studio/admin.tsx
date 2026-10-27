import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileText,
  RefreshCw,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { summarizeCloseoutBrief } from "@/lib/closeout-brief";
import { summarizeJobReadiness } from "@/lib/operations-readiness";
import {
  createTeamInvite,
  listCrew,
  listPipeline,
  listReceipts,
  listTeamInvites,
  type CrewRow,
  type JobRow,
  type ReceiptRow,
  type TeamInviteRow,
  updateTeamInviteStatus,
} from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/admin")({ component: AdminDashboard });

type InviteStatus = "Invite sent" | "Waiting on docs" | "Ready to start";
type AdminTabKey = "overview" | "people" | "finance" | "operations";

type TeamInvite = {
  id: string;
  name: string;
  role: string;
  team: string;
  status: InviteStatus;
  email: string;
  date: string;
};

type AdminMetrics = {
  activeCrew: number;
  pendingInvites: number;
  liveJobs: number;
  confirmedValue: number;
  paidValue: number;
  closeout: ReturnType<typeof summarizeCloseoutBrief>;
  readiness: ReturnType<typeof summarizeJobReadiness>;
  attentionJobs: JobRow[];
};

const TABS: { id: AdminTabKey; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: ClipboardCheck },
  { id: "people", label: "People & access", icon: UsersRound },
  { id: "finance", label: "Finance", icon: Banknote },
  { id: "operations", label: "Operations", icon: CalendarDays },
];

const currency = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function money(amount: number) {
  return currency.format(amount);
}

function mapInvite(invite: TeamInviteRow): TeamInvite {
  return {
    id: invite.id,
    name: invite.name,
    role: invite.role,
    team: invite.team,
    status: invite.status as InviteStatus,
    email: invite.email,
    date: invite.created_at.slice(0, 10),
  };
}

function formatEventDate(value: string | null | undefined) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTabKey>("overview");
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingInvite, setSavingInvite] = useState(false);
  const [updatingInviteId, setUpdatingInviteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    role: "Production associate",
    team: "Operations",
    email: "",
  });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [crewRows, jobRows, receiptRows, inviteRows] = await Promise.all([
        listCrew(),
        listPipeline(),
        listReceipts(),
        listTeamInvites(),
      ]);
      setCrew(crewRows);
      setJobs(jobRows);
      setReceipts(receiptRows);
      setInvites(inviteRows.map(mapInvite));
    } catch (error) {
      console.error("[admin-dashboard] Could not load dashboard data", error);
      setLoadError("We couldn’t load the admin workspace. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const activeCrew = crew.filter((person) => ["active", "called", "on-site"].includes(person.status)).length;
    const pendingInvites = invites.filter((person) => person.status !== "Ready to start").length;
    const liveJobs = jobs.filter((job) => ["booked", "production"].includes(job.status));
    const confirmedValue = liveJobs.reduce((sum, job) => sum + job.ballpark, 0);
    const paidValue = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const closeout = summarizeCloseoutBrief(jobs, paidValue);
    const readiness = summarizeJobReadiness(jobs);
    const attentionJobs = jobs.filter(
      (job) =>
        ["inquiry", "quoted"].includes(job.status) ||
        (["booked", "production"].includes(job.status) &&
          (!job.venue || !job.event_date || job.ballpark <= 0)),
    );
    return {
      activeCrew,
      pendingInvites,
      liveJobs: liveJobs.length,
      confirmedValue,
      paidValue,
      closeout,
      readiness,
      attentionJobs,
      totalPeople: crew.length + invites.length,
    };
  }, [crew, invites, jobs, receipts]);

  async function addInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    if (!name || !email) {
      toast.error("Add a name and email address before creating an invite.");
      return;
    }

    setSavingInvite(true);
    try {
      const created = await createTeamInvite({
        data: {
          name,
          role: form.role.trim() || "Production associate",
          team: form.team.trim() || "Operations",
          email,
        },
      });
      setInvites((current) => [mapInvite(created), ...current.filter((invite) => invite.id !== created.id)]);
      setForm({ name: "", role: "Production associate", team: "Operations", email: "" });
      toast.success(`Invite prepared for ${name}.`);
    } catch (error) {
      console.error("[admin-dashboard] Could not create team invite", error);
      toast.error("The invite could not be created. Please try again.");
    } finally {
      setSavingInvite(false);
    }
  }

  async function changeInviteStatus(id: string, status: InviteStatus) {
    setUpdatingInviteId(id);
    try {
      const updated = await updateTeamInviteStatus({ data: { id, status } });
      setInvites((current) => current.map((invite) => (invite.id === id ? mapInvite(updated) : invite)));
      toast.success("Onboarding status updated.");
    } catch (error) {
      console.error("[admin-dashboard] Could not update invite status", error);
      toast.error("The onboarding status could not be updated.");
    } finally {
      setUpdatingInviteId(null);
    }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? TABS.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setActiveTab(TABS[nextIndex].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .item(nextIndex)
      ?.focus();
  }

  const activeTabInfo = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];

  return (
    <main className="shell pb-16">
      <header className="border-b border-paper/10 pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Admin workspace</p>
            <h1 className="mt-2 text-4xl md:text-5xl">People, money, operations.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist md:text-base">
              A clear view of the team and the work behind every production.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="line"
              size="sm"
              onClick={() => void loadDashboard()}
              disabled={loading}
              aria-label="Refresh admin dashboard"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Link to="/studio/receipts">
              <Button variant="primary" size="sm">
                <FileText className="size-3.5" />
                Receipts
              </Button>
            </Link>
          </div>
        </div>

        <div
          className="mt-6 flex gap-1 overflow-x-auto border-b border-paper/10"
          role="tablist"
          aria-label="Admin dashboard sections"
        >
          {TABS.map((tab, index) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`admin-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`admin-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                className={cn(
                  "flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
                  selected
                    ? "border-blue-2 text-paper"
                    : "border-transparent text-mist hover:border-paper/20 hover:text-paper",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <div
        id={`admin-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`admin-tab-${activeTab}`}
        tabIndex={0}
        className="pt-6 outline-none"
      >
        {loading ? (
          <DashboardLoading label={`Loading ${activeTabInfo.label.toLowerCase()}…`} />
        ) : loadError ? (
          <DashboardError message={loadError} onRetry={() => void loadDashboard()} />
        ) : (
          <>
            {activeTab === "overview" ? (
              <OverviewTab
                metrics={metrics}
                crew={crew}
                invites={invites}
                onOpenPeople={() => setActiveTab("people")}
                onOpenOperations={() => setActiveTab("operations")}
              />
            ) : null}
            {activeTab === "people" ? (
              <PeopleTab
                crew={crew}
                invites={invites}
                form={form}
                savingInvite={savingInvite}
                updatingInviteId={updatingInviteId}
                onFormChange={setForm}
                onSubmit={addInvite}
                onStatusChange={changeInviteStatus}
              />
            ) : null}
            {activeTab === "finance" ? (
              <FinanceTab
                jobs={jobs}
                receipts={receipts}
                confirmedValue={metrics.confirmedValue}
                paidValue={metrics.paidValue}
                closeout={metrics.closeout}
              />
            ) : null}
            {activeTab === "operations" ? (
              <OperationsTab
                jobs={jobs}
                readiness={metrics.readiness}
                attentionJobs={metrics.attentionJobs}
              />
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}

function OverviewTab({
  metrics,
  crew,
  invites,
  onOpenPeople,
  onOpenOperations,
}: {
  metrics: AdminMetrics;
  crew: CrewRow[];
  invites: TeamInvite[];
  onOpenPeople: () => void;
  onOpenOperations: () => void;
}) {
  const priorityInvites = invites.filter((invite) => invite.status !== "Ready to start").slice(0, 4);
  const nextEvent = metrics.readiness.nearest;

  return (
    <div className="space-y-6">
      <section aria-label="Admin summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Active crew"
          value={String(metrics.activeCrew)}
          detail={`${crew.length} people on roster`}
          icon={UsersRound}
          tone="blue"
        />
        <MetricCard
          label="Onboarding"
          value={String(metrics.pendingInvites)}
          detail="Invites still in progress"
          icon={UserPlus}
          tone={metrics.pendingInvites > 0 ? "amber" : "neutral"}
        />
        <MetricCard
          label="Live productions"
          value={String(metrics.liveJobs)}
          detail={`${metrics.attentionJobs.length} jobs need attention`}
          icon={CalendarDays}
          tone={metrics.attentionJobs.length > 0 ? "amber" : "neutral"}
        />
        <MetricCard
          label="Collected"
          value={money(metrics.paidValue)}
          detail="Receipts issued"
          icon={Banknote}
          tone="green"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
        <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading
            eyebrow="Operations"
            title="Next up"
            action={
              <button
                type="button"
                onClick={onOpenOperations}
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-2 hover:bg-paper/5"
              >
                View operations <ChevronRight className="size-4" />
              </button>
            }
          />
          {nextEvent ? (
            <div className="mt-5 grid gap-5 border-t border-paper/10 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-mist">Next confirmed event</p>
                <h3 className="mt-2 text-3xl text-paper">{nextEvent.title}</h3>
                <p className="mt-2 text-sm text-mist">{nextEvent.event_date ? formatEventDate(nextEvent.event_date) : "Date pending"}</p>
              </div>
              <div className="grid gap-1 text-sm sm:text-right">
                <p className="text-paper">{nextEvent.status === "production" ? "In production" : "Booked"}</p>
                <p className="text-mist">Readiness {metrics.readiness.score}%</p>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No upcoming confirmed events"
              body="New inquiries and quotes will show in the operations queue."
              icon={CalendarDays}
            />
          )}
          <div className="mt-5 grid gap-3 border-t border-paper/10 pt-5 sm:grid-cols-3">
            <InlineMetric label="Work in motion" value={money(metrics.confirmedValue)} />
            <InlineMetric label="Need a decision" value={String(metrics.readiness.watchlist)} />
            <InlineMetric label="Ready to close" value={String(metrics.closeout.readyCount)} />
          </div>
        </section>

        <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading
            eyebrow="People"
            title="Onboarding queue"
            action={
              <button
                type="button"
                onClick={onOpenPeople}
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-2 hover:bg-paper/5"
              >
                Manage team <ChevronRight className="size-4" />
              </button>
            }
          />
          {priorityInvites.length ? (
            <ul className="mt-4 divide-y divide-paper/10">
              {priorityInvites.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-paper">{invite.name}</p>
                    <p className="truncate text-xs text-mist">{invite.role} · {invite.team}</p>
                  </div>
                  <InviteBadge status={invite.status} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="All caught up" body="There are no invitations waiting for action." icon={Check} />
          )}
        </section>
      </div>
    </div>
  );
}

function PeopleTab({
  crew,
  invites,
  form,
  savingInvite,
  updatingInviteId,
  onFormChange,
  onSubmit,
  onStatusChange,
}: {
  crew: CrewRow[];
  invites: TeamInvite[];
  form: { name: string; role: string; team: string; email: string };
  savingInvite: boolean;
  updatingInviteId: string | null;
  onFormChange: (form: { name: string; role: string; team: string; email: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStatusChange: (id: string, status: InviteStatus) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div id="new-invite" className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading eyebrow="Team access" title="Invite someone" />
          <p className="mt-2 text-sm text-mist">Add a teammate to the onboarding queue.</p>
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-paper">Full name</span>
              <Input
                autoComplete="name"
                required
                value={form.name}
                onChange={(event) => onFormChange({ ...form, name: event.target.value })}
                placeholder="e.g. Amina Njoroge"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-paper">Email address</span>
              <Input
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(event) => onFormChange({ ...form, email: event.target.value })}
                placeholder="name@company.com"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-paper">Role</span>
                <Input
                  value={form.role}
                  onChange={(event) => onFormChange({ ...form, role: event.target.value })}
                  placeholder="Role"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-paper">Team</span>
                <Input
                  value={form.team}
                  onChange={(event) => onFormChange({ ...form, team: event.target.value })}
                  placeholder="Team"
                />
              </label>
            </div>
            <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={savingInvite}>
              <UserPlus className="size-4" />
              {savingInvite ? "Creating invite…" : "Create team invite"}
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading
            eyebrow="Access workflow"
            title="Invites & onboarding"
            count={`${invites.length} total`}
          />
          {invites.length ? (
            <ul className="mt-4 divide-y divide-paper/10">
              {invites.map((invite) => (
                <li key={invite.id} className="py-4 first:pt-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-paper">{invite.name}</p>
                      <p className="mt-1 break-all text-xs text-mist">{invite.email}</p>
                      <p className="mt-1 text-xs text-mist">{invite.role} · {invite.team} · added {formatEventDate(invite.date)}</p>
                    </div>
                    <InviteBadge status={invite.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {invite.status !== "Waiting on docs" ? (
                      <Button
                        type="button"
                        variant="line"
                        size="sm"
                        disabled={updatingInviteId === invite.id}
                        onClick={() => onStatusChange(invite.id, "Waiting on docs")}
                      >
                        Waiting on docs
                      </Button>
                    ) : null}
                    {invite.status !== "Ready to start" ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={updatingInviteId === invite.id}
                        onClick={() => onStatusChange(invite.id, "Ready to start")}
                      >
                        {updatingInviteId === invite.id ? "Updating…" : "Mark ready"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No invites yet" body="New team invitations will appear here." icon={UserPlus} />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
        <SectionHeading eyebrow="Current team" title="Roster" count={`${crew.length} people`} />
        {crew.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-paper/10 text-[10px] uppercase tracking-[0.16em] text-mist">
                  <th scope="col" className="py-3 pr-4 font-medium">Name</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Role</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Status</th>
                  <th scope="col" className="py-3 font-medium">Next call</th>
                </tr>
              </thead>
              <tbody>
                {crew.map((person) => (
                  <tr key={person.id} className="border-b border-paper/5 last:border-0">
                    <td className="py-3 pr-4 text-sm font-medium text-paper">{person.name}</td>
                    <td className="py-3 pr-4 text-sm text-mist">{person.role}</td>
                    <td className="py-3 pr-4"><RosterStatus status={person.status} /></td>
                    <td className="py-3 text-sm text-mist">{person.call_time ?? "Not assigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Roster is empty" body="Crew members appear here once they are added to the team." icon={UsersRound} />
        )}
      </section>
    </div>
  );
}

function FinanceTab({
  jobs,
  receipts,
  confirmedValue,
  paidValue,
  closeout,
}: {
  jobs: JobRow[];
  receipts: ReceiptRow[];
  confirmedValue: number;
  paidValue: number;
  closeout: ReturnType<typeof summarizeCloseoutBrief>;
}) {
  const liveJobs = jobs.filter((job) => ["booked", "production"].includes(job.status));
  const recentReceipts = [...receipts].sort(
    (a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime(),
  ).slice(0, 8);

  return (
    <div className="space-y-6">
      <section aria-label="Finance summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Confirmed work" value={money(confirmedValue)} detail={`${liveJobs.length} booked or live jobs`} icon={ArrowUpRight} tone="blue" />
        <MetricCard label="Receipts issued" value={money(paidValue)} detail={`${receipts.length} payment records`} icon={Banknote} tone="green" />
        <MetricCard label="Closeout balance" value={money(closeout.outstandingAmount)} detail="Estimated across active and delivered work" icon={ArrowDownRight} tone={closeout.outstandingAmount > 0 ? "amber" : "neutral"} />
        <MetricCard label="Closeouts to review" value={String(closeout.watchCount)} detail={`${closeout.readyCount} ready for approval`} icon={ClipboardCheck} tone={closeout.watchCount > 0 ? "amber" : "neutral"} />
      </section>

      <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading eyebrow="Payments" title="Recent receipts" count={`${receipts.length} total`} />
          <Link to="/studio/receipts" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-blue-2 hover:text-paper">
            Open receipts ledger <ChevronRight className="size-4" />
          </Link>
        </div>
        {recentReceipts.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-paper/10 text-[10px] uppercase tracking-[0.16em] text-mist">
                  <th scope="col" className="py-3 pr-4 font-medium">Receipt</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Payer</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Issued</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Method</th>
                  <th scope="col" className="py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-paper/5 last:border-0">
                    <td className="py-3 pr-4 text-sm font-medium text-paper">{receipt.receipt_no}</td>
                    <td className="py-3 pr-4 text-sm text-mist">{receipt.payer_name}</td>
                    <td className="py-3 pr-4 text-sm text-mist">{formatEventDate(receipt.issued_at)}</td>
                    <td className="py-3 pr-4 text-sm text-mist">{receipt.payment_method}</td>
                    <td className="py-3 text-right text-sm tabular-nums text-paper">{money(receipt.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No receipts recorded" body="Issued payment records will appear here." icon={FileText} />
        )}
      </section>

      <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
        <SectionHeading eyebrow="Closeout" title="Items to reconcile" count={`${closeout.items.length} items`} />
        {closeout.items.length ? (
          <ul className="mt-4 divide-y divide-paper/10">
            {closeout.items.map((item) => (
              <li key={item.label} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-paper">{item.label}</p>
                  <p className="mt-1 text-sm text-mist">{item.detail}</p>
                  <p className="mt-1 text-xs text-mist">Owner: {item.owner}</p>
                </div>
                <StatusBadge state={item.state} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing waiting on closeout" body="Finance and delivery items are up to date." icon={Check} />
        )}
      </section>
    </div>
  );
}

function OperationsTab({
  jobs,
  readiness,
  attentionJobs,
}: {
  jobs: JobRow[];
  readiness: ReturnType<typeof summarizeJobReadiness>;
  attentionJobs: JobRow[];
}) {
  const activeJobs = [...jobs]
    .filter((job) => ["booked", "production"].includes(job.status))
    .sort((a, b) => {
      const aDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">Production readiness</p>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-serif text-6xl leading-none tabular-nums text-paper">{readiness.score}</span>
            <span className="pb-1 text-xl text-mist">/ 100</span>
          </div>
          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-paper/10"
            role="progressbar"
            aria-label="Production readiness score"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={readiness.score}
          >
            <div className="h-full rounded-full bg-blue-2 transition-[width]" style={{ width: `${readiness.score}%` }} />
          </div>
          <p className="mt-3 text-sm text-mist">Based on booked work, delivery progress, and the next scheduled show.</p>
        </div>

        <div className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading eyebrow="Needs attention" title="Decision queue" count={`${attentionJobs.length} jobs`} />
          {attentionJobs.length ? (
            <ul className="mt-4 divide-y divide-paper/10">
              {attentionJobs.slice(0, 6).map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-paper">{job.title}</p>
                    <p className="mt-1 truncate text-xs text-mist">
                      {job.client_name} · {job.status} · {job.venue ?? "Venue not set"}
                    </p>
                  </div>
                  <AlertCircle className="size-4 shrink-0 text-amber-200" aria-label="Needs review" />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No jobs flagged" body="There are no open inquiries or missing booking details." icon={Check} />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
        <SectionHeading eyebrow="Delivery schedule" title="Booked & in production" count={`${activeJobs.length} jobs`} />
        {activeJobs.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-paper/10 text-[10px] uppercase tracking-[0.16em] text-mist">
                  <th scope="col" className="py-3 pr-4 font-medium">Production</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Client</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Date & venue</th>
                  <th scope="col" className="py-3 pr-4 font-medium">Status</th>
                  <th scope="col" className="py-3 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {activeJobs.map((job) => (
                  <tr key={job.id} className="border-b border-paper/5 last:border-0">
                    <td className="py-3 pr-4 text-sm font-medium text-paper">{job.title}</td>
                    <td className="py-3 pr-4 text-sm text-mist">{job.client_name}</td>
                    <td className="py-3 pr-4 text-sm text-mist">
                      {formatEventDate(job.event_date)}<span className="block text-xs">{job.venue ?? "Venue not set"}</span>
                    </td>
                    <td className="py-3 pr-4"><JobStatus status={job.status} /></td>
                    <td className="py-3 text-right text-sm tabular-nums text-paper">{money(job.ballpark)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No booked productions" body="Confirmed and active productions will appear here." icon={CalendarDays} />
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "amber" | "neutral";
}) {
  const iconTone = {
    blue: "text-blue-2 bg-blue/10",
    green: "text-emerald-300 bg-emerald-400/10",
    amber: "text-amber-200 bg-amber-400/10",
    neutral: "text-mist bg-paper/5",
  }[tone];
  return (
    <article className="rounded-xl border border-paper/10 bg-ink/75 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-mist">{label}</p>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", iconTone)}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 break-words font-serif text-3xl leading-tight tabular-nums text-paper md:text-4xl">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-mist">{detail}</p>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  count,
  action,
}: {
  eyebrow: string;
  title: string;
  count?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-blue-2">{eyebrow}</p>
        <h2 className="mt-1 text-2xl text-paper md:text-3xl">{title}</h2>
      </div>
      {action ?? (count ? <span className="text-xs text-mist">{count}</span> : null)}
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.13em] text-mist">{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums text-paper">{value}</p>
    </div>
  );
}

function InviteBadge({ status }: { status: InviteStatus }) {
  const className =
    status === "Ready to start"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : status === "Waiting on docs"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : "border-blue/25 bg-blue/10 text-blue-2";
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]", className)}>
      {status}
    </span>
  );
}

function RosterStatus({ status }: { status: string }) {
  const active = ["active", "called", "on-site"].includes(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs capitalize", active ? "text-emerald-200" : "text-mist")}>
      <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-300" : "bg-paper/30")} />
      {status.replaceAll("-", " ")}
    </span>
  );
}

function JobStatus({ status }: { status: string }) {
  const inProduction = status === "production";
  return (
    <span className={cn(
      "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]",
      inProduction
        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
        : "border-blue/25 bg-blue/10 text-blue-2",
    )}>
      {inProduction ? "In production" : "Booked"}
    </span>
  );
}

function StatusBadge({ state }: { state: "ready" | "watch" | "risk" }) {
  const styles = {
    ready: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    watch: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    risk: "border-red-300/25 bg-red-300/10 text-red-100",
  }[state];
  return (
    <span className={cn("inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em]", styles)}>
      {state}
    </span>
  );
}

function EmptyState({ title, body, icon: Icon }: { title: string; body: string; icon: LucideIcon }) {
  return (
    <div className="mt-5 flex items-start gap-3 rounded-lg border border-dashed border-paper/15 px-4 py-5">
      <Icon className="mt-0.5 size-4 shrink-0 text-mist" aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-paper">{title}</p>
        <p className="mt-1 text-sm text-mist">{body}</p>
      </div>
    </div>
  );
}

function DashboardLoading({ label }: { label: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-paper/10 bg-ink/60 p-8" role="status">
      <div className="flex items-center gap-3 text-sm text-mist">
        <RefreshCw className="size-4 animate-spin text-blue-2" />
        {label}
      </div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-300/20 bg-red-300/5 p-5 md:p-6" role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-200" />
        <div>
          <p className="font-medium text-paper">Admin data is unavailable</p>
          <p className="mt-1 text-sm text-mist">{message}</p>
          <Button type="button" className="mt-4" variant="line" onClick={onRetry}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
