-- =====================================================================
-- Seed: 18 recipes (4 moribyan + 14 joemustgoon) - batch 2 (2026-05-19)
--
-- Sources :
--   Moribyan (WordPress blog)
--     1.  https://moribyan.com/marry-me-salmon/
--     2.  https://moribyan.com/sushi-bake/                    [renommee 'Sushi Bake (Moribyan)' - collision instagram]
--     3.  https://moribyan.com/nandos-peri-peri-chicken/
--     4.  https://moribyan.com/halal-cart-chicken-and-rice/
--
--   Joemustgoon (Shopify blog)
--     5.  https://joemustgoon.com/blogs/recipes/updated-2025-butter-chicken-mac-cheese
--     6.  https://joemustgoon.com/blogs/recipes/sdfs                   [SPAM Teriyaki Fried Rice]
--     7.  https://joemustgoon.com/blogs/recipes/bulgogi-grilled-cheese
--     8.  https://joemustgoon.com/blogs/recipes/tuscan-chicken-pasta
--     9.  https://joemustgoon.com/blogs/recipes/shrimp-pasta-recipe
--     10. https://joemustgoon.com/blogs/recipes/butter-chicken-pasta
--     11. https://joemustgoon.com/blogs/recipes/fried-butter-chicken-sandwich
--     12. https://joemustgoon.com/blogs/recipes/lamb-mutton-biriyani-recipe
--     13. https://joemustgoon.com/blogs/recipes/lasagna-recipe
--     14. https://joemustgoon.com/blogs/recipes/fried-chicken-recipe
--     15. https://joemustgoon.com/blogs/recipes/massaman-curry-recipe
--     16. https://joemustgoon.com/blogs/recipes/double-bacon-smash-cheeseburger-recipe
--     17. https://joemustgoon.com/blogs/recipes/chicken-tikka-masala-recipe
--     18. https://joemustgoon.com/blogs/recipes/creamy-steak-bites
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-moribyan-joemustgoon-batch2.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Marry Me Salmon',
    'Sushi Bake (Moribyan)',
    'Nando''s Peri Peri Chicken (Copycat)',
    'Halal Cart Chicken and Rice',
    'Butter Chicken Mac & Cheese',
    'SPAM Teriyaki Fried Rice',
    'Bulgogi Grilled Cheese',
    'Tuscan Chicken Pasta',
    'Shrimp Pasta (Fresh Pasta)',
    'Butter Chicken Pasta',
    'Fried Butter Chicken Sandwich',
    'Lamb (Mutton) Biryani',
    'Lasagna (Joemustgoon)',
    'Fried Chicken (Joemustgoon)',
    'Massaman Curry',
    'Double Bacon Smash Cheeseburger',
    'Chicken Tikka Masala (Joemustgoon)',
    'Creamy Steak Bites'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Marry Me Salmon
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Marry Me Salmon',
    'Filets de saumon saisis poêle nappés d''une sauce crémeuse à l''ail, citron et herbes (basilic, persil). Le tout prêt en moins de 30 minutes.',
    $instr$["Poser les filets de saumon dans une assiette, arroser d'huile d'olive et assaisonner d'Italian seasoning, sel, ail en poudre, origan, poivre noir et flocons de piment.",
"Chauffer une poêle huilée à feu moyen-vif et saisir le saumon 3 minutes par face jusqu'à doré. Baisser le feu pour finir la cuisson à cœur, puis retirer.",
"Dans la même poêle à feu moyen, faire fondre le beurre avec l'ail émincé pendant 1-2 minutes.",
"Ajouter la crème, le bouillon de poulet et le jus de citron. Laisser frémir 2-3 minutes.",
"Fouetter le cream cheese et le parmesan jusqu'à épaississement. Assaisonner sel et poivre.",
"Incorporer le basilic et le persil ciselés.",
"Remettre les filets de saumon dans la sauce et réchauffer 1-2 minutes avant de servir."]
$instr$,
    15, 15, 4, 2,
    'Italienne', 'dinner',
    ARRAY['saumon','crémeux','italien','rapide','30min','poêle'],
    'manual',
    'https://moribyan.com/marry-me-salmon/',
    'https://moribyan.com/wp-content/uploads/2023/03/Client-Owned-Image-2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filets de saumon',           4,   'unité',      true,  1,  'sans peau'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'Italian seasoning',          2,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'origan séché',               0.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'flocons de piment',          0.5, 'c. à café',  false, 8,  NULL),
    (v_recipe_id, 'beurre doux',                3,   'c. à soupe', true,  9,  'pour la sauce'),
    (v_recipe_id, 'ail émincé',                 0.5, 'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'crème liquide entière',      240, 'ml',         true,  11, NULL),
    (v_recipe_id, 'bouillon de poulet',         120, 'ml',         true,  12, NULL),
    (v_recipe_id, 'jus de citron',              1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'cream cheese',               2,   'c. à soupe', true,  14, 'à température ambiante'),
    (v_recipe_id, 'parmesan râpé',              60,  'g',          true,  15, NULL),
    (v_recipe_id, 'persil frais',               1,   'c. à soupe', false, 16, 'haché'),
    (v_recipe_id, 'basilic frais',              2,   'c. à soupe', false, 17, 'ciselé');

  -- =====================================================================
  -- 2. Sushi Bake (Moribyan)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Sushi Bake (Moribyan)',
    'California roll déconstruit en gratin : riz à sushi vinaigré, nori, garniture crémeuse au crabe et crevettes, gratiné au four et garni de spicy mayo, sauce unagi, avocat et furikake.',
    $instr$["Rincer le riz à sushi jusqu'à eau claire (optionnellement laisser tremper 15 min).",
"Porter 3 tasses d'eau salée à ébullition. Ajouter le riz, baisser le feu, couvrir et frémir 20 minutes. Couper le feu et garder couvert 10 minutes. Égrener.",
"Mélanger vinaigre de riz, sucre et huile de sésame dans un bol et micro-onder 30 secondes. Incorporer au riz uniformément.",
"Spicy mayo : fouetter mayo, sambal, sriracha, huile de sésame, sucre et jus de citron. Réserver.",
"Garniture : mélanger crabe, crevettes hachées, mayo, cream cheese, sauce soja, huile de sésame, sambal/sriracha et jus de citron vert jusqu'à homogène.",
"Préchauffer le four à 220°C (425°F).",
"Étaler le riz dans un plat 23×23 cm. Recouvrir d'une couche de nori, puis de la garniture crabe-crevettes.",
"Enfourner 10-15 minutes jusqu'à coloration dorée. Optionnel : passer 1-2 minutes sous le gril pour plus de croustillant.",
"Garnir de spicy mayo, sauce unagi, avocat, oignons nouveaux et graines de sésame. Servir immédiatement."]
$instr$,
    40, 20, 6, 3,
    'Japonaise', 'dinner',
    ARRAY['japonais','sushi','gratin','crabe','crevettes','fusion'],
    'manual',
    'https://moribyan.com/sushi-bake/',
    'https://moribyan.com/wp-content/uploads/2022/03/sushi-bake-3-scaled-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'mayonnaise',                 120, 'ml',         true,  1,  'spicy mayo'),
    (v_recipe_id, 'sambal',                     1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'sriracha',                   1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'huile de sésame',            0.25, 'c. à café', true,  4,  'pour la mayo'),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  5,  'pour la mayo'),
    (v_recipe_id, 'jus de citron',              1,   'c. à café',  true,  6,  'pour la mayo'),
    (v_recipe_id, 'chair de crabe',             230, 'g',          true,  7,  NULL),
    (v_recipe_id, 'crevettes décortiquées',     230, 'g',          true,  8,  'finement hachées'),
    (v_recipe_id, 'mayonnaise',                 60,  'ml',         true,  9,  'pour la garniture'),
    (v_recipe_id, 'cream cheese',               60,  'g',          true,  10, 'température ambiante'),
    (v_recipe_id, 'sauce soja',                 1.5, 'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'huile de sésame',            1,   'c. à café',  true,  12, 'pour la garniture'),
    (v_recipe_id, 'jus de citron vert',         1,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'oignons nouveaux',           0.25, 'tasse',     true,  14, 'tranchés'),
    (v_recipe_id, 'riz à sushi',                400, 'g',          true,  15, 'rincé'),
    (v_recipe_id, 'eau',                        720, 'ml',         true,  16, 'pour le riz'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'vinaigre de riz',            60,  'ml',         true,  18, NULL),
    (v_recipe_id, 'sucre',                      2,   'c. à soupe', true,  19, 'pour le riz vinaigré'),
    (v_recipe_id, 'huile de sésame',            1,   'c. à café',  true,  20, 'pour le riz'),
    (v_recipe_id, 'feuilles de nori',           4,   'unité',      true,  21, NULL),
    (v_recipe_id, 'concombre',                  1,   'unité',      false, 22, 'tranché, garniture'),
    (v_recipe_id, 'avocat',                     1,   'unité',      false, 23, 'tranché, garniture'),
    (v_recipe_id, 'graines de sésame',          1,   'c. à soupe', false, 24, NULL),
    (v_recipe_id, 'sauce unagi',                2,   'c. à soupe', false, 25, NULL);

  -- =====================================================================
  -- 3. Nando's Peri Peri Chicken (Copycat)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Nando''s Peri Peri Chicken (Copycat)',
    'Escalopes de poulet marinées à la sauce peri peri faite maison : poivron rouge, piments oiseau, ail, vinaigre, paprika, romarin et persil — épicée, tangy et ail-y comme chez Nando''s.',
    $instr$["Sauce : passer poivron, piments, ail, vinaigre, huile, origan, paprika, romarin, sel, sucre, persil et jus de citron au mixer jusqu'à purée.",
"Transférer dans une casserole avec les feuilles de laurier. Faire mijoter 20 minutes.",
"Laisser refroidir 10 minutes, retirer les feuilles de laurier et mixer à nouveau jusqu'à lisse. Optionnellement ajouter la mayonnaise pour plus de crémeux.",
"Couper les blancs de poulet horizontalement pour obtenir 8 escalopes plates.",
"Mariner les escalopes dans la sauce (cuisson immédiate possible ou marinade prolongée).",
"Chauffer une poêle à feu moyen-vif. Ajouter huile et poulet en espaçant les morceaux.",
"Saisir 3 minutes par face puis baisser le feu et cuire à cœur jusqu'à 75°C (165°F) interne (1-2 minutes).",
"Servir avec la sauce restante."]
$instr$,
    40, 15, 4, 2,
    'Portugaise', 'dinner',
    ARRAY['poulet','peri peri','épicé','africain','portugais','marinade','grillade'],
    'manual',
    'https://moribyan.com/nandos-peri-peri-chicken/',
    'https://moribyan.com/wp-content/uploads/2022/05/IMG_6034-scaled-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poivron rouge',              1,   'unité',      true,  1,  'entier'),
    (v_recipe_id, 'piments oiseau',             5,   'unité',      true,  2,  'African Bird''s Eye ou Thaï, selon piquant'),
    (v_recipe_id, 'ail',                        8,   'gousse',     true,  3,  NULL),
    (v_recipe_id, 'vinaigre blanc',             60,  'ml',         true,  4,  NULL),
    (v_recipe_id, 'huile d''olive',             60,  'ml',         true,  5,  NULL),
    (v_recipe_id, 'origan séché',               2,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'paprika',                    2,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'romarin séché',              2,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'persil frais',               15,  'g',          true,  11, 'une poignée'),
    (v_recipe_id, 'citron',                     0.5, 'unité',      true,  12, 'jus seulement'),
    (v_recipe_id, 'feuilles de laurier',        2,   'unité',      true,  13, NULL),
    (v_recipe_id, 'mayonnaise',                 60,  'ml',         false, 14, 'optionnel, crémeux'),
    (v_recipe_id, 'blancs de poulet',           4,   'unité',      true,  15, 'gros, coupés en escalopes'),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  16, 'pour cuisson');

  -- =====================================================================
  -- 4. Halal Cart Chicken and Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Halal Cart Chicken and Rice',
    'Hommage aux food trucks halal de New York : poulet shawarma épicé, riz basmati jaune au curcuma, sauce blanche à la toum et garnitures (laitue, tomates, pita).',
    $instr$["Sauce blanche : fouetter mayo, toum, crème aigre, poivre, jus de citron, sucre et eau jusqu'à consistance lisse. Réserver.",
"Poulet shawarma : mélanger les hauts de cuisse avec huile, jus de citron, ail, allspice, coriandre, paprika, cumin, sumac, poivre, curcuma et sel.",
"Marinade 30 min minimum (ou toute une nuit).",
"Chauffer une poêle en fonte à feu vif avec huile. Cuire le poulet 4 minutes par face jusqu'à coloration. Baisser, couvrir et finir la cuisson à cœur.",
"Hacher le poulet en petits morceaux. Optionnel : remettre dans la poêle quelques minutes pour intensifier la saveur.",
"Riz : rincer le basmati 2 minutes à l'eau tiède jusqu'à eau claire (ou tremper 30 min, égoutter).",
"Faire fondre ghee dans une casserole à feu moyen. Toaster le riz 3 minutes.",
"Ajouter bouillon, curcuma, origan, cumin, sel et laurier. Bouillir, baisser, couvrir et cuire 11-12 minutes. Couper le feu et laisser 5 min couvert.",
"Aérer à la fourchette et retirer le laurier.",
"Servir : riz, poulet, tomates, laitue, pita, sauce blanche généreuse et hot sauce."]
$instr$,
    40, 30, 4, 3,
    'Moyen-Orientale', 'dinner',
    ARRAY['halal','poulet','riz','shawarma','street food','new york','sauce blanche'],
    'manual',
    'https://moribyan.com/halal-cart-chicken-and-rice/',
    'https://moribyan.com/wp-content/uploads/2022/05/IMG_5367-2-scaled-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz basmati',                400, 'g',          true,  1,  NULL),
    (v_recipe_id, 'bouillon de poulet',         720, 'ml',         true,  2,  NULL),
    (v_recipe_id, 'ghee',                       2,   'c. à soupe', true,  3,  'ou beurre doux'),
    (v_recipe_id, 'curcuma',                    0.5, 'c. à café',  true,  4,  'pour le riz'),
    (v_recipe_id, 'origan séché',               0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'cumin',                      0.5, 'c. à café',  true,  6,  'pour le riz'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  7,  'pour le riz'),
    (v_recipe_id, 'feuille de laurier',         1,   'unité',      true,  8,  NULL),
    (v_recipe_id, 'hauts de cuisse de poulet',  907, 'g',          true,  9,  'désossés sans peau'),
    (v_recipe_id, 'huile d''olive',             60,  'ml',         true,  10, NULL),
    (v_recipe_id, 'citron',                     2,   'unité',      true,  11, 'jus seulement'),
    (v_recipe_id, 'ail émincé',                 1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'allspice',                   2,   'c. à soupe', true,  13, 'piment de la Jamaïque'),
    (v_recipe_id, 'coriandre moulue',           1,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'paprika',                    1,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'cumin',                      1,   'c. à soupe', true,  16, 'pour le poulet'),
    (v_recipe_id, 'sumac',                      2,   'c. à café',  true,  17, NULL),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  18, NULL),
    (v_recipe_id, 'mayonnaise',                 120, 'ml',         true,  19, 'sauce blanche'),
    (v_recipe_id, 'toum',                       60,  'ml',         true,  20, 'pâte d''ail libanaise'),
    (v_recipe_id, 'crème aigre',                2,   'c. à soupe', true,  21, 'sour cream'),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  22, 'pour la sauce'),
    (v_recipe_id, 'laitue iceberg',             0.5, 'unité',      true,  23, 'effilochée'),
    (v_recipe_id, 'tomates',                    2,   'unité',      true,  24, 'en dés'),
    (v_recipe_id, 'pain pita',                  4,   'unité',      true,  25, 'tranché'),
    (v_recipe_id, 'sauce piquante',             1,   'c. à soupe', false, 26, 'sriracha ou hot sauce');

  -- =====================================================================
  -- 5. Butter Chicken Mac & Cheese (UPDATED 2025)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Butter Chicken Mac & Cheese',
    'Mac & cheese fusion indien-américain : sauce butter chicken aux cajous, sauce mornay 4 fromages (mozzarella, gouda, cheddar, parmesan), poulet effiloché tikka et pasta cavatelli gratinée au panko beurré.',
    $instr$["Marinade : écraser ail, gingembre et piment au mortier. Mélanger avec hauts de cuisse, yaourt grec, beurre fondu, sel, curcuma, Kashmiri, garam masala et jus de citron vert. Mariner 30 min minimum.",
"Préchauffer le four à 200°C (400°F). Étaler poulet et marinade sur une plaque, enfourner 20-25 minutes jusqu'à 75°C à cœur.",
"Laisser tiédir, effilocher en filaments et incorporer le jus de cuisson.",
"Sauce butter chicken : mixer cajous avec 120ml d'eau, réserver.",
"Faire fondre ghee à feu moyen, suer l'oignon 2-3 min puis ajouter l'ail 1 min.",
"Baisser le feu, ajouter garam masala, Kashmiri, cumin, curcuma et cuire 1-2 minutes.",
"Ajouter le concentré de tomate et cuire 3 minutes.",
"Verser purée de tomate avec pincée de sel, mijoter 5 minutes.",
"Incorporer purée de cajou, crème et miel. Finir avec kasoori methi, coriandre, jus de citron vert et sel.",
"Sauce fromage : râper tous les fromages et diviser en deux.",
"À feu moyen-doux, fondre le beurre avec ail/oignon en poudre, Kashmiri et sel pendant 2 min.",
"Ajouter la farine et fouetter 3-4 min jusqu'à roux blond.",
"Incorporer la crème en deux fois puis le lait en deux fois. Mijoter 2-3 min.",
"Couper le feu et incorporer progressivement la moitié du fromage râpé par poignées en fouettant entre chaque ajout.",
"Préchauffer le four à 190°C (375°F). Mélanger panko et beurre fondu.",
"Cuire les cavatelli al dente, égoutter (réserver eau).",
"Mélanger pasta, sauce butter chicken et sauce mornay (détendre à l'eau si trop épais). Goûter, ajuster sel et jus de citron vert.",
"Dans un plat 23×33 cm, alterner : moitié des pâtes, fromage restant, reste des pâtes, reste du fromage.",
"Couvrir de panko beurré et enfourner 20-25 min jusqu'à doré. Garnir de coriandre."]
$instr$,
    60, 50, 6, 4,
    'Indienne', 'dinner',
    ARRAY['indien','américain','fusion','mac and cheese','butter chicken','gratin','pâtes'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/updated-2025-butter-chicken-mac-cheese',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Cover_Photo_57d14d85-0425-4d41-aa6d-3647880e1fb7.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  4,   'unité',      true,  1,  'désossés sans peau'),
    (v_recipe_id, 'ail',                        9,   'gousse',     true,  2,  'pour marinade'),
    (v_recipe_id, 'gingembre',                  2.5, 'cm',         true,  3,  NULL),
    (v_recipe_id, 'piment vert',                1,   'unité',      true,  4,  'petit'),
    (v_recipe_id, 'yaourt grec entier',         180, 'g',          true,  5,  NULL),
    (v_recipe_id, 'beurre doux',                1.5, 'c. à soupe', true,  6,  'fondu, marinade'),
    (v_recipe_id, 'sel',                        0.5, 'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'curcuma',                    1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'Kashmiri chili powder',      2,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'garam masala',               1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'citron vert',                0.5, 'unité',      true,  11, 'jus seulement'),
    (v_recipe_id, 'ghee',                       4,   'c. à soupe', true,  12, 'ou beurre, pour la sauce'),
    (v_recipe_id, 'ail émincé',                 5,   'gousse',     true,  13, 'pour la sauce'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  14, 'petit, finement émincé'),
    (v_recipe_id, 'garam masala',               1.5, 'c. à café',  true,  15, 'pour la sauce'),
    (v_recipe_id, 'Kashmiri chili powder',      1.5, 'c. à café',  true,  16, 'pour la sauce'),
    (v_recipe_id, 'cumin',                      0.5, 'c. à café',  true,  17, NULL),
    (v_recipe_id, 'curcuma',                    0.25, 'c. à café', true,  18, 'pour la sauce'),
    (v_recipe_id, 'concentré de tomate',        1,   'c. à soupe', true,  19, NULL),
    (v_recipe_id, 'purée de tomate',            800, 'g',          true,  20, 'boîte 28 oz'),
    (v_recipe_id, 'cajous',                     2,   'c. à soupe', true,  21, 'à mixer avec eau'),
    (v_recipe_id, 'miel',                       0.5, 'c. à soupe', true,  22, NULL),
    (v_recipe_id, 'crème liquide entière',      80,  'ml',         true,  23, 'sauce butter chicken'),
    (v_recipe_id, 'kasoori methi',              2,   'c. à soupe', true,  24, 'fenugrec séché'),
    (v_recipe_id, 'coriandre fraîche',          0.5, 'unité',      true,  25, 'une demi-botte hachée'),
    (v_recipe_id, 'mozzarella',                 454, 'g',          true,  26, 'râpée'),
    (v_recipe_id, 'gouda',                      454, 'g',          true,  27, 'râpé'),
    (v_recipe_id, 'cheddar',                    454, 'g',          true,  28, 'râpé'),
    (v_recipe_id, 'parmesan',                   115, 'g',          true,  29, 'râpé'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à café',  true,  30, NULL),
    (v_recipe_id, 'oignon en poudre',           1,   'c. à café',  true,  31, NULL),
    (v_recipe_id, 'beurre doux',                5,   'c. à soupe', true,  32, 'pour la béchamel'),
    (v_recipe_id, 'farine',                     5,   'c. à soupe', true,  33, NULL),
    (v_recipe_id, 'crème liquide entière',      480, 'ml',         true,  34, 'pour la béchamel'),
    (v_recipe_id, 'lait entier',                720, 'ml',         true,  35, NULL),
    (v_recipe_id, 'cavatelli',                  454, 'g',          true,  36, 'ou autres pâtes courtes'),
    (v_recipe_id, 'panko',                      120, 'g',          true,  37, NULL),
    (v_recipe_id, 'beurre doux',                4,   'c. à soupe', true,  38, 'pour le panko');

  -- =====================================================================
  -- 6. SPAM Teriyaki Fried Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'SPAM Teriyaki Fried Rice',
    'Riz frit confort japonais avec cubes de SPAM glacés teriyaki maison (soja, mirin, sake, bonite, kombu), œuf brouillé, carottes et oignons nouveaux.',
    $instr$["Sauce teriyaki : chauffer huile, cuire ail et gingembre jusqu'à parfumé.",
"Ajouter sake et réduire de moitié.",
"Verser soja, mirin, sucre, miel et oignons nouveaux. Mijoter 3-4 min à feu moyen-doux.",
"Ajouter bonite et kombu. Mijoter 1 minute, puis passer au tamis fin et laisser refroidir.",
"SPAM : couper en cubes, chauffer 1 c. à soupe d'huile dans une poêle à feu moyen.",
"Cuire le SPAM jusqu'à doré et croustillant.",
"Glacer le SPAM avec 3 c. à soupe de sauce teriyaki, cuire 1-2 min jusqu'à brillant. Réserver.",
"Brouiller l'œuf et réserver.",
"Riz frit : ajouter huile, augmenter le feu. Sauter oignon blanc, oignons nouveaux clairs et carottes 2 min.",
"Ajouter le riz, casser les grumeaux et bien répartir les légumes.",
"Verser 5 c. à soupe de sauce teriyaki autour de la poêle. Tossing vigoureusement.",
"Incorporer l'œuf brouillé. Goûter et ajuster avec 2-3 c. à soupe de sauce teriyaki supplémentaire.",
"Finir avec huile de sésame, sucre et MSG. Saler à votre goût.",
"Mélanger le SPAM glacé. Garnir d'oignons nouveaux verts et servir chaud."]
$instr$,
    20, 20, 4, 3,
    'Asiatique', 'dinner',
    ARRAY['asiatique','japonais','riz frit','spam','teriyaki','comfort food'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/sdfs',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Cover.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz blanc cuit',             800, 'g',          true,  1,  'de la veille'),
    (v_recipe_id, 'oignon blanc',               1,   'unité',      true,  2,  'en dés'),
    (v_recipe_id, 'oignons nouveaux',           3,   'unité',      true,  3,  'blancs et verts séparés'),
    (v_recipe_id, 'carotte',                    1,   'unité',      true,  4,  'moyenne, en dés'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  5,  NULL),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  6,  'émincé, riz frit'),
    (v_recipe_id, 'huile de sésame',            1.5, 'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'sucre',                      0.5, 'c. à soupe', true,  8,  'pour le riz'),
    (v_recipe_id, 'MSG',                        1,   'c. à café',  false, 9,  'optionnel'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'huile neutre',               3,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'boeuf fume',                       1,   'unité',      true,  12, 'une boîte, en cubes'),
    (v_recipe_id, 'sauce soja',                 180, 'ml',         true,  13, 'pour teriyaki'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  14, 'écrasé, pour teriyaki'),
    (v_recipe_id, 'gingembre',                  1.5, 'cm',         true,  15, 'écrasé'),
    (v_recipe_id, 'oignons nouveaux',           2,   'unité',      true,  16, 'pour teriyaki'),
    (v_recipe_id, 'bouillon dashi',                       2,   'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      80,  'ml',         true,  18, '1/4 cup + 1.5 tbsp'),
    (v_recipe_id, 'sucre',                      4.5, 'c. à soupe', true,  19, 'pour teriyaki'),
    (v_recipe_id, 'miel',                       1,   'c. à soupe', true,  20, NULL),
    (v_recipe_id, 'bonite séchée',              2,   'c. à soupe', true,  21, 'katsuobushi'),
    (v_recipe_id, 'kombu',                      1,   'unité',      true,  22, 'petite bande');

  -- =====================================================================
  -- 7. Bulgogi Grilled Cheese
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bulgogi Grilled Cheese',
    'Sandwich grillé fusion coréen-américain : faux-filet mariné bulgogi (poire, soja, sésame, miel), mozzarella et cheddar Tillamook sur pain au levain tartiné de mayo aux herbes.',
    $instr$["Marinade : mixer ail, gingembre, poire, oignons nouveaux, oignon, soja clair, soja foncé, huile de sésame, miel, mirin, cassonade et poivre jusqu'à lisse.",
"Combiner avec le faux-filet tranché fin et l'oignon émincé. Mariner 30 min minimum (idéalement une nuit).",
"Cuire le bœuf à feu moyen-vif en 3-4 fournées, environ 3-5 min par fournée.",
"Mayo aux herbes : mélanger mayonnaise, oignons nouveaux et thym frais.",
"Étaler la mayo aux herbes sur les tranches de pain au levain.",
"À feu doux, placer le pain côté mayo en bas. Empiler mozzarella, cheddar, bulgogi, mozzarella restante et autre tranche.",
"Retourner toutes les 2 min jusqu'à fonte du fromage et croûte dorée (12-16 min total).",
"Laisser reposer 1-2 min sur grille avant de trancher."]
$instr$,
    30, 50, 3, 3,
    'Coréenne', 'dinner',
    ARRAY['coréen','américain','fusion','sandwich','grilled cheese','bulgogi','bœuf'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/bulgogi-grilled-cheese',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/3._Grilled_Cheese_on_Pan.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'faux-filet',                 680, 'g',          true,  1,  'tranché finement'),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  2,  'petit, tranché fin'),
    (v_recipe_id, 'sauce soja claire',          60,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'sauce soja foncée',          2,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'huile de sésame',            1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'miel',                       1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'vinaigre de riz, sucre et eau (3:1:3)',                      4,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'poire coréenne',             210, 'g',          true,  8,  '1 fruit ~7.5 oz'),
    (v_recipe_id, 'oignons nouveaux',           2,   'unité',      true,  9,  'pour marinade'),
    (v_recipe_id, 'oignon jaune',               0.5, 'unité',      true,  10, 'pour marinade'),
    (v_recipe_id, 'cassonade',                  4,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'ail',                        5,   'gousse',     true,  12, NULL),
    (v_recipe_id, 'gingembre râpé',             1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'poivre noir',                0.125, 'c. à café', true, 14, NULL),
    (v_recipe_id, 'mayonnaise',                 4,   'c. à soupe', true,  15, 'pour compound mayo'),
    (v_recipe_id, 'oignons nouveaux',           1,   'c. à soupe', true,  16, 'émincés, pour mayo'),
    (v_recipe_id, 'thym frais',                 1.5, 'c. à café',  true,  17, 'émincé'),
    (v_recipe_id, 'pain au levain',             4,   'tranche',    true,  18, 'sourdough'),
    (v_recipe_id, 'mozzarella',                 120, 'g',          true,  19, 'râpée'),
    (v_recipe_id, 'cheddar',                    4,   'c. à soupe', true,  20, 'râpé triple cheddar');

  -- =====================================================================
  -- 8. Tuscan Chicken Pasta
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Tuscan Chicken Pasta',
    'Rigatoni nappés d''une sauce crémeuse tomates-épinards-parmesan avec poulet mariné Italian seasoning. Touche finale au beurre et eau de cuisson.',
    $instr$["Marinade : mélanger blanc de poulet avec ail en poudre, oignon en poudre, Italian seasoning, poivre, sel et huile d'olive. Réfrigérer 10 minutes.",
"Préparer les légumes : couper en deux les tomates cerises, dés l'oignon, émincer l'ail, hacher les tomates séchées.",
"Saisir le poulet à l'huile jusqu'à cuit à cœur, réserver.",
"Suer oignon et tomates cerises jusqu'à amollissement. Ajouter tomates séchées et leur huile.",
"Incorporer l'ail, puis le concentré de tomate.",
"Déglacer au vin blanc et au bouillon, réduire de moitié.",
"Baisser le feu, ajouter la crème puis les épinards jusqu'à wilt. Incorporer le basilic.",
"Hors du feu, incorporer le parmesan. Finir au jus de citron.",
"Cuire les rigatoni juste sous l'al dente. Combiner avec la sauce, l'eau réservée et le beurre.",
"Dresser et garnir de persil, flocons de piment et poivre noir cracké."]
$instr$,
    15, 30, 3, 2,
    'Italienne', 'dinner',
    ARRAY['italien','toscane','poulet','pâtes','crémeux','rigatoni','tomates séchées'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/tuscan-chicken-pasta',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Untitled_design_1.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blanc de poulet',            1,   'unité',      true,  1,  'tranché finement'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'oignon en poudre',           0.5, 'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'Italian seasoning',          0.75, 'c. à soupe',true,  4,  NULL),
    (v_recipe_id, 'poivre noir',                0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'sel',                        0.25, 'c. à café', true,  6,  NULL),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  7,  'pour marinade'),
    (v_recipe_id, 'huile d''olive',             3,   'c. à soupe', true,  8,  'pour la sauce'),
    (v_recipe_id, 'tomates cerises',            15,  'unité',      true,  9,  'coupées en deux'),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  10, 'gros, en dés'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  11, 'émincé'),
    (v_recipe_id, 'tomates séchées',            5,   'unité',      true,  12, 'hachées'),
    (v_recipe_id, 'huile de tomates séchées',   1,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'concentré de tomate',        1,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'bouillon et jus de citron',                  60,  'ml',         true,  15, NULL),
    (v_recipe_id, 'bouillon de poulet',         60,  'ml',         true,  16, NULL),
    (v_recipe_id, 'crème liquide entière',      240, 'ml',         true,  17, NULL),
    (v_recipe_id, 'épinards frais',             30,  'g',          true,  18, 'half cup'),
    (v_recipe_id, 'basilic frais',              5,   'feuille',    true,  19, NULL),
    (v_recipe_id, 'parmesan râpé',              100, 'g',          true,  20, NULL),
    (v_recipe_id, 'citron',                     0.5, 'unité',      true,  21, 'jus seulement'),
    (v_recipe_id, 'origan séché',               1,   'c. à soupe', true,  22, NULL),
    (v_recipe_id, 'rigatoni',                   250, 'g',          true,  23, 'half box'),
    (v_recipe_id, 'beurre doux',                1,   'c. à soupe', true,  24, 'pour finition'),
    (v_recipe_id, 'persil frais',               1,   'c. à soupe', false, 25, 'haché, garniture'),
    (v_recipe_id, 'flocons de piment',          0.5, 'c. à café',  false, 26, 'garniture');

  -- =====================================================================
  -- 9. Shrimp Pasta (Fresh Pasta)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Shrimp Pasta (Fresh Pasta)',
    'Pâtes fraîches maison nappées d''une sauce crémeuse aux échalotes, tomates cerises, tomates séchées et grains de poivre vert en saumure, avec crevettes saisies au paprika.',
    $instr$["Pâtes : former un puits avec la farine, ajouter œufs, huile et sel. Travailler à la fourchette jusqu'à formation d'une pâte.",
"Pétrir 8-10 minutes jusqu'à lisse. Filmer et réfrigérer 30 minutes.",
"Diviser en 4, abaisser finement et tailler en pâtes (tagliatelles, pappardelle...).",
"Crevettes : mariner avec sel, poivre, paprika et huile pendant 30 minutes.",
"Cuire les crevettes 2-3 min par face. Réserver.",
"Sauce : sauter échalote avec tomates cerises et séchées 7-8 minutes.",
"Ajouter l'ail 1 minute.",
"Déglacer au bouillon, ajouter la crème et mijoter doucement.",
"Mixer la sauce jusqu'à lisse.",
"Retourner en poêle, ajouter parmesan, crevettes, grains de poivre vert et saumure.",
"Cuire les pâtes fraîches al dente (2-4 minutes).",
"Combiner pâtes et sauce avec l'eau réservée à feu doux jusqu'à bonne consistance. Servir."]
$instr$,
    60, 30, 3, 3,
    'Italienne', 'dinner',
    ARRAY['italien','pâtes fraîches','crevettes','crémeux','tomates séchées','poivre vert'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/shrimp-pasta-recipe',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/P1170382_copy_2.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'farine',                     250, 'g',          true,  1,  '2 cups, pour la pâte'),
    (v_recipe_id, 'œuf',                        3,   'unité',      true,  2,  'pour la pâte'),
    (v_recipe_id, 'huile d''olive',             0.5, 'c. à soupe', true,  3,  'pour la pâte'),
    (v_recipe_id, 'sel',                        1,   'pincée',     true,  4,  'pour la pâte'),
    (v_recipe_id, 'crevettes décortiquées',     454, 'g',          true,  5,  'déveinées'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  6,  'pour les crevettes'),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  7,  'pour les crevettes'),
    (v_recipe_id, 'paprika',                    0.75, 'c. à soupe',true,  8,  NULL),
    (v_recipe_id, 'huile d''olive',             2,   'c. à soupe', true,  9,  'pour les crevettes'),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  10, 'grosse, finement hachée'),
    (v_recipe_id, 'tomates cerises',            10,  'unité',      true,  11, 'coupées en deux'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  12, 'émincé'),
    (v_recipe_id, 'tomates séchées',            2,   'unité',      true,  13, 'en dés'),
    (v_recipe_id, 'bouillon de poulet',         60,  'ml',         true,  14, 'ou eau'),
    (v_recipe_id, 'crème liquide entière',      470, 'ml',         true,  15, '1 pint'),
    (v_recipe_id, 'parmesan râpé',              80,  'g',          true,  16, NULL),
    (v_recipe_id, 'grains de poivre vert',      1.5, 'c. à café',  true,  17, 'en saumure'),
    (v_recipe_id, 'saumure poivre vert',        2,   'c. à café',  true,  18, NULL),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  19, 'pour la sauce');

  -- =====================================================================
  -- 10. Butter Chicken Pasta
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Butter Chicken Pasta',
    'Fusion indo-italienne : rigatoni nappés d''une sauce butter chicken crémeuse (tomate, cajou, garam masala, kasoori methi) avec hauts de cuisse mariné yaourt-Kashmiri rôtis.',
    $instr$["Préchauffer le four à 200°C (400°F).",
"Écraser au mortier ail, gingembre et piments thaï pour obtenir une pâte.",
"Mariner les hauts de cuisse cubés avec yaourt, garam masala, Kashmiri, curcuma, jus de citron vert, sel. Réfrigérer 30 min minimum (jusqu'à 12h).",
"Étaler sur une plaque et enfourner 20-25 min jusqu'à cuit à cœur.",
"Cuire les rigatoni juste sous l'al dente, réserver 700 ml d'eau de cuisson.",
"Faire fondre le beurre à feu moyen avec l'échalote pendant 2-3 minutes.",
"Ajouter pâte gingembre-ail-piment et cuire 1 minute.",
"Baisser le feu, ajouter garam masala, Kashmiri, curcuma et cumin pour 1-2 minutes.",
"Verser la sauce tomate Rao's (ou purée), mijoter 2-3 minutes (5-6 si purée).",
"Incorporer crème, purée de cajou et miel. Finir avec kasoori methi, coriandre et jus de citron vert.",
"Goûter et saler.",
"Dans une grande poêle, combiner sauce, poulet, pâtes et 60-120 ml d'eau réservée. Mélanger 2 minutes.",
"Dresser, garnir de parmesan et coriandre."]
$instr$,
    45, 25, 4, 3,
    'Indienne', 'dinner',
    ARRAY['indien','italien','fusion','poulet','pâtes','rigatoni','butter chicken'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/butter-chicken-pasta',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/IMG_84083BFDA700-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  907, 'g',          true,  1,  'désossés en cubes'),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  2,  'pour marinade'),
    (v_recipe_id, 'gingembre',                  2,   'cm',         true,  3,  NULL),
    (v_recipe_id, 'piment thaï vert',           2,   'unité',      true,  4,  NULL),
    (v_recipe_id, 'garam masala',               1,   'c. à soupe', true,  5,  'marinade'),
    (v_recipe_id, 'Kashmiri chili powder',      2,   'c. à soupe', true,  6,  'marinade'),
    (v_recipe_id, 'curcuma',                    0.5, 'c. à café',  true,  7,  'marinade'),
    (v_recipe_id, 'yaourt entier',              180, 'g',          true,  8,  NULL),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  9,  'jus seulement'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  10, 'marinade'),
    (v_recipe_id, 'rigatoni',                   250, 'g',          true,  11, 'half box'),
    (v_recipe_id, 'beurre doux',                3,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  13, 'finement émincée'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  14, 'pour la sauce'),
    (v_recipe_id, 'garam masala',               1,   'c. à café',  true,  15, 'pour la sauce'),
    (v_recipe_id, 'Kashmiri chili powder',      1.5, 'c. à café',  true,  16, 'pour la sauce'),
    (v_recipe_id, 'curcuma',                    0.25, 'c. à café', true,  17, 'pour la sauce'),
    (v_recipe_id, 'cumin',                      0.5, 'c. à café',  true,  18, NULL),
    (v_recipe_id, 'purée de tomate',            800, 'g',          true,  19, '28 oz ou sauce Rao''s'),
    (v_recipe_id, 'purée de cajou',             60,  'ml',         true,  20, NULL),
    (v_recipe_id, 'crème liquide entière',      60,  'ml',         true,  21, NULL),
    (v_recipe_id, 'miel',                       0.5, 'c. à soupe', true,  22, NULL),
    (v_recipe_id, 'kasoori methi',              1.5, 'c. à soupe', true,  23, 'fenugrec séché'),
    (v_recipe_id, 'coriandre fraîche',          0.5, 'unité',      true,  24, 'demi-botte, hachée'),
    (v_recipe_id, 'parmesan râpé',              30,  'g',          false, 25, 'garniture');

  -- =====================================================================
  -- 11. Fried Butter Chicken Sandwich
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Fried Butter Chicken Sandwich',
    'Sandwich brioché signature : poulet pané frit mariné buttermilk-épices, nappé sauce butter chicken, fondue de mozzarella, oignons rouges frits croustillants et coriandre.',
    $instr$["Oignons frits : trancher en demi-lunes fines (~3 mm). Frire 4-5 min à feu moyen jusqu'à doré. Égoutter sur papier absorbant.",
"Marinade buttermilk : mélanger buttermilk, hauts de cuisse, Kashmiri, garam masala, coriandre, ail en poudre, curcuma, sel, poivre, jus de citron, ail écrasé, gingembre et piment thaï.",
"Mariner minimum 1h (jusqu'à 12h).",
"Mélanger la farine assaisonnée avec Kashmiri, garam masala, coriandre, curcuma, ail en poudre, oignon en poudre, sel et maïzena.",
"Tremper le poulet mariné dans la farine assaisonnée jusqu'à enrobage complet.",
"Chauffer l'huile à 165°C (325°F). Frire le poulet en maintenant 150°C (300°F), 7-8 min jusqu'à 75°C interne et croûte dorée.",
"Sortir sur grille, déposer une tranche de mozzarella et faire fondre sous le grill du four.",
"Sauce butter chicken : écraser les tomates en boîte à la main.",
"Faire fondre beurre, suer l'échalote 2 min jusqu'à translucide.",
"Ajouter concentré de tomate, cuire 2 min. Ajouter ail, 30 secondes. Toaster les cajous 1 min.",
"Baisser, ajouter épices 1-2 min.",
"Verser tomates écrasées, mijoter 3-4 min. Mixer.",
"Remettre en casserole avec crème, miel, kasoori methi et coriandre. Saler et acidifier au citron vert.",
"Montage : toaster les buns au beurre. Étaler sauce sur les deux côtés. Placer poulet frit fromagé sur le bun inférieur.",
"Surmonter de sauce supplémentaire, gouttes de crème, oignons frits et coriandre. Refermer."]
$instr$,
    90, 30, 5, 4,
    'Indienne', 'dinner',
    ARRAY['indien','américain','fusion','sandwich','poulet frit','butter chicken','brioché'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/fried-butter-chicken-sandwich',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Fried_Butter_Chicken_Thumnail.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon rouge',               3,   'unité',      true,  1,  'grands, tranchés fin'),
    (v_recipe_id, 'huile neutre',               1,   'litre',      true,  2,  'pour friture'),
    (v_recipe_id, 'buttermilk',                 720, 'ml',         true,  3,  'lait fermenté'),
    (v_recipe_id, 'hauts de cuisse de poulet',  5,   'unité',      true,  4,  'avec peau, désossés'),
    (v_recipe_id, 'Kashmiri chili powder',      2,   'c. à soupe', true,  5,  'pour marinade'),
    (v_recipe_id, 'garam masala',               1,   'c. à soupe', true,  6,  'pour marinade'),
    (v_recipe_id, 'coriandre moulue',           0.5, 'c. à soupe', true,  7,  'pour marinade'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  8,  'pour marinade'),
    (v_recipe_id, 'curcuma',                    1,   'c. à café',  true,  9,  'pour marinade'),
    (v_recipe_id, 'sel',                        2,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'poivre noir',                1.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  12, 'jus seulement'),
    (v_recipe_id, 'ail',                        8,   'gousse',     true,  13, 'écrasé, pour marinade'),
    (v_recipe_id, 'gingembre',                  2.5, 'cm',         true,  14, 'écrasé'),
    (v_recipe_id, 'piment thaï vert',           2,   'unité',      true,  15, 'écrasé'),
    (v_recipe_id, 'farine',                     375, 'g',          true,  16, '3 cups, panure'),
    (v_recipe_id, 'Kashmiri chili powder',      2,   'c. à soupe', true,  17, 'panure'),
    (v_recipe_id, 'garam masala',               1.5, 'c. à soupe', true,  18, 'panure'),
    (v_recipe_id, 'coriandre moulue',           1.5, 'c. à soupe', true,  19, 'panure'),
    (v_recipe_id, 'curcuma',                    0.5, 'c. à soupe', true,  20, 'panure'),
    (v_recipe_id, 'ail en poudre',              2,   'c. à soupe', true,  21, 'panure'),
    (v_recipe_id, 'oignon en poudre',           1.5, 'c. à soupe', true,  22, 'panure'),
    (v_recipe_id, 'maïzena',                    60,  'g',          true,  23, NULL),
    (v_recipe_id, 'ghee',                       4,   'c. à soupe', true,  24, 'pour la sauce'),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  25, 'pour la sauce'),
    (v_recipe_id, 'ail',                        4,   'gousse',     true,  26, 'pour la sauce'),
    (v_recipe_id, 'concentré de tomate',        1,   'c. à soupe', true,  27, NULL),
    (v_recipe_id, 'garam masala',               0.5, 'c. à soupe', true,  28, 'pour la sauce'),
    (v_recipe_id, 'Kashmiri chili powder',      0.75, 'c. à soupe',true,  29, 'pour la sauce'),
    (v_recipe_id, 'curcuma',                    0.5, 'c. à café',  true,  30, 'pour la sauce'),
    (v_recipe_id, 'coriandre moulue',           1,   'c. à café',  true,  31, 'pour la sauce'),
    (v_recipe_id, 'cumin',                      1,   'c. à café',  true,  32, NULL),
    (v_recipe_id, 'tomates pelées',             800, 'g',          true,  33, 'San Marzano, 28 oz'),
    (v_recipe_id, 'cajous',                     1.5, 'c. à soupe', true,  34, NULL),
    (v_recipe_id, 'crème liquide entière',      80,  'ml',         true,  35, NULL),
    (v_recipe_id, 'miel',                       0.5, 'c. à soupe', true,  36, NULL),
    (v_recipe_id, 'kasoori methi',              1.5, 'c. à soupe', true,  37, NULL),
    (v_recipe_id, 'coriandre fraîche',          0.5, 'unité',      true,  38, 'demi-botte'),
    (v_recipe_id, 'citron vert',                0.5, 'unité',      true,  39, 'pour la sauce'),
    (v_recipe_id, 'pain brioché',               5,   'unité',      true,  40, 'buns'),
    (v_recipe_id, 'mozzarella',                 5,   'tranche',    true,  41, NULL);

  -- =====================================================================
  -- 12. Lamb (Mutton) Biryani
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Lamb (Mutton) Biryani',
    'Biryani d''agneau festif et aromatique : agneau mariné au yaourt et biryani masala maison (cardamome, cannelle, muscade, clou de girofle), couches de riz basmati safrané, ghee et oignons frits, cuit à la vapeur en dum.',
    $instr$["Oignons frits : trancher 4 oignons en demi-lunes fines. Frire à l'huile à feu moyen jusqu'à dorés. Réserver.",
"Biryani masala : torréfier doucement caraway, macis, cannelle, cardamome noire, coriandre, muscade, piments Kashmiri, clous, cumin, poivre, cardamome verte, laurier. Moudre avec sel, curcuma et kasuri methi.",
"Pâte ail/gingembre/piments thaï au mortier.",
"Mariner l'agneau avec yaourt, biryani masala, coriandre moulue, Kashmiri, curcuma, pâte ail-gingembre-piment, oignons frits écrasés, ghee fondu, jus de citron vert, coriandre fraîche et sel. Réfrigérer 30 min à 24h.",
"Riz : laver le basmati jusqu'à eau claire, tremper 1h à température ambiante.",
"Bouillir l'eau salée avec laurier, anis étoilé, clous, cardamome et huile. Cuire le riz 70-80% (encore légèrement ferme). Égoutter et refroidir.",
"Cuisson de l'agneau : pâte ail-gingembre au mortier.",
"Chauffer l'huile à feu moyen, brunir l'oignon 20 min jusqu'à doré foncé.",
"Ajouter la pâte ail-gingembre 2 min.",
"Ajouter coriandre et biryani masala (optionnel).",
"Verser l'agneau mariné, couvrir et cuire à la vapeur jusqu'à 90% de cuisson. Ajouter 1-2 c. à soupe de yaourt si besoin pour le bouillon.",
"Baisser au minimum. Vérifier l'assaisonnement.",
"Dum : couche d'oignons frits et coriandre sur l'agneau. Ajouter une couche de riz, ghee fondu, lait au safran, oignons frits et coriandre.",
"Couvrir hermétiquement et cuire 15 min à feu très doux.",
"Éteindre et laisser reposer 20 min couvert. Découvrir et servir."]
$instr$,
    90, 90, 6, 5,
    'Indienne', 'dinner',
    ARRAY['indien','agneau','mouton','biryani','riz basmati','dum','festif','épicé'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/lamb-mutton-biriyani-recipe',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Screenshot_2025-02-13_at_12.20.22_PM.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignons',                    4,   'unité',      true,  1,  'tranchés fin, pour frire'),
    (v_recipe_id, 'huile neutre',               500, 'ml',         true,  2,  'pour friture'),
    (v_recipe_id, 'graines de caraway',         2,   'c. à café',  true,  3,  'biryani masala'),
    (v_recipe_id, 'macis',                      3,   'unité',      true,  4,  'pétales de 2.5 cm'),
    (v_recipe_id, 'cannelle',                   4,   'cm',         true,  5,  'bâton'),
    (v_recipe_id, 'cardamome noire',            5,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'graines de coriandre',       2,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'muscade',                    0.5, 'unité',      true,  8,  'râpée'),
    (v_recipe_id, 'piments Kashmiri séchés',    4,   'unité',      true,  9,  NULL),
    (v_recipe_id, 'clous de girofle',           1.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'graines de cumin',           1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'poivre noir grains',         1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'cardamome verte',            2,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'feuilles de laurier',        7,   'unité',      true,  14, NULL),
    (v_recipe_id, 'curcuma',                    0.5, 'c. à café',  true,  15, 'pour masala'),
    (v_recipe_id, 'kasuri methi',               0.75, 'c. à soupe',true,  16, 'fenugrec séché'),
    (v_recipe_id, 'côtelettes d''agneau',       907, 'g',          true,  17, 'avec os'),
    (v_recipe_id, 'yaourt nature',              240, 'g',          true,  18, NULL),
    (v_recipe_id, 'biryani masala',             1.5, 'c. à soupe', true,  19, 'préparé ci-dessus'),
    (v_recipe_id, 'coriandre moulue',           2,   'c. à soupe', true,  20, 'pour marinade'),
    (v_recipe_id, 'Kashmiri chili powder',      2,   'c. à soupe', true,  21, NULL),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  22, 'écrasé'),
    (v_recipe_id, 'gingembre',                  1,   'cm',         true,  23, 'écrasé'),
    (v_recipe_id, 'piment thaï vert',           3,   'unité',      true,  24, NULL),
    (v_recipe_id, 'ghee',                       3,   'c. à soupe', true,  25, 'fondu, marinade'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  26, 'jus seulement'),
    (v_recipe_id, 'coriandre fraîche',          45,  'g',          true,  27, '3/4 cup hachée'),
    (v_recipe_id, 'riz basmati',                400, 'g',          true,  28, NULL),
    (v_recipe_id, 'anis étoilé',                2,   'unité',      true,  29, NULL),
    (v_recipe_id, 'oignon',                     2,   'unité',      true,  30, 'petits, pour cuisson'),
    (v_recipe_id, 'lait',                       60,  'ml',         true,  31, 'pour le safran'),
    (v_recipe_id, 'safran',                     1,   'pincée',     true,  32, NULL),
    (v_recipe_id, 'ghee',                       4,   'c. à soupe', true,  33, 'pour les couches');

  -- =====================================================================
  -- 13. Lasagna (Joemustgoon)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Lasagna (Joemustgoon)',
    'Lasagne traditionnelle complète : sauce bolognaise riche (bœuf 85%, saucisse épicée, San Marzano, parmesan), béchamel onctueuse au parmesan et muscade, et feuilles de pâte fraîche maison.',
    $instr$["Pâte : monter un puits avec la farine. Casser les œufs au centre avec sel et huile.",
"Travailler à la fourchette puis pétrir 8-10 min. Filmer et reposer 30 min.",
"Abaisser et tailler en feuilles de lasagne.",
"Bolognaise : mixer oignon, céleri, carottes et ail. Faire suer dans une cocotte avec huile.",
"Ajouter saucisse épicée et bœuf 85%. Brunir.",
"Incorporer concentré de tomate et cuire 3 min.",
"Déglacer au vin et au bouillon. Ajouter tomates écrasées San Marzano, origan, basilic frais et séché, sucre, sel et poivre.",
"Incorporer parmesan râpé + croûte. Couvrir partiellement et mijoter 1-2h.",
"Ajouter flocons de piment et 1/2 cup de bouillon supplémentaire en fin de cuisson.",
"Béchamel : fondre le beurre, ajouter la farine et fouetter 2-3 min jusqu'à roux blond.",
"Ajouter le lait progressivement en fouettant. Mijoter jusqu'à épaississement.",
"Incorporer parmesan, muscade, ail en poudre, poivre. Ajuster sel.",
"Préchauffer le four à 200°C (400°F). Cuire les feuilles de pâte 1 min à l'eau bouillante salée.",
"Montage : un peu de bolognaise, feuilles de pâte, bolognaise, béchamel, parmesan. Répéter 4-5 couches. Finir par béchamel + parmesan.",
"Enfourner 30-40 min jusqu'à doré bullant. Reposer 15 min avant de servir."]
$instr$,
    60, 90, 6, 4,
    'Italienne', 'dinner',
    ARRAY['italien','lasagne','bolognaise','béchamel','pâte fraîche','bœuf','saucisse'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/lasagna-recipe',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Lasanga_3.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  1,  'grand, pour sauce'),
    (v_recipe_id, 'céleri',                     2,   'branche',    true,  2,  NULL),
    (v_recipe_id, 'carottes',                   2,   'unité',      true,  3,  'moyennes'),
    (v_recipe_id, 'ail',                        5,   'gousse',     true,  4,  'émincé'),
    (v_recipe_id, 'tomates concassées',         800, 'g',          true,  5,  'San Marzano, 28 oz'),
    (v_recipe_id, 'origan séché',               2,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'basilic séché',              1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'saucisse épicée',            454, 'g',          true,  8,  'hot Italian sausage'),
    (v_recipe_id, 'poivre noir',                1.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'bœuf haché 15%',             454, 'g',          true,  10, '85% lean'),
    (v_recipe_id, 'basilic frais',              2,   'c. à soupe', true,  11, 'haché'),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  12, NULL),
    (v_recipe_id, 'bouillon de bœuf',           240, 'ml',         true,  13, NULL),
    (v_recipe_id, 'bouillon corse et vinaigre balsamique',                  120, 'ml',         true,  14, NULL),
    (v_recipe_id, 'concentré de tomate',        2,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'parmesan râpé',              100, 'g',          true,  16, '+ croûte pour la sauce'),
    (v_recipe_id, 'flocons de piment',          0.5, 'c. à café',  true,  17, NULL),
    (v_recipe_id, 'beurre doux',                70,  'g',          true,  18, 'béchamel'),
    (v_recipe_id, 'farine',                     70,  'g',          true,  19, 'béchamel'),
    (v_recipe_id, 'lait entier',                1.2, 'litre',      true,  20, '5 cups'),
    (v_recipe_id, 'parmesan râpé',              100, 'g',          true,  21, 'pour béchamel'),
    (v_recipe_id, 'muscade',                    0.75, 'c. à café', true,  22, NULL),
    (v_recipe_id, 'ail en poudre',              0.5, 'c. à soupe', true,  23, 'béchamel'),
    (v_recipe_id, 'œuf',                        3,   'unité',      true,  24, 'pour la pâte'),
    (v_recipe_id, 'farine',                     250, 'g',          true,  25, '2 cups pour la pâte'),
    (v_recipe_id, 'sel',                        0.5, 'c. à café',  true,  26, 'pour la pâte'),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  27, 'pour la pâte');

  -- =====================================================================
  -- 14. Fried Chicken (Joemustgoon)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Fried Chicken (Joemustgoon)',
    'Poulet frit ultra croustillant avec double trempage : poulet salé en dry-brine, panure sèche puis liquide pétillante au club soda, finition dans la panure sèche. Cuisson à 175°C jusqu''à 75°C interne.',
    $instr$["Saler le poulet (cuisses, ailes, pilons) et réfrigérer à découvert 1 à 12h pour dry-brine.",
"Mélanger les ingrédients secs : farine, maïzena, tapioca, sel, poivre, Kashmiri, ail, oignon, moutarde, chili, origan.",
"Mélanger les ingrédients liquides : club soda, farine, œuf, sel, poivre, Kashmiri, ail, oignon, moutarde, chili.",
"Enrober le poulet dans la panure sèche, secouer pour enlever l'excès.",
"Tremper dans la panure liquide, puis ramener dans la panure sèche.",
"Chauffer l'huile à 188°C (370-375°F).",
"Maintenir 175°C (350°F) pendant la cuisson : ailes et pilons ~10 min, hauts de cuisse 12-14 min, jusqu'à 75°C (165°F) interne.",
"Égoutter sur grille. Servir chaud."]
$instr$,
    60, 15, 4, 3,
    'Américaine', 'dinner',
    ARRAY['américain','poulet','frit','croustillant','dry-brine','club soda'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/fried-chicken-recipe',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Screen_Shot_2024-06-06_at_9.39.12_AM_480x480.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  2,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'ailes de poulet',            2,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'pilons de poulet',           2,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'sel',                        2,   'c. à soupe', true,  4,  'pour dry-brine'),
    (v_recipe_id, 'huile neutre',               2,   'litre',      true,  5,  'pour friture'),
    (v_recipe_id, 'farine',                     375, 'g',          true,  6,  '3 cups, panure sèche'),
    (v_recipe_id, 'maïzena',                    125, 'g',          true,  7,  'panure sèche'),
    (v_recipe_id, 'farine de tapioca',          60,  'g',          false, 8,  'optionnel'),
    (v_recipe_id, 'sel',                        2,   'c. à café',  true,  9,  'panure sèche'),
    (v_recipe_id, 'poivre noir',                2,   'c. à café',  true,  10, 'panure sèche'),
    (v_recipe_id, 'Kashmiri chili powder',      2.5, 'c. à soupe', true,  11, 'panure sèche'),
    (v_recipe_id, 'ail en poudre',              3,   'c. à soupe', true,  12, 'panure sèche'),
    (v_recipe_id, 'oignon en poudre',           1,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'moutarde en poudre',         0.5, 'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'chili powder',               0.5, 'c. à soupe', true,  15, 'panure sèche'),
    (v_recipe_id, 'origan séché',               0.5, 'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'club soda',                  600, 'ml',         true,  17, 'eau pétillante'),
    (v_recipe_id, 'farine',                     125, 'g',          true,  18, '1 cup, panure liquide'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  19, 'panure liquide'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  20, 'panure liquide'),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  21, 'panure liquide'),
    (v_recipe_id, 'Kashmiri chili powder',      1,   'c. à soupe', true,  22, 'panure liquide'),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  23, 'panure liquide'),
    (v_recipe_id, 'oignon en poudre',           0.5, 'c. à soupe', true,  24, 'panure liquide'),
    (v_recipe_id, 'moutarde en poudre',         1,   'c. à café',  true,  25, 'panure liquide'),
    (v_recipe_id, 'chili powder',               1,   'c. à café',  true,  26, 'panure liquide');

  -- =====================================================================
  -- 15. Massaman Curry
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Massaman Curry',
    'Curry fusion thaï-indien onctueux et parfumé : bœuf tendre, pommes de terre et carottes mijotés dans pâte de curry rouge, lait de coco, cacahuètes, coriandre/cumin moulus, cardamome et feuilles de curry.',
    $instr$["Saisir le bœuf tranché fin à l'huile de coco, retirer.",
"Suer l'échalote, ajouter pomme de terre et carotte. Cuire 3-4 min.",
"Ajouter coriandre, cumin, cannelle, miel et cassonade.",
"Ajouter gingembre, feuilles de curry et cardamome écrasée. Cuire 1 min.",
"Incorporer beurre de cacahuète et pâte de curry rouge thaï. Cuire 1-2 min.",
"Ajouter sauce soja, lait de coco et eau. Mijoter 8-10 min jusqu'à pomme de terre tendre.",
"Remettre le bœuf, finir avec jus de citron vert.",
"Garnir de cacahuètes concassées et coriandre. Servir avec riz."]
$instr$,
    15, 35, 4, 3,
    'Thaïlandaise', 'dinner',
    ARRAY['thaïlandais','indien','fusion','curry','bœuf','lait de coco','massaman','one pot'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/massaman-curry-recipe',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/P1100311_37c1e492-f1bb-4b5b-a2b9-32922831d2a6_480x480.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf à mijoter',             454, 'g',          true,  1,  'tranché fin'),
    (v_recipe_id, 'huile de coco',              1,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  3,  'grosse'),
    (v_recipe_id, 'pomme de terre',             1,   'unité',      true,  4,  'grosse, en dés ~1 tasse'),
    (v_recipe_id, 'carottes',                   2,   'unité',      true,  5,  'moyennes'),
    (v_recipe_id, 'coriandre moulue',           1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'cumin moulu',                1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'cannelle moulue',            0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'miel',                       0.5, 'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'cassonade',                  1.5, 'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'gingembre',                  1.5, 'cm',         true,  11, 'émincé'),
    (v_recipe_id, 'feuilles de curry',          3,   'unité',      true,  12, NULL),
    (v_recipe_id, 'cardamome',                  3,   'gousse',     true,  13, 'écrasées'),
    (v_recipe_id, 'beurre de cacahuète',        1,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'pâte de curry rouge',        2.5, 'c. à soupe', true,  15, 'thaï'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  17, '1 boîte'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  18, '1 cup'),
    (v_recipe_id, 'citron vert',                0.5, 'unité',      true,  19, 'jus seulement'),
    (v_recipe_id, 'cacahuètes concassées',      30,  'g',          false, 20, 'garniture'),
    (v_recipe_id, 'coriandre fraîche',          10,  'g',          false, 21, 'garniture');

  -- =====================================================================
  -- 16. Double Bacon Smash Cheeseburger
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Double Bacon Smash Cheeseburger',
    'Smash burger double bacon : steak haché 80/20 mariné à l''ail/paprika/Worcestershire/soja, écrasé à plat, double cheddar fondu, oignons caramélisés et bacon croustillant sur pain brioché beurré. Sauce burger à la mayo-sriracha.',
    $instr$["Mariner le bœuf avec œuf, ail, paprika, Worcestershire, soja, sel.",
"Former en boules golf et réfrigérer 30 min à 2h.",
"Sauce burger : fouetter mayo, jus de pickle, moutarde, sriracha, Worcestershire, soja, jus de citron et sel.",
"Caraméliser les oignons : poêle à feu doux avec huile et sel, 30 min jusqu'à dorés.",
"Ajouter le sherry et continuer 45-60 min de plus jusqu'à confit.",
"Cuire le bacon au four à 190°C (375°F) pendant 15-20 min.",
"Beurrer et toaster les buns brioché.",
"Sortir les boules de bœuf, smash en patties sur poêle chaude moyen-vif.",
"Saler/poivrer un côté et appliquer sauce burger.",
"Retourner à 2 min ou croûte dorée. Ajouter cheddar, couvrir 30 sec à 1 min jusqu'à fonte.",
"Empiler les double patties. Monter : bun bas, sauce, patties, bacon, oignons caramélisés, salade, sauce, bun haut."]
$instr$,
    30, 60, 3, 3,
    'Américaine', 'dinner',
    ARRAY['américain','burger','smash','bacon','cheddar','brioché','oignons caramélisés'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/double-bacon-smash-cheeseburger-recipe',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/IMG_37546ECDABBF-1_480x480.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché 20%',             680, 'g',          true,  1,  '80/20'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'ail en poudre',              1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'paprika',                    1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'sauce Worcestershire',       0.5, 'c. à soupe', true,  5,  'pour marinade'),
    (v_recipe_id, 'sauce soja',                 0.5, 'c. à soupe', true,  6,  'pour marinade'),
    (v_recipe_id, 'sel casher',                 0.75, 'c. à soupe',true,  7,  NULL),
    (v_recipe_id, 'mayonnaise',                 4,   'c. à soupe', true,  8,  'pour sauce burger'),
    (v_recipe_id, 'jus de cornichon',           0.5, 'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'moutarde',                   0.75, 'c. à soupe',true,  10, NULL),
    (v_recipe_id, 'sriracha',                   1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'sauce Worcestershire',       0.5, 'c. à soupe', true,  12, 'pour sauce'),
    (v_recipe_id, 'sauce soja claire',          1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'citron',                     0.25, 'unité',     true,  14, 'jus seulement'),
    (v_recipe_id, 'oignon blanc',               2,   'unité',      true,  15, 'grand, pour caramélisation'),
    (v_recipe_id, 'huile neutre',               2,   'c. à soupe', true,  16, 'pour oignons'),
    (v_recipe_id, 'bouillon et vinaigre de cidre',                     0.5, 'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'beef bacon',                      350, 'g',          true,  18, 'un paquet'),
    (v_recipe_id, 'cheddar',                    6,   'tranche',    true,  19, NULL),
    (v_recipe_id, 'pain brioché',               3,   'unité',      true,  20, 'buns'),
    (v_recipe_id, 'beurre doux',                30,  'g',          true,  21, 'pour les buns'),
    (v_recipe_id, 'laitue',                     2,   'feuille',    false, 22, 'garniture');

  -- =====================================================================
  -- 17. Chicken Tikka Masala (Joemustgoon)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Tikka Masala (Joemustgoon)',
    'Poulet tikka masala classique : hauts de cuisse marinés yaourt-épices, sauce tomate aromatique (cumin, garam masala, curcuma, kasoori methi) crémée et miellée.',
    $instr$["Marinade : écraser ail, gingembre et piment au mortier. Mélanger avec yaourt, garam masala, chili powder, cumin, poivre blanc, sel et jus de citron vert. Mariner toute une nuit.",
"Suer l'oignon dans l'huile jusqu'à presque brun.",
"Ajouter les tomates romaines en dés et cuire jusqu'à amollissement.",
"Incorporer ail, gingembre et piment. Cuire jusqu'à parfumé.",
"Baisser le feu, ajouter cumin, garam masala, curcuma et chili powder 1-2 min en évitant la brûlure.",
"Ajouter feuille de laurier puis concentré de tomate.",
"Verser la purée de tomate et mijoter 1 min.",
"Ajouter bouillon de poulet et cube. Mijoter 30-60 min jusqu'à épaississement.",
"Optionnel : mixer pour lisser.",
"Cuire le poulet mariné à 200°C (400°F) pendant 20 min jusqu'à 75°C interne.",
"Incorporer le poulet à la sauce avec crème et miel. Ajuster la crème pour la couleur.",
"Finir avec kasoori methi et coriandre. Servir avec riz basmati."]
$instr$,
    30, 60, 4, 3,
    'Indienne', 'dinner',
    ARRAY['indien','poulet','tikka masala','crémeux','épicé','yaourt'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/chicken-tikka-masala-recipe',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/IMG_9F6DDC27A671-1_480x480.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',  680, 'g',          true,  1,  'désossés sans peau'),
    (v_recipe_id, 'yaourt nature',              180, 'g',          true,  2,  'marinade'),
    (v_recipe_id, 'garam masala',               1,   'c. à soupe', true,  3,  'marinade'),
    (v_recipe_id, 'chili powder',               0.5, 'c. à soupe', true,  4,  'marinade'),
    (v_recipe_id, 'cumin',                      2,   'c. à café',  true,  5,  'marinade'),
    (v_recipe_id, 'poivre blanc',               2,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  7,  'marinade'),
    (v_recipe_id, 'gingembre',                  4,   'cm',         true,  8,  'marinade'),
    (v_recipe_id, 'citron vert',                1,   'unité',      true,  9,  'jus seulement'),
    (v_recipe_id, 'sel',                        2,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'oignon',                     1,   'unité',      true,  11, 'grand, pour sauce'),
    (v_recipe_id, 'tomates romaines',           2,   'unité',      true,  12, 'en dés'),
    (v_recipe_id, 'gingembre',                  4,   'cm',         true,  13, 'pour sauce'),
    (v_recipe_id, 'ail',                        5,   'gousse',     true,  14, 'pour sauce'),
    (v_recipe_id, 'piments verts',              2,   'unité',      true,  15, 'petits'),
    (v_recipe_id, 'concentré de tomate',        1,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'purée de tomate',            400, 'g',          true,  17, '1/2 boîte'),
    (v_recipe_id, 'bouillon de poulet',         480, 'ml',         true,  18, '2 cups'),
    (v_recipe_id, 'cube de bouillon de poulet', 0.5, 'unité',      true,  19, NULL),
    (v_recipe_id, 'cumin',                      2,   'c. à café',  true,  20, 'pour sauce'),
    (v_recipe_id, 'garam masala',               1,   'c. à soupe', true,  21, 'pour sauce'),
    (v_recipe_id, 'curcuma',                    2,   'c. à café',  true,  22, NULL),
    (v_recipe_id, 'chili powder',               0.5, 'c. à soupe', true,  23, 'pour sauce'),
    (v_recipe_id, 'crème liquide entière',      90,  'ml',         true,  24, '1/4-1/2 cup'),
    (v_recipe_id, 'miel',                       1,   'c. à soupe', true,  25, NULL),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  26, NULL),
    (v_recipe_id, 'feuille de laurier',         1,   'unité',      true,  27, NULL),
    (v_recipe_id, 'kasoori methi',              1,   'c. à soupe', true,  28, 'fenugrec séché'),
    (v_recipe_id, 'coriandre fraîche',          15,  'g',          false, 29, 'garniture');

  -- =====================================================================
  -- 18. Creamy Steak Bites
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Creamy Steak Bites',
    'Cubes de steak saisis sur purée de pommes de terre Yukon Gold infusées au beurre romarin-ail, nappés d''une sauce crémeuse aux tomates séchées, tomates cerises, parmesan et basilic.',
    $instr$["Couper les pommes de terre en cubes égaux. Mettre dans une casserole d'eau froide avec bouillon de poulet en poudre.",
"Bouillir jusqu'à fork-tender.",
"Séparément, fondre beurre avec lait, crème, ail et romarin. Mijoter et laisser infuser 20+ min.",
"Égoutter les pommes de terre, écraser à la consistance lisse. Incorporer le liquide infusé progressivement à la consistance souhaitée. Optionnel : beurre et ciboulette au-dessus.",
"Cuber le steak, assaisonner sel et poivre. Réfrigérer à découvert 30+ min.",
"Chauffer une poêle huilée à feu moyen-vif. Saisir les cubes en couche unique jusqu'à croûte profonde.",
"Retourner et cuire à votre goût. Retirer et réserver, garder les sucs.",
"Sauce : ajouter sucs de steak (et un peu d'huile de tomates séchées au besoin) à feu moyen.",
"Suer l'échalote 3-4 min.",
"Ajouter tomates séchées et cerises, cuire 5-6 min jusqu'à jammy.",
"Ajouter ail et basilic 30 sec.",
"Verser bouillon de bœuf, gratter les sucs et mijoter 4-5 min.",
"Baisser, ajouter crème et mijoter 3-4 min.",
"Hors du feu, incorporer parmesan jusqu'à lisse. Ajouter Italian seasoning, origan, paprika, sucre, sel et poivre. Mijoter 1-2 min.",
"Finir au beurre. Dresser sur purée, déposer les steak bites et napper de sauce. Garnir de ciboulette."]
$instr$,
    30, 60, 4, 3,
    'Américaine', 'dinner',
    ARRAY['américain','steak','crémeux','tomates séchées','purée','parmesan','one pan'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/creamy-steak-bites',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Screenshot_2026-04-21_at_2.38.33_PM.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'steak',                      680, 'g',          true,  1,  'en cubes (ribeye ou bavette)'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  2,  'pour steak'),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  3,  'pour steak'),
    (v_recipe_id, 'pommes de terre Yukon Gold', 5,   'unité',      true,  4,  NULL),
    (v_recipe_id, 'bouillon de poulet en poudre',0.5, 'c. à soupe',true,  5,  NULL),
    (v_recipe_id, 'lait entier',                240, 'ml',         true,  6,  NULL),
    (v_recipe_id, 'crème liquide entière',      240, 'ml',         true,  7,  'pour la purée'),
    (v_recipe_id, 'beurre doux',                113, 'g',          true,  8,  'pour la purée'),
    (v_recipe_id, 'ail',                        5,   'gousse',     true,  9,  'pour la purée'),
    (v_recipe_id, 'romarin frais',              2,   'branche',    true,  10, NULL),
    (v_recipe_id, 'échalote',                   2,   'unité',      true,  11, 'pour la sauce'),
    (v_recipe_id, 'ail',                        5,   'gousse',     true,  12, 'émincé, pour la sauce'),
    (v_recipe_id, 'basilic frais',              5,   'feuille',    true,  13, NULL),
    (v_recipe_id, 'tomates séchées',            3,   'unité',      true,  14, 'grossièrement hachées'),
    (v_recipe_id, 'tomates cerises',            8,   'unité',      true,  15, 'coupées en deux'),
    (v_recipe_id, 'bouillon de bœuf',           480, 'ml',         true,  16, '2 cups'),
    (v_recipe_id, 'crème liquide entière',      120, 'ml',         true,  17, 'pour la sauce'),
    (v_recipe_id, 'parmesan râpé',              100, 'g',          true,  18, 'frais'),
    (v_recipe_id, 'Italian seasoning',          1.5, 'c. à café',  true,  19, NULL),
    (v_recipe_id, 'origan séché',               1.5, 'c. à café',  true,  20, NULL),
    (v_recipe_id, 'paprika',                    2,   'c. à café',  true,  21, NULL),
    (v_recipe_id, 'beurre doux',                2,   'c. à soupe', true,  22, 'pour la sauce'),
    (v_recipe_id, 'sucre',                      1,   'pincée',     true,  23, NULL),
    (v_recipe_id, 'ciboulette',                 1,   'c. à soupe', false, 24, 'garniture');

END $$;
