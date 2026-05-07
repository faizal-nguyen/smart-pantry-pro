-- =====================================================================
-- PRP-220.16: RPC public.save_imported_recipe
--
-- Atomically persists a validated `ImportedRecipeDraft` as a row in
-- `public.recipes` plus its rows in `public.recipe_ingredients`.
--
-- Why an RPC instead of two client-side inserts:
--   - Atomicity: a failed ingredient insert rolls back the recipe
--     row (no orphan recipes).
--   - Idempotence: a partial unique index on `recipes.import_id`
--     guarantees one recipe per import; if we ran the orchestration
--     in the client we'd race against ourselves on retries.
--
-- Security model: SECURITY INVOKER + auth.uid(). Existing RLS on
-- `recipes` and `recipe_ingredients` continues to apply, so this RPC
-- is safe to expose to the `authenticated` role.
--
-- Schema reminders (existing repo state):
--   - recipes.name             NOT NULL TEXT      ← draft.title
--   - recipes.instructions     NOT NULL TEXT      ← JSON of draft.instructions
--   - recipe_ingredients.ingredient_name NOT NULL ← ing.name
--   - recipe_ingredients.is_essential DEFAULT TRUE
--   - recipe_ingredients.order_index INTEGER      ← idx
-- =====================================================================

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

  -- Idempotence: already saved -> return the existing recipe id.
  -- The user's own RLS policy is what restricts the SELECT, so a user
  -- can never collide with another user's import_id even if guessed.
  SELECT id INTO v_recipe_id
    FROM public.recipes
   WHERE user_id = v_user_id AND import_id = p_import_id
   LIMIT 1;
  IF v_recipe_id IS NOT NULL THEN
    RETURN v_recipe_id;
  END IF;

  -- Postgres TEXT[] from a JSON string array. Defaults to {} if the
  -- caller omits / passes null.
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
    -- source_type stays as a free-text legacy column; mirror the
    -- platform when present so old reads still work.
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
      order_index
    )
    SELECT
      v_recipe_id,
      COALESCE(NULLIF(TRIM(ing->>'name'), ''), 'ingredient'),
      NULLIF((ing->>'quantity'), '')::NUMERIC,
      ing->>'unit',
      ing->>'notes',
      COALESCE((ing->>'is_essential')::BOOLEAN, TRUE),
      (idx)::INTEGER
    FROM jsonb_array_elements(p_ingredients) WITH ORDINALITY AS arr(ing, idx);
  END IF;

  RETURN v_recipe_id;
END
$$;

-- Expose to authenticated users only. The function uses auth.uid()
-- and SECURITY INVOKER, so RLS enforcement is preserved.
GRANT EXECUTE ON FUNCTION public.save_imported_recipe(UUID, JSONB, JSONB)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
