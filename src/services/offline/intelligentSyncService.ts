/**
 * Intelligent Sync Service - Evolution V2
 * Advanced offline-first architecture with smart conflict resolution and sync optimization
 */

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'inventory' | 'recipe' | 'meal_plan' | 'shopping_list' | 'health_profile' | 'community_post';
  data: any;
  timestamp: Date;
  userId: string;
  deviceId: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[]; // Other operation IDs this depends on
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict';
  conflictResolution?: ConflictResolution;
  compressedData?: string; // For large operations
}

export interface ConflictResolution {
  strategy: 'client_wins' | 'server_wins' | 'merge' | 'manual';
  mergeFields?: string[];
  manualResolution?: any;
  resolvedAt?: Date;
  resolvedBy?: 'system' | 'user';
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingOperations: number;
  conflictCount: number;
  syncProgress: number; // 0-100
  bandwidthMode: 'high' | 'medium' | 'low' | 'offline';
  batteryOptimized: boolean;
  estimatedSyncTime: number; // seconds
}

export interface SyncConfiguration {
  batchSize: number;
  syncInterval: number; // milliseconds
  retryBackoffMultiplier: number;
  maxRetryDelay: number; // milliseconds
  compressionEnabled: boolean;
  conflictResolutionTimeout: number; // milliseconds
  prioritySyncEnabled: boolean;
  backgroundSyncEnabled: boolean;
  cellularDataAllowed: boolean;
  batteryOptimizationLevel: 'none' | 'moderate' | 'aggressive';
}

export interface OfflineCapability {
  entityType: string;
  operations: ('create' | 'update' | 'delete' | 'read')[];
  cacheStrategy: 'memory' | 'localStorage' | 'indexedDB';
  maxCacheSize: number; // MB
  cacheExpiration: number; // milliseconds
  syncPriority: 'low' | 'medium' | 'high';
  conflictResolutionStrategy: ConflictResolution['strategy'];
}

export interface SyncMetrics {
  totalOperations: number;
  successfulSyncs: number;
  failedSyncs: number;
  conflictsResolved: number;
  averageSyncTime: number;
  dataTransferred: number; // bytes
  batteryUsage: number; // percentage
  networkUsage: NetworkUsage;
  cacheHitRate: number; // percentage
  lastUpdated: Date;
}

export interface NetworkUsage {
  wifi: number; // bytes
  cellular: number; // bytes
  total: number; // bytes
  compressionSavings: number; // bytes saved through compression
}

export interface SyncConflict {
  id: string;
  operationId: string;
  entityType: string;
  entityId: string;
  clientData: any;
  serverData: any;
  conflictFields: string[];
  detectedAt: Date;
  autoResolvable: boolean;
  suggestedResolution: ConflictResolution;
  priority: 'low' | 'medium' | 'high';
}

export interface SyncPlan {
  operations: SyncOperation[];
  estimatedTime: number;
  estimatedBandwidth: number;
  batchGroups: SyncBatch[];
  conflicts: SyncConflict[];
  optimizations: SyncOptimization[];
}

export interface SyncBatch {
  id: string;
  operations: SyncOperation[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: number;
  dependencies: string[];
  canRunInParallel: boolean;
}

export interface SyncOptimization {
  type: 'compression' | 'batching' | 'deduplication' | 'delta_sync' | 'background_sync';
  description: string;
  estimatedSavings: {
    time?: number; // seconds
    bandwidth?: number; // bytes
    battery?: number; // percentage
  };
  applied: boolean;
}

export class IntelligentSyncService {
  private db: IDBDatabase | null = null;
  private config: SyncConfiguration;
  private syncState: SyncState;
  private capabilities: Map<string, OfflineCapability>;
  private eventHandlers: Map<string, Function[]>;
  private syncWorker: ServiceWorker | null = null;
  private apiUrl: string;
  private authToken?: string;

  constructor(apiUrl: string, authToken?: string) {
    this.apiUrl = apiUrl;
    this.authToken = authToken;
    this.config = this.getDefaultConfig();
    this.syncState = this.getInitialSyncState();
    this.capabilities = new Map();
    this.eventHandlers = new Map();
    
    this.initializeDatabase();
    this.initializeServiceWorker();
    this.registerCapabilities();
  }

  /**
   * Configuration and Initialization
   */
  private getDefaultConfig(): SyncConfiguration {
    return {
      batchSize: 10,
      syncInterval: 30000, // 30 seconds
      retryBackoffMultiplier: 2,
      maxRetryDelay: 300000, // 5 minutes
      compressionEnabled: true,
      conflictResolutionTimeout: 60000, // 1 minute
      prioritySyncEnabled: true,
      backgroundSyncEnabled: true,
      cellularDataAllowed: false,
      batteryOptimizationLevel: 'moderate'
    };
  }

  private getInitialSyncState(): SyncState {
    return {
      isOnline: navigator.onLine,
      isSyncing: false,
      lastSync: null,
      pendingOperations: 0,
      conflictCount: 0,
      syncProgress: 0,
      bandwidthMode: 'high',
      batteryOptimized: false,
      estimatedSyncTime: 0
    };
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SmartPantrySyncDB', 2);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Sync operations store
        if (!db.objectStoreNames.contains('syncOperations')) {
          const operationsStore = db.createObjectStore('syncOperations', { keyPath: 'id' });
          operationsStore.createIndex('timestamp', 'timestamp');
          operationsStore.createIndex('status', 'status');
          operationsStore.createIndex('priority', 'priority');
          operationsStore.createIndex('entity', 'entity');
        }

        // Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'id' });
          conflictsStore.createIndex('entityType', 'entityType');
          conflictsStore.createIndex('priority', 'priority');
          conflictsStore.createIndex('detectedAt', 'detectedAt');
        }

        // Cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'id' });
          cacheStore.createIndex('entityType', 'entityType');
          cacheStore.createIndex('lastAccessed', 'lastAccessed');
          cacheStore.createIndex('expiresAt', 'expiresAt');
        }

        // Metrics store
        if (!db.objectStoreNames.contains('metrics')) {
          const metricsStore = db.createObjectStore('metrics', { keyPath: 'date' });
        }
      };
    });
  }

  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.syncWorker = registration.active;
        
        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    }
  }

  private registerCapabilities(): void {
    // Register standard capabilities for each entity type
    const capabilities: OfflineCapability[] = [
      {
        entityType: 'inventory',
        operations: ['create', 'update', 'delete', 'read'],
        cacheStrategy: 'indexedDB',
        maxCacheSize: 50,
        cacheExpiration: 86400000, // 24 hours
        syncPriority: 'high',
        conflictResolutionStrategy: 'merge'
      },
      {
        entityType: 'recipe',
        operations: ['create', 'update', 'delete', 'read'],
        cacheStrategy: 'indexedDB',
        maxCacheSize: 100,
        cacheExpiration: 604800000, // 7 days
        syncPriority: 'medium',
        conflictResolutionStrategy: 'client_wins'
      },
      {
        entityType: 'meal_plan',
        operations: ['create', 'update', 'delete', 'read'],
        cacheStrategy: 'indexedDB',
        maxCacheSize: 30,
        cacheExpiration: 86400000, // 24 hours
        syncPriority: 'high',
        conflictResolutionStrategy: 'server_wins'
      },
      {
        entityType: 'shopping_list',
        operations: ['create', 'update', 'delete', 'read'],
        cacheStrategy: 'indexedDB',
        maxCacheSize: 20,
        cacheExpiration: 43200000, // 12 hours
        syncPriority: 'high',
        conflictResolutionStrategy: 'merge'
      },
      {
        entityType: 'health_profile',
        operations: ['update', 'read'],
        cacheStrategy: 'localStorage',
        maxCacheSize: 5,
        cacheExpiration: 86400000, // 24 hours
        syncPriority: 'medium',
        conflictResolutionStrategy: 'client_wins'
      }
    ];

    capabilities.forEach(capability => {
      this.capabilities.set(capability.entityType, capability);
    });
  }

  /**
   * Sync Operations Management
   */
  async queueOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const syncOperation: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending'
    };

    // Optimize operation data if compression is enabled
    if (this.config.compressionEnabled && this.shouldCompress(syncOperation.data)) {
      syncOperation.compressedData = await this.compressData(syncOperation.data);
    }

    // Store operation in IndexedDB
    await this.storeOperation(syncOperation);

    // Update sync state
    this.syncState.pendingOperations++;
    this.emit('syncStateChanged', this.syncState);

    // Trigger immediate sync if high priority and online
    if (syncOperation.priority === 'critical' && this.syncState.isOnline) {
      this.triggerSync();
    }

    return syncOperation.id;
  }

  async cancelOperation(operationId: string): Promise<boolean> {
    const operation = await this.getOperation(operationId);
    if (!operation || operation.status === 'completed') {
      return false;
    }

    await this.deleteOperation(operationId);
    this.syncState.pendingOperations = Math.max(0, this.syncState.pendingOperations - 1);
    this.emit('operationCancelled', { operationId });
    
    return true;
  }

  /**
   * Intelligent Sync Execution
   */
  async startSync(): Promise<void> {
    if (this.syncState.isSyncing || !this.syncState.isOnline) {
      return;
    }

    this.syncState.isSyncing = true;
    this.syncState.syncProgress = 0;
    this.emit('syncStarted');

    try {
      // Create sync plan
      const syncPlan = await this.createSyncPlan();
      
      // Apply optimizations
      await this.applySyncOptimizations(syncPlan);
      
      // Execute sync batches
      for (const batch of syncPlan.batchGroups) {
        await this.executeSyncBatch(batch);
      }
      
      // Resolve conflicts
      if (syncPlan.conflicts.length > 0) {
        await this.resolveConflicts(syncPlan.conflicts);
      }
      
      // Update metrics
      await this.updateSyncMetrics();
      
      this.syncState.lastSync = new Date();
      this.syncState.pendingOperations = await this.getPendingOperationsCount();
      
      this.emit('syncCompleted', { 
        operationsProcessed: syncPlan.operations.length,
        conflictsResolved: syncPlan.conflicts.length 
      });
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.emit('syncFailed', { error: error.message });
    } finally {
      this.syncState.isSyncing = false;
      this.syncState.syncProgress = 100;
      this.emit('syncStateChanged', this.syncState);
    }
  }

  private async createSyncPlan(): Promise<SyncPlan> {
    const operations = await this.getPendingOperations();
    const conflicts = await this.getUnresolvedConflicts();
    
    // Sort operations by priority and dependencies
    const sortedOperations = this.sortOperationsByPriority(operations);
    
    // Group into batches
    const batchGroups = this.createSyncBatches(sortedOperations);
    
    // Calculate estimates
    const estimatedTime = batchGroups.reduce((total, batch) => total + batch.estimatedTime, 0);
    const estimatedBandwidth = this.calculateBandwidthUsage(operations);
    
    // Identify optimizations
    const optimizations = this.identifyOptimizations(operations);
    
    return {
      operations: sortedOperations,
      estimatedTime,
      estimatedBandwidth,
      batchGroups,
      conflicts,
      optimizations
    };
  }

  private async executeSyncBatch(batch: SyncBatch): Promise<void> {
    const results = await Promise.allSettled(
      batch.operations.map(operation => this.executeSyncOperation(operation))
    );
    
    // Process results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const operation = batch.operations[i];
      
      if (result.status === 'fulfilled') {
        await this.markOperationCompleted(operation.id);
      } else {
        await this.handleOperationFailure(operation, result.reason);
      }
    }
    
    // Update progress
    const completedOps = results.filter(r => r.status === 'fulfilled').length;
    this.syncState.syncProgress += (completedOps / batch.operations.length) * 
                                   (100 / batch.operations.length);
    
    this.emit('syncProgress', { progress: this.syncState.syncProgress });
  }

  private async executeSyncOperation(operation: SyncOperation): Promise<any> {
    const capability = this.capabilities.get(operation.entity);
    if (!capability) {
      throw new Error(`No capability registered for entity: ${operation.entity}`);
    }

    // Decompress data if needed
    const operationData = operation.compressedData 
      ? await this.decompressData(operation.compressedData)
      : operation.data;

    // Build API endpoint
    const endpoint = this.buildAPIEndpoint(operation.entity, operation.type, operationData);
    
    // Execute HTTP request
    const response = await this.makeAPIRequest(operation.type, endpoint, operationData);
    
    // Handle potential conflicts
    if (response.conflict) {
      await this.handleSyncConflict(operation, response.conflict);
      throw new Error('Sync conflict detected');
    }
    
    return response;
  }

  /**
   * Conflict Resolution
   */
  private async handleSyncConflict(operation: SyncOperation, conflictData: any): Promise<void> {
    const conflict: SyncConflict = {
      id: this.generateConflictId(),
      operationId: operation.id,
      entityType: operation.entity,
      entityId: conflictData.entityId,
      clientData: operation.data,
      serverData: conflictData.serverData,
      conflictFields: conflictData.conflictFields,
      detectedAt: new Date(),
      autoResolvable: this.isAutoResolvable(conflictData.conflictFields),
      suggestedResolution: this.generateSuggestedResolution(operation, conflictData),
      priority: this.calculateConflictPriority(operation, conflictData)
    };

    await this.storeConflict(conflict);
    this.syncState.conflictCount++;

    // Try auto-resolution if possible
    if (conflict.autoResolvable) {
      await this.attemptAutoResolution(conflict);
    } else {
      this.emit('conflictDetected', conflict);
    }
  }

  private async attemptAutoResolution(conflict: SyncConflict): Promise<boolean> {
    const capability = this.capabilities.get(conflict.entityType);
    if (!capability) return false;

    const strategy = capability.conflictResolutionStrategy;
    let resolution: ConflictResolution;

    switch (strategy) {
      case 'client_wins':
        resolution = { strategy: 'client_wins', resolvedBy: 'system', resolvedAt: new Date() };
        break;
      case 'server_wins':
        resolution = { strategy: 'server_wins', resolvedBy: 'system', resolvedAt: new Date() };
        break;
      case 'merge':
        resolution = await this.attemptMergeResolution(conflict);
        break;
      default:
        return false;
    }

    return this.applyConflictResolution(conflict.id, resolution);
  }

  private async attemptMergeResolution(conflict: SyncConflict): Promise<ConflictResolution> {
    // Intelligent field-level merging
    const mergeFields: string[] = [];
    
    for (const field of conflict.conflictFields) {
      if (this.canAutoMergeField(field, conflict.clientData[field], conflict.serverData[field])) {
        mergeFields.push(field);
      }
    }
    
    return {
      strategy: 'merge',
      mergeFields,
      resolvedBy: 'system',
      resolvedAt: new Date()
    };
  }

  /**
   * Cache Management
   */
  async cacheEntity(entityType: string, entityId: string, data: any): Promise<void> {
    const capability = this.capabilities.get(entityType);
    if (!capability) return;

    const cacheEntry = {
      id: `${entityType}:${entityId}`,
      entityType,
      entityId,
      data,
      lastAccessed: new Date(),
      expiresAt: new Date(Date.now() + capability.cacheExpiration)
    };

    if (capability.cacheStrategy === 'indexedDB') {
      await this.storeCacheEntry(cacheEntry);
    } else if (capability.cacheStrategy === 'localStorage') {
      localStorage.setItem(cacheEntry.id, JSON.stringify(cacheEntry));
    }
  }

  async getCachedEntity(entityType: string, entityId: string): Promise<any | null> {
    const capability = this.capabilities.get(entityType);
    if (!capability) return null;

    const cacheId = `${entityType}:${entityId}`;
    let cacheEntry: any;

    if (capability.cacheStrategy === 'indexedDB') {
      cacheEntry = await this.getCacheEntry(cacheId);
    } else if (capability.cacheStrategy === 'localStorage') {
      const cached = localStorage.getItem(cacheId);
      cacheEntry = cached ? JSON.parse(cached) : null;
    }

    if (!cacheEntry) return null;

    // Check expiration
    if (new Date(cacheEntry.expiresAt) < new Date()) {
      await this.removeCachedEntity(entityType, entityId);
      return null;
    }

    // Update last accessed
    cacheEntry.lastAccessed = new Date();
    if (capability.cacheStrategy === 'indexedDB') {
      await this.storeCacheEntry(cacheEntry);
    } else {
      localStorage.setItem(cacheId, JSON.stringify(cacheEntry));
    }

    return cacheEntry.data;
  }

  /**
   * Background Sync
   */
  private async registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && this.config.backgroundSyncEnabled) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('background-sync');
      } catch (error) {
        console.warn('Background sync registration failed:', error);
      }
    }
  }

  /**
   * Network and Battery Optimization
   */
  private async optimizeForNetworkCondition(): Promise<void> {
    // Detect network conditions
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          this.syncState.bandwidthMode = 'low';
          this.config.batchSize = 5;
          break;
        case '3g':
          this.syncState.bandwidthMode = 'medium';
          this.config.batchSize = 10;
          break;
        case '4g':
        default:
          this.syncState.bandwidthMode = 'high';
          this.config.batchSize = 20;
      }
    }
  }

  private async optimizeForBattery(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        const batteryLevel = battery.level;
        const isCharging = battery.charging;
        
        if (batteryLevel < 0.2 && !isCharging) {
          // Low battery mode
          this.syncState.batteryOptimized = true;
          this.config.syncInterval = 60000; // Sync less frequently
          this.config.batchSize = 5; // Smaller batches
        } else {
          this.syncState.batteryOptimized = false;
          this.config.syncInterval = 30000; // Normal sync frequency
        }
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    }
  }

  /**
   * Event Handling
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler?: Function): void {
    if (!handler) {
      this.eventHandlers.delete(event);
    } else {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Event handler error:', error);
        }
      });
    }
  }

  /**
   * Utility Methods and Database Operations
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeOperation(operation: SyncOperation): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['syncOperations'], 'readwrite');
    const store = transaction.objectStore('syncOperations');
    await store.put(operation);
  }

  private async getOperation(operationId: string): Promise<SyncOperation | null> {
    if (!this.db) return null;
    
    const transaction = this.db.transaction(['syncOperations'], 'readonly');
    const store = transaction.objectStore('syncOperations');
    return await store.get(operationId) || null;
  }

  private async getPendingOperations(): Promise<SyncOperation[]> {
    if (!this.db) return [];
    
    const transaction = this.db.transaction(['syncOperations'], 'readonly');
    const store = transaction.objectStore('syncOperations');
    const index = store.index('status');
    const operations = await index.getAll('pending');
    
    return operations.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private buildAPIEndpoint(entity: string, operation: string, data: any): string {
    const baseEndpoint = `/api/${entity}`;
    
    switch (operation) {
      case 'create':
        return baseEndpoint;
      case 'update':
        return `${baseEndpoint}/${data.id}`;
      case 'delete':
        return `${baseEndpoint}/${data.id}`;
      default:
        return baseEndpoint;
    }
  }

  private async makeAPIRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const config: RequestInit = {
      method: method.toUpperCase(),
      headers,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Public API
   */
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  updateConfiguration(config: Partial<SyncConfiguration>): void {
    this.config = { ...this.config, ...config };
  }

  async triggerSync(): Promise<void> {
    return this.startSync();
  }

  async clearCache(): Promise<void> {
    if (!this.db) return;
    
    const transaction = this.db.transaction(['cache'], 'readwrite');
    const store = transaction.objectStore('cache');
    await store.clear();
  }

  async getSyncMetrics(): Promise<SyncMetrics> {
    // This would be implemented to retrieve metrics from storage
    return {
      totalOperations: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      conflictsResolved: 0,
      averageSyncTime: 0,
      dataTransferred: 0,
      batteryUsage: 0,
      networkUsage: { wifi: 0, cellular: 0, total: 0, compressionSavings: 0 },
      cacheHitRate: 0,
      lastUpdated: new Date()
    };
  }

  // Additional helper methods would be implemented here...
  private sortOperationsByPriority(operations: SyncOperation[]): SyncOperation[] { return operations; }
  private createSyncBatches(operations: SyncOperation[]): SyncBatch[] { return []; }
  private calculateBandwidthUsage(operations: SyncOperation[]): number { return 0; }
  private identifyOptimizations(operations: SyncOperation[]): SyncOptimization[] { return []; }
  private async applySyncOptimizations(plan: SyncPlan): Promise<void> {}
  private async resolveConflicts(conflicts: SyncConflict[]): Promise<void> {}
  private async updateSyncMetrics(): Promise<void> {}
  private async getPendingOperationsCount(): Promise<number> { return 0; }
  private async getUnresolvedConflicts(): Promise<SyncConflict[]> { return []; }
  private async markOperationCompleted(operationId: string): Promise<void> {}
  private async handleOperationFailure(operation: SyncOperation, reason: any): Promise<void> {}
  private shouldCompress(data: any): boolean { return false; }
  private async compressData(data: any): Promise<string> { return ''; }
  private async decompressData(data: string): Promise<any> { return {}; }
  private handleServiceWorkerMessage(data: any): void {}
  private isAutoResolvable(fields: string[]): boolean { return false; }
  private generateSuggestedResolution(operation: SyncOperation, conflictData: any): ConflictResolution { return { strategy: 'client_wins' }; }
  private calculateConflictPriority(operation: SyncOperation, conflictData: any): 'low' | 'medium' | 'high' { return 'medium'; }
  private async storeConflict(conflict: SyncConflict): Promise<void> {}
  private async applyConflictResolution(conflictId: string, resolution: ConflictResolution): Promise<boolean> { return true; }
  private canAutoMergeField(field: string, clientValue: any, serverValue: any): boolean { return false; }
  private async storeCacheEntry(entry: any): Promise<void> {}
  private async getCacheEntry(id: string): Promise<any> { return null; }
  private async removeCachedEntity(entityType: string, entityId: string): Promise<void> {}
  private async deleteOperation(operationId: string): Promise<void> {}
}

// Export singleton instance
let intelligentSyncInstance: IntelligentSyncService | null = null;

export function getIntelligentSyncService(apiUrl?: string, authToken?: string): IntelligentSyncService {
  const defaultApiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  
  if (!intelligentSyncInstance) {
    intelligentSyncInstance = new IntelligentSyncService(apiUrl || defaultApiUrl, authToken);
  }
  
  if (authToken) {
    intelligentSyncInstance['authToken'] = authToken;
  }
  
  return intelligentSyncInstance;
}