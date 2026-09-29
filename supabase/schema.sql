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
  updated_at timestamptz not null default now()
);

alter table public.licenses enable row level security;
alter table public.workspace_settings enable row level security;

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
