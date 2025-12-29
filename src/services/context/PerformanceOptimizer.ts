/**
 * Service d'optimisation des performances pour le système contextuel
 * Gère le cache intelligent, la parallélisation et la limitation des appels API
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
  lastAccessed: number;
}

interface PerformanceMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheHitRatio: number;
  averageResponseTime: number;
  failedRequests: number;
  activeRequests: number;
}

interface RequestQueue {
  id: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: number;
  promise: Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry<any>>();
  private requestQueue: RequestQueue[] = [];
  private activeRequests = new Map<string, Promise<any>>();
  private metrics: PerformanceMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheHitRatio: 0,
    averageResponseTime: 0,
    failedRequests: 0,
    activeRequests: 0
  };

  // Configuration par défaut
  private config = {
    maxCacheSize: 200,
    defaultTTL: 3600000, // 1 heure
    maxConcurrentRequests: 5,
    requestTimeout: 10000, // 10 secondes
    retryAttempts: 2,
    retryDelay: 1000
  };

  constructor(customConfig?: Partial<typeof PerformanceOptimizer.prototype.config>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    // Nettoyage automatique du cache toutes les 10 minutes
    setInterval(() => this.cleanupCache(), 600000);
  }

  /**
   * Cache intelligent avec gestion LRU et TTL
   */
  async getCached<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    ttl?: number,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    // Vérifier le cache
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      cached.hitCount++;
      cached.lastAccessed = Date.now();
      this.metrics.cacheHits++;
      this.updateMetrics(startTime);
      return cached.data;
    }

    // Éviter les doublons de requêtes
    if (this.activeRequests.has(key)) {
      return this.activeRequests.get(key)!;
    }

    // Créer la requête avec gestion de priorité
    const requestPromise = this.executeWithQueue(key, fetcher, priority);
    this.activeRequests.set(key, requestPromise);

    try {
      const data = await requestPromise;
      
      // Mettre en cache
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        hitCount: 0,
        lastAccessed: Date.now()
      });
      
      // Nettoyer le cache si nécessaire
      if (this.cache.size > this.config.maxCacheSize) {
        this.evictLeastUsed();
      }
      
      this.updateMetrics(startTime);
      return data;
    } catch (error) {
      this.metrics.failedRequests++;
      throw error;
    } finally {
      this.activeRequests.delete(key);
    }
  }

  /**
   * Exécution avec file d'attente et gestion de priorité
   */
  private async executeWithQueue<T>(
    key: string, 
    fetcher: () => Promise<T>, 
    priority: 'high' | 'medium' | 'low'
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: RequestQueue = {
        id: key,
        priority,
        timestamp: Date.now(),
        promise: this.executeRequest(fetcher),
        resolve,
        reject
      };

      // Ajouter à la file selon la priorité
      if (priority === 'high') {
        this.requestQueue.unshift(request);
      } else {
        this.requestQueue.push(request);
      }

      // Traiter la file
      this.processQueue();
    });
  }

  /**
   * Traitement de la file d'attente
   */
  private async processQueue() {
    if (this.requestQueue.length === 0) return;
    if (this.activeRequests.size >= this.config.maxConcurrentRequests) return;

    const request = this.requestQueue.shift();
    if (!request) return;

    try {
      const result = await request.promise;
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }

    // Continuer le traitement
    setImmediate(() => this.processQueue());
  }

  /**
   * Exécution d'une requête avec retry et timeout
   */
  private async executeRequest<T>(fetcher: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        // Timeout wrapper
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.config.requestTimeout);
        });

        const result = await Promise.race([fetcher(), timeoutPromise]);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        // Attendre avant le retry (sauf pour la dernière tentative)
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Parallélisation optimisée de requêtes
   */
  async parallelFetch<T>(
    requests: Array<{
      key: string;
      fetcher: () => Promise<T>;
      priority?: 'high' | 'medium' | 'low';
      ttl?: number;
    }>
  ): Promise<T[]> {
    const promises = requests.map(({ key, fetcher, priority = 'medium', ttl }) =>
      this.getCached(key, fetcher, ttl, priority)
    );

    return Promise.all(promises);
  }

  /**
   * Nettoyage du cache expiré
   */
  private cleanupCache() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cache cleanup: ${cleanedCount} entries removed`);
    }
  }

  /**
   * Éviction LRU (Least Recently Used)
   */
  private evictLeastUsed() {
    let lruKey = '';
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const score = entry.lastAccessed + (entry.hitCount * 100000); // Favoriser les entrées populaires
      if (score < oldestAccess) {
        oldestAccess = score;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      console.log(`📤 Cache eviction: ${lruKey} removed (LRU)`);
    }
  }

  /**
   * Mise à jour des métriques
   */
  private updateMetrics(startTime: number) {
    const responseTime = Date.now() - startTime;
    this.metrics.averageResponseTime = (
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1)) + responseTime
    ) / this.metrics.totalRequests;
    
    this.metrics.cacheHitRatio = this.metrics.cacheHits / this.metrics.totalRequests;
    this.metrics.activeRequests = this.activeRequests.size;
  }

  /**
   * Préchargement intelligent
   */
  async preload(preloadFunctions: Array<() => Promise<any>>) {
    console.log(`🚀 Preloading ${preloadFunctions.length} resources...`);
    
    const preloadPromises = preloadFunctions.map((fn, index) => 
      this.getCached(
        `preload_${index}`,
        fn,
        this.config.defaultTTL,
        'low' // Priorité basse pour le préchargement
      )
    );

    try {
      await Promise.allSettled(preloadPromises);
      console.log('✅ Preloading completed');
    } catch (error) {
      console.warn('⚠️ Some preload operations failed:', error);
    }
  }

  /**
   * Invalidation sélective du cache
   */
  invalidateCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      console.log('🗑️ Cache cleared completely');
      return;
    }

    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(pattern)
    );

    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ Cache invalidated: ${keysToDelete.length} entries matching "${pattern}"`);
  }

  /**
   * Optimisation basée sur les métriques
   */
  optimize() {
    const { cacheHitRatio, averageResponseTime, failedRequests, totalRequests } = this.metrics;
    
    console.log('📊 Performance Analysis:', {
      cacheHitRatio: `${(cacheHitRatio * 100).toFixed(1)}%`,
      averageResponseTime: `${averageResponseTime.toFixed(0)}ms`,
      failureRate: `${(failedRequests / totalRequests * 100).toFixed(1)}%`,
      cacheSize: this.cache.size,
      activeRequests: this.metrics.activeRequests
    });

    // Auto-optimisations
    if (cacheHitRatio < 0.5) {
      console.log('⚡ Low cache hit ratio, increasing TTL');
      this.config.defaultTTL = Math.min(this.config.defaultTTL * 1.5, 7200000); // Max 2h
    }

    if (averageResponseTime > 3000) {
      console.log('🐌 Slow response time, reducing concurrent requests');
      this.config.maxConcurrentRequests = Math.max(this.config.maxConcurrentRequests - 1, 2);
    }

    if (failedRequests / totalRequests > 0.1) {
      console.log('❌ High failure rate, increasing retry attempts');
      this.config.retryAttempts = Math.min(this.config.retryAttempts + 1, 5);
    }
  }

  /**
   * Métriques en temps réel
   */
  getMetrics(): PerformanceMetrics & {
    cacheSize: number;
    queueSize: number;
    config: typeof this.config;
  } {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      queueSize: this.requestQueue.length,
      config: { ...this.config }
    };
  }

  /**
   * Utilitaire de délai
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset des métriques (pour testing)
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheHitRatio: 0,
      averageResponseTime: 0,
      failedRequests: 0,
      activeRequests: 0
    };
  }
}

// Instance globale optimisée pour le système contextuel
export const contextualPerformanceOptimizer = new PerformanceOptimizer({
  maxCacheSize: 100,
  defaultTTL: 1800000, // 30 minutes pour les données contextuelles
  maxConcurrentRequests: 3, // Limiter pour éviter le rate limiting des APIs
  requestTimeout: 8000, // 8 secondes max par requête
  retryAttempts: 2
});