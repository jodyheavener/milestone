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
  flags                 text[]      not null default '{}',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

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
grant select, insert, update on public.profile to service_role;

-- Profile policies (users can only access their own data)
create policy "Users can view their own profile"
  on public.profile
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profile
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Function: Prevent authenticated users from updating flags
create or replace function public.prevent_flags_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only prevent update if flags are actually changing
  if old.flags is distinct from new.flags then
    -- If auth.uid() is set, it means this is an authenticated user request
    -- Block flag updates from authenticated users
    -- service_role connections typically have auth.uid() as null
    if auth.uid() is not null then
      raise exception 'flags can only be updated by service_role';
    end if;
  end if;
  
  return new;
end;
$$;

-- Trigger: Prevent authenticated users from updating flags
create trigger trg_profile_prevent_flags_update
  before update on public.profile
  for each row execute function public.prevent_flags_update();

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
