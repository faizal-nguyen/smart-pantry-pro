-- =====================================================================
-- Seed: 3 recipes from nguyenfoodstall.com (2026-05-19)
--
-- Sources fetched 2026-05-19 :
--   1. https://nguyenfoodstall.com/blogs/sylvia-nguyens-vietnamese-and-fusion-recipes/crab-rolls-a-buttery-briny-summer-classic
--   2. https://nguyenfoodstall.com/blogs/sylvia-nguyens-vietnamese-and-fusion-recipes/protein-packed-beef-bulgogi-bibimbap-bowl
--   3. https://nguyenfoodstall.com/blogs/sylvia-nguyens-vietnamese-and-fusion-recipes/spicy-tamarind-fish-sauce-wings
--
-- Sylvia Nguyen — cuisine vietnamienne + fusion. Les 3 recettes
-- partagent l'identité fusion ("nuoc mam-forward") : Crab Roll
-- twisté à la sauce de poisson, bibimbap coréen revisité, ailes
-- tamarin/nuoc mam.
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` as owned
-- recipes for the audit user `c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6`.
-- Idempotent : DELETEs par nom en tête (FK cascade vide les ingrédients).
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-nguyenfoodstall.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Crab Rolls (Vietnamese-style)',
    'Beef Bulgogi Bibimbap Bowl',
    'Spicy Tamarind Fish Sauce Wings'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Crab Rolls (Vietnamese-style)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Crab Rolls (Vietnamese-style)',
    'Petits pains briochés dorés garnis de chair de crabe enrobée d''une mayonnaise à l''aneth et au citron, relevée d''un trait de sauce de poisson pour l''umami. Une touche vietnamienne sur un classique de la côte nord-américaine.',
    $instr$["Sauce : fouetter ensemble la mayonnaise, la moutarde, la sauce de poisson, l'aneth frais haché et le jus de citron. Réserver au frais.",
"Bien essorer le crabe en le pressant fermement pour retirer l'excès de liquide (sinon l'eau du crabe dilue la sauce).",
"Faire fondre une partie du beurre dans une poêle, ajouter l'ail haché et cuire jusqu'à ce qu'il embaume, sans coloration.",
"Ajouter le crabe et le remuer délicatement 2 minutes dans le beurre à l'ail, juste pour le réchauffer, sans le colorer.",
"Hors du feu, incorporer la sauce et l'oignon rouge finement haché. Mélanger délicatement pour ne pas écraser la chair.",
"Beurrer les côtés des petits pains et les faire légèrement dorer dans une poêle propre.",
"Garnir généreusement chaque pain de préparation au crabe. Parsemer de ciboulette ciselée et servir aussitôt."]
$instr$,
    30, 10, 4, 2,
    'Vietnamienne', 'lunch',
    ARRAY['vietnamien','fusion','crabe','fruits de mer','été','nuoc mam'],
    'manual',
    'https://nguyenfoodstall.com/blogs/sylvia-nguyens-vietnamese-and-fusion-recipes/crab-rolls-a-buttery-briny-summer-classic',
    'https://nguyenfoodstall.com/cdn/shop/articles/8308C79D-C2B9-4910-B3BF-E32F51994A20.jpg?v=1754842888&width=2000'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'chair de crabe',     400, 'g',          true,  1,  'crabe des neiges décongelé, bien égoutté'),
    (v_recipe_id, 'mayonnaise',         3,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'moutarde',           1,   'c. à soupe', true,  3,  'de Dijon de préférence'),
    (v_recipe_id, 'sauce de poisson',   1,   'c. à café',  true,  4,  'nuoc mam'),
    (v_recipe_id, 'aneth frais',        1,   'c. à soupe', true,  5,  'haché'),
    (v_recipe_id, 'jus de citron',      1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'beurre',             45,  'g',          true,  7,  'pour l''ail et pour dorer les pains'),
    (v_recipe_id, 'ail',                2,   'gousse',     true,  8,  'haché'),
    (v_recipe_id, 'oignons rouges',     60,  'g',          true,  9,  'finement hachés'),
    (v_recipe_id, 'petits pains',       4,   'unité',      true,  10, 'briochés, fendus sur le dessus (type hot-dog)'),
    (v_recipe_id, 'ciboulette',         1,   'c. à soupe', false, 11, 'ciselée, pour garnir');

  -- =====================================================================
  -- 2. Beef Bulgogi Bibimbap Bowl
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Beef Bulgogi Bibimbap Bowl',
    'Bol coréen équilibré : bœuf bulgogi mariné au soja, au sésame et au miel, légumes (épinards blanchis, courgette sautée, carotte), kimchi et œuf au jaune coulant sur du riz, le tout arrosé d''une sauce crémeuse et piquante au gochujang et à la mayonnaise.',
    $instr$["Marinade : mélanger la sauce soja, le vinaigre de riz, le sucre, l'eau, 1,5 c. à café d'huile de sésame, l'ail haché, le miel, le sel et le poivre. Ajouter le bœuf tranché finement et les lamelles d'oignon et bien les enrober. Laisser mariner au moins 30 min (idéalement 2 h).",
"Sauce gochujang crémeuse : fouetter le gochujang, le vinaigre de riz, la mayonnaise, un trait de sauce soja, un peu d'huile de sésame et un soupçon de miel. Réserver.",
"Chauffer une grande poêle à feu moyen-vif. Cuire le bœuf et l'oignon par fournées, sans surcharger la poêle, pour bien les caraméliser (4 à 5 min environ).",
"Blanchir les épinards 30 secondes, les plonger dans de l'eau glacée, puis les presser fermement pour les essorer.",
"Faire sauter légèrement la courgette en lamelles dans un peu d'huile de sésame jusqu'à ce qu'elle soit juste tendre. La carotte peut être servie crue (en julienne) ou très brièvement sautée.",
"Cuire les œufs au plat à feu moyen, jusqu'à ce que les blancs soient pris et les jaunes encore coulants.",
"Dressage : répartir le riz chaud dans 4 bols. Disposer en quartiers les épinards, la courgette, la carotte, le kimchi et le bœuf bulgogi sur le riz. Poser un œuf au centre. Arroser de sauce gochujang et parsemer de graines de sésame.",
"Pour une expérience authentique, percer le jaune et bien tout mélanger avant de déguster."]
$instr$,
    30, 15, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','fusion','bulgogi','bibimbap','bœuf','gochujang','bowl'],
    'manual',
    'https://nguyenfoodstall.com/blogs/sylvia-nguyens-vietnamese-and-fusion-recipes/protein-packed-beef-bulgogi-bibimbap-bowl',
    'https://nguyenfoodstall.com/cdn/shop/articles/PNG_image.png?v=1743537329&width=2000'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Bulgogi
    (v_recipe_id, 'entrecôte',               454, 'g',          true,  1,  'tranchée très finement (coupe pour fondue asiatique)'),
    (v_recipe_id, 'oignon',                  0.5, 'unité',      true,  2,  'gros, en lamelles'),
    (v_recipe_id, 'sauce soja',              120, 'ml',         true,  3,  'pour la marinade'),
    (v_recipe_id, 'vinaigre de riz',         2.5, 'c. à café',  true,  4,  'mélangé au sucre et à l''eau (ratio 3:1:3), pour la marinade'),
    (v_recipe_id, 'sucre',                   1,   'c. à café',  true,  5,  'pour la marinade'),
    (v_recipe_id, 'eau',                     2.5, 'c. à café',  true,  6,  'pour la marinade'),
    (v_recipe_id, 'huile de sésame',         1.5, 'c. à café',  true,  7,  'pour la marinade'),
    (v_recipe_id, 'ail',                     6,   'gousse',     true,  8,  'haché (environ 2 c. à soupe)'),
    (v_recipe_id, 'miel',                    1.5, 'c. à café',  true,  9,  'pour la marinade'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  10, NULL),
    (v_recipe_id, 'poivre noir',             1,   'pincée',     true,  11, 'au goût'),
    -- Sauce
    (v_recipe_id, 'gochujang',               1.5, 'c. à café',  true,  12, 'pâte de piment coréenne'),
    (v_recipe_id, 'vinaigre de riz',         30,  'ml',         true,  13, 'pour la sauce'),
    (v_recipe_id, 'mayonnaise',              1,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'sauce soja',              0.5, 'c. à café',  true,  15, 'pour la sauce'),
    (v_recipe_id, 'huile de sésame',         0.5, 'c. à café',  true,  16, 'pour la sauce'),
    (v_recipe_id, 'miel',                    1.5, 'c. à café',  true,  17, 'pour la sauce'),
    -- Bol
    (v_recipe_id, 'riz blanc',               300, 'g',          true,  18, 'poids cru (ou riz complet), cuit et servi chaud'),
    (v_recipe_id, 'épinards',                240, 'g',          true,  19, 'à blanchir'),
    (v_recipe_id, 'courgette',               1,   'unité',      true,  20, 'en fines lamelles, sautée'),
    (v_recipe_id, 'huile de sésame',         1,   'c. à café',  true,  21, 'pour sauter la courgette'),
    (v_recipe_id, 'carotte',                 150, 'g',          true,  22, 'en julienne'),
    (v_recipe_id, 'kimchi',                  100, 'g',          true,  23, NULL),
    (v_recipe_id, 'œufs',                    4,   'unité',      false, 24, 'au plat, jaune coulant, en option'),
    (v_recipe_id, 'graines de sésame',       1,   'c. à soupe', false, 25, 'pour garnir');

  -- =====================================================================
  -- 3. Spicy Tamarind Fish Sauce Wings
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Spicy Tamarind Fish Sauce Wings',
    'Ailes de poulet croustillantes cuites à l''air fryer, marinées au nuoc mam puis laquées d''une sauce au tamarin, au piment, à l''ail et au sucre roux. Un équilibre salé, sucré, acide et piquant typiquement vietnamien, avec des cacahuètes concassées et de la coriandre en finition.',
    $instr$["Marinade : assaisonner les ailes avec la sauce de poisson, le sucre, la poudre d'ail, le sel et le poivre. Bien les enrober et laisser mariner au moins 30 minutes (idéalement 2 h au réfrigérateur).",
"Sécher les ailes avec du papier absorbant : la peau doit être sèche pour bien croustiller. Les saupoudrer légèrement de farine de tapioca et secouer pour retirer l'excédent.",
"Vaporiser d'huile le panier de l'air fryer. Y disposer les ailes en une seule couche, sans qu'elles se chevauchent.",
"Cuire à 200°C pendant 12 à 15 minutes en les retournant à mi-cuisson, jusqu'à ce qu'elles soient dorées, croustillantes et cuites à cœur (prolonger de quelques minutes si besoin).",
"Pendant ce temps, préparer la sauce : dans une casserole, réunir le sucre roux, la sauce de poisson, la pâte de tamarin et l'eau. Porter à frémissement.",
"Ajouter l'oignon haché, les piments frais et l'ail haché. Laisser mijoter quelques minutes, jusqu'à ce que la sauce épaississe et nappe la cuillère.",
"Dans un grand bol, verser la sauce chaude sur les ailes cuites et bien les enrober.",
"Dresser, puis parsemer de cacahuètes concassées et de coriandre fraîche hachée. Servir aussitôt."]
$instr$,
    30, 15, 2, 2,
    'Vietnamienne', 'appetizer',
    ARRAY['vietnamien','poulet','ailes','tamarin','nuoc mam','air fryer','épicé'],
    'manual',
    'https://nguyenfoodstall.com/blogs/sylvia-nguyens-vietnamese-and-fusion-recipes/spicy-tamarind-fish-sauce-wings',
    'https://nguyenfoodstall.com/cdn/shop/articles/IMG_7057.jpg?v=1743102131&width=2000'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade + croustillant
    (v_recipe_id, 'ailes de poulet',        450, 'g',          true,  1,  'manchons ou ailerons'),
    (v_recipe_id, 'sauce de poisson',       2,   'c. à soupe', true,  2,  'nuoc mam, pour la marinade'),
    (v_recipe_id, 'sucre',                  1,   'c. à soupe', true,  3,  'blanc ou roux, pour la marinade'),
    (v_recipe_id, 'poudre d''ail',          1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'sel',                    1,   'pincée',     true,  5,  'pour la marinade'),
    (v_recipe_id, 'poivre noir',            1,   'pincée',     true,  6,  'au goût'),
    (v_recipe_id, 'farine de tapioca',      2,   'c. à soupe', true,  7,  'ou fécule de maïs'),
    (v_recipe_id, 'huile végétale',         1,   'c. à café',  false, 8,  'en spray, pour le panier de l''air fryer'),
    -- Sauce tamarin
    (v_recipe_id, 'sucre roux',             3,   'c. à soupe', true,  9,  'pour la sauce'),
    (v_recipe_id, 'sauce de poisson',       2,   'c. à soupe', true,  10, 'pour la sauce'),
    (v_recipe_id, 'pâte de tamarin',        1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'eau',                    30,  'ml',         true,  12, NULL),
    (v_recipe_id, 'oignon',                 1,   'unité',      true,  13, 'petit, grossièrement haché'),
    (v_recipe_id, 'piments oiseau',         3,   'unité',      true,  14, 'frais, plus selon le goût'),
    (v_recipe_id, 'ail',                    4,   'gousse',     true,  15, 'haché'),
    -- Finition
    (v_recipe_id, 'cacahuètes',             2,   'c. à soupe', false, 16, 'grillées et concassées, pour garnir'),
    (v_recipe_id, 'coriandre fraîche',      1,   'c. à soupe', false, 17, 'hachée, pour garnir');

  RAISE NOTICE 'Seed: 3 nguyenfoodstall recipes inserted for user %', v_user_id;
END $$;
