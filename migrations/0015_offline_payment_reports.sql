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
