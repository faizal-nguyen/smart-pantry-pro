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
    $instr$["Chauffer un filet d'huile dans une grande casserole. Saisir les blancs de poulet 5 minutes par face jusqu'à coloration dorée. Réserver.",
"Dans la même casserole, ajouter ail, pâte de curry rouge thaï, sauce soja et beurre de cacahuète. Bien mélanger puis verser lait de coco et bouillon de poulet. Porter à ébullition puis réduire le feu.",
"Remettre le poulet dans la sauce, couvrir et laisser mijoter 10 à 15 minutes. Retirer le poulet et le trancher.",
"Goûter et ajuster l'assaisonnement. Ajouter les nouilles udon et cuire selon les instructions du paquet directement dans le bouillon.",
"Répartir les nouilles dans les bols, napper de bouillon, déposer le poulet tranché, les mangetouts, la coriandre, les quartiers de citron vert et un trait d'huile pimentée."]
$instr$,
    5, 20, 2, 2,
    'Thaï', 'dinner',
    ARRAY['thaï','nouilles','cacahuète','poulet','coco','one-pan','rapide'],
    'manual',
    'https://myriadrecipes.com/peanut-butter-noodles/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',          2,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  2,  'émincées'),
    (v_recipe_id, 'pâte de curry rouge thaï',  1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'sauce soja claire',         1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'beurre de cacahuète',       2,   'c. à soupe', true,  5,  'crémeux ou crunchy'),
    (v_recipe_id, 'lait de coco',              400, 'ml',         true,  6,  NULL),
    (v_recipe_id, 'bouillon de poulet',        400, 'ml',         true,  7,  NULL),
    (v_recipe_id, 'nouilles udon',             300, 'g',          true,  8,  'ou ramen'),
    (v_recipe_id, 'mangetouts',                100, 'g',          false, 9,  'pois gourmands, topping'),
    (v_recipe_id, 'coriandre fraîche',         10,  'g',          false, 10, 'topping'),
    (v_recipe_id, 'huile pimentée',            1,   'c. à soupe', false, 11, 'topping'),
    (v_recipe_id, 'citron vert',               1,   'unité',      false, 12, 'en quartiers');

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
    'Lasagne TikTok virale aux feuilles à raviolis et farce de poulet shiitake, vapeur cuite et nappée d''une sauce tahini-soja avec huile pimentée.',
    $instr$["Préparer la farce : mélanger dans un saladier poulet haché, oignons nouveaux, shiitake, ail, gingembre, sauce soja, vinaigre de riz, huile de sésame, sucre, poivre et MSG (optionnel). Mélanger jusqu'à texture lisse.",
"Dans un plat résistant à la chaleur (18×23×8 cm environ), étaler un tiers de la farce comme base. Recouvrir de 9 feuilles à raviolis avec un chevauchement minimum.",
"Répéter : couche de farce, feuilles, couche de farce, feuilles. Verser les 75 ml d'eau sur le dessus.",
"Placer le plat dans un panier vapeur au-dessus de 5 à 8 cm d'eau bouillante. Couvrir et cuire 17 minutes à feu vif.",
"Pendant la cuisson, préparer la sauce : fouetter tahini, sucre, sauce soja, jus de citron vert, huile de sésame et ail émincé.",
"Sortir délicatement du panier vapeur. Arroser de sauce tahini, d'huile pimentée, parsemer de ciboulette et graines de sésame. Servir immédiatement."]
$instr$,
    5, 17, 2, 2,
    'Chinoise', 'dinner',
    ARRAY['chinois','dumplings','vapeur','tiktok viral','poulet','tahini'],
    'manual',
    'https://myriadrecipes.com/viral-dumpling-lasagna/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet haché',              500, 'g',          true,  1,  NULL),
    (v_recipe_id, 'oignons nouveaux',          5,   'unité',      true,  2,  'finement émincés'),
    (v_recipe_id, 'champignons shiitake',      100, 'g',          true,  3,  'finement hachés'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  4,  'émincées'),
    (v_recipe_id, 'gingembre',                 2,   'cm',         true,  5,  'émincé'),
    (v_recipe_id, 'sauce soja claire',         2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'vinaigre de riz',           1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'poivre noir moulu',         0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'MSG',                       0.5, 'c. à café',  false, 11, 'optionnel'),
    (v_recipe_id, 'feuilles à raviolis',       27,  'unité',      true,  12, NULL),
    (v_recipe_id, 'eau',                       75,  'ml',         true,  13, 'pour la vapeur'),
    (v_recipe_id, 'tahini',                    1,   'c. à soupe', true,  14, 'ou beurre de cacahuète, pour la sauce'),
    (v_recipe_id, 'sucre',                     0.5, 'c. à café',  true,  15, 'pour la sauce'),
    (v_recipe_id, 'sauce soja claire',         1,   'c. à soupe', true,  16, 'pour la sauce'),
    (v_recipe_id, 'jus de citron vert',        0.5, 'unité',      true,  17, 'pour la sauce'),
    (v_recipe_id, 'huile de sésame',           0.5, 'c. à soupe', true,  18, 'pour la sauce'),
    (v_recipe_id, 'gousse d''ail',             1,   'unité',      true,  19, 'émincée, pour la sauce'),
    (v_recipe_id, 'huile pimentée',            2,   'c. à soupe', false, 20, 'topping'),
    (v_recipe_id, 'ciboulette',                10,  'g',          false, 21, 'topping'),
    (v_recipe_id, 'graines de sésame',         1,   'c. à café',  false, 22, 'topping');

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
    'Frites maison à l''air fryer assaisonnées d''épices mexicaines, surmontées de bœuf haché, tomates, sauce fromage maison et crème fraîche.',
    $instr$["Couper les pommes de terre en bâtonnets fins. Dans un saladier, les enrober d'huile végétale, maïzena, sel fin et sucre.",
"Cuire à l'air fryer à 200°C pendant 15-20 minutes en remuant à mi-cuisson.",
"Préparer le mélange d'épices nachos : combiner paprika, chili powder, cumin, oignon en poudre, poivre noir, ail en poudre, sel et un trait de jus de citron.",
"Dorer le bœuf haché dans une poêle avec un filet d'huile. Assaisonner de cumin, origan, chili powder et une pincée de sel.",
"Préparer la sauce fromage : faire fondre le beurre, incorporer la farine au fouet puis verser le lait progressivement. Ajouter le cheddar râpé, le curcuma et le paprika pour la couleur. Goûter et rectifier l'assaisonnement.",
"Enrober les frites du mélange d'épices et arroser de jus de citron.",
"Dresser sur un plat : frites, bœuf, tomates, sauce fromage, crème fraîche et ciboulette."]
$instr$,
    20, 20, 2, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','air fryer','frites','bœuf','fromage','street food'],
    'manual',
    'https://myriadrecipes.com/nacho-fries/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'grosses pommes de terre',   500,  'g',          true,  1,  'en bâtonnets'),
    (v_recipe_id, 'huile végétale',            1,    'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'maïzena',                   1,    'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'sel fin',                   0.25, 'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'sucre',                     0.25, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'paprika',                   1,    'c. à café',  true,  6,  'assaisonnement nachos'),
    (v_recipe_id, 'chili powder doux',         0.5,  'c. à café',  true,  7,  'assaisonnement nachos'),
    (v_recipe_id, 'cumin moulu',               0.5,  'c. à café',  true,  8,  'assaisonnement nachos'),
    (v_recipe_id, 'oignon en poudre',          0.5,  'c. à café',  true,  9,  'assaisonnement nachos'),
    (v_recipe_id, 'poivre noir moulu',         0.25, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'ail en poudre',             0.5,  'c. à café',  true,  11, 'assaisonnement nachos'),
    (v_recipe_id, 'sel en flocons',            0.5,  'c. à café',  true,  12, NULL),
    (v_recipe_id, 'jus de citron',             0.25, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'bœuf haché',                250,  'g',          true,  14, NULL),
    (v_recipe_id, 'cumin moulu',               1,    'c. à café',  true,  15, 'pour le bœuf'),
    (v_recipe_id, 'origan séché',              1,    'c. à café',  true,  16, 'pour le bœuf'),
    (v_recipe_id, 'chili powder doux',         0.5,  'c. à café',  true,  17, 'pour le bœuf'),
    (v_recipe_id, 'beurre',                    25,   'g',          true,  18, 'salé, pour la sauce'),
    (v_recipe_id, 'farine',                    25,   'g',          true,  19, 'pour la sauce'),
    (v_recipe_id, 'lait',                      250,  'ml',         true,  20, 'pour la sauce'),
    (v_recipe_id, 'cheddar',                   100,  'g',          true,  21, 'râpé'),
    (v_recipe_id, 'paprika',                   0.25, 'c. à café',  true,  22, 'pour la sauce'),
    (v_recipe_id, 'curcuma',                   0.25, 'c. à café',  true,  23, 'pour la couleur'),
    (v_recipe_id, 'tomates',                   2,    'unité',      false, 24, 'finement coupées, topping'),
    (v_recipe_id, 'crème fraîche',             2,    'c. à soupe', false, 25, 'topping'),
    (v_recipe_id, 'ciboulette',                5,    'g',          false, 26, 'optionnel, topping');

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
    'Rouleaux croustillants à la galette de riz à l''air fryer, garnis de porc haché, légumes croquants et champignons, servis avec sauce chili douce.',
    $instr$["Chauffer une poêle à feu moyen-vif avec un filet d'huile. Faire revenir l'oignon émincé 2 minutes en remuant souvent.",
"Ajouter le porc haché, l'écraser à la spatule et cuire 10 minutes en remuant.",
"Incorporer l'ail et le gingembre, frire 1 minute. Ajouter carottes, chou et shiitake, cuire 2 minutes puis ajouter le céleri.",
"Verser sauce soja, huile de sésame et sauce huître. Stir-fry 2 minutes. Goûter et rectifier. Laisser refroidir 10 minutes au réfrigérateur.",
"Tremper rapidement une galette de riz dans l'eau tiède, la poser à plat. Déposer 2 c. à soupe de farce à 5 cm de la base. Replier vers le centre quand la galette devient collante, puis rabattre les côtés et rouler serré.",
"Envelopper chaque rouleau dans une seconde galette de riz pour éviter qu'il ne se déchire pendant la cuisson.",
"Cuire à l'air fryer à 200°C pendant 10 minutes (rouleaux espacés). Servir avec sauce chili douce."]
$instr$,
    20, 20, 4, 3,
    'Vietnamienne', 'snack',
    ARRAY['vietnamien','rouleaux','air fryer','porc','croustillant','apéro'],
    'manual',
    'https://myriadrecipes.com/air-fryer-rice-paper-rolls/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'boeuf hache',                300, 'g',          true,  1,  NULL),
    (v_recipe_id, 'oignon blanc',              1,   'unité',      true,  2,  'finement émincé'),
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  3,  'émincées'),
    (v_recipe_id, 'gingembre',                 2,   'cm',         true,  4,  'émincé'),
    (v_recipe_id, 'chou',                      150, 'g',          true,  5,  'finement haché, ¼ de chou'),
    (v_recipe_id, 'carottes',                  2,   'unité',      true,  6,  'en julienne'),
    (v_recipe_id, 'branches de céleri',        2,   'unité',      true,  7,  'en julienne'),
    (v_recipe_id, 'champignons shiitake',      100, 'g',          true,  8,  'finement émincés'),
    (v_recipe_id, 'sauce soja claire',         1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'sauce huître',              2,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'galettes de riz',           16,  'unité',      true,  12, '8 rouleaux x 2 galettes'),
    (v_recipe_id, 'sauce chili douce',         2,   'c. à soupe', false, 13, 'pour servir'),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  14, 'pour la cuisson');

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
    'Pain ciabatta garni d''un mélange oignons confits, chorizo, mozzarella et nduja piquante, grillé jusqu''à fondre les fromages. Apéro à partager.',
    $instr$["Chauffer l'huile dans une poêle à feu moyen. Faire revenir oignons et ail 5 minutes jusqu'à attendrir.",
"Transférer la base dans un saladier. Ajouter chorizo, persil, mozzarella, pâte de nduja, une pincée de sel et le poivre. Bien mélanger.",
"Trancher la ciabatta horizontalement. Garnir la moitié inférieure du mélange, déposer les tranches de beurre par-dessus.",
"Refermer et passer sous le gril du four environ 5 minutes en surveillant pour ne pas brûler. Servir aussitôt, coupé en parts."]
$instr$,
    10, 5, 4, 1,
    'Italienne', 'snack',
    ARRAY['italien','sandwich','nduja','mozzarella','apéro','partage','rapide'],
    'manual',
    'https://myriadrecipes.com/cheesy-nduja-slider/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'grande ciabatta',           1,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'huile d''olive',            1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'oignons',                   2,   'unité',      true,  3,  'finement émincés'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  4,  'finement émincées'),
    (v_recipe_id, 'chorizo de boeuf',                   150, 'g',          true,  5,  'finement haché'),
    (v_recipe_id, 'persil',                    10,  'g',          true,  6,  'haché'),
    (v_recipe_id, 'mozzarella',                125, 'g',          true,  7,  'grossièrement coupée'),
    (v_recipe_id, 'pâte de saucisse de boeuf epicee',             1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'poivre noir moulu',         1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'beurre salé',               20,  'g',          true,  10, 'en tranches fines');

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
    'Onigiri coréano-japonais : riz à sushi pimenté au gochujang, fourré au thon-mayo, ceinturé de nori. Snack mi-semaine simple et nomade.',
    $instr$["Dans un saladier, mélanger le riz froid avec le gochujang, la sauce soja, l'huile de sésame, le gochugaru, le sucre, l'ail, le gingembre et le ketchup. Mélanger jusqu'à coloration orangée uniforme.",
"Dans un autre bol, mélanger le thon égoutté, la mayonnaise, le poivre noir et l'oignon nouveau.",
"Sur un film alimentaire, déposer une couche de riz, creuser un puits, ajouter une cuillère de garniture, recouvrir d'une seconde couche de riz.",
"Refermer le film et presser pour former un triangle. Réfrigérer minimum 10 minutes.",
"Démouler, déposer une bande de nori sur la base, parsemer d'oignon nouveau et servir."]
$instr$,
    5, 15, 3, 2,
    'Coréenne', 'snack',
    ARRAY['coréen','japonais','onigiri','gochujang','thon','nomade','fusion'],
    'manual',
    'https://myriadrecipes.com/gochujang-onigiri/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz à sushi cuit',          100, 'g',          true,  1,  'froid'),
    (v_recipe_id, 'gochujang',                 1,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'sauce soja',                1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'gochugaru',                 0.5, 'c. à café',  true,  5,  'flocons de piment coréen'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'ail émincé',                0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'gingembre émincé',          0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'ketchup',                   1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'thon en boîte',             125, 'g',          true,  10, 'égoutté'),
    (v_recipe_id, 'mayonnaise',                1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'poivre noir moulu',         1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      true,  13, 'finement émincés'),
    (v_recipe_id, 'feuille de nori',           1,   'unité',      true,  14, 'coupée en 4 bandes');

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
    'Sandwich de street food coréen : omelette aux légumes, fromage, sucre et ketchup entre deux tranches de pain de mie doré au beurre.',
    $instr$["Dans un saladier, mélanger oignon, carotte, oignon nouveau, 2 c. à soupe de chou et les œufs battus.",
"Chauffer du beurre dans une grande poêle à feu moyen. Verser le mélange et le former en carré légèrement plus grand qu'une tranche de pain.",
"Cuire l'omelette 4-5 minutes sur la première face puis retourner et cuire 4 minutes côté pile.",
"Ajouter les tranches de fromage, le sucre et un trait de ketchup sur l'omelette. Réserver au chaud.",
"Ajouter du beurre dans la poêle et faire dorer les tranches de pain 2 minutes par face.",
"Assembler : pain doré, omelette au fromage, 1/2 c. à soupe de chou frais restant, deuxième tranche de pain. Servir aussitôt."]
$instr$,
    5, 15, 1, 1,
    'Coréenne', 'breakfast',
    ARRAY['coréen','street food','sandwich','omelette','petit-déjeuner','rapide'],
    'manual',
    'https://myriadrecipes.com/korean-gilgeori-toast/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'tranches de pain de mie',   2,   'unité',      true,  1,  'épaisses, type pain au lait'),
    (v_recipe_id, 'chou blanc râpé',           40,  'g',          true,  2,  '2,5 c. à soupe'),
    (v_recipe_id, 'oignon',                    1,   'unité',      true,  3,  'finement émincé'),
    (v_recipe_id, 'carotte',                   0.5, 'unité',      true,  4,  'finement émincée'),
    (v_recipe_id, 'oignon nouveau',            1,   'unité',      true,  5,  'finement émincé'),
    (v_recipe_id, 'œufs',                      2,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'tranches de fromage',       4,   'unité',      true,  8,  'fromage burger'),
    (v_recipe_id, 'ketchup',                   1,   'c. à soupe', false, 9,  NULL),
    (v_recipe_id, 'beurre',                    20,  'g',          true,  10, 'ou margarine');

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
    'Sandwich mexicain pambazo : pain trempé dans une sauce piments guajillo, garni de chorizo, pommes de terre, laitue, avocat et cheddar mexicain.',
    $instr$["Placer les piments guajillo séchés, la moitié d'oignon rouge et l'ail dans un bol, couvrir de 200 ml d'eau bouillante. Laisser infuser 15 minutes.",
"Mixer le contenu réhydraté avec 50 ml de l'eau d'infusion jusqu'à obtenir une sauce lisse. Réserver dans un contenant.",
"Chauffer l'huile dans une poêle. Faire revenir l'autre moitié d'oignon, le chorizo et les pommes de terre avec cumin, origan et paprika pendant 10 minutes.",
"Mélanger le cheddar mexicain râpé avec la crème fraîche pour obtenir une crème fromagère.",
"Trancher le pain. Tartiner de farce chorizo-pomme de terre, ajouter la laitue, l'avocat et la crème de fromage. Replier et servir avec la sauce guajillo en dip."]
$instr$,
    15, 25, 1, 3,
    'Mexicaine', 'lunch',
    ARRAY['mexicain','sandwich','street food','chorizo','guajillo','avocat'],
    'manual',
    'https://myriadrecipes.com/mexican-pambazo-sandwich/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pain rond',                 1,   'unité',      true,  1,  'tranché en 2'),
    (v_recipe_id, 'laitue',                    30,  'g',          true,  2,  'ciselée'),
    (v_recipe_id, 'avocat',                    0.5, 'unité',      true,  3,  'en tranches'),
    (v_recipe_id, 'chorizo de boeuf',                   60,  'g',          true,  4,  'grossièrement tranché'),
    (v_recipe_id, 'pommes de terre cuites',    2,   'unité',      true,  5,  'moyennes, en cubes'),
    (v_recipe_id, 'oignon rouge',              0.5, 'unité',      true,  6,  'émincée, pour la farce'),
    (v_recipe_id, 'cumin moulu',               1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'origan séché',              1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'paprika',                   1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'piments guajillo séchés',   3,   'unité',      true,  10, 'pour la sauce'),
    (v_recipe_id, 'gousse d''ail',             1,   'unité',      true,  11, 'pour la sauce'),
    (v_recipe_id, 'oignon rouge',              0.5, 'unité',      true,  12, 'pour la sauce'),
    (v_recipe_id, 'cheddar mexicain',          40,  'g',          true,  13, 'râpé'),
    (v_recipe_id, 'crème fraîche',             1,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'eau',                       200, 'ml',         true,  15, 'pour réhydrater les piments');

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
    'Momos vegans frits aux légumes (chou, carottes, champignons), pliés à la main et servis avec un chutney tomate-piment rouge.',
    $instr$["Faire revenir l'ail et le gingembre dans l'huile. Ajouter les blancs d'oignon nouveau.",
"Ajouter les légumes mélangés (chou, carottes, champignons hachés finement). Stir-fry 2-3 minutes.",
"Assaisonner de sauce soja, sel, poivre. Cuire 2-3 minutes de plus.",
"Laisser refroidir complètement la farce puis incorporer les verts d'oignon nouveau.",
"Garnir chaque feuille à raviolis de 2-3 c. à café de farce, pincer en plis dans le sens horaire pour fermer.",
"Chauffer 400 ml d'huile à feu moyen pendant 4 minutes. Frire les momos 2-5 minutes jusqu'à dorer. Égoutter sur papier absorbant.",
"Chutney : blanchir piments rouges et tomates 8 minutes. Peler les tomates et mixer le tout avec ail, huile, sauce soja, sucre, sel et poivre jusqu'à obtenir une sauce lisse."]
$instr$,
    20, 45, 2, 3,
    'Indienne', 'snack',
    ARRAY['vegan','dumplings','indien','momos','chutney','asiatique'],
    'manual',
    'https://myriadrecipes.com/fried-momos/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'feuilles à raviolis',       20,  'unité',      true,  1,  NULL),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  2,  'pour la farce'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      true,  3,  'hachés'),
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  4,  'émincées'),
    (v_recipe_id, 'gingembre émincé',          1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'légumes mélangés',          200, 'g',          true,  6,  'chou, carottes, champignons hachés finement'),
    (v_recipe_id, 'sauce soja',                1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'poivre noir moulu',         0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'piments rouges séchés',     8,   'unité',      true,  9,  'pour le chutney'),
    (v_recipe_id, 'gousses d''ail',            5,   'unité',      true,  10, 'pour le chutney'),
    (v_recipe_id, 'huile',                     3,   'c. à café',  true,  11, 'pour le chutney'),
    (v_recipe_id, 'sauce soja',                1,   'c. à café',  true,  12, 'pour le chutney'),
    (v_recipe_id, 'tomates',                   3,   'unité',      true,  13, 'pour le chutney'),
    (v_recipe_id, 'sucre',                     3,   'c. à café',  true,  14, 'pour le chutney'),
    (v_recipe_id, 'huile de friture',          400, 'ml',         true,  15, NULL);

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
    'Sandwich belge ultime : baguette garnie d''un steak haché épicé, salade, frites maison et sauce andalouse au poivron rôti.',
    $instr$["Préchauffer le four à 200°C (180°C ventilé) ou préparer l'air fryer. Enrober les pommes de terre coupées en quartiers d'huile, sel et poivre. Cuire 40 minutes au four ou 15 minutes à l'air fryer à 180°C.",
"Mélanger le bœuf haché avec les flocons de piment, le paprika, le sel et le poivre. Former un rectangle à la taille de la baguette. Faire dorer dans une poêle 3 minutes par face à feu moyen.",
"Sauce andalouse : rôtir les moitiés de poivron rouge à feu vif pendant 10 minutes. Mixer le poivron rôti avec mayonnaise et ketchup.",
"Trancher la baguette dans la longueur sans la couper entièrement. Garnir : sauce andalouse, salade, steak haché, frites, encore de sauce. Servir immédiatement."]
$instr$,
    20, 40, 1, 2,
    'Européenne', 'dinner',
    ARRAY['belge','sandwich','street food','bœuf','frites','comfort food'],
    'manual',
    'https://myriadrecipes.com/the-mitraillette/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'petite baguette',           1,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'pommes de terre',           3,   'unité',      true,  2,  'épluchées, en quartiers'),
    (v_recipe_id, 'huile de bœuf',             1,   'c. à soupe', true,  3,  'ou huile végétale'),
    (v_recipe_id, 'sel',                       1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'feuilles de laitue',        3,   'unité',      true,  5,  NULL),
    (v_recipe_id, 'bœuf haché',                100, 'g',          true,  6,  NULL),
    (v_recipe_id, 'flocons de piment',         0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'paprika',                   0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'mayonnaise',                1,   'c. à soupe', true,  9,  'pour la sauce andalouse'),
    (v_recipe_id, 'ketchup',                   0.5, 'c. à soupe', true,  10, 'pour la sauce andalouse'),
    (v_recipe_id, 'poivron rouge',             0.5, 'unité',      true,  11, 'pour la sauce andalouse');

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
    'Mini-rouleaux croustillants à la pâte filo, fourrés d''effiloché de poulet butter chicken au yaourt et épices indiennes, cuits à l''air fryer.',
    $instr$["Mélanger dans un saladier tous les ingrédients de la sauce sauf le poulet : yaourt, curry, paprika, cumin, ail granulé, sel, poivre, sucre, jus de citron, oignon rouge, concentré de tomates. Bien mélanger.",
"Incorporer le poulet effiloché et combiner thoroughly. Goûter et rectifier.",
"Brosser légèrement une feuille de pâte filo de beurre fondu/huile. La couper en 3 bandes dans la largeur.",
"Déposer une généreuse cuillerée de farce à la base d'une bande. Replier les côtés et rouler en rouleau de printemps. Répéter pour les 9 rouleaux.",
"Placer dans l'air fryer, badigeonner d'huile/beurre, parsemer de graines de sésame noir. Cuire à 160°C pendant 15 minutes.",
"Servir chaud avec du chutney à la mangue."]
$instr$,
    15, 15, 3, 2,
    'Indienne', 'snack',
    ARRAY['indien','butter chicken','rouleaux','air fryer','snack','filo'],
    'manual',
    'https://myriadrecipes.com/butter-chicken-crispy-rolls/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'feuilles de pâte filo',     3,   'unité',      true,  1,  'coupées en tiers'),
    (v_recipe_id, 'beurre fondu',              30,  'g',          true,  2,  'ou huile, pour badigeonner'),
    (v_recipe_id, 'graines de sésame noir',    1,   'c. à café',  false, 3,  'garniture'),
    (v_recipe_id, 'chutney à la mangue',       2,   'c. à soupe', false, 4,  'pour servir'),
    (v_recipe_id, 'blancs de poulet cuits',    2,   'unité',      true,  5,  'effilochés'),
    (v_recipe_id, 'yaourt nature',             5,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'poudre de curry',           0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'paprika',                   0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'cumin moulu',               0.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'ail granulé',               0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sucre',                     0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'jus de citron',             0.25, 'unité',     true,  12, NULL),
    (v_recipe_id, 'oignon rouge',              0.5, 'unité',      true,  13, 'finement coupé'),
    (v_recipe_id, 'concentré de tomates',      1,   'c. à café',  true,  14, NULL);

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
    'Pâtes one-pot avec sauce crémeuse au tofu soyeux mixé, ail, parmesan et paprika. Alternative protéinée à la sauce Alfredo, garnie de poulet poêlé.',
    $instr$["Mixer le tofu soyeux au blender jusqu'à obtenir une crème lisse.",
"Chauffer l'huile d'olive dans une grande poêle. Ajouter l'ail et frire jusqu'à parfum.",
"Verser le tofu mixé, le bouillon, le parmesan, le paprika, sel et poivre. Porter à ébullition puis baisser à frémissement.",
"Ajouter les pâtes dans la poêle, couvrir. Remuer toutes les 2 minutes pendant 10-15 minutes jusqu'à cuisson al dente.",
"Pendant ce temps, poêler les blancs de poulet 5 minutes par face jusqu'à cuisson complète.",
"Incorporer le persil haché à la sauce. Répartir les pâtes dans les bols, garnir de poulet tranché, persil et parmesan."]
$instr$,
    5, 15, 4, 2,
    'Italienne', 'dinner',
    ARRAY['italien','pâtes','tofu','protéiné','one-pot','crémeux','sans alfredo'],
    'manual',
    'https://myriadrecipes.com/silken-tofu-pasta-sauce/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'tofu soyeux',               600, 'g',          true,  1,  NULL),
    (v_recipe_id, 'huile d''olive',            1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'gousses d''ail',            4,   'unité',      true,  3,  'finement hachées'),
    (v_recipe_id, 'bouillon de poulet',        600, 'ml',         true,  4,  'ou bouillon de légumes'),
    (v_recipe_id, 'parmesan râpé',             50,  'g',          true,  5,  '+ extra pour servir'),
    (v_recipe_id, 'paprika',                   0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'pâtes',                     300, 'g',          true,  7,  NULL),
    (v_recipe_id, 'persil frais',              15,  'g',          true,  8,  'finement haché'),
    (v_recipe_id, 'blancs de poulet',          4,   'unité',      true,  9,  NULL);

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
    'Nouilles udon TikTok crémeuses au tofu soyeux mixé d''un côté et porc haché épicé Sichuan de l''autre, parsemées d''oignons nouveaux et sésame.',
    $instr$["Chauffer l'huile dans une poêle. Faire revenir l'ail émincé et les oignons nouveaux 1 minute jusqu'à parfum.",
"Ajouter le doubanjiang (ou sriracha/gochujang), frire 30 secondes. Ajouter le porc haché, stir-fry 5 minutes.",
"Incorporer le vin de Shaoxing, le vinaigre noir, le chili powder et le poivre du Sichuan moulu. Cuire 5 minutes de plus jusqu'à dorer le porc.",
"Mixer le tofu soyeux au blender plongeant, food processor ou blender jusqu'à texture parfaitement crémeuse.",
"Cuire les nouilles udon selon le paquet, égoutter.",
"Diviser les nouilles entre 2 bols. Déposer le porc épicé d'un côté et la crème de tofu de l'autre.",
"Garnir d'oignons nouveaux émincés et graines de sésame. Bien mélanger avant de manger."]
$instr$,
    5, 15, 2, 2,
    'Chinoise', 'dinner',
    ARRAY['chinois','sichuan','udon','tofu','tiktok viral','épicé','crémeux'],
    'manual',
    'https://myriadrecipes.com/mapo-tofu-udon/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile végétale',            0.5, 'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  2,  'émincées'),
    (v_recipe_id, 'oignon nouveau',            1,   'unité',      true,  3,  'émincé'),
    (v_recipe_id, 'doubanjiang',               1,   'c. à soupe', true,  4,  'ou sriracha / gochujang'),
    (v_recipe_id, 'boeuf hache',                250, 'g',          true,  5,  NULL),
    (v_recipe_id, 'bouillon de poulet et vinaigre de cidre',           1,   'c. à café',  false, 6,  'ou vinaigre de riz'),
    (v_recipe_id, 'vinaigre noir',             1,   'c. à café',  false, 7,  'optionnel'),
    (v_recipe_id, 'chili powder doux',         0.5, 'c. à café',  false, 8,  'optionnel'),
    (v_recipe_id, 'poivre du Sichuan moulu',   0.25, 'c. à café', true,  9,  'ou 0.5 c. à soupe d''huile pimentée'),
    (v_recipe_id, 'tofu soyeux',               300, 'g',          true,  10, NULL),
    (v_recipe_id, 'nouilles udon',             2,   'portion',    true,  11, 'fraîches ou congelées'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 12, 'garniture'),
    (v_recipe_id, 'graines de sésame',         0.5, 'c. à soupe', false, 13, 'garniture');

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
    'Pâtes one-pot crémeuses au Boursin, tomates séchées et piment, mixées en sauce lisse puis cuites avec les spaghettis. Prêt en 20 minutes.',
    $instr$["Chauffer l'huile dans une grande poêle à feu moyen. Faire revenir oignon et ail jusqu'à attendrir, ajouter paprika, origan et flocons de piment.",
"Mixer Boursin, tomates séchées, huile des tomates séchées et bouillon jusqu'à obtenir une crème lisse.",
"Verser le mélange mixé dans la poêle avec 400 ml d'eau ou bouillon supplémentaires, le vinaigre balsamique et le sucre. Bien mélanger.",
"Ajouter les spaghettis, les immerger. Couvrir et laisser frémir 10 minutes selon le paquet en remuant souvent. Découvrir 2 minutes pour épaissir.",
"Incorporer le parmesan, répartir dans les bols, garnir de parmesan supplémentaire et de flocons de piment."]
$instr$,
    5, 15, 3, 1,
    'Italienne', 'dinner',
    ARRAY['italien','pâtes','boursin','tomates séchées','one-pot','crémeux','épicé'],
    'manual',
    'https://myriadrecipes.com/spicy-boursin-pasta/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  1,  'émincées'),
    (v_recipe_id, 'oignon blanc',              1,   'unité',      true,  2,  'finement coupé'),
    (v_recipe_id, 'paprika',                   1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'origan séché',              1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'flocons de piment',         0.5, 'c. à café',  true,  5,  'ajustable'),
    (v_recipe_id, 'Boursin',                   150, 'g',          true,  6,  '1 paquet'),
    (v_recipe_id, 'tomates séchées',           75,  'g',          false, 7,  'optionnel'),
    (v_recipe_id, 'huile de tomate séchée',    1,   'c. à soupe', true,  8,  'ou huile d''olive'),
    (v_recipe_id, 'bouillon de poulet',        300, 'ml',         true,  9,  '+ 400 ml d''eau ensuite'),
    (v_recipe_id, 'vinaigre balsamique',       1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sucre',                     0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'spaghettis',                250, 'g',          true,  12, NULL),
    (v_recipe_id, 'parmesan râpé',             1,   'c. à soupe', true,  13, '+ extra pour servir');

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
    'Dumplings TikTok sans pliage : les feuilles à raviolis sont posées comme une couverture sur les boulettes de poulet, vapeur à la poêle en 20 minutes.',
    $instr$["Mélanger dans un saladier le poulet haché, la ciboulette, l'ail, le gingembre, la sauce soja, le vinaigre de riz, l'huile de sésame, le sucre et le poivre jusqu'à obtenir une pâte.",
"Chauffer une poêle antiadhésive à feu doux-moyen. Former la farce en boulettes de 1 c. à soupe espacées de 2-5 cm.",
"Placer une feuille à raviolis sur chaque boulette comme une couverture en repliant les côtés. Verser 3 c. à soupe d'eau, parsemer de graines de sésame, couvrir et cuire 6-8 minutes à la vapeur.",
"Pendant ce temps, fouetter ail, gingembre, sauce soja, vinaigre de riz, huile de sésame, MSG et huile pimentée pour la sauce.",
"Les dumplings sont prêts quand la farce est cuite, les feuilles ramollies et l'eau évaporée. Garnir de ciboulette et servir avec la sauce."]
$instr$,
    14, 6, 4, 2,
    'Chinoise', 'dinner',
    ARRAY['chinois','dumplings','tiktok viral','poulet','no-fold','rapide'],
    'manual',
    'https://myriadrecipes.com/blanket-dumplings/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet haché',              400, 'g',          true,  1,  'ou tofu ferme pour version végé'),
    (v_recipe_id, 'ciboulette',                15,  'g',          true,  2,  'finement émincée'),
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  3,  'finement râpées'),
    (v_recipe_id, 'gingembre',                 2,   'cm',         true,  4,  'finement râpé'),
    (v_recipe_id, 'sauce soja claire',         2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'vinaigre de riz',           1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'poivre noir moulu',         0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'feuilles à raviolis',       16,  'unité',      true,  10, NULL),
    (v_recipe_id, 'graines de sésame',         0.5, 'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'gousse d''ail',             1,   'unité',      true,  12, 'pour la sauce'),
    (v_recipe_id, 'gingembre',                 1,   'cm',         true,  13, 'pour la sauce'),
    (v_recipe_id, 'sauce soja claire',         2,   'c. à soupe', true,  14, 'pour la sauce'),
    (v_recipe_id, 'vinaigre de riz',           1,   'c. à soupe', true,  15, 'pour la sauce'),
    (v_recipe_id, 'huile de sésame',           0.5, 'c. à soupe', true,  16, 'pour la sauce'),
    (v_recipe_id, 'MSG',                       0.25, 'c. à café', false, 17, 'optionnel, pour la sauce'),
    (v_recipe_id, 'huile pimentée',            1,   'c. à soupe', false, 18, 'pour la sauce');

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
    'Nouilles ramen express en 15 minutes : sauce crémeuse cacahuète-curry-sésame, surmontée de bœuf haché doré à l''ail et coriandre fraîche.',
    $instr$["Chauffer l'huile dans une poêle à feu moyen. Ajouter le bœuf haché, l'écraser à la spatule. Frire 5 minutes puis incorporer l'ail tranché et la sauce soja. Continuer 5-10 minutes jusqu'à dorer.",
"Dans deux bols séparés, mélanger beurre de cacahuète, pâte de curry rouge thaï, sucre, sauce soja, vinaigre de riz et huile de sésame jusqu'à obtenir une pâte.",
"Cuire les ramen selon le paquet, égoutter en réservant 2 c. à soupe d'eau de cuisson.",
"Ajouter 1 c. à soupe d'eau de cuisson dans chaque bol de sauce, mélanger. Répartir les nouilles entre les bols, déposer le bœuf et la coriandre.",
"Bien mélanger pour enrober uniformément les nouilles avant de manger."]
$instr$,
    5, 15, 2, 1,
    'Thaï', 'dinner',
    ARRAY['thaï','nouilles','cacahuète','bœuf','ramen','15min','rapide'],
    'manual',
    'https://myriadrecipes.com/thai-peanut-butter-noodles/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                250, 'g',          true,  1,  NULL),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  2,  'tranchées'),
    (v_recipe_id, 'sauce soja claire',         1,   'c. à soupe', true,  3,  'pour le bœuf'),
    (v_recipe_id, 'huile végétale',            0.5, 'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'beurre de cacahuète',       4,   'c. à café',  true,  5,  '2 c. à café par bol'),
    (v_recipe_id, 'pâte de curry rouge thaï',  2,   'c. à café',  true,  6,  '1 c. à café par bol'),
    (v_recipe_id, 'sucre',                     0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sauce soja claire',         1,   'c. à soupe', true,  8,  'pour la sauce'),
    (v_recipe_id, 'vinaigre de riz',           1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'nouilles ramen',            2,   'portion',    true,  11, NULL),
    (v_recipe_id, 'coriandre fraîche',         5,   'g',          false, 12, 'finement hachée');

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
    'Ramen fusion japonais-thaï : poulet pané au panko croustillant à l''air fryer, posé sur un bouillon crémeux coco-cacahuète-curry rouge, œuf mollet et pak choi.',
    $instr$["Aplatir les blancs de poulet entre deux papiers cuisson à 1 cm d'épaisseur avec une poêle.",
"Préparer trois assiettes : farine assaisonnée, œuf battu, panko. Paner chaque blanc dans cet ordre puis air fryer à 220°C pendant 20 minutes (retourner à 15 minutes).",
"Dans une grande casserole, chauffer l'huile. Faire revenir l'ail 30 secondes puis ajouter la pâte de curry rouge thaï, le beurre de cacahuète et la sauce soja.",
"Verser le lait de coco et le bouillon. Porter à ébullition puis réduire le feu.",
"Cuire les œufs et le pak choi ensemble dans l'eau bouillante 6 minutes. Plonger les œufs dans l'eau glacée et égoutter le pak choi.",
"Ajouter les nouilles udon au bouillon quelques minutes avant la fin de cuisson du poulet.",
"Sortir et trancher les blancs de poulet panés.",
"Diviser nouilles et bouillon entre les bols. Garnir de poulet, pak choi, œuf coupé en 2, oignon nouveau et huile pimentée."]
$instr$,
    10, 20, 2, 3,
    'Japonaise', 'dinner',
    ARRAY['japonais','ramen','katsu','panko','air fryer','coco','curry','fusion'],
    'manual',
    'https://myriadrecipes.com/chicken-katsu-ramen/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',          2,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'panko',                     4,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'farine',                    4,   'c. à soupe', true,  3,  'assaisonnée sel/poivre'),
    (v_recipe_id, 'œuf',                       1,   'unité',      true,  4,  'battu pour la panure'),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  5,  'pour le bouillon'),
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  6,  'émincées'),
    (v_recipe_id, 'pâte de curry rouge thaï',  1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'beurre de cacahuète',       2,   'c. à soupe', true,  8,  'crunchy de préférence'),
    (v_recipe_id, 'sauce soja claire',         1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'lait de coco',              400, 'ml',         true,  10, NULL),
    (v_recipe_id, 'bouillon de poulet',        600, 'ml',         true,  11, NULL),
    (v_recipe_id, 'nouilles udon',             2,   'portion',    true,  12, NULL),
    (v_recipe_id, 'pak choi',                  2,   'unité',      true,  13, 'tranchés en 4 dans la longueur'),
    (v_recipe_id, 'œufs',                      2,   'unité',      true,  14, 'mollets, garniture'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 15, 'finement émincés'),
    (v_recipe_id, 'huile pimentée',            1,   'c. à soupe', false, 16, 'optionnel'),
    (v_recipe_id, 'graines de sésame',         1,   'c. à soupe', false, 17, 'optionnel');

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
    'Plat français en cocotte : poulet mariné dijon, crème, échalotes confites et moutarde à l''ancienne, servi sur purée de pommes de terre maison.',
    $instr$["Mariner les blancs de poulet coupés en 2 dans la longueur avec moutarde de Dijon, ail émincé, huile, sel et poivre. Laisser minimum 10 minutes (ou nuit au frigo).",
"Chauffer une poêle à feu moyen avec 0,5 c. à soupe d'huile. Saisir les blancs 3 minutes par face jusqu'à dorer. Réserver.",
"Ajouter de l'huile dans la poêle puis les échalotes émincées. Faire revenir 15 minutes jusqu'à tendreté et parfum. Ajouter l'ail tranché, frire 2 minutes.",
"Verser le bouillon, la moutarde de Dijon, la moutarde à l'ancienne, les herbes et la crème. Saler poivrer. Replacer le poulet dans la sauce, porter à ébullition puis laisser frémir 10 minutes à couvert.",
"Pendant ce temps, cuire les pommes de terre coupées dans de l'eau salée 10-15 minutes jusqu'à tendreté. Égoutter et écraser avec beurre et lait jusqu'à texture lisse. Saler poivrer.",
"Répartir la purée dans les assiettes, déposer le poulet, napper de sauce et garnir de ciboulette ciselée."]
$instr$,
    5, 25, 2, 2,
    'Française', 'dinner',
    ARRAY['français','poulet','dijon','crème','one-pan','purée','réconfortant'],
    'manual',
    'https://myriadrecipes.com/dijon-mustard-chicken/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',          2,   'unité',      true,  1,  'coupés en 2 dans la longueur'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  2,  'émincées, pour la marinade'),
    (v_recipe_id, 'moutarde de Dijon',         1,   'c. à café',  true,  3,  'pour la marinade'),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  4,  'pour la marinade'),
    (v_recipe_id, 'échalotes',                 3,   'unité',      true,  5,  'finement émincées'),
    (v_recipe_id, 'gousses d''ail',            4,   'unité',      true,  6,  'finement tranchées'),
    (v_recipe_id, 'bouillon de poulet',        300, 'ml',         true,  7,  NULL),
    (v_recipe_id, 'moutarde de Dijon',         1,   'c. à soupe', true,  8,  'bombée'),
    (v_recipe_id, 'moutarde à l''ancienne',    1,   'c. à soupe', true,  9,  'bombée'),
    (v_recipe_id, 'herbes mixtes séchées',     1,   'c. à café',  true,  10, 'ou thym'),
    (v_recipe_id, 'crème liquide',             300, 'ml',         true,  11, 'légère ou entière'),
    (v_recipe_id, 'pommes de terre',           400, 'g',          true,  12, 'pour la purée'),
    (v_recipe_id, 'beurre',                    20,  'g',          true,  13, 'salé, pour la purée'),
    (v_recipe_id, 'lait',                      100, 'ml',         true,  14, 'pour la purée'),
    (v_recipe_id, 'ciboulette',                10,  'g',          false, 15, 'ciselée, garniture');

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
    'Ragoût coréen épicé au gochujang et kimchi avec poulet, aubergine et champignons, servi sur une purée soyeuse de pommes de terre.',
    $instr$["Chauffer 1 c. à soupe d'huile végétale dans une cocotte. Faire revenir oignon, ail et gingembre 2 minutes jusqu'à parfum.",
"Ajouter les aubergines et champignons. Cuire 5-10 minutes à feu moyen-doux en remuant souvent.",
"Incorporer le kimchi, le gochujang, le sucre, la sauce soja, le vinaigre de riz, le gochugaru et le bouillon de poulet. Porter à ébullition puis laisser mijoter 10 minutes. Saupoudrer de farine et mélanger pour épaissir.",
"Goûter et rectifier avec sel, poivre ou sucre. Ajouter le poulet émincé et laisser mijoter 15 minutes.",
"Pendant ce temps, faire bouillir les pommes de terre coupées jusqu'à tendreté. Égoutter et mixer avec beurre et lait jusqu'à texture lisse. Assaisonner.",
"Répartir la purée dans les bols, recouvrir de ragoût, garnir de ciboulette et d'huile pimentée optionnelle."]
$instr$,
    5, 40, 2, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','ragoût','gochujang','kimchi','poulet','réconfortant','hiver'],
    'manual',
    'https://myriadrecipes.com/korean-style-chicken-stew/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  1,  'émincées'),
    (v_recipe_id, 'gingembre',                 2,   'cm',         true,  2,  'émincé'),
    (v_recipe_id, 'oignon',                    1,   'unité',      true,  3,  'finement coupé'),
    (v_recipe_id, 'aubergine',                 1,   'unité',      true,  4,  'en cubes'),
    (v_recipe_id, 'champignons de Paris',      150, 'g',          true,  5,  NULL),
    (v_recipe_id, 'kimchi',                    150, 'g',          true,  6,  NULL),
    (v_recipe_id, 'gochujang',                 2,   'c. à soupe', true,  7,  '2-3 c. à soupe selon le piquant'),
    (v_recipe_id, 'sucre',                     1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'sauce soja claire',         3,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'vinaigre de riz',           2,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'gochugaru',                 2,   'c. à soupe', true,  11, 'flocons de piment coréen'),
    (v_recipe_id, 'bouillon de poulet',        300, 'ml',         true,  12, NULL),
    (v_recipe_id, 'blancs de poulet',          2,   'unité',      true,  13, 'finement émincés'),
    (v_recipe_id, 'farine',                    1,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'grosses pommes de terre',   400, 'g',          true,  17, 'pour la purée'),
    (v_recipe_id, 'beurre',                    25,  'g',          true,  18, 'salé, pour la purée'),
    (v_recipe_id, 'lait',                      150, 'ml',         true,  19, 'pour la purée'),
    (v_recipe_id, 'ciboulette',                10,  'g',          false, 20, 'garniture');

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
    'Plat hawaïen réconfortant : riz jasmin, steak haché maison, sauce brune aux champignons-oignons et œuf au plat, parsemé de ciboulette.',
    $instr$["Mélanger bœuf haché, chapelure, œuf, Worcestershire, oignon haché, poivre et sel. Former 6 steaks de 85 g.",
"Chauffer un filet d'huile dans une poêle à feu moyen. Cuire les steaks 4 minutes par face jusqu'à dorer et cuisson complète. Réserver.",
"Cuire le riz jasmin selon le paquet.",
"Dans la même poêle, faire revenir oignons, shiitake et ail 5 minutes. Ajouter le beurre puis la farine et bien mélanger. Verser bouillon de bœuf, sauce soja, ketchup et Worcestershire. Laisser frémir 5-10 minutes jusqu'à épaississement. Rectifier l'assaisonnement.",
"Cuire les œufs au plat dans une poêle huilée à feu moyen 3-5 minutes jusqu'à blancs pris.",
"Répartir le riz dans les assiettes, déposer un steak, napper de sauce, couronner d'un œuf au plat et parsemer de ciboulette."]
$instr$,
    10, 20, 6, 2,
    'Américaine', 'dinner',
    ARRAY['hawaïen','américain','bœuf','riz','œuf','sauce brune','réconfortant'],
    'manual',
    'https://myriadrecipes.com/loco-moco/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz jasmin',                450, 'g',          true,  1,  NULL),
    (v_recipe_id, 'œufs',                      6,   'unité',      true,  2,  'pour le plat'),
    (v_recipe_id, 'ciboulette',                10,  'g',          false, 3,  'finement hachée'),
    (v_recipe_id, 'bœuf haché',                500, 'g',          true,  4,  'pour les steaks'),
    (v_recipe_id, 'chapelure',                 30,  'g',          true,  5,  NULL),
    (v_recipe_id, 'oignon',                    1,   'unité',      true,  6,  'finement coupé, pour les steaks'),
    (v_recipe_id, 'sauce Worcestershire',      1,   'c. à soupe', true,  7,  'pour les steaks'),
    (v_recipe_id, 'œuf',                       1,   'unité',      true,  8,  'pour la liaison des steaks'),
    (v_recipe_id, 'champignons shiitake',      100, 'g',          true,  9,  'finement émincés'),
    (v_recipe_id, 'oignons',                   2,   'unité',      true,  10, 'finement émincés, pour la sauce'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  11, 'émincées'),
    (v_recipe_id, 'beurre',                    40,  'g',          true,  12, NULL),
    (v_recipe_id, 'farine',                    4,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'bouillon de bœuf',          1000, 'ml',        true,  14, NULL),
    (v_recipe_id, 'sauce soja claire',         1,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'ketchup',                   2,   'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'sauce Worcestershire',      0.5, 'c. à soupe', true,  17, 'pour la sauce');

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
    'Ragu fusion italo-indonésien : bœuf haché mijoté dans sauce coco-cacahuète-curry rouge, servi sur riz jasmin avec œuf mollet et oignons nouveaux.',
    $instr$["Chauffer l'huile d'olive dans une cocotte. Faire revenir oignon, ail et gingembre 2-3 minutes jusqu'à parfum.",
"Ajouter le bœuf haché, l'écraser et le dorer 5-10 minutes.",
"Incorporer la pâte de curry rouge thaï, le beurre de cacahuète, la sauce soja et le vinaigre de riz. Faire revenir 1 minute.",
"Verser le lait de coco et le bouillon de bœuf. Assaisonner avec sel, poivre et sucre.",
"Porter à ébullition puis laisser mijoter 15 minutes jusqu'à épaississement en remuant occasionnellement.",
"Pendant ce temps, cuire le riz et préparer les œufs mollets (cuisson 6,5 minutes dans l'eau bouillante).",
"Répartir riz et sauce dans les bols. Couronner d'œuf coupé en 2, oignons nouveaux, graines de sésame et huile pimentée."]
$instr$,
    5, 25, 4, 2,
    'Indonésienne', 'dinner',
    ARRAY['fusion','indonésien','italien','thaï','bœuf','cacahuète','riz','sauce'],
    'manual',
    'https://myriadrecipes.com/peanut-butter-ragu/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon blanc',              1,   'unité',      true,  1,  'finement coupé'),
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  2,  'émincées'),
    (v_recipe_id, 'gingembre',                 2,   'cm',         true,  3,  'émincé'),
    (v_recipe_id, 'bœuf haché',                400, 'g',          true,  4,  '20% de matière grasse'),
    (v_recipe_id, 'pâte de curry rouge thaï',  1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'beurre de cacahuète',       3,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'sauce soja claire',         1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'vinaigre de riz',           0.5, 'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'lait de coco',              400, 'ml',         true,  9,  NULL),
    (v_recipe_id, 'bouillon de bœuf',          400, 'ml',         true,  10, NULL),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'riz jasmin cuit',           4,   'portion',    true,  12, NULL),
    (v_recipe_id, 'œufs mollets',              4,   'unité',      true,  13, NULL),
    (v_recipe_id, 'oignons nouveaux',          4,   'unité',      false, 14, 'finement émincés, garniture'),
    (v_recipe_id, 'graines de sésame',         1,   'c. à café',  false, 15, 'garniture'),
    (v_recipe_id, 'huile pimentée',            1,   'c. à soupe', false, 16, 'garniture');

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
    'Lasagne fusion italo-coréenne en one-pot : feuilles de lasagne avec poireau, chou et aubergine dans une sauce gochujang sucrée-piquante, gratinée à la mozzarella.',
    $instr$["Chauffer l'huile dans une grande poêle profonde. Faire revenir ail, poireaux, chou et aubergine 10-15 minutes jusqu'à attendrir.",
"Mélanger dans un bol gochujang, gochugaru, ketchup, miel et sauce soja.",
"Ajouter la sauce aux légumes et frire 2 minutes.",
"Verser le bouillon de légumes et les feuilles de lasagne cassées. Couvrir et laisser frémir 5 minutes. Découvrir et remuer jusqu'à tendreté des pâtes.",
"Parsemer de mozzarella râpée et mélanger jusqu'à fonte.",
"Garnir d'oignons nouveaux et de graines de sésame. Servir."]
$instr$,
    5, 25, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['fusion','coréen','italien','lasagne','gochujang','one-pot','végétarien'],
    'manual',
    'https://myriadrecipes.com/one-pot-spicy-gochujang-lasagne/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'gousses d''ail',            4,   'unité',      true,  1,  'émincées'),
    (v_recipe_id, 'poireau',                   1,   'unité',      true,  2,  'lavé, finement émincé'),
    (v_recipe_id, 'chou blanc',                200, 'g',          true,  3,  'finement émincé'),
    (v_recipe_id, 'aubergine',                 1,   'unité',      true,  4,  'en fines lamelles'),
    (v_recipe_id, 'gochujang',                 4,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'gochugaru',                 2,   'c. à soupe', true,  6,  'flocons de piment coréen'),
    (v_recipe_id, 'ketchup',                   2,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'miel',                      2,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'sauce soja claire',         3,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'bouillon de légumes',       600, 'ml',         true,  10, NULL),
    (v_recipe_id, 'mozzarella',                100, 'g',          true,  11, 'râpée'),
    (v_recipe_id, 'feuilles de lasagne',       200, 'g',          true,  12, 'cassées'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 13, 'garniture'),
    (v_recipe_id, 'graines de sésame',         1,   'c. à soupe', false, 14, 'garniture'),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  15, NULL);

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
    'Pancake coréen au kimchi version four : pâte au kimchi et oignons nouveaux étalée dans un plat huilé brûlant, croustillante aux bords et tendre au centre. Servie avec sauce soja-vinaigre.',
    $instr$["Préchauffer le four à 210°C ventilé (230°C statique). Mélanger farine, kimchi, oignons nouveaux, eau et sucre en une pâte épaisse.",
"Verser 2 c. à soupe d'huile végétale dans un moule rond de 20 cm et chauffer au four 5 minutes.",
"Transférer délicatement la pâte dans le moule chaud, étaler uniformément et cuire 20 minutes.",
"Pendant la cuisson, fouetter tous les ingrédients de la sauce.",
"Sortir du four quand les bords sont croustillants et le centre moelleux. Couper en 6 parts et servir avec la sauce."]
$instr$,
    5, 20, 1, 1,
    'Coréenne', 'dinner',
    ARRAY['coréen','pancake','kimchi','four','traybake','rapide','végétarien'],
    'manual',
    'https://myriadrecipes.com/kimchijeon-traybake/',
    NULL
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
    'Riz frit coréen au bulgogi : faux-filet mariné dans une marinade pomme-soja-gingembre, sauté avec riz jasmin, kimchi et gochujang. Couronné d''un œuf au plat et de nori.',
    $instr$["Trancher le faux-filet en lamelles fines contre le grain.",
"Mélanger tous les ingrédients de la marinade dans un bol jusqu'à fluidité.",
"Ajouter le bœuf dans la marinade, bien enrober et réfrigérer 15 minutes à 1 jour.",
"Préparer la sauce du riz frit en combinant ail, gochujang, kimchi, piment, sauce soja, huile de sésame, poivre et sucre.",
"Chauffer une poêle antiadhésive à feu moyen avec 1 c. à café d'huile.",
"Ajouter le bœuf mariné (sans la sauce) et frire 5 minutes jusqu'à dorer.",
"Retirer le bœuf et le réserver.",
"Dans la même poêle, ajouter le riz jasmin froid.",
"Verser la sauce préparée, ajouter la carotte, le kimchi et le bœuf cuit. Bien mélanger.",
"Cuire les œufs au plat dans une autre poêle.",
"Servir le riz frit couronné d'œuf, de nori effiloché et d'oignons nouveaux."]
$instr$,
    15, 15, 2, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','bulgogi','riz frit','bœuf','kimchi','gochujang','œuf'],
    'manual',
    'https://myriadrecipes.com/bulgogi-fried-rice/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'sauce soja claire',         6,   'c. à soupe', true,  1,  'pour la marinade'),
    (v_recipe_id, 'cassonade',                 3,   'c. à soupe', true,  2,  'pour la marinade'),
    (v_recipe_id, 'vinaigre de riz',           2,   'c. à soupe', true,  3,  'pour la marinade'),
    (v_recipe_id, 'pomme',                     1,   'unité',      true,  4,  'râpée'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  5,  'émincées'),
    (v_recipe_id, 'gingembre frais',           1,   'c. à café',  true,  6,  'émincé'),
    (v_recipe_id, 'poivre noir moulu',         0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'faux-filet',                250, 'g',          true,  8,  'finement tranché'),
    (v_recipe_id, 'huile de tournesol',        1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  10, 'émincées, pour la sauce du riz'),
    (v_recipe_id, 'gochujang',                 2,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'kimchi',                    2,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'carotte',                   1,   'unité',      true,  13, 'finement julienne'),
    (v_recipe_id, 'flocons de piment',         1,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'sauce soja claire',         3,   'c. à soupe', true,  15, 'pour le riz'),
    (v_recipe_id, 'huile de sésame',           2,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'riz jasmin cuit',           250, 'g',          true,  18, 'froid, 2 portions'),
    (v_recipe_id, 'œufs',                      2,   'unité',      true,  19, 'au plat'),
    (v_recipe_id, 'feuilles de nori',          2,   'unité',      false, 20, 'effilochées'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 21, 'finement coupés');

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
    'Boulettes de riz coréennes simples au thon-mayo-kimchi, parfumées au sésame, enrobées de togarashi et graines de sésame noir. Snack ou bento nomade.',
    $instr$["Cuire le riz à sushi si nécessaire (1 part de riz pour 1 part d'eau, ébullition à feu vif puis 10 minutes à couvert à feu doux). Laisser refroidir complètement.",
"Mélanger le riz refroidi avec huile de sésame, sucre et sel dans un grand saladier. Goûter et rectifier.",
"Égoutter le thon. Le mélanger dans un autre bol avec kimchi, mayonnaise, poivre noir et ail granulé.",
"Déposer 1 c. à soupe de riz dans la main, l'aplatir, ajouter une cuillerée de farce au centre, recouvrir d'une autre petite portion de riz et former une boule. Répéter pour faire 7-9 boules.",
"Mélanger togarashi et graines de sésame noir, puis enrober chaque boule de riz dans ce mélange.",
"Dresser les boules, arroser de mayonnaise et de sauce tonkatsu optionnelle, parsemer d'oignon nouveau et servir."]
$instr$,
    20, 10, 3, 2,
    'Coréenne', 'snack',
    ARRAY['coréen','jumeokbap','riz','thon','kimchi','snack','bento','nomade'],
    'manual',
    'https://myriadrecipes.com/korean-rice-balls-jumeokbap/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz à sushi cuit',          200, 'g',          true,  1,  NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'sucre',                     2,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'sel',                       1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'thon en boîte',             160, 'g',          true,  5,  'égoutté'),
    (v_recipe_id, 'kimchi',                    2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'mayonnaise',                1,   'c. à soupe', true,  7,  'pour la farce'),
    (v_recipe_id, 'poivre noir moulu',         1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'ail granulé',               0.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'togarashi',                 2,   'c. à soupe', true,  10, 'assaisonnement japonais'),
    (v_recipe_id, 'graines de sésame noir',    1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'mayonnaise',                1,   'c. à soupe', false, 12, 'pour décorer'),
    (v_recipe_id, 'oignon nouveau',            1,   'unité',      false, 13, 'finement coupé'),
    (v_recipe_id, 'sauce tonkatsu',            1,   'c. à soupe', false, 14, 'optionnel');

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
    'Pancake savoureux japonais version four : pâte chou-fromage-œufs surmontée de tranches de bacon, nappée d''okonomiyaki sauce, mayonnaise et sésame.',
    $instr$["Préchauffer le four à 210°C ventilé. Fouetter ensemble farine, levure, sucre et sel. Ajouter les œufs et le bouillon de poulet, fouetter jusqu'à pâte épaisse.",
"Incorporer chou, oignon, ail et fromage râpé à la spatule jusqu'à mélange chunky.",
"Verser l'huile de sésame sur un plat à four, chauffer 3 minutes au four. Étaler la pâte uniformément, recouvrir de bacon et cuire 20 minutes.",
"Sortir du four une fois le bacon croustillant. Étaler la sauce okonomiyaki sur le dessus, dessiner des zigzags de mayonnaise, parsemer d'oignons nouveaux et de graines de sésame. Servir immédiatement."]
$instr$,
    10, 20, 6, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','okonomiyaki','traybake','chou','bacon','four','convivial'],
    'manual',
    'https://myriadrecipes.com/okonomiyaki-traybake/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'farine',                    220, 'g',          true,  1,  NULL),
    (v_recipe_id, 'levure chimique',           0.25, 'c. à café', true,  2,  NULL),
    (v_recipe_id, 'sucre',                     0.25, 'c. à café', true,  3,  NULL),
    (v_recipe_id, 'sel',                       0.25, 'c. à café', true,  4,  NULL),
    (v_recipe_id, 'œufs',                      4,   'unité',      true,  5,  'moyens'),
    (v_recipe_id, 'bouillon de poulet',        100, 'ml',         true,  6,  NULL),
    (v_recipe_id, 'chou',                      400, 'g',          true,  7,  'haché, ½ chou'),
    (v_recipe_id, 'oignon rouge',              0.5, 'unité',      true,  8,  'finement émincée'),
    (v_recipe_id, 'gousse d''ail',             1,   'unité',      true,  9,  'émincée'),
    (v_recipe_id, 'fromage râpé',              100, 'g',          true,  10, 'mozzarella et/ou cheddar'),
    (v_recipe_id, 'tranches de beef bacon',         8,   'unité',      true,  11, NULL),
    (v_recipe_id, 'sauce okonomiyaki',         2,   'c. à soupe', true,  12, 'ou sauce BBQ'),
    (v_recipe_id, 'mayonnaise',                2,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 14, 'finement émincés'),
    (v_recipe_id, 'graines de sésame',         0.5, 'c. à soupe', false, 15, NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  16, 'pour le plat');

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
    'Copycat du Pad Thai Wagamama : nouilles de riz larges, poulet, légumes croquants et œuf brouillé, le tout enrobé d''une sauce tamarin-soja-fish sauce.',
    $instr$["Chauffer l'huile dans un wok à feu moyen. Faire dorer le poulet émincé jusqu'à cuisson. Réserver.",
"Cuire les nouilles de riz dans l'eau bouillante al dente selon le paquet. Égoutter et réserver.",
"Mélanger dans un petit bol tous les ingrédients de la sauce : sucre, sauce soja claire, sauce soja foncée, pâte de tamarin, vinaigre de riz, ketchup et nuoc-mâm.",
"Remettre le wok à chauffer. Stir-fry les légumes (oignon rouge, ail, piment, shiitake, mangetouts) avec le poulet 2 minutes.",
"Ajouter les nouilles et la sauce. Mélanger pour bien enrober.",
"Former un puits au centre, casser l'œuf, le brouiller à feu vif puis incorporer aux nouilles.",
"Servir avec les garnitures de son choix (cacahuètes, citron vert, coriandre)."]
$instr$,
    5, 15, 2, 2,
    'Thaï', 'dinner',
    ARRAY['thaï','pad thaï','wagamama','copycat','nouilles','poulet','wok'],
    'manual',
    'https://myriadrecipes.com/wagamama-pad-thai-recipe/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'sucre',                     2,   'c. à soupe', true,  1,  'pour la sauce'),
    (v_recipe_id, 'sauce soja claire',         2,   'c. à soupe', true,  2,  'pour la sauce'),
    (v_recipe_id, 'sauce soja foncée',         1,   'c. à soupe', true,  3,  'pour la sauce'),
    (v_recipe_id, 'pâte de tamarin',           0.5, 'c. à soupe', true,  4,  'pour la sauce'),
    (v_recipe_id, 'vinaigre de riz',           0.5, 'c. à soupe', true,  5,  'pour la sauce'),
    (v_recipe_id, 'ketchup',                   1,   'c. à soupe', true,  6,  'pour la sauce'),
    (v_recipe_id, 'nuoc-mâm',                  1,   'c. à soupe', true,  7,  'sauce poisson'),
    (v_recipe_id, 'blanc de poulet',           250, 'g',          true,  8,  'tranché'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  9,  'hachées'),
    (v_recipe_id, 'piment rouge',              1,   'unité',      true,  10, 'tranché'),
    (v_recipe_id, 'oignon rouge',              1,   'unité',      true,  11, 'émincé'),
    (v_recipe_id, 'champignons shiitake',      100, 'g',          true,  12, 'tranchés'),
    (v_recipe_id, 'mangetouts',                150, 'g',          true,  13, NULL),
    (v_recipe_id, 'nouilles de riz larges',    225, 'g',          true,  14, NULL),
    (v_recipe_id, 'œuf',                       1,   'unité',      true,  15, NULL),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  16, NULL);

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
    'Sushi bake végan : riz à sushi vinaigré, tofu mariné soja-radis-nori, gratiné au four et servi avec avocat, concombre, furikake et mayonnaise sriracha.',
    $instr$["Cuire le riz : rincer le riz à sushi jusqu'à eau claire. Ajouter une quantité d'eau égale. Chauffer à feu moyen jusqu'à frémir, couvrir, baisser à feu doux et cuire 10 minutes. Retirer du feu et reposer.",
"Préparer la marinade : mélanger tofu tranché, radis hachés, nori cassé, sauce soja, vinaigre de riz, ail et sucre dans un bol. Réserver pour mariner.",
"Assaisonner le riz : combiner vinaigre de riz, sucre et sel ; incorporer au riz cuit en pliant. Ajuster.",
"Assembler : préchauffer le four à 200°C (180°C ventilé). Étaler le riz au fond d'un plat. Garnir du mélange tofu mariné, carotte julienne et oignons nouveaux.",
"Cuire au four 20 minutes jusqu'à doré.",
"Sortir du four. Garnir d'avocat tranché, concombre, furikake, sriracha et mayonnaise végane. Servir avec des feuilles de nori en wraps."]
$instr$,
    20, 20, 4, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','sushi','vegan','tofu','riz','furikake','partage','convivial'],
    'manual',
    'https://myriadrecipes.com/vegan-sushi-bake/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz à sushi',               400, 'g',          true,  1,  NULL),
    (v_recipe_id, 'eau',                       500, 'ml',         true,  2,  NULL),
    (v_recipe_id, 'vinaigre de riz',           1,   'c. à soupe', true,  3,  'pour le riz'),
    (v_recipe_id, 'sucre',                     0.5, 'c. à soupe', true,  4,  'pour le riz'),
    (v_recipe_id, 'sel en flocons',            0.25, 'c. à soupe', true, 5,  'pour le riz'),
    (v_recipe_id, 'tofu extra-ferme',          280, 'g',          true,  6,  'finement tranché'),
    (v_recipe_id, 'radis',                     10,  'unité',      true,  7,  'finement coupés'),
    (v_recipe_id, 'sauce soja claire',         3,   'c. à soupe', true,  8,  'pour la marinade'),
    (v_recipe_id, 'vinaigre de riz',           1,   'c. à soupe', true,  9,  'pour la marinade'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  10, 'pour la marinade'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  11, 'pour la marinade'),
    (v_recipe_id, 'feuilles de nori',          2,   'unité',      true,  12, 'cassées'),
    (v_recipe_id, 'avocat',                    1,   'unité',      true,  13, 'tranché'),
    (v_recipe_id, 'concombre',                 0.5, 'unité',      true,  14, 'finement tranché'),
    (v_recipe_id, 'furikake',                  1,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'sriracha',                  2,   'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'mayonnaise vegan',          2,   'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      true,  18, 'coupés'),
    (v_recipe_id, 'carotte',                   1,   'unité',      true,  19, 'julienne'),
    (v_recipe_id, 'feuilles de nori',          8,   'unité',      false, 20, 'pour servir');

  RAISE NOTICE '✅ Imported 28 recipes from myriadrecipes.com';
END $$;
