-- =====================================================================
-- PRP-220.16: source columns + import linkage on public.recipes.
--
-- Adds the columns the imported-draft -> recipe save flow needs:
--   - source_platform   : platform enum mirror (matches social_recipe_imports.platform)
--   - source_metadata   : full provenance JSON (author, thumbnail, confidence, warnings)
--   - import_id         : back-link to social_recipe_imports
--
-- `source_url` already exists on `recipes` (added in 20250804).
-- `source_type` already exists too — we keep it for backwards-compat
-- with manually-typed recipes; the new flow uses `source_platform`
-- exclusively.
--
-- Idempotent: safe to re-apply.
-- =====================================================================

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS source_platform TEXT
    CHECK (source_platform IS NULL OR source_platform IN (
      'instagram', 'tiktok', 'youtube',
      'pinterest', 'web', 'manual', 'unknown'
    )),
  ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS import_id UUID
    REFERENCES public.social_recipe_imports(id) ON DELETE SET NULL;

-- Speeds up "recipes filtered by platform" reads (Mes Recettes filter).
CREATE INDEX IF NOT EXISTS idx_recipes_user_source_platform
  ON public.recipes(user_id, source_platform)
  WHERE source_platform IS NOT NULL;

-- Idempotence guarantee: one import row -> at most one recipe row.
-- Partial unique index so manually-created recipes (import_id IS NULL)
-- are not constrained.
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_import_unique
  ON public.recipes(import_id)
  WHERE import_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
