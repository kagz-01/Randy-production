import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileText,
  LayoutDashboard,
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
  type KeyboardEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { KnowledgeBaseTab } from "@/components/admin/knowledge-base-tab";
import { Input } from "@/components/ui/input";
import { summarizeCloseoutBrief } from "@/lib/closeout-brief";
import { summarizeJobReadiness, type JobReadinessRow } from "@/lib/operations-readiness";
import {
  createTeamInvite,
  getMe,
  getAdminPaymentPlan,
  getPaymentAvailability,
  issueMilestoneInvoice,
  listCrew,
  listPipeline,
  listReceipts,
  listTeamInvites,
  proposePaymentAgreement,
  setJobShowcase,
  type CrewRow,
  type JobRow,
  type PaymentAgreementRow,
  type PaymentMilestoneWithInvoiceRow,
  type ReceiptRow,
  type TeamInviteRow,
  revokeTeamInvite,
  updateTeamInviteStatus,
} from "@/lib/server/studio";
import { cn } from "@/lib/utils";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/admin/")({ component: AdminDashboard });

type InviteStatus = "Invite sent" | "Waiting on docs" | "Ready to start" | "Expired" | "Revoked";
type AdminTabKey =
  "overview" | "people" | "finance" | "operations" | "public-updates" | "knowledge";

type TeamInvite = {
  id: string;
  name: string;
  role: string;
  team: string;
  status: InviteStatus;
  email: string;
  date: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
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
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "people", label: "People & access", icon: UsersRound },
  { id: "finance", label: "Finance & receipts", icon: Banknote },
  { id: "operations", label: "Production operations", icon: BriefcaseBusiness },
  { id: "public-updates", label: "Studio Updates", icon: Eye },
  { id: "knowledge", label: "Knowledge base", icon: BookOpen },
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
  const status: InviteStatus = invite.revoked_at
    ? "Revoked"
    : invite.accepted_at
      ? "Ready to start"
      : !invite.expires_at || new Date(invite.expires_at).getTime() <= Date.now()
        ? "Expired"
        : (invite.status as InviteStatus);
  return {
    id: invite.id,
    name: invite.name,
    role: invite.role,
    team: invite.team,
    status,
    email: invite.email,
    date: invite.created_at.slice(0, 10),
    expiresAt: invite.expires_at,
    acceptedAt: invite.accepted_at,
    revokedAt: invite.revoked_at,
  };
}

function formatEventDate(value: string | null | undefined) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function eventDaysFromToday(value: string | null | undefined) {
  if (!value) return null;
  const eventDate = new Date(value);
  if (Number.isNaN(eventDate.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  return Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);
}

function getAttentionReason(job: JobRow) {
  const eventOffset = eventDaysFromToday(job.event_date);
  if (["booked", "production"].includes(job.status) && eventOffset !== null && eventOffset < 0) {
    return `Event passed ${Math.abs(eventOffset)} days ago · still marked ${job.status}`;
  }
  if (["inquiry", "quoted"].includes(job.status)) return `Follow up on the ${job.status}`;
  const missing = [
    !job.venue || job.venue === "TBC" ? "venue" : null,
    eventOffset === null ? "event date" : null,
    job.ballpark <= 0 ? "budget" : null,
  ].filter((item): item is string => item !== null);
  return `Missing ${missing.join(", ")}`;
}

function AdminDashboard() {
  const { user, isPending: authPending } = useCurrentUserState();
  const [activeTab, setActiveTab] = useState<AdminTabKey>("overview");
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accessRetry, setAccessRetry] = useState(0);
  const [savingInvite, setSavingInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [updatingInviteId, setUpdatingInviteId] = useState<string | null>(null);
  const [updatingShowcaseId, setUpdatingShowcaseId] = useState<string | null>(null);
  const [wideLayout, setWideLayout] = useState(false);
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
    if (authPending || !user) return;
    let active = true;
    getMe()
      .then((profile) => {
        if (!active) return;
        const isAdmin = profile.role === "admin";
        setAuthorized(isAdmin);
        if (isAdmin) void loadDashboard();
        else setLoading(false);
      })
      .catch((error) => {
        console.error("[admin-dashboard] Could not verify admin access", error);
        if (!active) return;
        setAuthorized(false);
        setLoadError("Admin access could not be verified.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessRetry, authPending, loadDashboard, user]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const updateLayout = () => setWideLayout(media.matches);
    updateLayout();
    media.addEventListener("change", updateLayout);
    window.addEventListener("resize", updateLayout);
    return () => {
      media.removeEventListener("change", updateLayout);
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  const metrics = useMemo(() => {
    const activeCrew = crew.filter((person) =>
      ["active", "called", "on-site"].includes(person.status),
    ).length;
    const pendingInvites = invites.filter((person) =>
      ["Invite sent", "Waiting on docs"].includes(person.status),
    ).length;
    const liveJobs = jobs.filter((job) => ["booked", "production"].includes(job.status));
    const confirmedValue = liveJobs.reduce((sum, job) => sum + job.ballpark, 0);
    const paidValue = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    const billableJobIds = new Set(
      jobs
        .filter((job) => ["booked", "production", "delivered"].includes(job.status))
        .map((job) => job.id),
    );
    const paidForActiveJobs = receipts
      .filter((receipt) => billableJobIds.has(receipt.job_id))
      .reduce((sum, receipt) => sum + receipt.amount, 0);
    const closeout = summarizeCloseoutBrief(jobs, paidForActiveJobs);
    const readiness = summarizeJobReadiness(jobs);
    const attentionJobs = jobs.filter((job) => {
      if (["inquiry", "quoted"].includes(job.status)) return true;
      if (!["booked", "production"].includes(job.status)) return false;
      const eventOffset = eventDaysFromToday(job.event_date);
      return !job.venue || eventOffset === null || job.ballpark <= 0 || eventOffset < 0;
    });
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
      setInvites((current) => [
        mapInvite(created),
        ...current.filter((invite) => invite.id !== created.id),
      ]);
      setForm({ name: "", role: "Production associate", team: "Operations", email: "" });
      const link = new URL(created.invitePath, window.location.origin).toString();
      setInviteLink(link);
      try {
        await navigator.clipboard.writeText(link);
        toast.success(`Secure invite created and copied. Share it directly with ${name}.`);
      } catch (error) {
        console.error("[admin-dashboard] Could not copy staff invite", error);
        toast.success(`Secure invite created for ${name}. Copy the link shown below.`);
      }
      setInviteLink(link);
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
      setInvites((current) =>
        current.map((invite) => (invite.id === id ? mapInvite(updated) : invite)),
      );
      toast.success("Onboarding status updated.");
    } catch (error) {
      console.error("[admin-dashboard] Could not update invite status", error);
      toast.error("The onboarding status could not be updated.");
    } finally {
      setUpdatingInviteId(null);
    }
  }

  async function revokeInvite(id: string) {
    setUpdatingInviteId(id);
    try {
      const updated = await revokeTeamInvite({ data: { id } });
      setInvites((current) =>
        current.map((invite) => (invite.id === id ? mapInvite(updated) : invite)),
      );
      toast.success("Staff invitation revoked.");
    } catch (error) {
      console.error("[admin-dashboard] Could not revoke staff invite", error);
      toast.error("The invitation could not be revoked.");
    } finally {
      setUpdatingInviteId(null);
    }
  }

  async function changeShowcaseStatus(job: JobRow) {
    const isShowcase = !job.is_showcase;
    setUpdatingShowcaseId(job.id);
    try {
      const updated = await setJobShowcase({ data: { id: job.id, isShowcase } });
      setJobs((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, is_showcase: updated.is_showcase } : item,
        ),
      );
      toast.success(
        updated.is_showcase
          ? "Project published to Studio Updates."
          : "Project removed from Studio Updates.",
      );
    } catch (error) {
      console.error("[admin-dashboard] Could not update public project status", error);
      toast.error("The Studio Updates listing could not be changed. Please try again.");
    } finally {
      setUpdatingShowcaseId(null);
    }
  }

  const activeTabInfo = TABS.find((tab) => tab.id === activeTab) ?? TABS[0];
  const activeSectionTitle = activeTabInfo.label;

  if (authPending) return <div className="min-h-dvh bg-void" />;
  if (!user) return <RedirectToSignIn />;
  if (authorized === false && !loadError) return <Navigate to="/portal" />;

  if (authorized === null) {
    return <main className="shell py-16 text-sm text-mist">Verifying Admin access…</main>;
  }
  if (!authorized) {
    return (
      <main className="shell py-16">
        <h1 className="font-serif text-4xl text-paper">Admin access required</h1>
        <p className="mt-3 max-w-lg text-sm text-mist">
          Invitations, team access, and operational controls are reserved for Studio Admins.
        </p>
        {loadError ? (
          <>
            <p role="alert" className="mt-4 text-sm text-red-300">{loadError}</p>
            <Button
              type="button"
              variant="line"
              className="mt-4 min-h-11"
              onClick={() => {
                setAuthorized(null);
                setLoadError(null);
                setAccessRetry((count) => count + 1);
              }}
            >
              Retry access check
            </Button>
          </>
        ) : null}
      </main>
    );
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const previousKey = wideLayout ? "ArrowUp" : "ArrowLeft";
    const nextKey = wideLayout ? "ArrowDown" : "ArrowRight";
    if (![previousKey, nextKey, "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? TABS.length - 1
          : (index + (event.key === nextKey ? 1 : TABS.length - 1)) % TABS.length;
    const nextTab = TABS[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById(`admin-tab-${nextTab.id}`)?.focus();
  }

  return (
    <main className="shell pb-16">
      <div className="flex flex-col gap-6 border-b border-paper/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-mist">
            <span>Administration</span>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span className="text-paper">{activeSectionTitle}</span>
          </div>
          <h1 className="mt-3 font-sans text-3xl font-semibold tracking-tight text-paper md:text-4xl">
            {activeSectionTitle}
          </h1>
          <p className="mt-2 text-sm text-mist">
            {activeTab === "overview"
              ? "A live view of team, production, and money."
              : activeTab === "people"
                ? "Manage the roster, invitations, and onboarding."
                : activeTab === "finance"
                  ? "Track receipts, booked value, and closeout."
                  : activeTab === "operations"
                    ? "Review production readiness and work in motion."
                    : activeTab === "public-updates"
                      ? "Choose which eligible projects appear on the public Studio Updates page."
                      : "Curate, review, and publish cited guidance for Help Me Choose."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="line"
            size="sm"
            className="min-h-11"
            onClick={() => void loadDashboard()}
            disabled={loading}
            aria-label="Refresh admin dashboard"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          {activeTab === "people" ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="min-h-11"
              onClick={() => document.getElementById("new-invite-name")?.focus()}
            >
              <UserPlus className="size-3.5" />
              Add teammate
            </Button>
          ) : activeTab === "finance" ? (
            <Link to="/admin/receipts">
              <Button variant="primary" size="sm" className="min-h-11">
                <FileText className="size-3.5" />
                Open receipts
              </Button>
            </Link>
          ) : activeTab === "operations" ? (
            <Link to="/studio/pipeline" search={{ jobId: undefined }}>
              <Button variant="primary" size="sm" className="min-h-11">
                <BriefcaseBusiness className="size-3.5" />
                Open pipeline
              </Button>
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 gap-6 pt-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">
            Admin sections
          </p>
          <div
            className="grid grid-cols-2 gap-2 pb-2 lg:flex lg:flex-col lg:pb-0"
            role="tablist"
            aria-orientation={wideLayout ? "vertical" : "horizontal"}
            aria-label="Admin dashboard sections"
          >
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              const badgeCount =
                tab.id === "people"
                  ? metrics.pendingInvites
                  : tab.id === "finance"
                    ? metrics.closeout.watchCount + metrics.closeout.readyCount
                    : tab.id === "operations"
                      ? metrics.attentionJobs.length
                      : tab.id === "public-updates"
                        ? jobs.filter((job) => job.is_showcase).length
                        : 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  id={`admin-tab-${tab.id}`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`admin-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                  className={cn(
                    "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg border px-3 text-left text-xs font-medium leading-tight transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-2 sm:gap-3 sm:text-sm lg:w-full",
                    selected
                      ? "border-blue/25 bg-blue/10 text-paper"
                      : "border-transparent text-mist hover:border-paper/10 hover:bg-paper/5 hover:text-paper",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">{tab.label}</span>
                  {badgeCount > 0 ? (
                    <span
                      aria-hidden="true"
                      className="ml-auto min-w-5 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-center text-[10px] tabular-nums text-amber-200"
                    >
                      {badgeCount}
                    </span>
                  ) : null}
                  {selected ? (
                    <span className="ml-auto hidden size-1.5 rounded-full bg-blue-2 lg:block" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section
          id={`admin-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`admin-tab-${activeTab}`}
          tabIndex={0}
          className="min-w-0 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-2"
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
                  jobs={jobs}
                  receipts={receipts}
                  closeout={metrics.closeout}
                  onOpenPeople={() => setActiveTab("people")}
                  onOpenFinance={() => setActiveTab("finance")}
                  onOpenOperations={() => setActiveTab("operations")}
                />
              ) : null}
              {activeTab === "people" ? (
                <PeopleTab
                  crew={crew}
                  invites={invites}
                  inviteLink={inviteLink}
                  form={form}
                  savingInvite={savingInvite}
                  updatingInviteId={updatingInviteId}
                  onFormChange={setForm}
                  onSubmit={addInvite}
                  onStatusChange={changeInviteStatus}
                  onRevoke={revokeInvite}
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
              {activeTab === "public-updates" ? (
                <PublicUpdatesTab
                  jobs={jobs}
                  updatingJobId={updatingShowcaseId}
                  onToggle={changeShowcaseStatus}
                />
              ) : null}
              {activeTab === "knowledge" ? <KnowledgeBaseTab /> : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function OverviewTab({
  metrics,
  crew,
  invites,
  jobs,
  receipts,
  closeout,
  onOpenPeople,
  onOpenFinance,
  onOpenOperations,
}: {
  metrics: AdminMetrics;
  crew: CrewRow[];
  invites: TeamInvite[];
  jobs: JobRow[];
  receipts: ReceiptRow[];
  closeout: ReturnType<typeof summarizeCloseoutBrief>;
  onOpenPeople: () => void;
  onOpenFinance: () => void;
  onOpenOperations: () => void;
}) {
  const priorityInvites = invites
    .filter((invite) => ["Invite sent", "Waiting on docs"].includes(invite.status))
    .slice(0, 4);
  const nextEvent = metrics.readiness.nearest;
  const pastEventCount = metrics.attentionJobs.filter(
    (job) =>
      ["booked", "production"].includes(job.status) &&
      (eventDaysFromToday(job.event_date) ?? 0) < 0,
  ).length;
  const openLeadCount = metrics.attentionJobs.filter((job) =>
    ["inquiry", "quoted"].includes(job.status),
  ).length;
  const bookingGapCount = metrics.attentionJobs.length - pastEventCount - openLeadCount;
  const receiptMonths = useMemo(() => buildReceiptMonths(receipts), [receipts]);
  const maxMonthValue = Math.max(...receiptMonths.map((month) => month.amount), 1);
  const portfolio = [...jobs]
    .sort((a, b) => {
      const priority = (status: string) =>
        status === "production"
          ? 0
          : status === "booked"
            ? 1
            : status === "quoted"
              ? 2
              : status === "inquiry"
                ? 3
                : 4;
      const byStatus = priority(a.status) - priority(b.status);
      if (byStatus !== 0) return byStatus;
      return (a.event_date ?? "").localeCompare(b.event_date ?? "");
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section aria-label="Admin summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Gross receipts"
          value={money(metrics.paidValue)}
          detail={`${receipts.length} issued payment records`}
          icon={Banknote}
          tone="green"
        />
        <MetricCard
          label="Active productions"
          value={String(metrics.liveJobs)}
          detail={`${money(metrics.confirmedValue)} booked value`}
          icon={CalendarDays}
          tone="blue"
        />
        <MetricCard
          label="Team roster"
          value={String(crew.length)}
          detail={`${metrics.activeCrew} currently called or on site`}
          icon={UsersRound}
          tone="neutral"
        />
        <MetricCard
          label="Jobs to review"
          value={String(metrics.attentionJobs.length)}
          detail={`${pastEventCount} past date · ${openLeadCount} open leads · ${bookingGapCount} booking gaps`}
          icon={AlertCircle}
          tone={metrics.attentionJobs.length > 0 ? "amber" : "neutral"}
        />
      </section>

      <PriorityQueue
        jobs={jobs}
        crew={crew}
        invites={invites}
        closeout={closeout}
        onOpenPeople={onOpenPeople}
        onOpenFinance={onOpenFinance}
      />

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
        <section className="min-w-0 rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading
            eyebrow="Finance · last six months"
            title="Receipt activity"
            action={
              <button
                type="button"
                onClick={onOpenFinance}
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-2 hover:bg-paper/5"
              >
                View finance <ChevronRight className="size-4" />
              </button>
            }
          />
          <div
            className="mt-5 grid h-56 grid-cols-6 items-end gap-3 border-b border-l border-paper/10 px-2 pb-2 pt-4 sm:h-64 sm:gap-5 sm:px-4"
            role="img"
            aria-label={`Monthly receipt totals for the last six months: ${receiptMonths.map((month) => `${month.label} ${money(month.amount)}`).join(", ")}`}
          >
            {receiptMonths.map((month) => {
              const height =
                month.amount > 0 ? Math.max((month.amount / maxMonthValue) * 100, 4) : 0;
              return (
                <div
                  key={month.key}
                  className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                >
                  <span
                    className="max-w-full truncate text-[10px] tabular-nums text-mist"
                    title={money(month.amount)}
                  >
                    {month.amount > 0 ? compactMoney(month.amount) : ""}
                  </span>
                  <div className="flex h-[72%] w-full items-end justify-center">
                    <div
                      className={cn(
                        "w-full max-w-10 rounded-t-sm transition-[height] duration-500",
                        month.amount > 0
                          ? "bg-blue shadow-[0_0_20px_rgb(47_107_255_/_0.18)]"
                          : "bg-paper/5",
                      )}
                      style={{ height: `${height}%` }}
                      title={`${month.label}: ${money(month.amount)}`}
                    />
                  </div>
                  <span className="text-[10px] text-mist sm:text-xs">{month.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2 text-mist">
              <span className="size-2 rounded-sm bg-blue" />
              Receipts issued
            </span>
            <span className="tabular-nums text-paper">
              Six-month total · {money(receiptMonths.reduce((sum, month) => sum + month.amount, 0))}
            </span>
          </div>
        </section>

        <AdminSignals
          metrics={metrics}
          nextEvent={nextEvent}
          priorityInvites={priorityInvites}
          onOpenPeople={onOpenPeople}
          onOpenOperations={onOpenOperations}
        />
      </div>

      <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
        <SectionHeading
          eyebrow="Production portfolio"
          title="Jobs at a glance"
          count={`${jobs.length} records`}
          action={
            <button
              type="button"
              onClick={onOpenOperations}
              className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-2 hover:bg-paper/5"
            >
              Open operations <ChevronRight className="size-4" />
            </button>
          }
        />
        {portfolio.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[660px] border-collapse text-left">
              <thead>
                <tr className="border-b border-paper/10 text-[10px] uppercase tracking-[0.16em] text-mist">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Production
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Client
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Event date
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-3 text-right font-medium">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((job) => (
                  <tr key={job.id} className="border-b border-paper/5 last:border-0">
                    <td className="py-3 pr-4 text-sm font-medium text-paper">
                      <Link
                        to="/studio/pipeline"
                        search={{ jobId: job.id }}
                        className="rounded-sm hover:text-blue-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-2"
                      >
                        {job.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-sm text-mist">{job.client_name}</td>
                    <td className="py-3 pr-4 text-sm text-mist">
                      {formatEventDate(job.event_date)}
                    </td>
                    <td className="py-3 pr-4">
                      <PortfolioStatus status={job.status} />
                    </td>
                    <td className="py-3 text-right text-sm tabular-nums text-paper">
                      {money(job.ballpark)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No production records"
            body="Jobs will appear here as they enter the production pipeline."
            icon={CalendarDays}
          />
        )}
      </section>
    </div>
  );
}

type PriorityItem =
  | { kind: "job"; id: string; title: string; detail: string; priority: number }
  | { kind: "crew"; id: string; title: string; detail: string; priority: number }
  | { kind: "people"; id: string; title: string; detail: string; priority: number }
  | { kind: "finance"; id: string; title: string; detail: string; priority: number };

function PriorityQueue({
  jobs,
  crew,
  invites,
  closeout,
  onOpenPeople,
  onOpenFinance,
}: {
  jobs: JobRow[];
  crew: CrewRow[];
  invites: TeamInvite[];
  closeout: ReturnType<typeof summarizeCloseoutBrief>;
  onOpenPeople: () => void;
  onOpenFinance: () => void;
}) {
  const items = useMemo(() => {
    const queue: PriorityItem[] = [];
    const activeJobs = jobs
      .filter((job) => ["booked", "production"].includes(job.status))
      .filter((job) => (eventDaysFromToday(job.event_date) ?? -1) >= 0)
      .sort((a, b) => {
        const aDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });
    const nextJob = activeJobs[0];

    for (const job of jobs) {
      const active = ["booked", "production"].includes(job.status);
      const eventOffset = eventDaysFromToday(job.event_date);
      const missing = [
        !job.venue || job.venue === "TBC" ? "venue" : null,
        eventOffset === null ? "event date" : null,
        job.ballpark <= 0 ? "budget" : null,
      ].filter((item): item is string => item !== null);

      if (active && eventOffset !== null && eventOffset < 0) {
        queue.push({
          kind: "job",
          id: job.id,
          title: `Close the loop on ${job.title}`,
          detail: `${job.client_name} · event passed ${Math.abs(eventOffset)} days ago but is still marked ${job.status}`,
          priority: 115,
        });
      } else if (active && missing.length > 0) {
        queue.push({
          kind: "job",
          id: job.id,
          title: `Prepare ${job.title}`,
          detail: `${job.client_name} · confirm ${missing.join(", ")}`,
          priority: 100,
        });
      } else if (["inquiry", "quoted"].includes(job.status)) {
        queue.push({
          kind: "job",
          id: job.id,
          title: `Follow up: ${job.title}`,
          detail: `${job.client_name} · ${job.status} · ${money(job.ballpark)}`,
          priority: job.status === "inquiry" ? 70 : 60,
        });
      }
    }

    if (nextJob && !crew.some((person) => person.assigned_job_id === nextJob.id)) {
      queue.push({
        kind: "crew",
        id: nextJob.id,
        title: `Assign the team for ${nextJob.title}`,
        detail: `${nextJob.client_name} · next confirmed event · no crew assigned`,
        priority: 90,
      });
    }

    const pendingInvites = invites.filter((invite) =>
      ["Invite sent", "Waiting on docs"].includes(invite.status),
    );
    if (pendingInvites.length > 0) {
      queue.push({
        kind: "people",
        id: "onboarding",
        title: `Move ${pendingInvites.length} teammate${pendingInvites.length === 1 ? "" : "s"} through onboarding`,
        detail: "Review documents and readiness; access is granted separately.",
        priority: 40,
      });
    }

    for (const item of closeout.items.filter((entry) => entry.state === "ready")) {
      if (!item.jobId) continue;
      queue.push({
        kind: "job",
        id: item.jobId,
        title: `Review delivery: ${item.label}`,
        detail: item.detail,
        priority: 50,
      });
    }

    if (closeout.watchCount > 0) {
      queue.push({
        kind: "finance",
        id: "closeouts",
        title: `Review ${closeout.watchCount} follow-up flag${closeout.watchCount === 1 ? "" : "s"}`,
        detail: "Inspect related jobs and the outstanding receipt picture.",
        priority: 30,
      });
    }

    return queue.sort((a, b) => b.priority - a.priority);
  }, [jobs, crew, invites, closeout]);
  const visibleItems = items.slice(0, 5);

  return (
    <section
      className="rounded-xl border border-blue/20 bg-blue/5 p-5 md:p-6"
      aria-label="Admin priority queue"
    >
      <SectionHeading
        eyebrow="Command center"
        title="Priority queue"
        count={
          items.length > visibleItems.length
            ? `Top ${visibleItems.length} of ${items.length} actions`
            : `${items.length} actions`
        }
      />
      {items.length > 0 ? (
        <ul className="mt-4 divide-y divide-paper/10">
          {visibleItems.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-paper">{item.title}</p>
                <p className="mt-1 text-xs text-mist">{item.detail}</p>
              </div>
              {item.kind === "job" ? (
                <Link
                  to="/studio/pipeline"
                  search={{ jobId: item.id }}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start rounded-md border border-paper/10 px-3 text-xs font-medium text-blue-2 transition-colors hover:bg-paper/5 hover:text-paper sm:self-auto"
                >
                  Open production <ChevronRight className="size-3.5" />
                </Link>
              ) : item.kind === "crew" ? (
                <Link
                  to="/studio/crew"
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start rounded-md border border-paper/10 px-3 text-xs font-medium text-blue-2 transition-colors hover:bg-paper/5 hover:text-paper sm:self-auto"
                >
                  Open crew workspace <ChevronRight className="size-3.5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={item.kind === "people" ? onOpenPeople : onOpenFinance}
                  className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start rounded-md border border-paper/10 px-3 text-xs font-medium text-blue-2 transition-colors hover:bg-paper/5 hover:text-paper sm:self-auto"
                >
                  {item.kind === "people" ? "Open onboarding" : "Open closeouts"}
                  <ChevronRight className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-lg border border-emerald-400/15 bg-emerald-400/5 p-4">
          <p className="text-sm font-medium text-paper">The floor is in good shape.</p>
          <p className="mt-1 text-xs text-mist">
            No booking gaps, next-show crew gap, onboarding follow-ups, delivery reviews, or finance
            flags need attention.
          </p>
        </div>
      )}
    </section>
  );
}

type ReceiptMonth = { key: string; label: string; amount: number };

function buildReceiptMonths(receipts: ReceiptRow[]): ReceiptMonth[] {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    date.setMonth(date.getMonth() - (5 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: new Intl.DateTimeFormat("en-KE", { month: "short" }).format(date),
      amount: 0,
    };
  });
  const totals = new Map(months.map((month) => [month.key, 0]));

  for (const receipt of receipts) {
    const issuedAt = new Date(receipt.issued_at);
    if (Number.isNaN(issuedAt.getTime())) continue;
    const key = `${issuedAt.getFullYear()}-${String(issuedAt.getMonth() + 1).padStart(2, "0")}`;
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + receipt.amount);
  }

  return months.map((month) => ({ ...month, amount: totals.get(month.key) ?? 0 }));
}

function compactMoney(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

function AdminSignals({
  metrics,
  nextEvent,
  priorityInvites,
  onOpenPeople,
  onOpenOperations,
}: {
  metrics: AdminMetrics;
  nextEvent: JobReadinessRow | null;
  priorityInvites: TeamInvite[];
  onOpenPeople: () => void;
  onOpenOperations: () => void;
}) {
  return (
    <aside className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
      <SectionHeading eyebrow="Management snapshot" title="At a glance" />
      <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-4 border-b border-paper/10 pb-5">
        <ScoreRing score={metrics.readiness.score} label="Readiness" />
        <div>
          <p className="text-sm font-medium text-paper">Production readiness</p>
          <p className="mt-1 text-xs leading-relaxed text-mist">
            {metrics.readiness.watchlist} open opportunities · {metrics.readiness.overdue} past
            events still need closure.
          </p>
          <button
            type="button"
            onClick={onOpenOperations}
            className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-blue-2 hover:text-paper"
          >
            Review operations <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 border-b border-paper/10 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-mist">
              Next confirmed event
            </p>
            <p className="mt-1 truncate text-sm font-medium text-paper">
              {nextEvent?.title ?? "No upcoming confirmed event"}
            </p>
            <p className="mt-1 text-xs text-mist">
              {nextEvent
                ? formatEventDate(nextEvent.event_date)
                : "Review past-dated jobs in the priority queue"}
            </p>
          </div>
          <CalendarDays className="mt-1 size-4 shrink-0 text-blue-2" aria-hidden="true" />
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.14em] text-mist">Closeouts</p>
            <p className="mt-1 text-sm font-medium text-paper">
              {metrics.closeout.readyCount} delivered jobs to review
            </p>
            <p className="mt-1 text-xs text-mist">{metrics.closeout.watchCount} follow-up flags</p>
          </div>
          <ClipboardCheck className="mt-1 size-4 shrink-0 text-blue-2" aria-hidden="true" />
        </div>
      </div>

      <div className="pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-mist">Onboarding queue</p>
          <button
            type="button"
            onClick={onOpenPeople}
            className="min-h-9 text-xs font-medium text-blue-2 hover:text-paper"
          >
            Manage
          </button>
        </div>
        {priorityInvites.length ? (
          <ul className="mt-2 divide-y divide-paper/10">
            {priorityInvites.slice(0, 3).map((invite) => (
              <li key={invite.id} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-paper">{invite.name}</p>
                  <p className="truncate text-[10px] text-mist">
                    {invite.team} · {invite.role}
                  </p>
                </div>
                <InviteBadge status={invite.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-mist">
            No teammates are waiting in the onboarding queue.
          </p>
        )}
      </div>
    </aside>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const safeScore = Math.max(0, Math.min(100, score));
  return (
    <div
      className="grid size-[76px] shrink-0 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#7ea2ff ${safeScore}%, rgb(243 241 234 / 0.1) ${safeScore}% 100%)`,
      }}
      role="img"
      aria-label={`${label}: ${safeScore}%`}
    >
      <div className="grid size-[60px] place-items-center rounded-full bg-ink text-center">
        <span className="text-sm font-semibold tabular-nums text-paper">{safeScore}%</span>
      </div>
    </div>
  );
}

function PortfolioStatus({ status }: { status: string }) {
  const className =
    status === "production"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : status === "booked"
        ? "border-blue/25 bg-blue/10 text-blue-2"
        : status === "quoted"
          ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
          : status === "delivered"
            ? "border-paper/10 bg-paper/5 text-mist"
            : "border-paper/10 bg-paper/5 text-mist";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium capitalize tracking-[0.08em]",
        className,
      )}
    >
      {status.replaceAll("-", " ")}
    </span>
  );
}

function PeopleTab({
  crew,
  invites,
  inviteLink,
  form,
  savingInvite,
  updatingInviteId,
  onFormChange,
  onSubmit,
  onStatusChange,
  onRevoke,
}: {
  crew: CrewRow[];
  invites: TeamInvite[];
  inviteLink: string | null;
  form: { name: string; role: string; team: string; email: string };
  savingInvite: boolean;
  updatingInviteId: string | null;
  onFormChange: (form: { name: string; role: string; team: string; email: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onStatusChange: (id: string, status: InviteStatus) => void;
  onRevoke: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div id="new-invite" className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading eyebrow="Team access" title="Invite a teammate" />
          <p className="mt-2 text-sm text-mist">
            Create a private, single-use link for the invited email. It expires in seven days.
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-paper">Full name</span>
              <Input
                id="new-invite-name"
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
              {savingInvite ? "Creating invite…" : "Create secure invite"}
            </Button>
          </form>
          {inviteLink ? (
            <div className="mt-5 space-y-2 border-t border-paper/10 pt-4">
              <label htmlFor="latest-staff-invite" className="text-xs font-medium text-paper">
                Latest share link
              </label>
              <Input
                id="latest-staff-invite"
                readOnly
                value={inviteLink}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                type="button"
                variant="line"
                size="sm"
                className="min-h-11"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteLink);
                    toast.success("Invite link copied.");
                  } catch (error) {
                    console.error("[admin-dashboard] Could not copy staff invite", error);
                    toast.error("Copy was blocked. Select the link above and copy it manually.");
                  }
                }}
              >
                Copy invite link
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading
            eyebrow="Access workflow"
            title="Team access"
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
                      <p className="mt-1 text-xs text-mist">
                        {invite.role} · {invite.team} · added {formatEventDate(invite.date)}
                      </p>
                      {invite.acceptedAt ? (
                        <p className="mt-1 text-[11px] text-emerald-200">
                          Accepted {formatEventDate(invite.acceptedAt)}
                        </p>
                      ) : invite.revokedAt ? (
                        <p className="mt-1 text-[11px] text-mist">Invitation revoked</p>
                      ) : invite.expiresAt ? (
                        <p className="mt-1 text-[11px] text-mist">
                          Expires {formatEventDate(invite.expiresAt)}
                        </p>
                      ) : null}
                    </div>
                    <InviteBadge status={invite.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {invite.status === "Invite sent" ? (
                      <Button
                        type="button"
                        variant="line"
                        size="sm"
                        className="min-h-11"
                        disabled={updatingInviteId === invite.id}
                        onClick={() => onStatusChange(invite.id, "Waiting on docs")}
                      >
                        Waiting on docs
                      </Button>
                    ) : null}
                    {["Invite sent", "Waiting on docs"].includes(invite.status) ? (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="min-h-11"
                        disabled={updatingInviteId === invite.id}
                        onClick={() => onStatusChange(invite.id, "Ready to start")}
                      >
                        {updatingInviteId === invite.id ? "Updating…" : "Mark ready"}
                      </Button>
                    ) : null}
                    {!invite.acceptedAt &&
                    !invite.revokedAt &&
                    invite.expiresAt &&
                    new Date(invite.expiresAt).getTime() > Date.now() ? (
                      <Button
                        type="button"
                        variant="line"
                        size="sm"
                        className="min-h-11"
                        disabled={updatingInviteId === invite.id}
                        onClick={() => onRevoke(invite.id)}
                      >
                        {updatingInviteId === invite.id ? "Revoking…" : "Revoke invite"}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No team invitations yet"
              body="Created invitations appear here with their onboarding status."
              icon={UserPlus}
            />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
        <SectionHeading
          eyebrow="Current team"
          title="Roster"
          count={`${crew.length} people`}
          action={
            <Link
              to="/studio/crew"
              className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-xs font-medium text-blue-2 transition-colors hover:bg-paper/5 hover:text-paper"
            >
              Manage crew calls <ChevronRight className="size-4" />
            </Link>
          }
        />
        {crew.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-paper/10 text-[10px] uppercase tracking-[0.16em] text-mist">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Name
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Role
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-3 font-medium">
                    Next call
                  </th>
                </tr>
              </thead>
              <tbody>
                {crew.map((person) => (
                  <tr key={person.id} className="border-b border-paper/5 last:border-0">
                    <td className="py-3 pr-4 text-sm font-medium text-paper">{person.name}</td>
                    <td className="py-3 pr-4 text-sm text-mist">{person.role}</td>
                    <td className="py-3 pr-4">
                      <RosterStatus status={person.status} />
                    </td>
                    <td className="py-3 text-sm text-mist">{person.call_time ?? "Not assigned"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Roster is empty"
            body="Crew members appear here once they are added to the team."
            icon={UsersRound}
          />
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
  const recentReceipts = [...receipts]
    .sort((a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <section aria-label="Finance summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Confirmed work"
          value={money(confirmedValue)}
          detail={`${liveJobs.length} booked or live jobs`}
          icon={ArrowUpRight}
          tone="blue"
        />
        <MetricCard
          label="Receipts issued"
          value={money(paidValue)}
          detail={`${receipts.length} payment records`}
          icon={Banknote}
          tone="green"
        />
        <MetricCard
          label="Estimated balance"
          value={money(closeout.outstandingAmount)}
          detail="Booked and delivered jobs, less their receipts"
          icon={ArrowDownRight}
          tone={closeout.outstandingAmount > 0 ? "amber" : "neutral"}
        />
        <MetricCard
          label="Follow-up flags"
          value={String(closeout.watchCount)}
          detail={`${closeout.readyCount} delivered jobs to review`}
          icon={ClipboardCheck}
          tone={closeout.watchCount > 0 ? "amber" : "neutral"}
        />
      </section>

      <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading
            eyebrow="Payments"
            title="Recent receipts"
            count={`${receipts.length} total`}
          />
          <Link
            to="/admin/receipts"
            className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-medium text-blue-2 hover:text-paper"
          >
            Open receipts ledger <ChevronRight className="size-4" />
          </Link>
        </div>
        {recentReceipts.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-paper/10 text-[10px] uppercase tracking-[0.16em] text-mist">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Receipt
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Payer
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Issued
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Method
                  </th>
                  <th scope="col" className="py-3 text-right font-medium">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentReceipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-paper/5 last:border-0">
                    <td className="py-3 pr-4 text-sm font-medium text-paper">
                      {receipt.receipt_no}
                    </td>
                    <td className="py-3 pr-4 text-sm text-mist">{receipt.payer_name}</td>
                    <td className="py-3 pr-4 text-sm text-mist">
                      {formatEventDate(receipt.issued_at)}
                    </td>
                    <td className="py-3 pr-4 text-sm text-mist">{receipt.payment_method}</td>
                    <td className="py-3 text-right text-sm tabular-nums text-paper">
                      {money(receipt.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No receipts recorded"
            body="Issued payment records will appear here."
            icon={FileText}
          />
        )}
      </section>

      <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
        <SectionHeading
          eyebrow="Finance & delivery"
          title="Recommended follow-ups"
          count={`${closeout.items.length} items`}
        />
        {closeout.items.length ? (
          <ul className="mt-4 divide-y divide-paper/10">
            {closeout.items.map((item) => (
              <li
                key={item.label}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-paper">{item.label}</p>
                  <p className="mt-1 text-sm text-mist">{item.detail}</p>
                  <p className="mt-1 text-xs text-mist">Owner: {item.owner}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge state={item.state} />
                  {item.jobId ? (
                    <Link
                      to="/studio/pipeline"
                      search={{ jobId: item.jobId }}
                      className="inline-flex min-h-11 items-center gap-1 rounded-md border border-paper/10 px-3 text-xs font-medium text-blue-2 transition-colors hover:bg-paper/5 hover:text-paper"
                    >
                      Open production <ChevronRight className="size-3.5" />
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No finance or delivery follow-ups"
            body="Booked work, receipts, and delivery flags are clear."
            icon={Check}
          />
        )}
      </section>
      <PaymentAgreementManager jobs={jobs} />
    </div>
  );
}

type MilestoneDraft = { label: string; amount: string; dueDate: string; note: string };
const EMPTY_MILESTONE: MilestoneDraft = { label: "", amount: "", dueDate: "", note: "" };

function PaymentAgreementManager({ jobs }: { jobs: JobRow[] }) {
  const linkedJobs = useMemo(() => jobs.filter((job) => job.owner_user_id), [jobs]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [agreement, setAgreement] = useState<PaymentAgreementRow | null>(null);
  const [milestones, setMilestones] = useState<PaymentMilestoneWithInvoiceRow[]>([]);
  const [terms, setTerms] = useState("");
  const [draftMilestones, setDraftMilestones] = useState<MilestoneDraft[]>([
    { ...EMPTY_MILESTONE },
  ]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentAvailable, setPaymentAvailable] = useState(false);
  const [paymentAvailabilityChecked, setPaymentAvailabilityChecked] = useState(false);

  const selectedJob = linkedJobs.find((job) => job.id === selectedJobId) ?? null;
  const draftTotal = draftMilestones.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  useEffect(() => {
    if (!selectedJobId && linkedJobs[0]) setSelectedJobId(linkedJobs[0].id);
  }, [linkedJobs, selectedJobId]);

  const loadPlan = useCallback(async (jobId: string) => {
    setError(null);
    setLoading(true);
    try {
      const result = await getAdminPaymentPlan({ data: { jobId } });
      setAgreement(result.agreement);
      setMilestones(result.milestones);
      setTerms(result.agreement?.terms ?? "");
      setDraftMilestones(
        result.milestones.length
          ? result.milestones.map((item) => ({
              label: item.label,
              amount: String(item.amount),
              dueDate: item.due_date?.slice(0, 10) ?? "",
              note: item.note ?? "",
            }))
          : [{ ...EMPTY_MILESTONE }],
      );
    } catch (loadError) {
      console.error("[admin-finance] Could not load payment agreement", loadError);
      setError("The payment agreement could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setAgreement(null);
      setMilestones([]);
      return;
    }
    void loadPlan(selectedJobId);
  }, [loadPlan, selectedJobId]);

  useEffect(() => {
    let active = true;
    getPaymentAvailability()
      .then((result) => {
        if (active) setPaymentAvailable(result.available);
      })
      .catch((availabilityError) => {
        console.error("[admin-finance] Could not check payment availability", availabilityError);
        if (active) setPaymentAvailable(false);
      })
      .finally(() => {
        if (active) setPaymentAvailabilityChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateMilestone(index: number, patch: Partial<MilestoneDraft>) {
    setDraftMilestones((current) =>
      current.map((milestone, itemIndex) =>
        itemIndex === index ? { ...milestone, ...patch } : milestone,
      ),
    );
  }

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedJob) return;
    setSaving(true);
    setError(null);
    try {
      const result = await proposePaymentAgreement({
        data: {
          jobId: selectedJob.id,
          terms,
          milestones: draftMilestones.map((item) => ({
            label: item.label,
            amount: Number(item.amount),
            dueDate: item.dueDate || null,
            note: item.note,
          })),
        },
      });
      setAgreement(result.agreement);
      setMilestones(result.milestones);
      setDraftMilestones(
        result.milestones.map((item) => ({
          label: item.label,
          amount: String(item.amount),
          dueDate: item.due_date?.slice(0, 10) ?? "",
          note: item.note ?? "",
        })),
      );
      toast.success("Custom payment terms sent to the client for agreement.");
    } catch (saveError) {
      console.error("[admin-finance] Could not propose payment agreement", saveError);
      const message =
        saveError instanceof Error ? saveError.message : "The proposal could not be sent.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function issueInvoice(milestoneId: string) {
    setIssuingId(milestoneId);
    try {
      await issueMilestoneInvoice({ data: { milestoneId } });
      await loadPlan(selectedJobId);
      toast.success("Invoice issued to the client workspace.");
    } catch (issueError) {
      console.error("[admin-finance] Could not issue milestone invoice", issueError);
      toast.error(
        issueError instanceof Error ? issueError.message : "The invoice could not be issued.",
      );
    } finally {
      setIssuingId(null);
    }
  }

  const canEdit = !milestones.some((milestone) => milestone.invoice_id);

  return (
    <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
      <SectionHeading eyebrow="Agreed terms" title="Custom payment plan" />
      <p className="mt-2 max-w-3xl text-sm text-mist">
        Propose the client-specific milestones agreed with the client. A milestone becomes payable
        only after the client accepts the plan and Admin issues its invoice.
      </p>
      {paymentAvailabilityChecked && !paymentAvailable ? (
        <p
          role="status"
          className="mt-4 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3 text-xs leading-relaxed text-amber-100"
        >
          Online payment collection is not enabled. You can prepare agreed terms and invoices, but
          clients cannot pay through the app until a payment provider is integrated.
        </p>
      ) : null}
      {linkedJobs.length ? (
        <label className="mt-5 grid max-w-2xl gap-2 text-xs font-medium text-mist">
          Client project
          <select
            value={selectedJobId}
            onChange={(event) => setSelectedJobId(event.target.value)}
            className="min-h-11 rounded-md border border-paper/15 bg-void px-3 text-sm text-paper"
          >
            {linkedJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} · {job.client_name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <EmptyState
          title="No linked client projects"
          body="Link a verified client account to a production before proposing payment terms."
          icon={Banknote}
        />
      )}
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="mt-4 text-sm text-mist">
          Loading payment terms…
        </p>
      ) : null}
      {selectedJob && !loading ? (
        <div className="mt-5 space-y-5">
          {agreement ? (
            <div className="rounded-lg border border-paper/10 bg-void/35 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-paper">Current proposal</p>
                <span className="rounded-full border border-paper/15 px-2.5 py-1 text-[10px] capitalize text-mist">
                  {agreement.status.replaceAll("_", " ")}
                </span>
              </div>
              {agreement.client_feedback ? (
                <p className="mt-3 whitespace-pre-wrap rounded-md border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-amber-100">
                  Client response: {agreement.client_feedback}
                </p>
              ) : null}
              {agreement.accepted_at ? (
                <p className="mt-3 text-xs text-emerald-200">
                  Accepted {new Date(agreement.accepted_at).toLocaleString("en-KE")}
                </p>
              ) : null}
              <ul className="mt-4 grid gap-3">
                {milestones.map((milestone) => (
                  <li key={milestone.id} className="rounded-lg border border-paper/10 bg-ink/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-blue-2">
                          Milestone {milestone.sort_order + 1}
                        </p>
                        <h3 className="mt-1 text-base font-medium text-paper">{milestone.label}</h3>
                        {milestone.note ? (
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-mist">
                            {milestone.note}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="font-serif text-2xl tabular-nums text-paper">
                          {money(milestone.amount)}
                        </p>
                        <p className="mt-1 text-xs text-mist">
                          {milestone.due_date
                            ? `Due ${formatEventDate(milestone.due_date)}`
                            : "Due date to be agreed"}
                        </p>
                      </div>
                    </div>
                    {milestone.invoice_id ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-paper/10 bg-void/50 px-3 py-2">
                        <p className="text-xs text-mist">
                          Invoice ref <span className="font-mono text-paper">{milestone.invoice_id}</span>
                        </p>
                        <span className="rounded-full border border-paper/15 px-2.5 py-1 text-[10px] capitalize text-mist">
                          {milestone.invoice_status ?? "issued"}
                        </span>
                      </div>
                    ) : agreement.status === "accepted" ? (
                      <div className="mt-3 rounded-md border border-blue-2/15 bg-blue/5 p-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-blue-2">
                          Invoice preview
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-mist">
                          Bill to {selectedJob?.client_name} · {selectedJob?.title} ·{" "}
                          {milestone.due_date
                            ? `due ${formatEventDate(milestone.due_date)}`
                            : "due date to be agreed"}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-medium tabular-nums text-paper">
                            Amount due {money(milestone.amount)}
                          </p>
                          <Button
                            type="button"
                            variant="line"
                            size="sm"
                            className="min-h-11"
                            disabled={issuingId !== null}
                            onClick={() => void issueInvoice(milestone.id)}
                          >
                            {issuingId === milestone.id ? "Issuing…" : "Issue invoice"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-mist">
                        Invoice can be issued after the client accepts these terms.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {canEdit ? (
            <form
              onSubmit={submitProposal}
              className="rounded-lg border border-paper/10 bg-void/35 p-4"
            >
              <h3 className="text-lg font-medium text-paper">
                {agreement ? "Revise and resubmit proposal" : "Propose agreed milestones"}
              </h3>
              <label className="mt-4 grid gap-1.5 text-xs font-medium text-mist">
                Terms agreed with the client
                <textarea
                  required
                  maxLength={5000}
                  rows={4}
                  value={terms}
                  onChange={(event) => setTerms(event.target.value)}
                  className="w-full rounded-md border border-paper/15 bg-void px-3 py-2.5 text-sm text-paper outline-none focus-visible:border-blue-2"
                  placeholder="Record the payment timing, conditions, and any project-specific agreement."
                />
              </label>
              <div className="mt-4 space-y-3">
                {draftMilestones.map((milestone, index) => (
                  <fieldset
                    key={index}
                    className="grid gap-3 rounded-md border border-paper/10 p-3 sm:grid-cols-2 xl:grid-cols-4"
                  >
                    <legend className="px-1 text-[10px] uppercase tracking-[0.14em] text-mist">
                      Milestone {index + 1}
                    </legend>
                    <label className="grid gap-1 text-xs text-mist">
                      Name
                      <Input
                        required
                        maxLength={120}
                        value={milestone.label}
                        onChange={(event) => updateMilestone(index, { label: event.target.value })}
                        placeholder="e.g. Venue booking"
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-mist">
                      Amount (KES)
                      <Input
                        required
                        type="number"
                        min={1}
                        max={2_000_000_000}
                        step={1}
                        value={milestone.amount}
                        onChange={(event) => updateMilestone(index, { amount: event.target.value })}
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-mist">
                      Due date
                      <Input
                        type="date"
                        value={milestone.dueDate}
                        onChange={(event) =>
                          updateMilestone(index, { dueDate: event.target.value })
                        }
                      />
                    </label>
                    <label className="grid gap-1 text-xs text-mist sm:col-span-2 xl:col-span-1">
                      Milestone details
                      <Input
                        maxLength={1000}
                        value={milestone.note}
                        onChange={(event) => updateMilestone(index, { note: event.target.value })}
                        placeholder="Optional"
                      />
                    </label>
                    {draftMilestones.length > 1 ? (
                      <Button
                        type="button"
                        variant="line"
                        size="sm"
                        className="min-h-11 sm:col-span-2 xl:col-span-4 sm:justify-self-end"
                        onClick={() =>
                          setDraftMilestones((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        Remove milestone
                      </Button>
                    ) : null}
                  </fieldset>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="line"
                    size="sm"
                    className="min-h-11"
                    disabled={draftMilestones.length >= 12}
                    onClick={() =>
                      setDraftMilestones((items) => [...items, { ...EMPTY_MILESTONE }])
                    }
                  >
                    Add milestone
                  </Button>
                  <p className="text-xs text-mist">
                    Milestone total {money(draftTotal)} · project estimate{" "}
                    {money(selectedJob.ballpark)}
                  </p>
                </div>
                <Button type="submit" className="min-h-11" disabled={saving}>
                  {saving ? "Sending proposal…" : "Send for client agreement"}
                </Button>
              </div>
              <div
                className={`mt-4 rounded-lg border p-4 ${
                  draftTotal === selectedJob.ballpark
                    ? "border-emerald-300/20 bg-emerald-300/5"
                    : "border-amber-300/20 bg-amber-300/5"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-mist">
                      Payment plan total
                    </p>
                    <p className="mt-1 font-serif text-2xl tabular-nums text-paper">
                      {money(draftTotal)}
                    </p>
                  </div>
                  <p className="max-w-xl text-xs leading-relaxed text-mist">
                    {draftTotal === selectedJob.ballpark
                      ? "Matches the current planning estimate."
                      : `${money(Math.abs(draftTotal - selectedJob.ballpark))} ${
                          draftTotal > selectedJob.ballpark ? "above" : "below"
                        } the current planning estimate. Confirm the difference reflects the agreed project scope.`}
                  </p>
                </div>
              </div>
            </form>
          ) : (
            <p className="text-sm text-mist">
              Invoiced milestones are locked. Any change must be agreed separately before additional
              billing.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function PublicUpdatesTab({
  jobs,
  updatingJobId,
  onToggle,
}: {
  jobs: JobRow[];
  updatingJobId: string | null;
  onToggle: (job: JobRow) => void;
}) {
  const sortedJobs = [...jobs].sort((a, b) =>
    (a.event_date ?? "").localeCompare(b.event_date ?? ""),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-blue/20 bg-blue/5 p-5 md:p-6">
        <p className="text-sm leading-relaxed text-mist">
          Publishing a project makes its title, event type, status and date visible to anyone on the
          public Studio Updates page. Client names, venue, budget and internal notes are not shown
          there.
        </p>
      </section>

      <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
        <SectionHeading
          eyebrow="Public visibility"
          title="Choose what visitors can see"
          count={`${jobs.filter((job) => job.is_showcase).length} published`}
        />
        {sortedJobs.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-paper/10 text-[10px] uppercase tracking-[0.16em] text-mist">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Project
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Event date
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-3 text-right font-medium">
                    Public listing
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedJobs.map((job) => {
                  const eligible = ["booked", "production", "delivered"].includes(job.status);
                  const disabled = updatingJobId === job.id || (!eligible && !job.is_showcase);
                  return (
                    <tr key={job.id} className="border-b border-paper/5 last:border-0">
                      <td className="py-3 pr-4">
                        <Link
                          to="/studio/pipeline"
                          search={{ jobId: job.id }}
                          className="text-sm font-medium text-paper hover:text-blue-2"
                        >
                          {job.title}
                        </Link>
                        <p className="mt-1 text-xs capitalize text-mist">
                          {job.event_type.replaceAll("_", " ")}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-sm text-mist">
                        {formatEventDate(job.event_date)}
                      </td>
                      <td className="py-3 pr-4">
                        <PortfolioStatus status={job.status} />
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={job.is_showcase}
                          aria-label={`${job.is_showcase ? "Remove" : "Publish"} ${job.title} ${job.is_showcase ? "from" : "to"} Studio Updates`}
                          disabled={disabled}
                          onClick={() => onToggle(job)}
                          className={cn(
                            "inline-flex min-h-11 items-center rounded-full border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                            job.is_showcase
                              ? "border-blue/40 bg-blue/15 text-blue-2"
                              : "border-paper/15 text-mist hover:border-paper/35 hover:text-paper",
                          )}
                        >
                          {updatingJobId === job.id
                            ? "Saving…"
                            : job.is_showcase
                              ? "Published"
                              : "Not published"}
                        </button>
                        {!eligible && !job.is_showcase ? (
                          <span className="mt-1 block text-[10px] text-mist">
                            Available after booking
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No projects to share yet"
            body="Booked, in-production and delivered projects will appear here when they are ready for public review."
            icon={Eye}
          />
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
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mist">
            Production readiness
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="font-serif text-6xl leading-none tabular-nums text-paper">
              {readiness.score}
            </span>
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
            <div
              className="h-full rounded-full bg-blue-2 transition-[width]"
              style={{ width: `${readiness.score}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-mist">
            {readiness.overdue
              ? `Includes ${readiness.overdue} past-dated booking${readiness.overdue === 1 ? "" : "s"} still marked active.`
              : "Based on booked work, delivery progress, and the next upcoming show."}
          </p>
        </div>

        <div className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading
            eyebrow="Needs attention"
            title="Decision queue"
            count={`${attentionJobs.length} jobs`}
          />
          {attentionJobs.length ? (
            <ul className="mt-4 divide-y divide-paper/10">
              {attentionJobs.slice(0, 6).map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      to="/studio/pipeline"
                      search={{ jobId: job.id }}
                      className="truncate text-sm font-medium text-paper hover:text-blue-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-2"
                    >
                      {job.title}
                    </Link>
                    <p className="mt-1 truncate text-xs text-mist">
                      {job.client_name} · {getAttentionReason(job)}
                    </p>
                  </div>
                  <AlertCircle
                    className="size-4 shrink-0 text-amber-200"
                    aria-label="Needs review"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No jobs flagged"
              body="There are no open inquiries or missing booking details."
              icon={Check}
            />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
        <SectionHeading
          eyebrow="Delivery schedule"
          title="Booked & in production"
          count={`${activeJobs.length} jobs`}
        />
        {activeJobs.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead>
                <tr className="border-b border-paper/10 text-[10px] uppercase tracking-[0.16em] text-mist">
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Production
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Client
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Date & venue
                  </th>
                  <th scope="col" className="py-3 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-3 text-right font-medium">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeJobs.map((job) => (
                  <tr key={job.id} className="border-b border-paper/5 last:border-0">
                    <td className="py-3 pr-4 text-sm font-medium text-paper">
                      <Link
                        to="/studio/pipeline"
                        search={{ jobId: job.id }}
                        className="rounded-sm hover:text-blue-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-2"
                      >
                        {job.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-sm text-mist">{job.client_name}</td>
                    <td className="py-3 pr-4 text-sm text-mist">
                      {formatEventDate(job.event_date)}
                      <span className="block text-xs">{job.venue ?? "Venue not set"}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <JobStatus status={job.status} />
                    </td>
                    <td className="py-3 text-right text-sm tabular-nums text-paper">
                      {money(job.ballpark)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No booked productions"
            body="Confirmed and active productions will appear here."
            icon={CalendarDays}
          />
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
      <p className="mt-4 break-words font-serif text-3xl leading-tight tabular-nums text-paper md:text-4xl">
        {value}
      </p>
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

function InviteBadge({ status }: { status: InviteStatus }) {
  const className =
    status === "Ready to start"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : status === "Waiting on docs"
        ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
        : status === "Invite sent"
          ? "border-blue/25 bg-blue/10 text-blue-2"
          : "border-paper/10 bg-paper/5 text-mist";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]",
        className,
      )}
    >
      {status === "Invite sent" ? "Invite sent" : status}
    </span>
  );
}

function RosterStatus({ status }: { status: string }) {
  const active = ["active", "called", "on-site"].includes(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs capitalize",
        active ? "text-emerald-200" : "text-mist",
      )}
    >
      <span className={cn("size-1.5 rounded-full", active ? "bg-emerald-300" : "bg-paper/30")} />
      {status.replaceAll("-", " ")}
    </span>
  );
}

function JobStatus({ status }: { status: string }) {
  const inProduction = status === "production";
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]",
        inProduction
          ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
          : "border-blue/25 bg-blue/10 text-blue-2",
      )}
    >
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
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em]",
        styles,
      )}
    >
      {state}
    </span>
  );
}

function EmptyState({
  title,
  body,
  icon: Icon,
}: {
  title: string;
  body: string;
  icon: LucideIcon;
}) {
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
    <div
      className="grid min-h-64 place-items-center rounded-xl border border-paper/10 bg-ink/60 p-8"
      role="status"
    >
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
