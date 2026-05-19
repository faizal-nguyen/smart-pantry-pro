-- =====================================================================
-- Seed: 14 Malaysian recipes from nyonyacooking.com (2026-05-19)
--
-- Sources fetched 2026-05-19 :
--   1. https://www.nyonyacooking.com/recipes/ayam-goreng-berempah~KqxUD95ec
--   2. https://www.nyonyacooking.com/recipes/mee-rebus~kENqadbek
--   3. https://www.nyonyacooking.com/recipes/mee-goreng-mamak~BkTLRjTuX
--   4. https://www.nyonyacooking.com/recipes/teh-tarik-recipe-frothy~BJSmOwiDMqZ7
--   5. https://www.nyonyacooking.com/recipes/asam-laksa~SJZmuvivzcZQ
--   6. https://www.nyonyacooking.com/recipes/penang-char-kuey-teow~r1DzuvivfqbX
--   7. https://www.nyonyacooking.com/recipes/satay-sauce~BJoedDovz5bQ
--   8. https://www.nyonyacooking.com/recipes/chicken-satay~rJRl_PjvMcbX
--   9. https://www.nyonyacooking.com/recipes/nasi-goreng-usa~BJ9g_DsDzqWQ
--  10. https://www.nyonyacooking.com/recipes/ramly-burger~HJ7x_PiPG9Wm
--  11. https://www.nyonyacooking.com/recipes/chicken-rendang~rkU1dPiPG5b7
--  12. https://www.nyonyacooking.com/recipes/ayam-masak-merah~ByApwDivGqZX
--  13. https://www.nyonyacooking.com/recipes/ayam-masak-kicap-madu-chicken-in-honey-soy-sauce~SJsaPwjPzqZ7
--  14. https://www.nyonyacooking.com/recipes/roti-jala~0m4-EzLwI
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` as owned
-- recipes for the audit user `c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6`.
-- Idempotent : DELETEs by name first (cascade vide recipe_ingredients).
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-malaysian-recipes.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Ayam Goreng Berempah',
    'Mee Rebus',
    'Mee Goreng Mamak',
    'Teh Tarik',
    'Asam Laksa',
    'Penang Char Kuey Teow',
    'Sauce Satay (cacahuète)',
    'Chicken Satay',
    'Nasi Goreng USA',
    'Ramly Burger',
    'Chicken Rendang',
    'Ayam Masak Merah',
    'Ayam Masak Kicap Madu',
    'Roti Jala'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Ayam Goreng Berempah
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Ayam Goreng Berempah',
    'Poulet frit malaisien enrobé d''une pâte d''aromates et d''épices torréfiées (rempah). Croustillant à l''extérieur, parfumé à l''intérieur, avec des miettes savoureuses tombées dans l''huile.',
    $instr$["Mixer en pâte lisse les échalotes, l'ail, le gingembre, le galanga, les piments rouges secs trempés, la citronnelle et le curcuma frais.",
"Torréfier les graines de fenouil à sec à feu moyen jusqu'au parfum, les moudre, puis mélanger avec la coriandre moulue, le cumin, le curry en poudre et le sel.",
"Incorporer ce mélange d'épices à la pâte d'aromates, puis enrober les morceaux de poulet de cette marinade avec quelques feuilles de curry.",
"Laisser mariner au frais 30 minutes minimum (1 heure idéal).",
"Chauffer une bonne couche d'huile dans une cocotte en fonte à feu moyen-doux. Y déposer les morceaux de poulet avec le reste des feuilles de curry et couvrir.",
"Cuire 25-30 minutes en retournant et en vérifiant toutes les 3-4 minutes pour éviter de brûler.",
"Quand le poulet est doré, retirer les morceaux et ajouter la marinade solide tombée dans l'huile : casser les amas à la spatule et frire jusqu'à arrêt des bulles. Égoutter et parsemer le poulet de ce 'crumble' d'épices."]
$instr$,
    45, 30, 2, 3,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','poulet','frit','épicé','street food','rempah'],
    'manual',
    'https://www.nyonyacooking.com/recipes/ayam-goreng-berempah~KqxUD95ec',
    'https://ucarecdn.com/4f819a0f-a839-4712-bf76-210c28cd9531/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/ayam-goreng-berempah.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',     500, 'g',          true,  1,  'ou ailes/morceaux mixtes'),
    (v_recipe_id, 'échalotes',             2,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'ail',                   4,   'gousse',     true,  3,  NULL),
    (v_recipe_id, 'gingembre',             3,   'cm',         true,  4,  NULL),
    (v_recipe_id, 'galanga',               3,   'cm',         true,  5,  NULL),
    (v_recipe_id, 'piments rouges séchés', 10,  'unité',      true,  6,  'trempés 10 min'),
    (v_recipe_id, 'citronnelle',           2,   'unité',      true,  7,  'parties blanches'),
    (v_recipe_id, 'curcuma frais',         3,   'cm',         true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',      15,  'g',          true,  9,  NULL),
    (v_recipe_id, 'graines de fenouil',    7.5, 'g',          true,  10, 'à torréfier'),
    (v_recipe_id, 'cumin moulu',           2.5, 'g',          true,  11, NULL),
    (v_recipe_id, 'curry en poudre',       7.5, 'g',          true,  12, NULL),
    (v_recipe_id, 'sel',                   5,   'g',          true,  13, NULL),
    (v_recipe_id, 'feuilles de curry',     3,   'unité',      false, 14, 'brins'),
    (v_recipe_id, 'huile',                 500, 'ml',         true,  15, 'pour la friture');

  -- =====================================================================
  -- 2. Mee Rebus
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Mee Rebus',
    'Nouilles malaisiennes nappées d''un bouillon épais à la patate douce, équilibré entre sucré et salé. Servi avec œuf mollet, tofu frit, germes de soja et un trait de citron vert.',
    $instr$["Porter l'eau à ébullition, y plonger le bœuf et laisser mijoter à couvert à feu doux 30 minutes.",
"Cuire les patates douces en cubes à la vapeur jusqu'à tendreté, puis écraser grossièrement.",
"Mixer finement les échalotes et l'ail avec un peu d'eau.",
"Mixer séparément piments secs (trempés), citronnelle, crevettes séchées, galanga et noix de candénut en pâte.",
"Chauffer l'huile et faire revenir la pâte échalote-ail jusqu'au parfum. Ajouter la pâte de piments, la pâte de soja fermentée et le curry délayés ; cuire jusqu'à ce que l'huile remonte.",
"Retirer les os du bouillon, découper la viande en bouchées. Verser la pâte dans le bouillon à feu vif. Ajouter la purée de patate douce, laisser épaissir à feu doux, puis assaisonner avec sel et sucre.",
"Cuire les nouilles aux œufs jusqu'à tendreté. Dresser, napper de bouillon et garnir d'œuf mollet, tofu frit, germes de soja, piment vert, persil et un trait de citron vert."]
$instr$,
    20, 40, 4, 3,
    'Malaisienne', 'lunch',
    ARRAY['malaisien','nouilles','bouillon','patate douce','street food','bœuf'],
    'manual',
    'https://www.nyonyacooking.com/recipes/mee-rebus~kENqadbek',
    'https://ucarecdn.com/76a65f56-fcfa-44b9-aa1f-c63938b4b797/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/mee-rebus.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'eau',                       1000, 'ml',         true,  1,  'pour le bouillon'),
    (v_recipe_id, 'bœuf',                      500,  'g',          true,  2,  'avec os'),
    (v_recipe_id, 'patate douce',              700,  'g',          true,  3,  NULL),
    (v_recipe_id, 'échalotes',                 4,    'unité',      true,  4,  NULL),
    (v_recipe_id, 'ail',                       4,    'gousse',     true,  5,  NULL),
    (v_recipe_id, 'piments rouges séchés',     30,   'unité',      true,  6,  'trempés'),
    (v_recipe_id, 'citronnelle',               1,    'unité',      true,  7,  NULL),
    (v_recipe_id, 'galanga',                   3,    'cm',         true,  8,  NULL),
    (v_recipe_id, 'noix de candénut',          1,    'unité',      false, 9,  'kemiri / bougie nut'),
    (v_recipe_id, 'crevettes séchées',         15,   'g',          true,  10, NULL),
    (v_recipe_id, 'huile',                     3,    'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'poudre de curry',           1.5,  'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'pâte de soja fermentée',    1.5,  'c. à soupe', true,  13, 'taucu'),
    (v_recipe_id, 'sel',                       1,    'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'sucre',                     0.5,  'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'nouilles aux œufs jaunes',  400,  'g',          true,  16, 'pour servir'),
    (v_recipe_id, 'œuf',                       4,    'unité',      false, 17, 'mollet'),
    (v_recipe_id, 'tofu frit',                 4,    'unité',      false, 18, 'tau pok'),
    (v_recipe_id, 'germes de soja',            100,  'g',          false, 19, 'blanchis'),
    (v_recipe_id, 'persil',                    1,    'unité',      false, 20, 'haché'),
    (v_recipe_id, 'piment vert',               2,    'unité',      false, 21, 'tranches'),
    (v_recipe_id, 'citron vert',               1,    'unité',      false, 22, 'en quartiers');

  -- =====================================================================
  -- 3. Mee Goreng Mamak
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Mee Goreng Mamak',
    'Nouilles jaunes sautées au wok dans une sauce sucrée-épicée à base de cacahuètes, crevettes séchées et tamarin. Plat phare des stalls mamak de Malaisie.',
    $instr$["Chauffer l'huile à feu moyen, faire revenir les arachides, piments secs, crevettes séchées et chana dhal jusqu'au parfum, puis retirer.",
"Mixer ces éléments frits avec la pâte de tamarin et 200 ml d'eau jusqu'à pâte fine. Faire revenir dans l'huile à feu doux jusqu'à séparation de l'huile.",
"Éplucher et couper les pommes de terre en morceaux, bouillir jusqu'à tendreté, égoutter et réserver.",
"Émincer oignons et tofu frit, hacher l'ail, couper le chou et le chou-fleur chinois. Cuire les nouilles si sèches. Diluer la sauce soja foncée dans 150 ml d'eau.",
"Par portion : chauffer l'huile, ajouter un quart de l'ail, des oignons et de la pâte. Sauter jusqu'au parfum.",
"Ajouter un quart du tofu, des pommes de terre, du chou et des fritters aux crevettes (cucur udang). Sauter 30 secondes.",
"Ajouter les nouilles et la sauce soja diluée. Mélanger 1 minute, écarter au centre et casser un œuf, mélanger. Garnir de citron vert et piments."]
$instr$,
    20, 8, 4, 3,
    'Malaisienne', 'lunch',
    ARRAY['malaisien','nouilles','sauté','wok','mamak','street food'],
    'manual',
    'https://www.nyonyacooking.com/recipes/mee-goreng-mamak~BkTLRjTuX',
    'https://ucarecdn.com/e2fd02f3-bfeb-43a5-a564-72bab62a13f5/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/mee-goreng-mamak.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'arachides',           50,   'g',          true,  1,  'non salées'),
    (v_recipe_id, 'piments rouges secs', 15,   'g',          true,  2,  NULL),
    (v_recipe_id, 'crevettes séchées',   10,   'g',          true,  3,  NULL),
    (v_recipe_id, 'huile',               165,  'ml',         true,  4,  'au total'),
    (v_recipe_id, 'chana dhal',          10,   'g',          false, 5,  'pois cassés'),
    (v_recipe_id, 'pâte de tamarin',     7.5,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'eau',                 200,  'ml',         true,  7,  'pour la pâte'),
    (v_recipe_id, 'pommes de terre',     250,  'g',          true,  8,  NULL),
    (v_recipe_id, 'oignons rouges',      2,    'unité',      true,  9,  NULL),
    (v_recipe_id, 'ail',                 4,    'gousse',     true,  10, NULL),
    (v_recipe_id, 'chou blanc',          30,   'g',          true,  11, 'émincé'),
    (v_recipe_id, 'chou-fleur chinois',  30,   'g',          false, 12, 'choy sum / kai-lan'),
    (v_recipe_id, 'tofu frit',           1,    'unité',      true,  13, 'tau pok'),
    (v_recipe_id, 'sauce soja foncée',   15,   'ml',         true,  14, NULL),
    (v_recipe_id, 'eau',                 150,  'ml',         true,  15, 'pour la sauce soja'),
    (v_recipe_id, 'nouilles jaunes',     400,  'g',          true,  16, 'mee'),
    (v_recipe_id, 'œuf',                 1,    'unité',      true,  17, NULL),
    (v_recipe_id, 'beignets de crevettes', 2,  'unité',      false, 18, 'cucur udang'),
    (v_recipe_id, 'citron vert',         1,    'unité',      false, 19, NULL);

  -- =====================================================================
  -- 4. Teh Tarik
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Teh Tarik',
    'Thé au lait condensé malaisien, tiré entre deux récipients en hauteur pour créer la mousse signature. Une touche de sel relève la rondeur du lait.',
    $instr$["Faire infuser le thé Ceylan dans l'eau chaude pendant 3 minutes.",
"Verser le thé dans une grande tasse à anse.",
"Ajouter le lait condensé sucré avec une cuillère préalablement trempée dans de l'eau salée — la touche de sel arrondit le sucré.",
"Transférer le thé d'une tasse à l'autre 5 fois en levant la verseuse aussi haut que possible : c'est ce geste qui crée la mousse caractéristique (le 'tarik').",
"Servir immédiatement, avant que la mousse retombe et que la boisson refroidisse."]
$instr$,
    5, 5, 1, 2,
    'Malaisienne', 'drink',
    ARRAY['malaisien','boisson','thé','lait condensé','mousse','mamak'],
    'manual',
    'https://www.nyonyacooking.com/recipes/teh-tarik-recipe-frothy~BJSmOwiDMqZ7',
    'https://ucarecdn.com/1ff78beb-03ba-446c-9149-08677d7475bf/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/teh-tarik-recipe-frothy.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'thé Ceylan',        3,   'c. à café',  true,  1, 'feuilles ou poussière'),
    (v_recipe_id, 'eau',               250, 'ml',         true,  2, 'chaude'),
    (v_recipe_id, 'lait condensé sucré', 2, 'c. à café',  true,  3, NULL),
    (v_recipe_id, 'sel',               1,   'pincée',     false, 4, 'sur la cuillère');

  -- =====================================================================
  -- 5. Asam Laksa (Penang)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Asam Laksa',
    'Soupe de nouilles épicée et aigre de Penang, à base de maquereau et de tamarin, garnie d''ananas, concombre, laitue et menthe vietnamienne. Profondeur umami + acidité claquante.',
    $instr$["Cuire le maquereau dans 1 L d'eau à feu doux 10 minutes. Retirer le poisson, tamiser le bouillon.",
"Mixer en pâte les piments secs (trempés), la pâte de crevettes, le curcuma frais, le galanga, les échalotes et la citronnelle avec un peu d'eau.",
"Verser dans le bouillon, ajouter la coriandre vietnamienne (laksa leaf), réduire le feu.",
"Séparer la chair du maquereau, retirer peau et arêtes. Émietter la moitié à la fourchette.",
"Remonter en feu vif, ajouter la pâte de tamarin et la chair émiettée. Porter à ébullition.",
"Mijoter 15 minutes à feu doux. Assaisonner avec sel et sucre. Retirer la coriandre vietnamienne avant de servir.",
"Blanchir les nouilles de riz. Dans un bol, déposer les nouilles, napper de bouillon, garnir de pâte de crevettes (petis udang), morceaux de poisson, laitue, concombre, dés d'ananas, échalotes, piment frais et calamansi."]
$instr$,
    30, 90, 4, 3,
    'Malaisienne', 'lunch',
    ARRAY['malaisien','penang','nouilles','poisson','aigre','épicé'],
    'manual',
    'https://www.nyonyacooking.com/recipes/asam-laksa~SJZmuvivzcZQ',
    'https://ucarecdn.com/16cf1ec4-493f-4f52-babe-db90521caa8e/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/asam-laksa.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'maquereau',                 250,  'g',     true,  1,  'frais, entier'),
    (v_recipe_id, 'eau',                       2000, 'ml',    true,  2,  NULL),
    (v_recipe_id, 'piments rouges secs',       7,    'unité', true,  3,  'trempés'),
    (v_recipe_id, 'pâte de crevettes séchées', 5,    'g',     true,  4,  'belacan'),
    (v_recipe_id, 'curcuma frais',             5,    'g',     true,  5,  NULL),
    (v_recipe_id, 'galanga',                   10,   'g',     true,  6,  NULL),
    (v_recipe_id, 'échalotes',                 4,    'unité', true,  7,  NULL),
    (v_recipe_id, 'citronnelle',               1,    'unité', true,  8,  'écrasée'),
    (v_recipe_id, 'coriandre vietnamienne',    5,    'unité', true,  9,  'laksa leaf / daun kesum'),
    (v_recipe_id, 'pâte de tamarin',           80,   'g',     true,  10, NULL),
    (v_recipe_id, 'sel',                       1,    'c. à café', true, 11, 'au goût'),
    (v_recipe_id, 'sucre',                     1,    'c. à soupe', true, 12, 'au goût'),
    (v_recipe_id, 'pâte de crevettes noire',   1,    'c. à soupe', false, 13, 'petis udang, pour servir'),
    (v_recipe_id, 'nouilles de riz épaisses',  400,  'g',     true,  14, 'laksa noodles'),
    (v_recipe_id, 'calamansi',                 2,    'unité', false, 15, NULL),
    (v_recipe_id, 'laitue',                    50,   'g',     false, 16, 'émincée'),
    (v_recipe_id, 'piment rouge frais',        1,    'unité', false, 17, 'en tranches'),
    (v_recipe_id, 'concombre',                 0.5,  'unité', false, 18, 'en julienne'),
    (v_recipe_id, 'ananas',                    100,  'g',     false, 19, 'en dés');

  -- =====================================================================
  -- 6. Penang Char Kuey Teow
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Penang Char Kuey Teow',
    'Nouilles de riz plates sautées au wok hei, façon hawker de Penang. Crevettes, saucisse chinoise, œuf et ciboulette chinoise, sauce sombre umami.',
    $instr$["Préparer la sauce : mélanger sauce soja claire, soja foncée, sauce huître, sauce de poisson, sucre et poivre.",
"Chauffer le wok à feu très vif. Ajouter l'huile, puis la saucisse chinoise en tranches, l'ail haché et la pâte de piment (cili boh). Sauter jusqu'au parfum.",
"Ajouter crevettes et gâteau de poisson, sauter 30 secondes.",
"Ajouter les nouilles de riz, mélanger rapidement en versant la sauce. Casser l'œuf directement sur les nouilles, laisser prendre puis mélanger.",
"Incorporer ciboulette chinoise hachée et germes de soja. Sauter encore quelques secondes jusqu'à ce que les germes soient juste cuits.",
"Servir immédiatement avec un sambal belacan cru et un trait de citron vert."]
$instr$,
    20, 20, 2, 3,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','penang','nouilles de riz','wok','crevettes','street food'],
    'manual',
    'https://www.nyonyacooking.com/recipes/penang-char-kuey-teow~r1DzuvivfqbX',
    'https://ucarecdn.com/0e9970a1-23c9-40f0-99ac-a10f270e686c/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/penang-char-kuey-teow.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'sauce soja claire',     30,  'ml',          true,  1,  NULL),
    (v_recipe_id, 'sauce soja foncée',     15,  'ml',          true,  2,  NULL),
    (v_recipe_id, 'sauce huître',          7.5, 'ml',          true,  3,  NULL),
    (v_recipe_id, 'sauce de poisson',      7.5, 'ml',          true,  4,  NULL),
    (v_recipe_id, 'sucre',                 5,   'g',           true,  5,  NULL),
    (v_recipe_id, 'poivre blanc',          2.5, 'g',           true,  6,  NULL),
    (v_recipe_id, 'huile',                 30,  'ml',          true,  7,  NULL),
    (v_recipe_id, 'saucisse chinoise',     0.5, 'unité',       false, 8,  'lap cheong, en tranches'),
    (v_recipe_id, 'pâte de piment',        15,  'ml',          true,  9,  'cili boh'),
    (v_recipe_id, 'ail',                   1,   'gousse',      true,  10, 'haché'),
    (v_recipe_id, 'gâteau de poisson',     0.5, 'unité',       false, 11, 'fish cake, en tranches'),
    (v_recipe_id, 'crevettes',             6,   'unité',       true,  12, 'décortiquées'),
    (v_recipe_id, 'nouilles de riz plates', 180, 'g',          true,  13, 'kuey teow / sen yai'),
    (v_recipe_id, 'œuf',                   1,   'unité',       true,  14, NULL),
    (v_recipe_id, 'germes de soja',        80,  'g',           true,  15, NULL),
    (v_recipe_id, 'ciboulette chinoise',   20,  'g',           false, 16, 'kuchai, en tronçons');

  -- =====================================================================
  -- 7. Sauce Satay (cacahuète)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Sauce Satay (cacahuète)',
    'Sauce cacahuète authentique pour accompagner les satays. Aromates frais (citronnelle, galanga, ail), piments secs, sucre de palme et tamarin pour l''aigre-doux.',
    $instr$["Griller les cacahuètes à sec jusqu'à fragrance. Tremper brièvement dans l'eau pour retirer les peaux, puis moudre grossièrement.",
"Mixer en pâte citronnelle, galanga, ail et piments secs (trempés).",
"Faire revenir les échalotes émincées dans l'huile chaude, ajouter la pâte d'aromates et cuire jusqu'au parfum (l'huile remonte en surface).",
"Incorporer les cacahuètes moulues, l'eau et le sel. Porter à ébullition.",
"Ajouter le sucre de palme et laisser mijoter à feu doux-moyen 20 minutes en remuant régulièrement pour éviter que le fond accroche.",
"Hors du feu, incorporer la pâte de tamarin. Goûter et ajuster sel/sucre/tamarin selon préférence."]
$instr$,
    20, 50, 6, 2,
    'Malaisienne', 'appetizer',
    ARRAY['malaisien','sauce','cacahuète','condiment','satay','asiatique'],
    'manual',
    'https://www.nyonyacooking.com/recipes/satay-sauce~BJoedDovz5bQ',
    'https://ucarecdn.com/044e81c1-e779-4a1f-a4f9-d4a1428dfd67/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/satay-sauce.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cacahuètes',         300, 'g',     true,  1,  'crues, non salées'),
    (v_recipe_id, 'citronnelle',        4,   'unité', true,  2,  'parties blanches'),
    (v_recipe_id, 'galanga',            3,   'cm',    true,  3,  NULL),
    (v_recipe_id, 'ail',                3,   'gousse', true, 4,  NULL),
    (v_recipe_id, 'piments rouges secs', 8,  'unité', true,  5,  'trempés'),
    (v_recipe_id, 'échalotes',          2,   'unité', true,  6,  'émincées'),
    (v_recipe_id, 'huile',              45,  'ml',    true,  7,  NULL),
    (v_recipe_id, 'eau',                400, 'ml',    true,  8,  NULL),
    (v_recipe_id, 'sel',                0.5, 'g',     true,  9,  NULL),
    (v_recipe_id, 'sucre de palme',     60,  'g',     true,  10, 'gula melaka'),
    (v_recipe_id, 'pâte de tamarin',    5,   'ml',    true,  11, NULL);

  -- =====================================================================
  -- 8. Chicken Satay
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Satay',
    'Brochettes de poulet marinées dans une pâte d''aromates et d''épices (citronnelle, galanga, curcuma, cumin, fenouil), grillées au charbon idéalement. Se sert avec la sauce satay (cacahuète).',
    $instr$["Couper le poulet (poitrine ou cuisse) en lanières de ~2 cm.",
"Mixer en pâte galanga, citronnelle, curcuma et échalotes.",
"Ajouter à la pâte les graines de fenouil, le cumin moulu, le sel et le sucre.",
"Mariner les lanières de poulet 30 minutes à 2 heures (idéalement 2 h au frais).",
"Enfiler les morceaux sur des brochettes en bambou préalablement trempées dans l'eau.",
"Griller au charbon ou à la plancha à feu vif, en badigeonnant régulièrement d'huile à l'aide d'une tige de citronnelle écrasée. Cuire jusqu'à laque dorée et cœur cuit.",
"Servir avec sauce satay, gâteau de riz (ketupat), concombre et oignon."]
$instr$,
    20, 60, 4, 2,
    'Malaisienne', 'appetizer',
    ARRAY['malaisien','poulet','grillé','brochette','satay','street food'],
    'manual',
    'https://www.nyonyacooking.com/recipes/chicken-satay~rJRl_PjvMcbX',
    'https://ucarecdn.com/33f9bfbb-19e5-4e13-b25d-caee5cb16948/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/chicken-satay.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet',                500, 'g',     true,  1, 'poitrine ou cuisse'),
    (v_recipe_id, 'galanga',                3,  'cm',    true,  2, NULL),
    (v_recipe_id, 'citronnelle',            4,  'unité', true,  3, 'parties blanches'),
    (v_recipe_id, 'curcuma frais',          3,  'cm',    true,  4, 'ou 1 c. à café de poudre'),
    (v_recipe_id, 'échalotes',              3,  'unité', true,  5, NULL),
    (v_recipe_id, 'graines de fenouil',     5,  'g',     true,  6, NULL),
    (v_recipe_id, 'cumin moulu',            5,  'g',     true,  7, NULL),
    (v_recipe_id, 'sel',                    2.5,'g',     true,  8, NULL),
    (v_recipe_id, 'sucre',                  15, 'g',     true,  9, NULL),
    (v_recipe_id, 'huile',                  30, 'ml',    false, 10, 'pour badigeonner'),
    (v_recipe_id, 'brochettes en bambou',   12, 'unité', true,  11, 'trempées 30 min');

  -- =====================================================================
  -- 9. Nasi Goreng USA
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Nasi Goreng USA',
    'Riz frit malaisien à la sauce tomate et ketchup, accompagné d''un poulet sauté en sauce. Version "USA" colorée et un poil sucrée, popularisée dans les mamak.',
    $instr$["Sauce/garniture poulet : dans une poêle chaude, faire revenir l'ail et le gingembre. Ajouter la pâte de piment (cili boh) et sauter jusqu'au parfum. Ajouter le poulet et cuire presque à cœur. Incorporer oignons et poivrons, sauter.",
"Ajouter sauce tomate et sauce huître. Verser l'eau et laisser mijoter à feu moyen. Ajouter la tomate en dés. Cuire jusqu'à ce que la sauce épaississe, puis réserver.",
"Riz : dans un wok propre, chauffer l'huile et faire revenir ail et oignons jusqu'au parfum. Ajouter la pâte de piment et la carotte en dés. Sauter à feu vif 2 minutes.",
"Ajouter le riz cuit froid et un peu de sauce tomate. Mélanger rapidement pour bien enrober. Verser la sauce soja et le poivre blanc. Sauter encore quelques fois.",
"Dresser le riz, déposer le poulet à côté. Garnir de tranches de concombre et tomate."]
$instr$,
    20, 35, 2, 2,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','riz frit','sauce tomate','poulet','mamak','street food'],
    'manual',
    'https://www.nyonyacooking.com/recipes/nasi-goreng-usa~BJ9g_DsDzqWQ',
    'https://ucarecdn.com/15aad833-8738-4e04-8d52-9bae2ebbc0b4/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/nasi-goreng-usa.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile',           30,  'ml',     true,  1,  'divisée'),
    (v_recipe_id, 'ail',             2,   'gousse', true,  2,  'hachées'),
    (v_recipe_id, 'gingembre',       1,   'cm',     true,  3,  'tranches'),
    (v_recipe_id, 'pâte de piment',  30,  'ml',     true,  4,  'cili boh'),
    (v_recipe_id, 'poulet',          100, 'g',      true,  5,  'cuisse en lanières'),
    (v_recipe_id, 'poivron',         0.5, 'unité',  true,  6,  'en dés'),
    (v_recipe_id, 'oignon jaune',    1,   'unité',  true,  7,  NULL),
    (v_recipe_id, 'tomate',          1,   'unité',  true,  8,  'en dés (totale, divisée)'),
    (v_recipe_id, 'sauce tomate',    30,  'ml',     true,  9,  NULL),
    (v_recipe_id, 'eau',             120, 'ml',     true,  10, NULL),
    (v_recipe_id, 'sauce huître',    15,  'ml',     true,  11, NULL),
    (v_recipe_id, 'carotte',         1,   'unité',  true,  12, 'en dés'),
    (v_recipe_id, 'riz cuit',        240, 'g',      true,  13, 'froid, idéalement de la veille'),
    (v_recipe_id, 'sauce soja',      15,  'ml',     true,  14, NULL),
    (v_recipe_id, 'poivre blanc',    1,   'pincée', true,  15, NULL),
    (v_recipe_id, 'concombre',       0.5, 'unité',  false, 16, 'garniture'),
    (v_recipe_id, 'ketchup',         15,  'ml',     false, 17, 'au goût');

  -- =====================================================================
  -- 10. Ramly Burger
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Ramly Burger',
    'Burger street food malaisien : galette de viande assaisonnée et enrobée d''un œuf entier cuit en omelette fine, sauce chili sucrée, mayo, sauce poivre noir, sur pain beurré-poêlé.',
    $instr$["Mélanger sauce soja, paprika, poivre blanc, oignon haché et ail à la viande hachée. Former une galette plate.",
"Chauffer une poêle avec du beurre et cuire la galette des deux côtés à feu moyen jusqu'à coloration et cuisson à cœur.",
"Beurrer généreusement les faces internes du pain et le faire dorer à la poêle.",
"Battre l'œuf, l'huiler légèrement dans la poêle. Verser et déposer la galette au centre de l'omelette pour qu'elle l'enveloppe pendant que l'œuf prend.",
"Plier les bords de l'œuf sur la galette comme une enveloppe (signature Ramly).",
"Garnir le pain : sauce chili sucrée + mayo + sauce au poivre noir, tranches de concombre, galette enrobée d'œuf, oignon émincé, tomate, laitue. Refermer et servir tout de suite."]
$instr$,
    20, 25, 1, 2,
    'Malaisienne', 'snack',
    ARRAY['malaisien','burger','street food','galette','œuf frit','sauce épicée'],
    'manual',
    'https://www.nyonyacooking.com/recipes/ramly-burger~HJ7x_PiPG9Wm',
    'https://ucarecdn.com/86e52113-9c7b-4625-985d-f066e474878d/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/ramly-burger.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'viande hachée',         300, 'g',          true,  1,  'bœuf ou poulet'),
    (v_recipe_id, 'sauce soja',            15,  'ml',         true,  2,  NULL),
    (v_recipe_id, 'paprika en poudre',     7.5, 'ml',         true,  3,  NULL),
    (v_recipe_id, 'poivre blanc',          5,   'ml',         true,  4,  NULL),
    (v_recipe_id, 'oignon jaune',          0.5, 'unité',      true,  5,  'haché'),
    (v_recipe_id, 'ail',                   1,   'gousse',     true,  6,  'haché'),
    (v_recipe_id, 'beurre',                11,  'g',          true,  7,  'doux'),
    (v_recipe_id, 'œuf',                   2,   'unité',      true,  8,  '1 dans la galette, 1 pour l''omelette'),
    (v_recipe_id, 'huile',                 10,  'ml',         true,  9,  NULL),
    (v_recipe_id, 'mayonnaise',            7.5, 'ml',         true,  10, NULL),
    (v_recipe_id, 'sauce au poivre noir',  7.5, 'ml',         true,  11, NULL),
    (v_recipe_id, 'sauce chili sucrée',    7.5, 'ml',         true,  12, NULL),
    (v_recipe_id, 'tomate',                0.5, 'unité',      false, 13, 'en tranches'),
    (v_recipe_id, 'laitue',                2,   'unité',      false, 14, 'feuilles'),
    (v_recipe_id, 'concombre',             16,  'unité',      false, 15, 'tranches fines'),
    (v_recipe_id, 'pain à burger',         1,   'unité',      true,  16, NULL);

  -- =====================================================================
  -- 11. Chicken Rendang
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Rendang',
    'Plat minangkabau (Sumatra/Malaisie) de poulet mijoté lentement dans une pâte d''épices et lait de coco jusqu''à ce que la sauce caramélise. La noix de coco torréfiée (kerisik) apporte la signature gourmande.',
    $instr$["Torréfier la noix de coco râpée à sec à feu moyen dans une poêle jusqu'à brun profond, puis piler au mortier (kerisik) jusqu'à libération de l'huile.",
"Mixer en pâte fine piments rouges, galanga, ail, échalotes, citronnelle et gingembre.",
"Chauffer l'huile et faire revenir la pâte d'épices à feu moyen jusqu'à ce qu'elle parfume et que l'huile remonte.",
"Ajouter le kerisik et bien mélanger. Incorporer le poulet en morceaux et faire revenir 3-5 minutes.",
"Verser le lait de coco et l'eau, saler. Cuire à feu doux à découvert en remuant régulièrement jusqu'à ce que la sauce réduise et nappe le poulet (~45 min).",
"Quelques minutes avant la fin, ajouter les feuilles de citron kaffir froissées. Servir avec du riz blanc."]
$instr$,
    25, 60, 4, 3,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','indonésien','poulet','rendang','lait de coco','épices','minangkabau'],
    'manual',
    'https://www.nyonyacooking.com/recipes/chicken-rendang~rkU1dPiPG5b7',
    'https://ucarecdn.com/7dd614f9-ce92-49e6-ac62-535dbd0a530c/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/chicken-rendang.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet',                  450, 'g',     true,  1,  'en morceaux avec os'),
    (v_recipe_id, 'noix de coco râpée',      50,  'g',     true,  2,  'pour le kerisik'),
    (v_recipe_id, 'piments rouges frais',    10,  'unité', true,  3,  NULL),
    (v_recipe_id, 'citronnelle',             3,   'unité', true,  4,  'parties blanches'),
    (v_recipe_id, 'galanga',                 4,   'cm',    true,  5,  NULL),
    (v_recipe_id, 'échalotes',               2,   'unité', true,  6,  NULL),
    (v_recipe_id, 'ail',                     4,   'gousse', true, 7,  NULL),
    (v_recipe_id, 'gingembre',               3,   'cm',    true,  8,  NULL),
    (v_recipe_id, 'huile',                   45,  'ml',    true,  9,  NULL),
    (v_recipe_id, 'lait de coco',            150, 'ml',    true,  10, NULL),
    (v_recipe_id, 'eau',                     200, 'ml',    true,  11, NULL),
    (v_recipe_id, 'sel',                     1,   'c. à café', true, 12, 'au goût'),
    (v_recipe_id, 'feuilles de citron kaffir', 3, 'unité', true,  13, 'froissées');

  -- =====================================================================
  -- 12. Ayam Masak Merah
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Ayam Masak Merah',
    'Classique malais — poulet doré dans une marinade au curcuma puis braisé dans une sauce tomate-ketchup légèrement piquante jusqu''à laque épaisse. Rouge profond, sucré-salé, parfait avec un nasi minyak.',
    $instr$["Mariner les morceaux de poulet au curcuma en poudre et au sel 15 minutes.",
"Frire le poulet dans l'huile chaude jusqu'à dorage uniforme, réserver sur papier absorbant.",
"Mixer oignon, gingembre, ail et piments rouges secs (trempés). Faire revenir cette pâte dans l'huile à feu moyen jusqu'à ce qu'elle parfume.",
"Ajouter la tomate en dés et le ketchup. Mélanger.",
"Verser l'eau et porter à ébullition. Baisser à feu doux et laisser mijoter jusqu'à épaississement.",
"Ajouter le poulet frit, nappant chaque morceau de sauce. Sucrer légèrement. Mijoter 5 min de plus puis servir."]
$instr$,
    30, 30, 4, 2,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','poulet','sauce tomate','curcuma','sucré-salé','plat principal'],
    'manual',
    'https://www.nyonyacooking.com/recipes/ayam-masak-merah~ByApwDivGqZX',
    'https://ucarecdn.com/5c7f67d3-a449-4f02-ae0d-9adb5051d556/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/ayam-masak-merah.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet',                 550, 'g',     true,  1,  'en morceaux'),
    (v_recipe_id, 'curcuma en poudre',      1,   'c. à soupe', true, 2, NULL),
    (v_recipe_id, 'sel',                    5,   'g',     true,  3,  NULL),
    (v_recipe_id, 'huile',                  250, 'ml',    true,  4,  'pour la friture'),
    (v_recipe_id, 'oignon jaune',           1,   'unité', true,  5,  NULL),
    (v_recipe_id, 'gingembre',              30,  'g',     true,  6,  NULL),
    (v_recipe_id, 'ail',                    2,   'gousse', true, 7,  NULL),
    (v_recipe_id, 'piments rouges séchés',  6,   'unité', true,  8,  'trempés'),
    (v_recipe_id, 'huile',                  30,  'ml',    true,  9,  'pour la sauce'),
    (v_recipe_id, 'tomate',                 1,   'unité', true,  10, 'en dés'),
    (v_recipe_id, 'ketchup',                45,  'ml',    true,  11, NULL),
    (v_recipe_id, 'eau',                    250, 'ml',    true,  12, NULL),
    (v_recipe_id, 'sucre',                  1.25, 'g',    true,  13, NULL);

  -- =====================================================================
  -- 13. Ayam Masak Kicap Madu
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Ayam Masak Kicap Madu',
    'Poulet malaisien laqué à la sauce soja foncée et miel, parfumé à l''anis étoilé et à la cannelle. Plat sucré-salé glaçant, parfait avec du riz blanc.',
    $instr$["Mixer en pâte fine oignon, gingembre, ail et piment rouge avec un peu d'eau.",
"Enrober les morceaux de poulet d'une fine couche de farine de maïs. Frire dans l'huile chaude jusqu'à dorage, égoutter.",
"Dans une poêle, chauffer 30 ml d'huile et faire revenir la pâte d'épices jusqu'au parfum.",
"Ajouter l'anis étoilé et le bâton de cannelle. Verser la sauce soja foncée et l'eau.",
"Laisser mijoter quelques minutes, saler au goût. Incorporer le miel (et un peu de sucre si désiré).",
"Ajouter le poulet frit, retourner les morceaux dans la sauce. Cuire 15 minutes en remuant régulièrement pour bien laquer."]
$instr$,
    20, 50, 4, 2,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','poulet','sauce soja','miel','sucré-salé','laqué'],
    'manual',
    'https://www.nyonyacooking.com/recipes/ayam-masak-kicap-madu-chicken-in-honey-soy-sauce~SJsaPwjPzqZ7',
    'https://ucarecdn.com/9571ee4f-26cc-492e-ab32-665ce57c815a/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/ayam-masak-kicap-madu-chicken-in-honey-soy-sauce.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet',              600, 'g',     true,  1,  'en morceaux'),
    (v_recipe_id, 'farine de maïs',      30,  'g',     true,  2,  'pour enrober'),
    (v_recipe_id, 'huile',               250, 'ml',    true,  3,  'pour la friture'),
    (v_recipe_id, 'oignon jaune',        1,   'unité', true,  4,  NULL),
    (v_recipe_id, 'gingembre',           30,  'g',     true,  5,  NULL),
    (v_recipe_id, 'ail',                 4,   'gousse', true, 6,  NULL),
    (v_recipe_id, 'piment rouge frais',  1,   'unité', true,  7,  NULL),
    (v_recipe_id, 'huile',               30,  'ml',    true,  8,  'pour la sauce'),
    (v_recipe_id, 'anis étoilé',         1,   'unité', true,  9,  NULL),
    (v_recipe_id, 'bâton de cannelle',   1,   'unité', true,  10, NULL),
    (v_recipe_id, 'sauce soja foncée',   30,  'ml',    true,  11, 'kicap manis ou kecap manis'),
    (v_recipe_id, 'miel',                5,   'ml',    true,  12, NULL),
    (v_recipe_id, 'eau',                 100, 'ml',    true,  13, NULL),
    (v_recipe_id, 'sel',                 1,   'pincée', true, 14, 'au goût'),
    (v_recipe_id, 'sucre',               1,   'c. à café', false, 15, 'optionnel');

  -- =====================================================================
  -- 14. Roti Jala
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Roti Jala',
    'Crêpes dentelle au curcuma, signature malaise. Coulées en motif filet avec un moule spécialisé, elles servent à éponger les currys (poulet, agneau) ou à accompagner un kuah dalca.',
    $instr$["Dans un bol, mélanger sel, curcuma en poudre et farine de blé.",
"Ajouter œufs, huile et eau. Bien fouetter (au mixeur 3 min ou au fouet 6 min).",
"Tamiser la pâte pour éliminer les grumeaux, puis la transférer dans une bouteille à bec (ou un moule roti jala).",
"Chauffer une poêle antiadhésive à feu doux. Tracer un motif en dentelle en faisant aller-retour la bouteille au-dessus de la poêle.",
"Cuire ~2 minutes sans couvercle : la couleur s'éclaircit et la crêpe se détache facilement. Ne pas retourner.",
"Plier la crêpe en triangle (ou la rouler) directement sur la poêle ou sur une assiette. Recommencer jusqu'à épuisement de la pâte. Servir tiède avec un curry."]
$instr$,
    20, 30, 6, 3,
    'Malaisienne', 'breakfast',
    ARRAY['malaisien','crêpe','curcuma','curry','ramadan','accompagnement'],
    'manual',
    'https://www.nyonyacooking.com/recipes/roti-jala~0m4-EzLwI',
    'https://ucarecdn.com/4d1d6cdd-72ec-450f-9159-9e9b1002dd94/-/scale_crop/1600x900/center/-/quality/normal/-/format/jpeg/roti-jala.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'farine de blé',      375, 'g',          true,  1, NULL),
    (v_recipe_id, 'curcuma en poudre',  1,   'c. à soupe', true,  2, NULL),
    (v_recipe_id, 'sel',                1.5, 'c. à café',  true,  3, NULL),
    (v_recipe_id, 'œufs',               2,   'unité',      true,  4, NULL),
    (v_recipe_id, 'huile',              120, 'ml',         true,  5, NULL),
    (v_recipe_id, 'eau',                840, 'ml',         true,  6, NULL);

  RAISE NOTICE 'Seed: 14 Malaysian recipes inserted for user %', v_user_id;
END $$;
