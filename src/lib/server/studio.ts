import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { priceQuote, type QuoteInput } from "@/lib/pricing";
import { confirmInvoicePayment } from "@/lib/payments/provider";
import type { ServiceKey } from "@/data/catalog";

export type JobRow = {
  id: string;
  owner_user_id: string | null;
  title: string;
  client_name: string;
  service: string;
  event_type: string;
  guests: number;
  tier: string;
  status: string;
  venue: string | null;
  event_date: string | null;
  ballpark: number;
  notes: string | null;
  is_showcase: boolean;
};

export type CueRow = {
  id: string;
  job_id: string;
  starts_at: string;
  title: string;
  owner: string;
  kind: string;
  status: string;
  sort_order: number;
};

export type InventoryRow = {
  id: string;
  name: string;
  category: string;
  qty: number;
  available: number;
  condition: string;
  next_service: string | null;
};

export type CrewRow = {
  id: string;
  name: string;
  role: string;
  call_time: string | null;
  assigned_job_id: string | null;
  status: string;
};

export type VendorRow = {
  id: string;
  name: string;
  specialty: string;
  city: string;
  lead_days: number;
  rating: string;
};

export type QuoteRow = {
  id: string;
  user_id: string;
  job_id: string | null;
  event_type: string;
  guests: number;
  tier: string;
  services: string;
  amount: number;
  breakdown: string;
  status: string;
};

export type DraftRow = {
  id: string;
  job_id: string;
  title: string;
  kind: string;
  status: string;
  note: string | null;
};

export type InvoiceRow = {
  id: string;
  job_id: string;
  user_id: string;
  kind: string;
  amount: number;
  status: string;
  paid_at: string | null;
};

export type ReceiptRow = {
  id: string;
  receipt_no: string;
  invoice_id: string;
  quote_id: string | null;
  job_id: string;
  user_id: string;
  kind: string;
  amount: number;
  payment_method: string;
  payer_name: string;
  payer_email: string | null;
  payer_phone: string | null;
  issued_by: string;
  issued_at: string;
  status: string;
  snapshot: string;
};

export type ProfileRow = {
  user_id: string;
  display_name: string | null;
  role: string;
};

export type TeamInviteRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  team: string;
  status: string;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
};

const VALID_TEAM_INVITE_STATUSES = ["Invite sent", "Waiting on docs", "Ready to start"] as const;

async function ensureProfile(userId: string, displayName?: string | null) {
  const sql = await getSql();
  await sql`
    insert into profiles (user_id, display_name, role)
    values (${userId}, ${displayName ?? null}, 'client')
    on conflict (user_id) do nothing
  `;
  const rows = await sql<ProfileRow>`select user_id, display_name, role from profiles where user_id = ${userId}`;
  return rows[0];
}

export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const delivered = await sql<{ n: number }>`select count(*)::int as n from jobs where status = 'delivered' or is_showcase = true`;
  const live = await sql<{ n: number }>`select count(*)::int as n from jobs where status = 'production'`;
  const campaigns = await sql<{ n: number }>`select count(*)::int as n from jobs where service = 'brand' and (status = 'delivered' or is_showcase = true)`;
  return {
    delivered: delivered[0]?.n ?? 0,
    live: live[0]?.n ?? 0,
    campaigns: campaigns[0]?.n ?? 0,
  };
});

export const getLivePulse = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const production = await sql<JobRow>`
    select * from jobs where status = 'production' order by event_date desc nulls last limit 1
  `;
  if (production[0]) return { id: production[0].id, title: production[0].title, live: true as const };
  const showcase = await sql<JobRow>`
    select * from jobs where is_showcase = true and status in ('booked', 'production')
    order by event_date desc nulls last limit 1
  `;
  if (showcase[0]) return { id: showcase[0].id, title: showcase[0].title, live: false as const };
  return null;
});

export const listShowcaseJobs = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return sql<JobRow>`select * from jobs where is_showcase = true order by event_date desc nulls last`;
});

export const getJobPublic = createServerFn({ method: "POST" })
  .middleware([optionalAuthMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const jobs = await sql<JobRow>`select * from jobs where id = ${data.id}`;
    const job = jobs[0];
    if (!job) return null;
    const isOwner = Boolean(context.userId && job.owner_user_id === context.userId);
    let isStaff = false;
    if (!job.is_showcase && !isOwner) {
      if (!context.userId) return null;
      const profile = await ensureProfile(context.userId);
      if (profile.role !== "staff") return null;
      isStaff = true;
    }
    const cues = await sql<CueRow>`select * from cues where job_id = ${data.id} order by sort_order`;
    const drafts = isOwner || isStaff || job.is_showcase
      ? await sql<DraftRow>`select * from drafts where job_id = ${data.id}`
      : [];
    return { job, cues, drafts };
  });

export const listInventory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    return sql<InventoryRow>`select * from inventory order by category, name`;
  });

export const listCrew = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    return sql<CrewRow>`select * from crew order by name`;
  });

export const listVendors = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    return sql<VendorRow>`select * from vendors order by rating desc`;
  });

export const listPipeline = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    return sql<JobRow>`select * from jobs order by created_at desc`;
  });

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return ensureProfile(context.userId);
  });

export const listTeamInvites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    return sql<TeamInviteRow>`select * from team_invites order by created_at desc`;
  });

export const createTeamInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; role: string; team: string; email: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const name = data.name?.trim();
    const team = data.team?.trim();
    const role = data.role?.trim();
    const email = data.email?.trim().toLowerCase();
    if (!name || !team || !role || !email) {
      throw new Error("Name, role, team, and email are required");
    }
    const sql = await getSql();
    const id = `inv_${crypto.randomUUID().slice(0, 8)}`;
    const rows = await sql<TeamInviteRow>`
      insert into team_invites (id, email, name, role, team, status, invited_by, updated_at)
      values (${id}, ${email}, ${name}, ${role}, ${team}, ${"Invite sent"}, ${context.userId}, now())
      on conflict (email) do update set
        name = excluded.name,
        role = excluded.role,
        team = excluded.team,
        invited_by = excluded.invited_by,
        updated_at = now()
      returning *
    `;
    return rows[0];
  });

export const updateTeamInviteStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const status = data.status?.trim();
    if (!status || !VALID_TEAM_INVITE_STATUSES.includes(status as (typeof VALID_TEAM_INVITE_STATUSES)[number])) {
      throw new Error("Bad invite status");
    }
    const sql = await getSql();
    const rows = await sql<TeamInviteRow>`
      update team_invites
      set status = ${status}, updated_at = now()
      where id = ${data.id}
      returning *
    `;
    if (!rows[0]) throw new Error("Invite not found");
    return rows[0];
  });

export const joinStudio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { inviteCode?: string }) => input ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await ensureProfile(context.userId);
    if (profile.role === "staff") return { ok: true as const };

    const staff = await sql<{ n: number }>`select count(*)::int as n from profiles where role = 'staff'`;
    if ((staff[0]?.n ?? 0) === 0) {
      await sql`update profiles set role = 'staff' where user_id = ${context.userId}`;
      return { ok: true as const };
    }

    const expected = process.env.STAFF_INVITE_CODE?.trim();
    const entered = data.inviteCode?.trim();
    if (!expected || !entered || entered !== expected) {
      throw new Error("Invite code required");
    }
    await sql`update profiles set role = 'staff' where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const saveQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: QuoteInput & { title?: string; venue?: string; date?: string; clientName?: string; email?: string; phone?: string; message?: string }) => input,
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile(context.userId);
    const priced = priceQuote(data);
    const id = `q_${crypto.randomUUID()}`;
    const jobId = `job_${crypto.randomUUID().slice(0, 8)}`;
    const services = data.services.join(",");
    const clientName = (data.clientName ?? "You").trim() || "You";
    const contactInfo = [data.email, data.phone].filter(Boolean).join(" • ");
    const notes = [data.message, contactInfo].filter(Boolean).join("\n");
    await sql`
      insert into jobs (id, owner_user_id, title, client_name, service, event_type, guests, tier, status, venue, event_date, ballpark, notes, is_showcase)
      values (
        ${jobId},
        ${context.userId},
        ${data.title || "Untitled booking"},
        ${clientName},
        ${data.services[0] ?? "stage"},
        ${data.eventType},
        ${data.guests},
        ${data.tier},
        ${"quoted"},
        ${data.venue || null},
        ${data.date || null},
        ${priced.amount},
        ${notes || "Locked from the quote builder."},
        ${false}
      )
    `;
    await sql`
      insert into quotes (id, user_id, job_id, event_type, guests, tier, services, amount, breakdown, status)
      values (
        ${id},
        ${context.userId},
        ${jobId},
        ${data.eventType},
        ${data.guests},
        ${data.tier},
        ${services},
        ${priced.amount},
        ${JSON.stringify(priced.lines)},
        ${"ready"}
      )
    `;
    await sql`
      insert into invoices (id, job_id, user_id, kind, amount, status)
      values (${`inv_${id}_dep`}, ${jobId}, ${context.userId}, ${"deposit"}, ${Math.round(priced.amount * 0.3)}, ${"due"})
    `;
    await sql`
      insert into invoices (id, job_id, user_id, kind, amount, status)
      values (${`inv_${id}_bal`}, ${jobId}, ${context.userId}, ${"balance"}, ${priced.amount - Math.round(priced.amount * 0.3)}, ${"due"})
    `;
    return { quoteId: id, jobId, amount: priced.amount };
  });

function receiptNoFromInvoice(invoiceId: string, issuedAt: string | Date) {
  const date = typeof issuedAt === "string" ? new Date(issuedAt) : issuedAt;
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `RP-${ymd}-${invoiceId.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`;
}

async function issueReceiptForInvoice(sql: Awaited<ReturnType<typeof getSql>>, invoice: InvoiceRow) {
  const receipts = await sql<ReceiptRow>`select * from receipts where invoice_id = ${invoice.id}`;
  if (receipts[0]) return receipts[0];

  const jobRows = await sql<JobRow>`select * from jobs where id = ${invoice.job_id}`;
  const job = jobRows[0];
  if (!job) throw new Error("Job not found for invoice");

  const quoteRows = await sql<QuoteRow>`select * from quotes where job_id = ${invoice.job_id} and user_id = ${invoice.user_id}`;
  const quote = quoteRows[0] ?? null;
  const issuedAt = invoice.paid_at ?? new Date().toISOString();
  const receiptNo = receiptNoFromInvoice(invoice.id, issuedAt);
  const receiptId = `rc_${crypto.randomUUID().slice(0, 12)}`;
  const snapshot = {
    receiptNo,
    jobTitle: job.title,
    clientName: job.client_name,
    venue: job.venue,
    eventDate: job.event_date,
    eventType: job.event_type,
    guests: job.guests,
    tier: job.tier,
    invoiceKind: invoice.kind,
    amount: invoice.amount,
    paymentMethod: invoice.kind === "deposit" ? "Deposit transfer" : "Bank transfer",
    paidAt: invoice.paid_at,
    issuedBy: "system",
    quoteId: quote?.id ?? null,
  };
  const rows = await sql<ReceiptRow>`
    insert into receipts (
      id, receipt_no, invoice_id, quote_id, job_id, user_id, kind, amount, payment_method,
      payer_name, payer_email, payer_phone, issued_by, issued_at, status, snapshot
    ) values (
      ${receiptId},
      ${receiptNo},
      ${invoice.id},
      ${quote?.id ?? null},
      ${invoice.job_id},
      ${invoice.user_id},
      ${invoice.kind},
      ${invoice.amount},
      ${snapshot.paymentMethod},
      ${job.client_name},
      ${null},
      ${null},
      ${"system"},
      ${issuedAt},
      ${"issued"},
      ${JSON.stringify(snapshot)}
    )
    on conflict (invoice_id) do nothing
    returning *
  `;
  return rows[0];
}

async function settlePaidInvoice(sql: Awaited<ReturnType<typeof getSql>>, invoiceId: string, userId: string, quoteId?: string) {
  const invoices = await sql<InvoiceRow>`select * from invoices where id = ${invoiceId} and user_id = ${userId}`;
  const invoice = invoices[0];
  if (!invoice) throw new Error("Invoice not found");

  const providerConfirmation = await confirmInvoicePayment({
    invoiceId: invoice.id,
    quoteId: quoteId ?? invoiceId,
    amount: invoice.amount,
    customerName: "Client",
    customerEmail: null,
  });

  if (!providerConfirmation.ok) {
    throw new Error("Payment was not confirmed by the configured provider.");
  }

  if (invoice.status !== "paid") {
    await sql`update invoices set status = 'paid', paid_at = now() where id = ${invoiceId} and user_id = ${userId}`;
    const refreshed = await sql<InvoiceRow>`select * from invoices where id = ${invoiceId} and user_id = ${userId}`;
    if (!refreshed[0]) throw new Error("Invoice not found");
    return issueReceiptForInvoice(sql, refreshed[0]);
  }
  return issueReceiptForInvoice(sql, invoice);
}

export const getMyQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const quotes = await sql<QuoteRow>`select * from quotes where id = ${data.id} and user_id = ${context.userId}`;
    const quote = quotes[0];
    if (!quote) return null;
    const contracts = await sql<{ id: string; signer_name: string; signed_at: string }>`
      select id, signer_name, signed_at from contracts where quote_id = ${data.id} and user_id = ${context.userId}
    `;
    const invoices = quote.job_id
      ? await sql<InvoiceRow>`select * from invoices where job_id = ${quote.job_id} and user_id = ${context.userId}`
      : [];
    const receipts = quote.job_id
      ? await sql<ReceiptRow>`select * from receipts where job_id = ${quote.job_id} and user_id = ${context.userId} order by issued_at desc`
      : [];
    const jobs = quote.job_id
      ? await sql<JobRow>`select * from jobs where id = ${quote.job_id} and owner_user_id = ${context.userId}`
      : [];
    return { quote, contract: contracts[0] ?? null, invoices, receipts, job: jobs[0] ?? null };
  });

export const signContract = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { quoteId: string; signerName: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const quotes = await sql<QuoteRow>`select * from quotes where id = ${data.quoteId} and user_id = ${context.userId}`;
    const quote = quotes[0];
    if (!quote) throw new Error("Quote not found");
    const cid = `c_${crypto.randomUUID()}`;
    await sql`
      insert into contracts (id, quote_id, user_id, signer_name)
      values (${cid}, ${data.quoteId}, ${context.userId}, ${data.signerName.trim() || "Client"})
    `;
    await sql`update quotes set status = 'signed' where id = ${data.quoteId} and user_id = ${context.userId}`;
    if (quote.job_id) {
      await sql`update jobs set status = 'booked' where id = ${quote.job_id} and owner_user_id = ${context.userId} and status in ('inquiry','quoted')`;
    }
    return { ok: true as const };
  });

export const payDeposit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((quoteId: string) => quoteId)
  .handler(async ({ context, data: quoteId }) => {
    const sql = await getSql();
    const quotes = await sql<QuoteRow>`select * from quotes where id = ${quoteId} and user_id = ${context.userId}`;
    const quote = quotes[0];
    if (!quote?.job_id) throw new Error("Quote not found");
    const invoices = await sql<InvoiceRow>`select * from invoices where job_id = ${quote.job_id} and user_id = ${context.userId} and kind = 'deposit'`;
    if (!invoices[0]) throw new Error("Invoice not found");
    await settlePaidInvoice(sql, invoices[0].id, context.userId, quoteId);
    await sql`update quotes set status = 'confirmed' where id = ${quoteId} and user_id = ${context.userId}`;
    await sql`update jobs set status = 'booked' where id = ${quote.job_id} and owner_user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const payBalance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { quoteId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const quotes = await sql<QuoteRow>`select * from quotes where id = ${data.quoteId} and user_id = ${context.userId}`;
    const quote = quotes[0];
    if (!quote?.job_id) throw new Error("Quote not found");
    const invoices = await sql<InvoiceRow>`select * from invoices where job_id = ${quote.job_id} and user_id = ${context.userId} and kind = 'balance'`;
    if (!invoices[0]) throw new Error("Final invoice not found");
    await settlePaidInvoice(sql, invoices[0].id, context.userId, data.quoteId);
    await sql`update quotes set status = 'confirmed' where id = ${data.quoteId} and user_id = ${context.userId}`;
    await sql`update jobs set status = 'production' where id = ${quote.job_id} and owner_user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const listMyJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return sql<JobRow>`select * from jobs where owner_user_id = ${context.userId} order by created_at desc`;
  });

export const getMyJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const jobs = await sql<JobRow>`select * from jobs where id = ${data.id} and owner_user_id = ${context.userId}`;
    const job = jobs[0];
    if (!job) return null;
    const invoices = await sql<InvoiceRow>`select * from invoices where job_id = ${data.id} and user_id = ${context.userId}`;
    const receipts = await sql<ReceiptRow>`select * from receipts where job_id = ${data.id} and user_id = ${context.userId} order by issued_at desc`;
    const drafts = await sql<DraftRow>`select * from drafts where job_id = ${data.id}`;
    const cues = await sql<CueRow>`select * from cues where job_id = ${data.id} order by sort_order`;
    return { job, invoices, receipts, drafts, cues };
  });

export const listReceipts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    return sql<ReceiptRow>`select * from receipts order by issued_at desc`;
  });

export const generateReceiptForInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { invoiceId: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<InvoiceRow>`select * from invoices where id = ${data.invoiceId}`;
    const invoice = rows[0];
    if (!invoice) throw new Error("Invoice not found");
    return issueReceiptForInvoice(sql, invoice);
  });

export const getReceipt = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql<ReceiptRow>`select * from receipts where id = ${data.id}`;
    const receipt = rows[0];
    if (!receipt) return null;
    const profile = await ensureProfile(context.userId);
    if (receipt.user_id !== context.userId && profile.role !== "staff") {
      return null;
    }
    return receipt;
  });

export const approveDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId: string; draftId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const jobs = await sql<JobRow>`select * from jobs where id = ${data.jobId} and owner_user_id = ${context.userId}`;
    if (!jobs[0]) throw new Error("Not found");
    await sql`update drafts set status = 'approved' where id = ${data.draftId} and job_id = ${data.jobId}`;
    return { ok: true as const };
  });

async function requireStaff(userId: string) {
  const profile = await ensureProfile(userId);
  if (profile.role !== "staff") {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return profile;
}

const aiBudget = new Map<string, number[]>();
const AI_WINDOW_MS = 60_000;
const AI_MAX_PER_MINUTE = 5;

function spendAiBudget(userId: string): boolean {
  const now = Date.now();
  const hits = (aiBudget.get(userId) ?? []).filter((t) => now - t < AI_WINDOW_MS);
  if (hits.length >= AI_MAX_PER_MINUTE) return false;
  hits.push(now);
  aiBudget.set(userId, hits);
  return true;
}

export const moveJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const allowed = ["inquiry", "quoted", "booked", "production", "delivered"];
    if (!allowed.includes(data.status)) throw new Error("Bad status");
    const sql = await getSql();
    await sql`update jobs set status = ${data.status} where id = ${data.id}`;
    if (data.status === "delivered") {
      await sql`
        insert into testimonials (id, job_id, author, company, body, requested)
        values (${`tm_${data.id}`}, ${data.id}, ${"Awaiting client"}, ${null}, ${""}, ${true})
        on conflict (id) do nothing
      `;
    }
    return { ok: true as const };
  });

export const setCueStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    await sql`update cues set status = ${data.status} where id = ${data.id}`;
    return { ok: true as const };
  });

export const setInventoryCondition = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; condition: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    await sql`update inventory set condition = ${data.condition} where id = ${data.id}`;
    return { ok: true as const };
  });

export const assignCrew = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { crewId: string; jobId: string; callTime: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    await sql`
      update crew
      set assigned_job_id = ${data.jobId}, call_time = ${data.callTime}, status = 'called'
      where id = ${data.crewId}
    `;
    return { ok: true as const };
  });

export const captureTestimonial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; author: string; body: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    await sql`
      update testimonials
      set author = ${data.author}, body = ${data.body}, requested = false, captured_at = now()
      where id = ${data.id}
    `;
    return { ok: true as const };
  });

export const listTestimonials = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    return sql<{
      id: string;
      job_id: string | null;
      author: string;
      company: string | null;
      body: string;
      requested: boolean;
      captured_at: string | null;
    }>`select * from testimonials order by captured_at desc nulls last`;
  });

export const matchMood = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { notes: string; imageName?: string }) => input)
  .handler(async ({ context, data }) => {
    await ensureProfile(context.userId);
    const apiKey = process.env.XAI_API_KEY;
    const fallback = {
      packageId: "pkg_floor_stage",
      summary: "A Floor Stage build: drape, lounge, mix, Pulse on the night.",
      rationale:
        "Your references read as architectural, low colour, high contrast. We would lock black silk, a single blue line, and a quiet PA — not a festival plot.",
    };
    if (!apiKey) {
      return { ok: true as const, ...fallback, ai: false };
    }
    if (!spendAiBudget(context.userId)) {
      return { ok: true as const, ...fallback, ai: false, limited: true as const };
    }
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "You are the studio lead at Randy Production. Match a client mood to ONE package: pkg_signal_sound, pkg_floor_stage, pkg_black_gala, pkg_look_decor, pkg_harusi, pkg_brand_drop, pkg_campaign, pkg_pr. Reply JSON only: {packageId, summary, rationale}. Tone: sharp, no fluff, no mission statements.",
          },
          {
            role: "user",
            content: `Mood notes: ${data.notes}\nReference file: ${data.imageName || "none"}`,
          },
        ],
      }),
    });
    if (!res.ok) return { ok: true as const, ...fallback, ai: false };
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    const text = body.choices[0]?.message.content ?? "";
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    try {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as {
        packageId: string;
        summary: string;
        rationale: string;
      };
      const sql = await getSql();
      const id = `mm_${crypto.randomUUID()}`;
      await sql`
        insert into mood_matches (id, user_id, summary, package_id, rationale)
        values (${id}, ${context.userId}, ${parsed.summary}, ${parsed.packageId}, ${parsed.rationale})
      `;
      return { ok: true as const, ...parsed, ai: true };
    } catch {
      return { ok: true as const, ...fallback, ai: false };
    }
  });

export const refineQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: QuoteInput & { notes?: string }) => input)
  .handler(async ({ context, data }) => {
    const priced = priceQuote(data);
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: true as const,
        amount: priced.amount,
        note: "Ballpark holds. Add Look-Through on the venue photo before we lock drape metreage.",
        ai: false,
      };
    }
    if (!spendAiBudget(context.userId)) {
      return {
        ok: true as const,
        amount: priced.amount,
        note: "Ballpark holds. Give the desk a minute — refine is capped per minute.",
        ai: false,
        limited: true as const,
      };
    }
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 220,
        messages: [
          {
            role: "system",
            content:
              "You are Randy Production's quote desk. One or two sharp sentences on what this ballpark covers and one risk to flag. No greetings.",
          },
          {
            role: "user",
            content: JSON.stringify({ ...data, amount: priced.amount, notes: data.notes ?? "" }),
          },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: true as const, amount: priced.amount, note: "Ballpark holds.", ai: false };
    }
    const body = (await res.json()) as { choices: { message: { content: string } }[] };
    return {
      ok: true as const,
      amount: priced.amount,
      note: body.choices[0]?.message.content ?? "Ballpark holds.",
      ai: true,
    };
  });

export type { ServiceKey };
