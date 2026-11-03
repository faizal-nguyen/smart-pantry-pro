-- =====================================================================
-- Seed: 7 Vietnamese recipes from bunbobae.com (2026-05-20)
--
-- Sources fetched 2026-05-20 (WordPress blog, WebFetch OK) :
--   1. https://bunbobae.com/vietnamese-red-rice-com-do/
--   2. https://bunbobae.com/hainanese-chicken-rice-com-ga-hai-nam/
--   3. https://bunbobae.com/vietnamese-shaking-beef-bo-luc-lac/
--   4. https://bunbobae.com/rice-cooker-savory-sticky-rice-xoi-man/
--   5. https://bunbobae.com/vietnamese-chicken-salad-ga-bop/
--   6. https://bunbobae.com/vietnamese-meatballs-xiu-mai/
--   7. https://bunbobae.com/spicy-vietnamese-beef-noodle-soup-bun-bo-hue/
--
-- Note collision : "Bún Bò Huế" est aussi présent en seed cooking-therapy.
-- On suffixe " (Bunbobae)" ici pour éviter le DELETE croisé.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-20-add-bunbobae.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Cơm Đỏ (Riz Rouge Vietnamien)',
    'Cơm Gà Hải Nam (Riz au Poulet Hainanais)',
    'Bò Lúc Lắc (Bœuf Sauté Vietnamien)',
    'Xôi Mặn (Riz Gluant Salé)',
    'Gà Bóp (Salade de Poulet Vietnamienne)',
    'Xíu Mại (Boulettes Vietnamiennes)',
    'Bún Bò Huế (Bunbobae)'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Cơm Đỏ (Riz Rouge Vietnamien)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Cơm Đỏ (Riz Rouge Vietnamien)',
    'Riz frit savoureux et légèrement acidulé, préparé avec du concentré de tomate et de l''ail. Un accompagnement vietnamien polyvalent qui rehausse n''importe quel plat avec très peu d''ingrédients.',
    $instr$["Préchauffer une poêle à feu moyen-vif et ajouter l'huile et l'ail.",
"Faire revenir l'ail jusqu'à ce qu'il commence tout juste à dorer et libère son arôme.",
"Ajouter le riz cuit froid (idéalement de la veille) et séparer les grains à la spatule.",
"Quand les grains sont séparés et enrobés d'huile, ajouter la sauce soja et le concentré de tomate.",
"Continuer à remuer le riz jusqu'à ce que les grains soient uniformément enrobés et chauds."]
$instr$,
    5, 10, 4, 1,
    'Vietnamienne', 'dinner',
    ARRAY['riz','asiatique','vietnamien','tomate','accompagnement','facile','économique'],
    'manual',
    'https://bunbobae.com/vietnamese-red-rice-com-do/',
    'https://bunbobae.com/wp-content/uploads/2022/05/IMG_5729-683x1024.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz cuit',                400, 'g',          true,  1, 'de la veille de préférence'),
    (v_recipe_id, 'ail',                     4,   'gousse',     true,  2, 'hachées finement'),
    (v_recipe_id, 'huile neutre',            2,   'c. à soupe', true,  3, NULL),
    (v_recipe_id, 'concentré de tomate',     2,   'c. à soupe', true,  4, NULL),
    (v_recipe_id, 'sauce soja',              1,   'c. à café',  true,  5, NULL);

  -- =====================================================================
  -- 2. Cơm Gà Hải Nam (Riz au Poulet Hainanais)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Cơm Gà Hải Nam (Riz au Poulet Hainanais)',
    'Plat sino-vietnamien composé d''un poulet entier poché et d''un riz parfumé cuit dans la graisse et le bouillon de poulet. Il est servi avec deux sauces : une huile gingembre-ciboule et un nuoc cham au gingembre.',
    $instr$["Retirer et réserver les morceaux de gras situés à l'entrée de la cavité du poulet.",
"Placer le poulet dans une grande cocotte, blancs vers le haut, le couvrir complètement d'eau, ajouter le sel et une échalote. Porter à ébullition puis laisser frémir 40-45 minutes, jusqu'à 74 °C à cœur.",
"Faire fondre le gras réservé à feu moyen dans une poêle froide, jusqu'à ce qu'il soit entièrement fondu, puis retirer les résidus croustillants. Compléter avec l'huile neutre si besoin.",
"Ajouter l'échalote hachée et le curcuma dans la graisse fondue et cuire 5 minutes, jusqu'à ce que l'échalote dore.",
"Rincer et égoutter le riz, l'ajouter aux échalotes et le faire revenir 2 minutes pour bien enrober chaque grain.",
"Transférer dans un cuiseur à riz avec 1 L du bouillon de pochage et cuire selon les instructions de l'appareil.",
"Préparer la sauce gingembre-ciboule : faire revenir 2 minutes le gingembre haché dans l'huile chaude, puis ajouter les oignons verts, le sel et le glutamate et cuire jusqu'à ce qu'ils flétrissent légèrement.",
"Préparer le nuoc cham en mélangeant le gingembre, l'ail et les piments thaï avec la sauce de poisson, le sucre et le vinaigre de cidre.",
"Découper le poulet refroidi en morceaux et le dresser avec le riz, le concombre, les tomates cerises, les échalotes frites et les deux sauces."]
$instr$,
    15, 135, 6, 3,
    'Vietnamienne', 'dinner',
    ARRAY['poulet poché','riz asiatique','vietnamien','hainanais','plat complet','traditionnel'],
    'manual',
    'https://bunbobae.com/hainanese-chicken-rice-com-ga-hai-nam/',
    'https://bunbobae.com/wp-content/uploads/2023/02/IMG_5992-683x1024.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet entier',           1750,'g',          true,  1,  'environ 1,5 à 2 kg, fermier ; garder le gras de la cavité pour le riz'),
    (v_recipe_id, 'sel',                     2,   'c. à soupe', true,  2,  'pour le pochage'),
    (v_recipe_id, 'échalote',                1,   'unité',      true,  3,  'pour le pochage'),
    (v_recipe_id, 'eau',                     2500,'ml',         true,  4,  'pour couvrir le poulet (fournit le bouillon du riz)'),
    (v_recipe_id, 'huile neutre',            2,   'c. à soupe', true,  5,  'pour le riz, en complément du gras de poulet'),
    (v_recipe_id, 'curcuma',                 0.25,'c. à café',  true,  6,  'pour le riz'),
    (v_recipe_id, 'échalote',                1,   'unité',      true,  7,  'hachée menu, pour le riz'),
    (v_recipe_id, 'riz long grain',          400, 'g',          true,  8,  'cru'),
    (v_recipe_id, 'oignons verts',           2,   'botte',      true,  9,  'hachés, sauce gingembre'),
    (v_recipe_id, 'gingembre',               40,  'g',          true,  10, 'haché, sauce gingembre'),
    (v_recipe_id, 'huile neutre',            240, 'ml',         true,  11, 'sauce gingembre'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  12, 'sauce gingembre'),
    (v_recipe_id, 'glutamate monosodique',   1,   'pincée',     false, 13, 'sauce gingembre, optionnel'),
    (v_recipe_id, 'gingembre',               20,  'g',          true,  14, 'haché, nuoc cham'),
    (v_recipe_id, 'ail',                     3,   'gousse',     true,  15, 'nuoc cham'),
    (v_recipe_id, 'piments thaï',            3,   'unité',      true,  16, 'nuoc cham, selon le piquant désiré'),
    (v_recipe_id, 'sauce de poisson',        2,   'c. à soupe', true,  17, 'nuoc cham'),
    (v_recipe_id, 'sucre',                   2,   'c. à soupe', true,  18, 'nuoc cham'),
    (v_recipe_id, 'vinaigre de cidre',       2,   'c. à soupe', true,  19, 'nuoc cham'),
    (v_recipe_id, 'concombre',               1,   'unité',      false, 20, 'garniture'),
    (v_recipe_id, 'tomates cerises',         250, 'g',          false, 21, 'garniture'),
    (v_recipe_id, 'échalotes frites',        2,   'c. à soupe', false, 22, 'garniture');

  -- =====================================================================
  -- 3. Bò Lúc Lắc (Bœuf Sauté Vietnamien)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bò Lúc Lắc (Bœuf Sauté Vietnamien)',
    'Plat vietnamien d''influence française : des cubes de bœuf tendres saisis rapidement au wok avec des oignons et de la sauce huître. « Lúc lắc » signifie « secouer » : on secoue le wok au lieu de remuer, pour ne pas casser la croûte.',
    $instr$["Couper le bœuf en cubes de 2,5 cm et le faire mariner avec la sauce soja, la sauce huître, le sucre, l'ail émincé, le sel, le poivre et le glutamate.",
"Laisser reposer la viande quelques minutes, le temps de préparer les oignons et de trancher les tomates et le concombre pour le service.",
"Chauffer la poêle à feu vif, ajouter l'huile et saisir le bœuf sans surcharger la surface.",
"Laisser les cubes reposer 20-30 secondes pour créer une croûte, puis secouer la poêle pour les retourner d'un coup.",
"Cuire 1-2 minutes en continuant à secouer pour une cuisson uniforme.",
"Ajouter les oignons jaunes en demi-lunes et remuer 1-2 minutes supplémentaires.",
"Retirer du feu, ajouter les oignons verts et mélanger pour qu'ils tombent légèrement.",
"Dresser sur un lit de cresson (ou de roquette), avec les tomates et le concombre tranchés."]
$instr$,
    15, 5, 2, 2,
    'Vietnamienne', 'dinner',
    ARRAY['bœuf','vietnamien','sauté','rapide','asiatique','influence-française','wok'],
    'manual',
    'https://bunbobae.com/vietnamese-shaking-beef-bo-luc-lac/',
    'https://bunbobae.com/wp-content/uploads/2022/05/IMG_5726-683x1024.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf',                       450,'g',          true,  1,  'filet ou faux-filet, en cubes de 2,5 cm'),
    (v_recipe_id, 'sauce soja',                 15, 'ml',         true,  2,  NULL),
    (v_recipe_id, 'sauce huître',               30, 'ml',         true,  3,  NULL),
    (v_recipe_id, 'ail',                        4,  'gousse',     true,  4,  'émincées'),
    (v_recipe_id, 'sucre',                      10, 'g',          true,  5,  NULL),
    (v_recipe_id, 'oignon jaune',               1,  'unité',      true,  6,  'petit, en demi-lunes'),
    (v_recipe_id, 'oignons verts',              3,  'unité',      true,  7,  'en tronçons de 2,5-5 cm'),
    (v_recipe_id, 'sel',                        1,  'pincée',     true,  8,  'au goût'),
    (v_recipe_id, 'poivre',                     1,  'pincée',     true,  9,  'au goût'),
    (v_recipe_id, 'glutamate monosodique',      1,  'pincée',     false, 10, 'optionnel'),
    (v_recipe_id, 'huile neutre',               30, 'ml',         true,  11, 'à point de fumée élevé'),
    -- Service
    (v_recipe_id, 'cresson',                    50, 'g',          false, 12, 'ou roquette, pour servir'),
    (v_recipe_id, 'tomate',                     1,  'unité',      false, 13, 'tranchée, pour servir'),
    (v_recipe_id, 'concombre',                  0.5,'unité',      false, 14, 'tranché, pour servir');

  -- =====================================================================
  -- 4. Xôi Mặn (Riz Gluant Salé)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Xôi Mặn (Riz Gluant Salé)',
    'Riz gluant cuit au cuiseur à riz, garni de saucisse chinoise de poulet, de crevettes séchées et de champignons shiitake. Un petit-déjeuner vietnamien savoureux, à la texture moelleuse et élastique.',
    $instr$["Rincer le riz gluant deux ou trois fois pour éliminer l'excédent d'amidon, puis le cuire au cuiseur à riz avec 240 ml d'eau.",
"Pendant la cuisson du riz, tremper les crevettes séchées 15 minutes dans l'eau chaude, puis les hacher finement.",
"Trancher la saucisse en rondelles ou en petits cubes, selon votre préférence.",
"Dans une poêle antiadhésive, chauffer 30 ml d'huile et faire cuire la majeure partie des oignons verts hachés jusqu'à ce qu'ils embaument et soient vert vif (huile à la ciboule). Garder le reste pour la garniture.",
"Dans une grande poêle, chauffer 15 ml d'huile et faire sauter les champignons, la saucisse et les crevettes jusqu'à ce que la saucisse rende son gras.",
"Ajouter l'ail haché et cuire brièvement, puis ajouter 30 ml de sauce soja et retirer du feu.",
"Ajouter le riz cuit et l'huile à la ciboule, et mélanger délicatement sans écraser les grains.",
"Incorporer l'effiloché de bœuf et le reste de la sauce soja, si désiré.",
"Servir garni d'oignons verts frais et d'échalotes frites."]
$instr$,
    20, 30, 4, 2,
    'Vietnamienne', 'breakfast',
    ARRAY['riz gluant','vietnamien','saucisse chinoise','crevettes séchées','cuiseur de riz','comfort-food','petit-déjeuner'],
    'manual',
    'https://bunbobae.com/rice-cooker-savory-sticky-rice-xoi-man/',
    'https://bunbobae.com/wp-content/uploads/2020/05/IMG_4489-683x1024.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz gluant',                300, 'g',          true,  1,  'cru'),
    (v_recipe_id, 'eau',                       240, 'ml',         true,  2,  'pour le cuiseur'),
    (v_recipe_id, 'crevettes séchées',         25,  'g',          true,  3,  '3 c. à soupe, réhydratées et hachées'),
    (v_recipe_id, 'saucisse chinoise de poulet', 1, 'unité',      true,  4,  'type lap cheong halal, tranchée finement'),
    (v_recipe_id, 'champignons shiitake',      250, 'g',          true,  5,  'tranchés'),
    (v_recipe_id, 'oignons verts',             1,   'botte',      true,  6,  'hachés, dont un peu pour la garniture'),
    (v_recipe_id, 'huile végétale',            45,  'ml',         true,  7,  '30 ml pour l''huile à la ciboule, 15 ml pour la garniture'),
    (v_recipe_id, 'ail',                       2,   'gousse',     true,  8,  'hachées'),
    (v_recipe_id, 'sauce soja',                45,  'ml',         true,  9,  '30 ml à la cuisson, le reste au goût'),
    (v_recipe_id, 'effiloché de bœuf',         60,  'g',          false, 10, 'optionnel'),
    (v_recipe_id, 'échalotes frites',          30,  'g',          false, 11, 'garniture');

  -- =====================================================================
  -- 5. Gà Bóp (Salade de Poulet Vietnamienne)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Gà Bóp (Salade de Poulet Vietnamienne)',
    'Salade de poulet originaire de Huế, à base de poulet poché effiloché, oignons doux marinés au citron vert et coriandre vietnamienne (rau răm). Plat simple, acidulé et poivré.',
    $instr$["Porter une grande casserole d'eau à ébullition avec l'échalote et y plonger le poulet entier ; le cuire jusqu'à 74 °C à cœur (30-45 minutes).",
"Retirer le poulet et le laisser reposer au moins 30 minutes, jusqu'à ce qu'il soit assez froid pour être manipulé.",
"Pendant le repos, trancher l'oignon doux en demi-lunes fines et l'assaisonner avec sel, poivre et le jus des citrons verts.",
"Une fois le poulet refroidi, l'effilocher entièrement à la main.",
"Égoutter les oignons (réserver le jus) et les mélanger au poulet avec la coriandre vietnamienne hachée.",
"Mélanger vigoureusement à la main pour bien marier les saveurs.",
"Goûter et ajuster le sel, le poivre ou le jus de citron vert réservé selon votre goût."]
$instr$,
    45, 30, 6, 2,
    'Vietnamienne', 'lunch',
    ARRAY['poulet','salade vietnamienne','rau ram','citron vert','herbes fraîches','huế','traditionnel'],
    'manual',
    'https://bunbobae.com/vietnamese-chicken-salad-ga-bop/',
    'https://bunbobae.com/wp-content/uploads/2020/08/IMG_4831-683x1024.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet entier',           1750,'g',          true,  1, 'environ 1,4 à 2,3 kg'),
    (v_recipe_id, 'échalote',                1,   'unité',      true,  2, 'pelée, pour le pochage'),
    (v_recipe_id, 'oignon doux',             290, 'g',          true,  3, 'en demi-lunes'),
    (v_recipe_id, 'citron vert',             2,   'unité',      true,  4, 'jus, environ 150 ml'),
    (v_recipe_id, 'coriandre vietnamienne',  60,  'g',          true,  5, 'rau răm, hachée ; ou coriandre classique'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  6, 'au goût'),
    (v_recipe_id, 'poivre',                  1,   'c. à café',  true,  7, 'au goût');

  -- =====================================================================
  -- 6. Xíu Mại (Boulettes Vietnamiennes)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Xíu Mại (Boulettes Vietnamiennes)',
    'Boulettes tendres au bœuf et aux crevettes, relevées du croquant du jicama et servies dans une sauce tomate acidulée. Parfaites en bánh mì ou avec du pain de mie, au petit-déjeuner vietnamien.',
    $instr$["Mélanger délicatement le bœuf haché, les crevettes hachées, le jicama, le sel, le poivre, la sauce de poisson, l'échalote, l'ail et le panko, sans trop malaxer pour garder les boulettes tendres.",
"Former 16 boulettes de la taille d'une balle de golf, les mains légèrement huilées.",
"Disposer les boulettes dans une assiette résistant à la chaleur et les cuire à la vapeur 15-20 minutes, jusqu'à cuisson complète ; conserver le jus rendu.",
"Pendant la cuisson, blanchir les tomates 30 secondes, les peler et les mixer jusqu'à obtenir une purée lisse.",
"Chauffer la purée de tomate dans une casserole avec l'huile, à feu moyen, jusqu'à ce qu'elle prenne une couleur profonde.",
"Verser le bouillon de poulet et mélanger ; ajouter les boulettes cuites avec leur jus.",
"Laisser mijoter quelques minutes pour que les boulettes s'imprègnent de la sauce ; rectifier le sel et le poivre."]
$instr$,
    20, 30, 4, 2,
    'Vietnamienne', 'breakfast',
    ARRAY['boulettes','bœuf','crevettes','vietnamien','sauce tomate','jicama','bánh mì','petit-déjeuner'],
    'manual',
    'https://bunbobae.com/vietnamese-meatballs-xiu-mai/',
    'https://bunbobae.com/wp-content/uploads/2025/02/Untitled-design.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',              450, 'g',          true,  1,  '20 % de matières grasses'),
    (v_recipe_id, 'crevettes',               125, 'g',          true,  2,  'décortiquées, hachées finement'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'sauce de poisson',        2,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'poivre noir',             1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'échalote',                1,   'unité',      true,  6,  'petite, hachée finement'),
    (v_recipe_id, 'ail',                     5,   'gousse',     true,  7,  'hachées finement'),
    (v_recipe_id, 'jicama',                  150, 'g',          true,  8,  'en petits dés, ou châtaignes d''eau'),
    (v_recipe_id, 'chapelure panko',         30,  'g',          true,  9,  NULL),
    (v_recipe_id, 'huile végétale',          1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'tomates',                 600, 'g',          true,  11, '2 grosses'),
    (v_recipe_id, 'bouillon de poulet',      350, 'ml',         true,  12, 'ou eau');

  -- =====================================================================
  -- 7. Bún Bò Huế (Bunbobae)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bún Bò Huế (Bunbobae)',
    'Soupe de nouilles épicée originaire de Huế, au jarret et aux pieds de bœuf. Un bouillon aromatique à la citronnelle et au piment : un plat réconfortant emblématique, souvent dégusté au petit-déjeuner.',
    $instr$["Plonger les pieds de bœuf et le jarret de bœuf dans de l'eau salée, porter à ébullition, puis égoutter et rincer soigneusement.",
"Remettre la viande dans une cocotte propre avec les 2,6 L d'eau, les échalotes et la moitié des tiges de citronnelle (les parties vertes), puis porter à ébullition.",
"Baisser le feu et laisser mijoter 2-3 heures à découvert, en écumant régulièrement.",
"Retirer les pieds de bœuf après 1-2 heures ; quand le jarret est tendre (2-3 heures), le retirer, le laisser refroidir et le trancher finement. Retirer la citronnelle et les échalotes.",
"Remettre les pieds de bœuf dans le bouillon, ajouter les cubes de bouillon pour bún bò Huế et porter à ébullition.",
"Faire revenir 3 minutes le reste de la citronnelle, finement hachée, dans 45 ml d'huile, puis verser dans le bouillon avec une partie des oignons verts.",
"Dans la même casserole, chauffer 30 ml d'huile avec les flocons de piment et la sauce sa tế, ajouter une louche de bouillon chaud, puis reverser lentement le tout dans le bouillon.",
"Goûter et assaisonner de sauce de poisson et de sel selon votre goût.",
"Garnir chaque bol de vermicelles cuits, de viande tranchée et d'herbes fraîches, et servir avec des quartiers de citron vert et de la fleur de bananier."]
$instr$,
    90, 180, 10, 4,
    'Vietnamienne', 'lunch',
    ARRAY['soupe vietnamienne','nouilles de riz','bœuf','épicée','citronnelle','huế','bouillon d''os'],
    'manual',
    'https://bunbobae.com/spicy-vietnamese-beef-noodle-soup-bun-bo-hue/',
    'https://bunbobae.com/wp-content/uploads/2019/09/IMG_3586-683x1024.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pieds de bœuf',           1800,'g',          true,  1,  NULL),
    (v_recipe_id, 'jarret de bœuf',          900, 'g',          true,  2,  NULL),
    (v_recipe_id, 'échalote',                2,   'unité',      true,  3,  'pour le bouillon'),
    (v_recipe_id, 'citronnelle',             6,   'tige',       true,  4,  'moitié dans le bouillon, moitié hachée et frite'),
    (v_recipe_id, 'huile neutre',            75,  'ml',         true,  5,  '45 ml pour la citronnelle, 30 ml pour l''huile pimentée'),
    (v_recipe_id, 'flocons de piment',       1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'sauce piment-citronnelle', 15, 'ml',         true,  7,  'sa tế (tương ớt sa tế)'),
    (v_recipe_id, 'bouillon en cube',        150, 'g',          true,  8,  'saveur bún bò Huế, 2 boîtes'),
    (v_recipe_id, 'eau',                     2600,'ml',         true,  9,  NULL),
    (v_recipe_id, 'sauce de poisson',        2,   'c. à soupe', true,  10, 'au goût'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  11, 'au goût, plus pour l''eau de blanchiment'),
    (v_recipe_id, 'vermicelles de riz',      900, 'g',          true,  12, 'gros calibre (bún bò Huế), 2 paquets'),
    (v_recipe_id, 'coriandre fraîche',       1,   'botte',      true,  13, 'hachée'),
    (v_recipe_id, 'oignons verts',           1,   'botte',      true,  14, 'hachés'),
    (v_recipe_id, 'coriandre vietnamienne',  1,   'botte',      true,  15, 'rau răm, hachée'),
    (v_recipe_id, 'fleur de bananier',       1,   'unité',      false, 16, 'tranchée fine, garniture'),
    (v_recipe_id, 'citron vert',             2,   'unité',      false, 17, 'en quartiers, pour servir');

END $$;
