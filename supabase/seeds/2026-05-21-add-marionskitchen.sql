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
    'Gyudon entièrement préparé au cuiseur à riz : riz japonais, bœuf tranché fin et oignons cuisent ensemble dans un bouillon dashi-soja légèrement sucré, puis des œufs battus forment un nappage crémeux à la fin.',
    $instr$["Rincer le riz japonais et le placer dans la cuve du cuiseur avec l'eau, le dashi en poudre, la sauce soja, le vinaigre de riz et le sucre. Remuer pour dissoudre.",
"Répartir uniformément les oignons émincés sur le riz, puis poser le bœuf par-dessus sans mélanger.",
"Fermer le cuiseur, lancer un cycle riz blanc standard et laisser cuire sans intervenir.",
"Environ 10 minutes avant la fin (ou au passage en maintien au chaud), battre légèrement les œufs avec 1 c. à soupe d'eau, en laissant quelques traces de blanc et de jaune.",
"Ouvrir rapidement le couvercle, verser les œufs battus uniformément sur le bœuf, refermer et laisser 5 à 8 minutes en maintien au chaud pour les pocher doucement.",
"Servir en plongeant la cuillère jusqu'au fond de la cuve pour récupérer riz, bœuf, oignons et nappage d'œuf dans chaque portion.",
"Garnir d'oignons verts ciselés, de graines de sésame grillées et de shichimi togarashi."]
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
    (v_recipe_id, 'riz japonais',               300, 'g',          true,  1,  'grain court, rincé'),
    (v_recipe_id, 'eau',                        380, 'ml',         true,  2,  'selon le cuiseur'),
    (v_recipe_id, 'dashi en poudre',            1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'sauce soja',                 4,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'vinaigre de riz',            1.25,'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'sucre',                      2.5, 'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  7,  'émincé finement'),
    (v_recipe_id, 'bœuf',                       300, 'g',          true,  8,  'tranché finement (entrecôte ou faux-filet)'),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  9,  'légèrement battus'),
    (v_recipe_id, 'eau',                        1,   'c. à soupe', true,  10, 'pour les œufs'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       false, 11, 'ciselés, garniture'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à café',  false, 12, 'grillées'),
    (v_recipe_id, 'shichimi togarashi',         1,   'pincée',     false, 13, 'optionnel');

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
    'Boulettes de poulet haché liées à l''œuf, dorées à la poêle puis enrobées d''une sauce satay chaude (cacahuète, curry, coco). Servies sur du riz avec du brocolini vapeur.',
    $instr$["Dans un grand bol, mélanger le poulet haché, la marinade satay et les œufs battus jusqu'à ce que le tout soit homogène.",
"Chauffer l'huile dans une grande poêle à feu moyen.",
"À l'aide d'une cuillère à glace, déposer des boulettes de la taille d'une balle de golf directement dans la poêle chaude.",
"Cuire 8 à 10 minutes en les retournant régulièrement pour qu'elles dorent uniformément et soient cuites à cœur.",
"Verser la sauce satay et le bouillon de poulet, remuer doucement pour enrober et laisser chauffer 1 à 2 minutes.",
"Dresser sur le riz, avec le brocolini cuit à la vapeur.",
"Parsemer d'oignon vert ciselé et arroser d'huile de piment croustillante si désiré."]
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
    (v_recipe_id, 'marinade satay',             3,   'c. à soupe', true,  2,  'mélange d''épices thaï'),
    (v_recipe_id, 'sauce satay',                180, 'ml',         true,  3,  'cacahuète-coco, en pot ou maison'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  5,  'battus'),
    (v_recipe_id, 'bouillon de poulet',         120, 'ml',         true,  6,  NULL),
    (v_recipe_id, 'oignon vert',                1,   'tige',       false, 7,  'ciselé'),
    (v_recipe_id, 'riz jasmin',                 500, 'g',          false, 8,  'cuit, pour servir'),
    (v_recipe_id, 'brocolini',                  200, 'g',          false, 9,  'cuit à la vapeur, pour servir'),
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
    'Fusion thaï-italienne : linguine enrobées d''une sauce crémeuse au lait de coco, à la pâte de curry rouge, au parmesan et à la mozzarella, surmontées de poulet poêlé tranché.',
    $instr$["Porter une grande casserole d'eau salée à ébullition et cuire les linguine al dente. Réserver 120 ml d'eau de cuisson avant d'égoutter.",
"Chauffer 1 c. à soupe d'huile dans une grande poêle à feu moyen-vif. Saler le poulet et le cuire 3 à 4 minutes par face. Réserver sur une assiette.",
"Dans la même poêle, ajouter la seconde c. à soupe d'huile et la pâte de curry rouge ; cuire 1 minute en remuant jusqu'à ce qu'elle embaume.",
"Verser le lait de coco, ajouter les herbes thaïes séchées, les flocons de piment et les pousses de bambou. Mélanger et laisser mijoter 3 à 4 minutes.",
"Retirer les gros morceaux d'herbes séchées, mixer la sauce au blender jusqu'à ce qu'elle soit lisse, puis la remettre dans la poêle.",
"Incorporer le beurre, l'ail, le parmesan et la mozzarella jusqu'à obtenir une sauce crémeuse. Détendre avec l'eau de cuisson si elle est trop épaisse.",
"Ajouter les linguine et bien les enrober. Trancher le poulet, le poser sur les pâtes et napper de sauce.",
"Servir avec du parmesan supplémentaire et un filet d'huile de piment croustillante."]
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
    (v_recipe_id, 'blancs de poulet',           2,   'unité',      true,  1,  'coupés en deux dans l''épaisseur'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  2,  'pour l''eau et le poulet'),
    (v_recipe_id, 'pâte de curry rouge thaï',   3,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  4,  '1 boîte'),
    (v_recipe_id, 'herbes thaïes séchées',      1,   'c. à soupe', true,  5,  'mélange citronnelle et combava'),
    (v_recipe_id, 'flocons de piment',          1,   'c. à café',  false, 6,  'optionnel'),
    (v_recipe_id, 'pousses de bambou',          200, 'g',          true,  7,  'en conserve'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'ail',                        1,   'c. à soupe', true,  9,  'haché fin'),
    (v_recipe_id, 'linguine',                   180, 'g',          true,  10, NULL),
    (v_recipe_id, 'beurre',                     2,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'parmesan râpé',              60,  'g',          true,  12, 'frais, + extra pour servir'),
    (v_recipe_id, 'mozzarella râpée',           60,  'g',          true,  13, NULL),
    (v_recipe_id, 'huile de piment croustillante',1,'c. à soupe', false, 14, 'pour servir');

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
    'Soupe-lasagne fusion : bœuf haché, sauce marinara et pâte de curry rouge thaï, avec feuilles de lasagne brisées et crème. Surmontée d''une garniture ricotta-mozzarella-parmesan aux herbes.',
    $instr$["Chauffer un filet d'huile dans une grande marmite à feu moyen, faire suer l'oignon 2 à 3 minutes puis ajouter l'ail et cuire 1 minute.",
"Ajouter le bœuf haché et l'émietter à la spatule jusqu'à ce qu'il soit coloré.",
"Incorporer le concentré de tomate et la pâte de curry rouge, cuire 1 à 2 minutes pour torréfier les épices.",
"Ajouter l'origan, le persil séché, les flocons de piment, le sel et le poivre. Verser la sauce marinara, l'eau et le bouillon ; porter à frémissement.",
"Incorporer les feuilles de lasagne brisées et laisser mijoter 15 à 20 minutes en remuant de temps en temps, jusqu'à ce qu'elles soient al dente.",
"Ajouter la crème, les épinards et une partie du persil et du basilic frais ; laisser mijoter 2 minutes.",
"Préparer la garniture : mélanger la ricotta, la mozzarella, le parmesan et le reste du persil et du basilic hachés.",
"Servir dans des bols, déposer une généreuse cuillerée de garniture à la ricotta et arroser d'huile de piment croustillante si désiré."]
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
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  2,  'haché fin'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  3,  'haché'),
    (v_recipe_id, 'bœuf haché',                 500, 'g',          true,  4,  NULL),
    (v_recipe_id, 'concentré de tomate',        2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'pâte de curry rouge thaï',   2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'origan séché',               1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'persil séché',               1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'flocons de piment',          1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'poivre',                     1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'sauce marinara',             680, 'g',          true,  12, '1 bocal'),
    (v_recipe_id, 'bouillon de poulet',         480, 'ml',         true,  13, NULL),
    (v_recipe_id, 'eau',                        720, 'ml',         true,  14, NULL),
    (v_recipe_id, 'feuilles de lasagne',        125, 'g',          true,  15, 'brisées en morceaux'),
    (v_recipe_id, 'crème épaisse',              120, 'ml',         true,  16, NULL),
    (v_recipe_id, 'pousses d''épinards',        50,  'g',          true,  17, NULL),
    (v_recipe_id, 'persil frais',               20,  'g',          true,  18, 'haché, soupe et garniture'),
    (v_recipe_id, 'basilic frais',              15,  'g',          true,  19, 'haché, soupe et garniture'),
    (v_recipe_id, 'ricotta',                    120, 'g',          true,  20, 'garniture'),
    (v_recipe_id, 'mozzarella râpée',           60,  'g',          true,  21, 'garniture'),
    (v_recipe_id, 'parmesan râpé',              30,  'g',          true,  22, 'garniture'),
    (v_recipe_id, 'huile de piment croustillante',1,'c. à soupe', false, 23, 'optionnel');

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
    'Cuisses de poulet marinées (racines de coriandre, ail, poivre, curcuma, sauce de poisson, kecap manis) puis grillées au barbecue, servies avec un chimichurri herbacé d''inspiration thaïe.',
    $instr$["Au mortier, piler les racines de coriandre, l'ail et les grains de poivre blanc jusqu'à obtenir une pâte grossière.",
"Mélanger le poulet avec cette pâte, le curcuma, la sauce de poisson et le kecap manis ; couvrir et laisser mariner 15 minutes (idéalement une nuit).",
"Préparer le chimichurri en mélangeant la coriandre et le persil hachés, l'oignon, l'ail, le paprika, l'origan, les flocons de piment, le sel, l'huile d'olive et le jus de citron vert ; réfrigérer 15 minutes.",
"Préchauffer le barbecue à feu moyen.",
"Griller les cuisses côté peau 15 minutes.",
"Retourner et cuire encore 15 à 20 minutes, jusqu'à 75 °C à cœur (jus clair).",
"Laisser reposer 10 minutes sur un plat.",
"Servir nappé de chimichurri, parsemer de coriandre fraîche et proposer le reste de chimichurri à part."]
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
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  3,  'pour la marinade'),
    (v_recipe_id, 'poivre blanc en grains',     1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'curcuma',                    0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'sauce de poisson',           2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'kecap manis',                1,   'c. à soupe', true,  7,  'sauce soja sucrée'),
    (v_recipe_id, 'coriandre fraîche',          1,   'botte',      true,  8,  'chimichurri et garniture'),
    (v_recipe_id, 'persil frais',               1,   'botte',      true,  9,  'pour le chimichurri'),
    (v_recipe_id, 'oignon',                     0.25,'unité',      true,  10, 'haché fin (2 c. à soupe)'),
    (v_recipe_id, 'ail',                        0.5, 'gousse',     true,  11, 'râpée, pour le chimichurri'),
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
    'Plat national thaï : poulet entier poché dans un bouillon parfumé, riz jasmin cuit dans la graisse du poulet, accompagné d''une sauce piquante gingembre-ail-soja-vinaigre.',
    $instr$["Parer le poulet en réservant les chutes de peau et de gras. Frotter le poulet de sel de mer.",
"Dans un grand faitout, mélanger le bouillon de poulet, le gingembre et les oignons verts. Plonger le poulet et compléter d'eau juste à hauteur.",
"Porter à ébullition, puis baisser le feu et laisser mijoter 1 heure à découvert en écumant.",
"Pendant la cuisson, préparer la sauce : piler au mortier les racines de coriandre, l'ail et le sel jusqu'à obtenir une pâte fine, puis incorporer les autres ingrédients de la sauce.",
"Retirer le poulet cuit et le laisser tiédir sur une planche.",
"Pour le riz : chauffer l'huile dans une casserole à feu moyen-vif et faire fondre les chutes de peau et de gras 5 minutes jusqu'à ce qu'elles soient dorées ; retirer les morceaux.",
"Dans cette graisse, ajouter l'ail et le riz lavé, puis 540 ml du bouillon de pochage ; couvrir et cuire 10 à 12 minutes, jusqu'à ce que le riz soit tendre.",
"Pour servir : trancher le poulet (aplatir légèrement le blanc au rouleau pour l'attendrir), dresser avec le riz, le concombre et la coriandre, et accompagner de la sauce et d'un petit bol de bouillon."]
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
    (v_recipe_id, 'eau',                        1000,'ml',         true,  4,  'environ, pour couvrir le poulet'),
    (v_recipe_id, 'gingembre',                  40,  'g',          true,  5,  'en tranches'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  6,  'entiers'),
    (v_recipe_id, 'racines de coriandre',       2,   'unité',      true,  7,  'pour la sauce'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  8,  'pour la sauce'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  9,  'pour la sauce'),
    (v_recipe_id, 'sauce soja claire',          3,   'c. à soupe', true,  10, 'pour la sauce'),
    (v_recipe_id, 'sauce soja foncée',          1,   'c. à soupe', true,  11, 'pour la sauce'),
    (v_recipe_id, 'pâte de soja fermentée',     1,   'c. à soupe', true,  12, 'tao jiao, pour la sauce'),
    (v_recipe_id, 'gingembre',                  1,   'c. à soupe', true,  13, 'râpé, pour la sauce'),
    (v_recipe_id, 'piments thaïs',              3,   'unité',      true,  14, 'tranchés'),
    (v_recipe_id, 'vinaigre de riz',            1,   'c. à soupe', true,  15, 'pour la sauce'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  16, 'pour la sauce'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  17, 'pour le riz'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  18, 'haché, pour le riz'),
    (v_recipe_id, 'riz jasmin',                 360, 'g',          true,  19, NULL),
    (v_recipe_id, 'concombre',                  1,   'unité',      false, 20, 'en tranches'),
    (v_recipe_id, 'coriandre fraîche',          1,   'botte',      false, 21, 'garniture');

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
    'Jarrets d''agneau rôtis lentement (4 h) dans une sauce massaman au lait de coco, avec oignons entiers et pommes de terre. Plat festif et réconfortant servi avec du riz.',
    $instr$["Préchauffer le four à 150 °C.",
"Saler généreusement les jarrets d'agneau. Chauffer l'huile dans une grande cocotte allant au four, à feu moyen-vif.",
"Saisir les jarrets 8 à 10 minutes en les tournant pour les dorer sur la plupart des faces. Les réserver sur un plat en laissant les sucs dans la cocotte.",
"Dans la même cocotte, faire revenir la pâte de curry massaman 30 secondes jusqu'à ce qu'elle embaume.",
"Déglacer avec le lait de coco puis ajouter l'eau ; remettre les jarrets dans la sauce. Couvrir et enfourner 2 heures.",
"Sortir la cocotte, ajouter les oignons et les pommes de terre, couvrir et remettre au four 1 h à 1 h 30, jusqu'à ce que l'agneau soit fondant.",
"Incorporer la sauce de poisson et le sucre à la sauce, puis ajuster au goût.",
"Dresser les jarrets, les pommes de terre et les oignons sur un grand plat et napper généreusement de sauce.",
"Garnir de coriandre fraîche et servir avec du riz."]
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
    (v_recipe_id, 'jarrets d''agneau',          2000,'g',          true,  1,  '4 à 6 pièces'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'pâte de curry massaman',     120, 'ml',         true,  3,  NULL),
    (v_recipe_id, 'lait de coco',               800, 'ml',         true,  4,  '2 boîtes de 400 ml'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  5,  NULL),
    (v_recipe_id, 'oignon',                     6,   'unité',      true,  6,  'petits, épluchés, les plus gros coupés en deux'),
    (v_recipe_id, 'pommes de terre',            8,   'unité',      true,  7,  'petites, pelées, coupées en deux'),
    (v_recipe_id, 'sauce de poisson',           2,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'sel de mer',                 1,   'c. à café',  true,  10, 'au goût'),
    (v_recipe_id, 'coriandre fraîche',          1,   'botte',      false, 11, 'hachée, garniture'),
    (v_recipe_id, 'riz jasmin',                 600, 'g',          false, 12, 'cuit, pour servir');

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
    'Blancs de poulet farinés, saisis puis terminés au four dans une sauce crémeuse aux champignons bien dorés, au thym, au romarin et au parmesan. Zeste de citron en finition.',
    $instr$["Préchauffer le four à 180 °C.",
"Assaisonner les blancs de poulet de sel et de poivre, puis les fariner en secouant l'excédent.",
"Chauffer l'huile et le beurre dans une poêle allant au four ; quand le beurre mousse, saisir le poulet 5 minutes par face jusqu'à ce qu'il soit doré, puis réserver.",
"Dans la même poêle, à feu moyen-vif, ajouter les champignons, saler, poivrer, puis ajouter l'ail, le thym et le romarin. Saisir 2 minutes sans remuer, mélanger et répéter jusqu'à ce qu'ils soient bien dorés.",
"Verser l'eau, émietter le cube de bouillon et laisser mijoter 30 secondes. Baisser à feu doux et incorporer la crème.",
"Remettre le poulet dans la poêle en l'arrosant de sauce. Enfourner 10 minutes, jusqu'à ce que la sauce épaississe et que le poulet soit cuit à cœur.",
"À la sortie du four, râper le zeste de citron par-dessus, parsemer de parmesan et de persil.",
"Servir avec une purée, du riz ou des pâtes."]
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
    (v_recipe_id, 'eau',                        120, 'ml',         true,  11, NULL),
    (v_recipe_id, 'cube de bouillon de poulet', 1,   'unité',      true,  12, NULL),
    (v_recipe_id, 'crème épaisse',              250, 'ml',         true,  13, NULL),
    (v_recipe_id, 'citron',                     1,   'unité',      true,  14, 'zeste'),
    (v_recipe_id, 'parmesan',                   30,  'g',          true,  15, 'râpé fin'),
    (v_recipe_id, 'persil frais',               2,   'c. à soupe', false, 16, 'haché fin, garniture');

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
    'Version street-food authentique du pad krapow thaï : bœuf haché sauté avec ail et piments pilés grossièrement et basilic sacré, servi sur du riz avec un œuf frit croustillant et du prik nam pla.',
    $instr$["Préparer le prik nam pla en mélangeant la sauce de poisson, les piments d'oiseau tranchés, l'ail tranché et les quartiers de citron vert.",
"Mélanger la sauce de cuisson : sauce d'huître, sauce de poisson, poivre noir et sucre.",
"Cuire les œufs croustillants : chauffer l'huile dans le wok à feu vif, casser un œuf et l'arroser d'huile chaude jusqu'à ce que le blanc soit croustillant et le jaune encore coulant ; réserver. Répéter.",
"Au mortier, piler grossièrement les piments et l'ail (garder des morceaux, pas une pâte fine).",
"Retirer l'huile du wok en en laissant 2 c. à soupe, remettre à feu moyen, ajouter la pâte ail-piment et cuire 30 secondes jusqu'à ce qu'elle embaume.",
"Ajouter le bœuf haché, l'émietter à la spatule et le faire sauter 4 à 5 minutes, jusqu'à ce qu'il soit cuit et que le jus se soit évaporé.",
"Verser la sauce par les bords du wok pour la caraméliser, puis mélanger pour enrober. Incorporer le basilic sacré et faire sauter 1 minute.",
"Servir sur le riz, surmonter de l'œuf croustillant et arroser de prik nam pla."]
$instr$,
    15, 15, 2, 2,
    'Thaïlandaise', 'dinner',
    ARRAY['pad krapow','bœuf','basilic sacré','thaïlandais','street-food','épicé','wok'],
    'manual',
    'https://www.marionskitchen.com/street-food-style-pad-krapow/',
    'https://www.marionskitchen.com/wp-content/uploads/2023/12/Street-Food-Style-Pad-Krapow-01.webp'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 300, 'g',          true,  1,  NULL),
    (v_recipe_id, 'piments rouges doux',        8,   'unité',      true,  2,  'longs'),
    (v_recipe_id, 'piments d''oiseau',          3,   'unité',      true,  3,  'forts'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  4,  'pelées'),
    (v_recipe_id, 'basilic sacré',              60,  'g',          true,  5,  'feuilles'),
    (v_recipe_id, 'huile végétale',             120, 'ml',         true,  6,  'pour les œufs frits'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  7,  'pour les œufs croustillants'),
    (v_recipe_id, 'sauce de poisson',           60,  'ml',         true,  8,  'pour le prik nam pla'),
    (v_recipe_id, 'piments d''oiseau',          3,   'unité',      true,  9,  'prik kee noo, tranchés fin, pour le prik nam pla'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  10, 'tranchée fin, pour le prik nam pla'),
    (v_recipe_id, 'citron vert',                0.5, 'unité',      true,  11, 'en quartiers'),
    (v_recipe_id, 'sauce d''huître',            3,   'c. à soupe', true,  12, 'sauce'),
    (v_recipe_id, 'sauce de poisson',           1,   'c. à soupe', true,  13, 'sauce'),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  14, 'fraîchement moulu'),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  15, 'sauce'),
    (v_recipe_id, 'riz jasmin',                 500, 'g',          false, 16, 'cuit, pour servir');

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
    'Variante frite du khao mun gai : ailes de poulet et daïkon longuement mijotés pour un bouillon doré, riz jasmin cuit dans la graisse avec des racines de coriandre, surmonté de poulet frit croustillant.',
    $instr$["Bouillon : réunir les ailes de poulet, le daïkon, le gingembre, les oignons verts, le poivre blanc, le sel et l'eau dans une grande marmite. Porter à ébullition puis laisser mijoter 30 minutes en écumant.",
"Prélever la graisse à la surface du bouillon et la mettre dans un wok. Ajouter les racines de coriandre pilées, l'ail et le gingembre hachés ; faire suer 2 à 3 minutes.",
"Ajouter le riz jasmin et l'enrober 1 minute, puis le transférer dans le cuiseur à riz avec 480 ml de bouillon ; lancer la cuisson.",
"Préparer la friture : remplir une sauteuse d'huile au tiers et la chauffer à 180 °C.",
"Pour la pâte, mélanger la farine (en garder un peu pour l'enrobage), la farine de riz, la fécule de maïs, le poivre blanc, l'ail en poudre, le bicarbonate et le sel ; ajouter 240 ml d'eau et fouetter jusqu'à obtenir une pâte lisse.",
"Fariner les cuisses, les tremper dans la pâte puis les frire 8 à 10 minutes en les retournant, jusqu'à ce qu'elles soient dorées.",
"Égoutter sur une grille et saler. Découper en lanières.",
"Servir : riz moulé en dôme, poulet frit tranché par-dessus, concombre en tranches, sauce chili douce et petit bol de bouillon."]
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
    (v_recipe_id, 'daïkon',                     400, 'g',          true,  2,  'un demi, en tranches fines'),
    (v_recipe_id, 'gingembre',                  40,  'g',          true,  3,  'en tranches, pour le bouillon'),
    (v_recipe_id, 'oignons verts',              2,   'tige',       true,  4,  'pour le bouillon'),
    (v_recipe_id, 'poivre blanc moulu',         0.5, 'c. à café',  true,  5,  'pour le bouillon'),
    (v_recipe_id, 'sel',                        2,   'c. à soupe', true,  6,  'pour le bouillon'),
    (v_recipe_id, 'eau',                        2,   'l',          true,  7,  'pour le bouillon'),
    (v_recipe_id, 'racines de coriandre',       2,   'unité',      true,  8,  'pilées, pour le riz'),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  9,  'haché grossièrement'),
    (v_recipe_id, 'gingembre',                  1,   'c. à soupe', true,  10, 'haché fin'),
    (v_recipe_id, 'riz jasmin',                 280, 'g',          true,  11, NULL),
    (v_recipe_id, 'farine',                     150, 'g',          true,  12, 'pour la pâte et l''enrobage'),
    (v_recipe_id, 'farine de riz',              30,  'g',          true,  13, NULL),
    (v_recipe_id, 'fécule de maïs',             30,  'g',          true,  14, NULL),
    (v_recipe_id, 'poivre blanc moulu',         1,   'c. à café',  true,  15, 'pour la pâte'),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  16, NULL),
    (v_recipe_id, 'bicarbonate de soude',       1,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  18, 'pour la pâte'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  19, 'pour la pâte'),
    (v_recipe_id, 'cuisses de poulet',          6,   'unité',      true,  20, 'désossées'),
    (v_recipe_id, 'huile végétale',             1500,'ml',         true,  21, 'pour la friture'),
    (v_recipe_id, 'concombre',                  1,   'unité',      false, 22, 'tranché'),
    (v_recipe_id, 'sauce chili douce',          120, 'ml',         false, 23, 'pour servir');

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
    'Riz frit chinois minimaliste à l''œuf : oignon, ail, omelette émiettée, riz jasmin, sauce soja et oignons verts. Un classique prêt en 10 minutes au wok.',
    $instr$["Chauffer 2 c. à soupe d'huile dans un wok ou une grande poêle à feu vif.",
"Ajouter l'oignon et l'ail, faire sauter 30 secondes jusqu'à ce qu'ils soient juste ramollis.",
"Pousser sur un côté du wok et verser les œufs battus de l'autre côté.",
"Travailler l'œuf à la spatule pour former une omelette fine.",
"Quand l'œuf est presque pris, le briser et le mélanger aux autres ingrédients.",
"Ajouter le riz, la sauce soja et les oignons verts.",
"Faire sauter à feu vif jusqu'à ce que le tout soit bien mélangé et chaud.",
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
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  3,  'haché grossièrement'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  4,  'légèrement battus'),
    (v_recipe_id, 'riz jasmin',                 600, 'g',          true,  5,  'cuit, de la veille de préférence'),
    (v_recipe_id, 'sauce soja chinoise',        2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'oignons verts',              3,   'tige',       true,  7,  'émincés');

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
    'Riz frit thaï au poulet et au gai lan (brocoli chinois), assaisonné de sauce soja, de sauce de poisson et de sucre, servi avec du prik nam pla (sauce de poisson pimentée) et des quartiers de citron vert.',
    $instr$["Préparer le prik nam pla : mélanger la sauce de poisson, les piments d'oiseau tranchés et le jus d'un quartier de citron vert (laisser le quartier dans la sauce).",
"Chauffer l'huile dans un wok à feu vif jusqu'à ce qu'elle fume.",
"Ajouter l'oignon en quartiers et faire sauter 1 minute. Incorporer l'ail et le poulet et faire sauter 2 à 3 minutes, jusqu'à ce que le poulet soit presque cuit.",
"Ajouter le gai lan et faire sauter 2 minutes, jusqu'à ce que le poulet soit cuit et le légume tendre. Ajouter la tomate.",
"Pousser le tout sur un côté, ajouter 1 c. à café d'huile et verser les œufs ; laisser prendre 1 minute puis brouiller.",
"Ajouter le riz, la sauce soja, la sauce de poisson, le sucre et le poivre blanc. Faire sauter 1 à 2 minutes pour bien enrober.",
"Dresser dans les assiettes et servir avec le prik nam pla, des tranches de concombre et des quartiers de citron vert."]
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
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  1,  '+ 1 c. à café pour les œufs'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  2,  'en quartiers'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  3,  'haché grossièrement'),
    (v_recipe_id, 'cuisse de poulet',           150, 'g',          true,  4,  'désossée, tranchée finement'),
    (v_recipe_id, 'gai lan',                    150, 'g',          true,  5,  'brocoli chinois, tranché'),
    (v_recipe_id, 'tomate',                     0.5, 'unité',      true,  6,  'en quartiers'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  7,  'légèrement battus'),
    (v_recipe_id, 'riz',                        400, 'g',          true,  8,  'cuit, de la veille'),
    (v_recipe_id, 'sauce soja thaï',            1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'sauce de poisson',           3,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'poivre blanc moulu',         1,   'pincée',     true,  12, NULL),
    (v_recipe_id, 'sauce de poisson',           3,   'c. à soupe', true,  13, 'pour le prik nam pla'),
    (v_recipe_id, 'piments d''oiseau',          3,   'unité',      true,  14, 'tranchés'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  15, 'en quartiers'),
    (v_recipe_id, 'concombre',                  0.5, 'unité',      false, 16, 'en tranches, pour servir');

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
    'Bol garni de cuisses de poulet pressées à la peau croustillante, posées sur un riz frit aux saucisses chinoises de poulet, aux légumes asiatiques et à l''huile de sésame. Sambal oelek et citron vert en accompagnement.',
    $instr$["Sécher les cuisses au papier absorbant et les saler généreusement.",
"Chauffer une poêle antiadhésive à feu moyen-vif. Ajouter l'huile puis les cuisses côté peau. Recouvrir de papier cuisson et presser avec une seconde poêle lourde.",
"Cuire 12 minutes ainsi pressées, jusqu'à ce que la peau soit dorée et croustillante, puis retourner environ 2 minutes pour finir la cuisson. Laisser reposer sur une grille.",
"Pour le riz : chauffer l'huile dans un wok à feu vif, ajouter l'ail, l'oignon et les saucisses ; faire sauter 2 minutes jusqu'à ce que l'oignon soit doré.",
"Pousser sur le côté, verser les œufs battus et les brouiller jusqu'à ce qu'ils soient presque pris, puis les mélanger au reste.",
"Ajouter les légumes asiatiques et les pousses d'épinards, faire sauter 2 minutes jusqu'à ce qu'ils flétrissent.",
"Ajouter le riz et la sauce soja, bien mélanger. Hors du feu, incorporer les oignons verts, l'huile de sésame, le poivre blanc et le jus de citron vert.",
"Répartir le riz dans des bols, trancher les cuisses et les poser dessus. Parsemer d'oignon vert et servir avec le sambal et les quartiers de citron vert."]
$instr$,
    10, 15, 4, 3,
    'Asiatique', 'dinner',
    ARRAY['poulet croustillant','riz frit','saucisse chinoise','saucisse de poulet','wok','bowl','asiatique'],
    'manual',
    'https://www.marionskitchen.com/super-crispy-chicken-fried-rice-bowl/',
    'https://www.marionskitchen.com/wp-content/uploads/2022/08/Super-Crispy-Fried-Chicken-Rice-Bowl-01.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',          4,   'unité',      true,  1,  'désossées, avec peau'),
    (v_recipe_id, 'sel de mer',                 2,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'huile végétale',             2,   'c. à café',  true,  3,  'pour le poulet'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  4,  'pour le riz'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  5,  'haché'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  6,  'en dés'),
    (v_recipe_id, 'saucisses chinoises de poulet',75,'g',          true,  7,  'en dés (ou saucisses de bœuf fumées)'),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  8,  'légèrement battus'),
    (v_recipe_id, 'légumes asiatiques',         200, 'g',          true,  9,  'bok choy, chou chinois'),
    (v_recipe_id, 'pousses d''épinards',        50,  'g',          true,  10, NULL),
    (v_recipe_id, 'riz',                        800, 'g',          true,  11, 'cuit, de la veille'),
    (v_recipe_id, 'sauce soja',                 4,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'oignons verts',              60,  'g',          true,  13, 'émincés, + un peu pour servir'),
    (v_recipe_id, 'huile de sésame',            2,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'poivre blanc moulu',         1,   'pincée',     true,  15, NULL),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  16, 'jus'),
    (v_recipe_id, 'citron vert',                1,   'unité',      false, 17, 'en quartiers, pour servir'),
    (v_recipe_id, 'sambal oelek',               2,   'c. à soupe', false, 18, 'pour servir');

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
    'Burger fusion : cuisses de poulet marinées au curry rouge thaï et au lait de coco, panées à sec et frites jusqu''à être très croustillantes, servies dans un pain brioché avec une mayonnaise au curry rouge et de la laitue.',
    $instr$["Fouetter la pâte de curry rouge, le lait de coco et la sauce de poisson dans un bol. Ajouter les cuisses, couvrir et laisser mariner 1 heure.",
"Mélanger la farine, la fécule de maïs, la levure chimique et 1 c. à café de sel dans un grand bol.",
"Égoutter chaque cuisse de sa marinade, puis la presser fermement dans la farine pour bien l'enrober.",
"Préchauffer le gril du four à puissance maximale. Remplir un wok d'huile au tiers et la chauffer à 165 °C.",
"Frire les cuisses 10 à 12 minutes en les retournant régulièrement, jusqu'à ce qu'elles soient dorées et cuites à cœur.",
"Mayonnaise au curry : fouetter la mayonnaise, la pâte de curry rouge, le jus de citron vert et une pincée de sel.",
"Couper les pains briochés en deux et les toaster sous le gril jusqu'à ce qu'ils soient dorés.",
"Tartiner de mayonnaise au curry, garnir de laitue puis poser la cuisse frite salée. Refermer et servir avec le reste de mayonnaise."]
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
    (v_recipe_id, 'sel de mer',                 1,   'c. à café',  true,  8,  '+ un peu pour la mayonnaise et pour servir'),
    (v_recipe_id, 'huile végétale',             1500,'ml',         true,  9,  'pour la friture'),
    (v_recipe_id, 'pains briochés',             4,   'unité',      true,  10, NULL),
    (v_recipe_id, 'laitue',                     8,   'feuille',    true,  11, 'feuille de chêne ou laitue beurre'),
    (v_recipe_id, 'mayonnaise',                 240, 'ml',         true,  12, 'pour la mayonnaise au curry'),
    (v_recipe_id, 'pâte de curry rouge thaï',   2,   'c. à soupe', true,  13, 'pour la mayonnaise'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  14, 'jus, pour la mayonnaise');

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
    'Sandwich grillé inspiré de la street-food de Bombay : purée épicée (graines de moutarde, cumin, feuilles de curry, curcuma, piment), tomates, oignon, poivron vert, gruyère et chutney coriandre-menthe.',
    $instr$["Chutney vert : mixer la coriandre, la menthe, l'ail, le chaat masala, les piments verts, le jus de citron et le sel jusqu'à obtenir une pâte grossière (ajouter un peu d'eau si nécessaire).",
"Mettre la purée de pommes de terre dans un grand bol. Chauffer l'huile végétale à feu moyen et ajouter les graines de moutarde ; quand elles éclatent, ajouter les graines de cumin et les feuilles de curry et cuire 1 à 2 minutes jusqu'à ce qu'elles embaument.",
"Incorporer le curcuma et le piment en poudre, mélanger. Verser sur la purée, saler, poivrer et bien mélanger.",
"Beurrer 8 tranches de pain de mie, puis les retourner.",
"Étaler généreusement la purée épicée sur 4 tranches.",
"Garnir uniformément de tomate, d'oignon, de poivron et de gruyère.",
"Tartiner les 4 autres tranches de chutney vert et les poser, chutney contre garniture.",
"Cuire dans un appareil à panini, ou dorer chaque face à la poêle puis finir au four jusqu'à ce que le fromage fonde. Couper en triangles et servir avec du chutney supplémentaire."]
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
    (v_recipe_id, 'feuilles de curry',          10,  'feuille',    true,  5,  'fraîches'),
    (v_recipe_id, 'curcuma',                    0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'piment en poudre',           0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  8,  'pour la purée'),
    (v_recipe_id, 'pain de mie blanc',          8,   'tranche',    true,  9,  NULL),
    (v_recipe_id, 'beurre',                     40,  'g',          true,  10, 'ramolli'),
    (v_recipe_id, 'tomates',                    2,   'unité',      true,  11, 'en tranches fines'),
    (v_recipe_id, 'oignon rouge',               0.5, 'unité',      true,  12, 'émincé finement'),
    (v_recipe_id, 'poivron vert',               0.5, 'unité',      true,  13, '8 anneaux fins'),
    (v_recipe_id, 'gruyère',                    8,   'tranche',    true,  14, 'ou emmental'),
    (v_recipe_id, 'coriandre fraîche',          30,  'g',          true,  15, 'avec les tiges, pour le chutney'),
    (v_recipe_id, 'menthe fraîche',             10,  'g',          true,  16, 'feuilles, pour le chutney'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  17, 'pour le chutney'),
    (v_recipe_id, 'chaat masala',               1,   'c. à café',  true,  18, NULL),
    (v_recipe_id, 'piments verts',              2,   'unité',      true,  19, 'pour le chutney'),
    (v_recipe_id, 'jus de citron',              1.5, 'c. à soupe', true,  20, 'pour le chutney'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  21, 'chutney et purée'),
    (v_recipe_id, 'eau',                        1,   'c. à soupe', false, 22, 'si nécessaire, pour le chutney');

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
    'Grosses pommes de terre cuites au micro-ondes, garnies de bœuf haché au gochujang, à l''ail et à la sauce soja, de tomate, d''herbes et de mozzarella fondue. Finition à la crème aigre.',
    $instr$["Préchauffer le four à 220 °C.",
"Piquer chaque pomme de terre 3 ou 4 fois à la fourchette. Les placer dans un bol allant au micro-ondes, couvrir de film et cuire 15 minutes à 1000 W, jusqu'à ce qu'elles soient fondantes.",
"Pendant ce temps, chauffer l'huile dans un wok à feu vif. Étaler le bœuf haché et le saler. Laisser saisir 3 à 4 minutes sans toucher, jusqu'à formation d'une croûte dorée.",
"Retourner le bœuf et l'émietter à la spatule. Cuire 4 à 5 minutes, jusqu'à ce que les jus s'évaporent (la saisie intensifie la saveur).",
"Ajouter l'ail et faire sauter 30 secondes. Baisser à feu moyen-vif, ajouter le gochujang et la sauce soja.",
"Faire sauter jusqu'à ce que le tout soit bien mélangé et le bœuf cuit. Hors du feu, incorporer la tomate, la moitié de la coriandre et la moitié de la ciboulette.",
"Retirer le film des pommes de terre (attention à la vapeur !) et les transférer dans un plat allant au four. Les entailler sur le dessus.",
"Garnir généreusement chaque pomme de terre de bœuf au gochujang et surmonter de mozzarella.",
"Enfourner 10 minutes, jusqu'à ce que le fromage soit fondu et doré.",
"Garnir de crème aigre et du reste de coriandre et de ciboulette ; servir."]
$instr$,
    5, 25, 4, 2,
    'Asiatique', 'dinner',
    ARRAY['gochujang','pomme de terre','bœuf','coréen','fusion','fromage','réconfortant'],
    'manual',
    'https://www.marionskitchen.com/cheesy-gochujang-baked-potatoes/',
    'https://www.marionskitchen.com/wp-content/uploads/2022/05/Gochujang-Baked-Potatoes-01.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pommes de terre',            4,   'unité',      true,  1,  'grosses, lavées'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'bœuf haché',                 500, 'g',          true,  3,  NULL),
    (v_recipe_id, 'sel de mer',                 1,   'c. à café',  true,  4,  'au goût'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  5,  'haché fin'),
    (v_recipe_id, 'gochujang',                  2.5, 'c. à soupe', true,  6,  'pâte de piment coréenne'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'tomate',                     1,   'unité',      true,  8,  'grosse, hachée fin'),
    (v_recipe_id, 'coriandre fraîche',          5,   'g',          true,  9,  'hachée'),
    (v_recipe_id, 'ciboulette',                 10,  'g',          true,  10, 'hachée fin'),
    (v_recipe_id, 'mozzarella râpée',           200, 'g',          true,  11, NULL),
    (v_recipe_id, 'crème aigre',                60,  'g',          false, 12, 'pour servir');

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
    'Bouchées de poulet panées cuites à la friteuse à air, nappées d''une sauce brillante au citron, au gingembre, à l''ail et à la sauce soja. Un classique sino-américain sans bain de friture.',
    $instr$["Mélanger les morceaux de poulet avec la sauce soja claire et l'huile de sésame ; réserver.",
"Sauce au citron : chauffer l'huile d'arachide dans une petite casserole à feu moyen et faire revenir le gingembre en julienne et l'ail 1 minute, jusqu'à ce qu'ils embaument.",
"Ajouter le bouillon de poulet, le jus de citron, le sucre, le vinaigre de cidre et la sauce soja claire ; laisser mijoter 5 minutes.",
"Délayer la fécule dans 1 c. à soupe d'eau et l'incorporer ; laisser mijoter 2 minutes en remuant jusqu'à épaississement. Couvrir et réserver.",
"Mettre la farine et l'œuf battu dans deux assiettes creuses. Par lots, passer le poulet dans la farine, puis dans l'œuf, puis à nouveau dans la farine.",
"Huiler le panier de la friteuse à air. Y placer la moitié du poulet et le vaporiser d'huile.",
"Cuire 10 minutes à 180 °C en remuant à mi-cuisson et en vaporisant à nouveau d'huile, jusqu'à ce que le poulet soit doré et cuit. Réserver dans un bol et répéter avec le reste.",
"Réchauffer la sauce si besoin, la verser sur le poulet et mélanger pour bien enrober. Parsemer d'oignon vert émincé et servir."]
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
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  5,  'battu'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  6,  'en spray de préférence, pour la friteuse à air'),
    (v_recipe_id, 'huile d''arachide',          2,   'c. à café',  true,  7,  'pour la sauce'),
    (v_recipe_id, 'gingembre',                  1,   'c. à soupe', true,  8,  'en julienne'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  9,  'haché fin'),
    (v_recipe_id, 'bouillon de poulet',         130, 'ml',         true,  10, NULL),
    (v_recipe_id, 'jus de citron',              60,  'ml',         true,  11, 'frais'),
    (v_recipe_id, 'sucre',                      50,  'g',          true,  12, NULL),
    (v_recipe_id, 'vinaigre de cidre',          1,   'c. à café',  true,  13, 'pour la sauce'),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à soupe', true,  14, 'pour la sauce'),
    (v_recipe_id, 'fécule de maïs',             3,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'eau',                        1,   'c. à soupe', true,  16, 'pour délayer la fécule'),
    (v_recipe_id, 'oignon vert',                1,   'tige',       false, 17, 'émincé');

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
    'Riz frit ultra-réconfortant au beurre et à l''ail, mêlé d''œufs brouillés et de sauce soja, puis arrosé d''huile à l''ail frit. Saupoudré de parmesan pour une touche umami beurre-fromage.',
    $instr$["Préparer l'huile à l'ail : mettre l'huile et l'ail émincé dans une casserole à feu moyen et cuire jusqu'à ce que l'ail soit doré, puis verser dans un bol.",
"Dans un wok ou une grande poêle, chauffer l'huile végétale et le beurre à feu moyen-vif.",
"Ajouter l'ail haché et cuire 1 minute.",
"Ajouter le riz, la sauce soja et le sucre ; faire sauter jusqu'à ce que le tout soit bien mélangé.",
"Pousser le riz sur un côté et verser les œufs battus de l'autre. Les laisser prendre quelques instants avant de les retourner et de les incorporer au riz.",
"Incorporer l'oignon vert émincé en mélangeant.",
"Répartir dans les assiettes, parsemer de parmesan et arroser d'huile à l'ail."]
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
    (v_recipe_id, 'riz',                        800, 'g',          true,  4,  'cuit, de la veille'),
    (v_recipe_id, 'œufs',                       3,   'unité',      true,  5,  'légèrement battus'),
    (v_recipe_id, 'oignons verts',              60,  'g',          true,  6,  'émincés'),
    (v_recipe_id, 'sauce soja',                 3,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'parmesan râpé',              30,  'g',          false, 9,  'pour servir'),
    (v_recipe_id, 'huile végétale',             60,  'ml',         true,  10, 'pour l''huile à l''ail'),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  11, 'émincé finement, pour l''huile');

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
    'Cuisses de poulet avec la peau, saisies puis mijotées dans une sauce crémeuse à la crème de coco, avec ail, champignons bien dorés et thym. Zeste de citron et ciboulette en finition.',
    $instr$["Émietter le cube de bouillon et le mélanger au sel. En saupoudrer les cuisses, puis poivrer.",
"Chauffer l'huile dans une grande poêle à feu vif. Ajouter les cuisses côté peau et les saisir 5 minutes jusqu'à ce qu'elles soient dorées.",
"Retourner et cuire 2 minutes sur l'autre face ; réserver sur une assiette.",
"Retirer le gras en n'en gardant qu'environ 2 c. à soupe et remettre la poêle à feu moyen-vif. Faire mousser le beurre puis ajouter les champignons et saler.",
"Saisir 2 à 3 minutes sans remuer jusqu'à ce qu'ils soient dorés, puis 3 à 4 minutes en remuant jusqu'à ce qu'ils soient bien caramélisés. Ajouter l'ail et faire sauter 1 minute.",
"Ajouter les feuilles de thym aux champignons et mélanger. Verser la crème de coco.",
"Remettre les cuisses dans la sauce et laisser mijoter 10 minutes, jusqu'à ce qu'elles soient cuites à cœur.",
"Râper le zeste de citron par-dessus, parsemer de ciboulette et servir."]
$instr$,
    10, 30, 4, 2,
    'Asiatique', 'dinner',
    ARRAY['poulet','champignons','crème de coco','one-pan','asiatique','réconfortant','citron'],
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
    (v_recipe_id, 'champignons',                400, 'g',          true,  7,  'en gros morceaux'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  8,  'haché fin'),
    (v_recipe_id, 'thym',                       3,   'branche',    true,  9,  'feuilles'),
    (v_recipe_id, 'crème de coco',              240, 'ml',         true,  10, NULL),
    (v_recipe_id, 'citron',                     1,   'unité',      true,  11, 'zeste'),
    (v_recipe_id, 'ciboulette',                 2,   'c. à soupe', false, 12, 'émincée finement, garniture');

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
    'Poulet frit malaisien très aromatique : marinade pilée de citronnelle, galanga, gingembre, échalote, ail, curcuma et graines torréfiées (fenouil, coriandre, cumin), enrobé d''œuf et de fécule.',
    $instr$["Torréfier les graines de fenouil, de coriandre et de cumin dans une petite poêle 3 minutes en secouant, jusqu'à ce qu'elles embaument.",
"Au mortier, piler les graines en poudre grossière et les transférer dans un grand saladier.",
"Au mortier, piler l'échalote, l'ail, le gingembre, le galanga, la citronnelle et le sel jusqu'à obtenir une pâte grossière. L'ajouter aux épices.",
"Ajouter le curcuma et les morceaux de poulet, mélanger pour bien enrober. Si possible, couvrir et laisser mariner une nuit au réfrigérateur (sinon, passer directement à l'étape suivante).",
"Ajouter l'œuf et la fécule de maïs au poulet et mélanger pour former une pâte qui adhère.",
"Remplir une casserole ou un wok d'huile au tiers et la chauffer à feu moyen jusqu'à 165 °C.",
"Frire les morceaux par lots environ 15 minutes en les retournant, jusqu'à ce qu'ils soient bien dorés et cuits.",
"Égoutter sur une grille garnie de papier absorbant, saler généreusement et servir chaud."]
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
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  5,  'pelées, hachées grossièrement'),
    (v_recipe_id, 'gingembre',                  4,   'cm',         true,  6,  'pelé, en morceaux'),
    (v_recipe_id, 'galanga',                    4,   'cm',         true,  7,  'pelé, en morceaux'),
    (v_recipe_id, 'citronnelle',                1,   'tige',       true,  8,  'partie blanche, hachée grossièrement'),
    (v_recipe_id, 'curcuma',                    1,   'c. à café',  true,  9,  'en poudre'),
    (v_recipe_id, 'sel de mer',                 2,   'c. à café',  true,  10, '+ un peu pour servir'),
    (v_recipe_id, 'morceaux de poulet',         8,   'unité',      true,  11, 'cuisses et pilons'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  12, NULL),
    (v_recipe_id, 'fécule de maïs',             125, 'g',          true,  13, NULL),
    (v_recipe_id, 'huile végétale',             1500,'ml',         true,  14, 'pour la friture');

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
    'Steaks saisis et arrosés de beurre au thym, nappés d''une sauce crémeuse au miso blanc, aux champignons caramélisés, au dashi et à la crème. Finition au zeste de citron et à la ciboulette.',
    $instr$["Sauce : chauffer le bouillon de bœuf dans une petite casserole à feu moyen-vif. Au frémissement, fouetter le miso jusqu'à dissolution ; retirer du feu.",
"Chauffer l'huile dans une grande poêle à feu vif. Étaler les champignons, saler et laisser saisir 2 minutes sans remuer pour bien les colorer.",
"Retourner et saisir 2 à 3 minutes sur l'autre face. Ajouter le beurre, l'ail, l'échalote et le thym, mélanger pour enrober.",
"Verser le bouillon dashi et laisser bouillonner 1 minute. Ajouter le mélange miso-bouillon et la crème, puis laisser mijoter 4 à 5 minutes jusqu'à épaississement.",
"Incorporer le poivre blanc, le zeste de citron et la ciboulette ; éteindre le feu et garder au chaud.",
"Steaks : saler généreusement. Chauffer une autre grande poêle à feu vif avec 1 c. à soupe d'huile et saisir les steaks.",
"Ajouter le beurre et le thym, puis arroser les steaks de beurre fondu en continu. Cuire 2 à 3 minutes par face pour une cuisson saignante. Laisser reposer 2 à 3 minutes.",
"Dresser les steaks et les napper généreusement de sauce miso-champignons."]
$instr$,
    10, 15, 2, 3,
    'Européenne', 'dinner',
    ARRAY['steak','miso','champignons','fusion','crémeux','bœuf','umami'],
    'manual',
    'https://www.marionskitchen.com/steak-creamy-miso-mushroom-sauce/',
    'https://www.marionskitchen.com/wp-content/uploads/2020/04/Steak-Creamy-Miso-Mushroom-Sauce4.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'entrecôtes',                 2,   'unité',      true,  1,  'ou autre pièce de bœuf à griller'),
    (v_recipe_id, 'huile végétale',             1,   'c. à soupe', true,  2,  'pour les steaks'),
    (v_recipe_id, 'beurre',                     25,  'g',          true,  3,  'pour arroser les steaks'),
    (v_recipe_id, 'thym',                       2,   'branche',    true,  4,  'pour les steaks'),
    (v_recipe_id, 'bouillon de bœuf',           180, 'ml',         true,  5,  'pour la sauce'),
    (v_recipe_id, 'miso blanc',                 2,   'c. à soupe', true,  6,  'shiro'),
    (v_recipe_id, 'huile végétale',             2,   'c. à soupe', true,  7,  'pour les champignons'),
    (v_recipe_id, 'champignons mélangés',       400, 'g',          true,  8,  'coupés en deux'),
    (v_recipe_id, 'beurre non salé',            50,  'g',          true,  9,  'pour les champignons'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  10, 'haché fin'),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  11, 'hachée fin'),
    (v_recipe_id, 'thym',                       3,   'branche',    true,  12, 'pour la sauce'),
    (v_recipe_id, 'bouillon dashi',             60,  'ml',         true,  13, 'pour la sauce'),
    (v_recipe_id, 'crème épaisse',              240, 'ml',         true,  14, NULL),
    (v_recipe_id, 'poivre blanc moulu',         0.25,'c. à café',  true,  15, NULL),
    (v_recipe_id, 'citron',                     0.5, 'unité',      true,  16, 'zeste'),
    (v_recipe_id, 'ciboulette',                 2,   'c. à soupe', true,  17, 'hachée fin'),
    (v_recipe_id, 'sel de mer',                 2,   'c. à café',  true,  18, 'au goût');

END $$;
