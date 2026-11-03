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
    'Dessert vietnamien traditionnel : perles de tapioca, crème de coco, petites bananes thaïes et feuilles de pandan. Sans gluten, sans lactose et naturellement végétalien.',
    $instr$["Faire tremper les perles de tapioca 20 minutes dans de l'eau chaude.",
"Faire infuser les feuilles de pandan nouées 20 minutes dans les 480 ml d'eau frémissante.",
"Couper les bananes en fines tranches en biais et les saupoudrer de 2 c. à café de sucre.",
"Égoutter les perles de tapioca et les ajouter à l'eau infusée au pandan.",
"Ajouter la crème de coco, les bananes, le reste du sucre et le sel ; porter à frémissement.",
"Laisser mijoter 10 à 15 minutes en remuant doucement, jusqu'à ce que le tapioca devienne translucide.",
"Concasser ensemble les graines de sésame et les cacahuètes grillées.",
"Retirer les feuilles de pandan et servir tiède, parsemé du mélange sésame-cacahuètes."]
$instr$,
    20, 35, 4, 2,
    'Vietnamienne', 'dessert',
    ARRAY['dessert vietnamien','tapioca','banane','sans gluten','vegan','coco','pandan'],
    'manual',
    'https://www.cooking-therapy.com/che-chuoi/',
    'https://www.cooking-therapy.com/wp-content/uploads/2024/08/Che-Chuoi-03.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'perles de tapioca',          65,  'g',          true,  1, 'petites'),
    (v_recipe_id, 'eau',                        480, 'ml',         true,  2, 'pour l''infusion du pandan'),
    (v_recipe_id, 'feuilles de pandan',         4,   'unité',      true,  3, 'nouées'),
    (v_recipe_id, 'crème de coco',              385, 'ml',         true,  4, '1 boîte'),
    (v_recipe_id, 'bananes',                    5,   'unité',      true,  5, 'petites bananes thaïes, ou plantains bien mûrs'),
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
    'Côtelettes d''agneau marinées à la sauce de poisson, à la sauce soja, au miel et aux aromates, saisies à la poêle puis finies au four. Un équilibre sucré-umami parfait pour les grandes occasions.',
    $instr$["Mélanger l'échalote, l'ail, la sauce de poisson, la sauce soja, le miel, la cassonade et l'huile d'olive dans un bol.",
"Verser la marinade dans un sac de congélation, ajouter les côtelettes et bien les enrober ; laisser mariner au moins 2 heures au réfrigérateur.",
"Préchauffer le four à 220°C.",
"Égoutter les côtelettes en réservant la marinade, puis les saisir à feu moyen-vif 2 à 3 minutes par face, jusqu'à ce qu'elles soient bien dorées.",
"Les transférer sur une plaque et terminer au four 5 à 7 minutes, jusqu'à 54-57°C à cœur pour une cuisson saignante.",
"Laisser reposer 5 minutes hors du four.",
"Pendant ce temps, faire bouillir puis réduire la marinade réservée dans une casserole avec le beurre et le jus de citron, jusqu'à obtenir une sauce nappante.",
"Napper les côtelettes de sauce, parsemer de persil et servir."]
$instr$,
    15, 15, 4, 2,
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
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  2,  'hachée finement'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  3,  'haché finement'),
    (v_recipe_id, 'sauce de poisson',           2,   'c. à soupe', true,  4,  'nuoc-mâm'),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'miel',                       2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'cassonade',                  2,   'c. à soupe', true,  7,  'blonde'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'beurre',                     15,  'g',          false, 9,  'pour la sauce, optionnel'),
    (v_recipe_id, 'jus de citron',              1,   'c. à café',  false, 10, 'pour la sauce, optionnel'),
    (v_recipe_id, 'persil frais',               2,   'c. à soupe', false, 11, 'haché, pour garnir');

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
    'Salade vietnamienne savoureuse : poulet effiloché, chou émincé, carotte, rau ram et nuoc cham. Un plat léger et sans gluten.',
    $instr$["Faire bouillir la poitrine de poulet 20 à 25 minutes jusqu'à cuisson complète, la laisser refroidir puis l'effilocher.",
"Pendant la cuisson du poulet, émincer finement le chou, râper la carotte et trancher finement l'oignon rouge.",
"Hacher finement le rau ram (coriandre vietnamienne).",
"Disposer le chou au fond d'un grand plat, puis ajouter la carotte, l'oignon rouge et le rau ram.",
"Ajouter le poulet effiloché et parsemer d'échalotes frites.",
"Verser le nuoc cham et bien mélanger le tout.",
"Laisser reposer 10 minutes avant de servir pour que les saveurs se mélangent."]
$instr$,
    20, 25, 4, 1,
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
    (v_recipe_id, 'chou blanc',                 400, 'g',          true,  2, 'émincé, environ ½ chou'),
    (v_recipe_id, 'carotte',                    1,   'unité',      true,  3, 'grosse, râpée'),
    (v_recipe_id, 'oignon rouge',               0.5, 'unité',      true,  4, 'tranché finement'),
    (v_recipe_id, 'rau ram',                    2,   'c. à soupe', true,  5, 'coriandre vietnamienne, hachée'),
    (v_recipe_id, 'échalotes frites',           2,   'c. à soupe', false, 6, 'pour garnir'),
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
    $instr$["Faire bouillir les crevettes 2 à 3 minutes, puis les laisser refroidir au réfrigérateur.",
"Égoutter les tiges de lotus marinées, les couper en deux ou en quatre dans la longueur et les mettre dans un grand saladier.",
"Émincer finement l'oignon rouge, le tremper 1 minute dans l'eau froide, l'égoutter, le sécher et l'ajouter au saladier.",
"Décortiquer les crevettes refroidies et les incorporer.",
"Ajouter le rau ram haché et les cacahuètes, puis verser le nuoc cham.",
"Mélanger délicatement et laisser reposer 5 minutes.",
"Parsemer d'échalotes frites juste avant de servir pour qu'elles restent croustillantes.",
"Servir avec des chips de crevettes (bánh phồng tôm) si désiré."]
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
    (v_recipe_id, 'crevettes',                  340, 'g',          true,  1, 'crues, décortiquées après cuisson'),
    (v_recipe_id, 'tiges de lotus marinées',    450, 'g',          true,  2, 'en bocal'),
    (v_recipe_id, 'oignon rouge',               0.5, 'unité',      true,  3, 'émincé finement'),
    (v_recipe_id, 'rau ram',                    10,  'g',          true,  4, 'coriandre vietnamienne, hachée'),
    (v_recipe_id, 'cacahuètes',                 35,  'g',          true,  5, 'grillées, non salées'),
    (v_recipe_id, 'nuoc cham',                  60,  'ml',         true,  6, NULL),
    (v_recipe_id, 'échalotes frites',           4,   'c. à soupe', false, 7, 'pour garnir'),
    (v_recipe_id, 'chips de crevettes',         100, 'g',          false, 8, 'bánh phồng tôm, pour servir, optionnel');

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
    'Soupe de bœuf épicée de Huế, au centre du Vietnam : bouillon de jarret et de paleron parfumé à la citronnelle et au roucou, servi avec des nouilles de riz épaisses, du chả bò et des herbes fraîches.',
    $instr$["Blanchir le jarret et le paleron 5 minutes dans l'eau bouillante, rincer la viande et jeter l'eau.",
"Dans une grande marmite, faire revenir 30 secondes l'ail, l'assaisonnement bún bò huế et la pâte de crevettes dans 1 c. à soupe d'huile, puis ajouter la viande et la faire colorer.",
"Couvrir de 3 l d'eau, porter à ébullition, écumer puis baisser le feu.",
"Ajouter l'oignon, le daïkon et la citronnelle ; laisser mijoter 2 à 3 heures.",
"Retirer les viandes cuites, trancher finement le bœuf et réserver.",
"Ajouter le sel, la sauce de poisson, le sucre et le bouillon de poulet ; laisser mijoter 15 minutes.",
"Préparer l'huile pimentée au roucou : chauffer 60 ml d'huile avec les graines de roucou 1 à 2 minutes, retirer les graines, puis ajouter les flocons de piment, l'échalote, la citronnelle et l'ail hachés ainsi que le sel.",
"Verser 1 à 2 c. à soupe d'huile pimentée dans le bouillon, goûter et rectifier l'assaisonnement.",
"Cuire les nouilles séparément, les rincer à l'eau froide et les répartir dans les bols.",
"Garnir de bœuf tranché, de chả bò, de coriandre et d'oignons verts, puis verser le bouillon bien chaud ; servir avec les germes de soja, la menthe et les quartiers de citron vert."]
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
    -- Bouillon
    (v_recipe_id, 'jarret de bœuf',             1800,'g',          true,  1,  'avec os, en morceaux'),
    (v_recipe_id, 'paleron de bœuf',            450, 'g',          true,  2,  NULL),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  3,  NULL),
    (v_recipe_id, 'assaisonnement bún bò huế',  3,   'c. à soupe', true,  4,  'mélange d''épices en poudre'),
    (v_recipe_id, 'pâte de crevettes',          1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  6,  'pour faire revenir'),
    (v_recipe_id, 'eau',                        3,   'l',          true,  7,  NULL),
    (v_recipe_id, 'daïkon',                     1,   'unité',      true,  8,  'en morceaux'),
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  9,  NULL),
    (v_recipe_id, 'citronnelle',                2,   'tige',       true,  10, 'en tronçons de 5 cm'),
    (v_recipe_id, 'sel',                        2,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'sauce de poisson',           2,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'bouillon de poulet',         430, 'ml',         true,  14, '1 boîte'),
    -- Huile pimentée
    (v_recipe_id, 'graines de roucou',          2,   'c. à café',  true,  15, 'pour la couleur'),
    (v_recipe_id, 'huile végétale',             60,  'ml',         true,  16, 'pour l''huile pimentée'),
    (v_recipe_id, 'flocons de piment',          2,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  18, 'hachée finement'),
    (v_recipe_id, 'citronnelle',                1,   'tige',       true,  19, 'hachée finement'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  20, 'haché finement'),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  21, 'pour l''huile pimentée'),
    -- Service
    (v_recipe_id, 'nouilles de riz épaisses',   450, 'g',          true,  22, 'bún sợi to, 1 paquet'),
    (v_recipe_id, 'chả bò',                     200, 'g',          false, 23, 'pâté vietnamien au bœuf, tranché finement, optionnel'),
    (v_recipe_id, 'coriandre fraîche',          4,   'c. à soupe', false, 24, 'hachée'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       false, 25, 'émincés'),
    (v_recipe_id, 'germes de soja',             100, 'g',          false, 26, NULL),
    (v_recipe_id, 'menthe fraîche',             1,   'botte',      false, 27, 'au goût'),
    (v_recipe_id, 'citron vert',                2,   'unité',      false, 28, 'en quartiers');

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
    'Sauce d''accompagnement classique des rouleaux de printemps : beurre de cacahuète, sauce hoisin et ail. Prête en 5 minutes, végétalienne et sans lactose.',
    $instr$["Chauffer l'huile à feu moyen et faire revenir l'ail 30 secondes.",
"Ajouter la sauce hoisin et le beurre de cacahuète, puis cuire encore 30 secondes en remuant.",
"Verser l'eau et porter à ébullition.",
"Délayer la fécule de maïs dans 1 c. à soupe d'eau froide et l'incorporer à la sauce.",
"Laisser mijoter 1 à 2 minutes, jusqu'à ce que la sauce épaississe et devienne nappante.",
"Verser dans un bol et laisser refroidir 5 minutes.",
"Parsemer de cacahuètes concassées et servir avec des rouleaux de printemps ou des nems."]
$instr$,
    2, 3, 4, 1,
    'Vietnamienne', 'snack',
    ARRAY['sauce vietnamienne','cacahuètes','hoisin','rouleaux-de-printemps','vegan','rapide','5-minutes'],
    'manual',
    'https://www.cooking-therapy.com/vietnamese-peanut-sauce/',
    'https://www.cooking-therapy.com/wp-content/uploads/2023/03/Vietnamese-Peanut-Sauce-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  1, NULL),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  2, 'haché finement'),
    (v_recipe_id, 'sauce hoisin',               60,  'ml',         true,  3, NULL),
    (v_recipe_id, 'beurre de cacahuète',        1,   'c. à soupe', true,  4, 'crémeux ou croquant'),
    (v_recipe_id, 'eau',                        250, 'ml',         true,  5, NULL),
    (v_recipe_id, 'fécule de maïs',             1,   'c. à café',  true,  6, 'ou fécule de tapioca'),
    (v_recipe_id, 'eau',                        1,   'c. à soupe', true,  7, 'froide, pour délayer la fécule'),
    (v_recipe_id, 'cacahuètes',                 1,   'c. à soupe', false, 8, 'grillées, concassées, pour garnir');

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
    'Soupe hanoïenne réconfortante : bouillon de poulet longuement mijoté, vermicelles de riz, giò gà (pâté vietnamien au poulet) tranché, omelette en lanières et rau ram.',
    $instr$["Faire tremper les crevettes séchées 10 minutes dans l'eau froide.",
"Mettre le poulet dans une marmite, le couvrir d'eau, porter à ébullition et écumer.",
"Ajouter l'oignon, le sel et les crevettes séchées égouttées ; laisser mijoter 30 minutes à feu doux.",
"Retirer le poulet et l'effilocher ; remettre les os dans le bouillon.",
"Ajouter le bouillon de poulet et poursuivre la cuisson à petits frémissements pendant 2 heures.",
"Préparer les garnitures : couper le giò gà en lanières ; battre les œufs, les cuire en crêpes très fines dans une poêle légèrement huilée, puis les couper en lanières ; ciseler les herbes.",
"Cuire les vermicelles 2 à 3 minutes dans l'eau bouillante et les égoutter.",
"Répartir les vermicelles dans les bols, puis ajouter le giò gà, l'omelette, le poulet effiloché, le rau ram et les oignons verts.",
"Verser le bouillon bien chaud, assaisonner de sauce de poisson et de poivre, et ajouter un peu de pâte de crevettes si désiré."]
$instr$,
    30, 150, 6, 3,
    'Vietnamienne', 'lunch',
    ARRAY['soupe vietnamienne','poulet','vermicelles','hanoï','traditionnel','omelette','comfort-food'],
    'manual',
    'https://www.cooking-therapy.com/bun-thang-vietnamese-chicken-noodle-soup/',
    'https://www.cooking-therapy.com/wp-content/uploads/2018/06/Bun-Thang-7.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet entier',              1800,'g',          true,  1,  'pour le bouillon'),
    (v_recipe_id, 'eau',                        4,   'l',          true,  2,  'environ, pour couvrir le poulet'),
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'crevettes séchées',          2,   'c. à soupe', true,  4,  'réhydratées'),
    (v_recipe_id, 'sel',                        2,   'c. à café',  true,  5,  'au goût'),
    (v_recipe_id, 'bouillon de poulet',         430, 'ml',         true,  6,  '1 boîte'),
    (v_recipe_id, 'vermicelles de riz',         900, 'g',          true,  7,  'frais (bún)'),
    (v_recipe_id, 'giò gà',                     1,   'unité',      true,  8,  'rouleau de pâté vietnamien au poulet, en lanières'),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  9,  'pour les crêpes d''omelette'),
    (v_recipe_id, 'huile végétale',             1,   'c. à café',  true,  10, 'pour cuire les crêpes d''œufs'),
    (v_recipe_id, 'rau ram',                    15,  'g',          true,  11, 'coriandre vietnamienne, hachée'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  12, 'hachés finement'),
    (v_recipe_id, 'sauce de poisson',           1,   'c. à soupe', true,  13, 'au goût'),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  14, 'au goût'),
    (v_recipe_id, 'pâte de crevettes',          1,   'c. à café',  false, 15, 'optionnel, au goût');

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
    'Ragoût franco-vietnamien : cuisses de poulet mijotées avec cannelle, sauce de poisson, carottes, pommes de terre et champignons. Servi avec une baguette ou du riz.',
    $instr$["Faire mariner le poulet 15 minutes dans la sauce de poisson et le poivre ; couper les légumes pendant ce temps.",
"Chauffer l'huile dans une cocotte et saisir le poulet sur toutes ses faces. Réserver le poulet ET la marinade.",
"Faire revenir l'oignon 2 à 3 minutes jusqu'à ce qu'il colore. Ajouter l'ail et le sel, cuire 30 secondes.",
"Incorporer la cannelle, le concentré de tomate et la marinade réservée ; bien mélanger.",
"Remettre le poulet, l'enrober de sauce, couvrir et cuire 10 minutes à feu moyen-doux.",
"Verser le bouillon, ajouter le laurier, les carottes et les pommes de terre ; couvrir et cuire 10 à 15 minutes.",
"Ajouter les champignons et cuire encore 5 à 10 minutes, jusqu'à ce que les légumes soient tendres.",
"Goûter, rectifier l'assaisonnement et servir avec une baguette ou du riz."]
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
    (v_recipe_id, 'sauce de poisson',           3,   'c. à soupe', true,  2,  'nuoc-mâm'),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  5,  'en morceaux'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  6,  'haché'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'cannelle moulue',            0.5, 'c. à café',  true,  8,  'vietnamienne si possible'),
    (v_recipe_id, 'concentré de tomate',        3,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'feuilles de laurier',        2,   'unité',      true,  10, NULL),
    (v_recipe_id, 'bouillon de poulet',         430, 'ml',         true,  11, 'pauvre en sodium'),
    (v_recipe_id, 'carottes',                   3,   'unité',      true,  12, 'en morceaux de 2,5 cm'),
    (v_recipe_id, 'pommes de terre',            450, 'g',          true,  13, 'farineuses (type russet), pelées, en morceaux'),
    (v_recipe_id, 'champignons de Paris',       280, 'g',          true,  14, 'bruns (cremini), émincés');

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
    'Soupe vietnamienne classique au poulet : bouillon longuement mijoté avec oignon et gingembre grillés et épices torréfiées (coriandre, fenouil), nouilles de riz fraîches et poulet effiloché.',
    $instr$["Faire tremper les pétoncles séchés (optionnel) 10 minutes dans l'eau froide.",
"Préchauffer le gril du four ; faire griller l'oignon et le gingembre 10 à 15 minutes, jusqu'à ce qu'ils soient bien colorés.",
"Torréfier à sec les graines de coriandre et de fenouil 1 à 3 minutes, puis les enfermer dans une mousseline.",
"Blanchir le poulet : le couvrir d'eau, porter à ébullition puis jeter l'eau.",
"Remettre le poulet dans une grande marmite avec de l'eau propre, l'oignon et le gingembre grillés, le daïkon, les pétoncles, le sel et le sachet d'épices. Porter à ébullition puis laisser mijoter 30 minutes.",
"Retirer le poulet, le laisser refroidir et l'effilocher ; remettre les os dans la marmite, ajouter le bouillon de poulet et laisser mijoter 2 h 30.",
"Filtrer le bouillon à travers une passoire fine pour le clarifier.",
"Cuire les nouilles fraîches 2 à 3 minutes (5 à 10 minutes si elles sont sèches) dans l'eau bouillante.",
"Répartir dans les bols les nouilles, le poulet effiloché, les oignons verts, la coriandre et les échalotes frites.",
"Verser le bouillon bien chaud, assaisonner de sauce de poisson et servir."]
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
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  1,  'coupé en deux, grillé'),
    (v_recipe_id, 'gingembre',                  8,   'cm',         true,  2,  'frais, coupé en deux, grillé'),
    (v_recipe_id, 'graines de coriandre',       2,   'c. à café',  true,  3,  'torréfiées'),
    (v_recipe_id, 'graines de fenouil',         2,   'c. à café',  true,  4,  'torréfiées'),
    (v_recipe_id, 'poulet entier',              1500,'g',          true,  5,  'avec os'),
    (v_recipe_id, 'eau',                        3,   'l',          true,  6,  'environ, pour le bouillon'),
    (v_recipe_id, 'daïkon',                     1,   'unité',      true,  7,  'en tranches'),
    (v_recipe_id, 'sel',                        2,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'bouillon de poulet',         240, 'ml',         true,  9,  'pauvre en sodium'),
    (v_recipe_id, 'pétoncles séchés',           5,   'unité',      false, 10, 'optionnel, pour l''umami'),
    (v_recipe_id, 'nouilles de riz fraîches',   450, 'g',          true,  11, 'pour phở, 1 paquet'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       false, 12, 'émincés, pour garnir'),
    (v_recipe_id, 'coriandre fraîche',          2,   'c. à soupe', false, 13, 'hachée, pour garnir'),
    (v_recipe_id, 'échalotes frites',           4,   'c. à soupe', false, 14, 'pour garnir'),
    (v_recipe_id, 'sauce de poisson',           1,   'c. à soupe', true,  15, 'au goût');

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
    'Cuisses de poulet marinées à la citronnelle, à la sauce soja, à la sauce d''huître et à la sauce de poisson. Saisies à la poêle pour une peau croustillante, puis finies au four pour une viande juteuse.',
    $instr$["Préparer la marinade en mélangeant l'ail, l'échalote, la citronnelle, la sauce de poisson, la sauce d'huître, la sauce soja, le miel et la cassonade.",
"Ajouter les cuisses de poulet, bien les enrober et laisser mariner au moins 15 minutes (idéalement 1 heure) au réfrigérateur.",
"Préchauffer le four à 220°C.",
"Chauffer l'huile dans une poêle en fonte à feu vif. Saisir les cuisses 1 à 2 minutes par face, jusqu'à ce que la peau soit dorée.",
"Transférer le poulet sur une plaque et enfourner 25 à 30 minutes, jusqu'à 74°C à cœur.",
"Laisser reposer 5 minutes avant de servir.",
"Servir avec du riz blanc ou du riz brisé, des légumes frais et un œuf au plat."]
$instr$,
    15, 30, 2, 2,
    'Vietnamienne', 'dinner',
    ARRAY['citronnelle','poulet vietnamien','marinade','sauce-poisson','riz','four','vietnamien'],
    'manual',
    'https://www.cooking-therapy.com/vietnamese-lemongrass-chicken/',
    'https://www.cooking-therapy.com/wp-content/uploads/2020/09/Vietnamese-Lemongrass-Chicken-3.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  1,  'haché'),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  2,  'hachée'),
    (v_recipe_id, 'citronnelle',                2,   'tige',       true,  3,  'hachée finement'),
    (v_recipe_id, 'sauce de poisson',           2,   'c. à soupe', true,  4,  'vietnamienne'),
    (v_recipe_id, 'sauce d''huître',            1,   'c. à soupe', false, 5,  'optionnelle'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  6,  'ou tamari'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  7,  'arachide ou tournesol, pour saisir'),
    (v_recipe_id, 'miel',                       1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'cassonade',                  1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'cuisses de poulet',          900, 'g',          true,  10, 'avec os et peau');

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
    'Dessert vietnamien crémeux et réconfortant : riz gluant cuit avec du maïs frais, du lait de coco et du pandan. Servi tiède avec une sauce coco supplémentaire.',
    $instr$["Égrener les 4 épis de maïs en tranchant les grains au couteau ; conserver les épis.",
"Mettre les épis dans une grande casserole avec les 960 ml d'eau, couvrir et laisser mijoter 30 minutes.",
"Pendant ce temps, rincer le riz gluant 4 à 5 fois, jusqu'à ce que l'eau soit claire.",
"Retirer les épis du bouillon. Ajouter le riz, le lait de coco, les feuilles de pandan nouées et les grains de maïs ; laisser mijoter 15 à 20 minutes.",
"Retirer du feu, ajouter le sucre et le sel, bien mélanger.",
"Pour la sauce : faire chauffer doucement le lait de coco avec le sucre et une pincée de sel.",
"Délayer la fécule de maïs dans l'eau froide, l'incorporer à la sauce et retirer du feu dès qu'elle épaissit.",
"Répartir le pudding dans des bols et napper de sauce coco ; servir chaud ou tiède."]
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
    (v_recipe_id, 'épis de maïs',               4,   'unité',      true,  1,  'frais'),
    (v_recipe_id, 'eau',                        960, 'ml',         true,  2,  NULL),
    (v_recipe_id, 'riz gluant',                 150, 'g',          true,  3,  'rincé'),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  4,  'pour le pudding'),
    (v_recipe_id, 'feuilles de pandan',         4,   'unité',      true,  5,  'nouées'),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  6,  'pour le pudding'),
    (v_recipe_id, 'sucre',                      50,  'g',          true,  7,  'pour le pudding'),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  8,  'pour la sauce'),
    (v_recipe_id, 'sucre',                      2,   'c. à soupe', true,  9,  'pour la sauce'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  10, 'pour la sauce'),
    (v_recipe_id, 'fécule de maïs',             2,   'c. à café',  true,  11, 'pour épaissir la sauce'),
    (v_recipe_id, 'eau',                        2,   'c. à soupe', true,  12, 'froide, pour délayer la fécule');

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
    'Petites galettes de riz cuites à la vapeur dans de minuscules coupelles, garnies de crevettes séchées concassées et d''huile à l''oignon vert. Spécialité de Huế servie avec du nuoc cham.',
    $instr$["Mélanger la farine de riz, la farine de tapioca et le sel dans un grand saladier, puis ajouter l'eau et 1 c. à soupe d'huile en remuant.",
"Faire tremper les crevettes séchées 10 minutes, les sécher puis les mixer finement.",
"Chauffer 2 c. à soupe d'huile à feu moyen-vif, ajouter les crevettes et les faire revenir 3 à 5 minutes en remuant.",
"Filtrer à travers une passoire et égoutter les crevettes sur du papier absorbant.",
"Mettre les oignons verts hachés dans un bol, chauffer 60 ml d'huile et la verser dessus pour obtenir l'huile à l'oignon vert.",
"Remplir aux trois quarts de petites coupelles avec la pâte et cuire 5 minutes à la vapeur, couvercle légèrement entrouvert.",
"Laisser refroidir 5 à 10 minutes, puis garnir chaque galette de crevettes frites et d'huile à l'oignon vert.",
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
    (v_recipe_id, 'farine de riz',              260, 'g',          true,  1,  'fine'),
    (v_recipe_id, 'farine de tapioca',          2,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  3,  'de mer'),
    (v_recipe_id, 'eau',                        960, 'ml',         true,  4,  NULL),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  5,  'pour la pâte'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  6,  'pour les crevettes'),
    (v_recipe_id, 'crevettes séchées',          75,  'g',          true,  7,  NULL),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  8,  'hachés'),
    (v_recipe_id, 'huile végétale',             60,  'ml',         true,  9,  'pour l''huile à l''oignon vert'),
    (v_recipe_id, 'nuoc cham',                  120, 'ml',         true,  10, 'pour arroser');

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
    'Grande crêpe vietnamienne croustillante au curcuma, garnie de bœuf, de crevettes et de germes de soja. Servie roulée dans une feuille de laitue avec des herbes et du nuoc cham.',
    $instr$["Mélanger la farine de riz, la fécule de maïs, le curcuma, le lait de coco, le bouillon, l'œuf, l'eau et le sel ; laisser reposer au moins 3 heures (idéalement une nuit) au réfrigérateur.",
"Faire bouillir l'épaule de bœuf 30 minutes, puis la trancher finement et réserver.",
"Cuire les haricots mungo 10 minutes dans 240 ml d'eau bouillante, jusqu'à ce qu'ils soient tendres.",
"Juste avant de cuire les crêpes, incorporer les oignons verts hachés à la pâte.",
"Dans une poêle antiadhésive de 20 cm, faire sauter un peu d'oignon émincé et quelques crevettes pendant 1 minute.",
"Ajouter quelques tranches de bœuf et 1 c. à soupe d'huile chaude, puis verser une louche de pâte en tournant la poêle pour en couvrir le fond.",
"Répartir les haricots mungo et les germes de soja sur une moitié ; couvrir et cuire environ 3 minutes, jusqu'à ce que la crêpe soit très croustillante.",
"Plier la crêpe en deux et la faire glisser sur l'assiette ; recommencer jusqu'à épuisement des ingrédients.",
"Essuyer la poêle avec du papier absorbant toutes les 2 crêpes pour préserver le croustillant.",
"Servir avec de la laitue, du concombre, de la menthe et du nuoc cham."]
$instr$,
    180, 30, 12, 3,
    'Vietnamienne', 'lunch',
    ARRAY['crêpe vietnamienne','bœuf','crevettes','curcuma','croustillant','traditionnel','festif'],
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
    (v_recipe_id, 'bouillon',                   2,   'c. à soupe', false, 5,  'optionnel, sinon eau'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  7,  'pour la pâte'),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  9,  'hachés finement'),
    (v_recipe_id, 'épaule de bœuf',             340, 'g',          true,  10, 'tranchée finement après cuisson'),
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  11, 'émincé'),
    (v_recipe_id, 'crevettes',                  340, 'g',          true,  12, 'petites ou moyennes, décortiquées'),
    (v_recipe_id, 'huile végétale',             180, 'ml',         true,  13, 'pour la cuisson, 1 c. à soupe par crêpe'),
    (v_recipe_id, 'haricots mungo',             50,  'g',          false, 14, 'décortiqués, optionnel'),
    (v_recipe_id, 'eau',                        240, 'ml',         false, 15, 'pour cuire les haricots mungo'),
    (v_recipe_id, 'germes de soja',             25,  'g',          false, 16, 'optionnel'),
    (v_recipe_id, 'laitue',                     1,   'unité',      false, 17, 'pour servir'),
    (v_recipe_id, 'concombre',                  1,   'unité',      false, 18, 'pour servir'),
    (v_recipe_id, 'menthe fraîche',             1,   'botte',      false, 19, 'pour servir'),
    (v_recipe_id, 'nuoc cham',                  120, 'ml',         true,  20, 'pour servir');

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
    'Street food de Da Lat : du papier de riz grillé en guise de pâte et de l''œuf battu en guise de sauce, garnis de bœuf haché, de mayonnaise japonaise, de sriracha et d''échalotes frites. Croustillante et savoureuse.',
    $instr$["Mélanger le bœuf haché avec le sel, le poivre, le sucre et la sauce de poisson, puis le cuire à feu moyen-vif jusqu'à cuisson complète.",
"Chauffer l'huile 1 à 2 minutes et la verser sur les oignons verts hachés pour obtenir l'huile à l'oignon vert.",
"Battre les œufs dans un bol et disposer tous les ingrédients à portée de main.",
"Chauffer un gril ou une grande poêle à feu vif.",
"Humidifier légèrement une face d'une feuille de papier de riz, presser une seconde feuille dessus et poser le tout sur le gril.",
"Aplatir avec le dos d'une cuillère en mouvements circulaires pour chasser les bulles d'air.",
"Quand le papier devient blanc opaque, ajouter 2 à 3 cuillerées d'huile à l'oignon vert.",
"Verser 2 à 3 cuillerées d'œuf battu et cuire environ 10 secondes, jusqu'à ce qu'il commence à prendre.",
"Ajouter 2 à 3 cuillerées de bœuf, retirer du feu et garnir de sriracha, de mayonnaise japonaise et d'échalotes frites.",
"Plier en deux et servir aussitôt ; recommencer jusqu'à épuisement des ingrédients."]
$instr$,
    30, 30, 4, 2,
    'Vietnamienne', 'snack',
    ARRAY['pizza vietnamienne','papier de riz','street-food','bœuf','œuf','sriracha','rapide'],
    'manual',
    'https://www.cooking-therapy.com/vietnamese-pizza/',
    'https://www.cooking-therapy.com/wp-content/uploads/2020/06/Vietnamese-Pizza-3-scaled.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 250, 'g',          true,  1,  NULL),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'poivre blanc',               0.25,'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'sauce de poisson',           1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'huile végétale',             120, 'ml',         true,  6,  'pour l''huile à l''oignon vert'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  7,  'hachés finement'),
    (v_recipe_id, 'papier de riz',              8,   'unité',      true,  8,  'feuilles rondes'),
    (v_recipe_id, 'œufs',                       3,   'unité',      true,  9,  'battus'),
    (v_recipe_id, 'échalotes frites',           4,   'c. à soupe', false, 10, 'pour garnir'),
    (v_recipe_id, 'sriracha',                   60,  'ml',         true,  11, NULL),
    (v_recipe_id, 'mayonnaise japonaise',       60,  'ml',         true,  12, 'type Kewpie');

END $$;
