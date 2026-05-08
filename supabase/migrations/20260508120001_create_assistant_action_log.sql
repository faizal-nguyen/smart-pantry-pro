-- =====================================================================
-- PRP-221 J1 — assistant_action_log
--
-- Table journal des actions proposées et exécutées par l'agent vocal.
-- Une ligne par tool_call. Status évolue planned → executed → undone
-- (ou failed/cancelled). Idempotency via UNIQUE(user_id, client_request_id).
--
-- RLS : SELECT only pour les users (lecture de leur propre historique
-- via une UI éventuelle). Les INSERT/UPDATE passent par le client
-- service-role depuis l'API serveur.
--
-- Idempotent. Safe à ré-appliquer.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.assistant_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Idempotency : client_request_id est généré par le client AVANT envoi
  -- et stable sur les retries (header X-Client-Request-Id). C'est la clé
  -- primaire de la dedup. (session_id, step_seq) est secondaire pour
  -- l'audit et l'ordering interne.
  client_request_id UUID NOT NULL,
  session_id UUID NOT NULL,
  step_seq INTEGER NOT NULL,
  audio_sha256 TEXT,  -- pour la protection 10min sur /voice (PRP-221 §8)

  -- Tool dispatch
  tool TEXT NOT NULL,
  tool_args JSONB NOT NULL,
  risk_tier TEXT NOT NULL CHECK (risk_tier IN ('low','medium','high')),

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','executed','failed','undone','cancelled')),
  result JSONB,
  error_code TEXT,
  error_message TEXT,

  -- Undo
  reversible BOOLEAN NOT NULL DEFAULT FALSE,
  reversible_action JSONB,    -- { tool: 'remove_inventory_items', args: {...} }
  undo_expires_at TIMESTAMPTZ,
  undone_at TIMESTAMPTZ,

  -- Métadonnées
  llm_model TEXT,             -- 'gpt-4o-mini', 'gpt-4o', etc.
  cost_usd NUMERIC,           -- coût attribué à cette action si applicable

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Idempotency primaire
  CONSTRAINT assistant_action_log_user_request_unique
    UNIQUE(user_id, client_request_id),
  -- Audit secondaire (dédup intra-session)
  CONSTRAINT assistant_action_log_session_step_unique
    UNIQUE(user_id, session_id, step_seq)
);

-- ---- Indexes --------------------------------------------------------

-- Lecture de la session courante (UI history)
CREATE INDEX IF NOT EXISTS idx_action_log_user_session
  ON public.assistant_action_log(user_id, session_id, step_seq);

-- Fenêtre d'undo : actions exécutées et encore reversibles
CREATE INDEX IF NOT EXISTS idx_action_log_user_undo_window
  ON public.assistant_action_log(user_id, undo_expires_at)
  WHERE status = 'executed' AND reversible = TRUE;

-- audio_sha256 lookup (protection 10 min /voice)
CREATE INDEX IF NOT EXISTS idx_action_log_audio_sha
  ON public.assistant_action_log(user_id, audio_sha256, created_at DESC)
  WHERE audio_sha256 IS NOT NULL;

-- ---- Trigger updated_at ----------------------------------------------
DROP TRIGGER IF EXISTS update_assistant_action_log_updated_at
  ON public.assistant_action_log;
CREATE TRIGGER update_assistant_action_log_updated_at
  BEFORE UPDATE ON public.assistant_action_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- RLS -------------------------------------------------------------
ALTER TABLE public.assistant_action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS action_log_select_own ON public.assistant_action_log;
CREATE POLICY action_log_select_own ON public.assistant_action_log
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE : aucune policy = bloqué pour les users.
-- L'API serveur écrit via le client service-role uniquement.

NOTIFY pgrst, 'reload schema';
