create table if not exists team_invites (
  id text primary key,
  email text not null unique,
  name text not null,
  role text not null,
  team text not null,
  status text not null default 'Invite sent',
  invited_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_invites_status_idx on team_invites (status);
create index if not exists team_invites_email_idx on team_invites (email);
