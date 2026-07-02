-- ============================================================================
-- 0017 — SÉCURITÉ : empêcher l'auto-attribution d'un rôle privilégié à l'inscription.
--
-- Faille : `handle_new_user` recopiait `raw_user_meta_data->>'role'` tel quel.
-- La clé anon Supabase étant publique, un attaquant pouvait appeler
-- /auth/v1/signup avec {"data":{"role":"admin"}} et se créer un compte admin.
--
-- Correctif : seuls 'parent' et 'club' sont auto-attribuables à l'inscription.
-- 'coach' et 'admin' ne s'obtiennent que par promotion manuelle (service-role,
-- côté admin) — jamais via les métadonnées d'inscription.
-- Idempotent : safe à relancer.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := new.raw_user_meta_data->>'role';
begin
  insert into public.profiles (id, email, role, language)
  values (
    new.id,
    new.email,
    -- Whitelist stricte : ne jamais faire confiance aux métadonnées client.
    case when requested in ('parent', 'club') then requested else 'parent' end,
    coalesce(new.raw_user_meta_data->>'language', 'fr')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
