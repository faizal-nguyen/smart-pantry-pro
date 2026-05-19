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
    'Cheese steak fusion moyen-oriental : ribeye émincé sauté avec oignons et poivrons aux 7 épices (cumin, coriandre, allspice, cardamome, chipotle, ail, paprika), couvert de cheddar fondant sur pain hoagie.',
    $instr$["Faire fondre la graisse de bœuf sur une plaque chaude. Sauter oignons et poivron vert hachés à feu moyen jusqu'à amollissement.",
"Assaisonner les légumes avec cumin, coriandre, allspice, cardamome, chipotle, paprika fumé, ail, jalapeño tranché et sel. Cuire jusqu'à oignons translucides et poivrons tendres. Réserver.",
"Ajouter du tallow sur la plaque. Étaler le ribeye émincé en couche unique. Former une croûte puis hacher à la spatule une fois coloré.",
"Assaisonner le bœuf avec le mélange d'épices et le sel.",
"Replier le bœuf dans le mélange de légumes. Ajouter banana peppers, cherry peppers et tranches de cheddar. Couvrir pour faire fondre.",
"Poser le pain hoagie ouvert face vers le bas sur la masse. Couvrir d'un papier sulfurisé, passer la spatule en-dessous et retourner dans le pain."]
$instr$,
    5, 20, 3, 3,
    'Américaine', 'dinner',
    ARRAY['américain','fusion','cheese steak','ribeye','7 épices','poivrons','sandwich'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/7spicecheesesteak',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/69c1ea93842fa96c0bf20626/1774317358546/Screenshot+2026-03-23+at+9.35.52%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ribeye',                     907, 'g',          true,  1,  'tranché finement'),
    (v_recipe_id, 'pain hoagie',                2,   'unité',      true,  2,  'grand 25 cm ou 4 petits'),
    (v_recipe_id, 'graisse de bœuf',            2,   'c. à soupe', true,  3,  'tallow ou huile'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  4,  'moyen, tranché'),
    (v_recipe_id, 'poivron vert',               1,   'unité',      true,  5,  'gros, haché'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  6,  'tranché'),
    (v_recipe_id, 'cumin',                      0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'coriandre moulue',           1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'allspice',                   1,   'c. à café',  true,  9,  'piment de la Jamaïque'),
    (v_recipe_id, 'cardamome',                  1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'chipotle chili powder',      1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'paprika',                    2,   'c. à café',  true,  13, 'fumé'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  14, 'au goût'),
    (v_recipe_id, 'banana peppers',             60,  'ml',         false, 15, 'optionnel'),
    (v_recipe_id, 'sweet cherry peppers',       60,  'ml',         false, 16, NULL),
    (v_recipe_id, 'cheddar',                    340, 'g',          true,  17, 'sharp, en tranches');

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
    'Fusion moyen-oriental-mexicain : hauts de cuisse marinés yaourt-7 épices grillés, fumés au charbon, servis dans tortillas de maïs avec fromage fondu, garlic sauce, pickles et glaze piquante.',
    $instr$["Marinade : mélanger yaourt, jus de citron, pâte de piment, ail, épices shawarma (cumin, coriandre, allspice, paprika fumé, cardamome, clou, MSG), sel et huile.",
"Bien enrober les hauts de cuisse et mariner aussi longtemps que possible.",
"Préchauffer une plaque avec tallow, étaler le poulet en couche fine.",
"Passer au gril (broil) à pleine puissance 10-15 min en retournant à mi-cuisson jusqu'à bord caramélisés.",
"Transférer dans un bol tapissé d'aluminium. Placer un morceau de charbon naturel allumé au centre. Couvrir 5 min pour fumer.",
"Sur plaque huilée chaude, réchauffer les tortillas de maïs, retourner et garnir de fromage fondu, garlic sauce et pickles. Empiler le poulet fumé et plier serré.",
"Glaze : mijoter pâte de piment avec eau et huile jusqu'à brillant et épais. Badigeonner sur les tacos.",
"Servir chaud avec sour cream chipotle."]
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
    (v_recipe_id, 'hauts de cuisse de poulet',  907, 'g',          true,  1,  NULL),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  2,  NULL),
    (v_recipe_id, 'pâte de piment fort',        2,   'c. à soupe', true,  3,  'biber salçası ou harissa'),
    (v_recipe_id, 'yaourt nature',              60,  'g',          true,  4,  NULL),
    (v_recipe_id, 'jus de citron',              1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'graisse de bœuf',            2,   'c. à soupe', true,  7,  'tallow'),
    (v_recipe_id, 'cumin',                      0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',           1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'allspice',                   0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'paprika fumé',               1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'cardamome',                  1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'clou de girofle moulu',      0.25, 'c. à café', true,  13, NULL),
    (v_recipe_id, 'MSG',                        0.5, 'c. à café',  false, 14, 'optionnel'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'pâte de piment fort',        60,  'ml',         true,  16, 'pour le glaze'),
    (v_recipe_id, 'eau',                        2,   'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'huile neutre',               2,   'c. à soupe', true,  18, 'pour glaze'),
    (v_recipe_id, 'chipotle en adobo',          2,   'unité',      true,  19, 'pour sour cream'),
    (v_recipe_id, 'crème aigre',                360, 'g',          true,  20, '1.5 cups'),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  21, 'pour sour cream'),
    (v_recipe_id, 'chili powder',               1,   'c. à café',  true,  22, NULL),
    (v_recipe_id, 'miel',                       2,   'c. à soupe', true,  23, NULL),
    (v_recipe_id, 'tortillas de maïs',          14,  'unité',      true,  24, NULL),
    (v_recipe_id, 'fromage râpé',               150, 'g',          true,  25, '1-2 cups'),
    (v_recipe_id, 'sauce ail',                  60,  'ml',         true,  26, 'toum ou aïoli'),
    (v_recipe_id, 'cornichons',                 60,  'g',          true,  27, 'concombre');

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
    'Mac & cheese gourmet : sauce 3 fromages (cheddar blanc extra fort, gruyère, parmesan) avec oignons jaunes confits à la Worcestershire et bouquet d''herbes, gratiné au four.',
    $instr$["Trancher finement les oignons. Cuire au beurre à feu moyen-doux 30 min en remuant occasionnellement.",
"Ajouter ail, Worcestershire, bouillon et herbes (romarin, thym, persil). Continuer 30 min en déglaçant.",
"Réchauffer la crème entière, incorporer la moutarde de Dijon puis ajouter progressivement les fromages jusqu'à lisse.",
"Préchauffer le four à 175°C (350°F).",
"Mélanger les pâtes cuites avec la sauce dans un plat à gratin. Garnir de fromage et persil.",
"Enfourner 20 min. Passer brièvement au gril pour dorer le dessus.",
"Garnir d'oignons caramélisés réservés et servir."]
$instr$,
    15, 75, 8, 3,
    'Américaine', 'dinner',
    ARRAY['américain','mac and cheese','gruyère','cheddar','oignons caramélisés','gratin','comfort food'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/caramelizedonionmacncheese',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/69a71ee54835f3724488ef31/1772561915465/Screenshot+2026-03-02+at+12.33.06%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pâtes courtes',              680, 'g',          true,  1,  '24 oz'),
    (v_recipe_id, 'crème liquide entière',      800, 'ml',         true,  2,  '28 oz'),
    (v_recipe_id, 'cheddar blanc',              454, 'g',          true,  3,  'extra fort, râpé'),
    (v_recipe_id, 'gruyère',                    230, 'g',          true,  4,  'râpé'),
    (v_recipe_id, 'parmesan',                   60,  'g',          true,  5,  'râpé'),
    (v_recipe_id, 'moutarde de Dijon',          1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  7,  'au goût'),
    (v_recipe_id, 'oignon jaune',               3,   'unité',      true,  8,  'gros'),
    (v_recipe_id, 'beurre doux',                4,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'huile neutre',               2,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  11, 'émincé'),
    (v_recipe_id, 'sauce Worcestershire',       60,  'ml',         true,  12, NULL),
    (v_recipe_id, 'bouillon',                   120, 'ml',         true,  13, NULL),
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
    'Frites maison saines à l''air fryer surmontées de hauts de cuisse rôtis aux épices, drizzlées d''une buffalo ranch crémeuse au yaourt allégé et mayo light.',
    $instr$["Préchauffer le four à 190°C (375°F).",
"Assaisonner les hauts de cuisse avec ail, chili, paprika, origan, sel et poivre. Rôtir jusqu'à cuit à cœur et légèrement caramélisé.",
"Couper les pommes de terre en frites ou cubes. Vaporiser d'huile et assaisonner identiquement.",
"Air fryer à 190°C (375°F) pendant 20 min en retournant à mi-cuisson jusqu'à doré et croustillant.",
"Mélanger yaourt, mayo light et crème aigre dans un bol. Ajouter buffalo sauce, ail en poudre et persil. Détendre à l'eau si besoin.",
"Couper le poulet en cubes et arroser légèrement de buffalo sauce.",
"Dresser les frites, parsemer de mozzarella optionnelle, déposer le poulet et finir au buffalo ranch."]
$instr$,
    15, 30, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','buffalo','poulet','frites','air fryer','healthy','protein'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/buffalochickenfries',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/6977f7e49000fb64e6cf2e7a/1769471632504/Screenshot+2026-01-12+at+10.42.54%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  907, 'g',          true,  1,  NULL),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  2,  'pour le poulet'),
    (v_recipe_id, 'chili powder',               1,   'c. à café',  true,  3,  'pour le poulet'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  4,  'pour le poulet'),
    (v_recipe_id, 'origan séché',               0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'buffalo sauce',              60,  'ml',         true,  8,  'pour le poulet'),
    (v_recipe_id, 'pommes de terre russet',     3,   'unité',      true,  9,  'grosses'),
    (v_recipe_id, 'huile en spray',             1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  11, 'pour les frites'),
    (v_recipe_id, 'chili powder',               1,   'c. à café',  true,  12, 'pour les frites'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  13, 'pour les frites'),
    (v_recipe_id, 'origan séché',               0.5, 'c. à café',  true,  14, 'pour les frites'),
    (v_recipe_id, 'yaourt allégé',              240, 'g',          true,  15, NULL),
    (v_recipe_id, 'mayonnaise allégée',         120, 'ml',         true,  16, NULL),
    (v_recipe_id, 'crème aigre allégée',        120, 'g',          false, 17, NULL),
    (v_recipe_id, 'buffalo sauce',              60,  'ml',         true,  18, 'pour la ranch'),
    (v_recipe_id, 'persil séché',               1,   'c. à café',  true,  19, NULL);

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
    'Shawarma de poulet ultra croustillant : lanières marinées yaourt-épices et grillées au broiler, servies en pita avec toum, pickles et mélasse de grenade. Bord croustillant grâce à la pâte de tomate fumée.',
    $instr$["Couper les hauts de cuisse en fines lanières.",
"Marinade : pâte de piment, yaourt, jus de citron, huile et épices (cumin, coriandre, allspice, paprika fumé, cardamome, clou, MSG, gingembre, cayenne). Fouetter jusqu'à lisse.",
"Bien enrober le poulet et réfrigérer 2h minimum (idéalement une nuit).",
"Sauce rouge : chauffer huile et toaster pâte de tomate. Ajouter cayenne, ketchup et eau. Saler.",
"Préchauffer le broiler haut avec une plaque à l'intérieur 10-15 min.",
"Sortir la plaque, ajouter du tallow et étaler le poulet en couche mince.",
"Broil 10-15 min jusqu'à bords croustillants en surveillant.",
"Optionnel : fumer en cup d'aluminium avec charbon allumé pendant quelques minutes.",
"Étaler du toum dans le pita, ajouter le poulet, des pickles fins et la mélasse de grenade.",
"Plier serré, dorer côté ouverture vers le bas dans une poêle. Badigeonner de sauce rouge à l'extérieur. Servir chaud."]
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
    (v_recipe_id, 'hauts de cuisse de poulet',  907, 'g',          true,  1,  'en lanières fines'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  2,  NULL),
    (v_recipe_id, 'pâte de piment fort',        2,   'c. à soupe', true,  3,  'ou concentré de tomate'),
    (v_recipe_id, 'yaourt nature',              60,  'g',          true,  4,  NULL),
    (v_recipe_id, 'vinaigre blanc',             1,   'c. à soupe', true,  5,  'ou jus de citron'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'graisse de bœuf',            3,   'c. à soupe', true,  7,  'tallow'),
    (v_recipe_id, 'cumin',                      1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',           1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'allspice',                   0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'paprika fumé',               1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'cardamome',                  0.5, 'c. à café',  true,  12, NULL),
    (v_recipe_id, 'clou de girofle moulu',      0.5, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'MSG',                        0.5, 'c. à café',  false, 14, NULL),
    (v_recipe_id, 'gingembre moulu',            0.5, 'c. à café',  false, 15, NULL),
    (v_recipe_id, 'cayenne',                    1,   'c. à café',  false, 16, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'huile neutre',               60,  'ml',         true,  18, 'sauce rouge'),
    (v_recipe_id, 'concentré de tomate',        60,  'ml',         true,  19, 'sauce rouge'),
    (v_recipe_id, 'ketchup',                    2,   'c. à soupe', true,  20, NULL),
    (v_recipe_id, 'cayenne',                    1,   'c. à café',  true,  21, 'pour sauce rouge'),
    (v_recipe_id, 'eau',                        60,  'ml',         true,  22, NULL),
    (v_recipe_id, 'pain pita',                  5,   'unité',      true,  23, 'grand'),
    (v_recipe_id, 'toum',                       60,  'ml',         true,  24, 'pâte d''ail libanaise'),
    (v_recipe_id, 'cornichons',                 60,  'g',          true,  25, 'tranchés fin'),
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
    'French dip premium : ribeye grillé saignant, oignons caramélisés, swiss et muenster fondus sur ciabatta toasté, accompagné d''un jus de viande au Worcestershire et romarin pour le dip.',
    $instr$["Optionnel : saler légèrement les ribeyes et réfrigérer une nuit (dry brine).",
"Trancher les oignons et caraméliser doucement dans l'huile avec Worcestershire et sel.",
"Faire suer l'ail émincé et les échalotes hachées avec la pâte de bœuf, romarin et thym.",
"Ajouter eau et Worcestershire. Mijoter 15 min puis passer.",
"Griller les ribeyes assaisonnés à mi-saignant. Garnir de beurre composé au repos.",
"Toaster les ciabatta avec swiss d'un côté et muenster de l'autre à 215°C (415°F).",
"Trancher le steak reposé, le tremper dans le jus chaud et déposer sur le pain toasté avec les oignons caramélisés."]
$instr$,
    15, 45, 4, 3,
    'Américaine', 'dinner',
    ARRAY['américain','sandwich','french dip','ribeye','ciabatta','swiss','muenster'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/steakdipsandwich',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/696c2f79f43d007a0a11ea92/1768698526902/Screenshot+2026-01-12+at+10.22.40%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'ribeye',                     4,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'oignon jaune',               2,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'huile neutre',               5,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'sauce Worcestershire',       2,   'c. à soupe', true,  4,  'pour oignons'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  5,  'émincé'),
    (v_recipe_id, 'échalote',                   2,   'unité',      true,  6,  'finement hachées'),
    (v_recipe_id, 'pâte de bœuf',               2,   'c. à soupe', true,  7,  'ou cube de bouillon'),
    (v_recipe_id, 'romarin frais',              1,   'branche',    true,  8,  NULL),
    (v_recipe_id, 'thym frais',                 1,   'branche',    true,  9,  NULL),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'beurre composé',             4,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'ciabatta',                   2,   'unité',      true,  13, 'baguettes'),
    (v_recipe_id, 'swiss',                      6,   'tranche',    true,  14, NULL),
    (v_recipe_id, 'muenster',                   6,   'tranche',    true,  15, NULL),
    (v_recipe_id, 'sauce Worcestershire',       1,   'c. à soupe', true,  16, 'pour le jus');

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
    'Fusion mexicaine-libanaise : pita farci de bœuf haché à la pâte de chiles birria et fromage chihuahua, poêlé jusqu''à doré.',
    $instr$["Nettoyer les chiles birria : retirer queues et graines, faire tremper 10 min dans eau chaude.",
"Toaster l'oignon haché et l'ail dans l'huile jusqu'à doré et parfumé.",
"Mixer chiles réhydratés avec oignon-ail toastés, origan, paprika et cumin pour obtenir une pâte.",
"Assaisonner le bœuf haché de sel et incorporer la pâte birria.",
"Couper les pita en deux, ouvrir en poches et farcir de mélange viande + fromage.",
"Mélanger l'épice birria avec l'huile pour un glaze. Badigeonner les deux faces des arayes.",
"Poêler jusqu'à doré et croustillant, viande cuite à cœur. Servir immédiatement."]
$instr$,
    15, 10, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','libanais','fusion','birria','arayes','bœuf','pita','fromage'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/birriaarayes',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/690ac2a36e07e13b1da73c75/1768101925310/Screen+Shot+2025-11-04+at+10.20.47+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'chiles birria séchés',       3,   'unité',      true,  1,  'guajillo+ancho+arbol'),
    (v_recipe_id, 'huile d''olive',             60,  'ml',         true,  2,  NULL),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  3,  'haché grossièrement'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  4,  NULL),
    (v_recipe_id, 'origan séché',               0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'cumin',                      0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'bœuf haché 15%',             907, 'g',          true,  9,  '85/15'),
    (v_recipe_id, 'pain pita',                  4,   'unité',      true,  10, NULL),
    (v_recipe_id, 'chihuahua',                  150, 'g',          true,  11, 'fromage mexicain'),
    (v_recipe_id, 'épice birria',               1,   'c. à soupe', true,  12, 'rub pour glaze');

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
    'Côtelettes d''agneau marinées yaourt-hot honey-pâte de piment grillées au charbon, servies avec sauce yaourt-miel-citron et frites.',
    $instr$["Découper les racks d'agneau parés en côtelettes individuelles (1-2 os par côtelette).",
"Combiner yaourt, pâte de piment, ail, jus de citron, hot honey et huile d'olive dans un bol.",
"Assaisonner avec chipotle, paprika et ail en poudre. Fouetter jusqu'à lisse.",
"Saler directement les côtelettes puis les enrober de marinade. Couvrir et réfrigérer plusieurs heures (idéalement une nuit).",
"Préchauffer le grill très chaud et fumant.",
"Saisir les côtelettes jusqu'à se détacher naturellement, retourner et cuire jusqu'à carbonisé et cuit.",
"Sauce dipping : fouetter yaourt, miel et jus de citron.",
"Servir immédiatement avec frites et sauce."]
$instr$,
    10, 15, 8, 3,
    'Moyen-Orientale', 'dinner',
    ARRAY['moyen-oriental','agneau','grillade','yaourt','miel','hot honey','marinade'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/lambchops',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/68eeb46379e5081761ca2ddd/1760661190696/Screen+Shot+2025-10-14+at+4.34.15+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'racks d''agneau',            2,   'unité',      true,  1,  'parés'),
    (v_recipe_id, 'yaourt entier',              120, 'g',          true,  2,  'marinade'),
    (v_recipe_id, 'pâte de piment fort',        2,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'pâte d''ail',                1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'citron',                     0.5, 'unité',      true,  5,  'jus seulement'),
    (v_recipe_id, 'hot honey',                  1,   'c. à café',  true,  6,  'pour marinade'),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'chipotle chili powder',      1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'paprika',                    1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'yaourt entier',              240, 'g',          true,  12, 'sauce dipping'),
    (v_recipe_id, 'hot honey',                  2,   'c. à soupe', true,  13, 'pour sauce'),
    (v_recipe_id, 'citron',                     0.5, 'unité',      true,  14, 'pour sauce');

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
    'Copycat Dave''s Hot Chicken : tenders marinés buttermilk-hot sauce, double dredgés et frits, enrobés d''un spice rub chipotle-paprika fumé. Servis avec sauce Dave aigre-douce chipotle.',
    $instr$["Combiner buttermilk, hot sauce, moutarde, œuf et épices. Mariner le poulet 30 min minimum.",
"Mélanger farine, maïzena, paprika, chili et ail en poudre.",
"Double dredge : enrober dans le mix sec, retremper dans la marinade, puis re-enrober dans le sec.",
"Frire à 180°C (360°F) pendant 5-6 min jusqu'à doré.",
"Re-tremper rapidement dans l'huile chaude puis saupoudrer du spice rub (paprika fumé, chipotle, cassonade, ail, sazon).",
"Sauce Dave : mixer mayo, chipotle hot sauce, miel, vinaigre, paprika fumé, chili, ail et sel.",
"Servir les tenders chauds avec la sauce."]
$instr$,
    10, 10, 5, 3,
    'Américaine', 'dinner',
    ARRAY['américain','poulet','tenders','frit','hot chicken','dave''s','spicy','copycat'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/davesstylechickentenders',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/687961d5da22ff057baa9452/1753995467550/Screen+Shot+2025-07-17+at+4.45.03+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'aiguillettes de poulet',     907, 'g',          true,  1,  '10-14 morceaux'),
    (v_recipe_id, 'buttermilk',                 960, 'ml',         true,  2,  '4 cups'),
    (v_recipe_id, 'hot sauce',                  60,  'ml',         true,  3,  'pour marinade'),
    (v_recipe_id, 'moutarde',                   2,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  5,  'pour marinade'),
    (v_recipe_id, 'paprika',                    1,   'c. à soupe', true,  6,  'marinade'),
    (v_recipe_id, 'chili powder',               1,   'c. à soupe', true,  7,  'marinade'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  8,  'marinade'),
    (v_recipe_id, 'farine',                     500, 'g',          true,  9,  '4 cups, dredge'),
    (v_recipe_id, 'maïzena',                    180, 'g',          true,  10, '1.5 cup'),
    (v_recipe_id, 'paprika',                    1,   'c. à soupe', true,  11, 'dredge'),
    (v_recipe_id, 'chili powder',               1,   'c. à soupe', true,  12, 'dredge'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  13, 'dredge'),
    (v_recipe_id, 'paprika fumé',               2,   'c. à soupe', true,  14, 'spice rub'),
    (v_recipe_id, 'chipotle chili powder',      2,   'c. à soupe', true,  15, 'spice rub'),
    (v_recipe_id, 'cassonade',                  2,   'c. à soupe', true,  16, 'spice rub'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  17, 'spice rub'),
    (v_recipe_id, 'sazon',                      1,   'c. à soupe', true,  18, NULL),
    (v_recipe_id, 'mayonnaise',                 240, 'ml',         true,  19, 'sauce Dave'),
    (v_recipe_id, 'chipotle hot sauce',         2,   'c. à soupe', true,  20, NULL),
    (v_recipe_id, 'miel',                       2,   'c. à soupe', true,  21, 'pour sauce'),
    (v_recipe_id, 'vinaigre',                   1,   'c. à soupe', true,  22, 'pour sauce'),
    (v_recipe_id, 'huile neutre',               2,   'litre',      true,  23, 'friture');

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
    'Smash burger gourmet : double patty 80/20 nappé de triple pepper gouda, sauce mayo-relish-cayenne-chipotle, pickles et oignons confits sur pain brioché au sésame.',
    $instr$["Diviser le bœuf en 4 portions de 115g.",
"Sauce : mélanger relish de poivron sweet, mayo, cayenne, chipotle et sel. Réfrigérer.",
"Chauffer une poêle en fonte à feu moyen-vif avec un filet d'huile.",
"Poser les boulettes, couvrir de papier sulfurisé, smash très fin avec une presse ou une spatule.",
"Retirer le papier, cuire 2-3 min, retourner, déposer une tranche de pepper gouda et cuire 2-3 min.",
"Répéter pour les 4 portions.",
"Toaster légèrement les buns. Monter : sauce, pickles, 2 patties au fromage, oignons optionnels, sauce, bun supérieur.",
"Servir immédiatement."]
$instr$,
    15, 15, 2, 2,
    'Américaine', 'dinner',
    ARRAY['américain','smash burger','double','gouda','pepper','brioché','copycat'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-3jmj9-f4k3f',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/68070f0fc66627012126fd84/1745449787536/Screen+Shot+2025-04-23+at+4.06.20+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché 20%',             454, 'g',          true,  1,  '16 oz'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'triple pepper gouda',        4,   'tranche',    true,  5,  'ou pepper jack'),
    (v_recipe_id, 'relish sweet pepper',        2,   'c. à soupe', true,  6,  'sauce'),
    (v_recipe_id, 'mayonnaise',                 80,  'ml',         true,  7,  'sauce'),
    (v_recipe_id, 'cayenne',                    0.25, 'c. à café', true,  8,  'sauce'),
    (v_recipe_id, 'chipotle chili powder',      0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'sel casher',                 0.5, 'c. à café',  true,  10, 'sauce'),
    (v_recipe_id, 'pain brioché au sésame',     2,   'unité',      true,  11, 'buns'),
    (v_recipe_id, 'cornichons',                 30,  'g',          true,  12, 'tranchés'),
    (v_recipe_id, 'oignons caramélisés',        2,   'c. à soupe', false, 13, 'garniture');

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
    'Hibachi maison protéiné : crevettes, steak maigre et légumes (courgette, courge jaune, oignon) sautés au wok avec sauce soja et Thai BBQ, sauce yum yum allégée maison.',
    $instr$["Chauffer un wok ou poêle anti-adhésive à feu moyen-vif avec spray d'huile. Cuire courgette, courge jaune et oignon avec assaisonnement et sauce soja 4 min.",
"Retirer les légumes. Cuire les crevettes 1 min par face avec un peu de sauce soja.",
"Retirer les crevettes. Cuire le steak en couche unique avec assaisonnement environ 1 min par face. Ajouter la Thai BBQ et l'ail en dernière minute.",
"Cuire les nouilles selon l'emballage.",
"Sauce yum yum : fouetter ketchup, mayo allégée, vinaigre de riz, paprika, ail, sel, poivre et eau. Ajuster.",
"Dresser : nouilles, légumes, crevettes, steak. Arroser de yum yum."]
$instr$,
    15, 13, 4, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','hibachi','healthy','wok','crevettes','steak','yum yum','low calorie'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-tk6nh',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/68058295ef011a1921f78f0c/1745191962149/Screen+Shot+2025-04-20+at+4.27.54+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon jaune',               1,   'unité',      true,  1,  'en dés de 1 cm'),
    (v_recipe_id, 'courgette',                  1,   'unité',      true,  2,  'demi-lunes'),
    (v_recipe_id, 'courge jaune',               1,   'unité',      true,  3,  'demi-lunes'),
    (v_recipe_id, 'crevettes',                  230, 'g',          true,  4,  'grosses'),
    (v_recipe_id, 'steak maigre',               230, 'g',          true,  5,  'tenderloin, sirloin ou flank'),
    (v_recipe_id, 'huile en spray',             1,   'c. à soupe', true,  6,  'high heat'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'ail émincé',                 1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'sauce Thai BBQ',             1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'nouilles à sauter',          200, 'g',          true,  13, 'udon ou yakisoba'),
    (v_recipe_id, 'ketchup',                    60,  'ml',         true,  14, 'yum yum'),
    (v_recipe_id, 'mayonnaise allégée',         80,  'ml',         true,  15, NULL),
    (v_recipe_id, 'vinaigre de riz',            1,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'paprika',                    0.25, 'c. à café', true,  17, NULL),
    (v_recipe_id, 'ail en poudre',              0.25, 'c. à café', true,  18, 'yum yum');

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
    'Frites loaded version healthy : pommes de terre cuites au four, bœuf maigre épicé aux légumes (oignon, poivron, jalapeño), sauce fromage à base de cottage cheese et cheddar.',
    $instr$["Préchauffer le four à 200°C (400°F). Vaporiser la plaque d'huile et la chauffer.",
"Éplucher et couper les pommes de terre en cubes de 2.5 cm. Mélanger avec huile et sweet heat rub.",
"Étaler sur la plaque chaude et cuire 25-30 min en retournant à mi-cuisson jusqu'à doré.",
"Brunir le bœuf haché dans une poêle puis ajouter oignon, poivron et jalapeño. Cuire 5 min jusqu'à amollissement.",
"Incorporer le taco seasoning et le bouillon. Cuire 2-3 min jusqu'à saucy.",
"Sauce fromage : mixer cottage cheese, cheddar, bouillon, nacho seasoning et sazon jusqu'à lisse. Réchauffer doucement.",
"Dresser : pommes de terre, bœuf, drizzle de sauce et toppings au choix (pico, jalapeños)."]
$instr$,
    15, 30, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','frites','healthy','bœuf','cottage cheese','loaded','tex-mex','protein'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-blzks',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/67f5412d77183879eb39b491/1744131969953/Screen+Shot+2025-04-08+at+10.02.49+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pommes de terre russet',     5,   'unité',      true,  1,  'grosses'),
    (v_recipe_id, 'huile en spray',             1,   'c. à soupe', true,  2,  'avocado'),
    (v_recipe_id, 'sweet heat rub',             1,   'c. à soupe', true,  3,  'ou mélange d''épices'),
    (v_recipe_id, 'bœuf haché 5%',              454, 'g',          true,  4,  'maigre'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  5,  'petit, finement émincé'),
    (v_recipe_id, 'poivron rouge',              1,   'unité',      true,  6,  'finement émincé'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  7,  'finement émincé'),
    (v_recipe_id, 'taco seasoning',             3.5, 'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'bouillon de légumes',        120, 'ml',         true,  9,  'ou eau'),
    (v_recipe_id, 'cottage cheese allégé',      240, 'g',          true,  10, 'low fat'),
    (v_recipe_id, 'cheddar',                    30,  'g',          true,  11, 'fort, râpé'),
    (v_recipe_id, 'nacho cheese seasoning',     1,   'c. à soupe', false, 12, 'optionnel'),
    (v_recipe_id, 'sazon',                      1,   'c. à soupe', true,  13, NULL);

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
    'Plat de fonte mexicain : steak en cubes, beef bacon, légumes (oignon, poivron, jalapeño, tomate) recouverts de fromage Oaxaca fondu. Servi avec tortillas et chips.',
    $instr$["Cuire le beef bacon dans une fonte 4-5 min à feu moyen-vif jusqu'à fonte du gras. Pousser sur le côté.",
"Ajouter les légumes (oignon, jalapeño, poivron), cuire 2-3 min, pousser sur les bords et ajouter le steak en cubes.",
"Cuire le steak sans remuer 2-3 min jusqu'à brunir. Ajouter les épices et mélanger.",
"Continuer 3-4 min. Incorporer ail et tomates, couvrir et cuire 5 min.",
"Vérifier la cuisson, ajouter un peu d'eau si besoin pour l'aspect saucy.",
"Ajouter le fromage, couvrir 1 min jusqu'à fonte.",
"Servir avec tortillas chaudes et chips."]
$instr$,
    10, 20, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','alambre','bœuf','bacon','fonte','oaxaca','tex-mex'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-b59hf-d8rz8-s733w-2xkm9-rhtxm-6phwx-kk28s-mm7d3-ycax2-f45ej-rcece-t7pmr-58agw-fmsrj-9dmgb-7de68',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/67e0ba41cf84c27786d49f00/1742826132454/Screen+Shot+2025-03-24+at+10.18.55+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'beef bacon',                 454, 'g',          true,  1,  NULL),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  2,  'finement émincé'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  3,  'finement émincé'),
    (v_recipe_id, 'poivron rouge',              1,   'unité',      true,  4,  'finement émincé'),
    (v_recipe_id, 'steak',                      454, 'g',          true,  5,  'en cubes'),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'chili powder',               0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'origan séché',               0.25, 'c. à café', true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',           0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'cumin',                      0.25, 'c. à café', true,  10, NULL),
    (v_recipe_id, 'sel casher',                 0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  12, 'émincé'),
    (v_recipe_id, 'tomates',                    2,   'unité',      true,  13, 'en dés'),
    (v_recipe_id, 'fromage Oaxaca',             230, 'g',          true,  14, 'ou Chihuahua, râpé'),
    (v_recipe_id, 'tortillas',                  8,   'unité',      true,  15, 'à servir'),
    (v_recipe_id, 'chips de maïs',              100, 'g',          false, 16, 'à servir');

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
    'Bol healthy : lanières de hauts de cuisse marinés chipotle-miel-sazon, riz basmati jaune au curcuma et sazon, garnis de tomates, laitue et sauce crémeuse chipotle.',
    $instr$["Couper le poulet en lanières de 1.5 cm. Mélanger avec sauce chipotle, miel, jus de citron vert, pâte d'ail, sazon, paprika et origan. Réfrigérer 30 min à 4h.",
"Riz : faire fondre le ghee, toaster le basmati avec sazon, bouillon et curcuma 1 min.",
"Ajouter 2 cups d'eau et mijoter couvert jusqu'à tendre.",
"Sauce : mixer crème aigre, mayo, ail, chipotle, miel, citron vert, sel, poivre, paprika et origan jusqu'à lisse. Verser en squeeze bottle.",
"Chauffer ghee dans une poêle, cuire le poulet sans bouger 2 min, puis retourner et mélanger jusqu'à doré. Ajouter l'oignon dans les 4-5 dernières minutes.",
"Dresser : riz, poulet, tomates et laitue. Drizzle de sauce chipotle."]
$instr$,
    15, 15, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','poulet','chipotle','riz','bol','protéine','healthy'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-b59hf-d8rz8-s733w-2xkm9-rhtxm-6phwx-kk28s-mm7d3-ycax2-f45ej-rcece-t7pmr-dfc3w',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/67ce501bdef37442649d3efb/1741614017945/Screen+Shot+2025-03-10+at+9.39.41+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  680, 'g',          true,  1,  'désossés, en lanières'),
    (v_recipe_id, 'sauce chipotle',             2,   'c. à soupe', true,  2,  'marinade'),
    (v_recipe_id, 'miel',                       1,   'c. à café',  true,  3,  'marinade'),
    (v_recipe_id, 'citron vert',                1,   'c. à café',  true,  4,  'jus, marinade'),
    (v_recipe_id, 'pâte d''ail',                1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'sazon',                      1,   'c. à café',  true,  6,  'marinade'),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  7,  'marinade'),
    (v_recipe_id, 'origan séché',               0.5, 'c. à café',  true,  8,  'marinade'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  9,  'finement émincé'),
    (v_recipe_id, 'ghee',                       1,   'c. à soupe', true,  10, 'pour le riz'),
    (v_recipe_id, 'sazon',                      0.5, 'c. à café',  true,  11, 'pour le riz'),
    (v_recipe_id, 'bouillon de poulet en poudre', 0.5, 'c. à café', true, 12, NULL),
    (v_recipe_id, 'curcuma',                    0.25, 'c. à café', true,  13, NULL),
    (v_recipe_id, 'riz basmati',                300, 'g',          true,  14, '1.5 cup'),
    (v_recipe_id, 'crème aigre',                240, 'g',          true,  15, 'sauce'),
    (v_recipe_id, 'mayonnaise',                 120, 'ml',         true,  16, 'sauce'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  17, 'pour sauce'),
    (v_recipe_id, 'sauce chipotle',             1,   'c. à soupe', true,  18, 'pour sauce'),
    (v_recipe_id, 'miel',                       1,   'c. à café',  true,  19, 'pour sauce'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  20, 'jus, pour sauce'),
    (v_recipe_id, 'tomate',                     1,   'unité',      false, 21, 'en dés'),
    (v_recipe_id, 'laitue',                     2,   'feuille',    false, 22, 'effilochée');

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
    'Tenders croustillants au buttermilk-pickle juice, finis d''une sauce beurre-ail-piment et de parmesan frais râpé. Inspiré Wingstop.',
    $instr$["Marinade : combiner buttermilk, jus de pickle, hot sauce, oignon, ail, chili, cayenne et sazon. Mariner 4h minimum (idéalement une nuit).",
"Panure sèche : mélanger farine, maïzena, levure, oignon, ail, chili, cayenne et sazon.",
"Préchauffer l'huile de friture à 175°C (350°F).",
"Sauce : fondre le beurre à feu moyen, ajouter ail émincé, flocons de piment et thym. Mijoter 1 min puis incorporer kewpie mayo jusqu'à lisse.",
"Sortir les tenders de la marinade en laissant l'excès s'égoutter. Enrober dans la panure sèche.",
"Frire 5-6 min par fournée jusqu'à doré. Transférer sur grille. Re-frire 1 min pour extra croustillant.",
"Badigeonner de sauce ail-parmesan. Saupoudrer généreusement de parmesan râpé frais. Servir immédiatement."]
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
    (v_recipe_id, 'buttermilk',                 720, 'ml',         true,  2,  '3 cups'),
    (v_recipe_id, 'jus de cornichon',           60,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'hot sauce',                  3,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'oignon en poudre',           1,   'c. à café',  true,  5,  'marinade'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  6,  'marinade'),
    (v_recipe_id, 'chili powder',               1,   'c. à café',  true,  7,  'marinade'),
    (v_recipe_id, 'cayenne',                    0.5, 'c. à café',  true,  8,  'marinade'),
    (v_recipe_id, 'sazon',                      1,   'c. à soupe', true,  9,  'marinade'),
    (v_recipe_id, 'farine',                     250, 'g',          true,  10, '2 cups'),
    (v_recipe_id, 'maïzena',                    60,  'g',          true,  11, NULL),
    (v_recipe_id, 'levure chimique',            1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'oignon en poudre',           1,   'c. à café',  true,  13, 'panure'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  14, 'panure'),
    (v_recipe_id, 'chili powder',               1,   'c. à café',  true,  15, 'panure'),
    (v_recipe_id, 'cayenne',                    0.5, 'c. à café',  true,  16, 'panure'),
    (v_recipe_id, 'sazon',                      1,   'c. à soupe', true,  17, 'panure'),
    (v_recipe_id, 'beurre doux',                4,   'c. à soupe', true,  18, 'sauce'),
    (v_recipe_id, 'ail émincé',                 2,   'c. à soupe', true,  19, 'sauce'),
    (v_recipe_id, 'flocons de piment',          0.5, 'c. à café',  true,  20, NULL),
    (v_recipe_id, 'thym séché',                 0.25, 'c. à café', true,  21, NULL),
    (v_recipe_id, 'kewpie mayonnaise',          60,  'ml',         true,  22, NULL),
    (v_recipe_id, 'parmesan râpé',              60,  'g',          true,  23, 'frais'),
    (v_recipe_id, 'huile neutre',               2,   'litre',      true,  24, 'friture');

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
    'Bol équilibré : blancs de poulet marinés tandoori (yaourt grec, ginger-garlic paste, Kashmiri, tandoori masala) rôtis, sur riz basmati au cumin et coriandre, sauce yaourt verte à la coriandre/menthe/jalapeño.',
    $instr$["Préchauffer le four à 190°C (375°F).",
"Marinade : combiner ginger garlic paste, yaourt grec, Kashmiri, tandoori masala, huile d'olive et jus de citron. Enrober le poulet et mariner 2h+ (idéal nuit).",
"Étaler sur une grille placée sur plaque, cuire 20 min jusqu'à 75°C interne et doré. Trancher finement.",
"Sauce verte : mixer coriandre, menthe, jalapeño, jus de citron vert, yaourt et bouillon. Détendre à l'eau, mettre en squeeze bottle. Réfrigérer.",
"Riz : fondre ghee à feu moyen, toaster cumin et graines de coriandre 30 sec. Ajouter riz, bouillon et eau. Bouillir puis baisser, couvrir et cuire 12-15 min.",
"Sauter oignon rouge et poivron rouge à l'huile d'olive 10 min jusqu'à amollissement et léger charré.",
"Dresser : riz, poulet, légumes sautés, laitue. Drizzle généreux de sauce verte."]
$instr$,
    20, 25, 4, 3,
    'Indienne', 'dinner',
    ARRAY['indien','poulet','tandoori','riz','bol','yaourt','herb sauce','healthy'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-gwg5s-92r27-d7b43-rhklg-pwbdf',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/673357fc95afdb08a3b39d33/1732027642246/Screen+Shot+2024-11-19+at+6.45.12+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blancs de poulet',           907, 'g',          true,  1,  'en cubes de 1 cm'),
    (v_recipe_id, 'pâte gingembre-ail',         1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'yaourt grec',                60,  'g',          true,  3,  'marinade'),
    (v_recipe_id, 'Kashmiri chili powder',      2,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'tandoori masala',            2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'citron',                     1,   'unité',      true,  6,  'jus'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  7,  'marinade'),
    (v_recipe_id, 'ghee',                       1,   'c. à soupe', true,  8,  'pour le riz'),
    (v_recipe_id, 'graines de cumin',           1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'graines de coriandre',       0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'riz basmati',                300, 'g',          true,  11, '1.5 cup'),
    (v_recipe_id, 'cube de bouillon de poulet', 1,   'unité',      true,  12, NULL),
    (v_recipe_id, 'feuille de laurier',         1,   'unité',      true,  13, NULL),
    (v_recipe_id, 'eau',                        420, 'ml',         true,  14, '1.75 cup'),
    (v_recipe_id, 'coriandre fraîche',          0.5, 'unité',      true,  15, 'demi-botte, sauce'),
    (v_recipe_id, 'menthe fraîche',             10,  'g',          true,  16, '1/4 cup'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  17, 'épépiné'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  18, 'jus'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  19, 'pour sauce'),
    (v_recipe_id, 'yaourt nature',              120, 'g',          true,  20, 'pour sauce'),
    (v_recipe_id, 'oignon rouge',               1,   'unité',      true,  21, 'finement émincé'),
    (v_recipe_id, 'poivron rouge',              1,   'unité',      true,  22, 'finement émincé'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  23, 'légumes'),
    (v_recipe_id, 'laitue',                     2,   'feuille',    false, 24, 'effilochée');

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
    'Bol signature Golden Balance : saumon en cubes épicé (chipotle, paprika fumé, cayenne) sur riz court grain au beurre et concentré de tomate, surmonté d''un mix édamame-poivron-jalapeño et sriracha mayo.',
    $instr$["Mélanger les épices : chipotle, origan, paprika fumé, cayenne, oignon, ail, poivre, sel. Diviser en deux.",
"Préchauffer le four à 200°C (400°F) avec plaque à l'intérieur.",
"Enrober les cubes de saumon de la moitié du mélange et 2 c. à soupe d'huile.",
"Toaster le beurre et le concentré de tomate. Ajouter le reste du mélange d'épices et le sazon. Verser le riz et l'eau. Mijoter couvert 9-12 min.",
"Cuire le saumon sur plaque chaude 8-10 min jusqu'à juste cuit.",
"Mélanger poivron, jalapeño, édamame, coriandre et jus de citron vert.",
"Servir : riz, saumon, salade, sriracha mayo."]
$instr$,
    20, 15, 4, 3,
    'Méditerranéenne', 'dinner',
    ARRAY['saumon','riz','bol','protéine','méditerranéen','épicé','signature'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-lmcx7-849r5',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/6703ecaaf29e201c8b8b8462/1728390363712/Screen+Shot+2024-10-08+at+7.18.38+AM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filet de saumon',            680, 'g',          true,  1,  'sans peau, en cubes'),
    (v_recipe_id, 'huile neutre',               2,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'chipotle chili powder',      0.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'origan séché',               0.25, 'c. à café', true,  4,  NULL),
    (v_recipe_id, 'paprika fumé',               0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'cayenne',                    0.25, 'c. à café', true,  6,  NULL),
    (v_recipe_id, 'oignon en poudre',           0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'poivre noir',                0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'beurre doux',                2,   'c. à soupe', true,  11, 'pour le riz'),
    (v_recipe_id, 'concentré de tomate',        1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'sazon',                      1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'riz court grain',            200, 'g',          true,  14, '1 cup'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  15, 'ou bouillon'),
    (v_recipe_id, 'édamame',                    150, 'g',          true,  16, 'cuit'),
    (v_recipe_id, 'poivron rouge',              1,   'unité',      true,  17, 'en dés'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  18, 'en dés'),
    (v_recipe_id, 'coriandre fraîche',          15,  'g',          true,  19, 'haché'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  20, 'jus'),
    (v_recipe_id, 'sriracha mayonnaise',        60,  'ml',         true,  21, 'allégée');

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
    'Sandwich brioché Korean-style : haut de cuisse pané pétillant (eau gazeuse), glacé sweet chili-sriracha-soja, fondu provolone, kimchi slaw à la mayo et pickles.',
    $instr$["Assaisonner les hauts de cuisse avec sel, farine et chili sur les deux faces.",
"Mélanger panure : farine, fécule de pomme de terre, paprika, ail, oignon, cayenne, sel, poivre. Transférer 1/3 dans un autre bol et fouetter avec œuf et club soda jusqu'à lisse.",
"Préchauffer la friteuse à 165°C (325°F).",
"Slaw : mélanger mayo, kimchi finement haché et huile de sésame. Tossing la moitié avec le chou. Réserver le reste.",
"Glaze : chauffer sweet chili, soja, sriracha et huile de sésame jusqu'à frémir.",
"Tremper les hauts de cuisse dans la pâte humide puis dans le mélange sec en tapotant uniformément.",
"Frire 6-8 min jusqu'à 75°C interne et extérieur doré. Augmenter à 190°C et frire 1 min de plus.",
"Tremper dans le glaze, déposer une tranche de provolone et passer au broil 2-3 min.",
"Montage : slaw sur bun toasté, poulet glacé, sauce slaw extra, pickles, bun supérieur. Servir immédiatement."]
$instr$,
    15, 10, 4, 3,
    'Coréenne', 'dinner',
    ARRAY['coréen','poulet','frit','sandwich','brioché','kimchi','sweet chili','provolone'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-6w7jj-2b72b-48m2n-g2s5f-hpt5l-ljmjc-mf28a-g6mk5-m7zf7',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/66e5f547c3adc870f1a82e26/1726346768810/Screen+Shot+2024-09-14+at+1.32.18+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  4,   'unité',      true,  1,  'désossés sans peau'),
    (v_recipe_id, 'sel casher',                 1,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'farine',                     1,   'c. à café',  true,  3,  'pour assaisonner'),
    (v_recipe_id, 'chili powder',               1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'farine',                     250, 'g',          true,  5,  '2 cups, panure'),
    (v_recipe_id, 'fécule de pomme de terre',   90,  'g',          true,  6,  'ou maïzena'),
    (v_recipe_id, 'paprika',                    1,   'c. à soupe', true,  7,  'panure'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  8,  'panure'),
    (v_recipe_id, 'oignon en poudre',           1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'cayenne',                    1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  11, 'panure'),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  12, NULL),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  13, NULL),
    (v_recipe_id, 'club soda',                  240, 'ml',         true,  14, '8 oz'),
    (v_recipe_id, 'huile de sésame',            1,   'c. à café',  true,  15, 'slaw'),
    (v_recipe_id, 'mayonnaise',                 120, 'ml',         true,  16, 'slaw'),
    (v_recipe_id, 'kimchi',                     120, 'g',          true,  17, 'finement haché'),
    (v_recipe_id, 'chou râpé',                  200, 'g',          true,  18, 'ou slaw mix'),
    (v_recipe_id, 'sauce sweet chili',          120, 'ml',         true,  19, 'glaze'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  20, 'glaze'),
    (v_recipe_id, 'sriracha',                   60,  'ml',         true,  21, NULL),
    (v_recipe_id, 'huile de sésame',            0.5, 'c. à café',  true,  22, 'glaze'),
    (v_recipe_id, 'pain brioché',               4,   'unité',      true,  23, 'buns'),
    (v_recipe_id, 'provolone',                  4,   'tranche',    true,  24, NULL),
    (v_recipe_id, 'cornichons',                 30,  'g',          true,  25, 'tranchés');

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
    'Riz frit coréen au kimchi avec beef bacon croustillant, sauce gochujang-gochugaru-sésame, nori et œuf au plat. Optionnel mozzarella fondue.',
    $instr$["Chauffer une grande poêle à feu moyen-vif. Cuire les dés de beef bacon jusqu'à croustillants. Réserver en laissant le gras dans la poêle.",
"Fouetter ensemble sauce : huile de sésame, gochugaru, gochujang, sucre et MSG.",
"Ajouter l'ail et le kimchi dans la poêle, cuire 1 min. Ajouter le riz et presser en couche uniforme. Cuire sans bouger 3-4 min.",
"Mélanger, verser la sauce et cuire 2-3 min de plus.",
"Couper le feu et ajuster l'assaisonnement. Ajouter le fromage optionnel et laisser fondre.",
"Incorporer les feuilles de nori. Servir avec un œuf au plat."]
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
    (v_recipe_id, 'ail émincé',                 1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'riz blanc cuit',             400, 'g',          true,  4,  'de la veille'),
    (v_recipe_id, 'huile de sésame',            0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'gochugaru',                  0.5, 'c. à café',  true,  6,  'flocons coréens'),
    (v_recipe_id, 'gochujang',                  0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sucre',                      0.25, 'c. à café', true,  8,  NULL),
    (v_recipe_id, 'MSG',                        0.25, 'c. à café', false, 9,  'optionnel'),
    (v_recipe_id, 'feuilles de nori',           4,   'unité',      true,  10, 'concassées'),
    (v_recipe_id, 'œuf',                        4,   'unité',      true,  11, 'au plat, sunny-side up'),
    (v_recipe_id, 'mozzarella',                 60,  'g',          false, 12, 'optionnel');

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
    'Variante street food NYC : riz basmati rouge épicé à la pâte de piment, lanières de cuisses de poulet sazon-paprika-citron, sauce blanche maison mayo-sour cream-citron, laitue et tomates.',
    $instr$["Cuire le riz épicé : chauffer ghee avec pâte de piment et épices. Ajouter le riz trempé et 720 ml d'eau. Mijoter 20 min jusqu'à évaporation.",
"Mélanger le poulet en lanières avec paprika, origan, ail, sazon, jus de citron et huile d'olive. Mariner 15-30 min (jusqu'à 12h).",
"Sauce blanche : fouetter sour cream, mayo, vinaigre blanc, persil séché, sel et jus de citron. Réfrigérer en squeeze bottle.",
"Cuire le poulet en grande poêle à feu moyen-vif 6-8 min sans bouger, puis effeuiller 3-4 min de plus.",
"Dresser : riz, poulet, laitue, tomates, sauce blanche."]
$instr$,
    15, 15, 4, 3,
    'Moyen-Orientale', 'dinner',
    ARRAY['moyen-oriental','halal','poulet','riz','street food','new york','sauce blanche'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/recipe-title-mb3aa-zafs5',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/666a07aa1fce0f371fc3e56d/1718225707650/Screen+Shot+2024-06-12+at+1.48.10+PM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz basmati',                300, 'g',          true,  1,  'rincé et trempé 1h'),
    (v_recipe_id, 'ghee',                       1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'pâte de piment fort',        1,   'c. à soupe', true,  3,  'biber salçası'),
    (v_recipe_id, 'paprika',                    0.25, 'c. à café', true,  4,  'pour le riz'),
    (v_recipe_id, 'cumin',                      0.25, 'c. à café', true,  5,  'pour le riz'),
    (v_recipe_id, 'bouillon de poulet en poudre', 1,  'c. à café', true,  6,  NULL),
    (v_recipe_id, 'hauts de cuisse de poulet',  454, 'g',          true,  7,  'en lanières'),
    (v_recipe_id, 'paprika',                    0.5, 'c. à café',  true,  8,  'poulet'),
    (v_recipe_id, 'origan séché',               0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sazon',                      0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'jus de citron',              1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'crème aigre',                80,  'g',          true,  14, 'sauce blanche'),
    (v_recipe_id, 'mayonnaise',                 60,  'ml',         true,  15, 'sauce blanche'),
    (v_recipe_id, 'vinaigre blanc',             1,   'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'persil séché',               1,   'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'sel',                        1,   'c. à soupe', true,  18, 'seasoning salt'),
    (v_recipe_id, 'citron',                     1,   'unité',      true,  19, 'jus pour sauce'),
    (v_recipe_id, 'laitue',                     2,   'feuille',    true,  20, 'effilochée'),
    (v_recipe_id, 'tomate',                     1,   'unité',      true,  21, 'en dés');

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
    'Plat mexicain home-style : bœuf haché mijoté avec pommes de terre dans une sauce mixée maison (oignon, tomate, ail, jalapeño, coriandre, bouillon), gratiné au fromage et servi avec tortillas.',
    $instr$["Mixer oignon, ail, tomate, jalapeño, coriandre, bouillon en poudre et 60 ml d'eau jusqu'à liquide.",
"Mélanger les assaisonnements secs.",
"Brunir le bœuf haché dans une grande poêle à feu moyen-vif. Ajouter les épices et cuire 1-2 min.",
"Ajouter les pommes de terre en cubes, mélanger, puis verser le mix liquide.",
"Mijoter 20-30 min jusqu'à pommes de terre tendres et réduction.",
"Garnir de fromage, couvrir 3-4 min jusqu'à fonte.",
"Servir avec tortillas."]
$instr$,
    10, 30, 4, 2,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','picadillo','bœuf','pommes de terre','one pot','tortillas','home-style'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/picadillo',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/6552b541796fc95ab447c25a/1701286333994/picadillo.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 454, 'g',          true,  1,  NULL),
    (v_recipe_id, 'oignon blanc',               0.5, 'unité',      true,  2,  'haché grossièrement'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  3,  NULL),
    (v_recipe_id, 'tomate',                     1,   'unité',      true,  4,  'grande, hachée'),
    (v_recipe_id, 'jalapeño',                   1,   'unité',      true,  5,  'haché grossièrement'),
    (v_recipe_id, 'coriandre fraîche',          0.5, 'unité',      true,  6,  'demi-botte'),
    (v_recipe_id, 'bouillon de poulet en poudre', 1, 'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'pommes de terre',            300, 'g',          true,  8,  'pelées en dés 2.5 cm'),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'oignon en poudre',           0.25, 'c. à café', true,  11, NULL),
    (v_recipe_id, 'paprika',                    0.25, 'c. à café', true,  12, NULL),
    (v_recipe_id, 'poivre noir',                0.25, 'c. à café', true,  13, NULL),
    (v_recipe_id, 'fromage râpé',               120, 'g',          true,  14, NULL),
    (v_recipe_id, 'tortillas',                  8,   'unité',      true,  15, 'pour servir');

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
    'Bowl style Chipotle copycat : bœuf à mijoter en cubes braisé à la sauce guajillo, riz cilantro-lime, haricots noirs et queso 3 fromages (American, Mexican blend, chipotle).',
    $instr$["Mixer les poivrons guajillo trempés avec 120 ml de leur eau de trempage jusqu'à lisse.",
"Saisir le bœuf dans l'huile chaude. Ajouter la purée de chiles, l'oignon, l'eau et les épices. Mijoter couvert 1h30 à 2h jusqu'à tendre.",
"Queso : chauffer le lait, faire fondre les fromages American et Mexican avec les chiles verts. Incorporer la sauce chipotle.",
"Riz cilantro-lime : mélanger riz cuit avec jus de citron vert, coriandre et sel.",
"Dresser en bowl : riz, haricots noirs, bœuf, sauce queso."]
$instr$,
    30, 120, 4, 3,
    'Mexicaine', 'dinner',
    ARRAY['mexicain','burrito bowl','bœuf','guajillo','riz','queso','chipotle copycat'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/beef-burrito-bowls',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/652ea38cd6c4e1255b95d3b7/1698079348932/burritobowl.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poivrons guajillo séchés',   4,   'unité',      true,  1,  'trempés'),
    (v_recipe_id, 'bœuf chuck',                 454, 'g',          true,  2,  'en cubes'),
    (v_recipe_id, 'oignon rouge',               1,   'unité',      true,  3,  'en cubes'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  4,  'ou bouillon'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'poivre noir',                0.25, 'c. à café', true,  6,  NULL),
    (v_recipe_id, 'origan séché',               0.25, 'c. à café', true,  7,  NULL),
    (v_recipe_id, 'cumin',                      0.25, 'c. à café', true,  8,  NULL),
    (v_recipe_id, 'allspice',                   0.125, 'c. à café',true,  9,  NULL),
    (v_recipe_id, 'lait entier',                240, 'ml',         true,  10, 'queso'),
    (v_recipe_id, 'American cheese',            3,   'tranche',    true,  11, NULL),
    (v_recipe_id, 'chiles verts hachés',        110, 'g',          true,  12, 'petite boîte'),
    (v_recipe_id, 'Mexican cheese blend',       60,  'g',          true,  13, 'râpé'),
    (v_recipe_id, 'sauce chipotle',             1,   'c. à soupe', true,  14, 'queso'),
    (v_recipe_id, 'riz blanc cuit',             400, 'g',          true,  15, NULL),
    (v_recipe_id, 'citron vert',                0.5, 'unité',      true,  16, 'jus'),
    (v_recipe_id, 'coriandre fraîche',          15,  'g',          true,  17, 'hachée'),
    (v_recipe_id, 'haricots noirs',             400, 'g',          true,  18, '1 boîte égouttée');

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
    'Appetizer sophistiqué : cubes de riz à sushi vinaigré-kombu frits jusqu''à doré croustillant, surmontés de tartare de saumon sushi-grade mayo kewpie-sriracha-furikake.',
    $instr$["Riz : rincer abondamment, cuire avec eau et kombu en mode riz blanc.",
"Saumon : couper en dés très fins, mélanger avec kewpie mayo, sriracha, sauce soja, huile de sésame et furikake. Couvrir et réfrigérer.",
"Chauffer vinaigre, sucre et sel jusqu'à dissolution complète. Refroidir.",
"Plier doucement le mélange vinaigré dans le riz cuit.",
"Tapisser un moule de film plastique, tasser le riz, compresser avec un poids 2h au frigo.",
"Démouler, couper en 10 cubes au couteau humide.",
"Frire à 190°C (375°F) en fournées jusqu'à doré croustillant.",
"Garnir chaque cube de tartare de saumon. Servir immédiatement."]
$instr$,
    140, 20, 5, 4,
    'Japonaise', 'dinner',
    ARRAY['japonais','sushi','saumon','riz crispy','appetizer','furikake','sophisticated'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/spicy-salmon-crispy-rice',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/64da9fc5f326887ddac6e881/1694126668656/Spicy+Salmon+Crispy+Rice.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz court grain',            400, 'g',          true,  1,  'sushi ou california calrose'),
    (v_recipe_id, 'eau',                        420, 'ml',         true,  2,  '1.75 cup'),
    (v_recipe_id, 'kombu',                      1,   'unité',      true,  3,  'morceau 7.5 cm'),
    (v_recipe_id, 'saumon sushi-grade',         454, 'g',          true,  4,  NULL),
    (v_recipe_id, 'kewpie mayonnaise',          1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'sriracha',                   1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'sauce soja',                 0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'huile de sésame',            0.25, 'c. à café', true,  8,  NULL),
    (v_recipe_id, 'furikake',                   1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'vinaigre de riz',            60,  'ml',         true,  10, NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à soupe', true,  11, 'pour riz'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  12, 'pour riz'),
    (v_recipe_id, 'huile neutre',               2,   'litre',      true,  13, 'pour friture');

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
    'Ragoût pakistanais traditionnel : jarrets d''agneau braisés en pression aux 15+ épices (cardamome, clous, cannelle, fenouil, caraway, macis), épaissi à la farine de blé toastée. Servi avec naan à l''ail.',
    $instr$["Chauffer l'huile dans une cocotte minute et faire dorer les oignons tranchés jusqu'à parfumés. Réserver.",
"Mélange d'épices : moudre cardamome, clous, poivre, cannelle, laurier, fenouil, coriandre, caraway.",
"Saisir les jarrets d'agneau dans la cocotte. Ajouter le mélange d'épices, pâte ail-gingembre, piment vert, Kashmiri, curcuma et sel.",
"Pression haute 1h15.",
"Pendant ce temps : pour le naan, combiner farine, yaourt, sel, huile d'olive et levure activée pour former la pâte.",
"Façonner en boule, couvrir et laisser lever 30-60 min jusqu'au double.",
"Diviser en 8 boules, repos 15 min.",
"Rouler chaque boule en ovale et cuire sur surface chaude jusqu'à gonflé et charré. Badigeonner de beurre cilantro-ail chaud.",
"Toaster la farine de blé jusqu'à dorée. Mélanger avec eau pour former un slurry et incorporer au bouillon pour épaissir.",
"Servir : bowls avec jarret, coriandre, lamelles de gingembre et jus de citron vert."]
$instr$,
    20, 90, 5, 5,
    'Pakistanaise', 'dinner',
    ARRAY['pakistanais','agneau','jarret','ragoût','épicé','festif','nihari','naan','pressure cooker'],
    'manual',
    'https://www.thegoldenbalance.com/recipes/pakistaninihari',
    'https://static1.squarespace.com/static/631107cdd45c6f39f653234c/637d6182e4fedf6f22bb22b2/69c97dd48b5f845a4e569db1/1774816557016/Screenshot+2026-03-25+at+5.03.35%E2%80%AFPM.png?format=1500w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'jarrets d''agneau',          4,   'unité',      true,  1,  'gros'),
    (v_recipe_id, 'oignon rouge',               2,   'unité',      true,  2,  'gros'),
    (v_recipe_id, 'huile neutre',               80,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'ail',                        10,  'gousse',     true,  4,  NULL),
    (v_recipe_id, 'gingembre',                  5,   'cm',         true,  5,  'pelé'),
    (v_recipe_id, 'piment vert',                2,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'Kashmiri chili powder',      1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'curcuma',                    1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'cardamome verte',            11,  'unité',      true,  9,  '10-12'),
    (v_recipe_id, 'clous de girofle',           8,   'unité',      true,  10, NULL),
    (v_recipe_id, 'poivre noir grains',         1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'cannelle',                   1,   'unité',      true,  12, 'bâton'),
    (v_recipe_id, 'feuilles de laurier',        2,   'unité',      true,  13, NULL),
    (v_recipe_id, 'graines de fenouil',         2,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'graines de coriandre',       2,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'graines de caraway',         2,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'farine de blé',              125, 'g',          true,  17, 'toastée'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  18, 'pour slurry'),
    (v_recipe_id, 'levure boulangère sèche',    2,   'c. à café',  true,  19, 'pour naan'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  20, 'pour naan'),
    (v_recipe_id, 'farine',                     375, 'g',          true,  21, '3 cups pour naan'),
    (v_recipe_id, 'yaourt nature',              360, 'g',          true,  22, '1.5 cup'),
    (v_recipe_id, 'huile d''olive',             60,  'ml',         true,  23, 'pour naan'),
    (v_recipe_id, 'beurre doux',                4,   'c. à soupe', true,  24, 'finition naan'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  25, 'pour beurre'),
    (v_recipe_id, 'coriandre fraîche',          15,  'g',          true,  26, 'pour beurre'),
    (v_recipe_id, 'citron vert',                1,   'unité',      false, 27, 'pour service');

END $$;
