/**
 * Learning Loop
 * Orchestre l'apprentissage continu du système de planification
 */

import {
  TrainingDataset,
  ModelMetrics,
  LearningCycleResult,
  Pattern,
  PatternType,
  UserBehaviorData
} from '../types';
import { FeedbackProcessor } from './FeedbackProcessor';
import { PreferenceLearner } from '../ml/PreferenceLearner';
import { supabase } from '@/integrations/supabase/client';

interface DataCollectionResult {
  userCount: number;
  interactionCount: number;
  feedbackCount: number;
  timeRange: { start: Date; end: Date };
}

interface ModelTrainingResult {
  model: any;
  metrics: ModelMetrics;
  improvements: string[];
  version: string;
}

export class LearningLoop {
  private feedbackProcessor: FeedbackProcessor;
  private preferenceLearner: PreferenceLearner;
  private learningRate: number = 0.01;
  private batchSize: number = 100;
  private lastTrainingDate: Date | null = null;
  private currentModelVersion: string = '1.0.0';
  
  constructor() {
    this.feedbackProcessor = new FeedbackProcessor();
    this.preferenceLearner = new PreferenceLearner();
  }
  
  /**
   * Exécute un cycle d'apprentissage complet
   */
  async runLearningCycle(forced: boolean = false): Promise<LearningCycleResult> {
    console.log('🔄 Starting learning cycle', { forced, lastTraining: this.lastTrainingDate });
    
    // 1. Vérifier si un cycle est nécessaire
    if (!forced && !await this.shouldRunCycle()) {
      return {
        cycleCompleted: false,
        improvement: 0,
        newPatternsDiscovered: [],
        modelVersion: this.currentModelVersion,
        metrics: await this.getCurrentMetrics()
      };
    }
    
    try {
      // 2. Collecter les données récentes
      const collectionResult = await this.collectRecentData();
      
      if (collectionResult.interactionCount < this.batchSize) {
        console.log('Not enough data for training cycle');
        return {
          cycleCompleted: false,
          improvement: 0,
          newPatternsDiscovered: [],
          modelVersion: this.currentModelVersion,
          metrics: await this.getCurrentMetrics()
        };
      }
      
      // 3. Préparer le dataset d'entraînement
      const dataset = await this.prepareDataset(collectionResult);
      
      // 4. Découvrir de nouveaux patterns
      const newPatterns = await this.discoverNewPatterns(dataset);
      
      // 5. Entraîner le modèle (simulation TensorFlow)
      const trainingResult = await this.trainModel(dataset);
      
      // 6. Évaluer les performances
      const evaluation = await this.evaluateModel(trainingResult);
      
      // 7. Déployer si amélioration significative
      let deployed = false;
      if (evaluation.improvement > 0.05) {
        deployed = await this.deployModel(trainingResult);
        if (deployed) {
          this.updateModelVersion();
        }
      }
      
      // 8. Mettre à jour les métriques globales
      await this.updateSystemMetrics(evaluation, newPatterns);
      
      this.lastTrainingDate = new Date();
      
      return {
        cycleCompleted: true,
        improvement: evaluation.improvement,
        newPatternsDiscovered: newPatterns,
        modelVersion: deployed ? this.currentModelVersion : this.currentModelVersion + '-candidate',
        metrics: evaluation.metrics
      };
      
    } catch (error) {
      console.error('Learning cycle failed:', error);
      return {
        cycleCompleted: false,
        improvement: 0,
        newPatternsDiscovered: [],
        modelVersion: this.currentModelVersion,
        metrics: await this.getCurrentMetrics()
      };
    }
  }
  
  /**
   * Détermine si un cycle d'apprentissage est nécessaire
   */
  private async shouldRunCycle(): Promise<boolean> {
    // Cycle hebdomadaire obligatoire
    if (!this.lastTrainingDate) return true;
    
    const daysSinceLastTraining = (Date.now() - this.lastTrainingDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastTraining >= 7) return true;
    
    // Cycle déclenché par accumulation de feedback
    const pendingFeedback = await this.getPendingFeedbackCount();
    if (pendingFeedback >= this.batchSize * 2) return true;
    
    // Cycle déclenché par baisse de performance
    const currentPerformance = await this.getCurrentPerformanceScore();
    if (currentPerformance < 0.8) return true;
    
    return false;
  }
  
  /**
   * Collecte les données récentes pour l'entraînement
   */
  private async collectRecentData(): Promise<DataCollectionResult> {
    try {
      // Définir la période de collecte
      const collectionPeriod = 7; // 7 jours
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - collectionPeriod);
      
      // Collecter les interactions utilisateur
      const { data: interactions, error: interactionsError } = await supabase
        .from('meal_planning_analytics')
        .select('user_id, event_type, event_data, created_at')
        .gte('created_at', startDate.toISOString())
        .in('event_type', ['explicit_feedback', 'meal_completion', 'cooking_time', 'meal_cooked']);
      
      if (interactionsError) throw interactionsError;
      
      // Compter les utilisateurs uniques
      const uniqueUsers = new Set((interactions || []).map(i => i.user_id));
      
      // Compter le feedback explicite
      const explicitFeedback = (interactions || []).filter(i => i.event_type === 'explicit_feedback');
      
      return {
        userCount: uniqueUsers.size,
        interactionCount: (interactions || []).length,
        feedbackCount: explicitFeedback.length,
        timeRange: {
          start: startDate,
          end: new Date()
        }
      };
      
    } catch (error) {
      console.error('Error collecting recent data:', error);
      return {
        userCount: 0,
        interactionCount: 0,
        feedbackCount: 0,
        timeRange: { start: new Date(), end: new Date() }
      };
    }
  }
  
  /**
   * Prépare le dataset d'entraînement
   */
  private async prepareDataset(collectionResult: DataCollectionResult): Promise<TrainingDataset> {
    try {
      // Simuler la préparation d'un dataset TensorFlow
      // En production, convertir les données en tenseurs
      
      // Collecter les features et labels
      const { data: rawData, error } = await supabase
        .from('meal_planning_analytics')
        .select('user_id, event_data, created_at')
        .gte('created_at', collectionResult.timeRange.start.toISOString())
        .lte('created_at', collectionResult.timeRange.end.toISOString());
      
      if (error) throw error;
      
      // Transformer en format d'apprentissage
      const features = this.extractFeaturesFromData(rawData || []);
      const labels = this.extractLabelsFromData(rawData || []);
      
      return {
        features: features, // En prod: tf.tensor2d(features)
        labels: labels, // En prod: tf.tensor2d(labels)
        featureSize: features.length > 0 ? features[0].length : 0,
        labelSize: labels.length > 0 ? labels[0].length : 0,
        metadata: {
          collectionPeriod: collectionResult.timeRange.end,
          userCount: collectionResult.userCount,
          recipeCount: this.countUniqueRecipes(rawData || [])
        }
      };
      
    } catch (error) {
      console.error('Error preparing dataset:', error);
      throw error;
    }
  }
  
  /**
   * Découvre de nouveaux patterns dans les données
   */
  private async discoverNewPatterns(dataset: TrainingDataset): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    try {
      // Analyser les patterns de rotation de cuisine
      const cuisinePattern = await this.discoverCuisineRotationPatterns(dataset);
      if (cuisinePattern) patterns.push(cuisinePattern);
      
      // Analyser les patterns d'ingrédients
      const ingredientPatterns = await this.discoverIngredientCombinationPatterns(dataset);
      patterns.push(...ingredientPatterns);
      
      // Analyser les patterns temporels
      const timePatterns = await this.discoverTimeBasedPatterns(dataset);
      patterns.push(...timePatterns);
      
      // Analyser les patterns budgétaires
      const budgetPatterns = await this.discoverBudgetPatterns(dataset);
      patterns.push(...budgetPatterns);
      
      console.log(`🔍 Discovered ${patterns.length} new patterns`);
      
      return patterns.filter(p => p.confidence >= 0.7);
      
    } catch (error) {
      console.error('Error discovering patterns:', error);
      return [];
    }
  }
  
  /**
   * Entraîne le modèle ML (simulation TensorFlow)
   */
  private async trainModel(dataset: TrainingDataset): Promise<ModelTrainingResult> {
    console.log('🤖 Training ML model...');
    
    try {
      // En production, utiliser TensorFlow.js
      // const model = tf.sequential({...});
      
      // Simulation d'entraînement
      const trainingStart = Date.now();
      
      // Simuler des époques d'entraînement
      const epochs = 50;
      const metrics: ModelMetrics = {
        accuracy: 0.65 + Math.random() * 0.25, // 65-90%
        loss: 0.5 + Math.random() * 0.3,
        validationAccuracy: 0.60 + Math.random() * 0.25,
        validationLoss: 0.6 + Math.random() * 0.4,
        trainingTime: Date.now() - trainingStart,
        epochsCompleted: epochs
      };
      
      // Simuler des améliorations découvertes
      const improvements = [
        'Amélioration de la prédiction des préférences gustatives',
        'Meilleure estimation du temps de préparation',
        'Optimisation de l\'adaptation saisonnière'
      ];
      
      // Générer une version candidate
      const candidateVersion = this.generateCandidateVersion();
      
      return {
        model: {}, // En prod: le vrai modèle TensorFlow
        metrics,
        improvements,
        version: candidateVersion
      };
      
    } catch (error) {
      console.error('Model training failed:', error);
      throw error;
    }
  }
  
  /**
   * Évalue les performances du nouveau modèle
   */
  private async evaluateModel(trainingResult: ModelTrainingResult): Promise<{
    metrics: ModelMetrics;
    improvement: number;
    passesThreshold: boolean;
  }> {
    const currentMetrics = await this.getCurrentMetrics();
    const newMetrics = trainingResult.metrics;
    
    // Calculer l'amélioration globale
    const accuracyImprovement = newMetrics.accuracy - currentMetrics.accuracy;
    const lossImprovement = currentMetrics.loss - newMetrics.loss; // Réduction de loss = amélioration
    
    const overallImprovement = (accuracyImprovement + lossImprovement) / 2;
    
    return {
      metrics: newMetrics,
      improvement: overallImprovement,
      passesThreshold: overallImprovement > 0.05 // 5% d'amélioration minimum
    };
  }
  
  /**
   * Déploie le nouveau modèle si validé
   */
  private async deployModel(trainingResult: ModelTrainingResult): Promise<boolean> {
    try {
      console.log('🚀 Deploying new model version:', trainingResult.version);
      
      // En production, déployer le modèle TensorFlow
      // await this.saveModel(trainingResult.model);
      
      // Mettre à jour la version du modèle
      this.currentModelVersion = trainingResult.version;
      
      // Enregistrer le déploiement
      const { error } = await supabase
        .from('meal_planning_analytics')
        .insert({
          event_type: 'model_deployment',
          event_data: {
            version: trainingResult.version,
            metrics: trainingResult.metrics,
            improvements: trainingResult.improvements,
            deploymentDate: new Date().toISOString()
          }
        });
      
      if (error) throw error;
      
      return true;
      
    } catch (error) {
      console.error('Model deployment failed:', error);
      return false;
    }
  }
  
  /**
   * Met à jour les métriques système
   */
  private async updateSystemMetrics(
    evaluation: any,
    newPatterns: Pattern[]
  ): Promise<void> {
    try {
      const metricsUpdate = {
        ml_accuracy: evaluation.metrics.accuracy,
        ml_loss: evaluation.metrics.loss,
        patterns_discovered: newPatterns.length,
        last_training_date: new Date().toISOString(),
        model_version: this.currentModelVersion
      };
      
      const { error } = await supabase
        .from('meal_planning_analytics')
        .insert({
          event_type: 'system_metrics_update',
          event_data: metricsUpdate
        });
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Error updating system metrics:', error);
    }
  }
  
  /**
   * Découvre les patterns de rotation de cuisine
   */
  private async discoverCuisineRotationPatterns(dataset: TrainingDataset): Promise<Pattern | null> {
    // Analyser les séquences de cuisines dans les données
    // Mock pour l'instant
    
    const rotationPattern = {
      sequence: ['française', 'italienne', 'asiatique'],
      frequency: 0.8,
      userCount: 15
    };
    
    if (rotationPattern.frequency >= 0.7 && rotationPattern.userCount >= 10) {
      return {
        id: `cuisine_rotation_${Date.now()}`,
        type: PatternType.CUISINE_ROTATION,
        confidence: rotationPattern.frequency,
        occurrences: rotationPattern.userCount,
        firstSeen: new Date(),
        lastSeen: new Date(),
        data: rotationPattern
      };
    }
    
    return null;
  }
  
  /**
   * Découvre les patterns de combinaisons d'ingrédients
   */
  private async discoverIngredientCombinationPatterns(dataset: TrainingDataset): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    // Mock - en production, analyser les vraies combinaisons
    const commonCombinations = [
      {
        ingredients: ['tomate', 'basilic', 'mozzarella'],
        frequency: 0.85,
        satisfaction: 4.6,
        userCount: 25
      },
      {
        ingredients: ['poulet', 'curry', 'lait de coco'],
        frequency: 0.78,
        satisfaction: 4.4,
        userCount: 18
      }
    ];
    
    commonCombinations.forEach((combo, index) => {
      if (combo.frequency >= 0.75 && combo.userCount >= 15) {
        patterns.push({
          id: `ingredient_combo_${index}_${Date.now()}`,
          type: PatternType.INGREDIENT_COMBINATION,
          confidence: combo.frequency,
          occurrences: combo.userCount,
          firstSeen: new Date(),
          lastSeen: new Date(),
          data: combo
        });
      }
    });
    
    return patterns;
  }
  
  /**
   * Découvre les patterns temporels
   */
  private async discoverTimeBasedPatterns(dataset: TrainingDataset): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    // Analyser les préférences par créneau horaire
    const timePreferences = {
      lunch: { optimalTime: '12:30', maxDuration: 30, popularity: 0.9 },
      dinner: { optimalTime: '19:30', maxDuration: 60, popularity: 0.85 }
    };
    
    Object.entries(timePreferences).forEach(([mealType, prefs]) => {
      if (prefs.popularity >= 0.8) {
        patterns.push({
          id: `time_preference_${mealType}_${Date.now()}`,
          type: PatternType.TIME_PREFERENCE,
          confidence: prefs.popularity,
          occurrences: Math.floor(prefs.popularity * 50), // Estimation
          firstSeen: new Date(),
          lastSeen: new Date(),
          data: { mealType, ...prefs }
        });
      }
    });
    
    return patterns;
  }
  
  /**
   * Découvre les patterns budgétaires
   */
  private async discoverBudgetPatterns(dataset: TrainingDataset): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    // Analyser les comportements budgétaires
    const budgetBehaviors = [
      {
        type: 'weekly_splurge',
        description: 'Repas plus chers le week-end',
        frequency: 0.75,
        impact: 0.3
      },
      {
        type: 'month_end_economy',
        description: 'Économies en fin de mois',
        frequency: 0.68,
        impact: 0.4
      }
    ];
    
    budgetBehaviors.forEach((behavior, index) => {
      if (behavior.frequency >= 0.6) {
        patterns.push({
          id: `budget_pattern_${index}_${Date.now()}`,
          type: PatternType.BUDGET_PATTERN,
          confidence: behavior.frequency,
          occurrences: Math.floor(behavior.frequency * 30),
          firstSeen: new Date(),
          lastSeen: new Date(),
          data: behavior
        });
      }
    });
    
    return patterns;
  }
  
  /**
   * Extrait les features des données brutes
   */
  private extractFeaturesFromData(rawData: any[]): number[][] {
    return rawData.map(item => {
      // Convertir chaque interaction en vecteur de features
      const features = [
        item.event_data?.satisfaction || 0.5,
        item.event_data?.cookingTime || 30,
        item.event_data?.cost || 5,
        item.event_data?.difficulty || 3,
        new Date(item.created_at).getHours() / 24, // Normaliser l'heure
        new Date(item.created_at).getDay() / 7, // Normaliser le jour
        // Ajouter d'autres features selon les données disponibles
      ];
      
      return features;
    });
  }
  
  /**
   * Extrait les labels des données (satisfaction utilisateur)
   */
  private extractLabelsFromData(rawData: any[]): number[][] {
    return rawData.map(item => {
      // Convertir la satisfaction en one-hot encoding
      const satisfaction = item.event_data?.satisfaction || 0.5;
      
      // 3 classes: insatisfait (0-0.4), neutre (0.4-0.7), satisfait (0.7-1.0)
      if (satisfaction <= 0.4) return [1, 0, 0];
      if (satisfaction <= 0.7) return [0, 1, 0];
      return [0, 0, 1];
    });
  }
  
  /**
   * Obtient les métriques actuelles du modèle
   */
  private async getCurrentMetrics(): Promise<ModelMetrics> {
    try {
      // En production, charger les vraies métriques
      return {
        accuracy: 0.82,
        loss: 0.35,
        validationAccuracy: 0.79,
        validationLoss: 0.42,
        trainingTime: 0,
        epochsCompleted: 0
      };
      
    } catch (error) {
      console.error('Error getting current metrics:', error);
      return {
        accuracy: 0.5,
        loss: 1.0,
        validationAccuracy: 0.5,
        validationLoss: 1.0,
        trainingTime: 0,
        epochsCompleted: 0
      };
    }
  }
  
  /**
   * Obtient le score de performance actuel
   */
  private async getCurrentPerformanceScore(): Promise<number> {
    try {
      // Calculer la satisfaction moyenne sur les 7 derniers jours
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('meal_planning_analytics')
        .select('event_data')
        .eq('event_type', 'explicit_feedback')
        .gte('created_at', weekAgo.toISOString());
      
      if (error || !data || data.length === 0) return 0.8;
      
      const satisfactionScores = data
        .map(d => d.event_data?.feedback?.aspectRatings)
        .filter(Boolean)
        .map(ratings => Object.values(ratings).reduce((a, b) => a + b, 0) / 5);
      
      if (satisfactionScores.length === 0) return 0.8;
      
      const avgSatisfaction = satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length;
      
      return avgSatisfaction / 5; // Normaliser à 0-1
      
    } catch (error) {
      console.error('Error calculating performance score:', error);
      return 0.8;
    }
  }
  
  /**
   * Obtient le nombre de feedback en attente de traitement
   */
  private async getPendingFeedbackCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('meal_planning_analytics')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'explicit_feedback')
        .gte('created_at', (this.lastTrainingDate || new Date(0)).toISOString());
      
      if (error) throw error;
      
      return count || 0;
      
    } catch (error) {
      console.error('Error getting pending feedback count:', error);
      return 0;
    }
  }
  
  /**
   * Compte les recettes uniques dans les données
   */
  private countUniqueRecipes(rawData: any[]): number {
    const recipeIds = new Set();
    
    rawData.forEach(item => {
      if (item.event_data?.recipeId) {
        recipeIds.add(item.event_data.recipeId);
      }
    });
    
    return recipeIds.size;
  }
  
  /**
   * Génère une nouvelle version candidate
   */
  private generateCandidateVersion(): string {
    const [major, minor, patch] = this.currentModelVersion.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }
  
  /**
   * Met à jour la version du modèle
   */
  private updateModelVersion(): void {
    const [major, minor, patch] = this.currentModelVersion.split('.').map(Number);
    this.currentModelVersion = `${major}.${minor + 1}.0`;
  }
  
  /**
   * Planifie le prochain cycle d'apprentissage
   */
  async scheduleNextCycle(): Promise<Date> {
    const nextCycle = new Date();
    nextCycle.setDate(nextCycle.getDate() + 7); // Cycle hebdomadaire
    
    console.log('📅 Next learning cycle scheduled for:', nextCycle);
    
    return nextCycle;
  }
  
  /**
   * Obtient les statistiques d'apprentissage
   */
  async getLearningStatistics(): Promise<{
    totalCycles: number;
    averageImprovement: number;
    patternsDiscovered: number;
    modelVersion: string;
    lastTrainingDate: Date | null;
  }> {
    try {
      const { data, error } = await supabase
        .from('meal_planning_analytics')
        .select('event_data')
        .eq('event_type', 'learning_outcome')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      const cycles = data || [];
      const totalCycles = cycles.length;
      
      const improvements = cycles
        .map(c => c.event_data?.improvement || 0)
        .filter(imp => imp > 0);
      
      const averageImprovement = improvements.length > 0
        ? improvements.reduce((a, b) => a + b, 0) / improvements.length
        : 0;
      
      const patternsDiscovered = cycles
        .reduce((total, c) => total + (c.event_data?.patternsLearned || 0), 0);
      
      return {
        totalCycles,
        averageImprovement,
        patternsDiscovered,
        modelVersion: this.currentModelVersion,
        lastTrainingDate: this.lastTrainingDate
      };
      
    } catch (error) {
      console.error('Error getting learning statistics:', error);
      return {
        totalCycles: 0,
        averageImprovement: 0,
        patternsDiscovered: 0,
        modelVersion: this.currentModelVersion,
        lastTrainingDate: this.lastTrainingDate
      };
    }
  }
  
  /**
   * Force un cycle d'apprentissage immédiat
   */
  async forceLearningCycle(reason: string = 'Manual trigger'): Promise<LearningCycleResult> {
    console.log('🔥 Forcing learning cycle:', reason);
    
    // Enregistrer la raison du cycle forcé
    await supabase
      .from('meal_planning_analytics')
      .insert({
        event_type: 'forced_learning_cycle',
        event_data: { reason, timestamp: new Date().toISOString() }
      });
    
    return await this.runLearningCycle(true);
  }
}

// Export singleton instance
export const learningLoop = new LearningLoop();