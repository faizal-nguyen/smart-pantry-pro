import { supabase } from '@/integrations/supabase/client';
import { contextualPerformanceOptimizer } from './PerformanceOptimizer';
import {
  Season,
  SeasonalIngredient,
  SeasonalRecommendation,
  SeasonalContext
} from './types';

/**
 * Moteur de saisonnalité pour optimiser les suggestions selon les produits de saison
 * Base de données complète des fruits et légumes français avec disponibilité mensuelle
 */
export class SeasonalityEngine {
  private seasonalDB: Map<string, SeasonalIngredient>;
  private recipesCache: Map<string, any[]> = new Map();
  
  constructor() {
    this.seasonalDB = new Map();
    this.initializeSeasonalDatabase();
  }

  /**
   * Initialise la base de données des produits de saison
   */
  private async initializeSeasonalDatabase() {
    try {
      // Charger depuis la base de données
      const { data: products } = await supabase
        .from('seasonal_products')
        .select('*')
        .eq('is_active', true);
      
      if (products) {
        products.forEach(product => {
          this.seasonalDB.set(product.id, {
            id: product.id,
            name: product.product_name,
            category: product.product_category,
            peakMonths: product.peak_months,
            availability: product.availability_calendar,
            origin: product.origin
          });
        });
      }
    } catch (error) {
      console.error('Failed to load seasonal database:', error);
      // Utiliser les données par défaut
      this.loadDefaultSeasonalData();
    }
  }

  /**
   * Charge les données saisonnières par défaut (France)
   */
  private loadDefaultSeasonalData() {
    const defaultProducts: SeasonalIngredient[] = [
      // LÉGUMES
      {
        id: 'tomato',
        name: 'Tomate',
        category: 'vegetable',
        peakMonths: [6, 7, 8, 9],
        availability: {
          1: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          2: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          3: { inSeason: false, quality: 'poor', priceIndex: 1.8 },
          4: { inSeason: false, quality: 'poor', priceIndex: 1.6 },
          5: { inSeason: true, quality: 'good', priceIndex: 1.2 },
          6: { inSeason: true, quality: 'excellent', priceIndex: 0.8 },
          7: { inSeason: true, quality: 'excellent', priceIndex: 0.6 },
          8: { inSeason: true, quality: 'excellent', priceIndex: 0.6 },
          9: { inSeason: true, quality: 'good', priceIndex: 0.8 },
          10: { inSeason: false, quality: 'good', priceIndex: 1.2 },
          11: { inSeason: false, quality: 'poor', priceIndex: 1.6 },
          12: { inSeason: false, quality: 'poor', priceIndex: 2.0 }
        },
        origin: 'local'
      },
      {
        id: 'zucchini',
        name: 'Courgette',
        category: 'vegetable',
        peakMonths: [6, 7, 8, 9],
        availability: {
          1: { inSeason: false, quality: 'poor', priceIndex: 3.0 },
          2: { inSeason: false, quality: 'poor', priceIndex: 3.0 },
          3: { inSeason: false, quality: 'poor', priceIndex: 2.5 },
          4: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          5: { inSeason: true, quality: 'good', priceIndex: 1.5 },
          6: { inSeason: true, quality: 'excellent', priceIndex: 0.8 },
          7: { inSeason: true, quality: 'excellent', priceIndex: 0.6 },
          8: { inSeason: true, quality: 'excellent', priceIndex: 0.6 },
          9: { inSeason: true, quality: 'good', priceIndex: 0.8 },
          10: { inSeason: false, quality: 'poor', priceIndex: 1.5 },
          11: { inSeason: false, quality: 'poor', priceIndex: 2.5 },
          12: { inSeason: false, quality: 'poor', priceIndex: 3.0 }
        },
        origin: 'local'
      },
      {
        id: 'leek',
        name: 'Poireau',
        category: 'vegetable',
        peakMonths: [10, 11, 12, 1, 2, 3],
        availability: {
          1: { inSeason: true, quality: 'excellent', priceIndex: 0.7 },
          2: { inSeason: true, quality: 'excellent', priceIndex: 0.7 },
          3: { inSeason: true, quality: 'good', priceIndex: 0.8 },
          4: { inSeason: false, quality: 'poor', priceIndex: 1.2 },
          5: { inSeason: false, quality: 'poor', priceIndex: 1.5 },
          6: { inSeason: false, quality: 'poor', priceIndex: 1.8 },
          7: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          8: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          9: { inSeason: false, quality: 'poor', priceIndex: 1.5 },
          10: { inSeason: true, quality: 'good', priceIndex: 0.9 },
          11: { inSeason: true, quality: 'excellent', priceIndex: 0.7 },
          12: { inSeason: true, quality: 'excellent', priceIndex: 0.7 }
        },
        origin: 'local'
      },
      {
        id: 'pumpkin',
        name: 'Potiron',
        category: 'vegetable',
        peakMonths: [9, 10, 11, 12],
        availability: {
          1: { inSeason: false, quality: 'good', priceIndex: 1.2 },
          2: { inSeason: false, quality: 'poor', priceIndex: 1.5 },
          3: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          4: { inSeason: false, quality: 'poor', priceIndex: 2.5 },
          5: { inSeason: false, quality: 'poor', priceIndex: 3.0 },
          6: { inSeason: false, quality: 'poor', priceIndex: 3.0 },
          7: { inSeason: false, quality: 'poor', priceIndex: 2.5 },
          8: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          9: { inSeason: true, quality: 'good', priceIndex: 1.0 },
          10: { inSeason: true, quality: 'excellent', priceIndex: 0.7 },
          11: { inSeason: true, quality: 'excellent', priceIndex: 0.7 },
          12: { inSeason: true, quality: 'good', priceIndex: 0.9 }
        },
        origin: 'local'
      },
      // FRUITS
      {
        id: 'strawberry',
        name: 'Fraise',
        category: 'fruit',
        peakMonths: [5, 6],
        availability: {
          1: { inSeason: false, quality: 'poor', priceIndex: 3.0 },
          2: { inSeason: false, quality: 'poor', priceIndex: 3.0 },
          3: { inSeason: false, quality: 'poor', priceIndex: 2.5 },
          4: { inSeason: true, quality: 'good', priceIndex: 1.5 },
          5: { inSeason: true, quality: 'excellent', priceIndex: 0.7 },
          6: { inSeason: true, quality: 'excellent', priceIndex: 0.6 },
          7: { inSeason: true, quality: 'good', priceIndex: 1.0 },
          8: { inSeason: false, quality: 'poor', priceIndex: 1.5 },
          9: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          10: { inSeason: false, quality: 'poor', priceIndex: 2.5 },
          11: { inSeason: false, quality: 'poor', priceIndex: 3.0 },
          12: { inSeason: false, quality: 'poor', priceIndex: 3.0 }
        },
        origin: 'local'
      },
      {
        id: 'apple',
        name: 'Pomme',
        category: 'fruit',
        peakMonths: [9, 10, 11],
        availability: {
          1: { inSeason: false, quality: 'good', priceIndex: 1.2 },
          2: { inSeason: false, quality: 'good', priceIndex: 1.3 },
          3: { inSeason: false, quality: 'poor', priceIndex: 1.5 },
          4: { inSeason: false, quality: 'poor', priceIndex: 1.6 },
          5: { inSeason: false, quality: 'poor', priceIndex: 1.8 },
          6: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          7: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          8: { inSeason: true, quality: 'good', priceIndex: 1.0 },
          9: { inSeason: true, quality: 'excellent', priceIndex: 0.6 },
          10: { inSeason: true, quality: 'excellent', priceIndex: 0.5 },
          11: { inSeason: true, quality: 'excellent', priceIndex: 0.6 },
          12: { inSeason: false, quality: 'good', priceIndex: 1.0 }
        },
        origin: 'local'
      },
      {
        id: 'peach',
        name: 'Pêche',
        category: 'fruit',
        peakMonths: [7, 8],
        availability: {
          1: { inSeason: false, quality: 'poor', priceIndex: 4.0 },
          2: { inSeason: false, quality: 'poor', priceIndex: 4.0 },
          3: { inSeason: false, quality: 'poor', priceIndex: 3.5 },
          4: { inSeason: false, quality: 'poor', priceIndex: 3.0 },
          5: { inSeason: false, quality: 'poor', priceIndex: 2.5 },
          6: { inSeason: true, quality: 'good', priceIndex: 1.5 },
          7: { inSeason: true, quality: 'excellent', priceIndex: 0.8 },
          8: { inSeason: true, quality: 'excellent', priceIndex: 0.7 },
          9: { inSeason: false, quality: 'good', priceIndex: 1.5 },
          10: { inSeason: false, quality: 'poor', priceIndex: 2.5 },
          11: { inSeason: false, quality: 'poor', priceIndex: 3.5 },
          12: { inSeason: false, quality: 'poor', priceIndex: 4.0 }
        },
        origin: 'local'
      },
      {
        id: 'orange',
        name: 'Orange',
        category: 'fruit',
        peakMonths: [12, 1, 2, 3],
        availability: {
          1: { inSeason: true, quality: 'excellent', priceIndex: 0.8 },
          2: { inSeason: true, quality: 'excellent', priceIndex: 0.8 },
          3: { inSeason: true, quality: 'good', priceIndex: 0.9 },
          4: { inSeason: false, quality: 'poor', priceIndex: 1.2 },
          5: { inSeason: false, quality: 'poor', priceIndex: 1.5 },
          6: { inSeason: false, quality: 'poor', priceIndex: 1.8 },
          7: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          8: { inSeason: false, quality: 'poor', priceIndex: 2.0 },
          9: { inSeason: false, quality: 'poor', priceIndex: 1.8 },
          10: { inSeason: false, quality: 'poor', priceIndex: 1.5 },
          11: { inSeason: false, quality: 'good', priceIndex: 1.2 },
          12: { inSeason: true, quality: 'excellent', priceIndex: 0.8 }
        },
        origin: 'imported'
      }
    ];
    
    defaultProducts.forEach(product => {
      this.seasonalDB.set(product.id, product);
    });
  }

  /**
   * Obtient le contexte saisonnier complet
   */
  async getSeasonalContext(
    date: Date = new Date(),
    familySize: number = 2
  ): Promise<SeasonalContext> {
    const month = date.getMonth() + 1; // 1-12
    const season = this.getCurrentSeason(month);
    
    // Produits du mois
    const inSeasonProducts = this.getInSeasonProducts(month);
    
    // Recettes de saison
    const seasonalRecipes = await this.getSeasonalRecipes(
      inSeasonProducts, 
      season,
      familySize
    );
    
    // Produits bientôt disponibles (mois prochain)
    const nextMonth = month === 12 ? 1 : month + 1;
    const upcomingProducts = this.getUpcomingProducts(month, nextMonth);
    
    // Produits en fin de saison
    const endingProducts = this.getEndingProducts(month);
    
    // Générer des recommandations
    const recommendations = this.generateSeasonalRecommendations(
      inSeasonProducts,
      season,
      familySize
    );

    return {
      currentSeason: season,
      month,
      inSeasonProducts,
      seasonalRecipes,
      upcomingProducts,
      endingProducts,
      recommendations
    };
  }

  /**
   * Obtient les produits de saison du mois
   */
  private getInSeasonProducts(month: number): SeasonalIngredient[] {
    const products = Array.from(this.seasonalDB.values())
      .filter(product => {
        const monthData = product.availability[month];
        return monthData && monthData.inSeason;
      })
      .map(product => ({
        ...product,
        score: this.calculateSeasonalScore(product, month)
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    
    return products;
  }

  /**
   * Obtient les produits qui arrivent bientôt
   */
  private getUpcomingProducts(currentMonth: number, nextMonth: number): SeasonalIngredient[] {
    return Array.from(this.seasonalDB.values())
      .filter(product => {
        const current = product.availability[currentMonth];
        const next = product.availability[nextMonth];
        return !current?.inSeason && next?.inSeason;
      })
      .slice(0, 5); // Top 5
  }

  /**
   * Obtient les produits en fin de saison
   */
  private getEndingProducts(month: number): SeasonalIngredient[] {
    const nextMonth = month === 12 ? 1 : month + 1;
    
    return Array.from(this.seasonalDB.values())
      .filter(product => {
        const current = product.availability[month];
        const next = product.availability[nextMonth];
        return current?.inSeason && !next?.inSeason;
      })
      .slice(0, 5); // Top 5
  }

  /**
   * Détermine la saison actuelle
   */
  private getCurrentSeason(month: number): Season {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * Récupère les recettes de saison
   */
  private async getSeasonalRecipes(
    products: SeasonalIngredient[], 
    season: Season,
    familySize: number
  ): Promise<any[]> {
    // Vérifier le cache
    const cacheKey = `${season}-${products.map(p => p.id).join(',')}`;
    if (this.recipesCache.has(cacheKey)) {
      return this.recipesCache.get(cacheKey)!;
    }

    try {
      // Construire la requête avec les ingrédients de saison
      const ingredientNames = products.slice(0, 10).map(p => p.name);
      
      const { data: recipes } = await supabase
        .from('recipes_catalog')
        .select('*')
        .or(ingredientNames.map(name => 
          `main_ingredients.cs.{${name}}`
        ).join(','))
        .eq('season_tag', season)
        .gte('servings', familySize - 1)
        .lte('servings', familySize + 2)
        .limit(20);
      
      if (recipes) {
        // Scorer les recettes selon l'utilisation des produits de saison
        const scoredRecipes = recipes.map(recipe => ({
          ...recipe,
          seasonalScore: this.calculateRecipeSeasonalScore(recipe, products)
        })).sort((a, b) => b.seasonalScore - a.seasonalScore);
        
        this.recipesCache.set(cacheKey, scoredRecipes);
        return scoredRecipes;
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch seasonal recipes:', error);
      return this.getDefaultSeasonalRecipes(season);
    }
  }

  /**
   * Calcule le score saisonnier d'un produit
   */
  private calculateSeasonalScore(
    product: SeasonalIngredient, 
    month: number
  ): number {
    const availability = product.availability[month];
    if (!availability) return 0;
    
    let score = 0;
    
    // Score basé sur la saison (40 points max)
    if (availability.inSeason) score += 40;
    
    // Score basé sur la qualité (30 points max)
    switch (availability.quality) {
      case 'excellent': score += 30; break;
      case 'good': score += 20; break;
      case 'poor': score += 5; break;
    }
    
    // Score basé sur le prix (20 points max)
    if (availability.priceIndex < 0.7) score += 20;
    else if (availability.priceIndex < 1.0) score += 15;
    else if (availability.priceIndex < 1.3) score += 10;
    else if (availability.priceIndex < 1.6) score += 5;
    
    // Bonus local (10 points)
    if (product.origin === 'local') score += 10;
    
    return Math.min(100, score);
  }

  /**
   * Calcule le score saisonnier d'une recette
   */
  private calculateRecipeSeasonalScore(recipe: any, seasonalProducts: SeasonalIngredient[]): number {
    let score = 0;
    let matchedIngredients = 0;
    
    // Analyser les ingrédients de la recette
    const recipeIngredients = recipe.main_ingredients || [];
    const seasonalNames = seasonalProducts.map(p => p.name.toLowerCase());
    
    recipeIngredients.forEach((ingredient: string) => {
      const ingredientLower = ingredient.toLowerCase();
      const matchedProduct = seasonalProducts.find(p => 
        ingredientLower.includes(p.name.toLowerCase())
      );
      
      if (matchedProduct) {
        matchedIngredients++;
        score += matchedProduct.score || 50;
      }
    });
    
    // Normaliser le score
    if (matchedIngredients > 0) {
      score = score / matchedIngredients;
    }
    
    // Bonus si beaucoup d'ingrédients de saison
    if (matchedIngredients >= 3) score += 20;
    if (matchedIngredients >= 5) score += 30;
    
    return Math.min(100, score);
  }

  /**
   * Génère des recommandations saisonnières
   */
  private generateSeasonalRecommendations(
    products: SeasonalIngredient[],
    season: Season,
    familySize: number
  ): SeasonalRecommendation[] {
    const recommendations: SeasonalRecommendation[] = [];
    
    // Thèmes saisonniers
    const seasonalThemes = {
      spring: {
        themes: ['detox', 'fresh', 'green', 'light'],
        recipes: ['Salade de printemps', 'Asperges grillées', 'Risotto aux petits pois', 'Quiche aux légumes nouveaux'],
        focus: 'Légèreté et fraîcheur après l\'hiver'
      },
      summer: {
        themes: ['bbq', 'cold', 'light', 'mediterranean'],
        recipes: ['Gazpacho', 'Salades composées', 'Grillades marinées', 'Tartes aux fruits d\'été'],
        focus: 'Plats frais et peu de cuisson'
      },
      autumn: {
        themes: ['comfort', 'roasted', 'harvest', 'warming'],
        recipes: ['Soupes de potiron', 'Gratins de légumes', 'Tartes aux pommes', 'Plats mijotés'],
        focus: 'Transition vers des plats réconfortants'
      },
      winter: {
        themes: ['warming', 'stew', 'preserved', 'hearty'],
        recipes: ['Pot-au-feu', 'Raclette', 'Choucroute', 'Soupes épaisses', 'Tartiflette'],
        focus: 'Plats consistants et réchauffants'
      }
    };
    
    const currentTheme = seasonalThemes[season];
    
    // 1. Produits stars du moment
    const topProducts = products.slice(0, 3);
    topProducts.forEach(product => {
      recommendations.push({
        type: 'ingredient_spotlight',
        title: `${product.name} en pleine saison!`,
        description: `Profitez des ${product.name.toLowerCase()}s - excellente qualité et prix attractif (${Math.round((1 - product.availability[new Date().getMonth() + 1].priceIndex) * 100)}% moins cher)`,
        ingredients: [product],
        priority: 'high'
      });
    });
    
    // 2. Suggestion de menu thématique
    recommendations.push({
      type: 'seasonal_theme',
      title: `Menu ${season === 'spring' ? 'printanier' : season === 'summer' ? 'estival' : season === 'autumn' ? 'automnal' : 'hivernal'}`,
      description: currentTheme.focus,
      recipes: currentTheme.recipes,
      priority: 'medium'
    });
    
    // 3. Alerte fin de saison
    const endingProducts = this.getEndingProducts(new Date().getMonth() + 1);
    if (endingProducts.length > 0) {
      recommendations.push({
        type: 'ingredient_spotlight',
        title: 'Dernière chance!',
        description: `${endingProducts.map(p => p.name).join(', ')} - fin de saison imminente`,
        ingredients: endingProducts,
        priority: 'medium'
      });
    }
    
    // 4. Préparation pour le mois prochain
    const upcomingProducts = this.getUpcomingProducts(
      new Date().getMonth() + 1, 
      new Date().getMonth() + 2
    );
    if (upcomingProducts.length > 0) {
      recommendations.push({
        type: 'seasonal_theme',
        title: 'Bientôt disponible',
        description: `Préparez-vous pour: ${upcomingProducts.map(p => p.name).join(', ')}`,
        ingredients: upcomingProducts,
        priority: 'low'
      });
    }
    
    // 5. Suggestion batch cooking saisonnier
    if (familySize > 3) {
      recommendations.push({
        type: 'recipe_suggestion',
        title: 'Batch cooking de saison',
        description: `Préparez en grande quantité avec les produits du moment pour économiser temps et argent`,
        recipes: [`Ratatouille en bocaux`, `Compotes maison`, `Soupes à congeler`],
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Retourne des recettes par défaut selon la saison
   */
  private getDefaultSeasonalRecipes(season: Season): any[] {
    const defaultRecipes = {
      spring: [
        { id: '1', name: 'Salade printanière', seasonalScore: 90 },
        { id: '2', name: 'Asperges à la hollandaise', seasonalScore: 85 },
        { id: '3', name: 'Quiche aux légumes nouveaux', seasonalScore: 80 }
      ],
      summer: [
        { id: '4', name: 'Gazpacho andalou', seasonalScore: 95 },
        { id: '5', name: 'Salade niçoise', seasonalScore: 90 },
        { id: '6', name: 'Ratatouille', seasonalScore: 85 }
      ],
      autumn: [
        { id: '7', name: 'Velouté de potiron', seasonalScore: 90 },
        { id: '8', name: 'Tarte aux pommes', seasonalScore: 85 },
        { id: '9', name: 'Gratin de courges', seasonalScore: 80 }
      ],
      winter: [
        { id: '10', name: 'Pot-au-feu traditionnel', seasonalScore: 90 },
        { id: '11', name: 'Soupe à l\'oignon', seasonalScore: 85 },
        { id: '12', name: 'Choucroute garnie', seasonalScore: 80 }
      ]
    };
    
    return defaultRecipes[season] || [];
  }

  /**
   * Vérifie si un ingrédient est de saison
   */
  isInSeason(ingredientName: string, month?: number): boolean {
    const currentMonth = month || new Date().getMonth() + 1;
    
    const ingredient = Array.from(this.seasonalDB.values()).find(
      p => p.name.toLowerCase() === ingredientName.toLowerCase()
    );
    
    if (!ingredient) return false;
    
    const availability = ingredient.availability[currentMonth];
    return availability?.inSeason || false;
  }

  /**
   * Obtient le meilleur mois pour un ingrédient
   */
  getBestMonthsFor(ingredientName: string): number[] {
    const ingredient = Array.from(this.seasonalDB.values()).find(
      p => p.name.toLowerCase() === ingredientName.toLowerCase()
    );
    
    if (!ingredient) return [];
    
    return ingredient.peakMonths;
  }
}

// Export de l'instance
export const seasonalityEngine = new SeasonalityEngine();