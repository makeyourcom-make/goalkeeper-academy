-- ============================================================================
-- 0016 — Revenus auto (compta ↔ factures) + rappel de séance au coach.
--   * transactions.invoice_id : lie une ligne de revenu à sa facture, avec un
--     index unique partiel pour ne créer qu'un revenu par facture payée.
--   * sessions.coach_reminded_at : anti-doublon du rappel coach (comme
--     session_attendees.reminded_at pour les parents).
-- Idempotent : safe à relancer.
-- ============================================================================

alter table public.transactions
  add column if not exists invoice_id uuid
    references public.invoices(id) on delete set null;

create unique index if not exists transactions_invoice_id_uidx
  on public.transactions (invoice_id)
  where invoice_id is not null;

alter table public.sessions
  add column if not exists coach_reminded_at timestamptz;
