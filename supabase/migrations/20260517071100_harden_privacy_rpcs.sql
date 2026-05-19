-- Hotfix sécurité — harden delete_user_data / export_user_data RPCs.
--
-- Contexte : la migration 20250105000009_add_privacy_tables.sql crée
-- deux RPC SECURITY DEFINER (`delete_user_data(p_user_id UUID)` et
-- `export_user_data(p_user_id UUID)`) qui acceptent un user_id
-- arbitraire et n'ont aucun garde-fou `auth.uid()`. Conséquence : un
-- utilisateur authentifié peut supprimer ou exporter les données de
-- n'importe quel autre user dont il connaît l'UUID via la console
-- DevTools (`supabase.rpc('delete_user_data', { p_user_id: <other> })`).
--
-- Ce hotfix :
--   1. Force `auth.uid() = p_user_id` au début de chaque fonction —
--      sinon RAISE EXCEPTION avec ERRCODE 'insufficient_privilege'.
--   2. `SET search_path = public` (defense in depth contre l'attaque
--      search_path classique sur SECURITY DEFINER, OWASP).
--   3. REVOKE EXECUTE FROM PUBLIC + GRANT EXECUTE TO authenticated :
--      seuls les users authentifiés peuvent appeler. Empêche d'appel
--      anonyme + restreint la surface d'attaque.
--
-- Body fonctionnel inchangé — c'est strictement un durcissement de
-- contrôle d'accès. Idempotent : `CREATE OR REPLACE` + revoke/grant
-- répétables sans effet de bord.

CREATE OR REPLACE FUNCTION public.delete_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden: caller must match p_user_id'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.inventory WHERE user_id = p_user_id;
  DELETE FROM public.recipes WHERE user_id = p_user_id;
  DELETE FROM public.shopping_list WHERE user_id = p_user_id;
  DELETE FROM public.scan_history WHERE user_id = p_user_id;
  DELETE FROM public.analytics_events WHERE user_id = p_user_id;
  DELETE FROM public.user_privacy_settings WHERE user_id = p_user_id;

  UPDATE public.data_deletion_requests
  SET status = 'completed', completed_at = NOW()
  WHERE user_id = p_user_id AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'forbidden: caller must match p_user_id'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT jsonb_build_object(
    'user_id', p_user_id,
    'export_date', NOW(),
    'inventory', (SELECT jsonb_agg(row_to_json(i.*)) FROM public.inventory i WHERE i.user_id = p_user_id),
    'recipes', (SELECT jsonb_agg(row_to_json(r.*)) FROM public.recipes r WHERE r.user_id = p_user_id),
    'shopping_list', (SELECT jsonb_agg(row_to_json(s.*)) FROM public.shopping_list s WHERE s.user_id = p_user_id),
    'scan_history', (SELECT jsonb_agg(row_to_json(h.*)) FROM public.scan_history h WHERE h.user_id = p_user_id),
    'privacy_settings', (SELECT row_to_json(p.*) FROM public.user_privacy_settings p WHERE p.user_id = p_user_id)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Restrict callable surface : seuls les users authentifiés peuvent
-- invoquer ces RPC. `anon` et `public` perdent l'accès direct.
REVOKE EXECUTE ON FUNCTION public.delete_user_data(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.export_user_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_user_data(UUID) TO authenticated;
