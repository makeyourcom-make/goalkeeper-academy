-- ============================================================================
-- 0004 — Coaches module
-- ----------------------------------------------------------------------------
-- * IBAN lives on profiles (the coach edits it via their own-profile RLS).
-- * Rate per session + coach metadata live on coaches (admin-managed).
-- * Monthly payment recaps in coach_payments (admin marks paid; coach reads own).
-- Idempotent: safe to re-run.
-- ============================================================================

-- IBAN on the profile (coach-editable; protected by profiles_update_own).
alter table public.profiles
  add column if not exists iban text;

-- Coach fiche fields.
alter table public.coaches
  add column if not exists rate_per_session numeric(8, 2) not null default 0;
alter table public.coaches
  add column if not exists speciality text;
alter table public.coaches
  add column if not exists active boolean not null default true;

-- Tighten reads: a coach reads only their own coach row; admins read all.
-- (0002's coaches_select_all let any authenticated user read every coach.)
drop policy if exists "coaches_select_all" on public.coaches;
drop policy if exists "coaches_select_own_or_admin" on public.coaches;
create policy "coaches_select_own_or_admin"
  on public.coaches
  for select
  using (profile_id = auth.uid() or public.is_admin());
-- writes remain admin-only (coaches_admin_write, defined in 0002).

-- ----------------------------------------------------------------------------
-- Monthly payment recap per coach
-- ----------------------------------------------------------------------------
create table if not exists public.coach_payments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  period text not null, -- 'YYYY-MM'
  sessions_count int not null default 0,
  rate_per_session numeric(8, 2) not null default 0,
  amount numeric(10, 2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  paid_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (coach_id, period)
);

drop trigger if exists coach_payments_touch_updated_at on public.coach_payments;
create trigger coach_payments_touch_updated_at
  before update on public.coach_payments
  for each row execute function public.touch_updated_at();

alter table public.coach_payments enable row level security;

-- A coach reads their own recaps; admins read all.
drop policy if exists "coach_payments_select_own_or_admin" on public.coach_payments;
create policy "coach_payments_select_own_or_admin"
  on public.coach_payments
  for select
  using (
    public.is_admin()
    or coach_id in (
      select id from public.coaches where profile_id = auth.uid()
    )
  );

-- Only admins create/update/delete payment recaps.
drop policy if exists "coach_payments_admin_write" on public.coach_payments;
create policy "coach_payments_admin_write"
  on public.coach_payments
  for all
  using (public.is_admin())
  with check (public.is_admin());
