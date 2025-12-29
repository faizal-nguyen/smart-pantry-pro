/**
 * Service d'adaptations contextuelles en temps réel
 * Orchestre les changements de plan selon les contextes dynamiques
 */

import { contextualPerformanceOptimizer } from './PerformanceOptimizer';
import { weatherContextService } from './WeatherContextService';
import { cipherContextIntegration } from './CipherContextIntegration';
import { 
  AdaptationLog, 
  WeatherContext, 
  CalendarContext,
  SeasonalContext,
  UserContextPreferences,
  RealTimeAdaptationConfig,
  AdaptationTrigger,
  AdaptationResult
} from './types';

interface AdaptationSubscriber {
  id: string;
  userId: string;
  callback: (adaptations: AdaptationLog[]) => void;
  preferences: UserContextPreferences;
}

export class RealTimeAdapter {
  private subscribers = new Map<string, AdaptationSubscriber>();
  private adaptationCache = new Map<string, AdaptationLog[]>();
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Configuration par défaut
  private config: RealTimeAdaptationConfig = {
    updateInterval: 30000, // 30 secondes
    maxAdaptationsPerUpdate: 3,
    confidenceThreshold: 0.7,
    debounceDelay: 2000,
    enableWeatherAdaptations: true,
    enableCalendarAdaptations: true,
    enableSeasonalAdaptations: true,
    enablePromotionAdaptations: true
  };

  constructor(customConfig?: Partial<RealTimeAdaptationConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  /**
   * Abonne un utilisateur aux adaptations temps réel
   */
  subscribe(
    userId: string, 
    preferences: UserContextPreferences,
    callback: (adaptations: AdaptationLog[]) => void
  ): string {
    const subscriptionId = `${userId}_${Date.now()}`;
    
    this.subscribers.set(subscriptionId, {
      id: subscriptionId,
      userId,
      callback,
      preferences
    });

    console.log(`🔔 Real-time adapter: User ${userId} subscribed (${this.subscribers.size} total)`);

    // Démarrer les adaptations si premier abonné
    if (!this.isRunning) {
      this.startRealTimeAdaptations();
    }

    // Envoyer immédiatement les adaptations existantes
    this.sendCachedAdaptations(subscriptionId);

    return subscriptionId;
  }

  /**
   * Désabonne un utilisateur
   */
  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
    console.log(`🔕 Real-time adapter: Unsubscribed (${this.subscribers.size} remaining)`);

    // Arrêter si plus d'abonnés
    if (this.subscribers.size === 0 && this.isRunning) {
      this.stopRealTimeAdaptations();
    }
  }

  /**
   * Force une mise à jour immédiate des adaptations
   */
  async forceUpdate(userId?: string): Promise<void> {
    if (userId) {
      const userSubscriptions = Array.from(this.subscribers.values())
        .filter(sub => sub.userId === userId);
      
      for (const subscription of userSubscriptions) {
        await this.updateAdaptationsForUser(subscription);
      }
    } else {
      // Mise à jour pour tous les utilisateurs
      for (const subscription of this.subscribers.values()) {
        await this.updateAdaptationsForUser(subscription);
      }
    }
  }

  /**
   * Démarre le système d'adaptations temps réel
   */
  private startRealTimeAdaptations(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('🚀 Real-time adapter: Starting...');

    // Cycle principal d'adaptations
    this.intervalId = setInterval(async () => {
      try {
        await this.runAdaptationCycle();
      } catch (error) {
        console.error('Real-time adaptation cycle error:', error);
      }
    }, this.config.updateInterval);
  }

  /**
   * Arrête le système d'adaptations temps réel
   */
  private stopRealTimeAdaptations(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    console.log('⏹️ Real-time adapter: Stopping...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Cycle principal d'adaptation
   */
  private async runAdaptationCycle(): Promise<void> {
    console.log(`🔄 Real-time adapter: Running cycle for ${this.subscribers.size} users`);

    // Traitement en parallèle avec limite
    const batches = this.createUserBatches(Array.from(this.subscribers.values()), 3);
    
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(subscription => this.updateAdaptationsForUser(subscription))
      );
    }
  }

  /**
   * Met à jour les adaptations pour un utilisateur spécifique
   */
  private async updateAdaptationsForUser(subscription: AdaptationSubscriber): Promise<void> {
    const { userId, preferences, callback } = subscription;
    const cacheKey = `realtime_adaptations:${userId}`;

    try {
      // Utiliser le cache optimisé pour éviter les requêtes redondantes
      const adaptations = await contextualPerformanceOptimizer.getCached(
        cacheKey,
        async () => {
          return this.generateAdaptationsForUser(userId, preferences);
        },
        this.config.updateInterval, // TTL égal à l'intervalle
        'high' // Priorité haute pour les adaptations temps réel
      );

      // Vérifier s'il y a des changements significatifs
      const hasChanges = this.detectSignificantChanges(userId, adaptations);
      
      if (hasChanges) {
        console.log(`✨ Real-time adapter: ${adaptations.length} new adaptations for user ${userId}`);
        
        // Mettre en cache et notifier
        this.adaptationCache.set(userId, adaptations);
        callback(adaptations);

        // Enregistrer dans Cipher pour apprentissage
        await this.recordAdaptationsInCipher(userId, adaptations, preferences);
      }

    } catch (error) {
      console.error(`Error updating adaptations for user ${userId}:`, error);
      
      // Fallback : envoyer adaptations en cache si disponibles
      const cachedAdaptations = this.adaptationCache.get(userId);
      if (cachedAdaptations) {
        callback(cachedAdaptations);
      }
    }
  }

  /**
   * Génère les adaptations pour un utilisateur
   */
  private async generateAdaptationsForUser(
    userId: string, 
    preferences: UserContextPreferences
  ): Promise<AdaptationLog[]> {
    const adaptations: AdaptationLog[] = [];
    const triggers: AdaptationTrigger[] = [];

    try {
      // 1. Adaptations météo
      if (this.config.enableWeatherAdaptations && preferences.weather_adaptation) {
        const weatherAdaptations = await this.generateWeatherAdaptations(userId, preferences);
        adaptations.push(...weatherAdaptations);
        if (weatherAdaptations.length > 0) {
          triggers.push({ type: 'weather', strength: 0.8, data: weatherAdaptations });
        }
      }

      // 2. Adaptations saisonnières (plus rapides, moins fréquentes)
      if (this.config.enableSeasonalAdaptations && preferences.seasonal_preferences) {
        const seasonalAdaptations = await this.generateSeasonalAdaptations(userId, preferences);
        adaptations.push(...seasonalAdaptations);
        if (seasonalAdaptations.length > 0) {
          triggers.push({ type: 'seasonal', strength: 0.6, data: seasonalAdaptations });
        }
      }

      // 3. Adaptations promotions (si disponibles)
      if (this.config.enablePromotionAdaptations && preferences.price_optimization) {
        const promotionAdaptations = await this.generatePromotionAdaptations(userId, preferences);
        adaptations.push(...promotionAdaptations);
        if (promotionAdaptations.length > 0) {
          triggers.push({ type: 'promotion', strength: 0.7, data: promotionAdaptations });
        }
      }

      // Filtrer par confiance et limiter le nombre
      const filteredAdaptations = adaptations
        .filter(adaptation => adaptation.confidence >= this.config.confidenceThreshold)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, this.config.maxAdaptationsPerUpdate);

      // Enrichir avec le contexte temps réel
      return filteredAdaptations.map(adaptation => ({
        ...adaptation,
        id: `rt_${adaptation.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        realTime: true,
        triggers
      }));

    } catch (error) {
      console.error('Error generating real-time adaptations:', error);
      return [];
    }
  }

  /**
   * Génère les adaptations météo temps réel
   */
  private async generateWeatherAdaptations(
    userId: string,
    preferences: UserContextPreferences
  ): Promise<AdaptationLog[]> {
    try {
      // Utiliser une position par défaut (Paris) ou la position de l'utilisateur
      const userLocation = { lat: 48.8566, lng: 2.3522 }; // TODO: Récupérer vraie position
      
      const weatherContext = await weatherContextService.getWeatherContext(userLocation);
      const adaptations: AdaptationLog[] = [];

      // Adaptations selon la température actuelle
      const currentTemp = weatherContext.current.temp;
      const weatherCondition = weatherContext.current.weather;

      // Très chaud (>28°C)
      if (currentTemp > 28 && preferences.weather_sensitivity !== 'low') {
        adaptations.push({
          id: '',
          type: 'weather',
          trigger: 'temperature_high',
          day: 0,
          mealType: 'lunch',
          original: 'plat_chaud',
          adapted: 'salade_fraiche',
          reason: `Il fait ${currentTemp}°C - privilégier les plats frais`,
          confidence: Math.min(0.9, 0.6 + (currentTemp - 25) * 0.1),
          timestamp: new Date(),
          context: {
            temperature: currentTemp,
            condition: weatherCondition,
            location: userLocation
          },
          savings: currentTemp > 32 ? 2.5 : 1.5
        });
      }

      // Très froid (<5°C)
      if (currentTemp < 5 && preferences.weather_sensitivity !== 'low') {
        adaptations.push({
          id: '',
          type: 'weather',
          trigger: 'temperature_low',
          day: 0,
          mealType: 'dinner',
          original: 'salade',
          adapted: 'soupe_chaude',
          reason: `Il fait ${currentTemp}°C - privilégier les plats réconfortants`,
          confidence: Math.min(0.95, 0.7 + Math.abs(currentTemp) * 0.05),
          timestamp: new Date(),
          context: {
            temperature: currentTemp,
            condition: weatherCondition,
            location: userLocation
          }
        });
      }

      // Pluie forte
      if (weatherContext.current.rain > 10) {
        adaptations.push({
          id: '',
          type: 'weather',
          trigger: 'heavy_rain',
          day: 0,
          mealType: 'dinner',
          original: 'barbecue',
          adapted: 'plat_mijote',
          reason: `Pluie prévue (${Math.round(weatherContext.current.rain)}mm) - plats d'intérieur recommandés`,
          confidence: 0.8,
          timestamp: new Date(),
          context: {
            rainfall: weatherContext.current.rain,
            condition: weatherCondition
          }
        });
      }

      return adaptations;
    } catch (error) {
      console.error('Error generating weather adaptations:', error);
      return [];
    }
  }

  /**
   * Génère les adaptations saisonnières
   */
  private async generateSeasonalAdaptations(
    userId: string,
    preferences: UserContextPreferences
  ): Promise<AdaptationLog[]> {
    try {
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const adaptations: AdaptationLog[] = [];

      // Logique saisonnière simplifiée pour les adaptations temps réel
      const seasonalTriggers = this.getSeasonalTriggers(currentMonth);
      
      for (const trigger of seasonalTriggers) {
        adaptations.push({
          id: '',
          type: 'seasonal',
          trigger: trigger.type,
          day: Math.floor(Math.random() * 7), // Jour aléatoire dans la semaine
          mealType: trigger.mealType,
          original: trigger.original,
          adapted: trigger.adapted,
          reason: trigger.reason,
          confidence: trigger.confidence,
          timestamp: new Date(),
          context: {
            month: currentMonth,
            season: this.getCurrentSeason(currentMonth)
          },
          savings: trigger.savings
        });
      }

      return adaptations.slice(0, 2); // Limiter à 2 adaptations saisonnières
    } catch (error) {
      console.error('Error generating seasonal adaptations:', error);
      return [];
    }
  }

  /**
   * Génère les adaptations promotions
   */
  private async generatePromotionAdaptations(
    userId: string,
    preferences: UserContextPreferences
  ): Promise<AdaptationLog[]> {
    // Pour l'instant, retourner des promotions simulées
    // TODO: Intégrer avec les vrais services de promotions
    const adaptations: AdaptationLog[] = [];

    if (Math.random() > 0.7) { // 30% de chance d'avoir une promo
      adaptations.push({
        id: '',
        type: 'promotion',
        trigger: 'store_discount',
        day: Math.floor(Math.random() * 7),
        mealType: 'lunch',
        original: 'saumon',
        adapted: 'poulet_fermier',
        reason: 'Poulet fermier en promotion -30% cette semaine',
        confidence: 0.75,
        timestamp: new Date(),
        context: {
          store: 'Carrefour',
          discount: 30,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
        savings: 4.50
      });
    }

    return adaptations;
  }

  /**
   * Détecte si les adaptations ont significativement changé
   */
  private detectSignificantChanges(userId: string, newAdaptations: AdaptationLog[]): boolean {
    const cachedAdaptations = this.adaptationCache.get(userId) || [];
    
    // Si différence de nombre > 1
    if (Math.abs(newAdaptations.length - cachedAdaptations.length) > 1) {
      return true;
    }

    // Si nouvelles adaptations avec confiance élevée
    const hasHighConfidenceNew = newAdaptations.some(a => a.confidence > 0.85);
    if (hasHighConfidenceNew) {
      return true;
    }

    // Si changement de types d'adaptations
    const newTypes = new Set(newAdaptations.map(a => a.type));
    const cachedTypes = new Set(cachedAdaptations.map(a => a.type));
    
    if (newTypes.size !== cachedTypes.size) {
      return true;
    }

    return false;
  }

  /**
   * Enregistre les adaptations dans Cipher pour apprentissage
   */
  private async recordAdaptationsInCipher(
    userId: string, 
    adaptations: AdaptationLog[],
    preferences: UserContextPreferences
  ): Promise<void> {
    try {
      await cipherContextIntegration.recordContextualExperience(
        userId,
        {
          type: 'real_time_adaptation',
          timestamp: new Date(),
          adaptationsCount: adaptations.length,
          confidence: adaptations.reduce((sum, a) => sum + a.confidence, 0) / adaptations.length,
          triggers: adaptations.map(a => a.trigger).filter(Boolean)
        },
        adaptations,
        undefined // Pas de feedback utilisateur pour l'instant
      );
    } catch (error) {
      console.error('Error recording adaptations in Cipher:', error);
    }
  }

  /**
   * Envoie les adaptations mises en cache
   */
  private sendCachedAdaptations(subscriptionId: string): void {
    const subscription = this.subscribers.get(subscriptionId);
    if (!subscription) return;

    const cachedAdaptations = this.adaptationCache.get(subscription.userId);
    if (cachedAdaptations && cachedAdaptations.length > 0) {
      subscription.callback(cachedAdaptations);
    }
  }

  /**
   * Crée des batches d'utilisateurs pour traitement parallèle
   */
  private createUserBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Obtient les triggers saisonniers selon le mois
   */
  private getSeasonalTriggers(month: number) {
    const triggers = [];

    // Printemps (mars-mai)
    if (month >= 3 && month <= 5) {
      triggers.push({
        type: 'spring_vegetables',
        mealType: 'lunch' as const,
        original: 'légumes_surgelés',
        adapted: 'asperges_fraîches',
        reason: 'Asperges de saison disponibles',
        confidence: 0.75,
        savings: 1.20
      });
    }

    // Été (juin-août)  
    if (month >= 6 && month <= 8) {
      triggers.push({
        type: 'summer_fruits',
        mealType: 'dessert' as const,
        original: 'tarte_pommes',
        adapted: 'salade_fruits_saison',
        reason: 'Fruits d\'été à leur apogée',
        confidence: 0.80,
        savings: 2.00
      });
    }

    // Automne (septembre-novembre)
    if (month >= 9 && month <= 11) {
      triggers.push({
        type: 'autumn_squash',
        mealType: 'dinner' as const,
        original: 'pâtes_simples',
        adapted: 'velouté_potimarron',
        reason: 'Courges d\'automne en pleine saison',
        confidence: 0.70,
        savings: 1.50
      });
    }

    // Hiver (décembre-février)
    if (month >= 12 || month <= 2) {
      triggers.push({
        type: 'winter_roots',
        mealType: 'dinner' as const,
        original: 'salade_verte',
        adapted: 'gratin_légumes_racines',
        reason: 'Légumes racines d\'hiver économiques',
        confidence: 0.65,
        savings: 1.80
      });
    }

    return triggers;
  }

  /**
   * Détermine la saison actuelle
   */
  private getCurrentSeason(month: number): string {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  /**
   * Nettoyage des ressources
   */
  destroy(): void {
    this.stopRealTimeAdaptations();
    this.subscribers.clear();
    this.adaptationCache.clear();
  }
}

// Instance globale pour les adaptations temps réel
export const realTimeAdapter = new RealTimeAdapter({
  updateInterval: 30000, // 30 secondes  
  maxAdaptationsPerUpdate: 4,
  confidenceThreshold: 0.6,
  enableWeatherAdaptations: true,
  enableSeasonalAdaptations: true,
  enablePromotionAdaptations: true
});