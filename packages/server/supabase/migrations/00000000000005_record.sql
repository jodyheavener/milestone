-- Record: record table and related functionality

-- Table: record
create table public.record (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  content         text        not null,
  content_tsv     tsvector,
  metadata        jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Table: record_project
create table public.record_project (
  record_id       uuid        not null
                  references public.record(id) on delete cascade,
  project_id      uuid        not null
                  references public.project(id) on delete cascade,
  created_at      timestamptz not null default now(),
  
  primary key (record_id, project_id)
);

-- Indexes: records
create index if not exists idx_record_user_id
  on public.record (user_id);

create index if not exists idx_record_content_tsv
  on public.record using GIN (content_tsv);

create index if not exists idx_record_metadata_gin
  on public.record using GIN (metadata);

create index if not exists idx_recordproject_project_id
  on public.record_project (project_id);

-- Triggers: auto-update updated_at rows
create trigger trg_record_updated_at
  before update on public.record
  for each row execute procedure public.set_updated_at();

-- Function: Update TSV for record content
create or replace function public.update_record_content_tsv()
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

-- Trigger: TSV update for record content
create trigger trg_record_content_tsv
  before insert or update on public.record
  for each row execute function public.update_record_content_tsv();

-- Row-level security
alter table public.record enable row level security;
alter table public.record_project enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.record to authenticated;
grant select, insert, update, delete on public.record_project to authenticated;

-- Record policies (users can only access their own records)
create policy "Users can view their own records"
  on public.record
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own records"
  on public.record
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own records"
  on public.record
  for update to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can delete their own records"
  on public.record
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Record-project policies (users can only access links for their own records/projects)
create policy "Users can view record-project links for their own data"
  on public.record_project
  for select to authenticated
  using (
    exists (
      select 1 from public.record r 
      where r.id = record_project.record_id and r.user_id = (select auth.uid())
    ) or
    exists (
      select 1 from public.project p 
      where p.id = record_project.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can create record-project links for their own data"
  on public.record_project
  for insert to authenticated
  with check (
    exists (
      select 1 from public.record r 
      where r.id = record_project.record_id and r.user_id = (select auth.uid())
    ) and
    exists (
      select 1 from public.project p 
      where p.id = record_project.project_id and p.user_id = (select auth.uid())
    )
  );

create policy "Users can delete record-project links for their own data"
  on public.record_project
  for delete to authenticated
  using (
    exists (
      select 1 from public.record r 
      where r.id = record_project.record_id and r.user_id = (select auth.uid())
    ) or
    exists (
      select 1 from public.project p 
      where p.id = record_project.project_id and p.user_id = (select auth.uid())
    )
  );
