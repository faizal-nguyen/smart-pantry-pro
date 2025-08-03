import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';

export const useConnectionStatus = () => {
  const { 
    connectionStatus, 
    setOnlineStatus, 
    offlineActions, 
    setSyncInProgress,
    clearOfflineActions 
  } = useAppStore();

  const syncOfflineActions = useCallback(async () => {
    if (offlineActions.length === 0 || connectionStatus.syncInProgress) {
      return;
    }

    setSyncInProgress(true);

    try {
      // Store offline actions in IndexedDB for service worker sync
      await storeOfflineActionsInDB(offlineActions);
      
      // Trigger background sync if supported
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        // Check if sync is supported before using it
        if ('sync' in registration) {
          await (registration as any).sync.register('offline-sync');
        }
      }
      
      clearOfflineActions();
    } catch (error) {
      console.error('Failed to sync offline actions:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [offlineActions, connectionStatus.syncInProgress, setSyncInProgress, clearOfflineActions]);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      syncOfflineActions();
    };

    const handleOffline = () => {
      setOnlineStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status check
    setOnlineStatus(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus, syncOfflineActions]);

  return {
    isOnline: connectionStatus.isOnline,
    isConnected: connectionStatus.isOnline,
    offlineActionsCount: offlineActions.length,
    syncInProgress: connectionStatus.syncInProgress,
    lastSynced: connectionStatus.lastSynced,
  };
};

async function storeOfflineActionsInDB(actions: any[]) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('smart-grocery-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      
      // Clear existing actions and add new ones
      store.clear();
      actions.forEach(action => store.add(action));
      
      transaction.oncomplete = () => resolve(undefined);
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('actions')) {
        db.createObjectStore('actions', { keyPath: 'id' });
      }
    };
  });
}