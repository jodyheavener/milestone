-- Extensions and common functions used across multiple tables

-- Create a dedicated schema for extensions
create schema if not exists extensions;

-- Install extensions in the extensions schema
create extension if not exists "vector" schema extensions;
create extension if not exists "pg_trgm" schema extensions;
create extension if not exists "unaccent" schema extensions;
create extension if not exists "http" schema extensions;
create extension if not exists "pg_cron" schema extensions;

-- Grant usage on the extensions schema to authenticated users
grant usage on schema extensions to authenticated;

-- Grant execute on extension functions to authenticated users
grant execute on function extensions.unaccent(text) to authenticated;

-- Function: Update the updated_at timestamp
create or replace function public.set_updated_at()
returns trigger 
language plpgsql
security definer
set search_path = ''
as $$
begin
  NEW.updated_at := now();
  return NEW;
end; $$;
