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
    'Rad Na (Nouilles Sauce Porc)',
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
    'Nouilles de riz larges sautées au wok à feu vif avec brocoli chinois, œuf et viande, glacées d''une sauce soja foncée légèrement sucrée. Classique street-food thaïlandais.',
    $instr$["Mariner la viande tranchée fin avec sauce soja et sucre.",
"Préparer la sauce en combinant sauce huître, sauce soja, sauce de poisson, Golden Mountain et sauce soja noire.",
"Saisir la viande au wok très chaud jusqu'à dorée, réserver.",
"Faire revenir l'ail dans l'huile, ajouter l'œuf et brouiller légèrement.",
"Ajouter le brocoli chinois, puis les nouilles et la sauce ; sauter à feu vif pour enrober.",
"Étaler les nouilles dans le wok et laisser griller 15-30 secondes sans toucher, retourner.",
"Remettre la viande, mélanger brièvement et servir saupoudré de poivre blanc et vinaigre au piment."]
$instr$, 20, 10, 2, 3, 'Thaïlandaise', 'dinner',
    ARRAY['nouilles de riz','wok','pad see ew','street-food','thaïlandais','sauce soja','brocoli chinois'],
    'manual', 'https://hot-thai-kitchen.com/pad-see-ew-new/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2023/04/pad-see-ew-sq-cu.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'protéine au choix',225,'g',true,1,'tranchée fin'),
    (v_recipe_id, 'sauce soja',2,'c. à café',true,2,'marinade'),
    (v_recipe_id, 'sucre',0.25,'c. à café',true,3,'marinade'),
    (v_recipe_id, 'huile végétale',60,'ml',true,4,NULL),
    (v_recipe_id, 'ail',4,'gousse',true,5,'hachée'),
    (v_recipe_id, 'œufs',2,'unité',true,6,'gros'),
    (v_recipe_id, 'brocoli chinois (gai lan)',150,'g',true,7,'tiges tranchées biais'),
    (v_recipe_id, 'nouilles de riz larges fraîches',450,'g',true,8,'ho fun'),
    (v_recipe_id, 'sucre',4,'c. à café',true,9,'pour cuisson'),
    (v_recipe_id, 'poivre blanc',1,'pincée',true,10,'au goût'),
    (v_recipe_id, 'sauce d''huître',30,'ml',true,11,'sauce'),
    (v_recipe_id, 'sauce soja',15,'ml',true,12,'sauce'),
    (v_recipe_id, 'sauce de poisson',7.5,'ml',true,13,'sauce'),
    (v_recipe_id, 'Golden Mountain sauce',7.5,'ml',true,14,'ou Maggi'),
    (v_recipe_id, 'sauce soja noire thaï',10,'ml',true,15,NULL);

  -- 2. Pad Kra Pao Anything
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Pad Kra Pao (Toute Viande)',
    'Sauté thaï emblématique : viande hachée ou en dés sautée avec pâte ail-piment et basilic sacré, servi sur riz jasmin avec œuf au plat. Version polyvalente avec n''importe quelle protéine.',
    $instr$["Couper la protéine en petits morceaux (plus fins que pour un sauté classique).",
"Si la viande est crue, l'enrober de sauce de poisson.",
"Mélanger sauce huître, sauce soja, sauce de poisson, sauce soja noire, sucre et eau.",
"Au mortier, piler piments thaï en pâte puis ajouter ail et piments doux pour une pâte grossière.",
"Saisir la protéine au wok très chaud jusqu'à dorée, réserver.",
"Faire revenir la pâte ail-piment 2 minutes à feu moyen-vif, ajouter oignon 30 sec-1 min.",
"Remettre la protéine et verser la sauce, mélanger 30 secondes.",
"Hors du feu, incorporer le basilic sacré pour juste flétrir.",
"Servir sur riz jasmin avec œuf au plat et prik nam pla."]
$instr$, 20, 10, 2, 2, 'Thaïlandaise', 'dinner',
    ARRAY['pad kra pao','basilic sacré','street-food','thaïlandais','wok','rapide','épicé'],
    'manual', 'https://hot-thai-kitchen.com/pad-kra-pao-anything/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2024/01/pad-gaprao-anything-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'protéine au choix',300,'g',true,1,'cru ou cuit'),
    (v_recipe_id, 'sauce de poisson',1,'c. à café',true,2,'si viande crue'),
    (v_recipe_id, 'sauce d''huître',1,'c. à soupe',true,3,'sauce'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,4,'sauce'),
    (v_recipe_id, 'sauce de poisson',2,'c. à café',true,5,'sauce'),
    (v_recipe_id, 'sauce soja noire',0.5,'c. à café',false,6,'sauce, optionnel'),
    (v_recipe_id, 'eau',2,'c. à soupe',true,7,'sauce'),
    (v_recipe_id, 'sucre',1.5,'c. à café',true,8,'sauce'),
    (v_recipe_id, 'piments thaï',3,'unité',true,9,'au goût'),
    (v_recipe_id, 'ail',5,'gousse',true,10,NULL),
    (v_recipe_id, 'piments rouges doux',60,'g',true,11,'hachés'),
    (v_recipe_id, 'oignon',0.25,'unité',true,12,'en petits dés'),
    (v_recipe_id, 'basilic sacré',1.5,'tasse',true,13,'ou basilic thaï/italien'),
    (v_recipe_id, 'huile végétale',2,'c. à soupe',true,14,NULL),
    (v_recipe_id, 'œufs',2,'unité',false,15,'optionnel, œufs au plat'),
    (v_recipe_id, 'riz jasmin cuit',500,'g',true,16,'pour servir');

  -- 3. Massaman Curry
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Massaman Curry (Hot Thai Kitchen)',
    'Curry thaï d''influence persane : poulet mijoté dans une sauce coco-tamarin-sucre de palme avec pommes de terre, oignons et cacahuètes. Pâte au cumin, coriandre, cardamome et clou de girofle toastés.',
    $instr$["Toaster séparément cumin, coriandre, clous de girofle et cardamome jusqu'à parfumés.",
"Moudre les épices toastées avec cannelle et muscade, puis combiner avec pâte de curry rouge et pâte de crevettes.",
"Saisir les cuisses de poulet côté peau dans la cocotte jusqu'à dorées.",
"Faire bouillir ½ tasse de lait de coco dans la cocotte, ajouter la pâte de massaman et cuire jusqu'à séparation de l'huile.",
"Verser le reste de lait de coco, ajouter sucre de palme, moitié du tamarin, moitié de la sauce de poisson et feuilles de laurier.",
"Remettre le poulet avec ses jus et mijoter 35 minutes à feu doux à couvert partiel.",
"Ajouter pommes de terre, oignons et moitié des cacahuètes ; cuire 10-15 minutes jusqu'à tendres.",
"Ajuster sauce de poisson et tamarin au goût, garnir du reste des cacahuètes et servir sur riz jasmin."]
$instr$, 20, 60, 4, 3, 'Thaïlandaise', 'dinner',
    ARRAY['curry','massaman','poulet','cacahuètes','sucre de palme','tamarin','plat-familial'],
    'manual', 'https://hot-thai-kitchen.com/massaman-curry/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2013/03/2-3.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet avec os',1000,'g',true,1,'avec peau'),
    (v_recipe_id, 'lait de coco',500,'ml',true,2,'divisé'),
    (v_recipe_id, 'pâte de curry massaman',90,'ml',true,3,'maison ou commerciale'),
    (v_recipe_id, 'sucre de palme',36,'g',true,4,'ou cassonade'),
    (v_recipe_id, 'pâte de tamarin',45,'ml',true,5,NULL),
    (v_recipe_id, 'sauce de poisson',45,'ml',true,6,NULL),
    (v_recipe_id, 'feuilles de laurier',2,'unité',false,7,'optionnel'),
    (v_recipe_id, 'pommes de terre Yukon',300,'g',true,8,'en cubes 2,5 cm'),
    (v_recipe_id, 'oignon jaune',0.5,'unité',true,9,'en lanières'),
    (v_recipe_id, 'cacahuètes rôties',35,'g',true,10,'non salées'),
    (v_recipe_id, 'clous de girofle',5,'unité',true,11,'pâte massaman'),
    (v_recipe_id, 'cardamome verte',3,'gousse',true,12,'pâte massaman'),
    (v_recipe_id, 'graines de coriandre',1,'c. à café',true,13,'pâte'),
    (v_recipe_id, 'graines de cumin',1,'c. à café',true,14,'pâte'),
    (v_recipe_id, 'cannelle moulue',1,'c. à café',true,15,'pâte'),
    (v_recipe_id, 'muscade moulue',0.125,'c. à café',true,16,'pâte'),
    (v_recipe_id, 'pâte de curry rouge',75,'ml',true,17,'pour pâte massaman'),
    (v_recipe_id, 'pâte de crevettes fermentées',7.5,'ml',false,18,'optionnel'),
    (v_recipe_id, 'riz jasmin cuit',600,'g',true,19,'pour servir');

  -- 4. Pad Kra Pao Beef
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Pad Kra Pao Bœuf',
    'Version bœuf haché du pad kra pao thaï : sauté épicé au basilic sacré, pâte ail-piment, sauce de poisson et sucre. Servi sur riz jasmin avec œuf au plat et prik nam pla.',
    $instr$["Préparer le prik nam pla : mélanger piments thaï hachés, ail, sauce de poisson et jus de citron vert.",
"Au mortier, piler les piments thaï en pâte fine puis ajouter ail et piments doux pour une pâte grossière.",
"Saisir le bœuf haché au wok très chaud, le défaire à la spatule jusqu'à évaporation des jus.",
"Pousser le bœuf de côté, ajouter un peu d'huile et la pâte ail-piment ; sauter 30 secondes puis mélanger.",
"À feu vif, ajouter moitié du bouillon, sauce de poisson, sucre et poivre ; tossing.",
"Ajouter piments rouges en julienne, sauter 30 secondes (rajouter du bouillon si trop sec).",
"Éteindre le feu, incorporer le basilic juste flétri.",
"Préparer œufs frits thaï (1 par personne) à part.",
"Dresser riz, pad kra pao, œuf au plat ; arroser de prik nam pla."]
$instr$, 15, 10, 3, 2, 'Thaïlandaise', 'dinner',
    ARRAY['pad kra pao','bœuf','basilic sacré','street-food','thaïlandais','épicé','rapide'],
    'manual', 'https://hot-thai-kitchen.com/pad-kra-pao-beef/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2022/10/pad-gaprao-beef-sq-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bœuf haché',340,'g',true,1,'régulier ou maigre'),
    (v_recipe_id, 'ail',6,'gousse',true,2,NULL),
    (v_recipe_id, 'piments thaï',3,'unité',true,3,'au goût'),
    (v_recipe_id, 'piments rouges doux',60,'g',true,4,'hachés'),
    (v_recipe_id, 'piments rouges doux',80,'g',true,5,'en julienne'),
    (v_recipe_id, 'huile végétale',2,'c. à soupe',true,6,NULL),
    (v_recipe_id, 'sauce de poisson',1.5,'c. à soupe',true,7,'+ 2 c. à café'),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,8,NULL),
    (v_recipe_id, 'bouillon de bœuf',120,'ml',true,9,'ou eau'),
    (v_recipe_id, 'poivre noir',0.5,'c. à café',true,10,'moulu'),
    (v_recipe_id, 'basilic sacré',60,'g',true,11,'ou basilic régulier'),
    (v_recipe_id, 'œufs',3,'unité',true,12,'œufs au plat'),
    (v_recipe_id, 'riz jasmin cuit',600,'g',true,13,'pour servir'),
    (v_recipe_id, 'piments thaï',2,'unité',true,14,'prik nam pla'),
    (v_recipe_id, 'sauce de poisson',2,'c. à soupe',true,15,'prik nam pla'),
    (v_recipe_id, 'jus de citron vert',2,'c. à café',true,16,'prik nam pla'),
    (v_recipe_id, 'ail',1,'gousse',false,17,'prik nam pla, optionnel');

  -- 5. Green Curry
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Green Curry au Poulet (Hot Thai Kitchen)',
    'Curry vert thaï classique : pâte de curry vert frite dans le lait de coco séparé, poulet, aubergines thaï, feuilles de combava et basilic thaï. Sucré-salé-épicé équilibré.',
    $instr$["Améliorer la pâte de curry : piler au mortier basilic thaï, krachai et pâte de crevettes avec la pâte de curry vert.",
"Faire bouillir ¾ tasse de lait de coco dans une cocotte, ajouter la pâte et cuire jusqu'à séparation de l'huile (3-5 minutes).",
"Ajouter le poulet en morceaux et enrober de pâte.",
"Verser bouillon de poulet et reste de lait de coco, sucre de palme et 1 c. à soupe de sauce de poisson.",
"Froisser les feuilles de combava et les ajouter, mijoter 10-15 minutes jusqu'à poulet tendre.",
"Ajouter les aubergines thaï en quartiers, cuire 2-3 minutes (ne pas trop cuire).",
"Hors du feu, incorporer poivron rouge et basilic thaï.",
"Ajuster avec plus de sauce de poisson au besoin, servir avec riz jasmin."]
$instr$, 20, 15, 4, 3, 'Thaïlandaise', 'dinner',
    ARRAY['curry vert','poulet','lait de coco','basilic thaï','aubergine','traditionnel','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/green-curry-new-2/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2022/04/Green-curry-chicken-sq-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'lait de coco',420,'ml',true,1,'divisé'),
    (v_recipe_id, 'bouillon de poulet',240,'ml',true,2,NULL),
    (v_recipe_id, 'cuisses de poulet désossées',450,'g',true,3,'en morceaux 2,5 cm'),
    (v_recipe_id, 'sucre de palme',2,'c. à soupe',true,4,'ou cassonade'),
    (v_recipe_id, 'sauce de poisson',1.5,'c. à soupe',true,5,NULL),
    (v_recipe_id, 'feuilles de combava',5,'unité',true,6,'froissées'),
    (v_recipe_id, 'aubergines thaï',225,'g',true,7,'ou pousses de bambou'),
    (v_recipe_id, 'basilic thaï',60,'g',true,8,'feuilles'),
    (v_recipe_id, 'poivron rouge',0.25,'unité',true,9,'julienne'),
    (v_recipe_id, 'pâte de curry vert',45,'ml',true,10,NULL),
    (v_recipe_id, 'krachai',1,'unité',false,11,'fingerroot, optionnel'),
    (v_recipe_id, 'pâte de crevettes fermentées',1,'c. à café',false,12,'optionnel'),
    (v_recipe_id, 'riz jasmin cuit',600,'g',true,13,'pour servir');

  -- 6. Best Pad Thai
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Pad Thai Authentique (Hot Thai Kitchen)',
    'Pad thai classique : nouilles de riz fines sautées avec crevettes, œuf, tofu pressé, daikon mariné sucré, crevettes séchées, sauce tamarin-sucre de palme-sauce de poisson. Cacahuètes, germes de soja, ciboulette à l''ail en finition.',
    $instr$["Caraméliser le sucre de palme dans une casserole, puis verser eau, sauce de poisson et tamarin pour la sauce (le sucre durcit, c'est normal).",
"Tremper les nouilles de riz dans l'eau à température ambiante 1 heure.",
"Couper les nouilles égouttées en deux aux ciseaux pour faciliter le sauté.",
"Saisir les crevettes au wok à feu vif, réserver.",
"Dans le même wok, faire revenir tofu, ail, échalotes, daikon mariné, crevettes séchées et flocons de piment.",
"À feu vif, ajouter nouilles et sauce, tossing jusqu'à absorption.",
"Pousser les nouilles, casser 2 œufs dans l'espace vide, recouvrir 30 sec puis mélanger.",
"Remettre les crevettes, ajouter germes de soja, ciboulette à l'ail et moitié des cacahuètes ; tossing hors feu.",
"Servir avec quartier de citron vert, cacahuètes et germes supplémentaires."]
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
    (v_recipe_id, 'crevettes séchées',2,'c. à soupe',true,6,'hachées grossier'),
    (v_recipe_id, 'ail',3,'gousse',true,7,'haché'),
    (v_recipe_id, 'échalotes',60,'g',true,8,'hachées grossier'),
    (v_recipe_id, 'tofu pressé',85,'g',true,9,'en petits dés'),
    (v_recipe_id, 'daikon mariné sucré',45,'g',true,10,'haché fin'),
    (v_recipe_id, 'flocons de piment',1,'c. à café',false,11,'au goût'),
    (v_recipe_id, 'huile végétale',45,'ml',true,12,NULL),
    (v_recipe_id, 'crevettes',10,'unité',true,13,'taille moyenne'),
    (v_recipe_id, 'œufs',2,'unité',true,14,NULL),
    (v_recipe_id, 'germes de soja',120,'g',true,15,'2 ½ tasses'),
    (v_recipe_id, 'ciboulette à l''ail',70,'g',true,16,'en tronçons 5 cm'),
    (v_recipe_id, 'cacahuètes rôties',35,'g',true,17,'hachées'),
    (v_recipe_id, 'citron vert',1,'unité',true,18,'en quartiers');

  -- 7. Tom Yum Goong
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Tom Yum Goong',
    'Soupe thaï iconique acidulée-épicée : bouillon de crevettes parfumé à la citronnelle, galanga, feuilles de combava et pâte de piment thaï, garni de champignons huîtres et crevettes. Citron vert et coriandre en finition.',
    $instr$["Bouillon de crevettes : faire revenir têtes et carapaces avec un peu d'huile (et optionnellement daikon/oignon), presser les têtes pour libérer le tomalley.",
"Déglacer avec 1 L d'eau, mijoter 5 minutes puis filtrer pour obtenir ~960 ml de bouillon.",
"Ajouter au bouillon la citronnelle écrasée, galanga, piments thaï et champignons huîtres ; froisser les feuilles de combava et les ajouter.",
"Mijoter 5 minutes pour infuser les aromates.",
"Porter à ébullition, diluer la pâte de chili thaï dans une louche de bouillon puis incorporer.",
"Ajouter sauce de poisson et crevettes, cuire ~30-50 secondes puis éteindre (chaleur résiduelle finira).",
"Ajouter le jus de citron vert et ajuster au goût (acide en tête, doux pour équilibrer).",
"Garnir de coriandre fraîche et servir avec riz jasmin."]
$instr$, 20, 10, 4, 3, 'Thaïlandaise', 'lunch',
    ARRAY['tom yum','soupe','crevettes','citronnelle','galanga','acide-épicé','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/tom-yum-goong/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2013/03/tom-yum-goong-blog.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bouillon de crevettes',960,'ml',true,1,'ou bouillon de poulet'),
    (v_recipe_id, 'crevettes',15,'unité',true,2,'tête et carapace, moyennes'),
    (v_recipe_id, 'citronnelle',2,'tige',true,3,'écrasée, en tronçons 5 cm'),
    (v_recipe_id, 'feuilles de combava',6,'unité',true,4,'froissées'),
    (v_recipe_id, 'galanga',8,'tranche',true,5,NULL),
    (v_recipe_id, 'piments thaï',4,'unité',true,6,'au goût, en pâte'),
    (v_recipe_id, 'champignons huîtres',200,'g',true,7,'en bouchées'),
    (v_recipe_id, 'pâte de chili thaï',60,'ml',true,8,'nam prik pao'),
    (v_recipe_id, 'sauce de poisson',3,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'jus de citron vert',120,'ml',true,10,'frais'),
    (v_recipe_id, 'sucre',1,'c. à café',true,11,'équilibre'),
    (v_recipe_id, 'coriandre',2,'c. à soupe',true,12,'hachée, garniture'),
    (v_recipe_id, 'riz jasmin cuit',600,'g',true,13,'pour servir');

  -- 8. Yum Woon Sen
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Yum Woon Sen (Salade de Vermicelles)',
    'Salade thaï acidulée et fraîche : vermicelles de soja avec crevettes, porc haché, tomates, oignon, céleri chinois et cacahuètes. Vinaigrette ail-piment-sucre de palme-citron vert.',
    $instr$["Tremper les vermicelles de soja dans l'eau à température ambiante 7-10 minutes.",
"Vinaigrette : piler tiges de coriandre, ail et piments thaï au mortier, ajouter sucre de palme et fondre. Incorporer sauce de poisson et jus de citron vert.",
"Réhydrater les crevettes séchées à l'eau chaude, égoutter et concasser au mortier.",
"Mettre tomates en quartiers, oignon en julienne et céleri tranché dans un grand bol, ajouter les crevettes séchées.",
"Couper les vermicelles aux ciseaux, les ébouillanter 2 minutes et égoutter (garder l'eau).",
"Pocher les crevettes fraîches 30-45 secondes dans la même eau, ajouter au bol.",
"Dans l'eau restante, cuire le porc avec 1 c. à café de sauce de poisson jusqu'à cuit, transférer au bol avec un peu d'eau de cuisson.",
"Ajouter les vermicelles et la vinaigrette, tossing rapidement.",
"Incorporer feuilles de coriandre, parsemer de cacahuètes et servir immédiatement."]
$instr$, 15, 20, 2, 2, 'Thaïlandaise', 'lunch',
    ARRAY['salade','vermicelles','crevettes','porc','acidulé','citron vert','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/glass-noodle-salad-v2/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2017/01/yum-woon-sen-sq-cu.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'vermicelles de soja',40,'g',true,1,'glass noodles'),
    (v_recipe_id, 'crevettes séchées',1,'c. à soupe',false,2,'optionnel'),
    (v_recipe_id, 'tomate',1,'unité',true,3,'en quartiers'),
    (v_recipe_id, 'oignon',60,'g',true,4,'en julienne'),
    (v_recipe_id, 'céleri chinois',1,'tige',true,5,'tranché fin'),
    (v_recipe_id, 'crevettes',6,'unité',true,6,'décortiquées'),
    (v_recipe_id, 'porc haché',100,'g',true,7,NULL),
    (v_recipe_id, 'sauce de poisson',1,'c. à café',true,8,'pour cuire porc'),
    (v_recipe_id, 'cacahuètes rôties',35,'g',true,9,'hachées'),
    (v_recipe_id, 'coriandre',10,'brin',true,10,'feuilles et tiges'),
    (v_recipe_id, 'ail',2,'gousse',true,11,'vinaigrette'),
    (v_recipe_id, 'piments thaï',2,'unité',true,12,'au goût'),
    (v_recipe_id, 'sucre de palme',1,'c. à soupe',true,13,'haché fin'),
    (v_recipe_id, 'sauce de poisson',2,'c. à soupe',true,14,'vinaigrette'),
    (v_recipe_id, 'jus de citron vert',3,'c. à soupe',true,15,'vinaigrette');

  -- 9. Mango Sticky Rice
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Mango Sticky Rice (Hot Thai Kitchen)',
    'Dessert thaï iconique : riz gluant cuit à la vapeur puis enrobé d''un sirop coco sucré-salé, servi avec mangue mûre tranchée, sauce coco salée et haricots mungo croustillants.',
    $instr$["Laver le riz gluant 4-5 fois jusqu'à eau claire.",
"Tremper le riz dans l'eau ≥4 heures (ou toute la nuit).",
"Préchauffer le cuiseur vapeur, égoutter le riz et l'étaler sur une mousseline dans le panier.",
"Cuire à la vapeur 20-25 minutes jusqu'à cuit (pas croquant au centre).",
"Sirop coco : chauffer lait de coco, sucre et sel jusqu'au frémissement puis couvrir.",
"Une fois le riz cuit, le transférer dans un bol et y verser le sirop chaud, mélanger et couvrir 20 minutes.",
"Retourner le riz du bas vers le haut, laisser reposer 20 minutes supplémentaires.",
"Sauce coco salée : porter à ébullition lait de coco, fécule de riz délayée et sel jusqu'à épaississement.",
"Haricots mungo croustillants : tremper 10 minutes dans eau frémissante, sécher puis griller à sec jusqu'à dorés.",
"Servir : riz, mangue tranchée, sauce coco arrosée et haricots croustillants saupoudrés."]
$instr$, 15, 60, 6, 2, 'Thaïlandaise', 'dessert',
    ARRAY['dessert','mangue','riz gluant','lait de coco','pandan','thaïlandais','sans-gluten'],
    'manual', 'https://hot-thai-kitchen.com/mango-sticky-rice/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2024/05/rainbow-mango-sticky-rice-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'riz gluant blanc',200,'g',true,1,'glutineux'),
    (v_recipe_id, 'lait de coco',160,'ml',true,2,'pour sirop'),
    (v_recipe_id, 'sel',0.5,'c. à café',true,3,'pour sirop'),
    (v_recipe_id, 'sucre',100,'g',true,4,'pour sirop'),
    (v_recipe_id, 'lait de coco',120,'ml',true,5,'pour sauce salée'),
    (v_recipe_id, 'sel',0.25,'c. à café',true,6,'sauce'),
    (v_recipe_id, 'fécule de riz',1,'c. à café',true,7,'sauce'),
    (v_recipe_id, 'eau',1,'c. à soupe',true,8,NULL),
    (v_recipe_id, 'haricots mungo décortiqués',2,'c. à soupe',false,9,'optionnel'),
    (v_recipe_id, 'mangue mûre',3,'unité',true,10,'douce, tranchée');

  -- 10. Panang Curry
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Panang Curry (Hot Thai Kitchen)',
    'Curry thaï riche et concentré : pâte panang réduite dans le lait de coco jusqu''à séparation de l''huile, porc tranché fin, sucre de palme et feuilles de combava julienne. Plus épais qu''un curry rouge.',
    $instr$["Mariner le porc avec sauce de poisson et huile, en séparant les pièces collées.",
"Réduire ¾ tasse de lait de coco dans un wok jusqu'à crémeux et épaissi.",
"Ajouter la pâte panang, baisser à feu moyen-bas et cuire jusqu'à séparation de l'huile.",
"Incorporer sucre de palme et feuilles de combava déchirées, cuire 1 minute pour dissoudre.",
"Ajouter le porc tranché et l'enrober rapidement, jusqu'à ~50% cuit.",
"Verser le reste du lait de coco et remuer 1 minute jusqu'à porc juste cuit (pas plus).",
"Incorporer poivron rouge optionnel et ajuster avec plus de sauce de poisson si besoin.",
"Garnir d'un filet de lait de coco, feuilles de combava julienne et poivron. Servir avec riz jasmin."]
$instr$, 40, 5, 2, 3, 'Thaïlandaise', 'dinner',
    ARRAY['curry','panang','porc','lait de coco','combava','sucre de palme','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/panang-curry/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2013/10/panang-pork-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'pâte de curry panang',60,'ml',true,1,'commerciale ou maison'),
    (v_recipe_id, 'filet de porc',300,'g',true,2,'tranché fin contre le grain'),
    (v_recipe_id, 'sauce de poisson',7.5,'ml',true,3,'+ extra au goût'),
    (v_recipe_id, 'huile neutre',10,'ml',true,4,NULL),
    (v_recipe_id, 'lait de coco',300,'ml',true,5,'+ extra pour garnir'),
    (v_recipe_id, 'feuilles de combava',10,'unité',true,6,'7 déchirées, 3 julienne'),
    (v_recipe_id, 'sucre de palme',18,'g',true,7,'haché fin'),
    (v_recipe_id, 'poivron rouge',0.125,'unité',false,8,'julienne, optionnel'),
    (v_recipe_id, 'riz jasmin cuit',500,'g',true,9,'pour servir');

  -- 11. Rad Na
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Rad Na (Nouilles Sauce Porc)',
    'Nouilles de riz larges grillées au wok puis nappées d''une sauce épaisse au porc mariné, brocoli chinois et pâte de soja fermenté (tao jiew). Plat thaï-chinois ultime de réconfort.',
    $instr$["Mariner le porc en lanières avec sauce soja, huître, sésame, sucre, poivre blanc, fécule de tapioca et blanc d'œuf ≥20 minutes.",
"Préparer le vinaigre au piment : piments tranchés couverts de vinaigre blanc 15 minutes.",
"Mélanger les nouilles larges avec la sauce soja noire pour les teinter.",
"Chauffer un grand wok à feu vif, ajouter l'huile et les nouilles, les étaler pour les laisser griller sans toucher.",
"Retourner pour griller l'autre côté ; réserver une fois légèrement charrées.",
"Dans le wok, faire revenir ail et pâte de soja fermenté jusqu'à doré, puis déglacer avec le bouillon de porc.",
"Ajouter sauce soja, Golden Mountain, sucre, poivre blanc et huile de sésame, porter à ébullition.",
"Délayer la fécule de tapioca dans l'eau, ajouter porc mariné et brocoli chinois au bouillon en ébullition.",
"Verser la moitié du slurry et fouetter pour épaissir ; ajouter plus si besoin pour une sauce nappante.",
"Dresser nouilles dans bols, verser la sauce par-dessus, servir avec vinaigre au piment."]
$instr$, 20, 20, 4, 3, 'Thaïlandaise', 'dinner',
    ARRAY['rad na','nouilles de riz','porc','brocoli chinois','sauce','tao jiew','thaï-chinois'],
    'manual', 'https://hot-thai-kitchen.com/rad-na/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2013/11/rad-na-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'épaule de porc',340,'g',true,1,'tranchée fin'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,2,'marinade'),
    (v_recipe_id, 'sauce d''huître',1,'c. à soupe',true,3,'marinade'),
    (v_recipe_id, 'huile de sésame grillée',1,'c. à café',true,4,'marinade'),
    (v_recipe_id, 'sucre',0.5,'c. à café',true,5,'marinade'),
    (v_recipe_id, 'poivre blanc',0.25,'c. à café',true,6,'marinade'),
    (v_recipe_id, 'fécule de tapioca',2,'c. à soupe',true,7,'marinade'),
    (v_recipe_id, 'blanc d''œuf',1,'unité',true,8,'marinade'),
    (v_recipe_id, 'nouilles de riz larges fraîches',700,'g',true,9,NULL),
    (v_recipe_id, 'sauce soja noire',1,'c. à café',true,10,'pour teinter'),
    (v_recipe_id, 'huile neutre',3,'c. à soupe',true,11,'divisée'),
    (v_recipe_id, 'ail',6,'gousse',true,12,'haché'),
    (v_recipe_id, 'pâte de soja fermenté (tao jiew)',3,'c. à soupe',true,13,NULL),
    (v_recipe_id, 'bouillon de porc',720,'ml',true,14,'non salé'),
    (v_recipe_id, 'sauce soja',1.5,'c. à soupe',true,15,'sauce'),
    (v_recipe_id, 'Golden Mountain sauce',1,'c. à soupe',true,16,NULL),
    (v_recipe_id, 'sucre',1.5,'c. à soupe',true,17,'sauce'),
    (v_recipe_id, 'huile de sésame grillée',1,'c. à café',true,18,'sauce'),
    (v_recipe_id, 'brocoli chinois (gai lan)',200,'g',true,19,'tranché'),
    (v_recipe_id, 'fécule de tapioca',60,'ml',true,20,'pour épaissir'),
    (v_recipe_id, 'eau',60,'ml',true,21,'pour slurry');

  -- 12. Crispy Pad Thai (entrée minimale, pas de JSON-LD)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Crispy Pad Thai',
    'Variante croustillante du pad thaï : nouilles de riz frites à plat jusqu''à formation d''un disque croustillant en bordure, garni de garnitures classiques (crevettes, œuf, tofu, sauce tamarin). Voir source pour méthode complète.',
    $instr$["Préparer la sauce pad thaï classique (tamarin, sucre de palme, sauce de poisson, eau).",
"Hydrater les nouilles de riz selon le paquet, égoutter et réserver.",
"Frire crevettes, tofu pressé, daikon mariné et ail dans un wok bien chaud.",
"Ajouter les nouilles et la sauce, laisser griller au fond pour développer le croustillant en bordure.",
"Brouiller les œufs dans un espace dégagé puis incorporer.",
"Terminer avec germes de soja, ciboulette à l'ail et cacahuètes.",
"Servir avec citron vert."]
$instr$, 30, 15, 2, 3, 'Thaïlandaise', 'dinner',
    ARRAY['pad thaï','crispy','nouilles','crevettes','tamarin','thaïlandais','wok'],
    'manual', 'https://hot-thai-kitchen.com/crispy-pad-thai/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2021/08/Crispy-pad-thai-blog.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'nouilles de riz séchées',115,'g',true,1,'taille moyenne'),
    (v_recipe_id, 'crevettes',10,'unité',true,2,NULL),
    (v_recipe_id, 'œufs',2,'unité',true,3,NULL),
    (v_recipe_id, 'tofu pressé',85,'g',true,4,'en dés'),
    (v_recipe_id, 'daikon mariné',45,'g',true,5,'sucré, haché fin'),
    (v_recipe_id, 'sauce tamarin',60,'ml',true,6,'pâte'),
    (v_recipe_id, 'sucre de palme',35,'g',true,7,NULL),
    (v_recipe_id, 'sauce de poisson',30,'ml',true,8,NULL),
    (v_recipe_id, 'ail',3,'gousse',true,9,'haché'),
    (v_recipe_id, 'germes de soja',120,'g',true,10,NULL),
    (v_recipe_id, 'ciboulette à l''ail',70,'g',true,11,NULL),
    (v_recipe_id, 'cacahuètes',35,'g',true,12,'hachées'),
    (v_recipe_id, 'citron vert',1,'unité',true,13,'quartiers');

  -- 13. Thai KFC Rice Bowl
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Khao Yum Gai Zabb (KFC Thai Rice Bowl)',
    'Inspiration KFC Thaïlande : poulet frit en bouchées doublement frit, enrobé d''une vinaigrette zabb (poudre de riz toasté, citron vert, sauce de poisson, piment) avec oignon rouge et herbes fraîches sur riz jasmin.',
    $instr$["Mariner les cuisses de poulet en cubes avec eau, sucre et sauce de poisson ≥20 minutes.",
"Mélanger la panure : farine, fécule de maïs, paprika, cayenne, ail granulé, poivre blanc et levure chimique.",
"Verser le poulet et sa marinade dans la panure, tossing pour bien enrober.",
"Sortir les morceaux un par un sur un plateau (éviter qu'ils se collent), laisser reposer 15-20 minutes.",
"Poudre de riz toasté : torréfier riz cru et feuilles de combava à sec jusqu'à brun foncé, moudre fin.",
"Vinaigrette liquide : mélanger sauce de poisson, jus de citron vert et sucre.",
"Frire le poulet à 175°C, 2 minutes par lots, égoutter sur grille 5 minutes.",
"Refrire 1 minute à 175°C pour le croustillant final.",
"Par portion, mélanger poulet avec 1 c. à soupe poudre riz, flocons piment, bouillon, vinaigrette, oignon rouge et herbes ; servir sur riz jasmin."]
$instr$, 15, 45, 4, 3, 'Thaïlandaise', 'dinner',
    ARRAY['poulet frit','riz','zabb','laab','citron vert','street-food','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/thai-kfc-rice-bowl/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2025/09/KFC-kao-yum-gai-zabb-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet désossées',450,'g',true,1,'en cubes 2,5 cm'),
    (v_recipe_id, 'sauce de poisson',1,'c. à soupe',true,2,'marinade'),
    (v_recipe_id, 'sucre',1,'c. à café',true,3,'marinade'),
    (v_recipe_id, 'eau',60,'ml',true,4,'marinade'),
    (v_recipe_id, 'huile de friture',1000,'ml',true,5,NULL),
    (v_recipe_id, 'farine',95,'g',true,6,'tout usage'),
    (v_recipe_id, 'fécule de maïs',30,'g',true,7,NULL),
    (v_recipe_id, 'paprika',0.5,'c. à café',true,8,NULL),
    (v_recipe_id, 'piment cayenne',0.5,'c. à café',true,9,NULL),
    (v_recipe_id, 'ail granulé',0.5,'c. à café',true,10,'ou en poudre'),
    (v_recipe_id, 'poivre blanc',0.5,'c. à café',true,11,NULL),
    (v_recipe_id, 'levure chimique',0.5,'c. à café',true,12,NULL),
    (v_recipe_id, 'riz jasmin cru',50,'g',true,13,'pour poudre toastée'),
    (v_recipe_id, 'feuilles de combava',2,'unité',false,14,'pour poudre'),
    (v_recipe_id, 'flocons de piment',2,'c. à café',true,15,'au goût'),
    (v_recipe_id, 'bouillon de poulet en poudre',1,'c. à café',false,16,'optionnel'),
    (v_recipe_id, 'sauce de poisson',2.5,'c. à soupe',true,17,'vinaigrette'),
    (v_recipe_id, 'jus de citron vert',2.5,'c. à soupe',true,18,'vinaigrette'),
    (v_recipe_id, 'sucre',1,'c. à café',true,19,'vinaigrette'),
    (v_recipe_id, 'oignon rouge',0.25,'unité',true,20,'julienne'),
    (v_recipe_id, 'coriandre, menthe, oignons verts',0.5,'tasse',true,21,'hachés'),
    (v_recipe_id, 'riz jasmin cuit',500,'g',true,22,'pour servir');

  -- 14. Wingz Zabb
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Wingz Zabb (Ailes Épicées Thaï)',
    'Ailes de poulet thaï inspirées du KFC Thaïlande : marinade sauce de poisson, panure farine-fécule, frites et enrobées d''une poudre zabb (riz toasté, cayenne, paprika, sucre, sel, poudre de citron vert).',
    $instr$["Trimmer la peau excessive des drumettes et les mélanger à la sauce de poisson, laisser 20 minutes.",
"Toaster riz jasmin cru et feuilles de combava à sec jusqu'à brun foncé.",
"Moudre riz et feuilles avec cayenne, paprika, poudre de citron vert, sucre et sel jusqu'à poudre fine.",
"Mélanger farine et fécule, ajouter aux ailes marinées et tossing.",
"Arroser de 2 c. à soupe d'eau et retossing pour créer une texture craggy.",
"Frire à 190°C en gérant la température entre 165-175°C pendant 6-8 minutes.",
"Égoutter dans un grand bol, saupoudrer de moitié de la poudre zabb et tossing.",
"Frire le second lot, ajouter au premier et saupoudrer du reste de la poudre, bien mélanger.",
"Laisser refroidir quelques minutes avant de servir avec boissons froides."]
$instr$, 10, 40, 3, 3, 'Thaïlandaise', 'snack',
    ARRAY['ailes de poulet','frit','zabb','laab','street-food','thaïlandais','épicé'],
    'manual', 'https://hot-thai-kitchen.com/wingz-zabb/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2023/10/wingz-zabb-sq.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'drumettes de poulet',680,'g',true,1,NULL),
    (v_recipe_id, 'sauce de poisson',2,'c. à soupe',true,2,'marinade'),
    (v_recipe_id, 'riz jasmin cru',1.5,'c. à soupe',true,3,'pour poudre'),
    (v_recipe_id, 'feuilles de combava',2,'unité',false,4,'optionnel'),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,5,'poudre zabb'),
    (v_recipe_id, 'paprika',2.5,'c. à café',true,6,'poudre zabb'),
    (v_recipe_id, 'piment cayenne',2.5,'c. à café',true,7,'au goût'),
    (v_recipe_id, 'poudre de jus de citron vert',1,'c. à café',true,8,'True Lime'),
    (v_recipe_id, 'sel',1.5,'c. à café',true,9,'fin'),
    (v_recipe_id, 'farine',95,'g',true,10,'tout usage'),
    (v_recipe_id, 'fécule de maïs',30,'g',true,11,NULL),
    (v_recipe_id, 'eau',30,'ml',true,12,NULL),
    (v_recipe_id, 'huile de friture',1500,'ml',true,13,NULL);

  -- 15. Laab Burger
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Laab Burger (Epic Thai Burger)',
    'Fusion thaï-burger : galette de bœuf parfumée à la citronnelle, galanga, feuilles de combava et poudre de riz toasté façon laab. Servie avec slaw mentholée acidulée, sriracha et avocat.',
    $instr$["Mélanger bœuf haché avec citronnelle, galanga, feuilles de combava, échalotes, poudre de riz toasté, œuf, sauce de poisson, jus de citron vert et flocons de piment.",
"Former 5 galettes de la taille des pains.",
"Slaw : combiner chou râpé, menthe, coriandre, oignons verts, poudre de riz toasté, flocons de piment, jus de citron vert et sauce de poisson.",
"Griller ou poêler les galettes jusqu'à la cuisson désirée.",
"Tartiner sriracha et avocat écrasé sur le pain inférieur.",
"Empiler galette, oignon rouge, tomate et garnitures.",
"Couronner d'une bonne portion de slaw thaï.",
"Refermer et servir avec slaw supplémentaire à part."]
$instr$, 20, 15, 5, 2, 'Thaïlandaise', 'lunch',
    ARRAY['burger','laab','bœuf','fusion','citronnelle','sriracha','thaïlandais'],
    'manual', 'https://hot-thai-kitchen.com/epic-thai-burger-laab-burger/',
    'https://hot-thai-kitchen.com/wp-content/uploads/2014/08/Thai-up-your-burger-Tiny.png'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bœuf haché',500,'g',true,1,NULL),
    (v_recipe_id, 'citronnelle',3,'c. à soupe',true,2,'hachée fin'),
    (v_recipe_id, 'galanga',2,'c. à soupe',true,3,'haché fin'),
    (v_recipe_id, 'feuilles de combava',3,'unité',true,4,'julienne'),
    (v_recipe_id, 'échalotes',60,'g',true,5,'hachées'),
    (v_recipe_id, 'poudre de riz toasté',2,'c. à soupe',true,6,'galette'),
    (v_recipe_id, 'œuf',1,'unité',true,7,NULL),
    (v_recipe_id, 'sauce de poisson',2.5,'c. à soupe',true,8,'galette'),
    (v_recipe_id, 'jus de citron vert',1,'c. à soupe',true,9,'galette'),
    (v_recipe_id, 'flocons de piment',1,'c. à café',true,10,'au goût'),
    (v_recipe_id, 'chou râpé',200,'g',true,11,'slaw'),
    (v_recipe_id, 'menthe fraîche',1,'tasse',true,12,'hachée'),
    (v_recipe_id, 'coriandre fraîche',0.5,'tasse',true,13,'hachée'),
    (v_recipe_id, 'oignons verts',2,'tige',true,14,'hachés'),
    (v_recipe_id, 'poudre de riz toasté',1,'c. à soupe',true,15,'slaw'),
    (v_recipe_id, 'jus de citron vert',3,'c. à soupe',true,16,'slaw'),
    (v_recipe_id, 'sauce de poisson',1,'c. à soupe',true,17,'slaw'),
    (v_recipe_id, 'sriracha',2,'c. à soupe',true,18,NULL),
    (v_recipe_id, 'avocat écrasé',1,'unité',true,19,NULL),
    (v_recipe_id, 'oignon rouge',1,'unité',true,20,'tranché'),
    (v_recipe_id, 'tomate',1,'unité',true,21,'tranchée'),
    (v_recipe_id, 'pains à burger',5,'unité',true,22,NULL);

END $$;
