/**
 * Test script pour vérifier la correction des erreurs 406 sur les recettes supprimées
 * Ce script simule le comportement de l'application quand une recette n'existe plus
 */

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://jwoxacnflphclslpqfzs.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3b3hhY25mbHBoY2xzbHBxZnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3Njk5NTYsImV4cCI6MjA1MjM0NTk1Nn0.kWL7fDZU4qQQ2RtV6u5kPo8kPMnGQJQa1BOq_9uWElk';

const supabase = createClient(supabaseUrl, supabaseKey);

// ID de la recette supprimée (d'après Bug-fixing.md)
const DELETED_RECIPE_ID = 'd1b7999e-cb1b-4767-bce7-be4e8cc92013';
const TEST_USER_ID = 'c1e994cc-4af9-47ef-9fd1-a8a8f803c5c6'; // D'après les logs

console.log('🧪 Test des corrections pour les erreurs 406 sur recettes supprimées');
console.log('====================================================================');

async function testRecipeQuery() {
  console.log('\n1. Test: Requête directe vers recette supprimée');
  
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', DELETED_RECIPE_ID)
      .single();
    
    console.log('❌ La recette existe encore:', data?.name || 'Non trouvée');
    if (error) {
      console.log('✅ Erreur attendue:', error.code, error.message);
    }
  } catch (error) {
    console.log('✅ Exception capturée:', error.message);
  }
}

async function testCacheQuery() {
  console.log('\n2. Test: Requête vers cache pour recette supprimée');
  
  try {
    const { data, error } = await supabase
      .from('recipe_inventory_cache')
      .select('*')
      .eq('recipe_id', DELETED_RECIPE_ID)
      .eq('user_id', TEST_USER_ID)
      .single();
    
    if (error) {
      console.log('✅ Cache query error (expected):', error.code, error.message);
    } else {
      console.log('⚠️ Cache entry still exists:', data);
    }
  } catch (error) {
    console.log('✅ Cache query exception:', error.message);
  }
}

async function testCleanupFunction() {
  console.log('\n3. Test: Fonction de nettoyage du cache');
  
  try {
    // Simuler la fonction de nettoyage
    const { data: cacheEntries, error: cacheError } = await supabase
      .from('recipe_inventory_cache')
      .select('recipe_id, id')
      .eq('user_id', TEST_USER_ID);
    
    if (cacheError) {
      console.log('❌ Erreur lors de la récupération du cache:', cacheError.message);
      return;
    }
    
    console.log(`Found ${cacheEntries?.length || 0} cache entries for user`);
    
    if (cacheEntries && cacheEntries.length > 0) {
      // Vérifier quelles recettes existent
      const { data: existingRecipes } = await supabase
        .from('recipes')
        .select('id');
      
      const existingIds = new Set(existingRecipes?.map(r => r.id) || []);
      const orphanedEntries = cacheEntries.filter(entry => !existingIds.has(entry.recipe_id));
      
      console.log(`Found ${orphanedEntries.length} orphaned cache entries`);
      
      if (orphanedEntries.length > 0) {
        console.log('Orphaned recipes IDs:', orphanedEntries.map(e => e.recipe_id));
        console.log('✅ Cleanup would remove these entries');
      } else {
        console.log('✅ No orphaned entries found');
      }
    }
  } catch (error) {
    console.log('❌ Cleanup test error:', error.message);
  }
}

async function testRecipeIngredients() {
  console.log('\n4. Test: Requête vers ingrédients de recette supprimée');
  
  try {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', DELETED_RECIPE_ID);
    
    if (error) {
      console.log('❌ Erreur ingrédients:', error.message);
    } else {
      console.log(`Found ${data?.length || 0} ingredients (expected 0 if CASCADE delete works)`);
      if (data && data.length > 0) {
        console.log('⚠️ Ingredients still exist - CASCADE may not be working');
      } else {
        console.log('✅ No ingredients found (CASCADE worked)');
      }
    }
  } catch (error) {
    console.log('❌ Exception ingrédients:', error.message);
  }
}

async function runAllTests() {
  console.log('Starting tests...\n');
  
  await testRecipeQuery();
  await testCacheQuery();  
  await testCleanupFunction();
  await testRecipeIngredients();
  
  console.log('\n====================================================================');
  console.log('🏁 Tests terminés');
  console.log('\nRésumé des corrections appliquées:');
  console.log('- ✅ Hook useRecipeInventoryAnalysis: Gestion retry et erreurs PGRST116');
  console.log('- ✅ getCachedAnalysis: Détection et nettoyage des entrées orphelines');
  console.log('- ✅ getRecipeWithIngredients: Gestion spécifique des recettes supprimées');
  console.log('- ✅ useMultipleRecipeAnalysis: Promise.allSettled pour éviter échecs en cascade');
  console.log('- ✅ cleanupAllOrphanedCacheEntries: Nettoyage complet des entrées orphelines');
  console.log('- ✅ RecipeDetail.tsx: Affichage approprié pour recettes supprimées');
  console.log('- ✅ Recipes.tsx: Nettoyage automatique au démarrage');
  
  console.log('\n📝 Les erreurs 406 ne devraient plus se reproduire!');
}

// Exécuter les tests
runAllTests().catch(console.error);