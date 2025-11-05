-- AI Infrastructure: General AI infrastructure not specific to records or conversations
-- This includes content chunks, search configuration, and general search functions

-- ============================================================================
-- CONTENT CHUNKS
-- ============================================================================

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

-- Indexes: content chunks
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
alter table public.content_chunk enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.content_chunk to authenticated;

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

-- ============================================================================
-- SEARCH CONFIGURATION
-- ============================================================================

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

-- Row-level security
alter table public.search_config enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.search_config to authenticated;

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

-- ============================================================================
-- GENERAL SEARCH FUNCTIONS
-- ============================================================================

-- Function: Search content chunks using vector similarity
create or replace function public.search_content_chunks(
  query_embedding extensions.vector(1536),
  project_id uuid,
  source_types text[] default null,
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  source_type text,
  source_id uuid,
  text text,
  chunk_index int,
  similarity float,
  metadata jsonb
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select 
    cc.id,
    cc.source_type,
    cc.source_id,
    cc.text,
    cc.chunk_index,
    1 - (cc.embedding <=> query_embedding) as similarity,
    case 
      when cc.source_type = 'record' then r.metadata
      when cc.source_type = 'file' then rf.metadata
      when cc.source_type = 'website' then rw.metadata
      else null
    end as metadata
  from public.content_chunk cc
  left join public.record r on cc.source_type = 'record' and cc.source_id = r.id
  left join public.file f on cc.source_type = 'file' and cc.source_id = f.id
  left join public.record rf on cc.source_type = 'file' and f.record_id = rf.id
  left join public.website w on cc.source_type = 'website' and cc.source_id = w.id
  left join public.record rw on cc.source_type = 'website' and w.record_id = rw.id
  where cc.project_id = search_content_chunks.project_id
    and (source_types is null or cc.source_type = any(source_types))
    and cc.embedding is not null
    and 1 - (cc.embedding <=> query_embedding) > match_threshold
  order by cc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Function: Search content by text similarity (hybrid search)
create or replace function public.search_content_hybrid(
  query_text text,
  project_id uuid,
  source_types text[] default null,
  match_threshold float default 0.7,
  match_count int default 10,
  text_weight float default 0.3,
  vector_weight float default 0.7
)
returns table (
  id uuid,
  source_type text,
  source_id uuid,
  text text,
  chunk_index int,
  similarity float,
  metadata jsonb
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  query_embedding extensions.vector(1536);
  query_tsv tsvector;
begin
  -- Generate embedding for the query (this would need to be done in application code)
  -- For now, we'll use a placeholder
  query_embedding := array_fill(0, array[1536])::extensions.vector(1536);
  
  -- Create tsvector for text search
  query_tsv := to_tsvector('english', query_text);
  
  return query
  select 
    cc.id,
    cc.source_type,
    cc.source_id,
    cc.text,
    cc.chunk_index,
    (
      (text_weight * ts_rank(cc.text_tsv, query_tsv)) +
      (vector_weight * (1 - (cc.embedding <=> query_embedding)))
    ) as similarity,
    case 
      when cc.source_type = 'record' then r.metadata
      when cc.source_type = 'file' then rf.metadata
      when cc.source_type = 'website' then rw.metadata
      else null
    end as metadata
  from public.content_chunk cc
  left join public.record r on cc.source_type = 'record' and cc.source_id = r.id
  left join public.file f on cc.source_type = 'file' and cc.source_id = f.id
  left join public.record rf on cc.source_type = 'file' and f.record_id = rf.id
  left join public.website w on cc.source_type = 'website' and cc.source_id = w.id
  left join public.record rw on cc.source_type = 'website' and w.record_id = rw.id
  where cc.project_id = search_content_hybrid.project_id
    and (source_types is null or cc.source_type = any(source_types))
    and cc.embedding is not null
    and (
      (text_weight * ts_rank(cc.text_tsv, query_tsv)) +
      (vector_weight * (1 - (cc.embedding <=> query_embedding)))
    ) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;

-- Function: Get search configuration for a project
create or replace function public.get_search_config(project_id uuid)
returns table (
  id uuid,
  embedding_model text,
  embedding_dim int,
  chunk_size int,
  chunk_overlap int,
  rerank_model text,
  filters jsonb
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  select 
    sc.id,
    sc.embedding_model,
    sc.embedding_dim,
    sc.chunk_size,
    sc.chunk_overlap,
    sc.rerank_model,
    sc.filters
  from public.search_config sc
  where sc.project_id = get_search_config.project_id;
end;
$$;

-- Function: Initialize search configuration for a project
create or replace function public.init_search_config(
  project_id uuid,
  embedding_model text default 'text-embedding-3-small',
  embedding_dim int default 1536,
  chunk_size int default 1000,
  chunk_overlap int default 200,
  rerank_model text default null,
  filters jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  config_id uuid;
begin
  insert into public.search_config (
    project_id,
    embedding_model,
    embedding_dim,
    chunk_size,
    chunk_overlap,
    rerank_model,
    filters
  ) values (
    init_search_config.project_id,
    init_search_config.embedding_model,
    init_search_config.embedding_dim,
    init_search_config.chunk_size,
    init_search_config.chunk_overlap,
    init_search_config.rerank_model,
    init_search_config.filters
  )
  on conflict on constraint uq_search_config_project_id do update set
    embedding_model = excluded.embedding_model,
    embedding_dim = excluded.embedding_dim,
    chunk_size = excluded.chunk_size,
    chunk_overlap = excluded.chunk_overlap,
    rerank_model = excluded.rerank_model,
    filters = excluded.filters
  returning id into config_id;
  
  return config_id;
end;
$$;

-- Grant execute permissions
grant execute on function public.search_content_chunks to authenticated;
grant execute on function public.search_content_hybrid to authenticated;
grant execute on function public.get_search_config to authenticated;
grant execute on function public.init_search_config to authenticated;

