-- Search functions for AI infrastructure
-- These functions provide vector similarity search capabilities

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
set search_path = ''
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
      when cc.source_type = 'file' then f.metadata
      when cc.source_type = 'website' then w.metadata
      else null
    end as metadata
  from public.content_chunk cc
  left join public.record r on cc.source_type = 'record' and cc.source_id = r.id
  left join public.file f on cc.source_type = 'file' and cc.source_id = f.id
  left join public.website w on cc.source_type = 'website' and cc.source_id = w.id
  where cc.project_id = search_content_chunks.project_id
    and (source_types is null or cc.source_type = any(source_types))
    and cc.embedding is not null
    and 1 - (cc.embedding <=> query_embedding) > match_threshold
  order by cc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Function: Search similar records using vector similarity
create or replace function public.search_similar_records(
  query_embedding extensions.vector(1536),
  project_id uuid,
  exclude_record_id uuid default null,
  match_threshold float default 0.8,
  match_count int default 5
)
returns table (
  id uuid,
  record_id uuid,
  content text,
  similarity float,
  metadata jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select 
    re.id,
    re.record_id,
    r.content,
    1 - (re.embedding <=> query_embedding) as similarity,
    r.metadata
  from public.record_embedding re
  join public.record r on re.record_id = r.id
  where re.project_id = search_similar_records.project_id
    and (exclude_record_id is null or re.record_id != exclude_record_id)
    and re.embedding is not null
    and 1 - (re.embedding <=> query_embedding) > match_threshold
  order by re.embedding <=> query_embedding
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
set search_path = ''
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
      when cc.source_type = 'file' then f.metadata
      when cc.source_type = 'website' then w.metadata
      else null
    end as metadata
  from public.content_chunk cc
  left join public.record r on cc.source_type = 'record' and cc.source_id = r.id
  left join public.file f on cc.source_type = 'file' and cc.source_id = f.id
  left join public.website w on cc.source_type = 'website' and cc.source_id = w.id
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
set search_path = ''
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
set search_path = ''
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
  on conflict (project_id) do update set
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
grant execute on function public.search_similar_records to authenticated;
grant execute on function public.search_content_hybrid to authenticated;
grant execute on function public.get_search_config to authenticated;
grant execute on function public.init_search_config to authenticated;
