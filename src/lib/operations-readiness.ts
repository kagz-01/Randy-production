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
  overdue: number;
  delivered: number;
  nearest: JobReadinessRow | null;
};

export function summarizeJobReadiness(rows: JobReadinessRow[]): JobReadinessSummary {
  const active = rows.filter((row) => ["booked", "production"].includes(row.status));
  const live = active.length;
  const watchlist = rows.filter((row) => ["inquiry", "quoted"].includes(row.status)).length;
  const delivered = rows.filter((row) => row.status === "delivered").length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = active.filter((row) => {
    if (!row.event_date) return false;
    const eventDate = new Date(row.event_date);
    if (Number.isNaN(eventDate.getTime())) return false;
    eventDate.setHours(0, 0, 0, 0);
    return eventDate < today;
  }).length;

  const nearest = active
    .filter((row) => {
      if (!row.event_date) return false;
      const eventDate = new Date(row.event_date);
      if (Number.isNaN(eventDate.getTime())) return false;
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    })
    .sort((a, b) => new Date(a.event_date ?? 0).getTime() - new Date(b.event_date ?? 0).getTime())[0] ?? null;

  const score = Math.max(0, Math.min(100, live * 35 + delivered * 15 - watchlist * 17 - overdue * 17 + (nearest ? 3 : 0)));

  return {
    score,
    live,
    watchlist,
    overdue,
    delivered,
    nearest: nearest ?? null,
  };
}
