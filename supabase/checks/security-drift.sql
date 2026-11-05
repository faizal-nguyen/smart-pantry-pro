-- Security drift check: read-only, safe to run on production at any time
-- (Supabase SQL editor). supabase_migrations.schema_migrations does not
-- reflect what was applied by hand, so this checks the objects themselves.
--
-- Healthy database: "ok" is true and every list is null.
WITH
tables_without_rls AS (
  SELECT c.relname AS name
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
),
-- SECURITY DEFINER bypasses RLS: anon must not reach any of them (trigger
-- functions excepted, they cannot be called directly).
definer_callable_by_anon AS (
  SELECT p.oid::regprocedure::text AS name
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef
    AND p.prorettype <> 'trigger'::regtype
    AND has_function_privilege('anon', p.oid, 'EXECUTE')
),
-- Signed-in callers passing a user id must be checked against auth.uid().
definer_user_arg_without_guard AS (
  SELECT p.oid::regprocedure::text AS name
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef
    AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
    AND EXISTS (SELECT 1 FROM unnest(p.proargnames) a WHERE a ILIKE '%user%')
    AND position('auth.uid()' IN p.prosrc) = 0
),
-- Policies that let visitors without an account write.
writes_open_to_anon AS (
  SELECT tablename || '.' || policyname AS name
  FROM pg_policies
  WHERE schemaname = 'public'
    AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    AND roles && ARRAY['public', 'anon']::name[]
    AND coalesce(qual, with_check) = 'true'
),
-- user_metadata is editable by the user: never base access on it.
policies_on_user_metadata AS (
  SELECT schemaname || '.' || tablename || '.' || policyname AS name
  FROM pg_policies
  WHERE coalesce(qual, '') || coalesce(with_check, '') ILIKE '%user_metadata%'
)
SELECT json_build_object(
  'ok', NOT EXISTS (SELECT 1 FROM tables_without_rls)
    AND NOT EXISTS (SELECT 1 FROM definer_callable_by_anon)
    AND NOT EXISTS (SELECT 1 FROM definer_user_arg_without_guard)
    AND NOT EXISTS (SELECT 1 FROM writes_open_to_anon)
    AND NOT EXISTS (SELECT 1 FROM policies_on_user_metadata),
  'tables_without_rls', (SELECT json_agg(name ORDER BY name) FROM tables_without_rls),
  'definer_callable_by_anon', (SELECT json_agg(name ORDER BY name) FROM definer_callable_by_anon),
  'definer_user_arg_without_guard', (SELECT json_agg(name ORDER BY name) FROM definer_user_arg_without_guard),
  'writes_open_to_anon', (SELECT json_agg(name ORDER BY name) FROM writes_open_to_anon),
  'policies_on_user_metadata', (SELECT json_agg(name ORDER BY name) FROM policies_on_user_metadata)
) AS security_drift;
