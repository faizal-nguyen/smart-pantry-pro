/**
 * Nutritional AI Service - Evolution V2
 * Extends StreamingAIService with specialized nutritional analysis capabilities
 */

import { StreamingAIService, AIContext } from './streamingAIService';

export interface UserHealthProfile {
  id: string;
  userId: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  weight: number; // kg
  height: number; // cm
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goals: HealthGoal[];
  medicalConditions: MedicalCondition[];
  allergies: string[];
  dietaryPreferences: DietaryPreference[];
  createdAt: Date;
  updatedAt: Date;
}

export interface HealthGoal {
  type: 'weight_loss' | 'weight_gain' | 'muscle_building' | 'maintenance' | 'athletic_performance';
  targetValue?: number;
  timeframe?: number; // days
  priority: 'low' | 'medium' | 'high';
}

export interface MedicalCondition {
  condition: 'diabetes' | 'hypertension' | 'celiac' | 'heart_disease' | 'kidney_disease' | 'other';
  severity: 'mild' | 'moderate' | 'severe';
  restrictions: string[];
  notes?: string;
}

export interface DietaryPreference {
  type: 'vegetarian' | 'vegan' | 'pescatarian' | 'keto' | 'paleo' | 'mediterranean' | 'low_carb' | 'low_fat';
  strictness: 'flexible' | 'moderate' | 'strict';
}

export interface NutritionalAnalysis {
  totalCalories: number;
  macronutrients: {
    protein: { grams: number; percentage: number };
    carbohydrates: { grams: number; percentage: number };
    fat: { grams: number; percentage: number };
    fiber: { grams: number };
  };
  micronutrients: {
    vitamins: Record<string, { amount: number; unit: string; dailyValuePercentage: number }>;
    minerals: Record<string, { amount: number; unit: string; dailyValuePercentage: number }>;
  };
  nutritionalScore: number; // 0-100
  healthAlerts: HealthAlert[];
}

export interface HealthAlert {
  type: 'warning' | 'info' | 'critical';
  category: 'allergen' | 'medical_condition' | 'nutritional_imbalance' | 'calorie_excess' | 'nutrient_deficiency';
  message: string;
  recommendation: string;
  severity: number; // 1-10
}

export interface HealthRecommendation {
  id: string;
  type: 'recipe' | 'ingredient' | 'habit' | 'supplement';
  title: string;
  description: string;
  reasoning: string;
  nutritionalBenefit: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number; // 1-10
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
}

export interface MacronutrientTracking {
  date: Date;
  targetCalories: number;
  consumedCalories: number;
  targetProtein: number;
  consumedProtein: number;
  targetCarbs: number;
  consumedCarbs: number;
  targetFat: number;
  consumedFat: number;
  waterIntake: number; // liters
  targetWater: number;
  adherenceScore: number; // 0-100
}

export interface NutritionalContext extends AIContext {
  healthProfile?: UserHealthProfile;
  recentMeals?: any[];
  nutritionalGoals?: any;
  medicalRestrictions?: string[];
  currentHealth?: {
    weight: number;
    lastWeightUpdate: Date;
    energyLevel: number; // 1-10
    sleepQuality: number; // 1-10
    stressLevel: number; // 1-10
  };
}

export class NutritionalAIService extends StreamingAIService {
  /**
   * Analyze nutritional profile of user based on recent meals and health data
   */
  async analyzeNutritionalProfile(
    healthProfile: UserHealthProfile,
    recentMeals: any[] = []
  ): Promise<NutritionalAnalysis> {
    const systemPrompt = this.buildNutritionalAnalysisPrompt(healthProfile);
    
    const userMessage = `
Analyser le profil nutritionnel basé sur:
- Profil santé: ${JSON.stringify(healthProfile, null, 2)}
- Repas récents: ${JSON.stringify(recentMeals, null, 2)}

Fournir une analyse complète avec:
1. Calories totales et répartition macro
2. Vitamines et minéraux clés
3. Score nutritionnel global
4. Alertes santé importantes
5. Recommandations personnalisées
`;

    try {
      const response = await this.chat(systemPrompt, userMessage);
      return this.parseNutritionalAnalysis(response, healthProfile);
    } catch (error) {
      console.error('Nutritional analysis error:', error);
      throw error;
    }
  }

  /**
   * Generate personalized health recommendations
   */
  async generateHealthRecommendations(
    healthProfile: UserHealthProfile,
    currentNutrition: NutritionalAnalysis,
    inventory: any[] = []
  ): Promise<HealthRecommendation[]> {
    const context: NutritionalContext = {
      inventory,
      recipes: [],
      healthProfile,
      nutritionalGoals: this.calculateNutritionalGoals(healthProfile),
      language: 'fr-FR'
    };

    const systemPrompt = this.buildRecommendationPrompt(context);
    
    const userMessage = `
Générer des recommandations personnalisées basées sur:
- Analyse nutritionnelle actuelle: ${JSON.stringify(currentNutrition, null, 2)}
- Objectifs santé: ${healthProfile.goals.map(g => g.type).join(', ')}
- Conditions médicales: ${healthProfile.medicalConditions.map(c => c.condition).join(', ')}
- Inventaire disponible: ${inventory.map(i => i.product?.name).join(', ')}

Prioriser les recommandations par impact sur la santé et facilité d'implémentation.
`;

    try {
      const response = await this.chat(systemPrompt, userMessage);
      return this.parseHealthRecommendations(response, healthProfile);
    } catch (error) {
      console.error('Health recommendations error:', error);
      throw error;
    }
  }

  /**
   * Track macronutrient progress for a specific date
   */
  async trackMacronutrients(
    healthProfile: UserHealthProfile,
    meals: any[],
    date: Date = new Date()
  ): Promise<MacronutrientTracking> {
    const nutritionalGoals = this.calculateNutritionalGoals(healthProfile);
    
    // Calculate consumed nutrients from meals
    const consumedNutrients = await this.calculateMealsNutrition(meals);
    
    const tracking: MacronutrientTracking = {
      date,
      targetCalories: nutritionalGoals.dailyCalories,
      consumedCalories: consumedNutrients.calories,
      targetProtein: nutritionalGoals.protein,
      consumedProtein: consumedNutrients.protein,
      targetCarbs: nutritionalGoals.carbohydrates,
      consumedCarbs: consumedNutrients.carbohydrates,
      targetFat: nutritionalGoals.fat,
      consumedFat: consumedNutrients.fat,
      waterIntake: consumedNutrients.water || 0,
      targetWater: this.calculateWaterNeeds(healthProfile),
      adherenceScore: this.calculateAdherenceScore(nutritionalGoals, consumedNutrients)
    };

    return tracking;
  }

  /**
   * Streaming nutritional coaching with real-time advice
   */
  async streamNutritionalCoaching(
    query: string,
    context: NutritionalContext,
    onChunk: (chunk: any) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const systemPrompt = this.buildNutritionalCoachingPrompt(context);
    
    await this.streamChat(
      systemPrompt,
      query,
      onChunk,
      onError
    );
  }

  /**
   * Build specialized nutritional analysis system prompt
   */
  private buildNutritionalAnalysisPrompt(healthProfile: UserHealthProfile): string {
    const { age, gender, weight, height, activityLevel, goals, medicalConditions } = healthProfile;
    
    // Calculate BMR using Mifflin-St Jeor equation
    const bmr = this.calculateBMR(weight, height, age, gender);
    const tdee = this.calculateTDEE(bmr, activityLevel);
    
    return `Tu es un nutritionniste expert certifié spécialisé dans l'analyse nutritionnelle personnalisée.

**PROFIL UTILISATEUR:**
- Âge: ${age} ans
- Genre: ${gender}
- Poids: ${weight} kg
- Taille: ${height} cm
- Niveau d'activité: ${activityLevel}
- BMR (métabolisme de base): ${Math.round(bmr)} kcal/jour
- TDEE (dépense énergétique totale): ${Math.round(tdee)} kcal/jour

**OBJECTIFS SANTÉ:**
${goals.map(g => `- ${g.type} (priorité: ${g.priority})`).join('\n')}

**CONDITIONS MÉDICALES:**
${medicalConditions.length > 0 ? medicalConditions.map(c => `- ${c.condition} (${c.severity}): ${c.restrictions.join(', ')}`).join('\n') : 'Aucune condition médicale signalée'}

**COMPÉTENCES SPÉCIALISÉES:**
1. Analyse macro et micronutriments précise
2. Calcul des besoins nutritionnels personnalisés
3. Identification des carences et excès
4. Alertes santé basées sur conditions médicales
5. Recommandations adaptées aux objectifs
6. Score nutritionnel holistique (0-100)

**FORMAT DE RÉPONSE OBLIGATOIRE:**
Toujours structurer la réponse en JSON avec:
- Analyse calorique et macronutriments
- Vitamines et minéraux essentiels
- Score nutritionnel justifié
- Alertes santé prioritaires
- Recommandations actionables

Utiliser des données nutritionnelles précises et des recommandations basées sur l'évidence scientifique.`;
  }

  /**
   * Build recommendation system prompt
   */
  private buildRecommendationPrompt(context: NutritionalContext): string {
    const { healthProfile, inventory } = context;
    
    return `Tu es un coach nutritionnel expert spécialisé dans les recommandations personnalisées.

**MISSION:** Générer des recommandations pratiques et réalisables basées sur:
- Le profil santé unique de l'utilisateur
- L'inventaire alimentaire disponible
- Les objectifs santé prioritaires
- Les contraintes médicales

**TYPES DE RECOMMANDATIONS:**
1. **Recettes adaptées** - Utilisant l'inventaire disponible
2. **Ingrédients à privilégier** - Pour optimiser la nutrition
3. **Habitudes alimentaires** - Pour atteindre les objectifs
4. **Compléments** - Si carences identifiées (avec prudence)

**CRITÈRES DE PRIORISATION:**
- Impact sur la santé (1-10)
- Facilité d'implémentation (easy/medium/hard)
- Disponibilité des ingrédients
- Adéquation avec les préférences
- Sécurité par rapport aux conditions médicales

**INVENTAIRE DISPONIBLE:**
${inventory?.map(item => `${item.quantity} ${item.unit} de ${item.product?.name}`).join('\n') || 'Inventaire non disponible'}

Fournir 5-8 recommandations concrètes, classées par priorité et impact sur la santé.`;
  }

  /**
   * Build nutritional coaching system prompt
   */
  private buildNutritionalCoachingPrompt(context: NutritionalContext): string {
    const { healthProfile, recentMeals, nutritionalGoals } = context;
    
    return `Tu es un coach nutritionnel personnel bienveillant et expert, disponible 24h/24.

**TON RÔLE:** 
- Conseiller nutritionnel personnalisé et empathique
- Guide pour des choix alimentaires sains
- Support pour atteindre les objectifs santé
- Éducateur en nutrition pratique

**APPROCHE COACHING:**
1. **Écoute active** - Comprendre les besoins réels
2. **Motivation positive** - Encourager sans culpabiliser
3. **Conseils pratiques** - Solutions réalisables au quotidien
4. **Éducation** - Expliquer le "pourquoi" derrière les conseils
5. **Suivi progress** - Célébrer les victoires, ajuster si besoin

**CONTEXTE UTILISATEUR:**
- Profil: ${healthProfile?.age} ans, ${healthProfile?.gender}, ${healthProfile?.weight}kg
- Objectifs: ${healthProfile?.goals.map(g => g.type).join(', ') || 'Maintenance générale'}
- Conditions: ${healthProfile?.medicalConditions.map(c => c.condition).join(', ') || 'Aucune'}
- Besoins caloriques: ~${nutritionalGoals?.dailyCalories || 'Non calculé'} kcal/jour

**STYLE DE COMMUNICATION:**
- Conversationnel et accessible
- Scientifiquement fondé mais vulgarisé
- Encourageant et non-jugeant
- Adapté au niveau de l'utilisateur
- Avec émojis pour rendre convivial

Réponds toujours comme un coach nutrition personnel qui connaît parfaitement l'utilisateur.`;
  }

  /**
   * Calculate BMR using Mifflin-St Jeor equation
   */
  private calculateBMR(weight: number, height: number, age: number, gender: string): number {
    const baseBMR = (10 * weight) + (6.25 * height) - (5 * age);
    return gender === 'male' ? baseBMR + 5 : baseBMR - 161;
  }

  /**
   * Calculate TDEE based on activity level
   */
  private calculateTDEE(bmr: number, activityLevel: string): number {
    const activityMultipliers = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extra_active': 1.9
    };
    
    return bmr * (activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.2);
  }

  /**
   * Calculate nutritional goals based on health profile
   */
  private calculateNutritionalGoals(healthProfile: UserHealthProfile) {
    const bmr = this.calculateBMR(healthProfile.weight, healthProfile.height, healthProfile.age, healthProfile.gender);
    const tdee = this.calculateTDEE(bmr, healthProfile.activityLevel);
    
    // Adjust calories based on goals
    let targetCalories = tdee;
    if (healthProfile.goals.some(g => g.type === 'weight_loss')) {
      targetCalories = tdee * 0.85; // 15% deficit
    } else if (healthProfile.goals.some(g => g.type === 'weight_gain')) {
      targetCalories = tdee * 1.15; // 15% surplus
    }
    
    // Calculate macronutrients (moderate protein, balanced carbs/fat)
    const protein = Math.round(healthProfile.weight * 2.0); // 2g per kg body weight
    const fat = Math.round(targetCalories * 0.25 / 9); // 25% of calories from fat
    const carbohydrates = Math.round((targetCalories - (protein * 4) - (fat * 9)) / 4);
    
    return {
      dailyCalories: Math.round(targetCalories),
      protein,
      carbohydrates,
      fat
    };
  }

  /**
   * Calculate water needs based on profile
   */
  private calculateWaterNeeds(healthProfile: UserHealthProfile): number {
    // Base: 35ml per kg body weight
    let waterNeeds = healthProfile.weight * 0.035;
    
    // Adjust for activity level
    if (healthProfile.activityLevel === 'very_active' || healthProfile.activityLevel === 'extra_active') {
      waterNeeds *= 1.2;
    } else if (healthProfile.activityLevel === 'moderately_active') {
      waterNeeds *= 1.1;
    }
    
    return Math.round(waterNeeds * 10) / 10; // Round to 1 decimal
  }

  /**
   * Calculate adherence score
   */
  private calculateAdherenceScore(targets: any, consumed: any): number {
    const metrics = [
      { target: targets.dailyCalories, consumed: consumed.calories, weight: 0.3 },
      { target: targets.protein, consumed: consumed.protein, weight: 0.25 },
      { target: targets.carbohydrates, consumed: consumed.carbohydrates, weight: 0.2 },
      { target: targets.fat, consumed: consumed.fat, weight: 0.25 }
    ];
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const metric of metrics) {
      if (metric.target > 0) {
        const accuracy = Math.min(1, 1 - Math.abs(metric.consumed - metric.target) / metric.target);
        totalScore += accuracy * metric.weight;
        totalWeight += metric.weight;
      }
    }
    
    return Math.round((totalScore / totalWeight) * 100);
  }

  /**
   * Parse nutritional analysis from AI response
   */
  private parseNutritionalAnalysis(response: string, healthProfile: UserHealthProfile): NutritionalAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
      
      // Fallback: create basic analysis
      return this.createFallbackAnalysis(healthProfile);
    } catch (error) {
      console.warn('Failed to parse nutritional analysis, using fallback:', error);
      return this.createFallbackAnalysis(healthProfile);
    }
  }

  /**
   * Parse health recommendations from AI response
   */
  private parseHealthRecommendations(response: string, healthProfile: UserHealthProfile): HealthRecommendation[] {
    try {
      // Extract structured recommendations from response
      const recommendations: HealthRecommendation[] = [];
      
      // Simple parsing logic - in production, use more sophisticated parsing
      const lines = response.split('\n').filter(line => line.trim());
      
      for (let i = 0; i < Math.min(lines.length, 8); i++) {
        const line = lines[i];
        if (line.includes('-') || line.match(/^\d+\./)) {
          recommendations.push({
            id: crypto.randomUUID(),
            type: 'habit',
            title: `Recommandation ${i + 1}`,
            description: line.replace(/^[-\d.]\s*/, ''),
            reasoning: 'Basé sur votre profil nutritionnel',
            nutritionalBenefit: 'Amélioration de l\'équilibre nutritionnel',
            priority: i < 3 ? 'high' : 'medium',
            estimatedImpact: Math.max(1, 10 - i),
            difficulty: 'easy',
            timeframe: '1-2 semaines'
          });
        }
      }
      
      return recommendations;
    } catch (error) {
      console.warn('Failed to parse recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate nutrition from meals
   */
  private async calculateMealsNutrition(meals: any[]): Promise<any> {
    // Simplified calculation - in production, integrate with nutrition database
    return {
      calories: meals.reduce((sum, meal) => sum + (meal.calories || 400), 0),
      protein: meals.reduce((sum, meal) => sum + (meal.protein || 20), 0),
      carbohydrates: meals.reduce((sum, meal) => sum + (meal.carbohydrates || 40), 0),
      fat: meals.reduce((sum, meal) => sum + (meal.fat || 15), 0),
      water: 1.5 // Default 1.5L
    };
  }

  /**
   * Create fallback analysis when parsing fails
   */
  private createFallbackAnalysis(healthProfile: UserHealthProfile): NutritionalAnalysis {
    const goals = this.calculateNutritionalGoals(healthProfile);
    
    return {
      totalCalories: goals.dailyCalories,
      macronutrients: {
        protein: { grams: goals.protein, percentage: 25 },
        carbohydrates: { grams: goals.carbohydrates, percentage: 45 },
        fat: { grams: goals.fat, percentage: 30 },
        fiber: { grams: 25 }
      },
      micronutrients: {
        vitamins: {
          'Vitamine C': { amount: 90, unit: 'mg', dailyValuePercentage: 100 },
          'Vitamine D': { amount: 20, unit: 'μg', dailyValuePercentage: 100 }
        },
        minerals: {
          'Calcium': { amount: 1000, unit: 'mg', dailyValuePercentage: 100 },
          'Fer': { amount: 18, unit: 'mg', dailyValuePercentage: 100 }
        }
      },
      nutritionalScore: 75,
      healthAlerts: []
    };
  }
}

// Export singleton instance
let nutritionalAIInstance: NutritionalAIService | null = null;

export function getNutritionalAIService(apiKey: string): NutritionalAIService {
  if (!nutritionalAIInstance || nutritionalAIInstance['apiKey'] !== apiKey) {
    nutritionalAIInstance = new NutritionalAIService(apiKey);
  }
  return nutritionalAIInstance;
}