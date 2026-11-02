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
    'Feuilles de laitue fraîches et légères garnies de crevettes, de vermicelles, de légumes marinés et d''herbes, nappées d''une sauce cacahuète. Une version plus simple et plus légère des rouleaux de printemps à la galette de riz.',
    $instr$["Préparer les pickles (2 h à l'avance) : dissoudre le sucre et le sel des pickles dans l'eau bouillante, ajouter le vinaigre de riz et y plonger les bâtonnets de carotte et de radis blanc pendant 2 heures. Égoutter.",
"Faire tremper les vermicelles dans l'eau bouillante selon les indications du paquet, puis les rincer à l'eau froide et les égoutter.",
"Préparer la sauce cacahuète en fouettant le beurre de cacahuète, la sauce hoisin, le jus de citron vert, le lait de coco, l'ail, le sambal oelek, la sauce soja foncée, le sucre et le sel.",
"Couper les crevettes en deux dans l'épaisseur et retirer la veine.",
"Disposer tous les éléments (laitue, vermicelles, légumes, crevettes, herbes) sur un grand plateau.",
"Garnir chaque feuille de laitue de vermicelles, de légumes, de crevettes et d'herbes, arroser de sauce, puis parsemer de cacahuètes et de piment.",
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
    (v_recipe_id, 'crevettes cuites',           300, 'g',         true,  1,  'décortiquées, ou 600 g non décortiquées'),
    (v_recipe_id, 'vermicelles de riz',         75,  'g',         true,  2,  'secs'),
    (v_recipe_id, 'laitue',                     15,  'feuille',   true,  3,  'romaine ou laitue beurre'),
    -- Pickles express
    (v_recipe_id, 'carotte',                    2,   'unité',     true,  4,  'en fins bâtonnets'),
    (v_recipe_id, 'radis blanc',                0.5, 'unité',     true,  5,  'daikon, en fins bâtonnets'),
    (v_recipe_id, 'eau',                        360, 'ml',        true,  6,  'bouillante, pour les pickles'),
    (v_recipe_id, 'sucre',                      100, 'g',         true,  7,  'pour les pickles'),
    (v_recipe_id, 'sel',                        4,   'c. à café', true,  8,  'pour les pickles'),
    (v_recipe_id, 'vinaigre de riz',            180, 'ml',        true,  9,  'pour les pickles, ou vinaigre de cidre'),
    -- Légumes et herbes
    (v_recipe_id, 'germes de soja',             140, 'g',         true,  10, NULL),
    (v_recipe_id, 'concombre',                  2,   'unité',     true,  11, 'en julienne'),
    (v_recipe_id, 'menthe fraîche',             30,  'g',         true,  12, 'feuilles'),
    (v_recipe_id, 'coriandre fraîche',          30,  'g',         true,  13, 'brins'),
    -- Sauce cacahuète
    (v_recipe_id, 'beurre de cacahuète',        2,   'c. à soupe',true,  14, 'nature, non sucré'),
    (v_recipe_id, 'sauce hoisin',               2,   'c. à soupe',true,  15, NULL),
    (v_recipe_id, 'jus de citron vert',         2,   'c. à soupe',true,  16, NULL),
    (v_recipe_id, 'lait de coco allégé',        80,  'ml',        true,  17, NULL),
    (v_recipe_id, 'ail',                        1,   'gousse',    true,  18, 'râpée'),
    (v_recipe_id, 'sambal oelek',               1,   'c. à café', true,  19, NULL),
    (v_recipe_id, 'sauce soja foncée',          1,   'c. à café', true,  20, NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à café', true,  21, 'pour la sauce'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café', true,  22, 'pour la sauce'),
    -- Garniture
    (v_recipe_id, 'cacahuètes rôties',          35,  'g',         false, 23, 'hachées, garniture'),
    (v_recipe_id, 'piments d''oiseau',          3,   'unité',     false, 24, 'émincés, garniture');

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
    'Rouleaux de printemps vietnamiens garnis de poulet mariné à la citronnelle et caramélisé, de chou, de carotte et d''herbes. Servis avec une sauce cacahuète à la sauce hoisin.',
    $instr$["Mélanger les ingrédients de la marinade et y faire mariner le poulet finement tranché 15 minutes.",
"Tremper les vermicelles 2 minutes dans l'eau bouillante, puis les égoutter et les laisser refroidir.",
"Préparer la sauce cacahuète en mélangeant le beurre de cacahuète, la sauce hoisin, le vinaigre, le lait, l'ail, le sucre roux et le sambal oelek (optionnel).",
"Chauffer l'huile à feu vif dans une poêle antiadhésive et cuire le poulet 3 minutes en remuant constamment, jusqu'à ce qu'il caramélise.",
"Remplir un bol d'eau froide et y tremper rapidement (2-3 secondes) une galette de riz, puis la poser sur une planche humide.",
"Garnir de coriandre, de poulet caramélisé, de carotte, de chou et de menthe, et terminer par les vermicelles.",
"Rabattre le bas de la galette sur la garniture, replier les côtés et rouler fermement.",
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
    (v_recipe_id, 'blanc de poulet',            350, 'g',          true,  1,  'finement tranché'),
    (v_recipe_id, 'sauce de poisson',           1.5, 'c. à soupe', true,  2,  'marinade'),
    (v_recipe_id, 'sucre roux',                 2,   'c. à soupe', true,  3,  'marinade'),
    (v_recipe_id, 'citronnelle',                1,   'c. à soupe', true,  4,  'finement râpée, marinade'),
    (v_recipe_id, 'jus de citron',              1,   'c. à soupe', true,  5,  'marinade'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  6,  'râpée, marinade'),
    (v_recipe_id, 'huile de colza',             1,   'c. à soupe', true,  7,  'pour la cuisson'),
    (v_recipe_id, 'galettes de riz',            10,  'unité',      true,  8,  'rondes, 22 cm de diamètre'),
    (v_recipe_id, 'vermicelles de riz',         70,  'g',          true,  9,  'secs'),
    (v_recipe_id, 'chou vert',                  70,  'g',          true,  10, 'finement émincé'),
    (v_recipe_id, 'chou rouge',                 70,  'g',          true,  11, 'finement émincé'),
    (v_recipe_id, 'carotte',                    1,   'unité',      true,  12, 'en julienne'),
    (v_recipe_id, 'coriandre fraîche',          5,   'g',          true,  13, 'feuilles hachées'),
    (v_recipe_id, 'menthe fraîche',             15,  'g',          true,  14, 'petites feuilles'),
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
    'Bouchées de poulet glacées dans une sauce caramel vietnamienne au gingembre frais. Une recette express avec peu d''ingrédients, environ 12 minutes de mijotage, servie sur du riz jasmin.',
    $instr$["Mélanger le poulet en morceaux avec la sauce de poisson et le piment, puis laisser reposer.",
"Dans une grande poêle antiadhésive, chauffer l'huile et le sucre à feu moyen-vif jusqu'à ce que le sucre fonde et forme un caramel brun.",
"Retirer la poêle du feu, ajouter délicatement le poulet, le gingembre et les échalotes, et bien mélanger pour les enrober.",
"Remettre sur le feu et remuer jusqu'à ce que l'extérieur du poulet passe du rose au blanc.",
"Ajouter l'eau bouillante, porter à ébullition puis laisser mijoter vivement 10-12 minutes.",
"Poursuivre jusqu'à ce que le liquide ait réduit en un glaçage épais qui enrobe les morceaux.",
"Servir sur du riz jasmin, avec de la coriandre fraîche et du piment rouge émincé."]
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
    (v_recipe_id, 'sucre brun',                 55,  'g',         true,  5,  '60 ml bien tassés'),
    (v_recipe_id, 'gingembre frais',            5,   'cm',        true,  6,  'en fine julienne'),
    (v_recipe_id, 'échalotes',                  2,   'unité',     true,  7,  'finement émincées'),
    (v_recipe_id, 'eau',                        125, 'ml',        true,  8,  'bouillante'),
    -- Service
    (v_recipe_id, 'riz jasmin',                 400, 'g',         false, 9,  'cru, pour servir'),
    (v_recipe_id, 'coriandre fraîche',          5,   'g',         false, 10, 'garniture'),
    (v_recipe_id, 'piment rouge',               1,   'unité',     false, 11, 'émincé, garniture');

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
    'Riz frit vietnamien rouge à la dinde fumée, aux petits pois et à l''œuf brouillé. Une version plat complet et rapide du cơm đỏ traditionnel, prête en 15 minutes.',
    $instr$["Faire fondre la majeure partie du beurre à feu vif dans une grande poêle antiadhésive et cuire l'ail 10 secondes.",
"Ajouter la dinde fumée en dés et remuer 30 secondes, jusqu'à ce qu'elle dore légèrement.",
"Incorporer les petits pois surgelés et cuire encore 30 secondes.",
"Ajouter le concentré de tomate et le riz, et cuire 2 minutes pour éliminer le goût cru de la tomate.",
"Ajouter la sauce de poisson, la sauce soja et le sucre, et cuire 1 minute pour caraméliser légèrement.",
"Pousser le riz d'un côté de la poêle, faire fondre le reste du beurre et y brouiller les œufs battus 1 minute.",
"Mélanger les œufs cuits au riz et servir immédiatement."]
$instr$,
    8, 7, 2, 2,
    'Vietnamienne', 'dinner',
    ARRAY['riz frit','vietnamien','rapide','dinde fumée','œuf','asiatique','tomate'],
    'manual',
    'https://www.recipetineats.com/red-vietnamese-fried-rice/',
    'https://www.recipetineats.com/tachyon/2022/09/Red-Vietnamese-Fried-Rice_2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'beurre',                     30,  'g',          true,  1,  'doux, dont un peu pour les œufs'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  2,  'hachées finement'),
    (v_recipe_id, 'dinde fumée',                75,  'g',          true,  3,  'en petits dés'),
    (v_recipe_id, 'petits pois surgelés',       140, 'g',          true,  4,  NULL),
    (v_recipe_id, 'riz jasmin cuit',            450, 'g',          true,  5,  'de la veille'),
    (v_recipe_id, 'concentré de tomate',        2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'sauce de poisson',           10,  'ml',         true,  7,  NULL),
    (v_recipe_id, 'sauce soja',                 10,  'ml',         true,  8,  'classique ou claire'),
    (v_recipe_id, 'sucre',                      0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  10, 'battus');

END $$;
