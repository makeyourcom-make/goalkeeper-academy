-- ============================================================================
-- 0006 — Planning: call time + attendance (present/absent) + coach access
-- Idempotent: safe to re-run.
-- ============================================================================

-- Heure de convocation (call time), distinct from starts_at.
alter table public.sessions
  add column if not exists meet_at timestamptz;

-- Parents/clubs can flip their own child's attendance (present / absent).
drop policy if exists "attendees_update_own" on public.session_attendees;
create policy "attendees_update_own"
  on public.session_attendees
  for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.children c
      where c.id = session_attendees.child_id and c.parent_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.children c
      where c.id = session_attendees.child_id and c.parent_id = auth.uid()
    )
  );

-- A coach can read the sessions they run...
drop policy if exists "sessions_select_coach" on public.sessions;
create policy "sessions_select_coach"
  on public.sessions
  for select
  using (
    coach_id in (
      select id from public.coaches where profile_id = auth.uid()
    )
  );

-- ...and the keepers convened to those sessions.
drop policy if exists "attendees_select_coach" on public.session_attendees;
create policy "attendees_select_coach"
  on public.session_attendees
  for select
  using (
    exists (
      select 1
      from public.sessions s
      join public.coaches co on co.id = s.coach_id
      where s.id = session_attendees.session_id and co.profile_id = auth.uid()
    )
  );
