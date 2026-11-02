-- =====================================================================
-- Seed: 8 Japanese recipes from japan.recipetineats.com (2026-05-19)
--
-- Sources fetched 2026-05-19 :
--   1. https://japan.recipetineats.com/okinawan-taco-rice/
--   2. https://japan.recipetineats.com/japanese-fried-chicken-karaage-chicken/
--   3. https://japan.recipetineats.com/yakitori-japanese-skewered-chicken/
--   4. https://japan.recipetineats.com/copycat-mcdonalds-teriyaki-burger/
--   5. https://japan.recipetineats.com/nagoya-style-fried-chicken-wings/
--   6. https://japan.recipetineats.com/prawn-doria-japanese-rice-gratin/
--   7. https://japan.recipetineats.com/korokke-japanese-potato-and-ground-meat-croquettes/
--   8. https://japan.recipetineats.com/oyako-don-chicken-egg-rice/
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` pour
-- l'audit user c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6.
-- Idempotent : DELETEs par nom (FK cascade vide les ingrédients).
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-recipetineats-japan.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Okinawan Taco Rice',
    'Karaage (Japanese Fried Chicken)',
    'Yakitori',
    'McDonald''s Teriyaki Burger (Copycat)',
    'Tebasaki (Nagoya Fried Chicken Wings)',
    'Prawn Doria',
    'Korokke',
    'Oyako-don'
  ];
BEGIN

  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Okinawan Taco Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Okinawan Taco Rice',
    'Fusion d''Okinawa née autour des bases américaines : garnitures de tacos (bœuf haché épicé à la sauce soja, à la Worcestershire et au cumin, salsa fraîche, laitue, avocat, fromage) servies sur un lit de riz japonais chaud. Un plat réconfortant prêt en 25 minutes.',
    $instr$["Salsa : si l'oignon rouge est trop fort, le faire tremper 10 à 15 minutes dans l'eau froide, puis bien l'égoutter.",
"Mélanger dans un bol la tomate en dés, l'oignon rouge, le poivron vert, l'ail râpé, le jus de citron vert, le sel et la sauce piquante. La salsa peut se préparer la veille.",
"Viande : faire revenir l'oignon haché et l'ail dans l'huile à feu moyen-vif jusqu'à ce qu'ils soient dorés.",
"Ajouter le bœuf haché et le cuire en l'émiettant jusqu'à ce qu'il change de couleur.",
"Incorporer le bouillon dashi, le sucre, la sauce soja, le ketchup, la sauce Worcestershire, le piment en poudre et le cumin. Bien mélanger.",
"Laisser réduire à feu moyen jusqu'à ce que la viande soit luisante mais pas sèche.",
"Dressage : répartir le riz chaud dans deux bols et disposer la viande par-dessus.",
"Ajouter la laitue ciselée et les dés d'avocat.",
"Couronner de salsa et parsemer généreusement de fromage râpé. Servir aussitôt : le fromage fond légèrement au contact du riz chaud."]
$instr$,
    10, 15, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','okinawa','fusion','riz','bœuf','comfort food'],
    'manual',
    'https://japan.recipetineats.com/okinawan-taco-rice/',
    'https://japan.recipetineats.com/wp-content/uploads/2023/12/Okinawan_Taco_Rice_0105.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz japonais cuit',          380,  'g',          true,  1,  'chaud, grain court'),
    -- Salsa
    (v_recipe_id, 'tomate',                     90,   'g',          true,  2,  'épépinée, en dés'),
    (v_recipe_id, 'oignon rouge',               60,   'g',          true,  3,  'haché finement'),
    (v_recipe_id, 'poivron vert',               30,   'g',          true,  4,  'haché finement'),
    (v_recipe_id, 'ail',                        0.5,  'c. à café',  true,  5,  'râpé, pour la salsa'),
    (v_recipe_id, 'jus de citron vert',         15,   'ml',         true,  6,  NULL),
    (v_recipe_id, 'sel',                        0.25, 'c. à café',  true,  7,  'pour la salsa'),
    (v_recipe_id, 'sauce piquante',             0.2,  'ml',         false, 8,  'type Tabasco, 3 gouttes, optionnel'),
    -- Viande
    (v_recipe_id, 'bœuf haché',                 200,  'g',          true,  9,  'ou poulet haché'),
    (v_recipe_id, 'oignon',                     100,  'g',          true,  10, 'haché finement'),
    (v_recipe_id, 'ail',                        1,    'gousse',     true,  11, 'haché finement'),
    (v_recipe_id, 'huile végétale',             10,   'ml',         true,  12, NULL),
    (v_recipe_id, 'bouillon dashi',             15,   'ml',         true,  13, NULL),
    (v_recipe_id, 'sucre',                      5,    'g',          true,  14, NULL),
    (v_recipe_id, 'sauce soja',                 10,   'ml',         true,  15, NULL),
    (v_recipe_id, 'ketchup',                    30,   'ml',         true,  16, NULL),
    (v_recipe_id, 'sauce Worcestershire',       30,   'ml',         true,  17, NULL),
    (v_recipe_id, 'piment en poudre',           0.75, 'c. à café',  true,  18, 'à ajuster selon le goût'),
    (v_recipe_id, 'cumin moulu',                0.5,  'c. à café',  true,  19, NULL),
    -- Dressage
    (v_recipe_id, 'laitue',                     75,   'g',          true,  20, 'ciselée finement'),
    (v_recipe_id, 'avocat',                     50,   'g',          true,  21, 'en dés de 1 cm'),
    (v_recipe_id, 'fromage râpé',               50,   'g',          true,  22, 'cheddar ou fromage fondu');

  -- =====================================================================
  -- 2. Karaage (Japanese Fried Chicken)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Karaage (Japanese Fried Chicken)',
    'Poulet frit japonais emblématique : cuisses marinées à la sauce soja et au gingembre, enrobées de fécule de maïs et frites deux fois (160°C puis 190°C) pour une croûte ultra-croustillante et un cœur juteux. Un incontournable des izakaya et des bentos.',
    $instr$["Sécher les morceaux de poulet avec du papier absorbant. Les mettre dans un sac de congélation ou un bol avec la sauce soja, le bouillon dashi, le vinaigre de riz, l'eau, le sucre et le gingembre râpé (avec son jus).",
"Masser pour bien enrober et laisser mariner 30 minutes à 1 heure au réfrigérateur.",
"Chauffer l'huile à 160°C dans une casserole profonde (premier bain), sur environ 3 à 4 cm de hauteur.",
"Pendant ce temps, égoutter le poulet, le poser sur du papier absorbant puis le mettre dans un bol.",
"Saupoudrer de fécule de maïs et remuer pour bien enrober chaque morceau (la fécule absorbe le reste de marinade et forme la croûte).",
"Premier bain : frire par fournées 2 min 30 à 3 minutes à 160°C, en remuant car les morceaux collent au fond. Égoutter sur du papier absorbant.",
"Laisser reposer 3 à 4 minutes : la chaleur résiduelle termine la cuisson à cœur.",
"Retirer les miettes de l'huile et monter la température à 190-200°C (second bain).",
"Replonger les morceaux 30 secondes à 1 minute, jusqu'à ce qu'ils soient bien dorés et croustillants. Égoutter.",
"Servir aussitôt avec de la laitue ou du chou râpé, des quartiers de citron et, si désiré, un trait de mayonnaise japonaise."]
$instr$,
    10, 25, 2, 3,
    'Japonaise', 'appetizer',
    ARRAY['japonais','poulet frit','karaage','izakaya','double friture','marinade'],
    'manual',
    'https://japan.recipetineats.com/japanese-fried-chicken-karaage-chicken/',
    'https://japan.recipetineats.com/wp-content/uploads/2022/02/Karaage_Chicken_7349.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',           350, 'g',          true,  1,  'désossées, en morceaux de 5 x 4 cm'),
    (v_recipe_id, 'sauce soja',                  15,  'ml',         true,  2,  'marinade'),
    (v_recipe_id, 'bouillon dashi',              15,  'ml',         true,  3,  'marinade'),
    (v_recipe_id, 'vinaigre de riz',             0.25,'c. à café',  true,  4,  'marinade'),
    (v_recipe_id, 'eau',                         0.25,'c. à café',  true,  5,  'marinade'),
    (v_recipe_id, 'sucre',                       1,   'pincée',     true,  6,  'marinade'),
    (v_recipe_id, 'gingembre',                   2,   'c. à café',  true,  7,  'frais, râpé avec son jus'),
    (v_recipe_id, 'fécule de maïs',              20,  'g',          true,  8,  'pour l''enrobage'),
    (v_recipe_id, 'huile végétale',              500, 'ml',         true,  9,  'pour la friture'),
    (v_recipe_id, 'laitue',                      1,   'unité',      false, 10, 'ou chou râpé, pour servir'),
    (v_recipe_id, 'citron',                      1,   'unité',      false, 11, 'en quartiers, pour servir');

  -- =====================================================================
  -- 3. Yakitori
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Yakitori',
    'Brochettes de poulet grillées façon izakaya en plusieurs variantes : momo (poulet seul), negima (poulet et oignon vert), rondelles d''oignon et asperges roulées dans du bœuf. Sauce tare maison à la sauce soja, réduite puis badigeonnée pendant la cuisson ; recette pour 48 brochettes.',
    $instr$["Sauce tare : porter à ébullition la sauce soja, le vinaigre de riz, l'eau et le sucre dans une petite casserole, puis baisser le feu et laisser réduire d'un tiers environ 5 minutes. Réserver.",
"Couper les cuisses de poulet en cubes de 2,5 cm.",
"Momo : enfiler environ 5 morceaux de poulet sur chaque brochette.",
"Negima : alterner poulet et tronçons d'oignon vert (3 morceaux de poulet, 2 tronçons d'oignon), en commençant et en finissant par le poulet.",
"Rondelles d'oignon : enfiler 2 rondelles d'oignon à l'horizontale sur deux brochettes parallèles pour qu'elles tiennent.",
"Bœuf-asperges : blanchir les asperges 30 secondes, les refroidir et les couper en tronçons de 3 cm. Les enrouler dans une fine tranche de bœuf et les enfiler.",
"Brochettes de poulet et d'oignon : les badigeonner légèrement de sauce tare sur les deux faces. Cuire 4 minutes sur un gril chaud, retourner, badigeonner et cuire 4 minutes, puis retourner et finir 30 secondes.",
"Brochettes bœuf-asperges : cuire 3 minutes de chaque côté sans sauce, jusqu'à ce que le bœuf soit doré.",
"Au four : poser les brochettes sur une grille huilée à 5 cm du gril, cuire 5 à 6 minutes, retourner, badigeonner et cuire encore 4 à 5 minutes, jusqu'à légère coloration.",
"Servir aussitôt, saupoudré de poivre noir ou de shichimi togarashi."]
$instr$,
    90, 45, 8, 3,
    'Japonaise', 'appetizer',
    ARRAY['japonais','yakitori','brochettes','poulet','grillé','izakaya','tare'],
    'manual',
    'https://japan.recipetineats.com/yakitori-japanese-skewered-chicken/',
    'https://japan.recipetineats.com/wp-content/uploads/2021/11/Yakitori_28.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'brochettes en bambou',         48,   'unité',      true,  1,  '18 cm, trempées 30 min'),
    (v_recipe_id, 'cuisses de poulet',            1200, 'g',          true,  2,  'désossées, en cubes de 2,5 cm'),
    (v_recipe_id, 'oignons verts',                30,   'unité',      true,  3,  'en tronçons de 3 cm'),
    (v_recipe_id, 'petits oignons',               4,    'unité',      true,  4,  'en rondelles de 1,5 cm'),
    (v_recipe_id, 'asperges',                     10,   'unité',      true,  5,  'épaisses, environ 15 cm'),
    (v_recipe_id, 'bœuf tranché',                 360,  'g',          true,  6,  'en tranches très fines de 7 cm de long'),
    -- Sauce tare
    (v_recipe_id, 'sauce soja',                   185,  'ml',         true,  7,  'pour la tare'),
    (v_recipe_id, 'vinaigre de riz',              80,   'ml',         true,  8,  'pour la tare'),
    (v_recipe_id, 'eau',                          80,   'ml',         true,  9,  'pour la tare'),
    (v_recipe_id, 'sucre',                        60,   'g',          true,  10, 'pour la tare'),
    (v_recipe_id, 'poivre noir',                  1,    'pincée',     false, 11, 'ou shichimi togarashi, pour servir');

  -- =====================================================================
  -- 4. McDonald's Teriyaki Burger (Copycat)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'McDonald''s Teriyaki Burger (Copycat)',
    'Reproduction du burger teriyaki emblématique de McDonald''s Japon : galette de bœuf haché (oignon, panko au lait, muscade) trempée dans une sauce teriyaki épaissie (sauce soja, sucre, gingembre, ail, ketchup), puis montée dans un pain avec de la laitue et une mayonnaise au citron.',
    $instr$["Mayonnaise au citron : mélanger la mayonnaise japonaise, la crème (ou le lait), le jus de citron et une pincée de sucre. Réserver au frais.",
"Sauce teriyaki : verser la sauce soja, le vinaigre de riz, le bouillon dashi, le sucre et l'eau dans une casserole et porter à ébullition. Ajouter le gingembre, l'ail et le ketchup, puis incorporer la fécule de maïs délayée dans 1 c. à soupe d'eau en mélangeant vivement. Cuire jusqu'à consistance sirupeuse, puis retirer du feu.",
"Galettes : mélanger le bœuf haché, l'oignon finement haché, l'œuf, le panko préalablement imbibé de lait, la muscade et le poivre. Pétrir environ 2 minutes, jusqu'à ce que la farce devienne collante.",
"Former 4 galettes plates, un peu plus larges que les pains (elles rétrécissent à la cuisson).",
"Chauffer l'huile dans une grande poêle à feu moyen et cuire les galettes environ 4 minutes par face, jusqu'à ce qu'un jus clair s'en écoule quand on les pique.",
"Pendant ce temps, ouvrir les pains et les faire légèrement griller (à la poêle ou au four).",
"Déchirer la laitue en morceaux de la taille des pains.",
"Montage : poser la base du pain, tremper une galette dans la sauce teriyaki pour bien l'enrober et la poser dessus. Ajouter la laitue, napper de mayonnaise au citron et refermer. Répéter."]
$instr$,
    15, 20, 4, 2,
    'Japonaise', 'snack',
    ARRAY['japonais','burger','teriyaki','bœuf','fusion','street food','mcdonalds'],
    'manual',
    'https://japan.recipetineats.com/copycat-mcdonalds-teriyaki-burger/',
    'https://japan.recipetineats.com/wp-content/uploads/2021/01/McDonalds-Teriyaki-Burger_2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pains à burger',           4,    'unité',      true,  1,  'ou pains briochés'),
    (v_recipe_id, 'laitue',                   80,   'g',          true,  2,  'en feuilles'),
    -- Galette
    (v_recipe_id, 'bœuf haché',               500,  'g',          true,  3,  NULL),
    (v_recipe_id, 'oignon',                   133,  'g',          true,  4,  'haché finement'),
    (v_recipe_id, 'œuf',                      1,    'unité',      true,  5,  NULL),
    (v_recipe_id, 'chapelure panko',          30,   'g',          true,  6,  NULL),
    (v_recipe_id, 'lait',                     22,   'ml',         true,  7,  'pour imbiber le panko'),
    (v_recipe_id, 'muscade moulue',           2,    'pincée',     true,  8,  NULL),
    (v_recipe_id, 'poivre noir',              2,    'pincée',     true,  9,  'moulu'),
    (v_recipe_id, 'huile végétale',           15,   'ml',         true,  10, 'pour cuire les galettes'),
    -- Sauce teriyaki
    (v_recipe_id, 'sauce soja',               30,   'ml',         true,  11, 'sauce teriyaki'),
    (v_recipe_id, 'vinaigre de riz',          2.5,  'c. à café',  true,  12, 'sauce teriyaki'),
    (v_recipe_id, 'bouillon dashi',           30,   'ml',         true,  13, 'sauce teriyaki'),
    (v_recipe_id, 'sucre',                    35,   'g',          true,  14, 'sauce teriyaki'),
    (v_recipe_id, 'eau',                      30,   'ml',         true,  15, 'sauce teriyaki'),
    (v_recipe_id, 'gingembre',                10,   'g',          true,  16, 'frais, râpé'),
    (v_recipe_id, 'ail',                      2,    'gousse',     true,  17, 'râpé'),
    (v_recipe_id, 'ketchup',                  1.5,  'c. à café',  true,  18, 'sauce teriyaki'),
    (v_recipe_id, 'fécule de maïs',           5,    'g',          true,  19, 'sauce teriyaki'),
    (v_recipe_id, 'eau',                      1,    'c. à soupe', true,  20, 'pour délayer la fécule'),
    -- Mayonnaise au citron
    (v_recipe_id, 'mayonnaise japonaise',     45,   'ml',         true,  21, 'type Kewpie, mayonnaise au citron'),
    (v_recipe_id, 'crème liquide',            10,   'ml',         true,  22, 'ou lait, mayonnaise au citron'),
    (v_recipe_id, 'jus de citron',            5,    'ml',         true,  23, 'mayonnaise au citron'),
    (v_recipe_id, 'sucre',                    1,    'pincée',     true,  24, 'mayonnaise au citron');

  -- =====================================================================
  -- 5. Tebasaki (Nagoya Fried Chicken Wings)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Tebasaki (Nagoya Fried Chicken Wings)',
    'Spécialité de Nagoya : ailes de poulet frites deux fois (160°C puis 180°C), badigeonnées d''une sauce soja, sucre, gingembre et ail, puis généreusement poivrées au poivre blanc. Style Furaibou (avec sésame) ou Yamachan (enrobées de fécule).',
    $instr$["Sauce : porter à ébullition dans une petite casserole le bouillon dashi, le vinaigre de riz, l'eau, la sauce soja, l'ail râpé, le gingembre râpé et le sucre. Laisser refroidir.",
"Sécher les ailes avec du papier absorbant (style Yamachan : les enrober de fécule de maïs).",
"Premier bain : chauffer l'huile à 160°C et y plonger les ailes sans surcharger. Frire par fournées environ 5 minutes, jusqu'à ce qu'elles soient légèrement dorées.",
"Égoutter et laisser reposer 10 à 15 minutes sur du papier absorbant (la chaleur résiduelle termine la cuisson).",
"Second bain : monter l'huile à 180°C et replonger les ailes 3 à 4 minutes, jusqu'à ce qu'elles soient bien dorées et croustillantes.",
"Égoutter sur du papier absorbant, puis sur une grille, face intérieure vers le haut.",
"Badigeonner généreusement de sauce au pinceau et saupoudrer de poivre blanc moulu.",
"Retourner et recommencer (sauce et poivre).",
"Style Furaibou : dresser avec du chou râpé et du citron, et parsemer de graines de sésame.",
"Style Yamachan : empiler haut sur l'assiette et servir bien chaud, à déguster avec les doigts."]
$instr$,
    10, 25, 2, 3,
    'Japonaise', 'appetizer',
    ARRAY['japonais','nagoya','ailes de poulet','tebasaki','double friture','izakaya'],
    'manual',
    'https://japan.recipetineats.com/nagoya-style-fried-chicken-wings/',
    'https://japan.recipetineats.com/wp-content/uploads/2020/12/Nagoya-style_Fried_Chicken_Wings_5534.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ailes de poulet',            12,  'unité',      true,  1,  'partie centrale, 350 à 650 g selon le style'),
    (v_recipe_id, 'fécule de maïs',             2,   'c. à soupe', false, 2,  'style Yamachan uniquement'),
    (v_recipe_id, 'huile végétale',             500, 'ml',         true,  3,  'pour la friture'),
    (v_recipe_id, 'poivre blanc',               1,   'c. à café',  true,  4,  'moulu, généreusement à la fin'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à soupe', false, 5,  'grillées, style Furaibou'),
    -- Sauce
    (v_recipe_id, 'bouillon dashi',             1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'vinaigre de riz',            2.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'eau',                        2.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  11, 'râpé'),
    (v_recipe_id, 'gingembre',                  1,   'c. à café',  true,  12, 'frais, râpé'),
    (v_recipe_id, 'sucre',                      2,   'c. à café',  false, 13, 'supplémentaire, optionnel'),
    -- Service
    (v_recipe_id, 'chou blanc',                 100, 'g',          false, 14, 'râpé, pour servir (style Furaibou)'),
    (v_recipe_id, 'citron',                     0.5, 'unité',      false, 15, 'en quartiers, pour servir (style Furaibou)');

  -- =====================================================================
  -- 6. Prawn Doria
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Prawn Doria',
    'Gratin de riz japonais (yōshoku) : un lit de riz au beurre revenu avec carotte et oignon, nappé d''une béchamel aux crevettes et aux champignons, gratiné au parmesan. D''inspiration franco-italienne, c''est devenu un classique familial au Japon.',
    $instr$["Riz au beurre : faire fondre le beurre à feu moyen et faire revenir la carotte et l'oignon en dés 1 à 2 minutes.",
"Ajouter le riz cuit et bien mélanger en défaisant les grumeaux. Saler et poivrer.",
"Répartir le riz dans deux plats à gratin individuels et le tasser légèrement.",
"Crevettes : les saisir 1 minute de chaque côté dans une poêle à feu moyen-vif. Réserver.",
"Béchamel : dans une casserole à feu moyen, faire fondre le beurre et faire revenir l'oignon et les champignons jusqu'à ce que l'oignon soit translucide.",
"Baisser le feu, ajouter la farine et cuire 2 minutes en remuant (roux blond).",
"Ajouter progressivement le lait, le bouillon de crevettes, le demi-cube de bouillon de poulet, le sel et le poivre blanc en fouettant.",
"Repasser à feu moyen et fouetter régulièrement jusqu'à ce que la sauce épaississe et devienne nappante.",
"Ajouter les crevettes et retirer aussitôt du feu (elles finiront de cuire au four).",
"Verser la béchamel sur le riz dans les plats et saupoudrer généreusement de parmesan.",
"Passer 3 à 5 minutes sous le gril du four, jusqu'à ce que le dessus soit bien doré. Servir très chaud."]
$instr$,
    15, 25, 2, 3,
    'Japonaise', 'dinner',
    ARRAY['japonais','yōshoku','gratin','crevettes','béchamel','riz','comfort food'],
    'manual',
    'https://japan.recipetineats.com/prawn-doria-japanese-rice-gratin/',
    'https://japan.recipetineats.com/wp-content/uploads/2020/06/Prawn_Doria_4547.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Crevettes + topping
    (v_recipe_id, 'crevettes',                160, 'g',          true,  1,  'décortiquées et déveinées, queue conservée'),
    (v_recipe_id, 'parmesan râpé',            4,   'c. à soupe', true,  2,  'pour gratiner'),
    -- Béchamel
    (v_recipe_id, 'beurre',                   20,  'g',          true,  3,  'pour la béchamel'),
    (v_recipe_id, 'oignon',                   0.5, 'unité',      true,  4,  'moyen, en petits dés, pour la béchamel'),
    (v_recipe_id, 'champignons de Paris',     70,  'g',          true,  5,  'émincés finement'),
    (v_recipe_id, 'farine',                   3,   'c. à soupe', true,  6,  'pour la béchamel'),
    (v_recipe_id, 'lait',                     350, 'ml',         true,  7,  'entier ou demi-écrémé'),
    (v_recipe_id, 'bouillon de crevettes',    100, 'ml',         false, 8,  'ou eau'),
    (v_recipe_id, 'cube de bouillon de poulet', 0.5, 'unité',    true,  9,  NULL),
    (v_recipe_id, 'sel',                      0.5, 'c. à café',  true,  10, 'pour la béchamel'),
    (v_recipe_id, 'poivre blanc',             1,   'pincée',     true,  11, NULL),
    -- Riz au beurre
    (v_recipe_id, 'riz cuit',                 400, 'g',          true,  12, 'japonais de préférence'),
    (v_recipe_id, 'beurre',                   15,  'g',          true,  13, 'pour le riz'),
    (v_recipe_id, 'carotte',                  30,  'g',          true,  14, 'en petits dés'),
    (v_recipe_id, 'oignon',                   30,  'g',          true,  15, 'en petits dés, pour le riz'),
    (v_recipe_id, 'sel',                      1,   'pincée',     true,  16, 'pour le riz'),
    (v_recipe_id, 'poivre noir',              1,   'pincée',     true,  17, 'pour le riz');

  -- =====================================================================
  -- 7. Korokke
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Korokke',
    'Croquettes japonaises de pommes de terre et de viande hachée : un cœur moelleux légèrement sucré-salé à la sauce soja et une croûte de panko ultra-croustillante. Un classique de la cuisine familiale, des bentos et des izakaya, servi avec du chou cru et de la sauce tonkatsu.',
    $instr$["Cuire les pommes de terre entières dans une grande casserole d'eau bouillante 15 à 40 minutes selon leur taille, jusqu'à ce qu'elles soient très tendres (la lame d'un couteau doit s'y enfoncer sans résistance).",
"Égoutter, peler à chaud (pénible mais nécessaire) et écraser grossièrement en laissant quelques morceaux.",
"Pendant ce temps, faire revenir l'oignon finement haché dans l'huile à feu moyen-vif 3 à 5 minutes. Ajouter la viande hachée, saler, poivrer et cuire jusqu'à ce qu'elle soit bien dorée.",
"Mélanger la viande aux pommes de terre. Incorporer la sauce soja, le bouillon dashi, le vinaigre de riz, l'eau et le sucre. Bien mélanger, goûter et rectifier.",
"Diviser en 12 portions égales et former des galettes ovales d'environ 2 cm d'épaisseur.",
"Préparer 3 assiettes : farine, œuf battu et panko.",
"Fariner chaque croquette (tapoter pour retirer l'excédent), la tremper dans l'œuf, puis bien la rouler dans le panko en appuyant pour qu'il adhère.",
"Chauffer l'huile à 180°C. Frire par petites fournées 1 à 2 minutes, jusqu'à ce que les croquettes soient bien dorées, en les retournant à mi-cuisson.",
"Égoutter sur une grille et servir aussitôt avec du chou râpé, du persil et de la sauce tonkatsu."]
$instr$,
    15, 45, 12, 3,
    'Japonaise', 'dinner',
    ARRAY['japonais','korokke','croquettes','pommes de terre','panko','frit','bento'],
    'manual',
    'https://japan.recipetineats.com/korokke-japanese-potato-and-ground-meat-croquettes/',
    'https://japan.recipetineats.com/wp-content/uploads/2017/02/Korokke_0154.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pommes de terre',            600, 'g',          true,  1,  'farineuses (type Bintje ou Russet)'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  2,  'pour la viande'),
    (v_recipe_id, 'bœuf haché',                 200, 'g',          true,  3,  NULL),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  4,  'petit, haché finement'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  5,  'au goût'),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  6,  'au goût'),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'bouillon dashi',             1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'vinaigre de riz',            1.25,'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'eau',                        1.25,'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sucre',                      2,   'c. à café',  true,  11, NULL),
    -- Panure
    (v_recipe_id, 'farine',                     50,  'g',          true,  12, 'pour la panure'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  13, 'battu, pour la panure'),
    (v_recipe_id, 'panko',                      150, 'g',          true,  14, 'pour la panure'),
    (v_recipe_id, 'huile végétale',             1,   'l',          true,  15, 'pour la friture'),
    -- Service
    (v_recipe_id, 'chou blanc',                 200, 'g',          false, 16, 'râpé, pour servir'),
    (v_recipe_id, 'persil frais',               4,   'brin',       false, 17, 'pour servir'),
    (v_recipe_id, 'sauce tonkatsu',             60,  'ml',         false, 18, 'pour servir');

  -- =====================================================================
  -- 8. Oyako-don
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Oyako-don',
    'Donburi japonais classique (« parent et enfant » : poulet et œuf) : poulet et oignon mijotés dans un bouillon dashi à la sauce soja, liés par un œuf battu encore coulant et servis sur du riz chaud. Rapide, économique et profondément réconfortant.',
    $instr$["Mélanger le bouillon dashi, le vinaigre de riz, l'eau, le sucre et la sauce soja dans un bol pour préparer la sauce.",
"Verser un tiers de la sauce dans une petite poêle (18-20 cm) à feu moyen. Cuire une portion à la fois : c'est la clé pour garder des œufs coulants.",
"Quand la sauce frémit, ajouter un tiers du poulet et un tiers de l'oignon émincé en couche uniforme. Remuer de temps en temps quelques minutes, jusqu'à ce que le poulet soit presque cuit.",
"Battre 2 œufs dans un bol. En verser la moitié en filet sur le poulet et mélanger délicatement, puis étaler le reste par-dessus.",
"Couvrir et cuire 30 secondes à 1 minute : le blanc doit être pris et le jaune encore crémeux.",
"Éteindre le feu et faire glisser le contenu de la poêle sur un bol de riz chaud à l'aide d'une spatule.",
"Garnir d'oignon vert en julienne si désiré. Répéter pour les 2 autres portions et servir chacune aussitôt."]
$instr$,
    5, 15, 3, 2,
    'Japonaise', 'lunch',
    ARRAY['japonais','donburi','oyakodon','poulet','œuf','rapide','riz'],
    'manual',
    'https://japan.recipetineats.com/oyako-don-chicken-egg-rice/',
    'https://japan.recipetineats.com/wp-content/uploads/2017/02/Oyakodon_334.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filets de poulet',         250, 'g',          true,  1,  'en bouchées'),
    (v_recipe_id, 'oignon',                   0.75, 'unité',     true,  2,  'émincé'),
    (v_recipe_id, 'œufs',                     6,   'unité',      true,  3,  '2 par portion'),
    (v_recipe_id, 'bouillon dashi',           150, 'ml',         true,  4,  NULL),
    (v_recipe_id, 'vinaigre de riz',          45,  'ml',         true,  5,  NULL),
    (v_recipe_id, 'eau',                      45,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'sucre',                    1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sauce soja',               45,  'ml',         true,  8,  NULL),
    (v_recipe_id, 'riz cuit',                 450, 'g',          true,  9,  'chaud, 3 bols'),
    (v_recipe_id, 'oignon vert',              2,   'unité',      false, 10, 'partie verte en julienne, pour garnir');

  RAISE NOTICE 'Seed: 8 RecipeTinEats Japan recipes inserted for user %', v_user_id;
END $$;
