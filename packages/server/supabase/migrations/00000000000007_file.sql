-- File: file table and related functionality

-- Table: file
create table public.file (
  id                    uuid        primary key default gen_random_uuid(),
  record_id             uuid        not null
                        references public.record(id) on delete cascade,
  mime_type             text        not null,
  file_size             bigint      not null,
  storage_path          text        not null,
  parser                text,
  extracted_text        text,
  extracted_text_tsv    tsvector,
  created_at            timestamptz not null default now()
);

-- Indexes: files
create index if not exists idx_file_record_id
  on public.file (record_id);

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

-- File policies (users can only access files for their own records)
create policy "Users can view files for their own records"
  on public.file
  for select to authenticated
  using (
    exists (
      select 1 from public.record r 
      where r.id = file.record_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can create files for their own records"
  on public.file
  for insert to authenticated
  with check (
    exists (
      select 1 from public.record r 
      where r.id = file.record_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can update files for their own records"
  on public.file
  for update to authenticated
  using (
    exists (
      select 1 from public.record r 
      where r.id = file.record_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can delete files for their own records"
  on public.file
  for delete to authenticated
  using (
    exists (
      select 1 from public.record r 
      where r.id = file.record_id and r.user_id = (select auth.uid())
    )
  );
