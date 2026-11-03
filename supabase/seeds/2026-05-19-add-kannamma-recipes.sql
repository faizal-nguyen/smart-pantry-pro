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
    'Riz frit indo-chinois popularisé par les échoppes de rue du Tamil Nadu : poulet mariné aux épices indiennes puis frit en bouchées, sauté avec du riz basmati, des œufs brouillés, du chou, de la carotte et des oignons verts.',
    $instr$["Mariner les bouchées de poulet avec le curcuma, la coriandre moulue, le garam masala, le piment du Cachemire, le poivre noir, le sel, la pâte gingembre-ail, le jus de citron, le blanc d'œuf, la farine (maïda) et la fécule de maïs. Laisser reposer 10 à 15 min.",
"Frire le poulet en petites quantités dans l'huile chaude 3 à 4 minutes, jusqu'à ce qu'il soit croustillant. Égoutter, laisser refroidir, puis couper en morceaux plus petits. Réserver 2 c. à soupe de l'huile de friture.",
"Laver le riz basmati et le faire tremper 30 minutes. Le cuire dans 2 l d'eau bouillante salée jusqu'à ce qu'il soit tendre mais encore ferme. Égoutter et étaler pour laisser refroidir.",
"Battre les œufs et le jaune réservé avec un peu de poivre et de sel. Les cuire brouillés dans 1 c. à café d'huile. Réserver.",
"Dans un grand wok, chauffer les 2 c. à soupe d'huile réservées à feu vif. Ajouter les blancs d'oignons verts, les piments verts émincés, l'oignon haché et la pâte gingembre-ail. Faire sauter 2 minutes.",
"Ajouter la carotte et le chou très finement hachés. Faire sauter 5 minutes en gardant le croquant.",
"Ajouter le piment rouge en poudre, le poivre noir, la sauce au piment vert, la sauce soja et le sel. Faire sauter 1 minute.",
"Ajouter le riz refroidi, le poivron, les œufs brouillés et le poulet frit. Faire sauter à feu vif pour bien enrober, sans écraser le riz.",
"Terminer avec le vert des oignons verts. Servir aussitôt."]
$instr$,
    15, 30, 3, 3,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','indo-chinois','street food','riz frit','poulet'],
    'manual',
    'https://www.kannammacooks.com/chicken-rice/',
    'https://b2958125.assetcdn.net/2.0/2958125/wp-content/uploads/Street-Style-Chicken-Rice--768x1024.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade poulet
    (v_recipe_id, 'cuisses de poulet',            250, 'g',         true,  1,  'désossées, en bouchées'),
    (v_recipe_id, 'curcuma moulu',                0.25,'c. à café', true,  2,  'pour la marinade'),
    (v_recipe_id, 'coriandre moulue',             0.5, 'c. à café', true,  3,  'pour la marinade'),
    (v_recipe_id, 'garam masala',                 0.5, 'c. à café', true,  4,  'pour la marinade'),
    (v_recipe_id, 'piment du Cachemire moulu',    1.5, 'c. à café', true,  5,  'pour la marinade'),
    (v_recipe_id, 'poivre noir moulu',            0.25,'c. à café', true,  6,  'pour la marinade'),
    (v_recipe_id, 'sel',                          0.5, 'c. à café', true,  7,  'pour la marinade'),
    (v_recipe_id, 'jus de citron',                5,   'ml',        true,  8,  'pour la marinade'),
    (v_recipe_id, 'pâte gingembre-ail',           1,   'c. à café', true,  9,  'pour la marinade'),
    (v_recipe_id, 'œufs',                         1,   'unité',     true,  10, 'blanc pour la marinade, jaune pour les œufs brouillés'),
    (v_recipe_id, 'farine de blé',                1,   'c. à soupe', true, 11, 'maïda, pour la marinade'),
    (v_recipe_id, 'fécule de maïs',               1,   'c. à soupe', true, 12, 'pour la marinade'),
    (v_recipe_id, 'huile végétale',               500, 'ml',        true,  13, 'pour la friture (en garder 2 c. à soupe pour le sauté)'),
    -- Riz et œufs
    (v_recipe_id, 'riz basmati',                  190, 'g',         true,  14, NULL),
    (v_recipe_id, 'eau',                          2000,'ml',        true,  15, 'pour cuire le riz'),
    (v_recipe_id, 'sel',                          1,   'c. à café', true,  16, '1/2 pour l''eau du riz, 1/4 pour les œufs, 1/4 pour le sauté'),
    (v_recipe_id, 'œufs',                         2,   'unité',     true,  17, 'pour les œufs brouillés'),
    (v_recipe_id, 'poivre noir moulu',            0.5, 'c. à café', true,  18, 'pour les œufs et le sauté'),
    (v_recipe_id, 'huile végétale',               1,   'c. à café', true,  19, 'pour les œufs brouillés'),
    -- Sauté
    (v_recipe_id, 'oignons verts',                3,   'unité',     true,  20, 'blancs pour le sauté, verts pour finir'),
    (v_recipe_id, 'piments verts',                2,   'unité',     true,  21, 'émincés'),
    (v_recipe_id, 'oignon',                       60,  'g',         true,  22, 'finement haché'),
    (v_recipe_id, 'pâte gingembre-ail',           1,   'c. à café', true,  23, 'pour le sauté'),
    (v_recipe_id, 'carotte',                      70,  'g',         true,  24, 'finement hachée'),
    (v_recipe_id, 'chou blanc',                   100, 'g',         true,  25, 'finement haché'),
    (v_recipe_id, 'piment rouge moulu',           0.5, 'c. à café', true,  26, NULL),
    (v_recipe_id, 'sauce au piment vert',         15,  'ml',        true,  27, NULL),
    (v_recipe_id, 'sauce soja',                   15,  'ml',        true,  28, NULL),
    (v_recipe_id, 'poivron',                      30,  'g',         true,  29, 'finement haché');

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
    'Riz frit indo-chinois végétarien au paneer mariné aux flocons de piment et aux herbes pour pizza, sauté avec des poivrons, de la carotte, du maïs et des petits pois. Parfait pour la boîte à lunch.',
    $instr$["Couper le paneer en cubes. Dans un bol, le mélanger avec le sel, l'assaisonnement pour pizza et les flocons de piment rouge. Laisser mariner 10 minutes.",
"Chauffer la moitié de l'huile dans une grande poêle et y faire rôtir les cubes de paneer 3 à 4 minutes, jusqu'à ce qu'ils soient dorés sur toutes les faces. Réserver et laisser refroidir.",
"Dans la même poêle, chauffer le reste de l'huile, puis ajouter l'ail haché, le gingembre haché et les blancs d'oignons verts. Faire revenir quelques secondes à feu vif.",
"Ajouter l'oignon et la carotte finement hachés. Faire sauter quelques minutes : la carotte doit être juste tendre mais rester croquante.",
"Ajouter le maïs cuit, les petits pois, les poivrons jaune et rouge, la sauce soja, le sucre, le poivre noir et le beurre. Bien mélanger.",
"Ajouter le riz basmati cuit et refroidi ainsi que le paneer. Faire sauter à feu vif sans écraser le riz. Incorporer le vert des oignons verts.",
"Rectifier l'assaisonnement en sel. Servir chaud, garni d'oignons verts."]
$instr$,
    15, 20, 3, 2,
    'Indienne', 'lunch',
    ARRAY['indien','indo-chinois','paneer','riz frit','végétarien','boîte à lunch'],
    'manual',
    'https://www.kannammacooks.com/paneer-fried-rice/',
    'https://b2958125.assetcdn.net/2.0/2958125/wp-content/uploads/Paneer-Fried-Rice-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz basmati',           200, 'g',          true,  1,  'poids cru ; cuit à l''avance puis refroidi'),
    (v_recipe_id, 'paneer',                 200, 'g',          true,  2,  'en cubes'),
    (v_recipe_id, 'sel',                    0.25, 'c. à café', true,  3,  'pour la marinade du paneer, + au goût'),
    (v_recipe_id, 'assaisonnement pour pizza', 1, 'c. à café', false, 4,  'mélange d''herbes italiennes séchées'),
    (v_recipe_id, 'flocons de piment rouge', 0.5, 'c. à café', true,  5,  NULL),
    (v_recipe_id, 'huile végétale',         2,   'c. à café',  true,  6,  'moitié pour le paneer, moitié pour le sauté'),
    (v_recipe_id, 'ail',                    6,   'gousse',     true,  7,  'finement haché (environ 2 c. à soupe)'),
    (v_recipe_id, 'gingembre',              1,   'c. à soupe', true,  8,  'finement haché'),
    (v_recipe_id, 'oignons verts',          2,   'unité',      true,  9,  'blancs pour le sauté, verts pour finir et garnir'),
    (v_recipe_id, 'oignon',                 60,  'g',          true,  10, 'finement haché'),
    (v_recipe_id, 'carotte',                60,  'g',          true,  11, 'finement hachée'),
    (v_recipe_id, 'maïs doux',              60,  'g',          true,  12, 'cuit'),
    (v_recipe_id, 'petits pois',            60,  'g',          true,  13, 'cuits'),
    (v_recipe_id, 'poivron jaune',          60,  'g',          true,  14, 'finement haché'),
    (v_recipe_id, 'poivron rouge',          60,  'g',          true,  15, 'finement haché'),
    (v_recipe_id, 'sauce soja',             15,  'ml',         true,  16, NULL),
    (v_recipe_id, 'sucre',                  1,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'poivre noir moulu',      0.5, 'c. à café',  true,  18, NULL),
    (v_recipe_id, 'beurre doux',            15,  'g',          true,  19, NULL);

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
    'Biryani de poulet emblématique de l''hôtel Buhari à Chennai : le riz basmati, précuit à part à 70 %, termine sa cuisson à l''étouffée (dum) sur un poulet mijoté aux épices entières et au yaourt. Une couleur légèrement orangée et un parfum typique de Chennai.',
    $instr$["Chauffer le ghee et l'huile dans une cocotte épaisse à fond plat. Ajouter la cannelle, les clous de girofle, la cardamome écrasée et les piments verts émincés. Laisser infuser environ 30 secondes.",
"Ajouter les oignons émincés et les faire dorer 6 à 8 minutes, jusqu'à ce qu'ils soient bien caramélisés.",
"Incorporer l'ail et le gingembre réduits en pâte, puis les tomates hachées. Ajouter le sel, le curcuma et le piment rouge. Cuire jusqu'à ce que le masala soit sec et que l'huile remonte.",
"Ajouter la menthe et la coriandre hachées et mélanger 1 minute.",
"Ajouter le poulet et bien l'enrober de masala. Verser le yaourt et l'eau. Couvrir et cuire 15 minutes à feu doux sans ajouter d'eau.",
"Pendant ce temps, porter 3 l d'eau à ébullition avec 1 c. à soupe de sel. Ajouter le riz basmati préalablement trempé 20 min.",
"Cuire le riz 5 à 7 minutes seulement : il doit être cuit à 70 % et encore ferme à cœur. Égoutter aussitôt.",
"Étaler le riz précuit sur le poulet. Arroser du jus d'un demi-citron (facultatif).",
"Poser un tawa (poêle plate et épaisse) sur feu doux et placer la cocotte dessus. Recouvrir la cocotte d'un linge humide, puis du couvercle pour bien la sceller.",
"Cuire à l'étouffée (dum) 10 minutes à feu très doux. Le biryani, encore légèrement saucé, est prêt. Mélanger délicatement avant de servir."]
$instr$,
    10, 40, 3, 3,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','biryani','chennai','poulet','riz basmati','dum'],
    'manual',
    'https://www.kannammacooks.com/buhari-chicken-biryani-recipe/',
    'https://b2958125.assetcdn.net/2.0/2958125/wp-content/uploads/Buhari-Style-Chicken-Biryani.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ghee',                      2,    'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'huile végétale',            3,    'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'cannelle',                  3,    'cm',         true,  3,  'en bâton (cassia)'),
    (v_recipe_id, 'clous de girofle',          4,    'unité',      true,  4,  NULL),
    (v_recipe_id, 'cardamome verte',           4,    'unité',      true,  5,  'gousses, écrasées'),
    (v_recipe_id, 'piments verts',             5,    'unité',      true,  6,  'émincés'),
    (v_recipe_id, 'oignons',                   225,  'g',          true,  7,  'émincés'),
    (v_recipe_id, 'ail',                       1,    'gousse',     true,  8,  'réduit en pâte avec le gingembre'),
    (v_recipe_id, 'gingembre',                 5,    'cm',         true,  9,  'réduit en pâte avec l''ail'),
    (v_recipe_id, 'tomate',                    1,    'unité',      true,  10, 'hachée'),
    (v_recipe_id, 'sel',                       1,    'c. à café',  true,  11, 'pour le masala'),
    (v_recipe_id, 'curcuma moulu',             0.5,  'c. à café',  true,  12, NULL),
    (v_recipe_id, 'piment rouge moulu',        1,    'c. à café',  true,  13, NULL),
    (v_recipe_id, 'menthe fraîche',            2,    'c. à soupe', true,  14, 'hachée'),
    (v_recipe_id, 'coriandre fraîche',         2,    'c. à soupe', true,  15, 'hachée'),
    (v_recipe_id, 'poulet',                    750,  'g',          true,  16, 'avec os, en morceaux'),
    (v_recipe_id, 'yaourt nature',             80,   'g',          true,  17, NULL),
    (v_recipe_id, 'eau',                       120,  'ml',         true,  18, 'pour le poulet'),
    (v_recipe_id, 'jus de citron',             15,   'ml',         false, 19, 'environ 1/2 citron, en option'),
    (v_recipe_id, 'eau',                       3000, 'ml',         true,  20, 'pour cuire le riz'),
    (v_recipe_id, 'sel',                       1,    'c. à soupe', true,  21, 'pour l''eau du riz'),
    (v_recipe_id, 'riz basmati',               285,  'g',          true,  22, 'trempé 20 min');

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
    'Biryani du Chettinad : une pâte d''épices maison (fenouil, kalpasi, pavot, cardamome) torréfiée puis mixée, un poulet mijoté dans le yaourt et le masala, et un riz basmati cuit à la cocotte-minute. Très aromatique et légèrement pimenté.',
    $instr$["Pâte masala : chauffer 1 c. à soupe d'huile dans une casserole. Torréfier à feu doux les épices entières (anis étoilé, cannelle, clous de girofle, fenouil, graines de coriandre, poivre, cardamome, kalpasi, graines de pavot) 2 minutes, jusqu'à ce qu'elles embaument.",
"Ajouter l'ail, le gingembre, les piments verts et les échalotes. Faire revenir 2 minutes.",
"Transférer le mélange dans un blender avec 60 ml d'eau et mixer en une pâte très fine.",
"Dans une cocotte-minute, chauffer le ghee et le reste de l'huile. Ajouter les feuilles de laurier et les feuilles de curry hachées.",
"Ajouter les oignons émincés et les faire dorer 3 à 4 minutes à feu moyen.",
"Incorporer le piment rouge en poudre et le curcuma. Faire revenir quelques secondes.",
"Ajouter les tomates et cuire 1 minute. Ajouter la menthe, la coriandre et la pâte masala mixée.",
"Verser le yaourt. Couvrir et cuire 5 minutes à feu doux pour développer les saveurs.",
"Ajouter les morceaux de poulet et le sel. Couvrir et cuire 10 à 12 minutes à feu doux sans ajouter d'eau.",
"Pendant la cuisson du poulet, rincer le riz basmati et le faire tremper 15 minutes.",
"Ajouter 750 ml d'eau au poulet, porter à ébullition et incorporer le jus d'un demi-citron.",
"Ajouter le riz égoutté et mélanger délicatement. Fermer la cocotte-minute avec sa soupape. Cuire à feu moyen le temps de 2 sifflets (5 à 6 min environ).",
"Retirer du feu et laisser la pression retomber naturellement (environ 10 min). Aérer délicatement à la fourchette et servir."]
$instr$,
    15, 45, 4, 3,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','chettinad','biryani','poulet','kalpasi','sud-indien'],
    'manual',
    'https://www.kannammacooks.com/chettinadu-chicken-biryani/',
    'https://b2958125.assetcdn.net/2.0/2958125/wp-content/uploads/Chettinadu-Chicken-Biryani-2.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Pâte masala
    (v_recipe_id, 'huile d''arachide',          3,    'c. à soupe', true,  1,  '1 pour la pâte masala + 2 pour la cuisson'),
    (v_recipe_id, 'anis étoilé',                1,    'unité',      true,  2,  'pour la pâte'),
    (v_recipe_id, 'cannelle',                   5,    'cm',         true,  3,  'en bâton (cassia), pour la pâte'),
    (v_recipe_id, 'clous de girofle',           4,    'unité',      true,  4,  'pour la pâte'),
    (v_recipe_id, 'graines de fenouil',         1,    'c. à café',  true,  5,  'pour la pâte'),
    (v_recipe_id, 'graines de coriandre',       2,    'c. à café',  true,  6,  'pour la pâte'),
    (v_recipe_id, 'poivre noir en grains',      0.5,  'c. à café',  true,  7,  'pour la pâte'),
    (v_recipe_id, 'cardamome verte',            3,    'unité',      true,  8,  'pour la pâte'),
    (v_recipe_id, 'kalpasi',                    1,    'unité',      false, 9,  'fleur de pierre (black stone flower), petit morceau, pour la pâte'),
    (v_recipe_id, 'graines de pavot',           1,    'c. à café',  true,  10, 'pour la pâte'),
    (v_recipe_id, 'ail',                        2,    'gousse',     true,  11, 'pour la pâte'),
    (v_recipe_id, 'gingembre',                  5,    'cm',         true,  12, 'pour la pâte'),
    (v_recipe_id, 'piments verts',              6,    'unité',      true,  13, 'pour la pâte'),
    (v_recipe_id, 'échalotes',                  60,   'g',          true,  14, 'petits oignons rouges (sambar), pour la pâte'),
    (v_recipe_id, 'eau',                        60,   'ml',         true,  15, 'pour mixer la pâte'),
    -- Biryani
    (v_recipe_id, 'ghee',                       2,    'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'feuille de laurier',         2,    'unité',      true,  17, NULL),
    (v_recipe_id, 'feuilles de curry',          2,    'brin',       true,  18, 'hachées'),
    (v_recipe_id, 'oignons',                    60,   'g',          true,  19, 'émincés'),
    (v_recipe_id, 'piment rouge moulu',         1,    'c. à café',  true,  20, NULL),
    (v_recipe_id, 'curcuma moulu',              0.25, 'c. à café',  true,  21, NULL),
    (v_recipe_id, 'tomates',                    2,    'unité',      true,  22, 'hachées'),
    (v_recipe_id, 'menthe fraîche',             2,    'c. à soupe', true,  23, 'hachée'),
    (v_recipe_id, 'coriandre fraîche',          2,    'c. à soupe', true,  24, 'hachée'),
    (v_recipe_id, 'yaourt nature',              60,   'g',          true,  25, NULL),
    (v_recipe_id, 'poulet',                     750,  'g',          true,  26, 'avec os, en morceaux'),
    (v_recipe_id, 'sel',                        2,    'c. à café',  true,  27, NULL),
    (v_recipe_id, 'riz basmati',                400,  'g',          true,  28, 'trempé 15 min'),
    (v_recipe_id, 'eau',                        750,  'ml',         true,  29, 'pour la cuisson'),
    (v_recipe_id, 'jus de citron',              15,   'ml',         true,  30, 'environ 1/2 citron');

  RAISE NOTICE 'Seed: 4 Kannamma South Indian recipes inserted for user %', v_user_id;
END $$;
