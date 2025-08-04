-- Migration: Enhancement recettes Smart Pantry avec patterns Cipher
-- Extension table recipes avec fields PRP Cipher-Enhanced

-- 1. Étendre table recipes existante
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS cuisine_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS meal_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS cook_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rest_time INTEGER,
ADD COLUMN IF NOT EXISTS difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS nutrition_info JSONB,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1),
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- 2. Créer table recipe_ingredients (extension intelligente)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  is_essential BOOLEAN DEFAULT TRUE,
  notes TEXT,
  order_index INTEGER,
  
  -- Mapping avec inventaire (pattern Cipher)
  inventory_product_id UUID REFERENCES public.products(id),
  
  -- Données nutritionnelles enrichies
  calories_per_unit DECIMAL(10,2),
  nutrition_data JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Table cache analyse inventaire (pattern Cipher performance)
CREATE TABLE IF NOT EXISTS public.recipe_inventory_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_result JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '1 hour'),
  UNIQUE(recipe_id, user_id)
);

-- 4. Table collections recettes (pattern social)  
CREATE TABLE IF NOT EXISTS public.recipe_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Table liaison collections-recettes
CREATE TABLE IF NOT EXISTS public.collection_recipes (
  collection_id UUID REFERENCES public.recipe_collections(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (collection_id, recipe_id)
);

-- 6. Table reviews recettes (pattern social)
CREATE TABLE IF NOT EXISTS public.recipe_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photos TEXT[], -- URLs des photos du résultat
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)
);

-- 7. Table substitutions ingrédients (pattern Cipher intelligence)
CREATE TABLE IF NOT EXISTS public.ingredient_substitutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_ingredient VARCHAR(255),
  substitute_ingredient VARCHAR(255),
  ratio DECIMAL(4,2) DEFAULT 1.0, -- ratio de substitution
  recipe_type VARCHAR(100), -- 'baking', 'cooking', 'all'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Index pour performances (pattern Cipher optimization)
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_product_id ON public.recipe_ingredients(inventory_product_id);
CREATE INDEX IF NOT EXISTS idx_recipe_inventory_cache_user_recipe ON public.recipe_inventory_cache(user_id, recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_inventory_cache_expires ON public.recipe_inventory_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_recipes_user_category ON public.recipes(user_id, cuisine_category);
CREATE INDEX IF NOT EXISTS idx_recipes_rating ON public.recipes(rating DESC) WHERE rating IS NOT NULL;

-- 9. Storage bucket pour images recettes (pattern existant réutilisé)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

-- 10. Storage bucket pour OCR temporaire (pattern Cipher précautions)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('temp-ocr', 'temp-ocr', false)
ON CONFLICT (id) DO NOTHING;

-- 11. RLS Policies pour recipes (pattern sécurité existant)
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public recipes or their own" 
ON public.recipes 
FOR SELECT 
USING (
  is_public = true OR 
  user_id = auth.uid()
);

CREATE POLICY "Users can insert their own recipes" 
ON public.recipes 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recipes" 
ON public.recipes 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own recipes" 
ON public.recipes 
FOR DELETE 
USING (user_id = auth.uid());

-- 12. RLS pour recipe_ingredients
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ingredients of accessible recipes" 
ON public.recipe_ingredients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.recipes r 
    WHERE r.id = recipe_id 
    AND (r.is_public = true OR r.user_id = auth.uid())
  )
);

CREATE POLICY "Users can manage ingredients of their recipes" 
ON public.recipe_ingredients 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.recipes r 
    WHERE r.id = recipe_id 
    AND r.user_id = auth.uid()
  )
);

-- 13. RLS pour cache inventaire (pattern Cipher sécurité)
ALTER TABLE public.recipe_inventory_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their own inventory cache" 
ON public.recipe_inventory_cache 
FOR ALL 
USING (user_id = auth.uid());

-- 14. Storage policies pour images recettes
CREATE POLICY "Recipe images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'recipe-images');

CREATE POLICY "Users can upload recipe images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'recipe-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update recipe images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'recipe-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete recipe images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'recipe-images' AND auth.uid() IS NOT NULL);

-- 15. Storage policies pour OCR temporaire (pattern Cipher précautions)
CREATE POLICY "Users can manage their temp OCR files" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'temp-ocr' AND auth.uid() IS NOT NULL);

-- 16. Types énumérés pour validation
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recipe_source_type') THEN
    CREATE TYPE recipe_source_type AS ENUM ('manual', 'url', 'social', 'book_scan');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_type_enum') THEN
    CREATE TYPE meal_type_enum AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink', 'appetizer');
  END IF;
END $$;

-- 17. Fonction cleanup cache expiré (pattern Cipher maintenance)
CREATE OR REPLACE FUNCTION cleanup_expired_recipe_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.recipe_inventory_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 18. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recipes_updated_at 
  BEFORE UPDATE ON public.recipes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_ingredients_updated_at 
  BEFORE UPDATE ON public.recipe_ingredients 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 19. Fonction pour calculer rating moyen (pattern intelligence)
CREATE OR REPLACE FUNCTION update_recipe_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.recipes 
  SET 
    rating = (
      SELECT AVG(rating)::DECIMAL(2,1) 
      FROM public.recipe_reviews 
      WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM public.recipe_reviews 
      WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
    )
  WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_recipe_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.recipe_reviews
  FOR EACH ROW EXECUTE FUNCTION update_recipe_rating();

-- 20. Données de test substitutions (pattern Cipher intelligence)
INSERT INTO public.ingredient_substitutions (original_ingredient, substitute_ingredient, ratio, recipe_type, notes) VALUES
('beurre', 'huile d''olive', 0.75, 'cooking', 'Réduit quantité pour compensation texture'),
('lait entier', 'lait demi-écrémé', 1.0, 'all', 'Substitution directe 1:1'),
('crème fraîche', 'yaourt grec', 1.0, 'cooking', 'Même quantité, texture légèrement différente'),
('sucre blanc', 'miel', 0.75, 'baking', 'Réduire liquides de 25ml pour compensation'),
('farine blanche', 'farine complète', 1.0, 'baking', 'Texture plus dense, goût plus prononcé')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.recipes IS 'Table recettes avec extensions Cipher Smart Pantry';
COMMENT ON TABLE public.recipe_ingredients IS 'Ingrédients des recettes avec mapping inventaire';
COMMENT ON TABLE public.recipe_inventory_cache IS 'Cache analyse inventaire avec expiration 1h';
COMMENT ON TABLE public.ingredient_substitutions IS 'Substitutions intelligentes ingrédients';