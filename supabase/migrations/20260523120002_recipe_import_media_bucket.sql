-- =====================================================================
-- PRP-240 PR1 — Private bucket `recipe-import-media` + Storage RLS.
--
-- Holds two kinds of objects (segregated by path):
--   - user-uploaded videos when URL download fails or is blocked
--     (signed-URL upload from the browser, see PRP §8.2);
--   - frames extracted from videos by the worker (PR3.5) when
--     MediaRightsPolicy permits persistence.
--
-- Path convention (mirrors `recipe-media`):
--   users/{user_id}/imports/{import_id}/{filename}
-- so segment[2] = user_id and the same `(storage.foldername(name))[2]
-- = auth.uid()::text` RLS pattern applies.
--
-- The worker uses the service role (bypasses RLS) when reading uploads
-- or writing extracted frames.
--
-- Idempotent. Safe to re-apply.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-import-media',
  'recipe-import-media',
  FALSE,
  -- 500 MB hard cap, PRP §6.3. Per-user/per-file quotas are enforced
  -- by the API when minting signed upload URLs (PR4).
  524288000,
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---- Storage RLS ----------------------------------------------------
-- Path: users/{user_id}/imports/{import_id}/{filename}
-- segment[1] = 'users', segment[2] = user_id.

DROP POLICY IF EXISTS "recipe_import_media_select_own" ON storage.objects;
CREATE POLICY "recipe_import_media_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recipe-import-media'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "recipe_import_media_insert_own" ON storage.objects;
CREATE POLICY "recipe_import_media_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-import-media'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "recipe_import_media_update_own" ON storage.objects;
CREATE POLICY "recipe_import_media_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recipe-import-media'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "recipe_import_media_delete_own" ON storage.objects;
CREATE POLICY "recipe_import_media_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recipe-import-media'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
