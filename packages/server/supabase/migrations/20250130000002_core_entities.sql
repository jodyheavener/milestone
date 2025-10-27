-- Core Entities: user, employer
-- These form the foundation of the milestone system

-- Table: employer
create table public.employer (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  description     text,
  website         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Table: user
create table public.user (
  id              uuid        primary key default gen_random_uuid(),
  name            text        not null,
  job_title       text,
  employer_id     uuid        references public.employer(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes: core entities
create index if not exists idx_user_employer_id
  on public.user (employer_id);

-- Triggers: auto-update updated_at rows
create trigger trg_employer_updated_at
  before update on public.employer
  for each row execute procedure public.set_updated_at();

create trigger trg_user_updated_at
  before update on public.user
  for each row execute procedure public.set_updated_at();

-- Row-level security
alter table public.employer enable row level security;
alter table public.user enable row level security;

-- Grant basic permissions
grant select on public.employer to anon, authenticated;
grant select, insert, update, delete on public.user to authenticated;

-- Employer policies (public read)
create policy "Anyone can view employers"
  on public.employer
  for select to public
  using (true);

create policy "Authenticated users can create employers"
  on public.employer
  for insert to authenticated
  with check (true);

create policy "Authenticated users can update employers"
  on public.employer
  for update to authenticated
  using (true);

-- User policies (users can only access their own data)
create policy "Users can view their own profile"
  on public.user
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can create their own profile"
  on public.user
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.user
  for update to authenticated
  using ((select auth.uid()) = id);
