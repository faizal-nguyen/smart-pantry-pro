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
    'Fusion d''Okinawa née des bases américaines : garnitures de tacos (bœuf haché épicé soja-Worcestershire-cumin, salsa fraîche, laitue, avocat, fromage) servies sur un lit de riz japonais chaud. Comfort food prêt en 20 min.',
    $instr$["Salsa : tremper l'oignon rouge haché dans l'eau froide 10-15 min si trop fort, puis bien égoutter.",
"Mélanger dans un bol tomate en dés, oignon rouge, poivron vert, ail râpé, jus de citron vert, sel et Tabasco. Peut se préparer la veille.",
"Viande : faire revenir l'oignon haché et l'ail dans l'huile à feu moyen-vif jusqu'à doré.",
"Ajouter le bœuf haché et cuire en cassant les amas jusqu'à changement de couleur.",
"Incorporer saké, sucre, sauce soja, ketchup, Worcestershire, piment en poudre et cumin. Bien mélanger.",
"Laisser évaporer le liquide à feu moyen jusqu'à ce que la viande soit luisante mais pas sèche.",
"Dressage : étaler le riz chaud dans deux bols. Disposer la viande par-dessus.",
"Ajouter la laitue ciselée et les dés d'avocat.",
"Couronner de salsa et parsemer généreusement de fromage râpé. Servir immédiatement, le fromage fond légèrement au contact du riz chaud."]
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
    (v_recipe_id, 'riz cuit chaud',             380,  'g',          true,  1,  'japonais court grain'),
    -- Salsa
    (v_recipe_id, 'tomate',                     90,   'g',          true,  2,  'épépinée et en dés'),
    (v_recipe_id, 'oignon rouge',               60,   'g',          true,  3,  'finement haché'),
    (v_recipe_id, 'poivron vert',               30,   'g',          true,  4,  'finement haché'),
    (v_recipe_id, 'ail',                        0.5,  'c. à café',  true,  5,  'râpé, pour la salsa'),
    (v_recipe_id, 'jus de citron vert',         15,   'ml',         true,  6,  NULL),
    (v_recipe_id, 'sel',                        0.25, 'c. à café',  true,  7,  'pour la salsa'),
    (v_recipe_id, 'sauce Tabasco',              1,    'pincée',     false, 8,  '3 gouttes, optionnel'),
    -- Viande
    (v_recipe_id, 'bœuf haché',                 200,  'g',          true,  9,  'ou porc/poulet/mix'),
    (v_recipe_id, 'oignon',                     100,  'g',          true,  10, 'finement haché'),
    (v_recipe_id, 'ail',                        1,    'gousse',     true,  11, 'finement haché'),
    (v_recipe_id, 'huile',                      10,   'ml',         true,  12, NULL),
    (v_recipe_id, 'saké de cuisine',            15,   'ml',         true,  13, NULL),
    (v_recipe_id, 'sucre',                      5,    'g',          true,  14, NULL),
    (v_recipe_id, 'sauce soja',                 10,   'ml',         true,  15, NULL),
    (v_recipe_id, 'ketchup',                    30,   'ml',         true,  16, NULL),
    (v_recipe_id, 'sauce Worcestershire',       30,   'ml',         true,  17, NULL),
    (v_recipe_id, 'piment en poudre',           0.75, 'c. à café',  true,  18, 'ajuster au goût'),
    (v_recipe_id, 'cumin moulu',                0.5,  'c. à café',  true,  19, NULL),
    -- Dressage
    (v_recipe_id, 'laitue',                     75,   'g',          true,  20, 'finement ciselée'),
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
    'Poulet frit japonais signature : cuisses marinées soja-saké-gingembre, enrobées de fécule de maïs et double-frites (160°C puis 190°C) pour une croûte ultra-croustillante et un cœur juteux. Star des izakaya et bentos.',
    $instr$["Sécher les morceaux de poulet au papier absorbant. Les mettre dans un sac congélation ou un bol avec sauce soja, saké, mirin et gingembre râpé (avec son jus).",
"Masser pour bien enrober. Laisser mariner 30 minutes à 1 heure au frais.",
"Chauffer l'huile dans une casserole profonde à 160°C (premier bain). Profondeur d'huile ~3-4 cm.",
"Pendant ce temps, égoutter la marinade. Mettre les morceaux sur du papier absorbant puis dans un bol.",
"Saupoudrer de fécule de maïs et tourner pour bien enrober chaque morceau (la fécule absorbe le jus de marinade restant et forme une croûte).",
"Premier bain : faire frire par lots ~2 min 30 à 3 min à 160°C. Remuer car les morceaux collent au fond. Égoutter sur papier absorbant.",
"Laisser reposer 3-4 minutes (la chaleur résiduelle finit de cuire le cœur).",
"Retirer les miettes de l'huile, monter à 190-200°C (second bain).",
"Replonger les morceaux 30 sec à 1 min jusqu'à doré profond et croustillant. Égoutter.",
"Servir immédiatement avec laitue/chou râpé, quartiers de citron et un trait de mayo Kewpie."]
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
    (v_recipe_id, 'cuisses de poulet désossées', 350, 'g',          true,  1,  'en morceaux de 5x4 cm'),
    (v_recipe_id, 'sauce soja',                  15,  'ml',         true,  2,  'marinade'),
    (v_recipe_id, 'saké de cuisine',             15,  'ml',         true,  3,  'marinade'),
    (v_recipe_id, 'mirin',                       2.5, 'ml',         true,  4,  'marinade'),
    (v_recipe_id, 'gingembre frais râpé',        10,  'ml',         true,  5,  'avec le jus'),
    (v_recipe_id, 'fécule de maïs',              20,  'g',          true,  6,  'pour l''enrobage'),
    (v_recipe_id, 'huile végétale',              500, 'ml',         true,  7,  'pour la friture'),
    (v_recipe_id, 'laitue',                      1,   'unité',      false, 8,  'ou chou râpé, garniture'),
    (v_recipe_id, 'citron',                      1,   'unité',      false, 9,  'en quartiers, pour servir');

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
    'Brochettes de poulet grillées japonaises (style izakaya) : variantes momo (poulet seul), negima (poulet-oignon vert), tsukimi (oignon entier) et lard-asperges. Sauce tare maison soja-mirin-sucre réduite, badigeonnée pendant la cuisson. Recette pour 48 brochettes (fête).',
    $instr$["Sauce tare : porter sauce soja + mirin + sucre à ébullition dans une petite casserole, puis réduire le feu et mijoter 5 minutes jusqu'à réduction d'un tiers. Réserver.",
"Cubes de poulet : couper les cuisses en cubes de 2,5 cm.",
"Momo : enfiler ~5 morceaux de poulet sur chaque brochette.",
"Negima : alterner poulet et tronçons d'oignon vert (3 poulets, 2 oignons), commencer et finir par le poulet.",
"Rondelles d'oignon : enfiler 2 rondelles d'oignon transversalement par brochette (les rondelles tiennent en deux brochettes parallèles).",
"Lard-asperges : blanchir les asperges 30 sec, refroidir, couper en tronçons de 3 cm. Enrouler dans une lamelle de lard et enfiler.",
"Brochettes poulet/oignon : badigeonner légèrement les deux côtés de sauce tare. Cuire 4 min sur grill chaud, retourner, badigeonner et cuire 4 min, retourner et finir 30 sec.",
"Brochettes lard-asperges : cuire 3 min de chaque côté sans sauce jusqu'à ce que le lard soit doré et croustillant.",
"Option four : grille huilée à 5 cm du gril, cuire 5-6 min, retourner et badigeonner, cuire 4-5 min jusqu'à légère carbonisation.",
"Servir immédiatement, parsemer de poivre noir ou shichimi togarashi."]
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
    (v_recipe_id, 'cuisses de poulet désossées',  1200, 'g',          true,  2,  'cubes de 2,5 cm'),
    (v_recipe_id, 'oignons verts',                30,   'unité',      true,  3,  'tronçons de 3 cm'),
    (v_recipe_id, 'petits oignons',               4,    'unité',      true,  4,  'rondelles de 1,3-1,5 cm'),
    (v_recipe_id, 'asperges',                     10,   'unité',      true,  5,  'épaisses, ~15 cm'),
    (v_recipe_id, 'lard fin',                     360,  'g',          true,  6,  'tranches longueur 7 cm'),
    -- Sauce tare
    (v_recipe_id, 'sauce soja',                   185,  'ml',         true,  7,  'pour la tare'),
    (v_recipe_id, 'mirin',                        185,  'ml',         true,  8,  'pour la tare'),
    (v_recipe_id, 'sucre',                        37,   'g',          true,  9,  '~2,5 c. à soupe');

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
    'Reproduction du burger teriyaki iconique de McDonald''s Japon : galette de porc haché (oignon, panko-lait, muscade), trempée dans une sauce teriyaki épaissie (soja-mirin-saké-sucre-gingembre-ail-ketchup) puis montée sur pain avec laitue et mayo Kewpie au citron.',
    $instr$["Mayo au citron : mélanger mayonnaise Kewpie, crème (ou lait), jus de citron et une pointe de sucre. Réserver au frais.",
"Sauce teriyaki : verser sauce soja + mirin + saké + sucre + eau dans une casserole. Porter à ébullition. Ajouter gingembre râpé, ail râpé et ketchup. Incorporer la maïzena diluée dans un peu d'eau et mélanger rapidement. Cuire jusqu'à épaississement sirupeux, puis retirer du feu.",
"Galettes : mélanger porc haché, oignon haché fin, œuf, panko préalablement imbibé de lait, muscade et poivre. Pétrir jusqu'à texture collante (~2 min).",
"Former 4 galettes plates rondes, légèrement plus larges que les pains (elles rétrécissent à la cuisson).",
"Chauffer l'huile dans une grande poêle à feu moyen. Cuire les galettes ~4 min par face jusqu'à ce qu'un jus clair s'écoule à la piqûre.",
"Pendant ce temps, ouvrir les pains et les griller légèrement (poêle ou four).",
"Déchirer la laitue en morceaux de la taille du pain.",
"Assemblage : poser le pain bas. Tremper une galette dans la sauce teriyaki pour bien l'enrober, la poser sur le pain. Ajouter laitue, napper de mayo au citron, refermer avec le pain haut. Répéter."]
$instr$,
    15, 20, 4, 2,
    'Japonaise', 'snack',
    ARRAY['japonais','burger','teriyaki','porc','fusion','street food','mcdonalds'],
    'manual',
    'https://japan.recipetineats.com/copycat-mcdonalds-teriyaki-burger/',
    'https://japan.recipetineats.com/wp-content/uploads/2021/01/McDonalds-Teriyaki-Burger_2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pains à burger',           4,    'unité',      true,  1,  'ou brioche'),
    (v_recipe_id, 'feuilles de laitue',       80,   'g',          true,  2,  NULL),
    -- Galette
    (v_recipe_id, 'porc haché',               500,  'g',          true,  3,  NULL),
    (v_recipe_id, 'oignon',                   133,  'g',          true,  4,  'finement haché'),
    (v_recipe_id, 'œuf',                      1,    'unité',      true,  5,  NULL),
    (v_recipe_id, 'chapelure panko',          30,   'g',          true,  6,  NULL),
    (v_recipe_id, 'lait',                     22,   'ml',         true,  7,  'pour imbiber le panko'),
    (v_recipe_id, 'muscade moulue',           2,    'pincée',     true,  8,  NULL),
    (v_recipe_id, 'poivre noir moulu',        2,    'pincée',     true,  9,  NULL),
    (v_recipe_id, 'huile végétale',           15,   'ml',         true,  10, 'pour cuire les galettes'),
    -- Sauce teriyaki
    (v_recipe_id, 'sauce soja',               30,   'ml',         true,  11, 'teriyaki'),
    (v_recipe_id, 'mirin',                    30,   'ml',         true,  12, 'teriyaki'),
    (v_recipe_id, 'saké de cuisine',          30,   'ml',         true,  13, 'teriyaki'),
    (v_recipe_id, 'sucre',                    30,   'g',          true,  14, 'teriyaki'),
    (v_recipe_id, 'eau',                      15,   'ml',         true,  15, 'teriyaki'),
    (v_recipe_id, 'gingembre râpé',           10,   'g',          true,  16, 'teriyaki'),
    (v_recipe_id, 'ail râpé',                 10,   'g',          true,  17, 'teriyaki'),
    (v_recipe_id, 'ketchup',                  7,    'ml',         true,  18, 'teriyaki'),
    (v_recipe_id, 'fécule de maïs',           5,    'g',          true,  19, 'diluée dans l''eau, teriyaki'),
    -- Mayo citron
    (v_recipe_id, 'mayonnaise Kewpie',        45,   'ml',         true,  20, 'mayo citron'),
    (v_recipe_id, 'crème',                    10,   'ml',         true,  21, 'ou lait, mayo citron'),
    (v_recipe_id, 'jus de citron',            5,    'ml',         true,  22, 'mayo citron'),
    (v_recipe_id, 'sucre',                    2,    'g',          true,  23, 'pointe, mayo citron');

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
    'Spécialité de Nagoya : ailes de poulet doublement frites (160°C puis 180°C) puis badigeonnées d''une sauce soja-mirin-saké-sucre-gingembre-ail, finies au poivre blanc généreux. Style Furaibou (avec sésame) ou Yamachan (enrobées de fécule).',
    $instr$["Sauce : porter saké, mirin, sauce soja, ail râpé, gingembre râpé et sucre (optionnel) à ébullition dans une petite casserole. Laisser refroidir.",
"Sécher les ailes au papier absorbant. (Style Yamachan : enrober de fécule de maïs.)",
"Premier bain : chauffer l'huile à 160°C. Plonger les ailes sans surcharger. Frire par lots ~5 minutes jusqu'à légèrement doré.",
"Égoutter et reposer 10-15 min sur du papier absorbant (la chaleur résiduelle cuit à cœur).",
"Second bain : monter l'huile à 180°C. Replonger les ailes 3-4 minutes jusqu'à doré profond et croustillant.",
"Égoutter sur papier absorbant puis sur une grille face interne vers le haut.",
"Badigeonner généreusement de sauce avec un pinceau. Saupoudrer de poivre blanc moulu.",
"Retourner et répéter (sauce + poivre).",
"Style Furaibou : dresser avec chou râpé et citron. Parsemer de graines de sésame blanches.",
"Style Yamachan : empiler haut sur l'assiette. Servir bien chaud à la main."]
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
    (v_recipe_id, 'ailes de poulet',            12,  'unité',      true,  1,  'section médiane, ~350-650 g selon style'),
    (v_recipe_id, 'fécule de maïs',             2,   'c. à soupe', false, 2,  'style Yamachan uniquement'),
    (v_recipe_id, 'huile végétale',             500, 'ml',         true,  3,  'pour la friture'),
    (v_recipe_id, 'poivre blanc moulu',         1,   'c. à café',  true,  4,  'généreusement à la fin'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à soupe', false, 5,  'rôties, style Furaibou'),
    -- Sauce
    (v_recipe_id, 'saké de cuisine',            1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'mirin',                      2,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'ail râpé',                   2,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'gingembre râpé',             1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sucre',                      2,   'c. à café',  false, 11, 'optionnel');

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
    'Gratin de riz japonais (yōshoku) : lit de riz au beurre poêlé avec carotte-oignon, couvert d''une béchamel aux crevettes et champignons, gratiné au parmesan. Inspiration franco-italienne adoptée par les ménagères japonaises.',
    $instr$["Riz au beurre : faire fondre le beurre à feu moyen, faire revenir la carotte et l'oignon en dés 1-2 min.",
"Ajouter le riz cuit, bien mélanger en cassant les amas. Saler-poivrer.",
"Transférer le riz beurré dans deux plats à gratin individuels. Tasser légèrement.",
"Crevettes : cuire les crevettes 1 min de chaque côté dans une poêle à feu moyen-vif. Réserver.",
"Béchamel : dans une casserole à feu moyen, fondre le beurre, faire suer oignon et champignons jusqu'à transparence.",
"Réduire le feu, ajouter la farine et cuire 2 min en remuant (roux blond).",
"Ajouter progressivement le lait, le bouillon de crevettes, le demi-cube de bouillon de poulet, sel et poivre blanc en fouettant.",
"Augmenter à feu moyen, fouetter régulièrement jusqu'à épaississement nappant.",
"Ajouter les crevettes et retirer du feu immédiatement (elles finissent au four).",
"Verser la béchamel sur le riz dans les plats à gratin. Saupoudrer généreusement de parmesan râpé.",
"Passer sous le gril du four 3-5 min jusqu'à dorage doré. Servir bien chaud."]
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
    (v_recipe_id, 'crevettes',                160, 'g',          true,  1,  'décortiquées, dénervées, queue intacte'),
    (v_recipe_id, 'parmesan râpé',            4,   'c. à soupe', true,  2,  'pour gratiner'),
    -- Béchamel
    (v_recipe_id, 'beurre',                   20,  'g',          true,  3,  'pour la béchamel'),
    (v_recipe_id, 'oignon',                   0.5, 'unité',      true,  4,  'moyen, dés fins, béchamel'),
    (v_recipe_id, 'champignons',              70,  'g',          true,  5,  'tranchés fin'),
    (v_recipe_id, 'farine',                   3,   'c. à soupe', true,  6,  'pour la béchamel'),
    (v_recipe_id, 'lait',                     350, 'ml',         true,  7,  'entier ou allégé'),
    (v_recipe_id, 'bouillon de crevettes',    100, 'ml',         false, 8,  'ou eau'),
    (v_recipe_id, 'cube de bouillon poulet',  0.5, 'unité',      true,  9,  NULL),
    (v_recipe_id, 'sel',                      0.5, 'c. à café',  true,  10, 'béchamel'),
    (v_recipe_id, 'poivre blanc',             1,   'pincée',     true,  11, NULL),
    -- Riz au beurre
    (v_recipe_id, 'riz cuit',                 400, 'g',          true,  12, '~500 ml de riz'),
    (v_recipe_id, 'beurre',                   15,  'g',          true,  13, 'pour le riz'),
    (v_recipe_id, 'carotte',                  30,  'g',          true,  14, 'dés fins'),
    (v_recipe_id, 'oignon',                   30,  'g',          true,  15, 'dés fins, pour le riz'),
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
    'Croquettes japonaises pommes de terre + viande hachée (porc ou mix) : intérieur moelleux légèrement sucré-salé soja-mirin-saké, croûte panko ultra-croustillante. Plat de cuisine maison signature des bentos et izakaya, servi avec chou cru et sauce tonkatsu.',
    $instr$["Cuire les pommes de terre entières dans une grande casserole d'eau bouillante 15-40 min selon taille jusqu'à très tendres (couteau pique sans résistance).",
"Égoutter, peler chaud (essoufflant mais nécessaire) et écraser grossièrement en laissant des morceaux.",
"Pendant ce temps : faire revenir l'oignon haché fin dans l'huile à feu moyen-vif 3-5 min. Ajouter la viande hachée, saler et poivrer, cuire jusqu'à doré complet.",
"Mélanger la viande cuite aux pommes de terre. Incorporer sauce soja, saké, mirin et sucre. Bien mélanger. Goûter et ajuster.",
"Diviser en 12 portions égales. Former des galettes ovales aplaties d'environ 2 cm d'épaisseur.",
"Préparer 3 assiettes : farine / œuf battu / panko.",
"Enrober chaque korokke de farine (taper l'excès), tremper dans l'œuf, puis bien rouler dans le panko en appuyant pour que ça adhère.",
"Chauffer l'huile à 180°C. Frire par fournées 1-2 min jusqu'à doré profond, sans surcharger. Tourner à mi-cuisson.",
"Égoutter sur grille. Servir immédiatement avec chou râpé, persil et sauce tonkatsu en accompagnement."]
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
    (v_recipe_id, 'pommes de terre féculentes', 600, 'g',          true,  1,  'Russet/Dutch Cream/King Edward'),
    (v_recipe_id, 'huile',                      1,   'c. à soupe', true,  2,  'pour la viande'),
    (v_recipe_id, 'porc haché',                 200, 'g',          true,  3,  'ou mix porc-bœuf'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  4,  'petit, haché fin'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  5,  'au goût'),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  6,  'au goût'),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'saké de cuisine',            1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'mirin',                      1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'sucre',                      0.5, 'c. à soupe', true,  10, NULL),
    -- Panure
    (v_recipe_id, 'farine',                     50,  'g',          true,  11, 'pour enrober'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  12, 'battu, pour enrober'),
    (v_recipe_id, 'panko',                      150, 'g',          true,  13, '~500 ml, pour enrober'),
    (v_recipe_id, 'huile végétale',             1000, 'ml',        true,  14, 'pour la friture'),
    -- Service
    (v_recipe_id, 'chou râpé',                  1,   'unité',      false, 15, 'pour servir'),
    (v_recipe_id, 'persil frais',               1,   'unité',      false, 16, 'pour servir'),
    (v_recipe_id, 'sauce tonkatsu',             1,   'unité',      false, 17, 'pour servir');

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
    'Donburi classique japonais ("parent-enfant" : poulet + œuf) : poulet et oignon mijotés dans dashi-mirin-soja, terminés avec un œuf battu légèrement coulant, servis sur riz chaud. Rapide, économique, profondément satisfaisant.',
    $instr$["Mélanger dashi, mirin et sauce soja dans un bol pour faire la sauce.",
"Verser un tiers de la sauce dans une petite poêle (18-20 cm) à feu moyen. Cuire une portion à la fois — c'est la clé pour des œufs encore coulants.",
"Quand la sauce frémit, ajouter un tiers du poulet et un tiers de l'oignon émincé en couche uniforme. Remuer occasionnellement quelques minutes jusqu'à cuisson presque complète du poulet.",
"Battre 2 œufs dans un bol. Verser la moitié en filet sur le poulet et mélanger délicatement. Étaler le reste des œufs par-dessus.",
"Couvrir et cuire 30 sec à 1 min : le blanc doit être pris mais le jaune doit rester crémeux-coulant.",
"Éteindre le feu. Faire glisser le contenu de la poêle sur un bol de riz chaud avec une spatule.",
"Garnir d'oignons verts en julienne si désiré. Répéter pour les 2 autres portions et servir chacune immédiatement."]
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
    (v_recipe_id, 'filets de poulet',         250, 'g',          true,  1,  'en morceaux à manger'),
    (v_recipe_id, 'oignon',                   0.75, 'unité',     true,  2,  'émincé'),
    (v_recipe_id, 'œufs',                     6,   'unité',      true,  3,  '2 par portion'),
    (v_recipe_id, 'bouillon dashi',           150, 'ml',         true,  4,  NULL),
    (v_recipe_id, 'mirin',                    105, 'ml',         true,  5,  NULL),
    (v_recipe_id, 'sauce soja',               45,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'riz cuit',                 450, 'g',          true,  7,  '3 bols, chaud'),
    (v_recipe_id, 'oignon vert',              2,   'unité',      false, 8,  'partie verte en julienne, garniture');

  RAISE NOTICE 'Seed: 8 RecipeTinEats Japan recipes inserted for user %', v_user_id;
END $$;
