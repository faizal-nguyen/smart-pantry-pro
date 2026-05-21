-- =====================================================================
-- Seed: 14 Vietnamese recipes from cooking-therapy.com (2026-05-20)
--
-- Sources fetched 2026-05-20 (WordPress blog, WebFetch OK) :
--    1. https://www.cooking-therapy.com/che-chuoi/
--    2. https://www.cooking-therapy.com/vietnamese-caramelized-lamb-chops/
--    3. https://www.cooking-therapy.com/goi-ga/
--    4. https://www.cooking-therapy.com/goi-ngo-sen-tom/
--    5. https://www.cooking-therapy.com/bun-bo-hue/
--    6. https://www.cooking-therapy.com/vietnamese-peanut-sauce/
--    7. https://www.cooking-therapy.com/bun-thang-vietnamese-chicken-noodle-soup/
--    8. https://www.cooking-therapy.com/ragu-ga/
--    9. https://www.cooking-therapy.com/chicken-pho/
--   10. https://www.cooking-therapy.com/vietnamese-lemongrass-chicken/
--   11. https://www.cooking-therapy.com/che-bap/
--   12. https://www.cooking-therapy.com/banh-beo/
--   13. https://www.cooking-therapy.com/banh-xeo/
--   14. https://www.cooking-therapy.com/vietnamese-pizza/
--
-- Note collisions :
--   - "Bún Bò Huế (Cooking Therapy)" coexiste avec "Bún Bò Huế (Bunbobae)".
--   - "Gỏi Gà" coexiste avec bunbobae's "Gà Bóp" (noms différents).
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-20-add-cooking-therapy.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Chè Chuối (Pudding Banane-Tapioca)',
    'Côtelettes d''Agneau Caramélisées Vietnamiennes',
    'Gỏi Gà (Salade de Poulet au Chou)',
    'Gỏi Ngó Sen Tôm (Salade Lotus-Crevettes)',
    'Bún Bò Huế (Cooking Therapy)',
    'Sauce Cacahuète Vietnamienne',
    'Bún Thang (Soupe de Poulet aux Vermicelles)',
    'Ragu Gà (Ragoût de Poulet Vietnamien)',
    'Chicken Phở (Phở Gà)',
    'Vietnamese Lemongrass Chicken',
    'Chè Bắp (Pudding au Maïs)',
    'Bánh Bèo (Galettes Vapeur)',
    'Bánh Xèo (Crêpe Vietnamienne)',
    'Vietnamese Pizza (Bánh Tráng Nướng)'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Chè Chuối (Pudding Banane-Tapioca)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chè Chuối (Pudding Banane-Tapioca)',
    'Dessert vietnamien traditionnel : perles de tapioca, crème de coco, bananes thaï et feuilles de pandan. Sans gluten, sans lactose, naturellement vegan.',
    $instr$["Tremper les perles de tapioca dans l'eau chaude 20 minutes.",
"Faire infuser les feuilles de pandan dans 2 tasses d'eau à frémissement 20 minutes.",
"Couper les bananes en tranches fines en diagonale, saupoudrer de 2 c. à café de sucre.",
"Égoutter les perles de tapioca et les ajouter à l'eau infusée au pandan.",
"Ajouter crème de coco, bananes, le reste du sucre et le sel ; porter à frémissement.",
"Mijoter en remuant doucement 10-15 minutes jusqu'à transparence du tapioca.",
"Concasser ensemble graines de sésame et cacahuètes grillées.",
"Retirer les feuilles de pandan et servir tiède garni du mélange grillé."]
$instr$,
    20, 10, 4, 2,
    'Vietnamienne', 'dessert',
    ARRAY['dessert vietnamien','tapioca','banane','sans gluten','vegan','coco','pandan'],
    'manual',
    'https://www.cooking-therapy.com/che-chuoi/',
    'https://www.cooking-therapy.com/wp-content/uploads/2024/08/Che-Chuoi-03.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'perles de tapioca',          65,  'g',          true,  1, 'environ 1/3 tasse'),
    (v_recipe_id, 'eau',                        480, 'ml',         true,  2, 'pour infusion pandan'),
    (v_recipe_id, 'feuilles de pandan',         4,   'unité',      true,  3, 'nouées'),
    (v_recipe_id, 'crème de coco',              385, 'ml',         true,  4, '1 boîte'),
    (v_recipe_id, 'bananes thaï',               5,   'unité',      true,  5, 'ou plantain mûr'),
    (v_recipe_id, 'sucre',                      60,  'g',          true,  6, 'divisé'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  7, NULL),
    (v_recipe_id, 'graines de sésame',          1,   'c. à soupe', false, 8, 'grillées, concassées'),
    (v_recipe_id, 'cacahuètes',                 2,   'c. à soupe', false, 9, 'grillées, concassées');

  -- =====================================================================
  -- 2. Côtelettes d'Agneau Caramélisées Vietnamiennes
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Côtelettes d''Agneau Caramélisées Vietnamiennes',
    'Côtelettes d''agneau marinées au nuoc-mam, sauce soja, miel et aromates puis saisies à la poêle et finies au four. Équilibre sucré-umami parfait pour les grandes occasions.',
    $instr$["Mélanger échalote, ail, nuoc-mam, sauce soja, miel, cassonade et huile d'olive dans un bol.",
"Verser la marinade dans un sac plastique, ajouter l'agneau et bien enrober ; mariner minimum 2 heures.",
"Préchauffer le four à 220°C.",
"Saisir les côtelettes à feu moyen-vif 2-3 minutes par face jusqu'à coloration dorée.",
"Transférer sur plaque et finir au four 5-7 minutes jusqu'à 130-135°C à cœur (saignant).",
"Laisser reposer 5 minutes hors du four.",
"Pendant ce temps, réduire la marinade dans une casserole avec beurre et jus de citron jusqu'à sauce nappante.",
"Napper les côtelettes de sauce, garnir de persil et servir."]
$instr$,
    15, 10, 4, 2,
    'Vietnamienne', 'dinner',
    ARRAY['agneau','vietnamien','caramel','nuoc-mam','rapide','occasion-spéciale','umami'],
    'manual',
    'https://www.cooking-therapy.com/vietnamese-caramelized-lamb-chops/',
    'https://www.cooking-therapy.com/wp-content/uploads/2026/01/Vietnamese-Caramelized-Lamb-Chops-11-728x1092.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'côtelettes d''agneau',       900, 'g',          true,  1,  'avec os'),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  2,  'hachée fin'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  3,  'hachée fin'),
    (v_recipe_id, 'nuoc-mam',                   30,  'ml',         true,  4,  'sauce de poisson'),
    (v_recipe_id, 'sauce soja',                 30,  'ml',         true,  5,  NULL),
    (v_recipe_id, 'miel',                       30,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'cassonade',                  30,  'ml',         true,  7,  'claire'),
    (v_recipe_id, 'huile d''olive',             30,  'ml',         true,  8,  NULL),
    (v_recipe_id, 'beurre',                     15,  'ml',         false, 9,  'pour la sauce, optionnel'),
    (v_recipe_id, 'jus de citron',              5,   'ml',         false, 10, 'pour la sauce, optionnel'),
    (v_recipe_id, 'persil frais',               30,  'ml',         false, 11, 'garniture');

  -- =====================================================================
  -- 3. Gỏi Gà (Salade de Poulet au Chou)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Gỏi Gà (Salade de Poulet au Chou)',
    'Salade vietnamienne savoureuse : poulet effiloché, chou émincé, carotte, rau ram et nuoc cham. Plat sain, sans gluten, prêt en 25 minutes.',
    $instr$["Faire bouillir la poitrine de poulet 20-25 minutes jusqu'à cuisson complète, refroidir puis effilocher.",
"Émincer le chou et les autres légumes pendant la cuisson du poulet.",
"Hacher finement la coriandre vietnamienne (rau ram).",
"Disposer le chou au fond d'une grande assiette, puis ajouter carotte, oignon rouge et rau ram.",
"Garnir avec les échalotes frites et le poulet effiloché.",
"Verser la sauce nuoc cham et bien mélanger l'ensemble.",
"Laisser reposer 10 minutes avant de servir pour que les saveurs se diffusent."]
$instr$,
    20, 5, 4, 1,
    'Vietnamienne', 'lunch',
    ARRAY['salade vietnamienne','poulet','rau ram','chou','sans gluten','léger','rapide'],
    'manual',
    'https://www.cooking-therapy.com/goi-ga/',
    'https://www.cooking-therapy.com/wp-content/uploads/2021/01/Goi-Ga-2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poitrine de poulet',         450, 'g',          true,  1, 'à effilocher'),
    (v_recipe_id, 'chou blanc',                 400, 'g',          true,  2, 'émincé, ~½ chou'),
    (v_recipe_id, 'carotte',                    1,   'unité',      true,  3, 'grosse, râpée'),
    (v_recipe_id, 'oignon rouge',               0.5, 'unité',      true,  4, 'tranché fin'),
    (v_recipe_id, 'rau ram',                    2,   'c. à soupe', true,  5, 'coriandre vietnamienne, hachée'),
    (v_recipe_id, 'échalotes frites',           2,   'c. à soupe', true,  6, NULL),
    (v_recipe_id, 'nuoc cham',                  3,   'c. à soupe', true,  7, 'sauce vietnamienne');

  -- =====================================================================
  -- 4. Gỏi Ngó Sen Tôm (Salade Lotus-Crevettes)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Gỏi Ngó Sen Tôm (Salade Lotus-Crevettes)',
    'Salade vietnamienne rafraîchissante : tiges de lotus marinées croquantes, crevettes tendres, herbes fraîches et nuoc cham. Souvent servie pour le Nouvel An lunaire (Tết).',
    $instr$["Faire bouillir les crevettes 2-3 minutes, refroidir au réfrigérateur.",
"Égoutter les tiges de lotus marinées du bocal, les couper en deux ou en quarts, les mettre dans un grand saladier.",
"Émincer finement l'oignon rouge, le tremper 1 minute dans l'eau froide, sécher et l'ajouter au saladier.",
"Décortiquer les crevettes refroidies et les incorporer.",
"Ajouter les cacahuètes et verser le nuoc cham.",
"Mélanger délicatement et laisser reposer 5 minutes.",
"Garnir d'échalotes frites juste avant de servir pour préserver le croquant.",
"Servir avec chips de crevettes (bánh phồng tôm) si désiré."]
$instr$,
    20, 10, 4, 2,
    'Vietnamienne', 'lunch',
    ARRAY['salade vietnamienne','crevettes','lotus','tết','sans gluten','apéritif','herbes-fraîches'],
    'manual',
    'https://www.cooking-therapy.com/goi-ngo-sen-tom/',
    'https://www.cooking-therapy.com/wp-content/uploads/2026/01/Goi-Ngo-Sen-Tom-floewr-plate-2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'crevettes',                  340, 'g',          true,  1, 'décortiquées'),
    (v_recipe_id, 'tiges de lotus marinées',    450, 'g',          true,  2, 'en bocal'),
    (v_recipe_id, 'oignon rouge',               80,  'ml',         true,  3, 'tranché fin'),
    (v_recipe_id, 'rau ram',                    80,  'ml',         true,  4, 'coriandre vietnamienne'),
    (v_recipe_id, 'cacahuètes',                 60,  'ml',         true,  5, 'non salées'),
    (v_recipe_id, 'nuoc cham',                  60,  'ml',         true,  6, NULL),
    (v_recipe_id, 'échalotes frites',           60,  'ml',         true,  7, 'garniture'),
    (v_recipe_id, 'chips de crevettes',         1,   'paquet',     false, 8, 'bánh phồng tôm, optionnel');

  -- =====================================================================
  -- 5. Bún Bò Huế (Cooking Therapy)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bún Bò Huế (Cooking Therapy)',
    'Version centrale-vietnamienne de la soupe de bœuf épicée : bouillon de paleron-jarrets-chuck à la citronnelle et roucou, garni de cha lua, herbes et nouilles épaisses.',
    $instr$["Blanchir le paleron, le chuck et les jarrets dans l'eau bouillante, rincer et jeter l'eau.",
"Faire sauter ail, poudre Bún Bò Huế et pâte de crevettes 30 secondes dans l'huile, puis ajouter la viande jusqu'à coloration.",
"Couvrir de 3 litres d'eau, porter à ébullition, écumer puis baisser le feu.",
"Ajouter jarrets de porc, oignon, daïkon et citronnelle ; mijoter 2-3 heures.",
"Retirer les viandes cuites, trancher finement le bœuf et réserver.",
"Ajouter sel, sauce de poisson, sucre et bouillon de poulet ; mijoter 15 minutes.",
"Préparer l'huile au roucou : chauffer 60 ml d'huile avec les graines 1-2 minutes, retirer les graines, ajouter piment, échalote, citronnelle et ail mincés.",
"Verser 15-30 ml d'huile épicée dans le bouillon, goûter et ajuster.",
"Cuire les nouilles séparément, rincer à l'eau froide, dresser dans bols.",
"Garnir de bœuf tranché, jarret de porc, herbes fraîches puis verser le bouillon chaud."]
$instr$,
    30, 195, 6, 4,
    'Vietnamienne', 'lunch',
    ARRAY['soupe vietnamienne','bœuf','épicée','citronnelle','huế','traditionnel','comfort-food'],
    'manual',
    'https://www.cooking-therapy.com/bun-bo-hue/',
    'https://www.cooking-therapy.com/wp-content/uploads/2023/10/Bun-Bo-Hue-Recipe-13.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'paleron de bœuf',            900, 'g',          true,  1,  'avec os'),
    (v_recipe_id, 'chuck de bœuf',              450, 'g',          true,  2,  NULL),
    (v_recipe_id, 'jarrets de boeuf',            900, 'g',          true,  3,  'en morceaux'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  4,  NULL),
    (v_recipe_id, 'poudre Bún Bò Huế',          45,  'ml',         true,  5,  NULL),
    (v_recipe_id, 'pâte de crevettes',          15,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'radis blanc (daïkon)',       1,   'unité',      true,  7,  'en morceaux'),
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  8,  NULL),
    (v_recipe_id, 'citronnelle',                2,   'tige',       true,  9,  'en tronçons 5 cm'),
    (v_recipe_id, 'sel',                        10,  'ml',         true,  10, NULL),
    (v_recipe_id, 'sauce de poisson',           30,  'ml',         true,  11, NULL),
    (v_recipe_id, 'sucre',                      15,  'ml',         true,  12, NULL),
    (v_recipe_id, 'bouillon de poulet',         430, 'ml',         true,  13, '1 boîte'),
    (v_recipe_id, 'graines de roucou',          10,  'ml',         true,  14, 'pour la couleur'),
    (v_recipe_id, 'huile végétale',             60,  'ml',         true,  15, NULL),
    (v_recipe_id, 'flocons de piment',          10,  'ml',         true,  16, NULL),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  17, 'hachée fin'),
    (v_recipe_id, 'citronnelle',                1,   'tige',       true,  18, 'hachée fin'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  19, 'hachée fin'),
    (v_recipe_id, 'nouilles de riz épaisses',   450, 'g',          true,  20, 'bún tươi'),
    (v_recipe_id, 'coriandre fraîche',          1,   'botte',      false, 21, 'garniture'),
    (v_recipe_id, 'oignons verts',              1,   'botte',      false, 22, 'garniture'),
    (v_recipe_id, 'germes de soja',             200, 'g',          false, 23, 'garniture'),
    (v_recipe_id, 'cha lua',                    200, 'g',          false, 24, 'charcuterie vietnamienne'),
    (v_recipe_id, 'menthe',                     1,   'botte',      false, 25, 'garniture'),
    (v_recipe_id, 'citron vert',                2,   'unité',      false, 26, 'en quartiers');

  -- =====================================================================
  -- 6. Sauce Cacahuète Vietnamienne
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Sauce Cacahuète Vietnamienne',
    'Sauce d''accompagnement classique pour rouleaux de printemps : beurre de cacahuète, sauce hoisin et ail. Prête en 5 minutes, vegan et sans lactose.',
    $instr$["Chauffer 15 ml d'huile à feu moyen et faire revenir l'ail 30 secondes.",
"Ajouter sauce hoisin et beurre de cacahuète, cuire 30 secondes supplémentaires en remuant.",
"Verser l'eau et porter à ébullition.",
"Mélanger la fécule de maïs avec 15 ml d'eau froide et l'incorporer à la sauce.",
"Laisser mijoter 1-2 minutes jusqu'à épaississement nappant.",
"Verser dans un bol et laisser refroidir 5 minutes.",
"Garnir d'arachides concassées avant de servir avec rouleaux de printemps ou nems."]
$instr$,
    2, 3, 4, 1,
    'Vietnamienne', 'snack',
    ARRAY['sauce vietnamienne','arachides','hoisin','rouleaux-de-printemps','vegan','rapide','5-minutes'],
    'manual',
    'https://www.cooking-therapy.com/vietnamese-peanut-sauce/',
    'https://www.cooking-therapy.com/wp-content/uploads/2023/03/Vietnamese-Peanut-Sauce-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  1, 'hachée fin'),
    (v_recipe_id, 'sauce hoisin',               60,  'ml',         true,  2, NULL),
    (v_recipe_id, 'beurre de cacahuète',        15,  'ml',         true,  3, 'crémeux ou croquant'),
    (v_recipe_id, 'eau',                        250, 'ml',         true,  4, NULL),
    (v_recipe_id, 'fécule de maïs',             5,   'ml',         true,  5, 'ou tapioca'),
    (v_recipe_id, 'arachides rôties',           15,  'ml',         false, 6, 'concassées, garniture');

  -- =====================================================================
  -- 7. Bún Thang (Soupe de Poulet aux Vermicelles)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bún Thang (Soupe de Poulet aux Vermicelles)',
    'Soupe vietnamienne hanoïenne réconfortante : bouillon de poulet long-mijoté, vermicelles de riz, cha lua tranché, omelette en lanières et rau ram.',
    $instr$["Tremper les crevettes séchées dans l'eau froide 10 minutes.",
"Placer le poulet dans une cocotte, couvrir d'eau, porter à ébullition et écumer.",
"Ajouter oignon, sel et crevettes séchées ; mijoter 30 minutes à feu doux.",
"Retirer le poulet, l'effilocher ; remettre les os dans le bouillon.",
"Verser le bouillon supplémentaire et continuer à mijoter 2 heures.",
"Préparer les garnitures : trancher le cha lua, fouetter les œufs en fines crêpes puis les couper en lanières, ciseler les herbes.",
"Cuire les vermicelles 2-3 minutes dans l'eau bouillante, égoutter.",
"Dans chaque bol, dresser une poignée de vermicelles, ajouter cha lua, omelette, poulet effiloché, herbes.",
"Verser le bouillon chaud, assaisonner avec sauce de poisson et poivre, ajouter pâte de crevettes optionnelle."]
$instr$,
    30, 150, 6, 3,
    'Vietnamienne', 'lunch',
    ARRAY['soupe vietnamienne','poulet','vermicelles','hanoï','traditionnel','cha lua','comfort-food'],
    'manual',
    'https://www.cooking-therapy.com/bun-thang-vietnamese-chicken-noodle-soup/',
    'https://www.cooking-therapy.com/wp-content/uploads/2018/06/Bun-Thang-7.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet entier',              2000,'g',          true,  1,  'pour le bouillon'),
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'crevettes séchées',          2,   'c. à soupe', true,  3,  'réhydratées'),
    (v_recipe_id, 'sel',                        2,   'c. à café',  true,  4,  'au goût'),
    (v_recipe_id, 'bouillon de poulet',         430, 'ml',         true,  5,  '1 boîte supplémentaire'),
    (v_recipe_id, 'vermicelles de riz',         2000,'g',          true,  6,  'cuits'),
    (v_recipe_id, 'cha lua',                    1,   'unité',      true,  7,  'rouleau, charcuterie viet'),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  8,  'pour omelette fine'),
    (v_recipe_id, 'rau ram',                    50,  'g',          true,  9,  'environ ½ tasse, hachée'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  10, 'finement hachés'),
    (v_recipe_id, 'sauce de poisson',           1,   'c. à soupe', true,  11, 'au goût'),
    (v_recipe_id, 'poivre',                     1,   'pincée',     true,  12, 'au goût');

  -- =====================================================================
  -- 8. Ragu Gà (Ragoût de Poulet Vietnamien)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Ragu Gà (Ragoût de Poulet Vietnamien)',
    'Ragoût fusion franco-vietnamien : cuisses de poulet mijotées avec cannelle, sauce de poisson, carottes, pommes de terre et champignons cremini. Servi avec baguette ou riz.',
    $instr$["Mariner le poulet dans sauce de poisson et poivre 15 minutes. Découper pendant ce temps les légumes.",
"Chauffer 1 c. à soupe d'huile dans une cocotte ; saisir le poulet de tous côtés. Réserver le poulet ET la marinade.",
"Faire cuire l'oignon 2-3 minutes jusqu'à coloration. Ajouter ail et sel, cuire 30 secondes.",
"Incorporer cannelle, pâte de tomate et la marinade réservée ; bien mélanger.",
"Remettre le poulet, enrober de sauce, couvrir et cuire à feu moyen-doux 10 minutes.",
"Verser le bouillon, ajouter laurier, carottes et pommes de terre ; couvrir et cuire 10-15 minutes.",
"Ajouter les champignons et cuire 5-10 minutes jusqu'à tendreté.",
"Goûter et ajuster en sel ; servir avec baguette ou riz."]
$instr$,
    15, 45, 4, 2,
    'Vietnamienne', 'dinner',
    ARRAY['poulet','ragoût','vietnamien','fusion','champignons','nuoc-mam','réconfortant'],
    'manual',
    'https://www.cooking-therapy.com/ragu-ga/',
    'https://www.cooking-therapy.com/wp-content/uploads/2022/11/Ragu-Ga-01-683x1024.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',          1100,'g',          true,  1,  'avec os et peau'),
    (v_recipe_id, 'sauce de poisson',           3,   'c. à soupe', true,  2,  'nuoc-mam'),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  4,  'en morceaux'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  5,  'haché'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'cannelle moulue',            0.5, 'c. à café',  true,  7,  'vietnamienne si possible'),
    (v_recipe_id, 'pâte de tomate',             3,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'feuilles de laurier',        2,   'unité',      true,  9,  NULL),
    (v_recipe_id, 'bouillon de poulet',         430, 'ml',         true,  10, 'pauvre en sodium'),
    (v_recipe_id, 'carottes',                   3,   'unité',      true,  11, 'en morceaux de 2,5 cm'),
    (v_recipe_id, 'pommes de terre russet',     450, 'g',          true,  12, 'pelées, en morceaux'),
    (v_recipe_id, 'champignons cremini',        280, 'g',          true,  13, 'tranchés fin');

  -- =====================================================================
  -- 9. Chicken Phở (Phở Gà)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Phở (Phở Gà)',
    'Soupe vietnamienne classique au poulet : bouillon long-mijoté à l''oignon et gingembre grillés, épices toastées (coriandre, fenouil), nouilles de riz fraîches et poulet effiloché.',
    $instr$["Tremper les pétoncles séchés (optionnel) 10 minutes dans l'eau froide.",
"Préchauffer le four en mode gril ; griller l'oignon et le gingembre 10-15 minutes jusqu'à caramélisation.",
"Toaster les graines de coriandre et de fenouil 1-3 minutes à sec, puis les envelopper dans une mousseline.",
"Blanchir le poulet : couvrir d'eau, porter à ébullition, jeter l'eau de nettoyage.",
"Remettre le poulet dans un grand pot avec eau propre, oignon rôti, gingembre, pétoncles et sachet d'épices. Bouillir puis mijoter 30 minutes.",
"Retirer le poulet, refroidir, effilocher ; remettre les os dans le bouillon ; ajouter le bouillon supplémentaire et mijoter 2h30.",
"Tamiser le bouillon à travers une passoire fine pour le clarifier.",
"Cuire les nouilles fraîches 2-3 minutes (5-10 si sèches) dans l'eau bouillante.",
"Dresser dans bols : nouilles, poulet effiloché, oignons verts, coriandre, échalotes frites.",
"Verser le bouillon chaud, assaisonner avec sauce de poisson et servir."]
$instr$,
    30, 180, 4, 3,
    'Vietnamienne', 'lunch',
    ARRAY['phở','poulet','vietnamien','bouillon','nouilles de riz','traditionnel','soupe'],
    'manual',
    'https://www.cooking-therapy.com/chicken-pho/',
    'https://www.cooking-therapy.com/wp-content/uploads/2020/08/Chicken-Pho-8-1-scaled.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  1,  'grillé'),
    (v_recipe_id, 'gingembre',                  1,   'unité',      true,  2,  'racine, grillée'),
    (v_recipe_id, 'graines de coriandre',       2,   'c. à café',  true,  3,  'grillées'),
    (v_recipe_id, 'graines de fenouil',         2,   'c. à café',  true,  4,  'grillées'),
    (v_recipe_id, 'poulet entier',              750, 'g',          true,  5,  'avec os'),
    (v_recipe_id, 'radis blanc (daïkon)',       1,   'unité',      true,  6,  'tranché'),
    (v_recipe_id, 'sel',                        2,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'bouillon de poulet',         240, 'ml',         true,  8,  'pauvre en sodium'),
    (v_recipe_id, 'pétoncles séchés',           5,   'unité',      false, 9,  'optionnel, umami'),
    (v_recipe_id, 'nouilles phở fraîches',      1,   'paquet',     true,  10, NULL),
    (v_recipe_id, 'oignons verts',              2,   'tige',       false, 11, 'garniture'),
    (v_recipe_id, 'coriandre fraîche',          2,   'c. à soupe', false, 12, 'hachée, garniture'),
    (v_recipe_id, 'échalotes frites',           60,  'ml',         false, 13, 'garniture'),
    (v_recipe_id, 'sauce de poisson',           1,   'c. à soupe', false, 14, 'au goût');

  -- =====================================================================
  -- 10. Vietnamese Lemongrass Chicken
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Vietnamese Lemongrass Chicken',
    'Cuisses de poulet marinées à la citronnelle, sauce soja, sauce d''huître et sauce de poisson. Saisies à la poêle pour une peau croustillante puis finies au four pour une viande juteuse.',
    $instr$["Préparer la marinade en mélangeant ail, échalote, citronnelle, sauce de poisson, sauce d'huître, sauce soja, miel et cassonade.",
"Ajouter les cuisses de poulet à la marinade, enrober complètement et laisser reposer minimum 15 minutes (idéalement 1 heure) au frigo.",
"Préchauffer le four à 218°C.",
"Chauffer une poêle en fonte à feu vif. Saisir les cuisses 1-2 minutes par face jusqu'à peau dorée.",
"Transférer le poulet sur une plaque et enfourner 25-30 minutes jusqu'à 74°C à cœur.",
"Laisser reposer 5 minutes avant de servir.",
"Servir avec riz blanc ou riz brisé, légumes frais et œuf frit en garniture."]
$instr$,
    15, 25, 2, 2,
    'Vietnamienne', 'dinner',
    ARRAY['citronnelle','poulet vietnamien','rapide','30-minutes','sauce-poisson','riz','four'],
    'manual',
    'https://www.cooking-therapy.com/vietnamese-lemongrass-chicken/',
    'https://www.cooking-therapy.com/wp-content/uploads/2020/09/Vietnamese-Lemongrass-Chicken-3.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  1,  'haché'),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  2,  'hachée'),
    (v_recipe_id, 'citronnelle',                2,   'tige',       true,  3,  'hachée fin'),
    (v_recipe_id, 'sauce de poisson',           2,   'c. à soupe', true,  4,  'vietnamienne'),
    (v_recipe_id, 'sauce d''huître',            1,   'c. à soupe', false, 5,  'optionnelle'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  6,  'ou tamari'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  7,  'arachide ou tournesol'),
    (v_recipe_id, 'miel',                       1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'cassonade',                  1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'cuisses de poulet',          900, 'g',          true,  10, 'os et peau');

  -- =====================================================================
  -- 11. Chè Bắp (Pudding au Maïs)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chè Bắp (Pudding au Maïs)',
    'Dessert vietnamien crémeux et chaleureux : riz gluant cuit avec maïs frais, lait de coco et pandan. Servi tiède avec une sauce coco supplémentaire.',
    $instr$["Égrener les 4 épis de maïs en tranchant les grains ; conserver les épis vides.",
"Mettre les épis dans un grand pot avec 4 tasses d'eau, couvrir et mijoter 30 minutes.",
"Pendant ce temps, rincer le riz gluant 4-5 fois jusqu'à eau claire.",
"Retirer les épis du bouillon. Ajouter riz, lait de coco, feuilles de pandan nouées et grains de maïs ; mijoter 15-20 minutes.",
"Retirer du feu, ajouter sucre et sel, bien mélanger.",
"Pour la sauce : mijoter doucement lait de coco, sucre et sel dans une casserole.",
"Mélanger fécule de maïs et eau froide, incorporer à la sauce et retirer du feu.",
"Verser le pudding dans des bols et garnir de sauce coco ; servir chaud ou tiède."]
$instr$,
    10, 50, 6, 2,
    'Vietnamienne', 'dessert',
    ARRAY['dessert vietnamien','riz gluant','maïs','coco','pandan','traditionnel','été'],
    'manual',
    'https://www.cooking-therapy.com/che-bap/',
    'https://www.cooking-therapy.com/wp-content/uploads/2025/04/Che-Bap-3.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'maïs frais',                 4,   'unité',      true,  1,  'avec les épis'),
    (v_recipe_id, 'eau',                        960, 'ml',         true,  2,  '4 tasses'),
    (v_recipe_id, 'riz gluant',                 150, 'g',          true,  3,  'environ 3/4 tasse'),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  4,  'pour le pudding'),
    (v_recipe_id, 'feuilles de pandan',         4,   'unité',      true,  5,  'nouées'),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'sucre',                      50,  'g',          true,  7,  'pour le pudding'),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  8,  'pour la sauce'),
    (v_recipe_id, 'sucre',                      2,   'c. à soupe', true,  9,  'pour la sauce'),
    (v_recipe_id, 'fécule de maïs',             2,   'c. à café',  true,  10, 'épaississant');

  -- =====================================================================
  -- 12. Bánh Bèo (Galettes Vapeur)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bánh Bèo (Galettes Vapeur)',
    'Petites galettes de riz cuites à la vapeur dans de minuscules bols individuels, garnies de crevettes séchées concassées et d''huile d''oignon vert. Spécialité huéenne servie avec nuoc cham.',
    $instr$["Mélanger farine de riz, farine de tapioca et sel dans un grand bol, ajouter eau et huile en remuant.",
"Faire tremper les crevettes séchées 10 minutes, sécher puis mixer finement au robot.",
"Chauffer l'huile à feu moyen-vif jusqu'à frémissement, ajouter les crevettes et cuire 3-5 minutes en remuant.",
"Filtrer à travers une passoire et égoutter les crevettes sur papier absorbant.",
"Mettre les oignons verts hachés dans un bol et verser l'huile chaude par-dessus pour créer l'huile d'oignon.",
"Remplir aux trois quarts de petits bols individuels avec la pâte et cuire à la vapeur 5 minutes couvercle légèrement ouvert.",
"Laisser refroidir 5-10 minutes, garnir chaque galette de crevettes frites et d'huile d'oignon.",
"Servir en versant un peu de nuoc cham sur chaque galette."]
$instr$,
    30, 90, 6, 3,
    'Vietnamienne', 'snack',
    ARRAY['vietnamien','huế','vapeur','crevettes séchées','farine de riz','apéritif','traditionnel'],
    'manual',
    'https://www.cooking-therapy.com/banh-beo/',
    'https://www.cooking-therapy.com/wp-content/uploads/2018/09/Banh-Beo-5.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'farine de riz',              260, 'g',          true,  1,  'fine, environ 2 tasses'),
    (v_recipe_id, 'farine de tapioca',          2,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  3,  'de mer'),
    (v_recipe_id, 'eau',                        960, 'ml',         true,  4,  '4 tasses'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  5,  'pour la pâte'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  6,  'pour les crevettes'),
    (v_recipe_id, 'crevettes séchées',          75,  'g',          true,  7,  'environ 1/2 tasse'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  8,  'hachés'),
    (v_recipe_id, 'huile végétale',             60,  'ml',         true,  9,  'chauffée, pour oignon'),
    (v_recipe_id, 'nuoc cham',                  120, 'ml',         true,  10, 'sauce d''accompagnement');

  -- =====================================================================
  -- 13. Bánh Xèo (Crêpe Vietnamienne)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bánh Xèo (Crêpe Vietnamienne)',
    'Grande crêpe vietnamienne croustillante au curcuma, garnie de porc, crevettes et germes de soja. Servie enroulée dans une feuille de laitue avec herbes et nuoc cham.',
    $instr$["Mélanger farine de riz, fécule de maïs, curcuma, lait de coco, bière, œuf, eau et sel ; laisser reposer minimum 3 heures (idéalement une nuit) au frigo.",
"Faire bouillir l'épaule de porc 30 minutes, puis trancher finement et réserver.",
"Cuire les haricots mungo dans 1 tasse d'eau bouillante 10 minutes jusqu'à ramollissement.",
"Avant de cuire les crêpes, incorporer les oignons verts hachés à la pâte.",
"Dans une poêle antiadhésive de 20 cm, ajouter oignons et crevettes, sauter 1 minute.",
"Ajouter le porc tranché et 1 c. à soupe d'huile chaude, puis verser une louche de pâte en mouvements circulaires pour couvrir le fond.",
"Répartir haricots mungo et germes de soja sur une moitié ; couvrir et cuire ~3 minutes jusqu'à très croustillant.",
"Plier la crêpe en deux et glisser sur l'assiette ; répéter jusqu'à épuisement des garnitures.",
"Nettoyer la poêle au papier essuie-tout toutes les 2 crêpes pour préserver le croustillant.",
"Servir avec laitue fraîche, concombre, menthe et nuoc cham."]
$instr$,
    180, 30, 12, 3,
    'Vietnamienne', 'lunch',
    ARRAY['crêpe vietnamienne','porc','crevettes','curcuma','fusion','traditionnel','festif'],
    'manual',
    'https://www.cooking-therapy.com/banh-xeo/',
    'https://www.cooking-therapy.com/wp-content/uploads/2020/05/Banh-Xeo-8-scaled.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'farine de riz',              130, 'g',          true,  1,  'blanche, non gluante'),
    (v_recipe_id, 'fécule de maïs',             30,  'g',          true,  2,  'pour le croustillant'),
    (v_recipe_id, 'curcuma moulu',              0.5, 'c. à café',  true,  3,  'pour la couleur'),
    (v_recipe_id, 'lait de coco',               60,  'ml',         true,  4,  NULL),
    (v_recipe_id, 'bouillon',                      2,   'c. à soupe', false, 5,  'optionnelle, sinon eau'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  7,  NULL),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  9,  'hachés fin'),
    (v_recipe_id, 'épaule de boeuf',             340, 'g',          true,  10, 'tranchée fin'),
    (v_recipe_id, 'haricots mungo',             60,  'ml',         false, 11, 'optionnel'),
    (v_recipe_id, 'crevettes',                  340, 'g',          true,  12, 'petites ou moyennes'),
    (v_recipe_id, 'germes de soja',             60,  'ml',         false, 13, 'optionnel'),
    (v_recipe_id, 'laitue',                     1,   'unité',      true,  14, 'pour servir'),
    (v_recipe_id, 'menthe fraîche',             1,   'botte',      true,  15, 'pour servir'),
    (v_recipe_id, 'nuoc cham',                  120, 'ml',         true,  16, 'sauce');

  -- =====================================================================
  -- 14. Vietnamese Pizza (Bánh Tráng Nướng)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Vietnamese Pizza (Bánh Tráng Nướng)',
    'Street food de Da Lat : papier de riz comme base, œuf en guise de sauce, garni de porc haché, mayonnaise Kewpie, sriracha et échalotes frites. Croustillant et savoureux.',
    $instr$["Mélanger porc haché, sel, poivre, sucre et sauce de poisson, puis cuire à feu moyen-vif jusqu'à cuisson complète.",
"Chauffer l'huile végétale 1-2 minutes, verser sur les oignons verts hachés pour créer l'huile d'oignon.",
"Fouetter les œufs dans un bol et préparer tous les ingrédients à proximité.",
"Chauffer un gril ou une grande poêle à feu vif.",
"Mouiller légèrement un côté d'un papier de riz, presser un second papier dessus et placer sur le gril.",
"Aplatir avec le dos d'une cuillère en mouvement circulaire pour éliminer les bulles d'air.",
"Cuire jusqu'à ce que le papier devienne blanc opaque, ajouter 2-3 cuillères d'huile d'oignon.",
"Verser 2-3 cuillères d'œuf battu sur le papier et cuire 10 secondes jusqu'à légère solidification.",
"Ajouter 2-3 cuillères de porc, retirer du feu, garnir de sriracha, mayonnaise Kewpie et échalotes frites.",
"Plier en deux et servir immédiatement ; répéter jusqu'à épuisement des ingrédients."]
$instr$,
    30, 30, 4, 2,
    'Vietnamienne', 'snack',
    ARRAY['pizza vietnamienne','papier de riz','street-food','porc','œuf','sriracha','rapide'],
    'manual',
    'https://www.cooking-therapy.com/vietnamese-pizza/',
    'https://www.cooking-therapy.com/wp-content/uploads/2020/06/Vietnamese-Pizza-3-scaled.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'boeuf hache',                 250, 'g',          true,  1,  'garniture principale'),
    (v_recipe_id, 'sel',                        2.5, 'ml',         true,  2,  NULL),
    (v_recipe_id, 'poivre blanc',               1.25,'ml',         true,  3,  NULL),
    (v_recipe_id, 'sucre',                      2.5, 'ml',         true,  4,  NULL),
    (v_recipe_id, 'sauce de poisson',           5,   'ml',         true,  5,  NULL),
    (v_recipe_id, 'huile végétale',             120, 'ml',         true,  6,  'pour huile d''oignon'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  7,  'hachés fin'),
    (v_recipe_id, 'papier de riz',              8,   'unité',      true,  8,  'rondes, base'),
    (v_recipe_id, 'œufs',                       3,   'unité',      true,  9,  'fouettés'),
    (v_recipe_id, 'échalotes frites',           60,  'ml',         true,  10, 'garniture'),
    (v_recipe_id, 'sriracha',                   60,  'ml',         true,  11, NULL),
    (v_recipe_id, 'mayonnaise Kewpie',          60,  'ml',         true,  12, 'japonaise');

END $$;
