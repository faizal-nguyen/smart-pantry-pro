-- =====================================================================
-- Seed: Ayam Percik (Malaisien, Kelantan)
-- Source : https://www.nyonyacooking.com/recipes/ayam-percik~2JIHfE6OLH
-- Fetched : 2026-05-18
--
-- Inserts into `public.recipes` + `public.recipe_ingredients` as
-- an owned recipe for user `c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6`.
-- Idempotent : DROPs the recipe by name first.
--
-- Run from Supabase Studio (SQL editor) or via psql:
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-18-add-ayam-percik.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id   UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id UUID;
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = 'Ayam Percik';

  -- ---------- Ayam Percik ----------
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Ayam Percik',
    'Poulet rôti saucé typique du Kelantan (Malaisie). Le poulet est mariné au curcuma puis nappé d''une sauce au lait de coco riche en épices fraîches avant d''être grillé jusqu''à ce que la sauce lustrée enrobe la viande.',
    $instr$["Dans un grand bol, mélanger le gingembre râpé, le sel et le curcuma en poudre. Frotter le mélange sur les cuisses de poulet. Réserver pour mariner.",
"Cuire les cuisses de poulet marinées à la vapeur pendant 15 minutes puis réserver.",
"Dans un blender, mettre les échalotes, l'ail, la pâte de crevettes séchées et la citronnelle (parties blanches uniquement). Mixer jusqu'à obtenir une pâte lisse.",
"Dans une poêle (huilée si elle n'est pas anti-adhésive), cuire la pâte de piment (cili boh) à feu moyen-doux pendant 1 à 2 minutes. Ajouter la pâte d'aromates mixée et cuire à feu doux pendant 15 minutes en remuant continuellement, avant d'ajouter le lait de coco.",
"Ajouter les tiges de citronnelle écrasées. Ajouter ensuite le sel, le sucre et la pâte de tamarin. Continuer à remuer pendant 15 minutes à feu doux. La sauce doit épaissir lorsqu'elle est prête.",
"Placer les cuisses de poulet vapeur dans la sauce. Mijoter 5 minutes. Transférer le poulet sur une plaque de cuisson chemisée. Continuer à mijoter la sauce 5 minutes de plus puis éteindre le feu.",
"Enfourner les cuisses de poulet 30 minutes à 200°C, ou jusqu'à coloration. Une fois prêtes, napper les cuisses cuites avec le reste de sauce. Servir avec du riz."]
$instr$,
    30, 100, 4, 3,
    'Malaisienne', 'dinner',
    ARRAY['malaisien','kelantan','poulet','grillé','lait de coco','citronnelle','main'],
    'manual',
    'https://www.nyonyacooking.com/recipes/ayam-percik~2JIHfE6OLH',
    'https://ucarecdn.com/b7fd95b1-464b-4ac7-82e3-2779960eda89/-/scale_crop/1600x900/center/-/quality/normal/-/format/jpeg/ayam-percik.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    -- Marinade
    (v_recipe_id, 'cuisses de poulet',         4,   'unité',      true,  1,  'avec peau idéalement'),
    (v_recipe_id, 'gingembre',                 2.5, 'cm',         true,  2,  'râpé'),
    (v_recipe_id, 'curcuma en poudre',         0.5, 'c. à soupe', true,  3,  'marinade'),
    (v_recipe_id, 'sel',                       1,   'c. à café',  true,  4,  'marinade'),
    -- Pâte d'aromates
    (v_recipe_id, 'échalotes',                 7,   'unité',      true,  5,  'pour la pâte d''aromates'),
    (v_recipe_id, 'ail',                       2,   'gousse',     true,  6,  'pour la pâte d''aromates'),
    (v_recipe_id, 'pâte de crevettes séchées', 1.5, 'c. à soupe', true,  7,  'belacan'),
    (v_recipe_id, 'citronnelle',               2,   'unité',      true,  8,  'parties blanches uniquement, pour mixer'),
    -- Sauce
    (v_recipe_id, 'pâte de piment',            3,   'c. à soupe', true,  9,  'cili boh'),
    (v_recipe_id, 'lait de coco',              480, 'ml',         true,  10, '2 tasses (~480 ml)'),
    (v_recipe_id, 'citronnelle',               2,   'unité',      true,  11, 'tiges, écrasées pour la sauce'),
    (v_recipe_id, 'sel',                       0.5, 'c. à soupe', true,  12, 'sauce'),
    (v_recipe_id, 'sucre',                     3,   'c. à soupe', true,  13, NULL),
    (v_recipe_id, 'pâte de tamarin',           1,   'c. à soupe', true,  14, NULL),
    -- Accompagnement suggéré
    (v_recipe_id, 'riz blanc',                 1,   'unité',      false, 15, 'pour servir');

  RAISE NOTICE 'Seed: Ayam Percik inserted with id % for user %', v_recipe_id, v_user_id;
END $$;
