-- PRP-226 PR3 — Recommendation engine event log + cache + interactions.
--
-- Adds the persistence layer that PR4 (assistant integration) will
-- consume:
--   * `public.recommendation_events`        audit per call (debug + V2 learning)
--   * `public.recipe_recommendation_cache`  15-minute scoring cache, user-scoped
--   * `public.recipe_interactions`          user actions per recipe (PR4 + PR6)
--
-- RLS pattern: own-data SELECT + INSERT. UPDATE only on the cache
-- (upsert flow). DELETE is service-role only (no policy) — cache
-- purges run from the backend.
--
-- Idempotent: every CREATE / ALTER / INDEX / POLICY guarded by
-- `IF NOT EXISTS` or `DROP ... IF EXISTS`.

-- ============================================================================
-- 1. public.recommendation_events
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  assistant_message_id UUID,
  request_text TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  candidate_count INTEGER NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_recipe_id UUID,
  accepted BOOLEAN,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_events_user_created
  ON public.recommendation_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_events_conversation
  ON public.recommendation_events(conversation_id)
  WHERE conversation_id IS NOT NULL;

ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recommendation_events_select_own
  ON public.recommendation_events;
CREATE POLICY recommendation_events_select_own
  ON public.recommendation_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS recommendation_events_insert_own
  ON public.recommendation_events;
CREATE POLICY recommendation_events_insert_own
  ON public.recommendation_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 2. public.recipe_recommendation_cache
-- ============================================================================
--
-- Cache des résultats du scoring engine. User-scoped (chaque user a
-- son propre cache) avec invalidation applicative sur mutations
-- inventory/recipes (handled by RecommendationEventWriter PR3 hooks).

CREATE TABLE IF NOT EXISTS public.recipe_recommendation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  result_json JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_recipe_reco_cache_user_expires
  ON public.recipe_recommendation_cache(user_id, expires_at);

ALTER TABLE public.recipe_recommendation_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recipe_reco_cache_select_own
  ON public.recipe_recommendation_cache;
CREATE POLICY recipe_reco_cache_select_own
  ON public.recipe_recommendation_cache
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS recipe_reco_cache_insert_own
  ON public.recipe_recommendation_cache;
CREATE POLICY recipe_reco_cache_insert_own
  ON public.recipe_recommendation_cache
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS recipe_reco_cache_update_own
  ON public.recipe_recommendation_cache;
CREATE POLICY recipe_reco_cache_update_own
  ON public.recipe_recommendation_cache
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: no policy → service-role only (purges from backend).

-- ============================================================================
-- 3. public.recipe_interactions
-- ============================================================================
--
-- Journal des actions utilisateur par recette. Alimente PR6
-- (PreferenceScorer V1 réelle) et fournit debug pour comprendre
-- pourquoi une recette est répétitivement proposée mais jamais ouverte.

CREATE TABLE IF NOT EXISTS public.recipe_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID,
  recommendation_event_id UUID
    REFERENCES public.recommendation_events(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN (
    'viewed',
    'recommended',
    'accepted',
    'dismissed',
    'cooked',
    'added_missing_to_shopping',
    'planned'
  )),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_interactions_user_recipe_created
  ON public.recipe_interactions(user_id, recipe_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recipe_interactions_user_type_created
  ON public.recipe_interactions(user_id, interaction_type, created_at DESC);

ALTER TABLE public.recipe_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recipe_interactions_select_own
  ON public.recipe_interactions;
CREATE POLICY recipe_interactions_select_own
  ON public.recipe_interactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS recipe_interactions_insert_own
  ON public.recipe_interactions;
CREATE POLICY recipe_interactions_insert_own
  ON public.recipe_interactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. Schema reload
-- ============================================================================
NOTIFY pgrst, 'reload schema';
