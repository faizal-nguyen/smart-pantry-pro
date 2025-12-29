/**
 * ContextAnalyzer - Analyse contextuelle pour suggestions intelligentes
 * Implémente PRP-040.3 - Context Intelligence avec intégration APIs externes
 */

import { NavigationSection, FamilyProfile } from '@/types/family-mode';
import { SmartSuggestion } from './SmartSuggestions';

export interface ContextData {
  time: {
    hour: number;
    dayOfWeek: number;
    isWeekend: boolean;
    season: string;
  };
  inventory: {
    totalItems: number;
    expiringItems: number;
    lowStockItems: string[];
  };
  external: {
    weather: string;
    temperature: number;
    isHoliday: boolean;
  };
  user: {
    lastVisit: Date;
    preferredCookingTime: number[];
    dietaryRestrictions: string[];
  };
  family?: {
    activeProfile: FamilyProfile;
    childrenPresent: boolean;
    supervisionLevel: 'high' | 'medium' | 'low';
    safetyRestrictionsActive: boolean;
  };
}

export interface ContextualRule {
  id: string;
  name: string;
  trigger: {
    timeRange?: { start: number; end: number };
    dayOfWeek?: number[];
    weather?: string[];
    inventory?: { condition: 'low' | 'expiring' | 'abundant'; threshold?: number };
    family?: { profileType?: 'parent' | 'child'; supervisionRequired?: boolean };
  };
  suggestion: {
    type: SmartSuggestion['type'];
    title: string;
    description: string;
    action: string;
    icon: string;
    priority: 'low' | 'medium' | 'high';
  };
  confidence: number;
  familyCompatible: boolean;
}

export class ContextAnalyzer {
  private contextCache: Map<string, { data: ContextData; timestamp: number }> = new Map();
  private rules: ContextualRule[] = [];
  private cacheExpiry = 10 * 60 * 1000; // 10 minutes
  private weatherApiKey?: string;

  constructor() {
    this.initializeRules();
    this.loadWeatherConfig();
  }

  /**
   * Analyse le contexte actuel complet
   */
  async analyzeCurrentContext(): Promise<ContextData> {
    const cacheKey = 'current_context';
    const cached = this.contextCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const [timeContext, inventoryContext, externalContext, userContext] = await Promise.all([
        this.getTimeContext(),
        this.getInventoryContext(),
        this.getExternalContext(),
        this.getUserContext()
      ]);

      const contextData: ContextData = {
        time: timeContext,
        inventory: inventoryContext,
        external: externalContext,
        user: userContext
      };

      // Mettre en cache
      this.contextCache.set(cacheKey, {
        data: contextData,
        timestamp: Date.now()
      });

      return contextData;
    } catch (error) {
      console.error('Failed to analyze context:', error);
      return this.getDefaultContext();
    }
  }

  /**
   * Génère des suggestions contextuelles intelligentes
   */
  generateContextualSuggestions(
    context: ContextData,
    currentSection: NavigationSection,
    familyProfile?: FamilyProfile
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Appliquer les règles contextuelles
    this.rules.forEach(rule => {
      if (this.evaluateRule(rule, context, currentSection, familyProfile)) {
        const suggestion = this.createSuggestionFromRule(rule, context, familyProfile);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    });

    // Suggestions basées sur le temps
    suggestions.push(...this.generateTimeBasedSuggestions(context, currentSection, familyProfile));

    // Suggestions basées sur l'inventaire
    suggestions.push(...this.generateInventoryBasedSuggestions(context, familyProfile));

    // Suggestions basées sur la météo
    suggestions.push(...this.generateWeatherBasedSuggestions(context, familyProfile));

    // Suggestions famille spécifiques
    if (familyProfile) {
      suggestions.push(...this.generateFamilySpecificSuggestions(context, familyProfile));
    }

    return suggestions
      .filter(s => s.confidence >= 0.5)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Met à jour le contexte famille
   */
  updateFamilyContext(
    baseContext: ContextData,
    familyProfile: FamilyProfile,
    familyState: {
      childrenPresent: boolean;
      supervisionLevel: 'high' | 'medium' | 'low';
      safetyRestrictionsActive: boolean;
    }
  ): ContextData {
    return {
      ...baseContext,
      family: {
        activeProfile: familyProfile,
        childrenPresent: familyState.childrenPresent,
        supervisionLevel: familyState.supervisionLevel,
        safetyRestrictionsActive: familyState.safetyRestrictionsActive
      }
    };
  }

  // === COLLECTE DE CONTEXTE ===

  private async getTimeContext(): Promise<ContextData['time']> {
    const now = new Date();
    return {
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      season: this.getCurrentSeason()
    };
  }

  private async getInventoryContext(): Promise<ContextData['inventory']> {
    try {
      // En production, récupérer depuis la base de données
      // Pour l'instant, utiliser des données mockées contextuelles
      const mockInventory = this.generateMockInventory();
      
      return {
        totalItems: mockInventory.total,
        expiringItems: mockInventory.expiring,
        lowStockItems: mockInventory.lowStock
      };
    } catch (error) {
      console.error('Failed to get inventory context:', error);
      return {
        totalItems: 0,
        expiringItems: 0,
        lowStockItems: []
      };
    }
  }

  private async getExternalContext(): Promise<ContextData['external']> {
    try {
      const weather = await this.fetchWeatherData();
      const isHoliday = this.checkIfHoliday();

      return {
        weather: weather.condition,
        temperature: weather.temperature,
        isHoliday
      };
    } catch (error) {
      console.error('Failed to get external context:', error);
      return {
        weather: 'unknown',
        temperature: 20,
        isHoliday: false
      };
    }
  }

  private async getUserContext(): Promise<ContextData['user']> {
    try {
      // En production, récupérer depuis la base utilisateur
      return {
        lastVisit: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hier
        preferredCookingTime: [18, 19, 20], // 18h-20h
        dietaryRestrictions: [] // À récupérer depuis les préférences
      };
    } catch (error) {
      console.error('Failed to get user context:', error);
      return {
        lastVisit: new Date(),
        preferredCookingTime: [19],
        dietaryRestrictions: []
      };
    }
  }

  // === GÉNÉRATION DE SUGGESTIONS SPÉCIALISÉES ===

  private generateTimeBasedSuggestions(
    context: ContextData,
    currentSection: NavigationSection,
    familyProfile?: FamilyProfile
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];
    const { hour, isWeekend } = context.time;

    // Suggestions pour les heures de repas
    if (hour >= 17 && hour <= 20 && currentSection !== 'kitchen') {
      suggestions.push({
        id: `cooking_time_${Date.now()}`,
        type: 'navigation',
        title: 'Temps de cuisiner !',
        description: 'Découvrez des recettes pour ce soir',
        icon: 'ChefHat',
        confidence: 0.8,
        priority: 'medium',
        action: {
          type: 'navigate',
          target: 'kitchen'
        },
        context: {
          trigger: 'cooking_time',
          reasoning: ['Heure habituelle du dîner'],
          timeRelevant: true,
          familyRelevant: !!familyProfile
        },
        presentation: {
          urgent: false,
          dismissible: true,
          autoHide: true,
          showDuration: 8000,
          animation: 'slide'
        },
        familyAdaptation: familyProfile ? {
          childFriendly: true,
          supervisedAction: familyProfile.type === 'child',
          adaptedLanguage: familyProfile.type === 'child' ? 'C\'est l\'heure de cuisiner !' : 'Temps de cuisiner !',
          safetyLevel: 'safe'
        } : undefined
      });
    }

    // Suggestions week-end
    if (isWeekend && hour >= 10 && hour <= 12) {
      suggestions.push({
        id: `weekend_planning_${Date.now()}`,
        type: 'action',
        title: 'Planification week-end',
        description: 'Préparez vos repas pour la semaine',
        icon: 'Calendar',
        confidence: 0.6,
        priority: 'low',
        action: {
          type: 'navigate',
          target: 'kitchen',
          data: { mode: 'meal_planning', period: 'week' }
        },
        context: {
          trigger: 'weekend_planning',
          reasoning: ['Week-end idéal pour planifier'],
          timeRelevant: true,
          familyRelevant: true
        },
        presentation: {
          urgent: false,
          dismissible: true,
          autoHide: true,
          showDuration: 10000,
          animation: 'fade'
        }
      });
    }

    return suggestions;
  }

  private generateInventoryBasedSuggestions(
    context: ContextData,
    familyProfile?: FamilyProfile
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Produits qui expirent
    if (context.inventory.expiringItems > 0) {
      suggestions.push({
        id: `expiring_alert_${Date.now()}`,
        type: 'action',
        title: `${context.inventory.expiringItems} produits expirent bientôt`,
        description: 'Planifiez vos repas pour les utiliser',
        icon: 'AlertCircle',
        confidence: 0.9,
        priority: 'high',
        action: {
          type: 'execute',
          target: 'show-expiring-items'
        },
        context: {
          trigger: 'inventory_expiry',
          reasoning: ['Éviter le gaspillage', 'Économiser de l\'argent'],
          timeRelevant: true,
          familyRelevant: false
        },
        presentation: {
          urgent: true,
          dismissible: true,
          autoHide: false,
          animation: 'pulse'
        }
      });
    }

    // Stock faible
    if (context.inventory.lowStockItems.length > 0) {
      suggestions.push({
        id: `low_stock_${Date.now()}`,
        type: 'action',
        title: 'Stock faible détecté',
        description: `${context.inventory.lowStockItems.length} produits à racheter`,
        icon: 'PackageOpen',
        confidence: 0.7,
        priority: 'medium',
        action: {
          type: 'navigate',
          target: 'shopping',
          data: { addItems: context.inventory.lowStockItems }
        },
        context: {
          trigger: 'low_stock',
          reasoning: ['Stock insuffisant pour certains produits'],
          timeRelevant: false,
          familyRelevant: false
        },
        presentation: {
          urgent: false,
          dismissible: true,
          autoHide: true,
          showDuration: 7000,
          animation: 'slide'
        }
      });
    }

    return suggestions;
  }

  private generateWeatherBasedSuggestions(
    context: ContextData,
    familyProfile?: FamilyProfile
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Suggestions par temps froid
    if (context.external.temperature < 10 && context.time.isWeekend) {
      suggestions.push({
        id: `comfort_food_${Date.now()}`,
        type: 'recipe-filter',
        title: 'Parfait pour un plat réconfortant',
        description: 'Soupes, plats mijotés et desserts chauds',
        icon: 'Soup',
        confidence: 0.7,
        priority: 'low',
        action: {
          type: 'navigate',
          target: 'kitchen',
          data: { filter: 'comfort-food', temperature: 'cold' }
        },
        context: {
          trigger: 'cold_weather',
          reasoning: ['Temps froid propice aux plats chauds'],
          timeRelevant: false,
          familyRelevant: true
        },
        presentation: {
          urgent: false,
          dismissible: true,
          autoHide: true,
          showDuration: 12000,
          animation: 'fade'
        },
        familyAdaptation: familyProfile?.type === 'child' ? {
          childFriendly: true,
          supervisedAction: false,
          adaptedLanguage: 'Il fait froid ! Et si on faisait une bonne soupe ?',
          safetyLevel: 'safe'
        } : undefined
      });
    }

    // Suggestions par temps chaud
    if (context.external.temperature > 25) {
      suggestions.push({
        id: `fresh_food_${Date.now()}`,
        type: 'recipe-filter',
        title: 'Parfait pour des plats frais',
        description: 'Salades, plats froids et desserts glacés',
        icon: 'Snowflake',
        confidence: 0.75,
        priority: 'medium',
        action: {
          type: 'navigate',
          target: 'kitchen',
          data: { filter: 'fresh-food', temperature: 'hot' }
        },
        context: {
          trigger: 'hot_weather',
          reasoning: ['Temps chaud idéal pour des plats rafraîchissants'],
          timeRelevant: false,
          familyRelevant: true
        },
        presentation: {
          urgent: false,
          dismissible: true,
          autoHide: true,
          showDuration: 10000,
          animation: 'slide'
        }
      });
    }

    return suggestions;
  }

  private generateFamilySpecificSuggestions(
    context: ContextData,
    familyProfile: FamilyProfile
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Suggestions pour les enfants
    if (familyProfile.type === 'child') {
      // Encourager la participation
      if (context.time.hour >= 16 && context.time.hour <= 18) {
        suggestions.push({
          id: `child_help_cooking_${Date.now()}`,
          type: 'family',
          title: 'Aide en cuisine !',
          description: 'Trouve des recettes faciles à faire avec papa/maman',
          icon: 'Heart',
          confidence: 0.8,
          priority: 'medium',
          action: {
            type: 'navigate',
            target: 'kitchen',
            data: { filter: 'child-friendly', supervision: true }
          },
          context: {
            trigger: 'child_cooking_time',
            reasoning: ['Moment idéal pour cuisiner ensemble'],
            timeRelevant: true,
            familyRelevant: true
          },
          presentation: {
            urgent: false,
            dismissible: true,
            autoHide: true,
            showDuration: 15000,
            animation: 'bounce'
          },
          familyAdaptation: {
            childFriendly: true,
            supervisedAction: true,
            adaptedLanguage: 'Viens m\'aider en cuisine !',
            safetyLevel: 'safe'
          }
        });
      }

      // Jeux éducatifs liés à la cuisine
      if (context.time.isWeekend) {
        suggestions.push({
          id: `educational_games_${Date.now()}`,
          type: 'family',
          title: 'Jeux de cuisine !',
          description: 'Apprends en t\'amusant avec les aliments',
          icon: 'Gamepad2',
          confidence: 0.7,
          priority: 'low',
          action: {
            type: 'navigate',
            target: 'games',
            data: { category: 'educational', age: familyProfile.age }
          },
          context: {
            trigger: 'educational_play',
            reasoning: ['Week-end propice aux jeux éducatifs'],
            timeRelevant: true,
            familyRelevant: true
          },
          presentation: {
            urgent: false,
            dismissible: true,
            autoHide: true,
            showDuration: 8000,
            animation: 'bounce'
          },
          familyAdaptation: {
            childFriendly: true,
            supervisedAction: false,
            adaptedLanguage: 'Des jeux rigolos pour apprendre !',
            safetyLevel: 'safe'
          }
        });
      }
    }

    // Suggestions pour les parents
    if (familyProfile.type === 'parent' && context.family?.childrenPresent) {
      // Coordination famille
      suggestions.push({
        id: `family_coordination_${Date.now()}`,
        type: 'family',
        title: 'Coordination famille',
        description: 'Planifier les repas avec toute la famille',
        icon: 'Users',
        confidence: 0.65,
        priority: 'medium',
        action: {
          type: 'navigate',
          target: 'kitchen',
          data: { mode: 'family_planning', includeChildren: true }
        },
        context: {
          trigger: 'family_coordination',
          reasoning: ['Enfants présents', 'Moment pour impliquer la famille'],
          timeRelevant: false,
          familyRelevant: true
        },
        presentation: {
          urgent: false,
          dismissible: true,
          autoHide: true,
          showDuration: 10000,
          animation: 'slide'
        },
        familyAdaptation: {
          childFriendly: true,
          supervisedAction: false,
          adaptedLanguage: 'Planifions les repas ensemble !',
          safetyLevel: 'safe'
        }
      });
    }

    return suggestions;
  }

  // === ÉVALUATION DES RÈGLES ===

  private evaluateRule(
    rule: ContextualRule,
    context: ContextData,
    currentSection: NavigationSection,
    familyProfile?: FamilyProfile
  ): boolean {
    const { trigger } = rule;

    // Vérifier la compatibilité famille
    if (familyProfile && !rule.familyCompatible) {
      return false;
    }

    // Vérifier les contraintes temporelles
    if (trigger.timeRange) {
      const { start, end } = trigger.timeRange;
      if (context.time.hour < start || context.time.hour > end) {
        return false;
      }
    }

    if (trigger.dayOfWeek && !trigger.dayOfWeek.includes(context.time.dayOfWeek)) {
      return false;
    }

    // Vérifier les contraintes météo
    if (trigger.weather && !trigger.weather.includes(context.external.weather)) {
      return false;
    }

    // Vérifier les contraintes d'inventaire
    if (trigger.inventory) {
      const { condition, threshold = 5 } = trigger.inventory;
      
      switch (condition) {
        case 'low':
          if (context.inventory.totalItems > threshold) return false;
          break;
        case 'expiring':
          if (context.inventory.expiringItems === 0) return false;
          break;
        case 'abundant':
          if (context.inventory.totalItems < threshold * 2) return false;
          break;
      }
    }

    // Vérifier les contraintes famille
    if (trigger.family && familyProfile) {
      if (trigger.family.profileType && familyProfile.type !== trigger.family.profileType) {
        return false;
      }
      
      if (trigger.family.supervisionRequired && 
          context.family?.supervisionLevel === 'low') {
        return false;
      }
    }

    return true;
  }

  private createSuggestionFromRule(
    rule: ContextualRule,
    context: ContextData,
    familyProfile?: FamilyProfile
  ): SmartSuggestion | null {
    const suggestion: SmartSuggestion = {
      id: `rule_${rule.id}_${Date.now()}`,
      type: rule.suggestion.type,
      title: rule.suggestion.title,
      description: rule.suggestion.description,
      icon: rule.suggestion.icon,
      confidence: rule.confidence,
      priority: rule.suggestion.priority,
      action: {
        type: 'navigate',
        target: rule.suggestion.action
      },
      context: {
        trigger: rule.id,
        reasoning: [`Règle: ${rule.name}`],
        timeRelevant: !!rule.trigger.timeRange,
        familyRelevant: rule.familyCompatible
      },
      presentation: {
        urgent: rule.suggestion.priority === 'high',
        dismissible: true,
        autoHide: rule.suggestion.priority === 'low',
        showDuration: rule.suggestion.priority === 'high' ? 12000 : 8000,
        animation: 'slide'
      }
    };

    // Adapter pour famille si nécessaire
    if (familyProfile && rule.familyCompatible) {
      suggestion.familyAdaptation = {
        childFriendly: true,
        supervisedAction: this.ruleSuggestionRequiresSupervision(rule, familyProfile),
        adaptedLanguage: this.adaptRuleLanguageForFamily(rule.suggestion.description, familyProfile),
        safetyLevel: this.evaluateRuleSafety(rule, familyProfile)
      };
    }

    return suggestion;
  }

  // === SERVICES EXTERNES ===

  private async fetchWeatherData(): Promise<{ condition: string; temperature: number }> {
    if (this.weatherApiKey) {
      try {
        // En production, utiliser une vraie API météo
        // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Paris&appid=${this.weatherApiKey}`);
        // const data = await response.json();
        // return { condition: data.weather[0].main.toLowerCase(), temperature: Math.round(data.main.temp - 273.15) };
      } catch (error) {
        console.error('Weather API failed:', error);
      }
    }

    // Fallback avec données saisonnières mockées
    return this.getMockWeatherData();
  }

  private getMockWeatherData(): { condition: string; temperature: number } {
    const season = this.getCurrentSeason();
    const conditions = {
      spring: { condition: 'cloudy', temperature: 15 },
      summer: { condition: 'sunny', temperature: 25 },
      fall: { condition: 'rainy', temperature: 12 },
      winter: { condition: 'cloudy', temperature: 5 }
    };
    
    return conditions[season as keyof typeof conditions] || conditions.spring;
  }

  private checkIfHoliday(): boolean {
    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();
    
    // Quelques jours fériés français
    const holidays = [
      { month: 0, day: 1 },   // Nouvel An
      { month: 4, day: 1 },   // Fête du Travail
      { month: 6, day: 14 },  // Fête Nationale
      { month: 11, day: 25 }  // Noël
    ];
    
    return holidays.some(h => h.month === month && h.day === day);
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private generateMockInventory(): { total: number; expiring: number; lowStock: string[] } {
    // Générer des données d'inventaire réalistes basées sur l'heure
    const hour = new Date().getHours();
    const isEvening = hour >= 17;
    
    return {
      total: Math.floor(Math.random() * 20) + 15, // 15-35 items
      expiring: isEvening ? Math.floor(Math.random() * 3) : 0, // Plus d'expiration le soir
      lowStock: isEvening ? ['lait', 'pain', 'œufs'] : []
    };
  }

  private getDefaultContext(): ContextData {
    const now = new Date();
    return {
      time: {
        hour: now.getHours(),
        dayOfWeek: now.getDay(),
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        season: this.getCurrentSeason()
      },
      inventory: {
        totalItems: 20,
        expiringItems: 0,
        lowStockItems: []
      },
      external: {
        weather: 'cloudy',
        temperature: 20,
        isHoliday: false
      },
      user: {
        lastVisit: new Date(),
        preferredCookingTime: [19],
        dietaryRestrictions: []
      }
    };
  }

  // === CONFIGURATION DES RÈGLES ===

  private initializeRules(): void {
    this.rules = [
      {
        id: 'morning_breakfast',
        name: 'Suggestion petit-déjeuner matinal',
        trigger: {
          timeRange: { start: 6, end: 10 }
        },
        suggestion: {
          type: 'navigation',
          title: 'Idées petit-déjeuner',
          description: 'Découvrez des recettes pour bien commencer la journée',
          action: 'kitchen',
          icon: 'Coffee',
          priority: 'medium'
        },
        confidence: 0.7,
        familyCompatible: true
      },
      {
        id: 'weekend_meal_prep',
        name: 'Préparation week-end',
        trigger: {
          timeRange: { start: 9, end: 12 },
          dayOfWeek: [0, 6] // Dimanche et samedi
        },
        suggestion: {
          type: 'action',
          title: 'Meal prep week-end',
          description: 'Préparez vos repas pour la semaine',
          action: 'meal_planning',
          icon: 'Calendar',
          priority: 'medium'
        },
        confidence: 0.6,
        familyCompatible: true
      },
      {
        id: 'rainy_day_comfort',
        name: 'Plats réconfortants par temps de pluie',
        trigger: {
          weather: ['rainy', 'stormy']
        },
        suggestion: {
          type: 'recipe-filter',
          title: 'Jour de pluie = plat réconfortant',
          description: 'Soupes chaudes et plats mijotés',
          action: 'filter-comfort-food',
          icon: 'CloudRain',
          priority: 'low'
        },
        confidence: 0.65,
        familyCompatible: true
      },
      {
        id: 'expiry_urgent',
        name: 'Alerte expiration urgente',
        trigger: {
          inventory: { condition: 'expiring', threshold: 1 }
        },
        suggestion: {
          type: 'action',
          title: 'Produits à utiliser rapidement',
          description: 'Évitez le gaspillage alimentaire',
          action: 'show-expiring-items',
          icon: 'AlertTriangle',
          priority: 'high'
        },
        confidence: 0.9,
        familyCompatible: false
      },
      {
        id: 'child_evening_activities',
        name: 'Activités enfant en soirée',
        trigger: {
          timeRange: { start: 18, end: 20 },
          family: { profileType: 'child' }
        },
        suggestion: {
          type: 'family',
          title: 'Activités cuisine pour enfants',
          description: 'Recettes simples et amusantes',
          action: 'child_cooking_activities',
          icon: 'Star',
          priority: 'medium'
        },
        confidence: 0.75,
        familyCompatible: true
      }
    ];
  }

  private loadWeatherConfig(): void {
    // Charger la clé API météo depuis l'environnement
    this.weatherApiKey = process.env.WEATHER_API_KEY;
  }

  // === ADAPTATIONS FAMILLE ===

  private ruleSuggestionRequiresSupervision(rule: ContextualRule, familyProfile: FamilyProfile): boolean {
    return familyProfile.type === 'child' && 
           (rule.suggestion.action.includes('shopping') || 
            rule.suggestion.action.includes('external'));
  }

  private adaptRuleLanguageForFamily(description: string, familyProfile: FamilyProfile): string {
    if (familyProfile.type !== 'child') return description;

    // Adapter le langage pour les enfants
    return description
      .replace('Découvrez', 'Découvre')
      .replace('Préparez', 'Prépare')
      .replace('Planifiez', 'Planifie')
      .replace('Évitez', 'Évite')
      .replace('votre', 'ton')
      .replace('vos', 'tes');
  }

  private evaluateRuleSafety(rule: ContextualRule, familyProfile: FamilyProfile): 'safe' | 'caution' | 'restricted' {
    if (familyProfile.type !== 'child') return 'safe';

    const restrictedActions = ['shopping', 'sharing', 'external'];
    if (restrictedActions.some(action => rule.suggestion.action.includes(action))) {
      return 'restricted';
    }

    const cautionActions = ['advanced', 'complex'];
    if (cautionActions.some(action => rule.suggestion.action.includes(action))) {
      return 'caution';
    }

    return 'safe';
  }
}

// Export singleton
export const contextAnalyzer = new ContextAnalyzer();