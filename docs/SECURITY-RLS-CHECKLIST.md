# Checklist Sécurité Row Level Security (RLS) - Smart Pantry Pro

## 📋 Vue d'ensemble

Ce document liste toutes les vérifications de sécurité RLS à effectuer pour Smart Pantry Pro. Chaque table critique doit respecter ces règles pour garantir l'isolation des données utilisateur.

## 🎯 Objectifs de Sécurité

1. **Isolation utilisateur**: Chaque utilisateur ne peut accéder qu'à ses propres données
2. **Protection contre l'escalade**: Aucun utilisateur ne peut accéder aux données d'un autre
3. **Données publiques contrôlées**: Les données partagées doivent avoir un flag explicite
4. **Audit trail**: Toutes les modifications doivent être traçables

## 📊 Tables Critiques

### ✅ **profiles** (Profils utilisateurs)

- [ ] RLS activé: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;`
- [ ] **Policy SELECT**: Utilisateur ne peut voir que son profil
  ```sql
  CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);
  ```
- [ ] **Policy UPDATE**: Utilisateur ne peut modifier que son profil
  ```sql
  CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);
  ```
- [ ] **Policy INSERT**: Création automatique via trigger auth
  ```sql
  CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
  ```
- [ ] **Policy DELETE**: Désactivé (soft delete via `deleted_at`)
- [ ] Test: User A ne peut pas voir/modifier profile de User B
- [ ] Test: Utilisateur anonyme ne peut rien voir

**Score sécurité**: 🟢 CRITIQUE - Doit être parfait

---

### ✅ **inventory** (Inventaire)

- [ ] RLS activé
- [ ] **Policy SELECT**: `user_id = auth.uid()`
  ```sql
  CREATE POLICY "Users can view own inventory"
    ON inventory FOR SELECT
    USING (user_id = auth.uid());
  ```
- [ ] **Policy INSERT**: `user_id = auth.uid()`
  ```sql
  CREATE POLICY "Users can insert own inventory"
    ON inventory FOR INSERT
    WITH CHECK (user_id = auth.uid());
  ```
- [ ] **Policy UPDATE**: `user_id = auth.uid()`
  ```sql
  CREATE POLICY "Users can update own inventory"
    ON inventory FOR UPDATE
    USING (user_id = auth.uid());
  ```
- [ ] **Policy DELETE**: `user_id = auth.uid()`
  ```sql
  CREATE POLICY "Users can delete own inventory"
    ON inventory FOR DELETE
    USING (user_id = auth.uid());
  ```
- [ ] Index sur `user_id` pour performance
- [ ] Test: User A ne peut pas voir inventory de User B
- [ ] Test: Utilisateur anonyme retourne 0 résultats

**Score sécurité**: 🟢 CRITIQUE - Isolation stricte

---

### ✅ **recipes** (Recettes)

- [ ] RLS activé
- [ ] **Policy SELECT**: Public OR owner
  ```sql
  CREATE POLICY "Users can view public recipes or own recipes"
    ON recipes FOR SELECT
    USING (is_public = true OR user_id = auth.uid());
  ```
- [ ] **Policy INSERT**: Créateur automatique
  ```sql
  CREATE POLICY "Authenticated users can insert recipes"
    ON recipes FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  ```
- [ ] **Policy UPDATE**: Owner uniquement
  ```sql
  CREATE POLICY "Users can update own recipes"
    ON recipes FOR UPDATE
    USING (auth.uid() = user_id);
  ```
- [ ] **Policy DELETE**: Owner uniquement
  ```sql
  CREATE POLICY "Users can delete own recipes"
    ON recipes FOR DELETE
    USING (auth.uid() = user_id);
  ```
- [ ] Index composite sur `(is_public, user_id)`
- [ ] Test: User A voit ses recettes + recettes publiques
- [ ] Test: User A ne peut pas modifier recettes publiques d'autres users
- [ ] Test: Utilisateur anonyme voit uniquement recettes publiques

**Score sécurité**: 🟡 PUBLIC - Attention aux recettes publiques

---

### ✅ **shopping_lists** (Listes de courses)

- [ ] RLS activé
- [ ] **Policy SELECT**: Owner OU partagé avec
  ```sql
  CREATE POLICY "Users can view own or shared shopping lists"
    ON shopping_lists FOR SELECT
    USING (
      user_id = auth.uid()
      OR auth.uid() = ANY(shared_with)
    );
  ```
- [ ] **Policy INSERT**: Owner uniquement
  ```sql
  CREATE POLICY "Users can insert own shopping lists"
    ON shopping_lists FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  ```
- [ ] **Policy UPDATE**: Owner uniquement (pas shared_with)
  ```sql
  CREATE POLICY "Users can update own shopping lists"
    ON shopping_lists FOR UPDATE
    USING (auth.uid() = user_id);
  ```
- [ ] **Policy DELETE**: Owner uniquement
  ```sql
  CREATE POLICY "Users can delete own shopping lists"
    ON shopping_lists FOR DELETE
    USING (auth.uid() = user_id);
  ```
- [ ] Index GIN sur `shared_with` pour performance
- [ ] Test: User B (shared_with) peut voir mais pas modifier
- [ ] Test: User C (non partagé) ne peut rien voir

**Score sécurité**: 🟡 SHARED - Vérifier permissions partagées

---

### ✅ **meal_plans** (Planification repas)

- [ ] RLS activé
- [ ] **Policy SELECT**: Owner OU famille
  ```sql
  CREATE POLICY "Users can view own meal plans"
    ON meal_plans FOR SELECT
    USING (
      user_id = auth.uid()
      OR family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )
    );
  ```
- [ ] **Policy INSERT**: Owner uniquement
- [ ] **Policy UPDATE**: Owner + famille si feature enabled
- [ ] **Policy DELETE**: Owner uniquement
- [ ] Test: Membres famille peuvent voir mais respect permissions
- [ ] Test: Non-membres ne peuvent rien voir

**Score sécurité**: 🟡 FAMILY - Dépend de feature famille

---

### ✅ **notifications** (Notifications)

- [ ] RLS activé
- [ ] **Policy SELECT**: Destinataire uniquement
  ```sql
  CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());
  ```
- [ ] **Policy INSERT**: System uniquement (via service_role)
- [ ] **Policy UPDATE**: Destinataire (mark as read)
  ```sql
  CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());
  ```
- [ ] **Policy DELETE**: Destinataire uniquement
- [ ] Test: User ne peut pas voir notifications d'autres users

**Score sécurité**: 🟢 CRITICAL - Messages privés

---

### ✅ **audit_logs** (Logs d'audit)

- [ ] RLS activé
- [ ] **Policy SELECT**: Owner uniquement
  ```sql
  CREATE POLICY "Users can view own audit logs"
    ON audit_logs FOR SELECT
    USING (user_id = auth.uid());
  ```
- [ ] **Policy INSERT**: System uniquement (via trigger)
- [ ] **Policy UPDATE**: Interdit
- [ ] **Policy DELETE**: Interdit (immutable)
- [ ] Test: User ne peut pas modifier/supprimer logs
- [ ] Test: Admin peut voir tous les logs (via service_role)

**Score sécurité**: 🟢 CRITICAL - Audit trail immutable

---

## 🧪 Tests de Sécurité

### Test Suite Obligatoire

```sql
-- 1. Test utilisateur anonyme
SET ROLE anon;
SELECT COUNT(*) FROM profiles;        -- Devrait = 0
SELECT COUNT(*) FROM inventory;       -- Devrait = 0
SELECT COUNT(*) FROM recipes WHERE is_public = false;  -- Devrait = 0
RESET ROLE;

-- 2. Test utilisateur A
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-a-uuid';
SELECT COUNT(*) FROM inventory WHERE user_id != 'user-a-uuid';  -- Devrait = 0
RESET ROLE;

-- 3. Test injection SQL via RLS
-- Vérifier que RLS ne peut pas être contourné
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-a-uuid'' OR 1=1 --';
SELECT COUNT(*) FROM inventory;  -- Devrait = 0 ou erreur
RESET ROLE;
```

### Script de Test Automatisé

```bash
# Exécuter le script d'audit RLS
psql $DATABASE_URL -f scripts/audit-rls.sql

# Vérifier le score de sécurité
# Score attendu: 🟢 EXCELLENT
```

---

## 📈 Métriques de Succès

### Critères d'Acceptation

- ✅ **100% des tables** ont RLS activé
- ✅ **100% des tables** ont au moins 1 policy par opération (SELECT/INSERT/UPDATE/DELETE)
- ✅ **100% des policies** utilisent `auth.uid()` ou équivalent sécurisé
- ✅ **0 tables** accessibles par utilisateur anonyme non autorisé
- ✅ **Tests de sécurité** passent à 100%

### Dashboard RLS

| Métrique | Target | Actuel | Status |
|----------|--------|--------|--------|
| Tables avec RLS | 100% | ___ % | ⚠️ |
| Policies définies | 100% | ___ % | ⚠️ |
| Tests passés | 100% | ___ % | ⚠️ |
| Failles trouvées | 0 | ___ | ⚠️ |

---

## 🚨 Actions Immédiates si Échec

### Si RLS non activé sur une table

```sql
-- URGENT: Activer RLS immédiatement
ALTER TABLE nom_table ENABLE ROW LEVEL SECURITY;

-- Créer policy temporaire restrictive
CREATE POLICY "temporary_lockdown"
  ON nom_table FOR ALL
  USING (auth.uid() IS NOT NULL AND false);  -- Bloque tout

-- Créer les policies correctes ensuite
-- DROP POLICY "temporary_lockdown" ON nom_table;
```

### Si policy trop permissive détectée

```sql
-- 1. Identifier la policy
SELECT * FROM pg_policies WHERE tablename = 'nom_table';

-- 2. Supprimer la policy dangereuse
DROP POLICY "policy_dangereuse" ON nom_table;

-- 3. Créer policy sécurisée
CREATE POLICY "policy_securisee"
  ON nom_table FOR SELECT
  USING (user_id = auth.uid());
```

---

## 📚 Ressources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [RLS Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security#best-practices)

---

## ✅ Validation Finale

**Checklist avant déploiement production:**

- [ ] Audit RLS exécuté et validé (score 🟢 EXCELLENT)
- [ ] Tous les tests de sécurité passent
- [ ] Documentation RLS à jour
- [ ] Équipe formée sur les policies RLS
- [ ] Monitoring des accès configuré
- [ ] Plan de rollback en place
- [ ] Backup database effectué

**Signataire sécurité**: _____________
**Date validation**: _____________
**Environnement**: [ ] Dev [ ] Staging [ ] Production

---

**Dernière mise à jour**: 2025-10-03
**Version**: 1.0.0
**Prochaine révision**: 2025-11-03
