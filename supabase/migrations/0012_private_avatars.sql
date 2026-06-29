-- ============================================================================
-- 0012 — Make the "avatars" bucket PRIVATE (it holds parent/coach avatars AND
-- keeper/minor photos). Files are now served via short-lived signed URLs
-- generated server-side. Reads are restricted to the owner (their own uid
-- folder) or an admin; writes stay owner-only (policies from 0007 unchanged).
-- ============================================================================

update storage.buckets set public = false where id = 'avatars';

drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
