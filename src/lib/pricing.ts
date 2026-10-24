import {
  ADDONS,
  EVENT_TYPES,
  GUEST_BANDS,
  TIERS,
  VENUE_TYPES,
  type EventType,
  type ServiceKey,
  type TierKey,
  type VenueType,
} from "../data/catalog.ts";

export type QuoteInput = {
  eventType: EventType;
  guests: number;
  tier: TierKey;
  services: ServiceKey[];
  venueType?: VenueType;
};

export type QuoteBreakdown = {
  amount: number;
  lines: { label: string; amount: number }[];
  budgetBand: { label: string; min: number; max: number; note: string };
};

export type ProposalSummaryInput = QuoteInput & {
  title?: string;
  venue?: string;
  date?: string;
  clientName?: string;
  email?: string;
  phone?: string;
  message?: string;
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildProposalSheet(input: ProposalSummaryInput): string {
  const event = EVENT_TYPES.find((entry) => entry.key === input.eventType) ?? EVENT_TYPES[1];
  const quote = priceQuote(input);
  const selectedServices = input.services
    .map((key) => ADDONS.find((addon) => addon.key === key)?.label)
    .filter(Boolean) as string[];

  const rows = quote.lines
    .map((line) => `<tr><td>${escapeHtml(line.label)}</td><td>${formatMoney(line.amount)}</td></tr>`)
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(input.title || `${event.label} proposal`)}</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f3efe9; color: #111827; margin: 0; padding: 32px; }
      .sheet { max-width: 900px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 16px 40px rgba(0,0,0,0.08); padding: 32px; }
      .top { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 24px; }
      .eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #4f46e5; font-weight: 700; }
      h1 { margin: 10px 0 0; font-size: 36px; }
      .amount { text-align: right; }
      .amount span { display: block; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280; }
      .amount strong { display: block; margin-top: 8px; font-size: 32px; }
      .meta { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; margin-bottom: 24px; }
      .meta div { background: #f8fafc; border: 1px solid #e5e7eb; padding: 12px; }
      .meta label { display: block; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; }
      .meta p { margin: 0; font-size: 15px; }
      .brief { margin: 16px 0 24px; background: #f8fafc; border: 1px solid #e5e7eb; padding: 16px; }
      .brief p { margin: 0; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; }
      th { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #6b7280; }
      .total { text-align: right; padding-top: 18px; font-size: 24px; }
      .approved { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 18px; }
      .approved h3 { margin: 0 0 12px; font-size: 16px; }
      .signature { display: flex; justify-content: space-between; gap: 20px; margin-top: 18px; }
      .line { flex: 1; border-bottom: 1px solid #111827; min-height: 30px; }
      @media print { body { padding: 0; background: white; } .sheet { box-shadow: none; border: none; max-width: none; padding: 0; } }
    </style>
  </head>
  <body>
    <main class="sheet">
      <div class="top">
        <div>
          <div class="eyebrow">RANDY PRODUCTION</div>
          <h1>${escapeHtml(input.title || `${event.label} production`)}</h1>
        </div>
        <div class="amount">
          <span>Estimated investment</span>
          <strong>${formatMoney(quote.amount)}</strong>
        </div>
      </div>

      <section class="meta">
        <div><label>Client</label><p>${escapeHtml(input.clientName || "Client name pending")}</p></div>
        <div><label>Contact</label><p>${escapeHtml(input.email || input.phone || "Contact pending")}</p></div>
        <div><label>Venue</label><p>${escapeHtml(input.venue || "Venue to be confirmed")}</p></div>
        <div><label>Date</label><p>${escapeHtml(input.date || "To be confirmed")}</p></div>
      </section>

      <section class="brief">
        <p><strong>Event type:</strong> ${escapeHtml(event.label)}<br />
        <strong>Guest count:</strong> ${escapeHtml(GUEST_BANDS.find((band) => band.key === input.guests)?.label ?? String(input.guests))}<br />
        <strong>Production tier:</strong> ${escapeHtml(TIERS.find((level) => level.key === input.tier)?.label ?? "Floor")}<br />
        <strong>Venue type:</strong> ${escapeHtml(VENUE_TYPES.find((venue) => venue.key === input.venueType)?.label ?? "Hotel / ballroom")}<br />
        <strong>Service mix:</strong> ${escapeHtml(selectedServices.length ? selectedServices.join(", ") : "No add-ons selected")}</p>
      </section>

      <table>
        <thead>
          <tr><th>Line item</th><th>Amount</th></tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="total"><strong>Total: ${formatMoney(quote.amount)}</strong></div>

      <section class="approved">
        <h3>Approved by client</h3>
        <p>Budget range: ${formatMoney(quote.budgetBand.min)} – ${formatMoney(quote.budgetBand.max)}</p>
        <p>${escapeHtml(quote.budgetBand.note)}</p>
        <div class="signature">
          <div class="line"></div>
          <div class="line"></div>
        </div>
      </section>
    </main>
  </body>
</html>`;
}

export function buildProposalSummary(input: ProposalSummaryInput): string {
  const event = EVENT_TYPES.find((entry) => entry.key === input.eventType) ?? EVENT_TYPES[1];
  const quote = priceQuote(input);
  const selectedServices = input.services
    .map((key) => ADDONS.find((addon) => addon.key === key)?.label)
    .filter(Boolean) as string[];

  const lines = [
    "RANDY PRODUCTION — EVENT PROPOSAL",
    `Title: ${input.title || `${event.label} production`}`,
    `Client: ${input.clientName || "Client name pending"}`,
    `Contact: ${input.email || input.phone || "Contact pending"}`,
    `Venue: ${input.venue || "Venue to be confirmed"}`,
    `Date: ${input.date || "To be confirmed"}`,
    `Event type: ${event.label}`,
    `Guest count: ${GUEST_BANDS.find((band) => band.key === input.guests)?.label ?? input.guests}`,
    `Production tier: ${TIERS.find((level) => level.key === input.tier)?.label ?? "Floor"}`,
    `Venue type: ${VENUE_TYPES.find((venue) => venue.key === input.venueType)?.label ?? "Hotel / ballroom"}`,
    `Service mix: ${selectedServices.length ? selectedServices.join(", ") : "No add-ons selected"}`,
    "",
    `Estimated investment: ${formatMoney(quote.amount)}`,
    `Budget range: ${formatMoney(quote.budgetBand.min)} – ${formatMoney(quote.budgetBand.max)}`,
    `Note: ${quote.budgetBand.note}`,
    "",
    "Cost breakdown:",
    ...quote.lines.map((line) => `- ${line.label}: ${formatMoney(line.amount)}`),
    "",
    "Included:",
    "• Technical planning and site readiness",
    "• Production crew for build and show time",
    "• Power, rigging and floor coordination",
    "• Mood-led styling aligned to the chosen event",
    "",
    "Excluded:",
    "• Venue hire, security and public liability cover",
    "• Artist rider, talent fees and hospitality",
    "• Live streaming and content retention unless quoted separately",
    input.message ? `\nBrief note:\n${input.message}` : "",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

export function priceQuote(input: QuoteInput): QuoteBreakdown {
  const event = EVENT_TYPES.find((e) => e.key === input.eventType) ?? EVENT_TYPES[1];
  const guests = GUEST_BANDS.find((g) => g.key === input.guests) ?? GUEST_BANDS[1];
  const tier = TIERS.find((t) => t.key === input.tier) ?? TIERS[1];
  const venue = VENUE_TYPES.find((v) => v.key === input.venueType) ?? VENUE_TYPES[1];

  const base = Math.round(event.base * guests.multiplier * tier.multiplier);
  const venueAdjustment = Math.round(base * (venue.multiplier - 1));
  const lines: { label: string; amount: number }[] = [
    { label: `${event.label} · ${guests.label} · ${tier.label}`, amount: base },
    { label: `${venue.label} venue access & logistics`, amount: venueAdjustment },
  ];

  let subtotal = base + venueAdjustment;
  for (const key of input.services) {
    const addon = ADDONS.find((a) => a.key === key);
    if (!addon) continue;
    const amount = Math.round(base * addon.factor);
    lines.push({ label: addon.label, amount });
    subtotal += amount;
  }

  const logisticsRate = 0.08;
  const travelRate = 0.05;
  const venuePowerRate = ["concert", "conference", "launch", "gala", "expo", "corporate"].includes(event.key)
    ? 0.14
    : 0.1;
  const contingencyRate = 0.12;
  const vatRate = 0.16;

  const logistics = Math.round(subtotal * logisticsRate);
  const travel = Math.round(subtotal * travelRate);
  const venuePower = Math.round(subtotal * venuePowerRate);
  const contingency = Math.round(subtotal * contingencyRate);
  const vat = Math.round((subtotal + logistics + travel + venuePower + contingency) * vatRate);
  const total = subtotal + logistics + travel + venuePower + contingency + vat;

  lines.push(
    { label: "Crew logistics & technical movement", amount: logistics },
    { label: "Travel & crew accommodation", amount: travel },
    { label: "Venue / power & rigging", amount: venuePower },
    { label: "Production contingency", amount: contingency },
    { label: "VAT (16%)", amount: vat },
  );

  let budgetBand: QuoteBreakdown["budgetBand"];
  if (total < 220000) {
    budgetBand = {
      label: "Lean production",
      min: Math.round(total * 0.85),
      max: Math.round(total * 1.12),
      note: "Boutique events, simple rig, one-room flow, and a small crew footprint.",
    };
  } else if (total < 600000) {
    budgetBand = {
      label: "Standard market",
      min: Math.round(total * 0.88),
      max: Math.round(total * 1.14),
      note: "The Kenyan production sweet spot for weddings, launches, and midsize corporate moments.",
    };
  } else if (total < 1200000) {
    budgetBand = {
      label: "Premium event build",
      min: Math.round(total * 0.9),
      max: Math.round(total * 1.18),
      note: "Multi-zone production, live visuals, premium lighting, and heavier guest movement.",
    };
  } else {
    budgetBand = {
      label: "Flagship production",
      min: Math.round(total * 0.92),
      max: Math.round(total * 1.2),
      note: "Large-scale move-ins, detail-heavy design, and high-risk technical production.",
    };
  }

  return { amount: total, lines, budgetBand };
}
