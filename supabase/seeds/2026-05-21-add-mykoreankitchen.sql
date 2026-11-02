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
    'Poulet frit coréen, frit deux fois et nappé d''une sauce mala sino-coréenne : huile infusée au poivre du Sichuan, gochugaru, gochujang, miel et cacahuètes, pour un équilibre sucré, épicé et légèrement anesthésiant.',
    $instr$["Couper les cuisses en bouchées, les arroser du vinaigre de riz, du sucre et de l'eau de la marinade et réserver pendant la préparation des autres éléments.",
"Chauffer l'huile dans une casserole et y faire infuser les grains de poivre du Sichuan 3 minutes en remuant, jusqu'à ce qu'ils embaument, puis filtrer en gardant l'huile parfumée.",
"Remettre l'huile dans la casserole avec les cacahuètes, le gochugaru et les flocons de piment, et cuire 5 minutes pour obtenir une huile pimentée aromatique.",
"Incorporer le miel, le sucre roux, le ketchup, le gochujang, la sauce soja, l'ail et l'huile de sésame ; poursuivre 5 minutes en remuant constamment.",
"Mélanger la farine, la farine de riz, le bicarbonate, le sel et les épices dans un bol ; en enrober chaque morceau, puis appliquer la fécule de maïs.",
"Chauffer l'huile de friture à 175 °C et frire par lots 3 minutes, jusqu'à cuisson complète ; égoutter sur du papier absorbant.",
"Réchauffer l'huile et refrire 1 à 2 minutes pour obtenir une croûte dorée.",
"Verser dans un saladier et napper généreusement de sauce mala en mélangeant délicatement."]
$instr$, 30, 30, 3, 3, 'Coréenne', 'dinner',
    ARRAY['poulet frit','coréen','mala','sichuan','fusion','double-friture','épicé'],
    'manual', 'https://mykoreankitchen.com/korean-style-mala-fried-chicken/',
    'https://mykoreankitchen.com/wp-content/uploads/2024/09/S1.-Mala-Korean-Fried-Chicken.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet désossées',600,'g',true,1,'sans peau'),
    (v_recipe_id, 'vinaigre de riz',1.25,'c. à café',true,2,'marinade'),
    (v_recipe_id, 'sucre',0.5,'c. à café',true,3,'marinade'),
    (v_recipe_id, 'eau',1.25,'c. à café',true,4,'marinade'),
    (v_recipe_id, 'huile de cuisson',60,'ml',true,5,'pour la sauce mala'),
    (v_recipe_id, 'poivre du Sichuan',2,'c. à soupe',true,6,'grains entiers'),
    (v_recipe_id, 'flocons de piment',2,'c. à soupe',true,7,'séchés'),
    (v_recipe_id, 'cacahuètes',1,'c. à soupe',true,8,NULL),
    (v_recipe_id, 'gochugaru',1,'c. à soupe',true,9,'piment coréen'),
    (v_recipe_id, 'miel',3,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'sucre roux',3,'c. à soupe',true,11,NULL),
    (v_recipe_id, 'ketchup',2,'c. à soupe',true,12,NULL),
    (v_recipe_id, 'gochujang',1,'c. à soupe',true,13,'pâte de piment coréenne'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,14,NULL),
    (v_recipe_id, 'ail',1,'c. à soupe',true,15,'haché fin'),
    (v_recipe_id, 'huile de sésame',0.5,'c. à soupe',true,16,'finition'),
    (v_recipe_id, 'farine',65,'g',true,17,'tout usage'),
    (v_recipe_id, 'farine de riz',35,'g',true,18,NULL),
    (v_recipe_id, 'bicarbonate de soude',0.5,'c. à café',true,19,NULL),
    (v_recipe_id, 'sel',0.5,'c. à café',true,20,NULL),
    (v_recipe_id, 'gingembre en poudre',0.5,'c. à café',true,21,NULL),
    (v_recipe_id, 'ail en poudre',0.5,'c. à café',true,22,NULL),
    (v_recipe_id, 'oignon en poudre',0.5,'c. à café',true,23,NULL),
    (v_recipe_id, 'poivre noir',0.25,'c. à café',true,24,'moulu'),
    (v_recipe_id, 'fécule de maïs',35,'g',true,25,'enrobage final'),
    (v_recipe_id, 'huile végétale',1500,'ml',true,26,'pour la friture');

  -- 2. Korean Curry Rice
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Korean Curry Rice (Kare Rice)',
    'Curry coréen d''origine japonaise, savoureux et légèrement sucré-épicé : bœuf mariné, oignons, pommes de terre et carottes mijotés dans une sauce à la poudre de curry coréenne. Un plat familial réconfortant.',
    $instr$["Mariner le bœuf en dés 5 minutes avec le vinaigre de riz, le sucre et l'eau de la marinade.",
"Délayer la poudre de curry coréenne dans 180 ml d'eau jusqu'à ce que le mélange soit lisse.",
"Chauffer l'huile dans une grande cocotte et faire dorer l'oignon à feu moyen-vif.",
"Ajouter le bœuf mariné et cuire jusqu'à ce qu'il soit à moitié cuit (encore légèrement rosé).",
"Incorporer le beurre et mélanger jusqu'à ce qu'il fonde.",
"Ajouter les pommes de terre, les carottes et 1 litre d'eau, puis porter à ébullition.",
"Laisser bouillir à découvert environ 30 minutes en écumant.",
"Verser le mélange au curry et remuer environ 1 minute, jusqu'à épaississement.",
"Servir sur du riz, avec du kimchi en accompagnement si désiré."]
$instr$, 10, 35, 5, 2, 'Coréenne', 'dinner',
    ARRAY['curry coréen','bœuf','riz','plat-familial','réconfortant','japonais-origine','one-pot'],
    'manual', 'https://mykoreankitchen.com/korean-curry-rice/',
    'https://mykoreankitchen.com/wp-content/uploads/2023/12/S2.-Korean-Curry-Rice-150x150.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bœuf à mijoter',250,'g',true,1,'en dés'),
    (v_recipe_id, 'vinaigre de riz',1.25,'c. à café',true,2,'marinade'),
    (v_recipe_id, 'sucre',0.5,'c. à café',true,3,'marinade'),
    (v_recipe_id, 'eau',1.25,'c. à café',true,4,'marinade'),
    (v_recipe_id, 'poudre de curry coréenne',100,'g',true,5,'ingrédient clé'),
    (v_recipe_id, 'eau',180,'ml',true,6,'pour délayer le curry'),
    (v_recipe_id, 'huile de cuisson',30,'ml',true,7,NULL),
    (v_recipe_id, 'oignon',200,'g',true,8,'en gros cubes'),
    (v_recipe_id, 'beurre salé',70,'g',true,9,'enrichit la saveur'),
    (v_recipe_id, 'pomme de terre',150,'g',true,10,'en gros cubes'),
    (v_recipe_id, 'carotte',120,'g',true,11,'en gros cubes'),
    (v_recipe_id, 'eau',1000,'ml',true,12,'pour la cuisson'),
    (v_recipe_id, 'riz',600,'g',true,13,'cuit, pour servir'),
    (v_recipe_id, 'kimchi',100,'g',false,14,'pour servir, optionnel');

  -- 3. Rose Tteokbokki
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Rose Tteokbokki',
    'Variante crémeuse du tteokbokki : gâteaux de riz enrobés d''une sauce rosée au gochujang, à la crème, au lait et aux fromages fondus. Une version plus douce et moins épicée du classique de la street-food coréenne.',
    $instr$["Mélanger le gochujang, le sucre, la sauce soja et le gochugaru dans un petit bol, réserver.",
"Chauffer l'huile dans une poêle et faire revenir l'oignon, le chou et l'oignon vert 3 minutes, jusqu'à ce qu'ils soient tendres.",
"Ajouter la sauce pimentée et bien enrober les légumes.",
"Incorporer progressivement la crème et le lait en remuant jusqu'à obtenir une sauce lisse.",
"Ajouter les gâteaux de riz, la pâte de poisson et les saucisses cocktail, puis porter à ébullition à feu moyen-vif.",
"Remuer fréquemment pendant 8 à 10 minutes, jusqu'à ce que les gâteaux de riz soient tendres sans devenir pâteux.",
"Répartir la mozzarella et le parmesan sur le plat, laisser fondre quelques secondes et servir chaud."]
$instr$, 10, 20, 3, 2, 'Coréenne', 'snack',
    ARRAY['tteokbokki','sauce rosée','gâteaux de riz','street-food','crémeux','fusion','fromage'],
    'manual', 'https://mykoreankitchen.com/rose-tteokbokki/',
    'https://mykoreankitchen.com/wp-content/uploads/2023/04/S1-Rose-Tteokbokki-150x150.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'gochujang',1.5,'c. à soupe',true,1,NULL),
    (v_recipe_id, 'sucre',1.5,'c. à soupe',true,2,'roux de préférence'),
    (v_recipe_id, 'sauce soja',1.5,'c. à soupe',true,3,NULL),
    (v_recipe_id, 'gochugaru',1,'c. à café',true,4,'piment coréen'),
    (v_recipe_id, 'crème épaisse',300,'ml',true,5,NULL),
    (v_recipe_id, 'lait entier',100,'ml',true,6,NULL),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,7,NULL),
    (v_recipe_id, 'oignon',50,'g',true,8,'émincé fin'),
    (v_recipe_id, 'chou',30,'g',true,9,'émincé fin'),
    (v_recipe_id, 'oignon vert',15,'g',true,10,'émincé fin'),
    (v_recipe_id, 'gâteaux de riz',320,'g',true,11,'garaetteok'),
    (v_recipe_id, 'pâte de poisson coréenne',100,'g',true,12,'en morceaux'),
    (v_recipe_id, 'saucisses cocktail',90,'g',true,13,'de volaille ou de bœuf, légèrement incisées'),
    (v_recipe_id, 'mozzarella râpée',55,'g',true,14,NULL),
    (v_recipe_id, 'parmesan',1,'c. à soupe',true,15,'râpé');

  -- 4. Korean Corn Dog
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Korean Corn Dog',
    'Saucisses enrobées d''une pâte levée sucrée-salée puis de chapelure panko croustillante (parfois avec des morceaux de frites ou de ramen), frites et saupoudrées de sucre.',
    $instr$["Dissoudre le sucre et le sel dans l'eau tiède en mélangeant.",
"Ajouter la levure, laisser reposer quelques minutes, puis incorporer progressivement les farines jusqu'à obtenir une pâte lisse.",
"Couvrir et laisser lever 1 heure à température ambiante, jusqu'à ce que la pâte double de volume.",
"Préparer les garnitures optionnelles : couper les frites en morceaux de 1,5 cm ou émietter les nouilles ramen, dans des assiettes séparées.",
"Chauffer l'huile à 175 °C. Piquer les saucisses sur des bâtonnets en bois, puis les fariner légèrement.",
"Tremper chaque saucisse dans la pâte en tournant pour l'enrober uniformément.",
"Rouler dans la garniture choisie (frites ou ramen), puis immédiatement dans le panko.",
"Frire environ 4 minutes en tournant régulièrement, jusqu'à ce que le corn dog soit doré.",
"Saupoudrer généreusement de sucre et servir avec du ketchup et de la moutarde."]
$instr$, 75, 20, 4, 3, 'Coréenne', 'snack',
    ARRAY['corn dog','street-food','saucisse','panko','friture','sucré-salé','coréen'],
    'manual', 'https://mykoreankitchen.com/korean-corn-dog/',
    'https://mykoreankitchen.com/wp-content/uploads/2023/03/S1.-Korean-Corn-Dog-150x150.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'sucre',2,'c. à soupe',true,1,'pour la pâte'),
    (v_recipe_id, 'sel',1,'c. à café',true,2,'pour la pâte'),
    (v_recipe_id, 'eau',240,'ml',true,3,'tiède'),
    (v_recipe_id, 'levure sèche active',1,'c. à café',true,4,'de boulanger'),
    (v_recipe_id, 'farine',220,'g',true,5,'tout usage'),
    (v_recipe_id, 'farine de riz gluant',35,'g',true,6,'pour une texture moelleuse'),
    (v_recipe_id, 'saucisses de volaille',4,'unité',true,7,'type hot-dog, ou saucisses de bœuf'),
    (v_recipe_id, 'farine',2,'c. à soupe',true,8,'pour fariner les saucisses'),
    (v_recipe_id, 'chapelure panko',100,'g',true,9,NULL),
    (v_recipe_id, 'frites',280,'g',false,10,'optionnel, en petits morceaux'),
    (v_recipe_id, 'nouilles ramen instantanées',220,'g',false,11,'2 paquets, émiettées, optionnel'),
    (v_recipe_id, 'sucre',2,'c. à soupe',true,12,'pour saupoudrer'),
    (v_recipe_id, 'huile végétale',1500,'ml',true,13,'pour la friture'),
    (v_recipe_id, 'ketchup',60,'ml',false,14,'pour servir'),
    (v_recipe_id, 'moutarde américaine',30,'ml',false,15,'pour servir');

  -- 5. Tuna Mayo Rice Bowl
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Tuna Mayo Rice Bowl (Chamchi Deopbap)',
    'Bol de riz coréen express : thon en boîte mélangé à la mayonnaise, œufs brouillés moelleux et oignons caramélisés à la sauce soja sucrée, sur du riz chaud. Un repas étudiant emblématique.',
    $instr$["Mélanger délicatement le thon égoutté avec la mayonnaise, saler et poivrer ; réserver.",
"Chauffer un peu d'huile dans une poêle, verser les œufs battus et les brouiller à la fourchette environ 2 minutes, pour une texture moelleuse et granuleuse.",
"Dans une autre poêle, faire revenir l'oignon émincé jusqu'à ce qu'il soit tendre, puis ajouter la sauce soja, le sucre roux, le vinaigre de riz, le sucre et l'eau ; laisser mijoter jusqu'à caramélisation.",
"Disposer le riz chaud dans les bols.",
"Superposer les œufs brouillés, l'oignon caramélisé et le mélange thon-mayonnaise.",
"Parsemer de furikake et d'oignon vert.",
"Décorer d'un trait de mayonnaise au goût."]
$instr$, 10, 10, 2, 2, 'Coréenne', 'lunch',
    ARRAY['thon','mayonnaise','riz','deopbap','rapide','coréen','étudiant'],
    'manual', 'https://mykoreankitchen.com/tuna-mayo-rice-bowl/',
    'https://mykoreankitchen.com/wp-content/uploads/2023/02/S1.-Tuna-Mayo-Rice-Bowl-150x150.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'thon en conserve',185,'g',true,1,'égoutté'),
    (v_recipe_id, 'mayonnaise',60,'ml',true,2,'japonaise (Kewpie) ou coréenne'),
    (v_recipe_id, 'sel',1,'pincée',true,3,'au goût'),
    (v_recipe_id, 'poivre noir',1,'pincée',true,4,NULL),
    (v_recipe_id, 'œufs',4,'unité',true,5,'battus'),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,6,NULL),
    (v_recipe_id, 'riz',400,'g',true,7,'cuit, grain court'),
    (v_recipe_id, 'oignon',0.5,'unité',true,8,'émincé finement'),
    (v_recipe_id, 'sauce soja',1.5,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'sucre roux',1.5,'c. à café',true,10,NULL),
    (v_recipe_id, 'vinaigre de riz',2.5,'c. à café',true,11,NULL),
    (v_recipe_id, 'sucre',1,'c. à café',true,12,NULL),
    (v_recipe_id, 'eau',2.5,'c. à café',true,13,NULL),
    (v_recipe_id, 'furikake',2,'c. à café',false,14,'garniture optionnelle'),
    (v_recipe_id, 'oignons verts',1,'tige',false,15,'émincés, garniture');

  -- 6. Korean Toast (Gilgeori)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Gilgeori Toast (My Korean Kitchen)',
    'Sandwich coréen de rue : omelette épaisse garnie de chou, de carotte et d''oignon vert, entre deux tranches de pain beurré et grillé. Une touche sucrée (sucre et ketchup) qui surprend délicieusement.',
    $instr$["Mélanger les œufs battus avec le chou, la carotte et l'oignon vert ; saler et poivrer généreusement.",
"Chauffer l'huile à feu moyen-doux et cuire l'omelette en galette, dorée des deux côtés.",
"Beurrer les tranches de pain et les dorer à feu moyen-doux 1 minute par face.",
"Disposer l'omelette sur une tranche de pain grillé.",
"Ajouter le fromage, la dinde fumée ou d'autres garnitures selon les envies.",
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
    (v_recipe_id, 'chou',30,'g',true,3,'émincé fin'),
    (v_recipe_id, 'carottes',15,'g',true,4,'en julienne'),
    (v_recipe_id, 'oignon vert',5,'g',true,5,'émincé'),
    (v_recipe_id, 'sel',1,'pincée',true,6,NULL),
    (v_recipe_id, 'poivre noir',1,'pincée',true,7,NULL),
    (v_recipe_id, 'beurre',1,'c. à soupe',true,8,'pour griller'),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,9,'pour l''omelette'),
    (v_recipe_id, 'ketchup',1,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'sucre roux',1,'c. à café',false,11,'classique'),
    (v_recipe_id, 'dinde fumée',1,'tranche',false,12,'optionnel'),
    (v_recipe_id, 'fromage râpé',2,'c. à soupe',false,13,'optionnel');

  -- 7. Easy Kimbap (Yachae)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Easy Kimbap (Yachae Kimbap)',
    'Rouleau coréen de riz et de nori garni d''épinards, de carotte, d''omelette, de surimi, de dinde fumée, de radis jaune mariné (danmuji) et de bardane. Un classique emblématique du pique-nique et de la lunchbox.',
    $instr$["Blanchir les épinards 30 à 60 secondes, les rafraîchir, les presser pour retirer l'eau et les assaisonner avec un peu de sel et la moitié de l'huile de sésame.",
"Cuire une omelette fine dans une poêle huilée, la transférer sur une planche et la couper en longues lanières.",
"Faire revenir séparément la carotte, le surimi et la dinde fumée environ 1 minute chacun à feu moyen, dans un filet d'huile.",
"Mélanger le riz avec le reste de l'huile de sésame et du sel.",
"Poser une feuille de nori sur une natte en bambou et étaler le riz uniformément sur les 2/3 de la feuille.",
"Disposer les garnitures : radis jaune mariné, bardane, dinde fumée, surimi, omelette, carotte et épinards.",
"Rouler fermement à l'aide de la natte, en humidifiant le bord si nécessaire pour sceller.",
"Répéter avec les 3 autres feuilles.",
"Badigeonner d'huile de sésame, trancher en bouchées et servir avec du radis jaune mariné."]
$instr$, 25, 20, 4, 2, 'Coréenne', 'lunch',
    ARRAY['kimbap','riz','nori','rouleau','pique-nique','lunchbox','coréen'],
    'manual', 'https://mykoreankitchen.com/easy-kimbap/',
    'https://mykoreankitchen.com/wp-content/uploads/2006/10/3.-Korean-Kimbap.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'feuilles de nori',4,'unité',true,1,'pour kimbap ou sushi'),
    (v_recipe_id, 'épinards',120,'g',true,2,'frais'),
    (v_recipe_id, 'œufs',2,'unité',true,3,'battus, pour l''omelette'),
    (v_recipe_id, 'carotte',120,'g',true,4,'en julienne'),
    (v_recipe_id, 'surimi',3,'unité',true,5,'bâtonnets, coupés en deux'),
    (v_recipe_id, 'dinde fumée',4,'bâton',true,6,'en bâtonnets (type kimbap)'),
    (v_recipe_id, 'radis jaune mariné',4,'bâton',true,7,'danmuji, en lanières'),
    (v_recipe_id, 'bardane assaisonnée',60,'g',false,8,'environ 12 lanières, optionnel'),
    (v_recipe_id, 'riz',500,'g',true,9,'cuit, grain court'),
    (v_recipe_id, 'huile de sésame',2,'c. à soupe',true,10,'divisée'),
    (v_recipe_id, 'sel',0.5,'c. à café',true,11,NULL),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,12,'pour l''omelette et les garnitures');

  -- 8. Kimchi Bokkeumbap
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Kimchi Bokkeumbap (Kimchi Fried Rice)',
    'Riz frit coréen classique : kimchi sauté avec du beef bacon et du jus de kimchi, mélangé au riz, avec une finition à l''huile de sésame et un œuf au plat. Un plat réconfortant et rapide.',
    $instr$["Préchauffer un wok à feu moyen-vif avec l'huile, bien étalée à la spatule.",
"Faire revenir l'ail 10 secondes, puis ajouter le beef bacon et remuer jusqu'à ce qu'il soit à moitié cuit.",
"Ajouter le kimchi en remuant constamment, jusqu'à ce qu'il soit presque cuit.",
"Incorporer les champignons enoki et mélanger quelques secondes ; baisser à feu moyen-doux.",
"Verser le riz et le jus de kimchi, bien mélanger.",
"Ajouter l'huile de sésame et mélanger avant de retirer du feu.",
"Dresser dans des bols et garnir de graines de sésame, d'oignon vert et d'algue.",
"Surmonter d'un œuf au plat et servir immédiatement."]
$instr$, 5, 10, 4, 1, 'Coréenne', 'lunch',
    ARRAY['kimchi','riz frit','beef bacon','wok','rapide','réconfortant','coréen'],
    'manual', 'https://mykoreankitchen.com/kimchi-fried-rice/',
    'https://mykoreankitchen.com/wp-content/uploads/2015/10/1.-Easy-Kimchi-Fried-Rice.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'kimchi',200,'g',true,1,'en petits morceaux'),
    (v_recipe_id, 'beef bacon',150,'g',true,2,'en petits morceaux'),
    (v_recipe_id, 'champignons enoki',200,'g',false,3,'optionnel, base retirée'),
    (v_recipe_id, 'riz',600,'g',true,4,'cuit, grain court'),
    (v_recipe_id, 'œufs',4,'unité',true,5,'pour les œufs au plat'),
    (v_recipe_id, 'ail',0.5,'c. à café',true,6,'haché fin'),
    (v_recipe_id, 'jus de kimchi',60,'ml',true,7,'du fond du pot'),
    (v_recipe_id, 'huile de sésame',0.5,'c. à soupe',true,8,NULL),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'graines de sésame',1,'c. à soupe',false,10,'grillées'),
    (v_recipe_id, 'oignon vert',1,'tige',false,11,'émincé'),
    (v_recipe_id, 'algue marine assaisonnée',5,'g',false,12,'émiettée');

  -- 9. Bibimbap (My Korean Kitchen)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Bibimbap (My Korean Kitchen)',
    'Bol coréen classique : riz blanc garni de bœuf haché mariné, de légumes cuits séparément (épinards, germes de soja, carotte, champignons), d''un œuf et de sauce au gochujang. À mélanger avant de déguster.',
    $instr$["Mélanger le bœuf haché avec la sauce soja, l'huile de sésame, le sucre roux et l'ail ; laisser mariner 30 minutes.",
"Préparer la sauce bibimbap en mélangeant le gochujang, l'huile de sésame, le sucre, l'eau, les graines de sésame et le vinaigre.",
"Cuire la viande marinée au wok à feu vif 3 à 5 minutes, jusqu'à cuisson complète.",
"Couper la carotte en bâtonnets et la faire sauter 2 à 3 minutes dans un peu d'huile avec une pincée de sel.",
"Émincer finement les champignons et les faire revenir 2 à 3 minutes dans un peu d'huile.",
"Préparer les épinards et les germes de soja : les blanchir séparément, les égoutter puis les assaisonner d'un peu de sel et d'huile de sésame.",
"Cuire les œufs au plat en gardant le jaune coulant.",
"Dresser le riz dans des bols, puis disposer la viande, tous les légumes, les lanières de nori et l'œuf par-dessus.",
"Verser la sauce sur le riz et bien mélanger avant de déguster."]
$instr$, 35, 55, 4, 3, 'Coréenne', 'dinner',
    ARRAY['bibimbap','riz','gochujang','légumes','bœuf','coréen','plat-complet'],
    'manual', 'https://mykoreankitchen.com/bibimbap-korean-mixed-rice-with-meat-and-assorted-vegetables/',
    'https://mykoreankitchen.com/wp-content/uploads/2013/07/1.Korean-mixed-rice-Bibimbap.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bœuf haché',100,'g',true,1,'ou bœuf en lanières'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,2,'marinade'),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,3,'marinade'),
    (v_recipe_id, 'sucre roux',1,'c. à café',true,4,'marinade'),
    (v_recipe_id, 'ail',0.25,'c. à café',true,5,'haché'),
    (v_recipe_id, 'épinards',250,'g',true,6,'blanchis et assaisonnés (namul)'),
    (v_recipe_id, 'germes de soja',350,'g',true,7,'blanchis et assaisonnés (namul)'),
    (v_recipe_id, 'champignons shiitake',100,'g',true,8,NULL),
    (v_recipe_id, 'carotte',120,'g',true,9,'en julienne'),
    (v_recipe_id, 'sel',1,'c. à café',true,10,'pour les légumes'),
    (v_recipe_id, 'huile de sésame',2,'c. à café',true,11,'pour les légumes'),
    (v_recipe_id, 'riz',600,'g',true,12,'cuit'),
    (v_recipe_id, 'œufs',4,'unité',true,13,'pour les œufs au plat'),
    (v_recipe_id, 'gochujang',2,'c. à soupe',true,14,'sauce'),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,15,'sauce'),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,16,'sauce'),
    (v_recipe_id, 'eau',1,'c. à soupe',true,17,'sauce'),
    (v_recipe_id, 'graines de sésame',1,'c. à soupe',true,18,'grillées, sauce'),
    (v_recipe_id, 'vinaigre',1,'c. à café',true,19,'sauce'),
    (v_recipe_id, 'algues nori',2,'feuille',false,20,'en lanières'),
    (v_recipe_id, 'huile de cuisson',2,'c. à soupe',true,21,NULL);

END $$;
