-- =====================================================================
-- Seed: 24 recipes from thegoldenbalance.com (2026-05-19)
--
-- Site = Squarespace SPA. WebFetch a renvoyé le contenu texte mais
-- pas les images : on a recuperé og:image via curl + grep.
--
-- Sources :
--    1. https://www.thegoldenbalance.com/recipes/7spicecheesesteak
--    2. https://www.thegoldenbalance.com/recipes/chickenshawarmatacos
--    3. https://www.thegoldenbalance.com/recipes/caramelizedonionmacncheese
--    4. https://www.thegoldenbalance.com/recipes/buffalochickenfries
--    5. https://www.thegoldenbalance.com/recipes/crispychickenshawarma
--    6. https://www.thegoldenbalance.com/recipes/steakdipsandwich
--    7. https://www.thegoldenbalance.com/recipes/birriaarayes
--    8. https://www.thegoldenbalance.com/recipes/lambchops
--    9. https://www.thegoldenbalance.com/recipes/davesstylechickentenders
--   10. https://www.thegoldenbalance.com/recipes/recipe-3jmj9-f4k3f                  [Triple Pepper Gouda Smash Burger]
--   11. https://www.thegoldenbalance.com/recipes/recipe-tk6nh                        [Healthy Hibachi]
--   12. https://www.thegoldenbalance.com/recipes/recipe-blzks                        [Healthy Loaded Cheese & Beef Fries]
--   13. https://www.thegoldenbalance.com/recipes/recipe-b59hf-...-7de68              [Mexican Alambre]
--   14. https://www.thegoldenbalance.com/recipes/recipe-b59hf-...-dfc3w              [Chipotle Chicken Over Rice]
--   15. https://www.thegoldenbalance.com/recipes/recipe-3chlp                        [Parmesan Garlic Chicken Tenders]
--   16. https://www.thegoldenbalance.com/recipes/recipe-gwg5s-92r27-d7b43-rhklg-pwbdf [Tandoori Chicken and Rice]
--   17. https://www.thegoldenbalance.com/recipes/recipe-lmcx7-849r5                  [GB Style Salmon Over Rice]
--   18. https://www.thegoldenbalance.com/recipes/recipe-6w7jj-...-m7zf7              [Korean Fried Chicken Sandwich]
--   19. https://www.thegoldenbalance.com/recipes/recipe-6w7jj-2b72b-48m2n            [Kimchi Fried Rice]
--   20. https://www.thegoldenbalance.com/recipes/recipe-title-mb3aa-zafs5            [Halal Cart Chicken Over Rice]
--   21. https://www.thegoldenbalance.com/recipes/picadillo
--   22. https://www.thegoldenbalance.com/recipes/beef-burrito-bowls
--   23. https://www.thegoldenbalance.com/recipes/spicy-salmon-crispy-rice
--   24. https://www.thegoldenbalance.com/recipes/pakistaninihari
--
-- Renommages pour eviter collision (Moribyan a deja 'Halal Cart Chicken and Rice') :
--   - 'Halal Cart Chicken Over Rice (Golden Balance)'
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-thegoldenbalance.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    '7 Spice Cheese Steak',
    'Chicken Shawarma Tacos',
    'Caramelized Onion Mac n Cheese',
    'Buffalo Chicken Fries',
    'Crispy Chicken Shawarma',
    'Steak Dip Sandwich',
    'Birria Arayes',
    'Lamb Chops (Golden Balance)',
    'Dave''s Style Hot Chicken Tenders',
    'Triple Pepper Gouda Smash Burger',
    'Healthy Hibachi',
    'Healthy Loaded Cheese & Beef Fries',
    'Mexican Alambre',
    'Chipotle Chicken Over Rice',
    'Parmesan Garlic Chicken Tenders',
    'Tandoori Chicken and Rice (Golden Balance)',
    'GB Style Salmon Over Rice',
    'Korean Fried Chicken Sandwich',
    'Kimchi Fried Rice (Golden Balance)',
    'Halal Cart Chicken Over Rice (Golden Balance)',
    'Picadillo (Stewed Beef and Potatoes)',
    'Beef Burrito Bowls',
    'Spicy Salmon Crispy Rice',
    'Pakistani Nihari'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. 7 Spice Cheese Steak
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    '7 Spice Cheese Steak',
    'Cheesesteak fusion aux saveurs orientales : entrecôte émincée sautée avec oignon et poivron vert, relevée d''un mélange de 7 épices (cumin, coriandre, piment de la Jamaïque, cardamome, chipotle, ail, paprika) et nappée de cheddar fondu dans un pain long.',
    $instr$["Mélanger le cumin, la coriandre moulue, le piment de la Jamaïque, la cardamome, le piment chipotle, l'ail en poudre et le paprika fumé.",
"Faire fondre une partie de la graisse de bœuf sur une plancha ou dans une grande poêle chaude. Faire revenir l'oignon et le poivron vert à feu moyen jusqu'à ce qu'ils ramollissent.",
"Assaisonner les légumes avec une partie du mélange d'épices, ajouter le jalapeño tranché et un peu de sel. Cuire jusqu'à ce que l'oignon soit translucide et le poivron tendre. Réserver.",
"Ajouter le reste de la graisse de bœuf. Étaler l'entrecôte émincée en une seule couche, la laisser colorer, puis la hacher à la spatule.",
"Assaisonner le bœuf avec le reste du mélange d'épices et le sel.",
"Mélanger le bœuf avec les légumes. Ajouter les piments banane, les piments cerises et les tranches de cheddar. Couvrir pour faire fondre le fromage.",
"Poser le pain ouvert, face coupée vers le bas, sur la garniture. Couvrir d'une feuille de papier sulfurisé, glisser la spatule dessous et retourner le tout d'un geste pour transférer la garniture dans le pain."]
$instr$,
    15, 20, 3, 3,
    'Américaine', 'dinner',
    ARRAY['américain','fusion','cheesesteak','entrecôte','7 épices','poivrons','sandwich'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/7spicecheesesteak',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/69c1ea93842fa96c0bf20626/1774317358546/Screenshot+2026-03-23+at+9.35.52%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'entrecôte',                  907, 'g',          true,  1,  'finement tranchée'),
    (v_recipe_id, 'pain long à sandwich',       2,   'unité',      true,  2,  'type hoagie de 25 cm (ou 4 petits)'),
    (v_recipe_id, 'graisse de bœuf',            2,   'c. à soupe', true,  3,  'ou huile'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  4,  'moyen, émincé'),
    (v_recipe_id, 'poivron vert',               1,   'unité',      true,  5,  'gros, haché'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  6,  'tranché'),
    (v_recipe_id, 'cumin',                      0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'coriandre moulue',           1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'piment de la Jamaïque',      1,   'c. à café',  true,  9,  'moulu'),
    (v_recipe_id, 'cardamome',                  1,   'c. à café',  true,  10, 'moulue'),
    (v_recipe_id, 'piment chipotle en poudre',  1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'paprika fumé',               2,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  14, 'au goût'),
    (v_recipe_id, 'piments banane',             60,  'ml',         false, 15, 'en bocal, optionnel'),
    (v_recipe_id, 'piments cerises doux',       60,  'ml',         false, 16, 'en bocal, optionnel'),
    (v_recipe_id, 'cheddar',                    340, 'g',          true,  17, 'affiné, en tranches');

  -- =====================================================================
  -- 2. Chicken Shawarma Tacos
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Shawarma Tacos',
    'Tacos fusion orient-mexique : hauts de cuisse marinés au yaourt et aux épices shawarma, grillés puis fumés au charbon, servis dans des tortillas de maïs avec fromage fondu, sauce à l''ail, pickles et un glaçage pimenté.',
    $instr$["Marinade : mélanger le yaourt, le jus de citron, la pâte de piment, l'ail, les épices (cumin, coriandre, piment de la Jamaïque, paprika fumé, cardamome, clou de girofle, glutamate), le sel et l'huile d'olive.",
"Bien enrober les hauts de cuisse et laisser mariner le plus longtemps possible.",
"Faire chauffer une plaque de cuisson avec la graisse de bœuf et y étaler le poulet en une couche fine.",
"Passer sous le gril du four à pleine puissance 10 à 15 minutes en retournant à mi-cuisson, jusqu'à ce que les bords soient caramélisés.",
"Facultatif : transférer dans un saladier tapissé de papier aluminium, placer au centre un morceau de charbon de bois allumé et couvrir 5 minutes pour fumer le poulet.",
"Sur une plaque chaude huilée, réchauffer les tortillas de maïs, les retourner et les garnir de fromage râpé, de sauce à l'ail et de cornichons. Ajouter le poulet et replier serré.",
"Glaçage : faire mijoter la pâte de piment avec l'eau et l'huile neutre jusqu'à ce qu'il soit brillant et épais. En badigeonner les tacos.",
"Crème chipotle : mixer la crème aigre avec les piments chipotle, le paprika, le chili en poudre et le miel. Servir les tacos chauds avec cette crème."]
$instr$,
    15, 25, 5, 3,
    'Moyen-Orientale', 'dinner',
    ARRAY['moyen-oriental','mexicain','fusion','poulet','shawarma','tacos','grillade','fumé'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/chickenshawarmatacos',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/69a746a1ac09b022d993070b/1772654609701/Screenshot+2026-03-02+at+12.34.31%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  907, 'g',          true,  1,  'désossés'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  2,  NULL),
    (v_recipe_id, 'pâte de piment fort',        2,   'c. à soupe', true,  3,  'type biber salçası ou harissa'),
    (v_recipe_id, 'yaourt nature',              60,  'g',          true,  4,  NULL),
    (v_recipe_id, 'jus de citron',              1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'graisse de bœuf',            2,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'cumin',                      0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',           1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'piment de la Jamaïque',      0.5, 'c. à café',  true,  10, 'moulu'),
    (v_recipe_id, 'paprika fumé',               1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'cardamome',                  1,   'c. à café',  true,  12, 'moulue'),
    (v_recipe_id, 'clou de girofle moulu',      0.25, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'glutamate monosodique',      0.5, 'c. à café',  false, 14, 'MSG, optionnel'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'pâte de piment fort',        60,  'ml',         true,  16, 'pour le glaçage'),
    (v_recipe_id, 'eau',                        2,   'c. à soupe', true,  17, 'pour le glaçage'),
    (v_recipe_id, 'huile neutre',               2,   'c. à soupe', true,  18, 'pour le glaçage'),
    (v_recipe_id, 'piments chipotle en sauce adobo', 2,   'unité',      true,  19, 'pour la crème chipotle'),
    (v_recipe_id, 'crème aigre',                360, 'g',          true,  20, 'pour la crème chipotle'),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  21, 'pour la crème chipotle'),
    (v_recipe_id, 'chili en poudre',            1,   'c. à café',  true,  22, 'pour la crème chipotle'),
    (v_recipe_id, 'miel',                       2,   'c. à soupe', true,  23, 'pour la crème chipotle'),
    (v_recipe_id, 'tortillas de maïs',          14,  'unité',      true,  24, NULL),
    (v_recipe_id, 'fromage râpé',               150, 'g',          true,  25, NULL),
    (v_recipe_id, 'sauce à l''ail',             60,  'ml',         true,  26, 'toum ou aïoli'),
    (v_recipe_id, 'cornichons',                 60,  'g',          true,  27, 'tranchés');

  -- =====================================================================
  -- 3. Caramelized Onion Mac n Cheese
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Caramelized Onion Mac n Cheese',
    'Mac and cheese gourmand : sauce aux trois fromages (cheddar blanc extra-fort, gruyère, parmesan) et oignons jaunes confits à la sauce Worcestershire et aux herbes, gratiné au four.',
    $instr$["Émincer finement les oignons. Les faire cuire dans le beurre et l'huile à feu moyen-doux pendant 30 minutes en remuant de temps en temps.",
"Ajouter l'ail, la sauce Worcestershire, le bouillon et le bouquet d'herbes (romarin, thym, persil). Poursuivre la cuisson 30 minutes en déglaçant avec un peu de bouillon si nécessaire. Retirer les herbes et réserver quelques oignons pour la finition.",
"Cuire les pâtes al dente dans de l'eau salée et les égoutter.",
"Faire chauffer la crème, incorporer la moutarde de Dijon puis ajouter progressivement les fromages en remuant jusqu'à obtenir une sauce lisse. Saler.",
"Préchauffer le four à 175 °C.",
"Mélanger les pâtes avec la sauce et les oignons confits dans un plat à gratin. Parsemer d'un peu de fromage et de persil.",
"Enfourner 20 minutes, puis passer brièvement sous le gril pour dorer le dessus.",
"Garnir des oignons confits réservés et servir."]
$instr$,
    15, 75, 8, 3,
    'Américaine', 'dinner',
    ARRAY['américain','mac and cheese','gruyère','cheddar','oignons caramélisés','gratin','réconfortant'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/caramelizedonionmacncheese',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/69a71ee54835f3724488ef31/1772561915465/Screenshot+2026-03-02+at+12.33.06%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pâtes courtes',              680, 'g',          true,  1,  NULL),
    (v_recipe_id, 'crème liquide entière',      800, 'ml',         true,  2,  NULL),
    (v_recipe_id, 'cheddar blanc',              454, 'g',          true,  3,  'extra-fort, râpé'),
    (v_recipe_id, 'gruyère',                    230, 'g',          true,  4,  'râpé'),
    (v_recipe_id, 'parmesan',                   60,  'g',          true,  5,  'fraîchement râpé'),
    (v_recipe_id, 'moutarde de Dijon',          1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  7,  'au goût'),
    (v_recipe_id, 'oignon jaune',               3,   'unité',      true,  8,  'gros, finement émincés'),
    (v_recipe_id, 'beurre doux',                4,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'huile neutre',               2,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  11, 'émincé'),
    (v_recipe_id, 'sauce Worcestershire',       60,  'ml',         true,  12, NULL),
    (v_recipe_id, 'bouillon de poulet',         120, 'ml',         true,  13, 'ou bouillon de légumes, + un peu pour déglacer'),
    (v_recipe_id, 'romarin frais',              2,   'branche',    true,  14, NULL),
    (v_recipe_id, 'thym frais',                 2,   'branche',    true,  15, NULL),
    (v_recipe_id, 'persil frais',               2,   'branche',    true,  16, NULL);

  -- =====================================================================
  -- 4. Buffalo Chicken Fries
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Buffalo Chicken Fries',
    'Frites maison allégées cuites à l''air fryer, surmontées de hauts de cuisse rôtis aux épices et nappées d''une sauce buffalo ranch crémeuse au yaourt allégé et à la mayonnaise light.',
    $instr$["Préchauffer le four à 190 °C.",
"Assaisonner les hauts de cuisse avec l'ail en poudre, le chili en poudre, le paprika, l'origan, le sel et le poivre. Les rôtir jusqu'à ce qu'ils soient cuits à cœur et légèrement caramélisés.",
"Couper les pommes de terre en frites ou en cubes. Les vaporiser d'huile et les assaisonner avec les mêmes épices.",
"Cuire à l'air fryer à 190 °C pendant 20 minutes en retournant à mi-cuisson, jusqu'à ce qu'elles soient dorées et croustillantes.",
"Dans un bol, mélanger le yaourt, la mayonnaise allégée et la crème aigre. Ajouter la sauce buffalo, l'ail en poudre et le persil. Détendre avec un peu d'eau si besoin.",
"Couper le poulet en cubes et l'arroser légèrement de sauce buffalo.",
"Dresser les frites, parsemer de mozzarella si désiré, déposer le poulet et terminer par la sauce buffalo ranch."]
$instr$,
    15, 30, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','buffalo','poulet','frites','air fryer','healthy','protéiné'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/buffalochickenfries',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/6977f7e49000fb64e6cf2e7a/1769471632504/Screenshot+2026-01-12+at+10.42.54%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  907, 'g',          true,  1,  NULL),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  2,  'pour le poulet'),
    (v_recipe_id, 'chili en poudre',            1,   'c. à café',  true,  3,  'pour le poulet'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  4,  'pour le poulet'),
    (v_recipe_id, 'origan séché',               0.5, 'c. à café',  true,  5,  'pour le poulet'),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  6,  'pour le poulet'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  7,  'poulet et frites'),
    (v_recipe_id, 'sauce buffalo',              60,  'ml',         true,  8,  'pour le poulet'),
    (v_recipe_id, 'pommes de terre',            3,   'unité',      true,  9,  'grosses, type russet (farineuses)'),
    (v_recipe_id, 'huile en spray',             1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  11, 'pour les frites'),
    (v_recipe_id, 'chili en poudre',            1,   'c. à café',  true,  12, 'pour les frites'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  13, 'pour les frites'),
    (v_recipe_id, 'origan séché',               0.5, 'c. à café',  true,  14, 'pour les frites'),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  15, 'pour les frites'),
    (v_recipe_id, 'yaourt allégé',              240, 'g',          false, 16, 'optionnel, pour la sauce'),
    (v_recipe_id, 'mayonnaise allégée',         120, 'ml',         true,  17, 'pour la sauce'),
    (v_recipe_id, 'crème aigre allégée',        120, 'g',          false, 18, 'optionnel, pour la sauce'),
    (v_recipe_id, 'sauce buffalo',              60,  'ml',         true,  19, 'pour la sauce'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  20, 'pour la sauce'),
    (v_recipe_id, 'persil séché',               1,   'c. à café',  true,  21, 'pour la sauce'),
    (v_recipe_id, 'mozzarella',                 60,  'g',          false, 22, 'râpée, optionnel');

  -- =====================================================================
  -- 5. Crispy Chicken Shawarma
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Crispy Chicken Shawarma',
    'Shawarma de poulet ultra-croustillant : lanières marinées au yaourt et aux épices, grillées au four et servies dans un pain pita avec toum, pickles et mélasse de grenade, puis badigeonnées d''une sauce rouge à la tomate.',
    $instr$["Couper les hauts de cuisse en fines lanières.",
"Marinade : fouetter la pâte de piment, le yaourt, l'ail, le vinaigre blanc (ou le jus de citron), l'huile d'olive et les épices (cumin, coriandre, piment de la Jamaïque, paprika fumé, cardamome, clou de girofle, glutamate, gingembre, piment de Cayenne, sel) jusqu'à obtenir un mélange lisse.",
"Bien enrober le poulet et réfrigérer au moins 2 heures (idéalement une nuit).",
"Sauce rouge : chauffer l'huile neutre et y faire revenir le concentré de tomate. Ajouter le piment de Cayenne, le ketchup et l'eau. Saler.",
"Préchauffer le gril du four en position haute 10 à 15 minutes avec une plaque à l'intérieur.",
"Sortir la plaque, y faire fondre la graisse de bœuf et étaler le poulet en une couche fine.",
"Faire griller 10 à 15 minutes en surveillant, jusqu'à ce que les bords soient croustillants.",
"Facultatif : fumer le poulet quelques minutes sous un couvercle, avec un morceau de charbon de bois allumé posé dans une coupelle en aluminium.",
"Étaler du toum dans le pain pita, ajouter le poulet, quelques cornichons finement tranchés et un filet de mélasse de grenade.",
"Rouler serré et faire dorer à la poêle, côté soudure vers le bas. Badigeonner l'extérieur de sauce rouge et servir chaud."]
$instr$,
    15, 20, 5, 3,
    'Moyen-Orientale', 'dinner',
    ARRAY['moyen-oriental','libanais','poulet','shawarma','pita','toum','croustillant'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/crispychickenshawarma',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/6976948e68ec1957341954ba/1769381368957/Screenshot+2026-01-12+at+10.32.33%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  907, 'g',          true,  1,  'désossés, en fines lanières'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  2,  NULL),
    (v_recipe_id, 'pâte de piment fort',        2,   'c. à soupe', true,  3,  'ou concentré de tomate'),
    (v_recipe_id, 'yaourt nature',              60,  'g',          true,  4,  NULL),
    (v_recipe_id, 'vinaigre blanc',             1,   'c. à soupe', true,  5,  'ou jus de citron'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'graisse de bœuf',            3,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'cumin',                      1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',           1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'piment de la Jamaïque',      0.5, 'c. à café',  true,  10, 'moulu'),
    (v_recipe_id, 'paprika fumé',               1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'cardamome',                  0.5, 'c. à café',  true,  12, 'moulue'),
    (v_recipe_id, 'clou de girofle moulu',      0.5, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'glutamate monosodique',      0.5, 'c. à café',  false, 14, 'MSG, optionnel'),
    (v_recipe_id, 'gingembre moulu',            0.5, 'c. à café',  false, 15, NULL),
    (v_recipe_id, 'piment de Cayenne',          1,   'c. à café',  false, 16, 'pour la marinade'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'huile neutre',               60,  'ml',         true,  18, 'pour la sauce rouge'),
    (v_recipe_id, 'concentré de tomate',        60,  'ml',         true,  19, 'pour la sauce rouge'),
    (v_recipe_id, 'ketchup',                    2,   'c. à soupe', true,  20, 'pour la sauce rouge'),
    (v_recipe_id, 'piment de Cayenne',          1,   'c. à café',  true,  21, 'pour la sauce rouge'),
    (v_recipe_id, 'eau',                        60,  'ml',         true,  22, 'pour la sauce rouge'),
    (v_recipe_id, 'pain pita',                  5,   'unité',      true,  23, 'grands'),
    (v_recipe_id, 'toum',                       60,  'ml',         true,  24, 'crème d''ail libanaise'),
    (v_recipe_id, 'cornichons',                 60,  'g',          true,  25, 'finement tranchés'),
    (v_recipe_id, 'mélasse de grenade',         2,   'c. à soupe', true,  26, NULL);

  -- =====================================================================
  -- 6. Steak Dip Sandwich
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Steak Dip Sandwich',
    'French dip haut de gamme : entrecôte grillée, oignons caramélisés, emmental et munster fondus sur ciabatta grillée, accompagnés d''un jus de viande au Worcestershire et au romarin pour tremper.',
    $instr$["Facultatif : saler légèrement les entrecôtes et les réfrigérer une nuit à découvert (salage à sec).",
"Émincer les oignons et les faire caraméliser doucement dans une partie de l'huile avec 2 c. à soupe de sauce Worcestershire et une pincée de sel.",
"Jus : faire suer l'ail émincé et les échalotes hachées dans un peu d'huile avec le bouillon de bœuf concentré, le romarin et le thym.",
"Ajouter l'eau et le reste de sauce Worcestershire. Laisser mijoter 15 minutes puis filtrer.",
"Assaisonner les entrecôtes de sel et de poivre et les griller jusqu'à une cuisson saignante à point. Les laisser reposer en les garnissant de beurre composé.",
"Faire griller les ciabattas au four à 215 °C, garnies d'emmental d'un côté et de munster de l'autre.",
"Trancher la viande reposée, la tremper dans le jus chaud et la déposer sur le pain grillé avec les oignons caramélisés. Servir avec le reste du jus pour tremper."]
$instr$,
    15, 45, 4, 3,
    'Américaine', 'dinner',
    ARRAY['américain','sandwich','french dip','entrecôte','ciabatta','emmental','munster'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/steakdipsandwich',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/696c2f79f43d007a0a11ea92/1768698526902/Screenshot+2026-01-12+at+10.22.40%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'entrecôtes',                 4,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'oignon jaune',               2,   'unité',      true,  2,  'émincés'),
    (v_recipe_id, 'huile neutre',               5,   'c. à soupe', true,  3,  'à répartir entre les étapes'),
    (v_recipe_id, 'sauce Worcestershire',       2,   'c. à soupe', true,  4,  'pour les oignons'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  5,  'émincé'),
    (v_recipe_id, 'échalote',                   2,   'unité',      true,  6,  'finement hachées'),
    (v_recipe_id, 'bouillon de bœuf concentré', 2,   'c. à soupe', true,  7,  'en pâte, ou 1 cube de bouillon'),
    (v_recipe_id, 'romarin frais',              1,   'branche',    true,  8,  NULL),
    (v_recipe_id, 'thym frais',                 1,   'branche',    true,  9,  NULL),
    (v_recipe_id, 'eau',                        1,   'l',          true,  10, 'pour le jus, quantité indicative'),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'beurre',                     4,   'c. à soupe', true,  13, 'composé (aux herbes et à l''ail)'),
    (v_recipe_id, 'ciabatta',                   2,   'unité',      true,  14, 'pains longs'),
    (v_recipe_id, 'emmental',                   6,   'tranche',    true,  15, NULL),
    (v_recipe_id, 'munster',                    6,   'tranche',    true,  16, NULL),
    (v_recipe_id, 'sauce Worcestershire',       1,   'c. à soupe', true,  17, 'pour le jus');

  -- =====================================================================
  -- 7. Birria Arayes
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Birria Arayes',
    'Fusion mexicano-libanaise : pains pita farcis de bœuf haché relevé d''une pâte de piments façon birria et de fromage chihuahua, badigeonnés d''huile épicée et dorés à la poêle.',
    $instr$["Retirer les queues et les graines des piments séchés, puis les faire tremper 10 minutes dans de l'eau chaude.",
"Faire revenir l'oignon haché et l'ail dans une partie de l'huile d'olive jusqu'à ce qu'ils soient dorés et parfumés.",
"Mixer les piments réhydratés avec l'oignon, l'ail, l'origan, le paprika et le cumin pour obtenir une pâte.",
"Saler le bœuf haché et y incorporer la pâte de piments.",
"Couper les pitas en deux, les ouvrir en poches et les farcir du mélange de viande et de fromage.",
"Mélanger l'assaisonnement birria avec le reste de l'huile pour obtenir un glaçage. En badigeonner les deux faces des arayes.",
"Cuire à la poêle jusqu'à ce que les arayes soient dorés et croustillants et la viande cuite à cœur. Servir immédiatement."]
$instr$,
    15, 20, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','libanais','fusion','birria','arayes','bœuf','pita','fromage'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/birriaarayes',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/690ac2a36e07e13b1da73c75/1768101925310/Screen+Shot+2025-11-04+at+10.20.47+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'piments séchés',             3,   'unité',      true,  1,  'guajillo, ancho, ou un mélange'),
    (v_recipe_id, 'huile d''olive',             60,  'ml',         true,  2,  'pour l''oignon et le glaçage'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  3,  'grossièrement haché'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  4,  NULL),
    (v_recipe_id, 'origan séché',               0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'cumin',                      0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'bœuf haché',                 907, 'g',          true,  9,  '15 % de matière grasse'),
    (v_recipe_id, 'pain pita',                  4,   'unité',      true,  10, NULL),
    (v_recipe_id, 'fromage chihuahua',          150, 'g',          true,  11, 'râpé, ou monterey jack'),
    (v_recipe_id, 'mélange d''épices birria',   1,   'c. à soupe', true,  12, 'pour le glaçage');

  -- =====================================================================
  -- 8. Lamb Chops (Golden Balance)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Lamb Chops (Golden Balance)',
    'Côtelettes d''agneau marinées au yaourt, au miel pimenté et à la pâte de piment, grillées au barbecue et servies avec une sauce yaourt-miel-citron et des frites.',
    $instr$["Découper les carrés d'agneau parés en côtelettes individuelles (1 à 2 os par côtelette).",
"Dans un bol, mélanger le yaourt, la pâte de piment, la pâte d'ail, le jus de citron, le miel pimenté et l'huile d'olive.",
"Assaisonner avec le piment chipotle, le paprika et l'ail en poudre. Fouetter jusqu'à obtenir une marinade lisse.",
"Saler directement les côtelettes puis les enrober de marinade. Couvrir et réfrigérer plusieurs heures (idéalement une nuit).",
"Préchauffer le barbecue ou le gril jusqu'à ce qu'il soit très chaud.",
"Saisir les côtelettes jusqu'à ce qu'elles se détachent naturellement de la grille, les retourner et poursuivre la cuisson jusqu'à ce qu'elles soient bien grillées et cuites selon votre goût.",
"Sauce : fouetter le yaourt, le miel pimenté et le jus de citron.",
"Servir immédiatement avec les frites et la sauce."]
$instr$,
    10, 15, 8, 3,
    'Moyen-Orientale', 'dinner',
    ARRAY['moyen-oriental','agneau','grillade','yaourt','miel','miel pimenté','marinade'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/lambchops',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/68eeb46379e5081761ca2ddd/1760661190696/Screen+Shot+2025-10-14+at+4.34.15+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'carrés d''agneau',           2,   'unité',      true,  1,  'parés'),
    (v_recipe_id, 'yaourt entier',              120, 'g',          true,  2,  'pour la marinade'),
    (v_recipe_id, 'pâte de piment fort',        2,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'pâte d''ail',                1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'citron',                     0.5, 'unité',      true,  5,  'jus, pour la marinade'),
    (v_recipe_id, 'miel pimenté',               1,   'c. à café',  true,  6,  'pour la marinade'),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'piment chipotle en poudre',  1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'yaourt entier',              240, 'g',          true,  12, 'pour la sauce'),
    (v_recipe_id, 'miel pimenté',               2,   'c. à soupe', true,  13, 'pour la sauce'),
    (v_recipe_id, 'citron',                     0.5, 'unité',      true,  14, 'jus, pour la sauce'),
    (v_recipe_id, 'frites',                     800, 'g',          false, 15, 'pour servir');

  -- =====================================================================
  -- 9. Dave's Style Hot Chicken Tenders
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Dave''s Style Hot Chicken Tenders',
    'Version maison des tenders de Dave''s Hot Chicken : aiguillettes marinées au babeurre et à la sauce piquante, panées deux fois et frites, puis enrobées d''un mélange d''épices chipotle-paprika fumé. Servies avec une sauce crémeuse chipotle-miel.',
    $instr$["Marinade : mélanger le babeurre, la sauce piquante, la moutarde, l'œuf, le paprika, le chili en poudre et l'ail en poudre. Y faire mariner le poulet au moins 30 minutes.",
"Panure : mélanger la farine, la maïzena, le paprika, le chili en poudre et l'ail en poudre.",
"Double panure : enrober chaque aiguillette du mélange sec, la retremper dans la marinade, puis l'enrober à nouveau du mélange sec.",
"Chauffer l'huile de friture à 180 °C et frire les aiguillettes 5 à 6 minutes jusqu'à ce qu'elles soient dorées.",
"Mélange d'épices : combiner le paprika fumé, le piment chipotle, la cassonade, l'ail en poudre, le sazón et, si désiré, le piment de Cayenne. Badigeonner les aiguillettes d'un peu d'huile de friture chaude, puis les saupoudrer généreusement de ce mélange.",
"Sauce : mixer la mayonnaise, la sauce piquante chipotle, le miel, le vinaigre, le paprika fumé, le chili en poudre, l'ail en poudre et le sel.",
"Servir les aiguillettes chaudes avec la sauce."]
$instr$,
    20, 20, 5, 3,
    'Américaine', 'dinner',
    ARRAY['américain','poulet','tenders','frit','hot chicken','dave''s','épicé','copycat'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/davesstylechickentenders',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/687961d5da22ff057baa9452/1753995467550/Screen+Shot+2025-07-17+at+4.45.03+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'aiguillettes de poulet',     907, 'g',          true,  1,  '10 à 14 morceaux'),
    (v_recipe_id, 'babeurre',                   960, 'ml',         true,  2,  'pour la marinade'),
    (v_recipe_id, 'sauce piquante',             60,  'ml',         true,  3,  'pour la marinade'),
    (v_recipe_id, 'moutarde',                   2,   'c. à soupe', true,  4,  'pour la marinade'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  5,  'pour la marinade'),
    (v_recipe_id, 'paprika',                    1,   'c. à soupe', true,  6,  'pour la marinade'),
    (v_recipe_id, 'chili en poudre',            1,   'c. à soupe', true,  7,  'pour la marinade'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  8,  'pour la marinade'),
    (v_recipe_id, 'farine',                     500, 'g',          true,  9,  'pour la panure'),
    (v_recipe_id, 'maïzena',                    180, 'g',          true,  10, 'pour la panure'),
    (v_recipe_id, 'paprika',                    1,   'c. à soupe', true,  11, 'pour la panure'),
    (v_recipe_id, 'chili en poudre',            1,   'c. à soupe', true,  12, 'pour la panure'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  13, 'pour la panure'),
    (v_recipe_id, 'paprika fumé',               2,   'c. à soupe', true,  14, 'pour le mélange d''épices'),
    (v_recipe_id, 'piment chipotle en poudre',  2,   'c. à soupe', true,  15, 'pour le mélange d''épices'),
    (v_recipe_id, 'cassonade',                  2,   'c. à soupe', true,  16, 'pour le mélange d''épices'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  17, 'pour le mélange d''épices'),
    (v_recipe_id, 'sazón',                      1,   'c. à soupe', true,  18, 'mélange d''épices latino, pour le mélange d''épices'),
    (v_recipe_id, 'piment de Cayenne',          1,   'pincée',     false, 19, 'optionnel, pour le mélange d''épices'),
    (v_recipe_id, 'mayonnaise',                 240, 'ml',         true,  20, 'pour la sauce'),
    (v_recipe_id, 'sauce piquante chipotle',    2,   'c. à soupe', true,  21, 'ou piments chipotle en sauce adobo, pour la sauce'),
    (v_recipe_id, 'miel',                       2,   'c. à soupe', true,  22, 'pour la sauce'),
    (v_recipe_id, 'vinaigre blanc',             1,   'c. à soupe', true,  23, 'pour la sauce'),
    (v_recipe_id, 'paprika fumé',               1,   'c. à café',  true,  24, 'pour la sauce'),
    (v_recipe_id, 'chili en poudre',            1,   'c. à café',  true,  25, 'pour la sauce'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  26, 'pour la sauce'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  27, 'pour la sauce'),
    (v_recipe_id, 'huile neutre',               2,   'l',          true,  28, 'pour la friture');

  -- =====================================================================
  -- 10. Triple Pepper Gouda Smash Burger
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Triple Pepper Gouda Smash Burger',
    'Smash burger gourmand : double steak haché nappé de gouda aux poivres, sauce mayonnaise-relish-Cayenne-chipotle, cornichons et oignons caramélisés dans un pain brioché au sésame.',
    $instr$["Diviser le bœuf en 4 boules de 115 g.",
"Sauce : mélanger la relish de poivrons, la mayonnaise, le piment de Cayenne, le piment chipotle et le sel. Réfrigérer.",
"Chauffer une poêle en fonte à feu moyen-vif avec un filet d'huile.",
"Déposer les boules de viande, les couvrir de papier sulfurisé et les écraser très finement avec une presse ou une spatule. Assaisonner de sel, de poivre et d'ail en poudre.",
"Retirer le papier, cuire 2 à 3 minutes, retourner, déposer une tranche de gouda aux poivres et cuire encore 2 à 3 minutes.",
"Répéter pour les 4 steaks.",
"Toaster légèrement les pains. Monter les burgers : sauce, cornichons, 2 steaks au fromage, oignons caramélisés si désiré, sauce, puis le chapeau du pain.",
"Servir immédiatement."]
$instr$,
    15, 15, 2, 2,
    'Américaine', 'dinner',
    ARRAY['américain','smash burger','double','gouda','poivre','brioché','copycat'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-3jmj9-f4k3f',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/68070f0fc66627012126fd84/1745449787536/Screen+Shot+2025-04-23+at+4.06.20+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 454, 'g',          true,  1,  '20 % de matière grasse'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  2,  'pour la viande'),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'huile neutre',               1,   'c. à soupe', true,  5,  'pour la cuisson'),
    (v_recipe_id, 'gouda aux poivres',          4,   'tranche',    true,  6,  'ou monterey jack aux piments'),
    (v_recipe_id, 'relish de poivrons doux',    2,   'c. à soupe', true,  7,  'pour la sauce'),
    (v_recipe_id, 'mayonnaise',                 80,  'ml',         true,  8,  'pour la sauce'),
    (v_recipe_id, 'piment de Cayenne',          0.25, 'c. à café',  true,  9,  'pour la sauce'),
    (v_recipe_id, 'piment chipotle en poudre',  0.25, 'c. à café',  true,  10, 'pour la sauce'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  11, 'casher, pour la sauce'),
    (v_recipe_id, 'pain à burger brioché',      2,   'unité',      true,  12, 'au sésame'),
    (v_recipe_id, 'cornichons',                 30,  'g',          true,  13, 'tranchés'),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      false, 14, 'caramélisé, optionnel');

  -- =====================================================================
  -- 11. Healthy Hibachi
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Healthy Hibachi',
    'Hibachi maison riche en protéines : crevettes, steak maigre et légumes (courgette, courgette jaune, oignon) sautés au wok avec sauce soja et sauce barbecue thaïe, accompagnés d''une sauce yum yum allégée maison.',
    $instr$["Chauffer un wok ou une poêle antiadhésive à feu moyen-vif avec un peu d'huile en spray. Faire sauter la courgette, la courgette jaune et l'oignon 4 minutes avec une partie du sel, du poivre, de l'ail en poudre et de la sauce soja.",
"Retirer les légumes. Cuire les crevettes 1 minute par face avec un peu de sauce soja.",
"Retirer les crevettes. Cuire le steak assaisonné en une seule couche, environ 1 minute par face. Ajouter la sauce barbecue thaïe et l'ail émincé pendant la dernière minute.",
"Cuire les nouilles selon les indications du paquet.",
"Sauce yum yum : fouetter le ketchup, la mayonnaise allégée, le vinaigre de riz, le paprika, l'ail en poudre, du sel, du poivre et un peu d'eau. Ajuster la consistance.",
"Dresser : nouilles, légumes, crevettes et steak. Arroser de sauce yum yum."]
$instr$,
    15, 13, 4, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','hibachi','healthy','wok','crevettes','steak','yum yum','léger'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-tk6nh',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/68058295ef011a1921f78f0c/1745191962149/Screen+Shot+2025-04-20+at+4.27.54+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  1,  'en dés de 1 cm'),
    (v_recipe_id, 'courgette',                  1,   'unité',      true,  2,  'en demi-lunes'),
    (v_recipe_id, 'courgette jaune',            1,   'unité',      true,  3,  'en demi-lunes'),
    (v_recipe_id, 'crevettes',                  230, 'g',          true,  4,  'grosses, décortiquées'),
    (v_recipe_id, 'steak de bœuf',              230, 'g',          true,  5,  'maigre : filet, faux-filet ou bavette'),
    (v_recipe_id, 'huile en spray',             1,   'c. à soupe', true,  6,  'résistante aux hautes températures'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  10, 'émincé'),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'sauce barbecue thaïe',       1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'nouilles à sauter',          200, 'g',          true,  13, 'udon ou yakisoba'),
    (v_recipe_id, 'ketchup',                    60,  'ml',         true,  14, 'pour la sauce'),
    (v_recipe_id, 'mayonnaise allégée',         80,  'ml',         true,  15, 'pour la sauce'),
    (v_recipe_id, 'vinaigre de riz',            1,   'c. à café',  true,  16, 'pour la sauce'),
    (v_recipe_id, 'paprika',                    0.25, 'c. à café',  true,  17, 'pour la sauce'),
    (v_recipe_id, 'ail en poudre',              0.25, 'c. à café',  true,  18, 'pour la sauce');

  -- =====================================================================
  -- 12. Healthy Loaded Cheese & Beef Fries
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Healthy Loaded Cheese & Beef Fries',
    'Frites loaded version allégée : cubes de pommes de terre rôtis au four, bœuf maigre épicé aux légumes (oignon, poivron, jalapeño) et sauce fromage à base de cottage cheese et de cheddar.',
    $instr$["Préchauffer le four à 200 °C. Vaporiser une plaque d'huile et la faire chauffer dans le four.",
"Éplucher les pommes de terre et les couper en cubes de 2,5 cm. Les mélanger avec l'huile et le mélange d'épices sucré-piquant.",
"Les étaler sur la plaque chaude et cuire 25 à 30 minutes en retournant à mi-cuisson, jusqu'à ce qu'elles soient dorées.",
"Faire dorer le bœuf haché dans une poêle, puis ajouter l'oignon, le poivron et le jalapeño. Cuire 5 minutes jusqu'à ce qu'ils ramollissent.",
"Incorporer les épices pour tacos et une partie du bouillon. Cuire 2 à 3 minutes jusqu'à ce que la viande soit bien nappée.",
"Sauce fromage : mixer le cottage cheese, le cheddar, le reste du bouillon, l'assaisonnement nacho et le sazón jusqu'à obtenir une sauce lisse. La réchauffer doucement.",
"Dresser : pommes de terre, bœuf, un filet de sauce fromage et des garnitures au choix (pico de gallo, jalapeños)."]
$instr$,
    15, 30, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','frites','healthy','bœuf','cottage cheese','loaded','tex-mex','protéiné'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-blzks',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/67f5412d77183879eb39b491/1744131969953/Screen+Shot+2025-04-08+at+10.02.49+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pommes de terre',            5,   'unité',      true,  1,  'grosses, type russet (farineuses)'),
    (v_recipe_id, 'huile en spray',             1,   'c. à soupe', true,  2,  'huile d''avocat de préférence'),
    (v_recipe_id, 'mélange d''épices sucré-piquant', 1,   'c. à soupe', true,  3,  'ou mélange d''épices au choix'),
    (v_recipe_id, 'bœuf haché',                 454, 'g',          true,  4,  'maigre, 5 % de matière grasse'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  5,  'petit, finement émincé'),
    (v_recipe_id, 'poivron rouge',              1,   'unité',      true,  6,  'finement émincé'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  7,  'finement émincé'),
    (v_recipe_id, 'épices pour tacos',          3.5, 'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'bouillon de légumes',        120, 'ml',         true,  9,  'ou eau, pour le bœuf et la sauce'),
    (v_recipe_id, 'cottage cheese',             240, 'g',          true,  10, 'allégé'),
    (v_recipe_id, 'cheddar',                    30,  'g',          true,  11, 'fort, râpé'),
    (v_recipe_id, 'assaisonnement nacho au fromage', 1,   'c. à soupe', false, 12, 'optionnel'),
    (v_recipe_id, 'sazón',                      1,   'c. à soupe', true,  13, 'mélange d''épices latino');

  -- =====================================================================
  -- 13. Mexican Alambre
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Mexican Alambre',
    'Poêlée mexicaine en fonte : steak en cubes, beef bacon et légumes (oignon, poivron, jalapeño, tomate) recouverts de fromage Oaxaca fondu, servis avec des tortillas et des chips.',
    $instr$["Cuire le beef bacon dans une poêle en fonte 4 à 5 minutes à feu moyen-vif jusqu'à ce que le gras fonde. Le pousser sur le côté.",
"Ajouter l'oignon, le jalapeño et le poivron, cuire 2 à 3 minutes, les pousser sur les bords et ajouter le steak en cubes.",
"Laisser saisir le steak sans remuer 2 à 3 minutes jusqu'à ce qu'il soit bien coloré. Ajouter les épices et le sel, puis mélanger.",
"Poursuivre la cuisson 3 à 4 minutes. Incorporer l'ail et les tomates, couvrir et cuire 5 minutes.",
"Vérifier la cuisson et ajouter un peu d'eau si besoin pour obtenir une consistance légèrement saucée.",
"Ajouter le fromage et couvrir 1 minute pour le faire fondre.",
"Servir avec des tortillas chaudes et des chips."]
$instr$,
    10, 20, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','alambre','bœuf','beef bacon','fonte','oaxaca','tex-mex'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-b59hf-d8rz8-s733w-2xkm9-rhtxm-6phwx-kk28s-mm7d3-ycax2-f45ej-rcece-t7pmr-58agw-fmsrj-9dmgb-7de68',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/67e0ba41cf84c27786d49f00/1742826132454/Screen+Shot+2025-03-24+at+10.18.55+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'beef bacon',                 454, 'g',          true,  1,  'en morceaux'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  2,  'finement émincé'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  3,  'finement émincé'),
    (v_recipe_id, 'poivron rouge',              1,   'unité',      true,  4,  'finement émincé'),
    (v_recipe_id, 'steak de bœuf',              454, 'g',          true,  5,  'en cubes, morceau au choix'),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'chili en poudre',            0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'origan séché',               0.25, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',           0.25, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'cumin',                      0.25, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  11, 'casher'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  12, 'émincé'),
    (v_recipe_id, 'tomates',                    2,   'unité',      true,  13, 'grosses, en dés'),
    (v_recipe_id, 'fromage Oaxaca',             230, 'g',          true,  14, 'ou chihuahua, râpé'),
    (v_recipe_id, 'tortillas',                  8,   'unité',      true,  15, 'chaudes, pour servir'),
    (v_recipe_id, 'chips de maïs',              100, 'g',          false, 16, 'pour servir');

  -- =====================================================================
  -- 14. Chipotle Chicken Over Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chipotle Chicken Over Rice',
    'Bol équilibré : lanières de hauts de cuisse marinées au chipotle, au miel et au sazón, riz basmati jaune au curcuma, tomates, laitue et sauce crémeuse au chipotle.',
    $instr$["Couper le poulet en lanières de 1,5 cm. Le mélanger avec la sauce chipotle, le miel, le jus de citron vert, la pâte d'ail, le sazón, le paprika et l'origan. Réfrigérer de 30 minutes à 4 heures.",
"Riz : faire fondre le ghee et y faire revenir le riz basmati 1 minute avec le sazón, le bouillon en poudre et le curcuma.",
"Ajouter l'eau et laisser mijoter à couvert jusqu'à ce que le riz soit tendre.",
"Sauce : mixer la crème aigre, la mayonnaise, l'ail, la sauce chipotle, le miel, le jus de citron vert, le sel, le poivre, le paprika et l'origan jusqu'à obtenir une sauce lisse. La verser dans un flacon souple.",
"Chauffer le reste du ghee dans une poêle, cuire le poulet 2 minutes sans le remuer, puis le retourner et le faire sauter jusqu'à ce qu'il soit doré. Ajouter l'oignon pendant les 4 à 5 dernières minutes.",
"Dresser : riz, poulet, tomates et laitue. Arroser de sauce chipotle."]
$instr$,
    15, 20, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','poulet','chipotle','riz','bol','protéiné','healthy'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-b59hf-d8rz8-s733w-2xkm9-rhtxm-6phwx-kk28s-mm7d3-ycax2-f45ej-rcece-t7pmr-dfc3w',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/67ce501bdef37442649d3efb/1741614017945/Screen+Shot+2025-03-10+at+9.39.41+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  680, 'g',          true,  1,  'désossés, en lanières'),
    (v_recipe_id, 'sauce chipotle',             2,   'c. à soupe', true,  2,  'pour la marinade'),
    (v_recipe_id, 'miel',                       1,   'c. à café',  true,  3,  'pour la marinade'),
    (v_recipe_id, 'citron vert',                0.25, 'unité',      true,  4,  'jus (1 c. à café), pour la marinade'),
    (v_recipe_id, 'pâte d''ail',                1,   'c. à café',  true,  5,  'pour la marinade'),
    (v_recipe_id, 'sazón',                      1,   'c. à café',  true,  6,  'pour la marinade'),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  7,  'pour la marinade'),
    (v_recipe_id, 'origan séché',               0.5, 'c. à café',  true,  8,  'pour la marinade'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  9,  'finement émincé'),
    (v_recipe_id, 'ghee',                       1,   'c. à soupe', true,  10, 'pour le riz'),
    (v_recipe_id, 'ghee',                       1,   'c. à soupe', true,  11, 'pour le poulet'),
    (v_recipe_id, 'sazón',                      0.5, 'c. à café',  true,  12, 'pour le riz'),
    (v_recipe_id, 'bouillon de poulet en poudre', 0.5, 'c. à café',  true,  13, 'pour le riz'),
    (v_recipe_id, 'curcuma',                    0.25, 'c. à café',  true,  14, NULL),
    (v_recipe_id, 'riz basmati',                300, 'g',          true,  15, NULL),
    (v_recipe_id, 'eau',                        480, 'ml',         true,  16, 'pour le riz'),
    (v_recipe_id, 'crème aigre',                240, 'g',          true,  17, 'pour la sauce'),
    (v_recipe_id, 'mayonnaise',                 120, 'ml',         true,  18, 'pour la sauce'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  19, 'pour la sauce'),
    (v_recipe_id, 'sauce chipotle',             1,   'c. à soupe', true,  20, 'pour la sauce'),
    (v_recipe_id, 'miel',                       1,   'c. à café',  true,  21, 'pour la sauce'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  22, 'jus, pour la sauce'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  23, 'pour la sauce'),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  24, 'pour la sauce'),
    (v_recipe_id, 'paprika',                    1,   'pincée',     true,  25, 'pour la sauce'),
    (v_recipe_id, 'origan séché',               1,   'pincée',     true,  26, 'pour la sauce'),
    (v_recipe_id, 'tomate',                     1,   'unité',      false, 27, 'en dés'),
    (v_recipe_id, 'laitue',                     2,   'feuille',    false, 28, 'émincée');

  -- =====================================================================
  -- 15. Parmesan Garlic Chicken Tenders
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Parmesan Garlic Chicken Tenders',
    'Aiguillettes de poulet croustillantes marinées au babeurre et au jus de cornichon, nappées d''une sauce beurre-ail-piment et de parmesan fraîchement râpé. Inspirées de Wingstop.',
    $instr$["Marinade : mélanger le babeurre, le jus de cornichon, la sauce piquante, l'oignon en poudre, l'ail en poudre, le chili en poudre, le piment de Cayenne et le sazón. Faire mariner le poulet au moins 4 heures (idéalement une nuit).",
"Panure : mélanger la farine, la maïzena, la levure chimique, l'oignon en poudre, l'ail en poudre, le chili en poudre, le piment de Cayenne et le sazón.",
"Préchauffer l'huile de friture à 175 °C.",
"Sauce : faire fondre le beurre à feu moyen, ajouter l'ail émincé, les flocons de piment et le thym. Laisser frémir 1 minute puis incorporer la mayonnaise japonaise jusqu'à obtenir une sauce lisse.",
"Sortir les aiguillettes de la marinade en laissant l'excédent s'égoutter, puis les enrober de panure.",
"Frire 5 à 6 minutes par fournée jusqu'à ce qu'elles soient dorées. Les égoutter sur une grille, puis les refrire 1 minute pour plus de croustillant.",
"Badigeonner de sauce à l'ail, saupoudrer généreusement de parmesan fraîchement râpé et servir immédiatement."]
$instr$,
    15, 15, 5, 3,
    'Américaine', 'dinner',
    ARRAY['américain','poulet','tenders','frit','parmesan','ail','wingstop','copycat'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-3chlp',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/674f4bf1c8b8fe13c2b349cf/1733328933977/Screen+Shot+2024-12-04+at+8.14.47+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'aiguillettes de poulet',     907, 'g',          true,  1,  NULL),
    (v_recipe_id, 'babeurre',                   720, 'ml',         true,  2,  'pour la marinade'),
    (v_recipe_id, 'jus de cornichon',           60,  'ml',         true,  3,  'pour la marinade'),
    (v_recipe_id, 'sauce piquante',             3,   'c. à soupe', true,  4,  'pour la marinade'),
    (v_recipe_id, 'oignon en poudre',           1,   'c. à café',  true,  5,  'pour la marinade'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  6,  'pour la marinade'),
    (v_recipe_id, 'chili en poudre',            1,   'c. à café',  true,  7,  'pour la marinade'),
    (v_recipe_id, 'piment de Cayenne',          0.5, 'c. à café',  true,  8,  'pour la marinade'),
    (v_recipe_id, 'sazón',                      1,   'c. à soupe', true,  9,  'pour la marinade'),
    (v_recipe_id, 'farine',                     250, 'g',          true,  10, 'pour la panure'),
    (v_recipe_id, 'maïzena',                    60,  'g',          true,  11, 'pour la panure'),
    (v_recipe_id, 'levure chimique',            1,   'c. à café',  true,  12, 'pour la panure'),
    (v_recipe_id, 'oignon en poudre',           1,   'c. à café',  true,  13, 'pour la panure'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  14, 'pour la panure'),
    (v_recipe_id, 'chili en poudre',            1,   'c. à café',  true,  15, 'pour la panure'),
    (v_recipe_id, 'piment de Cayenne',          0.5, 'c. à café',  true,  16, 'pour la panure'),
    (v_recipe_id, 'sazón',                      1,   'c. à soupe', true,  17, 'pour la panure'),
    (v_recipe_id, 'beurre doux',                4,   'c. à soupe', true,  18, 'pour la sauce'),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  19, 'émincé (2 c. à soupe), pour la sauce'),
    (v_recipe_id, 'flocons de piment',          0.5, 'c. à café',  true,  20, 'pour la sauce'),
    (v_recipe_id, 'thym séché',                 0.25, 'c. à café',  true,  21, 'pour la sauce'),
    (v_recipe_id, 'mayonnaise japonaise',       60,  'ml',         true,  22, 'type Kewpie, pour la sauce'),
    (v_recipe_id, 'parmesan',                   60,  'g',          true,  23, 'fraîchement râpé'),
    (v_recipe_id, 'huile neutre',               2,   'l',          true,  24, 'pour la friture');

  -- =====================================================================
  -- 16. Tandoori Chicken and Rice (Golden Balance)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Tandoori Chicken and Rice (Golden Balance)',
    'Bol équilibré : poulet mariné façon tandoori (yaourt grec, pâte gingembre-ail, piment du Cachemire, tandoori masala) rôti au four, riz basmati au cumin et à la coriandre, et sauce verte au yaourt, à la coriandre, à la menthe et au jalapeño.',
    $instr$["Préchauffer le four à 190 °C.",
"Marinade : mélanger la pâte gingembre-ail, le yaourt grec, le piment du Cachemire, le tandoori masala, l'huile d'olive et le jus de citron. Enrober le poulet et laisser mariner au moins 2 heures (idéalement une nuit).",
"Étaler le poulet sur une grille posée sur une plaque et cuire 20 minutes, jusqu'à 75 °C à cœur et une belle coloration.",
"Sauce verte : mixer la coriandre, la menthe, le jalapeño, le jus de citron vert, l'ail, le yaourt et le bouillon en poudre. Détendre avec un peu d'eau, verser dans un flacon souple et réfrigérer.",
"Riz : faire fondre le ghee à feu moyen et y faire griller les graines de cumin et de coriandre 30 secondes. Ajouter le riz, le bouillon en poudre, la feuille de laurier et l'eau. Porter à ébullition, puis baisser le feu, couvrir et cuire 12 à 15 minutes.",
"Faire sauter l'oignon rouge et le poivron rouge dans l'huile d'olive 10 minutes, jusqu'à ce qu'ils soient tendres et légèrement grillés.",
"Dresser : riz, poulet, légumes sautés et laitue. Arroser généreusement de sauce verte."]
$instr$,
    20, 25, 4, 3,
    'Indienne', 'dinner',
    ARRAY['indien','poulet','tandoori','riz','bol','yaourt','sauce aux herbes','healthy'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-gwg5s-92r27-d7b43-rhklg-pwbdf',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/673357fc95afdb08a3b39d33/1732027642246/Screen+Shot+2024-11-19+at+6.45.12+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',           907, 'g',          true,  1,  'en morceaux de 1 cm'),
    (v_recipe_id, 'pâte gingembre-ail',         1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'yaourt grec',                60,  'g',          true,  3,  'pour la marinade'),
    (v_recipe_id, 'piment du Cachemire en poudre', 2,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'tandoori masala',            2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'citron',                     1,   'unité',      true,  6,  'jus, pour la marinade'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  7,  'pour la marinade'),
    (v_recipe_id, 'ghee',                       1,   'c. à soupe', true,  8,  'pour le riz'),
    (v_recipe_id, 'graines de cumin',           1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'graines de coriandre',       0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'riz basmati',                300, 'g',          true,  11, 'rincé et égoutté'),
    (v_recipe_id, 'bouillon de poulet en poudre', 1,   'c. à café',  true,  12, 'pour le riz'),
    (v_recipe_id, 'laurier',                    1,   'feuille',    true,  13, 'séché'),
    (v_recipe_id, 'eau',                        420, 'ml',         true,  14, 'pour le riz'),
    (v_recipe_id, 'coriandre fraîche',          0.5, 'botte',      true,  15, 'pour la sauce'),
    (v_recipe_id, 'menthe fraîche',             10,  'g',          true,  16, 'feuilles, pour la sauce'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  17, 'épépiné, pour la sauce'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  18, 'jus, pour la sauce'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  19, 'pour la sauce'),
    (v_recipe_id, 'yaourt nature',              120, 'g',          true,  20, 'pour la sauce'),
    (v_recipe_id, 'bouillon de poulet en poudre', 0.5, 'c. à café',  true,  21, 'pour la sauce'),
    (v_recipe_id, 'oignon rouge',               1,   'unité',      true,  22, 'finement émincé'),
    (v_recipe_id, 'poivron rouge',              1,   'unité',      true,  23, 'finement émincé'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  24, 'pour les légumes'),
    (v_recipe_id, 'laitue',                     2,   'feuille',    false, 25, 'émincée');

  -- =====================================================================
  -- 17. GB Style Salmon Over Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'GB Style Salmon Over Rice',
    'Bol signature de Golden Balance : cubes de saumon épicés (chipotle, paprika fumé, Cayenne) sur un riz rond au beurre et au concentré de tomate, surmontés d''une salade édamame-poivron-jalapeño et de mayonnaise sriracha.',
    $instr$["Mélanger les épices : piment chipotle, origan, paprika fumé, piment de Cayenne, oignon en poudre, ail en poudre, poivre et sel. Diviser le mélange en deux.",
"Préchauffer le four à 200 °C avec une plaque à l'intérieur.",
"Enrober les cubes de saumon de la moitié du mélange d'épices et de l'huile.",
"Faire revenir le concentré de tomate dans le beurre. Ajouter le reste du mélange d'épices et le sazón, puis le riz et l'eau. Laisser mijoter à couvert 9 à 12 minutes.",
"Cuire le saumon sur la plaque chaude 8 à 10 minutes, jusqu'à ce qu'il soit juste cuit.",
"Mélanger le poivron, le jalapeño, les édamames, la coriandre et le jus de citron vert.",
"Servir : riz, saumon, salade d'édamames et mayonnaise sriracha."]
$instr$,
    20, 15, 4, 3,
    'Fusion', 'dinner',
    ARRAY['saumon','riz','bol','protéiné','fusion','épicé','signature'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-lmcx7-849r5',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/6703ecaaf29e201c8b8b8462/1728390363712/Screen+Shot+2024-10-08+at+7.18.38+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filet de saumon',            680, 'g',          true,  1,  'sans peau, en cubes'),
    (v_recipe_id, 'huile neutre',               2,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'piment chipotle en poudre',  0.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'origan séché',               0.25, 'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'paprika fumé',               0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'piment de Cayenne',          0.25, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'oignon en poudre',           0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'poivre noir',                0.25, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'beurre doux',                2,   'c. à soupe', true,  11, 'pour le riz'),
    (v_recipe_id, 'concentré de tomate',        1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'sazón',                      1,   'c. à café',  true,  13, 'mélange d''épices latino'),
    (v_recipe_id, 'riz rond',                   200, 'g',          true,  14, 'type riz à sushi ou calrose'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  15, 'ou bouillon'),
    (v_recipe_id, 'édamames',                   150, 'g',          true,  16, 'écossés, cuits'),
    (v_recipe_id, 'poivron rouge',              1,   'unité',      true,  17, 'en dés'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  18, 'en dés'),
    (v_recipe_id, 'coriandre fraîche',          15,  'g',          true,  19, 'hachée'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  20, 'jus'),
    (v_recipe_id, 'mayonnaise sriracha',        60,  'ml',         true,  21, 'allégée');

  -- =====================================================================
  -- 18. Korean Fried Chicken Sandwich
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Korean Fried Chicken Sandwich',
    'Burger brioché à la coréenne : haut de cuisse pané avec une pâte à l''eau gazeuse, glacé à la sauce chili douce, à la sriracha et au soja, avec provolone fondu, coleslaw au kimchi et cornichons.',
    $instr$["Assaisonner les hauts de cuisse des deux côtés avec le sel, la cuillère de farine et le chili en poudre.",
"Panure : mélanger la farine, la fécule de pomme de terre, le paprika, l'ail en poudre, l'oignon en poudre, le piment de Cayenne, le sel et le poivre. En transférer un tiers dans un autre bol et le fouetter avec l'œuf et l'eau gazeuse jusqu'à obtenir une pâte lisse.",
"Préchauffer l'huile de friture à 165 °C.",
"Coleslaw : mélanger la mayonnaise, le kimchi finement haché et l'huile de sésame. En mélanger la moitié avec le chou et réserver le reste comme sauce.",
"Glaçage : chauffer la sauce chili douce, la sauce soja, la sriracha et l'huile de sésame jusqu'à frémissement.",
"Tremper les hauts de cuisse dans la pâte, puis dans le mélange sec en tapotant pour bien les enrober.",
"Frire 6 à 8 minutes, jusqu'à 75 °C à cœur et une belle coloration. Monter l'huile à 190 °C et frire encore 1 minute.",
"Tremper le poulet dans le glaçage, déposer une tranche de provolone et passer 2 à 3 minutes sous le gril du four.",
"Montage : coleslaw sur le pain grillé, poulet glacé, un peu de sauce réservée, cornichons, puis le chapeau du pain. Servir immédiatement."]
$instr$,
    15, 15, 4, 3,
    'Coréenne', 'dinner',
    ARRAY['coréen','poulet','frit','sandwich','brioché','kimchi','chili douce','provolone'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-6w7jj-2b72b-48m2n-g2s5f-hpt5l-ljmjc-mf28a-g6mk5-m7zf7',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/66e5f547c3adc870f1a82e26/1726346768810/Screen+Shot+2024-09-14+at+1.32.18+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  4,   'unité',      true,  1,  'désossés, sans peau'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  2,  'casher, pour assaisonner le poulet'),
    (v_recipe_id, 'farine',                     1,   'c. à café',  true,  3,  'pour assaisonner le poulet'),
    (v_recipe_id, 'chili en poudre',            1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'farine',                     250, 'g',          true,  5,  'pour la panure'),
    (v_recipe_id, 'fécule de pomme de terre',   90,  'g',          true,  6,  'ou maïzena'),
    (v_recipe_id, 'paprika',                    1,   'c. à soupe', true,  7,  'pour la panure'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  8,  'pour la panure'),
    (v_recipe_id, 'oignon en poudre',           1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'piment de Cayenne',          1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  11, 'pour la panure'),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  12, NULL),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  13, NULL),
    (v_recipe_id, 'eau gazeuse',                240, 'ml',         true,  14, 'pour la pâte'),
    (v_recipe_id, 'huile de sésame',            1,   'c. à café',  true,  15, 'pour le coleslaw'),
    (v_recipe_id, 'mayonnaise',                 120, 'ml',         true,  16, 'pour le coleslaw'),
    (v_recipe_id, 'kimchi',                     120, 'g',          true,  17, 'finement haché'),
    (v_recipe_id, 'chou blanc',                 200, 'g',          true,  18, 'râpé, ou mélange pour coleslaw'),
    (v_recipe_id, 'sauce chili douce',          120, 'ml',         true,  19, 'pour le glaçage'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  20, 'pour le glaçage'),
    (v_recipe_id, 'sriracha',                   60,  'ml',         true,  21, 'pour le glaçage'),
    (v_recipe_id, 'huile de sésame',            0.5, 'c. à café',  true,  22, 'pour le glaçage'),
    (v_recipe_id, 'pain à burger brioché',      4,   'unité',      true,  23, NULL),
    (v_recipe_id, 'provolone',                  4,   'tranche',    true,  24, NULL),
    (v_recipe_id, 'cornichons',                 30,  'g',          true,  25, 'tranchés'),
    (v_recipe_id, 'huile neutre',               2,   'l',          true,  26, 'pour la friture');

  -- =====================================================================
  -- 19. Kimchi Fried Rice (Golden Balance)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Kimchi Fried Rice (Golden Balance)',
    'Riz frit coréen au kimchi et au beef bacon croustillant, relevé d''une sauce gochujang-gochugaru-sésame et garni de nori et d''un œuf au plat. Mozzarella fondue en option.',
    $instr$["Chauffer une grande poêle à feu moyen-vif. Faire cuire les dés de beef bacon jusqu'à ce qu'ils soient croustillants. Les réserver en laissant le gras dans la poêle.",
"Dans un bol, fouetter l'huile de sésame, le gochugaru, le gochujang, le sucre et le glutamate.",
"Ajouter l'ail et le kimchi dans la poêle et cuire 1 minute. Ajouter le riz et le presser en une couche uniforme. Laisser cuire sans remuer 3 à 4 minutes.",
"Mélanger, remettre le beef bacon, verser la sauce et cuire encore 2 à 3 minutes.",
"Couper le feu et rectifier l'assaisonnement. Ajouter le fromage si désiré et le laisser fondre.",
"Incorporer le nori émietté. Servir avec un œuf au plat."]
$instr$,
    10, 10, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','riz frit','kimchi','beef bacon','gochujang','rapide','œuf'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-6w7jj-2b72b-48m2n',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/66dddca2f73804226fdeb6d9/1726346550532/Screen+Shot+2024-09-14+at+1.31.59+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'kimchi',                     150, 'g',          true,  1,  'haché'),
    (v_recipe_id, 'beef bacon',                 150, 'g',          true,  2,  'en dés'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  3,  'émincé (1 c. à soupe)'),
    (v_recipe_id, 'riz blanc',                  150, 'g',          true,  4,  'cuit la veille et refroidi (≈ 400 g de riz cuit)'),
    (v_recipe_id, 'huile de sésame',            0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'gochugaru',                  0.5, 'c. à café',  true,  6,  'flocons de piment coréen'),
    (v_recipe_id, 'gochujang',                  0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sucre',                      0.25, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'glutamate monosodique',      0.25, 'c. à café',  false, 9,  'MSG, optionnel'),
    (v_recipe_id, 'feuilles de nori',           4,   'unité',      true,  10, 'émiettées'),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  11, 'au plat'),
    (v_recipe_id, 'mozzarella',                 60,  'g',          false, 12, 'râpée, optionnel');

  -- =====================================================================
  -- 20. Halal Cart Chicken Over Rice (Golden Balance)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Halal Cart Chicken Over Rice (Golden Balance)',
    'Version maison du plat des food trucks halal new-yorkais : riz basmati rouge relevé à la pâte de piment, lanières de cuisses de poulet au sazón, au paprika et au citron, sauce blanche maison, laitue et tomate.',
    $instr$["Riz épicé : chauffer le ghee avec la pâte de piment, le paprika, le cumin et le bouillon en poudre. Ajouter le riz égoutté et l'eau. Laisser mijoter environ 20 minutes jusqu'à absorption complète.",
"Mélanger le poulet en lanières avec le paprika, l'origan, l'ail en poudre, le sazón, le jus de citron et l'huile d'olive. Laisser mariner 15 à 30 minutes (jusqu'à 12 heures).",
"Sauce blanche : fouetter la crème aigre, la mayonnaise, le vinaigre blanc, le persil séché, le sel assaisonné et le jus de citron. Réfrigérer dans un flacon souple.",
"Cuire le poulet dans une grande poêle à feu moyen-vif 6 à 8 minutes sans le remuer, puis détacher les morceaux et poursuivre la cuisson 3 à 4 minutes.",
"Dresser : riz, poulet, laitue, tomate et sauce blanche."]
$instr$,
    15, 25, 4, 3,
    'Moyen-Orientale', 'dinner',
    ARRAY['moyen-oriental','halal','poulet','riz','street food','new york','sauce blanche'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-title-mb3aa-zafs5',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/666a07aa1fce0f371fc3e56d/1718225707650/Screen+Shot+2024-06-12+at+1.48.10+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz basmati',                300, 'g',          true,  1,  'rincé et trempé 1 h'),
    (v_recipe_id, 'ghee',                       1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'pâte de piment fort',        1,   'c. à soupe', true,  3,  'type biber salçası'),
    (v_recipe_id, 'paprika',                    0.25, 'c. à café',  true,  4,  'pour le riz'),
    (v_recipe_id, 'cumin',                      0.25, 'c. à café',  true,  5,  'pour le riz'),
    (v_recipe_id, 'bouillon de poulet en poudre', 1,   'c. à café',  true,  6,  'pour le riz'),
    (v_recipe_id, 'eau',                        720, 'ml',         true,  7,  'pour le riz'),
    (v_recipe_id, 'hauts de cuisse de poulet',  454, 'g',          true,  8,  'désossés, en lanières de 1 cm'),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  9,  'pour le poulet'),
    (v_recipe_id, 'origan séché',               0.25, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'sazón',                      0.5, 'c. à café',  true,  12, 'mélange d''épices latino'),
    (v_recipe_id, 'jus de citron',              1,   'c. à soupe', true,  13, 'pour le poulet'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'crème aigre',                80,  'g',          true,  15, 'pour la sauce blanche'),
    (v_recipe_id, 'mayonnaise',                 60,  'ml',         true,  16, 'pour la sauce blanche'),
    (v_recipe_id, 'vinaigre blanc',             1,   'c. à soupe', true,  17, 'pour la sauce blanche'),
    (v_recipe_id, 'persil séché',               1,   'c. à soupe', true,  18, 'pour la sauce blanche'),
    (v_recipe_id, 'sel assaisonné',             1,   'c. à soupe', true,  19, 'ou sel casher, à doser selon le goût, pour la sauce blanche'),
    (v_recipe_id, 'citron',                     1,   'unité',      true,  20, 'jus, pour la sauce blanche'),
    (v_recipe_id, 'laitue',                     2,   'feuille',    true,  21, 'émincée'),
    (v_recipe_id, 'tomate',                     1,   'unité',      true,  22, 'en dés');

  -- =====================================================================
  -- 21. Picadillo (Stewed Beef and Potatoes)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Picadillo (Stewed Beef and Potatoes)',
    'Plat mexicain familial : bœuf haché mijoté avec des pommes de terre dans une sauce maison mixée (oignon, tomate, ail, jalapeño, coriandre, bouillon), gratiné au fromage et servi avec des tortillas.',
    $instr$["Mixer l'oignon, l'ail, la tomate, le jalapeño, la coriandre, le bouillon en poudre et 60 ml d'eau jusqu'à obtenir une sauce liquide.",
"Mélanger les épices sèches : ail en poudre, sel, oignon en poudre, paprika et poivre.",
"Faire dorer le bœuf haché dans une grande poêle à feu moyen-vif. Ajouter les épices et cuire 1 à 2 minutes.",
"Ajouter les pommes de terre en dés, mélanger, puis verser la sauce mixée.",
"Laisser mijoter 20 à 30 minutes, jusqu'à ce que les pommes de terre soient tendres et la sauce réduite.",
"Parsemer de fromage, couvrir et laisser fondre 3 à 4 minutes.",
"Servir avec des tortillas."]
$instr$,
    10, 30, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','picadillo','bœuf','pommes de terre','one-pot','tortillas','familial'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/picadillo',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/6552b541796fc95ab447c25a/1701286333994/picadillo.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 454, 'g',          true,  1,  NULL),
    (v_recipe_id, 'oignon blanc',               0.5, 'unité',      true,  2,  'grossièrement haché'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  3,  NULL),
    (v_recipe_id, 'tomate',                     1,   'unité',      true,  4,  'grande, hachée'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  5,  'grossièrement haché'),
    (v_recipe_id, 'coriandre fraîche',          0.5, 'botte',      true,  6,  NULL),
    (v_recipe_id, 'bouillon de poulet en poudre', 1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'eau',                        60,  'ml',         true,  8,  'pour la sauce'),
    (v_recipe_id, 'pommes de terre',            300, 'g',          true,  9,  'pelées, en dés de 2,5 cm'),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'oignon en poudre',           0.25, 'c. à café',  true,  12, NULL),
    (v_recipe_id, 'paprika',                    0.25, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'poivre noir',                0.25, 'c. à café',  true,  14, NULL),
    (v_recipe_id, 'fromage râpé',               120, 'g',          true,  15, NULL),
    (v_recipe_id, 'tortillas',                  8,   'unité',      true,  16, 'pour servir');

  -- =====================================================================
  -- 22. Beef Burrito Bowls
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Beef Burrito Bowls',
    'Bowl façon Chipotle : paleron de bœuf en cubes braisé dans une sauce aux piments guajillo, riz coriandre-citron vert, haricots noirs et sauce queso aux fromages.',
    $instr$["Faire tremper les piments guajillo dans de l'eau chaude, puis les mixer avec 120 ml de leur eau de trempage jusqu'à obtenir une purée lisse.",
"Saisir le bœuf dans l'huile chaude. Ajouter la purée de piments, l'oignon, l'eau et les épices. Laisser mijoter à couvert 1 h 30 à 2 h, jusqu'à ce que la viande soit tendre.",
"Queso : chauffer le lait et y faire fondre le fromage fondu et le fromage râpé avec les piments verts. Incorporer la sauce chipotle.",
"Riz coriandre-citron vert : mélanger le riz cuit avec le jus de citron vert, la coriandre et une pincée de sel.",
"Dresser dans des bols : riz, haricots noirs, bœuf et sauce queso."]
$instr$,
    30, 120, 4, 3,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','burrito bowl','bœuf','guajillo','riz','queso','copycat'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/beef-burrito-bowls',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/652ea38cd6c4e1255b95d3b7/1698079348932/burritobowl.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'piments guajillo séchés',    4,   'unité',      true,  1,  'trempés'),
    (v_recipe_id, 'eau',                        120, 'ml',         true,  2,  'eau de trempage des piments, pour la purée'),
    (v_recipe_id, 'paleron de bœuf',            454, 'g',          true,  3,  'en cubes'),
    (v_recipe_id, 'huile neutre',               1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'oignon rouge',               1,   'unité',      true,  5,  'en cubes'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  6,  'ou bouillon, pour le braisage'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'poivre noir',                0.25, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'origan séché',               0.25, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'cumin',                      0.25, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'piment de la Jamaïque',      0.125, 'c. à café',  true,  11, 'moulu'),
    (v_recipe_id, 'lait entier',                240, 'ml',         true,  12, 'pour le queso'),
    (v_recipe_id, 'fromage fondu',              3,   'tranche',    true,  13, 'type American cheese, pour le queso'),
    (v_recipe_id, 'piments verts doux en conserve', 110, 'g',          true,  14, 'hachés, 1 petite boîte'),
    (v_recipe_id, 'fromage râpé',               60,  'g',          true,  15, 'mélange mexicain, pour le queso'),
    (v_recipe_id, 'sauce chipotle',             1,   'c. à soupe', true,  16, 'pour le queso'),
    (v_recipe_id, 'riz blanc',                  150, 'g',          true,  17, 'cuit (≈ 400 g de riz cuit)'),
    (v_recipe_id, 'citron vert',                0.5, 'unité',      true,  18, 'jus'),
    (v_recipe_id, 'coriandre fraîche',          15,  'g',          true,  19, 'hachée'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  20, 'pour le riz'),
    (v_recipe_id, 'haricots noirs',             400, 'g',          true,  21, '1 boîte de 400 g, égouttés');

  -- =====================================================================
  -- 23. Spicy Salmon Crispy Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Spicy Salmon Crispy Rice',
    'Bouchées raffinées : cubes de riz à sushi vinaigré cuit avec du kombu, frits jusqu''à être dorés et croustillants, puis surmontés d''un tartare de saumon à la mayonnaise japonaise, à la sriracha et au furikake.',
    $instr$["Riz : rincer abondamment le riz, puis le cuire avec l'eau et le kombu (programme riz blanc du cuiseur).",
"Saumon : couper le saumon en très petits dés et le mélanger avec la mayonnaise japonaise, la sriracha, la sauce soja, l'huile de sésame et le furikake. Couvrir et réfrigérer.",
"Chauffer le vinaigre de riz, le sucre et le sel jusqu'à dissolution complète. Laisser refroidir.",
"Incorporer délicatement ce mélange vinaigré au riz cuit.",
"Tapisser un moule de film alimentaire, y tasser le riz et le presser sous un poids 2 heures au réfrigérateur.",
"Démouler et couper en 10 cubes avec un couteau humide.",
"Frire les cubes de riz à 190 °C, par fournées, jusqu'à ce qu'ils soient dorés et croustillants.",
"Garnir chaque cube de tartare de saumon et servir immédiatement."]
$instr$,
    140, 20, 5, 4,
    'Japonaise', 'appetizer',
    ARRAY['japonais','sushi','saumon','riz croustillant','apéritif','furikake','raffiné'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/spicy-salmon-crispy-rice',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/64da9fc5f326887ddac6e881/1694126668656/Spicy+Salmon+Crispy+Rice.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz à sushi',                400, 'g',          true,  1,  'ou riz calrose'),
    (v_recipe_id, 'eau',                        420, 'ml',         true,  2,  'pour la cuisson du riz'),
    (v_recipe_id, 'kombu',                      7.5, 'cm',         true,  3,  '1 morceau'),
    (v_recipe_id, 'filet de saumon',            454, 'g',          true,  4,  'qualité sashimi'),
    (v_recipe_id, 'mayonnaise japonaise',       1,   'c. à soupe', true,  5,  'type Kewpie'),
    (v_recipe_id, 'sriracha',                   1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'sauce soja',                 0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'huile de sésame',            0.25, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'furikake',                   1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'vinaigre de riz',            60,  'ml',         true,  10, 'pour le riz'),
    (v_recipe_id, 'sucre',                      1,   'c. à soupe', true,  11, 'pour le riz'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  12, 'pour le riz'),
    (v_recipe_id, 'huile neutre',               2,   'l',          true,  13, 'pour la friture');

  -- =====================================================================
  -- 24. Pakistani Nihari
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Pakistani Nihari',
    'Ragoût pakistanais traditionnel : jarrets d''agneau cuits sous pression avec un mélange d''épices entières (cardamome, clous de girofle, cannelle, fenouil, carvi…) et épaissi à la farine de blé grillée. Servi avec des naans à l''ail.',
    $instr$["Chauffer l'huile dans un autocuiseur et y faire dorer les oignons émincés jusqu'à ce qu'ils soient parfumés. Les retirer en conservant l'huile.",
"Mélange d'épices : moudre la cardamome, les clous de girofle, le poivre, la cannelle, le laurier, le fenouil, la coriandre et le carvi.",
"Mixer l'ail et le gingembre en pâte. Saisir les jarrets d'agneau dans l'autocuiseur, puis ajouter les oignons, le mélange d'épices, la pâte ail-gingembre, les piments verts, le piment du Cachemire, le curcuma et le sel. Couvrir d'eau.",
"Cuire sous haute pression 1 h 15.",
"Pendant ce temps, préparer les naans : activer la levure dans 2 c. à soupe d'eau tiède avec le sucre, puis mélanger avec la farine, le yaourt, le sel, l'huile d'olive et le reste de l'eau tiède pour former une pâte souple.",
"Façonner en boule, couvrir et laisser lever 30 à 60 minutes, jusqu'à ce que la pâte ait presque doublé de volume.",
"Diviser en 8 boules et laisser reposer 15 minutes.",
"Étaler chaque boule en ovale et la cuire sur une surface très chaude jusqu'à ce qu'elle gonfle et noircisse par endroits. Badigeonner de beurre fondu à l'ail et à la coriandre.",
"Faire griller la farine de blé à sec jusqu'à ce qu'elle soit dorée. La délayer dans l'eau pour former une liaison, l'incorporer au bouillon de cuisson et laisser frémir quelques minutes pour épaissir.",
"Servir dans des bols : jarret et sauce, coriandre fraîche, lamelles de gingembre et un filet de jus de citron vert."]
$instr$,
    20, 90, 5, 5,
    'Pakistanaise', 'dinner',
    ARRAY['pakistanais','agneau','jarret','ragoût','épicé','festif','nihari','naan','autocuiseur'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/pakistaninihari',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/69c97dd48b5f845a4e569db1/1774816557016/Screenshot+2026-03-25+at+5.03.35%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'jarrets d''agneau',          4,   'unité',      true,  1,  'gros'),
    (v_recipe_id, 'oignon rouge',               2,   'unité',      true,  2,  'gros, émincés'),
    (v_recipe_id, 'huile neutre',               80,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'ail',                        10,  'gousse',     true,  4,  'mixé en pâte avec le gingembre'),
    (v_recipe_id, 'gingembre',                  5,   'cm',         true,  5,  'pelé, mixé en pâte avec l''ail'),
    (v_recipe_id, 'piment vert',                2,   'unité',      true,  6,  '1 à 2'),
    (v_recipe_id, 'piment du Cachemire en poudre', 1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'curcuma',                    1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à soupe', true,  9,  'au goût, pour le ragoût'),
    (v_recipe_id, 'eau',                        1.5, 'l',          true,  10, 'pour la cuisson sous pression, quantité indicative'),
    (v_recipe_id, 'cardamome verte',            11,  'unité',      true,  11, 'gousses, 10 à 12'),
    (v_recipe_id, 'clous de girofle',           8,   'unité',      true,  12, NULL),
    (v_recipe_id, 'poivre noir en grains',      1,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'cannelle',                   1,   'bâton',      true,  14, NULL),
    (v_recipe_id, 'laurier',                    2,   'feuille',    true,  15, NULL),
    (v_recipe_id, 'graines de fenouil',         2,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'graines de coriandre',       2,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'graines de carvi',           2,   'c. à café',  true,  18, NULL),
    (v_recipe_id, 'farine de blé',              125, 'g',          true,  19, 'grillée à sec, pour la liaison'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  20, 'pour la liaison'),
    (v_recipe_id, 'levure boulangère sèche',    2,   'c. à café',  true,  21, 'pour les naans'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  22, 'pour les naans'),
    (v_recipe_id, 'eau',                        190, 'ml',         true,  23, 'tiède, pour les naans'),
    (v_recipe_id, 'farine',                     375, 'g',          true,  24, 'pour les naans'),
    (v_recipe_id, 'yaourt nature',              360, 'g',          true,  25, 'entier, pour les naans'),
    (v_recipe_id, 'huile d''olive',             60,  'ml',         true,  26, 'pour les naans'),
    (v_recipe_id, 'sel',                        1.5, 'c. à café',  true,  27, 'pour les naans'),
    (v_recipe_id, 'beurre doux',                4,   'c. à soupe', true,  28, 'fondu, pour badigeonner les naans'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  29, 'émincé, pour le beurre'),
    (v_recipe_id, 'coriandre fraîche',          15,  'g',          true,  30, 'hachée, pour le beurre'),
    (v_recipe_id, 'coriandre fraîche',          10,  'g',          false, 31, 'pour servir'),
    (v_recipe_id, 'gingembre',                  2,   'cm',         false, 32, 'en fines lamelles, pour servir'),
    (v_recipe_id, 'citron vert',                1,   'unité',      false, 33, 'pour servir');

END $$;
