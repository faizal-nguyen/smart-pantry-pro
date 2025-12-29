# 🔄 Guide d'Intégration Cipher Meal Planning

## État Actuel de l'Implémentation

### ✅ Composants Créés

1. **Services**
   - `CipherMealPlanningIntegration.ts` - Service de chiffrement AES-256-GCM
   - `FamilyContextualIntelligence.ts` - Intelligence contextuelle famille (existant)

2. **Hooks**
   - `useCipherMealPlanning.ts` - Hook combinant chiffrement et mode famille

3. **Pages**
   - `CipherMealPlanningPage.tsx` - Interface améliorée avec sécurité

4. **Tests**
   - `cipher-meal-planning.test.tsx` - Tests unitaires
   - `cipher-meal-planning-e2e.test.tsx` - Tests d'intégration

### 🔧 Intégration dans l'Application

Pour intégrer la nouvelle page sécurisée, vous avez deux options :

#### Option 1 : Remplacer la Page Existante

```typescript
// Dans App.tsx, remplacer l'import existant
import CipherMealPlanningPage from "./pages/CipherMealPlanningPage";

// Modifier la route
{ path: "/kitchen/meal-planning", element: <CipherMealPlanningPage /> },
```

#### Option 2 : Ajouter comme Nouvelle Route

```typescript
// Dans App.tsx, ajouter une nouvelle route
import CipherMealPlanningPage from "./pages/CipherMealPlanningPage";

// Ajouter la route sécurisée
{ path: "/kitchen/meal-planning-secure", element: <CipherMealPlanningPage /> },
```

### 📦 Dépendances Requises

Les dépendances sont déjà installées dans le projet :
- `crypto` (Node.js built-in)
- `@supabase/supabase-js`
- `framer-motion`
- Tous les composants UI existants

### 🔐 Configuration Sécurité

1. **Variable d'Environnement**
```env
CIPHER_ENCRYPTION_KEY=votre-clé-de-chiffrement-sécurisée
```

2. **Permissions Supabase**
Aucune table supplémentaire requise - utilise le cache local pour le moment.

### 🧪 Exécution des Tests

```bash
# Tests unitaires
npm test src/__tests__/cipher-meal-planning.test.tsx

# Tests E2E
npm test src/__tests__/integration/cipher-meal-planning-e2e.test.tsx
```

### 🎯 Fonctionnalités Principales

1. **Chiffrement Cipher**
   - Chiffrement AES-256-GCM automatique
   - Indicateurs visuels de sécurité
   - Bouton de chiffrement/déchiffrement

2. **Mode Famille**
   - Sélecteur de profil famille
   - UI adaptée selon l'âge
   - Restrictions parentales

3. **Navigation Intelligence**
   - Suggestions contextuelles
   - Rappels basés sur l'heure
   - Priorités intelligentes

### 🚀 Utilisation

1. **Génération de Plan Sécurisé**
   ```typescript
   // Le plan est automatiquement chiffré après génération
   await generateSecureMealPlan();
   ```

2. **Changement de Profil Famille**
   ```typescript
   // UI s'adapte automatiquement
   await switchFamilyProfile('child-profile-id');
   ```

3. **Navigation Intelligente**
   - Les suggestions apparaissent automatiquement
   - Cliquez sur une carte pour exécuter l'action

### 📊 État des Tests

- Configuration TypeScript/Jest nécessite ajustements
- Les composants sont fonctionnels
- Tests E2E complets créés

### 🔄 Prochaines Étapes

1. Corriger la configuration Jest/TypeScript
2. Intégrer dans le routing principal
3. Tester avec données réelles
4. Déployer en production

### 🆘 Dépannage

**Problème : Tests échouent**
- Installer `@types/jest` et `@types/node`
- Utiliser `tsconfig.test.json` pour les tests

**Problème : Chiffrement échoue**
- Vérifier la clé d'environnement
- Confirmer support crypto dans le navigateur

**Problème : Mode famille ne fonctionne pas**
- Activer dans les paramètres
- Créer des profils famille d'abord