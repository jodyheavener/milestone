-- Tasks: Task table and related functionality

-- ============================================================================
-- TASKS
-- ============================================================================

-- Table: task
create table public.task (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references public.project(id) on delete cascade,
  description     text        not null,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes: tasks
create index if not exists idx_task_project_id
  on public.task (project_id);

create index if not exists idx_task_completed_at
  on public.task (completed_at);

-- Triggers: auto-update updated_at rows
create trigger trg_task_updated_at
  before update on public.task
  for each row execute procedure public.set_updated_at();

-- Row-level security
alter table public.task enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.task to authenticated;

-- Task policies (users can only access tasks for their own projects)
create policy "Users can view tasks for their own projects"
  on public.task
  for select to authenticated
  using (
    exists (
      select 1 from public.project p 
      where p.id = task.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can create tasks for their own projects"
  on public.task
  for insert to authenticated
  with check (
    exists (
      select 1 from public.project p 
      where p.id = task.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can update tasks for their own projects"
  on public.task
  for update to authenticated
  using (
    exists (
      select 1 from public.project p 
      where p.id = task.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can delete tasks for their own projects"
  on public.task
  for delete to authenticated
  using (
    exists (
      select 1 from public.project p 
      where p.id = task.project_id and p.user_id = (select auth.uid())
    )
  );

