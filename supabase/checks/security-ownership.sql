-- Ownership and least-privilege check (20261108160000_security_ownership.sql):
-- read-only, safe to run on production at any time (Supabase SQL editor).
--
-- Healthy database: "ok" is true and every list is null.
WITH
-- Recipes and their ingredients are read by their owner, or when public.
open_recipe_reads AS (
  SELECT tablename || '.' || policyname AS name
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename IN ('recipes', 'recipe_ingredients')
    AND cmd IN ('SELECT', 'ALL') AND coalesce(qual, '') = 'true'
),
-- The shared catalogue is changed by the API's service role only.
product_changes_by_users AS (
  SELECT r.rolname || ':' || p.privilege AS name
  FROM (VALUES ('anon'), ('authenticated')) r(rolname), (VALUES ('UPDATE'), ('DELETE')) p(privilege)
  WHERE to_regclass('public.products') IS NOT NULL AND has_table_privilege(r.rolname, 'public.products', p.privilege)
),
old_inventory_functions AS (
  SELECT p.oid::regprocedure::text AS name
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('consume_inventory_item', 'transfer_inventory', 'create_shopping_from_recipe')
),
-- Visitors without an account only read the catalogue and the reference tables.
anon_grants AS (
  SELECT table_name || ':' || privilege_type AS name
  FROM information_schema.role_table_grants
  WHERE grantee = 'anon' AND table_schema = 'public'
    AND (privilege_type <> 'SELECT' OR table_name NOT IN ('products', 'recipes_catalog', 'active_promotions',
         'emergency_meal_templates', 'seasonal_products', 'store_partnerships'))
),
-- TRUNCATE ignores RLS: only service_role keeps it (and TRIGGER, REFERENCES).
dangerous_grants AS (
  SELECT grantee || ':' || table_name || ':' || privilege_type AS name
  FROM information_schema.role_table_grants
  WHERE grantee IN ('anon', 'authenticated') AND table_schema = 'public'
    AND privilege_type IN ('TRUNCATE', 'TRIGGER', 'REFERENCES')
)
SELECT json_build_object(
  'ok', NOT EXISTS (SELECT 1 FROM open_recipe_reads) AND NOT EXISTS (SELECT 1 FROM product_changes_by_users)
    AND NOT EXISTS (SELECT 1 FROM old_inventory_functions) AND NOT EXISTS (SELECT 1 FROM anon_grants)
    AND NOT EXISTS (SELECT 1 FROM dangerous_grants),
  'open_recipe_reads', (SELECT json_agg(name ORDER BY name) FROM open_recipe_reads),
  'product_changes_by_users', (SELECT json_agg(name ORDER BY name) FROM product_changes_by_users),
  'old_inventory_functions', (SELECT json_agg(name ORDER BY name) FROM old_inventory_functions),
  'anon_grants', (SELECT json_agg(name ORDER BY name) FROM anon_grants),
  'dangerous_grants', (SELECT json_agg(name ORDER BY name) FROM dangerous_grants)
) AS security_ownership;
