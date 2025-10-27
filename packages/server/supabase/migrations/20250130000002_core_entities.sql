-- Core Entities: profile, employer
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

-- Table: profile
create table public.profile (
  id              uuid        primary key references auth.users(id) on delete cascade,
  name            text        not null,
  job_title       text,
  employer_id     uuid        references public.employer(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes: core entities
create index if not exists idx_profile_employer_id
  on public.profile (employer_id);

-- Triggers: auto-update updated_at rows
create trigger trg_employer_updated_at
  before update on public.employer
  for each row execute procedure public.set_updated_at();

create trigger trg_profile_updated_at
  before update on public.profile
  for each row execute procedure public.set_updated_at();

-- Function: Handle new user signup - create profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  -- Get name from user metadata if available
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
  
  insert into public.profile (id, name)
  values (NEW.id, v_name);
  return NEW;
end;
$$;

-- Trigger: Create profile on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row-level security
alter table public.employer enable row level security;
alter table public.profile enable row level security;

-- Grant basic permissions
grant select on public.employer to anon, authenticated;
grant select, insert, update, delete on public.profile to authenticated;

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

-- Profile policies (users can only access their own data)
create policy "Users can view their own profile"
  on public.profile
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profile
  for update to authenticated
  using ((select auth.uid()) = id);
