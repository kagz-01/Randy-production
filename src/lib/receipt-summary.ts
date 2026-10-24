export type ReceiptSummaryRow = {
  amount: number;
  kind: string;
  status: string;
  issued_at: string;
};

export type ReceiptSummary = {
  total: number;
  count: number;
  depositTotal: number;
  balanceTotal: number;
  depositShare: number;
  balanceShare: number;
  latest: ReceiptSummaryRow | null;
};

export function summarizeReceiptRows(rows: ReceiptSummaryRow[]): ReceiptSummary {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const depositTotal = rows
    .filter((row) => row.kind === "deposit")
    .reduce((sum, row) => sum + row.amount, 0);
  const balanceTotal = rows
    .filter((row) => row.kind === "balance")
    .reduce((sum, row) => sum + row.amount, 0);

  const latest = rows.reduce<ReceiptSummaryRow | null>((current, row) => {
    if (!current) return row;
    return new Date(row.issued_at).getTime() > new Date(current.issued_at).getTime() ? row : current;
  }, null);

  const depositShare = total === 0 ? 0 : Math.round((depositTotal / total) * 100);
  const balanceShare = total === 0 ? 0 : Math.round((balanceTotal / total) * 100);

  return {
    total,
    count: rows.length,
    depositTotal,
    balanceTotal,
    depositShare,
    balanceShare,
    latest,
  };
}
