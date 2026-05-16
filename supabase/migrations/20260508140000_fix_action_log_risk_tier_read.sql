-- =====================================================================
-- PRP-221 J5a fix — accept 'read' tier on assistant_action_log.
--
-- BUG : la migration 20260508120001 avait
--   CHECK (risk_tier IN ('low','medium','high'))
-- mais le code TS (RiskClassifier + RiskTier dans schemas/tools.ts)
-- utilise un 4ème tier `'read'` pour read_inventory, read_shopping_list,
-- read_recent_recipes, read_meal_plan, find_cookable_recipes,
-- search_recipes. Sans 'read' dans la CHECK, l'INSERT plante avec
-- code 23514 et le router renvoie 500 Internal Server Error.
--
-- Trouvé via smoke test du 2026-05-08 sur la 1re session vocale réelle
-- (« qu'est-ce que j'ai dans le frigo » → read_inventory → 23514).
--
-- Fix : remplacer la CHECK pour autoriser 'read'.
--
-- Idempotent. Aucune donnée pré-existante (la table était vide en prod
-- jusqu'au 1er request réussi, et ce request a échoué avant write).
-- =====================================================================

ALTER TABLE public.assistant_action_log
  DROP CONSTRAINT IF EXISTS assistant_action_log_risk_tier_check;

ALTER TABLE public.assistant_action_log
  ADD CONSTRAINT assistant_action_log_risk_tier_check
  CHECK (risk_tier IN ('read','low','medium','high'));

NOTIFY pgrst, 'reload schema';
