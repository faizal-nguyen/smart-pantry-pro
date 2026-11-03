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
"Torréfier les graines de fenouil à sec à feu moyen jusqu'à ce qu'elles embaument, les moudre, puis les mélanger avec la coriandre moulue, le cumin, le curry en poudre et le sel.",
"Incorporer ce mélange d'épices à la pâte d'aromates, puis enrober les morceaux de poulet de cette marinade avec quelques feuilles de curry.",
"Laisser mariner au frais 30 minutes minimum (idéalement 1 heure).",
"Chauffer une bonne couche d'huile dans une cocotte en fonte à feu moyen-doux. Y déposer les morceaux de poulet avec le reste des feuilles de curry et couvrir.",
"Cuire 25-30 minutes en retournant les morceaux et en vérifiant toutes les 3-4 minutes pour qu'ils ne brûlent pas.",
"Quand le poulet est doré, retirer les morceaux et faire frire la marinade tombée dans l'huile : casser les amas à la spatule et frire jusqu'à ce qu'il n'y ait plus de bulles. Égoutter et parsemer le poulet de ces miettes d'épices croustillantes."]
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
    (v_recipe_id, 'cuisses de poulet',     500, 'g',          true,  1,  'ou ailes, ou morceaux variés'),
    (v_recipe_id, 'échalotes',             2,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'ail',                   4,   'gousse',     true,  3,  NULL),
    (v_recipe_id, 'gingembre',             3,   'cm',         true,  4,  NULL),
    (v_recipe_id, 'galanga',               3,   'cm',         true,  5,  NULL),
    (v_recipe_id, 'piments rouges séchés', 10,  'unité',      true,  6,  'trempés 10 min'),
    (v_recipe_id, 'citronnelle',           2,   'tige',       true,  7,  'parties blanches'),
    (v_recipe_id, 'curcuma frais',         3,   'cm',         true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',      1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'graines de fenouil',    0.5, 'c. à soupe', true,  10, 'à torréfier'),
    (v_recipe_id, 'cumin moulu',           0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'curry en poudre',       0.5, 'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'sel',                   1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'feuilles de curry',     3,   'brin',       true,  14, NULL),
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
    'Nouilles malaisiennes nappées d''un bouillon épais à la patate douce, équilibré entre sucré et salé. Servies avec un œuf mollet, du tofu frit, des germes de soja et un trait de citron vert.',
    $instr$["Porter l'eau à ébullition, y plonger le bœuf et laisser mijoter 30 minutes à couvert, à feu doux.",
"Cuire les patates douces en cubes à la vapeur jusqu'à ce qu'elles soient tendres, puis les écraser grossièrement.",
"Mixer finement les échalotes et l'ail avec un peu d'eau.",
"Mixer séparément en pâte les piments secs (trempés), la citronnelle, les crevettes séchées, le galanga et la noix de bancoul.",
"Chauffer l'huile et faire revenir la pâte échalote-ail jusqu'à ce qu'elle embaume. Ajouter la pâte de piments, puis la pâte de soja fermentée et le curry délayés dans un peu d'eau ; cuire jusqu'à ce que l'huile remonte.",
"Retirer les os du bouillon et découper la viande en bouchées. Verser la pâte dans le bouillon à feu vif. Ajouter la purée de patate douce, laisser épaissir à feu doux, puis assaisonner de sel et de sucre.",
"Cuire les nouilles aux œufs jusqu'à ce qu'elles soient tendres. Dresser, napper de bouillon et garnir d'un œuf mollet, de tofu frit, de germes de soja, de piment vert, de persil et d'un trait de citron vert."]
$instr$,
    20, 50, 4, 3,
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
    (v_recipe_id, 'citronnelle',               1,    'tige',       true,  7,  NULL),
    (v_recipe_id, 'galanga',                   3,    'cm',         true,  8,  NULL),
    (v_recipe_id, 'noix de bancoul',           1,    'unité',      false, 9,  'kemiri, optionnel'),
    (v_recipe_id, 'crevettes séchées',         60,   'g',          true,  10, NULL),
    (v_recipe_id, 'huile',                     3,    'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'poudre de curry',           1.5,  'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'pâte de soja fermentée',    1.5,  'c. à soupe', true,  13, 'taucu'),
    (v_recipe_id, 'sel',                       1,    'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'sucre',                     0.5,  'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'nouilles aux œufs',         400,  'g',          true,  16, 'jaunes (mee kuning)'),
    (v_recipe_id, 'œufs',                      4,    'unité',      false, 17, 'mollets'),
    (v_recipe_id, 'tofu frit',                 4,    'unité',      false, 18, 'tau pok'),
    (v_recipe_id, 'germes de soja',            100,  'g',          false, 19, 'blanchis'),
    (v_recipe_id, 'persil',                    5,    'g',          false, 20, 'haché'),
    (v_recipe_id, 'piment vert',               2,    'unité',      false, 21, 'en tranches'),
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
    'Nouilles jaunes sautées au wok dans une sauce sucrée-épicée à base de cacahuètes, de crevettes séchées et de tamarin. Le plat phare des échoppes mamak de Malaisie.',
    $instr$["Chauffer un peu d'huile à feu moyen et faire revenir les arachides, les piments secs, les crevettes séchées et le chana dal jusqu'à ce qu'ils embaument, puis les retirer.",
"Mixer ces éléments frits avec la pâte de tamarin et 200 ml d'eau jusqu'à obtenir une pâte fine. La faire revenir dans l'huile à feu doux jusqu'à ce que l'huile se sépare.",
"Éplucher les pommes de terre, les couper en morceaux et les cuire à l'eau jusqu'à ce qu'elles soient tendres. Égoutter et réserver.",
"Émincer les oignons et le tofu frit, hacher l'ail, couper le chou et le choy sum. Cuire les nouilles si elles sont sèches. Délayer la sauce soja foncée dans 150 ml d'eau.",
"Pour chaque portion : chauffer de l'huile, ajouter un quart de l'ail, des oignons et de la pâte. Faire sauter jusqu'à ce que cela embaume.",
"Ajouter un quart du tofu, des pommes de terre, des choux et des beignets de crevettes (cucur udang). Faire sauter 30 secondes.",
"Ajouter un quart des nouilles et de la sauce soja délayée. Mélanger 1 minute, pousser les nouilles sur le côté, casser un œuf au centre et mélanger. Garnir de citron vert. Recommencer pour les autres portions."]
$instr$,
    20, 25, 4, 3,
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
    (v_recipe_id, 'huile',               5.5,  'c. à soupe', true,  4,  'au total'),
    (v_recipe_id, 'chana dal',           10,   'g',          false, 5,  'pois chiches cassés'),
    (v_recipe_id, 'pâte de tamarin',     7.5,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'eau',                 200,  'ml',         true,  7,  'pour la pâte'),
    (v_recipe_id, 'pommes de terre',     250,  'g',          true,  8,  NULL),
    (v_recipe_id, 'oignons rouges',      2,    'unité',      true,  9,  NULL),
    (v_recipe_id, 'ail',                 4,    'gousse',     true,  10, NULL),
    (v_recipe_id, 'chou blanc',          30,   'g',          true,  11, 'émincé'),
    (v_recipe_id, 'choy sum',            30,   'g',          false, 12, 'ou kai-lan'),
    (v_recipe_id, 'tofu frit',           1,    'unité',      true,  13, 'bloc de tofu ferme frit'),
    (v_recipe_id, 'sauce soja foncée',   15,   'ml',         true,  14, NULL),
    (v_recipe_id, 'eau',                 150,  'ml',         true,  15, 'pour délayer la sauce soja'),
    (v_recipe_id, 'nouilles jaunes',     400,  'g',          true,  16, 'nouilles aux œufs fraîches (mee)'),
    (v_recipe_id, 'œufs',                4,    'unité',      true,  17, '1 par portion'),
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
    $instr$["Faire infuser le thé de Ceylan 3 minutes dans l'eau chaude.",
"Filtrer le thé dans une grande tasse à anse.",
"Ajouter le lait condensé sucré avec une cuillère préalablement trempée dans de l'eau salée : la touche de sel arrondit le sucré.",
"Transvaser le thé d'une tasse à l'autre 5 fois, en levant la tasse verseuse aussi haut que possible : c'est ce geste qui crée la mousse caractéristique (« tarik » signifie « tirer »).",
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
    (v_recipe_id, 'thé noir',          3,   'c. à café',  true,  1, 'de Ceylan, en feuilles ou en poussière'),
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
    'Soupe de nouilles épicée et acidulée de Penang, à base de maquereau et de tamarin, garnie d''ananas, de concombre, de laitue et d''échalote. Un bouillon profond en umami, à l''acidité vive.',
    $instr$["Cuire le maquereau 10 minutes à feu doux dans les 2 L d'eau. Retirer le poisson et filtrer le bouillon.",
"Mixer en pâte les piments secs (trempés), la pâte de crevettes, le curcuma frais, le galanga, les échalotes et la citronnelle avec un peu d'eau.",
"Verser cette pâte dans le bouillon, ajouter la coriandre vietnamienne (daun kesum) et baisser le feu.",
"Séparer la chair du maquereau en retirant la peau et les arêtes. Émietter la moitié à la fourchette.",
"Repasser à feu vif, ajouter la pâte de tamarin et la chair émiettée. Porter à ébullition.",
"Laisser mijoter 15 minutes à feu doux. Assaisonner de sel et de sucre. Retirer la coriandre vietnamienne avant de servir.",
"Blanchir les nouilles de riz. Dans chaque bol, déposer des nouilles, napper de bouillon, puis garnir de pâte de crevettes noire (petis udang), de morceaux de poisson, de laitue, de concombre, de dés d'ananas, d'échalote, de piment frais et de calamansi."]
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
    (v_recipe_id, 'pâte de crevettes',         5,    'g',     true,  4,  'séchée (belacan)'),
    (v_recipe_id, 'curcuma frais',             5,    'g',     true,  5,  NULL),
    (v_recipe_id, 'galanga',                   10,   'g',     true,  6,  NULL),
    (v_recipe_id, 'échalotes',                 4,    'unité', true,  7,  'pour la pâte, plus un peu pour garnir'),
    (v_recipe_id, 'citronnelle',               1,    'tige',  true,  8,  'écrasée'),
    (v_recipe_id, 'coriandre vietnamienne',    5,    'brin',  true,  9,  'daun kesum'),
    (v_recipe_id, 'pâte de tamarin',           80,   'g',     true,  10, NULL),
    (v_recipe_id, 'sel',                       1,    'c. à café', true, 11, 'au goût'),
    (v_recipe_id, 'sucre',                     1,    'c. à soupe', true, 12, 'au goût'),
    (v_recipe_id, 'pâte de crevettes noire',   1,    'c. à soupe', false, 13, 'petis udang, pour servir'),
    (v_recipe_id, 'nouilles de riz épaisses',  400,  'g',     true,  14, 'nouilles à laksa'),
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
    'Nouilles de riz plates sautées au wok à feu très vif (wok hei), façon marchands ambulants de Penang : crevettes, saucisse chinoise de poulet, œuf et ciboulette chinoise dans une sauce sombre riche en umami.',
    $instr$["Préparer la sauce : mélanger la sauce soja claire, la sauce soja foncée, la sauce huître, la sauce de poisson, le sucre et le poivre.",
"Chauffer le wok à feu très vif. Ajouter l'huile, puis la saucisse en tranches, l'ail haché et la pâte de piment (cili boh). Faire sauter jusqu'à ce que cela embaume.",
"Ajouter les crevettes et le gâteau de poisson, faire sauter 30 secondes.",
"Ajouter les nouilles de riz et mélanger rapidement en versant la sauce. Casser l'œuf directement sur les nouilles, le laisser prendre puis mélanger.",
"Incorporer la ciboulette chinoise et les germes de soja. Faire sauter encore quelques secondes, jusqu'à ce que les germes soient juste cuits.",
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
    (v_recipe_id, 'saucisse chinoise de poulet', 0.5, 'unité', false, 8,  'type lap cheong halal, en tranches'),
    (v_recipe_id, 'pâte de piment',        15,  'ml',          true,  9,  'cili boh'),
    (v_recipe_id, 'ail',                   1,   'gousse',      true,  10, 'haché'),
    (v_recipe_id, 'gâteau de poisson',     0.5, 'unité',       false, 11, 'en tranches'),
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
    $instr$["Griller les cacahuètes à sec jusqu'à ce qu'elles embaument. Les tremper brièvement dans l'eau pour retirer les peaux, puis les moudre grossièrement.",
"Mixer en pâte la citronnelle, le galanga, l'ail et les piments secs (trempés).",
"Faire revenir les échalotes émincées dans l'huile chaude, ajouter la pâte d'aromates et cuire jusqu'à ce qu'elle embaume et que l'huile remonte à la surface.",
"Incorporer les cacahuètes moulues, l'eau et le sel. Porter à ébullition.",
"Ajouter le sucre de palme et laisser mijoter 20 minutes à feu moyen-doux, en remuant régulièrement pour que le fond n'accroche pas.",
"Hors du feu, incorporer la pâte de tamarin. Goûter et ajuster le sel, le sucre et le tamarin selon votre goût."]
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
    (v_recipe_id, 'citronnelle',        4,   'tige',  true,  2,  'parties blanches'),
    (v_recipe_id, 'galanga',            3,   'cm',    true,  3,  NULL),
    (v_recipe_id, 'ail',                3,   'gousse', true, 4,  NULL),
    (v_recipe_id, 'piments rouges secs', 8,  'unité', true,  5,  'trempés'),
    (v_recipe_id, 'échalotes',          2,   'unité', true,  6,  'émincées'),
    (v_recipe_id, 'huile',              45,  'ml',    true,  7,  NULL),
    (v_recipe_id, 'eau',                400, 'ml',    true,  8,  NULL),
    (v_recipe_id, 'sel',                0.25, 'c. à café', true, 9, NULL),
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
    'Brochettes de poulet marinées dans une pâte d''aromates et d''épices (citronnelle, galanga, curcuma, cumin, fenouil), idéalement grillées au charbon. Elles se servent avec la sauce satay aux cacahuètes.',
    $instr$["Couper le poulet (blanc ou cuisse) en lanières d'environ 2 cm.",
"Mixer en pâte le galanga, la citronnelle, le curcuma et les échalotes.",
"Ajouter à la pâte les graines de fenouil, le cumin moulu, le sel et le sucre.",
"Faire mariner les lanières de poulet de 30 minutes à 2 heures au frais (idéalement 2 h).",
"Enfiler les morceaux sur des brochettes en bambou préalablement trempées 30 minutes dans l'eau.",
"Griller au charbon ou à la plancha à feu vif, en badigeonnant régulièrement d'huile à l'aide d'une tige de citronnelle écrasée. Cuire jusqu'à ce que le poulet soit bien doré et cuit à cœur.",
"Servir avec de la sauce satay, des gâteaux de riz (ketupat), du concombre et de l'oignon."]
$instr$,
    50, 15, 4, 2,
    'Malaisienne', 'appetizer',
    ARRAY['malaisien','poulet','grillé','brochette','satay','street food'],
    'manual',
    'https://www.nyonyacooking.com/recipes/chicken-satay~rJRl_PjvMcbX',
    'https://ucarecdn.com/33f9bfbb-19e5-4e13-b25d-caee5cb16948/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/chicken-satay.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet',                500, 'g',     true,  1, 'blanc ou cuisse'),
    (v_recipe_id, 'galanga',                3,  'cm',    true,  2, NULL),
    (v_recipe_id, 'citronnelle',            4,  'tige',  true,  3, 'parties blanches, plus une tige écrasée pour badigeonner'),
    (v_recipe_id, 'curcuma frais',          3,  'cm',    true,  4, 'ou 1 c. à café de poudre'),
    (v_recipe_id, 'échalotes',              3,  'unité', true,  5, NULL),
    (v_recipe_id, 'graines de fenouil',     5,  'g',     true,  6, NULL),
    (v_recipe_id, 'cumin moulu',            5,  'g',     true,  7, NULL),
    (v_recipe_id, 'sel',                    2.5,'g',     true,  8, NULL),
    (v_recipe_id, 'sucre',                  15, 'g',     true,  9, NULL),
    (v_recipe_id, 'huile',                  30, 'ml',    true,  10, 'pour badigeonner');

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
    'Riz frit malaisien à la sauce tomate, accompagné de poulet sauté en sauce. Une version « USA » colorée et légèrement sucrée, popularisée dans les restaurants mamak.',
    $instr$["Poulet en sauce : dans une poêle chaude, faire revenir avec la moitié de l'huile une gousse d'ail et le gingembre. Ajouter la moitié de la pâte de piment (cili boh) et faire sauter jusqu'à ce que cela embaume. Ajouter le poulet et le cuire presque à cœur. Incorporer la moitié de l'oignon et le poivron, et faire sauter.",
"Ajouter la moitié de la sauce tomate et la sauce huître. Verser l'eau et laisser mijoter à feu moyen. Ajouter la moitié de la tomate, en dés. Cuire jusqu'à ce que la sauce épaississe, puis réserver.",
"Riz : dans un wok propre, chauffer le reste de l'huile et faire revenir le reste de l'ail et de l'oignon jusqu'à ce qu'ils embaument. Ajouter le reste de la pâte de piment et la carotte en dés. Faire sauter 2 minutes à feu vif.",
"Ajouter le riz cuit froid et le reste de la sauce tomate. Mélanger rapidement pour bien enrober. Ajouter la sauce soja et le poivre blanc, puis faire sauter encore un instant.",
"Dresser le riz et déposer le poulet à côté. Garnir de tranches de concombre et du reste de la tomate."]
$instr$,
    20, 35, 1, 2,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','riz frit','sauce tomate','poulet','mamak','street food'],
    'manual',
    'https://www.nyonyacooking.com/recipes/nasi-goreng-usa~BJ9g_DsDzqWQ',
    'https://ucarecdn.com/15aad833-8738-4e04-8d52-9bae2ebbc0b4/-/scale_crop/1280x720/center/-/quality/normal/-/format/jpeg/nasi-goreng-usa.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile',           30,  'ml',     true,  1,  'moitié pour le poulet, moitié pour le riz'),
    (v_recipe_id, 'ail',             2,   'gousse', true,  2,  'hachées'),
    (v_recipe_id, 'gingembre',       1,   'cm',     true,  3,  'en tranches'),
    (v_recipe_id, 'pâte de piment',  30,  'ml',     true,  4,  'cili boh, moitié pour le poulet, moitié pour le riz'),
    (v_recipe_id, 'poulet',          100, 'g',      true,  5,  'cuisse en lanières'),
    (v_recipe_id, 'poivron',         0.5, 'unité',  true,  6,  'en dés'),
    (v_recipe_id, 'oignon jaune',    1,   'unité',  true,  7,  'émincé, moitié pour le poulet, moitié pour le riz'),
    (v_recipe_id, 'tomate',          1,   'unité',  true,  8,  'moitié en dés pour la sauce, moitié en tranches pour garnir'),
    (v_recipe_id, 'sauce tomate',    30,  'ml',     true,  9,  'moitié pour le poulet, moitié pour le riz'),
    (v_recipe_id, 'eau',             120, 'ml',     true,  10, NULL),
    (v_recipe_id, 'sauce huître',    15,  'ml',     true,  11, NULL),
    (v_recipe_id, 'carotte',         1,   'unité',  true,  12, 'en dés'),
    (v_recipe_id, 'riz cuit',        240, 'g',      true,  13, 'froid, idéalement de la veille'),
    (v_recipe_id, 'sauce soja',      15,  'ml',     true,  14, NULL),
    (v_recipe_id, 'poivre blanc',    0.25, 'c. à café', true, 15, NULL),
    (v_recipe_id, 'concombre',       0.5, 'unité',  false, 16, 'en tranches, garniture');

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
    'Burger de street food malaisien : une galette de viande assaisonnée, enveloppée dans une fine omelette, avec sauce chili sucrée, mayonnaise et sauce au poivre noir, dans un pain beurré et doré à la poêle.',
    $instr$["Mélanger la viande hachée avec la sauce soja, le paprika, le poivre blanc, la moitié de l'oignon hachée et l'ail. Former deux galettes plates.",
"Chauffer une poêle avec un peu de beurre et cuire les galettes à feu moyen des deux côtés, jusqu'à ce qu'elles soient colorées et cuites à cœur.",
"Beurrer généreusement les faces internes des pains et les faire dorer à la poêle.",
"Pour chaque burger : battre un œuf. Huiler légèrement la poêle, y verser l'œuf et déposer une galette au centre de l'omelette pendant que l'œuf prend.",
"Replier les bords de l'omelette sur la galette comme une enveloppe (la signature du Ramly burger).",
"Garnir chaque pain de sauce chili sucrée, de mayonnaise et de sauce au poivre noir, puis de tranches de concombre, de la galette enveloppée d'œuf, du reste de l'oignon émincé, de tomate et de laitue. Refermer et servir tout de suite."]
$instr$,
    20, 25, 2, 2,
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
    (v_recipe_id, 'paprika en poudre',     0.5, 'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'poivre blanc',          1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'oignon jaune',          1,   'unité',      true,  5,  'moitié hachée pour la viande, moitié émincée pour garnir'),
    (v_recipe_id, 'ail',                   1,   'gousse',     true,  6,  'haché'),
    (v_recipe_id, 'beurre',                11,  'g',          true,  7,  'doux, pour la cuisson et les pains'),
    (v_recipe_id, 'œufs',                  2,   'unité',      true,  8,  '1 omelette par burger'),
    (v_recipe_id, 'huile',                 10,  'ml',         true,  9,  NULL),
    (v_recipe_id, 'mayonnaise',            7.5, 'ml',         true,  10, NULL),
    (v_recipe_id, 'sauce au poivre noir',  7.5, 'ml',         true,  11, NULL),
    (v_recipe_id, 'sauce chili sucrée',    7.5, 'ml',         true,  12, NULL),
    (v_recipe_id, 'tomate',                0.5, 'unité',      false, 13, 'en tranches'),
    (v_recipe_id, 'laitue',                2,   'feuille',    false, 14, NULL),
    (v_recipe_id, 'concombre',             16,  'tranche',    false, 15, 'tranches fines'),
    (v_recipe_id, 'pains à burger',        2,   'unité',      true,  16, NULL);

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
    'Plat minangkabau (Sumatra, Malaisie) : du poulet mijoté lentement dans une pâte d''épices et du lait de coco jusqu''à ce que la sauce caramélise. La noix de coco torréfiée (kerisik) lui apporte sa note gourmande caractéristique.',
    $instr$["Torréfier la noix de coco râpée à sec dans une poêle, à feu moyen, jusqu'à ce qu'elle soit brun foncé, puis la piler au mortier jusqu'à ce qu'elle rende son huile (kerisik).",
"Mixer en pâte fine les piments rouges, le galanga, l'ail, les échalotes, la citronnelle et le gingembre.",
"Chauffer l'huile et faire revenir la pâte d'épices à feu moyen jusqu'à ce qu'elle embaume et que l'huile remonte.",
"Ajouter le kerisik et bien mélanger. Incorporer le poulet en morceaux et le faire revenir 3-5 minutes.",
"Verser le lait de coco et l'eau, saler. Cuire à feu doux et à découvert, en remuant régulièrement, jusqu'à ce que la sauce réduise et nappe le poulet (~45 min).",
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
    (v_recipe_id, 'citronnelle',             3,   'tige',  true,  4,  'parties blanches'),
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
    'Classique malais : du poulet mariné au curcuma et frit, puis mijoté dans une sauce tomate-ketchup légèrement piquante jusqu''à ce qu''elle devienne épaisse et brillante. Rouge profond, sucré-salé, parfait avec un nasi minyak.',
    $instr$["Faire mariner 15 minutes les morceaux de poulet avec le curcuma en poudre et le sel.",
"Frire le poulet dans l'huile chaude jusqu'à ce qu'il soit doré de façon uniforme, puis le réserver sur du papier absorbant.",
"Mixer l'oignon, le gingembre, l'ail et les piments rouges secs (trempés). Faire revenir cette pâte dans l'huile à feu moyen jusqu'à ce qu'elle embaume.",
"Ajouter la tomate en dés et le ketchup. Mélanger.",
"Verser l'eau et porter à ébullition. Baisser le feu et laisser mijoter jusqu'à ce que la sauce épaississe.",
"Ajouter le poulet frit en nappant chaque morceau de sauce. Ajouter le sucre. Laisser mijoter encore 5 min, puis servir."]
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
    (v_recipe_id, 'gingembre',              3,   'cm',    true,  6,  NULL),
    (v_recipe_id, 'ail',                    2,   'gousse', true, 7,  NULL),
    (v_recipe_id, 'piments rouges séchés',  6,   'unité', true,  8,  'trempés'),
    (v_recipe_id, 'huile',                  30,  'ml',    true,  9,  'pour la sauce'),
    (v_recipe_id, 'tomate',                 1,   'unité', true,  10, 'en dés'),
    (v_recipe_id, 'ketchup',                45,  'ml',    true,  11, NULL),
    (v_recipe_id, 'eau',                    250, 'ml',    true,  12, NULL),
    (v_recipe_id, 'sucre',                  0.25, 'c. à café', true, 13, NULL);

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
    'Poulet malaisien laqué à la sauce soja foncée et au miel, parfumé à l''anis étoilé et à la cannelle. Un plat sucré-salé brillant, parfait avec du riz blanc.',
    $instr$["Mixer en pâte fine l'oignon, le gingembre, l'ail et le piment rouge avec un peu d'eau.",
"Enrober les morceaux de poulet d'une fine couche de fécule de maïs. Les frire dans l'huile chaude jusqu'à ce qu'ils soient dorés, puis égoutter.",
"Dans une poêle, chauffer 30 ml d'huile et faire revenir la pâte d'épices jusqu'à ce qu'elle embaume.",
"Ajouter l'anis étoilé et le bâton de cannelle. Verser la sauce soja foncée et l'eau.",
"Laisser mijoter quelques minutes et saler au goût. Incorporer le miel (et un peu de sucre si désiré).",
"Ajouter le poulet frit et retourner les morceaux dans la sauce. Cuire 15 minutes en remuant régulièrement pour bien les laquer."]
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
    (v_recipe_id, 'fécule de maïs',      30,  'g',     true,  2,  'pour enrober'),
    (v_recipe_id, 'huile',               250, 'ml',    true,  3,  'pour la friture'),
    (v_recipe_id, 'oignon jaune',        1,   'unité', true,  4,  NULL),
    (v_recipe_id, 'gingembre',           3,   'cm',    true,  5,  NULL),
    (v_recipe_id, 'ail',                 4,   'gousse', true, 6,  NULL),
    (v_recipe_id, 'piment rouge frais',  1,   'unité', true,  7,  NULL),
    (v_recipe_id, 'huile',               30,  'ml',    true,  8,  'pour la sauce'),
    (v_recipe_id, 'anis étoilé',         1,   'unité', true,  9,  NULL),
    (v_recipe_id, 'cannelle',            1,   'bâton', true,  10, NULL),
    (v_recipe_id, 'sauce soja foncée',   30,  'ml',    true,  11, 'ou kecap manis (sauce soja sucrée)'),
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
    'Crêpes en dentelle au curcuma, une spécialité malaise. Coulées en forme de filet à l''aide d''un moule spécial, elles servent à saucer les currys (poulet, agneau) ou à accompagner un kuah dalca.',
    $instr$["Dans un bol, mélanger le sel, le curcuma en poudre et la farine de blé.",
"Ajouter les œufs, l'huile et l'eau. Bien fouetter (3 min au mixeur ou 6 min au fouet).",
"Passer la pâte au tamis pour éliminer les grumeaux, puis la verser dans une bouteille à bec verseur (ou un moule à roti jala).",
"Chauffer une poêle antiadhésive à feu doux. Dessiner un motif en dentelle en faisant des allers-retours avec la bouteille au-dessus de la poêle.",
"Cuire environ 2 minutes sans couvercle, jusqu'à ce que la couleur s'éclaircisse et que la crêpe se détache facilement. Ne pas la retourner.",
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
