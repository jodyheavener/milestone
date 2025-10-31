-- Billing: Stripe catalog mirror - products and prices

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
