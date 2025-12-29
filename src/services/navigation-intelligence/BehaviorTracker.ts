/**
 * BehaviorTracker - Suivi comportemental granulaire pour l'IA prédictive
 * Implémente PRP-040.3 - Analytics Foundation avec events granulaires
 */

import { NavigationSection, FamilyProfile } from '@/types/family-mode';
import { cipherMemory } from '@/services/cipher/CipherMemoryService';

export interface UserInteraction {
  userId: string;
  sessionId: string;
  timestamp: Date;
  type: 'click' | 'hover' | 'scroll' | 'voice' | 'gesture' | 'navigation' | 'search' | 'error';
  target: {
    element: string;
    section: NavigationSection;
    feature?: string;
    coordinates?: { x: number; y: number };
  };
  context: {
    pageLoadTime: number;
    sessionDuration: number;
    deviceType: 'mobile' | 'tablet' | 'desktop';
    internetSpeed?: 'slow' | 'medium' | 'fast';
    batteryLevel?: number;
    familyMode?: {
      activeProfile: FamilyProfile;
      supervisionActive: boolean;
      childPresent: boolean;
    };
  };
  outcome: {
    success: boolean;
    timeToComplete?: number;
    errorMessage?: string;
    alternativeAction?: string;
  };
  metadata: {
    userAgent: string;
    viewport: { width: number; height: number };
    referrer?: string;
    searchQuery?: string;
  };
}

export interface SessionMetrics {
  sessionId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  totalInteractions: number;
  successfulInteractions: number;
  sectionsVisited: NavigationSection[];
  featuresUsed: string[];
  timeSpentPerSection: Record<NavigationSection, number>;
  bounceRate: number;
  conversionEvents: string[];
  familyModeData?: {
    activeDuration: number;
    childInteractions: number;
    parentSupervisions: number;
    safetyTriggered: boolean;
  };
  performanceMetrics: {
    averageResponseTime: number;
    slowestActions: Array<{ action: string; time: number }>;
    errorCount: number;
    crashCount: number;
  };
}

export interface BehaviorPattern {
  userId: string;
  patternType: 'temporal' | 'sequential' | 'contextual' | 'preference' | 'family';
  pattern: {
    trigger: string;
    actions: string[];
    frequency: number;
    successRate: number;
    timePattern?: {
      hourOfDay: number[];
      dayOfWeek: number[];
      seasonality?: string;
    };
    familyPattern?: {
      memberInvolved: string;
      supervisorPresent: boolean;
      adaptedInterface: boolean;
    };
  };
  confidence: number;
  lastUpdated: Date;
}

export interface AnalyticsInsight {
  type: 'usage' | 'performance' | 'discovery' | 'retention' | 'family';
  title: string;
  description: string;
  data: any;
  actionable: boolean;
  impact: 'low' | 'medium' | 'high';
  familyRelevant?: boolean;
}

export class BehaviorTracker {
  private interactions: Map<string, UserInteraction[]> = new Map();
  private sessions: Map<string, SessionMetrics> = new Map();
  private patterns: Map<string, BehaviorPattern[]> = new Map();
  private mlTrainingBuffer: UserInteraction[] = [];
  private bufferLimit = 100;
  
  constructor() {
    this.initializeTracker();
    this.startPeriodicFlush();
  }

  /**
   * Enregistre une interaction utilisateur
   */
  async trackInteraction(interaction: UserInteraction): Promise<void> {
    try {
      // Ajouter à la collection des interactions
      const userInteractions = this.interactions.get(interaction.userId) || [];
      userInteractions.push(interaction);
      this.interactions.set(interaction.userId, userInteractions);

      // Mettre à jour la session active
      await this.updateActiveSession(interaction);

      // Ajouter au buffer ML
      this.mlTrainingBuffer.push(interaction);

      // Traitement en temps réel des patterns
      await this.detectRealtimePatterns(interaction);

      // Vider le buffer si nécessaire
      if (this.mlTrainingBuffer.length >= this.bufferLimit) {
        await this.flushMLTrainingData();
      }

      // Intégration famille si applicable
      if (interaction.context.familyMode) {
        await this.trackFamilyInteraction(interaction);
      }
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  /**
   * Démarre une nouvelle session
   */
  startSession(
    userId: string,
    deviceInfo: {
      type: 'mobile' | 'tablet' | 'desktop';
      userAgent: string;
      viewport: { width: number; height: number };
    },
    familyProfile?: FamilyProfile
  ): string {
    const sessionId = `session_${userId}_${Date.now()}`;
    
    const session: SessionMetrics = {
      sessionId,
      userId,
      startTime: new Date(),
      totalInteractions: 0,
      successfulInteractions: 0,
      sectionsVisited: [],
      featuresUsed: [],
      timeSpentPerSection: {
        pantry: 0,
        kitchen: 0,
        shopping: 0,
        assistant: 0,
        insights: 0,
        games: 0,
        settings: 0,
        social: 0
      },
      bounceRate: 0,
      conversionEvents: [],
      performanceMetrics: {
        averageResponseTime: 0,
        slowestActions: [],
        errorCount: 0,
        crashCount: 0
      }
    };

    // Ajouter données famille si applicable
    if (familyProfile) {
      session.familyModeData = {
        activeDuration: 0,
        childInteractions: 0,
        parentSupervisions: 0,
        safetyTriggered: false
      };
    }

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * Termine une session et génère les métriques
   */
  async endSession(sessionId: string): Promise<SessionMetrics | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endTime = new Date();
    
    // Calculer les métriques finales
    session.bounceRate = this.calculateBounceRate(session);
    
    // Sauvegarder dans Cipher pour l'analyse
    await this.saveFinalSessionData(session);
    
    // Nettoyer de la mémoire
    this.sessions.delete(sessionId);
    
    return session;
  }

  /**
   * Analyse les patterns comportementaux
   */
  async analyzeBehaviorPatterns(userId: string): Promise<{
    patterns: BehaviorPattern[];
    insights: AnalyticsInsight[];
    recommendations: Array<{
      type: string;
      description: string;
      impact: number;
      familyRelevant: boolean;
    }>;
  }> {
    const userInteractions = this.interactions.get(userId) || [];
    
    if (userInteractions.length < 10) {
      return {
        patterns: [],
        insights: [{
          type: 'usage',
          title: 'Données insuffisantes',
          description: 'Plus d\'interactions nécessaires pour l\'analyse',
          data: { count: userInteractions.length },
          actionable: false,
          impact: 'low'
        }],
        recommendations: []
      };
    }

    // Détecter les patterns
    const patterns = await this.detectPatterns(userInteractions);
    
    // Générer les insights
    const insights = this.generateAnalyticsInsights(userInteractions, patterns);
    
    // Créer des recommandations
    const recommendations = this.generateBehaviorRecommendations(patterns, insights);

    return { patterns, insights, recommendations };
  }

  /**
   * Obtient les métriques de performance utilisateur
   */
  getUserPerformanceMetrics(userId: string): {
    efficiency: number;
    errorRate: number;
    discoveryRate: number;
    retentionScore: number;
    familyEngagement?: number;
  } {
    const userInteractions = this.interactions.get(userId) || [];
    const userSessions = Array.from(this.sessions.values()).filter(s => s.userId === userId);
    
    if (userInteractions.length === 0) {
      return {
        efficiency: 0,
        errorRate: 0,
        discoveryRate: 0,
        retentionScore: 0
      };
    }

    const efficiency = this.calculateUserEfficiency(userInteractions);
    const errorRate = this.calculateErrorRate(userInteractions);
    const discoveryRate = this.calculateDiscoveryRate(userInteractions);
    const retentionScore = this.calculateRetentionScore(userSessions);

    const metrics = {
      efficiency,
      errorRate,
      discoveryRate,
      retentionScore
    };

    // Ajouter métriques famille si applicable
    const familyInteractions = userInteractions.filter(i => i.context.familyMode);
    if (familyInteractions.length > 0) {
      (metrics as any).familyEngagement = this.calculateFamilyEngagement(familyInteractions);
    }

    return metrics;
  }

  // === MÉTHODES PRIVÉES ===

  private initializeTracker(): void {
    // Charger les données depuis le cache si disponible
    if (typeof localStorage !== 'undefined') {
      try {
        const cachedInteractions = localStorage.getItem('behavior_interactions');
        if (cachedInteractions) {
          const data = JSON.parse(cachedInteractions);
          this.interactions = new Map(data);
        }
      } catch (error) {
        console.warn('Failed to load interactions from cache:', error);
      }
    }
  }

  private startPeriodicFlush(): void {
    // Vider le buffer toutes les 5 minutes
    setInterval(async () => {
      if (this.mlTrainingBuffer.length > 0) {
        await this.flushMLTrainingData();
      }
      await this.cleanupOldData();
    }, 5 * 60 * 1000);
  }

  private async updateActiveSession(interaction: UserInteraction): Promise<void> {
    // Trouver la session active pour cet utilisateur
    const activeSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === interaction.userId && !s.endTime);
    
    const session = activeSessions[activeSessions.length - 1]; // Plus récente
    if (!session) return;

    // Mettre à jour les métriques
    session.totalInteractions++;
    
    if (interaction.outcome.success) {
      session.successfulInteractions++;
    } else {
      session.performanceMetrics.errorCount++;
    }

    // Tracker les sections visitées
    if (!session.sectionsVisited.includes(interaction.target.section)) {
      session.sectionsVisited.push(interaction.target.section);
    }

    // Tracker les fonctionnalités utilisées
    if (interaction.target.feature && !session.featuresUsed.includes(interaction.target.feature)) {
      session.featuresUsed.push(interaction.target.feature);
    }

    // Temps passé par section
    const sectionTime = session.timeSpentPerSection[interaction.target.section] || 0;
    session.timeSpentPerSection[interaction.target.section] = sectionTime + (interaction.outcome.timeToComplete || 1);

    // Métriques de performance
    if (interaction.outcome.timeToComplete) {
      const currentAvg = session.performanceMetrics.averageResponseTime;
      const count = session.totalInteractions;
      session.performanceMetrics.averageResponseTime = 
        (currentAvg * (count - 1) + interaction.outcome.timeToComplete) / count;
      
      // Tracker les actions les plus lentes
      if (interaction.outcome.timeToComplete > 3000) { // Plus de 3 secondes
        session.performanceMetrics.slowestActions.push({
          action: `${interaction.target.section}_${interaction.type}`,
          time: interaction.outcome.timeToComplete
        });
      }
    }

    // Données famille
    if (interaction.context.familyMode && session.familyModeData) {
      if (interaction.context.familyMode.activeProfile.type === 'child') {
        session.familyModeData.childInteractions++;
      }
      
      if (interaction.context.familyMode.supervisionActive) {
        session.familyModeData.parentSupervisions++;
      }
    }
  }

  private async detectRealtimePatterns(interaction: UserInteraction): Promise<void> {
    const userInteractions = this.interactions.get(interaction.userId) || [];
    
    // Pattern de navigation séquentielle (minimum 3 interactions récentes)
    if (userInteractions.length >= 3) {
      const recent = userInteractions.slice(-3);
      const navigationSequence = recent
        .filter(i => i.type === 'navigation')
        .map(i => i.target.section);

      if (navigationSequence.length === 3) {
        await this.recordNavigationPattern(interaction.userId, navigationSequence);
      }
    }

    // Pattern d'erreur récurrente
    const recentErrors = userInteractions
      .slice(-10)
      .filter(i => !i.outcome.success);

    if (recentErrors.length >= 3) {
      await this.recordErrorPattern(interaction.userId, recentErrors);
    }

    // Pattern temporel
    const hour = interaction.timestamp.getHours();
    const sameHourInteractions = userInteractions.filter(i => 
      i.timestamp.getHours() === hour && 
      i.target.section === interaction.target.section
    );

    if (sameHourInteractions.length >= 5) {
      await this.recordTemporalPattern(interaction.userId, interaction.target.section, hour);
    }
  }

  private async flushMLTrainingData(): Promise<void> {
    try {
      if (this.mlTrainingBuffer.length === 0) return;

      // Préparer les données pour l'entraînement ML
      const trainingData = this.mlTrainingBuffer.map(interaction => ({
        userId: interaction.userId,
        timestamp: interaction.timestamp.getTime(),
        features: this.extractMLFeatures(interaction),
        labels: this.extractMLLabels(interaction)
      }));

      // Envoyer à l'API ML (ou Cipher)
      await this.sendToMLPipeline(trainingData);

      // Vider le buffer
      this.mlTrainingBuffer = [];
      
      console.log(`📊 Flushed ${trainingData.length} interactions to ML pipeline`);
    } catch (error) {
      console.error('Failed to flush ML training data:', error);
    }
  }

  private extractMLFeatures(interaction: UserInteraction): number[] {
    return [
      interaction.timestamp.getHours() / 24, // Heure normalisée
      interaction.timestamp.getDay() / 7, // Jour normalisé
      this.encodeInteractionType(interaction.type),
      this.encodeSectionType(interaction.target.section),
      interaction.context.sessionDuration / 3600, // Session en heures
      interaction.context.pageLoadTime / 1000, // Load time en secondes
      interaction.context.familyMode ? 1 : 0, // Mode famille actif
      interaction.context.familyMode?.activeProfile.type === 'child' ? 1 : 0
    ];
  }

  private extractMLLabels(interaction: UserInteraction): number[] {
    return [
      interaction.outcome.success ? 1 : 0,
      (interaction.outcome.timeToComplete || 0) / 1000,
      interaction.outcome.errorMessage ? 1 : 0
    ];
  }

  private encodeInteractionType(type: UserInteraction['type']): number {
    const typeMap = {
      'click': 0.1, 'hover': 0.2, 'scroll': 0.3, 'voice': 0.4,
      'gesture': 0.5, 'navigation': 0.6, 'search': 0.7, 'error': 0.8
    };
    return typeMap[type] || 0;
  }

  private encodeSectionType(section: NavigationSection): number {
    const sectionMap: Record<NavigationSection, number> = {
      'pantry': 0.1, 'kitchen': 0.2, 'shopping': 0.3,
      'assistant': 0.4, 'insights': 0.5, 'games': 0.6,
      'settings': 0.7, 'social': 0.8
    };
    return sectionMap[section] || 0;
  }

  private async sendToMLPipeline(trainingData: any[]): Promise<void> {
    try {
      // Intégrer avec Cipher pour le stockage et l'apprentissage
      await cipherMemory.recordBehaviorData('ml_training', {
        dataCount: trainingData.length,
        features: trainingData.map(d => d.features),
        labels: trainingData.map(d => d.labels),
        timestamp: new Date()
      });

      // En production, envoyer aussi à un service ML externe
      // await fetch('/api/ml/training-data', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(trainingData)
      // });
    } catch (error) {
      console.error('Failed to send to ML pipeline:', error);
    }
  }

  private async recordNavigationPattern(
    userId: string,
    sequence: NavigationSection[]
  ): Promise<void> {
    const userPatterns = this.patterns.get(userId) || [];
    const patternKey = sequence.join('->');
    
    const existing = userPatterns.find(p => 
      p.patternType === 'sequential' && 
      p.pattern.trigger === patternKey
    );

    if (existing) {
      existing.pattern.frequency++;
      existing.lastUpdated = new Date();
    } else {
      userPatterns.push({
        userId,
        patternType: 'sequential',
        pattern: {
          trigger: patternKey,
          actions: sequence,
          frequency: 1,
          successRate: 1.0, // Will be calculated later
          timePattern: {
            hourOfDay: [new Date().getHours()],
            dayOfWeek: [new Date().getDay()]
          }
        },
        confidence: 0.5,
        lastUpdated: new Date()
      });
    }

    this.patterns.set(userId, userPatterns);
  }

  private async recordErrorPattern(
    userId: string,
    errors: UserInteraction[]
  ): Promise<void> {
    const errorTypes = errors.map(e => e.outcome.errorMessage || 'unknown');
    const commonError = this.findMostFrequent(errorTypes);
    
    if (commonError) {
      await cipherMemory.recordBehaviorData('error_pattern', {
        userId,
        errorType: commonError,
        frequency: errorTypes.filter(e => e === commonError).length,
        context: errors[0].context,
        timestamp: new Date()
      });
    }
  }

  private async recordTemporalPattern(
    userId: string,
    section: NavigationSection,
    hour: number
  ): Promise<void> {
    const userPatterns = this.patterns.get(userId) || [];
    const patternKey = `${section}_hour_${hour}`;
    
    const existing = userPatterns.find(p => 
      p.patternType === 'temporal' && 
      p.pattern.trigger === patternKey
    );

    if (existing) {
      existing.pattern.frequency++;
    } else {
      userPatterns.push({
        userId,
        patternType: 'temporal',
        pattern: {
          trigger: patternKey,
          actions: [section],
          frequency: 1,
          successRate: 1.0,
          timePattern: {
            hourOfDay: [hour],
            dayOfWeek: [new Date().getDay()]
          }
        },
        confidence: 0.6,
        lastUpdated: new Date()
      });
    }

    this.patterns.set(userId, userPatterns);
  }

  private async trackFamilyInteraction(interaction: UserInteraction): Promise<void> {
    if (!interaction.context.familyMode) return;

    const { activeProfile, supervisionActive, childPresent } = interaction.context.familyMode;

    // Enregistrer l'interaction famille dans Cipher
    await cipherMemory.recordBehaviorData('family_interaction', {
      userId: interaction.userId,
      profileType: activeProfile.type,
      profileAge: activeProfile.age,
      supervisionActive,
      childPresent,
      interaction: {
        type: interaction.type,
        section: interaction.target.section,
        success: interaction.outcome.success
      },
      timestamp: new Date()
    });

    // Patterns famille spécifiques
    if (activeProfile.type === 'child') {
      await this.recordChildBehaviorPattern(interaction);
    }
  }

  private async recordChildBehaviorPattern(interaction: UserInteraction): Promise<void> {
    const childProfile = interaction.context.familyMode?.activeProfile;
    if (!childProfile || childProfile.type !== 'child') return;

    const userPatterns = this.patterns.get(interaction.userId) || [];
    
    userPatterns.push({
      userId: interaction.userId,
      patternType: 'family',
      pattern: {
        trigger: `child_${interaction.target.section}`,
        actions: [interaction.type],
        frequency: 1,
        successRate: interaction.outcome.success ? 1 : 0,
        familyPattern: {
          memberInvolved: childProfile.id,
          supervisorPresent: interaction.context.familyMode?.supervisionActive || false,
          adaptedInterface: true
        }
      },
      confidence: 0.7,
      lastUpdated: new Date()
    });

    this.patterns.set(interaction.userId, userPatterns);
  }

  private calculateBounceRate(session: SessionMetrics): number {
    if (session.totalInteractions <= 1) return 1.0;
    if (session.sectionsVisited.length <= 1) return 0.8;
    
    const sessionDuration = session.endTime && session.startTime ? 
      (session.endTime.getTime() - session.startTime.getTime()) / 1000 : 0;
    
    if (sessionDuration < 30) return 0.9; // Moins de 30 secondes
    if (sessionDuration < 120) return 0.5; // Moins de 2 minutes
    
    return 0.1; // Session engagée
  }

  private async detectPatterns(interactions: UserInteraction[]): Promise<BehaviorPattern[]> {
    const patterns: BehaviorPattern[] = [];
    
    // Pattern de navigation fréquente
    const navigationCounts = new Map<string, number>();
    interactions
      .filter(i => i.type === 'navigation')
      .forEach(i => {
        const key = i.target.section;
        navigationCounts.set(key, (navigationCounts.get(key) || 0) + 1);
      });

    // Créer des patterns pour les sections fréquemment visitées
    navigationCounts.forEach((count, section) => {
      if (count >= 5) { // Seuil de fréquence
        patterns.push({
          userId: interactions[0].userId,
          patternType: 'preference',
          pattern: {
            trigger: `frequent_${section}`,
            actions: [section],
            frequency: count,
            successRate: this.calculateSectionSuccessRate(interactions, section as NavigationSection)
          },
          confidence: Math.min(0.9, count / 20),
          lastUpdated: new Date()
        });
      }
    });

    return patterns;
  }

  private calculateSectionSuccessRate(
    interactions: UserInteraction[],
    section: NavigationSection
  ): number {
    const sectionInteractions = interactions.filter(i => i.target.section === section);
    if (sectionInteractions.length === 0) return 0;
    
    const successful = sectionInteractions.filter(i => i.outcome.success).length;
    return successful / sectionInteractions.length;
  }

  private generateAnalyticsInsights(
    interactions: UserInteraction[],
    patterns: BehaviorPattern[]
  ): AnalyticsInsight[] {
    const insights: AnalyticsInsight[] = [];
    
    // Insight d'utilisation
    const totalTime = interactions.reduce((sum, i) => 
      sum + (i.outcome.timeToComplete || 0), 0
    ) / 1000 / 60; // Minutes
    
    insights.push({
      type: 'usage',
      title: 'Temps d\'utilisation',
      description: `${totalTime.toFixed(1)} minutes d'utilisation active`,
      data: { totalMinutes: totalTime, interactionCount: interactions.length },
      actionable: false,
      impact: 'low'
    });

    // Insight de performance
    const avgResponseTime = interactions
      .filter(i => i.outcome.timeToComplete)
      .reduce((sum, i) => sum + (i.outcome.timeToComplete || 0), 0) / interactions.length;
    
    if (avgResponseTime > 2000) { // Plus de 2 secondes
      insights.push({
        type: 'performance',
        title: 'Performance lente détectée',
        description: `Temps de réponse moyen: ${(avgResponseTime / 1000).toFixed(1)}s`,
        data: { averageTime: avgResponseTime, threshold: 2000 },
        actionable: true,
        impact: 'medium'
      });
    }

    // Insight de découverte
    const uniqueFeatures = new Set(
      interactions
        .filter(i => i.target.feature)
        .map(i => i.target.feature!)
    ).size;
    
    if (uniqueFeatures < 5) {
      insights.push({
        type: 'discovery',
        title: 'Exploration limitée',
        description: `Seulement ${uniqueFeatures} fonctionnalités utilisées`,
        data: { featuresUsed: uniqueFeatures, potentialFeatures: 20 },
        actionable: true,
        impact: 'high'
      });
    }

    // Insight famille
    const familyInteractions = interactions.filter(i => i.context.familyMode);
    if (familyInteractions.length > 0) {
      const childInteractions = familyInteractions.filter(i => 
        i.context.familyMode?.activeProfile.type === 'child'
      ).length;
      
      insights.push({
        type: 'family',
        title: 'Activité famille',
        description: `${childInteractions} interactions enfant sur ${familyInteractions.length} en mode famille`,
        data: { childInteractions, totalFamilyInteractions: familyInteractions.length },
        actionable: true,
        impact: 'medium',
        familyRelevant: true
      });
    }

    return insights;
  }

  private generateBehaviorRecommendations(
    patterns: BehaviorPattern[],
    insights: AnalyticsInsight[]
  ): Array<{ type: string; description: string; impact: number; familyRelevant: boolean }> {
    const recommendations: Array<{ type: string; description: string; impact: number; familyRelevant: boolean }> = [];

    // Recommandations basées sur les patterns fréquents
    const frequentPatterns = patterns.filter(p => p.pattern.frequency >= 10);
    frequentPatterns.forEach(pattern => {
      recommendations.push({
        type: 'workflow_optimization',
        description: `Créer un raccourci pour ${pattern.pattern.trigger}`,
        impact: 0.7,
        familyRelevant: pattern.patternType === 'family'
      });
    });

    // Recommandations basées sur les insights performance
    const performanceInsights = insights.filter(i => i.type === 'performance' && i.impact === 'medium');
    performanceInsights.forEach(insight => {
      recommendations.push({
        type: 'performance_improvement',
        description: 'Optimiser les actions lentes pour améliorer l\'expérience',
        impact: 0.8,
        familyRelevant: false
      });
    });

    // Recommandations basées sur la découverte
    const discoveryInsights = insights.filter(i => i.type === 'discovery');
    discoveryInsights.forEach(insight => {
      recommendations.push({
        type: 'feature_discovery',
        description: 'Guide de découverte des fonctionnalités avancées',
        impact: 0.6,
        familyRelevant: true
      });
    });

    return recommendations.sort((a, b) => b.impact - a.impact);
  }

  private calculateUserEfficiency(interactions: UserInteraction[]): number {
    if (interactions.length === 0) return 0;

    const successful = interactions.filter(i => i.outcome.success).length;
    const successRate = successful / interactions.length;

    const avgTime = interactions
      .filter(i => i.outcome.timeToComplete)
      .reduce((sum, i) => sum + (i.outcome.timeToComplete || 0), 0) / interactions.length;

    // Combiner taux de succès et rapidité
    const timeScore = Math.max(0, 1 - (avgTime / 10000)); // 10s = score 0
    return (successRate * 0.7 + timeScore * 0.3);
  }

  private calculateErrorRate(interactions: UserInteraction[]): number {
    if (interactions.length === 0) return 0;
    const errors = interactions.filter(i => !i.outcome.success).length;
    return errors / interactions.length;
  }

  private calculateDiscoveryRate(interactions: UserInteraction[]): number {
    const uniqueFeatures = new Set(
      interactions
        .filter(i => i.target.feature)
        .map(i => i.target.feature!)
    ).size;
    
    const totalPossibleFeatures = 50; // Estimation
    return Math.min(1.0, uniqueFeatures / totalPossibleFeatures);
  }

  private calculateRetentionScore(sessions: SessionMetrics[]): number {
    if (sessions.length <= 1) return 0;
    
    // Calculer l'engagement basé sur les sessions récentes
    const recentSessions = sessions
      .filter(s => s.startTime.getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)) // 7 jours
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    if (recentSessions.length === 0) return 0;

    const avgSessionDuration = recentSessions.reduce((sum, s) => {
      const duration = s.endTime ? 
        (s.endTime.getTime() - s.startTime.getTime()) / 1000 / 60 : 0;
      return sum + duration;
    }, 0) / recentSessions.length;

    return Math.min(1.0, avgSessionDuration / 30); // 30 minutes = score max
  }

  private calculateFamilyEngagement(familyInteractions: UserInteraction[]): number {
    const childInteractions = familyInteractions.filter(i => 
      i.context.familyMode?.activeProfile.type === 'child'
    );
    
    const childSuccessRate = childInteractions.length > 0 ? 
      childInteractions.filter(i => i.outcome.success).length / childInteractions.length : 0;
    
    const supervisionRate = familyInteractions.filter(i => 
      i.context.familyMode?.supervisionActive
    ).length / familyInteractions.length;

    // Combiner succès enfant et niveau de supervision approprié
    return (childSuccessRate * 0.7 + (1 - supervisionRate) * 0.3);
  }

  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Garder 30 jours

    // Nettoyer les interactions anciennes
    this.interactions.forEach((interactions, userId) => {
      const recent = interactions.filter(i => i.timestamp > cutoffDate);
      if (recent.length !== interactions.length) {
        this.interactions.set(userId, recent);
      }
    });

    // Nettoyer les patterns anciens
    this.patterns.forEach((patterns, userId) => {
      const recent = patterns.filter(p => p.lastUpdated > cutoffDate);
      if (recent.length !== patterns.length) {
        this.patterns.set(userId, recent);
      }
    });
  }

  private async saveFinalSessionData(session: SessionMetrics): Promise<void> {
    try {
      await cipherMemory.recordBehaviorData('session_complete', {
        sessionData: {
          duration: session.endTime && session.startTime ? 
            (session.endTime.getTime() - session.startTime.getTime()) / 1000 : 0,
          interactions: session.totalInteractions,
          successRate: session.successfulInteractions / session.totalInteractions,
          sectionsVisited: session.sectionsVisited,
          featuresUsed: session.featuresUsed,
          familyMode: !!session.familyModeData
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to save session data:', error);
    }
  }

  private findMostFrequent<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    
    const counts = new Map<T, number>();
    array.forEach(item => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });
    
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }
}

// Export singleton
export const behaviorTracker = new BehaviorTracker();