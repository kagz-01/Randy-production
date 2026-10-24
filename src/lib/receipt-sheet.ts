export type ReceiptSheetInput = {
  receiptNo: string;
  clientName: string;
  amount: number;
  paymentMethod: string;
  invoiceKind: string;
  issuedAt: string;
  jobTitle?: string;
  venue?: string;
  eventDate?: string;
  projectId?: string;
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

export function buildReceiptSheet(input: ReceiptSheetInput): string {
  const issuedAt = new Date(input.issuedAt);
  const formattedDate = Number.isNaN(issuedAt.getTime())
    ? "Date pending"
    : issuedAt.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(input.receiptNo)} • Receipt</title>
    <style>
      body {
        margin: 0;
        background: #f5f1ea;
        color: #111827;
        font-family: Arial, sans-serif;
        padding: 32px;
      }
      .sheet {
        max-width: 900px;
        margin: 0 auto;
        background: #fff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 16px 40px rgba(0,0,0,0.08);
        padding: 28px 32px;
      }
      .top {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 2px solid #111827;
        padding-bottom: 18px;
        margin-bottom: 22px;
      }
      .eyebrow {
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #4f46e5;
        font-weight: 700;
      }
      h1 {
        margin: 10px 0 0;
        font-size: 36px;
      }
      .amount {
        text-align: right;
      }
      .amount span {
        display: block;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #6b7280;
      }
      .amount strong {
        display: block;
        margin-top: 8px;
        font-size: 32px;
      }
      .meta {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 24px;
      }
      .meta div {
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        padding: 12px;
      }
      .meta label {
        display: block;
        margin-bottom: 8px;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #6b7280;
      }
      .meta p {
        margin: 0;
        font-size: 15px;
      }
      .notes {
        margin-top: 24px;
        border-top: 1px solid #e5e7eb;
        padding-top: 18px;
      }
      .notes h3 {
        margin: 0 0 12px;
        font-size: 16px;
      }
      .signature {
        display: flex;
        justify-content: space-between;
        gap: 20px;
        margin-top: 18px;
      }
      .line {
        flex: 1;
        min-height: 30px;
        border-bottom: 1px solid #111827;
      }
      @media print {
        body { padding: 0; background: white; }
        .sheet { box-shadow: none; border: none; max-width: none; }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <div class="top">
        <div>
          <div class="eyebrow">RANDY PRODUCTION</div>
          <h1>${escapeHtml(input.receiptNo)}</h1>
        </div>
        <div class="amount">
          <span>Payment proof</span>
          <strong>${formatMoney(input.amount)}</strong>
        </div>
      </div>

      <section class="meta">
        <div><label>Client</label><p>${escapeHtml(input.clientName)}</p></div>
        <div><label>Method</label><p>${escapeHtml(input.paymentMethod)}</p></div>
        <div><label>Invoice</label><p>${escapeHtml(input.invoiceKind)}</p></div>
        <div><label>Issued</label><p>${escapeHtml(formattedDate)}</p></div>
      </section>

      <section class="meta">
        <div><label>Project</label><p>${escapeHtml(input.jobTitle || "Production booking")}</p></div>
        <div><label>Venue</label><p>${escapeHtml(input.venue || "Venue to be confirmed")}</p></div>
        <div><label>Date</label><p>${escapeHtml(input.eventDate || "To be confirmed")}</p></div>
        <div><label>Ref</label><p>${escapeHtml(input.projectId || input.receiptNo)}</p></div>
      </section>

      <section class="notes">
        <h3>Approved by client</h3>
        <p>This document confirms payment for the production service invoice above. It is considered proof of payment for the booking and can be reprinted from the client portal.</p>
        <div class="signature">
          <div class="line"></div>
          <div class="line"></div>
        </div>
      </section>
    </main>
  </body>
</html>`;
}
