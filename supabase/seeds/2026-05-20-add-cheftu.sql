-- =====================================================================
-- Seed: 1 Vietnamese recipe from cheftu.com (2026-05-20)
--
-- Sources fetched 2026-05-20 :
--   1. https://cheftu.com/recipelibrary/banhmitrung
--
-- Note: cheftu.com utilise un CDN imgur (i.imgur.com) pour les photos.
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-20-add-cheftu.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Bánh Mì Trứng (Banh Mi Œuf Frit Croustillant)'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Bánh Mì Trứng (Banh Mi Œuf Frit Croustillant)
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Bánh Mì Trứng (Banh Mi Œuf Frit Croustillant)',
    'Sandwich banh mi garni d''œufs frits à l''asiatique, aux bords dorés et croustillants et au jaune coulant. Pâté de volaille, mayonnaise japonaise, pickles de carotte et de daïkon, concombre, coriandre et sauce d''assaisonnement sur une baguette grillée.',
    $instr$["Chauffer l'huile dans une poêle à feu moyen-vif jusqu'à ce qu'elle soit chaude et brillante.",
"Casser un œuf au centre de la poêle chaude (cuire les œufs un par un).",
"Saler l'œuf d'une pincée de sel.",
"Le frire jusqu'à ce que le blanc forme des bords dorés et croustillants, en gardant le jaune coulant.",
"Retirer l'œuf et le laisser reposer sur du papier absorbant. Répéter avec les autres œufs.",
"Couper les pains en deux dans la longueur en gardant une charnière.",
"Faire griller les pains 5 minutes au four à 200°C, puis retirer un peu de mie si elle est dense.",
"Tartiner un côté de chaque pain de 1 c. à soupe de mayonnaise japonaise et l'autre d'environ 60 g de pâté.",
"Placer 2 œufs frits côté mayonnaise, poivrer et arroser de sauce d'assaisonnement.",
"Garnir de concombre, de pickles de carotte et de daïkon et de coriandre fraîche ; servir aussitôt."]
$instr$,
    5, 10, 2, 2,
    'Vietnamienne', 'breakfast',
    ARRAY['banh mi','œuf frit','sandwich vietnamien','pâté','rapide','petit-déjeuner','street-food'],
    'manual',
    'https://cheftu.com/recipelibrary/banhmitrung',
    'https://i.imgur.com/oE05IQP.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile végétale',             4,   'c. à soupe', true,  1,  'pour la friture'),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  2,  'gros, 2 par sandwich'),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  3,  'kasher'),
    (v_recipe_id, 'poivre noir',                0.125,'c. à café', true,  4,  'moulu'),
    (v_recipe_id, 'pickles carotte-daïkon',     60,  'g',          true,  5,  'đồ chua, égouttés'),
    (v_recipe_id, 'coriandre fraîche',          12,  'brin',       true,  6,  NULL),
    (v_recipe_id, 'mayonnaise japonaise',       2,   'c. à soupe', true,  7,  'type Kewpie'),
    (v_recipe_id, 'sauce assaisonnement',       1,   'c. à soupe', true,  8,  'type Maggi'),
    (v_recipe_id, 'concombre',                  4,   'tranche',    true,  9,  'type libanais, tranches de 0,6 cm'),
    (v_recipe_id, 'pâté de foie de volaille',   115, 'g',          true,  10, 'ou autre pâté de volaille'),
    (v_recipe_id, 'pain banh mi',               2,   'unité',      true,  11, 'ou petite baguette');

END $$;
