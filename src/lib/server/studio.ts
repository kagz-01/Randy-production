import { createHash, randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware, optionalAuthMiddleware } from "@/lib/auth/middleware";
import { DEV_USER_ID } from "@/lib/auth/verify.server";
import { getSql } from "@/lib/db";
import { getPreviewRole } from "@/lib/preview-fixtures.server";
import { isPreviewFixturesEnabled } from "@/lib/env.server";
import { priceQuote, type QuoteInput } from "@/lib/pricing";
import { confirmInvoicePayment, getPaymentProviderStatus } from "@/lib/payments/provider";
import type { ServiceKey, VenueType } from "@/data/catalog";

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

export type JobInput = Pick<
  JobRow,
  | "title"
  | "client_name"
  | "service"
  | "event_type"
  | "guests"
  | "tier"
  | "status"
  | "venue"
  | "event_date"
  | "ballpark"
  | "notes"
>;

export type ProductionJobInput = JobInput & { client_user_id?: string | null };

export type ClientAccountRow = {
  user_id: string;
  display_name: string;
  email: string;
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
  venue_type: VenueType;
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
  client_feedback: string | null;
};

export type InvoiceRow = {
  id: string;
  job_id: string;
  user_id: string;
  milestone_id: string | null;
  kind: string;
  amount: number;
  status: string;
  paid_at: string | null;
  provider: string | null;
  provider_reference: string | null;
};

export type OfflinePaymentReportRow = {
  id: string;
  invoice_id: string;
  user_id: string;
  payment_method: "mpesa" | "bank_transfer" | "cash";
  transaction_reference: string;
  reported_amount: number;
  payment_date: string;
  client_note: string | null;
  status: "pending_review" | "confirmed" | "rejected";
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  invoice_amount?: number;
  invoice_kind?: string;
  job_title?: string;
  client_name?: string;
  account_name?: string;
};

export type PaymentAgreementRow = {
  id: string;
  job_id: string;
  owner_user_id: string;
  created_by: string;
  status: "pending_client" | "changes_requested" | "accepted";
  terms: string;
  client_feedback: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type PaymentMilestoneRow = {
  id: string;
  agreement_id: string;
  label: string;
  amount: number;
  due_date: string | null;
  note: string | null;
  sort_order: number;
};

export type PaymentMilestoneWithInvoiceRow = PaymentMilestoneRow & {
  invoice_id: string | null;
  invoice_status: string | null;
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
  provider: string | null;
  provider_reference: string | null;
  snapshot: string;
};

export type ProfileRow = {
  user_id: string;
  display_name: string | null;
  role: string;
};

export type StudioProfile = {
  user_id: string;
  email: string | null;
  email_verified: boolean;
  display_name: string;
  username: string;
  job_title: string;
  team: string;
  phone: string;
  bio: string;
  role: string;
  avatar_data_url: string | null;
};

export type TeamInviteRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  team: string;
  status: string;
  invited_by: string | null;
  created_at: string | Date;
  updated_at: string | Date;
  expires_at: string | Date | null;
  accepted_at: string | Date | null;
  revoked_at: string | Date | null;
};

export type StudioMessageRow = {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_username: string | null;
  sender_avatar_data_url: string | null;
  body: string;
  reply_to_id: string | null;
  reply_body: string | null;
  created_at: string;
  attachment_id: string | null;
  file_name: string | null;
  content_type: string | null;
  byte_size: number | null;
  reactions: { emoji: string; count: number }[] | string;
};

export type PublicShowcaseJob = {
  id: string;
  title: string;
  service: string;
  event_type: string;
  status: string;
  event_date: string | null;
  is_showcase: boolean;
};

const VALID_TEAM_INVITE_STATUSES = ["Invite sent", "Waiting on docs", "Ready to start"] as const;
const MAX_STUDIO_MESSAGE_LENGTH = 5_000;
const MAX_STUDIO_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const ALLOWED_STUDIO_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const ALLOWED_STUDIO_REACTIONS = new Set(["🔥", "👏", "❤️", "😂", "👀"]);
const MAX_PROFILE_AVATAR_BYTES = 1_500_000;
const PROFILE_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function ensureProfile(userId: string, displayName?: string | null) {
  const sql = await getSql();
  const isLocalPreviewUser =
    userId === DEV_USER_ID &&
    process.env.NODE_ENV === "development" &&
    process.env.VITE_AUTH_ENABLED === "false" &&
    !process.env.DATABASE_URL?.trim() &&
    !process.env.DATABASE_MIGRATION_URL?.trim();
  const localPreviewRole = isPreviewFixturesEnabled() ? getPreviewRole() : "admin";
  const identities = await sql<{ name: string | null; email: string; emailVerified: boolean }>`
    select name, email, "emailVerified" from "user" where id = ${userId}
  `;
  const identity = identities[0];
  await sql`
    insert into profiles (user_id, display_name, role)
    values (
      ${userId},
      ${displayName ?? (isLocalPreviewUser ? "Dev User" : (identity?.name ?? null))},
      ${isLocalPreviewUser ? localPreviewRole : "client"}
    )
    on conflict (user_id) do nothing
  `;
  if (isLocalPreviewUser) {
    await sql`
      update profiles
      set role = ${localPreviewRole}, display_name = coalesce(display_name, 'Dev User')
      where user_id = ${userId}
    `;
  } else {
    const adminEmail = process.env.STUDIO_ADMIN_EMAIL?.trim().toLowerCase();
    if (adminEmail && identity?.emailVerified && identity.email.toLowerCase() === adminEmail) {
      await sql`update profiles set role = 'admin' where user_id = ${userId}`;
    }
  }
  const rows =
    await sql<ProfileRow>`select user_id, display_name, role from profiles where user_id = ${userId}`;
  return rows[0];
}

export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const delivered = await sql<{
    n: number;
  }>`select count(*)::int as n from jobs where status = 'delivered' or is_showcase = true`;
  const live = await sql<{
    n: number;
  }>`select count(*)::int as n from jobs where status = 'production'`;
  const campaigns = await sql<{
    n: number;
  }>`select count(*)::int as n from jobs where service = 'brand' and (status = 'delivered' or is_showcase = true)`;
  return {
    delivered: delivered[0]?.n ?? 0,
    live: live[0]?.n ?? 0,
    campaigns: campaigns[0]?.n ?? 0,
  };
});

export const getPublicTransparency = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return sql<{
    id: string;
    title: string;
    event_type: string;
    status: "booked" | "production" | "delivered";
    event_date: string | null;
  }>`
    select id, title, event_type, status, event_date
    from jobs
    where is_showcase = true and status in ('booked', 'production', 'delivered')
    order by event_date desc nulls last
    limit 30
  `;
});

export const getLivePulse = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  const production = await sql<JobRow>`
    select * from jobs
    where is_showcase = true and status = 'production' and event_date = current_date
    order by event_date asc limit 1
  `;
  if (production[0])
    return { id: production[0].id, title: production[0].title, live: true as const };
  const showcase = await sql<JobRow>`
    select * from jobs
    where is_showcase = true and status in ('booked', 'production') and event_date >= current_date
    order by event_date asc limit 1
  `;
  if (showcase[0]) return { id: showcase[0].id, title: showcase[0].title, live: false as const };
  return null;
});

export const listShowcaseJobs = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return sql<PublicShowcaseJob>`
    select id, title, service, event_type, status, event_date, is_showcase
    from jobs where is_showcase = true and status in ('booked', 'production', 'delivered')
    order by event_date desc nulls last
  `;
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
    if (context.userId && !isOwner) {
      const profile = await ensureProfile(context.userId);
      isStaff = ["staff", "admin"].includes(profile.role);
    }
    if (!job.is_showcase && !isOwner && !isStaff) return null;
    const isPublicViewer = !isOwner && !isStaff;
    const safeJob = isPublicViewer
      ? {
          ...job,
          owner_user_id: null,
          client_name: "",
          venue: null,
          ballpark: 0,
          notes: null,
          guests: 0,
          tier: "",
        }
      : job;
    const cues = isPublicViewer
      ? []
      : await sql<CueRow>`select * from cues where job_id = ${data.id} order by sort_order`;
    const drafts =
      isOwner || isStaff ? await sql<DraftRow>`select * from drafts where job_id = ${data.id}` : [];
    return { job: safeJob, cues, drafts };
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

export const listClientAccounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    return sql<ClientAccountRow>`
      select p.user_id, coalesce(p.display_name, u.name, u.email) as display_name, u.email
      from profiles p
      join "user" u on u.id = p.user_id
      where p.role = 'client' and u."emailVerified" = true
      order by coalesce(p.display_name, u.name, u.email)
    `;
  });

async function getLatestPaymentPlan(sql: Awaited<ReturnType<typeof getSql>>, jobId: string) {
  const agreements = await sql<PaymentAgreementRow>`
    select * from payment_agreements
    where job_id = ${jobId}
    order by created_at desc
    limit 1
  `;
  const agreement = agreements[0] ?? null;
  if (!agreement) return { agreement: null, milestones: [] as PaymentMilestoneWithInvoiceRow[] };
  const milestones = await sql<PaymentMilestoneWithInvoiceRow>`
    select m.*, i.id as invoice_id, i.status as invoice_status, i.paid_at
    from payment_milestones m
    left join invoices i on i.milestone_id = m.id
    where m.agreement_id = ${agreement.id}
    order by m.sort_order, m.id
  `;
  return { agreement, milestones };
}

export const getAdminPaymentPlan = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    if (!data || typeof data.jobId !== "string" || !data.jobId.trim()) {
      throw new Error("Choose a production.");
    }
    const sql = await getSql();
    const jobs = await sql<JobRow>`select * from jobs where id = ${data.jobId}`;
    if (!jobs[0]) throw new Error("Production not found.");
    return { job: jobs[0], ...(await getLatestPaymentPlan(sql, data.jobId)) };
  });

export const proposePaymentAgreement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      jobId: string;
      terms: string;
      milestones: { label: string; amount: number; dueDate: string | null; note: string }[];
    }) => input,
  )
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    if (!data || typeof data.jobId !== "string" || !data.jobId.trim()) {
      throw new Error("Choose a production.");
    }
    if (
      typeof data.terms !== "string" ||
      data.terms.trim().length === 0 ||
      data.terms.length > 5_000
    ) {
      throw new Error("Record the agreed payment terms in 5,000 characters or fewer.");
    }
    if (
      !Array.isArray(data.milestones) ||
      data.milestones.length < 1 ||
      data.milestones.length > 12
    ) {
      throw new Error("Add between 1 and 12 payment milestones.");
    }
    for (const [index, milestone] of data.milestones.entries()) {
      if (
        !milestone ||
        typeof milestone.label !== "string" ||
        !milestone.label.trim() ||
        milestone.label.length > 120
      ) {
        throw new Error(`Milestone ${index + 1} needs a title of 120 characters or fewer.`);
      }
      if (
        !Number.isSafeInteger(milestone.amount) ||
        milestone.amount < 1 ||
        milestone.amount > 2_000_000_000
      ) {
        throw new Error(
          `Milestone ${index + 1} must be a whole amount between KES 1 and 2,000,000,000.`,
        );
      }
      if (typeof milestone.note !== "string" || milestone.note.length > 1_000) {
        throw new Error(`Milestone ${index + 1} notes must be 1,000 characters or fewer.`);
      }
      if (
        milestone.dueDate !== null &&
        (typeof milestone.dueDate !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(milestone.dueDate) ||
          Number.isNaN(Date.parse(`${milestone.dueDate}T00:00:00Z`)) ||
          new Date(`${milestone.dueDate}T00:00:00Z`).toISOString().slice(0, 10) !==
            milestone.dueDate)
      ) {
        throw new Error(`Milestone ${index + 1} has an invalid due date.`);
      }
    }

    const sql = await getSql();
    const jobs = await sql<{ id: string; owner_user_id: string | null }>`
      select id, owner_user_id from jobs where id = ${data.jobId}
    `;
    const job = jobs[0];
    if (!job) throw new Error("Production not found.");
    if (!job.owner_user_id)
      throw new Error("Link a verified client account before proposing payment terms.");
    const invoiced = await sql<{ id: string }>`
      select i.id from invoices i
      join payment_milestones m on m.id = i.milestone_id
      join payment_agreements a on a.id = m.agreement_id
      where a.job_id = ${data.jobId}
      limit 1
    `;
    if (invoiced[0]) {
      throw new Error("Payment terms can’t be replaced after a milestone invoice has been issued.");
    }

    const agreementId = `pa_${crypto.randomUUID()}`;
    const milestones = data.milestones.map((milestone, index) => ({
      id: `pm_${crypto.randomUUID()}`,
      label: milestone.label.trim(),
      amount: milestone.amount,
      due_date: milestone.dueDate,
      note: milestone.note.trim(),
      sort_order: index,
    }));
    await sql`
      with agreement as (
        insert into payment_agreements (
          id, job_id, owner_user_id, created_by, status, terms
        ) values (
          ${agreementId}, ${data.jobId}, ${job.owner_user_id}, ${context.userId},
          'pending_client', ${data.terms.trim()}
        )
        returning id
      )
      insert into payment_milestones (
        id, agreement_id, label, amount, due_date, note, sort_order
      )
      select item.id, agreement.id, item.label, item.amount, item.due_date::date, item.note, item.sort_order
      from agreement
      cross join jsonb_to_recordset(${JSON.stringify(milestones)}::jsonb) as item(
        id text, label text, amount integer, due_date text, note text, sort_order integer
      )
    `;
    return getLatestPaymentPlan(sql, data.jobId);
  });

export const respondToPaymentAgreement = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      agreementId: string;
      decision: "accepted" | "changes_requested";
      feedback?: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    if (!data || !["accepted", "changes_requested"].includes(data.decision)) {
      throw new Error("Choose to accept the agreement or request changes.");
    }
    if (typeof data.agreementId !== "string" || !data.agreementId.trim()) {
      throw new Error("Payment agreement not found.");
    }
    if (data.feedback !== undefined && typeof data.feedback !== "string") {
      throw new Error("Feedback must be text.");
    }
    const feedback = data.feedback?.trim() ?? "";
    if (data.decision === "changes_requested" && !feedback) {
      throw new Error("Add a note describing the changes you need.");
    }
    if (feedback.length > 2_000) throw new Error("Feedback must be 2,000 characters or fewer.");
    const sql = await getSql();
    const agreements = await sql<PaymentAgreementRow>`
      select a.* from payment_agreements a
      join jobs j on j.id = a.job_id
      where a.id = ${data.agreementId}
        and j.owner_user_id = ${context.userId}
        and a.id = (
          select latest.id from payment_agreements latest
          where latest.job_id = a.job_id order by latest.created_at desc limit 1
        )
        and a.status in ('pending_client', 'changes_requested')
    `;
    if (!agreements[0]) throw new Error("This payment proposal is no longer awaiting a response.");
    const updated = await sql<{ id: string }>`
      update payment_agreements
      set status = ${data.decision},
          client_feedback = ${data.decision === "changes_requested" ? feedback : null},
          accepted_at = ${data.decision === "accepted" ? new Date().toISOString() : null}
      where id = ${data.agreementId} and owner_user_id = ${context.userId}
      returning id
    `;
    if (!updated[0]) throw new Error("Payment agreement not found.");
    return { ok: true as const };
  });

export const issueMilestoneInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { milestoneId: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    if (!data || typeof data.milestoneId !== "string" || !data.milestoneId.trim()) {
      throw new Error("Choose a payment milestone.");
    }
    const sql = await getSql();
    const milestones = await sql<PaymentMilestoneRow & { owner_user_id: string; status: string }>`
      select m.*, a.owner_user_id, a.status
      from payment_milestones m
      join payment_agreements a on a.id = m.agreement_id
      where m.id = ${data.milestoneId}
        and a.status = 'accepted'
        and a.id = (
          select latest.id from payment_agreements latest
          where latest.job_id = a.job_id order by latest.created_at desc limit 1
        )
    `;
    const milestone = milestones[0];
    if (!milestone) throw new Error("Only an accepted payment agreement can be invoiced.");
    const existing =
      await sql<InvoiceRow>`select * from invoices where milestone_id = ${milestone.id}`;
    if (existing[0]) return existing[0];
    const rows = await sql<InvoiceRow>`
      insert into invoices (id, job_id, user_id, milestone_id, kind, amount, status)
      select ${`inv_${crypto.randomUUID()}`}, a.job_id, a.owner_user_id, m.id, m.label, m.amount, 'due'
      from payment_milestones m
      join payment_agreements a on a.id = m.agreement_id
      where m.id = ${milestone.id}
      returning *
    `;
    if (!rows[0]) throw new Error("The milestone invoice could not be created.");
    return rows[0];
  });

export const payMilestoneInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { invoiceId: string }) => input)
  .handler(async ({ context, data }) => {
    if (isPreviewFixturesEnabled()) {
      throw new Error("Online payments are disabled in the fixture preview.");
    }
    if (!data || typeof data.invoiceId !== "string" || !data.invoiceId.trim()) {
      throw new Error("Choose an invoice.");
    }
    const sql = await getSql();
    const rows = await sql<InvoiceRow>`
      select i.* from invoices i
      join payment_milestones m on m.id = i.milestone_id
      join payment_agreements a on a.id = m.agreement_id
      where i.id = ${data.invoiceId}
        and i.user_id = ${context.userId}
        and a.status = 'accepted'
        and a.id = (
          select latest.id from payment_agreements latest
          where latest.job_id = a.job_id order by latest.created_at desc limit 1
        )
    `;
    if (!rows[0]) throw new Error("This invoice is not available on the signed-in account.");
    const pendingOfflineReport = await sql<{ id: string }>`
      select id from offline_payment_reports
      where invoice_id = ${rows[0].id} and status = 'pending_review'
      limit 1
    `;
    if (pendingOfflineReport[0]) {
      throw new Error("This invoice has a payment report awaiting review and cannot be paid online yet.");
    }
    const receipt = await settlePaidInvoice(
      sql,
      rows[0].id,
      context.userId,
      rows[0].milestone_id ?? undefined,
    );
    return { ok: true as const, receiptId: receipt?.id ?? null };
  });

export const reportOfflinePayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    invoiceId: string;
    paymentMethod: "mpesa" | "bank_transfer" | "cash";
    transactionReference: string;
    paymentDate: string;
    note?: string;
  }) => input)
  .handler(async ({ context, data }) => {
    if (!data || typeof data.invoiceId !== "string" || !data.invoiceId.trim()) {
      throw new Error("Choose an invoice.");
    }
    if (!["mpesa", "bank_transfer", "cash"].includes(data.paymentMethod)) {
      throw new Error("Choose M-Pesa, bank transfer, or cash.");
    }
    if (
      typeof data.transactionReference !== "string" ||
      data.transactionReference.trim().length < 4 ||
      data.transactionReference.trim().length > 100
    ) {
      throw new Error("Enter a payment reference between 4 and 100 characters.");
    }
    if (
      typeof data.paymentDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(data.paymentDate) ||
      Number.isNaN(Date.parse(`${data.paymentDate}T00:00:00Z`)) ||
      new Date(`${data.paymentDate}T00:00:00Z`).toISOString().slice(0, 10) !== data.paymentDate ||
      data.paymentDate > new Date().toISOString().slice(0, 10)
    ) {
      throw new Error("Choose a valid payment date that is not in the future.");
    }
    if (data.note !== undefined && (typeof data.note !== "string" || data.note.length > 1000)) {
      throw new Error("The note must be 1,000 characters or fewer.");
    }

    const sql = await getSql();
    const invoices = await sql<InvoiceRow>`
      select i.* from invoices i
      join payment_milestones m on m.id = i.milestone_id
      join payment_agreements a on a.id = m.agreement_id
      where i.id = ${data.invoiceId}
        and i.user_id = ${context.userId}
        and i.status <> 'paid'
        and a.status = 'accepted'
        and a.id = (
          select latest.id from payment_agreements latest
          where latest.job_id = a.job_id order by latest.created_at desc limit 1
        )
    `;
    const invoice = invoices[0];
    if (!invoice) throw new Error("This invoice is not available for payment reporting.");

    const pending = await sql<{ id: string }>`
      select id from offline_payment_reports
      where invoice_id = ${invoice.id} and status = 'pending_review'
      limit 1
    `;
    if (pending[0]) throw new Error("A payment report for this invoice is already awaiting review.");

    let rows: OfflinePaymentReportRow[];
    try {
      rows = await sql<OfflinePaymentReportRow>`
        insert into offline_payment_reports (
          id, invoice_id, user_id, payment_method, transaction_reference,
          reported_amount, payment_date, client_note
        ) values (
          ${`opr_${crypto.randomUUID()}`},
          ${invoice.id},
          ${context.userId},
          ${data.paymentMethod},
          ${data.transactionReference.trim()},
          ${invoice.amount},
          ${data.paymentDate},
          ${data.note?.trim() || null}
        )
        returning *
      `;
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "23505") {
        const constraint = "constraint" in error ? error.constraint : null;
        if (constraint === "offline_payment_reports_pending_invoice_idx") {
          throw new Error("A payment report for this invoice is already awaiting review.");
        }
        if (constraint === "offline_payment_reports_reference_idx") {
          throw new Error("That transaction reference has already been reported.");
        }
        throw new Error("This payment report duplicates an existing record.");
      }
      throw error;
    }
    if (!rows[0]) throw new Error("Your payment report could not be saved.");
    return rows[0];
  });

export const listJobDrafts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    if (!data || typeof data.jobId !== "string" || !data.jobId.trim()) {
      throw new Error("Choose a production.");
    }
    const sql = await getSql();
    return sql<DraftRow>`select * from drafts where job_id = ${data.jobId} order by title`;
  });

export const createJobDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { jobId: string; title: string; kind: string; note: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    validateDraftInput(data);
    const sql = await getSql();
    const jobs = await sql<{ id: string; owner_user_id: string | null }>`
      select id, owner_user_id from jobs where id = ${data.jobId}
    `;
    if (!jobs[0]) throw new Error("Production not found.");
    if (!jobs[0].owner_user_id) {
      throw new Error("Link a verified client account to this production before sharing a draft.");
    }
    const rows = await sql<DraftRow>`
      insert into drafts (id, job_id, title, kind, status, note)
      values (${`dr_${crypto.randomUUID()}`}, ${data.jobId}, ${data.title.trim()}, ${data.kind.trim()}, 'review', ${data.note.trim() || null})
      returning *
    `;
    return rows[0];
  });

export const updateJobDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { id: string; jobId: string; title: string; kind: string; note: string }) => input,
  )
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    validateDraftInput(data);
    if (typeof data.id !== "string" || !data.id.trim()) throw new Error("Choose a draft.");
    const sql = await getSql();
    const rows = await sql<DraftRow>`
      update drafts
      set title = ${data.title.trim()},
          kind = ${data.kind.trim()},
          note = ${data.note.trim() || null},
          status = 'review',
          client_feedback = null
      where id = ${data.id} and job_id = ${data.jobId}
      returning *
    `;
    if (!rows[0]) throw new Error("Draft not found.");
    return rows[0];
  });

export const deleteJobDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; jobId: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    if (
      !data ||
      typeof data.id !== "string" ||
      !data.id.trim() ||
      typeof data.jobId !== "string" ||
      !data.jobId.trim()
    ) {
      throw new Error("Choose a draft.");
    }
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      delete from drafts where id = ${data.id} and job_id = ${data.jobId} returning id
    `;
    if (!rows[0]) throw new Error("Draft not found.");
    return { ok: true as const };
  });

function validateDraftInput(data: { jobId: string; title: string; kind: string; note: string }) {
  if (!data || typeof data !== "object" || typeof data.jobId !== "string" || !data.jobId.trim()) {
    throw new Error("Choose a production.");
  }
  if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 200) {
    throw new Error("Draft title is required and must be 200 characters or fewer.");
  }
  if (typeof data.kind !== "string" || !data.kind.trim() || data.kind.length > 80) {
    throw new Error("Draft type is required and must be 80 characters or fewer.");
  }
  if (typeof data.note !== "string" || data.note.length > 10_000) {
    throw new Error("Draft details must be 10,000 characters or fewer.");
  }
}

export const createProductionJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ProductionJobInput) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    validateJobInput(data);
    const sql = await getSql();
    const clientUserId = await validateClientAccount(sql, data.client_user_id);
    const id = `job_${randomBytes(12).toString("hex")}`;
    const rows = await sql<JobRow>`
      insert into jobs (
        id, owner_user_id, title, client_name, service, event_type, guests,
        tier, status, venue, event_date, ballpark, notes, is_showcase
      ) values (
        ${id}, ${clientUserId}, ${data.title.trim()}, ${data.client_name.trim()},
        ${data.service}, ${data.event_type}, ${data.guests}, ${data.tier},
        ${data.status}, ${data.venue?.trim() || null}, ${data.event_date},
        ${data.ballpark}, ${data.notes?.trim() || null}, ${false}
      )
      returning *
    `;
    return rows[0];
  });

export const updateProductionJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ProductionJobInput & { id: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    validateJobInput(data);
    if (typeof data.id !== "string" || !data.id.trim())
      throw new Error("A production must be selected.");
    const sql = await getSql();
    const clientUserId = await validateClientAccount(sql, data.client_user_id);
    const rows = await sql<JobRow>`
      update jobs
      set owner_user_id = coalesce(owner_user_id, ${clientUserId}),
          title = ${data.title.trim()},
          client_name = ${data.client_name.trim()},
          service = ${data.service},
          event_type = ${data.event_type},
          guests = ${data.guests},
          tier = ${data.tier},
          status = ${data.status},
          venue = ${data.venue?.trim() || null},
          event_date = ${data.event_date},
          ballpark = ${data.ballpark},
          notes = ${data.notes?.trim() || null}
      where id = ${data.id}
        and (${clientUserId === null} or owner_user_id is null or owner_user_id = ${clientUserId})
      returning *
    `;
    if (!rows[0]) throw new Error("Production not found or its client account cannot be changed.");
    if (data.status === "delivered") {
      await sql`
        insert into testimonials (id, job_id, author, company, body, requested)
        values (${`tm_${data.id}`}, ${data.id}, ${"Awaiting client"}, ${null}, ${""}, ${true})
        on conflict (id) do nothing
      `;
    }
    return rows[0];
  });

async function validateClientAccount(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string | null | undefined,
) {
  if (userId == null || userId === "") return null;
  if (typeof userId !== "string" || userId.length > 200) {
    throw new Error("Choose a valid client account.");
  }
  const rows = await sql<{ user_id: string }>`
    select p.user_id
    from profiles p
    join "user" u on u.id = p.user_id
    where p.user_id = ${userId} and p.role = 'client' and u."emailVerified" = true
  `;
  if (!rows[0]) throw new Error("The selected account is not a verified client account.");
  return rows[0].user_id;
}

function validateJobInput(data: JobInput) {
  if (!data || typeof data !== "object") throw new Error("Production details are required.");
  const statuses = ["inquiry", "quoted", "booked", "production", "delivered", "cancelled"];
  if (typeof data.title !== "string" || !data.title.trim() || data.title.length > 200) {
    throw new Error("Production title is required and must be 200 characters or fewer.");
  }
  if (
    typeof data.client_name !== "string" ||
    !data.client_name.trim() ||
    data.client_name.length > 200
  ) {
    throw new Error("Client name is required and must be 200 characters or fewer.");
  }
  if (typeof data.service !== "string" || !data.service.trim() || data.service.length > 100)
    throw new Error("Production service is required.");
  if (
    typeof data.event_type !== "string" ||
    !data.event_type.trim() ||
    data.event_type.length > 100
  )
    throw new Error("Event type is required.");
  if (typeof data.tier !== "string" || !data.tier.trim() || data.tier.length > 100)
    throw new Error("Production tier is required.");
  if (typeof data.status !== "string" || !statuses.includes(data.status))
    throw new Error("Choose a valid production status.");
  if (!Number.isInteger(data.guests) || data.guests < 0 || data.guests > 100_000) {
    throw new Error("Guest count must be a whole number between 0 and 100,000.");
  }
  if (!Number.isInteger(data.ballpark) || data.ballpark < 0 || data.ballpark > 2_000_000_000) {
    throw new Error("Budget must be a whole number between 0 and 2,000,000,000.");
  }
  if (data.venue !== null && typeof data.venue !== "string") throw new Error("Venue must be text.");
  if (data.notes !== null && typeof data.notes !== "string")
    throw new Error("Production notes must be text.");
  if (data.venue && data.venue.length > 300)
    throw new Error("Venue must be 300 characters or fewer.");
  if (data.notes && data.notes.length > 10_000)
    throw new Error("Production notes must be 10,000 characters or fewer.");
  if (data.event_date !== null && typeof data.event_date !== "string")
    throw new Error("Enter a valid event date.");
  if (data.event_date) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data.event_date) ||
      Number.isNaN(Date.parse(`${data.event_date}T00:00:00Z`)) ||
      new Date(`${data.event_date}T00:00:00Z`).toISOString().slice(0, 10) !== data.event_date
    ) {
      throw new Error("Enter a valid event date.");
    }
  }
}

export const updateJobBrief = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      id: string;
      eventDate: string | null;
      venue: string;
      guests: number;
      notes: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    if (!data.id.trim()) throw new Error("A production must be selected.");
    if (!Number.isInteger(data.guests) || data.guests < 0 || data.guests > 100_000) {
      throw new Error("Guest count must be a whole number between 0 and 100,000.");
    }
    if (data.eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.eventDate)) {
      throw new Error("Enter a valid event date.");
    }
    if (data.venue.length > 300 || data.notes.length > 10_000) {
      throw new Error("Venue or production notes exceed the allowed length.");
    }
    const sql = await getSql();
    const rows = await sql<JobRow>`
      update jobs
      set event_date = ${data.eventDate},
          venue = ${data.venue.trim() || null},
          guests = ${data.guests},
          notes = ${data.notes.trim() || null}
      where id = ${data.id}
      returning *
    `;
    if (!rows[0]) throw new Error("Production not found.");
    return rows[0];
  });

export const listJobCues = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { jobId: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    return sql<CueRow>`
      select cues.*
      from cues
      join jobs on jobs.id = cues.job_id
      where cues.job_id = ${data.jobId}
      order by cues.starts_at, cues.sort_order, cues.id
    `;
  });

export const createJobCue = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { jobId: string; startsAt: string; title: string; owner: string; kind: string }) =>
      input,
  )
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    validateCueFields(data);
    const sql = await getSql();
    const jobs = await sql<{ id: string }>`
      select id from jobs where id = ${data.jobId} and status in ('booked', 'production')
    `;
    if (!jobs[0]) throw new Error("Run-sheet cues require a booked or in-production job.");
    const order = await sql<{ next_order: number }>`
      select coalesce(max(sort_order), -1) + 1 as next_order from cues where job_id = ${data.jobId}
    `;
    const id = `cue_${randomBytes(10).toString("hex")}`;
    const rows = await sql<CueRow>`
      insert into cues (id, job_id, starts_at, title, owner, kind, status, sort_order)
      values (${id}, ${data.jobId}, ${data.startsAt}, ${data.title.trim()}, ${data.owner.trim()}, ${data.kind.trim()}, 'pending', ${order[0]?.next_order ?? 0})
      returning *
    `;
    return rows[0];
  });

export const updateJobCue = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: { id: string; startsAt: string; title: string; owner: string; kind: string }) => input,
  )
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    validateCueFields(data);
    const sql = await getSql();
    const rows = await sql<CueRow>`
      update cues
      set starts_at = ${data.startsAt},
          title = ${data.title.trim()},
          owner = ${data.owner.trim()},
          kind = ${data.kind.trim()}
      where id = ${data.id}
      returning *
    `;
    if (!rows[0]) throw new Error("Run-sheet cue not found.");
    return rows[0];
  });

export const deleteJobCue = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: string }>`delete from cues where id = ${data.id} returning id`;
    if (!rows[0]) throw new Error("Run-sheet cue not found.");
    return { ok: true as const };
  });

function validateCueFields(data: { startsAt: string; title: string; owner: string; kind: string }) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.startsAt)) {
    throw new Error("Enter a valid 24-hour cue time.");
  }
  if (!data.title.trim() || data.title.length > 200) {
    throw new Error("Cue title is required and must be 200 characters or fewer.");
  }
  if (!data.owner.trim() || data.owner.length > 120 || !data.kind.trim() || data.kind.length > 80) {
    throw new Error("Cue owner and type are required and must fit their field limits.");
  }
}

export const setJobShowcase = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; isShowcase: boolean }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const updated = await sql<{ id: string; is_showcase: boolean }>`
      update jobs
      set is_showcase = ${data.isShowcase}
      where id = ${data.id}
        and (${!data.isShowcase} or status in ('booked', 'production', 'delivered'))
      returning id, is_showcase
    `;
    if (!updated[0]) {
      throw new Error(
        data.isShowcase
          ? "Only booked, in-production, or delivered projects can be shared publicly."
          : "Project not found.",
      );
    }
    return updated[0];
  });

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return ensureProfile(context.userId);
  });

export const getPaymentAvailability = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    if (isPreviewFixturesEnabled()) {
      return {
        available: false,
        message: "Online payments are disabled in the fixture preview. No real charge will be made.",
      };
    }
    const status = getPaymentProviderStatus();
    return {
      available: status.mode === "live" && status.ready,
      message:
        status.mode === "live" && status.ready
          ? "Online payment is available."
          : "Online payments are not set up yet. Your invoice remains due; contact Randy Production for payment options.",
    };
  });

export const getStudioProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<
      Omit<StudioProfile, "avatar_data_url"> & {
        avatar_content_type: string | null;
        avatar_base64: string | null;
      }
    >`
      select p.user_id, u.email, coalesce(u."emailVerified", false) as email_verified,
        coalesce(p.display_name, u.name, '') as display_name,
        coalesce(p.username, '') as username,
        p.job_title, p.team, p.phone, p.bio, p.role,
        p.avatar_content_type, encode(p.avatar_data, 'base64') as avatar_base64
      from profiles p
      left join "user" u on u.id = p.user_id
      where p.user_id = ${context.userId}
    `;
    const profile = rows[0];
    if (!profile) throw new Error("Studio profile not found.");
    const { avatar_content_type, avatar_base64, ...fields } = profile;
    return {
      ...fields,
      avatar_data_url:
        avatar_content_type && avatar_base64
          ? `data:${avatar_content_type};base64,${avatar_base64}`
          : null,
    } satisfies StudioProfile;
  });

export const saveStudioProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      displayName: string;
      username: string;
      jobTitle: string;
      team: string;
      phone: string;
      bio: string;
      avatar?: { contentType: string; base64: string } | null;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const displayName = typeof data.displayName === "string" ? data.displayName.trim() : "";
    const username = typeof data.username === "string" ? data.username.trim().toLowerCase() : "";
    const jobTitle = typeof data.jobTitle === "string" ? data.jobTitle.trim() : "";
    const team = typeof data.team === "string" ? data.team.trim() : "";
    const phone = typeof data.phone === "string" ? data.phone.trim() : "";
    const bio = typeof data.bio === "string" ? data.bio.trim() : "";

    if (displayName.length < 2 || displayName.length > 80) {
      throw new Error("Display name must be between 2 and 80 characters.");
    }
    if (!/^[a-z0-9](?:[a-z0-9._]{1,22}[a-z0-9])$/.test(username)) {
      throw new Error("Username must be 3–24 characters: letters, numbers, dots, or underscores.");
    }
    if (jobTitle.length > 80 || team.length > 60 || phone.length > 40 || bio.length > 500) {
      throw new Error("One or more profile fields are over the allowed length.");
    }

    const sql = await getSql();
    const conflicts = await sql<{ user_id: string }>`
      select user_id from profiles where lower(username) = ${username} and user_id <> ${context.userId}
    `;
    if (conflicts[0]) throw new Error("That username is already in use.");

    let avatarBytes: Buffer | null = null;
    let avatarType: string | null = null;
    if (data.avatar !== undefined && data.avatar !== null) {
      const { contentType, base64 } = data.avatar;
      if (!PROFILE_AVATAR_TYPES.has(contentType) || typeof base64 !== "string") {
        throw new Error("Profile photos must be JPG, PNG, or WebP.");
      }
      if (
        base64.length === 0 ||
        base64.length > Math.ceil(MAX_PROFILE_AVATAR_BYTES / 3) * 4 + 8 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
      ) {
        throw new Error("Profile photos must be smaller than 1.5 MB.");
      }
      const bytes = Buffer.from(base64, "base64");
      if (
        bytes.length === 0 ||
        bytes.length > MAX_PROFILE_AVATAR_BYTES ||
        bytes.toString("base64").replace(/=+$/, "") !== base64.replace(/=+$/, "")
      ) {
        throw new Error("Invalid profile photo data.");
      }
      const isJpeg =
        contentType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      const isPng =
        contentType === "image/png" &&
        bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const isWebp =
        contentType === "image/webp" &&
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP";
      if (!isJpeg && !isPng && !isWebp)
        throw new Error("The selected file is not a valid supported image.");
      avatarBytes = bytes;
      avatarType = contentType;
    }

    try {
      if (data.avatar === undefined) {
        await sql`
          update profiles
          set display_name = ${displayName}, username = ${username}, job_title = ${jobTitle},
            team = ${team}, phone = ${phone}, bio = ${bio}
          where user_id = ${context.userId}
        `;
      } else {
        await sql`
          update profiles
          set display_name = ${displayName}, username = ${username}, job_title = ${jobTitle},
            team = ${team}, phone = ${phone}, bio = ${bio},
            avatar_data = ${avatarBytes}, avatar_content_type = ${avatarType}
          where user_id = ${context.userId}
        `;
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new Error("That username is already in use.");
      }
      throw error;
    }

    await sql`update "user" set name = ${displayName}, "updatedAt" = now() where id = ${context.userId}`;
    return { ok: true as const };
  });

export const listTeamInvites = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    return sql<TeamInviteRow>`
      select id, email, name, role, team, status, invited_by, created_at, updated_at,
        expires_at, accepted_at, revoked_at
      from team_invites order by created_at desc
    `;
  });

export const createTeamInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { name: string; role: string; team: string; email: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const name = data.name?.trim();
    const team = data.team?.trim();
    const role = data.role?.trim();
    const email = data.email?.trim().toLowerCase();
    if (!name || !team || !role || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Name, role, team, and email are required");
    }
    const sql = await getSql();
    const id = `inv_${crypto.randomUUID().slice(0, 8)}`;
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const rows = await sql<TeamInviteRow>`
      insert into team_invites (
        id, email, name, role, team, status, invited_by, token_hash, expires_at, accepted_at, revoked_at, updated_at
      )
      values (
        ${id}, ${email}, ${name}, ${role}, ${team}, ${"Invite sent"}, ${context.userId},
        ${tokenHash}, now() + interval '7 days', null, null, now()
      )
      on conflict (email) do update set
        id = excluded.id,
        name = excluded.name,
        role = excluded.role,
        team = excluded.team,
        status = excluded.status,
        invited_by = excluded.invited_by,
        token_hash = excluded.token_hash,
        expires_at = excluded.expires_at,
        accepted_at = null,
        revoked_at = null,
        updated_at = now()
      returning id, email, name, role, team, status, invited_by, created_at, updated_at,
        expires_at, accepted_at, revoked_at
    `;
    return { ...rows[0], invitePath: `/studio?invite=${encodeURIComponent(token)}` };
  });

export const updateTeamInviteStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; status: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const status = data.status?.trim();
    if (
      !status ||
      !VALID_TEAM_INVITE_STATUSES.includes(status as (typeof VALID_TEAM_INVITE_STATUSES)[number])
    ) {
      throw new Error("Bad invite status");
    }
    const sql = await getSql();
    const rows = await sql<TeamInviteRow>`
      update team_invites
      set status = ${status}, updated_at = now()
      where id = ${data.id} and accepted_at is null and revoked_at is null and expires_at > now()
      returning id, email, name, role, team, status, invited_by, created_at, updated_at,
        expires_at, accepted_at, revoked_at
    `;
    if (!rows[0]) throw new Error("Invite not found");
    return rows[0];
  });

export const revokeTeamInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<TeamInviteRow>`
      update team_invites
      set revoked_at = now(), token_hash = null, status = 'Revoked', updated_at = now()
      where id = ${data.id} and accepted_at is null and revoked_at is null
      returning id, email, name, role, team, status, invited_by, created_at, updated_at,
        expires_at, accepted_at, revoked_at
    `;
    if (!rows[0]) throw new Error("Pending invite not found");
    return rows[0];
  });

export const acceptStudioInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { token: string }) => input)
  .handler(async ({ context, data }) => {
    const token = typeof data.token === "string" ? data.token.trim() : "";
    if (!token || token.length > 128) throw new Error("This invitation is invalid or expired.");
    const sql = await getSql();
    const users = await sql<{ email: string; emailVerified: boolean }>`
      select email, "emailVerified" from "user" where id = ${context.userId}
    `;
    const user = users[0];
    if (!user?.emailVerified || !user.email) {
      throw new Error("Sign in with the verified email address this invitation was sent to.");
    }
    await ensureProfile(context.userId);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const accepted = await sql<{ id: string }>`
      update team_invites
      set accepted_at = now(), status = 'Ready to start', token_hash = null, updated_at = now()
      where token_hash = ${tokenHash}
        and lower(email) = lower(${user.email})
        and accepted_at is null
        and revoked_at is null
        and expires_at > now()
      returning id
    `;
    if (!accepted[0])
      throw new Error(
        "This invitation is invalid, expired, already used, or belongs to another email.",
      );
    await sql`update profiles set role = case when role = 'admin' then 'admin' else 'staff' end where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const listStudioChannels = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    await sql`
      insert into studio_channels (id, title, job_id)
      select 'job:' || id, title, id from jobs where status in ('booked', 'production')
      on conflict (job_id) where job_id is not null do update set title = excluded.title
    `;
    return sql<{ id: string; title: string; job_id: string | null }>`
      select c.id, c.title, c.job_id
      from studio_channels c
      left join jobs j on j.id = c.job_id
      where c.job_id is null or j.status in ('booked', 'production')
      order by c.job_id nulls first, j.event_date asc nulls last, c.title
    `;
  });

export const listStudioMessages = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { channelId: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const channel = await sql<{
      id: string;
    }>`select id from studio_channels where id = ${data.channelId}`;
    if (!channel[0]) throw new Error("Channel not found");
    return sql<StudioMessageRow>`
      select m.id, m.sender_id, coalesce(p.display_name, 'Studio teammate') as sender_name,
        p.username as sender_username,
        case when p.avatar_data is not null
          then 'data:' || p.avatar_content_type || ';base64,' || encode(p.avatar_data, 'base64')
          else null end as sender_avatar_data_url,
        m.body, m.reply_to_id, parent.body as reply_body, m.created_at,
        a.id as attachment_id, a.file_name, a.content_type, a.byte_size,
        coalesce((
          select json_agg(json_build_object('emoji', r.emoji, 'count', r.total))
          from (
            select emoji, count(*)::int as total
            from studio_message_reactions
            where message_id = m.id group by emoji
          ) r
        ), '[]'::json) as reactions
      from studio_messages m
      left join profiles p on p.user_id = m.sender_id
      left join studio_messages parent on parent.id = m.reply_to_id
      left join studio_attachments a on a.message_id = m.id
      where m.channel_id = ${data.channelId}
      order by m.created_at desc limit 100
    `;
  });

export const sendStudioMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      channelId: string;
      body: string;
      replyToId?: string;
      attachment?: { name: string; contentType: string; base64: string };
    }) => input,
  )
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const body = typeof data.body === "string" ? data.body.trim() : "";
    const attachment = data.attachment;
    if (!body && !attachment) throw new Error("Write a message or attach a file.");
    if (body.length > MAX_STUDIO_MESSAGE_LENGTH)
      throw new Error("Messages are limited to 5,000 characters.");
    const sql = await getSql();
    const channels = await sql<{
      id: string;
    }>`select id from studio_channels where id = ${data.channelId}`;
    if (!channels[0]) throw new Error("Channel not found");
    if (data.replyToId) {
      const parent = await sql<{ id: string }>`
        select id from studio_messages where id = ${data.replyToId} and channel_id = ${data.channelId}
      `;
      if (!parent[0]) throw new Error("Reply target not found in this channel.");
    }
    const messageId = `msg_${crypto.randomUUID()}`;
    if (attachment) {
      const name =
        typeof attachment.name === "string"
          ? attachment.name
              .split("")
              .filter((character) => {
                const code = character.charCodeAt(0);
                return code >= 32 && code !== 127;
              })
              .join("")
              .trim()
              .slice(0, 180)
          : "";
      if (
        !name ||
        name.includes("/") ||
        name.includes("\\") ||
        !ALLOWED_STUDIO_ATTACHMENT_TYPES.has(attachment.contentType)
      ) {
        throw new Error("Only JPG, PNG, WebP, and PDF attachments are allowed.");
      }
      if (typeof attachment.contentType !== "string" || typeof attachment.base64 !== "string") {
        throw new Error("Invalid attachment data.");
      }
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(attachment.base64))
        throw new Error("Invalid attachment data.");
      if (attachment.base64.length > Math.ceil(MAX_STUDIO_ATTACHMENT_BYTES / 3) * 4 + 8) {
        throw new Error("Attachments must be smaller than 2 MB.");
      }
      const bytes = Buffer.from(attachment.base64, "base64");
      if (bytes.length > MAX_STUDIO_ATTACHMENT_BYTES || bytes.length === 0) {
        throw new Error("Attachments must be smaller than 2 MB.");
      }
      if (bytes.toString("base64").replace(/=+$/, "") !== attachment.base64.replace(/=+$/, "")) {
        throw new Error("Invalid attachment data.");
      }
      await sql`
        with new_message as (
          insert into studio_messages (id, channel_id, sender_id, body, reply_to_id)
          values (${messageId}, ${data.channelId}, ${context.userId}, ${body}, ${data.replyToId ?? null})
          returning id
        )
        insert into studio_attachments (id, message_id, file_name, content_type, byte_size, data)
        select ${`file_${crypto.randomUUID()}`}, id, ${name}, ${attachment.contentType}, ${bytes.length}, ${bytes}
        from new_message
      `;
    } else {
      await sql`
        insert into studio_messages (id, channel_id, sender_id, body, reply_to_id)
        values (${messageId}, ${data.channelId}, ${context.userId}, ${body}, ${data.replyToId ?? null})
      `;
    }
    return { id: messageId };
  });

export const downloadStudioAttachment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      file_name: string;
      content_type: string;
      byte_size: number;
      base64: string;
    }>`
      select a.file_name, a.content_type, a.byte_size, encode(a.data, 'base64') as base64
      from studio_attachments a
      join studio_messages m on m.id = a.message_id
      where a.id = ${data.id}
    `;
    if (!rows[0]) throw new Error("Attachment not found");
    return rows[0];
  });

export const deleteStudioMessage = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      delete from studio_messages where id = ${data.id} and sender_id = ${context.userId}
      returning id
    `;
    if (!rows[0]) throw new Error("Message not found or you do not have permission to delete it.");
    return { ok: true as const };
  });

export const toggleStudioReaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { messageId: string; emoji: string }) => input)
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    if (!ALLOWED_STUDIO_REACTIONS.has(data.emoji)) throw new Error("Unsupported reaction.");
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      select id from studio_messages where id = ${data.messageId}
    `;
    if (!rows[0]) throw new Error("Message not found");
    const existing = await sql<{ message_id: string }>`
      delete from studio_message_reactions
      where message_id = ${data.messageId} and user_id = ${context.userId} and emoji = ${data.emoji}
      returning message_id
    `;
    if (!existing[0]) {
      await sql`
        insert into studio_message_reactions (message_id, user_id, emoji)
        values (${data.messageId}, ${context.userId}, ${data.emoji})
        on conflict do nothing
      `;
    }
    return { ok: true as const };
  });

export const heartbeatStudioPresence = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    await sql`
      insert into studio_presence (user_id, last_seen_at, online_until)
      values (${context.userId}, now(), now() + interval '90 seconds')
      on conflict (user_id) do update set last_seen_at = now(), online_until = now() + interval '90 seconds'
    `;
    return { ok: true as const };
  });

export const listOnlineStudioStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    return sql<{
      user_id: string;
      display_name: string | null;
      username: string | null;
      avatar_data_url: string | null;
    }>`
      select p.user_id, p.display_name, p.username,
        case when p.avatar_data is not null
          then 'data:' || p.avatar_content_type || ';base64,' || encode(p.avatar_data, 'base64')
          else null end as avatar_data_url
      from studio_presence s join profiles p on p.user_id = s.user_id
      where s.online_until > now() and p.role in ('staff', 'admin')
      order by p.display_name nulls last
    `;
  });

export const saveQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (
      input: QuoteInput & {
        title?: string;
        venue?: string;
        date?: string;
        clientName?: string;
        email?: string;
        phone?: string;
        message?: string;
      },
    ) => input,
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
      insert into quotes (
        id, user_id, job_id, event_type, guests, tier, venue_type, services, amount, breakdown, status
      )
      values (
        ${id},
        ${context.userId},
        ${jobId},
        ${data.eventType},
        ${data.guests},
        ${data.tier},
        ${data.venueType ?? "hall"},
        ${services},
        ${priced.amount},
        ${JSON.stringify(priced.lines)},
        ${"ready"}
      )
    `;
    return { quoteId: id, jobId, amount: priced.amount };
  });

function receiptNoFromInvoice(invoiceId: string, issuedAt: string | Date) {
  const date = typeof issuedAt === "string" ? new Date(issuedAt) : issuedAt;
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `RP-${ymd}-${invoiceId
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase()}`;
}

async function issueReceiptForInvoice(
  sql: Awaited<ReturnType<typeof getSql>>,
  invoice: InvoiceRow,
) {
  const receipts = await sql<ReceiptRow>`select * from receipts where invoice_id = ${invoice.id}`;
  if (receipts[0]) return receipts[0];

  const jobRows = await sql<JobRow>`select * from jobs where id = ${invoice.job_id}`;
  const job = jobRows[0];
  if (!job) throw new Error("Job not found for invoice");

  const quoteRows =
    await sql<QuoteRow>`select * from quotes where job_id = ${invoice.job_id} and user_id = ${invoice.user_id}`;
  const quote = quoteRows[0] ?? null;
  const issuedAt = invoice.paid_at ?? new Date().toISOString();
  const receiptNo = receiptNoFromInvoice(invoice.id, issuedAt);
  const receiptId = `rc_${crypto.randomUUID().slice(0, 12)}`;
  const offlinePaymentMethods: Record<string, string> = {
    offline_mpesa: "M-Pesa",
    offline_bank_transfer: "Bank transfer",
    offline_cash: "Cash",
  };
  const paymentMethod = invoice.provider
    ? offlinePaymentMethods[invoice.provider] ?? `${invoice.provider} online payment`
    : invoice.kind === "deposit"
      ? "Deposit transfer"
      : "Bank transfer";
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
    paymentMethod,
    provider: invoice.provider,
    providerReference: invoice.provider_reference,
    paidAt: invoice.paid_at,
    issuedBy: "system",
    quoteId: quote?.id ?? null,
  };
  const rows = await sql<ReceiptRow>`
    insert into receipts (
      id, receipt_no, invoice_id, quote_id, job_id, user_id, kind, amount, payment_method,
      payer_name, payer_email, payer_phone, issued_by, issued_at, status, provider,
      provider_reference, snapshot
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
      ${invoice.provider},
      ${invoice.provider_reference},
      ${JSON.stringify(snapshot)}
    )
    on conflict (invoice_id) do nothing
    returning *
  `;
  if (rows[0]) return rows[0];
  const existing = await sql<ReceiptRow>`select * from receipts where invoice_id = ${invoice.id}`;
  if (!existing[0]) throw new Error("The payment receipt could not be recorded.");
  return existing[0];
}

async function settlePaidInvoice(
  sql: Awaited<ReturnType<typeof getSql>>,
  invoiceId: string,
  userId: string,
  quoteId?: string,
) {
  const invoices =
    await sql<InvoiceRow>`select * from invoices where id = ${invoiceId} and user_id = ${userId}`;
  const invoice = invoices[0];
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "paid") return issueReceiptForInvoice(sql, invoice);

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

  const settled = await sql<InvoiceRow>`
    update invoices
    set status = 'paid',
        paid_at = now(),
        provider = ${providerConfirmation.provider},
        provider_reference = ${providerConfirmation.providerReference}
    where id = ${invoiceId} and user_id = ${userId} and status <> 'paid'
    returning *
  `;
  if (settled[0]) return issueReceiptForInvoice(sql, settled[0]);

  const refreshed =
    await sql<InvoiceRow>`select * from invoices where id = ${invoiceId} and user_id = ${userId}`;
  if (!refreshed[0]) throw new Error("Invoice not found");
  if (refreshed[0].status !== "paid")
    throw new Error("Payment confirmation could not be recorded.");
  return issueReceiptForInvoice(sql, refreshed[0]);
}

export const getMyQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const quotes =
      await sql<QuoteRow>`select * from quotes where id = ${data.id} and user_id = ${context.userId}`;
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
    const paymentPlan = quote.job_id
      ? await getLatestPaymentPlan(sql, quote.job_id)
      : { agreement: null, milestones: [] as PaymentMilestoneWithInvoiceRow[] };
    return {
      quote,
      contract: contracts[0] ?? null,
      invoices,
      receipts,
      job: jobs[0] ?? null,
      ...paymentPlan,
    };
  });

export const signContract = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { quoteId: string; signerName: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const quotes =
      await sql<QuoteRow>`select * from quotes where id = ${data.quoteId} and user_id = ${context.userId}`;
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
    if (isPreviewFixturesEnabled()) {
      throw new Error("Online payments are disabled in the fixture preview.");
    }
    const sql = await getSql();
    const quotes =
      await sql<QuoteRow>`select * from quotes where id = ${quoteId} and user_id = ${context.userId}`;
    const quote = quotes[0];
    if (!quote?.job_id) throw new Error("Quote not found");
    const invoices =
      await sql<InvoiceRow>`select * from invoices where job_id = ${quote.job_id} and user_id = ${context.userId} and kind = 'deposit'`;
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
    if (isPreviewFixturesEnabled()) {
      throw new Error("Online payments are disabled in the fixture preview.");
    }
    const sql = await getSql();
    const quotes =
      await sql<QuoteRow>`select * from quotes where id = ${data.quoteId} and user_id = ${context.userId}`;
    const quote = quotes[0];
    if (!quote?.job_id) throw new Error("Quote not found");
    const invoices =
      await sql<InvoiceRow>`select * from invoices where job_id = ${quote.job_id} and user_id = ${context.userId} and kind = 'balance'`;
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
    const jobs =
      await sql<JobRow>`select * from jobs where id = ${data.id} and owner_user_id = ${context.userId}`;
    const job = jobs[0];
    if (!job) return null;
    const invoices =
      await sql<InvoiceRow>`select * from invoices where job_id = ${data.id} and user_id = ${context.userId}`;
    const paymentReports = await sql<OfflinePaymentReportRow>`
      select r.* from offline_payment_reports r
      join invoices i on i.id = r.invoice_id
      where i.job_id = ${data.id} and r.user_id = ${context.userId}
      order by r.created_at desc
    `;
    const receipts =
      await sql<ReceiptRow>`select * from receipts where job_id = ${data.id} and user_id = ${context.userId} order by issued_at desc`;
    const drafts = await sql<DraftRow>`select * from drafts where job_id = ${data.id}`;
    const cues =
      await sql<CueRow>`select * from cues where job_id = ${data.id} order by sort_order`;
    const paymentPlan = await getLatestPaymentPlan(sql, data.id);
    return { job, invoices, receipts, drafts, cues, paymentReports, ...paymentPlan };
  });

export const listReceipts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    return sql<ReceiptRow>`select * from receipts order by issued_at desc`;
  });

export const listOfflinePaymentReports = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    return sql<OfflinePaymentReportRow>`
      select r.*, i.amount as invoice_amount, i.kind as invoice_kind,
        j.title as job_title, j.client_name,
        coalesce(p.display_name, u.name, u.email) as account_name
      from offline_payment_reports r
      join invoices i on i.id = r.invoice_id
      join jobs j on j.id = i.job_id
      join "user" u on u.id = r.user_id
      left join profiles p on p.user_id = r.user_id
      where r.status = 'pending_review'
        or (
          r.status = 'confirmed'
          and not exists (select 1 from receipts receipt where receipt.invoice_id = i.id)
        )
      order by case when r.status = 'pending_review' then 0 else 1 end, r.created_at asc
    `;
  });

export const reviewOfflinePaymentReport = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    reportId: string;
    decision: "confirm" | "reject";
    note?: string;
  }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    if (!data || typeof data.reportId !== "string" || !data.reportId.trim()) {
      throw new Error("Choose a payment report.");
    }
    if (!["confirm", "reject"].includes(data.decision)) {
      throw new Error("Choose whether to confirm or reject this payment report.");
    }
    if (data.note !== undefined && typeof data.note !== "string") {
      throw new Error("The review note must be text.");
    }
    const note = data.note?.trim() ?? "";
    if (data.decision === "reject" && !note) {
      throw new Error("Add a reason before rejecting a payment report.");
    }
    if (note.length > 1000) throw new Error("The review note must be 1,000 characters or fewer.");
    const sql = await getSql();

    if (data.decision === "reject") {
      const rejected = await sql<OfflinePaymentReportRow>`
        update offline_payment_reports
        set status = 'rejected',
            review_note = ${note},
            reviewed_by = ${context.userId},
            reviewed_at = now()
        where id = ${data.reportId} and status = 'pending_review'
        returning *
      `;
      if (!rejected[0]) throw new Error("This payment report is no longer awaiting review.");
      return { status: "rejected" as const, report: rejected[0], receipt: null };
    }

    const settled = await sql<InvoiceRow>`
      with candidate as materialized (
        select r.id, r.invoice_id, r.user_id, r.payment_method,
          r.transaction_reference, r.reported_amount
        from offline_payment_reports r
        where r.id = ${data.reportId} and r.status = 'pending_review'
        for update
      ),
      paid_invoice as (
        update invoices i
        set status = 'paid',
            paid_at = now(),
            provider = 'offline_' || candidate.payment_method,
            provider_reference = candidate.transaction_reference
        from candidate
        where i.id = candidate.invoice_id
          and i.user_id = candidate.user_id
          and i.status <> 'paid'
          and i.amount = candidate.reported_amount
        returning i.*
      ),
      reviewed_report as (
        update offline_payment_reports r
        set status = 'confirmed',
            review_note = ${note || null},
            reviewed_by = ${context.userId},
            reviewed_at = now()
        from candidate, paid_invoice
        where r.id = candidate.id
        returning r.id
      )
      select paid_invoice.* from paid_invoice
      join reviewed_report on true
    `;
    if (!settled[0]) {
      const confirmed = await sql<InvoiceRow>`
        select i.* from offline_payment_reports r
        join invoices i on i.id = r.invoice_id
        where r.id = ${data.reportId}
          and r.status = 'confirmed'
          and i.status = 'paid'
      `;
      if (confirmed[0]) {
        const receipt = await issueReceiptForInvoice(sql, confirmed[0]);
        return { status: "confirmed" as const, reportId: data.reportId, receipt };
      }
      throw new Error("The invoice was already paid or the reported amount does not match. The report remains unconfirmed.");
    }
    const receipt = await issueReceiptForInvoice(sql, settled[0]);
    return { status: "confirmed" as const, reportId: data.reportId, receipt };
  });

export const generateReceiptForInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { invoiceId: string }) => input)
  .handler(async ({ context, data }) => {
    await requireAdmin(context.userId);
    const sql = await getSql();
    const rows = await sql<InvoiceRow>`select * from invoices where id = ${data.invoiceId}`;
    const invoice = rows[0];
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status !== "paid") throw new Error("A receipt can only be issued for a confirmed paid invoice.");
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
    if (receipt.user_id !== context.userId && profile.role !== "admin") {
      return null;
    }
    return receipt;
  });

export const respondToDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    (input: {
      jobId: string;
      draftId: string;
      decision: "approved" | "changes_requested";
      feedback?: string;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    if (!data || !["approved", "changes_requested"].includes(data.decision)) {
      throw new Error("Choose approval or request changes.");
    }
    if (
      typeof data.jobId !== "string" ||
      !data.jobId.trim() ||
      typeof data.draftId !== "string" ||
      !data.draftId.trim()
    ) {
      throw new Error("Choose a project draft.");
    }
    if (data.feedback !== undefined && typeof data.feedback !== "string") {
      throw new Error("Feedback must be text.");
    }
    const feedback = data.feedback?.trim() ?? "";
    if (data.decision === "changes_requested" && !feedback) {
      throw new Error("Add a note describing the changes you need.");
    }
    if (feedback.length > 2_000) throw new Error("Feedback must be 2,000 characters or fewer.");
    const sql = await getSql();
    const jobs =
      await sql<JobRow>`select * from jobs where id = ${data.jobId} and owner_user_id = ${context.userId}`;
    if (!jobs[0]) throw new Error("Not found");
    const updated = await sql<{ id: string }>`
      update drafts
      set status = ${data.decision},
          client_feedback = ${data.decision === "changes_requested" ? feedback : null}
      where id = ${data.draftId} and job_id = ${data.jobId} and status <> 'approved'
      returning id
    `;
    if (!updated[0]) throw new Error("Draft not found or already approved.");
    return { ok: true as const };
  });

async function requireStaff(userId: string) {
  const profile = await ensureProfile(userId);
  if (!["staff", "admin"].includes(profile.role)) {
    const err = new Error("Forbidden");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return profile;
}

async function requireAdmin(userId: string) {
  const profile = await ensureProfile(userId);
  if (profile.role !== "admin") {
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
    const allowed = ["inquiry", "quoted", "booked", "production", "delivered", "cancelled"];
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
    if (!["pending", "active", "done"].includes(data.status)) {
      throw new Error("Cue status must be pending, active, or done.");
    }
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      update cues set status = ${data.status} where id = ${data.id} returning id
    `;
    if (!rows[0]) throw new Error("Run-sheet cue not found.");
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
    const apiKey = isPreviewFixturesEnabled() ? undefined : process.env.XAI_API_KEY;
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
    const apiKey = isPreviewFixturesEnabled() ? undefined : process.env.XAI_API_KEY;
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
