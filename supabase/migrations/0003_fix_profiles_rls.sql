-- ============================================================================
-- 0003 — Fix infinite recursion in profiles RLS policies
-- ----------------------------------------------------------------------------
-- 0001 declared the profiles SELECT/UPDATE policies with inline subqueries on
-- public.profiles *inside* a policy ON public.profiles → infinite recursion
-- (Postgres error 42P17). We rewrite them using SECURITY DEFINER helpers, which
-- run as the function owner and therefore bypass RLS (no recursion).
-- Idempotent: safe to re-run.
-- ============================================================================

-- Returns the caller's own role without triggering RLS on profiles.
create or replace function public.my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- SELECT: a user reads their own profile; admins read any (via is_admin()).
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

-- UPDATE: a user updates their own profile but cannot escalate `role`
-- (compared via the SECURITY DEFINER helper instead of a recursive subquery).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.my_role());
