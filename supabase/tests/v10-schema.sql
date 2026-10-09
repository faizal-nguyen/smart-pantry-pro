-- Isolated test baseline. Reconstructs the active column contracts from migrations;
-- it is not a dump of the deployed database and must never run on user data.
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;
\ir ../migrations/20250803063742_9394d93b-fbc2-4033-8f0d-be022ee99c68.sql
ALTER TABLE public.recipes ADD COLUMN description text,ADD COLUMN image_url text,ADD COLUMN cuisine_category text,
  ADD COLUMN meal_type text,ADD COLUMN cook_time integer DEFAULT 0,ADD COLUMN rest_time integer DEFAULT 0,
  ADD COLUMN difficulty integer DEFAULT 3 CHECK(difficulty BETWEEN 1 AND 5),ADD COLUMN tags text[] DEFAULT '{}',
  ADD COLUMN is_public boolean DEFAULT false,ADD COLUMN source_type text,ADD COLUMN source_url text;
ALTER TABLE public.recipe_ingredients ALTER COLUMN product_id DROP NOT NULL,
  ADD COLUMN ingredient_name text NOT NULL,ADD COLUMN quantity numeric(10,2),ADD COLUMN unit text,
  ADD COLUMN is_essential boolean DEFAULT true,ADD COLUMN notes text,ADD COLUMN order_index integer,
  ADD COLUMN inventory_product_id uuid REFERENCES public.products(id);
CREATE TABLE public.recipes_catalog(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text NOT NULL,
  ingredients_json jsonb NOT NULL,instructions text DEFAULT '',servings integer DEFAULT 4,
  prep_time integer DEFAULT 0,cook_time integer DEFAULT 0,updated_at timestamptz DEFAULT now());
CREATE TABLE public.user_recipes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),
  recipe_id uuid REFERENCES public.recipes_catalog(id),is_from_catalog boolean DEFAULT true,
  custom_title text,custom_ingredients_json jsonb,custom_instructions text,custom_modifications jsonb DEFAULT '{}',
  personal_notes text,collections text[] DEFAULT '{}',times_cooked integer DEFAULT 0,last_cooked_date timestamptz,
  updated_at timestamptz DEFAULT now());
CREATE TABLE public.cooking_journal_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),
  recipe_id uuid,recipe_title text NOT NULL,cooked_at timestamptz DEFAULT now(),adjustments jsonb DEFAULT '{}',updated_at timestamptz DEFAULT now());
CREATE TABLE public.weekly_meal_plans(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),week_start_date date);
CREATE TABLE public.meal_plan_entries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),meal_plan_id uuid NOT NULL REFERENCES public.weekly_meal_plans(id),
  day_of_week integer,meal_type text,recipe_id uuid REFERENCES public.recipes_catalog(id),recipe_name text,servings integer,
  prep_time integer,cook_time integer,UNIQUE(meal_plan_id,day_of_week,meal_type));
CREATE TABLE public.recipe_inventory_cache(user_id uuid,recipe_id uuid,analysis_result jsonb);
CREATE TABLE public.recipe_recommendation_cache(user_id uuid,cache_key text,payload jsonb);
ALTER TABLE public.recipes_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_read ON public.recipes_catalog FOR SELECT TO authenticated USING(true);
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_recipes_own ON public.user_recipes TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
ALTER TABLE public.cooking_journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY journal_read_own ON public.cooking_journal_entries FOR SELECT TO authenticated USING(auth.uid()=user_id);
CREATE POLICY public_recipe_read ON public.recipes FOR SELECT TO authenticated USING(is_public);
CREATE POLICY public_ingredient_read ON public.recipe_ingredients FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.recipes WHERE id=recipe_id AND is_public));
GRANT USAGE ON SCHEMA public TO authenticated,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.products,public.inventory,public.recipes,public.recipe_ingredients,public.shopping_list,public.user_recipes TO authenticated;
GRANT SELECT ON public.recipes_catalog,public.cooking_journal_entries TO authenticated;
\ir ../migrations/20251004000001_add_transaction_functions.sql

INSERT INTO auth.users VALUES('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
INSERT INTO public.products(id,name,category,unit_type) VALUES
  ('10000000-0000-4000-8000-000000000001','Farine','Epicerie','kg'),
  ('10000000-0000-4000-8000-000000000002','Lait','Frais','l');
INSERT INTO public.inventory(id,user_id,product_id,quantity) VALUES
  ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1),
  ('20000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',1);
INSERT INTO public.recipes(id,user_id,name,instructions,servings) VALUES
  ('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Pain','Cuire',4),
  ('30000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Pain privé','Cuire',4);
INSERT INTO public.recipe_ingredients(recipe_id,ingredient_name,quantity,unit,inventory_product_id) VALUES
  ('30000000-0000-4000-8000-000000000001','Farine',200,'g','10000000-0000-4000-8000-000000000001');
