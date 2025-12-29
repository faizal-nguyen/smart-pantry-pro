/**
 * SmartSuggestions - Système de suggestions intelligentes proactives
 * Implémente PRP-040.3 - Suggestions proactives et contextual tips
 */

import { NavigationSection, FamilyProfile } from '@/types/family-mode';
import { navigationPredictor } from '@/services/intelligence/NavigationPredictor';
import { personalizationEngine } from './PersonalizationEngine';
import { behaviorTracker } from './BehaviorTracker';
import { cipherContextIntegration } from '@/services/context/CipherContextIntegration';

export interface SmartSuggestion {
  id: string;
  type: 'navigation' | 'action' | 'recipe-filter' | 'workflow' | 'discovery' | 'family';
  title: string;
  description: string;
  icon: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  action: {
    type: 'navigate' | 'execute' | 'prompt' | 'tutorial';
    target: string;
    data?: any;
  };
  context: {
    trigger: string;
    reasoning: string[];
    timeRelevant: boolean;
    familyRelevant: boolean;
  };
  presentation: {
    urgent: boolean;
    dismissible: boolean;
    autoHide: boolean;
    showDuration?: number; // millisecondes
    animation?: 'slide' | 'fade' | 'bounce' | 'pulse';
  };
  familyAdaptation?: {
    childFriendly: boolean;
    supervisedAction: boolean;
    adaptedLanguage: string;
    safetyLevel: 'safe' | 'caution' | 'restricted';
  };
}

export interface SuggestionContext {
  userId: string;
  currentSection: NavigationSection;
  timeOfDay: number;
  dayOfWeek: number;
  sessionDuration: number;
  recentActions: string[];
  familyProfile?: FamilyProfile;
  currentInventory?: Array<{ name: string; expiryDate?: Date }>;
  weatherContext?: {
    temperature: number;
    condition: string;
  };
  budgetStatus?: {
    remaining: number;
    percentUsed: number;
  };
}

export interface SuggestionAnalytics {
  suggestionId: string;
  shown: Date;
  clicked?: Date;
  dismissed?: Date;
  result: 'accepted' | 'ignored' | 'dismissed';
  timeToAction?: number;
  followupActions?: string[];
  userSatisfaction?: number; // 1-5
}

export class SmartSuggestions {
  private activeSuggestions: Map<string, SmartSuggestion[]> = new Map();
  private suggestionHistory: Map<string, SuggestionAnalytics[]> = new Map();
  private dismissedSuggestions: Map<string, Set<string>> = new Map();
  private maxSuggestionsPerUser = 3;
  private cooldownPeriod = 5 * 60 * 1000; // 5 minutes entre suggestions similaires

  constructor() {
    this.initializeSuggestions();
  }

  /**
   * Génère des suggestions intelligentes pour le contexte actuel
   */
  async generateSuggestions(context: SuggestionContext): Promise<SmartSuggestion[]> {
    try {
      console.log('🎯 Generating smart suggestions for context:', context.currentSection);

      const suggestions: SmartSuggestion[] = [];

      // 1. Suggestions de navigation prédictive
      const navigationSuggestions = await this.generateNavigationSuggestions(context);
      suggestions.push(...navigationSuggestions);

      // 2. Suggestions d'action contextuelle
      const actionSuggestions = await this.generateActionSuggestions(context);
      suggestions.push(...actionSuggestions);

      // 3. Suggestions de découverte de fonctionnalités
      const discoverySuggestions = await this.generateDiscoverySuggestions(context);
      suggestions.push(...discoverySuggestions);

      // 4. Suggestions d'optimisation workflow
      const workflowSuggestions = await this.generateWorkflowSuggestions(context);
      suggestions.push(...workflowSuggestions);

      // 5. Suggestions famille si applicable
      if (context.familyProfile) {
        const familySuggestions = await this.generateFamilySuggestions(context);
        suggestions.push(...familySuggestions);
      }

      // Filtrer et prioriser
      const filteredSuggestions = await this.filterAndPrioritize(context.userId, suggestions);

      // Adapter pour famille si nécessaire
      if (context.familyProfile) {
        return this.adaptSuggestionsForFamily(filteredSuggestions, context.familyProfile);
      }

      return filteredSuggestions;
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return [];
    }
  }

  /**
   * Marque une suggestion comme affichée
   */
  async markSuggestionShown(
    userId: string,
    suggestionId: string,
    context: any
  ): Promise<void> {
    const analytics: SuggestionAnalytics = {
      suggestionId,
      shown: new Date(),
      result: 'ignored' // Par défaut
    };

    const userHistory = this.suggestionHistory.get(userId) || [];
    userHistory.push(analytics);
    this.suggestionHistory.set(userId, userHistory);

    // Enregistrer dans Cipher
    await cipherContextIntegration.recordContextualExperience(userId, context, [], {
      accepted: false,
      satisfaction: undefined
    });
  }

  /**
   * Traite l'action sur une suggestion
   */
  async handleSuggestionAction(
    userId: string,
    suggestionId: string,
    action: 'accept' | 'dismiss' | 'postpone',
    followupActions?: string[]
  ): Promise<void> {
    // Mettre à jour l'analytics
    const userHistory = this.suggestionHistory.get(userId) || [];
    const analytics = userHistory.find(a => a.suggestionId === suggestionId);
    
    if (analytics) {
      analytics.result = action === 'accept' ? 'accepted' : 'dismissed';
      analytics.clicked = new Date();
      analytics.timeToAction = analytics.clicked.getTime() - analytics.shown.getTime();
      analytics.followupActions = followupActions;
    }

    // Gérer le dismiss
    if (action === 'dismiss') {
      const dismissed = this.dismissedSuggestions.get(userId) || new Set();
      dismissed.add(suggestionId);
      this.dismissedSuggestions.set(userId, dismissed);
    }

    // Apprendre de l'action pour Cipher
    await this.learnFromSuggestionFeedback(userId, suggestionId, action, analytics);
  }

  /**
   * Obtient les métriques de performance des suggestions
   */
  getSuggestionMetrics(userId: string): {
    totalShown: number;
    acceptanceRate: number;
    averageTimeToAction: number;
    topPerformingSuggestions: Array<{ type: string; performance: number }>;
    familyModeMetrics?: {
      childAcceptanceRate: number;
      parentSupervisionRate: number;
      safetyTriggered: number;
    };
  } {
    const userHistory = this.suggestionHistory.get(userId) || [];
    
    if (userHistory.length === 0) {
      return {
        totalShown: 0,
        acceptanceRate: 0,
        averageTimeToAction: 0,
        topPerformingSuggestions: []
      };
    }

    const accepted = userHistory.filter(a => a.result === 'accepted');
    const acceptanceRate = accepted.length / userHistory.length;

    const avgTimeToAction = accepted
      .filter(a => a.timeToAction)
      .reduce((sum, a) => sum + (a.timeToAction || 0), 0) / accepted.length;

    // Analyser par type de suggestion
    const typePerformance = new Map<string, { shown: number; accepted: number }>();
    userHistory.forEach(analytics => {
      const suggestion = this.findSuggestionById(userId, analytics.suggestionId);
      if (suggestion) {
        const existing = typePerformance.get(suggestion.type) || { shown: 0, accepted: 0 };
        existing.shown++;
        if (analytics.result === 'accepted') existing.accepted++;
        typePerformance.set(suggestion.type, existing);
      }
    });

    const topPerformingSuggestions = Array.from(typePerformance.entries())
      .map(([type, stats]) => ({
        type,
        performance: stats.accepted / stats.shown
      }))
      .sort((a, b) => b.performance - a.performance);

    return {
      totalShown: userHistory.length,
      acceptanceRate,
      averageTimeToAction: avgTimeToAction,
      topPerformingSuggestions
    };
  }

  // === GÉNÉRATION DE SUGGESTIONS SPÉCIALISÉES ===

  private async generateNavigationSuggestions(
    context: SuggestionContext
  ): Promise<SmartSuggestion[]> {
    const predictions = await navigationPredictor.predictNextSections(
      context.userId,
      context.currentSection,
      {
        familyProfile: context.familyProfile,
        calendarBusy: context.sessionDuration > 30 * 60 * 1000, // Session longue = occupé
        weatherImpact: this.getWeatherImpact(context.weatherContext)
      }
    );

    return predictions
      .filter(pred => pred.confidence > 0.5)
      .slice(0, 2)
      .map(pred => ({
        id: `nav_${pred.section}_${Date.now()}`,
        type: 'navigation',
        title: `Aller à ${this.getSectionDisplayName(pred.section)}`,
        description: pred.reasoning,
        icon: this.getSectionIcon(pred.section),
        confidence: pred.confidence,
        priority: pred.priority,
        action: {
          type: 'navigate',
          target: pred.section
        },
        context: {
          trigger: 'prediction',
          reasoning: pred.contextualFactors,
          timeRelevant: pred.estimatedTimeToAction <= 10,
          familyRelevant: !!pred.familyContext
        },
        presentation: {
          urgent: pred.priority === 'high',
          dismissible: true,
          autoHide: pred.priority === 'low',
          showDuration: pred.priority === 'high' ? 10000 : 5000,
          animation: 'slide'
        },
        familyAdaptation: pred.familyContext ? {
          childFriendly: pred.familyContext.childFriendly,
          supervisedAction: pred.familyContext.supervisedAccess,
          adaptedLanguage: this.adaptLanguageForFamily(pred.reasoning, context.familyProfile),
          safetyLevel: this.determineSafetyLevel(pred.section, context.familyProfile)
        } : undefined
      }));
  }

  private async generateActionSuggestions(
    context: SuggestionContext
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Suggestions basées sur l'inventaire
    if (context.currentInventory) {
      const expiringItems = context.currentInventory.filter(item => {
        if (!item.expiryDate) return false;
        const daysUntilExpiry = (item.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry <= 3 && daysUntilExpiry > 0;
      });

      if (expiringItems.length > 0) {
        suggestions.push({
          id: `expiry_action_${Date.now()}`,
          type: 'action',
          title: `${expiringItems.length} produits expirent bientôt`,
          description: 'Planifiez vos repas pour les utiliser',
          icon: 'AlertCircle',
          confidence: 0.9,
          priority: 'high',
          action: {
            type: 'navigate',
            target: 'kitchen',
            data: { filter: 'expiring-soon', items: expiringItems.map(i => i.name) }
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
    }

    // Suggestions basées sur l'heure
    const hour = context.timeOfDay;
    if (hour >= 17 && hour <= 20 && context.currentSection !== 'kitchen') {
      suggestions.push({
        id: `dinner_time_${Date.now()}`,
        type: 'action',
        title: 'Temps de cuisiner !',
        description: 'Découvrez des recettes pour ce soir',
        icon: 'ChefHat',
        confidence: 0.8,
        priority: 'medium',
        action: {
          type: 'navigate',
          target: 'kitchen',
          data: { filter: 'dinner', timeOfDay: 'evening' }
        },
        context: {
          trigger: 'time_based',
          reasoning: ['Heure habituelle du dîner'],
          timeRelevant: true,
          familyRelevant: true
        },
        presentation: {
          urgent: false,
          dismissible: true,
          autoHide: true,
          showDuration: 8000,
          animation: 'slide'
        }
      });
    }

    // Suggestions basées sur le budget
    if (context.budgetStatus?.percentUsed > 80) {
      suggestions.push({
        id: `budget_warning_${Date.now()}`,
        type: 'action',
        title: 'Attention au budget',
        description: `${context.budgetStatus.remaining.toFixed(2)}€ restants cette semaine`,
        icon: 'DollarSign',
        confidence: 0.85,
        priority: 'high',
        action: {
          type: 'navigate',
          target: 'kitchen',
          data: { filter: 'budget-friendly', maxCost: context.budgetStatus.remaining / 3 }
        },
        context: {
          trigger: 'budget_limit',
          reasoning: ['Budget hebdomadaire presque atteint', 'Recettes économiques recommandées'],
          timeRelevant: false,
          familyRelevant: true
        },
        presentation: {
          urgent: true,
          dismissible: true,
          autoHide: false,
          animation: 'bounce'
        }
      });
    }

    return suggestions;
  }

  private async generateDiscoverySuggestions(
    context: SuggestionContext
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Obtenir les fonctionnalités non explorées
    const disclosure = await personalizationEngine.getProgressiveFeatureDisclosure(
      context.userId,
      context.currentSection
    );

    // Suggérer de nouvelles fonctionnalités
    if (disclosure.newFeatures.length > 0 && Math.random() > 0.7) { // 30% de chance
      const feature = disclosure.newFeatures[0];
      suggestions.push({
        id: `discovery_${feature}_${Date.now()}`,
        type: 'discovery',
        title: 'Nouvelle fonctionnalité !',
        description: `Découvrez ${this.getFeatureDisplayName(feature)}`,
        icon: 'Sparkles',
        confidence: 0.6,
        priority: 'low',
        action: {
          type: 'tutorial',
          target: feature,
          data: { introMode: true }
        },
        context: {
          trigger: 'feature_discovery',
          reasoning: ['Nouvelle fonctionnalité disponible', 'Améliorer votre expérience'],
          timeRelevant: false,
          familyRelevant: this.isFeatureFamilyFriendly(feature)
        },
        presentation: {
          urgent: false,
          dismissible: true,
          autoHide: true,
          showDuration: 12000,
          animation: 'fade'
        }
      });
    }

    // Suggérer un tutoriel si l'utilisateur semble avoir des difficultés
    const userMetrics = behaviorTracker.getUserPerformanceMetrics(context.userId);
    if (userMetrics.errorRate > 0.3 && disclosure.tutorialSuggestions.length > 0) {
      const tutorial = disclosure.tutorialSuggestions[0];
      suggestions.push({
        id: `tutorial_${tutorial}_${Date.now()}`,
        type: 'discovery',
        title: 'Aide disponible',
        description: `Tutoriel pour maîtriser ${context.currentSection}`,
        icon: 'HelpCircle',
        confidence: 0.7,
        priority: 'medium',
        action: {
          type: 'tutorial',
          target: tutorial
        },
        context: {
          trigger: 'help_needed',
          reasoning: ['Taux d\'erreur élevé détecté', 'Tutoriel disponible'],
          timeRelevant: false,
          familyRelevant: true
        },
        presentation: {
          urgent: false,
          dismissible: true,
          autoHide: false,
          animation: 'pulse'
        }
      });
    }

    return suggestions;
  }

  private async generateWorkflowSuggestions(
    context: SuggestionContext
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Analyser les patterns comportementaux pour des suggestions d'optimisation
    const behaviorAnalysis = await behaviorTracker.analyzeBehaviorPatterns(context.userId);
    
    behaviorAnalysis.recommendations.forEach(rec => {
      if (rec.type === 'workflow_optimization') {
        suggestions.push({
          id: `workflow_${Date.now()}`,
          type: 'workflow',
          title: 'Raccourci découvert',
          description: rec.description,
          icon: 'Zap',
          confidence: rec.impact,
          priority: rec.impact > 0.7 ? 'high' : 'medium',
          action: {
            type: 'prompt',
            target: 'create_shortcut',
            data: { workflow: rec.type }
          },
          context: {
            trigger: 'workflow_optimization',
            reasoning: ['Pattern récurrent détecté', 'Optimisation possible'],
            timeRelevant: false,
            familyRelevant: rec.familyRelevant
          },
          presentation: {
            urgent: false,
            dismissible: true,
            autoHide: true,
            showDuration: 15000,
            animation: 'slide'
          }
        });
      }
    });

    return suggestions;
  }

  private async generateFamilySuggestions(
    context: SuggestionContext
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];
    const familyProfile = context.familyProfile!;

    // Suggestions pour les enfants
    if (familyProfile.type === 'child') {
      // Encourager l'exploration en sécurité
      if (context.currentSection === 'kitchen') {
        suggestions.push({
          id: `child_cooking_${Date.now()}`,
          type: 'family',
          title: 'Recettes amusantes !',
          description: 'Découvre des recettes faciles à faire',
          icon: 'Star',
          confidence: 0.8,
          priority: 'medium',
          action: {
            type: 'navigate',
            target: 'kitchen',
            data: { filter: 'child-friendly', difficulty: 'easy' }
          },
          context: {
            trigger: 'child_engagement',
            reasoning: ['Recettes adaptées aux enfants'],
            timeRelevant: false,
            familyRelevant: true
          },
          presentation: {
            urgent: false,
            dismissible: true,
            autoHide: true,
            showDuration: 10000,
            animation: 'bounce'
          },
          familyAdaptation: {
            childFriendly: true,
            supervisedAction: true,
            adaptedLanguage: 'Découvre des recettes rigolotes à faire !',
            safetyLevel: 'safe'
          }
        });
      }
    }

    // Suggestions pour les parents
    if (familyProfile.type === 'parent') {
      // Coordination famille
      const hour = context.timeOfDay;
      if (hour >= 15 && hour <= 17) { // Après-midi
        suggestions.push({
          id: `family_planning_${Date.now()}`,
          type: 'family',
          title: 'Planification famille',
          description: 'Préparer les repas avec les enfants',
          icon: 'Users',
          confidence: 0.7,
          priority: 'medium',
          action: {
            type: 'navigate',
            target: 'kitchen',
            data: { mode: 'family_planning', includeChildren: true }
          },
          context: {
            trigger: 'family_coordination',
            reasoning: ['Moment idéal pour impliquer la famille'],
            timeRelevant: true,
            familyRelevant: true
          },
          presentation: {
            urgent: false,
            dismissible: true,
            autoHide: true,
            showDuration: 12000,
            animation: 'slide'
          },
          familyAdaptation: {
            childFriendly: true,
            supervisedAction: false,
            adaptedLanguage: 'Préparer les repas en famille',
            safetyLevel: 'safe'
          }
        });
      }
    }

    return suggestions;
  }

  private async filterAndPrioritize(
    userId: string,
    suggestions: SmartSuggestion[]
  ): Promise<SmartSuggestion[]> {
    // Filtrer les suggestions récemment dismissées
    const dismissed = this.dismissedSuggestions.get(userId) || new Set();
    const filtered = suggestions.filter(s => !dismissed.has(s.id));

    // Vérifier le cooldown
    const now = Date.now();
    const recentHistory = (this.suggestionHistory.get(userId) || [])
      .filter(h => {
        const shownTime = h.shown instanceof Date ? h.shown.getTime() : new Date(h.shown).getTime();
        return now - shownTime < this.cooldownPeriod;
      });

    const recentTypes = new Set(recentHistory.map(h => {
      const suggestion = this.findSuggestionById(userId, h.suggestionId);
      return suggestion?.type;
    }));

    const cooledDown = filtered.filter(s => !recentTypes.has(s.type));

    // Prioriser par confiance et priorité
    return cooledDown
      .sort((a, b) => {
        // Priorité d'abord
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
        
        if (priorityDiff !== 0) return priorityDiff;
        
        // Puis confiance
        return b.confidence - a.confidence;
      })
      .slice(0, this.maxSuggestionsPerUser);
  }

  private adaptSuggestionsForFamily(
    suggestions: SmartSuggestion[],
    familyProfile: FamilyProfile
  ): SmartSuggestion[] {
    return suggestions.map(suggestion => {
      if (!suggestion.familyAdaptation && familyProfile.type === 'child') {
        // Adapter automatiquement pour les enfants
        suggestion.familyAdaptation = {
          childFriendly: true,
          supervisedAction: this.requiresSupervision(suggestion.action.target),
          adaptedLanguage: this.adaptLanguageForFamily(suggestion.description, familyProfile),
          safetyLevel: this.determineSafetyLevel(suggestion.action.target, familyProfile)
        };
        
        // Adapter la présentation
        suggestion.presentation.animation = 'bounce';
        suggestion.presentation.showDuration = (suggestion.presentation.showDuration || 5000) + 3000;
      }

      return suggestion;
    });
  }

  // === MÉTHODES UTILITAIRES ===

  private getWeatherImpact(weather?: SuggestionContext['weatherContext']): 'low' | 'medium' | 'high' {
    if (!weather) return 'low';
    
    if (weather.temperature < 5 || weather.temperature > 35) return 'high';
    if (weather.condition === 'rainy' || weather.condition === 'stormy') return 'medium';
    
    return 'low';
  }

  private getSectionDisplayName(section: NavigationSection): string {
    const names: Record<NavigationSection, string> = {
      pantry: 'Garde-manger',
      kitchen: 'Cuisine',
      shopping: 'Courses',
      assistant: 'Assistant',
      insights: 'Insights',
      games: 'Jeux',
      settings: 'Paramètres',
      social: 'Social'
    };
    return names[section] || section;
  }

  private getSectionIcon(section: NavigationSection): string {
    const icons: Record<NavigationSection, string> = {
      pantry: 'Package',
      kitchen: 'ChefHat',
      shopping: 'ShoppingCart',
      assistant: 'MessageCircle',
      insights: 'TrendingUp',
      games: 'Gamepad2',
      settings: 'Settings',
      social: 'Users'
    };
    return icons[section] || 'Circle';
  }

  private getFeatureDisplayName(feature: string): string {
    const names: Record<string, string> = {
      voice_commands: 'Commandes vocales',
      ai_nutrition: 'IA nutritionnelle',
      smart_planning: 'Planification intelligente',
      family_coordination: 'Coordination famille',
      predictive_shopping: 'Courses prédictives',
      waste_tracking: 'Suivi du gaspillage',
      social_sharing: 'Partage social',
      meal_automation: 'Automatisation des repas'
    };
    return names[feature] || feature;
  }

  private isFeatureFamilyFriendly(feature: string): boolean {
    const familyFeatures = [
      'family_coordination', 'meal_automation', 'smart_planning',
      'waste_tracking', 'voice_commands'
    ];
    return familyFeatures.includes(feature);
  }

  private adaptLanguageForFamily(text: string, familyProfile?: FamilyProfile): string {
    if (!familyProfile || familyProfile.type !== 'child') return text;

    // Simplifier le langage pour les enfants
    return text
      .replace('Optimisation', 'Amélioration')
      .replace('Efficacité', 'Facilité')
      .replace('Algorithme', 'Intelligence')
      .replace('Prédiction', 'Suggestion')
      .replace('Analyser', 'Regarder')
      .replace('Configurer', 'Préparer');
  }

  private determineSafetyLevel(
    target: string,
    familyProfile?: FamilyProfile
  ): 'safe' | 'caution' | 'restricted' {
    if (!familyProfile || familyProfile.type !== 'child') return 'safe';

    // Zones sensibles pour les enfants
    const restrictedAreas = ['settings', 'privacy', 'payments', 'sharing'];
    if (restrictedAreas.some(area => target.includes(area))) return 'restricted';

    const cautionAreas = ['shopping', 'social', 'external'];
    if (cautionAreas.some(area => target.includes(area))) return 'caution';

    return 'safe';
  }

  private requiresSupervision(target: string): boolean {
    const supervisionRequired = ['shopping', 'sharing', 'social', 'external_link'];
    return supervisionRequired.some(area => target.includes(area));
  }

  private findSuggestionById(userId: string, suggestionId: string): SmartSuggestion | null {
    const userSuggestions = this.activeSuggestions.get(userId) || [];
    return userSuggestions.find(s => s.id === suggestionId) || null;
  }

  private async learnFromSuggestionFeedback(
    userId: string,
    suggestionId: string,
    action: 'accept' | 'dismiss' | 'postpone',
    analytics?: SuggestionAnalytics
  ): Promise<void> {
    try {
      // Enregistrer dans Cipher pour l'apprentissage
      await cipherContextIntegration.recordContextualExperience(
        userId,
        {}, // Context vide pour cette utilisation
        [],
        {
          accepted: action === 'accept',
          satisfaction: action === 'accept' ? 4 : (action === 'postpone' ? 3 : 2)
        }
      );

      // Ajuster les algorithmes si nécessaire
      if (action === 'dismiss' && analytics) {
        const suggestion = this.findSuggestionById(userId, suggestionId);
        if (suggestion && analytics.timeToAction && analytics.timeToAction < 2000) {
          // Dismiss rapide = suggestion non pertinente
          await this.adjustSuggestionAlgorithm(suggestion.type, -0.1);
        }
      }
    } catch (error) {
      console.error('Failed to learn from suggestion feedback:', error);
    }
  }

  private async adjustSuggestionAlgorithm(type: string, adjustment: number): Promise<void> {
    // Ajustement des algorithmes basé sur le feedback
    // En production, cela ajusterait les poids du modèle ML
    console.log(`Adjusting ${type} suggestion algorithm by ${adjustment}`);
  }

  private initializeSuggestions(): void {
    // Charger les suggestions actives depuis le cache
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem('smart_suggestions');
        if (cached) {
          const data = JSON.parse(cached);
          this.activeSuggestions = new Map(data.active);
          
          // Restaurer l'historique en convertissant les strings en dates
          const historyEntries = data.history || [];
          this.suggestionHistory = new Map(
            historyEntries.map(([userId, analytics]: [string, SuggestionAnalytics[]]) => [
              userId,
              analytics.map((a: any) => ({
                ...a,
                shown: new Date(a.shown),
                clicked: a.clicked ? new Date(a.clicked) : undefined,
                dismissed: a.dismissed ? new Date(a.dismissed) : undefined
              }))
            ])
          );
        }
      } catch (error) {
        console.warn('Failed to load suggestions from cache:', error);
      }
    }
  }

  /**
   * Sauvegarde périodique des données
   */
  async saveToCache(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      try {
        const data = {
          active: Array.from(this.activeSuggestions.entries()),
          history: Array.from(this.suggestionHistory.entries()),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('smart_suggestions', JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save suggestions to cache:', error);
      }
    }
  }
}

// Export singleton
export const smartSuggestions = new SmartSuggestions();

// Sauvegarder automatiquement toutes les 2 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    smartSuggestions.saveToCache();
  }, 2 * 60 * 1000);
}