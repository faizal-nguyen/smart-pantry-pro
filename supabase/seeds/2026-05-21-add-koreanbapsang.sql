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
    'Sandwich coréen de rue : omelette aux légumes (chou, carotte, oignon) entre deux tranches de pain beurré et grillé, garni de sucre et ketchup. Petit-déjeuner emblématique de Séoul.',
    $instr$["Émincer finement chou, oignon et carotte en julienne ; couper la ciboulette en tronçons.",
"Faire fondre le beurre à feu moyen et griller les tranches de pain 1-2 minutes par face.",
"Mélanger les légumes (en réserver 1/5) avec une pincée de sel et l'œuf battu ; écraser à la fourchette 20 secondes.",
"Réchauffer le beurre dans la poêle, verser le mélange et l'aplatir en galette ronde, garnir du reste de légumes.",
"Cuire 3 minutes jusqu'à croûte dorée, retourner et poursuivre 2 minutes.",
"Placer l'omelette sur une tranche de pain, saupoudrer généreusement de sucre et arroser de ketchup.",
"Fermer le sandwich avec la 2e tranche et servir immédiatement."]
$instr$, 10, 5, 1, 2, 'Coréenne', 'breakfast',
    ARRAY['toast','sandwich','street-food','œuf','petit-déjeuner','séoul','coréen'],
    'manual', 'https://www.koreanbapsang.com/gilgeori-toast-korean-street-toast/',
    'https://www.koreanbapsang.com/wp-content/uploads/2022/02/DSC4264-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'pain de mie',2,'tranche',true,1,'blanc ou complet'),
    (v_recipe_id, 'chou vert',100,'g',true,2,'émincé fin'),
    (v_recipe_id, 'carotte',15,'g',true,3,'râpée'),
    (v_recipe_id, 'oignon',15,'g',true,4,'haché fin'),
    (v_recipe_id, 'ciboulette',2,'brin',true,5,'en tronçons 4 cm'),
    (v_recipe_id, 'œuf',1,'unité',true,6,'gros'),
    (v_recipe_id, 'sel',1,'pincée',true,7,NULL),
    (v_recipe_id, 'poivre noir',1,'pincée',true,8,NULL),
    (v_recipe_id, 'beurre',2,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,10,'généreuse'),
    (v_recipe_id, 'ketchup',1,'c. à soupe',true,11,NULL);

  -- 2. Gungjung Tteokbokki
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Gungjung Tteokbokki (Royal Court)',
    'Tteokbokki traditionnel de la cuisine royale Joseon : gâteaux de riz sautés à la sauce soja (non épicé) avec bœuf, shiitake et légumes. Plat festif du Nouvel An lunaire.',
    $instr$["Mélanger les ingrédients de sauce (sauce soja, mirin, sucre, huile de sésame, graines, ail, poivre) ; réserver 2 c. à soupe pour enrober les gâteaux.",
"Faire bouillir les gâteaux de riz garaetteok jusqu'à ce qu'ils remontent en surface, égoutter et enrober de sauce réservée.",
"Trancher le bœuf en lanières fines et émincer les shiitake, les mariner 10-15 minutes dans 1 c. à soupe de sauce.",
"Saler généreusement les courgettes en tranches 10-15 minutes puis presser l'excès d'eau.",
"Faire revenir oignon, carotte et courgette 2 minutes à feu moyen-vif, ajouter les oignons verts en fin.",
"Dans la même poêle, cuire bœuf et shiitake 1-2 minutes jusqu'à viande cuite.",
"Ajouter les gâteaux de riz et cuire 1-2 minutes en mélangeant.",
"Éteindre le feu et combiner avec la sauce restante. Servir chaud."]
$instr$, 15, 10, 4, 2, 'Coréenne', 'lunch',
    ARRAY['tteokbokki','cuisine royale','sauce soja','traditionnel','nouvel-an-lunaire','non-épicé','gâteaux de riz'],
    'manual', 'https://www.koreanbapsang.com/gungjung-tteokbokki-and-lunar-new-year/',
    'https://www.koreanbapsang.com/wp-content/uploads/2014/01/DSC6960.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'gâteaux de riz garaetteok',500,'g',true,1,'morceaux 5 cm'),
    (v_recipe_id, 'bœuf maigre',120,'g',true,2,'tranches fines'),
    (v_recipe_id, 'champignons shiitake frais',4,'unité',true,3,'émincés'),
    (v_recipe_id, 'courgette',100,'g',true,4,'tranchée fin'),
    (v_recipe_id, 'carotte',1,'unité',true,5,'en bâtonnets fins'),
    (v_recipe_id, 'oignon doux',0.5,'unité',true,6,'émincé'),
    (v_recipe_id, 'oignons verts',2,'tige',true,7,'en tronçons 5 cm'),
    (v_recipe_id, 'sauce soja',3,'c. à soupe',true,8,'sauce'),
    (v_recipe_id, 'mirin',1,'c. à soupe',true,9,'sauce'),
    (v_recipe_id, 'sucre',1,'c. à soupe',true,10,'sauce'),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,11,'sauce'),
    (v_recipe_id, 'graines de sésame',1,'c. à café',true,12,NULL),
    (v_recipe_id, 'ail',2,'c. à café',true,13,'haché'),
    (v_recipe_id, 'poivre noir',1,'pincée',true,14,NULL),
    (v_recipe_id, 'huile de cuisson',2,'c. à soupe',true,15,NULL);

  -- 3. Dakgangjeong
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Dakgangjeong (Sweet Crispy Chicken)',
    'Poulet frit coréen en bouchées désossées, double-frit pour la croustillance puis nappé d''une sauce gochujang-miel-soja collante. Garni de cacahuètes ou graines concassées.',
    $instr$["Retirer le gras visible du poulet et découper en bouchées uniformes.",
"Tremper dans le lait 30 minutes au frigo (attendrissement).",
"Égoutter et assaisonner avec sel, poivre, ail, gingembre et vin de riz 20-30 minutes.",
"Mélanger tous les ingrédients de sauce dans une casserole, porter à ébullition puis mijoter 3-4 minutes jusqu'à épaississement.",
"Enrober chaque morceau de fécule de pomme de terre.",
"Chauffer l'huile à 165°C, frire par lots 3 minutes jusqu'à dorage léger.",
"Égoutter sur papier, réchauffer l'huile et refrire 1-2 minutes jusqu'à doré uniforme.",
"Réchauffer la sauce à feu moyen-doux, ajouter le poulet frit et bien enrober.",
"Verser dans un plat et garnir de cacahuètes ou graines concassées."]
$instr$, 90, 20, 4, 3, 'Coréenne', 'snack',
    ARRAY['poulet frit','gochujang','double-friture','sucré-épicé','apéritif','coréen','street-food'],
    'manual', 'https://www.koreanbapsang.com/dakgangjeong-sweet-crispy-chicken/',
    'https://www.koreanbapsang.com/wp-content/uploads/2014/03/DSC5354_01-2-e1644534672706.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'poulet désossé',450,'g',true,1,'cuisses ou blancs en bouchées'),
    (v_recipe_id, 'lait',120,'ml',false,2,'pour attendrir, optionnel'),
    (v_recipe_id, 'sel',0.25,'c. à café',true,3,NULL),
    (v_recipe_id, 'poivre',1,'pincée',true,4,NULL),
    (v_recipe_id, 'ail',0.5,'c. à café',true,5,'haché'),
    (v_recipe_id, 'gingembre',0.5,'c. à café',true,6,'râpé'),
    (v_recipe_id, 'vin de riz',1,'c. à soupe',true,7,NULL),
    (v_recipe_id, 'fécule de pomme de terre',80,'ml',true,8,NULL),
    (v_recipe_id, 'huile végétale',1500,'ml',true,9,'friture'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,10,'sauce'),
    (v_recipe_id, 'mirin',45,'ml',true,11,'sauce'),
    (v_recipe_id, 'vinaigre de cidre',30,'ml',true,12,'sauce'),
    (v_recipe_id, 'gochujang',1,'c. à soupe',true,13,'sauce'),
    (v_recipe_id, 'miel',45,'ml',true,14,'ou sirop'),
    (v_recipe_id, 'huile de sésame',10,'ml',true,15,'sauce'),
    (v_recipe_id, 'sucre brun',30,'g',true,16,'sauce'),
    (v_recipe_id, 'cacahuètes',30,'g',true,17,'garniture');

  -- 4. Kimchijeon
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Kimchijeon (Crêpe au Kimchi)',
    'Crêpe coréenne salée et croustillante au kimchi fermenté. Pâte ultra-simple à base de farine et jus de kimchi, idéale comme apéritif ou repas léger.',
    $instr$["Émincer le kimchi en lanières de 1 cm et couper les oignons verts en tronçons de 5 cm.",
"Mélanger farine, jus de kimchi, gochujang dissous (optionnel) et œuf, ajouter l'eau froide progressivement sans surtravailler.",
"Vérifier la consistance : la pâte doit s'écouler facilement à la cuillère.",
"Incorporer kimchi tranché, oignons verts, oignon émincé et protéines optionnelles.",
"Chauffer 1 c. à soupe d'huile dans une poêle antiadhésive à feu moyen-vif, verser la pâte et l'étaler en rond fin.",
"Cuire ~3 minutes jusqu'à dorage des bords, retourner délicatement.",
"Ajouter de l'huile autour, presser légèrement et cuire 2-3 minutes jusqu'à croustillant.",
"Servir chaud avec sauce d'accompagnement (sauce soja-vinaigre)."]
$instr$, 10, 12, 3, 2, 'Coréenne', 'snack',
    ARRAY['crêpe','kimchi','jeon','apéritif','coréen','rapide','fermenté'],
    'manual', 'https://www.koreanbapsang.com/kimchi-jeon-kimchi-pancake/',
    'https://www.koreanbapsang.com/wp-content/uploads/2010/02/DSC0780-2-e1644441498766.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'kimchi fermenté',250,'ml',true,1,'tranché fin'),
    (v_recipe_id, 'oignons verts',2,'tige',true,2,'en tronçons'),
    (v_recipe_id, 'oignon',0.25,'unité',true,3,'émincé'),
    (v_recipe_id, 'porc haché ou thon',85,'g',false,4,'optionnel'),
    (v_recipe_id, 'farine',310,'ml',true,5,'tout usage'),
    (v_recipe_id, 'jus de kimchi',45,'ml',true,6,'crucial'),
    (v_recipe_id, 'gochujang',2,'c. à café',false,7,'optionnel'),
    (v_recipe_id, 'œuf',1,'unité',false,8,'optionnel'),
    (v_recipe_id, 'eau très froide',250,'ml',true,9,NULL),
    (v_recipe_id, 'huile de cuisson',3,'c. à soupe',true,10,'haut point de fumée');

  -- 5. Tteokbokki (Spicy)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Tteokbokki (Spicy Rice Cakes)',
    'Street-food coréen emblématique : gâteaux de riz mijotés dans une sauce épicée gochujang-gochugaru avec gâteau de poisson eomuk, chou et bouillon d''anchois. Sucré-épicé irrésistible.',
    $instr$["Tremper les gâteaux de riz dans l'eau ≥20 minutes pour les ramollir.",
"Découper le gâteau de poisson, le chou et les oignons verts en bouchées.",
"Porter le bouillon d'anchois à ébullition dans une grande casserole.",
"Incorporer gochujang, gochugaru, sauce soja, sucre et sirop de maïs ; bien mélanger.",
"Ajouter les gâteaux de riz trempés et cuire 8-10 minutes jusqu'à tendres et sauce épaissie.",
"Incorporer chou, gâteau de poisson et ail ; poursuivre 4-6 minutes.",
"Ajouter les oignons verts 2-3 minutes avant la fin, ajuster l'assaisonnement.",
"Servir chaud."]
$instr$, 20, 20, 3, 2, 'Coréenne', 'snack',
    ARRAY['tteokbokki','gochujang','street-food','épicé','gâteaux de riz','coréen','réconfortant'],
    'manual', 'https://www.koreanbapsang.com/tteokbokki-spicy-stir-fried-rice-cakes/',
    'https://www.koreanbapsang.com/wp-content/uploads/2018/09/DSC4637-4.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'gâteaux de riz tteokbokki',500,'g',true,1,'~24 morceaux 7,5 cm'),
    (v_recipe_id, 'gâteau de poisson eomuk',2,'feuille',true,2,NULL),
    (v_recipe_id, 'chou vert',120,'g',true,3,'en bouchées'),
    (v_recipe_id, 'oignons verts',2,'tige',true,4,'en tronçons'),
    (v_recipe_id, 'gingembre',1,'c. à soupe',true,5,'haché fin'),
    (v_recipe_id, 'ail',2,'c. à café',true,6,'haché'),
    (v_recipe_id, 'bouillon d''anchois',750,'ml',true,7,'ou eau'),
    (v_recipe_id, 'gochujang',3,'c. à soupe',true,8,NULL),
    (v_recipe_id, 'gochugaru',1,'c. à soupe',true,9,'à ajuster'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'sucre',2,'c. à soupe',true,11,NULL),
    (v_recipe_id, 'sirop de maïs',1,'c. à soupe',true,12,NULL);

  -- 6. Mayak Gimbap
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Mayak Gimbap (Mini Gimbap Addictif)',
    'Petits rouleaux de gimbap surnommés "drug gimbap" pour leur côté addictif. Spécialité du marché Gwangjang : minimalistes (riz, épinards, carotte, danmuji) servis avec sauce moutarde-soja épicée.',
    $instr$["Cuire le riz avec un peu moins d'eau que normalement.",
"Blanchir les épinards, refroidir, presser l'eau et assaisonner d'huile de sésame et sel.",
"Émincer les carottes et les faire revenir rapidement à la poêle.",
"Couper les radis marinés danmuji en lanières fines.",
"Mélanger le riz chaud avec huile de sésame et sel en soulevant délicatement.",
"Couper 4 feuilles de gim en quartiers (16 mini-feuilles).",
"Étaler le riz finement sur chaque mini-feuille, disposer les garnitures.",
"Rouler serré en repliant les bords délicatement.",
"Badigeonner d'huile de sésame pour la brillance.",
"Mélanger les ingrédients de sauce moutarde jusqu'à dissolution du sucre, servir en accompagnement."]
$instr$, 30, 20, 2, 2, 'Coréenne', 'lunch',
    ARRAY['gimbap','mini-rouleaux','riz','nori','street-food','gwangjang','mayak'],
    'manual', 'https://www.koreanbapsang.com/mini-gimbap-mayak-gimbap/',
    'https://www.koreanbapsang.com/wp-content/uploads/2015/05/DSC_0917-2-e1566061945769.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'riz à grain court',300,'g',true,1,'non cuit'),
    (v_recipe_id, 'huile de sésame',2,'c. à café',true,2,'pour le riz'),
    (v_recipe_id, 'sel',0.5,'c. à café',true,3,NULL),
    (v_recipe_id, 'épinards',150,'g',true,4,NULL),
    (v_recipe_id, 'carotte',1,'unité',true,5,'juliennée'),
    (v_recipe_id, 'radis marinés danmuji',4,'bâton',true,6,NULL),
    (v_recipe_id, 'feuilles de gim',4,'unité',true,7,'à quartiers'),
    (v_recipe_id, 'graines de sésame moulues',1,'c. à soupe',true,8,'sauce'),
    (v_recipe_id, 'vinaigre',1,'c. à soupe',true,9,'sauce'),
    (v_recipe_id, 'sauce soja',1,'c. à café',true,10,'sauce'),
    (v_recipe_id, 'moutarde Dijon',1,'c. à café',true,11,'sauce'),
    (v_recipe_id, 'sucre',2,'c. à café',true,12,'sauce');

  -- 7. Yangnyeom Chicken
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Yangnyeom Chicken (Poulet Frit Coréen)',
    'Poulet frit coréen croustillant glacé d''une sauce rouge épicée (gochujang, sauce piquante, miel, ail). Double-friture pour la peau fine et croustillante (ChiMaek = poulet + bière).',
    $instr$["Laver et égoutter les ailes de poulet, mélanger avec sel, poivre et gingembre râpé ; réfrigérer ≥2 heures (idéalement une nuit).",
"Préparer la sauce : porter à ébullition tous les ingrédients dans une casserole et laisser épaissir 4-5 minutes ; retirer du feu.",
"Pâte mouille : fouetter mélange à friture, fécule et eau jusqu'à lisse.",
"Chauffer l'huile à 160-165°C. Tremper chaque morceau dans la pâte en secouant l'excédent.",
"Frire en lots ~6 minutes jusqu'à coloration légère.",
"Laisser refroidir quelques minutes, remonter l'huile à 175-180°C.",
"Refrire ~5 minutes jusqu'à doré uniforme et très croustillant.",
"Égoutter sur grille, puis enrober totalement de sauce ou badigeonner.",
"Garnir de graines de sésame et oignons verts, servir immédiatement."]
$instr$, 25, 20, 4, 3, 'Coréenne', 'dinner',
    ARRAY['poulet frit','coréen','yangnyeom','double-friture','gochujang','chimaek','street-food'],
    'manual', 'https://www.koreanbapsang.com/yangnyeom-chicken-korean-fried-chicken/',
    'https://www.koreanbapsang.com/wp-content/uploads/2022/03/DSC5754-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'ailes de poulet',900,'g',true,1,'drumettes + ailettes séparées'),
    (v_recipe_id, 'sel',1.5,'c. à café',true,2,NULL),
    (v_recipe_id, 'poivre noir',1,'pincée',true,3,NULL),
    (v_recipe_id, 'gingembre',1,'c. à café',true,4,'râpé'),
    (v_recipe_id, 'huile végétale',1200,'ml',true,5,'friture'),
    (v_recipe_id, 'mélange à friture',60,'g',true,6,'ou farine + levure'),
    (v_recipe_id, 'fécule de pomme de terre',30,'g',true,7,'pour pâte mouille'),
    (v_recipe_id, 'eau',180,'ml',true,8,'pâte mouille'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,9,'sauce'),
    (v_recipe_id, 'vin de riz',2,'c. à soupe',true,10,'ou mirin'),
    (v_recipe_id, 'gochujang',1.5,'c. à soupe',true,11,NULL),
    (v_recipe_id, 'sauce piquante',2,'c. à soupe',true,12,'sriracha ou similaire'),
    (v_recipe_id, 'sucre',2,'c. à soupe',true,13,NULL),
    (v_recipe_id, 'miel',2,'c. à soupe',true,14,'ou sirop'),
    (v_recipe_id, 'ail',1,'c. à soupe',true,15,'haché'),
    (v_recipe_id, 'eau',4,'c. à soupe',true,16,'sauce');

  -- 8. Bibimbap (Korean Bapsang)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Bibimbap (Korean Bapsang)',
    'Bibimbap traditionnel : riz, bœuf mariné, légumes assortis assaisonnés individuellement (épinards, germes de soja, concombre, champignons, carottes), œuf et sauce gochujang. Variante dolsot disponible.',
    $instr$["Cuire le riz avec moins d'eau pour une texture plus sèche.",
"Mariner le bœuf en lanières 20 minutes dans sauce soja, sucre, huile de sésame, vin, ail et oignon, puis sauter 2-3 minutes à feu vif.",
"Blanchir germes de soja et épinards séparément, refroidir, égoutter et assaisonner avec ail, huile de sésame et graines de sésame.",
"Saler les concombres tranchés 10-15 minutes, presser l'eau et assaisonner avec oignon vert, ail et huile de sésame.",
"Trancher champignons et carottes finement, les faire sauter séparément 1-2 minutes.",
"Préparer la sauce en mélangeant gochujang, sucre, huile de sésame et eau jusqu'à lisse.",
"Disposer le riz dans un bol, arranger délicatement chaque légume et la viande sur le riz.",
"Ajouter un œuf au plat et un trait d'huile de sésame, servir avec la sauce gochujang.",
"Pour le dolsot : chauffer un bol en pierre à feu moyen, ajouter riz et garnitures, cuire quelques minutes jusqu'à grésillant.",
"Bien mélanger avec la sauce à table avant de déguster."]
$instr$, 25, 30, 4, 3, 'Coréenne', 'dinner',
    ARRAY['bibimbap','riz','légumes','gochujang','bœuf','dolsot','coréen'],
    'manual', 'https://www.koreanbapsang.com/bibimbap/',
    'https://www.koreanbapsang.com/wp-content/uploads/2018/09/DSC3740-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'riz à grain court',600,'g',true,1,'cuit'),
    (v_recipe_id, 'bœuf tranché fin',225,'g',true,2,'entrecôte ou faux-filet'),
    (v_recipe_id, 'sauce soja',30,'ml',true,3,'marinade'),
    (v_recipe_id, 'sucre',10,'ml',true,4,'marinade'),
    (v_recipe_id, 'huile de sésame',10,'ml',true,5,'marinade'),
    (v_recipe_id, 'vin de cuisine',10,'ml',true,6,NULL),
    (v_recipe_id, 'ail',5,'ml',true,7,'haché'),
    (v_recipe_id, 'oignon nouveau',15,'ml',true,8,'haché'),
    (v_recipe_id, 'germes de soja',225,'g',true,9,NULL),
    (v_recipe_id, 'épinards',225,'g',true,10,NULL),
    (v_recipe_id, 'concombres',2,'unité',true,11,'petits'),
    (v_recipe_id, 'champignons',115,'g',true,12,NULL),
    (v_recipe_id, 'carottes',2,'unité',true,13,'moyennes'),
    (v_recipe_id, 'œufs',4,'unité',true,14,NULL),
    (v_recipe_id, 'gochujang',60,'ml',true,15,'sauce'),
    (v_recipe_id, 'sucre',10,'ml',true,16,'sauce'),
    (v_recipe_id, 'huile de sésame',15,'ml',true,17,'sauce'),
    (v_recipe_id, 'eau',15,'ml',true,18,'sauce');

  -- 9. Kimchi Ssambap
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Kimchi Ssambap (Rouleaux Riz-Kimchi)',
    'Rouleaux portables : boules de riz frit aux légumes et bœuf, enrobées dans des feuilles de kimchi fermenté. Parfait pour lunchbox et pique-nique, équilibre sucré-aigre-épicé.',
    $instr$["Presser le liquide du kimchi, retirer la partie blanche épaisse, rincer si souhaité pour adoucir.",
"Hacher finement tous les légumes : oignon, carotte, poivron et champignons.",
"Chauffer l'huile à feu moyen, cuire le bœuf haché jusqu'à brunissement puis ajouter les légumes 2 minutes.",
"Incorporer le riz cuit avec sauce soja, bien mélanger 2-3 minutes jusqu'à uniformité, saler/poivrer.",
"Verser l'huile de sésame et les graines, bien mélanger.",
"Former des petites boules de riz avec les paumes lorsque suffisamment refroidi.",
"Placer une feuille de kimchi, ajouter une boule de riz près du bord.",
"Enrouler le kimchi autour du riz, replier les côtés et fermer.",
"Répéter jusqu'à épuisement du riz."]
$instr$, 15, 10, 2, 2, 'Coréenne', 'lunch',
    ARRAY['ssambap','kimchi','riz','rouleaux','lunchbox','portable','coréen'],
    'manual', 'https://www.koreanbapsang.com/kimchi-ssambap-kimchi-wrapped-rice-rolls/',
    'https://www.koreanbapsang.com/wp-content/uploads/2014/04/DSC9062.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'feuilles de kimchi',10,'unité',true,1,'parties feuillues'),
    (v_recipe_id, 'oignon',0.25,'unité',true,2,'haché fin'),
    (v_recipe_id, 'carotte',0.5,'unité',true,3,'hachée fin'),
    (v_recipe_id, 'poivron vert',0.25,'unité',true,4,'haché fin'),
    (v_recipe_id, 'champignons',3,'unité',true,5,'hachés fin'),
    (v_recipe_id, 'bœuf haché',100,'g',true,6,NULL),
    (v_recipe_id, 'huile de cuisson',2,'c. à soupe',true,7,NULL),
    (v_recipe_id, 'riz cuit',400,'g',true,8,'refroidi'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'huile de sésame',1,'c. à soupe',true,10,'finition'),
    (v_recipe_id, 'graines de sésame',1,'c. à café',true,11,'garniture'),
    (v_recipe_id, 'sel',1,'pincée',true,12,NULL),
    (v_recipe_id, 'poivre',1,'pincée',true,13,NULL);

  -- 10. Kimchi Bulgogi Cheesesteak
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Kimchi Bulgogi Cheesesteak',
    'Fusion coréano-américaine : bulgogi mariné et kimchi sauté sur pain grillé recouvert de fromage fondu. Mayonnaise au gochujang en option pour le piquant supplémentaire.',
    $instr$["Faire fondre le beurre dans une poêle préchauffée à feu moyen, griller les pains côté coupé jusqu'à dorés.",
"Cuire le bulgogi mariné à feu vif en émiettant la viande, ou réchauffer si déjà cuit.",
"Dans une autre poêle, faire revenir le kimchi émincé avec un peu d'huile 3-4 minutes jusqu'à ramollissement.",
"Ajouter le fromage râpé sur le kimchi, couvrir et laisser fondre à feu moyen-doux.",
"Mélanger la mayonnaise avec gochujang si désiré.",
"Assembler : placer la laitue sur le pain inférieur, ajouter bulgogi puis mélange kimchi-fromage.",
"Garnir de mayo gochujang selon préférence et fermer."]
$instr$, 10, 15, 2, 2, 'Coréenne', 'lunch',
    ARRAY['bulgogi','kimchi','sandwich','cheesesteak','fusion','bœuf','américain'],
    'manual', 'https://www.koreanbapsang.com/kimchi-bulgogi-cheesesteak/',
    'https://www.koreanbapsang.com/wp-content/uploads/2021/04/DSC9694.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'bulgogi mariné',227,'g',true,1,'cru ou cuit'),
    (v_recipe_id, 'kimchi',120,'ml',true,2,'tranché'),
    (v_recipe_id, 'oignon',0.5,'unité',false,3,'émincé, optionnel'),
    (v_recipe_id, 'fromage râpé',120,'ml',true,4,'mozzarella ou provolone'),
    (v_recipe_id, 'pains à hamburger',2,'unité',true,5,NULL),
    (v_recipe_id, 'beurre',1,'c. à soupe',true,6,'pour griller'),
    (v_recipe_id, 'feuilles de laitue',2,'unité',true,7,NULL),
    (v_recipe_id, 'mayonnaise',30,'ml',false,8,'optionnel'),
    (v_recipe_id, 'gochujang',5,'ml',false,9,'optionnel');

  -- 11. Kimchi Jjigae
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Kimchi Jjigae (Ragoût de Kimchi)',
    'Ragoût coréen réconfortant : kimchi fermenté bien aigre et porc gras mijotés dans un bouillon corsé avec tofu. Plat hivernal classique, idéal pour utiliser le vieux kimchi.',
    $instr$["Découper le kimchi en morceaux et le porc en dés.",
"Chauffer l'huile dans une casserole épaisse, ajouter kimchi, porc, gochugaru et ail.",
"Cuire à feu moyen-vif jusqu'à kimchi tendre, ~5-7 minutes.",
"Verser le jus de kimchi et 500-625 ml d'eau, porter à ébullition.",
"Réduire le feu et couvrir, mijoter 15 minutes.",
"Ajouter le tofu en tranches et les oignons verts, ajuster sel et poivre.",
"Cuire 5 minutes supplémentaires.",
"Servir chaud et bouillonnant directement en cocotte."]
$instr$, 10, 25, 2, 2, 'Coréenne', 'dinner',
    ARRAY['jjigae','kimchi','porc','ragoût','réconfortant','coréen','hivernal'],
    'manual', 'https://www.koreanbapsang.com/kimchi-jjigae-kimchi-stew/',
    'https://www.koreanbapsang.com/wp-content/uploads/2014/03/DSC5893-3-e1742780461366.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'kimchi fermenté',300,'g',true,1,'bien aigre'),
    (v_recipe_id, 'porc belly',120,'g',true,2,'ou porc gras'),
    (v_recipe_id, 'gochugaru',1,'c. à café',true,3,'à ajuster'),
    (v_recipe_id, 'ail',1,'c. à café',true,4,'haché'),
    (v_recipe_id, 'huile de cuisson',1,'c. à soupe',true,5,NULL),
    (v_recipe_id, 'jus de kimchi',125,'ml',true,6,NULL),
    (v_recipe_id, 'eau',600,'ml',true,7,NULL),
    (v_recipe_id, 'tofu',180,'g',true,8,'en tranches'),
    (v_recipe_id, 'oignons verts',2,'tige',true,9,'hachés');

  -- 12. Nurungji Baeksuk
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Nurungji Baeksuk (Poulet & Riz Cocotte)',
    'Poulet entier mijoté en cocotte-minute avec riz gluant qui se transforme en porridge crémeux. La couche de riz brûlé au fond (nurungji) apporte une note grillée caractéristique.',
    $instr$["Nettoyer le poulet en retirant l'excédent de graisse aux ciseaux.",
"Rincer le riz gluant, l'égoutter et le verser au fond de la cocotte-minute.",
"Placer le poulet sur le riz, ajouter oignon-tige, ail, gingembre et liquide.",
"Fermer le couvercle, lancer la fonction volaille à 25 minutes.",
"Laisser reposer 10-15 minutes sans ouvrir après la cuisson.",
"Retirer le poulet, éventuellement relancer 5 minutes pour épaissir le porridge.",
"Laisser reposer 10 minutes avant de racler le riz brûlé (nurungji) des parois.",
"Retirer gingembre, oignon-tige et ail.",
"Servir poulet et porridge ensemble ou séparément, assaisonner sel-poivre à table."]
$instr$, 10, 25, 4, 2, 'Coréenne', 'dinner',
    ARRAY['poulet','riz gluant','cocotte-minute','porridge','baeksuk','traditionnel','coréen'],
    'manual', 'https://www.koreanbapsang.com/pressure-cooker-nurungji-baeksuk-boiled-chicken-rice/',
    'https://www.koreanbapsang.com/wp-content/uploads/2017/09/DSC_1908-e1505100210251.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'poulet entier',1500,'g',true,1,'1,3-1,8 kg'),
    (v_recipe_id, 'riz gluant (chapssal)',280,'g',true,2,'rincé'),
    (v_recipe_id, 'oignon-tige',1,'unité',true,3,'en morceaux'),
    (v_recipe_id, 'ail',5,'gousse',true,4,'pelée'),
    (v_recipe_id, 'gingembre',2,'tranche',true,5,'~2,5 cm'),
    (v_recipe_id, 'eau',1000,'ml',true,6,'ou bouillon'),
    (v_recipe_id, 'sel',1,'c. à café',true,7,'à table'),
    (v_recipe_id, 'poivre',0.5,'c. à café',true,8,'à table');

  -- 13. Hobak Jeon
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Hobak Jeon (Beignets de Courgette)',
    'Beignets coréens de courgette en pâte à œuf, poêlés rapidement. Plat estival délicat qui valorise la courgette nouvelle de saison. Servi avec sauce soja-vinaigre.',
    $instr$["Trancher les courgettes en rondelles de 8-9 mm d'épaisseur et les saler légèrement.",
"Laisser reposer 15-20 minutes pour libérer l'humidité, puis égoutter l'excédent.",
"Enrober chaque tranche des deux côtés de farine.",
"Chauffer une poêle antiadhésive avec une c. à soupe d'huile à feu moyen.",
"Tremper chaque tranche dans l'œuf battu et déposer dans la poêle chaude.",
"Cuire ~1 minute jusqu'à dorage léger, puis retourner.",
"Décorer avec poivron rouge ou herbes optionnelles avant retournement final si désiré.",
"Cuire encore 1 minute jusqu'à cuisson complète.",
"Servir chaud avec la sauce (sauce soja + eau + vinaigre)."]
$instr$, 10, 10, 4, 2, 'Coréenne', 'snack',
    ARRAY['courgette','jeon','beignet','œuf','apéritif','coréen','été'],
    'manual', 'https://www.koreanbapsang.com/hobak-jeon-pan-fried-zucchini-in-egg-batter/',
    'https://www.koreanbapsang.com/wp-content/uploads/2021/07/DSC0985-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'courgettes',600,'g',true,1,'2 unités moyennes'),
    (v_recipe_id, 'sel',1,'c. à café',true,2,NULL),
    (v_recipe_id, 'œufs',2,'unité',true,3,'battus'),
    (v_recipe_id, 'farine',60,'ml',true,4,'pour enrober'),
    (v_recipe_id, 'huile de cuisson',3,'c. à soupe',true,5,NULL),
    (v_recipe_id, 'poivron rouge',1,'unité',false,6,'tranches, optionnel'),
    (v_recipe_id, 'herbes fraîches',2,'c. à soupe',false,7,'minari ou persil'),
    (v_recipe_id, 'sauce soja',15,'ml',true,8,'sauce'),
    (v_recipe_id, 'eau',15,'ml',true,9,'sauce'),
    (v_recipe_id, 'vinaigre',5,'ml',true,10,'sauce');

  -- 14. Beoseot Gangjeong
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Beoseot Gangjeong (Champignons Croustillants)',
    'Version végétarienne du dakgangjeong : shiitake réhydratés enrobés de fécule, frits puis nappés d''une sauce gochujang-sirop de riz brillante. Inspiration cuisine de temple coréenne.',
    $instr$["Tremper les champignons shiitake séchés ≥2 heures jusqu'à tendres et gonflés.",
"Égoutter, couper en quartiers et masser avec la fécule pour bien enrober.",
"Préparer la sauce en mélangeant sauce soja, gochujang, vinaigre, sirop de riz et vin de riz ; porter à ébullition puis réduire 4 minutes.",
"Chauffer l'huile à 160°C et frire les champignons en deux passages, 2-3 minutes au total jusqu'à dorés.",
"Couper le poivron en petits morceaux.",
"Verser la sauce chaude sur les champignons et le poivron.",
"Bien mélanger jusqu'à enrobage uniforme et servir immédiatement."]
$instr$, 10, 10, 4, 2, 'Coréenne', 'snack',
    ARRAY['champignons','shiitake','gangjeong','végétarien','temple','gochujang','croustillant'],
    'manual', 'https://www.koreanbapsang.com/beoseot-gangjeong-crispy-mushrooms/',
    'https://www.koreanbapsang.com/wp-content/uploads/2020/10/DSC_3146.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'champignons shiitake séchés',60,'g',true,1,'à réhydrater'),
    (v_recipe_id, 'poivron rouge',0.25,'unité',true,2,'en petits morceaux'),
    (v_recipe_id, 'fécule de pomme de terre',60,'ml',true,3,'ou maïzena'),
    (v_recipe_id, 'huile végétale',1000,'ml',true,4,'friture'),
    (v_recipe_id, 'sauce soja',15,'ml',true,5,'sauce'),
    (v_recipe_id, 'gochujang',15,'ml',true,6,'sauce'),
    (v_recipe_id, 'vinaigre de riz',15,'ml',true,7,'sauce'),
    (v_recipe_id, 'sirop de riz jocheong',30,'ml',true,8,'ou sirop de maïs'),
    (v_recipe_id, 'vin de riz',30,'ml',true,9,'ou mirin');

  -- 15. Dubu Jorim
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Dubu Jorim (Tofu Braisé Coréen)',
    'Banchan classique : tranches de tofu ferme dorées à la poêle puis mijotées dans une sauce soja-sésame avec gochugaru, ail et oignons verts. Accompagnement quotidien servi avec riz.',
    $instr$["Couper le tofu en tranches rectangulaires de ~1 cm et les sécher au papier absorbant.",
"Préparer la sauce en mélangeant sauce soja, eau, huile de sésame, sucre, gochugaru, graines, ail et oignons verts.",
"Chauffer l'huile dans une grande poêle antiadhésive à feu moyen-vif, dorer les tranches de tofu 3-4 minutes par face.",
"Verser la sauce sur le tofu et la glisser sous les tranches.",
"Laisser mijoter 3-4 minutes à feu moyen-doux.",
"Retourner et poursuivre 1-2 minutes pour imprégner.",
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
    (v_recipe_id, 'gochugaru',1,'c. à café',true,7,'flocons piment coréen'),
    (v_recipe_id, 'graines de sésame',1,'c. à café',true,8,NULL),
    (v_recipe_id, 'ail',1,'c. à café',true,9,'haché'),
    (v_recipe_id, 'oignons verts',2,'tige',true,10,'hachés fin');

  -- 16. Gamja Jorim
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Gamja Jorim (Pommes de Terre Braisées)',
    'Banchan coréen populaire : pommes de terre en cubes braisées dans une sauce soja légèrement sucrée avec carottes et piments. Plat simple, économique, qui se conserve pour les lunchbox.',
    $instr$["Éplucher les pommes de terre et les couper en cubes réguliers de 2,5 cm.",
"Couper carotte, piments et oignon en morceaux.",
"Mélanger les ingrédients de braisage (sauce soja, sucre, mirin, sirop, ail, poivre, eau) jusqu'à dissolution.",
"Chauffer l'huile dans une poêle antiadhésive à feu moyen, faire revenir les pommes de terre 4-5 minutes.",
"Verser le mélange de sauce, porter à ébullition à feu vif, ajouter la carotte.",
"Couvrir et réduire à feu moyen 5-6 minutes jusqu'à cuisson presque complète.",
"Découvrir, ajouter piments et oignon, poursuivre l'ébullition 3 minutes jusqu'à sauce épaissie.",
"Ajouter huile de sésame et graines avant de servir."]
$instr$, 10, 15, 4, 2, 'Coréenne', 'lunch',
    ARRAY['pommes de terre','jorim','braisé','banchan','accompagnement','sauce soja','coréen'],
    'manual', 'https://www.koreanbapsang.com/gamja-jorim-braised-potatoes/',
    'https://www.koreanbapsang.com/wp-content/uploads/2009/11/DSC3017.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'pommes de terre',675,'g',true,1,'en cubes 2,5 cm'),
    (v_recipe_id, 'carotte',85,'g',true,2,'en morceaux'),
    (v_recipe_id, 'piments verts',2,'unité',true,3,'ou ½ poivron'),
    (v_recipe_id, 'oignon',60,'g',true,4,'gros morceaux'),
    (v_recipe_id, 'huile de cuisson',15,'ml',true,5,NULL),
    (v_recipe_id, 'sauce soja',45,'ml',true,6,'ou 30 ml + 15 ml gochujang'),
    (v_recipe_id, 'sucre',15,'ml',true,7,NULL),
    (v_recipe_id, 'vin de riz',15,'ml',true,8,'ou mirin'),
    (v_recipe_id, 'sirop de maïs',15,'ml',true,9,'ou sucre supp.'),
    (v_recipe_id, 'ail',5,'ml',true,10,'haché'),
    (v_recipe_id, 'poivre noir',1,'pincée',true,11,NULL),
    (v_recipe_id, 'eau',180,'ml',true,12,NULL),
    (v_recipe_id, 'huile de sésame',5,'ml',true,13,'finition'),
    (v_recipe_id, 'graines de sésame',2.5,'ml',true,14,'grillées');

  -- 17. Oi Kimchi
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Oi Kimchi (Kimchi de Concombre)',
    'Kimchi d''été ultra-rapide aux concombres frais. Croustillant, rafraîchissant et légèrement piquant, prêt en quelques minutes sans farce complexe — version simplifiée du sobagi.',
    $instr$["Couper les concombres en quatre dans la longueur puis en dés de 2-4 cm.",
"Saupoudrer de sel marin grossier, mélanger et laisser reposer 30 minutes.",
"Verser dans une passoire et laisser égoutter complètement (ne pas rincer).",
"Détailler la ciboulette en tronçons de 4 cm et émincer l'oignon finement.",
"Combiner oignon, ciboulette et tous les assaisonnements (gochugaru, sauce d'anchois, crevettes salées, ail, gingembre, sucre, sésame) avec les concombres.",
"Bien mélanger jusqu'à enrobage complet.",
"Laisser reposer à T° ambiante quelques heures pour fermentation légère, ou réfrigérer immédiatement pour version fraîche.",
"Consommer dans les 2 semaines au réfrigérateur."]
$instr$, 15, 30, 4, 1, 'Coréenne', 'snack',
    ARRAY['kimchi','concombre','accompagnement','fermenté','été','rapide','coréen'],
    'manual', 'https://www.koreanbapsang.com/oi-kimchi-cucumber-kimchi-and-blog/',
    'https://www.koreanbapsang.com/wp-content/uploads/2018/07/DSC_0049_1024-e1690924639259.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'concombres coréens ou kirby',680,'g',true,1,'en dés 2-4 cm'),
    (v_recipe_id, 'sel marin grossier',15,'ml',true,2,NULL),
    (v_recipe_id, 'ciboulette chinoise (buchu)',75,'g',true,3,'ou échalotes'),
    (v_recipe_id, 'oignon',0.5,'unité',true,4,'tranché fin'),
    (v_recipe_id, 'gochugaru',45,'ml',true,5,'flocons piment'),
    (v_recipe_id, 'sauce d''anchois (myulchi aekjeot)',15,'ml',true,6,'fermentée'),
    (v_recipe_id, 'crevettes salées (saeujeot)',15,'ml',true,7,'fermentées'),
    (v_recipe_id, 'ail',15,'ml',true,8,'haché'),
    (v_recipe_id, 'gingembre',2.5,'ml',true,9,'râpé'),
    (v_recipe_id, 'sucre',15,'ml',true,10,NULL),
    (v_recipe_id, 'graines de sésame',5,'ml',false,11,'grillées');

END $$;
