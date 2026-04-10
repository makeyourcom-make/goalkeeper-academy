-- Phase 6 — Espace membre : tables principales + RLS
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. Tables
-- ============================================================================

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  address text,
  city text,
  postal_code text,
  contact_name text,
  website text,
  contract_start date,
  contract_end date,
  contract_status text default 'pending'
    check (contract_status in ('pending', 'active', 'ended', 'cancelled')),
  created_at timestamptz default now()
);

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete set null,
  first_name text not null,
  last_name text not null,
  birth_date date not null,
  level text check (level in ('debutant', 'intermediaire', 'avance', 'competition')),
  dominant_hand text check (dominant_hand in ('droite', 'gauche', 'ambidextre')),
  medical_notes text,
  photo_consent boolean default false,
  registration_type text check (registration_type in ('annuel', 'mensuel', 'particulier', 'club')),
  subscription_status text default 'active'
    check (subscription_status in ('active', 'paused', 'cancelled', 'ended')),
  registered_at timestamptz default now()
);

create index if not exists children_parent_id_idx on public.children(parent_id);

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  bio text,
  certifications text[],
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  coach_id uuid references public.coaches(id),
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int default 12,
  level text,
  recurrence_rule text,
  status text default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

create index if not exists sessions_starts_at_idx on public.sessions(starts_at);

create table if not exists public.session_attendees (
  session_id uuid references public.sessions(id) on delete cascade,
  child_id uuid references public.children(id) on delete cascade,
  attendance_status text default 'registered'
    check (attendance_status in ('registered', 'present', 'absent', 'excused')),
  notes text,
  created_at timestamptz default now(),
  primary key (session_id, child_id)
);

create table if not exists public.camps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  location text not null,
  starts_at date not null,
  ends_at date not null,
  daily_start time,
  daily_end time,
  min_age int,
  max_age int,
  capacity int default 20,
  price_cents int not null,
  cover_image_url text,
  status text default 'draft'
    check (status in ('draft', 'open', 'full', 'closed', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

create table if not exists public.camp_registrations (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'refunded')),
  amount_cents int not null,
  stripe_session_id text,
  registered_at timestamptz default now(),
  unique (camp_id, child_id)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  profile_id uuid not null references public.profiles(id),
  child_id uuid references public.children(id),
  camp_registration_id uuid references public.camp_registrations(id),
  type text not null check (type in ('subscription', 'camp', 'particulier', 'club_contract')),
  amount_cents int not null,
  currency text default 'CHF',
  status text default 'pending'
    check (status in ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  due_date date,
  paid_at timestamptz,
  payment_method text check (payment_method in ('stripe', 'twint', 'qr_bill', 'bank_transfer', 'cash')),
  stripe_session_id text,
  pdf_url text,
  issued_at timestamptz default now()
);

create index if not exists invoices_profile_id_idx on public.invoices(profile_id);

create table if not exists public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  coach_id uuid references public.coaches(id),
  session_id uuid references public.sessions(id),
  category text check (category in ('technique', 'physique', 'mental', 'tactique', 'general')),
  rating int check (rating between 1 and 10),
  note text,
  created_at timestamptz default now()
);

-- ============================================================================
-- 2. Helper: check admin role without recursive policy lookups
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================================
-- 3. Row Level Security
-- ============================================================================

-- ----- children -----
alter table public.children enable row level security;

drop policy if exists "children_select_own" on public.children;
create policy "children_select_own"
  on public.children for select
  using (parent_id = auth.uid() or public.is_admin());

drop policy if exists "children_insert_own" on public.children;
create policy "children_insert_own"
  on public.children for insert
  with check (parent_id = auth.uid());

drop policy if exists "children_update_own" on public.children;
create policy "children_update_own"
  on public.children for update
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());

drop policy if exists "children_delete_own" on public.children;
create policy "children_delete_own"
  on public.children for delete
  using (parent_id = auth.uid());

-- ----- clubs -----
alter table public.clubs enable row level security;

drop policy if exists "clubs_select_own" on public.clubs;
create policy "clubs_select_own"
  on public.clubs for select
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "clubs_modify_own" on public.clubs;
create policy "clubs_modify_own"
  on public.clubs for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ----- coaches (read-only for everyone authenticated; writes admin only) -----
alter table public.coaches enable row level security;

drop policy if exists "coaches_select_all" on public.coaches;
create policy "coaches_select_all"
  on public.coaches for select
  using (auth.role() = 'authenticated');

drop policy if exists "coaches_admin_write" on public.coaches;
create policy "coaches_admin_write"
  on public.coaches for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----- sessions (read-only for parents of attendees, admin write) -----
alter table public.sessions enable row level security;

drop policy if exists "sessions_select_attendee" on public.sessions;
create policy "sessions_select_attendee"
  on public.sessions for select
  using (
    public.is_admin()
    or exists (
      select 1
      from public.session_attendees sa
      join public.children c on c.id = sa.child_id
      where sa.session_id = sessions.id and c.parent_id = auth.uid()
    )
  );

drop policy if exists "sessions_admin_write" on public.sessions;
create policy "sessions_admin_write"
  on public.sessions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----- session_attendees -----
alter table public.session_attendees enable row level security;

drop policy if exists "attendees_select_own" on public.session_attendees;
create policy "attendees_select_own"
  on public.session_attendees for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.children c
      where c.id = session_attendees.child_id and c.parent_id = auth.uid()
    )
  );

drop policy if exists "attendees_admin_write" on public.session_attendees;
create policy "attendees_admin_write"
  on public.session_attendees for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----- camps (catalog: public read of open camps, admin write) -----
alter table public.camps enable row level security;

drop policy if exists "camps_select_open" on public.camps;
create policy "camps_select_open"
  on public.camps for select
  using (status in ('open', 'full', 'completed') or public.is_admin());

drop policy if exists "camps_admin_write" on public.camps;
create policy "camps_admin_write"
  on public.camps for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----- camp_registrations -----
alter table public.camp_registrations enable row level security;

drop policy if exists "camp_reg_select_own" on public.camp_registrations;
create policy "camp_reg_select_own"
  on public.camp_registrations for select
  using (parent_id = auth.uid() or public.is_admin());

drop policy if exists "camp_reg_insert_own" on public.camp_registrations;
create policy "camp_reg_insert_own"
  on public.camp_registrations for insert
  with check (parent_id = auth.uid());

drop policy if exists "camp_reg_update_admin" on public.camp_registrations;
create policy "camp_reg_update_admin"
  on public.camp_registrations for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "camp_reg_delete_own" on public.camp_registrations;
create policy "camp_reg_delete_own"
  on public.camp_registrations for delete
  using (parent_id = auth.uid() or public.is_admin());

-- ----- invoices -----
alter table public.invoices enable row level security;

drop policy if exists "invoices_select_own" on public.invoices;
create policy "invoices_select_own"
  on public.invoices for select
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "invoices_admin_write" on public.invoices;
create policy "invoices_admin_write"
  on public.invoices for all
  using (public.is_admin())
  with check (public.is_admin());

-- ----- progress_notes -----
alter table public.progress_notes enable row level security;

drop policy if exists "progress_select_parent" on public.progress_notes;
create policy "progress_select_parent"
  on public.progress_notes for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.children c
      where c.id = progress_notes.child_id and c.parent_id = auth.uid()
    )
  );

drop policy if exists "progress_admin_write" on public.progress_notes;
create policy "progress_admin_write"
  on public.progress_notes for all
  using (public.is_admin())
  with check (public.is_admin());
