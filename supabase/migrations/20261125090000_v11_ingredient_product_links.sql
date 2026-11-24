-- V11-01: « Je l'ai déjà » — an ingredient name linked to a product of the user's stock.
--
-- The week's shopping proposed to buy what the user had under another name (« Huile neutre »
-- for « Huile de tournesol », « Lait de coco » for « Organic Coconut Milk », 24 Nov 2026). The
-- user links the ingredient once, from the review:
-- * public.ingredient_product_links holds one product per (account, normalized ingredient name),
--   written by the account itself under RLS (a preference, like mobile_routine_preferences);
-- * public.resolve_stock_recipe gives an ingredient without product the one linked to its name.
--   Every stock computation reads recipes through it (cooking preview and consume_recipe,
--   recipe_add_missing, the menu basis and rule C, the week's preview): the link counts everywhere;
-- * a link bumps the account's stock revision (private.invalidate_stock_caches), so a shopping
--   confirmation computed before it is refused (STOCK_CHANGED) and computed again.
-- Additive and idempotent; without links, resolve_stock_recipe returns exactly what it returned.
-- Account deletion covers the table through private.delete_user_rows (any public table with
-- user_id) and the cascade on auth.users; export_user_data lists it.
BEGIN;

CREATE TABLE IF NOT EXISTS public.ingredient_product_links(
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_key text NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,ingredient_key),
  CONSTRAINT ingredient_product_links_key_length CHECK (char_length(ingredient_key) BETWEEN 1 AND 120)
);
CREATE INDEX IF NOT EXISTS ingredient_product_links_product_idx ON public.ingredient_product_links(product_id);

-- The key is stored as resolve_stock_recipe looks it up; an update never moves a link to another account.
CREATE OR REPLACE FUNCTION private.ingredient_link_normalize() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  NEW.ingredient_key:=public.stock_normalize_name(NEW.ingredient_key);
  NEW.updated_at:=now();
  IF TG_OP='UPDATE' THEN NEW.user_id:=OLD.user_id; NEW.created_at:=OLD.created_at; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.ingredient_link_normalize() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS ingredient_product_links_normalize ON public.ingredient_product_links;
CREATE TRIGGER ingredient_product_links_normalize BEFORE INSERT OR UPDATE ON public.ingredient_product_links
  FOR EACH ROW EXECUTE FUNCTION private.ingredient_link_normalize();
DROP TRIGGER IF EXISTS v11_ingredient_links_cache ON public.ingredient_product_links;
CREATE TRIGGER v11_ingredient_links_cache AFTER INSERT OR UPDATE OR DELETE ON public.ingredient_product_links
  FOR EACH ROW EXECUTE FUNCTION private.invalidate_stock_caches();

ALTER TABLE public.ingredient_product_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ingredient_product_links_own ON public.ingredient_product_links;
CREATE POLICY ingredient_product_links_own ON public.ingredient_product_links FOR ALL TO authenticated
  USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));
REVOKE ALL ON public.ingredient_product_links FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.ingredient_product_links TO authenticated;

-- Body of 20261009095426_v10_personalization.sql; only the links block and v_links are added.
CREATE OR REPLACE FUNCTION public.resolve_stock_recipe(p_recipe_id uuid,p_source text DEFAULT 'auto') RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE
  v_user uuid:=auth.uid(); v_recipe jsonb; v_wrapper jsonb; v_raw jsonb;
  v_ingredients jsonb; v_ingredient jsonb; v_result jsonb; v_source text; v_canonical uuid;
  v_multiplier numeric:=1; v_amount numeric; v_normalized jsonb:='[]'; v_links jsonb;
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
  -- V11-01: an ingredient without a product takes the one this account linked to its name
  -- (« Je l'ai déjà »). The links applied enter the version: a recipe without one keeps its own.
  SELECT coalesce(jsonb_agg(CASE WHEN nullif(e.value->>'inventory_product_id','') IS NULL AND l.product_id IS NOT NULL
      THEN jsonb_set(e.value,'{inventory_product_id}',to_jsonb(l.product_id::text)) ELSE e.value END ORDER BY e.ordinality),'[]'),
    jsonb_agg(jsonb_build_array(l.ingredient_key,l.product_id) ORDER BY e.ordinality)
      FILTER (WHERE nullif(e.value->>'inventory_product_id','') IS NULL AND l.product_id IS NOT NULL)
  INTO v_normalized,v_links
  FROM jsonb_array_elements(v_normalized) WITH ORDINALITY AS e
  LEFT JOIN public.ingredient_product_links l ON l.user_id=v_user AND l.ingredient_key=public.stock_normalize_name(e.value->>'ingredient_name');
  IF v_links IS NOT NULL THEN v_raw:=v_raw||jsonb_build_object('links',v_links); END IF;
  v_result:=jsonb_build_object('id',p_recipe_id,'source',v_source,'canonicalId',v_canonical,
    'name',coalesce(v_recipe->>'name',v_recipe->>'title'),'servings',coalesce((v_recipe->>'servings')::numeric,4)*v_multiplier,
    'prep_time',coalesce((v_recipe->>'prep_time')::integer,0),'cook_time',coalesce((v_recipe->>'cook_time')::integer,0),
    'version',md5(v_raw::text),'ingredients',v_normalized);
  RETURN v_result;
END $$;

-- Body of 20261124090000_v11_menu_week_shopping.sql; only the ingredient_product_links key is added.
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
    'ingredient_product_links', (SELECT jsonb_agg(row_to_json(k.*)) FROM public.ingredient_product_links k WHERE k.user_id = p_user_id)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';

COMMIT;
