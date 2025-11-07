-- Context: Context entries, files, websites, storage, and context entry-specific AI functionality

-- ============================================================================
-- CONTEXT ENTRIES
-- ============================================================================

-- Table: context_entry
create table public.context_entry (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  title           text,
  content         text        not null,
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
  context_entry_id             uuid        not null
                        references public.context_entry(id) on delete cascade,
  address               text        not null,
  page_title            text,
  last_updated_at       timestamptz,
  extracted_content     text,
  extracted_content_tsv tsvector,
  created_at            timestamptz not null default now(),
  
  constraint uq_website_context_entry_id_address unique (context_entry_id, address)
);

-- Indexes: websites
create index if not exists idx_website_context_entry_id
  on public.website (context_entry_id);

create index if not exists idx_website_text_tsv
  on public.website using GIN (extracted_content_tsv);

-- Function: Update TSV for website extracted text
create or replace function public.update_website_text_tsv()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  NEW.extracted_content_tsv := to_tsvector('english', extensions.unaccent(COALESCE(NEW.extracted_content, '')));
  return NEW;
end;
$$;

-- Triggers: TSV updates
create trigger trg_website_text_tsv
  before insert or update on public.website
  for each row execute function public.update_website_text_tsv();

-- Row-level security
alter table public.website enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.website to authenticated;

-- Website policies (users can only access websites for their own context entries)
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
  context_entry_id             uuid        not null
                        references public.context_entry(id) on delete cascade,
  mime_type             text        not null,
  file_size             bigint      not null,
  storage_path          text        not null,
  parser                text,
  extracted_text        text,
  extracted_text_tsv    tsvector,
  created_at            timestamptz not null default now()
);

-- Indexes: files
create index if not exists idx_file_context_entry_id
  on public.file (context_entry_id);

create index if not exists idx_file_text_tsv
  on public.file using GIN (extracted_text_tsv);

-- Function: Update TSV for file extracted text
create or replace function public.update_file_text_tsv()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  NEW.extracted_text_tsv := to_tsvector('english', extensions.unaccent(COALESCE(NEW.extracted_text, '')));
  return NEW;
end;
$$;

-- Triggers: TSV updates
create trigger trg_file_text_tsv
  before insert or update on public.file
  for each row execute function public.update_file_text_tsv();

-- Row-level security
alter table public.file enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.file to authenticated;

-- File policies (users can only access files for their own context entries)
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
create policy "Users can view context entry embeddings for their own context entries"
  on public.context_entry_embedding
  for select to authenticated
  using (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = context_entry_embedding.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

create policy "Users can create context entry embeddings for their own context entries"
  on public.context_entry_embedding
  for insert to authenticated
  with check (
    exists (
      select 1 from public.context_entry ce 
      where ce.id = context_entry_embedding.context_entry_id and ce.user_id = (select auth.uid())
    )
  );

create policy "Users can delete context entry embeddings for their own context entries"
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

