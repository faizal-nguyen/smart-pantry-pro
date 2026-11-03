-- =====================================================================
-- Seed: 28 recipes from myriadrecipes.com (2026-05-19)
--
-- Sources fetched 2026-05-19 :
--   1.  https://myriadrecipes.com/peanut-butter-noodles/
--   2.  https://myriadrecipes.com/viral-dumpling-lasagna/
--   3.  https://myriadrecipes.com/nacho-fries/
--   4.  https://myriadrecipes.com/air-fryer-rice-paper-rolls/
--   5.  https://myriadrecipes.com/cheesy-nduja-slider/
--   6.  https://myriadrecipes.com/gochujang-onigiri/
--   7.  https://myriadrecipes.com/korean-gilgeori-toast/
--   8.  https://myriadrecipes.com/mexican-pambazo-sandwich/
--   9.  https://myriadrecipes.com/fried-momos/
--   10. https://myriadrecipes.com/the-mitraillette/
--   11. https://myriadrecipes.com/butter-chicken-crispy-rolls/
--   12. https://myriadrecipes.com/silken-tofu-pasta-sauce/
--   13. https://myriadrecipes.com/mapo-tofu-udon/
--   14. https://myriadrecipes.com/spicy-boursin-pasta/
--   15. https://myriadrecipes.com/blanket-dumplings/
--   16. https://myriadrecipes.com/thai-peanut-butter-noodles/
--   17. https://myriadrecipes.com/chicken-katsu-ramen/
--   18. https://myriadrecipes.com/dijon-mustard-chicken/
--   19. https://myriadrecipes.com/korean-style-chicken-stew/
--   20. https://myriadrecipes.com/loco-moco/
--   21. https://myriadrecipes.com/peanut-butter-ragu/
--   22. https://myriadrecipes.com/one-pot-spicy-gochujang-lasagne/
--   23. https://myriadrecipes.com/kimchijeon-traybake/
--   24. https://myriadrecipes.com/bulgogi-fried-rice/
--   25. https://myriadrecipes.com/korean-rice-balls-jumeokbap/
--   26. https://myriadrecipes.com/okonomiyaki-traybake/
--   27. https://myriadrecipes.com/wagamama-pad-thai-recipe/
--   28. https://myriadrecipes.com/vegan-sushi-bake/
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` as owned
-- recipes for the audit user `c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6`.
-- Idempotent : DELETEs by name first (FK cascade vide recipe_ingredients).
--
-- Note collisions :
--   - "Loco Moco" coexiste avec "Loco Moco au Poivre" (Instagram seed) -> noms distincts OK
--   - "Sushi Bake" (Instagram seed) -> renomme ici en "Vegan Sushi Bake"
--   - "Butter Chicken (Michelin Star)" (Instagram seed) -> ici "Butter Chicken Crispy Rolls" distinct
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-myriadrecipes.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Spicy Peanut Butter Noodles',
    'Viral Dumpling Lasagna',
    'Easy Nacho Fries',
    'Air Fryer Rice Paper Rolls',
    'Cheesy Nduja Slider',
    'Gochujang Onigiri',
    'Korean Gilgeori Toast',
    'Mexican Pambazo Sandwich',
    'Fried Momos (Vegan)',
    'The Mitraillette',
    'Butter Chicken Crispy Rolls',
    'Creamy Silken Tofu Pasta',
    'Mapo Tofu Udon',
    'Spicy Boursin Pasta',
    'No Fold Blanket Dumplings',
    'Thai Peanut Butter Noodles',
    'Chicken Katsu Ramen',
    'Creamy Dijon Mustard Chicken',
    'Korean-Style Chicken Stew',
    'Loco Moco',
    'Spicy Peanut Butter Ragu',
    'One Pot Spicy Gochujang Lasagne',
    'Kimchijeon Traybake',
    'Bulgogi Fried Rice',
    'Korean Rice Balls (Jumeokbap)',
    'Okonomiyaki Traybake',
    'Wagamama Pad Thai',
    'Vegan Sushi Bake'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Spicy Peanut Butter Noodles
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Spicy Peanut Butter Noodles',
    'Nouilles udon dans un bouillon coco-cacahuète au curry rouge thaï, surmontées de poulet doré, mangetouts, coriandre et huile pimentée.',
    $instr$["Chauffer l'huile dans une grande casserole. Saisir les blancs de poulet 5 minutes par face jusqu'à ce qu'ils soient dorés. Réserver.",
"Dans la même casserole, ajouter l'ail, la pâte de curry rouge thaï, la sauce soja et le beurre de cacahuète. Bien mélanger, puis verser le lait de coco et le bouillon de poulet. Porter à ébullition puis réduire le feu.",
"Remettre le poulet dans la sauce, couvrir et laisser mijoter 10 à 15 minutes. Retirer le poulet et le trancher.",
"Goûter et rectifier l'assaisonnement. Ajouter les nouilles udon et les cuire directement dans le bouillon selon les indications du paquet.",
"Répartir les nouilles dans les bols, napper de bouillon, puis déposer le poulet tranché, les mangetouts, la coriandre, les quartiers de citron vert et un trait d'huile pimentée."]
$instr$,
    5, 30, 2, 2,
    'Thaïlandaise', 'dinner',
    ARRAY['thaï','nouilles','cacahuète','poulet','coco','one-pan','rapide'],
    'manual',
    'https://myriadrecipes.com/peanut-butter-noodles/',
    'https://myriadrecipes.com/wp-content/uploads/2024/12/Peanut-Butter-Noodles-8-800x1200.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',           2,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  2,  'pour saisir le poulet'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  3,  'émincé'),
    (v_recipe_id, 'pâte de curry rouge thaï',   1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'beurre de cacahuète',        2,   'c. à soupe', true,  6,  'crémeux ou avec morceaux'),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  7,  '1 boîte de 400 ml'),
    (v_recipe_id, 'bouillon de poulet',         400, 'ml',         true,  8,  NULL),
    (v_recipe_id, 'nouilles udon',              300, 'g',          true,  9,  'ou nouilles ramen'),
    (v_recipe_id, 'mangetouts',                 100, 'g',          false, 10, 'garniture'),
    (v_recipe_id, 'coriandre fraîche',          10,  'g',          false, 11, 'garniture'),
    (v_recipe_id, 'huile pimentée',             1,   'c. à soupe', false, 12, 'garniture'),
    (v_recipe_id, 'citron vert',                1,   'unité',      false, 13, 'en quartiers, pour servir');

  -- =====================================================================
  -- 2. Viral Dumpling Lasagna
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Viral Dumpling Lasagna',
    'Lasagne virale de TikTok à base de feuilles à raviolis et d''une farce poulet-shiitake, cuite à la vapeur puis nappée d''une sauce tahini-soja et d''huile pimentée.',
    $instr$["Préparer la farce : dans un saladier, mélanger le poulet haché, les oignons nouveaux, les shiitake, l'ail, le gingembre, la sauce soja, le vinaigre de riz, l'huile de sésame, le sucre, le poivre et le glutamate monosodique (optionnel) jusqu'à obtenir une texture homogène.",
"Dans un plat résistant à la chaleur (environ 18 × 23 × 8 cm), étaler un tiers de la farce en guise de base. Recouvrir de 9 feuilles à raviolis en les faisant se chevaucher le moins possible.",
"Répéter : une couche de farce, 9 feuilles, la dernière couche de farce, puis 9 feuilles. Verser les 75 ml d'eau sur le dessus.",
"Placer le plat dans un panier vapeur au-dessus de 5 à 8 cm d'eau bouillante. Couvrir et cuire 17 minutes à feu vif.",
"Pendant la cuisson, préparer la sauce : fouetter le tahini, le sucre, la sauce soja, le jus de citron vert, l'huile de sésame et l'ail émincé.",
"Sortir délicatement le plat du panier vapeur. Arroser de sauce tahini et d'huile pimentée, puis parsemer de ciboulette et de graines de sésame. Servir immédiatement."]
$instr$,
    5, 17, 2, 2,
    'Chinoise', 'dinner',
    ARRAY['chinois','dumplings','vapeur','tiktok viral','poulet','tahini'],
    'manual',
    'https://myriadrecipes.com/viral-dumpling-lasagna/',
    'https://myriadrecipes.com/wp-content/uploads/2026/01/viral-dumpling-lasagna-6.jpeg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet haché',               500, 'g',          true,  1,  NULL),
    (v_recipe_id, 'oignons nouveaux',           5,   'unité',      true,  2,  'finement émincés'),
    (v_recipe_id, 'champignons shiitake',       100, 'g',          true,  3,  'finement hachés'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  4,  'émincé'),
    (v_recipe_id, 'gingembre',                  2,   'cm',         true,  5,  'émincé'),
    (v_recipe_id, 'sauce soja claire',          2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'vinaigre de riz',            1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'huile de sésame',            1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'poivre noir moulu',          0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'glutamate monosodique',      0.5, 'c. à café',  false, 11, 'MSG, optionnel'),
    (v_recipe_id, 'feuilles à raviolis',        27,  'unité',      true,  12, '3 couches de 9'),
    (v_recipe_id, 'eau',                        75,  'ml',         true,  13, 'versée sur le dessus avant la cuisson vapeur'),
    (v_recipe_id, 'tahini',                     1,   'c. à soupe', true,  14, 'ou beurre de cacahuète, pour la sauce'),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  15, 'pour la sauce'),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  16, 'pour la sauce'),
    (v_recipe_id, 'citron vert',                0.5, 'unité',      true,  17, 'jus, pour la sauce'),
    (v_recipe_id, 'huile de sésame',            0.5, 'c. à soupe', true,  18, 'pour la sauce'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  19, 'émincé, pour la sauce'),
    (v_recipe_id, 'huile pimentée',             2,   'c. à soupe', false, 20, 'garniture'),
    (v_recipe_id, 'ciboulette',                 10,  'g',          false, 21, 'garniture'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à café',  false, 22, 'garniture');

  -- =====================================================================
  -- 3. Easy Nacho Fries
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Easy Nacho Fries',
    'Frites maison à l''air fryer assaisonnées d''épices mexicaines, surmontées de bœuf haché, de tomates, d''une sauce fromage maison et de crème fraîche.',
    $instr$["Couper les pommes de terre en bâtonnets fins. Dans un saladier, les enrober d'huile végétale, de maïzena, de sel fin et de sucre.",
"Cuire à l'air fryer à 200 °C pendant 15 à 20 minutes en remuant à mi-cuisson.",
"Préparer le mélange d'épices nachos : combiner le paprika, le chili en poudre, le cumin, l'oignon en poudre, le poivre noir, l'ail en poudre, le sel en flocons et un trait de jus de citron.",
"Faire dorer le bœuf haché dans une poêle avec un filet d'huile végétale. Assaisonner de cumin, d'origan, de chili en poudre et d'une pincée de sel fin.",
"Préparer la sauce fromage : faire fondre le beurre, incorporer la farine au fouet puis verser le lait progressivement. Ajouter le cheddar râpé, le curcuma et le paprika pour la couleur. Goûter et rectifier l'assaisonnement.",
"Enrober les frites du mélange d'épices et les arroser du reste de jus de citron.",
"Dresser sur un plat : frites, bœuf, tomates, sauce fromage, crème fraîche et ciboulette."]
$instr$,
    20, 20, 2, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','air fryer','frites','bœuf','fromage','street food'],
    'manual',
    'https://myriadrecipes.com/nacho-fries/',
    'https://myriadrecipes.com/wp-content/uploads/2026/03/nacho-fries-14.jpeg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pommes de terre',            500, 'g',          true,  1,  'grosses, en bâtonnets'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  2,  'pour les frites'),
    (v_recipe_id, 'maïzena',                    1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'sel fin',                    0.25, 'c. à café',  true,  4,  'pour les frites'),
    (v_recipe_id, 'sucre',                      0.25, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  6,  'assaisonnement nachos'),
    (v_recipe_id, 'chili en poudre',            0.5, 'c. à café',  true,  7,  'doux, assaisonnement nachos'),
    (v_recipe_id, 'cumin moulu',                0.5, 'c. à café',  true,  8,  'assaisonnement nachos'),
    (v_recipe_id, 'oignon en poudre',           0.5, 'c. à café',  true,  9,  'assaisonnement nachos'),
    (v_recipe_id, 'poivre noir moulu',          0.25, 'c. à café',  true,  10, 'assaisonnement nachos'),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  11, 'assaisonnement nachos'),
    (v_recipe_id, 'sel en flocons',             0.5, 'c. à café',  true,  12, 'assaisonnement nachos'),
    (v_recipe_id, 'jus de citron',              0.25, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'bœuf haché',                 250, 'g',          true,  14, NULL),
    (v_recipe_id, 'huile végétale',             1,   'c. à café',  true,  15, 'pour le bœuf'),
    (v_recipe_id, 'cumin moulu',                1,   'c. à café',  true,  16, 'pour le bœuf'),
    (v_recipe_id, 'origan séché',               1,   'c. à café',  true,  17, 'pour le bœuf'),
    (v_recipe_id, 'chili en poudre',            0.5, 'c. à café',  true,  18, 'doux, pour le bœuf'),
    (v_recipe_id, 'sel fin',                    1,   'pincée',     true,  19, 'pour le bœuf'),
    (v_recipe_id, 'beurre',                     25,  'g',          true,  20, 'salé, pour la sauce'),
    (v_recipe_id, 'farine',                     25,  'g',          true,  21, 'pour la sauce'),
    (v_recipe_id, 'lait',                       250, 'ml',         true,  22, 'pour la sauce'),
    (v_recipe_id, 'cheddar',                    100, 'g',          true,  23, 'râpé'),
    (v_recipe_id, 'paprika',                    0.25, 'c. à café',  true,  24, 'pour la sauce'),
    (v_recipe_id, 'curcuma',                    0.25, 'c. à café',  true,  25, 'pour la couleur'),
    (v_recipe_id, 'tomates',                    2,   'unité',      false, 26, 'finement coupées, garniture'),
    (v_recipe_id, 'crème fraîche',              2,   'c. à soupe', false, 27, 'garniture'),
    (v_recipe_id, 'ciboulette',                 5,   'g',          false, 28, 'optionnel, garniture');

  -- =====================================================================
  -- 4. Air Fryer Rice Paper Rolls
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Air Fryer Rice Paper Rolls',
    'Rouleaux croustillants en galettes de riz cuits à l''air fryer, garnis de bœuf haché, de légumes croquants et de champignons, servis avec une sauce chili douce.',
    $instr$["Chauffer une poêle à feu moyen-vif avec l'huile végétale. Faire revenir l'oignon émincé 2 minutes en remuant souvent.",
"Ajouter le bœuf haché, l'écraser à la spatule et cuire 10 minutes en remuant.",
"Incorporer l'ail et le gingembre et faire revenir 1 minute. Ajouter les carottes, le chou et les shiitake, cuire 2 minutes puis ajouter le céleri.",
"Verser la sauce soja, l'huile de sésame et la sauce huître. Faire sauter 2 minutes. Goûter et rectifier l'assaisonnement. Laisser refroidir la farce 10 minutes au réfrigérateur.",
"Tremper rapidement une galette de riz dans l'eau tiède et la poser à plat. Déposer 2 c. à soupe de farce à 5 cm du bord inférieur. Quand la galette devient collante, replier le bas vers le centre, rabattre les côtés et rouler serré.",
"Envelopper chaque rouleau dans une seconde galette de riz pour éviter qu'il ne se déchire à la cuisson.",
"Cuire à l'air fryer à 200 °C pendant 10 minutes en espaçant les rouleaux. Servir avec la sauce chili douce."]
$instr$,
    20, 20, 4, 3,
    'Vietnamienne', 'snack',
    ARRAY['vietnamien','rouleaux','air fryer','bœuf','croustillant','apéro'],
    'manual',
    'https://myriadrecipes.com/air-fryer-rice-paper-rolls/',
    'https://myriadrecipes.com/wp-content/uploads/2025/03/air-fryer-rice-paper-rolls-1-800x1200.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 300, 'g',          true,  1,  NULL),
    (v_recipe_id, 'oignon blanc',               1,   'unité',      true,  2,  'finement émincé'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  3,  'émincé'),
    (v_recipe_id, 'gingembre',                  2,   'cm',         true,  4,  'émincé'),
    (v_recipe_id, 'chou',                       150, 'g',          true,  5,  'finement haché (environ ¼ de chou)'),
    (v_recipe_id, 'carottes',                   2,   'unité',      true,  6,  'en julienne'),
    (v_recipe_id, 'céleri',                     2,   'branche',    true,  7,  'en julienne'),
    (v_recipe_id, 'champignons shiitake',       100, 'g',          true,  8,  'finement émincés'),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'huile de sésame',            1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'sauce huître',               2,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'galettes de riz',            16,  'unité',      true,  12, '8 rouleaux de 2 galettes'),
    (v_recipe_id, 'sauce chili douce',          2,   'c. à soupe', false, 13, 'pour servir'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  14, 'pour la cuisson');

  -- =====================================================================
  -- 5. Cheesy Nduja Slider
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Cheesy Nduja Slider',
    'Ciabatta garnie d''un mélange d''oignons fondants, de chorizo de boeuf, de mozzarella et de saucisse de bœuf épicée, passée sous le gril jusqu''à ce que le fromage fonde. Un apéritif à partager.',
    $instr$["Chauffer l'huile d'olive dans une poêle à feu moyen. Faire revenir les oignons et l'ail 5 minutes jusqu'à ce qu'ils soient tendres.",
"Transférer dans un saladier. Ajouter le chorizo de boeuf, le persil, la mozzarella, la saucisse de bœuf épicée écrasée, une pincée de sel et le poivre. Bien mélanger.",
"Trancher la ciabatta horizontalement. Garnir la moitié inférieure du mélange et déposer les tranches de beurre par-dessus.",
"Refermer et passer sous le gril du four environ 5 minutes en surveillant pour ne pas brûler. Servir aussitôt, coupé en parts."]
$instr$,
    10, 5, 4, 1,
    'Italienne', 'snack',
    ARRAY['italien','sandwich','mozzarella','épicé','apéro','partage','rapide'],
    'manual',
    'https://myriadrecipes.com/cheesy-nduja-slider/',
    'https://myriadrecipes.com/wp-content/uploads/2022/11/IMG_5269.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ciabatta',                   1,   'unité',      true,  1,  'grande'),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'oignons',                    2,   'unité',      true,  3,  'finement émincés'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  4,  'finement émincé'),
    (v_recipe_id, 'chorizo de boeuf',            150, 'g',          true,  5,  'finement haché'),
    (v_recipe_id, 'persil',                     10,  'g',          true,  6,  'haché'),
    (v_recipe_id, 'mozzarella',                 125, 'g',          true,  7,  'grossièrement coupée'),
    (v_recipe_id, 'saucisse de bœuf épicée',    20,  'g',          true,  8,  'chair retirée du boyau et écrasée en pâte (≈ 1 c. à soupe)'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  9,  NULL),
    (v_recipe_id, 'poivre noir moulu',          1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'beurre salé',                20,  'g',          true,  11, 'en tranches fines');

  -- =====================================================================
  -- 6. Gochujang Onigiri
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Gochujang Onigiri',
    'Onigiri fusion coréano-japonais : riz à sushi relevé au gochujang, fourré au thon-mayonnaise et ceinturé de nori. Un en-cas simple à emporter.',
    $instr$["Dans un saladier, mélanger le riz froid avec le gochujang, la sauce soja, l'huile de sésame, le gochugaru, le sucre, l'ail, le gingembre et le ketchup jusqu'à obtenir une couleur orangée uniforme.",
"Dans un autre bol, mélanger le thon égoutté, la mayonnaise, le poivre noir et un oignon nouveau émincé.",
"Sur un film alimentaire, déposer une couche de riz, creuser un puits, ajouter une cuillerée de garniture et recouvrir d'une seconde couche de riz.",
"Refermer le film et presser pour former un triangle. Réfrigérer au moins 10 minutes.",
"Démouler, déposer une bande de nori sur la base, parsemer du second oignon nouveau et servir."]
$instr$,
    5, 15, 3, 2,
    'Coréenne', 'snack',
    ARRAY['coréen','japonais','onigiri','gochujang','thon','nomade','fusion'],
    'manual',
    'https://myriadrecipes.com/gochujang-onigiri/',
    'https://myriadrecipes.com/wp-content/uploads/2022/10/IMG_3561.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz à sushi',                40,  'g',          true,  1,  'cuit puis refroidi (≈ 100 g de riz cuit)'),
    (v_recipe_id, 'gochujang',                  1,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'sauce soja',                 1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'huile de sésame',            1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'gochugaru',                  0.5, 'c. à café',  true,  5,  'flocons de piment coréen'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'ail',                        0.5, 'gousse',     true,  7,  'émincé (½ c. à café)'),
    (v_recipe_id, 'gingembre',                  0.5, 'cm',         true,  8,  'émincé (½ c. à café)'),
    (v_recipe_id, 'ketchup',                    1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'thon en boîte',              125, 'g',          true,  10, 'égoutté'),
    (v_recipe_id, 'mayonnaise',                 1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'poivre noir moulu',          1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'oignon nouveau',             1,   'unité',      true,  13, 'finement émincé, pour la garniture'),
    (v_recipe_id, 'oignon nouveau',             1,   'unité',      false, 14, 'finement émincé, pour servir'),
    (v_recipe_id, 'feuille de nori',            1,   'unité',      false, 15, 'coupée en 4 bandes, pour servir');

  -- =====================================================================
  -- 7. Korean Gilgeori Toast
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Korean Gilgeori Toast',
    'Sandwich de street food coréen : omelette aux légumes, fromage, sucre et ketchup entre deux tranches de pain de mie dorées au beurre.',
    $instr$["Dans un saladier, mélanger l'oignon, la carotte, l'oignon nouveau, 2 c. à soupe de chou et les œufs battus.",
"Faire fondre un peu de beurre dans une grande poêle à feu moyen. Verser le mélange et le façonner en carré légèrement plus grand qu'une tranche de pain.",
"Cuire l'omelette 4 à 5 minutes, la retourner et la cuire encore 4 minutes.",
"Déposer les tranches de fromage sur l'omelette, saupoudrer de sucre et ajouter un trait de ketchup. Réserver au chaud.",
"Remettre du beurre dans la poêle et faire dorer les tranches de pain 2 minutes par face.",
"Assembler : pain doré, omelette au fromage, la ½ c. à soupe de chou restante, puis la seconde tranche de pain. Servir aussitôt."]
$instr$,
    5, 15, 1, 1,
    'Coréenne', 'breakfast',
    ARRAY['coréen','street food','sandwich','omelette','petit-déjeuner','rapide'],
    'manual',
    'https://myriadrecipes.com/korean-gilgeori-toast/',
    'https://myriadrecipes.com/wp-content/uploads/2022/03/IMG_3698.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pain de mie',                2,   'tranche',    true,  1,  'épaisses, type pain au lait'),
    (v_recipe_id, 'chou blanc',                 15,  'g',          true,  2,  'râpé (2,5 c. à soupe)'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  3,  'finement émincé'),
    (v_recipe_id, 'carotte',                    0.5, 'unité',      true,  4,  'finement émincée'),
    (v_recipe_id, 'oignon nouveau',             1,   'unité',      true,  5,  'finement émincé'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  6,  'battus'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'fromage fondu',              4,   'tranche',    true,  8,  'tranches carrées pour burger'),
    (v_recipe_id, 'ketchup',                    1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'beurre',                     20,  'g',          true,  10, 'ou margarine');

  -- =====================================================================
  -- 8. Mexican Pambazo Sandwich
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Mexican Pambazo Sandwich',
    'Sandwich mexicain pambazo : pain garni de chorizo de boeuf et de pommes de terre, de laitue, d''avocat et de crème au fromage, servi avec une sauce aux piments guajillo pour tremper.',
    $instr$["Placer les piments guajillo séchés, une moitié d'oignon rouge et l'ail dans un bol, puis couvrir de 200 ml d'eau bouillante. Laisser tremper 15 minutes.",
"Mixer le tout avec 50 ml de l'eau de trempage jusqu'à obtenir une sauce lisse. Réserver.",
"Chauffer l'huile dans une poêle. Faire revenir l'autre moitié d'oignon, le chorizo de boeuf et les pommes de terre avec le cumin, l'origan et le paprika pendant 10 minutes.",
"Mélanger le cheddar râpé avec la crème fraîche pour obtenir une crème au fromage.",
"Ouvrir le pain. Le garnir de la farce, puis ajouter la laitue, l'avocat et la crème au fromage. Refermer et servir avec la sauce guajillo pour tremper."]
$instr$,
    15, 25, 1, 3,
    'Mexicaine', 'lunch',
    ARRAY['mexicain','sandwich','street food','chorizo de boeuf','guajillo','avocat'],
    'manual',
    'https://myriadrecipes.com/mexican-pambazo-sandwich/',
    'https://myriadrecipes.com/wp-content/uploads/2022/06/IMG_8366.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pain rond',                  1,   'unité',      true,  1,  'ouvert en deux'),
    (v_recipe_id, 'laitue',                     30,  'g',          true,  2,  'ciselée'),
    (v_recipe_id, 'avocat',                     0.5, 'unité',      true,  3,  'en tranches'),
    (v_recipe_id, 'chorizo de boeuf',            60,  'g',          true,  4,  'grossièrement tranché'),
    (v_recipe_id, 'pommes de terre',            2,   'unité',      true,  5,  'moyennes, cuites, en cubes'),
    (v_recipe_id, 'oignon rouge',               0.5, 'unité',      true,  6,  'émincé, pour la farce'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'cumin moulu',                1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'origan séché',               1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'piments guajillo séchés',    3,   'unité',      true,  11, 'pour la sauce'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  12, 'pour la sauce'),
    (v_recipe_id, 'oignon rouge',               0.5, 'unité',      true,  13, 'pour la sauce'),
    (v_recipe_id, 'cheddar',                    40,  'g',          true,  14, 'râpé, ou mélange de fromages mexicains'),
    (v_recipe_id, 'crème fraîche',              1,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'eau',                        200, 'ml',         true,  16, 'bouillante, pour réhydrater les piments');

  -- =====================================================================
  -- 9. Fried Momos (Vegan)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Fried Momos (Vegan)',
    'Momos végans frits farcis de légumes (chou, carottes, champignons), plissés à la main et servis avec un chutney tomate-piment rouge.',
    $instr$["Faire revenir l'ail et le gingembre dans l'huile végétale. Ajouter les blancs d'oignon nouveau.",
"Ajouter le chou, les carottes et les champignons finement hachés. Faire sauter 2 à 3 minutes.",
"Assaisonner de sauce soja, de sel et de poivre. Cuire encore 2 à 3 minutes.",
"Laisser refroidir complètement la farce, puis incorporer les verts d'oignon nouveau.",
"Garnir chaque feuille à raviolis de 2 à 3 c. à café de farce, puis plisser les bords dans le sens des aiguilles d'une montre pour fermer.",
"Chauffer l'huile de friture à feu moyen pendant 4 minutes. Frire les momos 2 à 5 minutes jusqu'à ce qu'ils soient dorés. Égoutter sur du papier absorbant.",
"Chutney : blanchir les piments rouges et les tomates 8 minutes. Peler les tomates et mixer le tout avec l'ail, l'huile, la sauce soja, le sucre, le sel et le poivre jusqu'à obtenir une sauce lisse."]
$instr$,
    20, 45, 2, 3,
    'Indienne', 'snack',
    ARRAY['végan','dumplings','indien','momos','chutney','asiatique'],
    'manual',
    'https://myriadrecipes.com/fried-momos/',
    'https://myriadrecipes.com/wp-content/uploads/2022/10/IMG_4148.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'feuilles à raviolis',        20,  'unité',      true,  1,  NULL),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  2,  'pour la farce'),
    (v_recipe_id, 'oignons nouveaux',           2,   'unité',      true,  3,  'hachés, blancs et verts séparés'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  4,  'émincé'),
    (v_recipe_id, 'gingembre',                  1,   'cm',         true,  5,  'émincé (1 c. à café)'),
    (v_recipe_id, 'chou',                       50,  'g',          true,  6,  'finement haché'),
    (v_recipe_id, 'carottes',                   50,  'g',          true,  7,  'finement hachées'),
    (v_recipe_id, 'champignons',                50,  'g',          true,  8,  'finement hachés'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à café',  true,  9,  'pour la farce'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  10, 'pour la farce'),
    (v_recipe_id, 'poivre noir moulu',          0.5, 'c. à café',  true,  11, 'pour la farce'),
    (v_recipe_id, 'piments rouges séchés',      8,   'unité',      true,  12, 'pour le chutney'),
    (v_recipe_id, 'ail',                        5,   'gousse',     true,  13, 'pour le chutney'),
    (v_recipe_id, 'huile végétale',             3,   'c. à café',  true,  14, 'pour le chutney'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à café',  true,  15, 'pour le chutney'),
    (v_recipe_id, 'tomates',                    3,   'unité',      true,  16, 'pour le chutney'),
    (v_recipe_id, 'sucre',                      3,   'c. à café',  true,  17, 'pour le chutney'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  18, 'pour le chutney'),
    (v_recipe_id, 'poivre noir moulu',          1,   'pincée',     true,  19, 'pour le chutney'),
    (v_recipe_id, 'huile de friture',           400, 'ml',         true,  20, NULL);

  -- =====================================================================
  -- 10. The Mitraillette
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'The Mitraillette',
    'Sandwich belge emblématique : baguette garnie d''un steak haché épicé, de salade, de frites maison et de sauce andalouse au poivron rôti.',
    $instr$["Préchauffer le four à 200 °C (180 °C chaleur tournante) ou préparer l'air fryer. Enrober les pommes de terre coupées en quartiers de graisse de bœuf fondue (ou d'huile), de sel et de poivre. Cuire 40 minutes au four ou 15 minutes à l'air fryer à 180 °C.",
"Mélanger le bœuf haché avec les flocons de piment, le paprika, une pincée de sel et de poivre. Former un steak rectangulaire de la longueur de la baguette et le faire dorer à la poêle 3 minutes par face à feu moyen.",
"Sauce andalouse : faire rôtir le demi-poivron rouge à feu vif pendant 10 minutes, puis le mixer avec la mayonnaise et le ketchup.",
"Ouvrir la baguette dans la longueur sans la couper entièrement. Garnir de sauce andalouse, de salade, du steak haché, des frites, puis d'encore un peu de sauce. Servir immédiatement."]
$instr$,
    20, 40, 1, 2,
    'Européenne', 'dinner',
    ARRAY['belge','sandwich','street food','bœuf','frites','comfort food'],
    'manual',
    'https://myriadrecipes.com/the-mitraillette/',
    'https://myriadrecipes.com/wp-content/uploads/2022/04/IMG_3947-768x1024.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'baguette',                   1,   'unité',      true,  1,  'petite'),
    (v_recipe_id, 'pommes de terre',            3,   'unité',      true,  2,  'épluchées, en quartiers'),
    (v_recipe_id, 'graisse de bœuf',            1,   'c. à soupe', true,  3,  'fondue, ou huile végétale'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'poivre noir moulu',          0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'laitue',                     3,   'feuille',    true,  6,  NULL),
    (v_recipe_id, 'bœuf haché',                 100, 'g',          true,  7,  NULL),
    (v_recipe_id, 'flocons de piment',          0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'mayonnaise',                 1,   'c. à soupe', true,  10, 'pour la sauce andalouse'),
    (v_recipe_id, 'ketchup',                    0.5, 'c. à soupe', true,  11, 'pour la sauce andalouse'),
    (v_recipe_id, 'poivron rouge',              0.5, 'unité',      true,  12, 'pour la sauce andalouse');

  -- =====================================================================
  -- 11. Butter Chicken Crispy Rolls
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Butter Chicken Crispy Rolls',
    'Mini-rouleaux croustillants en pâte filo, fourrés de poulet effiloché façon butter chicken au yaourt et aux épices indiennes, cuits à l''air fryer.',
    $instr$["Dans un saladier, mélanger tous les ingrédients de la farce sauf le poulet : yaourt, poudre de curry, paprika, cumin, ail granulé, sel, poivre, sucre, jus de citron, oignon rouge et concentré de tomates.",
"Incorporer le poulet effiloché et bien mélanger. Goûter et rectifier l'assaisonnement.",
"Badigeonner légèrement une feuille de pâte filo de beurre fondu (ou d'huile). La couper en 3 bandes dans la largeur.",
"Déposer une généreuse cuillerée de farce à la base d'une bande. Replier les côtés et rouler comme un rouleau de printemps. Répéter pour obtenir 9 rouleaux.",
"Placer les rouleaux dans l'air fryer, les badigeonner de beurre fondu et parsemer de graines de sésame noir. Cuire à 160 °C pendant 15 minutes.",
"Servir chaud avec le chutney à la mangue."]
$instr$,
    15, 15, 3, 2,
    'Indienne', 'snack',
    ARRAY['indien','butter chicken','rouleaux','air fryer','snack','filo'],
    'manual',
    'https://myriadrecipes.com/butter-chicken-crispy-rolls/',
    'https://myriadrecipes.com/wp-content/uploads/2023/02/IMG_9833.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pâte filo',                  3,   'feuille',    true,  1,  'coupées en 3 bandes'),
    (v_recipe_id, 'beurre',                     30,  'g',          true,  2,  'fondu, ou huile, pour badigeonner'),
    (v_recipe_id, 'graines de sésame noir',     1,   'c. à café',  false, 3,  'garniture'),
    (v_recipe_id, 'chutney à la mangue',        2,   'c. à soupe', false, 4,  'pour servir'),
    (v_recipe_id, 'blancs de poulet',           2,   'unité',      true,  5,  'cuits, effilochés'),
    (v_recipe_id, 'yaourt nature',              5,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'poudre de curry',            0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'cumin moulu',                0.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'ail granulé',                0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  11, NULL),
    (v_recipe_id, 'poivre noir moulu',          1,   'pincée',     true,  12, NULL),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'citron',                     0.25, 'unité',      true,  14, 'jus'),
    (v_recipe_id, 'oignon rouge',               0.5, 'unité',      true,  15, 'finement haché'),
    (v_recipe_id, 'concentré de tomates',       1,   'c. à café',  true,  16, NULL);

  -- =====================================================================
  -- 12. Creamy Silken Tofu Pasta
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Creamy Silken Tofu Pasta',
    'Pâtes one-pot nappées d''une sauce crémeuse au tofu soyeux mixé, à l''ail, au parmesan et au paprika. Une alternative riche en protéines à la sauce Alfredo, garnie de poulet poêlé.',
    $instr$["Mixer le tofu soyeux jusqu'à obtenir une crème lisse.",
"Chauffer l'huile d'olive dans une grande poêle. Ajouter l'ail et le faire revenir jusqu'à ce qu'il embaume.",
"Verser le tofu mixé, le bouillon, le parmesan, le paprika, le sel et le poivre. Porter à ébullition puis baisser le feu pour maintenir un léger frémissement.",
"Ajouter les pâtes dans la poêle et couvrir. Remuer toutes les 2 minutes pendant 10 à 15 minutes, jusqu'à cuisson al dente.",
"Pendant ce temps, poêler les blancs de poulet dans un filet d'huile d'olive 5 minutes par face jusqu'à cuisson complète.",
"Incorporer le persil haché à la sauce. Répartir les pâtes dans les bols et garnir de poulet tranché, de persil et de parmesan."]
$instr$,
    5, 15, 4, 2,
    'Italienne', 'dinner',
    ARRAY['italien','pâtes','tofu','protéiné','one-pot','crémeux','façon alfredo'],
    'manual',
    'https://myriadrecipes.com/silken-tofu-pasta-sauce/',
    'https://myriadrecipes.com/wp-content/uploads/2026/04/silken-tofu-pasta-12.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'tofu soyeux',                600, 'g',          true,  1,  NULL),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  2,  'pour la sauce'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  3,  'finement haché'),
    (v_recipe_id, 'bouillon de poulet',         600, 'ml',         true,  4,  'ou bouillon de légumes'),
    (v_recipe_id, 'parmesan râpé',              50,  'g',          true,  5,  '+ un peu pour servir'),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  7,  'au goût'),
    (v_recipe_id, 'poivre noir moulu',          1,   'pincée',     true,  8,  'au goût'),
    (v_recipe_id, 'pâtes',                      300, 'g',          true,  9,  NULL),
    (v_recipe_id, 'persil frais',               15,  'g',          true,  10, 'finement haché'),
    (v_recipe_id, 'blancs de poulet',           4,   'unité',      true,  11, NULL),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  12, 'pour le poulet');

  -- =====================================================================
  -- 13. Mapo Tofu Udon
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Mapo Tofu Udon',
    'Nouilles udon virales de TikTok : tofu soyeux mixé d''un côté et bœuf haché épicé façon Sichuan de l''autre, parsemés d''oignons nouveaux et de sésame.',
    $instr$["Chauffer l'huile dans une poêle. Faire revenir l'ail et l'oignon nouveau émincés 1 minute jusqu'à ce qu'ils embaument.",
"Ajouter le doubanjiang (ou de la sriracha ou du gochujang) et faire revenir 30 secondes. Ajouter le bœuf haché et faire sauter 5 minutes.",
"Incorporer le bouillon de poulet, le vinaigre de cidre, le vinaigre noir, le chili en poudre et le poivre du Sichuan moulu. Cuire encore 5 minutes jusqu'à ce que le bœuf soit bien doré.",
"Mixer le tofu soyeux au mixeur plongeant, au robot ou au blender jusqu'à obtenir une texture parfaitement crémeuse.",
"Cuire les nouilles udon selon les indications du paquet, puis les égoutter.",
"Répartir les nouilles dans 2 bols. Déposer le bœuf épicé d'un côté et la crème de tofu de l'autre.",
"Garnir d'oignons nouveaux émincés et de graines de sésame. Bien mélanger avant de déguster."]
$instr$,
    5, 15, 2, 2,
    'Chinoise', 'dinner',
    ARRAY['chinois','sichuan','udon','tofu','tiktok viral','épicé','crémeux'],
    'manual',
    'https://myriadrecipes.com/mapo-tofu-udon/',
    'https://myriadrecipes.com/wp-content/uploads/2026/03/mapo-tofu-udon-13.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile végétale',             0.5, 'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  2,  'émincé'),
    (v_recipe_id, 'oignon nouveau',             1,   'unité',      true,  3,  'émincé'),
    (v_recipe_id, 'doubanjiang',                1,   'c. à soupe', true,  4,  'ou sriracha ou gochujang'),
    (v_recipe_id, 'bœuf haché',                 250, 'g',          true,  5,  NULL),
    (v_recipe_id, 'bouillon de poulet',         1,   'c. à café',  false, 6,  'optionnel'),
    (v_recipe_id, 'vinaigre de cidre',          0.25, 'c. à café',  false, 7,  'optionnel, ou vinaigre de riz'),
    (v_recipe_id, 'vinaigre noir',              1,   'c. à café',  false, 8,  'optionnel'),
    (v_recipe_id, 'chili en poudre',            0.5, 'c. à café',  false, 9,  'doux, optionnel'),
    (v_recipe_id, 'poivre du Sichuan moulu',    0.25, 'c. à café',  true,  10, 'ou ½ c. à soupe d''huile pimentée'),
    (v_recipe_id, 'tofu soyeux',                300, 'g',          true,  11, NULL),
    (v_recipe_id, 'nouilles udon',              400, 'g',          true,  12, '2 portions, fraîches ou surgelées'),
    (v_recipe_id, 'oignons nouveaux',           2,   'unité',      false, 13, 'garniture'),
    (v_recipe_id, 'graines de sésame',          0.5, 'c. à soupe', false, 14, 'garniture');

  -- =====================================================================
  -- 14. Spicy Boursin Pasta
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Spicy Boursin Pasta',
    'Pâtes one-pot crémeuses au Boursin, aux tomates séchées et au piment : la sauce est mixée, puis les spaghettis cuisent directement dedans. Prêt en 20 minutes.',
    $instr$["Chauffer l'huile d'olive dans une grande poêle à feu moyen. Faire revenir l'oignon et l'ail jusqu'à ce qu'ils soient tendres, puis ajouter le paprika, l'origan et les flocons de piment.",
"Mixer le fromage ail et fines herbes, les tomates séchées, leur huile et le bouillon de poulet jusqu'à obtenir une crème lisse.",
"Verser ce mélange dans la poêle avec les 400 ml d'eau (ou de bouillon), le vinaigre balsamique et le sucre. Bien mélanger.",
"Ajouter les spaghettis en les immergeant. Couvrir et laisser frémir environ 10 minutes (selon le paquet) en remuant souvent. Découvrir 2 minutes pour faire épaissir.",
"Incorporer le parmesan, répartir dans les bols et garnir de parmesan et de flocons de piment supplémentaires."]
$instr$,
    5, 15, 3, 1,
    'Italienne', 'dinner',
    ARRAY['italien','pâtes','boursin','tomates séchées','one-pot','crémeux','épicé'],
    'manual',
    'https://myriadrecipes.com/spicy-boursin-pasta/',
    'https://myriadrecipes.com/wp-content/uploads/2026/03/spicy-boursin-pasta-7.jpeg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  1,  'pour la cuisson'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  2,  'émincé'),
    (v_recipe_id, 'oignon blanc',               1,   'unité',      true,  3,  'finement coupé'),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'origan séché',               1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'flocons de piment',          0.5, 'c. à café',  true,  6,  'selon le goût'),
    (v_recipe_id, 'fromage ail et fines herbes', 150, 'g',          true,  7,  'type Boursin, 1 paquet de 150 g'),
    (v_recipe_id, 'tomates séchées',            75,  'g',          false, 8,  'optionnel'),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', false, 9,  'ou huile des tomates séchées, optionnel'),
    (v_recipe_id, 'bouillon de poulet',         300, 'ml',         true,  10, 'pour la sauce mixée'),
    (v_recipe_id, 'eau',                        400, 'ml',         true,  11, 'ou bouillon'),
    (v_recipe_id, 'vinaigre balsamique',        1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'spaghettis',                 250, 'g',          true,  14, NULL),
    (v_recipe_id, 'parmesan râpé',              1,   'c. à soupe', true,  15, '+ un peu pour servir');

  -- =====================================================================
  -- 15. No Fold Blanket Dumplings
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'No Fold Blanket Dumplings',
    'Dumplings sans pliage popularisés sur TikTok : les feuilles à raviolis recouvrent les boulettes de poulet comme une couverture, puis cuisent à la vapeur dans la poêle en 20 minutes.',
    $instr$["Dans un saladier, mélanger le poulet haché, la ciboulette, l'ail, le gingembre, la sauce soja, le vinaigre de riz, l'huile de sésame, le sucre et le poivre jusqu'à obtenir une farce homogène.",
"Chauffer une poêle antiadhésive à feu doux-moyen. Façonner la farce en boulettes de 1 c. à soupe et les déposer en les espaçant de 2 à 5 cm.",
"Poser une feuille à raviolis sur chaque boulette comme une couverture en rabattant les bords. Verser 3 c. à soupe d'eau, parsemer de graines de sésame, couvrir et cuire 6 à 8 minutes à la vapeur.",
"Pendant ce temps, fouetter l'ail, le gingembre, la sauce soja, le vinaigre de riz, l'huile de sésame, le glutamate monosodique et l'huile pimentée pour la sauce.",
"Les dumplings sont prêts quand la farce est cuite, les feuilles ramollies et l'eau évaporée. Garnir de ciboulette et servir avec la sauce."]
$instr$,
    14, 6, 4, 2,
    'Chinoise', 'dinner',
    ARRAY['chinois','dumplings','tiktok viral','poulet','no-fold','rapide'],
    'manual',
    'https://myriadrecipes.com/blanket-dumplings/',
    'https://myriadrecipes.com/wp-content/uploads/2026/04/blanket-dumplings-9.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet haché',               400, 'g',          true,  1,  'ou tofu ferme pour une version végétarienne'),
    (v_recipe_id, 'ciboulette',                 15,  'g',          true,  2,  'finement émincée'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  3,  'finement râpé'),
    (v_recipe_id, 'gingembre',                  2,   'cm',         true,  4,  'finement râpé'),
    (v_recipe_id, 'sauce soja claire',          2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'vinaigre de riz',            1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'huile de sésame',            1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'poivre noir moulu',          0.25, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'feuilles à raviolis',        16,  'unité',      true,  10, NULL),
    (v_recipe_id, 'eau',                        3,   'c. à soupe', true,  11, 'pour la cuisson vapeur'),
    (v_recipe_id, 'graines de sésame',          0.5, 'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  13, 'pour la sauce'),
    (v_recipe_id, 'gingembre',                  1,   'cm',         true,  14, 'pour la sauce'),
    (v_recipe_id, 'sauce soja claire',          2,   'c. à soupe', true,  15, 'pour la sauce'),
    (v_recipe_id, 'vinaigre de riz',            1,   'c. à soupe', true,  16, 'pour la sauce'),
    (v_recipe_id, 'huile de sésame',            0.5, 'c. à soupe', true,  17, 'pour la sauce'),
    (v_recipe_id, 'glutamate monosodique',      0.25, 'c. à café',  false, 18, 'MSG, optionnel, pour la sauce'),
    (v_recipe_id, 'huile pimentée',             1,   'c. à soupe', false, 19, 'pour la sauce');

  -- =====================================================================
  -- 16. Thai Peanut Butter Noodles
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Thai Peanut Butter Noodles',
    'Nouilles ramen express en 15 minutes : sauce crémeuse cacahuète-curry rouge-sésame, surmontée de bœuf haché doré à l''ail et de coriandre fraîche.',
    $instr$["Chauffer l'huile dans une poêle à feu moyen. Ajouter le bœuf haché et l'écraser à la spatule. Le faire revenir 5 minutes, puis incorporer l'ail tranché et la sauce soja. Poursuivre 5 à 10 minutes jusqu'à ce qu'il soit bien doré.",
"Répartir dans deux bols le beurre de cacahuète, la pâte de curry rouge thaï, le sucre, la sauce soja, le vinaigre de riz et l'huile de sésame, puis mélanger jusqu'à obtenir une pâte.",
"Cuire les nouilles ramen selon les indications du paquet et les égoutter en réservant 2 c. à soupe d'eau de cuisson.",
"Ajouter 1 c. à soupe d'eau de cuisson dans chaque bol de sauce et mélanger. Répartir les nouilles dans les bols, puis déposer le bœuf et la coriandre.",
"Bien mélanger pour enrober uniformément les nouilles avant de déguster."]
$instr$,
    5, 15, 2, 1,
    'Thaïlandaise', 'dinner',
    ARRAY['thaï','nouilles','cacahuète','bœuf','ramen','15min','rapide'],
    'manual',
    'https://myriadrecipes.com/thai-peanut-butter-noodles/',
    'https://myriadrecipes.com/wp-content/uploads/2026/03/thai-peanut-butter-noodles-10.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 250, 'g',          true,  1,  NULL),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  2,  'tranché'),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  3,  'pour le bœuf'),
    (v_recipe_id, 'huile végétale',             0.5, 'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'beurre de cacahuète',        4,   'c. à café',  true,  5,  '2 c. à café par bol'),
    (v_recipe_id, 'pâte de curry rouge thaï',   2,   'c. à café',  true,  6,  '1 c. à café par bol'),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  8,  'pour la sauce'),
    (v_recipe_id, 'vinaigre de riz',            1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'huile de sésame',            1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'nouilles ramen',             250, 'g',          true,  11, '2 portions, fraîches de préférence'),
    (v_recipe_id, 'coriandre fraîche',          5,   'g',          false, 12, 'finement hachée');

  -- =====================================================================
  -- 17. Chicken Katsu Ramen
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Katsu Ramen',
    'Ramen fusion japonais-thaï : poulet pané au panko cuit à l''air fryer, servi sur un bouillon crémeux coco-cacahuète au curry rouge avec un œuf mollet et du pak choi.',
    $instr$["Aplatir les blancs de poulet entre deux feuilles de papier cuisson jusqu'à 1 cm d'épaisseur, à l'aide d'une poêle.",
"Préparer trois assiettes : farine assaisonnée de sel et de poivre, œuf battu, panko. Paner chaque blanc dans cet ordre, puis cuire à l'air fryer à 220 °C pendant 20 minutes en retournant après 15 minutes.",
"Dans une grande casserole, chauffer l'huile. Faire revenir l'ail 30 secondes, puis ajouter la pâte de curry rouge thaï, le beurre de cacahuète et la sauce soja.",
"Verser le lait de coco et le bouillon. Porter à ébullition puis réduire le feu.",
"Cuire les œufs et le pak choi ensemble 6 minutes dans de l'eau bouillante. Plonger les œufs dans de l'eau glacée et égoutter le pak choi.",
"Ajouter les nouilles udon au bouillon quelques minutes avant la fin de cuisson du poulet.",
"Sortir les blancs de poulet panés et les trancher.",
"Répartir les nouilles et le bouillon dans les bols. Garnir de poulet, de pak choi, d'un œuf coupé en deux, d'oignon nouveau, de graines de sésame et d'huile pimentée."]
$instr$,
    10, 20, 2, 3,
    'Japonaise', 'dinner',
    ARRAY['japonais','ramen','katsu','panko','air fryer','coco','curry','fusion'],
    'manual',
    'https://myriadrecipes.com/chicken-katsu-ramen/',
    'https://myriadrecipes.com/wp-content/uploads/2026/01/chicken-katsu-ramen-6.jpeg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',           2,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'panko',                      4,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'farine',                     4,   'c. à soupe', true,  3,  'pour la panure'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  4,  'pour la farine'),
    (v_recipe_id, 'poivre noir moulu',          1,   'pincée',     true,  5,  'pour la farine'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  6,  'battu, pour la panure'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  7,  'pour le bouillon'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  8,  'émincé'),
    (v_recipe_id, 'pâte de curry rouge thaï',   1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'beurre de cacahuète',        2,   'c. à soupe', true,  10, 'avec morceaux de préférence'),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  12, '1 boîte de 400 ml'),
    (v_recipe_id, 'bouillon de poulet',         600, 'ml',         true,  13, NULL),
    (v_recipe_id, 'nouilles udon',              400, 'g',          true,  14, '2 portions'),
    (v_recipe_id, 'pak choi',                   2,   'unité',      true,  15, 'coupés en 4 dans la longueur'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  16, 'mollets'),
    (v_recipe_id, 'oignons nouveaux',           2,   'unité',      false, 17, 'finement émincés'),
    (v_recipe_id, 'huile pimentée',             1,   'c. à soupe', false, 18, 'optionnel'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à soupe', false, 19, 'optionnel');

  -- =====================================================================
  -- 18. Creamy Dijon Mustard Chicken
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Creamy Dijon Mustard Chicken',
    'Plat français à la poêle : poulet mariné à la moutarde de Dijon, mijoté dans une sauce à la crème avec des échalotes fondantes et de la moutarde à l''ancienne, servi sur une purée maison.',
    $instr$["Couper les blancs de poulet en deux dans la longueur et les faire mariner avec la moutarde de Dijon, l'ail émincé, l'huile, le sel et le poivre. Laisser reposer au moins 10 minutes (ou une nuit au réfrigérateur).",
"Chauffer une poêle à feu moyen avec ½ c. à soupe d'huile. Saisir les blancs 3 minutes par face jusqu'à ce qu'ils soient dorés. Réserver.",
"Ajouter le reste de l'huile dans la poêle, puis les échalotes émincées. Les faire revenir 15 minutes jusqu'à ce qu'elles soient tendres et parfumées. Ajouter l'ail tranché et cuire 2 minutes.",
"Verser le bouillon, la moutarde de Dijon, la moutarde à l'ancienne, les herbes et la crème. Saler et poivrer. Remettre le poulet dans la sauce, porter à ébullition puis laisser frémir 10 minutes à couvert.",
"Pendant ce temps, cuire les pommes de terre coupées 10 à 15 minutes dans de l'eau salée jusqu'à ce qu'elles soient tendres. Égoutter et écraser avec le beurre et le lait jusqu'à obtenir une texture lisse. Saler et poivrer.",
"Répartir la purée dans les assiettes, déposer le poulet, napper de sauce et parsemer de ciboulette ciselée."]
$instr$,
    5, 35, 2, 2,
    'Française', 'dinner',
    ARRAY['français','poulet','dijon','crème','one-pan','purée','réconfortant'],
    'manual',
    'https://myriadrecipes.com/dijon-mustard-chicken/',
    'https://myriadrecipes.com/wp-content/uploads/2026/01/dijon-mustard-chicken-4.jpeg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',           2,   'unité',      true,  1,  'coupés en deux dans la longueur'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  2,  'émincé, pour la marinade'),
    (v_recipe_id, 'moutarde de Dijon',          1,   'c. à café',  true,  3,  'pour la marinade'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  4,  'pour la marinade'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  5,  'pour la cuisson'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  6,  'marinade, sauce et purée'),
    (v_recipe_id, 'poivre noir moulu',          0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'échalotes',                  3,   'unité',      true,  8,  'finement émincées'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  9,  'finement tranché'),
    (v_recipe_id, 'bouillon de poulet',         300, 'ml',         true,  10, NULL),
    (v_recipe_id, 'moutarde de Dijon',          1,   'c. à soupe', true,  11, 'bombée'),
    (v_recipe_id, 'moutarde à l''ancienne',     1,   'c. à soupe', true,  12, 'bombée'),
    (v_recipe_id, 'herbes de Provence',         1,   'c. à café',  true,  13, 'ou thym séché'),
    (v_recipe_id, 'crème liquide',              300, 'ml',         true,  14, 'légère ou entière'),
    (v_recipe_id, 'pommes de terre',            400, 'g',          true,  15, 'pour la purée'),
    (v_recipe_id, 'beurre',                     20,  'g',          true,  16, 'salé, pour la purée'),
    (v_recipe_id, 'lait',                       100, 'ml',         true,  17, 'pour la purée'),
    (v_recipe_id, 'ciboulette',                 10,  'g',          false, 18, 'ciselée, garniture');

  -- =====================================================================
  -- 19. Korean-Style Chicken Stew
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Korean-Style Chicken Stew',
    'Ragoût coréen épicé au gochujang et au kimchi avec poulet, aubergine et champignons, servi sur une purée de pommes de terre soyeuse.',
    $instr$["Chauffer l'huile végétale dans une cocotte. Faire revenir l'oignon, l'ail et le gingembre 2 minutes jusqu'à ce qu'ils embaument.",
"Ajouter l'aubergine et les champignons. Cuire 5 à 10 minutes à feu moyen-doux en remuant souvent.",
"Incorporer le kimchi, le gochujang, le sucre, la sauce soja, le vinaigre de riz, le gochugaru, l'huile de sésame et le bouillon de poulet. Porter à ébullition puis laisser mijoter 10 minutes. Saupoudrer de farine et mélanger pour épaissir.",
"Goûter et rectifier avec du sel, du poivre ou du sucre. Ajouter le poulet émincé et laisser mijoter 15 minutes.",
"Pendant ce temps, cuire les pommes de terre coupées dans de l'eau bouillante jusqu'à ce qu'elles soient tendres. Égoutter et réduire en purée lisse avec le beurre et le lait. Assaisonner.",
"Répartir la purée dans les bols, recouvrir de ragoût, puis garnir de ciboulette et, si désiré, d'huile pimentée."]
$instr$,
    5, 40, 2, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','ragoût','gochujang','kimchi','poulet','réconfortant','hiver'],
    'manual',
    'https://myriadrecipes.com/korean-style-chicken-stew/',
    'https://myriadrecipes.com/wp-content/uploads/2025/12/korean-chicken-stew-8.jpeg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  1,  'émincé'),
    (v_recipe_id, 'gingembre',                  2,   'cm',         true,  2,  'émincé'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  3,  'finement coupé'),
    (v_recipe_id, 'aubergine',                  1,   'unité',      true,  4,  'en cubes'),
    (v_recipe_id, 'champignons de Paris',       150, 'g',          true,  5,  NULL),
    (v_recipe_id, 'kimchi',                     150, 'g',          true,  6,  NULL),
    (v_recipe_id, 'gochujang',                  2,   'c. à soupe', true,  7,  '2 à 3 c. à soupe selon le piquant souhaité'),
    (v_recipe_id, 'sucre',                      1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'sauce soja claire',          3,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'vinaigre de riz',            2,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'gochugaru',                  2,   'c. à soupe', true,  11, 'flocons de piment coréen'),
    (v_recipe_id, 'bouillon de poulet',         300, 'ml',         true,  12, NULL),
    (v_recipe_id, 'blancs de poulet',           2,   'unité',      true,  13, 'finement émincés'),
    (v_recipe_id, 'farine',                     1,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'huile de sésame',            1,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  17, 'au goût'),
    (v_recipe_id, 'poivre noir moulu',          1,   'pincée',     true,  18, 'au goût'),
    (v_recipe_id, 'pommes de terre',            400, 'g',          true,  19, 'grosses, pour la purée'),
    (v_recipe_id, 'beurre',                     25,  'g',          true,  20, 'salé, pour la purée'),
    (v_recipe_id, 'lait',                       150, 'ml',         true,  21, 'pour la purée'),
    (v_recipe_id, 'ciboulette',                 10,  'g',          false, 22, 'garniture'),
    (v_recipe_id, 'huile pimentée',             1,   'c. à soupe', false, 23, 'optionnel, pour servir');

  -- =====================================================================
  -- 20. Loco Moco
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Loco Moco',
    'Plat hawaïen réconfortant : riz jasmin, steak haché maison, sauce brune aux champignons et aux oignons, et œuf au plat parsemé de ciboulette.',
    $instr$["Mélanger le bœuf haché, la chapelure, l'œuf, la sauce Worcestershire, l'oignon haché, une pincée de sel et un tour de moulin à poivre. Former 6 steaks d'environ 85 g.",
"Chauffer un filet d'huile dans une poêle à feu moyen. Cuire les steaks 4 minutes par face jusqu'à ce qu'ils soient dorés et cuits à cœur. Réserver.",
"Cuire le riz jasmin selon les indications du paquet.",
"Dans la même poêle, faire revenir les oignons, les shiitake et l'ail 5 minutes. Ajouter le beurre puis la farine et bien mélanger. Verser le bouillon de bœuf, la sauce soja, le ketchup et la sauce Worcestershire. Laisser frémir 5 à 10 minutes jusqu'à épaississement. Rectifier l'assaisonnement.",
"Cuire les œufs au plat dans une poêle huilée à feu moyen 3 à 5 minutes, jusqu'à ce que les blancs soient pris.",
"Répartir le riz dans les assiettes, déposer un steak, napper de sauce, ajouter un œuf au plat et parsemer de ciboulette."]
$instr$,
    10, 20, 6, 2,
    'Américaine', 'dinner',
    ARRAY['hawaïen','américain','bœuf','riz','œuf','sauce brune','réconfortant'],
    'manual',
    'https://myriadrecipes.com/loco-moco/',
    'https://myriadrecipes.com/wp-content/uploads/2025/01/loco-moco-recipe-7-800x1200.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz jasmin',                 450, 'g',          true,  1,  NULL),
    (v_recipe_id, 'œufs',                       6,   'unité',      true,  2,  'au plat'),
    (v_recipe_id, 'ciboulette',                 10,  'g',          false, 3,  'finement hachée'),
    (v_recipe_id, 'bœuf haché',                 500, 'g',          true,  4,  'pour les steaks'),
    (v_recipe_id, 'chapelure',                  30,  'g',          true,  5,  NULL),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  6,  'finement coupé, pour les steaks'),
    (v_recipe_id, 'sauce Worcestershire',       1,   'c. à soupe', true,  7,  'pour les steaks'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  8,  'pour lier les steaks'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  9,  'pour les steaks'),
    (v_recipe_id, 'poivre noir moulu',          1,   'pincée',     true,  10, 'pour les steaks'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  11, 'pour les steaks et les œufs'),
    (v_recipe_id, 'champignons shiitake',       100, 'g',          true,  12, 'finement émincés'),
    (v_recipe_id, 'oignons',                    2,   'unité',      true,  13, 'finement émincés, pour la sauce'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  14, 'émincé'),
    (v_recipe_id, 'beurre',                     40,  'g',          true,  15, NULL),
    (v_recipe_id, 'farine',                     4,   'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'bouillon de bœuf',           1,   'l',          true,  17, NULL),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  18, NULL),
    (v_recipe_id, 'ketchup',                    2,   'c. à soupe', true,  19, NULL),
    (v_recipe_id, 'sauce Worcestershire',       0.5, 'c. à soupe', true,  20, 'pour la sauce');

  -- =====================================================================
  -- 21. Spicy Peanut Butter Ragu
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Spicy Peanut Butter Ragu',
    'Ragù fusion italo-indonésien : bœuf haché mijoté dans une sauce coco-cacahuète au curry rouge, servi sur du riz jasmin avec un œuf mollet et des oignons nouveaux.',
    $instr$["Chauffer l'huile d'olive dans une cocotte. Faire revenir l'oignon, l'ail et le gingembre 2 à 3 minutes jusqu'à ce qu'ils embaument.",
"Ajouter le bœuf haché, l'écraser à la spatule et le faire dorer 5 à 10 minutes.",
"Incorporer la pâte de curry rouge thaï, le beurre de cacahuète, la sauce soja et le vinaigre de riz. Faire revenir 1 minute.",
"Verser le lait de coco et le bouillon de bœuf. Assaisonner de sel, de poivre et de sucre.",
"Porter à ébullition puis laisser mijoter 15 minutes jusqu'à épaississement, en remuant de temps en temps.",
"Pendant ce temps, cuire le riz et préparer les œufs mollets (6 min 30 dans l'eau bouillante).",
"Répartir le riz et la sauce dans les bols. Ajouter un œuf coupé en deux, des oignons nouveaux, des graines de sésame et de l'huile pimentée."]
$instr$,
    5, 25, 4, 2,
    'Indonésienne', 'dinner',
    ARRAY['fusion','indonésien','italien','thaï','bœuf','cacahuète','riz','sauce'],
    'manual',
    'https://myriadrecipes.com/peanut-butter-ragu/',
    'https://myriadrecipes.com/wp-content/uploads/2025/10/spicy-peanut-butter-ragu-7.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'oignon blanc',               1,   'unité',      true,  2,  'finement coupé'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  3,  'émincé'),
    (v_recipe_id, 'gingembre',                  2,   'cm',         true,  4,  'émincé'),
    (v_recipe_id, 'bœuf haché',                 400, 'g',          true,  5,  '20 % de matière grasse'),
    (v_recipe_id, 'pâte de curry rouge thaï',   1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'beurre de cacahuète',        3,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'vinaigre de riz',            0.5, 'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  10, '1 boîte de 400 ml'),
    (v_recipe_id, 'bouillon de bœuf',           400, 'ml',         true,  11, NULL),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  12, 'au goût'),
    (v_recipe_id, 'poivre noir moulu',          1,   'pincée',     true,  13, 'au goût'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'riz jasmin',                 300, 'g',          true,  15, 'cuit, 4 portions'),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  16, 'mollets'),
    (v_recipe_id, 'oignons nouveaux',           4,   'unité',      false, 17, 'finement émincés, garniture'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à café',  false, 18, 'garniture'),
    (v_recipe_id, 'huile pimentée',             1,   'c. à soupe', false, 19, 'garniture');

  -- =====================================================================
  -- 22. One Pot Spicy Gochujang Lasagne
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'One Pot Spicy Gochujang Lasagne',
    'Lasagne fusion italo-coréenne en one-pot : feuilles de lasagne, poireau, chou et aubergine dans une sauce gochujang sucrée-piquante, gratinées à la mozzarella.',
    $instr$["Chauffer l'huile dans une grande poêle profonde. Faire revenir l'ail, le poireau, le chou et l'aubergine 10 à 15 minutes jusqu'à ce qu'ils soient tendres.",
"Dans un bol, mélanger le gochujang, le gochugaru, le ketchup, le miel et la sauce soja.",
"Ajouter la sauce aux légumes et faire revenir 2 minutes.",
"Verser le bouillon de légumes et les feuilles de lasagne cassées. Couvrir et laisser frémir 5 minutes. Découvrir et remuer jusqu'à ce que les pâtes soient tendres.",
"Parsemer de mozzarella râpée et mélanger jusqu'à ce qu'elle fonde.",
"Garnir d'oignons nouveaux et de graines de sésame. Servir."]
$instr$,
    5, 25, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['fusion','coréen','italien','lasagne','gochujang','one-pot','végétarien'],
    'manual',
    'https://myriadrecipes.com/one-pot-spicy-gochujang-lasagne/',
    'https://myriadrecipes.com/wp-content/uploads/2025/09/one-pot-spicy-gochujang-lasagne-9.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  1,  'émincé'),
    (v_recipe_id, 'poireau',                    1,   'unité',      true,  2,  'lavé, finement émincé'),
    (v_recipe_id, 'chou blanc',                 200, 'g',          true,  3,  'finement émincé'),
    (v_recipe_id, 'aubergine',                  1,   'unité',      true,  4,  'en fines lamelles'),
    (v_recipe_id, 'gochujang',                  4,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'gochugaru',                  2,   'c. à soupe', true,  6,  'flocons de piment coréen'),
    (v_recipe_id, 'ketchup',                    2,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'miel',                       2,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'sauce soja claire',          3,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'bouillon de légumes',        600, 'ml',         true,  10, NULL),
    (v_recipe_id, 'mozzarella',                 100, 'g',          true,  11, 'râpée'),
    (v_recipe_id, 'feuilles de lasagne',        200, 'g',          true,  12, 'cassées'),
    (v_recipe_id, 'oignons nouveaux',           2,   'unité',      false, 13, 'garniture'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à soupe', false, 14, 'garniture'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  15, NULL);

  -- =====================================================================
  -- 23. Kimchijeon Traybake
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Kimchijeon Traybake',
    'Pancake coréen au kimchi version four : pâte au kimchi et aux oignons nouveaux étalée dans un moule huilé brûlant, croustillante sur les bords et tendre au centre. Servi avec une sauce soja-vinaigre.',
    $instr$["Préchauffer le four à 210 °C chaleur tournante (230 °C en statique). Mélanger la farine, le kimchi, les oignons nouveaux, l'eau et le sucre pour obtenir une pâte épaisse.",
"Verser 2 c. à soupe d'huile végétale dans un moule rond de 20 cm et le chauffer 5 minutes au four.",
"Transférer délicatement la pâte dans le moule chaud, l'étaler uniformément et cuire 20 minutes.",
"Pendant la cuisson, fouetter tous les ingrédients de la sauce.",
"Sortir du four quand les bords sont croustillants et le centre moelleux. Couper en 6 parts et servir avec la sauce."]
$instr$,
    5, 20, 1, 1,
    'Coréenne', 'dinner',
    ARRAY['coréen','pancake','kimchi','four','traybake','rapide','végétarien'],
    'manual',
    'https://myriadrecipes.com/kimchijeon-traybake/',
    'https://myriadrecipes.com/wp-content/uploads/2025/06/kimchijeon-traybake-6-800x1200.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'farine',                    100, 'g',          true,  1,  NULL),
    (v_recipe_id, 'kimchi',                    200, 'g',          true,  2,  NULL),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      true,  3,  'finement émincés'),
    (v_recipe_id, 'sucre',                     0.5, 'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'eau',                       75,  'ml',         true,  5,  NULL),
    (v_recipe_id, 'huile végétale',            2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'sauce soja claire',         1,   'c. à soupe', true,  7,  'pour la sauce'),
    (v_recipe_id, 'vinaigre de riz',           0.5, 'c. à soupe', true,  8,  'pour la sauce'),
    (v_recipe_id, 'huile de sésame',           0.5, 'c. à soupe', true,  9,  'pour la sauce'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  10, 'pour la sauce'),
    (v_recipe_id, 'eau',                       2,   'c. à soupe', true,  11, 'pour la sauce');

  -- =====================================================================
  -- 24. Bulgogi Fried Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bulgogi Fried Rice',
    'Riz frit coréen au bulgogi : filet de bœuf mariné à la pomme, au soja et au gingembre, sauté avec du riz jasmin, du kimchi et du gochujang, puis garni d''un œuf au plat et de nori.',
    $instr$["Trancher le filet de bœuf en fines lamelles, perpendiculairement aux fibres.",
"Mélanger tous les ingrédients de la marinade dans un bol jusqu'à ce que le sucre soit dissous.",
"Ajouter le bœuf dans la marinade, bien l'enrober et réfrigérer de 15 minutes à 1 jour.",
"Préparer la sauce du riz frit en mélangeant l'ail, le gochujang, le kimchi, les flocons de piment, la sauce soja, l'huile de sésame, le poivre et le sucre.",
"Chauffer une poêle antiadhésive à feu moyen avec un filet d'huile de tournesol.",
"Ajouter le bœuf égoutté de sa marinade et le faire revenir 5 minutes jusqu'à ce qu'il soit doré.",
"Retirer le bœuf et le réserver.",
"Dans la même poêle, ajouter le reste de l'huile et le riz jasmin froid.",
"Verser la sauce préparée, ajouter la carotte, le kimchi et le bœuf cuit. Bien mélanger.",
"Cuire les œufs au plat dans une autre poêle.",
"Servir le riz frit surmonté d'un œuf au plat, de nori émietté et d'oignons nouveaux."]
$instr$,
    15, 15, 2, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','bulgogi','riz frit','bœuf','kimchi','gochujang','œuf'],
    'manual',
    'https://myriadrecipes.com/bulgogi-fried-rice/',
    'https://myriadrecipes.com/wp-content/uploads/2023/11/Bulgogi-Fried-Rice-1-scaled.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'sauce soja claire',          6,   'c. à soupe', true,  1,  'pour la marinade'),
    (v_recipe_id, 'cassonade',                  3,   'c. à soupe', true,  2,  'pour la marinade'),
    (v_recipe_id, 'vinaigre de riz',            2,   'c. à soupe', true,  3,  'pour la marinade'),
    (v_recipe_id, 'pomme',                      1,   'unité',      true,  4,  'râpée, pour la marinade'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  5,  'émincé, pour la marinade'),
    (v_recipe_id, 'gingembre frais',            1,   'c. à café',  true,  6,  'émincé, pour la marinade'),
    (v_recipe_id, 'poivre noir moulu',          0.5, 'c. à café',  true,  7,  'pour la marinade'),
    (v_recipe_id, 'filet de bœuf',              250, 'g',          true,  8,  'finement tranché'),
    (v_recipe_id, 'huile de tournesol',         1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  10, 'émincé, pour la sauce du riz'),
    (v_recipe_id, 'gochujang',                  2,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'kimchi',                     2,   'c. à soupe', true,  12, '2 à 3 c. à soupe'),
    (v_recipe_id, 'carotte',                    1,   'unité',      true,  13, 'en fine julienne'),
    (v_recipe_id, 'flocons de piment',          1,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'sauce soja claire',          3,   'c. à soupe', true,  15, 'pour la sauce du riz'),
    (v_recipe_id, 'huile de sésame',            2,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'poivre noir moulu',          1,   'c. à café',  true,  17, 'pour la sauce du riz'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  18, NULL),
    (v_recipe_id, 'riz jasmin',                 100, 'g',          true,  19, 'cuit et refroidi (≈ 250 g de riz cuit)'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  20, 'au plat'),
    (v_recipe_id, 'feuilles de nori',           2,   'unité',      false, 21, 'émiettées'),
    (v_recipe_id, 'oignons nouveaux',           2,   'unité',      false, 22, 'finement coupés');

  -- =====================================================================
  -- 25. Korean Rice Balls (Jumeokbap)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Korean Rice Balls (Jumeokbap)',
    'Boulettes de riz coréennes au thon-mayonnaise et au kimchi, parfumées au sésame et enrobées de togarashi et de graines de sésame noir. Idéales en en-cas ou dans une boîte à bento.',
    $instr$["Cuire le riz à sushi si nécessaire (1 volume de riz pour 1 volume d'eau : porter à ébullition à feu vif, puis cuire 10 minutes à couvert à feu doux). Laisser refroidir complètement.",
"Dans un grand saladier, mélanger le riz refroidi avec l'huile de sésame, le sucre et le sel. Goûter et rectifier.",
"Égoutter le thon et le mélanger dans un autre bol avec le kimchi, la mayonnaise, le poivre noir et l'ail granulé.",
"Déposer 1 c. à soupe de riz dans la paume, l'aplatir, ajouter une cuillerée de farce au centre, recouvrir d'un peu de riz et former une boule. Répéter pour obtenir 7 à 9 boules.",
"Mélanger le togarashi et les graines de sésame noir, puis rouler chaque boule dans ce mélange.",
"Dresser les boules, arroser de mayonnaise et, si désiré, de sauce tonkatsu, parsemer d'oignon nouveau et servir."]
$instr$,
    20, 10, 3, 2,
    'Coréenne', 'snack',
    ARRAY['coréen','jumeokbap','riz','thon','kimchi','snack','bento','nomade'],
    'manual',
    'https://myriadrecipes.com/korean-rice-balls-jumeokbap/',
    'https://myriadrecipes.com/wp-content/uploads/2023/01/IMG_8082.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz à sushi',                80,  'g',          true,  1,  'cuit et refroidi (≈ 200 g de riz cuit)'),
    (v_recipe_id, 'eau',                        80,  'ml',         true,  2,  'pour la cuisson du riz'),
    (v_recipe_id, 'huile de sésame',            1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'sucre',                      2,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'thon en boîte',              160, 'g',          true,  6,  'égoutté'),
    (v_recipe_id, 'kimchi',                     2,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'mayonnaise',                 1,   'c. à soupe', true,  8,  'pour la farce'),
    (v_recipe_id, 'poivre noir moulu',          1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'ail granulé',                0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'togarashi',                  2,   'c. à soupe', true,  11, 'mélange d''épices japonais'),
    (v_recipe_id, 'graines de sésame noir',     1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'mayonnaise',                 1,   'c. à soupe', false, 13, 'pour décorer'),
    (v_recipe_id, 'oignon nouveau',             1,   'unité',      false, 14, 'finement coupé'),
    (v_recipe_id, 'sauce tonkatsu',             1,   'c. à soupe', false, 15, 'optionnel');

  -- =====================================================================
  -- 26. Okonomiyaki Traybake
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Okonomiyaki Traybake',
    'Galette japonaise salée version four : pâte au chou, au fromage et aux œufs recouverte de tranches de beef bacon, nappée de sauce okonomiyaki, de mayonnaise et de sésame.',
    $instr$["Préchauffer le four à 210 °C chaleur tournante. Fouetter ensemble la farine, la levure, le sucre et le sel. Ajouter les œufs et le bouillon de poulet, puis fouetter jusqu'à obtenir une pâte épaisse.",
"Incorporer le chou, l'oignon, l'ail et le fromage râpé à la spatule pour obtenir un mélange grossier.",
"Verser l'huile de sésame dans un plat allant au four et le chauffer 3 minutes au four. Étaler la pâte uniformément, la recouvrir des tranches de beef bacon et cuire 20 minutes.",
"Sortir du four une fois le beef bacon croustillant. Étaler la sauce okonomiyaki sur le dessus, tracer des zigzags de mayonnaise et parsemer d'oignons nouveaux et de graines de sésame. Servir immédiatement."]
$instr$,
    10, 20, 6, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','okonomiyaki','traybake','chou','beef bacon','four','convivial'],
    'manual',
    'https://myriadrecipes.com/okonomiyaki-traybake/',
    'https://myriadrecipes.com/wp-content/uploads/2025/03/okonomiyaki-traybake-8-800x1200.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'farine',                     220, 'g',          true,  1,  NULL),
    (v_recipe_id, 'levure chimique',            0.25, 'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'sucre',                      0.25, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'sel',                        0.25, 'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  5,  'moyens'),
    (v_recipe_id, 'bouillon de poulet',         100, 'ml',         true,  6,  NULL),
    (v_recipe_id, 'chou',                       400, 'g',          true,  7,  'haché (environ ½ chou)'),
    (v_recipe_id, 'oignon rouge',               0.5, 'unité',      true,  8,  'finement émincé'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  9,  'émincé'),
    (v_recipe_id, 'fromage râpé',               100, 'g',          true,  10, 'mozzarella et/ou cheddar'),
    (v_recipe_id, 'beef bacon',                 8,   'tranche',    true,  11, NULL),
    (v_recipe_id, 'sauce okonomiyaki',          2,   'c. à soupe', true,  12, 'ou sauce barbecue'),
    (v_recipe_id, 'mayonnaise',                 2,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'oignons nouveaux',           2,   'unité',      false, 14, 'finement émincés'),
    (v_recipe_id, 'graines de sésame',          0.5, 'c. à soupe', false, 15, 'garniture'),
    (v_recipe_id, 'huile de sésame',            1,   'c. à soupe', true,  16, 'pour le plat');

  -- =====================================================================
  -- 27. Wagamama Pad Thai
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Wagamama Pad Thai',
    'Version maison du pad thaï de Wagamama : nouilles de riz larges, poulet, légumes croquants et œuf brouillé, enrobés d''une sauce tamarin-soja-nuoc-mâm.',
    $instr$["Chauffer l'huile dans un wok à feu moyen. Faire dorer le poulet émincé jusqu'à ce qu'il soit cuit. Réserver.",
"Cuire les nouilles de riz al dente dans l'eau bouillante selon les indications du paquet. Égoutter et réserver.",
"Dans un petit bol, mélanger tous les ingrédients de la sauce : sucre, sauce soja claire, sauce soja foncée, pâte de tamarin, vinaigre de riz, ketchup et nuoc-mâm.",
"Remettre le wok à chauffer. Faire sauter les légumes (oignon rouge, ail, piment, shiitake, mangetouts) avec le poulet pendant 2 minutes.",
"Ajouter les nouilles et la sauce. Mélanger pour bien les enrober.",
"Former un puits au centre, y casser l'œuf, le brouiller à feu vif puis l'incorporer aux nouilles.",
"Servir avec les garnitures de votre choix : cacahuètes, citron vert, coriandre."]
$instr$,
    5, 15, 2, 2,
    'Thaïlandaise', 'dinner',
    ARRAY['thaï','pad thaï','wagamama','copycat','nouilles','poulet','wok'],
    'manual',
    'https://myriadrecipes.com/wagamama-pad-thai-recipe/',
    'https://myriadrecipes.com/wp-content/uploads/2023/07/wagamama-pad-thai-recipe-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'sucre',                      2,   'c. à soupe', true,  1,  'pour la sauce'),
    (v_recipe_id, 'sauce soja claire',          2,   'c. à soupe', true,  2,  'pour la sauce'),
    (v_recipe_id, 'sauce soja foncée',          1,   'c. à soupe', true,  3,  'pour la sauce'),
    (v_recipe_id, 'pâte de tamarin',            0.5, 'c. à soupe', true,  4,  'pour la sauce'),
    (v_recipe_id, 'vinaigre de riz',            0.5, 'c. à soupe', true,  5,  'pour la sauce'),
    (v_recipe_id, 'ketchup',                    1,   'c. à soupe', true,  6,  'pour la sauce'),
    (v_recipe_id, 'nuoc-mâm',                   1,   'c. à soupe', true,  7,  'sauce de poisson, pour la sauce'),
    (v_recipe_id, 'blanc de poulet',            250, 'g',          true,  8,  'émincé'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  9,  'haché'),
    (v_recipe_id, 'piment rouge',               1,   'unité',      true,  10, 'tranché'),
    (v_recipe_id, 'oignon rouge',               1,   'unité',      true,  11, 'émincé'),
    (v_recipe_id, 'champignons shiitake',       100, 'g',          true,  12, 'tranchés'),
    (v_recipe_id, 'mangetouts',                 150, 'g',          true,  13, NULL),
    (v_recipe_id, 'nouilles de riz larges',     225, 'g',          true,  14, NULL),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  15, NULL),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'cacahuètes',                 30,  'g',          false, 17, 'concassées, pour servir'),
    (v_recipe_id, 'citron vert',                1,   'unité',      false, 18, 'en quartiers, pour servir'),
    (v_recipe_id, 'coriandre fraîche',          10,  'g',          false, 19, 'pour servir');

  -- =====================================================================
  -- 28. Vegan Sushi Bake
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Vegan Sushi Bake',
    'Sushi bake végan : riz à sushi vinaigré et tofu mariné au soja avec radis et nori, dorés au four puis garnis d''avocat, de concombre, de furikake et de mayonnaise sriracha.',
    $instr$["Cuire le riz : rincer le riz à sushi jusqu'à ce que l'eau soit claire. Ajouter l'eau et chauffer à feu moyen jusqu'à frémissement. Couvrir, baisser à feu doux et cuire 10 minutes. Retirer du feu et laisser reposer.",
"Préparer la marinade : mélanger le tofu tranché, les radis hachés, le nori émietté, la sauce soja, le vinaigre de riz, l'ail et le sucre dans un bol. Laisser mariner.",
"Assaisonner le riz : mélanger le vinaigre de riz, le sucre et le sel, puis l'incorporer délicatement au riz cuit. Rectifier si besoin.",
"Assembler : préchauffer le four à 200 °C (180 °C chaleur tournante). Étaler le riz au fond d'un plat. Garnir du tofu mariné, de la carotte en julienne et des oignons nouveaux.",
"Cuire au four 20 minutes jusqu'à ce que le dessus soit doré.",
"Sortir du four. Garnir d'avocat tranché, de concombre, de furikake, de sriracha et de mayonnaise végane. Servir avec des feuilles de nori pour former des wraps."]
$instr$,
    20, 20, 4, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','sushi','végan','tofu','riz','furikake','partage','convivial'],
    'manual',
    'https://myriadrecipes.com/vegan-sushi-bake/',
    'https://myriadrecipes.com/wp-content/uploads/2023/11/Vegan-Sushi-Bake-1-scaled.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz à sushi',                400, 'g',          true,  1,  NULL),
    (v_recipe_id, 'eau',                        500, 'ml',         true,  2,  'pour la cuisson du riz'),
    (v_recipe_id, 'vinaigre de riz',            1,   'c. à soupe', true,  3,  'pour le riz'),
    (v_recipe_id, 'sucre',                      0.5, 'c. à soupe', true,  4,  'pour le riz'),
    (v_recipe_id, 'sel en flocons',             0.25, 'c. à soupe', true,  5,  'pour le riz'),
    (v_recipe_id, 'tofu extra-ferme',           280, 'g',          true,  6,  'finement tranché'),
    (v_recipe_id, 'radis',                      10,  'unité',      true,  7,  'finement hachés'),
    (v_recipe_id, 'sauce soja claire',          3,   'c. à soupe', true,  8,  'pour la marinade'),
    (v_recipe_id, 'vinaigre de riz',            1,   'c. à soupe', true,  9,  'pour la marinade'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  10, 'émincé, pour la marinade'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  11, 'pour la marinade'),
    (v_recipe_id, 'feuilles de nori',           2,   'unité',      true,  12, 'émiettées'),
    (v_recipe_id, 'avocat',                     1,   'unité',      true,  13, 'tranché'),
    (v_recipe_id, 'concombre',                  0.5, 'unité',      true,  14, 'finement tranché'),
    (v_recipe_id, 'furikake',                   1,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'sriracha',                   2,   'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'mayonnaise végane',          2,   'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'oignons nouveaux',           2,   'unité',      true,  18, 'émincés'),
    (v_recipe_id, 'carotte',                    1,   'unité',      true,  19, 'en julienne'),
    (v_recipe_id, 'feuilles de nori',           8,   'unité',      false, 20, 'pour servir');

  RAISE NOTICE '✅ Imported 28 recipes from myriadrecipes.com';
END $$;
