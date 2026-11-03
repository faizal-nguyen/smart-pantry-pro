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
    'Crispy Fiery Beef',
    'Crispy Firey Beef', -- ancien nom, nettoyé si la recette n'a pas encore été migrée
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
    'Bouchées de filet de bœuf glacées d''une sauce soja-sésame brillante, servies sur un riz jasmin sauté à l''ail et au beurre, avec œufs brouillés et gochujang.',
    $instr$["Fouetter les œufs avec une pincée de sel et de poivre. Réserver.",
"Chauffer un wok à feu moyen et y faire fondre la moitié du beurre. Ajouter l'ail émincé et cuire 30 secondes.",
"Ajouter le riz jasmin cuit la veille, casser les grumeaux et l'enrober de beurre à l'ail. Ajouter la sauce soja et le gochujang, puis mélanger.",
"Pousser le riz sur les côtés du wok et faire fondre le reste du beurre au centre. Verser les œufs, les laisser prendre légèrement, puis les brouiller doucement.",
"Mélanger les œufs au riz et cuire encore 1-2 minutes pour que tout soit bien chaud. Réserver.",
"Pour les bouchées de steak : enrober les dés de filet d'huile, de paprika, de sel, de poivre et de bicarbonate. Laisser reposer 10 minutes.",
"Pour la sauce, fouetter la sauce soja, le bouillon de bœuf, la cassonade, la maïzena, l'huile de sésame, le vinaigre de riz et une pincée de poivre concassé.",
"Chauffer le wok à feu vif avec un filet d'huile. Saisir le bœuf en une seule couche, sans le remuer, 1-2 minutes.",
"Mélanger et cuire jusqu'à ce que le bœuf soit doré de tous côtés (5-7 minutes). Baisser le feu, verser la sauce et remuer 1-2 minutes, jusqu'à ce que la viande soit bien nappée et brillante.",
"Répartir le riz dans des bols, déposer les bouchées de steak au centre et garnir d'oignons nouveaux."]
$instr$,
    15, 15, 3, 2,
    'Asiatique', 'dinner',
    ARRAY['asiatique','riz frit','steak','bœuf','glacé','wok','30min'],
    'manual',
    'https://moribyan.com/garlic-fried-rice-glazed-steak-bites/',
    'https://moribyan.com/wp-content/uploads/2026/02/IMG_0614.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filet de bœuf',               454,  'g',          true, 1,  'en dés'),
    (v_recipe_id, 'huile neutre',                1,    'c. à soupe', true, 2,  'pour enrober et saisir'),
    (v_recipe_id, 'paprika',                     0.5,  'c. à café',  true, 3,  NULL),
    (v_recipe_id, 'bicarbonate de soude',        0.5,  'c. à café',  true, 4,  'pour attendrir'),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 5,  'au goût, pour les œufs et le steak'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 6,  'concassé, au goût'),
    (v_recipe_id, 'sauce soja',                  2,    'c. à soupe', true, 7,  'allégée en sel, pour la sauce'),
    (v_recipe_id, 'bouillon de bœuf',            30,   'ml',         true, 8,  NULL),
    (v_recipe_id, 'cassonade',                   12,   'g',          true, 9,  NULL),
    (v_recipe_id, 'maïzena',                     4,    'g',          true, 10, NULL),
    (v_recipe_id, 'huile de sésame',             1,    'c. à café',  true, 11, NULL),
    (v_recipe_id, 'vinaigre de riz',             1,    'c. à café',  true, 12, NULL),
    (v_recipe_id, 'riz jasmin',                  135,  'g',          true, 13, 'cru, cuit la veille (environ 400 g cuit)'),
    (v_recipe_id, 'beurre doux',                 22,   'g',          true, 14, 'divisé'),
    (v_recipe_id, 'ail',                         2,    'c. à café',  true, 15, 'émincé'),
    (v_recipe_id, 'sauce soja',                  1,    'c. à soupe', true, 16, 'allégée en sel, pour le riz'),
    (v_recipe_id, 'gochujang',                   1,    'c. à café',  true, 17, NULL),
    (v_recipe_id, 'œufs',                        3,    'unité',      true, 18, 'gros'),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      false, 19, 'émincés, pour garnir');

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
    'Udon nappées d''une sauce carbonara fusion crémeuse au gochujang et au parmesan, surmontées de crevettes saisies au beurre.',
    $instr$["Sécher les crevettes et les enrober d'huile d'olive, de paprika, d'origan, de sel, de poivre et d'une pincée d'oignon en poudre.",
"Chauffer une poêle à feu moyen-vif et saisir les crevettes 1-2 minutes par face. Ajouter 1 c. à soupe de beurre en fin de cuisson et mélanger. Réserver.",
"Dans la même poêle, faire fondre le reste du beurre à feu moyen. Ajouter l'ail et le faire revenir 30 secondes.",
"Incorporer le gochujang et cuire 1 minute pour développer les saveurs.",
"Verser la crème, le lait et le cube de bouillon émietté en fouettant. Ajouter la sauce soja, le paprika, le sucre, le reste de l'oignon en poudre et les flocons de piment. Laisser frémir 3-5 minutes.",
"Baisser le feu et incorporer le parmesan jusqu'à ce qu'il soit complètement fondu et que la sauce soit onctueuse.",
"Réchauffer les udon 1-2 minutes dans de l'eau chaude, puis les égoutter. Les ajouter à la sauce et mélanger 2-3 minutes pour bien les enrober.",
"Remettre les crevettes et mélanger délicatement.",
"Garnir d'oignons nouveaux et d'un peu de parmesan. Servir immédiatement."]
$instr$,
    10, 20, 3, 2,
    'Coréenne', 'dinner',
    ARRAY['fusion','coréen','italien','udon','carbonara','crevettes','gochujang','crémeux'],
    'manual',
    'https://moribyan.com/spicy-gochujang-carbonara-udon-with-shrimp/',
    'https://moribyan.com/wp-content/uploads/2026/02/IMG_0096.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'crevettes',                   340,  'g',          true, 1,  'grosses, décortiquées'),
    (v_recipe_id, 'huile d''olive',              1,    'c. à soupe', true, 2,  NULL),
    (v_recipe_id, 'paprika',                     0.5,  'c. à café',  true, 3,  'pour les crevettes'),
    (v_recipe_id, 'origan séché',                0.5,  'c. à café',  true, 4,  NULL),
    (v_recipe_id, 'oignon en poudre',            0.25, 'c. à café',  true, 5,  'pour les crevettes et la sauce'),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 6,  'au goût'),
    (v_recipe_id, 'poivre noir',                 0.25, 'c. à café',  true, 7,  'au goût'),
    (v_recipe_id, 'beurre doux',                 4,    'c. à soupe', true, 8,  '1 pour les crevettes + 3 pour la sauce'),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 9,  'émincé'),
    (v_recipe_id, 'gochujang',                   3,    'c. à soupe', true, 10, '3 à 4 selon le piquant'),
    (v_recipe_id, 'crème liquide légère',        240,  'ml',         true, 11, 'ou moitié crème, moitié lait'),
    (v_recipe_id, 'lait entier',                 180,  'ml',         true, 12, NULL),
    (v_recipe_id, 'cube de bouillon de poulet',  1,    'unité',      true, 13, 'gros'),
    (v_recipe_id, 'sauce soja',                  0.5,  'c. à soupe', true, 14, 'allégée en sel'),
    (v_recipe_id, 'paprika',                     2,    'c. à café',  true, 15, 'pour la sauce'),
    (v_recipe_id, 'sucre',                       1,    'c. à café',  true, 16, NULL),
    (v_recipe_id, 'flocons de piment',           0.75, 'c. à café',  true, 17, NULL),
    (v_recipe_id, 'parmesan',                    80,   'g',          true, 18, 'fraîchement râpé, + un peu pour servir'),
    (v_recipe_id, 'nouilles udon',               400,  'g',          true, 19, NULL),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      false, 20, 'émincés, pour garnir');

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
    'Burger Five Guys maison : double steak de bœuf haché 80/20 saisi à la plancha, oignons confits, fromage fondu et garnitures dans un pain au sésame.',
    $instr$["Chauffer une poêle à feu moyen, ajouter un peu d'huile, l'oignon coupé en dés et une pincée de sel.",
"Cuire 10-15 minutes en remuant de temps en temps, jusqu'à ce que l'oignon soit translucide.",
"Poursuivre la cuisson 10-15 minutes, jusqu'à ce qu'il soit bien doré et confit. Ajouter un peu d'eau s'il attache.",
"Diviser le bœuf en 4 portions d'environ 110 g et les aplatir légèrement.",
"Saler et poivrer une face. Chauffer la plancha à feu moyen-vif avec un filet d'huile.",
"Cuire les steaks face assaisonnée vers le bas 2-3 minutes, jusqu'à ce qu'ils soient bien saisis.",
"Saler et poivrer l'autre face, retourner et cuire 1 min 30 à 2 minutes.",
"Déposer une tranche de fromage sur chaque steak et la laisser fondre complètement.",
"Badigeonner l'intérieur des pains de beurre fondu et les faire griller 1-2 minutes, jusqu'à ce qu'ils soient dorés.",
"Assembler : sur le pain du bas, ketchup et moutarde, oignons confits, deux steaks, cornichons, tomate et laitue ; mayonnaise sur le pain du haut.",
"Emballer chaque burger dans du papier aluminium et laisser reposer 2-3 minutes avant de servir."]
$instr$,
    15, 15, 2, 2,
    'Américaine', 'dinner',
    ARRAY['américain','burger','copycat','fast food','bœuf','cheddar','five guys'],
    'manual',
    'https://moribyan.com/five-guys-burger-copycat/',
    'https://moribyan.com/wp-content/uploads/2026/02/IMG_0168-3.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                  454,  'g',          true, 1,  '20 % de matières grasses'),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 2,  'au goût'),
    (v_recipe_id, 'poivre noir',                 0.25, 'c. à café',  true, 3,  'au goût'),
    (v_recipe_id, 'cheddar',                     4,    'tranche',    true, 4,  'ou fromage américain'),
    (v_recipe_id, 'pains à burger',              2,    'unité',      true, 5,  'au sésame (4 pour des burgers simples)'),
    (v_recipe_id, 'beurre doux',                 30,   'g',          true, 6,  'fondu, pour les pains'),
    (v_recipe_id, 'oignon jaune',                1,    'unité',      true, 7,  'moyen, en dés'),
    (v_recipe_id, 'huile neutre',                1,    'c. à soupe', true, 8,  'pour les oignons et la cuisson'),
    (v_recipe_id, 'laitue iceberg',              50,   'g',          true, 9,  'émincée'),
    (v_recipe_id, 'tomate',                      1,    'unité',      true, 10, 'en tranches'),
    (v_recipe_id, 'cornichons',                  30,   'g',          true, 11, 'en tranches'),
    (v_recipe_id, 'ketchup',                     2,    'c. à soupe', true, 12, NULL),
    (v_recipe_id, 'moutarde jaune',              1,    'c. à soupe', true, 13, NULL),
    (v_recipe_id, 'mayonnaise',                  2,    'c. à soupe', true, 14, NULL);

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
    'Sandwich grillé fusion : thon pimenté au kimchi et à la mayonnaise japonaise, double cheddar fondu et pain au levain au beurre d''ail.',
    $instr$["Mélanger le thon égoutté, l'huile de sésame, la mayonnaise japonaise, le kimchi finement haché et les oignons nouveaux jusqu'à obtenir un mélange homogène.",
"Dans un autre bol, mélanger le beurre fondu, l'ail émincé, le persil, le parmesan, le sel et le poivre.",
"Badigeonner une face de chaque tranche de pain de ce beurre à l'ail.",
"Disposer la moitié des tranches face beurrée vers le bas. Répartir du cheddar, le mélange au thon puis encore du cheddar, et refermer avec les tranches restantes, face beurrée vers le haut.",
"Chauffer une poêle à feu moyen. Cuire les sandwichs 3-4 minutes par face, en couvrant légèrement pour faire fondre le fromage.",
"Laisser reposer 1 minute avant de couper et servir."]
$instr$,
    10, 10, 3, 1,
    'Coréenne', 'lunch',
    ARRAY['coréen','sandwich','thon','kimchi','grilled cheese','kewpie','fusion'],
    'manual',
    'https://moribyan.com/korean-inspired-tuna-melt/',
    'https://moribyan.com/wp-content/uploads/2026/02/IMG_0445.jpeg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'thon en boîte',               420,  'g',          true, 1,  'piquant (type Dongwon), 3 boîtes, égoutté'),
    (v_recipe_id, 'huile de sésame',             1,    'c. à soupe', true, 2,  NULL),
    (v_recipe_id, 'mayonnaise japonaise',        60,   'ml',         true, 3,  'type Kewpie'),
    (v_recipe_id, 'kimchi',                      60,   'g',          true, 4,  'finement haché'),
    (v_recipe_id, 'oignons nouveaux',            30,   'g',          true, 5,  'finement émincés'),
    (v_recipe_id, 'beurre doux',                 60,   'g',          true, 6,  'fondu, pour le beurre à l''ail'),
    (v_recipe_id, 'ail',                         2,    'c. à café',  true, 7,  'émincé'),
    (v_recipe_id, 'persil',                      0.5,  'c. à soupe', true, 8,  'haché'),
    (v_recipe_id, 'parmesan',                    2,    'c. à soupe', true, 9,  'râpé'),
    (v_recipe_id, 'sel',                         1,    'pincée',     true, 10, NULL),
    (v_recipe_id, 'poivre noir',                 1,    'pincée',     true, 11, NULL),
    (v_recipe_id, 'pain au levain',              6,    'tranche',    true, 12, NULL),
    (v_recipe_id, 'cheddar',                     100,  'g',          true, 13, 'râpé');

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
    'Bol de riz japonais : escalope de poulet panée au panko, mijotée dans un bouillon sucré-salé aux oignons caramélisés et nappée d''un œuf soyeux.',
    $instr$["Saler et poivrer le poulet, puis l'aplatir à épaisseur uniforme.",
"Préparer la panure : farine assaisonnée (sel, poivre, ail en poudre) ; œufs battus avec le lait ; panko assaisonné d'une pincée de sel et d'ail en poudre.",
"Pour le bouillon, mélanger le bouillon de poulet, la sauce soja, le vinaigre de riz, la maïzena et la cassonade.",
"Faire caraméliser l'oignon émincé dans un filet d'huile à feu doux-moyen jusqu'à ce qu'il soit doré, en déglaçant avec un peu d'eau si besoin.",
"Chauffer 2,5 cm d'huile dans une poêle à feu moyen jusqu'à ce qu'elle frémisse.",
"Paner les escalopes : farine, œuf, puis panko en pressant légèrement.",
"Frire les escalopes 3-4 minutes par face, jusqu'à ce qu'elles soient dorées et croustillantes. Égoutter sur une grille.",
"Dans une petite poêle, réunir la moitié des oignons et la moitié du bouillon, puis porter à frémissement doux.",
"Couper une escalope en lanières et la déposer sur les oignons. Battre un œuf, le verser par-dessus, couvrir et cuire 1-2 minutes jusqu'à ce qu'il soit juste pris. Répéter pour la deuxième portion.",
"Dresser sur le riz jasmin chaud en faisant glisser le poulet, l'œuf, les oignons et le bouillon par-dessus. Garnir d'oignons nouveaux."]
$instr$,
    25, 25, 2, 3,
    'Japonaise', 'dinner',
    ARRAY['japonais','katsudon','poulet pané','panko','œuf','réconfortant','bol'],
    'manual',
    'https://moribyan.com/katsudon-japanese-chicken-cutlet-rice-bowl/',
    'https://moribyan.com/wp-content/uploads/2025/10/IMG_9508.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blanc de poulet',             1,    'unité',      true, 1,  'gros, coupé en 2 escalopes'),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 2,  'au goût'),
    (v_recipe_id, 'poivre noir',                 0.25, 'c. à café',  true, 3,  'au goût'),
    (v_recipe_id, 'œufs',                        4,    'unité',      true, 4,  '2 pour la panure + 2 pour le bouillon'),
    (v_recipe_id, 'lait entier',                 1,    'c. à soupe', true, 5,  'pour la panure'),
    (v_recipe_id, 'farine',                      65,   'g',          true, 6,  NULL),
    (v_recipe_id, 'panko',                       120,  'g',          true, 7,  NULL),
    (v_recipe_id, 'ail en poudre',               1,    'c. à café',  true, 8,  'pour la panure'),
    (v_recipe_id, 'oignon jaune',                1,    'unité',      true, 9,  'moyen, émincé'),
    (v_recipe_id, 'bouillon de poulet',          240,  'ml',         true, 10, NULL),
    (v_recipe_id, 'sauce soja',                  3,    'c. à soupe', true, 11, 'allégée en sel'),
    (v_recipe_id, 'vinaigre de riz',             1,    'c. à soupe', true, 12, NULL),
    (v_recipe_id, 'maïzena',                     1,    'c. à café',  true, 13, NULL),
    (v_recipe_id, 'cassonade',                   1,    'c. à soupe', true, 14, NULL),
    (v_recipe_id, 'huile neutre',                500,  'ml',         true, 15, 'pour la friture (environ 2,5 cm)'),
    (v_recipe_id, 'riz jasmin',                  150,  'g',          true, 16, 'cru, cuit pour servir'),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      false, 17, 'émincés, pour garnir');

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
    'Bol de riz jaune garni de bœuf haché aux épices shawarma (piment de la Jamaïque, sumac, coriandre), nappé d''une sauce crémeuse feta-ail et de mélasse de grenade.',
    $instr$["Pour la sauce, mettre l'ail, l'eau, l'huile d'olive, le jus de citron, le sel, la feta, le sucre, la mayonnaise et la moutarde dans un blender.",
"Mixer jusqu'à obtenir une crème lisse. Rectifier l'assaisonnement et réserver au réfrigérateur.",
"Chauffer l'huile d'olive dans une poêle et faire dorer le bœuf haché en l'émiettant.",
"Ajouter le piment de la Jamaïque, la coriandre, le paprika, le sumac, le sel, le poivre et le curcuma. Mélanger pour bien enrober la viande.",
"Fouetter le bouillon de bœuf avec la maïzena et le verser dans la poêle. Laisser mijoter quelques minutes, jusqu'à ce que le bœuf soit brillant et légèrement nappé de sauce.",
"Dresser : riz jaune dans les bols, bœuf épicé, laitue émincée et cornichons hachés.",
"Arroser généreusement de sauce feta à l'ail et de mélasse de grenade."]
$instr$,
    15, 25, 4, 2,
    'Libanaise', 'dinner',
    ARRAY['libanais','méditerranéen','shawarma','bœuf','riz','feta','grenade','bol'],
    'manual',
    'https://moribyan.com/shawarma-ground-beef-rice-bowls/',
    'https://moribyan.com/wp-content/uploads/2025/12/IMG_2769.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 1,  'émincé, pour la sauce'),
    (v_recipe_id, 'eau',                         60,   'ml',         true, 2,  'pour la sauce'),
    (v_recipe_id, 'huile d''olive',              80,   'ml',         true, 3,  'pour la sauce'),
    (v_recipe_id, 'jus de citron',               2,    'c. à soupe', true, 4,  'pour la sauce'),
    (v_recipe_id, 'feta',                        43,   'g',          true, 5,  'pour la sauce'),
    (v_recipe_id, 'sucre',                       1,    'c. à café',  true, 6,  'pour la sauce'),
    (v_recipe_id, 'mayonnaise',                  120,  'ml',         true, 7,  'pour la sauce'),
    (v_recipe_id, 'moutarde jaune',              0.75, 'c. à café',  true, 8,  'pour la sauce'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 9,  'pour la sauce et le bœuf, au goût'),
    (v_recipe_id, 'bœuf haché',                  454,  'g',          true, 10, NULL),
    (v_recipe_id, 'huile d''olive',              2,    'c. à soupe', true, 11, 'pour le bœuf'),
    (v_recipe_id, 'piment de la Jamaïque',       1,    'c. à café',  true, 12, 'moulu'),
    (v_recipe_id, 'coriandre moulue',            1,    'c. à café',  true, 13, NULL),
    (v_recipe_id, 'paprika',                     1,    'c. à café',  true, 14, NULL),
    (v_recipe_id, 'sumac',                       1,    'c. à café',  true, 15, NULL),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 16, NULL),
    (v_recipe_id, 'curcuma',                     0.25, 'c. à café',  true, 17, NULL),
    (v_recipe_id, 'bouillon de bœuf',            180,  'ml',         true, 18, NULL),
    (v_recipe_id, 'maïzena',                     0.5,  'c. à soupe', true, 19, NULL),
    (v_recipe_id, 'riz',                         300,  'g',          true, 20, 'cru, cuit en riz jaune (au curcuma) pour servir'),
    (v_recipe_id, 'laitue',                      100,  'g',          true, 21, 'émincée'),
    (v_recipe_id, 'cornichons',                  60,   'g',          true, 22, 'hachés'),
    (v_recipe_id, 'mélasse de grenade',          2,    'c. à soupe', true, 23, NULL);

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
    'Bol mexicain : cuisses de poulet marinées au chipotle en adobo, maïs façon elote crémeux (mayonnaise, crema, cotija) et avocat sur un lit de riz blanc.',
    $instr$["Pour l'elote : faire fondre le beurre dans une poêle à feu moyen. Faire sauter le maïs jusqu'à ce qu'il soit doré, puis le transférer dans un saladier.",
"Incorporer la mayonnaise, la crema, le jus de citron vert, le chili en poudre, le piment de Cayenne, le cotija et le sel. Ajouter la coriandre et réserver.",
"Mélanger l'huile d'olive, l'ail, la pâte chipotle, le paprika fumé, l'origan, le cumin, le sel, le poivre et l'oignon en poudre. Enrober les cuisses de poulet de cette marinade.",
"Cuire le poulet dans une poêle huilée à feu moyen, en le retournant, jusqu'à ce qu'il soit doré et cuit à cœur. Laisser reposer, puis couper en bouchées.",
"Assembler : riz dans les bols, laitue, avocat, elote et poulet. Finir avec de la coriandre, un trait de crème aigre et du cotija."]
$instr$,
    10, 20, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','chipotle','poulet','elote','maïs','bol','30min'],
    'manual',
    'https://moribyan.com/mexican-inspired-chipotle-chicken-elote-rice-bowl/',
    'https://moribyan.com/wp-content/uploads/2025/12/IMG_0582.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'maïs',                        270,  'g',          true, 1,  'en grains, frais ou surgelé'),
    (v_recipe_id, 'beurre doux',                 20,   'g',          true, 2,  NULL),
    (v_recipe_id, 'mayonnaise',                  30,   'ml',         true, 3,  NULL),
    (v_recipe_id, 'crema mexicaine',             30,   'ml',         true, 4,  'ou crème aigre'),
    (v_recipe_id, 'jus de citron vert',          7.5,  'ml',         true, 5,  NULL),
    (v_recipe_id, 'chili en poudre',             0.5,  'c. à café',  true, 6,  NULL),
    (v_recipe_id, 'piment de Cayenne',           1,    'pincée',     true, 7,  NULL),
    (v_recipe_id, 'cotija',                      30,   'g',          true, 8,  'émietté, + un peu pour servir'),
    (v_recipe_id, 'coriandre fraîche',           15,   'g',          true, 9,  'hachée'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 10, 'pour l''elote et la marinade'),
    (v_recipe_id, 'cuisses de poulet',           600,  'g',          true, 11, 'désossées'),
    (v_recipe_id, 'huile d''olive',              15,   'ml',         true, 12, NULL),
    (v_recipe_id, 'ail',                         2,    'c. à café',  true, 13, 'émincé'),
    (v_recipe_id, 'pâte chipotle adobo',         2,    'c. à soupe', true, 14, NULL),
    (v_recipe_id, 'paprika fumé',                1,    'c. à café',  true, 15, NULL),
    (v_recipe_id, 'origan séché',                1,    'c. à café',  true, 16, NULL),
    (v_recipe_id, 'cumin moulu',                 0.5,  'c. à café',  true, 17, NULL),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 18, NULL),
    (v_recipe_id, 'oignon en poudre',            0.5,  'c. à café',  true, 19, NULL),
    (v_recipe_id, 'riz',                         300,  'g',          true, 20, 'blanc, cru, cuit pour servir'),
    (v_recipe_id, 'laitue',                      100,  'g',          true, 21, 'émincée'),
    (v_recipe_id, 'avocat',                      1,    'unité',      true, 22, 'tranché'),
    (v_recipe_id, 'crème aigre',                 4,    'c. à soupe', false, 23, 'pour servir');

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
    'Smash burgers de poulet juteux aux bords croustillants, double cheddar fondu et salade César maison (romaine, croûtons, parmesan) dans un pain brioché.',
    $instr$["Fouetter les ingrédients de la sauce César (mayonnaise, babeurre, jus de citron, Worcestershire, ail, moutarde, pâte d'anchois, persil séché, poivre et parmesan) jusqu'à obtenir une sauce lisse et crémeuse. Réfrigérer.",
"Diviser le poulet haché en 5 portions et les rouler en boules.",
"Chauffer une plancha ou une poêle en fonte à feu moyen-vif. Faire fondre un peu de beurre, déposer une boule, la couvrir de papier cuisson et l'écraser bien à plat avec une spatule.",
"Saler, poivrer et saupoudrer le dessus de paprika. Saisir 3 minutes, jusqu'à ce que le dessous soit doré.",
"Retourner, assaisonner et cuire encore 3 minutes, jusqu'à cuisson complète.",
"Couvrir chaque steak d'une tranche de cheddar (empiler 2 steaks pour des burgers doubles).",
"Beurrer les pains et les faire griller jusqu'à ce qu'ils soient dorés.",
"Dans un saladier, mélanger délicatement la romaine, les croûtons, le persil frais, du parmesan et un peu de sauce César.",
"Tartiner les deux moitiés de pain de sauce, empiler les steaks et la salade César. Servir immédiatement."]
$instr$,
    15, 15, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','burger','smash','poulet','césar','romaine','parmesan'],
    'manual',
    'https://moribyan.com/chicken-caesar-smash-burgers/',
    'https://moribyan.com/wp-content/uploads/2025/10/IMG_2568.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'mayonnaise',                  180,  'ml',         true, 1,  'pour la sauce César'),
    (v_recipe_id, 'babeurre',                    60,   'ml',         true, 2,  'pour la sauce'),
    (v_recipe_id, 'jus de citron',               15,   'ml',         true, 3,  NULL),
    (v_recipe_id, 'sauce Worcestershire',        7.5,  'ml',         true, 4,  NULL),
    (v_recipe_id, 'ail',                         2,    'c. à café',  true, 5,  'émincé'),
    (v_recipe_id, 'moutarde jaune',              2,    'c. à café',  true, 6,  NULL),
    (v_recipe_id, 'pâte d''anchois',             1,    'c. à café',  true, 7,  NULL),
    (v_recipe_id, 'persil séché',                1,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 9,  'pour la sauce et les steaks'),
    (v_recipe_id, 'parmesan',                    50,   'g',          true, 10, 'râpé, pour la sauce et la salade'),
    (v_recipe_id, 'poulet haché',                450,  'g',          true, 11, NULL),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 12, 'au goût'),
    (v_recipe_id, 'paprika',                     1,    'c. à café',  true, 13, NULL),
    (v_recipe_id, 'beurre doux',                 30,   'g',          true, 14, 'pour la cuisson et les pains'),
    (v_recipe_id, 'cheddar',                     6,    'tranche',    true, 15, 'blanc, ou fromage américain'),
    (v_recipe_id, 'pains à burger',              4,    'unité',      true, 16, 'briochés'),
    (v_recipe_id, 'romaine',                     1,    'unité',      true, 17, 'hachée'),
    (v_recipe_id, 'croûtons',                    100,  'g',          true, 18, 'légèrement écrasés'),
    (v_recipe_id, 'persil frais',                2,    'c. à soupe', false, 19, 'haché');

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
    'Cuisses de poulet glacées soja-miel servies sur du riz jasmin baignant dans un bouillon crémeux et épicé au gochujang et au parmesan, façon Buldak.',
    $instr$["Sécher les cuisses de poulet, puis les assaisonner de sel, de poivre et de maïzena.",
"Chauffer l'huile dans une grande poêle à feu moyen. Saisir les cuisses 6-7 minutes par face, jusqu'à ce qu'elles soient dorées.",
"Pour le glaçage, fouetter le miel, la cassonade, l'eau, la sauce soja et le vinaigre de riz.",
"Verser le glaçage sur le poulet et laisser mijoter 2-3 minutes, jusqu'à ce qu'il épaississe.",
"Pour le bouillon : faire fondre le beurre dans une casserole et faire revenir l'ail 1 minute.",
"Incorporer le gochujang et cuire 1-2 minutes.",
"Verser la crème, le lait, le cube de bouillon émietté, la sauce soja, le paprika, le sucre, l'oignon en poudre et les flocons de piment.",
"Laisser frémir 5-7 minutes en remuant souvent, jusqu'à ce que le bouillon soit légèrement crémeux. Hors du feu, incorporer le parmesan (facultatif).",
"Dresser : riz jasmin chaud dans les bols, bouillon crémeux par-dessus, puis les cuisses tranchées. Garnir d'oignons nouveaux."]
$instr$,
    15, 25, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['fusion','coréen','poulet','gochujang','crémeux','bouillon','buldak'],
    'manual',
    'https://moribyan.com/sweet-savory-chicken-with-spicy-carbonara-brothy-rice/',
    'https://moribyan.com/wp-content/uploads/2025/10/IMG_0471.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',           680,  'g',          true, 1,  'désossées'),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 2,  'au goût'),
    (v_recipe_id, 'poivre noir',                 0.25, 'c. à café',  true, 3,  'au goût'),
    (v_recipe_id, 'maïzena',                     2,    'c. à café',  true, 4,  NULL),
    (v_recipe_id, 'huile neutre',                1,    'c. à soupe', true, 5,  NULL),
    (v_recipe_id, 'miel',                        2,    'c. à soupe', true, 6,  'pour le glaçage'),
    (v_recipe_id, 'cassonade',                   15,   'g',          true, 7,  'pour le glaçage'),
    (v_recipe_id, 'eau',                         30,   'ml',         true, 8,  'pour le glaçage'),
    (v_recipe_id, 'sauce soja',                  60,   'ml',         true, 9,  'allégée en sel, pour le glaçage'),
    (v_recipe_id, 'vinaigre de riz',             15,   'ml',         true, 10, 'pour le glaçage'),
    (v_recipe_id, 'beurre doux',                 45,   'g',          true, 11, 'pour le bouillon'),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 12, 'émincé, pour le bouillon'),
    (v_recipe_id, 'gochujang',                   45,   'g',          true, 13, NULL),
    (v_recipe_id, 'crème liquide légère',        240,  'ml',         true, 14, 'ou moitié crème, moitié lait'),
    (v_recipe_id, 'lait entier',                 180,  'ml',         true, 15, NULL),
    (v_recipe_id, 'cube de bouillon de poulet',  1,    'unité',      true, 16, 'gros'),
    (v_recipe_id, 'sauce soja',                  0.5,  'c. à soupe', true, 17, 'allégée en sel, pour le bouillon'),
    (v_recipe_id, 'paprika',                     2,    'c. à café',  true, 18, NULL),
    (v_recipe_id, 'sucre',                       1,    'c. à café',  true, 19, NULL),
    (v_recipe_id, 'oignon en poudre',            0.5,  'c. à café',  true, 20, NULL),
    (v_recipe_id, 'flocons de piment',           0.75, 'c. à café',  true, 21, NULL),
    (v_recipe_id, 'parmesan',                    30,   'g',          false, 22, 'râpé, facultatif'),
    (v_recipe_id, 'riz jasmin',                  300,  'g',          true, 23, 'cru, cuit pour servir'),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      false, 24, 'émincés, pour garnir');

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
    'Kebab d''Adana à l''agneau épicé (paprika, piment d''Alep) cuit à l''air fryer, servi sur un pilaf de boulgour à la tomate avec une sauce yaourt aux herbes et une salade d''oignon au sumac.',
    $instr$["Pilaf de boulgour : rincer le boulgour plusieurs fois jusqu'à ce que l'eau soit claire, puis l'égoutter.",
"Chauffer l'huile d'olive et le beurre dans une casserole à feu moyen.",
"Ajouter l'ail et le concentré de tomates, faire revenir 1-2 minutes jusqu'à ce que le mélange soit parfumé et coloré.",
"Incorporer le poivron, la tomate râpée et l'oignon râpé. Faire revenir 2-3 minutes, jusqu'à ce qu'ils s'attendrissent.",
"Ajouter le boulgour, remuer pour bien l'enrober et le faire griller 1-2 minutes.",
"Verser le bouillon de poulet, assaisonner de sel et de paprika. Bien mélanger.",
"Porter à ébullition, puis réduire à feu doux, couvrir et laisser frémir 20-25 minutes.",
"Éteindre le feu, laisser reposer 10 minutes à couvert, puis égrener à la fourchette.",
"Kebab d'Adana : mélanger l'agneau haché, le poivron, l'ail, le paprika, le sel, le piment d'Alep et le poivre, sans trop travailler la viande.",
"Étaler la viande sur une feuille de papier cuisson en un rectangle de 1,5 cm d'épaisseur, la diviser en bandes allongées et marquer des stries avec le dos d'une spatule.",
"Cuire à l'air fryer à 220°C pendant 12 minutes, jusqu'à ce que les kebabs soient cuits et légèrement grillés.",
"Sauce yaourt : fouetter le yaourt, la mayonnaise, l'ail, le poivre, le thym, l'origan et la menthe séchée.",
"Salade d'oignon : mélanger l'oignon rouge émincé, le persil haché, le sumac, le sel et l'huile d'olive.",
"Dresser : pilaf, kebabs par-dessus, filet de sauce yaourt et salade d'oignon au persil. Accompagner de chou mariné, de salade verte et de piments verts."]
$instr$,
    20, 35, 4, 3,
    'Méditerranéenne', 'dinner',
    ARRAY['turc','méditerranéen','adana','kebab','agneau','boulgour','air fryer','sumac'],
    'manual',
    'https://moribyan.com/turkish-bulgur-pilaf-adana-kebab/',
    'https://moribyan.com/wp-content/uploads/2025/10/IMG_8445.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile d''olive',              1,    'c. à soupe', true, 1,  'pour le pilaf'),
    (v_recipe_id, 'beurre doux',                 14,   'g',          true, 2,  NULL),
    (v_recipe_id, 'ail',                         2,    'c. à café',  true, 3,  'émincé, pour le pilaf'),
    (v_recipe_id, 'concentré de tomates',        2,    'c. à soupe', true, 4,  NULL),
    (v_recipe_id, 'poivron rouge',               0.5,  'unité',      true, 5,  'finement coupé, pour le pilaf'),
    (v_recipe_id, 'tomate',                      1,    'unité',      true, 6,  'Roma, râpée'),
    (v_recipe_id, 'oignon jaune',                0.5,  'unité',      true, 7,  'râpé'),
    (v_recipe_id, 'boulgour',                    270,  'g',          true, 8,  'gros (n° 3)'),
    (v_recipe_id, 'bouillon de poulet',          600,  'ml',         true, 9,  NULL),
    (v_recipe_id, 'paprika',                     1,    'c. à café',  true, 10, 'pour le pilaf'),
    (v_recipe_id, 'sel',                         1.5,  'c. à café',  true, 11, 'pour le pilaf, les kebabs et la salade'),
    (v_recipe_id, 'agneau haché',                454,  'g',          true, 12, 'pour les kebabs'),
    (v_recipe_id, 'poivron rouge',               1,    'unité',      true, 13, 'finement coupé, pour les kebabs'),
    (v_recipe_id, 'ail',                         2,    'c. à café',  true, 14, 'émincé, pour les kebabs'),
    (v_recipe_id, 'paprika',                     2,    'c. à café',  true, 15, 'pour les kebabs'),
    (v_recipe_id, 'piment d''Alep',              1,    'c. à café',  true, 16, 'en flocons'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 17, 'pour les kebabs et la sauce'),
    (v_recipe_id, 'yaourt nature',               120,  'g',          true, 18, 'entier, pour la sauce'),
    (v_recipe_id, 'mayonnaise',                  60,   'ml',         true, 19, 'pour la sauce yaourt'),
    (v_recipe_id, 'ail',                         1,    'gousse',     true, 20, 'râpé, pour la sauce'),
    (v_recipe_id, 'thym séché',                  0.25, 'c. à café',  true, 21, NULL),
    (v_recipe_id, 'origan séché',                0.25, 'c. à café',  true, 22, NULL),
    (v_recipe_id, 'menthe séchée',               0.25, 'c. à café',  true, 23, NULL),
    (v_recipe_id, 'oignon rouge',                0.5,  'unité',      true, 24, 'finement émincé'),
    (v_recipe_id, 'persil frais',                6,    'g',          true, 25, 'haché'),
    (v_recipe_id, 'sumac',                       0.75, 'c. à café',  true, 26, NULL),
    (v_recipe_id, 'huile d''olive',              5,    'ml',         true, 27, 'pour la salade'),
    (v_recipe_id, 'chou rouge',                  100,  'g',          false, 28, 'mariné, pour servir'),
    (v_recipe_id, 'salade verte',                50,   'g',          false, 29, 'pour servir'),
    (v_recipe_id, 'piments verts',               4,    'unité',      false, 30, 'pour servir');

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
    'Bol shawarma sans pain : cuisses de poulet marinées aux épices méditerranéennes, pommes de terre rôties croustillantes, sauce blanche à l''ail et mélasse de grenade.',
    $instr$["Mélanger l'huile d'olive, le jus de citron, l'ail émincé et les épices (piment de la Jamaïque, coriandre, paprika, sel, sumac, poivre, curcuma). Enrober les cuisses et laisser mariner au moins 30 minutes.",
"Saisir le poulet dans une poêle à feu moyen-vif, 5-6 minutes par face, jusqu'à cuisson complète.",
"Laisser reposer brièvement, puis couper en bouchées.",
"Éplucher les pommes de terre et les couper en cubes. Les enrober d'huile, de maïzena, de sel et de poivre.",
"Cuire à l'air fryer à 200°C pendant 20-25 minutes en secouant à mi-cuisson, ou au four à 220°C pendant 35-40 minutes.",
"Pour la sauce blanche, fouetter la mayonnaise, la crème aigre, les gousses d'ail râpées, le sucre, le jus de citron, le poivre et l'eau jusqu'à obtenir une sauce lisse.",
"Dresser : pommes de terre, laitue, poulet, cornichons, sauce blanche et un filet de mélasse de grenade."]
$instr$,
    20, 40, 3, 2,
    'Libanaise', 'dinner',
    ARRAY['libanais','méditerranéen','shawarma','poulet','pommes de terre','air fryer','bol'],
    'manual',
    'https://moribyan.com/chicken-shawarma-potato-bowls/',
    'https://moribyan.com/wp-content/uploads/2025/09/IMG_1043.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',           454,  'g',          true, 1,  'désossées'),
    (v_recipe_id, 'huile d''olive',              2,    'c. à soupe', true, 2,  NULL),
    (v_recipe_id, 'jus de citron',               1,    'c. à soupe', true, 3,  'pour la marinade'),
    (v_recipe_id, 'ail',                         2,    'c. à café',  true, 4,  'émincé, pour la marinade'),
    (v_recipe_id, 'piment de la Jamaïque',       0.5,  'c. à soupe', true, 5,  'moulu'),
    (v_recipe_id, 'coriandre moulue',            1,    'c. à café',  true, 6,  NULL),
    (v_recipe_id, 'paprika',                     1.5,  'c. à café',  true, 7,  NULL),
    (v_recipe_id, 'sumac',                       1,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'curcuma',                     0.25, 'c. à café',  true, 9,  NULL),
    (v_recipe_id, 'sel',                         1.5,  'c. à café',  true, 10, 'pour le poulet et les pommes de terre'),
    (v_recipe_id, 'poivre noir',                 0.75, 'c. à café',  true, 11, 'pour le poulet, les pommes de terre et la sauce'),
    (v_recipe_id, 'pommes de terre',             3,    'unité',      true, 12, 'farineuses (type russet)'),
    (v_recipe_id, 'huile neutre',                2,    'c. à soupe', true, 13, NULL),
    (v_recipe_id, 'maïzena',                     1,    'c. à soupe', true, 14, NULL),
    (v_recipe_id, 'mayonnaise',                  180,  'ml',         true, 15, NULL),
    (v_recipe_id, 'crème aigre',                 80,   'ml',         true, 16, 'ou yaourt'),
    (v_recipe_id, 'ail',                         4,    'gousse',     true, 17, 'râpé, pour la sauce'),
    (v_recipe_id, 'sucre',                       1,    'c. à café',  true, 18, NULL),
    (v_recipe_id, 'citron',                      0.5,  'unité',      true, 19, 'jus, pour la sauce'),
    (v_recipe_id, 'eau',                         3,    'c. à soupe', true, 20, 'pour la sauce'),
    (v_recipe_id, 'laitue',                      100,  'g',          true, 21, 'émincée'),
    (v_recipe_id, 'cornichons',                  60,   'g',          true, 22, 'hachés'),
    (v_recipe_id, 'mélasse de grenade',          2,    'c. à soupe', true, 23, NULL);

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
    'Frites garnies fusion : le style « animal » d''In-N-Out en version coréenne, avec bulgogi, oignons confits, cheddar fondant et sauce mayo-kimchi-gochujang.',
    $instr$["Sauce façon In-N-Out : mélanger la mayonnaise, le kimchi finement haché, le gochujang et le sucre jusqu'à obtenir une crème lisse. Réfrigérer.",
"Oignons confits : chauffer un peu d'huile à feu moyen, ajouter les oignons coupés et une pincée de sel. Cuire 20-30 minutes en déglaçant avec un peu d'eau, jusqu'à ce qu'ils soient bien dorés.",
"Bulgogi : émincer finement le faux-filet. L'assaisonner de sel, de poivre et de chili en poudre, puis le saisir dans le reste d'huile bien chaude. Verser la marinade préparée avec la poire râpée, la sauce soja, la cassonade, l'huile de sésame, l'ail, le gingembre, le vinaigre de riz et les flocons de piment. Laisser caraméliser, puis réserver.",
"Cuire les frites jusqu'à ce qu'elles soient dorées et croustillantes. Les transférer sur une plaque allant au four.",
"Couvrir de tranches de cheddar et passer au four à 200°C pendant 4-5 minutes (ou 1-2 minutes sous le gril), jusqu'à ce que le fromage fonde.",
"Garnir de bulgogi, d'oignons confits, d'oignons nouveaux et d'une généreuse dose de sauce kimchi-gochujang. Servir immédiatement."]
$instr$,
    30, 30, 5, 3,
    'Coréenne', 'snack',
    ARRAY['fusion','coréen','américain','frites','bulgogi','copycat','in-n-out','garni'],
    'manual',
    'https://moribyan.com/korean-style-in-n-out-loaded-animal-fries/',
    'https://moribyan.com/wp-content/uploads/2025/07/IMG_0700.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'mayonnaise',                  120,  'ml',         true, 1,  'pour la sauce'),
    (v_recipe_id, 'kimchi',                      60,   'g',          true, 2,  'finement haché'),
    (v_recipe_id, 'gochujang',                   2,    'c. à soupe', true, 3,  NULL),
    (v_recipe_id, 'sucre',                       5,    'g',          true, 4,  'pour la sauce'),
    (v_recipe_id, 'faux-filet',                  450,  'g',          true, 5,  'finement émincé'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 6,  'pour le bœuf et les oignons'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 7,  'au goût'),
    (v_recipe_id, 'chili en poudre',             1,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'huile neutre',                1.5,  'c. à soupe', true, 9,  'pour les oignons et le bœuf'),
    (v_recipe_id, 'poire nashi',                 60,   'g',          true, 10, 'râpée en purée'),
    (v_recipe_id, 'sauce soja',                  60,   'ml',         true, 11, 'allégée en sel'),
    (v_recipe_id, 'cassonade',                   45,   'g',          true, 12, NULL),
    (v_recipe_id, 'huile de sésame',             22,   'ml',         true, 13, NULL),
    (v_recipe_id, 'ail',                         15,   'g',          true, 14, 'émincé'),
    (v_recipe_id, 'pâte de gingembre',           7.5,  'g',          true, 15, NULL),
    (v_recipe_id, 'vinaigre de riz',             15,   'ml',         true, 16, NULL),
    (v_recipe_id, 'flocons de piment',           5,    'g',          true, 17, NULL),
    (v_recipe_id, 'oignon jaune',                1,    'unité',      true, 18, 'gros, coupé'),
    (v_recipe_id, 'frites surgelées',            570,  'g',          true, 19, NULL),
    (v_recipe_id, 'cheddar',                     6,    'tranche',    true, 20, 'ou fromage américain'),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      false, 21, 'émincés, pour garnir');

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
    'Sliders à partager garnis de bœuf émincé, d''oignons et de poivrons fondants et de fromage fondu, dans des petits pains briochés beurrés au sésame. Idéal pour une soirée match.',
    $instr$["Faire revenir l'oignon et le poivron dans 1 c. à soupe d'huile à feu moyen 5-7 minutes, jusqu'à ce qu'ils soient tendres. Ajouter l'ail et cuire 1-2 minutes. Réserver.",
"Dans la même poêle, cuire le bœuf émincé avec le beurre et le reste de l'huile à feu moyen-vif. L'émietter et l'assaisonner de sel, de paprika, de moutarde en poudre et de poivre.",
"Bien le faire dorer, puis ajouter la sauce Worcestershire. Déglacer au bouillon de bœuf et laisser frémir 2 minutes, jusqu'à réduction.",
"Préchauffer le four à 175°C. Couper la plaque de petits pains en deux dans l'épaisseur sans les séparer, tartiner l'intérieur d'une fine couche de mayonnaise et faire griller 4-5 minutes au four.",
"Assembler : étaler le bœuf sur la base des pains, puis les légumes et le fromage.",
"Refermer avec le dessus des pains. Badigeonner de beurre fondu et parsemer de graines de sésame.",
"Couvrir de papier aluminium et cuire 10-15 minutes au four pour faire fondre le fromage.",
"Découvrir et cuire encore 5 minutes pour dorer le dessus. Laisser tiédir, puis séparer les sliders."]
$instr$,
    15, 40, 6, 2,
    'Américaine', 'snack',
    ARRAY['américain','sliders','philly','cheesesteak','bœuf','convivial','match'],
    'manual',
    'https://moribyan.com/philly-cheesesteak-sliders/',
    'https://moribyan.com/wp-content/uploads/2025/02/IMG_8418.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf',                        454,  'g',          true, 1,  'finement émincé (type faux-filet)'),
    (v_recipe_id, 'beurre doux',                 14,   'g',          true, 2,  'pour la cuisson'),
    (v_recipe_id, 'huile neutre',                2,    'c. à soupe', true, 3,  '1 pour le bœuf + 1 pour les légumes'),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 4,  'au goût'),
    (v_recipe_id, 'paprika',                     1,    'c. à café',  true, 5,  NULL),
    (v_recipe_id, 'moutarde en poudre',          0.5,  'c. à café',  true, 6,  NULL),
    (v_recipe_id, 'poivre noir',                 0.25, 'c. à café',  true, 7,  'au goût'),
    (v_recipe_id, 'sauce Worcestershire',        1,    'c. à soupe', true, 8,  NULL),
    (v_recipe_id, 'bouillon de bœuf',            60,   'ml',         true, 9,  NULL),
    (v_recipe_id, 'oignon jaune',                0.5,  'unité',      true, 10, 'gros, émincé'),
    (v_recipe_id, 'poivron vert',                1,    'unité',      true, 11, 'finement émincé'),
    (v_recipe_id, 'ail',                         0.5,  'c. à soupe', true, 12, 'émincé'),
    (v_recipe_id, 'petits pains briochés',       12,   'unité',      true, 13, 'en plaque, type Hawaiian rolls'),
    (v_recipe_id, 'mayonnaise',                  2,    'c. à soupe', true, 14, 'pour griller les pains'),
    (v_recipe_id, 'provolone',                   6,    'tranche',    true, 15, 'ou sauce au fromage fondu'),
    (v_recipe_id, 'beurre doux',                 30,   'g',          true, 16, 'fondu, pour le dessus'),
    (v_recipe_id, 'graines de sésame',           1,    'c. à soupe', false, 17, 'pour garnir');

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
    'Toutes les saveurs du burger sans le pain : bœuf haché relevé à la Worcestershire, cheddar fondant, oignons confits, cornichons et sauce burger maison sur un lit de laitue.',
    $instr$["Sauce burger : mélanger la mayonnaise, la relish égouttée, le ketchup et le sucre. Réserver.",
"Oignons confits : chauffer l'huile dans une poêle à feu moyen, ajouter l'oignon coupé et une pincée de sel.",
"Cuire 15-20 minutes en remuant, jusqu'à ce qu'il soit doré et tendre. Ajouter un peu d'eau, cuillère par cuillère, s'il attache.",
"Bœuf : faire fondre le beurre dans une poêle à feu moyen-vif. Ajouter le bœuf haché, le sel et le poivre.",
"Incorporer la sauce Worcestershire, le bouillon de bœuf et la moutarde. Cuire jusqu'à ce que la viande soit bien dorée.",
"Répartir la viande en portions dans la poêle, les couvrir de tranches de cheddar et couvrir jusqu'à ce que le fromage fonde.",
"Dresser : laitue émincée en base, bœuf au fromage par-dessus, cornichons, pepperoncini, persil et oignons confits.",
"Arroser de sauce burger et mélanger délicatement avant de servir."]
$instr$,
    10, 35, 3, 1,
    'Américaine', 'dinner',
    ARRAY['américain','salade','burger','bœuf','low-carb','réconfortant'],
    'manual',
    'https://moribyan.com/burger-salad/',
    'https://moribyan.com/wp-content/uploads/2024/10/IMG_0247.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'mayonnaise',                  80,   'ml',         true, 1,  'pour la sauce'),
    (v_recipe_id, 'relish de cornichons',        60,   'ml',         true, 2,  'égouttée'),
    (v_recipe_id, 'ketchup',                     45,   'ml',         true, 3,  NULL),
    (v_recipe_id, 'sucre',                       5,    'g',          true, 4,  'pour la sauce'),
    (v_recipe_id, 'oignon jaune',                1,    'unité',      true, 5,  'gros, coupé'),
    (v_recipe_id, 'huile végétale',              7.5,  'ml',         true, 6,  NULL),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 7,  'pour les oignons et le bœuf'),
    (v_recipe_id, 'beurre doux',                 15,   'g',          true, 8,  'ou huile d''avocat'),
    (v_recipe_id, 'bœuf haché',                  454,  'g',          true, 9,  '10 % de matières grasses'),
    (v_recipe_id, 'poivre noir',                 0.25, 'c. à café',  true, 10, 'au goût'),
    (v_recipe_id, 'sauce Worcestershire',        7.5,  'ml',         true, 11, NULL),
    (v_recipe_id, 'bouillon de bœuf',            60,   'ml',         true, 12, NULL),
    (v_recipe_id, 'moutarde jaune',              1,    'c. à café',  true, 13, NULL),
    (v_recipe_id, 'cheddar',                     4,    'tranche',    true, 14, 'ou fromage américain'),
    (v_recipe_id, 'laitue iceberg',              300,  'g',          true, 15, 'émincée'),
    (v_recipe_id, 'cornichons',                  60,   'g',          true, 16, 'à l''aneth, en tranches'),
    (v_recipe_id, 'piments pepperoncini',        60,   'g',          true, 17, 'au vinaigre, hachés'),
    (v_recipe_id, 'persil frais',                1,    'c. à soupe', false, 18, 'haché');

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
    'Salade mexicaine : bœuf haché aux épices à tacos (chili, cumin, paprika fumé), sauce mayo-chipotle, chips de tortilla écrasées, avocat et fromage râpé sur de la romaine fraîche.',
    $instr$["Chauffer l'huile d'olive dans une grande poêle à feu moyen.",
"Ajouter le bœuf haché et le faire dorer en l'émiettant à la cuillère.",
"Incorporer l'ail, le chili en poudre, la coriandre moulue, le sel, le paprika fumé, le cumin, l'origan, le poivre et l'oignon en poudre.",
"Verser la sauce tomate et le bouillon de bœuf. Laisser frémir jusqu'à épaississement.",
"Incorporer la coriandre fraîche et retirer du feu.",
"Sauce chipotle : mélanger la mayonnaise, le jus de citron vert, le miel, une pincée de chili en poudre et la pâte chipotle.",
"Assembler : romaine en base, puis bœuf, fromage râpé, tomates et avocat. Arroser de sauce chipotle et ajouter quelques cuillerées de crème aigre.",
"Parsemer de chips de tortilla écrasées et de coriandre. Servir immédiatement."]
$instr$,
    15, 15, 3, 1,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','salade','taco','bœuf','chipotle','low-carb','rapide'],
    'manual',
    'https://moribyan.com/taco-salad/',
    'https://moribyan.com/wp-content/uploads/2024/08/IMG_1130.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                  454,  'g',          true, 1,  '10 % de matières grasses'),
    (v_recipe_id, 'huile d''olive',              1,    'c. à soupe', true, 2,  NULL),
    (v_recipe_id, 'ail',                         2,    'c. à café',  true, 3,  'émincé'),
    (v_recipe_id, 'chili en poudre',             2,    'c. à café',  true, 4,  'pour le bœuf et la sauce'),
    (v_recipe_id, 'coriandre moulue',            1,    'c. à café',  true, 5,  NULL),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 6,  'au goût'),
    (v_recipe_id, 'paprika fumé',                1,    'c. à café',  true, 7,  NULL),
    (v_recipe_id, 'cumin moulu',                 1,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'origan séché',                1,    'c. à café',  true, 9,  NULL),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 10, NULL),
    (v_recipe_id, 'oignon en poudre',            0.25, 'c. à café',  true, 11, NULL),
    (v_recipe_id, 'sauce tomate',                60,   'ml',         true, 12, NULL),
    (v_recipe_id, 'bouillon de bœuf',            60,   'ml',         true, 13, NULL),
    (v_recipe_id, 'coriandre fraîche',           15,   'g',          true, 14, 'finement hachée'),
    (v_recipe_id, 'mayonnaise',                  180,  'ml',         true, 15, 'pour la sauce'),
    (v_recipe_id, 'citron vert',                 1,    'unité',      true, 16, 'jus'),
    (v_recipe_id, 'miel',                        1,    'c. à soupe', true, 17, NULL),
    (v_recipe_id, 'pâte chipotle adobo',         3,    'c. à soupe', true, 18, '3 à 4 selon le piquant'),
    (v_recipe_id, 'romaine',                     400,  'g',          true, 19, 'hachée'),
    (v_recipe_id, 'tomates',                     200,  'g',          true, 20, 'coupées'),
    (v_recipe_id, 'avocat',                      1,    'unité',      true, 21, 'tranché'),
    (v_recipe_id, 'fromage râpé',                100,  'g',          true, 22, 'mélange mexicain ou cheddar'),
    (v_recipe_id, 'chips de tortilla',           80,   'g',          true, 23, 'écrasées'),
    (v_recipe_id, 'crème aigre',                 120,  'ml',         false, 24, 'pour servir');

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
    'Version maison du burrito Taco Bell : bœuf épicé, riz à l''espagnole, sauce chipotle et sauce au fromage, avec une croûte de fromage râpé grillée directement sur la plancha.',
    $instr$["Bœuf : chauffer l'huile d'olive dans une grande poêle à feu moyen. Ajouter le bœuf haché et le faire dorer en l'émiettant.",
"Incorporer l'ail, le chili en poudre, la coriandre, le sel, le paprika fumé, le cumin, l'origan, le poivre et l'oignon en poudre. Cuire 1 minute.",
"Ajouter le bouillon de bœuf et la sauce tomate. Laisser frémir 5 minutes pour développer les saveurs.",
"Riz à l'espagnole : faire fondre le beurre dans une casserole à feu moyen. Ajouter le riz et le faire griller en remuant.",
"Incorporer le bouillon de poulet, la sauce tomate, le sel, le cumin, l'ail en poudre et l'oignon en poudre. Porter à ébullition.",
"Réduire à feu doux, couvrir et cuire jusqu'à absorption complète du liquide. Égrener à la fourchette.",
"Sauce chipotle : fouetter la mayonnaise, la crème aigre, le jus de citron vert, le miel, le poivre, une pincée de chili en poudre et la pâte chipotle. Ajuster le piquant.",
"Réchauffer les tortillas au micro-ondes ou à la poêle pour les assouplir.",
"Étaler la sauce chipotle au centre de chaque tortilla, puis ajouter le riz, la sauce au fromage, un peu de crème aigre, les chips de tortilla et le bœuf.",
"Replier les côtés et rouler serré en partant du bas.",
"Chauffer une plancha à feu moyen et y parsemer le fromage râpé directement.",
"Poser le burrito sur le fromage et cuire 2-3 minutes par face, jusqu'à ce qu'il soit doré et croustillant. Servir chaud."]
$instr$,
    30, 60, 4, 3,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','burrito','copycat','taco bell','bœuf','riz espagnol','fromage'],
    'manual',
    'https://moribyan.com/grilled-cheese-burrito-taco-bell-copycat/',
    'https://moribyan.com/wp-content/uploads/2024/08/IMG_0652.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                  454,  'g',          true, 1,  '10 % de matières grasses'),
    (v_recipe_id, 'huile d''olive',              1,    'c. à soupe', true, 2,  NULL),
    (v_recipe_id, 'ail',                         2,    'c. à café',  true, 3,  'émincé'),
    (v_recipe_id, 'chili en poudre',             2,    'c. à café',  true, 4,  'pour le bœuf et la sauce'),
    (v_recipe_id, 'coriandre moulue',            1,    'c. à café',  true, 5,  NULL),
    (v_recipe_id, 'sel',                         1.5,  'c. à café',  true, 6,  'pour le bœuf et le riz'),
    (v_recipe_id, 'paprika fumé',                1,    'c. à café',  true, 7,  NULL),
    (v_recipe_id, 'cumin moulu',                 1.5,  'c. à café',  true, 8,  '1 pour le bœuf + 0,5 pour le riz'),
    (v_recipe_id, 'origan séché',                1,    'c. à café',  true, 9,  NULL),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 10, 'pour le bœuf et la sauce'),
    (v_recipe_id, 'oignon en poudre',            1,    'c. à café',  true, 11, 'pour le bœuf et le riz'),
    (v_recipe_id, 'bouillon de bœuf',            60,   'ml',         true, 12, NULL),
    (v_recipe_id, 'sauce tomate',                80,   'ml',         true, 13, 'pour le bœuf'),
    (v_recipe_id, 'beurre doux',                 20,   'g',          true, 14, 'pour le riz'),
    (v_recipe_id, 'riz jasmin',                  200,  'g',          true, 15, NULL),
    (v_recipe_id, 'bouillon de poulet',          360,  'ml',         true, 16, NULL),
    (v_recipe_id, 'sauce tomate',                120,  'ml',         true, 17, 'pour le riz'),
    (v_recipe_id, 'ail en poudre',               0.5,  'c. à café',  true, 18, 'pour le riz'),
    (v_recipe_id, 'mayonnaise',                  180,  'ml',         true, 19, 'pour la sauce chipotle'),
    (v_recipe_id, 'crème aigre',                 60,   'ml',         true, 20, 'pour la sauce et la garniture'),
    (v_recipe_id, 'citron vert',                 1,    'unité',      true, 21, 'jus'),
    (v_recipe_id, 'miel',                        0.5,  'c. à soupe', true, 22, NULL),
    (v_recipe_id, 'pâte chipotle adobo',         3,    'c. à soupe', true, 23, NULL),
    (v_recipe_id, 'tortillas de blé',            5,    'unité',      true, 24, 'grandes'),
    (v_recipe_id, 'sauce au fromage',            120,  'g',          true, 25, 'pour nachos'),
    (v_recipe_id, 'chips de tortilla',           60,   'g',          true, 26, 'en lanières'),
    (v_recipe_id, 'fromage râpé',                120,  'g',          true, 27, 'mélange mexicain, pour la croûte');

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
    'Bol coréen complet : bulgogi mariné, légumes assaisonnés (shiitakés, carottes, épinards, concombre mariné, germes de soja), œuf au plat et sauce gochujang crémeuse à la mayonnaise japonaise.',
    $instr$["Bulgogi : mélanger la sauce soja, la cassonade, l'huile de sésame, l'ail, le gingembre, le chili en poudre, les flocons de piment, le poivre, l'huile d'olive et le vinaigre de riz. Ajouter le bœuf et l'oignon émincés, puis laisser mariner au moins 30 minutes.",
"Cuire le bœuf mariné dans une poêle bien chaude jusqu'à ce qu'il soit caramélisé.",
"Champignons : les faire sauter dans le beurre avec du sel et du poivre à feu moyen, jusqu'à ce qu'ils soient tendres.",
"Carottes : les faire sauter avec l'eau, l'huile de sésame et une pincée de sel, jusqu'à ce qu'elles soient tendres.",
"Épinards : les faire tomber dans une poêle chaude avec une pincée de sel, à couvert, 2-3 minutes.",
"Concombre mariné : mélanger le concombre coupé avec la pâte de piment, le sucre, le vinaigre de riz, l'eau chaude et une pincée de sel. Laisser mariner.",
"Germes de soja : les blanchir 10 minutes dans l'eau bouillante, puis les égoutter.",
"Sauce gochujang : mélanger le gochujang, la sauce soja, l'huile de sésame, le sucre, l'eau, la mayonnaise japonaise et le vinaigre de riz jusqu'à obtenir une sauce crémeuse.",
"Dresser : riz jasmin dans un bol, puis disposer autour le bulgogi, les champignons, les carottes, les épinards, le concombre mariné et les germes de soja.",
"Arroser généreusement de sauce gochujang, ajouter un œuf au plat et des oignons nouveaux. Mélanger avant de déguster."]
$instr$,
    30, 60, 3, 3,
    'Coréenne', 'dinner',
    ARRAY['coréen','bibimbap','bulgogi','riz','légumes','œuf','gochujang','bol'],
    'manual',
    'https://moribyan.com/bibimbap/',
    'https://moribyan.com/wp-content/uploads/2024/06/IMG_0055.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'faux-filet',                  454,  'g',          true, 1,  'ou bavette, finement émincé'),
    (v_recipe_id, 'oignon jaune',                60,   'g',          true, 2,  'finement émincé'),
    (v_recipe_id, 'sauce soja',                  60,   'ml',         true, 3,  'allégée en sel, pour la marinade'),
    (v_recipe_id, 'cassonade',                   30,   'g',          true, 4,  NULL),
    (v_recipe_id, 'huile de sésame',             22,   'ml',         true, 5,  'pour la marinade'),
    (v_recipe_id, 'ail',                         15,   'g',          true, 6,  'émincé'),
    (v_recipe_id, 'pâte de gingembre',           7.5,  'g',          true, 7,  NULL),
    (v_recipe_id, 'chili en poudre',             2,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'flocons de piment',           0.5,  'c. à café',  true, 9,  '0,5 à 1 c. à café'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 10, 'pour la marinade et les champignons'),
    (v_recipe_id, 'huile d''olive',              15,   'ml',         true, 11, NULL),
    (v_recipe_id, 'vinaigre de riz',             15,   'ml',         true, 12, 'pour la marinade'),
    (v_recipe_id, 'champignons shiitake',        70,   'g',          true, 13, 'hachés'),
    (v_recipe_id, 'beurre doux',                 15,   'g',          true, 14, NULL),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 15, 'pour les légumes, au goût'),
    (v_recipe_id, 'carottes',                    120,  'g',          true, 16, 'en julienne'),
    (v_recipe_id, 'eau',                         1,    'c. à soupe', true, 17, 'pour les carottes'),
    (v_recipe_id, 'huile de sésame',             1,    'c. à café',  true, 18, 'pour les carottes'),
    (v_recipe_id, 'épinards',                    90,   'g',          true, 19, 'frais'),
    (v_recipe_id, 'concombre',                   240,  'g',          true, 20, '2 petits, coupés'),
    (v_recipe_id, 'pâte de piment',              15,   'ml',         true, 21, NULL),
    (v_recipe_id, 'sucre',                       7.5,  'g',          true, 22, 'pour le concombre'),
    (v_recipe_id, 'vinaigre de riz',             60,   'ml',         true, 23, 'pour le concombre'),
    (v_recipe_id, 'eau',                         120,  'ml',         true, 24, 'chaude, pour le concombre'),
    (v_recipe_id, 'germes de soja',              100,  'g',          true, 25, NULL),
    (v_recipe_id, 'gochujang',                   120,  'ml',         true, 26, 'pour la sauce'),
    (v_recipe_id, 'sauce soja',                  15,   'ml',         true, 27, 'allégée en sel, pour la sauce'),
    (v_recipe_id, 'huile de sésame',             0.5,  'c. à soupe', true, 28, 'pour la sauce'),
    (v_recipe_id, 'sucre',                       22,   'g',          true, 29, 'pour la sauce'),
    (v_recipe_id, 'eau',                         60,   'ml',         true, 30, 'pour la sauce'),
    (v_recipe_id, 'mayonnaise japonaise',        60,   'ml',         true, 31, 'type Kewpie'),
    (v_recipe_id, 'vinaigre de riz',             2,    'c. à soupe', true, 32, 'pour la sauce'),
    (v_recipe_id, 'œufs',                        3,    'unité',      true, 33, 'au plat'),
    (v_recipe_id, 'riz jasmin',                  225,  'g',          true, 34, 'cru, cuit pour servir'),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      false, 35, 'hachés');

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
    'Plat national d''Arabie saoudite : cuisses de poulet épicées (cardamome, cannelle, citron noir) sur un riz basmati infusé à la tomate, garni d''amandes, de raisins secs et d''oignons frits.',
    $instr$["Chauffer le ghee dans une grande cocotte. Faire revenir l'ail, le gingembre, le concentré de tomates et l'oignon jusqu'à ce que l'oignon soit translucide (5 minutes).",
"Ajouter les épices entières (laurier, cardamome, clous de girofle, cannelle, citrons noirs et, si utilisé, le piment vert) ainsi que les trois quarts du mélange d'épices kabsa. Faire revenir 2-3 minutes.",
"Disposer les cuisses de poulet côté peau vers le bas et les saisir 5-7 minutes, jusqu'à ce qu'elles soient dorées.",
"Verser les tomates mixées. Couvrir et laisser frémir 30 minutes à feu doux.",
"Préchauffer le four à 200°C. Transférer le poulet sur une plaque, le saupoudrer du reste du mélange d'épices et le rôtir 15-20 minutes.",
"Ajouter le riz basmati égoutté dans la cocotte et le faire revenir quelques minutes, jusqu'à ce qu'il soit légèrement coloré.",
"Verser le bouillon et le sel. Porter à ébullition, puis baisser à feu doux, couvrir et cuire 20 minutes.",
"Retirer du feu et laisser reposer 10-15 minutes à couvert.",
"Égrener le riz à la fourchette, le transférer sur un plat et disposer le poulet rôti par-dessus.",
"Garnir d'amandes effilées, de raisins secs, d'oignons frits et de persil. Servir chaud."]
$instr$,
    30, 80, 7, 3,
    'Moyen-Orientale', 'dinner',
    ARRAY['arabie saoudite','moyen-orient','kabsa','poulet','riz basmati','épices','plat unique'],
    'manual',
    'https://moribyan.com/chicken-kabsa/',
    'https://moribyan.com/wp-content/uploads/2024/06/IMG_9934.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ghee',                        60,   'ml',         true, 1,  'ou beurre clarifié'),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 2,  'émincé'),
    (v_recipe_id, 'pâte de gingembre',           1,    'c. à soupe', true, 3,  NULL),
    (v_recipe_id, 'concentré de tomates',        4,    'c. à soupe', true, 4,  NULL),
    (v_recipe_id, 'oignon jaune',                1,    'unité',      true, 5,  'moyen, en dés'),
    (v_recipe_id, 'tomates',                     2,    'unité',      true, 6,  'mixées'),
    (v_recipe_id, 'cuisses de poulet',           4,    'unité',      true, 7,  'entières, avec la peau'),
    (v_recipe_id, 'laurier',                     4,    'feuille',    true, 8,  NULL),
    (v_recipe_id, 'cardamome',                   6,    'gousse',     true, 9,  'entière'),
    (v_recipe_id, 'clous de girofle',            6,    'unité',      true, 10, NULL),
    (v_recipe_id, 'cannelle',                    2,    'bâton',      true, 11, NULL),
    (v_recipe_id, 'citrons noirs',               3,    'unité',      true, 12, 'séchés (loomi)'),
    (v_recipe_id, 'piment vert',                 1,    'unité',      false, 13, 'facultatif'),
    (v_recipe_id, 'coriandre moulue',            2,    'c. à café',  true, 14, 'mélange kabsa'),
    (v_recipe_id, 'cardamome moulue',            0.5,  'c. à café',  true, 15, 'mélange kabsa'),
    (v_recipe_id, 'cannelle moulue',             0.5,  'c. à café',  true, 16, 'mélange kabsa'),
    (v_recipe_id, 'poivre noir',                 1,    'c. à café',  true, 17, 'mélange kabsa'),
    (v_recipe_id, 'curcuma',                     0.5,  'c. à café',  true, 18, 'mélange kabsa'),
    (v_recipe_id, 'oignon en poudre',            1,    'c. à café',  true, 19, 'mélange kabsa'),
    (v_recipe_id, 'chili en poudre',             2,    'c. à café',  true, 20, 'ou paprika, mélange kabsa'),
    (v_recipe_id, 'sept épices',                 2,    'c. à café',  true, 21, 'mélange libanais, mélange kabsa'),
    (v_recipe_id, 'sel',                         3,    'c. à café',  true, 22, '2 pour le mélange kabsa + 1 pour le riz'),
    (v_recipe_id, 'riz basmati',                 500,  'g',          true, 23, 'rincé et trempé'),
    (v_recipe_id, 'bouillon de poulet',          1000, 'ml',         true, 24, NULL),
    (v_recipe_id, 'amandes effilées',            40,   'g',          false, 25, 'grillées, pour garnir'),
    (v_recipe_id, 'raisins secs',                40,   'g',          false, 26, 'pour garnir'),
    (v_recipe_id, 'oignons frits',               30,   'g',          false, 27, 'pour garnir'),
    (v_recipe_id, 'persil frais',                10,   'g',          false, 28, 'haché, pour garnir');

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
    'Sandwich du Sud des États-Unis : poulet frit doublement pané, trempé dans une huile pimentée brûlante (cayenne, cassonade), avec coleslaw crémeux et sauce mayo-ketchup dans un pain brioché.',
    $instr$["Coleslaw : mélanger le chou, la mayonnaise, la moutarde, le sel, le poivre, le jus de citron et le sucre. Réfrigérer.",
"Sauce : fouetter la mayonnaise, le ketchup, la sauce Worcestershire, le poivre et l'ail en poudre.",
"Couper les blancs de poulet en filets de la taille des pains. Les sécher avec du papier absorbant.",
"Mélange sec : fouetter la farine, la maïzena, l'ail en poudre, le chili en poudre, le sel, la moutarde en poudre, le poivre et la moitié de la levure.",
"Mélange humide : fouetter le babeurre, l'œuf, la sauce piquante, le jus de cornichon et le reste de la levure.",
"Verser 3-4 c. à soupe du mélange humide dans le mélange sec et mélanger du bout des doigts pour former de petits grumeaux.",
"Paner chaque filet : mélange sec, puis mélange humide, puis à nouveau mélange sec, en secouant l'excédent. Laisser reposer 10-15 minutes.",
"Chauffer l'huile à 175°C sur 4-5 cm de profondeur. Frire 2-3 filets à la fois, 7-8 minutes, en les retournant à mi-cuisson.",
"Égoutter sur du papier absorbant. Prélever 180 ml de l'huile de friture.",
"Huile pimentée : mélanger l'huile prélevée avec la cassonade, le chili en poudre, le piment de Cayenne, la moutarde en poudre, l'ail en poudre et le sel.",
"Tremper chaque filet frit dans l'huile pimentée.",
"Beurrer et griller les pains briochés. Assembler : sauce, poulet pimenté, coleslaw, cornichons et pain du haut."]
$instr$,
    30, 60, 4, 3,
    'Américaine', 'dinner',
    ARRAY['américain','sud','nashville','poulet frit','épicé','sandwich','coleslaw'],
    'manual',
    'https://moribyan.com/nashville-hot-chicken-sandwiches/',
    'https://moribyan.com/wp-content/uploads/2024/05/IMG_8125.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',            680,  'g',          true, 1,  'gros, en filets'),
    (v_recipe_id, 'huile d''arachide',           1.5,  'l',          true, 2,  'ou huile végétale, pour la friture'),
    (v_recipe_id, 'farine',                      125,  'g',          true, 3,  NULL),
    (v_recipe_id, 'maïzena',                     3,    'c. à soupe', true, 4,  NULL),
    (v_recipe_id, 'ail en poudre',               2,    'c. à café',  true, 5,  'pour la panure, la sauce et l''huile pimentée'),
    (v_recipe_id, 'chili en poudre',             2,    'c. à soupe', true, 6,  'pour la panure et l''huile pimentée'),
    (v_recipe_id, 'sel',                         2,    'c. à café',  true, 7,  'pour la panure, le coleslaw et l''huile pimentée'),
    (v_recipe_id, 'poivre noir',                 1,    'c. à café',  true, 8,  'pour la panure, le coleslaw et la sauce'),
    (v_recipe_id, 'moutarde en poudre',          2,    'c. à café',  true, 9,  'pour la panure et l''huile pimentée'),
    (v_recipe_id, 'levure chimique',             1,    'c. à café',  true, 10, 'divisée'),
    (v_recipe_id, 'babeurre',                    180,  'ml',         true, 11, NULL),
    (v_recipe_id, 'œuf',                         1,    'unité',      true, 12, 'gros'),
    (v_recipe_id, 'sauce piquante',              2,    'c. à soupe', true, 13, 'au vinaigre'),
    (v_recipe_id, 'jus de cornichon',            60,   'ml',         true, 14, NULL),
    (v_recipe_id, 'cassonade',                   1,    'c. à soupe', true, 15, 'pour l''huile pimentée'),
    (v_recipe_id, 'piment de Cayenne',           2.5,  'c. à soupe', true, 16, NULL),
    (v_recipe_id, 'chou',                        300,  'g',          true, 17, 'émincé, mélange pour coleslaw'),
    (v_recipe_id, 'mayonnaise',                  60,   'ml',         true, 18, 'pour le coleslaw'),
    (v_recipe_id, 'moutarde jaune',              1,    'c. à soupe', true, 19, NULL),
    (v_recipe_id, 'jus de citron',               1,    'c. à soupe', true, 20, NULL),
    (v_recipe_id, 'sucre',                       1,    'c. à soupe', true, 21, 'pour le coleslaw'),
    (v_recipe_id, 'mayonnaise',                  120,  'ml',         true, 22, 'pour la sauce'),
    (v_recipe_id, 'ketchup',                     60,   'ml',         true, 23, NULL),
    (v_recipe_id, 'sauce Worcestershire',        2,    'c. à café',  true, 24, NULL),
    (v_recipe_id, 'pains à burger',              4,    'unité',      true, 25, 'briochés'),
    (v_recipe_id, 'beurre doux',                 30,   'g',          true, 26, 'pour les pains'),
    (v_recipe_id, 'cornichons',                  40,   'g',          true, 27, 'en tranches');

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
    'Frites garnies fusion : poulet shawarma épicé (piment de la Jamaïque, sumac), sauce blanche crémeuse à l''ail, olives kalamata, pepperoncini, feta et oignon rouge.',
    $instr$["Sauce blanche : mixer la mayonnaise, la crème aigre (ou le yaourt), les gousses d'ail, le sucre, le jus de citron et le poivre jusqu'à obtenir une sauce lisse. Réfrigérer.",
"Mélanger le poulet coupé en morceaux avec l'huile d'olive, le jus de citron, l'ail émincé et les épices (piment de la Jamaïque, coriandre, paprika, cumin, sel, sumac, poivre, curcuma).",
"Chauffer un filet d'huile dans une poêle et cuire le poulet 8-10 minutes, jusqu'à cuisson complète.",
"Cuire les frites selon les indications du paquet (four, friteuse ou air fryer).",
"Dresser : frites au fond du plat, poulet par-dessus, puis un généreux filet de sauce blanche.",
"Parsemer de pepperoncini, d'olives kalamata, d'oignon rouge, de feta émiettée et de persil. Servir chaud."]
$instr$,
    30, 30, 4, 2,
    'Libanaise', 'snack',
    ARRAY['libanais','méditerranéen','fusion','frites','shawarma','poulet','feta','olives'],
    'manual',
    'https://moribyan.com/shawarma-nacho-fries/',
    'https://moribyan.com/wp-content/uploads/2024/03/IMG_9919.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blanc de poulet',             450,  'g',          true, 1,  'en morceaux'),
    (v_recipe_id, 'huile d''olive',              30,   'ml',         true, 2,  'pour la marinade et la cuisson'),
    (v_recipe_id, 'jus de citron',               15,   'ml',         true, 3,  'pour la marinade'),
    (v_recipe_id, 'ail',                         10,   'g',          true, 4,  'émincé'),
    (v_recipe_id, 'piment de la Jamaïque',       2,    'c. à café',  true, 5,  'moulu'),
    (v_recipe_id, 'coriandre moulue',            1,    'c. à café',  true, 6,  NULL),
    (v_recipe_id, 'paprika',                     1,    'c. à café',  true, 7,  NULL),
    (v_recipe_id, 'cumin moulu',                 1,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'sumac',                       1,    'c. à café',  true, 9,  NULL),
    (v_recipe_id, 'curcuma',                     0.25, 'c. à café',  true, 10, NULL),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 11, 'au goût'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 12, 'pour le poulet et la sauce'),
    (v_recipe_id, 'mayonnaise',                  240,  'ml',         true, 13, 'pour la sauce'),
    (v_recipe_id, 'crème aigre',                 80,   'ml',         true, 14, 'ou yaourt'),
    (v_recipe_id, 'ail',                         5,    'gousse',     true, 15, 'pour la sauce'),
    (v_recipe_id, 'sucre',                       1,    'c. à café',  true, 16, 'pour la sauce'),
    (v_recipe_id, 'jus de citron',               15,   'ml',         true, 17, 'pour la sauce'),
    (v_recipe_id, 'frites surgelées',            500,  'g',          true, 18, NULL),
    (v_recipe_id, 'piments pepperoncini',        60,   'g',          true, 19, 'au vinaigre'),
    (v_recipe_id, 'olives kalamata',             60,   'g',          true, 20, NULL),
    (v_recipe_id, 'oignon rouge',                0.5,  'unité',      true, 21, 'finement haché'),
    (v_recipe_id, 'feta',                        80,   'g',          true, 22, 'émiettée'),
    (v_recipe_id, 'persil',                      10,   'g',          false, 23, 'haché');

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
    'Plat emblématique des food trucks new-yorkais : agneau émincé façon shawarma sur un riz épicé, sauce blanche à l''ail, sauce piquante et pain pita.',
    $instr$["Sauce blanche : mixer la mayonnaise, la crème aigre (ou le yaourt), l'ail, le sucre, le jus de citron et le poivre jusqu'à obtenir une sauce lisse. Réserver.",
"Riz épicé : faire tremper le riz 30 minutes, puis l'égoutter et le rincer à l'eau froide jusqu'à ce que l'eau soit claire.",
"Chauffer le beurre, l'huile, l'ail et le concentré de tomates dans une casserole. Cuire 2-3 minutes.",
"Ajouter le riz et le faire revenir 2-3 minutes.",
"Verser le bouillon et ajouter toutes les épices du riz (chili en poudre, sel, cumin, coriandre, garam masala, paprika, piment de Cayenne, poivre, origan, oignon en poudre, curcuma).",
"Porter à ébullition, baisser le feu, couvrir et laisser frémir 20 minutes.",
"Éteindre le feu, laisser reposer 10 minutes à couvert, puis égrener à la fourchette.",
"Agneau shawarma : mélanger l'agneau émincé avec ses épices (piment de la Jamaïque, coriandre, ail en poudre, paprika, cumin, sel, sumac, poivre, curcuma) et l'huile d'olive. Laisser mariner au moins 30 minutes, idéalement une nuit.",
"Chauffer une poêle à feu vif. Ajouter l'agneau et cuire 8-10 minutes en remuant, jusqu'à ce qu'il soit bien doré.",
"Dresser : riz épicé en base, laitue, tomates, agneau, sauce blanche et sauce piquante. Servir avec le pain pita."]
$instr$,
    15, 45, 4, 2,
    'Moyen-Orientale', 'dinner',
    ARRAY['halal','street food','new york','agneau','shawarma','riz','sauce blanche'],
    'manual',
    'https://moribyan.com/halal-cart-lamb-over-rice/',
    'https://moribyan.com/wp-content/uploads/2024/02/IMG_9985.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'agneau',                      450,  'g',          true, 1,  'finement émincé'),
    (v_recipe_id, 'huile d''olive',              45,   'ml',         true, 2,  '30 ml pour l''agneau + 15 ml pour le riz'),
    (v_recipe_id, 'piment de la Jamaïque',       1.5,  'c. à café',  true, 3,  'moulu'),
    (v_recipe_id, 'coriandre moulue',            2,    'c. à café',  true, 4,  'pour l''agneau et le riz'),
    (v_recipe_id, 'ail en poudre',               1,    'c. à café',  true, 5,  NULL),
    (v_recipe_id, 'paprika',                     2,    'c. à café',  true, 6,  'pour l''agneau et le riz'),
    (v_recipe_id, 'cumin moulu',                 2,    'c. à café',  true, 7,  'pour l''agneau et le riz'),
    (v_recipe_id, 'sumac',                       1,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'curcuma',                     0.75, 'c. à café',  true, 9,  'pour l''agneau et le riz'),
    (v_recipe_id, 'sel',                         2,    'c. à café',  true, 10, 'pour l''agneau et le riz'),
    (v_recipe_id, 'poivre noir',                 1.75, 'c. à café',  true, 11, 'pour l''agneau, la sauce et le riz'),
    (v_recipe_id, 'mayonnaise',                  240,  'ml',         true, 12, 'pour la sauce'),
    (v_recipe_id, 'crème aigre',                 80,   'ml',         true, 13, 'ou yaourt'),
    (v_recipe_id, 'ail',                         5,    'gousse',     true, 14, 'pour la sauce'),
    (v_recipe_id, 'sucre',                       1,    'c. à café',  true, 15, 'pour la sauce'),
    (v_recipe_id, 'jus de citron',               30,   'ml',         true, 16, 'pour la sauce'),
    (v_recipe_id, 'beurre doux',                 15,   'g',          true, 17, 'pour le riz'),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 18, 'émincé, pour le riz'),
    (v_recipe_id, 'concentré de tomates',        60,   'g',          true, 19, NULL),
    (v_recipe_id, 'riz basmati',                 400,  'g',          true, 20, 'ou riz jasmin, bien rincé'),
    (v_recipe_id, 'bouillon de poulet',          720,  'ml',         true, 21, NULL),
    (v_recipe_id, 'chili en poudre',             2,    'c. à café',  true, 22, NULL),
    (v_recipe_id, 'garam masala',                1,    'c. à café',  true, 23, NULL),
    (v_recipe_id, 'piment de Cayenne',           0.5,  'c. à café',  true, 24, '0,5 à 1 c. à café, ou flocons de piment'),
    (v_recipe_id, 'origan séché',                0.5,  'c. à café',  true, 25, NULL),
    (v_recipe_id, 'oignon en poudre',            0.5,  'c. à café',  true, 26, NULL),
    (v_recipe_id, 'laitue',                      100,  'g',          true, 27, 'émincée'),
    (v_recipe_id, 'tomates',                     200,  'g',          true, 28, 'coupées'),
    (v_recipe_id, 'pain pita',                   4,    'unité',      true, 29, NULL),
    (v_recipe_id, 'sauce piquante',              2,    'c. à soupe', false, 30, 'type sriracha');

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
    'Plat canadien emblématique : frites croustillantes nappées d''une sauce brune riche, fromage en grains, faux-filet sauté et oignons confits en option.',
    $instr$["Bœuf : chauffer l'huile et le beurre dans une poêle à feu vif. Ajouter le faux-filet émincé, assaisonné de paprika, de chili en poudre, d'oignon en poudre, d'ail en poudre, de sel, de poivre, de cassonade et de sauce Worcestershire. Cuire 6-7 minutes.",
"Sauce brune : faire fondre le beurre dans une casserole, ajouter la farine et fouetter 3-4 minutes pour former un roux.",
"Ajouter le bouillon de bœuf, la moutarde, le reste de l'ail en poudre, de l'oignon en poudre et du paprika, le poivre et le fond de bœuf. Laisser frémir jusqu'à épaississement, puis retirer du feu.",
"Oignons confits (facultatif) : faire revenir l'oignon coupé avec un filet d'huile et une pincée de sel à feu doux-moyen pendant 12 minutes, en remuant.",
"Passer à feu moyen et ajouter de l'eau, une cuillère à soupe à la fois, en la laissant s'évaporer entre chaque ajout (20-25 minutes au total).",
"Cuire les frites selon les indications du paquet.",
"Dresser : frites dans un bol, fromage en grains, sauce brune, oignons confits et bœuf. Garnir de ciboulette ou de persil."]
$instr$,
    15, 45, 4, 2,
    'Américaine', 'dinner',
    ARRAY['canadien','poutine','frites','sauce brune','fromage en grains','bœuf','réconfortant'],
    'manual',
    'https://moribyan.com/poutine/',
    'https://moribyan.com/wp-content/uploads/2024/01/IMG_9947.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'faux-filet',                  450,  'g',          true, 1,  'finement émincé'),
    (v_recipe_id, 'huile d''olive',              15,   'ml',         true, 2,  NULL),
    (v_recipe_id, 'beurre doux',                 15,   'g',          true, 3,  'pour le bœuf'),
    (v_recipe_id, 'paprika',                     1,    'c. à café',  true, 4,  'pour le bœuf et la sauce'),
    (v_recipe_id, 'oignon en poudre',            1,    'c. à café',  true, 5,  'pour le bœuf et la sauce'),
    (v_recipe_id, 'chili en poudre',             2,    'c. à café',  true, 6,  NULL),
    (v_recipe_id, 'ail en poudre',               0.5,  'c. à café',  true, 7,  'pour le bœuf et la sauce'),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 8,  'au goût'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 9,  'pour le bœuf et la sauce'),
    (v_recipe_id, 'cassonade',                   5,    'g',          true, 10, NULL),
    (v_recipe_id, 'sauce Worcestershire',        30,   'ml',         true, 11, NULL),
    (v_recipe_id, 'beurre doux',                 45,   'g',          true, 12, 'pour le roux'),
    (v_recipe_id, 'farine',                      45,   'g',          true, 13, NULL),
    (v_recipe_id, 'bouillon de bœuf',            360,  'ml',         true, 14, NULL),
    (v_recipe_id, 'moutarde jaune',              1,    'c. à café',  true, 15, NULL),
    (v_recipe_id, 'fond de bœuf',                5,    'g',          true, 16, 'concentré ou en poudre'),
    (v_recipe_id, 'frites surgelées',            500,  'g',          true, 17, NULL),
    (v_recipe_id, 'fromage en grains',           200,  'g',          true, 18, 'cheddar blanc en grains'),
    (v_recipe_id, 'oignon jaune',                1,    'unité',      false, 19, 'facultatif, pour les oignons confits'),
    (v_recipe_id, 'ciboulette',                  10,   'g',          false, 20, 'pour garnir');

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
    'Plat grésillant japonais inspiré de la chaîne du même nom : bœuf finement émincé et riz jasmin saisis dans une poêle brûlante avec une sauce soja-gingembre-piment, du maïs doux et des oignons nouveaux.',
    $instr$["Sauce : chauffer une casserole à feu doux-moyen. Mélanger la sauce soja, la sauce d'huître, la pâte de piment, le poivre noir, l'ail, la pâte de gingembre, la cassonade et le vinaigre de riz. Laisser frémir doucement.",
"Délayer la maïzena dans l'eau, l'ajouter à la sauce et remuer jusqu'à épaississement.",
"Retirer du feu une fois la consistance souhaitée obtenue.",
"Chauffer une poêle en fonte à feu moyen-vif jusqu'à ce qu'elle soit très chaude. Ajouter le beurre ou l'huile.",
"Disposer le riz au centre de la poêle et répartir le bœuf tout autour.",
"Verser la sauce sur le bœuf selon votre goût.",
"Cuire 5-7 minutes, jusqu'à la cuisson souhaitée du bœuf.",
"Garnir de maïs, d'oignons nouveaux et de poivre concassé, puis servir directement dans la poêle grésillante."]
$instr$,
    20, 10, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','pepper lunch','steak','riz','grésillant','plancha','30min'],
    'manual',
    'https://moribyan.com/pepper-lunch/',
    'https://moribyan.com/wp-content/uploads/2023/10/Pepper-Lunch.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'faux-filet',                  454,  'g',          true, 1,  'ou autre steak, finement émincé'),
    (v_recipe_id, 'sauce soja',                  80,   'ml',         true, 2,  NULL),
    (v_recipe_id, 'sauce d''huître',             1,    'c. à soupe', true, 3,  NULL),
    (v_recipe_id, 'pâte de piment',              1,    'c. à soupe', true, 4,  'à ajuster'),
    (v_recipe_id, 'poivre noir',                 0.25, 'c. à café',  true, 5,  'moulu, + du poivre concassé pour servir'),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 6,  'émincé'),
    (v_recipe_id, 'pâte de gingembre',           2,    'c. à café',  true, 7,  NULL),
    (v_recipe_id, 'cassonade',                   19,   'g',          true, 8,  NULL),
    (v_recipe_id, 'vinaigre de riz',             0.5,  'c. à soupe', true, 9,  NULL),
    (v_recipe_id, 'maïzena',                     1,    'c. à café',  true, 10, NULL),
    (v_recipe_id, 'eau',                         30,   'ml',         true, 11, 'pour délayer la maïzena'),
    (v_recipe_id, 'beurre doux',                 30,   'g',          true, 12, 'ou huile'),
    (v_recipe_id, 'riz jasmin',                  150,  'g',          true, 13, 'cru, cuit'),
    (v_recipe_id, 'maïs doux',                   40,   'g',          true, 14, 'en grains'),
    (v_recipe_id, 'oignons nouveaux',            15,   'g',          false, 15, 'finement émincés, pour garnir');

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
    'Fajitas à la plaque : poulet mariné chipotle-miel et poivrons multicolores rôtis 20 minutes au four, puis nappés de fromage râpé. À servir avec des tortillas.',
    $instr$["Préchauffer le four à 220°C.",
"Dans un grand saladier, mélanger le poulet émincé, l'huile d'olive, la pâte chipotle, l'ail, le chili en poudre, la coriandre, le paprika, l'origan, l'oignon en poudre, le cumin, le sel et le miel.",
"Étaler les poivrons émincés et le poulet mariné sur une plaque de four.",
"Enfourner 20 minutes, jusqu'à ce que le poulet soit cuit et légèrement grillé.",
"Facultatif : parsemer de fromage râpé et remettre 1-2 minutes au four pour le faire fondre.",
"Garnir de coriandre fraîche et servir chaud avec les tortillas, la crème aigre et des quartiers de citron vert."]
$instr$,
    10, 20, 3, 1,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','fajitas','poulet','chipotle','miel','à la plaque','one-pan','rapide'],
    'manual',
    'https://moribyan.com/honey-chipotle-chicken-fajitas/',
    'https://moribyan.com/wp-content/uploads/2023/10/IMG_9624.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',            680,  'g',          true, 1,  'gros, finement émincés'),
    (v_recipe_id, 'poivron rouge',               1,    'unité',      true, 2,  'émincé'),
    (v_recipe_id, 'poivron vert',                1,    'unité',      true, 3,  'émincé'),
    (v_recipe_id, 'poivron jaune',               1,    'unité',      true, 4,  'émincé'),
    (v_recipe_id, 'huile d''olive',              45,   'ml',         true, 5,  NULL),
    (v_recipe_id, 'pâte chipotle adobo',         3,    'c. à soupe', true, 6,  '3 à 4 c. à soupe'),
    (v_recipe_id, 'ail',                         10,   'g',          true, 7,  'émincé'),
    (v_recipe_id, 'chili en poudre',             1,    'c. à soupe', true, 8,  NULL),
    (v_recipe_id, 'coriandre moulue',            1,    'c. à café',  true, 9,  NULL),
    (v_recipe_id, 'paprika',                     1,    'c. à café',  true, 10, NULL),
    (v_recipe_id, 'origan séché',                1,    'c. à café',  true, 11, NULL),
    (v_recipe_id, 'oignon en poudre',            0.5,  'c. à café',  true, 12, NULL),
    (v_recipe_id, 'cumin moulu',                 0.5,  'c. à café',  true, 13, NULL),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 14, 'au goût'),
    (v_recipe_id, 'miel',                        30,   'ml',         true, 15, NULL),
    (v_recipe_id, 'fromage râpé',                60,   'g',          false, 16, 'mélange mexicain, facultatif'),
    (v_recipe_id, 'coriandre fraîche',           10,   'g',          false, 17, 'hachée'),
    (v_recipe_id, 'tortillas de blé',            6,    'unité',      false, 18, 'pour servir'),
    (v_recipe_id, 'crème aigre',                 4,    'c. à soupe', false, 19, 'pour servir'),
    (v_recipe_id, 'citron vert',                 1,    'unité',      false, 20, 'en quartiers, pour servir');

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
    'Pâtes fusion crémeuses au tofu soyeux mixé, au gochujang, au parmesan et aux flocons de piment. Une alternative végétarienne et riche en protéines à la sauce alfredo, en version épicée.',
    $instr$["Mixer le tofu soyeux avec le lait jusqu'à obtenir une crème parfaitement lisse.",
"Cuire les pâtes dans de l'eau bouillante salée selon les indications du paquet. Égoutter.",
"Chauffer une casserole à feu moyen. Faire revenir le beurre, l'huile d'olive, l'ail et le gochujang 2-3 minutes.",
"Ajouter la crème de tofu, le parmesan, le basilic, les flocons de piment, le chili en poudre et le sel.",
"Bien mélanger la sauce, goûter et rectifier l'assaisonnement.",
"Mélanger les pâtes cuites avec la sauce.",
"Servir avec des oignons nouveaux, un peu de parmesan et des flocons de piment."]
$instr$,
    15, 30, 5, 2,
    'Coréenne', 'dinner',
    ARRAY['fusion','coréen','italien','pâtes','tofu','gochujang','végétarien','protéiné'],
    'manual',
    'https://moribyan.com/creamy-gochujang-pasta-with-tofu/',
    'https://moribyan.com/wp-content/uploads/2023/07/IMG_9453.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'tofu soyeux',                 454,  'g',          true, 1,  NULL),
    (v_recipe_id, 'lait',                        60,   'ml',         true, 2,  'au choix'),
    (v_recipe_id, 'beurre doux',                 15,   'g',          true, 3,  NULL),
    (v_recipe_id, 'huile d''olive',              15,   'ml',         true, 4,  NULL),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 5,  'émincé'),
    (v_recipe_id, 'gochujang',                   4,    'c. à soupe', true, 6,  NULL),
    (v_recipe_id, 'parmesan',                    50,   'g',          true, 7,  'fraîchement râpé, + un peu pour servir'),
    (v_recipe_id, 'basilic séché',               1,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'flocons de piment',           1,    'c. à café',  true, 9,  '+ un peu pour servir'),
    (v_recipe_id, 'chili en poudre',             1,    'c. à café',  true, 10, NULL),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 11, 'pour la sauce et l''eau des pâtes'),
    (v_recipe_id, 'pâtes',                       454,  'g',          true, 12, NULL),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      false, 13, 'hachés');

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
    'Version maison du Filet-O-Fish de McDonald''s : filet de poisson blanc pané au panko et frit, fromage fondu et sauce tartare maison à l''aneth dans un pain moelleux.',
    $instr$["Sauce tartare : mélanger la mayonnaise, la relish, le jus de citron, le persil, le sucre, la moutarde, l'aneth, l'oignon en poudre, les flocons de piment et du poivre jusqu'à obtenir une sauce épaisse.",
"Mélange de farine : mélanger la farine, du sel, du poivre et du chili en poudre dans un bol.",
"Mélange d'œufs : battre les œufs avec du sel, du chili en poudre et du poivre dans un deuxième bol.",
"Mélange de panko : mixer le panko avec du sel, du chili en poudre et du poivre jusqu'à obtenir une texture sableuse.",
"Paner chaque filet : farine, puis œuf, puis panko. Utiliser une main pour les ingrédients secs et l'autre pour l'œuf.",
"Chauffer l'huile végétale à 165°C, sans la laisser surchauffer.",
"Frire les filets sans surcharger 8-9 minutes, jusqu'à ce qu'ils soient dorés et cuits à cœur.",
"Égoutter sur une grille et déposer immédiatement une tranche de fromage sur chaque filet pour la faire fondre.",
"Beurrer et griller les pains, puis assembler : filet au fromage fondu, sauce tartare et laitue (facultatif). Refermer."]
$instr$,
    30, 30, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','copycat','mcdonald''s','poisson','pané','fast food','sandwich'],
    'manual',
    'https://moribyan.com/filet-o-fish-copycat/',
    'https://moribyan.com/wp-content/uploads/2023/05/IMG_9255.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filets de poisson blanc',     600,  'g',          true, 1,  '4 filets de 150 g'),
    (v_recipe_id, 'cheddar',                     4,    'tranche',    true, 2,  'ou fromage américain'),
    (v_recipe_id, 'pains à burger',              4,    'unité',      true, 3,  'moelleux'),
    (v_recipe_id, 'beurre doux',                 20,   'g',          true, 4,  'pour les pains'),
    (v_recipe_id, 'huile végétale',              1,    'l',          true, 5,  'pour la friture'),
    (v_recipe_id, 'mayonnaise',                  240,  'ml',         true, 6,  'pour la sauce'),
    (v_recipe_id, 'relish de cornichons',        60,   'ml',         true, 7,  'à l''aneth'),
    (v_recipe_id, 'jus de citron',               1,    'c. à soupe', true, 8,  NULL),
    (v_recipe_id, 'persil',                      1,    'c. à soupe', true, 9,  'finement haché'),
    (v_recipe_id, 'sucre',                       0.75, 'c. à café',  true, 10, NULL),
    (v_recipe_id, 'moutarde jaune',              1,    'c. à café',  true, 11, NULL),
    (v_recipe_id, 'aneth séché',                 1,    'c. à café',  true, 12, NULL),
    (v_recipe_id, 'oignon en poudre',            0.5,  'c. à café',  true, 13, NULL),
    (v_recipe_id, 'flocons de piment',           0.5,  'c. à café',  true, 14, NULL),
    (v_recipe_id, 'farine',                      180,  'g',          true, 15, NULL),
    (v_recipe_id, 'œufs',                        2,    'unité',      true, 16, 'gros, battus'),
    (v_recipe_id, 'panko',                       240,  'g',          true, 17, 'mixé'),
    (v_recipe_id, 'chili en poudre',             2,    'c. à café',  true, 18, 'pour la panure'),
    (v_recipe_id, 'sel',                         1.5,  'c. à café',  true, 19, 'pour la panure'),
    (v_recipe_id, 'poivre noir',                 1,    'c. à café',  true, 20, 'pour la sauce et la panure'),
    (v_recipe_id, 'laitue',                      4,    'feuille',    false, 21, 'facultatif');

  -- =====================================================================
  -- 27. Crispy Fiery Beef
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Crispy Fiery Beef',
    'Bœuf croustillant façon traiteur chinois : lamelles de surlonge enrobées d''œuf et de maïzena, frites puis enrobées d''une sauce sucrée-piquante avec oignon et piments Fresno.',
    $instr$["Mettre la maïzena, le chili en poudre, le sel et le poivre dans un sac hermétique et secouer pour mélanger.",
"Battre les œufs avec une pincée de sel, de chili en poudre et de poivre dans un bol.",
"Tremper les lamelles de bœuf dans l'œuf battu, par petites quantités, puis les transférer dans le sac de maïzena assaisonnée.",
"Fermer le sac et secouer vigoureusement jusqu'à ce que la viande soit uniformément enrobée.",
"Sauce : faire fondre le beurre dans une casserole. Faire revenir l'ail, le gingembre et le concentré de tomates 2 minutes.",
"Ajouter le vinaigre de riz, une pincée de chili en poudre, les flocons de piment, la sauce soja, la sauce chili douce et la cassonade. Laisser frémir, puis épaissir avec la maïzena délayée dans l'eau.",
"Légumes : chauffer l'huile de sésame dans un wok et faire sauter l'oignon 5 minutes jusqu'à ce qu'il soit doré, puis ajouter les piments et cuire 2 minutes.",
"Chauffer l'huile végétale à 175°C. Frire le bœuf en 2 fois, 6-8 minutes, jusqu'à ce qu'il soit doré. Égoutter sur une grille.",
"Réunir le bœuf frit, la sauce et les légumes, et mélanger pour bien enrober.",
"Servir chaud sur du riz, garni d'oignons nouveaux et de graines de sésame."]
$instr$,
    20, 35, 4, 3,
    'Chinoise', 'dinner',
    ARRAY['chinois','bœuf','croustillant','épicé','sauce chili douce','wok','traiteur'],
    'manual',
    'https://moribyan.com/crispy-firey-beef/',
    'https://moribyan.com/wp-content/uploads/2023/04/IMG_9194.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'surlonge de bœuf',            450,  'g',          true, 1,  'finement émincée'),
    (v_recipe_id, 'maïzena',                     95,   'g',          true, 2,  'pour la panure'),
    (v_recipe_id, 'chili en poudre',             2,    'c. à café',  true, 3,  'pour la panure et la sauce'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 4,  'pour la panure'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 5,  'pour la panure'),
    (v_recipe_id, 'œufs',                        2,    'unité',      true, 6,  'battus'),
    (v_recipe_id, 'beurre doux',                 30,   'g',          true, 7,  'pour la sauce'),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 8,  'émincé'),
    (v_recipe_id, 'pâte de gingembre',           2,    'c. à café',  true, 9,  NULL),
    (v_recipe_id, 'concentré de tomates',        2,    'c. à soupe', true, 10, NULL),
    (v_recipe_id, 'vinaigre de riz',             1,    'c. à soupe', true, 11, NULL),
    (v_recipe_id, 'flocons de piment',           1,    'c. à café',  true, 12, NULL),
    (v_recipe_id, 'sauce soja',                  60,   'ml',         true, 13, 'allégée en sel'),
    (v_recipe_id, 'sauce chili douce',           60,   'ml',         true, 14, NULL),
    (v_recipe_id, 'cassonade',                   50,   'g',          true, 15, NULL),
    (v_recipe_id, 'eau',                         60,   'ml',         true, 16, 'pour délayer la maïzena'),
    (v_recipe_id, 'maïzena',                     2,    'c. à café',  true, 17, 'pour épaissir la sauce'),
    (v_recipe_id, 'huile de sésame',             2,    'c. à café',  true, 18, NULL),
    (v_recipe_id, 'oignon jaune',                0.5,  'unité',      true, 19, 'moyen, en gros morceaux'),
    (v_recipe_id, 'piments rouges',              2,    'unité',      true, 20, 'type Fresno, 2 à 3, émincés'),
    (v_recipe_id, 'huile végétale',              1,    'l',          true, 21, 'pour la friture'),
    (v_recipe_id, 'riz',                         300,  'g',          false, 22, 'cru, cuit pour servir'),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      false, 23, 'émincés, pour garnir'),
    (v_recipe_id, 'graines de sésame',           1,    'c. à café',  false, 24, 'pour garnir');

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
    'Version maison du Big Mac : deux steaks fins à la moutarde, sauce Big Mac maison, oignon haché, cornichons et laitue iceberg, empilés dans un pain au sésame à trois étages.',
    $instr$["Sauce Big Mac : mélanger la mayonnaise, la relish égouttée, le ketchup, le sucre et le vinaigre blanc dans un bol. Réserver.",
"Steaks : diviser le bœuf en 8 portions d'environ 110 g. Les façonner en disques fins et larges, puis saler et poivrer les deux faces.",
"Griller les pains : beurrer l'intérieur et les poser, face beurrée vers le bas, dans une poêle chaude jusqu'à ce que les bords soient dorés.",
"Cuire les steaks : chauffer la poêle à feu moyen-vif avec le beurre et l'huile. Cuire en plusieurs fois, 2-3 minutes par face, en étalant de la moutarde sur la face crue avant de retourner.",
"Couvrir la moitié des steaks d'une tranche de fromage et couvrir la poêle 1 minute pour la faire fondre.",
"Assembler : base du pain, sauce, laitue, oignon et steak au fromage ; deuxième base de pain, sauce, laitue, oignon, cornichons et second steak ; chapeau du pain.",
"Servir chaud."]
$instr$,
    35, 25, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','copycat','mcdonald''s','big mac','burger','triple','fast food'],
    'manual',
    'https://moribyan.com/big-mac/',
    'https://moribyan.com/wp-content/uploads/2023/04/93E2CC42-CD42-4D54-8EEF-F41488BD51C1.jpeg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                  910,  'g',          true, 1,  '20 % de matières grasses'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 2,  'au goût'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 3,  'au goût'),
    (v_recipe_id, 'beurre doux',                 15,   'g',          true, 4,  'pour la cuisson des steaks'),
    (v_recipe_id, 'huile végétale',              15,   'ml',         true, 5,  NULL),
    (v_recipe_id, 'moutarde jaune',              60,   'ml',         true, 6,  NULL),
    (v_recipe_id, 'cheddar',                     4,    'tranche',    true, 7,  'ou fromage américain'),
    (v_recipe_id, 'pains à burger',              8,    'unité',      true, 8,  'au sésame, dont 4 bases pour l''étage du milieu'),
    (v_recipe_id, 'beurre doux',                 60,   'g',          true, 9,  'ramolli, pour les pains'),
    (v_recipe_id, 'oignon blanc',                1,    'unité',      true, 10, 'haché'),
    (v_recipe_id, 'cornichons',                  60,   'g',          true, 11, 'en tranches'),
    (v_recipe_id, 'laitue iceberg',              150,  'g',          true, 12, 'émincée'),
    (v_recipe_id, 'mayonnaise',                  80,   'ml',         true, 13, 'pour la sauce'),
    (v_recipe_id, 'relish de cornichons',        60,   'ml',         true, 14, 'égouttée'),
    (v_recipe_id, 'ketchup',                     45,   'ml',         true, 15, NULL),
    (v_recipe_id, 'sucre',                       5,    'g',          true, 16, 'pour la sauce'),
    (v_recipe_id, 'vinaigre blanc',              1,    'c. à café',  true, 17, NULL);

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
    'Bols de saumon en 30 minutes : cubes marinés au chipotle saisis et dorés, salsa fraîche mangue-avocat, riz citron vert-coriandre et cotija pour une touche fumée et acidulée.',
    $instr$["Mélanger le saumon en cubes avec 2 c. à soupe d'huile d'olive, la pâte chipotle, l'ail, le chili en poudre, le sel, la coriandre moulue, le cumin, l'origan et le poivre. Bien enrober.",
"Chauffer le reste de l'huile dans une poêle à feu moyen-vif. Saisir le saumon sans surcharger la poêle, jusqu'à ce qu'il soit doré sur toutes les faces et cuit (6-8 minutes).",
"Salsa : mélanger la mangue en dés, l'avocat, le jalapeño, l'oignon rouge, la coriandre fraîche, le jus de citron vert, du sel et du poivre. Goûter et rectifier.",
"Dresser : riz citron vert-coriandre dans les bols, saumon, salsa mangue-avocat, maïs, laitue, cotija, haricots noirs et crème aigre."]
$instr$,
    30, 15, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','saumon','chipotle','bol','mangue','avocat','rapide','sain'],
    'manual',
    'https://moribyan.com/chipotle-salmon-bowls/',
    'https://moribyan.com/wp-content/uploads/2023/03/IMG_8998.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'saumon',                      454,  'g',          true, 1,  'en cubes'),
    (v_recipe_id, 'pâte chipotle adobo',         2,    'c. à soupe', true, 2,  '2 à 3 c. à soupe'),
    (v_recipe_id, 'huile d''olive',              45,   'ml',         true, 3,  '2 c. à soupe pour la marinade + 1 pour la cuisson'),
    (v_recipe_id, 'ail',                         2,    'c. à café',  true, 4,  'émincé'),
    (v_recipe_id, 'chili en poudre',             1,    'c. à soupe', true, 5,  NULL),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 6,  'pour le saumon et la salsa'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 7,  'pour le saumon et la salsa'),
    (v_recipe_id, 'cumin moulu',                 1,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'origan séché',                1,    'c. à café',  true, 9,  NULL),
    (v_recipe_id, 'coriandre moulue',            1,    'c. à café',  true, 10, NULL),
    (v_recipe_id, 'mangue',                      1,    'unité',      true, 11, 'en petits dés'),
    (v_recipe_id, 'avocat',                      1,    'unité',      true, 12, 'en dés'),
    (v_recipe_id, 'jalapeño',                    1,    'unité',      true, 13, 'en dés'),
    (v_recipe_id, 'oignon rouge',                0.5,  'unité',      true, 14, 'en dés'),
    (v_recipe_id, 'coriandre fraîche',           2,    'c. à soupe', true, 15, 'hachée'),
    (v_recipe_id, 'citron vert',                 1,    'unité',      true, 16, 'jus'),
    (v_recipe_id, 'riz',                         300,  'g',          true, 17, 'cru, cuit et parfumé au citron vert et à la coriandre'),
    (v_recipe_id, 'maïs',                        100,  'g',          true, 18, 'en grains'),
    (v_recipe_id, 'laitue',                      100,  'g',          true, 19, 'émincée'),
    (v_recipe_id, 'cotija',                      60,   'g',          true, 20, 'émietté'),
    (v_recipe_id, 'haricots noirs',              120,  'g',          true, 21, 'cuits, égouttés'),
    (v_recipe_id, 'crème aigre',                 4,    'c. à soupe', false, 22, 'pour servir');

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
    'Riz frit coréen complet : bavette marinée façon bulgogi (poire, soja, sésame), riz jasmin sauté au kimchi, à son jus et au gochujang avec carottes et petits pois, surmonté d''un œuf au plat.',
    $instr$["Bulgogi : dans un saladier, mélanger la bavette, la sauce soja, la cassonade, la poire râpée, l'huile de sésame, l'ail, le gingembre, une partie du chili en poudre et des flocons de piment, le poivre, l'huile d'olive et le vinaigre de riz. Faire cuire aussitôt ou laisser mariner jusqu'au lendemain.",
"Chauffer une poêle à feu vif. Ajouter la viande sans surcharger et la cuire jusqu'à ce qu'elle soit dorée et caramélisée.",
"Retirer la viande une fois cuite et la sauce épaissie. Réserver.",
"Riz frit : chauffer la poêle à feu moyen. Ajouter le beurre, l'ail et le gochujang, et faire revenir 1 minute.",
"Ajouter le riz et le faire sauter 2 minutes pour le rendre croustillant.",
"Incorporer le jus de kimchi, le kimchi haché, les carottes, les petits pois, le reste des flocons de piment et du chili en poudre, la sauce soja, le poivre, le sel et l'huile de sésame. Cuire 2-3 minutes.",
"Remettre le bulgogi dans la poêle et mélanger.",
"Servir surmonté d'un œuf au plat, d'oignons nouveaux, de graines de sésame et de nori en lanières."]
$instr$,
    15, 30, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','riz frit','bulgogi','kimchi','gochujang','bœuf','œuf','complet'],
    'manual',
    'https://moribyan.com/bulgogi-kimchi-fried-rice/',
    'https://moribyan.com/wp-content/uploads/2023/02/IMG_9031.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bavette',                     454,  'g',          true, 1,  'finement émincée'),
    (v_recipe_id, 'sauce soja',                  60,   'ml',         true, 2,  'allégée en sel, pour la marinade'),
    (v_recipe_id, 'cassonade',                   1.5,  'c. à soupe', true, 3,  NULL),
    (v_recipe_id, 'poire nashi',                 60,   'g',          true, 4,  'râpée en purée'),
    (v_recipe_id, 'huile de sésame',             1.5,  'c. à soupe', true, 5,  'pour la marinade'),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 6,  'émincé, pour la marinade'),
    (v_recipe_id, 'gingembre',                   1,    'c. à soupe', true, 7,  'émincé'),
    (v_recipe_id, 'chili en poudre',             2,    'c. à café',  true, 8,  'pour la marinade et le riz'),
    (v_recipe_id, 'flocons de piment',           1,    'c. à café',  true, 9,  'pour la marinade et le riz'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 10, 'pour la marinade et le riz'),
    (v_recipe_id, 'huile d''olive',              15,   'ml',         true, 11, NULL),
    (v_recipe_id, 'vinaigre de riz',             15,   'ml',         true, 12, NULL),
    (v_recipe_id, 'beurre doux',                 60,   'g',          true, 13, 'pour le riz'),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 14, 'émincé, pour le riz'),
    (v_recipe_id, 'gochujang',                   2,    'c. à soupe', true, 15, NULL),
    (v_recipe_id, 'riz jasmin',                  250,  'g',          true, 16, 'cru, cuit la veille et refroidi (environ 750 g cuit)'),
    (v_recipe_id, 'jus de kimchi',               30,   'ml',         true, 17, NULL),
    (v_recipe_id, 'kimchi',                      240,  'g',          true, 18, 'haché'),
    (v_recipe_id, 'carottes',                    120,  'g',          true, 19, 'en dés, surgelées'),
    (v_recipe_id, 'petits pois',                 120,  'g',          true, 20, 'surgelés'),
    (v_recipe_id, 'sauce soja',                  45,   'ml',         true, 21, 'allégée en sel, pour le riz'),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 22, 'au goût'),
    (v_recipe_id, 'huile de sésame',             2,    'c. à café',  true, 23, 'pour le riz'),
    (v_recipe_id, 'œufs',                        4,    'unité',      true, 24, 'au plat'),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      false, 25, 'émincés'),
    (v_recipe_id, 'graines de sésame',           1,    'c. à café',  false, 26, 'pour garnir'),
    (v_recipe_id, 'nori',                        2,    'feuille',    false, 27, 'en fines lanières');

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
    'Pomme de terre au four croustillante, garnie façon « animal style » d''In-N-Out : bœuf en sauce, cheddar fondant, oignons confits, cornichons, pepperoncini et sauce burger.',
    $instr$["Préchauffer le four à 220°C. Laver, sécher et piquer les pommes de terre à la fourchette.",
"Les enrober d'huile et les saler généreusement. Cuire 45-60 minutes en les retournant à mi-cuisson.",
"Sauce burger : mélanger la mayonnaise, la relish égouttée, le ketchup et le sucre. Réfrigérer.",
"Oignons confits : chauffer l'huile végétale dans une poêle à feu moyen, ajouter l'oignon coupé et une pincée de sel. Cuire 15-20 minutes, jusqu'à ce qu'il soit bien doré.",
"Bœuf : faire fondre le beurre dans une poêle à feu moyen-vif. Ajouter le bœuf haché, le sel et le poivre.",
"Incorporer la sauce Worcestershire, le bouillon et la moutarde. Laisser frémir 6-8 minutes, jusqu'à ce que la viande soit bien dorée.",
"Répartir la viande en portions, ajouter le cheddar par-dessus et couvrir 1 minute pour le faire fondre.",
"Ouvrir les pommes de terre et en écraser l'intérieur à la fourchette. Ajouter du beurre, du sel et du poivre.",
"Garnir de bœuf au fromage, d'oignons confits, de cornichons, de pepperoncini et de persil. Arroser de sauce burger."]
$instr$,
    15, 60, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','in-n-out','pomme de terre','garni','bœuf','animal style','fast food'],
    'manual',
    'https://moribyan.com/the-animal-style-in-n-out-baked-potato/',
    'https://moribyan.com/wp-content/uploads/2026/04/IMG_2425.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pommes de terre',             4,    'unité',      true, 1,  'grosses, farineuses (type russet)'),
    (v_recipe_id, 'huile neutre',                2,    'c. à soupe', true, 2,  'pour les pommes de terre'),
    (v_recipe_id, 'sel',                         1.5,  'c. à café',  true, 3,  'pour les pommes de terre, les oignons et le bœuf'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 4,  'au goût'),
    (v_recipe_id, 'beurre doux',                 30,   'g',          true, 5,  'pour servir'),
    (v_recipe_id, 'mayonnaise',                  80,   'ml',         true, 6,  'pour la sauce'),
    (v_recipe_id, 'relish de cornichons',        60,   'ml',         true, 7,  'égouttée'),
    (v_recipe_id, 'ketchup',                     45,   'ml',         true, 8,  NULL),
    (v_recipe_id, 'sucre',                       1,    'c. à café',  true, 9,  'pour la sauce'),
    (v_recipe_id, 'oignon jaune',                1,    'unité',      true, 10, 'gros, coupé'),
    (v_recipe_id, 'huile végétale',              7.5,  'ml',         true, 11, 'pour les oignons'),
    (v_recipe_id, 'beurre doux',                 15,   'g',          true, 12, 'pour le bœuf'),
    (v_recipe_id, 'bœuf haché',                  450,  'g',          true, 13, '10 % de matières grasses'),
    (v_recipe_id, 'sauce Worcestershire',        7.5,  'ml',         true, 14, NULL),
    (v_recipe_id, 'bouillon de bœuf',            60,   'ml',         true, 15, NULL),
    (v_recipe_id, 'moutarde jaune',              1,    'c. à café',  true, 16, NULL),
    (v_recipe_id, 'cheddar',                     4,    'tranche',    true, 17, 'ou fromage américain'),
    (v_recipe_id, 'cornichons',                  50,   'g',          true, 18, 'à l''aneth, en tranches'),
    (v_recipe_id, 'piments pepperoncini',        50,   'g',          true, 19, 'au vinaigre, hachés'),
    (v_recipe_id, 'persil',                      10,   'g',          false, 20, 'haché');

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
    'Roulés de blanc de poulet aplati farcis au fromage frais ail et fines herbes, aux épinards et à la mozzarella, saisis puis finis dans une sauce crème-parmesan à l''ail façon alfredo. Élégant et fondant.',
    $instr$["Couper les blancs de poulet en deux dans l'épaisseur et les aplatir à épaisseur uniforme. Les badigeonner d'huile d'olive et les assaisonner d'herbes italiennes, de poivre citronné, de paprika fumé, de sel et de poivre.",
"Étaler le fromage frais sur chaque morceau, ajouter les épinards et la mozzarella, puis rouler serré et fixer avec des cure-dents.",
"Chauffer un filet d'huile d'olive dans une poêle à feu moyen. Saisir les roulés côté jointure vers le bas 3 minutes, jusqu'à ce qu'ils soient dorés.",
"Saisir les autres faces 2-3 minutes chacune, jusqu'à cuisson complète (10-12 minutes au total). Retirer de la poêle et enlever les cure-dents.",
"Faire fondre le beurre dans la même poêle, ajouter l'ail et cuire 1 minute.",
"Verser la crème et le lait, émietter le cube de bouillon et remuer jusqu'à ce qu'il soit dissous.",
"Porter à frémissement doux. Ajouter les herbes italiennes, du poivre, la muscade et le parmesan. Laisser frémir jusqu'à ce que la sauce épaississe légèrement.",
"Finir avec le zeste de citron et un peu de persil. Remettre les roulés dans la sauce et réchauffer 1-2 minutes.",
"Garnir de persil et servir chaud."]
$instr$,
    20, 30, 3, 2,
    'Italienne', 'dinner',
    ARRAY['italien','américain','poulet','farci','fromage frais','crème','alfredo','élégant'],
    'manual',
    'https://moribyan.com/creamy-chicken-roll-ups/',
    'https://moribyan.com/wp-content/uploads/2026/03/IMG_1596.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',            600,  'g',          true, 1,  '3 blancs, coupés en 2'),
    (v_recipe_id, 'huile d''olive',              2,    'c. à soupe', true, 2,  '1 pour le poulet + 1 pour la poêle'),
    (v_recipe_id, 'herbes italiennes',           2,    'c. à café',  true, 3,  '1 pour le poulet + 1 pour la sauce'),
    (v_recipe_id, 'poivre citronné',             1,    'c. à café',  true, 4,  NULL),
    (v_recipe_id, 'paprika fumé',                1,    'c. à café',  true, 5,  NULL),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 6,  'au goût'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 7,  'pour le poulet et la sauce'),
    (v_recipe_id, 'fromage frais aux fines herbes', 120,  'g',          true, 8,  'ail et fines herbes, type Boursin'),
    (v_recipe_id, 'épinards frais',              60,   'g',          true, 9,  'jeunes pousses'),
    (v_recipe_id, 'mozzarella',                  60,   'g',          true, 10, 'râpée'),
    (v_recipe_id, 'beurre doux',                 45,   'g',          true, 11, 'pour la sauce'),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 12, 'émincé'),
    (v_recipe_id, 'crème liquide entière',       240,  'ml',         true, 13, NULL),
    (v_recipe_id, 'lait entier',                 120,  'ml',         true, 14, NULL),
    (v_recipe_id, 'cube de bouillon de poulet',  1,    'unité',      true, 15, NULL),
    (v_recipe_id, 'muscade',                     1,    'pincée',     true, 16, NULL),
    (v_recipe_id, 'parmesan',                    50,   'g',          true, 17, 'râpé'),
    (v_recipe_id, 'persil frais',                15,   'g',          false, 18, 'haché'),
    (v_recipe_id, 'citron',                      1,    'unité',      false, 19, 'zeste, facultatif');

  RAISE NOTICE '✅ Imported 32 recipes from moribyan.com';
END $$;
