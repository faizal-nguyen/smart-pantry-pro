-- =====================================================================
-- Seed: 5 Asian recipes from 3 sources (2026-05-21)
--
-- Sources :
--   1. hungryinthailand.com/chicken-thai-fried-rice/
--   2. okonomikitchen.com/rice-paper-dumplings/
--   3. okonomikitchen.com/oyakodon/  (3e Oyakodon en seed — suffixe Okonomi)
--   4. nowjakarta.co.id/bebek-goreng-renyah-with-nasi-kecombrang/
--   5. nowjakarta.co.id/ayam-rica-rica-kemangi/
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Khao Pad Gai (Riz Frit Poulet Thaï)',
    'Rice Paper Dumplings (Raviolis Papier de Riz)',
    'Oyakodon (Okonomi Kitchen)',
    'Bebek Goreng Renyah avec Nasi Kecombrang',
    'Ayam Rica-Rica Kemangi'
  ];
BEGIN
  DELETE FROM public.recipes WHERE user_id = v_user_id AND name = ANY(v_recipe_names);

  -- 1. Khao Pad Gai (hungryinthailand)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Khao Pad Gai (Riz Frit Poulet Thaï)',
    'Riz sauté thaï au poulet, brocoli chinois et carottes, assaisonné sauce soja, poudre Rosdee et poivre blanc. Plat express en 20 minutes avec riz jasmin de la veille.',
    $instr$["Chauffer l'huile dans un wok à feu vif et faire sauter ail et oignon jusqu'à parfumés.",
"Ajouter le poulet tranché fin et cuire jusqu'à légère dorure.",
"Pousser le poulet sur le côté, casser l'œuf dans l'espace vide et le brouiller avec le poulet.",
"Incorporer le riz jasmin (de la veille), bien l'émietter avec une spatule.",
"Assaisonner avec poudre Rosdee, sauce soja, sel, poivre blanc et sucre.",
"Ajouter brocoli chinois et carottes, sauter 1-2 minutes pour les garder croquants.",
"Servir avec concombre frais, quartier de citron vert et sauce piquante au goût."]
$instr$, 10, 10, 1, 2, 'Thaïlandaise', 'lunch',
    ARRAY['riz frit','poulet','khao pad','thaïlandais','wok','rapide','street-food'],
    'manual', 'https://hungryinthailand.com/chicken-thai-fried-rice/',
    'https://hungryinthailand.com/wp-content/uploads/2025/02/Chicken-Fried-Rice-Thai-Style.webp'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'huile végétale',2,'c. à soupe',true,1,NULL),
    (v_recipe_id, 'ail',2,'gousse',true,2,'haché fin'),
    (v_recipe_id, 'oignon',30,'g',true,3,'en dés'),
    (v_recipe_id, 'poulet',100,'g',true,4,'tranché fin'),
    (v_recipe_id, 'œuf',1,'unité',true,5,NULL),
    (v_recipe_id, 'riz jasmin cuit',190,'g',true,6,'idéalement d''un jour'),
    (v_recipe_id, 'poudre Rosdee',1,'c. à café',false,7,'optionnel'),
    (v_recipe_id, 'sauce soja claire',0.5,'c. à soupe',true,8,NULL),
    (v_recipe_id, 'sel',1,'pincée',true,9,NULL),
    (v_recipe_id, 'poivre blanc',1,'pincée',true,10,NULL),
    (v_recipe_id, 'sucre',1,'c. à café',true,11,NULL),
    (v_recipe_id, 'brocoli chinois',50,'g',true,12,'tiges tranchées'),
    (v_recipe_id, 'carotte',30,'g',true,13,'en dés');

  -- 2. Rice Paper Dumplings (okonomikitchen)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Rice Paper Dumplings (Raviolis Papier de Riz)',
    'Alternative vegan aux gyozas : papier de riz double-enroulé autour d''une farce tofu-chou-carotte-shiitake, poêlé pour une coque croustillante. Sauce trempette soja-vinaigre-piment.',
    $instr$["Chauffer l'huile dans une poêle, sauter ail et gingembre jusqu'à parfumés.",
"Ajouter tofu émietté, chou, carotte, shiitake et ciboule, cuire 5-7 minutes jusqu'à liquide évaporé.",
"Assaisonner avec huile de sésame, sauce soja, poivre blanc et MSG (optionnel) ; refroidir.",
"Tremper 1 papier de riz 5-10 secondes dans l'eau froide, déposer sur planche humide.",
"Mettre 2 c. à soupe de farce au centre, plier en aumônière (bas, haut, côtés).",
"Envelopper d'un 2e papier de riz couture vers le bas pour une couche uniforme.",
"À la poêle : chauffer un fond d'huile, cuire couture vers le bas 2-3 min par face jusqu'à doré croustillant.",
"À l'air fryer : 200°C, 8-10 minutes en retournant à mi-cuisson.",
"Servir avec trempette (sauce soja + vinaigre de riz + huile de piment)."]
$instr$, 10, 15, 3, 2, 'Asiatique', 'snack',
    ARRAY['raviolis','papier de riz','vegan','tofu','poêlé','air fryer','asiatique'],
    'manual', 'https://www.okonomikitchen.com/rice-paper-dumplings/',
    'https://www.okonomikitchen.com/wp-content/uploads/2021/07/rice-paper-dumplings-recipe.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'ail',3,'gousse',true,1,'haché fin'),
    (v_recipe_id, 'gingembre',1,'c. à soupe',true,2,'haché fin'),
    (v_recipe_id, 'oignon',60,'g',true,3,'en dés'),
    (v_recipe_id, 'tofu',150,'g',true,4,'toute fermeté'),
    (v_recipe_id, 'chou',105,'g',true,5,'râpé'),
    (v_recipe_id, 'carotte',50,'g',true,6,'râpée'),
    (v_recipe_id, 'champignons shiitake',70,'g',true,7,'hachés fin'),
    (v_recipe_id, 'ciboule',2,'tige',true,8,'tranchée'),
    (v_recipe_id, 'sel',1,'c. à café',true,9,'au goût'),
    (v_recipe_id, 'huile de sésame',15,'ml',true,10,NULL),
    (v_recipe_id, 'sauce soja',22,'ml',true,11,NULL),
    (v_recipe_id, 'MSG',0.25,'c. à café',false,12,'optionnel'),
    (v_recipe_id, 'poivre blanc',0.5,'c. à café',true,13,NULL),
    (v_recipe_id, 'papier de riz',24,'unité',true,14,'16 cm, petit'),
    (v_recipe_id, 'sauce soja',15,'ml',true,15,'trempette'),
    (v_recipe_id, 'vinaigre de riz',15,'ml',true,16,'trempette'),
    (v_recipe_id, 'huile de piment (rayu)',5,'ml',true,17,'trempette');

  -- 3. Oyakodon (okonomikitchen)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Oyakodon (Okonomi Kitchen)',
    'Oyakodon technique authentique : poulet sogi-giri (tranches en biais) mijoté dans dashi-mirin-sauce soja avec oignon, lié par œufs marbrés (non fouettés). Servi sur riz avec jaune supplémentaire.',
    $instr$["Parer le poulet (gras, tissus conjonctifs), couper en lanières de 2-3 cm avec la technique sogi-giri (lame à 30-45°).",
"Casser les œufs et les couper aux baguettes par mouvements de découpe (blanc puis jaune) sans fouetter — laisser des marbrures.",
"Émincer l'oignon du sommet à la racine.",
"Dans une poêle oyakodon froide, mettre dashi, mirin, sucre, oignons et poulet ; porter à frémissement à feu moyen.",
"Baisser à feu moyen-doux et mijoter doucement, retourner le poulet et ajouter sauce soja ; cuire 2-3 minutes.",
"Monter à feu moyen, verser 2/3 des œufs en spirale du centre vers l'extérieur (éviter les bords).",
"Maintenir frémissement et cuire jusqu'à œufs aux 2/3 cuits.",
"Verser le dernier 1/3 d'œufs au centre et bord, parsemer mitsuba/oignon vert, couvrir 10-15 sec selon texture.",
"Glisser sur un bol de riz avec un carré de nori dessous, ajouter jaune cru optionnel et garnir."]
$instr$, 10, 10, 1, 3, 'Japonaise', 'lunch',
    ARRAY['oyakodon','donburi','poulet','œuf','dashi','japonais','technique-authentique'],
    'manual', 'https://www.okonomikitchen.com/oyakodon/',
    'https://www.okonomikitchen.com/wp-content/uploads/2024/09/oyakodon-recipe-Japanese-chicken-and-egg-rice-bowl-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet désossées',135,'g',true,1,'sans peau'),
    (v_recipe_id, 'saké',0.5,'c. à soupe',true,2,NULL),
    (v_recipe_id, 'sucre',0.25,'c. à café',true,3,NULL),
    (v_recipe_id, 'fécule de pomme de terre',1,'c. à café',false,4,'optionnel'),
    (v_recipe_id, 'sel',1,'pincée',true,5,NULL),
    (v_recipe_id, 'oignon',50,'g',true,6,'tranché fin'),
    (v_recipe_id, 'œufs',2,'unité',true,7,'gros'),
    (v_recipe_id, 'bouillon dashi',70,'ml',true,8,'~1/3 tasse'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'mirin',1,'c. à soupe',true,10,NULL),
    (v_recipe_id, 'saké',1,'c. à soupe',true,11,NULL),
    (v_recipe_id, 'sucre',1,'c. à café',true,12,NULL),
    (v_recipe_id, 'riz japonais cuit',230,'g',true,13,'1 portion'),
    (v_recipe_id, 'nori',0.25,'feuille',false,14,'optionnel'),
    (v_recipe_id, 'mitsuba ou oignon vert',2,'brin',false,15,'garniture'),
    (v_recipe_id, 'jaune d''œuf',1,'unité',false,16,'optionnel'),
    (v_recipe_id, 'shichimi togarashi',1,'pincée',false,17,'garniture'),
    (v_recipe_id, 'sansho japonais',1,'pincée',false,18,'garniture');

  -- 4. Bebek Goreng Renyah (nowjakarta)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Bebek Goreng Renyah avec Nasi Kecombrang',
    'Canard frit indonésien : longuement mijoté avec curcuma, galanga, citronnelle et feuilles de salam/combava, puis frit jusqu''à peau ultra-croustillante. Servi avec riz aux fleurs de gingembre torche (kecombrang) et piments.',
    $instr$["Mixer échalotes, ail et curcuma jusqu'à pâte lisse.",
"Faire revenir la pâte dans l'huile chaude jusqu'à dorée et parfumée.",
"Frotter le canard de sel, poivre et d'une portion de la pâte d'épices, à l'intérieur et à l'extérieur.",
"Mettre le canard dans une cocotte avec feuilles de salam, citronnelle écrasée, feuilles de combava, galanga et gingembre.",
"Couvrir d'eau, porter à ébullition puis mijoter ~45 minutes à feu doux.",
"Retirer le canard et le sécher complètement au papier absorbant.",
"Frire à 180°C 10-15 minutes en retournant régulièrement jusqu'à très croustillant.",
"Pour le riz : mixer kecombrang, piments et échalotes en pâte ; cuire dans l'huile jusqu'à caramélisation et séparation.",
"Incorporer la pâte cuite au riz vapeur et servir avec le canard frit."]
$instr$, 25, 75, 3, 4, 'Indonésienne', 'dinner',
    ARRAY['canard frit','indonésien','curcuma','galanga','kecombrang','traditionnel','nusantara'],
    'manual', 'https://www.nowjakarta.co.id/the-rice-table-recipe-4-bebek-goreng-renyah-with-nasi-kecombrang/',
    'https://www.nowjakarta.co.id/wp-content/uploads/2024/11/The-Rice-Table-Recipe-4-Bebek-Goreng-Renyah-with-Nasi-Kecombrang.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'canard entier',1000,'g',true,1,'nettoyé, séché'),
    (v_recipe_id, 'feuilles de salam',3,'unité',true,2,'laurier indonésien'),
    (v_recipe_id, 'citronnelle',3,'tige',true,3,'écrasées'),
    (v_recipe_id, 'feuilles de combava',5,'unité',true,4,NULL),
    (v_recipe_id, 'galanga',100,'g',true,5,'tranché'),
    (v_recipe_id, 'gingembre',30,'g',true,6,'tranché'),
    (v_recipe_id, 'eau',500,'ml',true,7,NULL),
    (v_recipe_id, 'échalotes',200,'g',true,8,'hachées'),
    (v_recipe_id, 'ail',100,'g',true,9,'haché'),
    (v_recipe_id, 'curcuma',50,'g',true,10,'râpé ou moulu'),
    (v_recipe_id, 'sel',4,'g',true,11,NULL),
    (v_recipe_id, 'sucre',2,'g',true,12,NULL),
    (v_recipe_id, 'poivre',1,'g',true,13,NULL),
    (v_recipe_id, 'huile de friture',1500,'ml',true,14,NULL),
    (v_recipe_id, 'kecombrang',53,'g',true,15,'fleur de gingembre torche'),
    (v_recipe_id, 'gros piment rouge',90,'g',true,16,'pour le riz'),
    (v_recipe_id, 'piment oiseau',8,'g',true,17,'pour le riz'),
    (v_recipe_id, 'échalotes',57,'g',true,18,'pour le riz'),
    (v_recipe_id, 'poudre de poulet',10,'g',true,19,'pour le riz'),
    (v_recipe_id, 'huile',100,'g',true,20,'pour le riz'),
    (v_recipe_id, 'riz vapeur',600,'g',true,21,'pour servir');

  -- 5. Ayam Rica-Rica Kemangi
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Ayam Rica-Rica Kemangi',
    'Poulet épicé du Nord-Sulawesi (style Manado) : pâte de piments-curcuma-gingembre-noix de bougie sautée avec citronnelle, combava et pandan, plus poulet et basilic citronné kemangi. Très relevé et parfumé.',
    $instr$["Mariner le poulet au jus de citron vert, sel, bouillon en poudre et poivre 1-2 heures.",
"Mixer noix de macadamia, ail, gingembre et curcuma avec huile en pâte lisse, ajouter échalotes et piments et mixer à nouveau.",
"Chauffer un peu d'huile et faire revenir le poulet mariné jusqu'à légère coloration, égoutter.",
"Faire sauter la pâte d'épices jusqu'à parfum, ajouter citronnelle, feuilles de laurier et combava.",
"Verser le poulet, ajouter eau, sel, sucre, bouillon en poudre et feuille de pandan ; cuire 15-20 minutes à feu vif.",
"Incorporer les piments cayenne entiers, oignon vert et basilic citronné kemangi.",
"Bien mélanger pour que les herbes fraîches infusent.",
"Servir chaud accompagné de riz blanc."]
$instr$, 90, 30, 6, 4, 'Indonésienne', 'dinner',
    ARRAY['poulet','rica-rica','manado','indonésien','kemangi','épicé','sulawesi'],
    'manual', 'https://www.nowjakarta.co.id/the-rice-table-recipe-3-ayam-rica-rica-kemangi/',
    'https://www.nowjakarta.co.id/wp-content/uploads/2024/10/The-Rice-Table-Recipe-3-Ayam-Rica-Rica-Kemangi.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'poulet',1000,'g',true,1,'en portions'),
    (v_recipe_id, 'citron vert',2,'unité',true,2,'marinade'),
    (v_recipe_id, 'bouillon de poulet en poudre',1,'c. à café',true,3,'marinade'),
    (v_recipe_id, 'poivre noir',1,'c. à café',true,4,'moulu'),
    (v_recipe_id, 'ail',8,'gousse',true,5,'épluchée'),
    (v_recipe_id, 'échalotes',7,'unité',true,6,'tranchées'),
    (v_recipe_id, 'noix de bougie (kemiri)',6,'unité',true,7,'ou macadamia'),
    (v_recipe_id, 'gingembre',30,'g',true,8,'tranché'),
    (v_recipe_id, 'curcuma frais',30,'g',true,9,'tranché'),
    (v_recipe_id, 'piments rouges frisés',60,'g',true,10,NULL),
    (v_recipe_id, 'piments cayenne',80,'g',true,11,'pour pâte'),
    (v_recipe_id, 'huile',50,'ml',true,12,'pour mixer'),
    (v_recipe_id, 'piments cayenne entiers',13,'unité',true,13,NULL),
    (v_recipe_id, 'feuilles de kemangi',30,'g',true,14,'basilic citronné'),
    (v_recipe_id, 'oignon vert',1,'tige',true,15,'tranchée'),
    (v_recipe_id, 'feuilles de laurier indonésien',3,'unité',false,16,'optionnel'),
    (v_recipe_id, 'citronnelle',2,'tige',true,17,'écrasées'),
    (v_recipe_id, 'feuille de pandan',1,'unité',false,18,'optionnel'),
    (v_recipe_id, 'feuilles de combava',5,'unité',true,19,NULL),
    (v_recipe_id, 'sel',1,'c. à café',true,20,'au goût'),
    (v_recipe_id, 'sucre',1.5,'c. à soupe',true,21,'blanc'),
    (v_recipe_id, 'bouillon en poudre',1,'c. à café',true,22,NULL);

END $$;
