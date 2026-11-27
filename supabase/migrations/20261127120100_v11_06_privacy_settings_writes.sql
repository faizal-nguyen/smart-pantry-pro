-- V11-06 S1 (lot 2): privacy settings written only through the checked function.
--
-- The API writes them through patch_assistant_privacy_settings, that is
-- private.patch_privacy (SECURITY DEFINER, 20261011184535): a closed list of
-- keys, typed values, and the per-account lock shared with the memory. But
-- Supabase's default grants and the owner insert and update policies
-- (20250105000009, 20260517081500) still let a browser session upsert its row
-- through PostgREST: any JSON, without the list or the lock, so a concurrent
-- write could undo a withdrawal of the history or the memory.
--
-- Signed-in users keep reading their row (the API's GET reads with the
-- user's client); the anonymous role has no right left. The function, the
-- account deletion and the export run as their owner and are unaffected.
--
-- Exception to « no migration before E8 » (PRP V11-06), decided on
-- 2026-11-27. Idempotent. Rollback: docs/implementations/V11-06-S1.md.
BEGIN;

DROP POLICY IF EXISTS "Users can update own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Users can insert own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS user_privacy_settings_insert_own ON public.user_privacy_settings;
DROP POLICY IF EXISTS user_privacy_settings_update_own ON public.user_privacy_settings;

-- Every right goes, then reading comes back for signed-in users only: TRUNCATE, TRIGGER and
-- REFERENCES were only withdrawn by 20261108160000, which production may lack.
REVOKE ALL ON public.user_privacy_settings FROM authenticated, anon;
GRANT SELECT ON public.user_privacy_settings TO authenticated;

COMMIT;
