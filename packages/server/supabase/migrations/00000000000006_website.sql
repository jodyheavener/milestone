-- Website: website table and related functionality

-- Table: website
create table public.website (
  id                    uuid        primary key default gen_random_uuid(),
  record_id             uuid        not null
                        references public.record(id) on delete cascade,
  address               text        not null,
  page_title            text,
  last_updated_at       timestamptz,
  extracted_content     text,
  extracted_content_tsv tsvector,
  created_at            timestamptz not null default now(),
  
  constraint uq_website_record_id_address unique (record_id, address)
);

-- Indexes: websites
create index if not exists idx_website_record_id
  on public.website (record_id);

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

-- Website policies (users can only access websites for their own records)
create policy "Users can view websites for their own records"
  on public.website
  for select to authenticated
  using (
    exists (
      select 1 from public.record r 
      where r.id = website.record_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can create websites for their own records"
  on public.website
  for insert to authenticated
  with check (
    exists (
      select 1 from public.record r 
      where r.id = website.record_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can update websites for their own records"
  on public.website
  for update to authenticated
  using (
    exists (
      select 1 from public.record r 
      where r.id = website.record_id and r.user_id = (select auth.uid())
    )
  );

create policy "Users can delete websites for their own records"
  on public.website
  for delete to authenticated
  using (
    exists (
      select 1 from public.record r 
      where r.id = website.record_id and r.user_id = (select auth.uid())
    )
  );
