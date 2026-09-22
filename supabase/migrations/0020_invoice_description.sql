-- 0020 — Facture libre émise depuis la console admin.
--
-- Jusqu'ici une facture ne pouvait naître que d'une inscription ou d'un stage,
-- et sa désignation était déduite des `registrations` / `camp_registrations`
-- rattachées. Pour facturer une prestation ponctuelle (rattrapage, arrangement,
-- séance supplémentaire), il faut pouvoir écrire librement ce qui est facturé.
--
-- Sans cette colonne, l'admin n'avait d'autre choix que d'émettre la facture
-- directement dans Stripe : elle n'existait alors ni dans le suivi, ni dans la
-- comptabilité, ni dans l'espace du parent.

alter table public.invoices
  add column if not exists description text;
