alter table quotes
  add column if not exists venue_type text not null default 'hall'
  check (venue_type in ('studio', 'hall', 'garden', 'church', 'warehouse'));
