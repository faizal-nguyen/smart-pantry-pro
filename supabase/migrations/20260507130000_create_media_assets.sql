-- =====================================================================
-- PRP-220.24 §5.3 — public.media_assets
--
-- One row per stored media artifact: thumbnails snapshotted from social
-- captures, user-uploaded images and videos, generated covers, etc.
-- The `rights_*` columns make the legal posture machine-readable: every
-- asset records WHY it is allowed to live in our storage.
--
-- Storage backend in V1 is Supabase Storage (PRP §1). The `storage_*`
-- columns are kept generic so a future move to Cloudinary/S3 doesn't
-- need a schema change.
--
-- Idempotent. Safe to re-apply.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Optional links to the import row that produced the asset and the
  -- recipe row it ultimately ends up illustrating. Both nullable so a
  -- standalone upload (no import, no recipe yet) is valid.
  import_id UUID REFERENCES public.social_recipe_imports(id) ON DELETE SET NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,

  kind TEXT NOT NULL CHECK (kind IN (
    'thumbnail', 'cover', 'image', 'video', 'audio', 'transcript', 'embed_snapshot'
  )),

  origin TEXT NOT NULL CHECK (origin IN (
    'source_link', 'official_embed', 'thumbnail_snapshot',
    'user_upload', 'personal_archive_upload', 'permitted_download', 'generated'
  )),

  rights_status TEXT NOT NULL CHECK (rights_status IN (
    'link_only', 'user_provided', 'platform_embed', 'licensed', 'unknown', 'blocked'
  )),

  rights_basis TEXT CHECK (rights_basis IN (
    'created_by_user', 'user_has_permission', 'platform_native_download',
    'personal_backup', 'licensed'
  )),

  rights_policy_version TEXT,
  rights_attested_at TIMESTAMPTZ,

  storage_provider TEXT CHECK (storage_provider IN (
    'cloudinary', 'supabase', 's3', 'external'
  )),
  storage_bucket TEXT,
  storage_key TEXT,

  -- Public URL for assets that don't need signing (e.g. covers in a
  -- public bucket). Private assets use signed URLs minted at read
  -- time and don't store them here.
  public_url TEXT,
  source_url TEXT,

  mime_type TEXT,
  byte_size BIGINT,
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,
  -- SHA-256 hex digest computed at upload time. Used by the upload
  -- service for dedup / abuse signals. Cf. MediaUploadService.sha256.
  checksum_sha256 TEXT,

  -- Self-reference for derived assets (e.g. a thumbnail extracted
  -- from a video upload — see PRP §5.3, §5.14 ThumbnailJob).
  derived_from_media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Soft delete. The lifecycle service marks deleted_at first, then
  -- the delete job (PRP §5.14) removes the storage object and drops
  -- the row. This window lets accidental deletes be reverted.
  deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_media_assets_user_created
  ON public.media_assets(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_assets_import
  ON public.media_assets(import_id) WHERE import_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_media_assets_recipe
  ON public.media_assets(recipe_id) WHERE recipe_id IS NOT NULL;

-- Live (non soft-deleted) bytes/seconds totals are computed by
-- MediaQuotaService on every upload — keep an index that supports
-- the WHERE deleted_at IS NULL filter.
CREATE INDEX IF NOT EXISTS idx_media_assets_user_live
  ON public.media_assets(user_id) WHERE deleted_at IS NULL;

-- Updated_at trigger reuses the helper installed by 220.09.
DROP TRIGGER IF EXISTS update_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- RLS -------------------------------------------------------------
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS media_select_own ON public.media_assets;
CREATE POLICY media_select_own ON public.media_assets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS media_insert_own ON public.media_assets;
CREATE POLICY media_insert_own ON public.media_assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS media_update_own ON public.media_assets;
CREATE POLICY media_update_own ON public.media_assets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS media_delete_own ON public.media_assets;
CREATE POLICY media_delete_own ON public.media_assets
  FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
