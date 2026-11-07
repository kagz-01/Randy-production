import type { Sql } from "./db";

export type PreviewRole = "admin" | "staff" | "client";

export function getPreviewRole(value = process.env.RANDY_PREVIEW_ROLE): PreviewRole {
  if (value === "staff" || value === "client" || value === "admin") return value;
  return "admin";
}

export async function seedPreviewFixtures(sql: Sql): Promise<void> {
  await sql`
    insert into "user" ("id", "name", "email", "emailVerified")
    values
      ('dev-user', 'Preview Team Member', 'preview.team@example.invalid', true),
      ('preview-client', 'Preview Client', 'preview.client@example.invalid', true)
    on conflict ("id") do nothing
  `;
  await sql`
    insert into profiles (user_id, display_name, role, username, job_title, team)
    values
      ('dev-user', 'Preview Team Member', 'admin', 'preview-team', 'Studio Lead', 'Production'),
      ('preview-client', 'Preview Client', 'client', 'preview-client', 'Client', '')
    on conflict (user_id) do nothing
  `;
  await sql`
    insert into jobs (
      id, owner_user_id, title, client_name, service, event_type, guests, tier, status,
      venue, event_date, ballpark, notes, is_showcase
    )
    values
      (
        'preview-job-live', 'dev-user', 'Preview: Brand Summit', 'Preview Client',
        'brand', 'Corporate summit', 280, 'signature', 'production',
        'Nairobi Preview Venue', current_date + 3, 780000,
        'Synthetic fixture for Studio and Admin review.', true
      ),
      (
        'preview-job-booked', 'dev-user', 'Preview: Wedding Showcase', 'Preview Client',
        'decor', 'Wedding', 160, 'signature', 'booked',
        'Garden Preview Venue', current_date + 18, 540000,
        'Synthetic fixture for schedule and client portal review.', true
      ),
      (
        'preview-job-inquiry', 'dev-user', 'Preview: Product Launch', 'Preview Client',
        'stage', 'Product launch', 220, 'floor', 'inquiry',
        'Central Preview Hall', current_date + 32, 365000,
        'Synthetic fixture for inquiry and quote workflows.', false
      ),
      (
        'preview-job-delivered', 'dev-user', 'Preview: Annual Gala', 'Preview Client',
        'sound', 'Annual gala', 340, 'signature', 'delivered',
        'Riverside Preview Hall', current_date - 21, 920000,
        'Synthetic fixture for closeout and showcase review.', true
      )
    on conflict (id) do nothing
  `;
  await sql`
    insert into payment_agreements (
      id, job_id, owner_user_id, created_by, status, terms, accepted_at
    )
    values (
      'preview-agreement', 'preview-job-booked', 'dev-user', 'dev-user',
      'accepted', 'Synthetic preview agreement: two staged payments.', now()
    )
    on conflict (id) do nothing
  `;
  await sql`
    insert into payment_milestones (id, agreement_id, label, amount, due_date, note, sort_order)
    values
      (
        'preview-milestone-deposit', 'preview-agreement', 'Booking deposit', 162000,
        current_date + 2, 'Synthetic fixture; no real payment is enabled.', 1
      ),
      (
        'preview-milestone-balance', 'preview-agreement', 'Production balance', 378000,
        current_date + 16, 'Synthetic fixture; no real payment is enabled.', 2
      )
    on conflict (id) do nothing
  `;
  await sql`
    insert into invoices (
      id, job_id, user_id, kind, amount, status, milestone_id, paid_at, provider, provider_reference
    )
    values
      (
        'preview-invoice-milestone', 'preview-job-booked', 'dev-user',
        'Booking deposit', 162000, 'due', 'preview-milestone-deposit', null, null, null
      ),
      (
        'preview-invoice-offline', 'preview-job-live', 'dev-user',
        'Production balance', 115000, 'due', null, null, null, null
      ),
      (
        'preview-invoice-paid', 'preview-job-delivered', 'dev-user',
        'Final balance', 920000, 'paid', null, now(), 'preview', 'PREVIEW-REFERENCE-0001'
      )
    on conflict (id) do nothing
  `;
  await sql`
    insert into receipts (
      id, receipt_no, invoice_id, job_id, user_id, kind, amount, payment_method,
      payer_name, payer_email, issued_by, status, snapshot, provider, provider_reference
    )
    values (
      'preview-receipt', 'PREVIEW-0001', 'preview-invoice-paid', 'preview-job-delivered',
      'dev-user', 'Final balance', 920000, 'bank_transfer', 'Preview Client',
      'preview.client@example.invalid', 'dev-user', 'issued',
      json_build_object(
        'paymentMethod', 'bank_transfer',
        'receiptNo', 'PREVIEW-0001',
        'payerName', 'Preview Client',
        'amount', 920000,
        'jobTitle', 'Preview: Annual Gala',
        'eventType', 'gala',
        'venue', 'Riverside Preview Hall',
        'eventDate', (current_date - 21)::text
      )::text,
      'preview', 'PREVIEW-REFERENCE-0001'
    )
    on conflict (id) do nothing
  `;
  await sql`
    insert into offline_payment_reports (
      id, invoice_id, user_id, payment_method, transaction_reference,
      reported_amount, payment_date, client_note
    )
    values (
      'preview-offline-report', 'preview-invoice-offline', 'dev-user', 'bank_transfer',
      'PREVIEW-TRANSFER-0001', 115000, current_date,
      'Synthetic report for the Admin verification workflow.'
    )
    on conflict (id) do nothing
  `;
  await sql`
    insert into cues (id, job_id, starts_at, title, owner, kind, status, sort_order)
    values
      (
        'preview-cue-doors', 'preview-job-live', '18:00', 'Doors and guest arrival',
        'Preview Crew Lead', 'show', 'ready', 1
      ),
      (
        'preview-cue-keynote', 'preview-job-live', '19:15', 'Keynote walk-on',
        'Preview Stage Manager', 'show', 'pending', 2
      ),
      (
        'preview-cue-soundcheck', 'preview-job-booked', '15:30', 'Sound check',
        'Preview Audio Lead', 'production', 'pending', 1
      )
    on conflict (id) do nothing
  `;
  await sql`
    insert into drafts (id, job_id, title, kind, status, note)
    values
      (
        'preview-draft-run-sheet', 'preview-job-live', 'Summit run of show',
        'run_sheet', 'review', 'Synthetic draft for the Studio review queue.'
      ),
      (
        'preview-draft-floor-plan', 'preview-job-booked', 'Garden floor plan',
        'floor_plan', 'client_review', 'Synthetic draft for the Client Portal.'
      )
    on conflict (id) do nothing
  `;
  await sql`
    insert into inventory (id, name, category, qty, available, condition, next_service)
    values
      ('preview-gear-pa', 'Preview line-array PA', 'Audio', 4, 3, 'ready', current_date + 45),
      ('preview-gear-lights', 'Preview LED wash fixture', 'Lighting', 24, 18, 'service', current_date + 2),
      ('preview-gear-stage', 'Preview modular stage deck', 'Stage', 32, 20, 'ready', current_date + 60)
    on conflict (id) do nothing
  `;
  await sql`
    insert into crew (id, name, role, call_time, assigned_job_id, status)
    values
      ('preview-crew-lead', 'Preview Crew Lead', 'Production Manager', '14:00', 'preview-job-live', 'on-site'),
      ('preview-crew-audio', 'Preview Audio Lead', 'Audio Engineer', '15:00', 'preview-job-live', 'called'),
      ('preview-crew-stage', 'Preview Stage Manager', 'Stage Manager', '13:00', 'preview-job-booked', 'standby')
    on conflict (id) do nothing
  `;
  await sql`
    insert into vendors (id, name, specialty, city, lead_days, rating)
    values
      ('preview-vendor-lighting', 'Preview Lighting Co.', 'Lighting', 'Nairobi', 5, 4.8),
      ('preview-vendor-tents', 'Preview Tent Hire', 'Structures', 'Nairobi', 7, 4.6),
      ('preview-vendor-print', 'Preview Print Studio', 'Branding', 'Nairobi', 3, 4.9)
    on conflict (id) do nothing
  `;
  await sql`
    insert into testimonials (id, job_id, author, company, body, requested, captured_at)
    values
      (
        'preview-testimonial', 'preview-job-delivered', 'Preview Client', 'Preview Company',
        'Synthetic feedback for testing the testimonial review interface.', true, now()
      )
    on conflict (id) do nothing
  `;
  await sql`
    insert into team_invites (id, email, name, role, team, status, invited_by, expires_at)
    values (
      'preview-invite', 'preview.colleague@example.invalid', 'Preview Colleague',
      'staff', 'Production', 'Waiting on docs', 'dev-user', now() + interval '6 days'
    )
    on conflict (id) do nothing
  `;
  await sql`
    insert into studio_messages (id, channel_id, sender_id, body)
    values
      (
        'preview-message-1', 'general', 'dev-user',
        'Preview workspace is ready. This conversation is synthetic and resets with the server.'
      ),
      (
        'preview-message-2', 'general', 'preview-client',
        'The sample schedule and floor plan are ready for review.'
      )
    on conflict (id) do nothing
  `;
  await sql`
    insert into studio_presence (user_id, online_until)
    values ('dev-user', now() + interval '10 minutes')
    on conflict (user_id) do update set online_until = excluded.online_until
  `;
}
