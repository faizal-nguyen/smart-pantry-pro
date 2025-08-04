-- Migration corrective: Ajouter les colonnes manquantes

-- 1. Ajouter les colonnes manquantes à la table recipes si elles n'existent pas
DO $$ 
BEGIN
  -- Ajouter cook_time si elle n'existe pas
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'cook_time'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN cook_time INTEGER DEFAULT 0;
  END IF;

  -- Ajouter is_public si elle n'existe pas
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'is_public'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
  END IF;

  -- Ajouter les autres colonnes manquantes
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN image_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'cuisine_category'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN cuisine_category VARCHAR(100);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'meal_type'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN meal_type VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'rest_time'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN rest_time INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'difficulty'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN tags TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'source_type'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN source_type VARCHAR(50) DEFAULT 'manual';
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'source_url'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN source_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'nutrition_info'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN nutrition_info JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'rating'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN rating DECIMAL(2,1);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipes' 
    AND column_name = 'rating_count'
  ) THEN
    ALTER TABLE public.recipes ADD COLUMN rating_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- 2. Créer la table recipe_collections si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.recipe_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Créer la table recipe_ingredients si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  is_essential BOOLEAN DEFAULT TRUE,
  notes TEXT,
  order_index INTEGER,
  inventory_product_id UUID REFERENCES public.products(id),
  calories_per_unit DECIMAL(10,2),
  nutrition_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Activer RLS sur recipe_collections
ALTER TABLE public.recipe_collections ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS pour recipe_collections
DROP POLICY IF EXISTS "Users can view their own collections" ON public.recipe_collections;
CREATE POLICY "Users can view their own collections" 
ON public.recipe_collections 
FOR SELECT 
USING (user_id = auth.uid() OR is_public = true);

DROP POLICY IF EXISTS "Users can insert their own collections" ON public.recipe_collections;
CREATE POLICY "Users can insert their own collections" 
ON public.recipe_collections 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own collections" ON public.recipe_collections;
CREATE POLICY "Users can update their own collections" 
ON public.recipe_collections 
FOR UPDATE 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own collections" ON public.recipe_collections;
CREATE POLICY "Users can delete their own collections" 
ON public.recipe_collections 
FOR DELETE 
USING (user_id = auth.uid());

-- 6. Créer les index manquants
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_user_category ON public.recipes(user_id, cuisine_category);
CREATE INDEX IF NOT EXISTS idx_recipes_rating ON public.recipes(rating DESC) WHERE rating IS NOT NULL;

-- 7. Mettre à jour RLS policies pour recipes avec is_public
DROP POLICY IF EXISTS "Users can view public recipes or their own" ON public.recipes;
CREATE POLICY "Users can view public recipes or their own" 
ON public.recipes 
FOR SELECT 
USING (
  is_public = true OR 
  user_id = auth.uid()
);

COMMENT ON COLUMN public.recipes.cook_time IS 'Temps de cuisson en minutes';
COMMENT ON COLUMN public.recipes.is_public IS 'Indique si la recette est publique';
COMMENT ON TABLE public.recipe_collections IS 'Collections de recettes créées par les utilisateurs';