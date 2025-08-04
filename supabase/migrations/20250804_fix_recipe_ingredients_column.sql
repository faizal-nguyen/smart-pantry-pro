-- Migration pour corriger le nom de colonne dans recipe_ingredients
-- Cette migration renomme 'name' en 'ingredient_name' si nécessaire

DO $$ 
BEGIN
  -- Vérifier si la colonne 'name' existe
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'name'
  ) THEN
    -- Renommer 'name' en 'ingredient_name'
    ALTER TABLE public.recipe_ingredients 
    RENAME COLUMN name TO ingredient_name;
    
    RAISE NOTICE 'Colonne renommée de name vers ingredient_name';
  END IF;

  -- Si ni 'name' ni 'ingredient_name' n'existent, créer 'ingredient_name'
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'ingredient_name'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients' 
    AND column_name = 'name'
  ) THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN ingredient_name VARCHAR(255) NOT NULL;
    
    RAISE NOTICE 'Colonne ingredient_name créée';
  END IF;
END $$;

-- Rafraîchir le cache de schéma
-- Note: Ceci est une instruction pour Supabase, pas une commande SQL standard
NOTIFY pgrst, 'reload schema';

-- Vérifier la structure finale
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'recipe_ingredients' 
AND table_schema = 'public'
ORDER BY ordinal_position;