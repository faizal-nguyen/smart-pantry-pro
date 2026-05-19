-- =====================================================================
-- Seed: recettes Cookd (cookdtv.com) — saisies manuellement
-- 2026-05-19
--
-- cookdtv.com est une SPA JavaScript qui ne sert pas de HTML statique
-- exploitable par WebFetch (toute la page se rend côté client). Les
-- contenus sont donc saisis à la main par l'utilisateur et convertis
-- ici en SQL.
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` pour
-- l'audit user c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6.
-- Idempotent : DELETEs par nom (FK cascade vide les ingrédients).
--
-- État (mis à jour à chaque paste user) :
--   1. Traditional Tamilnadu Mutton Biryani   ✓
--   2. Ghee Rice                              ✓
--   3. Paneer Butter Masala                   ✓
--   4. Dhaba Style Paneer Curry               ✓
--   5. Chettinad Chicken Chukka               ✓
--   6. Paneer Jalfrezi                        ✓
--   7. Matar Paneer Gravy                     TODO
--   8. Pani Puri                              ✓
--   9. Palak Paneer                           ✓
--  10. Paneer 65                              ✓
--  11. Wedding Style Chicken Biryani          ✓
--  12. Murg Kali Mirch                        ✓
--  13. Nombu Kanji                            ✓
--  14. Butter Chicken                         ✓
--  15. Chicken Salna                          TODO
--  16. Mutton Paya                            TODO
--  17. Dindigul Chicken Biryani               ✓
--  18. Paneer Thokku                          ✓
--  19. Kerala Style Mutton Roast              ✓
--  20. Hyderabadi Chicken Fry                 ✓
--
-- Run (une fois que tout est rempli) :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-cookdtv-recipes.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  -- Liste complète des 20 noms — utilisée par le DELETE idempotent.
  -- Les noms non encore insérés ne matchent juste rien, c'est safe.
  v_recipe_names TEXT[] := ARRAY[
    'Traditional Tamilnadu Mutton Biryani',
    'Ghee Rice',
    'Paneer Butter Masala',
    'Dhaba Style Paneer Curry',
    'Chettinad Chicken Chukka',
    'Paneer Jalfrezi',
    'Matar Paneer Gravy',
    'Pani Puri',
    'Palak Paneer',
    'Paneer 65',
    'Wedding Style Chicken Biryani',
    'Murg Kali Mirch',
    'Nombu Kanji',
    'Butter Chicken',
    'Chicken Salna',
    'Mutton Paya',
    'Dindigul Chicken Biryani',
    'Paneer Thokku',
    'Kerala Style Mutton Roast',
    'Hyderabadi Chicken Fry'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Traditional Tamilnadu Mutton Biryani
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Traditional Tamilnadu Mutton Biryani',
    'Biryani de mouton tamoul traditionnel au riz Seeraga Samba (court grain parfumé), deux masalas (un sec torréfié-broyé, un pâte fraîche broyée), mouton braisé dans son propre jus avant ajout du riz, finition en dum scellé à la pâte de chapati.',
    $instr$["Biryani masala (sec) : torréfier à sec puis moudre cannelle, anis étoilé, cumin, graines de fenouil, cumin noir et clous de girofle. Réserver.",
"Mutton masala (pâte) : mixer ensemble clous de girofle, cardamome verte, macis, cannelle et anis étoilé avec un peu d'eau jusqu'à pâte fine. Réserver.",
"Laver et tremper le riz Seeraga Samba 30 minutes.",
"Dans une cocotte à biryani, chauffer l'huile d'arachide.",
"Ajouter l'huile de coco, les feuilles de laurier, les échalotes et l'oignon tranché. Faire frire jusqu'à brun doré.",
"Ajouter les piments verts fendus, le jus de citron, la pâte de gingembre et la pâte d'ail. Cuire jusqu'à disparition de l'odeur crue.",
"Ajouter le ghee, le biryani masala préparé, le piment rouge moulu, la coriandre moulue et la pâte de mutton masala dans cet ordre. Cuire 2 minutes.",
"Ajouter le yaourt, le sel, les feuilles de menthe et la coriandre fraîche. Cuire encore 2 minutes.",
"Ajouter les morceaux de mouton, verser 2 tasses (480 ml) d'eau et cuire 20 minutes. La sauce doit épaissir à mesure que le mouton cuit.",
"Une fois le mouton cuit, ajouter le riz trempé égoutté et 6 tasses (1440 ml) d'eau (ratio 1:2 riz/eau pour le Seeraga Samba). Laisser frémir jusqu'à absorption quasi-complète. À ce stade, sceller la cocotte avec de la pâte de chapati ou du papier alu pour empêcher la vapeur de s'échapper. Maintenir scellé 15 minutes à feu très doux. Éteindre.",
"Laisser reposer 15 minutes supplémentaires sans ouvrir : la cuisson se termine à la vapeur résiduelle.",
"Ouvrir, aérer le riz à la fourchette et servir chaud avec un raïta."]
$instr$,
    25, 70, 4, 4,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','biryani','mouton','seeraga samba','dum'],
    'manual',
    'https://cookdtv.com/recipes/traditional-tamilnadu-mutton-biryani',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Biryani masala (sec, à torréfier puis moudre)
    (v_recipe_id, 'bâton de cannelle',      1,    'unité',      true,  1,  'biryani masala sec'),
    (v_recipe_id, 'anis étoilé',            0.5,  'unité',      true,  2,  'biryani masala sec'),
    (v_recipe_id, 'cumin',                  0.5,  'c. à café',  true,  3,  'biryani masala sec'),
    (v_recipe_id, 'graines de fenouil',     0.5,  'c. à café',  true,  4,  'biryani masala sec'),
    (v_recipe_id, 'cumin noir',             0.5,  'c. à café',  false, 5,  'biryani masala sec, shahi jeera'),
    (v_recipe_id, 'clous de girofle',       3,    'unité',      true,  6,  'biryani masala sec'),
    -- Mutton masala (pâte fraîche, à mixer)
    (v_recipe_id, 'clous de girofle',       6,    'unité',      true,  7,  'mutton masala pâte'),
    (v_recipe_id, 'cardamome verte',        3,    'unité',      true,  8,  'mutton masala pâte'),
    (v_recipe_id, 'macis',                  2,    'unité',      true,  9,  'mutton masala pâte'),
    (v_recipe_id, 'bâton de cannelle',      1,    'cm',         true,  10, 'mutton masala pâte (~0,5 inch)'),
    (v_recipe_id, 'anis étoilé',            0.5,  'unité',      true,  11, 'mutton masala pâte'),
    -- Corps de la cocotte
    (v_recipe_id, 'huile d''arachide',      5,    'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'huile de coco',          1,    'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'feuilles de laurier',    2,    'unité',      true,  14, NULL),
    (v_recipe_id, 'échalotes',              15,   'unité',      true,  15, 'small onions / sambar onions'),
    (v_recipe_id, 'oignon',                 1,    'unité',      true,  16, 'tranché'),
    (v_recipe_id, 'piments verts',          3,    'unité',      true,  17, 'fendus'),
    (v_recipe_id, 'jus de citron',          2,    'c. à café',  true,  18, NULL),
    (v_recipe_id, 'pâte de gingembre',      1,    'c. à soupe', true,  19, NULL),
    (v_recipe_id, 'pâte d''ail',            2,    'c. à soupe', true,  20, NULL),
    (v_recipe_id, 'ghee',                   5,    'c. à soupe', true,  21, NULL),
    (v_recipe_id, 'piment rouge moulu',     2,    'c. à café',  true,  22, NULL),
    (v_recipe_id, 'coriandre moulue',       3,    'c. à café',  true,  23, NULL),
    (v_recipe_id, 'yaourt nature',          60,   'ml',         true,  24, '~1/4 cup'),
    (v_recipe_id, 'sel',                    1.5,  'c. à café',  true,  25, 'au goût'),
    (v_recipe_id, 'feuilles de menthe',     30,   'g',          true,  26, '~1 cup'),
    (v_recipe_id, 'coriandre fraîche',      15,   'g',          true,  27, '~1/4 cup'),
    -- Viande + riz
    (v_recipe_id, 'mouton biryani-cut',     500,  'g',          true,  28, 'avec os'),
    (v_recipe_id, 'riz Seeraga Samba',      500,  'g',          true,  29, 'trempé 30 min'),
    (v_recipe_id, 'eau',                    480,  'ml',         true,  30, '2 cups pour braiser le mouton'),
    (v_recipe_id, 'eau',                    1440, 'ml',         true,  31, '6 cups pour le riz (ratio 1:2)');

  -- =====================================================================
  -- 2. Ghee Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Ghee Rice',
    'Pilaf indien parfumé : riz basmati cuit à la cocotte minute dans le ghee avec épices entières (cannelle, cardamome, clous, anis étoilé, macis), garni de cajou et raisins frits. Accompagnement classique des biryanis et currys.',
    $instr$["Laver et tremper le riz basmati 30 minutes.",
"Dans une cocotte minute, chauffer 3 c. à soupe de ghee et frire les demi-cajous et raisins secs jusqu'à doré. Égoutter et réserver.",
"Dans la même cocotte, ajouter les oignons tranchés et faire dorer. Égoutter et réserver.",
"Ajouter 1 c. à soupe de ghee supplémentaire, les épices entières (cannelle, cardamome, clous, anis étoilé, macis, laurier). Faire revenir 1 minute jusqu'au parfum. Ajouter les piments verts fendus.",
"Ajouter le riz égoutté et 540 ml d'eau (ratio 1:1.5). Saler.",
"Cocotte minute fermée : 1 sifflet puis éteindre. Laisser la pression retomber naturellement.",
"Ouvrir, transférer dans un plat de service. Garnir des cajous, raisins et oignons frits réservés."]
$instr$,
    30, 25, 3, 2,
    'Indienne', 'lunch',
    ARRAY['indien','tamoul','riz','ghee','pilaf','cocotte minute'],
    'manual',
    'https://cookdtv.com/recipes/ghee-rice',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'feuille de laurier',      1,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'anis étoilé',             1,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'macis',                   1,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'bâton de cannelle',       4,   'cm',         true,  4,  '~1.5 inch'),
    (v_recipe_id, 'sel',                     1.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'riz basmati',             300, 'g',          true,  6,  '~1.5 cup, trempé 30 min'),
    (v_recipe_id, 'eau',                     540, 'ml',         true,  7,  '~2.25 cup'),
    (v_recipe_id, 'oignon',                  1,   'unité',      true,  8,  'tranché fin'),
    (v_recipe_id, 'ghee',                    1,   'c. à soupe', true,  9,  'pour les épices entières'),
    (v_recipe_id, 'ghee',                    3,   'c. à soupe', true,  10, 'pour les cajous et raisins'),
    (v_recipe_id, 'demi-cajou',              15,  'unité',      true,  11, 'cashew halves'),
    (v_recipe_id, 'raisins secs',            15,  'unité',      true,  12, NULL),
    (v_recipe_id, 'cardamome verte',         4,   'unité',      true,  13, NULL),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  14, 'fendus'),
    (v_recipe_id, 'clous de girofle',        5,   'unité',      true,  15, NULL);

  -- =====================================================================
  -- 3. Paneer Butter Masala
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Paneer Butter Masala',
    'Curry signature des restaurants indiens : sauce tomate-cajou veloutée, beurre, crème fraîche, garam masala et kasuri methi pour le parfum, cubes de paneer en finition. Sucré-acide délicatement épicé.',
    $instr$["Tremper les noix de cajou dans l'eau chaude 15 minutes.",
"Mixer les cajous avec leur eau de trempage jusqu'à pâte lisse.",
"Couper grossièrement les tomates et les mixer en purée. Réserver.",
"Poêle à feu moyen : faire fondre le beurre, ajouter la feuille de laurier.",
"Ajouter la pâte gingembre-ail, sauter quelques secondes. Verser la purée de tomate et cuire 5 minutes.",
"Ajouter le piment Cachemire moulu et continuer la cuisson jusqu'à évaporation quasi-totale de l'eau de la purée.",
"Ajouter la pâte de cajou et cuire 3 minutes en remuant.",
"Verser 360 ml d'eau et mijoter 5 minutes.",
"Saler au goût, ajouter le sucre, le garam masala et le kasuri methi écrasé entre les doigts.",
"Quand la sauce a la consistance souhaitée, ajouter les cubes de paneer puis la crème fraîche.",
"Bien mélanger et éteindre."]
$instr$,
    20, 35, 3, 2,
    'Indienne', 'dinner',
    ARRAY['indien','nord-indien','paneer','curry','tomate','cajou','beurre','végétarien'],
    'manual',
    'https://cookdtv.com/recipes/paneer-butter-masala',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'paneer',                  200, 'g',          true,  1,  'en cubes'),
    (v_recipe_id, 'tomate',                  5,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'noix de cajou',           15,  'unité',      true,  3,  'entières, à tremper'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  4,  '~0.25 cup pour cajous'),
    (v_recipe_id, 'beurre',                  45,  'g',          true,  5,  '~3 c. à soupe'),
    (v_recipe_id, 'feuille de laurier',      1,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'piment Cachemire moulu', 1,    'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'eau',                     360, 'ml',         true,  9,  '~1.5 cup pour la sauce'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  10, 'au goût'),
    (v_recipe_id, 'sucre',                   1.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'garam masala',            1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'kasuri methi',            1,   'c. à café',  true,  13, 'fenugrec séché écrasé'),
    (v_recipe_id, 'crème fraîche',           2,   'c. à soupe', true,  14, NULL);

  -- =====================================================================
  -- 4. Dhaba Style Paneer Curry
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Dhaba Style Paneer Curry',
    'Curry de paneer style dhaba (routier punjabi) : profond, épicé, enrichi au khoya (lait condensé séché) pour la rondeur, finition kasuri methi et coriandre. Sauce qui se mange avec naan ou roti.',
    $instr$["Chauffer l'huile et ajouter les épices entières (cannelle, clous, cardamome verte, cardamome noire). Ajouter les oignons tranchés et cuire jusqu'à doré.",
"Ajouter la pâte gingembre-ail, piments verts fendus, toutes les épices en poudre et le sel. Sauter 20 secondes pour libérer les arômes.",
"Ajouter la purée de tomate. Cuire 5 minutes à couvert.",
"Ajouter l'eau puis le khoya. Couvrir et cuire 7-8 minutes à feu doux.",
"Incorporer la coriandre hachée et le kasuri methi. Ajouter les cubes de paneer et mélanger 2 minutes.",
"L'huile doit remonter en surface — signe que le masala est cuit. Ajuster le sel. Retirer du feu. Servir chaud nappé de ghee fondu, julienne de gingembre et brins de coriandre."]
$instr$,
    15, 50, 4, 3,
    'Indienne', 'dinner',
    ARRAY['indien','punjabi','paneer','curry','dhaba','khoya','kasuri methi'],
    'manual',
    'https://cookdtv.com/recipes/dhaba-style-paneer-curry',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile de tournesol',      4,   'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'cumin',                   0.5, 'c. à café',  true,  2,  'graines'),
    (v_recipe_id, 'clous de girofle',        3,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'bâton de cannelle',       2.5, 'cm',         true,  4,  '~1 inch'),
    (v_recipe_id, 'cardamome noire',         1,   'unité',      true,  5,  NULL),
    (v_recipe_id, 'cardamome verte',         3,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'oignon',                  3,   'unité',      true,  7,  'tranchés'),
    (v_recipe_id, 'gingembre',               2.5, 'cm',         true,  8,  '~1 inch'),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  9,  'fendus'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'coriandre moulue',        1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'piment Cachemire moulu',  1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'curcuma moulu',           0.5, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'cumin moulu',             1,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'garam masala',            1,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'sel',                     0.5, 'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'tomate',                  4,   'unité',      true,  17, 'mises en purée'),
    (v_recipe_id, 'eau',                     360, 'ml',         true,  18, '~1.5 cup'),
    (v_recipe_id, 'khoya',                   120, 'g',          true,  19, '~0.5 cup, lait séché condensé'),
    (v_recipe_id, 'coriandre fraîche',       2,   'c. à soupe', true,  20, 'hachée'),
    (v_recipe_id, 'kasuri methi',            1,   'c. à soupe', true,  21, NULL),
    (v_recipe_id, 'paneer',                  500, 'g',          true,  22, 'en cubes');

  -- =====================================================================
  -- 5. Chettinad Chicken Chukka
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Chettinad Chicken Chukka',
    'Sauté chettinad de poulet désossé, sec et très épicé : masala maison au poivre noir + cumin torréfiés, feuilles de curry et demi-cajou, huile de sésame pour le parfum. Souvent servi en starter.',
    $instr$["Poêle sèche : torréfier le poivre noir en grains et le cumin jusqu'au parfum. Moudre au moulin à épices en poudre fine. Réserver.",
"Dans une autre poêle, chauffer l'huile de sésame. Ajouter graines de fenouil, cannelle, cardamome verte, clous de girofle, demi-cajou et piments rouges secs. Quand les épices crépitent et les cajous brunissent, ajouter les feuilles de curry.",
"Ajouter oignons hachés fin et ail haché fin. Cuire jusqu'à translucides.",
"Ajouter la pâte gingembre-ail, le curcuma et le piment rouge moulu. Sauter.",
"Ajouter les tomates hachées fin et cuire jusqu'à fondues. Ajouter un peu d'eau pour assembler le masala et empêcher qu'il accroche. Saler.",
"Ajouter le poulet en cubes, bien enrober du masala. Cuire 10 minutes en remuant régulièrement jusqu'à cuisson complète.",
"Ajouter la poudre poivre-cumin maison. Mélanger et sauter 2 minutes.",
"Ajouter la coriandre fraîche, mélanger et retirer du feu."]
$instr$,
    10, 35, 3, 3,
    'Indienne', 'appetizer',
    ARRAY['indien','tamoul','chettinad','poulet','sauté','sec','épicé'],
    'manual',
    'https://cookdtv.com/recipes/chettinad-chicken-chukka',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poivre noir en grains',   2,    'c. à café',  true,  1,  'à torréfier'),
    (v_recipe_id, 'cumin',                   1,    'c. à café',  true,  2,  'graines, à torréfier'),
    (v_recipe_id, 'huile de sésame',         2,    'c. à soupe', true,  3,  'gingelly oil'),
    (v_recipe_id, 'graines de fenouil',      1,    'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'bâton de cannelle',       2.5,  'cm',         true,  5,  '~1 inch'),
    (v_recipe_id, 'cardamome verte',         3,    'unité',      true,  6,  NULL),
    (v_recipe_id, 'clous de girofle',        4,    'unité',      true,  7,  NULL),
    (v_recipe_id, 'demi-cajou',              10,   'unité',      true,  8,  NULL),
    (v_recipe_id, 'piments rouges secs',     2,    'unité',      true,  9,  NULL),
    (v_recipe_id, 'feuilles de curry',       1,    'unité',      true,  10, 'brin'),
    (v_recipe_id, 'oignon',                  2,    'unité',      true,  11, 'hachés fin'),
    (v_recipe_id, 'ail',                     7,    'gousse',     true,  12, 'hachées fin'),
    (v_recipe_id, 'pâte gingembre-ail',      1,    'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'curcuma moulu',           1,    'c. à café',  true,  14, NULL),
    (v_recipe_id, 'piment rouge moulu',      1,    'c. à café',  true,  15, NULL),
    (v_recipe_id, 'tomate',                  1,    'unité',      true,  16, 'hachée fin'),
    (v_recipe_id, 'eau',                     120,  'ml',         true,  17, '~0.5 cup'),
    (v_recipe_id, 'sel',                     1.25, 'c. à café',  true,  18, NULL),
    (v_recipe_id, 'poulet désossé',          500,  'g',          true,  19, 'en cubes'),
    (v_recipe_id, 'coriandre fraîche',       2,    'c. à soupe', true,  20, 'hachée');

  -- =====================================================================
  -- 6. Paneer Jalfrezi
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Paneer Jalfrezi',
    'Sauté nord-indien express : paneer et poivron vert sautés à feu vif avec oignon, ketchup, épices et un trait de vinaigre. Profil sucré-piquant, prêt en 20 min.',
    $instr$["Chauffer l'huile dans une poêle. Ajouter le cumin et laisser crépiter. Ajouter piments rouges secs, ail et gingembre hachés.",
"Ajouter l'oignon et toutes les épices en poudre + sel. Ajouter le ketchup et bien mélanger.",
"Augmenter le feu et ajouter tous les autres légumes (poivron vert, tomate). Sauter 2 minutes en gardant le croquant.",
"Ajouter le paneer en cubes, le vinaigre et la coriandre. Mélanger délicatement et éteindre."]
$instr$,
    10, 20, 4, 1,
    'Indienne', 'dinner',
    ARRAY['indien','nord-indien','paneer','sauté','rapide','poivron','végétarien'],
    'manual',
    'https://cookdtv.com/recipes/paneer-jalfrezi',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile de tournesol',      1,   'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'cumin',                   0.5, 'c. à café',  true,  2,  'graines'),
    (v_recipe_id, 'piments rouges secs',     3,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'gingembre',               2,   'c. à café',  true,  4,  'haché fin'),
    (v_recipe_id, 'ail',                     1,   'c. à soupe', true,  5,  'haché fin'),
    (v_recipe_id, 'oignon',                  70,  'g',          true,  6,  '~0.5 cup haché'),
    (v_recipe_id, 'coriandre moulue',        0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'piment rouge moulu',      0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'curcuma moulu',           0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'ketchup',                 3,   'c. à soupe', true,  12, 'tomato sauce'),
    (v_recipe_id, 'poivron vert',            120, 'g',          true,  13, '~1 cup en dés'),
    (v_recipe_id, 'tomate',                  75,  'g',          true,  14, '~0.5 cup en dés'),
    (v_recipe_id, 'paneer',                  200, 'g',          true,  15, 'en cubes'),
    (v_recipe_id, 'vinaigre',                1,   'c. à café',  true,  16, NULL),
    (v_recipe_id, 'coriandre fraîche',       1,   'c. à soupe', true,  17, 'hachée');

  -- =====================================================================
  -- 8. Pani Puri
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Pani Puri',
    'Chaat de rue iconique : puris croustillants creux, garnis d''aloo masala et trempés dans deux eaux parfumées (eau de tamarin-jaggery sucrée et eau de menthe-coriandre épicée). À gober d''une bouchée.',
    $instr$["Cocotte minute : cuire les patates avec l'eau pendant 6 sifflets.",
"Éplucher et écraser les patates.",
"Ajouter oignon haché fin, coriandre, cumin, chaat masala et sel à la purée. Mélanger. Réserver cette farce.",
"Pâte à puri : dans un bol, mélanger semoule fine (rava), maïda, sel et eau. Pétrir 4 minutes en pâte ferme.",
"Couvrir la pâte d'un linge humide et reposer 30 minutes.",
"Prendre une petite portion, la mettre en boule, huiler le plan de travail et abaisser en fine couche.",
"Avec un emporte-pièce rond, découper des disques. Couvrir d'un linge humide pendant que les autres se découpent.",
"Friture : chauffer l'huile en bain et frire les puris jusqu'à gonflés et dorés. Laisser refroidir pour qu'ils croustillent.",
"Eau tamarin : tremper la pulpe de tamarin avec le gingembre pilé dans l'eau bouillante 30 minutes.",
"Écraser à la main et passer au tamis pour récupérer le jus de tamarin.",
"Kadhai : porter le jus à ébullition, ajouter le jaggery jusqu'à dissolution. Ajouter piment rouge, cumin et sel. Mijoter 5 minutes feu moyen.",
"Eau menthe : mixer feuilles de menthe, coriandre fraîche, gingembre et piment vert avec 30 ml d'eau.",
"Diluer cette pâte dans 1,2 L d'eau froide.",
"Ajouter amchur, cumin, piment rouge, poivre noir, fenouil, sel noir, sel, asa fœtida et jus de citron. Mélanger et réfrigérer jusqu'au service.",
"Assemblage : percer le sommet de chaque puri, garnir d'aloo masala, plonger dans l'eau parfumée et manger immédiatement."]
$instr$,
    50, 30, 10, 3,
    'Indienne', 'snack',
    ARRAY['indien','nord-indien','chaat','street food','pani puri','snack'],
    'manual',
    'https://cookdtv.com/recipes/pani-puri',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Aloo masala (farce)
    (v_recipe_id, 'eau',                       720, 'ml',         true,  1,  '~3 cup pour cuire patates'),
    (v_recipe_id, 'pommes de terre',           3,   'unité',      true,  2,  'cocotte minute 6 sifflets'),
    (v_recipe_id, 'oignon',                    1,   'unité',      true,  3,  'haché fin'),
    (v_recipe_id, 'coriandre fraîche',         1,   'c. à soupe', true,  4,  'pour la farce'),
    (v_recipe_id, 'cumin moulu',               1,   'c. à café',  true,  5,  'pour la farce'),
    (v_recipe_id, 'chaat masala',              1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  7,  'pour la farce'),
    -- Pâte puri
    (v_recipe_id, 'semoule fine (rava)',       180, 'g',          true,  8,  '~1 cup'),
    (v_recipe_id, 'maïda',                     32,  'g',          true,  9,  '~4 c. à soupe'),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  10, 'pour la pâte'),
    (v_recipe_id, 'eau',                       105, 'ml',         true,  11, '~7 c. à soupe pour la pâte'),
    (v_recipe_id, 'huile de tournesol',        500, 'ml',         true,  12, 'pour la friture'),
    -- Eau tamarin sucrée
    (v_recipe_id, 'gingembre',                 1.5, 'cm',         true,  13, '~0.5 inch, pour eau tamarin'),
    (v_recipe_id, 'tamarin',                   180, 'g',          true,  14, '~0.75 cup pulpe'),
    (v_recipe_id, 'eau',                       480, 'ml',         true,  15, '~2 cup pour tremper tamarin'),
    (v_recipe_id, 'jaggery',                   200, 'g',          true,  16, '~1 cup'),
    (v_recipe_id, 'piment rouge moulu',        0.75, 'c. à café', true,  17, 'eau tamarin'),
    (v_recipe_id, 'cumin moulu',               0.75, 'c. à café', true,  18, 'eau tamarin'),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  19, 'eau tamarin'),
    -- Eau menthe épicée
    (v_recipe_id, 'feuilles de menthe',        30,  'g',          true,  20, '~1 cup'),
    (v_recipe_id, 'piments verts',             2,   'unité',      true,  21, NULL),
    (v_recipe_id, 'gingembre',                 2.5, 'cm',         true,  22, '~1 inch, pour eau menthe'),
    (v_recipe_id, 'eau',                       30,  'ml',         true,  23, '~2 c. à soupe pour mixer'),
    (v_recipe_id, 'mangue séchée moulue',      2,   'c. à café',  true,  24, 'amchur'),
    (v_recipe_id, 'cumin moulu',               1,   'c. à café',  true,  25, 'eau menthe'),
    (v_recipe_id, 'piment rouge moulu',        1,   'c. à café',  true,  26, 'eau menthe'),
    (v_recipe_id, 'poivre noir moulu',         0.25, 'c. à café', true,  27, NULL),
    (v_recipe_id, 'fenouil moulu',             0.25, 'c. à café', true,  28, NULL),
    (v_recipe_id, 'sel noir',                  2,   'c. à café',  true,  29, 'kala namak'),
    (v_recipe_id, 'asa fœtida',                0.25, 'c. à café', true,  30, 'hing'),
    (v_recipe_id, 'jus de citron',             2,   'c. à café',  true,  31, NULL),
    (v_recipe_id, 'coriandre fraîche',         15,  'g',          true,  32, '~0.5 cup pour eau menthe'),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  33, 'eau menthe'),
    (v_recipe_id, 'eau',                       1200, 'ml',        true,  34, '~5 cup pour diluer pâte menthe');

  -- =====================================================================
  -- 9. Palak Paneer
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Palak Paneer',
    'Curry crémeux d''épinards nord-indien : purée d''épinards blanchis, pâte oignon-cajou onctueuse, kasuri methi et cubes de paneer. Vert profond, finition à la crème fraîche.',
    $instr$["Dans une casserole, mijoter l'oignon haché, les demi-cajous et les piments verts dans 240 ml d'eau pendant 15 minutes.",
"Laisser refroidir et mixer en pâte lisse.",
"Laver et hacher les feuilles de palak (épinards). Plonger dans l'eau bouillante 2-3 minutes.",
"Égoutter et plonger dans un bain d'eau glacée pour fixer la couleur verte. Mixer en purée lisse. Réserver.",
"Poêle : chauffer huile + beurre. Ajouter pâte gingembre-ail et tomates, sauter 2 minutes. Ajouter la pâte oignon-cajou et cuire 5 minutes.",
"Ajouter la purée d'épinards et 240 ml d'eau, cuire 5 minutes.",
"Ajouter garam masala, sel, sucre et kasuri methi. Cuire 3 minutes.",
"Ajouter les cubes de paneer et cuire 2 minutes.",
"Garnir de crème fraîche et servir chaud avec riz, roti ou phulka."]
$instr$,
    15, 50, 3, 2,
    'Indienne', 'dinner',
    ARRAY['indien','nord-indien','palak','paneer','épinards','curry','végétarien'],
    'manual',
    'https://cookdtv.com/recipes/palak-paneer',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon',                  1,   'unité',      true,  1,  'haché'),
    (v_recipe_id, 'demi-cajou',              15,  'unité',      true,  2,  'pour la pâte'),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'eau',                     240, 'ml',         true,  4,  '~1 cup pour mijoter oignon-cajou'),
    (v_recipe_id, 'huile de tournesol',      1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'beurre',                  15,  'g',          true,  6,  '~1 c. à soupe'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'tomate',                  0.5, 'unité',      true,  8,  NULL),
    (v_recipe_id, 'eau',                     240, 'ml',         true,  9,  '~1 cup pour la sauce'),
    (v_recipe_id, 'sucre',                   1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  11, 'au goût'),
    (v_recipe_id, 'garam masala',            1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'kasuri methi',            1,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'paneer',                  200, 'g',          true,  14, 'en cubes'),
    (v_recipe_id, 'crème fraîche',           60,  'ml',         true,  15, '~0.25 cup, finition'),
    (v_recipe_id, 'épinards',                180, 'g',          true,  16, '~6 cup, palak frais');

  -- =====================================================================
  -- 10. Paneer 65
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Paneer 65',
    'Cubes de paneer croustillants façon "65" du Tamil Nadu : marinés au yaourt et épices piquantes (piment Cachemire, garam masala), enrobés d''un mélange de farines (fécule, maïda, riz) puis frits. Starter de restaurant indien.',
    $instr$["Dans un bol, mélanger yaourt, pâte gingembre-ail, piment Cachemire, garam masala, coriandre moulue, poivre, curcuma, cumin, fécule de maïs, maïda et farine de riz.",
"Ajouter un peu d'eau si besoin pour former une pâte épaisse qui enrobe. Bien mélanger. Ajouter le jus de citron et mélanger.",
"Ajouter les cubes de paneer et mélanger délicatement pour bien les enrober.",
"Chauffer l'huile en friture et frire le paneer mariné par fournées 3-4 minutes jusqu'à doré-croustillant. Frire en finition les piments verts émincés et les feuilles de curry pour la garniture parfumée.",
"Servir chaud avec rondelles d'oignon et quartiers de citron."]
$instr$,
    15, 20, 4, 2,
    'Indienne', 'appetizer',
    ARRAY['indien','tamoul','paneer','frit','starter','65','végétarien'],
    'manual',
    'https://cookdtv.com/recipes/paneer-65',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'paneer',                  400, 'g',          true,  1,  'en cubes'),
    (v_recipe_id, 'yaourt nature',           1,   'c. à soupe', true,  2,  'marinade'),
    (v_recipe_id, 'pâte gingembre-ail',      0.5, 'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'piment Cachemire moulu',  0.75,'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'coriandre moulue',        1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'poivre noir moulu',       0.25, 'c. à café', true,  7,  NULL),
    (v_recipe_id, 'curcuma moulu',           0.25, 'c. à café', true,  8,  NULL),
    (v_recipe_id, 'cumin moulu',             0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'fécule de maïs',          2,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'maïda',                   2,   'c. à soupe', true,  11, 'farine raffinée'),
    (v_recipe_id, 'farine de riz',           1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'piments verts',           2,   'unité',      false, 13, 'frire en finition'),
    (v_recipe_id, 'feuilles de curry',       10,  'unité',      false, 14, 'frire en finition'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'eau',                     30,  'ml',         false, 16, 'au besoin pour la pâte'),
    (v_recipe_id, 'jus de citron',           2,   'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'huile de tournesol',      500, 'ml',         true,  18, 'pour la friture');

  -- =====================================================================
  -- 11. Wedding Style Chicken Biryani
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Wedding Style Chicken Biryani',
    'Biryani de poulet style mariage tamoul (format buffet pour 6 portions) : poulet braisé dans masala tomate-yaourt épicé, riz basmati 70% cuit séparément puis fini en dum scellé. Robuste, fiable, scale facilement.',
    $instr$["Dans une grande cocotte : oignons tranchés, épices entières (cannelle, cardamome verte, clous, feuille de laurier) et piments verts fendus. Ajouter l'huile, allumer le feu et cuire jusqu'à oignons dorés.",
"Ajouter coriandre et menthe, frire quelques secondes.",
"Ajouter la pâte gingembre-ail, cuire 1 minute.",
"Ajouter le piment Cachemire et cuire quelques secondes pour libérer la couleur rouge éclatante.",
"Ajouter les tomates et cuire jusqu'à fondues et que l'huile remonte aux bords. Saler.",
"Ajouter le yaourt, bien mélanger. Verser 720 ml d'eau, couvrir et porter à ébullition 5 minutes.",
"Ajouter le poulet, mélanger. Couvrir et cuire 10 minutes à feu moyen.",
"En parallèle, porter une grande quantité d'eau à ébullition dans une autre cocotte avec assez de sel pour qu'elle soit légèrement salée. Ajouter le riz et cuire à 70% (~3 minutes). Égoutter immédiatement, réserver un peu d'eau de cuisson.",
"Ajouter le riz au masala poulet, mélanger très délicatement. S'il manque d'eau, verser de l'eau de cuisson réservée au niveau du riz.",
"Couvrir avec du papier alu + couvercle hermétique.",
"Poser sur un tawa préchauffé : dum 5 minutes feu moyen puis 10 minutes feu très doux.",
"Servir chaud avec raïta, brinjal curry ou chicken 65."]
$instr$,
    15, 75, 6, 3,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','biryani','poulet','mariage','dum','basmati'],
    'manual',
    'https://cookdtv.com/recipes/wedding-style-chicken-biryani',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile de tournesol',      100, 'ml',         true,  1,  NULL),
    (v_recipe_id, 'cardamome verte',         3,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'piments verts',           3,   'unité',      true,  3,  'fendus'),
    (v_recipe_id, 'coriandre fraîche',       15,  'g',          true,  4,  '~0.5 cup'),
    (v_recipe_id, 'pâte gingembre-ail',      2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'tomate',                  3,   'unité',      true,  6,  'hachées'),
    (v_recipe_id, 'eau',                     720, 'ml',         true,  7,  '~3 cup pour le poulet'),
    (v_recipe_id, 'eau',                     1500, 'ml',        true,  8,  'pour cuire le riz, salée'),
    (v_recipe_id, 'bâton de cannelle',       3,   'unité',      true,  9,  'petits morceaux ~2 cm'),
    (v_recipe_id, 'clous de girofle',        4,   'unité',      true,  10, NULL),
    (v_recipe_id, 'oignon',                  3,   'unité',      true,  11, 'tranchés'),
    (v_recipe_id, 'feuilles de menthe',      15,  'g',          true,  12, '~0.5 cup'),
    (v_recipe_id, 'piment Cachemire moulu',  1,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'yaourt nature',           120, 'ml',         true,  14, '~0.5 cup'),
    (v_recipe_id, 'sel',                     1,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'poulet biryani-cut',      750, 'g',          true,  16, 'avec os'),
    (v_recipe_id, 'riz basmati',             600, 'g',          true,  17, NULL),
    (v_recipe_id, 'feuille de laurier',      1,   'unité',      true,  18, NULL);

  -- =====================================================================
  -- 12. Murg Kali Mirch
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Murg Kali Mirch',
    'Curry de poulet nord-indien "au poivre noir" : poulet mariné yaourt-poivre, sauce blanche cajou parfumée poivre + cumin + kasuri methi. Couleur claire mais profil corsé, contraste avec les currys tomatés classiques.',
    $instr$["Mariner le poulet avec 1 c. à soupe d'huile, yaourt, 1 c. à café de poivre noir moulu et 0,25 c. à café de garam masala. Bien mélanger et réserver 30 min.",
"Faire bouillir les noix de cajou dans 240 ml d'eau pendant 5 minutes.",
"Égoutter et mixer en pâte fine avec 120 ml d'eau.",
"Chauffer l'huile dans un kadhai. Ajouter l'oignon haché et cuire jusqu'à translucide.",
"Ajouter les piments verts hachés et la pâte gingembre-ail. Sauter 2 minutes.",
"Ajouter cumin moulu, poivre noir, garam masala, sel et kasuri methi en poudre. Ajouter 60 ml d'eau et bien cuire pour fondre les épices.",
"Ajouter le poulet mariné et mélanger.",
"Ajouter la pâte de cajou et 60 ml d'eau. Couvrir et cuire 8 minutes à feu moyen-doux. Servir chaud."]
$instr$,
    15, 35, 4, 2,
    'Indienne', 'dinner',
    ARRAY['indien','nord-indien','punjabi','poulet','curry','poivre noir','cajou'],
    'manual',
    'https://cookdtv.com/recipes/murg-kali-mirch',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet curry-cut',        400, 'g',          true,  1,  NULL),
    (v_recipe_id, 'yaourt nature',           180, 'ml',         true,  2,  '~0.75 cup, marinade'),
    (v_recipe_id, 'poivre noir moulu',       1,   'c. à café',  true,  3,  'pour la marinade'),
    (v_recipe_id, 'garam masala',            0.25, 'c. à café', true,  4,  'marinade'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  5,  'marinade'),
    (v_recipe_id, 'noix de cajou entières',  60,  'g',          true,  6,  '~0.25 cup'),
    (v_recipe_id, 'eau',                     240, 'ml',         true,  7,  '~1 cup pour cuire les cajous'),
    (v_recipe_id, 'eau',                     120, 'ml',         true,  8,  '~0.5 cup pour mixer les cajous'),
    (v_recipe_id, 'huile de tournesol',      3,   'c. à soupe', true,  9,  NULL),
    (v_recipe_id, 'oignon',                  2,   'unité',      true,  10, 'hachés'),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  11, 'hachés'),
    (v_recipe_id, 'pâte gingembre-ail',      2,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'cumin moulu',             2,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'poivre noir moulu',       1,   'c. à café',  true,  14, 'pour la sauce'),
    (v_recipe_id, 'garam masala',            0.25, 'c. à café', true,  15, 'pour la sauce'),
    (v_recipe_id, 'kasuri methi en poudre',  1,   'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  17, 'pour la sauce'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  18, '~0.25 cup pour les épices'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  19, '~0.25 cup pour la cuisson finale');

  -- =====================================================================
  -- 13. Nombu Kanji
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Nombu Kanji',
    'Porridge salé tamoul du Ramadan : riz basmati + moong dal mijotés avec mouton haché, lait de coco et épices entières. Servi chaud à l''iftar, nourrissant et réconfortant.',
    $instr$["Tremper ensemble le riz basmati et le moong dal 20 minutes. Après trempage, écraser légèrement les grains de riz entre les doigts.",
"Cocotte minute : chauffer huile + ghee et faire revenir les épices entières (cannelle, clous, cardamome verte, laurier, cumin, fenugrec). Ajouter l'oignon et sauter jusqu'à translucide.",
"Ajouter piments verts et mouton haché. Sauter 2 minutes à feu vif.",
"Ajouter pâte gingembre-ail, tomates hachées, menthe et coriandre. Sauter 2 minutes.",
"Ajouter le riz et le moong dal égouttés. Sauter 1 minute. Verser l'eau, couvrir et cocotter 5 sifflets.",
"Une fois la pression retombée, ouvrir, ajouter sel et lait de coco. Bien mélanger et servir chaud."]
$instr$,
    20, 45, 6, 2,
    'Indienne', 'lunch',
    ARRAY['indien','tamoul','porridge','kanji','ramadan','mouton','dal','lait de coco'],
    'manual',
    'https://cookdtv.com/recipes/nombu-kanji',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz basmati',             200, 'g',          true,  1,  '~1 cup'),
    (v_recipe_id, 'moong dal',               100, 'g',          true,  2,  '~0.5 cup, lentilles jaunes'),
    (v_recipe_id, 'huile de tournesol',      1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'ghee',                    1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'bâton de cannelle',       2.5, 'cm',         true,  5,  '~1 inch'),
    (v_recipe_id, 'clous de girofle',        3,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'cardamome verte',         3,   'unité',      true,  7,  NULL),
    (v_recipe_id, 'feuilles de laurier',     2,   'unité',      true,  8,  NULL),
    (v_recipe_id, 'cumin',                   0.5, 'c. à café',  true,  9,  'graines'),
    (v_recipe_id, 'graines de fenugrec',     0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'oignon',                  100, 'g',          true,  11, '~0.75 cup haché'),
    (v_recipe_id, 'piments verts',           4,   'unité',      true,  12, NULL),
    (v_recipe_id, 'mouton haché',            200, 'g',          true,  13, NULL),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'tomate',                  75,  'g',          true,  15, '~0.5 cup hachée'),
    (v_recipe_id, 'coriandre fraîche',       15,  'g',          true,  16, '~0.5 cup'),
    (v_recipe_id, 'feuilles de menthe',      8,   'g',          true,  17, '~0.25 cup'),
    (v_recipe_id, 'eau',                     1920, 'ml',        true,  18, '~8 cup'),
    (v_recipe_id, 'sel',                     4,   'c. à café',  true,  19, NULL),
    (v_recipe_id, 'lait de coco',            240, 'ml',         true,  20, '~1 cup, en finition');

  -- =====================================================================
  -- 14. Butter Chicken
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Butter Chicken',
    'Murgh Makhani version riche : poulet mariné yaourt-épices puis grillé, sauce tomate-cajou enrichie au lait et au beurre, finition crème fraîche + kasuri methi + chaat masala + fumage au charbon pour la profondeur tandoor.',
    $instr$["Poêle : chauffer l'huile de moutarde, retirer du feu, ajouter le piment Cachemire moulu. Laisser refroidir (huile de piment).",
"Dans le yaourt égoutté (hung curd), ajouter cumin moulu, coriandre moulue, kasuri methi, garam masala. Fouetter. Ajouter l'huile de piment et bien mélanger.",
"Couper 800 g de cuisses de poulet en cubes. Ajouter sel, pâte gingembre-ail et jus de citron.",
"Verser la marinade sur le poulet, bien mélanger. Réfrigérer 30 minutes minimum.",
"Cocotte minute : ajouter tomates, demi-cajou, piments Cachemire secs, sel et un peu d'eau. Cocotter 6 sifflets feu moyen-vif. Laisser la pression retomber naturellement et refroidir.",
"Mixer en purée fine et passer au tamis pour obtenir une base sauce lisse.",
"Sauce : dans une cocotte épaisse, chauffer le ghee. Ajouter la pâte gingembre-ail, cuire jusqu'à disparition de l'odeur crue. Ajouter le piment Cachemire moulu, remuer.",
"Ajouter la base sauce, le sel, le sucre et la cardamome moulue.",
"Verser le lait, porter à ébullition douce. Couvrir et mijoter 20 minutes en remuant. Finition : crème fraîche, beurre, kasuri methi et garam masala.",
"Griller le poulet sur plancha/grill à feu vif 10 minutes par fournée, en retournant, jusqu'à marques de braise.",
"Transférer dans un bol, fumer avec un morceau de charbon ardent (ajouter du beurre fondu sur le charbon, couvrir 2 min). Finir le poulet avec jus de citron, beurre fondu et chaat masala.",
"Ajouter le poulet et les jus de fond dans la sauce. Mijoter 2 minutes. Servir chaud, garni de crème fraîche et beurre fondu."]
$instr$,
    45, 75, 4, 4,
    'Indienne', 'dinner',
    ARRAY['indien','nord-indien','poulet','butter chicken','murgh makhani','grillé','tandoor'],
    'manual',
    'https://cookdtv.com/recipes/butter-chicken',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade poulet
    (v_recipe_id, 'poulet désossé',          800, 'g',          true,  1,  'cuisse + pilon'),
    (v_recipe_id, 'huile de moutarde',       3,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'piment Cachemire moulu',  1,   'c. à soupe', true,  3,  'pour la marinade'),
    (v_recipe_id, 'yaourt égoutté',          120, 'ml',         true,  4,  '~0.5 cup, hung curd'),
    (v_recipe_id, 'coriandre moulue',        0.5, 'c. à café',  true,  5,  'marinade'),
    (v_recipe_id, 'cumin moulu',             1,   'c. à café',  true,  6,  'marinade'),
    (v_recipe_id, 'kasuri methi',            0.5, 'c. à café',  true,  7,  'marinade'),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café',  true,  8,  'marinade'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  9,  'marinade'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à café',  true,  10, 'marinade'),
    (v_recipe_id, 'jus de citron',           2,   'c. à café',  true,  11, 'marinade'),
    -- Sauce base
    (v_recipe_id, 'tomate',                  500, 'g',          true,  12, 'pour la base'),
    (v_recipe_id, 'piments Cachemire secs',  6,   'unité',      true,  13, 'pour la base'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  14, 'pour la base'),
    (v_recipe_id, 'demi-cajou',              100, 'g',          true,  15, 'pour la base'),
    -- Finition sauce
    (v_recipe_id, 'ghee',                    3,   'c. à soupe', true,  16, 'finition sauce'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  17, 'finition sauce'),
    (v_recipe_id, 'piment Cachemire moulu',  1,   'c. à soupe', true,  18, 'finition sauce'),
    (v_recipe_id, 'sel',                     2,   'c. à café',  true,  19, 'pour la sauce'),
    (v_recipe_id, 'sucre',                   2,   'c. à soupe', true,  20, NULL),
    (v_recipe_id, 'cardamome moulue',        0.25, 'c. à café', true,  21, NULL),
    (v_recipe_id, 'lait',                    350, 'ml',         true,  22, NULL),
    (v_recipe_id, 'beurre',                  30,  'g',          true,  23, '~2 c. à soupe finition sauce'),
    (v_recipe_id, 'crème fraîche',           3,   'c. à soupe', true,  24, NULL),
    (v_recipe_id, 'kasuri methi',            1,   'c. à soupe', true,  25, 'finition'),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café',  true,  26, 'finition'),
    -- Finition poulet
    (v_recipe_id, 'jus de citron',           1,   'c. à café',  true,  27, 'finition poulet'),
    (v_recipe_id, 'chaat masala',            0.5, 'c. à café',  true,  28, 'finition poulet'),
    (v_recipe_id, 'beurre',                  30,  'g',          true,  29, '~2 c. à soupe pour fumer');

  -- =====================================================================
  -- 17. Dindigul Chicken Biryani
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Dindigul Chicken Biryani',
    'Biryani signature de Dindigul (Tamil Nadu) : masala de biryani torréfié maison (kalpasi obligatoire), poulet braisé dans yaourt + masala, riz Seeraga Samba fini en dum sur tawa. Profil très aromatique et corsé.',
    $instr$["Poêle sèche : torréfier les épices du biryani masala (cannelle, cardamome verte, clous, anis étoilé, kalpasi, poivre noir) jusqu'au parfum. Mixer en poudre grossière. Réserver.",
"Mixer le gingembre et l'ail avec un peu d'eau en pâte fine. Réserver.",
"Laver et tremper le riz Seeraga Samba 20 minutes. Cocotte : chauffer huile d'arachide + ghee, ajouter les feuilles de laurier puis les oignons tranchés. Sauter jusqu'à translucides.",
"Ajouter les piments verts, cuire 1 minute en remuant. Ajouter coriandre et menthe, frire jusqu'au parfum. Ajouter la pâte gingembre-ail, cuire 1 minute.",
"Ajouter les tomates et cuire jusqu'à fondues.",
"Ajouter piment rouge moulu + biryani masala torréfié, cuire jusqu'au parfum. Ajouter le yaourt, mélanger. Cuire jusqu'à ce que l'huile remonte.",
"Ajouter le poulet, bien enrober du masala. Saler. Couvrir et cuire 10 minutes à feu moyen.",
"Ajouter le riz égoutté. Mélanger doucement dans le masala 1 minute. Verser l'eau, mélanger, porter à ébullition et laisser cuire jusqu'à ce que l'eau et le riz soient au même niveau.",
"Poser la cocotte sur un tawa préchauffé : dum 15 minutes à feu très doux. Couper le feu et laisser reposer 5 minutes sans ouvrir.",
"Ajouter le ghee de finition, aérer le riz et le poulet à la fourchette. Servir chaud avec raïta."]
$instr$,
    15, 60, 4, 4,
    'Indienne', 'lunch',
    ARRAY['indien','tamoul','dindigul','biryani','poulet','seeraga samba','kalpasi','dum'],
    'manual',
    'https://cookdtv.com/recipes/dindigul-chicken-biryani',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Biryani masala (à torréfier puis moudre)
    (v_recipe_id, 'bâton de cannelle',       3,    'unité',      true,  1,  'biryani masala, petits morceaux'),
    (v_recipe_id, 'cardamome verte',         8,    'unité',      true,  2,  'biryani masala'),
    (v_recipe_id, 'clous de girofle',        5,    'unité',      true,  3,  'biryani masala'),
    (v_recipe_id, 'anis étoilé',             2,    'unité',      true,  4,  'biryani masala'),
    (v_recipe_id, 'kalpasi',                 1,    'c. à café',  true,  5,  'biryani masala, pierre fleur'),
    (v_recipe_id, 'poivre noir',             1,    'c. à café',  true,  6,  'biryani masala, grains'),
    -- Pâte g+a
    (v_recipe_id, 'gingembre',               35,   'g',          true,  7,  'pour la pâte'),
    (v_recipe_id, 'ail',                     35,   'g',          true,  8,  'pour la pâte'),
    -- Biryani
    (v_recipe_id, 'riz Seeraga Samba',       500,  'g',          true,  9,  'trempé 20 min'),
    (v_recipe_id, 'ghee',                    3,    'c. à soupe', true,  10, 'cuisson'),
    (v_recipe_id, 'huile d''arachide',       3,    'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'feuilles de laurier',     2,    'unité',      true,  12, NULL),
    (v_recipe_id, 'oignon',                  3,    'unité',      true,  13, 'tranchés'),
    (v_recipe_id, 'piments verts',           2,    'unité',      true,  14, NULL),
    (v_recipe_id, 'coriandre fraîche',       15,   'g',          true,  15, '~0.25 cup'),
    (v_recipe_id, 'feuilles de menthe',      8,    'g',          true,  16, '~0.25 cup'),
    (v_recipe_id, 'tomate',                  2,    'unité',      true,  17, NULL),
    (v_recipe_id, 'piment rouge moulu',      1,    'c. à soupe', true,  18, NULL),
    (v_recipe_id, 'yaourt nature',           180,  'ml',         true,  19, '~0.75 cup'),
    (v_recipe_id, 'poulet biryani-cut',      1000, 'g',          true,  20, 'avec os'),
    (v_recipe_id, 'sel',                     1,    'c. à soupe', true,  21, NULL),
    (v_recipe_id, 'eau',                     750,  'ml',         true,  22, 'pour la cuisson'),
    (v_recipe_id, 'jus de citron',           1,    'c. à soupe', false, 23, 'optionnel'),
    (v_recipe_id, 'ghee',                    2,    'c. à soupe', true,  24, 'finition');

  -- =====================================================================
  -- 18. Paneer Thokku
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Paneer Thokku',
    'Thokku tamoul revisité au paneer : pâte de tomate épicée et concentrée (mijotée jusqu''à ce que l''huile remonte), paneer doré ajouté en finition. Semi-sec, parfait avec dosa, idli, riz ou chapati.',
    $instr$["Kadhai : chauffer l'huile, ajouter graines de moutarde, cumin, piments verts et feuilles de curry. Laisser crépiter.",
"Ajouter les oignons tranchés et faire dorer.",
"Ajouter la pâte gingembre-ail, sauter 1 minute.",
"Ajouter les épices moulues (piment rouge, coriandre, curcuma) et sauter jusqu'à disparition du goût cru.",
"Ajouter les tomates et cuire jusqu'à fondues et que l'huile remonte aux bords.",
"Saler et sucrer légèrement. Bien mélanger.",
"Ajouter la coriandre fraîche hachée. Réserver ce thokku.",
"Dans la même poêle, chauffer 2 c. à soupe d'huile et faire dorer les cubes de paneer. Retirer.",
"Remettre le thokku dans la poêle, ajouter 60 ml d'eau, mélanger et chauffer 1 minute.",
"Ajouter sel et garam masala. Mélanger. Ajouter le paneer doré et bien enrober.",
"Cuire jusqu'à ce que le mélange soit semi-sec.",
"Dresser, garnir de coriandre hachée. Servir chaud avec dosa, idli, riz ou chapati."]
$instr$,
    10, 40, 2, 2,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','paneer','thokku','tomate','semi-sec','accompagnement','végétarien'],
    'manual',
    'https://cookdtv.com/recipes/paneer-thokku',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Thokku
    (v_recipe_id, 'huile de tournesol',      2,   'c. à soupe', true,  1,  'pour le thokku'),
    (v_recipe_id, 'graines de moutarde',     1,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'cumin',                   1,   'c. à café',  true,  3,  'graines'),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  4,  NULL),
    (v_recipe_id, 'feuilles de curry',       1,   'unité',      true,  5,  'brin'),
    (v_recipe_id, 'oignon',                  2,   'unité',      true,  6,  'tranchés'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'piment rouge moulu',      1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',        1.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'curcuma moulu',           0.25, 'c. à café', true,  10, NULL),
    (v_recipe_id, 'tomate',                  3,   'unité',      true,  11, NULL),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  12, 'pour le thokku'),
    (v_recipe_id, 'sucre',                   0.25, 'c. à café', true,  13, NULL),
    (v_recipe_id, 'coriandre fraîche',       1,   'c. à soupe', true,  14, 'dans le thokku'),
    -- Paneer + finition
    (v_recipe_id, 'huile de tournesol',      2,   'c. à soupe', true,  15, 'pour le paneer'),
    (v_recipe_id, 'paneer',                  200, 'g',          true,  16, 'en cubes'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  17, '~0.25 cup'),
    (v_recipe_id, 'sel',                     0.25, 'c. à café', true,  18, 'finition'),
    (v_recipe_id, 'garam masala',            0.25, 'c. à café', true,  19, 'finition'),
    (v_recipe_id, 'coriandre fraîche',       1,   'c. à soupe', false, 20, 'garniture');

  -- =====================================================================
  -- 19. Kerala Style Mutton Roast
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Kerala Style Mutton Roast',
    'Mutton roast kéralais : mouton mariné aux épices et huile de coco, précuit à la cocotte minute, puis sauté à feu vif avec échalotes pilées, copeaux de coco torréfiés, poivre noir et garam masala jusqu''à ce que ce soit sec et caramélisé.',
    $instr$["Mariner le mouton avec pâte gingembre-ail, coriandre moulue, garam masala, piment rouge moulu, jus de citron, piments verts, huile de coco et feuilles de curry. Mélanger soigneusement et laisser reposer 30 minutes.",
"Cocotte minute : ajouter le mouton mariné + sel + 240 ml d'eau. Cocotter 15 minutes feu moyen. Laisser la pression retomber naturellement.",
"Poêle : chauffer l'huile de coco, ajouter les copeaux de coco et torréfier jusqu'à doré. Ajouter les oignons tranchés fin et sauter 2 minutes, puis les échalotes pilées.",
"Sauter à feu vif jusqu'à doré profond. Ajouter le mouton précuit. Cuire à feu vif avec poivre noir, garam masala et coriandre moulue. Cuire jusqu'à évaporation complète de l'eau (texture sèche et caramélisée). Servir chaud."]
$instr$,
    35, 45, 2, 3,
    'Indienne', 'dinner',
    ARRAY['indien','kerala','mouton','roast','huile de coco','échalotes','sec'],
    'manual',
    'https://cookdtv.com/recipes/kerala-style-mutton-roast',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade + précuisson
    (v_recipe_id, 'mouton',                  500, 'g',          true,  1,  'en morceaux'),
    (v_recipe_id, 'jus de citron',           15,  'ml',         true,  2,  'marinade'),
    (v_recipe_id, 'feuilles de curry',       2,   'unité',      true,  3,  'brins, marinade'),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café',  true,  4,  'marinade'),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  5,  'marinade'),
    (v_recipe_id, 'poivre noir moulu',       0.5, 'c. à café',  true,  6,  'marinade'),
    (v_recipe_id, 'piment rouge moulu',      1,   'c. à café',  true,  7,  'marinade'),
    (v_recipe_id, 'coriandre moulue',        1,   'c. à café',  true,  8,  'marinade'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  9,  'marinade'),
    (v_recipe_id, 'huile de coco',           2,   'c. à soupe', true,  10, 'marinade'),
    (v_recipe_id, 'curcuma moulu',           0.5, 'c. à café',  true,  11, 'marinade'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  12, 'cocotte minute'),
    (v_recipe_id, 'eau',                     240, 'ml',         true,  13, '~1 cup pour cocotte minute'),
    -- Roast
    (v_recipe_id, 'oignon',                  1,   'unité',      true,  14, 'tranché fin'),
    (v_recipe_id, 'échalotes',               20,  'unité',      true,  15, 'small onions, pilées'),
    (v_recipe_id, 'pâte gingembre-ail',      1.5, 'c. à café',  true,  16, 'pour le roast'),
    (v_recipe_id, 'garam masala',            0.25, 'c. à café', true,  17, 'pour le roast'),
    (v_recipe_id, 'huile de coco',           3,   'c. à soupe', true,  18, 'pour le roast'),
    (v_recipe_id, 'copeaux de noix de coco', 25,  'g',          true,  19, 'à torréfier'),
    (v_recipe_id, 'feuilles de curry',       1,   'unité',      true,  20, 'brin, pour le roast'),
    (v_recipe_id, 'tomate',                  0.5, 'unité',      true,  21, NULL),
    (v_recipe_id, 'poivre noir moulu',       0.5, 'c. à café',  true,  22, 'finition'),
    (v_recipe_id, 'coriandre moulue',        0.75, 'c. à café', true,  23, 'finition');

  -- =====================================================================
  -- 20. Hyderabadi Chicken Fry
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Hyderabadi Chicken Fry',
    'Poulet style Hyderabad (Andhra) : marinade yaourt + oignons frits + épices, puis sauté avec épices entières (cannelle, clous, cardamome). Sec et très parfumé, parfait en starter.',
    $instr$["Dans un bol, mélanger le poulet avec toutes les épices moulues (piment rouge, curcuma, coriandre, fenouil, garam masala, cumin), le yaourt, la pâte gingembre-ail et les oignons frits. Mélanger soigneusement et laisser mariner 30 minutes.",
"Kadhai : chauffer l'huile, ajouter les épices entières (cannelle, clous, cardamome verte). Quand c'est chaud, ajouter le poulet mariné. Cuire 10 minutes à feu moyen-doux en remuant.",
"Quand le poulet est cuit à cœur, ajouter les feuilles de curry, le piment vert haché, le jus de citron et la coriandre hachée. Servir chaud."]
$instr$,
    35, 25, 3, 2,
    'Indienne', 'appetizer',
    ARRAY['indien','andhra','hyderabadi','poulet','frit','starter','épices'],
    'manual',
    'https://cookdtv.com/recipes/hyderbadi-chicken-fry',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet curry-cut',        500, 'g',          true,  1,  NULL),
    (v_recipe_id, 'yaourt nature',           2,   'c. à soupe', true,  2,  'marinade'),
    (v_recipe_id, 'huile de tournesol',      3,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'piment rouge moulu',      1,   'c. à café',  true,  4,  'marinade'),
    (v_recipe_id, 'curcuma moulu',           0.5, 'c. à café',  true,  5,  'marinade'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'coriandre moulue',        1,   'c. à café',  true,  7,  'marinade'),
    (v_recipe_id, 'fenouil moulu',           0.25, 'c. à café', true,  8,  'marinade'),
    (v_recipe_id, 'garam masala',            1,   'c. à café',  true,  9,  'marinade'),
    (v_recipe_id, 'feuilles de curry',       2,   'unité',      true,  10, 'brins, finition'),
    (v_recipe_id, 'piment vert',             1,   'unité',      true,  11, 'haché, finition'),
    (v_recipe_id, 'cumin moulu',             0.5, 'c. à café',  true,  12, 'marinade'),
    (v_recipe_id, 'bâton de cannelle',       2.5, 'cm',         true,  13, '~1 inch'),
    (v_recipe_id, 'clous de girofle',        2,   'unité',      true,  14, NULL),
    (v_recipe_id, 'cardamome verte',         2,   'unité',      true,  15, NULL),
    (v_recipe_id, 'pâte gingembre-ail',      2,   'c. à café',  true,  16, 'marinade'),
    (v_recipe_id, 'jus de citron',           0.5, 'c. à soupe', true,  17, 'finition'),
    (v_recipe_id, 'oignons frits',           2,   'unité',      true,  18, 'browning, dans la marinade'),
    (v_recipe_id, 'coriandre fraîche',       1,   'c. à soupe', false, 19, 'hachée, garniture');

  RAISE NOTICE 'Seed: Cookd recipes batch inserted for user % (17/20 complete; missing 7, 15, 16)', v_user_id;
END $$;
