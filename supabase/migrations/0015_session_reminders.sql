-- ============================================================================
-- 0015 — Rappels de séance : marqueur anti-doublon sur session_attendees.
-- Le cron quotidien envoie un rappel 3 jours avant la séance et pose
-- reminded_at pour ne jamais renvoyer deux fois le même rappel.
-- Idempotent : safe à relancer.
-- ============================================================================

alter table public.session_attendees
  add column if not exists reminded_at timestamptz;
