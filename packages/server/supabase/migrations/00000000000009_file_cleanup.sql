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
