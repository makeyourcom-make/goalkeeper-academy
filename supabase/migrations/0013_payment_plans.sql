-- ============================================================================
-- 0013 — Payment plans (installments) for the inscription wizard.
--   * One payment_plan per order: method (card/twint/qr_bill) + cadence
--     (annual/semiannual/quarterly/monthly) + how many installments.
--   * Card plans with >1 installment are backed by a Stripe subscription;
--     the webhook counts paid installments and cancels it after the last one.
--   * twint/qr_bill plans are backed by N pending invoices with staggered
--     due dates (no auto-charge possible with those methods).
--   * invoices gains payment_plan_id + installment_number so each installment
--     is its own invoice row.
-- Idempotent: safe to re-run.
-- ============================================================================

create table if not exists public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  method text not null check (method in ('card', 'twint', 'qr_bill')),
  cadence text not null
    check (cadence in ('annual', 'semiannual', 'quarterly', 'monthly')),
  installments_total int not null default 1,
  installments_paid int not null default 0,
  amount_total_cents int not null default 0,
  amount_per_installment_cents int not null default 0,
  currency text not null default 'CHF',
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'cancelled', 'past_due')),
  created_at timestamptz default now()
);

create index if not exists payment_plans_profile_id_idx
  on public.payment_plans (profile_id);
create index if not exists payment_plans_subscription_idx
  on public.payment_plans (stripe_subscription_id);

alter table public.payment_plans enable row level security;

drop policy if exists "payment_plans_select_own" on public.payment_plans;
create policy "payment_plans_select_own"
  on public.payment_plans for select
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "payment_plans_admin_write" on public.payment_plans;
create policy "payment_plans_admin_write"
  on public.payment_plans for all
  using (public.is_admin())
  with check (public.is_admin());

-- Link each installment invoice to its plan.
alter table public.invoices
  add column if not exists payment_plan_id uuid
    references public.payment_plans(id) on delete set null;
alter table public.invoices
  add column if not exists installment_number int;

create index if not exists invoices_payment_plan_id_idx
  on public.invoices (payment_plan_id);

-- Link each registration to its plan (optional; the invoice link stays).
alter table public.registrations
  add column if not exists payment_plan_id uuid
    references public.payment_plans(id) on delete set null;
