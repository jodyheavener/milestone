-- Context: Context entries, files, websites, storage, and context entry-specific AI functionality

-- ============================================================================
-- CONTEXT ENTRIES
-- ============================================================================

-- Table: context_entry
create table public.context_entry (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  title           text,
  content         text,
  content_tsv     tsvector,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Table: context_entry_project
create table public.context_entry_project (
  context_entry_id       uuid        not null
                  references public.context_entry(id) on delete cascade,
  project_id      uuid        not null
                  references public.project(id) on delete cascade,
  created_at      timestamptz not null default now(),
  
  primary key (context_entry_id, project_id)
);

-- Indexes: context entries
create index if not exists idx_context_entry_user_id
  on public.context_entry (user_id);

create index if not exists idx_context_entry_content_tsv
  on public.context_entry using GIN (content_tsv);

create index if not exists idx_context_entry_metadata_gin
  on public.context_entry using GIN (metadata);

create index if not exists idx_context_entry_project_project_id
  on public.context_entry_project (project_id);

-- Triggers: auto-update updated_at rows
create trigger trg_context_entry_updated_at
  before update on public.context_entry
  for each row execute procedure public.set_updated_at();

-- Function: Update TSV for context entry content
create or replace function public.update_context_entry_content_tsv()
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

-- Trigger: TSV update for context entry content
create trigger trg_context_entry_content_tsv
  before insert or update on public.context_entry
  for each row execute function public.update_context_entry_content_tsv();

-- Row-level security
alter table public.context_entry enable row level security;
alter table public.context_entry_project enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.context_entry to authenticated;
grant select, insert, update, delete on public.context_entry_project to authenticated;

-- Context entry policies (users can only access their own context entries)
create policy "Users can view their own context entries"
  on public.context_entry
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own context entries"
  on public.context_entry
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own context entries"
  on public.context_entry
  for update to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own context entries"
  on public.context_entry
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Context entry-project policies (users can only access links for their own context entries/projects)
create policy "Users can view context entry-project links for their own data"
  on public.context_entry_project
  for select to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = context_entry_project.context_entry_id and ce.user_id = (select auth.uid())
    ) or
    exists (
      select 1 from public.project p 
      where p.id = context_entry_project.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can create context entry-project links for their own data"
  on public.context_entry_project
  for insert to authenticated
  with check (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = context_entry_project.context_entry_id and ce.user_id = (select auth.uid())
    ) and
    exists (
      select 1 from public.project p 
      where p.id = context_entry_project.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can delete context entry-project links for their own data"
  on public.context_entry_project
  for delete to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = context_entry_project.context_entry_id and ce.user_id = (select auth.uid())
    ) or
    exists (
      select 1 from public.project p 
      where p.id = context_entry_project.project_id and p.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- WEBSITES
-- ============================================================================

-- Table: website
create table public.website (
  id                    uuid        primary key default gen_random_uuid(),
  context_entry_id      uuid        references public.context_entry(id) on delete cascade,
  address               text        not null,                        -- user-provided URL
  normalized_url        text        not null default '',             -- normalized (no fragment, sorted query)
  canonical_url         text,                                        -- <link rel="canonical">
  http_status           int,
  mime                  text,
  charset               text,
  language              text,
  site_name             text,
  page_title            text,
  published_at          timestamptz,
  updated_at            timestamptz,                                 -- page's own updated date
  fetched_at            timestamptz not null default now(),          -- when fetched
  etag                  text,
  last_modified         text,
  content_hash          bytea       not null default '\x'::bytea,   -- hash of cleaned main content
  main_text             text        not null default '',            -- cleaned text (boilerplate removed)
  outline               jsonb       not null default '[]',          -- [{path, heading, char_start, char_end}]
  tables                jsonb       not null default '[]',           -- extracted tables
  images                jsonb       not null default '[]',          -- [{src, alt, caption, width, height}]
  links                 jsonb       not null default '[]',           -- [{href, anchor}]
  metadata              jsonb       not null default '{}',          -- raw metas (og:*, schema.org, twitter:*)
  robots_noindex        boolean     not null default false,
  robots_nofollow        boolean     not null default false,
  license               text,
  created_at            timestamptz not null default now(),
  updated_row_at        timestamptz not null default now(),
  -- generated search vector for quick search
  main_text_tsv         tsvector    generated always as
                      (to_tsvector('english',
                        coalesce(page_title,'') || ' ' || coalesce(main_text,''))) stored,
  
  constraint uq_website_normalized unique (normalized_url)
);

-- Indexes: websites
create index if not exists idx_website_context_entry_id
  on public.website (context_entry_id);

create unique index if not exists ux_website_context_entry_id_address
  on public.website (context_entry_id, address) where context_entry_id is not null;

create unique index if not exists ux_website_canonical
  on public.website (canonical_url) where canonical_url is not null;

create index if not exists ix_website_hash
  on public.website using hash (content_hash);

create index if not exists ix_website_lang
  on public.website (language);

create index if not exists ix_website_dates
  on public.website (published_at, updated_at);

create index if not exists ix_website_tsv
  on public.website using gin (main_text_tsv);

create index if not exists ix_website_title_trgm
  on public.website using gin (page_title gin_trgm_ops);

create index if not exists ix_website_url_trgm
  on public.website using gin (normalized_url gin_trgm_ops);


-- Trigger to maintain updated_row_at
drop trigger if exists trg_website_updated on public.website;
create trigger trg_website_updated
before update on public.website
for each row execute function public.set_updated_at();

-- Row-level security
alter table public.website enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.website to authenticated;

-- Website policies (users can only access websites for their own context entries)
-- Initial policy - will be updated after record table is created
create policy "Users can view websites for their own context entries"
  on public.website
  for select to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = website.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

create policy "Users can create websites for their own context entries"
  on public.website
  for insert to authenticated
  with check (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = website.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

create policy "Users can update websites for their own context entries"
  on public.website
  for update to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = website.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

create policy "Users can delete websites for their own context entries"
  on public.website
  for delete to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = website.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- FILES
-- ============================================================================

-- Table: file
create table public.file (
  id                    uuid        primary key default gen_random_uuid(),
  context_entry_id      uuid        references public.context_entry(id) on delete cascade,
  sha256                text        unique not null,
  storage_path          text        not null,
  mime_type             text        not null,
  byte_size             bigint      not null check (byte_size >= 0),
  original_filename     text        not null,
  source                text        not null default 'user_upload',  -- e.g., 'user_upload', 'url_import'
  language              text,                                         -- ISO 639-1/2 if known
  page_count            integer     check (page_count is null or page_count >= 0),
  row_count             bigint      check (row_count is null or row_count >= 0),
  ingest_version        text        not null default 'v1',
  uploaded_by           uuid,                                        -- fk → auth.users.id if desired
  last_modified_at      timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz
);

-- Indexes: files
create index if not exists idx_file_context_entry_id
  on public.file (context_entry_id);


create index if not exists files_storage_path_idx
  on public.file (storage_path);

create index if not exists files_created_at_idx
  on public.file (created_at);


-- Trigger to maintain updated_at
drop trigger if exists trg_file_set_updated_at on public.file;
create trigger trg_file_set_updated_at
  before update on public.file
  for each row execute function public.set_updated_at();

-- Row-level security
alter table public.file enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.file to authenticated;

-- File policies (users can only access files for their own context entries)
-- Initial policy - will be updated after record table is created
create policy "Users can view files for their own context entries"
  on public.file
  for select to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = file.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

create policy "Users can create files for their own context entries"
  on public.file
  for insert to authenticated
  with check (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = file.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

create policy "Users can update files for their own context entries"
  on public.file
  for update to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = file.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

create policy "Users can delete files for their own context entries"
  on public.file
  for delete to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = file.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- FILE STORAGE
-- ============================================================================

-- Create storage bucket for attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false);

-- Storage policies for file attachments
create policy "Users can upload attachments for their own context entries"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments' and
    (
      -- Allow uploads for existing file context entries
      exists (
        select 1 from public.file f
        join public.context_entry ce on ce.id = f.context_entry_id
        where f.storage_path = name
        and ce.user_id = (select auth.uid())
      )
      or
      -- Allow temporary uploads for parsing (user-scoped paths)
      (name like (select auth.uid()::text || '/%'))
    )
  );

create policy "Users can view attachments for their own context entries"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments' and
    (
      -- Allow viewing files for existing file context entries
      exists (
        select 1 from public.file f
        join public.context_entry ce on ce.id = f.context_entry_id
        where f.storage_path = name
        and ce.user_id = (select auth.uid())
      )
      or
      -- Allow viewing temporary files (user-scoped paths)
      (name like (select auth.uid()::text || '/%'))
    )
  );

create policy "Users can delete attachments for their own context entries"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments' and
    (
      -- Allow deleting files for existing file context entries
      exists (
        select 1 from public.file f
        join public.context_entry ce on ce.id = f.context_entry_id
        where f.storage_path = name
        and ce.user_id = (select auth.uid())
      )
      or
      -- Allow deleting temporary files (user-scoped paths)
      (name like (select auth.uid()::text || '/%'))
    )
  );

-- ============================================================================
-- FILE CLEANUP
-- ============================================================================

-- Create a function to call the cleanup edge function
create or replace function public.cleanup_files_job()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  response text;
  cleanup_url text;
begin
  -- Construct the cleanup function URL
  -- In production, this would be your actual Supabase project URL
  -- For local development, this is the local Supabase URL
  cleanup_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/cleanup-files';
  
  -- If no URL is configured, use localhost for local development
  if cleanup_url is null or cleanup_url = '' then
    cleanup_url := 'http://127.0.0.1:54321/functions/v1/cleanup-files';
  end if;

  -- Make HTTP request to the cleanup function
  select content into response
  from http((
    'POST',
    cleanup_url,
    ARRAY[http_header('Content-Type', 'application/json')],
    'application/json',
    '{}'
  ));

  -- Log the result (you can check this in the Supabase logs)
  raise notice 'Cleanup job completed: %', response;
  
exception
  when others then
    -- Log any errors
    raise notice 'Cleanup job failed: %', SQLERRM;
end;
$$;

-- Schedule the cleanup job to run daily at 2 AM UTC
-- This will run the cleanup function every day
select cron.schedule(
  'cleanup-files',
  '0 2 * * *', -- Daily at 2 AM UTC
  'select public.cleanup_files_job();'
);

-- Grant execute permission on the cleanup function
grant execute on function public.cleanup_files_job() to authenticated;

-- ============================================================================
-- CONTEXT ENTRY-SPECIFIC AI FUNCTIONALITY
-- ============================================================================

-- Table: context_entry_embedding
create table public.context_entry_embedding (
  id              uuid        primary key default gen_random_uuid(),
  context_entry_id       uuid        not null
                  references public.context_entry(id) on delete cascade,
  project_id      uuid        references public.project(id) on delete cascade,
  embedding       extensions.vector(1536), -- Default OpenAI embedding dimension
  model           text        not null,
  created_at      timestamptz not null default now()
);

-- Indexes: context entry embeddings
create index if not exists idx_context_entry_embedding_context_entry_id
  on public.context_entry_embedding (context_entry_id);

create index if not exists idx_context_entry_embedding_project_id
  on public.context_entry_embedding (project_id);

create index if not exists ivfflat_context_entry_embedding_embedding
  on public.context_entry_embedding using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Row-level security
alter table public.context_entry_embedding enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.context_entry_embedding to authenticated;

-- Context entry embedding policies (users can only access embeddings for their own context entries)
create policy "Users can view embeddings for their own context entries"
  on public.context_entry_embedding
  for select to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = context_entry_embedding.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

create policy "Users can create embeddings for their own context entries"
  on public.context_entry_embedding
  for insert to authenticated
  with check (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = context_entry_embedding.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

create policy "Users can delete embeddings for their own context entries"
  on public.context_entry_embedding
  for delete to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = context_entry_embedding.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

-- Function: Search similar context entries using vector similarity
create or replace function public.search_similar_context_entries(
  query_embedding extensions.vector(1536),
  project_id uuid,
  exclude_context_entry_id uuid default null,
  match_threshold float default 0.8,
  match_count int default 5
)
returns table (
  id uuid,
  context_entry_id uuid,
  content text,
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
    cee.id,
    cee.context_entry_id,
    ce.content,
    1 - (cee.embedding <=> query_embedding) as similarity,
    ce.metadata
  from public.context_entry_embedding cee
  join public.context_entry ce on cee.context_entry_id = ce.id
  where cee.project_id = search_similar_context_entries.project_id
    and (exclude_context_entry_id is null or cee.context_entry_id != exclude_context_entry_id)
    and cee.embedding is not null
    and 1 - (cee.embedding <=> query_embedding) > match_threshold
  order by cee.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Grant execute permissions
grant execute on function public.search_similar_context_entries to authenticated;

-- ============================================================================
-- RECORD: AI-GENERATED SUMMARIES
-- ============================================================================

-- Table: record (stores AI-generated summaries for context entries)
create table if not exists public.record (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  context_entry_id   uuid references public.context_entry(id) on delete cascade,
  website_id         uuid references public.website(id) on delete cascade,
  file_id            uuid references public.file(id) on delete cascade,
  projects           uuid[] not null default '{}',           -- relation array to projects
  content            jsonb not null,                          -- structured summary (TL;DR, takeaways, metrics, etc.)
  content_version    int not null default 1,                  -- bump on regeneration
  model_name         text not null,                           -- e.g., gpt-4o-mini
  prompt_hash        bytea not null,                          -- hash(system+user prompts)
  tokens_in          int not null default 0,
  tokens_out         int not null default 0,
  citations          jsonb not null default '[]',            -- [{takeaway_id, section, start, end}]
  created_at         timestamptz not null default now()
);

create index if not exists ix_record_user
  on public.record (user_id, created_at desc);

create index if not exists ix_record_context_entry
  on public.record (context_entry_id, created_at desc);

create index if not exists ix_record_website
  on public.record (website_id, created_at desc);

create index if not exists ix_record_file
  on public.record (file_id, created_at desc);

create index if not exists ix_record_projects_gin
  on public.record using gin (projects);

create index if not exists ix_record_prompt_model
  on public.record (prompt_hash, model_name);

-- Row-level security for record
alter table public.record enable row level security;

grant select, insert on public.record to authenticated;

-- RECORD: owner-only visibility; immutable for clients (no update/delete).
create policy "record_owner_select"
  on public.record for select
  to authenticated
  using (user_id = auth.uid());

create policy "record_owner_insert"
  on public.record for insert
  to authenticated
  with check (user_id = auth.uid());

-- Allow users to update context_entry_id and projects for their own records
-- Note: This allows updates but the application should restrict to only these fields
create policy "record_owner_update_context"
  on public.record for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "record_no_delete_for_clients"
  on public.record for delete
  to authenticated
  using (false);

-- ============================================================================
-- UPDATE WEBSITE AND FILE POLICIES TO INCLUDE RECORD CHECK
-- ============================================================================
-- Now that the record table exists, update the website and file policies
-- to allow access when linked to user's records (even if context_entry_id is NULL)

-- Drop and recreate website SELECT policy with full logic
drop policy if exists "Users can view websites for their own context entries" on public.website;
create policy "Users can view websites for their own context entries"
  on public.website
  for select to authenticated
  using (
    -- Case 1: Website already linked to a context entry owned by the user
    exists (
      select 1 from public.context_entry ce 
      where ce.id = website.context_entry_id and ce.user_id = (select auth.uid())
    )
    OR
    -- Case 2: Website not yet linked, but linked to a record owned by the user
    (
      website.context_entry_id IS NULL
      AND
      exists (
        select 1 from public.record r
        where r.website_id = website.id and r.user_id = (select auth.uid())
      )
    )
  );

-- Drop and recreate website UPDATE policy with full logic
drop policy if exists "Users can update websites for their own context entries" on public.website;
create policy "Users can update websites for their own context entries"
  on public.website
  for update to authenticated
  using (
    -- Case 1: Website already linked to a context entry owned by the user
    exists (
      select 1 from public.context_entry ce 
      where ce.id = website.context_entry_id and ce.user_id = (select auth.uid())
    )
    OR
    -- Case 2: Website not yet linked, but linked to a record owned by the user
    (
      website.context_entry_id IS NULL
      AND
      exists (
        select 1 from public.record r
        where r.website_id = website.id and r.user_id = (select auth.uid())
      )
    )
  );

-- Drop and recreate file SELECT policy with full logic
drop policy if exists "Users can view files for their own context entries" on public.file;
create policy "Users can view files for their own context entries"
  on public.file
  for select to authenticated
  using (
    -- Case 1: File already linked to a context entry owned by the user
    exists (
      select 1 from public.context_entry ce 
      where ce.id = file.context_entry_id and ce.user_id = (select auth.uid())
    )
    OR
    -- Case 2: File not yet linked, but linked to a record owned by the user
    (
      file.context_entry_id IS NULL
      AND
      exists (
        select 1 from public.record r
        where r.file_id = file.id and r.user_id = (select auth.uid())
      )
    )
  );

-- Drop and recreate file UPDATE policy with full logic
drop policy if exists "Users can update files for their own context entries" on public.file;
create policy "Users can update files for their own context entries"
  on public.file
  for update to authenticated
  using (
    -- Case 1: File already linked to a context entry owned by the user
    exists (
      select 1 from public.context_entry ce 
      where ce.id = file.context_entry_id and ce.user_id = (select auth.uid())
    )
    OR
    -- Case 2: File not yet linked, but linked to a record owned by the user
    (
      file.context_entry_id IS NULL
      AND
      exists (
        select 1 from public.record r
        where r.file_id = file.id and r.user_id = (select auth.uid())
      )
    )
  );

-- Convenience view: Latest record per context entry
create or replace view public.v_latest_record as
select distinct on (r.user_id, r.context_entry_id)
  r.*
from public.record r
order by r.user_id, r.context_entry_id, r.created_at desc;

-- ============================================================================
-- WEBSITE CHUNKS (optional, for RAG-style querying)
-- ============================================================================

-- Table: website_chunks (for embeddings and chunking)
create table if not exists public.website_chunks (
  website_id         uuid not null references public.website(id) on delete cascade,
  section_path       text not null,                      -- "1", "1.2", etc.
  chunk_index        int not null,                       -- 0..N within section
  char_start         int not null,
  char_end           int not null,
  token_count        int not null,
  text               text not null,
  embedding          extensions.vector(1536),
  primary key (website_id, section_path, chunk_index)
);

create index if not exists ivf_website_chunks_embedding
  on public.website_chunks using ivfflat (embedding vector_l2_ops)
  with (lists = 100);

create index if not exists ix_website_chunks_lookup
  on public.website_chunks (website_id, section_path, chunk_index);

-- Row-level security for website_chunks
alter table public.website_chunks enable row level security;

grant select on public.website_chunks to authenticated;

-- CHUNKS: readable for authenticated (mirrors WEBSITE sharing).
create policy "chunks_read_all_auth"
  on public.website_chunks for select
  to authenticated
  using (true);

-- ============================================================================
-- FILE CHUNKS AND METADATA (for file parsing and RAG)
-- ============================================================================

-- Enums for file processing
do $$
begin
  if not exists (select 1 from pg_type where typname = 'region_type_enum') then
    create type region_type_enum as enum ('heading','paragraph','table','figure','ocr_block','caption','other');
  end if;

  if not exists (select 1 from pg_type where typname = 'summary_status_enum') then
    create type summary_status_enum as enum ('draft','final');
  end if;
end$$;

-- Table: file_metadata (flexible key/value for EXIF, author, keywords, etc.)
create table if not exists public.file_metadata (
  id         uuid primary key default gen_random_uuid(),
  file_id    uuid not null references public.file(id) on delete cascade,
  key        text not null,
  value_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists file_metadata_file_id_idx
  on public.file_metadata (file_id);

create index if not exists file_metadata_key_idx
  on public.file_metadata (key);

-- Table: file_region (layout elements)
create table if not exists public.file_region (
  id              uuid primary key default gen_random_uuid(),
  file_id          uuid not null references public.file(id) on delete cascade,
  page_or_frame    integer, -- page # for PDFs, frame for videos (if ever)
  region_type      region_type_enum not null,
  bbox             jsonb,   -- {x,y,w,h} or {x0,y0,x1,y1} in page coords
  text_excerpt     text,
  ocr_confidence   numeric, -- 0..1 typical; not enforced
  order_index      integer, -- reading order within page
  created_at       timestamptz not null default now()
);

create index if not exists file_region_file_id_idx
  on public.file_region (file_id);

create index if not exists file_region_file_page_idx
  on public.file_region (file_id, page_or_frame);

create index if not exists file_region_type_idx
  on public.file_region (region_type);

create index if not exists file_region_order_idx
  on public.file_region (file_id, page_or_frame, order_index);

-- Table: file_chunk (semantic chunks for retrieval + citation)
create table if not exists public.file_chunk (
  id            uuid primary key default gen_random_uuid(),
  file_id       uuid not null references public.file(id) on delete cascade,
  region_id     uuid references public.file_region(id) on delete set null,
  chunk_index   integer not null,                      -- sequence within file
  content_text  text not null,
  token_count   integer check (token_count is null or token_count >= 0),
  created_at    timestamptz not null default now(),
  unique (file_id, chunk_index)
);

create index if not exists file_chunk_file_id_idx
  on public.file_chunk (file_id);

create index if not exists file_chunk_region_id_idx
  on public.file_chunk (region_id);

-- Table: file_chunk_embedding (pgvector embeddings per chunk)
create table if not exists public.file_chunk_embedding (
  chunk_id    uuid primary key references public.file_chunk(id) on delete cascade,
  embedding   extensions.vector(1536) not null,
  model       text not null,
  created_at  timestamptz not null default now()
);

-- Index for file chunk embeddings
do $$
begin
  if not exists (
    select 1
    from   pg_class c
    join   pg_namespace n on n.oid = c.relnamespace
    where  c.relname = 'file_chunk_embedding_embedding_idx'
      and  n.nspname = 'public'
  ) then
    create index file_chunk_embedding_embedding_idx
      on public.file_chunk_embedding
      using ivfflat (embedding vector_cosine_ops)
      with (lists = 100);
  end if;
end$$;

-- Table: file_data_profile (CSV schema, stats, samples)
create table if not exists public.file_data_profile (
  file_id      uuid primary key references public.file(id) on delete cascade,
  profile_json jsonb not null,      -- column schemas, stats, sample hashes, etc.
  created_at   timestamptz not null default now()
);

-- Table: summary (generated summaries for files + provenance)
create table if not exists public.summary (
  id              uuid primary key default gen_random_uuid(),
  record_id       uuid references public.record(id) on delete set null,
  file_id         uuid not null references public.file(id) on delete cascade,
  version         integer not null,      -- versioned per file
  status          summary_status_enum not null default 'final',
  executive_md    text not null,
  detailed_md     text not null,
  facts_md        text,
  assumptions_md  text,
  source_checksum text not null,         -- checksum of normalized input used
  prompt_version  text not null,
  model           text not null,         -- model name/version
  params_json     jsonb,                 -- decoding params, etc.
  created_at      timestamptz not null default now(),
  created_by      uuid,
  updated_at      timestamptz,
  unique (file_id, version)
);

create index if not exists summary_file_id_idx
  on public.summary (file_id);

create index if not exists summary_created_at_idx
  on public.summary (created_at);

create index if not exists summary_status_idx
  on public.summary (status);

-- Trigger for summary updated_at
drop trigger if exists trg_summary_set_updated_at on public.summary;
create trigger trg_summary_set_updated_at
  before update on public.summary
  for each row execute function public.set_updated_at();

-- Row-level security for new tables
alter table public.file_metadata enable row level security;
alter table public.file_region enable row level security;
alter table public.file_chunk enable row level security;
alter table public.file_chunk_embedding enable row level security;
alter table public.file_data_profile enable row level security;
alter table public.summary enable row level security;

-- Grant permissions
grant select, insert on public.file_metadata to authenticated;
grant select, insert on public.file_region to authenticated;
grant select, insert on public.file_chunk to authenticated;
grant select, insert on public.file_chunk_embedding to authenticated;
grant select, insert on public.file_data_profile to authenticated;
grant select, insert on public.summary to authenticated;

-- RLS policies for file-related tables (users can only access files for their own context entries)
create policy "file_metadata_owner"
  on public.file_metadata for select
  to authenticated
  using (
    exists (
      select 1 from public.file f
      left join public.context_entry ce on ce.id = f.context_entry_id
      where f.id = file_metadata.file_id
        and (ce.user_id = auth.uid() or f.uploaded_by = auth.uid())
    )
  );

create policy "file_region_owner"
  on public.file_region for select
  to authenticated
  using (
    exists (
      select 1 from public.file f
      left join public.context_entry ce on ce.id = f.context_entry_id
      where f.id = file_region.file_id
        and (ce.user_id = auth.uid() or f.uploaded_by = auth.uid())
    )
  );

create policy "file_chunk_owner"
  on public.file_chunk for select
  to authenticated
  using (
    exists (
      select 1 from public.file f
      left join public.context_entry ce on ce.id = f.context_entry_id
      where f.id = file_chunk.file_id
        and (ce.user_id = auth.uid() or f.uploaded_by = auth.uid())
    )
  );

create policy "file_chunk_embedding_owner"
  on public.file_chunk_embedding for select
  to authenticated
  using (
    exists (
      select 1 from public.file_chunk fc
      join public.file f on f.id = fc.file_id
      left join public.context_entry ce on ce.id = f.context_entry_id
      where fc.id = file_chunk_embedding.chunk_id
        and (ce.user_id = auth.uid() or f.uploaded_by = auth.uid())
    )
  );

create policy "file_data_profile_owner"
  on public.file_data_profile for select
  to authenticated
  using (
    exists (
      select 1 from public.file f
      left join public.context_entry ce on ce.id = f.context_entry_id
      where f.id = file_data_profile.file_id
        and (ce.user_id = auth.uid() or f.uploaded_by = auth.uid())
    )
  );

create policy "summary_owner"
  on public.summary for select
  to authenticated
  using (
    exists (
      select 1 from public.file f
      left join public.context_entry ce on ce.id = f.context_entry_id
      where f.id = summary.file_id
        and (ce.user_id = auth.uid() or f.uploaded_by = auth.uid())
    )
  );

