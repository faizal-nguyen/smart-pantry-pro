-- =====================================================================
-- Seed: 14 Japanese recipes from justonecookbook.com (2026-05-21)
--
-- Sources fetched 2026-05-21 (WordPress blog, WebFetch OK) :
--    1. https://www.justonecookbook.com/soboro-udon/
--    2. https://www.justonecookbook.com/gapao-rice/
--    3. https://www.justonecookbook.com/pizza-toast/
--    4. https://www.justonecookbook.com/japanese-egg-sandwich-tamago-sando/
--    5. https://www.justonecookbook.com/shrimp-fried-rice/
--    6. https://www.justonecookbook.com/chicken-fried-rice/
--    7. https://www.justonecookbook.com/simple-chicken-curry/
--    8. https://www.justonecookbook.com/oyakodon/
--    9. https://www.justonecookbook.com/gyudon/
--   10. https://www.justonecookbook.com/yaki-keema-curry/
--   11. https://www.justonecookbook.com/tori-soboro-donburi/
--   12. https://www.justonecookbook.com/yakitori-don/
--   13. https://www.justonecookbook.com/teriyaki-salmon-recipe/
--   14. https://www.justonecookbook.com/10-minute-meal-mapo-tofu/
--
-- Note: distinct du seed `2026-05-19-add-recipetineats-japan.sql`.
-- Noms uniques pour éviter collision avec d'autres seeds japonais.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-21-add-justonecookbook.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Soboro Udon (Nouilles Udon Sauce Poulet)',
    'Gapao Rice (Riz au Bœuf-Basilic Japonais)',
    'Gapao Rice (Riz au Porc-Basilic Japonais)', -- ancien nom, nettoyé si la recette n'a pas encore été migrée
    'Pizza Toast Japonais',
    'Tamago Sando (Sandwich Œufs Japonais)',
    'Shrimp Fried Rice (Ebi Chahan)',
    'Chicken Fried Rice (Chikin Raisu)',
    'Japanese Chicken Curry',
    'Oyakodon (Bol Riz Poulet-Œuf)',
    'Gyudon (Bol Riz Bœuf Japonais)',
    'Yaki Keema Curry (Curry Japonais Gratiné)',
    'Tori Soboro Donburi',
    'Yakitori Don',
    'Saumon Teriyaki (Just One Cookbook)',
    'Mapo Tofu Style Japonais (10 min)'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Soboro Udon
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Soboro Udon (Nouilles Udon Sauce Poulet)',
    'Bol réconfortant de nouilles udon épaisses et moelleuses, garni de poulet haché savoureux (soboro) et d''un œuf poché. Une sauce sucrée-salée riche en umami et un jaune coulant.',
    $instr$["Émincer finement l'oignon vert en séparant le blanc du vert ; râper le gingembre en conservant son jus.",
"Mélanger le vinaigre de riz, l'eau, la sauce soja et le sucre dans un bol ; dans un autre, délayer la fécule dans 3 c. à soupe d'eau.",
"Chauffer l'huile de sésame à feu moyen, ajouter le blanc d'oignon vert et le gingembre, et les faire revenir jusqu'à ce qu'ils embaument.",
"Ajouter le poulet haché et l'émietter à la spatule jusqu'à ce qu'il soit cuit, puis verser la sauce et la fécule délayée et laisser épaissir.",
"Plonger les nouilles udon surgelées 1 minute dans l'eau bouillante pour les réchauffer.",
"Casser un œuf dans un bol allant au micro-ondes, verser 6 c. à soupe d'eau autour et piquer le jaune.",
"Cuire 90 secondes au micro-ondes à puissance réduite (500 W), jusqu'à ce que le blanc soit pris ; recommencer avec le second œuf.",
"Répartir les nouilles dans les bols, garnir de soboro puis déposer l'œuf poché égoutté.",
"Parsemer du vert d'oignon et, si désiré, de shichimi togarashi."]
$instr$,
    5, 10, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['nouilles udon','poulet haché','soboro','japonais','rapide','umami','œuf poché'],
    'manual',
    'https://www.justonecookbook.com/soboro-udon/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2025/10/Soboro-Udon-2957-I-3.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon vert',                1,   'unité',      true,  1,  'blanc et vert séparés, émincés'),
    (v_recipe_id, 'gingembre',                  2.5, 'cm',         true,  2,  'frais, râpé avec son jus'),
    (v_recipe_id, 'huile de sésame grillée',    1,   'c. à soupe', true,  3,  'pour faire revenir'),
    (v_recipe_id, 'poulet haché',               225, 'g',          true,  4,  NULL),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  5,  'gros'),
    (v_recipe_id, 'nouilles udon',              500, 'g',          true,  6,  'surgelées ou précuites, 2 portions'),
    (v_recipe_id, 'vinaigre de riz',            4,   'c. à café',  true,  7,  'sauce'),
    (v_recipe_id, 'eau',                        4,   'c. à café',  true,  8,  'sauce'),
    (v_recipe_id, 'sauce soja',                 3,   'c. à soupe', true,  9,  'sauce'),
    (v_recipe_id, 'sucre',                      1.5, 'c. à soupe', true,  10, 'sauce'),
    (v_recipe_id, 'fécule de pomme de terre',   1,   'c. à café',  true,  11, 'ou fécule de maïs'),
    (v_recipe_id, 'eau',                        3,   'c. à soupe', true,  12, 'pour délayer la fécule'),
    (v_recipe_id, 'eau',                        180, 'ml',         true,  13, 'pour pocher les œufs, 6 c. à soupe par œuf'),
    (v_recipe_id, 'shichimi togarashi',         1,   'pincée',     false, 14, 'optionnel');

  -- =====================================================================
  -- 2. Gapao Rice (Pad Krapao Japonais)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Gapao Rice (Riz au Bœuf-Basilic Japonais)',
    'Adaptation japonaise du pad krapao thaïlandais : bœuf haché sauté au basilic, relevé d''ail et de piment, servi sur du riz japonais avec un œuf au plat. Prêt en 15 minutes.',
    $instr$["Préparer la sauce en mélangeant la sauce soja, la sauce d'huître, la sauce de poisson, le sucre et l'eau.",
"Couper l'oignon en petits dés et le poivron en carrés.",
"Chauffer l'huile dans une poêle, ajouter l'ail et le piment finement hachés.",
"Ajouter le bœuf haché et l'émietter à la spatule jusqu'à ce qu'il soit cuit.",
"Ajouter l'oignon et le cuire jusqu'à ce qu'il soit translucide.",
"Ajouter le poivron rouge et cuire 2 minutes.",
"Verser la sauce et laisser réduire légèrement.",
"Éteindre le feu et incorporer les feuilles de basilic.",
"Servir sur du riz chaud, garni d'un œuf au plat et de basilic frais."]
$instr$,
    5, 10, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['bœuf haché','basilic','thaïlandais','japonais','wok','rapide','riz'],
    'manual',
    'https://www.justonecookbook.com/gapao-rice/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2027/02/Gapao-Rice-4486-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 250, 'g',          true,  1,  'ou autre viande hachée'),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  2,  'petit'),
    (v_recipe_id, 'poivron rouge',              0.25,'unité',      true,  3,  'épépiné'),
    (v_recipe_id, 'piment oiseau',              2,   'unité',      true,  4,  'ou piment serrano'),
    (v_recipe_id, 'ail',                        3,   'gousse',     true,  5,  'haché finement'),
    (v_recipe_id, 'basilic',                    10,  'feuille',    true,  6,  'idéalement basilic sacré'),
    (v_recipe_id, 'huile neutre',               1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'œufs',                       2,   'unité',      true,  8,  'pour les œufs au plat'),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  9,  '2 portions'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'sauce d''huître',            1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'sauce de poisson',           1,   'c. à café',  true,  12, 'nuoc-mâm'),
    (v_recipe_id, 'sucre',                      1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'eau',                        2,   'c. à soupe', true,  14, NULL);

  -- =====================================================================
  -- 3. Pizza Toast Japonais
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Pizza Toast Japonais',
    'Toast épais de pain de mie japonais (shokupan) garni de sauce tomate maison, de dinde fumée, d''oignon, de poivron, de tomates cerises et de mozzarella fondante. Un en-cas yōshoku nostalgique très populaire au Japon.',
    $instr$["Chauffer l'huile à feu moyen-doux, ajouter les flocons de piment et l'ail, et cuire 2 minutes jusqu'à ce qu'ils embaument.",
"Incorporer le ketchup et bien mélanger.",
"Saler, poivrer, transférer dans un bol et laisser refroidir.",
"Couper le pain de mie en tranches épaisses (2 cm) ; les couper en deux pour les enfants.",
"Étaler environ 1 c. à soupe de sauce tomate sur chaque tranche et parsemer d'un peu de mozzarella.",
"Disposer l'oignon doux, le poivron vert, la dinde fumée en lanières et les tomates cerises.",
"Couvrir généreusement du reste de mozzarella (environ 2 c. à soupe par toast).",
"Enfourner sur la grille du milieu, au four ou au four grille-pain, à 230°C pendant environ 10 minutes.",
"Servir aussitôt, saupoudré de flocons de piment supplémentaires si désiré."]
$instr$,
    5, 10, 3, 2,
    'Japonaise', 'snack',
    ARRAY['pain de mie','shokupan','yoshoku','fromage','toast','collation','enfant'],
    'manual',
    'https://www.justonecookbook.com/pizza-toast/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2025/09/Pizza-Toast-8478-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pain de mie',                3,   'tranche',    true,  1,  'japonais (shokupan), 2 cm d''épaisseur'),
    (v_recipe_id, 'huile d''olive',             1,   'c. à soupe', true,  2,  'pour la sauce'),
    (v_recipe_id, 'flocons de piment',          0.25,'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  4,  'écrasée'),
    (v_recipe_id, 'ketchup',                    3,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'sel',                        0.125,'c. à café', true,  6,  'casher, type Diamond Crystal'),
    (v_recipe_id, 'poivre noir',                0.125,'c. à café', true,  7,  'fraîchement moulu'),
    (v_recipe_id, 'mozzarella râpée',           6,   'c. à soupe', true,  8,  'ou plus selon le goût'),
    (v_recipe_id, 'oignon doux',                0.125,'unité',     true,  9,  'tranché finement'),
    (v_recipe_id, 'poivron vert',               0.125,'unité',     true,  10, 'tranché finement'),
    (v_recipe_id, 'tomates cerises',            4,   'unité',      true,  11, 'tranchées'),
    (v_recipe_id, 'dinde fumée',                3,   'tranche',    true,  12, 'en lanières');

  -- =====================================================================
  -- 4. Tamago Sando (Sandwich Œufs Japonais)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Tamago Sando (Sandwich Œufs Japonais)',
    'Sandwich emblématique des konbini japonais : une salade d''œufs crémeuse à la mayonnaise japonaise entre deux tranches de shokupan moelleux, sans croûte et coupé en triangles.',
    $instr$["Couvrir les 3 œufs d'eau, porter à ébullition à feu moyen et cuire 12 minutes.",
"Plonger les œufs dans de l'eau glacée pour arrêter la cuisson, puis les écaler.",
"Écraser les œufs à la fourchette dans un bol, en émiettant les blancs de façon homogène.",
"Ajouter le sucre, le sel et le poivre, et mélanger délicatement.",
"Incorporer le lait et la mayonnaise, bien mélanger et rectifier l'assaisonnement.",
"Beurrer chaque tranche de pain et répartir la garniture sur 2 tranches.",
"Couvrir avec les autres tranches, côté beurré contre la garniture, et presser légèrement.",
"Laisser reposer 5 minutes entre deux assiettes pour que le sandwich se tienne.",
"Retirer les croûtes sur les 4 côtés et couper les sandwichs en diagonale.",
"Servir aussitôt ou conserver dans une boîte hermétique au réfrigérateur (2 jours maximum)."]
$instr$,
    10, 15, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['sandwich japonais','œufs','shokupan','konbini','déjeuner','mayonnaise','rapide'],
    'manual',
    'https://www.justonecookbook.com/japanese-egg-sandwich-tamago-sando/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2019/03/Tamago-Sando-I-1-250x250.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'œufs',                       3,   'unité',      true,  1,  'gros, 50 g chacun'),
    (v_recipe_id, 'sucre',                      0.25,'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  3,  'casher, type Diamond Crystal'),
    (v_recipe_id, 'poivre noir',                0.125,'c. à café', true,  4,  'fraîchement moulu'),
    (v_recipe_id, 'lait',                       2,   'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'mayonnaise japonaise',       2,   'c. à soupe', true,  6,  'type Kewpie'),
    (v_recipe_id, 'pain de mie',                4,   'tranche',    true,  7,  'japonais (shokupan)'),
    (v_recipe_id, 'beurre salé',                15,  'g',          true,  8,  'pour tartiner');

  -- =====================================================================
  -- 5. Shrimp Fried Rice (Ebi Chahan)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Shrimp Fried Rice (Ebi Chahan)',
    'Riz sauté aux crevettes à la chinoise, version japonaise : grains bien saisis au wok, œuf moelleux et crevettes juste saisies.',
    $instr$["Couper les crevettes en morceaux d'environ 1,5 cm.",
"Hacher finement la laitue iceberg et l'oignon vert ; réserver.",
"Battre légèrement l'œuf dans un bol.",
"Chauffer le wok jusqu'à ce qu'il fume presque, verser l'huile neutre, ajouter l'œuf et le brouiller à feu vif jusqu'à ce qu'il soit presque pris, puis le réserver.",
"Dans le même wok, ajouter les crevettes avec le bouillon dashi et le sel, et les cuire jusqu'à ce qu'elles changent de couleur ; réserver.",
"Verser l'huile de sésame grillée et faire revenir l'oignon vert.",
"Ajouter le riz froid, défaire les grumeaux et bien l'enrober d'huile.",
"Remettre l'œuf et les crevettes, puis ajouter la laitue, le poivre blanc, le poivre noir et la sauce soja.",
"Faire sauter 1 minute en remuant souvent et servir aussitôt."]
$instr$,
    10, 10, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['riz frit','crevettes','wok','chahan','japonais','rapide','œuf'],
    'manual',
    'https://www.justonecookbook.com/shrimp-fried-rice/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2020/01/Shrimp-Fried-Rice-6496-I.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'crevettes',                  120, 'g',          true,  1,  'décortiquées et déveinées, environ 6'),
    (v_recipe_id, 'laitue iceberg',             30,  'g',          true,  2,  '1 feuille, hachée'),
    (v_recipe_id, 'oignon vert',                1,   'unité',      true,  3,  'haché finement'),
    (v_recipe_id, 'huile neutre',               2,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  5,  'gros, 50 g sans coquille'),
    (v_recipe_id, 'bouillon dashi',             1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  7,  'casher, type Diamond Crystal'),
    (v_recipe_id, 'huile de sésame grillée',    1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'riz japonais cuit',          330, 'g',          true,  9,  'froid, de la veille de préférence'),
    (v_recipe_id, 'poivre blanc',               0.125,'c. à café', true,  10, NULL),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  11, 'fraîchement moulu'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à café',  true,  12, NULL);

  -- =====================================================================
  -- 6. Chicken Fried Rice (Chikin Raisu)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chicken Fried Rice (Chikin Raisu)',
    'Plat yōshoku populaire : riz sauté au beurre avec poulet en dés, champignons, oignon et petits pois, relevé de ketchup et de purée de tomate. Un classique nostalgique de l''enfance au Japon.',
    $instr$["Préparer la sauce : mélanger le ketchup, la purée de tomate et l'eau dans une petite casserole.",
"Couper le poulet en petits cubes, puis le saler et le poivrer.",
"Hacher finement l'oignon et émincer les champignons.",
"Faire fondre le beurre à feu moyen dans une grande poêle et ajouter l'oignon.",
"Faire revenir l'oignon jusqu'à ce qu'il soit translucide, puis ajouter le poulet.",
"Cuire le poulet jusqu'à ce qu'il ne soit plus rosé, puis ajouter les champignons.",
"Verser la sauce tomate et bien mélanger.",
"Ajouter le riz cuit refroidi et bien l'enrober de sauce.",
"Incorporer les petits pois, mélanger une dernière fois et servir."]
$instr$,
    5, 15, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['riz frit','poulet','yoshoku','japonais','tomate','ketchup','rapide'],
    'manual',
    'https://www.justonecookbook.com/chicken-fried-rice/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2019/11/Chicken-Fried-Rice-Midnight-Diner-5334-I-2-250x250.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisse de poulet',           170, 'g',          true,  1,  'désossée, en dés'),
    (v_recipe_id, 'petits pois',                2,   'c. à soupe', true,  2,  'surgelés'),
    (v_recipe_id, 'champignons de Paris',       3,   'unité',      true,  3,  'émincés'),
    (v_recipe_id, 'oignon',                     65,  'g',          true,  4,  'environ ¼, haché'),
    (v_recipe_id, 'beurre doux',                1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'riz japonais cuit',          330, 'g',          true,  6,  'refroidi, grain court'),
    (v_recipe_id, 'sel',                        0.125,'c. à café', true,  7,  'casher, type Diamond Crystal'),
    (v_recipe_id, 'poivre noir',                0.125,'c. à café', true,  8,  'fraîchement moulu'),
    (v_recipe_id, 'ketchup',                    3,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'purée de tomate',            3,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'eau',                        2,   'c. à soupe', true,  11, NULL);

  -- =====================================================================
  -- 7. Japanese Chicken Curry
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Japanese Chicken Curry',
    'Curry japonais maison : poulet, oignons caramélisés, carottes et pommes de terre dans une sauce épaisse au roux de curry, relevée de pomme râpée et de miel. Un plat familial réconfortant servi sur du riz.',
    $instr$["Préparer les légumes : couper les oignons en gros quartiers, les carottes en rangiri (morceaux en biseau irréguliers) et les pommes de terre en quartiers, puis faire tremper ces dernières 15 minutes dans l'eau.",
"Préparer le poulet : retirer le gras, le couper en bouchées en biseau (sogigiri) et le poivrer.",
"Chauffer l'huile à feu moyen et faire revenir les oignons 5 minutes, jusqu'à ce qu'ils soient dorés.",
"Ajouter l'ail et le gingembre, mélanger, puis ajouter le poulet et le faire revenir jusqu'à ce qu'il soit en partie cuit.",
"Verser le bouillon, ajouter la pomme râpée, le miel, la sauce soja et le ketchup, puis les carottes et les pommes de terre.",
"Couvrir et laisser mijoter 15 minutes à feu moyen-doux en écumant.",
"Poursuivre la cuisson à couvert jusqu'à ce qu'une pique traverse facilement les légumes.",
"Éteindre le feu et dissoudre le roux de curry dans le bouillon chaud, 2 carrés à la fois.",
"Laisser mijoter à découvert 5 à 10 minutes en remuant souvent, jusqu'à épaississement.",
"Servir sur du riz japonais, avec du fukujinzuke si désiré."]
$instr$,
    20, 50, 8, 2,
    'Japonaise', 'dinner',
    ARRAY['curry japonais','poulet','plat-familial','réconfortant','roux','légumes','traditionnel'],
    'manual',
    'https://www.justonecookbook.com/simple-chicken-curry/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2021/10/Japanese-Chicken-Curry-3787-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignons',                    670, 'g',          true,  1,  '2 gros, en quartiers'),
    (v_recipe_id, 'carottes',                   190, 'g',          true,  2,  '2, en rangiri'),
    (v_recipe_id, 'pommes de terre',            432, 'g',          true,  3,  '3, type Yukon Gold, en quartiers'),
    (v_recipe_id, 'gingembre',                  1,   'c. à café',  true,  4,  'frais, râpé avec son jus'),
    (v_recipe_id, 'ail',                        2,   'gousse',     true,  5,  'pressé'),
    (v_recipe_id, 'pomme',                      170, 'g',          true,  6,  'environ ½, râpée'),
    (v_recipe_id, 'poitrine de poulet',         680, 'g',          true,  7,  'sans peau, en bouchées'),
    (v_recipe_id, 'huile neutre',               1.5, 'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'bouillon de poulet',         1000,'ml',         true,  9,  'ou eau'),
    (v_recipe_id, 'miel',                       1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'sauce soja',                 1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'ketchup',                    1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'roux de curry japonais',     220, 'g',          true,  13, '1 boîte'),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  14, NULL),
    (v_recipe_id, 'riz japonais cuit',          800, 'g',          false, 15, 'pour servir'),
    (v_recipe_id, 'fukujinzuke',                30,  'g',          false, 16, 'condiment, optionnel');

  -- =====================================================================
  -- 8. Oyakodon (Bol Riz Poulet-Œuf)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Oyakodon (Bol Riz Poulet-Œuf)',
    'Classique des donburi : poulet et oignon mijotés dans une sauce dashi-soja, liés par des œufs à peine pris. « Parent et enfant » réunis dans un bol, prêt en 25 minutes.',
    $instr$["Mélanger le bouillon dashi, la sauce soja, le vinaigre de riz, l'eau et le sucre jusqu'à dissolution complète.",
"Émincer finement l'oignon et hacher le mitsuba.",
"Couper le poulet en morceaux de 2 cm en biseau (sogigiri), l'arroser de 1 c. à soupe de bouillon dashi et laisser reposer 5 minutes.",
"Casser les œufs dans un bol et couper les blancs 5 ou 6 fois avec des baguettes, sans fouetter, pour garder un aspect marbré.",
"Verser la sauce sur l'oignon dans une petite poêle et porter à frémissement à feu moyen.",
"Ajouter le poulet, bien le répartir et cuire 5 minutes à découvert en le retournant à mi-cuisson.",
"Verser les deux tiers des œufs en spirale, en évitant les bords.",
"Quand le blanc commence à prendre, ajouter le reste des œufs et le mitsuba.",
"Couvrir 30 secondes, selon la texture souhaitée.",
"Répartir le riz dans des bols à donburi et y faire glisser le mélange poulet-œuf avec la sauce."]
$instr$,
    15, 10, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['donburi','poulet','œufs','dashi','japonais','réconfortant','traditionnel'],
    'manual',
    'https://www.justonecookbook.com/oyakodon/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2022/10/Oyakodon-0613-I.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  1,  'émincé finement'),
    (v_recipe_id, 'filet de poulet',            300, 'g',          true,  2,  'en morceaux de 2 cm'),
    (v_recipe_id, 'bouillon dashi',             1,   'c. à soupe', true,  3,  'pour arroser le poulet'),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  4,  'à température ambiante'),
    (v_recipe_id, 'bouillon dashi',             120, 'ml',         true,  5,  'en sachet ou en poudre, pour la sauce'),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  6,  'shoyu'),
    (v_recipe_id, 'vinaigre de riz',            2.5, 'c. à café',  true,  7,  'sauce'),
    (v_recipe_id, 'eau',                        2.5, 'c. à café',  true,  8,  'sauce'),
    (v_recipe_id, 'sucre',                      1,   'c. à soupe', true,  9,  'sauce'),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  10, 'grain court'),
    (v_recipe_id, 'mitsuba',                    4,   'brin',       false, 11, 'ou oignons verts');

  -- =====================================================================
  -- 9. Gyudon (Bol Riz Bœuf Japonais)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Gyudon (Bol Riz Bœuf Japonais)',
    'Bol de riz japonais garni de bœuf finement tranché et d''oignon mijotés dans une sauce sucrée-salée au dashi et à la sauce soja. Un classique réconfortant de la restauration rapide japonaise, prêt en 20 minutes.',
    $instr$["Émincer finement l'oignon et couper l'oignon vert en biais. Couper le bœuf, légèrement congelé, en morceaux de 7 à 8 cm.",
"Dans une poêle froide, verser le bouillon dashi, le vinaigre de riz, l'eau, la sauce soja et le sucre, et mélanger pour dissoudre.",
"Étaler l'oignon dans la sauce en séparant les couches, puis disposer le bœuf par-dessus.",
"Couvrir et chauffer à feu moyen ; au premier frémissement, baisser le feu et cuire 3 à 4 minutes à couvert.",
"Écumer les impuretés avec une écumoire fine.",
"Parsemer d'oignon vert et cuire 1 minute à couvert.",
"Répartir le riz dans des bols à donburi et l'arroser d'un peu de sauce.",
"Disposer le mélange bœuf-oignon sur le riz et garnir de gingembre rouge mariné."]
$instr$,
    5, 15, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['bœuf','donburi','riz','japonais','rapide','dashi','réconfortant'],
    'manual',
    'https://www.justonecookbook.com/gyudon/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2024/11/Gyudon-7457-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf tranché',               225, 'g',          true,  1,  'en tranches très fines, faux-filet ou entrecôte'),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  2,  'moyen'),
    (v_recipe_id, 'oignon vert',                1,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  4,  'grain court, 2 portions'),
    (v_recipe_id, 'bouillon dashi',             150, 'ml',         true,  5,  NULL),
    (v_recipe_id, 'vinaigre de riz',            2.5, 'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'eau',                        2.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sauce soja',                 3,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'sucre',                      4,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'gingembre rouge mariné',     20,  'g',          false, 10, 'beni shoga, pour garnir');

  -- =====================================================================
  -- 10. Yaki Keema Curry (Curry Japonais Gratiné)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Yaki Keema Curry (Curry Japonais Gratiné)',
    'Gratin de curry japonais à la viande hachée, avec un œuf coulant et de la mozzarella fondante. Un plat de café (kissaten) facile qui transforme le curry classique en gratin doré au four.',
    $instr$["Préchauffer le four à 200°C ; hacher finement l'oignon et couper la carotte en petits dés.",
"Chauffer l'huile dans une poêle et faire revenir l'oignon jusqu'à ce qu'il devienne translucide.",
"Ajouter le bœuf haché et l'émietter à la spatule jusqu'à ce qu'il soit bien cuit.",
"Incorporer la carotte et bien mélanger.",
"Verser l'eau, saler et poivrer, couvrir et laisser mijoter 3 minutes.",
"Ajouter le carré de roux de curry et le faire fondre en remuant.",
"Ajouter le ketchup et la sauce tonkatsu, puis laisser réduire jusqu'à obtenir une sauce épaisse et brillante.",
"Beurrer un plat allant au four, y étaler le riz et verser le curry par-dessus.",
"Creuser un puits au centre, y casser l'œuf et couvrir entièrement de mozzarella.",
"Enfourner 15 minutes, jusqu'à ce que le fromage soit doré et bouillonnant ; garnir de persil et servir."]
$instr$,
    5, 25, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['curry japonais','gratin','viande hachée','mozzarella','four','kissaten','réconfortant'],
    'manual',
    'https://www.justonecookbook.com/yaki-keema-curry/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2026/03/Yaki-Keema-Curry-4752-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'bœuf haché',                 340, 'g',          true,  1,  NULL),
    (v_recipe_id, 'oignon',                     0.5, 'unité',      true,  2,  'haché finement'),
    (v_recipe_id, 'carotte',                    8,   'cm',         true,  3,  'en petits dés'),
    (v_recipe_id, 'roux de curry japonais',     1,   'unité',      true,  4,  '1 carré'),
    (v_recipe_id, 'sauce tonkatsu',             1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'ketchup',                    1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'eau',                        240, 'ml',         true,  7,  NULL),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  8,  'casher, type Diamond Crystal'),
    (v_recipe_id, 'poivre noir',                1,   'pincée',     true,  9,  NULL),
    (v_recipe_id, 'huile neutre',               1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'riz japonais cuit',          400, 'g',          true,  11, 'grain court, 2 grands bols'),
    (v_recipe_id, 'œuf',                        1,   'unité',      true,  12, 'gros'),
    (v_recipe_id, 'mozzarella râpée',           100, 'g',          true,  13, NULL),
    (v_recipe_id, 'beurre',                     15,  'g',          true,  14, 'pour beurrer le plat'),
    (v_recipe_id, 'persil plat',                4,   'brin',       false, 15, 'pour garnir');

  -- =====================================================================
  -- 11. Tori Soboro Donburi
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Tori Soboro Donburi',
    'Bol de riz japonais classique : poulet haché sucré-salé et glacé, œufs brouillés moelleux et petits pois. Un plat de bento traditionnel prêt en 30 minutes.',
    $instr$["Préparer 2 portions de riz japonais à l'avance.",
"Râper le gingembre frais pour en obtenir 1 c. à café avec son jus.",
"Dans une casserole froide, mettre le poulet haché, le gingembre, le bouillon dashi, le vinaigre de riz, l'eau, le sucre et la sauce soja.",
"Chauffer à feu moyen-doux en mélangeant vigoureusement 3 à 4 minutes avec 3 baguettes tenues ensemble.",
"Poursuivre la cuisson 2 à 3 minutes, jusqu'à ce que le liquide se soit évaporé et que le poulet soit brillant et glacé.",
"Dans une autre casserole froide, fouetter les œufs avec le sucre et le sel jusqu'à dissolution.",
"Chauffer à feu moyen-doux en remuant sans cesse avec les baguettes, en raclant le fond.",
"Cuire jusqu'à obtenir de petites miettes moelleuses et encore humides, sans les dessécher.",
"Répartir le riz dans 2 bols, disposer le poulet sur une moitié et les œufs sur l'autre.",
"Décorer d'une ligne de petits pois et, si désiré, de gingembre rouge mariné."]
$instr$,
    10, 20, 2, 2,
    'Japonaise', 'lunch',
    ARRAY['poulet haché','donburi','œufs','bento','japonais','rapide','traditionnel'],
    'manual',
    'https://www.justonecookbook.com/tori-soboro-donburi/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2026/06/Soboro-Don-8331-I.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet haché',               230, 'g',          true,  1,  NULL),
    (v_recipe_id, 'gingembre',                  1,   'c. à café',  true,  2,  'frais, râpé avec son jus'),
    (v_recipe_id, 'bouillon dashi',             1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'vinaigre de riz',            1.25,'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'eau',                        1.25,'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'sucre',                      1.75,'c. à soupe', true,  6,  'pour le soboro'),
    (v_recipe_id, 'sauce soja',                 2.5, 'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'œufs',                       3,   'unité',      true,  8,  'gros'),
    (v_recipe_id, 'sucre',                      1,   'c. à soupe', true,  9,  'pour les œufs'),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  10, 'casher, type Diamond Crystal'),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  11, '2 portions'),
    (v_recipe_id, 'petits pois',                30,  'g',          false, 12, 'cuits, pour décorer'),
    (v_recipe_id, 'gingembre rouge mariné',     20,  'g',          false, 13, 'optionnel');

  -- =====================================================================
  -- 12. Yakitori Don
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Yakitori Don',
    'Bol de riz garni de poulet poêlé juteux, glacé d''une sauce yakitori sucrée-salée à la sauce soja. Toutes les saveurs des brochettes grillées sans gril, prêt en 20 minutes.',
    $instr$["Couper le blanc du negi en tronçons de 4 cm et émincer la partie verte. Sécher le poulet, le couper en bouchées et l'enrober légèrement de farine.",
"Mélanger le vinaigre de riz, l'eau, la sauce soja et le sucre jusqu'à dissolution du sucre.",
"Chauffer à vide une poêle en inox à feu moyen : elle est prête quand une goutte d'eau y forme une perle. Ajouter alors l'huile.",
"Ajouter les tronçons de negi et les faire griller sur toutes les faces, puis les réserver.",
"Disposer le poulet en une seule couche et le saisir 3 minutes, jusqu'à ce qu'il soit bien doré.",
"Retourner le poulet, couvrir et cuire 3 minutes à feu moyen-doux.",
"Éponger l'excès de gras avec du papier absorbant, puis remettre le negi grillé.",
"Verser la sauce et remuer pour bien enrober tous les morceaux.",
"Répartir le riz chaud dans les bols, parsemer de nori, puis garnir de poulet glacé et du vert de negi émincé.",
"Servir avec du shichimi togarashi à table pour relever."]
$instr$,
    10, 10, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['poulet','yakitori','donburi','japonais','rapide','teriyaki','sans-gril'],
    'manual',
    'https://www.justonecookbook.com/yakitori-don/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2026/03/Yakitori-Don-4671-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',          280, 'g',          true,  1,  'désossées et sans peau, en bouchées'),
    (v_recipe_id, 'negi',                       1,   'unité',      true,  2,  'poireau japonais ; à défaut, oignons verts'),
    (v_recipe_id, 'farine',                     2,   'c. à soupe', true,  3,  'pour enrober'),
    (v_recipe_id, 'huile neutre',               2,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'vinaigre de riz',            4,   'c. à café',  true,  5,  'sauce'),
    (v_recipe_id, 'eau',                        4,   'c. à café',  true,  6,  'sauce'),
    (v_recipe_id, 'sauce soja',                 3,   'c. à soupe', true,  7,  'sauce'),
    (v_recipe_id, 'sucre',                      2.25,'c. à café',  true,  8,  'sauce'),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          true,  9,  'grain court, 2 portions'),
    (v_recipe_id, 'nori',                       2,   'g',          false, 10, 'en fines lanières (kizami nori), optionnel'),
    (v_recipe_id, 'shichimi togarashi',         1,   'pincée',     false, 11, 'optionnel');

  -- =====================================================================
  -- 13. Saumon Teriyaki (Just One Cookbook)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Saumon Teriyaki (Just One Cookbook)',
    'Saumon poêlé à la peau croustillante et à la chair tendre, nappé d''une sauce teriyaki maison à la sauce soja. Prêt en 15 minutes.',
    $instr$["Mélanger les ingrédients de la sauce (bouillon dashi, vinaigre de riz, eau, sauce soja et sucre) dans un bol et chauffer 30 secondes au micro-ondes pour dissoudre le sucre.",
"Rincer et sécher les filets de saumon, puis saler et poivrer les deux faces.",
"Les fariner uniformément.",
"Chauffer l'huile et le beurre dans une poêle à feu moyen.",
"Saisir la peau 15 secondes en tenant le filet debout, puis le poser côté peau et cuire 3 minutes.",
"Retourner le filet, ajouter 1 c. à soupe de bouillon dashi, couvrir et baisser le feu ; cuire 3 à 5 minutes, jusqu'à 52-54°C à cœur.",
"Réserver le saumon sur une assiette, verser la sauce dans la poêle et porter à ébullition.",
"Remettre le saumon, l'arroser de sauce, baisser le feu et laisser épaissir 1 à 2 minutes.",
"Servir aussitôt, nappé de sauce réduite et caramélisée."]
$instr$,
    5, 10, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['saumon','teriyaki','poêlé','rapide','japonais','sauce-maison','15-minutes'],
    'manual',
    'https://www.justonecookbook.com/teriyaki-salmon-recipe/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2025/02/Teriyaki-Salmon-6897-II.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'filets de saumon',           340, 'g',          true,  1,  'avec peau, 2 filets de 2 cm d''épaisseur'),
    (v_recipe_id, 'sel de mer',                 0.25,'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'poivre noir',                0.125,'c. à café', true,  3,  'fraîchement moulu'),
    (v_recipe_id, 'farine',                     1,   'c. à soupe', true,  4,  'ou fécule pour une version sans gluten'),
    (v_recipe_id, 'huile neutre',               0.5, 'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'beurre doux',                1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'bouillon dashi',             1,   'c. à soupe', true,  7,  'pour la cuisson à couvert'),
    (v_recipe_id, 'bouillon dashi',             1,   'c. à soupe', true,  8,  'pour la sauce'),
    (v_recipe_id, 'vinaigre de riz',            1.25,'c. à café',  true,  9,  'pour la sauce'),
    (v_recipe_id, 'eau',                        1.25,'c. à café',  true,  10, 'pour la sauce'),
    (v_recipe_id, 'sauce soja',                 2,   'c. à soupe', true,  11, 'pour la sauce'),
    (v_recipe_id, 'sucre',                      1.25,'c. à soupe', true,  12, 'pour la sauce, au goût');

  -- =====================================================================
  -- 14. Mapo Tofu Style Japonais (10 min)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Mapo Tofu Style Japonais (10 min)',
    'Version rapide du mapo tofu chinois adaptée au goût japonais : tofu soyeux, bœuf haché, doubanjiang, miso et sauce d''huître. Un plat plein d''umami prêt en 15 minutes.',
    $instr$["Envelopper le tofu dans du papier absorbant et le laisser s'égoutter 15 minutes.",
"Mélanger tous les ingrédients de la sauce dans un bol jusqu'à ce qu'elle soit lisse.",
"Émincer l'oignon vert, hacher le gingembre et l'ail, et couper le tofu en petits cubes.",
"Chauffer l'huile à feu moyen-vif et faire revenir le gingembre et l'ail jusqu'à ce qu'ils embaument.",
"Ajouter le bœuf haché et l'émietter à la spatule jusqu'à ce qu'il soit bien cuit.",
"Verser la sauce et mélanger jusqu'à ébullition et épaississement.",
"Baisser le feu, ajouter les cubes de tofu et les enrober délicatement.",
"Incorporer la majeure partie de l'oignon vert, couvrir et laisser mijoter 1 minute.",
"Servir sur du riz chaud et parsemer du reste d'oignon vert."]
$instr$,
    5, 10, 2, 2,
    'Japonaise', 'dinner',
    ARRAY['mapo tofu','tofu','bœuf haché','japonais','rapide','umami','10-minutes'],
    'manual',
    'https://www.justonecookbook.com/10-minute-meal-mapo-tofu/',
    'https://cdn.justonecookbook.com/spai/q_glossy+ret_img+to_auto/www.justonecookbook.com/wp-content/uploads/2024/10/10-Min-Meal-Mapo-Tofu-0814-I-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'tofu soyeux',                100, 'g',          true,  1,  '¼ de bloc, égoutté 15 min'),
    (v_recipe_id, 'bœuf haché',                 120, 'g',          true,  2,  'ou autre viande hachée'),
    (v_recipe_id, 'oignon vert',                1,   'unité',      true,  3,  'émincé'),
    (v_recipe_id, 'gingembre',                  2.5, 'cm',         true,  4,  'frais, haché'),
    (v_recipe_id, 'ail',                        1,   'gousse',     true,  5,  'grosse, pressée'),
    (v_recipe_id, 'huile neutre',               1,   'c. à soupe', true,  6,  NULL),
    -- Sauce
    (v_recipe_id, 'doubanjiang',                1,   'c. à soupe', true,  7,  'pâte de fèves pimentée'),
    (v_recipe_id, 'sauce d''huître',            1.5, 'c. à café',  true,  8,  'sauce'),
    (v_recipe_id, 'miso blanc',                 1.5, 'c. à café',  true,  9,  'sauce'),
    (v_recipe_id, 'sauce soja',                 1,   'c. à café',  true,  10, 'sauce'),
    (v_recipe_id, 'vinaigre de riz',            1.25,'c. à café',  true,  11, 'sauce'),
    (v_recipe_id, 'sucre',                      0.5, 'c. à café',  true,  12, 'sauce'),
    (v_recipe_id, 'huile de sésame grillée',    0.5, 'c. à café',  true,  13, 'sauce'),
    (v_recipe_id, 'fécule de pomme de terre',   0.5, 'c. à café',  true,  14, 'ou fécule de maïs, sauce'),
    (v_recipe_id, 'eau',                        2.5, 'c. à soupe', true,  15, 'sauce'),
    (v_recipe_id, 'riz japonais cuit',          500, 'g',          false, 16, 'pour servir, 2 portions');

END $$;
