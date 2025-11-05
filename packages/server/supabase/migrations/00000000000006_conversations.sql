-- Conversations: Conversations, conversation entries, and conversation-specific AI functionality

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================

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

-- ============================================================================
-- CONVERSATION ENTRIES
-- ============================================================================

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

-- ============================================================================
-- CONVERSATION-SPECIFIC AI FUNCTIONALITY
-- ============================================================================

-- Table: conversation_entry_embedding
create table public.conversation_entry_embedding (
  id                      uuid        primary key default gen_random_uuid(),
  conversation_entry_id   uuid        not null
                          references public.conversation_entry(id) on delete cascade,
  project_id              uuid        not null
                          references public.project(id) on delete cascade,
  embedding               vector(1536), -- Default OpenAI embedding dimension
  model                   text        not null,
  created_at              timestamptz not null default now()
);

-- Indexes: conversation entry embeddings
create index if not exists idx_cee_conversation_entry_id
  on public.conversation_entry_embedding (conversation_entry_id);

create index if not exists idx_cee_project_id
  on public.conversation_entry_embedding (project_id);

create index if not exists ivfflat_cee_embedding
  on public.conversation_entry_embedding using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Row-level security
alter table public.conversation_entry_embedding enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.conversation_entry_embedding to authenticated;

-- Conversation entry embedding policies (users can only access embeddings for their own conversations)
create policy "Users can view conversation entry embeddings"
  on public.conversation_entry_embedding
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_entry ce
      join public.conversation c on c.id = ce.conversation_id
      join public.project p on p.id = c.project_id
      where ce.id = conversation_entry_embedding.conversation_entry_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can create conversation entry embeddings"
  on public.conversation_entry_embedding
  for insert to authenticated
  with check (
    exists (
      select 1 from public.conversation_entry ce
      join public.conversation c on c.id = ce.conversation_id
      join public.project p on p.id = c.project_id
      where ce.id = conversation_entry_embedding.conversation_entry_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can delete conversation entry embeddings"
  on public.conversation_entry_embedding
  for delete to authenticated
  using (
    exists (
      select 1 from public.conversation_entry ce
      join public.conversation c on c.id = ce.conversation_id
      join public.project p on p.id = c.project_id
      where ce.id = conversation_entry_embedding.conversation_entry_id and p.user_id = (select auth.uid())
    )
  );

