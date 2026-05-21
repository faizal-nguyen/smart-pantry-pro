-- =====================================================================
-- Seed: 14 Japanese recipes from justonecookbook.com (2026-05-21)
--
-- Sources fetched 2026-05-21 (WordPress blog, WebFetch OK) :
--    1. https://www.justonecookbook.com/soboro-udon/
--    2. https://www.justonecookbook.com/gapao-rice/
--    3. https://www.justonecookbook.com/pizza-toast/
--    4. https://www.justonecookbook.com/japanese-egg-sandwich-tamago-sando/
--    5. https://www.justonecookbook.com/shrimp-fried-rice/
--    6. https://www.justonecookbook.com/chicken-fried-rice/
--    7. https://www.justonecookbook.com/simple-chicken-curry/
--    8. https://www.justonecookbook.com/oyakodon/
--    9. https://www.justonecookbook.com/gyudon/
--   10. https://www.justonecookbook.com/yaki-keema-curry/
--   11. https://www.justonecookbook.com/tori-soboro-donburi/
--   12. https://www.justonecookbook.com/yakitori-don/
--   13. https://www.justonecookbook.com/teriyaki-salmon-recipe/
--   14. https://www.justonecookbook.com/10-minute-meal-mapo-tofu/
--
-- Note: distinct du seed `2026-05-19-add-recipetineats-japan.sql`.
-- Noms uniques pour éviter collision avec d'autres seeds japonais.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-21-add-justonecookbook.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Soboro Udon (Nouilles Udon Sauce Poulet)',
    'Gapao Rice (Riz au Porc-Basilic Japonais)',
    'Pizza Toast Japonais',
    'Tamago Sando (Sandwich Œufs Japonais)',
    'Shrimp Fried Rice (Ebi Chahan)',
    'Chicken Fried Rice (Chikin Raisu)',
    'Japanese Chicken Curry',
    'Oyakodon (Bol Riz Poulet-Œuf)',
    'Gyudon (Bol Riz Bœuf Japonais)',
    'Yaki Keema Curry (Curry Japonais Gratiné)',
    'Tori Soboro Donburi',
    'Yakitori Don',
    'Saumon Teriyaki (Just One Cookbook)',
    'Mapo Tofu Style Japonais (10 min)'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Soboro Udon
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Soboro Udon (Nouilles Udon Sauce Poulet)',
    'Bol réconfortant de nouilles udon épaisses et moelleuses garni de poulet haché savoureux (soboro) et d''un œuf poché. Sauce sucrée-salée riche en umami avec jaune coulant.',
    $instr$["Trancher finement l'oignon vert en séparant blanc et vert ; râper le gingembre avec son jus.",
"Mélanger mirin, sauce soja et sucre dans un bol ; dans un autre, délayer la fécule dans l'eau.",
"Chauffer l'huile de sésame à feu moyen, ajouter les parties blanches d'oignon vert et le gingembre, sauter jusqu'à parfum.",
"Ajouter le poulet haché, le défaire à la spatule jusqu'à cuisson, verser la sauce et laisser épaissir.",
"Cuire les nouilles udon congelées 1 minute dans l'eau bouillante pour réchauffer.",
"Casser un œuf dans un bol allant au micro-ondes, verser 6 c. à soupe d'eau autour, percer le jaune.",
"Cuire au micro-ondes 90 secondes à puissance réduite (500 W) jusqu'à blanc pris.",
"Dresser les nouilles dans les bols, garnir de soboro puis poser l'œuf poché.",
"Saupoudrer des parties vertes d'oignon et de shichimi togarashi optionnel."]
$instr$,
    5, 10, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['nouilles udon','poulet haché','soboro','japonais','rapide','umami','donburi'],
    'manual',
    'https://www.justonecookbook.com/soboro-udon/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2025/10/Soboro-Udon-2957-I-3.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon vert',                1,   'unité',      true,  1,  'tranché fin'),
    (v_recipe_id, 'gingembre',                  2.5, 'cm',         true,  2,  'râpé avec jus'),
    (v_recipe_id, 'huile de sésame grillée',    1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'poulet haché',               225, 'g',          true,  4,  NULL),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  5,  'gros'),
    (v_recipe_id, 'nouilles udon',              500, 'g',          true,  6,  '2 portions congelées'),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      3,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sauce soja',                 3,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'fécule de pomme de terre',   1,   'c. à café',  true,  10, 'ou maïzena'),
    (v_recipe_id, 'eau',                        45,  'ml',         true,  11, 'pour épaissir'),
    (v_recipe_id, 'shichimi togarashi',         1,   'pincée',     false, 12, 'optionnel');

  -- =====================================================================
  -- 2. Gapao Rice (Pad Krapao Japonais)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Gapao Rice (Riz au Porc-Basilic Japonais)',
    'Adaptation japonaise du pad krapao thaïlandais : sauté de porc au basilic relevé d''ail et piment, servi sur riz japonais avec un œuf au plat. Prêt en 15 minutes.',
    $instr$["Mélanger la sauce : sauce soja, sauce huître, nuoc-mâm, sucre et eau.",
"Couper l'oignon en petits dés et le poivron en carrés.",
"Chauffer l'huile dans la poêle, ajouter ail et piment finement hachés.",
"Incorporer le porc haché et l'émietter à la spatule jusqu'à cuisson.",
"Ajouter l'oignon, cuire jusqu'à transparence.",
"Ajouter le poivron rouge, cuire 2 minutes.",
"Verser la sauce préparée et laisser réduire légèrement.",
"Éteindre le feu et incorporer les feuilles de basilic.",
"Servir sur riz chaud, garnir d'un œuf au plat et de basilic frais."]
$instr$,
    5, 10, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['porc haché','basilic','thaïlandais','japonais','wok','rapide','riz'],
    'manual',
    'https://www.justonecookbook.com/gapao-rice/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2027/02/Gapao-Rice-4486-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'boeuf hache',                 250, 'g',          true,  1,  'ou autre viande hachée'),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  2,  'petit'),
    (v_recipe_id, 'poivron rouge',              0.25,'unité',      true,  3,  'épépiné'),
    (v_recipe_id, 'piment oiseau',              2,   'unité',      true,  4,  'ou serrano'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  5,  'haché fin'),
    (v_recipe_id, 'basilic',                    10,  'feuille',    true,  6,  'idéalement sacré'),
    (v_recipe_id, 'huile neutre',               1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  8,  'pour œufs au plat'),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  9,  '2 portions'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'sauce huître',               1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'sauce de poisson',           1,   'c. à café',  true,  12, 'nuoc-mâm'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'eau',                        2,   'c. à soupe', true,  14, NULL);

  -- =====================================================================
  -- 3. Pizza Toast Japonais
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Pizza Toast Japonais',
    'Toast épais de pain de mie shokupan garni de sauce tomate maison, jambon, oignons, poivrons, tomates cerises et mozzarella fondante. En-cas yōshoku nostalgique très populaire au Japon.',
    $instr$["Chauffer l'huile à feu moyen-doux, ajouter piment et ail, cuire 2 minutes jusqu'à arôme.",
"Incorporer le ketchup, mélanger avec les épices et l'ail.",
"Assaisonner sel et poivre, transférer dans un bol et laisser refroidir.",
"Trancher le pain shokupan en tranches épaisses (2 cm) ; couper en deux pour les enfants.",
"Étaler ~1 c. à soupe de sauce tomate sur chaque tranche, saupoudrer un peu de mozzarella.",
"Disposer oignons doux, poivron vert, jambon en lanières et tomates cerises sur le toast.",
"Couvrir généreusement avec le reste de mozzarella (~2 c. à soupe par toast).",
"Placer sur grille centrale d'un four ou grille-pain, cuire à 230°C environ 10 minutes.",
"Servir chaud immédiatement, saupoudrer de piment supplémentaire si désiré."]
$instr$,
    5, 10, 3, 2,
    'Japonaise', 'snack',
    ARRAY['pain de mie','shokupan','yoshoku','fromage','toast','collation','enfant'],
    'manual',
    'https://www.justonecookbook.com/pizza-toast/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2025/09/Pizza-Toast-8478-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pain de mie shokupan',       3,   'tranche',    true,  1,  '2 cm d''épaisseur'),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  2,  'pour la sauce'),
    (v_recipe_id, 'flocons de piment',          0.25,'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  4,  'écrasée'),
    (v_recipe_id, 'ketchup',                    3,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'sel',                        0.125,'c. à café', true,  6,  'kosher Diamond Crystal'),
    (v_recipe_id, 'poivre noir',                0.125,'c. à café', true,  7,  'frais'),
    (v_recipe_id, 'mozzarella râpée',           6,   'c. à soupe', true,  8,  'plus si désiré'),
    (v_recipe_id, 'oignon doux',                0.125,'unité',     true,  9,  'tranché fin'),
    (v_recipe_id, 'poivron vert',               0.125,'unité',     true,  10, 'tranché fin'),
    (v_recipe_id, 'tomates cerises',            4,   'unité',      true,  11, 'tranchées'),
    (v_recipe_id, 'dinde fumee',                     3,   'tranche',    true,  12, 'en lanières');

  -- =====================================================================
  -- 4. Tamago Sando (Sandwich Œufs Japonais)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Tamago Sando (Sandwich Œufs Japonais)',
    'Sandwich emblématique des konbini japonais : salade d''œufs crémeuse à la mayo Kewpie entre deux tranches de shokupan moelleux. Bords croûtes retirés, coupé en triangles.',
    $instr$["Porter 3 œufs couverts d'eau à ébullition à feu moyen, cuire 12 minutes.",
"Plonger les œufs dans l'eau glacée pour arrêter la cuisson, puis peler.",
"Écraser les œufs à la fourchette dans un bol, en morcelant les blancs uniformément.",
"Ajouter sucre, sel et poivre, mélanger délicatement.",
"Incorporer lait et mayonnaise Kewpie, bien mélanger et ajuster l'assaisonnement.",
"Beurrer chaque tranche de shokupan, répartir la garniture sur 2 tranches.",
"Couvrir avec les autres tranches, beurre contre garniture, presser légèrement.",
"Laisser reposer 5 minutes entre deux assiettes pour la cohésion.",
"Retirer les croûtes des 4 côtés, couper les sandwichs en diagonale.",
"Servir immédiatement ou conserver hermétiquement au frigo (max 2 jours)."]
$instr$,
    10, 15, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['sandwich japonais','œufs','shokupan','konbini','déjeuner','mayo kewpie','rapide'],
    'manual',
    'https://www.justonecookbook.com/japanese-egg-sandwich-tamago-sando/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2019/03/Tamago-Sando-I-1-250x250.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'œufs',                       3,   'unité',      true,  1,  'gros, 50 g chacun'),
    (v_recipe_id, 'sucre',                      0.25,'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'sel kosher',                 0.25,'c. à café',  true,  3,  'Diamond Crystal'),
    (v_recipe_id, 'poivre noir',                0.125,'c. à café', true,  4,  'frais'),
    (v_recipe_id, 'lait',                       2,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'mayonnaise Kewpie',          2,   'c. à soupe', true,  6,  'japonaise'),
    (v_recipe_id, 'pain shokupan',              4,   'tranche',    true,  7,  'pain de mie japonais'),
    (v_recipe_id, 'beurre salé',                15,  'g',          true,  8,  'pour tartiner');

  -- =====================================================================
  -- 5. Shrimp Fried Rice (Ebi Chahan)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Shrimp Fried Rice (Ebi Chahan)',
    'Riz frit aux crevettes de style chinois adapté au Japon : grains légèrement brûlés au wok, œuf moelleux, crevettes saisies au saké et sel.',
    $instr$["Couper les crevettes en morceaux de ~1,3 cm.",
"Hacher finement laitue iceberg et oignon vert ; réserver.",
"Battre légèrement l'œuf dans un bol.",
"Chauffer le wok jusqu'à presque fumant, verser l'huile neutre, ajouter l'œuf et brouiller à feu vif jusqu'à 80% de cuisson, réserver.",
"Dans le même wok, ajouter les crevettes avec saké et sel, cuire jusqu'à coloration, réserver.",
"Verser l'huile de sésame grillée et faire revenir l'oignon vert jusqu'à enrobage.",
"Ajouter le riz froid, casser les grumeaux et bien mélanger à l'huile.",
"Remettre œuf et crevettes, ajouter laitue, poivre blanc, poivre noir et sauce soja.",
"Mélanger fréquemment 1 minute et servir immédiatement."]
$instr$,
    10, 10, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['riz frit','crevettes','wok','chahan','japonais','rapide','saké'],
    'manual',
    'https://www.justonecookbook.com/shrimp-fried-rice/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2020/01/Shrimp-Fried-Rice-6496-I.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'crevettes',                  120, 'g',          true,  1,  'épluchées, déveinées'),
    (v_recipe_id, 'laitue iceberg',             30,  'g',          true,  2,  '1 feuille hachée'),
    (v_recipe_id, 'oignon vert',                1,   'unité',      true,  3,  'haché fin'),
    (v_recipe_id, 'huile neutre',               30,  'ml',         true,  4,  NULL),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  5,  '50 g sans coquille'),
    (v_recipe_id, 'bouillon dashi',                       5,   'ml',         true,  6,  NULL),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  7,  'Diamond Crystal'),
    (v_recipe_id, 'huile de sésame grillée',    15,  'ml',         true,  8,  NULL),
    (v_recipe_id, 'riz japonais cuit',          500, 'ml',         true,  9,  'de la veille de préférence'),
    (v_recipe_id, 'poivre blanc',               0.125,'c. à café', true,  10, NULL),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  11, NULL),
    (v_recipe_id, 'sauce soja',                 5,   'ml',         true,  12, NULL);

  -- =====================================================================
  -- 6. Chicken Fried Rice (Chikin Raisu)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Fried Rice (Chikin Raisu)',
    'Plat yōshoku populaire : riz sauté au beurre, poulet en dés, champignons, oignon et petits pois, assaisonné de ketchup et purée de tomate. Classique nostalgique de l''enfance japonaise.',
    $instr$["Préparer la sauce : mélanger ketchup, purée de tomate et eau dans une petite casserole.",
"Couper le poulet en petits cubes et l'assaisonner de sel et poivre.",
"Hacher finement l'oignon et trancher les champignons.",
"Faire fondre le beurre à feu moyen dans une grande poêle, ajouter l'oignon.",
"Faire revenir l'oignon jusqu'à transparence, puis ajouter le poulet.",
"Cuire le poulet jusqu'à perte du rosé, puis ajouter les champignons.",
"Verser la sauce tomate et bien mélanger.",
"Ajouter le riz cuit refroidi et bien l'enrober de sauce.",
"Incorporer les petits pois et donner un dernier mélange avant de servir."]
$instr$,
    5, 15, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['riz frit','poulet','yoshoku','japonais','tomate','ketchup','rapide'],
    'manual',
    'https://www.justonecookbook.com/chicken-fried-rice/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2019/11/Chicken-Fried-Rice-Midnight-Diner-5334-I-2-250x250.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisse de poulet',           170, 'g',          true,  1,  'en dés'),
    (v_recipe_id, 'petits pois',                2,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'champignons',                3,   'unité',      true,  3,  'tranchés'),
    (v_recipe_id, 'oignon',                     65,  'g',          true,  4,  '~1/4, haché'),
    (v_recipe_id, 'beurre non salé',            1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'riz japonais cuit',          500, 'ml',         true,  6,  'refroidi, grain court'),
    (v_recipe_id, 'sel',                        0.125,'c. à café', true,  7,  'Diamond Crystal'),
    (v_recipe_id, 'poivre noir',                0.125,'c. à café', true,  8,  'frais'),
    (v_recipe_id, 'ketchup',                    45,  'ml',         true,  9,  NULL),
    (v_recipe_id, 'purée de tomate',            45,  'ml',         true,  10, NULL),
    (v_recipe_id, 'eau',                        30,  'ml',         true,  11, NULL);

  -- =====================================================================
  -- 7. Japanese Chicken Curry
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Japanese Chicken Curry',
    'Curry japonais maison : poulet, oignons caramélisés, carottes et pommes de terre dans une sauce épaisse au roux de curry, pomme râpée et miel. Plat de confort familial servi sur riz.',
    $instr$["Préparer les légumes : oignons en gros quartiers, carottes en rangiri, pommes de terre en quartiers (tremper 15 min).",
"Préparer le poulet : ôter le gras, couper en bouchées sogigiri et assaisonner de poivre.",
"Chauffer l'huile à feu moyen, faire sauter les oignons 5 minutes jusqu'à coloration dorée.",
"Ajouter ail et gingembre, mélanger, puis incorporer le poulet jusqu'à cuisson partielle.",
"Verser le bouillon, ajouter pomme râpée, miel, sauce soja et ketchup, puis carottes et pommes de terre.",
"Couvrir et mijoter 15 minutes à feu moyen-doux, écumer les impuretés.",
"Continuer la cuisson couverte jusqu'à ce qu'une brochette traverse les légumes.",
"Éteindre le feu, dissoudre le roux de curry par portions de 2 cubes dans le bouillon chaud.",
"Mijoter à découvert 5-10 minutes en remuant fréquemment jusqu'à épaississement.",
"Servir sur riz japonais avec fukujinzuke en garniture si désiré."]
$instr$,
    20, 50, 8, 2,
    'Japonaise', 'dinner',
    ARRAY['curry japonais','poulet','plat-familial','réconfortant','roux','légumes','traditionnel'],
    'manual',
    'https://www.justonecookbook.com/simple-chicken-curry/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2021/10/Japanese-Chicken-Curry-3787-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignons',                    670, 'g',          true,  1,  '2 gros, en quartiers'),
    (v_recipe_id, 'carottes',                   190, 'g',          true,  2,  '2 unités, en rangiri'),
    (v_recipe_id, 'pommes de terre Yukon gold', 432, 'g',          true,  3,  '3 unités, en quartiers'),
    (v_recipe_id, 'gingembre',                  1,   'c. à café',  true,  4,  'râpé avec jus'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  5,  'pressée'),
    (v_recipe_id, 'pomme',                      170, 'g',          true,  6,  '~½, râpée'),
    (v_recipe_id, 'poitrine de poulet',         680, 'g',          true,  7,  'sans peau, en bouchées'),
    (v_recipe_id, 'huile neutre',               1.5, 'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'bouillon de poule',          1000,'ml',         true,  9,  'ou eau'),
    (v_recipe_id, 'miel',                       1,   'c. à soupe', true,  10, 'ingrédient secret'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'ketchup',                    1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'roux de curry japonais',     220, 'g',          true,  13, '1 paquet'),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  14, NULL),
    (v_recipe_id, 'riz japonais cuit',          800, 'g',          true,  15, 'pour servir'),
    (v_recipe_id, 'fukujinzuke',                30,  'g',          false, 16, 'garniture optionnelle');

  -- =====================================================================
  -- 8. Oyakodon (Bol Riz Poulet-Œuf)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Oyakodon (Bol Riz Poulet-Œuf)',
    'Classique du donburi japonais : poulet et oignon mijotés dans une sauce dashi-soja-mirin, liés par des œufs marbrés. « Parent et enfant » dans un bol, prêt en 25 minutes.',
    $instr$["Mélanger dashi, sauce soja, mirin et sucre jusqu'à dissolution complète.",
"Trancher l'oignon en fines lamelles et hacher le mitsuba.",
"Découper le poulet en morceaux de 2 cm en sogigiri, arroser de saké et reposer 5 minutes.",
"Casser les œufs, couper les blancs 5-6 fois aux baguettes sans fouetter (motifs marbrés).",
"Verser la sauce sur les oignons dans une petite poêle, porter à frémissement à feu moyen.",
"Ajouter le poulet, répartir, cuire à découvert 5 minutes en retournant à mi-cuisson.",
"Augmenter le feu à moyen, verser 2/3 des œufs en spirale en évitant les bords.",
"Cuire jusqu'à blanc partiellement pris, puis ajouter le dernier tiers d'œufs et mitsuba.",
"Couvrir 30 secondes pour la texture souhaitée.",
"Dresser le riz dans des bols donburi, glisser le mélange poulet-œuf avec la sauce sur le riz."]
$instr$,
    15, 10, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['donburi','poulet','œufs','dashi','japonais','réconfortant','traditionnel'],
    'manual',
    'https://www.justonecookbook.com/oyakodon/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2022/10/Oyakodon-0613-I.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  1,  'tranché fin'),
    (v_recipe_id, 'filet de poulet',            300, 'g',          true,  2,  'en sogigiri 2 cm'),
    (v_recipe_id, 'bouillon dashi',                       1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  4,  'à T° ambiante'),
    (v_recipe_id, 'bouillon dashi',             120, 'ml',         true,  5,  'packet ou poudre'),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  6,  'shoyu'),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      2,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sucre',                      2,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  9,  'grain court'),
    (v_recipe_id, 'mitsuba',                    4,   'brin',       false, 10, 'ou oignons verts');

  -- =====================================================================
  -- 9. Gyudon (Bol Riz Bœuf Japonais)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Gyudon (Bol Riz Bœuf Japonais)',
    'Bol de riz japonais garni de bœuf finement tranché et d''oignons mijotés dans une sauce sucrée-salée au dashi, saké et mirin. Plat fast-food japonais réconfortant, prêt en 20 minutes.',
    $instr$["Trancher finement l'oignon et couper l'oignon vert en biais. Découper le bœuf semi-congelé en morceaux de 7,6 cm.",
"Dans une poêle froide, verser dashi, saké, mirin, sauce soja et sucre, mélanger pour dissoudre.",
"Étaler les tranches d'oignon dans le bouillon en séparant les couches, disposer le bœuf par-dessus.",
"Couvrir et chauffer à feu moyen ; au frémissement, baisser le feu et cuire 3-4 minutes couvert.",
"Écumer les impuretés avec une écumoire fine.",
"Parsemer les oignons verts, cuire 1 minute couvert.",
"Verser le riz dans des bols donburi, arroser d'un peu de sauce.",
"Disposer le mélange bœuf-oignon sur le riz et garnir de gingembre rouge mariné."]
$instr$,
    5, 15, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['bœuf','donburi','riz','japonais','rapide','dashi','réconfortant'],
    'manual',
    'https://www.justonecookbook.com/gyudon/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2024/11/Gyudon-7457-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf tranché',               225, 'g',          true,  1,  'côte ou faux-filet'),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  2,  'moyen'),
    (v_recipe_id, 'oignon vert',                1,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'riz japonais cuit',          500, 'ml',         true,  4,  'grain court'),
    (v_recipe_id, 'dashi',                      120, 'ml',         true,  5,  'bouillon japonais'),
    (v_recipe_id, 'bouillon dashi',                       30,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      30,  'ml',         true,  7,  NULL),
    (v_recipe_id, 'sauce soja',                 45,  'ml',         true,  8,  NULL),
    (v_recipe_id, 'sucre',                      15,  'ml',         true,  9,  NULL),
    (v_recipe_id, 'gingembre rouge mariné',     20,  'g',          false, 10, 'garniture');

  -- =====================================================================
  -- 10. Yaki Keema Curry (Curry Japonais Gratiné)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Yaki Keema Curry (Curry Japonais Gratiné)',
    'Gratin de curry japonais à la viande hachée, œuf coulant et mozzarella fondante. Plat de café (kissaten) facile, fait au four, qui transforme le curry classique en plat doré gratiné.',
    $instr$["Préchauffer le four à 200°C ; émincer finement l'oignon, couper la carotte en petits dés.",
"Chauffer une poêle en inox, ajouter l'huile et faire revenir l'oignon jusqu'à légère transparence.",
"Ajouter la viande hachée et la casser à la spatule jusqu'à cuisson complète.",
"Incorporer la carotte en dés et bien mélanger.",
"Verser l'eau, assaisonner sel et poivre, couvrir et mijoter 3 minutes.",
"Ajouter le cube de roux de curry et le faire fondre en remuant.",
"Verser ketchup et sauce tonkatsu, laisser réduire jusqu'à sauce épaisse brillante.",
"Beurrer un plat allant au four, étaler le riz, verser le curry par-dessus.",
"Faire un puits au centre, casser l'œuf dedans, couvrir entièrement de mozzarella.",
"Enfourner 15 minutes jusqu'à fromage doré bouillonnant, garnir de persil et servir."]
$instr$,
    5, 25, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['curry japonais','gratin','viande hachée','mozzarella','four','kissaten','réconfortant'],
    'manual',
    'https://www.justonecookbook.com/yaki-keema-curry/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2026/03/Yaki-Keema-Curry-4752-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 170, 'g',          true,  1,  NULL),
    (v_recipe_id, 'boeuf hache',                 170, 'g',          true,  2,  NULL),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  3,  'haché fin'),
    (v_recipe_id, 'carotte',                    8,   'cm',         true,  4,  'en petits dés'),
    (v_recipe_id, 'roux de curry japonais',     1,   'cube',       true,  5,  NULL),
    (v_recipe_id, 'sauce tonkatsu',             15,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'ketchup',                    15,  'ml',         true,  7,  NULL),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  8,  NULL),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  9,  'Diamond Crystal'),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  10, NULL),
    (v_recipe_id, 'huile neutre',               15,  'ml',         true,  11, NULL),
    (v_recipe_id, 'riz japonais cuit',          500, 'ml',         true,  12, 'grain court'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  13, 'gros'),
    (v_recipe_id, 'mozzarella râpée',           240, 'ml',         true,  14, NULL),
    (v_recipe_id, 'beurre',                     15,  'ml',         true,  15, 'pour le plat'),
    (v_recipe_id, 'persil italien',             4,   'brin',       false, 16, 'garniture');

  -- =====================================================================
  -- 11. Tori Soboro Donburi
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Tori Soboro Donburi',
    'Bol de riz japonais classique : poulet haché sucré-salé caramélisé et œufs brouillés moelleux, garni de petits pois verts. Plat de bento traditionnel prêt en 30 minutes.',
    $instr$["Préparer 2 portions de riz japonais à l'avance.",
"Râper le gingembre frais pour obtenir 1 c. à café avec jus.",
"Dans une casserole froide, mettre poulet haché, gingembre, saké, mirin, sucre et sauce soja.",
"Chauffer à feu moyen-doux et mélanger vigoureusement avec 3 baguettes en parallèle 3-4 minutes.",
"Poursuivre la cuisson 2-3 minutes jusqu'à évaporation, le poulet doit être brillant et glacé.",
"Dans une autre casserole froide, fouetter œufs, sucre et sel jusqu'à dissolution.",
"Chauffer à feu moyen-doux en remuant constamment avec 3 baguettes en grattant le fond.",
"Cuire jusqu'à obtention de petites miettes humides moelleuses, sans sécher.",
"Dresser le riz dans 2 bols, disposer le poulet sur une moitié et les œufs sur l'autre.",
"Décorer d'une ligne de petits pois verts et de gingembre rouge mariné si désiré."]
$instr$,
    10, 20, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['poulet haché','donburi','œufs','bento','japonais','rapide','traditionnel'],
    'manual',
    'https://www.justonecookbook.com/tori-soboro-donburi/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2026/06/Soboro-Don-8331-I.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet haché',               230, 'g',          true,  1,  NULL),
    (v_recipe_id, 'gingembre',                  1,   'c. à café',  true,  2,  'râpé avec jus'),
    (v_recipe_id, 'bouillon dashi',                       1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'sucre',                      1.5, 'c. à soupe', true,  5,  'pour soboro'),
    (v_recipe_id, 'sauce soja',                 2.5, 'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'œufs',                       3,   'unité',      true,  7,  'gros'),
    (v_recipe_id, 'sucre',                      1,   'c. à soupe', true,  8,  'pour œufs'),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  9,  'Diamond Crystal'),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  10, '2 portions'),
    (v_recipe_id, 'petits pois cuits',          30,  'g',          false, 11, 'décoration'),
    (v_recipe_id, 'gingembre rouge mariné',     20,  'g',          false, 12, 'optionnel');

  -- =====================================================================
  -- 12. Yakitori Don
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Yakitori Don',
    'Bol de riz garni de poulet poêlé juteux glacé à la sauce yakitori sucrée-salée (mirin, sauce soja, sucre). Capture les saveurs des brochettes grillées sans gril, prêt en 20 minutes.',
    $instr$["Couper le blanc du negi en tronçons de 4 cm, émincer la partie verte. Sécher le poulet, le couper en bouchées et enrober légèrement de farine.",
"Mélanger mirin, sauce soja et sucre jusqu'à dissolution du sucre.",
"Chauffer une poêle en inox à feu moyen ; tester avec une goutte d'eau qui forme des perles.",
"Ajouter le blanc de negi et griller jusqu'à coloration des deux côtés, réserver.",
"Disposer le poulet en une couche sans superposition et saisir 3 minutes jusqu'à croûte dorée.",
"Retourner le poulet, couvrir et cuire à feu moyen-doux 3 minutes.",
"Éponger l'excès de gras avec du papier absorbant, remettre le negi grillé.",
"Verser la sauce yakitori et remuer pour enrober tous les morceaux.",
"Remplir les bols de riz chaud, saupoudrer de nori effilée, garnir de poulet glacé et oignons verts.",
"Servir avec shichimi togarashi à table pour piquant."]
$instr$,
    10, 10, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['poulet','yakitori','donburi','japonais','rapide','teriyaki','sans-gril'],
    'manual',
    'https://www.justonecookbook.com/yakitori-don/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2026/03/Yakitori-Don-4671-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filets de cuisse de poulet', 280, 'g',          true,  1,  'désossés sans peau, en bouchées'),
    (v_recipe_id, 'negi (ou oignons verts)',    1,   'unité',      true,  2,  'long oignon vert japonais'),
    (v_recipe_id, 'farine',                     2,   'c. à soupe', true,  3,  'pour enrober'),
    (v_recipe_id, 'huile neutre',               2,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      3,   'c. à soupe', true,  5,  'pour la sauce'),
    (v_recipe_id, 'sauce soja',                 3,   'c. à soupe', true,  6,  'pour la sauce'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  7,  'pour la sauce'),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  8,  '2 portions, grain court'),
    (v_recipe_id, 'nori effilée',               1,   'poignée',    false, 9,  'optionnel'),
    (v_recipe_id, 'shichimi togarashi',         1,   'pincée',     false, 10, 'optionnel');

  -- =====================================================================
  -- 13. Saumon Teriyaki (Just One Cookbook)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Saumon Teriyaki (Just One Cookbook)',
    'Saumon poêlé jusqu''à peau croustillante et chair tendre, nappé d''une sauce teriyaki maison (saké, mirin, sauce soja, sucre). Prêt en 15 minutes.',
    $instr$["Mélanger les ingrédients de la sauce teriyaki dans un bol et dissoudre le sucre au micro-ondes 30 secondes.",
"Rincer et sécher les filets de saumon, saler et poivrer les deux faces.",
"Enrober uniformément de farine.",
"Chauffer une poêle à feu moyen avec huile et beurre.",
"Saisir la peau 15 secondes verticalement, puis poser peau vers le bas et cuire 3 minutes.",
"Retourner le filet, ajouter le saké, couvrir et baisser le feu ; cuire 3-5 minutes jusqu'à 52-54°C à cœur.",
"Transférer le saumon sur une assiette, verser la sauce dans la poêle, porter à ébullition.",
"Remettre le saumon, napper de sauce, réduire le feu et laisser épaissir 1-2 minutes.",
"Servir immédiatement nappé de sauce caramélisée réduite."]
$instr$,
    5, 10, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['saumon','teriyaki','poêlé','rapide','japonais','sauce-maison','15-minutes'],
    'manual',
    'https://www.justonecookbook.com/teriyaki-salmon-recipe/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2025/02/Teriyaki-Salmon-6897-II.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filets de saumon avec peau', 340, 'g',          true,  1,  '2 filets, 2 cm d''épaisseur'),
    (v_recipe_id, 'sel de mer',                 0.25,'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'poivre noir',                0.125,'c. à café', true,  3,  'frais'),
    (v_recipe_id, 'farine',                     1,   'c. à soupe', true,  4,  'ou fécule pour SG'),
    (v_recipe_id, 'huile neutre',               0.5, 'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'beurre non salé',            1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'bouillon dashi',                       1,   'c. à soupe', true,  7,  'pour cuisson vapeur'),
    (v_recipe_id, 'bouillon dashi',                       1,   'c. à soupe', true,  8,  'pour la sauce'),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      1,   'c. à soupe', true,  9,  'pour la sauce'),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  10, 'pour la sauce'),
    (v_recipe_id, 'sucre',                      1,   'c. à soupe', true,  11, 'au goût');

  -- =====================================================================
  -- 14. Mapo Tofu Style Japonais (10 min)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Mapo Tofu Style Japonais (10 min)',
    'Version rapide du mapo tofu chinois adaptée au goût japonais : tofu soyeux, porc haché, doubanjiang, miso blanc et sauce d''huître. Plat umami prêt en 15 minutes.',
    $instr$["Égoutter le tofu enveloppé dans du papier absorbant 15 minutes.",
"Mélanger tous les ingrédients de la sauce dans un bol jusqu'à lisse.",
"Trancher l'oignon vert, émincer gingembre et ail, couper le tofu en petits cubes.",
"Chauffer l'huile à feu moyen-vif, faire sauter gingembre et ail jusqu'à parfum.",
"Ajouter le porc haché et le détacher à la spatule jusqu'à coloration complète.",
"Verser la sauce préparée, mélanger jusqu'à ébullition et épaississement.",
"Baisser le feu, ajouter les cubes de tofu et enrober délicatement.",
"Incorporer la majorité de l'oignon vert, couvrir et mijoter 1 minute.",
"Dresser sur lit de riz chaud en bols, garnir du reste d'oignon vert et servir."]
$instr$,
    5, 10, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['mapo tofu','tofu','porc haché','japonais','rapide','umami','10-minutes'],
    'manual',
    'https://www.justonecookbook.com/10-minute-meal-mapo-tofu/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2024/10/10-Min-Meal-Mapo-Tofu-0814-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'tofu soyeux',                100, 'g',          true,  1,  '¼ bloc, égoutté 15 min'),
    (v_recipe_id, 'boeuf hache',                 120, 'g',          true,  2,  'ou autre viande'),
    (v_recipe_id, 'oignon vert',                1,   'unité',      true,  3,  'tranché fin'),
    (v_recipe_id, 'gingembre',                  2.5, 'cm',         true,  4,  'émincé'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  5,  'pressée'),
    (v_recipe_id, 'huile neutre',               15,  'ml',         true,  6,  NULL),
    (v_recipe_id, 'doubanjiang',                15,  'ml',         true,  7,  'pâte de fèves épicée'),
    (v_recipe_id, 'sauce d''huître',            7.5, 'ml',         true,  8,  NULL),
    (v_recipe_id, 'miso blanc',                 7.5, 'ml',         true,  9,  NULL),
    (v_recipe_id, 'sauce soja',                 5,   'ml',         true,  10, NULL),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      15,  'ml',         true,  11, NULL),
    (v_recipe_id, 'huile de sésame grillée',    2.5, 'ml',         true,  12, NULL),
    (v_recipe_id, 'fécule de pomme de terre',   2.5, 'ml',         true,  13, NULL),
    (v_recipe_id, 'eau',                        30,  'ml',         true,  14, NULL),
    (v_recipe_id, 'riz japonais cuit',          330, 'g',          true,  15, 'pour servir');

END $$;
