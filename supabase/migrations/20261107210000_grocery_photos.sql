-- Photos of groceries kept on the owner's products (photo flow of the
-- assistant). One private bucket and one table:
--
-- - grocery-photos (private): files under users/<owner id>/groceries/, read
--   through signed URLs. Only their owner uploads, reads, replaces or deletes
--   them. The account deletion (deleteUserFiles) already erases users/<id>/.
-- - user_product_photos: the latest photo of a product, per user. Products
--   are a catalogue shared by every account, so the photo is never written on
--   products itself. The path must sit in the user's own folder. The hourly
--   deletion job erases these rows (it covers every table with a user_id).
--
-- Idempotent.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('grocery-photos', 'grocery-photos', false, 2097152, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = false,
  file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS grocery_photos_insert_own ON storage.objects;
CREATE POLICY grocery_photos_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'grocery-photos' AND owner_id = auth.uid()::text
    AND name LIKE 'users/' || auth.uid()::text || '/groceries/%');
DROP POLICY IF EXISTS grocery_photos_select_own ON storage.objects;
CREATE POLICY grocery_photos_select_own ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'grocery-photos' AND owner_id = auth.uid()::text);
DROP POLICY IF EXISTS grocery_photos_update_own ON storage.objects;
CREATE POLICY grocery_photos_update_own ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'grocery-photos' AND owner_id = auth.uid()::text)
  WITH CHECK (bucket_id = 'grocery-photos' AND owner_id = auth.uid()::text
    AND name LIKE 'users/' || auth.uid()::text || '/groceries/%');
DROP POLICY IF EXISTS grocery_photos_delete_own ON storage.objects;
CREATE POLICY grocery_photos_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'grocery-photos' AND owner_id = auth.uid()::text);

CREATE TABLE IF NOT EXISTS public.user_product_photos (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  photo_path text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT user_product_photos_own_folder CHECK (photo_path LIKE 'users/' || user_id::text || '/groceries/%')
);
ALTER TABLE public.user_product_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_product_photos_own ON public.user_product_photos;
CREATE POLICY user_product_photos_own ON public.user_product_photos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_product_photos TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
