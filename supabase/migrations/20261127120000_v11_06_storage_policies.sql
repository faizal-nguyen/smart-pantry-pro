-- V11-06 S1 (lot 1): product photos owner-only, temp-ocr closed.
--
-- product-images (public bucket) kept the broad policies of 20250105000005 and
-- 20250803074432: any signed-in user could replace or delete every product
-- photo. As for recipe-images (20261107090000), any signed-in user uploads and
-- only the file's owner reads its row, replaces or deletes it (Storage needs
-- select with update and delete). Photos are displayed through their public
-- URL (useImageManagement), outside these policies. The bucket gets the size
-- and type limits recipe-images has.
--
-- temp-ocr: no code uses it, and 20250804120000 let any signed-in user read,
-- write and delete every file in it. Its policy is dropped, which closes it to
-- every signed-in user; removing the bucket itself belongs to E8.
--
-- Production state is unknown (migrations are applied by hand, policies may
-- have been added in the dashboard), so every policy naming either bucket is
-- dropped, whatever its name, and the migration stops if a permissive policy
-- open to the app's roles names no bucket at all: it would cover both.
--
-- Exception to « no migration before E8 » (PRP V11-06), decided on
-- 2026-11-27. Idempotent. Rollback: docs/implementations/V11-06-S1.md.
BEGIN;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '''(product-images|temp-ocr)'''
      AND policyname NOT IN ('product_images_insert', 'product_images_select_own', 'product_images_update_own', 'product_images_delete_own')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND permissive = 'PERMISSIVE'
      AND roles && ARRAY['public', 'anon', 'authenticated']::name[]
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) !~ 'bucket_id'
  ) THEN
    RAISE EXCEPTION 'A permissive storage.objects policy names no bucket: it would still open product-images and temp-ocr. Review it first.';
  END IF;
END $$;

-- As for recipe-images: the Storage API sets the owner from the session token,
-- never from the client, so the upload check only names the bucket.
DROP POLICY IF EXISTS product_images_insert ON storage.objects;
CREATE POLICY product_images_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');
DROP POLICY IF EXISTS product_images_select_own ON storage.objects;
CREATE POLICY product_images_select_own ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-images' AND owner_id = auth.uid()::text);
DROP POLICY IF EXISTS product_images_update_own ON storage.objects;
CREATE POLICY product_images_update_own ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND owner_id = auth.uid()::text)
  WITH CHECK (bucket_id = 'product-images' AND owner_id = auth.uid()::text);
DROP POLICY IF EXISTS product_images_delete_own ON storage.objects;
CREATE POLICY product_images_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND owner_id = auth.uid()::text);

UPDATE storage.buckets SET file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'product-images';

COMMIT;
