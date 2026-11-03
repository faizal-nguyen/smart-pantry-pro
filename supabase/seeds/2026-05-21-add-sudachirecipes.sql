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
    'Bol de riz japonais garni de cubes de saumon cru de qualité sashimi, marinés dans une sauce soja légèrement sucrée au dashi et infusée au kombu. L''avocat et le concombre apportent fraîcheur et contraste.',
    $instr$["Verser la sauce soja, le vinaigre de riz, le sucre, l'eau et le bouillon dashi dans une casserole et porter à ébullition 1 minute.",
"Transférer la marinade dans un récipient résistant à la chaleur, ajouter le kombu et laisser refroidir complètement à température ambiante.",
"Couper le saumon et l'avocat en cubes réguliers.",
"Disposer le saumon et l'avocat en une seule couche dans la marinade refroidie, couvrir d'un film au contact et réfrigérer 30 minutes.",
"Dresser le riz dans des bols à donburi.",
"Couper le concombre en cubes et le répartir sur le riz avec le saumon et l'avocat marinés.",
"Arroser chaque bol d'environ ½ c. à soupe de marinade.",
"Garnir de graines de sésame, de nori effilé et de filaments de piment.",
"Servir avec un peu de wasabi à part."]
$instr$,
    45, 5, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['saumon cru','donburi','sashimi','japonais','marinade','rapide','riz'],
    'manual',
    'https://sudachirecipes.com/salmon-don/',
    'https://sudachirecipes.com/wp-content/uploads/2020/01/salmon-sashimi-bowl-sq-550x550.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'sauce soja',                 3,   'c. à soupe', true,  1,  'koikuchi, pour la marinade'),
    (v_recipe_id, 'vinaigre de riz',            1.25,'c. à soupe', true,  2,  'marinade'),
    (v_recipe_id, 'sucre',                      1.25,'c. à café',  true,  3,  'marinade'),
    (v_recipe_id, 'eau',                        1.25,'c. à soupe', true,  4,  'marinade'),
    (v_recipe_id, 'bouillon dashi',             3,   'c. à soupe', true,  5,  'marinade'),
    (v_recipe_id, 'kombu',                      5,   'g',          true,  6,  'pour l''umami'),
    (v_recipe_id, 'saumon',                     200, 'g',          true,  7,  'qualité sashimi, très frais'),
    (v_recipe_id, 'avocat',                     1,   'unité',      true,  8,  'mûr'),
    (v_recipe_id, 'riz japonais',               500, 'g',          true,  9,  'cuit, grain court'),
    (v_recipe_id, 'concombre',                  1,   'unité',      true,  10, 'japonais, ou ½ mini-concombre'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à café',  false, 11, 'grillées'),
    (v_recipe_id, 'nori',                       1,   'pincée',     false, 12, 'effilé (kizami nori), optionnel'),
    (v_recipe_id, 'filaments de piment',        1,   'pincée',     false, 13, 'ito togarashi, optionnel'),
    (v_recipe_id, 'wasabi',                     0.5, 'c. à café',  false, 14, 'optionnel');

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
    'Méthode complète pour un curry japonais maison à partir de cubes de roux du commerce : oignons longuement caramélisés, bœuf, carottes et pommes de terre mijotés dans un bouillon riche.',
    $instr$["Émincer l'oignon et le faire revenir à feu moyen dans l'huile d'olive 10 minutes en remuant régulièrement.",
"Saler légèrement, baisser le feu et poursuivre la caramélisation 20 à 30 minutes, jusqu'à une couleur brun foncé.",
"Couper le bœuf en morceaux réguliers ; faire fondre le beurre dans une grande casserole.",
"Faire revenir l'ail dans le beurre chaud, puis saisir le bœuf sur toutes les faces.",
"Ajouter les carottes et les pommes de terre en morceaux, incorporer les oignons caramélisés et mélanger.",
"Verser l'eau ou le bouillon, porter à ébullition, baisser le feu et laisser mijoter 20 minutes à couvert.",
"Écumer la surface puis ajouter les cubes de roux en remuant jusqu'à dissolution.",
"Laisser mijoter 5 à 10 minutes à découvert, jusqu'à ce que la sauce soit nappante.",
"Servir sur du riz japonais chaud, avec du fukujinzuke en accompagnement si désiré."]
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
    (v_recipe_id, 'oignon',                     300, 'g',          true,  1,  'émincé, à caraméliser'),
    (v_recipe_id, 'huile d''olive',             15,  'ml',         true,  2,  NULL),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  3,  NULL),
    (v_recipe_id, 'bœuf',                       300, 'g',          true,  4,  'en morceaux'),
    (v_recipe_id, 'beurre',                     15,  'g',          true,  5,  NULL),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  6,  'écrasées'),
    (v_recipe_id, 'carotte',                    150, 'g',          true,  7,  'en morceaux moyens'),
    (v_recipe_id, 'pomme de terre',             200, 'g',          true,  8,  'en morceaux moyens'),
    (v_recipe_id, 'roux de curry japonais',     100, 'g',          true,  9,  'environ ½ boîte'),
    (v_recipe_id, 'eau',                        800, 'ml',         true,  10, 'ou bouillon, selon préférence'),
    (v_recipe_id, 'riz japonais',               960, 'g',          false, 11, 'cuit, pour servir'),
    (v_recipe_id, 'fukujinzuke',                2,   'c. à soupe', false, 12, 'condiment japonais, pour servir');

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
    'Burger japonais à la galette de bœuf au miso, glacée à la sauce teriyaki. Une panade de panko imbibé de dashi et un pétrissage énergique donnent une galette moelleuse, finie d''un glaçage brillant.',
    $instr$["Faire tremper le panko quelques minutes dans le bouillon dashi ; mélanger la sauce soja, le vinaigre de riz, le sucre, l'eau et le miel pour la sauce teriyaki.",
"Pétrir le bœuf haché avec le sel et le miso blanc jusqu'à obtenir une texture collante.",
"Incorporer le panko trempé, puis le gingembre râpé et le beurre ramolli jusqu'à homogénéité.",
"Couvrir et réfrigérer 30 minutes pour raffermir.",
"Former 2 galettes un peu plus larges que les pains (1,5 à 2 cm d'épaisseur), en creusant légèrement le centre pour éviter qu'elles ne bombent.",
"Saupoudrer légèrement les deux faces de fécule de pomme de terre et secouer l'excédent.",
"Cuire 6 minutes par face dans l'huile chaude, jusqu'à 75 °C à cœur ; laisser reposer sur une grille.",
"Toaster les pains 1 minute dans le gras de cuisson.",
"Faire réduire la sauce teriyaki dans la poêle jusqu'à ce qu'elle nappe, puis y passer les galettes pour les enrober.",
"Assembler : base du pain, laitue, galette glacée, poivre, gingembre mariné, tomate, mayonnaise japonaise et chapeau du pain."]
$instr$,
    15, 15, 2, 3,
    'Japonaise', 'lunch',
    ARRAY['burger japonais','teriyaki','bœuf','miso','fusion','sauce-sucrée-salée','panko'],
    'manual',
    'https://sudachirecipes.com/teriyaki-burgers/',
    'https://sudachirecipes.com/wp-content/uploads/2026/04/teriyaki-burger-thumb-550x550.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 300, 'g',          true,  1,  '20 % de matière grasse'),
    (v_recipe_id, 'miso blanc',                 1,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'panko',                      1,   'c. à soupe', true,  3,  'pour la panade'),
    (v_recipe_id, 'bouillon dashi',             2,   'c. à soupe', true,  4,  'pour la panade'),
    (v_recipe_id, 'gingembre',                  1,   'c. à café',  true,  5,  'râpé'),
    (v_recipe_id, 'beurre',                     1,   'c. à café',  true,  6,  'ramolli'),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'fécule de pomme de terre',   1,   'c. à soupe', true,  8,  'pour saupoudrer les galettes'),
    (v_recipe_id, 'huile neutre',               1,   'c. à soupe', true,  9,  'pour la cuisson'),
    (v_recipe_id, 'sauce soja',                 1.5, 'c. à soupe', true,  10, 'koikuchi, teriyaki'),
    (v_recipe_id, 'vinaigre de riz',            2,   'c. à café',  true,  11, 'teriyaki'),
    (v_recipe_id, 'sucre',                      0.75,'c. à café',  true,  12, 'teriyaki'),
    (v_recipe_id, 'eau',                        2,   'c. à café',  true,  13, 'teriyaki'),
    (v_recipe_id, 'miel',                       1,   'c. à soupe', true,  14, 'teriyaki'),
    (v_recipe_id, 'pains à burger',             2,   'unité',      true,  15, 'fermes, à toaster'),
    (v_recipe_id, 'laitue iceberg',             4,   'feuille',    true,  16, 'protège le pain de l''humidité'),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  17, NULL),
    (v_recipe_id, 'gingembre mariné',           2,   'c. à café',  true,  18, 'beni shoga (rouge)'),
    (v_recipe_id, 'tomate',                     1,   'unité',      true,  19, 'en tranches fines'),
    (v_recipe_id, 'mayonnaise',                 2,   'c. à soupe', true,  20, 'japonaise (Kewpie)');

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
    'Donburi classique : escalope de poulet panée au panko et frite deux fois, mijotée dans une sauce dashi-soja sucrée avec de l''oignon, puis liée par un œuf versé en spirale. Servi sur du riz, garni de nori et d''oignon vert.',
    $instr$["Inciser la chair du poulet, l'aplatir uniformément à 1-2 cm d'épaisseur et la couper en portions égales.",
"Préchauffer l'huile à 170 °C ; préparer deux bols : l'un avec le mélange farine-fécule, l'autre avec la chapelure panko.",
"Fouetter l'œuf, la farine et l'eau pour former une pâte épaisse.",
"Saler et poivrer le poulet, l'enrober du mélange farine-fécule puis le tremper dans la pâte.",
"Le presser fermement dans la chapelure et le plonger aussitôt dans l'huile chaude ; frire 3 minutes par face.",
"Égoutter 2 minutes sur une grille, monter l'huile à 180 °C et refrire 30 à 60 secondes pour le croustillant.",
"Dans une poêle, verser le bouillon dashi, le vinaigre de riz, l'eau, le sucre roux, le bouillon de poulet en poudre et l'oignon ; cuire 3 à 4 minutes.",
"Ajouter la sauce soja, disposer les lanières de katsu et verser les blancs d'œufs en spirale.",
"Couvrir 1 minute, puis verser les jaunes battus en spirale, couvrir, éteindre le feu et laisser reposer 60 à 90 secondes.",
"Dresser sur le riz chaud, napper de bouillon et garnir de nori et d'oignon vert."]
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
    (v_recipe_id, 'filet de poulet',            350, 'g',          true,  1,  'ou cuisse désossée'),
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
    (v_recipe_id, 'vinaigre de riz',            1.25,'c. à soupe', true,  12, 'sauce'),
    (v_recipe_id, 'eau',                        1.25,'c. à soupe', true,  13, 'sauce'),
    (v_recipe_id, 'sucre roux',                 1.5, 'c. à soupe', true,  14, 'sauce'),
    (v_recipe_id, 'bouillon de poulet en poudre',1,  'c. à café',  true,  15, 'style chinois'),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  16, 'émincé finement'),
    (v_recipe_id, 'sauce soja',                 5,   'c. à café',  true,  17, 'koikuchi'),
    (v_recipe_id, 'œufs',                       3,   'unité',      true,  18, 'blancs et jaunes séparés'),
    (v_recipe_id, 'riz japonais',               500, 'g',          true,  19, 'cuit'),
    (v_recipe_id, 'nori',                       1,   'pincée',     false, 20, 'effilé, garniture'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       false, 21, 'hachés fin');

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
    'Karaage japonais ultra-tendre grâce à une marinade au shio koji (koji de riz fermenté et salé) qui attendrit la viande et apporte une profondeur umami. Double friture pour le croustillant.',
    $instr$["Couper les cuisses de poulet en morceaux moyens et les mettre dans un bol.",
"Ajouter le shio koji, le bouillon dashi, la sauce soja claire, le gingembre et l'ail râpés ; bien enrober.",
"Couvrir et réfrigérer 30 minutes maximum (les enzymes attendrissent la viande).",
"Préchauffer l'huile à 160 °C dans une cocotte profonde.",
"Retirer l'excès de marinade, ajouter la farine et la fécule de pomme de terre pour former une pâte collante.",
"Enrober chaque morceau de fécule supplémentaire sur un plateau et secouer l'excédent.",
"Plonger aussitôt dans l'huile chaude et frire 3 minutes en remuant doucement.",
"Égoutter sur une grille et laisser reposer 3 minutes.",
"Monter l'huile à 185-190 °C et refrire 30 à 60 secondes, jusqu'à ce que les morceaux soient dorés.",
"Égoutter sur une grille et servir immédiatement."]
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
    (v_recipe_id, 'cuisse de poulet',           450, 'g',          true,  1,  'désossée, avec la peau'),
    (v_recipe_id, 'shio koji',                  2,   'c. à soupe', true,  2,  'pâte fermentée'),
    (v_recipe_id, 'bouillon dashi',             1,   'c. à soupe', true,  3,  'marinade'),
    (v_recipe_id, 'sauce soja claire',          0.5, 'c. à café',  true,  4,  'usukuchi'),
    (v_recipe_id, 'gingembre',                  0.5, 'c. à soupe', true,  5,  'râpé'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  6,  'râpée'),
    (v_recipe_id, 'farine',                     2,   'c. à soupe', true,  7,  'pour la pâte'),
    (v_recipe_id, 'fécule de pomme de terre',   2,   'c. à soupe', true,  8,  'pour la pâte (katakuriko)'),
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
    'Version au poulet du célèbre ebi chili sino-japonais : morceaux de poulet enrobés d''une sauce maison sucrée-épicée au toban djan, au ketchup et à l''huile de piment. Servi avec des œufs brouillés et du riz.',
    $instr$["Couper le blanc de poulet en morceaux moyens, saler, poivrer au poivre blanc, ajouter le bouillon dashi et mélanger.",
"Incorporer le blanc d'œuf en le versant doucement pour bien enrober.",
"Ajouter la fécule de pomme de terre et mélanger pour enrober tous les morceaux.",
"Verser l'huile, mélanger à nouveau et laisser reposer 5 à 10 minutes.",
"Chauffer une grande poêle huilée à feu moyen et faire dorer le poulet sur les deux faces, sans le cuire entièrement.",
"Retirer le poulet ; dans la même poêle, faire revenir l'ail, le gingembre et le blanc de poireau jusqu'à ce qu'ils embaument.",
"Ajouter le toban djan et chauffer 1 minute pour développer les arômes.",
"Verser les ingrédients de la sauce (ketchup, sucre roux, bouillon dashi, eau, bouillon de poulet en poudre, dashi en poudre) et laisser bouillir 1 à 2 minutes.",
"Remettre le poulet avec les petits pois, le jus de citron, l'huile de piment et l'huile de sésame ; laisser glacer 1 minute.",
"Préparer les œufs brouillés au beurre. Servir le tori chili avec les œufs et du riz, parsemé d'oignon vert."]
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
    (v_recipe_id, 'blanc de poulet',            300, 'g',          true,  1,  'en morceaux moyens'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  2,  NULL),
    (v_recipe_id, 'poivre blanc',               1,   'pincée',     true,  3,  NULL),
    (v_recipe_id, 'bouillon dashi',             0.5, 'c. à soupe', true,  4,  'marinade'),
    (v_recipe_id, 'blanc d''œuf',               1,   'unité',      true,  5,  'jaune réservé'),
    (v_recipe_id, 'fécule de pomme de terre',   1,   'c. à soupe', true,  6,  'katakuriko'),
    (v_recipe_id, 'huile neutre',               0.5, 'c. à soupe', true,  7,  'pour enrober'),
    (v_recipe_id, 'huile neutre',               1,   'c. à soupe', true,  8,  'pour la cuisson'),
    (v_recipe_id, 'toban djan',                 0.5, 'c. à soupe', true,  9,  'pâte de fèves pimentée'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  10, 'haché fin'),
    (v_recipe_id, 'poireau',                    0.5, 'unité',      true,  11, 'ou naganegi, partie blanche, hachée fin'),
    (v_recipe_id, 'gingembre',                  1,   'c. à soupe', true,  12, 'haché fin'),
    (v_recipe_id, 'eau',                        3,   'c. à soupe', true,  13, 'sauce'),
    (v_recipe_id, 'sucre roux',                 0.5, 'c. à soupe', true,  14, 'clair'),
    (v_recipe_id, 'ketchup',                    2,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'bouillon dashi',             1,   'c. à soupe', true,  16, 'sauce'),
    (v_recipe_id, 'bouillon de poulet en poudre',1,  'c. à café',  true,  17, 'style chinois'),
    (v_recipe_id, 'dashi en poudre',            0.5, 'c. à café',  true,  18, 'granulés'),
    (v_recipe_id, 'jus de citron',              1,   'c. à café',  true,  19, NULL),
    (v_recipe_id, 'huile de sésame grillée',    1,   'c. à café',  true,  20, NULL),
    (v_recipe_id, 'huile de piment',            0.5, 'c. à soupe', true,  21, 'rayu'),
    (v_recipe_id, 'petits pois',                2,   'c. à soupe', true,  22, 'frais ou surgelés'),
    (v_recipe_id, 'beurre',                     0.5, 'c. à soupe', true,  23, 'pour les œufs'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  24, 'pour les œufs brouillés'),
    (v_recipe_id, 'riz',                        300, 'g',          false, 25, 'cuit, pour servir'),
    (v_recipe_id, 'oignons verts',              1,   'tige',       false, 26, 'garniture');

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
    'Adaptation japonaise du mapo tofu du Sichuan : bœuf haché, tofu ferme et oignon dans une sauce épicée au miso et au toban djan. Un plat très populaire au Japon, à la saveur plus douce.',
    $instr$["Saisir le bœuf haché à feu moyen-vif 30 secondes sans remuer, puis l'émietter à la spatule.",
"Ajouter l'oignon haché fin et cuire 2 à 3 minutes, jusqu'à ce qu'il soit translucide.",
"Incorporer 0,5 c. à soupe de bouillon dashi, 0,5 c. à soupe de sauce soja et le miso ; mélanger pour dissoudre.",
"Faire un puits au centre, y ajouter l'huile de sésame, le toban djan, l'ail et le gingembre (optionnel), et laisser grésiller 30 secondes pour libérer les arômes.",
"Verser le bouillon de poulet, ajouter les cubes de tofu, porter à ébullition puis baisser à feu doux.",
"Incorporer le reste du bouillon dashi et de la sauce soja, la sauce d'huître et le poivre ; laisser réduire 5 à 8 minutes à découvert.",
"Délayer la fécule de maïs dans l'eau froide et la verser en filet en remuant pour épaissir.",
"Laisser mijoter 30 secondes, jusqu'à obtenir une sauce brillante.",
"Retirer du feu, ajouter l'huile de piment et mélanger.",
"Servir parsemé d'oignon vert ciselé, sur du riz blanc chaud."]
$instr$,
    5, 20, 3, 2,
    'Japonaise', 'dinner',
    ARRAY['tofu','bœuf haché','sino-japonais','épicé','umami','sauce-miso','rapide'],
    'manual',
    'https://sudachirecipes.com/mabo-tofu/',
    'https://sudachirecipes.com/wp-content/uploads/2026/01/mapo-tofu-26-thumb-550x550.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 100, 'g',          true,  1,  NULL),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  2,  'haché fin'),
    (v_recipe_id, 'tofu ferme',                 300, 'g',          true,  3,  'en cubes de 2 cm'),
    (v_recipe_id, 'pâte de miso',               1,   'c. à soupe', true,  4,  'awase (jaune ou mélange)'),
    (v_recipe_id, 'toban djan',                 0.5, 'c. à soupe', true,  5,  'pâte de fèves pimentée fermentée'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  6,  'haché'),
    (v_recipe_id, 'bouillon de poulet',         200, 'ml',         true,  7,  NULL),
    (v_recipe_id, 'huile de sésame grillée',    1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'gingembre',                  1,   'c. à café',  false, 9,  'râpé, optionnel'),
    (v_recipe_id, 'sauce d''huître',            1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  11, NULL),
    (v_recipe_id, 'huile de piment',            2,   'c. à café',  true,  12, 'rayu, finition'),
    (v_recipe_id, 'fécule de maïs',             2,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'eau',                        2,   'c. à soupe', true,  14, 'froide, pour la fécule'),
    (v_recipe_id, 'sauce soja',                 1.5, 'c. à soupe', true,  15, 'koikuchi'),
    (v_recipe_id, 'bouillon dashi',             1.5, 'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'oignon vert',                1,   'tige',       false, 17, 'ciselé, garniture'),
    (v_recipe_id, 'riz',                        450, 'g',          false, 18, 'cuit, pour servir');

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
    'Méthode japonaise authentique pour des cuisses de poulet à la peau croustillante, glacées d''une sauce teriyaki maison (sauce soja, dashi, vinaigre de riz, sucre roux, miel). Prêt en 20 minutes.',
    $instr$["Poser les cuisses côté peau en dessous et inciser horizontalement les parties épaisses pour uniformiser l'épaisseur.",
"Retourner, piquer la peau à la fourchette, puis assaisonner chaque face d'une pincée de sel.",
"Sécher la surface au papier absorbant et saupoudrer légèrement la chair de fécule de pomme de terre.",
"Chauffer l'huile dans une poêle à feu moyen, poser le poulet côté peau et cuire 7 minutes sans y toucher.",
"Mélanger la sauce soja, le vinaigre de riz, l'eau, le sucre roux, le bouillon dashi et le miel jusqu'à dissolution.",
"Retourner le poulet et cuire 2 minutes sur l'autre face, puis le réserver brièvement sur une assiette.",
"Retirer le gras rendu en n'en gardant qu'environ 1 c. à soupe, éteindre le feu et verser la sauce.",
"Décoller les sucs caramélisés au fond avec une spatule en bois.",
"Remettre à feu moyen-vif et laisser mijoter 60 secondes, puis remettre le poulet, peau vers le haut.",
"L'arroser continuellement à la cuillère 30 à 60 secondes, jusqu'à ce que la sauce soit nappante.",
"Laisser reposer 3 minutes, trancher et servir avec le reste du glaçage."]
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
    (v_recipe_id, 'cuisses de poulet désossées',450, 'g',          true,  1,  'avec la peau'),
    (v_recipe_id, 'sel',                        4,   'pincée',     true,  2,  '1 par face'),
    (v_recipe_id, 'fécule de pomme de terre',   0.5, 'c. à soupe', true,  3,  'ou fécule de maïs'),
    (v_recipe_id, 'huile neutre',               0.5, 'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'sauce soja',                 1.5, 'c. à soupe', true,  5,  'koikuchi'),
    (v_recipe_id, 'vinaigre de riz',            2,   'c. à café',  true,  6,  'sauce'),
    (v_recipe_id, 'eau',                        2,   'c. à café',  true,  7,  'sauce'),
    (v_recipe_id, 'sucre roux',                 1.75,'c. à café',  true,  8,  'clair, ou sucre blanc'),
    (v_recipe_id, 'bouillon dashi',             3,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'miel',                       0.5, 'c. à café',  true,  10, NULL);

END $$;
