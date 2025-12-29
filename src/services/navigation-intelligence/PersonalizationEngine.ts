/**
 * PersonalizationEngine - Moteur de personnalisation adaptatif
 * Implémente PRP-040.3 - Personnalisation adaptative basée sur l'apprentissage
 */

import { cipherMemory } from '@/services/cipher/CipherMemoryService';
import { NavigationSection, FamilyProfile } from '@/types/family-mode';

export interface UserPersonalization {
  userId: string;
  preferences: {
    favoriteFeatures: string[];
    quickAccessItems: NavigationSection[];
    defaultHomePage: NavigationSection;
    notificationFrequency: 'minimal' | 'balanced' | 'proactive';
    explorationTendency: number; // 0-1: conservateur vs explorateur
  };
  adaptations: {
    menuLayout: 'standard' | 'simplified' | 'advanced';
    informationDensity: 'compact' | 'comfortable' | 'spacious';
    actionPrompts: boolean;
    contextualHints: boolean;
    predictiveNavigation: boolean;
  };
  learningProgress: {
    expertiseLevel: Record<NavigationSection, number>; // 0-1
    featureDiscovery: string[];
    completedTutorials: string[];
    customizations: Map<string, any>;
  };
  familyPersonalization?: {
    role: 'parent' | 'child';
    supervisionLevel: 'high' | 'medium' | 'low';
    adaptedInterface: boolean;
    safetyRestrictionsActive: boolean;
  };
}

export interface PersonalizationRecommendation {
  type: 'shortcut' | 'feature' | 'layout' | 'workflow' | 'tutorial';
  title: string;
  description: string;
  actionText: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  familyAppropriate?: boolean;
  estimatedImpact: {
    timeReduction?: number;
    efficiencyGain?: number;
    discoveryPotential?: number;
  };
}

export interface SmartDefaults {
  homepage: NavigationSection;
  quickActions: string[];
  preferredShortcuts: Array<{ action: string; trigger: string }>;
  contextualShortcuts: Map<string, string[]>; // contexte -> raccourcis
  notifications: {
    enabled: boolean;
    types: string[];
    timing: 'immediate' | 'batch' | 'scheduled';
  };
}

export class PersonalizationEngine {
  private userPersonalizations: Map<string, UserPersonalization> = new Map();
  private defaultPreferences: UserPersonalization['preferences'] = {
    favoriteFeatures: [],
    quickAccessItems: ['pantry', 'kitchen', 'shopping'],
    defaultHomePage: 'pantry',
    notificationFrequency: 'balanced',
    explorationTendency: 0.5
  };

  constructor() {
    this.initializeEngine();
  }

  /**
   * Obtient ou crée la personnalisation pour un utilisateur
   */
  async getUserPersonalization(userId: string): Promise<UserPersonalization> {
    if (!this.userPersonalizations.has(userId)) {
      await this.loadUserPersonalization(userId);
    }
    
    return this.userPersonalizations.get(userId) || this.createDefaultPersonalization(userId);
  }

  /**
   * Met à jour les préférences utilisateur basées sur le comportement
   */
  async updateFromBehavior(
    userId: string,
    behaviorData: {
      mostUsedFeatures: Array<{ feature: string; usage: number }>;
      navigationPatterns: Array<{ from: string; to: string; frequency: number }>;
      timeSpentPerSection: Record<NavigationSection, number>;
      errorPatterns: string[];
      discoveredFeatures: string[];
      familyInteractions?: Array<{ member: string; action: string; context: any }>;
    }
  ): Promise<void> {
    const personalization = await this.getUserPersonalization(userId);

    // Mettre à jour les fonctionnalités favorites
    personalization.preferences.favoriteFeatures = behaviorData.mostUsedFeatures
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10)
      .map(f => f.feature);

    // Adapter les accès rapides selon l'utilisation
    const sectionUsage = Object.entries(behaviorData.timeSpentPerSection)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([section]) => section as NavigationSection);

    personalization.preferences.quickAccessItems = sectionUsage;

    // Ajuster la tendance d'exploration
    const discoveryRate = behaviorData.discoveredFeatures.length / 30; // Sur 30 jours
    personalization.preferences.explorationTendency = Math.min(1.0, 
      personalization.preferences.explorationTendency * 0.8 + discoveryRate * 0.2
    );

    // Mettre à jour le niveau d'expertise
    Object.entries(behaviorData.timeSpentPerSection).forEach(([section, time]) => {
      const currentLevel = personalization.learningProgress.expertiseLevel[section as NavigationSection] || 0;
      const timeScore = Math.min(1.0, time / 3600); // 1h = expertise max pour une session
      personalization.learningProgress.expertiseLevel[section as NavigationSection] = 
        Math.min(1.0, currentLevel + timeScore * 0.1);
    });

    // Traiter les interactions famille si disponibles
    if (behaviorData.familyInteractions && personalization.familyPersonalization) {
      await this.updateFamilyPersonalization(userId, behaviorData.familyInteractions);
    }

    // Sauvegarder et intégrer avec Cipher
    this.userPersonalizations.set(userId, personalization);
    await this.integrateCipherLearning(userId, behaviorData);
  }

  /**
   * Génère des valeurs par défaut intelligentes
   */
  async generateSmartDefaults(userId: string, familyProfile?: FamilyProfile): Promise<SmartDefaults> {
    const personalization = await this.getUserPersonalization(userId);
    const hour = new Date().getHours();

    let homepage: NavigationSection = personalization.preferences.defaultHomePage;
    
    // Adapter la page d'accueil selon le contexte
    if (hour >= 17 && hour <= 21) { // Heure du dîner
      homepage = 'kitchen';
    } else if (hour >= 10 && hour <= 12) { // Milieu de matinée
      homepage = 'shopping';
    }

    // Actions rapides contextuelles
    const quickActions = this.generateContextualQuickActions(personalization, hour);

    // Raccourcis préférés
    const preferredShortcuts = this.generatePreferredShortcuts(personalization);

    // Raccourcis contextuels
    const contextualShortcuts = new Map([
      ['morning', ['check_expiring', 'plan_breakfast', 'review_shopping_list']],
      ['afternoon', ['check_recipe', 'add_to_shopping', 'quick_scan']],
      ['evening', ['start_cooking', 'check_dinner_plan', 'scan_leftovers']],
      ['weekend', ['meal_prep', 'explore_recipes', 'family_planning']]
    ]);

    // Notifications adaptées
    const notifications = {
      enabled: personalization.preferences.notificationFrequency !== 'minimal',
      types: this.getAdaptedNotificationTypes(personalization, familyProfile),
      timing: this.getOptimalNotificationTiming(personalization)
    };

    // Adapter pour famille si nécessaire
    if (familyProfile) {
      return this.adaptDefaultsForFamily({
        homepage,
        quickActions,
        preferredShortcuts,
        contextualShortcuts,
        notifications
      }, familyProfile);
    }

    return {
      homepage,
      quickActions,
      preferredShortcuts,
      contextualShortcuts,
      notifications
    };
  }

  /**
   * Révèle progressivement les fonctionnalités selon l'expertise
   */
  async getProgressiveFeatureDisclosure(
    userId: string,
    currentSection: NavigationSection
  ): Promise<{
    newFeatures: string[];
    advancedOptions: string[];
    hiddenFeatures: string[];
    tutorialSuggestions: string[];
  }> {
    const personalization = await this.getUserPersonalization(userId);
    const expertiseLevel = personalization.learningProgress.expertiseLevel[currentSection] || 0;
    
    // Révélation progressive selon le niveau
    let newFeatures: string[] = [];
    let advancedOptions: string[] = [];
    let hiddenFeatures: string[] = [];
    let tutorialSuggestions: string[] = [];

    if (expertiseLevel < 0.3) {
      // Débutant - fonctionnalités de base
      newFeatures = this.getBeginnerFeatures(currentSection);
      tutorialSuggestions = this.getBeginnerTutorials(currentSection);
      hiddenFeatures = this.getAdvancedFeatures(currentSection);
    } else if (expertiseLevel < 0.7) {
      // Intermédiaire - fonctionnalités avancées
      newFeatures = this.getIntermediateFeatures(currentSection);
      advancedOptions = this.getAdvancedOptions(currentSection);
      tutorialSuggestions = this.getIntermediateTutorials(currentSection);
    } else {
      // Expert - toutes les fonctionnalités
      advancedOptions = this.getAllAdvancedFeatures(currentSection);
      tutorialSuggestions = this.getExpertTips(currentSection);
    }

    return {
      newFeatures,
      advancedOptions,
      hiddenFeatures,
      tutorialSuggestions
    };
  }

  /**
   * Apprend automatiquement des préférences utilisateur
   */
  async learnUserPreferences(
    userId: string,
    interactions: Array<{
      feature: string;
      action: string;
      success: boolean;
      timeToComplete: number;
      context: any;
    }>
  ): Promise<void> {
    const personalization = await this.getUserPersonalization(userId);
    
    // Analyser les patterns de succès
    const successfulInteractions = interactions.filter(i => i.success);
    const failedInteractions = interactions.filter(i => !i.success);

    // Mettre à jour les préférences basées sur le succès
    successfulInteractions.forEach(interaction => {
      if (!personalization.preferences.favoriteFeatures.includes(interaction.feature)) {
        personalization.preferences.favoriteFeatures.push(interaction.feature);
      }
    });

    // Ajuster la fréquence de notifications selon les réactions
    const notificationInteractions = interactions.filter(i => i.action.includes('notification'));
    const notificationSuccess = notificationInteractions.filter(i => i.success).length;
    const notificationTotal = notificationInteractions.length;

    if (notificationTotal > 10) {
      const successRate = notificationSuccess / notificationTotal;
      
      if (successRate < 0.3) {
        personalization.preferences.notificationFrequency = 'minimal';
      } else if (successRate > 0.7) {
        personalization.preferences.notificationFrequency = 'proactive';
      }
    }

    // Sauvegarder
    this.userPersonalizations.set(userId, personalization);
    await this.saveUserPersonalization(userId, personalization);
  }

  /**
   * Génère des recommandations de personnalisation
   */
  async getPersonalizationRecommendations(
    userId: string,
    familyProfile?: FamilyProfile
  ): Promise<PersonalizationRecommendation[]> {
    const personalization = await this.getUserPersonalization(userId);
    const recommendations: PersonalizationRecommendation[] = [];

    // Recommandation de raccourci
    if (personalization.preferences.favoriteFeatures.length >= 3) {
      const topFeatures = personalization.preferences.favoriteFeatures.slice(0, 3);
      recommendations.push({
        type: 'shortcut',
        title: 'Raccourcis personnalisés',
        description: `Créer des raccourcis pour vos ${topFeatures.length} fonctionnalités préférées`,
        actionText: 'Créer des raccourcis',
        confidence: 0.8,
        priority: 'high',
        familyAppropriate: true,
        estimatedImpact: { timeReduction: 15, efficiencyGain: 0.3 }
      });
    }

    // Recommandation d'expertise
    const lowExpertise = Object.entries(personalization.learningProgress.expertiseLevel)
      .filter(([_, level]) => level < 0.3)
      .map(([section]) => section);

    if (lowExpertise.length > 0 && lowExpertise.length <= 2) {
      recommendations.push({
        type: 'tutorial',
        title: 'Découverte guidée',
        description: `Améliorer votre maîtrise de ${lowExpertise[0]}`,
        actionText: 'Commencer le tutoriel',
        confidence: 0.7,
        priority: 'medium',
        familyAppropriate: true,
        estimatedImpact: { efficiencyGain: 0.4, discoveryPotential: 0.8 }
      });
    }

    // Recommandation d'exploration
    if (personalization.preferences.explorationTendency > 0.6) {
      const newFeatures = this.getUnexploredFeatures(personalization);
      if (newFeatures.length > 0) {
        recommendations.push({
          type: 'feature',
          title: 'Nouvelles fonctionnalités',
          description: `${newFeatures.length} nouvelles fonctionnalités à découvrir`,
          actionText: 'Explorer',
          confidence: 0.6,
          priority: 'low',
          familyAppropriate: false,
          estimatedImpact: { discoveryPotential: 0.9 }
        });
      }
    }

    // Adapter pour famille si nécessaire
    if (familyProfile) {
      return this.adaptRecommendationsForFamily(recommendations, familyProfile);
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Configure les valeurs par défaut intelligentes
   */
  async configureSmartDefaults(userId: string, familyProfile?: FamilyProfile): Promise<void> {
    const defaults = await this.generateSmartDefaults(userId, familyProfile);
    const personalization = await this.getUserPersonalization(userId);

    // Appliquer les nouveaux défauts
    personalization.preferences.defaultHomePage = defaults.homepage;
    personalization.preferences.quickAccessItems = defaults.quickActions.slice(0, 3) as NavigationSection[];

    // Configurer les adaptations d'interface
    if (familyProfile?.type === 'child') {
      personalization.adaptations.menuLayout = 'simplified';
      personalization.adaptations.informationDensity = 'spacious';
      personalization.adaptations.actionPrompts = true;
      personalization.adaptations.contextualHints = true;
    }

    this.userPersonalizations.set(userId, personalization);
    await this.saveUserPersonalization(userId, personalization);
  }

  // === MÉTHODES PRIVÉES ===

  private async initializeEngine(): Promise<void> {
    try {
      // Charger les personnalisations depuis le cache
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem('user_personalizations');
        if (cached) {
          const data = JSON.parse(cached);
          this.userPersonalizations = new Map(data);
        }
      }
    } catch (error) {
      console.warn('Failed to load personalizations from cache:', error);
    }
  }

  private async loadUserPersonalization(userId: string): Promise<void> {
    try {
      // Essayer de charger depuis Cipher d'abord
      // const cipherPersonalization = await cipherMemory.getUserPersonalization(userId);
      
      // if (cipherPersonalization) {
      //   this.userPersonalizations.set(userId, cipherPersonalization);
      //   return;
      // }
    } catch (error) {
      console.warn('Failed to load from Cipher, creating default:', error);
    }

    // Créer une personnalisation par défaut
    const defaultPersonalization = this.createDefaultPersonalization(userId);
    this.userPersonalizations.set(userId, defaultPersonalization);
  }

  private createDefaultPersonalization(userId: string): UserPersonalization {
    return {
      userId,
      preferences: { ...this.defaultPreferences },
      adaptations: {
        menuLayout: 'standard',
        informationDensity: 'comfortable',
        actionPrompts: false,
        contextualHints: true,
        predictiveNavigation: true
      },
      learningProgress: {
        expertiseLevel: {
          pantry: 0,
          kitchen: 0,
          shopping: 0,
          assistant: 0,
          insights: 0,
          games: 0,
          settings: 0,
          social: 0
        },
        featureDiscovery: [],
        completedTutorials: [],
        customizations: new Map()
      }
    };
  }

  private generateContextualQuickActions(
    personalization: UserPersonalization,
    hour: number
  ): string[] {
    const baseActions = ['quick_scan', 'voice_input', 'ai_assistant'];
    
    // Actions contextuelles selon l'heure
    if (hour >= 6 && hour <= 10) {
      baseActions.push('check_breakfast', 'expiry_check');
    } else if (hour >= 17 && hour <= 21) {
      baseActions.push('dinner_recipes', 'shopping_check');
    } else if (hour >= 10 && hour <= 16) {
      baseActions.push('meal_planning', 'grocery_optimization');
    }

    // Adapter selon les préférences
    const favoriteActions = personalization.preferences.favoriteFeatures
      .filter(f => f.includes('action'))
      .slice(0, 3);

    return [...new Set([...baseActions, ...favoriteActions])].slice(0, 6);
  }

  private generatePreferredShortcuts(
    personalization: UserPersonalization
  ): Array<{ action: string; trigger: string }> {
    return [
      { action: 'quick_scan', trigger: 'Ctrl+Shift+S' },
      { action: 'voice_input', trigger: 'Ctrl+Shift+V' },
      { action: 'ai_assistant', trigger: 'Ctrl+Shift+A' },
      { action: 'shopping_list', trigger: 'Ctrl+Shift+L' }
    ];
  }

  private getAdaptedNotificationTypes(
    personalization: UserPersonalization,
    familyProfile?: FamilyProfile
  ): string[] {
    const baseTypes = ['meal_reminders', 'expiry_alerts', 'planning_suggestions'];
    
    if (personalization.preferences.notificationFrequency === 'proactive') {
      baseTypes.push('discovery_tips', 'optimization_opportunities');
    }

    if (familyProfile?.type === 'parent') {
      baseTypes.push('family_coordination', 'child_activity_summary');
    }

    return baseTypes;
  }

  private getOptimalNotificationTiming(
    personalization: UserPersonalization
  ): 'immediate' | 'batch' | 'scheduled' {
    if (personalization.preferences.notificationFrequency === 'minimal') {
      return 'batch';
    } else if (personalization.preferences.explorationTendency > 0.7) {
      return 'immediate';
    }
    return 'scheduled';
  }

  private adaptDefaultsForFamily(
    defaults: SmartDefaults,
    familyProfile: FamilyProfile
  ): SmartDefaults {
    if (familyProfile.type === 'child') {
      // Interface simplifiée pour enfants
      defaults.quickActions = defaults.quickActions
        .filter(action => !action.includes('budget') && !action.includes('advanced'))
        .concat(['fun_recipes', 'easy_cooking', 'help_parent']);
      
      defaults.notifications.types = defaults.notifications.types
        .filter(type => ['meal_reminders', 'cooking_time'].includes(type));
    }

    return defaults;
  }

  private adaptRecommendationsForFamily(
    recommendations: PersonalizationRecommendation[],
    familyProfile: FamilyProfile
  ): PersonalizationRecommendation[] {
    return recommendations
      .filter(rec => rec.familyAppropriate !== false)
      .map(rec => {
        if (familyProfile.type === 'child') {
          // Adapter le langage pour les enfants
          rec.title = rec.title.replace('Optimisation', 'Amélioration');
          rec.description = rec.description.replace('efficacité', 'facilité');
        }
        return rec;
      });
  }

  private getBeginnerFeatures(section: NavigationSection): string[] {
    const features = {
      pantry: ['basic_inventory', 'expiry_alerts', 'simple_search'],
      kitchen: ['recipe_browser', 'basic_cooking', 'timer_help'],
      shopping: ['list_creation', 'item_adding', 'price_check'],
      assistant: ['basic_questions', 'recipe_help', 'simple_commands'],
      insights: ['basic_stats', 'simple_charts', 'progress_overview'],
      games: ['cooking_quiz', 'ingredient_match', 'recipe_puzzle']
    };
    
    return features[section] || [];
  }

  private getIntermediateFeatures(section: NavigationSection): string[] {
    const features = {
      pantry: ['smart_organization', 'batch_scanning', 'category_management'],
      kitchen: ['meal_planning', 'recipe_customization', 'nutrition_tracking'],
      shopping: ['smart_lists', 'store_optimization', 'price_comparison'],
      assistant: ['advanced_queries', 'context_awareness', 'proactive_suggestions'],
      insights: ['detailed_analytics', 'trend_analysis', 'predictive_insights'],
      games: ['cooking_challenges', 'family_competitions', 'skill_building']
    };
    
    return features[section] || [];
  }

  private getAllAdvancedFeatures(section: NavigationSection): string[] {
    const features = {
      pantry: ['ai_organization', 'predictive_restocking', 'waste_prevention'],
      kitchen: ['ai_recipe_generation', 'nutritional_optimization', 'meal_automation'],
      shopping: ['ai_shopping_assistant', 'budget_optimization', 'store_routing'],
      assistant: ['complex_planning', 'multi_step_tasks', 'family_coordination'],
      insights: ['ai_insights', 'predictive_analytics', 'business_intelligence'],
      games: ['advanced_challenges', 'community_features', 'achievement_system']
    };
    
    return features[section] || [];
  }

  private getBeginnerTutorials(section: NavigationSection): string[] {
    return [`${section}_basics`, `${section}_quick_start`];
  }

  private getIntermediateTutorials(section: NavigationSection): string[] {
    return [`${section}_optimization`, `${section}_advanced_features`];
  }

  private getExpertTips(section: NavigationSection): string[] {
    return [`${section}_power_user`, `${section}_automation`, `${section}_customization`];
  }

  private getAdvancedFeatures(section: NavigationSection): string[] {
    // Fonctionnalités à cacher pour les débutants
    return this.getAllAdvancedFeatures(section);
  }

  private getAdvancedOptions(section: NavigationSection): string[] {
    // Options avancées disponibles pour les utilisateurs intermédiaires
    return this.getIntermediateFeatures(section);
  }

  private getUnexploredFeatures(personalization: UserPersonalization): string[] {
    const allFeatures = [
      'voice_commands', 'ai_nutrition', 'smart_planning', 'family_coordination',
      'predictive_shopping', 'waste_tracking', 'social_sharing', 'meal_automation'
    ];
    
    return allFeatures.filter(feature => 
      !personalization.learningProgress.featureDiscovery.includes(feature)
    );
  }

  private async updateFamilyPersonalization(
    userId: string,
    familyInteractions: Array<{ member: string; action: string; context: any }>
  ): Promise<void> {
    const personalization = await this.getUserPersonalization(userId);
    
    if (!personalization.familyPersonalization) {
      personalization.familyPersonalization = {
        role: 'parent',
        supervisionLevel: 'medium',
        adaptedInterface: false,
        safetyRestrictionsActive: true
      };
    }

    // Analyser les interactions famille
    const childInteractions = familyInteractions.filter(i => i.context?.userType === 'child');
    const parentInteractions = familyInteractions.filter(i => i.context?.userType === 'parent');

    // Ajuster le niveau de supervision
    if (childInteractions.length > 0) {
      const successRate = childInteractions.filter(i => i.context?.success).length / childInteractions.length;
      
      if (successRate > 0.8) {
        // Enfant se débrouille bien, réduire la supervision
        personalization.familyPersonalization.supervisionLevel = 'low';
      } else if (successRate < 0.5) {
        // Enfant a des difficultés, augmenter la supervision
        personalization.familyPersonalization.supervisionLevel = 'high';
      }
    }

    // Activer l'interface adaptée si beaucoup d'interactions famille
    if (familyInteractions.length > 20) {
      personalization.familyPersonalization.adaptedInterface = true;
    }
  }

  private async integrateCipherLearning(
    userId: string,
    behaviorData: any
  ): Promise<void> {
    try {
      // await cipherMemory.recordPersonalizationData(userId, {
      //   behaviorPatterns: behaviorData,
      //   preferences: this.userPersonalizations.get(userId)?.preferences,
      //   adaptations: this.userPersonalizations.get(userId)?.adaptations,
      //   timestamp: new Date()
      // });
    } catch (error) {
      console.warn('Failed to integrate with Cipher learning:', error);
    }
  }

  private async saveUserPersonalization(
    userId: string,
    personalization: UserPersonalization
  ): Promise<void> {
    try {
      // Sauvegarder dans le cache local
      if (typeof localStorage !== 'undefined') {
        const allPersonalizations = Array.from(this.userPersonalizations.entries());
        localStorage.setItem('user_personalizations', JSON.stringify(allPersonalizations));
      }

      // Enregistrer dans Cipher pour la persistence
      // await cipherMemory.updateUserPersonalization(userId, personalization);
    } catch (error) {
      console.warn('Failed to save personalization:', error);
    }
  }
}

// Export singleton
export const personalizationEngine = new PersonalizationEngine();