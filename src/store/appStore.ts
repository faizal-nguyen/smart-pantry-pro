import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ConnectionStatus {
  isOnline: boolean;
  lastSynced: Date | null;
  syncInProgress: boolean;
}

interface OfflineAction {
  id: string;
  type: string;
  data: unknown;
  timestamp: Date;
  retryCount: number;
}

interface NotificationSettings {
  enabled: boolean;
  expiryReminders: boolean;
  shoppingReminders: boolean;
  permission: NotificationPermission;
}

interface AppState {
  // Connection status
  connectionStatus: ConnectionStatus;
  offlineActions: OfflineAction[];
  
  // Notifications
  notificationSettings: NotificationSettings;
  
  // UI State
  installPromptEvent: Event | null;
  isInstallable: boolean;
  isInstalled: boolean;
  
  // Performance
  lastDataFetch: Record<string, Date>;
  cachedData: Record<string, unknown>;
  
  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  addOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  removeOfflineAction: (actionId: string) => void;
  clearOfflineActions: () => void;
  setSyncInProgress: (inProgress: boolean) => void;
  
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  requestNotificationPermission: () => Promise<void>;
  
  setInstallPromptEvent: (event: Event | null) => void;
  setInstallable: (installable: boolean) => void;
  setInstalled: (installed: boolean) => void;
  
  setCachedData: (key: string, data: unknown) => void;
  getCachedData: (key: string) => unknown;
  clearCachedData: (key?: string) => void;
  
  updateLastFetch: (key: string) => void;
  shouldRefetch: (key: string, maxAge: number) => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      connectionStatus: {
        isOnline: navigator.onLine,
        lastSynced: null,
        syncInProgress: false,
      },
      offlineActions: [],
      
      notificationSettings: {
        enabled: false,
        expiryReminders: true,
        shoppingReminders: true,
        permission: 'default',
      },
      
      installPromptEvent: null,
      isInstallable: false,
      isInstalled: false,
      
      lastDataFetch: {},
      cachedData: {},
      
      // Actions
      setOnlineStatus: (isOnline) => 
        set((state) => ({
          connectionStatus: {
            ...state.connectionStatus,
            isOnline,
            lastSynced: isOnline ? new Date() : state.connectionStatus.lastSynced,
          },
        })),
      
      addOfflineAction: (action) => 
        set((state) => ({
          offlineActions: [
            ...state.offlineActions,
            {
              ...action,
              id: crypto.randomUUID(),
              timestamp: new Date(),
              retryCount: 0,
            },
          ],
        })),
      
      removeOfflineAction: (actionId) =>
        set((state) => ({
          offlineActions: state.offlineActions.filter(action => action.id !== actionId),
        })),
      
      clearOfflineActions: () =>
        set({ offlineActions: [] }),
      
      setSyncInProgress: (syncInProgress) =>
        set((state) => ({
          connectionStatus: {
            ...state.connectionStatus,
            syncInProgress,
          },
        })),
      
      updateNotificationSettings: (settings) =>
        set((state) => ({
          notificationSettings: {
            ...state.notificationSettings,
            ...settings,
          },
        })),
      
      requestNotificationPermission: async () => {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          set((state) => ({
            notificationSettings: {
              ...state.notificationSettings,
              permission,
              enabled: permission === 'granted',
            },
          }));
        }
      },
      
      setInstallPromptEvent: (event) =>
        set({ installPromptEvent: event }),
      
      setInstallable: (installable) =>
        set({ isInstallable: installable }),
      
      setInstalled: (installed) =>
        set({ isInstalled: installed }),
      
      setCachedData: (key, data) =>
        set((state) => ({
          cachedData: {
            ...state.cachedData,
            [key]: data,
          },
        })),
      
      getCachedData: (key) => get().cachedData[key],
      
      clearCachedData: (key) =>
        set((state) => {
          if (key) {
            const { [key]: removed, ...rest } = state.cachedData;
            return { cachedData: rest };
          }
          return { cachedData: {} };
        }),
      
      updateLastFetch: (key) =>
        set((state) => ({
          lastDataFetch: {
            ...state.lastDataFetch,
            [key]: new Date(),
          },
        })),
      
      shouldRefetch: (key, maxAge) => {
        const lastFetch = get().lastDataFetch[key];
        if (!lastFetch) return true;
        return Date.now() - lastFetch.getTime() > maxAge;
      },
    }),
    {
      name: 'smart-grocery-app-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        notificationSettings: state.notificationSettings,
        isInstalled: state.isInstalled,
        cachedData: state.cachedData,
        lastDataFetch: state.lastDataFetch,
      }),
    }
  )
);

// Offline action types
export const OfflineActionTypes = {
  ADD_TO_INVENTORY: 'ADD_TO_INVENTORY',
  UPDATE_INVENTORY: 'UPDATE_INVENTORY',
  DELETE_FROM_INVENTORY: 'DELETE_FROM_INVENTORY',
  ADD_TO_SHOPPING_LIST: 'ADD_TO_SHOPPING_LIST',
  UPDATE_SHOPPING_LIST: 'UPDATE_SHOPPING_LIST',
  DELETE_FROM_SHOPPING_LIST: 'DELETE_FROM_SHOPPING_LIST',
  ADD_PRODUCT: 'ADD_PRODUCT',
  SEND_MESSAGE: 'SEND_MESSAGE',
} as const;

export type OfflineActionType = typeof OfflineActionTypes[keyof typeof OfflineActionTypes];