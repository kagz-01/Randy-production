import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildProposalSheet, buildProposalSummary, priceQuote } from "./pricing.ts";
import { buildReceiptSheet } from "./receipt-sheet.ts";

describe("priceQuote", () => {
  it("adjusts the estimate for venue complexity", () => {
    const indoor = priceQuote({
      eventType: "wedding",
      guests: 150,
      tier: "floor",
      services: ["decor"],
      venueType: "hall",
    });
    const outdoor = priceQuote({
      eventType: "wedding",
      guests: 150,
      tier: "floor",
      services: ["decor"],
      venueType: "garden",
    });

    assert.ok(outdoor.amount > indoor.amount);
    assert.ok(outdoor.lines.some((line) => line.label.includes("Garden / outdoor")));
  });

  it("adds Kenyan production overheads to the estimate", () => {
    const quote = priceQuote({
      eventType: "wedding",
      guests: 150,
      tier: "floor",
      services: ["stage", "sound", "decor"],
    });

    assert.ok(quote.amount > 0);
    const labels = quote.lines.map((line) => line.label);
    assert.ok(labels.includes("White wedding · 150 · Floor"));
    assert.ok(labels.includes("VAT (16%)"));
    assert.ok(labels.includes("Crew logistics & technical movement"));
    assert.ok(labels.includes("Venue / power & rigging"));
    assert.ok(labels.includes("Production contingency"));
  });

  it("creates a client-ready proposal summary with the estimate", () => {
    const summary = buildProposalSummary({
      eventType: "corporate",
      guests: 300,
      tier: "black",
      services: ["stage", "sound"],
      title: "Q3 Summit",
      venue: "KICC",
      date: "2026-11-15",
      clientName: "Meridian Bank",
      email: "ops@meridian.co.ke",
      phone: "+254700123456",
      message: "Need a premium brand experience on the floor.",
    });

    assert.match(summary, /RANDY PRODUCTION/);
    assert.match(summary, /Q3 Summit/);
    assert.match(summary, /Meridian Bank/);
    assert.match(summary, /Estimated investment/);
    assert.match(summary, /Ksh|KES|KSh/i);
  });

  it("creates a printable proposal sheet for client approvals", () => {
    const sheet = buildProposalSheet({
      eventType: "wedding",
      guests: 150,
      tier: "floor",
      services: ["stage", "sound", "decor"],
      venueType: "garden",
      title: "Wedding Weekend",
      venue: "Nairobi Arboretum",
      date: "2026-12-12",
      clientName: "Njeri & Kairo",
      email: "hello@wedding.example",
      phone: "+254712345678",
      message: "Outdoor ceremony with a warm, cinematic feel.",
    });

    assert.match(sheet, /<html/i);
    assert.match(sheet, /Wedding Weekend/);
    assert.match(sheet, /Njeri.*Kairo/);
    assert.match(sheet, /Estimated investment/);
    assert.match(sheet, /Approved by client/i);
  });

  it("creates a printable receipt sheet for client payment proof", () => {
    const sheet = buildReceiptSheet({
      receiptNo: "RP-20261007-AB12CD34",
      clientName: "Njeri & Kairo",
      amount: 245000,
      paymentMethod: "Bank transfer",
      invoiceKind: "deposit",
      issuedAt: "2026-10-07T12:00:00.000Z",
      jobTitle: "Garden Wedding",
      venue: "Nairobi Arboretum",
      eventDate: "2026-12-12",
    });

    assert.match(sheet, /<html/i);
    assert.match(sheet, /RP-20261007-AB12CD34/);
    assert.match(sheet, /Njeri.*Kairo/);
    assert.match(sheet, /Payment proof/i);
    assert.match(sheet, /Ksh\s*245,000/i);
  });
});
