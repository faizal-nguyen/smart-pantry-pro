-- =====================================================================
-- PRP-220.24 §5.4 — public.media_jobs
--
-- Postgres-backed queue for media processing (PRP §5.14). The V1
-- consumer is a polling Node worker that uses
-- `SELECT … FOR UPDATE SKIP LOCKED` for safe concurrent picks. No
-- Redis / BullMQ until job volume justifies the move.
--
-- Idempotent. Safe to re-apply.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.media_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE CASCADE,

  job_type TEXT NOT NULL CHECK (job_type IN (
    'thumbnail',  -- extract a poster frame from a video upload
    'transcode',  -- V1.1 — generate web-friendly variants
    'transcript', -- V1.1 — Deepgram STT for video uploads
    'scan',       -- placeholder for future malware scanning
    'delete'      -- cascade storage cleanup after soft delete
  )),

  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN (
    'queued', 'running', 'done', 'failed'
  )),

  -- Worker reservation timestamp. Used by SKIP LOCKED queries to
  -- detect zombie reservations (worker died mid-job) and reclaim
  -- them after a TTL.
  locked_at TIMESTAMPTZ,
  locked_by TEXT,

  error_code TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,

  -- Stable key to dedupe redundant enqueues. The upload service uses
  -- e.g. `thumbnail:<media_asset_id>` so re-uploading a video twice
  -- doesn't queue two thumbnail jobs (cf. MediaAssetRepository.createJob).
  idempotency_key TEXT UNIQUE,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Worker SELECT pattern: status='queued' ORDER BY created_at LIMIT 1
-- FOR UPDATE SKIP LOCKED. Index supports it cheaply.
CREATE INDEX IF NOT EXISTS idx_media_jobs_queued
  ON public.media_jobs(status, created_at) WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_media_jobs_user
  ON public.media_jobs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_jobs_asset
  ON public.media_jobs(media_asset_id) WHERE media_asset_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_media_jobs_updated_at ON public.media_jobs;
CREATE TRIGGER update_media_jobs_updated_at
  BEFORE UPDATE ON public.media_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- RLS -------------------------------------------------------------
-- Jobs are processed by the worker using the service-role key, so RLS
-- policies are scoped to the owning user for read access only. Inserts
-- go through the worker / API code paths that already act under
-- service-role, not the user JWT.
ALTER TABLE public.media_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_jobs_select_own ON public.media_jobs;
CREATE POLICY media_jobs_select_own ON public.media_jobs
  FOR SELECT USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
