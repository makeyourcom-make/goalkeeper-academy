-- ============================================================================
-- 0005 — Finance: charges (expenses) + comptabilité (income/expense ledger)
-- ----------------------------------------------------------------------------
-- One manual ledger table powers both screens:
--   * "Charges"      → transactions where kind = 'expense'
--   * "Comptabilité" → all transactions + running balance (income - expense)
-- Categories are free text (materiel, equipement, assurance, admin, sponsor,
-- subvention, autre…). Admin-only. Idempotent: safe to re-run.
-- ============================================================================

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('income', 'expense')),
  category text not null,
  label text not null,
  amount numeric(10, 2) not null,
  occurred_on date not null default current_date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at
  before update on public.transactions
  for each row execute function public.touch_updated_at();

alter table public.transactions enable row level security;

drop policy if exists "transactions_admin_all" on public.transactions;
create policy "transactions_admin_all"
  on public.transactions
  for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists transactions_occurred_on_idx
  on public.transactions (occurred_on desc);
