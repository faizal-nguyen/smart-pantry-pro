-- =====================================================================
-- Phase 3 J6 hotfix — fix MIN(uuid) in assistant_merge_product_into.
--
-- Postgres has no built-in min() / max() aggregate for the uuid type,
-- so the original RPC failed at runtime with
-- "function min(uuid) does not exist" the first time it found a
-- collision needing to pick a keep_id.
--
-- Replaces the two MIN(id) calls (inventory + shopping_list grouping)
-- with `(array_agg(id ORDER BY created_at ASC))[1]` which keeps the
-- oldest row regardless of UUID lexical ordering and works on the
-- uuid type. The rest of the function is unchanged.
--
-- Idempotent (CREATE OR REPLACE).
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

  -- ---- Merge inventory rows that now collide ----------------------
  -- Uses array_agg + ORDER BY to pick the oldest row's id, since
  -- Postgres has no MIN(uuid) aggregate.
  WITH grouped AS (
    SELECT
      user_id,
      product_id,
      (array_agg(id ORDER BY created_at ASC))[1] AS keep_id,
      SUM(quantity)                              AS total_qty,
      MIN(expiry_date)                           AS earliest_expiry,
      COUNT(*)                                   AS row_count
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

  WITH grouped AS (
    SELECT
      user_id,
      product_id,
      is_purchased,
      (array_agg(id ORDER BY created_at ASC))[1] AS keep_id,
      SUM(quantity)                              AS total_qty,
      COUNT(*)                                   AS row_count
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

  -- ---- Repoint recipe_ingredients FK ------------------------------
  WITH updated AS (
    UPDATE public.recipe_ingredients
       SET inventory_product_id = p_canonical
     WHERE inventory_product_id = p_duplicate
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_recipes_repointed FROM updated;

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

NOTIFY pgrst, 'reload schema';
