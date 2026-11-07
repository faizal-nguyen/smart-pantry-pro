-- The public recipe photos bucket, missing in production: 20250105000005 and
-- 20250804120000 created it but were never applied there (checked
-- 2026-11-07). Photos uploaded from the recipe editor and the thumbnails of
-- imported recipes (PublicThumbnailCopier, under users/<id>/imports/) live
-- here, read through public URLs stored in recipes.image_url.
--
-- Access: any signed-in user uploads; only the file's owner reads its row,
-- updates or deletes it (Storage needs select with update and delete; the
-- former policies let any signed-in user change or delete every file).
-- Displaying goes through the public URL, outside these policies, and so do
-- the API writes (service role). Idempotent.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('recipe-images', 'recipe-images', true, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO UPDATE SET public = true,
  file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Recipe images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to upload recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to view recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to delete their recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to update their recipe images" ON storage.objects;

DROP POLICY IF EXISTS recipe_images_insert ON storage.objects;
CREATE POLICY recipe_images_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'recipe-images');
DROP POLICY IF EXISTS recipe_images_select_own ON storage.objects;
CREATE POLICY recipe_images_select_own ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'recipe-images' AND owner_id = auth.uid()::text);
DROP POLICY IF EXISTS recipe_images_update_own ON storage.objects;
CREATE POLICY recipe_images_update_own ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'recipe-images' AND owner_id = auth.uid()::text)
  WITH CHECK (bucket_id = 'recipe-images' AND owner_id = auth.uid()::text);
DROP POLICY IF EXISTS recipe_images_delete_own ON storage.objects;
CREATE POLICY recipe_images_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'recipe-images' AND owner_id = auth.uid()::text);

COMMIT;
