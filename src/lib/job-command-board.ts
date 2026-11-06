export type JobCommandRow = {
  id?: string;
  title: string;
  status: string;
  event_date?: string | null;
  ballpark?: number | null;
  venue?: string | null;
  client_name?: string;
  service?: string;
};

export type JobCommandSummary = {
  live: number;
  outstanding: number;
  value: number;
  dueSoon: JobCommandRow[];
  needsAttention: JobCommandRow[];
};

function isLiveStatus(status: string): boolean {
  return ["booked", "production"].includes(status);
}

function isAttentionStatus(status: string): boolean {
  return ["inquiry", "quoted"].includes(status) || !status;
}

export function hasProductionVenue(venue: string | null | undefined): boolean {
  const normalized = venue?.trim().toLowerCase();
  return Boolean(normalized && normalized !== "tbc" && normalized !== "to be confirmed");
}

const SHOW_WEEK_DAYS = 45;

export function summarizeJobCommandBoard(rows: JobCommandRow[]): JobCommandSummary {
  const live = rows.filter((row) => isLiveStatus(row.status));
  const dueSoon = live
    .filter((row) => row.event_date)
    .filter((row) => {
      const delta = new Date(row.event_date as string).getTime() - Date.now();
      const days = delta / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= SHOW_WEEK_DAYS;
    })
    .sort((a, b) => new Date(a.event_date ?? 0).getTime() - new Date(b.event_date ?? 0).getTime());

  const needsAttention = rows
    .filter((row) =>
      ["inquiry", "quoted", "booked", "production"].includes(row.status) &&
      (isAttentionStatus(row.status) || !hasProductionVenue(row.venue) || !row.event_date)
    )
    .sort((a, b) => {
      const aScore = Number(!hasProductionVenue(a.venue)) + Number(!a.event_date) + Number(isAttentionStatus(a.status));
      const bScore = Number(!hasProductionVenue(b.venue)) + Number(!b.event_date) + Number(isAttentionStatus(b.status));
      return bScore - aScore;
    });

  const value = live.reduce((sum, row) => sum + (row.ballpark ?? 0), 0);
  const outstanding = rows.filter((row) => isAttentionStatus(row.status)).length;

  return {
    live: live.length,
    outstanding,
    value,
    dueSoon,
    needsAttention,
  };
}
