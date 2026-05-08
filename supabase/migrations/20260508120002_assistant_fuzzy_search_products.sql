-- =====================================================================
-- PRP-221 J2 — RPC pour le fuzzy match du ProductResolver.
--
-- Pourquoi un RPC : supabase-js ne sait pas projeter
-- `similarity(normalized_name, $query)` directement dans un select.
-- L'op pg_trgm `%` (utilise l'index GIN de la migration 120000) est
-- exposable via PostgREST seulement à travers une fonction.
--
-- Comportement :
--   - Floor à 0.3 (reject le bruit ; le ProductResolver re-applique
--     son propre seuil 0.7 par défaut côté TS pour décider matched
--     vs ambiguous vs create).
--   - Retourne le row JSONB + le score, ordonné DESC, capé par p_limit.
--   - STABLE (pas SIDE-EFFECT) → ré-utilisable dans des CTE/joins futurs.
--
-- Idempotent (CREATE OR REPLACE).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.assistant_fuzzy_search_products(
  p_query TEXT,
  p_limit INTEGER DEFAULT 5
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
    similarity(p.normalized_name, p_query) AS score
  FROM public.products p
  WHERE p.normalized_name % p_query
    AND similarity(p.normalized_name, p_query) >= 0.3
  ORDER BY similarity(p.normalized_name, p_query) DESC,
           length(p.normalized_name) ASC  -- tie-break: plus court = plus probable
  LIMIT GREATEST(coalesce(p_limit, 5), 1);
$$;

GRANT EXECUTE ON FUNCTION public.assistant_fuzzy_search_products(TEXT, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
