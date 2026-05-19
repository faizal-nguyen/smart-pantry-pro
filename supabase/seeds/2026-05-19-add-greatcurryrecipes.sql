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
    'Curry d''agneau du Pendjab cuit lentement avec très peu de liquide. La sauce épaisse, presque sèche, enrobe la viande dans un caramel d''oignons, tomates et épices torréfiées.',
    $instr$["Chauffer l'huile de moutarde dans une grande cocotte à couvercle. Quand l'huile frémit, ajouter les graines de moutarde.",
"Une fois les graines qui crépitent, incorporer les épices entières (cardamomes verte et noire, cannelle, laurier indien) et laisser infuser environ 1 minute.",
"Ajouter les oignons hachés et faire revenir jusqu'à ce qu'ils deviennent translucides puis jaune clair. Incorporer la pâte d'ail-gingembre et cuire 30 secondes.",
"Ajouter les épices moulues (cumin, piment du Cachemire, coriandre, masala de viande, curcuma), puis les tomates et la viande. Bien remuer pour enrober.",
"Verser environ 125 ml d'eau. Couvrir et porter à frémissement à feu moyen.",
"Au bout de 5 minutes, retirer le couvercle (la viande a rendu son jus). Poursuivre 45 à 50 minutes à feu moyen, à découvert.",
"Ajouter régulièrement de petites quantités d'eau (~70 ml à la fois) en remuant souvent pour éviter que cela accroche.",
"Quand la viande est très tendre (~1 h au total), la sauce doit être épaisse et adhérer aux morceaux.",
"Incorporer 1 c. à soupe de yaourt et bien mélanger. Saler.",
"Garnir de piments verts hachés, gingembre julienné et un nuage de yaourt. Servir avec chapatis ou naans."]
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
    (v_recipe_id, 'bâton de cannelle',         3,    'cm',         true,  5,  NULL),
    (v_recipe_id, 'feuilles de laurier indien', 3,   'unité',      false, 6,  'tej patta, optionnel'),
    (v_recipe_id, 'oignons',                   3,    'unité',      true,  7,  'finement hachés'),
    (v_recipe_id, 'pâte d''ail et gingembre',  2,    'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'cumin moulu',               1,    'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'piment du Cachemire moulu', 2,    'c. à café',  true,  10, NULL),
    (v_recipe_id, 'coriandre moulue',          1,    'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'masala de viande',          1,    'c. à soupe', false, 12, 'optionnel mais recommandé'),
    (v_recipe_id, 'curcuma moulu',             0.5,  'c. à café',  true,  13, NULL),
    (v_recipe_id, 'agneau (gigot/épaule)',     1000, 'g',          true,  14, 'en bouchées'),
    (v_recipe_id, 'tomates concassées',        400,  'g',          true,  15, NULL),
    (v_recipe_id, 'yaourt nature',             1,    'c. à soupe', true,  16, 'dans la sauce'),
    (v_recipe_id, 'yaourt nature',             3,    'c. à soupe', false, 17, 'pour garnir'),
    (v_recipe_id, 'piments verts',             2,    'unité',      false, 18, 'finement hachés, garniture'),
    (v_recipe_id, 'gingembre',                 3,    'cm',         false, 19, 'julienné, garniture'),
    (v_recipe_id, 'sel',                       1,    'c. à café',  true,  20, 'au goût');

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
    'Rogan Josh d''agneau cuisiné au air fryer à partir de tikka précuit. Sauce passata-noix de cajou veloutée parfumée de garam masala, methi kasoori et paprika. Style restaurant indien en 30 min.',
    $instr$["Préchauffer le air fryer à 200°C. Dans un bol, mélanger les oignons tranchés, le poivron rouge, l'huile et le sel.",
"Verser dans le panier du air fryer et cuire 10 minutes en remuant à mi-cuisson. Ajouter la pâte d'ail-gingembre les 2 dernières minutes.",
"Reverser le mélange cuit dans le bol et ajouter le reste des ingrédients de la sauce (épices, noix de cajou, passata, bouillon). Bien mélanger.",
"Mixer le tout au mixeur plongeant jusqu'à obtenir une sauce lisse.",
"Verser la sauce dans un moule métallique adapté au air fryer et cuire 10 minutes à 200°C.",
"Ajouter l'agneau tikka précuit et cuire 5 minutes de plus pour réchauffer.",
"Si la sauce crépite, couvrir avec un couvercle ou du papier alu pendant la cuisson.",
"Incorporer le yaourt, le methi kasoori (feuilles de fenugrec séchées), le garam masala et la tomate en dés. Cuire 2 à 5 minutes de plus.",
"Rectifier en sel. Garnir de coriandre fraîche hachée et d'oignon rouge en dés. Servir avec naan ou riz basmati."]
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
    (v_recipe_id, 'agneau tikka précuit',         300, 'g',          true,  1,  'tandoori'),
    (v_recipe_id, 'huile de colza',                2,   'c. à soupe', false, 2,  'ou spray cuisson'),
    (v_recipe_id, 'oignons',                       250, 'g',          true,  3,  '~2 oignons, en lamelles'),
    (v_recipe_id, 'poivron rouge',                 1,   'unité',      true,  4,  'épépiné, coupé en deux'),
    (v_recipe_id, 'sel',                           0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'pâte d''ail et gingembre',      1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'curry en poudre',               1,   'c. à soupe', true,  7,  'mixed curry powder'),
    (v_recipe_id, 'piment du Cachemire moulu',     0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'cumin moulu',                   0.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'coriandre moulue',              0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'paprika',                       1.5, 'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'noix de cajou',                 5,   'unité',      true,  12, NULL),
    (v_recipe_id, 'passata de tomate',             150, 'ml',         true,  13, NULL),
    (v_recipe_id, 'bouillon de viande',            250, 'ml',         true,  14, 'chaud'),
    (v_recipe_id, 'yaourt nature',                 2,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'tomate fraîche',                1,   'unité',      true,  16, 'ou 10 tomates cerises'),
    (v_recipe_id, 'methi kasoori',                 0.5, 'c. à café',  true,  17, 'fenugrec séché'),
    (v_recipe_id, 'garam masala',                  0.5, 'c. à café',  true,  18, NULL),
    (v_recipe_id, 'coriandre fraîche',             2,   'c. à soupe', false, 19, 'hachée, garniture'),
    (v_recipe_id, 'oignon rouge',                  0.5, 'unité',      false, 20, 'en dés, garniture');

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
    'Curry blanc d''agneau façon restaurant indien : sauce base "white sauce" enrichie de beurre, crème et juste assez de curcuma pour le parfum. Prêt en 15 minutes avec une viande précuite.',
    $instr$["Chauffer l'huile (ou le ghee) dans un wok à feu moyen-vif. Ajouter l'ail et le gingembre, sauter 30 secondes.",
"Ajouter les piments verts hachés et cuire encore 30 secondes.",
"Verser 250 ml de sauce blanche restaurant. Ajouter plus si besoin.",
"Incorporer 250 g d'agneau précuit.",
"Ajouter le beurre et le laisser fondre dans la sauce.",
"Verser la crème fraîche et bien mélanger.",
"Saupoudrer de poivre blanc et d'une pointe de curcuma. Fouetter. Saler.",
"Servir chaud avec chapatis ou riz basmati."]
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
    (v_recipe_id, 'huile de colza ou ghee',      30,  'ml',     true,  1,  NULL),
    (v_recipe_id, 'ail',                         15,  'g',      true,  2,  'finement haché'),
    (v_recipe_id, 'gingembre',                   15,  'g',      true,  3,  'finement haché'),
    (v_recipe_id, 'piments verts',               15,  'g',      false, 4,  'hachés, facultatif'),
    (v_recipe_id, 'sauce blanche restaurant',    250, 'ml',     true,  5,  'base BIR white sauce'),
    (v_recipe_id, 'agneau précuit',              250, 'g',      true,  6,  'précuit ou rôti'),
    (v_recipe_id, 'beurre',                      15,  'g',      true,  7,  NULL),
    (v_recipe_id, 'crème fraîche',               70,  'ml',     true,  8,  NULL),
    (v_recipe_id, 'curcuma moulu',               0.5, 'g',      true,  9,  'juste une pointe'),
    (v_recipe_id, 'poivre blanc',                2.5, 'g',      false, 10, 'facultatif'),
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
    'Brochettes d''agneau haché façon restaurant indien : viande pétrie avec ail, piments, menthe et coriandre fraîches, puis cuite au feu vif (charbon idéal). Sert avec une sauce menthe-coriandre.',
    $instr$["Éplucher l'oignon, le hacher au mixeur, puis l'essorer énergiquement dans un linge propre pour retirer un maximum d'humidité (sinon la viande ne tient pas sur les brochettes).",
"Mixer ail, piments verts et herbes fraîches (menthe + coriandre) en pâte fine.",
"Dans un grand bol, combiner l'agneau haché avec la pâte d'aromates et toutes les épices moulues (piment Cachemire, coriandre, cumin, poivre noir). Pétrir longuement jusqu'à mélange homogène et collant.",
"Couvrir et réfrigérer minimum 2 h (idéal : une nuit) pour que la viande lie bien.",
"Préparer un feu à chaleur directe avec une zone chaude et une zone moins chaude. Tenir un bol d'eau à proximité.",
"Mouiller les mains, prendre une boule de viande et la mouler en forme de saucisse autour de la brochette. Serrer fermement pour que la viande adhère.",
"Saisir les brochettes sur la zone la plus chaude en tournant régulièrement pour une cuisson uniforme.",
"Quand les brochettes sont dorées, les déplacer vers la zone moins chaude et continuer la cuisson 2-3 minutes.",
"Servir immédiatement avec sauce menthe-coriandre, citron vert et oignon rouge mariné."]
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
    (v_recipe_id, 'agneau haché',            1000, 'g',         true,  1,  'ratio 80/20 viande/gras'),
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
    (v_recipe_id, 'brochettes',              8,    'unité',     true,  12, 'plates métal idéalement');

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
    'Rendang de bœuf indonésien (Sumatra) : viande mijotée 90 min dans une pâte d''aromates et lait de coco jusqu''à ce que la sauce caramélise. Kerisik (noix de coco torréfiée pilée) pour la signature.',
    $instr$["Pâte de rendang : mixer en pâte fine les échalotes, ail, galanga, feuilles de combava, citronnelle et piments séchés (trempés 20 min). Ajouter un peu d'eau de trempage si besoin.",
"Chauffer l'huile dans un wok ou une grande cocotte à feu moyen-vif. Ajouter les épices entières (cannelle, anis étoilé, clous de girofle, cardamomes) et infuser 30 secondes.",
"Incorporer la pâte de rendang et faire revenir 1 minute pour éliminer le goût cru.",
"Ajouter la citronnelle tranchée et le bœuf en cubes. Bien mélanger et faire colorer 5 minutes.",
"Verser le lait de coco et l'eau, ajouter la pâte de tamarin, le kerisik (noix de coco grillée pilée), le sucre de palme et les feuilles de combava émincées.",
"Mijoter à découvert 60 à 90 minutes en remuant régulièrement, jusqu'à ce que la sauce ait pratiquement réduit et que la viande soit fondante.",
"Saler et sucrer au goût en fin de cuisson. Garnir de piments rouges éperon en tranches et de jeunes oignons.",
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
    (v_recipe_id, 'huile de coco',               70,  'ml',         true,  1,  'ou colza'),
    (v_recipe_id, 'bâton de cannelle',           5,   'cm',         true,  2,  NULL),
    (v_recipe_id, 'anis étoilé',                 2,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'clous de girofle',            4,   'unité',      true,  4,  NULL),
    (v_recipe_id, 'cardamome verte',             4,   'unité',      true,  5,  'gousses, écrasées'),
    (v_recipe_id, 'citronnelle',                 2,   'unité',      true,  6,  'parties blanches, tranchées'),
    (v_recipe_id, 'bœuf (côtes courtes)',        800, 'g',          true,  7,  'ou aloyau'),
    (v_recipe_id, 'lait de coco épais',          400, 'ml',         true,  8,  NULL),
    (v_recipe_id, 'eau',                         250, 'ml',         true,  9,  NULL),
    (v_recipe_id, 'pâte de tamarin',             1.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'feuilles de combava',         5,   'unité',      true,  11, 'finement émincées, sans tiges'),
    (v_recipe_id, 'kerisik',                     90,  'ml',         true,  12, 'noix de coco grillée pilée'),
    (v_recipe_id, 'sucre de palme',              1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'sel',                         1,   'c. à café',  true,  14, 'au goût'),
    (v_recipe_id, 'piments rouges éperon',       2,   'unité',      false, 15, 'tranchés, garniture'),
    (v_recipe_id, 'oignons verts',               3,   'unité',      false, 16, 'tranchés, garniture'),
    -- Pâte de rendang
    (v_recipe_id, 'échalotes',                   6,   'unité',      true,  17, 'pour la pâte'),
    (v_recipe_id, 'ail',                         6,   'gousse',     true,  18, 'pour la pâte'),
    (v_recipe_id, 'galanga',                     25,  'g',          true,  19, 'pour la pâte'),
    (v_recipe_id, 'feuilles de combava',         2,   'unité',      true,  20, 'pour la pâte'),
    (v_recipe_id, 'citronnelle',                 2,   'unité',      true,  21, 'pour la pâte'),
    (v_recipe_id, 'piments rouges séchés',       12,  'unité',      true,  22, 'trempés 20 min, pour la pâte');

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
    'Variante "great curry" du classique malais : poulet frit croustillant enrobé d''une sauce épaisse passata + lait de coco, parfumée d''anis étoilé, cannelle et cardamome. Plus riche que la version classique.',
    $instr$["Frotter les morceaux de poulet avec le curcuma, le sel et la farine (ou fécule de maïs). Laisser reposer 10-15 minutes ou réfrigérer couvert.",
"Pâte d'épices : mixer en pâte épaisse les piments séchés (trempés 10 min), l'oignon, l'ail, le gingembre, le galanga et la citronnelle, avec un peu d'eau si besoin.",
"Chauffer l'huile à feu moyen-élevé jusqu'à ce que des bulles se forment autour d'un bâtonnet en bois.",
"Frire le poulet par petits lots jusqu'à doré et croustillant (~8 min par lot). Égoutter sur grille.",
"Garder ~70 ml d'huile dans le wok, jeter le reste. Réchauffer à feu moyen-élevé.",
"Ajouter les épices entières (anis étoilé, cannelle, cardamome, clous de girofle) et faire revenir 30 secondes jusqu'à parfum.",
"Incorporer la pâte préparée et cuire ~1 minute jusqu'à ce que l'huile remonte.",
"Verser la passata et le lait de coco. Laisser mijoter quelques minutes pour épaissir.",
"Ajouter le poulet frit et l'enrober de sauce. Rectifier sel et poivre. Servir avec du riz blanc."]
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
    (v_recipe_id, 'cuisses de poulet',          1000, 'g',          true,  1,  'désossées avec peau'),
    (v_recipe_id, 'curcuma moulu',              1,    'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'sel',                        1,    'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'farine ou fécule de maïs',   120,  'g',          false, 4,  'pour l''enrobage'),
    (v_recipe_id, 'huile de colza',             250,  'ml',         true,  5,  'pour la friture'),
    -- Pâte d'épices
    (v_recipe_id, 'piments rouges séchés',      10,   'unité',      true,  6,  'trempés 10 min'),
    (v_recipe_id, 'oignon rouge',               1,    'unité',      true,  7,  NULL),
    (v_recipe_id, 'ail',                        6,    'gousse',     true,  8,  NULL),
    (v_recipe_id, 'gingembre frais',            50,   'g',          true,  9,  NULL),
    (v_recipe_id, 'galanga',                    25,   'g',          true,  10, NULL),
    (v_recipe_id, 'citronnelle',                2,    'unité',      true,  11, 'parties blanches'),
    -- Sauce
    (v_recipe_id, 'anis étoilé',                1,    'unité',      true,  12, 'brisé'),
    (v_recipe_id, 'clous de girofle',           2,    'unité',      true,  13, NULL),
    (v_recipe_id, 'bâton de cannelle',          3,    'cm',         true,  14, NULL),
    (v_recipe_id, 'cardamome verte',            2,    'unité',      true,  15, 'écrasées'),
    (v_recipe_id, 'passata',                    400,  'ml',         true,  16, 'ou tomates concassées'),
    (v_recipe_id, 'lait de coco épais',         400,  'ml',         true,  17, NULL),
    (v_recipe_id, 'poivre noir moulu',          1,    'pincée',     true,  18, 'au goût');

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
    'Curry Nyonya (Penang) hérité de l''époque coloniale. Sauce épaisse presque sèche au lait de coco, parfumée à la citronnelle, galanga, belacan et feuilles de combava, relevée d''un trait de citron vert en finition.',
    $instr$["Tremper les piments rouges séchés dans l'eau bouillante ~10 minutes pour les ramollir.",
"Pâte : mixer les piments trempés avec échalotes, ail, feuilles de combava, citronnelle, piments frais, galanga, gingembre, noix de chandelle (ou macadamia) et belacan jusqu'à pâte lisse, en ajoutant un peu d'eau de trempage si besoin.",
"Frotter les morceaux de poulet (cuisses + pilons) avec le curcuma moulu. (Pâte + curcuma peuvent se faire la veille.)",
"Chauffer l'huile dans une grande cocotte à feu moyen-vif. Ajouter la pâte et faire revenir ~2 min jusqu'au parfum.",
"Ajouter les morceaux de poulet et bien les enrober de pâte, faire dorer quelques minutes.",
"Verser l'eau et ajouter les feuilles de combava finement émincées. Porter à ébullition puis réduire.",
"Mijoter ~20 minutes à feu moyen jusqu'à cuisson du poulet et épaississement de la sauce.",
"Incorporer le lait de coco épais. C'est un curry qui doit rester presque sec — ajouter plus de lait de coco si vous préférez plus de sauce.",
"Rectifier en sel et sucre. Presser le jus de citron vert par-dessus. Garnir de coriandre et feuilles de combava émincées. Servir avec du riz blanc."]
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
    (v_recipe_id, 'cuisses et pilons de poulet', 8,   'unité',      true,  1,  '4 cuisses + 4 pilons, avec peau'),
    (v_recipe_id, 'curcuma moulu',               1,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'huile d''arachide ou colza',  3,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'feuilles de combava',         3,   'unité',      true,  4,  'finement émincées'),
    (v_recipe_id, 'eau',                         500, 'ml',         true,  5,  NULL),
    (v_recipe_id, 'lait de coco épais',          60,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'jus de citron vert',          1,   'unité',      true,  7,  'pressé en finition'),
    (v_recipe_id, 'sucre',                       1,   'c. à café',  false, 8,  'optionnel'),
    (v_recipe_id, 'sel',                         1,   'c. à café',  true,  9,  'au goût'),
    -- Pâte
    (v_recipe_id, 'piments oiseaux séchés',      15,  'unité',      true,  10, 'pâte, trempés'),
    (v_recipe_id, 'échalotes banane',            8,   'unité',      true,  11, 'pâte'),
    (v_recipe_id, 'ail',                         6,   'gousse',     true,  12, 'pâte, écrasé'),
    (v_recipe_id, 'feuilles de combava',         3,   'unité',      true,  13, 'pâte'),
    (v_recipe_id, 'citronnelle',                 2,   'unité',      true,  14, 'pâte, parties blanches'),
    (v_recipe_id, 'piments rouges frais',        4,   'unité',      true,  15, 'pâte, oiseaux'),
    (v_recipe_id, 'galanga',                     50,  'g',          true,  16, 'pâte'),
    (v_recipe_id, 'gingembre',                   12,  'g',          true,  17, 'pâte'),
    (v_recipe_id, 'noix de chandelle',           4,   'unité',      true,  18, 'kemiri / macadamia'),
    (v_recipe_id, 'pâte de crevettes',           0.5, 'c. à café',  true,  19, 'belacan');

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
    'Riz frit indonésien classique : kecap manis (sauce soja sucrée), sambal oelek et pâte de crevettes pour la profondeur. Servi avec un œuf frit à l''asiatique, concombre et quartiers de tomate.',
    $instr$["Sambal oelek : mixer les piments rouges, le vinaigre de riz et le sel jusqu'à sauce lisse. Réserver.",
"Enrober le poulet en dés avec 1 c. à soupe de kecap manis et 1 c. à café de sauce soja. Laisser reposer.",
"Préparer la sauce finale : 2 c. à soupe de kecap manis + 2 c. à soupe de sauce soja. Réserver.",
"Chauffer l'huile dans un wok à feu moyen-vif. Faire revenir les échalotes hachées ~1 minute.",
"Ajouter l'ail haché, les piments verts et la pâte de crevettes. Bien mélanger.",
"Pousser le mélange sur les côtés du wok et déposer le poulet au centre. Cuire 5 minutes jusqu'à coloration légère.",
"Mélanger le poulet aux aromates. Ajouter le riz cuit refroidi et bien combiner (casser les amas).",
"Verser la sauce kecap-soja. Mélanger jusqu'à teinte dorée uniforme.",
"Saupoudrer de poivre blanc. Dresser avec concombre, tomates en quartiers, sambal oelek, échalotes frites et un œuf frit (style asiatique : blanc dentelle, jaune coulant)."]
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
    (v_recipe_id, 'poitrines de poulet',     450, 'g',          true,  1,  'en petits dés'),
    (v_recipe_id, 'kecap manis',             3,   'c. à soupe', true,  2,  'sauce soja sucrée'),
    (v_recipe_id, 'sauce soja',              3,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'huile d''arachide',       3,   'c. à soupe', true,  4,  'ou colza'),
    (v_recipe_id, 'échalotes',               4,   'unité',      true,  5,  'finement hachées'),
    (v_recipe_id, 'ail',                     4,   'gousse',     true,  6,  'finement haché'),
    (v_recipe_id, 'piments oiseau verts',    2,   'unité',      true,  7,  'finement hachés'),
    (v_recipe_id, 'pâte de crevettes',       0.5, 'c. à café',  true,  8,  'terasi / belacan'),
    (v_recipe_id, 'riz cuit refroidi',       600, 'g',          true,  9,  'basmati ou jasmin, de la veille'),
    (v_recipe_id, 'poivre blanc moulu',      0.5, 'c. à café',  true,  10, NULL),
    -- Sambal oelek
    (v_recipe_id, 'piments rouges',          120, 'g',          true,  11, 'pour le sambal oelek'),
    (v_recipe_id, 'vinaigre de riz',         1,   'c. à soupe', true,  12, 'pour le sambal'),
    (v_recipe_id, 'sel',                     1.5, 'c. à café',  true,  13, 'pour le sambal'),
    -- Service
    (v_recipe_id, 'œufs',                    4,   'unité',      false, 14, 'frits style asiatique'),
    (v_recipe_id, 'concombre',               1,   'unité',      false, 15, 'en tranches'),
    (v_recipe_id, 'tomates',                 4,   'unité',      false, 16, 'en quartiers'),
    (v_recipe_id, 'échalotes frites',        2,   'c. à soupe', false, 17, 'garniture');

  RAISE NOTICE 'Seed: 8 great-curry-recipes recipes inserted for user %', v_user_id;
END $$;
