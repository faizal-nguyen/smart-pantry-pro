-- Fix: Create missing tables for recipe inventory analysis
-- This migration creates ingredient_substitutions table and fixes cache conflicts

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create ingredient_substitutions table (for recipe analysis)
CREATE TABLE IF NOT EXISTS public.ingredient_substitutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_ingredient VARCHAR(255),
  substitute_ingredient VARCHAR(255),
  ratio DECIMAL(4,2) DEFAULT 1.0, -- substitution ratio
  recipe_type VARCHAR(100), -- 'baking', 'cooking', 'all'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ingredient_substitutions_original 
ON public.ingredient_substitutions(original_ingredient);

CREATE INDEX IF NOT EXISTS idx_ingredient_substitutions_substitute 
ON public.ingredient_substitutions(substitute_ingredient);

-- Enable RLS
ALTER TABLE public.ingredient_substitutions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can read substitutions (public data)
CREATE POLICY "Anyone can view ingredient substitutions" 
ON public.ingredient_substitutions 
FOR SELECT 
USING (true);

-- RLS Policy: Only authenticated users can insert (admin functionality)
CREATE POLICY "Authenticated users can insert substitutions" 
ON public.ingredient_substitutions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix recipe_inventory_cache upsert conflict
-- Drop the existing unique constraint if it exists
ALTER TABLE public.recipe_inventory_cache 
DROP CONSTRAINT IF EXISTS recipe_inventory_cache_recipe_id_user_id_key;

-- Recreate with proper conflict handling
ALTER TABLE public.recipe_inventory_cache 
ADD CONSTRAINT recipe_inventory_cache_unique 
UNIQUE (recipe_id, user_id);

-- 3. Insert default substitution data (common cooking substitutions)
INSERT INTO public.ingredient_substitutions (original_ingredient, substitute_ingredient, ratio, recipe_type, notes) VALUES
-- Dairy substitutions
('beurre', 'huile d''olive', 0.75, 'cooking', 'Réduire quantité pour compenser la texture'),
('beurre', 'margarine', 1.0, 'all', 'Substitution directe 1:1'),
('lait entier', 'lait demi-écrémé', 1.0, 'all', 'Substitution directe 1:1'),
('lait entier', 'lait végétal', 1.0, 'all', 'Lait d''amande, soja, avoine'),
('crème fraîche', 'yaourt grec', 1.0, 'cooking', 'Texture légèrement différente'),
('crème fraîche', 'crème de soja', 1.0, 'all', 'Alternative végétalienne'),

-- Egg substitutions
('oeuf', 'compote de pommes', 0.25, 'baking', '60ml de compote = 1 oeuf'),
('oeuf', 'banane écrasée', 0.5, 'baking', '1/2 banane = 1 oeuf'),

-- Sugar substitutions
('sucre blanc', 'miel', 0.75, 'baking', 'Réduire liquides de 25ml'),
('sucre blanc', 'sirop d''érable', 0.75, 'baking', 'Réduire liquides de 25ml'),
('sucre blanc', 'cassonade', 1.0, 'all', 'Substitution directe'),

-- Flour substitutions
('farine blanche', 'farine complète', 1.0, 'baking', 'Texture plus dense'),
('farine blanche', 'farine d''amande', 0.75, 'baking', 'Sans gluten, texture différente'),

-- Oil substitutions
('huile de tournesol', 'huile d''olive', 1.0, 'cooking', 'Goût plus prononcé'),
('huile de tournesol', 'huile de colza', 1.0, 'all', 'Substitution neutre'),

-- Common ingredient substitutions
('sel', 'sauce soja', 0.5, 'cooking', 'Réduire la quantité, ajoute umami'),
('poivre', 'piment d''Espelette', 0.5, 'cooking', 'Plus doux que le poivre noir'),
('vinaigre blanc', 'jus de citron', 1.0, 'all', 'Acidité similaire'),
('levure chimique', 'bicarbonate + citron', 0.5, 'baking', '1/2 c.à.c bicarbonate + citron')
ON CONFLICT DO NOTHING;

-- 4. Create function to handle cache upserts properly
CREATE OR REPLACE FUNCTION upsert_recipe_inventory_cache(
  p_recipe_id UUID,
  p_user_id UUID,
  p_analysis_result JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.recipe_inventory_cache (
    recipe_id, 
    user_id, 
    analysis_result,
    created_at,
    expires_at
  ) VALUES (
    p_recipe_id,
    p_user_id,
    p_analysis_result,
    NOW(),
    NOW() + INTERVAL '1 hour'
  )
  ON CONFLICT (recipe_id, user_id) 
  DO UPDATE SET
    analysis_result = EXCLUDED.analysis_result,
    created_at = NOW(),
    expires_at = NOW() + INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upsert_recipe_inventory_cache TO authenticated;

-- Comments for documentation
COMMENT ON TABLE public.ingredient_substitutions IS 'Common ingredient substitutions for recipe analysis';
COMMENT ON FUNCTION upsert_recipe_inventory_cache IS 'Safely upsert recipe inventory cache with proper conflict handling';