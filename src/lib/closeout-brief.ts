export type CloseoutJob = {
  id?: string;
  title: string;
  status?: string | null;
  venue?: string | null;
  event_date?: string | null;
  ballpark?: number | null;
};

export type CloseoutItem = {
  label: string;
  owner: string;
  state: "ready" | "watch" | "risk";
  detail: string;
};

export type CloseoutSummary = {
  readyCount: number;
  watchCount: number;
  riskCount: number;
  outstandingAmount: number;
  items: CloseoutItem[];
};

export function summarizeCloseoutBrief(jobs: CloseoutJob[], paidAmount = 0): CloseoutSummary {
  const items: CloseoutItem[] = [];

  const activeJobs = jobs.filter((job) => ["production", "booked", "delivered"].includes(job.status ?? ""));
  const activeValue = activeJobs.reduce((sum, job) => sum + (job.ballpark ?? 0), 0);
  const outstandingAmount = Math.max(activeValue - paidAmount, 0);

  const venuePending = activeJobs.filter((job) => !job.venue || job.venue === "TBC");
  if (venuePending.length) {
    items.push({
      label: "Venue confirmation",
      owner: "Venue coordinator",
      state: "watch",
      detail: `${venuePending[0].title} still needs the final site and access confirmation.`,
    });
  }

  const budgetOpen = activeJobs.filter((job) => !job.ballpark || job.ballpark <= 0);
  if (budgetOpen.length) {
    items.push({
      label: "Budget sign-off",
      owner: "Finance",
      state: "watch",
      detail: `${budgetOpen[0].title} is still missing a final spend or scope approval.`,
    });
  }

  const delivered = activeJobs.filter((job) => job.status === "delivered");
  if (delivered.length) {
    items.push({
      label: "Final client approval",
      owner: "Producer",
      state: "ready",
      detail: `${delivered[0].title} is ready for final sign-off and asset handover.`,
    });
  }

  const pendingScope = activeJobs.filter((job) => ["inquiry", "quoted"].includes(job.status ?? ""));
  if (pendingScope.length) {
    items.push({
      label: "Client scope confirmation",
      owner: "Producer",
      state: "watch",
      detail: `${pendingScope[0].title} needs the final scope lock before production starts.`,
    });
  }

  const finalInvoice = activeJobs.filter((job) => job.status === "delivered" && (job.ballpark ?? 0) > 0 && outstandingAmount > 0);
  if (finalInvoice.length) {
    items.push({
      label: "Settlement and closeout",
      owner: "Finance",
      state: "watch",
      detail: `${finalInvoice[0].title} still has outstanding closeout and payment reconciliation.`,
    });
  }

  const readyCount = items.filter((item) => item.state === "ready").length;
  const watchCount = items.filter((item) => item.state === "watch").length;
  const riskCount = items.filter((item) => item.state === "risk").length;

  return {
    readyCount,
    watchCount,
    riskCount,
    outstandingAmount,
    items,
  };
}
