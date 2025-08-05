-- Supprimer le produit "test api codes barre" et ses références
-- Version simplifiée et sécurisée

DO $$
DECLARE
  product_to_delete_id UUID;
BEGIN
  -- Récupérer l'ID du produit à supprimer
  SELECT id INTO product_to_delete_id
  FROM public.products 
  WHERE LOWER(name) = 'test api codes barre'
  LIMIT 1;
  
  -- Si le produit existe
  IF product_to_delete_id IS NOT NULL THEN
    -- 1. Supprimer de l'inventaire
    DELETE FROM public.inventory 
    WHERE product_id = product_to_delete_id;
    
    -- 2. Supprimer de la liste de courses
    DELETE FROM public.shopping_list 
    WHERE product_id = product_to_delete_id;
    
    -- 3. Supprimer de recipe_ingredients (peu importe le nom de la colonne)
    -- Vérifier si la table existe
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'recipe_ingredients' 
               AND table_schema = 'public') THEN
      
      -- Essayer de supprimer avec product_id
      BEGIN
        EXECUTE 'DELETE FROM public.recipe_ingredients WHERE product_id = $1' 
        USING product_to_delete_id;
      EXCEPTION
        WHEN undefined_column THEN
          -- Si product_id n'existe pas, essayer avec inventory_product_id
          BEGIN
            EXECUTE 'DELETE FROM public.recipe_ingredients WHERE inventory_product_id = $1' 
            USING product_to_delete_id;
          EXCEPTION
            WHEN undefined_column THEN
              -- Ignorer si aucune colonne n'existe
              NULL;
          END;
      END;
    END IF;
    
    -- 4. Finalement supprimer le produit
    DELETE FROM public.products 
    WHERE id = product_to_delete_id;
    
    RAISE NOTICE 'Produit "test api codes barre" supprimé avec succès (ID: %)', product_to_delete_id;
  ELSE
    RAISE NOTICE 'Produit "test api codes barre" non trouvé';
  END IF;
END $$;