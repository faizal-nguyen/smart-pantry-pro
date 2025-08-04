-- Script pour vérifier le schéma actuel de la base de données

-- 1. Vérifier si la table recipes existe et ses colonnes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'recipes'
ORDER BY ordinal_position;

-- 2. Vérifier si la table recipe_collections existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_collections'
) as recipe_collections_exists;

-- 3. Vérifier si la table recipe_ingredients existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'recipe_ingredients'
) as recipe_ingredients_exists;

-- 4. Lister toutes les tables dans le schema public
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;