-- Billing: Subscriptions and subscription items

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
