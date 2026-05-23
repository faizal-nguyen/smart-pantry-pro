-- =====================================================================
-- PRP-240 PR1 — Extend social_recipe_imports.status with V2 lifecycle.
--
-- Adds two server-driven statuses introduced by Social Video Recipe
-- Import V2:
--   - needs_upload     : URL captured but download failed/blocked;
--                        user must upload the video to continue.
--   - video_processing : video file acquired (download or upload),
--                        worker is running multimodal analysis.
--
-- Both flow into existing terminal states (`draft_ready`,
-- `needs_review`, `failed`). No data migration: existing rows keep
-- their current status untouched.
--
-- Idempotent. Safe to re-apply.
-- =====================================================================

ALTER TABLE public.social_recipe_imports
  DROP CONSTRAINT IF EXISTS social_recipe_imports_status_check;

ALTER TABLE public.social_recipe_imports
  ADD CONSTRAINT social_recipe_imports_status_check CHECK (status IN (
    'captured', 'metadata_ready', 'extracting',
    'draft_ready', 'needs_review', 'saved',
    'failed', 'archived',
    -- PRP-240 V2
    'needs_upload', 'video_processing'
  ));

COMMENT ON COLUMN public.social_recipe_imports.status IS
  'Lifecycle: captured -> metadata_ready -> (extracting | video_processing) -> (draft_ready | needs_review | needs_upload | failed) -> saved | archived. needs_upload + video_processing added by PRP-240 V2.';
