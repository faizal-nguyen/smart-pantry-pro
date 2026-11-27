-- V11-06 S2 (lot 2): an account deletion request erases what it still left
-- behind, and the GDPR export shows it.
--
-- private.delete_user_rows (last body: 20261127120200) erases every public
-- table with a user_id column, plus the profile row. It left:
-- - private.recipe_discovery_receipts (20261106154633): every recipe
--   discovery command, with names, addresses and descriptions in clear. Now
--   deleted.
-- - products.created_by (20260508120000) and product_aliases.created_by
--   (20260516140000): the names a user added to the common catalogue are
--   used by every account and stay; the account's id is set to NULL.
-- - public.shopping_list_collaborators (20250818000001, never applied in
--   production, hence the guard): rows naming the account as invitee are
--   deleted, as inviter its id is set to NULL; its own lists already go with
--   their user_id.
--
-- Setting products.created_by to NULL fired v10_product_cache
-- (20261008151704) for each row, which bumps every account's stock revision
-- and empties every account's caches. The trigger now fires only when a
-- column other than created_by and updated_at changes: neither feeds a cache.
--
-- export_user_data (last body: 20261127120300) adds two keys:
-- recipe_discovery_receipts (rows, without columns named like a secret) and
-- catalog_contributions ({products: [{id, name, created_at}], product_aliases:
-- [{id, product_id, alias, created_at}]}).
--
-- Each table and column is checked first: a database missing one still
-- deletes and exports the rest. Never touch families: its cascades reach
-- other accounts. Same exception as S1 to « no migration before E8 »
-- (PRP V11-06), decided on 2026-11-27. Idempotent. Rollback: re-run the
-- functions of 20261127120200 and 20261127120300 and the trigger of
-- 20261008151704 (docs/implementations/V11-06-S2.md).
BEGIN;

CREATE OR REPLACE FUNCTION private.delete_user_rows(p_user uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tables text[]; v_left text[]; v_table text; v_error text;
BEGIN
  -- Menu entries carry no user_id: delete them through their plan.
  IF to_regclass('public.meal_plan_entries') IS NOT NULL AND to_regclass('public.weekly_meal_plans') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.meal_plan_entries WHERE meal_plan_id IN (SELECT id FROM public.weekly_meal_plans WHERE user_id::text=$1)'
      USING p_user::text;
  END IF;
  SELECT array_agg(c.relname::text ORDER BY c.relname) INTO v_tables
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
  WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition
    AND a.attname='user_id' AND NOT a.attisdropped AND c.relname<>'data_deletion_requests';
  v_tables:=coalesce(v_tables,'{}');
  -- Foreign keys between these tables decide the order: a table a reference
  -- blocked is retried after the others, until a pass deletes nothing new.
  LOOP
    v_left:='{}';
    FOREACH v_table IN ARRAY v_tables LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE user_id::text=$1',v_table) USING p_user::text;
      EXCEPTION WHEN foreign_key_violation THEN
        v_left:=v_left||v_table;v_error:=SQLERRM;
      END;
    END LOOP;
    EXIT WHEN cardinality(v_left)=0;
    IF cardinality(v_left)=cardinality(v_tables) THEN RAISE EXCEPTION 'DELETION_BLOCKED: %',v_error; END IF;
    v_tables:=v_left;
  END LOOP;
  -- V11-06 S1: the profile row is keyed by id, not user_id (20251004000000). Nothing references it.
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_profiles WHERE id=$1' USING p_user;
  END IF;
  -- V11-06 S2: the recipe discovery receipts live in private (20261106154633).
  IF to_regclass('private.recipe_discovery_receipts') IS NOT NULL THEN
    EXECUTE 'DELETE FROM private.recipe_discovery_receipts WHERE user_id=$1' USING p_user;
  END IF;
  -- V11-06 S2: catalogue names stay for every account, without the account's id.
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.products') AND attname='created_by' AND NOT attisdropped) THEN
    EXECUTE 'UPDATE public.products SET created_by=NULL WHERE created_by=$1' USING p_user;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid=to_regclass('public.product_aliases') AND attname='created_by' AND NOT attisdropped) THEN
    EXECUTE 'UPDATE public.product_aliases SET created_by=NULL WHERE created_by=$1' USING p_user;
  END IF;
  -- V11-06 S2: list sharing (20250818000001). Another account's list stays shared with its other members.
  IF (SELECT count(*) FROM pg_attribute WHERE attrelid=to_regclass('public.shopping_list_collaborators')
        AND attname IN ('shared_with_user_id','shared_by_user_id') AND NOT attisdropped)=2 THEN
    EXECUTE 'DELETE FROM public.shopping_list_collaborators WHERE shared_with_user_id=$1' USING p_user;
    EXECUTE 'UPDATE public.shopping_list_collaborators SET shared_by_user_id=NULL WHERE shared_by_user_id=$1' USING p_user;
  END IF;
END $$;
REVOKE ALL ON FUNCTION private.delete_user_rows(uuid) FROM PUBLIC,anon,authenticated;

-- Body of 20261008151704's trigger, with a WHEN: neither the author nor the
-- update date of a product feeds a stock cache. Replaced only where it exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.products') AND tgname = 'v10_product_cache') THEN
    EXECUTE $t$CREATE OR REPLACE TRIGGER v10_product_cache AFTER UPDATE ON public.products FOR EACH ROW
      WHEN ((to_jsonb(OLD) - ARRAY['created_by','updated_at']) IS DISTINCT FROM (to_jsonb(NEW) - ARRAY['created_by','updated_at']))
      EXECUTE FUNCTION private.invalidate_stock_caches()$t$;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  -- Exported by export_assistant_memory or export_nutrition_personalization in the
  -- same request, or recomputed caches; user_privacy_settings keeps its former key.
  v_elsewhere CONSTANT text[] := ARRAY['assistant_memory_items','assistant_conversations','assistant_messages',
    'assistant_conversation_summaries','assistant_session_context','assistant_memory_state','assistant_memory_commands',
    'assistant_memory_tombstones','assistant_summary_claims','cooking_journal_entries','nutrition_profiles',
    'recipe_interactions','recommendation_events','recipe_recommendation_cache','recipe_inventory_cache',
    'user_privacy_settings'];
  v_secret CONSTANT text := '(^|_)(token|secret|password|api_key)$';
  v_result jsonb;
  v_table text;
  v_rows jsonb;
  v_contributions jsonb := '{}'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden: caller must match p_user_id' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_result := jsonb_build_object('user_id', p_user_id, 'export_date', now());
  -- Each table read by name is checked first: a database missing one still exports the rest.
  IF to_regclass('public.user_privacy_settings') IS NOT NULL THEN
    EXECUTE 'SELECT to_jsonb(p) FROM public.user_privacy_settings p WHERE p.user_id::text = $1' INTO v_rows USING p_user_id::text;
    v_result := v_result || jsonb_build_object('privacy_settings', v_rows);
  END IF;

  FOR v_table IN
    SELECT c.relname::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relispartition
      AND a.attname = 'user_id' AND NOT a.attisdropped AND c.relname <> ALL (v_elsewhere)
    ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(t) - ARRAY(SELECT k FROM jsonb_object_keys(to_jsonb(t)) k WHERE k ~* %L)),'
                   ' ''[]''::jsonb) FROM public.%I t WHERE t.user_id::text = $1', v_secret, v_table)
      INTO v_rows USING p_user_id::text;
    v_result := v_result || jsonb_build_object(v_table, v_rows);
  END LOOP;

  -- The profile row is keyed by id (20251004000000), menu entries by their plan.
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    EXECUTE 'SELECT to_jsonb(p) FROM public.user_profiles p WHERE p.id::text = $1' INTO v_rows USING p_user_id::text;
    v_result := v_result || jsonb_build_object('user_profile', v_rows);
  END IF;
  IF to_regclass('public.meal_plan_entries') IS NOT NULL AND to_regclass('public.weekly_meal_plans') IS NOT NULL THEN
    EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(e)), ''[]''::jsonb) FROM public.meal_plan_entries e'
      ' WHERE e.meal_plan_id IN (SELECT w.id FROM public.weekly_meal_plans w WHERE w.user_id::text = $1)'
      INTO v_rows USING p_user_id::text;
    v_result := v_result || jsonb_build_object('meal_plan_entries', v_rows);
  END IF;

  -- V11-06 S2: the recipe discovery receipts (private, 20261106154633).
  IF to_regclass('private.recipe_discovery_receipts') IS NOT NULL THEN
    EXECUTE format('SELECT COALESCE(jsonb_agg(to_jsonb(r) - ARRAY(SELECT k FROM jsonb_object_keys(to_jsonb(r)) k WHERE k ~* %L)'
                   ' ORDER BY r.created_at), ''[]''::jsonb) FROM private.recipe_discovery_receipts r WHERE r.user_id = $1', v_secret)
      INTO v_rows USING p_user_id;
    v_result := v_result || jsonb_build_object('recipe_discovery_receipts', v_rows);
  END IF;
  -- V11-06 S2: what the account added to the common catalogue; the deletion keeps these names without its id.
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('public.products') AND attname = 'created_by' AND NOT attisdropped) THEN
    EXECUTE 'SELECT COALESCE(jsonb_agg(jsonb_build_object(''id'', p.id, ''name'', p.name, ''created_at'', p.created_at)'
      ' ORDER BY p.created_at, p.id), ''[]''::jsonb) FROM public.products p WHERE p.created_by = $1'
      INTO v_rows USING p_user_id;
    v_contributions := v_contributions || jsonb_build_object('products', v_rows);
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = to_regclass('public.product_aliases') AND attname = 'created_by' AND NOT attisdropped) THEN
    EXECUTE 'SELECT COALESCE(jsonb_agg(jsonb_build_object(''id'', a.id, ''product_id'', a.product_id, ''alias'', a.alias,'
      ' ''created_at'', a.created_at) ORDER BY a.created_at, a.id), ''[]''::jsonb) FROM public.product_aliases a WHERE a.created_by = $1'
      INTO v_rows USING p_user_id;
    v_contributions := v_contributions || jsonb_build_object('product_aliases', v_rows);
  END IF;
  v_result := v_result || jsonb_build_object('catalog_contributions', v_contributions);

  RETURN v_result;
END $$;

REVOKE EXECUTE ON FUNCTION public.export_user_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO authenticated;

COMMIT;
