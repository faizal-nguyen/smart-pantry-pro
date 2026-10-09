-- V10-01: active web schema, not the obsolete API name/expiration_date schema.
-- Fail closed on schema drift; never replace a user table or delete duplicates.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory' AND column_name='expiry_date')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='shopping_list' AND column_name='is_purchased')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='recipe_ingredients' AND column_name='ingredient_name')
     OR to_regclass('public.user_recipes') IS NULL
     OR to_regclass('public.cooking_journal_entries') IS NULL THEN
    RAISE EXCEPTION 'V10_SCHEMA_MISMATCH: verify the active schema before applying V10-01';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_recipes WHERE is_from_catalog AND recipe_id IS NOT NULL GROUP BY user_id,recipe_id HAVING count(*)>1) THEN
    RAISE EXCEPTION 'V10_DUPLICATE_CATALOG: reconcile existing library duplicates without losing customizations first';
  END IF;
END $$;

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS unit text, ADD COLUMN IF NOT EXISTS stock_version bigint NOT NULL DEFAULT 0;
ALTER TABLE public.shopping_list ADD COLUMN IF NOT EXISTS unit text, ADD COLUMN IF NOT EXISTS stock_version bigint NOT NULL DEFAULT 0;
-- The old DECIMAL(10,2) ingredient column must not silently round new quantities.
ALTER TABLE public.recipe_ingredients ALTER COLUMN quantity TYPE numeric USING quantity::numeric;
UPDATE public.inventory i SET unit=p.unit_type FROM public.products p WHERE i.product_id=p.id AND i.unit IS NULL;
UPDATE public.shopping_list s SET unit=p.unit_type FROM public.products p WHERE s.product_id=p.id AND s.unit IS NULL;
ALTER TABLE public.cooking_journal_entries ADD COLUMN IF NOT EXISTS stock_command_id uuid, ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.meal_plan_entries ADD COLUMN IF NOT EXISTS recipe_reference jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS v10_user_catalog_unique ON public.user_recipes(user_id,recipe_id) WHERE is_from_catalog AND recipe_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS v10_journal_command_unique ON public.cooking_journal_entries(user_id,stock_command_id) WHERE stock_command_id IS NOT NULL;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
-- Locale-independent Unicode case conversion, including French Œ/œ.
CREATE COLLATION private.stock_text_case (provider=icu,locale='und',deterministic=true);

CREATE TABLE public.stock_commands (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  command_id uuid NOT NULL,
  command_type text NOT NULL,
  payload_version integer NOT NULL CHECK (payload_version=1),
  payload jsonb NOT NULL,
  result jsonb NOT NULL DEFAULT '{}',
  reverses_command_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,command_id)
);
CREATE UNIQUE INDEX stock_commands_single_inverse ON public.stock_commands(user_id,reverses_command_id) WHERE reverses_command_id IS NOT NULL;
ALTER TABLE public.stock_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_commands_select_own ON public.stock_commands FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
REVOKE ALL ON public.stock_commands FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stock_commands TO authenticated;

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  command_id uuid NOT NULL,
  inventory_id uuid NOT NULL,
  delta numeric NOT NULL,
  unit text NOT NULL,
  version_after bigint NOT NULL,
  snapshot jsonb NOT NULL,
  source_shopping jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(user_id,command_id) REFERENCES public.stock_commands(user_id,command_id) ON DELETE CASCADE
);
CREATE INDEX stock_movements_command ON public.stock_movements(user_id,command_id);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_movements_select_own ON public.stock_movements FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
REVOKE ALL ON public.stock_movements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.stock_movements TO authenticated;

CREATE OR REPLACE FUNCTION public.stock_normalize_name(p_value text) RETURNS text
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT btrim(regexp_replace(lower(regexp_replace(pg_catalog.normalize(p_value,'NFD'), U&'[\0300-\036f]', '', 'g') COLLATE private.stock_text_case), '\s+', ' ', 'g'))
$$;

CREATE OR REPLACE FUNCTION public.stock_unit(p_value text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT CASE public.stock_normalize_name(p_value)
    WHEN 'g' THEN '["mass",1]'::jsonb WHEN 'gr' THEN '["mass",1]'::jsonb
    WHEN 'gramme' THEN '["mass",1]'::jsonb WHEN 'grammes' THEN '["mass",1]'::jsonb
    WHEN 'gram' THEN '["mass",1]'::jsonb WHEN 'grams' THEN '["mass",1]'::jsonb
    WHEN 'kg' THEN '["mass",1000]'::jsonb WHEN 'kilo' THEN '["mass",1000]'::jsonb WHEN 'kilos' THEN '["mass",1000]'::jsonb
    WHEN 'kilogramme' THEN '["mass",1000]'::jsonb WHEN 'kilogrammes' THEN '["mass",1000]'::jsonb
    WHEN 'kilogram' THEN '["mass",1000]'::jsonb WHEN 'kilograms' THEN '["mass",1000]'::jsonb
    WHEN 'mg' THEN '["mass",0.001]'::jsonb WHEN 'milligramme' THEN '["mass",0.001]'::jsonb WHEN 'milligrammes' THEN '["mass",0.001]'::jsonb
    WHEN 'ml' THEN '["volume",1]'::jsonb WHEN 'millilitre' THEN '["volume",1]'::jsonb WHEN 'millilitres' THEN '["volume",1]'::jsonb
    WHEN 'milliliter' THEN '["volume",1]'::jsonb WHEN 'milliliters' THEN '["volume",1]'::jsonb
    WHEN 'cl' THEN '["volume",10]'::jsonb WHEN 'centilitre' THEN '["volume",10]'::jsonb WHEN 'centilitres' THEN '["volume",10]'::jsonb
    WHEN 'dl' THEN '["volume",100]'::jsonb WHEN 'decilitre' THEN '["volume",100]'::jsonb WHEN 'decilitres' THEN '["volume",100]'::jsonb
    WHEN 'l' THEN '["volume",1000]'::jsonb WHEN 'litre' THEN '["volume",1000]'::jsonb WHEN 'litres' THEN '["volume",1000]'::jsonb
    WHEN 'liter' THEN '["volume",1000]'::jsonb WHEN 'liters' THEN '["volume",1000]'::jsonb
    WHEN 'piece' THEN '["count",1]'::jsonb WHEN 'pieces' THEN '["count",1]'::jsonb WHEN 'unite' THEN '["count",1]'::jsonb
    WHEN 'unites' THEN '["count",1]'::jsonb WHEN 'unit' THEN '["count",1]'::jsonb WHEN 'units' THEN '["count",1]'::jsonb
    WHEN 'pcs' THEN '["count",1]'::jsonb WHEN 'pc' THEN '["count",1]'::jsonb WHEN 'u' THEN '["count",1]'::jsonb
    ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.stock_quantity_in_unit(p_quantity numeric,p_from text,p_to text) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE v_from jsonb := public.stock_unit(p_from); v_to jsonb := public.stock_unit(p_to);
BEGIN
  IF p_quantity IS NULL OR p_quantity::text IN ('NaN','Infinity','-Infinity') OR p_quantity<0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  IF v_from IS NULL OR v_to IS NULL THEN RAISE EXCEPTION 'UNIT_UNKNOWN'; END IF;
  IF v_from->>0 <> v_to->>0 THEN RAISE EXCEPTION 'UNIT_INCOMPATIBLE'; END IF;
  RETURN round(p_quantity*(v_from->>1)::numeric/(v_to->>1)::numeric,9);
END $$;

CREATE OR REPLACE FUNCTION public.stock_bump_version() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  NEW.stock_version := OLD.stock_version+1;
  RETURN NEW;
END $$;
CREATE TRIGGER v10_inventory_version BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.stock_bump_version();
CREATE TRIGGER v10_shopping_version BEFORE UPDATE ON public.shopping_list FOR EACH ROW EXECUTE FUNCTION public.stock_bump_version();

-- Context revisions also prevent a late cache writer from resurrecting stale results.
CREATE TABLE public.stock_context_versions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  revision bigint NOT NULL DEFAULT 0
);
ALTER TABLE public.stock_context_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_context_select_own ON public.stock_context_versions FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
REVOKE ALL ON public.stock_context_versions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.stock_context_versions TO authenticated;
INSERT INTO public.stock_context_versions(user_id) SELECT id FROM auth.users;
CREATE FUNCTION private.initialize_stock_context() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  INSERT INTO public.stock_context_versions(user_id) VALUES(NEW.id);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.initialize_stock_context() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER v10_user_context AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.initialize_stock_context();

CREATE OR REPLACE FUNCTION public.stock_snapshot_unit() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF nullif(btrim(NEW.unit),'') IS NULL THEN SELECT unit_type INTO NEW.unit FROM public.products WHERE id=NEW.product_id; END IF;
  IF nullif(btrim(NEW.unit),'') IS NULL THEN RAISE EXCEPTION 'UNIT_UNKNOWN'; END IF;
  IF NEW.quantity IS NULL OR NEW.quantity<0 OR NEW.quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER v10_inventory_unit BEFORE INSERT OR UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.stock_snapshot_unit();
CREATE TRIGGER v10_shopping_unit BEFORE INSERT OR UPDATE ON public.shopping_list FOR EACH ROW EXECUTE FUNCTION public.stock_snapshot_unit();

-- Invalidation happens in the same transaction, including writes from old clients.
CREATE OR REPLACE FUNCTION private.invalidate_stock_caches() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid; v_record jsonb; v_public boolean:=false;
BEGIN
  v_record:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  IF TG_TABLE_NAME='recipe_ingredients' THEN
    SELECT user_id,is_public INTO v_user,v_public FROM public.recipes WHERE id=(v_record->>'recipe_id')::uuid;
  ELSIF TG_TABLE_NAME='recipes_catalog' OR TG_TABLE_NAME='products' THEN v_public:=true;
  ELSE
    v_user:=(v_record->>'user_id')::uuid;
    IF TG_TABLE_NAME='recipes' THEN v_public:=coalesce((v_record->>'is_public')::boolean,false) OR (TG_OP='UPDATE' AND coalesce((to_jsonb(OLD)->>'is_public')::boolean,false)); END IF;
  END IF;
  IF v_public THEN
    UPDATE public.stock_context_versions SET revision=revision+1;
    DELETE FROM public.recipe_inventory_cache;
    DELETE FROM public.recipe_recommendation_cache;
  ELSIF v_user IS NOT NULL THEN
    UPDATE public.stock_context_versions SET revision=revision+1 WHERE user_id=v_user;
    DELETE FROM public.recipe_inventory_cache WHERE user_id=v_user;
    DELETE FROM public.recipe_recommendation_cache WHERE user_id=v_user;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.invalidate_stock_caches() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER v10_inventory_cache AFTER INSERT OR UPDATE OR DELETE ON public.inventory FOR EACH ROW EXECUTE FUNCTION private.invalidate_stock_caches();
CREATE TRIGGER v10_shopping_cache AFTER INSERT OR UPDATE OR DELETE ON public.shopping_list FOR EACH ROW EXECUTE FUNCTION private.invalidate_stock_caches();
CREATE TRIGGER v10_library_cache AFTER INSERT OR UPDATE OR DELETE ON public.user_recipes FOR EACH ROW EXECUTE FUNCTION private.invalidate_stock_caches();
CREATE TRIGGER v10_recipe_cache AFTER INSERT OR UPDATE OR DELETE ON public.recipes FOR EACH ROW EXECUTE FUNCTION private.invalidate_stock_caches();
CREATE TRIGGER v10_ingredients_cache AFTER INSERT OR UPDATE OR DELETE ON public.recipe_ingredients FOR EACH ROW EXECUTE FUNCTION private.invalidate_stock_caches();
CREATE TRIGGER v10_catalog_cache AFTER UPDATE OR DELETE ON public.recipes_catalog FOR EACH ROW EXECUTE FUNCTION private.invalidate_stock_caches();
CREATE TRIGGER v10_product_cache AFTER UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION private.invalidate_stock_caches();

-- Shared recipe identity: explicit ownership even when called by privileged code.
CREATE OR REPLACE FUNCTION public.resolve_stock_recipe(p_recipe_id uuid,p_source text DEFAULT 'auto') RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_user uuid:=auth.uid(); v_recipe jsonb; v_wrapper jsonb; v_raw jsonb;
  v_ingredients jsonb; v_ingredient jsonb; v_result jsonb; v_source text; v_canonical uuid;
  v_multiplier numeric:=1; v_amount numeric; v_normalized jsonb:='[]';
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  IF p_source NOT IN ('auto','recipes','user_recipes','recipes_catalog') THEN RAISE EXCEPTION 'INVALID_RECIPE_SOURCE'; END IF;
  IF p_source IN ('auto','recipes') THEN
    SELECT to_jsonb(r) INTO v_recipe FROM public.recipes r WHERE r.id=p_recipe_id AND (r.user_id=v_user OR r.is_public);
    IF FOUND THEN
      v_source:='recipes'; v_canonical:=p_recipe_id;
      SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.order_index NULLS LAST,i.id),'[]') INTO v_ingredients FROM public.recipe_ingredients i WHERE i.recipe_id=p_recipe_id;
    END IF;
  END IF;
  IF v_recipe IS NULL AND p_source IN ('auto','user_recipes') THEN
    SELECT to_jsonb(u) INTO v_wrapper FROM public.user_recipes u WHERE u.id=p_recipe_id AND u.user_id=v_user;
    IF FOUND THEN
      v_source:='user_recipes';
      IF (v_wrapper->>'is_from_catalog')::boolean THEN
        SELECT to_jsonb(c) INTO v_recipe FROM public.recipes_catalog c WHERE c.id=(v_wrapper->>'recipe_id')::uuid;
        IF v_recipe IS NULL THEN RAISE EXCEPTION 'RECIPE_NOT_FOUND'; END IF;
        v_canonical:=(v_recipe->>'id')::uuid; v_ingredients:=v_recipe->'ingredients_json';
      ELSE
        v_canonical:=p_recipe_id;
        v_recipe:=jsonb_build_object('title',v_wrapper->>'custom_title','instructions',v_wrapper->>'custom_instructions','servings',4,'prep_time',0,'cook_time',0);
        v_ingredients:=v_wrapper->'custom_ingredients_json';
      END IF;
      IF jsonb_typeof(v_wrapper#>'{custom_modifications,ingredients_override}')='array' THEN v_ingredients:=v_wrapper#>'{custom_modifications,ingredients_override}'; END IF;
      v_multiplier:=coalesce((v_wrapper#>>'{custom_modifications,servings_multiplier}')::numeric,1);
      IF v_multiplier<=0 OR v_multiplier::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      v_recipe:=v_recipe || jsonb_build_object('name',coalesce(nullif(v_wrapper#>>'{custom_modifications,title}',''),nullif(v_wrapper->>'custom_title',''),v_recipe->>'title'),
        'instructions',coalesce(v_recipe->>'instructions','') || CASE WHEN nullif(v_wrapper#>>'{custom_modifications,instructions_append}','') IS NULL THEN '' ELSE E'\n' || (v_wrapper#>>'{custom_modifications,instructions_append}') END);
    END IF;
  END IF;
  IF v_recipe IS NULL AND p_source IN ('auto','recipes_catalog') THEN
    SELECT to_jsonb(c) INTO v_recipe FROM public.recipes_catalog c WHERE c.id=p_recipe_id;
    IF FOUND THEN v_source:='recipes_catalog'; v_canonical:=p_recipe_id; v_ingredients:=v_recipe->'ingredients_json'; END IF;
  END IF;
  IF v_recipe IS NULL THEN RAISE EXCEPTION 'RECIPE_NOT_FOUND'; END IF;
  v_raw:=jsonb_build_object('recipe',v_recipe,'wrapper',v_wrapper,'ingredients',v_ingredients);
  FOR v_ingredient IN SELECT value FROM jsonb_array_elements(coalesce(v_ingredients,'[]')) LOOP
    v_amount:=NULL;
    IF coalesce(v_ingredient->>'quantity',v_ingredient->>'amount','') ~ '^[0-9]+([.,][0-9]+)?$' THEN
      v_amount:=replace(coalesce(v_ingredient->>'quantity',v_ingredient->>'amount'),',','.')::numeric*v_multiplier;
    END IF;
    v_normalized:=v_normalized || jsonb_build_array(jsonb_build_object(
      'ingredient_name',coalesce(v_ingredient->>'ingredient_name',v_ingredient->>'name',''),
      'quantity',v_amount,'unit',v_ingredient->>'unit','is_essential',coalesce((v_ingredient->>'is_essential')::boolean,true),
      'inventory_product_id',coalesce(v_ingredient->>'inventory_product_id',v_ingredient->>'product_id')));
  END LOOP;
  v_result:=jsonb_build_object('id',p_recipe_id,'source',v_source,'canonicalId',v_canonical,
    'name',coalesce(v_recipe->>'name',v_recipe->>'title'),'servings',coalesce((v_recipe->>'servings')::numeric,4)*v_multiplier,
    'prep_time',coalesce((v_recipe->>'prep_time')::integer,0),'cook_time',coalesce((v_recipe->>'cook_time')::integer,0),
    'version',md5(v_raw::text),'ingredients',v_normalized);
  RETURN v_result;
END $$;

-- Only this private function may write receipts/movements/journal as one unit.
-- The public entry point is invoker, with an authenticated-only execute grant.
CREATE OR REPLACE FUNCTION private.execute_stock_command(p_command jsonb,p_allocations jsonb DEFAULT '[]') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_user uuid:=auth.uid(); v_id uuid; v_type text; v_payload jsonb; v_previous public.stock_commands%ROWTYPE;
  v_item jsonb; v_ing jsonb; v_recipe jsonb; v_plan jsonb; v_result jsonb;
  v_inventory public.inventory%ROWTYPE; v_shopping public.shopping_list%ROWTYPE;
  v_movement public.stock_movements%ROWTYPE; v_product public.products%ROWTYPE;
  v_new_id uuid; v_recipe_id uuid; v_journal_id uuid; v_wrapper_id uuid; v_original_id uuid;
  v_quantity numeric; v_required numeric; v_total numeric; v_next numeric; v_unit text;
  v_version bigint; v_index integer; v_count integer; v_multiplier numeric;
  v_inventory_ids jsonb:='[]'; v_shopping_ids jsonb:='[]'; v_tables jsonb:='[]';
  v_date date; v_week date; v_plan_id uuid; v_ingredients jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  IF jsonb_typeof(p_command)<>'object' OR octet_length(p_command::text)>500000 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  v_id:=(p_command->>'command_id')::uuid; v_type:=p_command->>'command_type'; v_payload:=p_command->'payload';
  IF v_id IS NULL OR (p_command->>'payload_version')::integer IS DISTINCT FROM 1 OR jsonb_typeof(v_payload)<>'object' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF v_payload ? 'user_id' OR p_command ? 'user_id' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
  IF v_type NOT IN ('transfer_shopping','consume_recipe','consume_inventory','adjust_inventory','undo_stock','save_recipe','add_catalog_recipe','recipe_add_missing','plan_recipe') THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
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
      v_unit:=coalesce(v_shopping.unit,v_product.unit_type);
      IF nullif(btrim(v_unit),'') IS NULL THEN RAISE EXCEPTION 'UNIT_UNKNOWN'; END IF;
      INSERT INTO public.inventory(user_id,product_id,quantity,unit,location,expiry_date)
      VALUES(v_user,v_shopping.product_id,v_shopping.quantity,v_unit,v_item->>'location',nullif(v_item->>'expiry_date','')::date)
      RETURNING id,stock_version INTO v_new_id,v_version;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot,source_shopping)
      VALUES(v_user,v_id,v_new_id,v_shopping.quantity,v_unit,v_version,'{}',to_jsonb(v_shopping));
      DELETE FROM public.shopping_list WHERE id=v_shopping.id AND user_id=v_user;
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_new_id); v_shopping_ids:=v_shopping_ids||jsonb_build_array(v_shopping.id);
    END LOOP;
    v_tables:='["inventory","shopping_list"]';

  ELSIF v_type='consume_recipe' THEN
    v_recipe:=public.resolve_stock_recipe((v_payload#>>'{recipe,id}')::uuid,coalesce(v_payload#>>'{recipe,source}','auto'));
    IF v_recipe->>'version' IS DISTINCT FROM v_payload->>'recipe_version' THEN RAISE EXCEPTION 'RECIPE_CHANGED'; END IF;
    v_multiplier:=(v_payload->>'servings')::numeric/(v_recipe->>'servings')::numeric;
    IF v_multiplier IS NULL OR v_multiplier<=0 OR v_multiplier::text IN ('NaN','Infinity','-Infinity') OR (v_payload->>'servings')::numeric>100 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    IF jsonb_typeof(p_allocations)<>'array' OR jsonb_array_length(p_allocations)>1000 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    IF jsonb_typeof(v_payload->'outside_inventory')<>'array' THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    v_ingredients:=v_recipe->'ingredients';
    IF jsonb_array_length(v_ingredients) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'INVALID_RECIPE'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_payload->'outside_inventory') n WHERE n::integer<0 OR n::integer>=jsonb_array_length(v_ingredients)) THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    -- Deterministic row locking, then revalidate every allocation in the DB.
    PERFORM id FROM public.inventory WHERE user_id=v_user AND id IN
      (SELECT (value->>'inventory_id')::uuid FROM jsonb_array_elements(p_allocations)) ORDER BY id FOR UPDATE;
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_allocations) LOOP
      v_index:=(v_item->>'ingredient_index')::integer;
      IF v_index IS NULL OR v_index<0 OR v_index>=jsonb_array_length(v_ingredients)
        OR v_payload->'outside_inventory' @> jsonb_build_array(v_index) THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
      v_ing:=v_ingredients->v_index;
      SELECT * INTO v_inventory FROM public.inventory WHERE id=(v_item->>'inventory_id')::uuid AND user_id=v_user;
      IF NOT FOUND THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
      IF (v_item->>'expected_version')::bigint IS DISTINCT FROM v_inventory.stock_version THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      SELECT * INTO STRICT v_product FROM public.products WHERE id=v_inventory.product_id;
      v_unit:=coalesce(v_inventory.unit,v_product.unit_type);
      IF v_item->>'unit' IS DISTINCT FROM v_unit THEN RAISE EXCEPTION 'CONFLICT'; END IF;
      IF nullif(v_ing->>'inventory_product_id','') IS NOT NULL THEN
        IF (v_ing->>'inventory_product_id')::uuid<>v_inventory.product_id THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
      ELSIF public.stock_normalize_name(v_ing->>'ingredient_name') IS DISTINCT FROM public.stock_normalize_name(v_product.name) THEN
        RAISE EXCEPTION 'INVALID_ALLOCATION';
      END IF;
      v_quantity:=(v_item->>'quantity')::numeric;
      IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      PERFORM public.stock_quantity_in_unit(v_quantity,v_unit,v_ing->>'unit');
    END LOOP;
    FOR v_ing,v_index IN SELECT value,ordinality::integer-1 FROM jsonb_array_elements(v_ingredients) WITH ORDINALITY LOOP
      IF v_payload->'outside_inventory' @> jsonb_build_array(v_index) THEN CONTINUE; END IF;
      v_required:=(v_ing->>'quantity')::numeric*v_multiplier;
      IF v_required IS NULL OR v_required<=0 THEN RAISE EXCEPTION 'QUANTITY_UNKNOWN'; END IF;
      SELECT coalesce(sum(public.stock_quantity_in_unit((value->>'quantity')::numeric,value->>'unit',v_ing->>'unit')),0)
      INTO v_total FROM jsonb_array_elements(p_allocations) WHERE (value->>'ingredient_index')::integer=v_index;
      IF abs(v_total-v_required)>0.000000001 THEN RAISE EXCEPTION 'INSUFFICIENT_QUANTITY'; END IF;
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
      jsonb_build_object('servings',v_payload->'servings','recipe_reference',v_payload->'recipe','outside_inventory',v_payload->'outside_inventory')) RETURNING id INTO v_journal_id;
    IF v_recipe->>'source'='user_recipes' THEN UPDATE public.user_recipes SET times_cooked=coalesce(times_cooked,0)+1,last_cooked_date=now() WHERE id=(v_recipe->>'id')::uuid AND user_id=v_user; END IF;
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
        expiry_date=CASE WHEN v_item ? 'expiry_date' THEN nullif(v_item->>'expiry_date','')::date ELSE expiry_date END
      WHERE id=v_inventory.id AND user_id=v_user RETURNING stock_version INTO v_version;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot)
      VALUES(v_user,v_id,v_inventory.id,v_next-v_inventory.quantity,v_unit,v_version,to_jsonb(v_inventory));
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_inventory.id);
    END LOOP;
    v_tables:='["inventory"]';

  ELSIF v_type='undo_stock' THEN
    v_original_id:=(v_payload->>'original_command_id')::uuid;
    SELECT * INTO v_previous FROM public.stock_commands WHERE user_id=v_user AND command_id=v_original_id;
    IF NOT FOUND OR v_previous.command_type NOT IN ('consume_recipe','consume_inventory','adjust_inventory','transfer_shopping') THEN RAISE EXCEPTION 'COMMAND_NOT_FOUND'; END IF;
    IF EXISTS (SELECT 1 FROM public.stock_commands WHERE user_id=v_user AND reverses_command_id=v_original_id) THEN RAISE EXCEPTION 'ALREADY_UNDONE'; END IF;
    UPDATE public.stock_commands SET reverses_command_id=v_original_id WHERE user_id=v_user AND command_id=v_id;
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
          location=v_movement.snapshot->>'location',expiry_date=nullif(v_movement.snapshot->>'expiry_date','')::date
        WHERE id=v_inventory.id AND user_id=v_user RETURNING stock_version INTO v_version;
      END IF;
      INSERT INTO public.stock_movements(user_id,command_id,inventory_id,delta,unit,version_after,snapshot)
      VALUES(v_user,v_id,v_inventory.id,-v_movement.delta,v_movement.unit,v_version,to_jsonb(v_inventory));
      v_inventory_ids:=v_inventory_ids||jsonb_build_array(v_inventory.id);
    END LOOP;
    UPDATE public.cooking_journal_entries SET voided_at=now(),updated_at=now()
    WHERE user_id=v_user AND stock_command_id=v_original_id RETURNING id INTO v_journal_id;
    IF v_previous.command_type='consume_recipe' AND EXISTS (SELECT 1 FROM public.user_recipes WHERE id=(v_previous.payload#>>'{recipe,id}')::uuid AND user_id=v_user) THEN
      UPDATE public.user_recipes SET times_cooked=greatest(0,coalesce(times_cooked,0)-1),
        last_cooked_date=(SELECT max(cooked_at) FROM public.cooking_journal_entries WHERE user_id=v_user AND recipe_id=(v_previous.payload#>>'{recipe,id}')::uuid AND voided_at IS NULL)
      WHERE id=(v_previous.payload#>>'{recipe,id}')::uuid AND user_id=v_user;
    END IF;
    v_tables:='["inventory","shopping_list","cooking_journal","user_recipes"]';

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
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_allocations) LOOP
      v_index:=(v_item->>'ingredient_index')::integer; v_ing:=v_recipe->'ingredients'->v_index;
      IF v_ing IS NULL THEN RAISE EXCEPTION 'INVALID_INGREDIENT'; END IF;
      v_quantity:=(v_item->>'quantity')::numeric;
      IF v_quantity IS NULL OR v_quantity<=0 OR v_quantity::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'QUANTITY_UNKNOWN'; END IF;
      IF (v_ing->>'quantity')::numeric IS NULL OR (v_ing->>'quantity')::numeric<=0 THEN RAISE EXCEPTION 'QUANTITY_UNKNOWN'; END IF;
      PERFORM public.stock_quantity_in_unit(v_quantity,v_ing->>'unit',v_ing->>'unit');
      IF v_item->>'unit' IS DISTINCT FROM v_ing->>'unit' OR v_quantity>(v_ing->>'quantity')::numeric*v_multiplier THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      v_new_id:=nullif(v_ing->>'inventory_product_id','')::uuid;
      IF v_new_id IS NULL THEN SELECT id INTO v_new_id FROM public.products WHERE public.stock_normalize_name(name)=public.stock_normalize_name(v_ing->>'ingredient_name') ORDER BY id LIMIT 1; END IF;
      IF v_new_id IS NULL THEN INSERT INTO public.products(name,category,unit_type) VALUES(v_ing->>'ingredient_name','Autres',v_ing->>'unit') RETURNING id INTO v_new_id; END IF;
      INSERT INTO public.shopping_list(user_id,product_id,quantity,unit,is_purchased)
      VALUES(v_user,v_new_id,v_quantity,v_ing->>'unit',false) RETURNING id INTO v_recipe_id;
      v_shopping_ids:=v_shopping_ids||jsonb_build_array(v_recipe_id);
    END LOOP;
    v_recipe_id:=NULL; v_tables:='["shopping_list","products"]';

  ELSIF v_type='plan_recipe' THEN
    v_recipe:=public.resolve_stock_recipe((v_payload#>>'{recipe,id}')::uuid,coalesce(v_payload#>>'{recipe,source}','auto'));
    v_date:=(v_payload->>'date')::date; v_week:=v_date-(extract(isodow FROM v_date)::integer-1);
    IF v_date IS NULL OR (v_payload->>'servings')::numeric IS NULL OR (v_payload->>'servings')::numeric<=0 OR (v_payload->>'servings')::numeric>100 OR (v_payload->>'servings')::numeric<>trunc((v_payload->>'servings')::numeric) THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
    SELECT id INTO v_plan_id FROM public.weekly_meal_plans WHERE user_id=v_user AND week_start_date=v_week ORDER BY id LIMIT 1 FOR UPDATE;
    IF v_plan_id IS NULL THEN INSERT INTO public.weekly_meal_plans(user_id,week_start_date) VALUES(v_user,v_week) RETURNING id INTO v_plan_id; END IF;
    INSERT INTO public.meal_plan_entries(meal_plan_id,day_of_week,meal_type,recipe_id,recipe_reference,recipe_name,servings,prep_time,cook_time)
    VALUES(v_plan_id,extract(isodow FROM v_date)::integer-1,coalesce(v_payload->>'meal_type','dinner'),NULL,
      jsonb_build_object('id',v_recipe->>'id','source',v_recipe->>'source'),v_recipe->>'name',(v_payload->>'servings')::integer,
      (v_recipe->>'prep_time')::integer,(v_recipe->>'cook_time')::integer)
    ON CONFLICT(meal_plan_id,day_of_week,meal_type) DO UPDATE SET recipe_id=NULL,recipe_reference=EXCLUDED.recipe_reference,
      recipe_name=EXCLUDED.recipe_name,servings=EXCLUDED.servings,prep_time=EXCLUDED.prep_time,cook_time=EXCLUDED.cook_time RETURNING id INTO v_new_id;
    v_tables:='["meal_plan_entries","weekly_meal_plans"]';
  END IF;

  v_result:=jsonb_strip_nulls(jsonb_build_object('command_id',v_id,'command_type',v_type,'status','confirmed',
    'affected_tables',v_tables,'inventory_ids',v_inventory_ids,'shopping_ids',v_shopping_ids,
    'recipe_id',v_recipe_id,'journal_id',v_journal_id,'user_recipe_id',v_wrapper_id,'meal_plan_id',v_plan_id,'meal_plan_entry_id',CASE WHEN v_type='plan_recipe' THEN v_new_id ELSE NULL END,
    'changes',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.inventory_id,'before_quantity',coalesce((m.snapshot->>'quantity')::numeric,0),
      'after_quantity',coalesce(i.quantity,0),'unit',m.unit,'stock_version',coalesce(i.stock_version,m.version_after)) ORDER BY m.inventory_id),'[]')
      FROM public.stock_movements m LEFT JOIN public.inventory i ON i.id=m.inventory_id AND i.user_id=v_user
      WHERE m.user_id=v_user AND m.command_id=v_id)));
  UPDATE public.stock_commands SET result=v_result WHERE user_id=v_user AND command_id=v_id;
  RETURN v_result;
END $$;
REVOKE ALL ON FUNCTION private.execute_stock_command(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.execute_stock_command(jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.execute_stock_command(p_command jsonb,p_allocations jsonb DEFAULT '[]') RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.execute_stock_command(p_command,p_allocations) $$;
REVOKE ALL ON FUNCTION public.execute_stock_command(jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.execute_stock_command(jsonb,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.resolve_stock_recipe(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_stock_recipe(uuid,text) TO authenticated;

-- Close the historical direct-RPC identity and negative-amount holes.
CREATE OR REPLACE FUNCTION public.consume_inventory_item(p_item_id uuid,p_user_id uuid,p_amount numeric) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_item public.inventory%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  IF p_amount IS NULL OR p_amount<=0 OR p_amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  SELECT * INTO v_item FROM public.inventory WHERE id=p_item_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory item not found'; END IF;
  IF v_item.quantity<p_amount THEN RAISE EXCEPTION 'Insufficient quantity'; END IF;
  UPDATE public.inventory SET quantity=quantity-p_amount WHERE id=p_item_id AND user_id=auth.uid() RETURNING * INTO v_item;
  RETURN to_jsonb(v_item);
END $$;
REVOKE ALL ON FUNCTION public.consume_inventory_item(uuid,uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_inventory_item(uuid,uuid,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.transfer_inventory(p_from_item_id uuid,p_to_item_id uuid,p_user_id uuid,p_amount numeric) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE v_from public.inventory%ROWTYPE; v_to public.inventory%ROWTYPE; v_from_unit text; v_to_unit text; v_amount numeric;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  IF p_from_item_id=p_to_item_id OR p_amount IS NULL OR p_amount<=0 OR p_amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  PERFORM id FROM public.inventory WHERE id IN (p_from_item_id,p_to_item_id) AND user_id=auth.uid() ORDER BY id FOR UPDATE;
  SELECT * INTO v_from FROM public.inventory WHERE id=p_from_item_id AND user_id=auth.uid();
  SELECT * INTO v_to FROM public.inventory WHERE id=p_to_item_id AND user_id=auth.uid();
  IF v_from.id IS NULL OR v_to.id IS NULL THEN RAISE EXCEPTION 'ITEM_NOT_FOUND'; END IF;
  IF v_from.product_id<>v_to.product_id THEN RAISE EXCEPTION 'INVALID_PRODUCT'; END IF;
  SELECT coalesce(v_from.unit,unit_type),coalesce(v_to.unit,unit_type) INTO v_from_unit,v_to_unit FROM public.products WHERE id=v_from.product_id;
  v_amount:=public.stock_quantity_in_unit(p_amount,v_from_unit,v_to_unit);
  IF v_from.quantity<p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_QUANTITY'; END IF;
  UPDATE public.inventory SET quantity=quantity-p_amount WHERE id=v_from.id AND user_id=auth.uid();
  UPDATE public.inventory SET quantity=quantity+v_amount WHERE id=v_to.id AND user_id=auth.uid();
  RETURN jsonb_build_object('success',true,'from_item_id',v_from.id,'to_item_id',v_to.id,'amount',p_amount);
END $$;
REVOKE ALL ON FUNCTION public.transfer_inventory(uuid,uuid,uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transfer_inventory(uuid,uuid,uuid,numeric) TO authenticated;
-- Obsolete list_id semantics: disable the old writer instead of retaining an unguarded definer API.
REVOKE ALL ON FUNCTION public.create_shopping_from_recipe(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;

NOTIFY pgrst,'reload schema';
