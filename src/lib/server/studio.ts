import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { priceQuote, type QuoteInput } from "@/lib/pricing";
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

export type ProfileRow = {
  user_id: string;
  display_name: string | null;
  role: string;
};

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
  return {
    delivered: 247 + (delivered[0]?.n ?? 0),
    live: live[0]?.n ?? 1,
    soundHours: 1200,
    campaigns: 40,
  };
});

export const listShowcaseJobs = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return sql<JobRow>`select * from jobs where is_showcase = true order by event_date desc nulls last`;
});

export const getJobPublic = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const sql = await getSql();
    const jobs = await sql<JobRow>`select * from jobs where id = ${data.id}`;
    const job = jobs[0];
    if (!job) return null;
    const cues = await sql<CueRow>`select * from cues where job_id = ${data.id} order by sort_order`;
    const drafts = await sql<DraftRow>`select * from drafts where job_id = ${data.id}`;
    return { job, cues, drafts };
  });

export const listInventory = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return sql<InventoryRow>`select * from inventory order by category, name`;
});

export const listCrew = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return sql<CrewRow>`select * from crew order by name`;
});

export const listVendors = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return sql<VendorRow>`select * from vendors order by rating desc`;
});

export const listPipeline = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return sql<JobRow>`select * from jobs order by created_at desc`;
});

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    return ensureProfile(context.userId);
  });

export const joinStudio = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureProfile(context.userId);
    await sql`update profiles set role = 'staff' where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const saveQuote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: QuoteInput & { title?: string; venue?: string; date?: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureProfile(context.userId);
    const priced = priceQuote(data);
    const id = `q_${crypto.randomUUID()}`;
    const jobId = `job_${crypto.randomUUID().slice(0, 8)}`;
    const services = data.services.join(",");
    await sql`
      insert into jobs (id, owner_user_id, title, client_name, service, event_type, guests, tier, status, venue, event_date, ballpark, notes, is_showcase)
      values (
        ${jobId},
        ${context.userId},
        ${data.title || "Untitled booking"},
        ${"You"},
        ${data.services[0] ?? "stage"},
        ${data.eventType},
        ${data.guests},
        ${data.tier},
        ${"quoted"},
        ${data.venue || null},
        ${data.date || null},
        ${priced.amount},
        ${"Locked from the quote builder."},
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
    const jobs = quote.job_id
      ? await sql<JobRow>`select * from jobs where id = ${quote.job_id} and owner_user_id = ${context.userId}`
      : [];
    return { quote, contract: contracts[0] ?? null, invoices, job: jobs[0] ?? null };
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
    await sql`
      update invoices
      set status = 'paid', paid_at = now()
      where job_id = ${quote.job_id} and user_id = ${context.userId} and kind = 'deposit'
    `;
    await sql`update quotes set status = 'confirmed' where id = ${quoteId} and user_id = ${context.userId}`;
    await sql`update jobs set status = 'booked' where id = ${quote.job_id} and owner_user_id = ${context.userId}`;
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
    const drafts = await sql<DraftRow>`select * from drafts where job_id = ${data.id}`;
    const cues = await sql<CueRow>`select * from cues where job_id = ${data.id} order by sort_order`;
    return { job, invoices, drafts, cues };
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
        values (${`tm_${data.id}`}, ${data.id}, ${"Client"}, ${null}, ${""}, ${true})
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

export const listTestimonials = createServerFn({ method: "GET" }).handler(async () => {
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
              "You are the studio lead at Randy Production. Match a client mood to ONE package: pkg_signal_sound, pkg_floor_stage, pkg_black_gala, pkg_look_decor, pkg_brand_drop. Reply JSON only: {packageId, summary, rationale}. Tone: sharp, no fluff, no mission statements.",
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
  .handler(async ({ data }) => {
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
