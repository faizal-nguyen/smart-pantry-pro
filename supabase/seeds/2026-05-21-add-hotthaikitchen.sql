-- =====================================================================
-- Seed: 15 Thai recipes from hot-thai-kitchen.com (2026-05-21)
--
-- Sources (Node fetch + JSON-LD car WebFetch reçoit 402) :
--    1.  pad-see-ew-new
--    2.  pad-kra-pao-anything
--    3.  massaman-curry
--    4.  pad-kra-pao-beef
--    5.  green-curry-new-2
--    6.  best-pad-thai
--    7.  tom-yum-goong
--    8.  glass-noodle-salad-v2
--    9.  mango-sticky-rice
--   10.  panang-curry
--   11.  rad-na
--   12.  crispy-pad-thai (pas de JSON-LD — entrée minimale)
--   13.  thai-kfc-rice-bowl
--   14.  wingz-zabb
--   15.  epic-thai-burger-laab-burger
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Pad See Ew (Hot Thai Kitchen)',
    'Pad Kra Pao (Toute Viande)',
    'Massaman Curry (Hot Thai Kitchen)',
    'Pad Kra Pao Bœuf',
    'Green Curry au Poulet (Hot Thai Kitchen)',
    'Pad Thai Authentique (Hot Thai Kitchen)',
    'Tom Yum Goong',
    'Yum Woon Sen (Salade de Vermicelles)',
    'Mango Sticky Rice (Hot Thai Kitchen)',
    'Panang Curry (Hot Thai Kitchen)',
    'Rad Na (Nouilles Sauce Bœuf)',
    'Rad Na (Nouilles Sauce Porc)', -- ancien nom, nettoyé si la recette n'a pas encore été migrée
    'Crispy Pad Thai',
    'Khao Yum Gai Zabb (KFC Thai Rice Bowl)',
    'Wingz Zabb (Ailes Épicées Thaï)',
    'Laab Burger (Epic Thai Burger)'
  ];
BEGIN
  DELETE FROM public.recipes WHERE user_id = v_user_id AND name = ANY(v_recipe_names);

  -- 1. Pad See Ew
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Pad See Ew (Hot Thai Kitchen)',
    'Nouilles de riz larges sautées au wok à feu vif avec brocoli chinois, œuf et viande, glacées d''une sauce soja foncée légèrement sucrée. Un grand classique de la street-food thaïlandaise.',
    $instr$["Faire mariner la viande émincée finement avec 2 c. à café de sauce soja et ¼ c. à café de sucre.",
"Préparer la sauce en mélangeant la sauce d'huître, la sauce soja, la sauce de poisson, la sauce d'assaisonnement, la sauce soja noire et 4 c. à café de sucre.",
"Saisir la viande dans un wok très chaud avec un peu d'huile jusqu'à ce qu'elle soit dorée, puis la réserver.",
"Faire revenir l'ail dans le reste de l'huile, ajouter les œufs et les brouiller légèrement.",
"Ajouter le brocoli chinois, puis les nouilles et la sauce ; faire sauter à feu vif pour bien les enrober.",
"Étaler les nouilles dans le wok et les laisser griller 15 à 30 secondes sans y toucher, puis les retourner.",
"Remettre la viande, mélanger brièvement et servir saupoudré de poivre blanc, avec du vinaigre au piment si désiré."]
$instr$, 20, 10, 2, 3, 'Thaïlandaise', 'dinner',
    ARRAY['nouilles de riz','wok','pad see ew','street-food','thaïlandais','sauce soja','brocoli chinois'],
    'manual', 'https://hot-thai-kitchen.com/pad-see-ew-new/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2023/04/pad-see-ew-sq-cu.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'blanc de poulet',225,'g',true,1,'ou bœuf, émincé finement'),
    (v_recipe_id, 'sauce soja',2,'c. à café',true,2,'marinade'),
    (v_recipe_id, 'sucre',0.25,'c. à café',true,3,'marinade'),
    (v_recipe_id, 'huile végétale',60,'ml',true,4,NULL),
    (v_recipe_id, 'ail',4,'gousse',true,5,'haché'),
    (v_recipe_id, 'œufs',2,'unité',true,6,'gros'),
    (v_recipe_id, 'brocoli chinois',150,'g',true,7,'gai lan, tiges tranchées en biais'),
    (v_recipe_id, 'nouilles de riz larges fraîches',450,'g',true,8,'ho fun'),
    (v_recipe_id, 'sucre',4,'c. à café',true,9,'sauce'),
    (v_recipe_id, 'poivre blanc',1,'pincée',true,10,'au goût'),
    (v_recipe_id, 'sauce d''huître',2,'c. à soupe',true,11,'sauce'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,12,'sauce'),
    (v_recipe_id, 'sauce de poisson',1.5,'c. à café',true,13,'sauce'),
    (v_recipe_id, 'sauce d''assaisonnement',1.5,'c. à café',true,14,'type Golden Mountain ou Maggi'),
    (v_recipe_id, 'sauce soja noire',2,'c. à café',true,15,'thaïe');

  -- 2. Pad Kra Pao Anything
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Pad Kra Pao (Toute Viande)',
    'Sauté thaï emblématique : viande hachée ou en dés sautée avec une pâte ail-piment et du basilic sacré, servie sur du riz jasmin avec un œuf au plat. Une version polyvalente qui fonctionne avec n''importe quelle viande.',
    $instr$["Couper la viande en petits morceaux (plus petits que pour un sauté classique).",
"Si la viande est crue, l'enrober de 1 c. à café de sauce de poisson.",
"Mélanger la sauce d'huître, la sauce soja, la sauce de poisson, la sauce soja noire, le sucre et l'eau.",
"Au mortier, piler les piments oiseaux en pâte, puis ajouter l'ail et les piments rouges doux pour obtenir une pâte grossière.",
"Saisir la viande dans un wok très chaud avec un peu d'huile jusqu'à ce qu'elle soit dorée, puis la réserver.",
"Faire revenir la pâte ail-piment 2 minutes à feu moyen-vif dans le reste de l'huile, puis ajouter l'oignon et cuire 30 secondes à 1 minute.",
"Remettre la viande, verser la sauce et mélanger 30 secondes.",
"Hors du feu, incorporer le basilic sacré et le laisser juste flétrir.",
"Servir sur du riz jasmin avec un œuf au plat et, si désiré, du prik nam pla (sauce de poisson pimentée)."]
$instr$, 20, 10, 2, 2, 'Thaïlandaise', 'dinner',
    ARRAY['pad kra pao','basilic sacré','street-food','thaïlandais','wok','rapide','épicé'],
    'manual', 'https://hot-thai-kitchen.com/pad-kra-pao-anything/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2024/01/pad-gaprao-anything-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'blanc de poulet',300,'g',true,1,'ou toute autre viande, crue ou cuite'),
    (v_recipe_id, 'sauce de poisson',1,'c. à café',true,2,'si la viande est crue'),
    (v_recipe_id, 'sauce d''huître',1,'c. à soupe',true,3,'sauce'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,4,'sauce'),
    (v_recipe_id, 'sauce de poisson',2,'c. à café',true,5,'sauce'),
    (v_recipe_id, 'sauce soja noire',0.5,'c. à café',false,6,'sauce, optionnel'),
    (v_recipe_id, 'eau',2,'c. à soupe',true,7,'sauce'),
    (v_recipe_id, 'sucre',1.5,'c. à café',true,8,'sauce'),
    (v_recipe_id, 'piments oiseaux',3,'unité',true,9,'piments thaïs, au goût'),
    (v_recipe_id, 'ail',5,'gousse',true,10,NULL),
    (v_recipe_id, 'piments rouges doux',60,'g',true,11,'hachés'),
    (v_recipe_id, 'oignon',0.25,'unité',true,12,'en petits dés'),
    (v_recipe_id, 'basilic sacré',30,'g',true,13,'ou basilic thaï ou italien'),
    (v_recipe_id, 'huile végétale',2,'c. à soupe',true,14,NULL),
    (v_recipe_id, 'œufs',2,'unité',false,15,'optionnel, pour les œufs au plat'),
    (v_recipe_id, 'riz jasmin cuit',500,'g',true,16,'pour servir');

  -- 3. Massaman Curry
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Massaman Curry (Hot Thai Kitchen)',
    'Curry thaï d''influence persane : poulet mijoté dans une sauce coco, tamarin et sucre de palme avec pommes de terre, oignon et cacahuètes. La pâte est relevée de cumin, coriandre, cardamome et clous de girofle torréfiés.',
    $instr$["Torréfier à sec, séparément, le cumin, la coriandre, les clous de girofle et la cardamome jusqu'à ce qu'ils embaument.",
"Moudre les épices torréfiées avec la cannelle et la muscade, puis les mélanger à la pâte de curry rouge et à la pâte de crevettes : c'est la pâte de massaman.",
"Saisir les cuisses de poulet côté peau dans une cocotte jusqu'à ce qu'elles soient dorées, puis les réserver.",
"Porter à ébullition 120 ml de lait de coco dans la cocotte, ajouter la pâte de massaman et cuire jusqu'à ce que l'huile se sépare.",
"Verser le reste du lait de coco, puis ajouter le sucre de palme, la moitié du tamarin, la moitié de la sauce de poisson et les feuilles de laurier.",
"Remettre le poulet avec son jus et laisser mijoter 35 minutes à feu doux, à couvert partiel.",
"Ajouter les pommes de terre, l'oignon et la moitié des cacahuètes ; cuire 10 à 15 minutes, jusqu'à ce que les pommes de terre soient tendres.",
"Rectifier l'assaisonnement avec le reste de sauce de poisson et de tamarin, parsemer du reste des cacahuètes et servir avec du riz jasmin."]
$instr$, 20, 60, 4, 3, 'Thaïlandaise', 'dinner',
    ARRAY['curry','massaman','poulet','cacahuètes','sucre de palme','tamarin','plat-familial'],
    'manual', 'https://hot-thai-kitchen.com/massaman-curry/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2013/03/2-3.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet',1000,'g',true,1,'avec os et peau'),
    (v_recipe_id, 'lait de coco',500,'ml',true,2,'divisé'),
    (v_recipe_id, 'sucre de palme',36,'g',true,3,'ou cassonade'),
    (v_recipe_id, 'pâte de tamarin',3,'c. à soupe',true,4,'divisée'),
    (v_recipe_id, 'sauce de poisson',3,'c. à soupe',true,5,'divisée'),
    (v_recipe_id, 'feuilles de laurier',2,'unité',false,6,'optionnel'),
    (v_recipe_id, 'pommes de terre',300,'g',true,7,'type Yukon Gold, en cubes de 2,5 cm'),
    (v_recipe_id, 'oignon jaune',0.5,'unité',true,8,'en lanières'),
    (v_recipe_id, 'cacahuètes',35,'g',true,9,'grillées, non salées, divisées'),
    -- Pâte de massaman
    (v_recipe_id, 'clous de girofle',5,'unité',true,10,'pâte de massaman'),
    (v_recipe_id, 'cardamome verte',3,'gousse',true,11,'pâte de massaman'),
    (v_recipe_id, 'graines de coriandre',1,'c. à café',true,12,'pâte de massaman'),
    (v_recipe_id, 'graines de cumin',1,'c. à café',true,13,'pâte de massaman'),
    (v_recipe_id, 'cannelle moulue',1,'c. à café',true,14,'pâte de massaman'),
    (v_recipe_id, 'muscade moulue',0.125,'c. à café',true,15,'pâte de massaman'),
    (v_recipe_id, 'pâte de curry rouge',5,'c. à soupe',true,16,'pâte de massaman ; ou 90 ml de pâte de massaman du commerce à la place de toute la pâte'),
    (v_recipe_id, 'pâte de crevettes',1.5,'c. à café',false,17,'optionnel'),
    (v_recipe_id, 'riz jasmin cuit',600,'g',false,18,'pour servir');

  -- 4. Pad Kra Pao Beef
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Pad Kra Pao Bœuf',
    'Version au bœuf haché du pad kra pao : sauté épicé au basilic sacré, pâte ail-piment, sauce de poisson et sucre. Servi sur du riz jasmin avec un œuf au plat et du prik nam pla.',
    $instr$["Préparer le prik nam pla : mélanger 2 piments oiseaux hachés, la gousse d'ail hachée, 2 c. à soupe de sauce de poisson et le jus de citron vert.",
"Au mortier, piler 3 piments oiseaux en pâte fine, puis ajouter 6 gousses d'ail et les piments rouges doux hachés pour obtenir une pâte grossière.",
"Saisir le bœuf haché dans un wok très chaud en l'émiettant à la spatule, jusqu'à évaporation du jus.",
"Pousser le bœuf sur le côté, ajouter l'huile et la pâte ail-piment ; faire sauter 30 secondes puis mélanger avec le bœuf.",
"À feu vif, ajouter la moitié du bouillon, la sauce de poisson, le sucre et le poivre ; faire sauter en remuant.",
"Ajouter les piments rouges en julienne et faire sauter 30 secondes (rajouter du bouillon si le mélange est trop sec).",
"Éteindre le feu et incorporer le basilic, juste le temps qu'il flétrisse.",
"Préparer à part les œufs au plat à la thaïe (1 par personne).",
"Dresser le riz, le pad kra pao et l'œuf au plat ; arroser de prik nam pla."]
$instr$, 15, 10, 3, 2, 'Thaïlandaise', 'dinner',
    ARRAY['pad kra pao','bœuf','basilic sacré','street-food','thaïlandais','épicé','rapide'],
    'manual', 'https://hot-thai-kitchen.com/pad-kra-pao-beef/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2022/10/pad-gaprao-beef-sq-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bœuf haché',340,'g',true,1,'ordinaire ou maigre'),
    (v_recipe_id, 'ail',6,'gousse',true,2,NULL),
    (v_recipe_id, 'piments oiseaux',3,'unité',true,3,'piments thaïs, au goût'),
    (v_recipe_id, 'piments rouges doux',60,'g',true,4,'hachés'),
    (v_recipe_id, 'piments rouges doux',80,'g',true,5,'en julienne'),
    (v_recipe_id, 'huile végétale',2,'c. à soupe',true,6,NULL),
    (v_recipe_id, 'sauce de poisson',2,'c. à soupe',true,7,'pour le sauté'),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,8,NULL),
    (v_recipe_id, 'bouillon de bœuf',120,'ml',true,9,'ou eau'),
    (v_recipe_id, 'poivre noir',0.5,'c. à café',true,10,'moulu'),
    (v_recipe_id, 'basilic sacré',60,'g',true,11,'ou basilic ordinaire'),
    (v_recipe_id, 'œufs',3,'unité',true,12,'pour les œufs au plat'),
    (v_recipe_id, 'riz jasmin cuit',600,'g',true,13,'pour servir'),
    (v_recipe_id, 'piments oiseaux',2,'unité',true,14,'prik nam pla'),
    (v_recipe_id, 'sauce de poisson',2,'c. à soupe',true,15,'prik nam pla'),
    (v_recipe_id, 'jus de citron vert',2,'c. à café',true,16,'prik nam pla'),
    (v_recipe_id, 'ail',1,'gousse',false,17,'prik nam pla, optionnel');

  -- 5. Green Curry
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Green Curry au Poulet (Hot Thai Kitchen)',
    'Curry vert thaï classique : pâte de curry vert frite dans le lait de coco, poulet, aubergines thaïes, feuilles de combava et basilic thaï. Un équilibre sucré, salé et épicé.',
    $instr$["Relever la pâte de curry : piler au mortier quelques feuilles de basilic thaï, le krachai et la pâte de crevettes avec la pâte de curry vert.",
"Porter à ébullition 180 ml de lait de coco dans une cocotte, ajouter la pâte et cuire 3 à 5 minutes, jusqu'à ce que l'huile se sépare.",
"Ajouter le poulet en morceaux et l'enrober de pâte.",
"Verser le bouillon de poulet, le reste du lait de coco, le sucre de palme et 1 c. à soupe de sauce de poisson.",
"Froisser les feuilles de combava, les ajouter et laisser mijoter 10 à 15 minutes, jusqu'à ce que le poulet soit tendre.",
"Ajouter les aubergines thaïes coupées en quatre et cuire 2 à 3 minutes (sans trop les cuire).",
"Hors du feu, incorporer le poivron rouge et le reste du basilic thaï.",
"Rectifier avec le reste de sauce de poisson si besoin et servir avec du riz jasmin."]
$instr$, 20, 15, 4, 3, 'Thaïlandaise', 'dinner',
    ARRAY['curry vert','poulet','lait de coco','basilic thaï','aubergine','traditionnel','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/green-curry-new-2/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2022/04/Green-curry-chicken-sq-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'lait de coco',420,'ml',true,1,'divisé'),
    (v_recipe_id, 'bouillon de poulet',240,'ml',true,2,NULL),
    (v_recipe_id, 'cuisses de poulet',450,'g',true,3,'désossées, en morceaux de 2,5 cm'),
    (v_recipe_id, 'sucre de palme',2,'c. à soupe',true,4,'ou cassonade'),
    (v_recipe_id, 'sauce de poisson',1.5,'c. à soupe',true,5,'divisée'),
    (v_recipe_id, 'feuilles de combava',5,'unité',true,6,'froissées'),
    (v_recipe_id, 'aubergines thaïes',225,'g',true,7,'ou pousses de bambou'),
    (v_recipe_id, 'basilic thaï',60,'g',true,8,'feuilles'),
    (v_recipe_id, 'poivron rouge',0.25,'unité',true,9,'en julienne'),
    (v_recipe_id, 'pâte de curry vert',3,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'krachai',1,'unité',false,11,'racine de gingembre chinois, optionnel'),
    (v_recipe_id, 'pâte de crevettes',1,'c. à café',false,12,'optionnel'),
    (v_recipe_id, 'riz jasmin cuit',600,'g',false,13,'pour servir');

  -- 6. Best Pad Thai
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Pad Thai Authentique (Hot Thai Kitchen)',
    'Pad thaï classique : nouilles de riz sautées avec crevettes, œuf, tofu, daïkon mariné sucré et crevettes séchées, dans une sauce tamarin, sucre de palme et sauce de poisson. Cacahuètes, germes de soja et ciboulette à l''ail en finition.',
    $instr$["Faire caraméliser le sucre de palme dans une casserole, puis verser l'eau, la sauce de poisson et le tamarin pour obtenir la sauce (le sucre durcit, c'est normal : il se dissout en chauffant).",
"Faire tremper les nouilles de riz 1 heure dans de l'eau à température ambiante.",
"Égoutter les nouilles et les couper en deux aux ciseaux pour les faire sauter plus facilement.",
"Saisir les crevettes dans un wok très chaud avec un peu d'huile, puis les réserver.",
"Dans le même wok, faire revenir avec le reste de l'huile le tofu, l'ail, les échalotes, le daïkon mariné, les crevettes séchées et les flocons de piment.",
"À feu vif, ajouter les nouilles et la sauce ; faire sauter jusqu'à ce que la sauce soit absorbée.",
"Pousser les nouilles sur le côté, casser les 2 œufs dans l'espace libre, les recouvrir de nouilles 30 secondes puis mélanger.",
"Remettre les crevettes, ajouter les germes de soja, la ciboulette à l'ail et la moitié des cacahuètes ; mélanger hors du feu.",
"Servir avec un quartier de citron vert, le reste des cacahuètes et quelques germes de soja."]
$instr$, 30, 10, 2, 3, 'Thaïlandaise', 'dinner',
    ARRAY['pad thaï','nouilles de riz','crevettes','tamarin','cacahuètes','street-food','classique'],
    'manual', 'https://hot-thai-kitchen.com/best-pad-thai/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2019/09/pad-thai-blog.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'sucre de palme',35,'g',true,1,'sauce'),
    (v_recipe_id, 'eau',45,'ml',true,2,'sauce'),
    (v_recipe_id, 'pâte de tamarin',60,'ml',true,3,'sauce'),
    (v_recipe_id, 'sauce de poisson',30,'ml',true,4,'sauce'),
    (v_recipe_id, 'nouilles de riz séchées',115,'g',true,5,'taille moyenne'),
    (v_recipe_id, 'crevettes séchées',2,'c. à soupe',true,6,'hachées grossièrement'),
    (v_recipe_id, 'ail',3,'gousse',true,7,'haché'),
    (v_recipe_id, 'échalotes',60,'g',true,8,'hachées grossièrement'),
    (v_recipe_id, 'tofu ferme',85,'g',true,9,'pressé, en petits dés'),
    (v_recipe_id, 'daïkon mariné',45,'g',true,10,'sucré, haché finement'),
    (v_recipe_id, 'flocons de piment',1,'c. à café',false,11,'au goût'),
    (v_recipe_id, 'huile végétale',45,'ml',true,12,NULL),
    (v_recipe_id, 'crevettes',10,'unité',true,13,'moyennes'),
    (v_recipe_id, 'œufs',2,'unité',true,14,NULL),
    (v_recipe_id, 'germes de soja',120,'g',true,15,'dont un peu pour servir'),
    (v_recipe_id, 'ciboulette à l''ail',70,'g',true,16,'en tronçons de 5 cm'),
    (v_recipe_id, 'cacahuètes',35,'g',true,17,'grillées, hachées'),
    (v_recipe_id, 'citron vert',1,'unité',false,18,'en quartiers, pour servir');

  -- 7. Tom Yum Goong
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Tom Yum Goong',
    'Soupe thaïe iconique, acidulée et épicée : bouillon de crevettes parfumé à la citronnelle, au galanga, aux feuilles de combava et à la pâte de piment thaïe, garni de pleurotes et de crevettes. Citron vert et coriandre en finition.',
    $instr$["Bouillon : décortiquer les crevettes en gardant têtes et carapaces ; faire revenir celles-ci dans l'huile en pressant les têtes pour en extraire le corail.",
"Mouiller avec 1 l d'eau, laisser mijoter 5 minutes puis filtrer pour obtenir environ 960 ml de bouillon.",
"Ajouter au bouillon la citronnelle écrasée, le galanga, les piments écrasés et les pleurotes ; froisser les feuilles de combava et les ajouter.",
"Laisser mijoter 5 minutes pour infuser les aromates.",
"Porter à ébullition, délayer la pâte de piment thaïe dans une louche de bouillon puis l'incorporer.",
"Ajouter la sauce de poisson et les crevettes, cuire 30 à 50 secondes puis éteindre le feu (la chaleur résiduelle termine la cuisson).",
"Ajouter le jus de citron vert et ajuster avec le sucre : l'acidité doit dominer, le sucre sert à l'équilibrer.",
"Parsemer de coriandre fraîche et servir avec du riz jasmin."]
$instr$, 20, 10, 4, 3, 'Thaïlandaise', 'lunch',
    ARRAY['tom yum','soupe','crevettes','citronnelle','galanga','acide-épicé','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/tom-yum-goong/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2013/03/tom-yum-goong-blog.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'crevettes',15,'unité',true,1,'moyennes, avec tête et carapace'),
    (v_recipe_id, 'huile végétale',1,'c. à soupe',true,2,'pour le bouillon'),
    (v_recipe_id, 'eau',1,'l',true,3,'ou 960 ml de bouillon de poulet'),
    (v_recipe_id, 'citronnelle',2,'tige',true,4,'écrasée, en tronçons de 5 cm'),
    (v_recipe_id, 'feuilles de combava',6,'unité',true,5,'froissées'),
    (v_recipe_id, 'galanga',8,'tranche',true,6,NULL),
    (v_recipe_id, 'piments oiseaux',4,'unité',true,7,'piments thaïs, écrasés, au goût'),
    (v_recipe_id, 'pleurotes',200,'g',true,8,'en bouchées'),
    (v_recipe_id, 'pâte de piment thaïe',4,'c. à soupe',true,9,'nam prik pao'),
    (v_recipe_id, 'sauce de poisson',3,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'jus de citron vert',120,'ml',true,11,'frais'),
    (v_recipe_id, 'sucre',1,'c. à café',true,12,'pour équilibrer'),
    (v_recipe_id, 'coriandre fraîche',2,'c. à soupe',false,13,'hachée, pour garnir'),
    (v_recipe_id, 'riz jasmin cuit',600,'g',false,14,'pour servir');

  -- 8. Yum Woon Sen
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Yum Woon Sen (Salade de Vermicelles)',
    'Salade thaïe fraîche et acidulée : vermicelles de soja avec crevettes, bœuf haché, tomate, oignon, céleri chinois et cacahuètes. Vinaigrette à l''ail, au piment, au sucre de palme et au citron vert.',
    $instr$["Faire tremper les vermicelles de soja 7 à 10 minutes dans de l'eau à température ambiante.",
"Vinaigrette : piler au mortier les tiges de coriandre, l'ail et les piments, ajouter le sucre de palme et l'écraser jusqu'à ce qu'il fonde. Incorporer 2 c. à soupe de sauce de poisson et le jus de citron vert.",
"Réhydrater les crevettes séchées dans de l'eau chaude, les égoutter et les concasser au mortier.",
"Mettre la tomate en quartiers, l'oignon émincé et le céleri tranché dans un grand saladier, puis ajouter les crevettes séchées.",
"Couper les vermicelles aux ciseaux, les plonger 2 minutes dans l'eau bouillante et les égoutter en conservant l'eau.",
"Pocher les crevettes 30 à 45 secondes dans la même eau et les ajouter au saladier.",
"Dans un peu de cette eau, cuire le bœuf haché avec 1 c. à café de sauce de poisson, puis le verser dans le saladier avec un peu d'eau de cuisson.",
"Ajouter les vermicelles et la vinaigrette, puis mélanger rapidement.",
"Incorporer les feuilles de coriandre, parsemer de cacahuètes et servir aussitôt."]
$instr$, 15, 20, 2, 2, 'Thaïlandaise', 'lunch',
    ARRAY['salade','vermicelles','crevettes','bœuf','acidulé','citron vert','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/glass-noodle-salad-v2/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2017/01/yum-woon-sen-sq-cu.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'vermicelles de soja',40,'g',true,1,NULL),
    (v_recipe_id, 'crevettes séchées',1,'c. à soupe',false,2,'optionnel'),
    (v_recipe_id, 'tomate',1,'unité',true,3,'en quartiers'),
    (v_recipe_id, 'oignon',60,'g',true,4,'émincé'),
    (v_recipe_id, 'céleri chinois',1,'tige',true,5,'tranché finement'),
    (v_recipe_id, 'crevettes',6,'unité',true,6,'décortiquées'),
    (v_recipe_id, 'bœuf haché',100,'g',true,7,NULL),
    (v_recipe_id, 'sauce de poisson',1,'c. à café',true,8,'pour cuire le bœuf'),
    (v_recipe_id, 'cacahuètes',35,'g',true,9,'grillées, hachées'),
    (v_recipe_id, 'coriandre fraîche',10,'brin',true,10,'feuilles et tiges'),
    (v_recipe_id, 'ail',2,'gousse',true,11,'vinaigrette'),
    (v_recipe_id, 'piments oiseaux',2,'unité',true,12,'piments thaïs, au goût'),
    (v_recipe_id, 'sucre de palme',1,'c. à soupe',true,13,'haché finement'),
    (v_recipe_id, 'sauce de poisson',2,'c. à soupe',true,14,'vinaigrette'),
    (v_recipe_id, 'jus de citron vert',3,'c. à soupe',true,15,'vinaigrette');

  -- 9. Mango Sticky Rice
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Mango Sticky Rice (Hot Thai Kitchen)',
    'Dessert thaï iconique : riz gluant cuit à la vapeur puis enrobé d''un sirop coco sucré-salé, servi avec de la mangue mûre, une sauce coco salée et des haricots mungo croustillants.',
    $instr$["Laver le riz gluant 4 à 5 fois, jusqu'à ce que l'eau soit claire.",
"Le faire tremper au moins 4 heures (ou toute une nuit) dans de l'eau.",
"Préchauffer le cuiseur vapeur, égoutter le riz et l'étaler sur une mousseline dans le panier.",
"Cuire à la vapeur 20 à 25 minutes, jusqu'à ce que le riz soit cuit à cœur.",
"Sirop coco : chauffer le lait de coco, le sucre et le sel jusqu'à frémissement, puis couvrir.",
"Transférer le riz cuit dans un saladier, y verser le sirop chaud, mélanger et couvrir 20 minutes.",
"Retourner le riz du fond vers le dessus et laisser reposer encore 20 minutes.",
"Sauce coco salée : porter à ébullition le lait de coco, le sel et la farine de riz délayée dans l'eau, jusqu'à épaississement.",
"Haricots mungo croustillants : les tremper 10 minutes dans de l'eau frémissante, les sécher puis les faire griller à sec jusqu'à ce qu'ils soient dorés.",
"Servir le riz avec la mangue tranchée, arroser de sauce coco et parsemer de haricots croustillants."]
$instr$, 15, 60, 6, 2, 'Thaïlandaise', 'dessert',
    ARRAY['dessert','mangue','riz gluant','lait de coco','vegan','thaïlandais','sans-gluten'],
    'manual', 'https://hot-thai-kitchen.com/mango-sticky-rice/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2024/05/rainbow-mango-sticky-rice-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'riz gluant',200,'g',true,1,'blanc'),
    (v_recipe_id, 'lait de coco',160,'ml',true,2,'pour le sirop'),
    (v_recipe_id, 'sel',0.5,'c. à café',true,3,'pour le sirop'),
    (v_recipe_id, 'sucre',100,'g',true,4,'pour le sirop'),
    (v_recipe_id, 'lait de coco',120,'ml',true,5,'pour la sauce salée'),
    (v_recipe_id, 'sel',0.25,'c. à café',true,6,'pour la sauce'),
    (v_recipe_id, 'farine de riz',1,'c. à café',true,7,'pour la sauce'),
    (v_recipe_id, 'eau',1,'c. à soupe',true,8,'pour délayer la farine de riz'),
    (v_recipe_id, 'haricots mungo',2,'c. à soupe',false,9,'décortiqués, optionnel'),
    (v_recipe_id, 'mangue',3,'unité',true,10,'bien mûre et sucrée, tranchée');

  -- 10. Panang Curry
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Panang Curry (Hot Thai Kitchen)',
    'Curry thaï riche et concentré : pâte panang réduite dans le lait de coco jusqu''à ce que l''huile se sépare, bœuf tranché finement, sucre de palme et feuilles de combava en julienne. Plus épais qu''un curry rouge.',
    $instr$["Faire mariner le bœuf avec la sauce de poisson et l'huile, en séparant bien les tranches.",
"Faire réduire 180 ml de lait de coco dans un wok jusqu'à ce qu'il soit crémeux et épais.",
"Ajouter la pâte panang, baisser à feu moyen-doux et cuire jusqu'à ce que l'huile se sépare.",
"Incorporer le sucre de palme et 7 feuilles de combava déchirées, cuire 1 minute pour dissoudre le sucre.",
"Ajouter le bœuf et l'enrober rapidement, jusqu'à ce qu'il soit à moitié cuit.",
"Verser le reste du lait de coco et remuer 1 minute, jusqu'à ce que le bœuf soit juste cuit (pas plus).",
"Ajouter le poivron rouge (optionnel) et rectifier avec un peu de sauce de poisson si besoin.",
"Garnir d'un filet de lait de coco, des feuilles de combava restantes en julienne et de poivron. Servir avec du riz jasmin."]
$instr$, 40, 15, 2, 3, 'Thaïlandaise', 'dinner',
    ARRAY['curry','panang','bœuf','lait de coco','combava','sucre de palme','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/panang-curry/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2013/10/panang-pork-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'pâte de curry panang',4,'c. à soupe',true,1,'du commerce ou maison'),
    (v_recipe_id, 'filet de bœuf',300,'g',true,2,'tranché finement contre le grain'),
    (v_recipe_id, 'sauce de poisson',1.5,'c. à café',true,3,'+ un peu au goût'),
    (v_recipe_id, 'huile neutre',2,'c. à café',true,4,NULL),
    (v_recipe_id, 'lait de coco',300,'ml',true,5,'+ un peu pour garnir'),
    (v_recipe_id, 'feuilles de combava',10,'unité',true,6,'7 déchirées, 3 en julienne'),
    (v_recipe_id, 'sucre de palme',18,'g',true,7,'haché finement'),
    (v_recipe_id, 'poivron rouge',0.125,'unité',false,8,'en julienne, optionnel'),
    (v_recipe_id, 'riz jasmin cuit',500,'g',false,9,'pour servir');

  -- 11. Rad Na
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Rad Na (Nouilles Sauce Bœuf)',
    'Nouilles de riz larges grillées au wok, nappées d''une sauce épaisse au bœuf mariné, au brocoli chinois et à la pâte de soja fermenté (tao jiew). Le plat sino-thaï réconfortant par excellence.',
    $instr$["Faire mariner le bœuf en lanières au moins 20 minutes avec la sauce soja, la sauce d'huître, l'huile de sésame, le sucre, le poivre blanc, la fécule de tapioca et le blanc d'œuf.",
"Préparer le vinaigre au piment : couvrir les piments tranchés de vinaigre blanc et laisser reposer 15 minutes.",
"Mélanger les nouilles larges avec la sauce soja noire pour les colorer.",
"Chauffer un grand wok à feu vif, ajouter une partie de l'huile et les nouilles, les étaler et les laisser griller sans y toucher.",
"Les retourner pour griller l'autre face, puis les réserver une fois légèrement caramélisées.",
"Dans le wok, faire revenir l'ail et la pâte de soja fermenté dans le reste de l'huile jusqu'à ce qu'ils dorent, puis mouiller avec le bouillon de bœuf.",
"Ajouter la sauce soja, la sauce d'assaisonnement, le sucre, le poivre blanc et l'huile de sésame ; porter à ébullition.",
"Délayer la fécule de tapioca dans l'eau ; ajouter le bœuf mariné et le brocoli chinois au bouillon bouillant.",
"Verser la moitié de la fécule délayée en fouettant pour épaissir, puis ajouter le reste si besoin pour obtenir une sauce nappante.",
"Répartir les nouilles dans les bols, napper de sauce et servir avec le vinaigre au piment."]
$instr$, 20, 20, 4, 3, 'Thaïlandaise', 'dinner',
    ARRAY['rad na','nouilles de riz','bœuf','brocoli chinois','sauce','tao jiew','thaï-chinois'],
    'manual', 'https://hot-thai-kitchen.com/rad-na/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2013/11/rad-na-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'épaule de bœuf',340,'g',true,1,'en fines lanières'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,2,'marinade'),
    (v_recipe_id, 'sauce d''huître',1,'c. à soupe',true,3,'marinade'),
    (v_recipe_id, 'huile de sésame grillée',1,'c. à café',true,4,'marinade'),
    (v_recipe_id, 'sucre',0.5,'c. à café',true,5,'marinade'),
    (v_recipe_id, 'poivre blanc',0.25,'c. à café',true,6,'marinade'),
    (v_recipe_id, 'fécule de tapioca',2,'c. à soupe',true,7,'marinade'),
    (v_recipe_id, 'blanc d''œuf',1,'unité',true,8,'marinade'),
    (v_recipe_id, 'nouilles de riz larges fraîches',700,'g',true,9,NULL),
    (v_recipe_id, 'sauce soja noire',1,'c. à café',true,10,'pour colorer les nouilles'),
    (v_recipe_id, 'huile neutre',3,'c. à soupe',true,11,'divisée'),
    (v_recipe_id, 'ail',6,'gousse',true,12,'haché'),
    (v_recipe_id, 'pâte de soja fermenté',3,'c. à soupe',true,13,'tao jiew'),
    (v_recipe_id, 'bouillon de bœuf',720,'ml',true,14,'non salé'),
    (v_recipe_id, 'sauce soja',1.5,'c. à soupe',true,15,'sauce'),
    (v_recipe_id, 'sauce d''assaisonnement',1,'c. à soupe',true,16,'type Golden Mountain ou Maggi'),
    (v_recipe_id, 'sucre',1.5,'c. à soupe',true,17,'sauce'),
    (v_recipe_id, 'poivre blanc',1,'pincée',true,18,'sauce'),
    (v_recipe_id, 'huile de sésame grillée',1,'c. à café',true,19,'sauce'),
    (v_recipe_id, 'brocoli chinois',200,'g',true,20,'gai lan, tranché'),
    (v_recipe_id, 'fécule de tapioca',4,'c. à soupe',true,21,'pour épaissir'),
    (v_recipe_id, 'eau',60,'ml',true,22,'pour délayer la fécule'),
    (v_recipe_id, 'vinaigre blanc',60,'ml',false,23,'pour le vinaigre au piment'),
    (v_recipe_id, 'piments oiseaux',3,'unité',false,24,'tranchés, pour le vinaigre au piment');

  -- 12. Crispy Pad Thai (entrée minimale, pas de JSON-LD)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Crispy Pad Thai',
    'Variante croustillante du pad thaï : les nouilles de riz grillent à plat jusqu''à former une galette aux bords croustillants. Garnitures classiques : crevettes, œuf, tofu et sauce tamarin.',
    $instr$["Préparer la sauce pad thaï classique avec la pâte de tamarin, le sucre de palme, la sauce de poisson et l'eau.",
"Réhydrater les nouilles de riz selon les indications du paquet, les égoutter et les réserver.",
"Faire sauter dans l'huile les crevettes, le tofu, le daïkon mariné et l'ail dans un wok bien chaud.",
"Ajouter les nouilles et la sauce, puis les laisser griller au fond du wok pour que les bords deviennent croustillants.",
"Brouiller les œufs dans un espace dégagé du wok, puis les incorporer.",
"Terminer avec les germes de soja, la ciboulette à l'ail et les cacahuètes.",
"Servir avec des quartiers de citron vert."]
$instr$, 30, 15, 2, 3, 'Thaïlandaise', 'dinner',
    ARRAY['pad thaï','crispy','nouilles','crevettes','tamarin','thaïlandais','wok'],
    'manual', 'https://hot-thai-kitchen.com/crispy-pad-thai/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2021/08/Crispy-pad-thai-blog.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'nouilles de riz séchées',115,'g',true,1,'taille moyenne'),
    (v_recipe_id, 'crevettes',10,'unité',true,2,NULL),
    (v_recipe_id, 'œufs',2,'unité',true,3,NULL),
    (v_recipe_id, 'tofu ferme',85,'g',true,4,'pressé, en dés'),
    (v_recipe_id, 'daïkon mariné',45,'g',true,5,'sucré, haché finement'),
    (v_recipe_id, 'pâte de tamarin',60,'ml',true,6,NULL),
    (v_recipe_id, 'sucre de palme',35,'g',true,7,NULL),
    (v_recipe_id, 'sauce de poisson',30,'ml',true,8,NULL),
    (v_recipe_id, 'eau',45,'ml',true,9,'pour la sauce'),
    (v_recipe_id, 'huile végétale',4,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'ail',3,'gousse',true,11,'haché'),
    (v_recipe_id, 'germes de soja',120,'g',true,12,NULL),
    (v_recipe_id, 'ciboulette à l''ail',70,'g',true,13,NULL),
    (v_recipe_id, 'cacahuètes',35,'g',true,14,'grillées, hachées'),
    (v_recipe_id, 'citron vert',1,'unité',false,15,'en quartiers, pour servir');

  -- 13. Thai KFC Rice Bowl
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Khao Yum Gai Zabb (KFC Thai Rice Bowl)',
    'Inspiré du KFC thaïlandais : bouchées de poulet frites deux fois, enrobées d''une vinaigrette zabb (poudre de riz grillé, citron vert, sauce de poisson, piment) avec oignon rouge et herbes fraîches, sur du riz jasmin.',
    $instr$["Faire mariner les cubes de poulet au moins 20 minutes avec l'eau, le sucre et la sauce de poisson.",
"Mélanger la panure : farine, fécule de maïs, paprika, piment de Cayenne, ail en poudre, poivre blanc et levure chimique.",
"Verser le poulet et sa marinade dans la panure et remuer pour bien l'enrober.",
"Disposer les morceaux un par un sur un plateau (pour qu'ils ne collent pas) et laisser reposer 15 à 20 minutes.",
"Poudre de riz grillé : torréfier à sec le riz cru et les feuilles de combava jusqu'à ce qu'ils soient brun foncé, puis moudre finement.",
"Vinaigrette : mélanger la sauce de poisson, le jus de citron vert et le sucre.",
"Chauffer l'huile à 175°C et frire le poulet par fournées pendant 2 minutes ; égoutter 5 minutes sur une grille.",
"Frire à nouveau 1 minute à 175°C pour un croustillant parfait.",
"Pour chaque portion, mélanger le poulet avec 1 c. à soupe de poudre de riz, des flocons de piment, le bouillon en poudre, la vinaigrette, l'oignon rouge et les herbes ; servir sur du riz jasmin."]
$instr$, 15, 45, 4, 3, 'Thaïlandaise', 'dinner',
    ARRAY['poulet frit','riz','zabb','laab','citron vert','street-food','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/thai-kfc-rice-bowl/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2025/09/KFC-kao-yum-gai-zabb-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet',450,'g',true,1,'désossées, en cubes de 2,5 cm'),
    (v_recipe_id, 'sauce de poisson',1,'c. à soupe',true,2,'marinade'),
    (v_recipe_id, 'sucre',1,'c. à café',true,3,'marinade'),
    (v_recipe_id, 'eau',60,'ml',true,4,'marinade'),
    (v_recipe_id, 'huile végétale',1,'l',true,5,'pour la friture'),
    (v_recipe_id, 'farine',95,'g',true,6,'de blé, tout usage'),
    (v_recipe_id, 'fécule de maïs',30,'g',true,7,NULL),
    (v_recipe_id, 'paprika',0.5,'c. à café',true,8,NULL),
    (v_recipe_id, 'piment de Cayenne',0.5,'c. à café',true,9,NULL),
    (v_recipe_id, 'ail en poudre',0.5,'c. à café',true,10,'ou ail granulé'),
    (v_recipe_id, 'poivre blanc',0.5,'c. à café',true,11,NULL),
    (v_recipe_id, 'levure chimique',0.5,'c. à café',true,12,NULL),
    (v_recipe_id, 'riz jasmin',50,'g',true,13,'cru, pour la poudre de riz grillé'),
    (v_recipe_id, 'feuilles de combava',2,'unité',false,14,'pour la poudre'),
    (v_recipe_id, 'flocons de piment',2,'c. à café',true,15,'au goût'),
    (v_recipe_id, 'bouillon de poulet en poudre',1,'c. à café',false,16,'optionnel'),
    (v_recipe_id, 'sauce de poisson',2.5,'c. à soupe',true,17,'vinaigrette'),
    (v_recipe_id, 'jus de citron vert',2.5,'c. à soupe',true,18,'vinaigrette'),
    (v_recipe_id, 'sucre',1,'c. à café',true,19,'vinaigrette'),
    (v_recipe_id, 'oignon rouge',0.25,'unité',true,20,'émincé'),
    (v_recipe_id, 'coriandre fraîche',3,'c. à soupe',true,21,'hachée'),
    (v_recipe_id, 'menthe fraîche',3,'c. à soupe',true,22,'hachée'),
    (v_recipe_id, 'oignons verts',2,'tige',true,23,'hachés'),
    (v_recipe_id, 'riz jasmin cuit',500,'g',true,24,'pour servir');

  -- 14. Wingz Zabb
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Wingz Zabb (Ailes Épicées Thaï)',
    'Ailes de poulet inspirées du KFC thaïlandais : marinées à la sauce de poisson, panées farine-fécule, frites puis enrobées d''une poudre zabb (riz grillé, piment de Cayenne, paprika, sucre, sel, citron vert en poudre).',
    $instr$["Retirer l'excédent de peau des ailes, les mélanger à la sauce de poisson et laisser reposer 20 minutes.",
"Torréfier à sec le riz cru et les feuilles de combava jusqu'à ce qu'ils soient brun foncé.",
"Moudre le riz et les feuilles avec le piment de Cayenne, le paprika, la poudre de citron vert, le sucre et le sel jusqu'à obtenir une poudre fine.",
"Mélanger la farine et la fécule, les ajouter aux ailes marinées et bien remuer.",
"Arroser de 2 c. à soupe d'eau et remuer à nouveau pour obtenir une panure irrégulière et croustillante.",
"Chauffer l'huile à 190°C, y plonger la moitié des ailes et frire 6 à 8 minutes en maintenant la température entre 165 et 175°C.",
"Égoutter dans un grand saladier, saupoudrer de la moitié de la poudre zabb et mélanger.",
"Frire la seconde fournée, l'ajouter à la première, saupoudrer du reste de la poudre et bien mélanger.",
"Laisser tiédir quelques minutes avant de servir, idéalement avec des boissons fraîches."]
$instr$, 10, 40, 3, 3, 'Thaïlandaise', 'snack',
    ARRAY['ailes de poulet','frit','zabb','laab','street-food','thaïlandais','épicé'],
    'manual', 'https://hot-thai-kitchen.com/wingz-zabb/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2023/10/wingz-zabb-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'ailes de poulet',680,'g',true,1,'manchons (drumettes) de préférence'),
    (v_recipe_id, 'sauce de poisson',2,'c. à soupe',true,2,'marinade'),
    (v_recipe_id, 'riz jasmin',1.5,'c. à soupe',true,3,'cru, pour la poudre'),
    (v_recipe_id, 'feuilles de combava',2,'unité',false,4,'optionnel'),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,5,'poudre zabb'),
    (v_recipe_id, 'paprika',2.5,'c. à café',true,6,'poudre zabb'),
    (v_recipe_id, 'piment de Cayenne',2.5,'c. à café',true,7,'au goût'),
    (v_recipe_id, 'poudre de citron vert',1,'c. à café',true,8,'type True Lime'),
    (v_recipe_id, 'sel',1.5,'c. à café',true,9,'fin'),
    (v_recipe_id, 'farine',95,'g',true,10,'de blé, tout usage'),
    (v_recipe_id, 'fécule de maïs',30,'g',true,11,NULL),
    (v_recipe_id, 'eau',2,'c. à soupe',true,12,NULL),
    (v_recipe_id, 'huile végétale',1.5,'l',true,13,'pour la friture');

  -- 15. Laab Burger
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Laab Burger (Epic Thai Burger)',
    'Burger fusion thaï : galette de bœuf parfumée à la citronnelle, au galanga, aux feuilles de combava et à la poudre de riz grillé façon laab. Servie avec une salade de chou acidulée à la menthe, de la sriracha et de l''avocat.',
    $instr$["Mélanger le bœuf haché avec la citronnelle, le galanga, les feuilles de combava, les échalotes, la poudre de riz grillé, l'œuf, la sauce de poisson, le jus de citron vert et une partie des flocons de piment.",
"Former 5 galettes de la taille des pains.",
"Salade de chou : mélanger le chou râpé, la menthe, la coriandre, les oignons verts, la poudre de riz grillé, le reste des flocons de piment, le jus de citron vert et la sauce de poisson.",
"Griller ou poêler les galettes jusqu'à la cuisson désirée.",
"Tartiner la base de chaque pain de sriracha et d'avocat écrasé.",
"Empiler la galette, l'oignon rouge et la tomate.",
"Couronner d'une bonne portion de salade de chou thaïe.",
"Refermer et servir avec le reste de salade de chou à part."]
$instr$, 20, 15, 5, 2, 'Thaïlandaise', 'lunch',
    ARRAY['burger','laab','bœuf','fusion','citronnelle','sriracha','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/epic-thai-burger-laab-burger/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2014/08/Thai-up-your-burger-Tiny.png'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bœuf haché',500,'g',true,1,NULL),
    (v_recipe_id, 'citronnelle',3,'c. à soupe',true,2,'hachée finement'),
    (v_recipe_id, 'galanga',2,'c. à soupe',true,3,'haché finement'),
    (v_recipe_id, 'feuilles de combava',3,'unité',true,4,'en fine julienne'),
    (v_recipe_id, 'échalotes',60,'g',true,5,'hachées'),
    (v_recipe_id, 'poudre de riz grillé',2,'c. à soupe',true,6,'khao khua, pour les galettes'),
    (v_recipe_id, 'œuf',1,'unité',true,7,NULL),
    (v_recipe_id, 'sauce de poisson',2.5,'c. à soupe',true,8,'pour les galettes'),
    (v_recipe_id, 'jus de citron vert',1,'c. à soupe',true,9,'pour les galettes'),
    (v_recipe_id, 'flocons de piment',1,'c. à café',true,10,'au goût, pour les galettes et la salade'),
    (v_recipe_id, 'chou blanc',200,'g',true,11,'râpé, pour la salade'),
    (v_recipe_id, 'menthe fraîche',20,'g',true,12,'hachée'),
    (v_recipe_id, 'coriandre fraîche',10,'g',true,13,'hachée'),
    (v_recipe_id, 'oignons verts',2,'tige',true,14,'hachés'),
    (v_recipe_id, 'poudre de riz grillé',1,'c. à soupe',true,15,'pour la salade'),
    (v_recipe_id, 'jus de citron vert',3,'c. à soupe',true,16,'pour la salade'),
    (v_recipe_id, 'sauce de poisson',1,'c. à soupe',true,17,'pour la salade'),
    (v_recipe_id, 'sriracha',2,'c. à soupe',true,18,NULL),
    (v_recipe_id, 'avocat',1,'unité',true,19,'écrasé'),
    (v_recipe_id, 'oignon rouge',1,'unité',true,20,'tranché'),
    (v_recipe_id, 'tomate',1,'unité',true,21,'tranchée'),
    (v_recipe_id, 'pains à burger',5,'unité',true,22,NULL);

END $$;
