-- Isolated fixture for scripts/test-security-baseline-db.py. It reproduces the
-- production privileges and policies observed on 2026-11-05, before the
-- hand-applied hotfixes. Never run it on a real database.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user::text)
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;

CREATE TABLE public.products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL);
CREATE TABLE public.recipes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid,
  name text NOT NULL, is_public boolean DEFAULT false);
CREATE TABLE public.recipe_ingredients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE, ingredient_name text);
CREATE TABLE public.weekly_meal_plans (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, week_start_date date NOT NULL);
CREATE TABLE public.meal_plan_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid REFERENCES public.weekly_meal_plans(id) ON DELETE CASCADE, recipe_name text);
CREATE TABLE public.user_meal_preferences (user_id uuid PRIMARY KEY, allergies text[]);
CREATE TABLE public.active_promotions (id serial PRIMARY KEY, valid_until date);
CREATE TABLE public.emergency_meal_templates (id serial PRIMARY KEY, name text);
CREATE TABLE public.seasonal_products (id serial PRIMARY KEY, is_active boolean);
CREATE TABLE public.store_partnerships (id serial PRIMARY KEY, is_active boolean);
CREATE TABLE public.recipes_catalog (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text,
  is_verified boolean, is_premium boolean);

-- Supabase-style grants: anon and authenticated get every table and function.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Policies seen in production (RLS on products and recipes only).
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Users can create products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update products" ON public.products FOR UPDATE USING (true);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recettes lisibles par tous" ON public.recipes FOR SELECT USING (true);
CREATE POLICY "Users can view public recipes or their own" ON public.recipes FOR SELECT
  USING (is_public = true OR user_id = auth.uid());
CREATE POLICY "Authenticated users can insert recipes" ON public.recipes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update recipes" ON public.recipes FOR UPDATE
  USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read recipe ingredients" ON public.recipe_ingredients FOR SELECT USING (true);
CREATE POLICY "Authenticated insert recipe ingredients" ON public.recipe_ingredients FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Inert policies on tables whose RLS was off.
CREATE POLICY "Users can manage their own meal plans" ON public.weekly_meal_plans
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can access their meal
  preferences" ON public.user_meal_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Only admins can manage emergency templates" ON public.emergency_meal_templates
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
CREATE POLICY "All users can read seasonal products" ON public.seasonal_products
  FOR SELECT USING (is_active = true);

ALTER TABLE public.recipes_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view verified recipes" ON public.recipes_catalog FOR SELECT USING (is_verified = true);
CREATE POLICY "Premium users can view premium recipes" ON public.recipes_catalog FOR SELECT
  USING (is_premium AND (auth.jwt() -> 'user_metadata' ->> 'subscription_tier') IN ('premium', 'premium_plus'));

-- SECURITY DEFINER functions as found in production (bodies reduced).
CREATE FUNCTION public.execute_raw_sql(query text, params text[] DEFAULT '{}') RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
  EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (%s) t', query) INTO result;
  RETURN coalesce(result, '[]'::json);
END $$;
CREATE FUNCTION public.assistant_merge_product_into(p_canonical uuid, p_duplicate uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN '{}'; END $$;
CREATE FUNCTION public.cleanup_old_data() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
CREATE FUNCTION public.upsert_recipe_inventory_cache(p_recipe_id uuid, p_user_id uuid, p_analysis_result jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN END $$;
CREATE FUNCTION public.delete_user_data(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN DELETE FROM public.weekly_meal_plans WHERE user_id = p_user_id; END $$;
CREATE FUNCTION public.export_user_data(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden: caller must match p_user_id' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN jsonb_build_object('user_id', p_user_id);
END $$;
CREATE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN NEW; END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
