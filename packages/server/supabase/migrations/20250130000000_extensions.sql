-- Create a dedicated schema for extensions
create schema if not exists extensions;

-- Install extensions in the extensions schema
create extension if not exists "vector" schema extensions;
create extension if not exists "pg_trgm" schema extensions;
create extension if not exists "unaccent" schema extensions;

-- Grant usage on the extensions schema to authenticated users
grant usage on schema extensions to authenticated;

-- Grant execute on extension functions to authenticated users
grant execute on function extensions.unaccent(text) to authenticated;
