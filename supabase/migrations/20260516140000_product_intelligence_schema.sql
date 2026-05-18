-- PRP-225 PR1 — Product Intelligence + OpenFoodFacts schema.
--
-- Adds the data layer that subsequent PRs (OpenFoodFactsClient, cache,
-- ProductIntelligenceService, /api/products/* routes, assistant tools,
-- UI badges) will consume:
--   * `public.products` augmented with marque, quantité, nutrition,
--     allergens, OFF tracking, enrichment status/source/confidence.
--   * `public.product_aliases`           (PRP-225 §5.2)
--   * `public.product_enrichment_cache`  (§5.3 — service-role only,
--                                         no anon/authenticated policy)
--   * `public.product_resolution_events` (§5.4 — user-scoped audit)
--
-- Reuses the existing helper `public.update_updated_at_column()`
-- (defined by earlier migrations) for the cache table's `updated_at`.
--
-- Idempotent : every CREATE / ALTER / INDEX / POLICY guarded by
-- `IF NOT EXISTS` or `DROP ... IF EXISTS`. No destructive moves on
-- existing `barcode` / `image_url` / `normalized_name` / `source` /
-- `created_by` columns (added by 20250803* + 20260508120000).
--
-- This migration introduces no runtime consumers ; PR1 is purely the
-- data layer. PR2-PR6 wire backend client, service, routes, assistant
-- and UI on top.

-- ============================================================================
-- 1. public.products — augmentation
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS quantity_label TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_text TEXT,
  ADD COLUMN IF NOT EXISTS nutrition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS allergens_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS off_product_code TEXT,
  ADD COLUMN IF NOT EXISTS off_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS off_raw_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS enrichment_source TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS enrichment_confidence NUMERIC NOT NULL DEFAULT 0;

-- CHECK constraints applied AFTER the ADD so an existing row's DEFAULT
-- never violates the constraint mid-transaction. Re-applied idempotently.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_enrichment_status_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_enrichment_status_check
    CHECK (enrichment_status IN ('none','pending','enriched','ambiguous','failed','stale'));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_enrichment_source_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_enrichment_source_check
    CHECK (enrichment_source IN ('none','openfoodfacts','manual','assistant','barcode_scan'));

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_enrichment_confidence_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_enrichment_confidence_check
    CHECK (enrichment_confidence >= 0 AND enrichment_confidence <= 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique
  ON public.products(barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_off_code_unique
  ON public.products(off_product_code)
  WHERE off_product_code IS NOT NULL AND off_product_code <> '';

CREATE INDEX IF NOT EXISTS idx_products_enrichment_status
  ON public.products(enrichment_status)
  WHERE enrichment_status <> 'none';

CREATE INDEX IF NOT EXISTS idx_products_brand
  ON public.products(brand)
  WHERE brand IS NOT NULL;

-- ============================================================================
-- 2. public.product_aliases (PRP-225 §5.2)
-- ============================================================================
--
-- Alias = user/assistant/import label that maps to a canonical product.
-- Pas de UNIQUE(normalized_alias) global : un alias simple comme
-- "lait" peut pointer vers plusieurs produits selon marque/type.
-- L'ambiguité se gère au niveau ProductIntelligenceService.

CREATE TABLE IF NOT EXISTS public.product_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'user'
    CHECK (source IN ('user','assistant','import','openfoodfacts','receipt')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, normalized_alias)
);

CREATE INDEX IF NOT EXISTS idx_product_aliases_normalized
  ON public.product_aliases(normalized_alias);

CREATE INDEX IF NOT EXISTS idx_product_aliases_product
  ON public.product_aliases(product_id);

-- RLS : aliases are global product metadata, not user-private. SELECT
-- open to authenticated users so the UI can render labels. Writes are
-- service-role only (assistant + receipt + ProductIntelligence).
ALTER TABLE public.product_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_aliases_select_authenticated ON public.product_aliases;
CREATE POLICY product_aliases_select_authenticated ON public.product_aliases
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- 3. public.product_enrichment_cache (PRP-225 §5.3)
-- ============================================================================
--
-- Cache des réponses OpenFoodFacts. **Pas user-scoped** : ne contient
-- que des données produit publiques et des requêtes normalisées (cache_key
-- = barcode normalisé ou search query normalisée). Service-role only —
-- aucune policy anon/authenticated.

CREATE TABLE IF NOT EXISTS public.product_enrichment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'openfoodfacts'
    CHECK (provider IN ('openfoodfacts')),
  cache_key TEXT NOT NULL,
  query TEXT,
  response_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'hit'
    CHECK (status IN ('hit','miss','ambiguous','error')),
  http_status INTEGER,
  error_code TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_product_enrichment_cache_expiry
  ON public.product_enrichment_cache(expires_at);

ALTER TABLE public.product_enrichment_cache ENABLE ROW LEVEL SECURITY;
-- NO POLICIES — service-role only. RLS blocks all anon/authenticated reads.

DROP TRIGGER IF EXISTS trg_product_enrichment_cache_updated_at
  ON public.product_enrichment_cache;
CREATE TRIGGER trg_product_enrichment_cache_updated_at
  BEFORE UPDATE ON public.product_enrichment_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 4. public.product_resolution_events (PRP-225 §5.4)
-- ============================================================================
--
-- User-scoped audit log of every product resolution decision. Lets us
-- debug "why did the assistant pick this product?" + builds the user's
-- alias graph over time.

CREATE TABLE IF NOT EXISTS public.product_resolution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_input TEXT NOT NULL,
  barcode TEXT,
  resolved_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  method TEXT NOT NULL CHECK (method IN (
    'barcode_local',
    'alias',
    'exact',
    'fuzzy',
    'openfoodfacts_barcode',
    'openfoodfacts_search',
    'manual_create',
    'clarification',
    'failed'
  )),
  confidence NUMERIC NOT NULL DEFAULT 0
    CHECK (confidence >= 0 AND confidence <= 1),
  candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_resolution_events_user_created
  ON public.product_resolution_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_resolution_events_product
  ON public.product_resolution_events(resolved_product_id)
  WHERE resolved_product_id IS NOT NULL;

ALTER TABLE public.product_resolution_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_resolution_events_select_own
  ON public.product_resolution_events;
CREATE POLICY product_resolution_events_select_own
  ON public.product_resolution_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE : no policy → service-role only.

-- ============================================================================
-- 5. Schema reload notification
-- ============================================================================
NOTIFY pgrst, 'reload schema';
