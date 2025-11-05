-- Usage: Entitlements, usage tracking, and authorization functions

-- ============================================================================
-- ENTITLEMENTS
-- ============================================================================

-- Table: entitlements
create table public.entitlements (
  user_id                     uuid        primary key references auth.users(id) on delete cascade,
  projects_limit              integer     not null default 0,
  agentic_limit               integer     not null default 0,
  resets_at                   timestamptz,
  source                      jsonb,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- ============================================================================
-- USAGE TRACKING
-- ============================================================================

-- Table: usage_counters
create table public.usage_counters (
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  period_start            timestamptz not null,
  period_end              timestamptz not null,
  agentic_requests_used   integer     not null default 0,
  projects_used           integer     not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  primary key (user_id, period_start, period_end)
);

-- Table: usage_events
create table public.usage_events (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  op_type                 text        not null,
  delta                   integer     not null default 1,
  created_at              timestamptz not null default now(),
  subscription_item_id     uuid        references public.subscription_items(id)
);

-- Indexes: entitlements and usage
create index if not exists idx_usage_counters_user_id_period
  on public.usage_counters (user_id, period_start desc, period_end desc);

create index if not exists idx_usage_events_user_id_created_at
  on public.usage_events (user_id, created_at desc);

create index if not exists idx_usage_events_op_type
  on public.usage_events (op_type);

create index if not exists idx_usage_events_subscription_item_id
  on public.usage_events (subscription_item_id);

-- Triggers: auto-update updated_at
create trigger trg_entitlements_updated_at
  before update on public.entitlements
  for each row execute procedure public.set_updated_at();

create trigger trg_usage_counters_updated_at
  before update on public.usage_counters
  for each row execute procedure public.set_updated_at();

-- ============================================================================
-- AUTHORIZATION FUNCTIONS
-- ============================================================================

-- Function: authorize_operation - atomically check entitlement and increment usage
create or replace function public.authorize_operation(
  p_user_id uuid,
  p_op_type text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
  v_entitlement public.entitlements%rowtype;
  v_usage_counter public.usage_counters%rowtype;
  v_allowed boolean := false;
  v_reason text;
  v_remaining integer;
  v_current_period_start timestamptz;
  v_current_period_end timestamptz;
  v_profile_flags text[];
  v_rolling_total integer;
begin
  -- Check if user has unrestricted_operations flag
  select flags into v_profile_flags
  from public.profile
  where id = p_user_id;
  
  -- If user has unrestricted_operations flag, always allow
  if v_profile_flags is not null and 'unrestricted_operations' = any(v_profile_flags) then
    v_allowed := true;
    v_reason := 'User has unrestricted_operations flag';
    v_remaining := 999999; -- Set a high value to indicate unlimited
    
    -- Still log the usage event
    insert into public.usage_events (user_id, op_type, delta)
    values (p_user_id, p_op_type, 1);
    
    -- Return early with allowed result
    v_result := jsonb_build_object(
      'allowed', v_allowed,
      'reason', v_reason,
      'remaining', v_remaining
    );
    
    return v_result;
  end if;

  -- Load current entitlement
  select * into v_entitlement
  from public.entitlements
  where user_id = p_user_id;

  -- If no entitlement exists, user has no access
  if not found then
    v_allowed := false;
    v_reason := 'No subscription found';
    v_remaining := 0;
  else
    -- Determine current period based on operation type
    if p_op_type = 'agentic_request' then
      -- For agentic requests, use a fixed 12-hour rolling window
      -- We track usage in hourly buckets and aggregate the last 12 hours
      
      -- Get or create the current hour's counter for incrementing usage
      v_current_period_end := date_trunc('hour', now()) + interval '1 hour';
      v_current_period_start := date_trunc('hour', now());
      
      select * into v_usage_counter
      from public.usage_counters
      where user_id = p_user_id
        and period_start = v_current_period_start
        and period_end = v_current_period_end;

      if not found then
        -- Create new usage counter for current hour
        insert into public.usage_counters (user_id, period_start, period_end, agentic_requests_used)
        values (p_user_id, v_current_period_start, v_current_period_end, 0)
        returning * into v_usage_counter;
      end if;
      
      -- Calculate rolling 12-hour total usage from all hourly counters in the window
      -- Include any hourly counter that overlaps with the last 12 hours
      select coalesce(sum(agentic_requests_used), 0) into v_rolling_total
      from public.usage_counters
      where user_id = p_user_id
        and period_end > (now() - interval '12 hours')
        and period_start < now();
      
      -- Store the rolling total for the check below
      v_usage_counter.agentic_requests_used := v_rolling_total;
    else
      -- For other operations, use the subscription period
      v_current_period_end := v_entitlement.resets_at;
      if v_current_period_end is null then
        v_current_period_end := now() + interval '1 month';
      end if;
      v_current_period_start := v_current_period_end - interval '1 month';
      
      -- Load or create usage counter for this period
      select * into v_usage_counter
      from public.usage_counters
      where user_id = p_user_id
        and period_start = v_current_period_start
        and period_end = v_current_period_end;

      if not found then
        -- Create new usage counter for this period
        insert into public.usage_counters (user_id, period_start, period_end)
        values (p_user_id, v_current_period_start, v_current_period_end)
        returning * into v_usage_counter;
      end if;
    end if;

    -- Check limits based on operation type
    if p_op_type = 'project' then
      if v_usage_counter.projects_used < v_entitlement.projects_limit then
        v_allowed := true;
        v_remaining := v_entitlement.projects_limit - v_usage_counter.projects_used - 1;
        
        -- Increment usage
        update public.usage_counters
        set projects_used = projects_used + 1,
            updated_at = now()
        where user_id = p_user_id
          and period_start = v_current_period_start
          and period_end = v_current_period_end;
      else
        v_allowed := false;
        v_reason := 'Project limit exceeded';
        v_remaining := 0;
      end if;
    elsif p_op_type = 'agentic_request' then
      if v_usage_counter.agentic_requests_used < v_entitlement.agentic_limit then
        v_allowed := true;
        v_remaining := v_entitlement.agentic_limit - v_usage_counter.agentic_requests_used - 1;
        
        -- Increment usage
        update public.usage_counters
        set agentic_requests_used = agentic_requests_used + 1,
            updated_at = now()
        where user_id = p_user_id
          and period_start = v_current_period_start
          and period_end = v_current_period_end;
      else
        v_allowed := false;
        v_reason := 'Agentic request limit exceeded for this period';
        v_remaining := 0;
      end if;
    else
      v_allowed := false;
      v_reason := 'Unknown operation type';
      v_remaining := 0;
    end if;

    -- Log usage event
    if v_allowed then
      insert into public.usage_events (user_id, op_type, delta)
      values (p_user_id, p_op_type, 1);
    end if;
  end if;

  -- Return result
  v_result := jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'remaining', v_remaining
  );

  return v_result;
end;
$$;

-- Function: enforce_projects_limit - trigger function to check project limit
create or replace function public.enforce_projects_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_result jsonb;
begin
  -- Check authorization
  v_auth_result := public.authorize_operation(new.user_id, 'project');
  
  if not (v_auth_result->>'allowed')::boolean then
    raise exception 'Project limit exceeded: %', v_auth_result->>'reason';
  end if;
  
  return new;
end;
$$;

-- Trigger: enforce project limit on insert
create trigger trg_project_enforce_limit
  before insert on public.project
  for each row execute function public.enforce_projects_limit();

-- Row-level security
alter table public.entitlements enable row level security;
alter table public.usage_counters enable row level security;
alter table public.usage_events enable row level security;

-- Grant basic permissions
grant select on public.entitlements to authenticated;
grant select on public.usage_counters to authenticated;
grant select on public.usage_events to authenticated;
grant select, insert, update on public.entitlements to service_role;
grant select, insert, update on public.usage_counters to service_role;
grant select, insert on public.usage_events to service_role;
grant execute on function public.authorize_operation(uuid, text) to authenticated;
grant execute on function public.authorize_operation(uuid, text) to service_role;

-- Entitlements policies (users can only view their own entitlements)
create policy "Users can view their own entitlements"
  on public.entitlements
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own usage counters"
  on public.usage_counters
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own usage events"
  on public.usage_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

