-- =====================================================================
-- PRP-220.24 §5.6/§5.7 — Supabase Storage bucket `recipe-media`
--
-- Private bucket. The application server signs URLs at read time when
-- the asset is accessed. The bucket id matches the env-driven default
-- in MediaUploadService (`MEDIA_STORAGE_BUCKET`, fallback
-- `recipe-media`).
--
-- The upload service uses the path convention
-- `users/{user_id}/{kind}/{yyyy}/{mm}/{filename}.{ext}`
-- (cf. MediaUploadService.buildStorageKey). Storage RLS therefore
-- checks `(storage.foldername(name))[2] = auth.uid()` — segment[1]
-- is the literal "users", segment[2] is the user id.
--
-- Idempotent. Safe to re-apply.
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-media',
  'recipe-media',
  FALSE,
  -- 100 MB hard cap at the Storage layer. Application-level quotas
  -- (PRP §5.5) are stricter for free-tier users (50 MB / file).
  104857600,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---- Storage RLS policies -------------------------------------------
-- The path convention is `{user_id}/{media_asset_id}.{ext}`. We compare
-- the first path segment to auth.uid() so a user can only manipulate
-- objects under their own folder.

DROP POLICY IF EXISTS "media_assets_select_own" ON storage.objects;
CREATE POLICY "media_assets_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recipe-media'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "media_assets_insert_own" ON storage.objects;
CREATE POLICY "media_assets_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-media'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "media_assets_update_own" ON storage.objects;
CREATE POLICY "media_assets_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recipe-media'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "media_assets_delete_own" ON storage.objects;
CREATE POLICY "media_assets_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recipe-media'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
