-- V10-03F F1: durable review, revisions and atomic imported recipe saves.
-- Local migration only until explicitly deployed. No source acquisition occurs.

-- Unknown portions/times/quantities remain NULL, never fictitious 1 or 0.
ALTER TABLE public.recipes ALTER COLUMN prep_time DROP NOT NULL;
ALTER TABLE public.recipes ALTER COLUMN prep_time DROP DEFAULT;
ALTER TABLE public.recipes ALTER COLUMN servings DROP NOT NULL;
ALTER TABLE public.recipes ALTER COLUMN servings DROP DEFAULT;
ALTER TABLE public.recipe_ingredients ALTER COLUMN quantity DROP NOT NULL;
ALTER TABLE public.recipe_ingredients ALTER COLUMN quantity DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.validate_imported_draft_v10(p_draft jsonb)
RETURNS void LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE v_item jsonb; v_key text; v_value numeric;
BEGIN
  IF p_draft IS NULL OR jsonb_typeof(p_draft)<>'object'
    OR jsonb_typeof(p_draft->'title') IS DISTINCT FROM 'string'
    OR length(COALESCE(p_draft->>'title','')) NOT BETWEEN 1 AND 300
    OR jsonb_typeof(p_draft->'ingredients') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_draft->'instructions') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_draft->'source') IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_draft->'confidence') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
  IF jsonb_array_length(p_draft->'ingredients')>100 OR jsonb_array_length(p_draft->'instructions')>100
    OR (p_draft->>'confidence')::numeric NOT BETWEEN 0 AND 1 THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
  IF COALESCE(p_draft#>>'{source,extractionMethod}','') NOT IN
    ('oembed','metadata','transcript','manual_text','screenshot_ocr','voice_dictation','ai_inference','video_multimodal')
    OR COALESCE(p_draft#>>'{source,importedAt}','')='' THEN RAISE EXCEPTION 'SOURCE_METHOD_INVALID'; END IF;
  IF p_draft ? 'description' AND (jsonb_typeof(p_draft->'description')<>'string' OR length(p_draft->>'description')>3000)
    THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
  FOR v_item IN SELECT x FROM jsonb_array_elements(p_draft->'ingredients') x LOOP
    IF jsonb_typeof(v_item)<>'object' OR jsonb_typeof(v_item->'name') IS DISTINCT FROM 'string'
      OR length(COALESCE(v_item->>'name','')) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
    IF v_item ? 'quantity' THEN
      IF jsonb_typeof(v_item->'quantity') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      IF (v_item->>'quantity')::numeric<0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    END IF;
    IF v_item ? 'unit' AND (jsonb_typeof(v_item->'unit')<>'string' OR length(v_item->>'unit')>50) THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
    IF v_item ? 'notes' AND (jsonb_typeof(v_item->'notes')<>'string' OR length(v_item->>'notes')>500) THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
    IF v_item ? 'isEssential' AND jsonb_typeof(v_item->'isEssential')<>'boolean' THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
  END LOOP;
  FOR v_item IN SELECT x FROM jsonb_array_elements(p_draft->'instructions') x LOOP
    IF jsonb_typeof(v_item)<>'object' OR jsonb_typeof(v_item->'description') IS DISTINCT FROM 'string'
      OR length(COALESCE(v_item->>'description','')) NOT BETWEEN 1 AND 2000
      OR jsonb_typeof(v_item->'step') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
    v_value:=(v_item->>'step')::numeric;
    IF v_value<1 OR v_value<>trunc(v_value) THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
  END LOOP;
  FOREACH v_key IN ARRAY ARRAY['servings','prepTimeMinutes','cookTimeMinutes','restTimeMinutes'] LOOP
    IF p_draft ? v_key THEN
      IF jsonb_typeof(p_draft->v_key) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
      v_value:=(p_draft->>v_key)::numeric;
      IF v_value<>trunc(v_value) OR v_value<0 OR v_value>1440 OR (v_key='servings' AND (v_value<1 OR v_value>50))
        THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.assess_imported_draft_quality_v10(
  p_draft jsonb, p_source_reviewed boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ingredients jsonb := CASE WHEN jsonb_typeof(p_draft->'ingredients')='array' THEN p_draft->'ingredients' ELSE '[]'::jsonb END;
  v_steps jsonb := CASE WHEN jsonb_typeof(p_draft->'instructions')='array' THEN p_draft->'instructions' ELSE '[]'::jsonb END;
  v_unknowns jsonb := '[]'::jsonb;
  v_item jsonb;
  v_index integer := 0;
  v_has_ingredients boolean;
  v_has_steps boolean;
  v_metadata_only boolean := COALESCE(p_draft#>>'{source,extractionMethod}', 'metadata') IN ('metadata','oembed','ai_inference');
  v_can_save boolean;
BEGIN
  v_has_ingredients := jsonb_array_length(v_ingredients)>0 AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_ingredients) x WHERE COALESCE(btrim(x->>'name'),'')='');
  v_has_steps := jsonb_array_length(v_steps)>0 AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_steps) x WHERE COALESCE(btrim(x->>'description'),'')='');
  IF COALESCE(btrim(p_draft->>'title'),'')='' THEN
    v_unknowns := v_unknowns || jsonb_build_array(jsonb_build_object('path','title','label','Nom du plat à compléter'));
  END IF;
  IF NOT v_has_ingredients THEN
    v_unknowns := v_unknowns || jsonb_build_array(jsonb_build_object('path','ingredients','label','Ingrédients à compléter depuis la source'));
  END IF;
  IF NOT v_has_steps THEN
    v_unknowns := v_unknowns || jsonb_build_array(jsonb_build_object('path','instructions','label','Étapes à compléter depuis la source'));
  END IF;
  IF v_metadata_only AND NOT COALESCE(p_source_reviewed,false) THEN
    v_unknowns := v_unknowns || jsonb_build_array(jsonb_build_object('path','source','label','Vérifier les ingrédients et les étapes dans la source'));
  END IF;
  FOR v_item IN SELECT x FROM jsonb_array_elements(v_ingredients) x LOOP
    IF jsonb_typeof(v_item->'quantity') IS DISTINCT FROM 'number' THEN
      v_unknowns := v_unknowns || jsonb_build_array(jsonb_build_object('path','ingredients.'||v_index||'.quantity','label','Quantité de '||COALESCE(v_item->>'name','cet ingrédient')||' à vérifier'));
    ELSIF (v_item->>'quantity')::numeric <= 0 THEN
      v_unknowns := v_unknowns || jsonb_build_array(jsonb_build_object('path','ingredients.'||v_index||'.quantity','label','Quantité de '||COALESCE(v_item->>'name','cet ingrédient')||' à vérifier'));
    END IF;
    IF COALESCE(btrim(v_item->>'unit'),'')='' THEN
      v_unknowns := v_unknowns || jsonb_build_array(jsonb_build_object('path','ingredients.'||v_index||'.unit','label','Unité de '||COALESCE(v_item->>'name','cet ingrédient')||' à vérifier'));
    END IF;
    v_index := v_index+1;
  END LOOP;
  IF p_draft->'servings' IS NULL OR p_draft->'servings'='null'::jsonb THEN
    v_unknowns := v_unknowns || jsonb_build_array(jsonb_build_object('path','servings','label','Nombre de portions à vérifier'));
  END IF;
  IF (p_draft->'prepTimeMinutes' IS NULL OR p_draft->'prepTimeMinutes'='null'::jsonb)
    AND (p_draft->'cookTimeMinutes' IS NULL OR p_draft->'cookTimeMinutes'='null'::jsonb) THEN
    v_unknowns := v_unknowns || jsonb_build_array(jsonb_build_object('path','duration','label','Durée de préparation et de cuisson à vérifier'));
  END IF;
  v_can_save := COALESCE(btrim(p_draft->>'title'),'')<>'' AND v_has_ingredients AND v_has_steps
    AND (NOT v_metadata_only OR COALESCE(p_source_reviewed,false));
  RETURN jsonb_build_object(
    'state',CASE WHEN NOT v_has_ingredients OR NOT v_has_steps THEN 'inspiration' WHEN jsonb_array_length(v_unknowns)>0 THEN 'needs_completion' ELSE 'reviewable' END,
    'unknowns',v_unknowns,'metadata_only',v_metadata_only,'can_save',v_can_save,
    'requires_acknowledgement',v_can_save AND jsonb_array_length(v_unknowns)>0);
END $$;

-- The SQL boundary uses the same conservative dietary vocabulary as the
-- deterministic importer. Replacement text (beef bacon/chorizo de boeuf) is
-- exempted; a direct RPC cannot persist pork/alcohol by omitting adaptations.
CREATE OR REPLACE FUNCTION public.import_dietary_violation_v10(p_text text)
RETURNS boolean LANGUAGE plpgsql STABLE
SET search_path = public, extensions, pg_temp
AS $$
DECLARE v_text text:=lower(unaccent(COALESCE(p_text,'')));
BEGIN
  v_text:=regexp_replace(v_text,'\m(beef[[:space:]]+bacon|bacon[[:space:]]+de[[:space:]]+boeuf|chorizo[[:space:]]+de[[:space:]]+boeuf|saucisson[[:space:]]+de[[:space:]]+boeuf)\M','','g');
  v_text:=regexp_replace(v_text,'\m(sans[[:space:]]+porc|sans[[:space:]]+alcool)\M','','g');
  RETURN v_text ~ '\m(porc|pork|lardons?|rillettes|pancetta|nduja|chorizo|jambon|spam|bacon|petit[[:space:]]+sale|chair[[:space:]]+a[[:space:]]+saucisse|vin[[:space:]]+(de[[:space:]]+(shaoxing|riz|cuisine)|blanc|rouge)|mirin|sake|sherry|xeres|biere|wine|beer|rhum|rum|vodka|whisky|whiskey|cognac|brandy)\M';
END $$;

CREATE OR REPLACE FUNCTION public.import_dietary_adaptations_v10(p_before jsonb,p_after jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE
SET search_path = public, pg_temp
AS $$
DECLARE v_result jsonb:='[]'::jsonb; v_item jsonb; v_next jsonb; v_idx bigint; v_field text;
BEGIN
  FOR v_item,v_idx IN SELECT x,idx-1 FROM jsonb_array_elements(p_before->'ingredients') WITH ORDINALITY a(x,idx) LOOP
    v_next:=p_after->'ingredients'->v_idx::integer;
    FOREACH v_field IN ARRAY ARRAY['name','notes'] LOOP
      IF public.import_dietary_violation_v10(v_item->>v_field)
        AND v_item->v_field IS DISTINCT FROM v_next->v_field THEN
        v_result:=v_result||jsonb_build_array(jsonb_build_object('path','ingredients.'||v_idx||'.'||v_field,
          'from',v_item->>v_field,'to',COALESCE(v_next->>v_field,'')));
      END IF;
    END LOOP;
  END LOOP;
  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.replace_social_import_draft(
  p_import_id uuid,
  p_expected_revision integer DEFAULT NULL,
  p_draft_json jsonb DEFAULT NULL,
  p_source_extraction_method text DEFAULT NULL,
  p_ai_model text DEFAULT NULL,
  p_ai_input_tokens integer DEFAULT NULL,
  p_ai_output_tokens integer DEFAULT NULL,
  p_cost_usd_estimate numeric DEFAULT NULL
) RETURNS public.imported_recipe_drafts
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_import public.social_recipe_imports%ROWTYPE;
  v_revision integer;
  v_draft jsonb;
  v_quality jsonb;
  v_result public.imported_recipe_drafts%ROWTYPE;
  v_current public.imported_recipe_drafts%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  SELECT * INTO v_import FROM public.social_recipe_imports WHERE id=p_import_id AND user_id=v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE='42501'; END IF;
  IF v_import.status IN ('saved','archived') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  PERFORM public.validate_imported_draft_v10(p_draft_json);
  IF p_draft_json IS NULL OR jsonb_typeof(p_draft_json)<>'object'
    OR jsonb_typeof(p_draft_json->'ingredients') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_draft_json->'instructions') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_draft_json->'ingredients')>100
    OR jsonb_array_length(p_draft_json->'instructions')>100
    OR COALESCE(btrim(p_draft_json->>'title'),'')='' THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
  IF COALESCE(p_draft_json#>>'{source,extractionMethod}','') NOT IN
    ('oembed','metadata','transcript','manual_text','screenshot_ocr','voice_dictation','ai_inference','video_multimodal')
    THEN RAISE EXCEPTION 'SOURCE_METHOD_INVALID'; END IF;
  SELECT COALESCE(max(version),0) INTO v_revision FROM public.imported_recipe_drafts WHERE import_id=p_import_id AND user_id=v_user_id;
  SELECT * INTO v_current FROM public.imported_recipe_drafts WHERE import_id=p_import_id AND user_id=v_user_id AND is_current;
  IF v_current.id IS NOT NULL AND p_expected_revision IS NULL THEN RAISE EXCEPTION 'REVISION_REQUIRED'; END IF;
  IF p_expected_revision IS NOT NULL AND p_expected_revision<>v_revision THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  v_draft := jsonb_set(p_draft_json,'{source}',COALESCE(p_draft_json->'source','{}'::jsonb)||jsonb_build_object(
    'platform',v_import.platform,'sourceUrl',v_import.source_url,'canonicalUrl',COALESCE(v_import.canonical_url,v_import.source_url)));
  IF v_current.id IS NOT NULL THEN
    -- An authenticated correction is not a new extraction receipt.
    v_draft:=jsonb_set(v_draft,'{source}',v_current.draft_json->'source')-'imageUrl';
    IF v_current.draft_json ? 'imageUrl' THEN v_draft:=v_draft||jsonb_build_object('imageUrl',v_current.draft_json->'imageUrl'); END IF;
    v_draft:=v_draft||jsonb_build_object('confidence',v_current.draft_json->'confidence');
    IF v_current.draft_json ? 'extractionWarnings' THEN v_draft:=v_draft||jsonb_build_object('extractionWarnings',v_current.draft_json->'extractionWarnings'); END IF;
  END IF;
  v_quality := public.assess_imported_draft_quality_v10(v_draft,false);
  UPDATE public.imported_recipe_drafts SET is_current=false WHERE import_id=p_import_id AND user_id=v_user_id AND is_current;
  INSERT INTO public.imported_recipe_drafts(import_id,user_id,draft_json,version,is_current,source_extraction_method,
    ai_model,ai_input_tokens,ai_output_tokens,cost_usd_estimate)
  VALUES(p_import_id,v_user_id,v_draft,v_revision+1,true,v_draft#>>'{source,extractionMethod}',
    p_ai_model,p_ai_input_tokens,p_ai_output_tokens,p_cost_usd_estimate) RETURNING * INTO v_result;
  UPDATE public.social_recipe_imports SET
    status=CASE WHEN v_quality->>'state'='reviewable' THEN 'draft_ready' ELSE 'needs_review' END,
    title=v_draft->>'title',author_name=v_draft#>>'{source,authorName}',author_handle=v_draft#>>'{source,authorHandle}',
    metadata=metadata||jsonb_build_object('review_quality',v_quality),error_code=NULL,error_message=NULL
  WHERE id=p_import_id AND user_id=v_user_id;
  RETURN v_result;
END $$;

CREATE OR REPLACE FUNCTION public.save_imported_recipe(p_import_id uuid,p_recipe jsonb,p_ingredients jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_import public.social_recipe_imports%ROWTYPE;
  v_current public.imported_recipe_drafts%ROWTYPE;
  v_recipe_id uuid;
  v_draft jsonb;
  v_quality jsonb;
  v_source jsonb;
  v_source_metadata jsonb;
  v_edited_fields jsonb;
  v_revision integer;
  v_item jsonb;
  v_key text;
  v_number numeric;
  v_tags text[];
  v_instructions text;
  v_adaptations jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  SELECT * INTO v_import FROM public.social_recipe_imports WHERE id=p_import_id AND user_id=v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE='42501'; END IF;
  -- Reconcile before validating a replay's old payload/revision.
  SELECT id INTO v_recipe_id FROM public.recipes WHERE user_id=v_user_id AND import_id=p_import_id LIMIT 1;
  IF v_recipe_id IS NOT NULL THEN
    UPDATE public.social_recipe_imports SET status='saved',recipe_id=v_recipe_id WHERE id=p_import_id AND user_id=v_user_id;
    RETURN v_recipe_id;
  END IF;
  IF v_import.status='saved' THEN RAISE EXCEPTION 'SAVE_RECEIPT_MISSING'; END IF;
  IF v_import.status IN ('archived','extracting','video_processing') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF p_recipe IS NULL OR jsonb_typeof(p_recipe)<>'object' THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
  SELECT * INTO v_current FROM public.imported_recipe_drafts
    WHERE import_id=p_import_id AND user_id=v_user_id AND is_current FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_DRAFT_AVAILABLE'; END IF;
  IF COALESCE(p_recipe->>'import_revision','')!~'^[0-9]+$' THEN RAISE EXCEPTION 'REVISION_REQUIRED'; END IF;
  IF (p_recipe->>'import_revision')::integer<>v_current.version THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  v_draft := CASE WHEN jsonb_typeof(p_recipe->'draft_json')='object' THEN p_recipe->'draft_json' ELSE v_current.draft_json END;
  -- Source/media receipt is immutable across correction and direct RPC calls.
  v_source := COALESCE(v_current.draft_json->'source','{}'::jsonb)||jsonb_build_object(
    'platform',v_import.platform,'sourceUrl',v_import.source_url,'canonicalUrl',COALESCE(v_import.canonical_url,v_import.source_url));
  v_draft := jsonb_set(v_draft,'{source}',v_source)-'imageUrl';
  IF v_current.draft_json ? 'imageUrl' THEN v_draft:=v_draft||jsonb_build_object('imageUrl',v_current.draft_json->'imageUrl'); END IF;
  IF v_current.draft_json ? 'confidence' THEN v_draft:=v_draft||jsonb_build_object('confidence',v_current.draft_json->'confidence'); END IF;
  IF v_current.draft_json ? 'extractionWarnings' THEN v_draft:=v_draft||jsonb_build_object('extractionWarnings',v_current.draft_json->'extractionWarnings'); END IF;
  PERFORM public.validate_imported_draft_v10(v_draft);
  IF jsonb_typeof(v_draft->'ingredients') IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_draft->'instructions') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'RECIPE_INCOMPLETE'; END IF;
  IF jsonb_array_length(v_draft->'ingredients')>100 OR jsonb_array_length(v_draft->'instructions')>100
    OR length(COALESCE(v_draft->>'title',''))>300 THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
  v_quality := public.assess_imported_draft_quality_v10(v_draft,COALESCE(p_recipe->'source_reviewed'='true'::jsonb,false));
  -- The API and DataAPI use the same user JWT. No extraction-method claim
  -- constitutes proof that the source was read: require a human attestation.
  IF p_recipe->'source_reviewed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'SOURCE_REVIEW_REQUIRED'; END IF;
  IF v_quality->>'can_save'<>'true' THEN
    RAISE EXCEPTION 'RECIPE_INCOMPLETE';
  END IF;
  IF v_quality->>'requires_acknowledgement'='true' AND p_recipe->'acknowledge_unknowns' IS DISTINCT FROM 'true'::jsonb
    THEN RAISE EXCEPTION 'UNKNOWN_FIELDS_REVIEW_REQUIRED'; END IF;
  v_adaptations:=public.import_dietary_adaptations_v10(v_current.draft_json,v_draft);
  IF jsonb_array_length(v_adaptations)>0
    AND p_recipe->'acknowledge_adaptations' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'ADAPTATIONS_REVIEW_REQUIRED'; END IF;
  FOR v_item IN SELECT x FROM jsonb_array_elements(v_draft->'ingredients') x LOOP
    IF public.import_dietary_violation_v10(v_item->>'name') OR public.import_dietary_violation_v10(v_item->>'notes')
      THEN RAISE EXCEPTION 'DIETARY_REVIEW_REQUIRED'; END IF;
    IF jsonb_typeof(v_item)<>'object' OR length(COALESCE(v_item->>'name',''))>200 THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
    IF v_item->'quantity' IS NOT NULL AND v_item->'quantity'<>'null'::jsonb THEN
      IF jsonb_typeof(v_item->'quantity')<>'number' THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
      IF (v_item->>'quantity')::numeric<=0 THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
    END IF;
  END LOOP;
  FOREACH v_key IN ARRAY ARRAY['servings','prepTimeMinutes','cookTimeMinutes','restTimeMinutes'] LOOP
    IF v_draft->v_key IS NOT NULL AND v_draft->v_key<>'null'::jsonb THEN
      IF jsonb_typeof(v_draft->v_key)<>'number' THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
      v_number:=(v_draft->>v_key)::numeric;
      IF v_number<>trunc(v_number) OR v_number<0 OR v_number>1440 OR (v_key='servings' AND (v_number<1 OR v_number>50))
        THEN RAISE EXCEPTION 'DRAFT_INVALID'; END IF;
    END IF;
  END LOOP;
  SELECT COALESCE(jsonb_agg(key ORDER BY key),'[]'::jsonb) INTO v_edited_fields
    FROM jsonb_object_keys(v_draft) key WHERE key NOT IN ('source','confidence','extractionWarnings','imageUrl')
      AND v_current.draft_json->key IS DISTINCT FROM v_draft->key;
  v_revision := v_current.version;
  IF v_draft IS DISTINCT FROM v_current.draft_json THEN
    UPDATE public.imported_recipe_drafts SET is_current=false WHERE id=v_current.id AND user_id=v_user_id;
    INSERT INTO public.imported_recipe_drafts(import_id,user_id,draft_json,version,is_current,source_extraction_method)
      VALUES(p_import_id,v_user_id,v_draft,v_revision+1,true,v_source->>'extractionMethod');
    v_revision:=v_revision+1;
  END IF;
  v_tags := CASE WHEN jsonb_typeof(p_recipe->'tags')='array' THEN ARRAY(SELECT jsonb_array_elements_text(p_recipe->'tags')) ELSE ARRAY[]::text[] END;
  SELECT string_agg((idx::text)||'. '||(x->>'description'),E'\n' ORDER BY idx) INTO v_instructions
    FROM jsonb_array_elements(v_draft->'instructions') WITH ORDINALITY AS a(x,idx);
  v_source_metadata := jsonb_build_object('personalNotes',CASE WHEN jsonb_typeof(p_recipe#>'{source_metadata,personalNotes}')='string'
    THEN left(p_recipe#>>'{source_metadata,personalNotes}',2000) ELSE NULL END)||jsonb_build_object(
    'canonicalUrl',v_source->'canonicalUrl','authorName',v_source->'authorName','authorHandle',v_source->'authorHandle',
    'authorUrl',v_source->'authorUrl','thumbnailUrl',v_source->'thumbnailUrl','originalTitle',v_source->'originalTitle',
    'originalDescription',v_source->'originalDescription','importedAt',v_source->'importedAt','extractionMethod',v_source->'extractionMethod',
    'confidence',v_draft->'confidence','extractionWarnings',v_draft->'extractionWarnings','instructions',v_draft->'instructions',
    'reviewQuality',v_quality,'adaptations',v_adaptations,
    'reviewConfirmations',jsonb_build_object('source_reviewed',true,
      'unknowns_acknowledged',COALESCE(p_recipe->'acknowledge_unknowns'='true'::jsonb,false),
      'adaptations_acknowledged',COALESCE(p_recipe->'acknowledge_adaptations'='true'::jsonb,false)),
    'editProvenance',jsonb_build_object('base_revision',v_current.version,'saved_revision',v_revision,
      'edited_fields',v_edited_fields,'reviewed_at',clock_timestamp(),'reviewed_by',v_user_id,
      'source_reviewed',COALESCE(p_recipe->'source_reviewed'='true'::jsonb,false)));
  INSERT INTO public.recipes(user_id,name,instructions,description,prep_time,cook_time,rest_time,servings,difficulty,
    cuisine_category,meal_type,tags,image_url,source_type,source_platform,source_url,source_metadata,import_id)
  VALUES(v_user_id,btrim(v_draft->>'title'),v_instructions,v_draft->>'description',
    (v_draft->>'prepTimeMinutes')::integer,(v_draft->>'cookTimeMinutes')::integer,(v_draft->>'restTimeMinutes')::integer,
    (v_draft->>'servings')::integer,NULL,v_draft->>'cuisineCategory',v_draft->>'mealType',v_tags,
    COALESCE(v_draft->>'imageUrl',v_source->>'thumbnailUrl'),v_import.platform,v_import.platform,v_import.source_url,v_source_metadata,p_import_id)
  RETURNING id INTO v_recipe_id;
  -- The AFTER INSERT guard below creates canonical ingredients and the
  -- owned durable receipt, including for direct DataAPI insert attempts.
  UPDATE public.social_recipe_imports SET status='saved',recipe_id=v_recipe_id,title=v_draft->>'title',
    metadata=metadata||jsonb_build_object('review_quality',v_quality,'saved_revision',v_revision,
      'source_reviewed',COALESCE(p_recipe->'source_reviewed'='true'::jsonb,false)),error_code=NULL,error_message=NULL
    WHERE id=p_import_id AND user_id=v_user_id;
  RETURN v_recipe_id;
END $$;

-- RLS alone cannot validate a FK's owner: PostgreSQL FK checks bypass it.
-- These guards apply to direct DataAPI writes as well as the RPCs above.
CREATE OR REPLACE FUNCTION public.guard_imported_draft_v10()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_import public.social_recipe_imports%ROWTYPE; v_previous public.imported_recipe_drafts%ROWTYPE; v_max integer;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.import_id IS DISTINCT FROM OLD.import_id OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.draft_json IS DISTINCT FROM OLD.draft_json OR NEW.source_extraction_method IS DISTINCT FROM OLD.source_extraction_method
    OR NEW.ai_model IS DISTINCT FROM OLD.ai_model OR NEW.ai_input_tokens IS DISTINCT FROM OLD.ai_input_tokens
    OR NEW.ai_output_tokens IS DISTINCT FROM OLD.ai_output_tokens OR NEW.cost_usd_estimate IS DISTINCT FROM OLD.cost_usd_estimate
    OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN RAISE EXCEPTION 'DRAFT_IMMUTABLE' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_import FROM public.social_recipe_imports WHERE id=NEW.import_id AND user_id=NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'IMPORT_OWNER_MISMATCH' USING ERRCODE='42501'; END IF;
  IF v_import.status IN ('saved','archived') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  IF TG_OP='INSERT' THEN
    SELECT COALESCE(max(version),0) INTO v_max FROM public.imported_recipe_drafts WHERE import_id=NEW.import_id AND user_id=NEW.user_id;
    IF NEW.version<>v_max+1 THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
    SELECT * INTO v_previous FROM public.imported_recipe_drafts WHERE import_id=NEW.import_id AND user_id=NEW.user_id ORDER BY version DESC LIMIT 1;
    IF v_previous.id IS NOT NULL THEN
      NEW.draft_json:=jsonb_set(NEW.draft_json,'{source}',v_previous.draft_json->'source')-'imageUrl';
      IF v_previous.draft_json ? 'imageUrl' THEN NEW.draft_json:=NEW.draft_json||jsonb_build_object('imageUrl',v_previous.draft_json->'imageUrl'); END IF;
      NEW.draft_json:=NEW.draft_json||jsonb_build_object('confidence',v_previous.draft_json->'confidence');
      IF v_previous.draft_json ? 'extractionWarnings' THEN NEW.draft_json:=NEW.draft_json||jsonb_build_object('extractionWarnings',v_previous.draft_json->'extractionWarnings'); END IF;
    END IF;
    NEW.draft_json:=jsonb_set(NEW.draft_json,'{source}',COALESCE(NEW.draft_json->'source','{}'::jsonb)||jsonb_build_object(
      'platform',v_import.platform,'sourceUrl',v_import.source_url,'canonicalUrl',COALESCE(v_import.canonical_url,v_import.source_url)));
    PERFORM public.validate_imported_draft_v10(NEW.draft_json);
    NEW.source_extraction_method:=NEW.draft_json#>>'{source,extractionMethod}';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.guard_social_import_v10()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_recipe public.recipes%ROWTYPE; v_current public.imported_recipe_drafts%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.source_url IS DISTINCT FROM OLD.source_url OR NEW.canonical_url IS DISTINCT FROM OLD.canonical_url
    OR NEW.source_hash IS DISTINCT FROM OLD.source_hash OR NEW.platform IS DISTINCT FROM OLD.platform)
    THEN RAISE EXCEPTION 'IMPORT_SOURCE_IMMUTABLE' USING ERRCODE='42501'; END IF;
  IF NEW.recipe_id IS NOT NULL THEN
    SELECT * INTO v_recipe FROM public.recipes WHERE id=NEW.recipe_id AND user_id=NEW.user_id AND import_id=NEW.id;
    IF NOT FOUND THEN RAISE EXCEPTION 'RECIPE_OWNER_MISMATCH' USING ERRCODE='42501'; END IF;
    IF NEW.status NOT IN ('saved','archived') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
    -- Derive durable receipt fields from the owned recipe, never client JSON.
    NEW.metadata:=COALESCE(NEW.metadata,'{}'::jsonb)||jsonb_build_object(
      'review_quality',v_recipe.source_metadata->'reviewQuality',
      'saved_revision',v_recipe.source_metadata#>'{editProvenance,saved_revision}',
      'source_reviewed',v_recipe.source_metadata#>'{reviewConfirmations,source_reviewed}');
  ELSIF NEW.status='saved' THEN
    -- FK ON DELETE SET NULL archives the import rather than leaving a false receipt.
    IF TG_OP='UPDATE' AND OLD.recipe_id IS NOT NULL THEN NEW.status:='archived';
    ELSE RAISE EXCEPTION 'SAVE_RECEIPT_MISSING'; END IF;
  ELSE
    NEW.metadata:=COALESCE(NEW.metadata,'{}'::jsonb)-'saved_revision'-'source_reviewed';
    SELECT * INTO v_current FROM public.imported_recipe_drafts WHERE import_id=NEW.id AND user_id=NEW.user_id AND is_current;
    IF FOUND THEN
      NEW.metadata:=NEW.metadata||jsonb_build_object('review_quality',public.assess_imported_draft_quality_v10(v_current.draft_json,false));
      NEW.author_name:=v_current.draft_json#>>'{source,authorName}'; NEW.author_handle:=v_current.draft_json#>>'{source,authorHandle}';
      NEW.confidence:=(v_current.draft_json->>'confidence')::numeric;
    ELSE NEW.metadata:=NEW.metadata-'review_quality'; END IF;
  END IF;
  IF TG_OP='UPDATE' AND OLD.status='saved' AND NEW.status NOT IN ('saved','archived') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.guard_imported_recipe_v10()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_import public.social_recipe_imports%ROWTYPE; v_current public.imported_recipe_drafts%ROWTYPE;
  v_base public.imported_recipe_drafts%ROWTYPE; v_source jsonb; v_quality jsonb; v_metadata jsonb;
  v_confirmations jsonb; v_adaptations jsonb; v_edited_fields jsonb; v_key text; v_base_revision integer;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id)
    THEN RAISE EXCEPTION 'RECIPE_OWNER_IMMUTABLE' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' AND NEW.import_id IS DISTINCT FROM OLD.import_id THEN
    -- Keep provenance if the original import is removed via its FK.
    IF OLD.import_id IS NOT NULL AND NEW.import_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM public.social_recipe_imports WHERE id=OLD.import_id AND user_id=OLD.user_id) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'RECIPE_IMPORT_IMMUTABLE' USING ERRCODE='42501';
  END IF;
  IF NEW.import_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_import FROM public.social_recipe_imports WHERE id=NEW.import_id AND user_id=NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'IMPORT_OWNER_MISMATCH' USING ERRCODE='42501'; END IF;
  IF TG_OP='UPDATE' THEN
    IF NEW.source_url IS DISTINCT FROM OLD.source_url OR NEW.source_platform IS DISTINCT FROM OLD.source_platform
      OR NEW.source_type IS DISTINCT FROM OLD.source_type THEN RAISE EXCEPTION 'IMPORT_SOURCE_IMMUTABLE' USING ERRCODE='42501'; END IF;
    FOREACH v_key IN ARRAY ARRAY['canonicalUrl','authorName','authorHandle','authorUrl','thumbnailUrl','originalTitle',
      'originalDescription','importedAt','extractionMethod','confidence','extractionWarnings','reviewQuality','reviewConfirmations','editProvenance','adaptations'] LOOP
      IF NEW.source_metadata->v_key IS DISTINCT FROM OLD.source_metadata->v_key THEN RAISE EXCEPTION 'IMPORT_PROVENANCE_IMMUTABLE' USING ERRCODE='42501'; END IF;
    END LOOP;
    NEW.source_metadata:=OLD.source_metadata||jsonb_build_object('personalNotes',CASE WHEN jsonb_typeof(NEW.source_metadata->'personalNotes')='string'
      THEN left(NEW.source_metadata->>'personalNotes',2000) ELSE NULL END,
      'instructions',COALESCE(NEW.source_metadata->'instructions',OLD.source_metadata->'instructions'));
    RETURN NEW;
  END IF;
  IF v_import.status IN ('saved','archived','extracting','video_processing') THEN RAISE EXCEPTION 'INVALID_STATE'; END IF;
  SELECT * INTO v_current FROM public.imported_recipe_drafts WHERE import_id=NEW.import_id AND user_id=NEW.user_id AND is_current;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_DRAFT_AVAILABLE'; END IF;
  v_metadata:=CASE WHEN jsonb_typeof(NEW.source_metadata)='object' THEN NEW.source_metadata ELSE '{}'::jsonb END;
  v_confirmations:=v_metadata->'reviewConfirmations';
  IF v_confirmations->'source_reviewed' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'SOURCE_REVIEW_REQUIRED'; END IF;
  v_quality:=public.assess_imported_draft_quality_v10(v_current.draft_json,true);
  IF v_quality->>'can_save'<>'true' THEN RAISE EXCEPTION 'RECIPE_INCOMPLETE'; END IF;
  IF v_quality->>'requires_acknowledgement'='true' AND v_confirmations->'unknowns_acknowledged' IS DISTINCT FROM 'true'::jsonb
    THEN RAISE EXCEPTION 'UNKNOWN_FIELDS_REVIEW_REQUIRED'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_current.draft_json->'ingredients') x
    WHERE public.import_dietary_violation_v10(x->>'name') OR public.import_dietary_violation_v10(x->>'notes')) THEN RAISE EXCEPTION 'DIETARY_REVIEW_REQUIRED'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_current.draft_json->'ingredients') x
    WHERE x ? 'quantity' AND (x->>'quantity')::numeric<=0) THEN RAISE EXCEPTION 'INVALID_QUANTITY'; END IF;
  v_base_revision:=CASE WHEN COALESCE(v_metadata#>>'{editProvenance,base_revision}','')~'^[0-9]{1,9}$'
    THEN (v_metadata#>>'{editProvenance,base_revision}')::integer ELSE v_current.version END;
  SELECT * INTO v_base FROM public.imported_recipe_drafts WHERE import_id=NEW.import_id AND user_id=NEW.user_id AND version=v_base_revision;
  IF NOT FOUND OR v_base_revision>v_current.version THEN RAISE EXCEPTION 'REVISION_CONFLICT'; END IF;
  v_adaptations:=public.import_dietary_adaptations_v10(v_base.draft_json,v_current.draft_json);
  IF jsonb_array_length(v_adaptations)>0 AND v_confirmations->'adaptations_acknowledged' IS DISTINCT FROM 'true'::jsonb
    THEN RAISE EXCEPTION 'ADAPTATIONS_REVIEW_REQUIRED'; END IF;
  SELECT COALESCE(jsonb_agg(key ORDER BY key),'[]'::jsonb) INTO v_edited_fields FROM jsonb_object_keys(v_current.draft_json) key
    WHERE key NOT IN ('source','confidence','extractionWarnings','imageUrl') AND v_base.draft_json->key IS DISTINCT FROM v_current.draft_json->key;
  v_source:=v_current.draft_json->'source';
  NEW.source_url:=v_import.source_url; NEW.source_platform:=v_import.platform; NEW.source_type:=v_import.platform;
  NEW.name:=btrim(v_current.draft_json->>'title');
  NEW.description:=v_current.draft_json->>'description';
  NEW.prep_time:=(v_current.draft_json->>'prepTimeMinutes')::integer;
  NEW.cook_time:=(v_current.draft_json->>'cookTimeMinutes')::integer;
  NEW.rest_time:=(v_current.draft_json->>'restTimeMinutes')::integer;
  NEW.servings:=(v_current.draft_json->>'servings')::integer;
  NEW.image_url:=COALESCE(v_current.draft_json->>'imageUrl',v_source->>'thumbnailUrl');
  SELECT string_agg(idx::text||'. '||(x->>'description'),E'\n' ORDER BY idx) INTO NEW.instructions
    FROM jsonb_array_elements(v_current.draft_json->'instructions') WITH ORDINALITY a(x,idx);
  NEW.source_metadata:=jsonb_build_object('personalNotes',CASE WHEN jsonb_typeof(v_metadata->'personalNotes')='string'
      THEN left(v_metadata->>'personalNotes',2000) ELSE NULL END)||jsonb_build_object('canonicalUrl',COALESCE(v_import.canonical_url,v_import.source_url),
    'authorName',v_source->'authorName','authorHandle',v_source->'authorHandle','authorUrl',v_source->'authorUrl',
    'thumbnailUrl',v_source->'thumbnailUrl','originalTitle',v_source->'originalTitle','originalDescription',v_source->'originalDescription',
    'importedAt',v_source->'importedAt','extractionMethod',v_source->'extractionMethod','confidence',v_current.draft_json->'confidence',
    'extractionWarnings',v_current.draft_json->'extractionWarnings','instructions',v_current.draft_json->'instructions',
    'reviewQuality',v_quality,'adaptations',v_adaptations,'reviewConfirmations',v_confirmations,
    'editProvenance',jsonb_build_object('base_revision',v_base_revision,'saved_revision',v_current.version,
      'edited_fields',v_edited_fields,'reviewed_at',clock_timestamp(),'reviewed_by',NEW.user_id,'source_reviewed',true));
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.complete_imported_recipe_v10()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE v_draft jsonb;
BEGIN
  SELECT draft_json INTO v_draft FROM public.imported_recipe_drafts
    WHERE import_id=NEW.import_id AND user_id=NEW.user_id AND is_current;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_DRAFT_AVAILABLE'; END IF;
  INSERT INTO public.recipe_ingredients(recipe_id,ingredient_name,quantity,unit,notes,is_essential,order_index,inventory_product_id)
  SELECT NEW.id,btrim(ing->>'name'),(ing->>'quantity')::numeric,NULLIF(btrim(ing->>'unit'),''),ing->>'notes',
    COALESCE((ing->>'isEssential')::boolean,true),idx::integer,
    (SELECT p.id FROM public.products p
      WHERE p.normalized_name % lower(unaccent(btrim(ing->>'name')))
        AND similarity(p.normalized_name,lower(unaccent(btrim(ing->>'name'))))>=0.5
      ORDER BY similarity(p.normalized_name,lower(unaccent(btrim(ing->>'name')))) DESC,length(p.normalized_name),p.id LIMIT 1)
  FROM jsonb_array_elements(v_draft->'ingredients') WITH ORDINALITY AS a(ing,idx);
  UPDATE public.social_recipe_imports SET status='saved',recipe_id=NEW.id,title=NEW.name,error_code=NULL,error_message=NULL
    WHERE id=NEW.import_id AND user_id=NEW.user_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_imported_draft_v10 ON public.imported_recipe_drafts;
CREATE TRIGGER guard_imported_draft_v10 BEFORE INSERT OR UPDATE ON public.imported_recipe_drafts
  FOR EACH ROW EXECUTE FUNCTION public.guard_imported_draft_v10();
DROP TRIGGER IF EXISTS guard_social_import_v10 ON public.social_recipe_imports;
CREATE TRIGGER guard_social_import_v10 BEFORE INSERT OR UPDATE ON public.social_recipe_imports
  FOR EACH ROW EXECUTE FUNCTION public.guard_social_import_v10();
DROP TRIGGER IF EXISTS guard_imported_recipe_v10 ON public.recipes;
CREATE TRIGGER guard_imported_recipe_v10 BEFORE INSERT OR UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.guard_imported_recipe_v10();
DROP TRIGGER IF EXISTS complete_imported_recipe_v10 ON public.recipes;
CREATE TRIGGER complete_imported_recipe_v10 AFTER INSERT ON public.recipes
  FOR EACH ROW WHEN (NEW.import_id IS NOT NULL) EXECUTE FUNCTION public.complete_imported_recipe_v10();

-- A transaction-level quota covers capture, discovery and direct DataAPI
-- inserts together. The database cap is 25 for free accounts; the legacy
-- HTTP env override may reduce this but cannot increase it past the DB cap.
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.guard_import_quota_v10()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $$
DECLARE v_premium boolean:=false; v_count integer;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid()<>NEW.user_id THEN RAISE EXCEPTION 'IMPORT_OWNER_MISMATCH' USING ERRCODE='42501'; END IF;
  IF auth.uid() IS NULL AND COALESCE(auth.role(),'')<>'service_role' AND session_user<>'postgres'
    THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE='28000'; END IF;
  IF NEW.status IN ('saved','archived') THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.status NOT IN ('saved','archived') THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('discovery:'||NEW.user_id::text,0));
  -- Duplicate upserts still reach the table's own unique check/reconciliation.
  IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.social_recipe_imports WHERE user_id=NEW.user_id AND source_hash=NEW.source_hash) THEN RETURN NEW; END IF;
  IF to_regclass('public.user_subscriptions') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=$1 AND tier=''premium'' AND (expires_at IS NULL OR expires_at>now()))'
        INTO v_premium USING NEW.user_id;
    EXCEPTION WHEN undefined_column THEN v_premium:=false;
    END;
  END IF;
  IF NOT v_premium THEN
    SELECT count(*) INTO v_count FROM public.social_recipe_imports WHERE user_id=NEW.user_id AND status NOT IN ('saved','archived');
    IF v_count>=25 THEN RAISE EXCEPTION 'QUOTA_EXCEEDED'; END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_import_quota_v10() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS guard_import_quota_v10 ON public.social_recipe_imports;
CREATE TRIGGER guard_import_quota_v10 BEFORE INSERT OR UPDATE ON public.social_recipe_imports
  FOR EACH ROW EXECUTE FUNCTION private.guard_import_quota_v10();

REVOKE ALL ON FUNCTION public.replace_social_import_draft(uuid,integer,jsonb,text,text,integer,integer,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_social_import_draft(uuid,integer,jsonb,text,text,integer,integer,numeric) TO authenticated;
REVOKE ALL ON FUNCTION public.save_imported_recipe(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_imported_recipe(uuid,jsonb,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
