-- =====================================================================
-- Seed: 32 recipes from moribyan.com (2026-05-19)
--
-- Sources fetched 2026-05-19 (moribyan.com is a WordPress blog, WebFetch OK) :
--   1.  https://moribyan.com/garlic-fried-rice-glazed-steak-bites/
--   2.  https://moribyan.com/spicy-gochujang-carbonara-udon-with-shrimp/
--   3.  https://moribyan.com/five-guys-burger-copycat/
--   4.  https://moribyan.com/korean-inspired-tuna-melt/
--   5.  https://moribyan.com/katsudon-japanese-chicken-cutlet-rice-bowl/
--   6.  https://moribyan.com/shawarma-ground-beef-rice-bowls/
--   7.  https://moribyan.com/mexican-inspired-chipotle-chicken-elote-rice-bowl/
--   8.  https://moribyan.com/chicken-caesar-smash-burgers/
--   9.  https://moribyan.com/sweet-savory-chicken-with-spicy-carbonara-brothy-rice/
--   10. https://moribyan.com/turkish-bulgur-pilaf-adana-kebab/
--   11. https://moribyan.com/chicken-shawarma-potato-bowls/
--   12. https://moribyan.com/korean-style-in-n-out-loaded-animal-fries/
--   13. https://moribyan.com/philly-cheesesteak-sliders/
--   14. https://moribyan.com/burger-salad/
--   15. https://moribyan.com/taco-salad/
--   16. https://moribyan.com/grilled-cheese-burrito-taco-bell-copycat/
--   17. https://moribyan.com/bibimbap/
--   18. https://moribyan.com/chicken-kabsa/
--   19. https://moribyan.com/nashville-hot-chicken-sandwiches/
--   20. https://moribyan.com/shawarma-nacho-fries/
--   21. https://moribyan.com/halal-cart-lamb-over-rice/
--   22. https://moribyan.com/poutine/
--   23. https://moribyan.com/pepper-lunch/
--   24. https://moribyan.com/honey-chipotle-chicken-fajitas/
--   25. https://moribyan.com/creamy-gochujang-pasta-with-tofu/
--   26. https://moribyan.com/filet-o-fish-copycat/
--   27. https://moribyan.com/crispy-firey-beef/
--   28. https://moribyan.com/big-mac/
--   29. https://moribyan.com/chipotle-salmon-bowls/
--   30. https://moribyan.com/bulgogi-kimchi-fried-rice/
--   31. https://moribyan.com/the-animal-style-in-n-out-baked-potato/
--   32. https://moribyan.com/creamy-chicken-roll-ups/
--
-- Note : "Bulgogi Kimchi Fried Rice" est distinct de "Bulgogi Fried Rice"
-- (myriadrecipes seed) — coexiste sans collision DELETE.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-moribyan-recipes.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Garlic Fried Rice & Glazed Steak Bites',
    'Spicy Gochujang Carbonara Udon with Shrimp',
    'Five Guys Burger (Copycat)',
    'Korean Tuna Melt',
    'Katsudon',
    'Shawarma Ground Beef Rice Bowls',
    'Chipotle Chicken Elote Rice Bowl',
    'Chicken Caesar Smash Burgers',
    'Sweet & Savory Chicken Brothy Rice',
    'Turkish Bulgur Pilaf & Adana Kebab',
    'Chicken Shawarma Potato Bowls',
    'Korean Animal Style Loaded Fries',
    'Philly Cheesesteak Sliders',
    'Burger Salad',
    'Taco Salad',
    'Grilled Cheese Burrito (Taco Bell)',
    'Bibimbap',
    'Chicken Kabsa',
    'Nashville Hot Chicken Sandwich',
    'Shawarma Nacho Fries',
    'Halal Cart Lamb Over Rice',
    'Poutine',
    'Pepper Lunch',
    'Honey Chipotle Chicken Fajitas',
    'Creamy Gochujang Pasta with Tofu',
    'Filet-O-Fish (Copycat)',
    'Crispy Firey Beef',
    'Big Mac (Copycat)',
    'Chipotle Salmon Bowls',
    'Bulgogi Kimchi Fried Rice',
    'Animal Style Baked Potato',
    'Creamy Chicken Roll-Ups'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Garlic Fried Rice & Glazed Steak Bites
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Garlic Fried Rice & Glazed Steak Bites',
    'Steak coupé en dés glacé d''une sauce soja-sésame brillante, posé sur riz jasmin frit à l''ail au beurre avec œufs brouillés et gochujang.',
    $instr$["Fouetter les œufs avec une pincée de sel et de poivre. Réserver.",
"Chauffer un wok à feu moyen, faire fondre la moitié du beurre. Ajouter l'ail émincé et cuire 30 secondes.",
"Ajouter le riz jasmin (de la veille), casser les grumeaux et enrober du beurre à l'ail. Ajouter sauce soja et gochujang, mélanger.",
"Pousser le riz sur les côtés du wok, ajouter le beurre restant au centre. Verser les œufs et les laisser prendre, puis brouiller doucement.",
"Mélanger les œufs au riz. Cuire 1-2 minutes à chaleur uniforme. Réserver.",
"Pour les steak bites : enrober le filet en dés d'huile, paprika, sel, poivre et bicarbonate. Laisser reposer 10 minutes.",
"Fouetter sauce soja, bouillon de bœuf, cassonade, maïzena, huile de sésame, vinaigre de riz et poivre cracké pour la sauce.",
"Chauffer le wok à feu vif avec un fond d'huile. Saisir le steak en couche unique sans bouger 1-2 minutes.",
"Mélanger et cuire jusqu'à coloration uniforme (5-7 minutes). Baisser le feu et verser la sauce. Tossing 1-2 minutes jusqu'à enrobage brillant.",
"Dresser le riz dans des bols, déposer les steak bites au centre, garnir d'oignons nouveaux."]
$instr$,
    15, 15, 3, 2,
    'Asiatique', 'dinner',
    ARRAY['asiatique','riz frit','steak','bœuf','glazed','wok','30min'],
    'manual',
    'https://moribyan.com/garlic-fried-rice-glazed-steak-bites/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filet de bœuf',             454, 'g',          true,  1,  'en dés'),
    (v_recipe_id, 'huile neutre',              1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'paprika',                   0.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'bicarbonate de soude',      0.5, 'c. à café',  true,  4,  'pour attendrir'),
    (v_recipe_id, 'sauce soja allégée',        2,   'c. à soupe', true,  5,  'pour la sauce'),
    (v_recipe_id, 'bouillon de bœuf',          30,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'cassonade',                 12,  'g',          true,  7,  NULL),
    (v_recipe_id, 'maïzena',                   4,   'g',          true,  8,  NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'vinaigre de riz',           1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'riz jasmin cuit',           400, 'g',          true,  11, 'de la veille'),
    (v_recipe_id, 'beurre doux',               22,  'g',          true,  12, 'divisé'),
    (v_recipe_id, 'ail émincé',                2,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'sauce soja allégée',        1,   'c. à soupe', true,  14, 'pour le riz'),
    (v_recipe_id, 'gochujang',                 1,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'œufs',                      3,   'unité',      true,  16, 'gros'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 17, 'tranchés, garniture');

  -- =====================================================================
  -- 2. Spicy Gochujang Carbonara Udon with Shrimp
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Spicy Gochujang Carbonara Udon with Shrimp',
    'Udon nappées d''une sauce carbonara fusion crémeuse au gochujang et parmesan, surmontées de crevettes saisies au beurre.',
    $instr$["Sécher les crevettes, les enrober d'huile d'olive, paprika, origan, sel, poivre et oignon en poudre.",
"Chauffer une poêle à feu moyen-vif, saisir les crevettes 1-2 minutes par face. Ajouter le beurre en fin de cuisson, mélanger. Réserver.",
"Dans la même poêle, faire fondre le beurre à feu moyen. Ajouter l'ail et sauter 30 secondes.",
"Incorporer le gochujang et cuire 1 minute pour développer les saveurs.",
"Verser la crème, le lait et la crème de bouillon de poulet émiettée en fouettant. Ajouter sauce soja, paprika, sucre, oignon en poudre et flocons de piment. Laisser frémir 3-5 minutes.",
"Baisser le feu, incorporer le parmesan râpé jusqu'à fonte complète et crème onctueuse.",
"Réchauffer les udon 1-2 minutes à l'eau chaude et égoutter. Les ajouter à la sauce et tossing 2-3 minutes.",
"Remettre les crevettes, mélanger délicatement.",
"Garnir d'oignons nouveaux et parmesan supplémentaire. Servir immédiatement."]
$instr$,
    10, 20, 3, 2,
    'Coréenne', 'dinner',
    ARRAY['fusion','coréen','italien','udon','carbonara','crevettes','gochujang','crémeux'],
    'manual',
    'https://moribyan.com/spicy-gochujang-carbonara-udon-with-shrimp/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'grosses crevettes',         340, 'g',          true,  1,  'décortiquées'),
    (v_recipe_id, 'huile d''olive',            1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'paprika',                   0.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'origan séché',              0.5, 'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'oignon en poudre',          0.25, 'c. à café', true,  5,  NULL),
    (v_recipe_id, 'beurre doux',               4,   'c. à soupe', true,  6,  '1 pour crevettes + 3 pour la sauce'),
    (v_recipe_id, 'ail émincé',                1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'gochujang',                 3,   'c. à soupe', true,  8,  '3-4 selon le piquant'),
    (v_recipe_id, 'crème allégée',             240, 'ml',         true,  9,  'half and half'),
    (v_recipe_id, 'lait entier',               180, 'ml',         true,  10, NULL),
    (v_recipe_id, 'cube de bouillon de poulet', 1,  'unité',      true,  11, 'gros'),
    (v_recipe_id, 'sauce soja allégée',        0.5, 'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'paprika',                   2,   'c. à café',  true,  13, 'pour la sauce'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'flocons de piment',         0.75, 'c. à café', true,  15, NULL),
    (v_recipe_id, 'parmesan râpé',             80,  'g',          true,  16, 'fraîchement râpé'),
    (v_recipe_id, 'nouilles udon',             400, 'g',          true,  17, NULL),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 18, 'tranchés');

  -- =====================================================================
  -- 3. Five Guys Burger (Copycat)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Five Guys Burger (Copycat)',
    'Burger Five Guys maison : steak haché 80/20 saisi sur plaque chaude, oignons confits, cheddar fondant et garnitures sur pain au sésame.',
    $instr$["Chauffer une poêle à feu moyen, ajouter l'huile et l'oignon coupé avec une pincée de sel.",
"Cuire 10-15 minutes en remuant occasionnellement jusqu'à translucidité.",
"Continuer 10-15 minutes de plus jusqu'à coloration profonde et texture confite. Ajouter un peu d'eau si nécessaire.",
"Diviser le bœuf en 4 portions de 100g. Presser légèrement à plat.",
"Saler poivrer une face. Chauffer la plancha à feu moyen-vif avec un filet d'huile.",
"Cuire les steaks face assaisonnée vers le bas 2-3 minutes jusqu'à brunissement profond.",
"Saler poivrer la deuxième face, retourner et cuire 1,5-2 minutes.",
"Déposer le cheddar et laisser fondre complètement.",
"Beurrer les faces internes des pains, les toaster 1-2 minutes jusqu'à dorer.",
"Assembler : pain inférieur avec ketchup/moutarde, oignons confits, steaks, cornichons, tomate, salade, mayonnaise sur pain supérieur.",
"Emballer dans du papier alu, reposer 2-3 minutes avant de servir."]
$instr$,
    15, 15, 2, 2,
    'Américaine', 'dinner',
    ARRAY['américain','burger','copycat','fast food','bœuf','cheddar','five guys'],
    'manual',
    'https://moribyan.com/five-guys-burger-copycat/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché 80/20',          454, 'g',          true,  1,  NULL),
    (v_recipe_id, 'tranches de cheddar',       4,   'unité',      true,  2,  'fromage américain'),
    (v_recipe_id, 'pains au sésame',           4,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'beurre doux fondu',         30,  'ml',         true,  4,  'pour toaster'),
    (v_recipe_id, 'oignon jaune',              1,   'unité',      true,  5,  'coupé, moyen'),
    (v_recipe_id, 'huile neutre',              7.5, 'ml',         true,  6,  NULL),
    (v_recipe_id, 'laitue iceberg',            50,  'g',          true,  7,  'coupée'),
    (v_recipe_id, 'tomate',                    1,   'unité',      true,  8,  'en tranches'),
    (v_recipe_id, 'cornichons',                30,  'g',          true,  9,  'en tranches'),
    (v_recipe_id, 'ketchup',                   2,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'moutarde jaune',            1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'mayonnaise',                2,   'c. à soupe', true,  12, NULL);

  -- =====================================================================
  -- 4. Korean Tuna Melt
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Korean Tuna Melt',
    'Sandwich grillé fusion : thon piquant pimenté au kimchi et kewpie mayo, double cheddar fondu, pain sourdough au beurre d''ail.',
    $instr$["Mélanger le thon égoutté, l'huile de sésame, la kewpie mayo, le kimchi finement haché et les oignons nouveaux jusqu'à uniformité.",
"Mélanger beurre fondu, ail émincé, persil, parmesan, sel et poivre dans un autre bol.",
"Badigeonner une face de chaque tranche de sourdough du beurre à l'ail.",
"Disposer les tranches face beurrée vers le bas. Étaler cheddar, mélange de thon et plus de cheddar, refermer (face beurrée vers le haut).",
"Chauffer une poêle à feu moyen. Cuire les sandwichs 3-4 minutes par face en couvrant légèrement pour faire fondre le fromage.",
"Laisser reposer 1 minute avant de trancher et servir."]
$instr$,
    10, 10, 3, 1,
    'Coréenne', 'lunch',
    ARRAY['coréen','sandwich','thon','kimchi','grilled cheese','kewpie','fusion'],
    'manual',
    'https://moribyan.com/korean-inspired-tuna-melt/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'thon piquant en boîte',     420, 'g',          true,  1,  '3 boîtes, type Dongwon hot pepper'),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'kewpie mayo',               60,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'kimchi',                    60,  'g',          true,  4,  'finement haché'),
    (v_recipe_id, 'oignons nouveaux',          30,  'g',          true,  5,  'finement tranchés'),
    (v_recipe_id, 'beurre doux fondu',         60,  'ml',         true,  6,  'pour beurre à l''ail'),
    (v_recipe_id, 'ail émincé',                2,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'persil',                    0.5, 'c. à soupe', true,  8,  'haché'),
    (v_recipe_id, 'parmesan râpé',             2,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'tranches de sourdough',     6,   'unité',      true,  10, NULL),
    (v_recipe_id, 'cheddar râpé',              100, 'g',          true,  11, NULL);

  -- =====================================================================
  -- 5. Katsudon
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Katsudon',
    'Bol de riz japonais : escalope de poulet panko croustillante mijotée dans bouillon dashi sucré-salé aux oignons caramélisés, nappée d''œuf soyeux.',
    $instr$["Assaisonner le poulet de sel et poivre, l'aplatir à épaisseur uniforme.",
"Préparer la station de panure : farine assaisonnée (sel, poivre, ail en poudre) ; œufs battus avec lait ; panko assaisonné.",
"Mélanger bouillon, sauce soja, vinaigre de riz, maïzena et cassonade pour le bouillon mijoté.",
"Caraméliser l'oignon tranché à feu doux-moyen jusqu'à dorer, déglacer à l'eau si besoin.",
"Chauffer 2,5 cm d'huile à feu moyen jusqu'à chatoiement.",
"Paner les escalopes : farine, œuf, panko (presser légèrement).",
"Frire les escalopes 3-4 minutes par face jusqu'à doré croustillant. Transférer sur grille.",
"Dans une autre poêle, combiner oignons portionnés et bouillon. Porter à frémissement doux.",
"Trancher l'escalope frite, déposer sur les oignons. Fouetter un œuf, le verser sur le dessus. Cuire 1-2 minutes jusqu'à ce que l'œuf prenne doucement.",
"Dresser : riz jasmin chaud, glisser le poulet, l'œuf et les oignons par dessus avec le bouillon. Garnir d'oignons nouveaux."]
$instr$,
    25, 25, 2, 3,
    'Japonaise', 'dinner',
    ARRAY['japonais','katsudon','poulet pané','panko','œuf','dashi','réconfortant','bol'],
    'manual',
    'https://moribyan.com/katsudon-japanese-chicken-cutlet-rice-bowl/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blanc de poulet',           1,   'unité',      true,  1,  'gros, coupé en 2'),
    (v_recipe_id, 'œufs',                      4,   'unité',      true,  2,  '2 pour la panure + 2 pour le bouillon'),
    (v_recipe_id, 'lait entier',               1,   'c. à soupe', true,  3,  'pour la panure'),
    (v_recipe_id, 'farine',                    65,  'g',          true,  4,  NULL),
    (v_recipe_id, 'panko',                     120, 'g',          true,  5,  NULL),
    (v_recipe_id, 'ail en poudre',             1,   'c. à café',  true,  6,  'pour les panures'),
    (v_recipe_id, 'oignon jaune',              1,   'unité',      true,  7,  'moyen, émincé'),
    (v_recipe_id, 'bouillon de poulet',        240, 'ml',         true,  8,  NULL),
    (v_recipe_id, 'sauce soja allégée',        3,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'vinaigre de riz',           1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'maïzena',                   1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'cassonade',                 1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'riz jasmin cuit',           2,   'portion',    true,  13, NULL),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 14, 'tranchés, garniture'),
    (v_recipe_id, 'huile neutre',              250, 'ml',         true,  15, 'pour la friture');

  -- =====================================================================
  -- 6. Shawarma Ground Beef Rice Bowls
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Shawarma Ground Beef Rice Bowls',
    'Bol de riz jaune avec bœuf haché épicé shawarma (allspice, sumac, coriandre), nappé de sauce feta-ail crémeuse et mélasse de grenade.',
    $instr$["Combiner ail, eau, huile d'olive, jus de citron, sel, feta, sucre, mayo et moutarde dans un blender.",
"Mixer jusqu'à crème lisse. Ajuster l'assaisonnement et réfrigérer.",
"Chauffer l'huile d'olive dans une poêle. Brunir le bœuf haché en l'émiettant.",
"Ajouter allspice, coriandre, paprika, sumac, sel, poivre et curcuma. Mélanger pour enrober uniformément.",
"Fouetter bouillon de bœuf et maïzena, verser dans la poêle. Laisser mijoter quelques minutes jusqu'à ce que le bœuf devienne brillant et légèrement saucy.",
"Dresser : riz jaune dans les bols, bœuf épicé, laitue ciselée, cornichons hachés.",
"Arroser généreusement de sauce feta à l'ail et mélasse de grenade."]
$instr$,
    15, 25, 4, 2,
    'Libanaise', 'dinner',
    ARRAY['libanais','méditerranéen','shawarma','bœuf','riz','feta','grenade','bol'],
    'manual',
    'https://moribyan.com/shawarma-ground-beef-rice-bowls/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ail émincé',                1,   'c. à soupe', true,  1,  'pour la sauce'),
    (v_recipe_id, 'eau',                       60,  'ml',         true,  2,  'pour la sauce'),
    (v_recipe_id, 'huile d''olive',            80,  'ml',         true,  3,  'pour la sauce'),
    (v_recipe_id, 'jus de citron',             2,   'c. à soupe', true,  4,  'pour la sauce'),
    (v_recipe_id, 'feta',                      43,  'g',          true,  5,  'pour la sauce'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  6,  'pour la sauce'),
    (v_recipe_id, 'mayonnaise',                120, 'ml',         true,  7,  'pour la sauce'),
    (v_recipe_id, 'moutarde jaune',            0.75, 'c. à café', true,  8,  'pour la sauce'),
    (v_recipe_id, 'bœuf haché',                454, 'g',          true,  9,  NULL),
    (v_recipe_id, 'huile d''olive',            2,   'c. à soupe', true,  10, 'pour le bœuf'),
    (v_recipe_id, 'allspice',                  1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'coriandre moulue',          1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'paprika',                   1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'sumac',                     1,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'curcuma',                   0.25, 'c. à café', true,  15, NULL),
    (v_recipe_id, 'bouillon de bœuf',          180, 'ml',         true,  16, NULL),
    (v_recipe_id, 'maïzena',                   0.5, 'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'riz jaune cuit',            4,   'portion',    true,  18, NULL),
    (v_recipe_id, 'laitue',                    100, 'g',          true,  19, 'ciselée'),
    (v_recipe_id, 'cornichons',                60,  'g',          true,  20, 'hachés'),
    (v_recipe_id, 'mélasse de grenade',        2,   'c. à soupe', true,  21, NULL);

  -- =====================================================================
  -- 7. Chipotle Chicken Elote Rice Bowl
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chipotle Chicken Elote Rice Bowl',
    'Bol mexicain : cuisses de poulet marinées au chipotle adobo, maïs elote crémeux à la mayo-crema-cotija et avocat sur riz blanc.',
    $instr$["Pour l'elote : faire fondre le beurre dans une poêle à feu moyen. Sauter le maïs jusqu'à coloration dorée. Transférer dans un saladier.",
"Incorporer mayo, crema, jus de citron vert, poudre de chili, cayenne, cotija et sel. Plier coriandre. Réserver.",
"Combiner huile d'olive, ail, pâte chipotle adobo, paprika fumé, origan, cumin, sel, poivre et oignon en poudre. Mélanger les cuisses de poulet dans cette marinade.",
"Cuire dans une poêle huilée à feu moyen jusqu'à brunissement et cuisson complète, en retournant. Reposer puis hacher en bouchées.",
"Assembler : riz dans les bols, laitue, avocat, elote et poulet. Finir avec coriandre, trait de crème fraîche et cotija."]
$instr$,
    10, 20, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','chipotle','poulet','elote','maïs','bol','30min'],
    'manual',
    'https://moribyan.com/mexican-inspired-chipotle-chicken-elote-rice-bowl/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'maïs',                      270, 'g',          true,  1,  '1,5 tasse, frais ou surgelé'),
    (v_recipe_id, 'beurre doux',               20,  'g',          true,  2,  NULL),
    (v_recipe_id, 'mayonnaise',                30,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'crema mexicaine',           30,  'ml',         true,  4,  'ou crème aigre'),
    (v_recipe_id, 'jus de citron vert',        7.5, 'ml',         true,  5,  NULL),
    (v_recipe_id, 'poudre de chili',           0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'piment de Cayenne',         1,   'pincée',     true,  7,  NULL),
    (v_recipe_id, 'cotija',                    30,  'g',          true,  8,  'émietté'),
    (v_recipe_id, 'coriandre fraîche',         15,  'g',          true,  9,  'hachée'),
    (v_recipe_id, 'cuisses de poulet désossées', 600, 'g',         true,  10, NULL),
    (v_recipe_id, 'huile d''olive',            15,  'ml',         true,  11, NULL),
    (v_recipe_id, 'ail émincé',                2,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'pâte chipotle adobo',       2,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'paprika fumé',              1,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'origan séché',              1,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'cumin moulu',               0.5, 'c. à café',  true,  16, NULL),
    (v_recipe_id, 'oignon en poudre',          0.5, 'c. à café',  true,  17, NULL),
    (v_recipe_id, 'riz blanc cuit',            4,   'portion',    true,  18, NULL),
    (v_recipe_id, 'laitue',                    100, 'g',          true,  19, 'ciselée'),
    (v_recipe_id, 'avocat',                    1,   'unité',      true,  20, 'tranché'),
    (v_recipe_id, 'crème aigre',               4,   'c. à soupe', false, 21, NULL);

  -- =====================================================================
  -- 8. Chicken Caesar Smash Burgers
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Caesar Smash Burgers',
    'Smash burgers de poulet juteux à bords croustillants, double cheddar fondu et salade César maison (romaine, croûtons, parmesan) dans pain brioché.',
    $instr$["Fouetter les ingrédients de la sauce César (mayo, buttermilk, citron, Worcestershire, ail, moutarde, anchois, persil, poivre, parmesan) jusqu'à lisse et crémeux. Réfrigérer.",
"Diviser le poulet haché en 5 portions, rouler en boules et aplatir complètement sur papier cuisson.",
"Chauffer une plaque ou poêle en fonte à feu moyen-vif. Faire fondre le beurre et déposer une boulette.",
"Saler poivrer et paprika le dessus. Smasher et saisir 3 minutes jusqu'à doré.",
"Retourner, assaisonner et cuire 3 minutes de plus jusqu'à cuisson complète.",
"Garnir chaque steak d'une tranche de cheddar (empiler 2 pour des doubles burgers).",
"Beurrer les pains et les toaster jusqu'à dorer.",
"Mélanger romaine, croûtons, persil, parmesan et sauce César dans un saladier, mélanger délicatement.",
"Tartiner les 2 faces de pain de sauce, empiler les steaks et la salade César. Servir immédiatement."]
$instr$,
    15, 15, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','burger','smash','poulet','césar','romaine','parmesan'],
    'manual',
    'https://moribyan.com/chicken-caesar-smash-burgers/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'mayonnaise',                180, 'ml',         true,  1,  'pour la sauce César'),
    (v_recipe_id, 'buttermilk',                60,  'ml',         true,  2,  'pour la sauce'),
    (v_recipe_id, 'jus de citron',             15,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'sauce Worcestershire',      7.5, 'ml',         true,  4,  NULL),
    (v_recipe_id, 'ail émincé',                2,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'moutarde jaune',            2,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'pâte d''anchois',           1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'persil séché',              1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'parmesan râpé',             50,  'g',          true,  9,  NULL),
    (v_recipe_id, 'poulet haché',              450, 'g',          true,  10, NULL),
    (v_recipe_id, 'beurre doux',               30,  'g',          true,  11, 'pour cuire'),
    (v_recipe_id, 'tranches de cheddar',       6,   'unité',      true,  12, 'fromage américain blanc'),
    (v_recipe_id, 'pains briochés',            4,   'unité',      true,  13, NULL),
    (v_recipe_id, 'romaine',                   1,   'unité',      true,  14, 'tête hachée'),
    (v_recipe_id, 'croûtons',                  100, 'g',          true,  15, 'légèrement écrasés'),
    (v_recipe_id, 'persil frais',              30,  'ml',         false, 16, 'haché');

  -- =====================================================================
  -- 9. Sweet & Savory Chicken Brothy Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Sweet & Savory Chicken Brothy Rice',
    'Cuisses de poulet glacées soja-miel sur riz jasmin trempé dans bouillon crémeux épicé au gochujang et parmesan (Buldak-inspired).',
    $instr$["Sécher les cuisses de poulet, les assaisonner de sel, poivre et maïzena.",
"Chauffer l'huile dans une grande poêle à feu moyen. Saisir les cuisses 6-7 minutes par face jusqu'à doré.",
"Fouetter miel, cassonade, eau, sauce soja et vinaigre de riz.",
"Verser le glaze sur le poulet et laisser mijoter 2-3 minutes jusqu'à épaississement.",
"Pour le bouillon : faire fondre le beurre dans une casserole. Sauter l'ail 1 minute.",
"Incorporer le gochujang et cuire 1-2 minutes.",
"Verser crème, lait, cube de bouillon émietté, sauce soja, paprika, sucre, oignon en poudre et flocons de piment.",
"Laisser frémir 5-7 minutes en remuant souvent jusqu'à crème légère.",
"Dresser : riz jasmin chaud dans les bols, verser le bouillon crémeux dessus, trancher les cuisses et déposer par-dessus. Garnir d'oignons nouveaux."]
$instr$,
    15, 25, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['fusion','coréen','poulet','gochujang','crémeux','brothy','buldak'],
    'manual',
    'https://moribyan.com/sweet-savory-chicken-with-spicy-carbonara-brothy-rice/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet désossées', 680, 'g',         true,  1,  NULL),
    (v_recipe_id, 'maïzena',                   2,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'huile neutre',              1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'miel',                      2,   'c. à soupe', true,  4,  'pour le glaze'),
    (v_recipe_id, 'cassonade',                 15,  'g',          true,  5,  'pour le glaze'),
    (v_recipe_id, 'eau',                       30,  'ml',         true,  6,  'pour le glaze'),
    (v_recipe_id, 'sauce soja allégée',        60,  'ml',         true,  7,  'pour le glaze'),
    (v_recipe_id, 'vinaigre de riz',           15,  'ml',         true,  8,  'pour le glaze'),
    (v_recipe_id, 'beurre doux',               45,  'g',          true,  9,  'pour le bouillon'),
    (v_recipe_id, 'ail émincé',                1,   'c. à soupe', true,  10, 'pour le bouillon'),
    (v_recipe_id, 'gochujang',                 45,  'g',          true,  11, NULL),
    (v_recipe_id, 'crème allégée',             240, 'ml',         true,  12, 'half and half'),
    (v_recipe_id, 'lait entier',               180, 'ml',         true,  13, NULL),
    (v_recipe_id, 'cube de bouillon de poulet', 1,  'unité',      true,  14, 'gros'),
    (v_recipe_id, 'sauce soja allégée',        0.5, 'c. à soupe', true,  15, 'pour le bouillon'),
    (v_recipe_id, 'paprika',                   2,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'oignon en poudre',          0.5, 'c. à café',  true,  18, NULL),
    (v_recipe_id, 'flocons de piment',         0.75, 'c. à café', true,  19, NULL),
    (v_recipe_id, 'parmesan râpé',             30,  'g',          false, 20, 'optionnel'),
    (v_recipe_id, 'riz jasmin cuit',           4,   'portion',    true,  21, NULL),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 22, 'tranchés, garniture');

  -- =====================================================================
  -- 10. Turkish Bulgur Pilaf & Adana Kebab
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Turkish Bulgur Pilaf & Adana Kebab',
    'Kebab d''Adana à l''agneau épicé (paprika, Aleppo) à l''air fryer, sur pilaf de boulgour à la tomate, sauce yaourt aux herbes et salade d''oignon-sumac.',
    $instr$["Pilaf de boulgour : rincer le boulgour plusieurs fois jusqu'à eau claire, égoutter.",
"Chauffer huile d'olive et beurre dans une casserole à feu moyen jusqu'à fonte.",
"Ajouter l'ail et la concentré de tomate, sauter 1-2 minutes jusqu'à parfum et coloration.",
"Incorporer poivron, tomate râpée et oignon râpé. Sauter 2-3 minutes jusqu'à attendrir.",
"Ajouter le boulgour, remuer pour enrober, toaster 1-2 minutes.",
"Verser le bouillon de poulet, assaisonner sel et paprika. Bien mélanger.",
"Porter à ébullition, réduire à feu doux, couvrir et laisser frémir 20-25 minutes.",
"Éteindre, laisser reposer couvert 10 minutes puis défaire à la fourchette.",
"Kebab Adana : combiner agneau haché, poivron, ail, paprika, sel, Aleppo et poivre sans surtravailler.",
"Étaler sur un papier cuisson en rectangle d'épaisseur 1,5 cm, diviser en formes allongées et marquer des lignes au dos d'une spatule.",
"Air fry à 220°C pendant 12 minutes jusqu'à cuisson et léger charbon.",
"Sauce yaourt : fouetter yaourt, mayo, ail, poivre, thym, origan et menthe séchée.",
"Salade d'oignon : mélanger oignon rouge tranché, persil haché, sumac, sel et huile d'olive.",
"Dresser : pilaf, kebabs par-dessus, filet de sauce yaourt, salade d'oignon-persil, chou pickle, salade verte et piment vert."]
$instr$,
    20, 25, 4, 3,
    'Méditerranéenne', 'dinner',
    ARRAY['turc','méditerranéen','adana','kebab','agneau','boulgour','air fryer','sumac'],
    'manual',
    'https://moribyan.com/turkish-bulgur-pilaf-adana-kebab/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile d''olive',            1,   'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'beurre doux',               14,  'g',          true,  2,  NULL),
    (v_recipe_id, 'ail émincé',                2,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'concentré de tomates',      2,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'poivron rouge',             0.5, 'unité',      true,  5,  'finement coupé'),
    (v_recipe_id, 'tomate Roma',               1,   'unité',      true,  6,  'râpée'),
    (v_recipe_id, 'oignon jaune',              0.5, 'unité',      true,  7,  'râpé'),
    (v_recipe_id, 'boulgour gros',             270, 'g',          true,  8,  '#3'),
    (v_recipe_id, 'bouillon de poulet',        600, 'ml',         true,  9,  NULL),
    (v_recipe_id, 'paprika',                   1,   'c. à café',  true,  10, 'pour le pilaf'),
    (v_recipe_id, 'agneau haché',              454, 'g',          true,  11, 'pour les kebabs'),
    (v_recipe_id, 'poivron rouge',             1,   'unité',      true,  12, 'finement coupé, kebabs'),
    (v_recipe_id, 'ail émincé',                2,   'c. à café',  true,  13, 'pour les kebabs'),
    (v_recipe_id, 'paprika',                   2,   'c. à café',  true,  14, 'pour les kebabs'),
    (v_recipe_id, 'flocons piment Aleppo',     1,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'yaourt nature entier',      120, 'ml',         true,  16, 'pour la sauce'),
    (v_recipe_id, 'mayonnaise',                60,  'ml',         true,  17, 'pour la sauce yaourt'),
    (v_recipe_id, 'thym séché',                0.25, 'c. à café', true,  18, NULL),
    (v_recipe_id, 'origan séché',              0.25, 'c. à café', true,  19, NULL),
    (v_recipe_id, 'menthe séchée',             0.25, 'c. à café', true,  20, NULL),
    (v_recipe_id, 'oignon rouge',              0.5, 'unité',      true,  21, 'finement tranchée'),
    (v_recipe_id, 'persil frais',              6,   'g',          true,  22, 'haché'),
    (v_recipe_id, 'sumac',                     0.75, 'c. à café', true,  23, NULL),
    (v_recipe_id, 'huile d''olive',            5,   'ml',         true,  24, 'pour la salade');

  -- =====================================================================
  -- 11. Chicken Shawarma Potato Bowls
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Shawarma Potato Bowls',
    'Bowl shawarma sans pain : cuisses de poulet marinées aux épices méditerranéennes, pommes de terre rôties croustillantes, sauce blanche ail-yaourt et mélasse de grenade.',
    $instr$["Combiner huile d'olive, jus de citron, ail et épices (allspice, coriandre, paprika, sel, sumac, poivre, curcuma). Enrober les cuisses et mariner 30 minutes minimum.",
"Saisir le poulet dans une poêle à feu moyen-vif, 5-6 minutes par face jusqu'à cuisson complète.",
"Laisser reposer brièvement, puis hacher en bouchées.",
"Peler et couper les pommes de terre en cubes. Les enrober d'huile, maïzena, sel et poivre.",
"Cuire à l'air fryer à 200°C pendant 20-25 minutes (en secouant à mi-cuisson) OU au four à 220°C pendant 35-40 minutes.",
"Fouetter mayonnaise, crème aigre, ail, sucre, jus de citron, poivre et eau jusqu'à lisse pour la sauce blanche.",
"Dresser : pommes de terre, laitue, poulet, cornichons, sauce blanche et filet de mélasse de grenade."]
$instr$,
    20, 40, 3, 2,
    'Libanaise', 'dinner',
    ARRAY['libanais','méditerranéen','shawarma','poulet','pommes de terre','air fryer','bol'],
    'manual',
    'https://moribyan.com/chicken-shawarma-potato-bowls/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet désossées', 454, 'g',         true,  1,  NULL),
    (v_recipe_id, 'huile d''olive',            2,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'jus de citron',             1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'ail émincé',                2,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'allspice',                  0.5, 'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'coriandre moulue',          1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'paprika',                   1.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sumac',                     1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'curcuma',                   0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'pommes de terre russet',    3,   'unité',      true,  10, NULL),
    (v_recipe_id, 'huile neutre',              2,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'maïzena',                   1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'mayonnaise',                180, 'ml',         true,  13, NULL),
    (v_recipe_id, 'crème aigre',               80,  'ml',         true,  14, 'ou yaourt'),
    (v_recipe_id, 'gousses d''ail',            4,   'unité',      true,  15, 'pour la sauce'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'jus de citron',             0.5, 'unité',      true,  17, NULL),
    (v_recipe_id, 'eau',                       3,   'c. à soupe', true,  18, 'pour la sauce'),
    (v_recipe_id, 'laitue',                    100, 'g',          true,  19, 'ciselée'),
    (v_recipe_id, 'cornichons',                60,  'g',          true,  20, 'hachés'),
    (v_recipe_id, 'mélasse de grenade',        2,   'c. à soupe', true,  21, NULL);

  -- =====================================================================
  -- 12. Korean Animal Style Loaded Fries
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Korean Animal Style Loaded Fries',
    'Frites loaded fusion : style animal d''In-N-Out version coréenne avec bulgogi, oignons confits, cheddar fondant et sauce mayo-kimchi-gochujang.',
    $instr$["Sauce In-N-Out : combiner mayo, kimchi finement haché, gochujang et sucre. Mélanger jusqu'à crème lisse. Réfrigérer.",
"Oignons confits : chauffer huile à feu moyen, ajouter oignons coupés avec sel. Cuire 20-30 minutes en déglaçant à l'eau, jusqu'à coloration dorée profonde.",
"Bulgogi : trancher le faux-filet finement. Assaisonner sel, poivre, poudre de chili. Saisir dans l'huile chaude. Verser la marinade combinée (purée de poire asiatique, soja, cassonade, sésame, ail, gingembre, vinaigre, piment). Laisser caraméliser. Réserver.",
"Cuire les frites jusqu'à dorer et croustillant. Transférer sur plaque chaude.",
"Couvrir de tranches de cheddar et passer au four à 200°C pendant 4-5 minutes (ou grill 1-2 minutes) jusqu'à fonte.",
"Garnir du bulgogi, oignons confits, oignons nouveaux et nappage généreux de sauce kimchi-gochujang. Servir immédiatement."]
$instr$,
    30, 30, 5, 3,
    'Coréenne', 'snack',
    ARRAY['fusion','coréen','américain','frites','bulgogi','copycat','in-n-out','loaded'],
    'manual',
    'https://moribyan.com/korean-style-in-n-out-loaded-animal-fries/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'mayonnaise',                120, 'ml',         true,  1,  'pour la sauce'),
    (v_recipe_id, 'kimchi',                    60,  'g',          true,  2,  'finement haché'),
    (v_recipe_id, 'gochujang',                 2,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'sucre',                     5,   'g',          true,  4,  'pour la sauce'),
    (v_recipe_id, 'faux-filet',                450, 'g',          true,  5,  'finement tranché'),
    (v_recipe_id, 'purée de poire asiatique',  60,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'sauce soja allégée',        60,  'ml',         true,  7,  NULL),
    (v_recipe_id, 'cassonade',                 45,  'g',          true,  8,  NULL),
    (v_recipe_id, 'huile de sésame',           22,  'ml',         true,  9,  NULL),
    (v_recipe_id, 'ail émincé',                15,  'g',          true,  10, NULL),
    (v_recipe_id, 'pâte de gingembre',         7.5, 'g',          true,  11, NULL),
    (v_recipe_id, 'vinaigre de riz',           15,  'ml',         true,  12, NULL),
    (v_recipe_id, 'flocons de piment',         5,   'g',          true,  13, NULL),
    (v_recipe_id, 'oignon jaune',              1,   'unité',      true,  14, 'gros, coupé'),
    (v_recipe_id, 'huile végétale',            7.5, 'ml',         true,  15, NULL),
    (v_recipe_id, 'frites surgelées',          570, 'g',          true,  16, NULL),
    (v_recipe_id, 'tranches de cheddar',       6,   'unité',      true,  17, 'américain'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 18, 'tranchés');

  -- =====================================================================
  -- 13. Philly Cheesesteak Sliders
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Philly Cheesesteak Sliders',
    'Sliders à partager garnis de bœuf émincé, oignons-poivrons confits et fromage fondu dans des Hawaiian rolls beurrés au sésame. Idéal soirée match.',
    $instr$["Sauter oignon et poivron dans l'huile à feu moyen 5-7 minutes jusqu'à tendreté. Ajouter l'ail 1-2 minutes. Réserver.",
"Dans la même poêle, cuire le bœuf émincé avec beurre et huile à feu moyen-vif. Émietter et assaisonner sel, paprika, moutarde en poudre et poivre.",
"Bien faire dorer, ajouter sauce Worcestershire. Déglacer au bouillon de bœuf, laisser frémir 2 minutes jusqu'à réduction.",
"Toaster les Hawaiian rolls (couche fine de mayo, 4-5 minutes à 175°C).",
"Assembler : étaler le bœuf sur le bas des pains, légumes, puis fromage.",
"Refermer avec les pains du dessus. Badigeonner de beurre fondu et parsemer de graines de sésame.",
"Couvrir d'aluminium et cuire 10-15 minutes au four pour faire fondre le fromage.",
"Découvrir 5 minutes pour dorer le dessus. Laisser tiédir, puis séparer en sliders individuels."]
$instr$,
    15, 25, 6, 2,
    'Américaine', 'snack',
    ARRAY['américain','sliders','philly','cheesesteak','bœuf','convivial','match'],
    'manual',
    'https://moribyan.com/philly-cheesesteak-sliders/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf finement émincé',      454, 'g',          true,  1,  NULL),
    (v_recipe_id, 'beurre doux',               14,  'g',          true,  2,  NULL),
    (v_recipe_id, 'huile neutre',              2,   'c. à soupe', true,  3,  '1 pour bœuf + 1 pour légumes'),
    (v_recipe_id, 'paprika',                   1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'moutarde en poudre',        0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'sauce Worcestershire',      1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'bouillon de bœuf',          60,  'ml',         true,  7,  NULL),
    (v_recipe_id, 'oignon jaune',              0.5, 'unité',      true,  8,  'gros, coupé'),
    (v_recipe_id, 'poivron vert',              1,   'unité',      true,  9,  'finement tranchée'),
    (v_recipe_id, 'ail émincé',                0.5, 'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'pack de Hawaiian rolls',    12,  'unité',      true,  11, 'mini-pains briochés sucrés'),
    (v_recipe_id, 'tranches de cheese whiz',   6,   'unité',      true,  12, 'ou provolone'),
    (v_recipe_id, 'beurre doux fondu',         30,  'g',          true,  13, 'pour le dessus'),
    (v_recipe_id, 'graines de sésame',         1,   'c. à soupe', false, 14, 'topping');

  -- =====================================================================
  -- 14. Burger Salad
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Burger Salad',
    'Toutes les saveurs du burger sans le pain : bœuf haché épicé Worcestershire, cheddar fondant, oignons confits, cornichons et sauce burger maison sur lit de laitue.',
    $instr$["Sauce burger : mélanger mayonnaise, pickle relish drainé, ketchup et sucre. Réserver.",
"Oignons confits : chauffer huile dans une poêle à feu moyen, ajouter oignon coupé et sel.",
"Cuire en remuant 15-20 minutes jusqu'à doré et tendre. Ajouter de l'eau par cuillère si ça colle.",
"Bœuf : faire fondre le beurre dans une poêle à feu moyen-vif. Ajouter le bœuf haché, sel et poivre.",
"Incorporer Worcestershire, bouillon de bœuf et moutarde. Cuire jusqu'à brunissement.",
"Diviser en portions, surmonter de tranches de cheddar et couvrir jusqu'à fonte.",
"Dresser : laitue ciselée en base, bœuf au fromage par-dessus, cornichons, pepperoncinis, persil et oignons confits.",
"Arroser de sauce burger et mélanger délicatement avant de servir."]
$instr$,
    10, 35, 3, 1,
    'Américaine', 'dinner',
    ARRAY['américain','salade','burger','bœuf','low-carb','réconfortant'],
    'manual',
    'https://moribyan.com/burger-salad/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'mayonnaise',                80,  'ml',         true,  1,  'pour la sauce'),
    (v_recipe_id, 'pickle relish',             60,  'ml',         true,  2,  'égoutté'),
    (v_recipe_id, 'ketchup',                   45,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'sucre',                     5,   'g',          true,  4,  'pour la sauce'),
    (v_recipe_id, 'oignon jaune',              1,   'unité',      true,  5,  'gros, coupé'),
    (v_recipe_id, 'huile végétale',            7.5, 'ml',         true,  6,  NULL),
    (v_recipe_id, 'beurre doux',               15,  'g',          true,  7,  'ou huile d''avocat'),
    (v_recipe_id, 'bœuf haché 90/10',          454, 'g',          true,  8,  NULL),
    (v_recipe_id, 'sauce Worcestershire',      7.5, 'ml',         true,  9,  NULL),
    (v_recipe_id, 'bouillon de bœuf',          60,  'ml',         true,  10, NULL),
    (v_recipe_id, 'moutarde jaune',            5,   'ml',         true,  11, NULL),
    (v_recipe_id, 'tranches de cheddar',       4,   'unité',      true,  12, 'américain'),
    (v_recipe_id, 'laitue iceberg',            300, 'g',          true,  13, 'ciselée'),
    (v_recipe_id, 'cornichons dill',           60,  'g',          true,  14, 'en tranches'),
    (v_recipe_id, 'pepperoncinis',             60,  'g',          true,  15, 'hachés'),
    (v_recipe_id, 'persil frais',              15,  'ml',         false, 16, 'haché');

  -- =====================================================================
  -- 15. Taco Salad
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Taco Salad',
    'Bowl mexicain : bœuf épicé taco (chili, cumin, fumé), sauce mayo-chipotle adobo, tortillas écrasées, avocat et fromage râpé sur romaine fraîche.',
    $instr$["Chauffer l'huile d'olive dans une grande poêle à feu moyen.",
"Ajouter le bœuf haché et cuire jusqu'à brunissement en l'émiettant à la cuillère.",
"Incorporer ail, chili powder, coriandre, sel, paprika fumé, cumin, origan, poivre et oignon en poudre.",
"Verser sauce tomate et bouillon de bœuf. Laisser frémir jusqu'à épaississement.",
"Incorporer la coriandre et retirer du feu.",
"Sauce chipotle : combiner mayo, jus de citron vert, miel, chili powder et pâte chipotle. Bien mélanger.",
"Assembler : romaine en base, bœuf au-dessus, fromage râpé, tomates, avocat. Arroser de sauce chipotle, dollops de crème aigre.",
"Surmonter de chips de tortilla écrasés et coriandre. Servir immédiatement."]
$instr$,
    15, 15, 3, 1,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','salade','taco','bœuf','chipotle','low-carb','rapide'],
    'manual',
    'https://moribyan.com/taco-salad/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché 90/10',          454, 'g',          true,  1,  NULL),
    (v_recipe_id, 'huile d''olive',            1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'ail émincé',                2,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'chili powder',              2,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'coriandre moulue',          1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'paprika fumé',              1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'cumin moulu',               1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'origan séché',              1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'oignon en poudre',          0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'sauce tomate',              60,  'ml',         true,  10, NULL),
    (v_recipe_id, 'bouillon de bœuf',          60,  'ml',         true,  11, NULL),
    (v_recipe_id, 'coriandre fraîche',         15,  'g',          true,  12, 'finement hachée'),
    (v_recipe_id, 'mayonnaise',                180, 'ml',         true,  13, 'pour la sauce'),
    (v_recipe_id, 'citron vert',               1,   'unité',      true,  14, 'jus'),
    (v_recipe_id, 'miel',                      1,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'pâte chipotle adobo',       3,   'c. à soupe', true,  16, '3-4 selon piquant'),
    (v_recipe_id, 'romaine',                   400, 'g',          true,  17, 'hachée'),
    (v_recipe_id, 'tomates',                   200, 'g',          true,  18, 'coupées'),
    (v_recipe_id, 'avocat',                    1,   'unité',      true,  19, 'tranché'),
    (v_recipe_id, 'fromage râpé mexicain',     100, 'g',          true,  20, 'cheddar ou mix'),
    (v_recipe_id, 'tortillas chips',           80,  'g',          true,  21, 'écrasés'),
    (v_recipe_id, 'crème aigre',               120, 'ml',         true,  22, NULL);

  -- =====================================================================
  -- 16. Grilled Cheese Burrito (Taco Bell)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Grilled Cheese Burrito (Taco Bell)',
    'Copycat Taco Bell : burrito au bœuf épicé, riz espagnol, sauce chipotle, nacho cheese et croûte de fromage râpé grillée directement sur la plancha.',
    $instr$["Bœuf : chauffer l'huile d'olive dans une grande poêle à feu moyen. Ajouter le bœuf haché et cuire jusqu'à brunissement en l'émiettant.",
"Incorporer ail, chili powder, coriandre, sel, paprika, cumin, origan, poivre et oignon en poudre. Cuire 1 minute.",
"Ajouter bouillon de bœuf et sauce tomate. Laisser frémir 5 minutes pour développer les saveurs.",
"Riz espagnol : faire fondre le beurre dans une casserole à feu moyen. Ajouter le riz et toaster en remuant.",
"Incorporer bouillon, sauce tomate, sel, cumin, ail en poudre et oignon en poudre. Porter à ébullition.",
"Réduire à feu doux, couvrir et laisser cuire jusqu'à absorption complète. Défaire à la fourchette.",
"Sauce chipotle : fouetter mayo, crème aigre, jus de citron vert, miel, poivre, chili powder et pâte adobo. Ajuster le piquant.",
"Réchauffer les tortillas au micro-ondes ou sur poêle pour les assouplir.",
"Étaler la sauce chipotle au centre de chaque tortilla, ajouter riz, nacho cheese, crème aigre, tortilla strips et bœuf.",
"Replier les côtés et rouler serré depuis le bas.",
"Chauffer une plancha à feu moyen, saupoudrer le fromage râpé mexicain directement sur la surface.",
"Poser le burrito sur le fromage, cuire 2-3 minutes par face jusqu'à doré et croustillant. Servir chaud."]
$instr$,
    30, 60, 4, 3,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','burrito','copycat','taco bell','bœuf','riz espagnol','fromage'],
    'manual',
    'https://moribyan.com/grilled-cheese-burrito-taco-bell-copycat/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché 90/10',          454, 'g',          true,  1,  NULL),
    (v_recipe_id, 'huile d''olive',            1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'ail émincé',                2,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'chili powder',              2,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'coriandre moulue',          1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'paprika fumé',              1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'cumin moulu',               1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'origan séché',              1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'bouillon de bœuf',          60,  'ml',         true,  9,  NULL),
    (v_recipe_id, 'sauce tomate',              80,  'ml',         true,  10, NULL),
    (v_recipe_id, 'beurre doux',               20,  'g',          true,  11, 'pour le riz'),
    (v_recipe_id, 'riz jasmin',                200, 'g',          true,  12, NULL),
    (v_recipe_id, 'bouillon de poulet',        360, 'ml',         true,  13, NULL),
    (v_recipe_id, 'sauce tomate',              120, 'ml',         true,  14, 'pour le riz'),
    (v_recipe_id, 'mayonnaise',                180, 'ml',         true,  15, 'pour la sauce chipotle'),
    (v_recipe_id, 'crème aigre',               60,  'ml',         true,  16, 'pour la sauce'),
    (v_recipe_id, 'citron vert',               1,   'unité',      true,  17, 'jus'),
    (v_recipe_id, 'miel',                      0.5, 'c. à soupe', true,  18, NULL),
    (v_recipe_id, 'pâte chipotle adobo',       3,   'c. à soupe', true,  19, NULL),
    (v_recipe_id, 'tortillas grandes',         5,   'unité',      true,  20, NULL),
    (v_recipe_id, 'nacho cheese',              120, 'g',          true,  21, NULL),
    (v_recipe_id, 'tortilla strips',           60,  'g',          true,  22, NULL),
    (v_recipe_id, 'fromage râpé mexicain',     120, 'g',          true,  23, 'pour la croûte');

  -- =====================================================================
  -- 17. Bibimbap
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bibimbap',
    'Bol coréen complet : bulgogi mariné, légumes assaisonnés (shiitake, carotte, épinards, concombre pickle, germes), œuf au plat et sauce gochujang crémeuse au kewpie mayo.',
    $instr$["Bulgogi : combiner sauce soja, cassonade, huile sésame, ail, gingembre, chili powder, flocons piment, poivre, huile d'olive et vinaigre de riz. Ajouter steak et oignon tranchés, mariner 30 minutes minimum.",
"Cuire le bœuf mariné dans une poêle chaude jusqu'à caramélisation complète.",
"Champignons : sauter dans le beurre avec sel/poivre à feu moyen jusqu'à tendreté.",
"Carottes : sauter dans eau et huile de sésame avec sel jusqu'à tendreté.",
"Épinards : sauter dans une poêle huilée avec sel, couvrir 2-3 minutes jusqu'à flétrissement.",
"Concombre pickle : mélanger concombre coupé avec chili paste, sucre, vinaigre de riz, eau chaude et sel. Laisser pickler.",
"Pousses de soja : blanchir 10 minutes à l'eau bouillante puis égoutter.",
"Sauce gochujang : combiner gochujang, soja, huile de sésame, sucre, eau, kewpie mayo et vinaigre de riz. Mélanger jusqu'à crème.",
"Dresser : riz jasmin dans un bol, arranger autour bulgogi, champignons, carottes, épinards, concombre pickle et pousses.",
"Arroser généreusement de sauce gochujang, surmonter d'œuf au plat et oignons nouveaux. Mélanger avant de manger."]
$instr$,
    30, 60, 3, 3,
    'Coréenne', 'dinner',
    ARRAY['coréen','bibimbap','bulgogi','riz','légumes','œuf','gochujang','bol'],
    'manual',
    'https://moribyan.com/bibimbap/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'faux-filet ou bavette',     454, 'g',          true,  1,  'finement tranché'),
    (v_recipe_id, 'oignon jaune',              60,  'g',          true,  2,  'finement tranchée'),
    (v_recipe_id, 'sauce soja allégée',        60,  'ml',         true,  3,  'pour la marinade'),
    (v_recipe_id, 'cassonade',                 30,  'g',          true,  4,  NULL),
    (v_recipe_id, 'huile de sésame',           22,  'ml',         true,  5,  'pour la marinade'),
    (v_recipe_id, 'ail émincé',                15,  'g',          true,  6,  NULL),
    (v_recipe_id, 'pâte de gingembre',         7.5, 'g',          true,  7,  NULL),
    (v_recipe_id, 'chili powder',              10,  'g',          true,  8,  NULL),
    (v_recipe_id, 'flocons de piment',         2.5, 'g',          true,  9,  '2,5-5g'),
    (v_recipe_id, 'huile d''olive',            15,  'ml',         true,  10, NULL),
    (v_recipe_id, 'vinaigre de riz',           15,  'ml',         true,  11, NULL),
    (v_recipe_id, 'champignons shiitake',      240, 'g',          true,  12, 'hachés'),
    (v_recipe_id, 'beurre doux',               15,  'g',          true,  13, NULL),
    (v_recipe_id, 'carottes',                  240, 'g',          true,  14, 'en julienne'),
    (v_recipe_id, 'épinards',                  720, 'g',          true,  15, NULL),
    (v_recipe_id, 'concombre',                 240, 'g',          true,  16, 'coupé'),
    (v_recipe_id, 'pâte de piment',            15,  'ml',         true,  17, NULL),
    (v_recipe_id, 'sucre',                     7.5, 'g',          true,  18, 'pour les pickles'),
    (v_recipe_id, 'vinaigre de riz',           60,  'ml',         true,  19, 'pour les pickles'),
    (v_recipe_id, 'germes de soja',            240, 'g',          true,  20, NULL),
    (v_recipe_id, 'gochujang',                 120, 'ml',         true,  21, 'pour la sauce'),
    (v_recipe_id, 'sauce soja allégée',        15,  'ml',         true,  22, 'pour la sauce'),
    (v_recipe_id, 'sucre',                     22,  'g',          true,  23, 'pour la sauce'),
    (v_recipe_id, 'kewpie mayo',               60,  'ml',         true,  24, NULL),
    (v_recipe_id, 'œufs',                      3,   'unité',      true,  25, 'au plat'),
    (v_recipe_id, 'riz jasmin cuit',           3,   'portion',    true,  26, NULL),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 27, 'hachés');

  -- =====================================================================
  -- 18. Chicken Kabsa
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Kabsa',
    'Plat national d''Arabie saoudite : cuisses de poulet épicées (cardamome, cannelle, citron noir) sur riz basmati infusé à la tomate. Garniture amandes, raisins et oignons frits.',
    $instr$["Chauffer le ghee dans une grande cocotte. Sauter ail, gingembre, concentré de tomates et oignon jusqu'à translucidité (5 minutes).",
"Ajouter les épices entières (laurier, cardamome, clous, cannelle, citrons noirs) et 75% du mélange kabsa. Toaster 2-3 minutes.",
"Disposer les cuisses de poulet peau vers le bas, faire saisir 5-7 minutes jusqu'à doré croustillant.",
"Verser les tomates en purée. Couvrir et laisser frémir 30 minutes à feu doux.",
"Préchauffer le four à 200°C. Transférer le poulet sur une plaque, saupoudrer du reste du mélange et rôtir 15-20 minutes.",
"Ajouter le riz basmati rincé dans la cocotte. Toaster quelques minutes jusqu'à coloration légère.",
"Verser bouillon et sel. Porter à ébullition puis baisser à feu doux, couvrir et cuire 20 minutes.",
"Retirer du feu et laisser reposer couvert 10-15 minutes.",
"Défaire le riz à la fourchette, transférer sur un plat et arranger le poulet rôti dessus.",
"Garnir d'amandes effilées, raisins, oignons frits et persil. Servir chaud."]
$instr$,
    30, 60, 7, 3,
    'Libanaise', 'dinner',
    ARRAY['arabie saoudite','moyen-orient','kabsa','poulet','riz basmati','épices','plat unique'],
    'manual',
    'https://moribyan.com/chicken-kabsa/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ghee',                      60,  'ml',         true,  1,  'ou beurre clarifié'),
    (v_recipe_id, 'ail émincé',                1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'pâte de gingembre',         1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'concentré de tomates',      60,  'ml',         true,  4,  NULL),
    (v_recipe_id, 'oignon jaune',              1,   'unité',      true,  5,  'moyen, coupé'),
    (v_recipe_id, 'tomates',                   2,   'unité',      true,  6,  'mixées'),
    (v_recipe_id, 'cuisses de poulet',         4,   'unité',      true,  7,  'avec peau'),
    (v_recipe_id, 'feuilles de laurier',       4,   'unité',      true,  8,  NULL),
    (v_recipe_id, 'cardamome',                 6,   'unité',      true,  9,  'gousses'),
    (v_recipe_id, 'clous de girofle',          6,   'unité',      true,  10, NULL),
    (v_recipe_id, 'bâtons de cannelle',        2,   'unité',      true,  11, NULL),
    (v_recipe_id, 'citrons noirs séchés',      3,   'unité',      true,  12, 'loomi'),
    (v_recipe_id, 'piment vert',               1,   'unité',      false, 13, 'optionnel'),
    (v_recipe_id, 'coriandre moulue',          2,   'c. à café',  true,  14, 'mélange kabsa'),
    (v_recipe_id, 'cardamome moulue',          0.5, 'c. à café',  true,  15, NULL),
    (v_recipe_id, 'cannelle moulue',           0.5, 'c. à café',  true,  16, NULL),
    (v_recipe_id, 'curcuma',                   0.5, 'c. à café',  true,  17, NULL),
    (v_recipe_id, 'oignon en poudre',          1,   'c. à café',  true,  18, NULL),
    (v_recipe_id, 'chili powder',              2,   'c. à café',  true,  19, NULL),
    (v_recipe_id, '7 épices libanais',         2,   'c. à café',  true,  20, NULL),
    (v_recipe_id, 'riz basmati',               500, 'g',          true,  21, 'rincé, trempé'),
    (v_recipe_id, 'bouillon de poulet',        1000, 'ml',        true,  22, NULL),
    (v_recipe_id, 'amandes effilées',          40,  'g',          false, 23, 'garniture'),
    (v_recipe_id, 'raisins secs',              40,  'g',          false, 24, 'garniture'),
    (v_recipe_id, 'oignons frits',             30,  'g',          false, 25, 'garniture');

  -- =====================================================================
  -- 19. Nashville Hot Chicken Sandwich
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Nashville Hot Chicken Sandwich',
    'Sandwich du Sud : poulet frit triple-paneuré trempé dans huile pimentée brûlante (cayenne, brown sugar), coleslaw crémeux et sauce mayo-ketchup dans pain brioché.',
    $instr$["Coleslaw : mélanger cabbage blend, mayo, moutarde, sel, poivre, jus de citron et sucre. Réfrigérer.",
"Sauce : fouetter mayo, ketchup, Worcestershire, poivre et ail en poudre.",
"Couper les blancs de poulet en filets correspondant à la taille du pain. Sécher au papier absorbant.",
"Mélange sec : fouetter farine, maïzena, ail en poudre, chili powder, sel, moutarde en poudre, poivre et levure.",
"Mélange humide : fouetter buttermilk, œuf, sauce piquante, jus de pickle et levure.",
"Verser 3-4 c. à soupe du mélange humide dans le sec pour créer une texture floconneuse.",
"Triple panure : tremper chaque filet dans sec → humide → sec en secouant l'excès. Reposer 10-15 minutes.",
"Chauffer l'huile à 175°C (4-5 cm de profondeur). Frire 2-3 par batch, 7-8 minutes en retournant à mi-cuisson.",
"Égoutter sur papier. Conserver 180 ml d'huile de friture.",
"Huile pimentée : combiner l'huile réservée avec cassonade, chili powder, cayenne, moutarde en poudre, ail en poudre et sel.",
"Tremper chaque filet frit dans l'huile pimentée.",
"Beurrer et toaster les pains briochés. Assembler : sauce, poulet pimenté, coleslaw, cornichons et pain supérieur."]
$instr$,
    30, 60, 4, 3,
    'Américaine', 'dinner',
    ARRAY['américain','sud','nashville','poulet frit','épicé','sandwich','coleslaw'],
    'manual',
    'https://moribyan.com/nashville-hot-chicken-sandwiches/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',          680, 'g',          true,  1,  'gros, en filets'),
    (v_recipe_id, 'huile d''arachide',         1500, 'ml',        true,  2,  'ou huile végétale, pour friture'),
    (v_recipe_id, 'farine',                    125, 'g',          true,  3,  NULL),
    (v_recipe_id, 'maïzena',                   3,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'ail en poudre',             2,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'chili powder',              2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'moutarde en poudre',        2,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'levure chimique',           1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'buttermilk',                180, 'ml',         true,  9,  NULL),
    (v_recipe_id, 'œuf',                       1,   'unité',      true,  10, 'gros'),
    (v_recipe_id, 'sauce piquante',            2,   'c. à soupe', true,  11, 'au vinaigre'),
    (v_recipe_id, 'jus de cornichon',          60,  'ml',         true,  12, NULL),
    (v_recipe_id, 'cassonade',                 1,   'c. à soupe', true,  13, 'pour l''huile pimentée'),
    (v_recipe_id, 'piment de Cayenne',         2.5, 'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'cabbage blend',             300, 'g',          true,  15, 'pour le coleslaw'),
    (v_recipe_id, 'mayonnaise',                60,  'ml',         true,  16, 'pour le coleslaw'),
    (v_recipe_id, 'moutarde jaune',            1,   'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'jus de citron',             1,   'c. à soupe', true,  18, NULL),
    (v_recipe_id, 'sucre',                     1,   'c. à soupe', true,  19, 'pour le coleslaw'),
    (v_recipe_id, 'mayonnaise',                120, 'ml',         true,  20, 'pour la sauce'),
    (v_recipe_id, 'ketchup',                   60,  'ml',         true,  21, NULL),
    (v_recipe_id, 'sauce Worcestershire',      2,   'c. à café',  true,  22, NULL),
    (v_recipe_id, 'pains briochés',            4,   'unité',      true,  23, NULL),
    (v_recipe_id, 'cornichons',                40,  'g',          true,  24, 'topping');

  -- =====================================================================
  -- 20. Shawarma Nacho Fries
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Shawarma Nacho Fries',
    'Frites loaded fusion : poulet shawarma épicé (allspice, sumac), sauce blanche ail-yaourt crémeuse, kalamata, pepperoncinis, feta et oignon rouge.',
    $instr$["Sauce blanche : mixer mayo, crème aigre (ou yaourt), gousses d'ail, sucre, jus de citron et poivre jusqu'à lisse. Réfrigérer.",
"Mélanger le poulet coupé en morceaux avec huile d'olive, jus de citron, ail et épices (allspice, coriandre, paprika, cumin, sel, sumac, poivre, curcuma).",
"Chauffer l'huile dans une poêle, cuire le poulet 8-10 minutes jusqu'à cuisson complète.",
"Préparer les frites selon le paquet (four, friteuse ou air fryer).",
"Dresser : frites au fond du plat, poulet par-dessus, arroser de sauce blanche.",
"Surmonter de pepperoncinis, olives kalamata, oignon rouge, feta émiettée et persil. Servir chaud."]
$instr$,
    30, 30, 4, 2,
    'Libanaise', 'snack',
    ARRAY['libanais','méditerranéen','fusion','frites','shawarma','poulet','feta','olives'],
    'manual',
    'https://moribyan.com/shawarma-nacho-fries/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blanc de poulet',           450, 'g',          true,  1,  'en morceaux'),
    (v_recipe_id, 'huile d''olive',            30,  'ml',         true,  2,  NULL),
    (v_recipe_id, 'jus de citron',             15,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'ail émincé',                10,  'g',          true,  4,  NULL),
    (v_recipe_id, 'allspice',                  2,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'coriandre moulue',          1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'paprika',                   1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'cumin moulu',               1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'sumac',                     1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'curcuma',                   0.25, 'c. à café', true,  10, NULL),
    (v_recipe_id, 'mayonnaise',                240, 'ml',         true,  11, 'pour la sauce'),
    (v_recipe_id, 'crème aigre',               80,  'ml',         true,  12, 'ou yaourt'),
    (v_recipe_id, 'gousses d''ail',            5,   'unité',      true,  13, 'pour la sauce'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  14, 'pour la sauce'),
    (v_recipe_id, 'jus de citron',             15,  'ml',         true,  15, 'pour la sauce'),
    (v_recipe_id, 'frites',                    500, 'g',          true,  16, NULL),
    (v_recipe_id, 'pepperoncinis',             60,  'g',          true,  17, NULL),
    (v_recipe_id, 'olives kalamata',           60,  'g',          true,  18, NULL),
    (v_recipe_id, 'oignon rouge',              0.5, 'unité',      true,  19, 'finement coupée'),
    (v_recipe_id, 'feta',                      80,  'g',          true,  20, 'émiettée'),
    (v_recipe_id, 'persil',                    10,  'g',          false, 21, 'haché');

  -- =====================================================================
  -- 21. Halal Cart Lamb Over Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Halal Cart Lamb Over Rice',
    'Plat iconique des food trucks NY : agneau émincé shawarma sur riz basmati épicé au curcuma, sauce blanche ail-yaourt, sauce piquante et pain pita.',
    $instr$["Sauce blanche : mixer mayo, crème aigre/yaourt, ail, sucre, jus de citron et poivre jusqu'à lisse. Réserver.",
"Riz épicé : faire tremper le riz 30 minutes puis égoutter. Rincer à l'eau froide jusqu'à clarté.",
"Chauffer beurre, huile, ail et concentré de tomates dans une casserole. Cuire 2-3 minutes.",
"Ajouter le riz et toaster 2-3 minutes.",
"Verser le bouillon et toutes les épices (chili powder, sel, cumin, coriandre, garam masala, paprika, cayenne, poivre, origan, oignon en poudre, curcuma).",
"Porter à ébullition, baisser le feu, couvrir et laisser frémir 20 minutes.",
"Éteindre, laisser reposer couvert 10 minutes puis défaire à la fourchette.",
"Agneau shawarma : combiner l'agneau émincé avec toutes les épices (allspice, coriandre, ail, paprika, cumin, sel, sumac, poivre, curcuma) et huile d'olive. Mariner 30 minutes minimum (idéalement nuit).",
"Chauffer l'huile dans une poêle à feu vif. Ajouter l'agneau et cuire 8-10 minutes en remuant jusqu'à brunissement.",
"Dresser : riz épicé en base, laitue, tomates, agneau, sauce blanche et sauce piquante. Servir avec pita."]
$instr$,
    15, 45, 4, 2,
    'Libanaise', 'dinner',
    ARRAY['halal','street food','new york','agneau','shawarma','riz','sauce blanche'],
    'manual',
    'https://moribyan.com/halal-cart-lamb-over-rice/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'agneau finement tranché',   450, 'g',          true,  1,  NULL),
    (v_recipe_id, 'huile d''olive',            30,  'ml',         true,  2,  'pour l''agneau'),
    (v_recipe_id, 'allspice',                  1.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'coriandre moulue',          1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'ail en poudre',             1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'paprika',                   1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'cumin moulu',               1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sumac',                     1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'curcuma',                   0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'mayonnaise',                240, 'ml',         true,  10, 'pour la sauce'),
    (v_recipe_id, 'crème aigre',               80,  'ml',         true,  11, 'ou yaourt'),
    (v_recipe_id, 'gousses d''ail',            5,   'unité',      true,  12, 'pour la sauce'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'jus de citron',             30,  'ml',         true,  14, 'pour la sauce'),
    (v_recipe_id, 'beurre doux',               15,  'g',          true,  15, 'pour le riz'),
    (v_recipe_id, 'huile d''olive',            15,  'ml',         true,  16, 'pour le riz'),
    (v_recipe_id, 'ail émincé',                15,  'g',          true,  17, 'pour le riz'),
    (v_recipe_id, 'concentré de tomates',      60,  'g',          true,  18, NULL),
    (v_recipe_id, 'riz basmati',               400, 'g',          true,  19, NULL),
    (v_recipe_id, 'bouillon de poulet',        720, 'ml',         true,  20, NULL),
    (v_recipe_id, 'chili powder',              2,   'c. à café',  true,  21, NULL),
    (v_recipe_id, 'garam masala',              1,   'c. à café',  true,  22, NULL),
    (v_recipe_id, 'curcuma',                   0.5, 'c. à café',  true,  23, 'pour le riz'),
    (v_recipe_id, 'laitue',                    100, 'g',          true,  24, 'ciselée'),
    (v_recipe_id, 'tomates',                   200, 'g',          true,  25, 'coupées'),
    (v_recipe_id, 'pains pita',                4,   'unité',      true,  26, NULL),
    (v_recipe_id, 'sauce piquante',            2,   'c. à soupe', false, 27, 'sriracha');

  -- =====================================================================
  -- 22. Poutine
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Poutine',
    'Plat canadien iconique : frites croustillantes nappées de sauce brune riche, curds de cheddar blanc, faux-filet sauté et oignons confits optionnels.',
    $instr$["Bœuf : chauffer huile et beurre dans une poêle à feu vif. Ajouter le steak finement tranché assaisonné de paprika, chili powder, oignon en poudre, ail en poudre, sel, poivre, cassonade et Worcestershire. Cuire 6-7 minutes.",
"Sauce brune : faire fondre le beurre avec la farine dans une casserole, fouetter 3-4 minutes pour former un roux.",
"Ajouter bouillon de bœuf, moutarde, ail en poudre, oignon en poudre, paprika, poivre et base de bouillon. Laisser frémir jusqu'à épaississement. Retirer du feu.",
"Oignons confits (optionnel) : sauter oignon coupé avec huile et sel à feu doux-moyen 12 minutes en remuant.",
"Augmenter à feu moyen, ajouter de l'eau par c. à soupe en répétant jusqu'à évaporation (20-25 minutes total).",
"Préparer les frites selon le paquet.",
"Dresser : frites en couches dans un bol, garnir de curds de cheddar, sauce brune, oignons confits et bœuf. Garnir de ciboulette ou persil."]
$instr$,
    15, 45, 4, 2,
    'Américaine', 'dinner',
    ARRAY['canadien','poutine','frites','sauce brune','cheddar curds','bœuf','réconfortant'],
    'manual',
    'https://moribyan.com/poutine/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'faux-filet',                450, 'g',          true,  1,  'finement tranché'),
    (v_recipe_id, 'huile d''olive',            15,  'ml',         true,  2,  NULL),
    (v_recipe_id, 'beurre doux',               15,  'g',          true,  3,  'pour le bœuf'),
    (v_recipe_id, 'paprika',                   1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'oignon en poudre',          1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'chili powder',              2,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'ail en poudre',             0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'cassonade',                 5,   'g',          true,  8,  NULL),
    (v_recipe_id, 'sauce Worcestershire',      30,  'ml',         true,  9,  NULL),
    (v_recipe_id, 'beurre doux',               45,  'g',          true,  10, 'pour le roux'),
    (v_recipe_id, 'farine',                    45,  'g',          true,  11, NULL),
    (v_recipe_id, 'bouillon de bœuf',          360, 'ml',         true,  12, NULL),
    (v_recipe_id, 'moutarde jaune',            5,   'ml',         true,  13, NULL),
    (v_recipe_id, 'base de bouillon de bœuf',  5,   'g',          true,  14, 'beef bouillon'),
    (v_recipe_id, 'frites surgelées',          500, 'g',          true,  15, NULL),
    (v_recipe_id, 'cheddar curds',             200, 'g',          true,  16, 'curds blancs'),
    (v_recipe_id, 'oignon jaune',              1,   'unité',      false, 17, 'pour les oignons confits'),
    (v_recipe_id, 'ciboulette',                10,  'g',          false, 18, 'garniture');

  -- =====================================================================
  -- 23. Pepper Lunch
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Pepper Lunch',
    'Plat sizzlant japonais inspiré de la chaîne du même nom : steak finement tranché et riz jasmin saisis à la plancha bouillante avec sauce soja-gingembre-piment, maïs sucré et oignons nouveaux.',
    $instr$["Sauce : chauffer une casserole à feu doux-moyen. Combiner sauce soja, sauce huître, pâte de piment, poivre noir, ail, pâte de gingembre, cassonade et vinaigre de riz. Laisser frémir doucement.",
"Dissoudre la maïzena dans l'eau, ajouter à la sauce et remuer jusqu'à épaississement.",
"Retirer du feu une fois la consistance désirée.",
"Chauffer une poêle/skillet à feu moyen-vif jusqu'à très chaud. Ajouter le beurre ou l'huile.",
"Disposer le riz au centre de la poêle et arranger le steak tout autour.",
"Verser la sauce sur le steak selon le goût.",
"Cuire 5-7 minutes jusqu'à cuisson désirée du steak.",
"Garnir de maïs, oignons nouveaux et poivre cracké avant de servir directement dans la poêle bouillante."]
$instr$,
    20, 10, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','pepper lunch','steak','riz','sizzling','plancha','30min'],
    'manual',
    'https://moribyan.com/pepper-lunch/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'steak finement tranché',    454, 'g',          true,  1,  NULL),
    (v_recipe_id, 'sauce soja',                80,  'ml',         true,  2,  NULL),
    (v_recipe_id, 'sauce huître',              1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'pâte de piment',            1,   'c. à soupe', true,  4,  'à ajuster'),
    (v_recipe_id, 'poivre noir moulu',         0.25, 'c. à café', true,  5,  NULL),
    (v_recipe_id, 'ail émincé',                1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'pâte de gingembre',         2,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'cassonade',                 19,  'g',          true,  8,  NULL),
    (v_recipe_id, 'vinaigre de riz',           0.5, 'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'maïzena',                   1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'eau',                       30,  'ml',         true,  11, 'pour la maïzena'),
    (v_recipe_id, 'beurre doux',               30,  'g',          true,  12, 'ou huile'),
    (v_recipe_id, 'riz jasmin cuit',           2,   'portion',    true,  13, NULL),
    (v_recipe_id, 'oignons nouveaux',          15,  'g',          true,  14, 'finement tranchés'),
    (v_recipe_id, 'maïs jaune',                40,  'g',          true,  15, 'sucré');

  -- =====================================================================
  -- 24. Honey Chipotle Chicken Fajitas
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Honey Chipotle Chicken Fajitas',
    'Fajitas sheet pan : poulet mariné chipotle-miel avec poivrons multicolores, rôtis 20 minutes au four et nappés de fromage râpé. Servir avec tortillas.',
    $instr$["Préchauffer le four à 220°C.",
"Dans un grand saladier, combiner le poulet tranché, huile d'olive, pâte chipotle adobo, ail, chili powder, coriandre, origan, oignon en poudre, cumin, sel et miel. Bien mélanger.",
"Disposer les poivrons tranchés et le poulet mariné sur une plaque de four.",
"Cuire 20 minutes jusqu'à cuisson complète du poulet avec une légère saisie.",
"Optionnel : ajouter le fromage râpé et faire fondre 1-2 minutes supplémentaires.",
"Garnir de coriandre fraîche et servir chaud avec tortillas, crème aigre et quartiers de citron vert."]
$instr$,
    10, 20, 3, 1,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','fajitas','poulet','chipotle','miel','sheet pan','one-pan','rapide'],
    'manual',
    'https://moribyan.com/honey-chipotle-chicken-fajitas/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'gros blancs de poulet',     680, 'g',          true,  1,  'tranchés finement'),
    (v_recipe_id, 'poivron rouge',             1,   'unité',      true,  2,  'tranché'),
    (v_recipe_id, 'poivron vert',              1,   'unité',      true,  3,  'tranché'),
    (v_recipe_id, 'poivron jaune',             1,   'unité',      true,  4,  'tranché'),
    (v_recipe_id, 'huile d''olive',            45,  'ml',         true,  5,  NULL),
    (v_recipe_id, 'pâte chipotle adobo',       3,   'c. à soupe', true,  6,  '45-60ml'),
    (v_recipe_id, 'ail frais',                 10,  'g',          true,  7,  'émincé'),
    (v_recipe_id, 'chili powder',              1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',          1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'paprika',                   1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'origan séché',              1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'oignon en poudre',          0.5, 'c. à café',  true,  12, NULL),
    (v_recipe_id, 'cumin moulu',               0.5, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'miel',                      30,  'ml',         true,  14, NULL),
    (v_recipe_id, 'fromage râpé mexicain',     60,  'g',          true,  15, NULL),
    (v_recipe_id, 'coriandre fraîche',         10,  'g',          false, 16, 'hachée');

  -- =====================================================================
  -- 25. Creamy Gochujang Pasta with Tofu
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Creamy Gochujang Pasta with Tofu',
    'Pâtes fusion crémeuses au tofu soyeux mixé, gochujang, parmesan et flocons de piment. Alternative protéinée végétarienne au sauce alfredo épicée.',
    $instr$["Mixer le tofu soyeux avec le lait au blender jusqu'à crème complètement lisse.",
"Cuire les pâtes selon le paquet dans l'eau salée. Égoutter.",
"Chauffer une casserole à feu moyen. Sauter beurre, huile d'olive, ail et gochujang 2-3 minutes.",
"Ajouter la crème de tofu mixée, parmesan, basilic, flocons de piment, poudre de chili et sel.",
"Combiner les ingrédients de la sauce, goûter et ajuster.",
"Mélanger les pâtes cuites avec la sauce.",
"Servir avec oignons nouveaux, parmesan supplémentaire et flocons de piment."]
$instr$,
    15, 30, 5, 2,
    'Coréenne', 'dinner',
    ARRAY['fusion','coréen','italien','pâtes','tofu','gochujang','végétarien','protéiné'],
    'manual',
    'https://moribyan.com/creamy-gochujang-pasta-with-tofu/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'tofu soyeux',               454, 'g',          true,  1,  NULL),
    (v_recipe_id, 'lait',                      60,  'ml',         true,  2,  'au choix'),
    (v_recipe_id, 'beurre doux',               15,  'g',          true,  3,  NULL),
    (v_recipe_id, 'huile d''olive',            15,  'ml',         true,  4,  NULL),
    (v_recipe_id, 'ail émincé',                1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'gochujang',                 60,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'parmesan râpé',             50,  'g',          true,  7,  'fraîchement râpé'),
    (v_recipe_id, 'basilic séché',             1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'flocons de piment',         1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'chili powder',              1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'pâtes',                     454, 'g',          true,  11, NULL),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 12, 'hachés');

  -- =====================================================================
  -- 26. Filet-O-Fish (Copycat)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Filet-O-Fish (Copycat)',
    'Copycat McDonald''s : filet de poisson blanc triple-paneuré frit, demi-tranche d''American cheese fondant et sauce tartare maison à l''aneth dans pain brioché.',
    $instr$["Sauce tartare : combiner mayo, relish d'aneth, jus de citron, persil, sucre, moutarde, aneth, oignon en poudre, flocons de piment et poivre. Mélanger jusqu'à consistance épaisse.",
"Mélange farine : combiner farine, sel, poivre et chili powder dans un bol.",
"Mélange œuf : battre œufs, sel, chili powder et poivre dans un deuxième bol.",
"Mélange panko : mixer le panko avec sel, chili powder et poivre jusqu'à texture sableuse.",
"Panure : tremper chaque filet dans farine, puis œuf, puis panko. Utiliser une main pour le sec, l'autre pour l'humide.",
"Chauffer l'huile végétale à 165°C. Ne pas surchauffer.",
"Frire les filets sans surcharger 8-9 minutes jusqu'à doré et cuisson complète.",
"Transférer sur grille. Déposer immédiatement une tranche de fromage sur chaque filet pour fondre.",
"Assembler sur pain toasté beurré : filet avec fromage fondu, sauce tartare, laitue optionnelle. Refermer."]
$instr$,
    30, 30, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','copycat','mcdonald''s','poisson','panné','fast food','sandwich'],
    'manual',
    'https://moribyan.com/filet-o-fish-copycat/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filets de poisson blanc',   600, 'g',          true,  1,  '4 filets de 150g'),
    (v_recipe_id, 'tranches de cheddar',       4,   'unité',      true,  2,  'fromage américain'),
    (v_recipe_id, 'pains briochés',            4,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'huile végétale',            1000, 'ml',        true,  4,  'pour friture'),
    (v_recipe_id, 'mayonnaise',                240, 'ml',         true,  5,  'pour la sauce'),
    (v_recipe_id, 'relish d''aneth',           60,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'jus de citron',             15,  'ml',         true,  7,  NULL),
    (v_recipe_id, 'persil',                    1,   'c. à soupe', true,  8,  'finement haché'),
    (v_recipe_id, 'sucre',                     3.75, 'g',         true,  9,  NULL),
    (v_recipe_id, 'moutarde jaune',            5,   'ml',         true,  10, NULL),
    (v_recipe_id, 'aneth séché',               5,   'g',          true,  11, NULL),
    (v_recipe_id, 'oignon en poudre',          2.5, 'g',          true,  12, NULL),
    (v_recipe_id, 'flocons de piment',         2.5, 'g',          true,  13, NULL),
    (v_recipe_id, 'farine',                    180, 'g',          true,  14, NULL),
    (v_recipe_id, 'œufs',                      2,   'unité',      true,  15, 'gros, battus'),
    (v_recipe_id, 'panko',                     240, 'g',          true,  16, 'mixé'),
    (v_recipe_id, 'chili powder',              10,  'g',          true,  17, 'pour les panures');

  -- =====================================================================
  -- 27. Crispy Firey Beef
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Crispy Firey Beef',
    'Bœuf à emporter chinois : lamelles de surlonge enrobées maïzena-œuf, frites croustillantes et tossées dans sauce sucrée-piquante avec oignon et piments Fresno.',
    $instr$["Combiner maïzena, chili powder, sel et poivre dans un sac hermétique, secouer.",
"Battre œufs avec sel, chili powder et poivre dans un bol.",
"Tremper le bœuf en lamelles dans l'œuf battu par lots, puis transférer dans le sac de maïzena assaisonnée.",
"Sceller le sac et secouer vigoureusement jusqu'à enrobage uniforme.",
"Sauce : faire fondre le beurre dans une casserole. Sauter ail, gingembre et concentré de tomates 2 minutes.",
"Ajouter vinaigre de riz, chili powder, flocons piment, sauce soja, sauce chili sucrée et cassonade. Laisser frémir puis épaissir avec slurry maïzena-eau.",
"Stir-fry : chauffer l'huile de sésame, sauter oignon 5 minutes jusqu'à doré, puis ajouter piments Fresno 2 minutes.",
"Chauffer l'huile végétale à 175°C. Frire le bœuf en 2 batches jusqu'à doré (6-8 minutes). Égoutter sur grille.",
"Combiner bœuf frit avec sauce et légumes, tossing pour enrober uniformément.",
"Servir chaud sur riz, garnir d'oignons nouveaux et graines de sésame."]
$instr$,
    20, 35, 4, 3,
    'Chinoise', 'dinner',
    ARRAY['chinois','bœuf','crispy','épicé','sweet chili','wok','takeout'],
    'manual',
    'https://moribyan.com/crispy-firey-beef/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'surlonge de bœuf',          450, 'g',          true,  1,  'finement tranchée'),
    (v_recipe_id, 'maïzena',                   180, 'ml',         true,  2,  'pour la panure'),
    (v_recipe_id, 'chili powder',              2,   'c. à café',  true,  3,  'pour la panure'),
    (v_recipe_id, 'œufs',                      2,   'unité',      true,  4,  'battus'),
    (v_recipe_id, 'beurre doux',               30,  'g',          true,  5,  'pour la sauce'),
    (v_recipe_id, 'ail émincé',                15,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'pâte de gingembre',         10,  'ml',         true,  7,  NULL),
    (v_recipe_id, 'concentré de tomates',      30,  'ml',         true,  8,  NULL),
    (v_recipe_id, 'vinaigre de riz',           15,  'ml',         true,  9,  NULL),
    (v_recipe_id, 'flocons de piment',         5,   'ml',         true,  10, NULL),
    (v_recipe_id, 'sauce soja allégée',        60,  'ml',         true,  11, NULL),
    (v_recipe_id, 'sauce chili douce',         60,  'ml',         true,  12, NULL),
    (v_recipe_id, 'cassonade',                 60,  'ml',         true,  13, NULL),
    (v_recipe_id, 'eau',                       60,  'ml',         true,  14, 'pour le slurry'),
    (v_recipe_id, 'maïzena',                   10,  'ml',         true,  15, 'pour le slurry'),
    (v_recipe_id, 'huile de sésame',           10,  'ml',         true,  16, NULL),
    (v_recipe_id, 'oignon jaune',              0.5, 'unité',      true,  17, 'moyen, en gros morceaux'),
    (v_recipe_id, 'piments Fresno',            2,   'unité',      true,  18, '2-3, tranchés'),
    (v_recipe_id, 'huile végétale',            1000, 'ml',        true,  19, 'pour friture');

  -- =====================================================================
  -- 28. Big Mac (Copycat)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Big Mac (Copycat)',
    'Copycat McDonald''s : deux steaks fins moutardés, sauce Big Mac maison, oignons hachés, cornichons et laitue iceberg empilés dans une triple-couche de pains sésame.',
    $instr$["Sauce Big Mac : combiner mayonnaise, pickle relish drainé, ketchup, sucre et vinaigre blanc dans un bol. Réserver.",
"Steaks : diviser le bœuf en 8 portions de 100g. Former en disques fins et larges. Saler poivrer les deux faces.",
"Toaster les pains : badigeonner l'intérieur de beurre. Poser face beurrée sur poêle chaude jusqu'à dorer les bords.",
"Cuire les steaks : chauffer la poêle à feu moyen-vif avec beurre et huile. Cuire en batchs (2-3 min/face). Étaler de la moutarde sur la face crue avant de retourner.",
"Garnir la moitié des steaks de fromage et couvrir 1 minute pour fondre.",
"Assembler : pain du bas + sauce + laitue + oignon + steak au fromage. Pain du milieu + sauce + laitue + oignon + cornichons + 2ème steak. Pain du haut.",
"Servir chaud."]
$instr$,
    35, 25, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','copycat','mcdonald''s','big mac','burger','triple','fast food'],
    'manual',
    'https://moribyan.com/big-mac/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché 80/20',          910, 'g',          true,  1,  NULL),
    (v_recipe_id, 'beurre doux',               60,  'g',          true,  2,  'pour toaster'),
    (v_recipe_id, 'huile végétale',            15,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'moutarde jaune',            60,  'ml',         true,  4,  NULL),
    (v_recipe_id, 'tranches de cheddar',       8,   'unité',      true,  5,  'fromage américain'),
    (v_recipe_id, 'pains au sésame',           8,   'unité',      true,  6,  '+ pains du bas extra'),
    (v_recipe_id, 'oignon blanc',              1,   'unité',      true,  7,  'coupé'),
    (v_recipe_id, 'cornichons en tranches',    60,  'g',          true,  8,  NULL),
    (v_recipe_id, 'laitue iceberg',            150, 'g',          true,  9,  'ciselée'),
    (v_recipe_id, 'mayonnaise',                80,  'ml',         true,  10, 'pour la sauce'),
    (v_recipe_id, 'pickle relish',             60,  'ml',         true,  11, 'égoutté'),
    (v_recipe_id, 'ketchup',                   45,  'ml',         true,  12, NULL),
    (v_recipe_id, 'sucre',                     5,   'g',          true,  13, 'pour la sauce'),
    (v_recipe_id, 'vinaigre blanc',            5,   'ml',         true,  14, NULL);

  -- =====================================================================
  -- 29. Chipotle Salmon Bowls
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chipotle Salmon Bowls',
    'Bols saumon en 30 minutes : cubes marinés chipotle-adobo saisis dorés, salsa mangue-avocat fraîche, riz citron-coriandre et cotija pour la touche fumée-acidulée.',
    $instr$["Combiner saumon en cubes avec huile d'olive, pâte chipotle adobo, ail, chili powder, sel, coriandre, cumin, origan et poivre. Bien enrober.",
"Chauffer l'huile dans une poêle à feu moyen-vif. Saisir le saumon sans surcharger jusqu'à doré sur toutes les faces et cuisson complète (6-8 minutes).",
"Salsa : mélanger mangue en dés, avocat, jalapeño, oignon rouge, coriandre, jus de citron vert, sel et poivre. Goûter et ajuster.",
"Dresser : riz citron-coriandre dans les bols, saumon, salsa mangue-avocat, maïs, laitue, cotija, haricots noirs et crème aigre."]
$instr$,
    30, 15, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','saumon','chipotle','bol','mangue','avocat','rapide','sain'],
    'manual',
    'https://moribyan.com/chipotle-salmon-bowls/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'saumon',                    454, 'g',          true,  1,  'en cubes'),
    (v_recipe_id, 'pâte chipotle adobo',       2,   'c. à soupe', true,  2,  '2-3 c. à soupe'),
    (v_recipe_id, 'huile d''olive',            45,  'ml',         true,  3,  '2 c.à soupe + 1 pour cuire'),
    (v_recipe_id, 'ail frais',                 2,   'c. à café',  true,  4,  'émincé'),
    (v_recipe_id, 'chili powder',              1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'cumin moulu',               1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'origan séché',              1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'coriandre moulue',          1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'mangue',                    1,   'unité',      true,  9,  'en petits dés'),
    (v_recipe_id, 'avocat',                    1,   'unité',      true,  10, 'en dés'),
    (v_recipe_id, 'jalapeño',                  1,   'unité',      true,  11, 'en dés'),
    (v_recipe_id, 'oignon rouge',              0.5, 'unité',      true,  12, 'en dés'),
    (v_recipe_id, 'coriandre fraîche',         2,   'c. à soupe', true,  13, 'hachée'),
    (v_recipe_id, 'citron vert',               1,   'unité',      true,  14, 'jus'),
    (v_recipe_id, 'riz citron-coriandre',      4,   'portion',    true,  15, 'cuit'),
    (v_recipe_id, 'maïs',                      100, 'g',          true,  16, NULL),
    (v_recipe_id, 'laitue',                    100, 'g',          true,  17, 'ciselée'),
    (v_recipe_id, 'cotija',                    60,  'g',          true,  18, 'émietté'),
    (v_recipe_id, 'haricots noirs',            120, 'g',          true,  19, NULL),
    (v_recipe_id, 'crème aigre',               4,   'c. à soupe', false, 20, NULL);

  -- =====================================================================
  -- 30. Bulgogi Kimchi Fried Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bulgogi Kimchi Fried Rice',
    'Riz frit coréen complet : bavette mariné bulgogi (poire-soja-sésame), riz jasmin, jus de kimchi-kimchi-gochujang avec petits pois et carottes, surmonté d''un œuf au plat.',
    $instr$["Bulgogi : combiner bavette, sauce soja, cassonade, purée de poire, huile de sésame, ail, gingembre, chili powder, flocons piment, poivre, huile d'olive et vinaigre de riz dans un saladier. Mariner immédiatement ou jusqu'à overnight.",
"Chauffer une poêle à feu vif. Ajouter la viande sans surcharger, cuire jusqu'à brunissement et caramélisation.",
"Retirer la viande une fois cuite et sauce épaissie. Réserver.",
"Riz frit : chauffer la poêle à feu moyen. Ajouter beurre, ail et gochujang. Sauter 1 minute.",
"Ajouter le riz et sauter 2 minutes pour rendre croustillant.",
"Incorporer jus de kimchi, kimchi haché, carotte et petits pois, flocons piment, chili powder, sauce soja, poivre, sel et huile de sésame. Cuire 2-3 minutes.",
"Remettre le bulgogi dans la poêle et combiner.",
"Servir surmonté d'œuf au plat, oignons nouveaux, graines de sésame et nori effilochée."]
$instr$,
    15, 30, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','riz frit','bulgogi','kimchi','gochujang','bœuf','œuf','complet'],
    'manual',
    'https://moribyan.com/bulgogi-kimchi-fried-rice/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bavette',                   454, 'g',          true,  1,  'finement tranchée'),
    (v_recipe_id, 'sauce soja allégée',        60,  'ml',         true,  2,  'pour la marinade'),
    (v_recipe_id, 'cassonade',                 22,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'purée de poire',            60,  'ml',         true,  4,  NULL),
    (v_recipe_id, 'huile de sésame',           22,  'ml',         true,  5,  'pour la marinade'),
    (v_recipe_id, 'ail émincé',                15,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'gingembre émincé',          15,  'ml',         true,  7,  NULL),
    (v_recipe_id, 'chili powder',              10,  'ml',         true,  8,  NULL),
    (v_recipe_id, 'flocons de piment',         5,   'ml',         true,  9,  NULL),
    (v_recipe_id, 'huile d''olive',            15,  'ml',         true,  10, NULL),
    (v_recipe_id, 'vinaigre de riz',           15,  'ml',         true,  11, NULL),
    (v_recipe_id, 'beurre doux',               60,  'ml',         true,  12, 'pour le riz'),
    (v_recipe_id, 'ail émincé',                15,  'ml',         true,  13, 'pour le riz'),
    (v_recipe_id, 'gochujang',                 30,  'ml',         true,  14, NULL),
    (v_recipe_id, 'riz jasmin cuit',           960, 'ml',         true,  15, 'froid'),
    (v_recipe_id, 'jus de kimchi',             30,  'ml',         true,  16, NULL),
    (v_recipe_id, 'kimchi',                    240, 'g',          true,  17, 'haché'),
    (v_recipe_id, 'mélange carotte/petits pois', 240, 'g',         true,  18, NULL),
    (v_recipe_id, 'sauce soja allégée',        45,  'ml',         true,  19, 'pour le riz'),
    (v_recipe_id, 'huile de sésame',           10,  'ml',         true,  20, 'pour le riz'),
    (v_recipe_id, 'œufs',                      4,   'unité',      true,  21, 'au plat'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 22, 'tranchés'),
    (v_recipe_id, 'nori',                      2,   'unité',      false, 23, 'effilochée');

  -- =====================================================================
  -- 31. Animal Style Baked Potato
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Animal Style Baked Potato',
    'Pomme de terre russet rôtie croustillante, transformée façon In-N-Out animal style : bœuf saucé, cheddar fondant, oignons confits, cornichons, pepperoncinis et burger sauce.',
    $instr$["Préchauffer le four à 220°C. Laver, sécher et piquer les pommes de terre à la fourchette.",
"Enrober d'huile et assaisonner généreusement de sel. Cuire 45-60 minutes en retournant à mi-cuisson.",
"Sauce burger : combiner mayonnaise, pickle relish drainé, ketchup et sucre. Réfrigérer.",
"Oignons confits : chauffer huile dans une poêle à feu moyen, ajouter oignon coupé et sel. Cuire 15-20 minutes jusqu'à coloration profonde.",
"Bœuf : faire fondre le beurre dans une poêle à feu moyen-vif. Ajouter le bœuf haché, sel et poivre.",
"Incorporer Worcestershire, bouillon et moutarde. Frémir 6-8 minutes jusqu'à brunissement.",
"Diviser en portions, ajouter le cheddar par-dessus et couvrir 1 minute pour fondre.",
"Ouvrir les pommes de terre rôties, gratter l'intérieur à la fourchette. Ajouter beurre, sel et poivre.",
"Garnir de bœuf au fromage, oignons confits, cornichons, pepperoncinis et persil. Arroser de sauce burger."]
$instr$,
    15, 60, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','in-n-out','pomme de terre','loaded','bœuf','animal style','fast food'],
    'manual',
    'https://moribyan.com/the-animal-style-in-n-out-baked-potato/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pommes de terre russet',    4,   'unité',      true,  1,  'grosses'),
    (v_recipe_id, 'huile neutre',              2,   'c. à soupe', true,  2,  'pour les pommes de terre'),
    (v_recipe_id, 'beurre doux',               30,  'g',          true,  3,  'pour servir'),
    (v_recipe_id, 'mayonnaise',                80,  'ml',         true,  4,  'pour la sauce'),
    (v_recipe_id, 'pickle relish',             60,  'ml',         true,  5,  'égoutté'),
    (v_recipe_id, 'ketchup',                   45,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'sucre',                     5,   'ml',         true,  7,  'pour la sauce'),
    (v_recipe_id, 'oignon jaune',              1,   'unité',      true,  8,  'gros, coupé'),
    (v_recipe_id, 'huile végétale',            7.5, 'ml',         true,  9,  NULL),
    (v_recipe_id, 'beurre doux',               15,  'ml',         true,  10, 'pour le bœuf'),
    (v_recipe_id, 'bœuf haché 90/10',          450, 'g',          true,  11, NULL),
    (v_recipe_id, 'sauce Worcestershire',      7.5, 'ml',         true,  12, NULL),
    (v_recipe_id, 'bouillon de bœuf',          60,  'ml',         true,  13, NULL),
    (v_recipe_id, 'moutarde jaune',            5,   'ml',         true,  14, NULL),
    (v_recipe_id, 'tranches de cheddar',       4,   'unité',      true,  15, 'fromage américain'),
    (v_recipe_id, 'cornichons dill',           50,  'g',          true,  16, 'en tranches'),
    (v_recipe_id, 'pepperoncinis',             50,  'g',          true,  17, 'hachés'),
    (v_recipe_id, 'persil',                    10,  'g',          false, 18, 'haché');

  -- =====================================================================
  -- 32. Creamy Chicken Roll-Ups
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Creamy Chicken Roll-Ups',
    'Roulés de poulet aplati farcis Boursin-épinards-mozzarella, saisis dorés, puis finis dans sauce crème-parmesan-ail (vibes alfredo). Élégant et fondant.',
    $instr$["Couper les blancs de poulet en 2 et les aplatir à épaisseur uniforme. Les assaisonner d'huile d'olive, herbes italiennes, lemon pepper, paprika fumé, sel et poivre.",
"Étaler le Boursin sur chaque morceau, ajouter épinards et mozzarella, puis rouler serré et fixer aux cure-dents.",
"Chauffer une poêle avec huile d'olive à feu moyen. Saisir les roulés côté soudure vers le bas 3 minutes jusqu'à doré.",
"Saisir les 3 autres faces 2-3 minutes chacune jusqu'à cuisson complète (10-12 minutes total). Retirer et enlever les cure-dents.",
"Faire fondre le beurre dans la même poêle, ajouter l'ail et cuire 1 minute.",
"Verser crème et lait, émietter le cube de bouillon et remuer jusqu'à dissolution.",
"Porter à frémissement doux. Ajouter herbes italiennes, poivre, muscade et parmesan. Frémir jusqu'à légère épaisseur.",
"Finir avec zeste de citron et persil. Remettre les roulés dans la sauce et chauffer 1-2 minutes.",
"Garnir de persil et servir chaud."]
$instr$,
    20, 30, 3, 2,
    'Italienne', 'dinner',
    ARRAY['italien','américain','poulet','farci','boursin','crème','alfredo','élégant'],
    'manual',
    'https://moribyan.com/creamy-chicken-roll-ups/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',          600, 'g',          true,  1,  '3 blancs, coupés en 2'),
    (v_recipe_id, 'huile d''olive',            1,   'c. à soupe', true,  2,  '+ extra pour la poêle'),
    (v_recipe_id, 'herbes italiennes',         2,   'c. à café',  true,  3,  '1 pour le poulet + 1 pour la sauce'),
    (v_recipe_id, 'lemon pepper',              1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'paprika fumé',              1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'Boursin ail-fines herbes',  120, 'g',          true,  6,  NULL),
    (v_recipe_id, 'épinards frais',            60,  'g',          true,  7,  '2 tasses bébé'),
    (v_recipe_id, 'mozzarella râpée',          60,  'g',          true,  8,  NULL),
    (v_recipe_id, 'beurre doux',               45,  'g',          true,  9,  'pour la sauce'),
    (v_recipe_id, 'ail frais',                 1,   'c. à soupe', true,  10, 'émincé'),
    (v_recipe_id, 'crème entière',             240, 'ml',         true,  11, NULL),
    (v_recipe_id, 'lait entier',               120, 'ml',         true,  12, NULL),
    (v_recipe_id, 'cube de bouillon de poulet', 1,  'unité',      true,  13, NULL),
    (v_recipe_id, 'muscade',                   1,   'pincée',     true,  14, NULL),
    (v_recipe_id, 'parmesan râpé',             50,  'g',          true,  15, NULL),
    (v_recipe_id, 'persil frais',              15,  'g',          false, 16, 'haché'),
    (v_recipe_id, 'citron',                    1,   'unité',      false, 17, 'zeste, optionnel');

  RAISE NOTICE '✅ Imported 32 recipes from moribyan.com';
END $$;
