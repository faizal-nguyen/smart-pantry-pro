-- Fix: Create missing recipe_inventory_cache table
-- This table caches recipe inventory analysis results

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the missing table
CREATE TABLE IF NOT EXISTS public.recipe_inventory_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour'),
  UNIQUE(recipe_id, user_id)
);

-- Create index for efficient cleanup of expired cache
CREATE INDEX IF NOT EXISTS idx_recipe_inventory_cache_expires 
ON public.recipe_inventory_cache(expires_at);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_recipe_inventory_cache_lookup 
ON public.recipe_inventory_cache(recipe_id, user_id);

-- Enable RLS
ALTER TABLE public.recipe_inventory_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own cache entries
CREATE POLICY "Users can view their own recipe inventory cache" 
ON public.recipe_inventory_cache 
FOR SELECT 
USING (user_id = auth.uid());

-- RLS Policy: Users can only insert their own cache entries
CREATE POLICY "Users can insert their own recipe inventory cache" 
ON public.recipe_inventory_cache 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can only update their own cache entries
CREATE POLICY "Users can update their own recipe inventory cache" 
ON public.recipe_inventory_cache 
FOR UPDATE 
USING (user_id = auth.uid());

-- RLS Policy: Users can only delete their own cache entries
CREATE POLICY "Users can delete their own recipe inventory cache" 
ON public.recipe_inventory_cache 
FOR DELETE 
USING (user_id = auth.uid());

-- Comment for documentation
COMMENT ON TABLE public.recipe_inventory_cache IS 'Cache for recipe inventory analysis results with 1 hour expiration';
COMMENT ON COLUMN public.recipe_inventory_cache.analysis_result IS 'JSONB containing: {can_make: boolean, missing_ingredients: [], available_ingredients: [], substitutions: []}';