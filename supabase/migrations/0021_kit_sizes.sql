-- 0021 — Tailles d'équipement du gardien (gants et haut).
--
-- Commander des gants ou un maillot imposait de redemander la taille à chaque
-- famille. Elle vit désormais sur la fiche du gardien, modifiable à tout moment
-- par le parent ou le club depuis l'espace membre: un enfant de 10 ans change
-- de taille deux fois par saison.
--
-- Valeurs libres volontairement (pas de contrainte CHECK): les gammes de
-- tailles varient d'un fabricant à l'autre, et une liste figée en base
-- obligerait une migration à chaque ajustement. Les choix proposés sont
-- cadrés par le formulaire.

alter table public.children
  add column if not exists glove_size text,
  add column if not exists shirt_size text;
