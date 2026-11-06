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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildProposalSheet(input: ProposalSummaryInput): string {
  const event = EVENT_TYPES.find((entry) => entry.key === input.eventType) ?? EVENT_TYPES[1];
  const quote = priceQuote(input);
  const selectedServices = input.services
    .map((key) => ADDONS.find((addon) => addon.key === key)?.label)
    .filter(Boolean) as string[];
  const contact = [input.email, input.phone].filter(Boolean).join(" · ") || "Contact pending";
  const briefNote = input.message
    ? `<section class="brief"><strong>Organiser’s brief</strong><p>${escapeHtml(input.message).replace(/\n/g, "<br />")}</p></section>`
    : "";

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
      .letterhead { display: flex; align-items: center; gap: 18px; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 24px; }
      .logo { display: block; width: 76px; height: 76px; flex: 0 0 76px; object-fit: cover; background: #050505; }
      .business { flex: 1; min-width: 0; }
      .business strong { display: block; font-size: 15px; letter-spacing: 0.18em; text-transform: uppercase; }
      .business p { margin: 5px 0 0; color: #4b5563; font-size: 12px; line-height: 1.45; }
      .document-label { text-align: right; color: #4f46e5; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; line-height: 1.5; text-transform: uppercase; }
      .top { display: flex; justify-content: space-between; gap: 20px; align-items: flex-end; border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 24px; }
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
      .range { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 18px; }
      .range h3 { margin: 0 0 12px; font-size: 16px; }
      .scope { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; margin-top: 24px; }
      .scope section { border: 1px solid #e5e7eb; padding: 16px; }
      .scope h3 { margin: 0 0 10px; font-size: 14px; }
      .scope ul { margin: 0; padding-left: 18px; color: #4b5563; line-height: 1.6; }
      .notice { margin-top: 24px; border-left: 3px solid #4f46e5; background: #f8fafc; padding: 14px 16px; color: #4b5563; line-height: 1.6; }
      @media (max-width: 640px) { body { padding: 16px; } .sheet { padding: 20px; } .letterhead { align-items: flex-start; flex-wrap: wrap; } .logo { width: 64px; height: 64px; flex-basis: 64px; } .document-label { width: 100%; text-align: left; } .top { align-items: flex-start; flex-direction: column; } .amount { text-align: left; } .meta { grid-template-columns: repeat(2, minmax(0,1fr)); } .scope { grid-template-columns: 1fr; } }
      @media print { body { padding: 0; background: white; } .sheet { box-shadow: none; border: none; max-width: none; padding: 0; } }
    </style>
  </head>
  <body>
    <main class="sheet">
      <header class="letterhead">
        <img class="logo" src="/logo.png" alt="Randy Production logo" />
        <div class="business">
          <strong>Randy Production</strong>
          <p><a href="tel:+254743567565">+254 743 567 565</a> · <a href="mailto:hello@randyproduction.co.ke">hello@randyproduction.co.ke</a></p>
          <p>Business address: details to be confirmed · KRA PIN / VAT details: to be supplied</p>
        </div>
        <div class="document-label">Planning estimate<br />Not an invoice</div>
      </header>
      <div class="top">
        <div>
          <h1>${escapeHtml(input.title || `${event.label} production`)}</h1>
        </div>
        <div class="amount">
            <span>Estimated investment · VAT included</span>
          <strong>${formatMoney(quote.amount)}</strong>
        </div>
      </div>

      <section class="meta">
        <div><label>Client</label><p>${escapeHtml(input.clientName || "Client name pending")}</p></div>
        <div><label>Contact</label><p>${escapeHtml(contact)}</p></div>
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
      ${briefNote}

      <table>
        <thead>
          <tr><th>Line item</th><th>Amount · before VAT</th></tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="total"><strong>Total · VAT included: ${formatMoney(quote.amount)}</strong></div>

      <div class="scope">
        <section>
          <h3>Included in the estimate</h3>
          <ul>
            <li>Technical planning and site readiness</li>
            <li>Production crew for build and show time</li>
            <li>Power, rigging and floor coordination</li>
            <li>Mood-led styling aligned to the chosen event</li>
          </ul>
        </section>
        <section>
          <h3>Confirmed separately</h3>
          <ul>
            <li>Venue hire, security and public liability cover</li>
            <li>Artist fees, rider and hospitality</li>
            <li>Live streaming and content retention unless quoted separately</li>
            <li>Final availability and scope with the production team</li>
          </ul>
        </section>
      </div>

      <section class="range">
        <h3>Planning range</h3>
        <p>Budget range: ${formatMoney(quote.budgetBand.min)} – ${formatMoney(quote.budgetBand.max)}</p>
        <p>${escapeHtml(quote.budgetBand.note)}</p>
      </section>
      <p class="notice"><strong>Estimate only.</strong> Catalog prices are treated as VAT-inclusive. The breakdown shows the estimated VAT included in the total, assuming all listed services and charges are standard-rated at 16%. This is not an invoice or final confirmed price; final tax treatment, scope and availability are confirmed separately with Randy Production.</p>
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
    "RANDY PRODUCTION — EVENT PLANNING ESTIMATE",
    "PLANNING ESTIMATE ONLY — not an invoice or final confirmed price.",
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
    `Estimated investment (VAT included): ${formatMoney(quote.amount)}`,
    `Budget range: ${formatMoney(quote.budgetBand.min)} – ${formatMoney(quote.budgetBand.max)}`,
    `Note: ${quote.budgetBand.note}`,
    "",
    "Cost breakdown (amounts before VAT):",
    ...quote.lines.map((line) => `- ${line.label}: ${formatMoney(line.amount)}`),
    "",
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
  const grossLines = [
    ...lines,
    { label: "Crew logistics & technical movement", amount: logistics },
    { label: "Travel & crew accommodation", amount: travel },
    { label: "Venue / power & rigging", amount: venuePower },
    { label: "Production contingency", amount: contingency },
  ];
  const total = grossLines.reduce((sum, line) => sum + line.amount, 0);
  const vat = Math.round((total * vatRate) / (1 + vatRate));
  const netTotal = total - vat;
  const netAmounts = grossLines.map((line) => Math.floor(line.amount / (1 + vatRate)));
  const unallocatedNet = netTotal - netAmounts.reduce((sum, amount) => sum + amount, 0);
  const roundingOrder = grossLines
    .map((line, index) => ({
      index,
      remainder: line.amount / (1 + vatRate) - netAmounts[index],
    }))
    .sort((left, right) => right.remainder - left.remainder);
  for (let index = 0; index < unallocatedNet; index += 1) {
    netAmounts[roundingOrder[index].index] += 1;
  }
  const itemizedLines = grossLines.map((line, index) => ({
    ...line,
    amount: netAmounts[index],
  }));
  itemizedLines.push({ label: "VAT included (16%)", amount: vat });

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

  return { amount: total, lines: itemizedLines, budgetBand };
}
