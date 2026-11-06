-- Files of a user in Supabase Storage, listed for the API, which erases them
-- through the Storage API when the user asks for deletion
-- (POST /api/v1/settings/delete-request). Deleting storage.objects rows in SQL
-- would leave the files themselves in place.
--
-- Two kinds of files belong to the user:
-- - what they uploaded from the app with their session (owner / owner_id):
--   recipe photos, product photos;
-- - what the API stored for them with the service role, under users/<id>/
--   (recipe-media: imports, thumbnails), whose owner is empty.
--
-- Service role only. Idempotent.
BEGIN;

CREATE OR REPLACE FUNCTION public.list_user_storage_objects(p_user uuid, p_limit integer DEFAULT 1000)
RETURNS TABLE(bucket_id text, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT o.bucket_id, o.name FROM storage.objects o
  WHERE o.owner_id = p_user::text OR o.owner = p_user OR o.name LIKE 'users/' || p_user::text || '/%'
  ORDER BY o.bucket_id, o.name
  LIMIT least(greatest(coalesce(p_limit, 1000), 1), 1000)
$$;
REVOKE ALL ON FUNCTION public.list_user_storage_objects(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_user_storage_objects(uuid, integer) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
