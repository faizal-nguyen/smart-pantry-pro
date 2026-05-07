-- =====================================================================
-- PRP-220.09: Persistance imports + drafts + RLS + dedup hash
--
-- Idempotent migration. Safe to re-apply on staging or prod.
-- Tables:
--   - public.social_recipe_imports     1 row per captured URL
--   - public.imported_recipe_drafts    1 row per AI-extracted draft
--                                      version (current + history)
-- =====================================================================

-- ---------- 0. Helper trigger function (reuse existing convention) ---
-- The repo already exposes public.update_updated_at_column() (see
-- 20250803063742_*.sql, 20250105000023_*.sql). We re-create with
-- CREATE OR REPLACE to stay idempotent and to avoid a hard dependency
-- on prior migrations being applied first.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------- 1. social_recipe_imports ---------------------------------
CREATE TABLE IF NOT EXISTS public.social_recipe_imports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL CHECK (platform IN (
                    'instagram', 'tiktok', 'youtube',
                    'pinterest', 'web', 'manual', 'unknown'
                  )),
  source_url      TEXT NOT NULL,
  canonical_url   TEXT,
  source_hash     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'captured' CHECK (status IN (
                    'captured', 'metadata_ready', 'extracting',
                    'draft_ready', 'needs_review', 'saved',
                    'failed', 'archived'
                  )),
  title           TEXT,
  author_name     TEXT,
  author_handle   TEXT,
  thumbnail_url   TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code      TEXT,
  error_message   TEXT,
  confidence      NUMERIC(4, 3) CHECK (
                    confidence IS NULL OR (confidence >= 0 AND confidence <= 1)
                  ),
  recipe_id       UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT social_recipe_imports_user_hash_unique UNIQUE (user_id, source_hash)
);

CREATE INDEX IF NOT EXISTS idx_sri_user_status_created
  ON public.social_recipe_imports (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sri_user_platform
  ON public.social_recipe_imports (user_id, platform);

CREATE INDEX IF NOT EXISTS idx_sri_recipe
  ON public.social_recipe_imports (recipe_id)
  WHERE recipe_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_sri_updated_at ON public.social_recipe_imports;
CREATE TRIGGER trg_sri_updated_at
  BEFORE UPDATE ON public.social_recipe_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 2. imported_recipe_drafts --------------------------------
CREATE TABLE IF NOT EXISTS public.imported_recipe_drafts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id                UUID NOT NULL REFERENCES public.social_recipe_imports(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  draft_json               JSONB NOT NULL,
  version                  INTEGER NOT NULL DEFAULT 1,
  is_current               BOOLEAN NOT NULL DEFAULT TRUE,
  source_extraction_method TEXT,
  ai_model                 TEXT,
  ai_input_tokens          INTEGER,
  ai_output_tokens         INTEGER,
  cost_usd_estimate        NUMERIC(10, 6),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ird_import_current
  ON public.imported_recipe_drafts (import_id, is_current)
  WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_ird_user_created
  ON public.imported_recipe_drafts (user_id, created_at DESC);

-- Guarantee at most one current version per import.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ird_one_current_per_import
  ON public.imported_recipe_drafts (import_id)
  WHERE is_current = TRUE;

-- ---------- 3. RLS ----------------------------------------------------
ALTER TABLE public.social_recipe_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_recipe_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sri_select_own ON public.social_recipe_imports;
CREATE POLICY sri_select_own
  ON public.social_recipe_imports
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS sri_insert_own ON public.social_recipe_imports;
CREATE POLICY sri_insert_own
  ON public.social_recipe_imports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sri_update_own ON public.social_recipe_imports;
CREATE POLICY sri_update_own
  ON public.social_recipe_imports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS sri_delete_own ON public.social_recipe_imports;
CREATE POLICY sri_delete_own
  ON public.social_recipe_imports
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ird_select_own ON public.imported_recipe_drafts;
CREATE POLICY ird_select_own
  ON public.imported_recipe_drafts
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS ird_insert_own ON public.imported_recipe_drafts;
CREATE POLICY ird_insert_own
  ON public.imported_recipe_drafts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ird_update_own ON public.imported_recipe_drafts;
CREATE POLICY ird_update_own
  ON public.imported_recipe_drafts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS ird_delete_own ON public.imported_recipe_drafts;
CREATE POLICY ird_delete_own
  ON public.imported_recipe_drafts
  FOR DELETE
  USING (auth.uid() = user_id);

-- ---------- 4. Documentation comments --------------------------------
COMMENT ON TABLE public.social_recipe_imports IS
  'PRP-220.09: one row per URL captured by the user. Status machine: captured -> metadata_ready -> extracting -> {draft_ready | needs_review | failed} -> saved | archived.';
COMMENT ON COLUMN public.social_recipe_imports.source_hash IS
  'SHA-256(canonical_url).slice(0, 32). Computed server-side (apps/api/src/services/imports/sourceHash.ts).';
COMMENT ON TABLE public.imported_recipe_drafts IS
  'PRP-220.09: AI/heuristic extraction output for a given social_recipe_imports row. Append-only history; only one row has is_current = TRUE per import.';
