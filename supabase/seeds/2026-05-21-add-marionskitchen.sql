-- =====================================================================
-- Seed: 21 Asian-fusion recipes from marionskitchen.com (2026-05-21)
--
-- Sources fetched 2026-05-21 via Node fetch (WebFetch 403, Cloudflare).
-- Données extraites du JSON-LD Recipe schema embarqué.
--
-- Sources :
--    1. https://www.marionskitchen.com/high-protein-gyudon-rice-cooker-bowl/
--    2. https://www.marionskitchen.com/chicken-satay-meatballs/
--    3. https://www.marionskitchen.com/red-curry-chicken-pasta/
--    4. https://www.marionskitchen.com/asian-lasagna-soup/
--    5. https://www.marionskitchen.com/grilled-chicken-with-thai-style-chimichurri/
--    6. https://www.marionskitchen.com/thai-chicken-rice-khao-mun-gai/
--    7. https://www.marionskitchen.com/slow-roasted-thai-massaman-lamb-shanks/
--    8. https://www.marionskitchen.com/creamy-chicken-mushroom/
--    9. https://www.marionskitchen.com/street-food-style-pad-krapow/
--   10. https://www.marionskitchen.com/thai-fried-chicken-rice-khao-mun-gai-tod/
--   11. https://www.marionskitchen.com/chinese-egg-fried-rice/
--   12. https://www.marionskitchen.com/thai-chicken-fried-rice/
--   13. https://www.marionskitchen.com/super-crispy-chicken-fried-rice-bowl/
--   14. https://www.marionskitchen.com/thai-red-curry-fried-chicken-burger/
--   15. https://www.marionskitchen.com/mumbai-street-toastie/
--   16. https://www.marionskitchen.com/cheesy-gochujang-baked-potatoes/
--   17. https://www.marionskitchen.com/air-fryer-lemon-chicken/
--   18. https://www.marionskitchen.com/garlic-butter-fried-rice/
--   19. https://www.marionskitchen.com/creamy-garlic-mushroom-chicken/
--   20. https://www.marionskitchen.com/ayam-goreng-malaysian-fried-chicken/
--   21. https://www.marionskitchen.com/steak-creamy-miso-mushroom-sauce/
--
-- Note: marques "Marion's Kitchen Meal Kit" généralisées en ingrédients
-- standards (pâte curry rouge thaï, satay sauce, etc.) pour
-- réutilisation universelle.
--
-- Skipped: japanese-yakitori-chicken-skewers (page vidéo sans JSON-LD).
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-21-add-marionskitchen.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'High-Protein Gyudon Bowl (Rice Cooker)',
    'Boulettes de Poulet Satay Thaï',
    'Pâtes au Curry Rouge & Poulet',
    'Asian Lasagna Soup',
    'Poulet Grillé Chimichurri Thaï',
    'Khao Mun Gai (Riz au Poulet Thaï)',
    'Massaman Lamb Shanks (Jarrets d''Agneau)',
    'Poulet Crémeux aux Champignons',
    'Pad Krapow Street Food',
    'Khao Mun Gai Tod (Poulet Frit Thaï sur Riz)',
    'Chinese Egg Fried Rice',
    'Thai Chicken Fried Rice',
    'Super Crispy Chicken Fried Rice Bowl',
    'Thai Red Curry Fried Chicken Burger',
    'Mumbai Street Toastie',
    'Cheesy Gochujang Baked Potatoes',
    'Air Fryer Lemon Chicken',
    'Garlic Butter Fried Rice',
    'Poulet Crémeux Ail-Champignons (Marion)',
    'Ayam Goreng (Poulet Frit Malaisien)',
    'Steak Sauce Miso-Champignons Crémeuse'
  ];
BEGIN

  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. High-Protein Gyudon Bowl (Rice Cooker)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'High-Protein Gyudon Bowl (Rice Cooker)',
    'Gyudon entièrement préparé au cuiseur de riz : riz japonais, bœuf tranché fin et oignons cuisent ensemble dans le bouillon dashi-mirin-soja, puis œufs battus créent un nappage crémeux à la fin.',
    $instr$["Rincer le riz japonais et le placer dans la cuve du cuiseur avec eau, dashi en poudre, sauce soja, mirin et sucre. Remuer pour dissoudre.",
"Répartir les oignons tranchés fin uniformément sur le riz, puis poser le bœuf tranché par-dessus sans mélanger.",
"Fermer le cuiseur, lancer un cycle riz blanc standard et laisser cuire sans intervenir.",
"~10 minutes avant la fin (ou au passage en maintien chaud), battre légèrement les œufs avec 1 c. à soupe d'eau (laisser quelques traces de blanc/jaune).",
"Ouvrir rapidement le couvercle, verser les œufs battus uniformément sur le bœuf, refermer et laisser sur maintien chaud 5-8 minutes pour pocher doucement.",
"Servir en cuillérant profondément dans la cuve pour récupérer riz, bœuf-oignons et nappage d'œuf en une seule portion.",
"Garnir d'oignons verts ciselés, graines de sésame grillées et shichimi togarashi."]
$instr$,
    10, 45, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['gyudon','bœuf','donburi','cuiseur de riz','japonais','rapide','one-pot'],
    'manual',
    'https://www.marionskitchen.com/high-protein-gyudon-rice-cooker-bowl/',
    'https://www.marionskitchen.com/wp-content/uploads/2026/04/MK_High-Protein-Gyudon-Rice-Cooker-Bowl_34-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz japonais grain court',   300, 'g',          true,  1,  'rincé'),
    (v_recipe_id, 'eau',                        360, 'ml',         true,  2,  'selon le cuiseur'),
    (v_recipe_id, 'dashi en poudre',            1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'sauce soja',                 4,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'mirin',                      3,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'sucre',                      2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  7,  'tranché fin'),
    (v_recipe_id, 'bœuf tranché fin',           300, 'g',          true,  8,  'côte ou faux-filet'),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  9,  'battus légèrement'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       false, 10, 'garniture'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à café',  false, 11, 'grillées'),
    (v_recipe_id, 'shichimi togarashi',         1,   'pincée',     false, 12, 'optionnel');

  -- =====================================================================
  -- 2. Boulettes de Poulet Satay Thaï
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Boulettes de Poulet Satay Thaï',
    'Boulettes de poulet hachées et liées à l''œuf, dorées à la poêle puis enrobées d''une sauce satay (cacahuète-curry-coco) chaude. Servies sur riz vapeur avec brocolini.',
    $instr$["Dans un grand bol, mélanger le poulet haché, la marinade satay et les œufs battus jusqu'à incorporation complète.",
"Chauffer l'huile dans une grande poêle à feu moyen.",
"Façonner des boulettes de la taille d'une balle de golf directement dans la poêle chaude à la cuillère à glace.",
"Cuire 8-10 minutes en les retournant régulièrement pour qu'elles dorent uniformément et soient cuites à cœur.",
"Verser la sauce satay et la moitié du bouillon de poulet, tourner doucement pour enrober et laisser chauffer 1-2 minutes.",
"Dresser sur riz vapeur, accompagner de brocolini cuit à la vapeur.",
"Parsemer d'oignon vert ciselé et arroser d'huile de piment croustillante en option."]
$instr$,
    10, 15, 4, 2,
    'Thaïlandaise', 'dinner',
    ARRAY['boulettes','poulet','satay','thaïlandais','cacahuètes','rapide','one-pan'],
    'manual',
    'https://www.marionskitchen.com/chicken-satay-meatballs/',
    'https://www.marionskitchen.com/wp-content/uploads/2026/04/MK_Chicken-Satay-Meatball_6.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet haché',               500, 'g',          true,  1,  NULL),
    (v_recipe_id, 'marinade satay',             3,   'c. à soupe', true,  2,  'mélange épices thaï'),
    (v_recipe_id, 'sauce satay (cacahuète-coco)',180,'ml',         true,  3,  'pot ou maison'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  5,  'fouettés'),
    (v_recipe_id, 'bouillon de poulet',         120, 'ml',         true,  6,  NULL),
    (v_recipe_id, 'oignon vert',                1,   'tige',       false, 7,  'ciselé'),
    (v_recipe_id, 'riz vapeur',                 500, 'g',          true,  8,  'pour servir'),
    (v_recipe_id, 'brocolini',                  200, 'g',          true,  9,  'vapeur'),
    (v_recipe_id, 'huile de piment croustillante',1,'c. à soupe', false, 10, 'optionnel');

  -- =====================================================================
  -- 3. Pâtes au Curry Rouge & Poulet
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Pâtes au Curry Rouge & Poulet',
    'Fusion thaï-italien : linguine enrobées d''une sauce crémeuse au lait de coco, pâte de curry rouge, parmesan et mozzarella. Surmontées de poulet poêlé tranché.',
    $instr$["Porter une grande casserole d'eau salée à ébullition, cuire les linguine al dente. Réserver ½ tasse d'eau de cuisson avant d'égoutter.",
"Chauffer 1 c. à soupe d'huile dans une grande poêle à feu moyen-vif. Saler le poulet et le cuire 3-4 minutes par face. Réserver sur assiette.",
"Dans la même poêle, ajouter la 2e c. à soupe d'huile et la pâte de curry rouge ; cuire 1 minute en remuant jusqu'à parfumée.",
"Verser le lait de coco, ajouter les herbes thaï séchées, le piment et les pousses de bambou. Mélanger et mijoter 3-4 minutes.",
"Retirer les gros morceaux d'herbes séchées, transférer la sauce au blender et mixer jusqu'à lisse, puis remettre dans la poêle.",
"Incorporer beurre, ail, parmesan et mozzarella, mélanger jusqu'à sauce crémeuse. Détendre avec l'eau de cuisson si trop épaisse.",
"Ajouter les linguine cuites et bien enrober. Trancher le poulet et le poser sur les pâtes, napper de sauce.",
"Servir avec parmesan supplémentaire et un filet d'huile de piment croustillante."]
$instr$,
    10, 20, 4, 2,
    'Asiatique', 'dinner',
    ARRAY['pâtes','curry rouge','thaïlandais','fusion','crémeux','poulet','italien'],
    'manual',
    'https://www.marionskitchen.com/red-curry-chicken-pasta/',
    'https://www.marionskitchen.com/wp-content/uploads/2026/04/MK_Red-Curry-Chicken-Pasta_9.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',           2,   'unité',      true,  1,  'coupés en deux horizontalement'),
    (v_recipe_id, 'pâte de curry rouge thaï',   3,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  3,  '1 boîte'),
    (v_recipe_id, 'herbes thaï séchées',        1,   'c. à soupe', true,  4,  'mélange citronnelle, kaffir'),
    (v_recipe_id, 'flocons de piment',          1,   'c. à café',  false, 5,  'optionnel'),
    (v_recipe_id, 'pousses de bambou',          200, 'g',          true,  6,  'en boîte'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'ail',                        1,   'c. à soupe', true,  8,  'haché fin'),
    (v_recipe_id, 'linguine',                   180, 'g',          true,  9,  NULL),
    (v_recipe_id, 'beurre',                     2,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'parmesan râpé',              60,  'g',          true,  11, 'frais'),
    (v_recipe_id, 'mozzarella râpée',           60,  'g',          true,  12, NULL),
    (v_recipe_id, 'huile de piment croustillante',1,'c. à soupe', false, 13, 'service');

  -- =====================================================================
  -- 4. Asian Lasagna Soup
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Asian Lasagna Soup',
    'Soupe-lasagne fusion : bœuf haché, sauce marinara et pâte de curry rouge thaï, avec feuilles de lasagne brisées et crème. Surmontée d''une garniture ricotta-mozzarella-parmesan-herbes.',
    $instr$["Chauffer un grand pot à feu moyen avec un filet d'huile, faire suer l'oignon 2-3 minutes puis ajouter l'ail et cuire 1 minute.",
"Ajouter le bœuf haché et l'émietter à la spatule jusqu'à coloration.",
"Incorporer la pâte de tomate et la pâte de curry rouge, cuire 1-2 minutes pour torréfier les épices.",
"Ajouter origan, persil séché, flocons de piment, sel et poivre. Verser sauce marinara, eau et bouillon ; porter à frémissement.",
"Incorporer les feuilles de lasagne brisées et mijoter 15-20 minutes en remuant occasionnellement jusqu'à al dente.",
"Ajouter crème, épinards, persil et basilic frais ; mijoter 2 minutes.",
"Préparer la garniture : mélanger ricotta, mozzarella, parmesan, persil et basilic hachés.",
"Servir dans des bols, déposer une généreuse cuillère de garniture ricotta et arroser d'huile de piment croustillante si désiré."]
$instr$,
    10, 35, 4, 2,
    'Asiatique', 'dinner',
    ARRAY['soupe','lasagne','fusion','bœuf','curry rouge','crémeux','one-pot'],
    'manual',
    'https://www.marionskitchen.com/asian-lasagna-soup/',
    'https://www.marionskitchen.com/wp-content/uploads/2025/07/MK_Lasagna-Soup_8.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  1,  'haché fin'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  2,  'haché'),
    (v_recipe_id, 'bœuf haché',                 500, 'g',          true,  3,  NULL),
    (v_recipe_id, 'pâte de tomate',             2,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'pâte de curry rouge thaï',   2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'origan séché',               1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'persil séché',               1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'flocons de piment',          1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'poivre',                     1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sauce marinara',             680, 'g',          true,  11, '1 bocal'),
    (v_recipe_id, 'bouillon de poulet',         480, 'ml',         true,  12, NULL),
    (v_recipe_id, 'eau',                        720, 'ml',         true,  13, NULL),
    (v_recipe_id, 'feuilles de lasagne',        125, 'g',          true,  14, 'brisées en bouchées'),
    (v_recipe_id, 'crème épaisse',              120, 'ml',         true,  15, NULL),
    (v_recipe_id, 'épinards frais',             50,  'g',          true,  16, 'bébé'),
    (v_recipe_id, 'persil frais',               1,   'poignée',    true,  17, NULL),
    (v_recipe_id, 'basilic frais',              1,   'poignée',    true,  18, NULL),
    (v_recipe_id, 'ricotta',                    120, 'g',          true,  19, 'garniture'),
    (v_recipe_id, 'mozzarella râpée',           60,  'g',          true,  20, 'garniture'),
    (v_recipe_id, 'parmesan râpé',              30,  'g',          true,  21, 'garniture');

  -- =====================================================================
  -- 5. Poulet Grillé Chimichurri Thaï
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Poulet Grillé Chimichurri Thaï',
    'Cuisses de poulet marinées (racines de coriandre, ail, poivre, curcuma, sauce de poisson, kecap manis) puis grillées au barbecue, servies avec une chimichurri herbacée d''inspiration thaï.',
    $instr$["Au mortier, piler racines de coriandre, ail et grains de poivre blanc jusqu'à pâte grossière.",
"Mélanger le poulet avec la pâte, le curcuma, la sauce de poisson et le kecap manis ; couvrir et mariner 15 minutes (idéalement une nuit).",
"Préparer la chimichurri en mélangeant coriandre, persil hachés, oignon, ail, paprika, origan, flocons de piment, sel, huile d'olive et jus de citron vert ; réfrigérer 15 minutes.",
"Préchauffer le barbecue à feu moyen.",
"Griller les cuisses peau vers le bas 15 minutes.",
"Retourner et cuire 15-20 minutes supplémentaires jusqu'à 75°C à cœur (jus clairs).",
"Reposer 10 minutes sur assiette.",
"Servir nappé de chimichurri, parsemer de coriandre fraîche, réserver le reste de chimichurri en accompagnement."]
$instr$,
    30, 50, 6, 3,
    'Thaïlandaise', 'dinner',
    ARRAY['poulet','grillé','chimichurri','thaïlandais','barbecue','herbes','fusion'],
    'manual',
    'https://www.marionskitchen.com/grilled-chicken-with-thai-style-chimichurri/',
    'https://www.marionskitchen.com/wp-content/uploads/2025/06/SBS-Chicken-thai-chimichuri_5.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',          12,  'unité',      true,  1,  'avec os et peau'),
    (v_recipe_id, 'racines de coriandre',       2,   'unité',      true,  2,  'nettoyées'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  3,  'pour marinade'),
    (v_recipe_id, 'poivre blanc en grains',     1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'curcuma',                    0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'sauce de poisson',           2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'kecap manis',                1,   'c. à soupe', true,  7,  'sauce soja sucrée'),
    (v_recipe_id, 'coriandre fraîche',          1,   'botte',      true,  8,  'pour chimichurri'),
    (v_recipe_id, 'persil frais',               1,   'botte',      true,  9,  'pour chimichurri'),
    (v_recipe_id, 'oignon',                     2,   'c. à soupe', true,  10, 'haché fin'),
    (v_recipe_id, 'ail',                        0.5, 'gousse',     true,  11, 'râpée, chimichurri'),
    (v_recipe_id, 'paprika doux',               1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'origan séché',               0.25,'c. à café',  true,  13, NULL),
    (v_recipe_id, 'flocons de piment',          0.25,'c. à café',  true,  14, NULL),
    (v_recipe_id, 'sel de mer',                 2,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'huile d''olive extra vierge',120, 'ml',         true,  16, NULL),
    (v_recipe_id, 'citron vert',                2,   'unité',      true,  17, 'jus');

  -- =====================================================================
  -- 6. Khao Mun Gai (Riz au Poulet Thaï)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Khao Mun Gai (Riz au Poulet Thaï)',
    'Plat thaï national : poulet poché entier dans un bouillon parfumé, riz jasmin cuit dans la graisse rendue du poulet, accompagné d''une sauce piquante au gingembre-ail-soja-vinaigre.',
    $instr$["Parer le poulet et réserver les chutes de peau et de gras. Frotter le poulet de sel marin.",
"Dans un grand stockpot, mélanger bouillon de poulet, gingembre et oignon vert. Plonger le poulet et compléter d'eau pour juste recouvrir.",
"Porter à ébullition puis baisser le feu, mijoter 1 heure à découvert en écumant la mousse.",
"Pendant la cuisson, préparer la sauce : piler au mortier racines de coriandre, ail et sel jusqu'à pâte fine, puis incorporer les autres ingrédients de sauce.",
"Retirer le poulet cuit et le laisser refroidir sur planche.",
"Pour le riz : chauffer l'huile dans une casserole à feu moyen-vif, faire rendre les chutes 5 minutes jusqu'à doré ; retirer les solides.",
"Dans le même gras, ajouter l'ail et le riz lavé, puis 540 ml de bouillon ; couvrir et cuire 10-12 minutes jusqu'à tendre.",
"Pour servir : trancher le poulet (tapoter légèrement le blanc au rouleau pour attendrir), dresser avec le riz, la sauce et un petit bol de bouillon."]
$instr$,
    20, 75, 4, 3,
    'Thaïlandaise', 'dinner',
    ARRAY['poulet poché','riz jasmin','thaïlandais','plat national','sauce gingembre','bouillon','traditionnel'],
    'manual',
    'https://www.marionskitchen.com/thai-chicken-rice-khao-mun-gai/',
    'https://www.marionskitchen.com/wp-content/uploads/2025/05/SBS-Thai-chicken-rice_2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet entier',              1800,'g',          true,  1,  'fermier de préférence'),
    (v_recipe_id, 'sel de mer',                 2,   'c. à soupe', true,  2,  'pour frotter'),
    (v_recipe_id, 'bouillon de poulet',         1000,'ml',         true,  3,  NULL),
    (v_recipe_id, 'gingembre',                  40,  'g',          true,  4,  'en tranches'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  5,  'entiers'),
    (v_recipe_id, 'racines de coriandre',       2,   'unité',      true,  6,  'pour la sauce'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  7,  'pour la sauce'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  8,  'pour la sauce'),
    (v_recipe_id, 'sauce soja claire',          3,   'c. à soupe', true,  9,  'pour la sauce'),
    (v_recipe_id, 'sauce soja foncée',          1,   'c. à soupe', true,  10, 'pour la sauce'),
    (v_recipe_id, 'pâte de soja fermenté',      1,   'c. à soupe', true,  11, 'sauce, tau jiao'),
    (v_recipe_id, 'gingembre',                  1,   'c. à soupe', true,  12, 'râpé, pour la sauce'),
    (v_recipe_id, 'piments thaï',               3,   'unité',      true,  13, 'tranchés'),
    (v_recipe_id, 'vinaigre de riz',            1,   'c. à soupe', true,  14, 'pour la sauce'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  15, 'pour la sauce'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  16, 'pour le riz'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  17, 'haché, pour le riz'),
    (v_recipe_id, 'riz jasmin',                 360, 'g',          true,  18, NULL),
    (v_recipe_id, 'concombre',                  1,   'unité',      false, 19, 'en tranches'),
    (v_recipe_id, 'coriandre fraîche',          1,   'botte',      false, 20, 'garniture');

  -- =====================================================================
  -- 7. Massaman Lamb Shanks
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Massaman Lamb Shanks (Jarrets d''Agneau)',
    'Jarrets d''agneau rôtis lentement (4h) dans une sauce massaman au lait de coco, avec oignons entiers et pommes de terre. Plat festif réconfortant servi sur riz vapeur.',
    $instr$["Préchauffer le four à 150°C.",
"Saler généreusement les jarrets d'agneau. Chauffer une grande cocotte allant au four à feu moyen-vif avec l'huile.",
"Saisir les jarrets 8-10 minutes en les tournant pour obtenir une croûte dorée sur la plupart des faces. Transférer sur plateau en laissant les sucs.",
"Dans la même cocotte (avec les sucs), faire revenir la pâte de curry massaman 30 secondes jusqu'à parfumée.",
"Déglacer avec le lait de coco puis ajouter 240 ml d'eau ; remettre les jarrets dans la sauce. Couvrir et enfourner 2 heures.",
"Sortir, ajouter oignons et pommes de terre, couvrir et remettre 1h-1h30 jusqu'à ce que l'agneau soit fondant.",
"Incorporer sauce de poisson et sucre à la sauce (ajuster au goût).",
"Dresser jarrets, pommes de terre et oignons sur grand plat, napper généreusement de sauce.",
"Garnir de coriandre fraîche et servir avec riz vapeur."]
$instr$,
    20, 240, 6, 3,
    'Thaïlandaise', 'dinner',
    ARRAY['agneau','jarret','massaman','thaïlandais','mijoté','festif','curry'],
    'manual',
    'https://www.marionskitchen.com/slow-roasted-thai-massaman-lamb-shanks/',
    'https://www.marionskitchen.com/wp-content/uploads/2025/04/MK_Massaman-Lamb-Shanks_1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'jarrets d''agneau',          2000,'g',          true,  1,  '4-6 pièces'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'pâte de curry massaman',     120, 'ml',         true,  3,  NULL),
    (v_recipe_id, 'lait de coco',               800, 'ml',         true,  4,  '2 boîtes de 400 ml'),
    (v_recipe_id, 'oignon',                     6,   'unité',      true,  5,  'épluchés, plus gros coupés en deux'),
    (v_recipe_id, 'pommes de terre',            8,   'unité',      true,  6,  'petites, pelées, coupées en deux'),
    (v_recipe_id, 'sauce de poisson',           2,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'sel de mer',                 1,   'c. à café',  true,  9,  'au goût'),
    (v_recipe_id, 'coriandre fraîche',          1,   'botte',      false, 10, 'hachée, garniture'),
    (v_recipe_id, 'riz vapeur',                 600, 'g',          true,  11, 'pour servir');

  -- =====================================================================
  -- 8. Poulet Crémeux aux Champignons
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Poulet Crémeux aux Champignons',
    'Blancs de poulet enrobés de farine, saisis puis terminés au four dans une sauce crémeuse aux champignons caramélisés, thym, romarin et parmesan. Zeste de citron pour la finition.',
    $instr$["Préchauffer le four à 180°C.",
"Assaisonner les blancs de poulet sel et poivre, les enrober de farine en secouant l'excédent.",
"Chauffer huile et beurre dans une poêle allant au four ; quand le beurre mousse, saisir le poulet 5 minutes par face jusqu'à doré, puis réserver.",
"Dans la même poêle, baisser à feu moyen-vif et ajouter les champignons. Saler, poivrer, ajouter thym et romarin. Saisir 2 minutes sans toucher puis remuer, répéter jusqu'à profondément dorés.",
"Verser ½ tasse d'eau et le cube de bouillon, mijoter 30 secondes. Baisser à feu doux et incorporer la crème.",
"Remettre le poulet dans la poêle en arrosant de sauce. Enfourner 10 minutes jusqu'à sauce épaissie et poulet cuit à cœur.",
"À la sortie, râper le zeste de citron par-dessus, parsemer de parmesan et de persil.",
"Servir avec purée, riz ou pâtes."]
$instr$,
    10, 30, 4, 2,
    'Européenne', 'dinner',
    ARRAY['poulet','champignons','crémeux','one-pan','four','rapide','réconfortant'],
    'manual',
    'https://www.marionskitchen.com/creamy-chicken-mushroom/',
    'https://www.marionskitchen.com/wp-content/uploads/2024/08/Creamy-Chicken-Mushroom-4.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',           4,   'unité',      true,  1,  'sans os'),
    (v_recipe_id, 'sel de mer',                 1,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  3,  'fraîchement moulu'),
    (v_recipe_id, 'farine',                     130, 'g',          true,  4,  'pour enrober'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'beurre non salé',            50,  'g',          true,  6,  NULL),
    (v_recipe_id, 'champignons',                400, 'g',          true,  7,  'tranchés'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  8,  'haché fin'),
    (v_recipe_id, 'thym',                       2,   'branche',    true,  9,  NULL),
    (v_recipe_id, 'romarin',                    1,   'branche',    true,  10, NULL),
    (v_recipe_id, 'cube de bouillon de poulet', 1,   'unité',      true,  11, NULL),
    (v_recipe_id, 'crème épaisse',              250, 'ml',         true,  12, NULL),
    (v_recipe_id, 'citron',                     1,   'unité',      true,  13, 'zeste'),
    (v_recipe_id, 'parmesan',                   30,  'g',          true,  14, 'râpé fin'),
    (v_recipe_id, 'persil frais',               2,   'c. à soupe', true,  15, 'haché fin');

  -- =====================================================================
  -- 9. Pad Krapow Street Food
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Pad Krapow Street Food',
    'Version street food authentique du pad krapow thaï : porc haché sauté avec ail-piment pilés grossièrement et basilic sacré, servi sur riz avec œuf au plat croustillant et prik nam pla.',
    $instr$["Préparer le prik nam pla en mélangeant sauce de poisson, piments thaï tranchés, ail tranché et quartiers de citron vert.",
"Mélanger la sauce stir-fry : sauce d'huître, sauce de poisson, poivre noir et sucre.",
"Cuire les œufs croustillants : chauffer ½ tasse d'huile dans le wok à feu vif, casser un œuf, arroser d'huile chaude jusqu'à blanc croustillant et jaune coulant ; réserver. Répéter.",
"Au mortier, piler grossièrement piments et ail (garder des chunks, pas une pâte fine).",
"Retirer l'huile du wok en laissant 2 c. à soupe, remettre à feu moyen, ajouter la pâte ail-piment et cuire 30 secondes jusqu'à parfumé.",
"Ajouter le porc haché, l'émietter à la spatule et sauter 4-5 minutes jusqu'à cuit avec jus évaporé.",
"Verser la sauce stir-fry par les bords du wok pour caraméliser, puis tossing pour enrober. Incorporer le basilic sacré et sauter 1 minute.",
"Servir sur riz vapeur, surmonter de l'œuf croustillant et arroser de prik nam pla."]
$instr$,
    15, 15, 2, 2,
    'Thaïlandaise', 'dinner',
    ARRAY['pad krapow','porc','basilic sacré','thaïlandais','street-food','épicé','wok'],
    'manual',
    'https://www.marionskitchen.com/street-food-style-pad-krapow/',
    'https://www.marionskitchen.com/wp-content/uploads/2023/12/Street-Food-Style-Pad-Krapow-01.webp'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'porc haché',                 300, 'g',          true,  1,  NULL),
    (v_recipe_id, 'piments rouges doux',        8,   'unité',      true,  2,  'longs'),
    (v_recipe_id, 'piments d''oiseau',          3,   'unité',      true,  3,  'épicés'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  4,  'pelée'),
    (v_recipe_id, 'basilic sacré',              60,  'g',          true,  5,  '~1,5 tasse, holy basil'),
    (v_recipe_id, 'huile végétale',             120, 'ml',         true,  6,  'pour œufs frits'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  7,  'pour œufs croustillants'),
    (v_recipe_id, 'sauce de poisson',           60,  'ml',         true,  8,  'pour prik nam pla'),
    (v_recipe_id, 'piments thaï prik kee noo',  3,   'unité',      true,  9,  'tranchés fin'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  10, 'tranchée fin, prik nam pla'),
    (v_recipe_id, 'citron vert',                0.5, 'unité',      true,  11, 'en quartiers'),
    (v_recipe_id, 'sauce d''huître',            3,   'c. à soupe', true,  12, 'sauce'),
    (v_recipe_id, 'sauce de poisson',           1,   'c. à soupe', true,  13, 'sauce'),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  14, 'fraîchement moulu'),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  15, 'sauce'),
    (v_recipe_id, 'riz vapeur',                 500, 'g',          true,  16, 'pour servir');

  -- =====================================================================
  -- 10. Khao Mun Gai Tod (Poulet Frit Thaï sur Riz)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Khao Mun Gai Tod (Poulet Frit Thaï sur Riz)',
    'Variante frite du khao mun gai : ailes de poulet et daïkon longuement mijotés pour un bouillon doré, riz jasmin cuit dans la graisse aux racines de coriandre, surmonté de poulet frit croustillant.',
    $instr$["Bouillon : combiner ailes de poulet, daïkon, gingembre, oignons verts, poivre blanc, sel et 2 L d'eau dans un grand pot. Porter à ébullition puis mijoter 30 minutes en écumant la mousse.",
"Retirer l'huile de surface du bouillon et la transférer dans un wok. Ajouter racines de coriandre pilées, ail et gingembre hachés ; faire suer 2-3 minutes.",
"Ajouter le riz jasmin et l'enrober 1 minute, puis transférer au cuiseur avec 2 tasses de bouillon ; lancer un cycle riz.",
"Préparer la friture : remplir une sauteuse au tiers d'huile et chauffer à 180°C.",
"Pour la pâte, mélanger farine, farine de riz, fécule de maïs, poivre blanc, ail en poudre, bicarbonate et sel ; ajouter 1 tasse d'eau et fouetter jusqu'à lisse.",
"Enrober les cuisses de farine simple, tremper dans la pâte puis frire 8-10 minutes en retournant jusqu'à doré.",
"Égoutter sur grille et saler. Découper en lanières.",
"Servir : riz en dôme renversé, poulet frit tranché par-dessus, concombre tranché, sauce chili douce et petit bol de bouillon."]
$instr$,
    15, 60, 6, 3,
    'Thaïlandaise', 'dinner',
    ARRAY['poulet frit','riz jasmin','thaïlandais','street-food','khao mun gai','daïkon','bouillon'],
    'manual',
    'https://www.marionskitchen.com/thai-fried-chicken-rice-khao-mun-gai-tod/',
    'https://www.marionskitchen.com/wp-content/uploads/2023/08/Thai-Fried-Chicken-Rice-Khao-Mun-Gai-Tod-01.webp'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ailes de poulet',            1500,'g',          true,  1,  'coupées aux articulations'),
    (v_recipe_id, 'daïkon',                     400, 'g',          true,  2,  '½, en tranches fines'),
    (v_recipe_id, 'gingembre',                  40,  'g',          true,  3,  '2 tranches, pour bouillon'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  4,  'pour bouillon'),
    (v_recipe_id, 'poivre blanc moulu',         0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'sel',                        2,   'c. à soupe', true,  6,  'pour bouillon'),
    (v_recipe_id, 'racines de coriandre',       2,   'unité',      true,  7,  'pour le riz'),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  8,  'haché grossier'),
    (v_recipe_id, 'gingembre',                  1,   'c. à soupe', true,  9,  'haché fin'),
    (v_recipe_id, 'riz jasmin',                 280, 'g',          true,  10, NULL),
    (v_recipe_id, 'farine',                     150, 'g',          true,  11, 'pour pâte + enrobage'),
    (v_recipe_id, 'farine de riz',              30,  'g',          true,  12, NULL),
    (v_recipe_id, 'fécule de maïs',             30,  'g',          true,  13, NULL),
    (v_recipe_id, 'poivre blanc moulu',         1,   'c. à café',  true,  14, 'pour la pâte'),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  15, NULL),
    (v_recipe_id, 'bicarbonate de soude',       1,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  17, 'pour la pâte'),
    (v_recipe_id, 'cuisses de poulet',          6,   'unité',      true,  18, 'désossées'),
    (v_recipe_id, 'huile végétale',             1500,'ml',         true,  19, 'pour friture'),
    (v_recipe_id, 'concombre',                  1,   'unité',      false, 20, 'tranché'),
    (v_recipe_id, 'sauce chili douce',          120, 'ml',         false, 21, 'pour servir');

  -- =====================================================================
  -- 11. Chinese Egg Fried Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chinese Egg Fried Rice',
    'Riz frit chinois minimaliste à l''œuf : oignon, ail, œuf en omelette brisée, riz jasmin, sauce soja et oignons verts. 10 minutes au wok pour un classique parfait.',
    $instr$["Chauffer 2 c. à soupe d'huile dans un wok ou grande poêle à feu vif.",
"Ajouter oignon et ail, sauter 30 secondes jusqu'à juste ramollis.",
"Pousser sur un côté du wok, verser les œufs battus de l'autre côté.",
"Travailler l'œuf à la spatule pour former une omelette fine.",
"Quand l'œuf est presque pris, le briser et le mélanger aux autres ingrédients.",
"Ajouter le riz cuit, la sauce soja et les oignons verts.",
"Sauter à feu vif jusqu'à bien combiné et chaud.",
"Servir immédiatement."]
$instr$,
    5, 5, 2, 1,
    'Chinoise', 'lunch',
    ARRAY['riz frit','chinois','œuf','wok','rapide','10-minutes','simple'],
    'manual',
    'https://www.marionskitchen.com/chinese-egg-fried-rice/',
    'https://www.marionskitchen.com/wp-content/uploads/2022/11/Chinese-Egg-Fried-Rice-02.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  2,  'en dés'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  3,  'haché grossier'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  4,  'légèrement battus'),
    (v_recipe_id, 'riz jasmin cuit',            600, 'g',          true,  5,  'de la veille de préférence'),
    (v_recipe_id, 'sauce soja chinoise',        2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'oignons verts',              3,   'tige',       true,  7,  'tranchés fin');

  -- =====================================================================
  -- 12. Thai Chicken Fried Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Thai Chicken Fried Rice',
    'Riz frit thaï au poulet et gai lan (brocoli chinois), assaisonné sauce soja, sauce de poisson et sucre, servi avec prik nam pla (sauce de poisson au piment) et quartiers de citron vert.',
    $instr$["Préparer le prik nam pla : mélanger sauce de poisson, piments d'oiseau tranchés et jus du quartier de citron vert (laisser le quartier dans la sauce).",
"Chauffer l'huile dans un wok à feu vif jusqu'à fumant.",
"Ajouter l'oignon en quartiers et sauter 1 minute. Incorporer ail et poulet et sauter 2-3 minutes jusqu'à quasi cuit.",
"Ajouter le gai lan et sauter 2 minutes jusqu'à poulet cuit et légume tendre. Ajouter la tomate.",
"Pousser tout sur un côté, ajouter 1 c. à café d'huile et verser les œufs ; laisser prendre 1 minute puis brouiller.",
"Ajouter le riz, sauce soja, sauce de poisson, sucre et poivre blanc. Sauter 1-2 minutes pour bien enrober.",
"Dresser dans des assiettes, servir avec prik nam pla, tranches de concombre et quartiers de citron vert."]
$instr$,
    10, 10, 2, 2,
    'Thaïlandaise', 'lunch',
    ARRAY['riz frit','poulet','thaïlandais','gai lan','wok','rapide','street-food'],
    'manual',
    'https://www.marionskitchen.com/thai-chicken-fried-rice/',
    'https://www.marionskitchen.com/wp-content/uploads/2022/11/Thai-Chicken-Fried-Rice-01.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  1,  '+ 1 c. à café pour œufs'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  2,  'en quartiers'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  3,  'haché grossier'),
    (v_recipe_id, 'cuisse de poulet',           150, 'g',          true,  4,  'tranchée fin'),
    (v_recipe_id, 'gai lan (brocoli chinois)',  150, 'g',          true,  5,  'tranché'),
    (v_recipe_id, 'tomate',                     0.5, 'unité',      true,  6,  'en quartiers'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  7,  'légèrement battus'),
    (v_recipe_id, 'riz cuit',                   400, 'g',          true,  8,  'de la veille'),
    (v_recipe_id, 'sauce soja thaï',            1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'sauce de poisson',           3,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'poivre blanc moulu',         0.125,'c. à café', true,  12, NULL),
    (v_recipe_id, 'sauce de poisson',           3,   'c. à soupe', true,  13, 'pour prik nam pla'),
    (v_recipe_id, 'piments d''oiseau',          3,   'unité',      true,  14, 'tranchés'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  15, 'en quartiers'),
    (v_recipe_id, 'concombre',                  0.5, 'unité',      false, 16, 'tranches, pour servir');

  -- =====================================================================
  -- 13. Super Crispy Chicken Fried Rice Bowl
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Super Crispy Chicken Fried Rice Bowl',
    'Bowl : cuisses de poulet pressées peau croustillante posées sur un riz frit aux saucisses chinoises lap cheong, légumes asiatiques et huile de sésame. Sambal oelek et citron vert en accompagnement.',
    $instr$["Sécher les cuisses au papier essuie-tout et les saler généreusement.",
"Chauffer une poêle antiadhésive à feu moyen-vif. Ajouter l'huile puis les cuisses peau vers le bas. Recouvrir de papier cuisson puis presser avec une seconde poêle lourde.",
"Cuire 12 minutes peau pressée jusqu'à croûte croustillante dorée, puis retourner brièvement pour finir la cuisson.",
"Pour le riz : chauffer l'huile dans un wok à feu vif, ajouter ail, oignon et saucisse chinoise ; sauter 2 minutes jusqu'à oignon doré.",
"Ajouter les légumes asiatiques et les épinards, sauter 2 minutes jusqu'à flétris.",
"Verser le riz et la sauce soja, tossing pour combiner. Hors du feu, ajouter oignons verts, huile de sésame, poivre blanc et jus de citron vert.",
"Dresser le riz dans des bols, trancher les cuisses et les poser dessus. Parsemer d'oignon vert supplémentaire et servir avec sambal et quartiers de citron vert."]
$instr$,
    10, 15, 4, 3,
    'Asiatique', 'dinner',
    ARRAY['poulet croustillant','riz frit','saucisse chinoise','lap cheong','wok','bowl','asiatique'],
    'manual',
    'https://www.marionskitchen.com/super-crispy-chicken-fried-rice-bowl/',
    'https://www.marionskitchen.com/wp-content/uploads/2022/08/Super-Crispy-Fried-Chicken-Rice-Bowl-01.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',          4,   'unité',      true,  1,  'avec peau, désossées'),
    (v_recipe_id, 'sel de mer',                 2,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'huile végétale',             2,   'c. à café',  true,  3,  'pour le poulet'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  4,  'pour le riz'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  5,  'haché'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  6,  'en dés'),
    (v_recipe_id, 'saucisses chinoises (lap cheong)',75,'g',       true,  7,  'en dés'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  8,  'légèrement battus'),
    (v_recipe_id, 'légumes asiatiques',         200, 'g',          true,  9,  'bok choy, chou chinois'),
    (v_recipe_id, 'épinards bébé',              50,  'g',          true,  10, NULL),
    (v_recipe_id, 'riz cuit',                   800, 'g',          true,  11, '4 tasses'),
    (v_recipe_id, 'sauce soja',                 4,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'oignons verts',              60,  'g',          true,  13, 'tranchés fin'),
    (v_recipe_id, 'huile de sésame',            2,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'poivre blanc moulu',         1,   'pincée',     true,  15, NULL),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  16, 'jus'),
    (v_recipe_id, 'sambal oelek',               2,   'c. à soupe', false, 17, 'pour servir');

  -- =====================================================================
  -- 14. Thai Red Curry Fried Chicken Burger
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Thai Red Curry Fried Chicken Burger',
    'Burger fusion : cuisses de poulet marinées au curry rouge thaï et lait de coco, panées sec et frites jusqu''à très croustillantes, montées en brioche avec mayo curry rouge et laitue.',
    $instr$["Fouetter pâte de curry rouge, lait de coco et sauce de poisson dans un bol. Ajouter les cuisses, couvrir et mariner 1 heure.",
"Mélanger farine, fécule de maïs, levure chimique et 1 c. à café de sel dans un grand bol.",
"Laisser égoutter la marinade de chaque cuisse, puis presser fermement dans la farine pour bien enrober.",
"Préchauffer le grill du four à puissance maximale. Remplir un wok au tiers d'huile et chauffer à 165°C.",
"Frire les cuisses 10-12 minutes en les retournant régulièrement jusqu'à dorées et cuites à cœur.",
"Mayo curry : fouetter mayonnaise, pâte de curry rouge, jus de citron vert et sel.",
"Couper les pains brioche en deux, les toaster sous le grill jusqu'à dorés.",
"Tartiner de mayo curry, garnir de laitue puis poser la cuisse frite salée. Refermer et servir avec mayo supplémentaire."]
$instr$,
    65, 25, 4, 3,
    'Thaïlandaise', 'dinner',
    ARRAY['burger','poulet frit','curry rouge','fusion','thaïlandais','brioche','street-food'],
    'manual',
    'https://www.marionskitchen.com/thai-red-curry-fried-chicken-burger/',
    'https://www.marionskitchen.com/wp-content/uploads/2022/06/Thai-Red-Curry-Fried-Chicken-Burger-01.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pâte de curry rouge thaï',   1.5, 'c. à soupe', true,  1,  'marinade'),
    (v_recipe_id, 'lait de coco',               100, 'ml',         true,  2,  'marinade'),
    (v_recipe_id, 'sauce de poisson',           1,   'c. à soupe', true,  3,  'marinade'),
    (v_recipe_id, 'cuisses de poulet',          4,   'unité',      true,  4,  'désossées'),
    (v_recipe_id, 'farine',                     100, 'g',          true,  5,  'enrobage'),
    (v_recipe_id, 'fécule de maïs',             60,  'g',          true,  6,  'enrobage'),
    (v_recipe_id, 'levure chimique',            0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sel de mer',                 1,   'c. à café',  true,  8,  '+ extra pour servir'),
    (v_recipe_id, 'huile végétale',             1500,'ml',         true,  9,  'friture'),
    (v_recipe_id, 'pains brioche',              4,   'unité',      true,  10, NULL),
    (v_recipe_id, 'laitue (chêne ou beurre)',   8,   'feuille',    true,  11, NULL),
    (v_recipe_id, 'mayonnaise',                 240, 'ml',         true,  12, 'pour mayo curry'),
    (v_recipe_id, 'pâte de curry rouge thaï',   2,   'c. à soupe', true,  13, 'pour mayo'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  14, 'jus, pour mayo');

  -- =====================================================================
  -- 15. Mumbai Street Toastie
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Mumbai Street Toastie',
    'Sandwich grillé d''inspiration street-food de Bombay : purée épicée (graines de moutarde, cumin, curry leaves, curcuma, piment), tomates, oignon, poivron vert, gruyère et chutney coriandre-menthe.',
    $instr$["Chutney vert : mixer coriandre, menthe, ail, chaat masala, piments verts, jus de citron et sel au robot jusqu'à pâte grossière (ajouter un peu d'eau si nécessaire).",
"Placer la purée de pommes de terre dans un grand bol. Chauffer l'huile végétale à feu moyen, ajouter les graines de moutarde ; quand elles éclatent, ajouter graines de cumin et feuilles de curry, cuire 1-2 minutes jusqu'à parfumé.",
"Incorporer curcuma et piment en poudre, mélanger. Verser sur la purée, saler, poivrer et bien mélanger.",
"Beurrer 8 tranches de pain de mie. Retourner les tranches.",
"Étaler généreusement la purée épicée sur 4 tranches.",
"Garnir uniformément de tomate, oignon, poivron et fromage gruyère.",
"Tartiner les 4 autres tranches de chutney vert, puis les poser chutney contre garniture.",
"Passer à la machine à panini ou cuire chaque face dans une poêle puis finir au four jusqu'à fromage fondu. Couper en triangle, servir avec chutney supplémentaire."]
$instr$,
    15, 45, 4, 2,
    'Indienne', 'snack',
    ARRAY['sandwich','indien','street-food','bombay','toastie','chutney','végétarien'],
    'manual',
    'https://www.marionskitchen.com/mumbai-street-toastie/',
    'https://www.marionskitchen.com/wp-content/uploads/2022/05/Mumbai-Street-Toastie-01.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'purée de pommes de terre',   400, 'g',          true,  1,  'restes ou fraîche'),
    (v_recipe_id, 'huile végétale',             3,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'graines de moutarde jaune',  1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'graines de cumin',           0.5, 'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'feuilles de curry',          10,  'unité',      true,  5,  'fraîches'),
    (v_recipe_id, 'curcuma',                    0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'piment en poudre',           0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'pain de mie blanc',          8,   'tranche',    true,  8,  NULL),
    (v_recipe_id, 'beurre',                     40,  'g',          true,  9,  'ramolli'),
    (v_recipe_id, 'tomates',                    2,   'unité',      true,  10, 'tranches fines'),
    (v_recipe_id, 'oignon rouge',               0.5, 'unité',      true,  11, 'tranché fin'),
    (v_recipe_id, 'poivron vert',               0.5, 'unité',      true,  12, '8 anneaux fins'),
    (v_recipe_id, 'gruyère (ou suisse)',        8,   'tranche',    true,  13, NULL),
    (v_recipe_id, 'coriandre fraîche',          1,   'tasse',      true,  14, 'avec tiges, chutney'),
    (v_recipe_id, 'menthe fraîche',             0.5, 'tasse',      true,  15, 'feuilles, chutney'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  16, 'chutney'),
    (v_recipe_id, 'chaat masala',               1,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'piments verts',              2,   'unité',      true,  18, 'chutney'),
    (v_recipe_id, 'jus de citron',              1.5, 'c. à soupe', true,  19, 'chutney'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  20, 'chutney');

  -- =====================================================================
  -- 16. Cheesy Gochujang Baked Potatoes
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Cheesy Gochujang Baked Potatoes',
    'Grosses pommes de terre cuites au micro-ondes puis garnies de porc haché gochujang-ail-soja, tomate, herbes et mozzarella fondue. Finition crème aigre.',
    $instr$["Préchauffer le four à 220°C.",
"Piquer chaque pomme de terre 3-4 fois à la fourchette. Les placer dans un bol micro-ondes, couvrir d'un film et cuire 15 minutes à 1000 W jusqu'à fondantes.",
"Pendant ce temps, chauffer l'huile dans un wok à feu vif. Étaler le porc haché et le saler. Laisser saisir 3-4 minutes sans toucher jusqu'à croûte dorée.",
"Retourner le porc et le casser à la spatule. Cuire 4-5 minutes jusqu'à jus évaporés (la saisie intensifie la saveur).",
"Ajouter l'ail et sauter 30 secondes. Baisser à feu moyen-vif, ajouter gochujang et sauce soja.",
"Sauter jusqu'à bien combiné et porc cuit. Hors du feu, incorporer tomate, moitié de la coriandre et moitié de la ciboulette.",
"Retirer le film des pommes de terre (attention vapeur !), les transférer dans un plat allant au four. Faire une entaille sur le dessus.",
"Garnir chaque pomme de terre généreusement de mélange porc gochujang, surmonter de mozzarella.",
"Enfourner 10 minutes jusqu'à fromage fondu doré.",
"Garnir de crème aigre, du reste de coriandre et ciboulette ; servir."]
$instr$,
    5, 25, 4, 2,
    'Asiatique', 'dinner',
    ARRAY['gochujang','pomme de terre','porc','coréen','fusion','fromage','réconfortant'],
    'manual',
    'https://www.marionskitchen.com/cheesy-gochujang-baked-potatoes/',
    'https://www.marionskitchen.com/wp-content/uploads/2022/05/Gochujang-Baked-Potatoes-01.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pommes de terre',            4,   'unité',      true,  1,  'grosses, lavées'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'porc haché',                 500, 'g',          true,  3,  NULL),
    (v_recipe_id, 'sel de mer',                 1,   'c. à café',  true,  4,  'au goût'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  5,  'haché fin'),
    (v_recipe_id, 'gochujang',                  2.5, 'c. à soupe', true,  6,  'pâte coréenne'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'tomate',                     1,   'unité',      true,  8,  'grosse, hachée fin'),
    (v_recipe_id, 'coriandre fraîche',          0.25,'tasse',      true,  9,  'hachée'),
    (v_recipe_id, 'ciboulette',                 0.25,'tasse',      true,  10, 'hachée fin'),
    (v_recipe_id, 'mozzarella râpée',           200, 'g',          true,  11, NULL),
    (v_recipe_id, 'crème aigre',                60,  'g',          true,  12, 'pour servir');

  -- =====================================================================
  -- 17. Air Fryer Lemon Chicken
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Air Fryer Lemon Chicken',
    'Bouchées de poulet panées cuites à l''air fryer, nappées d''une sauce citronnée brillante au gingembre, ail, vin de Shaoxing et sauce soja. Classique sino-américain sans friture.',
    $instr$["Mélanger le poulet en morceaux avec sauce soja claire et huile de sésame ; réserver.",
"Sauce citron : chauffer l'huile d'arachide dans une petite casserole à feu moyen, faire revenir gingembre julienné et ail 1 minute jusqu'à parfumé.",
"Ajouter bouillon, jus de citron, sucre, vin de Shaoxing et sauce soja claire ; mijoter 5 minutes.",
"Délayer la fécule dans 1 c. à soupe d'eau et l'incorporer ; mijoter 2 minutes en remuant jusqu'à épaississement. Couvrir et réserver.",
"Placer farine et œuf battu dans 2 bols peu profonds séparés. Par lots, enrober le poulet dans la farine, puis dans l'œuf, puis à nouveau dans la farine.",
"Huiler le panier de l'air fryer. Y placer la moitié du poulet et vaporiser d'huile.",
"Cuire à 180°C en remuant à mi-cuisson et en revaporisant d'huile, 10 minutes jusqu'à doré et cuit. Réserver dans un bol et répéter avec le reste.",
"Réchauffer la sauce si besoin, l'arroser sur le poulet et tossing pour enrober. Parsemer d'oignon vert tranché et servir."]
$instr$,
    20, 20, 3, 2,
    'Chinoise', 'dinner',
    ARRAY['poulet','citron','air fryer','sino-américain','sauce-brillante','gingembre','rapide'],
    'manual',
    'https://www.marionskitchen.com/air-fryer-lemon-chicken/',
    'https://www.marionskitchen.com/wp-content/uploads/2021/08/Air-Fryer-Lemon-Chicken6072-scaled-e1628675375796.jpeg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',           500, 'g',          true,  1,  'en morceaux de 3 cm'),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  2,  'marinade'),
    (v_recipe_id, 'huile de sésame',            1,   'c. à café',  true,  3,  'marinade'),
    (v_recipe_id, 'farine',                     45,  'g',          true,  4,  'pour enrober'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  5,  'fouetté'),
    (v_recipe_id, 'huile en spray',             1,   'pulvérisation',true,6,  'air fryer'),
    (v_recipe_id, 'huile d''arachide',          2,   'c. à café',  true,  7,  'pour sauce'),
    (v_recipe_id, 'gingembre',                  1,   'c. à soupe', true,  8,  'julienné'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  9,  'haché fin'),
    (v_recipe_id, 'bouillon de poulet',         120, 'ml',         true,  10, NULL),
    (v_recipe_id, 'jus de citron',              60,  'ml',         true,  11, 'frais'),
    (v_recipe_id, 'sucre',                      50,  'g',          true,  12, NULL),
    (v_recipe_id, 'vin de Shaoxing',            1,   'c. à soupe', true,  13, 'ou xérès sec'),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  14, 'pour sauce'),
    (v_recipe_id, 'fécule de maïs',             3,   'c. à café',  true,  15, 'mélangée à 1 c. à soupe d''eau'),
    (v_recipe_id, 'oignon vert',                1,   'tige',       false, 16, 'tranchée fin');

  -- =====================================================================
  -- 18. Garlic Butter Fried Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Garlic Butter Fried Rice',
    'Riz frit ultra-réconfortant au beurre et ail, brouillé avec œuf, sauce soja, et un trait d''huile d''ail confit. Saupoudré de parmesan pour la fusion umami beurre-fromage.',
    $instr$["Préparer l'huile d'ail : mettre huile et ail tranché dans une casserole à feu moyen ; cuire jusqu'à ail doré, puis verser dans un bol.",
"Dans un wok ou grande poêle, chauffer huile végétale et beurre à feu moyen-vif.",
"Ajouter l'ail haché et cuire 1 minute.",
"Ajouter riz cuit, sauce soja et sucre ; tossing jusqu'à bien combiné.",
"Pousser le riz sur un côté et verser les œufs battus de l'autre. Laisser prendre quelques minutes avant de retourner et incorporer au riz.",
"Tossing l'oignon vert tranché à travers.",
"Répartir dans des assiettes, parsemer de parmesan et arroser d'huile d'ail confit."]
$instr$,
    10, 10, 2, 1,
    'Asiatique', 'lunch',
    ARRAY['riz frit','ail','beurre','rapide','réconfortant','œuf','parmesan'],
    'manual',
    'https://www.marionskitchen.com/garlic-butter-fried-rice/',
    'https://www.marionskitchen.com/wp-content/uploads/2021/08/20201117_Garlic-Butter-Fried-Rice-20-scaled-e1628861556441.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  1,  'pour le wok'),
    (v_recipe_id, 'beurre',                     50,  'g',          true,  2,  NULL),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  3,  'haché fin'),
    (v_recipe_id, 'riz cuit',                   800, 'g',          true,  4,  'de la veille'),
    (v_recipe_id, 'œufs',                       3,   'unité',      true,  5,  'légèrement battus'),
    (v_recipe_id, 'oignons verts',              60,  'g',          true,  6,  'tranchés fin'),
    (v_recipe_id, 'sauce soja',                 3,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'parmesan râpé',              30,  'g',          true,  9,  'pour servir'),
    (v_recipe_id, 'huile végétale',             60,  'ml',         true,  10, 'pour huile d''ail'),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  11, 'tranchée fin, pour huile');

  -- =====================================================================
  -- 19. Poulet Crémeux Ail-Champignons (Marion)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Poulet Crémeux Ail-Champignons (Marion)',
    'Cuisses de poulet (avec peau) saisies puis braisées dans une sauce crémeuse à la crème de coco, ail confit, champignons caramélisés et thym. Zest de citron et ciboulette en finition.',
    $instr$["Émietter le cube de bouillon et le mélanger au sel. Saupoudrer sur les cuisses, puis poivrer.",
"Chauffer l'huile dans une grande poêle à feu vif. Ajouter les cuisses peau vers le bas et saisir 5 minutes jusqu'à doré.",
"Retourner et cuire 2 minutes l'autre face ; réserver sur assiette.",
"Évacuer le gras en gardant ~2 c. à soupe, remettre la poêle à feu moyen-vif. Faire mousser le beurre puis ajouter les champignons. Saler.",
"Saisir 2-3 minutes sans toucher jusqu'à dorés, puis 3-4 minutes en remuant jusqu'à profondément caramélisés. Ajouter l'ail et sauter 1 minute.",
"Tossing les feuilles de thym dans les champignons. Verser la crème de coco.",
"Remettre les cuisses dans la sauce crémeuse et mijoter 10 minutes jusqu'à cuites à cœur.",
"Râper le zeste de citron par-dessus, parsemer de ciboulette et servir."]
$instr$,
    10, 30, 4, 2,
    'Asiatique', 'dinner',
    ARRAY['poulet','champignons','crème de coco','one-pan','asiatique','dairy-free','citron'],
    'manual',
    'https://www.marionskitchen.com/creamy-garlic-mushroom-chicken/',
    'https://www.marionskitchen.com/wp-content/uploads/2021/08/20201124_Creamy-Garlic-Mushroom-Chicken_Reshoot-8-scaled-e1628837165236.jpeg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',          8,   'unité',      true,  1,  'désossées, avec peau'),
    (v_recipe_id, 'cube de bouillon de poulet', 1,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'sel de mer',                 1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  4,  'moulu'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'beurre non salé',            50,  'g',          true,  6,  NULL),
    (v_recipe_id, 'champignons',                400, 'g',          true,  7,  'en chunks'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  8,  'haché fin'),
    (v_recipe_id, 'thym',                       3,   'branche',    true,  9,  'feuilles'),
    (v_recipe_id, 'crème de coco',              240, 'ml',         true,  10, NULL),
    (v_recipe_id, 'citron',                     1,   'unité',      true,  11, 'zeste'),
    (v_recipe_id, 'ciboulette',                 2,   'c. à soupe', true,  12, 'tranchée fin');

  -- =====================================================================
  -- 20. Ayam Goreng (Poulet Frit Malaisien)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Ayam Goreng (Poulet Frit Malaisien)',
    'Poulet frit malaisien profondément aromatique : marinade pilée de citronnelle, galanga, gingembre, échalote, ail, curcuma et graines toastées (fenouil, coriandre, cumin), enrobé d''œuf et fécule.',
    $instr$["Toaster graines de fenouil, coriandre et cumin dans une petite poêle 3 minutes en secouant jusqu'à parfumées.",
"Au mortier, piler les graines en poudre grossière. Transférer dans un grand saladier.",
"Au mortier, piler échalote, ail, gingembre, galanga, citronnelle et sel jusqu'à pâte grossière. Ajouter au saladier d'épices.",
"Ajouter le curcuma et les morceaux de poulet, mélanger pour bien enrober. Si possible, couvrir et mariner une nuit au frigo (sinon, passer à l'étape suivante).",
"Ajouter l'œuf et la fécule de maïs au poulet et mélanger pour former une pâte adhérente.",
"Remplir une casserole ou un wok au tiers d'huile et chauffer à feu moyen jusqu'à 165°C.",
"Frire les morceaux par lots ~15 minutes en les retournant jusqu'à profondément dorés et cuits.",
"Égoutter sur grille couverte de papier absorbant, saler généreusement et servir chaud."]
$instr$,
    10, 30, 4, 3,
    'Malaisienne', 'dinner',
    ARRAY['poulet frit','malaisien','citronnelle','galanga','ayam goreng','aromatique','street-food'],
    'manual',
    'https://www.marionskitchen.com/ayam-goreng-malaysian-fried-chicken/',
    'https://www.marionskitchen.com/wp-content/uploads/2021/08/20201216_Malaysian-Fried-Chicken-Ayam-Goreng-4-Web.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'graines de fenouil',         1,   'c. à café',  true,  1,  NULL),
    (v_recipe_id, 'graines de coriandre',       1,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'graines de cumin',           1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'échalotes rouges',           3,   'unité',      true,  4,  'pelées, en morceaux'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  5,  'pelée, hachée grossier'),
    (v_recipe_id, 'gingembre',                  4,   'cm',         true,  6,  'pelé, en morceaux'),
    (v_recipe_id, 'galanga',                    4,   'cm',         true,  7,  'pelé, en morceaux'),
    (v_recipe_id, 'citronnelle',                1,   'tige',       true,  8,  'blanc, haché grossier'),
    (v_recipe_id, 'curcuma',                    1,   'c. à café',  true,  9,  'en poudre'),
    (v_recipe_id, 'sel de mer',                 2,   'c. à café',  true,  10, '+ extra pour servir'),
    (v_recipe_id, 'morceaux de poulet',         8,   'unité',      true,  11, 'cuisses, pilons'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  12, NULL),
    (v_recipe_id, 'fécule de maïs',             125, 'g',          true,  13, NULL),
    (v_recipe_id, 'huile végétale',             1500,'ml',         true,  14, 'pour friture');

  -- =====================================================================
  -- 21. Steak Sauce Miso-Champignons Crémeuse
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Steak Sauce Miso-Champignons Crémeuse',
    'Steak fillet saisi et basté au beurre-thym, nappé d''une sauce crémeuse au miso blanc, champignons caramélisés, saké et crème. Finition zeste de citron et ciboulette.',
    $instr$["Sauce : chauffer le bouillon de bœuf dans une petite casserole à feu moyen-vif. Au frémissement, fouetter le miso jusqu'à dissolution ; retirer du feu.",
"Chauffer l'huile dans une grande poêle à feu vif. Étaler les champignons, saler et laisser saisir 2 minutes sans toucher pour la coloration.",
"Retourner et saisir 2-3 minutes l'autre face. Ajouter beurre, ail, échalote et thym, sauter pour enrober.",
"Verser le saké et laisser bouillonner 1 minute. Ajouter le mélange miso-bouillon et la crème, mijoter 4-5 minutes jusqu'à épaississement.",
"Incorporer poivre blanc, zeste de citron et ciboulette ; éteindre et garder au chaud.",
"Steaks : saler généreusement. Chauffer une autre grande poêle à feu vif avec 1 c. à soupe d'huile. Saisir les steaks.",
"Ajouter beurre et thym et baster en continu. Cuire 2-3 minutes par face pour saignant. Reposer 2-3 minutes.",
"Dresser les steaks nappés généreusement de sauce miso-champignons."]
$instr$,
    10, 15, 2, 3,
    'Européenne', 'dinner',
    ARRAY['steak','miso','champignons','fusion','crémeux','saké','umami'],
    'manual',
    'https://www.marionskitchen.com/steak-creamy-miso-mushroom-sauce/',
    'https://www.marionskitchen.com/wp-content/uploads/2020/04/Steak-Creamy-Miso-Mushroom-Sauce4.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'steaks scotch fillet',       2,   'unité',      true,  1,  'ou autre coupe'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  2,  'pour steaks'),
    (v_recipe_id, 'beurre',                     25,  'g',          true,  3,  'pour basting steaks'),
    (v_recipe_id, 'thym',                       2,   'branche',    true,  4,  'pour steaks'),
    (v_recipe_id, 'bouillon de bœuf',           180, 'ml',         true,  5,  'pour sauce'),
    (v_recipe_id, 'miso blanc (shiro)',         2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  7,  'pour champignons'),
    (v_recipe_id, 'champignons mélangés',       400, 'g',          true,  8,  'coupés en deux'),
    (v_recipe_id, 'beurre non salé',            50,  'g',          true,  9,  'pour champignons'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  10, 'haché fin'),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  11, 'hachée fin'),
    (v_recipe_id, 'thym',                       3,   'branche',    true,  12, 'pour sauce'),
    (v_recipe_id, 'saké',                       60,  'ml',         true,  13, 'ou vin blanc'),
    (v_recipe_id, 'crème épaisse',              240, 'ml',         true,  14, NULL),
    (v_recipe_id, 'poivre blanc moulu',         0.25,'c. à café',  true,  15, NULL),
    (v_recipe_id, 'citron',                     0.5, 'unité',      true,  16, 'zeste'),
    (v_recipe_id, 'ciboulette',                 2,   'c. à soupe', true,  17, 'hachée fin'),
    (v_recipe_id, 'sel de mer',                 2,   'c. à café',  true,  18, 'au goût');

END $$;
