-- Conversation Entry: conversation_entry table and related functionality

-- Table: conversation_entry
create table public.conversation_entry (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null
                  references public.conversation(id) on delete cascade,
  role            text        not null,
  content         text        not null,
  content_tsv     tsvector,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  
  constraint conversation_entry_role_check check (role in ('user', 'assistant', 'system'))
);

-- Indexes: conversation entries
create index if not exists idx_conversationentry_conversation_id
  on public.conversation_entry (conversation_id);

create index if not exists idx_conversationentry_content_tsv
  on public.conversation_entry using GIN (content_tsv);

-- Function: Update TSV for conversation entry content
create or replace function public.update_conversation_entry_content_tsv()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  NEW.content_tsv := to_tsvector('english', extensions.unaccent(COALESCE(NEW.content, '')));
  return NEW;
end;
$$;

-- Trigger: TSV update for conversation entry content
create trigger trg_conversation_entry_content_tsv
  before insert or update on public.conversation_entry
  for each row execute function public.update_conversation_entry_content_tsv();

-- Row-level security
alter table public.conversation_entry enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.conversation_entry to authenticated;

-- Conversation entry policies (users can only access entries for their own conversations)
create policy "Users can view conversation entries for their own conversations"
  on public.conversation_entry
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation c
      join public.project p on p.id = c.project_id
      where c.id = conversation_entry.conversation_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can create conversation entries for own conversations"
  on public.conversation_entry
  for insert to authenticated
  with check (
    exists (
      select 1 from public.conversation c
      join public.project p on p.id = c.project_id
      where c.id = conversation_entry.conversation_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can update conversation entries for own conversations"
  on public.conversation_entry
  for update to authenticated
  using (
    exists (
      select 1 from public.conversation c
      join public.project p on p.id = c.project_id
      where c.id = conversation_entry.conversation_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can delete conversation entries for own conversations"
  on public.conversation_entry
  for delete to authenticated
  using (
    exists (
      select 1 from public.conversation c
      join public.project p on p.id = c.project_id
      where c.id = conversation_entry.conversation_id and p.user_id = (select auth.uid())
    )
  );
