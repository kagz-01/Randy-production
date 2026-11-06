alter table profiles
  add column if not exists username text,
  add column if not exists job_title text not null default '',
  add column if not exists team text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists avatar_data bytea,
  add column if not exists avatar_content_type text;

create unique index if not exists profiles_username_ci_unique_idx
  on profiles (lower(username))
  where username is not null;
