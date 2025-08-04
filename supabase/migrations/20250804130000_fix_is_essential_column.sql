-- Migration corrective: Ajouter la colonne is_essential manquante

-- Vérifier et ajouter la colonne is_essential à recipe_ingredients
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'is_essential'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN is_essential BOOLEAN DEFAULT TRUE;
    
    COMMENT ON COLUMN public.recipe_ingredients.is_essential IS 'Indique si l''ingrédient est essentiel pour la recette';
  END IF;
END $$;