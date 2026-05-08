-- =====================================================================
-- PRP-221 J3 fix — corriger l'UNIQUE constraint sur assistant_action_log.
--
-- BUG : la migration 20260508120001 définissait
--   UNIQUE(user_id, client_request_id)
-- comme clé d'idempotence primaire. Mais une seule requête vocale
-- génère N tool_calls et donc N lignes qui partagent le même
-- client_request_id → la 2e INSERT viole la contrainte.
--
-- FIX : remplacer par UNIQUE(user_id, client_request_id, step_seq).
-- Sémantique :
--   - Idempotency : un retry du même payload audio (même
--     client_request_id) reproduit step_seq=0,1,2,... → chaque ligne
--     dédup individuellement. Le code resolve(error.code === '23505')
--     dans VoiceAgentService re-fetch le set existant et retourne
--     comme déjà-exécuté.
--   - Une nouvelle requête (client_request_id différent) crée un set
--     neuf, jamais en collision.
--
-- La table est vide en prod (aucun agent n'a tourné), donc la
-- migration est sans risque sur les données.
--
-- Idempotent. Safe à ré-appliquer.
-- =====================================================================

ALTER TABLE public.assistant_action_log
  DROP CONSTRAINT IF EXISTS assistant_action_log_user_request_unique;

ALTER TABLE public.assistant_action_log
  ADD CONSTRAINT assistant_action_log_user_request_step_unique
  UNIQUE (user_id, client_request_id, step_seq);

-- assistant_action_log_session_step_unique reste tel quel — c'est
-- l'autre garde-fou qui assure l'ordering dans une session.

NOTIFY pgrst, 'reload schema';
