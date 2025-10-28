-- Create storage bucket for attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false);

-- Set up RLS policies for attachments bucket
create policy "Users can upload attachments for their own records"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'attachments' and
    exists (
      select 1 from public.file f
      join public.record r on r.id = f.record_id
      where f.storage_path = name
      and r.user_id = (select auth.uid())
    )
  );

create policy "Users can view attachments for their own records"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments' and
    exists (
      select 1 from public.file f
      join public.record r on r.id = f.record_id
      where f.storage_path = name
      and r.user_id = (select auth.uid())
    )
  );

create policy "Users can delete attachments for their own records"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'attachments' and
    exists (
      select 1 from public.file f
      join public.record r on r.id = f.record_id
      where f.storage_path = name
      and r.user_id = (select auth.uid())
    )
  );
