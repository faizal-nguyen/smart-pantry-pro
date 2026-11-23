-- V11-04 E2, correctif avancé : une confirmation prend l'action en charge
-- (`executing`) avant d'appeler son gestionnaire. Seul le résultat du
-- gestionnaire la passe en `executed` ou `failed` ; avant, la ligne passait en
-- `executed` avant l'appel, et une confirmation concurrente rapportait un
-- succès sans résultat.
--
-- Additive et rejouable : la nouvelle liste contient toutes les anciennes
-- valeurs. Retour arrière : passer d'abord les lignes `executing` en `failed`
-- (error_code 'EXECUTION_UNVERIFIED'), puis rétablir l'ancienne liste.
ALTER TABLE public.assistant_action_log
  DROP CONSTRAINT IF EXISTS assistant_action_log_status_check;

ALTER TABLE public.assistant_action_log
  ADD CONSTRAINT assistant_action_log_status_check
  CHECK (status IN ('planned','executing','executed','failed','undone','cancelled'));

NOTIFY pgrst, 'reload schema';
