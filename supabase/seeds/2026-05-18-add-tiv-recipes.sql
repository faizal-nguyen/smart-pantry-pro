-- =====================================================================
-- Seed: 6 recipes from Tiv's newsletter (2026-05-18)
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` as
-- owned recipes for the audit user `c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6`.
-- Idempotent on re-run: drops the same recipes by name first.
--
-- Run from Supabase Studio (SQL editor) or via psql:
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-18-add-tiv-recipes.sql
--
-- Instructions are stored as a JSON array (text) so RecipeDetail.tsx
-- can parse them step-by-step. Quantities are stored as decimals;
-- units follow the "default to 'unité' unless explicitly numbered"
-- convention introduced 2026-05-18.
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Gochujang Masala Pasta',
    'Tandoori Chicken (yaourt grec)',
    'One-pan Tandoori Chicken & Rice',
    'Green Chutney (chutney vert maison)',
    'Healthier Paneer Tikka Masala',
    'Tandoori Salmon Glow Bowl'
  ];
BEGIN

  -- ---------- cleanup any previous seed run (idempotence) ------------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);
  -- (recipe_ingredients cascades via FK ON DELETE CASCADE)

  -- =====================================================================
  -- 1. Gochujang Masala Pasta
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type
  ) VALUES (
    v_user_id,
    'Gochujang Masala Pasta',
    'Fusion entre Asie du Sud, Asie de l''Est et Italie : gochujang, épices indiennes et parmesan enrobent des pâtes. Ça paraît fou, mais ça marche à tous les coups.',
    $instr$["Porter à ébullition une grande casserole d'eau salée et y cuire les pâtes environ 16 min (selon le paquet). Réserver environ 80 ml d'eau de cuisson avant d'égoutter.",
"Chauffer 1 à 2 c. à soupe d'huile à l'ail (ou d'huile d'olive avec un peu plus d'ail) dans une poêle. Ajouter l'oignon rouge émincé et une pincée de graines de cumin.",
"Au bout de 2 min, ajouter l'ail et le piment serrano émincés. Cuire jusqu'à ce que l'oignon soit doré, environ 5 min.",
"Ajouter 2 c. à soupe de gochujang, 1 c. à café de sel, 1 c. à café de cumin moulu, 1 c. à café de coriandre moulue, 1 c. à café de piment du Cachemire et une pincée de poivre noir.",
"Mélanger, puis verser 60 ml de lait. Ajouter environ 30 g de parmesan râpé et remuer jusqu'à ce qu'il fonde dans la sauce.",
"Ajouter les pâtes cuites et verser progressivement l'eau de cuisson réservée jusqu'à obtenir la consistance voulue. On peut ajouter un peu plus de lait.",
"Goûter et ajuster l'assaisonnement avec jusqu'à 1 c. à café supplémentaire de sel, de piment du Cachemire, de cumin moulu et de coriandre moulue.",
"Arroser de jus de citron vert, garnir de coriandre fraîche, d'oignon vert émincé et d'un peu de parmesan. Délicieux avec un poulet tandoori bien juteux."]
$instr$,
    5, 20, 2, 2,
    'Fusion', 'dinner',
    ARRAY['pâtes','fusion','gochujang','épicé','indien','italien'],
    'manual'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'pâtes',                  200, 'g',     true,  1,  'idéalement riches en fibres et pauvres en glucides'),
    (v_recipe_id, 'huile à l''ail',         2,   'c. à soupe', true,  2,  'ou huile d''olive + ail supplémentaire'),
    (v_recipe_id, 'oignon rouge',           0.5, 'unité', true,  3,  'émincé'),
    (v_recipe_id, 'ail',                    3,   'gousse', true,  4,  'émincé (environ 1 c. à soupe)'),
    (v_recipe_id, 'piment serrano',         1,   'unité', true,  5,  'émincé (environ 1 c. à soupe)'),
    (v_recipe_id, 'gochujang',              2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'lait',                   80,  'ml',    true,  7,  '60 ml + un peu pour ajuster'),
    (v_recipe_id, 'parmesan',               40,  'g',     true,  8,  'râpé ; 30 g dans la sauce + un peu pour servir'),
    (v_recipe_id, 'graines de cumin',       1,   'pincée', true,  9,  NULL),
    (v_recipe_id, 'sel',                    2,   'c. à café', true,  10, '1 + 1 pour ajuster'),
    (v_recipe_id, 'cumin moulu',            2,   'c. à café', true,  11, '1 + 1 pour ajuster'),
    (v_recipe_id, 'coriandre moulue',       2,   'c. à café', true,  12, '1 + 1 pour ajuster'),
    (v_recipe_id, 'piment du Cachemire moulu', 2, 'c. à café', true,  13, '1 + 1 pour ajuster'),
    (v_recipe_id, 'poivre noir',            1,   'pincée', true,  14, NULL),
    (v_recipe_id, 'citron vert',            1,   'unité', false, 15, 'pour servir'),
    (v_recipe_id, 'coriandre fraîche',      4,   'brin',  false, 16, 'pour garnir'),
    (v_recipe_id, 'oignons verts',          1,   'unité', false, 17, 'émincé, pour garnir');

  -- =====================================================================
  -- 2. Tandoori Chicken (yaourt grec)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, rest_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type, nutrition_info
  ) VALUES (
    v_user_id,
    'Tandoori Chicken (yaourt grec)',
    'Poulet tandoori mariné au yaourt grec, une version riche en protéines, avec des cuisses ou des blancs selon l''envie. Environ 240 kcal, 36 g de protéines, 6 g de glucides et 7 g de lipides par portion.',
    $instr$["Émincer finement l'ail, le piment serrano et le gingembre.",
"Dans un bol, mélanger 120 g de yaourt grec détendu avec un peu d'eau, le piment serrano, le gingembre et l'ail émincés, 2 c. à café de sel (idéalement de l'Himalaya), 1 c. à café de curcuma, 3 c. à café de piment du Cachemire, 2 c. à café de cumin moulu, 2 c. à café de coriandre moulue, 2 c. à café de paprika et une pincée de feuilles de fenugrec séchées (kasoori methi).",
"Ajouter les 450 g de poulet (cuisses ou blancs désossés) et bien l'enrober de marinade.",
"Couvrir et réfrigérer jusqu'à 24 h. L'idéal est une nuit entière ; 1 à 2 h au minimum si l'on est pressé.",
"Faire chauffer le ghee (ou de l'huile d'olive) dans une poêle jusqu'à ce qu'elle soit bien chaude.",
"Ajouter le poulet et ne pas y toucher pendant 5 min. Vérifier qu'il est doré et croustillant dessous.",
"Retourner les morceaux, baisser à feu moyen et cuire encore 5 à 7 min, jusqu'à ce que le poulet soit cuit à cœur."]
$instr$,
    15, 12, 60, 3, 2,
    'Indienne', 'dinner',
    ARRAY['poulet','tandoori','high-protein','indien','marinade'],
    'manual',
    '{"calories":240,"protein_g":36,"carbs_g":6,"fat_g":7,"per_serving":true}'::jsonb
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'poulet',              450, 'g',     true,  1,  'cuisses ou blancs désossés'),
    (v_recipe_id, 'yaourt grec',          120, 'g',     true,  2,  NULL),
    (v_recipe_id, 'eau',                  1,   'c. à soupe', true,  3,  'pour détendre le yaourt'),
    (v_recipe_id, 'piment serrano',       1,   'unité', true,  4,  'émincé (environ 1 c. à soupe)'),
    (v_recipe_id, 'gingembre',            2.5, 'cm',    true,  5,  'émincé (environ 1 c. à soupe)'),
    (v_recipe_id, 'ail',                  3,   'gousse', true,  6,  'émincé (environ 1 c. à soupe)'),
    (v_recipe_id, 'sel',                  2,   'c. à café', true,  7,  'idéalement sel rose de l''Himalaya'),
    (v_recipe_id, 'curcuma',              1,   'c. à café', true,  8,  NULL),
    (v_recipe_id, 'piment du Cachemire moulu', 3, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'cumin moulu',          2,   'c. à café', true,  10, NULL),
    (v_recipe_id, 'coriandre moulue',     2,   'c. à café', true,  11, NULL),
    (v_recipe_id, 'paprika',              2,   'c. à café', true,  12, NULL),
    (v_recipe_id, 'feuilles de fenugrec séchées', 1, 'pincée', false, 13, 'kasoori methi'),
    (v_recipe_id, 'ghee',                 1,   'c. à soupe', true,  14, 'ou huile d''olive');

  -- =====================================================================
  -- 3. One-pan Tandoori Chicken & Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, rest_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type, nutrition_info
  ) VALUES (
    v_user_id,
    'One-pan Tandoori Chicken & Rice',
    'Poulet tandoori et riz cuits dans une seule cocotte ; le riz cuit dans le bouillon d''os pour plus de saveur et de protéines. Environ 480 kcal, 38 g de protéines et 28 g de glucides par portion.',
    $instr$["La veille (ou au moins 30 min avant) : dans un bol, mélanger 120 g de yaourt grec détendu avec un peu d'eau, la pâte gingembre-ail (ou de l'ail et du gingembre frais émincés), le piment serrano émincé, 1 c. à café de sel, 1/2 c. à café de poivre noir, 1 c. à café de paprika, 2 c. à café de coriandre moulue, 2 c. à café de cumin moulu et 1 c. à café de curcuma. Bien enrober les cuisses de poulet, couvrir et réfrigérer.",
"Le jour J : chauffer une cocotte haute (assez profonde pour cuire aussi le riz). Ajouter le ghee et le laisser bien chauffer.",
"Ajouter le poulet mariné et le saisir 7 à 8 min de chaque côté jusqu'à ce qu'il soit bien doré. Retirer et réserver.",
"Dans la même cocotte, ajouter l'oignon émincé et cuire 5 min jusqu'à ce qu'il soit doré.",
"Ajouter la tomate Roma coupée en dés et cuire 3 à 5 min, jusqu'à ce qu'elle soit confite.",
"Ajouter 1 c. à café de cumin moulu, 1 c. à café de coriandre moulue, 1 c. à café de curcuma, le piment rouge en poudre (ou du paprika) et 2 c. à café de sel. Mélanger.",
"Ajouter le riz basmati lavé et le faire revenir 1 min dans le mélange.",
"Verser 414 ml de bouillon d'os. Remuer rapidement, puis replacer le poulet sur le riz.",
"Couvrir et cuire à feu moyen 15 min, jusqu'à ce que le riz soit tendre et le poulet cuit.",
"Parsemer de coriandre fraîche avant de servir."]
$instr$,
    15, 40, 60, 4, 3,
    'Indienne', 'dinner',
    ARRAY['poulet','tandoori','riz','one-pot','indien','meal-prep'],
    'manual',
    '{"calories":480,"protein_g":38,"carbs_g":28,"per_serving":true}'::jsonb
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet',         450, 'g',     true,  1,  NULL),
    (v_recipe_id, 'yaourt grec',               120, 'g',     true,  2,  NULL),
    (v_recipe_id, 'eau',                       1,   'c. à soupe', true,  3,  'pour détendre le yaourt'),
    (v_recipe_id, 'pâte gingembre-ail',        1,   'c. à soupe', true,  4,  'ou ail et gingembre frais émincés'),
    (v_recipe_id, 'piment serrano',            1,   'unité', true,  5,  'émincé'),
    (v_recipe_id, 'sel',                       3,   'c. à café', true,  6,  '1 pour la marinade + 2 pour le riz'),
    (v_recipe_id, 'poivre noir',               0.5, 'c. à café', true,  7,  NULL),
    (v_recipe_id, 'paprika',                   1,   'c. à café', true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',          3,   'c. à café', true,  9,  '2 pour la marinade + 1 pour le riz'),
    (v_recipe_id, 'cumin moulu',               3,   'c. à café', true,  10, '2 pour la marinade + 1 pour le riz'),
    (v_recipe_id, 'curcuma',                   2,   'c. à café', true,  11, '1 pour la marinade + 1 pour le riz'),
    (v_recipe_id, 'ghee',                      1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'oignon',                    0.5, 'unité', true,  13, 'émincé dans la longueur'),
    (v_recipe_id, 'tomate Roma',               1,   'unité', true,  14, 'coupée en dés'),
    (v_recipe_id, 'riz basmati',               180, 'g',     true,  15, 'lavé'),
    (v_recipe_id, 'bouillon d''os',            414, 'ml',    true,  16, NULL),
    (v_recipe_id, 'piment rouge en poudre',    1,   'c. à café', false, 17, 'ou paprika'),
    (v_recipe_id, 'coriandre fraîche',         4,   'brin',  false, 18, 'pour garnir');

  -- =====================================================================
  -- 4. Green Chutney
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type
  ) VALUES (
    v_user_id,
    'Green Chutney (chutney vert maison)',
    'Chutney polyvalent : sauce pour pizza, wraps et bowls, ou dip une fois mélangé à du yaourt. Il se garde 7 à 10 jours au réfrigérateur. La coriandre et la menthe aident à la digestion et le citron vert apporte de la vitamine C.',
    $instr$["Laver les bottes de coriandre et couper seulement 2 à 3 cm à l'extrémité des tiges (garder le reste des tiges).",
"Mettre dans un blender puissant : la coriandre, la menthe, les piments serrano (un seul pour moins de piquant), l'ail, les noix de cajou, le jus des citrons verts, 1/2 c. à café de poivre noir, 1 c. à café de sel et 1/2 c. à café de cumin moulu.",
"Mixer jusqu'à obtenir une texture lisse.",
"Conserver dans un bocal hermétique au réfrigérateur 7 à 10 jours."]
$instr$,
    5, 0, 6, 1,
    'Indienne', 'sauce',
    ARRAY['chutney','sauce','coriandre','menthe','indien','condiment'],
    'manual'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'coriandre fraîche',  3,   'botte', true, 1, 'tiges presque entières'),
    (v_recipe_id, 'menthe fraîche',     20,  'g',     true, 2, 'une poignée de feuilles'),
    (v_recipe_id, 'piment serrano',     2,   'unité', true, 3, '1 seul pour moins de piquant'),
    (v_recipe_id, 'ail',                5,   'gousse', true, 4, NULL),
    (v_recipe_id, 'noix de cajou',      15,  'g',     true, 5, 'environ 10 noix'),
    (v_recipe_id, 'citron vert',        4,   'unité', true, 6, 'pressés (3 à 4 selon la taille)'),
    (v_recipe_id, 'poivre noir',        0.5, 'c. à café', true, 7, NULL),
    (v_recipe_id, 'sel',                1,   'c. à café', true, 8, NULL),
    (v_recipe_id, 'cumin moulu',        0.5, 'c. à café', true, 9, NULL);

  -- =====================================================================
  -- 5. Healthier Paneer Tikka Masala
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type, nutrition_info
  ) VALUES (
    v_user_id,
    'Healthier Paneer Tikka Masala',
    'Version riche en protéines, sans crème épaisse : le cottage cheese et les noix de cajou apportent l''onctuosité. Environ 280 kcal, 18 g de protéines et 7 g de glucides par portion.',
    $instr$["Faire tremper les noix de cajou dans de l'eau 10 à 15 min pendant la préparation des légumes.",
"Hacher grossièrement l'oignon, les tomates, le piment serrano et l'ail.",
"Dans une poêle, chauffer l'huile et faire revenir l'ail, l'oignon et le piment serrano 3 à 5 min. Ajouter la pâte gingembre-ail et cuire jusqu'à ce que le mélange soit doré. Ajouter les tomates et le concentré de tomate, puis cuire encore 3 min, jusqu'à ce que les tomates soient tendres.",
"Ajouter 2 c. à café de sel, 1 c. à café de poivre noir, 1 c. à café de curcuma, 1 c. à café de cumin moulu, 1 c. à café de coriandre moulue, 1,5 c. à café de piment du Cachemire, 1/2 c. à café de paprika et 1/2 c. à café de garam masala. Cuire à feu moyen 5 à 7 min.",
"Transférer dans un blender. Ajouter les noix de cajou égouttées, 120 g de cottage cheese et 120 ml d'eau. Mixer jusqu'à obtenir une sauce lisse.",
"Reverser la sauce dans la poêle. Couper le paneer en cubes et l'ajouter. Laisser mijoter 5 min à feu moyen-doux pour que les saveurs se mêlent.",
"Parsemer de coriandre fraîche et d'une pincée de piment du Cachemire pour la couleur."]
$instr$,
    15, 20, 6, 3,
    'Indienne', 'dinner',
    ARRAY['paneer','végétarien','high-protein','indien','tikka','masala'],
    'manual',
    '{"calories":280,"protein_g":18,"carbs_g":7,"per_serving":true}'::jsonb
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'paneer',                  450, 'g',     true,  1,  'coupé en cubes'),
    (v_recipe_id, 'tomate Roma',             2,   'unité', true,  2,  'hachées grossièrement'),
    (v_recipe_id, 'piment serrano',          1,   'unité', true,  3,  'un demi pour une version douce, entier pour une version épicée'),
    (v_recipe_id, 'oignon jaune',            1,   'unité', true,  4,  'moyen, haché grossièrement'),
    (v_recipe_id, 'ail',                     5,   'gousse', true,  5,  'haché'),
    (v_recipe_id, 'huile d''olive',          1,   'c. à soupe', true,  6,  'ou ghee'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'concentré de tomate',     60,  'g',     true,  8,  NULL),
    (v_recipe_id, 'noix de cajou',           30,  'g',     true,  9,  'une poignée, trempées 10 à 15 min'),
    (v_recipe_id, 'cottage cheese',          120, 'g',     true,  10, NULL),
    (v_recipe_id, 'eau',                     120, 'ml',    true,  11, 'pour mixer la sauce'),
    (v_recipe_id, 'sel',                     2,   'c. à café', true,  12, NULL),
    (v_recipe_id, 'poivre noir',             1,   'c. à café', true,  13, NULL),
    (v_recipe_id, 'curcuma',                 1,   'c. à café', true,  14, NULL),
    (v_recipe_id, 'cumin moulu',             1,   'c. à café', true,  15, NULL),
    (v_recipe_id, 'coriandre moulue',        1,   'c. à café', true,  16, NULL),
    (v_recipe_id, 'piment du Cachemire moulu', 1.5, 'c. à café', true,  17, 'plus une pincée pour la finition'),
    (v_recipe_id, 'paprika',                 0.5, 'c. à café', true,  18, NULL),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café', true,  19, NULL),
    (v_recipe_id, 'coriandre fraîche',       5,   'brin',  false, 20, 'pour garnir');

  -- =====================================================================
  -- 6. Tandoori Salmon Glow Bowl
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type, nutrition_info
  ) VALUES (
    v_user_id,
    'Tandoori Salmon Glow Bowl',
    'Bol complet : quinoa épicé aux edamames, saumon tandoori à l''air fryer, blettes arc-en-ciel à l''ail et sauce chutney vert au cottage cheese. Environ 525 kcal, 45 g de protéines et 26 g de glucides par portion.',
    $instr$["Quinoa : régler l'autocuiseur électrique (type Instant Pot) en mode sauté. Chauffer un filet d'huile, ajouter 1/2 c. à soupe de graines de moutarde, les feuilles de curry séchées et le piment serrano fendu ; laisser grésiller 30 s.",
"Ajouter le demi-oignon coupé en dés et cuire 3 min. Ajouter les 2 tomates coupées en dés et cuire 5 min.",
"Ajouter la moitié de la pâte gingembre-ail, du sel, le poivre, une partie du curcuma et de la coriandre moulue, 1/2 c. à café de cumin moulu, le piment rouge en poudre et 80 g d'edamames surgelés.",
"Une fois le liquide des légumes évaporé, ajouter 90 g de quinoa rincé et 240 ml d'eau. Cuire 1 min sous pression, puis laisser la pression retomber naturellement 10 min.",
"Saumon : mélanger le reste de la pâte gingembre-ail, le jus d'un demi-citron vert, 30 ml d'aminos de coco, le reste du curcuma et de la coriandre moulue, le piment du Cachemire, le garam masala et du sel. Enrober les filets de saumon et laisser mariner au moins 10 min.",
"Cuire le saumon à l'air fryer à 200°C pendant 10 min, jusqu'à ce qu'il soit doré.",
"Sauce : mixer 240 g de cottage cheese, la coriandre fraîche (en gardant un peu pour garnir), 1 c. à café de cumin moulu, 1/2 c. à café de sel et le jus d'un citron vert (en option : un peu de menthe et 1/2 piment serrano).",
"Blettes : laver les blettes et séparer les côtes des feuilles. Faire revenir les côtes hachées avec l'ail émincé dans un peu d'huile 1 à 2 min. Ajouter les feuilles et cuire 3 à 5 min, jusqu'à ce qu'elles soient tombées. Assaisonner de sel, de poivre et du jus d'un demi-citron vert.",
"Assemblage : répartir dans les bols les blettes, le quinoa et le saumon, puis ajouter l'oignon rouge émincé, 2 c. à soupe de fromage de chèvre émietté, 2 c. à soupe de sauce et de la coriandre fraîche."]
$instr$,
    15, 30, 3, 3,
    'Fusion', 'dinner',
    ARRAY['saumon','bowl','indien','quinoa','high-protein','glow-bowl','tandoori'],
    'manual',
    '{"calories":525,"protein_g":45,"carbs_g":26,"per_serving":true}'::jsonb
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    -- saumon
    (v_recipe_id, 'filet de saumon',       3,   'unité', true,  1,  '1 par portion'),
    (v_recipe_id, 'pâte gingembre-ail',    1,   'c. à soupe', true,  2,  'moitié pour le quinoa, moitié pour le saumon'),
    (v_recipe_id, 'citron vert',           2,   'unité', true,  3,  '1/2 pour le saumon + 1 pour la sauce + 1/2 pour les blettes'),
    (v_recipe_id, 'aminos de coco',        30,  'ml',    true,  4,  'ou sauce tamari'),
    (v_recipe_id, 'curcuma',               1,   'c. à café', true,  5,  'saumon et quinoa'),
    (v_recipe_id, 'piment du Cachemire moulu', 0.5, 'c. à café', true,  6,  NULL),
    (v_recipe_id, 'garam masala',          0.25,'c. à café', true,  7,  NULL),
    (v_recipe_id, 'coriandre moulue',      1.25,'c. à café', true,  8,  'saumon et quinoa'),
    (v_recipe_id, 'sel',                   3,   'c. à café', true,  9,  'réparti'),
    -- quinoa
    (v_recipe_id, 'quinoa',                90,  'g',     true,  10, 'rincé'),
    (v_recipe_id, 'eau',                   240, 'ml',    true,  11, 'pour le quinoa'),
    (v_recipe_id, 'huile d''olive',        1.5, 'c. à soupe', true,  12, 'pour le quinoa et les blettes'),
    (v_recipe_id, 'oignon jaune',          0.5, 'unité', true,  13, 'coupé en dés'),
    (v_recipe_id, 'tomate',                2,   'unité', true,  14, 'coupées en dés'),
    (v_recipe_id, 'piment serrano',        1,   'unité', true,  15, 'fendu dans la longueur (+ 1/2 en option pour la sauce)'),
    (v_recipe_id, 'edamame',               80,  'g',     true,  16, 'surgelés, écossés'),
    (v_recipe_id, 'graines de moutarde',   0.5, 'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'feuilles de curry',     6,   'feuille', false, 18, 'séchées'),
    (v_recipe_id, 'poivre noir',           0.5, 'c. à café', true,  19, NULL),
    (v_recipe_id, 'cumin moulu',           1.5, 'c. à café', true,  20, '1/2 pour le quinoa + 1 pour la sauce'),
    (v_recipe_id, 'piment rouge en poudre', 0.5, 'c. à café', true,  21, NULL),
    -- sauce
    (v_recipe_id, 'cottage cheese',        240, 'g',     true,  22, NULL),
    (v_recipe_id, 'coriandre fraîche',     20,  'g',     true,  23, 'pour la sauce + un peu pour garnir'),
    (v_recipe_id, 'menthe fraîche',        2,   'brin',  false, 24, 'en option, pour la sauce'),
    -- blettes
    (v_recipe_id, 'blettes arc-en-ciel',   3,   'botte', true,  25, '1 botte par portion'),
    (v_recipe_id, 'ail',                   6,   'gousse', true,  26, 'émincé (4 à 6 gousses)'),
    -- garnitures
    (v_recipe_id, 'oignon rouge',          0.25,'unité', false, 27, 'émincé, pour garnir'),
    (v_recipe_id, 'fromage de chèvre',     45,  'g',     false, 28, 'émietté, 2 c. à soupe par bol');

  RAISE NOTICE 'Seed: inserted 6 recipes for user %', v_user_id;
END $$;
