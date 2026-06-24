-- ============================================================================
-- 0009 — Fix infinite RLS recursion between sessions <-> session_attendees.
--
-- 0002's sessions_select_attendee reads session_attendees, and 0006's
-- attendees_select_coach reads sessions. Each select re-triggers the other's
-- policies => "infinite recursion detected in policy for relation sessions",
-- which broke every INSERT ... RETURNING on sessions.
--
-- Fix: move the cross-table lookups into SECURITY DEFINER helpers (they bypass
-- RLS, exactly like is_admin()), so the policies no longer reference each other
-- through the RLS engine.
-- ============================================================================

create or replace function public.is_session_parent(p_session uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.session_attendees sa
    join public.children c on c.id = sa.child_id
    where sa.session_id = p_session and c.parent_id = auth.uid()
  );
$$;

create or replace function public.is_session_coach(p_session uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.sessions s
    join public.coaches co on co.id = s.coach_id
    where s.id = p_session and co.profile_id = auth.uid()
  );
$$;

grant execute on function public.is_session_parent(uuid) to authenticated, anon;
grant execute on function public.is_session_coach(uuid) to authenticated, anon;

-- sessions: admin, parent of an attending keeper, or the session's coach.
drop policy if exists "sessions_select_attendee" on public.sessions;
create policy "sessions_select_attendee"
  on public.sessions for select
  using (public.is_admin() or public.is_session_parent(sessions.id));

drop policy if exists "sessions_select_coach" on public.sessions;
create policy "sessions_select_coach"
  on public.sessions for select
  using (public.is_session_coach(sessions.id));

-- session_attendees: coach of the related session can read.
drop policy if exists "attendees_select_coach" on public.session_attendees;
create policy "attendees_select_coach"
  on public.session_attendees for select
  using (public.is_session_coach(session_attendees.session_id));
