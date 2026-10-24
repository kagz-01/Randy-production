import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizeReceiptRows } from "./receipt-summary.ts";

describe("summarizeReceiptRows", () => {
  it("splits deposits and balances by kind and flags the latest issue", () => {
    const rows = [
      { amount: 300000, kind: "deposit", status: "issued", issued_at: "2025-01-05T09:00:00.000Z" },
      { amount: 550000, kind: "balance", status: "issued", issued_at: "2025-01-12T18:30:00.000Z" },
      { amount: 150000, kind: "deposit", status: "issued", issued_at: "2025-02-14T12:00:00.000Z" },
    ];

    const summary = summarizeReceiptRows(rows);

    assert.equal(summary.total, 1000000);
    assert.equal(summary.depositTotal, 450000);
    assert.equal(summary.balanceTotal, 550000);
    assert.equal(summary.count, 3);
    assert.equal(summary.latest?.amount, 150000);
    assert.equal(summary.depositShare, 45);
    assert.equal(summary.balanceShare, 55);
  });
});
