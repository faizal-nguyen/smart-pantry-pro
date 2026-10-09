-- V10-03: explicit, owner-scoped profiles, CAS writes, metadata and privacy.
BEGIN;

CREATE TABLE public.nutrition_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version bigint NOT NULL DEFAULT 1 CHECK(version>0),schema_version integer NOT NULL DEFAULT 1 CHECK(schema_version=1),
  settings jsonb NOT NULL,origin text NOT NULL CHECK(origin IN ('explicit','imported')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.nutrition_profile_commands (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,command_id uuid NOT NULL,
  request_hash text NOT NULL,version bigint NOT NULL CHECK(version>0),created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,command_id)
);
ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_profile_commands ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nutrition_profiles,public.nutrition_profile_commands FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.nutrition_profiles TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.nutrition_profile_commands TO authenticated;
GRANT ALL ON public.nutrition_profiles,public.nutrition_profile_commands TO service_role;
CREATE POLICY nutrition_profiles_own ON public.nutrition_profiles TO authenticated
  USING((select auth.uid())=user_id) WITH CHECK((select auth.uid())=user_id);
CREATE POLICY nutrition_commands_own ON public.nutrition_profile_commands TO authenticated
  USING((select auth.uid())=user_id) WITH CHECK((select auth.uid())=user_id);

CREATE FUNCTION public.valid_nutrition_profile(p_value jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE k text; v jsonb;
BEGIN
  IF jsonb_typeof(p_value)<>'object' OR octet_length(p_value::text)>32768
    OR p_value-ARRAY['consent','allergies','excludedIngredients','diets','likedIngredients','avoidedIngredients','cuisines','usualTimeMinutes','skill','equipment','usualServings','goals','targets','shareWithAssistant']<>'{}'::jsonb
    OR (SELECT count(*) FROM jsonb_object_keys(p_value))<>14 THEN RETURN false; END IF;
  IF jsonb_typeof(p_value->'consent')<>'boolean' OR jsonb_typeof(p_value->'shareWithAssistant')<>'boolean' THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['allergies','excludedIngredients','diets','likedIngredients','avoidedIngredients','cuisines','equipment','goals'] LOOP
    IF jsonb_typeof(p_value->k)<>'array' OR jsonb_array_length(p_value->k)>30 THEN RETURN false; END IF;
    FOR v IN SELECT value FROM jsonb_array_elements(p_value->k) LOOP
      IF jsonb_typeof(v)<>'string' OR length(v#>>'{}') NOT BETWEEN 1 AND 80 THEN RETURN false; END IF;
    END LOOP;
  END LOOP;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_value->'diets') x WHERE x NOT IN ('vegetarian','vegan','gluten_free','lactose_free','no_pork','no_alcohol','halal','kosher'))
    OR jsonb_array_length(p_value->'diets')>8 THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(p_value->'goals') x WHERE x NOT IN ('anti_waste','quick','variety','more_fiber','protein','vegetables'))
    OR jsonb_array_length(p_value->'goals')>6 THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['usualTimeMinutes','usualServings'] LOOP
    v=p_value->k;
    IF v<>'null'::jsonb AND (jsonb_typeof(v)<>'number' OR (v#>>'{}')::numeric<>trunc((v#>>'{}')::numeric)
      OR (v#>>'{}')::numeric<1 OR (v#>>'{}')::numeric>CASE WHEN k='usualServings' THEN 20 ELSE 600 END) THEN RETURN false; END IF;
  END LOOP;
  IF p_value->'skill'<>'null'::jsonb AND p_value->>'skill' NOT IN ('beginner','intermediate','advanced') THEN RETURN false; END IF;
  v=p_value->'targets';
  IF jsonb_typeof(v)<>'object' OR v-ARRAY['enabled','dailyCaloriesKcal','dailyProteinG']<>'{}'::jsonb
    OR (SELECT count(*) FROM jsonb_object_keys(v))<>3 OR jsonb_typeof(v->'enabled')<>'boolean' THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['dailyCaloriesKcal','dailyProteinG'] LOOP
    IF v->k<>'null'::jsonb AND (jsonb_typeof(v->k)<>'number' OR (v->>k)::numeric<1 OR (v->>k)::numeric>CASE WHEN k='dailyProteinG' THEN 1000 ELSE 20000 END) THEN RETURN false; END IF;
    IF v->>'enabled'='false' AND v->k<>'null'::jsonb THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END; $$;
ALTER TABLE public.nutrition_profiles ADD CONSTRAINT nutrition_profile_shape CHECK(public.valid_nutrition_profile(settings));

-- Even direct owned writes advance the version; it cannot be forged to bypass CAS.
CREATE FUNCTION public.version_nutrition_profile() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.user_id<>OLD.user_id THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||NEW.user_id::text,0));
  NEW.version=CASE WHEN TG_OP='INSERT' THEN 1 ELSE OLD.version+1 END;
  NEW.updated_at=clock_timestamp(); RETURN NEW;
END; $$;
CREATE TRIGGER nutrition_profile_version BEFORE INSERT OR UPDATE ON public.nutrition_profiles
  FOR EACH ROW EXECUTE FUNCTION public.version_nutrition_profile();
GRANT DELETE ON public.recipe_recommendation_cache TO authenticated;
CREATE POLICY recommendation_cache_delete_own ON public.recipe_recommendation_cache FOR DELETE TO authenticated USING((select auth.uid())=user_id);
CREATE FUNCTION public.invalidate_nutrition_profile() RETURNS trigger
LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  DELETE FROM public.recipe_recommendation_cache WHERE user_id=COALESCE(NEW.user_id,OLD.user_id);
  RETURN COALESCE(NEW,OLD);
END; $$;
CREATE TRIGGER nutrition_profile_invalidate AFTER INSERT OR UPDATE OR DELETE ON public.nutrition_profiles
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_nutrition_profile();

-- An in-flight recommendation must not recreate an erased or superseded
-- dietary cache after the profile transaction has committed.
CREATE FUNCTION public.guard_nutrition_cache_version() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE current_version bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||NEW.user_id::text,0));
  SELECT version INTO current_version FROM public.nutrition_profiles WHERE user_id=NEW.user_id;
  IF NEW.result_json->>'pipeline_version' IS DISTINCT FROM '3'
    OR NEW.result_json->>'profile_version' IS DISTINCT FROM COALESCE(current_version,0)::text THEN
    RAISE EXCEPTION 'PROFILE_VERSION_CONFLICT';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER nutrition_cache_version BEFORE INSERT OR UPDATE ON public.recipe_recommendation_cache
  FOR EACH ROW EXECUTE FUNCTION public.guard_nutrition_cache_version();

CREATE FUNCTION public.write_nutrition_profile(p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE u uuid=auth.uid(); cid uuid; expected bigint; operation text; current_version bigint;
  fingerprint text; previous public.nutrition_profile_commands%ROWTYPE; value jsonb; origin text;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF p_command IS NULL OR jsonb_typeof(p_command)<>'object' OR p_command-ARRAY['command_id','expected_version','operation','settings','origin']<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_PROFILE'; END IF;
  cid=(p_command->>'command_id')::uuid;expected=(p_command->>'expected_version')::bigint;operation=p_command->>'operation';origin=p_command->>'origin';
  IF cid IS NULL OR expected IS NULL OR expected<0 OR operation IS NULL OR operation NOT IN ('save','clear') OR origin IS NULL OR origin NOT IN ('explicit','imported') THEN RAISE EXCEPTION 'INVALID_PROFILE'; END IF;
  value=p_command->'settings';
  IF value IS NULL OR NOT public.valid_nutrition_profile(value) OR (operation='save' AND value->>'consent'<>'true') THEN RAISE EXCEPTION 'INVALID_PROFILE'; END IF;
  fingerprint=md5(p_command::text);
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  SELECT * INTO previous FROM public.nutrition_profile_commands WHERE user_id=u AND command_id=cid;
  IF FOUND THEN
    IF previous.request_hash<>fingerprint THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
    RETURN jsonb_build_object('version',previous.version);
  END IF;
  SELECT version INTO current_version FROM public.nutrition_profiles WHERE user_id=u FOR UPDATE;
  IF COALESCE(current_version,0)<>expected THEN RAISE EXCEPTION 'PROFILE_VERSION_CONFLICT'; END IF;
  IF operation='clear' THEN
    value='{"consent":false,"allergies":[],"excludedIngredients":[],"diets":[],"likedIngredients":[],"avoidedIngredients":[],"cuisines":[],"usualTimeMinutes":null,"skill":null,"equipment":[],"usualServings":null,"goals":[],"targets":{"enabled":false,"dailyCaloriesKcal":null,"dailyProteinG":null},"shareWithAssistant":false}'::jsonb;
    DELETE FROM public.user_meal_preferences WHERE user_id=u;
    DELETE FROM public.assistant_memory_items WHERE user_id=u AND (sensitivity='health_sensitive' OR kind IN ('preference','negative_preference','cooking_style','diet_goal','recipe_feedback','constraint'));
    DELETE FROM public.recipe_interactions WHERE user_id=u;
    DELETE FROM public.recommendation_events WHERE user_id=u;
    DELETE FROM public.assistant_action_log WHERE user_id=u AND tool IN ('suggest_recipes_for_context','find_cookable_recipes','find_recipes_using_ingredient');
    DELETE FROM public.nutrition_profile_commands WHERE user_id=u;
  END IF;
  INSERT INTO public.nutrition_profiles(user_id,settings,origin) VALUES(u,value,origin)
    ON CONFLICT(user_id) DO UPDATE SET settings=EXCLUDED.settings,origin=EXCLUDED.origin
    RETURNING version INTO current_version;
  INSERT INTO public.nutrition_profile_commands(user_id,command_id,request_hash,version) VALUES(u,cid,fingerprint,current_version);
  RETURN jsonb_build_object('version',current_version);
END; $$;
REVOKE ALL ON FUNCTION public.write_nutrition_profile(jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.write_nutrition_profile(jsonb) TO authenticated;

-- Existing recommendation journal, additive canonical reference for all origins.
ALTER TABLE public.recipe_interactions ADD COLUMN recipe_reference jsonb,ADD COLUMN feedback text,
  ADD COLUMN feedback_command_id uuid;
ALTER TABLE public.recipe_interactions ADD CONSTRAINT recommendation_feedback_kind CHECK(feedback IS NULL OR feedback IN ('repeat','dislike','too_long','not_today'));
CREATE UNIQUE INDEX recipe_feedback_identity ON public.recipe_interactions(user_id,feedback_command_id) WHERE feedback_command_id IS NOT NULL;
GRANT SELECT,INSERT,DELETE ON public.recipe_interactions,public.recommendation_events TO authenticated;
GRANT SELECT,DELETE ON public.assistant_memory_items,public.user_meal_preferences TO authenticated;
GRANT SELECT,DELETE ON public.assistant_action_log TO authenticated;
CREATE POLICY v10_personalized_read_receipts_delete_own ON public.assistant_action_log FOR DELETE TO authenticated
  USING((select auth.uid())=user_id AND tool IN ('suggest_recipes_for_context','find_cookable_recipes','find_recipes_using_ingredient'));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.recipe_recommendation_cache TO authenticated;
CREATE POLICY v10_feedback_delete_own ON public.recipe_interactions FOR DELETE TO authenticated USING((select auth.uid())=user_id);
CREATE POLICY v10_recommendations_delete_own ON public.recommendation_events FOR DELETE TO authenticated USING((select auth.uid())=user_id);
CREATE POLICY v10_memory_delete_own ON public.assistant_memory_items FOR DELETE TO authenticated USING((select auth.uid())=user_id);

CREATE FUNCTION public.record_recommendation_feedback(p_feedback jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE u uuid=auth.uid(); cid uuid; ref jsonb; kind text; event uuid; prior public.recipe_interactions%ROWTYPE; resolved jsonb;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF p_feedback IS NULL OR jsonb_typeof(p_feedback)<>'object' OR p_feedback-ARRAY['command_id','recipe','feedback','event_id']<>'{}'::jsonb THEN RAISE EXCEPTION 'INVALID_PROFILE'; END IF;
  cid=(p_feedback->>'command_id')::uuid;ref=p_feedback->'recipe';kind=p_feedback->>'feedback';event=nullif(p_feedback->>'event_id','')::uuid;
  IF cid IS NULL OR kind IS NULL OR ref IS NULL OR jsonb_typeof(ref)<>'object' OR ref-ARRAY['id','source']<>'{}'::jsonb OR ref->>'id' IS NULL OR ref->>'source' IS NULL OR kind NOT IN ('repeat','dislike','too_long','not_today') OR ref->>'source' NOT IN ('recipes','user_recipes','recipes_catalog') THEN RAISE EXCEPTION 'INVALID_PROFILE'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('v10-profile:'||u::text,0));
  SELECT * INTO prior FROM public.recipe_interactions WHERE user_id=u AND feedback_command_id=cid;
  IF FOUND THEN
    IF prior.recipe_reference<>ref OR prior.feedback<>kind OR prior.recommendation_event_id IS DISTINCT FROM event THEN RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT'; END IF;
    RETURN jsonb_build_object('id',prior.id);
  END IF;
  resolved=public.resolve_stock_recipe((ref->>'id')::uuid,ref->>'source');
  IF resolved IS NULL THEN RAISE EXCEPTION 'RECIPE_NOT_FOUND'; END IF;
  IF event IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.recommendation_events WHERE id=event AND user_id=u) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  INSERT INTO public.recipe_interactions(user_id,recipe_id,recipe_reference,feedback,feedback_command_id,recommendation_event_id,interaction_type)
    VALUES(u,CASE WHEN ref->>'source'='recipes' THEN (ref->>'id')::uuid ELSE NULL END,ref,kind,cid,event,
      CASE WHEN kind='repeat' THEN 'accepted' ELSE 'dismissed' END) RETURNING * INTO prior;
  DELETE FROM public.recipe_recommendation_cache WHERE user_id=u;
  RETURN jsonb_build_object('id',prior.id);
END; $$;
REVOKE ALL ON FUNCTION public.record_recommendation_feedback(jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.record_recommendation_feedback(jsonb) TO authenticated;

CREATE FUNCTION public.export_nutrition_personalization() RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE u uuid=auth.uid();
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('nutrition_profile',(SELECT to_jsonb(p) FROM public.nutrition_profiles p WHERE user_id=u),
    'assistant_memory',(SELECT COALESCE(jsonb_agg(to_jsonb(m)),'[]') FROM public.assistant_memory_items m WHERE user_id=u),
    'recommendation_interactions',(SELECT COALESCE(jsonb_agg(to_jsonb(i)),'[]') FROM public.recipe_interactions i WHERE user_id=u),
    'recommendation_events',(SELECT COALESCE(jsonb_agg(to_jsonb(e)),'[]') FROM public.recommendation_events e WHERE user_id=u),
    'recommendation_action_receipts',(SELECT COALESCE(jsonb_agg(to_jsonb(a)),'[]') FROM public.assistant_action_log a WHERE user_id=u AND tool IN ('suggest_recipes_for_context','find_cookable_recipes','find_recipes_using_ingredient')));
END; $$;
REVOKE ALL ON FUNCTION public.export_nutrition_personalization() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.export_nutrition_personalization() TO authenticated;

-- Completion of either existing deletion path must also remove new data, or fail.
CREATE FUNCTION public.delete_completed_personalization() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NEW.status='completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    DELETE FROM public.nutrition_profiles WHERE user_id=NEW.user_id;
    DELETE FROM public.nutrition_profile_commands WHERE user_id=NEW.user_id;
    DELETE FROM public.user_meal_preferences WHERE user_id=NEW.user_id;
    DELETE FROM public.recipe_interactions WHERE user_id=NEW.user_id;
    DELETE FROM public.recommendation_events WHERE user_id=NEW.user_id;
    DELETE FROM public.recipe_recommendation_cache WHERE user_id=NEW.user_id;
    DELETE FROM public.assistant_memory_items WHERE user_id=NEW.user_id;
    DELETE FROM public.assistant_action_log WHERE user_id=NEW.user_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER deletion_request_personalization BEFORE UPDATE OF status ON public.data_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION public.delete_completed_personalization();

ALTER TABLE public.inventory ADD COLUMN date_kind text NOT NULL DEFAULT 'unknown' CHECK(date_kind IN ('use_by','best_before','unknown')),
  ADD COLUMN quantity_quality text NOT NULL DEFAULT 'unknown' CHECK(quantity_quality IN ('measured','estimated','unknown'));
-- Existing dates/quantities are deliberately not guessed during migration.
ALTER TABLE public.recipes ADD COLUMN required_equipment text[],ADD COLUMN meal_style text CHECK(meal_style IN ('warm','fresh','comfort'));
ALTER TABLE public.recipes_catalog ADD COLUMN required_equipment text[],ADD COLUMN meal_style text CHECK(meal_style IN ('warm','fresh','comfort'));

-- Resolve the same effective personal ingredients before recommendation or consumption.
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
        v_canonical:=(v_recipe->>'id')::uuid;
        v_ingredients:=CASE WHEN jsonb_typeof(v_wrapper->'custom_ingredients_json')='array' THEN v_wrapper->'custom_ingredients_json' ELSE v_recipe->'ingredients_json' END;
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
-- Existing private atomic stock implementation; metadata is part of its receipt and inverse.
CREATE OR REPLACE FUNCTION private.execute_stock_command(p_command jsonb,p_allocations jsonb DEFAULT '[]') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  v_user uuid:=auth.uid(); v_id uuid; v_type text; v_payload jsonb; v_previous public.stock_commands%ROWTYPE;
  v_adjust jsonb; v_seen integer[]; v_item jsonb; v_ing jsonb; v_recipe jsonb; v_plan jsonb; v_result jsonb;
  v_inventory public.inventory%ROWTYPE; v_shopping public.shopping_list%ROWTYPE;
  v_movement public.stock_movements%ROWTYPE; v_product public.products%ROWTYPE;
  v_new_id uuid; v_recipe_id uuid; v_journal_id uuid; v_wrapper_id uuid; v_original_id uuid;
  v_quantity numeric; v_required numeric; v_total numeric; v_next numeric; v_unit text;
  v_version bigint; v_index integer; v_count integer; v_multiplier numeric;
  v_inventory_ids jsonb:='[]'; v_shopping_ids jsonb:='[]'; v_tables jsonb:='[]';
  v_date date; v_week date; v_plan_id uuid; v_ingredients jsonb;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  IF p_command IS NULL OR jsonb_typeof(p_command)<>'object' OR octet_length(p_command::text)>500000 THEN RAISE EXCEPTION 'INVALID_COMMAND'; END IF;
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
      IF v_required=0 AND EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(v_payload->'adjustments','[]')) a WHERE (a->>'ingredient_index')::integer=v_index AND (a->>'quantity')::numeric=0) THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_allocations) a WHERE (a->>'ingredient_index')::integer=v_index) THEN RAISE EXCEPTION 'INVALID_ALLOCATION'; END IF;
        CONTINUE;
      END IF;
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
      jsonb_build_object('servings',v_payload->'servings','recipe_reference',v_payload->'recipe','outside_inventory',v_payload->'outside_inventory','actual_ingredients',v_payload->'adjustments')) RETURNING id INTO v_journal_id;
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

CREATE OR REPLACE FUNCTION public.stock_routine_capabilities() RETURNS integer LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$ SELECT 3 $$;
-- Enable owner-filtered cross-device refresh where Supabase Realtime is installed.
DO $$ DECLARE table_name text; BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY['nutrition_profiles','recipe_interactions','inventory','recipes','user_recipes'] LOOP
      IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=table_name) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',table_name);
      END IF;
    END LOOP;
  END IF;
END; $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
