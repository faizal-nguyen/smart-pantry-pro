// Orchestrateur principal pour le seeding des 50 recettes
import { KannammaScraperService } from './kannamma-scraper';
import { RecipeTranslationService } from './translation-service';
import { FoodSafetyValidator } from './food-safety-validator';
import { supabase } from '@/integrations/supabase/client';

export interface SeedingProgress {
  phase: string;
  current: number;
  total: number;
  message: string;
}

export class RecipeSeedingOrchestrator {
  private scraperService = new KannammaScraperService();
  private translationService = new RecipeTranslationService();
  private validatorService = new FoodSafetyValidator();
  
  private progressCallback?: (progress: SeedingProgress) => void;

  // Définir un callback pour suivre la progression
  onProgress(callback: (progress: SeedingProgress) => void) {
    this.progressCallback = callback;
  }

  // Fonction principale pour seeder 50 recettes
  async seedRecipes(): Promise<{
    success: boolean;
    recipesImported: number;
    totalCost: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let recipesImported = 0;
    let totalCost = 0;

    try {
      console.log('🚀 Starting recipe seeding process...');
      
      // Phase 1: Scraping
      this.updateProgress('scraping', 0, 50, 'Démarrage du scraping Kannamma Cooks...');
      
      const scrapingResult = await this.scraperService.scrapePhase1Recipes();
      totalCost += scrapingResult.totalCost;
      
      if (scrapingResult.recipes.length === 0) {
        throw new Error('Aucune recette n\'a pu être extraite');
      }
      
      this.updateProgress('scraping', scrapingResult.recipes.length, 50, 
        `${scrapingResult.recipes.length} recettes extraites avec succès`);

      // Phase 2: Traduction
      this.updateProgress('translation', 0, scrapingResult.recipes.length, 
        'Traduction des recettes en français...');
      
      const translatedRecipes = await this.translationService.translateRecipesBatch(
        scrapingResult.recipes
      );
      
      this.updateProgress('translation', translatedRecipes.length, scrapingResult.recipes.length,
        'Traduction terminée');

      // Phase 3: Validation sécurité
      this.updateProgress('validation', 0, translatedRecipes.length,
        'Validation de la sécurité alimentaire...');
      
      const validationResults = await this.validatorService.validateRecipesBatch(
        translatedRecipes
      );
      
      const validRecipes = validationResults
        .filter(r => r.passed)
        .map(r => r.recipe);
      
      this.updateProgress('validation', validRecipes.length, translatedRecipes.length,
        `${validRecipes.length} recettes validées`);

      // Phase 4: Import dans la base de données
      this.updateProgress('import', 0, validRecipes.length,
        'Import des recettes dans la base de données...');
      
      for (let i = 0; i < validRecipes.length; i++) {
        try {
          await this.importRecipeToDatabase(validRecipes[i]);
          recipesImported++;
          
          this.updateProgress('import', i + 1, validRecipes.length,
            `${i + 1}/${validRecipes.length} recettes importées`);
          
        } catch (error) {
          console.error(`Erreur import recette ${i}:`, error);
          errors.push(`Recette ${validRecipes[i].translated_title}: ${error.message}`);
        }
      }

      // Phase 5: Finalisation
      this.updateProgress('complete', recipesImported, recipesImported,
        `✅ Import terminé! ${recipesImported} recettes ajoutées.`);

      // Calculer le coût total final
      const finalCost = await this.getTotalSessionCost();
      
      return {
        success: true,
        recipesImported,
        totalCost: finalCost,
        errors
      };

    } catch (error) {
      console.error('❌ Erreur fatale:', error);
      errors.push(`Erreur fatale: ${error.message}`);
      
      return {
        success: false,
        recipesImported,
        totalCost,
        errors
      };
    }
  }

  // Importer une recette dans la base
  private async importRecipeToDatabase(recipe: any): Promise<void> {
    // Préparer les données pour l'insertion
    const recipeData = {
      name: recipe.name,
      description: recipe.description,
      cuisine_type: recipe.cuisine_type || 'Indian',
      meal_type: recipe.meal_type || 'dinner',
      prep_time: recipe.prepTime,
      cook_time: recipe.cookTime,
      total_time: recipe.prepTime + recipe.cookTime,
      servings: recipe.servings,
      difficulty: recipe.difficulty,
      source_url: recipe.sourceUrl,
      
      // Données multilingues
      original_language: 'en',
      translated_title: recipe.translated_title,
      translated_description: recipe.translated_description,
      translation_quality_score: recipe.translation_quality_score,
      
      // Sécurité alimentaire
      allergen_info: recipe.allergen_info,
      allergen_warnings: recipe.allergen_info.warnings_fr,
      dietary_tags: recipe.dietary_tags,
      spice_level: recipe.spiceLevel,
      
      // Métadonnées indiennes
      indian_cuisine_type: recipe.indian_cuisine_type,
      meal_timing: recipe.meal_timing,
      
      // Validation
      safety_validated: recipe.safety_validated,
      safety_validated_at: new Date().toISOString(),
      safety_validator_notes: recipe.safety_validator_notes,
      
      // Images
      image_url: recipe.imageUrl,
      
      // Instructions JSON
      instructions: recipe.translated_instructions
    };

    // Insérer la recette
    const { data: insertedRecipe, error: recipeError } = await supabase
      .from('recipes')
      .insert(recipeData)
      .select()
      .single();

    if (recipeError) {
      throw new Error(`Erreur insertion recette: ${recipeError.message}`);
    }

    // Insérer les ingrédients
    if (insertedRecipe && recipe.translated_ingredients) {
      const ingredientsData = recipe.translated_ingredients.map((ing: any, idx: number) => ({
        recipe_id: insertedRecipe.id,
        ingredient_name: ing.name_fr,
        quantity: ing.quantity,
        unit: ing.unit_fr,
        is_essential: ing.isEssential ?? true,
        notes: ing.notes,
        order_index: idx
      }));

      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsData);

      if (ingredientsError) {
        console.error('Erreur insertion ingrédients:', ingredientsError);
        // Non-fatal, on continue
      }
    }
  }

  // Mettre à jour la progression
  private updateProgress(phase: string, current: number, total: number, message: string) {
    const progress: SeedingProgress = { phase, current, total, message };
    console.log(`📊 [${phase}] ${current}/${total} - ${message}`);
    
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  // Obtenir le coût total de la session
  private async getTotalSessionCost(): Promise<number> {
    const { data } = await supabase
      .from('api_usage_tracking')
      .select('cost')
      .gte('timestamp', new Date(Date.now() - 7200000).toISOString()); // 2 dernières heures
    
    return data?.reduce((sum, row) => sum + (row.cost || 0), 0) || 0;
  }
}