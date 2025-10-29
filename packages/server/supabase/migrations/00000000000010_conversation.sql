-- Conversation: conversation table and related functionality

-- Table: conversation
create table public.conversation (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null
                  references public.project(id) on delete cascade,
  title           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Indexes: conversations
create index if not exists idx_conversation_project_id
  on public.conversation (project_id);

-- Triggers: auto-update updated_at rows
create trigger trg_conversation_updated_at
  before update on public.conversation
  for each row execute procedure public.set_updated_at();

-- Row-level security
alter table public.conversation enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.conversation to authenticated;

-- Conversation policies (users can only access conversations for their own projects)
create policy "Users can view conversations for their own projects"
  on public.conversation
  for select to authenticated
  using (
    exists (
      select 1 from public.project p 
      where p.id = conversation.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can create conversations for their own projects"
  on public.conversation
  for insert to authenticated
  with check (
    exists (
      select 1 from public.project p 
      where p.id = conversation.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can update conversations for their own projects"
  on public.conversation
  for update to authenticated
  using (
    exists (
      select 1 from public.project p 
      where p.id = conversation.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can delete conversations for their own projects"
  on public.conversation
  for delete to authenticated
  using (
    exists (
      select 1 from public.project p 
      where p.id = conversation.project_id and p.user_id = (select auth.uid())
    )
  );
