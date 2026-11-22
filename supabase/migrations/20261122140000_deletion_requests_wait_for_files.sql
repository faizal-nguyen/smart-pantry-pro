-- A data deletion request is completed only once the user's files are gone
-- as well as their rows (relecture V11, 2026-11-22).
--
-- Before: the API erases the files through the Storage API when the request is
-- made (POST /api/v1/settings/delete-request). If that removal failed, the
-- request stayed pending and the hourly job erased the rows, then marked it
-- completed: photos stayed in Storage behind a « completed » request.
--
-- Now process_pending_deletion_requests:
-- - first pass (rows_deleted_at empty): erases the rows as before and records
--   when (rows_deleted_at);
-- - then checks storage.objects, which SQL can read but not erase: if a file of
--   the user created before the rows were erased remains, the request becomes
--   `processing` with error FILES_REMAINING and completed_at empty. Each hourly
--   run checks again, without erasing rows a second time: once the API has
--   removed the files (the user asks again from the settings, which retries the
--   removal), the request is completed;
-- - takes new requests before the ones awaiting their files, so these never
--   delay a new request.
--
-- The memory and personalization triggers erase rows when a request becomes
-- completed. They now act only when the rows are erased in the same pass
-- (OLD.rows_deleted_at empty): a request completed later, once its files are
-- gone, no longer erases what the user created since (the account stays open).
--
-- Files uploaded after the rows were erased are not part of the request.
-- Requests completed before this migration are not reopened.
-- Idempotent: re-running replaces the same function and triggers.
BEGIN;

ALTER TABLE public.data_deletion_requests ADD COLUMN IF NOT EXISTS error text;
ALTER TABLE public.data_deletion_requests ADD COLUMN IF NOT EXISTS rows_deleted_at timestamptz;

-- Same files as list_user_storage_objects (what the API erases), limited to
-- those that existed when the rows were erased.
CREATE OR REPLACE FUNCTION private.user_files_remaining(p_user uuid, p_before timestamptz) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE (o.owner_id = p_user::text OR o.owner = p_user OR o.name LIKE 'users/' || p_user::text || '/%')
      AND o.created_at <= p_before)
$$;
REVOKE ALL ON FUNCTION private.user_files_remaining(uuid, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.process_pending_deletion_requests(p_max_batch integer DEFAULT 10) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_request record; v_rows_at timestamptz; v_processed integer:=0; v_waiting integer:=0; v_failed integer:=0; v_errors jsonb:='[]';
BEGIN
  p_max_batch:=CASE WHEN p_max_batch IS NULL OR p_max_batch<1 THEN 10 ELSE least(p_max_batch,50) END;
  FOR v_request IN SELECT id,user_id,rows_deleted_at FROM public.data_deletion_requests WHERE status IN ('pending','processing')
      ORDER BY rows_deleted_at IS NOT NULL, requested_at LIMIT p_max_batch FOR UPDATE SKIP LOCKED LOOP
    BEGIN
      v_rows_at:=v_request.rows_deleted_at;
      IF v_rows_at IS NULL THEN
        PERFORM private.delete_user_rows(v_request.user_id);
        v_rows_at:=now();
      END IF;
      IF private.user_files_remaining(v_request.user_id, v_rows_at) THEN
        UPDATE public.data_deletion_requests SET status='processing',rows_deleted_at=v_rows_at,completed_at=NULL,error='FILES_REMAINING'
          WHERE id=v_request.id;
        v_waiting:=v_waiting+1;
      ELSE
        -- Fires the memory and personalization clean-up triggers on a first pass.
        UPDATE public.data_deletion_requests SET status='completed',rows_deleted_at=v_rows_at,completed_at=now(),error=NULL
          WHERE id=v_request.id;
        v_processed:=v_processed+1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Every delete of this request is rolled back: nothing is half erased.
      UPDATE public.data_deletion_requests SET status='failed',completed_at=now(),error=SQLERRM WHERE id=v_request.id;
      v_failed:=v_failed+1;
      v_errors:=v_errors||jsonb_build_object('request_id',v_request.id,'error',SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('processed',v_processed,'waiting_for_files',v_waiting,'failed',v_failed,'errors',v_errors);
END $$;
REVOKE ALL ON FUNCTION public.process_pending_deletion_requests(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_pending_deletion_requests(integer) TO service_role;

-- Same functions, same names; only a WHEN condition is added.
DO $$ BEGIN
  IF to_regprocedure('private.delete_completed_assistant_memory()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS zz_delete_completed_assistant_memory ON public.data_deletion_requests;
    CREATE TRIGGER zz_delete_completed_assistant_memory BEFORE UPDATE OF status ON public.data_deletion_requests
      FOR EACH ROW WHEN (OLD.rows_deleted_at IS NULL) EXECUTE FUNCTION private.delete_completed_assistant_memory();
  END IF;
  IF to_regprocedure('public.delete_completed_personalization()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS deletion_request_personalization ON public.data_deletion_requests;
    CREATE TRIGGER deletion_request_personalization BEFORE UPDATE OF status ON public.data_deletion_requests
      FOR EACH ROW WHEN (OLD.rows_deleted_at IS NULL) EXECUTE FUNCTION public.delete_completed_personalization();
  END IF;
END $$;

COMMIT;
