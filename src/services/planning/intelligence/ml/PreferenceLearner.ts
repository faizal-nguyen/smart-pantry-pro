/**
 * Preference Learner
 * Apprend les préférences utilisateur à partir de leur comportement
 */

import { 
  UserBehaviorData, 
  LearnedPreferences,
  FeatureVector,
  UserTasteProfile,
  TimePattern,
  FilterPattern
} from '../types';

export class PreferenceLearner {
  private userProfile: UserTasteProfile;
  private learningRate: number = 0.1;
  
  constructor() {
    this.userProfile = this.createDefaultProfile();
  }
  
  /**
   * Apprend des préférences à partir du comportement utilisateur
   */
  async learnFromBehavior(data: UserBehaviorData): Promise<LearnedPreferences> {
    console.log('🧠 Learning from user behavior', data);
    
    // 1. Extraction de features
    const features = this.extractFeatures(data);
    
    // 2. Reconnaissance de patterns
    const patterns = this.recognizePatterns(features, data);
    
    // 3. Scoring des préférences
    const preferences = this.scorePreferences(patterns);
    
    // 4. Mise à jour du profil
    this.updateUserProfile(preferences);
    
    return {
      cuisineAffinities: this.calculateCuisineAffinities(data),
      ingredientPreferences: this.calculateIngredientPreferences(data),
      cookingHabits: this.analyzeCookingHabits(data),
      nutritionalTendencies: this.analyzeNutritionalTendencies(data),
      confidenceScore: this.calculateConfidenceScore(data)
    };
  }
  
  /**
   * Extrait les features du comportement utilisateur
   */
  private extractFeatures(data: UserBehaviorData): FeatureVector {
    return {
      // Préférences gustatives
      sweetPreference: this.calculateSweetScore(data),
      spicyTolerance: this.calculateSpiceScore(data),
      vegetableAffinity: this.calculateVegetableScore(data),
      proteinPreference: this.calculateProteinScore(data),
      
      // Habitudes de cuisine
      cookingFrequency: this.analyzeFrequency(data),
      mealComplexity: this.analyzeComplexity(data),
      timeConstraints: this.analyzeTimePatterns(data),
      varietySeeking: this.analyzeVarietySeeking(data),
      
      // Conscience nutritionnelle
      healthConsciousness: this.analyzeHealthChoices(data),
      calorieAwareness: this.analyzeCaloriePatterns(data),
      macroBalance: this.analyzeMacroChoices(data),
      
      // Patterns comportementaux
      adventurousness: this.calculateAdventurousness(data),
      priceConsciousness: this.analyzePriceConsciousness(data),
      seasonalPreference: this.analyzeSeasonalPatterns(data)
    };
  }
  
  /**
   * Reconnaît des patterns dans les features
   */
  private recognizePatterns(features: FeatureVector, data: UserBehaviorData): any {
    const patterns = {
      mealTimingPatterns: this.identifyMealTimingPatterns(data),
      cuisineRotationPatterns: this.identifyCuisineRotation(data),
      ingredientCombinations: this.identifyIngredientCombos(data),
      cookingDayPatterns: this.identifyCookingDays(data),
      nutritionalCycles: this.identifyNutritionalCycles(data)
    };
    
    return patterns;
  }
  
  /**
   * Score les préférences basé sur les patterns
   */
  private scorePreferences(patterns: any): any {
    return {
      cuisineScores: this.scoreCuisinePreferences(patterns),
      ingredientScores: this.scoreIngredientPreferences(patterns),
      complexityScore: this.scoreComplexityPreference(patterns),
      timeScore: this.scoreTimePreference(patterns),
      nutritionScore: this.scoreNutritionPreference(patterns)
    };
  }
  
  /**
   * Calcule les affinités par cuisine
   */
  private calculateCuisineAffinities(data: UserBehaviorData): Record<string, number> {
    const cuisineCounts: Record<string, number> = {};
    const cuisineScores: Record<string, number> = {};
    
    // Compter les interactions positives par cuisine
    data.recipesLiked.forEach(recipeId => {
      const cuisine = this.getRecipeCuisine(recipeId);
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 2; // Liked = +2
    });
    
    data.recipesCooked.forEach(recipeId => {
      const cuisine = this.getRecipeCuisine(recipeId);
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 3; // Cooked = +3
    });
    
    // Pénaliser les cuisines dislikées/skippées
    data.recipesDisliked.forEach(recipeId => {
      const cuisine = this.getRecipeCuisine(recipeId);
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) - 2;
    });
    
    data.recipesSkipped.forEach(recipeId => {
      const cuisine = this.getRecipeCuisine(recipeId);
      cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) - 1;
    });
    
    // Normaliser les scores
    const maxCount = Math.max(...Object.values(cuisineCounts), 1);
    Object.entries(cuisineCounts).forEach(([cuisine, count]) => {
      cuisineScores[cuisine] = Math.max(0, Math.min(1, count / maxCount));
    });
    
    return cuisineScores;
  }
  
  /**
   * Calcule les préférences d'ingrédients
   */
  private calculateIngredientPreferences(data: UserBehaviorData): {
    loved: string[];
    liked: string[];
    neutral: string[];
    disliked: string[];
    allergens: string[];
  } {
    const ingredientScores: Record<string, number> = {};
    
    // Analyser les recettes pour extraire les ingrédients
    data.recipesLiked.forEach(recipeId => {
      const ingredients = this.getRecipeIngredients(recipeId);
      ingredients.forEach(ing => {
        ingredientScores[ing] = (ingredientScores[ing] || 0) + 1;
      });
    });
    
    data.recipesCooked.forEach(recipeId => {
      const ingredients = this.getRecipeIngredients(recipeId);
      ingredients.forEach(ing => {
        ingredientScores[ing] = (ingredientScores[ing] || 0) + 2;
      });
    });
    
    data.recipesDisliked.forEach(recipeId => {
      const ingredients = this.getRecipeIngredients(recipeId);
      ingredients.forEach(ing => {
        ingredientScores[ing] = (ingredientScores[ing] || 0) - 2;
      });
    });
    
    // Catégoriser les ingrédients
    const loved: string[] = [];
    const liked: string[] = [];
    const neutral: string[] = [];
    const disliked: string[] = [];
    
    Object.entries(ingredientScores).forEach(([ingredient, score]) => {
      if (score >= 5) loved.push(ingredient);
      else if (score >= 2) liked.push(ingredient);
      else if (score >= 0) neutral.push(ingredient);
      else disliked.push(ingredient);
    });
    
    return { loved, liked, neutral, disliked, allergens: [] };
  }
  
  /**
   * Analyse les habitudes de cuisine
   */
  private analyzeCookingHabits(data: UserBehaviorData): {
    preferredMealTimes: TimePattern[];
    averageCookingTime: number;
    complexityPreference: 'simple' | 'medium' | 'complex';
    batchCookingTendency: number;
  } {
    const timePatterns = data.cookingTimes || [];
    
    // Analyser les heures de cuisine préférées
    const mealTimeGroups = this.groupByMealTime(timePatterns);
    const preferredMealTimes = this.extractPreferredTimes(mealTimeGroups);
    
    // Calculer la complexité moyenne
    const complexityScores = timePatterns.map(t => {
      switch (t.complexity) {
        case 'simple': return 1;
        case 'medium': return 2;
        case 'complex': return 3;
        default: return 2;
      }
    });
    
    const avgComplexity = complexityScores.length > 0
      ? complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length
      : 2;
    
    const complexityPreference = 
      avgComplexity < 1.5 ? 'simple' :
      avgComplexity < 2.5 ? 'medium' : 'complex';
    
    // Calculer le temps moyen de cuisine
    const avgCookingTime = timePatterns.length > 0
      ? timePatterns.reduce((sum, t) => sum + t.averagePrepTime, 0) / timePatterns.length
      : 30;
    
    // Détecter la tendance au batch cooking
    const batchCookingTendency = this.detectBatchCookingTendency(data);
    
    return {
      preferredMealTimes,
      averageCookingTime,
      complexityPreference,
      batchCookingTendency
    };
  }
  
  /**
   * Analyse les tendances nutritionnelles
   */
  private analyzeNutritionalTendencies(data: UserBehaviorData): {
    averageCaloriesPerMeal: number;
    macroDistribution: {
      protein: number;
      carbs: number;
      fat: number;
    };
    healthScore: number;
    dietaryPattern: string;
  } {
    // Analyser les recettes cuisinées pour les tendances nutritionnelles
    const nutritionData = data.recipesCooked.map(recipeId => 
      this.getRecipeNutrition(recipeId)
    );
    
    if (nutritionData.length === 0) {
      return {
        averageCaloriesPerMeal: 600,
        macroDistribution: { protein: 0.3, carbs: 0.4, fat: 0.3 },
        healthScore: 0.7,
        dietaryPattern: 'balanced'
      };
    }
    
    // Calculer les moyennes
    const avgCalories = nutritionData.reduce((sum, n) => sum + n.calories, 0) / nutritionData.length;
    const avgProtein = nutritionData.reduce((sum, n) => sum + n.protein, 0) / nutritionData.length;
    const avgCarbs = nutritionData.reduce((sum, n) => sum + n.carbs, 0) / nutritionData.length;
    const avgFat = nutritionData.reduce((sum, n) => sum + n.fat, 0) / nutritionData.length;
    
    const totalMacros = avgProtein + avgCarbs + avgFat;
    
    // Déterminer le pattern diététique
    const proteinRatio = avgProtein / totalMacros;
    const carbsRatio = avgCarbs / totalMacros;
    
    let dietaryPattern = 'balanced';
    if (proteinRatio > 0.4) dietaryPattern = 'high-protein';
    else if (carbsRatio < 0.2) dietaryPattern = 'low-carb';
    else if (avgCalories < 500) dietaryPattern = 'calorie-conscious';
    
    return {
      averageCaloriesPerMeal: Math.round(avgCalories),
      macroDistribution: {
        protein: proteinRatio,
        carbs: carbsRatio,
        fat: avgFat / totalMacros
      },
      healthScore: this.calculateHealthScore(nutritionData),
      dietaryPattern
    };
  }
  
  /**
   * Helpers pour les calculs de scores
   */
  
  private calculateSweetScore(data: UserBehaviorData): number {
    // Analyser les recettes pour déterminer la préférence sucrée
    const sweetRecipes = [...data.recipesLiked, ...data.recipesCooked]
      .filter(id => this.isRecipeSweet(id));
    
    const totalInteractions = data.recipesLiked.length + data.recipesCooked.length;
    
    return totalInteractions > 0 ? sweetRecipes.length / totalInteractions : 0.3;
  }
  
  private calculateSpiceScore(data: UserBehaviorData): number {
    // Analyser la tolérance aux épices
    const spicyRecipes = [...data.recipesLiked, ...data.recipesCooked]
      .filter(id => this.isRecipeSpicy(id));
    
    const avoidedSpicy = data.recipesDisliked
      .filter(id => this.isRecipeSpicy(id));
    
    if (avoidedSpicy.length > spicyRecipes.length) return 0.1;
    
    const totalInteractions = data.recipesLiked.length + data.recipesCooked.length;
    return totalInteractions > 0 ? Math.min(spicyRecipes.length / totalInteractions * 2, 1) : 0.3;
  }
  
  private calculateVegetableScore(data: UserBehaviorData): number {
    // Analyser l'affinité avec les légumes
    const vegRecipes = [...data.recipesLiked, ...data.recipesCooked]
      .filter(id => this.isRecipeVegetableRich(id));
    
    const totalInteractions = data.recipesLiked.length + data.recipesCooked.length;
    
    return totalInteractions > 0 ? vegRecipes.length / totalInteractions : 0.5;
  }
  
  private calculateProteinScore(data: UserBehaviorData): number {
    const proteinRecipes = [...data.recipesLiked, ...data.recipesCooked]
      .filter(id => this.isRecipeProteinRich(id));
    
    const totalInteractions = data.recipesLiked.length + data.recipesCooked.length;
    
    return totalInteractions > 0 ? proteinRecipes.length / totalInteractions : 0.5;
  }
  
  private analyzeFrequency(data: UserBehaviorData): number {
    // Fréquence de cuisine (repas/semaine)
    return data.recipesCooked.length / 4; // Sur 4 semaines
  }
  
  private analyzeComplexity(data: UserBehaviorData): number {
    // Score de complexité moyenne (0-1)
    const complexities = data.recipesCooked.map(id => this.getRecipeComplexity(id));
    return complexities.length > 0 
      ? complexities.reduce((a, b) => a + b, 0) / complexities.length / 5 // Max complexity = 5
      : 0.5;
  }
  
  private analyzeTimePatterns(data: UserBehaviorData): number {
    // Analyse des contraintes de temps
    const avgTime = data.cookingTimes?.reduce((sum, t) => sum + t.averagePrepTime, 0) || 0;
    const count = data.cookingTimes?.length || 1;
    
    return Math.max(0, Math.min(1, 1 - (avgTime / count / 60))); // Normalize to 0-1
  }
  
  private analyzeVarietySeeking(data: UserBehaviorData): number {
    // Mesurer la recherche de variété
    const uniqueCuisines = new Set(
      [...data.recipesLiked, ...data.recipesCooked].map(id => this.getRecipeCuisine(id))
    );
    
    return Math.min(uniqueCuisines.size / 10, 1); // Normalize to max 10 cuisines
  }
  
  private analyzeHealthChoices(data: UserBehaviorData): number {
    // Analyser la conscience santé
    const healthyRecipes = [...data.recipesLiked, ...data.recipesCooked]
      .filter(id => this.isRecipeHealthy(id));
    
    const totalInteractions = data.recipesLiked.length + data.recipesCooked.length;
    
    return totalInteractions > 0 ? healthyRecipes.length / totalInteractions : 0.5;
  }
  
  private analyzeCaloriePatterns(data: UserBehaviorData): number {
    // Conscience calorique (0 = indifférent, 1 = très conscient)
    const lowCalRecipes = data.recipesCooked.filter(id => this.isRecipeLowCalorie(id));
    
    return data.recipesCooked.length > 0 
      ? lowCalRecipes.length / data.recipesCooked.length
      : 0.3;
  }
  
  private analyzeMacroChoices(data: UserBehaviorData): number {
    // Équilibre des macros (0 = déséquilibré, 1 = très équilibré)
    const balancedRecipes = data.recipesCooked.filter(id => this.isRecipeBalanced(id));
    
    return data.recipesCooked.length > 0
      ? balancedRecipes.length / data.recipesCooked.length
      : 0.5;
  }
  
  private calculateAdventurousness(data: UserBehaviorData): number {
    // Mesurer l'ouverture à la nouveauté
    const uniqueRecipes = new Set([...data.recipesLiked, ...data.recipesCooked]);
    const repeatRate = (data.recipesCooked.length - uniqueRecipes.size) / data.recipesCooked.length;
    
    return 1 - repeatRate; // Plus de répétitions = moins aventureux
  }
  
  private analyzePriceConsciousness(data: UserBehaviorData): number {
    // Pour l'instant, retourner une valeur par défaut
    // TODO: Implémenter l'analyse des prix
    return 0.5;
  }
  
  private analyzeSeasonalPatterns(data: UserBehaviorData): number {
    // Pour l'instant, retourner une valeur par défaut
    // TODO: Implémenter l'analyse saisonnière
    return 0.7;
  }
  
  private calculateConfidenceScore(data: UserBehaviorData): number {
    // Calculer la confiance basée sur la quantité de données
    const totalInteractions = 
      data.recipesLiked.length + 
      data.recipesDisliked.length + 
      data.recipesCooked.length + 
      data.recipesSkipped.length;
    
    // Confiance augmente avec les données, plafonne à 0.95
    return Math.min(0.95, totalInteractions / 100);
  }
  
  /**
   * Helpers pour l'accès aux données de recettes (mock pour l'instant)
   */
  
  private getRecipeCuisine(recipeId: string): string {
    // Mock - en production, accéder à la vraie base de données
    const cuisines = ['française', 'italienne', 'asiatique', 'méditerranéenne', 'mexicaine'];
    return cuisines[Math.floor(Math.random() * cuisines.length)];
  }
  
  private getRecipeIngredients(recipeId: string): string[] {
    // Mock
    return ['tomate', 'basilic', 'mozzarella', 'huile d\'olive'];
  }
  
  private getRecipeNutrition(recipeId: string): any {
    // Mock
    return {
      calories: 450 + Math.random() * 300,
      protein: 15 + Math.random() * 30,
      carbs: 40 + Math.random() * 40,
      fat: 15 + Math.random() * 20
    };
  }
  
  private getRecipeComplexity(recipeId: string): number {
    // Mock - retourner une complexité entre 1 et 5
    return Math.floor(Math.random() * 5) + 1;
  }
  
  private isRecipeSweet(recipeId: string): boolean {
    // Mock
    return Math.random() > 0.8;
  }
  
  private isRecipeSpicy(recipeId: string): boolean {
    // Mock
    return Math.random() > 0.7;
  }
  
  private isRecipeVegetableRich(recipeId: string): boolean {
    // Mock
    return Math.random() > 0.5;
  }
  
  private isRecipeProteinRich(recipeId: string): boolean {
    // Mock
    return Math.random() > 0.6;
  }
  
  private isRecipeHealthy(recipeId: string): boolean {
    // Mock
    return Math.random() > 0.4;
  }
  
  private isRecipeLowCalorie(recipeId: string): boolean {
    // Mock
    return Math.random() > 0.7;
  }
  
  private isRecipeBalanced(recipeId: string): boolean {
    // Mock
    return Math.random() > 0.5;
  }
  
  /**
   * Méthodes d'analyse avancées
   */
  
  private identifyMealTimingPatterns(data: UserBehaviorData): any {
    // Identifier les patterns de timing des repas
    return {
      lunchTime: { average: '12:30', variance: 30 },
      dinnerTime: { average: '19:30', variance: 45 },
      weekendShift: '+1h'
    };
  }
  
  private identifyCuisineRotation(data: UserBehaviorData): any {
    // Identifier comment l'utilisateur alterne les cuisines
    return {
      rotationPeriod: 3, // jours
      preferredSequence: ['française', 'italienne', 'asiatique']
    };
  }
  
  private identifyIngredientCombos(data: UserBehaviorData): any {
    // Identifier les combinaisons d'ingrédients préférées
    return {
      favoriteCombos: [
        ['tomate', 'basilic', 'mozzarella'],
        ['poulet', 'curry', 'lait de coco'],
        ['saumon', 'citron', 'aneth']
      ]
    };
  }
  
  private identifyCookingDays(data: UserBehaviorData): any {
    // Identifier les jours préférés pour cuisiner
    return {
      preferredDays: ['dimanche', 'mercredi'],
      avoidDays: ['vendredi']
    };
  }
  
  private identifyNutritionalCycles(data: UserBehaviorData): any {
    // Identifier les cycles nutritionnels
    return {
      weekdayPattern: 'light',
      weekendPattern: 'indulgent',
      monthlyReset: true
    };
  }
  
  private detectBatchCookingTendency(data: UserBehaviorData): number {
    // Détecter la tendance au batch cooking
    // Pour l'instant, retourner une valeur mock
    return 0.3;
  }
  
  private calculateHealthScore(nutritionData: any[]): number {
    // Calculer un score de santé global
    if (nutritionData.length === 0) return 0.5;
    
    // Évaluer l'équilibre nutritionnel
    const avgCalories = nutritionData.reduce((sum, n) => sum + n.calories, 0) / nutritionData.length;
    const calorieScore = 1 - Math.abs(avgCalories - 600) / 600;
    
    return Math.max(0, Math.min(1, calorieScore));
  }
  
  /**
   * Méthodes de gestion du profil
   */
  
  private createDefaultProfile(): UserTasteProfile {
    return {
      sweetness: 0.5,
      saltiness: 0.5,
      sourness: 0.3,
      bitterness: 0.2,
      umami: 0.4,
      spiciness: 0.3,
      textures: {
        crispy: 0.5,
        creamy: 0.5,
        chewy: 0.5,
        soft: 0.5,
        crunchy: 0.5
      },
      flavorComplexity: 'moderate',
      adventurousness: 0.5,
      culturalAffinities: []
    };
  }
  
  private updateUserProfile(preferences: any): void {
    // Mettre à jour le profil avec un taux d'apprentissage
    this.userProfile = {
      ...this.userProfile,
      // Mise à jour progressive des préférences
      sweetness: this.userProfile.sweetness * (1 - this.learningRate) + 
                  preferences.sweetness * this.learningRate,
      spiciness: this.userProfile.spiciness * (1 - this.learningRate) + 
                  preferences.spiciness * this.learningRate,
      // ... autres mises à jour
    };
  }
  
  private groupByMealTime(patterns: TimePattern[]): any {
    // Grouper les patterns par type de repas
    const groups: Record<string, TimePattern[]> = {};
    
    patterns.forEach(pattern => {
      const key = pattern.mealType;
      if (!groups[key]) groups[key] = [];
      groups[key].push(pattern);
    });
    
    return groups;
  }
  
  private extractPreferredTimes(mealTimeGroups: any): TimePattern[] {
    // Extraire les heures préférées par type de repas
    const preferred: TimePattern[] = [];
    
    Object.entries(mealTimeGroups).forEach(([mealType, patterns]) => {
      // Pour l'instant, prendre le premier pattern
      if (Array.isArray(patterns) && patterns.length > 0) {
        preferred.push(patterns[0] as TimePattern);
      }
    });
    
    return preferred;
  }
  
  private scoreCuisinePreferences(patterns: any): any {
    // Scorer les préférences de cuisine basé sur les patterns
    return {
      française: 0.8,
      italienne: 0.7,
      asiatique: 0.6,
      méditerranéenne: 0.9
    };
  }
  
  private scoreIngredientPreferences(patterns: any): any {
    // Scorer les préférences d'ingrédients
    return {
      légumes: 0.7,
      viandes: 0.6,
      poissons: 0.5,
      épices: 0.4
    };
  }
  
  private scoreComplexityPreference(patterns: any): number {
    // Score de préférence de complexité (0-1)
    return 0.6;
  }
  
  private scoreTimePreference(patterns: any): number {
    // Score de préférence de temps (0 = rapide, 1 = peut prendre son temps)
    return 0.4;
  }
  
  private scoreNutritionPreference(patterns: any): number {
    // Score de conscience nutritionnelle (0-1)
    return 0.7;
  }
  
  /**
   * Obtenir le profil actuel
   */
  getUserProfile(): UserTasteProfile {
    return { ...this.userProfile };
  }
  
  /**
   * Réinitialiser le profil
   */
  resetProfile(): void {
    this.userProfile = this.createDefaultProfile();
  }
}

// Export singleton instance
export const preferenceLearner = new PreferenceLearner();