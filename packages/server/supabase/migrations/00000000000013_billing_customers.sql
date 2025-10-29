-- Billing: billing_customers table for Stripe customer mapping

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
