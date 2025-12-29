-- =====================================================
-- Smart Pantry Pro - Row Level Security (RLS) Audit
-- =====================================================
-- Ce script audite toutes les policies RLS et identifie
-- les tables sans protection adéquate
--
-- Usage: Exécuter dans Supabase SQL Editor
-- =====================================================

-- 1. AUDIT DE TOUTES LES POLICIES RLS EXISTANTES
-- =====================================================

SELECT
  schemaname AS "Schema",
  tablename AS "Table",
  policyname AS "Policy Name",
  permissive AS "Permissive",
  roles AS "Roles",
  cmd AS "Command",
  qual AS "USING Clause",
  with_check AS "WITH CHECK Clause"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 2. VÉRIFIER LES TABLES SANS RLS ACTIVÉ
-- =====================================================

SELECT
  schemaname AS "Schema",
  tablename AS "Table",
  rowsecurity AS "RLS Enabled",
  CASE
    WHEN rowsecurity = false THEN '⚠️ CRITICAL: RLS not enabled!'
    ELSE '✅ OK'
  END AS "Status"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

-- 3. VÉRIFIER LES TABLES AVEC RLS MAIS SANS POLICIES
-- =====================================================

SELECT
  t.schemaname AS "Schema",
  t.tablename AS "Table",
  t.rowsecurity AS "RLS Enabled",
  COUNT(p.policyname) AS "Policy Count",
  CASE
    WHEN t.rowsecurity = true AND COUNT(p.policyname) = 0
      THEN '⚠️ WARNING: RLS enabled but no policies defined!'
    WHEN t.rowsecurity = false
      THEN '❌ ERROR: RLS not enabled!'
    ELSE '✅ OK'
  END AS "Status"
FROM pg_tables t
LEFT JOIN pg_policies p
  ON t.schemaname = p.schemaname
  AND t.tablename = p.tablename
WHERE t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename, t.rowsecurity
ORDER BY "Status" DESC, t.tablename;

-- 4. VÉRIFIER LES POLICIES AVEC auth.uid()
-- =====================================================

SELECT
  schemaname AS "Schema",
  tablename AS "Table",
  policyname AS "Policy",
  cmd AS "Command",
  CASE
    WHEN qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%'
      THEN '✅ Uses auth.uid()'
    ELSE '⚠️ WARNING: Does not use auth.uid()'
  END AS "Auth Check"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 5. COMPTER LES POLICIES PAR TABLE
-- =====================================================

SELECT
  p.tablename AS "Table",
  COUNT(CASE WHEN p.cmd = 'SELECT' THEN 1 END) AS "SELECT Policies",
  COUNT(CASE WHEN p.cmd = 'INSERT' THEN 1 END) AS "INSERT Policies",
  COUNT(CASE WHEN p.cmd = 'UPDATE' THEN 1 END) AS "UPDATE Policies",
  COUNT(CASE WHEN p.cmd = 'DELETE' THEN 1 END) AS "DELETE Policies",
  COUNT(*) AS "Total Policies"
FROM pg_policies p
WHERE p.schemaname = 'public'
GROUP BY p.tablename
ORDER BY p.tablename;

-- 6. TEST DE SÉCURITÉ: VÉRIFIER L'ACCÈS ANONYME
-- =====================================================
-- Note: Ce test doit être exécuté en tant qu'utilisateur anonyme

/*
SET ROLE anon;

-- Tester l'accès à des tables sensibles
SELECT COUNT(*) FROM profiles;        -- Devrait retourner 0 ou erreur
SELECT COUNT(*) FROM inventory;       -- Devrait retourner 0 ou erreur
SELECT COUNT(*) FROM recipes;         -- Peut retourner des recettes publiques uniquement

RESET ROLE;
*/

-- 7. RECOMMANDATIONS DE SÉCURITÉ
-- =====================================================

SELECT
  'RECOMMENDATIONS' AS "Type",
  '
  ✅ BEST PRACTICES:

  1. Toutes les tables doivent avoir RLS activé (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
  2. Chaque table doit avoir au moins une policy par opération (SELECT, INSERT, UPDATE, DELETE)
  3. Les policies doivent utiliser auth.uid() pour isoler les données par utilisateur
  4. Les tables avec données partagées doivent vérifier les permissions (shared_with, is_public, etc.)
  5. Les policies DELETE doivent être restrictives (soft delete recommandé)
  6. Tester régulièrement avec différents rôles (anon, authenticated, service_role)
  7. Documenter chaque policy avec des commentaires SQL

  ⚠️ ANTI-PATTERNS À ÉVITER:

  1. Policies trop permissives (true AS condition)
  2. Utiliser service_role en production pour des opérations user
  3. Désactiver RLS "temporairement" et oublier de le réactiver
  4. Policies complexes avec mauvaise performance (utiliser des indexes)
  5. Oublier les policies de UPDATE/DELETE (souvent oubliées vs SELECT/INSERT)
  ' AS "Details";

-- 8. GÉNÉRER UN RAPPORT RÉSUMÉ
-- =====================================================

WITH
  tables_info AS (
    SELECT
      COUNT(*) AS total_tables,
      SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END) AS tables_with_rls
    FROM pg_tables
    WHERE schemaname = 'public'
  ),
  policies_info AS (
    SELECT
      COUNT(DISTINCT tablename) AS tables_with_policies,
      COUNT(*) AS total_policies
    FROM pg_policies
    WHERE schemaname = 'public'
  )
SELECT
  '📊 RLS AUDIT SUMMARY' AS "Report",
  json_build_object(
    'total_tables', t.total_tables,
    'tables_with_rls', t.tables_with_rls,
    'tables_without_rls', t.total_tables - t.tables_with_rls,
    'tables_with_policies', p.tables_with_policies,
    'total_policies', p.total_policies,
    'rls_coverage_percent', ROUND((t.tables_with_rls::numeric / t.total_tables::numeric) * 100, 2),
    'policy_coverage_percent', ROUND((p.tables_with_policies::numeric / t.total_tables::numeric) * 100, 2),
    'security_score', CASE
      WHEN t.tables_with_rls = t.total_tables AND p.tables_with_policies = t.total_tables THEN '🟢 EXCELLENT'
      WHEN t.tables_with_rls >= t.total_tables * 0.8 THEN '🟡 GOOD'
      WHEN t.tables_with_rls >= t.total_tables * 0.5 THEN '🟠 NEEDS IMPROVEMENT'
      ELSE '🔴 CRITICAL - Action Required'
    END
  ) AS "Summary"
FROM tables_info t, policies_info p;

-- =====================================================
-- FIN DE L'AUDIT
-- =====================================================
