-- 0018 — Email log. Records every outbound email (manual sends from the admin
-- console + automatic transactional emails) so the admin can track what was
-- sent. Rows are inserted with the service-role client (bypasses RLS); the admin
-- reads them via the is_admin() policy.

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  cc text,
  bcc text,
  subject text not null,
  kind text not null default 'auto',
  status text not null default 'sent',
  error text,
  sent_at timestamptz not null default now()
);

create index if not exists email_log_sent_at_idx
  on public.email_log (sent_at desc);

alter table public.email_log enable row level security;

drop policy if exists "email_log_admin_read" on public.email_log;
create policy "email_log_admin_read"
  on public.email_log for select
  using (public.is_admin());
