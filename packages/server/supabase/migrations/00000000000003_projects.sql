-- Projects: Project table and related functionality

-- ============================================================================
-- PROJECTS
-- ============================================================================

-- Table: project
create table public.project (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  title           text        not null,
  goal            text        not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes: projects
create index if not exists idx_project_user_id
  on public.project (user_id);

-- Triggers: auto-update updated_at rows
create trigger trg_project_updated_at
  before update on public.project
  for each row execute procedure public.set_updated_at();

-- Row-level security
alter table public.project enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.project to authenticated;

-- Project policies (users can only access their own projects)
create policy "Users can view their own projects"
  on public.project
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own projects"
  on public.project
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own projects"
  on public.project
  for update to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own projects"
  on public.project
  for delete to authenticated
  using ((select auth.uid()) = user_id);

