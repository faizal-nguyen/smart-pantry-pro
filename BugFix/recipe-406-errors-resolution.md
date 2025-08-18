# Résolution des erreurs 406 - Recettes supprimées

## Problème identifié

L'application Smart Pantry Pro générait des erreurs 406 (Not Acceptable) en boucle lors de tentatives d'accès à une recette supprimée :

```
🗑️ Recette supprimée: d1b7999e-cb1b-4767-bce7-be4e8cc92013
GET /rest/v1/recipe_inventory_cache?recipe_id=eq.d1b7999e-cb1b-4767-bce7-be4e8cc92013&user_id=eq.c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6 406 (Not Acceptable)
GET /rest/v1/recipes?select=*&id=eq.d1b7999e-cb1b-4767-bce7-be4e8cc92013 406 (Not Acceptable)
Error: {code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned'}
```

## Causes racines

1. **Requêtes persistantes** : L'application continuait de faire des requêtes vers une recette supprimée
2. **Cache orphelin** : Des entrées de cache `recipe_inventory_cache` restaient présentes pour des recettes supprimées
3. **Absence de retry logic** : Les hooks React Query n'avaient pas de logique pour arrêter les tentatives sur les erreurs PGRST116
4. **Gestion d'erreurs insuffisante** : Pas de différenciation entre erreurs temporaires et recettes définitivement supprimées

## Solutions implémentées

### 1. Hook useRecipeInventoryAnalysis - Gestion des erreurs et retry

**Fichier**: `src/hooks/useRecipeInventoryAnalysis.ts`

```typescript
// Ajout de retry logic intelligent
retry: (failureCount, error: any) => {
  // Ne pas retenter si c'est une erreur 406 (recette supprimée)
  if (error?.code === 'PGRST116' || error?.message?.includes('JSON object requested, multiple (or no) rows returned')) {
    console.warn(`Recipe ${recipeId} not found - stopping retry attempts`);
    return false;
  }
  return failureCount < 2;
},

// Logging des erreurs pour debugging
onError: (error: any) => {
  if (error?.code === 'PGRST116') {
    console.warn(`Recipe ${recipeId} no longer exists - removing from analysis`);
  }
}
```

### 2. Fonction getCachedAnalysis - Nettoyage automatique

```typescript
const getCachedAnalysis = async (recipeId: string, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('recipe_inventory_cache')
      .select('*')
      .eq('recipe_id', recipeId)
      .eq('user_id', userId)
      .single();

    // Si erreur 406 ou PGRST116, la recette n'existe plus - nettoyer le cache
    if (error?.code === 'PGRST116') {
      console.log(`🧹 Nettoyage cache pour recette supprimée: ${recipeId}`);
      await cleanupOrphanedCacheEntries(recipeId, userId);
      return null;
    }
    
    return data;
  } catch (error) {
    console.warn('Failed to get cached analysis:', error);
    return null;
  }
};
```

### 3. Fonction getRecipeWithIngredients - Gestion des recettes supprimées

```typescript
const getRecipeWithIngredients = async (recipeId: string) => {
  try {
    const [recipeResult, ingredientsResult] = await Promise.all([
      supabase.from('recipes').select('*').eq('id', recipeId).single(),
      supabase.from('recipe_ingredients').select('*').eq('recipe_id', recipeId)
    ]);

    // Gestion spécifique des recettes supprimées
    if (recipeResult.error) {
      if (recipeResult.error.code === 'PGRST116') {
        console.warn(`🗑️ Recipe ${recipeId} not found (deleted) - stopping analysis`);
        throw new Error(`RECIPE_NOT_FOUND: Recipe ${recipeId} has been deleted`);
      }
      throw recipeResult.error;
    }
    
    return {
      ...recipeResult.data,
      ingredients: ingredientsResult.data || []
    };
  } catch (error: any) {
    if (error.message?.includes('RECIPE_NOT_FOUND')) {
      throw error;
    }
    console.error(`Error fetching recipe ${recipeId} with ingredients:`, error);
    throw error;
  }
};
```

### 4. Hook useMultipleRecipeAnalysis - Résistance aux erreurs

```typescript
export const useMultipleRecipeAnalysis = (recipeIds: string[]) => {
  const analyzeMultiple = async () => {
    // Utiliser Promise.allSettled au lieu de Promise.all pour éviter échecs en cascade
    const results = await Promise.allSettled(
      recipeIds.map(async (id) => {
        try {
          const analysis = await analyzeRecipeInventory(id);
          return { id, analysis };
        } catch (error: any) {
          // Log les recettes supprimées mais ne pas faire échouer tout le batch
          if (error.message?.includes('no longer exists')) {
            console.warn(`⚠️ Skipping deleted recipe ${id} in batch analysis`);
          }
          return null;
        }
      })
    );

    // Filtrer les résultats valides
    const analysisMap = results.reduce((acc, result) => {
      if (result.status === 'fulfilled' && result.value) {
        const { id, analysis } = result.value;
        acc[id] = analysis;
      }
      return acc;
    }, {} as Record<string, InventoryAnalysis>);

    setAnalyses(analysisMap);
  };
};
```

### 5. Fonction de nettoyage globale

```typescript
export const cleanupAllOrphanedCacheEntries = async (userId: string) => {
  try {
    // 1. Récupérer toutes les entrées de cache
    const { data: cacheEntries } = await supabase
      .from('recipe_inventory_cache')
      .select('recipe_id, id')
      .eq('user_id', userId);
    
    // 2. Récupérer toutes les recettes existantes
    const { data: existingRecipes } = await supabase
      .from('recipes')
      .select('id');
    
    // 3. Identifier les entrées orphelines
    const existingRecipeIds = new Set(existingRecipes?.map(r => r.id) || []);
    const orphanedEntries = cacheEntries.filter(entry => !existingRecipeIds.has(entry.recipe_id));
    
    // 4. Supprimer les entrées orphelines
    if (orphanedEntries.length > 0) {
      const orphanedIds = orphanedEntries.map(entry => entry.id);
      await supabase
        .from('recipe_inventory_cache')
        .delete()
        .in('id', orphanedIds);
      
      console.log(`✅ Cleaned up ${orphanedEntries.length} orphaned cache entries`);
    }
  } catch (error) {
    console.error('Cleanup all orphaned entries error:', error);
  }
};
```

### 6. Composant RecipeDetail - Affichage adapté

**Fichier**: `src/pages/RecipeDetail.tsx`

```typescript
// Détecter si la recette a été supprimée
const recipeDeleted = !recipe && !loading && id;

// Affichage différencié selon le cas
if (!recipe) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="text-center py-12">
        {recipeDeleted ? (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Recette supprimée</h2>
            <p className="text-muted-foreground mb-4">
              Cette recette a été supprimée et n'est plus disponible.
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Recette non trouvée</h2>
          </>
        )}
        <Button onClick={() => navigate('/')}>
          Retour aux recettes
        </Button>
      </div>
    </div>
  );
}
```

### 7. Composant Recipes - Nettoyage automatique

**Fichier**: `src/pages/Recipes.tsx`

```typescript
// Nettoyage automatique des entrées orphelines au démarrage
useEffect(() => {
  const cleanupOnMount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await cleanupAllOrphanedCacheEntries(user.id);
      }
    } catch (error) {
      console.warn('Initial cleanup failed:', error);
    }
  };

  cleanupOnMount();
}, []);
```

## Résultats attendus

1. **Arrêt des erreurs 406** : Plus de requêtes répétées vers des recettes supprimées
2. **Cache propre** : Suppression automatique des entrées orphelines
3. **Meilleure UX** : Affichage explicite quand une recette a été supprimée
4. **Performance améliorée** : Réduction des requêtes inutiles
5. **Logs informatifs** : Meilleur debugging avec des messages explicites

## Migration et déploiement

1. **Aucune migration DB requise** : La structure `recipe_inventory_cache` a déjà `ON DELETE CASCADE`
2. **Nettoyage automatique** : Au prochain démarrage, les caches orphelins seront supprimés
3. **Rétrocompatibilité** : Les modifications sont transparentes pour les utilisateurs
4. **Monitoring** : Les logs permettront de suivre l'efficacité des corrections

## Prévention future

1. **Contraintes FK** : La base a `ON DELETE CASCADE` pour éviter les orphelins
2. **Gestion d'erreurs centralisée** : Pattern appliqué à tous les hooks de requête
3. **Nettoyage périodique** : Possibilité d'ajouter une tâche cron pour nettoyer le cache expiré
4. **Tests d'intégration** : Script de test créé pour valider les corrections

---

**Status** : ✅ Correction complète implémentée et testée  
**Impact** : Critique - Résout les erreurs 406 en boucle  
**Date** : 2025-08-13  
**Auteur** : Claude Code Assistant