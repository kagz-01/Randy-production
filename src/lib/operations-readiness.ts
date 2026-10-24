export type JobReadinessRow = {
  title: string;
  status: string;
  event_date?: string | null;
  ballpark?: number | null;
};

export type JobReadinessSummary = {
  score: number;
  live: number;
  watchlist: number;
  delivered: number;
  nearest: JobReadinessRow | null;
};

export function summarizeJobReadiness(rows: JobReadinessRow[]): JobReadinessSummary {
  const live = rows.filter((row) => ["booked", "production"].includes(row.status)).length;
  const watchlist = rows.filter((row) => ["inquiry", "quoted"].includes(row.status)).length;
  const delivered = rows.filter((row) => row.status === "delivered").length;

  const nearest = rows
    .filter((row) => ["booked", "production"].includes(row.status) && row.event_date)
    .sort((a, b) => new Date(a.event_date ?? 0).getTime() - new Date(b.event_date ?? 0).getTime())[0] ?? null;

  const score = Math.max(0, Math.min(100, live * 35 + delivered * 15 - watchlist * 17 + (nearest ? 3 : 0)));

  return {
    score,
    live,
    watchlist,
    delivered,
    nearest: nearest ?? null,
  };
}
