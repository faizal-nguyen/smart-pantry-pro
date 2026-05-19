-- =====================================================================
-- Phase 3 J1 — pgvector + embedding column on products.
--
-- Adds semantic-search capability to the product catalog. The
-- ProductResolver pipeline becomes :
--     exact (normalized_name) → SEMANTIC (cosine on embedding)
--     → fuzzy (pg_trgm) → create.
--
-- The embedding is generated client-side (apps/api EmbeddingService
-- wrapping OpenAI text-embedding-3-small, 1536 dims) and UPDATEd back
-- onto the row. Rows with `embedding IS NULL` simply fall through to
-- the existing fuzzy path, so the migration is safe to deploy before
-- the backfill is run.
--
-- Indexes :
--   - HNSW on `embedding vector_cosine_ops` for fast top-K
--     (m=16, ef_construction=64 — Supabase defaults, balanced).
--   - Partial index : WHERE embedding IS NOT NULL avoids bloating the
--     HNSW with null entries during backfill.
--
-- Idempotent. Safe to re-run.
-- =====================================================================

-- ---- Extension -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- ---- Columns ---------------------------------------------------------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS embedding vector(1536),
  ADD COLUMN IF NOT EXISTS embedding_model TEXT
    DEFAULT 'text-embedding-3-small',
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.products.embedding IS
  'OpenAI text-embedding-3-small vector for the product name. NULL until backfilled by EmbeddingService. Used by assistant_semantic_search_products for cross-lingual / synonym matching.';

COMMENT ON COLUMN public.products.embedding_model IS
  'Model identifier so future migrations can detect rows needing re-embedding when we switch model.';

COMMENT ON COLUMN public.products.embedding_updated_at IS
  'When the embedding was last (re)generated. Lets the backfill worker prioritise stale rows.';

-- ---- Index -----------------------------------------------------------
-- HNSW index for cosine similarity. The partial WHERE clause keeps the
-- index small while embeddings are being backfilled.
CREATE INDEX IF NOT EXISTS idx_products_embedding_hnsw
  ON public.products
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

NOTIFY pgrst, 'reload schema';
