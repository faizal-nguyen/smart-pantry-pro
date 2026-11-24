-- V11-01 E1: the week's shopping from the menu (PRP V11-01, sections 4 and 5).
-- * meal_plan_entries.version (bumped on every update) and cooked_command_id (a planned meal is
--   cooked once, by consume_recipe linked to it);
-- * private.menu_basis: the meals a week's shopping counts (today to Sunday, uncooked; earlier
--   uncooked meals reserve the stock first, D3) and their version, shared by the preview
--   (public.menu_shopping_basis) and the command, so both compute the same tokens;
-- * menu_add_missing: confirmed against the day, the stock revision and the menu version; each add
--   is bounded by what the week's meals need and goes through the V11-05 aggregation primitive;
--   menu_shopping_contributions records the menu's share of each row (D2), which bounds a reduction;
--   undo_stock takes it all back;
-- * plan_recipe writes the oldest plan of a week, replaces a meal by a new row (never a cooked one)
--   and its undo restores the replaced meal under its own identity.
-- Same command as 20261123120000_v11_shopping_commands.sql otherwise. Additive, idempotent.
BEGIN;

ALTER TABLE public.meal_plan_entries ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;
ALTER TABLE public.meal_plan_entries ADD COLUMN IF NOT EXISTS cooked_command_id uuid;

CREATE OR REPLACE FUNCTION private.meal_entry_bump_version() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  NEW.version:=OLD.version+1;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS v11_meal_entry_version ON public.meal_plan_entries;
CREATE TRIGGER v11_meal_entry_version BEFORE UPDATE ON public.meal_plan_entries
  FOR EACH ROW EXECUTE FUNCTION private.meal_entry_bump_version();

CREATE TABLE IF NOT EXISTS public.menu_shopping_contributions(
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  command_id uuid NOT NULL,
  week_start_date date NOT NULL,
  shopping_id uuid NOT NULL,
  product_id uuid NOT NULL,
  -- Positive when the menu added to the row, negative when it reduced it; in the row's unit.
  quantity numeric NOT NULL,
  unit text,
  -- The row's version once written; NULL when the reduction removed it.
  line_version_after bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT menu_shopping_contributions_command_fkey FOREIGN KEY (user_id,command_id)
    REFERENCES public.stock_commands(user_id,command_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS menu_shopping_contributions_line_idx ON public.menu_shopping_contributions(user_id,week_start_date,shopping_id);
CREATE INDEX IF NOT EXISTS menu_shopping_contributions_command_idx ON public.menu_shopping_contributions(user_id,command_id);
ALTER TABLE public.menu_shopping_contributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS menu_shopping_contributions_read_own ON public.menu_shopping_contributions;
CREATE POLICY menu_shopping_contributions_read_own ON public.menu_shopping_contributions FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=user_id);
REVOKE ALL ON public.menu_shopping_contributions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.menu_shopping_contributions TO authenticated;

-- The day a week's shopping is prepared on: the pantry's calendar (PANTRY_TIME_ZONE).
CREATE OR REPLACE FUNCTION private.menu_today() RETURNS date
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT (now() AT TIME ZONE 'Europe/Paris')::date $$;

-- The plan of a week: the oldest one when a week has several (production, V11-01 E0).
CREATE OR REPLACE FUNCTION private.menu_plan_id(p_user uuid,p_week date,p_create boolean) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.weekly_meal_plans WHERE user_id=p_user AND week_start_date=p_week
  ORDER BY created_at NULLS LAST,id LIMIT 1 FOR UPDATE;
  IF v_id IS NULL AND p_create THEN
    INSERT INTO public.weekly_meal_plans(user_id,week_start_date) VALUES(p_user,p_week) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

-- The meals a week's shopping counts (D3): uncooked meals from today to the week's Sunday. Those of
-- the target week (from Monday, or today) are 'target'; earlier ones, from today, 'reserve' the stock
-- first. menu_version covers each meal's identity, version, recipe, servings, day and type.
CREATE OR REPLACE FUNCTION private.menu_basis(p_user uuid,p_week_start date,p_as_of date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_meals jsonb;
BEGIN
  IF p_week_start IS NULL OR extract(isodow FROM p_week_start)<>1 OR p_as_of IS NULL THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  WITH meals AS (
    SELECT e.id,e.version,w.week_start_date+e.day_of_week AS day,e.meal_type,e.recipe_reference,e.servings,e.recipe_name,
      CASE e.meal_type WHEN 'breakfast' THEN 0 WHEN 'lunch' THEN 1 WHEN 'dinner' THEN 2 ELSE 3 END AS meal_order
    FROM public.meal_plan_entries e JOIN public.weekly_meal_plans w ON w.id=e.meal_plan_id
    WHERE w.user_id=p_user AND e.cooked_command_id IS NULL
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'version',version,'date',day,'meal_type',meal_type,
      'recipe_reference',recipe_reference,'servings',servings,'recipe_name',recipe_name,
      'role',CASE WHEN day>=p_week_start THEN 'target' ELSE 'reserve' END) ORDER BY day,meal_order,id),'[]')
  INTO v_meals FROM meals WHERE day>=p_as_of AND day<=p_week_start+6;
  RETURN jsonb_build_object('week_start',p_week_start,'as_of',p_as_of,'meals',v_meals,'menu_version',md5(v_meals::text));
END $$;

-- The preview's basis for the signed-in account only, with the stock revision it was read at.
CREATE OR REPLACE FUNCTION public.menu_shopping_basis(p_week_start date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  RETURN private.menu_basis(v_user,p_week_start,private.menu_today())
    || jsonb_build_object('context_revision',coalesce((SELECT revision FROM public.stock_context_versions WHERE user_id=v_user),0));
END $$;
REVOKE ALL ON FUNCTION public.menu_shopping_basis(date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.menu_shopping_basis(date) TO authenticated;

-- What the target meals of a basis need of a product, in a unit (Rule C bound of an add): each
-- recipe at the meal's servings, matched like consume_recipe (linked product or same name).
CREATE OR REPLACE FUNCTION private.menu_gross_need(p_meals jsonb,p_product uuid,p_unit text) RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_meal jsonb; v_recipe jsonb; v_ing jsonb; v_name text; v_total numeric:=0; v_multiplier numeric; v_amount numeric;
BEGIN
  SELECT name INTO v_name FROM public.products WHERE id=p_product;
  FOR v_meal IN SELECT value FROM jsonb_array_elements(p_meals)
    WHERE value->>'role'='target' AND jsonb_typeof(value->'recipe_reference')='object' LOOP
    BEGIN
      v_recipe:=public.resolve_stock_recipe((v_meal#>>'{recipe_reference,id}')::uuid,coalesce(v_meal#>>'{recipe_reference,source}','auto'));
    EXCEPTION WHEN raise_exception THEN CONTINUE; -- A recipe deleted since: it needs nothing.
    END;
    v_multiplier:=(v_meal->>'servings')::numeric/nullif((v_recipe->>'servings')::numeric,0);
    IF v_multiplier IS NULL OR v_multiplier<=0 THEN CONTINUE; END IF;
    FOR v_ing IN SELECT value FROM jsonb_array_elements(v_recipe->'ingredients') LOOP
      IF (v_ing->>'quantity')::numeric IS NULL THEN CONTINUE; END IF;
      IF nullif(v_ing->>'inventory_product_id','')::uuid IS DISTINCT FROM p_product
        AND public.stock_ingredient_match_rank(v_ing->>'ingredient_name',v_name)=0 THEN CONTINUE; END IF;
      v_amount:=private.stock_quantity_in_unit_or_null((v_ing->>'quantity')::numeric*v_multiplier,v_ing->>'unit',p_unit);
      IF v_amount IS NOT NULL THEN v_total:=v_total+v_amount; END IF;
    END LOOP;
  END LOOP;
  RETURN v_total;
END $$;

-- Reduces a row by a quantity in its unit, journaled; a row brought to zero is removed.
CREATE OR REPLACE FUNCTION private.shopping_reduce(p_user uuid,p_command uuid,p_row public.shopping_list,p_quantity numeric) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_after public.shopping_list%ROWTYPE; v_next numeric:=trim_scale(round(p_row.quantity-p_quantity,9));
BEGIN
  IF v_next<=0.000000001 THEN
    DELETE FROM public.shopping_list WHERE id=p_row.id;
    INSERT INTO public.shopping_movements(user_id,command_id,shopping_id,kind,before,version_after)
    VALUES(p_user,p_command,p_row.id,'deleted',to_jsonb(p_row),NULL);
    RETURN private.shopping_change(p_row,'removed',p_quantity);
  END IF;
  UPDATE public.shopping_list SET quantity=v_next WHERE id=p_row.id RETURNING * INTO v_after;
  INSERT INTO public.shopping_movements(user_id,command_id,shopping_id,kind,before,version_after)
  VALUES(p_user,p_command,p_row.id,'updated',to_jsonb(p_row),v_after.stock_version);
  RETURN private.shopping_change(v_after,'reduced',p_quantity);
END $$;

-- menu_add_missing: the reviewed lines of a week's shopping, confirmed against the day, the stock
-- revision and the menu version read by the preview. Returns shopping_changes.
CREATE OR REPLACE FUNCTION private.menu_add_missing(p_user uuid,p_command uuid,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_adds jsonb:=p_payload->'adds'; v_reductions jsonb:=p_payload->'reductions';
  v_week date; v_basis jsonb; v_revision bigint; v_item jsonb; v_change jsonb; v_changes jsonb:='[]';
  v_product uuid; v_quantity numeric; v_unit text; v_row public.shopping_list%ROWTYPE;
  v_last public.menu_shopping_contributions%ROWTYPE; v_share numeric;
BEGIN
  IF jsonb_typeof(v_adds) IS DISTINCT FROM 'array' OR jsonb_typeof(v_reductions) IS DISTINCT FROM 'array'
    OR jsonb_array_length(v_adds)>100 OR jsonb_array_length(v_reductions)>100
    OR jsonb_array_length(v_adds)+jsonb_array_length(v_reductions)=0 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_adds||v_reductions) i WHERE jsonb_typeof(i)<>'object' OR i ? 'user_id') THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  v_week:=(p_payload->>'week_start')::date;
  -- The three tokens of the preview, checked before any write.
  IF (p_payload->>'as_of')::date IS DISTINCT FROM private.menu_today() THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
  SELECT revision INTO v_revision FROM public.stock_context_versions WHERE user_id=p_user FOR UPDATE;
  IF coalesce(v_revision,0) IS DISTINCT FROM (p_payload->>'context_revision')::bigint THEN RAISE EXCEPTION 'STOCK_CHANGED'; END IF;
  v_basis:=private.menu_basis(p_user,v_week,private.menu_today());
  IF v_basis->>'menu_version' IS DISTINCT FROM p_payload->>'menu_version' THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_adds) WITH ORDINALITY ORDER BY ordinality LOOP
    IF (v_item ? 'product_id')=(v_item ? 'name')
      OR (v_item ? 'target' AND (jsonb_typeof(v_item->'target')<>'object' OR NOT (v_item->'target') ? 'id' OR NOT (v_item->'target') ? 'expected_version')) THEN
      RAISE EXCEPTION 'INVALID_COMMAND';
    END IF;
    v_quantity:=(v_item->>'quantity')::numeric; v_unit:=nullif(btrim(v_item->>'unit'),'');
    IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity>1000000000 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    IF v_unit IS NULL THEN RAISE EXCEPTION 'UNIT_UNKNOWN'; END IF;
    IF v_item ? 'product_id' THEN
      v_product:=(v_item->>'product_id')::uuid;
      IF NOT EXISTS (SELECT 1 FROM public.products WHERE id=v_product) THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
    ELSE
      v_product:=private.shopping_resolve_product(v_item->>'name',NULL,v_unit);
    END IF;
    -- Rule C: never more than the week's meals need of this product.
    IF v_quantity>private.menu_gross_need(v_basis->'meals',v_product,v_unit)+0.000000001 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    v_change:=private.shopping_aggregate(p_user,p_command,v_product,v_quantity,v_unit,'increment',NULL,
      (v_item#>>'{target,id}')::uuid,(v_item#>>'{target,expected_version}')::bigint);
    INSERT INTO public.menu_shopping_contributions(user_id,command_id,week_start_date,shopping_id,product_id,quantity,unit,line_version_after)
    VALUES(p_user,p_command,v_week,(v_change->>'id')::uuid,v_product,(v_change->>'added_quantity')::numeric,v_change->>'unit',(v_change->>'stock_version')::bigint);
    v_changes:=v_changes||jsonb_build_array(v_change);
  END LOOP;

  -- D2: a reduction only takes back the menu's share of a row nobody changed since.
  IF (SELECT count(DISTINCT (value->>'id')::uuid) FROM jsonb_array_elements(v_reductions))<>jsonb_array_length(v_reductions) THEN RAISE EXCEPTION 'DUPLICATE_ITEM'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_reductions) ORDER BY value->>'id' LOOP
    IF NOT v_item ? 'expected_version' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    SELECT * INTO v_row FROM public.shopping_list WHERE id=(v_item->>'id')::uuid AND user_id=p_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
    IF v_row.is_purchased OR (v_item->>'expected_version')::bigint IS DISTINCT FROM v_row.stock_version THEN RAISE EXCEPTION 'CONFLICT'; END IF;
    SELECT * INTO v_last FROM public.menu_shopping_contributions
    WHERE user_id=p_user AND week_start_date=v_week AND shopping_id=v_row.id ORDER BY id DESC LIMIT 1;
    IF NOT FOUND OR v_last.line_version_after IS DISTINCT FROM v_row.stock_version THEN RAISE EXCEPTION 'CONFLICT'; END IF;
    SELECT coalesce(sum(quantity),0) INTO v_share FROM public.menu_shopping_contributions
    WHERE user_id=p_user AND week_start_date=v_week AND shopping_id=v_row.id;
    v_quantity:=(v_item->>'quantity')::numeric;
    IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    v_quantity:=private.stock_quantity_in_unit_or_null(v_quantity,v_item->>'unit',v_row.unit);
    IF v_quantity IS NULL THEN RAISE EXCEPTION 'UNIT_INCOMPATIBLE'; END IF;
    IF v_quantity>v_share+0.000000001 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    v_change:=private.shopping_reduce(p_user,p_command,v_row,v_quantity);
    INSERT INTO public.menu_shopping_contributions(user_id,command_id,week_start_date,shopping_id,product_id,quantity,unit,line_version_after)
    VALUES(p_user,p_command,v_week,v_row.id,v_row.product_id,-v_quantity,v_row.unit,(v_change->>'stock_version')::bigint);
    v_changes:=v_changes||jsonb_build_array(v_change);
  END LOOP;
  RETURN v_changes;
END $$;

REVOKE ALL ON FUNCTION private.meal_entry_bump_version() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_today() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_plan_id(uuid,date,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_basis(uuid,date,date) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_gross_need(jsonb,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.shopping_reduce(uuid,uuid,public.shopping_list,numeric) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.menu_add_missing(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;

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
  v_meal_entry uuid; v_entry_version bigint;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  IF p_command IS NULL OR jsonb_typeof(p_command)<>'object' OR octet_length(p_command::text)>500000 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  v_id:=(p_command->>'command_id')::uuid; v_type:=p_command->>'command_type'; v_payload:=p_command->'payload';
  IF v_id IS NULL OR (p_command->>'payload_version')::integer IS DISTINCT FROM 1 OR jsonb_typeof(v_payload)<>'object' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF v_payload ? 'user_id' OR p_command ? 'user_id' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF v_type NOT IN ('transfer_shopping','consume_recipe','consume_inventory','adjust_inventory','undo_stock','save_recipe','add_catalog_recipe','recipe_add_missing','plan_recipe',
    'shopping_add','shopping_check','shopping_update','shopping_remove','menu_add_missing') THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
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
      'recipe_add_missing','shopping_add','shopping_check','shopping_update','shopping_remove','menu_add_missing') THEN RAISE EXCEPTION 'COMMAND_NOT_FOUND'; END IF;
    IF EXISTS (SELECT 1 FROM public.stock_commands WHERE user_id=v_user AND reverses_command_id=v_original_id) THEN RAISE EXCEPTION 'ALREADY_UNDONE'; END IF;
    UPDATE public.stock_commands SET reverses_command_id=v_original_id WHERE user_id=v_user AND command_id=v_id;
  IF v_previous.command_type='plan_recipe' THEN
    -- The slot gets back the meal it replaced, or is emptied; not when it changed since.
    SELECT e.* INTO v_entry FROM public.meal_plan_entries e JOIN public.weekly_meal_plans w ON w.id=e.meal_plan_id
    WHERE e.id=(v_previous.result->>'meal_plan_entry_id')::uuid AND w.user_id=v_user FOR UPDATE OF e;
    IF NOT FOUND OR v_entry.recipe_reference IS DISTINCT FROM v_previous.result->'planned_reference'
      OR v_entry.servings IS DISTINCT FROM (v_previous.payload->>'servings')::integer THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
    IF v_previous.result ? 'entry_version' THEN
      -- V11-01 E1: the meal must still be the one planned (moved, cooked or edited: refused); the
      -- meal it replaced comes back exactly as it was, identity and version included, so that its
      -- own planning can be undone in turn.
      IF v_entry.version IS DISTINCT FROM (v_previous.result->>'entry_version')::bigint THEN RAISE EXCEPTION 'MENU_CHANGED'; END IF;
      DELETE FROM public.meal_plan_entries WHERE id=v_entry.id;
      IF v_previous.result ? 'replaced_entry' THEN
        INSERT INTO public.meal_plan_entries SELECT (jsonb_populate_record(NULL::public.meal_plan_entries,v_previous.result->'replaced_entry' ||
          jsonb_build_object('version',coalesce((v_previous.result#>>'{replaced_entry,version}')::bigint,0)))).*;
      END IF;
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
    'changes',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.inventory_id,'before_quantity',coalesce((m.snapshot->>'quantity')::numeric,0),
      'after_quantity',coalesce(i.quantity,0),'unit',m.unit,'stock_version',coalesce(i.stock_version,m.version_after)) ORDER BY m.inventory_id),'[]')
      FROM public.stock_movements m LEFT JOIN public.inventory i ON i.id=m.inventory_id AND i.user_id=v_user
      WHERE m.user_id=v_user AND m.command_id=v_id)));
  UPDATE public.stock_commands SET result=v_result WHERE user_id=v_user AND command_id=v_id;
  RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION private.execute_stock_command(jsonb,jsonb) FROM PUBLIC,anon;

-- V11-01 E1: the menu's contributions are part of the account's data export.
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
    'menu_shopping_contributions', (SELECT jsonb_agg(row_to_json(c.*)) FROM public.menu_shopping_contributions c WHERE c.user_id = p_user_id)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- V11-01 E1: the API sends menu_add_missing and meal-linked cooking only to a database that declares them.
CREATE OR REPLACE FUNCTION public.stock_routine_capabilities() RETURNS integer LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$ SELECT 5 $$;
NOTIFY pgrst, 'reload schema';

COMMIT;
