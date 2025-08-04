-- Migration pour aligner la structure de recipe_ingredients avec l'application

-- 1. Rendre product_id nullable (au lieu de NOT NULL)
ALTER TABLE public.recipe_ingredients 
ALTER COLUMN product_id DROP NOT NULL;

-- 2. Ajouter les colonnes manquantes
DO $$ 
BEGIN
  -- Ajouter 'unit' si elle n'existe pas
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'unit'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN unit VARCHAR(50);
  END IF;

  -- Ajouter 'notes' si elle n'existe pas
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN notes TEXT;
  END IF;

  -- Ajouter 'order_index' si elle n'existe pas
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'order_index'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN order_index INTEGER;
  END IF;

  -- Ajouter 'updated_at' si elle n'existe pas
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
  END IF;

  -- Renommer 'quantity_needed' en 'quantity' si nécessaire
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'quantity_needed'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'quantity'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    RENAME COLUMN quantity_needed TO quantity;
  END IF;

  -- Ajouter 'quantity' si elle n'existe pas du tout
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'quantity'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'quantity_needed'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN quantity DECIMAL(10,2);
  END IF;

  -- Ajouter 'inventory_product_id' si elle n'existe pas (renommage de product_id)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'inventory_product_id'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    RENAME COLUMN product_id TO inventory_product_id;
  END IF;

  -- Ajouter les colonnes nutrition si elles n'existent pas
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'calories_per_unit'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN calories_per_unit DECIMAL(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'nutrition_data'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN nutrition_data JSONB;
  END IF;
END $$;

-- 3. Mettre à jour les contraintes
-- S'assurer que is_essential a une valeur par défaut
ALTER TABLE public.recipe_ingredients 
ALTER COLUMN is_essential SET DEFAULT TRUE;

-- 4. Rafraîchir le cache de schéma
NOTIFY pgrst, 'reload schema';

-- 5. Vérifier la structure finale
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'recipe_ingredients' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Commentaire pour vérification
COMMENT ON TABLE public.recipe_ingredients IS 'Table alignée avec le modèle TypeScript RecipeIngredient';