-- 0022 — Consentement aux CGV (droit à l'image compris). Trace la date à
-- laquelle le client a accepté les conditions générales au moment d'une
-- inscription, pour pouvoir en apporter la preuve. Renseignée par le client
-- service-role depuis submitRegistration ; aucune politique RLS à ajouter (la
-- colonne suit celles déjà en place sur profiles).

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;
