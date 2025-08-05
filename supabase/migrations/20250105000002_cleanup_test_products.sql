-- Supprimer le produit "test api codes barre" et ses références
-- Suppression sécurisée avec vérification

-- 1. D'abord supprimer les références dans l'inventaire
DELETE FROM public.inventory 
WHERE product_id IN (
  SELECT id FROM public.products 
  WHERE LOWER(name) = 'test api codes barre'
);

-- 2. Supprimer les références dans la liste de courses
DELETE FROM public.shopping_list 
WHERE product_id IN (
  SELECT id FROM public.products 
  WHERE LOWER(name) = 'test api codes barre'
);

-- 3. Supprimer les références dans recipe_ingredients
DELETE FROM public.recipe_ingredients 
WHERE product_id IN (
  SELECT id FROM public.products 
  WHERE LOWER(name) = 'test api codes barre'
);

-- 4. Finalement supprimer le produit lui-même
DELETE FROM public.products 
WHERE LOWER(name) = 'test api codes barre';

-- Message de confirmation
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  IF deleted_count > 0 THEN
    RAISE NOTICE 'Produit "test api codes barre" supprimé avec succès';
  ELSE
    RAISE NOTICE 'Produit "test api codes barre" non trouvé';
  END IF;
END $$;