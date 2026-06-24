-- Group recurring sessions so a whole series can be edited or deleted at once.
-- A one-off session has series_id = null; a weekly recurrence shares one uuid.

alter table public.sessions
  add column if not exists series_id uuid;

create index if not exists sessions_series_id_idx
  on public.sessions (series_id);
