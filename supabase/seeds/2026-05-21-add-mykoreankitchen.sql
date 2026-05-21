-- =====================================================================
-- Seed: 9 Korean recipes from mykoreankitchen.com (2026-05-21)
--
-- Sources :
--   1. https://mykoreankitchen.com/korean-style-mala-fried-chicken/
--   2. https://mykoreankitchen.com/korean-curry-rice/
--   3. https://mykoreankitchen.com/rose-tteokbokki/
--   4. https://mykoreankitchen.com/korean-corn-dog/
--   5. https://mykoreankitchen.com/tuna-mayo-rice-bowl/
--   6. https://mykoreankitchen.com/korean-toast/
--   7. https://mykoreankitchen.com/easy-kimbap/
--   8. https://mykoreankitchen.com/kimchi-fried-rice/
--   9. https://mykoreankitchen.com/bibimbap-...-and-assorted-vegetables/
--
-- Anti-collision : "Bibimbap" et "Gilgeori Toast" existent déjà dans
-- d'autres seeds (moribyan, myriadrecipes). Suffixes ajoutés.
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Korean Mala Fried Chicken',
    'Korean Curry Rice (Kare Rice)',
    'Rose Tteokbokki',
    'Korean Corn Dog',
    'Tuna Mayo Rice Bowl (Chamchi Deopbap)',
    'Gilgeori Toast (My Korean Kitchen)',
    'Easy Kimbap (Yachae Kimbap)',
    'Kimchi Bokkeumbap (Kimchi Fried Rice)',
    'Bibimbap (My Korean Kitchen)'
  ];
BEGIN
  DELETE FROM public.recipes WHERE user_id = v_user_id AND name = ANY(v_recipe_names);

  -- 1. Korean Mala Fried Chicken
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Korean Mala Fried Chicken',
    'Poulet frit coréen double-frit nappé d''une sauce mala fusion sino-coréenne : huile infusée au poivre du Sichuan, gochugaru, gochujang, miel et cacahuètes pour un mélange sucré-épicé-engourdissant.',
    $instr$["Détailler les filets en bouchées, les arroser de mirin et réserver pendant la préparation des autres éléments.",
"Chauffer l'huile dans une casserole, y infuser les grains de poivre du Sichuan 3 minutes en remuant jusqu'à parfum intense, puis filtrer en gardant l'huile parfumée.",
"Remettre l'huile dans la casserole avec cacahuètes, gochugaru et flocons de piment, cuire 5 minutes pour une huile chili aromatique.",
"Incorporer miel, sucre roux, ketchup, gochujang, sauce soja, ail et huile de sésame ; poursuivre 5 minutes en mélangeant constamment.",
"Combiner farine, farine de riz, bicarbonate, sel et épices dans un bol ; enrober chaque morceau puis appliquer la fécule de maïs.",
"Chauffer l'huile de friture à 175°C, frire 3 minutes par lots jusqu'à cuisson complète, égoutter sur papier.",
"Réchauffer l'huile, refrire brièvement 1-2 minutes pour la croûte dorée.",
"Verser dans un saladier et napper généreusement de sauce mala en mélangeant délicatement."]
$instr$, 30, 30, 3, 3, 'Coréenne', 'dinner',
    ARRAY['poulet frit','coréen','mala','sichuan','fusion','double-friture','épicé'],
    'manual', 'https://mykoreankitchen.com/korean-style-mala-fried-chicken/',
    'https://mykoreankitchen.com/wp-content/uploads/2024/09/S1.-Mala-Korean-Fried-Chicken.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet désossées',600,'g',true,1,'sans peau'),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',1,'c. à soupe',true,2,'marinade'),
    (v_recipe_id, 'huile de cuisson',60,'ml',true,3,'pour sauce mala'),
    (v_recipe_id, 'poivre du Sichuan',2,'c. à soupe',true,4,'grains entiers'),
    (v_recipe_id, 'flocons de piment',2,'c. à soupe',true,5,'séché'),
    (v_recipe_id, 'cacahuètes',1,'c. à soupe',true,6,NULL),
    (v_recipe_id, 'gochugaru',1,'c. à soupe',true,7,'piment coréen'),
    (v_recipe_id, 'miel',3,'c. à soupe',true,8,NULL),
    (v_recipe_id, 'sucre roux',3,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'ketchup',2,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'gochujang',1,'c. à soupe',true,11,'pâte coréenne'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,12,NULL),
    (v_recipe_id, 'ail',1,'c. à soupe',true,13,'haché fin'),
    (v_recipe_id, 'huile de sésame',0.5,'c. à soupe',true,14,'finition'),
    (v_recipe_id, 'farine',65,'g',true,15,'tout usage'),
    (v_recipe_id, 'farine de riz',35,'g',true,16,NULL),
    (v_recipe_id, 'bicarbonate',0.5,'c. à café',true,17,NULL),
    (v_recipe_id, 'sel',0.5,'c. à café',true,18,NULL),
    (v_recipe_id, 'gingembre en poudre',0.5,'c. à café',true,19,NULL),
    (v_recipe_id, 'ail en poudre',0.5,'c. à café',true,20,NULL),
    (v_recipe_id, 'oignon en poudre',0.5,'c. à café',true,21,NULL),
    (v_recipe_id, 'poivre noir',0.25,'c. à café',true,22,'moulu'),
    (v_recipe_id, 'fécule de maïs',35,'g',true,23,'enrobage final'),
    (v_recipe_id, 'huile végétale',1500,'ml',true,24,'friture');

  -- 2. Korean Curry Rice
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Korean Curry Rice (Kare Rice)',
    'Curry coréen savoureux et légèrement sucré-épicé d''origine japonaise : bœuf mariné, oignons, pommes de terre et carottes mijotés dans une sauce curry coréenne en poudre. Plat réconfortant familial.',
    $instr$["Mariner le bœuf en dés avec le mirin 5 minutes.",
"Dissoudre la poudre de curry coréenne dans 180 ml d'eau jusqu'à lisse.",
"Chauffer l'huile dans une grande cocotte, faire dorer les oignons à feu moyen-vif.",
"Ajouter le bœuf mariné et cuire jusqu'à semi-cuit (légère teinte rose).",
"Incorporer le beurre et mélanger jusqu'à fonte.",
"Ajouter pommes de terre, carottes et 1 litre d'eau, porter à ébullition.",
"Maintenir à ébullition à découvert ~30 minutes en écumant.",
"Verser le mélange curry et remuer ~1 minute jusqu'à épaississement.",
"Servir sur riz vapeur avec kimchi ou radis marinés en accompagnement."]
$instr$, 10, 35, 5, 2, 'Coréenne', 'dinner',
    ARRAY['curry coréen','bœuf','riz','plat-familial','réconfortant','japonais-origine','one-pot'],
    'manual', 'https://mykoreankitchen.com/korean-curry-rice/',
    'https://mykoreankitchen.com/wp-content/uploads/2023/12/S2.-Korean-Curry-Rice-150x150.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bœuf à mijoter',250,'g',true,1,'en dés'),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',15,'ml',true,2,'marinade'),
    (v_recipe_id, 'poudre de curry coréenne',100,'g',true,3,'ingrédient clé'),
    (v_recipe_id, 'eau',180,'ml',true,4,'pour curry'),
    (v_recipe_id, 'huile de cuisson',30,'ml',true,5,NULL),
    (v_recipe_id, 'oignon',200,'g',true,6,'en gros cubes'),
    (v_recipe_id, 'beurre salé',70,'g',true,7,'enrichit la saveur'),
    (v_recipe_id, 'pomme de terre',150,'g',true,8,'en gros cubes'),
    (v_recipe_id, 'carotte',120,'g',true,9,'en gros cubes'),
    (v_recipe_id, 'eau',1000,'ml',true,10,'pour cuisson'),
    (v_recipe_id, 'riz vapeur',600,'g',true,11,'pour servir');

  -- 3. Rose Tteokbokki
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Rose Tteokbokki',
    'Variante crémeuse du tteokbokki : gâteaux de riz enrobés d''une sauce rose au gochujang, crème, lait et fromages fondus. Version moins épicée et plus douce du classique street-food coréen.',
    $instr$["Mélanger gochujang, sucre, sauce soja et gochugaru dans un petit bol, réserver.",
"Chauffer l'huile dans une poêle, faire revenir oignon, chou et oignon vert 3 minutes jusqu'à tendres.",
"Verser la sauce épicée et bien enrober les légumes.",
"Incorporer la crème et le lait progressivement en remuant jusqu'à sauce lisse.",
"Ajouter gâteaux de riz, pâte de poisson et saucisses cocktail, porter à ébullition à feu moyen-vif.",
"Remuer fréquemment 8-10 minutes jusqu'à gâteaux ramollis sans devenir pâteux.",
"Répartir mozzarella et parmesan sur le plat, laisser fondre quelques secondes et servir chaud."]
$instr$, 10, 20, 3, 2, 'Coréenne', 'snack',
    ARRAY['tteokbokki','sauce rosée','gâteaux de riz','street-food','crémeux','fusion','fromage'],
    'manual', 'https://mykoreankitchen.com/rose-tteokbokki/',
    'https://mykoreankitchen.com/wp-content/uploads/2023/04/S1-Rose-Tteokbokki-150x150.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'gochujang',1.5,'c. à soupe',true,1,NULL),
    (v_recipe_id, 'sucre',1.5,'c. à soupe',true,2,'brut'),
    (v_recipe_id, 'sauce soja',1.5,'c. à soupe',true,3,NULL),
    (v_recipe_id, 'gochugaru',1,'c. à café',true,4,'piment coréen'),
    (v_recipe_id, 'crème épaisse',300,'ml',true,5,NULL),
    (v_recipe_id, 'lait entier',100,'ml',true,6,NULL),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,7,NULL),
    (v_recipe_id, 'oignon',50,'g',true,8,'tranché fin'),
    (v_recipe_id, 'chou',30,'g',true,9,'tranché fin'),
    (v_recipe_id, 'oignon vert',15,'g',true,10,'tranché fin'),
    (v_recipe_id, 'gâteaux de riz garaetteok',320,'g',true,11,NULL),
    (v_recipe_id, 'pâte de poisson coréenne',100,'g',true,12,'en morceaux'),
    (v_recipe_id, 'saucisses cocktail',90,'g',true,13,'légèrement scarifiées'),
    (v_recipe_id, 'mozzarella râpée',55,'g',true,14,NULL),
    (v_recipe_id, 'parmesan',1,'c. à soupe',true,15,'râpé');

  -- 4. Korean Corn Dog
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Korean Corn Dog',
    'Saucisses enrobées d''une pâte sucrée-salée à la levure puis de chapelure panko croustillante (parfois avec frites ou ramen brisés en supplément), frites et saupoudrées de sucre.',
    $instr$["Dissoudre sucre, sel et eau tiède dans un bol, mélanger jusqu'à dissolution.",
"Ajouter la levure et laisser reposer quelques minutes puis incorporer les farines progressivement jusqu'à pâte lisse.",
"Couvrir et laisser fermenter à température ambiante 1 heure jusqu'à doublement.",
"Préparer les garnitures optionnelles : couper les frites en morceaux de 1,5 cm ou émietter les ramen sur des assiettes séparées.",
"Chauffer l'huile à 175°C. Enrober les bâtonnets en bois de farine puis y enfiler les saucisses.",
"Tremper chaque saucisse dans la pâte en mouvement circulaire pour un enrobage uniforme.",
"Rouler dans la garniture choisie (frites/ramen) puis immédiatement dans le panko.",
"Frire ~4 minutes en tournant régulièrement jusqu'à doré.",
"Saupoudrer généreusement de sucre blanc, accompagner de ketchup et moutarde."]
$instr$, 10, 20, 4, 3, 'Coréenne', 'snack',
    ARRAY['corn dog','street-food','saucisse','panko','friture','sucré-salé','coréen'],
    'manual', 'https://mykoreankitchen.com/korean-corn-dog/',
    'https://mykoreankitchen.com/wp-content/uploads/2023/03/S1.-Korean-Corn-Dog-150x150.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'sucre',2,'c. à soupe',true,1,'pâte'),
    (v_recipe_id, 'sel',1,'c. à café',true,2,'pâte'),
    (v_recipe_id, 'eau tiède',240,'ml',true,3,'~50°C'),
    (v_recipe_id, 'levure sèche active',1,'c. à café',true,4,NULL),
    (v_recipe_id, 'farine',220,'g',true,5,'tout usage'),
    (v_recipe_id, 'farine de riz gluant',35,'g',true,6,'texture moelleuse'),
    (v_recipe_id, 'saucisses hot dog',4,'unité',true,7,'Francfort'),
    (v_recipe_id, 'farine',2,'c. à soupe',true,8,'enrobage initial bâtonnets'),
    (v_recipe_id, 'chapelure panko',100,'g',true,9,NULL),
    (v_recipe_id, 'frites',280,'g',false,10,'optionnel, en petits morceaux'),
    (v_recipe_id, 'nouilles ramen instantanées',2,'paquet',false,11,'optionnel, émiettées'),
    (v_recipe_id, 'sucre blanc',2,'c. à soupe',true,12,'finition'),
    (v_recipe_id, 'huile végétale',1500,'ml',true,13,'friture'),
    (v_recipe_id, 'ketchup',60,'ml',false,14,'sauce'),
    (v_recipe_id, 'moutarde américaine',30,'ml',false,15,'sauce');

  -- 5. Tuna Mayo Rice Bowl
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Tuna Mayo Rice Bowl (Chamchi Deopbap)',
    'Bol de riz coréen ultra-rapide : thon en boîte mélangé à la mayo, œufs brouillés moelleux et oignons caramélisés sauce soja-mirin sur riz vapeur. Repas étudiant emblématique.',
    $instr$["Mélanger délicatement le thon égoutté avec la mayonnaise, saler et poivrer ; réserver.",
"Chauffer un peu d'huile dans une poêle, verser les œufs battus et brouiller à la fourchette ~2 minutes pour une texture molle et granuleuse.",
"Dans une autre poêle, faire revenir les oignons tranchés jusqu'à tendres, puis ajouter sauce soja, sucre et mirin ; mijoter jusqu'à caramélisation.",
"Disposer le riz chaud dans un bol.",
"Superposer œufs brouillés, oignons caramélisés et mélange thon-mayo.",
"Saupoudrer d'algue séchée ou furikake, ajouter oignons verts.",
"Décorer d'un trait de mayo et de sauce teriyaki au goût."]
$instr$, 10, 10, 2, 2, 'Coréenne', 'lunch',
    ARRAY['thon','mayonnaise','riz','deopbap','rapide','coréen','étudiant'],
    'manual', 'https://mykoreankitchen.com/tuna-mayo-rice-bowl/',
    'https://mykoreankitchen.com/wp-content/uploads/2023/02/S1.-Tuna-Mayo-Rice-Bowl-150x150.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'thon en conserve',185,'g',true,1,'égoutté'),
    (v_recipe_id, 'mayonnaise',60,'ml',true,2,'Kewpie ou coréenne'),
    (v_recipe_id, 'sel',1,'pincée',true,3,'au goût'),
    (v_recipe_id, 'poivre noir',1,'pincée',true,4,NULL),
    (v_recipe_id, 'œufs',4,'unité',true,5,'battus'),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,6,NULL),
    (v_recipe_id, 'riz cuit',500,'ml',true,7,'à sushi'),
    (v_recipe_id, 'oignon',0.5,'unité',true,8,'tranché fin'),
    (v_recipe_id, 'sauce soja',22,'ml',true,9,NULL),
    (v_recipe_id, 'sucre brun',7,'ml',true,10,NULL),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',30,'ml',true,11,NULL),
    (v_recipe_id, 'furikake',2,'c. à café',false,12,'garniture optionnelle');

  -- 6. Korean Toast (Gilgeori)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Gilgeori Toast (My Korean Kitchen)',
    'Sandwich coréen de rue : omelette épaisse chargée de chou, carottes et oignons verts, entre deux tranches de pain beurré et grillé. Touche sucrée (sucre + ketchup) qui surprend délicieusement.',
    $instr$["Mélanger les œufs battus avec chou, carottes et oignon vert ; saler et poivrer généreusement.",
"Chauffer l'huile à feu moyen-doux et cuire l'omelette en galette dorée des deux côtés.",
"Beurrer les tranches de pain et les dorer à feu moyen-doux 1 minute par face.",
"Disposer l'omelette sur une tranche de pain grillé.",
"Ajouter fromage, jambon et autres garnitures selon préférence.",
"Saupoudrer de sucre roux et arroser de ketchup.",
"Couvrir avec la seconde tranche, couper en deux et servir immédiatement."]
$instr$, 5, 10, 1, 2, 'Coréenne', 'breakfast',
    ARRAY['toast','sandwich','street-food','œuf','petit-déjeuner','rapide','coréen'],
    'manual', 'https://mykoreankitchen.com/korean-toast/',
    'https://mykoreankitchen.com/wp-content/uploads/2018/03/5.-Korean-Egg-Toast.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'pain de mie',2,'tranche',true,1,NULL),
    (v_recipe_id, 'œufs',2,'unité',true,2,'battus'),
    (v_recipe_id, 'chou',30,'g',true,3,'tranché fin'),
    (v_recipe_id, 'carottes',15,'g',true,4,'julienne'),
    (v_recipe_id, 'oignon vert',5,'g',true,5,'tranché'),
    (v_recipe_id, 'sel',1,'pincée',true,6,NULL),
    (v_recipe_id, 'poivre noir',1,'pincée',true,7,NULL),
    (v_recipe_id, 'beurre',1,'c. à soupe',true,8,'pour griller'),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,9,'pour omelette'),
    (v_recipe_id, 'ketchup',1,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'sucre roux',1,'c. à café',false,11,'classique'),
    (v_recipe_id, 'dinde fumee',1,'tranche',false,12,'optionnel'),
    (v_recipe_id, 'fromage râpé',2,'c. à soupe',false,13,'optionnel');

  -- 7. Easy Kimbap (Yachae)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Easy Kimbap (Yachae Kimbap)',
    'Rouleau coréen au riz et nori garni d''épinards, carottes, omelette, imitation crabe, jambon, radis jaune mariné (danmuji) et bardane. Pique-nique et lunchbox emblématique.',
    $instr$["Blanchir les épinards 30-60 secondes, refroidir, presser pour éliminer l'eau et assaisonner avec sel et moitié de l'huile de sésame.",
"Cuire une omelette mince dans une poêle huilée, la transférer sur planche et la couper en lanières longues.",
"Faire revenir séparément carottes, bâtonnets de crabe et jambon environ 1 minute chacun à feu moyen.",
"Mélanger le riz cuit avec le reste d'huile de sésame et de sel.",
"Disposer une feuille de nori sur tapis bambou, étaler le riz uniformément sur les 2/3 de la feuille.",
"Disposer en couches : radis mariné, bardane, jambon, crabe, œuf, carotte, épinards.",
"Rouler fermement à l'aide du tapis bambou, humidifier le bord si nécessaire pour sceller.",
"Répéter pour les 3 autres rouleaux.",
"Badigeonner d'huile de sésame, trancher en bouchées et servir avec radis marinés."]
$instr$, 25, 20, 4, 2, 'Coréenne', 'lunch',
    ARRAY['kimbap','riz','nori','rouleau','pique-nique','lunchbox','coréen'],
    'manual', 'https://mykoreankitchen.com/easy-kimbap/',
    'https://mykoreankitchen.com/wp-content/uploads/2006/10/3.-Korean-Kimbap.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'feuilles de nori',4,'unité',true,1,'pour sushi'),
    (v_recipe_id, 'épinards',120,'g',true,2,'frais'),
    (v_recipe_id, 'œufs',2,'unité',true,3,'battus, pour omelette'),
    (v_recipe_id, 'carotte',120,'g',true,4,'juliennée'),
    (v_recipe_id, 'bâtons imitation crabe',3,'unité',true,5,'coupés en 2'),
    (v_recipe_id, 'dinde fumee kimbap',4,'bâton',true,6,'en lanières'),
    (v_recipe_id, 'radis jaune mariné (danmuji)',4,'bâton',true,7,'en lanières'),
    (v_recipe_id, 'bardane assaisonnée',12,'lanière',false,8,'optionnel'),
    (v_recipe_id, 'riz cuit',500,'g',true,9,'grain court'),
    (v_recipe_id, 'huile de sésame',2,'c. à soupe',true,10,'divisée'),
    (v_recipe_id, 'sel',0.5,'c. à café',true,11,NULL);

  -- 8. Kimchi Bokkeumbap
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Kimchi Bokkeumbap (Kimchi Fried Rice)',
    'Riz frit coréen classique : kimchi fermenté sauté avec bacon et jus de kimchi, mélangé au riz blanc, finition huile de sésame et œuf au plat. Confort food rapide.',
    $instr$["Préchauffer un wok à feu moyen-vif avec l'huile bien étalée à la spatule.",
"Faire revenir l'ail 10 secondes, puis ajouter le bacon et remuer jusqu'à semi-cuit.",
"Ajouter le kimchi en remuant constamment jusqu'à ~80% de cuisson.",
"Incorporer les champignons enoki, mélanger quelques secondes ; baisser à feu moyen-bas.",
"Verser le riz et le jus de kimchi, bien mélanger.",
"Ajouter l'huile de sésame et incorporer avant de retirer du feu.",
"Dresser dans des bols, garnir de graines de sésame, oignon vert et algue.",
"Surmonter d'un œuf au plat et servir immédiatement."]
$instr$, 5, 10, 4, 1, 'Coréenne', 'lunch',
    ARRAY['kimchi','riz frit','bacon','wok','rapide','réconfortant','coréen'],
    'manual', 'https://mykoreankitchen.com/kimchi-fried-rice/',
    'https://mykoreankitchen.com/wp-content/uploads/2015/10/1.-Easy-Kimchi-Fried-Rice.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'kimchi',200,'g',true,1,'en petits morceaux'),
    (v_recipe_id, 'beef bacon',150,'g',true,2,'en petits morceaux'),
    (v_recipe_id, 'champignons enoki',200,'g',false,3,'optionnel, racines retirées'),
    (v_recipe_id, 'riz cuit',600,'g',true,4,'grain court'),
    (v_recipe_id, 'œufs',4,'unité',true,5,'pour œufs au plat'),
    (v_recipe_id, 'ail',0.5,'c. à café',true,6,'haché fin'),
    (v_recipe_id, 'jus de kimchi',60,'ml',true,7,'du fond du pot'),
    (v_recipe_id, 'huile de sésame',0.5,'c. à soupe',true,8,NULL),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'graines de sésame',1,'c. à soupe',false,10,'grillées'),
    (v_recipe_id, 'oignon vert',1,'tige',false,11,'tranché fin'),
    (v_recipe_id, 'algue marine assaisonnée',5,'g',false,12,'râpée');

  -- 9. Bibimbap (My Korean Kitchen)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Bibimbap (My Korean Kitchen)',
    'Bol coréen classique : riz blanc surmonté de bœuf haché mariné, légumes assortis cuits individuellement (épinards, germes de soja, carottes, champignons), œuf et sauce gochujang. À mélanger avant de déguster.',
    $instr$["Mélanger le bœuf haché avec sauce soja, huile de sésame, sucre et ail ; mariner 30 minutes.",
"Préparer la sauce bibimbap en mélangeant gochujang, huile de sésame, sucre, eau, graines de sésame et vinaigre.",
"Cuire la viande marinée au wok à feu vif 3-5 minutes jusqu'à cuisson complète.",
"Émincer les carottes en bâtonnets et les faire sauter 2-3 minutes avec un peu de sel.",
"Trancher finement les champignons et les faire revenir 2-3 minutes.",
"Cuire les épinards et germes de soja blanchis assaisonnés selon leur préparation respective.",
"Cuire les œufs au plat (jaune coulant).",
"Dresser le riz dans des bols, disposer la viande, tous les légumes, l'algue nori en lanières et l'œuf par-dessus.",
"Verser la sauce sur le riz, bien mélanger avant de déguster."]
$instr$, 35, 55, 4, 3, 'Coréenne', 'dinner',
    ARRAY['bibimbap','riz','gochujang','légumes','bœuf','coréen','plat-complet'],
    'manual', 'https://mykoreankitchen.com/bibimbap-korean-mixed-rice-with-meat-and-assorted-vegetables/',
    'https://mykoreankitchen.com/wp-content/uploads/2013/07/1.Korean-mixed-rice-Bibimbap.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bœuf haché',100,'g',true,1,'ou en lanières'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,2,'marinade'),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,3,'marinade'),
    (v_recipe_id, 'sucre brun',1,'c. à café',true,4,'marinade'),
    (v_recipe_id, 'ail',0.25,'c. à café',true,5,'haché'),
    (v_recipe_id, 'épinards assaisonnés',250,'g',true,6,NULL),
    (v_recipe_id, 'germes de soja assaisonnés',350,'g',true,7,NULL),
    (v_recipe_id, 'champignons shiitake',100,'g',true,8,NULL),
    (v_recipe_id, 'carotte',120,'g',true,9,'juliennée'),
    (v_recipe_id, 'sel',0.5,'c. à café',true,10,NULL),
    (v_recipe_id, 'riz cuit',600,'g',true,11,'~3 tasses'),
    (v_recipe_id, 'œufs',3,'unité',true,12,'pour œufs au plat'),
    (v_recipe_id, 'gochujang',2,'c. à soupe',true,13,'sauce'),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,14,'sauce'),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,15,'sauce'),
    (v_recipe_id, 'eau',1,'c. à soupe',true,16,'sauce'),
    (v_recipe_id, 'graines de sésame grillées',1,'c. à soupe',true,17,'sauce'),
    (v_recipe_id, 'vinaigre',1,'c. à café',true,18,'sauce'),
    (v_recipe_id, 'algues nori',2,'feuille',false,19,'en lanières'),
    (v_recipe_id, 'huile de cuisson',2,'c. à soupe',true,20,NULL);

END $$;
