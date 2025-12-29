import { supabase } from '@/integrations/supabase/client';
import { cipherContextIntegration } from './CipherContextIntegration';
import { contextAdapter } from './ContextAdapter';
import {
  FamilyPreferences,
  FamilyMemberProfile,
  FamilyConflict,
  FamilyAdaptationResult,
  FamilyContextualState,
  ConflictResolution,
  AdaptationLog,
  UserContextPreferences
} from './types';

/**
 * Coordonnateur du contexte famille
 * Gère les préférences multiples, résout les conflits et optimise pour toute la famille
 */
export class FamilyContextCoordinator {
  private familyCache: Map<string, FamilyContextualState> = new Map();
  private conflictHistory: Map<string, FamilyConflict[]> = new Map();

  /**
   * Coordonne les adaptations pour une famille entière
   */
  async coordinateFamilyAdaptations(
    familyId: string,
    basePlan: any,
    familyMembers: FamilyMemberProfile[]
  ): Promise<FamilyAdaptationResult> {
    const startTime = performance.now();

    try {
      // 1. Récupérer les préférences de chaque membre
      const memberPreferences = await this.getMemberPreferences(familyMembers);
      
      // 2. Détecter les conflits potentiels
      const conflicts = this.detectPreferenceConflicts(memberPreferences);
      
      // 3. Générer des adaptations individuelles
      const individualAdaptations = await this.generateIndividualAdaptations(
        basePlan,
        familyMembers,
        memberPreferences
      );
      
      // 4. Résoudre les conflits
      const resolutions = await this.resolveConflicts(
        familyId,
        conflicts,
        individualAdaptations
      );
      
      // 5. Créer le plan consensuel
      const consensusPlan = await this.createConsensusPlan(
        basePlan,
        individualAdaptations,
        resolutions
      );
      
      // 6. Optimiser pour la famille
      const optimizedPlan = await this.optimizeForFamily(
        consensusPlan,
        familyMembers.length
      );
      
      // 7. Enregistrer dans Cipher pour apprentissage
      await this.recordFamilyDecision(
        familyId,
        familyMembers,
        conflicts,
        resolutions,
        optimizedPlan
      );
      
      const executionTime = performance.now() - startTime;
      
      return {
        familyId,
        originalPlan: basePlan,
        adaptedPlan: optimizedPlan,
        memberAdaptations: individualAdaptations,
        conflicts,
        resolutions,
        consensusScore: this.calculateConsensusScore(resolutions),
        executionTime
      };
    } catch (error) {
      console.error('Failed to coordinate family adaptations:', error);
      return this.getFallbackResult(familyId, basePlan);
    }
  }

  /**
   * Récupère les préférences de chaque membre
   */
  private async getMemberPreferences(
    members: FamilyMemberProfile[]
  ): Promise<Map<string, UserContextPreferences>> {
    const preferences = new Map<string, UserContextPreferences>();
    
    for (const member of members) {
      const { data: prefs } = await supabase
        .from('contextual_user_preferences')
        .select('*')
        .eq('user_id', member.userId)
        .single();
      
      if (prefs) {
        preferences.set(member.userId, {
          weather_adaptation: prefs.weather_adaptation,
          calendar_sync: prefs.calendar_sync,
          seasonal_preferences: prefs.seasonal_preferences,
          price_optimization: prefs.price_optimization,
          weather_sensitivity: prefs.weather_sensitivity,
          schedule_flexibility: prefs.schedule_flexibility,
          price_sensitivity: prefs.price_sensitivity,
          seasonal_commitment: prefs.seasonal_commitment,
          max_adaptations_per_week: prefs.max_adaptations_per_week,
          home_location: prefs.home_location,
          preferred_stores: prefs.preferred_stores,
          excluded_categories: prefs.excluded_categories,
          max_store_distance: prefs.max_store_distance,
          family_context_enabled: true
        });
      }
    }
    
    return preferences;
  }

  /**
   * Détecte les conflits de préférences
   */
  private detectPreferenceConflicts(
    preferences: Map<string, UserContextPreferences>
  ): FamilyConflict[] {
    const conflicts: FamilyConflict[] = [];
    const prefArray = Array.from(preferences.entries());
    
    // Conflits de sensibilité météo
    const weatherSensitivities = prefArray.map(([id, pref]) => ({
      memberId: id,
      sensitivity: pref.weather_sensitivity
    }));
    
    const hasWeatherConflict = weatherSensitivities.some(m => m.sensitivity === 'high') &&
                              weatherSensitivities.some(m => m.sensitivity === 'low');
    
    if (hasWeatherConflict) {
      conflicts.push({
        id: `conflict_weather_${Date.now()}`,
        type: 'preference',
        severity: 'medium',
        members: weatherSensitivities.map(m => m.memberId),
        description: 'Désaccord sur l\'adaptation météo',
        category: 'weather',
        suggestedResolution: 'Utiliser une sensibilité moyenne'
      });
    }
    
    // Conflits de prix
    const priceSensitivities = prefArray.map(([id, pref]) => ({
      memberId: id,
      sensitivity: pref.price_sensitivity
    }));
    
    const hasPriceConflict = priceSensitivities.some(m => m.sensitivity === 'high') &&
                            priceSensitivities.some(m => m.sensitivity === 'low');
    
    if (hasPriceConflict) {
      conflicts.push({
        id: `conflict_price_${Date.now()}`,
        type: 'preference',
        severity: 'low',
        members: priceSensitivities.map(m => m.memberId),
        description: 'Préférences de prix divergentes',
        category: 'price',
        suggestedResolution: 'Prioriser les économies raisonnables'
      });
    }
    
    // Conflits d'horaires (calendriers)
    const hasCalendarSync = prefArray.filter(([_, pref]) => pref.calendar_sync);
    if (hasCalendarSync.length > 1) {
      // Vérifier les conflits d'horaires réels
      conflicts.push({
        id: `conflict_schedule_${Date.now()}`,
        type: 'schedule',
        severity: 'high',
        members: hasCalendarSync.map(([id]) => id),
        description: 'Conflits d\'horaires potentiels',
        category: 'schedule',
        suggestedResolution: 'Trouver des créneaux communs'
      });
    }
    
    return conflicts;
  }

  /**
   * Génère les adaptations individuelles
   */
  private async generateIndividualAdaptations(
    basePlan: any,
    members: FamilyMemberProfile[],
    preferences: Map<string, UserContextPreferences>
  ): Promise<Map<string, AdaptationLog[]>> {
    const adaptations = new Map<string, AdaptationLog[]>();
    
    for (const member of members) {
      const memberPrefs = preferences.get(member.userId);
      if (!memberPrefs) continue;
      
      // Utiliser le ContextAdapter pour chaque membre
      const memberAdaptation = await contextAdapter.adaptMealPlan(
        basePlan,
        member.userId,
        memberPrefs
      );
      
      adaptations.set(member.userId, memberAdaptation.adaptations);
    }
    
    return adaptations;
  }

  /**
   * Résout les conflits détectés
   */
  private async resolveConflicts(
    familyId: string,
    conflicts: FamilyConflict[],
    individualAdaptations: Map<string, AdaptationLog[]>
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];
    
    for (const conflict of conflicts) {
      let resolution: ConflictResolution;
      
      switch (conflict.type) {
        case 'preference':
          resolution = await this.resolvePreferenceConflict(conflict, individualAdaptations);
          break;
          
        case 'schedule':
          resolution = await this.resolveScheduleConflict(conflict, individualAdaptations);
          break;
          
        case 'dietary':
          resolution = await this.resolveDietaryConflict(conflict, individualAdaptations);
          break;
          
        default:
          resolution = await this.getDefaultResolution(conflict);
      }
      
      resolutions.push(resolution);
      
      // Enregistrer la résolution
      await this.recordConflictResolution(familyId, conflict, resolution);
    }
    
    // Utiliser Cipher pour améliorer les résolutions futures
    const cipherResolutions = await cipherContextIntegration.getFamilyConflictResolutions(
      familyId,
      conflicts.map(c => ({
        type: 'schedule' as any,
        day: 0,
        original: '',
        adapted: '',
        reason: c.description,
        confidence: 0.5
      }))
    );
    
    // Fusionner avec les résolutions Cipher si disponibles
    if (cipherResolutions.compromises.length > 0) {
      resolutions.push({
        conflictId: 'cipher_compromise',
        method: 'ai_suggestion',
        outcome: 'compromise',
        satisfaction: new Map(),
        details: {
          compromises: cipherResolutions.compromises,
          requiresVoting: cipherResolutions.votingRequired
        }
      });
    }
    
    return resolutions;
  }

  /**
   * Résout un conflit de préférences
   */
  private async resolvePreferenceConflict(
    conflict: FamilyConflict,
    adaptations: Map<string, AdaptationLog[]>
  ): Promise<ConflictResolution> {
    // Stratégie: Compromis basé sur la majorité
    const memberAdaptations = conflict.members.map(id => ({
      memberId: id,
      adaptations: adaptations.get(id) || []
    }));
    
    // Analyser les adaptations pour trouver un terrain d'entente
    const commonAdaptations = this.findCommonAdaptations(memberAdaptations);
    
    const satisfaction = new Map<string, number>();
    conflict.members.forEach(member => {
      // Score de satisfaction basé sur le nombre d'adaptations conservées
      const kept = memberAdaptations.find(m => m.memberId === member)?.adaptations.length || 0;
      const ratio = commonAdaptations.length > 0 ? commonAdaptations.length / kept : 0.5;
      satisfaction.set(member, Math.min(1, ratio));
    });
    
    return {
      conflictId: conflict.id,
      method: 'majority_rule',
      outcome: 'compromise',
      satisfaction,
      details: {
        keptAdaptations: commonAdaptations,
        droppedCount: memberAdaptations.reduce((sum, m) => 
          sum + m.adaptations.length, 0
        ) - commonAdaptations.length
      }
    };
  }

  /**
   * Résout un conflit d'horaires
   */
  private async resolveScheduleConflict(
    conflict: FamilyConflict,
    adaptations: Map<string, AdaptationLog[]>
  ): Promise<ConflictResolution> {
    // Pour les conflits d'horaires, prioriser les repas rapides
    const quickMealAdaptations = Array.from(adaptations.values())
      .flat()
      .filter(a => a.reason.includes('rapide') || a.reason.includes('express'));
    
    const satisfaction = new Map<string, number>();
    conflict.members.forEach(member => {
      satisfaction.set(member, 0.7); // Satisfaction moyenne par défaut
    });
    
    return {
      conflictId: conflict.id,
      method: 'time_optimization',
      outcome: 'adapted',
      satisfaction,
      details: {
        solution: 'Repas rapides pour les jours chargés',
        adaptations: quickMealAdaptations
      }
    };
  }

  /**
   * Résout un conflit alimentaire
   */
  private async resolveDietaryConflict(
    conflict: FamilyConflict,
    adaptations: Map<string, AdaptationLog[]>
  ): Promise<ConflictResolution> {
    // Pour les conflits alimentaires, trouver des alternatives
    const satisfaction = new Map<string, number>();
    conflict.members.forEach(member => {
      satisfaction.set(member, 0.8);
    });
    
    return {
      conflictId: conflict.id,
      method: 'alternative_options',
      outcome: 'resolved',
      satisfaction,
      details: {
        solution: 'Options alternatives pour chaque restriction'
      }
    };
  }

  /**
   * Résolution par défaut
   */
  private async getDefaultResolution(conflict: FamilyConflict): Promise<ConflictResolution> {
    const satisfaction = new Map<string, number>();
    conflict.members.forEach(member => {
      satisfaction.set(member, 0.5);
    });
    
    return {
      conflictId: conflict.id,
      method: 'voting',
      outcome: 'pending',
      satisfaction,
      details: {
        solution: conflict.suggestedResolution || 'Vote familial requis'
      }
    };
  }

  /**
   * Crée un plan consensuel
   */
  private async createConsensusPlan(
    basePlan: any,
    individualAdaptations: Map<string, AdaptationLog[]>,
    resolutions: ConflictResolution[]
  ): Promise<any> {
    let consensusPlan = { ...basePlan };
    const appliedAdaptations = new Set<string>();
    
    // Appliquer d'abord les adaptations sans conflit
    const allAdaptations = Array.from(individualAdaptations.values()).flat();
    const uniqueAdaptations = this.deduplicateAdaptations(allAdaptations);
    
    // Filtrer selon les résolutions
    const approvedAdaptations = uniqueAdaptations.filter(adaptation => {
      const hasConflict = resolutions.some(r => 
        r.details?.droppedAdaptations?.includes(adaptation)
      );
      return !hasConflict;
    });
    
    // Appliquer les adaptations approuvées
    for (const adaptation of approvedAdaptations) {
      if (!appliedAdaptations.has(adaptation.original)) {
        consensusPlan = this.applyAdaptation(consensusPlan, adaptation);
        appliedAdaptations.add(adaptation.original);
      }
    }
    
    return consensusPlan;
  }

  /**
   * Optimise le plan pour la famille
   */
  private async optimizeForFamily(plan: any, familySize: number): Promise<any> {
    const optimizedPlan = { ...plan };
    
    // Ajuster les portions
    if (optimizedPlan.meals) {
      optimizedPlan.meals = optimizedPlan.meals.map((meal: any) => ({
        ...meal,
        servings: Math.max(meal.servings, familySize),
        familyOptimized: true
      }));
    }
    
    // Optimiser pour le batch cooking si famille nombreuse
    if (familySize > 4) {
      optimizedPlan.batchCookingSuggestions = this.generateBatchCookingSuggestions(
        optimizedPlan.meals
      );
    }
    
    // Ajouter des alternatives pour les goûts variés
    optimizedPlan.alternatives = this.generateAlternatives(optimizedPlan.meals);
    
    return optimizedPlan;
  }

  /**
   * Enregistre la décision familiale dans Cipher
   */
  private async recordFamilyDecision(
    familyId: string,
    members: FamilyMemberProfile[],
    conflicts: FamilyConflict[],
    resolutions: ConflictResolution[],
    finalPlan: any
  ): Promise<void> {
    // Préparer les données pour Cipher
    const familyAdaptations = new Map<string, AdaptationLog[]>();
    const familyFeedback = new Map<string, { accepted: boolean; satisfaction: number }>();
    
    members.forEach(member => {
      const satisfaction = resolutions.reduce((avg, r) => {
        const memberSat = r.satisfaction.get(member.userId) || 0.5;
        return avg + memberSat;
      }, 0) / Math.max(resolutions.length, 1);
      
      familyFeedback.set(member.userId, {
        accepted: satisfaction > 0.6,
        satisfaction: Math.round(satisfaction * 5) // Score sur 5
      });
    });
    
    // Intégrer dans Cipher
    await cipherContextIntegration.integrateFamilyContext(
      familyId,
      members.map(m => m.userId),
      familyAdaptations,
      familyFeedback
    );
    
    // Stocker dans l'historique local
    const history = this.conflictHistory.get(familyId) || [];
    history.push(...conflicts);
    this.conflictHistory.set(familyId, history.slice(-100)); // Garder les 100 derniers
  }

  /**
   * Trouve les adaptations communes
   */
  private findCommonAdaptations(
    memberAdaptations: Array<{ memberId: string; adaptations: AdaptationLog[] }>
  ): AdaptationLog[] {
    if (memberAdaptations.length === 0) return [];
    
    // Trouver les adaptations présentes chez au moins 50% des membres
    const adaptationCounts = new Map<string, number>();
    const adaptationMap = new Map<string, AdaptationLog>();
    
    memberAdaptations.forEach(({ adaptations }) => {
      adaptations.forEach(adaptation => {
        const key = `${adaptation.type}_${adaptation.day}_${adaptation.adapted}`;
        adaptationCounts.set(key, (adaptationCounts.get(key) || 0) + 1);
        adaptationMap.set(key, adaptation);
      });
    });
    
    const threshold = Math.ceil(memberAdaptations.length / 2);
    const commonKeys = Array.from(adaptationCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([key]) => key);
    
    return commonKeys.map(key => adaptationMap.get(key)!);
  }

  /**
   * Déduplique les adaptations
   */
  private deduplicateAdaptations(adaptations: AdaptationLog[]): AdaptationLog[] {
    const seen = new Set<string>();
    return adaptations.filter(adaptation => {
      const key = `${adaptation.type}_${adaptation.day}_${adaptation.adapted}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Applique une adaptation au plan
   */
  private applyAdaptation(plan: any, adaptation: AdaptationLog): any {
    const updatedPlan = { ...plan };
    
    if (updatedPlan.meals && updatedPlan.meals[adaptation.day]) {
      updatedPlan.meals[adaptation.day] = {
        ...updatedPlan.meals[adaptation.day],
        adaptationApplied: true,
        adaptationType: adaptation.type,
        adaptationReason: adaptation.reason
      };
    }
    
    return updatedPlan;
  }

  /**
   * Génère des suggestions de batch cooking
   */
  private generateBatchCookingSuggestions(meals: any[]): any[] {
    return [
      {
        type: 'prep_ahead',
        title: 'Préparer les légumes',
        description: 'Couper tous les légumes le dimanche',
        timeSaved: 45
      },
      {
        type: 'double_recipe',
        title: 'Doubler les portions',
        description: 'Congeler la moitié pour la semaine prochaine',
        moneySaved: 15
      }
    ];
  }

  /**
   * Génère des alternatives
   */
  private generateAlternatives(meals: any[]): Map<number, any[]> {
    const alternatives = new Map<number, any[]>();
    
    meals.forEach((meal, index) => {
      alternatives.set(index, [
        {
          reason: 'vegetarian_option',
          suggestion: 'Version végétarienne disponible'
        },
        {
          reason: 'kid_friendly',
          suggestion: 'Version adaptée aux enfants'
        }
      ]);
    });
    
    return alternatives;
  }

  /**
   * Calcule le score de consensus
   */
  private calculateConsensusScore(resolutions: ConflictResolution[]): number {
    if (resolutions.length === 0) return 1.0;
    
    const totalSatisfaction = resolutions.reduce((sum, resolution) => {
      const avgSatisfaction = Array.from(resolution.satisfaction.values())
        .reduce((a, b) => a + b, 0) / resolution.satisfaction.size;
      return sum + avgSatisfaction;
    }, 0);
    
    return totalSatisfaction / resolutions.length;
  }

  /**
   * Enregistre une résolution de conflit
   */
  private async recordConflictResolution(
    familyId: string,
    conflict: FamilyConflict,
    resolution: ConflictResolution
  ): Promise<void> {
    try {
      await supabase.from('family_conflict_resolutions').insert({
        family_id: familyId,
        conflict_type: conflict.type,
        conflict_description: conflict.description,
        resolution_method: resolution.method,
        outcome: resolution.outcome,
        average_satisfaction: Array.from(resolution.satisfaction.values())
          .reduce((a, b) => a + b, 0) / resolution.satisfaction.size,
        created_at: new Date()
      });
    } catch (error) {
      console.error('Failed to record conflict resolution:', error);
    }
  }

  /**
   * Résultat de fallback en cas d'erreur
   */
  private getFallbackResult(familyId: string, basePlan: any): FamilyAdaptationResult {
    return {
      familyId,
      originalPlan: basePlan,
      adaptedPlan: basePlan,
      memberAdaptations: new Map(),
      conflicts: [],
      resolutions: [],
      consensusScore: 1.0,
      executionTime: 0
    };
  }

  /**
   * Obtient l'état contextuel de la famille
   */
  async getFamilyContextualState(familyId: string): Promise<FamilyContextualState | null> {
    // Vérifier le cache
    const cached = this.familyCache.get(familyId);
    if (cached && cached.lastUpdated.getTime() > Date.now() - 3600000) { // 1 heure
      return cached;
    }
    
    try {
      // Récupérer depuis la base
      const { data: family } = await supabase
        .from('families')
        .select(`
          *,
          family_members (
            user_id,
            role,
            preferences
          )
        `)
        .eq('id', familyId)
        .single();
      
      if (!family) return null;
      
      const members: FamilyMemberProfile[] = family.family_members.map((m: any) => ({
        userId: m.user_id,
        role: m.role,
        dietaryRestrictions: m.preferences?.dietary || [],
        preferences: m.preferences || {}
      }));
      
      const state: FamilyContextualState = {
        familyId,
        members,
        sharedPreferences: family.shared_preferences || {},
        conflictHistory: this.conflictHistory.get(familyId) || [],
        lastSync: new Date(family.last_sync || Date.now()),
        consensusLevel: family.consensus_level || 0.8,
        adaptationStrategy: family.adaptation_strategy || 'balanced',
        lastUpdated: new Date()
      };
      
      // Mettre en cache
      this.familyCache.set(familyId, state);
      
      return state;
    } catch (error) {
      console.error('Failed to get family contextual state:', error);
      return null;
    }
  }
}

// Export de l'instance
export const familyContextCoordinator = new FamilyContextCoordinator();