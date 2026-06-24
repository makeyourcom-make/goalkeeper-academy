-- ============================================================================
-- 0011 — Subscription registrations from the inscription wizard.
--   * camp_registrations stays camp-specific.
--   * registrations covers season / tour / single-session formulas.
-- One invoice per order (the discounted basket the client pays); one
-- registration row per keeper, all sharing that invoice_id.
-- Also: auto-generate invoice numbers (GKA-YYYY-00001).
-- ============================================================================

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  audience text not null check (audience in ('youth', 'adult')),
  formula text not null check (formula in ('single', 'tour1', 'tour2', 'season')),
  sessions_count int not null default 0,
  amount_cents int not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'refunded')),
  stripe_session_id text,
  created_at timestamptz default now()
);

create index if not exists registrations_profile_id_idx
  on public.registrations (profile_id);
create index if not exists registrations_invoice_id_idx
  on public.registrations (invoice_id);

alter table public.registrations enable row level security;

drop policy if exists "registrations_select_own" on public.registrations;
create policy "registrations_select_own"
  on public.registrations for select
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "registrations_admin_write" on public.registrations;
create policy "registrations_admin_write"
  on public.registrations for all
  using (public.is_admin())
  with check (public.is_admin());

-- Auto invoice number: GKA-2026-00001, 00002, ...
create sequence if not exists public.invoice_number_seq;
alter table public.invoices
  alter column invoice_number set default
    'GKA-' || to_char(now(), 'YYYY') || '-' ||
    lpad(nextval('public.invoice_number_seq')::text, 5, '0');
