-- RepoFuse Pro identity only.
-- Do not add borrower, vehicle, notice, checklist, photo, or inventory tables.
-- The lot file stays in the browser (localStorage for preferences, IndexedDB for records).

create table if not exists public.licenses (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro')),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dealership_name text not null default '',
  state_code text not null default '',
  operator_role text not null default 'specialist' check (operator_role in ('specialist', 'manager')),
  updated_at timestamptz not null default now()
);

alter table public.workspace_settings
  add column if not exists operator_role text not null default 'specialist';

alter table public.workspace_settings alter column operator_role set default 'specialist';
alter table public.workspace_settings drop constraint if exists workspace_settings_operator_role_check;
update public.workspace_settings
  set operator_role = 'specialist'
  where operator_role is distinct from 'manager';
alter table public.workspace_settings
  add constraint workspace_settings_operator_role_check
  check (operator_role in ('specialist', 'manager'));

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  role text not null check (role in ('specialist', 'manager')),
  created_at timestamptz not null default now(),
  unique (owner_user_id, email)
);

alter table public.team_members drop constraint if exists team_members_role_check;
update public.team_members
  set role = 'specialist'
  where role is distinct from 'manager';
alter table public.team_members
  add constraint team_members_role_check
  check (role in ('specialist', 'manager'));

alter table public.licenses enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "read own license" on public.licenses;
drop policy if exists "read own workspace settings" on public.workspace_settings;
drop policy if exists "insert own workspace settings" on public.workspace_settings;
drop policy if exists "update own workspace settings" on public.workspace_settings;
drop policy if exists "owner reads team" on public.team_members;
drop policy if exists "pro owner inserts team" on public.team_members;
drop policy if exists "owner deletes team" on public.team_members;

create policy "read own license"
  on public.licenses
  for select
  using (auth.uid() = user_id);

create policy "read own workspace settings"
  on public.workspace_settings
  for select
  using (auth.uid() = user_id);

create policy "insert own workspace settings"
  on public.workspace_settings
  for insert
  with check (auth.uid() = user_id);

create policy "update own workspace settings"
  on public.workspace_settings
  for update
  using (auth.uid() = user_id);

create policy "owner reads team"
  on public.team_members
  for select
  using (
    auth.uid() = owner_user_id
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "pro owner inserts team"
  on public.team_members
  for insert
  with check (
    auth.uid() = owner_user_id
    and exists (
      select 1 from public.licenses
      where user_id = auth.uid() and tier = 'pro'
    )
  );

create policy "owner deletes team"
  on public.team_members
  for delete
  using (auth.uid() = owner_user_id);
