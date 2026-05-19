-- =====================================================================
-- Phase 3 J6 — Atomic product merge RPC.
--
-- Used by scripts/dedup-product-catalog.ts to fold semantically
-- duplicate products into a single canonical row. Repoints every FK
-- that references the duplicate, then merges any inventory /
-- shopping_list rows that end up with the same (user_id, product_id)
-- by summing their quantities, then DELETEs the duplicate.
--
-- Everything happens inside a single PL/pgSQL block so a failure
-- mid-way rolls back the whole merge — no half-merged state.
--
-- Returns a JSON summary so the caller can log what happened :
--   { canonical, duplicate, inventory_repointed, inventory_merged,
--     shopping_repointed, shopping_merged, recipes_repointed,
--     duplicate_deleted }
--
-- SECURITY DEFINER because the orchestration script runs with the
-- service role; we don't want auth.uid()-checks getting in the way of
-- repointing rows across users. The script is the only intended caller
-- and is guarded by SUPABASE_SERVICE_KEY env access.
--
-- Idempotent : re-calling with the same pair after the duplicate is
-- already gone returns { duplicate_deleted: false, … all zeros }.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.assistant_merge_product_into(
  p_canonical UUID,
  p_duplicate UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inventory_repointed INTEGER := 0;
  v_inventory_merged    INTEGER := 0;
  v_shopping_repointed  INTEGER := 0;
  v_shopping_merged     INTEGER := 0;
  v_recipes_repointed   INTEGER := 0;
  v_duplicate_existed   BOOLEAN := FALSE;
BEGIN
  IF p_canonical IS NULL OR p_duplicate IS NULL THEN
    RAISE EXCEPTION 'assistant_merge_product_into: NULL ids not allowed';
  END IF;
  IF p_canonical = p_duplicate THEN
    RAISE EXCEPTION 'assistant_merge_product_into: canonical = duplicate';
  END IF;

  -- Short-circuit if duplicate has already been merged.
  SELECT EXISTS(SELECT 1 FROM public.products WHERE id = p_duplicate)
    INTO v_duplicate_existed;
  IF NOT v_duplicate_existed THEN
    RETURN jsonb_build_object(
      'canonical', p_canonical,
      'duplicate', p_duplicate,
      'inventory_repointed', 0,
      'inventory_merged', 0,
      'shopping_repointed', 0,
      'shopping_merged', 0,
      'recipes_repointed', 0,
      'duplicate_deleted', false
    );
  END IF;

  -- ---- Repoint inventory FK ----------------------------------------
  WITH updated AS (
    UPDATE public.inventory
       SET product_id = p_canonical
     WHERE product_id = p_duplicate
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_inventory_repointed FROM updated;

  -- ---- Merge inventory rows that now collide on (user_id, product_id)
  -- For each (user_id, product_id=canonical) where the user has > 1
  -- row : sum quantities into the oldest row, keep the earliest
  -- non-NULL expiry_date, delete the others.
  WITH grouped AS (
    SELECT
      user_id,
      product_id,
      MIN(id)            AS keep_id,
      SUM(quantity)      AS total_qty,
      MIN(expiry_date)   AS earliest_expiry,
      COUNT(*)           AS row_count
    FROM public.inventory
    WHERE product_id = p_canonical
    GROUP BY user_id, product_id
    HAVING COUNT(*) > 1
  ),
  updates AS (
    UPDATE public.inventory inv
       SET quantity     = g.total_qty,
           expiry_date  = g.earliest_expiry
      FROM grouped g
     WHERE inv.id = g.keep_id
       AND inv.product_id = g.product_id
       AND inv.user_id    = g.user_id
     RETURNING 1
  ),
  deletes AS (
    DELETE FROM public.inventory inv
     USING grouped g
     WHERE inv.product_id = p_canonical
       AND inv.user_id    = g.user_id
       AND inv.id        <> g.keep_id
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_inventory_merged FROM deletes;

  -- ---- Repoint shopping_list FK ------------------------------------
  WITH updated AS (
    UPDATE public.shopping_list
       SET product_id = p_canonical
     WHERE product_id = p_duplicate
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_shopping_repointed FROM updated;

  -- Merge shopping rows that now collide (same logic as inventory but
  -- also keys on is_purchased so we don't fold purchased into pending).
  WITH grouped AS (
    SELECT
      user_id,
      product_id,
      is_purchased,
      MIN(id)        AS keep_id,
      SUM(quantity)  AS total_qty,
      COUNT(*)       AS row_count
    FROM public.shopping_list
    WHERE product_id = p_canonical
    GROUP BY user_id, product_id, is_purchased
    HAVING COUNT(*) > 1
  ),
  updates AS (
    UPDATE public.shopping_list sl
       SET quantity = g.total_qty
      FROM grouped g
     WHERE sl.id = g.keep_id
       AND sl.product_id   = g.product_id
       AND sl.user_id      = g.user_id
       AND sl.is_purchased = g.is_purchased
     RETURNING 1
  ),
  deletes AS (
    DELETE FROM public.shopping_list sl
     USING grouped g
     WHERE sl.product_id   = p_canonical
       AND sl.user_id      = g.user_id
       AND sl.is_purchased = g.is_purchased
       AND sl.id          <> g.keep_id
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_shopping_merged FROM deletes;

  -- ---- Repoint recipe_ingredients.inventory_product_id -------------
  WITH updated AS (
    UPDATE public.recipe_ingredients
       SET inventory_product_id = p_canonical
     WHERE inventory_product_id = p_duplicate
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_recipes_repointed FROM updated;

  -- ---- Finally drop the duplicate product --------------------------
  DELETE FROM public.products WHERE id = p_duplicate;

  RETURN jsonb_build_object(
    'canonical', p_canonical,
    'duplicate', p_duplicate,
    'inventory_repointed', v_inventory_repointed,
    'inventory_merged', v_inventory_merged,
    'shopping_repointed', v_shopping_repointed,
    'shopping_merged', v_shopping_merged,
    'recipes_repointed', v_recipes_repointed,
    'duplicate_deleted', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assistant_merge_product_into(UUID, UUID) FROM PUBLIC;

-- service_role only — the orchestration script runs with the service
-- key. Regular users must NOT be able to merge products on their own.
GRANT EXECUTE ON FUNCTION public.assistant_merge_product_into(UUID, UUID)
  TO service_role;

NOTIFY pgrst, 'reload schema';
