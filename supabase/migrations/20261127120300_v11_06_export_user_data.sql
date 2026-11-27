-- V11-06 S1 (lot 4): the GDPR export covers every table that holds an account's rows.
--
-- export_user_data (last body: 20261127090000) listed its tables by hand and
-- missed most of them: stock commands and movements, shopping movements, menus,
-- the assistant's action log, waste events, the profile row... The account
-- deletion already erases every public table with a user_id column
-- (private.delete_user_rows, 20261106140000); the export now reads the same
-- set, so a table added later is exported without a new migration.
--
-- Shape: { user_id, export_date, privacy_settings (one object, as before),
-- <table>: [rows] for each table, user_profile (keyed by id), meal_plan_entries
-- (keyed by their plan) }. An empty table gives [] (it gave null before). Left
-- out: the tables export_assistant_memory and export_nutrition_personalization
-- export in the same /settings/export call, and two recomputed caches. Columns
-- named like a secret (…_token, …_secret, password, api_key: calendar OAuth
-- tokens of 20250830000002, for one) are dropped from every row: the file is
-- downloaded and kept outside the app.
--
-- Any other overload of export_user_data (an older signature, possibly without
-- the auth.uid() guard) loses its EXECUTE rights for the app's roles.
--
-- Exception to « no migration before E8 » (PRP V11-06), decided on
-- 2026-11-27. Idempotent. Rollback: re-run the function from 20261127090000
-- (docs/implementations/V11-06-S1.md).
BEGIN;

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
  v_result jsonb;
  v_table text;
  v_rows jsonb;
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
                   ' ''[]''::jsonb) FROM public.%I t WHERE t.user_id::text = $1', '(^|_)(token|secret|password|api_key)$', v_table)
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

  RETURN v_result;
END $$;

REVOKE EXECUTE ON FUNCTION public.export_user_data(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO authenticated;

DO $$
DECLARE f regprocedure;
BEGIN
  FOR f IN SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.proname = 'export_user_data'
             AND p.oid <> 'public.export_user_data(uuid)'::regprocedure
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END $$;

COMMIT;
