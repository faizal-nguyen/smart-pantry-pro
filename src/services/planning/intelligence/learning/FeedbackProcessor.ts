/**
 * Feedback Processor
 * Traite le feedback utilisateur pour améliorer les recommandations
 */

import {
  UserFeedback,
  CollectedFeedback,
  LearningOutcome,
  Pattern,
  PatternType
} from '../types';
import { WeeklyMealPlan, MealPlanEntry } from '../../types';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackAnalysis {
  overallSatisfaction: number;
  problemAreas: ProblemArea[];
  successPatterns: Pattern[];
  improvementAreas: string[];
}

interface ProblemArea {
  aspect: 'taste' | 'difficulty' | 'time' | 'cost' | 'health';
  severity: number;
  frequency: number;
  examples: string[];
}

interface LearningUpdate {
  type: 'preference' | 'constraint' | 'pattern';
  data: any;
  confidence: number;
}

export class FeedbackProcessor {
  private learningThreshold = 0.7;
  private patternMinOccurrences = 3;
  
  /**
   * Traite le feedback collecté pour un plan de repas
   */
  async processFeedback(
    feedback: CollectedFeedback,
    plan: WeeklyMealPlan,
    userId: string
  ): Promise<LearningOutcome> {
    console.log('📊 Processing feedback for plan:', feedback.planId);
    
    // 1. Analyser le feedback global
    const analysis = await this.analyzeFeedback(feedback, plan);
    
    // 2. Identifier les patterns d'échec et de succès
    const patterns = await this.identifyPatterns(analysis, feedback, userId);
    
    // 3. Générer des mises à jour d'apprentissage
    const learningUpdates = this.generateLearningUpdates(analysis, patterns);
    
    // 4. Appliquer les mises à jour
    const modelUpdated = await this.applyLearningUpdates(learningUpdates, userId);
    
    // 5. Calculer l'amélioration de confiance
    const confidenceImprovement = this.calculateConfidenceImprovement(
      analysis,
      patterns.length
    );
    
    // 6. Enregistrer les résultats d'apprentissage
    await this.recordLearningOutcome(feedback.planId, {
      modelUpdated,
      patternsLearned: patterns.length,
      recommendationAdjustments: learningUpdates,
      confidenceImprovement
    });
    
    return {
      modelUpdated,
      patternsLearned: patterns.length,
      recommendationAdjustments: learningUpdates,
      confidenceImprovement
    };
  }
  
  /**
   * Collecte le feedback explicite de l'utilisateur
   */
  async collectExplicitFeedback(
    mealId: string,
    userId: string,
    feedback: UserFeedback
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('meal_planning_analytics')
        .insert({
          user_id: userId,
          plan_id: mealId,
          event_type: 'explicit_feedback',
          event_data: {
            feedback,
            timestamp: new Date().toISOString()
          }
        });
      
      if (error) throw error;
      
      // Traitement immédiat pour feedback critique
      if (feedback.sentiment === 'negative' && 
          feedback.aspectRatings && 
          Object.values(feedback.aspectRatings).some(rating => rating <= 2)) {
        await this.processImmediateFeedback(mealId, userId, feedback);
      }
      
    } catch (error) {
      console.error('Error collecting explicit feedback:', error);
    }
  }
  
  /**
   * Traque la complétion des repas (feedback implicite)
   */
  async trackMealCompletion(
    mealId: string,
    userId: string,
    completed: boolean,
    leftoverPercentage?: number
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('meal_planning_analytics')
        .insert({
          user_id: userId,
          plan_id: mealId,
          event_type: 'meal_completion',
          event_data: {
            completed,
            leftoverPercentage: leftoverPercentage || 0,
            timestamp: new Date().toISOString()
          }
        });
      
      if (error) throw error;
      
      // Inférer satisfaction du taux de complétion
      if (!completed) {
        await this.processImplicitNegativeFeedback(mealId, userId, 'not_completed');
      } else if (leftoverPercentage && leftoverPercentage > 50) {
        await this.processImplicitNegativeFeedback(mealId, userId, 'too_much_leftover');
      }
      
    } catch (error) {
      console.error('Error tracking meal completion:', error);
    }
  }
  
  /**
   * Traque le temps de cuisine réel vs estimé
   */
  async trackCookingTime(
    mealId: string,
    userId: string,
    estimatedTime: number,
    actualTime: number
  ): Promise<void> {
    try {
      const timeDeviation = (actualTime - estimatedTime) / estimatedTime;
      
      const { error } = await supabase
        .from('meal_planning_analytics')
        .insert({
          user_id: userId,
          plan_id: mealId,
          event_type: 'cooking_time',
          event_data: {
            estimatedTime,
            actualTime,
            deviation: timeDeviation,
            timestamp: new Date().toISOString()
          }
        });
      
      if (error) throw error;
      
      // Si dépassement significatif, traiter comme feedback négatif
      if (timeDeviation > 0.5) { // 50% de dépassement
        await this.processImplicitNegativeFeedback(mealId, userId, 'time_exceeded');
      }
      
    } catch (error) {
      console.error('Error tracking cooking time:', error);
    }
  }
  
  /**
   * Analyse le feedback collecté
   */
  private async analyzeFeedback(
    feedback: CollectedFeedback,
    plan: WeeklyMealPlan
  ): Promise<FeedbackAnalysis> {
    const problemAreas: ProblemArea[] = [];
    
    // Analyser chaque aspect du feedback
    const aspects = ['taste', 'difficulty', 'time', 'cost', 'health'] as const;
    
    aspects.forEach(aspect => {
      const scores = Object.values(feedback.mealFeedback)
        .filter(f => f.aspectRatings?.[aspect])
        .map(f => f.aspectRatings![aspect]);
      
      if (scores.length > 0) {
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const problemCount = scores.filter(score => score <= 2).length;
        
        if (averageScore < 3 || problemCount > scores.length * 0.3) {
          problemAreas.push({
            aspect,
            severity: 3 - averageScore,
            frequency: problemCount / scores.length,
            examples: this.getProblematicMeals(feedback, aspect)
          });
        }
      }
    });
    
    // Identifier les patterns de succès
    const successPatterns = await this.identifySuccessPatterns(feedback, plan);
    
    // Identifier les domaines d'amélioration
    const improvementAreas = this.identifyImprovementAreas(problemAreas);
    
    return {
      overallSatisfaction: feedback.overallSatisfaction,
      problemAreas,
      successPatterns,
      improvementAreas
    };
  }
  
  /**
   * Identifie les patterns dans le feedback
   */
  private async identifyPatterns(
    analysis: FeedbackAnalysis,
    feedback: CollectedFeedback,
    userId: string
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    // Pattern de rotation de cuisine
    const cuisinePattern = await this.identifyCuisineRotationPattern(feedback, userId);
    if (cuisinePattern) patterns.push(cuisinePattern);
    
    // Pattern de préférence temporelle
    const timePattern = await this.identifyTimePreferencePattern(feedback, userId);
    if (timePattern) patterns.push(timePattern);
    
    // Pattern de complexité progressive
    const complexityPattern = await this.identifyComplexityPattern(feedback, userId);
    if (complexityPattern) patterns.push(complexityPattern);
    
    // Pattern nutritionnel cyclique
    const nutritionPattern = await this.identifyNutritionalCyclePattern(feedback, userId);
    if (nutritionPattern) patterns.push(nutritionPattern);
    
    // Pattern saisonnier
    const seasonalPattern = await this.identifySeasonalPattern(feedback, userId);
    if (seasonalPattern) patterns.push(seasonalPattern);
    
    return patterns.filter(p => p.confidence >= this.learningThreshold);
  }
  
  /**
   * Génère les mises à jour d'apprentissage
   */
  private generateLearningUpdates(
    analysis: FeedbackAnalysis,
    patterns: Pattern[]
  ): LearningUpdate[] {
    const updates: LearningUpdate[] = [];
    
    // Mises à jour basées sur les problèmes identifiés
    analysis.problemAreas.forEach(problem => {
      if (problem.severity > 1.5) {
        updates.push({
          type: 'constraint',
          data: {
            aspect: problem.aspect,
            adjustment: 'decrease_weight',
            reason: `Feedback négatif fréquent (${(problem.frequency * 100).toFixed(0)}%)`
          },
          confidence: problem.severity
        });
      }
    });
    
    // Mises à jour basées sur les patterns de succès
    analysis.successPatterns.forEach(pattern => {
      updates.push({
        type: 'preference',
        data: {
          patternType: pattern.type,
          reinforcement: pattern.data,
          confidence: pattern.confidence
        },
        confidence: pattern.confidence
      });
    });
    
    // Mises à jour basées sur les nouveaux patterns
    patterns.forEach(pattern => {
      if (pattern.occurrences >= this.patternMinOccurrences) {
        updates.push({
          type: 'pattern',
          data: {
            pattern,
            action: 'incorporate_into_recommendations'
          },
          confidence: pattern.confidence
        });
      }
    });
    
    return updates;
  }
  
  /**
   * Applique les mises à jour d'apprentissage
   */
  private async applyLearningUpdates(
    updates: LearningUpdate[],
    userId: string
  ): Promise<boolean> {
    try {
      // Grouper les updates par type
      const preferenceUpdates = updates.filter(u => u.type === 'preference');
      const constraintUpdates = updates.filter(u => u.type === 'constraint');
      const patternUpdates = updates.filter(u => u.type === 'pattern');
      
      // Appliquer les mises à jour de préférences
      if (preferenceUpdates.length > 0) {
        await this.updateUserPreferences(userId, preferenceUpdates);
      }
      
      // Appliquer les mises à jour de contraintes
      if (constraintUpdates.length > 0) {
        await this.updateUserConstraints(userId, constraintUpdates);
      }
      
      // Enregistrer les nouveaux patterns
      if (patternUpdates.length > 0) {
        await this.storeNewPatterns(userId, patternUpdates);
      }
      
      return true;
      
    } catch (error) {
      console.error('Error applying learning updates:', error);
      return false;
    }
  }
  
  /**
   * Traitement immédiat pour feedback critique
   */
  private async processImmediateFeedback(
    mealId: string,
    userId: string,
    feedback: UserFeedback
  ): Promise<void> {
    // Identifier l'aspect le plus problématique
    if (!feedback.aspectRatings) return;
    
    const worstAspect = Object.entries(feedback.aspectRatings)
      .sort((a, b) => a[1] - b[1])[0];
    
    const [aspect, rating] = worstAspect;
    
    if (rating <= 2) {
      // Créer une règle d'évitement immédiate
      await this.createAvoidanceRule(userId, mealId, aspect, feedback.comments);
    }
  }
  
  /**
   * Traite le feedback implicite négatif
   */
  private async processImplicitNegativeFeedback(
    mealId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const implicitFeedback: UserFeedback = {
      type: 'implicit',
      sentiment: 'negative',
      timestamp: new Date()
    };
    
    // Ajuster selon la raison
    switch (reason) {
      case 'not_completed':
        implicitFeedback.aspectRatings = { taste: 2, difficulty: 3, time: 3, cost: 3, health: 3 };
        break;
      case 'too_much_leftover':
        implicitFeedback.aspectRatings = { taste: 2, difficulty: 3, time: 3, cost: 2, health: 3 };
        break;
      case 'time_exceeded':
        implicitFeedback.aspectRatings = { taste: 3, difficulty: 2, time: 1, cost: 3, health: 3 };
        break;
    }
    
    await this.collectExplicitFeedback(mealId, userId, implicitFeedback);
  }
  
  /**
   * Identifie les patterns de rotation de cuisine
   */
  private async identifyCuisineRotationPattern(
    feedback: CollectedFeedback,
    userId: string
  ): Promise<Pattern | null> {
    try {
      // Récupérer l'historique des repas réussis
      const { data, error } = await supabase
        .from('meal_planning_analytics')
        .select('event_data, created_at')
        .eq('user_id', userId)
        .eq('event_type', 'explicit_feedback')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // 90 jours
        .order('created_at', { ascending: true });
      
      if (error || !data || data.length < 10) return null;
      
      // Analyser les séquences de cuisines appréciées
      const positiveMeals = data.filter(d => 
        d.event_data?.feedback?.sentiment === 'positive'
      );
      
      if (positiveMeals.length < 5) return null;
      
      // Détecter un pattern de rotation
      const cuisineSequence = positiveMeals.map(meal => 
        this.extractCuisineFromMeal(meal.event_data.feedback)
      );
      
      const rotationPattern = this.detectRotationPattern(cuisineSequence);
      
      if (rotationPattern.confidence >= this.learningThreshold) {
        return {
          id: `cuisine_rotation_${userId}`,
          type: PatternType.CUISINE_ROTATION,
          confidence: rotationPattern.confidence,
          occurrences: rotationPattern.occurrences,
          firstSeen: new Date(data[0].created_at),
          lastSeen: new Date(),
          data: rotationPattern
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Error identifying cuisine rotation pattern:', error);
      return null;
    }
  }
  
  /**
   * Identifie les patterns de préférence temporelle
   */
  private async identifyTimePreferencePattern(
    feedback: CollectedFeedback,
    userId: string
  ): Promise<Pattern | null> {
    try {
      // Analyser les heures de satisfaction élevée
      const timeBasedFeedback = Object.entries(feedback.mealFeedback)
        .map(([mealId, fb]) => ({
          mealId,
          feedback: fb,
          hour: new Date(fb.timestamp).getHours(),
          day: new Date(fb.timestamp).getDay()
        }))
        .filter(item => item.feedback.aspectRatings);
      
      if (timeBasedFeedback.length < 5) return null;
      
      // Détecter les créneaux de haute satisfaction
      const timePatterns = this.analyzeTimePatterns(timeBasedFeedback);
      
      if (timePatterns.confidence >= this.learningThreshold) {
        return {
          id: `time_preference_${userId}`,
          type: PatternType.TIME_PREFERENCE,
          confidence: timePatterns.confidence,
          occurrences: timePatterns.occurrences,
          firstSeen: new Date(),
          lastSeen: new Date(),
          data: timePatterns
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Error identifying time preference pattern:', error);
      return null;
    }
  }
  
  /**
   * Identifie les patterns de progression de complexité
   */
  private async identifyComplexityPattern(
    feedback: CollectedFeedback,
    userId: string
  ): Promise<Pattern | null> {
    try {
      // Analyser l'évolution des ratings de difficulté dans le temps
      const complexityFeedback = Object.values(feedback.mealFeedback)
        .filter(fb => fb.aspectRatings?.difficulty)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      if (complexityFeedback.length < 8) return null;
      
      const complexityProgression = this.analyzeComplexityProgression(complexityFeedback);
      
      if (complexityProgression.confidence >= this.learningThreshold) {
        return {
          id: `complexity_progression_${userId}`,
          type: PatternType.COMPLEXITY_PROGRESSION,
          confidence: complexityProgression.confidence,
          occurrences: complexityProgression.occurrences,
          firstSeen: complexityFeedback[0].timestamp,
          lastSeen: new Date(),
          data: complexityProgression
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Error identifying complexity pattern:', error);
      return null;
    }
  }
  
  /**
   * Identifie les cycles nutritionnels
   */
  private async identifyNutritionalCyclePattern(
    feedback: CollectedFeedback,
    userId: string
  ): Promise<Pattern | null> {
    try {
      // Analyser les patterns nutritionnels sur plusieurs semaines
      const { data, error } = await supabase
        .from('meal_planning_analytics')
        .select('event_data, created_at')
        .eq('user_id', userId)
        .eq('event_type', 'meal_cooked')
        .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()) // 60 jours
        .order('created_at', { ascending: true });
      
      if (error || !data || data.length < 20) return null;
      
      const nutritionalCycle = this.analyzeNutritionalCycles(data);
      
      if (nutritionalCycle.confidence >= this.learningThreshold) {
        return {
          id: `nutritional_cycle_${userId}`,
          type: PatternType.NUTRITIONAL_CYCLE,
          confidence: nutritionalCycle.confidence,
          occurrences: nutritionalCycle.occurrences,
          firstSeen: new Date(data[0].created_at),
          lastSeen: new Date(),
          data: nutritionalCycle
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Error identifying nutritional cycle pattern:', error);
      return null;
    }
  }
  
  /**
   * Identifie les patterns saisonniers
   */
  private async identifySeasonalPattern(
    feedback: CollectedFeedback,
    userId: string
  ): Promise<Pattern | null> {
    try {
      // Analyser les préférences par saison sur l'année passée
      const { data, error } = await supabase
        .from('meal_planning_analytics')
        .select('event_data, created_at')
        .eq('user_id', userId)
        .eq('event_type', 'explicit_feedback')
        .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()) // 1 an
        .order('created_at', { ascending: true });
      
      if (error || !data || data.length < 30) return null;
      
      const seasonalPattern = this.analyzeSeasonalPreferences(data);
      
      if (seasonalPattern.confidence >= this.learningThreshold) {
        return {
          id: `seasonal_preference_${userId}`,
          type: PatternType.SEASONAL_PREFERENCE,
          confidence: seasonalPattern.confidence,
          occurrences: seasonalPattern.occurrences,
          firstSeen: new Date(data[0].created_at),
          lastSeen: new Date(),
          data: seasonalPattern
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Error identifying seasonal pattern:', error);
      return null;
    }
  }
  
  /**
   * Méthodes d'analyse spécialisées
   */
  
  private detectRotationPattern(cuisineSequence: string[]): any {
    // Détecter les cycles dans la séquence de cuisines
    const cycles = this.findCycles(cuisineSequence);
    
    if (cycles.length >= 3) {
      return {
        pattern: cycles[0],
        occurrences: cycles.length,
        confidence: Math.min(cycles.length / 5, 1)
      };
    }
    
    return { confidence: 0 };
  }
  
  private analyzeTimePatterns(timeBasedFeedback: any[]): any {
    // Analyser les créneaux de haute satisfaction
    const hourlyScores: Record<number, number[]> = {};
    
    timeBasedFeedback.forEach(item => {
      if (!hourlyScores[item.hour]) {
        hourlyScores[item.hour] = [];
      }
      
      const avgRating = item.feedback.aspectRatings ? 
        Object.values(item.feedback.aspectRatings).reduce((a, b) => a + b, 0) / 5 : 3;
      
      hourlyScores[item.hour].push(avgRating);
    });
    
    // Trouver les heures optimales
    const optimalHours: number[] = [];
    Object.entries(hourlyScores).forEach(([hour, scores]) => {
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avgScore >= 4 && scores.length >= 3) {
        optimalHours.push(parseInt(hour));
      }
    });
    
    return {
      optimalHours,
      occurrences: optimalHours.length,
      confidence: optimalHours.length >= 2 ? 0.8 : 0.5
    };
  }
  
  private analyzeComplexityProgression(complexityFeedback: any[]): any {
    // Analyser si l'utilisateur accepte progressivement plus de complexité
    const timeline = complexityFeedback.map((fb, index) => ({
      index,
      rating: fb.aspectRatings?.difficulty || 3,
      timestamp: fb.timestamp
    }));
    
    // Calculer la tendance avec régression linéaire simple
    const n = timeline.length;
    const sumX = timeline.reduce((sum, item) => sum + item.index, 0);
    const sumY = timeline.reduce((sum, item) => sum + item.rating, 0);
    const sumXY = timeline.reduce((sum, item) => sum + item.index * item.rating, 0);
    const sumX2 = timeline.reduce((sum, item) => sum + item.index * item.index, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return {
      trend: slope > 0.1 ? 'increasing_tolerance' : slope < -0.1 ? 'decreasing_tolerance' : 'stable',
      slope,
      occurrences: n,
      confidence: Math.abs(slope) > 0.1 ? 0.75 : 0.4
    };
  }
  
  private analyzeNutritionalCycles(mealData: any[]): any {
    // Mock - analyser les cycles nutritionnels hebdomadaires
    return {
      weekdayPattern: 'healthy_focused',
      weekendPattern: 'relaxed',
      occurrences: 8,
      confidence: 0.7
    };
  }
  
  private analyzeSeasonalPreferences(seasonalData: any[]): any {
    // Analyser les préférences par saison
    const seasonalScores: Record<string, number[]> = {
      spring: [],
      summer: [],
      fall: [],
      winter: []
    };
    
    seasonalData.forEach(item => {
      const date = new Date(item.created_at);
      const season = this.getSeason(date);
      const satisfaction = item.event_data?.feedback?.aspectRatings ? 
        Object.values(item.event_data.feedback.aspectRatings).reduce((a: number, b: number) => a + b, 0) / 5 : 3;
      
      seasonalScores[season].push(satisfaction);
    });
    
    // Calculer les moyennes par saison
    const seasonalAverages = Object.fromEntries(
      Object.entries(seasonalScores).map(([season, scores]) => [
        season,
        scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 3
      ])
    );
    
    // Identifier la saison préférée
    const bestSeason = Object.entries(seasonalAverages)
      .sort((a, b) => b[1] - a[1])[0];
    
    return {
      seasonalAverages,
      preferredSeason: bestSeason[0],
      confidence: bestSeason[1] > 4 ? 0.8 : 0.5,
      occurrences: seasonalData.length
    };
  }
  
  /**
   * Méthodes utilitaires
   */
  
  private getProblematicMeals(
    feedback: CollectedFeedback,
    aspect: string
  ): string[] {
    return Object.entries(feedback.mealFeedback)
      .filter(([_, fb]) => 
        fb.aspectRatings?.[aspect as keyof typeof fb.aspectRatings] <= 2
      )
      .map(([mealId]) => mealId);
  }
  
  private async identifySuccessPatterns(
    feedback: CollectedFeedback,
    plan: WeeklyMealPlan
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    // Identifier les repas très bien notés
    const successfulMeals = Object.entries(feedback.mealFeedback)
      .filter(([_, fb]) => {
        if (!fb.aspectRatings) return false;
        const avgRating = Object.values(fb.aspectRatings).reduce((a, b) => a + b, 0) / 5;
        return avgRating >= 4.5;
      });
    
    if (successfulMeals.length >= 2) {
      // Analyser les caractéristiques communes
      const commonFeatures = this.findCommonFeatures(
        successfulMeals.map(([mealId]) => 
          plan.meals.find(m => m.id === mealId)
        ).filter(Boolean)
      );
      
      if (Object.keys(commonFeatures).length > 0) {
        patterns.push({
          id: `success_pattern_${plan.id}`,
          type: PatternType.INGREDIENT_COMBINATION,
          confidence: 0.8,
          occurrences: successfulMeals.length,
          firstSeen: new Date(),
          lastSeen: new Date(),
          data: commonFeatures
        });
      }
    }
    
    return patterns;
  }
  
  private identifyImprovementAreas(problemAreas: ProblemArea[]): string[] {
    return problemAreas
      .filter(area => area.severity >= 1.5)
      .map(area => {
        switch (area.aspect) {
          case 'taste': return 'Améliorer la correspondance des goûts';
          case 'difficulty': return 'Ajuster la complexité des recettes';
          case 'time': return 'Optimiser l\'estimation du temps';
          case 'cost': return 'Affiner l\'estimation des coûts';
          case 'health': return 'Renforcer l\'équilibre nutritionnel';
          default: return 'Amélioration générale nécessaire';
        }
      });
  }
  
  private findCommonFeatures(meals: (MealPlanEntry | undefined)[]): any {
    const validMeals = meals.filter(Boolean) as MealPlanEntry[];
    if (validMeals.length < 2) return {};
    
    const features: any = {};
    
    // Analyser les caractéristiques communes
    // Temps de préparation similaire
    const prepTimes = validMeals.map(m => m.prepTime).filter(Boolean);
    if (prepTimes.length > 1) {
      const avgTime = prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length;
      if (prepTimes.every(time => Math.abs(time - avgTime) < 10)) {
        features.preferredPrepTime = avgTime;
      }
    }
    
    // Tags communs
    const allTags = validMeals.flatMap(m => m.tags || []);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const commonTags = Object.entries(tagCounts)
      .filter(([_, count]) => count >= validMeals.length * 0.5)
      .map(([tag]) => tag);
    
    if (commonTags.length > 0) {
      features.commonTags = commonTags;
    }
    
    return features;
  }
  
  private findCycles(sequence: string[]): string[][] {
    const cycles: string[][] = [];
    
    // Détecter des cycles de longueur 2 à 5
    for (let cycleLength = 2; cycleLength <= 5; cycleLength++) {
      if (sequence.length < cycleLength * 3) continue;
      
      for (let start = 0; start <= sequence.length - cycleLength * 3; start++) {
        const pattern = sequence.slice(start, start + cycleLength);
        const nextOccurrence = sequence.slice(start + cycleLength, start + cycleLength * 2);
        
        if (this.arraysEqual(pattern, nextOccurrence)) {
          // Vérifier s'il y a une troisième occurrence
          const thirdOccurrence = sequence.slice(start + cycleLength * 2, start + cycleLength * 3);
          if (this.arraysEqual(pattern, thirdOccurrence)) {
            cycles.push(pattern);
          }
        }
      }
    }
    
    return cycles;
  }
  
  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((val, index) => val === b[index]);
  }
  
  private extractCuisineFromMeal(feedback: any): string {
    // Mock - en production, extraire la vraie cuisine
    const cuisines = ['française', 'italienne', 'asiatique', 'mexicaine', 'méditerranéenne'];
    return cuisines[Math.floor(Math.random() * cuisines.length)];
  }
  
  private getSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }
  
  private calculateConfidenceImprovement(
    analysis: FeedbackAnalysis,
    patternsLearned: number
  ): number {
    // Base d'amélioration selon la satisfaction
    let improvement = analysis.overallSatisfaction - 0.7; // 0.7 est la baseline
    
    // Bonus pour les nouveaux patterns
    improvement += patternsLearned * 0.05;
    
    // Malus pour les problèmes identifiés
    improvement -= analysis.problemAreas.length * 0.02;
    
    return Math.max(0, Math.min(improvement, 0.3)); // Plafonner entre 0 et 30%
  }
  
  private async createAvoidanceRule(
    userId: string,
    mealId: string,
    aspect: string,
    comments?: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_meal_preferences')
        .upsert({
          user_id: userId,
          avoidance_rules: {
            meals: [mealId],
            aspect,
            reason: comments || `Mauvaise expérience (${aspect})`,
            created_at: new Date().toISOString()
          }
        });
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Error creating avoidance rule:', error);
    }
  }
  
  private async updateUserPreferences(
    userId: string,
    updates: LearningUpdate[]
  ): Promise<void> {
    // Mock - en production, mettre à jour les vraies préférences
    console.log('Updating user preferences:', updates);
  }
  
  private async updateUserConstraints(
    userId: string,
    updates: LearningUpdate[]
  ): Promise<void> {
    // Mock - en production, mettre à jour les vraies contraintes
    console.log('Updating user constraints:', updates);
  }
  
  private async storeNewPatterns(
    userId: string,
    updates: LearningUpdate[]
  ): Promise<void> {
    // Mock - en production, stocker les nouveaux patterns
    console.log('Storing new patterns:', updates);
  }
  
  private async recordLearningOutcome(
    planId: string,
    outcome: LearningOutcome
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('meal_planning_analytics')
        .insert({
          plan_id: planId,
          event_type: 'learning_outcome',
          event_data: outcome
        });
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Error recording learning outcome:', error);
    }
  }
}

// Export singleton instance
export const contextAnalyzer = new ContextAnalyzer();