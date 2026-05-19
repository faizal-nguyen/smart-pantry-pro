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
    'Fettuccine Alfredo'
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
    'Fusion thaï × philippin : la garniture pad krapow (bœuf haché sauté ail-piment thaï-basilic, sauce de poisson + soja foncé + sucre) roulée dans des galettes de lumpia philippines puis frites. À manger avec riz blanc, œuf frit et tomates fraîches.',
    $instr$["Hacher et écraser ensemble l'ail et les piments thaï en pâte (au mortier ou au couteau).",
"Dans un grand wok à feu moyen-vif, saisir le bœuf haché 4-5 minutes jusqu'à ce que le gras fonde. Égoutter l'excédent de gras, puis monter le feu à vif et continuer à saisir 2-3 minutes jusqu'à belle coloration. Ajouter la pâte d'ail-piment et sauter 2 minutes.",
"Ajouter sauce de poisson, sauce soja foncée, sucre et eau. Continuer 2 minutes jusqu'à ce que la viande soit bien enrobée de sauce.",
"Retirer du feu et incorporer les feuilles de basilic (idéalement basilic thaï).",
"Roulage : poser une galette de lumpia en losange (un coin pointé vers vous).",
"Déposer 1 à 1,5 c. à soupe de garniture à environ 5 cm du coin bas.",
"Étaler en boudin horizontal compact, en laissant de la marge sur les côtés pour le pliage.",
"Plier le coin du bas sur la garniture en serrant bien.",
"Plier les côtés vers l'intérieur, puis rouler vers le haut. Sceller la dernière pointe avec un peu d'eau.",
"Friture : chauffer l'huile à 175°C. Frire les lumpia 2-3 minutes par fournée jusqu'à doré profond.",
"Servir bien chaud avec du riz blanc, un œuf frit à jaune coulant et des tranches de tomates fraîches."]
$instr$,
    15, 20, 4, 2,
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
    (v_recipe_id, 'bœuf haché 20% gras',     454, 'g',          true,  1,  '1 lb, 80/20 lean'),
    (v_recipe_id, 'ail',                     3,   'gousse',     true,  2,  NULL),
    (v_recipe_id, 'piments oiseau thaï',     2,   'unité',      true,  3,  'ajuster au goût'),
    (v_recipe_id, 'sauce de poisson',        15,  'ml',         true,  4,  '1 c. à soupe'),
    (v_recipe_id, 'sauce soja foncée',       15,  'ml',         true,  5,  '1 c. à soupe'),
    (v_recipe_id, 'sucre',                   0.75, 'c. à soupe', true, 6,  NULL),
    (v_recipe_id, 'eau',                     30,  'ml',         true,  7,  '2 c. à soupe'),
    (v_recipe_id, 'basilic thaï',            20,  'g',          true,  8,  'feuilles, ou basilic frais à défaut'),
    -- Roulage
    (v_recipe_id, 'galettes de lumpia',      15,  'unité',      true,  9,  'spring roll wrappers'),
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
    'Classique des sushi bars (inspiration Nobu) : galettes de riz à sushi pressé puis frit jusqu''à croustillant ambré, surmontées d''un tartare de thon sushi-grade au mayo Kewpie, sriracha, yuzu et sésame. Prévoir 2 h de repos au frigo pour le riz pressé.',
    $instr$["Rincer le riz à sushi à l'eau froide jusqu'à ce que l'eau ressorte claire.",
"Cuire le riz au rice cooker avec le kombu et l'eau (ratio standard 1 : 1,1).",
"Mélanger vinaigre de riz + sucre + sel dans un bol. Passer 30 secondes au micro-ondes pour dissoudre le sucre et le sel.",
"Quand le riz est cuit, verser le mélange vinaigré sur le riz chaud et mélanger délicatement à la spatule jusqu'à incorporation complète.",
"Tapisser une plaque de cuisson de film alimentaire. Étaler le riz uniformément (~2 cm d'épaisseur). Recouvrir d'un autre film, presser avec une seconde plaque par-dessus. Réfrigérer 2 heures minimum jusqu'à solidification.",
"Pendant ce temps, hacher finement le thon sushi-grade au couteau. Mélanger avec oignon vert tranché fin, gingembre râpé, sauce soja, huile de sésame, jus de yuzu, mayo Kewpie, sriracha et sel. Couvrir et réfrigérer.",
"Démouler le riz pressé et le couper en rectangles ou losanges (taille bouchée).",
"Friture profonde : chauffer l'huile à 190°C. Plonger les galettes en lots, en les espaçant de 30 secondes pour qu'elles ne collent pas. Frire jusqu'à doré profond.",
"Égoutter sur grille, saler légèrement chaque galette à la sortie de l'huile.",
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
    (v_recipe_id, 'riz à sushi',             400, 'g',          true,  1,  '2 cups'),
    (v_recipe_id, 'eau',                     540, 'ml',         true,  2,  '2.25 cups'),
    (v_recipe_id, 'kombu',                   1,   'unité',      true,  3,  'carré ~8x8 cm'),
    (v_recipe_id, 'vinaigre de riz',         60,  'ml',         true,  4,  '0.25 cup'),
    (v_recipe_id, 'sucre',                   30,  'g',          true,  5,  '2 c. à soupe'),
    (v_recipe_id, 'sel',                     5,   'g',          true,  6,  '1 c. à café'),
    (v_recipe_id, 'huile végétale',          1000, 'ml',        true,  7,  'neutre, pour friture profonde'),
    -- Tartare de thon
    (v_recipe_id, 'thon sushi-grade',        340, 'g',          true,  8,  '0.75 lb, haché fin au couteau'),
    (v_recipe_id, 'oignon vert',             1,   'unité',      true,  9,  'tranché fin'),
    (v_recipe_id, 'gingembre',               5,   'g',          true,  10, 'râpé'),
    (v_recipe_id, 'sauce soja',              10,  'ml',         true,  11, '2 c. à café'),
    (v_recipe_id, 'huile de sésame',         5,   'ml',         true,  12, '1 c. à café'),
    (v_recipe_id, 'jus de yuzu',             10,  'ml',         true,  13, '2 c. à café'),
    (v_recipe_id, 'mayonnaise Kewpie',       45,  'ml',         true,  14, '3 c. à soupe, mayo japonaise'),
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
    'Bol de riz chinois viral surnommé "I''m Good, Don''t Worry" (我没事) : porc haché sauté, œufs ajoutés sur place, sauce soja-huître-vinaigre-sucre liée à la fécule. Prêt en 10 min, réconfortant et complet — la recette doudou des soirs où on n''a plus d''énergie.',
    $instr$["Sauce : mélanger dans un bol sauce soja, sauce soja foncée, sauce huître, vinaigre de riz, sucre et eau. Réserver. Préparer aussi la fécule diluée dans son eau à part.",
"Chauffer l'huile dans une poêle ou un wok à feu vif. Ajouter le porc haché (ou poulet) et sauter en cassant les amas jusqu'à coloration. Verser un trait de vin de riz si utilisé.",
"Faire de la place au centre de la poêle. Casser les 3 œufs directement dedans et cuire au gré : brouillés moelleux ou au plat à jaune coulant — au choix.",
"Verser la sauce sur l'ensemble, puis ajouter la fécule diluée pour épaissir. Bien mélanger pour enrober porc et œufs.",
"Servir immédiatement sur un bol de riz cuit chaud."]
$instr$,
    5, 10, 1, 1,
    'Chinoise', 'lunch',
    ARRAY['chinois','viral','rice bowl','porc','œuf','rapide','comfort food'],
    'manual',
    'https://www.instagram.com/p/DHCLnKzvazd/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'porc haché',              200, 'g',          true,  1,  'ou poulet haché'),
    (v_recipe_id, 'œufs',                    3,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'vin de riz',              15,  'ml',         false, 3,  'Shaoxing, optionnel'),
    (v_recipe_id, 'huile végétale',          15,  'ml',         true,  4,  '1 c. à soupe'),
    (v_recipe_id, 'riz cuit',                200, 'g',          true,  5,  '1 bol, chaud'),
    -- Sauce
    (v_recipe_id, 'sauce soja',              15,  'ml',         true,  6,  '1 c. à soupe'),
    (v_recipe_id, 'sauce soja foncée',       5,   'ml',         true,  7,  '1 c. à café'),
    (v_recipe_id, 'sauce huître',            5,   'ml',         true,  8,  '1 c. à café'),
    (v_recipe_id, 'vinaigre de riz',         2.5, 'ml',         true,  9,  '0.5 c. à café'),
    (v_recipe_id, 'sucre',                   2.5, 'g',          true,  10, '0.5 c. à café'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  11, '0.25 cup, pour la sauce'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  12, 'au goût'),
    (v_recipe_id, 'poivre noir',             1,   'pincée',     true,  13, 'au goût'),
    -- Liaison
    (v_recipe_id, 'fécule de maïs',          7.5, 'g',          true,  14, '0.5 c. à soupe'),
    (v_recipe_id, 'eau',                     15,  'ml',         true,  15, '1 c. à soupe, pour diluer la fécule');

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
    'Sushi déconstruit cuit au four (populaire aux Philippines, fusion sushi-américain) : lit de riz à sushi vinaigré, tartare crémeux crabe-thon-mayo-sriracha, gratiné au broil. Finition eel sauce, furikake et avocat. À partager à la cuillère.',
    $instr$["Mélanger le vinaigre de riz, le sucre et le sel dans un bol jusqu'à dissolution complète.",
"Verser le mélange vinaigré en éventail sur le riz cuit et mélanger délicatement à la spatule. Réserver.",
"Émincer la partie blanche des oignons verts. Effilocher les bâtonnets de surimi à la fourchette (ou émietter la chair de crabe).",
"Dans un bol, combiner crabe émietté, thon égoutté, mayo, sriracha, huile de sésame, sel et oignons verts émincés. Mélanger jusqu'à texture homogène et crémeuse.",
"Étaler le riz dans un plat allant au four (lasagne ou cocotte basse). Tasser légèrement. Couronner d'une couche uniforme du mélange crabe-thon.",
"Passer sous le gril (broil) du four position haute jusqu'à dorage profond du dessus (~5-8 min selon four).",
"Servir chaud, arroser de eel sauce et parsemer de furikake. Garniture optionnelle : avocat en dés, oignon vert ciselé, graines de sésame.",
"Se mange à la cuillère ou avec des feuilles de nori croustillantes pour scooper en tacos."]
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
    (v_recipe_id, 'riz à sushi',             400, 'g',          true,  1,  '2 cups, cuit'),
    (v_recipe_id, 'vinaigre de riz',         30,  'ml',         true,  2,  '2 c. à soupe'),
    (v_recipe_id, 'sucre',                   15,  'g',          true,  3,  '1 c. à soupe'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  4,  'pour le riz'),
    -- Tartare crabe-thon
    (v_recipe_id, 'bâtonnets de surimi',     8,   'unité',      true,  5,  'ou 140 g de chair de crabe'),
    (v_recipe_id, 'thon en boîte',           150, 'g',          true,  6,  '1 boîte, égoutté'),
    (v_recipe_id, 'oignons verts',           2,   'unité',      true,  7,  'parties blanches émincées'),
    (v_recipe_id, 'mayonnaise',              60,  'ml',         true,  8,  '0.25 cup, Kewpie idéale'),
    (v_recipe_id, 'sriracha',                30,  'ml',         true,  9,  '2 c. à soupe'),
    (v_recipe_id, 'huile de sésame',         5,   'ml',         true,  10, '~1 c. à café (non listé mais dans steps)'),
    (v_recipe_id, 'sel',                     1,   'pincée',     true,  11, 'pour le tartare, au goût'),
    -- Garniture
    (v_recipe_id, 'eel sauce',               30,  'ml',         false, 12, '2 c. à soupe, finition'),
    (v_recipe_id, 'furikake',                10,  'g',          false, 13, '2 c. à soupe, finition'),
    (v_recipe_id, 'avocat',                  0.25, 'unité',     false, 14, 'en dés, optionnel'),
    (v_recipe_id, 'oignon vert',             1,   'c. à soupe', false, 15, 'ciselé, garniture'),
    (v_recipe_id, 'graines de sésame',       1,   'c. à soupe', false, 16, 'garniture');

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
    'Version express du cheung fun cantonais : on remplace la pâte de riz traditionnelle par des galettes de riz vietnamiennes trempées, garnies de crevettes marinées et cébette, roulées puis cuites à la vapeur. Sauce soja-huître-sésame-bouillon. Prêt en 25 min vs 1 h pour la version classique.',
    $instr$["Décortiquer les crevettes. Les mariner avec sel, poivre, vin de Shaoxing et huile de sésame. Réserver 10 minutes.",
"Préparer la sauce : mélanger sucre, sauce soja, huile de sésame, sauce huître, sauce soja foncée et bouillon (ou eau) dans un bol jusqu'à dissolution complète. Réserver.",
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
    (v_recipe_id, 'vin de Shaoxing',         5,   'ml',         true,  4,  '1 c. à café, marinade'),
    (v_recipe_id, 'huile de sésame',         5,   'ml',         true,  5,  '1 c. à café, marinade'),
    -- Roulage
    (v_recipe_id, 'cébette',                 1,   'unité',      true,  6,  'ciselée'),
    (v_recipe_id, 'galettes de riz',         6,   'unité',      true,  7,  'grandes, vietnamiennes'),
    (v_recipe_id, 'huile neutre',            15,  'ml',         true,  8,  'pour badigeonner'),
    -- Sauce
    (v_recipe_id, 'sucre',                   5,   'g',          true,  9,  '1 c. à café'),
    (v_recipe_id, 'sauce soja',              30,  'ml',         true,  10, '2 c. à soupe'),
    (v_recipe_id, 'huile de sésame',         15,  'ml',         true,  11, '1 c. à soupe, pour la sauce'),
    (v_recipe_id, 'sauce huître',            15,  'ml',         true,  12, '1 c. à soupe'),
    (v_recipe_id, 'sauce soja foncée',       5,   'ml',         true,  13, '1 c. à café'),
    (v_recipe_id, 'bouillon',                50,  'ml',         true,  14, 'ou eau');

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
    'Salade salée gourmande : épinards frais, œuf dur, protéines maigres (ou kebab végétal) et crispy rice à l''air fryer comme alternative healthy aux croûtons. Sauce creamy satay au fromage blanc, PB2 et miel. ~600 kcal pour une portion complète.',
    $instr$["Crispy rice (batch pour 4 portions) : mettre 200 g de riz cuit dans l'air fryer. Ajouter 1 c. à soupe d'huile de sésame et bien mélanger.",
"Cuire à 200°C pendant 10-12 min, en secouant le panier toutes les 3-4 min jusqu'à doré croustillant. (Variantes : four 200°C / 15-18 min en remuant à mi-cuisson, ou poêle huile de sésame / feu moyen / 10 min en remuant.)",
"Sauce creamy satay (batch pour 6 portions, ~250 g) : fouetter ensemble fromage blanc, PB2 Fit, mayonnaise allégée, vinaigre de riz, sauce soja light, miel, gingembre en poudre, paprika fumé et jus de lime jusqu'à crème lisse. Réserver au frais (se garde 5 jours).",
"Assemblage par portion : base d'épinards frais dans un bol (80 g).",
"Ajouter l'œuf dur coupé en deux et les protéines (kebab végétal Planted, blanc de poulet grillé, ou tofu fumé).",
"Saupoudrer généreusement de crispy rice (50 g pour une portion).",
"Arroser de 40 g de sauce creamy satay. Servir immédiatement (le crispy rice perd son croustillant s'il marine dans la sauce)."]
$instr$,
    10, 15, 1, 1,
    'Asiatique', 'lunch',
    ARRAY['asiatique','fusion','salade','crispy rice','satay','healthy','protéines','air fryer'],
    'manual',
    'https://www.instagram.com/p/DF5gH11oeu4/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Salade (1 portion)
    (v_recipe_id, 'épinards frais',          80,  'g',          true,  1,  'base'),
    (v_recipe_id, 'œuf dur',                 1,   'unité',      true,  2,  'coupé en deux'),
    (v_recipe_id, 'protéines maigres',       100, 'g',          true,  3,  'kebab végétal Planted, poulet grillé ou tofu fumé'),
    -- Crispy rice (batch 4 portions, 50g/portion)
    (v_recipe_id, 'riz cuit',                200, 'g',          true,  4,  'batch crispy rice, 4 portions'),
    (v_recipe_id, 'huile de sésame',         15,  'ml',         true,  5,  '1 c. à soupe pour le crispy rice'),
    -- Sauce creamy satay (batch 6 portions, ~40g/portion)
    (v_recipe_id, 'fromage blanc 0%',        125, 'g',          true,  6,  'pour la sauce satay'),
    (v_recipe_id, 'PB2 Fit',                 25,  'g',          true,  7,  'poudre de cacahuète déshuilée'),
    (v_recipe_id, 'mayonnaise allégée',      30,  'g',          true,  8,  NULL),
    (v_recipe_id, 'vinaigre de riz',         45,  'ml',         true,  9,  NULL),
    (v_recipe_id, 'sauce soja light',        30,  'ml',         true,  10, NULL),
    (v_recipe_id, 'miel',                    40,  'g',          true,  11, NULL),
    (v_recipe_id, 'gingembre en poudre',     2,   'g',          true,  12, NULL),
    (v_recipe_id, 'paprika fumé',            1,   'g',          true,  13, NULL),
    (v_recipe_id, 'jus de lime',             10,  'ml',         true,  14, NULL);

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
    'Salade fraîche autour de petites pommes de terre cuites à l''eau, écrasées puis rôties au four jusqu''à ultra-croustillantes (paprika fumé + beurre fondu = clé). Sauce crémeuse yaourt grec, deux moutardes, concombre, échalote et herbes fraîches.',
    $instr$["Cuire les petites pommes de terre entières dans une grande casserole d'eau salée jusqu'à très tendres au couteau (~15-20 min).",
"Égoutter et étaler sur un plat allant au four. Écraser chaque pomme de terre avec le fond d'un verre ou d'une casserole (pour exposer un maximum de surface au four).",
"Badigeonner d'huile d'olive et de beurre fondu (combo = max croustillant). Saler, poivrer généreusement et saupoudrer de paprika fumé.",
"Enfourner à 200°C pendant 30 minutes (les bords doivent être très dorés et croustillants).",
"Pendant la cuisson, préparer la sauce-salade : dans un grand bol, mélanger yaourt grec (ou fromage blanc), mayonnaise, moutarde de Dijon, moutarde à l'ancienne, concombre en petits dés, échalote ciselée, aneth + ciboulette + persil hachés, jus de citron, sel et poivre.",
"Sortir les pommes de terre du four et les laisser tiédir 5-10 minutes (sinon le yaourt cuit au contact).",
"Ajouter les pommes de terre croustillantes tièdes à la sauce, mélanger délicatement pour bien enrober sans casser. Goûter, rectifier sel/citron.",
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
    (v_recipe_id, 'petites pommes de terre',  500, 'g',          true,  1,  'grenaille / nouvelles'),
    (v_recipe_id, 'huile d''olive',           30,  'ml',         true,  2,  'pour badigeonner'),
    (v_recipe_id, 'beurre',                   30,  'g',          true,  3,  'fondu, pour max croustillant'),
    (v_recipe_id, 'sel',                      1,   'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'poivre noir',              1,   'pincée',     true,  5,  NULL),
    (v_recipe_id, 'paprika fumé',             0.5, 'c. à café',  true,  6,  NULL),
    -- Sauce + salade
    (v_recipe_id, 'yaourt grec',              200, 'g',          true,  7,  'ou fromage blanc'),
    (v_recipe_id, 'mayonnaise',               5,   'ml',         true,  8,  '1 c. à café'),
    (v_recipe_id, 'moutarde',                 5,   'g',          true,  9,  '1 c. à café, Dijon'),
    (v_recipe_id, 'moutarde à l''ancienne',   5,   'g',          true,  10, '1 c. à café'),
    (v_recipe_id, 'concombre',                0.5, 'unité',      true,  11, '~150 g, en petits dés'),
    (v_recipe_id, 'échalote',                 1,   'unité',      true,  12, 'ciselée'),
    (v_recipe_id, 'aneth',                    5,   'g',          true,  13, 'haché'),
    (v_recipe_id, 'ciboulette',               5,   'g',          true,  14, 'ciselée'),
    (v_recipe_id, 'persil',                   5,   'g',          true,  15, 'haché'),
    (v_recipe_id, 'jus de citron',            15,  'ml',         true,  16, '~1 c. à soupe (mentionné step 4)');

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
    'Crêpe street food fourrée populaire en Indonésie, Malaisie, Singapour, Arabie Saoudite et Yémen — souvent servie au Ramadan (suhoor / iftar). Pâte fine et étirée, garniture poulet haché aux épices indiennes, œufs, oignons verts et mozzarella, repliée en parcelle et poêlée jusqu''à doré.',
    $instr$["Pâte : combiner farine, sel, huile (ou ghee) et eau chaude. Pétrir 5 minutes jusqu'à pâte souple. Couvrir et reposer au moins 1 heure (l'étape clé pour pouvoir l'étirer fin).",
"Garniture : faire revenir l'oignon haché dans l'huile jusqu'à fondant. Ajouter pâte gingembre-ail, purée de tomate et les épices (piment, cumin, coriandre, garam masala, sel). Cuire 2 minutes.",
"Ajouter le poulet haché et cuire 10-12 minutes jusqu'à parfait. (Pour bœuf/agneau haché : 15-20 min.)",
"Laisser refroidir complètement, puis incorporer les œufs battus, la coriandre fraîche et les oignons verts.",
"Diviser la pâte en 8 portions et former 8 boules. Sur un plan huilé, étaler chaque boule en feuille très fine (presque translucide) au rouleau huilé ou à la main.",
"Déposer ~2 c. à soupe de garniture au centre, surmonter de 1 c. à soupe de mozzarella râpée.",
"Plier les bords de la pâte sur la garniture comme une enveloppe, en pressant doucement pour aplatir.",
"Poêler avec un peu d'huile à feu moyen-doux 3-4 minutes par face, y compris les bords, jusqu'à doré uniforme. Servir chaud."]
$instr$,
    30, 30, 8, 3,
    'Malaisienne', 'dinner',
    ARRAY['malaysien','indonésien','singapourien','street food','ramadan','iftar','flatbread','farci','poulet haché'],
    'manual',
    'https://www.instagram.com/p/DHGfWbao8YV/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Pâte (pour 8 murtabaks)
    (v_recipe_id, 'farine',                   360, 'g',          true,  1,  '3 cups, pour la pâte'),
    (v_recipe_id, 'huile',                    60,  'ml',         true,  2,  '4 c. à soupe, ou ghee, pour la pâte'),
    (v_recipe_id, 'sel',                      2.5, 'g',          true,  3,  '0.5 c. à café, pour la pâte'),
    (v_recipe_id, 'eau chaude',               240, 'ml',         true,  4,  '1 cup, pour la pâte'),
    -- Garniture
    (v_recipe_id, 'huile',                    30,  'ml',         true,  5,  '2 c. à soupe, pour la garniture'),
    (v_recipe_id, 'oignon',                   1,   'unité',      true,  6,  'petit, haché fin'),
    (v_recipe_id, 'poulet haché',             400, 'g',          true,  7,  'ou bœuf/agneau, +temps cuisson'),
    (v_recipe_id, 'pâte gingembre-ail',       5,   'ml',         true,  8,  '1 c. à café'),
    (v_recipe_id, 'purée de tomate',          15,  'g',          true,  9,  '1 c. à soupe'),
    (v_recipe_id, 'piment rouge moulu',       1,   'c. à café',  false, 10, 'optionnel'),
    (v_recipe_id, 'cumin moulu',              1,   'c. à café',  true,  11, NULL),
    (v_recipe_id, 'coriandre moulue',         1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'garam masala',             0.5, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'sel',                      1,   'c. à café',  true,  14, 'pour la garniture, au goût'),
    (v_recipe_id, 'œufs',                     3,   'unité',      true,  15, '2 à 3, dans la garniture refroidie'),
    (v_recipe_id, 'oignons verts',            2,   'unité',      true,  16, 'ciselés'),
    (v_recipe_id, 'coriandre fraîche',        10,  'g',          true,  17, '2 c. à soupe hachée'),
    (v_recipe_id, 'mozzarella râpée',         100, 'g',          true,  18, '~1 c. à soupe par murtabak'),
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
    'KFC version coréenne : poulet désossé en bouchées, marinade sel-poivre-sésame, pâte fécule de pomme de terre + maïzena (clé du croustillant signature), double friture à 175°C puis 215°C. Glaçage gochujang-miel-ketchup-vinaigre de riz. Crispy outside, juicy inside.',
    $instr$["Couper les cuisses désossées en bouchées (~1 cm). Assaisonner avec sel, poivre blanc, poudre d'ail et huile de sésame. Laisser mariner 30 minutes au frais.",
"Dans un bol, mélanger la fécule de pomme de terre, la maïzena et une pincée de sel. Incorporer progressivement l'eau jusqu'à obtenir une consistance légèrement plus liquide qu'une pâte à pancakes.",
"Verser le poulet mariné dans la pâte et laisser reposer 15 minutes (la pâte adhère mieux).",
"Premier bain : chauffer l'huile à 175°C (350°F). Frire le poulet 6-7 minutes — même si le poulet paraît pâle, on cuit l'intérieur ici.",
"Égoutter sur grille et laisser reposer 5 minutes.",
"Second bain : monter l'huile à 215°C (420°F). Replonger le poulet 3 minutes jusqu'à doré profond et croustillant. Égoutter à nouveau.",
"Sauce : dans une petite poêle, combiner gochujang, ketchup, miel, ail haché et vinaigre de riz. Mijoter à feu doux jusqu'à légèrement épaissi (sirupeux).",
"Enrober le poulet croustillant dans la sauce hors du feu (la sauce caramélise sur le chaud).",
"Servir immédiatement dans un bol, parsemer de graines de sésame et oignons verts ciselés."]
$instr$,
    50, 25, 2, 3,
    'Coréenne', 'appetizer',
    ARRAY['coréen','poulet','frit','gochujang','double friture','sauce sucré-piquante','street food'],
    'manual',
    'https://www.instagram.com/p/DIMMX5hOOw_/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Poulet et marinade
    (v_recipe_id, 'cuisses de poulet désossées', 300, 'g',          true,  1,  '2 cuisses, en cubes 1 cm'),
    (v_recipe_id, 'sel',                         1,   'pincée',     true,  2,  'au goût, marinade'),
    (v_recipe_id, 'poivre blanc moulu',          0.5, 'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'poudre d''ail',               0.5, 'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'huile de sésame',             5,   'ml',         true,  5,  '1 c. à café, marinade'),
    -- Pâte d'enrobage
    (v_recipe_id, 'fécule de pomme de terre',    80,  'g',          true,  6,  '0.5 cup'),
    (v_recipe_id, 'fécule de maïs',              30,  'g',          true,  7,  '0.25 cup'),
    (v_recipe_id, 'sel',                         1,   'pincée',     true,  8,  'pour la pâte'),
    (v_recipe_id, 'eau',                         80,  'ml',         true,  9,  '~0.33 cup, ajuster pour la consistance'),
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
    'Plat classique tze char cantonais (mais singapourien dans son ADN) : nouilles de riz plates (hor fun) saisies à feu très vif au wok pour le "wok hei" (parfum de braise), nappées d''une sauce bœuf-haricots noirs fermentés-ail, œuf et choy sum. Tout dans un seul wok, comme au stall.',
    $instr$["Mariner le bœuf émincé avec sauce soja, vin de Shaoxing et fécule de maïs 15 minutes (la fécule garde la viande tendre).",
"Tremper les haricots noirs fermentés (touchi/dou si) dans un peu d'eau 5 min, égoutter, écraser grossièrement à la fourchette.",
"Faire saisir les nouilles hor fun à sec dans un wok très chaud avec la sauce soja foncée jusqu'à légères marques de char (le wok hei). Réserver sur l'assiette de service.",
"Chauffer l'huile dans le wok à feu très vif. Faire revenir l'ail haché et les haricots noirs écrasés 30 secondes jusqu'au parfum.",
"Ajouter le bœuf mariné et sauter 1-2 minutes jusqu'à juste rosé. Retirer le bœuf, garder les sucs.",
"Ajouter le choy sum (couper si trop long), sauter 1 min. Verser sauce soja, sauce huître, sauce de poisson, un peu d'eau si besoin.",
"Casser l'œuf dans le wok, brouiller rapidement.",
"Verser la fécule diluée (slurry, parts égales fécule + eau) pour épaissir la sauce nappante.",
"Remettre le bœuf et incorporer un dernier coup de feu. Verser le tout sur les nouilles hor fun. Servir immédiatement."]
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
    (v_recipe_id, 'nouilles hor fun',         300, 'g',          true,  1,  'flat rice noodles, fraîches'),
    (v_recipe_id, 'sauce soja foncée',        15,  'ml',         true,  2,  '1 c. à soupe, pour le wok hei'),
    -- Marinade bœuf
    (v_recipe_id, 'bœuf émincé',              160, 'g',          true,  3,  'tranches fines'),
    (v_recipe_id, 'sauce soja',               5,   'ml',         true,  4,  '1 c. à café, marinade'),
    (v_recipe_id, 'vin de Shaoxing',          5,   'ml',         true,  5,  '1 c. à café, marinade'),
    (v_recipe_id, 'fécule de maïs',           2.5, 'g',          true,  6,  '1 c. à café, marinade'),
    -- Sauce et sauté
    (v_recipe_id, 'huile',                    30,  'ml',         true,  7,  '2 c. à soupe'),
    (v_recipe_id, 'ail',                      3,   'gousse',     true,  8,  'hachées'),
    (v_recipe_id, 'haricots noirs fermentés', 15,  'g',          true,  9,  '1 c. à soupe, trempés et écrasés'),
    (v_recipe_id, 'choy sum',                 2,   'unité',      true,  10, 'tiges, coupées en tronçons'),
    (v_recipe_id, 'œuf',                      1,   'unité',      true,  11, NULL),
    (v_recipe_id, 'sauce soja',               15,  'ml',         true,  12, '~1 c. à soupe au goût'),
    (v_recipe_id, 'sauce huître',             5,   'ml',         true,  13, '1 c. à café'),
    (v_recipe_id, 'sauce de poisson',         5,   'ml',         true,  14, '1 c. à café'),
    (v_recipe_id, 'sauce soja foncée',        5,   'ml',         false, 15, '1 c. à café, optionnel pour la couleur'),
    (v_recipe_id, 'sel',                      1,   'pincée',     true,  16, 'au goût'),
    -- Liaison
    (v_recipe_id, 'fécule de pomme de terre', 15,  'g',          true,  17, '1 c. à soupe, slurry'),
    (v_recipe_id, 'eau',                      15,  'ml',         true,  18, '1 c. à soupe, pour le slurry');

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
    'Riz frit chinois au steak et ail confit : l''ail est frit dans l''huile jusqu''à doré (huile d''ail récupérée pour saisir le bœuf), riz du jour précédent sauté avec oignon et double soja sucré-salé. La moitié de l''ail rentre dans le riz, l''autre moitié décore en topping.',
    $instr$["Mariner le steak en cubes avec sauce soja, vin de Shaoxing et fécule de maïs 15 minutes.",
"Mélanger les ingrédients de la sauce (sauce soja foncée, sauce soja claire, sucre, sauce huître, poivre blanc, MSG si utilisé) dans un petit bol.",
"Chauffer l'huile dans une poêle/wok à feu moyen-vif. Faire frire l'ail haché 3 minutes jusqu'à doré (attention, ça brûle vite à la fin). Retirer à l'écumoire et réserver — garder l'huile d'ail dans la poêle.",
"Dans l'huile d'ail, saisir le bœuf 2 minutes à feu vif jusqu'à coloration rapide. Réserver.",
"Ajouter l'oignon dans la même poêle et sauter 1 minute. Verser le riz froid, casser les amas avec la spatule. Verser la sauce et bien mélanger.",
"Remettre le steak et la moitié de l'ail frit dans la poêle. Sauter pour réchauffer.",
"Servir dans un bol, surmonter du reste de l'ail frit et d'oignons verts ciselés."]
$instr$,
    20, 15, 2, 2,
    'Chinoise', 'lunch',
    ARRAY['chinois','riz frit','bœuf','steak','garlic','wok','rapide'],
    'manual',
    'https://www.instagram.com/p/DKUacBZuNdN/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade steak
    (v_recipe_id, 'steak',                    170, 'g',          true,  1,  '6 oz, en cubes 1.25 cm'),
    (v_recipe_id, 'sauce soja',               5,   'ml',         true,  2,  '1 c. à café, marinade'),
    (v_recipe_id, 'vin de Shaoxing',          5,   'ml',         true,  3,  '1 c. à café, marinade'),
    (v_recipe_id, 'fécule de maïs',           2.5, 'g',          true,  4,  '0.5 c. à café, marinade'),
    -- Sauté
    (v_recipe_id, 'oignon jaune',             0.5, 'unité',      true,  5,  'en dés'),
    (v_recipe_id, 'ail',                      4,   'gousse',     true,  6,  'hachées'),
    (v_recipe_id, 'huile neutre',             30,  'ml',         true,  7,  'pour frire l''ail'),
    (v_recipe_id, 'riz cuit',                 400, 'g',          true,  8,  '2 cups, de la veille (essentiel)'),
    -- Sauce
    (v_recipe_id, 'sauce soja foncée',        15,  'ml',         true,  9,  '1 c. à soupe'),
    (v_recipe_id, 'sauce soja claire',        15,  'ml',         true,  10, '1 c. à soupe'),
    (v_recipe_id, 'sucre',                    5,   'g',          true,  11, '1 c. à café'),
    (v_recipe_id, 'sauce huître',             5,   'ml',         true,  12, '1 c. à café'),
    (v_recipe_id, 'poivre blanc moulu',       0.25, 'c. à café', true,  13, NULL),
    (v_recipe_id, 'MSG',                      1,   'pincée',     false, 14, 'optionnel'),
    -- Garniture
    (v_recipe_id, 'oignons verts',            1,   'unité',      false, 15, 'ciselés, garniture');

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
    'Musubi (rice ball hawaïen-japonais) version saumon épicé : riz japonais pressé, mayo Kewpie-citron-sucre-sriracha-masago, saumon poêlé doré sur les deux faces, finition au chalumeau pour char sur la mayo. Wrappé dans une feuille de nori.',
    $instr$["Laver le riz à grande eau jusqu'à ce que l'eau ressorte claire. Cuire au rice cooker (ratio standard).",
"Couper les filets de saumon en sections de taille musubi (rectangulaires, ~10x6 cm). Pour un musubi plus fin, trancher en deux dans l'épaisseur. Assaisonner légèrement de sel et poivre.",
"Cuire le saumon à feu moyen-doux 3-4 minutes par face jusqu'à doré sur toutes les faces. Réserver.",
"Préparer la sauce : mélanger mayonnaise Kewpie, jus de citron (ou citron vert), sucre, sriracha et masago dans un bol.",
"Découper 4 feuilles de nori en deux (8 demi-feuilles).",
"Assembler chaque musubi : remplir le moule à musubi aux 2/3 de riz cuit. Tasser légèrement au piston. Saupoudrer de furikake. Tasser à fond, puis démouler en pressant l'intérieur du piston tout en relevant le cadre.",
"Étaler une couche de mayo épicée sur le riz. Poser le saumon cuit. Étaler à nouveau de la mayo épicée par-dessus.",
"Passer le chalumeau sur la mayo jusqu'à légère carbonisation (sinon four en mode broil 1-2 min).",
"Wrapper avec une demi-feuille de nori (face brillante à l'extérieur, face rugueuse à l'intérieur — c'est le côté qui adhère). Servir immédiatement."]
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
    (v_recipe_id, 'mayonnaise Kewpie',        60,  'ml',         true,  4,  '0.25 cup'),
    (v_recipe_id, 'jus de citron',            15,  'ml',         true,  5,  '~0.5 citron, ou citron vert'),
    (v_recipe_id, 'sucre',                    2.5, 'g',          true,  6,  '0.5 c. à café'),
    (v_recipe_id, 'masago',                   15,  'g',          true,  7,  '1 c. à soupe, œufs de capelan'),
    (v_recipe_id, 'sriracha',                 7.5, 'ml',         true,  8,  '0.5 c. à soupe'),
    -- Riz + finition
    (v_recipe_id, 'riz japonais',             600, 'g',          true,  9,  '3 cups cuits'),
    (v_recipe_id, 'feuilles de nori',         4,   'unité',      true,  10, 'coupées en 2'),
    (v_recipe_id, 'furikake',                 30,  'g',          true,  11, NULL),
    (v_recipe_id, 'moule à musubi',           1,   'unité',      true,  12, 'équipement'),
    (v_recipe_id, 'chalumeau',                1,   'unité',      false, 13, 'équipement, ou broil four');

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
    'Musubi katsu (poulet pané croustillant) glacé d''une sauce hot honey + beurre (combo 2 ingrédients qui claque). Pressé sur du riz au furikake et wrappé dans une feuille de nori. Inspiration street food hawaïenne × izakaya japonais.',
    $instr$["Laver et cuire le riz au rice cooker (ratio standard).",
"Pâte à frire : mélanger œufs, farine, paprika, poivre et sel dans un bol. Dans un plat plat à part, étaler le panko et parsemer de persil haché.",
"Aplatir les cuisses de poulet sous film alimentaire au maillet jusqu'à ~1 cm d'épaisseur. Assaisonner légèrement sel-poivre.",
"Friture : remplir une poêle moyenne d'huile sur ~1,5 cm. Chauffer à 165°C (330°F) — tester en saupoudrant un peu de panko, il doit pétiller. Plonger chaque cuisse dans l'œuf-farine, puis dans le panko (2 faces), puis dans l'huile. Frire jusqu'à doré sur les 2 faces. Égoutter sur grille.",
"Glaçage : dans une petite casserole à feu doux, mélanger hot honey et beurre jusqu'à incorporation. Retirer du feu.",
"Assembler chaque musubi : remplir le moule de riz cuit, parsemer de furikake. Presser pour former la base.",
"Tremper le katsu dans le glaçage (ou napper). Poser le katsu glacé sur le riz pressé. Étaler encore un peu de glaçage. Parsemer de furikake.",
"Wrapper avec une feuille de nori. Servir immédiatement, le panko est encore croustillant à cœur."]
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
    (v_recipe_id, 'cuisses de poulet',        4,   'unité',      true,  1,  '4 à 5 pièces, désossées'),
    (v_recipe_id, 'œufs',                     3,   'unité',      true,  2,  'pour la pâte à frire'),
    (v_recipe_id, 'farine',                   32,  'g',          true,  3,  '4 c. à soupe, AP'),
    (v_recipe_id, 'paprika',                  5,   'g',          true,  4,  '1 c. à café'),
    (v_recipe_id, 'poivre noir',              2.5, 'g',          true,  5,  '0.5 c. à café'),
    (v_recipe_id, 'sel',                      1,   'pincée',     true,  6,  'pour la pâte + poulet'),
    (v_recipe_id, 'panko',                    200, 'g',          true,  7,  'pour l''enrobage'),
    (v_recipe_id, 'persil frais',             5,   'g',          true,  8,  'haché, mélangé au panko'),
    (v_recipe_id, 'huile neutre',             500, 'ml',         true,  9,  'pour la friture'),
    -- Glaçage hot honey beurre
    (v_recipe_id, 'hot honey',                60,  'ml',         true,  10, '0.25 cup, Trader Joe''s ou équivalent'),
    (v_recipe_id, 'beurre',                   30,  'g',          true,  11, '2 c. à soupe'),
    -- Assemblage
    (v_recipe_id, 'riz japonais cuit',        600, 'g',          true,  12, '3 cups, chaud'),
    (v_recipe_id, 'furikake',                 30,  'g',          true,  13, NULL),
    (v_recipe_id, 'feuilles de nori',         4,   'unité',      true,  14, 'pour wrapper'),
    (v_recipe_id, 'moule à musubi',           1,   'unité',      true,  15, 'équipement');

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
    'Salade de smashed potatoes version asiatique fusion : Jersey Royals (ou grenailles) bouillies puis écrasées puis rôties, sauce crémeuse mayo-yaourt-tahini-chilli crisp-soja-citron vert-gingembre-coriandre. Final : graines de sésame noir + blanc torréfiées.',
    $instr$["Bouillir les Jersey Royals (ou autres petites pommes de terre nouvelles) dans une grande casserole d'eau salée jusqu'à très tendres au couteau (~15-20 min).",
"Égoutter et étaler sur une plaque. Écraser chaque pomme de terre au fond d'un verre pour exposer un maximum de surface.",
"Badigeonner d'huile d'olive, saler-poivrer. Enfourner à 200°C pendant 30-35 min jusqu'à doré profond et croustillant aux bords.",
"Pendant la cuisson, préparer la sauce : fouetter ensemble mayo, yaourt grec, tahini, chilli crisp, zeste + jus de lime, sauce soja, vinaigre de riz, ail et gingembre minced. Goûter — ajuster chilli crisp selon préférence piquante.",
"Sortir les pommes de terre du four, laisser tiédir 5 min.",
"Dans un grand bol, mélanger les pommes de terre tièdes avec la moitié de la sauce. Garnir d'oignons verts ciselés et de coriandre fraîche hachée.",
"Saupoudrer du mélange de graines de sésame noir + blanc torréfiées en finition. Servir le reste de sauce à part pour saucer."]
$instr$,
    15, 45, 4, 2,
    'Asiatique', 'lunch',
    ARRAY['asiatique','fusion','salade','smashed potatoes','jersey royal','chilli crisp','tahini','sésame','side'],
    'manual',
    'https://www.instagram.com/p/DKSJa1GKIML/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Pommes de terre rôties
    (v_recipe_id, 'pommes de terre Jersey Royal', 750, 'g',          true,  1,  'ou grenailles / nouvelles'),
    (v_recipe_id, 'huile d''olive',               30,  'ml',         true,  2,  'pour badigeonner'),
    (v_recipe_id, 'sel',                          1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'poivre noir',                  1,   'pincée',     true,  4,  NULL),
    -- Sauce chilli crisp tahini
    (v_recipe_id, 'mayonnaise',                   60,  'ml',         true,  5,  '4 c. à soupe'),
    (v_recipe_id, 'yaourt grec',                  60,  'g',          true,  6,  '4 c. à soupe'),
    (v_recipe_id, 'tahini',                       30,  'ml',         true,  7,  '2 c. à soupe'),
    (v_recipe_id, 'chilli crisp',                 10,  'g',          true,  8,  '2 c. à café, ajuster au goût'),
    (v_recipe_id, 'citron vert',                  1,   'unité',      true,  9,  'zeste + jus'),
    (v_recipe_id, 'sauce soja',                   15,  'ml',         true,  10, '1 c. à soupe'),
    (v_recipe_id, 'vinaigre de riz',              15,  'ml',         true,  11, '1 c. à soupe'),
    (v_recipe_id, 'ail',                          1,   'gousse',     true,  12, 'haché fin'),
    (v_recipe_id, 'gingembre',                    15,  'g',          true,  13, '~1 phalange, haché fin'),
    -- Garniture
    (v_recipe_id, 'oignons verts',                1,   'unité',      true,  14, '2 c. à soupe ciselés'),
    (v_recipe_id, 'coriandre fraîche',            10,  'g',          true,  15, '2 c. à soupe hachée'),
    (v_recipe_id, 'graines de sésame',            30,  'g',          true,  16, '1 c. à soupe noir + 1 blanc, torréfiées');

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
    'Poulet frit malaisien : marinade longue (4 h à overnight) au lait de coco infusé d''une pâte d''aromates (gingembre, échalotes, ail, citronnelle, piments) et d''épices (curcuma, coriandre, piment, curry). Dragage double-farine puis friture profonde. Plus parfumé que KFC.',
    $instr$["Si le lait de coco est solidifié, plonger la boîte dans un bol d'eau chaude 5 minutes pour la liquéfier.",
"Mixer ensemble gingembre, piments rouges, échalotes, ail et citronnelle en pâte fine.",
"Verser le lait de coco dans un grand bol. Ajouter la pâte d'aromates, le jus de citron vert, le sel et LA MOITIÉ des épices (curry, coriandre, curcuma, piment). Bien mélanger.",
"Aplatir légèrement les morceaux de poulet (notamment les blancs) au maillet pour une forme plus uniforme, puis les ajouter à la marinade coco-épicée.",
"Couvrir et laisser mariner au frais minimum 4 heures (idéal une nuit).",
"Dragage : dans un grand bol, mélanger farine, fécule de maïs et le reste des épices. Dredger les morceaux de poulet directement de la marinade dans le mélange de farines, secouer l'excédent. Reposer sur grille 5 minutes (la pâte s'hydrate et adhère).",
"Friture : dans un grand wok profond, chauffer l'huile à feu moyen (~170°C). Tester avec une pincée de farine — elle doit bulleuser. Plonger délicatement les morceaux loin de vous.",
"Frire les cuisses 10-12 minutes, les blancs 12-14 minutes en retournant à mi-cuisson. Vérifier au thermomètre — cœur à 75°C.",
"Égoutter sur grille et laisser reposer 5 minutes. Hacher coriandre et piment frais pour la garniture. Servir avec sambal et riz."]
$instr$,
    30, 30, 4, 3,
    'Malaisienne', 'dinner',
    ARRAY['malaysien','singapourien','poulet frit','ayam goreng','lait de coco','marinade overnight','double enrobage','street food'],
    'manual',
    'https://www.instagram.com/p/DIXHtUbo-ZJ/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Poulet + marinade liquide
    (v_recipe_id, 'poulet entier',              4,   'unité',      true,  1,  'en quartiers, ~1.5 kg'),
    (v_recipe_id, 'lait de coco',               400, 'ml',         true,  2,  '1 boîte'),
    -- Pâte d'aromates (à mixer)
    (v_recipe_id, 'gingembre',                  150, 'g',          true,  3,  'pour la pâte'),
    (v_recipe_id, 'piments rouges frais',       2,   'unité',      true,  4,  NULL),
    (v_recipe_id, 'échalotes',                  4,   'unité',      true,  5,  NULL),
    (v_recipe_id, 'ail',                        6,   'gousse',     true,  6,  NULL),
    (v_recipe_id, 'citronnelle',                2,   'unité',      true,  7,  'tiges, parties blanches'),
    (v_recipe_id, 'citron vert',                2,   'unité',      true,  8,  'jus'),
    -- Épices (moitié dans marinade, moitié dans dragage)
    (v_recipe_id, 'curry en poudre',            30,  'g',          true,  9,  '2 c. à soupe'),
    (v_recipe_id, 'coriandre moulue',           30,  'g',          true,  10, '2 c. à soupe'),
    (v_recipe_id, 'curcuma moulu',              30,  'g',          true,  11, '2 c. à soupe'),
    (v_recipe_id, 'piment rouge moulu',         30,  'g',          true,  12, '2 c. à soupe'),
    (v_recipe_id, 'sel',                        7.5, 'g',          true,  13, '0.5 c. à soupe'),
    -- Dragage
    (v_recipe_id, 'farine',                     150, 'g',          true,  14, 'pour le dragage'),
    (v_recipe_id, 'fécule de maïs',             150, 'g',          true,  15, 'pour le dragage'),
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
    'Pommes de terre grenaille bouillies à 80 %, écrasées en croix, assaisonnées d''un mélange cajun maison (paprika, ail/oignon en poudre, origan, poivre blanc) puis cuites à l''air fryer 30 min jusqu''à ultra-croustillantes. Sauce dip mayo-ketchup-cajun-hot sauce-citron.',
    $instr$["Bouillir les baby potatoes dans de l'eau salée jusqu'à 80 % de cuisson (un couteau pénètre avec un peu de résistance). Égoutter.",
"Préparer le mélange cajun : mélanger paprika, poudre d'ail, sel, poudre d'oignon, origan séché et poivre blanc dans un petit bol.",
"Sur une planche, faire deux entailles en croix sur le dessus de chaque pomme de terre, puis les écraser avec le fond d'un verre (pas trop fort sinon elles éclatent).",
"Disposer dans un bol, arroser d'huile d'olive et saupoudrer généreusement de mélange cajun. Mélanger délicatement pour enrober.",
"Air fryer : disposer en une seule couche dans le panier. Cuire à 200°C (400°F) pendant 20 min sur une face.",
"Retourner les pommes de terre. Poursuivre la cuisson 10 minutes (ou plus) jusqu'à dorage croustillant aux deux faces.",
"Sauce : mélanger mayonnaise, ketchup, 1 c. à soupe du mélange cajun préparé, jus de citron et hot sauce dans un bol.",
"Servir les smashed potatoes chaudes, arroser de sauce ou servir la sauce en dip à côté."]
$instr$,
    10, 35, 4, 1,
    'Américaine', 'snack',
    ARRAY['américain','cajun','louisiana','pommes de terre','smashed','air fryer','épicé','sauce','side'],
    'manual',
    'https://www.instagram.com/p/DLPzN1QRQqg/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Pommes de terre
    (v_recipe_id, 'pommes de terre grenaille',  500, 'g',          true,  1,  '10-12 baby potatoes'),
    (v_recipe_id, 'huile d''olive',             45,  'ml',         true,  2,  '3 c. à soupe'),
    -- Mélange cajun maison
    (v_recipe_id, 'paprika',                    22.5, 'g',         true,  3,  '1.5 c. à soupe'),
    (v_recipe_id, 'poudre d''ail',              15,  'g',          true,  4,  '1 c. à soupe'),
    (v_recipe_id, 'sel',                        7.5, 'g',          true,  5,  '0.5 c. à soupe'),
    (v_recipe_id, 'poudre d''oignon',           15,  'g',          true,  6,  '1 c. à soupe'),
    (v_recipe_id, 'origan séché',               7.5, 'g',          true,  7,  '0.5 c. à soupe'),
    (v_recipe_id, 'poivre blanc moulu',         7.5, 'g',          true,  8,  '0.5 c. à soupe'),
    -- Sauce dip
    (v_recipe_id, 'mayonnaise',                 30,  'ml',         true,  9,  '2 c. à soupe, sauce'),
    (v_recipe_id, 'ketchup',                    15,  'ml',         true,  10, '1 c. à soupe, sauce'),
    (v_recipe_id, 'mélange cajun',              15,  'g',          true,  11, '1 c. à soupe (prélevée ci-dessus)'),
    (v_recipe_id, 'jus de citron',              7.5, 'ml',         true,  12, '0.5 c. à soupe, sauce'),
    (v_recipe_id, 'hot sauce',                  15,  'ml',         true,  13, '1 c. à soupe, sauce');

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
    'Pasta crémeuse façon trattoria toscane (style américain) : poulet poêlé aux épices italiennes, sauce crème + parmesan + tomate concentrée + tomates cerises + tomates séchées, finition épinards. Rigatoni qui retient la sauce.',
    $instr$["Cuire les rigatoni selon le paquet (al dente). Réserver 1 tasse (240 ml) d'eau de cuisson avant d'égoutter.",
"Saler le poulet et l'assaisonner avec poivre, poudre d'ail, paprika fumé, mélange italien et huile. Bien mélanger.",
"Dans une poêle à feu moyen, chauffer un peu d'huile. Cuire le poulet 12-15 minutes en retournant à mi-cuisson, jusqu'à cœur cuit. Réserver.",
"Dans une autre grande poêle, faire fondre le beurre avec l'huile à feu moyen. Ajouter l'échalote et l'ail hachés, sauter 1 minute jusqu'au parfum.",
"Ajouter les tomates cerises coupées en deux et le poivron rouge en dés, cuire 1-2 min jusqu'à fondants.",
"Ajouter le concentré de tomate et toutes les épices (sel, poivre, ail en poudre, paprika fumé, italien, flocons de piment). Bien mélanger. Ajouter les tomates séchées hachées.",
"Réduire à feu doux et verser la crème entière. Bien incorporer.",
"Incorporer le parmesan râpé. Mélanger jusqu'à la consistance souhaitée. Ajouter de l'eau de cuisson par cuillerées si la sauce est trop épaisse.",
"Ajouter les épinards et cuire 1 minute jusqu'à tombé. Ajouter les pâtes égouttées.",
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
    (v_recipe_id, 'blanc de poulet',            454, 'g',          true,  1,  '1 lb, en filets'),
    (v_recipe_id, 'paprika fumé',               5,   'g',          true,  2,  '1 c. à café, poulet'),
    (v_recipe_id, 'poudre d''ail',              15,  'g',          true,  3,  '1 c. à soupe, poulet'),
    (v_recipe_id, 'mélange italien',            5,   'g',          true,  4,  '1 c. à café, herbes séchées'),
    (v_recipe_id, 'poivre noir',                5,   'g',          true,  5,  '1 c. à café, poulet'),
    (v_recipe_id, 'huile végétale',             30,  'ml',         true,  6,  '2 c. à soupe + plus pour cuisson'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  7,  'pour le poulet, au goût'),
    -- Sauce
    (v_recipe_id, 'crème entière',              480, 'ml',         true,  8,  '2 cups, non sucrée'),
    (v_recipe_id, 'beurre',                     15,  'g',          true,  9,  '1 c. à soupe'),
    (v_recipe_id, 'huile végétale',             30,  'ml',         true,  10, '2 c. à soupe, sauce'),
    (v_recipe_id, 'échalote',                   1,   'unité',      true,  11, 'ou petit oignon, en dés fins'),
    (v_recipe_id, 'ail',                        8,   'gousse',     true,  12, 'hachées'),
    (v_recipe_id, 'poivron rouge',              0.5, 'unité',      true,  13, 'en dés'),
    (v_recipe_id, 'paprika fumé',               5,   'g',          true,  14, '1 c. à café, sauce'),
    (v_recipe_id, 'poudre d''ail',              5,   'g',          true,  15, '1 c. à café, sauce'),
    (v_recipe_id, 'poivre noir',                5,   'g',          true,  16, '1 c. à café, sauce'),
    (v_recipe_id, 'mélange italien',            2.5, 'g',          true,  17, '0.5 c. à café, sauce'),
    (v_recipe_id, 'flocons de piment rouge',    5,   'g',          true,  18, '1 c. à café'),
    (v_recipe_id, 'parmesan râpé',              50,  'g',          true,  19, '0.5 cup fraîchement râpé'),
    (v_recipe_id, 'eau de cuisson des pâtes',   240, 'ml',         true,  20, '1 cup réservée'),
    (v_recipe_id, 'épinards',                   30,  'g',          true,  21, '1 cup, frais'),
    (v_recipe_id, 'tomates cerises',            150, 'g',          true,  22, '12, coupées en deux'),
    (v_recipe_id, 'concentré de tomate',        30,  'g',          true,  23, '2 c. à soupe'),
    (v_recipe_id, 'tomates séchées',            30,  'g',          true,  24, '2 c. à soupe, hachées'),
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  25, 'pour la sauce, au goût'),
    -- Assemblage
    (v_recipe_id, 'rigatoni',                   227, 'g',          true,  26, '8 oz, demi-paquet'),
    (v_recipe_id, 'parmesan',                   20,  'g',          false, 27, 'pour garnir'),
    (v_recipe_id, 'persil frais',               5,   'g',          false, 28, '1 c. à soupe haché');

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
    'Fettuccine Alfredo style américain (riche, crémeux) : roux beurre-farine, crème épaisse, parmesan fraîchement râpé en finition. Pâtes nappées et soyeuses. La version originale Alfredo (Rome) n''utilise QUE beurre + parmesan + eau de cuisson — c''est une variante plus crémeuse popularisée aux USA.',
    $instr$["Porter une grande casserole d'eau salée à ébullition. Cuire les fettuccine selon le paquet jusqu'à al dente. Réserver 1 cup (240 ml) d'eau de cuisson avant d'égoutter.",
"Dans une grande sauteuse, faire fondre le beurre à feu moyen.",
"Saupoudrer la farine sur le beurre fondu et fouetter pour combiner. Cuire 1-2 minutes en remuant constamment (roux blond, pas coloré).",
"Verser progressivement la crème entière en fouettant continuellement pour éviter les grumeaux. Porter à frémissement et cuire 2-3 minutes jusqu'à légèrement épaissi.",
"Retirer du feu et incorporer le parmesan en plusieurs fois en fouettant à chaque ajout jusqu'à fondu et lisse. Assaisonner sel, poivre noir, poudre d'ail et mélange italien.",
"Ajouter les fettuccine égouttées à la sauteuse et bien enrober. Si la sauce est trop épaisse, détendre avec de l'eau de cuisson réservée par cuillerées jusqu'à consistance crémeuse nappante.",
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
    (v_recipe_id, 'sel',                        1,   'c. à café',  true,  2,  'pour l''eau de cuisson + finition'),
    (v_recipe_id, 'beurre',                     115, 'g',          true,  3,  '0.5 cup'),
    (v_recipe_id, 'crème entière',              480, 'ml',         true,  4,  '2 cups, non sucrée'),
    (v_recipe_id, 'farine',                     12,  'g',          true,  5,  '1.5 c. à soupe, pour le roux'),
    (v_recipe_id, 'parmesan râpé',              100, 'g',          true,  6,  '1 cup, fraîchement râpé'),
    (v_recipe_id, 'eau de cuisson des pâtes',   240, 'ml',         true,  7,  '1 cup réservée'),
    (v_recipe_id, 'poivre noir',                5,   'g',          true,  8,  '1 c. à café'),
    (v_recipe_id, 'poudre d''ail',              15,  'g',          true,  9,  '1 c. à soupe'),
    (v_recipe_id, 'mélange italien',            5,   'g',          true,  10, '1 c. à café, herbes séchées'),
    (v_recipe_id, 'persil frais',               10,  'g',          true,  11, '2 c. à soupe, haché');

  RAISE NOTICE 'Seed: Instagram recipes batch inserted for user % (18 recipes so far)', v_user_id;
END $$;
