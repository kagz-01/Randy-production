alter table invoices
  add column if not exists provider text,
  add column if not exists provider_reference text;

alter table receipts
  add column if not exists provider text,
  add column if not exists provider_reference text;

create unique index if not exists invoices_provider_reference_idx
  on invoices (provider, provider_reference)
  where provider_reference is not null;
