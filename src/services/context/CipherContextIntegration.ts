import { cipherMemory, CipherMemoryService } from '@/services/cipher/CipherMemoryService';
import {
  WeatherContext,
  CalendarContext,
  SeasonalContext,
  PromotionsContext,
  AdaptationLog,
  ContextualCipherMemory,
  CipherContextualRecommendation
} from './types';

/**
 * Service d'intégration entre le système contextuel et Cipher
 * Permet l'apprentissage et l'amélioration continue des adaptations
 */
export class CipherContextIntegration {
  private cipher: CipherMemoryService;
  private userMemories: Map<string, ContextualCipherMemory> = new Map();

  constructor() {
    this.cipher = cipherMemory;
  }

  /**
   * Enregistre une expérience contextuelle dans Cipher
   */
  async recordContextualExperience(
    userId: string,
    context: {
      weather?: WeatherContext;
      calendar?: CalendarContext;
      seasonal?: SeasonalContext;
      promotions?: PromotionsContext;
    },
    adaptations: AdaptationLog[],
    userFeedback?: {
      accepted: boolean;
      satisfaction?: number;
      comments?: string;
    }
  ): Promise<void> {
    try {
      // Créer le contexte Cipher
      const cipherContext = {
        userId,
        sessionId: `context_${Date.now()}`,
        familyMode: false,
        contextData: {
          hasWeather: !!context.weather,
          hasCalendar: !!context.calendar,
          hasSeasonal: !!context.seasonal,
          hasPromotions: !!context.promotions,
          adaptationCount: adaptations.length,
          adaptationTypes: [...new Set(adaptations.map(a => a.type))]
        }
      };

      // Enregistrer l'expérience
      await this.cipher.recordExperience(cipherContext, {
        type: 'action_executed',
        data: {
          context: this.summarizeContext(context),
          adaptations: adaptations.map(a => ({
            type: a.type,
            reason: a.reason,
            confidence: a.confidence,
            savings: a.savings
          })),
          feedback: userFeedback
        },
        outcome: userFeedback?.accepted ? 'success' : 'failure',
        satisfaction: userFeedback?.satisfaction
      });

      // Mettre à jour la mémoire utilisateur
      await this.updateUserMemory(userId, adaptations, userFeedback);
    } catch (error) {
      console.error('Failed to record contextual experience:', error);
    }
  }

  /**
   * Obtient des recommandations contextuelles personnalisées
   */
  async getPersonalizedRecommendations(
    userId: string,
    currentContext: {
      weather?: WeatherContext;
      calendar?: CalendarContext;
      seasonal?: SeasonalContext;
      promotions?: PromotionsContext;
    }
  ): Promise<CipherContextualRecommendation[]> {
    try {
      const cipherContext = {
        userId,
        sessionId: `recommend_${Date.now()}`,
        familyMode: false,
        contextData: currentContext
      };

      // Obtenir les recommandations de base
      const baseRecommendations = await this.cipher.getContextualRecommendations(
        cipherContext,
        'family_coordination'
      );

      // Enrichir avec l'historique utilisateur
      const userMemory = this.getUserMemory(userId);
      const personalizedRecommendations = this.personalizeRecommendations(
        baseRecommendations,
        userMemory,
        currentContext
      );

      return personalizedRecommendations;
    } catch (error) {
      console.error('Failed to get personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Analyse les patterns d'adaptation de l'utilisateur
   */
  async analyzeUserAdaptationPatterns(userId: string): Promise<{
    preferredAdaptations: Map<string, number>;
    rejectedPatterns: string[];
    contextSensitivity: Map<string, number>;
    insights: string[];
  }> {
    const userMemory = this.getUserMemory(userId);
    
    // Analyser les préférences
    const preferredAdaptations = new Map<string, number>();
    const rejectedPatterns: string[] = [];
    const contextSensitivity = new Map<string, number>();

    // Parcourir l'historique
    userMemory.adaptationHistory.forEach(adaptation => {
      const key = `${adaptation.type}_${adaptation.reason}`;
      
      // Compter les acceptations
      if (userMemory.satisfactionScores.get(key)! >= 3) {
        preferredAdaptations.set(
          adaptation.type,
          (preferredAdaptations.get(adaptation.type) || 0) + 1
        );
      } else {
        rejectedPatterns.push(key);
      }
    });

    // Calculer la sensibilité contextuelle
    const totalAdaptations = userMemory.adaptationHistory.length;
    ['weather', 'schedule', 'seasonal', 'promotion'].forEach(type => {
      const typeCount = userMemory.adaptationHistory.filter(a => a.type === type).length;
      contextSensitivity.set(type, typeCount / totalAdaptations);
    });

    // Générer des insights
    const insights = this.generateUserInsights(
      preferredAdaptations,
      rejectedPatterns,
      contextSensitivity
    );

    return {
      preferredAdaptations,
      rejectedPatterns,
      contextSensitivity,
      insights
    };
  }

  /**
   * Optimise les futures adaptations basées sur l'apprentissage
   */
  async optimizeAdaptationStrategy(
    userId: string,
    proposedAdaptations: AdaptationLog[]
  ): Promise<AdaptationLog[]> {
    const userMemory = this.getUserMemory(userId);
    const analysis = await this.analyzeUserAdaptationPatterns(userId);
    
    // Filtrer et réordonner les adaptations
    const optimizedAdaptations = proposedAdaptations
      .filter(adaptation => {
        // Éviter les patterns rejetés
        const pattern = `${adaptation.type}_${adaptation.reason}`;
        return !analysis.rejectedPatterns.includes(pattern);
      })
      .sort((a, b) => {
        // Prioriser selon les préférences utilisateur
        const aPreference = analysis.preferredAdaptations.get(a.type) || 0;
        const bPreference = analysis.preferredAdaptations.get(b.type) || 0;
        
        // Puis par confiance
        if (aPreference === bPreference) {
          return b.confidence - a.confidence;
        }
        
        return bPreference - aPreference;
      });

    // Limiter selon l'historique utilisateur
    const maxAdaptations = this.calculateOptimalAdaptationCount(userMemory);
    
    return optimizedAdaptations.slice(0, maxAdaptations);
  }

  /**
   * Prédit l'acceptation d'une adaptation
   */
  async predictAdaptationAcceptance(
    userId: string,
    adaptation: AdaptationLog
  ): Promise<{
    probability: number;
    reasoning: string;
    confidence: number;
  }> {
    const userMemory = this.getUserMemory(userId);
    const analysis = await this.analyzeUserAdaptationPatterns(userId);
    
    // Facteurs de prédiction
    let probability = 0.5; // Base
    let confidence = 0.5;
    const reasons: string[] = [];
    
    // Historique du type d'adaptation
    const typePreference = analysis.preferredAdaptations.get(adaptation.type) || 0;
    const totalOfType = userMemory.adaptationHistory.filter(a => a.type === adaptation.type).length;
    
    if (totalOfType > 0) {
      probability = typePreference / totalOfType;
      confidence += 0.2;
      reasons.push(`Type ${adaptation.type}: ${Math.round(probability * 100)}% d'acceptation historique`);
    }
    
    // Pattern similaires
    const similarPatterns = userMemory.adaptationHistory.filter(a => 
      a.type === adaptation.type && 
      this.calculateSimilarity(a.reason, adaptation.reason) > 0.7
    );
    
    if (similarPatterns.length > 0) {
      const acceptedSimilar = similarPatterns.filter(a => {
        const key = `${a.type}_${a.reason}`;
        return (userMemory.satisfactionScores.get(key) || 0) >= 3;
      }).length;
      
      const similarAcceptance = acceptedSimilar / similarPatterns.length;
      probability = (probability + similarAcceptance) / 2;
      confidence += 0.3;
      reasons.push(`Patterns similaires: ${Math.round(similarAcceptance * 100)}% acceptés`);
    }
    
    // Ajuster selon les économies
    if (adaptation.savings && adaptation.savings > 0) {
      probability += 0.1;
      reasons.push(`Économies de ${adaptation.savings}€`);
    }
    
    // Limiter entre 0 et 1
    probability = Math.max(0, Math.min(1, probability));
    confidence = Math.max(0, Math.min(1, confidence));
    
    return {
      probability,
      reasoning: reasons.join('. '),
      confidence
    };
  }

  /**
   * Intègre le contexte famille dans Cipher
   */
  async integrateFamilyContext(
    familyId: string,
    familyMembers: string[],
    familyAdaptations: Map<string, AdaptationLog[]>,
    familyFeedback: Map<string, { accepted: boolean; satisfaction: number }>
  ): Promise<void> {
    try {
      // Enregistrer les adaptations famille
      const familyData = {
        members: familyMembers,
        adaptations: Array.from(familyAdaptations.entries()).map(([memberId, adaptations]) => ({
          memberId,
          adaptations,
          feedback: familyFeedback.get(memberId)
        })),
        consensusReached: this.calculateFamilyConsensus(familyFeedback)
      };

      await this.cipher.integrateFamilyModeData(familyId, {
        members: familyMembers.map(id => ({ id, name: `Member ${id}`, preferences: {} })),
        interactions: [],
        conflicts: this.detectFamilyConflicts(familyAdaptations, familyFeedback)
      });
    } catch (error) {
      console.error('Failed to integrate family context:', error);
    }
  }

  /**
   * Génère des recommandations pour résoudre les conflits famille
   */
  async getFamilyConflictResolutions(
    familyId: string,
    conflictingAdaptations: AdaptationLog[]
  ): Promise<{
    compromises: AdaptationLog[];
    votingRequired: boolean;
    alternativeSolutions: AdaptationLog[][];
  }> {
    // Analyser les conflits
    const conflictTypes = [...new Set(conflictingAdaptations.map(a => a.type))];
    
    // Générer des compromis
    const compromises = await this.generateCompromises(conflictingAdaptations);
    
    // Déterminer si un vote est nécessaire
    const votingRequired = conflictTypes.length > 2 || 
                          conflictingAdaptations.some(a => a.confidence < 0.6);
    
    // Générer des solutions alternatives
    const alternativeSolutions = await this.generateAlternativeSolutions(
      conflictingAdaptations,
      3 // 3 alternatives
    );
    
    return {
      compromises,
      votingRequired,
      alternativeSolutions
    };
  }

  // === MÉTHODES PRIVÉES ===

  private getUserMemory(userId: string): ContextualCipherMemory {
    if (!this.userMemories.has(userId)) {
      this.userMemories.set(userId, {
        userId,
        contextPreferences: new Map(),
        adaptationHistory: [],
        satisfactionScores: new Map(),
        learningInsights: {
          preferredAdaptations: [],
          rejectedPatterns: [],
          contextSensitivity: new Map()
        }
      });
    }
    return this.userMemories.get(userId)!;
  }

  private async updateUserMemory(
    userId: string,
    adaptations: AdaptationLog[],
    feedback?: any
  ): Promise<void> {
    const memory = this.getUserMemory(userId);
    
    // Ajouter à l'historique
    memory.adaptationHistory.push(...adaptations);
    
    // Mettre à jour les scores de satisfaction
    if (feedback?.satisfaction) {
      adaptations.forEach(adaptation => {
        const key = `${adaptation.type}_${adaptation.reason}`;
        memory.satisfactionScores.set(key, feedback.satisfaction);
      });
    }
    
    // Limiter la taille de l'historique
    if (memory.adaptationHistory.length > 1000) {
      memory.adaptationHistory = memory.adaptationHistory.slice(-500);
    }
  }

  private summarizeContext(context: any): any {
    return {
      weather: context.weather ? {
        avgTemp: context.weather.analysis.avgTemp,
        rainyDays: context.weather.analysis.rainyDays,
        extremeCount: context.weather.analysis.extremeWeather.length
      } : null,
      calendar: context.calendar ? {
        busyScore: context.calendar.overallBusyScore,
        specialEvents: context.calendar.specialOccasions.length
      } : null,
      seasonal: context.seasonal ? {
        season: context.seasonal.currentSeason,
        inSeasonCount: context.seasonal.inSeasonProducts.length
      } : null,
      promotions: context.promotions ? {
        totalSavings: context.promotions.totalSavingsPotential,
        bestDealsCount: context.promotions.bestDeals.length
      } : null
    };
  }

  private personalizeRecommendations(
    baseRecommendations: any[],
    userMemory: ContextualCipherMemory,
    currentContext: any
  ): CipherContextualRecommendation[] {
    return baseRecommendations.map(rec => {
      // Déterminer le type de contexte
      let contextType: 'weather' | 'schedule' | 'seasonal' | 'promotion' = 'weather';
      
      if (rec.recommendation.includes('météo') || rec.recommendation.includes('température')) {
        contextType = 'weather';
      } else if (rec.recommendation.includes('planning') || rec.recommendation.includes('agenda')) {
        contextType = 'schedule';
      } else if (rec.recommendation.includes('saison') || rec.recommendation.includes('produit')) {
        contextType = 'seasonal';
      } else if (rec.recommendation.includes('promotion') || rec.recommendation.includes('économie')) {
        contextType = 'promotion';
      }
      
      // Ajuster la confiance selon l'historique utilisateur
      const historicalPreference = userMemory.learningInsights.contextSensitivity.get(contextType) || 0.5;
      const adjustedConfidence = rec.confidence * (0.5 + historicalPreference * 0.5);
      
      return {
        contextType,
        recommendation: rec.recommendation,
        confidence: adjustedConfidence,
        reasoning: rec.reasoning,
        adaptationType: this.mapToAdaptationType(rec.recommendation)
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }

  private mapToAdaptationType(recommendation: string): string {
    // Logique de mapping
    return 'cipher_suggestion';
  }

  private generateUserInsights(
    preferredAdaptations: Map<string, number>,
    rejectedPatterns: string[],
    contextSensitivity: Map<string, number>
  ): string[] {
    const insights: string[] = [];
    
    // Préférences principales
    const topPreference = Array.from(preferredAdaptations.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topPreference) {
      insights.push(`Préfère les adaptations ${topPreference[0]} (${topPreference[1]} acceptées)`);
    }
    
    // Sensibilité contextuelle
    const highSensitivity = Array.from(contextSensitivity.entries())
      .filter(([_, value]) => value > 0.3)
      .map(([type]) => type);
    
    if (highSensitivity.length > 0) {
      insights.push(`Très sensible à: ${highSensitivity.join(', ')}`);
    }
    
    // Patterns rejetés
    if (rejectedPatterns.length > 3) {
      insights.push(`Tendance à rejeter ${rejectedPatterns.length} types d'adaptations`);
    }
    
    return insights;
  }

  private calculateOptimalAdaptationCount(memory: ContextualCipherMemory): number {
    // Calculer selon l'historique de satisfaction
    const avgSatisfaction = Array.from(memory.satisfactionScores.values())
      .reduce((sum, score) => sum + score, 0) / memory.satisfactionScores.size || 3;
    
    // Plus la satisfaction est élevée, plus on peut proposer d'adaptations
    if (avgSatisfaction >= 4) return 5;
    if (avgSatisfaction >= 3) return 3;
    return 2;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Calcul simple de similarité
    const words1 = text1.toLowerCase().split(' ');
    const words2 = text2.toLowerCase().split(' ');
    
    const intersection = words1.filter(w => words2.includes(w)).length;
    const union = new Set([...words1, ...words2]).size;
    
    return intersection / union;
  }

  private calculateFamilyConsensus(
    familyFeedback: Map<string, { accepted: boolean; satisfaction: number }>
  ): boolean {
    const acceptances = Array.from(familyFeedback.values()).map(f => f.accepted);
    const acceptanceRate = acceptances.filter(a => a).length / acceptances.length;
    
    return acceptanceRate >= 0.7; // 70% d'acceptation = consensus
  }

  private detectFamilyConflicts(
    familyAdaptations: Map<string, AdaptationLog[]>,
    familyFeedback: Map<string, { accepted: boolean; satisfaction: number }>
  ): Array<{ issue: string; resolution: string; satisfaction: number }> {
    const conflicts: any[] = [];
    
    // Détecter les adaptations avec faible satisfaction
    familyFeedback.forEach((feedback, memberId) => {
      if (feedback.satisfaction < 3) {
        const adaptations = familyAdaptations.get(memberId) || [];
        conflicts.push({
          issue: `Membre ${memberId} insatisfait des adaptations`,
          resolution: 'Vote familial requis',
          satisfaction: feedback.satisfaction
        });
      }
    });
    
    return conflicts;
  }

  private async generateCompromises(
    conflictingAdaptations: AdaptationLog[]
  ): Promise<AdaptationLog[]> {
    // Générer des compromis basés sur les adaptations en conflit
    const compromises: AdaptationLog[] = [];
    
    // Grouper par type
    const byType = new Map<string, AdaptationLog[]>();
    conflictingAdaptations.forEach(adaptation => {
      const existing = byType.get(adaptation.type) || [];
      existing.push(adaptation);
      byType.set(adaptation.type, existing);
    });
    
    // Créer un compromis pour chaque type
    byType.forEach((adaptations, type) => {
      // Prendre l'adaptation avec la meilleure confiance moyenne
      const avgConfidences = adaptations.map(a => a.confidence);
      const avgConfidence = avgConfidences.reduce((sum, c) => sum + c, 0) / avgConfidences.length;
      
      compromises.push({
        type: type as any,
        day: adaptations[0].day,
        original: adaptations[0].original,
        adapted: adaptations[0].adapted,
        reason: `Compromis famille: ${adaptations.map(a => a.reason).join(' + ')}`,
        confidence: avgConfidence,
        familyImpact: {
          affectedMembers: [],
          satisfaction: new Map()
        }
      });
    });
    
    return compromises;
  }

  private async generateAlternativeSolutions(
    conflictingAdaptations: AdaptationLog[],
    count: number
  ): Promise<AdaptationLog[][]> {
    const alternatives: AdaptationLog[][] = [];
    
    // Générer N solutions alternatives
    for (let i = 0; i < count; i++) {
      const alternative = conflictingAdaptations.map(adaptation => ({
        ...adaptation,
        reason: `Alternative ${i + 1}: ${adaptation.reason}`,
        confidence: adaptation.confidence * (0.8 + Math.random() * 0.2)
      }));
      
      alternatives.push(alternative);
    }
    
    return alternatives;
  }
}

// Export de l'instance
export const cipherContextIntegration = new CipherContextIntegration();