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

alter table invoices
  add column if not exists milestone_id text references payment_milestones(id);
create unique index if not exists invoices_milestone_idx
  on invoices (milestone_id)
  where milestone_id is not null;
