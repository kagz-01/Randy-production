-- Randy Production fresh-database schema baseline.
--
-- This is a snapshot of the current table and index structure, not the
-- incremental migration history. Bootstrap an EMPTY database with
-- `npm run db:bootstrap`; that command applies this file and then runs
-- migrations/*.sql to seed reference data and record each migration.
--
-- For an existing database, do NOT apply this snapshot. Use `npm run db:migrate`
-- so the ordered, data-preserving migration history is applied instead.
--
-- Keep this baseline aligned with migrations/0001_*.sql through 0016_*.sql.
-- It intentionally contains no fixture cleanup, historical receipt backfill,
-- or seeded knowledge content; the normal migrations apply those safely.

create table if not exists "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create table if not exists "session" (
  "id" text not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table if not exists "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null
);

create table if not exists "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create index if not exists "session_userId_idx" on "session" ("userId");
create index if not exists "account_userId_idx" on "account" ("userId");
create index if not exists "verification_identifier_idx" on "verification" ("identifier");

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  role text not null default 'client',
  created_at timestamptz not null default now(),
  username text,
  job_title text not null default '',
  team text not null default '',
  phone text not null default '',
  bio text not null default '',
  avatar_data bytea,
  avatar_content_type text
);

create unique index if not exists profiles_username_ci_unique_idx
  on profiles (lower(username))
  where username is not null;

create table if not exists jobs (
  id text primary key,
  owner_user_id text,
  title text not null,
  client_name text not null,
  service text not null,
  event_type text not null,
  guests integer not null default 100,
  tier text not null default 'floor',
  status text not null default 'inquiry',
  venue text,
  event_date date,
  ballpark integer not null default 0,
  notes text,
  is_showcase boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists jobs_owner_idx on jobs (owner_user_id);
create index if not exists jobs_status_idx on jobs (status);

create table if not exists quotes (
  id text primary key,
  user_id text not null,
  job_id text,
  event_type text not null,
  guests integer not null,
  tier text not null,
  venue_type text not null default 'hall'
    check (venue_type in ('studio', 'hall', 'garden', 'church', 'warehouse')),
  services text not null,
  amount integer not null,
  breakdown text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create index if not exists quotes_user_idx on quotes (user_id);

create table if not exists contracts (
  id text primary key,
  quote_id text not null,
  user_id text not null,
  signer_name text not null,
  signed_at timestamptz not null default now()
);

create table if not exists payment_agreements (
  id text primary key,
  job_id text not null references jobs(id) on delete cascade,
  owner_user_id text not null,
  created_by text not null,
  status text not null default 'pending_client'
    check (status in ('pending_client', 'changes_requested', 'accepted')),
  terms text not null default '',
  client_feedback text,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payment_agreements_job_idx
  on payment_agreements (job_id, created_at desc);

create table if not exists payment_milestones (
  id text primary key,
  agreement_id text not null references payment_agreements(id) on delete cascade,
  label text not null,
  amount integer not null check (amount > 0),
  due_date date,
  note text,
  sort_order integer not null default 0
);

create index if not exists payment_milestones_agreement_idx
  on payment_milestones (agreement_id, sort_order);

create table if not exists invoices (
  id text primary key,
  job_id text not null,
  user_id text not null,
  kind text not null,
  amount integer not null,
  status text not null default 'due',
  paid_at timestamptz,
  milestone_id text references payment_milestones(id),
  provider text,
  provider_reference text
);

create unique index if not exists invoices_milestone_idx
  on invoices (milestone_id)
  where milestone_id is not null;

create unique index if not exists invoices_provider_reference_idx
  on invoices (provider, provider_reference)
  where provider_reference is not null;

create table if not exists receipts (
  id text primary key,
  receipt_no text not null unique,
  invoice_id text not null unique,
  quote_id text,
  job_id text not null,
  user_id text not null,
  kind text not null,
  amount integer not null,
  payment_method text not null,
  payer_name text not null,
  payer_email text,
  payer_phone text,
  issued_by text not null,
  issued_at timestamptz not null default now(),
  status text not null default 'issued',
  snapshot text not null,
  provider text,
  provider_reference text
);

create index if not exists receipts_user_idx on receipts (user_id, issued_at desc);
create index if not exists receipts_job_idx on receipts (job_id, issued_at desc);

create table if not exists offline_payment_reports (
  id text primary key,
  invoice_id text not null references invoices(id) on delete cascade,
  user_id text not null,
  payment_method text not null check (payment_method in ('mpesa', 'bank_transfer', 'cash')),
  transaction_reference text not null,
  reported_amount integer not null check (reported_amount > 0),
  payment_date date not null,
  client_note text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed', 'rejected')),
  review_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists offline_payment_reports_reference_idx
  on offline_payment_reports (lower(transaction_reference));

create unique index if not exists offline_payment_reports_pending_invoice_idx
  on offline_payment_reports (invoice_id)
  where status = 'pending_review';

create unique index if not exists offline_payment_reports_confirmed_invoice_idx
  on offline_payment_reports (invoice_id)
  where status = 'confirmed';

create index if not exists offline_payment_reports_review_idx
  on offline_payment_reports (status, created_at desc);

create table if not exists drafts (
  id text primary key,
  job_id text not null,
  title text not null,
  kind text not null,
  status text not null default 'review',
  note text,
  client_feedback text
);

create table if not exists inventory (
  id text primary key,
  name text not null,
  category text not null,
  qty integer not null,
  available integer not null,
  condition text not null default 'ready',
  next_service date
);

create table if not exists crew (
  id text primary key,
  name text not null,
  role text not null,
  call_time text,
  assigned_job_id text,
  status text not null default 'standby'
);

create table if not exists vendors (
  id text primary key,
  name text not null,
  specialty text not null,
  city text not null,
  lead_days integer not null default 7,
  rating numeric not null default 4.8
);

create table if not exists cues (
  id text primary key,
  job_id text not null,
  starts_at text not null,
  title text not null,
  owner text not null,
  kind text not null,
  status text not null default 'pending',
  sort_order integer not null default 0
);

create table if not exists testimonials (
  id text primary key,
  job_id text,
  author text not null,
  company text,
  body text not null,
  requested boolean not null default false,
  captured_at timestamptz
);

create table if not exists mood_matches (
  id text primary key,
  user_id text not null,
  summary text not null,
  package_id text not null,
  rationale text not null,
  created_at timestamptz not null default now()
);

create table if not exists team_invites (
  id text primary key,
  email text not null unique,
  name text not null,
  role text not null,
  team text not null,
  status text not null default 'Invite sent',
  invited_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  token_hash text,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index if not exists team_invites_status_idx on team_invites (status);
create index if not exists team_invites_email_idx on team_invites (email);

create table if not exists studio_channels (
  id text primary key,
  title text not null,
  job_id text references jobs(id) on delete cascade,
  created_by text,
  created_at timestamptz not null default now()
);

create unique index if not exists studio_channels_general_idx
  on studio_channels ((job_id is null))
  where job_id is null;

create unique index if not exists studio_channels_job_idx
  on studio_channels (job_id)
  where job_id is not null;

create table if not exists studio_messages (
  id text primary key,
  channel_id text not null references studio_channels(id) on delete cascade,
  sender_id text not null,
  body text not null,
  reply_to_id text references studio_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index if not exists studio_messages_channel_created_idx
  on studio_messages (channel_id, created_at desc);

create table if not exists studio_attachments (
  id text primary key,
  message_id text not null unique references studio_messages(id) on delete cascade,
  file_name text not null,
  content_type text not null,
  byte_size integer not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists studio_message_reactions (
  message_id text not null references studio_messages(id) on delete cascade,
  user_id text not null,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table if not exists studio_presence (
  user_id text primary key,
  last_seen_at timestamptz not null default now(),
  online_until timestamptz not null
);

create index if not exists studio_presence_online_until_idx
  on studio_presence (online_until);

create table if not exists knowledge_entries (
  id text primary key,
  title text not null,
  content text not null,
  tags text not null default '',
  source_name text not null,
  source_url text,
  source_published_at date,
  source_checked_at date not null default current_date,
  jurisdiction text not null default 'Kenya',
  evidence_type text not null check (
    evidence_type in (
      'official_guidance',
      'practice_reference',
      'company_practice',
      'project_learning',
      'vendor_learning',
      'legislation'
    )
  ),
  visibility text not null default 'internal' check (visibility in ('internal', 'public')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'archived')),
  created_by text,
  anonymized_by text,
  anonymized_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  legal_reviewed_by text,
  legal_reviewed_at timestamptz,
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(tags, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(content, '')), 'B')
  ) stored,
  check (
    visibility != 'public'
    or source_url is not null
    or evidence_type in ('company_practice', 'project_learning', 'vendor_learning')
  )
);

create index if not exists knowledge_entries_public_idx
  on knowledge_entries (status, visibility, source_checked_at desc);

create index if not exists knowledge_entries_updated_idx
  on knowledge_entries (updated_at desc);

create index if not exists knowledge_entries_search_idx
  on knowledge_entries using gin (search_vector);

create table if not exists knowledge_ai_usage (
  subject_hash text not null,
  bucket_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 5),
  primary key (subject_hash, bucket_started_at)
);

create index if not exists knowledge_ai_usage_bucket_idx
  on knowledge_ai_usage (bucket_started_at);
