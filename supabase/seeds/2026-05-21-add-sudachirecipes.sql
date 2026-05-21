-- =====================================================================
-- Seed: 8 Japanese recipes from sudachirecipes.com (2026-05-21)
--
-- Sources fetched 2026-05-21 (WordPress blog, WebFetch OK) :
--   1. https://sudachirecipes.com/salmon-don/
--   2. https://sudachirecipes.com/japanese-curry-roux-cubes/
--   3. https://sudachirecipes.com/teriyaki-burgers/
--   4. https://sudachirecipes.com/chicken-katsudon/
--   5. https://sudachirecipes.com/shio-koji-karaage/
--   6. https://sudachirecipes.com/tori-chili/
--   7. https://sudachirecipes.com/mabo-tofu/
--   8. https://sudachirecipes.com/japanese-teriyaki-chicken/
--
-- Note collisions : "Katsudon" et "Mapo Tofu" existent déjà dans
-- d'autres seeds — ici noms suffixés " (Sudachi)" pour cohabiter.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-21-add-sudachirecipes.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Salmon Sashimi Donburi',
    'Curry Japonais aux Cubes de Roux',
    'Teriyaki Burgers (Sudachi)',
    'Chicken Katsudon (Sudachi)',
    'Shio Koji Karaage',
    'Tori Chili',
    'Mabo Tofu (Sudachi)',
    'Teriyaki Chicken Croustillant (Sudachi)'
  ];
BEGIN

  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Salmon Sashimi Donburi
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Salmon Sashimi Donburi',
    'Bol de riz japonais garni de cubes de saumon cru de qualité sashimi marinés dans une sauce soja-mirin-saké infusée au kombu. Avocat et concombre apportent fraîcheur et contraste.',
    $instr$["Verser sauce soja, mirin et saké dans une casserole et porter à ébullition 1 minute pour éliminer l'alcool.",
"Transférer la marinade dans un récipient résistant à la chaleur, ajouter le kombu et laisser refroidir complètement à température ambiante.",
"Couper le saumon de qualité sashimi et l'avocat en cubes réguliers.",
"Disposer saumon et avocat en couche unique dans la marinade refroidie, couvrir au contact avec un film plastique et réfrigérer 30 minutes.",
"Dresser le riz dans des bols donburi.",
"Couper le concombre en cubes et le répartir sur le riz avec le saumon et l'avocat marinés.",
"Arroser chaque bol de ~½ c. à soupe de marinade restante.",
"Garnir de graines de sésame, nori effilé et filaments de piment.",
"Servir avec une pointe de wasabi à part."]
$instr$,
    5, 5, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['saumon cru','donburi','sashimi','japonais','marinade','rapide','riz'],
    'manual',
    'https://sudachirecipes.com/salmon-don/',
    'https://sudachirecipes.com/wp-content/uploads/2020/01/salmon-sashimi-bowl-sq-550x550.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'sauce soja koikuchi',        3,   'c. à soupe', true,  1,  'pour marinade'),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      3,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'bouillon dashi',                       3,   'c. à soupe', true,  3,  'ou bouillon et vinaigre de cidre sec'),
    (v_recipe_id, 'kombu',                      5,   'g',          true,  4,  'pour umami'),
    (v_recipe_id, 'saumon sashimi',             200, 'g',          true,  5,  'qualité sushi, frais'),
    (v_recipe_id, 'avocat',                     1,   'unité',      true,  6,  'mûr'),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  7,  '2 portions, grain court'),
    (v_recipe_id, 'concombre japonais',         1,   'unité',      true,  8,  'ou ½ persan'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à café',  false, 9,  'grillées'),
    (v_recipe_id, 'nori effilé (kizami nori)',  1,   'pincée',     false, 10, 'optionnel'),
    (v_recipe_id, 'wasabi',                     0.5, 'c. à café',  false, 11, 'optionnel');

  -- =====================================================================
  -- 2. Curry Japonais aux Cubes de Roux
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Curry Japonais aux Cubes de Roux',
    'Méthode complète pour curry japonais maison à partir de cubes de roux du commerce : oignons longuement caramélisés, bœuf, carottes et pommes de terre, mijotés dans un bouillon riche.',
    $instr$["Émincer 300 g d'oignon et le faire revenir à feu moyen dans l'huile d'olive 10 minutes en remuant régulièrement.",
"Saler légèrement, baisser le feu et continuer à caraméliser 20-30 minutes jusqu'à coloration profonde.",
"Couper le bœuf en morceaux réguliers ; faire fondre le beurre dans une grande casserole.",
"Faire revenir l'ail dans le beurre chaud, puis saisir le bœuf pour le colorer sur toutes les faces.",
"Ajouter carottes et pommes de terre en morceaux, incorporer les oignons caramélisés et mélanger.",
"Verser l'eau ou le bouillon, porter à ébullition, baisser le feu et mijoter à couvert 20 minutes.",
"Écumer la mousse en surface puis ajouter les cubes de roux en remuant jusqu'à dissolution.",
"Mijoter à découvert 5-10 minutes jusqu'à épaississement nappant.",
"Servir sur riz japonais chaud, avec cornichons fukujinzuke ou fromage râpé en option."]
$instr$,
    10, 80, 6, 2,
    'Japonaise', 'dinner',
    ARRAY['curry japonais','bœuf','roux','comfort-food','plat-familial','mijoté','riz'],
    'manual',
    'https://sudachirecipes.com/japanese-curry-roux-cubes/',
    'https://sudachirecipes.com/wp-content/uploads/2022/08/Japanese-curry-using-roux-thumbnail-550x550.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon',                     300, 'g',          true,  1,  'pour caramélisation'),
    (v_recipe_id, 'huile d''olive',             15,  'ml',         true,  2,  NULL),
    (v_recipe_id, 'bœuf',                       300, 'g',          true,  3,  'en morceaux'),
    (v_recipe_id, 'beurre',                     15,  'g',          true,  4,  NULL),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  5,  'écrasée'),
    (v_recipe_id, 'carotte',                    150, 'g',          true,  6,  'en morceaux moyens'),
    (v_recipe_id, 'pomme de terre',             200, 'g',          true,  7,  'en morceaux moyens'),
    (v_recipe_id, 'roux de curry japonais',     100, 'g',          true,  8,  '~½ boîte'),
    (v_recipe_id, 'eau ou bouillon',            800, 'ml',         true,  9,  'selon préférence'),
    (v_recipe_id, 'riz japonais cuit',          960, 'g',          true,  10, 'pour servir');

  -- =====================================================================
  -- 3. Teriyaki Burgers (Sudachi)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Teriyaki Burgers (Sudachi)',
    'Burger japonais à la galette de porc-miso glacée à la sauce teriyaki. Pâte au panko trempé dans le saké, malaxage activé pour cohésion, finition au glaçage brillant.',
    $instr$["Tremper le panko dans le saké quelques minutes ; mélanger sauce soja, saké, mirin et miel pour la sauce teriyaki.",
"Malaxer le porc haché avec sel et miso blanc jusqu'à texture collante (myosine activée).",
"Incorporer le panko trempé, puis gingembre râpé et saindoux jusqu'à homogénéité.",
"Couvrir et réfrigérer 30 minutes pour fixer la structure.",
"Former 2 galettes plus larges que les pains (1,5-2 cm d'épaisseur), avec une dépression centrale pour éviter le bombement.",
"Saupoudrer légèrement les deux faces de fécule de pomme de terre et secouer l'excédent.",
"Cuire 6 minutes par face dans l'huile chaude jusqu'à 75°C à cœur ; laisser reposer sur grille.",
"Toaster les pains dans le gras résiduel 1 minute.",
"Réduire la sauce teriyaki jusqu'à napper, puis y passer les galettes pour les enrober.",
"Assembler : pain, laitue, galette glacée, poivre, beni shoga, tomate, mayo japonaise, pain supérieur."]
$instr$,
    15, 15, 2, 3,
    'Japonaise', 'lunch',
    ARRAY['burger japonais','teriyaki','porc','miso','fusion','sauce-sucrée-salée','panko'],
    'manual',
    'https://sudachirecipes.com/teriyaki-burgers/',
    'https://sudachirecipes.com/wp-content/uploads/2026/04/teriyaki-burger-thumb-550x550.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'boeuf hache',                 300, 'g',          true,  1,  '20% de matière grasse'),
    (v_recipe_id, 'miso blanc',                 1,   'c. à café',  true,  2,  'umami caché'),
    (v_recipe_id, 'panko',                      1,   'c. à soupe', true,  3,  'panade'),
    (v_recipe_id, 'bouillon dashi',                       2,   'c. à soupe', true,  4,  'pour la panade'),
    (v_recipe_id, 'gingembre',                  1,   'c. à café',  true,  5,  'râpé'),
    (v_recipe_id, 'saindoux',                   1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  7,  'activation myosine'),
    (v_recipe_id, 'fécule de pomme de terre',   1,   'c. à soupe', true,  8,  'par galette'),
    (v_recipe_id, 'sauce soja koikuchi',        1.5, 'c. à soupe', true,  9,  'teriyaki'),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      1.5, 'c. à soupe', true,  10, 'teriyaki'),
    (v_recipe_id, 'miel',                       1,   'c. à soupe', true,  11, 'teriyaki'),
    (v_recipe_id, 'pains à burger',             2,   'unité',      true,  12, 'fermes, à toaster'),
    (v_recipe_id, 'laitue iceberg',             4,   'feuille',    true,  13, 'barrière humidité'),
    (v_recipe_id, 'beni shoga',                 2,   'c. à café',  true,  14, 'gingembre mariné rose'),
    (v_recipe_id, 'tomate',                     1,   'unité',      true,  15, 'tranches fines'),
    (v_recipe_id, 'mayonnaise Kewpie',          2,   'c. à soupe', true,  16, 'japonaise');

  -- =====================================================================
  -- 4. Chicken Katsudon (Sudachi)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Katsudon (Sudachi)',
    'Donburi classique : escalope de poulet panko double-frite, mijotée dans une sauce dashi-mirin-soja avec oignon, lié par un œuf battu en spirale. Servi sur riz, garni de nori et oignon vert.',
    $instr$["Marquer la chair du poulet, l'aplatir uniformément à 1-2 cm et la couper en portions égales.",
"Préchauffer l'huile à 170°C ; préparer deux bols : mélange farine-fécule et chapelure panko.",
"Fouetter œuf, farine et eau pour former une pâte épaisse.",
"Assaisonner le poulet, l'enrober du mélange farine-fécule, le tremper dans la pâte.",
"Presser fermement dans la chapelure et plonger immédiatement dans l'huile chaude ; frire 3 minutes par face.",
"Égoutter sur grille 2 minutes, monter l'huile à 180°C et refrire 30-60 secondes pour le croustillant.",
"Dans une poêle : verser dashi, mirin, sucre, poudre de bouillon et oignon ; cuire 3-4 minutes.",
"Ajouter sauce soja et disposer les lanières de katsu, verser les blancs d'œuf en spirale.",
"Couvrir 1 minute, puis verser les jaunes battus en spirale, couvrir et éteindre 60-90 secondes.",
"Dresser sur riz chaud, napper de bouillon, garnir de nori et oignons verts."]
$instr$,
    15, 20, 2, 3,
    'Japonaise', 'dinner',
    ARRAY['katsudon','poulet pané','donburi','dashi','japonais','double-friture','panko'],
    'manual',
    'https://sudachirecipes.com/chicken-katsudon/',
    'https://sudachirecipes.com/wp-content/uploads/2025/10/chicken-katsudon-thumb-550x550.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filet de poulet',            350, 'g',          true,  1,  'cuisse ou blanc'),
    (v_recipe_id, 'farine',                     1,   'c. à soupe', true,  2,  'pour l''enrobage'),
    (v_recipe_id, 'fécule de maïs',             0.5, 'c. à soupe', true,  3,  'pour l''enrobage'),
    (v_recipe_id, 'chapelure panko',            60,  'g',          true,  4,  NULL),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  5,  'pour la pâte'),
    (v_recipe_id, 'farine',                     5,   'c. à soupe', true,  6,  'pour la pâte'),
    (v_recipe_id, 'eau',                        3,   'c. à soupe', true,  7,  'pour la pâte'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  8,  NULL),
    (v_recipe_id, 'poivre',                     1,   'pincée',     true,  9,  NULL),
    (v_recipe_id, 'huile neutre',               500, 'ml',         true,  10, 'pour la friture'),
    (v_recipe_id, 'bouillon dashi',             150, 'ml',         true,  11, NULL),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      3,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'sucre roux',                 1,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'poudre de bouillon poulet',  1,   'c. à café',  true,  14, 'style chinois'),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  15, 'tranché fin'),
    (v_recipe_id, 'sauce soja koikuchi',        5,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'œufs',                       3,   'unité',      true,  17, 'blancs et jaunes séparés'),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  18, '2 portions'),
    (v_recipe_id, 'nori effilé',                1,   'pincée',     false, 19, 'garniture'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       false, 20, 'hachés fin');

  -- =====================================================================
  -- 5. Shio Koji Karaage
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Shio Koji Karaage',
    'Karaage japonais ultra-tendre grâce à une marinade au shio koji (riz fermenté salé) qui attendrit la viande et apporte une profondeur umami complexe. Double-friture pour le croustillant.',
    $instr$["Couper les cuisses de poulet en morceaux moyens et les placer dans un bol.",
"Ajouter shio koji, saké, sauce soja claire, gingembre et ail râpés ; bien enrober.",
"Couvrir et réfrigérer 30 minutes maximum (les enzymes attendrissent la viande).",
"Préchauffer l'huile à 160°C dans une cocotte profonde.",
"Retirer l'excès de marinade, ajouter farine et fécule de pomme de terre pour former une pâte collante.",
"Enrober chaque morceau de fécule supplémentaire sur un plateau et secouer l'excédent.",
"Plonger immédiatement dans l'huile chaude et frire 3 minutes en remuant doucement.",
"Égoutter sur grille et laisser reposer 3 minutes.",
"Monter l'huile à 185-190°C et refrire 30-60 secondes jusqu'à doré.",
"Égoutter sur grille et servir immédiatement avec riz blanc et sauce miso."]
$instr$,
    5, 15, 4, 3,
    'Japonaise', 'dinner',
    ARRAY['karaage','poulet frit','shio koji','japonais','fermentation','double-friture','umami'],
    'manual',
    'https://sudachirecipes.com/shio-koji-karaage/',
    'https://sudachirecipes.com/wp-content/uploads/2025/08/shio-koji-karaage-thumb-550x550.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisse de poulet',           450, 'g',          true,  1,  'désossée, peau attachée'),
    (v_recipe_id, 'shio koji',                  2,   'c. à soupe', true,  2,  'pâte fermentée'),
    (v_recipe_id, 'bouillon dashi',                       1,   'c. à soupe', true,  3,  'ou bouillon et jus de citron sec'),
    (v_recipe_id, 'sauce soja claire (usukuchi)',0.5,'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'gingembre',                  0.5, 'c. à soupe', true,  5,  'râpé'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  6,  'râpée'),
    (v_recipe_id, 'farine',                     2,   'c. à soupe', true,  7,  'pâte'),
    (v_recipe_id, 'fécule de pomme de terre',   2,   'c. à soupe', true,  8,  'pâte (katakuriko)'),
    (v_recipe_id, 'fécule de pomme de terre',   4,   'c. à soupe', true,  9,  'enrobage final'),
    (v_recipe_id, 'huile neutre',               1000,'ml',         true,  10, 'pour la friture');

  -- =====================================================================
  -- 6. Tori Chili
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Tori Chili',
    'Version poulet du célèbre ebi chili sino-japonais : morceaux de poulet enrobés d''une sauce maison sucrée-épicée au toban djan, ketchup et huile de piment. Servi avec œufs brouillés et riz.',
    $instr$["Couper la poitrine de poulet en morceaux moyens, assaisonner sel et poivre blanc, ajouter le saké et mélanger.",
"Incorporer le blanc d'œuf en versant doucement pour couvrir uniformément.",
"Ajouter la fécule de pomme de terre et mélanger pour enrober tous les morceaux.",
"Verser l'huile de cuisson, mélanger à nouveau et laisser reposer 5-10 minutes.",
"Chauffer une grande poêle à feu moyen, frire le poulet jusqu'à dorage des deux côtés (pas entièrement cuit).",
"Retirer le poulet, dans la même poêle faire revenir ail, gingembre et blanc de poireau jusqu'à parfumé.",
"Ajouter le toban djan et chauffer 1 minute pour développer les arômes.",
"Verser le mélange sauce (ketchup, sucre, saké, eau, bouillon, dashi) et laisser bouillir 1-2 minutes.",
"Remettre le poulet avec petits pois, jus de citron, huile de piment et huile de sésame ; glacer 1 minute.",
"Préparer les œufs brouillés au beurre. Servir le tori chili avec les œufs et du riz blanc."]
$instr$,
    10, 20, 2, 3,
    'Japonaise', 'dinner',
    ARRAY['poulet','sino-japonais','épicé','toban djan','umami','rapide','œufs brouillés'],
    'manual',
    'https://sudachirecipes.com/tori-chili/',
    'https://sudachirecipes.com/wp-content/uploads/2024/11/tori-chili-thumb-550x550.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poitrine de poulet',         300, 'g',          true,  1,  'en morceaux moyens'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  2,  NULL),
    (v_recipe_id, 'poivre blanc',               1,   'pincée',     true,  3,  NULL),
    (v_recipe_id, 'bouillon dashi',                       0.5, 'c. à soupe', true,  4,  'marinade'),
    (v_recipe_id, 'blanc d''œuf',               1,   'unité',      true,  5,  'jaune réservé'),
    (v_recipe_id, 'fécule de pomme de terre',   1,   'c. à soupe', true,  6,  'katakuriko'),
    (v_recipe_id, 'huile neutre',               0.5, 'c. à soupe', true,  7,  'pour enrober'),
    (v_recipe_id, 'toban djan',                 0.5, 'c. à soupe', true,  8,  'pâte de fèves épicée'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  9,  'haché fin'),
    (v_recipe_id, 'naganegi',                   0.5, 'unité',      true,  10, 'blanc, haché fin'),
    (v_recipe_id, 'gingembre',                  1,   'c. à soupe', true,  11, 'haché fin'),
    (v_recipe_id, 'eau',                        3,   'c. à soupe', true,  12, 'sauce'),
    (v_recipe_id, 'sucre roux clair',           0.5, 'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'ketchup',                    2,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'bouillon dashi',                       1,   'c. à soupe', true,  15, 'sauce'),
    (v_recipe_id, 'poudre de bouillon poulet',  1,   'c. à café',  true,  16, 'chinois'),
    (v_recipe_id, 'granules de dashi',          0.5, 'c. à café',  true,  17, NULL),
    (v_recipe_id, 'jus de citron',              1,   'c. à café',  true,  18, NULL),
    (v_recipe_id, 'huile de sésame grillée',    1,   'c. à café',  true,  19, NULL),
    (v_recipe_id, 'huile de piment (rayu)',     0.5, 'c. à soupe', true,  20, NULL),
    (v_recipe_id, 'petits pois',                2,   'c. à soupe', true,  21, 'frais ou surgelés'),
    (v_recipe_id, 'beurre',                     0.5, 'c. à soupe', true,  22, 'pour œufs'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  23, 'pour brouiller'),
    (v_recipe_id, 'oignons verts',              1,   'tige',       false, 24, 'garniture');

  -- =====================================================================
  -- 7. Mabo Tofu (Sudachi)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Mabo Tofu (Sudachi)',
    'Adaptation japonaise du mapo tofu du Sichuan : porc haché, tofu ferme et oignon dans une sauce miso-toban djan épicée. Plat populaire au Japon avec une note plus douce.',
    $instr$["Saisir le porc haché à feu moyen-vif 30 secondes sans remuer puis l'émietter à la spatule.",
"Ajouter l'oignon haché fin et cuire 2-3 minutes jusqu'à transparence.",
"Incorporer 0,5 c. à soupe de saké, 0,5 c. à soupe de sauce soja et le miso ; mélanger pour dissoudre.",
"Créer un puits, ajouter huile de sésame, toban djan et ail, laisser mijoter 30 secondes pour libérer les arômes.",
"Verser le bouillon, ajouter les cubes de tofu, porter à ébullition et baisser à feu doux.",
"Incorporer le reste du saké, sauce soja, sauce huître et poivre ; réduire à découvert 5-8 minutes.",
"Délayer la fécule de maïs dans l'eau froide et verser en filet en remuant pour épaissir.",
"Mijoter 30 secondes jusqu'à obtenir une sauce brillante.",
"Retirer du feu, ajouter l'huile pimentée et mélanger.",
"Servir garni d'oignon vert ciselé sur du riz blanc chaud."]
$instr$,
    5, 20, 3, 2,
    'Japonaise', 'dinner',
    ARRAY['tofu','porc haché','sino-japonais','épicé','umami','sauce-miso','rapide'],
    'manual',
    'https://sudachirecipes.com/mabo-tofu/',
    'https://sudachirecipes.com/wp-content/uploads/2026/01/mapo-tofu-26-thumb-550x550.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'boeuf hache',                 100, 'g',          true,  1,  'ou mélange 50/50'),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  2,  'haché fin'),
    (v_recipe_id, 'tofu ferme',                 300, 'g',          true,  3,  'en cubes 2 cm'),
    (v_recipe_id, 'pâte de miso (awase)',       1,   'c. à soupe', true,  4,  'jaune ou mélange'),
    (v_recipe_id, 'toban djan',                 0.5, 'c. à soupe', true,  5,  'pâte chili fermentée'),
    (v_recipe_id, 'bouillon de poulet',         200, 'ml',         true,  6,  NULL),
    (v_recipe_id, 'huile de sésame grillée',    1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'gingembre',                  1,   'c. à café',  false, 8,  'râpé, optionnel'),
    (v_recipe_id, 'sauce d''huître',            1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'huile pimentée (rayu)',      2,   'c. à café',  true,  10, 'finition'),
    (v_recipe_id, 'fécule de maïs',             2,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'eau',                        2,   'c. à soupe', true,  12, 'froide, pour la fécule'),
    (v_recipe_id, 'sauce soja koikuchi',        1.5, 'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'bouillon dashi',                       1.5, 'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'oignon vert',                1,   'tige',       false, 15, 'ciselé, garniture');

  -- =====================================================================
  -- 8. Teriyaki Chicken Croustillant (Sudachi)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Teriyaki Chicken Croustillant (Sudachi)',
    'Méthode japonaise authentique pour cuisses de poulet à peau croustillante glacées à la sauce teriyaki maison (saké, mirin, sauce soja, sucre, dashi, miel). Prêt en 20 minutes.',
    $instr$["Poser la cuisse peau vers le bas, inciser horizontalement les zones épaisses pour uniformiser l'épaisseur.",
"Retourner et piquer la peau à la fourchette, assaisonner chaque face d'une pincée de sel.",
"Sécher la surface au papier essuie-tout et saupoudrer légèrement la chair de fécule de pomme de terre.",
"Chauffer la poêle à feu moyen avec l'huile, poser le poulet peau vers le bas et cuire 7 minutes sans toucher.",
"Mélanger sauce soja, mirin, saké, sucre, dashi et miel jusqu'à dissolution.",
"Retourner le poulet et cuire 2 minutes l'autre face, puis transférer brièvement sur assiette.",
"Évacuer le gras rendu en gardant ~1 c. à soupe, éteindre le feu et verser la sauce.",
"Racler les sucs caramélisés au fond avec une spatule en bois.",
"Remettre à feu moyen-vif et mijoter 60 secondes, puis remettre le poulet peau vers le haut.",
"Arroser continuellement à la cuillère 30-60 secondes jusqu'à sauce nappante.",
"Reposer 3 minutes, trancher et servir avec le glaçage restant."]
$instr$,
    5, 12, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['poulet','teriyaki','japonais','croustillant','sauce-maison','rapide','authentique'],
    'manual',
    'https://sudachirecipes.com/japanese-teriyaki-chicken/',
    'https://sudachirecipes.com/wp-content/uploads/2025/08/teriyaki-chicken-thumb-new-550x550.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet désossées',450, 'g',          true,  1,  'avec peau'),
    (v_recipe_id, 'sel',                        4,   'pincée',     true,  2,  '1 par face'),
    (v_recipe_id, 'fécule de pomme de terre',   0.5, 'c. à soupe', true,  3,  'ou maïzena'),
    (v_recipe_id, 'huile neutre',               0.5, 'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'sauce soja koikuchi',        1.5, 'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      1.5, 'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'bouillon dashi',                       1.5, 'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sucre roux clair',           1,   'c. à café',  true,  8,  'ou sucre blanc'),
    (v_recipe_id, 'bouillon dashi',             1.5, 'c. à soupe', true,  9,  'ou eau + dashi'),
    (v_recipe_id, 'miel',                       0.5, 'c. à café',  true,  10, NULL);

END $$;
