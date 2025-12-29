-- Add database functions for transactional operations
-- These functions ensure ACID guarantees for complex multi-step operations

-- Function to consume inventory item with transaction safety
CREATE OR REPLACE FUNCTION consume_inventory_item(
  p_item_id uuid,
  p_user_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_quantity numeric;
  v_new_quantity numeric;
  v_item jsonb;
BEGIN
  -- Lock the row for update (prevents race conditions)
  SELECT quantity INTO v_current_quantity
  FROM inventory
  WHERE id = p_item_id AND user_id = p_user_id
  FOR UPDATE;

  -- Check if item exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  -- Calculate new quantity
  v_new_quantity := v_current_quantity - p_amount;

  -- Check if sufficient quantity
  IF v_new_quantity < 0 THEN
    RAISE EXCEPTION 'Insufficient quantity. Current: %, Requested: %', v_current_quantity, p_amount;
  END IF;

  -- If quantity reaches 0, delete the item
  IF v_new_quantity = 0 THEN
    DELETE FROM inventory
    WHERE id = p_item_id AND user_id = p_user_id
    RETURNING to_jsonb(inventory.*) INTO v_item;

    -- Return deleted item with quantity 0
    v_item := jsonb_set(v_item, '{quantity}', '0'::jsonb);
    RETURN v_item;
  ELSE
    -- Otherwise, update the quantity
    UPDATE inventory
    SET
      quantity = v_new_quantity,
      updated_at = timezone('utc'::text, now())
    WHERE id = p_item_id AND user_id = p_user_id
    RETURNING to_jsonb(inventory.*) INTO v_item;

    RETURN v_item;
  END IF;
END;
$$;

-- Function to transfer inventory between items (atomic)
CREATE OR REPLACE FUNCTION transfer_inventory(
  p_from_item_id uuid,
  p_to_item_id uuid,
  p_user_id uuid,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_quantity numeric;
  v_to_quantity numeric;
  v_result jsonb;
BEGIN
  -- Lock both rows (order by ID to prevent deadlocks)
  IF p_from_item_id < p_to_item_id THEN
    SELECT quantity INTO v_from_quantity FROM inventory WHERE id = p_from_item_id AND user_id = p_user_id FOR UPDATE;
    SELECT quantity INTO v_to_quantity FROM inventory WHERE id = p_to_item_id AND user_id = p_user_id FOR UPDATE;
  ELSE
    SELECT quantity INTO v_to_quantity FROM inventory WHERE id = p_to_item_id AND user_id = p_user_id FOR UPDATE;
    SELECT quantity INTO v_from_quantity FROM inventory WHERE id = p_from_item_id AND user_id = p_user_id FOR UPDATE;
  END IF;

  -- Validate
  IF v_from_quantity IS NULL OR v_to_quantity IS NULL THEN
    RAISE EXCEPTION 'One or both items not found';
  END IF;

  IF v_from_quantity < p_amount THEN
    RAISE EXCEPTION 'Insufficient quantity in source item';
  END IF;

  -- Perform transfer
  UPDATE inventory SET quantity = quantity - p_amount, updated_at = now() WHERE id = p_from_item_id;
  UPDATE inventory SET quantity = quantity + p_amount, updated_at = now() WHERE id = p_to_item_id;

  -- Return success with updated quantities
  SELECT jsonb_build_object(
    'success', true,
    'from_item_id', p_from_item_id,
    'to_item_id', p_to_item_id,
    'amount', p_amount
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to batch create shopping items from recipe (atomic)
CREATE OR REPLACE FUNCTION create_shopping_from_recipe(
  p_user_id uuid,
  p_list_id uuid,
  p_ingredients jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ingredient jsonb;
  v_created_count integer := 0;
  v_created_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  -- Validate list belongs to user
  IF NOT EXISTS (SELECT 1 FROM shopping_list WHERE id = p_list_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'Shopping list not found or access denied';
  END IF;

  -- Insert all ingredients in one transaction
  FOR v_ingredient IN SELECT * FROM jsonb_array_elements(p_ingredients)
  LOOP
    INSERT INTO shopping_list (
      user_id,
      product_id,
      quantity,
      is_purchased,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      (v_ingredient->>'product_id')::uuid,
      (v_ingredient->>'quantity')::numeric,
      false,
      now(),
      now()
    )
    RETURNING id INTO v_created_ids[v_created_count + 1];

    v_created_count := v_created_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created_count', v_created_count,
    'created_ids', v_created_ids
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION consume_inventory_item TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_inventory TO authenticated;
GRANT EXECUTE ON FUNCTION create_shopping_from_recipe TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION consume_inventory_item IS 'Atomically consume inventory with quantity validation and auto-delete on zero';
COMMENT ON FUNCTION transfer_inventory IS 'Atomically transfer quantity between two inventory items';
COMMENT ON FUNCTION create_shopping_from_recipe IS 'Atomically create multiple shopping items from recipe ingredients';
