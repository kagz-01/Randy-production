export type VendorBoardInput = {
  id: string;
  name: string;
  specialty: string;
  city: string;
  lead_days: number;
  rating: number | string;
};

export type VendorBoardVendor = Omit<VendorBoardInput, "rating"> & {
  rating: number;
  status: "Ready to confirm" | "Preferred partner" | "Watch lead time";
};

export type VendorBoardGroup = {
  specialty: string;
  vendors: VendorBoardVendor[];
};

export function buildVendorBoard(rows: VendorBoardInput[]) {
  const groups = new Map<string, VendorBoardVendor[]>();
  for (const row of rows) {
    const rating = Number(row.rating);
    const status: VendorBoardVendor["status"] = row.lead_days <= 5
      ? "Ready to confirm"
      : rating >= 4.8
        ? "Preferred partner"
        : "Watch lead time";

    const item = {
      ...row,
      rating,
      status,
    };

    const bucket = groups.get(row.specialty) ?? [];
    bucket.push(item);
    groups.set(row.specialty, bucket);
  }

  const orderedGroups = Array.from(groups.entries())
    .map(([specialty, vendors]) => ({ specialty, vendors: vendors.sort((a, b) => Number(b.rating) - Number(a.rating)) }))
    .sort((a, b) => a.specialty.localeCompare(b.specialty));

  const urgent = rows.filter((row) => row.lead_days <= 7).length;
  const averageLeadDays = rows.length ? rows.reduce((sum, row) => sum + Number(row.lead_days), 0) / rows.length : 0;

  return {
    summary: {
      urgent,
      averageLeadDays: Number(averageLeadDays.toFixed(2)),
      preferred: rows.filter((row) => Number(row.rating) >= 4.8).length,
    },
    groups: orderedGroups,
  };
}
