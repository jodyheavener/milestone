-- AI & Search Infrastructure: record_embedding, conversation_entry_embedding, content_chunk, search_config
-- Vector storage, semantic search, and AI configuration

-- Table: record_embedding
create table public.record_embedding (
  id              uuid        primary key default gen_random_uuid(),
  record_id       uuid        not null
                  references public.record(id) on delete cascade,
  project_id      uuid        references public.project(id) on delete cascade,
  embedding       extensions.vector(1536), -- Default OpenAI embedding dimension
  model           text        not null,
  created_at      timestamptz not null default now()
);

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

-- Table: content_chunk
create table public.content_chunk (
  id              uuid        primary key default gen_random_uuid(),
  source_type     text        not null,
  source_id       uuid        not null,
  project_id      uuid        references public.project(id) on delete cascade,
  chunk_index     integer     not null,
  text            text        not null,
  text_tsv        tsvector,
  embedding       extensions.vector(1536), -- Default OpenAI embedding dimension
  model           text,
  created_at      timestamptz not null default now(),
  
  constraint content_chunk_source_type_check check (source_type in ('record', 'file', 'website'))
);

-- Table: search_config
create table public.search_config (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null
                  references public.project(id) on delete cascade,
  embedding_model text        not null,
  embedding_dim   integer     not null,
  chunk_size      integer     not null,
  chunk_overlap   integer     not null,
  rerank_model    text,
  filters         jsonb,
  
  constraint uq_search_config_project_id unique (project_id)
);

-- Indexes: AI & search infrastructure
create index if not exists idx_recordembedding_record_id
  on public.record_embedding (record_id);

create index if not exists idx_recordembedding_project_id
  on public.record_embedding (project_id);

create index if not exists ivfflat_recordembedding_embedding
  on public.record_embedding using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists idx_cee_conversation_entry_id
  on public.conversation_entry_embedding (conversation_entry_id);

create index if not exists idx_cee_project_id
  on public.conversation_entry_embedding (project_id);

create index if not exists ivfflat_cee_embedding
  on public.conversation_entry_embedding using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists idx_chunk_source
  on public.content_chunk (source_type, source_id);

create index if not exists idx_chunk_project_id
  on public.content_chunk (project_id);

create index if not exists idx_chunk_text_tsv
  on public.content_chunk using GIN (text_tsv);

create index if not exists ivfflat_chunk_embedding
  on public.content_chunk using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Function: Update TSV for content chunk text
create or replace function public.update_content_chunk_text_tsv()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  NEW.text_tsv := to_tsvector('english', extensions.unaccent(COALESCE(NEW.text, '')));
  return NEW;
end;
$$;

-- Trigger: TSV update for content chunk text
create trigger trg_content_chunk_text_tsv
  before insert or update on public.content_chunk
  for each row execute function public.update_content_chunk_text_tsv();

-- Row-level security
alter table public.record_embedding enable row level security;
alter table public.conversation_entry_embedding enable row level security;
alter table public.content_chunk enable row level security;
alter table public.search_config enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.record_embedding to authenticated;
grant select, insert, update, delete on public.conversation_entry_embedding to authenticated;
grant select, insert, update, delete on public.content_chunk to authenticated;
grant select, insert, update, delete on public.search_config to authenticated;

-- Record embedding policies (users can only access embeddings for their own records)
create policy "Users can view record embeddings for their own records"
  on public.record_embedding
  for select to authenticated
  using (
    exists (
      select 1 from public.record r 
      where r.id = record_embedding.record_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can create record embeddings for their own records"
  on public.record_embedding
  for insert to authenticated
  with check (
    exists (
      select 1 from public.record r 
      where r.id = record_embedding.record_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can delete record embeddings for their own records"
  on public.record_embedding
  for delete to authenticated
  using (
    exists (
      select 1 from public.record r 
      where r.id = record_embedding.record_id and r.user_id = (select auth.uid())
    )
  );

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

-- Content chunk policies (users can only access chunks for their own content)
create policy "Users can view content chunks for their own content"
  on public.content_chunk
  for select to authenticated
  using (
    (source_type = 'record' and exists (
      select 1 from public.record r 
      where r.id = content_chunk.source_id and r.user_id = (select auth.uid())
    )) or
    (source_type = 'file' and exists (
      select 1 from public.file f
      join public.record r on r.id = f.record_id
      where f.id = content_chunk.source_id and r.user_id = (select auth.uid())
    )) or
    (source_type = 'website' and exists (
      select 1 from public.website w
      join public.record r on r.id = w.record_id
      where w.id = content_chunk.source_id and r.user_id = (select auth.uid())
    ))
  );

create policy "Users can create content chunks for their own content"
  on public.content_chunk
  for insert to authenticated
  with check (
    (source_type = 'record' and exists (
      select 1 from public.record r 
      where r.id = content_chunk.source_id and r.user_id = (select auth.uid())
    )) or
    (source_type = 'file' and exists (
      select 1 from public.file f
      join public.record r on r.id = f.record_id
      where f.id = content_chunk.source_id and r.user_id = (select auth.uid())
    )) or
    (source_type = 'website' and exists (
      select 1 from public.website w
      join public.record r on r.id = w.record_id
      where w.id = content_chunk.source_id and r.user_id = (select auth.uid())
    ))
  );

create policy "Users can delete content chunks for their own content"
  on public.content_chunk
  for delete to authenticated
  using (
    (source_type = 'record' and exists (
      select 1 from public.record r 
      where r.id = content_chunk.source_id and r.user_id = (select auth.uid())
    )) or
    (source_type = 'file' and exists (
      select 1 from public.file f
      join public.record r on r.id = f.record_id
      where f.id = content_chunk.source_id and r.user_id = (select auth.uid())
    )) or
    (source_type = 'website' and exists (
      select 1 from public.website w
      join public.record r on r.id = w.record_id
      where w.id = content_chunk.source_id and r.user_id = (select auth.uid())
    ))
  );

-- Search config policies (users can only access configs for their own projects)
create policy "Users can view search configs for their own projects"
  on public.search_config
  for select to authenticated
  using (
    exists (
      select 1 from public.project p 
      where p.id = search_config.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can create search configs for their own projects"
  on public.search_config
  for insert to authenticated
  with check (
    exists (
      select 1 from public.project p 
      where p.id = search_config.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can update search configs for their own projects"
  on public.search_config
  for update to authenticated
  using (
    exists (
      select 1 from public.project p 
      where p.id = search_config.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can delete search configs for their own projects"
  on public.search_config
  for delete to authenticated
  using (
    exists (
      select 1 from public.project p 
      where p.id = search_config.project_id and p.user_id = (select auth.uid())
    )
  );
