-- ============================================================================
-- 0014 — Charges : qui a avancé l'argent (à rembourser) + ticket/justificatif
--   * paid_by       → nom de la personne qui a payé (texte libre)
--   * reimbursed    → a-t-elle été remboursée ?
--   * reimbursed_at → quand
--   * receipt_url   → chemin du justificatif dans le bucket privé "receipts"
-- Bucket "receipts" : privé, accessible aux admins uniquement (lecture via
-- URL signée générée côté serveur, écriture par l'action serveur admin).
-- Idempotent : safe à relancer.
-- ============================================================================

alter table public.transactions
  add column if not exists paid_by text;
alter table public.transactions
  add column if not exists reimbursed boolean not null default false;
alter table public.transactions
  add column if not exists reimbursed_at timestamptz;
alter table public.transactions
  add column if not exists receipt_url text;

insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

drop policy if exists "receipts_admin_all" on storage.objects;
create policy "receipts_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'receipts' and public.is_admin())
  with check (bucket_id = 'receipts' and public.is_admin());
