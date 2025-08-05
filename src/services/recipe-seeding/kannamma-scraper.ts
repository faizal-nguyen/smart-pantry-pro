// Service de scraping Kannamma Cooks - Phase 1 (50 recettes)
// Optimisé pour coûts <200€/mois avec batch processing

import { supabase } from '@/integrations/supabase/client';

export interface KannammaRecipe {
  url: string;
  title: string;
  category: string;
  imageUrl?: string;
}

export interface ScrapedRecipe {
  name: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    isEssential: boolean;
  }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  dietaryInfo: string[];
  spiceLevel: number;
  imageUrl?: string;
  sourceUrl: string;
}

export class KannammaScraperService {
  // Déterminer l'URL de base pour les API
  private readonly API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'https://smart-pantry-pro.vercel.app'
    : '';

  // Configuration pour Phase 1 - 50 recettes seulement
  private readonly PHASE1_CATEGORIES = [
    { 
      url: 'https://www.kannammacooks.com/breakfast/', 
      category: 'breakfast', 
      frCategory: 'petit-déjeuner',
      maxRecipes: 10 // Limiter à 10 recettes par catégorie
    },
    { 
      url: 'https://www.kannammacooks.com/soups-and-rasam/', 
      category: 'soups', 
      frCategory: 'soupes-et-rasam',
      maxRecipes: 10
    },
    { 
      url: 'https://www.kannammacooks.com/rice-roti-and-biryani/', 
      category: 'mains', 
      frCategory: 'plats-principaux',
      maxRecipes: 15 // Plus de plats principaux
    },
    { 
      url: 'https://www.kannammacooks.com/gravy-kuzhambu-dal/', 
      category: 'curries', 
      frCategory: 'currys-et-dal',
      maxRecipes: 10
    },
    { 
      url: 'https://www.kannammacooks.com/category/recipes/desserts/', 
      category: 'desserts', 
      frCategory: 'desserts',
      maxRecipes: 5
    }
  ];

  private readonly BATCH_SIZE = 5; // Traiter 5 recettes à la fois pour économiser API
  private readonly DELAY_BETWEEN_BATCHES = 3000; // 3 secondes entre batches

  // Scraper les liens de recettes d'une catégorie
  async scrapeCategoryLinks(categoryUrl: string, maxRecipes: number): Promise<KannammaRecipe[]> {
    try {
      console.log(`🔍 Scraping category: ${categoryUrl}`);
      
      // Utiliser l'API Vercel pour scraper
      const response = await fetch(`${this.API_BASE_URL}/api/scrape-category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: categoryUrl, maxRecipes })
      });

      if (!response.ok) {
        throw new Error(`Failed to scrape category: ${response.status}`);
      }

      const data = await response.json();
      return data.recipes || [];
      
    } catch (error) {
      console.error(`❌ Error scraping category ${categoryUrl}:`, error);
      return [];
    }
  }

  // Extraire les recettes en batch pour économiser les coûts
  async extractRecipesBatch(recipeUrls: string[]): Promise<ScrapedRecipe[]> {
    try {
      console.log(`🤖 Extracting batch of ${recipeUrls.length} recipes...`);

      // Tracker le coût estimé
      const estimatedCost = await this.estimateApiCost('openai', 'extract_recipe', recipeUrls.length);
      console.log(`💰 Estimated cost: €${estimatedCost.toFixed(3)}`);

      // Appel API pour extraction en batch
      const response = await fetch(`${this.API_BASE_URL}/api/extract-recipes-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: recipeUrls })
      });

      if (!response.ok) {
        throw new Error(`Batch extraction failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Logger le coût réel
      if (result.cost) {
        await this.trackApiUsage('openai', result.cost, recipeUrls.length);
      }

      return result.recipes || [];

    } catch (error) {
      console.error('❌ Batch extraction error:', error);
      return [];
    }
  }

  // Fonction principale pour scraper 50 recettes
  async scrapePhase1Recipes(): Promise<{ 
    recipes: ScrapedRecipe[], 
    totalCost: number,
    successRate: number 
  }> {
    const allRecipes: ScrapedRecipe[] = [];
    let totalCost = 0;
    let successCount = 0;
    let totalAttempts = 0;

    console.log('🚀 Starting Kannamma Phase 1 scraping (50 recipes)...');

    // Pour chaque catégorie
    for (const category of this.PHASE1_CATEGORIES) {
      console.log(`\n📂 Processing category: ${category.frCategory}`);
      
      // 1. Récupérer les liens des recettes
      const recipeLinks = await this.scrapeCategoryLinks(category.url, category.maxRecipes);
      console.log(`📋 Found ${recipeLinks.length} recipes in ${category.category}`);

      // 2. Traiter par batches
      for (let i = 0; i < recipeLinks.length; i += this.BATCH_SIZE) {
        const batch = recipeLinks.slice(i, i + this.BATCH_SIZE);
        const batchUrls = batch.map(r => r.url);
        
        totalAttempts += batch.length;

        // Extraire le batch
        const extractedRecipes = await this.extractRecipesBatch(batchUrls);
        
        // Enrichir avec métadonnées
        const enrichedRecipes = extractedRecipes.map((recipe, idx) => ({
          ...recipe,
          indian_cuisine_type: this.detectCuisineType(recipe),
          meal_timing: category.category,
          source_name: 'kannammacooks.com',
          imageUrl: batch[idx]?.imageUrl
        }));

        allRecipes.push(...enrichedRecipes);
        successCount += extractedRecipes.length;

        // Progress update
        console.log(`✅ Processed ${allRecipes.length}/${50} recipes`);

        // Respecter rate limiting
        if (i + this.BATCH_SIZE < recipeLinks.length) {
          console.log(`⏳ Waiting ${this.DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await this.delay(this.DELAY_BETWEEN_BATCHES);
        }

        // Arrêter si on a atteint 50 recettes
        if (allRecipes.length >= 50) {
          console.log('🎯 Reached 50 recipes target!');
          break;
        }
      }

      if (allRecipes.length >= 50) break;
    }

    // Calculer le coût total
    totalCost = await this.getTotalCostThisSession();

    console.log(`\n📊 Scraping completed!`);
    console.log(`✅ Success rate: ${((successCount/totalAttempts) * 100).toFixed(1)}%`);
    console.log(`💰 Total cost: €${totalCost.toFixed(2)}`);
    console.log(`📚 Total recipes: ${allRecipes.length}`);

    return {
      recipes: allRecipes.slice(0, 50), // Limiter à exactement 50
      totalCost,
      successRate: successCount / totalAttempts
    };
  }

  // Helpers
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private detectCuisineType(recipe: ScrapedRecipe): string {
    const name = recipe.name.toLowerCase();
    const ingredients = recipe.ingredients.map(i => i.name.toLowerCase()).join(' ');
    
    if (name.includes('dosa') || name.includes('idli') || name.includes('sambar')) {
      return 'south-indian';
    }
    if (ingredients.includes('coconut') && ingredients.includes('curry leaves')) {
      return 'kerala';
    }
    if (name.includes('dal') || name.includes('roti')) {
      return 'north-indian';
    }
    return 'indian';
  }

  private async estimateApiCost(service: string, operation: string, batchSize: number): Promise<number> {
    const { data } = await supabase.rpc('estimate_api_cost', {
      p_service: service,
      p_operation: operation,
      p_batch_size: batchSize
    });
    return data || 0;
  }

  private async trackApiUsage(service: string, cost: number, batchSize: number): Promise<void> {
    await supabase.from('api_usage_tracking').insert({
      service,
      cost,
      batch_size: batchSize,
      endpoint: 'extract_recipes_batch'
    });
  }

  private async getTotalCostThisSession(): Promise<number> {
    const { data } = await supabase
      .from('api_usage_tracking')
      .select('cost')
      .gte('timestamp', new Date(Date.now() - 3600000).toISOString()); // Last hour
    
    return data?.reduce((sum, row) => sum + row.cost, 0) || 0;
  }
}