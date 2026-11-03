-- =====================================================================
-- Seed: 8 recipes from greatcurryrecipes.net (2026-05-19)
--
-- Sources fetched 2026-05-19 :
--   1. https://greatcurryrecipes.net/2015/02/19/bhuna-gosht/
--   2. https://greatcurryrecipes.net/2024/05/29/air-fryer-lamb-rogan-josh-curry/
--   3. https://greatcurryrecipes.net/2024/03/30/white-lamb-curry/
--   4. https://greatcurryrecipes.net/2021/04/24/lamb-seekh-kebabs-restaurant-style/
--   5. https://greatcurryrecipes.net/2021/10/20/beef-rendang/
--   6. https://greatcurryrecipes.net/2022/08/23/ayam-masak-merah-fried-chicken-in-thick-tomato-sauce/
--   7. https://greatcurryrecipes.net/2022/08/14/chicken-kapitan/
--   8. https://greatcurryrecipes.net/2022/08/16/nasi-goreng/
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` as owned
-- recipes for the audit user `c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6`.
-- Idempotent : DELETEs by name first (FK cascade vide recipe_ingredients).
--
-- Note: la recette "Ayam Masak Merah" existe déjà via le seed
-- 2026-05-19-add-malaysian-recipes.sql (version nyonyacooking). On
-- nomme ici "Ayam Masak Merah (Great Curry)" pour cohabiter sans
-- supprimer la précédente lors du DELETE idempotent.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-greatcurryrecipes.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Bhuna Gosht',
    'Air Fryer Lamb Rogan Josh',
    'White Lamb Curry',
    'Lamb Seekh Kebabs (Restaurant Style)',
    'Beef Rendang',
    'Ayam Masak Merah (Great Curry)',
    'Chicken Kapitan',
    'Nasi Goreng'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Bhuna Gosht
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bhuna Gosht',
    'Curry d''agneau du Pendjab cuit lentement avec très peu de liquide. La sauce épaisse, presque sèche, enrobe la viande d''un caramel d''oignons, de tomates et d''épices torréfiées.',
    $instr$["Chauffer l'huile de moutarde dans une grande cocotte munie d'un couvercle. Quand l'huile frémit, ajouter les graines de moutarde.",
"Dès que les graines crépitent, incorporer les épices entières (cardamomes verte et noire, cannelle, feuilles de laurier indien) et laisser infuser environ 1 minute.",
"Ajouter les oignons hachés et les faire revenir jusqu'à ce qu'ils deviennent translucides, puis légèrement dorés. Incorporer la pâte gingembre-ail et cuire 30 secondes.",
"Ajouter les épices moulues (cumin, piment du Cachemire, coriandre, masala pour viande, curcuma), puis les tomates et la viande. Bien remuer pour enrober.",
"Verser environ 125 ml d'eau. Couvrir et porter à frémissement à feu moyen.",
"Au bout de 5 minutes, retirer le couvercle (la viande a rendu son jus). Poursuivre la cuisson 45 à 50 minutes à feu moyen, à découvert.",
"Ajouter régulièrement de petites quantités d'eau (environ 70 ml à la fois) en remuant souvent pour que rien n'accroche.",
"Quand la viande est très tendre (environ 1 h au total), la sauce doit être épaisse et adhérer aux morceaux.",
"Incorporer 1 c. à soupe de yaourt et bien mélanger. Saler.",
"Garnir de piments verts hachés, de gingembre en julienne et d'un nuage de yaourt. Servir avec des chapatis ou des naans."]
$instr$,
    20, 80, 6, 3,
    'Indienne', 'dinner',
    ARRAY['indien','agneau','curry','pendjab','sauce épaisse','authentique'],
    'manual',
    'https://greatcurryrecipes.net/2015/02/19/bhuna-gosht/',
    'https://greatcurryrecipes.net/wp-content/uploads/2015/02/bhunagosht2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile de moutarde',         70,   'ml',         true,  1,  'ou huile neutre'),
    (v_recipe_id, 'graines de moutarde brune', 2,    'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'cardamome verte',           5,    'unité',      true,  3,  'gousses, écrasées'),
    (v_recipe_id, 'cardamome noire',           3,    'unité',      true,  4,  'gousses, écrasées'),
    (v_recipe_id, 'cannelle',                  3,    'cm',         true,  5,  'en bâton'),
    (v_recipe_id, 'feuilles de laurier indien', 3,   'unité',      false, 6,  'tej patta, en option'),
    (v_recipe_id, 'oignons',                   3,    'unité',      true,  7,  'finement hachés'),
    (v_recipe_id, 'pâte gingembre-ail',        2,    'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'cumin moulu',               1,    'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'piment du Cachemire moulu', 2,    'c. à café',  true,  10, NULL),
    (v_recipe_id, 'coriandre moulue',          1,    'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'masala pour viande',        1,    'c. à soupe', false, 12, 'meat masala, en option mais recommandé'),
    (v_recipe_id, 'curcuma moulu',             0.5,  'c. à café',  true,  13, NULL),
    (v_recipe_id, 'agneau',                    1000, 'g',          true,  14, 'gigot ou épaule, en bouchées'),
    (v_recipe_id, 'tomates concassées',        400,  'g',          true,  15, NULL),
    (v_recipe_id, 'eau',                       400,  'ml',         true,  16, '125 ml au départ, puis environ 70 ml à la fois en cours de cuisson'),
    (v_recipe_id, 'yaourt nature',             1,    'c. à soupe', true,  17, 'dans la sauce'),
    (v_recipe_id, 'yaourt nature',             3,    'c. à soupe', false, 18, 'pour garnir'),
    (v_recipe_id, 'piments verts',             2,    'unité',      false, 19, 'finement hachés, pour garnir'),
    (v_recipe_id, 'gingembre',                 3,    'cm',         false, 20, 'en julienne, pour garnir'),
    (v_recipe_id, 'sel',                       1,    'c. à café',  true,  21, 'au goût');

  -- =====================================================================
  -- 2. Air Fryer Lamb Rogan Josh
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Air Fryer Lamb Rogan Josh',
    'Rogan josh d''agneau cuisiné à l''air fryer à partir d''agneau tikka précuit. La sauce veloutée à la passata et aux noix de cajou est parfumée au garam masala, au fenugrec séché et au paprika, comme au restaurant indien, en 30 minutes.',
    $instr$["Préchauffer l'air fryer à 200°C. Dans un bol, mélanger les oignons émincés, le poivron rouge, l'huile et le sel.",
"Verser dans le panier de l'air fryer et cuire 10 minutes en remuant à mi-cuisson. Ajouter la pâte gingembre-ail pendant les 2 dernières minutes.",
"Remettre le mélange cuit dans le bol et ajouter le reste des ingrédients de la sauce (curry en poudre, piment du Cachemire, cumin, coriandre, paprika, noix de cajou, passata, bouillon). Bien mélanger.",
"Mixer le tout au mixeur plongeant jusqu'à obtenir une sauce lisse.",
"Verser la sauce dans un moule métallique adapté à l'air fryer et cuire 10 minutes à 200°C.",
"Ajouter l'agneau tikka précuit et cuire 5 minutes de plus pour le réchauffer.",
"Si la sauce éclabousse, couvrir d'un couvercle ou de papier aluminium pendant la cuisson.",
"Incorporer le yaourt, les feuilles de fenugrec séchées (kasoori methi), le garam masala et la tomate en dés. Cuire encore 2 à 5 minutes.",
"Rectifier l'assaisonnement en sel. Garnir de coriandre fraîche hachée et d'oignon rouge en dés. Servir avec du naan ou du riz basmati."]
$instr$,
    10, 30, 2, 3,
    'Indienne', 'dinner',
    ARRAY['indien','agneau','rogan josh','air fryer','cachemire','curry'],
    'manual',
    'https://greatcurryrecipes.net/2024/05/29/air-fryer-lamb-rogan-josh-curry/',
    'https://greatcurryrecipes.net/wp-content/uploads/2024/05/airfryerroganjosh9.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'agneau',                        300, 'g',          true,  1,  'précuit façon tikka (tandoori)'),
    (v_recipe_id, 'huile de colza',                2,   'c. à soupe', true,  2,  'ou huile en spray'),
    (v_recipe_id, 'oignons',                       250, 'g',          true,  3,  'environ 2 oignons, émincés'),
    (v_recipe_id, 'poivron rouge',                 1,   'unité',      true,  4,  'épépiné, coupé en deux'),
    (v_recipe_id, 'sel',                           0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'pâte gingembre-ail',            1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'curry en poudre',               1,   'c. à soupe', true,  7,  'mélange d''épices pour curry'),
    (v_recipe_id, 'piment du Cachemire moulu',     0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'cumin moulu',                   0.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'coriandre moulue',              0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'paprika',                       1.5, 'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'noix de cajou',                 8,   'g',          true,  12, 'environ 5 noix'),
    (v_recipe_id, 'passata de tomate',             150, 'ml',         true,  13, NULL),
    (v_recipe_id, 'bouillon de viande',            250, 'ml',         true,  14, 'chaud'),
    (v_recipe_id, 'yaourt nature',                 2,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'tomate',                        1,   'unité',      true,  16, 'en dés (ou 10 tomates cerises)'),
    (v_recipe_id, 'feuilles de fenugrec séchées',  0.5, 'c. à café',  true,  17, 'kasoori methi'),
    (v_recipe_id, 'garam masala',                  0.5, 'c. à café',  true,  18, NULL),
    (v_recipe_id, 'coriandre fraîche',             2,   'c. à soupe', false, 19, 'hachée, pour garnir'),
    (v_recipe_id, 'oignon rouge',                  0.5, 'unité',      false, 20, 'en dés, pour garnir');

  -- =====================================================================
  -- 3. White Lamb Curry
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'White Lamb Curry',
    'Curry blanc d''agneau façon restaurant indien : une sauce blanche de base enrichie de beurre, de crème et d''une pointe de curcuma pour le parfum. Prêt en 15 minutes avec de la viande précuite.',
    $instr$["Chauffer l'huile (ou le ghee) dans un wok à feu moyen-vif. Ajouter l'ail et le gingembre hachés et les faire sauter 30 secondes.",
"Ajouter les piments verts hachés et cuire encore 30 secondes.",
"Verser 250 ml de sauce blanche de base façon restaurant. En ajouter davantage si besoin.",
"Incorporer les 250 g d'agneau précuit.",
"Ajouter le beurre et le laisser fondre dans la sauce.",
"Verser la crème fraîche et bien mélanger.",
"Saupoudrer de poivre blanc et d'une pointe de curcuma. Fouetter et saler.",
"Servir chaud avec des chapatis ou du riz basmati."]
$instr$,
    5, 10, 2, 2,
    'Indienne', 'dinner',
    ARRAY['indien','agneau','curry blanc','crémeux','restaurant','rapide'],
    'manual',
    'https://greatcurryrecipes.net/2024/03/30/white-lamb-curry/',
    'https://greatcurryrecipes.net/wp-content/uploads/2024/03/whitelambcurry9.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile de colza',              30,  'ml',     true,  1,  'ou ghee'),
    (v_recipe_id, 'ail',                         15,  'g',      true,  2,  'finement haché'),
    (v_recipe_id, 'gingembre',                   15,  'g',      true,  3,  'finement haché'),
    (v_recipe_id, 'piments verts',               15,  'g',      false, 4,  'hachés, en option'),
    (v_recipe_id, 'sauce blanche',               250, 'ml',     true,  5,  'sauce de base façon restaurant indien (BIR), préparée à l''avance'),
    (v_recipe_id, 'agneau',                      250, 'g',      true,  6,  'précuit ou rôti'),
    (v_recipe_id, 'beurre',                      15,  'g',      true,  7,  NULL),
    (v_recipe_id, 'crème fraîche',               70,  'ml',     true,  8,  NULL),
    (v_recipe_id, 'curcuma moulu',               1,   'pincée', true,  9,  'juste une pointe'),
    (v_recipe_id, 'poivre blanc',                2.5, 'g',      false, 10, 'moulu, en option'),
    (v_recipe_id, 'sel',                         1,   'c. à café', true, 11, 'au goût');

  -- =====================================================================
  -- 4. Lamb Seekh Kebabs (Restaurant Style)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Lamb Seekh Kebabs (Restaurant Style)',
    'Brochettes d''agneau haché façon restaurant indien : la viande est pétrie avec de l''ail, des piments, de la menthe et de la coriandre fraîches, puis grillée à feu vif, idéalement au charbon de bois. Servies avec une sauce menthe-coriandre.',
    $instr$["Éplucher l'oignon, le hacher au mixeur, puis l'essorer énergiquement dans un linge propre pour retirer un maximum d'humidité (sinon la viande ne tient pas sur les brochettes).",
"Mixer l'ail, les piments verts et les herbes fraîches (menthe et coriandre) en une pâte fine.",
"Dans un grand bol, réunir l'agneau haché, l'oignon essoré, la pâte d'aromates, le sel et toutes les épices moulues (piment du Cachemire, coriandre, cumin, poivre noir). Pétrir longuement jusqu'à obtenir un mélange homogène et collant.",
"Couvrir et réfrigérer au moins 2 h (idéalement une nuit) pour que la viande se tienne bien.",
"Préparer un barbecue à chaleur directe avec une zone très chaude et une zone moins chaude. Garder un bol d'eau à proximité.",
"Se mouiller les mains, prendre une boule de viande et la façonner en forme de saucisse autour de la brochette. Serrer fermement pour que la viande adhère.",
"Saisir les brochettes sur la zone la plus chaude en les tournant régulièrement pour une cuisson uniforme.",
"Quand les brochettes sont dorées, les déplacer vers la zone moins chaude et poursuivre la cuisson 2 à 3 minutes.",
"Servir aussitôt avec un chutney vert (sauce menthe-coriandre), des quartiers de citron vert et de l'oignon rouge mariné."]
$instr$,
    25, 10, 8, 3,
    'Indienne', 'appetizer',
    ARRAY['indien','agneau','brochettes','grillé','tandoor','street food'],
    'manual',
    'https://greatcurryrecipes.net/2021/04/24/lamb-seekh-kebabs-restaurant-style/',
    'https://greatcurryrecipes.net/wp-content/uploads/2021/04/laseekh6.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'agneau haché',            1000, 'g',         true,  1,  'environ 20 % de matière grasse'),
    (v_recipe_id, 'oignon rouge',            1,    'unité',     true,  2,  'mixé puis essoré'),
    (v_recipe_id, 'ail',                     5,    'gousse',    true,  3,  'écrasé'),
    (v_recipe_id, 'piments oiseau verts',    4,    'unité',     true,  4,  NULL),
    (v_recipe_id, 'menthe fraîche',          30,   'g',         true,  5,  'feuilles, hachées'),
    (v_recipe_id, 'coriandre fraîche',       30,   'g',         true,  6,  'hachée'),
    (v_recipe_id, 'sel',                     5,    'g',         true,  7,  NULL),
    (v_recipe_id, 'piment du Cachemire moulu', 15, 'g',         true,  8,  'ajuster au goût'),
    (v_recipe_id, 'coriandre moulue',        10,   'g',         true,  9,  NULL),
    (v_recipe_id, 'cumin moulu',             5,    'g',         true,  10, NULL),
    (v_recipe_id, 'poivre noir moulu',       2.5,  'g',         true,  11, NULL),
    (v_recipe_id, 'brochettes',              8,    'unité',     true,  12, 'plates, en métal idéalement'),
    (v_recipe_id, 'chutney vert',            120,  'ml',        false, 13, 'sauce menthe-coriandre, pour servir'),
    (v_recipe_id, 'citron vert',             2,    'unité',     false, 14, 'en quartiers, pour servir'),
    (v_recipe_id, 'oignon rouge',            1,    'unité',     false, 15, 'émincé et mariné, pour servir');

  -- =====================================================================
  -- 5. Beef Rendang
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Beef Rendang',
    'Rendang de bœuf indonésien (Sumatra) : la viande mijote jusqu''à 90 minutes dans une pâte d''aromates et du lait de coco, jusqu''à ce que la sauce réduise et caramélise. Le kerisik (noix de coco torréfiée et pilée) lui donne sa saveur caractéristique.',
    $instr$["Pâte de rendang : mixer en pâte fine les échalotes, l'ail, le galanga, les feuilles de combava, la citronnelle et les piments séchés (trempés 20 min). Ajouter un peu d'eau de trempage si besoin.",
"Chauffer l'huile dans un wok ou une grande cocotte à feu moyen-vif. Ajouter les épices entières (cannelle, anis étoilé, clous de girofle, cardamome) et les laisser infuser 30 secondes.",
"Incorporer la pâte de rendang et la faire revenir 1 minute pour éliminer le goût cru.",
"Ajouter la citronnelle tranchée et le bœuf en cubes. Bien mélanger et faire colorer 5 minutes.",
"Verser le lait de coco et l'eau, puis ajouter la pâte de tamarin, le kerisik, le sucre de palme et les feuilles de combava émincées.",
"Laisser mijoter à découvert 60 à 90 minutes en remuant régulièrement, jusqu'à ce que la sauce ait presque entièrement réduit et que la viande soit fondante.",
"Saler et sucrer au goût en fin de cuisson. Garnir de piments rouges émincés et d'oignons verts.",
"Servir avec du riz blanc nature."]
$instr$,
    15, 90, 4, 3,
    'Indonésienne', 'dinner',
    ARRAY['indonésien','bœuf','rendang','lait de coco','minangkabau','épicé'],
    'manual',
    'https://greatcurryrecipes.net/2021/10/20/beef-rendang/',
    'https://greatcurryrecipes.net/wp-content/uploads/2021/10/ber9.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile de coco',               70,  'ml',         true,  1,  'ou huile de colza'),
    (v_recipe_id, 'cannelle',                    5,   'cm',         true,  2,  'en bâton'),
    (v_recipe_id, 'anis étoilé',                 2,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'clous de girofle',            4,   'unité',      true,  4,  NULL),
    (v_recipe_id, 'cardamome verte',             4,   'unité',      true,  5,  'gousses, écrasées'),
    (v_recipe_id, 'citronnelle',                 2,   'unité',      true,  6,  'parties blanches, tranchées'),
    (v_recipe_id, 'bœuf',                        800, 'g',          true,  7,  'plat de côtes désossé ou aloyau, en cubes'),
    (v_recipe_id, 'lait de coco',                400, 'ml',         true,  8,  'épais'),
    (v_recipe_id, 'eau',                         250, 'ml',         true,  9,  NULL),
    (v_recipe_id, 'pâte de tamarin',             1.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'feuilles de combava',         5,   'unité',      true,  11, 'finement émincées, sans la nervure'),
    (v_recipe_id, 'kerisik',                     90,  'ml',         true,  12, 'noix de coco râpée torréfiée puis pilée'),
    (v_recipe_id, 'sucre de palme',              1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'sel',                         1,   'c. à café',  true,  14, 'au goût'),
    (v_recipe_id, 'piments rouges éperon',       2,   'unité',      false, 15, 'émincés, pour garnir'),
    (v_recipe_id, 'oignons verts',               3,   'unité',      false, 16, 'émincés, pour garnir'),
    -- Pâte de rendang
    (v_recipe_id, 'échalotes',                   6,   'unité',      true,  17, 'pour la pâte'),
    (v_recipe_id, 'ail',                         6,   'gousse',     true,  18, 'pour la pâte'),
    (v_recipe_id, 'galanga',                     25,  'g',          true,  19, 'pour la pâte'),
    (v_recipe_id, 'feuilles de combava',         2,   'unité',      true,  20, 'pour la pâte'),
    (v_recipe_id, 'citronnelle',                 2,   'unité',      true,  21, 'pour la pâte'),
    (v_recipe_id, 'piments rouges séchés',       12,  'unité',      true,  22, 'trempés 20 min, pour la pâte'),
    -- Accompagnement
    (v_recipe_id, 'riz blanc',                   300, 'g',          false, 23, 'poids cru, cuit pour servir');

  -- =====================================================================
  -- 6. Ayam Masak Merah (Great Curry)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Ayam Masak Merah (Great Curry)',
    'Variante du classique malais : poulet frit croustillant enrobé d''une sauce épaisse à la passata et au lait de coco, parfumée à l''anis étoilé, à la cannelle et à la cardamome. Plus riche que la version traditionnelle.',
    $instr$["Frotter les morceaux de poulet avec le curcuma, le sel et la farine (ou la fécule de maïs). Laisser reposer 10 à 15 minutes, ou réfrigérer à couvert.",
"Pâte d'épices : mixer en pâte épaisse les piments séchés (trempés 10 min), l'oignon rouge, l'ail, le gingembre, le galanga et la citronnelle, avec un peu d'eau si besoin.",
"Chauffer l'huile à feu moyen-vif jusqu'à ce que des bulles se forment autour d'une baguette en bois plongée dedans.",
"Frire le poulet en petites quantités jusqu'à ce qu'il soit doré et croustillant (environ 8 min par fournée). Égoutter sur une grille.",
"Garder environ 70 ml d'huile dans le wok et retirer le reste. Réchauffer à feu moyen-vif.",
"Ajouter les épices entières (anis étoilé, cannelle, cardamome, clous de girofle) et les faire revenir 30 secondes jusqu'à ce qu'elles embaument.",
"Incorporer la pâte d'épices et cuire environ 1 minute, jusqu'à ce que l'huile remonte.",
"Verser la passata et le lait de coco. Laisser mijoter quelques minutes pour épaissir.",
"Ajouter le poulet frit et l'enrober de sauce. Rectifier l'assaisonnement en sel et en poivre. Servir avec du riz blanc."]
$instr$,
    15, 30, 4, 3,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','poulet','sauce tomate','lait de coco','épicé','fêtes'],
    'manual',
    'https://greatcurryrecipes.net/2022/08/23/ayam-masak-merah-fried-chicken-in-thick-tomato-sauce/',
    'https://greatcurryrecipes.net/wp-content/uploads/2022/08/ay14.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',          1000, 'g',          true,  1,  'désossées, avec la peau'),
    (v_recipe_id, 'curcuma moulu',              1,    'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'sel',                        1,    'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'farine de blé',              120,  'g',          true,  4,  'ou fécule de maïs, pour l''enrobage'),
    (v_recipe_id, 'huile de colza',             250,  'ml',         true,  5,  'pour la friture'),
    -- Pâte d'épices
    (v_recipe_id, 'piments rouges séchés',      10,   'unité',      true,  6,  'trempés 10 min'),
    (v_recipe_id, 'oignon rouge',               1,    'unité',      true,  7,  NULL),
    (v_recipe_id, 'ail',                        6,    'gousse',     true,  8,  NULL),
    (v_recipe_id, 'gingembre',                  50,   'g',          true,  9,  NULL),
    (v_recipe_id, 'galanga',                    25,   'g',          true,  10, NULL),
    (v_recipe_id, 'citronnelle',                2,    'unité',      true,  11, 'parties blanches'),
    -- Sauce
    (v_recipe_id, 'anis étoilé',                1,    'unité',      true,  12, 'brisé'),
    (v_recipe_id, 'clous de girofle',           2,    'unité',      true,  13, NULL),
    (v_recipe_id, 'cannelle',                   3,    'cm',         true,  14, 'en bâton'),
    (v_recipe_id, 'cardamome verte',            2,    'unité',      true,  15, 'écrasées'),
    (v_recipe_id, 'passata',                    400,  'ml',         true,  16, 'ou tomates concassées'),
    (v_recipe_id, 'lait de coco',               400,  'ml',         true,  17, 'épais'),
    (v_recipe_id, 'poivre noir moulu',          1,    'pincée',     true,  18, 'au goût'),
    -- Accompagnement
    (v_recipe_id, 'riz blanc',                  300,  'g',          false, 19, 'poids cru, cuit pour servir');

  -- =====================================================================
  -- 7. Chicken Kapitan
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Kapitan',
    'Curry nyonya de Penang hérité de l''époque coloniale. Sa sauce épaisse et presque sèche au lait de coco est parfumée à la citronnelle, au galanga, à la pâte de crevettes (belacan) et aux feuilles de combava, puis relevée d''un trait de citron vert.',
    $instr$["Faire tremper les piments séchés dans de l'eau bouillante environ 10 minutes pour les ramollir.",
"Pâte : mixer les piments trempés avec les échalotes, l'ail, les feuilles de combava, la citronnelle, les piments frais, le galanga, le gingembre, les noix de bancoul (ou de macadamia) et la pâte de crevettes jusqu'à obtenir une pâte lisse, en ajoutant un peu d'eau de trempage si besoin.",
"Frotter les cuisses et les pilons de poulet avec le curcuma moulu. (La pâte et le poulet au curcuma peuvent être préparés la veille.)",
"Chauffer l'huile dans une grande cocotte à feu moyen-vif. Ajouter la pâte et la faire revenir environ 2 minutes, jusqu'à ce qu'elle embaume.",
"Ajouter les morceaux de poulet, bien les enrober de pâte et les faire dorer quelques minutes.",
"Verser l'eau et ajouter les feuilles de combava finement émincées. Porter à ébullition, puis baisser le feu.",
"Laisser mijoter environ 20 minutes à feu moyen, jusqu'à ce que le poulet soit cuit et que la sauce ait épaissi.",
"Incorporer le lait de coco. Ce curry doit rester presque sec ; ajouter davantage de lait de coco si l'on préfère plus de sauce.",
"Rectifier l'assaisonnement en sel et en sucre. Presser le citron vert par-dessus. Garnir de coriandre et de feuilles de combava émincées. Servir avec du riz blanc."]
$instr$,
    10, 30, 4, 2,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','peranakan','penang','poulet','curry','colonial'],
    'manual',
    'https://greatcurryrecipes.net/2022/08/14/chicken-kapitan/',
    'https://greatcurryrecipes.net/wp-content/uploads/2022/08/ckap1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',           4,   'unité',      true,  1,  'avec la peau'),
    (v_recipe_id, 'pilons de poulet',            4,   'unité',      true,  2,  'avec la peau'),
    (v_recipe_id, 'curcuma moulu',               1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'huile d''arachide',           3,   'c. à soupe', true,  4,  'ou huile de colza'),
    (v_recipe_id, 'feuilles de combava',         3,   'unité',      true,  5,  'finement émincées, dont un peu pour garnir'),
    (v_recipe_id, 'eau',                         500, 'ml',         true,  6,  NULL),
    (v_recipe_id, 'lait de coco',                60,  'ml',         true,  7,  'épais'),
    (v_recipe_id, 'citron vert',                 1,   'unité',      true,  8,  'pressé en finition'),
    (v_recipe_id, 'sucre',                       1,   'c. à café',  false, 9,  'en option'),
    (v_recipe_id, 'sel',                         1,   'c. à café',  true,  10, 'au goût'),
    -- Pâte
    (v_recipe_id, 'piments oiseaux séchés',      15,  'unité',      true,  11, 'trempés, pour la pâte'),
    (v_recipe_id, 'échalotes',                   8,   'unité',      true,  12, 'de préférence banane, pour la pâte'),
    (v_recipe_id, 'ail',                         6,   'gousse',     true,  13, 'écrasé, pour la pâte'),
    (v_recipe_id, 'feuilles de combava',         3,   'unité',      true,  14, 'pour la pâte'),
    (v_recipe_id, 'citronnelle',                 2,   'unité',      true,  15, 'parties blanches, pour la pâte'),
    (v_recipe_id, 'piments rouges frais',        4,   'unité',      true,  16, 'type oiseau, pour la pâte'),
    (v_recipe_id, 'galanga',                     50,  'g',          true,  17, 'pour la pâte'),
    (v_recipe_id, 'gingembre',                   12,  'g',          true,  18, 'pour la pâte'),
    (v_recipe_id, 'noix de bancoul',             4,   'unité',      true,  19, 'kemiri (ou noix de macadamia), pour la pâte'),
    (v_recipe_id, 'pâte de crevettes',           0.5, 'c. à café',  true,  20, 'belacan, pour la pâte'),
    -- Service
    (v_recipe_id, 'coriandre fraîche',           4,   'brin',       false, 21, 'pour garnir'),
    (v_recipe_id, 'riz blanc',                   300, 'g',          false, 22, 'poids cru, cuit pour servir');

  -- =====================================================================
  -- 8. Nasi Goreng
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Nasi Goreng',
    'Riz frit indonésien classique, relevé de kecap manis (sauce soja sucrée), de sambal oelek et de pâte de crevettes pour la profondeur. Servi avec un œuf frit à l''asiatique, du concombre et des quartiers de tomate.',
    $instr$["Sambal oelek : mixer les piments rouges, le vinaigre de riz et le sel jusqu'à obtenir une sauce lisse. Réserver.",
"Enrober le poulet en dés de 1 c. à soupe de kecap manis et de 1 c. à café de sauce soja. Laisser reposer.",
"Préparer la sauce finale en mélangeant 2 c. à soupe de kecap manis et 2 c. à soupe de sauce soja. Réserver.",
"Chauffer l'huile dans un wok à feu moyen-vif. Faire revenir les échalotes hachées environ 1 minute.",
"Ajouter l'ail haché, les piments verts et la pâte de crevettes. Bien mélanger.",
"Pousser le mélange sur les bords du wok et déposer le poulet au centre. Cuire 5 minutes, jusqu'à ce qu'il soit légèrement doré.",
"Mélanger le poulet aux aromates. Ajouter le riz cuit refroidi et bien mélanger en cassant les amas.",
"Verser la sauce kecap-soja et mélanger jusqu'à obtenir une couleur dorée uniforme.",
"Saupoudrer de poivre blanc. Dresser avec le concombre, les quartiers de tomate, le sambal oelek, les échalotes frites et un œuf frit à l'asiatique (blanc croustillant en dentelle, jaune coulant)."]
$instr$,
    10, 15, 4, 2,
    'Indonésienne', 'dinner',
    ARRAY['indonésien','riz frit','poulet','kecap manis','sambal','street food'],
    'manual',
    'https://greatcurryrecipes.net/2022/08/16/nasi-goreng/',
    'https://greatcurryrecipes.net/wp-content/uploads/2022/08/na2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',        450, 'g',          true,  1,  'en petits dés'),
    (v_recipe_id, 'kecap manis',             3,   'c. à soupe', true,  2,  'sauce soja sucrée ; 1 pour le poulet + 2 pour la sauce'),
    (v_recipe_id, 'sauce soja',              35,  'ml',         true,  3,  '1 c. à café pour le poulet + 2 c. à soupe pour la sauce'),
    (v_recipe_id, 'huile d''arachide',       3,   'c. à soupe', true,  4,  'ou huile de colza'),
    (v_recipe_id, 'échalotes',               4,   'unité',      true,  5,  'finement hachées'),
    (v_recipe_id, 'ail',                     4,   'gousse',     true,  6,  'finement haché'),
    (v_recipe_id, 'piments oiseau verts',    2,   'unité',      true,  7,  'finement hachés'),
    (v_recipe_id, 'pâte de crevettes',       0.5, 'c. à café',  true,  8,  'terasi ou belacan'),
    (v_recipe_id, 'riz cuit',                600, 'g',          true,  9,  'basmati ou jasmin, de la veille, refroidi'),
    (v_recipe_id, 'poivre blanc moulu',      0.5, 'c. à café',  true,  10, NULL),
    -- Sambal oelek
    (v_recipe_id, 'piments rouges',          120, 'g',          true,  11, 'pour le sambal oelek'),
    (v_recipe_id, 'vinaigre de riz',         1,   'c. à soupe', true,  12, 'pour le sambal'),
    (v_recipe_id, 'sel',                     1.5, 'c. à café',  true,  13, 'pour le sambal'),
    -- Service
    (v_recipe_id, 'œufs',                    4,   'unité',      false, 14, 'frits à l''asiatique'),
    (v_recipe_id, 'concombre',               1,   'unité',      false, 15, 'en tranches'),
    (v_recipe_id, 'tomates',                 4,   'unité',      false, 16, 'en quartiers'),
    (v_recipe_id, 'échalotes frites',        2,   'c. à soupe', false, 17, 'pour garnir');

  RAISE NOTICE 'Seed: 8 great-curry-recipes recipes inserted for user %', v_user_id;
END $$;
