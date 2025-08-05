-- Fix permissions for recipe seeding tables

-- 1. Fix RLS policies for api_usage_tracking
DROP POLICY IF EXISTS "Admin peut voir tracking API" ON public.api_usage_tracking;
DROP POLICY IF EXISTS "Service accounts can insert tracking" ON public.api_usage_tracking;

-- Allow authenticated users to insert tracking data
CREATE POLICY "Authenticated users can insert tracking" ON public.api_usage_tracking
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to view their own tracking data
CREATE POLICY "Users can view tracking" ON public.api_usage_tracking
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- 2. Fix RLS policies for translation_cache
DROP POLICY IF EXISTS "Public read translation cache" ON public.translation_cache;
DROP POLICY IF EXISTS "Authenticated insert translation cache" ON public.translation_cache;

-- Allow public read access to translation cache
CREATE POLICY "Public read translation cache" ON public.translation_cache
  FOR SELECT 
  USING (true);

-- Allow authenticated users to insert into cache
CREATE POLICY "Authenticated insert translation cache" ON public.translation_cache
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update cache
CREATE POLICY "Authenticated update translation cache" ON public.translation_cache
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- 3. Fix allergen_translations access
DROP POLICY IF EXISTS "Allergènes lisibles par tous" ON public.allergen_translations;

CREATE POLICY "Public read allergen translations" ON public.allergen_translations
  FOR SELECT 
  USING (true);

-- 4. Ensure recipes table has proper insert permissions
DROP POLICY IF EXISTS "Admin peut tout faire sur recettes" ON public.recipes;
DROP POLICY IF EXISTS "Authenticated users can insert recipes" ON public.recipes;

-- Allow authenticated users to insert recipes
CREATE POLICY "Authenticated users can insert recipes" ON public.recipes
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update their recipes
CREATE POLICY "Authenticated users can update recipes" ON public.recipes
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- 5. Ensure recipe_ingredients has proper permissions
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Allow public read
CREATE POLICY "Public read recipe ingredients" ON public.recipe_ingredients
  FOR SELECT 
  USING (true);

-- Allow authenticated insert
CREATE POLICY "Authenticated insert recipe ingredients" ON public.recipe_ingredients
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Permissions corrigées pour recipe seeding';
  RAISE NOTICE '🔓 Tables accessibles: api_usage_tracking, translation_cache, recipes, recipe_ingredients';
  RAISE NOTICE '🔒 Sécurité RLS maintenue avec accès appropriés';
END $$;