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
  snapshot text not null
);

create index if not exists receipts_user_idx on receipts (user_id, issued_at desc);
create index if not exists receipts_job_idx on receipts (job_id, issued_at desc);

insert into receipts (
  id,
  receipt_no,
  invoice_id,
  quote_id,
  job_id,
  user_id,
  kind,
  amount,
  payment_method,
  payer_name,
  payer_email,
  payer_phone,
  issued_by,
  issued_at,
  status,
  snapshot
)
select
  'rc_' || substr(md5(i.id), 1, 12),
  'RP-' || to_char(coalesce(i.paid_at, now()), 'YYYYMMDD') || '-' || upper(substr(md5(i.id), 1, 8)),
  i.id,
  q.id,
  i.job_id,
  i.user_id,
  i.kind,
  i.amount,
  case when i.kind = 'deposit' then 'Deposit transfer' else 'Bank transfer' end,
  j.client_name,
  null,
  null,
  'system',
  coalesce(i.paid_at, now()),
  'issued',
  jsonb_build_object(
    'receiptNo', 'RP-' || to_char(coalesce(i.paid_at, now()), 'YYYYMMDD') || '-' || upper(substr(md5(i.id), 1, 8)),
    'jobTitle', j.title,
    'clientName', j.client_name,
    'venue', j.venue,
    'eventDate', j.event_date,
    'eventType', j.event_type,
    'guests', j.guests,
    'tier', j.tier,
    'invoiceKind', i.kind,
    'amount', i.amount,
    'paymentMethod', case when i.kind = 'deposit' then 'Deposit transfer' else 'Bank transfer' end,
    'paidAt', i.paid_at,
    'issuedBy', 'system'
  )::text
from invoices i
join jobs j on j.id = i.job_id
left join quotes q on q.job_id = i.job_id and q.user_id = i.user_id
where i.status = 'paid'
on conflict (invoice_id) do nothing;