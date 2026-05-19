-- =====================================================================
-- Seed: Instagram recipes — saisies manuellement
-- 2026-05-19
--
-- Instagram bloque le scraping côté public (og:image rendu côté JS et
-- protégé), donc on s'appuie sur le contenu transmis manuellement par
-- l'utilisateur (ingrédients + steps depuis la caption + sa description).
-- L'URL du reel reste stockée dans source_url pour back-référence.
-- image_url = NULL → fallback ChefHat dans LibraryRecipeCard.
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` pour
-- l'audit user c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6.
-- Idempotent : DELETEs par nom (FK cascade vide les ingrédients).
--
-- Recettes incluses :
--   1. Pad Krapow Lumpia                       ✓
--
-- Fichier évolutif : je rajoute des recettes au fur et à mesure que
-- l'utilisateur me paste des nouvelles URL Insta + détails.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-instagram-recipes.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Pad Krapow Lumpia'
  ];
BEGIN

  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Pad Krapow Lumpia (fusion thaï × philippin)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Pad Krapow Lumpia',
    'Fusion thaï × philippin : la garniture pad krapow (bœuf haché sauté ail-piment thaï-basilic, sauce de poisson + soja foncé + sucre) roulée dans des galettes de lumpia philippines puis frites. À manger avec riz blanc, œuf frit et tomates fraîches.',
    $instr$["Hacher et écraser ensemble l'ail et les piments thaï en pâte (au mortier ou au couteau).",
"Dans un grand wok à feu moyen-vif, saisir le bœuf haché 4-5 minutes jusqu'à ce que le gras fonde. Égoutter l'excédent de gras, puis monter le feu à vif et continuer à saisir 2-3 minutes jusqu'à belle coloration. Ajouter la pâte d'ail-piment et sauter 2 minutes.",
"Ajouter sauce de poisson, sauce soja foncée, sucre et eau. Continuer 2 minutes jusqu'à ce que la viande soit bien enrobée de sauce.",
"Retirer du feu et incorporer les feuilles de basilic (idéalement basilic thaï).",
"Roulage : poser une galette de lumpia en losange (un coin pointé vers vous).",
"Déposer 1 à 1,5 c. à soupe de garniture à environ 5 cm du coin bas.",
"Étaler en boudin horizontal compact, en laissant de la marge sur les côtés pour le pliage.",
"Plier le coin du bas sur la garniture en serrant bien.",
"Plier les côtés vers l'intérieur, puis rouler vers le haut. Sceller la dernière pointe avec un peu d'eau.",
"Friture : chauffer l'huile à 175°C. Frire les lumpia 2-3 minutes par fournée jusqu'à doré profond.",
"Servir bien chaud avec du riz blanc, un œuf frit à jaune coulant et des tranches de tomates fraîches."]
$instr$,
    15, 20, 4, 2,
    'Philippine', 'dinner',
    ARRAY['philippin','thaï','fusion','lumpia','pad krapow','bœuf','frit','basilic'],
    'manual',
    'https://www.instagram.com/p/DHefHHlOnjh/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Garniture pad krapow
    (v_recipe_id, 'bœuf haché 20% gras',     454, 'g',          true,  1,  '1 lb, 80/20 lean'),
    (v_recipe_id, 'ail',                     3,   'gousse',     true,  2,  NULL),
    (v_recipe_id, 'piments oiseau thaï',     2,   'unité',      true,  3,  'ajuster au goût'),
    (v_recipe_id, 'sauce de poisson',        15,  'ml',         true,  4,  '1 c. à soupe'),
    (v_recipe_id, 'sauce soja foncée',       15,  'ml',         true,  5,  '1 c. à soupe'),
    (v_recipe_id, 'sucre',                   0.75, 'c. à soupe', true, 6,  NULL),
    (v_recipe_id, 'eau',                     30,  'ml',         true,  7,  '2 c. à soupe'),
    (v_recipe_id, 'basilic thaï',            20,  'g',          true,  8,  'feuilles, ou basilic frais à défaut'),
    -- Roulage
    (v_recipe_id, 'galettes de lumpia',      15,  'unité',      true,  9,  'spring roll wrappers'),
    (v_recipe_id, 'huile végétale',          1000, 'ml',        true,  10, 'pour la friture'),
    -- Service
    (v_recipe_id, 'riz blanc cuit',          400, 'g',          false, 11, 'pour servir'),
    (v_recipe_id, 'œufs',                    4,   'unité',      false, 12, 'frits, jaune coulant'),
    (v_recipe_id, 'tomates',                 2,   'unité',      false, 13, 'fraîches, en tranches');

  RAISE NOTICE 'Seed: Instagram recipes batch inserted for user % (1 recipe so far)', v_user_id;
END $$;
