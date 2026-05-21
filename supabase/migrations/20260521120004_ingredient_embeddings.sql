-- =========================================================================
-- PRP-239 PR2 — `ingredient_embeddings` cache table (§8.2).
--
-- Why a separate table from `products.embedding`:
--   - `products.embedding` is keyed by product UUID, not by the raw
--     ingredient text. Many recipe ingredients have no canonical product
--     yet (that's the whole point of the resolver), so they have no
--     embedding to consult.
--   - This cache lets the resolver embed the *ingredient text* directly,
--     compare to `products.embedding` via cosine distance, and pick the
--     nearest product. Cached so we don't re-embed the same string twice.
--
-- Read/write: service-role only. RLS enabled with no client policy —
-- this is a technical cache, never queried from the client.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.ingredient_embeddings (
  ingredient_text             TEXT PRIMARY KEY,
  ingredient_text_normalized  TEXT NOT NULL,
  embedding                   vector(1536),
  embedding_model             TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding_updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingredient_embeddings_normalized
  ON public.ingredient_embeddings (ingredient_text_normalized);

-- HNSW index for nearest-neighbour search against the products
-- embedding column (same model + dimensions, so cosine distance is
-- comparable). Only created when there's at least one row, but
-- CREATE INDEX is idempotent so re-running is safe.
CREATE INDEX IF NOT EXISTS idx_ingredient_embeddings_hnsw
  ON public.ingredient_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

ALTER TABLE public.ingredient_embeddings ENABLE ROW LEVEL SECURITY;
-- No client policies — service role only.

COMMENT ON TABLE public.ingredient_embeddings IS
  'PRP-239 §8.2 — embedding cache for recipe ingredient text used by IngredientAliasResolver phase 3 (semantic match). text-embedding-3-small, 1536 dims, vector_cosine_ops. Service-role-only.';
