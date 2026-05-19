-- =====================================================================
-- Seed: 6 recipes from Tiv's newsletter (2026-05-18)
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` as
-- owned recipes for the audit user `c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6`.
-- Idempotent on re-run: drops the same recipes by name first.
--
-- Run from Supabase Studio (SQL editor) or via psql:
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-18-add-tiv-recipes.sql
--
-- Instructions are stored as a JSON array (text) so RecipeDetail.tsx
-- can parse them step-by-step. Quantities are stored as decimals;
-- units follow the "default to 'unité' unless explicitly numbered"
-- convention introduced 2026-05-18.
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Gochujang Masala Pasta',
    'Tandoori Chicken (yaourt grec)',
    'One-pan Tandoori Chicken & Rice',
    'Green Chutney (chutney vert maison)',
    'Healthier Paneer Tikka Masala',
    'Tandoori Salmon Glow Bowl'
  ];
BEGIN

  -- ---------- cleanup any previous seed run (idempotence) ------------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);
  -- (recipe_ingredients cascades via FK ON DELETE CASCADE)

  -- =====================================================================
  -- 1. Gochujang Masala Pasta
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type
  ) VALUES (
    v_user_id,
    'Gochujang Masala Pasta',
    'Fusion sud-asiatique × est-asiatique × italien : gochujang, épices indiennes et parmesan sur des pâtes. Sonne dingue, marche à tous les coups.',
    $instr$["Faire bouillir de l'eau salée et cuire les pâtes ~16 min. Garder 1/3 tasse d'eau de cuisson avant d'égoutter.",
"Chauffer 1-2 c. à soupe d'huile à l'ail (ou huile d'olive + ail supplémentaire) dans une poêle. Ajouter l'oignon rouge émincé et une pincée de graines de cumin.",
"Au bout de 2 min, ajouter l'ail émincé et le serrano émincé. Cuire jusqu'à ce que les oignons soient dorés, environ 5 min.",
"Ajouter 2 c. à soupe de gochujang, 1 c. à café de sel, 1 c. à café de cumin moulu, 1 c. à café de coriandre moulue, 1 c. à café de piment de Kashmir, pincée de poivre noir.",
"Mélanger puis verser 1/4 tasse de lait. Ajouter 1/3 tasse de parmesan râpé et remuer jusqu'à ce qu'il fonde dans la sauce.",
"Ajouter les pâtes cuites et verser progressivement l'eau de cuisson jusqu'à la consistance voulue (~1/3 tasse). Possible d'ajouter un peu plus de lait.",
"Goûter et ajuster les épices : 1 c. à café sel, 1 c. à café Kashmir, 1 c. à café cumin, 1 c. à café coriandre.",
"Presser le citron vert, garnir de coriandre fraîche, oignons verts et plus de parmesan. Délicieux avec du poulet tandoori juteux."]
$instr$,
    5, 20, 2, 2,
    'Fusion', 'dinner',
    ARRAY['pâtes','fusion','gochujang','épicé','indien','italien'],
    'manual'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'pâtes',                  200, 'g',     true,  1,  'idéalement faible en glucides + riche en fibres'),
    (v_recipe_id, 'huile à l''ail',         2,   'c. à soupe', true,  2,  'ou huile d''olive + ail supplémentaire'),
    (v_recipe_id, 'oignon rouge',           0.5, 'unité', true,  3,  'émincé'),
    (v_recipe_id, 'ail',                    1,   'c. à soupe', true,  4,  'émincé'),
    (v_recipe_id, 'serrano',                1,   'c. à soupe', true,  5,  'émincé'),
    (v_recipe_id, 'gochujang',              2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'lait',                   80,  'ml',    true,  7,  '1/3 tasse environ'),
    (v_recipe_id, 'parmesan râpé',          80,  'g',     true,  8,  '1/3 tasse environ, plus à servir'),
    (v_recipe_id, 'coriandre fraîche',      1,   'unité', false, 9,  'pour garnir'),
    (v_recipe_id, 'oignons verts',          1,   'unité', false, 10, 'pour garnir'),
    (v_recipe_id, 'citron vert',            1,   'unité', false, 11, 'pour servir'),
    (v_recipe_id, 'sel',                    2,   'c. à café', true,  12, NULL),
    (v_recipe_id, 'poivre noir',            1,   'pincée', false, 13, NULL),
    (v_recipe_id, 'graines de cumin',       1,   'pincée', true,  14, NULL),
    (v_recipe_id, 'cumin moulu',            2,   'c. à café', true,  15, NULL),
    (v_recipe_id, 'coriandre moulue',       2,   'c. à café', true,  16, NULL),
    (v_recipe_id, 'piment de Kashmir',      2,   'c. à café', true,  17, NULL);

  -- =====================================================================
  -- 2. Tandoori Chicken (yaourt grec)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, rest_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type, nutrition_info
  ) VALUES (
    v_user_id,
    'Tandoori Chicken (yaourt grec)',
    'Poulet tandoori à la marinade yaourt grec — version riche en protéines. Cuisses ou blancs selon l''envie. 240 cal | 36g protéines | 6g glucides | 7g lipides par portion.',
    $instr$["Préparer ail, serrano et gingembre émincés.",
"Dans un bol, mélanger 1/2 tasse de yaourt grec + une touche d'eau, 1 c. à soupe de serrano émincé, 1 c. à soupe de gingembre émincé, 1 c. à soupe d'ail émincé, 2 c. à café de sel himalaya, 1 c. à café de curcuma, 3 c. à café de piment de Kashmir, 2 c. à café de cumin moulu, 2 c. à café de coriandre moulue, 2 c. à café de paprika, une pincée de kasoori methi.",
"Ajouter 450 g de poulet (cuisses ou blancs désossés) et bien enrober dans la marinade.",
"Couvrir et réfrigérer jusqu'à 24 h. L'idéal est toute une nuit ; 1-2 h minimum si pressé.",
"Chauffer une poêle avec ghee ou huile d'olive — bien chaude.",
"Ajouter le poulet et ne pas y toucher pendant 5 min. Vérifier qu'il est doré/croustillant dessous.",
"Retourner, baisser le feu sur moyen et cuire encore 5-7 min."]
$instr$,
    15, 12, 60, 3, 2,
    'Indienne', 'dinner',
    ARRAY['poulet','tandoori','high-protein','indien','marinade'],
    'manual',
    '{"calories":240,"protein_g":36,"carbs_g":6,"fat_g":7,"per_serving":true}'::jsonb
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'poulet',              450, 'g',     true,  1,  'cuisses ou blancs désossés (1 lb)'),
    (v_recipe_id, 'yaourt grec',          120, 'ml',    true,  2,  '1/2 tasse + une touche d''eau'),
    (v_recipe_id, 'serrano',              1,   'c. à soupe', true,  3,  'émincé'),
    (v_recipe_id, 'gingembre',            1,   'c. à soupe', true,  4,  'émincé'),
    (v_recipe_id, 'ail',                  1,   'c. à soupe', true,  5,  'émincé'),
    (v_recipe_id, 'sel himalaya',         2,   'c. à café', true,  6,  NULL),
    (v_recipe_id, 'curcuma',              1,   'c. à café', true,  7,  NULL),
    (v_recipe_id, 'piment de Kashmir',    3,   'c. à café', true,  8,  NULL),
    (v_recipe_id, 'cumin moulu',          2,   'c. à café', true,  9,  NULL),
    (v_recipe_id, 'coriandre moulue',     2,   'c. à café', true,  10, NULL),
    (v_recipe_id, 'paprika',              2,   'c. à café', true,  11, NULL),
    (v_recipe_id, 'kasoori methi',        1,   'pincée', false, 12, 'fenugrec sec'),
    (v_recipe_id, 'ghee',                 1,   'c. à soupe', false, 13, 'ou huile d''olive');

  -- =====================================================================
  -- 3. One-pan Tandoori Chicken & Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, rest_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type, nutrition_info
  ) VALUES (
    v_user_id,
    'One-pan Tandoori Chicken & Rice',
    'Tout dans une casserole en moins de 30 min, riz cuit dans le bouillon d''os pour la saveur et les protéines. 480 cal | 38g protéines | 28g glucides par portion.',
    $instr$["LA VEILLE (ou 30 min minimum) — Préparer la marinade : dans un bol, mélanger 1/2 tasse de yaourt grec + un peu d'eau, pâte ail/gingembre (ou frais émincés), serrano émincé, 1 c. à café sel himalaya, 1/2 c. à café poivre noir, 1 c. à café paprika, 2 c. à café coriandre moulue, 2 c. à café cumin moulu, 1 c. à café curcuma. Bien enrober les cuisses de poulet. Couvrir.",
"LE JOUR-J — Chauffer une cocotte/pot haute (assez profonde pour aussi cuire le riz). Ajouter le ghee et bien chauffer.",
"Ajouter le poulet mariné et saisir 7-8 min par côté jusqu'à coloration. Retirer et réserver.",
"Dans la même cocotte, ajouter l'oignon tranché et cuire 5 min jusqu'à coloration.",
"Ajouter la tomate Roma émincée et cuire 3-5 min jusqu'à texture confite.",
"Ajouter une pincée des mêmes épices que la marinade (cumin + coriandre), piment rouge ou paprika, et 2 c. à café de sel. Mélanger.",
"Ajouter le riz basmati lavé et toaster dans le mélange 1 min.",
"Verser 1 3/4 tasse (414 ml) de bouillon d'os. Remuer rapidement puis replacer le poulet sur le riz.",
"Couvrir et cuire à feu moyen 15 min jusqu'à riz tendre et poulet cuit.",
"Finir avec de la coriandre fraîche par-dessus."]
$instr$,
    15, 30, 60, 4, 3,
    'Indienne', 'dinner',
    ARRAY['poulet','tandoori','riz','one-pot','indien','meal-prep'],
    'manual',
    '{"calories":480,"protein_g":38,"carbs_g":28,"per_serving":true}'::jsonb
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet',         450, 'g',     true,  1,  '1 lb'),
    (v_recipe_id, 'yaourt grec',               120, 'ml',    true,  2,  '1/2 tasse + un peu d''eau'),
    (v_recipe_id, 'pâte ail/gingembre',        1,   'c. à soupe', true,  3,  'ou frais émincés'),
    (v_recipe_id, 'serrano',                   1,   'unité', true,  4,  'émincé'),
    (v_recipe_id, 'sel himalaya',              1,   'c. à café', true,  5,  'marinade'),
    (v_recipe_id, 'poivre noir',               0.5, 'c. à café', true,  6,  NULL),
    (v_recipe_id, 'paprika',                   1,   'c. à café', true,  7,  NULL),
    (v_recipe_id, 'coriandre moulue',          3,   'c. à café', true,  8,  '2 marinade + 1 pour le riz'),
    (v_recipe_id, 'cumin moulu',               3,   'c. à café', true,  9,  '2 marinade + 1 pour le riz'),
    (v_recipe_id, 'curcuma',                   2,   'c. à café', true,  10, '1 marinade + 1 riz'),
    (v_recipe_id, 'ghee',                      1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'oignon',                    0.5, 'unité', true,  12, 'tranché dans la longueur'),
    (v_recipe_id, 'tomate Roma',               1,   'unité', true,  13, NULL),
    (v_recipe_id, 'riz basmati',               180, 'g',     true,  14, '1 tasse, lavé'),
    (v_recipe_id, 'bouillon d''os',            414, 'ml',    true,  15, '1 3/4 tasse'),
    (v_recipe_id, 'sel',                       2,   'c. à café', true,  16, 'pour le riz'),
    (v_recipe_id, 'piment rouge',              1,   'c. à café', false, 17, 'ou paprika'),
    (v_recipe_id, 'coriandre fraîche',         1,   'unité', false, 18, 'pour garnir');

  -- =====================================================================
  -- 4. Green Chutney
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type
  ) VALUES (
    v_user_id,
    'Green Chutney (chutney vert maison)',
    'Chutney polyvalent : sauce pizza, wraps, bowls, dip avec yaourt. Garde 7-10 jours au frigo. Bon pour la digestion (coriandre/menthe), riche en vitamine C.',
    $instr$["Laver les bouquets de coriandre, couper 2-3 cm de tige (pas toute la tige !).",
"Mettre dans un blender puissant (Vitamix ou équivalent) : 3 bouquets de coriandre, 1 poignée de menthe, 2 serranos (1 si on veut moins de piquant), 5 gousses d'ail, 10 noix de cajou, le jus de 3-4 citrons verts, 1/2 c. à café de poivre noir, 1 c. à café de sel, 1/2 c. à café de cumin moulu.",
"Mixer jusqu'à obtenir une texture lisse.",
"Conserver dans un bocal hermétique au réfrigérateur 7-10 jours."]
$instr$,
    5, 0, 6, 1,
    'Indienne', 'sauce',
    ARRAY['chutney','sauce','coriandre','menthe','indien','condiment'],
    'manual'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'coriandre fraîche',  3,   'unité', true, 1, 'bouquets, tiges presque entières'),
    (v_recipe_id, 'menthe fraîche',     1,   'unité', true, 2, '1 poignée'),
    (v_recipe_id, 'serrano',            2,   'unité', true, 3, '1 pour moins épicé'),
    (v_recipe_id, 'ail',                5,   'gousse', true, 4, NULL),
    (v_recipe_id, 'noix de cajou',      10,  'unité', true, 5, NULL),
    (v_recipe_id, 'citron vert',        4,   'unité', true, 6, 'jus uniquement, 3-4 citrons'),
    (v_recipe_id, 'poivre noir',        0.5, 'c. à café', true, 7, NULL),
    (v_recipe_id, 'sel',                1,   'c. à café', true, 8, NULL),
    (v_recipe_id, 'cumin moulu',        0.5, 'c. à café', true, 9, NULL);

  -- =====================================================================
  -- 5. Healthier Paneer Tikka Masala
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type, nutrition_info
  ) VALUES (
    v_user_id,
    'Healthier Paneer Tikka Masala',
    'Version protéinée sans crème épaisse : cottage cheese + noix de cajou pour la texture crémeuse. 280 cal | 18g protéines | 7g glucides par portion.',
    $instr$["Faire tremper les noix de cajou dans l'eau 10-15 min pendant qu'on prépare les légumes.",
"Hacher grossièrement l'oignon, les tomates, le serrano et l'ail.",
"Dans une poêle, faire revenir ail, oignon et serrano 3-5 min. Ajouter 1 c. à soupe de pâte ail/gingembre et cuire jusqu'à doré. Ajouter les tomates et cuire 3 min de plus jusqu'à tendreté.",
"Ajouter 2 c. à café sel, 1 c. à café poivre noir, 1 c. à café curcuma, 1 c. à café cumin, 1 c. à café coriandre, 1,5 c. à café piment Kashmir, 1/2 c. à café paprika, 1/2 c. à café garam masala. Cuire à feu moyen 5-7 min.",
"Transférer dans un blender. Ajouter les noix de cajou égouttées, 1/2 tasse cottage cheese, 1/2 tasse d'eau. Mixer jusqu'à lisse (Vitamix recommandé).",
"Reverser la sauce dans la poêle. Couper le paneer en cubes et l'ajouter. Mijoter à feu doux-moyen 5 min pour mêler les saveurs.",
"Saupoudrer de coriandre fraîche et une pincée de piment Kashmir pour la couleur."]
$instr$,
    15, 20, 6, 3,
    'Indienne', 'dinner',
    ARRAY['paneer','végétarien','high-protein','indien','tikka','masala'],
    'manual',
    '{"calories":280,"protein_g":18,"carbs_g":7,"per_serving":true}'::jsonb
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'paneer',                  450, 'g',     true,  1,  '2 paquets de 8 oz'),
    (v_recipe_id, 'tomate Roma',             2,   'unité', true,  2,  NULL),
    (v_recipe_id, 'serrano',                 1,   'unité', true,  3,  'demi pour mild, entier pour épicé'),
    (v_recipe_id, 'oignon jaune',            1,   'unité', true,  4,  'moyen'),
    (v_recipe_id, 'ail',                     5,   'gousse', true,  5,  NULL),
    (v_recipe_id, 'pâte ail/gingembre',      1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'concentré de tomate',     60,  'ml',    true,  7,  '1/4 tasse'),
    (v_recipe_id, 'cottage cheese',          120, 'ml',    true,  8,  '1/2 tasse'),
    (v_recipe_id, 'noix de cajou',           1,   'unité', true,  9,  'poignée, trempées 10-15 min'),
    (v_recipe_id, 'coriandre fraîche',       1,   'unité', false, 10, 'pour garnir'),
    (v_recipe_id, 'sel',                     2,   'c. à café', true,  11, NULL),
    (v_recipe_id, 'poivre noir',             1,   'c. à café', true,  12, NULL),
    (v_recipe_id, 'curcuma',                 1,   'c. à café', true,  13, NULL),
    (v_recipe_id, 'cumin moulu',             1,   'c. à café', true,  14, NULL),
    (v_recipe_id, 'coriandre moulue',        1,   'c. à café', true,  15, NULL),
    (v_recipe_id, 'piment de Kashmir',       1.5, 'c. à café', true,  16, NULL),
    (v_recipe_id, 'paprika',                 0.5, 'c. à café', true,  17, NULL),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café', true,  18, NULL);

  -- =====================================================================
  -- 6. Tandoori Salmon Glow Bowl
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags, source_type, nutrition_info
  ) VALUES (
    v_user_id,
    'Tandoori Salmon Glow Bowl',
    'Bowl complet : quinoa épicé édamame + saumon tandoori à l''air fryer + chard arc-en-ciel à l''ail + dressing chutney vert cottage cheese. 525 cal | 45g protéines | 26g glucides par portion.',
    $instr$["[QUINOA INSTANT POT] Mode sauté. Huile + 1/2 c. à soupe graines de moutarde + quelques feuilles de curry séchées + serrano fendu — laisser sizzler 30 sec.",
"Ajouter 1/2 oignon dicé, cuire 3 min. Ajouter 2 tomates dicées, cuire 5 min.",
"Ajouter pâte ail/gingembre, sel, poivre, curcuma, coriandre, cumin, piment rouge et 1/3 tasse édamame congelé.",
"Une fois le liquide des légumes évaporé, ajouter 1/2 tasse quinoa lavé + 1 tasse d'eau. Pression cooker 1 min, release naturel 10 min.",
"[SAUMON] Mélanger pâte ail/gingembre, jus 1/2 citron vert, 1/8 tasse coconut aminos, curcuma, piment Kashmir, garam masala, coriandre, sel. Enrober le saumon et mariner 10+ min.",
"Air fryer à 200°C / 400°F pendant 10 min jusqu'à doré.",
"[DRESSING] Mixer 1 tasse cottage cheese + 1/2 tasse coriandre + 1 c. à café cumin moulu + 1/2 c. à café sel + jus 1 citron vert (option : menthe + 1/2 serrano).",
"[CHARD] Laver et séparer tiges et feuilles. Faire revenir les tiges hachées avec l'ail dans l'huile 1-2 min. Ajouter les feuilles, cuire 3-5 min jusqu'à flétrissement. Sel, poivre, jus de 1/2 citron.",
"[ASSEMBLAGE] Chard, quinoa (1/3 tasse), saumon, oignons rouges, fromage de chèvre (2 c. à soupe), dressing chutney vert cottage cheese (2 c. à soupe), coriandre fraîche."]
$instr$,
    15, 30, 3, 3,
    'Fusion', 'dinner',
    ARRAY['saumon','bowl','indien','quinoa','high-protein','glow-bowl','tandoori'],
    'manual',
    '{"calories":525,"protein_g":45,"carbs_g":26,"per_serving":true}'::jsonb
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    -- saumon
    (v_recipe_id, 'filet de saumon',       1,   'unité', true,  1,  'par portion'),
    (v_recipe_id, 'pâte ail/gingembre',    1,   'c. à soupe', true,  2,  'partagé saumon/quinoa'),
    (v_recipe_id, 'citron vert',           2,   'unité', true,  3,  '1/2 saumon + 1 dressing + 1/2 chard'),
    (v_recipe_id, 'coconut aminos',        30,  'ml',    true,  4,  '1/8 tasse, ou tamari'),
    (v_recipe_id, 'curcuma',               1,   'c. à café', true,  5,  'saumon + quinoa'),
    (v_recipe_id, 'piment de Kashmir',     0.5, 'c. à café', true,  6,  NULL),
    (v_recipe_id, 'garam masala',          0.25,'c. à café', false, 7,  NULL),
    (v_recipe_id, 'coriandre moulue',      1.25,'c. à café', true,  8,  NULL),
    (v_recipe_id, 'sel',                   3,   'c. à café', true,  9,  'réparti'),
    -- quinoa
    (v_recipe_id, 'quinoa',                90,  'g',     true,  10, '1/2 tasse, lavé'),
    (v_recipe_id, 'oignon jaune',          0.5, 'unité', true,  11, 'dicé'),
    (v_recipe_id, 'tomate',                2,   'unité', true,  12, 'dicées'),
    (v_recipe_id, 'serrano',               1,   'unité', true,  13, 'fendu dans la longueur'),
    (v_recipe_id, 'édamame congelé',       80,  'g',     true,  14, '1/3 tasse'),
    (v_recipe_id, 'graines de moutarde',   0.5, 'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'feuilles de curry',     1,   'pincée', false, 16, 'séchées'),
    (v_recipe_id, 'poivre noir',           0.5, 'c. à café', true,  17, NULL),
    (v_recipe_id, 'cumin moulu',           1.5, 'c. à café', true,  18, 'réparti'),
    (v_recipe_id, 'piment rouge',          0.5, 'c. à café', false, 19, NULL),
    -- dressing
    (v_recipe_id, 'cottage cheese',        240, 'ml',    true,  20, '1 tasse'),
    (v_recipe_id, 'coriandre fraîche',     120, 'ml',    true,  21, '1/2 tasse + garniture'),
    (v_recipe_id, 'menthe fraîche',        1,   'pincée', false, 22, 'optionnel'),
    -- chard
    (v_recipe_id, 'chard arc-en-ciel',     3,   'unité', true,  23, '1 bouquet par portion'),
    (v_recipe_id, 'ail',                   6,   'gousse', true,  24, '4-6 gousses, émincées'),
    (v_recipe_id, 'huile d''olive',        1,   'c. à café', true,  25, NULL),
    -- garnitures
    (v_recipe_id, 'oignon rouge',          0.25,'unité', false, 26, 'pour garnir'),
    (v_recipe_id, 'fromage de chèvre',     2,   'c. à soupe', false, 27, 'pour garnir');

  RAISE NOTICE 'Seed: inserted 6 recipes for user %', v_user_id;
END $$;
