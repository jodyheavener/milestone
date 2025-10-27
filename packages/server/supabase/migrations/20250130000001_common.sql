-- Common functions used across multiple tables
-- Shared utilities for the milestone database

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
