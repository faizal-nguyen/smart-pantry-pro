/**
 * Context Analyzer
 * Analyse le contexte pour l'adaptation intelligente
 */

import { 
  CurrentContext,
  ContextFactors,
  WeatherContext 
} from '../types';
import { PlanningContext } from '../../types';
import { supabase } from '@/integrations/supabase/client';

interface AnalysisResult {
  factors: ContextFactors;
  insights: ContextInsight[];
  recommendations: ContextRecommendation[];
  confidence: number;
}

interface ContextInsight {
  type: 'weather' | 'time' | 'inventory' | 'health' | 'budget' | 'event';
  description: string;
  impact: 'low' | 'medium' | 'high';
  data: any;
}

interface ContextRecommendation {
  type: string;
  priority: number;
  action: string;
  reason: string;
}

export class ContextAnalyzer {
  private weatherCache: Map<string, { data: WeatherContext; timestamp: number }> = new Map();
  private cacheExpiry = 3600000; // 1 heure
  
  /**
   * Analyse complète du contexte actuel
   */
  async analyzeCurrentContext(
    userId: string,
    planningContext: PlanningContext
  ): Promise<AnalysisResult> {
    console.log('🔍 Analyzing current context for user:', userId);
    
    // 1. Collecter toutes les données contextuelles
    const [
      weather,
      recentMeals,
      upcomingEvents,
      inventoryStatus,
      healthData,
      budgetStatus
    ] = await Promise.all([
      this.getWeatherContext(),
      this.getRecentMeals(userId),
      this.getUpcomingEvents(userId),
      this.analyzeInventoryStatus(planningContext),
      this.getHealthData(userId),
      this.getBudgetStatus(userId, planningContext)
    ]);
    
    // 2. Construire les facteurs contextuels
    const factors: ContextFactors = {
      season: this.getCurrentSeason(),
      weather,
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      inventory: inventoryStatus,
      recentMeals,
      upcomingEvents
    };
    
    // 3. Générer les insights
    const insights = this.generateInsights(
      factors,
      healthData,
      budgetStatus,
      planningContext
    );
    
    // 4. Créer des recommandations basées sur le contexte
    const recommendations = this.generateRecommendations(
      factors,
      insights,
      planningContext
    );
    
    // 5. Calculer la confiance de l'analyse
    const confidence = this.calculateAnalysisConfidence(factors, insights);
    
    return {
      factors,
      insights,
      recommendations,
      confidence
    };
  }
  
  /**
   * Obtient le contexte météo actuel
   */
  private async getWeatherContext(): Promise<WeatherContext> {
    // Vérifier le cache
    const cached = this.weatherCache.get('current');
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    
    try {
      // En production, utiliser une vraie API météo
      // Pour l'instant, mock avec des données saisonnières
      const month = new Date().getMonth();
      let temperature: number;
      let condition: WeatherContext['condition'];
      
      if (month >= 11 || month <= 1) { // Hiver
        temperature = Math.floor(Math.random() * 10) - 2;
        condition = Math.random() > 0.5 ? 'cloudy' : 'rainy';
      } else if (month >= 2 && month <= 4) { // Printemps
        temperature = Math.floor(Math.random() * 10) + 10;
        condition = Math.random() > 0.7 ? 'rainy' : 'sunny';
      } else if (month >= 5 && month <= 7) { // Été
        temperature = Math.floor(Math.random() * 15) + 20;
        condition = 'sunny';
      } else { // Automne
        temperature = Math.floor(Math.random() * 10) + 5;
        condition = Math.random() > 0.6 ? 'rainy' : 'cloudy';
      }
      
      const weatherData: WeatherContext = {
        temperature,
        condition,
        humidity: Math.floor(Math.random() * 40) + 40
      };
      
      // Mettre en cache
      this.weatherCache.set('current', {
        data: weatherData,
        timestamp: Date.now()
      });
      
      return weatherData;
      
    } catch (error) {
      console.error('Failed to fetch weather:', error);
      // Valeurs par défaut
      return {
        temperature: 15,
        condition: 'cloudy',
        humidity: 60
      };
    }
  }
  
  /**
   * Récupère les repas récents
   */
  private async getRecentMeals(userId: string): Promise<string[]> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('meal_plan_entries')
        .select('recipe_id')
        .eq('user_id', userId)
        .gte('created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      return (data || []).map(entry => entry.recipe_id).filter(Boolean);
      
    } catch (error) {
      console.error('Error fetching recent meals:', error);
      return [];
    }
  }
  
  /**
   * Récupère les événements à venir
   */
  private async getUpcomingEvents(userId: string): Promise<string[]> {
    try {
      // Mock - en production, intégrer avec un calendrier
      const events = [];
      
      // Simuler quelques événements
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      if (dayOfWeek === 5 || dayOfWeek === 6) { // Vendredi ou samedi
        events.push('weekend_guests');
      }
      
      // Événements spéciaux basés sur la date
      const month = today.getMonth();
      const day = today.getDate();
      
      if (month === 11 && day >= 20 && day <= 31) {
        events.push('christmas_season');
      }
      
      return events;
      
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }
  
  /**
   * Analyse le statut de l'inventaire
   */
  private async analyzeInventoryStatus(
    context: PlanningContext
  ): Promise<any> {
    const { inventory } = context.request;
    const analysis = context.inventoryAnalysis;
    
    if (!inventory || inventory.length === 0) {
      return {
        status: 'empty',
        availableIngredients: 0,
        expiringItems: [],
        coverageScore: 0
      };
    }
    
    // Calculer les métriques d'inventaire
    const totalItems = inventory.length;
    const expiringItems = analysis?.expiringItems || [];
    const coverageScore = analysis?.coverageScore || 0;
    
    let status: 'low' | 'medium' | 'high';
    if (totalItems < 10) status = 'low';
    else if (totalItems < 30) status = 'medium';
    else status = 'high';
    
    return {
      status,
      availableIngredients: totalItems,
      expiringItems,
      coverageScore,
      categories: this.categorizeInventory(inventory)
    };
  }
  
  /**
   * Récupère les données de santé de l'utilisateur
   */
  private async getHealthData(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_meal_preferences')
        .select('health_goals, dietary_restrictions, allergies')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return {
        goals: data?.health_goals || {},
        restrictions: data?.dietary_restrictions || [],
        allergies: data?.allergies || [],
        active: !!(data?.health_goals && Object.keys(data.health_goals).length > 0)
      };
      
    } catch (error) {
      console.error('Error fetching health data:', error);
      return {
        goals: {},
        restrictions: [],
        allergies: [],
        active: false
      };
    }
  }
  
  /**
   * Obtient le statut budgétaire
   */
  private async getBudgetStatus(
    userId: string,
    context: PlanningContext
  ): Promise<any> {
    const weeklyBudget = context.request.preferences.budgetConstraints.weeklyBudget;
    
    try {
      // Calculer les dépenses de la semaine en cours
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('meal_planning_analytics')
        .select('event_data')
        .eq('user_id', userId)
        .eq('event_type', 'meal_cooked')
        .gte('created_at', weekStart.toISOString());
      
      if (error) throw error;
      
      const weeklySpent = (data || []).reduce((total, event) => {
        const cost = event.event_data?.cost || 0;
        return total + cost;
      }, 0);
      
      const remaining = weeklyBudget - weeklySpent;
      const percentUsed = (weeklySpent / weeklyBudget) * 100;
      
      return {
        weeklyBudget,
        spent: weeklySpent,
        remaining,
        percentUsed,
        status: percentUsed > 90 ? 'critical' : percentUsed > 70 ? 'warning' : 'good'
      };
      
    } catch (error) {
      console.error('Error calculating budget status:', error);
      return {
        weeklyBudget,
        spent: 0,
        remaining: weeklyBudget,
        percentUsed: 0,
        status: 'good'
      };
    }
  }
  
  /**
   * Génère des insights basés sur le contexte
   */
  private generateInsights(
    factors: ContextFactors,
    healthData: any,
    budgetStatus: any,
    context: PlanningContext
  ): ContextInsight[] {
    const insights: ContextInsight[] = [];
    
    // Insight météo
    if (factors.weather) {
      if (factors.weather.temperature < 5) {
        insights.push({
          type: 'weather',
          description: 'Temps très froid - privilégier les plats réconfortants',
          impact: 'high',
          data: { temperature: factors.weather.temperature }
        });
      } else if (factors.weather.temperature > 30) {
        insights.push({
          type: 'weather',
          description: 'Temps très chaud - favoriser les plats légers et frais',
          impact: 'high',
          data: { temperature: factors.weather.temperature }
        });
      }
    }
    
    // Insight temps disponible
    if (factors.dayOfWeek >= 1 && factors.dayOfWeek <= 5) { // Jour de semaine
      if (factors.timeOfDay >= 17 && factors.timeOfDay <= 19) {
        insights.push({
          type: 'time',
          description: 'Heure de pointe en semaine - repas rapides recommandés',
          impact: 'medium',
          data: { dayOfWeek: factors.dayOfWeek, timeOfDay: factors.timeOfDay }
        });
      }
    }
    
    // Insight inventaire
    if (factors.inventory) {
      if (factors.inventory.expiringItems.length > 3) {
        insights.push({
          type: 'inventory',
          description: `${factors.inventory.expiringItems.length} produits expirent bientôt`,
          impact: 'high',
          data: { expiringItems: factors.inventory.expiringItems }
        });
      }
      
      if (factors.inventory.status === 'low') {
        insights.push({
          type: 'inventory',
          description: 'Stock faible - planification limitée',
          impact: 'medium',
          data: { availableIngredients: factors.inventory.availableIngredients }
        });
      }
    }
    
    // Insight santé
    if (healthData.active) {
      insights.push({
        type: 'health',
        description: 'Objectifs santé actifs - privilégier l\'équilibre nutritionnel',
        impact: 'medium',
        data: { goals: healthData.goals }
      });
    }
    
    // Insight budget
    if (budgetStatus.status === 'critical') {
      insights.push({
        type: 'budget',
        description: `Budget presque épuisé (${budgetStatus.percentUsed.toFixed(0)}%)`,
        impact: 'high',
        data: { remaining: budgetStatus.remaining }
      });
    } else if (budgetStatus.status === 'warning') {
      insights.push({
        type: 'budget',
        description: `Attention au budget (${budgetStatus.percentUsed.toFixed(0)}% utilisé)`,
        impact: 'medium',
        data: { remaining: budgetStatus.remaining }
      });
    }
    
    // Insight événements
    if (factors.upcomingEvents && factors.upcomingEvents.length > 0) {
      const eventDescriptions = {
        'weekend_guests': 'Invités prévus ce week-end',
        'christmas_season': 'Période festive - repas spéciaux'
      };
      
      factors.upcomingEvents.forEach(event => {
        if (eventDescriptions[event as keyof typeof eventDescriptions]) {
          insights.push({
            type: 'event',
            description: eventDescriptions[event as keyof typeof eventDescriptions],
            impact: 'medium',
            data: { event }
          });
        }
      });
    }
    
    return insights;
  }
  
  /**
   * Génère des recommandations contextuelles
   */
  private generateRecommendations(
    factors: ContextFactors,
    insights: ContextInsight[],
    context: PlanningContext
  ): ContextRecommendation[] {
    const recommendations: ContextRecommendation[] = [];
    let priority = 1;
    
    // Recommandations basées sur la météo
    const weatherInsight = insights.find(i => i.type === 'weather' && i.impact === 'high');
    if (weatherInsight) {
      if (weatherInsight.data.temperature < 5) {
        recommendations.push({
          type: 'weather_adaptation',
          priority: priority++,
          action: 'Privilégier les soupes, ragoûts et plats mijotés',
          reason: 'Temps froid nécessitant des plats réconfortants'
        });
      } else {
        recommendations.push({
          type: 'weather_adaptation',
          priority: priority++,
          action: 'Favoriser les salades, grillades et plats froids',
          reason: 'Temps chaud nécessitant des repas légers'
        });
      }
    }
    
    // Recommandations pour les produits qui expirent
    const inventoryInsight = insights.find(i => i.type === 'inventory' && i.impact === 'high');
    if (inventoryInsight) {
      recommendations.push({
        type: 'expiry_prevention',
        priority: priority++,
        action: 'Utiliser en priorité les produits proches de l\'expiration',
        reason: `${inventoryInsight.data.expiringItems.length} produits expirent bientôt`
      });
    }
    
    // Recommandations budgétaires
    const budgetInsight = insights.find(i => i.type === 'budget' && i.impact === 'high');
    if (budgetInsight) {
      recommendations.push({
        type: 'budget_control',
        priority: priority++,
        action: 'Choisir des recettes économiques pour le reste de la semaine',
        reason: `Budget restant limité (${budgetInsight.data.remaining.toFixed(2)}€)`
      });
    }
    
    // Recommandations pour les jours chargés
    const timeInsight = insights.find(i => i.type === 'time');
    if (timeInsight) {
      recommendations.push({
        type: 'time_optimization',
        priority: priority++,
        action: 'Planifier des repas rapides (< 30 min) en semaine',
        reason: 'Jours de semaine avec peu de temps disponible'
      });
    }
    
    // Recommandations santé
    const healthInsight = insights.find(i => i.type === 'health');
    if (healthInsight) {
      recommendations.push({
        type: 'health_optimization',
        priority: priority++,
        action: 'Équilibrer les macronutriments selon vos objectifs',
        reason: 'Objectifs santé actifs'
      });
    }
    
    // Recommandations saisonnières
    if (factors.season === 'summer') {
      recommendations.push({
        type: 'seasonal',
        priority: priority++,
        action: 'Profiter des fruits et légumes d\'été',
        reason: 'Produits de saison disponibles et nutritifs'
      });
    } else if (factors.season === 'winter') {
      recommendations.push({
        type: 'seasonal',
        priority: priority++,
        action: 'Inclure des agrumes pour la vitamine C',
        reason: 'Renforcer l\'immunité en hiver'
      });
    }
    
    return recommendations.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * Calcule la confiance de l'analyse
   */
  private calculateAnalysisConfidence(
    factors: ContextFactors,
    insights: ContextInsight[]
  ): number {
    let confidence = 0.5; // Base
    
    // Plus on a de données, plus la confiance augmente
    if (factors.weather) confidence += 0.1;
    if (factors.recentMeals.length > 5) confidence += 0.1;
    if (factors.inventory && factors.inventory.availableIngredients > 20) confidence += 0.1;
    if (factors.upcomingEvents && factors.upcomingEvents.length > 0) confidence += 0.1;
    
    // Les insights de haute importance augmentent la confiance
    const highImpactInsights = insights.filter(i => i.impact === 'high').length;
    confidence += highImpactInsights * 0.05;
    
    return Math.min(confidence, 0.95); // Plafonner à 95%
  }
  
  /**
   * Obtient la saison actuelle
   */
  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
  
  /**
   * Catégorise l'inventaire par type
   */
  private categorizeInventory(inventory: any[]): Record<string, number> {
    const categories: Record<string, number> = {
      proteins: 0,
      vegetables: 0,
      fruits: 0,
      grains: 0,
      dairy: 0,
      other: 0
    };
    
    // Mock - en production, utiliser les vraies catégories
    inventory.forEach(item => {
      const category = this.getItemCategory(item);
      if (category in categories) {
        categories[category]++;
      } else {
        categories.other++;
      }
    });
    
    return categories;
  }
  
  private getItemCategory(item: any): string {
    // Mock - en production, utiliser une vraie classification
    const name = item.name.toLowerCase();
    
    if (name.includes('viande') || name.includes('poisson') || name.includes('poulet')) {
      return 'proteins';
    } else if (name.includes('légume') || name.includes('carotte') || name.includes('tomate')) {
      return 'vegetables';
    } else if (name.includes('fruit') || name.includes('pomme') || name.includes('banane')) {
      return 'fruits';
    } else if (name.includes('pâtes') || name.includes('riz') || name.includes('pain')) {
      return 'grains';
    } else if (name.includes('lait') || name.includes('fromage') || name.includes('yaourt')) {
      return 'dairy';
    }
    
    return 'other';
  }
  
  /**
   * Analyse le contexte pour une période spécifique
   */
  async analyzeContextForPeriod(
    userId: string,
    startDate: Date,
    endDate: Date,
    planningContext: PlanningContext
  ): Promise<ContextFactors[]> {
    const contextFactors: ContextFactors[] = [];
    
    // Analyser chaque jour de la période
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayContext: ContextFactors = {
        season: this.getCurrentSeason(),
        weather: await this.getWeatherContext(), // En prod, obtenir prévisions
        timeOfDay: 12, // Midi par défaut
        dayOfWeek: current.getDay(),
        inventory: await this.analyzeInventoryStatus(planningContext),
        recentMeals: await this.getRecentMeals(userId),
        upcomingEvents: await this.getUpcomingEvents(userId)
      };
      
      contextFactors.push(dayContext);
      current.setDate(current.getDate() + 1);
    }
    
    return contextFactors;
  }
}

// Export singleton instance
export const contextAnalyzer = new ContextAnalyzer();