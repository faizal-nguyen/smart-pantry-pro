-- =====================================================================
-- Seed: 17 Korean recipes from koreanbapsang.com (2026-05-21)
--
-- Distinct du seed 2026-05-21-add-mykoreankitchen.sql. Noms suffixés
-- pour éviter collisions (Bibimbap (Korean Bapsang), Gilgeori Toast
-- (Korean Bapsang)).
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-21-add-koreanbapsang.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Gilgeori Toast (Korean Bapsang)',
    'Gungjung Tteokbokki (Royal Court)',
    'Dakgangjeong (Sweet Crispy Chicken)',
    'Kimchijeon (Crêpe au Kimchi)',
    'Tteokbokki (Spicy Rice Cakes)',
    'Mayak Gimbap (Mini Gimbap Addictif)',
    'Yangnyeom Chicken (Poulet Frit Coréen)',
    'Bibimbap (Korean Bapsang)',
    'Kimchi Ssambap (Rouleaux Riz-Kimchi)',
    'Kimchi Bulgogi Cheesesteak',
    'Kimchi Jjigae (Ragoût de Kimchi)',
    'Nurungji Baeksuk (Poulet & Riz Cocotte)',
    'Hobak Jeon (Beignets de Courgette)',
    'Beoseot Gangjeong (Champignons Croustillants)',
    'Dubu Jorim (Tofu Braisé Coréen)',
    'Gamja Jorim (Pommes de Terre Braisées)',
    'Oi Kimchi (Kimchi de Concombre)'
  ];
BEGIN
  DELETE FROM public.recipes WHERE user_id = v_user_id AND name = ANY(v_recipe_names);

  -- 1. Gilgeori Toast (Korean Bapsang)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Gilgeori Toast (Korean Bapsang)',
    'Sandwich coréen de rue : omelette aux légumes (chou, carotte, oignon) entre deux tranches de pain beurré et grillé, relevée de sucre et de ketchup. Petit-déjeuner emblématique de Séoul.',
    $instr$["Émincer finement le chou et l'oignon, couper la carotte en fine julienne et la ciboulette en tronçons.",
"Faire fondre une partie du beurre à feu moyen et griller les tranches de pain 1 à 2 minutes par face.",
"Mélanger les légumes (en réserver 1/5) avec une pincée de sel, une pincée de poivre et l'œuf battu ; écraser à la fourchette 20 secondes.",
"Faire fondre le reste du beurre dans la poêle, verser le mélange et l'aplatir en galette ronde, puis garnir du reste de légumes.",
"Cuire 3 minutes jusqu'à ce que le dessous soit bien doré, retourner et poursuivre 2 minutes.",
"Placer l'omelette sur une tranche de pain, saupoudrer généreusement de sucre et arroser de ketchup.",
"Fermer le sandwich avec la seconde tranche et servir immédiatement."]
$instr$, 10, 8, 1, 2, 'Coréenne', 'breakfast',
    ARRAY['toast','sandwich','street-food','œuf','petit-déjeuner','séoul','coréen'],
    'manual', 'https://www.koreanbapsang.com/gilgeori-toast-korean-street-toast/',
    'https://www.koreanbapsang.com/wp-content/uploads/2022/02/DSC4264-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'pain de mie',2,'tranche',true,1,'blanc ou complet'),
    (v_recipe_id, 'chou vert',100,'g',true,2,'émincé fin'),
    (v_recipe_id, 'carotte',15,'g',true,3,'en fine julienne'),
    (v_recipe_id, 'oignon',15,'g',true,4,'émincé fin'),
    (v_recipe_id, 'ciboulette',2,'brin',true,5,'en tronçons de 4 cm'),
    (v_recipe_id, 'œuf',1,'unité',true,6,'gros, battu'),
    (v_recipe_id, 'sel',1,'pincée',true,7,NULL),
    (v_recipe_id, 'poivre noir',1,'pincée',true,8,NULL),
    (v_recipe_id, 'beurre',2,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,10,'généreuse'),
    (v_recipe_id, 'ketchup',1,'c. à soupe',true,11,NULL);

  -- 2. Gungjung Tteokbokki
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Gungjung Tteokbokki (Royal Court)',
    'Tteokbokki traditionnel de la cuisine royale de Joseon : gâteaux de riz sautés à la sauce soja (non épicés) avec bœuf, shiitake et légumes. Plat festif du Nouvel An lunaire.',
    $instr$["Mélanger les ingrédients de la sauce (sauce soja, vinaigre de riz, sucre, eau, huile de sésame, graines de sésame, ail et poivre) ; en réserver 2 c. à soupe pour enrober les gâteaux de riz.",
"Faire bouillir les gâteaux de riz jusqu'à ce qu'ils remontent à la surface, les égoutter et les enrober de la sauce réservée.",
"Trancher le bœuf en fines lanières et émincer les shiitake ; les faire mariner 10 à 15 minutes dans 1 c. à soupe de sauce.",
"Saler les tranches de courgette, les laisser dégorger 10 à 15 minutes puis les presser pour retirer l'excès d'eau.",
"Chauffer l'huile dans une grande poêle et faire revenir l'oignon, la carotte et la courgette 2 minutes à feu moyen-vif ; ajouter les oignons verts en fin de cuisson.",
"Dans la même poêle, cuire le bœuf et les shiitake 1 à 2 minutes, jusqu'à ce que la viande soit cuite.",
"Ajouter les gâteaux de riz et cuire 1 à 2 minutes en mélangeant.",
"Éteindre le feu, incorporer le reste de la sauce et servir chaud."]
$instr$, 15, 10, 4, 2, 'Coréenne', 'lunch',
    ARRAY['tteokbokki','cuisine royale','sauce soja','traditionnel','nouvel-an-lunaire','non-épicé','gâteaux de riz'],
    'manual', 'https://www.koreanbapsang.com/gungjung-tteokbokki-and-lunar-new-year/',
    'https://www.koreanbapsang.com/wp-content/uploads/2014/01/DSC6960.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'gâteaux de riz',500,'g',true,1,'garaetteok, en morceaux de 5 cm'),
    (v_recipe_id, 'bœuf maigre',120,'g',true,2,'en fines lanières'),
    (v_recipe_id, 'champignons shiitake frais',4,'unité',true,3,'émincés'),
    (v_recipe_id, 'courgette',100,'g',true,4,'en fines tranches'),
    (v_recipe_id, 'sel',0.5,'c. à café',true,5,'pour dégorger la courgette'),
    (v_recipe_id, 'carotte',1,'unité',true,6,'en bâtonnets fins'),
    (v_recipe_id, 'oignon doux',0.5,'unité',true,7,'émincé'),
    (v_recipe_id, 'oignons verts',2,'tige',true,8,'en tronçons de 5 cm'),
    (v_recipe_id, 'sauce soja',3,'c. à soupe',true,9,'sauce'),
    (v_recipe_id, 'vinaigre de riz',1.25,'c. à café',true,10,'sauce'),
    (v_recipe_id, 'sucre',3.5,'c. à café',true,11,'sauce'),
    (v_recipe_id, 'eau',1.25,'c. à café',true,12,'sauce'),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,13,'sauce'),
    (v_recipe_id, 'graines de sésame',1,'c. à café',true,14,'sauce'),
    (v_recipe_id, 'ail',2,'c. à café',true,15,'haché'),
    (v_recipe_id, 'poivre noir',1,'pincée',true,16,NULL),
    (v_recipe_id, 'huile de cuisson',2,'c. à soupe',true,17,NULL);

  -- 3. Dakgangjeong
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Dakgangjeong (Sweet Crispy Chicken)',
    'Poulet frit coréen en bouchées désossées, frit deux fois pour plus de croustillant puis nappé d''une sauce collante gochujang-miel-soja. Garni de cacahuètes concassées.',
    $instr$["Retirer le gras visible du poulet et le découper en bouchées régulières.",
"Faire tremper le poulet dans le lait 30 minutes au réfrigérateur pour l'attendrir (optionnel).",
"Égoutter et assaisonner avec le sel, le poivre, l'ail, le gingembre, le bouillon de poulet et le vinaigre de riz ; laisser mariner 20 à 30 minutes.",
"Mélanger tous les ingrédients de la sauce dans une casserole, porter à ébullition puis laisser mijoter 3 à 4 minutes jusqu'à ce qu'elle épaississe.",
"Enrober chaque morceau de fécule de pomme de terre.",
"Chauffer l'huile à 165 °C et frire par lots 3 minutes, jusqu'à ce que le poulet soit légèrement doré.",
"Égoutter sur du papier absorbant, réchauffer l'huile et refrire 1 à 2 minutes jusqu'à obtenir une dorure uniforme.",
"Réchauffer la sauce à feu moyen-doux, ajouter le poulet frit et bien l'enrober.",
"Dresser dans un plat et parsemer de cacahuètes concassées."]
$instr$, 90, 20, 4, 3, 'Coréenne', 'snack',
    ARRAY['poulet frit','gochujang','double-friture','sucré-épicé','apéritif','coréen','street-food'],
    'manual', 'https://www.koreanbapsang.com/dakgangjeong-sweet-crispy-chicken/',
    'https://www.koreanbapsang.com/wp-content/uploads/2014/03/DSC5354_01-2-e1644534672706.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet désossées',450,'g',true,1,'ou blancs, sans peau, en bouchées'),
    (v_recipe_id, 'lait',120,'ml',false,2,'pour attendrir, optionnel'),
    (v_recipe_id, 'sel',0.25,'c. à café',true,3,'marinade'),
    (v_recipe_id, 'poivre',1,'pincée',true,4,'marinade'),
    (v_recipe_id, 'ail',0.5,'c. à café',true,5,'haché, marinade'),
    (v_recipe_id, 'gingembre',0.5,'c. à café',true,6,'râpé, marinade'),
    (v_recipe_id, 'bouillon de poulet',2,'c. à café',true,7,'marinade'),
    (v_recipe_id, 'vinaigre de riz',1,'c. à café',true,8,'marinade'),
    (v_recipe_id, 'fécule de pomme de terre',50,'g',true,9,'ou fécule de maïs'),
    (v_recipe_id, 'huile végétale',1500,'ml',true,10,'pour la friture'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,11,'sauce'),
    (v_recipe_id, 'vinaigre de riz',1.25,'c. à soupe',true,12,'sauce'),
    (v_recipe_id, 'sucre',1.25,'c. à café',true,13,'sauce'),
    (v_recipe_id, 'eau',1.25,'c. à soupe',true,14,'sauce'),
    (v_recipe_id, 'vinaigre de cidre',30,'ml',true,15,'sauce'),
    (v_recipe_id, 'gochujang',1,'c. à soupe',true,16,'sauce'),
    (v_recipe_id, 'miel',45,'ml',true,17,'ou sirop de riz'),
    (v_recipe_id, 'huile de sésame',10,'ml',true,18,'sauce'),
    (v_recipe_id, 'sucre roux',30,'g',true,19,'sauce'),
    (v_recipe_id, 'ail',1,'c. à café',true,20,'haché, sauce'),
    (v_recipe_id, 'gingembre',1,'c. à café',true,21,'râpé, sauce'),
    (v_recipe_id, 'cacahuètes',20,'g',false,22,'concassées, garniture');

  -- 4. Kimchijeon
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Kimchijeon (Crêpe au Kimchi)',
    'Crêpe coréenne salée et croustillante au kimchi bien fermenté. Pâte très simple à base de farine et de jus de kimchi, idéale en apéritif ou en repas léger.',
    $instr$["Émincer le kimchi en lanières de 1 cm et couper les oignons verts en tronçons de 5 cm.",
"Mélanger la farine, le jus de kimchi, le gochujang (optionnel) et l'œuf, puis ajouter l'eau froide progressivement sans trop travailler la pâte.",
"Vérifier la consistance : la pâte doit couler facilement de la cuillère.",
"Incorporer le kimchi, les oignons verts, l'oignon émincé et le bœuf haché (optionnel).",
"Chauffer 1 c. à soupe d'huile dans une poêle antiadhésive à feu moyen-vif, verser la pâte et l'étaler en une crêpe ronde et fine.",
"Cuire environ 3 minutes jusqu'à ce que les bords dorent, puis retourner délicatement.",
"Ajouter de l'huile sur le pourtour, presser légèrement et cuire 2 à 3 minutes jusqu'à ce que la crêpe soit croustillante.",
"Servir chaud, avec une sauce soja-vinaigre en accompagnement si désiré."]
$instr$, 10, 12, 3, 2, 'Coréenne', 'snack',
    ARRAY['crêpe','kimchi','jeon','apéritif','coréen','rapide','fermenté'],
    'manual', 'https://www.koreanbapsang.com/kimchi-jeon-kimchi-pancake/',
    'https://www.koreanbapsang.com/wp-content/uploads/2010/02/DSC0780-2-e1644441498766.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'kimchi',150,'g',true,1,'bien fermenté, tranché fin'),
    (v_recipe_id, 'oignons verts',2,'tige',true,2,'en tronçons'),
    (v_recipe_id, 'oignon',0.25,'unité',true,3,'émincé'),
    (v_recipe_id, 'bœuf haché',85,'g',false,4,'optionnel, ou thon en conserve égoutté'),
    (v_recipe_id, 'farine',155,'g',true,5,'tout usage'),
    (v_recipe_id, 'jus de kimchi',45,'ml',true,6,'essentiel pour le goût'),
    (v_recipe_id, 'gochujang',2,'c. à café',false,7,'optionnel'),
    (v_recipe_id, 'œuf',1,'unité',false,8,'optionnel'),
    (v_recipe_id, 'eau',250,'ml',true,9,'très froide'),
    (v_recipe_id, 'huile de cuisson',3,'c. à soupe',true,10,'à point de fumée élevé'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',false,11,'sauce d''accompagnement'),
    (v_recipe_id, 'vinaigre',1,'c. à café',false,12,'sauce d''accompagnement');

  -- 5. Tteokbokki (Spicy)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Tteokbokki (Spicy Rice Cakes)',
    'Street-food coréen emblématique : gâteaux de riz mijotés dans une sauce épicée au gochujang et au gochugaru, avec gâteaux de poisson (eomuk), chou et bouillon d''anchois. Un sucré-épicé irrésistible.',
    $instr$["Faire tremper les gâteaux de riz au moins 20 minutes dans l'eau pour les ramollir.",
"Couper les gâteaux de poisson, le chou et les oignons verts en bouchées.",
"Porter le bouillon d'anchois à ébullition dans une grande casserole.",
"Incorporer le gochujang, le gochugaru, la sauce soja, le sucre et le sirop de maïs ; bien mélanger.",
"Ajouter les gâteaux de riz égouttés et cuire 8 à 10 minutes, jusqu'à ce qu'ils soient tendres et que la sauce épaississe.",
"Incorporer le chou, les gâteaux de poisson et l'ail ; poursuivre la cuisson 4 à 6 minutes.",
"Ajouter les oignons verts 2 à 3 minutes avant la fin et rectifier l'assaisonnement.",
"Servir chaud."]
$instr$, 20, 20, 3, 2, 'Coréenne', 'snack',
    ARRAY['tteokbokki','gochujang','street-food','épicé','gâteaux de riz','coréen','réconfortant'],
    'manual', 'https://www.koreanbapsang.com/tteokbokki-spicy-stir-fried-rice-cakes/',
    'https://www.koreanbapsang.com/wp-content/uploads/2018/09/DSC4637-4.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'gâteaux de riz',500,'g',true,1,'pour tteokbokki, environ 24 morceaux de 7,5 cm'),
    (v_recipe_id, 'gâteaux de poisson',2,'feuille',true,2,'eomuk, en bouchées'),
    (v_recipe_id, 'chou vert',120,'g',true,3,'en bouchées'),
    (v_recipe_id, 'oignons verts',2,'tige',true,4,'en tronçons'),
    (v_recipe_id, 'ail',1,'c. à soupe',true,5,'haché'),
    (v_recipe_id, 'bouillon d''anchois',750,'ml',true,6,'ou eau'),
    (v_recipe_id, 'gochujang',3,'c. à soupe',true,7,NULL),
    (v_recipe_id, 'gochugaru',1,'c. à soupe',true,8,'à ajuster'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'sucre',2,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'sirop de maïs',1,'c. à soupe',true,11,NULL);

  -- 6. Mayak Gimbap
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Mayak Gimbap (Mini Gimbap Addictif)',
    'Petits rouleaux de gimbap surnommés « gimbap drogue » (mayak) tant ils sont addictifs. Spécialité minimaliste du marché Gwangjang (riz, épinards, carotte, radis jaune mariné), servie avec une sauce moutarde-soja relevée.',
    $instr$["Cuire le riz avec un peu moins d'eau que d'habitude.",
"Blanchir les épinards, les rafraîchir, les presser pour retirer l'eau et les assaisonner d'huile de sésame et de sel.",
"Couper la carotte en julienne et la faire revenir rapidement à la poêle.",
"Couper les radis jaunes marinés en fines lanières.",
"Mélanger délicatement le riz chaud avec de l'huile de sésame et du sel, en le soulevant.",
"Couper les 4 feuilles de nori en quartiers (16 petites feuilles).",
"Étaler finement le riz sur chaque petite feuille et disposer les garnitures.",
"Rouler serré en repliant délicatement les bords.",
"Badigeonner d'huile de sésame pour la brillance.",
"Mélanger les ingrédients de la sauce moutarde jusqu'à dissolution du sucre et servir en accompagnement."]
$instr$, 30, 20, 2, 2, 'Coréenne', 'lunch',
    ARRAY['gimbap','mini-rouleaux','riz','nori','street-food','gwangjang','mayak'],
    'manual', 'https://www.koreanbapsang.com/mini-gimbap-mayak-gimbap/',
    'https://www.koreanbapsang.com/wp-content/uploads/2015/05/DSC_0917-2-e1566061945769.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'riz à grain court',300,'g',true,1,'cru'),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,2,'riz, épinards et finition'),
    (v_recipe_id, 'sel',0.5,'c. à café',true,3,NULL),
    (v_recipe_id, 'épinards',150,'g',true,4,NULL),
    (v_recipe_id, 'carotte',1,'unité',true,5,'grosse, en julienne'),
    (v_recipe_id, 'radis jaune mariné',4,'bâton',true,6,'danmuji, en fines lanières'),
    (v_recipe_id, 'feuilles de nori',4,'unité',true,7,'gim, coupées en quartiers'),
    (v_recipe_id, 'graines de sésame',1,'c. à soupe',true,8,'moulues finement, sauce'),
    (v_recipe_id, 'vinaigre',1,'c. à soupe',true,9,'sauce'),
    (v_recipe_id, 'sauce soja',1,'c. à café',true,10,'sauce'),
    (v_recipe_id, 'moutarde de Dijon',1,'c. à café',true,11,'ou moutarde coréenne (gyeoja), sauce'),
    (v_recipe_id, 'sucre',2,'c. à café',true,12,'sauce');

  -- 7. Yangnyeom Chicken
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Yangnyeom Chicken (Poulet Frit Coréen)',
    'Poulet frit coréen croustillant, glacé d''une sauce rouge épicée (gochujang, sauce piquante, miel, ail). Une double friture lui donne une peau fine et très croustillante.',
    $instr$["Rincer et égoutter les ailes de poulet, les mélanger avec le sel, le poivre et le gingembre râpé ; réfrigérer au moins 2 heures (idéalement une nuit).",
"Préparer la sauce : porter à ébullition tous ses ingrédients dans une casserole et laisser épaissir 4 à 5 minutes ; retirer du feu.",
"Pâte à frire : fouetter le mélange à friture, la fécule et l'eau jusqu'à obtenir une pâte lisse.",
"Chauffer l'huile à 160-165 °C. Tremper chaque morceau dans la pâte en secouant l'excédent.",
"Frire par lots environ 6 minutes, jusqu'à légère coloration.",
"Laisser reposer quelques minutes et remonter l'huile à 175-180 °C.",
"Refrire environ 5 minutes, jusqu'à ce que le poulet soit uniformément doré et très croustillant.",
"Égoutter sur une grille, puis enrober entièrement de sauce ou badigeonner.",
"Parsemer de graines de sésame et d'oignons verts, servir immédiatement."]
$instr$, 25, 20, 4, 3, 'Coréenne', 'dinner',
    ARRAY['poulet frit','coréen','yangnyeom','double-friture','gochujang','sucré-épicé','street-food'],
    'manual', 'https://www.koreanbapsang.com/yangnyeom-chicken-korean-fried-chicken/',
    'https://www.koreanbapsang.com/wp-content/uploads/2022/03/DSC5754-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'ailes de poulet',900,'g',true,1,'pilons et ailerons séparés'),
    (v_recipe_id, 'sel',1.5,'c. à café',true,2,NULL),
    (v_recipe_id, 'poivre noir',1,'pincée',true,3,NULL),
    (v_recipe_id, 'gingembre',1,'c. à café',true,4,'râpé'),
    (v_recipe_id, 'huile végétale',1200,'ml',true,5,'pour la friture'),
    (v_recipe_id, 'mélange à friture',60,'g',true,6,'type tempura, ou farine et levure chimique'),
    (v_recipe_id, 'fécule de pomme de terre',30,'g',true,7,'pâte à frire'),
    (v_recipe_id, 'eau',180,'ml',true,8,'pâte à frire'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,9,'sauce'),
    (v_recipe_id, 'bouillon de poulet',4,'c. à café',true,10,'sauce'),
    (v_recipe_id, 'vinaigre de riz',2,'c. à café',true,11,'sauce'),
    (v_recipe_id, 'gochujang',1.5,'c. à soupe',true,12,'sauce'),
    (v_recipe_id, 'sauce piquante',2,'c. à soupe',true,13,'sriracha ou similaire'),
    (v_recipe_id, 'sucre',2,'c. à soupe',true,14,'sauce'),
    (v_recipe_id, 'miel',2,'c. à soupe',true,15,'ou sirop'),
    (v_recipe_id, 'ail',1,'c. à soupe',true,16,'haché'),
    (v_recipe_id, 'eau',4,'c. à soupe',true,17,'sauce'),
    (v_recipe_id, 'graines de sésame',0.5,'c. à café',false,18,'garniture'),
    (v_recipe_id, 'oignons verts',1,'tige',false,19,'hachés, garniture');

  -- 8. Bibimbap (Korean Bapsang)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Bibimbap (Korean Bapsang)',
    'Bibimbap traditionnel : riz, bœuf mariné, légumes assaisonnés séparément (épinards, germes de soja, concombre, champignons, carottes), œuf et sauce au gochujang. Variante en bol de pierre (dolsot) possible.',
    $instr$["Cuire le riz avec un peu moins d'eau que d'habitude pour une texture plus ferme.",
"Mariner le bœuf en lanières 20 minutes avec la sauce soja, le sucre, l'huile de sésame, le bouillon de bœuf, l'ail, 1 c. à soupe d'oignon vert haché et le poivre, puis le faire sauter 2 à 3 minutes à feu vif.",
"Blanchir séparément les germes de soja et les épinards, les rafraîchir, les égoutter et les assaisonner d'ail, d'huile de sésame, de graines de sésame et de sel.",
"Saler les concombres tranchés 10 à 15 minutes, les presser pour retirer l'eau et les assaisonner d'oignon vert, d'ail et d'huile de sésame.",
"Trancher finement les champignons et les carottes, puis les faire sauter séparément 1 à 2 minutes dans un peu d'huile avec une pincée de sel.",
"Préparer la sauce en mélangeant le gochujang, le sucre, l'huile de sésame et l'eau jusqu'à obtenir une texture lisse.",
"Disposer le riz dans des bols et arranger joliment chaque légume et la viande par-dessus.",
"Ajouter un œuf au plat (optionnel) et un filet d'huile de sésame, servir avec la sauce au gochujang.",
"Variante dolsot : chauffer un bol en pierre huilé à feu moyen, ajouter le riz et les garnitures et cuire quelques minutes jusqu'à ce que le riz grésille.",
"Bien mélanger le tout avec la sauce à table avant de déguster."]
$instr$, 25, 30, 4, 3, 'Coréenne', 'dinner',
    ARRAY['bibimbap','riz','légumes','gochujang','bœuf','dolsot','coréen'],
    'manual', 'https://www.koreanbapsang.com/bibimbap/',
    'https://www.koreanbapsang.com/wp-content/uploads/2018/09/DSC3740-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'riz à grain court',600,'g',true,1,'cru'),
    (v_recipe_id, 'bœuf',225,'g',true,2,'tranché finement (entrecôte ou faux-filet)'),
    (v_recipe_id, 'sauce soja',1.5,'c. à soupe',true,3,'marinade'),
    (v_recipe_id, 'sucre',2,'c. à café',true,4,'marinade'),
    (v_recipe_id, 'huile de sésame',2,'c. à café',true,5,'marinade'),
    (v_recipe_id, 'bouillon de bœuf',2,'c. à café',true,6,'marinade'),
    (v_recipe_id, 'ail',1,'c. à café',true,7,'haché, marinade'),
    (v_recipe_id, 'oignons verts',3,'tige',true,8,'hachés, marinade et légumes'),
    (v_recipe_id, 'poivre noir',1,'pincée',true,9,'marinade'),
    (v_recipe_id, 'germes de soja',225,'g',true,10,'ou pousses de haricot mungo'),
    (v_recipe_id, 'épinards',225,'g',true,11,NULL),
    (v_recipe_id, 'concombres',2,'unité',true,12,'petits, tranchés'),
    (v_recipe_id, 'champignons',115,'g',true,13,NULL),
    (v_recipe_id, 'carottes',2,'unité',true,14,'moyennes'),
    (v_recipe_id, 'ail',1.5,'c. à café',true,15,'haché, légumes'),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,16,'légumes'),
    (v_recipe_id, 'graines de sésame',2,'c. à café',true,17,'légumes et bœuf'),
    (v_recipe_id, 'sel',2,'c. à café',true,18,'légumes'),
    (v_recipe_id, 'huile de cuisson',2,'c. à soupe',true,19,'pour sauter'),
    (v_recipe_id, 'œufs',4,'unité',false,20,'au plat, optionnel'),
    (v_recipe_id, 'gochujang',4,'c. à soupe',true,21,'sauce'),
    (v_recipe_id, 'sucre',2,'c. à café',true,22,'sauce'),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,23,'sauce'),
    (v_recipe_id, 'eau',1,'c. à soupe',true,24,'sauce');

  -- 9. Kimchi Ssambap
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Kimchi Ssambap (Rouleaux Riz-Kimchi)',
    'Rouleaux faciles à emporter : boulettes de riz sauté aux légumes et au bœuf, enveloppées dans des feuilles de kimchi. Parfaits pour la lunchbox et le pique-nique, avec un bel équilibre sucré, acidulé et épicé.',
    $instr$["Presser le kimchi pour en retirer le liquide, ôter la partie blanche épaisse et le rincer si on le souhaite plus doux.",
"Hacher finement l'oignon, la carotte, le poivron et les champignons.",
"Chauffer l'huile à feu moyen, faire dorer le bœuf haché puis ajouter les légumes et cuire 2 minutes.",
"Incorporer le riz et la sauce soja, mélanger 2 à 3 minutes jusqu'à ce que le tout soit homogène, puis saler et poivrer.",
"Ajouter l'huile de sésame et les graines de sésame, bien mélanger.",
"Une fois le riz suffisamment refroidi, former de petites boules entre les paumes.",
"Étaler une feuille de kimchi et poser une boule de riz près du bord.",
"Enrouler le kimchi autour du riz en repliant les côtés pour fermer.",
"Répéter jusqu'à épuisement du riz."]
$instr$, 15, 10, 2, 2, 'Coréenne', 'lunch',
    ARRAY['ssambap','kimchi','riz','rouleaux','lunchbox','portable','coréen'],
    'manual', 'https://www.koreanbapsang.com/kimchi-ssambap-kimchi-wrapped-rice-rolls/',
    'https://www.koreanbapsang.com/wp-content/uploads/2014/04/DSC9062.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'kimchi',10,'feuille',true,1,'chou fermenté entier, parties feuillues'),
    (v_recipe_id, 'oignon',0.25,'unité',true,2,'haché fin'),
    (v_recipe_id, 'carotte',0.5,'unité',true,3,'hachée fin'),
    (v_recipe_id, 'poivron vert',0.25,'unité',true,4,'haché fin'),
    (v_recipe_id, 'champignons',3,'unité',true,5,'hachés fin'),
    (v_recipe_id, 'bœuf haché',100,'g',true,6,NULL),
    (v_recipe_id, 'huile de cuisson',2,'c. à soupe',true,7,NULL),
    (v_recipe_id, 'riz',400,'g',true,8,'cuit, refroidi'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,10,'finition'),
    (v_recipe_id, 'graines de sésame',1,'c. à café',true,11,NULL),
    (v_recipe_id, 'sel',1,'pincée',true,12,NULL),
    (v_recipe_id, 'poivre',1,'pincée',true,13,NULL);

  -- 10. Kimchi Bulgogi Cheesesteak
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Kimchi Bulgogi Cheesesteak',
    'Fusion coréano-américaine : bulgogi mariné et kimchi sauté dans un pain grillé, recouverts de fromage fondu. Mayonnaise au gochujang en option pour plus de piquant.',
    $instr$["Faire fondre le beurre dans une poêle préchauffée à feu moyen et griller les pains côté mie jusqu'à ce qu'ils soient dorés.",
"Cuire le bulgogi mariné à feu vif en le détaillant à la spatule, ou le réchauffer s'il est déjà cuit.",
"Dans une autre poêle, faire revenir le kimchi émincé (et l'oignon, si utilisé) dans l'huile 3 à 4 minutes jusqu'à ce qu'il ramollisse.",
"Parsemer le kimchi de fromage râpé, couvrir et laisser fondre à feu moyen-doux.",
"Mélanger la mayonnaise avec le gochujang si désiré.",
"Assembler : poser la laitue sur la base du pain, ajouter le bulgogi puis le mélange kimchi-fromage.",
"Napper de mayonnaise au gochujang selon les goûts et refermer."]
$instr$, 10, 15, 2, 2, 'Coréenne', 'lunch',
    ARRAY['bulgogi','kimchi','sandwich','cheesesteak','fusion','bœuf','américain'],
    'manual', 'https://www.koreanbapsang.com/kimchi-bulgogi-cheesesteak/',
    'https://www.koreanbapsang.com/wp-content/uploads/2021/04/DSC9694.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bulgogi mariné',227,'g',true,1,'cru ou déjà cuit'),
    (v_recipe_id, 'kimchi',80,'g',true,2,'tranché'),
    (v_recipe_id, 'oignon',0.25,'unité',false,3,'émincé, optionnel'),
    (v_recipe_id, 'fromage râpé',55,'g',true,4,'mozzarella ou provolone'),
    (v_recipe_id, 'pains à hamburger',2,'unité',true,5,'ou petits pains à sandwich'),
    (v_recipe_id, 'beurre',1,'c. à soupe',true,6,'pour griller les pains'),
    (v_recipe_id, 'huile de cuisson',1,'c. à café',true,7,'pour le kimchi'),
    (v_recipe_id, 'laitue',2,'feuille',true,8,NULL),
    (v_recipe_id, 'mayonnaise',2,'c. à soupe',false,9,'optionnel'),
    (v_recipe_id, 'gochujang',1,'c. à café',false,10,'optionnel');

  -- 11. Kimchi Jjigae
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Kimchi Jjigae (Ragoût de Kimchi)',
    'Ragoût coréen réconfortant : kimchi bien fermenté et aigre mijoté avec de la poitrine de bœuf et du tofu dans un bouillon corsé. Plat d''hiver classique, idéal pour utiliser un vieux kimchi.',
    $instr$["Couper le kimchi en morceaux et le bœuf en dés.",
"Chauffer l'huile dans une casserole à fond épais, ajouter le kimchi, le bœuf, le gochugaru et l'ail.",
"Cuire à feu moyen-vif 5 à 7 minutes, jusqu'à ce que le kimchi soit tendre.",
"Verser le jus de kimchi et l'eau, porter à ébullition.",
"Baisser le feu, couvrir et laisser mijoter 15 minutes.",
"Ajouter le tofu en tranches et les oignons verts, rectifier l'assaisonnement en sel et en poivre.",
"Cuire encore 5 minutes.",
"Servir chaud et frémissant, directement dans la cocotte."]
$instr$, 10, 25, 2, 2, 'Coréenne', 'dinner',
    ARRAY['jjigae','kimchi','bœuf','ragoût','réconfortant','coréen','hivernal'],
    'manual', 'https://www.koreanbapsang.com/kimchi-jjigae-kimchi-stew/',
    'https://www.koreanbapsang.com/wp-content/uploads/2014/03/DSC5893-3-e1742780461366.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'kimchi',300,'g',true,1,'bien fermenté et aigre'),
    (v_recipe_id, 'poitrine de bœuf',120,'g',true,2,'ou autre morceau gras, en dés'),
    (v_recipe_id, 'gochugaru',1,'c. à café',true,3,'à ajuster'),
    (v_recipe_id, 'ail',1,'c. à café',true,4,'haché'),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,5,NULL),
    (v_recipe_id, 'jus de kimchi',125,'ml',true,6,NULL),
    (v_recipe_id, 'eau',600,'ml',true,7,NULL),
    (v_recipe_id, 'tofu',180,'g',true,8,'en tranches'),
    (v_recipe_id, 'oignons verts',2,'tige',true,9,'hachés'),
    (v_recipe_id, 'sel',1,'pincée',true,10,'au goût'),
    (v_recipe_id, 'poivre noir',1,'pincée',true,11,'au goût');

  -- 12. Nurungji Baeksuk
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Nurungji Baeksuk (Poulet & Riz Cocotte)',
    'Poulet entier cuit à l''autocuiseur sur du riz gluant qui se transforme en porridge crémeux. La couche de riz grillé au fond (nurungji) apporte une note toastée caractéristique.',
    $instr$["Nettoyer le poulet en retirant l'excédent de graisse aux ciseaux.",
"Rincer le riz gluant, l'égoutter et le verser au fond de l'autocuiseur.",
"Poser le poulet sur le riz, ajouter l'oignon vert, l'ail, le gingembre et l'eau.",
"Fermer le couvercle et lancer le programme volaille pour 25 minutes.",
"Après la cuisson, laisser reposer 10 à 15 minutes sans ouvrir.",
"Retirer le poulet ; si besoin, relancer 5 minutes pour épaissir le porridge.",
"Laisser reposer 10 minutes avant de racler le riz grillé (nurungji) sur les parois.",
"Retirer le gingembre, l'oignon vert et l'ail.",
"Servir le poulet et le porridge ensemble ou séparément, en assaisonnant de sel et de poivre à table."]
$instr$, 10, 45, 4, 2, 'Coréenne', 'dinner',
    ARRAY['poulet','riz gluant','cocotte-minute','porridge','baeksuk','traditionnel','coréen'],
    'manual', 'https://www.koreanbapsang.com/pressure-cooker-nurungji-baeksuk-boiled-chicken-rice/',
    'https://www.koreanbapsang.com/wp-content/uploads/2017/09/DSC_1908-e1505100210251.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'poulet entier',1500,'g',true,1,'1,3 à 1,8 kg'),
    (v_recipe_id, 'riz gluant',280,'g',true,2,'chapssal, rincé'),
    (v_recipe_id, 'oignons verts',1,'tige',true,3,'ou daepa, en morceaux'),
    (v_recipe_id, 'ail',5,'gousse',true,4,'pelées'),
    (v_recipe_id, 'gingembre',2,'tranche',true,5,'environ 2,5 cm'),
    (v_recipe_id, 'eau',1000,'ml',true,6,'ou bouillon'),
    (v_recipe_id, 'sel',1,'c. à café',true,7,'à table'),
    (v_recipe_id, 'poivre',0.5,'c. à café',true,8,'à table');

  -- 13. Hobak Jeon
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Hobak Jeon (Beignets de Courgette)',
    'Beignets coréens de courgette enrobés d''œuf, poêlés rapidement. Plat d''été délicat qui met en valeur la courgette de saison, servi avec une sauce soja-vinaigre.',
    $instr$["Couper les courgettes en rondelles de 8 à 9 mm d'épaisseur et les saler légèrement.",
"Laisser reposer 15 à 20 minutes pour qu'elles rendent leur eau, puis les égoutter.",
"Enrober chaque rondelle de farine sur les deux faces.",
"Chauffer 1 c. à soupe d'huile dans une poêle antiadhésive à feu moyen.",
"Tremper chaque rondelle dans l'œuf battu et la déposer dans la poêle chaude ; décorer le dessus d'un morceau de poivron rouge ou d'une feuille d'herbe si désiré.",
"Cuire environ 1 minute jusqu'à ce que le dessous soit légèrement doré, puis retourner.",
"Cuire encore 1 minute jusqu'à cuisson complète, en ajoutant de l'huile au besoin.",
"Servir chaud avec la sauce (sauce soja, eau et vinaigre)."]
$instr$, 10, 10, 4, 2, 'Coréenne', 'snack',
    ARRAY['courgette','jeon','beignet','œuf','apéritif','coréen','été'],
    'manual', 'https://www.koreanbapsang.com/hobak-jeon-pan-fried-zucchini-in-egg-batter/',
    'https://www.koreanbapsang.com/wp-content/uploads/2021/07/DSC0985-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'courgettes',600,'g',true,1,'2 moyennes'),
    (v_recipe_id, 'sel',1,'c. à café',true,2,NULL),
    (v_recipe_id, 'œufs',2,'unité',true,3,'battus'),
    (v_recipe_id, 'farine',30,'g',true,4,'pour enrober'),
    (v_recipe_id, 'huile de cuisson',3,'c. à soupe',true,5,NULL),
    (v_recipe_id, 'poivron rouge',1,'unité',false,6,'en petits morceaux, décoration, optionnel'),
    (v_recipe_id, 'herbes fraîches',2,'c. à soupe',false,7,'minari ou persil, optionnel'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,8,'sauce'),
    (v_recipe_id, 'eau',1,'c. à soupe',true,9,'sauce'),
    (v_recipe_id, 'vinaigre',1,'c. à café',true,10,'sauce');

  -- 14. Beoseot Gangjeong
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Beoseot Gangjeong (Champignons Croustillants)',
    'Version végétarienne du dakgangjeong : shiitake réhydratés enrobés de fécule, frits puis nappés d''une sauce brillante au gochujang et au sirop de riz. Inspirée de la cuisine des temples coréens.',
    $instr$["Faire tremper les shiitake séchés au moins 2 heures, jusqu'à ce qu'ils soient tendres et gonflés.",
"Les égoutter en pressant l'excès d'eau, retirer les pieds, couper en quartiers et masser avec la fécule pour bien les enrober.",
"Préparer la sauce en mélangeant la sauce soja, le gochujang, le vinaigre de riz, le sirop de riz et le bouillon de légumes ; porter à ébullition puis laisser réduire 4 minutes.",
"Chauffer l'huile à 160 °C et frire les champignons en deux fois, 2 à 3 minutes au total, jusqu'à ce qu'ils soient dorés.",
"Couper le poivron en petits morceaux.",
"Verser la sauce chaude sur les champignons et le poivron.",
"Bien mélanger pour enrober uniformément et servir immédiatement."]
$instr$, 10, 10, 4, 2, 'Coréenne', 'snack',
    ARRAY['champignons','shiitake','gangjeong','végétarien','temple','gochujang','croustillant'],
    'manual', 'https://www.koreanbapsang.com/beoseot-gangjeong-crispy-mushrooms/',
    'https://www.koreanbapsang.com/wp-content/uploads/2020/10/DSC_3146.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'champignons shiitake séchés',60,'g',true,1,'à réhydrater'),
    (v_recipe_id, 'poivron rouge',0.25,'unité',true,2,'en petits morceaux'),
    (v_recipe_id, 'fécule de pomme de terre',40,'g',true,3,'ou fécule de maïs'),
    (v_recipe_id, 'huile végétale',1000,'ml',true,4,'pour la friture'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,5,'sauce'),
    (v_recipe_id, 'gochujang',1,'c. à soupe',true,6,'sauce'),
    (v_recipe_id, 'vinaigre de riz',25,'ml',true,7,'sauce'),
    (v_recipe_id, 'sirop de riz',30,'ml',true,8,'jocheong, ou sirop de maïs'),
    (v_recipe_id, 'bouillon de légumes',20,'ml',true,9,'sauce');

  -- 15. Dubu Jorim
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Dubu Jorim (Tofu Braisé Coréen)',
    'Banchan classique : tranches de tofu ferme dorées à la poêle puis mijotées dans une sauce soja-sésame au gochugaru, à l''ail et aux oignons verts. Accompagnement du quotidien, servi avec du riz.',
    $instr$["Couper le tofu en tranches rectangulaires d'environ 1 cm et les sécher au papier absorbant.",
"Préparer la sauce en mélangeant la sauce soja, l'eau, l'huile de sésame, le sucre, le gochugaru, les graines de sésame, l'ail et les oignons verts.",
"Chauffer l'huile dans une grande poêle antiadhésive à feu moyen-vif et dorer les tranches de tofu 3 à 4 minutes par face.",
"Verser la sauce sur le tofu en la faisant glisser sous les tranches.",
"Laisser mijoter 3 à 4 minutes à feu moyen-doux.",
"Retourner les tranches et poursuivre 1 à 2 minutes pour qu'elles s'imprègnent de sauce.",
"Servir chaud ou froid avec du riz blanc."]
$instr$, 10, 15, 4, 2, 'Coréenne', 'lunch',
    ARRAY['tofu','braisé','banchan','sauce soja','accompagnement','coréen','végétarien'],
    'manual', 'https://www.koreanbapsang.com/dubu-jorim-korean-braised-tofu/',
    'https://www.koreanbapsang.com/wp-content/uploads/2010/03/DSC3340-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'tofu ferme',500,'g',true,1,'1 bloc, égoutté'),
    (v_recipe_id, 'huile végétale',1,'c. à soupe',true,2,'pour dorer'),
    (v_recipe_id, 'sauce soja',3,'c. à soupe',true,3,'sauce'),
    (v_recipe_id, 'eau',3,'c. à soupe',true,4,'sauce'),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,5,'sauce'),
    (v_recipe_id, 'sucre',1,'c. à café',true,6,'sauce'),
    (v_recipe_id, 'gochugaru',1,'c. à café',true,7,'piment coréen en flocons'),
    (v_recipe_id, 'graines de sésame',1,'c. à café',true,8,NULL),
    (v_recipe_id, 'ail',1,'c. à café',true,9,'haché'),
    (v_recipe_id, 'oignons verts',2,'tige',true,10,'hachés fin');

  -- 16. Gamja Jorim
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Gamja Jorim (Pommes de Terre Braisées)',
    'Banchan coréen populaire : pommes de terre en cubes braisées dans une sauce soja légèrement sucrée, avec carotte et piments. Un plat simple et économique qui se conserve bien pour la lunchbox.',
    $instr$["Éplucher les pommes de terre et les couper en cubes réguliers de 2,5 cm.",
"Couper la carotte, les piments et l'oignon en morceaux.",
"Mélanger les ingrédients du braisage (sauce soja, sucre, bouillon de légumes, vinaigre de riz, sirop de maïs, ail, poivre et eau) jusqu'à dissolution.",
"Chauffer l'huile dans une poêle antiadhésive à feu moyen et faire revenir les pommes de terre 4 à 5 minutes.",
"Verser la sauce, porter à ébullition à feu vif et ajouter la carotte.",
"Couvrir et cuire 5 à 6 minutes à feu moyen, jusqu'à ce que les pommes de terre soient presque cuites.",
"Découvrir, ajouter les piments et l'oignon et poursuivre l'ébullition 3 minutes, jusqu'à ce que la sauce épaississe.",
"Ajouter l'huile de sésame et les graines de sésame avant de servir."]
$instr$, 10, 15, 4, 2, 'Coréenne', 'lunch',
    ARRAY['pommes de terre','jorim','braisé','banchan','accompagnement','sauce soja','coréen'],
    'manual', 'https://www.koreanbapsang.com/gamja-jorim-braised-potatoes/',
    'https://www.koreanbapsang.com/wp-content/uploads/2009/11/DSC3017.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'pommes de terre',675,'g',true,1,'en cubes de 2,5 cm'),
    (v_recipe_id, 'carotte',85,'g',true,2,'en morceaux'),
    (v_recipe_id, 'piments verts',2,'unité',true,3,'ou ½ poivron vert'),
    (v_recipe_id, 'oignon',60,'g',true,4,'en gros morceaux'),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,5,NULL),
    (v_recipe_id, 'sauce soja',3,'c. à soupe',true,6,'ou 2 c. à soupe + 1 c. à soupe de gochujang'),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,7,NULL),
    (v_recipe_id, 'bouillon de légumes',2,'c. à café',true,8,'sauce'),
    (v_recipe_id, 'vinaigre de riz',1,'c. à café',true,9,'sauce'),
    (v_recipe_id, 'sirop de maïs',1,'c. à soupe',true,10,'ou un peu plus de sucre'),
    (v_recipe_id, 'ail',1,'c. à café',true,11,'haché'),
    (v_recipe_id, 'poivre noir',1,'pincée',true,12,NULL),
    (v_recipe_id, 'eau',180,'ml',true,13,NULL),
    (v_recipe_id, 'huile de sésame',1,'c. à café',true,14,'finition'),
    (v_recipe_id, 'graines de sésame',0.5,'c. à café',true,15,'grillées');

  -- 17. Oi Kimchi
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Oi Kimchi (Kimchi de Concombre)',
    'Kimchi d''été express aux concombres frais : croustillant, rafraîchissant et légèrement piquant. Prêt en moins d''une heure, sans farce complexe — une version simplifiée de l''oi sobagi.',
    $instr$["Couper les concombres en quatre dans la longueur, puis en morceaux de 2 à 4 cm.",
"Saupoudrer de gros sel, mélanger et laisser reposer 30 minutes.",
"Verser dans une passoire et laisser égoutter complètement (ne pas rincer).",
"Couper la ciboulette chinoise en tronçons de 4 cm et émincer finement l'oignon.",
"Mélanger les concombres avec l'oignon, la ciboulette et tous les assaisonnements (gochugaru, sauce de poisson, crevettes salées, ail, gingembre, sucre, graines de sésame).",
"Bien mélanger jusqu'à ce que tout soit enrobé.",
"Laisser reposer quelques heures à température ambiante pour une légère fermentation, ou réfrigérer immédiatement pour une version fraîche.",
"Se conserve 2 semaines au réfrigérateur."]
$instr$, 45, 0, 4, 1, 'Coréenne', 'snack',
    ARRAY['kimchi','concombre','accompagnement','fermenté','été','rapide','coréen'],
    'manual', 'https://www.koreanbapsang.com/oi-kimchi-cucumber-kimchi-and-blog/',
    'https://www.koreanbapsang.com/wp-content/uploads/2018/07/DSC_0049_1024-e1690924639259.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'concombres',680,'g',true,1,'petits (coréens ou Kirby), en morceaux de 2 à 4 cm'),
    (v_recipe_id, 'gros sel',1,'c. à soupe',true,2,'de mer'),
    (v_recipe_id, 'ciboulette chinoise',75,'g',true,3,'buchu, ou oignons verts'),
    (v_recipe_id, 'oignon',0.5,'unité',true,4,'émincé fin'),
    (v_recipe_id, 'gochugaru',3,'c. à soupe',true,5,'piment coréen en flocons'),
    (v_recipe_id, 'sauce de poisson',1,'c. à soupe',true,6,'aux anchois (myulchi aekjeot)'),
    (v_recipe_id, 'crevettes salées',1,'c. à soupe',true,7,'fermentées (saeujeot)'),
    (v_recipe_id, 'ail',1,'c. à soupe',true,8,'haché'),
    (v_recipe_id, 'gingembre',0.5,'c. à café',true,9,'râpé'),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'graines de sésame',1,'c. à café',false,11,'grillées');

END $$;
