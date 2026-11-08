-- Ownership and least privilege (audit 2026-11-07, security P1 1-3, and the
-- Supabase default grants seen in prod that day):
-- * recipes and their ingredients are read by their owner, or by anyone signed
--   in when the recipe is public (as resolve_stock_recipe already does);
-- * products: the shared catalogue stays readable, and anyone signed in may add
--   a product; changing or deleting one goes through the API's service role
--   (ProductResolver fills a brand, a barcode or an embedding);
-- * consume_inventory_item, transfer_inventory and create_shopping_from_recipe,
--   unused since the V10 stock commands, are dropped;
-- * anon keeps SELECT on the catalogue and the reference tables only; anon and
--   authenticated lose TRUNCATE (it ignores RLS), TRIGGER and REFERENCES, also
--   on the tables created later.
-- Check: supabase/checks/security-ownership.sql. Idempotent.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.recipes') IS NOT NULL THEN
    DROP POLICY IF EXISTS recipes_read_authenticated ON public.recipes;
    DROP POLICY IF EXISTS recipes_read_own_or_public ON public.recipes;
    CREATE POLICY recipes_read_own_or_public ON public.recipes
      FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_public);
  END IF;
  IF to_regclass('public.recipe_ingredients') IS NOT NULL THEN
    DROP POLICY IF EXISTS recipe_ingredients_read_authenticated ON public.recipe_ingredients;
    DROP POLICY IF EXISTS recipe_ingredients_read_own_or_public ON public.recipe_ingredients;
    CREATE POLICY recipe_ingredients_read_own_or_public ON public.recipe_ingredients
      FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.recipes r
        WHERE r.id = recipe_ingredients.recipe_id AND (r.user_id = (SELECT auth.uid()) OR r.is_public)));
  END IF;
  IF to_regclass('public.products') IS NOT NULL THEN
    DROP POLICY IF EXISTS products_update_authenticated ON public.products;
    DROP POLICY IF EXISTS "Users can update products" ON public.products;
    REVOKE UPDATE, DELETE ON public.products FROM anon, authenticated;
  END IF;
END $$;

DO $$
DECLARE f regprocedure;
BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname IN ('consume_inventory_item', 'transfer_inventory', 'create_shopping_from_recipe')
  LOOP
    EXECUTE format('DROP FUNCTION %s', f);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM authenticated;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'recipes_catalog', 'active_promotions', 'emergency_meal_templates',
                           'seasonal_products', 'store_partnerships']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon', t);
    END IF;
  END LOOP;
END $$;
-- Tables created later by this role (the SQL editor and migrations) start the same way.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLES FROM authenticated;

COMMIT;
