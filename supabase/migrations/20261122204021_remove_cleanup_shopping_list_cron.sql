-- Remove the nightly job created by 20250803065407.
--
-- The job called the cleanup-shopping-list Edge Function, which deleted, with
-- the service role and for every account, purchased shopping rows whose
-- updated_at was older than 24 hours: rows still waiting to be stored in the
-- pantry were lost. The function is removed from the repository with this
-- migration (V11-05 E0, decisions D13 and D14: no replacement purge).
--
-- Idempotent, and applicable where pg_cron is absent. Only the cleanup job is
-- touched. On Supabase only the role that owns a job can unschedule it; the
-- job was created by a migration, so it belongs to the migration role. Its
-- history stays in cron.job_run_details.
DO $$
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-shopping-list-daily') THEN
    PERFORM cron.unschedule('cleanup-shopping-list-daily');
  END IF;
END
$$;
