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
    'Brioches dorées garnies d''une chair de crabe enrobée d''une mayo-aneth, jus de citron et un trait de sauce de poisson pour l''umami. Twist vietnamien sur le classique côtier nord-américain.',
    $instr$["Sauce : fouetter ensemble mayonnaise, moutarde, sauce de poisson, aneth frais haché et jus de citron. Réserver au frais.",
"Bien essorer le crabe en pressant fermement pour retirer tout excès de liquide (l'eau du crabe dilue la sauce sinon).",
"Faire fondre le beurre dans une poêle, ajouter l'ail haché et cuire jusqu'au parfum (sans coloration).",
"Ajouter le crabe et remuer délicatement dans le beurre à l'ail 2 minutes — juste pour réchauffer, ne pas faire colorer.",
"Hors du feu, incorporer la sauce mayo et les oignons rouges finement hachés. Mélanger délicatement pour ne pas écraser la chair.",
"Beurrer les flancs des petits pains split-top et les toaster légèrement dans une poêle propre jusqu'à doré.",
"Garnir généreusement chaque pain de préparation au crabe. Parsemer de ciboulette ciselée et servir immédiatement."]
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
    (v_recipe_id, 'moutarde',           1,   'c. à soupe', true,  3,  'Dijon de préférence'),
    (v_recipe_id, 'sauce de poisson',   1,   'c. à café',  true,  4,  'nuoc mam'),
    (v_recipe_id, 'aneth frais',        1,   'c. à soupe', true,  5,  'haché'),
    (v_recipe_id, 'jus de citron',      1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'beurre',             45,  'g',          true,  7,  NULL),
    (v_recipe_id, 'ail',                2,   'gousse',     true,  8,  'haché'),
    (v_recipe_id, 'oignons rouges',     60,  'g',          true,  9,  'finement hachés'),
    (v_recipe_id, 'petits pains',       4,   'unité',      true,  10, 'split-top brioche'),
    (v_recipe_id, 'ciboulette',         1,   'c. à soupe', false, 11, 'hachée, garniture');

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
    'Bol coréen équilibré : bœuf bulgogi mariné soja-sésame-miel, légumes (épinards blanchis, courgette sautée, carotte), kimchi et œuf à jaune coulant sur riz, le tout arrosé d''une sauce gochujang-mayo crémeuse-piquante.',
    $instr$["Marinade : mélanger sauce soja, mirin, huile de sésame, ail haché, miel, sel et poivre. Ajouter le bœuf tranché fin et les lamelles d'oignon. Bien enrober. Mariner 30 min minimum (idéal 2 h).",
"Sauce gochujang crémeuse : fouetter gochujang, vinaigre de riz, mayonnaise, un trait de sauce soja, un peu d'huile de sésame et un soupçon de miel. Réserver.",
"Chauffer une grande poêle à feu moyen-vif. Cuire le bœuf et les oignons par fournées pour bien caraméliser (~4-5 min), sans surcharger la poêle.",
"Blanchir les épinards 30 secondes, plonger dans un bain d'eau glacée, presser fermement pour essorer.",
"Saute légèrement la courgette en lamelles à l'huile de sésame jusqu'à juste tendre. La carotte peut être servie crue (julienne) ou très brièvement sautée.",
"Cuire les œufs au plat à feu moyen jusqu'à blancs pris et jaunes restant coulants.",
"Dressage : diviser le riz chaud dans 4 bols. Disposer en quartiers les épinards, courgette, carotte, kimchi et bœuf bulgogi sur le riz. Poser un œuf au centre. Arroser de sauce gochujang et parsemer de graines de sésame.",
"Pour l'expérience authentique, percer le jaune et tout mélanger énergiquement avant de manger."]
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
    (v_recipe_id, 'bœuf (ribeye/entrecôte)', 454, 'g',          true,  1,  'tranché très fin (hotpot)'),
    (v_recipe_id, 'oignon',                  0.5, 'unité',      true,  2,  'gros, en lamelles'),
    (v_recipe_id, 'sauce soja',              120, 'ml',         true,  3,  'pour la marinade'),
    (v_recipe_id, 'mirin',                   30,  'ml',         true,  4,  NULL),
    (v_recipe_id, 'huile de sésame',         7.5, 'ml',         true,  5,  'pour la marinade'),
    (v_recipe_id, 'ail',                     30,  'g',          true,  6,  'haché (~6 gousses)'),
    (v_recipe_id, 'miel',                    7.5, 'ml',         true,  7,  'pour la marinade'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  8,  NULL),
    (v_recipe_id, 'poivre noir',             1,   'pincée',     true,  9,  'au goût'),
    -- Sauce
    (v_recipe_id, 'gochujang',               7.5, 'ml',         true,  10, 'pâte de piment coréenne'),
    (v_recipe_id, 'vinaigre de riz',         30,  'ml',         true,  11, NULL),
    (v_recipe_id, 'mayonnaise',              15,  'ml',         true,  12, NULL),
    (v_recipe_id, 'sauce soja',              10,  'ml',         true,  13, 'pour la sauce'),
    (v_recipe_id, 'huile de sésame',         5,   'ml',         true,  14, 'pour la sauce'),
    (v_recipe_id, 'miel',                    5,   'ml',         true,  15, 'pour la sauce'),
    -- Bol
    (v_recipe_id, 'riz blanc cuit',          4,   'unité',      true,  16, 'portions, blanc ou complet'),
    (v_recipe_id, 'épinards',                240, 'g',          true,  17, 'à blanchir'),
    (v_recipe_id, 'courgette',               1,   'unité',      true,  18, 'tranchée fin et sautée'),
    (v_recipe_id, 'carotte',                 150, 'g',          true,  19, 'en julienne'),
    (v_recipe_id, 'kimchi',                  100, 'g',          true,  20, NULL),
    (v_recipe_id, 'œufs',                    4,   'unité',      true,  21, 'au plat, jaune coulant'),
    (v_recipe_id, 'graines de sésame',       15,  'g',          false, 22, 'pour garnir');

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
    'Ailes de poulet croustillantes (air fryer) marinées au nuoc mam, laquées d''une sauce tamarin-piment-ail-sucre roux. Profil salé/sucré/aigre/piquant typique vietnamien, finition cacahuètes concassées + coriandre.',
    $instr$["Marinade : assaisonner les ailes avec sauce de poisson, sucre, poudre d'ail, sel et poivre. Bien enrober. Mariner 30 minutes minimum (idéal 2 h au frais).",
"Sécher les ailes au papier absorbant : la peau doit être sèche pour bien croustiller. Saupoudrer légèrement de farine de tapioca et secouer pour éliminer l'excédent.",
"Vaporiser le panier du air fryer d'huile en spray. Disposer les ailes en une seule couche sans les chevaucher.",
"Cuire à 200°C pendant 12-15 minutes en retournant à mi-cuisson, jusqu'à doré et croustillant.",
"Pendant ce temps, préparer la sauce : dans une casserole, combiner sucre roux, sauce de poisson, pâte de tamarin et eau. Porter à frémissement.",
"Ajouter l'oignon haché, les piments frais et l'ail haché. Mijoter quelques minutes jusqu'à ce que la sauce épaississe et nappe la cuillère.",
"Dans un grand bol, verser la sauce chaude sur les ailes cuites et les enrober uniformément.",
"Dresser et parsemer de cacahuètes concassées et de coriandre fraîche hachée. Servir immédiatement."]
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
    (v_recipe_id, 'ailes de poulet',        450, 'g',          true,  1,  'drumettes ou plates'),
    (v_recipe_id, 'sauce de poisson',       2,   'c. à soupe', true,  2,  'nuoc mam, pour la marinade'),
    (v_recipe_id, 'sucre',                  1,   'c. à soupe', true,  3,  'blanc ou roux, pour la marinade'),
    (v_recipe_id, 'poudre d''ail',          1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'sel',                    1,   'pincée',     true,  5,  'pour la marinade'),
    (v_recipe_id, 'poivre noir',            1,   'pincée',     true,  6,  'au goût'),
    (v_recipe_id, 'farine de tapioca',      2,   'c. à soupe', true,  7,  'ou fécule de maïs'),
    (v_recipe_id, 'huile en spray',         1,   'unité',      false, 8,  'pour le panier air fryer'),
    -- Sauce tamarin
    (v_recipe_id, 'sucre roux',             3,   'c. à soupe', true,  9,  'pour la sauce'),
    (v_recipe_id, 'sauce de poisson',       2,   'c. à soupe', true,  10, 'pour la sauce'),
    (v_recipe_id, 'pâte de tamarin',        1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'eau',                    30,  'ml',         true,  12, NULL),
    (v_recipe_id, 'oignon',                 1,   'unité',      true,  13, 'petit, grossièrement haché'),
    (v_recipe_id, 'piments frais',          3,   'unité',      true,  14, 'oiseau, plus selon goût'),
    (v_recipe_id, 'ail',                    4,   'gousse',     true,  15, 'haché'),
    -- Finition
    (v_recipe_id, 'cacahuètes concassées',  2,   'c. à soupe', false, 16, 'garniture'),
    (v_recipe_id, 'coriandre fraîche',      1,   'c. à soupe', false, 17, 'hachée, garniture');

  RAISE NOTICE 'Seed: 3 nguyenfoodstall recipes inserted for user %', v_user_id;
END $$;
