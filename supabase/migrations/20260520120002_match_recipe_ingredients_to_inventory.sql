-- =====================================================================
-- Phase 3 J5 — Recipe-to-inventory matching RPC.
--
-- Replaces the frontend Levenshtein loop in useRecipeInventoryAnalysis
-- with a single server-side call that handles:
--   1. Direct match : recipe_ingredients.inventory_product_id JOIN
--      inventory.product_id (the FK populated at import time by
--      ProductResolver).
--   2. Semantic fallback : when the direct JOIN misses, compare the
--      product embedding to the user's inventory products' embeddings
--      via cosine distance. Picks the best ≥ p_min_score (default 0.85).
--
-- The caller (frontend hook) gets one row per recipe_ingredients with
-- the best-match inventory row (or NULL columns if nothing matches).
--
-- Security :
--   - SECURITY INVOKER so the existing RLS on inventory/products keeps
--     the user scoped to their own rows. The caller must already have
--     SELECT rights on the recipe.
--   - GRANT EXECUTE to authenticated.
--
-- Idempotent (CREATE OR REPLACE).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.assistant_match_recipe_ingredients_to_inventory(
  p_recipe_id UUID,
  p_user_id UUID,
  p_min_score REAL DEFAULT 0.85
)
RETURNS TABLE (
  recipe_ingredient_id UUID,
  ingredient_name TEXT,
  ingredient_quantity NUMERIC,
  ingredient_unit TEXT,
  ingredient_product_id UUID,
  inventory_id UUID,
  inventory_product_id UUID,
  inventory_product_name TEXT,
  inventory_quantity NUMERIC,
  inventory_unit TEXT,
  match_kind TEXT,
  match_score REAL
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH ri AS (
    -- The recipe_ingredient rows + the embedding of the canonical
    -- product they link to (when the FK is set).
    SELECT
      ri.id                          AS recipe_ingredient_id,
      ri.ingredient_name             AS ingredient_name,
      ri.quantity                    AS ingredient_quantity,
      ri.unit                        AS ingredient_unit,
      ri.inventory_product_id        AS ingredient_product_id,
      p.embedding                    AS ingredient_product_embedding
    FROM public.recipe_ingredients ri
    LEFT JOIN public.products p
      ON p.id = ri.inventory_product_id
    WHERE ri.recipe_id = p_recipe_id
  ),
  direct_match AS (
    -- Phase 1: a direct FK JOIN with the user's inventory. The fastest
    -- and most reliable path — works whenever ProductResolver has
    -- already mapped the recipe ingredient and the user happens to
    -- have that exact product in stock.
    SELECT
      ri.recipe_ingredient_id,
      ri.ingredient_name,
      ri.ingredient_quantity,
      ri.ingredient_unit,
      ri.ingredient_product_id,
      inv.id                  AS inventory_id,
      inv.product_id          AS inventory_product_id,
      ipr.name                AS inventory_product_name,
      inv.quantity            AS inventory_quantity,
      pri_unit.unit_text      AS inventory_unit,
      'direct'::TEXT          AS match_kind,
      1.0::REAL               AS match_score
    FROM ri
    JOIN public.inventory inv
      ON inv.product_id = ri.ingredient_product_id
     AND inv.user_id    = p_user_id
    JOIN public.products ipr
      ON ipr.id = inv.product_id
    LEFT JOIN LATERAL (SELECT NULL::TEXT AS unit_text) pri_unit ON true
    WHERE ri.ingredient_product_id IS NOT NULL
  ),
  semantic_match AS (
    -- Phase 2: for ingredients that didn't get a direct hit, fall back
    -- to cosine similarity on the products embedding. Picks at most
    -- one inventory row per recipe ingredient — the closest.
    SELECT DISTINCT ON (ri.recipe_ingredient_id)
      ri.recipe_ingredient_id,
      ri.ingredient_name,
      ri.ingredient_quantity,
      ri.ingredient_unit,
      ri.ingredient_product_id,
      inv.id                                              AS inventory_id,
      inv.product_id                                      AS inventory_product_id,
      ipr.name                                            AS inventory_product_name,
      inv.quantity                                        AS inventory_quantity,
      NULL::TEXT                                          AS inventory_unit,
      'semantic'::TEXT                                    AS match_kind,
      (1 - (ipr.embedding <=> ri.ingredient_product_embedding))::REAL AS match_score
    FROM ri
    JOIN public.inventory inv
      ON inv.user_id = p_user_id
    JOIN public.products ipr
      ON ipr.id = inv.product_id
    WHERE ri.ingredient_product_embedding IS NOT NULL
      AND ipr.embedding IS NOT NULL
      AND ri.recipe_ingredient_id NOT IN (SELECT recipe_ingredient_id FROM direct_match)
      AND (1 - (ipr.embedding <=> ri.ingredient_product_embedding)) >= GREATEST(coalesce(p_min_score, 0.85), 0.5)
    ORDER BY
      ri.recipe_ingredient_id,
      ipr.embedding <=> ri.ingredient_product_embedding ASC
  ),
  missing AS (
    -- Phase 3: recipe ingredients with NO match at all. Returned with
    -- NULL inventory fields so the frontend can show "missing" badges
    -- without making a second roundtrip.
    SELECT
      ri.recipe_ingredient_id,
      ri.ingredient_name,
      ri.ingredient_quantity,
      ri.ingredient_unit,
      ri.ingredient_product_id,
      NULL::UUID    AS inventory_id,
      NULL::UUID    AS inventory_product_id,
      NULL::TEXT    AS inventory_product_name,
      NULL::NUMERIC AS inventory_quantity,
      NULL::TEXT    AS inventory_unit,
      'missing'::TEXT AS match_kind,
      0.0::REAL     AS match_score
    FROM ri
    WHERE ri.recipe_ingredient_id NOT IN (SELECT recipe_ingredient_id FROM direct_match)
      AND ri.recipe_ingredient_id NOT IN (SELECT recipe_ingredient_id FROM semantic_match)
  )
  SELECT * FROM direct_match
  UNION ALL
  SELECT * FROM semantic_match
  UNION ALL
  SELECT * FROM missing;
$$;

GRANT EXECUTE ON FUNCTION public.assistant_match_recipe_ingredients_to_inventory(UUID, UUID, REAL)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
