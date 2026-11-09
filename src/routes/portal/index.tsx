import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  FolderOpen,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";
import { eventLabel } from "@/data/catalog";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getMe, listMyJobs, type JobRow } from "@/lib/server/studio";
import { cn, formatMoney } from "@/lib/utils";

export const Route = createFileRoute("/portal/")({ component: PortalHome });

const PROJECT_STEPS = ["inquiry", "quoted", "booked", "production", "delivered"];

function money(amount: number) {
  return formatMoney(amount, "KES");
}

function PortalHome() {
  const { user, isPending } = useCurrentUserState();
  const userId = user?.id;
  const isPresentationPreview = user?.isDevFallback === true;
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setRoleError(null);
      return;
    }

    let active = true;
    setRole(null);
    setRoleError(null);
    getMe()
      .then((profile) => {
        if (active) setRole(profile.role);
      })
      .catch((error) => {
        console.error("[client-portal] Could not verify workspace role", error);
        if (active) setRoleError("Your account access could not be verified. Please retry.");
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listMyJobs();
      setJobs(rows);
    } catch (error) {
      console.error("[client-portal] Could not load projects", error);
      setLoadError("Your projects couldn’t be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId && (role === "client" || isPresentationPreview)) void loadJobs();
  }, [userId, role, loadJobs, isPresentationPreview]);

  const sortedJobs = useMemo(
    () =>
      [...jobs].sort((a, b) => {
        const order = (status: string) => {
          const index = PROJECT_STEPS.indexOf(status);
          return index < 0 ? PROJECT_STEPS.length : index;
        };
        const stage = order(a.status) - order(b.status);
        if (stage !== 0) return stage;
        return (a.event_date ?? "").localeCompare(b.event_date ?? "");
      }),
    [jobs],
  );
  const activeJobs = jobs.filter((job) => ["booked", "production"].includes(job.status));
  const deliveredJobs = jobs.filter((job) => job.status === "delivered");
  const needsAttention = jobs.filter((job) => ["inquiry", "quoted"].includes(job.status));
  const featuredJob =
    sortedJobs.find((job) => ["booked", "production"].includes(job.status)) ??
    sortedJobs[0] ??
    null;

  if (isPending) return <PortalWorkspaceLoading message="Checking your account…" />;
  if (!user) return <RedirectToSignIn />;
  if (roleError) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <main className="shell pt-32">
          <p role="alert" className="max-w-xl text-sm text-red-300">
            {roleError}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-md border border-paper/15 px-4 py-2 text-sm text-paper hover:bg-paper/5"
          >
            Retry
          </button>
        </main>
      </div>
    );
  }
  if (role === "admin" && !isPresentationPreview) return <Navigate to="/admin" />;
  if (role === "staff" && !isPresentationPreview) return <Navigate to="/studio" />;
  if (role !== null && role !== "client" && !isPresentationPreview) {
    return (
      <div className="min-h-dvh bg-void">
        <SiteNav />
        <main className="shell pt-32">
          <p role="alert" className="max-w-xl text-sm text-red-300">
            Your account has an unrecognized workspace role. Contact an administrator for access.
          </p>
        </main>
      </div>
    );
  }
  if (role === null) return <PortalWorkspaceLoading message="Loading your projects…" />;

  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="shell pb-20 pt-28">
        <header className="flex flex-col gap-5 border-b border-paper/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Client workspace</p>
            <h1 className="mt-2 text-4xl md:text-5xl">Your projects.</h1>
            <p className="mt-3 max-w-2xl text-sm text-mist md:text-base">
              A clear view of what’s moving, what needs you, and what’s next.
            </p>
          </div>
          <Link to="/quote">
            <Button variant="primary" className="min-h-11">
              <Sparkles className="size-4" />
              Start a project
            </Button>
          </Link>
        </header>

        {loading ? (
          <PortalLoading />
        ) : loadError ? (
          <PortalError message={loadError} onRetry={() => void loadJobs()} />
        ) : jobs.length === 0 ? (
          <EmptyProjects />
        ) : (
          <div className="space-y-5 pt-5 sm:space-y-7 sm:pt-7">
            <section aria-label="Project summary" className="grid grid-cols-3 gap-2 sm:gap-3">
              <SummaryCard
                label="In progress"
                shortLabel="Active"
                value={String(activeJobs.length)}
                detail="Projects underway"
                icon={FolderOpen}
                tone="blue"
              />
              <SummaryCard
                label="Needs your attention"
                shortLabel="Action"
                value={String(needsAttention.length)}
                detail="Inquiry or quote awaiting a next step"
                icon={CircleAlert}
                tone={needsAttention.length > 0 ? "amber" : "neutral"}
              />
              <SummaryCard
                label="Completed"
                shortLabel="Done"
                value={String(deliveredJobs.length)}
                detail="Delivered projects"
                icon={Check}
                tone="green"
              />
            </section>

            {featuredJob ? (
              <section className="overflow-hidden rounded-xl border border-blue/20 bg-[linear-gradient(120deg,rgb(47_107_255/0.12),transparent_58%)]">
                <div className="grid gap-4 p-4 sm:gap-6 sm:p-5 md:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.65fr)] md:p-7">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-2">
                        {featuredJob.status === "production" ? "In production" : "Your next step"}
                      </p>
                      <ProjectStatus status={featuredJob.status} />
                    </div>
                    <h2 className="mt-3 text-3xl text-paper md:text-4xl">{featuredJob.title}</h2>
                    <p className="mt-2 text-sm text-mist">
                      {eventLabel(featuredJob.event_type)}
                      {featuredJob.venue ? ` · ${featuredJob.venue}` : ""}
                    </p>
                    <ProjectProgress status={featuredJob.status} className="mt-6 max-w-xl" />
                  </div>
                  <div className="flex flex-col justify-between gap-4 rounded-lg border border-paper/10 bg-void/40 p-3.5 sm:gap-5 sm:p-4 md:p-5">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-1 md:gap-4">
                      <Detail
                        icon={CalendarDays}
                        label="Event date"
                        value={formatPortalDate(featuredJob.event_date)}
                      />
                      <Detail
                        icon={Clock3}
                        label="Project value"
                        value={money(featuredJob.ballpark)}
                      />
                    </div>
                    <Link to="/portal/$projectId" params={{ projectId: featuredJob.id }}>
                      <Button variant="paper" className="min-h-11 w-full">
                        Open project
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-2">
                    Your work
                  </p>
                  <h2 className="mt-1 text-2xl text-paper">All projects</h2>
                </div>
                <Button
                  type="button"
                  variant="line"
                  size="sm"
                  className="min-h-11"
                  onClick={() => void loadJobs()}
                  disabled={loading}
                  aria-label="Refresh projects"
                >
                  <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
              <div className="grid gap-3">
                {sortedJobs.map((job) => (
                  <ProjectCard key={job.id} job={job} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function ProjectCard({ job }: { job: JobRow }) {
  return (
    <Link
      to="/portal/$projectId"
      params={{ projectId: job.id }}
      className="group grid min-w-0 gap-4 rounded-xl border border-paper/10 bg-ink/70 p-4 transition-colors hover:border-blue/30 hover:bg-paper/[0.035] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ProjectStatus status={job.status} />
          <span className="text-xs text-mist">{eventLabel(job.event_type)}</span>
        </div>
        <h3 className="mt-2 truncate text-xl text-paper">{job.title}</h3>
        <p className="mt-1 truncate text-sm text-mist">
          {job.venue ? `${job.venue} · ` : ""}
          {formatPortalDate(job.event_date)}
        </p>
        <ProjectProgress status={job.status} className="mt-4 max-w-md" />
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-paper/10 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
        <p className="text-lg tabular-nums text-paper">{money(job.ballpark)}</p>
        <span className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-blue-2 group-hover:text-paper">
          Project details <ChevronRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function SummaryCard({
  label,
  shortLabel,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  shortLabel: string;
  value: string;
  detail: string;
  icon: typeof FolderOpen;
  tone: "blue" | "amber" | "green" | "neutral";
}) {
  const colors = {
    blue: "bg-blue/10 text-blue-2",
    amber: "bg-amber-300/10 text-amber-200",
    green: "bg-emerald-400/10 text-emerald-200",
    neutral: "bg-paper/5 text-mist",
  }[tone];
  return (
    <article className="min-w-0 rounded-lg border border-paper/10 bg-ink/70 p-3 sm:rounded-xl sm:p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[9px] font-medium uppercase tracking-[0.08em] text-mist sm:text-xs sm:tracking-[0.14em]">
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </p>
        <span className={cn("hidden size-9 place-items-center rounded-lg sm:grid", colors)}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-1 font-serif text-2xl tabular-nums text-paper sm:mt-3 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 hidden text-xs text-mist sm:block">{detail}</p>
    </article>
  );
}

function ProjectStatus({ status }: { status: string }) {
  const colors =
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
        colors,
      )}
    >
      {status.replaceAll("-", " ")}
    </span>
  );
}

function ProjectProgress({ status, className }: { status: string; className?: string }) {
  if (status === "cancelled") {
    return (
      <p className={cn("text-xs text-mist", className)} aria-label="Project cancelled">
        This project was cancelled.
      </p>
    );
  }
  const current = PROJECT_STEPS.indexOf(status);
  const stage = current < 0 ? 0 : current;
  return (
    <div className={cn("min-w-0", className)} aria-label={`Project stage: ${status}`}>
      <p className="mb-2 text-xs capitalize text-mist sm:hidden">Stage: {PROJECT_STEPS[stage]}</p>
      <div className="flex items-center" aria-hidden="true">
        {PROJECT_STEPS.map((step, index) => (
          <div key={step} className="flex min-w-0 flex-1 items-center last:flex-none">
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                index <= stage ? "bg-blue-2" : "bg-paper/20",
              )}
            />
            {index < PROJECT_STEPS.length - 1 ? (
              <span className={cn("h-px flex-1", index < stage ? "bg-blue-2/80" : "bg-paper/15")} />
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-2 hidden justify-between gap-1 text-[9px] capitalize tracking-wide text-mist sm:flex sm:text-[10px]">
        {PROJECT_STEPS.map((step) => (
          <span key={step}>{step}</span>
        ))}
      </div>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-blue-2" aria-hidden="true" />
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-mist">{label}</p>
        <p className="mt-1 text-sm text-paper">{value}</p>
      </div>
    </div>
  );
}

function EmptyProjects() {
  return (
    <section className="mt-8 grid min-h-72 place-items-center rounded-xl border border-dashed border-paper/15 bg-ink/40 px-5 py-12 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-blue/10 text-blue-2">
          <FolderOpen className="size-5" />
        </span>
        <p className="mt-4 text-2xl text-paper">Your workspace starts here.</p>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          Start a project using the button above. Its progress, approvals, invoices, and receipts
          will all be tracked here.
        </p>
      </div>
    </section>
  );
}

function PortalWorkspaceLoading({ message }: { message: string }) {
  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="shell pb-20 pt-28">
        <header className="border-b border-paper/10 pb-7">
          <p className="eyebrow">Client workspace</p>
          <h1 className="mt-2 text-4xl md:text-5xl">Your projects.</h1>
          <p className="mt-3 max-w-2xl text-sm text-mist md:text-base">
            A clear view of what’s moving, what needs you, and what’s next.
          </p>
        </header>
        <PortalLoading message={message} />
      </main>
    </div>
  );
}

function PortalLoading({ message = "Loading your projects…" }: { message?: string }) {
  return (
    <div
      className="mt-8 grid min-h-64 place-items-center rounded-xl border border-paper/10 bg-ink/50 p-8"
      role="status"
    >
      <div className="flex items-center gap-3 text-sm text-mist">
        <RefreshCw className="size-4 animate-spin text-blue-2" />
        {message}
      </div>
    </div>
  );
}

function PortalError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mt-8 rounded-xl border border-red-300/20 bg-red-300/5 p-5" role="alert">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-200" />
        <div>
          <p className="font-medium text-paper">Projects unavailable</p>
          <p className="mt-1 text-sm text-mist">{message}</p>
          <Button type="button" variant="line" className="mt-4 min-h-11" onClick={onRetry}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatPortalDate(value: string | null) {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return new Intl.DateTimeFormat("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
