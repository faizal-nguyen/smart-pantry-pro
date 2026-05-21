-- =====================================================================
-- Seed: 4 Vietnamese recipes from recipetineats.com (2026-05-20)
--
-- Distinct du seed `2026-05-19-add-recipetineats-japan.sql` (recettes
-- japonaises). Ici 4 recettes vietnamiennes.
--
-- Sources fetched 2026-05-20 :
--   1. https://www.recipetineats.com/vietnamese-lettuce-wraps-with-peanut-sauce/
--   2. https://www.recipetineats.com/lemongrass-chicken-rice-paper-rolls/
--   3. https://www.recipetineats.com/vietnamese-caramel-ginger-chicken/
--   4. https://www.recipetineats.com/red-vietnamese-fried-rice/
--
-- Note collision : "Red Vietnamese Fried Rice" coexiste avec
-- bunbobae "Cơm Đỏ (Riz Rouge Vietnamien)" — names différents, OK.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-20-add-recipetineats-vietnamese.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Vietnamese Lettuce Wraps with Peanut Sauce',
    'Lemongrass Chicken Rice Paper Rolls',
    'Vietnamese Caramel Ginger Chicken',
    'Red Vietnamese Fried Rice (RecipeTin Eats)'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Vietnamese Lettuce Wraps with Peanut Sauce
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Vietnamese Lettuce Wraps with Peanut Sauce',
    'Rouleaux de laitue frais et légers garnis de crevettes, vermicelles et herbes, nappés d''une sauce cacahuète. Version sans cuisson et plus légère des rouleaux de papier de riz traditionnels.',
    $instr$["Faire tremper les vermicelles dans l'eau bouillante selon les indications du paquet, puis rincer à l'eau froide et égoutter.",
"Préparer les pickles de légumes : dissoudre le sucre et le sel dans l'eau chaude, ajouter le vinaigre et y immerger carottes et daikon 2 heures.",
"Préparer la sauce cacahuète en fouettant beurre de cacahuète, sauce hoisin, jus de lime, lait de coco, ail, sambal, sauce soja, sucre et sel.",
"Couper les crevettes en deux horizontalement et retirer la veine.",
"Disposer tous les ingrédients (laitue, vermicelles, légumes, crevettes, herbes) sur un grand plateau.",
"Assembler chaque wrap : laitue, vermicelles, légumes, crevettes, herbes, arroser de sauce, parsemer de cacahuètes et piment.",
"Rouler et déguster immédiatement."]
$instr$,
    20, 0, 4, 2,
    'Vietnamienne', 'lunch',
    ARRAY['vietnamien','sans cuisson','cacahuètes','crevettes','léger','frais','wraps'],
    'manual',
    'https://www.recipetineats.com/vietnamese-lettuce-wraps-with-peanut-sauce/',
    'https://www.recipetineats.com/tachyon/2024/01/Vietnamese-lettuce-wraps-with-peanut-sauce_8.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'crevettes cuites décortiquées',300,'g',     true,  1,  'ou 600 g entières'),
    (v_recipe_id, 'vermicelles de riz',         75,  'g',         true,  2,  'séchées'),
    (v_recipe_id, 'feuilles de laitue',         15,  'unité',     true,  3,  'romaine ou beurre'),
    (v_recipe_id, 'carotte',                    2,   'unité',     true,  4,  'julienne fine'),
    (v_recipe_id, 'radis blanc (daikon)',       0.5, 'unité',     true,  5,  'en bâtonnets'),
    (v_recipe_id, 'germes de soja',             140, 'g',         true,  6,  'environ 2 tasses'),
    (v_recipe_id, 'concombre',                  2,   'unité',     true,  7,  'julienne'),
    (v_recipe_id, 'menthe fraîche',             30,  'g',         true,  8,  'feuilles'),
    (v_recipe_id, 'coriandre fraîche',          30,  'g',         true,  9,  'brins'),
    (v_recipe_id, 'beurre de cacahuète',        2,   'c. à soupe',true,  10, 'naturel, non sucré'),
    (v_recipe_id, 'sauce hoisin',               2,   'c. à soupe',true,  11, NULL),
    (v_recipe_id, 'jus de lime',                2,   'c. à soupe',true,  12, NULL),
    (v_recipe_id, 'lait de coco allégé',        80,  'ml',        true,  13, NULL),
    (v_recipe_id, 'ail',                        1,   'gousse',    true,  14, 'râpée'),
    (v_recipe_id, 'sambal oelek',               1,   'c. à café', true,  15, NULL),
    (v_recipe_id, 'sauce soja foncée',          1,   'c. à café', true,  16, NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à café', true,  17, NULL),
    (v_recipe_id, 'sel',                        0.5, 'c. à café', true,  18, NULL),
    (v_recipe_id, 'cacahuètes rôties',          35,  'g',         false, 19, 'hachées, garniture'),
    (v_recipe_id, 'piments d''oiseau',          3,   'unité',     false, 20, 'tranchés, garniture');

  -- =====================================================================
  -- 2. Lemongrass Chicken Rice Paper Rolls
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Lemongrass Chicken Rice Paper Rolls',
    'Rouleaux de papier de riz vietnamiens garnis de poulet mariné à la citronnelle caramélisé, chou, carotte et herbes. Servis avec une sauce cacahuète hoisin.',
    $instr$["Mélanger les ingrédients de marinade et y faire mariner le poulet finement tranché 15 minutes.",
"Tremper les vermicelles dans l'eau bouillante 2 minutes, égoutter et refroidir.",
"Préparer la sauce cacahuète en mélangeant beurre de cacahuète, hoisin, vinaigre, lait, ail, sucre et sel.",
"Chauffer l'huile à feu vif dans une poêle antiadhésive, cuire le poulet 3 minutes en remuant constamment.",
"Remplir un bol d'eau froide et tremper rapidement (2-3 secondes) une feuille de papier de riz, placer sur une planche humide.",
"Garnir avec coriandre, poulet caramélisé, carotte, choux et menthe, terminer par les vermicelles.",
"Plier le bas du papier de riz sur la garniture, replier les côtés et enrouler fermement.",
"Servir immédiatement avec la sauce cacahuète."]
$instr$,
    25, 6, 5, 2,
    'Vietnamienne', 'lunch',
    ARRAY['vietnamien','poulet','citronnelle','papier de riz','sauce cacahuète','léger','frais'],
    'manual',
    'https://www.recipetineats.com/lemongrass-chicken-rice-paper-rolls/',
    'https://www.recipetineats.com/tachyon/2025/09/Lemongrass-chicken-rice-paper-rolls_3.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poitrine de poulet',         350, 'g',          true,  1,  'désossée, tranchée fine'),
    (v_recipe_id, 'sauce de poisson',           1.5, 'c. à soupe', true,  2,  'marinade'),
    (v_recipe_id, 'sucre roux',                 2,   'c. à soupe', true,  3,  'marinade'),
    (v_recipe_id, 'citronnelle',                1,   'c. à soupe', true,  4,  'râpée fin, marinade'),
    (v_recipe_id, 'jus de citron',              1,   'c. à soupe', true,  5,  'marinade'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  6,  'râpée, marinade'),
    (v_recipe_id, 'huile de canola',            1,   'c. à soupe', true,  7,  'pour cuire'),
    (v_recipe_id, 'papier de riz rond',         10,  'unité',      true,  8,  '22 cm de diamètre'),
    (v_recipe_id, 'vermicelles de riz',         70,  'g',          true,  9,  'séchées'),
    (v_recipe_id, 'chou vert',                  70,  'g',          true,  10, 'tranché fin'),
    (v_recipe_id, 'chou rouge',                 70,  'g',          true,  11, 'tranché fin'),
    (v_recipe_id, 'carotte',                    1,   'unité',      true,  12, 'julienne'),
    (v_recipe_id, 'coriandre fraîche',          60,  'ml',         true,  13, 'feuilles hachées'),
    (v_recipe_id, 'menthe fraîche',             180, 'ml',         true,  14, 'petites feuilles'),
    (v_recipe_id, 'beurre de cacahuète',        1.5, 'c. à soupe', true,  15, 'sauce'),
    (v_recipe_id, 'sauce hoisin',               2,   'c. à soupe', true,  16, 'sauce'),
    (v_recipe_id, 'vinaigre blanc',             1,   'c. à soupe', true,  17, 'sauce'),
    (v_recipe_id, 'lait',                       80,  'ml',         true,  18, 'sauce'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  19, 'râpée, sauce'),
    (v_recipe_id, 'sucre roux',                 2,   'c. à café',  true,  20, 'sauce'),
    (v_recipe_id, 'sambal oelek',               0.5, 'c. à café',  false, 21, 'sauce, optionnel');

  -- =====================================================================
  -- 3. Vietnamese Caramel Ginger Chicken
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Vietnamese Caramel Ginger Chicken',
    'Bouchées de poulet glacées dans une sauce caramel vietnamienne au gingembre frais. Recette à 5 ingrédients prête en 12 minutes de braisage, servie sur riz jasmin.',
    $instr$["Mélanger le poulet en morceaux avec la sauce de poisson et le piment, laisser reposer.",
"Dans une grande poêle antiadhésive, mélanger l'huile et le sucre à feu moyen-vif jusqu'à fonte en caramel brun.",
"Retirer la poêle du feu, ajouter délicatement poulet, gingembre et échalotes, bien mélanger pour enrober.",
"Remettre sur le feu et remuer jusqu'à ce que le poulet passe de rose à blanc à l'extérieur.",
"Ajouter l'eau bouillante, porter à ébullition puis réduire à mijotage rapide 10-12 minutes.",
"Continuer jusqu'à ce que le liquide réduise en glaçage épais qui enrobe les morceaux.",
"Servir sur riz jasmin avec coriandre fraîche et piment rouge tranché."]
$instr$,
    7, 15, 5, 2,
    'Vietnamienne', 'dinner',
    ARRAY['vietnamien','poulet','caramel','gingembre','rapide','5-ingrédients','asiatique'],
    'manual',
    'https://www.recipetineats.com/vietnamese-caramel-ginger-chicken/',
    'https://www.recipetineats.com/tachyon/2023/08/Vietnamese-Ginger-Caramel-Chicken_6-close-up.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet désossées',1000,'g',         true,  1,  'en morceaux de 5 cm, peau retirée'),
    (v_recipe_id, 'sauce de poisson',           3,   'c. à soupe',true,  2,  NULL),
    (v_recipe_id, 'piment d''oiseau',           1,   'unité',     false, 3,  'haché fin, optionnel'),
    (v_recipe_id, 'huile végétale',             3,   'c. à soupe',true,  4,  NULL),
    (v_recipe_id, 'sucre brun',                 60,  'ml',        true,  5,  'bien tassé'),
    (v_recipe_id, 'gingembre frais',            80,  'ml',        true,  6,  'julienne fine, 5 cm'),
    (v_recipe_id, 'échalotes',                  2,   'unité',     true,  7,  'tranchées fin'),
    (v_recipe_id, 'eau bouillante',             125, 'ml',        true,  8,  NULL);

  -- =====================================================================
  -- 4. Red Vietnamese Fried Rice (RecipeTin Eats)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Red Vietnamese Fried Rice (RecipeTin Eats)',
    'Riz frit vietnamien rouge enrichi de jambon, petits pois et œuf brouillé. Version repas complète et rapide du cơm đỏ traditionnel, prête en 15 minutes.',
    $instr$["Faire fondre le beurre à feu vif dans une grande poêle antiadhésive et cuire l'ail 10 secondes.",
"Ajouter le jambon haché et remuer 30 secondes jusqu'à légère dorure.",
"Incorporer les petits pois surgelés et cuire 30 secondes supplémentaires.",
"Ajouter la pâte de tomate et le riz, cuire 2 minutes pour éliminer le goût cru de la tomate.",
"Verser sauce de poisson, sauce soja et sucre, cuire 1 minute pour caraméliser légèrement.",
"Repousser le riz sur un côté de la poêle, faire fondre un peu de beurre, brouiller les œufs battus 1 minute.",
"Mélanger les œufs cuits au riz et servir immédiatement."]
$instr$,
    8, 7, 2, 2,
    'Vietnamienne', 'dinner',
    ARRAY['riz frit','vietnamien','rapide','jambon','œuf','asiatique','tomate'],
    'manual',
    'https://www.recipetineats.com/red-vietnamese-fried-rice/',
    'https://www.recipetineats.com/tachyon/2022/09/Red-Vietnamese-Fried-Rice_2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'beurre',                     30,  'g',          true,  1,  'non salé'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  2,  'hachée fin'),
    (v_recipe_id, 'dinde fumee',                     125, 'ml',         true,  3,  'haché en petits dés'),
    (v_recipe_id, 'petits pois surgelés',       250, 'ml',         true,  4,  NULL),
    (v_recipe_id, 'riz jasmin cuit',            625, 'ml',         true,  5,  'de la veille'),
    (v_recipe_id, 'pâte de tomate',             30,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'sauce de poisson',           10,  'ml',         true,  7,  NULL),
    (v_recipe_id, 'sauce soja',                 10,  'ml',         true,  8,  'tout usage ou claire'),
    (v_recipe_id, 'sucre',                      1,   'ml',         true,  9,  NULL),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  10, 'battus');

END $$;
