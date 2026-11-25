-- V11-01 E5a: receipts and purchase prices (PRP V11-01, section 7; decisions D10, D11, D13, D14).
--
-- * receipt_scans keeps what a receipt photo was read as, never the photo (D10): written by the API
--   (service role: select and insert only) with the user of the session, readable by its owner only.
--   A scan is read, failed (no line kept, the model receipt kept for its cost) or applied once. Read
--   and failed scans are purged 7 days after they were read (an undone scan is read again); applied
--   ones stay as the history.
-- * purchase_prices is the owner's own price history (D11), written only by reconcile_receipt, in
--   its transaction; products and product_prices are not touched. latest_purchase_prices reads the
--   last known price per product.
-- * reconcile_receipt (capacity 7) applies a reviewed scan once: each line names a row of the list at
--   its version (checked at the receipt's quantity; a smaller quantity leaves the remainder to buy on
--   an unchecked row, D14; a row already checked by hand takes the receipt's quantity, no remainder)
--   or is a purchase the list did not hold (a bought row, product resolved by name as shopping_add
--   does, D13). Lines carry the reviewed values, not the read ones: the owner corrects their own scan.
--   Every row change is journaled in shopping_movements: undo_stock restores the list, removes the
--   prices and gives the scan back to apply again.
-- * purchase_prices.product_id restricts deletes: assistant_merge_product_into (maintenance, service
--   role) fails without loss on a product that has prices, as it does for other unknown references.
-- * export_user_data lists both tables; the hourly deletion takes them (they carry user_id).
-- The command function starts from the exact body of 20261126090000_v11_update_menu.sql.
BEGIN;

CREATE TABLE IF NOT EXISTS public.receipt_scans(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state text NOT NULL CHECK (state IN ('read','failed','applied')),
  store text CHECK (length(store) BETWEEN 1 AND 80),
  purchased_on date,
  total numeric CHECK (total>=0 AND total<=100000),
  currency text CHECK (currency ~ '^[A-Z]{3}$'),
  lines jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(lines)='array' AND jsonb_array_length(lines)<=120 AND octet_length(lines::text)<=200000),
  -- The history counts lines without reading them.
  line_count integer GENERATED ALWAYS AS (jsonb_array_length(lines)) STORED,
  failure text CHECK (failure IN ('RECEIPT_UNREADABLE','RECEIPT_NO_FOOD','RECEIPT_TOO_LONG','RECEIPT_READ_FAILED')),
  model_receipt jsonb CHECK (model_receipt IS NULL OR (jsonb_typeof(model_receipt)='object' AND octet_length(model_receipt::text)<=20000)),
  applied_command_id uuid,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Since when the scan waits to be applied: its reading, or the undo that gave it back.
  read_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT receipt_scans_state CHECK (
    (state='read' AND failure IS NULL AND applied_command_id IS NULL AND applied_at IS NULL AND jsonb_array_length(lines)>0)
    OR (state='failed' AND failure IS NOT NULL AND applied_command_id IS NULL AND applied_at IS NULL AND jsonb_array_length(lines)=0)
    OR (state='applied' AND failure IS NULL AND applied_command_id IS NOT NULL AND applied_at IS NOT NULL AND jsonb_array_length(lines)>0))
);
CREATE INDEX IF NOT EXISTS receipt_scans_user_created_idx ON public.receipt_scans(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS receipt_scans_applied_idx ON public.receipt_scans(user_id,store,purchased_on,total) WHERE state='applied';
ALTER TABLE public.receipt_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS receipt_scans_read_own ON public.receipt_scans;
CREATE POLICY receipt_scans_read_own ON public.receipt_scans FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
-- Supabase's default privileges give every role ALL on a new table: each grant is set here.
REVOKE ALL ON public.receipt_scans FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.receipt_scans TO authenticated;
GRANT SELECT,INSERT ON public.receipt_scans TO service_role;

CREATE TABLE IF NOT EXISTS public.purchase_prices(
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  command_id uuid NOT NULL,
  receipt_scan_id uuid NOT NULL REFERENCES public.receipt_scans(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric CHECK (quantity>0 AND quantity<=1000000000),
  unit text CHECK (length(unit) BETWEEN 1 AND 40),
  unit_price numeric CHECK (unit_price>=0 AND unit_price<=100000),
  total_price numeric CHECK (total_price>=0 AND total_price<=100000),
  currency text CHECK (currency ~ '^[A-Z]{3}$'),
  purchased_on date,
  store text CHECK (length(store) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_prices_known CHECK (unit_price IS NOT NULL OR total_price IS NOT NULL),
  CONSTRAINT purchase_prices_command_fkey FOREIGN KEY (user_id,command_id)
    REFERENCES public.stock_commands(user_id,command_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS purchase_prices_product_idx ON public.purchase_prices(user_id,product_id,purchased_on DESC NULLS LAST,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS purchase_prices_command_idx ON public.purchase_prices(user_id,command_id);
CREATE INDEX IF NOT EXISTS purchase_prices_scan_idx ON public.purchase_prices(receipt_scan_id);
ALTER TABLE public.purchase_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS purchase_prices_read_own ON public.purchase_prices;
CREATE POLICY purchase_prices_read_own ON public.purchase_prices FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
REVOKE ALL ON public.purchase_prices FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.purchase_prices TO authenticated,service_role;

-- The last known price per product, read under the caller's rights (owner rows only). A receipt that
-- gives only a line total yields a unit price when its quantity is known.
CREATE OR REPLACE VIEW public.latest_purchase_prices WITH (security_invoker=true) AS
SELECT DISTINCT ON (p.user_id,p.product_id) p.user_id,p.product_id,
  coalesce(p.unit_price,CASE WHEN p.quantity>0 AND p.total_price IS NOT NULL THEN round(p.total_price/p.quantity,4) END) AS unit_price,
  p.unit,p.quantity,p.total_price,p.currency,p.purchased_on,p.store,p.receipt_scan_id
FROM public.purchase_prices p
ORDER BY p.user_id,p.product_id,p.purchased_on DESC NULLS LAST,p.created_at DESC,p.id DESC;
REVOKE ALL ON public.latest_purchase_prices FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.latest_purchase_prices TO authenticated;

-- A price of a line: a number from 0 to 100000, or null; anything else is refused.
CREATE OR REPLACE FUNCTION private.receipt_price(p_value jsonb) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_price numeric;
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value)='null' THEN RETURN NULL; END IF;
  IF jsonb_typeof(p_value)<>'number' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  v_price:=(p_value#>>'{}')::numeric;
  IF v_price<0 OR v_price>100000 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  RETURN v_price;
END $$;

-- reconcile_receipt: the scan applied once; returns shopping_changes.
CREATE OR REPLACE FUNCTION private.reconcile_receipt(p_user uuid,p_command uuid,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_scan public.receipt_scans%ROWTYPE; v_lines jsonb:=p_payload->'lines'; v_line jsonb;
  v_row public.shopping_list%ROWTYPE; v_after public.shopping_list%ROWTYPE; v_rest public.shopping_list%ROWTYPE;
  v_changes jsonb:='[]'; v_sid uuid; v_unit text; v_bought numeric; v_left numeric; v_incompatible boolean;
  v_quantity numeric; v_product uuid; v_unit_price numeric; v_total_price numeric; v_count integer;
BEGIN
  IF jsonb_typeof(v_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(v_lines) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  -- Each line: its index in the scan, a name, a quantity, a unit, prices known or null, a target or null.
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) l WHERE jsonb_typeof(l)<>'object' OR l ? 'user_id'
    OR jsonb_typeof(l->'line_index') IS DISTINCT FROM 'number' OR jsonb_typeof(l->'quantity') IS DISTINCT FROM 'number'
    OR jsonb_typeof(l->'name') IS DISTINCT FROM 'string' OR length(btrim(l->>'name')) NOT BETWEEN 1 AND 120
    OR jsonb_typeof(l->'unit') IS DISTINCT FROM 'string' OR length(btrim(l->>'unit')) NOT BETWEEN 1 AND 40
    OR NOT l ? 'target' OR jsonb_typeof(l->'target') NOT IN ('null','object')
    OR (jsonb_typeof(l->'target')='object' AND (jsonb_typeof(l#>'{target,shopping_id}') IS DISTINCT FROM 'string'
      OR jsonb_typeof(l#>'{target,expected_version}') IS DISTINCT FROM 'number'))) THEN
    RAISE EXCEPTION 'INVALID_COMMAND';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) l WHERE (l->>'quantity')::numeric<=0 OR (l->>'quantity')::numeric>1000000000) THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  -- The scan: the account's, read, and applied once even under another command identity.
  SELECT * INTO v_scan FROM public.receipt_scans WHERE id=(p_payload->>'receipt_scan_id')::uuid AND user_id=p_user FOR UPDATE;
  IF NOT FOUND OR v_scan.state='failed' THEN RAISE EXCEPTION 'RECEIPT_NOT_FOUND'; END IF;
  IF v_scan.state='applied' THEN RAISE EXCEPTION 'RECEIPT_ALREADY_APPLIED'; END IF;
  v_count:=jsonb_array_length(v_scan.lines);
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) l WHERE (l->>'line_index')::numeric<>trunc((l->>'line_index')::numeric)
    OR (l->>'line_index')::numeric<0 OR (l->>'line_index')::numeric>=v_count) THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF (SELECT count(DISTINCT (l->>'line_index')::numeric) FROM jsonb_array_elements(v_lines) l)<>jsonb_array_length(v_lines) THEN RAISE EXCEPTION 'DUPLICATE_ITEM'; END IF;

  -- The rows of the list the lines name, in a stable order: the account's, at their version. Several
  -- lines may name one row: their quantities add up in the row's unit. Less than the row leaves the
  -- remainder to buy on an unchecked row (D14).
  FOR v_sid IN SELECT DISTINCT (l#>>'{target,shopping_id}')::uuid FROM jsonb_array_elements(v_lines) l
    WHERE jsonb_typeof(l->'target')='object' ORDER BY 1 LOOP
    SELECT * INTO v_row FROM public.shopping_list WHERE id=v_sid AND user_id=p_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_lines) l WHERE jsonb_typeof(l->'target')='object'
      AND (l#>>'{target,shopping_id}')::uuid=v_sid AND (l#>>'{target,expected_version}')::numeric IS DISTINCT FROM v_row.stock_version) THEN
      RAISE EXCEPTION 'CONFLICT';
    END IF;
    v_unit:=coalesce(v_row.unit,(SELECT unit_type FROM public.products WHERE id=v_row.product_id));
    SELECT sum(private.stock_quantity_in_unit_or_null((l->>'quantity')::numeric,btrim(l->>'unit'),v_unit)),
      bool_or(private.stock_quantity_in_unit_or_null((l->>'quantity')::numeric,btrim(l->>'unit'),v_unit) IS NULL)
    INTO v_bought,v_incompatible
    FROM jsonb_array_elements(v_lines) l WHERE jsonb_typeof(l->'target')='object' AND (l#>>'{target,shopping_id}')::uuid=v_sid;
    IF v_incompatible OR v_unit IS NULL THEN RAISE EXCEPTION 'UNIT_INCOMPATIBLE'; END IF;
    v_bought:=trim_scale(round(v_bought,9));
    IF v_bought<=0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    -- A row already checked by hand was declared bought: it takes the receipt's quantity, no remainder.
    -- Below a millionth of the row (a rounding of the units), nothing is left to buy.
    v_left:=CASE WHEN v_row.is_purchased THEN 0 ELSE trim_scale(round(v_row.quantity-v_bought,9)) END;
    UPDATE public.shopping_list SET quantity=v_bought,unit=v_unit,is_purchased=true WHERE id=v_row.id RETURNING * INTO v_after;
    INSERT INTO public.shopping_movements(user_id,command_id,shopping_id,kind,before,version_after)
    VALUES(p_user,p_command,v_row.id,'updated',to_jsonb(v_row),v_after.stock_version);
    IF v_left>greatest(0.000000001,v_row.quantity*0.000001) THEN
      INSERT INTO public.shopping_list(user_id,product_id,quantity,unit,is_purchased,priority,store_section)
      VALUES(p_user,v_row.product_id,v_left,v_unit,false,v_row.priority,v_row.store_section) RETURNING * INTO v_rest;
      INSERT INTO public.shopping_movements(user_id,command_id,shopping_id,kind,before,version_after)
      VALUES(p_user,p_command,v_rest.id,'created',NULL,v_rest.stock_version);
      v_changes:=v_changes||jsonb_build_array(private.shopping_change(v_after,'checked',NULL,'receipt_partial'),
        private.shopping_change(v_rest,'created',v_left,'receipt_remainder'));
    ELSE
      v_changes:=v_changes||jsonb_build_array(private.shopping_change(v_after,CASE WHEN v_row.is_purchased THEN 'updated' ELSE 'checked' END));
    END IF;
  END LOOP;

  -- Each line: a purchase absent from the list becomes a bought row (its product resolved by name, D13:
  -- no external lookup); a known price joins the owner's history. Names in a stable order, so that two
  -- accounts creating the same products never wait on each other in turn.
  FOR v_line IN SELECT value FROM jsonb_array_elements(v_lines) ORDER BY lower(btrim(value->>'name')),(value->>'line_index')::numeric LOOP
    v_unit_price:=private.receipt_price(v_line->'unit_price'); v_total_price:=private.receipt_price(v_line->'total_price');
    v_quantity:=(v_line->>'quantity')::numeric;
    IF jsonb_typeof(v_line->'target')='object' THEN
      SELECT product_id INTO STRICT v_product FROM public.shopping_list WHERE id=(v_line#>>'{target,shopping_id}')::uuid;
    ELSE
      v_product:=private.shopping_resolve_product(v_line->>'name',NULL,v_line->>'unit');
      INSERT INTO public.shopping_list(user_id,product_id,quantity,unit,is_purchased)
      VALUES(p_user,v_product,trim_scale(v_quantity),btrim(v_line->>'unit'),true) RETURNING * INTO v_after;
      INSERT INTO public.shopping_movements(user_id,command_id,shopping_id,kind,before,version_after)
      VALUES(p_user,p_command,v_after.id,'created',NULL,v_after.stock_version);
      v_changes:=v_changes||jsonb_build_array(private.shopping_change(v_after,'created',trim_scale(v_quantity),'receipt_added'));
    END IF;
    IF v_unit_price IS NOT NULL OR v_total_price IS NOT NULL THEN
      INSERT INTO public.purchase_prices(user_id,command_id,receipt_scan_id,product_id,quantity,unit,unit_price,total_price,currency,purchased_on,store)
      VALUES(p_user,p_command,v_scan.id,v_product,trim_scale(v_quantity),btrim(v_line->>'unit'),v_unit_price,v_total_price,v_scan.currency,v_scan.purchased_on,v_scan.store);
    END IF;
  END LOOP;

  UPDATE public.receipt_scans SET state='applied',applied_command_id=p_command,applied_at=now() WHERE id=v_scan.id;
  RETURN v_changes;
END $$;

-- The undo of reconcile_receipt besides the list: its prices removed, its scan to apply again.
CREATE OR REPLACE FUNCTION private.undo_reconcile_receipt(p_user uuid,p_original uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  DELETE FROM public.purchase_prices WHERE user_id=p_user AND command_id=p_original;
  UPDATE public.receipt_scans SET state='read',applied_command_id=NULL,applied_at=NULL,read_at=now()
  WHERE user_id=p_user AND applied_command_id=p_original AND state='applied';
  IF NOT FOUND THEN RAISE EXCEPTION 'UNDO_CONFLICT'; END IF;
END $$;

-- Scans never applied (read, failed) are kept 7 days after their reading; applied ones stay as the history.
CREATE OR REPLACE FUNCTION private.purge_receipt_scans() RETURNS integer
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  WITH gone AS (DELETE FROM public.receipt_scans WHERE state IN ('read','failed') AND read_at<now()-interval '7 days' RETURNING 1)
  SELECT count(*)::integer FROM gone
$$;

REVOKE ALL ON FUNCTION private.receipt_price(jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.reconcile_receipt(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.undo_reconcile_receipt(uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.purge_receipt_scans() FROM PUBLIC,anon,authenticated;

-- Daily, where pg_cron exists (production); the test database has none. Same name: re-running
-- updates the job instead of adding one.
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.schedule('purge-receipt-scans','43 3 * * *','SELECT private.purge_receipt_scans()');
  ELSE
    RAISE NOTICE 'pg_cron is absent: receipt scans never applied are not purged until private.purge_receipt_scans() is scheduled.';
  END IF;
END $do$;

-- Body of 20261126090000_v11_update_menu.sql; only reconcile_receipt and its undo are added.
CREATE OR REPLACE FUNCTION private.execute_stock_command(p_command jsonb,p_allocations jsonb DEFAULT '[]') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_user uuid:=auth.uid(); v_id uuid; v_type text; v_payload jsonb; v_previous public.stock_commands%ROWTYPE;
  v_adjust jsonb; v_seen integer[]; v_item jsonb; v_ing jsonb; v_recipe jsonb; v_plan jsonb; v_result jsonb;
  v_inventory public.inventory%ROWTYPE; v_shopping public.shopping_list%ROWTYPE;
  v_movement public.stock_movements%ROWTYPE; v_product public.products%ROWTYPE;
  v_new_id uuid; v_recipe_id uuid; v_journal_id uuid; v_wrapper_id uuid; v_original_id uuid;
  v_quantity numeric; v_required numeric; v_total numeric; v_tolerance numeric; v_next numeric; v_unit text;
  v_version bigint; v_index integer; v_count integer; v_multiplier numeric;
  v_inventory_ids jsonb:='[]'; v_shopping_ids jsonb:='[]'; v_tables jsonb:='[]';
  v_date date; v_week date; v_plan_id uuid; v_ingredients jsonb;
  v_entry public.meal_plan_entries%ROWTYPE; v_replaced jsonb; v_change jsonb; v_shopping_changes jsonb;
  v_meal_entry uuid; v_entry_version bigint; v_leftovers jsonb; v_menu_edit jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  IF p_command IS NULL OR jsonb_typeof(p_command)<>'object' OR octet_length(p_command::text)>500000 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  v_id:=(p_command->>'command_id')::uuid; v_type:=p_command->>'command_type'; v_payload:=p_command->'payload';
  IF v_id IS NULL OR (p_command->>'payload_version')::integer IS DISTINCT FROM 1 OR jsonb_typeof(v_payload)<>'object' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF v_payload ? 'user_id' OR p_command ? 'user_id' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF v_type NOT IN ('transfer_shopping','consume_recipe','consume_inventory','adjust_inventory','undo_stock','save_recipe','add_catalog_recipe','recipe_add_missing','plan_recipe',
    'shopping_add','shopping_check','shopping_update','shopping_remove','menu_add_missing','update_menu','reconcile_receipt') THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  -- Serialize commands for one account; row locks also protect against old clients.
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-stock:'||v_user::text,0));
  SELECT * INTO v_previous FROM public.stock_commands WHERE user_id=v_user AND command_id=v_id;
  IF FOUND THEN
    IF v_previous.command_type<>v_type OR v_previous.payload<>v_payload THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
    RETURN v_previous.result;
  END IF;
  INSERT INTO public.stock_commands(user_id,command_id,command_type,payload_version,payload)
  VALUES(v_user,v_id,v_type,1,v_payload);

  IF v_type='transfer_shopping' THEN
    IF jsonb_typeof(v_payload->'items')<>'array' OR jsonb_array_length(v_payload->'items') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(v_payload->'items'))<>jsonb_array_length(v_payload->'items') THEN RAISE EXCEPTION 'DUPLICATE_ITEM'; END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_payload->'items') ORDER BY value->>'id' LOOP
      SELECT * INTO v_shopping FROM public.shopping_list WHERE id=(v_item->>'id')::uuid AND user_id=v_user FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
      IF NOT v_shopping.is_purchased OR (v_item->>'expected_version')::bigint IS DISTINCT FROM v_shopping.stock_version THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      IF v_shopping.quantity<=0 OR v_shopping.quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      SELECT * INTO STRICT v_product FROM public.products WHERE id=v_shopping.product_id;
      v_quantity:=CASE WHEN v_item ? 'quantity' THEN (v_item->>'quantity')::numeric ELSE v_shopping.quantity END;
      v_unit:=coalesce(v_item->>'unit',v_shopping.unit,v_product.unit_type);
      IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity>1000000000 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      IF nullif(btrim(v_unit),'') IS NULL THEN RAISE EXCEPTION 'UNIT_UNKNOWN'; END IF;
      INSERT INTO public.inventory(user_id,product_id,quantity,unit,location,expiry_date,date_kind,quantity_quality)
      VALUES(v_user,v_shopping.product_id,v_quantity,v_unit,v_item->>'location',nullif(v_item->>'expiry_date','')::date,COALESCE(v_item->>'date_kind','unknown'),COALESCE(v_item->>'quantity_quality','unknown'))
      RETURNING id,stock_version INTO v_new_id,v_version;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot,source_shopping)
      VALUES(v_user,v_id,v_new_id,v_quantity,v_unit,v_version,'{}',to_jsonb(v_shopping));
      DELETE FROM public.shopping_list WHERE id=v_shopping.id AND user_id=v_user;
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_new_id); v_shopping_ids:=v_shopping_ids||jsonb_build_array(v_shopping.id);
    END LOOP;
    v_tables:='["inventory","shopping_list"]';

  ELSIF v_type='consume_recipe' THEN
    v_recipe:=public.resolve_stock_recipe((v_payload#>>'{recipe,id}')::uuid,coalesce(v_payload#>>'{recipe,source}','auto'));
    IF v_recipe->>'version' IS DISTINCT FROM v_payload->>'recipe_version' THEN RAISE EXCEPTION 'RECIPE_CHANGED'; END IF;
    -- V11-01 E1: a planned meal is cooked once; the link is written in this transaction.
    IF v_payload ? 'meal_plan_entry_id' THEN
      SELECT e.* INTO v_entry FROM public.meal_plan_entries e JOIN public.weekly_meal_plans w ON w.id=e.meal_plan_id
      WHERE e.id=(v_payload->>'meal_plan_entry_id')::uuid AND w.user_id=v_user FOR UPDATE OF e;
      IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
      IF v_entry.cooked_command_id IS NOT NULL THEN RAISE EXCEPTION 'ALREADY_COOKED'; END IF;
      IF v_entry.version IS DISTINCT FROM (v_payload->>'entry_version')::bigint
        OR v_entry.recipe_reference->>'id' IS DISTINCT FROM v_payload#>>'{recipe,id}' THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
      v_meal_entry:=v_entry.id;
    END IF;
    v_multiplier:=(v_payload->>'servings')::numeric/(v_recipe->>'servings')::numeric;
    IF v_multiplier IS NULL OR v_multiplier<=0 OR v_multiplier::text IN ('NaN','Infinity','-Infinity') OR (v_payload->>'servings')::numeric>100 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    IF jsonb_typeof(p_allocations)<>'array' OR jsonb_array_length(p_allocations)>1000 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    IF jsonb_typeof(v_payload->'outside_inventory')<>'array' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    v_ingredients:=v_recipe->'ingredients';
    IF jsonb_array_length(v_ingredients) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_RECIPE'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_payload->'outside_inventory') n WHERE n::integer<0 OR n::integer>=jsonb_array_length(v_ingredients)) THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    -- V10-02: actual quantities refer to this meal once; substitutions are explicit.
    IF v_payload ? 'adjustments' THEN
      IF jsonb_typeof(v_payload->'adjustments')<>'array' OR jsonb_array_length(v_payload->'adjustments')>100 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
      v_seen:='{}';
      FOR v_adjust IN SELECT value FROM jsonb_array_elements(v_payload->'adjustments') LOOP
        v_index:=(v_adjust->>'ingredient_index')::integer;
        v_quantity:=(v_adjust->>'quantity')::numeric;
        IF v_index IS NULL OR v_index<0 OR v_index>=jsonb_array_length(v_ingredients) OR v_index=ANY(v_seen) THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
        IF v_quantity IS NULL OR v_quantity<0 OR v_quantity>1000000000 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
        IF nullif(btrim(v_adjust->>'unit'),'') IS NULL THEN RAISE EXCEPTION 'UNIT_UNKNOWN'; END IF;
        IF v_adjust ? 'inventory_product_id' AND NOT EXISTS (SELECT 1 FROM public.products WHERE id=(v_adjust->>'inventory_product_id')::uuid) THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
        IF v_adjust ? 'inventory_id' AND NOT EXISTS (SELECT 1 FROM public.inventory WHERE id=(v_adjust->>'inventory_id')::uuid AND user_id=v_user) THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
        v_seen:=array_append(v_seen,v_index);
        v_ing:=(v_ingredients->v_index) || jsonb_build_object('quantity',v_quantity/v_multiplier,'unit',v_adjust->>'unit');
        IF v_adjust ? 'inventory_product_id' THEN v_ing:=v_ing || jsonb_build_object('inventory_product_id',v_adjust->>'inventory_product_id'); END IF;
        v_ingredients:=jsonb_set(v_ingredients,ARRAY[v_index::text],v_ing);
      END LOOP;
    END IF;
    -- Deterministic row locking, then revalidate every allocation in the DB.
    PERFORM id FROM public.inventory WHERE user_id=v_user AND id IN
      (SELECT (value->>'inventory_id')::uuid FROM jsonb_array_elements(p_allocations)) ORDER BY id FOR UPDATE;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_allocations) LOOP
      v_index:=(v_item->>'ingredient_index')::integer;
      IF v_index IS NULL OR v_index<0 OR v_index>=jsonb_array_length(v_ingredients)
        OR v_payload->'outside_inventory' @> jsonb_build_array(v_index) THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
      v_ing:=v_ingredients->v_index;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(v_payload->'adjustments','[]')) a WHERE (a->>'ingredient_index')::integer=v_index AND a ? 'inventory_id' AND a->>'inventory_id' IS DISTINCT FROM v_item->>'inventory_id') THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
      SELECT * INTO v_inventory FROM public.inventory WHERE id=(v_item->>'inventory_id')::uuid AND user_id=v_user;
      IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
      IF (v_item->>'expected_version')::bigint IS DISTINCT FROM v_inventory.stock_version THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      SELECT * INTO STRICT v_product FROM public.products WHERE id=v_inventory.product_id;
      v_unit:=coalesce(v_inventory.unit,v_product.unit_type);
      IF v_item->>'unit' IS DISTINCT FROM v_unit THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      -- Same rule as allocateRecipeStock: the linked product or a pantry product of the same name.
      IF nullif(v_ing->>'inventory_product_id','')::uuid IS DISTINCT FROM v_inventory.product_id
        AND public.stock_ingredient_match_rank(v_ing->>'ingredient_name',v_product.name)=0 THEN
        RAISE EXCEPTION 'INVALID_ALLOCATION';
      END IF;
      v_quantity:=(v_item->>'quantity')::numeric;
      IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      PERFORM public.stock_quantity_in_unit(v_quantity,v_unit,v_ing->>'unit');
    END LOOP;
    FOR v_ing,v_index IN SELECT value,ordinality::integer-1 FROM jsonb_array_elements(v_ingredients) WITH ORDINALITY LOOP
      IF v_payload->'outside_inventory' @> jsonb_build_array(v_index) THEN CONTINUE; END IF;
      -- Tap water is never taken from stock.
      IF public.stock_is_tap_water(v_ing->>'ingredient_name') THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_allocations) a WHERE (a->>'ingredient_index')::integer=v_index) THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
        CONTINUE;
      END IF;
      v_required:=(v_ing->>'quantity')::numeric*v_multiplier;
      IF v_required=0 AND EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(v_payload->'adjustments','[]')) a WHERE (a->>'ingredient_index')::integer=v_index AND (a->>'quantity')::numeric=0) THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_allocations) a WHERE (a->>'ingredient_index')::integer=v_index) THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
        CONTINUE;
      END IF;
      IF v_required IS NULL OR v_required<=0 THEN RAISE EXCEPTION 'QUANTITY_UNKNOWN'; END IF;
      -- Allocations are rounded to 1e-9 in the lot unit, and 1e-9 kg is 1e-6 g:
      -- each allocation may differ by 1e-9 of the larger of the two units.
      SELECT coalesce(sum(public.stock_quantity_in_unit((value->>'quantity')::numeric,value->>'unit',v_ing->>'unit')),0),
        coalesce(sum(greatest(1,public.stock_quantity_in_unit(1,value->>'unit',v_ing->>'unit'))),1)*0.000000001
      INTO v_total,v_tolerance FROM jsonb_array_elements(p_allocations) WHERE (value->>'ingredient_index')::integer=v_index;
      IF abs(v_total-v_required)>v_tolerance THEN RAISE EXCEPTION 'INSUFFICIENT_QUANTITY'; END IF;
    END LOOP;
    FOR v_plan IN SELECT jsonb_build_object('inventory_id',value->>'inventory_id','quantity',sum((value->>'quantity')::numeric))
      FROM jsonb_array_elements(p_allocations) GROUP BY value->>'inventory_id' ORDER BY value->>'inventory_id' LOOP
      SELECT * INTO STRICT v_inventory FROM public.inventory WHERE id=(v_plan->>'inventory_id')::uuid AND user_id=v_user;
      v_quantity:=(v_plan->>'quantity')::numeric;
      IF v_inventory.quantity<v_quantity THEN RAISE EXCEPTION 'INSUFFICIENT_QUANTITY'; END IF;
      SELECT coalesce(v_inventory.unit,unit_type) INTO v_unit FROM public.products WHERE id=v_inventory.product_id;
      UPDATE public.inventory SET quantity=quantity-v_quantity,unit=v_unit WHERE id=v_inventory.id AND user_id=v_user RETURNING stock_version INTO v_version;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot)
      VALUES(v_user,v_id,v_inventory.id,-v_quantity,v_unit,v_version,to_jsonb(v_inventory));
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_inventory.id);
    END LOOP;
    INSERT INTO public.cooking_journal_entries(user_id,recipe_id,recipe_title,stock_command_id,adjustments)
    VALUES(v_user,(v_recipe->>'id')::uuid,v_recipe->>'name',v_id,
      jsonb_build_object('servings',v_payload->'servings','recipe_reference',v_payload->'recipe','outside_inventory',v_payload->'outside_inventory','actual_ingredients',v_payload->'adjustments')) RETURNING id INTO v_journal_id;
    IF v_recipe->>'source'='user_recipes' THEN UPDATE public.user_recipes SET times_cooked=coalesce(times_cooked,0)+1,last_cooked_date=now() WHERE id=(v_recipe->>'id')::uuid AND user_id=v_user; END IF;
    IF v_meal_entry IS NOT NULL THEN UPDATE public.meal_plan_entries SET cooked_command_id=v_id WHERE id=v_meal_entry; END IF;
    v_tables:='["inventory","cooking_journal","user_recipes"]';

  ELSIF v_type IN ('consume_inventory','adjust_inventory') THEN
    IF jsonb_typeof(v_payload->'items')<>'array' OR jsonb_array_length(v_payload->'items') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    IF (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(v_payload->'items'))<>jsonb_array_length(v_payload->'items') THEN RAISE EXCEPTION 'DUPLICATE_ITEM'; END IF;
    FOR v_item IN SELECT value FROM jsonb_array_elements(v_payload->'items') ORDER BY value->>'id' LOOP
      SELECT * INTO v_inventory FROM public.inventory WHERE id=(v_item->>'id')::uuid AND user_id=v_user FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
      IF v_item ? 'expected_version' AND (v_item->>'expected_version')::bigint IS DISTINCT FROM v_inventory.stock_version THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      IF v_type='adjust_inventory' AND NOT v_item ? 'expected_version' THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      SELECT coalesce(v_inventory.unit,unit_type) INTO v_unit FROM public.products WHERE id=v_inventory.product_id;
      v_quantity:=public.stock_quantity_in_unit((v_item->>'quantity')::numeric,v_item->>'unit',v_unit);
      IF v_type='consume_inventory' THEN
        IF v_quantity<=0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
        IF v_quantity>v_inventory.quantity THEN RAISE EXCEPTION 'INSUFFICIENT_QUANTITY'; END IF;
        v_next:=v_inventory.quantity-v_quantity;
      ELSE v_next:=v_quantity; END IF;
      UPDATE public.inventory SET quantity=v_next,unit=v_unit,
        location=CASE WHEN v_item ? 'location' THEN v_item->>'location' ELSE location END,
        expiry_date=CASE WHEN v_item ? 'expiry_date' THEN nullif(v_item->>'expiry_date','')::date ELSE expiry_date END,
        date_kind=CASE WHEN v_item ? 'date_kind' THEN v_item->>'date_kind' ELSE date_kind END,
        quantity_quality=CASE WHEN v_item ? 'quantity_quality' THEN v_item->>'quantity_quality' ELSE quantity_quality END
      WHERE id=v_inventory.id AND user_id=v_user RETURNING stock_version INTO v_version;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot)
      VALUES(v_user,v_id,v_inventory.id,v_next-v_inventory.quantity,v_unit,v_version,to_jsonb(v_inventory));
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_inventory.id);
    END LOOP;
    v_tables:='["inventory"]';

  ELSIF v_type='undo_stock' THEN
    v_original_id:=(v_payload->>'original_command_id')::uuid;
    SELECT * INTO v_previous FROM public.stock_commands WHERE user_id=v_user AND command_id=v_original_id;
    IF NOT FOUND OR v_previous.command_type NOT IN ('consume_recipe','consume_inventory','adjust_inventory','transfer_shopping','plan_recipe',
      'recipe_add_missing','shopping_add','shopping_check','shopping_update','shopping_remove','menu_add_missing','update_menu','reconcile_receipt') THEN RAISE EXCEPTION 'COMMAND_NOT_FOUND'; END IF;
    IF EXISTS (SELECT 1 FROM public.stock_commands WHERE user_id=v_user AND reverses_command_id=v_original_id) THEN RAISE EXCEPTION 'ALREADY_UNDONE'; END IF;
    UPDATE public.stock_commands SET reverses_command_id=v_original_id WHERE user_id=v_user AND command_id=v_id;
  IF v_previous.command_type='update_menu' THEN
    -- V11-01 E3: the menu as it was, if every meal the edit left is still as it left it.
    PERFORM private.undo_update_menu(v_user,v_previous.result->'menu_edit');
    v_tables:='["meal_plan_entries","weekly_meal_plans"]';
  ELSIF v_previous.command_type='plan_recipe' THEN
    -- The slot gets back the meal it replaced, or is emptied; not when it changed since.
    SELECT e.* INTO v_entry FROM public.meal_plan_entries e JOIN public.weekly_meal_plans w ON w.id=e.meal_plan_id
    WHERE e.id=(v_previous.result->>'meal_plan_entry_id')::uuid AND w.user_id=v_user FOR UPDATE OF e;
    IF NOT FOUND OR v_entry.recipe_reference IS DISTINCT FROM v_previous.result->'planned_reference'
      OR v_entry.servings IS DISTINCT FROM (v_previous.payload->>'servings')::integer THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
    -- V11-01 E1: a cooked meal stays; its cooking is undone first.
    IF v_entry.cooked_command_id IS NOT NULL THEN RAISE EXCEPTION 'MEAL_COOKED'; END IF;
    -- V11-01 E3: so do the leftovers planned since from it.
    IF EXISTS (SELECT 1 FROM public.meal_plan_entries WHERE leftover_of=v_entry.id) THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
    IF v_previous.result ? 'entry_version' THEN
      -- V11-01 E1: the meal must still be the one planned (moved or edited: refused); the meal it
      -- replaced comes back exactly as it was, identity and version included, so that its own
      -- planning can be undone in turn.
      IF v_entry.version IS DISTINCT FROM (v_previous.result->>'entry_version')::bigint THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
      DELETE FROM public.meal_plan_entries WHERE id=v_entry.id;
      IF v_previous.result ? 'replaced_entry' THEN
        INSERT INTO public.meal_plan_entries SELECT (jsonb_populate_record(NULL::public.meal_plan_entries,v_previous.result->'replaced_entry' ||
          jsonb_build_object('version',coalesce((v_previous.result#>>'{replaced_entry,version}')::bigint,0)))).*;
      END IF;
      -- V11-01 E3: the leftovers it removed come back with it.
      PERFORM private.menu_restore(v_previous.result->'replaced_leftovers');
    -- A receipt from before V11-01 E1: the slot must still be the planned day and meal.
    ELSIF v_entry.day_of_week IS DISTINCT FROM extract(isodow FROM (v_previous.payload->>'date')::date)::integer-1
      OR v_entry.meal_type IS DISTINCT FROM coalesce(v_previous.payload->>'meal_type','dinner') THEN RAISE EXCEPTION 'MENU_CHANGED';
    ELSIF v_previous.result ? 'replaced_entry' THEN
      UPDATE public.meal_plan_entries SET recipe_id=nullif(v_previous.result#>>'{replaced_entry,recipe_id}','')::uuid,
        recipe_reference=v_previous.result#>'{replaced_entry,recipe_reference}',recipe_name=v_previous.result#>>'{replaced_entry,recipe_name}',
        servings=(v_previous.result#>>'{replaced_entry,servings}')::integer,prep_time=(v_previous.result#>>'{replaced_entry,prep_time}')::integer,
        cook_time=(v_previous.result#>>'{replaced_entry,cook_time}')::integer WHERE id=v_entry.id;
    ELSE
      DELETE FROM public.meal_plan_entries WHERE id=v_entry.id;
    END IF;
    v_plan_id:=v_entry.meal_plan_id; v_tables:='["meal_plan_entries"]';
  ELSIF v_previous.command_type='reconcile_receipt' THEN
    -- V11-01 E5a: the list as it was (all or nothing), the prices removed, the scan to apply again.
    v_shopping_changes:=private.undo_shopping_command(v_user,v_original_id,v_id);
    PERFORM private.undo_reconcile_receipt(v_user,v_original_id);
    SELECT coalesce(jsonb_agg(c->'id'),'[]') INTO v_shopping_ids FROM jsonb_array_elements(v_shopping_changes) c;
    v_tables:='["shopping_list","purchase_prices","receipt_scans"]';
  ELSIF v_previous.command_type IN ('recipe_add_missing','shopping_add','shopping_check','shopping_update','shopping_remove','menu_add_missing') THEN
    -- V11-05 E2: list commands are journaled in shopping_movements; a recipe_add_missing sent
    -- before this migration left no journal and cannot be undone.
    IF NOT EXISTS (SELECT 1 FROM public.shopping_movements WHERE user_id=v_user AND command_id=v_original_id)
      AND jsonb_array_length(coalesce(v_previous.result->'shopping_ids','[]'))>0 THEN RAISE EXCEPTION 'COMMAND_NOT_FOUND'; END IF;
    v_shopping_changes:=private.undo_shopping_command(v_user,v_original_id,v_id);
    DELETE FROM public.menu_shopping_contributions WHERE user_id=v_user AND command_id=v_original_id;
    SELECT coalesce(jsonb_agg(c->'id'),'[]') INTO v_shopping_ids FROM jsonb_array_elements(v_shopping_changes) c;
    v_tables:='["shopping_list"]';
  ELSE
    FOR v_movement IN SELECT * FROM public.stock_movements WHERE user_id=v_user AND command_id=v_original_id ORDER BY inventory_id LOOP
      SELECT * INTO v_inventory FROM public.inventory WHERE id=v_movement.inventory_id AND user_id=v_user FOR UPDATE;
      IF NOT FOUND OR v_inventory.stock_version<>v_movement.version_after OR v_inventory.unit IS DISTINCT FROM v_movement.unit THEN RAISE EXCEPTION 'UNDO_CONFLICT'; END IF;
      IF v_movement.source_shopping IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.shopping_list WHERE id=(v_movement.source_shopping->>'id')::uuid) THEN RAISE EXCEPTION 'UNDO_CONFLICT'; END IF;
        INSERT INTO public.shopping_list SELECT (jsonb_populate_record(NULL::public.shopping_list,v_movement.source_shopping ||
          jsonb_build_object('stock_version',(v_movement.source_shopping->>'stock_version')::bigint+1,'updated_at',now()))).*;
        DELETE FROM public.inventory WHERE id=v_inventory.id AND user_id=v_user;
        v_shopping_ids:=v_shopping_ids||jsonb_build_array(v_movement.source_shopping->>'id');
        v_version:=v_inventory.stock_version+1;
      ELSE
        v_next:=v_inventory.quantity-v_movement.delta;
        IF v_next<0 THEN RAISE EXCEPTION 'UNDO_CONFLICT'; END IF;
        UPDATE public.inventory SET quantity=v_next,
          location=v_movement.snapshot->>'location',expiry_date=nullif(v_movement.snapshot->>'expiry_date','')::date,
          date_kind=COALESCE(v_movement.snapshot->>'date_kind','unknown'),quantity_quality=COALESCE(v_movement.snapshot->>'quantity_quality','unknown')
        WHERE id=v_inventory.id AND user_id=v_user RETURNING stock_version INTO v_version;
      END IF;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot)
      VALUES(v_user,v_id,v_inventory.id,-v_movement.delta,v_movement.unit,v_version,to_jsonb(v_inventory));
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_inventory.id);
    END LOOP;
    UPDATE public.cooking_journal_entries SET voided_at=now(),updated_at=now()
    WHERE user_id=v_user AND stock_command_id=v_original_id RETURNING id INTO v_journal_id;
    UPDATE public.meal_plan_entries SET cooked_command_id=NULL WHERE cooked_command_id=v_original_id
      AND meal_plan_id IN (SELECT id FROM public.weekly_meal_plans WHERE user_id=v_user);
    IF v_previous.command_type='consume_recipe' AND EXISTS (SELECT 1 FROM public.user_recipes WHERE id=(v_previous.payload#>>'{recipe,id}')::uuid AND user_id=v_user) THEN
      UPDATE public.user_recipes SET times_cooked=greatest(0,coalesce(times_cooked,0)-1),
        last_cooked_date=(SELECT max(cooked_at) FROM public.cooking_journal_entries WHERE user_id=v_user AND recipe_id=(v_previous.payload#>>'{recipe,id}')::uuid AND voided_at IS NULL)
      WHERE id=(v_previous.payload#>>'{recipe,id}')::uuid AND user_id=v_user;
    END IF;
    v_tables:='["inventory","shopping_list","cooking_journal","user_recipes"]';
  END IF;

  ELSIF v_type='save_recipe' THEN
    v_recipe:=v_payload->'recipe'; v_ingredients:=v_payload->'ingredients';
    IF nullif(btrim(v_recipe->>'name'),'') IS NULL OR jsonb_typeof(v_ingredients)<>'array' OR jsonb_array_length(v_ingredients) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_RECIPE'; END IF;
    IF (v_recipe->>'servings')::numeric IS NULL OR (v_recipe->>'servings')::numeric<=0 OR (v_recipe->>'servings')::numeric>100 OR (v_recipe->>'servings')::numeric<>trunc((v_recipe->>'servings')::numeric) THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    INSERT INTO public.recipes(user_id,name,instructions,description,image_url,cuisine_category,meal_type,prep_time,cook_time,rest_time,servings,difficulty,tags,is_public,source_type,source_url)
    VALUES(v_user,btrim(v_recipe->>'name'),coalesce(v_recipe->>'instructions',''),v_recipe->>'description',v_recipe->>'image_url',
      v_recipe->>'cuisine_category',v_recipe->>'meal_type',coalesce((v_recipe->>'prep_time')::integer,0),coalesce((v_recipe->>'cook_time')::integer,0),
      coalesce((v_recipe->>'rest_time')::integer,0),(v_recipe->>'servings')::integer,coalesce((v_recipe->>'difficulty')::integer,3),
      ARRAY(SELECT jsonb_array_elements_text(coalesce(v_recipe->'tags','[]'))),coalesce((v_recipe->>'is_public')::boolean,false),
      coalesce(v_recipe->>'source_type','manual'),v_recipe->>'source_url') RETURNING id INTO v_recipe_id;
    FOR v_ing,v_index IN SELECT value,ordinality::integer-1 FROM jsonb_array_elements(v_ingredients) WITH ORDINALITY LOOP
      IF nullif(btrim(v_ing->>'ingredient_name'),'') IS NULL THEN RAISE EXCEPTION 'INVALID_INGREDIENT'; END IF;
      v_quantity:=nullif(v_ing->>'quantity','')::numeric;
      IF v_quantity IS NOT NULL AND (v_quantity<=0 OR v_quantity::text IN ('NaN','Infinity','-Infinity')) THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      v_new_id:=nullif(v_ing->>'inventory_product_id','')::uuid;
      IF v_new_id IS NULL THEN SELECT id INTO v_new_id FROM public.products WHERE public.stock_normalize_name(name)=public.stock_normalize_name(v_ing->>'ingredient_name') ORDER BY id LIMIT 1; END IF;
      INSERT INTO public.recipe_ingredients(recipe_id,ingredient_name,quantity,unit,is_essential,notes,order_index,inventory_product_id)
      VALUES(v_recipe_id,btrim(v_ing->>'ingredient_name'),v_quantity,v_ing->>'unit',coalesce((v_ing->>'is_essential')::boolean,true),v_ing->>'notes',v_index,v_new_id);
    END LOOP;
    v_tables:='["recipes","recipe_ingredients"]';

  ELSIF v_type='add_catalog_recipe' THEN
    v_recipe_id:=(v_payload->>'catalog_recipe_id')::uuid;
    IF NOT EXISTS (SELECT 1 FROM public.recipes_catalog WHERE id=v_recipe_id) THEN RAISE EXCEPTION 'RECIPE_NOT_FOUND'; END IF;
    INSERT INTO public.user_recipes(user_id,recipe_id,is_from_catalog,collections,personal_notes,custom_modifications)
    VALUES(v_user,v_recipe_id,true,ARRAY(SELECT jsonb_array_elements_text(coalesce(v_payload->'collections','[]'))),v_payload->>'personal_notes','{}')
    ON CONFLICT(user_id,recipe_id) WHERE is_from_catalog AND recipe_id IS NOT NULL DO NOTHING;
    SELECT id INTO STRICT v_wrapper_id FROM public.user_recipes WHERE user_id=v_user AND recipe_id=v_recipe_id AND is_from_catalog;
    v_tables:='["user_recipes"]';

  ELSIF v_type='recipe_add_missing' THEN
    v_recipe:=public.resolve_stock_recipe((v_payload#>>'{recipe,id}')::uuid,coalesce(v_payload#>>'{recipe,source}','auto'));
    v_multiplier:=(v_payload->>'servings')::numeric/(v_recipe->>'servings')::numeric;
    IF v_multiplier IS NULL OR v_multiplier<=0 OR v_multiplier::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    IF jsonb_typeof(p_allocations)<>'array' OR jsonb_array_length(p_allocations)>100 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    v_shopping_changes:='[]';
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_allocations) LOOP
      v_index:=(v_item->>'ingredient_index')::integer; v_ing:=v_recipe->'ingredients'->v_index;
      IF v_ing IS NULL THEN RAISE EXCEPTION 'INVALID_INGREDIENT'; END IF;
      v_quantity:=(v_item->>'quantity')::numeric;
      IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'QUANTITY_UNKNOWN'; END IF;
      IF (v_ing->>'quantity')::numeric IS NULL OR (v_ing->>'quantity')::numeric<=0 THEN RAISE EXCEPTION 'QUANTITY_UNKNOWN'; END IF;
      -- The shopping list only holds measurable amounts (canAddToShoppingList).
      IF public.stock_unit(public.stock_unit_name(v_ing->>'unit')) IS NULL THEN RAISE EXCEPTION 'UNIT_UNKNOWN'; END IF;
      IF v_item->>'unit' IS DISTINCT FROM v_ing->>'unit' OR v_quantity>(v_ing->>'quantity')::numeric*v_multiplier THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      v_new_id:=coalesce(nullif(v_ing->>'inventory_product_id','')::uuid,private.shopping_resolve_product(v_ing->>'ingredient_name',NULL,v_ing->>'unit'));
      -- V11-05 E2: what the list already holds counts, the oldest convertible row is completed (D16),
      -- and every row change is journaled so that undo_stock can take it back.
      v_change:=private.shopping_aggregate(v_user,v_id,v_new_id,v_quantity,v_ing->>'unit','complete_to');
      IF v_change IS NULL THEN CONTINUE; END IF;
      v_shopping_changes:=v_shopping_changes||jsonb_build_array(v_change);
      v_shopping_ids:=v_shopping_ids||jsonb_build_array(v_change->'id');
    END LOOP;
    v_tables:='["shopping_list","products"]';

  ELSIF v_type IN ('shopping_add','shopping_check','shopping_update','shopping_remove') THEN
    v_shopping_changes:=private.shopping_command(v_user,v_id,v_type,v_payload);
    SELECT coalesce(jsonb_agg(s.id ORDER BY s.first),'[]') INTO v_shopping_ids
    FROM (SELECT c->'id' AS id,min(o) AS first FROM jsonb_array_elements(v_shopping_changes) WITH ORDINALITY e(c,o) GROUP BY c->'id') s;
    v_tables:=CASE WHEN v_type IN ('shopping_add','shopping_update') THEN '["shopping_list","products"]'::jsonb ELSE '["shopping_list"]'::jsonb END;

  ELSIF v_type='menu_add_missing' THEN
    v_shopping_changes:=private.menu_add_missing(v_user,v_id,v_payload);
    SELECT coalesce(jsonb_agg(s.id ORDER BY s.first),'[]') INTO v_shopping_ids
    FROM (SELECT c->'id' AS id,min(o) AS first FROM jsonb_array_elements(v_shopping_changes) WITH ORDINALITY e(c,o) GROUP BY c->'id') s;
    v_tables:='["shopping_list","products"]';

  ELSIF v_type='reconcile_receipt' THEN
    -- V11-01 E5a: a reviewed receipt applied to the list once, its prices recorded.
    v_shopping_changes:=private.reconcile_receipt(v_user,v_id,v_payload);
    SELECT coalesce(jsonb_agg(s.id ORDER BY s.first),'[]') INTO v_shopping_ids
    FROM (SELECT c->'id' AS id,min(o) AS first FROM jsonb_array_elements(v_shopping_changes) WITH ORDINALITY e(c,o) GROUP BY c->'id') s;
    v_tables:='["shopping_list","products","purchase_prices","receipt_scans"]';

  ELSIF v_type='update_menu' THEN
    v_menu_edit:=private.update_menu(v_user,v_payload);
    v_tables:='["meal_plan_entries","weekly_meal_plans"]';

  ELSIF v_type='plan_recipe' THEN
    v_recipe:=public.resolve_stock_recipe((v_payload#>>'{recipe,id}')::uuid,coalesce(v_payload#>>'{recipe,source}','auto'));
    v_date:=(v_payload->>'date')::date; v_week:=v_date-(extract(isodow FROM v_date)::integer-1);
    IF v_date IS NULL OR (v_payload->>'servings')::numeric IS NULL OR (v_payload->>'servings')::numeric<=0 OR (v_payload->>'servings')::numeric>100 OR (v_payload->>'servings')::numeric<>trunc((v_payload->>'servings')::numeric) THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    -- V11-01 E1: the oldest plan of the week; a replaced meal is deleted, never rewritten in place,
    -- so no cooking link passes to the next meal; a cooked meal is not replaced.
    v_plan_id:=private.menu_plan_id(v_user,v_week,true);
    SELECT e.* INTO v_entry FROM public.meal_plan_entries e
    WHERE e.meal_plan_id=v_plan_id AND e.day_of_week=extract(isodow FROM v_date)::integer-1 AND e.meal_type=coalesce(v_payload->>'meal_type','dinner') FOR UPDATE;
    IF FOUND THEN
      IF v_entry.cooked_command_id IS NOT NULL THEN RAISE EXCEPTION 'MEAL_COOKED'; END IF;
      v_replaced:=to_jsonb(v_entry);
      -- V11-01 E3: the leftovers of a replaced meal go with it, named in the receipt.
      SELECT coalesce(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]') INTO v_leftovers FROM public.meal_plan_entries l WHERE l.leftover_of=v_entry.id;
      DELETE FROM public.meal_plan_entries WHERE leftover_of=v_entry.id;
      DELETE FROM public.meal_plan_entries WHERE id=v_entry.id;
    END IF;
    INSERT INTO public.meal_plan_entries(meal_plan_id,day_of_week,meal_type,recipe_id,recipe_reference,recipe_name,servings,prep_time,cook_time)
    VALUES(v_plan_id,extract(isodow FROM v_date)::integer-1,coalesce(v_payload->>'meal_type','dinner'),NULL,
      jsonb_build_object('id',v_recipe->>'id','source',v_recipe->>'source'),v_recipe->>'name',(v_payload->>'servings')::integer,
      (v_recipe->>'prep_time')::integer,(v_recipe->>'cook_time')::integer)
    RETURNING id,version INTO v_new_id,v_entry_version;
    v_tables:='["meal_plan_entries","weekly_meal_plans"]';
  END IF;

  v_result:=jsonb_strip_nulls(jsonb_build_object('command_id',v_id,'command_type',v_type,'status','confirmed',
    'affected_tables',v_tables,'inventory_ids',v_inventory_ids,'shopping_ids',v_shopping_ids,
    'recipe_id',v_recipe_id,'journal_id',v_journal_id,'user_recipe_id',v_wrapper_id,'meal_plan_id',v_plan_id,'meal_plan_entry_id',CASE WHEN v_type='plan_recipe' THEN v_new_id WHEN v_type='consume_recipe' THEN v_meal_entry ELSE NULL END,
    'entry_version',CASE WHEN v_type='plan_recipe' THEN v_entry_version END,
    'planned_reference',CASE WHEN v_type='plan_recipe' THEN jsonb_build_object('id',v_recipe->>'id','source',v_recipe->>'source') END,
    'replaced_entry',CASE WHEN v_type='plan_recipe' THEN v_replaced END,
    'shopping_changes',v_shopping_changes,
    'receipt_scan_id',CASE WHEN v_type='reconcile_receipt' THEN v_payload->>'receipt_scan_id' END,
    'changes',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.inventory_id,'before_quantity',coalesce((m.snapshot->>'quantity')::numeric,0),
      'after_quantity',coalesce(i.quantity,0),'unit',m.unit,'stock_version',coalesce(i.stock_version,m.version_after)) ORDER BY m.inventory_id),'[]')
      FROM public.stock_movements m LEFT JOIN public.inventory i ON i.id=m.inventory_id AND i.user_id=v_user
      WHERE m.user_id=v_user AND m.command_id=v_id)));
  -- V11-01 E3: the menu's images are kept whole, nulls included (jsonb_strip_nulls is recursive).
  IF v_type='plan_recipe' AND jsonb_array_length(coalesce(v_leftovers,'[]'))>0 THEN v_result:=v_result||jsonb_build_object('replaced_leftovers',v_leftovers); END IF;
  IF v_type='update_menu' THEN v_result:=v_result||jsonb_build_object('menu_edit',v_menu_edit); END IF;
  UPDATE public.stock_commands SET result=v_result WHERE user_id=v_user AND command_id=v_id;
  RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION private.execute_stock_command(jsonb,jsonb) FROM PUBLIC,anon;


-- Body of 20261125090000_v11_ingredient_product_links.sql; only the receipt_scans and purchase_prices keys are added.
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden: caller must match p_user_id'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'export_date', NOW(),
    'inventory', (SELECT jsonb_agg(row_to_json(i.*)) FROM public.inventory i WHERE i.user_id = p_user_id),
    'recipes', (SELECT jsonb_agg(row_to_json(r.*)) FROM public.recipes r WHERE r.user_id = p_user_id),
    'shopping_list', (SELECT jsonb_agg(row_to_json(s.*)) FROM public.shopping_list s WHERE s.user_id = p_user_id),
    'scan_history', (SELECT jsonb_agg(row_to_json(h.*)) FROM public.scan_history h WHERE h.user_id = p_user_id),
    'privacy_settings', (SELECT row_to_json(p.*) FROM public.user_privacy_settings p WHERE p.user_id = p_user_id),
    'menu_shopping_contributions', (SELECT jsonb_agg(row_to_json(c.*)) FROM public.menu_shopping_contributions c WHERE c.user_id = p_user_id),
    'ingredient_product_links', (SELECT jsonb_agg(row_to_json(k.*)) FROM public.ingredient_product_links k WHERE k.user_id = p_user_id),
    'receipt_scans', (SELECT jsonb_agg(row_to_json(t.*) ORDER BY t.created_at) FROM public.receipt_scans t WHERE t.user_id = p_user_id),
    'purchase_prices', (SELECT jsonb_agg(row_to_json(q.*) ORDER BY q.id) FROM public.purchase_prices q WHERE q.user_id = p_user_id)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- V11-01 E5a: the API sends reconcile_receipt only to a database that declares it.
CREATE OR REPLACE FUNCTION public.stock_routine_capabilities() RETURNS integer LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$ SELECT 7 $$;
NOTIFY pgrst, 'reload schema';

COMMIT;
