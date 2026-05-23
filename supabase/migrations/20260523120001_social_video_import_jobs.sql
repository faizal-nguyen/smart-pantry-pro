-- =====================================================================
-- PRP-240 PR1 — social_video_import_jobs queue + idempotency table.
--
-- One row per (import_id, revision). API owns lifecycle; the video
-- worker (separate Render service, see PRP §4.2/§8.3) claims jobs via
-- internal endpoints using the service role and bypasses RLS. RLS
-- policies below only cover the end-user inbox surface.
--
-- Heartbeat + stale-job janitor land in PR2; this migration only
-- creates the table shape they need.
--
-- Idempotent. Safe to re-apply.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.social_video_import_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id           UUID NOT NULL REFERENCES public.social_recipe_imports(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision            INTEGER NOT NULL DEFAULT 1,
  idempotency_key     TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN (
                        'queued', 'downloading', 'needs_upload', 'analyzing',
                        'draft_ready', 'failed', 'cancelled'
                      )),
  provider            TEXT,
  acquisition_method  TEXT,
  media_origin        TEXT,
  error_code          TEXT,
  error_message       TEXT,
  retryable           BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_count       INTEGER NOT NULL DEFAULT 0,
  max_attempts        INTEGER NOT NULL DEFAULT 2,
  progress            INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  metrics             JSONB NOT NULL DEFAULT '{}'::jsonb,
  locked_at           TIMESTAMPTZ,
  locked_by           TEXT,
  heartbeat_at        TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_video_import_jobs_import_revision_unique UNIQUE (import_id, revision),
  CONSTRAINT social_video_import_jobs_idempotency_unique UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_svij_user_created
  ON public.social_video_import_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_svij_import
  ON public.social_video_import_jobs (import_id);

-- Janitor scans by (status, heartbeat_at) to find stale jobs.
CREATE INDEX IF NOT EXISTS idx_svij_status_heartbeat
  ON public.social_video_import_jobs (status, heartbeat_at);

-- Worker/admin dashboards page by recency within a status.
CREATE INDEX IF NOT EXISTS idx_svij_status_created
  ON public.social_video_import_jobs (status, created_at DESC);

DROP TRIGGER IF EXISTS trg_svij_updated_at ON public.social_video_import_jobs;
CREATE TRIGGER trg_svij_updated_at
  BEFORE UPDATE ON public.social_video_import_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.social_video_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS svij_select_own ON public.social_video_import_jobs;
CREATE POLICY svij_select_own
  ON public.social_video_import_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS svij_insert_own ON public.social_video_import_jobs;
CREATE POLICY svij_insert_own
  ON public.social_video_import_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS svij_update_own ON public.social_video_import_jobs;
CREATE POLICY svij_update_own
  ON public.social_video_import_jobs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy: end users cannot delete jobs. Worker uses service role.

COMMENT ON TABLE public.social_video_import_jobs IS
  'PRP-240 V2: video extraction queue. One row per (import_id, revision). Worker claims jobs via internal API endpoints (service-role bypasses RLS).';
COMMENT ON COLUMN public.social_video_import_jobs.idempotency_key IS
  'Derived from (import_id, revision, action) when client omits Idempotency-Key. UNIQUE prevents duplicate worker jobs from double-clicks/network retries.';
COMMENT ON COLUMN public.social_video_import_jobs.heartbeat_at IS
  'Updated by the worker every N seconds while a job is active. Janitor marks heartbeat-stale jobs as failed/retryable.';
