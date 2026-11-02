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
    'Filets de saumon saisis à la poêle et nappés d''une sauce crémeuse à l''ail, au citron et aux herbes (basilic, persil). Prêt en moins de 30 minutes.',
    $instr$["Déposer les filets de saumon dans une assiette, les arroser d'huile d'olive et les assaisonner d'herbes italiennes, de sel, d'ail en poudre, d'origan, de poivre noir et de flocons de piment.",
"Chauffer une poêle huilée à feu moyen-vif et saisir le saumon 3 minutes par face, jusqu'à ce qu'il soit doré. Baisser le feu pour finir la cuisson à cœur, puis le retirer.",
"Dans la même poêle, à feu moyen, faire fondre le beurre avec l'ail émincé 1-2 minutes.",
"Ajouter la crème, le bouillon de poulet et le jus de citron. Laisser frémir 2-3 minutes.",
"Incorporer en fouettant le cream cheese et le parmesan jusqu'à ce que la sauce épaississe. Saler et poivrer.",
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
    (v_recipe_id, 'filets de saumon',            4,    'unité',      true, 1,  'sans peau'),
    (v_recipe_id, 'huile d''olive',              2,    'c. à soupe', true, 2,  NULL),
    (v_recipe_id, 'herbes italiennes',           2,    'c. à café',  true, 3,  NULL),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 4,  NULL),
    (v_recipe_id, 'ail en poudre',               1,    'c. à café',  true, 5,  NULL),
    (v_recipe_id, 'origan séché',                0.5,  'c. à café',  true, 6,  NULL),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 7,  NULL),
    (v_recipe_id, 'flocons de piment',           0.5,  'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'beurre doux',                 3,    'c. à soupe', true, 9,  'pour la sauce'),
    (v_recipe_id, 'ail',                         0.5,  'c. à soupe', true, 10, 'émincé'),
    (v_recipe_id, 'crème liquide entière',       240,  'ml',         true, 11, NULL),
    (v_recipe_id, 'bouillon de poulet',          120,  'ml',         true, 12, NULL),
    (v_recipe_id, 'jus de citron',               1,    'c. à café',  true, 13, NULL),
    (v_recipe_id, 'cream cheese',                2,    'c. à soupe', true, 14, 'à température ambiante'),
    (v_recipe_id, 'parmesan',                    60,   'g',          true, 15, 'râpé'),
    (v_recipe_id, 'persil frais',                1,    'c. à soupe', true, 16, 'haché'),
    (v_recipe_id, 'basilic frais',               2,    'c. à soupe', true, 17, 'ciselé');

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
    'California roll déconstruit en gratin : riz à sushi vinaigré, nori et garniture crémeuse au crabe et aux crevettes, gratiné au four puis garni de mayonnaise épicée, de sauce unagi, d''avocat et de graines de sésame.',
    $instr$["Rincer le riz à sushi jusqu'à ce que l'eau soit claire (le laisser tremper 15 minutes si on le souhaite).",
"Porter 720 ml d'eau salée à ébullition. Ajouter le riz, baisser le feu, couvrir et laisser frémir 20 minutes. Éteindre le feu et laisser reposer 10 minutes à couvert, puis égrener.",
"Mélanger le vinaigre de riz, le sucre et l'huile de sésame dans un bol et chauffer 30 secondes au micro-ondes. Incorporer uniformément au riz.",
"Mayonnaise épicée : fouetter la mayonnaise, le sambal, la sriracha, l'huile de sésame, le sucre et le jus de citron. Réserver.",
"Garniture : mélanger le crabe, les crevettes hachées, la mayonnaise, le cream cheese, la sauce soja, l'huile de sésame, un trait de sambal ou de sriracha et le jus de citron vert jusqu'à obtenir un mélange homogène.",
"Préchauffer le four à 220°C.",
"Étaler le riz dans un plat de 23 × 23 cm. Couvrir d'une couche de nori, puis de la garniture au crabe et aux crevettes.",
"Enfourner 10-15 minutes, jusqu'à ce que le dessus soit doré. Facultatif : passer 1-2 minutes sous le gril pour plus de croustillant.",
"Garnir de mayonnaise épicée, de sauce unagi, d'avocat, de concombre, d'oignons nouveaux et de graines de sésame. Servir immédiatement."]
$instr$,
    30, 45, 6, 3,
    'Japonaise', 'dinner',
    ARRAY['japonais','sushi','gratin','crabe','crevettes','fusion'],
    'manual',
    'https://moribyan.com/sushi-bake/',
    'https://moribyan.com/wp-content/uploads/2022/03/sushi-bake-3-scaled-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'mayonnaise',                  120,  'ml',         true, 1,  'pour la mayonnaise épicée'),
    (v_recipe_id, 'sambal',                      1,    'c. à soupe', true, 2,  '+ un trait pour la garniture'),
    (v_recipe_id, 'sriracha',                    1,    'c. à soupe', true, 3,  NULL),
    (v_recipe_id, 'huile de sésame',             0.25, 'c. à café',  true, 4,  'pour la mayonnaise'),
    (v_recipe_id, 'sucre',                       0.5,  'c. à café',  true, 5,  'pour la mayonnaise'),
    (v_recipe_id, 'jus de citron',               1,    'c. à café',  true, 6,  'pour la mayonnaise'),
    (v_recipe_id, 'chair de crabe',              230,  'g',          true, 7,  NULL),
    (v_recipe_id, 'crevettes',                   230,  'g',          true, 8,  'décortiquées, finement hachées'),
    (v_recipe_id, 'mayonnaise',                  60,   'ml',         true, 9,  'pour la garniture'),
    (v_recipe_id, 'cream cheese',                60,   'g',          true, 10, 'à température ambiante'),
    (v_recipe_id, 'sauce soja',                  1.5,  'c. à soupe', true, 11, NULL),
    (v_recipe_id, 'huile de sésame',             1,    'c. à café',  true, 12, 'pour la garniture'),
    (v_recipe_id, 'jus de citron vert',          1,    'c. à soupe', true, 13, NULL),
    (v_recipe_id, 'riz à sushi',                 400,  'g',          true, 14, 'rincé'),
    (v_recipe_id, 'eau',                         720,  'ml',         true, 15, 'pour le riz'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 16, NULL),
    (v_recipe_id, 'vinaigre de riz',             60,   'ml',         true, 17, NULL),
    (v_recipe_id, 'sucre',                       2,    'c. à soupe', true, 18, 'pour le riz vinaigré'),
    (v_recipe_id, 'huile de sésame',             1,    'c. à café',  true, 19, 'pour le riz'),
    (v_recipe_id, 'nori',                        4,    'feuille',    true, 20, NULL),
    (v_recipe_id, 'oignons nouveaux',            25,   'g',          false, 21, 'émincés, pour garnir'),
    (v_recipe_id, 'concombre',                   1,    'unité',      false, 22, 'tranché, pour garnir'),
    (v_recipe_id, 'avocat',                      1,    'unité',      false, 23, 'tranché, pour garnir'),
    (v_recipe_id, 'graines de sésame',           1,    'c. à soupe', false, 24, NULL),
    (v_recipe_id, 'sauce unagi',                 2,    'c. à soupe', false, 25, NULL);

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
    'Escalopes de poulet marinées dans une sauce peri peri maison (poivron rouge, piments oiseau, ail, vinaigre, paprika, romarin, persil) : épicée, acidulée et bien aillée, comme chez Nando''s.',
    $instr$["Sauce : mixer le poivron, les piments, l'ail, le vinaigre, l'huile, l'origan, le paprika, le romarin, le sel, le sucre, le persil et le jus de citron jusqu'à obtenir une purée.",
"Transférer dans une casserole avec les feuilles de laurier et laisser mijoter 20 minutes.",
"Laisser refroidir 10 minutes, retirer le laurier et mixer de nouveau jusqu'à obtenir une sauce lisse. Pour une sauce plus crémeuse, ajouter la mayonnaise (facultatif).",
"Couper les blancs de poulet en deux dans l'épaisseur pour obtenir 8 escalopes fines.",
"Faire mariner les escalopes dans une partie de la sauce (cuisson immédiate possible, ou marinade plus longue au réfrigérateur).",
"Chauffer une poêle à feu moyen-vif. Ajouter l'huile et le poulet en espaçant les morceaux.",
"Saisir 3 minutes par face, puis baisser le feu et cuire encore 1-2 minutes, jusqu'à 75°C à cœur.",
"Servir avec le reste de la sauce."]
$instr$,
    30, 35, 4, 2,
    'Portugaise', 'dinner',
    ARRAY['poulet','peri peri','épicé','africain','portugais','marinade','grillade'],
    'manual',
    'https://moribyan.com/nandos-peri-peri-chicken/',
    'https://moribyan.com/wp-content/uploads/2022/05/IMG_6034-scaled-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poivron rouge',               1,    'unité',      true, 1,  'épépiné'),
    (v_recipe_id, 'piments oiseau',              5,    'unité',      true, 2,  'type African Bird''s Eye ou thaï, selon le piquant'),
    (v_recipe_id, 'ail',                         8,    'gousse',     true, 3,  NULL),
    (v_recipe_id, 'vinaigre blanc',              60,   'ml',         true, 4,  NULL),
    (v_recipe_id, 'huile d''olive',              60,   'ml',         true, 5,  'pour la sauce'),
    (v_recipe_id, 'origan séché',                2,    'c. à café',  true, 6,  NULL),
    (v_recipe_id, 'paprika',                     2,    'c. à café',  true, 7,  NULL),
    (v_recipe_id, 'romarin séché',               2,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 9,  NULL),
    (v_recipe_id, 'sucre',                       0.5,  'c. à café',  true, 10, NULL),
    (v_recipe_id, 'persil frais',                15,   'g',          true, 11, 'une poignée'),
    (v_recipe_id, 'citron',                      0.5,  'unité',      true, 12, 'jus'),
    (v_recipe_id, 'laurier',                     2,    'feuille',    true, 13, NULL),
    (v_recipe_id, 'mayonnaise',                  60,   'ml',         false, 14, 'facultatif, pour une sauce crémeuse'),
    (v_recipe_id, 'blancs de poulet',            4,    'unité',      true, 15, 'gros, coupés en escalopes'),
    (v_recipe_id, 'huile d''olive',              2,    'c. à soupe', true, 16, 'pour la cuisson');

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
    'Hommage aux food trucks halal de New York : poulet shawarma épicé, riz basmati jaune au curcuma, sauce blanche au toum et garnitures (laitue, tomates, pita).',
    $instr$["Sauce blanche : fouetter la mayonnaise, le toum, la crème aigre, le poivre, le jus de citron, le sucre et l'eau jusqu'à obtenir une sauce lisse. Réserver.",
"Poulet shawarma : mélanger les hauts de cuisse avec l'huile, le jus des citrons, l'ail, le piment de la Jamaïque, la coriandre, le paprika, le cumin, le sumac, le poivre, le curcuma et le sel.",
"Laisser mariner au moins 30 minutes (ou toute une nuit).",
"Chauffer une poêle en fonte à feu vif avec un filet d'huile. Cuire le poulet 4 minutes par face jusqu'à ce qu'il soit bien coloré, puis baisser le feu, couvrir et finir la cuisson à cœur.",
"Hacher le poulet en petits morceaux. Facultatif : le remettre quelques minutes dans la poêle pour intensifier la saveur.",
"Riz : rincer le basmati 2 minutes à l'eau tiède jusqu'à ce que l'eau soit claire (ou le faire tremper 30 minutes, puis l'égoutter).",
"Faire fondre le ghee dans une casserole à feu moyen et y faire revenir le riz 3 minutes.",
"Ajouter le bouillon, le curcuma, l'origan, le cumin, le sel et le laurier. Porter à ébullition, baisser le feu, couvrir et cuire 11-12 minutes. Éteindre le feu et laisser reposer 5 minutes à couvert.",
"Égrener le riz à la fourchette et retirer le laurier.",
"Servir : riz, poulet, tomates, laitue, pita, une généreuse portion de sauce blanche et de la sauce piquante."]
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
    (v_recipe_id, 'riz basmati',                 400,  'g',          true, 1,  NULL),
    (v_recipe_id, 'bouillon de poulet',          720,  'ml',         true, 2,  NULL),
    (v_recipe_id, 'ghee',                        2,    'c. à soupe', true, 3,  'ou beurre doux'),
    (v_recipe_id, 'curcuma',                     0.75, 'c. à café',  true, 4,  'pour le riz et le poulet'),
    (v_recipe_id, 'origan séché',                0.5,  'c. à café',  true, 5,  NULL),
    (v_recipe_id, 'cumin',                       0.5,  'c. à café',  true, 6,  'moulu, pour le riz'),
    (v_recipe_id, 'sel',                         2.5,  'c. à café',  true, 7,  'pour le riz et le poulet'),
    (v_recipe_id, 'laurier',                     1,    'feuille',    true, 8,  NULL),
    (v_recipe_id, 'hauts de cuisse de poulet',   907,  'g',          true, 9,  'désossés, sans peau'),
    (v_recipe_id, 'huile d''olive',              60,   'ml',         true, 10, 'pour la marinade et la cuisson'),
    (v_recipe_id, 'citron',                      2,    'unité',      true, 11, 'jus, pour la marinade'),
    (v_recipe_id, 'ail',                         1,    'c. à soupe', true, 12, 'émincé'),
    (v_recipe_id, 'piment de la Jamaïque',       2,    'c. à soupe', true, 13, 'moulu'),
    (v_recipe_id, 'coriandre moulue',            1,    'c. à soupe', true, 14, NULL),
    (v_recipe_id, 'paprika',                     1,    'c. à soupe', true, 15, NULL),
    (v_recipe_id, 'cumin',                       1,    'c. à soupe', true, 16, 'moulu, pour le poulet'),
    (v_recipe_id, 'sumac',                       2,    'c. à café',  true, 17, NULL),
    (v_recipe_id, 'poivre noir',                 1,    'c. à café',  true, 18, 'pour le poulet et la sauce'),
    (v_recipe_id, 'mayonnaise',                  120,  'ml',         true, 19, 'pour la sauce blanche'),
    (v_recipe_id, 'toum',                        60,   'ml',         true, 20, 'crème d''ail libanaise'),
    (v_recipe_id, 'crème aigre',                 2,    'c. à soupe', true, 21, NULL),
    (v_recipe_id, 'jus de citron',               1,    'c. à café',  true, 22, 'pour la sauce'),
    (v_recipe_id, 'sucre',                       0.5,  'c. à café',  true, 23, 'pour la sauce'),
    (v_recipe_id, 'eau',                         2,    'c. à soupe', true, 24, 'pour détendre la sauce'),
    (v_recipe_id, 'laitue iceberg',              0.5,  'unité',      true, 25, 'émincée'),
    (v_recipe_id, 'tomates',                     2,    'unité',      true, 26, 'en dés'),
    (v_recipe_id, 'pain pita',                   4,    'unité',      true, 27, 'coupé en morceaux'),
    (v_recipe_id, 'sauce piquante',              1,    'c. à soupe', false, 28, 'type sriracha');

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
    'Mac & cheese fusion indo-américain : sauce butter chicken aux noix de cajou, sauce Mornay à quatre fromages (mozzarella, gouda, cheddar, parmesan), poulet tikka effiloché et cavatelli gratinés au panko beurré.',
    $instr$["Marinade : écraser l'ail, le gingembre et le piment au mortier. Mélanger avec les hauts de cuisse, le yaourt grec, le beurre fondu, le sel, le curcuma, le piment du Cachemire, le garam masala et le jus de citron vert. Laisser mariner au moins 30 minutes.",
"Préchauffer le four à 200°C. Étaler le poulet et sa marinade sur une plaque et enfourner 20-25 minutes, jusqu'à 75°C à cœur.",
"Laisser tiédir, effilocher le poulet et le mélanger avec son jus de cuisson.",
"Sauce butter chicken : mixer les noix de cajou avec 120 ml d'eau. Réserver.",
"Faire fondre le ghee à feu moyen, faire suer l'oignon 2-3 minutes, puis ajouter l'ail et cuire 1 minute.",
"Baisser le feu, ajouter le garam masala, le piment du Cachemire, le cumin et le curcuma, et cuire 1-2 minutes.",
"Ajouter le concentré de tomate et cuire 3 minutes.",
"Verser la purée de tomate avec une pincée de sel et laisser mijoter 5 minutes.",
"Incorporer la crème de cajou, la crème et le miel. Finir avec le fenugrec, la coriandre, un filet de jus de citron vert et du sel.",
"Sauce au fromage : râper tous les fromages et les diviser en deux.",
"À feu moyen-doux, faire fondre le beurre avec l'ail en poudre, l'oignon en poudre, le piment du Cachemire et le sel pendant 2 minutes.",
"Ajouter la farine et fouetter 3-4 minutes, jusqu'à obtenir un roux blond.",
"Incorporer la crème en deux fois, puis le lait en deux fois. Laisser mijoter 2-3 minutes.",
"Hors du feu, incorporer progressivement la moitié du fromage râpé, poignée par poignée, en fouettant entre chaque ajout.",
"Préchauffer le four à 190°C. Mélanger le panko avec le beurre fondu.",
"Cuire les cavatelli al dente, puis les égoutter en réservant un peu d'eau de cuisson.",
"Mélanger les pâtes, la sauce butter chicken, le poulet effiloché et la sauce au fromage (détendre avec un peu d'eau de cuisson si c'est trop épais). Goûter et ajuster le sel et le jus de citron vert.",
"Dans un plat de 23 × 33 cm, alterner : la moitié des pâtes, la moitié du fromage restant, le reste des pâtes, puis le reste du fromage.",
"Couvrir de panko beurré et enfourner 20-25 minutes, jusqu'à ce que le dessus soit doré. Garnir de coriandre."]
$instr$,
    60, 70, 6, 4,
    'Indienne', 'dinner',
    ARRAY['indien','américain','fusion','mac and cheese','butter chicken','gratin','pâtes'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/updated-2025-butter-chicken-mac-cheese',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Cover_Photo_57d14d85-0425-4d41-aa6d-3647880e1fb7.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',   4,    'unité',      true, 1,  'désossés, sans peau'),
    (v_recipe_id, 'ail',                         9,    'gousse',     true, 2,  'pour la marinade'),
    (v_recipe_id, 'gingembre',                   2.5,  'cm',         true, 3,  'frais'),
    (v_recipe_id, 'piment vert',                 1,    'unité',      true, 4,  'petit'),
    (v_recipe_id, 'yaourt grec',                 180,  'g',          true, 5,  'entier'),
    (v_recipe_id, 'beurre doux',                 1.5,  'c. à soupe', true, 6,  'fondu, pour la marinade'),
    (v_recipe_id, 'sel',                         0.5,  'c. à soupe', true, 7,  'pour la marinade'),
    (v_recipe_id, 'curcuma',                     1,    'c. à café',  true, 8,  'pour la marinade'),
    (v_recipe_id, 'piment du Cachemire en poudre', 2,    'c. à soupe', true, 9,  'pour la marinade'),
    (v_recipe_id, 'garam masala',                1,    'c. à soupe', true, 10, 'pour la marinade'),
    (v_recipe_id, 'citron vert',                 0.5,  'unité',      true, 11, 'jus, pour la marinade'),
    (v_recipe_id, 'ghee',                        4,    'c. à soupe', true, 12, 'ou beurre, pour la sauce'),
    (v_recipe_id, 'ail',                         5,    'gousse',     true, 13, 'émincé, pour la sauce'),
    (v_recipe_id, 'oignon',                      1,    'unité',      true, 14, 'petit, finement émincé'),
    (v_recipe_id, 'garam masala',                1.5,  'c. à café',  true, 15, 'pour la sauce'),
    (v_recipe_id, 'piment du Cachemire en poudre', 1.5,  'c. à café',  true, 16, 'pour la sauce'),
    (v_recipe_id, 'cumin',                       0.5,  'c. à café',  true, 17, 'moulu'),
    (v_recipe_id, 'curcuma',                     0.25, 'c. à café',  true, 18, 'pour la sauce'),
    (v_recipe_id, 'concentré de tomate',         1,    'c. à soupe', true, 19, NULL),
    (v_recipe_id, 'purée de tomate',             800,  'g',          true, 20, '1 boîte'),
    (v_recipe_id, 'noix de cajou',               2,    'c. à soupe', true, 21, NULL),
    (v_recipe_id, 'eau',                         120,  'ml',         true, 22, 'pour mixer les noix de cajou'),
    (v_recipe_id, 'miel',                        0.5,  'c. à soupe', true, 23, NULL),
    (v_recipe_id, 'crème liquide entière',       80,   'ml',         true, 24, 'pour la sauce butter chicken'),
    (v_recipe_id, 'feuilles de fenugrec séchées', 2,    'c. à soupe', true, 25, 'kasoori methi'),
    (v_recipe_id, 'coriandre fraîche',           0.5,  'botte',      true, 26, 'hachée, + un peu pour garnir'),
    (v_recipe_id, 'citron vert',                 0.5,  'unité',      true, 27, 'jus, pour assaisonner'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 28, 'pour les sauces, au goût'),
    (v_recipe_id, 'mozzarella',                  454,  'g',          true, 29, 'râpée'),
    (v_recipe_id, 'gouda',                       454,  'g',          true, 30, 'râpé'),
    (v_recipe_id, 'cheddar',                     454,  'g',          true, 31, 'râpé'),
    (v_recipe_id, 'parmesan',                    115,  'g',          true, 32, 'râpé'),
    (v_recipe_id, 'ail en poudre',               1,    'c. à café',  true, 33, NULL),
    (v_recipe_id, 'oignon en poudre',            1,    'c. à café',  true, 34, NULL),
    (v_recipe_id, 'piment du Cachemire en poudre', 1,    'c. à café',  true, 35, 'pour la sauce au fromage'),
    (v_recipe_id, 'beurre doux',                 5,    'c. à soupe', true, 36, 'pour la sauce au fromage'),
    (v_recipe_id, 'farine',                      5,    'c. à soupe', true, 37, NULL),
    (v_recipe_id, 'crème liquide entière',       480,  'ml',         true, 38, 'pour la sauce au fromage'),
    (v_recipe_id, 'lait entier',                 720,  'ml',         true, 39, NULL),
    (v_recipe_id, 'cavatelli',                   454,  'g',          true, 40, 'ou autres pâtes courtes'),
    (v_recipe_id, 'panko',                       120,  'g',          true, 41, NULL),
    (v_recipe_id, 'beurre doux',                 4,    'c. à soupe', true, 42, 'fondu, pour le panko');

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
    'Riz frit réconfortant à la japonaise avec des cubes de bœuf fumé glacés à la sauce teriyaki maison (soja, bonite, kombu), œuf brouillé, carotte et oignons nouveaux.',
    $instr$["Sauce teriyaki : chauffer un peu d'huile et faire revenir l'ail écrasé et le gingembre jusqu'à ce qu'ils soient parfumés.",
"Ajouter le bouillon dashi et le faire réduire de moitié.",
"Verser la sauce soja, le vinaigre de riz, l'eau, le sucre, le miel et les oignons nouveaux. Laisser mijoter 3-4 minutes à feu moyen-doux.",
"Ajouter la bonite séchée et le kombu. Laisser mijoter 1 minute, puis filtrer au tamis fin et laisser refroidir.",
"Couper le bœuf fumé en cubes. Chauffer 1 c. à soupe d'huile dans une poêle à feu moyen.",
"Faire dorer le bœuf fumé jusqu'à ce qu'il soit croustillant.",
"Le glacer avec 3 c. à soupe de sauce teriyaki et cuire 1-2 minutes, jusqu'à ce qu'il soit brillant. Réserver.",
"Brouiller l'œuf et réserver.",
"Riz frit : ajouter un peu d'huile et augmenter le feu. Faire sauter l'oignon blanc, l'ail émincé, le blanc des oignons nouveaux et la carotte 2 minutes.",
"Ajouter le riz, casser les grumeaux et bien répartir les légumes.",
"Verser 5 c. à soupe de sauce teriyaki sur le pourtour de la poêle et faire sauter vigoureusement.",
"Incorporer l'œuf brouillé. Goûter et ajuster avec 2-3 c. à soupe de sauce teriyaki supplémentaires.",
"Finir avec l'huile de sésame, le sucre et le glutamate. Saler selon votre goût.",
"Incorporer le bœuf fumé glacé. Garnir du vert des oignons nouveaux et servir chaud."]
$instr$,
    20, 20, 4, 3,
    'Asiatique', 'dinner',
    ARRAY['asiatique','japonais','riz frit','bœuf fumé','teriyaki','réconfortant'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/sdfs',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Cover.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz',                         270,  'g',          true, 1,  'cru, cuit la veille (environ 800 g cuit)'),
    (v_recipe_id, 'oignon blanc',                1,    'unité',      true, 2,  'en dés'),
    (v_recipe_id, 'oignons nouveaux',            3,    'unité',      true, 3,  'blancs et verts séparés'),
    (v_recipe_id, 'carotte',                     1,    'unité',      true, 4,  'moyenne, en dés'),
    (v_recipe_id, 'œuf',                         1,    'unité',      true, 5,  NULL),
    (v_recipe_id, 'ail',                         4,    'gousse',     true, 6,  'émincé, pour le riz frit'),
    (v_recipe_id, 'huile de sésame',             1.5,  'c. à soupe', true, 7,  NULL),
    (v_recipe_id, 'sucre',                       0.5,  'c. à soupe', true, 8,  'pour le riz'),
    (v_recipe_id, 'glutamate monosodique',       1,    'c. à café',  false, 9,  'facultatif'),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 10, NULL),
    (v_recipe_id, 'huile neutre',                3,    'c. à soupe', true, 11, NULL),
    (v_recipe_id, 'bœuf fumé',                   340,  'g',          true, 12, 'en cubes'),
    (v_recipe_id, 'sauce soja',                  180,  'ml',         true, 13, 'pour la sauce teriyaki'),
    (v_recipe_id, 'ail',                         4,    'gousse',     true, 14, 'écrasé, pour la sauce teriyaki'),
    (v_recipe_id, 'gingembre',                   1.5,  'cm',         true, 15, 'écrasé'),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      true, 16, 'pour la sauce teriyaki'),
    (v_recipe_id, 'bouillon dashi',              2,    'c. à soupe', true, 17, NULL),
    (v_recipe_id, 'vinaigre de riz',             35,   'ml',         true, 18, 'pour la sauce teriyaki'),
    (v_recipe_id, 'sucre',                       2,    'c. à café',  true, 19, 'pour la sauce teriyaki, avec le vinaigre de riz'),
    (v_recipe_id, 'eau',                         35,   'ml',         true, 20, 'pour la sauce teriyaki'),
    (v_recipe_id, 'sucre',                       4.5,  'c. à soupe', true, 21, 'pour la sauce teriyaki'),
    (v_recipe_id, 'miel',                        1,    'c. à soupe', true, 22, NULL),
    (v_recipe_id, 'bonite séchée',               2,    'c. à soupe', true, 23, 'katsuobushi'),
    (v_recipe_id, 'kombu',                       1,    'unité',      true, 24, 'petite bande');

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
    'Sandwich grillé fusion coréen-américain : faux-filet mariné façon bulgogi (poire, soja, sésame, miel), mozzarella et cheddar sur pain au levain tartiné de mayonnaise aux herbes.',
    $instr$["Marinade : mixer l'ail, le gingembre, la poire, les oignons nouveaux, l'oignon jaune, la sauce soja claire, la sauce soja foncée, l'huile de sésame, le miel, le vinaigre de riz, le sucre, l'eau, la cassonade et le poivre jusqu'à obtenir un mélange lisse.",
"Ajouter le faux-filet finement émincé et l'oignon émincé. Laisser mariner au moins 30 minutes (idéalement une nuit).",
"Cuire le bœuf à feu moyen-vif en 3-4 fois, environ 3-5 minutes par fournée.",
"Mayonnaise aux herbes : mélanger la mayonnaise, les oignons nouveaux émincés et le thym frais.",
"Tartiner les tranches de pain au levain de mayonnaise aux herbes.",
"À feu doux, poser une tranche de pain côté mayonnaise vers le bas. Superposer de la mozzarella, du cheddar, le bulgogi, le reste de mozzarella, puis l'autre tranche, côté mayonnaise vers le haut.",
"Retourner toutes les 2 minutes jusqu'à ce que le fromage soit fondu et la croûte dorée (12-16 minutes au total).",
"Laisser reposer 1-2 minutes sur une grille avant de couper."]
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
    (v_recipe_id, 'faux-filet',                  680,  'g',          true, 1,  'finement émincé'),
    (v_recipe_id, 'oignon',                      1,    'unité',      true, 2,  'petit, finement émincé'),
    (v_recipe_id, 'sauce soja claire',           60,   'ml',         true, 3,  NULL),
    (v_recipe_id, 'sauce soja foncée',           2,    'c. à soupe', true, 4,  NULL),
    (v_recipe_id, 'huile de sésame',             1,    'c. à soupe', true, 5,  NULL),
    (v_recipe_id, 'miel',                        1,    'c. à soupe', true, 6,  NULL),
    (v_recipe_id, 'vinaigre de riz',             25,   'ml',         true, 7,  'pour la marinade'),
    (v_recipe_id, 'sucre',                       1.5,  'c. à café',  true, 8,  'pour la marinade'),
    (v_recipe_id, 'eau',                         25,   'ml',         true, 9,  'pour la marinade'),
    (v_recipe_id, 'poire nashi',                 210,  'g',          true, 10, '1 fruit'),
    (v_recipe_id, 'oignons nouveaux',            2,    'unité',      true, 11, 'pour la marinade'),
    (v_recipe_id, 'oignon jaune',                0.5,  'unité',      true, 12, 'pour la marinade'),
    (v_recipe_id, 'cassonade',                   4,    'c. à soupe', true, 13, NULL),
    (v_recipe_id, 'ail',                         5,    'gousse',     true, 14, NULL),
    (v_recipe_id, 'gingembre',                   1,    'c. à café',  true, 15, 'râpé'),
    (v_recipe_id, 'poivre noir',                 0.125, 'c. à café',  true, 16, NULL),
    (v_recipe_id, 'mayonnaise',                  4,    'c. à soupe', true, 17, 'pour la mayonnaise aux herbes'),
    (v_recipe_id, 'oignons nouveaux',            1,    'c. à soupe', true, 18, 'émincés, pour la mayonnaise'),
    (v_recipe_id, 'thym frais',                  1.5,  'c. à café',  true, 19, 'émincé'),
    (v_recipe_id, 'pain au levain',              4,    'tranche',    true, 20, NULL),
    (v_recipe_id, 'mozzarella',                  120,  'g',          true, 21, 'râpée'),
    (v_recipe_id, 'cheddar',                     30,   'g',          true, 22, 'râpé');

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
    'Rigatoni nappés d''une sauce crémeuse tomates-épinards-parmesan, avec du poulet mariné aux herbes italiennes. Finition au beurre et à l''eau de cuisson des pâtes.',
    $instr$["Marinade : mélanger le blanc de poulet avec l'ail en poudre, l'oignon en poudre, les herbes italiennes, le poivre, le sel et l'huile d'olive. Réfrigérer 10 minutes.",
"Préparer les légumes : couper les tomates cerises en deux et l'oignon en dés, émincer l'ail et hacher les tomates séchées.",
"Saisir le poulet dans un filet d'huile jusqu'à ce qu'il soit cuit à cœur, puis réserver.",
"Faire suer l'oignon et les tomates cerises jusqu'à ce qu'ils ramollissent. Ajouter les tomates séchées et une cuillerée de leur huile.",
"Incorporer l'ail et l'origan, puis le concentré de tomate.",
"Déglacer avec le bouillon et le jus de citron, puis laisser réduire de moitié.",
"Baisser le feu, ajouter la crème, puis les épinards jusqu'à ce qu'ils tombent. Incorporer le basilic.",
"Hors du feu, incorporer le parmesan. Finir avec le jus du demi-citron.",
"Cuire les rigatoni dans de l'eau salée en les retirant juste avant qu'ils soient al dente, et réserver un peu d'eau de cuisson. Les mélanger avec la sauce, un peu d'eau de cuisson et le beurre.",
"Dresser et garnir de persil, de flocons de piment et de poivre noir concassé."]
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
    (v_recipe_id, 'blanc de poulet',             1,    'unité',      true, 1,  'finement tranché'),
    (v_recipe_id, 'ail en poudre',               1,    'c. à soupe', true, 2,  NULL),
    (v_recipe_id, 'oignon en poudre',            0.5,  'c. à soupe', true, 3,  NULL),
    (v_recipe_id, 'herbes italiennes',           0.75, 'c. à soupe', true, 4,  NULL),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 5,  '+ du poivre concassé pour servir'),
    (v_recipe_id, 'sel',                         0.25, 'c. à café',  true, 6,  'pour la marinade'),
    (v_recipe_id, 'huile d''olive',              2,    'c. à soupe', true, 7,  'pour la marinade'),
    (v_recipe_id, 'huile d''olive',              3,    'c. à soupe', true, 8,  'pour la cuisson et la sauce'),
    (v_recipe_id, 'tomates cerises',             15,   'unité',      true, 9,  'coupées en deux'),
    (v_recipe_id, 'oignon',                      0.5,  'unité',      true, 10, 'gros, en dés'),
    (v_recipe_id, 'ail',                         4,    'gousse',     true, 11, 'émincé'),
    (v_recipe_id, 'tomates séchées',             5,    'unité',      true, 12, 'à l''huile, hachées, + 1 c. à soupe de leur huile'),
    (v_recipe_id, 'concentré de tomate',         1,    'c. à soupe', true, 13, NULL),
    (v_recipe_id, 'bouillon de poulet',          105,  'ml',         true, 14, 'pour déglacer'),
    (v_recipe_id, 'jus de citron',               1,    'c. à soupe', true, 15, 'pour déglacer'),
    (v_recipe_id, 'crème liquide entière',       240,  'ml',         true, 16, NULL),
    (v_recipe_id, 'épinards frais',              30,   'g',          true, 17, NULL),
    (v_recipe_id, 'basilic frais',               5,    'feuille',    true, 18, NULL),
    (v_recipe_id, 'parmesan',                    100,  'g',          true, 19, 'râpé'),
    (v_recipe_id, 'citron',                      0.5,  'unité',      true, 20, 'jus, pour finir'),
    (v_recipe_id, 'origan séché',                1,    'c. à soupe', true, 21, NULL),
    (v_recipe_id, 'rigatoni',                    250,  'g',          true, 22, 'un demi-paquet'),
    (v_recipe_id, 'beurre doux',                 1,    'c. à soupe', true, 23, 'pour la finition'),
    (v_recipe_id, 'persil frais',                1,    'c. à soupe', false, 24, 'haché, pour garnir'),
    (v_recipe_id, 'flocons de piment',           0.5,  'c. à café',  false, 25, 'pour garnir');

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
    'Pâtes fraîches maison nappées d''une sauce crémeuse à l''échalote, aux tomates cerises, aux tomates séchées et au poivre vert en saumure, avec des crevettes saisies au paprika.',
    $instr$["Pâtes : former un puits avec la farine, y casser les œufs, puis ajouter l'huile et le sel. Mélanger à la fourchette jusqu'à former une pâte.",
"Pétrir 8-10 minutes, jusqu'à ce que la pâte soit lisse. Filmer et réfrigérer 30 minutes.",
"Diviser en 4, abaisser finement et détailler en pâtes (tagliatelles, pappardelle…).",
"Crevettes : les faire mariner 30 minutes avec le sel, le poivre, le paprika et l'huile.",
"Cuire les crevettes 2-3 minutes par face. Réserver.",
"Sauce : dans la même poêle, faire revenir l'échalote avec les tomates cerises et les tomates séchées 7-8 minutes.",
"Ajouter l'ail et cuire 1 minute.",
"Déglacer avec le bouillon, ajouter la crème et laisser mijoter doucement.",
"Mixer la sauce jusqu'à ce qu'elle soit lisse.",
"La remettre dans la poêle, puis ajouter le parmesan, le poivre noir, les crevettes, les grains de poivre vert et un peu de leur saumure.",
"Cuire les pâtes fraîches al dente dans de l'eau salée (2-4 minutes), en réservant un peu d'eau de cuisson.",
"Mélanger les pâtes et la sauce à feu doux en ajoutant de l'eau de cuisson jusqu'à obtenir la consistance souhaitée. Servir."]
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
    (v_recipe_id, 'farine',                      250,  'g',          true, 1,  'pour la pâte'),
    (v_recipe_id, 'œuf',                         3,    'unité',      true, 2,  'pour la pâte'),
    (v_recipe_id, 'huile d''olive',              0.5,  'c. à soupe', true, 3,  'pour la pâte'),
    (v_recipe_id, 'sel',                         1,    'pincée',     true, 4,  'pour la pâte'),
    (v_recipe_id, 'crevettes',                   454,  'g',          true, 5,  'décortiquées et déveinées'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 6,  'pour les crevettes'),
    (v_recipe_id, 'poivre noir',                 1,    'c. à café',  true, 7,  'pour les crevettes'),
    (v_recipe_id, 'paprika',                     0.75, 'c. à soupe', true, 8,  NULL),
    (v_recipe_id, 'huile d''olive',              2,    'c. à soupe', true, 9,  'pour les crevettes'),
    (v_recipe_id, 'échalote',                    1,    'unité',      true, 10, 'grosse, finement hachée'),
    (v_recipe_id, 'tomates cerises',             10,   'unité',      true, 11, 'coupées en deux'),
    (v_recipe_id, 'ail',                         3,    'gousse',     true, 12, 'émincé'),
    (v_recipe_id, 'tomates séchées',             2,    'unité',      true, 13, 'en dés'),
    (v_recipe_id, 'bouillon de poulet',          60,   'ml',         true, 14, 'ou eau'),
    (v_recipe_id, 'crème liquide entière',       470,  'ml',         true, 15, NULL),
    (v_recipe_id, 'parmesan',                    80,   'g',          true, 16, 'râpé'),
    (v_recipe_id, 'poivre vert',                 1.5,  'c. à café',  true, 17, 'en grains, en saumure, + 2 c. à café de saumure'),
    (v_recipe_id, 'poivre noir',                 1,    'c. à café',  true, 18, 'pour la sauce');

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
    'Fusion indo-italienne : rigatoni nappés d''une sauce butter chicken crémeuse (tomate, cajou, garam masala, fenugrec) avec des hauts de cuisse marinés au yaourt et au piment du Cachemire, rôtis au four.',
    $instr$["Préchauffer le four à 200°C.",
"Écraser au mortier l'ail de la pâte, le gingembre et les piments thaï pour obtenir une pâte.",
"Mélanger les hauts de cuisse en cubes avec la moitié de cette pâte, le yaourt, le garam masala, le piment du Cachemire, le curcuma, le jus de citron vert et le sel. Réfrigérer au moins 30 minutes (jusqu'à 12 heures).",
"Étaler sur une plaque et enfourner 20-25 minutes, jusqu'à ce que le poulet soit cuit à cœur.",
"Cuire les rigatoni dans de l'eau salée en les retirant juste avant qu'ils soient al dente, et réserver environ 250 ml d'eau de cuisson.",
"Faire fondre le beurre à feu moyen et y faire revenir l'échalote 2-3 minutes.",
"Ajouter le reste de la pâte gingembre-ail-piment et l'ail émincé, et cuire 1 minute.",
"Baisser le feu, ajouter le garam masala, le piment du Cachemire, le curcuma et le cumin, et cuire 1-2 minutes.",
"Verser la purée de tomate (ou la sauce tomate Rao's) et laisser mijoter 5-6 minutes (2-3 minutes avec une sauce déjà cuisinée).",
"Incorporer la crème, la purée de noix de cajou et le miel. Finir avec le fenugrec, la coriandre et le jus de citron vert.",
"Goûter et saler.",
"Dans une grande poêle, mélanger la sauce, le poulet, les pâtes et 60-120 ml d'eau de cuisson réservée pendant 2 minutes.",
"Dresser et garnir de parmesan et de coriandre."]
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
    (v_recipe_id, 'hauts de cuisse de poulet',   907,  'g',          true, 1,  'désossés, en cubes'),
    (v_recipe_id, 'ail',                         6,    'gousse',     true, 2,  'pour la pâte'),
    (v_recipe_id, 'gingembre',                   2,    'cm',         true, 3,  'frais'),
    (v_recipe_id, 'piment thaï vert',            2,    'unité',      true, 4,  NULL),
    (v_recipe_id, 'garam masala',                1,    'c. à soupe', true, 5,  'pour la marinade'),
    (v_recipe_id, 'piment du Cachemire en poudre', 2,    'c. à soupe', true, 6,  'pour la marinade'),
    (v_recipe_id, 'curcuma',                     0.5,  'c. à café',  true, 7,  'pour la marinade'),
    (v_recipe_id, 'yaourt nature',               180,  'g',          true, 8,  'entier'),
    (v_recipe_id, 'citron vert',                 1,    'unité',      true, 9,  'jus, pour la marinade et la sauce'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 10, 'pour la marinade, + au goût pour la sauce'),
    (v_recipe_id, 'rigatoni',                    250,  'g',          true, 11, 'un demi-paquet'),
    (v_recipe_id, 'beurre doux',                 3,    'c. à soupe', true, 12, NULL),
    (v_recipe_id, 'échalote',                    1,    'unité',      true, 13, 'finement émincée'),
    (v_recipe_id, 'ail',                         3,    'gousse',     true, 14, 'émincé, pour la sauce'),
    (v_recipe_id, 'garam masala',                1,    'c. à café',  true, 15, 'pour la sauce'),
    (v_recipe_id, 'piment du Cachemire en poudre', 1.5,  'c. à café',  true, 16, 'pour la sauce'),
    (v_recipe_id, 'curcuma',                     0.25, 'c. à café',  true, 17, 'pour la sauce'),
    (v_recipe_id, 'cumin',                       0.5,  'c. à café',  true, 18, 'moulu'),
    (v_recipe_id, 'purée de tomate',             800,  'g',          true, 19, '1 boîte, ou sauce tomate Rao''s'),
    (v_recipe_id, 'purée de noix de cajou',      60,   'ml',         true, 20, NULL),
    (v_recipe_id, 'crème liquide entière',       60,   'ml',         true, 21, NULL),
    (v_recipe_id, 'miel',                        0.5,  'c. à soupe', true, 22, NULL),
    (v_recipe_id, 'feuilles de fenugrec séchées', 1.5,  'c. à soupe', true, 23, 'kasoori methi'),
    (v_recipe_id, 'coriandre fraîche',           0.5,  'botte',      true, 24, 'hachée, + un peu pour garnir'),
    (v_recipe_id, 'parmesan',                    30,   'g',          false, 25, 'râpé, pour garnir');

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
    'Sandwich brioché signature : poulet frit mariné au babeurre et aux épices, nappé de sauce butter chicken, mozzarella fondue, oignons rouges frits croustillants et coriandre.',
    $instr$["Oignons frits : émincer les oignons en fines demi-lunes (environ 3 mm). Les frire 4-5 minutes à feu moyen jusqu'à ce qu'ils soient dorés. Égoutter sur du papier absorbant.",
"Marinade au babeurre : mélanger le babeurre, les hauts de cuisse, le piment du Cachemire, le garam masala, la coriandre moulue, l'ail en poudre, le curcuma, le sel, le poivre, le jus de citron vert, l'ail écrasé, le gingembre et le piment thaï.",
"Laisser mariner au moins 1 heure (jusqu'à 12 heures).",
"Panure : mélanger la farine avec le piment du Cachemire, le garam masala, la coriandre moulue, le curcuma, l'ail en poudre, l'oignon en poudre, le sel et la maïzena.",
"Enrober complètement le poulet mariné de farine assaisonnée.",
"Chauffer l'huile à 165°C. Frire le poulet en maintenant l'huile autour de 150°C, 7-8 minutes, jusqu'à 75°C à cœur et une croûte bien dorée.",
"Égoutter sur une grille, déposer une tranche de mozzarella sur chaque morceau et la faire fondre sous le gril du four.",
"Sauce butter chicken : écraser les tomates pelées à la main.",
"Faire fondre le ghee et faire suer l'échalote 2 minutes, jusqu'à ce qu'elle soit translucide.",
"Ajouter le concentré de tomate et cuire 2 minutes. Ajouter l'ail et cuire 30 secondes, puis les noix de cajou et les faire griller 1 minute.",
"Baisser le feu, ajouter les épices et cuire 1-2 minutes.",
"Verser les tomates écrasées et laisser mijoter 3-4 minutes. Mixer.",
"Remettre dans la casserole avec la crème, le miel, le fenugrec et la coriandre. Saler et relever avec le jus de citron vert.",
"Montage : faire griller les pains au beurre. Étaler de la sauce sur les deux faces et poser le poulet frit au fromage sur la base.",
"Ajouter un peu de sauce, un filet de crème, des oignons frits et de la coriandre. Refermer."]
$instr$,
    90, 40, 5, 4,
    'Indienne', 'dinner',
    ARRAY['indien','américain','fusion','sandwich','poulet frit','butter chicken','brioché'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/fried-butter-chicken-sandwich',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Fried_Butter_Chicken_Thumnail.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon rouge',                3,    'unité',      true, 1,  'gros, finement émincés'),
    (v_recipe_id, 'huile neutre',                1,    'l',          true, 2,  'pour la friture'),
    (v_recipe_id, 'babeurre',                    720,  'ml',         true, 3,  NULL),
    (v_recipe_id, 'hauts de cuisse de poulet',   5,    'unité',      true, 4,  'désossés, avec la peau'),
    (v_recipe_id, 'piment du Cachemire en poudre', 2,    'c. à soupe', true, 5,  'pour la marinade'),
    (v_recipe_id, 'garam masala',                1,    'c. à soupe', true, 6,  'pour la marinade'),
    (v_recipe_id, 'coriandre moulue',            0.5,  'c. à soupe', true, 7,  'pour la marinade'),
    (v_recipe_id, 'ail en poudre',               1,    'c. à soupe', true, 8,  'pour la marinade'),
    (v_recipe_id, 'curcuma',                     1,    'c. à café',  true, 9,  'pour la marinade'),
    (v_recipe_id, 'sel',                         2,    'c. à café',  true, 10, 'pour la marinade et la panure, + au goût'),
    (v_recipe_id, 'poivre noir',                 1.5,  'c. à café',  true, 11, NULL),
    (v_recipe_id, 'citron vert',                 1,    'unité',      true, 12, 'jus, pour la marinade'),
    (v_recipe_id, 'ail',                         8,    'gousse',     true, 13, 'écrasé, pour la marinade'),
    (v_recipe_id, 'gingembre',                   2.5,  'cm',         true, 14, 'écrasé'),
    (v_recipe_id, 'piment thaï vert',            2,    'unité',      true, 15, 'écrasé'),
    (v_recipe_id, 'farine',                      375,  'g',          true, 16, 'pour la panure'),
    (v_recipe_id, 'piment du Cachemire en poudre', 2,    'c. à soupe', true, 17, 'pour la panure'),
    (v_recipe_id, 'garam masala',                1.5,  'c. à soupe', true, 18, 'pour la panure'),
    (v_recipe_id, 'coriandre moulue',            1.5,  'c. à soupe', true, 19, 'pour la panure'),
    (v_recipe_id, 'curcuma',                     0.5,  'c. à soupe', true, 20, 'pour la panure'),
    (v_recipe_id, 'ail en poudre',               2,    'c. à soupe', true, 21, 'pour la panure'),
    (v_recipe_id, 'oignon en poudre',            1.5,  'c. à soupe', true, 22, 'pour la panure'),
    (v_recipe_id, 'maïzena',                     60,   'g',          true, 23, 'pour la panure'),
    (v_recipe_id, 'ghee',                        4,    'c. à soupe', true, 24, 'pour la sauce'),
    (v_recipe_id, 'échalote',                    1,    'unité',      true, 25, 'pour la sauce'),
    (v_recipe_id, 'ail',                         4,    'gousse',     true, 26, 'pour la sauce'),
    (v_recipe_id, 'concentré de tomate',         1,    'c. à soupe', true, 27, NULL),
    (v_recipe_id, 'garam masala',                0.5,  'c. à soupe', true, 28, 'pour la sauce'),
    (v_recipe_id, 'piment du Cachemire en poudre', 0.75, 'c. à soupe', true, 29, 'pour la sauce'),
    (v_recipe_id, 'curcuma',                     0.5,  'c. à café',  true, 30, 'pour la sauce'),
    (v_recipe_id, 'coriandre moulue',            1,    'c. à café',  true, 31, 'pour la sauce'),
    (v_recipe_id, 'cumin',                       1,    'c. à café',  true, 32, 'moulu'),
    (v_recipe_id, 'tomates pelées',              800,  'g',          true, 33, 'San Marzano, 1 boîte'),
    (v_recipe_id, 'noix de cajou',               1.5,  'c. à soupe', true, 34, NULL),
    (v_recipe_id, 'crème liquide entière',       80,   'ml',         true, 35, '+ un filet pour servir'),
    (v_recipe_id, 'miel',                        0.5,  'c. à soupe', true, 36, NULL),
    (v_recipe_id, 'feuilles de fenugrec séchées', 1.5,  'c. à soupe', true, 37, 'kasoori methi'),
    (v_recipe_id, 'coriandre fraîche',           0.5,  'botte',      true, 38, '+ un peu pour garnir'),
    (v_recipe_id, 'citron vert',                 0.5,  'unité',      true, 39, 'jus, pour la sauce'),
    (v_recipe_id, 'pains à burger',              5,    'unité',      true, 40, 'briochés'),
    (v_recipe_id, 'beurre doux',                 30,   'g',          true, 41, 'pour les pains'),
    (v_recipe_id, 'mozzarella',                  5,    'tranche',    true, 42, NULL);

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
    'Biryani d''agneau festif et parfumé : agneau mariné au yaourt et au biryani masala maison (cardamome, cannelle, muscade, girofle), couches de riz basmati au safran, ghee et oignons frits, cuit à l''étouffée (dum).',
    $instr$["Oignons frits : émincer les 4 oignons en fines demi-lunes. Les frire dans l'huile à feu moyen jusqu'à ce qu'ils soient dorés. Réserver l'huile.",
"Biryani masala : torréfier doucement le carvi, le macis, la cannelle, la cardamome noire, les graines de coriandre, la muscade, les piments du Cachemire, les clous de girofle, le cumin, le poivre, la cardamome verte et 5 feuilles de laurier. Moudre avec 1 c. à café de sel, le curcuma et le fenugrec.",
"Écraser au mortier l'ail, le gingembre et les piments thaï pour obtenir une pâte. En réserver 1 c. à soupe pour la cuisson.",
"Mariner l'agneau avec le yaourt (en garder 2 c. à soupe), 1,5 c. à soupe de biryani masala, la coriandre moulue, le piment du Cachemire, un peu de curcuma, la pâte ail-gingembre-piment, une partie des oignons frits écrasés, le ghee fondu, le jus de citron vert, la moitié de la coriandre fraîche et du sel. Réfrigérer de 30 minutes à 24 heures.",
"Riz : laver le basmati jusqu'à ce que l'eau soit claire, puis le faire tremper 1 heure à température ambiante.",
"Porter à ébullition une grande casserole d'eau salée avec 2 feuilles de laurier, l'anis étoilé, quelques clous de girofle, quelques gousses de cardamome verte et un filet d'huile. Cuire le riz aux trois quarts (il doit rester légèrement ferme). Égoutter et laisser refroidir.",
"Cuisson de l'agneau : chauffer un peu d'huile de friture des oignons à feu moyen et faire brunir les 2 oignons émincés 20 minutes, jusqu'à ce qu'ils soient bien dorés.",
"Ajouter la pâte ail-gingembre réservée et cuire 2 minutes.",
"Ajouter un peu de coriandre moulue et de biryani masala (facultatif).",
"Ajouter l'agneau mariné, couvrir et cuire à l'étouffée jusqu'à ce qu'il soit presque cuit. Ajouter 1-2 c. à soupe de yaourt si besoin pour allonger la sauce.",
"Baisser le feu au minimum et rectifier l'assaisonnement.",
"Dum : couvrir l'agneau d'une couche d'oignons frits et de coriandre. Ajouter le riz, puis le ghee fondu, le lait tiède infusé au safran, le reste des oignons frits et de la coriandre.",
"Couvrir hermétiquement et cuire 15 minutes à feu très doux.",
"Éteindre le feu et laisser reposer 20 minutes à couvert. Découvrir et servir."]
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
    (v_recipe_id, 'oignons',                     4,    'unité',      true, 1,  'finement émincés, pour les oignons frits'),
    (v_recipe_id, 'huile neutre',                500,  'ml',         true, 2,  'pour la friture et la cuisson'),
    (v_recipe_id, 'graines de carvi',            2,    'c. à café',  true, 3,  'pour le biryani masala'),
    (v_recipe_id, 'macis',                       3,    'unité',      true, 4,  'pétales de 2,5 cm'),
    (v_recipe_id, 'cannelle',                    4,    'cm',         true, 5,  'en bâton'),
    (v_recipe_id, 'cardamome noire',             5,    'unité',      true, 6,  NULL),
    (v_recipe_id, 'graines de coriandre',        2,    'c. à soupe', true, 7,  NULL),
    (v_recipe_id, 'muscade',                     0.5,  'unité',      true, 8,  'une demi-noix, râpée'),
    (v_recipe_id, 'piments du Cachemire séchés', 4,    'unité',      true, 9,  NULL),
    (v_recipe_id, 'clous de girofle',            1.5,  'c. à café',  true, 10, 'pour le masala et le riz'),
    (v_recipe_id, 'graines de cumin',            1,    'c. à café',  true, 11, NULL),
    (v_recipe_id, 'poivre noir',                 1,    'c. à soupe', true, 12, 'en grains'),
    (v_recipe_id, 'cardamome verte',             2,    'c. à soupe', true, 13, 'en gousses, pour le masala et le riz'),
    (v_recipe_id, 'laurier',                     7,    'feuille',    true, 14, 'pour le masala et le riz'),
    (v_recipe_id, 'curcuma',                     0.5,  'c. à café',  true, 15, 'pour le masala et la marinade'),
    (v_recipe_id, 'feuilles de fenugrec séchées', 0.75, 'c. à soupe', true, 16, 'kasoori methi'),
    (v_recipe_id, 'sel',                         2,    'c. à soupe', true, 17, 'pour le masala, la marinade et l''eau du riz'),
    (v_recipe_id, 'côtelettes d''agneau',        907,  'g',          true, 18, 'avec os'),
    (v_recipe_id, 'yaourt nature',               240,  'g',          true, 19, NULL),
    (v_recipe_id, 'coriandre moulue',            2,    'c. à soupe', true, 20, 'pour la marinade et la cuisson'),
    (v_recipe_id, 'piment du Cachemire en poudre', 2,    'c. à soupe', true, 21, NULL),
    (v_recipe_id, 'ail',                         6,    'gousse',     true, 22, 'écrasé'),
    (v_recipe_id, 'gingembre',                   1,    'cm',         true, 23, 'écrasé'),
    (v_recipe_id, 'piment thaï vert',            3,    'unité',      true, 24, NULL),
    (v_recipe_id, 'ghee',                        3,    'c. à soupe', true, 25, 'fondu, pour la marinade'),
    (v_recipe_id, 'citron vert',                 1,    'unité',      true, 26, 'jus'),
    (v_recipe_id, 'coriandre fraîche',           45,   'g',          true, 27, 'hachée'),
    (v_recipe_id, 'riz basmati',                 400,  'g',          true, 28, NULL),
    (v_recipe_id, 'eau',                         3,    'l',          true, 29, 'pour cuire le riz'),
    (v_recipe_id, 'anis étoilé',                 2,    'unité',      true, 30, NULL),
    (v_recipe_id, 'oignon',                      2,    'unité',      true, 31, 'petits, émincés, pour la cuisson'),
    (v_recipe_id, 'lait',                        60,   'ml',         true, 32, 'tiède, pour le safran'),
    (v_recipe_id, 'safran',                      1,    'pincée',     true, 33, NULL),
    (v_recipe_id, 'ghee',                        4,    'c. à soupe', true, 34, 'fondu, pour les couches');

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
    'Lasagnes traditionnelles complètes : bolognaise riche (bœuf haché, saucisse de bœuf épicée, tomates San Marzano, parmesan), béchamel onctueuse au parmesan et à la muscade, et feuilles de pâte fraîche maison.',
    $instr$["Pâte : former un puits avec la farine. Casser les œufs au centre, puis ajouter le sel et l'huile.",
"Mélanger à la fourchette, puis pétrir 8-10 minutes. Filmer et laisser reposer 30 minutes.",
"Abaisser finement et détailler en feuilles de lasagne.",
"Bolognaise : mixer l'oignon, le céleri, les carottes et l'ail. Faire suer le tout dans une cocotte avec l'huile d'olive.",
"Ajouter la chair de saucisse émiettée et le bœuf haché, puis faire dorer.",
"Incorporer le concentré de tomate et cuire 3 minutes.",
"Déglacer avec 105 ml de bouillon et le vinaigre balsamique, puis ajouter 120 ml de bouillon. Ajouter les tomates San Marzano concassées, l'origan, le basilic frais et séché, le sucre, le sel et le poivre.",
"Incorporer le parmesan râpé et la croûte de parmesan. Couvrir partiellement et laisser mijoter 1 à 2 heures.",
"En fin de cuisson, ajouter les flocons de piment et le reste du bouillon (environ 120 ml).",
"Béchamel : faire fondre le beurre, ajouter la farine et fouetter 2-3 minutes, jusqu'à obtenir un roux blond.",
"Verser le lait progressivement en fouettant. Laisser mijoter jusqu'à épaississement.",
"Incorporer le parmesan, la muscade, l'ail en poudre et le poivre. Rectifier le sel.",
"Préchauffer le four à 200°C. Précuire les feuilles de pâte 1 minute dans de l'eau bouillante salée.",
"Montage : un peu de bolognaise, des feuilles de pâte, de la bolognaise, de la béchamel et du parmesan. Répéter sur 4-5 couches et terminer par de la béchamel et du parmesan.",
"Enfourner 30-40 minutes, jusqu'à ce que le dessus soit doré et bouillonnant. Laisser reposer 15 minutes avant de servir."]
$instr$,
    60, 150, 6, 4,
    'Italienne', 'dinner',
    ARRAY['italien','lasagne','bolognaise','béchamel','pâte fraîche','bœuf','saucisse'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/lasagna-recipe',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Lasanga_3.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon',                      0.5,  'unité',      true, 1,  'gros, pour la sauce'),
    (v_recipe_id, 'céleri',                      2,    'branche',    true, 2,  NULL),
    (v_recipe_id, 'carottes',                    2,    'unité',      true, 3,  'moyennes'),
    (v_recipe_id, 'ail',                         5,    'gousse',     true, 4,  NULL),
    (v_recipe_id, 'huile d''olive',              2,    'c. à soupe', true, 5,  'pour la sauce'),
    (v_recipe_id, 'tomates concassées',          800,  'g',          true, 6,  'San Marzano, 1 boîte'),
    (v_recipe_id, 'origan séché',                2,    'c. à café',  true, 7,  NULL),
    (v_recipe_id, 'basilic séché',               1,    'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'saucisse de bœuf',            454,  'g',          true, 9,  'épicée, chair émiettée'),
    (v_recipe_id, 'poivre noir',                 1.5,  'c. à café',  true, 10, 'pour la sauce et la béchamel'),
    (v_recipe_id, 'bœuf haché',                  454,  'g',          true, 11, '15 % de matières grasses'),
    (v_recipe_id, 'basilic frais',               2,    'c. à soupe', true, 12, 'haché'),
    (v_recipe_id, 'sucre',                       0.5,  'c. à café',  true, 13, NULL),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 14, 'pour la sauce et la béchamel, au goût'),
    (v_recipe_id, 'bouillon de bœuf',            345,  'ml',         true, 15, 'dont 105 ml pour déglacer et 120 ml en fin de cuisson'),
    (v_recipe_id, 'vinaigre balsamique',         1,    'c. à soupe', true, 16, 'pour déglacer'),
    (v_recipe_id, 'concentré de tomate',         2,    'c. à soupe', true, 17, NULL),
    (v_recipe_id, 'parmesan',                    100,  'g',          true, 18, 'râpé, + une croûte pour la sauce'),
    (v_recipe_id, 'flocons de piment',           0.5,  'c. à café',  true, 19, NULL),
    (v_recipe_id, 'beurre doux',                 70,   'g',          true, 20, 'pour la béchamel'),
    (v_recipe_id, 'farine',                      70,   'g',          true, 21, 'pour la béchamel'),
    (v_recipe_id, 'lait entier',                 1.2,  'l',          true, 22, NULL),
    (v_recipe_id, 'parmesan',                    100,  'g',          true, 23, 'râpé, pour la béchamel'),
    (v_recipe_id, 'muscade',                     0.75, 'c. à café',  true, 24, 'moulue'),
    (v_recipe_id, 'ail en poudre',               0.5,  'c. à soupe', true, 25, 'pour la béchamel'),
    (v_recipe_id, 'œuf',                         3,    'unité',      true, 26, 'pour la pâte'),
    (v_recipe_id, 'farine',                      250,  'g',          true, 27, 'pour la pâte'),
    (v_recipe_id, 'sel',                         0.5,  'c. à café',  true, 28, 'pour la pâte'),
    (v_recipe_id, 'huile d''olive',              1,    'c. à soupe', true, 29, 'pour la pâte');

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
    'Poulet frit ultra-croustillant à double panure : poulet salé à sec, enrobé de panure sèche, trempé dans une pâte pétillante à l''eau gazeuse, puis de nouveau dans la panure. Frit à 175°C jusqu''à 75°C à cœur.',
    $instr$["Saler le poulet (hauts de cuisse, ailes, pilons) et le réfrigérer à découvert de 1 à 12 heures (salage à sec).",
"Mélanger les ingrédients de la panure sèche : farine, maïzena, fécule de tapioca, sel, poivre, piment du Cachemire, ail en poudre, oignon en poudre, moutarde en poudre, chili en poudre et origan.",
"Mélanger les ingrédients de la pâte liquide : eau gazeuse, farine, œuf, sel, poivre, piment du Cachemire, ail en poudre, oignon en poudre, moutarde en poudre et chili en poudre.",
"Enrober le poulet de panure sèche et secouer l'excédent.",
"Le tremper dans la pâte liquide, puis à nouveau dans la panure sèche.",
"Chauffer l'huile à 188°C.",
"Frire en maintenant l'huile à 175°C : ailes et pilons environ 10 minutes, hauts de cuisse 12-14 minutes, jusqu'à 75°C à cœur.",
"Égoutter sur une grille. Servir chaud."]
$instr$,
    60, 30, 4, 3,
    'Américaine', 'dinner',
    ARRAY['américain','poulet','frit','croustillant','salage à sec','eau gazeuse'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/fried-chicken-recipe',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/Screen_Shot_2024-06-06_at_9.39.12_AM_480x480.png'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'hauts de cuisse de poulet',   2,    'unité',      true, 1,  'avec os et peau'),
    (v_recipe_id, 'ailes de poulet',             2,    'unité',      true, 2,  NULL),
    (v_recipe_id, 'pilons de poulet',            2,    'unité',      true, 3,  NULL),
    (v_recipe_id, 'sel',                         2,    'c. à soupe', true, 4,  'pour le salage à sec'),
    (v_recipe_id, 'huile neutre',                2,    'l',          true, 5,  'pour la friture'),
    (v_recipe_id, 'farine',                      375,  'g',          true, 6,  'pour la panure sèche'),
    (v_recipe_id, 'maïzena',                     125,  'g',          true, 7,  'pour la panure sèche'),
    (v_recipe_id, 'fécule de tapioca',           60,   'g',          false, 8,  'facultatif'),
    (v_recipe_id, 'sel',                         2,    'c. à café',  true, 9,  'pour la panure sèche'),
    (v_recipe_id, 'poivre noir',                 2,    'c. à café',  true, 10, 'pour la panure sèche'),
    (v_recipe_id, 'piment du Cachemire en poudre', 2.5,  'c. à soupe', true, 11, 'pour la panure sèche'),
    (v_recipe_id, 'ail en poudre',               3,    'c. à soupe', true, 12, 'pour la panure sèche'),
    (v_recipe_id, 'oignon en poudre',            1,    'c. à soupe', true, 13, 'pour la panure sèche'),
    (v_recipe_id, 'moutarde en poudre',          0.5,  'c. à soupe', true, 14, 'pour la panure sèche'),
    (v_recipe_id, 'chili en poudre',             0.5,  'c. à soupe', true, 15, 'pour la panure sèche'),
    (v_recipe_id, 'origan séché',                0.5,  'c. à soupe', true, 16, NULL),
    (v_recipe_id, 'eau gazeuse',                 600,  'ml',         true, 17, 'type club soda'),
    (v_recipe_id, 'farine',                      125,  'g',          true, 18, 'pour la pâte liquide'),
    (v_recipe_id, 'œuf',                         1,    'unité',      true, 19, 'pour la pâte liquide'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 20, 'pour la pâte liquide'),
    (v_recipe_id, 'poivre noir',                 1,    'c. à café',  true, 21, 'pour la pâte liquide'),
    (v_recipe_id, 'piment du Cachemire en poudre', 1,    'c. à soupe', true, 22, 'pour la pâte liquide'),
    (v_recipe_id, 'ail en poudre',               1,    'c. à soupe', true, 23, 'pour la pâte liquide'),
    (v_recipe_id, 'oignon en poudre',            0.5,  'c. à soupe', true, 24, 'pour la pâte liquide'),
    (v_recipe_id, 'moutarde en poudre',          1,    'c. à café',  true, 25, 'pour la pâte liquide'),
    (v_recipe_id, 'chili en poudre',             1,    'c. à café',  true, 26, 'pour la pâte liquide');

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
    'Curry fusion thaï-indien onctueux et parfumé : bœuf tendre, pommes de terre et carottes mijotés avec de la pâte de curry rouge, du lait de coco et du beurre de cacahuète, relevés de coriandre, de cumin, de cardamome et de feuilles de curry.',
    $instr$["Saisir le bœuf émincé dans l'huile de coco, puis le retirer.",
"Faire suer l'échalote émincée, puis ajouter la pomme de terre et les carottes. Cuire 3-4 minutes.",
"Ajouter la coriandre, le cumin, la cannelle, le miel et la cassonade.",
"Ajouter le gingembre, les feuilles de curry et la cardamome écrasée. Cuire 1 minute.",
"Incorporer le beurre de cacahuète et la pâte de curry rouge. Cuire 1-2 minutes.",
"Ajouter la sauce soja, le lait de coco et l'eau. Laisser mijoter 8-10 minutes, jusqu'à ce que la pomme de terre soit tendre.",
"Remettre le bœuf et finir avec le jus de citron vert.",
"Garnir de cacahuètes concassées et de coriandre. Servir avec du riz."]
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
    (v_recipe_id, 'bœuf à mijoter',              454,  'g',          true, 1,  'finement émincé'),
    (v_recipe_id, 'huile de coco',               1,    'c. à soupe', true, 2,  NULL),
    (v_recipe_id, 'échalote',                    1,    'unité',      true, 3,  'grosse, émincée'),
    (v_recipe_id, 'pomme de terre',              1,    'unité',      true, 4,  'grosse, en dés'),
    (v_recipe_id, 'carottes',                    2,    'unité',      true, 5,  'moyennes, en morceaux'),
    (v_recipe_id, 'coriandre moulue',            1,    'c. à café',  true, 6,  NULL),
    (v_recipe_id, 'cumin moulu',                 1,    'c. à café',  true, 7,  NULL),
    (v_recipe_id, 'cannelle moulue',             0.5,  'c. à café',  true, 8,  NULL),
    (v_recipe_id, 'miel',                        0.5,  'c. à soupe', true, 9,  NULL),
    (v_recipe_id, 'cassonade',                   1.5,  'c. à soupe', true, 10, NULL),
    (v_recipe_id, 'gingembre',                   1.5,  'cm',         true, 11, 'émincé'),
    (v_recipe_id, 'feuilles de curry',           3,    'feuille',    true, 12, NULL),
    (v_recipe_id, 'cardamome',                   3,    'gousse',     true, 13, 'écrasées'),
    (v_recipe_id, 'beurre de cacahuète',         1,    'c. à soupe', true, 14, NULL),
    (v_recipe_id, 'pâte de curry rouge',         2.5,  'c. à soupe', true, 15, 'thaïe'),
    (v_recipe_id, 'sauce soja',                  1,    'c. à soupe', true, 16, NULL),
    (v_recipe_id, 'lait de coco',                400,  'ml',         true, 17, '1 boîte'),
    (v_recipe_id, 'eau',                         240,  'ml',         true, 18, NULL),
    (v_recipe_id, 'citron vert',                 0.5,  'unité',      true, 19, 'jus'),
    (v_recipe_id, 'cacahuètes',                  30,   'g',          false, 20, 'concassées, pour garnir'),
    (v_recipe_id, 'coriandre fraîche',           10,   'g',          false, 21, 'pour garnir'),
    (v_recipe_id, 'riz',                         300,  'g',          false, 22, 'cru, cuit pour servir');

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
    'Double smash burger au beef bacon : bœuf haché 80/20 assaisonné (ail, paprika, Worcestershire, soja), écrasé à plat, double cheddar fondu, oignons caramélisés et beef bacon croustillant sur pain brioché beurré, avec une sauce burger mayo-sriracha.',
    $instr$["Mélanger le bœuf avec l'œuf, l'ail en poudre, le paprika, la sauce Worcestershire, la sauce soja et le sel.",
"Former des boules de la taille d'une balle de golf et les réfrigérer de 30 minutes à 2 heures.",
"Sauce burger : fouetter la mayonnaise, le jus de cornichon, la moutarde, la sriracha, la sauce Worcestershire, la sauce soja, le jus de citron et une pincée de sel.",
"Oignons caramélisés : les cuire dans une poêle à feu doux avec l'huile et une pincée de sel pendant 30 minutes, jusqu'à ce qu'ils soient dorés.",
"Ajouter le bouillon et le vinaigre de cidre, puis poursuivre la cuisson 45-60 minutes, jusqu'à ce qu'ils soient confits.",
"Cuire le beef bacon au four à 190°C pendant 15-20 minutes.",
"Beurrer et griller les pains briochés.",
"Écraser les boules de bœuf en steaks fins dans une poêle chaude, à feu moyen-vif.",
"Saler et poivrer le dessus, puis badigeonner d'un peu de sauce burger.",
"Retourner au bout de 2 minutes, une fois la croûte dorée. Ajouter le cheddar et couvrir 30 secondes à 1 minute pour le faire fondre.",
"Superposer les steaks deux par deux. Monter : pain du bas, sauce, steaks, beef bacon, oignons caramélisés, laitue, sauce et pain du haut."]
$instr$,
    30, 90, 3, 3,
    'Américaine', 'dinner',
    ARRAY['américain','burger','smash','beef bacon','cheddar','brioché','oignons caramélisés'],
    'manual',
    'https://joemustgoon.com/blogs/recipes/double-bacon-smash-cheeseburger-recipe',
    'https://cdn.shopify.com/s/files/1/0591/8192/4386/files/IMG_37546ECDABBF-1_480x480.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                  680,  'g',          true, 1,  '20 % de matières grasses'),
    (v_recipe_id, 'œuf',                         1,    'unité',      true, 2,  NULL),
    (v_recipe_id, 'ail en poudre',               1,    'c. à soupe', true, 3,  NULL),
    (v_recipe_id, 'paprika',                     1,    'c. à soupe', true, 4,  NULL),
    (v_recipe_id, 'sauce Worcestershire',        0.5,  'c. à soupe', true, 5,  'pour le bœuf'),
    (v_recipe_id, 'sauce soja',                  0.5,  'c. à soupe', true, 6,  'pour le bœuf'),
    (v_recipe_id, 'sel',                         0.75, 'c. à soupe', true, 7,  'casher, pour le bœuf, + une pincée pour la sauce et les oignons'),
    (v_recipe_id, 'poivre noir',                 0.5,  'c. à café',  true, 8,  'au goût'),
    (v_recipe_id, 'mayonnaise',                  4,    'c. à soupe', true, 9,  'pour la sauce burger'),
    (v_recipe_id, 'jus de cornichon',            0.5,  'c. à soupe', true, 10, NULL),
    (v_recipe_id, 'moutarde',                    0.75, 'c. à soupe', true, 11, NULL),
    (v_recipe_id, 'sriracha',                    1,    'c. à soupe', true, 12, NULL),
    (v_recipe_id, 'sauce Worcestershire',        0.5,  'c. à soupe', true, 13, 'pour la sauce'),
    (v_recipe_id, 'sauce soja claire',           1,    'c. à café',  true, 14, NULL),
    (v_recipe_id, 'citron',                      0.25, 'unité',      true, 15, 'jus'),
    (v_recipe_id, 'oignon blanc',                2,    'unité',      true, 16, 'gros, émincés'),
    (v_recipe_id, 'huile neutre',                2,    'c. à soupe', true, 17, 'pour les oignons'),
    (v_recipe_id, 'bouillon de bœuf',            1,    'c. à café',  true, 18, 'pour les oignons'),
    (v_recipe_id, 'vinaigre de cidre',           0.5,  'c. à café',  true, 19, 'pour les oignons'),
    (v_recipe_id, 'beef bacon',                  350,  'g',          true, 20, '1 paquet'),
    (v_recipe_id, 'cheddar',                     6,    'tranche',    true, 21, NULL),
    (v_recipe_id, 'pains à burger',              3,    'unité',      true, 22, 'briochés'),
    (v_recipe_id, 'beurre doux',                 30,   'g',          true, 23, 'pour les pains'),
    (v_recipe_id, 'laitue',                      2,    'feuille',    false, 24, NULL);

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
    'Poulet tikka masala classique : hauts de cuisse marinés au yaourt et aux épices, sauce tomate parfumée (cumin, garam masala, curcuma, fenugrec) adoucie à la crème et au miel.',
    $instr$["Marinade : écraser au mortier l'ail, le gingembre et un piment. Mélanger avec le yaourt, le garam masala, le chili en poudre, le cumin, le poivre blanc, le sel et le jus de citron vert. Ajouter le poulet et laisser mariner toute une nuit.",
"Faire suer l'oignon dans l'huile jusqu'à ce qu'il soit presque brun.",
"Ajouter les tomates en dés et cuire jusqu'à ce qu'elles ramollissent.",
"Incorporer l'ail, le gingembre et le piment restant. Cuire jusqu'à ce que le mélange soit parfumé.",
"Baisser le feu, ajouter le cumin, le garam masala, le curcuma et le chili en poudre, et cuire 1-2 minutes sans laisser brûler.",
"Ajouter la feuille de laurier, puis le concentré de tomate.",
"Verser la purée de tomate et laisser mijoter 1 minute.",
"Ajouter le bouillon de poulet et le cube émietté. Laisser mijoter 30-60 minutes, jusqu'à épaississement.",
"Facultatif : retirer le laurier et mixer pour obtenir une sauce lisse.",
"Cuire le poulet mariné au four à 200°C pendant 20 minutes, jusqu'à 75°C à cœur.",
"Incorporer le poulet à la sauce avec la crème, le miel et le sucre. Ajuster la quantité de crème selon la couleur souhaitée.",
"Finir avec le fenugrec et la coriandre. Servir avec du riz basmati."]
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
    (v_recipe_id, 'hauts de cuisse de poulet',   680,  'g',          true, 1,  'désossés, sans peau'),
    (v_recipe_id, 'yaourt nature',               180,  'g',          true, 2,  'pour la marinade'),
    (v_recipe_id, 'garam masala',                1,    'c. à soupe', true, 3,  'pour la marinade'),
    (v_recipe_id, 'chili en poudre',             0.5,  'c. à soupe', true, 4,  'pour la marinade'),
    (v_recipe_id, 'cumin',                       2,    'c. à café',  true, 5,  'moulu, pour la marinade'),
    (v_recipe_id, 'poivre blanc',                2,    'c. à café',  true, 6,  NULL),
    (v_recipe_id, 'ail',                         6,    'gousse',     true, 7,  'pour la marinade'),
    (v_recipe_id, 'gingembre',                   4,    'cm',         true, 8,  'pour la marinade'),
    (v_recipe_id, 'citron vert',                 1,    'unité',      true, 9,  'jus'),
    (v_recipe_id, 'sel',                         2,    'c. à café',  true, 10, NULL),
    (v_recipe_id, 'huile neutre',                2,    'c. à soupe', true, 11, 'pour la sauce'),
    (v_recipe_id, 'oignon',                      1,    'unité',      true, 12, 'gros, émincé'),
    (v_recipe_id, 'tomates',                     2,    'unité',      true, 13, 'Roma, en dés'),
    (v_recipe_id, 'gingembre',                   4,    'cm',         true, 14, 'pour la sauce'),
    (v_recipe_id, 'ail',                         5,    'gousse',     true, 15, 'pour la sauce'),
    (v_recipe_id, 'piments verts',               2,    'unité',      true, 16, 'petits, pour la marinade et la sauce'),
    (v_recipe_id, 'concentré de tomate',         1,    'c. à café',  true, 17, NULL),
    (v_recipe_id, 'purée de tomate',             400,  'g',          true, 18, 'une demi-boîte de 800 g'),
    (v_recipe_id, 'bouillon de poulet',          480,  'ml',         true, 19, NULL),
    (v_recipe_id, 'cube de bouillon de poulet',  0.5,  'unité',      true, 20, NULL),
    (v_recipe_id, 'cumin',                       2,    'c. à café',  true, 21, 'moulu, pour la sauce'),
    (v_recipe_id, 'garam masala',                1,    'c. à soupe', true, 22, 'pour la sauce'),
    (v_recipe_id, 'curcuma',                     2,    'c. à café',  true, 23, NULL),
    (v_recipe_id, 'chili en poudre',             0.5,  'c. à soupe', true, 24, 'pour la sauce'),
    (v_recipe_id, 'crème liquide entière',       90,   'ml',         true, 25, '60 à 120 ml selon la couleur'),
    (v_recipe_id, 'miel',                        1,    'c. à soupe', true, 26, NULL),
    (v_recipe_id, 'sucre',                       1,    'c. à café',  true, 27, NULL),
    (v_recipe_id, 'laurier',                     1,    'feuille',    true, 28, NULL),
    (v_recipe_id, 'feuilles de fenugrec séchées', 1,    'c. à soupe', true, 29, 'kasoori methi'),
    (v_recipe_id, 'coriandre fraîche',           15,   'g',          false, 30, 'pour garnir'),
    (v_recipe_id, 'riz basmati',                 300,  'g',          false, 31, 'cru, cuit pour servir');

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
    'Bouchées de steak saisies sur une purée de pommes de terre infusée au beurre, au romarin et à l''ail, nappées d''une sauce crémeuse aux tomates séchées, tomates cerises, parmesan et basilic.',
    $instr$["Couper les pommes de terre en cubes égaux. Les mettre dans une casserole d'eau froide avec le bouillon de poulet en poudre.",
"Porter à ébullition et cuire jusqu'à ce qu'elles soient tendres sous la pointe d'un couteau.",
"Pendant ce temps, faire fondre le beurre avec le lait, la crème, l'ail et le romarin. Laisser frémir, puis infuser au moins 20 minutes.",
"Égoutter les pommes de terre et les écraser en purée lisse. Incorporer progressivement le liquide infusé (filtré) jusqu'à la consistance souhaitée. Facultatif : ajouter une noix de beurre et de la ciboulette.",
"Couper le steak en cubes, saler et poivrer. Réfrigérer à découvert au moins 30 minutes.",
"Chauffer une poêle huilée à feu moyen-vif. Saisir les cubes en une seule couche jusqu'à ce qu'une belle croûte se forme.",
"Retourner et cuire selon votre goût. Retirer et réserver en gardant les sucs dans la poêle.",
"Sauce : à feu moyen, utiliser la graisse de cuisson du steak (et un peu d'huile des tomates séchées si besoin).",
"Faire suer l'échalote 3-4 minutes.",
"Ajouter les tomates séchées et les tomates cerises, et cuire 5-6 minutes, jusqu'à ce qu'elles soient confites.",
"Ajouter l'ail et le basilic, et cuire 30 secondes.",
"Verser le bouillon de bœuf, gratter les sucs et laisser mijoter 4-5 minutes.",
"Baisser le feu, ajouter la crème et laisser mijoter 3-4 minutes.",
"Hors du feu, incorporer le parmesan jusqu'à ce que la sauce soit lisse. Ajouter les herbes italiennes, l'origan, le paprika, le sucre, du sel et du poivre, puis remettre à frémir 1-2 minutes.",
"Finir avec le beurre. Dresser la purée, déposer les bouchées de steak et napper de sauce. Garnir de ciboulette."]
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
    (v_recipe_id, 'entrecôte',                   680,  'g',          true, 1,  'ou bavette, en cubes'),
    (v_recipe_id, 'sel',                         1,    'c. à café',  true, 2,  'pour le steak et la sauce'),
    (v_recipe_id, 'poivre noir',                 1,    'c. à café',  true, 3,  'pour le steak et la sauce'),
    (v_recipe_id, 'huile neutre',                1,    'c. à soupe', true, 4,  'pour saisir'),
    (v_recipe_id, 'pommes de terre',             5,    'unité',      true, 5,  'à chair jaune (type Yukon Gold)'),
    (v_recipe_id, 'bouillon de poulet en poudre', 0.5,  'c. à soupe', true, 6,  NULL),
    (v_recipe_id, 'lait entier',                 240,  'ml',         true, 7,  NULL),
    (v_recipe_id, 'crème liquide entière',       240,  'ml',         true, 8,  'pour la purée'),
    (v_recipe_id, 'beurre doux',                 113,  'g',          true, 9,  'pour la purée'),
    (v_recipe_id, 'ail',                         5,    'gousse',     true, 10, 'pour la purée'),
    (v_recipe_id, 'romarin frais',               2,    'branche',    true, 11, NULL),
    (v_recipe_id, 'échalote',                    2,    'unité',      true, 12, 'pour la sauce'),
    (v_recipe_id, 'ail',                         5,    'gousse',     true, 13, 'émincé, pour la sauce'),
    (v_recipe_id, 'basilic frais',               5,    'feuille',    true, 14, NULL),
    (v_recipe_id, 'tomates séchées',             3,    'unité',      true, 15, 'à l''huile, grossièrement hachées'),
    (v_recipe_id, 'tomates cerises',             8,    'unité',      true, 16, 'coupées en deux'),
    (v_recipe_id, 'bouillon de bœuf',            480,  'ml',         true, 17, NULL),
    (v_recipe_id, 'crème liquide entière',       120,  'ml',         true, 18, 'pour la sauce'),
    (v_recipe_id, 'parmesan',                    100,  'g',          true, 19, 'fraîchement râpé'),
    (v_recipe_id, 'herbes italiennes',           1.5,  'c. à café',  true, 20, NULL),
    (v_recipe_id, 'origan séché',                1.5,  'c. à café',  true, 21, NULL),
    (v_recipe_id, 'paprika',                     2,    'c. à café',  true, 22, NULL),
    (v_recipe_id, 'beurre doux',                 2,    'c. à soupe', true, 23, 'pour la sauce'),
    (v_recipe_id, 'sucre',                       1,    'pincée',     true, 24, NULL),
    (v_recipe_id, 'ciboulette',                  1,    'c. à soupe', false, 25, 'ciselée, pour garnir');

END $$;
