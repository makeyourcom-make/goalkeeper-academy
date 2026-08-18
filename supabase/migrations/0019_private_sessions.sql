-- 0019 — "Entraînement privé" : créneau bloqué dans l'agenda pour les autres
-- obligations foot des coachs (club, sélection, etc.). Il occupe une place dans
-- le planning — ce qui évite de programmer une séance académie au même moment —
-- mais il est exclu de tout décompte : forfaits des gardiens, rémunérations
-- coach, convocations et rappels.

alter table public.sessions
  add column if not exists is_private boolean not null default false;

-- Le planning filtre souvent par date + type ; cet index garde la liste rapide.
create index if not exists sessions_is_private_idx
  on public.sessions (is_private, starts_at desc);
