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
    'Biryani de mouton tamoul traditionnel au riz Seeraga Samba, un riz parfumé à grain court. Il associe deux masalas (un mélange sec torréfié puis moulu et une pâte d''épices fraîches), un mouton braisé dans son jus avant l''ajout du riz et une finition à l''étouffée (dum) dans une cocotte scellée à la pâte de chapati.',
    $instr$["Biryani masala (sec) : torréfier à sec puis moudre la cannelle, l'anis étoilé, les graines de cumin, les graines de fenouil, le cumin noir et les clous de girofle. Réserver.",
"Pâte d'épices pour le mouton : mixer les clous de girofle, la cardamome verte, le macis, la cannelle et l'anis étoilé avec un peu d'eau jusqu'à obtenir une pâte fine. Réserver.",
"Laver le riz Seeraga Samba et le faire tremper 30 minutes.",
"Dans une cocotte à biryani, chauffer l'huile d'arachide.",
"Ajouter l'huile de coco, les feuilles de laurier, les échalotes et l'oignon émincé. Faire frire jusqu'à ce qu'ils soient bien dorés.",
"Ajouter les piments verts fendus, le jus de citron, la pâte de gingembre et la pâte d'ail. Cuire jusqu'à ce que l'odeur crue disparaisse.",
"Ajouter, dans cet ordre, le ghee, le biryani masala préparé, le piment rouge moulu, la coriandre moulue et la pâte d'épices pour le mouton. Cuire 2 minutes.",
"Ajouter le yaourt, le sel, la menthe et la coriandre fraîche. Cuire encore 2 minutes.",
"Ajouter les morceaux de mouton, verser 480 ml d'eau, couvrir et cuire environ 20 minutes (plus longtemps si la viande n'est pas encore tendre). La sauce doit épaissir à mesure que le mouton cuit.",
"Une fois le mouton cuit, ajouter le riz trempé et égoutté ainsi que 1,44 l d'eau (ratio riz/eau de 1:2 pour le Seeraga Samba). Laisser frémir jusqu'à ce que l'eau soit presque entièrement absorbée. Sceller alors la cocotte avec de la pâte de chapati ou du papier aluminium pour empêcher la vapeur de s'échapper et laisser 15 minutes à feu très doux. Éteindre le feu.",
"Laisser reposer 15 minutes supplémentaires sans ouvrir : la cuisson se termine grâce à la vapeur.",
"Ouvrir, aérer le riz à la fourchette et servir chaud avec un raïta."]
$instr$,
    25, 70, 4, 4,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','biryani','mouton','seeraga samba','dum'],
    'manual',
    'https://cookdtv.com/recipes/traditional-tamilnadu-mutton-biryani',
    'https://assets.cookdtv.com/card/2qynuo508nk375gpt4ptmcnwhb3g'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Biryani masala (sec, à torréfier puis moudre)
    (v_recipe_id, 'cannelle',               1,    'bâton',      true,  1,  'pour le biryani masala'),
    (v_recipe_id, 'anis étoilé',            0.5,  'unité',      true,  2,  'pour le biryani masala'),
    (v_recipe_id, 'graines de cumin',       0.5,  'c. à café',  true,  3,  'pour le biryani masala'),
    (v_recipe_id, 'graines de fenouil',     0.5,  'c. à café',  true,  4,  'pour le biryani masala'),
    (v_recipe_id, 'cumin noir',             0.5,  'c. à café',  false, 5,  'shahi jeera, pour le biryani masala'),
    (v_recipe_id, 'clous de girofle',       3,    'unité',      true,  6,  'pour le biryani masala'),
    -- Pâte d'épices pour le mouton (à mixer)
    (v_recipe_id, 'clous de girofle',       6,    'unité',      true,  7,  'pour la pâte d''épices'),
    (v_recipe_id, 'cardamome verte',        3,    'unité',      true,  8,  'pour la pâte d''épices'),
    (v_recipe_id, 'macis',                  2,    'unité',      true,  9,  'lames, pour la pâte d''épices'),
    (v_recipe_id, 'cannelle',               1,    'cm',         true,  10, 'en bâton, pour la pâte d''épices'),
    (v_recipe_id, 'anis étoilé',            0.5,  'unité',      true,  11, 'pour la pâte d''épices'),
    (v_recipe_id, 'eau',                    2,    'c. à soupe', true,  12, 'pour mixer la pâte d''épices'),
    -- Corps de la cocotte
    (v_recipe_id, 'huile d''arachide',      5,    'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'huile de coco',          1,    'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'feuilles de laurier',    2,    'unité',      true,  15, NULL),
    (v_recipe_id, 'échalotes',              15,   'unité',      true,  16, 'petits oignons rouges (sambar)'),
    (v_recipe_id, 'oignon',                 1,    'unité',      true,  17, 'émincé'),
    (v_recipe_id, 'piments verts',          3,    'unité',      true,  18, 'fendus'),
    (v_recipe_id, 'jus de citron',          2,    'c. à café',  true,  19, NULL),
    (v_recipe_id, 'pâte de gingembre',      1,    'c. à soupe', true,  20, NULL),
    (v_recipe_id, 'pâte d''ail',            2,    'c. à soupe', true,  21, NULL),
    (v_recipe_id, 'ghee',                   5,    'c. à soupe', true,  22, NULL),
    (v_recipe_id, 'piment rouge moulu',     2,    'c. à café',  true,  23, NULL),
    (v_recipe_id, 'coriandre moulue',       3,    'c. à café',  true,  24, NULL),
    (v_recipe_id, 'yaourt nature',          60,   'g',          true,  25, NULL),
    (v_recipe_id, 'sel',                    1.5,  'c. à café',  true,  26, 'au goût'),
    (v_recipe_id, 'menthe fraîche',         30,   'g',          true,  27, 'feuilles'),
    (v_recipe_id, 'coriandre fraîche',      15,   'g',          true,  28, NULL),
    -- Viande + riz
    (v_recipe_id, 'mouton',                 500,  'g',          true,  29, 'avec os, coupé en morceaux pour biryani'),
    (v_recipe_id, 'riz Seeraga Samba',      500,  'g',          true,  30, 'trempé 30 min'),
    (v_recipe_id, 'eau',                    480,  'ml',         true,  31, 'pour braiser le mouton'),
    (v_recipe_id, 'eau',                    1440, 'ml',         true,  32, 'pour le riz (ratio 1:2)');

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
    'Pilaf indien parfumé : riz basmati cuit à la cocotte-minute dans le ghee avec des épices entières (cannelle, cardamome, girofle, anis étoilé, macis), garni de noix de cajou et de raisins secs frits. Un accompagnement classique des currys.',
    $instr$["Laver le riz basmati et le faire tremper 30 minutes.",
"Dans une cocotte-minute, chauffer 3 c. à soupe de ghee et y faire frire les noix de cajou et les raisins secs jusqu'à ce qu'ils soient dorés. Égoutter et réserver.",
"Dans la même cocotte, faire dorer l'oignon émincé. Égoutter et réserver.",
"Ajouter 1 c. à soupe de ghee, puis les épices entières (cannelle, cardamome, clous de girofle, anis étoilé, macis, laurier). Faire revenir 1 minute jusqu'à ce qu'elles embaument. Ajouter les piments verts fendus.",
"Ajouter le riz égoutté et 540 ml d'eau (ratio 1:1,5). Saler.",
"Fermer la cocotte-minute et cuire jusqu'au premier sifflet, puis éteindre. Laisser la pression retomber naturellement.",
"Ouvrir et transférer dans un plat de service. Garnir des noix de cajou, des raisins secs et de l'oignon frit réservés."]
$instr$,
    30, 25, 3, 2,
    'Indienne', 'lunch',
    ARRAY['indien','tamoul','riz','ghee','pilaf','cocotte minute'],
    'manual',
    'https://cookdtv.com/recipes/ghee-rice',
    'https://assets.cookdtv.com/card/1jmkn5a946uc2vn05b2rmzogrwho'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'feuille de laurier',      1,   'unité',      true,  1,  NULL),
    (v_recipe_id, 'anis étoilé',             1,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'macis',                   1,   'unité',      true,  3,  'lame'),
    (v_recipe_id, 'cannelle',                4,   'cm',         true,  4,  'en bâton'),
    (v_recipe_id, 'sel',                     1.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'riz basmati',             300, 'g',          true,  6,  'trempé 30 min'),
    (v_recipe_id, 'eau',                     540, 'ml',         true,  7,  NULL),
    (v_recipe_id, 'oignon',                  1,   'unité',      true,  8,  'émincé finement'),
    (v_recipe_id, 'ghee',                    1,   'c. à soupe', true,  9,  'pour les épices entières'),
    (v_recipe_id, 'ghee',                    3,   'c. à soupe', true,  10, 'pour les noix de cajou et les raisins'),
    (v_recipe_id, 'noix de cajou',           12,  'g',          true,  11, 'coupées en deux (environ 15 moitiés)'),
    (v_recipe_id, 'raisins secs',            8,   'g',          true,  12, 'environ 15 raisins'),
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
    'Curry emblématique des restaurants indiens : sauce veloutée à la tomate et au cajou, beurre, crème fraîche, garam masala et fenugrec séché pour le parfum, avec des cubes de paneer ajoutés en fin de cuisson. Un équilibre sucré-acide délicatement épicé.',
    $instr$["Faire tremper les noix de cajou 15 minutes dans 60 ml d'eau chaude.",
"Mixer les noix de cajou avec leur eau de trempage jusqu'à obtenir une pâte lisse.",
"Couper grossièrement les tomates et les mixer en purée. Réserver.",
"Dans une poêle à feu moyen, faire fondre le beurre et ajouter la feuille de laurier.",
"Ajouter la pâte gingembre-ail et la faire revenir quelques secondes. Verser la purée de tomates et cuire 5 minutes.",
"Ajouter le piment du Cachemire moulu et poursuivre la cuisson jusqu'à ce que l'eau de la purée soit presque entièrement évaporée.",
"Ajouter la pâte de cajou et cuire 3 minutes en remuant.",
"Verser 360 ml d'eau et laisser mijoter 5 minutes.",
"Saler au goût, puis ajouter le sucre, le garam masala et les feuilles de fenugrec séchées (kasuri methi) écrasées entre les doigts.",
"Quand la sauce a la consistance souhaitée, ajouter les cubes de paneer puis la crème fraîche.",
"Bien mélanger et éteindre le feu."]
$instr$,
    20, 35, 3, 2,
    'Indienne', 'dinner',
    ARRAY['indien','nord-indien','paneer','curry','tomate','cajou','beurre','végétarien'],
    'manual',
    'https://cookdtv.com/recipes/paneer-butter-masala',
    'https://assets.cookdtv.com/card/qwuh678tqilf09x1jjdq3zfjfffg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'paneer',                  200, 'g',          true,  1,  'en cubes'),
    (v_recipe_id, 'tomate',                  5,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'noix de cajou',           20,  'g',          true,  3,  'environ 15 noix entières, à tremper'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  4,  'chaude, pour le trempage des noix de cajou'),
    (v_recipe_id, 'beurre',                  45,  'g',          true,  5,  NULL),
    (v_recipe_id, 'feuille de laurier',      1,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'piment du Cachemire moulu', 1, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'eau',                     360, 'ml',         true,  9,  'pour la sauce'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  10, 'au goût'),
    (v_recipe_id, 'sucre',                   1.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'garam masala',            1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'feuilles de fenugrec séchées', 1, 'c. à café', true, 13, 'kasuri methi, écrasées'),
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
    'Curry de paneer façon dhaba (restaurant routier du Pendjab) : profond et épicé, enrichi au khoya (lait réduit et séché) pour la rondeur, et parfumé au fenugrec séché et à la coriandre. Une sauce à savourer avec du naan ou des rotis.',
    $instr$["Chauffer l'huile et ajouter les épices entières (graines de cumin, cannelle, clous de girofle, cardamome verte et cardamome noire). Ajouter les oignons émincés et cuire jusqu'à ce qu'ils soient dorés.",
"Ajouter la pâte gingembre-ail, les piments verts fendus, toutes les épices en poudre et le sel. Faire revenir 20 secondes pour libérer les arômes.",
"Ajouter les tomates mixées en purée. Couvrir et cuire 5 minutes.",
"Ajouter l'eau puis le khoya. Couvrir et cuire 7 à 8 minutes à feu doux.",
"Incorporer la coriandre hachée et les feuilles de fenugrec séchées (kasuri methi). Ajouter les cubes de paneer et mélanger 2 minutes.",
"L'huile doit remonter à la surface, signe que le masala est cuit. Rectifier le sel et retirer du feu. Servir chaud, arrosé d'un filet de ghee fondu et garni de julienne de gingembre et de brins de coriandre."]
$instr$,
    15, 50, 4, 3,
    'Indienne', 'dinner',
    ARRAY['indien','punjabi','paneer','curry','dhaba','khoya','kasuri methi'],
    'manual',
    'https://cookdtv.com/recipes/dhaba-style-paneer-curry',
    'https://assets.cookdtv.com/card/vtrt890a5stgtbw17zlhdz40iqmu'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile de tournesol',      4,   'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'graines de cumin',        0.5, 'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'clous de girofle',        3,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'cannelle',                2.5, 'cm',         true,  4,  'en bâton'),
    (v_recipe_id, 'cardamome noire',         1,   'unité',      true,  5,  NULL),
    (v_recipe_id, 'cardamome verte',         3,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'oignon',                  3,   'unité',      true,  7,  'émincés'),
    (v_recipe_id, 'gingembre',               2.5, 'cm',         false, 8,  'en julienne, pour servir'),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  9,  'fendus'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'coriandre moulue',        1,   'c. à soupe', true,  11, NULL),
    (v_recipe_id, 'piment du Cachemire moulu', 1, 'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'curcuma moulu',           0.5, 'c. à café',  true,  13, NULL),
    (v_recipe_id, 'cumin moulu',             1,   'c. à café',  true,  14, NULL),
    (v_recipe_id, 'garam masala',            1,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'sel',                     0.5, 'c. à soupe', true,  16, NULL),
    (v_recipe_id, 'tomate',                  4,   'unité',      true,  17, 'mixées en purée'),
    (v_recipe_id, 'eau',                     360, 'ml',         true,  18, NULL),
    (v_recipe_id, 'khoya',                   120, 'g',          true,  19, 'lait réduit et séché (mawa)'),
    (v_recipe_id, 'coriandre fraîche',       2,   'c. à soupe', true,  20, 'hachée, + quelques brins pour servir'),
    (v_recipe_id, 'feuilles de fenugrec séchées', 1, 'c. à soupe', true, 21, 'kasuri methi'),
    (v_recipe_id, 'paneer',                  500, 'g',          true,  22, 'en cubes'),
    (v_recipe_id, 'ghee',                    1,   'c. à soupe', false, 23, 'fondu, pour servir');

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
    'Sauté de poulet désossé à la mode du Chettinad, sec et très épicé : masala maison de poivre noir et de cumin torréfiés, feuilles de curry, noix de cajou et huile de sésame pour le parfum. Souvent servi en entrée.',
    $instr$["Dans une poêle à sec, torréfier le poivre noir en grains et les graines de cumin jusqu'à ce qu'ils embaument. Les moudre finement au moulin à épices. Réserver.",
"Dans une autre poêle, chauffer l'huile de sésame. Ajouter les graines de fenouil, la cannelle, la cardamome verte, les clous de girofle, les noix de cajou et les piments rouges secs. Quand les épices crépitent et que les noix de cajou dorent, ajouter les feuilles de curry.",
"Ajouter les oignons et l'ail finement hachés. Cuire jusqu'à ce que les oignons soient translucides.",
"Ajouter la pâte gingembre-ail, le curcuma et le piment rouge moulu. Faire revenir 1 minute.",
"Ajouter la tomate finement hachée et cuire jusqu'à ce qu'elle soit fondue. Ajouter un peu d'eau pour lier le masala et l'empêcher d'accrocher. Saler.",
"Ajouter le poulet en cubes et bien l'enrober de masala. Cuire 10 minutes en remuant régulièrement, jusqu'à ce qu'il soit cuit à cœur.",
"Ajouter la poudre de poivre et de cumin préparée. Mélanger et faire sauter 2 minutes.",
"Ajouter la coriandre fraîche, mélanger et retirer du feu."]
$instr$,
    10, 35, 3, 3,
    'Indienne', 'appetizer',
    ARRAY['indien','tamoul','chettinad','poulet','sauté','sec','épicé'],
    'manual',
    'https://cookdtv.com/recipes/chettinad-chicken-chukka',
    'https://assets.cookdtv.com/card/3py7kybkg31eudjtmj2zy8ga75d7'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poivre noir en grains',   2,    'c. à café',  true,  1,  'à torréfier'),
    (v_recipe_id, 'graines de cumin',        1,    'c. à café',  true,  2,  'à torréfier'),
    (v_recipe_id, 'huile de sésame',         2,    'c. à soupe', true,  3,  'non grillée (gingelly)'),
    (v_recipe_id, 'graines de fenouil',      1,    'c. à café',  true,  4,  NULL),
    (v_recipe_id, 'cannelle',                2.5,  'cm',         true,  5,  'en bâton'),
    (v_recipe_id, 'cardamome verte',         3,    'unité',      true,  6,  NULL),
    (v_recipe_id, 'clous de girofle',        4,    'unité',      true,  7,  NULL),
    (v_recipe_id, 'noix de cajou',           8,    'g',          true,  8,  'coupées en deux (environ 10 moitiés)'),
    (v_recipe_id, 'piments rouges secs',     2,    'unité',      true,  9,  NULL),
    (v_recipe_id, 'feuilles de curry',       1,    'brin',       true,  10, NULL),
    (v_recipe_id, 'oignon',                  2,    'unité',      true,  11, 'finement hachés'),
    (v_recipe_id, 'ail',                     7,    'gousse',     true,  12, 'finement hachées'),
    (v_recipe_id, 'pâte gingembre-ail',      1,    'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'curcuma moulu',           1,    'c. à café',  true,  14, NULL),
    (v_recipe_id, 'piment rouge moulu',      1,    'c. à café',  true,  15, NULL),
    (v_recipe_id, 'tomate',                  1,    'unité',      true,  16, 'finement hachée'),
    (v_recipe_id, 'eau',                     120,  'ml',         true,  17, NULL),
    (v_recipe_id, 'sel',                     1.25, 'c. à café',  true,  18, NULL),
    (v_recipe_id, 'poulet',                  500,  'g',          true,  19, 'désossé, en cubes'),
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
    'Sauté express du nord de l''Inde : paneer et poivron vert saisis à feu vif avec de l''oignon, du ketchup, des épices et un trait de vinaigre. Sucré et piquant, prêt en 30 minutes.',
    $instr$["Chauffer l'huile dans une poêle. Ajouter les graines de cumin et les laisser crépiter. Ajouter les piments rouges secs, l'ail et le gingembre hachés.",
"Ajouter l'oignon, toutes les épices en poudre et le sel. Ajouter le ketchup et bien mélanger.",
"Monter le feu et ajouter le poivron vert et la tomate. Faire sauter 2 minutes en gardant le croquant.",
"Ajouter le paneer en cubes, le vinaigre et la coriandre. Mélanger délicatement et éteindre le feu."]
$instr$,
    10, 20, 4, 1,
    'Indienne', 'dinner',
    ARRAY['indien','nord-indien','paneer','sauté','rapide','poivron','végétarien'],
    'manual',
    'https://cookdtv.com/recipes/paneer-jalfrezi',
    'https://assets.cookdtv.com/card/10hq15ozbtx0wxna4c4jdjtehkl2'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile de tournesol',      1,   'c. à soupe', true,  1,  NULL),
    (v_recipe_id, 'graines de cumin',        0.5, 'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'piments rouges secs',     3,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'gingembre',               2,   'c. à café',  true,  4,  'finement haché'),
    (v_recipe_id, 'ail',                     3,   'gousse',     true,  5,  'finement haché (environ 1 c. à soupe)'),
    (v_recipe_id, 'oignon',                  70,  'g',          true,  6,  'haché'),
    (v_recipe_id, 'coriandre moulue',        0.5, 'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'piment rouge moulu',      0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'curcuma moulu',           0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  11, NULL),
    (v_recipe_id, 'ketchup',                 3,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'poivron vert',            120, 'g',          true,  13, 'en dés'),
    (v_recipe_id, 'tomate',                  75,  'g',          true,  14, 'en dés'),
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
    'Chaat de rue emblématique : des puris creux et croustillants, garnis d''aloo masala et trempés dans deux eaux parfumées (une eau de tamarin et jaggery sucrée, une eau de menthe et coriandre épicée). À gober en une bouchée.',
    $instr$["Cuire les pommes de terre dans l'eau à la cocotte-minute, le temps de 6 sifflets.",
"Éplucher et écraser les pommes de terre.",
"Ajouter à la purée l'oignon finement haché, la coriandre, le cumin moulu, le chaat masala et le sel. Mélanger et réserver cette farce.",
"Pâte à puri : dans un bol, mélanger la semoule fine (rava), la farine (maïda), le sel et l'eau. Pétrir 4 minutes pour obtenir une pâte ferme.",
"Couvrir la pâte d'un linge humide et laisser reposer 30 minutes.",
"Prélever une petite portion de pâte, la façonner en boule, huiler le plan de travail et l'abaisser finement.",
"Découper des disques avec un emporte-pièce rond et les garder sous un linge humide pendant que l'on découpe les autres.",
"Friture : chauffer l'huile et y frire les puris jusqu'à ce qu'ils soient gonflés et dorés. Les laisser refroidir pour qu'ils deviennent croustillants.",
"Eau de tamarin : faire tremper la pulpe de tamarin et le gingembre pilé dans 480 ml d'eau bouillante pendant 30 minutes.",
"Écraser à la main et passer au tamis pour récupérer le jus de tamarin.",
"Dans un kadhai, porter le jus à ébullition et y faire fondre le jaggery. Ajouter le piment rouge moulu, le cumin moulu et le sel. Laisser mijoter 5 minutes à feu moyen.",
"Eau de menthe : mixer les feuilles de menthe, la coriandre fraîche, le gingembre et les piments verts avec 30 ml d'eau.",
"Diluer cette pâte dans 1,2 l d'eau froide.",
"Ajouter l'amchur, le cumin moulu, le piment rouge moulu, le poivre noir, le fenouil moulu, le sel noir, le sel, l'asa fœtida et le jus de citron. Mélanger et réfrigérer jusqu'au moment de servir.",
"Assemblage : percer le dessus de chaque puri, le garnir d'aloo masala, le plonger dans l'eau parfumée et le manger aussitôt."]
$instr$,
    50, 30, 10, 3,
    'Indienne', 'snack',
    ARRAY['indien','nord-indien','chaat','street food','pani puri','snack'],
    'manual',
    'https://cookdtv.com/recipes/pani-puri',
    'https://assets.cookdtv.com/card/d4d9jvdrs3zm2rbc3y7arew5gsv0'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Aloo masala (farce)
    (v_recipe_id, 'eau',                       720, 'ml',         true,  1,  'pour cuire les pommes de terre'),
    (v_recipe_id, 'pommes de terre',           3,   'unité',      true,  2,  'cuites et écrasées'),
    (v_recipe_id, 'oignon',                    1,   'unité',      true,  3,  'finement haché'),
    (v_recipe_id, 'coriandre fraîche',         1,   'c. à soupe', true,  4,  'hachée, pour la farce'),
    (v_recipe_id, 'cumin moulu',               1,   'c. à café',  true,  5,  'pour la farce'),
    (v_recipe_id, 'chaat masala',              1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  7,  'pour la farce'),
    -- Pâte puri
    (v_recipe_id, 'semoule fine',              180, 'g',          true,  8,  'rava'),
    (v_recipe_id, 'farine de blé',             32,  'g',          true,  9,  'maïda (farine raffinée)'),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  10, 'pour la pâte'),
    (v_recipe_id, 'eau',                       105, 'ml',         true,  11, 'pour la pâte'),
    (v_recipe_id, 'huile de tournesol',        500, 'ml',         true,  12, 'pour la friture'),
    -- Eau de tamarin sucrée
    (v_recipe_id, 'gingembre',                 1.5, 'cm',         true,  13, 'pilé, pour l''eau de tamarin'),
    (v_recipe_id, 'tamarin',                   180, 'g',          true,  14, 'pulpe'),
    (v_recipe_id, 'eau',                       480, 'ml',         true,  15, 'bouillante, pour le tamarin'),
    (v_recipe_id, 'jaggery',                   200, 'g',          true,  16, NULL),
    (v_recipe_id, 'piment rouge moulu',        0.75, 'c. à café', true,  17, 'pour l''eau de tamarin'),
    (v_recipe_id, 'cumin moulu',               0.75, 'c. à café', true,  18, 'pour l''eau de tamarin'),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  19, 'pour l''eau de tamarin'),
    -- Eau de menthe épicée
    (v_recipe_id, 'menthe fraîche',            30,  'g',          true,  20, 'feuilles'),
    (v_recipe_id, 'piments verts',             2,   'unité',      true,  21, NULL),
    (v_recipe_id, 'gingembre',                 2.5, 'cm',         true,  22, 'pour l''eau de menthe'),
    (v_recipe_id, 'eau',                       30,  'ml',         true,  23, 'pour mixer'),
    (v_recipe_id, 'amchur',                    2,   'c. à café',  true,  24, 'poudre de mangue verte séchée'),
    (v_recipe_id, 'cumin moulu',               1,   'c. à café',  true,  25, 'pour l''eau de menthe'),
    (v_recipe_id, 'piment rouge moulu',        1,   'c. à café',  true,  26, 'pour l''eau de menthe'),
    (v_recipe_id, 'poivre noir moulu',         0.25, 'c. à café', true,  27, NULL),
    (v_recipe_id, 'fenouil moulu',             0.25, 'c. à café', true,  28, NULL),
    (v_recipe_id, 'sel noir',                  2,   'c. à café',  true,  29, 'kala namak'),
    (v_recipe_id, 'asa fœtida',                0.25, 'c. à café', true,  30, 'hing'),
    (v_recipe_id, 'jus de citron',             2,   'c. à café',  true,  31, NULL),
    (v_recipe_id, 'coriandre fraîche',         15,  'g',          true,  32, 'pour l''eau de menthe'),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  33, 'pour l''eau de menthe'),
    (v_recipe_id, 'eau',                       1200, 'ml',        true,  34, 'froide, pour diluer la pâte de menthe');

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
    'Curry crémeux d''épinards du nord de l''Inde : purée d''épinards blanchis, pâte onctueuse d''oignon et de cajou, fenugrec séché et cubes de paneer. D''un vert profond, il se termine avec de la crème fraîche.',
    $instr$["Dans une casserole, faire mijoter l'oignon haché, les noix de cajou et les piments verts dans 240 ml d'eau pendant 15 minutes.",
"Laisser refroidir et mixer en une pâte lisse.",
"Laver et hacher les épinards (palak). Les plonger 2 à 3 minutes dans de l'eau bouillante.",
"Les égoutter et les plonger dans de l'eau glacée pour fixer leur couleur verte. Les mixer en purée lisse et réserver.",
"Dans une poêle, chauffer l'huile et le beurre. Ajouter la pâte gingembre-ail et la tomate hachée, faire revenir 2 minutes. Ajouter la pâte d'oignon et de cajou et cuire 5 minutes.",
"Ajouter la purée d'épinards et 240 ml d'eau, cuire 5 minutes.",
"Ajouter le garam masala, le sel, le sucre et les feuilles de fenugrec séchées (kasuri methi). Cuire 3 minutes.",
"Ajouter les cubes de paneer et cuire 2 minutes.",
"Garnir de crème fraîche et servir chaud avec du riz, des rotis ou des phulkas."]
$instr$,
    15, 50, 3, 2,
    'Indienne', 'dinner',
    ARRAY['indien','nord-indien','palak','paneer','épinards','curry','végétarien'],
    'manual',
    'https://cookdtv.com/recipes/palak-paneer',
    'https://assets.cookdtv.com/card/g5i9dhkkh4h04h7mfjwxp732kp8b'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'oignon',                  1,   'unité',      true,  1,  'haché'),
    (v_recipe_id, 'noix de cajou',           12,  'g',          true,  2,  'coupées en deux (environ 15 moitiés), pour la pâte'),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  3,  NULL),
    (v_recipe_id, 'eau',                     240, 'ml',         true,  4,  'pour cuire l''oignon et les noix de cajou'),
    (v_recipe_id, 'huile de tournesol',      1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'beurre',                  15,  'g',          true,  6,  NULL),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  7,  NULL),
    (v_recipe_id, 'tomate',                  0.5, 'unité',      true,  8,  'hachée'),
    (v_recipe_id, 'eau',                     240, 'ml',         true,  9,  'pour la sauce'),
    (v_recipe_id, 'sucre',                   1,   'c. à café',  true,  10, NULL),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  11, 'au goût'),
    (v_recipe_id, 'garam masala',            1,   'c. à café',  true,  12, NULL),
    (v_recipe_id, 'feuilles de fenugrec séchées', 1, 'c. à café', true, 13, 'kasuri methi'),
    (v_recipe_id, 'paneer',                  200, 'g',          true,  14, 'en cubes'),
    (v_recipe_id, 'crème fraîche',           60,  'ml',         true,  15, 'pour la finition'),
    (v_recipe_id, 'épinards',                180, 'g',          true,  16, 'frais (palak)');

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
    'Cubes de paneer croustillants façon « 65 », spécialité du Tamil Nadu : marinés au yaourt et aux épices (piment du Cachemire, garam masala), enrobés d''un mélange de fécule, de farine de blé et de farine de riz, puis frits. Une entrée classique des restaurants indiens.',
    $instr$["Dans un bol, mélanger le yaourt, la pâte gingembre-ail, le piment du Cachemire, le garam masala, la coriandre moulue, le poivre, le curcuma, le cumin, le sel, la fécule de maïs, la farine (maïda) et la farine de riz.",
"Ajouter un peu d'eau si besoin pour obtenir une pâte épaisse et nappante. Bien mélanger, puis incorporer le jus de citron.",
"Ajouter les cubes de paneer et mélanger délicatement pour bien les enrober.",
"Chauffer l'huile de friture et y frire le paneer par fournées 3 à 4 minutes, jusqu'à ce qu'il soit doré et croustillant. Frire ensuite rapidement les piments verts émincés et les feuilles de curry pour la garniture.",
"Servir chaud avec des rondelles d'oignon et des quartiers de citron."]
$instr$,
    15, 20, 4, 2,
    'Indienne', 'appetizer',
    ARRAY['indien','tamoul','paneer','frit','starter','65','végétarien'],
    'manual',
    'https://cookdtv.com/recipes/paneer-65',
    'https://assets.cookdtv.com/card/fo9kx4735h2b6pm6wdddl9n4pjbn'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'paneer',                  400, 'g',          true,  1,  'en cubes'),
    (v_recipe_id, 'yaourt nature',           1,   'c. à soupe', true,  2,  'pour la marinade'),
    (v_recipe_id, 'pâte gingembre-ail',      0.5, 'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'piment du Cachemire moulu', 0.75, 'c. à soupe', true, 4, NULL),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café',  true,  5,  NULL),
    (v_recipe_id, 'coriandre moulue',        1,   'c. à soupe', true,  6,  NULL),
    (v_recipe_id, 'poivre noir moulu',       0.25, 'c. à café', true,  7,  NULL),
    (v_recipe_id, 'curcuma moulu',           0.25, 'c. à café', true,  8,  NULL),
    (v_recipe_id, 'cumin moulu',             0.25, 'c. à café', true,  9,  NULL),
    (v_recipe_id, 'fécule de maïs',          2,   'c. à soupe', true,  10, NULL),
    (v_recipe_id, 'farine de blé',           2,   'c. à soupe', true,  11, 'maïda (farine raffinée)'),
    (v_recipe_id, 'farine de riz',           1,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'piments verts',           2,   'unité',      false, 13, 'émincés, frits pour la garniture'),
    (v_recipe_id, 'feuilles de curry',       10,  'feuille',    false, 14, 'frites pour la garniture'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  15, NULL),
    (v_recipe_id, 'eau',                     30,  'ml',         false, 16, 'au besoin, pour la pâte'),
    (v_recipe_id, 'jus de citron',           2,   'c. à soupe', true,  17, NULL),
    (v_recipe_id, 'huile de tournesol',      500, 'ml',         true,  18, 'pour la friture'),
    (v_recipe_id, 'oignon',                  1,   'unité',      false, 19, 'en rondelles, pour servir'),
    (v_recipe_id, 'citron',                  1,   'unité',      false, 20, 'en quartiers, pour servir');

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
    'Biryani de poulet façon mariage tamoul, pour 6 personnes : le poulet braise dans un masala épicé à la tomate et au yaourt, tandis que le riz basmati, précuit à 70 % à part, termine sa cuisson à l''étouffée (dum). Une recette robuste et fiable, facile à multiplier.',
    $instr$["Dans une grande cocotte, mettre les oignons émincés, les épices entières (cannelle, cardamome verte, clous de girofle, feuille de laurier) et les piments verts fendus. Ajouter l'huile, allumer le feu et cuire jusqu'à ce que les oignons soient dorés.",
"Ajouter la coriandre et la menthe, faire frire quelques secondes.",
"Ajouter la pâte gingembre-ail et cuire 1 minute.",
"Ajouter le piment du Cachemire et cuire quelques secondes pour qu'il libère sa couleur rouge vif.",
"Ajouter les tomates et cuire jusqu'à ce qu'elles soient fondues et que l'huile remonte sur les bords. Saler.",
"Ajouter le yaourt et bien mélanger. Verser 720 ml d'eau, couvrir, porter à ébullition et laisser bouillir 5 minutes.",
"Ajouter le poulet et mélanger. Couvrir et cuire 10 minutes à feu moyen.",
"Pendant ce temps, porter à ébullition une grande quantité d'eau légèrement salée dans une autre cocotte. Ajouter le riz et le cuire à 70 % (environ 3 minutes). L'égoutter aussitôt en réservant un peu d'eau de cuisson.",
"Ajouter le riz au masala de poulet et mélanger très délicatement. S'il manque du liquide, verser de l'eau de cuisson réservée jusqu'au niveau du riz.",
"Couvrir de papier aluminium puis d'un couvercle hermétique.",
"Poser la cocotte sur un tawa préchauffé et cuire à l'étouffée (dum) 5 minutes à feu moyen, puis 10 minutes à feu très doux.",
"Servir chaud avec un raïta, un curry d'aubergines ou du poulet 65."]
$instr$,
    15, 75, 6, 3,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','biryani','poulet','mariage','dum','basmati'],
    'manual',
    'https://cookdtv.com/recipes/wedding-style-chicken-biryani',
    'https://assets.cookdtv.com/card/rdosbx2jubz1dbv8voll7rcautq3'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile de tournesol',      100, 'ml',         true,  1,  NULL),
    (v_recipe_id, 'cardamome verte',         3,   'unité',      true,  2,  NULL),
    (v_recipe_id, 'piments verts',           3,   'unité',      true,  3,  'fendus'),
    (v_recipe_id, 'coriandre fraîche',       15,  'g',          true,  4,  NULL),
    (v_recipe_id, 'pâte gingembre-ail',      2,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'tomate',                  3,   'unité',      true,  6,  'hachées'),
    (v_recipe_id, 'eau',                     720, 'ml',         true,  7,  'pour le masala de poulet'),
    (v_recipe_id, 'eau',                     1500, 'ml',        true,  8,  'légèrement salée, pour précuire le riz'),
    (v_recipe_id, 'cannelle',                6,   'cm',         true,  9,  'en 3 petits morceaux d''environ 2 cm'),
    (v_recipe_id, 'clous de girofle',        4,   'unité',      true,  10, NULL),
    (v_recipe_id, 'oignon',                  3,   'unité',      true,  11, 'émincés'),
    (v_recipe_id, 'menthe fraîche',          15,  'g',          true,  12, 'feuilles'),
    (v_recipe_id, 'piment du Cachemire moulu', 1, 'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'yaourt nature',           120, 'g',          true,  14, NULL),
    (v_recipe_id, 'sel',                     1,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'poulet',                  750, 'g',          true,  16, 'avec os, coupé en gros morceaux'),
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
    'Curry de poulet du nord de l''Inde « au poivre noir » : poulet mariné au yaourt et au poivre, sauce blanche au cajou parfumée au poivre, au cumin et au fenugrec séché. Clair de couleur mais corsé, il change des currys à la tomate.',
    $instr$["Mariner le poulet avec 1 c. à soupe d'huile, le yaourt, 1 c. à café de poivre noir moulu, 1/4 c. à café de garam masala et 1/2 c. à café de sel. Bien mélanger et laisser reposer 30 min.",
"Faire bouillir les noix de cajou dans 240 ml d'eau pendant 5 minutes.",
"Les égoutter et les mixer en pâte fine avec 120 ml d'eau.",
"Chauffer le reste de l'huile dans un kadhai. Ajouter l'oignon haché et cuire jusqu'à ce qu'il soit translucide.",
"Ajouter les piments verts hachés et la pâte gingembre-ail. Faire revenir 2 minutes.",
"Ajouter le cumin moulu, le poivre noir, le garam masala, le sel et le fenugrec séché en poudre. Verser 60 ml d'eau et bien cuire les épices.",
"Ajouter le poulet mariné et mélanger.",
"Ajouter la pâte de cajou et 60 ml d'eau. Couvrir et cuire 8 minutes à feu moyen-doux, en prolongeant si besoin jusqu'à ce que le poulet soit cuit à cœur. Servir chaud."]
$instr$,
    15, 35, 4, 2,
    'Indienne', 'dinner',
    ARRAY['indien','nord-indien','punjabi','poulet','curry','poivre noir','cajou'],
    'manual',
    'https://cookdtv.com/recipes/murg-kali-mirch',
    'https://assets.cookdtv.com/card/5i0roai56t3mi3pdoyyn3s5qi6z2'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet',                  400, 'g',          true,  1,  'coupé en morceaux'),
    (v_recipe_id, 'yaourt nature',           180, 'g',          true,  2,  'pour la marinade'),
    (v_recipe_id, 'poivre noir moulu',       1,   'c. à café',  true,  3,  'pour la marinade'),
    (v_recipe_id, 'garam masala',            0.25, 'c. à café', true,  4,  'pour la marinade'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  5,  'pour la marinade'),
    (v_recipe_id, 'noix de cajou',           60,  'g',          true,  6,  'entières'),
    (v_recipe_id, 'eau',                     240, 'ml',         true,  7,  'pour cuire les noix de cajou'),
    (v_recipe_id, 'eau',                     120, 'ml',         true,  8,  'pour mixer les noix de cajou'),
    (v_recipe_id, 'huile de tournesol',      3,   'c. à soupe', true,  9,  '1 pour la marinade + 2 pour la cuisson'),
    (v_recipe_id, 'oignon',                  2,   'unité',      true,  10, 'hachés'),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  11, 'hachés'),
    (v_recipe_id, 'pâte gingembre-ail',      2,   'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'cumin moulu',             2,   'c. à café',  true,  13, NULL),
    (v_recipe_id, 'poivre noir moulu',       1,   'c. à café',  true,  14, 'pour la sauce'),
    (v_recipe_id, 'garam masala',            0.25, 'c. à café', true,  15, 'pour la sauce'),
    (v_recipe_id, 'feuilles de fenugrec séchées', 1, 'c. à soupe', true, 16, 'kasuri methi, réduites en poudre'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  17, 'pour la sauce'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  18, 'pour cuire les épices'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  19, 'pour la cuisson finale');

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
    'Porridge salé tamoul du ramadan : riz basmati et moong dal mijotés avec du mouton haché, du lait de coco et des épices entières. Servi chaud à l''iftar, il est nourrissant et réconfortant.',
    $instr$["Faire tremper ensemble le riz basmati et le moong dal 20 minutes. Après le trempage, écraser légèrement les grains de riz entre les doigts.",
"Dans une cocotte-minute, chauffer l'huile et le ghee, puis faire revenir les épices entières (cannelle, clous de girofle, cardamome verte, laurier, graines de cumin et de fenugrec). Ajouter l'oignon et le faire revenir jusqu'à ce qu'il soit translucide.",
"Ajouter les piments verts et le mouton haché. Faire sauter 2 minutes à feu vif.",
"Ajouter la pâte gingembre-ail, la tomate hachée, la menthe et la coriandre. Faire revenir 2 minutes.",
"Ajouter le riz et le moong dal égouttés et faire revenir 1 minute. Verser l'eau, fermer la cocotte-minute et cuire le temps de 5 sifflets.",
"Une fois la pression retombée, ouvrir, ajouter le sel et le lait de coco. Bien mélanger et servir chaud."]
$instr$,
    20, 45, 6, 2,
    'Indienne', 'lunch',
    ARRAY['indien','tamoul','porridge','kanji','ramadan','mouton','dal','lait de coco'],
    'manual',
    'https://cookdtv.com/recipes/nombu-kanji',
    'https://assets.cookdtv.com/card/wrbtu7wka85g3uajyk9hgdzpieoz'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'riz basmati',             200, 'g',          true,  1,  NULL),
    (v_recipe_id, 'moong dal',               100, 'g',          true,  2,  'haricots mungo jaunes cassés'),
    (v_recipe_id, 'huile de tournesol',      1,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'ghee',                    1,   'c. à soupe', true,  4,  NULL),
    (v_recipe_id, 'cannelle',                2.5, 'cm',         true,  5,  'en bâton'),
    (v_recipe_id, 'clous de girofle',        3,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'cardamome verte',         3,   'unité',      true,  7,  NULL),
    (v_recipe_id, 'feuilles de laurier',     2,   'unité',      true,  8,  NULL),
    (v_recipe_id, 'graines de cumin',        0.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'graines de fenugrec',     0.5, 'c. à café',  true,  10, NULL),
    (v_recipe_id, 'oignon',                  100, 'g',          true,  11, 'haché'),
    (v_recipe_id, 'piments verts',           4,   'unité',      true,  12, NULL),
    (v_recipe_id, 'mouton haché',            200, 'g',          true,  13, NULL),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  14, NULL),
    (v_recipe_id, 'tomate',                  75,  'g',          true,  15, 'hachée'),
    (v_recipe_id, 'coriandre fraîche',       15,  'g',          true,  16, NULL),
    (v_recipe_id, 'menthe fraîche',          8,   'g',          true,  17, 'feuilles'),
    (v_recipe_id, 'eau',                     1920, 'ml',        true,  18, NULL),
    (v_recipe_id, 'sel',                     4,   'c. à café',  true,  19, NULL),
    (v_recipe_id, 'lait de coco',            240, 'ml',         true,  20, 'en fin de cuisson');

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
    'Murgh makhani en version riche : poulet mariné au yaourt et aux épices puis grillé, sauce tomate-cajou enrichie de lait et de beurre. Finition à la crème fraîche, au fenugrec séché et au chaat masala, avec un fumage au charbon pour retrouver le goût du tandoor.',
    $instr$["Dans une petite poêle, chauffer l'huile de moutarde, retirer du feu et ajouter 1 c. à soupe de piment du Cachemire moulu. Laisser refroidir : on obtient une huile pimentée.",
"Dans le yaourt égoutté, ajouter le cumin moulu, la coriandre moulue, le fenugrec séché (kasuri methi) et le garam masala. Fouetter, puis ajouter l'huile pimentée et bien mélanger.",
"Couper les 800 g de cuisses de poulet désossées en cubes. Ajouter le sel, la pâte gingembre-ail et le jus de citron.",
"Verser la marinade sur le poulet et bien mélanger. Réfrigérer au moins 30 minutes.",
"Dans une cocotte-minute, mettre les tomates, les noix de cajou, les piments du Cachemire séchés, le sel et un peu d'eau. Cuire le temps de 6 sifflets à feu moyen-vif. Laisser la pression retomber naturellement, puis refroidir.",
"Mixer finement et passer au tamis pour obtenir une base de sauce lisse.",
"Sauce : dans une cocotte à fond épais, chauffer le ghee. Ajouter la pâte gingembre-ail et cuire jusqu'à ce que l'odeur crue disparaisse. Ajouter le piment du Cachemire moulu et remuer.",
"Ajouter la base de sauce, le sel, le sucre et la cardamome moulue.",
"Verser le lait et porter à légère ébullition. Couvrir et laisser mijoter 20 minutes en remuant. Terminer avec la crème fraîche, le beurre, le fenugrec séché et le garam masala.",
"Griller le poulet sur une plancha ou un gril à feu vif, 10 minutes par fournée, en le retournant, jusqu'à ce qu'il soit bien marqué.",
"Transférer le poulet dans un bol et le fumer avec un morceau de charbon ardent posé dans une coupelle (verser un peu de beurre fondu sur le charbon et couvrir 2 minutes). Assaisonner le poulet de jus de citron, de beurre fondu et de chaat masala.",
"Ajouter le poulet et son jus à la sauce. Laisser mijoter 2 minutes. Servir chaud, garni d'un trait de crème fraîche et de beurre fondu."]
$instr$,
    45, 75, 4, 4,
    'Indienne', 'dinner',
    ARRAY['indien','nord-indien','poulet','butter chicken','murgh makhani','grillé','tandoor'],
    'manual',
    'https://cookdtv.com/recipes/butter-chicken',
    'https://assets.cookdtv.com/card/1z4gh9kermbdlv20syiae1mqscqs'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade poulet
    (v_recipe_id, 'cuisses de poulet',       800, 'g',          true,  1,  'désossées (haut de cuisse et pilon)'),
    (v_recipe_id, 'huile de moutarde',       3,   'c. à soupe', true,  2,  NULL),
    (v_recipe_id, 'piment du Cachemire moulu', 1, 'c. à soupe', true,  3,  'pour la marinade'),
    (v_recipe_id, 'yaourt grec',             120, 'g',          true,  4,  'ou yaourt nature égoutté (hung curd)'),
    (v_recipe_id, 'coriandre moulue',        0.5, 'c. à café',  true,  5,  'pour la marinade'),
    (v_recipe_id, 'cumin moulu',             1,   'c. à café',  true,  6,  'pour la marinade'),
    (v_recipe_id, 'feuilles de fenugrec séchées', 0.5, 'c. à café', true, 7, 'kasuri methi, pour la marinade'),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café',  true,  8,  'pour la marinade'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  9,  'pour la marinade'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à café',  true,  10, 'pour la marinade'),
    (v_recipe_id, 'jus de citron',           2,   'c. à café',  true,  11, 'pour la marinade'),
    -- Base de sauce
    (v_recipe_id, 'tomate',                  500, 'g',          true,  12, 'pour la base'),
    (v_recipe_id, 'piments du Cachemire séchés', 6, 'unité',    true,  13, 'pour la base'),
    (v_recipe_id, 'sel',                     0.5, 'c. à café',  true,  14, 'pour la base'),
    (v_recipe_id, 'noix de cajou',           100, 'g',          true,  15, 'pour la base'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  16, 'un peu, pour cuire la base'),
    -- Finition sauce
    (v_recipe_id, 'ghee',                    3,   'c. à soupe', true,  17, 'pour la sauce'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  18, 'pour la sauce'),
    (v_recipe_id, 'piment du Cachemire moulu', 1, 'c. à soupe', true,  19, 'pour la sauce'),
    (v_recipe_id, 'sel',                     2,   'c. à café',  true,  20, 'pour la sauce'),
    (v_recipe_id, 'sucre',                   2,   'c. à soupe', true,  21, NULL),
    (v_recipe_id, 'cardamome moulue',        0.25, 'c. à café', true,  22, NULL),
    (v_recipe_id, 'lait',                    350, 'ml',         true,  23, NULL),
    (v_recipe_id, 'beurre',                  30,  'g',          true,  24, 'pour la finition de la sauce'),
    (v_recipe_id, 'crème fraîche',           3,   'c. à soupe', true,  25, 'dont un peu pour servir'),
    (v_recipe_id, 'feuilles de fenugrec séchées', 1, 'c. à soupe', true, 26, 'kasuri methi, pour la finition'),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café',  true,  27, 'pour la finition'),
    -- Finition poulet
    (v_recipe_id, 'jus de citron',           1,   'c. à café',  true,  28, 'pour finir le poulet'),
    (v_recipe_id, 'chaat masala',            0.5, 'c. à café',  true,  29, 'pour finir le poulet'),
    (v_recipe_id, 'beurre',                  30,  'g',          true,  30, 'fondu, pour fumer et finir le poulet');

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
    'Biryani emblématique de Dindigul (Tamil Nadu) : masala maison torréfié (le kalpasi est indispensable), poulet braisé dans le yaourt et les épices, riz Seeraga Samba fini à l''étouffée (dum) sur un tawa. Très aromatique et corsé.',
    $instr$["Dans une poêle à sec, torréfier les épices du biryani masala (cannelle, cardamome verte, clous de girofle, anis étoilé, kalpasi, poivre noir en grains) jusqu'à ce qu'elles embaument. Les moudre en poudre grossière et réserver.",
"Mixer le gingembre et l'ail avec un peu d'eau pour obtenir une pâte fine. Réserver.",
"Laver le riz Seeraga Samba et le faire tremper 20 minutes. Dans une cocotte, chauffer l'huile d'arachide et 3 c. à soupe de ghee, ajouter les feuilles de laurier puis les oignons émincés. Faire revenir jusqu'à ce qu'ils soient translucides.",
"Ajouter les piments verts et cuire 1 minute en remuant. Ajouter la coriandre et la menthe et les faire frire jusqu'à ce qu'elles embaument. Ajouter la pâte de gingembre et d'ail, cuire 1 minute.",
"Ajouter les tomates hachées et cuire jusqu'à ce qu'elles soient fondues.",
"Ajouter le piment rouge moulu et le biryani masala torréfié, cuire jusqu'à ce qu'ils embaument. Ajouter le yaourt, mélanger et cuire jusqu'à ce que l'huile remonte.",
"Ajouter le poulet et bien l'enrober de masala. Saler, couvrir et cuire 10 minutes à feu moyen.",
"Ajouter le riz égoutté et le mélanger doucement au masala pendant 1 minute. Verser l'eau, mélanger, porter à ébullition et laisser cuire jusqu'à ce que l'eau arrive au niveau du riz.",
"Poser la cocotte fermée sur un tawa préchauffé et cuire à l'étouffée (dum) 15 minutes à feu très doux. Éteindre et laisser reposer 5 minutes sans ouvrir.",
"Ajouter les 2 c. à soupe de ghee restantes et aérer délicatement le riz et le poulet à la fourchette. Servir chaud avec un raïta, arrosé d'un peu de jus de citron si on le souhaite."]
$instr$,
    15, 60, 4, 4,
    'Indienne', 'lunch',
    ARRAY['indien','tamoul','dindigul','biryani','poulet','seeraga samba','kalpasi','dum'],
    'manual',
    'https://cookdtv.com/recipes/dindigul-chicken-biryani',
    'https://assets.cookdtv.com/card/dn5pvxgfgtvr0boaz0kg26181qai'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Biryani masala (à torréfier puis moudre)
    (v_recipe_id, 'cannelle',                3,    'bâton',      true,  1,  'petits morceaux, pour le biryani masala'),
    (v_recipe_id, 'cardamome verte',         8,    'unité',      true,  2,  'pour le biryani masala'),
    (v_recipe_id, 'clous de girofle',        5,    'unité',      true,  3,  'pour le biryani masala'),
    (v_recipe_id, 'anis étoilé',             2,    'unité',      true,  4,  'pour le biryani masala'),
    (v_recipe_id, 'kalpasi',                 1,    'c. à café',  true,  5,  'fleur de pierre (black stone flower), pour le biryani masala'),
    (v_recipe_id, 'poivre noir en grains',   1,    'c. à café',  true,  6,  'pour le biryani masala'),
    -- Pâte de gingembre et d'ail
    (v_recipe_id, 'gingembre',               35,   'g',          true,  7,  'pour la pâte'),
    (v_recipe_id, 'ail',                     35,   'g',          true,  8,  'pour la pâte'),
    (v_recipe_id, 'eau',                     2,    'c. à soupe', true,  9,  'pour mixer la pâte'),
    -- Biryani
    (v_recipe_id, 'riz Seeraga Samba',       500,  'g',          true,  10, 'trempé 20 min'),
    (v_recipe_id, 'ghee',                    3,    'c. à soupe', true,  11, 'pour la cuisson'),
    (v_recipe_id, 'huile d''arachide',       3,    'c. à soupe', true,  12, NULL),
    (v_recipe_id, 'feuilles de laurier',     2,    'unité',      true,  13, NULL),
    (v_recipe_id, 'oignon',                  3,    'unité',      true,  14, 'émincés'),
    (v_recipe_id, 'piments verts',           2,    'unité',      true,  15, NULL),
    (v_recipe_id, 'coriandre fraîche',       15,   'g',          true,  16, NULL),
    (v_recipe_id, 'menthe fraîche',          8,    'g',          true,  17, 'feuilles'),
    (v_recipe_id, 'tomate',                  2,    'unité',      true,  18, 'hachées'),
    (v_recipe_id, 'piment rouge moulu',      1,    'c. à soupe', true,  19, NULL),
    (v_recipe_id, 'yaourt nature',           180,  'g',          true,  20, NULL),
    (v_recipe_id, 'poulet',                  1000, 'g',          true,  21, 'avec os, coupé en morceaux'),
    (v_recipe_id, 'sel',                     1,    'c. à soupe', true,  22, NULL),
    (v_recipe_id, 'eau',                     750,  'ml',         true,  23, 'pour la cuisson'),
    (v_recipe_id, 'jus de citron',           1,    'c. à soupe', false, 24, 'en option, pour servir'),
    (v_recipe_id, 'ghee',                    2,    'c. à soupe', true,  25, 'pour la finition');

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
    'Thokku tamoul revisité au paneer : une préparation de tomates épicée et concentrée, mijotée jusqu''à ce que l''huile remonte, à laquelle on ajoute du paneer doré. Semi-sec, parfait avec des dosas, des idlis, du riz ou des chapatis.',
    $instr$["Dans un kadhai, chauffer 2 c. à soupe d'huile, puis ajouter les graines de moutarde, les graines de cumin, les piments verts et les feuilles de curry. Laisser crépiter.",
"Ajouter les oignons émincés et les faire dorer.",
"Ajouter la pâte gingembre-ail et faire revenir 1 minute.",
"Ajouter les épices moulues (piment rouge, coriandre, curcuma) et faire revenir jusqu'à ce qu'elles perdent leur goût cru.",
"Ajouter les tomates hachées et cuire jusqu'à ce qu'elles soient fondues et que l'huile remonte sur les bords.",
"Saler et sucrer légèrement. Bien mélanger.",
"Ajouter la coriandre fraîche hachée. Réserver ce thokku.",
"Dans la même poêle, chauffer 2 c. à soupe d'huile et faire dorer les cubes de paneer. Les retirer.",
"Remettre le thokku dans la poêle, ajouter 60 ml d'eau, mélanger et chauffer 1 minute.",
"Ajouter le sel et le garam masala, mélanger, puis ajouter le paneer doré et bien l'enrober.",
"Cuire jusqu'à ce que le mélange soit semi-sec.",
"Dresser et garnir de coriandre hachée. Servir chaud avec des dosas, des idlis, du riz ou des chapatis."]
$instr$,
    10, 40, 2, 2,
    'Indienne', 'dinner',
    ARRAY['indien','tamoul','paneer','thokku','tomate','semi-sec','accompagnement','végétarien'],
    'manual',
    'https://cookdtv.com/recipes/paneer-thokku',
    'https://assets.cookdtv.com/card/wh3oo09lilq17dlxveibejk6or4w'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Thokku
    (v_recipe_id, 'huile de tournesol',      2,   'c. à soupe', true,  1,  'pour le thokku'),
    (v_recipe_id, 'graines de moutarde',     1,   'c. à café',  true,  2,  NULL),
    (v_recipe_id, 'graines de cumin',        1,   'c. à café',  true,  3,  NULL),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  4,  NULL),
    (v_recipe_id, 'feuilles de curry',       1,   'brin',       true,  5,  NULL),
    (v_recipe_id, 'oignon',                  2,   'unité',      true,  6,  'émincés'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'piment rouge moulu',      1,   'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'coriandre moulue',        1.5, 'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'curcuma moulu',           0.25, 'c. à café', true,  10, NULL),
    (v_recipe_id, 'tomate',                  3,   'unité',      true,  11, 'hachées'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  12, 'pour le thokku'),
    (v_recipe_id, 'sucre',                   0.25, 'c. à café', true,  13, NULL),
    (v_recipe_id, 'coriandre fraîche',       1,   'c. à soupe', true,  14, 'hachée, dans le thokku'),
    -- Paneer + finition
    (v_recipe_id, 'huile de tournesol',      2,   'c. à soupe', true,  15, 'pour le paneer'),
    (v_recipe_id, 'paneer',                  200, 'g',          true,  16, 'en cubes'),
    (v_recipe_id, 'eau',                     60,  'ml',         true,  17, NULL),
    (v_recipe_id, 'sel',                     0.25, 'c. à café', true,  18, 'pour la finition'),
    (v_recipe_id, 'garam masala',            0.25, 'c. à café', true,  19, 'pour la finition'),
    (v_recipe_id, 'coriandre fraîche',       1,   'c. à soupe', false, 20, 'hachée, pour garnir');

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
    'Mouton rôti à la mode du Kerala : la viande, marinée aux épices et à l''huile de coco, est précuite à la cocotte-minute, puis sautée à feu vif avec des échalotes pilées, des copeaux de coco torréfiés, du poivre noir et du garam masala jusqu''à ce qu''elle soit sèche et caramélisée.',
    $instr$["Mariner le mouton avec la pâte gingembre-ail, la coriandre moulue, le garam masala, le piment rouge moulu, le poivre noir, le curcuma, le jus de citron, les piments verts, 2 c. à soupe d'huile de coco et les feuilles de curry. Bien mélanger et laisser reposer 30 minutes.",
"Mettre le mouton mariné dans une cocotte-minute avec le sel et 240 ml d'eau. Cuire 15 minutes sous pression à feu moyen, puis laisser la pression retomber naturellement.",
"Dans une poêle, chauffer 3 c. à soupe d'huile de coco, ajouter les copeaux de coco et les faire dorer. Ajouter l'oignon finement émincé et le brin de feuilles de curry, faire sauter 2 minutes, puis ajouter les échalotes pilées et la pâte gingembre-ail.",
"Faire sauter à feu vif jusqu'à ce que le mélange soit bien doré. Ajouter la tomate hachée et cuire 2 minutes, puis ajouter le mouton précuit avec son jus. Ajouter le poivre noir, le garam masala et la coriandre moulue, et cuire à feu vif jusqu'à évaporation complète du liquide, pour une viande sèche et caramélisée. Servir chaud."]
$instr$,
    35, 45, 2, 3,
    'Indienne', 'dinner',
    ARRAY['indien','kerala','mouton','roast','huile de coco','échalotes','sec'],
    'manual',
    'https://cookdtv.com/recipes/kerala-style-mutton-roast',
    'https://assets.cookdtv.com/card/2swrtydjyq410m2j1myab912ccrr'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade + précuisson
    (v_recipe_id, 'mouton',                  500, 'g',          true,  1,  'en morceaux'),
    (v_recipe_id, 'jus de citron',           15,  'ml',         true,  2,  'pour la marinade'),
    (v_recipe_id, 'feuilles de curry',       2,   'brin',       true,  3,  'pour la marinade'),
    (v_recipe_id, 'garam masala',            0.5, 'c. à café',  true,  4,  'pour la marinade'),
    (v_recipe_id, 'piments verts',           2,   'unité',      true,  5,  'pour la marinade'),
    (v_recipe_id, 'poivre noir moulu',       0.5, 'c. à café',  true,  6,  'pour la marinade'),
    (v_recipe_id, 'piment rouge moulu',      1,   'c. à café',  true,  7,  'pour la marinade'),
    (v_recipe_id, 'coriandre moulue',        1,   'c. à café',  true,  8,  'pour la marinade'),
    (v_recipe_id, 'pâte gingembre-ail',      1,   'c. à soupe', true,  9,  'pour la marinade'),
    (v_recipe_id, 'huile de coco',           2,   'c. à soupe', true,  10, 'pour la marinade'),
    (v_recipe_id, 'curcuma moulu',           0.5, 'c. à café',  true,  11, 'pour la marinade'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  12, 'pour la précuisson'),
    (v_recipe_id, 'eau',                     240, 'ml',         true,  13, 'pour la précuisson'),
    -- Poêlée finale
    (v_recipe_id, 'oignon',                  1,   'unité',      true,  14, 'finement émincé'),
    (v_recipe_id, 'échalotes',               20,  'unité',      true,  15, 'petites, pilées'),
    (v_recipe_id, 'pâte gingembre-ail',      1.5, 'c. à café',  true,  16, 'pour la poêlée'),
    (v_recipe_id, 'garam masala',            0.25, 'c. à café', true,  17, 'pour la poêlée'),
    (v_recipe_id, 'huile de coco',           3,   'c. à soupe', true,  18, 'pour la poêlée'),
    (v_recipe_id, 'copeaux de noix de coco', 25,  'g',          true,  19, 'à torréfier'),
    (v_recipe_id, 'feuilles de curry',       1,   'brin',       true,  20, 'pour la poêlée'),
    (v_recipe_id, 'tomate',                  0.5, 'unité',      true,  21, 'hachée'),
    (v_recipe_id, 'poivre noir moulu',       0.5, 'c. à café',  true,  22, 'pour la finition'),
    (v_recipe_id, 'coriandre moulue',        0.75, 'c. à café', true,  23, 'pour la finition');

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
    'Poulet sauté à la mode d''Hyderabad : mariné au yaourt, aux oignons frits et aux épices, puis sauté avec des épices entières (cannelle, girofle, cardamome). Sec et très parfumé, parfait en entrée.',
    $instr$["Dans un bol, mélanger le poulet avec toutes les épices moulues (piment rouge, curcuma, coriandre, fenouil, garam masala, cumin), le sel, le yaourt, la pâte gingembre-ail et les oignons frits. Bien mélanger et laisser mariner 30 minutes.",
"Dans un kadhai, chauffer l'huile et ajouter les épices entières (cannelle, clous de girofle, cardamome verte). Quand elles grésillent, ajouter le poulet mariné. Cuire à feu moyen-doux en remuant, environ 10 minutes, jusqu'à ce que le poulet soit cuit à cœur.",
"Ajouter alors les feuilles de curry, le piment vert haché, le jus de citron et la coriandre hachée. Servir chaud."]
$instr$,
    35, 25, 3, 2,
    'Indienne', 'appetizer',
    ARRAY['indien','andhra','hyderabadi','poulet','frit','starter','épices'],
    'manual',
    'https://cookdtv.com/recipes/hyderbadi-chicken-fry',
    'https://assets.cookdtv.com/card/3wmf3wb00wwubz8wwkke5zaelidw'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'poulet',                  500, 'g',          true,  1,  'coupé en morceaux'),
    (v_recipe_id, 'yaourt nature',           2,   'c. à soupe', true,  2,  'pour la marinade'),
    (v_recipe_id, 'huile de tournesol',      3,   'c. à soupe', true,  3,  NULL),
    (v_recipe_id, 'piment rouge moulu',      1,   'c. à café',  true,  4,  'pour la marinade'),
    (v_recipe_id, 'curcuma moulu',           0.5, 'c. à café',  true,  5,  'pour la marinade'),
    (v_recipe_id, 'sel',                     1,   'c. à café',  true,  6,  NULL),
    (v_recipe_id, 'coriandre moulue',        1,   'c. à café',  true,  7,  'pour la marinade'),
    (v_recipe_id, 'fenouil moulu',           0.25, 'c. à café', true,  8,  'pour la marinade'),
    (v_recipe_id, 'garam masala',            1,   'c. à café',  true,  9,  'pour la marinade'),
    (v_recipe_id, 'feuilles de curry',       2,   'brin',       true,  10, 'en finition'),
    (v_recipe_id, 'piment vert',             1,   'unité',      true,  11, 'haché, en finition'),
    (v_recipe_id, 'cumin moulu',             0.5, 'c. à café',  true,  12, 'pour la marinade'),
    (v_recipe_id, 'cannelle',                2.5, 'cm',         true,  13, 'en bâton'),
    (v_recipe_id, 'clous de girofle',        2,   'unité',      true,  14, NULL),
    (v_recipe_id, 'cardamome verte',         2,   'unité',      true,  15, NULL),
    (v_recipe_id, 'pâte gingembre-ail',      2,   'c. à café',  true,  16, 'pour la marinade'),
    (v_recipe_id, 'jus de citron',           0.5, 'c. à soupe', true,  17, 'en finition'),
    (v_recipe_id, 'oignons frits',           30,  'g',          true,  18, 'birista (environ 2 oignons frits), pour la marinade'),
    (v_recipe_id, 'coriandre fraîche',       1,   'c. à soupe', false, 19, 'hachée, pour garnir');

  RAISE NOTICE 'Seed: Cookd recipes batch inserted for user % (17/20 complete; missing 7, 15, 16)', v_user_id;
END $$;
