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
    'Riz frit savoureux et légèrement acidulé préparé avec de la pâte de tomate et de l''ail. Un accompagnement vietnamien polyvalent qui rehausse n''importe quel plat avec très peu d''ingrédients.',
    $instr$["Préchauffer une poêle à feu moyen-vif et ajouter l'huile et l'ail.",
"Faire revenir l'ail jusqu'à ce qu'il commence tout juste à brunir et libère son arôme.",
"Ajouter le riz cuit froid (de la veille idéalement) et séparer les grains à la spatule.",
"Quand les grains sont séparés et enrobés d'huile, verser la sauce soja et la pâte de tomate.",
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
    (v_recipe_id, 'ail',                     4,   'gousse',     true,  2, 'haché finement'),
    (v_recipe_id, 'huile neutre',            2,   'c. à soupe', true,  3, NULL),
    (v_recipe_id, 'pâte de tomate',          2,   'c. à soupe', true,  4, NULL),
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
    'Plat sino-vietnamien composé d''un poulet entier poché et d''un riz parfumé cuit dans la graisse et le bouillon de poulet, servi avec deux sauces aromatiques au gingembre et nuoc cham.',
    $instr$["Tailler et réserver les morceaux gras à l'arrière de la cavité du poulet entier.",
"Placer le poulet dans une grande cocotte poitrine vers le haut, couvrir complètement d'eau, ajouter sel et échalote, porter à ébullition puis mijoter 40-45 minutes jusqu'à 74°C à cœur.",
"Rendre la graisse réservée à feu moyen dans une poêle froide jusqu'à fonte complète, puis retirer les résidus croustillants.",
"Ajouter l'échalote hachée et une pincée de curcuma à la graisse fondue, cuire 5 minutes jusqu'à brunissement.",
"Rincer et égoutter le riz, l'ajouter aux échalotes et le faire griller 2 minutes pour enrober chaque grain.",
"Transférer dans un cuiseur à riz avec 1 L de bouillon de poulet et cuire selon les instructions de l'appareil.",
"Préparer la sauce gingembre-ciboule en faisant revenir le gingembre haché dans l'huile chaude 2 minutes, puis ajouter ciboules, sel et glutamate jusqu'à léger flétrissement.",
"Préparer le nuoc cham en mélangeant gingembre, ail et piments thaï avec sauce de poisson, sucre et vinaigre de cidre.",
"Découper le poulet refroidi en pièces, dresser avec le riz, concombre, tomates et les deux sauces."]
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
    (v_recipe_id, 'poulet entier',           1750,'g',          true,  1,  'environ 1,5 à 2 kg, fermier'),
    (v_recipe_id, 'sel',                     2,   'c. à soupe', true,  2,  'pour le pochage'),
    (v_recipe_id, 'échalote',                1,   'unité',      true,  3,  'pour le pochage'),
    (v_recipe_id, 'eau',                     2500,'ml',         true,  4,  'pour couvrir le poulet'),
    (v_recipe_id, 'huile neutre',            2,   'c. à soupe', true,  5,  'pour le riz'),
    (v_recipe_id, 'curcuma',                 0.25,'c. à café',  true,  6,  'pincée pour le riz'),
    (v_recipe_id, 'graisse de poulet',       2,   'c. à soupe', true,  7,  'rendue de la cavité'),
    (v_recipe_id, 'échalote',                1,   'unité',      true,  8,  'hachée menu, pour le riz'),
    (v_recipe_id, 'riz long grain',          400, 'g',          true,  9,  'non cuit'),
    (v_recipe_id, 'bouillon de poulet',      1000,'ml',         true,  10, 'du pochage'),
    (v_recipe_id, 'oignons verts',           2,   'botte',      true,  11, 'hachés, sauce gingembre'),
    (v_recipe_id, 'gingembre',               40,  'g',          true,  12, 'haché, sauce gingembre'),
    (v_recipe_id, 'huile neutre',            240, 'ml',         true,  13, 'sauce gingembre'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  14, 'sauce gingembre'),
    (v_recipe_id, 'glutamate monosodique',   1,   'pincée',     false, 15, 'sauce gingembre, optionnel'),
    (v_recipe_id, 'gingembre',               20,  'g',          true,  16, 'haché, nuoc cham'),
    (v_recipe_id, 'ail',                     3,   'gousse',     true,  17, 'nuoc cham'),
    (v_recipe_id, 'piments thaï',            3,   'unité',      true,  18, 'selon piquant désiré'),
    (v_recipe_id, 'sauce de poisson',        2,   'c. à soupe', true,  19, 'nuoc cham'),
    (v_recipe_id, 'sucre',                   2,   'c. à soupe', true,  20, 'nuoc cham'),
    (v_recipe_id, 'vinaigre de cidre',       2,   'c. à soupe', true,  21, 'nuoc cham'),
    (v_recipe_id, 'concombre',               1,   'unité',      false, 22, 'garniture'),
    (v_recipe_id, 'tomates cerises',         250, 'g',          false, 23, 'garniture'),
    (v_recipe_id, 'échalotes frites',        2,   'c. à soupe', false, 24, 'garniture');

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
    'Plat vietnamien d''influence française : cubes de bœuf tendres saisis rapidement au wok avec oignons et sauce huître. Le « shaking » signifie qu''on secoue le wok au lieu de remuer pour ne pas casser la croûte.',
    $instr$["Couper le bœuf en cubes de 2,5 cm et mariner avec sauce soja, sauce huître, sucre, ail émincé, sel, poivre et glutamate.",
"Laisser reposer la viande quelques minutes pendant qu'on hache oignons, concombre et tomates pour le service.",
"Chauffer la poêle à feu vif, ajouter l'huile et saisir le bœuf sans surcharger la surface.",
"Laisser les cubes reposer 20-30 secondes pour créer une croûte, puis secouer la poêle pour les retourner d'un coup.",
"Cuire 1-2 minutes en continuant à secouer pour une cuisson uniforme.",
"Ajouter les oignons jaunes en demi-lunes et remuer 1-2 minutes supplémentaires.",
"Retirer du feu, ajouter les oignons verts et mélanger pour les attendrir.",
"Dresser sur un lit de cresson, roquette, tomates et concombres tranchés."]
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
    (v_recipe_id, 'bœuf (filet ou faux-filet)',450,'g',          true,  1,  'coupé en cubes de 2,5 cm'),
    (v_recipe_id, 'sauce soja',                 15, 'ml',         true,  2,  NULL),
    (v_recipe_id, 'sauce huître',               30, 'ml',         true,  3,  NULL),
    (v_recipe_id, 'ail',                        4,  'gousse',     true,  4,  'émincé'),
    (v_recipe_id, 'sucre',                      10, 'g',          true,  5,  NULL),
    (v_recipe_id, 'oignon jaune',               1,  'unité',      true,  6,  'petit, en demi-lunes'),
    (v_recipe_id, 'oignons verts',              3,  'unité',      true,  7,  'en tronçons de 2,5-5 cm'),
    (v_recipe_id, 'sel',                        1,  'pincée',     true,  8,  'au goût'),
    (v_recipe_id, 'poivre',                     1,  'pincée',     true,  9,  'au goût'),
    (v_recipe_id, 'glutamate monosodique',      1,  'pincée',     false, 10, 'optionnel'),
    (v_recipe_id, 'huile neutre',               30, 'ml',         true,  11, 'point de fumée élevé');

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
    'Riz gluant cuit au cuiseur de riz, garni de saucisse chinoise (lap cheong), crevettes séchées et champignons shiitake. Plat de petit-déjeuner vietnamien savoureux et chewy.',
    $instr$["Rincer le riz gluant deux ou trois fois pour éliminer l'amidon excédent, puis cuire au cuiseur de riz avec 1 tasse d'eau.",
"Pendant la cuisson du riz, tremper les crevettes séchées dans l'eau chaude 15 minutes puis les hacher finement.",
"Trancher la saucisse chinoise en rondelles ou petits cubes selon préférence.",
"Dans une poêle antiadhésive, chauffer 30 ml d'huile et faire cuire les oignons verts hachés jusqu'à parfumés et vert vif.",
"Dans une grande poêle, chauffer 15 ml d'huile et faire sauter champignons, saucisse chinoise et crevettes jusqu'à ce que la saucisse rende sa graisse.",
"Ajouter l'ail haché et cuire brièvement avant d'ajouter 30 ml de sauce soja, puis retirer du feu.",
"Ajouter le riz cuit et l'huile à la ciboule, mélanger délicatement sans écraser les grains.",
"Incorporer l'effiloché de porc et la sauce soja restante si désiré.",
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
    (v_recipe_id, 'riz gluant',                300, 'g',          true,  1,  'environ 1,5 tasse'),
    (v_recipe_id, 'eau',                       240, 'ml',         true,  2,  'pour le cuiseur'),
    (v_recipe_id, 'crevettes séchées',         45,  'ml',         true,  3,  'réhydratées et hachées'),
    (v_recipe_id, 'saucisse chinoise (lap cheong)',1,'unité',     true,  4,  'tranchée finement'),
    (v_recipe_id, 'champignons shiitake',      250, 'g',          true,  5,  'tranchés'),
    (v_recipe_id, 'oignons verts',             1,   'botte',      true,  6,  NULL),
    (v_recipe_id, 'huile végétale',            45,  'ml',         true,  7,  'divisée'),
    (v_recipe_id, 'ail',                       2,   'gousse',     true,  8,  'haché'),
    (v_recipe_id, 'sauce soja',                45,  'ml',         true,  9,  'divisée'),
    (v_recipe_id, 'effiloché de boeuf',         60,  'g',          false, 10, 'optionnel'),
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
    $instr$["Porter une grande casserole d'eau à ébullition avec l'échalote et y plonger le poulet entier ; cuire jusqu'à 74°C à cœur (30-45 minutes).",
"Retirer le poulet et le laisser reposer au moins 30 minutes pour qu'il soit assez frais pour la manipulation.",
"Pendant le repos, trancher l'oignon doux en demi-lunes fines et l'assaisonner avec sel, poivre et le jus des citrons verts.",
"Une fois le poulet refroidi, l'effilocher entièrement à la main.",
"Égoutter les oignons (réserver le jus) et les mélanger au poulet avec la coriandre vietnamienne hachée.",
"Mélanger vigoureusement à la main pour bien marier les saveurs.",
"Goûter et ajuster en sel, poivre ou jus de citron vert réservé selon préférence."]
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
    (v_recipe_id, 'rau răm (coriandre vietnamienne)',60,'g',    true,  5, 'hachée, ou coriandre standard'),
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
    'Boulettes tendres porc-crevettes avec une touche croquante de jicama, servies dans une sauce tomate acidulée. Parfaites en bánh mì ou avec du pain de mie au petit-déjeuner vietnamien.',
    $instr$["Mélanger délicatement porc haché, crevettes hachées, jicama, sel, poivre, sauce de poisson, échalote, ail et chapelure panko ; éviter de sur-malaxer pour préserver la tendreté.",
"Former 16 boulettes de la taille d'une balle de golf avec les mains légèrement huilées.",
"Disposer les boulettes dans une assiette résistant à la chaleur et cuire à la vapeur 15-20 minutes jusqu'à cuisson complète ; conserver le jus libéré.",
"Pendant la cuisson, blanchir les tomates 30 secondes, peler et mixer jusqu'à lisse.",
"Chauffer la purée de tomate dans une casserole avec un peu d'huile à feu moyen jusqu'à coloration riche.",
"Verser le bouillon de poulet et mélanger ; ajouter les boulettes cuites avec leur jus.",
"Laisser mijoter quelques minutes pour que les boulettes absorbent les saveurs ; ajuster sel et poivre."]
$instr$,
    20, 30, 4, 2,
    'Vietnamienne', 'breakfast',
    ARRAY['boulettes','porc','crevettes','vietnamien','sauce tomate','jicama','bánh mì','petit-déjeuner'],
    'manual',
    'https://bunbobae.com/vietnamese-meatballs-xiu-mai/',
    'https://bunbobae.com/wp-content/uploads/2025/02/Untitled-design.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'boeuf hache',              450, 'g',          true,  1,  '80% maigre 20% gras'),
    (v_recipe_id, 'crevettes',               125, 'g',          true,  2,  'décortiquées, hachées'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'sauce de poisson',        2,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'poivre noir',             1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'échalote',                1,   'unité',      true,  6,  'petite, hachée fin'),
    (v_recipe_id, 'ail',                     5,   'gousse',     true,  7,  'haché fin'),
    (v_recipe_id, 'jicama',                  150, 'g',          true,  8,  'ou châtaignes d''eau'),
    (v_recipe_id, 'chapelure panko',         30,  'g',          true,  9,  NULL),
    (v_recipe_id, 'huile végétale',          1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'tomates',                 600, 'g',          true,  11, 'environ 2 moyennes'),
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
    'Soupe de nouilles au bœuf et pieds de porc épicée originaire de Huế. Bouillon aromatique à la citronnelle et au piment, plat réconfortant emblématique souvent dégusté au petit-déjeuner.',
    $instr$["Plonger les pieds de porc et le jarret de bœuf dans l'eau salée, porter à ébullition puis égoutter et rincer soigneusement.",
"Remettre la viande dans une cocotte propre avec 2,6 L d'eau, une échalote et les tiges de citronnelle, porter à ébullition.",
"Réduire le feu et laisser mijoter 2-3 heures à découvert en écumant régulièrement la mousse.",
"Après 1-2 heures, retirer les pieds de porc ; quand le jarret est tendre (2-3 heures), le retirer, refroidir et trancher finement.",
"Remettre les pieds de porc dans le bouillon, ajouter les cubes de bouillon bún bò Huế et porter à ébullition.",
"Faire revenir la citronnelle hachée dans 45 ml d'huile 3 minutes, verser dans le bouillon avec les oignons verts.",
"Dans la même casserole, chauffer 30 ml d'huile avec les flocons de piment, ajouter une louche de bouillon chaud, puis reverser lentement le tout dans le bouillon.",
"Goûter et assaisonner avec sauce de poisson et sel selon préférence.",
"Garnir chaque bol de vermicelles cuits, viande tranchée, herbes fraîches et servir avec quartiers de citron vert."]
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
    (v_recipe_id, 'pieds de boeuf',           1800,'g',          true,  1,  NULL),
    (v_recipe_id, 'jarret de bœuf',          900, 'g',          true,  2,  NULL),
    (v_recipe_id, 'échalote',                2,   'unité',      true,  3,  'divisées'),
    (v_recipe_id, 'citronnelle',             6,   'tige',       true,  4,  'divisée'),
    (v_recipe_id, 'huile neutre',            75,  'ml',         true,  5,  'divisée'),
    (v_recipe_id, 'flocons de piment',       15,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'sauce chili-citronnelle (sa tế)',15,'ml',    true,  7,  'tương ớt sa tế'),
    (v_recipe_id, 'cubes bouillon bún bò Huế',2,  'unité',      true,  8,  NULL),
    (v_recipe_id, 'eau',                     2600,'ml',         true,  9,  NULL),
    (v_recipe_id, 'sauce de poisson',        2,   'c. à soupe', true,  10, 'au goût'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  11, 'au goût'),
    (v_recipe_id, 'vermicelles larges',      2,   'paquet',     true,  12, 'bún tươi'),
    (v_recipe_id, 'coriandre fraîche',       1,   'botte',      true,  13, 'hachée'),
    (v_recipe_id, 'oignons verts',           1,   'botte',      true,  14, 'hachés'),
    (v_recipe_id, 'rau răm',                 1,   'botte',      true,  15, 'hachée'),
    (v_recipe_id, 'fleur de bananier',       1,   'unité',      false, 16, 'tranchée fine, garniture'),
    (v_recipe_id, 'citron vert',             2,   'unité',      true,  17, 'en quartiers');

END $$;
