-- PRP-235 Backlog 1 — Worker SQL pour finaliser les
-- data_deletion_requests pending.
--
-- Contexte : `delete_user_data(p_user_id)` est durci depuis le
-- hotfix `20260517071100` (guard `auth.uid() = p_user_id`). Donc
-- aucun caller (ni front, ni service_role) ne peut le déclencher
-- pour un autre user. Pour finaliser les demandes RGPD du flow
-- PRP-235 PR5, il fallait un canal admin légitime.
--
-- Cette migration ajoute `process_pending_deletion_requests` :
--   - SECURITY DEFINER, EXECUTE réservé au `service_role`
--   - Itère sur les `data_deletion_requests` pending (oldest first),
--     bornée par `p_max_batch` (default 10) pour éviter un timeout
--   - Pour chaque row : passe à `processing`, supprime les données
--     de l'utilisateur (inventory, recipes, shopping_list,
--     scan_history, analytics_events, user_privacy_settings,
--     recipe_interactions, recommendation_events,
--     assistant_memory_items, assistant_conversations,
--     cooking_journal_entries), passe à `completed` (ou `failed` +
--     message dans une nouvelle colonne `error`)
--   - Retourne un JSONB avec le résumé (processed, failed, errors).
--
-- Le périmètre de suppression est intentionnellement plus large que
-- l'ancien `delete_user_data` (qui datait d'avant PRP-223/226) pour
-- inclure la mémoire assistant + cooking journal + interactions
-- moteur reco. Tous ces tables ont une FK `user_id` avec
-- `ON DELETE CASCADE` sur `auth.users(id)` — donc dropper le user
-- depuis auth.users les efface aussi. Mais comme le worker ne touche
-- pas à `auth.users` (réservé au Supabase Admin SDK / dashboard),
-- on fait les DELETE explicites en SQL ici.

-- ============================================================================
-- 1. Ajouter la colonne `error` pour tracer les échecs
-- ============================================================================

ALTER TABLE public.data_deletion_requests
  ADD COLUMN IF NOT EXISTS error TEXT;

-- ============================================================================
-- 2. Function `process_pending_deletion_requests`
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_pending_deletion_requests(
  p_max_batch INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_processed INTEGER := 0;
  v_failed INTEGER := 0;
  v_errors JSONB := '[]'::jsonb;
BEGIN
  -- Borne défensive : on ne traite jamais > 50 demandes dans un
  -- même call, pour éviter un long-running statement bloquant.
  IF p_max_batch IS NULL OR p_max_batch < 1 THEN
    p_max_batch := 10;
  ELSIF p_max_batch > 50 THEN
    p_max_batch := 50;
  END IF;

  FOR v_request IN
    SELECT id, user_id
    FROM public.data_deletion_requests
    WHERE status = 'pending'
    ORDER BY requested_at ASC
    LIMIT p_max_batch
  LOOP
    -- Verrouille la row pour éviter un autre worker concurrent.
    UPDATE public.data_deletion_requests
    SET status = 'processing'
    WHERE id = v_request.id AND status = 'pending';

    BEGIN
      -- Périmètre étendu vs delete_user_data() pour couvrir les
      -- tables ajoutées par PRP-223 / PRP-226 / PRP-227 / PRP-234.
      -- Tables avec ON DELETE CASCADE sur auth.users(id) → effacées
      -- automatiquement quand on drop le user, mais on fait les
      -- DELETE explicites pour pouvoir trace et avoir une
      -- transaction unique côté worker.
      DELETE FROM public.inventory WHERE user_id = v_request.user_id;
      DELETE FROM public.recipes WHERE user_id = v_request.user_id;
      DELETE FROM public.shopping_list WHERE user_id = v_request.user_id;
      DELETE FROM public.scan_history WHERE user_id = v_request.user_id;
      DELETE FROM public.analytics_events WHERE user_id = v_request.user_id;
      DELETE FROM public.user_privacy_settings WHERE user_id = v_request.user_id;

      -- PRP-223 (memory) — best-effort si les tables existent.
      BEGIN
        DELETE FROM public.assistant_memory_items WHERE user_id = v_request.user_id;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      BEGIN
        DELETE FROM public.assistant_conversations WHERE user_id = v_request.user_id;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      BEGIN
        DELETE FROM public.cooking_journal_entries WHERE user_id = v_request.user_id;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;

      -- PRP-226 (reco engine).
      BEGIN
        DELETE FROM public.recipe_interactions WHERE user_id = v_request.user_id;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      BEGIN
        DELETE FROM public.recommendation_events WHERE user_id = v_request.user_id;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      BEGIN
        DELETE FROM public.recipe_recommendation_cache WHERE user_id = v_request.user_id;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;

      -- PRP-234 (menus).
      BEGIN
        DELETE FROM public.meal_plan_entries
          WHERE meal_plan_id IN (
            SELECT id FROM public.weekly_meal_plans
            WHERE user_id = v_request.user_id
          );
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      BEGIN
        DELETE FROM public.weekly_meal_plans WHERE user_id = v_request.user_id;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;

      -- PRP-220 (recipe imports).
      BEGIN
        DELETE FROM public.imported_recipe_drafts WHERE user_id = v_request.user_id;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;
      BEGIN
        DELETE FROM public.social_recipe_imports WHERE user_id = v_request.user_id;
      EXCEPTION WHEN undefined_table THEN NULL;
      END;

      -- Note : on ne touche pas à auth.users — la suppression du
      -- compte d'authentification reste manuelle via Supabase Admin
      -- SDK (out of scope worker).

      UPDATE public.data_deletion_requests
      SET status = 'completed', completed_at = NOW(), error = NULL
      WHERE id = v_request.id;

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Erreur unitaire : on marque la row failed avec le message
      -- mais on continue avec les autres demandes du batch.
      UPDATE public.data_deletion_requests
      SET status = 'failed',
          completed_at = NOW(),
          error = SQLERRM
      WHERE id = v_request.id;

      v_failed := v_failed + 1;
      v_errors := v_errors || jsonb_build_object(
        'request_id', v_request.id,
        'user_id', v_request.user_id,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'failed', v_failed,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 3. Restrict EXECUTE — service_role only
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.process_pending_deletion_requests(INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_pending_deletion_requests(INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_pending_deletion_requests(INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_pending_deletion_requests(INTEGER) TO service_role;

-- ============================================================================
-- 4. Schema reload (Supabase PostgREST)
-- ============================================================================

NOTIFY pgrst, 'reload schema';
