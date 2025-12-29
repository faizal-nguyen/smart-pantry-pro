# Configuration du Système Contextuel - Guide d'Installation

## 🎯 Vue d'ensemble

Ce guide vous aide à configurer le système contextuel intelligent (PRP-032.4) qui adapte automatiquement les plans de repas selon :

- ☀️ **Météo** : Adaptation des plats selon la température et conditions
- 📅 **Planning** : Ajustement selon les horaires chargés/libres  
- 🍅 **Saisonnalité** : Optimisation des produits de saison français
- 🏷️ **Promotions** : Intégration des offres des magasins partenaires
- 👨‍👩‍👧‍👦 **Mode Famille** : Coordination des préférences multiples

## 🗄️ Migrations de Base de Données

### Ordre d'exécution recommandé :

1. **Migration principale** (si les tables n'existent pas) :
   ```sql
   -- Exécuter d'abord
   20250830000003_create_contextual_system_tables_fixed.sql
   ```

2. **Correction des contraintes** (si erreur ON CONFLICT) :
   ```sql
   -- Puis exécuter si nécessaire
   20250830000004_fix_contextual_constraints.sql
   ```

3. **Vérification du système** :
   ```sql
   -- Enfin, vérifier que tout fonctionne
   20250830000005_verify_contextual_system.sql
   ```

## 🚨 Résolution des Erreurs Communes

### Erreur : "relation weekly_meal_plans does not exist"

**Solution** : La migration `20250830000003_create_contextual_system_tables_fixed.sql` crée automatiquement cette table si elle n'existe pas.

```sql
-- La migration vérifie et crée automatiquement :
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weekly_meal_plans') THEN
        CREATE TABLE public.weekly_meal_plans (...);
    END IF;
END $$;
```

### Erreur : "no unique constraint matching ON CONFLICT"

**Solution** : Exécuter la migration de correction `20250830000004_fix_contextual_constraints.sql`

```sql
-- Ajoute la contrainte UNIQUE manquante
ALTER TABLE public.seasonal_products 
ADD CONSTRAINT seasonal_products_product_name_key UNIQUE (product_name);
```

## 📊 Structure des Tables

### Tables Principales :
- `contextual_planning_data` - Données contextuelles centralisées
- `contextual_user_preferences` - Préférences utilisateur  
- `context_adaptations_log` - Historique des adaptations avec feedback
- `seasonal_products` - Base de produits saisonniers français
- `store_partnerships` - Intégrations magasins
- `active_promotions` - Promotions en cours

### Mode Famille :
- `families` - Gestion des groupes familiaux
- `family_members` - Membres avec rôles (parent, enfant, autre)
- `family_conflict_resolutions` - Résolution automatique de conflits

### Performance :
- `context_cache` - Cache des données externes (météo, calendrier)
- `context_rules` - Règles d'adaptation automatique

## 🔧 Configuration des Services

### 1. Variables d'Environnement

Ajouter dans `.env.local` :

```env
# APIs Météo
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_key
NEXT_PUBLIC_WEATHERAPI_KEY=your_weatherapi_key

# APIs Calendrier  
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret

# API OpenAI pour Cipher
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key
```

### 2. Intégration dans l'Application

```typescript
// Import du système contextuel
import { 
  contextAdapter,
  weatherContextService,
  familyContextCoordinator 
} from '@/services/context';

// Hook React pour le mode famille
import { useFamilyContext } from '@/hooks/useFamilyContext';

// Composants UI
import { ContextualPanel, FamilyContextPanel } from '@/components/context';
```

### 3. Utilisation Basique

```typescript
// Adaptation automatique d'un plan de repas
const adaptedPlan = await contextAdapter.adaptMealPlan(
  basePlan,
  userId,
  userPreferences
);

// Coordination famille
const familyResult = await familyContextCoordinator.coordinateFamilyAdaptations(
  familyId,
  basePlan,
  familyMembers
);
```

## 🎛️ Composants Frontend

### Panel Contextuel Individuel

```tsx
<ContextualPanel 
  planId="plan-123"
  userId="user-456"
  onRefresh={() => console.log('Context refreshed')}
/>
```

### Panel Famille

```tsx  
<FamilyContextPanel
  familyId="family-789"
  planId="plan-123"
  onRefresh={() => console.log('Family context updated')}
/>
```

## 🧪 Tests

Exécuter les tests du système contextuel :

```bash
# Tests unitaires
npm test src/services/context/__tests__

# Tests d'intégration
npm test src/services/context/__tests__/ContextualSystem.integration.test.ts

# Coverage
npm test -- --coverage src/services/context
```

## 📈 Monitoring

Le système génère automatiquement des métriques :

- ⚡ **Performance** : Temps d'adaptation (<5s recommandé)
- 🎯 **Précision** : Taux d'acceptation des adaptations  
- 👥 **Consensus** : Score de satisfaction familiale (0-1)
- 💾 **Cache** : Hit ratio du cache contextuel

## 🔄 Mode Développement

Pour tester le système avec des données mock :

```typescript
// Services utilisent automatiquement des données de fallback
const mockWeather = await weatherContextService.getWeatherContext({
  lat: 48.8566, 
  lng: 2.3522 
});

// Les APIs externes échouent gracieusement
```

## 🚀 Déploiement

1. **Vérifier les migrations** :
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations 
   WHERE version LIKE '20250830%';
   ```

2. **Tester les services** :
   ```bash
   npm run test:contextual
   ```

3. **Valider les performances** :
   ```bash
   npm run test:integration
   ```

## 📞 Support

En cas de problème :

1. **Vérifier les logs** dans la console du navigateur
2. **Exécuter le script de vérification** `20250830000005_verify_contextual_system.sql`
3. **Consulter les tests** pour voir les cas d'usage attendus
4. **Vérifier les variables d'environnement** pour les clés API

Le système est conçu pour être **résilient** - il fonctionne même si certains services externes sont indisponibles, en utilisant des données de cache et des fallbacks intelligents.

## 🎉 Fonctionnalités Clés

- ✅ **Adaptation Automatique** selon 4 contextes
- ✅ **Mode Famille** avec résolution de conflits IA  
- ✅ **Apprentissage Continu** via intégration Cipher
- ✅ **Performance Optimisée** avec cache multicouche
- ✅ **Robustesse** avec fallbacks gracieux
- ✅ **Tests Complets** unitaires et d'intégration

Le système contextuel est maintenant **prêt pour la production** ! 🚀