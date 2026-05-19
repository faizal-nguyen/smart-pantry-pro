-- =====================================================================
-- Seed: 4 South Indian recipes from kannammacooks.com (2026-05-19)
--
-- Sources fetched 2026-05-19 :
--   1. https://www.kannammacooks.com/chicken-rice/
--   2. https://www.kannammacooks.com/paneer-fried-rice/
--   3. https://www.kannammacooks.com/buhari-chicken-biryani-recipe/
--   4. https://www.kannammacooks.com/chettinadu-chicken-biryani/
--
-- Sites Kannamma Cooks (cuisine sud-indienne — Tamil Nadu, Chettinad).
-- Inserts into `public.recipes` + `public.recipe_ingredients` as
-- recettes possédées pour le user audit
-- c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6.
--
-- Idempotent : DELETEs par nom en tête (FK cascade vide les ingrédients).
--
-- Note unités : kannamma utilise massivement "ml" pour des solides
-- (1 cup = 240 ml en mesure volumique sud-indienne). On a converti
-- en grammes pour les solides afin que les ingrédients soient
-- exploitables côté inventaire ("100 g de chou" est plus utile que
-- "240 ml de chou"). Les liquides restent en ml.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-kannamma-recipes.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Chicken Rice (Tamil Street Style)',
    'Paneer Fried Rice',
    'Buhari Chicken Biryani',
    'Chettinad Chicken Biryani'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Chicken Rice (Tamil Street Style)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Rice (Tamil Street Style)',
    'Riz frit indo-chinois tamoul popularisé par les stalls de rue : poulet mariné aux épices indiennes puis frit en bouchées, sauté avec riz basmati, œuf brouillé, chou, carotte et oignons verts.',
    $instr$["Mariner le poulet en bouchées avec curcuma, coriandre, garam masala, piment kashmiri, poivre noir, sel, pâte gingembre-ail, jus de citron, blanc d'œuf, maïdena (farine raffinée) et fécule de maïs. Reposer 10-15 min.",
"Frire le poulet par petits lots dans l'huile chaude 3-4 minutes jusqu'à croustillant. Égoutter, refroidir, puis détailler en plus petits morceaux.",
"Laver et tremper le riz basmati 30 minutes. Cuire dans 2 L d'eau bouillante salée jusqu'à tendre mais ferme. Égoutter et étaler pour refroidir.",
"Fouetter les œufs + un jaune supplémentaire avec poivre et sel. Cuire en omelette/brouillé dans un peu d'huile. Réserver.",
"Dans un grand wok, chauffer l'huile à feu vif. Ajouter parties blanches d'oignon vert, piments verts émincés, oignon haché et pâte gingembre-ail. Sauter 2 minutes.",
"Ajouter carotte et chou hachés très fin. Sauter 5 minutes en gardant le croquant.",
"Ajouter piment rouge en poudre, sauce piment vert, sauce soja et sel. Sauter 1 minute.",
"Ajouter le riz cuit refroidi, le poivron (capsicum), les œufs brouillés et le poulet frit. Sauter à feu vif pour bien enrober, sans casser le riz.",
"Finir avec les parties vertes des oignons verts. Servir immédiatement."]
$instr$,
    15, 30, 3, 3,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','indo-chinois','street food','riz frit','poulet'],
    'manual',
    'https://www.kannammacooks.com/chicken-rice/',
    'https://www.kannammacooks.com/wp-content/uploads/2023/02/street-style-chicken-rice-recipe-1-3.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade poulet
    (v_recipe_id, 'cuisses de poulet désossées', 250, 'g',          true,  1,  'en bouchées'),
    (v_recipe_id, 'curcuma moulu',                0.25,'c. à café', true,  2,  'marinade'),
    (v_recipe_id, 'coriandre moulue',             0.5, 'c. à café', true,  3,  'marinade'),
    (v_recipe_id, 'garam masala',                 0.5, 'c. à café', true,  4,  'marinade'),
    (v_recipe_id, 'piment du Cachemire moulu',    1.5, 'c. à café', true,  5,  'marinade'),
    (v_recipe_id, 'poivre noir moulu',            0.25,'c. à café', true,  6,  'marinade'),
    (v_recipe_id, 'sel',                          0.5, 'c. à café', true,  7,  'marinade'),
    (v_recipe_id, 'jus de citron',                5,   'ml',        true,  8,  'marinade'),
    (v_recipe_id, 'pâte de gingembre-ail',        5,   'ml',        true,  9,  'marinade'),
    (v_recipe_id, 'blanc d''œuf',                 1,   'unité',     true,  10, 'marinade'),
    (v_recipe_id, 'farine raffinée (maïda)',      15,  'ml',        true,  11, 'marinade'),
    (v_recipe_id, 'fécule de maïs',               15,  'ml',        true,  12, 'marinade'),
    (v_recipe_id, 'huile végétale',               500, 'ml',        true,  13, 'pour la friture'),
    -- Riz et œufs
    (v_recipe_id, 'riz basmati',                  240, 'g',         true,  14, NULL),
    (v_recipe_id, 'eau',                          2000,'ml',        true,  15, 'pour cuire le riz'),
    (v_recipe_id, 'œufs',                         2,   'unité',     true,  16, 'pour les œufs brouillés'),
    (v_recipe_id, 'jaune d''œuf',                 1,   'unité',     true,  17, 'supplémentaire'),
    (v_recipe_id, 'poivre noir moulu',            0.25,'c. à café', true,  18, 'pour les œufs'),
    -- Sauté
    (v_recipe_id, 'huile',                        5,   'ml',        true,  19, 'pour le sauté'),
    (v_recipe_id, 'oignon vert (blanc)',          3,   'unité',     true,  20, 'parties blanches, tiges'),
    (v_recipe_id, 'piments verts',                2,   'unité',     true,  21, NULL),
    (v_recipe_id, 'oignon',                       60,  'g',         true,  22, 'haché fin'),
    (v_recipe_id, 'carotte',                      70,  'g',         true,  23, 'hachée fin'),
    (v_recipe_id, 'chou blanc',                   100, 'g',         true,  24, 'haché fin'),
    (v_recipe_id, 'piment rouge moulu',           0.5, 'c. à café', true,  25, NULL),
    (v_recipe_id, 'sauce piment vert',            15,  'ml',        true,  26, NULL),
    (v_recipe_id, 'sauce soja',                   15,  'ml',        true,  27, NULL),
    (v_recipe_id, 'poivron',                      30,  'g',         true,  28, 'capsicum, haché fin'),
    (v_recipe_id, 'oignon vert (vert)',           3,   'unité',     false, 29, 'parties vertes, garniture');

  -- =====================================================================
  -- 2. Paneer Fried Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Paneer Fried Rice',
    'Riz frit indo-chinois végétarien au paneer mariné aux flocons de piment et assaisonnement pizza, sauté avec poivrons, carottes, maïs et pois. Boîte à lunch parfaite.',
    $instr$["Couper le paneer en cubes. Mélanger dans un bol avec sel, assaisonnement pizza et flocons de piment rouge. Laisser mariner 10 minutes.",
"Chauffer la moitié de l'huile dans une grande poêle, rôtir les cubes de paneer 3-4 minutes jusqu'à doré sur toutes les faces. Réserver et laisser refroidir.",
"Dans la même poêle, ajouter l'ail haché, le gingembre haché et les parties blanches des oignons verts. Faire revenir quelques secondes à feu vif.",
"Ajouter l'oignon et la carotte hachés fin. Sauter quelques minutes : la carotte doit rester croquante mais juste tendre.",
"Ajouter le maïs cuit, les pois, les poivrons jaune + rouge, la sauce soja, le sucre, le poivre noir et le beurre. Bien mélanger.",
"Ajouter le riz basmati cuit refroidi et le paneer. Sauter à feu vif sans casser le riz. Incorporer les parties vertes des oignons verts.",
"Rectifier en sel. Servir chaud, garni d'oignons verts frais."]
$instr$,
    15, 20, 3, 2,
    'Indienne', 'lunch',
    ARRAY['indien','indo-chinois','paneer','riz frit','végétarien','boîte à lunch'],
    'manual',
    'https://www.kannammacooks.com/paneer-fried-rice/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz basmati',           200, 'g',          true,  1,  'cuit et refroidi'),
    (v_recipe_id, 'paneer',                 200, 'g',          true,  2,  'en cubes'),
    (v_recipe_id, 'sel',                    5,   'g',          true,  3,  'pour la marinade paneer'),
    (v_recipe_id, 'assaisonnement pizza',   5,   'g',          false, 4,  'mélange d''herbes italiennes'),
    (v_recipe_id, 'flocons de piment rouge', 2.5,'g',          true,  5,  NULL),
    (v_recipe_id, 'huile végétale',         10,  'ml',         true,  6,  'divisée'),
    (v_recipe_id, 'ail',                    30,  'g',          true,  7,  'haché fin'),
    (v_recipe_id, 'gingembre',              15,  'g',          true,  8,  'haché fin'),
    (v_recipe_id, 'oignon vert (blanc)',    60,  'g',          true,  9,  'parties blanches'),
    (v_recipe_id, 'oignon',                 60,  'g',          true,  10, 'haché fin'),
    (v_recipe_id, 'carotte',                60,  'g',          true,  11, 'hachée fin'),
    (v_recipe_id, 'maïs sucré cuit',        60,  'g',          true,  12, NULL),
    (v_recipe_id, 'petits pois cuits',      60,  'g',          true,  13, NULL),
    (v_recipe_id, 'poivron jaune',          60,  'g',          true,  14, 'haché fin'),
    (v_recipe_id, 'poivron rouge',          60,  'g',          true,  15, 'haché fin'),
    (v_recipe_id, 'sauce soja',             15,  'ml',         true,  16, NULL),
    (v_recipe_id, 'sucre',                  5,   'g',          true,  17, NULL),
    (v_recipe_id, 'poivre noir moulu',      2.5, 'g',          true,  18, NULL),
    (v_recipe_id, 'beurre doux',            15,  'g',          true,  19, NULL),
    (v_recipe_id, 'oignon vert (vert)',     30,  'g',          false, 20, 'parties vertes, garniture');

  -- =====================================================================
  -- 3. Buhari Chicken Biryani (Chennai Hotel Style)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Buhari Chicken Biryani',
    'Biryani de poulet emblématique du Buhari Hotel à Chennai : riz basmati cuit séparément à 50%, terminé en dum sur la sauce poulet aux épices entières + yaourt. Couleur orangée subtile, parfum signature de Chennai.',
    $instr$["Chauffer ghee + huile dans une cocotte épaisse à fond plat. Ajouter cannelle, clous de girofle, cardamome écrasée et piments verts tranchés. Infuser ~30 sec.",
"Ajouter les oignons tranchés et faire dorer 6-8 minutes jusqu'à caramel profond.",
"Incorporer la pâte gingembre-ail et les tomates hachées. Ajouter sel, curcuma et piment rouge. Cuire jusqu'à ce que le masala devienne sec et que l'huile remonte.",
"Ajouter menthe + coriandre hachées et mélanger 1 minute.",
"Ajouter le poulet et bien combiner avec le masala. Verser le yaourt et l'eau. Couvrir et cuire à feu doux 15 minutes sans ajouter d'eau.",
"Pendant ce temps, porter 3 L d'eau à ébullition avec 1 c. à soupe de sel. Ajouter le riz basmati trempé 20 min.",
"Cuire le riz 5-7 minutes seulement : il doit être à 70 % de cuisson, encore cassant à cœur. Égoutter immédiatement.",
"Étaler le riz semi-cuit sur le poulet. Arroser de jus de demi-citron (optionnel).",
"Placer un tawa (poêle plate épaisse) sur feu doux et poser la cocotte dessus. Couvrir le couvercle d'un linge humide pour sceller, fermer.",
"Cuire en dum 10 minutes à feu très doux. Le biryani 'fluide' (sauce visible) est prêt. Mélanger délicatement avant de servir."]
$instr$,
    10, 40, 3, 3,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','biryani','chennai','poulet','riz basmati','dum'],
    'manual',
    'https://www.kannammacooks.com/buhari-chicken-biryani-recipe/',
    'https://www.kannammacooks.com/wp-content/uploads/2022/06/buhari-hotel-chennai-chicken-biryani-recipe-1-4.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ghee',                      30,   'ml',         true,  1,  NULL),
    (v_recipe_id, 'huile végétale',            45,   'ml',         true,  2,  NULL),
    (v_recipe_id, 'bâton de cannelle',         3,    'cm',         true,  3,  'cassia'),
    (v_recipe_id, 'clous de girofle',          4,    'unité',      true,  4,  NULL),
    (v_recipe_id, 'cardamome verte',           4,    'unité',      true,  5,  'gousses, écrasées'),
    (v_recipe_id, 'piments verts',             5,    'unité',      true,  6,  'tranchés'),
    (v_recipe_id, 'oignons',                   225,  'g',          true,  7,  'tranchés'),
    (v_recipe_id, 'ail',                       1,    'gousse',     true,  8,  NULL),
    (v_recipe_id, 'gingembre',                 50,   'g',          true,  9,  NULL),
    (v_recipe_id, 'tomate',                    1,    'unité',      true,  10, 'hachée'),
    (v_recipe_id, 'sel',                       1,    'c. à café',  true,  11, NULL),
    (v_recipe_id, 'curcuma moulu',             0.5,  'c. à café',  true,  12, NULL),
    (v_recipe_id, 'piment rouge moulu',        1,    'c. à café',  true,  13, NULL),
    (v_recipe_id, 'menthe fraîche',            30,   'g',          true,  14, 'hachée'),
    (v_recipe_id, 'coriandre fraîche',         30,   'g',          true,  15, 'hachée'),
    (v_recipe_id, 'poulet avec os',            750,  'g',          true,  16, 'en morceaux'),
    (v_recipe_id, 'yaourt nature',             80,   'ml',         true,  17, NULL),
    (v_recipe_id, 'eau',                       120,  'ml',         true,  18, 'pour le poulet'),
    (v_recipe_id, 'jus de citron',             15,   'ml',         false, 19, 'demi-citron, optionnel'),
    (v_recipe_id, 'eau',                       3000, 'ml',         true,  20, 'pour cuire le riz'),
    (v_recipe_id, 'sel',                       1,    'c. à soupe', true,  21, 'pour le riz'),
    (v_recipe_id, 'riz basmati',               225,  'g',          true,  22, 'trempé 20 min');

  -- =====================================================================
  -- 4. Chettinad Chicken Biryani
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chettinad Chicken Biryani',
    'Biryani Chettinad : pâte d''épices maison (fenouil, kalpasi, pavot, cardamome) torréfiée puis mixée, poulet mijoté dans yaourt + masala, riz basmati cuit à la cocotte minute (2 sifflements). Profil très aromatique et un peu pimenté.',
    $instr$["Pâte masala : chauffer un peu d'huile dans une casserole. Torréfier à feu doux les épices entières (anis étoilé, cannelle, clous de girofle, fenouil, coriandre, poivre, cardamome, kalpasi, graines de pavot) 2 minutes jusqu'au parfum.",
"Ajouter l'ail, le gingembre, les piments verts et les échalotes. Sauter 2 minutes.",
"Transférer le mélange dans un blender avec 60 ml d'eau et mixer en pâte très fine.",
"Dans une cocotte minute, chauffer ghee + huile. Ajouter feuilles de laurier et feuilles de curry hachées.",
"Ajouter les oignons tranchés et faire dorer 3-4 minutes à feu moyen.",
"Incorporer piment rouge en poudre et curcuma. Sauter quelques secondes.",
"Ajouter les tomates et cuire 1 minute. Ajouter menthe, coriandre et la pâte de masala mixée.",
"Verser le yaourt. Couvrir et cuire 5 minutes à feu doux pour développer les saveurs.",
"Ajouter les morceaux de poulet avec os et le sel. Couvrir et cuire 10-12 minutes à feu doux sans ajouter d'eau.",
"Rincer et tremper le riz basmati 15 minutes pendant la cuisson du poulet.",
"Ajouter 750 ml d'eau au poulet, porter à ébullition et incorporer le jus d'un demi-citron.",
"Ajouter le riz égoutté, mélanger délicatement. Fermer la cocotte avec le poids/sifflet. Cuire à feu moyen pendant 2 sifflements (~5-6 min).",
"Retirer du feu et laisser la pression se libérer naturellement (~10 min). Aérer doucement à la fourchette et servir."]
$instr$,
    15, 45, 4, 3,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','chettinad','biryani','poulet','kalpasi','sud-indien'],
    'manual',
    'https://www.kannammacooks.com/chettinadu-chicken-biryani/',
    'https://www.kannammacooks.com/wp-content/uploads/2022/05/Chettinadu-Chicken-Biryani-2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Pâte masala
    (v_recipe_id, 'huile d''arachide',          3,    'c. à soupe', true,  1,  'pour la pâte masala'),
    (v_recipe_id, 'anis étoilé',                1,    'unité',      true,  2,  'pâte'),
    (v_recipe_id, 'bâton de cannelle',          5,    'cm',         true,  3,  'pâte'),
    (v_recipe_id, 'clous de girofle',           4,    'unité',      true,  4,  'pâte'),
    (v_recipe_id, 'graines de fenouil',         1,    'c. à café',  true,  5,  'pâte'),
    (v_recipe_id, 'graines de coriandre',       2,    'c. à café',  true,  6,  'pâte'),
    (v_recipe_id, 'poivre noir',                0.5,  'c. à café',  true,  7,  'pâte, en grains'),
    (v_recipe_id, 'cardamome verte',            3,    'unité',      true,  8,  'pâte'),
    (v_recipe_id, 'kalpasi',                    1,    'unité',      false, 9,  'pierre fleur, signature chettinad'),
    (v_recipe_id, 'graines de pavot',           1,    'c. à café',  true,  10, 'pâte'),
    (v_recipe_id, 'ail',                        2,    'gousse',     true,  11, 'pâte'),
    (v_recipe_id, 'gingembre',                  5,    'cm',         true,  12, 'pâte'),
    (v_recipe_id, 'piments verts',              6,    'unité',      true,  13, 'pâte'),
    (v_recipe_id, 'échalotes',                  60,   'g',          true,  14, 'pâte (sambar onions)'),
    -- Biryani
    (v_recipe_id, 'ghee',                       30,   'ml',         true,  15, NULL),
    (v_recipe_id, 'feuille de laurier',         2,    'unité',      true,  16, NULL),
    (v_recipe_id, 'feuilles de curry',          2,    'unité',      true,  17, 'brins, hachées'),
    (v_recipe_id, 'oignons',                    60,   'g',          true,  18, 'tranchés'),
    (v_recipe_id, 'piment rouge moulu',         1,    'c. à café',  true,  19, NULL),
    (v_recipe_id, 'curcuma moulu',              0.25, 'c. à café',  true,  20, NULL),
    (v_recipe_id, 'tomates',                    2,    'unité',      true,  21, 'hachées'),
    (v_recipe_id, 'menthe fraîche',             15,   'g',          true,  22, 'hachée'),
    (v_recipe_id, 'coriandre fraîche',          15,   'g',          true,  23, 'hachée'),
    (v_recipe_id, 'yaourt nature',              60,   'ml',         true,  24, NULL),
    (v_recipe_id, 'poulet avec os',             750,  'g',          true,  25, 'en morceaux'),
    (v_recipe_id, 'sel',                        2,    'c. à café',  true,  26, NULL),
    (v_recipe_id, 'riz basmati',                400,  'g',          true,  27, 'trempé 15 min'),
    (v_recipe_id, 'eau',                        750,  'ml',         true,  28, 'pour la cuisson'),
    (v_recipe_id, 'jus de citron',              15,   'ml',         false, 29, 'demi-citron');

  RAISE NOTICE 'Seed: 4 Kannamma South Indian recipes inserted for user %', v_user_id;
END $$;
