-- =====================================================================
-- Sprint 3 — Make imported recipe ingredients link to inventory products
--
-- Why this exists :
--   The original public.save_imported_recipe RPC inserted
--   recipe_ingredients without inventory_product_id, so 100% of
--   imported recipes were silently filtered out of
--   find_cookable_recipes (which dropped any recipe with an unlinked
--   essential). Sprint 1 already softened the read path. This sprint
--   fixes the data path so future imports populate the FK and a
--   one-shot backfill repairs the historical rows.
--
-- Strategy :
--   - For every ingredient_name, run a pg_trgm similarity match against
--     products.normalized_name (already indexed via gin_trgm_ops in
--     20260508120000_products_augmentation_assistant.sql).
--   - Threshold 0.5 : the find_cookable_recipes default tolerance is
--     now 3 missing+unknown, so we accept a slightly looser link than
--     the ProductResolver's 0.7 — the read layer absorbs noise.
--   - Tie-break by length asc so "tomate" wins over "tomate cerise"
--     when both are above threshold (matches the existing fuzzy RPC).
--
-- Idempotent : RPC uses CREATE OR REPLACE ; backfill targets only
-- rows where inventory_product_id IS NULL.
-- =====================================================================

-- Shared expression — kept inline (see SECURITY note below) so it runs
-- under SECURITY INVOKER without escalating privileges.

CREATE OR REPLACE FUNCTION public.save_imported_recipe(
  p_import_id   UUID,
  p_recipe      JSONB,
  p_ingredients JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID := auth.uid();
  v_recipe_id UUID;
  v_tags      TEXT[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_import_id IS NULL THEN
    RAISE EXCEPTION 'p_import_id is required';
  END IF;
  IF p_recipe IS NULL OR jsonb_typeof(p_recipe) <> 'object' THEN
    RAISE EXCEPTION 'p_recipe must be a JSON object';
  END IF;

  SELECT id INTO v_recipe_id
    FROM public.recipes
   WHERE user_id = v_user_id AND import_id = p_import_id
   LIMIT 1;
  IF v_recipe_id IS NOT NULL THEN
    RETURN v_recipe_id;
  END IF;

  IF jsonb_typeof(p_recipe->'tags') = 'array' THEN
    v_tags := ARRAY(SELECT jsonb_array_elements_text(p_recipe->'tags'));
  ELSE
    v_tags := ARRAY[]::TEXT[];
  END IF;

  INSERT INTO public.recipes (
    user_id,
    name,
    instructions,
    description,
    prep_time,
    cook_time,
    rest_time,
    servings,
    difficulty,
    cuisine_category,
    meal_type,
    tags,
    image_url,
    source_type,
    source_platform,
    source_url,
    source_metadata,
    import_id
  )
  VALUES (
    v_user_id,
    COALESCE(NULLIF(TRIM(p_recipe->>'name'), ''), 'Recette importee'),
    COALESCE(p_recipe->>'instructions_text', ''),
    p_recipe->>'description',
    NULLIF((p_recipe->>'prep_time'), '')::INTEGER,
    NULLIF((p_recipe->>'cook_time'), '')::INTEGER,
    NULLIF((p_recipe->>'rest_time'), '')::INTEGER,
    NULLIF((p_recipe->>'servings'), '')::INTEGER,
    NULLIF((p_recipe->>'difficulty'), '')::INTEGER,
    p_recipe->>'cuisine_category',
    p_recipe->>'meal_type',
    v_tags,
    p_recipe->>'image_url',
    COALESCE(p_recipe->>'source_platform', 'manual'),
    p_recipe->>'source_url',
    COALESCE(p_recipe->'source_metadata', '{}'::jsonb),
    p_import_id
  )
  RETURNING id INTO v_recipe_id;

  IF p_ingredients IS NOT NULL
     AND jsonb_typeof(p_ingredients) = 'array'
     AND jsonb_array_length(p_ingredients) > 0 THEN
    INSERT INTO public.recipe_ingredients (
      recipe_id,
      ingredient_name,
      quantity,
      unit,
      notes,
      is_essential,
      order_index,
      inventory_product_id
    )
    SELECT
      v_recipe_id,
      COALESCE(NULLIF(TRIM(ing->>'name'), ''), 'ingredient'),
      NULLIF((ing->>'quantity'), '')::NUMERIC,
      ing->>'unit',
      ing->>'notes',
      COALESCE((ing->>'is_essential')::BOOLEAN, TRUE),
      (idx)::INTEGER,
      -- Fuzzy-match the ingredient name against products. The lookup
      -- runs as the calling user (SECURITY INVOKER) ; products is
      -- world-readable to authenticated users so this is fine.
      (
        SELECT p.id
          FROM public.products p
         WHERE p.normalized_name % lower(unaccent(trim(ing->>'name')))
           AND similarity(p.normalized_name, lower(unaccent(trim(ing->>'name')))) >= 0.5
         ORDER BY similarity(p.normalized_name, lower(unaccent(trim(ing->>'name')))) DESC,
                  length(p.normalized_name) ASC
         LIMIT 1
      )
    FROM jsonb_array_elements(p_ingredients) WITH ORDINALITY AS arr(ing, idx);
  END IF;

  RETURN v_recipe_id;
END
$$;

GRANT EXECUTE ON FUNCTION public.save_imported_recipe(UUID, JSONB, JSONB)
  TO authenticated;

-- =====================================================================
-- Backfill : link unlinked existing recipe_ingredients.
--
-- Runs at migration time as the migration role (bypasses RLS for the
-- products lookup). Per-user RLS on recipe_ingredients is preserved
-- thereafter — this is a one-shot data fix.
-- =====================================================================

WITH match AS (
  SELECT
    ri.id AS ri_id,
    (
      SELECT p.id
        FROM public.products p
       WHERE p.normalized_name % lower(unaccent(trim(ri.ingredient_name)))
         AND similarity(p.normalized_name, lower(unaccent(trim(ri.ingredient_name)))) >= 0.5
       ORDER BY similarity(p.normalized_name, lower(unaccent(trim(ri.ingredient_name)))) DESC,
                length(p.normalized_name) ASC
       LIMIT 1
    ) AS p_id
   FROM public.recipe_ingredients ri
  WHERE ri.inventory_product_id IS NULL
    AND ri.ingredient_name IS NOT NULL
    AND length(trim(ri.ingredient_name)) > 0
)
UPDATE public.recipe_ingredients ri
   SET inventory_product_id = match.p_id
  FROM match
 WHERE ri.id = match.ri_id
   AND match.p_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
