-- =====================================================================
-- Seed: 1 Japanese fusion recipe from mizkanchef.com (2026-05-21)
--
-- Source fetched 2026-05-21 :
--   1. https://www.mizkanchef.com/en/chef-recipes/glazed-chicken-thigh-black-sesame-green-onions/
--
-- Run :
--   psql "$SUPABASE_DB_URL" -f supabase/seeds/2026-05-21-add-mizkanchef.sql
-- =====================================================================

DO $$
DECLARE
  v_user_id     UUID := 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6';
  v_recipe_id   UUID;
  v_recipe_names TEXT[] := ARRAY[
    'Cuisse de Poulet Glacée Sésame Noir & Oignons Verts'
  ];
BEGIN

  -- ---------- cleanup pour idempotence ----------
  DELETE FROM public.recipes
   WHERE user_id = v_user_id
     AND name = ANY(v_recipe_names);

  -- =====================================================================
  -- 1. Cuisse de Poulet Glacée Sésame Noir & Oignons Verts
  -- =====================================================================
  INSERT INTO public.recipes (
    user_id, name, description, instructions,
    prep_time, cook_time, servings, difficulty,
    cuisine_category, meal_type, tags,
    source_type, source_url, image_url
  ) VALUES (
    v_user_id,
    'Cuisse de Poulet Glacée Sésame Noir & Oignons Verts',
    'Brochettes de cuisses de poulet désossées, grillées et glacées d''un caramel umami au vinaigre de riz, au gingembre et à l''assaisonnement sucré japonais. Garnies de sésame noir et d''oignons verts.',
    $instr$["Glaçage : faire mijoter 30 minutes les oignons nouveaux, le gingembre, le bouillon de poulet, le sucre roux, le vinaigre de riz et l'assaisonnement sucré japonais, puis filtrer.",
"Ajouter la sauce soja blanche et faire réduire rapidement jusqu'à obtenir la texture d'un glaçage.",
"Désosser les cuisses, les aplatir, puis retirer la peau et l'excédent de gras.",
"Séparer les 4 principaux groupes musculaires et les enfiler sur 2 brochettes parallèles par portion.",
"Badigeonner d'huile de colza et assaisonner de sel de mer.",
"Griller lentement sur des braises incandescentes en tournant régulièrement.",
"Badigeonner de glaçage à intervalles réguliers jusqu'à obtenir une croûte brillante.",
"Cuire 5 à 10 minutes au total, jusqu'à 68°C à cœur (vérifier avec une sonde).",
"Retirer du gril et badigeonner une dernière fois de glaçage.",
"Parsemer de graines de sésame noir grillées et d'oignons verts finement émincés."]
$instr$,
    40, 45, 6, 2,
    'Japonaise', 'dinner',
    ARRAY['poulet grillé','sésame noir','japonais','umami','brochettes','vinaigre-shiragiku','barbecue'],
    'manual',
    'https://www.mizkanchef.com/en/chef-recipes/glazed-chicken-thigh-black-sesame-green-onions/',
    'https://www.mizkanchef.com/wp-content/uploads/2021/07/MZKN_chicken-image_2000x864.jpg'
  ) RETURNING id INTO v_recipe_id;

  INSERT INTO public.recipe_ingredients (
    recipe_id, ingredient_name, quantity, unit, is_essential, order_index, notes
  ) VALUES
    (v_recipe_id, 'cuisses de poulet',          12,  'unité',      true,  1,  'désossées, sans peau, aplaties'),
    (v_recipe_id, 'oignons nouveaux',           150, 'g',          true,  2,  'émincés, pour le glaçage'),
    (v_recipe_id, 'gingembre',                  150, 'g',          true,  3,  'épluché, émincé'),
    (v_recipe_id, 'bouillon de poulet',         125, 'ml',         true,  4,  NULL),
    (v_recipe_id, 'sucre roux',                 230, 'g',          true,  5,  NULL),
    (v_recipe_id, 'vinaigre de riz',            500, 'ml',         true,  6,  'type Shiragiku (Mizkan)'),
    (v_recipe_id, 'assaisonnement sucré japonais', 250, 'ml',      true,  7,  'type Honteri (Mizkan), sans alcool'),
    (v_recipe_id, 'sauce soja blanche',         250, 'ml',         true,  8,  'shiro shoyu'),
    (v_recipe_id, 'graines de sésame noir',     50,  'g',          true,  9,  'grillées'),
    (v_recipe_id, 'oignons verts',              50,  'g',          true,  10, 'tiges vertes, finement émincées'),
    (v_recipe_id, 'huile de colza',             2,   'c. à soupe', true,  11, 'pour badigeonner'),
    (v_recipe_id, 'sel de mer',                 1,   'c. à café',  true,  12, 'au goût');

END $$;
