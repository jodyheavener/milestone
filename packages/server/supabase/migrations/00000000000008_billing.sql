-- Billing: Stripe integration, subscriptions, and billing customers
-- This migration handles all billing-related functionality including customer
-- management, product catalog, and subscriptions

-- ============================================================================
-- BILLING CUSTOMERS
-- ============================================================================

-- Table: billing_customers
create table public.billing_customers (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null unique references auth.users(id) on delete cascade,
  stripe_customer_id  text        not null unique,
  created_at          timestamptz not null default now()
);

-- Indexes: billing_customers
create index if not exists idx_billing_customers_user_id
  on public.billing_customers (user_id);

create unique index if not exists idx_billing_customers_stripe_customer_id
  on public.billing_customers (stripe_customer_id);

-- Row-level security
alter table public.billing_customers enable row level security;

-- Grant basic permissions
grant select, insert, update on public.billing_customers to authenticated;
grant select, insert, update on public.billing_customers to service_role;

-- Billing customer policies (users can only view their own customer record)
create policy "Users can view their own billing customer"
  on public.billing_customers
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- STRIPE CATALOG
-- ============================================================================

-- Table: stripe_products
create table public.stripe_products (
  id                  uuid        primary key default gen_random_uuid(),
  stripe_product_id   text        not null unique,
  name                text        not null,
  description         text,
  active              boolean     not null default true,
  metadata            jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Table: stripe_prices
create table public.stripe_prices (
  id                  uuid        primary key default gen_random_uuid(),
  stripe_price_id     text        not null unique,
  stripe_product_id   uuid        not null references public.stripe_products(id) on delete cascade,
  currency            text        not null,
  unit_amount         integer     not null,
  recurring_interval  text,
  type                text        not null check (type in ('recurring', 'one_time')),
  usage_type          text        not null default 'licensed' check (usage_type in ('licensed', 'metered')),
  metadata            jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Indexes: stripe_catalog
create unique index if not exists idx_stripe_products_stripe_product_id
  on public.stripe_products (stripe_product_id);

create index if not exists idx_stripe_products_active
  on public.stripe_products (active);

create unique index if not exists idx_stripe_prices_stripe_price_id
  on public.stripe_prices (stripe_price_id);

create index if not exists idx_stripe_prices_stripe_product_id
  on public.stripe_prices (stripe_product_id);

create index if not exists idx_stripe_prices_type
  on public.stripe_prices (type);

-- Triggers: auto-update updated_at
create trigger trg_stripe_products_updated_at
  before update on public.stripe_products
  for each row execute procedure public.set_updated_at();

create trigger trg_stripe_prices_updated_at
  before update on public.stripe_prices
  for each row execute procedure public.set_updated_at();

-- Row-level security
alter table public.stripe_products enable row level security;
alter table public.stripe_prices enable row level security;

-- Grant basic permissions
grant select on public.stripe_products to authenticated;
grant select on public.stripe_prices to authenticated;
grant select, insert, update on public.stripe_products to service_role;
grant select, insert, update on public.stripe_prices to service_role;

-- Catalog policies (public read for pricing display)
create policy "Anyone can view active products"
  on public.stripe_products
  for select to authenticated
  using (active = true);

create policy "Anyone can view active prices"
  on public.stripe_prices
  for select to authenticated
  using (
    exists (
      select 1 from public.stripe_products p
      where p.id = stripe_prices.stripe_product_id and p.active = true
    )
  );

-- Function: Sync Stripe catalog - calls the edge function to sync products and prices from Stripe
create or replace function public.sync_stripe_catalog()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  response text;
  sync_url text;
  sync_secret text;
begin
  -- Construct the sync function URL
  -- In production, this would be your actual Supabase project URL
  -- For local development, this is the local Supabase URL
  sync_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/sync-stripe-catalog';
  
  -- If no URL is configured, use localhost for local development
  if sync_url is null or sync_url = '' then
    sync_url := 'http://127.0.0.1:54321/functions/v1/sync-stripe-catalog';
  end if;

  -- Get sync secret from environment (optional, for additional security)
  sync_secret := current_setting('app.settings.stripe_sync_secret', true);

  -- Prepare request body
  declare
    request_body text;
  begin
    if sync_secret is not null and sync_secret != '' then
      request_body := json_build_object('secret', sync_secret)::text;
    else
      request_body := '{}';
    end if;

    -- Make HTTP request to the sync function
    select content into response
    from http((
      'POST',
      sync_url,
      ARRAY[
        http_header('Content-Type', 'application/json')
      ],
      'application/json',
      request_body
    ));
  end;

  -- Log the result (you can check this in the Supabase logs)
  raise notice 'Stripe catalog sync completed: %', response;
  
exception
  when others then
    -- Log any errors
    raise notice 'Stripe catalog sync failed: %', SQLERRM;
end;
$$;

-- Schedule the sync job to run daily at 3 AM UTC
-- This will sync all products and prices from Stripe every day
select cron.schedule(
  'stripe-catalog-sync',
  '0 3 * * *', -- Daily at 3 AM UTC
  'select public.sync_stripe_catalog();'
);

-- Grant execute permission on the sync function
grant execute on function public.sync_stripe_catalog() to service_role;

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

-- Table: subscriptions
create table public.subscriptions (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  stripe_subscription_id  text        not null unique,
  status                  text        not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean     not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Add comments to clarify nullable period fields
comment on column public.subscriptions.current_period_start is 'Subscription period start time. May be null for incomplete or transitioning subscriptions.';
comment on column public.subscriptions.current_period_end is 'Subscription period end time. May be null for incomplete or transitioning subscriptions.';

-- Table: subscription_items
create table public.subscription_items (
  id                          uuid        primary key default gen_random_uuid(),
  subscription_id             uuid        not null references public.subscriptions(id) on delete cascade,
  stripe_subscription_item_id text        not null unique,
  stripe_price_id             uuid        not null references public.stripe_prices(id),
  quantity                    integer     not null default 1,
  usage_type                  text        not null default 'licensed' check (usage_type in ('licensed', 'metered')),
  metadata                    jsonb,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Indexes: subscriptions
create unique index if not exists idx_subscriptions_stripe_subscription_id
  on public.subscriptions (stripe_subscription_id);

create index if not exists idx_subscriptions_user_id
  on public.subscriptions (user_id);

create index if not exists idx_subscriptions_status
  on public.subscriptions (status);

create unique index if not exists idx_subscription_items_stripe_subscription_item_id
  on public.subscription_items (stripe_subscription_item_id);

create index if not exists idx_subscription_items_subscription_id
  on public.subscription_items (subscription_id);

create index if not exists idx_subscription_items_stripe_price_id
  on public.subscription_items (stripe_price_id);

-- Triggers: auto-update updated_at
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

create trigger trg_subscription_items_updated_at
  before update on public.subscription_items
  for each row execute procedure public.set_updated_at();

-- Row-level security
alter table public.subscriptions enable row level security;
alter table public.subscription_items enable row level security;

-- Grant basic permissions
grant select, insert, update on public.subscriptions to authenticated;
grant select, insert, update on public.subscription_items to authenticated;
grant select, insert, update, delete on public.subscriptions to service_role;
grant select, insert, update, delete on public.subscription_items to service_role;

-- Subscription policies (users can only access their own subscriptions)
create policy "Users can view their own subscriptions"
  on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own subscription items"
  on public.subscription_items
  for select to authenticated
  using (
    exists (
      select 1 from public.subscriptions s
      where s.id = subscription_items.subscription_id and s.user_id = (select auth.uid())
    )
  );

