create table if not exists profiles (
  user_id text primary key,
  display_name text,
  role text not null default 'client',
  created_at timestamptz not null default now()
);

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

create table if not exists invoices (
  id text primary key,
  job_id text not null,
  user_id text not null,
  kind text not null,
  amount integer not null,
  status text not null default 'due',
  paid_at timestamptz
);

create table if not exists drafts (
  id text primary key,
  job_id text not null,
  title text not null,
  kind text not null,
  status text not null default 'review',
  note text
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
