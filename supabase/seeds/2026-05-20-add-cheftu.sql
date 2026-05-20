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
    'Sandwich banh mi garni d''un œuf frit à l''asiatique aux bords dorés croustillants et jaune coulant. Pâté de campagne, mayo Kewpie, cornichons banh mi, concombre, coriandre et sauce Maggi sur baguette grillée.',
    $instr$["Chauffer la poêle à feu moyen-vif jusqu'à ce que l'huile brille légèrement.",
"Casser un œuf au centre de la poêle chaude.",
"Assaisonner l'œuf d'une pincée de sel.",
"Frire jusqu'à formation de bords dorés croustillants autour du blanc, jaune coulant.",
"Retirer l'œuf et le laisser reposer sur papier absorbant.",
"Couper le pain banh mi en deux dans le sens de la longueur en gardant une charnière.",
"Griller le pain 5 minutes à 200°C, puis retirer la mie intérieure si dense.",
"Tartiner 1 c. à soupe de mayo Kewpie d'un côté et 2 oz de pâté de l'autre.",
"Placer l'œuf frit côté mayo, assaisonner de poivre et sauce Maggi.",
"Garnir de concombre, cornichons banh mi et coriandre fraîche ; servir immédiatement."]
$instr$,
    5, 5, 2, 2,
    'Vietnamienne', 'breakfast',
    ARRAY['banh mi','œuf frit','sandwich vietnamien','pâté','rapide','petit-déjeuner','street-food'],
    'manual',
    'https://cheftu.com/recipelibrary/banhmitrung',
    'https://i.imgur.com/oE05IQP.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'huile de cuisson',           4,   'c. à soupe', true,  1,  'pour la friture'),
    (v_recipe_id, 'œufs',                       4,   'unité',      true,  2,  'gros'),
    (v_recipe_id, 'sel',                        0.25,'c. à café',  true,  3,  'casher'),
    (v_recipe_id, 'poivre noir',                0.125,'c. à café', true,  4,  'moulu'),
    (v_recipe_id, 'cornichons banh mi',         60,  'ml',         true,  5,  'đồ chua, carotte-daikon marinés'),
    (v_recipe_id, 'coriandre fraîche',          12,  'brin',       true,  6,  'garniture'),
    (v_recipe_id, 'mayonnaise Kewpie',          2,   'c. à soupe', true,  7,  'japonaise'),
    (v_recipe_id, 'sauce Maggi',                1,   'c. à soupe', true,  8,  NULL),
    (v_recipe_id, 'concombre persan',           4,   'tranche',    true,  9,  '0,6 cm d''épaisseur'),
    (v_recipe_id, 'pâté de campagne',           115, 'g',          true,  10, 'bio, environ 4 oz'),
    (v_recipe_id, 'pain banh mi',               2,   'unité',      true,  11, 'ou baguette italienne');

END $$;
