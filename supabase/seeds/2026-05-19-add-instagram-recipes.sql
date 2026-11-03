-- =====================================================================
-- Seed: Instagram recipes — saisies manuellement
-- 2026-05-19
--
-- Instagram bloque le scraping côté public (og:image rendu côté JS et
-- protégé), donc on s'appuie sur le contenu transmis manuellement par
-- l'utilisateur (ingrédients + steps depuis la caption + sa description).
-- L'URL du reel reste stockée dans source_url pour back-référence.
-- image_url = NULL → fallback ChefHat dans LibraryRecipeCard.
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` pour
-- l'audit user c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6.
-- Idempotent : DELETEs par nom (FK cascade vide les ingrédients).
--
-- Recettes incluses :
--   1. Pad Krapow Lumpia                       ✓
--   2. Spicy Tuna Crispy Rice                  ✓
--   3. Don't Worry Rice Bowl                   ✓
--   4. Sushi Bake                              ✓
--   5. Cheung Fun aux Crevettes (Express)      ✓
--   6. Crispy Rice Salad                       ✓
--   7. Salade de Smashed Potatoes              ✓
--   8. Murtabak                                ✓
--   9. Korean Fried Chicken                    ✓
--  10. Beef Hor Fun (Black Bean Sauce)         ✓
--  11. Garlic Steak Fried Rice                 ✓
--  12. Spicy Salmon Musubi                     ✓
--  13. Honey Butter Katsu Musubi               ✓
--  14. Crispy Smashed Potato Salad             ✓
--      (Chilli Crisp Tahini)
--  15. Ayam Goreng (Malay Fried Chicken)       ✓
--  16. Crispy Smashed Cajun Potatoes           ✓
--      (Air Fryer)
--  17. Creamy Tuscan Chicken Pasta             ✓
--  18. Fettuccine Alfredo                      ✓
--  19. Loco Moco au Poivre                     ✓
--  20. Malai Chutney Chicken Tikka             ✓
--  21. Sri Lankan Mutton Rolls                 ✓
--  22. Hyderabadi Wedding Red Chicken Curry    ✓
--  23. Riz au Lait Vanille Crémeux             ✓
--  24. Butter Chicken (Michelin Star)          ✓
--
-- Fichier évolutif : je rajoute des recettes au fur et à mesure que
-- l'utilisateur me paste des nouvelles URL Insta + détails.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-instagram-recipes.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Pad Krapow Lumpia',
    'Spicy Tuna Crispy Rice',
    'Don''t Worry Rice Bowl',
    'Sushi Bake',
    'Cheung Fun aux Crevettes (Express)',
    'Crispy Rice Salad (Creamy Satay)',
    'Salade de Smashed Potatoes',
    'Murtabak',
    'Korean Fried Chicken',
    'Beef Hor Fun (Black Bean Sauce)',
    'Garlic Steak Fried Rice',
    'Spicy Salmon Musubi',
    'Honey Butter Katsu Musubi',
    'Crispy Smashed Potato Salad (Chilli Crisp Tahini)',
    'Ayam Goreng (Malay Fried Chicken)',
    'Crispy Smashed Cajun Potatoes (Air Fryer)',
    'Creamy Tuscan Chicken Pasta',
    'Fettuccine Alfredo',
    'Loco Moco au Poivre',
    'Malai Chutney Chicken Tikka',
    'Sri Lankan Mutton Rolls',
    'Hyderabadi Wedding Red Chicken Curry',
    'Riz au Lait Vanille Crémeux',
    'Butter Chicken (Michelin Star)'
  ];
BEGIN

  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Pad Krapow Lumpia (fusion thaï × philippin)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Pad Krapow Lumpia',
    'Fusion thaï-philippine : la garniture du pad krapow (bœuf haché sauté à l''ail, au piment thaï et au basilic, relevé de sauce de poisson, de sauce soja foncée et de sucre) roulée dans des galettes de lumpia, puis frite. À servir avec du riz blanc, un œuf frit et des tomates fraîches.',
    $instr$["Hacher et écraser ensemble l'ail et les piments thaï en pâte (au mortier ou au couteau).",
"Dans un grand wok à feu moyen-vif, saisir le bœuf haché 4-5 minutes jusqu'à ce que le gras fonde. Égoutter l'excédent de gras, puis monter le feu à vif et continuer à saisir 2-3 minutes jusqu'à belle coloration. Ajouter la pâte d'ail et de piment et sauter 2 minutes.",
"Ajouter la sauce de poisson, la sauce soja foncée, le sucre et l'eau. Poursuivre la cuisson 2 minutes, jusqu'à ce que la viande soit bien enrobée de sauce.",
"Retirer du feu et incorporer les feuilles de basilic (idéalement du basilic thaï).",
"Roulage : poser une galette de lumpia en losange (un coin pointé vers vous).",
"Déposer 1 à 1,5 c. à soupe de garniture à environ 5 cm du coin du bas.",
"Former un boudin horizontal compact, en laissant de la marge sur les côtés pour le pliage.",
"Rabattre le coin du bas sur la garniture en serrant bien.",
"Replier les côtés vers l'intérieur, puis rouler vers le haut. Sceller la dernière pointe avec un peu d'eau.",
"Friture : chauffer l'huile à 175 °C. Frire les lumpia 2-3 minutes par fournée, jusqu'à ce qu'ils soient bien dorés.",
"Servir bien chaud avec du riz blanc, un œuf frit à jaune coulant et des tranches de tomates fraîches."]
$instr$,
    30, 20, 4, 2,
    'Philippine', 'dinner',
    ARRAY['philippin','thaï','fusion','lumpia','pad krapow','bœuf','frit','basilic'],
    'manual',
    'https://www.instagram.com/p/DHefHHlOnjh/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Garniture pad krapow
    (v_recipe_id, 'bœuf haché',              454, 'g',          true,  1,  '20 % de matières grasses'),
    (v_recipe_id, 'ail',                     3,   'gousse',     true,  2,  NULL),
    (v_recipe_id, 'piments oiseau thaï',     2,   'unité',      true,  3,  'ajuster au goût'),
    (v_recipe_id, 'sauce de poisson',        15,  'ml',         true,  4,  '1 c. à soupe'),
    (v_recipe_id, 'sauce soja foncée',       15,  'ml',         true,  5,  '1 c. à soupe'),
    (v_recipe_id, 'sucre',                   0.75, 'c. à soupe', true, 6,  NULL),
    (v_recipe_id, 'eau',                     30,  'ml',         true,  7,  '2 c. à soupe'),
    (v_recipe_id, 'basilic thaï',            20,  'g',          true,  8,  'feuilles, ou basilic frais à défaut'),
    -- Roulage
    (v_recipe_id, 'galettes de lumpia',      15,  'unité',      true,  9,  'ou feuilles à rouleaux de printemps'),
    (v_recipe_id, 'huile végétale',          1000, 'ml',        true,  10, 'pour la friture'),
    -- Service
    (v_recipe_id, 'riz blanc cuit',          400, 'g',          false, 11, 'pour servir'),
    (v_recipe_id, 'œufs',                    4,   'unité',      false, 12, 'frits, jaune coulant'),
    (v_recipe_id, 'tomates',                 2,   'unité',      false, 13, 'fraîches, en tranches');

  -- =====================================================================
  -- 2. Spicy Tuna Crispy Rice (style Nobu / izakaya)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Spicy Tuna Crispy Rice',
    'Classique des bars à sushis (inspiration Nobu) : des galettes de riz à sushi pressé puis frit jusqu''à ce qu''elles soient croustillantes et ambrées, surmontées d''un tartare de thon qualité sashimi à la mayonnaise japonaise, sriracha, yuzu et sésame. Prévoir 2 h de repos au réfrigérateur pour le riz pressé.',
    $instr$["Rincer le riz à sushi à l'eau froide jusqu'à ce que l'eau ressorte claire.",
"Cuire le riz au cuiseur à riz avec le kombu et l'eau.",
"Mélanger le vinaigre de riz, le sucre et le sel dans un bol. Passer 30 secondes au micro-ondes pour dissoudre le sucre et le sel.",
"Quand le riz est cuit, verser le mélange vinaigré sur le riz chaud et mélanger délicatement à la spatule jusqu'à incorporation complète.",
"Tapisser une plaque de cuisson de film alimentaire. Étaler le riz uniformément (~2 cm d'épaisseur). Recouvrir d'un autre film et presser avec une seconde plaque par-dessus. Réfrigérer 2 heures minimum, jusqu'à ce que le riz soit bien ferme.",
"Pendant ce temps, hacher finement le thon au couteau. Mélanger avec l'oignon vert finement tranché, le gingembre râpé, la sauce soja, l'huile de sésame, le jus de yuzu, la mayonnaise japonaise, la sriracha et une pincée de sel. Couvrir et réfrigérer.",
"Démouler le riz pressé et le couper en rectangles ou en losanges (taille bouchée).",
"Friture : chauffer l'huile à 190 °C. Plonger les galettes par petites quantités, à 30 secondes d'intervalle pour qu'elles ne collent pas. Frire jusqu'à ce qu'elles soient bien dorées.",
"Égoutter sur une grille et saler légèrement chaque galette à la sortie de l'huile.",
"Surmonter chaque galette d'une quenelle de tartare de thon épicé. Parsemer de ciboulette ciselée. Servir immédiatement."]
$instr$,
    30, 30, 4, 3,
    'Japonaise', 'appetizer',
    ARRAY['japonais','sushi','thon cru','nobu','fusion','frit','crispy rice','izakaya'],
    'manual',
    'https://www.instagram.com/p/DHbc_FsPtSF/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Riz à sushi
    (v_recipe_id, 'riz à sushi',             400, 'g',          true,  1,  'cru'),
    (v_recipe_id, 'eau',                     540, 'ml',         true,  2,  'pour la cuisson du riz'),
    (v_recipe_id, 'kombu',                   1,   'unité',      true,  3,  'un carré d''environ 8 cm de côté'),
    (v_recipe_id, 'vinaigre de riz',         60,  'ml',         true,  4,  NULL),
    (v_recipe_id, 'sucre',                   30,  'g',          true,  5,  '2 c. à soupe'),
    (v_recipe_id, 'sel',                     5,   'g',          true,  6,  '1 c. à café'),
    (v_recipe_id, 'huile végétale',          1000, 'ml',        true,  7,  'neutre, pour friture profonde'),
    -- Tartare de thon
    (v_recipe_id, 'thon frais',              340, 'g',          true,  8,  'qualité sashimi, haché finement au couteau'),
    (v_recipe_id, 'oignon vert',             1,   'unité',      true,  9,  'tranché fin'),
    (v_recipe_id, 'gingembre',               5,   'g',          true,  10, 'râpé'),
    (v_recipe_id, 'sauce soja',              10,  'ml',         true,  11, '2 c. à café'),
    (v_recipe_id, 'huile de sésame',         5,   'ml',         true,  12, '1 c. à café'),
    (v_recipe_id, 'jus de yuzu',             10,  'ml',         true,  13, '2 c. à café'),
    (v_recipe_id, 'mayonnaise japonaise',    45,  'ml',         true,  14, '3 c. à soupe, type Kewpie'),
    (v_recipe_id, 'sriracha',                45,  'ml',         true,  15, '3 c. à soupe, ajuster au goût'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  16, 'pour le tartare, au goût'),
    -- Garniture
    (v_recipe_id, 'ciboulette',              1,   'c. à soupe', false, 17, 'ciselée, garniture');

  -- =====================================================================
  -- 3. Don't Worry Rice Bowl (viral chinois 10 min)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Don''t Worry Rice Bowl',
    'Bol de riz chinois viral surnommé « I''m Good, Don''t Worry » (我没事) : bœuf haché sauté, œufs cuits directement dans la poêle, sauce soja-huître-vinaigre-sucre liée à la fécule. Prêt en 10 min, réconfortant et complet : la recette doudou des soirs où l''on n''a plus d''énergie.',
    $instr$["Sauce : mélanger dans un bol la sauce soja, la sauce soja foncée, la sauce huître, le vinaigre de riz, le sucre et l'eau. Réserver. Délayer à part la fécule de maïs dans son eau.",
"Chauffer l'huile dans une poêle ou un wok à feu vif. Ajouter le bœuf haché (ou le poulet haché) et le faire sauter en cassant les amas, jusqu'à coloration. Saler, poivrer. Si on le souhaite, verser un trait de bouillon de poulet relevé d'un peu de vinaigre de riz.",
"Faire de la place au centre de la poêle. Casser les 3 œufs directement dedans et les cuire au choix : brouillés moelleux ou au plat à jaune coulant.",
"Verser la sauce sur l'ensemble, puis ajouter la fécule délayée pour épaissir. Bien mélanger pour enrober la viande et les œufs.",
"Servir immédiatement sur un bol de riz cuit chaud."]
$instr$,
    5, 10, 1, 1,
    'Chinoise', 'lunch',
    ARRAY['chinois','viral','rice bowl','bœuf','œuf','rapide','comfort food'],
    'manual',
    'https://www.instagram.com/p/DHCLnKzvazd/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',              200, 'g',          true,  1,  'ou poulet haché'),
    (v_recipe_id, 'œufs',                    3,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'bouillon de poulet',      15,  'ml',         false, 3,  'optionnel'),
    (v_recipe_id, 'vinaigre de riz',         2.5, 'ml',         false, 4,  'optionnel, avec le bouillon'),
    (v_recipe_id, 'huile végétale',          15,  'ml',         true,  5,  '1 c. à soupe'),
    (v_recipe_id, 'riz cuit',                200, 'g',          true,  6,  '1 bol, chaud'),
    -- Sauce
    (v_recipe_id, 'sauce soja',              15,  'ml',         true,  7,  '1 c. à soupe'),
    (v_recipe_id, 'sauce soja foncée',       5,   'ml',         true,  8,  '1 c. à café'),
    (v_recipe_id, 'sauce huître',            5,   'ml',         true,  9,  '1 c. à café'),
    (v_recipe_id, 'vinaigre de riz',         2.5, 'ml',         true,  10, '0,5 c. à café'),
    (v_recipe_id, 'sucre',                   2.5, 'g',          true,  11, '0,5 c. à café'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  12, 'pour la sauce'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  13, 'au goût'),
    (v_recipe_id, 'poivre noir',             1,   'pincée',     true,  14, 'au goût'),
    -- Liaison
    (v_recipe_id, 'fécule de maïs',          7.5, 'g',          true,  15, '0,5 c. à soupe'),
    (v_recipe_id, 'eau',                     15,  'ml',         true,  16, '1 c. à soupe, pour délayer la fécule');

  -- =====================================================================
  -- 4. Sushi Bake (fusion japonais × philippin)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Sushi Bake',
    'Sushi déconstruit cuit au four (très populaire aux Philippines, fusion sushi-américaine) : un lit de riz à sushi vinaigré, un tartare crémeux crabe-thon-mayonnaise-sriracha, gratiné sous le gril. Finition sauce unagi, furikake et avocat, à partager à la cuillère.',
    $instr$["Cuire le riz à sushi. Mélanger le vinaigre de riz, le sucre et le sel dans un bol jusqu'à dissolution complète.",
"Verser le mélange vinaigré en éventail sur le riz cuit et mélanger délicatement à la spatule. Réserver.",
"Émincer la partie blanche des oignons verts. Effilocher les bâtonnets de surimi à la fourchette (ou émietter la chair de crabe).",
"Dans un bol, mélanger le surimi effiloché, le thon égoutté, la mayonnaise, la sriracha, l'huile de sésame, le sel et les oignons verts émincés, jusqu'à obtenir une texture homogène et crémeuse.",
"Étaler le riz dans un plat allant au four (plat à lasagnes ou cocotte basse). Tasser légèrement. Recouvrir d'une couche uniforme du mélange crabe-thon.",
"Passer sous le gril du four, en position haute, jusqu'à ce que le dessus soit bien doré (5 à 8 min selon le four).",
"Servir chaud, arroser de sauce unagi et parsemer de furikake. Garniture : avocat en dés, vert des oignons verts ciselé, graines de sésame.",
"Se mange à la cuillère ou dans des feuilles de nori croustillantes, comme de petits tacos."]
$instr$,
    15, 30, 6, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','philippin','fusion','sushi bake','crabe','thon','gratiné','partage'],
    'manual',
    'https://www.instagram.com/p/DHRAqMOu1Ww/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Riz à sushi
    (v_recipe_id, 'riz à sushi',             400, 'g',          true,  1,  'cru, à cuire au préalable'),
    (v_recipe_id, 'vinaigre de riz',         30,  'ml',         true,  2,  '2 c. à soupe'),
    (v_recipe_id, 'sucre',                   15,  'g',          true,  3,  '1 c. à soupe'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  4,  'pour le riz'),
    -- Tartare crabe-thon
    (v_recipe_id, 'bâtonnets de surimi',     8,   'unité',      true,  5,  'ou 140 g de chair de crabe'),
    (v_recipe_id, 'thon en boîte',           150, 'g',          true,  6,  '1 boîte, égoutté'),
    (v_recipe_id, 'oignons verts',           2,   'unité',      true,  7,  'blancs émincés, verts réservés pour la garniture'),
    (v_recipe_id, 'mayonnaise',              60,  'ml',         true,  8,  'idéalement japonaise (type Kewpie)'),
    (v_recipe_id, 'sriracha',                30,  'ml',         true,  9,  '2 c. à soupe'),
    (v_recipe_id, 'huile de sésame',         5,   'ml',         true,  10, '1 c. à café'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  11, 'pour le tartare, au goût'),
    -- Garniture
    (v_recipe_id, 'sauce unagi',             30,  'ml',         false, 12, 'eel sauce, 2 c. à soupe, finition'),
    (v_recipe_id, 'furikake',                10,  'g',          false, 13, '2 c. à soupe, finition'),
    (v_recipe_id, 'avocat',                  1,   'unité',      false, 14, 'en dés, optionnel'),
    (v_recipe_id, 'graines de sésame',       1,   'c. à soupe', false, 15, 'garniture');

  -- =====================================================================
  -- 5. Cheung Fun aux Crevettes (Express)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Cheung Fun aux Crevettes (Express)',
    'Version express du cheung fun cantonais : la pâte de riz traditionnelle est remplacée par des galettes de riz vietnamiennes trempées, garnies de crevettes marinées et de cébette, roulées puis cuites à la vapeur. Sauce soja-huître-sésame-bouillon. Prêt en 25 min contre 1 h pour la version classique.',
    $instr$["Décortiquer les crevettes. Les faire mariner avec le sel, le poivre, le bouillon de poulet, le vinaigre de cidre et l'huile de sésame. Réserver 10 minutes.",
"Préparer la sauce : mélanger dans un bol le sucre, la sauce soja, l'huile de sésame, la sauce huître, la sauce soja foncée et le bouillon (ou de l'eau) jusqu'à dissolution complète. Réserver.",
"Tremper rapidement une galette de riz dans l'eau tiède (juste assez pour la ramollir, pas trop sinon elle se déchire).",
"Poser la galette à plat sur un plan humide. Disposer 4 crevettes au centre alignées en ligne, parsemer d'un peu de cébette ciselée.",
"Replier les côtés de la galette puis rouler délicatement comme un rouleau de printemps serré.",
"Badigeonner le rouleau d'huile neutre (évite qu'il colle au panier vapeur).",
"Déposer dans un panier vapeur (chemisé de papier sulfurisé ou de feuilles de laitue). Cuire à la vapeur 5 minutes.",
"Disposer les cheung fun sur une assiette creuse, napper généreusement de sauce. Servir immédiatement."]
$instr$,
    15, 10, 6, 2,
    'Chinoise', 'appetizer',
    ARRAY['chinois','cantonais','cheung fun','dim sum','crevettes','vapeur','rapide'],
    'manual',
    'https://www.instagram.com/p/DHGQH4ZIASP/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade crevettes
    (v_recipe_id, 'crevettes crues',         24,  'unité',      true,  1,  'décortiquées, 4 par rouleau'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  2,  'marinade'),
    (v_recipe_id, 'poivre noir',             1,   'pincée',     true,  3,  'marinade'),
    (v_recipe_id, 'bouillon de poulet',      1,   'c. à café',  true,  4,  'marinade'),
    (v_recipe_id, 'vinaigre de cidre',       0.25, 'c. à café', true,  5,  'marinade'),
    (v_recipe_id, 'huile de sésame',         5,   'ml',         true,  6,  '1 c. à café, marinade'),
    -- Roulage
    (v_recipe_id, 'cébette',                 1,   'unité',      true,  7,  'ciselée'),
    (v_recipe_id, 'galettes de riz',         6,   'unité',      true,  8,  'grandes, vietnamiennes'),
    (v_recipe_id, 'huile neutre',            15,  'ml',         true,  9,  'pour badigeonner'),
    -- Sauce
    (v_recipe_id, 'sucre',                   5,   'g',          true,  10, '1 c. à café'),
    (v_recipe_id, 'sauce soja',              30,  'ml',         true,  11, '2 c. à soupe'),
    (v_recipe_id, 'huile de sésame',         15,  'ml',         true,  12, '1 c. à soupe, pour la sauce'),
    (v_recipe_id, 'sauce huître',            15,  'ml',         true,  13, '1 c. à soupe'),
    (v_recipe_id, 'sauce soja foncée',       5,   'ml',         true,  14, '1 c. à café'),
    (v_recipe_id, 'bouillon de poulet',      50,  'ml',         true,  15, 'pour la sauce, ou eau');

  -- =====================================================================
  -- 6. Crispy Rice Salad (Creamy Satay)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Crispy Rice Salad (Creamy Satay)',
    'Salade gourmande : épinards frais, œuf dur, protéines maigres (poulet grillé, kebab végétal ou tofu fumé) et riz croustillant à l''air fryer, une alternative légère aux croûtons. Sauce satay crémeuse au fromage blanc, beurre de cacahuète en poudre et miel. Environ 600 kcal par portion.',
    $instr$["Riz croustillant (pour 4 portions) : mettre 200 g de riz cuit dans l'air fryer. Ajouter 1 c. à soupe d'huile de sésame et bien mélanger.",
"Cuire à 200 °C pendant 10-12 min, en secouant le panier toutes les 3-4 min, jusqu'à ce que le riz soit doré et croustillant. (Variantes : au four à 200 °C pendant 15-18 min en remuant à mi-cuisson, ou à la poêle avec l'huile de sésame, 10 min à feu moyen en remuant.)",
"Sauce satay crémeuse (environ 6 portions, ~250 g) : fouetter ensemble le fromage blanc, le beurre de cacahuète en poudre, la mayonnaise allégée, le vinaigre de riz, la sauce soja, le miel, le gingembre en poudre, le paprika fumé et le jus de citron vert jusqu'à obtenir une crème lisse. Réserver au frais (se garde 5 jours ; le surplus sert pour un autre repas).",
"Assemblage, pour chaque portion : déposer 80 g d'épinards frais dans un bol.",
"Ajouter un œuf dur coupé en deux et 100 g de protéines (blanc de poulet grillé, kebab végétal ou tofu fumé).",
"Parsemer généreusement de riz croustillant (50 g par portion).",
"Arroser de 40 g de sauce satay. Servir immédiatement (le riz perd son croustillant s'il reste dans la sauce)."]
$instr$,
    10, 15, 4, 1,
    'Asiatique', 'lunch',
    ARRAY['asiatique','fusion','salade','crispy rice','satay','healthy','protéines','air fryer'],
    'manual',
    'https://www.instagram.com/p/DF5gH11oeu4/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Salade (4 portions)
    (v_recipe_id, 'épinards frais',          320, 'g',          true,  1,  '80 g par portion'),
    (v_recipe_id, 'œufs',                    4,   'unité',      true,  2,  'cuits durs, coupés en deux'),
    (v_recipe_id, 'blanc de poulet',         400, 'g',          true,  3,  'grillé ; ou kebab végétal ou tofu fumé, 100 g par portion'),
    -- Riz croustillant (4 portions, 50 g par portion)
    (v_recipe_id, 'riz cuit',                200, 'g',          true,  4,  'pour le riz croustillant'),
    (v_recipe_id, 'huile de sésame',         15,  'ml',         true,  5,  '1 c. à soupe, pour le riz croustillant'),
    -- Sauce satay crémeuse (environ 6 portions de 40 g)
    (v_recipe_id, 'fromage blanc',           125, 'g',          true,  6,  '0 % de matières grasses'),
    (v_recipe_id, 'beurre de cacahuète en poudre', 25, 'g',     true,  7,  'déshuilé, type PB2'),
    (v_recipe_id, 'mayonnaise allégée',      30,  'g',          true,  8,  NULL),
    (v_recipe_id, 'vinaigre de riz',         45,  'ml',         true,  9,  NULL),
    (v_recipe_id, 'sauce soja claire',       30,  'ml',         true,  10, NULL),
    (v_recipe_id, 'miel',                    40,  'g',          true,  11, NULL),
    (v_recipe_id, 'gingembre en poudre',     2,   'g',          true,  12, NULL),
    (v_recipe_id, 'paprika fumé',            1,   'g',          true,  13, NULL),
    (v_recipe_id, 'jus de citron vert',      10,  'ml',         true,  14, NULL);

  -- =====================================================================
  -- 7. Salade de Smashed Potatoes
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Salade de Smashed Potatoes',
    'Salade fraîche de petites pommes de terre cuites à l''eau, écrasées puis rôties au four jusqu''à être ultra-croustillantes (le paprika fumé et le beurre fondu font la différence). Sauce crémeuse au yaourt grec et aux deux moutardes, avec concombre, échalote et herbes fraîches.',
    $instr$["Cuire les petites pommes de terre entières dans une grande casserole d'eau salée, jusqu'à ce qu'elles soient très tendres sous la pointe du couteau (~15-20 min).",
"Égoutter et étaler sur un plat allant au four. Écraser chaque pomme de terre avec le fond d'un verre ou d'une casserole (pour exposer un maximum de surface à la chaleur).",
"Badigeonner d'huile d'olive et de beurre fondu (le mélange des deux donne un maximum de croustillant). Saler, poivrer généreusement et saupoudrer de paprika fumé.",
"Enfourner à 200 °C pendant 30 minutes (les bords doivent être très dorés et croustillants).",
"Pendant la cuisson, préparer la sauce : dans un grand bol, mélanger le yaourt grec (ou le fromage blanc), la mayonnaise, la moutarde de Dijon, la moutarde à l'ancienne, le concombre en petits dés, l'échalote ciselée, l'aneth, la ciboulette et le persil hachés, le jus de citron, du sel et du poivre.",
"Sortir les pommes de terre du four et les laisser tiédir 5-10 minutes (sinon le yaourt cuit à leur contact).",
"Ajouter les pommes de terre croustillantes tièdes à la sauce et mélanger délicatement pour bien les enrober sans les casser. Goûter, rectifier le sel et le citron.",
"Servir tiède ou à température ambiante, parsemer d'un peu d'herbes fraîches en finition."]
$instr$,
    15, 45, 4, 1,
    'Française', 'lunch',
    ARRAY['français','salade','pommes de terre','smashed','yaourt grec','moutarde','fraîche','herbes'],
    'manual',
    'https://www.instagram.com/p/C7mT_AotjTB/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Pommes de terre rôties
    (v_recipe_id, 'pommes de terre grenaille', 500, 'g',         true,  1,  'ou petites pommes de terre nouvelles'),
    (v_recipe_id, 'huile d''olive',           30,  'ml',         true,  2,  'pour badigeonner'),
    (v_recipe_id, 'beurre',                   30,  'g',          true,  3,  'fondu'),
    (v_recipe_id, 'sel',                      1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'poivre noir',              1,   'pincée',     true,  5,  NULL),
    (v_recipe_id, 'paprika fumé',             0.5, 'c. à café',  true,  6,  NULL),
    -- Sauce + salade
    (v_recipe_id, 'yaourt grec',              200, 'g',          true,  7,  'ou fromage blanc'),
    (v_recipe_id, 'mayonnaise',               5,   'ml',         true,  8,  '1 c. à café'),
    (v_recipe_id, 'moutarde de Dijon',        5,   'g',          true,  9,  '1 c. à café'),
    (v_recipe_id, 'moutarde à l''ancienne',   5,   'g',          true,  10, '1 c. à café'),
    (v_recipe_id, 'concombre',                0.5, 'unité',      true,  11, '~150 g, en petits dés'),
    (v_recipe_id, 'échalote',                 1,   'unité',      true,  12, 'ciselée'),
    (v_recipe_id, 'aneth',                    5,   'g',          true,  13, 'haché'),
    (v_recipe_id, 'ciboulette',               5,   'g',          true,  14, 'ciselée'),
    (v_recipe_id, 'persil',                   5,   'g',          true,  15, 'haché'),
    (v_recipe_id, 'jus de citron',            15,  'ml',         true,  16, '1 c. à soupe');

  -- =====================================================================
  -- 8. Murtabak (SE Asian flatbread farci)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Murtabak',
    'Crêpe fourrée de street food, populaire en Indonésie, en Malaisie, à Singapour, en Arabie saoudite et au Yémen, souvent servie pendant le ramadan (suhoor, iftar). Pâte fine et étirée, garniture de poulet haché aux épices indiennes, œufs, oignons verts et mozzarella, repliée en carré et poêlée jusqu''à ce qu''elle soit dorée.',
    $instr$["Pâte : mélanger la farine, le sel, l'huile (ou le ghee) et l'eau chaude. Pétrir 5 minutes jusqu'à obtenir une pâte souple. Couvrir et laisser reposer au moins 1 heure (l'étape clé pour pouvoir l'étirer finement).",
"Garniture : faire revenir l'oignon haché dans l'huile jusqu'à ce qu'il soit fondant. Ajouter la pâte gingembre-ail, le concentré de tomate et les épices (piment, cumin, coriandre, garam masala, sel). Cuire 2 minutes.",
"Ajouter le poulet haché et cuire 10-12 minutes, jusqu'à cuisson complète. (Avec du bœuf ou de l'agneau haché : 15-20 min.)",
"Laisser refroidir complètement, puis incorporer les œufs battus, la coriandre fraîche et les oignons verts.",
"Diviser la pâte en 8 portions et former 8 boules. Sur un plan huilé, étaler chaque boule en feuille très fine (presque translucide) au rouleau huilé ou à la main.",
"Déposer ~2 c. à soupe de garniture au centre, surmonter de 1 c. à soupe de mozzarella râpée.",
"Plier les bords de la pâte sur la garniture comme une enveloppe, en pressant doucement pour aplatir.",
"Poêler avec un peu d'huile à feu moyen-doux 3-4 minutes par face, y compris les bords, jusqu'à doré uniforme. Servir chaud."]
$instr$,
    30, 30, 8, 3,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','indonésien','singapourien','street food','ramadan','iftar','galette','farci','poulet haché'],
    'manual',
    'https://www.instagram.com/p/DHGfWbao8YV/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Pâte (pour 8 murtabaks)
    (v_recipe_id, 'farine',                   360, 'g',          true,  1,  'pour la pâte'),
    (v_recipe_id, 'huile',                    60,  'ml',         true,  2,  '4 c. à soupe, ou ghee, pour la pâte'),
    (v_recipe_id, 'sel',                      2.5, 'g',          true,  3,  '0,5 c. à café, pour la pâte'),
    (v_recipe_id, 'eau',                      240, 'ml',         true,  4,  'chaude, pour la pâte'),
    -- Garniture
    (v_recipe_id, 'huile',                    30,  'ml',         true,  5,  '2 c. à soupe, pour la garniture'),
    (v_recipe_id, 'oignon',                   1,   'unité',      true,  6,  'petit, haché finement'),
    (v_recipe_id, 'poulet haché',             400, 'g',          true,  7,  'ou bœuf ou agneau haché (cuisson plus longue)'),
    (v_recipe_id, 'pâte gingembre-ail',       5,   'ml',         true,  8,  '1 c. à café'),
    (v_recipe_id, 'concentré de tomate',      15,  'g',          true,  9,  '1 c. à soupe'),
    (v_recipe_id, 'piment rouge moulu',       1,   'c. à café',  false, 10, 'optionnel'),
    (v_recipe_id, 'cumin moulu',              1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'coriandre moulue',         1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'garam masala',             0.5, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'sel',                      1,   'c. à café',  true,  14, 'pour la garniture, au goût'),
    (v_recipe_id, 'œufs',                     3,   'unité',      true,  15, '2 à 3, dans la garniture refroidie'),
    (v_recipe_id, 'oignons verts',            2,   'unité',      true,  16, 'ciselés'),
    (v_recipe_id, 'coriandre fraîche',        10,  'g',          true,  17, '2 c. à soupe hachée'),
    (v_recipe_id, 'mozzarella râpée',         100, 'g',          true,  18, 'environ 1 c. à soupe par murtabak'),
    (v_recipe_id, 'huile',                    30,  'ml',         true,  19, 'pour la poêle');

  -- =====================================================================
  -- 9. Korean Fried Chicken
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Korean Fried Chicken',
    'Le poulet frit à la coréenne : bouchées de poulet désossé, marinade sel-poivre-sésame, pâte à la fécule de pomme de terre et à la fécule de maïs (le secret du croustillant), double friture à 175 °C puis 215 °C. Glaçage gochujang-miel-ketchup-vinaigre de riz : croustillant dehors, juteux dedans.',
    $instr$["Couper les cuisses désossées en bouchées (~2,5 cm). Assaisonner avec le sel, le poivre blanc, la poudre d'ail et l'huile de sésame. Laisser mariner 30 minutes au frais.",
"Dans un bol, mélanger la fécule de pomme de terre, la fécule de maïs et une pincée de sel. Incorporer progressivement l'eau jusqu'à obtenir une consistance légèrement plus liquide qu'une pâte à pancakes.",
"Verser le poulet mariné dans la pâte et laisser reposer 15 minutes (la pâte adhère mieux).",
"Premier bain : chauffer l'huile à 175 °C. Frire le poulet 6-7 minutes : même s'il paraît pâle, c'est ici que l'intérieur cuit.",
"Égoutter sur une grille et laisser reposer 5 minutes.",
"Second bain : monter l'huile à 215 °C. Replonger le poulet 3 minutes, jusqu'à ce qu'il soit bien doré et croustillant. Égoutter à nouveau.",
"Sauce : dans une petite poêle, mélanger le gochujang, le ketchup, le miel, l'ail haché et le vinaigre de riz. Laisser mijoter à feu doux jusqu'à ce que la sauce épaississe légèrement et devienne sirupeuse.",
"Hors du feu, enrober le poulet croustillant de sauce (elle caramélise au contact du poulet chaud).",
"Servir immédiatement dans un bol, parsemer de graines de sésame et d'oignons verts ciselés."]
$instr$,
    50, 25, 2, 3,
    'Coréenne', 'appetizer',
    ARRAY['coréen','poulet','frit','gochujang','double friture','sucré-piquant','street food'],
    'manual',
    'https://www.instagram.com/p/DIMMX5hOOw_/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Poulet et marinade
    (v_recipe_id, 'cuisses de poulet désossées', 300, 'g',          true,  1,  '2 cuisses, en bouchées de 2,5 cm'),
    (v_recipe_id, 'sel',                         1,   'pincée',     true,  2,  'au goût, marinade'),
    (v_recipe_id, 'poivre blanc moulu',          0.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'poudre d''ail',               0.5, 'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'huile de sésame',             5,   'ml',         true,  5,  '1 c. à café, marinade'),
    -- Pâte d'enrobage
    (v_recipe_id, 'fécule de pomme de terre',    80,  'g',          true,  6,  NULL),
    (v_recipe_id, 'fécule de maïs',              30,  'g',          true,  7,  NULL),
    (v_recipe_id, 'sel',                         1,   'pincée',     true,  8,  'pour la pâte'),
    (v_recipe_id, 'eau',                         80,  'ml',         true,  9,  'ajuster selon la consistance'),
    (v_recipe_id, 'huile végétale',              1000, 'ml',        true,  10, 'pour la friture'),
    -- Sauce
    (v_recipe_id, 'gochujang',                   30,  'g',          true,  11, '2 c. à soupe'),
    (v_recipe_id, 'ketchup',                     15,  'ml',         true,  12, '1 c. à soupe'),
    (v_recipe_id, 'miel',                        30,  'g',          true,  13, '2 c. à soupe'),
    (v_recipe_id, 'ail',                         2,   'gousse',     true,  14, 'hachées'),
    (v_recipe_id, 'vinaigre de riz',             15,  'ml',         true,  15, '1 c. à soupe'),
    -- Garniture
    (v_recipe_id, 'graines de sésame',           1,   'c. à soupe', false, 16, 'garniture'),
    (v_recipe_id, 'oignons verts',               1,   'unité',      false, 17, 'ciselés, garniture');

  -- =====================================================================
  -- 10. Beef Hor Fun (Black Bean Sauce)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Beef Hor Fun (Black Bean Sauce)',
    'Plat classique du tze char cantonais, devenu une institution à Singapour : des nouilles de riz plates (hor fun) saisies à feu très vif au wok pour le « wok hei » (parfum de braise), nappées d''une sauce au bœuf, aux haricots noirs fermentés et à l''ail, avec œuf et choy sum. Tout se fait dans un seul wok, comme dans les échoppes de rue.',
    $instr$["Faire mariner 15 minutes le bœuf émincé avec la sauce soja, le bouillon de poulet, le vinaigre de cidre et la fécule de maïs (la fécule garde la viande tendre).",
"Tremper les haricots noirs fermentés (dou si) 5 min dans un peu d'eau, égoutter et écraser grossièrement à la fourchette.",
"Saisir les nouilles à sec dans un wok très chaud avec la sauce soja foncée, jusqu'à de légères marques grillées (le wok hei). Réserver sur l'assiette de service.",
"Chauffer l'huile dans le wok à feu très vif. Faire revenir l'ail haché et les haricots noirs écrasés 30 secondes, jusqu'à ce qu'ils embaument.",
"Ajouter le bœuf mariné et le faire sauter 1-2 minutes, jusqu'à ce qu'il soit juste rosé. Retirer le bœuf en gardant les sucs.",
"Ajouter le choy sum (couper les tiges trop longues) et faire sauter 1 min. Verser la sauce soja, la sauce huître, la sauce de poisson et la sauce soja foncée (optionnelle), plus un peu d'eau si besoin. Saler.",
"Casser l'œuf dans le wok et le brouiller rapidement.",
"Verser la fécule de pomme de terre délayée dans l'eau pour épaissir la sauce jusqu'à ce qu'elle soit nappante.",
"Remettre le bœuf et mélanger quelques secondes à feu vif. Verser le tout sur les nouilles. Servir immédiatement."]
$instr$,
    15, 15, 2, 3,
    'Chinoise', 'dinner',
    ARRAY['chinois','cantonais','singapourien','tze char','hor fun','bœuf','black bean','wok hei','nouilles'],
    'manual',
    'https://www.instagram.com/p/DJRx7YjyYQu/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Nouilles
    (v_recipe_id, 'nouilles de riz plates',   300, 'g',          true,  1,  'fraîches (hor fun)'),
    (v_recipe_id, 'sauce soja foncée',        15,  'ml',         true,  2,  '1 c. à soupe, pour saisir les nouilles'),
    -- Marinade bœuf
    (v_recipe_id, 'bœuf émincé',              160, 'g',          true,  3,  'tranches fines'),
    (v_recipe_id, 'sauce soja',               5,   'ml',         true,  4,  '1 c. à café, marinade'),
    (v_recipe_id, 'bouillon de poulet',       1,   'c. à café',  true,  5,  'marinade'),
    (v_recipe_id, 'vinaigre de cidre',        0.25, 'c. à café', true,  6,  'marinade'),
    (v_recipe_id, 'fécule de maïs',           2.5, 'g',          true,  7,  '1 c. à café, marinade'),
    -- Sauce et sauté
    (v_recipe_id, 'huile',                    30,  'ml',         true,  8,  '2 c. à soupe'),
    (v_recipe_id, 'ail',                      3,   'gousse',     true,  9,  'hachées'),
    (v_recipe_id, 'haricots noirs fermentés', 15,  'g',          true,  10, '1 c. à soupe, trempés et écrasés'),
    (v_recipe_id, 'choy sum',                 2,   'unité',      true,  11, 'pieds, coupés en tronçons'),
    (v_recipe_id, 'œuf',                      1,   'unité',      true,  12, NULL),
    (v_recipe_id, 'sauce soja',               15,  'ml',         true,  13, '~1 c. à soupe, au goût'),
    (v_recipe_id, 'sauce huître',             5,   'ml',         true,  14, '1 c. à café'),
    (v_recipe_id, 'sauce de poisson',         5,   'ml',         true,  15, '1 c. à café'),
    (v_recipe_id, 'sauce soja foncée',        5,   'ml',         false, 16, '1 c. à café, optionnel, pour la couleur'),
    (v_recipe_id, 'sel',                      1,   'pincée',     true,  17, 'au goût'),
    -- Liaison
    (v_recipe_id, 'fécule de pomme de terre', 15,  'g',          true,  18, '1 c. à soupe, pour lier la sauce'),
    (v_recipe_id, 'eau',                      15,  'ml',         true,  19, '1 c. à soupe, pour délayer la fécule');

  -- =====================================================================
  -- 11. Garlic Steak Fried Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Garlic Steak Fried Rice',
    'Riz frit chinois au steak et à l''ail frit : l''ail est frit dans l''huile jusqu''à être doré, puis cette huile parfumée sert à saisir le bœuf ; le riz de la veille est sauté avec de l''oignon et deux sauces soja, sucrée et salée. La moitié de l''ail va dans le riz, l''autre sert de garniture.',
    $instr$["Faire mariner 15 minutes le steak en cubes avec la sauce soja, le bouillon de poulet, le vinaigre de cidre et la fécule de maïs.",
"Mélanger les ingrédients de la sauce (sauce soja foncée, sauce soja claire, sucre, sauce huître, poivre blanc, glutamate si utilisé) dans un petit bol.",
"Chauffer l'huile dans une poêle ou un wok à feu moyen-vif. Faire frire l'ail haché 3 minutes jusqu'à ce qu'il soit doré (attention, il brûle vite à la fin). Le retirer à l'écumoire et réserver, en gardant l'huile d'ail dans la poêle.",
"Dans l'huile d'ail, saisir le bœuf 2 minutes à feu vif pour le colorer rapidement. Réserver.",
"Ajouter l'oignon dans la même poêle et le faire sauter 1 minute. Verser le riz froid et casser les amas avec la spatule. Verser la sauce et bien mélanger.",
"Remettre le steak et la moitié de l'ail frit dans la poêle. Faire sauter pour réchauffer.",
"Servir dans un bol, surmonté du reste de l'ail frit et d'oignons verts ciselés."]
$instr$,
    20, 15, 2, 2,
    'Chinoise', 'lunch',
    ARRAY['chinois','riz frit','bœuf','steak','ail','wok','rapide'],
    'manual',
    'https://www.instagram.com/p/DKUacBZuNdN/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade steak
    (v_recipe_id, 'steak',                    170, 'g',          true,  1,  'en cubes de 1,25 cm'),
    (v_recipe_id, 'sauce soja',               5,   'ml',         true,  2,  '1 c. à café, marinade'),
    (v_recipe_id, 'bouillon de poulet',       1,   'c. à café',  true,  3,  'marinade'),
    (v_recipe_id, 'vinaigre de cidre',        0.25, 'c. à café', true,  4,  'marinade'),
    (v_recipe_id, 'fécule de maïs',           2.5, 'g',          true,  5,  '0,5 c. à café, marinade'),
    -- Sauté
    (v_recipe_id, 'oignon jaune',             0.5, 'unité',      true,  6,  'en dés'),
    (v_recipe_id, 'ail',                      4,   'gousse',     true,  7,  'hachées'),
    (v_recipe_id, 'huile neutre',             30,  'ml',         true,  8,  'pour frire l''ail'),
    (v_recipe_id, 'riz cuit',                 400, 'g',          true,  9,  'froid, de la veille (essentiel)'),
    -- Sauce
    (v_recipe_id, 'sauce soja foncée',        15,  'ml',         true,  10, '1 c. à soupe'),
    (v_recipe_id, 'sauce soja claire',        15,  'ml',         true,  11, '1 c. à soupe'),
    (v_recipe_id, 'sucre',                    5,   'g',          true,  12, '1 c. à café'),
    (v_recipe_id, 'sauce huître',             5,   'ml',         true,  13, '1 c. à café'),
    (v_recipe_id, 'poivre blanc moulu',       0.25, 'c. à café', true,  14, NULL),
    (v_recipe_id, 'glutamate monosodique',    1,   'pincée',     false, 15, 'optionnel'),
    -- Garniture
    (v_recipe_id, 'oignons verts',            1,   'unité',      false, 16, 'ciselés, garniture');

  -- =====================================================================
  -- 12. Spicy Salmon Musubi
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Spicy Salmon Musubi',
    'Musubi (bouchée de riz hawaïenne d''inspiration japonaise) au saumon épicé : riz japonais pressé, mayonnaise japonaise au citron, sucre, sriracha et masago, saumon poêlé doré sur les deux faces, mayonnaise caramélisée au chalumeau. Le tout enveloppé d''une demi-feuille de nori.',
    $instr$["Laver le riz à grande eau jusqu'à ce que l'eau ressorte claire. Le cuire au cuiseur à riz.",
"Couper les filets de saumon en morceaux de la taille du moule à musubi (rectangles d'environ 10 x 6 cm). Pour un musubi plus fin, les trancher en deux dans l'épaisseur. Assaisonner légèrement de sel et de poivre.",
"Cuire le saumon à feu moyen-doux 3-4 minutes par face, jusqu'à ce qu'il soit doré sur toutes les faces. Réserver.",
"Préparer la sauce : mélanger dans un bol la mayonnaise japonaise, le jus de citron (ou de citron vert), le sucre, la sriracha et le masago.",
"Couper les 4 feuilles de nori en deux (8 demi-feuilles).",
"Assembler chaque musubi : remplir le moule à musubi aux 2/3 de riz cuit. Tasser légèrement avec le presse-riz. Saupoudrer de furikake. Tasser fermement, puis démouler en appuyant sur le presse-riz tout en soulevant le cadre.",
"Étaler une couche de mayonnaise épicée sur le riz. Poser le saumon cuit, puis étaler à nouveau de la mayonnaise épicée par-dessus.",
"Passer le chalumeau sur la mayonnaise jusqu'à ce qu'elle soit légèrement grillée (à défaut, 1 à 2 min sous le gril du four).",
"Envelopper d'une demi-feuille de nori (face brillante à l'extérieur, face rugueuse à l'intérieur : c'est elle qui adhère). Servir immédiatement."]
$instr$,
    20, 15, 4, 2,
    'Japonaise', 'snack',
    ARRAY['japonais','hawaïen','musubi','saumon','onigiri','mayo épicée','sriracha','nori'],
    'manual',
    'https://www.instagram.com/p/DK79Dv7yL_G/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Saumon
    (v_recipe_id, 'filets de saumon',         300, 'g',          true,  1,  '2 filets'),
    (v_recipe_id, 'sel',                      1,   'pincée',     true,  2,  NULL),
    (v_recipe_id, 'poivre noir',              1,   'pincée',     true,  3,  NULL),
    -- Mayo épicée
    (v_recipe_id, 'mayonnaise japonaise',     60,  'ml',         true,  4,  'type Kewpie'),
    (v_recipe_id, 'jus de citron',            15,  'ml',         true,  5,  '~0,5 citron, ou citron vert'),
    (v_recipe_id, 'sucre',                    2.5, 'g',          true,  6,  '0,5 c. à café'),
    (v_recipe_id, 'masago',                   15,  'g',          true,  7,  '1 c. à soupe, œufs de capelan'),
    (v_recipe_id, 'sriracha',                 7.5, 'ml',         true,  8,  '0,5 c. à soupe'),
    -- Riz + finition
    (v_recipe_id, 'riz japonais',             250, 'g',          true,  9,  'cru (environ 600 g une fois cuit)'),
    (v_recipe_id, 'feuilles de nori',         4,   'unité',      true,  10, 'coupées en deux'),
    (v_recipe_id, 'furikake',                 30,  'g',          true,  11, NULL);

  -- =====================================================================
  -- 13. Honey Butter Katsu Musubi
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Honey Butter Katsu Musubi',
    'Musubi au katsu (poulet pané croustillant) glacé d''un mélange de miel pimenté (hot honey) et de beurre : deux ingrédients, un maximum d''effet. Posé sur du riz pressé au furikake et enveloppé d''une feuille de nori, entre street food hawaïenne et izakaya japonais.',
    $instr$["Laver le riz et le cuire au cuiseur à riz.",
"Pâte à frire : mélanger dans un bol les œufs, la farine, le paprika, le poivre et le sel. Dans une assiette creuse à part, étaler le panko et le parsemer de persil haché.",
"Aplatir les cuisses de poulet au maillet entre deux films alimentaires, jusqu'à ~1 cm d'épaisseur. Saler et poivrer légèrement.",
"Friture : verser ~1,5 cm d'huile dans une poêle moyenne et chauffer à 165 °C (un peu de panko jeté dans l'huile doit grésiller). Passer chaque cuisse dans la pâte, puis dans le panko (sur les deux faces), puis dans l'huile. Frire jusqu'à ce qu'elles soient dorées des deux côtés. Égoutter sur une grille.",
"Glaçage : dans une petite casserole à feu doux, mélanger le miel pimenté et le beurre jusqu'à ce qu'ils soient bien liés. Retirer du feu.",
"Assembler chaque musubi : remplir le moule à musubi de riz cuit, parsemer de furikake et presser pour former la base.",
"Tremper le katsu dans le glaçage (ou l'en napper). Poser le katsu glacé sur le riz pressé, étaler encore un peu de glaçage et parsemer de furikake.",
"Envelopper d'une feuille de nori. Servir immédiatement, tant que le panko est croustillant."]
$instr$,
    15, 25, 4, 2,
    'Japonaise', 'snack',
    ARRAY['japonais','hawaïen','musubi','katsu','poulet','panko','hot honey','frit','street food'],
    'manual',
    'https://www.instagram.com/p/DLgAsDvyRAl/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Katsu
    (v_recipe_id, 'cuisses de poulet désossées', 4, 'unité',     true,  1,  '4 à 5'),
    (v_recipe_id, 'œufs',                     3,   'unité',      true,  2,  'pour la pâte à frire'),
    (v_recipe_id, 'farine',                   32,  'g',          true,  3,  '4 c. à soupe'),
    (v_recipe_id, 'paprika',                  5,   'g',          true,  4,  '1 c. à café'),
    (v_recipe_id, 'poivre noir',              2.5, 'g',          true,  5,  '0,5 c. à café'),
    (v_recipe_id, 'sel',                      1,   'pincée',     true,  6,  'pour la pâte et le poulet'),
    (v_recipe_id, 'panko',                    100, 'g',          true,  7,  'pour l''enrobage'),
    (v_recipe_id, 'persil frais',             5,   'g',          true,  8,  'haché, mélangé au panko'),
    (v_recipe_id, 'huile neutre',             500, 'ml',         true,  9,  'pour la friture'),
    -- Glaçage miel pimenté et beurre
    (v_recipe_id, 'miel pimenté',             60,  'ml',         true,  10, 'hot honey'),
    (v_recipe_id, 'beurre',                   30,  'g',          true,  11, '2 c. à soupe'),
    -- Assemblage
    (v_recipe_id, 'riz japonais',             250, 'g',          true,  12, 'cru (environ 600 g une fois cuit)'),
    (v_recipe_id, 'furikake',                 30,  'g',          true,  13, NULL),
    (v_recipe_id, 'feuilles de nori',         4,   'unité',      true,  14, 'pour envelopper');

  -- =====================================================================
  -- 14. Crispy Smashed Potato Salad (Chilli Crisp Tahini)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Crispy Smashed Potato Salad (Chilli Crisp Tahini)',
    'Salade de pommes de terre écrasées version fusion asiatique : des Jersey Royals (ou des grenailles) cuites à l''eau, écrasées puis rôties, enrobées d''une sauce crémeuse mayonnaise-yaourt-tahini-chilli crisp-soja-citron vert-gingembre. Finition coriandre, oignons verts et graines de sésame noir et blanc torréfiées.',
    $instr$["Cuire les Jersey Royals (ou d'autres petites pommes de terre nouvelles) dans une grande casserole d'eau salée, jusqu'à ce qu'elles soient très tendres sous la pointe du couteau (~15-20 min).",
"Égoutter et étaler sur une plaque. Écraser chaque pomme de terre avec le fond d'un verre pour exposer un maximum de surface.",
"Badigeonner d'huile d'olive, saler et poivrer. Enfourner à 200 °C pendant 30-35 min, jusqu'à ce qu'elles soient bien dorées et croustillantes sur les bords.",
"Pendant la cuisson, préparer la sauce : fouetter ensemble la mayonnaise, le yaourt grec, le tahini, le chilli crisp, le zeste et le jus du citron vert, la sauce soja, le vinaigre de riz, l'ail et le gingembre finement hachés. Goûter et ajuster la quantité de chilli crisp selon le piquant souhaité.",
"Sortir les pommes de terre du four et les laisser tiédir 5 min.",
"Dans un grand bol, mélanger les pommes de terre tièdes avec la moitié de la sauce. Garnir d'oignons verts ciselés et de coriandre fraîche hachée.",
"Parsemer de graines de sésame noir et blanc torréfiées. Servir le reste de la sauce à part."]
$instr$,
    15, 45, 4, 2,
    'Asiatique', 'lunch',
    ARRAY['asiatique','fusion','salade','smashed potatoes','jersey royal','chilli crisp','tahini','sésame','accompagnement'],
    'manual',
    'https://www.instagram.com/p/DKSJa1GKIML/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Pommes de terre rôties
    (v_recipe_id, 'pommes de terre nouvelles',    750, 'g',          true,  1,  'Jersey Royal idéalement, ou grenailles'),
    (v_recipe_id, 'huile d''olive',               30,  'ml',         true,  2,  'pour badigeonner'),
    (v_recipe_id, 'sel',                          1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'poivre noir',                  1,   'pincée',     true,  4,  NULL),
    -- Sauce chilli crisp tahini
    (v_recipe_id, 'mayonnaise',                   60,  'ml',         true,  5,  '4 c. à soupe'),
    (v_recipe_id, 'yaourt grec',                  60,  'g',          true,  6,  '4 c. à soupe'),
    (v_recipe_id, 'tahini',                       30,  'ml',         true,  7,  '2 c. à soupe'),
    (v_recipe_id, 'chilli crisp',                 10,  'g',          true,  8,  '2 c. à café, ajuster au goût'),
    (v_recipe_id, 'citron vert',                  1,   'unité',      true,  9,  'zeste et jus'),
    (v_recipe_id, 'sauce soja',                   15,  'ml',         true,  10, '1 c. à soupe'),
    (v_recipe_id, 'vinaigre de riz',              15,  'ml',         true,  11, '1 c. à soupe'),
    (v_recipe_id, 'ail',                          1,   'gousse',     true,  12, 'haché finement'),
    (v_recipe_id, 'gingembre',                    15,  'g',          true,  13, 'environ 3 cm, haché finement'),
    -- Garniture
    (v_recipe_id, 'oignons verts',                1,   'unité',      false, 14, 'ciselés, garniture'),
    (v_recipe_id, 'coriandre fraîche',            10,  'g',          false, 15, 'hachée, garniture'),
    (v_recipe_id, 'graines de sésame noir',       1,   'c. à soupe', false, 16, 'torréfiées, garniture'),
    (v_recipe_id, 'graines de sésame',            1,   'c. à soupe', false, 17, 'blanches, torréfiées, garniture');

  -- =====================================================================
  -- 15. Ayam Goreng (Malay Fried Chicken)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Ayam Goreng (Malay Fried Chicken)',
    'Poulet frit malaisien : longue marinade (de 4 h à une nuit) au lait de coco parfumé d''une pâte d''aromates (gingembre, échalotes, ail, citronnelle, piments) et d''épices (curcuma, coriandre, piment, curry). Enrobage farine et fécule, puis friture : bien plus parfumé qu''un poulet frit de fast-food.',
    $instr$["Si le lait de coco est figé, plonger la boîte 5 minutes dans un bol d'eau chaude pour le liquéfier.",
"Mixer ensemble le gingembre, les piments rouges, les échalotes, l'ail et la citronnelle en une pâte fine.",
"Verser le lait de coco dans un grand bol. Ajouter la pâte d'aromates, le jus de citron vert, le sel et la moitié des épices (curry, coriandre, curcuma, piment). Bien mélanger.",
"Aplatir légèrement les morceaux de poulet (notamment les blancs) au maillet pour uniformiser leur épaisseur, puis les ajouter à la marinade.",
"Couvrir et laisser mariner au frais au moins 4 heures (idéalement une nuit).",
"Enrobage : dans un grand bol, mélanger la farine, la fécule de maïs et le reste des épices. Sortir les morceaux de poulet de la marinade, les rouler directement dans ce mélange et secouer l'excédent. Laisser reposer 5 minutes sur une grille (l'enrobage s'hydrate et adhère).",
"Friture : dans un grand wok profond, chauffer l'huile à feu moyen (~170 °C). Tester avec une pincée de farine : elle doit grésiller. Déposer délicatement les morceaux dans l'huile, en les faisant glisser loin de soi.",
"Frire les cuisses 10-12 minutes et les blancs 12-14 minutes, en les retournant à mi-cuisson. Vérifier au thermomètre : 75 °C à cœur.",
"Égoutter sur une grille et laisser reposer 5 minutes. Garnir de coriandre et de piment frais hachés. Servir avec du riz et du sambal."]
$instr$,
    30, 30, 4, 3,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','singapourien','poulet frit','ayam goreng','lait de coco','marinade longue','double enrobage','street food'],
    'manual',
    'https://www.instagram.com/p/DIXHtUbo-ZJ/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Poulet + marinade liquide
    (v_recipe_id, 'poulet entier',              1,   'unité',      true,  1,  'environ 1,5 kg, découpé en morceaux'),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  2,  '1 boîte de 400 ml'),
    -- Pâte d'aromates (à mixer)
    (v_recipe_id, 'gingembre',                  50,  'g',          true,  3,  'pour la pâte'),
    (v_recipe_id, 'piments rouges frais',       2,   'unité',      true,  4,  NULL),
    (v_recipe_id, 'échalotes',                  4,   'unité',      true,  5,  NULL),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  6,  NULL),
    (v_recipe_id, 'citronnelle',                2,   'tige',       true,  7,  'parties blanches'),
    (v_recipe_id, 'citron vert',                2,   'unité',      true,  8,  'jus'),
    -- Épices (moitié dans la marinade, moitié dans l'enrobage)
    (v_recipe_id, 'curry en poudre',            2,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'coriandre moulue',           2,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'curcuma moulu',              2,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'piment rouge moulu',         2,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'sel',                        7.5, 'g',          true,  13, '0,5 c. à soupe'),
    -- Enrobage
    (v_recipe_id, 'farine',                     150, 'g',          true,  14, 'pour l''enrobage'),
    (v_recipe_id, 'fécule de maïs',             150, 'g',          true,  15, 'pour l''enrobage'),
    -- Friture + garniture
    (v_recipe_id, 'huile végétale',             1500, 'ml',        true,  16, 'pour friture profonde'),
    (v_recipe_id, 'coriandre fraîche',          10,  'g',          false, 17, 'garniture'),
    (v_recipe_id, 'piment rouge frais',         1,   'unité',      false, 18, 'haché, garniture');

  -- =====================================================================
  -- 16. Crispy Smashed Cajun Potatoes (Air Fryer)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Crispy Smashed Cajun Potatoes (Air Fryer)',
    'Pommes de terre grenaille précuites à l''eau, entaillées en croix et écrasées, assaisonnées d''un mélange cajun maison (paprika, ail et oignon en poudre, origan, poivre blanc), puis cuites 30 min à l''air fryer jusqu''à être ultra-croustillantes. Servies avec une sauce mayonnaise-ketchup relevée au cajun, à la sauce piquante et au citron.',
    $instr$["Cuire les pommes de terre dans de l'eau salée jusqu'aux trois quarts de leur cuisson (la lame d'un couteau doit encore rencontrer un peu de résistance). Égoutter.",
"Préparer le mélange cajun : mélanger dans un petit bol le paprika, la poudre d'ail, le sel, la poudre d'oignon, l'origan séché et le poivre blanc. En réserver 1 c. à soupe pour la sauce.",
"Sur une planche, faire deux entailles en croix sur le dessus de chaque pomme de terre, puis les écraser avec le fond d'un verre (pas trop fort, sinon elles éclatent).",
"Les mettre dans un bol, arroser d'huile d'olive et saupoudrer généreusement de mélange cajun. Mélanger délicatement pour les enrober.",
"Air fryer : disposer les pommes de terre en une seule couche dans le panier. Cuire à 200 °C pendant 20 min.",
"Retourner les pommes de terre et poursuivre la cuisson 10 minutes (ou plus), jusqu'à ce qu'elles soient dorées et croustillantes des deux côtés.",
"Sauce : mélanger dans un bol la mayonnaise, le ketchup, la cuillère à soupe de mélange cajun réservée, le jus de citron et la sauce piquante.",
"Servir les pommes de terre bien chaudes, nappées de sauce ou avec la sauce à part pour tremper."]
$instr$,
    10, 35, 4, 1,
    'Américaine', 'snack',
    ARRAY['américain','cajun','louisiane','pommes de terre','smashed','air fryer','épicé','sauce','accompagnement'],
    'manual',
    'https://www.instagram.com/p/DLPzN1QRQqg/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Pommes de terre
    (v_recipe_id, 'pommes de terre grenaille',  500, 'g',          true,  1,  '10 à 12 petites pommes de terre'),
    (v_recipe_id, 'huile d''olive',             45,  'ml',         true,  2,  '3 c. à soupe'),
    -- Mélange cajun maison (1 c. à soupe réservée pour la sauce)
    (v_recipe_id, 'paprika',                    1.5, 'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'poudre d''ail',              1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'sel',                        0.5, 'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'poudre d''oignon',           1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'origan séché',               0.5, 'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'poivre blanc moulu',         0.5, 'c. à soupe', true,  8,  NULL),
    -- Sauce
    (v_recipe_id, 'mayonnaise',                 30,  'ml',         true,  9,  '2 c. à soupe, sauce'),
    (v_recipe_id, 'ketchup',                    15,  'ml',         true,  10, '1 c. à soupe, sauce'),
    (v_recipe_id, 'jus de citron',              7.5, 'ml',         true,  11, '0,5 c. à soupe, sauce'),
    (v_recipe_id, 'sauce piquante',             15,  'ml',         true,  12, '1 c. à soupe, type louisianaise');

  -- =====================================================================
  -- 17. Creamy Tuscan Chicken Pasta
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Creamy Tuscan Chicken Pasta',
    'Pâtes crémeuses façon trattoria toscane (version américaine) : poulet poêlé aux herbes italiennes, sauce à la crème, au parmesan, au concentré de tomate, aux tomates cerises et aux tomates séchées, finition aux épinards. Des rigatoni qui retiennent bien la sauce.',
    $instr$["Cuire les rigatoni al dente selon les indications du paquet. Réserver 240 ml d'eau de cuisson avant d'égoutter.",
"Saler le poulet et l'assaisonner avec le poivre, la poudre d'ail, le paprika fumé, les herbes italiennes et l'huile. Bien mélanger.",
"Dans une poêle à feu moyen, chauffer un peu d'huile. Cuire le poulet 12-15 minutes en le retournant à mi-cuisson, jusqu'à ce qu'il soit cuit à cœur. Réserver.",
"Dans une autre grande poêle, faire fondre le beurre avec l'huile à feu moyen. Ajouter l'échalote et l'ail hachés et les faire revenir 1 minute, jusqu'à ce qu'ils embaument.",
"Ajouter les tomates cerises coupées en deux et le poivron rouge en dés, cuire 1-2 min jusqu'à ce qu'ils soient fondants.",
"Ajouter le concentré de tomate et toutes les épices de la sauce (sel, poivre, poudre d'ail, paprika fumé, herbes italiennes, flocons de piment). Bien mélanger. Ajouter les tomates séchées hachées.",
"Baisser le feu et verser la crème. Bien mélanger.",
"Incorporer le parmesan râpé et mélanger jusqu'à la consistance souhaitée. Ajouter de l'eau de cuisson par cuillerées si la sauce est trop épaisse.",
"Ajouter les épinards et cuire 1 minute, jusqu'à ce qu'ils tombent. Ajouter les pâtes égouttées.",
"Couper le poulet en tranches et l'ajouter aux pâtes. Bien enrober.",
"Garnir de parmesan supplémentaire et de persil haché. Servir chaud."]
$instr$,
    20, 35, 4, 2,
    'Italienne', 'dinner',
    ARRAY['italien','américain','pasta','toscan','poulet','crème','parmesan','épinards','tomates séchées'],
    'manual',
    'https://www.instagram.com/p/DLk9miqP8Sd/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Poulet
    (v_recipe_id, 'blanc de poulet',            454, 'g',          true,  1,  'en filets'),
    (v_recipe_id, 'paprika fumé',               1,   'c. à café',  true,  2,  'pour le poulet'),
    (v_recipe_id, 'poudre d''ail',              1,   'c. à soupe', true,  3,  'pour le poulet'),
    (v_recipe_id, 'herbes italiennes',          1,   'c. à café',  true,  4,  'mélange séché, pour le poulet'),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  5,  'pour le poulet'),
    (v_recipe_id, 'huile végétale',             30,  'ml',         true,  6,  'pour assaisonner et cuire le poulet'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  7,  'pour le poulet, au goût'),
    -- Sauce
    (v_recipe_id, 'crème entière',              480, 'ml',         true,  8,  'liquide'),
    (v_recipe_id, 'beurre',                     15,  'g',          true,  9,  '1 c. à soupe'),
    (v_recipe_id, 'huile végétale',             30,  'ml',         true,  10, '2 c. à soupe, pour la sauce'),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  11, 'ou petit oignon, en dés fins'),
    (v_recipe_id, 'ail',                        8,   'gousse',     true,  12, 'hachées'),
    (v_recipe_id, 'poivron rouge',              0.5, 'unité',      true,  13, 'en dés'),
    (v_recipe_id, 'paprika fumé',               1,   'c. à café',  true,  14, 'pour la sauce'),
    (v_recipe_id, 'poudre d''ail',              1,   'c. à café',  true,  15, 'pour la sauce'),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  16, 'pour la sauce'),
    (v_recipe_id, 'herbes italiennes',          0.5, 'c. à café',  true,  17, 'pour la sauce'),
    (v_recipe_id, 'flocons de piment rouge',    1,   'c. à café',  true,  18, NULL),
    (v_recipe_id, 'parmesan râpé',              50,  'g',          true,  19, 'fraîchement râpé'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  20, 'eau de cuisson des pâtes, réservée'),
    (v_recipe_id, 'épinards frais',             30,  'g',          true,  21, NULL),
    (v_recipe_id, 'tomates cerises',            150, 'g',          true,  22, 'environ 12, coupées en deux'),
    (v_recipe_id, 'concentré de tomate',        30,  'g',          true,  23, '2 c. à soupe'),
    (v_recipe_id, 'tomates séchées',            30,  'g',          true,  24, '2 c. à soupe, hachées'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  25, 'pour la sauce, au goût'),
    -- Assemblage
    (v_recipe_id, 'rigatoni',                   227, 'g',          true,  26, NULL),
    (v_recipe_id, 'parmesan',                   20,  'g',          false, 27, 'pour garnir'),
    (v_recipe_id, 'persil frais',               5,   'g',          false, 28, '1 c. à soupe, haché');

  -- =====================================================================
  -- 18. Fettuccine Alfredo
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Fettuccine Alfredo',
    'Fettuccine Alfredo à l''américaine, riches et crémeuses : roux beurre-farine, crème et parmesan fraîchement râpé pour des pâtes nappées et soyeuses. La version originale romaine n''utilise que du beurre, du parmesan et de l''eau de cuisson ; celle-ci est la variante plus crémeuse popularisée aux États-Unis.',
    $instr$["Porter une grande casserole d'eau salée à ébullition. Cuire les fettuccine al dente selon les indications du paquet. Réserver 240 ml d'eau de cuisson avant d'égoutter.",
"Dans une grande sauteuse, faire fondre le beurre à feu moyen.",
"Saupoudrer la farine sur le beurre fondu et fouetter pour mélanger. Cuire 1-2 minutes en remuant constamment (roux blond, pas coloré).",
"Verser progressivement la crème en fouettant sans arrêt pour éviter les grumeaux. Porter à frémissement et cuire 2-3 minutes, jusqu'à ce que la sauce épaississe légèrement.",
"Retirer du feu et incorporer le parmesan en plusieurs fois, en fouettant à chaque ajout jusqu'à ce qu'il soit fondu et la sauce lisse. Assaisonner de sel, de poivre noir, de poudre d'ail et d'herbes italiennes.",
"Ajouter les fettuccine égouttées dans la sauteuse et bien les enrober. Si la sauce est trop épaisse, la détendre avec l'eau de cuisson réservée, cuillerée par cuillerée, jusqu'à ce qu'elle soit crémeuse et nappante.",
"Incorporer le persil frais haché et servir immédiatement (la sauce épaissit en refroidissant)."]
$instr$,
    10, 15, 4, 1,
    'Italienne', 'dinner',
    ARRAY['italien','américain','pasta','fettuccine','alfredo','crème','parmesan','rapide','réconfortant'],
    'manual',
    'https://www.instagram.com/p/DKP0l1qPRIO/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'fettuccine',                 225, 'g',          true,  1,  NULL),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  2,  'pour l''eau de cuisson et la sauce'),
    (v_recipe_id, 'beurre',                     115, 'g',          true,  3,  NULL),
    (v_recipe_id, 'crème entière',              480, 'ml',         true,  4,  'liquide'),
    (v_recipe_id, 'farine',                     12,  'g',          true,  5,  '1,5 c. à soupe, pour le roux'),
    (v_recipe_id, 'parmesan râpé',              100, 'g',          true,  6,  'fraîchement râpé'),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  7,  'eau de cuisson des pâtes, réservée'),
    (v_recipe_id, 'poivre noir',                1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'poudre d''ail',              1,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'herbes italiennes',          1,   'c. à café',  true,  10, 'mélange séché'),
    (v_recipe_id, 'persil frais',               10,  'g',          true,  11, '2 c. à soupe, haché');

  -- =====================================================================
  -- 19. Loco Moco au Poivre (fusion Hawaii × France)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Loco Moco au Poivre',
    'Fusion hawaïenne et française : un steak haché maison sur du riz blanc, nappé d''une sauce au poivre revisitée (sauce brune aux champignons et au poivre vert, fond de bœuf, moutarde à l''ancienne, soja, Worcestershire) et surmonté d''un œuf au plat à jaune coulant. Un plat réconfortant.',
    $instr$["Steaks hachés : dans un grand bol, mélanger le bœuf haché, la chapelure, les œufs, la sauce Worcestershire, la poudre d'oignon, la poudre d'ail, l'oignon en dés et le lait. Saler et poivrer. Mélanger jusqu'à obtenir une texture homogène et collante.",
"Former 4 à 6 galettes de l'épaisseur souhaitée, un peu plus larges que voulu (elles rétrécissent à la cuisson).",
"Chauffer l'huile dans une grande poêle à feu vif. Cuire les galettes 2-3 min par face, jusqu'à ce qu'elles soient bien saisies et cuites à cœur. Réserver.",
"Sauce au poivre : dans la même poêle (sans la nettoyer, les sucs font tout le goût), ajouter l'oignon émincé, l'ail tranché et les champignons. Faire sauter à feu moyen-vif jusqu'à ce qu'ils soient légèrement dorés.",
"Saupoudrer de farine et cuire 1 minute en remuant (le roux se mélange aux sucs).",
"Verser le fond de bœuf chaud en plusieurs fois, en fouettant pour éviter les grumeaux.",
"Ajouter le ketchup, la sauce Worcestershire, la sauce soja, la moutarde à l'ancienne et les grains de poivre vert. Mélanger et laisser frémir jusqu'à ce que la sauce soit onctueuse et nappante.",
"Rectifier l'assaisonnement en sel et en poivre.",
"Dressage : déposer une portion de riz blanc chaud dans une assiette creuse et poser une galette dessus. Napper généreusement de sauce au poivre. Couronner d'un œuf au plat à jaune coulant et parsemer d'oignons verts ciselés. Servir immédiatement."]
$instr$,
    20, 25, 4, 2,
    'Américaine', 'dinner',
    ARRAY['américain','hawaïen','français','fusion','loco moco','sauce au poivre','steak haché','riz','œuf au plat','comfort food'],
    'manual',
    'https://www.instagram.com/p/DJ_sWjWTni4/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Patty
    (v_recipe_id, 'bœuf haché',               1000, 'g',          true,  1,  'pour 4 à 6 galettes'),
    (v_recipe_id, 'chapelure',                90,  'g',           true,  2,  NULL),
    (v_recipe_id, 'œufs',                     2,   'unité',       true,  3,  'pour les galettes'),
    (v_recipe_id, 'sauce Worcestershire',     15,  'ml',          true,  4,  '1 c. à soupe, pour les galettes'),
    (v_recipe_id, 'poudre d''oignon',         1,   'c. à soupe',  true,  5,  NULL),
    (v_recipe_id, 'poudre d''ail',            1,   'c. à soupe',  true,  6,  NULL),
    (v_recipe_id, 'oignon',                   1,   'unité',       true,  7,  'blanc, en dés, pour les galettes'),
    (v_recipe_id, 'lait',                     240, 'ml',          true,  8,  'pour humidifier la chapelure'),
    (v_recipe_id, 'sel',                      1,   'c. à café',   true,  9,  'pour les galettes, au goût'),
    (v_recipe_id, 'poivre noir',              1,   'c. à café',   true,  10, 'au goût'),
    (v_recipe_id, 'huile végétale',           30,  'ml',          true,  11, 'pour cuire les galettes'),
    -- Sauce au poivre
    (v_recipe_id, 'oignon',                   1,   'unité',       true,  12, 'blanc, émincé, pour la sauce'),
    (v_recipe_id, 'ail',                      6,   'gousse',      true,  13, 'tranchées'),
    (v_recipe_id, 'champignons de Paris',     200, 'g',           true,  14, 'tranchés'),
    (v_recipe_id, 'grains de poivre vert',    5,   'c. à soupe',  true,  15, 'en saumure, égouttés'),
    (v_recipe_id, 'fond de bœuf',             960, 'ml',          true,  16, 'chaud'),
    (v_recipe_id, 'farine',                   60,  'g',           true,  17, 'pour le roux'),
    (v_recipe_id, 'sauce Worcestershire',     15,  'ml',          true,  18, '1 c. à soupe, pour la sauce'),
    (v_recipe_id, 'moutarde à l''ancienne',   15,  'g',           true,  19, '1 c. à soupe'),
    (v_recipe_id, 'ketchup',                  30,  'ml',          true,  20, '2 c. à soupe'),
    (v_recipe_id, 'sauce soja',               30,  'ml',          true,  21, '2 c. à soupe'),
    -- Toppings
    (v_recipe_id, 'œufs',                     4,   'unité',       true,  22, 'au plat, jaune coulant (1 par portion)'),
    (v_recipe_id, 'riz blanc cuit',           800, 'g',           true,  23, 'chaud, pour servir'),
    (v_recipe_id, 'oignons verts',            1,   'unité',       false, 24, 'ciselés, garniture');

  -- =====================================================================
  -- 20. Malai Chutney Chicken Tikka
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Malai Chutney Chicken Tikka',
    'Poulet tikka indien crémeux : marinade yaourt-crème-gingembre-ail-poivre-cumin-garam masala, morceaux grillés à la flamme, puis sauce « malai chutney » (crème, chutney vert et chaat masala) montée dans la même poêle pour récupérer tous les sucs. Servi avec oignon rouge et coriandre.',
    $instr$["Marinade : dans un bol, mélanger le poulet désossé avec le yaourt, la pâte gingembre-ail, le poivre noir moulu, le cumin moulu, le garam masala et la crème fraîche. Bien enrober.",
"Couvrir et laisser mariner au frais 2 heures minimum (idéalement une nuit).",
"Cuisson à la poêle : chauffer une poêle avec un filet d'huile à feu moyen. Ajouter le poulet (garder le reste de marinade dans le bol). Cuire jusqu'à ce que l'eau soit évaporée et le poulet coloré ; il doit être cuit à 80-90 %.",
"Grillage (étape clé) : passer les morceaux de poulet directement sur la flamme du gaz (avec une pince), ou 1 à 2 min sous le gril du four, jusqu'à ce qu'ils soient marqués de noir. Réserver.",
"Sauce malai chutney : dans la même poêle (sans la nettoyer), ajouter le reste de marinade, la crème fraîche de la sauce, le chutney vert et le chaat masala. Mélanger et laisser frémir à feu doux jusqu'à ce que la sauce épaississe et devienne onctueuse.",
"Goûter et rectifier le sel et le chaat masala.",
"Dressage : déposer les morceaux de poulet grillé dans une assiette creuse et napper de sauce malai chutney chaude. Garnir d'oignon rouge en lamelles et de coriandre fraîche hachée. Servir avec du naan ou du riz."]
$instr$,
    15, 30, 4, 3,
    'Indienne', 'dinner',
    ARRAY['indien','poulet tikka','malai','chutney vert','crémeux','grillé','restaurant'],
    'manual',
    'https://www.instagram.com/p/DNyDOVzYqdH/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade
    (v_recipe_id, 'cuisses de poulet désossées', 500, 'g',          true,  1,  'en morceaux taille bouchée'),
    (v_recipe_id, 'yaourt',                      30,  'ml',         true,  2,  '2 c. à soupe'),
    (v_recipe_id, 'pâte gingembre-ail',          30,  'ml',         true,  3,  '2 c. à soupe'),
    (v_recipe_id, 'poivre noir moulu',           1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'cumin moulu',                 1,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'garam masala',                1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'crème fraîche',               15,  'ml',         true,  7,  '1 c. à soupe, marinade'),
    -- Cuisson
    (v_recipe_id, 'huile',                       15,  'ml',         true,  8,  '1 c. à soupe, pour la poêle'),
    -- Sauce malai chutney
    (v_recipe_id, 'crème fraîche',               100, 'ml',         true,  9,  'pour la sauce'),
    (v_recipe_id, 'chutney vert',                30,  'g',          true,  10, '2 c. à soupe, menthe-coriandre'),
    (v_recipe_id, 'chaat masala',                0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'sel',                         1,   'pincée',     true,  12, 'au goût en finition'),
    -- Garniture
    (v_recipe_id, 'oignon rouge',                0.5, 'unité',      false, 13, 'en lamelles, garniture'),
    (v_recipe_id, 'coriandre fraîche',           10,  'g',          false, 14, 'hachée, garniture');

  -- =====================================================================
  -- 21. Sri Lankan Mutton Rolls
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Sri Lankan Mutton Rolls',
    'Le « short eat » emblématique du Sri Lanka : des crêpes fines maison roulées autour d''une farce épicée au mouton et à la pomme de terre (curcuma, curry, piment, lait de coco), trempées dans l''œuf battu, panées puis frites jusqu''à ce qu''elles soient dorées et croustillantes. À manger brûlant, avec un sambol.',
    $instr$["FARCE — Chauffer l'huile dans une poêle à feu moyen. Ajouter l'oignon finement haché, l'ail, le gingembre, les piments verts et les feuilles de curry. Faire suer jusqu'à ce qu'ils embaument.",
"Ajouter le curcuma, la poudre de curry non torréfiée, le piment rouge moulu et le poivre. Faire frire 30 secondes pour libérer les arômes.",
"Ajouter le mouton en tout petits cubes (presque haché). Bien l'enrober du mélange d'épices. Verser le lait de coco épais, couvrir et cuire à feu doux jusqu'à ce que le mouton soit cuit aux trois quarts.",
"Ajouter les pommes de terre en petits cubes et mélanger. Couvrir et poursuivre la cuisson jusqu'à ce que les pommes de terre soient fondantes et que le mélange devienne épais et presque sec.",
"Goûter et saler. Ajouter un trait de jus de citron vert pour la fraîcheur. Laisser refroidir complètement (essentiel pour le roulage).",
"PÂTE À CRÊPES — Fouetter la farine, le sel, l'œuf et l'eau jusqu'à obtenir une pâte fluide, comme pour des crêpes fines.",
"Chauffer une poêle anti-adhésive légèrement graissée à feu moyen. Verser une fine louche, tourner la poêle pour étaler.",
"Cuire jusqu'à ce que la surface paraisse sèche — NE PAS retourner. Empiler les crêpes sur une assiette couverte d'un torchon pour les garder souples.",
"ROULAGE — Déposer 1-2 c. à soupe de farce sur un bord de la crêpe. Plier les côtés vers l'intérieur, rouler serré comme un rouleau de printemps. Sceller la dernière pointe avec un peu de pâte si besoin.",
"PANURE — Tremper chaque rouleau dans l'œuf battu, puis enrober généreusement de chapelure.",
"FRITURE — Chauffer l'huile à 170-180 °C. Frire les rouleaux par fournées, jusqu'à ce qu'ils soient bien dorés et croustillants.",
"Égoutter sur du papier absorbant. Servir bien chaud, idéalement avec un sambol (condiment piment-coco) ou du ketchup."]
$instr$,
    30, 60, 8, 3,
    'Sri-lankaise', 'snack',
    ARRAY['sri-lankais','short eat','mouton','street food','pané','frit','crêpe','feuilles de curry'],
    'manual',
    'https://www.instagram.com/p/DNkh1WDoU7A/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Farce
    (v_recipe_id, 'mouton désossé',           500, 'g',          true,  1,  'en tout petits cubes, presque haché'),
    (v_recipe_id, 'huile',                    30,  'ml',         true,  2,  '2 c. à soupe, pour la farce'),
    (v_recipe_id, 'oignon',                   1,   'unité',      true,  3,  'moyen, haché finement'),
    (v_recipe_id, 'ail',                      3,   'gousse',     true,  4,  'haché'),
    (v_recipe_id, 'gingembre',                2.5, 'cm',         true,  5,  'haché'),
    (v_recipe_id, 'piments verts',            3,   'unité',      true,  6,  '2 à 3, hachés finement'),
    (v_recipe_id, 'feuilles de curry',        1,   'brin',       true,  7,  NULL),
    (v_recipe_id, 'curcuma moulu',            0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'poudre de curry',          1,   'c. à café',  true,  9,  'non torréfiée, sri-lankaise'),
    (v_recipe_id, 'piment rouge moulu',       1,   'c. à café',  true,  10, 'ajuster au goût'),
    (v_recipe_id, 'poivre noir moulu',        0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'lait de coco',             60,  'ml',         true,  12, 'épais'),
    (v_recipe_id, 'pommes de terre',          1,   'unité',      true,  13, 'moyenne, en petits cubes'),
    (v_recipe_id, 'sel',                      1,   'c. à café',  true,  14, 'au goût'),
    (v_recipe_id, 'jus de citron vert',       15,  'ml',         false, 15, 'un trait pour la fraîcheur'),
    -- Pâte à crêpes
    (v_recipe_id, 'farine',                   120, 'g',          true,  16, 'pour la pâte'),
    (v_recipe_id, 'œuf',                      1,   'unité',      true,  17, 'pour la pâte'),
    (v_recipe_id, 'eau',                      300, 'ml',         true,  18, 'pour une pâte fluide'),
    (v_recipe_id, 'sel',                      1,   'pincée',     true,  19, 'pour la pâte'),
    -- Panure + friture
    (v_recipe_id, 'œuf',                      1,   'unité',      true,  20, 'battu, pour la panure'),
    (v_recipe_id, 'chapelure',                200, 'g',          true,  21, 'pour l''enrobage'),
    (v_recipe_id, 'huile végétale',           1000, 'ml',        true,  22, 'pour la friture profonde');

  -- =====================================================================
  -- 22. Hyderabadi Wedding Red Chicken Curry
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Hyderabadi Wedding Red Chicken Curry',
    'Poulet mijoté lentement dans un masala rouge profond, comme dans les mariages d''Hyderabad : pâte de noix de cajou, d''amandes et de coco pour la rondeur, oignons frits, deux sauces pimentées (verte et rouge) et piment du Cachemire pour la couleur. Environ 347 kcal et 20 g de protéines par portion, encore meilleur réchauffé le lendemain.',
    $instr$["Pâte noix-coco : mixer les noix de cajou, les amandes et la noix de coco râpée avec un peu d'eau jusqu'à obtenir une pâte lisse et crémeuse.",
"Oignons frits maison : émincer finement les 2 grands oignons et les mélanger à quelques gouttes d'huile. Cuire 10-12 min au micro-ondes en remuant toutes les 2 min, jusqu'à ce qu'ils soient dorés (ou 10-12 min à l'air fryer à 180 °C).",
"Dans un grand bol, mélanger la pâte noix-coco avec le yaourt, la pâte gingembre-ail, les piments verts fendus, les oignons frits, la menthe et la coriandre fraîches, la sauce piment vert, la sauce piment rouge, la sauce soja foncée, le curcuma, le piment du Cachemire (la clé de la couleur rouge profond), la coriandre moulue, le garam masala, le sel, le poivre, le jus de citron et le ghee.",
"Ajouter les morceaux de poulet et bien les enrober. Couvrir et laisser mariner au frais 2 heures minimum, idéalement une nuit pour un maximum de goût.",
"Chauffer l'huile neutre dans une cocotte à fond épais. Ajouter les feuilles de curry et les laisser crépiter.",
"Verser tout le poulet avec sa marinade dans la cocotte. Couvrir et cuire 40-45 minutes à feu moyen-doux, en remuant régulièrement pour que le masala n'attache pas.",
"Quand l'huile remonte à la surface, que la sauce vire au rouge profond et que le poulet est très tendre (il se détache presque de l'os), ajouter la crème fraîche et la coriandre hachée. Couper le feu.",
"Laisser reposer 10 minutes. Servir avec du naan moelleux ou du riz blanc.",
"Astuce : ce curry est encore meilleur après 1-2 h de repos ou réchauffé plus tard, quand les saveurs du masala se sont développées."]
$instr$,
    30, 50, 4, 3,
    'Indienne', 'dinner',
    ARRAY['indien','hyderabadi','poulet','curry rouge','mariage','noix de cajou','marinade longue'],
    'manual',
    'https://www.instagram.com/p/DUzvAWviZlS/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Pâte noix-coco
    (v_recipe_id, 'noix de cajou',             15,   'unité',      true,  1,  '10 à 15, pour la pâte'),
    (v_recipe_id, 'amandes',                   10,   'unité',      true,  2,  'pour la pâte'),
    (v_recipe_id, 'noix de coco râpée',        30,   'g',          true,  3,  'déshydratée, 3 c. à soupe'),
    (v_recipe_id, 'eau',                       60,   'ml',         true,  4,  'pour la pâte, au besoin'),
    -- Poulet + marinade
    (v_recipe_id, 'poulet',                    500,  'g',          true,  5,  'avec os, en morceaux'),
    (v_recipe_id, 'yaourt',                    120,  'ml',         true,  6,  'épais (type grec), marinade'),
    (v_recipe_id, 'pâte gingembre-ail',        22.5, 'ml',         true,  7,  '1,5 c. à soupe'),
    (v_recipe_id, 'piments verts',             3,    'unité',      true,  8,  '2 à 3, fendus'),
    (v_recipe_id, 'oignons',                   2,    'unité',      true,  9,  'grands, émincés et frits (étape 2)'),
    (v_recipe_id, 'menthe fraîche',            10,   'g',          true,  10, 'feuilles, une poignée'),
    (v_recipe_id, 'coriandre fraîche',         10,   'g',          true,  11, 'une poignée'),
    (v_recipe_id, 'sauce piment vert',         15,   'ml',         true,  12, '1 c. à soupe'),
    (v_recipe_id, 'sauce piment rouge',        15,   'ml',         true,  13, '1 c. à soupe'),
    (v_recipe_id, 'sauce soja foncée',         10,   'ml',         true,  14, '2 c. à café'),
    (v_recipe_id, 'curcuma moulu',             0.25, 'c. à café',  true,  15, NULL),
    (v_recipe_id, 'piment du Cachemire moulu', 2,    'c. à soupe', true,  16, 'jusqu''à 3, pour la couleur'),
    (v_recipe_id, 'coriandre moulue',          1,    'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'garam masala',              1,    'c. à café',  true,  18, NULL),
    (v_recipe_id, 'sel',                       1,    'c. à café',  true,  19, 'au goût'),
    (v_recipe_id, 'poivre noir',               1,    'pincée',     true,  20, 'au goût'),
    (v_recipe_id, 'jus de citron',             15,   'ml',         true,  21, '1 c. à soupe'),
    (v_recipe_id, 'ghee',                      10,   'ml',         true,  22, '2 c. à café, marinade'),
    -- Cuisson
    (v_recipe_id, 'huile neutre',              15,   'ml',         true,  23, '1 c. à soupe, pour les oignons et la cocotte'),
    (v_recipe_id, 'feuilles de curry',         1,    'brin',       true,  24, NULL),
    (v_recipe_id, 'crème fraîche',             10,   'ml',         true,  25, '2 c. à café, finition'),
    (v_recipe_id, 'coriandre fraîche',         10,   'g',          false, 26, 'hachée, garniture finale');

  -- =====================================================================
  -- 23. Riz au Lait Vanille Crémeux
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Riz au Lait Vanille Crémeux',
    'Riz au lait à la française dans sa version la plus gourmande : beaucoup de lait et de crème pour l''onctuosité, un riz rond blanchi pour retirer l''excès d''amidon, de la vergeoise ajoutée à mi-cuisson et une gousse de vanille infusée. Le secret : ne pas laisser le riz absorber tout le liquide, pour obtenir un riz au lait nappant et fondant plutôt que sec.',
    $instr$["Blanchir le riz : porter une casserole d'eau à petite ébullition, ajouter le riz rond et le laisser cuire 5 minutes. Égoutter et réserver (cette étape retire l'excès d'amidon pour un résultat moins collant).",
"Dans une casserole à fond épais, chauffer le lait demi-écrémé, la crème liquide et la gousse de vanille fendue et grattée (graines et gousse).",
"À ébullition, verser le riz blanchi et baisser immédiatement à feu très doux pour une cuisson tout en douceur (sinon le lait déborde et brûle au fond).",
"À mi-cuisson (~15 min), ajouter la vergeoise. Ne pas l'ajouter dès le début : le sucre gêne la cuisson du riz et empêche l'amidon de se libérer correctement.",
"Cuire encore 15-20 minutes en remuant régulièrement pour que rien n'accroche au fond. Surveiller attentivement.",
"Quand la préparation nappe la cuillère et que le riz est fondant mais encore en suspension dans un peu de liquide, retirer du feu. Ne pas laisser le riz absorber tout le liquide.",
"Transvaser dans un récipient plat (une grande surface refroidit plus vite et le riz cesse de cuire dans la chaleur résiduelle). Laisser tiédir à température ambiante, puis filmer au contact et réfrigérer.",
"Servir dans des coupes individuelles et agrémenter selon l'envie : sauce caramel, noix, noisettes ou amandes concassées, fruits frais, ou nature."]
$instr$,
    5, 40, 4, 2,
    'Française', 'dessert',
    ARRAY['français','dessert','riz au lait','vanille','crémeux','vergeoise','réconfortant','sucré'],
    'manual',
    'https://www.instagram.com/p/DU_IAlAAlRS/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'lait demi-écrémé',         450, 'ml',         true,  1,  NULL),
    (v_recipe_id, 'crème liquide',            200, 'ml',         true,  2,  NULL),
    (v_recipe_id, 'riz rond',                 85,  'g',          true,  3,  'riz pour dessert ou arborio'),
    (v_recipe_id, 'vergeoise',                45,  'g',          true,  4,  'sucre brun, ou cassonade'),
    (v_recipe_id, 'gousse de vanille',        1,   'unité',      true,  5,  'idéalement givrée, fendue et grattée'),
    -- Garniture optionnelle
    (v_recipe_id, 'sauce caramel',            30,  'ml',         false, 6,  'maison ou du commerce, optionnel'),
    (v_recipe_id, 'noix',                     20,  'g',          false, 7,  'ou noisettes ou amandes, concassées, optionnel');

  -- =====================================================================
  -- 24. Butter Chicken (Michelin Star)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Butter Chicken (Michelin Star)',
    'Butter chicken digne d''un restaurant étoilé : garam masala maison torréfié (laurier, cannelle, cardamome, coriandre, cumin, poivre, girofle), marinade yaourt-ail-gingembre-huile de moutarde, sauce tomate très concentrée en noix de cajou grillées, finition crème-beurre-fenugrec. Servi avec un pilaf de riz basmati sella.',
    $instr$["GARAM MASALA — Torréfier à sec dans une poêle le laurier, la cannelle, la cardamome verte, les graines de coriandre, les graines de cumin, le poivre noir et les clous de girofle, jusqu'à ce qu'ils embaument. Laisser refroidir, puis moudre en poudre fine.",
"Ajouter le curcuma, le piment rouge moulu et le fenugrec séché à la poudre. Réserver une partie de ce garam masala pour la finition.",
"MARINADE — Couper les cuisses de poulet en morceaux. Les mélanger avec le yaourt, l'ail écrasé, le gingembre râpé, le jus de citron, l'huile de moutarde, un piment vert entier (pour l'arôme), le sel et la moitié du garam masala. Laisser mariner 2 heures minimum, idéalement une nuit.",
"Cuisson du poulet : le rôtir 15-20 min au four à 220 °C ou au barbecue, jusqu'à ce qu'il soit cuit à cœur et bien marqué. Réserver.",
"SAUCE TOMATE-CAJOU — Griller les noix de cajou à sec dans une poêle jusqu'à ce qu'elles soient dorées (~5 min, en remuant sans arrêt). Les mixer avec les tomates pelées, le sel, le sucre et le fenugrec jusqu'à obtenir une sauce très lisse.",
"RIZ — Dans une casserole, chauffer le ghee. Ajouter la cardamome, le laurier et le cumin et laisser infuser 30 secondes. Ajouter le riz basmati rincé et mélanger 1 min. Verser l'eau et saler. Couvrir et cuire 18-20 min à feu doux, jusqu'à absorption complète.",
"FINITION — Dans une grande poêle, faire fondre le beurre à feu moyen. Ajouter le piment rouge moulu et le second piment vert entier. Verser la sauce tomate-cajou et laisser mijoter 10 min.",
"Ajouter le poulet rôti et mélanger pour bien l'enrober.",
"Verser la crème en plusieurs fois, jusqu'à la consistance souhaitée. Ajouter le reste du beurre (1-2 c. à soupe), 1 c. à café de piment rouge, 1-2 c. à café du garam masala réservé et une pincée de fenugrec écrasé entre les doigts.",
"Servir bien chaud sur le riz basmati, dans un bol creux. En option : un filet de crème et de la coriandre fraîche."]
$instr$,
    40, 60, 4, 4,
    'Indienne', 'dinner',
    ARRAY['indien','butter chicken','murgh makhani','michelin','garam masala maison','crémeux','tomate-cajou','restaurant'],
    'manual',
    'https://www.instagram.com/p/DWGylmgjuMx/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Garam masala maison
    (v_recipe_id, 'laurier',                    1,    'feuille',    true,  1,  'pour le garam masala'),
    (v_recipe_id, 'cannelle',                   1,    'bâton',      true,  2,  '~5 cm, pour le garam masala'),
    (v_recipe_id, 'cardamome verte',            10,   'unité',      true,  3,  'gousses, pour le garam masala'),
    (v_recipe_id, 'graines de coriandre',       12,   'g',          true,  4,  '2 c. à soupe'),
    (v_recipe_id, 'graines de cumin',           12,   'g',          true,  5,  '2 c. à soupe'),
    (v_recipe_id, 'poivre noir en grains',      8,    'g',          true,  6,  '1 c. à soupe'),
    (v_recipe_id, 'clous de girofle',           7,    'g',          true,  7,  '1 c. à soupe'),
    -- Épices ajoutées après mouture
    (v_recipe_id, 'curcuma moulu',              2,    'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'piment rouge moulu',         8,    'g',          true,  9,  '1 c. à soupe'),
    (v_recipe_id, 'fenugrec séché',             3,    'g',          true,  10, '1 c. à soupe, kasuri methi'),
    -- Marinade
    (v_recipe_id, 'cuisses de poulet désossées', 908, 'g',          true,  11, NULL),
    (v_recipe_id, 'yaourt',                     120,  'g',          true,  12, NULL),
    (v_recipe_id, 'ail',                        6,    'gousse',     true,  13, '5 à 7, écrasées'),
    (v_recipe_id, 'gingembre',                  2.5,  'cm',         true,  14, 'râpé'),
    (v_recipe_id, 'jus de citron',              15,   'ml',         true,  15, 'le jus d''un demi-citron'),
    (v_recipe_id, 'huile de moutarde',          15,   'ml',         true,  16, '1 c. à soupe'),
    (v_recipe_id, 'piment vert',                1,    'unité',      true,  17, 'entier, pour parfumer la marinade'),
    (v_recipe_id, 'sel',                        1,    'c. à café',  true,  18, 'au goût, marinade'),
    -- Sauce tomate-cajou
    (v_recipe_id, 'tomates pelées',             567,  'g',          true,  19, 'olivettes, en conserve'),
    (v_recipe_id, 'noix de cajou',              454,  'g',          true,  20, 'crues, à griller'),
    (v_recipe_id, 'sel',                        5,    'g',          true,  21, '1 c. à café, sauce'),
    (v_recipe_id, 'sucre',                      5,    'g',          true,  22, '1 c. à café'),
    (v_recipe_id, 'fenugrec séché',             4,    'g',          true,  23, '2 c. à café, sauce'),
    -- Riz
    (v_recipe_id, 'ghee',                       30,   'ml',         true,  24, '2 c. à soupe, pour le riz'),
    (v_recipe_id, 'cardamome verte',            3,    'unité',      true,  25, 'pour le riz'),
    (v_recipe_id, 'laurier',                    1,    'feuille',    true,  26, 'pour le riz'),
    (v_recipe_id, 'graines de cumin',           8,    'g',          true,  27, '1 c. à soupe, pour le riz'),
    (v_recipe_id, 'riz basmati',                400,  'g',          true,  28, 'sella (étuvé), rincé'),
    (v_recipe_id, 'eau',                        720,  'ml',         true,  29, 'pour le riz'),
    (v_recipe_id, 'sel',                        7.5,  'g',          true,  30, '1,5 c. à café, pour le riz'),
    -- Finition
    (v_recipe_id, 'beurre',                     30,   'g',          true,  31, '2 c. à soupe, pour démarrer la sauce'),
    (v_recipe_id, 'piment rouge moulu',         3,    'g',          true,  32, '1 c. à café, pour la sauce'),
    (v_recipe_id, 'piment vert',                1,    'unité',      true,  33, 'entier, pour la sauce'),
    (v_recipe_id, 'crème entière',              180,  'ml',         true,  34, 'liquide, ajuster selon la consistance'),
    (v_recipe_id, 'beurre',                     30,   'g',          true,  35, '2 c. à soupe, finition'),
    (v_recipe_id, 'piment rouge moulu',         3,    'g',          true,  36, '1 c. à café, finition'),
    (v_recipe_id, 'fenugrec séché',             1,    'pincée',     true,  37, 'finition, écrasé entre les doigts'),
    (v_recipe_id, 'coriandre fraîche',          5,    'g',          false, 38, 'garniture, optionnel');

  RAISE NOTICE 'Seed: Instagram recipes batch inserted for user % (24 recipes so far)', v_user_id;
END $$;
