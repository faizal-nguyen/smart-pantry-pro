-- =====================================================================
-- Phase 3 J1 — RPC for semantic product search via pgvector.
--
-- Why an RPC : supabase-js cannot project `embedding <=> $1` directly
-- in a select. The cosine distance operator from pgvector needs to be
-- exposed via a SQL function so PostgREST can call it.
--
-- Behaviour :
--   - Returns top-N products ordered by cosine similarity DESC.
--   - `score = 1 - (embedding <=> p_query)` so it's in [0, 1] like the
--     existing fuzzy RPC for a consistent ProductResolver pipeline.
--   - Filters out rows below `p_min_score` (caller default 0.85). The
--     RPC enforces a floor of 0.5 to keep noise out of the candidate
--     list even if the caller asks for less.
--   - Skips rows where embedding IS NULL — they just fall through to
--     the existing fuzzy path in ProductResolver.
--   - STABLE (read-only, no side effects).
--
-- Idempotent (CREATE OR REPLACE).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.assistant_semantic_search_products(
  p_query vector(1536),
  p_limit INTEGER DEFAULT 5,
  p_min_score REAL DEFAULT 0.85
)
RETURNS TABLE (
  product JSONB,
  score REAL
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    to_jsonb(p) AS product,
    (1 - (p.embedding <=> p_query))::REAL AS score
  FROM public.products p
  WHERE p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> p_query)) >= GREATEST(coalesce(p_min_score, 0.85), 0.5)
  ORDER BY p.embedding <=> p_query ASC
  LIMIT GREATEST(coalesce(p_limit, 5), 1);
$$;

GRANT EXECUTE ON FUNCTION public.assistant_semantic_search_products(vector, INTEGER, REAL)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
