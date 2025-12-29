/**
 * FamilyContextualIntelligence - Intelligence contextuelle adaptée aux familles
 * Intègre le mode famille avec l'intelligence contextuelle PRP-040.3
 */

import { FamilyProfile, NavigationSection } from '@/types/family-mode';
import { contextAnalyzer, ContextData } from './ContextAnalyzer';
import { personalizationEngine } from './PersonalizationEngine';
import { smartSuggestions, SmartSuggestion, SuggestionContext } from './SmartSuggestions';
import { behaviorTracker } from './BehaviorTracker';
import { cipherContextIntegration } from '@/services/context/CipherContextIntegration';
import { cipherMemory } from '@/services/cipher/CipherMemoryService';

export interface FamilyContextualState {
  familyId: string;
  activeMembers: FamilyProfile[];
  currentPrimaryUser: FamilyProfile;
  supervisionMode: {
    active: boolean;
    level: 'high' | 'medium' | 'low';
    restrictedSections: NavigationSection[];
    timeRestrictions?: {
      allowedHours: { start: number; end: number };
      maxSessionDuration: number; // minutes
    };
  };
  sharedContext: {
    familyMealPreferences: string[];
    commonAllergies: string[];
    familyBudget: number;
    sharedInventory: boolean;
    coordinatedPlanning: boolean;
  };
  adaptiveInterface: {
    childModeActive: boolean;
    simplifiedNavigation: boolean;
    increasedFontSize: boolean;
    audioAssistance: boolean;
    visualCues: boolean;
  };
}

export interface FamilyContextualRecommendation {
  id: string;
  familyContext: {
    targetMember: string; // ID du membre famille
    requiresApproval: boolean;
    affectsWholeFamilt: boolean;
    childSafe: boolean;
  };
  suggestion: SmartSuggestion;
  consensusRequired: boolean;
  alternativeOptions?: SmartSuggestion[];
}

export interface FamilyCoordinationEvent {
  type: 'profile_switch' | 'supervision_request' | 'child_blocked' | 'family_vote' | 'consensus_reached';
  timestamp: Date;
  involvedMembers: string[];
  data: any;
  resolution?: {
    approved: boolean;
    byWhom: string;
    alternatives: any[];
  };
}

export class FamilyContextualIntelligence {
  private familyStates: Map<string, FamilyContextualState> = new Map();
  private familyRecommendations: Map<string, FamilyContextualRecommendation[]> = new Map();
  private coordinationEvents: Map<string, FamilyCoordinationEvent[]> = new Map();

  constructor() {
    this.initializeFamilyIntelligence();
  }

  /**
   * Active l'intelligence contextuelle pour une famille
   */
  async activateFamilyIntelligence(
    familyId: string,
    familyMembers: FamilyProfile[],
    primaryUser: FamilyProfile,
    config: {
      supervisionLevel: 'high' | 'medium' | 'low';
      sharedInventory: boolean;
      coordinatedPlanning: boolean;
      childTimeRestrictions?: {
        allowedHours: { start: number; end: number };
        maxSessionDuration: number;
      };
    }
  ): Promise<FamilyContextualState> {
    const familyState: FamilyContextualState = {
      familyId,
      activeMembers: familyMembers,
      currentPrimaryUser: primaryUser,
      supervisionMode: {
        active: config.supervisionLevel !== 'low',
        level: config.supervisionLevel,
        restrictedSections: this.getRestrictedSections(config.supervisionLevel),
        timeRestrictions: config.childTimeRestrictions
      },
      sharedContext: {
        familyMealPreferences: await this.aggregateFamilyPreferences(familyMembers),
        commonAllergies: this.identifyCommonAllergies(familyMembers),
        familyBudget: await this.calculateFamilyBudget(familyId),
        sharedInventory: config.sharedInventory,
        coordinatedPlanning: config.coordinatedPlanning
      },
      adaptiveInterface: {
        childModeActive: familyMembers.some(m => m.type === 'child'),
        simplifiedNavigation: config.supervisionLevel === 'high',
        increasedFontSize: familyMembers.some(m => m.age < 10),
        audioAssistance: familyMembers.some(m => m.age < 8),
        visualCues: true
      }
    };

    this.familyStates.set(familyId, familyState);
    
    // Intégrer avec Cipher
    await this.integrateFamilyStateWithCipher(familyId, familyState);

    return familyState;
  }

  /**
   * Génère des suggestions contextuelles pour toute la famille
   */
  async generateFamilyContextualSuggestions(
    familyId: string,
    currentSection: NavigationSection,
    activeProfile: FamilyProfile
  ): Promise<FamilyContextualRecommendation[]> {
    const familyState = this.familyStates.get(familyId);
    if (!familyState) {
      throw new Error(`Family state not found for family: ${familyId}`);
    }

    // Analyser le contexte avec données famille
    const baseContext = await contextAnalyzer.analyzeCurrentContext();
    const familyContext = contextAnalyzer.updateFamilyContext(baseContext, activeProfile, {
      childrenPresent: familyState.activeMembers.some(m => m.type === 'child'),
      supervisionLevel: familyState.supervisionMode.level,
      safetyRestrictionsActive: familyState.supervisionMode.active
    });

    // Construire le contexte de suggestion
    const suggestionContext: SuggestionContext = {
      userId: activeProfile.id,
      currentSection,
      timeOfDay: familyContext.time.hour,
      dayOfWeek: familyContext.time.dayOfWeek,
      sessionDuration: this.getSessionDuration(activeProfile.id),
      recentActions: await this.getRecentFamilyActions(familyId),
      familyProfile: activeProfile,
      currentInventory: familyState.sharedContext.sharedInventory ? 
        await this.getSharedInventory(familyId) : undefined,
      budgetStatus: {
        remaining: familyState.sharedContext.familyBudget * 0.3, // 30% restant
        percentUsed: 70
      }
    };

    // Générer suggestions de base
    const baseSuggestions = await smartSuggestions.generateSuggestions(suggestionContext);

    // Créer des recommandations famille
    const familyRecommendations: FamilyContextualRecommendation[] = [];

    for (const suggestion of baseSuggestions) {
      const familyRec: FamilyContextualRecommendation = {
        id: `family_${suggestion.id}`,
        familyContext: {
          targetMember: activeProfile.id,
          requiresApproval: this.requiresFamilyApproval(suggestion, activeProfile, familyState),
          affectsWholeFamilt: this.affectsWholeFamily(suggestion, familyState),
          childSafe: this.isChildSafe(suggestion, familyState)
        },
        suggestion: await this.adaptSuggestionForFamily(suggestion, activeProfile, familyState),
        consensusRequired: this.requiresFamilyConsensus(suggestion, familyState),
        alternativeOptions: await this.generateFamilyAlternatives(suggestion, familyState)
      };

      // Vérifier les restrictions de sécurité
      if (this.passesFamilySafetyCheck(familyRec, familyState)) {
        familyRecommendations.push(familyRec);
      }
    }

    // Sauvegarder pour suivi
    this.familyRecommendations.set(familyId, familyRecommendations);

    return familyRecommendations;
  }

  /**
   * Gère le changement de profil famille avec adaptation contextuelle
   */
  async handleFamilyProfileSwitch(
    familyId: string,
    fromProfile: FamilyProfile,
    toProfile: FamilyProfile,
    currentSection: NavigationSection
  ): Promise<{
    adaptedContext: ContextData;
    transitionSuggestions: SmartSuggestion[];
    restrictionsChanged: boolean;
    supervisionRequired: boolean;
  }> {
    const familyState = this.familyStates.get(familyId);
    if (!familyState) {
      throw new Error(`Family state not found for family: ${familyId}`);
    }

    // Enregistrer l'événement de coordination
    await this.recordCoordinationEvent(familyId, {
      type: 'profile_switch',
      timestamp: new Date(),
      involvedMembers: [fromProfile.id, toProfile.id],
      data: { fromSection: currentSection, toSection: currentSection }
    });

    // Adapter le contexte pour le nouveau profil
    const baseContext = await contextAnalyzer.analyzeCurrentContext();
    const adaptedContext = contextAnalyzer.updateFamilyContext(baseContext, toProfile, {
      childrenPresent: familyState.activeMembers.some(m => m.type === 'child'),
      supervisionLevel: familyState.supervisionMode.level,
      safetyRestrictionsActive: familyState.supervisionMode.active
    });

    // Générer des suggestions de transition
    const transitionSuggestions = await this.generateTransitionSuggestions(
      fromProfile,
      toProfile,
      currentSection,
      familyState
    );

    // Vérifier les changements de restrictions
    const restrictionsChanged = this.compareProfileRestrictions(fromProfile, toProfile);
    const supervisionRequired = toProfile.type === 'child' && familyState.supervisionMode.active;

    // Mettre à jour l'état famille
    familyState.currentPrimaryUser = toProfile;
    this.familyStates.set(familyId, familyState);

    return {
      adaptedContext,
      transitionSuggestions,
      restrictionsChanged,
      supervisionRequired
    };
  }

  /**
   * Coordonne les suggestions conflictuelles entre membres famille
   */
  async coordinateFamilySuggestions(
    familyId: string,
    conflictingSuggestions: Array<{
      memberId: string;
      suggestions: SmartSuggestion[];
    }>
  ): Promise<{
    resolvedSuggestions: SmartSuggestion[];
    votingRequired: boolean;
    compromiseOptions: SmartSuggestion[];
  }> {
    const familyState = this.familyStates.get(familyId);
    if (!familyState) {
      throw new Error(`Family state not found for family: ${familyId}`);
    }

    // Analyser les conflits
    const conflicts = this.analyzeConflicts(conflictingSuggestions);
    
    // Générer des compromis via Cipher
    const cipherResolution = await cipherContextIntegration.getFamilyConflictResolutions(
      familyId,
      conflicts.map(c => ({
        type: c.type as any,
        day: 0,
        original: c.original,
        adapted: c.adapted,
        reason: c.reason,
        confidence: c.confidence
      }))
    );

    // Transformer en suggestions famille
    const resolvedSuggestions = this.transformCompromisesToSuggestions(
      cipherResolution.compromises,
      familyState
    );

    const compromiseOptions = this.transformAlternativesToSuggestions(
      cipherResolution.alternativeSolutions.flat(),
      familyState
    );

    return {
      resolvedSuggestions,
      votingRequired: cipherResolution.votingRequired,
      compromiseOptions
    };
  }

  /**
   * Traite le feedback famille pour améliorer l'intelligence
   */
  async processFamilyFeedback(
    familyId: string,
    feedback: {
      suggestionId: string;
      memberId: string;
      accepted: boolean;
      satisfaction: number; // 1-5
      reason?: string;
      alternativePreferred?: string;
    }
  ): Promise<void> {
    const familyState = this.familyStates.get(familyId);
    if (!familyState) return;

    // Enregistrer dans Cipher pour apprentissage
    await cipherContextIntegration.recordContextualExperience(
      feedback.memberId,
      {}, // Context vide car familyContext n'est pas supporté
      [],
      {
        accepted: feedback.accepted,
        satisfaction: feedback.satisfaction,
        comments: feedback.reason
      }
    );

    // Mettre à jour les préférences de personnalisation
    await personalizationEngine.learnUserPreferences(feedback.memberId, [{
      feature: 'contextual_suggestions',
      action: feedback.accepted ? 'accept' : 'reject',
      success: feedback.accepted,
      timeToComplete: 0,
      context: { familyMode: true, satisfaction: feedback.satisfaction }
    }]);

    // Enregistrer l'événement de coordination
    await this.recordCoordinationEvent(familyId, {
      type: 'family_vote',
      timestamp: new Date(),
      involvedMembers: [feedback.memberId],
      data: { suggestionId: feedback.suggestionId, feedback },
      resolution: {
        approved: feedback.accepted,
        byWhom: feedback.memberId,
        alternatives: feedback.alternativePreferred ? [feedback.alternativePreferred] : []
      }
    });
  }

  /**
   * Obtient l'intelligence contextuelle adaptée pour un membre famille
   */
  async getFamilyAdaptedIntelligence(
    familyId: string,
    memberId: string,
    currentSection: NavigationSection
  ): Promise<{
    personalizedSuggestions: SmartSuggestion[];
    adaptiveInterface: any;
    safetyGuidelines: string[];
    parentalNotifications?: string[];
  }> {
    const familyState = this.familyStates.get(familyId);
    const member = familyState?.activeMembers.find(m => m.id === memberId);
    
    if (!familyState || !member) {
      throw new Error(`Family member not found: ${memberId}`);
    }

    // Générer suggestions personnalisées
    const familyRecommendations = await this.generateFamilyContextualSuggestions(
      familyId,
      currentSection,
      member
    );

    const personalizedSuggestions = familyRecommendations.map(rec => rec.suggestion);

    // Obtenir l'interface adaptative
    const adaptiveInterface = await personalizationEngine.getProgressiveFeatureDisclosure(
      memberId,
      currentSection
    );

    // Générer guidelines de sécurité
    const safetyGuidelines = this.generateSafetyGuidelines(member, familyState);

    // Notifications parentales si nécessaire
    let parentalNotifications: string[] | undefined;
    if (member.type === 'child' && familyState.supervisionMode.active) {
      parentalNotifications = this.generateParentalNotifications(member, familyState);
    }

    return {
      personalizedSuggestions,
      adaptiveInterface,
      safetyGuidelines,
      parentalNotifications
    };
  }

  /**
   * Synchronise l'intelligence entre membres famille
   */
  async synchronizeFamilyIntelligence(familyId: string): Promise<{
    sharedLearnings: Map<string, any>;
    consensusPreferences: any;
    coordinationNeeded: string[];
  }> {
    const familyState = this.familyStates.get(familyId);
    if (!familyState) {
      throw new Error(`Family state not found: ${familyId}`);
    }

    // Collecter les apprentissages de tous les membres
    const memberLearnings = new Map<string, any>();
    
    for (const member of familyState.activeMembers) {
      try {
        const personalization = await personalizationEngine.getUserPersonalization(member.id);
        const behaviorAnalysis = await behaviorTracker.analyzeBehaviorPatterns(member.id);
        
        memberLearnings.set(member.id, {
          preferences: personalization.preferences,
          patterns: behaviorAnalysis.patterns,
          insights: behaviorAnalysis.insights
        });
      } catch (error) {
        console.warn(`Failed to get learnings for member ${member.id}:`, error);
      }
    }

    // Identifier les apprentissages partagés
    const sharedLearnings = this.identifySharedLearnings(memberLearnings);

    // Construire des préférences de consensus
    const consensusPreferences = this.buildConsensusPreferences(memberLearnings);

    // Identifier les besoins de coordination
    const coordinationNeeded = this.identifyCoordinationNeeds(memberLearnings, familyState);

    return {
      sharedLearnings,
      consensusPreferences,
      coordinationNeeded
    };
  }

  // === MÉTHODES PRIVÉES ===

  private async initializeFamilyIntelligence(): Promise<void> {
    // Charger les états famille depuis le cache
    if (typeof localStorage !== 'undefined') {
      try {
        const cached = localStorage.getItem('family_contextual_states');
        if (cached) {
          const data = JSON.parse(cached);
          this.familyStates = new Map(data);
        }
      } catch (error) {
        console.warn('Failed to load family states from cache:', error);
      }
    }
  }

  private getRestrictedSections(supervisionLevel: 'high' | 'medium' | 'low'): NavigationSection[] {
    const restrictions = {
      high: ['shopping', 'insights'] as NavigationSection[],
      medium: ['insights'] as NavigationSection[],
      low: [] as NavigationSection[]
    };
    
    return restrictions[supervisionLevel];
  }

  private async aggregateFamilyPreferences(members: FamilyProfile[]): Promise<string[]> {
    const allPreferences: string[] = [];
    
    for (const member of members) {
      try {
        const personalization = await personalizationEngine.getUserPersonalization(member.id);
        allPreferences.push(...personalization.preferences.favoriteFeatures);
      } catch (error) {
        console.warn(`Failed to get preferences for ${member.id}:`, error);
      }
    }

    // Retourner les préférences les plus communes
    const preferenceCount = new Map<string, number>();
    allPreferences.forEach(pref => {
      preferenceCount.set(pref, (preferenceCount.get(pref) || 0) + 1);
    });

    return Array.from(preferenceCount.entries())
      .filter(([_, count]) => count >= Math.ceil(members.length / 2)) // Majorité
      .map(([pref]) => pref);
  }

  private identifyCommonAllergies(members: FamilyProfile[]): string[] {
    // Identifier les allergies communes ou critiques
    const allAllergies = members.flatMap(m => m.restrictions?.allergenAlerts || []);
    
    // Retourner toutes les allergies (principe de précaution)
    return [...new Set(allAllergies)];
  }

  private async calculateFamilyBudget(familyId: string): Promise<number> {
    // Calculer le budget famille basé sur la taille et les préférences
    try {
      // En production, récupérer depuis la base de données
      return 150; // Budget par défaut pour une famille
    } catch (error) {
      console.error('Failed to calculate family budget:', error);
      return 100;
    }
  }

  private requiresFamilyApproval(
    suggestion: SmartSuggestion,
    activeProfile: FamilyProfile,
    familyState: FamilyContextualState
  ): boolean {
    // Les enfants ont besoin d'approbation pour certaines actions
    if (activeProfile.type === 'child') {
      const sensitiveActions = ['shopping', 'budget', 'sharing', 'external'];
      return sensitiveActions.some(action => 
        suggestion.action.target.includes(action) || 
        suggestion.type === 'workflow'
      );
    }

    // Actions qui affectent toute la famille
    return suggestion.context.familyRelevant && 
           familyState.sharedContext.coordinatedPlanning;
  }

  private affectsWholeFamily(
    suggestion: SmartSuggestion,
    familyState: FamilyContextualState
  ): boolean {
    const familyWideActions = ['meal_planning', 'family_budget', 'shared_inventory'];
    return familyWideActions.some(action => suggestion.action.target.includes(action)) ||
           suggestion.type === 'family';
  }

  private isChildSafe(
    suggestion: SmartSuggestion,
    familyState: FamilyContextualState
  ): boolean {
    // Vérifier la sécurité selon le niveau de supervision
    const { level } = familyState.supervisionMode;
    
    if (level === 'high') {
      return suggestion.familyAdaptation?.safetyLevel === 'safe';
    } else if (level === 'medium') {
      return suggestion.familyAdaptation?.safetyLevel !== 'restricted';
    }
    
    return true; // Low supervision = tout autorisé
  }

  private requiresFamilyConsensus(
    suggestion: SmartSuggestion,
    familyState: FamilyContextualState
  ): boolean {
    // Consensus requis pour les décisions importantes affectant la famille
    const consensusActions = [
      'change_family_budget',
      'modify_dietary_restrictions',
      'change_meal_schedule',
      'add_family_member'
    ];
    
    return consensusActions.some(action => suggestion.action.target.includes(action)) &&
           familyState.sharedContext.coordinatedPlanning;
  }

  private async adaptSuggestionForFamily(
    suggestion: SmartSuggestion,
    activeProfile: FamilyProfile,
    familyState: FamilyContextualState
  ): Promise<SmartSuggestion> {
    const adapted = { ...suggestion };

    // Adapter le langage selon l'âge
    if (activeProfile.type === 'child') {
      adapted.title = this.adaptLanguageForChild(adapted.title, activeProfile.age);
      adapted.description = this.adaptLanguageForChild(adapted.description, activeProfile.age);
    }

    // Ajouter données famille si pas présentes
    if (!adapted.familyAdaptation) {
      adapted.familyAdaptation = {
        childFriendly: this.isActionChildFriendly(suggestion.action.target),
        supervisedAction: this.requiresSupervisionForAction(suggestion.action.target, activeProfile),
        adaptedLanguage: adapted.description,
        safetyLevel: this.evaluateActionSafety(suggestion.action.target, activeProfile)
      };
    }

    // Ajuster la confiance selon l'historique famille
    const familyHistory = await this.getFamilyActionHistory(familyState.familyId, suggestion.type);
    if (familyHistory.length > 0) {
      const familySuccessRate = familyHistory.filter(h => h.success).length / familyHistory.length;
      adapted.confidence = (adapted.confidence + familySuccessRate) / 2;
    }

    return adapted;
  }

  private async generateFamilyAlternatives(
    suggestion: SmartSuggestion,
    familyState: FamilyContextualState
  ): Promise<SmartSuggestion[]> {
    const alternatives: SmartSuggestion[] = [];

    // Alternative plus sûre pour les enfants
    if (suggestion.familyAdaptation?.safetyLevel === 'caution') {
      alternatives.push({
        ...suggestion,
        id: `safe_${suggestion.id}`,
        title: `${suggestion.title} (mode sécurisé)`,
        familyAdaptation: {
          ...suggestion.familyAdaptation,
          supervisedAction: true,
          safetyLevel: 'safe'
        },
        confidence: suggestion.confidence * 0.9
      });
    }

    // Alternative simplifiée
    if (familyState.adaptiveInterface.simplifiedNavigation) {
      alternatives.push({
        ...suggestion,
        id: `simple_${suggestion.id}`,
        title: `${suggestion.title} (simplifié)`,
        description: this.simplifyDescription(suggestion.description),
        confidence: suggestion.confidence * 0.8
      });
    }

    return alternatives;
  }

  private passesFamilySafetyCheck(
    recommendation: FamilyContextualRecommendation,
    familyState: FamilyContextualState
  ): boolean {
    // Vérifications de sécurité famille
    if (!recommendation.familyContext.childSafe && 
        familyState.activeMembers.some(m => m.type === 'child')) {
      return false;
    }

    // Vérifier les restrictions de temps pour enfants
    if (familyState.supervisionMode.timeRestrictions) {
      const now = new Date();
      const hour = now.getHours();
      const { start, end } = familyState.supervisionMode.timeRestrictions.allowedHours;
      
      if (hour < start || hour > end) {
        return false;
      }
    }

    return true;
  }

  private async generateTransitionSuggestions(
    fromProfile: FamilyProfile,
    toProfile: FamilyProfile,
    currentSection: NavigationSection,
    familyState: FamilyContextualState
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // Suggestion d'orientation pour les enfants
    if (toProfile.type === 'child' && fromProfile.type === 'parent') {
      suggestions.push({
        id: `child_orientation_${Date.now()}`,
        type: 'family',
        title: 'Bienvenue !',
        description: 'Découvre ce que tu peux faire ici',
        icon: 'Star',
        confidence: 0.9,
        priority: 'high',
        action: {
          type: 'tutorial',
          target: 'child_orientation',
          data: { section: currentSection, age: toProfile.age }
        },
        context: {
          trigger: 'profile_transition',
          reasoning: ['Nouveau profil enfant actif'],
          timeRelevant: false,
          familyRelevant: true
        },
        presentation: {
          urgent: false,
          dismissible: false,
          autoHide: false,
          animation: 'bounce'
        },
        familyAdaptation: {
          childFriendly: true,
          supervisedAction: false,
          adaptedLanguage: 'Salut ! Veux-tu que je te montre ce qu\'on peut faire ici ?',
          safetyLevel: 'safe'
        }
      });
    }

    // Suggestion de configuration pour les parents
    if (toProfile.type === 'parent' && fromProfile.type === 'child') {
      suggestions.push({
        id: `parent_review_${Date.now()}`,
        type: 'family',
        title: 'Activité enfant',
        description: 'Voir ce que votre enfant a fait',
        icon: 'Users',
        confidence: 0.7,
        priority: 'medium',
        action: {
          type: 'execute',
          target: 'show_child_activity',
          data: { childId: fromProfile.id }
        },
        context: {
          trigger: 'supervision_transition',
          reasoning: ['Transition depuis profil enfant'],
          timeRelevant: false,
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

    return suggestions;
  }

  // === MÉTHODES UTILITAIRES ===

  private analyzeConflicts(
    conflictingSuggestions: Array<{ memberId: string; suggestions: SmartSuggestion[] }>
  ): Array<{ type: string; original: string; adapted: string; reason: string; confidence: number }> {
    const conflicts: Array<{ type: string; original: string; adapted: string; reason: string; confidence: number }> = [];
    
    // Simplifier pour l'exemple - en production, analyser les vrais conflits
    conflictingSuggestions.forEach(({ memberId, suggestions }) => {
      suggestions.forEach(suggestion => {
        conflicts.push({
          type: suggestion.type,
          original: suggestion.title,
          adapted: `${suggestion.title} (adapté pour ${memberId})`,
          reason: 'Préférence membre famille',
          confidence: suggestion.confidence
        });
      });
    });

    return conflicts;
  }

  private transformCompromisesToSuggestions(
    compromises: any[],
    familyState: FamilyContextualState
  ): SmartSuggestion[] {
    return compromises.map(compromise => ({
      id: `compromise_${Date.now()}_${Math.random()}`,
      type: 'family' as const,
      title: 'Compromis famille',
      description: compromise.reason,
      icon: 'Users',
      confidence: compromise.confidence,
      priority: 'medium' as const,
      action: {
        type: 'execute' as const,
        target: 'apply_family_compromise',
        data: compromise
      },
      context: {
        trigger: 'family_compromise',
        reasoning: ['Solution de compromis famille'],
        timeRelevant: false,
        familyRelevant: true
      },
      presentation: {
        urgent: false,
        dismissible: true,
        autoHide: false,
        animation: 'slide' as const
      }
    }));
  }

  private transformAlternativesToSuggestions(
    alternatives: any[],
    familyState: FamilyContextualState
  ): SmartSuggestion[] {
    return alternatives.map((alt, index) => ({
      id: `alternative_${Date.now()}_${index}`,
      type: 'family' as const,
      title: `Alternative ${index + 1}`,
      description: alt.reason,
      icon: 'Zap',
      confidence: alt.confidence,
      priority: 'low' as const,
      action: {
        type: 'execute' as const,
        target: 'apply_alternative',
        data: alt
      },
      context: {
        trigger: 'family_alternative',
        reasoning: ['Solution alternative'],
        timeRelevant: false,
        familyRelevant: true
      },
      presentation: {
        urgent: false,
        dismissible: true,
        autoHide: true,
        showDuration: 12000,
        animation: 'fade' as const
      }
    }));
  }

  private compareProfileRestrictions(from: FamilyProfile, to: FamilyProfile): boolean {
    // Comparer les restrictions entre profils
    const fromRestrictions = from.restrictions.allowedSections.join(',');
    const toRestrictions = to.restrictions.allowedSections.join(',');
    
    return fromRestrictions !== toRestrictions;
  }

  private generateSafetyGuidelines(
    member: FamilyProfile,
    familyState: FamilyContextualState
  ): string[] {
    const guidelines: string[] = [];

    if (member.type === 'child') {
      guidelines.push('Ne pas partager d\'informations personnelles');
      guidelines.push('Toujours demander à un adulte avant d\'acheter quelque chose');
      
      if (member.age < 10) {
        guidelines.push('Utiliser l\'application avec un adulte');
        guidelines.push('Ne pas utiliser la cuisinière sans surveillance');
      }
    }

    if (familyState.supervisionMode.level === 'high') {
      guidelines.push('Toutes les actions importantes nécessitent une approbation');
      guidelines.push('Historique des activités surveillé');
    }

    return guidelines;
  }

  private generateParentalNotifications(
    childProfile: FamilyProfile,
    familyState: FamilyContextualState
  ): string[] {
    const notifications: string[] = [];

    // Notifications basées sur l'activité enfant
    notifications.push(`${childProfile.name} utilise l'application`);
    
    if (familyState.supervisionMode.level === 'high') {
      notifications.push('Supervision active - vous serez notifié des actions importantes');
    }

    return notifications;
  }

  private adaptLanguageForChild(text: string, age: number): string {
    if (age < 8) {
      // Langage très simple pour les jeunes enfants
      return text
        .replace('Optimisation', 'Amélioration')
        .replace('Intelligent', 'Malin')
        .replace('Algorithmique', 'Automatique')
        .replace('Contextuel', 'Selon la situation')
        .replace('Prédictif', 'Qui devine');
    } else if (age < 12) {
      // Langage simplifié pour les pré-ados
      return text
        .replace('Optimisation', 'Amélioration')
        .replace('Algorithme', 'Programme intelligent');
    }
    
    return text; // Ados = langage normal
  }

  private isActionChildFriendly(actionTarget: string): boolean {
    const childFriendlyActions = [
      'kitchen', 'games', 'recipes', 'tutorials', 'help'
    ];
    
    return childFriendlyActions.some(action => actionTarget.includes(action));
  }

  private requiresSupervisionForAction(actionTarget: string, profile: FamilyProfile): boolean {
    if (profile.type !== 'child') return false;
    
    const supervisionActions = [
      'shopping', 'budget', 'sharing', 'external', 'advanced'
    ];
    
    return supervisionActions.some(action => actionTarget.includes(action));
  }

  private evaluateActionSafety(
    actionTarget: string,
    profile: FamilyProfile
  ): 'safe' | 'caution' | 'restricted' {
    if (profile.type !== 'child') return 'safe';
    
    const restrictedActions = ['shopping', 'budget', 'sharing', 'external'];
    if (restrictedActions.some(action => actionTarget.includes(action))) {
      return 'restricted';
    }
    
    const cautionActions = ['advanced', 'complex', 'settings'];
    if (cautionActions.some(action => actionTarget.includes(action))) {
      return 'caution';
    }
    
    return 'safe';
  }

  private getSessionDuration(userId: string): number {
    const sessionStart = localStorage.getItem(`session_start_${userId}`);
    return sessionStart ? Date.now() - parseInt(sessionStart) : 0;
  }

  private async getRecentFamilyActions(familyId: string): Promise<string[]> {
    // TODO: Récupérer les actions récentes de la famille
    return [];
  }

  private async getSharedInventory(familyId: string): Promise<any[]> {
    // TODO: Récupérer l'inventaire partagé de la famille
    return [];
  }

  private async getFamilyActionHistory(
    familyId: string,
    actionType: string
  ): Promise<Array<{ success: boolean; timestamp: Date }>> {
    // TODO: Récupérer l'historique d'actions famille
    return [];
  }

  private identifySharedLearnings(memberLearnings: Map<string, any>): Map<string, any> {
    const shared = new Map<string, any>();
    
    // Identifier les patterns communs entre membres
    // Implementation simplifiée pour l'exemple
    return shared;
  }

  private buildConsensusPreferences(memberLearnings: Map<string, any>): any {
    // Construire des préférences de consensus famille
    return {};
  }

  private identifyCoordinationNeeds(
    memberLearnings: Map<string, any>,
    familyState: FamilyContextualState
  ): string[] {
    // Identifier quand une coordination famille est nécessaire
    return [];
  }

  private simplifyDescription(description: string): string {
    return description
      .replace(/\b\w{10,}\b/g, (word) => {
        // Remplacer les mots longs par des versions plus simples
        const replacements: Record<string, string> = {
          'Optimisation': 'Amélioration',
          'Contextuelle': 'Adaptée',
          'Intelligence': 'Malin',
          'Prédictive': 'Automatique'
        };
        return replacements[word] || word;
      });
  }

  private async recordCoordinationEvent(
    familyId: string,
    event: FamilyCoordinationEvent
  ): Promise<void> {
    const events = this.coordinationEvents.get(familyId) || [];
    events.push(event);
    this.coordinationEvents.set(familyId, events);

    // Intégrer avec Cipher
    try {
      await cipherContextIntegration.integrateFamilyContext(
        familyId,
        event.involvedMembers,
        new Map(), // adaptations
        new Map() // feedback
      );
    } catch (error) {
      console.warn('Failed to record coordination event in Cipher:', error);
    }
  }

  private async integrateFamilyStateWithCipher(
    familyId: string,
    familyState: FamilyContextualState
  ): Promise<void> {
    try {
      await cipherMemory.integrateFamilyModeData(familyId, {
        members: familyState.activeMembers.map(m => ({
          id: m.id,
          name: m.name,
          preferences: m.preferences
        })),
        interactions: [],
        conflicts: []
      });
    } catch (error) {
      console.warn('Failed to integrate family state with Cipher:', error);
    }
  }
}

// Export singleton
export const familyContextualIntelligence = new FamilyContextualIntelligence();