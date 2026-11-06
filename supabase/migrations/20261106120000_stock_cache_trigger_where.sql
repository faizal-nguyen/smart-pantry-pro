-- Supabase loads pg_safeupdate for API (PostgREST) requests: an UPDATE or
-- DELETE without WHERE is refused with 21000 "UPDATE requires a WHERE clause",
-- and the whole statement rolls back. private.invalidate_stock_caches() ran
-- three such statements whenever a public row changed (products,
-- recipes_catalog, public recipes). Since 20261008151704, every API update of
-- a product failed: embeddings and OpenFoodFacts enrichment were never saved.
-- Same function, with WHERE true on the three statements that target every
-- user. The SQL editor and migrations were never affected. Idempotent.
BEGIN;

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
    -- A public row feeds every user's caches. WHERE true: see header.
    UPDATE public.stock_context_versions SET revision=revision+1 WHERE true;
    DELETE FROM public.recipe_inventory_cache WHERE true;
    DELETE FROM public.recipe_recommendation_cache WHERE true;
  ELSIF v_user IS NOT NULL THEN
    UPDATE public.stock_context_versions SET revision=revision+1 WHERE user_id=v_user;
    DELETE FROM public.recipe_inventory_cache WHERE user_id=v_user;
    DELETE FROM public.recipe_recommendation_cache WHERE user_id=v_user;
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION private.invalidate_stock_caches() FROM PUBLIC,anon,authenticated;

COMMIT;
