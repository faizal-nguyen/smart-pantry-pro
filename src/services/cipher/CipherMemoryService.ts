import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types.augmented';

// Types pour le système Cipher Memory
interface MemoryEntry {
  id?: string;
  userId: string;
  memoryType: 'panic_pattern' | 'action_preference' | 'user_behavior' | 'context_learning' | 'family_adaptation';
  memoryKey: string;
  memoryValue: any;
  confidence: number;
  lastAccessed: Date;
  accessCount: number;
  expiresAt?: Date;
  tags: string[];
  metadata: Record<string, any>;
}

interface CipherContext {
  userId: string;
  sessionId: string;
  currentAction?: string;
  familyMode: boolean;
  contextData: Record<string, any>;
}

interface LearningPattern {
  pattern: string;
  frequency: number;
  success_rate: number;
  contexts: string[];
  recommendations: string[];
  confidence: number;
}

interface FamilyProfile {
  familyId: string;
  members: Array<{
    id: string;
    name: string;
    age?: number;
    dietary_restrictions: string[];
    preferences: string[];
    stress_triggers: string[];
  }>;
  collective_preferences: string[];
  conflict_resolution: Record<string, string>;
  emergency_protocols: string[];
}

export class CipherMemoryService {
  private memoryCache = new Map<string, MemoryEntry>();
  private learningBuffer: Array<{
    event: string;
    context: any;
    outcome: any;
    timestamp: Date;
  }> = [];

  private _supabase?: SupabaseClient<Database>;

  constructor(
    supabaseClient?: SupabaseClient<Database>
  ) {
    this._supabase = supabaseClient;
    this.initializeMemorySystem();
  }

  private get supabaseClient(): SupabaseClient<Database> {
    if (!this._supabase) {
      this._supabase = supabase;
    }
    return this._supabase;
  }

  /**
   * Initialise le système de mémoire Cipher
   */
  private async initializeMemorySystem(): Promise<void> {
    try {
      // Créer les tables si elles n'existent pas
      await this.ensureMemoryTables();
      
      // Charger la mémoire active en cache
      await this.loadActiveMemory();
      
      // Démarrer les processus d'apprentissage
      this.startLearningLoop();
      
      console.log('Cipher Memory System initialized');
    } catch (error) {
      console.error('Failed to initialize Cipher Memory System:', error);
    }
  }

  /**
   * Enregistre une expérience dans le système de mémoire
   */
  async recordExperience(
    context: CipherContext,
    event: {
      type: 'panic_triggered' | 'action_executed' | 'solution_selected' | 'feedback_given';
      data: any;
      outcome: 'success' | 'failure' | 'partial';
      satisfaction?: number;
    }
  ): Promise<void> {
    try {
      // Ajouter au buffer d'apprentissage
      this.learningBuffer.push({
        event: event.type,
        context: {
          ...context,
          timestamp: new Date(),
          eventData: event.data
        },
        outcome: {
          type: event.outcome,
          satisfaction: event.satisfaction
        },
        timestamp: new Date()
      });

      // Analyser immédiatement pour les patterns critiques
      await this.analyzeExperienceForPatterns(context, event);

      // Si buffer trop grand, déclencher apprentissage
      if (this.learningBuffer.length >= 10) {
        await this.processLearningBuffer();
      }

      console.log(`Experience recorded: ${event.type} with outcome ${event.outcome}`);
    } catch (error) {
      console.error('Failed to record experience:', error);
    }
  }

  /**
   * Récupère des recommandations basées sur la mémoire
   */
  async getContextualRecommendations(
    context: CipherContext,
    requestType: 'panic_solutions' | 'quick_actions' | 'family_coordination'
  ): Promise<Array<{
    recommendation: string;
    confidence: number;
    reasoning: string;
    priority: number;
  }>> {
    try {
      const recommendations = [];

      // Analyser les patterns historiques
      const patterns = await this.getRelevantPatterns(context.userId, requestType);
      
      for (const pattern of patterns) {
        if (pattern.confidence >= 0.7) {
          recommendations.push({
            recommendation: pattern.recommendations[0] || pattern.pattern,
            confidence: pattern.confidence,
            reasoning: `Basé sur ${pattern.frequency} expériences similaires (${Math.round(pattern.success_rate * 100)}% de succès)`,
            priority: Math.round(pattern.confidence * pattern.success_rate * 10)
          });
        }
      }

      // Ajouter recommandations spécifiques au mode famille
      if (context.familyMode) {
        const familyRecs = await this.getFamilyModeRecommendations(context.userId);
        recommendations.push(...familyRecs);
      }

      // Trier par priorité
      return recommendations
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5);
    } catch (error) {
      console.error('Failed to get contextual recommendations:', error);
      return [];
    }
  }

  /**
   * Adapte le comportement du système basé sur l'apprentissage
   */
  async adaptSystemBehavior(
    context: CipherContext,
    systemType: 'panic_engine' | 'quick_actions' | 'family_coordinator'
  ): Promise<{
    adaptations: Record<string, any>;
    confidence: number;
    explanation: string;
  }> {
    try {
      const adaptations: Record<string, any> = {};
      
      // Récupérer les préférences apprises
      const userPrefs = await this.getLearnedPreferences(context.userId, systemType);
      
      switch (systemType) {
        case 'panic_engine':
          adaptations.preferredSolutionTypes = userPrefs.preferred_solutions || ['instant', 'delivery'];
          adaptations.stressThresholds = userPrefs.stress_patterns || { high: 4, medium: 3 };
          adaptations.timeConstraints = userPrefs.time_preferences || { max_acceptable: 30 };
          break;

        case 'quick_actions':
          adaptations.defaultActions = userPrefs.most_used_actions || ['repeat_week', 'smart_suggest'];
          adaptations.triggerPreferences = userPrefs.preferred_triggers || ['button', 'shortcut'];
          adaptations.executionOrder = userPrefs.action_sequences || [];
          break;

        case 'family_coordinator':
          if (context.familyMode) {
            const familyProfile = await this.getFamilyProfile(context.userId);
            adaptations.memberPreferences = familyProfile?.members || [];
            adaptations.conflictResolution = familyProfile?.conflict_resolution || {};
            adaptations.emergencyProtocols = familyProfile?.emergency_protocols || [];
          }
          break;
      }

      const confidence = this.calculateAdaptationConfidence(userPrefs);
      const explanation = this.generateAdaptationExplanation(adaptations, confidence);

      return {
        adaptations,
        confidence,
        explanation
      };
    } catch (error) {
      console.error('Failed to adapt system behavior:', error);
      return {
        adaptations: {},
        confidence: 0,
        explanation: 'Unable to adapt due to insufficient data'
      };
    }
  }

  /**
   * Intègre les données family-mode dans la mémoire Cipher
   */
  async integrateFamilyModeData(
    userId: string,
    familyData: {
      members: Array<{id: string; name: string; preferences: any}>;
      interactions: Array<{action: string; member: string; outcome: string}>;
      conflicts: Array<{issue: string; resolution: string; satisfaction: number}>;
    }
  ): Promise<void> {
    try {
      // Analyser les patterns familiaux
      const familyPatterns = this.analyzeFamilyPatterns(familyData);

      // Stocker les insights familiaux
      for (const pattern of familyPatterns) {
        await this.storeMemoryEntry({
          userId,
          memoryType: 'family_adaptation',
          memoryKey: `family_pattern_${pattern.type}`,
          memoryValue: pattern.data,
          confidence: pattern.confidence,
          lastAccessed: new Date(),
          accessCount: 0,
          tags: ['family', 'pattern', pattern.type],
          metadata: {
            memberCount: familyData.members.length,
            conflictRate: familyData.conflicts.length / (familyData.interactions.length || 1),
            lastUpdated: new Date().toISOString()
          }
        });
      }

      // Créer/Mettre à jour le profil famille
      await this.updateFamilyProfile(userId, familyData);

      console.log(`Integrated family mode data for ${familyData.members.length} members`);
    } catch (error) {
      console.error('Failed to integrate family mode data:', error);
    }
  }

  /**
   * Optimise les performances du système basé sur les patterns d'utilisation
   */
  async optimizeSystemPerformance(userId: string): Promise<{
    optimizations: string[];
    expectedImprovement: number;
    confidence: number;
  }> {
    try {
      const optimizations = [];
      let totalImprovement = 0;
      let totalConfidence = 0;

      // Analyser les patterns de performance
      const performanceData = await this.getPerformancePatterns(userId);

      // Optimisation du cache
      if (performanceData.cacheHitRate < 0.7) {
        optimizations.push('Pré-calcul des solutions fréquemment demandées');
        totalImprovement += 25;
        totalConfidence += 0.8;
      }

      // Optimisation des types de solutions
      if (performanceData.preferredSolutionTypes.length > 0) {
        optimizations.push(`Prioriser les solutions ${performanceData.preferredSolutionTypes[0]}`);
        totalImprovement += 15;
        totalConfidence += 0.9;
      }

      // Optimisation temporelle
      if (performanceData.peakUsageHours.length > 0) {
        optimizations.push(`Pré-charger les données avant ${performanceData.peakUsageHours[0]}h`);
        totalImprovement += 20;
        totalConfidence += 0.7;
      }

      // Optimisation des gestes
      if (performanceData.preferredGestures.length > 0) {
        optimizations.push(`Activer détection prioritaire pour ${performanceData.preferredGestures[0]}`);
        totalImprovement += 10;
        totalConfidence += 0.6;
      }

      return {
        optimizations,
        expectedImprovement: Math.round(totalImprovement / Math.max(1, optimizations.length)),
        confidence: totalConfidence / Math.max(1, optimizations.length)
      };
    } catch (error) {
      console.error('Failed to optimize system performance:', error);
      return {
        optimizations: [],
        expectedImprovement: 0,
        confidence: 0
      };
    }
  }

  // === MÉTHODES PRIVÉES ===

  private async ensureMemoryTables(): Promise<void> {
    // En production, ces tables seraient créées via les migrations Supabase
    // Pour le développement, on utilise le cache en mémoire uniquement
    console.log('Using in-memory cache for Cipher Memory (database tables not configured)');
  }

  private async loadActiveMemory(): Promise<void> {
    try {
      // En production, charger depuis Supabase
      // Pour le moment, initialisation vide
      this.memoryCache.clear();
    } catch (error) {
      console.warn('Failed to load active memory:', error);
    }
  }

  private startLearningLoop(): void {
    // Processus d'apprentissage toutes les 5 minutes
    setInterval(async () => {
      if (this.learningBuffer.length > 0) {
        await this.processLearningBuffer();
      }
    }, 5 * 60 * 1000);
  }

  private async analyzeExperienceForPatterns(
    context: CipherContext,
    event: any
  ): Promise<void> {
    // Analyse immédiate pour patterns critiques (stress élevé, échecs répétés, etc.)
    if (event.type === 'panic_triggered' && event.data.stressLevel >= 4) {
      await this.recordHighStressPattern(context.userId, event.data);
    }

    if (event.outcome === 'failure') {
      await this.recordFailurePattern(context.userId, event);
    }
  }

  private async processLearningBuffer(): Promise<void> {
    try {
      const buffer = [...this.learningBuffer];
      this.learningBuffer = [];

      // Analyser les patterns dans le buffer
      const patterns = this.extractPatterns(buffer);
      
      // Stocker les nouveaux patterns
      for (const pattern of patterns) {
        await this.storeOrUpdatePattern(pattern);
      }

      console.log(`Processed ${buffer.length} learning events, extracted ${patterns.length} patterns`);
    } catch (error) {
      console.error('Failed to process learning buffer:', error);
    }
  }

  private extractPatterns(experiences: any[]): LearningPattern[] {
    const patterns: LearningPattern[] = [];
    
    // Pattern 1: Heure de pic de panic
    const panicsByHour: Record<number, number> = {};
    experiences.forEach(exp => {
      if (exp.event === 'panic_triggered') {
        const hour = exp.timestamp.getHours();
        panicsByHour[hour] = (panicsByHour[hour] || 0) + 1;
      }
    });

    const peakHour = Object.entries(panicsByHour)
      .sort(([,a], [,b]) => b - a)[0];

    if (peakHour && panicsByHour[parseInt(peakHour[0])] >= 3) {
      patterns.push({
        pattern: `peak_panic_hour_${peakHour[0]}`,
        frequency: panicsByHour[parseInt(peakHour[0])],
        success_rate: 0.8,
        contexts: [`hour_${peakHour[0]}`],
        recommendations: [`Préparer solutions automatiques vers ${peakHour[0]}h`],
        confidence: 0.85
      });
    }

    // Pattern 2: Solutions préférées
    const solutionSuccess: Record<string, {total: number, success: number}> = {};
    experiences.forEach(exp => {
      if (exp.event === 'solution_selected') {
        const solutionType = exp.context.eventData?.type;
        if (solutionType) {
          if (!solutionSuccess[solutionType]) {
            solutionSuccess[solutionType] = { total: 0, success: 0 };
          }
          solutionSuccess[solutionType].total++;
          if (exp.outcome.type === 'success') {
            solutionSuccess[solutionType].success++;
          }
        }
      }
    });

    Object.entries(solutionSuccess).forEach(([type, stats]) => {
      if (stats.total >= 3) {
        const successRate = stats.success / stats.total;
        patterns.push({
          pattern: `preferred_solution_${type}`,
          frequency: stats.total,
          success_rate: successRate,
          contexts: [type],
          recommendations: successRate > 0.7 
            ? [`Prioriser solutions ${type}`]
            : [`Éviter solutions ${type}`],
          confidence: Math.min(0.9, stats.total / 10)
        });
      }
    });

    return patterns;
  }

  private async storeMemoryEntry(entry: Omit<MemoryEntry, 'id'>): Promise<string> {
    try {
      // En production, sauvegarder dans Supabase
      const id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const fullEntry: MemoryEntry = {
        id,
        ...entry
      };

      this.memoryCache.set(entry.memoryKey, fullEntry);
      
      return id;
    } catch (error) {
      console.error('Failed to store memory entry:', error);
      throw error;
    }
  }

  private async getRelevantPatterns(
    userId: string,
    requestType: string
  ): Promise<LearningPattern[]> {
    // Simulé - en production, requête Supabase avec filtres
    return [
      {
        pattern: 'evening_panic_pattern',
        frequency: 8,
        success_rate: 0.87,
        contexts: ['evening', 'high_stress'],
        recommendations: ['Préparer solutions express après 17h'],
        confidence: 0.92
      },
      {
        pattern: 'weekend_family_coordination',
        frequency: 12,
        success_rate: 0.75,
        contexts: ['weekend', 'family_mode'],
        recommendations: ['Activer mode famille automatiquement le weekend'],
        confidence: 0.83
      }
    ];
  }

  private async getFamilyModeRecommendations(
    userId: string
  ): Promise<Array<{
    recommendation: string;
    confidence: number;
    reasoning: string;
    priority: number;
  }>> {
    return [
      {
        recommendation: 'Augmenter portions automatiquement',
        confidence: 0.9,
        reasoning: 'Mode famille détecté avec historique de sous-estimation',
        priority: 8
      },
      {
        recommendation: 'Éviter ingrédients avec restrictions familiales',
        confidence: 0.85,
        reasoning: 'Restrictions alimentaires détectées chez plusieurs membres',
        priority: 9
      }
    ];
  }

  private async getLearnedPreferences(
    userId: string,
    systemType: string
  ): Promise<Record<string, any>> {
    // Simulé - récupération des préférences apprises
    return {
      preferred_solutions: ['instant', 'prepared'],
      stress_patterns: { high_threshold: 4, medium_threshold: 3 },
      time_preferences: { max_acceptable: 25 },
      most_used_actions: ['repeat_week', 'survival_mode'],
      preferred_triggers: ['button', 'gesture']
    };
  }

  private async getFamilyProfile(userId: string): Promise<FamilyProfile | null> {
    // Simulé - récupération du profil famille
    return {
      familyId: `family_${userId}`,
      members: [
        {
          id: 'member_1',
          name: 'Parent 1',
          dietary_restrictions: [],
          preferences: ['italian', 'quick'],
          stress_triggers: ['time_pressure']
        },
        {
          id: 'member_2',
          name: 'Enfant 1',
          age: 8,
          dietary_restrictions: ['nuts'],
          preferences: ['pasta', 'simple'],
          stress_triggers: ['loud_noises']
        }
      ],
      collective_preferences: ['family_friendly', 'quick_prep'],
      conflict_resolution: {
        'cuisine_preference': 'rotate_weekly',
        'spice_level': 'mild_default'
      },
      emergency_protocols: ['pizza_fallback', 'cereal_backup']
    };
  }

  private calculateAdaptationConfidence(preferences: any): number {
    const dataPoints = Object.keys(preferences).length;
    return Math.min(0.95, dataPoints / 10); // Plus de données = plus de confiance
  }

  private generateAdaptationExplanation(
    adaptations: any,
    confidence: number
  ): string {
    const adaptationCount = Object.keys(adaptations).length;
    const confidenceText = confidence > 0.8 ? 'très fiable' : 
                          confidence > 0.6 ? 'fiable' : 'experimental';
    
    return `${adaptationCount} adaptations appliquées avec confiance ${confidenceText} (${Math.round(confidence * 100)}%)`;
  }

  private analyzeFamilyPatterns(familyData: any): Array<{
    type: string;
    data: any;
    confidence: number;
  }> {
    const patterns = [];

    // Pattern de préférences majoritaires
    const preferenceCount: Record<string, number> = {};
    familyData.members.forEach((member: any) => {
      member.preferences.forEach((pref: string) => {
        preferenceCount[pref] = (preferenceCount[pref] || 0) + 1;
      });
    });

    const majorityPrefs = Object.entries(preferenceCount)
      .filter(([, count]) => count > familyData.members.length / 2)
      .map(([pref]) => pref);

    if (majorityPrefs.length > 0) {
      patterns.push({
        type: 'majority_preferences',
        data: majorityPrefs,
        confidence: 0.9
      });
    }

    // Pattern de résolution de conflits
    if (familyData.conflicts.length > 0) {
      const avgSatisfaction = familyData.conflicts
        .reduce((sum: number, c: any) => sum + c.satisfaction, 0) / familyData.conflicts.length;
      
      patterns.push({
        type: 'conflict_resolution_effectiveness',
        data: { average_satisfaction: avgSatisfaction },
        confidence: 0.7
      });
    }

    return patterns;
  }

  private async updateFamilyProfile(userId: string, familyData: any): Promise<void> {
    // En production, mettre à jour dans Supabase
    console.log(`Updated family profile for user ${userId}`);
  }

  private async getPerformancePatterns(userId: string): Promise<{
    cacheHitRate: number;
    preferredSolutionTypes: string[];
    peakUsageHours: number[];
    preferredGestures: string[];
  }> {
    // Simulé - en production, analyser les vraies métriques
    return {
      cacheHitRate: 0.65,
      preferredSolutionTypes: ['instant', 'delivery'],
      peakUsageHours: [18, 19],
      preferredGestures: ['swipe_up', 'long_press']
    };
  }

  private async recordHighStressPattern(userId: string, data: any): Promise<void> {
    await this.storeMemoryEntry({
      userId,
      memoryType: 'panic_pattern',
      memoryKey: `high_stress_${Date.now()}`,
      memoryValue: { stressLevel: data.stressLevel, context: data },
      confidence: 0.95,
      lastAccessed: new Date(),
      accessCount: 0,
      tags: ['high_stress', 'critical'],
      metadata: { priority: 'high' }
    });
  }

  private async recordFailurePattern(userId: string, event: any): Promise<void> {
    await this.storeMemoryEntry({
      userId,
      memoryType: 'user_behavior',
      memoryKey: `failure_${event.type}_${Date.now()}`,
      memoryValue: { event: event.type, context: event.context },
      confidence: 0.8,
      lastAccessed: new Date(),
      accessCount: 0,
      tags: ['failure', 'learning'],
      metadata: { needs_attention: true }
    });
  }

  private async storeOrUpdatePattern(pattern: LearningPattern): Promise<void> {
    await this.storeMemoryEntry({
      userId: 'system', // Pattern global
      memoryType: 'context_learning',
      memoryKey: pattern.pattern,
      memoryValue: pattern,
      confidence: pattern.confidence,
      lastAccessed: new Date(),
      accessCount: 0,
      tags: ['pattern', 'learned'],
      metadata: { 
        frequency: pattern.frequency,
        success_rate: pattern.success_rate
      }
    });
  }

  /**
   * Records behavior data for ML training and analytics
   */
  async recordBehaviorData(
    dataType: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      // Store in memory cache for immediate access
      const entryKey = `behavior_${dataType}_${Date.now()}`;
      
      await this.storeMemoryEntry({
        userId: data.userId || 'system',
        memoryType: 'user_behavior',
        memoryKey: entryKey,
        memoryValue: data,
        confidence: 0.8,
        lastAccessed: new Date(),
        accessCount: 0,
        tags: ['behavior', dataType],
        metadata: {
          dataType,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Behavior data recorded: ${dataType}`);
    } catch (error) {
      console.error('Failed to record behavior data:', error);
    }
  }
}

// Export de l'instance par défaut
export const cipherMemory = new CipherMemoryService();