-- Core Entities: profile
-- These form the foundation of the milestone system

-- Table: profile
create table public.profile (
  id                    uuid        primary key references auth.users(id) on delete cascade,
  name                  text        not null,
  job_title             text,
  employer_name         text,
  employer_description  text,
  employer_website      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Indexes: core entities
-- No additional indexes needed for employer fields

-- Triggers: auto-update updated_at rows
create trigger trg_profile_updated_at
  before update on public.profile
  for each row execute procedure public.set_updated_at();

-- Function: Handle new user signup - create profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  -- Get name from user metadata if available
  v_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
  
  insert into public.profile (id, name)
  values (NEW.id, v_name);
  return NEW;
end;
$$;

-- Trigger: Create profile on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row-level security
alter table public.profile enable row level security;

-- Grant basic permissions
grant select, insert, update, delete on public.profile to authenticated;

-- Profile policies (users can only access their own data)
create policy "Users can view their own profile"
  on public.profile
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profile
  for update to authenticated
  using ((select auth.uid()) = id);

-- Function: Delete user account and all associated data
create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  -- Get the current user ID
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'User not authenticated';
  end if;
  
  -- Delete the user from auth.users - this will cascade delete all related data
  -- due to the foreign key constraints we set up
  delete from auth.users where id = v_user_id;
end;
$$;

-- Grant execute permission on the delete_user function
grant execute on function public.delete_user() to authenticated;
