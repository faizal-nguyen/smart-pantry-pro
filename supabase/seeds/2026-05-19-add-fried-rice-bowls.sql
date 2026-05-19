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
    'Saumon poêlé glacé d''une sauce teriyaki maison (soja-cassonade-mirin-sésame), prêt en 20 minutes. Servi sur riz et garni d''oignons nouveaux et graines de sésame.',
    $instr$["Préparer la sauce teriyaki : dans un bol, mélanger sauce soja, cassonade, huile de sésame, mirin, ail émincé et gingembre râpé jusqu'à dissolution du sucre.",
"Chauffer une poêle antiadhésive à feu moyen-vif avec un filet d'huile.",
"Poser les pavés de saumon côté peau vers le bas (ou côté chair si sans peau). Cuire 4-5 minutes sans toucher pour bien dorer.",
"Retourner délicatement et cuire 3-4 minutes côté pile jusqu'à ce que le saumon soit juste cuit (température interne 63°C, chair s'effrite à la fourchette, non translucide).",
"Verser la sauce teriyaki dans la poêle (elle doit bouillonner immédiatement).",
"Cuiller la sauce sur les pavés pour les enrober pendant 1-2 minutes jusqu'à ce qu'elle nappe.",
"Retirer du feu. Garnir d'oignons nouveaux émincés et de graines de sésame. Servir aussitôt sur du riz blanc."]
$instr$,
    5, 15, 4, 1,
    'Japonaise', 'dinner',
    ARRAY['japonais','saumon','teriyaki','poêlé','rapide','20min','asiatique'],
    'manual',
    'https://www.joyousapron.com/teriyaki-glazed-salmon/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'pavés de saumon',           600, 'g',          true,  1,  '4 pavés de ~150g'),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  2,  'pour la cuisson'),
    (v_recipe_id, 'sauce soja',                60,  'ml',         true,  3,  'pour la sauce'),
    (v_recipe_id, 'cassonade',                 30,  'g',          true,  4,  NULL),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  5,  NULL),
    (v_recipe_id, 'mirin',                     2,   'c. à soupe', true,  6,  'vin de riz japonais sucré'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  7,  'émincées'),
    (v_recipe_id, 'gingembre',                 1,   'c. à café',  true,  8,  'râpé'),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 9,  'émincés, garniture'),
    (v_recipe_id, 'graines de sésame',         1,   'c. à café',  false, 10, 'garniture');

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
    'Riz frit coréen au bœuf bulgogi mariné poire-soja-sésame, sauté avec kimchi, carottes et oignons, terminé d''une sauce huître. Inspiré du Trader Joe''s bulgogi fried rice.',
    $instr$["Mariner le bœuf : mixer sauce soja, huile de sésame, vinaigre de riz, ail émincé et poire râpée (ou jus de pomme) au robot. Verser sur les lamelles de faux-filet/rumsteck dans un saladier. Laisser mariner minimum 1 heure (idéalement 24h max au frigo).",
"Cuire le bœuf : chauffer une poêle à feu moyen-vif. Déposer les lamelles de bœuf en laissant la marinade dans le saladier. Frire 2 minutes jusqu'à 80% de cuisson (bien doré). Retirer bœuf ET jus de cuisson, réserver.",
"Sauce stir-fry : dans un petit bol, mélanger sauce huître, sauce soja et huile de sésame.",
"Riz frit : chauffer 1 c. à soupe d'huile dans le wok ou la poêle. Faire revenir oignon en dés et ail émincé 1 minute jusqu'à parfum.",
"Ajouter le riz cuit froid et la carotte râpée. Bien mélanger pour défaire les grumeaux.",
"Verser la sauce stir-fry et bien enrober.",
"Remettre le bœuf avec son jus de cuisson dans la poêle. Ajouter le kimchi.",
"Mélanger 1-2 minutes pour rassembler les saveurs.",
"Retirer du feu et transférer dans un plat de service. Garnir d'oignons nouveaux ciselés et de kimchi supplémentaire en accompagnement. Œuf au plat optionnel par-dessus."]
$instr$,
    15, 15, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','bulgogi','riz frit','bœuf','kimchi','poire','one-pan','rapide'],
    'manual',
    'https://www.joyousapron.com/bulgogi-fried-rice/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'faux-filet ou rumsteck',    454, 'g',          true,  1,  'finement tranché'),
    (v_recipe_id, 'sauce soja',                60,  'ml',         true,  2,  'pour la marinade'),
    (v_recipe_id, 'huile de sésame',           1,   'c. à soupe', true,  3,  'pour la marinade'),
    (v_recipe_id, 'vinaigre de riz',           1,   'c. à soupe', true,  4,  'pour la marinade'),
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  5,  'émincées, pour la marinade'),
    (v_recipe_id, 'poire',                     0.5, 'unité',      true,  6,  'râpée (ou 60ml jus de pomme)'),
    (v_recipe_id, 'sauce huître',              1,   'c. à soupe', true,  7,  'pour la sauce stir-fry'),
    (v_recipe_id, 'sauce soja',                1,   'c. à soupe', true,  8,  'pour la sauce stir-fry'),
    (v_recipe_id, 'huile de sésame',           1,   'c. à café',  true,  9,  'pour la sauce stir-fry'),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  10, 'pour cuire'),
    (v_recipe_id, 'oignon',                    1,   'unité',      true,  11, 'en dés'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  12, 'émincées, pour le riz'),
    (v_recipe_id, 'riz jasmin cuit',           600, 'g',          true,  13, 'de la veille, froid'),
    (v_recipe_id, 'carotte',                   1,   'unité',      true,  14, 'râpée'),
    (v_recipe_id, 'kimchi',                    150, 'g',          true,  15, NULL),
    (v_recipe_id, 'oignons nouveaux',          2,   'unité',      false, 16, 'ciselés, garniture'),
    (v_recipe_id, 'œuf',                       1,   'unité',      false, 17, 'au plat, optionnel');

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
    'Dip chaud et crémeux inspiré des crab rangoons chinois : cream cheese, surimi, mozzarella et oignons nouveaux gratinés au four et nappés de sauce chili douce. Parfait pour apéro ou Super Bowl.',
    $instr$["Sortir le cream cheese à température ambiante (ou ramollir 30 secondes au micro-ondes).",
"Couper finement les oignons nouveaux et émietter/hacher le surimi en petits morceaux.",
"Dans un grand saladier, combiner cream cheese, crème aigre, surimi haché, mozzarella râpée, ail émincé, oignons nouveaux, sucre et sel.",
"Mélanger à la spatule ou au batteur électrique jusqu'à crème uniforme.",
"Transférer dans un plat à gratin légèrement graissé.",
"Préchauffer le four à 175°C. Cuire le dip 20-25 minutes jusqu'à ce qu'il soit chaud et bouillonnant.",
"Pour une croûte dorée : passer 2-4 minutes sous le grill en surveillant.",
"Sortir du four. Parsemer d'oignons nouveaux supplémentaires et arroser d'une fine couche de sauce chili douce thaï (optionnel).",
"Servir chaud avec crackers, chips de tortilla, chips de wonton frits ou bâtonnets de légumes."]
$instr$,
    10, 25, 6, 1,
    'Chinoise', 'snack',
    ARRAY['chinois','américain','dip','apéro','surimi','fromage','super bowl','partage'],
    'manual',
    'https://www.joyousapron.com/crab-rangoon-dip/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cream cheese',              225, 'g',          true,  1,  'ramolli'),
    (v_recipe_id, 'crème aigre',               120, 'g',          true,  2,  NULL),
    (v_recipe_id, 'mozzarella râpée',          100, 'g',          true,  3,  'ou cheddar/Monterey Jack'),
    (v_recipe_id, 'surimi',                    225, 'g',          true,  4,  'haché en petits morceaux'),
    (v_recipe_id, 'oignons nouveaux',          3,   'unité',      true,  5,  'finement émincés'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  6,  'émincées'),
    (v_recipe_id, 'sucre',                     1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'sel',                       0.5, 'c. à café',  true,  8,  NULL),
    (v_recipe_id, 'sauce chili douce thaï',    2,   'c. à soupe', false, 9,  'optionnel, pour servir'),
    (v_recipe_id, 'crackers',                  150, 'g',          false, 10, 'pour servir');

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
    'Riz frit hibachi japonais-américain copycat Benihana : riz beurré au soja-sésame avec poulet, légumes mixtes et œufs brouillés. Prêt en 15 minutes au wok ou grande poêle.',
    $instr$["Sécher le poulet, le couper en cubes et assaisonner sel et poivre. Réserver.",
"Préparer toutes les ingrédients à portée de main près du wok : ail, oignons, poulet, légumes surgelés, sauces, beurre.",
"Battre les œufs dans un petit bol.",
"Chauffer un wok ou grande poêle à feu vif avec un filet d'huile.",
"Verser les œufs battus dans le wok. Laisser prendre quelques secondes, puis brouiller rapidement. Retirer les œufs cuits du wok et réserver (1 minute max).",
"Dans le même wok à feu vif, ajouter l'oignon en dés et l'ail émincé. Sauter 30 secondes jusqu'à parfum et oignons tendres.",
"Ajouter les cubes de poulet assaisonnés. Sauter 1 minute environ jusqu'à cuisson.",
"Ajouter immédiatement le riz cuit froid en continuant à remuer.",
"Verser sauce soja, huile de sésame et bouillon de poulet en poudre. Mélanger pour bien enrober.",
"Ajouter le beurre, puis les légumes surgelés. Mélanger.",
"Remettre les œufs brouillés dans le wok. Donner un dernier tour et retirer immédiatement du feu.",
"Servir chaud, idéalement avec yum yum sauce, sriracha ou huile pimentée selon les goûts."]
$instr$,
    5, 15, 4, 2,
    'Japonaise', 'dinner',
    ARRAY['japonais','américain','hibachi','riz frit','beurre','poulet','copycat','benihana','wok'],
    'manual',
    'https://www.joyousapron.com/hibachi-fried-rice/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'blanc de poulet',           450, 'g',          true,  1,  'en cubes'),
    (v_recipe_id, 'riz cuit',                  400, 'g',          true,  2,  'court grain ou jasmin, froid de 1-2 jours'),
    (v_recipe_id, 'légumes surgelés',          150, 'g',          true,  3,  'mélange petits pois/carottes/maïs'),
    (v_recipe_id, 'œufs',                      3,   'unité',      true,  4,  NULL),
    (v_recipe_id, 'beurre salé',               30,  'g',          true,  5,  '2 c. à soupe'),
    (v_recipe_id, 'sauce soja',                2,   'c. à soupe', true,  6,  'allégée'),
    (v_recipe_id, 'huile de sésame',           1,   'c. à café',  true,  7,  NULL),
    (v_recipe_id, 'oignon',                    0.5, 'unité',      true,  8,  'finement coupé'),
    (v_recipe_id, 'gousses d''ail',            2,   'unité',      true,  9,  'émincées'),
    (v_recipe_id, 'bouillon de poulet en poudre', 1, 'c. à café', true,  10, 'umami'),
    (v_recipe_id, 'huile végétale',            1,   'c. à soupe', true,  11, 'neutre à haute fumée'),
    (v_recipe_id, 'yum yum sauce',             2,   'c. à soupe', false, 12, 'optionnel, pour servir'),
    (v_recipe_id, 'sriracha',                  1,   'c. à soupe', false, 13, 'optionnel');

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
    'Version premium du riz frit bulgogi : entrecôte mariné poire-mirin-soja blendé, riz jasmin de la veille avec kimchi et échalotes croustillantes. Prêt en 30 minutes.',
    $instr$["Marinade : mixer au blender sauce soja, mirin, poire asiatique, oignons nouveaux (parties blanches), ail, gingembre râpé, cassonade et huile de sésame jusqu'à lisse.",
"Combiner la marinade avec les lamelles d'entrecôte dans un sac zip. Réfrigérer 1 à 8 heures.",
"Fouetter ensemble sauce soja, sauce huître et gingembre dans un petit bol. Réserver.",
"Chauffer un wok à feu moyen-vif avec de l'huile neutre. Frire l'échalote émincée 4-5 minutes jusqu'à doré croustillant. Transférer sur papier absorbant.",
"Monter le feu à vif. Disposer le bœuf mariné en une seule couche dans le wok. Cuire 2 minutes par face.",
"Ajouter carottes en dés et ail émincé. Sauter 2-3 minutes en remuant souvent.",
"Ajouter le riz jasmin froid et bien enrober.",
"Pousser le mélange sur les côtés du wok. Verser les œufs battus dans l'espace libre. Cuire 2-3 minutes pour faire prendre.",
"Casser les œufs en morceaux et les incorporer au riz.",
"Ajouter le kimchi haché et la sauce stir-fry. Remuer jusqu'à absorption complète.",
"Assaisonner sel et poivre. Garnir des échalotes croustillantes et de coriandre ciselée. Servir aussitôt."]
$instr$,
    15, 15, 4, 2,
    'Coréenne', 'dinner',
    ARRAY['coréen','bulgogi','riz frit','entrecôte','kimchi','échalote','30min','one-pan'],
    'manual',
    'https://somuchfoodblog.com/bulgogi-style-beef-fried-rice/',
    NULL
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'entrecôte',                 680, 'g',          true,  1,  'tranchée 3-6mm contre le grain'),
    (v_recipe_id, 'sauce soja',                160, 'ml',         true,  2,  'pour la marinade'),
    (v_recipe_id, 'mirin',                     60,  'ml',         true,  3,  NULL),
    (v_recipe_id, 'poire asiatique',           0.5, 'unité',      true,  4,  'moyenne, pour la marinade'),
    (v_recipe_id, 'oignons nouveaux',          1,   'botte',      true,  5,  'parties blanches+verts clairs'),
    (v_recipe_id, 'gousses d''ail',            4,   'unité',      true,  6,  'pour la marinade'),
    (v_recipe_id, 'gingembre',                 1,   'c. à soupe', true,  7,  'râpé, pour la marinade'),
    (v_recipe_id, 'cassonade',                 1,   'c. à soupe', true,  8,  'pour la marinade'),
    (v_recipe_id, 'huile de sésame',           1,   'c. à café',  true,  9,  'pour la marinade'),
    (v_recipe_id, 'sauce soja',                60,  'ml',         true,  10, 'pour la sauce stir-fry'),
    (v_recipe_id, 'sauce huître',              1,   'c. à soupe', true,  11, 'pour la sauce stir-fry'),
    (v_recipe_id, 'gingembre',                 1,   'c. à café',  true,  12, 'râpé, pour la sauce'),
    (v_recipe_id, 'huile neutre',              3,   'c. à soupe', true,  13, '45 ml'),
    (v_recipe_id, 'échalote',                  1,   'unité',      true,  14, 'moyenne, finement tranchée'),
    (v_recipe_id, 'carottes',                  2,   'unité',      true,  15, 'finement coupées'),
    (v_recipe_id, 'gousses d''ail',            3,   'unité',      true,  16, 'émincées, pour le riz'),
    (v_recipe_id, 'riz jasmin cuit',           750, 'g',          true,  17, '5 tasses, de la veille'),
    (v_recipe_id, 'œufs',                      2,   'unité',      true,  18, 'légèrement battus'),
    (v_recipe_id, 'kimchi',                    200, 'g',          true,  19, '1,25 tasse, haché'),
    (v_recipe_id, 'oignons nouveaux',          1,   'botte',      false, 20, 'parties vertes, tranchées'),
    (v_recipe_id, 'coriandre fraîche',         10,  'g',          false, 21, 'hachée');

  RAISE NOTICE '✅ Imported 5 recipes (4 joyousapron + 1 somuchfoodblog)';
END $$;
