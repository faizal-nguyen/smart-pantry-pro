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
--   2. Spicy Tuna Crispy Rice                  ✓
--   3. Don't Worry Rice Bowl                   ✓
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
    'Pad Krapow Lumpia',
    'Spicy Tuna Crispy Rice',
    'Don''t Worry Rice Bowl'
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

  -- =====================================================================
  -- 2. Spicy Tuna Crispy Rice (style Nobu / izakaya)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Spicy Tuna Crispy Rice',
    'Classique des sushi bars (inspiration Nobu) : galettes de riz à sushi pressé puis frit jusqu''à croustillant ambré, surmontées d''un tartare de thon sushi-grade au mayo Kewpie, sriracha, yuzu et sésame. Prévoir 2 h de repos au frigo pour le riz pressé.',
    $instr$["Rincer le riz à sushi à l'eau froide jusqu'à ce que l'eau ressorte claire.",
"Cuire le riz au rice cooker avec le kombu et l'eau (ratio standard 1 : 1,1).",
"Mélanger vinaigre de riz + sucre + sel dans un bol. Passer 30 secondes au micro-ondes pour dissoudre le sucre et le sel.",
"Quand le riz est cuit, verser le mélange vinaigré sur le riz chaud et mélanger délicatement à la spatule jusqu'à incorporation complète.",
"Tapisser une plaque de cuisson de film alimentaire. Étaler le riz uniformément (~2 cm d'épaisseur). Recouvrir d'un autre film, presser avec une seconde plaque par-dessus. Réfrigérer 2 heures minimum jusqu'à solidification.",
"Pendant ce temps, hacher finement le thon sushi-grade au couteau. Mélanger avec oignon vert tranché fin, gingembre râpé, sauce soja, huile de sésame, jus de yuzu, mayo Kewpie, sriracha et sel. Couvrir et réfrigérer.",
"Démouler le riz pressé et le couper en rectangles ou losanges (taille bouchée).",
"Friture profonde : chauffer l'huile à 190°C. Plonger les galettes en lots, en les espaçant de 30 secondes pour qu'elles ne collent pas. Frire jusqu'à doré profond.",
"Égoutter sur grille, saler légèrement chaque galette à la sortie de l'huile.",
"Surmonter chaque galette d'une quenelle de tartare de thon épicé. Parsemer de ciboulette ciselée. Servir immédiatement."]
$instr$,
    30, 30, 4, 3,
    'Japonaise', 'appetizer',
    ARRAY['japonais','sushi','thon cru','nobu','fusion','frit','crispy rice','izakaya'],
    'manual',
    'https://www.instagram.com/p/DHbc_FsPtSF/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Riz à sushi
    (v_recipe_id, 'riz à sushi',             400, 'g',          true,  1,  '2 cups'),
    (v_recipe_id, 'eau',                     540, 'ml',         true,  2,  '2.25 cups'),
    (v_recipe_id, 'kombu',                   1,   'unité',      true,  3,  'carré ~8x8 cm'),
    (v_recipe_id, 'vinaigre de riz',         60,  'ml',         true,  4,  '0.25 cup'),
    (v_recipe_id, 'sucre',                   30,  'g',          true,  5,  '2 c. à soupe'),
    (v_recipe_id, 'sel',                     5,   'g',          true,  6,  '1 c. à café'),
    (v_recipe_id, 'huile végétale',          1000, 'ml',        true,  7,  'neutre, pour friture profonde'),
    -- Tartare de thon
    (v_recipe_id, 'thon sushi-grade',        340, 'g',          true,  8,  '0.75 lb, haché fin au couteau'),
    (v_recipe_id, 'oignon vert',             1,   'unité',      true,  9,  'tranché fin'),
    (v_recipe_id, 'gingembre',               5,   'g',          true,  10, 'râpé'),
    (v_recipe_id, 'sauce soja',              10,  'ml',         true,  11, '2 c. à café'),
    (v_recipe_id, 'huile de sésame',         5,   'ml',         true,  12, '1 c. à café'),
    (v_recipe_id, 'jus de yuzu',             10,  'ml',         true,  13, '2 c. à café'),
    (v_recipe_id, 'mayonnaise Kewpie',       45,  'ml',         true,  14, '3 c. à soupe, mayo japonaise'),
    (v_recipe_id, 'sriracha',                45,  'ml',         true,  15, '3 c. à soupe, ajuster au goût'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  16, 'pour le tartare, au goût'),
    -- Garniture
    (v_recipe_id, 'ciboulette',              1,   'c. à soupe', false, 17, 'ciselée, garniture');

  -- =====================================================================
  -- 3. Don't Worry Rice Bowl (viral chinois 10 min)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Don''t Worry Rice Bowl',
    'Bol de riz chinois viral surnommé "I''m Good, Don''t Worry" (我没事) : porc haché sauté, œufs ajoutés sur place, sauce soja-huître-vinaigre-sucre liée à la fécule. Prêt en 10 min, réconfortant et complet — la recette doudou des soirs où on n''a plus d''énergie.',
    $instr$["Sauce : mélanger dans un bol sauce soja, sauce soja foncée, sauce huître, vinaigre de riz, sucre et eau. Réserver. Préparer aussi la fécule diluée dans son eau à part.",
"Chauffer l'huile dans une poêle ou un wok à feu vif. Ajouter le porc haché (ou poulet) et sauter en cassant les amas jusqu'à coloration. Verser un trait de vin de riz si utilisé.",
"Faire de la place au centre de la poêle. Casser les 3 œufs directement dedans et cuire au gré : brouillés moelleux ou au plat à jaune coulant — au choix.",
"Verser la sauce sur l'ensemble, puis ajouter la fécule diluée pour épaissir. Bien mélanger pour enrober porc et œufs.",
"Servir immédiatement sur un bol de riz cuit chaud."]
$instr$,
    5, 10, 1, 1,
    'Chinoise', 'lunch',
    ARRAY['chinois','viral','rice bowl','porc','œuf','rapide','comfort food'],
    'manual',
    'https://www.instagram.com/p/DHCLnKzvazd/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'porc haché',              200, 'g',          true,  1,  'ou poulet haché'),
    (v_recipe_id, 'œufs',                    3,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'vin de riz',              15,  'ml',         false, 3,  'Shaoxing, optionnel'),
    (v_recipe_id, 'huile végétale',          15,  'ml',         true,  4,  '1 c. à soupe'),
    (v_recipe_id, 'riz cuit',                200, 'g',          true,  5,  '1 bol, chaud'),
    -- Sauce
    (v_recipe_id, 'sauce soja',              15,  'ml',         true,  6,  '1 c. à soupe'),
    (v_recipe_id, 'sauce soja foncée',       5,   'ml',         true,  7,  '1 c. à café'),
    (v_recipe_id, 'sauce huître',            5,   'ml',         true,  8,  '1 c. à café'),
    (v_recipe_id, 'vinaigre de riz',         2.5, 'ml',         true,  9,  '0.5 c. à café'),
    (v_recipe_id, 'sucre',                   2.5, 'g',          true,  10, '0.5 c. à café'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  11, '0.25 cup, pour la sauce'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  12, 'au goût'),
    (v_recipe_id, 'poivre noir',             1,   'pincée',     true,  13, 'au goût'),
    -- Liaison
    (v_recipe_id, 'fécule de maïs',          7.5, 'g',          true,  14, '0.5 c. à soupe'),
    (v_recipe_id, 'eau',                     15,  'ml',         true,  15, '1 c. à soupe, pour diluer la fécule');

  RAISE NOTICE 'Seed: Instagram recipes batch inserted for user % (3 recipes so far)', v_user_id;
END $$;
