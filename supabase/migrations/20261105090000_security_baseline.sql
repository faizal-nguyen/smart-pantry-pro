-- Security baseline (code audit 2026-11-04, production check 2026-11-05).
--
-- Production only records the six Lovable migrations of 2025-08-03: every
-- later file was applied by hand, and some never were (the RLS of
-- 20250829000001, the auth.uid() guard of 20260517071100). This migration
-- therefore states the required end state whatever the history: every step
-- is idempotent and skips objects that do not exist. Hotfixes 1-3 applied by
-- hand on 2026-11-05 are part of it.
--
-- Supabase grants EXECUTE on new public functions to anon and authenticated
-- explicitly, so `REVOKE ... FROM PUBLIC` alone never closed them.
--
-- Verify with supabase/checks/security-drift.sql (every list must be empty).
BEGIN;

-- 1. SECURITY DEFINER functions -------------------------------------------

DO $$
DECLARE f regprocedure;
BEGIN
  -- Arbitrary SELECT as the owner: read every table, auth.users included.
  -- No caller in the app, scripts or edge functions.
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'execute_raw_sql'
  LOOP
    EXECUTE format('DROP FUNCTION %s', f);
  END LOOP;

  -- Maintenance and admin functions without an identity check: service_role
  -- (scripts, pg_cron) only.
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public'
             AND p.proname IN ('assistant_merge_product_into', 'cleanup_old_data',
                               'cleanup_expired_rate_limits', 'cleanup_expired_recipe_cache',
                               'upsert_recipe_inventory_cache', 'delete_user_data')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;

  -- GDPR export: signed-in users, guarded by auth.uid() (20260517071100).
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'export_user_data'
  LOOP
    IF position('auth.uid()' IN (SELECT prosrc FROM pg_proc WHERE oid = f)) = 0 THEN
      RAISE EXCEPTION 'export_user_data has no auth.uid() guard: apply 20260517071100_harden_privacy_rpcs.sql first';
    END IF;
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
  END LOOP;
END $$;

-- 2. Row level security ----------------------------------------------------
-- Each table ends with exactly the policies listed here: older duplicates,
-- inert policies that became active with RLS, and policies trusting the
-- user-editable user_metadata are dropped.

CREATE FUNCTION pg_temp.reset_policies(p_table text, p_keep text[]) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  IF to_regclass('public.' || quote_ident(p_table)) IS NULL THEN RETURN false; END IF;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = p_table AND NOT policyname = ANY (p_keep)
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, p_table);
  END LOOP;
  RETURN true;
END $$;

DO $$
BEGIN
  -- Personal data: each user sees and changes only their own rows. Writes
  -- from plan_recipe go through SECURITY DEFINER commands.
  IF pg_temp.reset_policies('weekly_meal_plans', ARRAY['own_meal_plans']) THEN
    DROP POLICY IF EXISTS own_meal_plans ON public.weekly_meal_plans;
    CREATE POLICY own_meal_plans ON public.weekly_meal_plans
      FOR ALL TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;

  IF pg_temp.reset_policies('meal_plan_entries', ARRAY['own_meal_plan_entries']) THEN
    DROP POLICY IF EXISTS own_meal_plan_entries ON public.meal_plan_entries;
    CREATE POLICY own_meal_plan_entries ON public.meal_plan_entries
      FOR ALL TO authenticated
      USING (meal_plan_id IN (SELECT id FROM public.weekly_meal_plans
                              WHERE user_id = (SELECT auth.uid())))
      WITH CHECK (meal_plan_id IN (SELECT id FROM public.weekly_meal_plans
                                   WHERE user_id = (SELECT auth.uid())));
  END IF;

  IF pg_temp.reset_policies('user_meal_preferences', ARRAY['own_meal_preferences']) THEN
    DROP POLICY IF EXISTS own_meal_preferences ON public.user_meal_preferences;
    CREATE POLICY own_meal_preferences ON public.user_meal_preferences
      FOR ALL TO authenticated
      USING (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
END $$;

-- Reference data: read-only for everyone, written by service_role only.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['active_promotions', 'emergency_meal_templates',
                           'seasonal_products', 'store_partnerships']
  LOOP
    IF pg_temp.reset_policies(t, ARRAY['read_reference']) THEN
      EXECUTE format('DROP POLICY IF EXISTS read_reference ON public.%I', t);
      EXECUTE format('CREATE POLICY read_reference ON public.%I FOR SELECT USING (true)', t);
    END IF;
  END LOOP;
END $$;

-- Recipes. The 320 catalogue recipes belong to the seed account with
-- is_public = false, so reading stays open to every signed-in user (not to
-- anon); writing is limited to the owner.
DO $$
BEGIN
  IF pg_temp.reset_policies('recipes', ARRAY['recipes_read_authenticated', 'recipes_insert_own',
                                             'recipes_update_own', 'recipes_delete_own']) THEN
    DROP POLICY IF EXISTS recipes_read_authenticated ON public.recipes;
    DROP POLICY IF EXISTS recipes_insert_own ON public.recipes;
    DROP POLICY IF EXISTS recipes_update_own ON public.recipes;
    DROP POLICY IF EXISTS recipes_delete_own ON public.recipes;
    CREATE POLICY recipes_read_authenticated ON public.recipes
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY recipes_insert_own ON public.recipes
      FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
    CREATE POLICY recipes_update_own ON public.recipes
      FOR UPDATE TO authenticated
      USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
    CREATE POLICY recipes_delete_own ON public.recipes
      FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
  END IF;

  IF pg_temp.reset_policies('recipe_ingredients', ARRAY['recipe_ingredients_read_authenticated',
                                                        'recipe_ingredients_write_own']) THEN
    DROP POLICY IF EXISTS recipe_ingredients_read_authenticated ON public.recipe_ingredients;
    DROP POLICY IF EXISTS recipe_ingredients_write_own ON public.recipe_ingredients;
    CREATE POLICY recipe_ingredients_read_authenticated ON public.recipe_ingredients
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY recipe_ingredients_write_own ON public.recipe_ingredients
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.recipes r
                     WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = (SELECT auth.uid())))
      WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r
                          WHERE r.id = recipe_ingredients.recipe_id AND r.user_id = (SELECT auth.uid())));
  END IF;
END $$;

-- Shared product catalogue: still readable by everyone; creating and
-- updating products needs an account (the assistant's ProductResolver writes
-- products and their embeddings with the user's client). Deletion stays
-- service_role only.
DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL THEN
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can create products" ON public.products;
    DROP POLICY IF EXISTS "Users can update products" ON public.products;
    DROP POLICY IF EXISTS products_insert_authenticated ON public.products;
    DROP POLICY IF EXISTS products_update_authenticated ON public.products;
    CREATE POLICY products_insert_authenticated ON public.products
      FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY products_update_authenticated ON public.products
      FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- Premium visibility read user_metadata, which every user can edit.
  IF to_regclass('public.recipes_catalog') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Premium users can view premium recipes" ON public.recipes_catalog;
  END IF;

  -- Unused tables created without RLS: no policy, service_role only.
  IF to_regclass('public.recipe_reviews') IS NOT NULL THEN
    ALTER TABLE public.recipe_reviews ENABLE ROW LEVEL SECURITY;
  END IF;
  IF to_regclass('public.collection_recipes') IS NOT NULL THEN
    ALTER TABLE public.collection_recipes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

COMMIT;
