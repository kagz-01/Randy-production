import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Printer,
  RefreshCw,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assignCrew, listCrew, listPipeline, type CrewRow, type JobRow } from "@/lib/server/studio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio/crew")({ component: CrewPage });

type CrewFilter = "all" | "called" | "on-site" | "standby";
type CrewTab = "overview" | "roster" | "call-sheet";

const FILTERS: { id: CrewFilter; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "called", label: "Called" },
  { id: "on-site", label: "On site" },
  { id: "standby", label: "Standby" },
];

const TABS: { id: CrewTab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: CalendarDays },
  { id: "roster", label: "Crew roster", icon: UsersRound },
  { id: "call-sheet", label: "Call sheet", icon: Clock3 },
];

function CrewPage() {
  const [crew, setCrew] = useState<CrewRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [activeTab, setActiveTab] = useState<CrewTab>("overview");
  const [filter, setFilter] = useState<CrewFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updatingCrewId, setUpdatingCrewId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [crewRows, jobRows] = await Promise.all([listCrew(), listPipeline()]);
      setCrew(crewRows);
      setJobs(jobRows);
    } catch (error) {
      console.error("[crew-workspace] Could not load crew data", error);
      setLoadError("Crew and production information could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeJobs = useMemo(
    () =>
      [...jobs]
        .filter((job) => ["booked", "production"].includes(job.status))
        .sort((a, b) => {
          const aDate = a.event_date ? new Date(a.event_date).getTime() : Number.MAX_SAFE_INTEGER;
          const bDate = b.event_date ? new Date(b.event_date).getTime() : Number.MAX_SAFE_INTEGER;
          return aDate - bDate;
        }),
    [jobs],
  );
  const nextJob = activeJobs[0] ?? null;
  const assignedCrew = useMemo(
    () => (nextJob ? crew.filter((person) => person.assigned_job_id === nextJob.id) : []),
    [crew, nextJob],
  );
  const onSiteCount = assignedCrew.filter((person) => person.status === "on-site").length;
  const calledCount = assignedCrew.filter((person) => person.status === "called").length;
  const standbyCount = crew.filter((person) => person.status === "standby").length;
  const filteredCrew = useMemo(
    () => (filter === "all" ? crew : crew.filter((person) => person.status === filter)),
    [crew, filter],
  );

  async function callCrewMember(person: CrewRow) {
    if (!nextJob) return;
    setUpdatingCrewId(person.id);
    try {
      await assignCrew({
        data: {
          crewId: person.id,
          jobId: nextJob.id,
          callTime: person.call_time || "14:00",
        },
      });
      toast.success(`${person.name} added to ${nextJob.title}.`);
      await refresh();
    } catch (error) {
      console.error("[crew-workspace] Could not assign crew member", error);
      toast.error(`Could not assign ${person.name}. Please try again.`);
    } finally {
      setUpdatingCrewId(null);
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

  function printCallSheet() {
    if (!nextJob) {
      toast.error("There is no booked production to print a call sheet for.");
      return;
    }
    window.print();
  }

  return (
    <main className="shell pb-16">
      <header className="border-b border-paper/10 pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Crew workspace</p>
            <h1 className="mt-2 text-4xl md:text-5xl">The people behind the show.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist md:text-base">
              Check production calls, see who’s on the floor, and keep the team coordinated.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="line"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
              aria-label="Refresh crew workspace"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setActiveTab("call-sheet")}
              disabled={!nextJob || loading}
            >
              <CalendarDays className="size-3.5" />
              Open call sheet
            </Button>
          </div>
        </div>

        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-paper/10" role="tablist" aria-label="Crew sections">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`crew-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`crew-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => onTabKeyDown(event, TABS.findIndex((item) => item.id === tab.id))}
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
        id={`crew-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`crew-tab-${activeTab}`}
        tabIndex={0}
        className="pt-6 outline-none"
      >
        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => void refresh()} />
        ) : activeTab === "overview" ? (
          <Overview
            crew={crew}
            nextJob={nextJob}
            activeJobCount={activeJobs.length}
            assignedCrew={assignedCrew}
            onSiteCount={onSiteCount}
            calledCount={calledCount}
            standbyCount={standbyCount}
            onOpenRoster={() => setActiveTab("roster")}
            onOpenCallSheet={() => setActiveTab("call-sheet")}
            onCallMember={callCrewMember}
            updatingCrewId={updatingCrewId}
          />
        ) : activeTab === "roster" ? (
          <Roster
            crew={filteredCrew}
            filter={filter}
            totalCount={crew.length}
            nextJob={nextJob}
            updatingCrewId={updatingCrewId}
            onFilterChange={setFilter}
            onCallMember={callCrewMember}
          />
        ) : (
          <CallSheet job={nextJob} assignedCrew={assignedCrew} onPrint={printCallSheet} />
        )}
      </div>
    </main>
  );
}

function Overview({
  crew,
  nextJob,
  activeJobCount,
  assignedCrew,
  onSiteCount,
  calledCount,
  standbyCount,
  onOpenRoster,
  onOpenCallSheet,
  onCallMember,
  updatingCrewId,
}: {
  crew: CrewRow[];
  nextJob: JobRow | null;
  activeJobCount: number;
  assignedCrew: CrewRow[];
  onSiteCount: number;
  calledCount: number;
  standbyCount: number;
  onOpenRoster: () => void;
  onOpenCallSheet: () => void;
  onCallMember: (person: CrewRow) => void;
  updatingCrewId: string | null;
}) {
  return (
    <div className="space-y-6">
      <section aria-label="Crew summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Team roster" value={String(crew.length)} detail="Crew members available" icon={UsersRound} tone="blue" />
        <MetricCard
          label={nextJob?.status === "production" ? "On this production" : "On the next call"}
          value={String(assignedCrew.length)}
          detail={nextJob?.title ?? "No booked production"}
          icon={UserRoundCheck}
          tone="green"
        />
        <MetricCard label="On site" value={String(onSiteCount)} detail={`${calledCount} called to report`} icon={Check} tone="neutral" />
        <MetricCard label="On standby" value={String(standbyCount)} detail={`${activeJobCount} booked or live productions`} icon={Clock3} tone={standbyCount > 0 ? "amber" : "neutral"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-blue-2">
                {nextJob?.status === "production" ? "Current production" : "Next production"}
              </p>
              {nextJob ? (
                <>
                  <h2 className="mt-2 text-3xl text-paper md:text-4xl">{nextJob.title}</h2>
                  <p className="mt-2 text-sm text-mist">{nextJob.client_name} · {nextJob.status === "production" ? "In production" : "Booked"}</p>
                </>
              ) : (
                <>
                  <h2 className="mt-2 text-3xl text-paper">No upcoming call</h2>
                  <p className="mt-2 max-w-lg text-sm text-mist">When a production is booked, its crew and call details will appear here.</p>
                </>
              )}
            </div>
            {nextJob ? (
              <span className="rounded-full border border-blue/25 bg-blue/10 px-3 py-1.5 text-xs text-blue-2">
                {nextJob.status === "production" ? "In production" : "Booked"}
              </span>
            ) : null}
          </div>
          {nextJob ? (
            <div className="mt-5 grid gap-3 border-t border-paper/10 pt-5 sm:grid-cols-3">
              <Detail label="Event date" value={formatCrewDate(nextJob.event_date)} />
              <Detail label="Venue" value={nextJob.venue ?? "Venue pending"} />
              <Detail label="Crew assigned" value={`${assignedCrew.length} people`} />
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="line" onClick={onOpenRoster}>
              <UsersRound className="size-4" />
              View roster
            </Button>
            <Button type="button" variant="primary" onClick={onOpenCallSheet} disabled={!nextJob}>
              <CalendarDays className="size-4" />
              Open call sheet
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading
            eyebrow="Team status"
            title={nextJob?.status === "production" ? "On this production" : "On the next call"}
            count={`${assignedCrew.length} assigned`}
          />
          {assignedCrew.length ? (
            <ul className="mt-4 divide-y divide-paper/10">
              {assignedCrew.slice(0, 5).map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-paper">{person.name}</p>
                    <p className="truncate text-xs text-mist">{person.role} · call {person.call_time ?? "time pending"}</p>
                  </div>
                  <CrewStatus status={person.status} />
                </li>
              ))}
              {assignedCrew.length > 5 ? (
                <li className="pt-3 text-xs text-mist">+ {assignedCrew.length - 5} more on this call</li>
              ) : null}
            </ul>
          ) : (
            <EmptyState
              title={nextJob ? "No crew assigned yet" : "No active call"}
              body={nextJob ? "Add team members from the roster to build this call sheet." : "The next booked production will show here."}
              icon={UsersRound}
            />
          )}
        </div>
      </section>

      {nextJob && crew.some((person) => person.assigned_job_id !== nextJob.id) ? (
        <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
          <SectionHeading
            eyebrow="Staffing"
            title="Ready for the call"
            action={
              <button
                type="button"
                onClick={onOpenRoster}
                className="inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm font-medium text-blue-2 hover:bg-paper/5"
              >
                Full roster <ChevronDown className="size-4" />
              </button>
            }
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {crew
              .filter((person) => person.assigned_job_id !== nextJob.id)
              .slice(0, 3)
              .map((person) => (
                <CrewCard
                  key={person.id}
                  person={person}
                  nextJob={nextJob}
                  updating={updatingCrewId === person.id}
                  onCall={() => onCallMember(person)}
                />
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Roster({
  crew,
  filter,
  totalCount,
  nextJob,
  updatingCrewId,
  onFilterChange,
  onCallMember,
}: {
  crew: CrewRow[];
  filter: CrewFilter;
  totalCount: number;
  nextJob: JobRow | null;
  updatingCrewId: string | null;
  onFilterChange: (filter: CrewFilter) => void;
  onCallMember: (person: CrewRow) => void;
}) {
  return (
    <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading eyebrow="Team directory" title="Crew roster" count={`${totalCount} people`} />
        <div className="flex gap-1 overflow-x-auto" aria-label="Filter crew by status">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => onFilterChange(item.id)}
              className={cn(
                "min-h-10 shrink-0 rounded-full border px-3 text-xs transition-colors",
                filter === item.id
                  ? "border-blue/40 bg-blue/10 text-blue-2"
                  : "border-paper/10 text-mist hover:bg-paper/5 hover:text-paper",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {crew.length ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {crew.map((person) => (
            <CrewCard
              key={person.id}
              person={person}
              nextJob={nextJob}
              updating={updatingCrewId === person.id}
              onCall={() => onCallMember(person)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={totalCount ? "No team members in this filter" : "No crew on the roster"}
          body={totalCount ? "Choose another status to see more people." : "Team members will appear here when added."}
          icon={UsersRound}
        />
      )}
    </section>
  );
}

function CallSheet({
  job,
  assignedCrew,
  onPrint,
}: {
  job: JobRow | null;
  assignedCrew: CrewRow[];
  onPrint: () => void;
}) {
  if (!job) {
    return (
      <EmptyState
        title="No production to call"
        body="A call sheet will be available when a production is booked."
        icon={CalendarDays}
      />
    );
  }
  return (
    <section
      id="crew-call-sheet"
      className="rounded-xl border border-paper/10 bg-ink/75 p-5 md:p-8 print:border-0 print:bg-white print:text-black"
    >
      <div className="flex flex-col gap-4 border-b border-paper/10 pb-5 sm:flex-row sm:items-start sm:justify-between print:border-black/20">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-blue-2 print:text-black">Randy Production · Crew call</p>
          <h2 className="mt-2 text-3xl text-paper md:text-4xl print:text-black">{job.title}</h2>
          <p className="mt-2 text-sm text-mist print:text-black">{job.client_name} · {job.status === "production" ? "In production" : "Booked"}</p>
        </div>
        <Button type="button" variant="line" className="print:hidden" onClick={onPrint}>
          <Printer className="size-4" />
          Print call sheet
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Detail label="Date" value={formatCrewDate(job.event_date)} />
        <Detail label="Venue" value={job.venue ?? "Venue pending"} />
        <Detail label="Service" value={job.service} />
      </div>

      {assignedCrew.length ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-paper/15 text-[10px] uppercase tracking-[0.16em] text-mist print:border-black/20 print:text-black">
                <th scope="col" className="py-3 pr-4 font-medium">Crew member</th>
                <th scope="col" className="py-3 pr-4 font-medium">Role</th>
                <th scope="col" className="py-3 pr-4 font-medium">Call time</th>
                <th scope="col" className="py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignedCrew
                .slice()
                .sort((a, b) => (a.call_time ?? "").localeCompare(b.call_time ?? ""))
                .map((person) => (
                  <tr key={person.id} className="border-b border-paper/5 last:border-0 print:border-black/10">
                    <td className="py-3 pr-4 text-sm font-medium text-paper print:text-black">{person.name}</td>
                    <td className="py-3 pr-4 text-sm text-mist print:text-black">{person.role}</td>
                    <td className="py-3 pr-4 text-sm tabular-nums text-paper print:text-black">{person.call_time ?? "Pending"}</td>
                    <td className="py-3"><CrewStatus status={person.status} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No crew assigned yet" body="Add members from the crew roster to complete this call sheet." icon={UsersRound} />
      )}
    </section>
  );
}

function CrewCard({
  person,
  nextJob,
  updating,
  onCall,
}: {
  person: CrewRow;
  nextJob: JobRow | null;
  updating: boolean;
  onCall: () => void;
}) {
  const isAssigned = Boolean(nextJob && person.assigned_job_id === nextJob.id);
  return (
    <article className="rounded-lg border border-paper/10 bg-paper/[0.025] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-medium text-paper">{person.name}</h3>
          <p className="mt-1 truncate text-sm text-mist">{person.role}</p>
        </div>
        <CrewStatus status={person.status} />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-paper/10 pt-3">
        <p className="text-xs text-mist">
          {person.call_time ? `Call ${person.call_time}` : "Call time not set"}
          {isAssigned ? " · assigned to next call" : ""}
        </p>
        {nextJob && !isAssigned ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={updating}
            onClick={onCall}
            className="min-h-10"
          >
            <UserRoundCheck className="size-3.5" />
            {updating ? "Adding…" : "Add to call"}
          </Button>
        ) : null}
      </div>
    </article>
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-paper/10 bg-paper/[0.025] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className="mt-2 break-words text-sm text-paper">{value}</p>
    </div>
  );
}

function CrewStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const inMotion = normalized === "called" || normalized === "on-site";
  const className =
    normalized === "on-site"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
      : normalized === "called"
        ? "border-blue/25 bg-blue/10 text-blue-2"
        : normalized === "standby"
          ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
          : "border-paper/10 bg-paper/5 text-mist";
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]", className)}>
      <span className={cn("size-1.5 rounded-full", inMotion ? "bg-current" : "bg-paper/35")} />
      {status.replaceAll("-", " ")}
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

function LoadingState() {
  return (
    <div className="grid min-h-64 place-items-center rounded-xl border border-paper/10 bg-ink/60 p-8" role="status">
      <div className="flex items-center gap-3 text-sm text-mist">
        <RefreshCw className="size-4 animate-spin text-blue-2" />
        Loading crew workspace…
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-300/20 bg-red-300/5 p-5 md:p-6" role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-200" />
        <div>
          <p className="font-medium text-paper">Crew data is unavailable</p>
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

function formatCrewDate(value: string | null | undefined) {
  if (!value) return "Date not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not set";
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
