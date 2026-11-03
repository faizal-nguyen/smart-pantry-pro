-- =====================================================================
-- Seed: 5 recipes from joyousapron.com (4) + somuchfoodblog.com (1)
-- 2026-05-19
--
-- Sources :
--   1. https://www.joyousapron.com/teriyaki-glazed-salmon/  (paste, 403 anti-bot)
--   2. https://www.joyousapron.com/bulgogi-fried-rice/      (paste)
--   3. https://www.joyousapron.com/crab-rangoon-dip/        (paste)
--   4. https://www.joyousapron.com/hibachi-fried-rice/      (paste)
--   5. https://somuchfoodblog.com/bulgogi-style-beef-fried-rice/ (WebFetch)
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` as owned
-- recipes for the audit user `c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6`.
-- Idempotent : DELETEs by name first (FK cascade vide recipe_ingredients).
--
-- Note collisions :
--   - "Bulgogi Fried Rice" existe déjà via le seed myriadrecipes
--     -> nommé ici "Bulgogi Fried Rice (Joyous Apron)" pour cohabitation.
--   - "Bulgogi-Style Beef Fried Rice" (somuchfood) distinct des autres.
--   - "Hibachi Fried Rice" / "Teriyaki Glazed Salmon" / "Crab Rangoon Dip"
--     sont uniques dans la base.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-19-add-fried-rice-bowls.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Teriyaki Glazed Salmon',
    'Bulgogi Fried Rice (Joyous Apron)',
    'Crab Rangoon Dip',
    'Hibachi Fried Rice',
    'Bulgogi-Style Beef Fried Rice'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Teriyaki Glazed Salmon
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Teriyaki Glazed Salmon',
    'Saumon poêlé glacé d''une sauce teriyaki maison (sauce soja, cassonade, vinaigre de riz sucré et huile de sésame), prêt en 20 minutes. Servi sur du riz et garni d''oignons nouveaux et de graines de sésame.',
    $instr$["Préparer la sauce teriyaki : dans un bol, mélanger la sauce soja, la cassonade, l'huile de sésame, le vinaigre de riz, le sucre, l'eau, l'ail émincé et le gingembre râpé jusqu'à ce que le sucre soit dissous.",
"Chauffer l'huile végétale dans une poêle antiadhésive à feu moyen-vif.",
"Poser les pavés de saumon côté peau dessous (ou côté chair s'ils sont sans peau). Cuire 4 à 5 minutes sans y toucher pour bien les dorer.",
"Retourner délicatement et cuire 3 à 4 minutes sur l'autre face, jusqu'à ce que le saumon soit juste cuit (63°C à cœur, chair opaque qui s'effeuille à la fourchette).",
"Verser la sauce teriyaki dans la poêle (elle doit bouillonner aussitôt).",
"Arroser les pavés de sauce à la cuillère pendant 1 à 2 minutes, jusqu'à ce qu'elle les nappe.",
"Retirer du feu. Garnir d'oignons nouveaux émincés et de graines de sésame. Servir aussitôt sur du riz blanc."]
$instr$,
    5, 15, 4, 1,
    'Japonaise', 'dinner',
    ARRAY['japonais','saumon','teriyaki','poêlé','rapide','20min','asiatique'],
    'manual',
    'https://www.joyousapron.com/teriyaki-glazed-salmon/',
    'https://www.joyousapron.com/wp-content/uploads/2020/04/Teriyaki-Glazed-Salmon-Pin-6.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pavés de saumon',           600, 'g',          true,  1,  '4 pavés d''environ 150 g'),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  2,  'pour la cuisson'),
    (v_recipe_id, 'sauce soja',                60,  'ml',         true,  3,  'pour la sauce'),
    (v_recipe_id, 'cassonade',                 30,  'g',          true,  4,  NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'vinaigre de riz',           2.5, 'c. à café',  true,  6,  'mélangé au sucre et à l''eau (ratio 3:1:3)'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  7,  'pour le mélange vinaigre de riz, sucre et eau'),
    (v_recipe_id, 'eau',                       2.5, 'c. à café',  true,  8,  'pour le mélange vinaigre de riz, sucre et eau'),
    (v_recipe_id, 'ail',                       2,   'gousse',     true,  9,  'émincé'),
    (v_recipe_id, 'gingembre',                 1,   'c. à café',  true,  10, 'râpé'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 11, 'émincés, pour garnir'),
    (v_recipe_id, 'graines de sésame',         1,   'c. à café',  false, 12, 'pour garnir'),
    (v_recipe_id, 'riz blanc',                 300, 'g',          false, 13, 'poids cru, cuit pour servir');

  -- =====================================================================
  -- 2. Bulgogi Fried Rice (Joyous Apron)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bulgogi Fried Rice (Joyous Apron)',
    'Riz frit coréen au bœuf bulgogi mariné à la poire, à la sauce soja et au sésame, sauté avec du kimchi, de la carotte et de l''oignon, puis relevé de sauce d''huître. Inspiré du bulgogi fried rice de Trader Joe''s.',
    $instr$["Marinade : mixer au robot la sauce soja, l'huile de sésame, le vinaigre de riz, l'ail émincé et la poire râpée (ou le jus de pomme). Verser sur les lamelles de bœuf dans un saladier et laisser mariner au réfrigérateur au moins 1 heure (24 heures au maximum).",
"Cuisson du bœuf : chauffer une poêle à feu moyen-vif. Y déposer les lamelles de bœuf en laissant la marinade dans le saladier. Saisir 2 minutes, jusqu'à ce qu'elles soient bien dorées et cuites aux trois quarts. Retirer le bœuf avec son jus de cuisson et réserver.",
"Sauce à sauter : dans un petit bol, mélanger la sauce d'huître, la sauce soja et l'huile de sésame.",
"Riz frit : chauffer l'huile végétale dans un wok ou dans la poêle. Faire revenir l'oignon en dés et l'ail émincé 1 minute, jusqu'à ce qu'ils embaument.",
"Ajouter le riz cuit froid et la carotte râpée. Bien mélanger pour détacher les grains.",
"Verser la sauce à sauter et bien enrober le riz.",
"Remettre le bœuf et son jus de cuisson dans la poêle. Ajouter le kimchi.",
"Mélanger 1 à 2 minutes pour que les saveurs se mêlent.",
"Retirer du feu et transférer dans un plat de service. Garnir d'oignons nouveaux ciselés et servir avec un peu de kimchi en accompagnement. Ajouter un œuf au plat par-dessus si on le souhaite."]
$instr$,
    15, 15, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','bulgogi','riz frit','bœuf','kimchi','poire','one-pan','rapide'],
    'manual',
    'https://www.joyousapron.com/bulgogi-fried-rice/',
    'https://www.joyousapron.com/wp-content/uploads/2025/04/Bulgogi-fried-rice-sq.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'faux-filet',                454, 'g',          true,  1,  'ou rumsteck, finement tranché'),
    (v_recipe_id, 'sauce soja',                60,  'ml',         true,  2,  'pour la marinade'),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  3,  'pour la marinade'),
    (v_recipe_id, 'vinaigre de riz',           1,   'c. à soupe', true,  4,  'pour la marinade'),
    (v_recipe_id, 'ail',                       3,   'gousse',     true,  5,  'émincé, pour la marinade'),
    (v_recipe_id, 'poire',                     0.5, 'unité',      true,  6,  'râpée (ou 60 ml de jus de pomme)'),
    (v_recipe_id, 'sauce d''huître',           1,   'c. à soupe', true,  7,  'pour la sauce à sauter'),
    (v_recipe_id, 'sauce soja',                1,   'c. à soupe', true,  8,  'pour la sauce à sauter'),
    (v_recipe_id, 'huile de sésame',           1,   'c. à café',  true,  9,  'pour la sauce à sauter'),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  10, 'pour la cuisson'),
    (v_recipe_id, 'oignon',                    1,   'unité',      true,  11, 'en dés'),
    (v_recipe_id, 'ail',                       2,   'gousse',     true,  12, 'émincé, pour le riz'),
    (v_recipe_id, 'riz jasmin cuit',           600, 'g',          true,  13, 'de la veille, froid'),
    (v_recipe_id, 'carotte',                   1,   'unité',      true,  14, 'râpée'),
    (v_recipe_id, 'kimchi',                    150, 'g',          true,  15, 'dont un peu pour servir'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 16, 'ciselés, pour garnir'),
    (v_recipe_id, 'œuf',                       4,   'unité',      false, 17, 'au plat, en option (1 par personne)');

  -- =====================================================================
  -- 3. Crab Rangoon Dip
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Crab Rangoon Dip',
    'Dip chaud et crémeux inspiré des crab rangoons des restaurants sino-américains : cream cheese, surimi, mozzarella et oignons nouveaux gratinés au four, puis nappés de sauce chili douce. Parfait pour l''apéritif ou un match entre amis.',
    $instr$["Préchauffer le four à 175°C. Sortir le cream cheese à l'avance pour qu'il soit à température ambiante (ou le ramollir 30 secondes au micro-ondes).",
"Émincer finement les oignons nouveaux et hacher le surimi en petits morceaux.",
"Dans un grand saladier, réunir le cream cheese, la crème aigre, le surimi haché, la mozzarella râpée, l'ail émincé, les oignons nouveaux (en gardant un peu de vert pour la fin), le sucre et le sel.",
"Mélanger à la spatule ou au batteur électrique jusqu'à obtenir une crème homogène.",
"Transférer dans un plat à gratin légèrement graissé.",
"Cuire 20 à 25 minutes, jusqu'à ce que le dip soit chaud et bouillonnant.",
"Pour une croûte dorée, passer 2 à 4 minutes sous le gril en surveillant.",
"Sortir du four. Parsemer du reste d'oignons nouveaux et arroser d'un filet de sauce chili douce (facultatif).",
"Servir chaud avec des crackers, des chips de tortilla, des chips de wonton ou des bâtonnets de légumes."]
$instr$,
    10, 25, 6, 1,
    'Chinoise', 'snack',
    ARRAY['chinois','américain','dip','apéro','surimi','fromage','super bowl','partage'],
    'manual',
    'https://www.joyousapron.com/crab-rangoon-dip/',
    'https://www.joyousapron.com/wp-content/uploads/2025/10/Crab-Rangoon-Dip-H-1.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cream cheese',              225, 'g',          true,  1,  'ramolli'),
    (v_recipe_id, 'crème aigre',               120, 'g',          true,  2,  NULL),
    (v_recipe_id, 'mozzarella',                100, 'g',          true,  3,  'râpée (ou cheddar, monterey jack)'),
    (v_recipe_id, 'surimi',                    225, 'g',          true,  4,  'haché en petits morceaux'),
    (v_recipe_id, 'oignons nouveaux',          3,   'unité',      true,  5,  'finement émincés, dont un peu pour garnir'),
    (v_recipe_id, 'ail',                       2,   'gousse',     true,  6,  'émincé'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'sauce chili douce',         2,   'c. à soupe', false, 9,  'thaïe, en option, pour servir'),
    (v_recipe_id, 'crackers',                  150, 'g',          false, 10, 'ou chips de tortilla, bâtonnets de légumes, pour servir');

  -- =====================================================================
  -- 4. Hibachi Fried Rice
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Hibachi Fried Rice',
    'Riz frit hibachi des steakhouses nippo-américains, façon Benihana : riz au beurre, à la sauce soja et au sésame, avec du poulet, des légumes et des œufs brouillés. Prêt en 20 minutes au wok ou dans une grande poêle.',
    $instr$["Éponger le poulet, le couper en cubes, puis le saler et le poivrer. Réserver.",
"Disposer tous les ingrédients à portée de main près du wok : ail, oignon, poulet, légumes surgelés, sauces et beurre.",
"Battre les œufs dans un petit bol.",
"Chauffer un wok ou une grande poêle à feu vif avec un filet d'huile.",
"Verser les œufs battus dans le wok. Les laisser prendre quelques secondes, puis les brouiller rapidement. Retirer les œufs du wok et réserver (1 minute au maximum).",
"Dans le même wok à feu vif, ajouter l'oignon en dés et l'ail émincé. Faire sauter 30 secondes, jusqu'à ce qu'ils embaument et que l'oignon soit tendre.",
"Ajouter les cubes de poulet assaisonnés et les faire sauter quelques minutes, jusqu'à ce qu'ils soient cuits à cœur.",
"Ajouter aussitôt le riz cuit froid en continuant de remuer.",
"Verser la sauce soja, l'huile de sésame et le bouillon de poulet en poudre. Mélanger pour bien enrober.",
"Ajouter le beurre, puis les légumes surgelés. Mélanger.",
"Remettre les œufs brouillés dans le wok, mélanger une dernière fois et retirer aussitôt du feu.",
"Servir chaud, idéalement avec de la sauce yum yum ou de la sriracha selon les goûts."]
$instr$,
    5, 15, 4, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','américain','hibachi','riz frit','beurre','poulet','copycat','benihana','wok'],
    'manual',
    'https://www.joyousapron.com/hibachi-fried-rice/',
    'https://www.joyousapron.com/wp-content/uploads/2026/02/Hibachi-Fried-Rice-H.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blanc de poulet',           450, 'g',          true,  1,  'en cubes'),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  2,  'pour le poulet'),
    (v_recipe_id, 'poivre noir',               0.25, 'c. à café', true,  3,  'pour le poulet'),
    (v_recipe_id, 'riz cuit',                  400, 'g',          true,  4,  'grain court ou jasmin, cuit 1 à 2 jours avant'),
    (v_recipe_id, 'légumes surgelés',          150, 'g',          true,  5,  'mélange petits pois, carottes, maïs'),
    (v_recipe_id, 'œufs',                      3,   'unité',      true,  6,  NULL),
    (v_recipe_id, 'beurre salé',               30,  'g',          true,  7,  NULL),
    (v_recipe_id, 'sauce soja',                2,   'c. à soupe', true,  8,  'allégée en sel'),
    (v_recipe_id, 'huile de sésame',           1,   'c. à café',  true,  9,  NULL),
    (v_recipe_id, 'oignon',                    0.5, 'unité',      true,  10, 'en dés'),
    (v_recipe_id, 'ail',                       2,   'gousse',     true,  11, 'émincé'),
    (v_recipe_id, 'bouillon de poulet en poudre', 1, 'c. à café', true,  12, NULL),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  13, 'neutre, supportant les hautes températures'),
    (v_recipe_id, 'sauce yum yum',             2,   'c. à soupe', false, 14, 'en option, pour servir'),
    (v_recipe_id, 'sriracha',                  1,   'c. à soupe', false, 15, 'en option, pour servir');

  -- =====================================================================
  -- 5. Bulgogi-Style Beef Fried Rice (somuchfoodblog)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bulgogi-Style Beef Fried Rice',
    'Version gourmande du riz frit bulgogi : entrecôte marinée dans un mélange mixé de poire, de sauce soja et de vinaigre de riz sucré, sautée avec du riz jasmin de la veille, du kimchi et des échalotes croustillantes. Prêt en 30 minutes, hors temps de marinade.',
    $instr$["Marinade : mixer au blender la sauce soja, le vinaigre de riz, le sucre, l'eau, la poire nashi, les blancs d'oignons nouveaux, l'ail, le gingembre râpé, la cassonade et l'huile de sésame jusqu'à obtenir un mélange lisse.",
"Mettre les lamelles d'entrecôte et la marinade dans un sac de congélation zippé. Réfrigérer 1 à 8 heures.",
"Dans un petit bol, fouetter la sauce soja, la sauce d'huître et le gingembre restants. Réserver cette sauce.",
"Chauffer l'huile neutre dans un wok à feu moyen-vif. Y frire l'échalote émincée 4 à 5 minutes, jusqu'à ce qu'elle soit dorée et croustillante. L'égoutter sur du papier absorbant.",
"Monter le feu. Disposer le bœuf mariné en une seule couche dans le wok et le cuire 2 minutes de chaque côté.",
"Ajouter les carottes en dés et l'ail émincé. Faire sauter 2 à 3 minutes en remuant souvent.",
"Ajouter le riz jasmin froid et bien l'enrober.",
"Pousser le mélange sur les bords du wok. Verser les œufs battus dans l'espace libéré et cuire 2 à 3 minutes pour qu'ils prennent.",
"Casser les œufs en morceaux et les incorporer au riz.",
"Ajouter le kimchi haché et la sauce réservée. Remuer jusqu'à ce que la sauce soit complètement absorbée.",
"Saler et poivrer. Garnir des échalotes croustillantes, du vert des oignons nouveaux et de coriandre ciselée. Servir aussitôt."]
$instr$,
    15, 15, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','bulgogi','riz frit','entrecôte','kimchi','échalote','30min','one-pan'],
    'manual',
    'https://somuchfoodblog.com/bulgogi-style-beef-fried-rice/',
    'https://somuchfoodblog.com/wp-content/uploads/2021/04/bulgogi-fried-rice14-scaled.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'entrecôte',                 680, 'g',          true,  1,  'tranchée finement (3 à 6 mm) dans le sens contraire des fibres'),
    (v_recipe_id, 'sauce soja',                160, 'ml',         true,  2,  'pour la marinade'),
    (v_recipe_id, 'vinaigre de riz',           25,  'ml',         true,  3,  'mélangé au sucre et à l''eau (ratio 3:1:3), pour la marinade'),
    (v_recipe_id, 'sucre',                     2,   'c. à café',  true,  4,  'pour la marinade'),
    (v_recipe_id, 'eau',                       25,  'ml',         true,  5,  'pour la marinade'),
    (v_recipe_id, 'poire nashi',               0.5, 'unité',      true,  6,  'moyenne, pour la marinade'),
    (v_recipe_id, 'oignons nouveaux',          1,   'botte',      true,  7,  'blancs et vert clair pour la marinade, vert foncé pour garnir'),
    (v_recipe_id, 'ail',                       4,   'gousse',     true,  8,  'pour la marinade'),
    (v_recipe_id, 'gingembre',                 1,   'c. à soupe', true,  9,  'râpé, pour la marinade'),
    (v_recipe_id, 'cassonade',                 1,   'c. à soupe', true,  10, 'pour la marinade'),
    (v_recipe_id, 'huile de sésame',           1,   'c. à café',  true,  11, 'pour la marinade'),
    (v_recipe_id, 'sauce soja',                60,  'ml',         true,  12, 'pour la sauce'),
    (v_recipe_id, 'sauce d''huître',           1,   'c. à soupe', true,  13, 'pour la sauce'),
    (v_recipe_id, 'gingembre',                 1,   'c. à café',  true,  14, 'râpé, pour la sauce'),
    (v_recipe_id, 'huile neutre',              3,   'c. à soupe', true,  15, NULL),
    (v_recipe_id, 'échalote',                  1,   'unité',      true,  16, 'moyenne, finement émincée'),
    (v_recipe_id, 'carottes',                  2,   'unité',      true,  17, 'en petits dés'),
    (v_recipe_id, 'ail',                       3,   'gousse',     true,  18, 'émincé, pour le riz'),
    (v_recipe_id, 'riz jasmin cuit',           750, 'g',          true,  19, 'de la veille'),
    (v_recipe_id, 'œufs',                      2,   'unité',      true,  20, 'légèrement battus'),
    (v_recipe_id, 'kimchi',                    200, 'g',          true,  21, 'haché'),
    (v_recipe_id, 'sel',                       1,   'pincée',     true,  22, 'au goût'),
    (v_recipe_id, 'poivre noir',               1,   'pincée',     true,  23, 'au goût'),
    (v_recipe_id, 'coriandre fraîche',         10,  'g',          false, 24, 'hachée, pour garnir');

  RAISE NOTICE '✅ Imported 5 recipes (4 joyousapron + 1 somuchfoodblog)';
END $$;
