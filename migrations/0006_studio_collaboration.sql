alter table team_invites
  add column if not exists token_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists revoked_at timestamptz;

create table if not exists studio_channels (
  id text primary key,
  title text not null,
  job_id text references jobs(id) on delete cascade,
  created_by text,
  created_at timestamptz not null default now()
);

create unique index if not exists studio_channels_general_idx
  on studio_channels ((job_id is null)) where job_id is null;
create unique index if not exists studio_channels_job_idx
  on studio_channels (job_id) where job_id is not null;

insert into studio_channels (id, title, job_id)
values ('general', 'Studio floor', null)
on conflict do nothing;

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
