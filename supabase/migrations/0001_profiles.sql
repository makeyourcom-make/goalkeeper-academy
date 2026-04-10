-- Phase 5 — Auth + profiles
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Idempotent: safe to re-run.

-- ============================================================================
-- 1. profiles table — extends auth.users
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text,
  last_name text,
  phone text,
  role text not null default 'parent'
    check (role in ('parent', 'club', 'coach', 'admin')),
  language text not null default 'fr'
    check (language in ('fr', 'en')),
  marketing_consent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- updated_at auto-touch
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 2. Auto-create profile on auth.users insert
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, language)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'parent'),
    coalesce(new.raw_user_meta_data->>'language', 'fr')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 3. Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;

-- Read: a user can read their own profile. Admins can read any profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Update: a user can update their own profile (but cannot escalate `role`).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- Insert: blocked from the client. Profiles are created exclusively by the
-- on_auth_user_created trigger.
drop policy if exists "profiles_insert_block" on public.profiles;
create policy "profiles_insert_block"
  on public.profiles
  for insert
  with check (false);

-- Delete: blocked from the client. Use auth.users cascade if needed.
drop policy if exists "profiles_delete_block" on public.profiles;
create policy "profiles_delete_block"
  on public.profiles
  for delete
  using (false);
