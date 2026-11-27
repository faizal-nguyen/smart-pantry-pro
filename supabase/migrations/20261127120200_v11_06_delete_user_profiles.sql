-- V11-06 S1 (lot 3): an account deletion request also erases its profile.
--
-- public.user_profiles (20251004000000: e-mail, name, dietary restrictions,
-- allergens) is written at sign-up by handle_new_user and keyed by id, not
-- user_id, so private.delete_user_rows (20261106140000), which erases every
-- public table with a user_id column, left it behind after a completed
-- request. The sign-in account itself is still kept, as the app says.
--
-- Body of 20261106140000 unchanged, plus that delete after the loop.
-- Exception to « no migration before E8 » (PRP V11-06), decided on
-- 2026-11-27. Idempotent. Rollback: re-run the function from 20261106140000
-- (docs/implementations/V11-06-S1.md).
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
END $$;
REVOKE ALL ON FUNCTION private.delete_user_rows(uuid) FROM PUBLIC,anon,authenticated;

COMMIT;
