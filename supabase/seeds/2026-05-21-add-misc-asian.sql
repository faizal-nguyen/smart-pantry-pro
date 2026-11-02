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
    'Riz sauté thaï au poulet, au brocoli chinois et à la carotte, assaisonné de sauce soja, de bouillon de poulet en poudre et de poivre blanc. Un plat express prêt en 20 minutes avec du riz jasmin de la veille.',
    $instr$["Chauffer l'huile dans un wok à feu vif et faire sauter l'ail et l'oignon jusqu'à ce qu'ils embaument.",
"Ajouter le poulet émincé et le cuire jusqu'à ce qu'il soit légèrement doré.",
"Pousser le poulet sur le côté, casser l'œuf dans l'espace libre et le brouiller avec le poulet.",
"Incorporer le riz jasmin de la veille et bien l'égrener avec une spatule.",
"Assaisonner avec le bouillon de poulet en poudre, la sauce soja, le sel, le poivre blanc et le sucre.",
"Ajouter le brocoli chinois et la carotte, puis faire sauter 1 à 2 minutes pour qu'ils restent croquants.",
"Servir avec du concombre frais, un quartier de citron vert et de la sauce pimentée selon le goût."]
$instr$, 10, 10, 1, 2, 'Thaïlandaise', 'lunch',
    ARRAY['riz frit','poulet','khao pad','thaïlandais','wok','rapide','street-food'],
    'manual', 'https://hungryinthailand.com/chicken-thai-fried-rice/',
    'https://hungryinthailand.com/wp-content/uploads/2025/02/Chicken-Fried-Rice-Thai-Style.webp'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'huile végétale',2,'c. à soupe',true,1,NULL),
    (v_recipe_id, 'ail',2,'gousse',true,2,'finement haché'),
    (v_recipe_id, 'oignon',30,'g',true,3,'en dés'),
    (v_recipe_id, 'poulet',100,'g',true,4,'finement émincé'),
    (v_recipe_id, 'œuf',1,'unité',true,5,NULL),
    (v_recipe_id, 'riz jasmin cuit',190,'g',true,6,'idéalement de la veille'),
    (v_recipe_id, 'bouillon de poulet en poudre',1,'c. à café',false,7,'type Rosdee, en option'),
    (v_recipe_id, 'sauce soja claire',0.5,'c. à soupe',true,8,NULL),
    (v_recipe_id, 'sel',1,'pincée',true,9,NULL),
    (v_recipe_id, 'poivre blanc',1,'pincée',true,10,NULL),
    (v_recipe_id, 'sucre',1,'c. à café',true,11,NULL),
    (v_recipe_id, 'brocoli chinois',50,'g',true,12,'tiges émincées'),
    (v_recipe_id, 'carotte',30,'g',true,13,'en dés'),
    (v_recipe_id, 'concombre',0.25,'unité',false,14,'en tranches, pour servir'),
    (v_recipe_id, 'citron vert',0.25,'unité',false,15,'en quartier, pour servir'),
    (v_recipe_id, 'sauce pimentée',1,'c. à café',false,16,'au goût, pour servir');

  -- 2. Rice Paper Dumplings (okonomikitchen)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Rice Paper Dumplings (Raviolis Papier de Riz)',
    'Alternative végane aux gyozas : une double feuille de papier de riz enveloppe une farce au tofu, au chou, à la carotte et aux shiitakés, puis les raviolis sont poêlés jusqu''à obtenir une coque croustillante. Servis avec une sauce trempette soja-vinaigre-piment.',
    $instr$["Chauffer 1 c. à soupe d'huile dans une poêle et faire sauter l'ail, le gingembre et l'oignon jusqu'à ce qu'ils embaument.",
"Ajouter le tofu émietté, le chou, la carotte, les shiitakés et la ciboule. Cuire 5 à 7 minutes, jusqu'à ce que le liquide soit évaporé.",
"Assaisonner avec le sel, l'huile de sésame, la sauce soja, le poivre blanc et le glutamate (facultatif), puis laisser refroidir.",
"Tremper une feuille de papier de riz 5 à 10 secondes dans de l'eau froide et la déposer sur une planche humide.",
"Déposer 2 c. à soupe de farce au centre et refermer en carré en rabattant le bas, le haut puis les côtés.",
"Envelopper d'une deuxième feuille de papier de riz, fermeture en dessous, pour obtenir une couche uniforme.",
"À la poêle : chauffer un fond d'huile et cuire les raviolis fermeture en dessous, 2 à 3 min par face, jusqu'à ce qu'ils soient dorés et croustillants.",
"À l'air fryer : cuire 8 à 10 minutes à 200°C en les retournant à mi-cuisson.",
"Servir avec une sauce trempette (sauce soja, vinaigre de riz et huile pimentée)."]
$instr$, 10, 15, 3, 2, 'Asiatique', 'snack',
    ARRAY['raviolis','papier de riz','vegan','tofu','poêlé','air fryer','asiatique'],
    'manual', 'https://www.okonomikitchen.com/rice-paper-dumplings/',
    'https://www.okonomikitchen.com/wp-content/uploads/2021/07/rice-paper-dumplings-recipe.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'huile végétale',3,'c. à soupe',true,1,'1 pour la farce + 2 pour la cuisson'),
    (v_recipe_id, 'ail',3,'gousse',true,2,'finement haché'),
    (v_recipe_id, 'gingembre',1,'c. à soupe',true,3,'finement haché'),
    (v_recipe_id, 'oignon',60,'g',true,4,'en dés'),
    (v_recipe_id, 'tofu',150,'g',true,5,'de n''importe quelle fermeté, émietté'),
    (v_recipe_id, 'chou',105,'g',true,6,'râpé'),
    (v_recipe_id, 'carotte',50,'g',true,7,'râpée'),
    (v_recipe_id, 'champignons shiitake',70,'g',true,8,'finement hachés'),
    (v_recipe_id, 'ciboule',2,'tige',true,9,'émincée'),
    (v_recipe_id, 'sel',1,'c. à café',true,10,'au goût'),
    (v_recipe_id, 'huile de sésame',15,'ml',true,11,NULL),
    (v_recipe_id, 'sauce soja',1.5,'c. à soupe',true,12,'pour la farce'),
    (v_recipe_id, 'glutamate monosodique',0.25,'c. à café',false,13,'en option'),
    (v_recipe_id, 'poivre blanc',0.5,'c. à café',true,14,NULL),
    (v_recipe_id, 'papier de riz',24,'unité',true,15,'petites feuilles de 16 cm'),
    (v_recipe_id, 'sauce soja',15,'ml',true,16,'pour la trempette'),
    (v_recipe_id, 'vinaigre de riz',15,'ml',true,17,'pour la trempette'),
    (v_recipe_id, 'huile pimentée',5,'ml',true,18,'rayu, pour la trempette');

  -- 3. Oyakodon (okonomikitchen)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Oyakodon (Okonomi Kitchen)',
    'Oyakodon selon la technique traditionnelle : poulet taillé en biais (sogi-giri) mijoté avec l''oignon dans un bouillon dashi à la sauce soja légèrement sucré, puis lié par des œufs simplement marbrés (non fouettés). Servi sur du riz, avec un jaune d''œuf en option.',
    $instr$["Parer le poulet (gras, tissus conjonctifs) et le couper en morceaux de 2 à 3 cm avec la technique sogi-giri (lame inclinée à 30-45°). Le mélanger avec 1/2 c. à soupe de dashi, 1/4 c. à café de sucre, la fécule de pomme de terre (facultatif) et le sel.",
"Casser les œufs dans un bol et les couper aux baguettes par petits mouvements (blancs puis jaunes) sans les fouetter, pour garder des marbrures.",
"Émincer l'oignon du sommet vers la racine.",
"Dans une poêle à oyakodon froide, mettre le dashi, le vinaigre de riz, le sucre, l'eau, l'oignon et le poulet ; porter à frémissement à feu moyen.",
"Baisser à feu moyen-doux et laisser mijoter doucement. Retourner le poulet, ajouter la sauce soja et cuire 2 à 3 minutes.",
"Monter à feu moyen et verser les 2/3 des œufs en spirale, du centre vers l'extérieur (en évitant les bords).",
"Maintenir le frémissement et cuire jusqu'à ce que les œufs soient cuits aux 2/3.",
"Verser le dernier tiers des œufs au centre et sur les bords, parsemer d'oignon vert (ou de mitsuba) et couvrir 10 à 15 secondes selon la texture souhaitée.",
"Faire glisser sur un bol de riz garni d'un carré de nori, ajouter un jaune d'œuf cru si on le souhaite et parsemer de shichimi togarashi ou de poivre sansho."]
$instr$, 10, 10, 1, 3, 'Japonaise', 'lunch',
    ARRAY['oyakodon','donburi','poulet','œuf','dashi','japonais','technique-authentique'],
    'manual', 'https://www.okonomikitchen.com/oyakodon/',
    'https://www.okonomikitchen.com/wp-content/uploads/2024/09/oyakodon-recipe-Japanese-chicken-and-egg-rice-bowl-2.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'cuisses de poulet',135,'g',true,1,'désossées, sans peau'),
    (v_recipe_id, 'bouillon dashi',0.5,'c. à soupe',true,2,'pour mariner le poulet'),
    (v_recipe_id, 'sucre',0.25,'c. à café',true,3,'pour mariner le poulet'),
    (v_recipe_id, 'fécule de pomme de terre',1,'c. à café',false,4,'en option, pour le poulet'),
    (v_recipe_id, 'sel',1,'pincée',true,5,'pour le poulet'),
    (v_recipe_id, 'oignon',50,'g',true,6,'émincé'),
    (v_recipe_id, 'œufs',2,'unité',true,7,'gros'),
    (v_recipe_id, 'bouillon dashi',85,'ml',true,8,'pour la sauce'),
    (v_recipe_id, 'sauce soja',1,'c. à soupe',true,9,NULL),
    (v_recipe_id, 'vinaigre de riz',1.25,'c. à café',true,10,'mélangé au sucre et à l''eau (ratio 3:1:3)'),
    (v_recipe_id, 'eau',1.25,'c. à café',true,11,'pour le mélange vinaigre de riz, sucre et eau'),
    (v_recipe_id, 'sucre',1.5,'c. à café',true,12,'pour la sauce, dont 1/2 pour le mélange vinaigre de riz, sucre et eau'),
    (v_recipe_id, 'riz japonais cuit',230,'g',true,13,'chaud, 1 portion'),
    (v_recipe_id, 'nori',0.25,'feuille',false,14,'en option'),
    (v_recipe_id, 'oignon vert',2,'brin',false,15,'ou mitsuba, pour garnir'),
    (v_recipe_id, 'œuf',1,'unité',false,16,'jaune uniquement, en option'),
    (v_recipe_id, 'shichimi togarashi',1,'pincée',false,17,'pour garnir'),
    (v_recipe_id, 'poivre sansho',1,'pincée',false,18,'pour garnir');

  -- 4. Bebek Goreng Renyah (nowjakarta)
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Bebek Goreng Renyah avec Nasi Kecombrang',
    'Canard frit indonésien : d''abord mijoté avec du curcuma, du galanga, de la citronnelle et des feuilles de salam et de combava, puis frit jusqu''à ce que la peau soit très croustillante. Servi avec un riz parfumé à la fleur de gingembre torche (kecombrang) et aux piments.',
    $instr$["Mixer les échalotes, l'ail et le curcuma jusqu'à obtenir une pâte lisse.",
"Faire revenir la pâte dans un peu d'huile chaude jusqu'à ce qu'elle soit dorée et parfumée.",
"Frotter le canard, à l'intérieur comme à l'extérieur, avec le sel, le sucre, le poivre et une partie de la pâte d'épices.",
"Mettre le canard dans une cocotte avec le reste de la pâte, les feuilles de salam, la citronnelle écrasée, les feuilles de combava, le galanga et le gingembre.",
"Ajouter l'eau, porter à ébullition puis laisser mijoter environ 45 minutes à feu doux.",
"Retirer le canard et le sécher soigneusement avec du papier absorbant.",
"Le frire à 180°C pendant 10 à 15 minutes en le retournant régulièrement, jusqu'à ce qu'il soit très croustillant.",
"Pour le riz : mixer le kecombrang, les piments et les échalotes en pâte, puis la cuire dans l'huile jusqu'à ce qu'elle caramélise et que l'huile se sépare. Assaisonner de bouillon de poulet en poudre.",
"Incorporer la pâte cuite au riz cuit à la vapeur et servir avec le canard frit."]
$instr$, 25, 75, 3, 4, 'Indonésienne', 'dinner',
    ARRAY['canard frit','indonésien','curcuma','galanga','kecombrang','traditionnel','nusantara'],
    'manual', 'https://www.nowjakarta.co.id/the-rice-table-recipe-4-bebek-goreng-renyah-with-nasi-kecombrang/',
    'https://www.nowjakarta.co.id/wp-content/uploads/2024/10/bebek2-scaled.jpeg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'canard',1000,'g',true,1,'entier, nettoyé et séché'),
    (v_recipe_id, 'feuilles de salam',3,'unité',true,2,'laurier indonésien'),
    (v_recipe_id, 'citronnelle',3,'tige',true,3,'écrasées'),
    (v_recipe_id, 'feuilles de combava',5,'unité',true,4,NULL),
    (v_recipe_id, 'galanga',100,'g',true,5,'tranché'),
    (v_recipe_id, 'gingembre',30,'g',true,6,'tranché'),
    (v_recipe_id, 'eau',500,'ml',true,7,NULL),
    (v_recipe_id, 'échalotes',200,'g',true,8,'hachées'),
    (v_recipe_id, 'ail',100,'g',true,9,'haché'),
    (v_recipe_id, 'curcuma frais',50,'g',true,10,'râpé'),
    (v_recipe_id, 'sel',4,'g',true,11,NULL),
    (v_recipe_id, 'sucre',2,'g',true,12,NULL),
    (v_recipe_id, 'poivre',1,'g',true,13,'moulu'),
    (v_recipe_id, 'huile végétale',1500,'ml',true,14,'pour la friture et pour revenir la pâte'),
    (v_recipe_id, 'kecombrang',53,'g',true,15,'fleur de gingembre torche'),
    (v_recipe_id, 'piments rouges longs',90,'g',true,16,'pour le riz'),
    (v_recipe_id, 'piment oiseau',8,'g',true,17,'pour le riz'),
    (v_recipe_id, 'échalotes',57,'g',true,18,'pour le riz'),
    (v_recipe_id, 'bouillon de poulet en poudre',10,'g',true,19,'pour le riz'),
    (v_recipe_id, 'huile végétale',110,'ml',true,20,'pour le riz'),
    (v_recipe_id, 'riz vapeur',600,'g',true,21,'cuit, pour servir');

  -- 5. Ayam Rica-Rica Kemangi
  INSERT INTO public.recipes (user_id, name, description, instructions, prep_time, cook_time, servings, difficulty, cuisine_category, meal_type, tags, source_type, source_url, image_url) VALUES (
    v_user_id, 'Ayam Rica-Rica Kemangi',
    'Poulet épicé du nord de Sulawesi, façon Manado : une pâte de piments, de curcuma, de gingembre et de noix de bancoul est sautée avec de la citronnelle, du combava et du pandan, puis mijotée avec le poulet et du basilic citronné (kemangi). Très relevé et parfumé.',
    $instr$["Mariner le poulet avec le jus des citrons verts, un peu de sel, la moitié du bouillon en poudre et le poivre pendant 1 à 2 heures.",
"Mixer les noix de bancoul, l'ail, le gingembre et le curcuma avec 50 ml d'huile pour obtenir une pâte lisse, puis ajouter les échalotes et les piments et mixer à nouveau.",
"Chauffer un peu d'huile et faire revenir le poulet mariné jusqu'à ce qu'il soit légèrement coloré, puis l'égoutter.",
"Faire sauter la pâte d'épices jusqu'à ce qu'elle embaume, puis ajouter la citronnelle, les feuilles de salam et les feuilles de combava.",
"Ajouter le poulet, l'eau, le reste du sel, le sucre, le reste du bouillon en poudre et la feuille de pandan ; cuire 15 à 20 minutes à feu vif.",
"Incorporer les piments cayenne entiers, l'oignon vert et le basilic citronné (kemangi).",
"Bien mélanger pour que les herbes fraîches infusent.",
"Servir chaud avec du riz blanc."]
$instr$, 90, 30, 6, 4, 'Indonésienne', 'dinner',
    ARRAY['poulet','rica-rica','manado','indonésien','kemangi','épicé','sulawesi'],
    'manual', 'https://www.nowjakarta.co.id/the-rice-table-recipe-3-ayam-rica-rica-kemangi/',
    'https://www.nowjakarta.co.id/wp-content/uploads/2024/10/Landscape-Ayam-Rica-Rica.jpg'
  ) RETURNING id INTO v_recipe_id;
  INSERT INTO public.recipe_ingredients (recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes) VALUES
    (v_recipe_id, 'poulet',1000,'g',true,1,'en morceaux'),
    (v_recipe_id, 'citron vert',2,'unité',true,2,'pressés, pour la marinade'),
    (v_recipe_id, 'bouillon de poulet en poudre',2,'c. à café',true,3,'1 pour la marinade + 1 pour la cuisson'),
    (v_recipe_id, 'poivre noir',1,'c. à café',true,4,'moulu, pour la marinade'),
    (v_recipe_id, 'ail',8,'gousse',true,5,'épluchées'),
    (v_recipe_id, 'échalotes',7,'unité',true,6,'émincées'),
    (v_recipe_id, 'noix de bancoul',6,'unité',true,7,'kemiri (ou noix de macadamia)'),
    (v_recipe_id, 'gingembre',30,'g',true,8,'tranché'),
    (v_recipe_id, 'curcuma frais',30,'g',true,9,'tranché'),
    (v_recipe_id, 'piments rouges frisés',60,'g',true,10,'pour la pâte'),
    (v_recipe_id, 'piments cayenne',80,'g',true,11,'pour la pâte'),
    (v_recipe_id, 'huile végétale',50,'ml',true,12,'pour mixer la pâte'),
    (v_recipe_id, 'huile végétale',2,'c. à soupe',true,13,'pour la cuisson'),
    (v_recipe_id, 'eau',250,'ml',true,14,'environ'),
    (v_recipe_id, 'piments cayenne',13,'unité',true,15,'entiers'),
    (v_recipe_id, 'basilic citronné',30,'g',true,16,'kemangi, feuilles'),
    (v_recipe_id, 'oignon vert',1,'tige',true,17,'émincé'),
    (v_recipe_id, 'feuilles de salam',3,'unité',false,18,'laurier indonésien, en option'),
    (v_recipe_id, 'citronnelle',2,'tige',true,19,'écrasées'),
    (v_recipe_id, 'feuille de pandan',1,'unité',false,20,'en option'),
    (v_recipe_id, 'feuilles de combava',5,'unité',true,21,NULL),
    (v_recipe_id, 'sel',1,'c. à café',true,22,'pour la marinade et la cuisson, au goût'),
    (v_recipe_id, 'sucre',1.5,'c. à soupe',true,23,'blanc'),
    (v_recipe_id, 'riz blanc',450,'g',false,24,'poids cru, cuit pour servir');

END $$;
