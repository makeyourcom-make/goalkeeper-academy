-- Keeper (child) photo. Stored in the existing public "avatars" bucket under
-- "<parent_uid>/children/<child_id>.<ext>", which the avatars_*_own policies
-- already authorise (folder[1] = parent uid = auth.uid()).

alter table public.children
  add column if not exists photo_url text;
