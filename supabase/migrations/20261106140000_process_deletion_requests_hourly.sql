-- Data deletion requests are processed every hour, and erase every row the
-- user owns (audit 2026-11-06).
--
-- Before: nothing ever called process_pending_deletion_requests (the admin
-- route had no caller), so « Demander la suppression » only recorded a row.
-- The function itself listed tables by hand and missed most of those created
-- since (34 in the repo migrations, among them stock_movements, stock_commands,
-- user_recipes and media_assets), while still marking the request completed.
--
-- Now:
-- - private.delete_user_rows deletes from every public table with a user_id
--   column (except data_deletion_requests, the record of the request). Rows
--   blocked by a foreign key are retried after the other tables; a request
--   that still cannot be erased is marked failed with the error, never
--   completed. The auth account itself is kept, as the app says.
-- - pg_cron runs process_pending_deletion_requests(10) at minute 17 of every
--   hour.
--
-- Refuses to run while a request is pending: the first hourly run would erase
-- that user's data, including recipes they own. Review those rows first.
-- Re-runnable once no request is pending.
BEGIN;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.data_deletion_requests WHERE status IN ('pending','processing')) THEN
    RAISE EXCEPTION 'Pending deletion requests exist: review them before scheduling the hourly job.';
  END IF;
END $$;

-- From 20260517081500, which production may lack (migrations are applied by hand).
ALTER TABLE public.data_deletion_requests ADD COLUMN IF NOT EXISTS error text;

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
END $$;
REVOKE ALL ON FUNCTION private.delete_user_rows(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.process_pending_deletion_requests(p_max_batch integer DEFAULT 10) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_request record; v_processed integer:=0; v_failed integer:=0; v_errors jsonb:='[]';
BEGIN
  p_max_batch:=CASE WHEN p_max_batch IS NULL OR p_max_batch<1 THEN 10 ELSE least(p_max_batch,50) END;
  FOR v_request IN SELECT id,user_id FROM public.data_deletion_requests WHERE status='pending'
      ORDER BY requested_at LIMIT p_max_batch FOR UPDATE SKIP LOCKED LOOP
    BEGIN
      PERFORM private.delete_user_rows(v_request.user_id);
      -- Fires the memory and personalization clean-up triggers as well.
      UPDATE public.data_deletion_requests SET status='completed',completed_at=now(),error=NULL WHERE id=v_request.id;
      v_processed:=v_processed+1;
    EXCEPTION WHEN OTHERS THEN
      -- Every delete of this request is rolled back: nothing is half erased.
      UPDATE public.data_deletion_requests SET status='failed',completed_at=now(),error=SQLERRM WHERE id=v_request.id;
      v_failed:=v_failed+1;
      v_errors:=v_errors||jsonb_build_object('request_id',v_request.id,'error',SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('processed',v_processed,'failed',v_failed,'errors',v_errors);
END $$;
REVOKE ALL ON FUNCTION public.process_pending_deletion_requests(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_pending_deletion_requests(integer) TO service_role;

-- Same name: re-running updates the job instead of adding one.
SELECT cron.schedule('process-deletion-requests','17 * * * *','SELECT public.process_pending_deletion_requests(10)');

COMMIT;
