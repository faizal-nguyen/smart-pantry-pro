/**
 * useRealtime - React hook for WebSocket real-time communication
 * Phase 1 Implementation: Socket.io client integration
 *
 * Features:
 * - Auto-connect with authentication
 * - Event subscription and handling
 * - Reconnection logic
 * - Family collaboration support
 * - Presence tracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';

// Event types (must match server)
export enum RealtimeEvent {
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  AUTH_ERROR = 'auth_error',
  INVENTORY_UPDATE = 'inventory:update',
  INVENTORY_ADD = 'inventory:add',
  INVENTORY_REMOVE = 'inventory:remove',
  INVENTORY_CONSUME = 'inventory:consume',
  INVENTORY_RESTOCK = 'inventory:restock',
  INVENTORY_SYNC = 'inventory:sync',
  SHOPPING_UPDATE = 'shopping:update',
  SHOPPING_ADD = 'shopping:add',
  SHOPPING_REMOVE = 'shopping:remove',
  SHOPPING_CHECK = 'shopping:check',
  SHOPPING_SYNC = 'shopping:sync',
  RECIPE_UPDATE = 'recipe:update',
  RECIPE_ADD = 'recipe:add',
  RECIPE_FAVORITE = 'recipe:favorite',
  MEAL_PLAN_UPDATE = 'mealplan:update',
  MEAL_PLAN_ADD = 'mealplan:add',
  MEAL_PLAN_VOTE = 'mealplan:vote',
  FAMILY_PRESENCE = 'family:presence',
  FAMILY_JOIN = 'family:join',
  FAMILY_LEAVE = 'family:leave',
  FAMILY_CURSOR = 'family:cursor',
  NOTIFICATION_PUSH = 'notification:push',
  NOTIFICATION_EXPIRATION = 'notification:expiration',
  NOTIFICATION_LOW_STOCK = 'notification:low_stock',
  SYNC_REQUEST = 'sync:request',
  SYNC_RESPONSE = 'sync:response'
}

// Payload types
export interface InventoryEventPayload {
  itemId: string;
  item?: unknown;
  quantity?: number;
  action?: string;
  timestamp: string;
  userId: string;
}

export interface ShoppingEventPayload {
  itemId: string;
  item?: unknown;
  checked?: boolean;
  action?: string;
  timestamp: string;
  userId: string;
}

export interface PresencePayload {
  userId: string;
  username: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: string;
  currentPage?: string;
}

export interface NotificationPayload {
  id: string;
  type: 'expiration' | 'low_stock' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

export interface FamilyMember {
  userId: string;
  username: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  currentPage?: string;
}

interface UseRealtimeOptions {
  enabled?: boolean;
  autoConnect?: boolean;
  familyId?: string;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

interface UseRealtimeReturn {
  // Connection status
  isConnected: boolean;
  isAuthenticated: boolean;
  isConnecting: boolean;
  error: Error | null;

  // Socket operations
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // Event subscription
  on: <T = unknown>(event: RealtimeEvent, callback: (payload: T) => void) => () => void;
  off: (event: RealtimeEvent, callback?: (payload: unknown) => void) => void;
  emit: <T = unknown>(event: RealtimeEvent, payload: T) => void;

  // Family collaboration
  familyMembers: FamilyMember[];
  updatePresence: (status: 'online' | 'away', currentPage?: string) => void;
  sendCursor: (x: number, y: number, elementId?: string) => void;

  // Notifications
  notifications: NotificationPayload[];
  clearNotifications: () => void;

  // Sync
  requestSync: () => void;
}

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3030';

export const useRealtime = (options: UseRealtimeOptions = {}): UseRealtimeReturn => {
  const {
    enabled = true,
    autoConnect = true,
    familyId,
    onConnect,
    onDisconnect,
    onError
  } = options;

  const { user, session } = useAuth();

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const eventHandlersRef = useRef<Map<RealtimeEvent, Set<(payload: unknown) => void>>>(new Map());

  // Initialize socket connection
  const connect = useCallback(() => {
    if (!enabled || !user || socketRef.current?.connected) return;

    setIsConnecting(true);
    setError(null);

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('useRealtime: Connected to server');
      setIsConnected(true);
      setIsConnecting(false);

      // Authenticate after connection
      socket.emit(RealtimeEvent.AUTHENTICATE, {
        token: session?.access_token || '',
        userId: user.id,
        familyId
      });

      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('useRealtime: Disconnected', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (err) => {
      console.error('useRealtime: Connection error', err);
      setError(err);
      setIsConnecting(false);
      onError?.(err);
    });

    // Authentication events
    socket.on(RealtimeEvent.AUTHENTICATED, () => {
      console.log('useRealtime: Authenticated');
      setIsAuthenticated(true);
    });

    socket.on(RealtimeEvent.AUTH_ERROR, (data: { error: string }) => {
      console.error('useRealtime: Auth error', data.error);
      setError(new Error(data.error));
      setIsAuthenticated(false);
    });

    // Family presence events
    socket.on(RealtimeEvent.FAMILY_JOIN, (data: { userId: string; timestamp: string }) => {
      console.log('useRealtime: Family member joined', data.userId);
    });

    socket.on(RealtimeEvent.FAMILY_LEAVE, (data: { userId: string; timestamp: string }) => {
      setFamilyMembers(prev => prev.filter(m => m.userId !== data.userId));
    });

    socket.on(RealtimeEvent.FAMILY_PRESENCE, (data: PresencePayload) => {
      setFamilyMembers(prev => {
        const existing = prev.find(m => m.userId === data.userId);
        if (existing) {
          return prev.map(m =>
            m.userId === data.userId
              ? { ...m, ...data, lastSeen: new Date(data.lastSeen) }
              : m
          );
        }
        return [...prev, { ...data, lastSeen: new Date(data.lastSeen) }];
      });
    });

    // Notification events
    socket.on(RealtimeEvent.NOTIFICATION_PUSH, (notification: NotificationPayload) => {
      setNotifications(prev => [...prev, notification]);
    });

    socket.on(RealtimeEvent.NOTIFICATION_EXPIRATION, (notification: NotificationPayload) => {
      setNotifications(prev => [...prev, notification]);
    });

    socket.on(RealtimeEvent.NOTIFICATION_LOW_STOCK, (notification: NotificationPayload) => {
      setNotifications(prev => [...prev, notification]);
    });

    // Forward events to registered handlers
    const forwardEvent = (event: RealtimeEvent) => {
      socket.on(event, (payload: unknown) => {
        const handlers = eventHandlersRef.current.get(event);
        if (handlers) {
          handlers.forEach(handler => handler(payload));
        }
      });
    };

    // Register forwarding for data events
    [
      RealtimeEvent.INVENTORY_UPDATE,
      RealtimeEvent.INVENTORY_ADD,
      RealtimeEvent.INVENTORY_REMOVE,
      RealtimeEvent.INVENTORY_CONSUME,
      RealtimeEvent.INVENTORY_RESTOCK,
      RealtimeEvent.SHOPPING_UPDATE,
      RealtimeEvent.SHOPPING_ADD,
      RealtimeEvent.SHOPPING_REMOVE,
      RealtimeEvent.SHOPPING_CHECK,
      RealtimeEvent.RECIPE_UPDATE,
      RealtimeEvent.MEAL_PLAN_UPDATE,
      RealtimeEvent.SYNC_RESPONSE
    ].forEach(forwardEvent);

    socket.connect();
  }, [enabled, user, session, familyId, onConnect, onDisconnect, onError]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsAuthenticated(false);
    }
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Subscribe to event
  const on = useCallback(<T = unknown>(
    event: RealtimeEvent,
    callback: (payload: T) => void
  ): (() => void) => {
    if (!eventHandlersRef.current.has(event)) {
      eventHandlersRef.current.set(event, new Set());
    }
    eventHandlersRef.current.get(event)!.add(callback as (payload: unknown) => void);

    // Return unsubscribe function
    return () => {
      eventHandlersRef.current.get(event)?.delete(callback as (payload: unknown) => void);
    };
  }, []);

  // Unsubscribe from event
  const off = useCallback((event: RealtimeEvent, callback?: (payload: unknown) => void) => {
    if (callback) {
      eventHandlersRef.current.get(event)?.delete(callback);
    } else {
      eventHandlersRef.current.delete(event);
    }
  }, []);

  // Emit event
  const emit = useCallback(<T = unknown>(event: RealtimeEvent, payload: T) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, payload);
    } else {
      console.warn('useRealtime: Cannot emit, not connected');
    }
  }, []);

  // Update presence
  const updatePresence = useCallback((status: 'online' | 'away', currentPage?: string) => {
    if (!user) return;

    emit(RealtimeEvent.FAMILY_PRESENCE, {
      userId: user.id,
      username: user.email?.split('@')[0] || 'Utilisateur',
      status,
      lastSeen: new Date().toISOString(),
      currentPage
    });
  }, [user, emit]);

  // Send cursor position (for collaborative features)
  const sendCursor = useCallback((x: number, y: number, elementId?: string) => {
    if (!user) return;

    emit(RealtimeEvent.FAMILY_CURSOR, {
      userId: user.id,
      username: user.email?.split('@')[0] || 'Utilisateur',
      x,
      y,
      elementId
    });
  }, [user, emit]);

  // Request sync
  const requestSync = useCallback(() => {
    emit(RealtimeEvent.SYNC_REQUEST, {});
  }, [emit]);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && enabled && user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, enabled, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Periodic presence update
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      updatePresence('online', window.location.pathname);
    }, 30000); // Every 30 seconds

    // Initial presence
    updatePresence('online', window.location.pathname);

    return () => clearInterval(interval);
  }, [isAuthenticated, updatePresence]);

  return {
    isConnected,
    isAuthenticated,
    isConnecting,
    error,
    connect,
    disconnect,
    reconnect,
    on,
    off,
    emit,
    familyMembers,
    updatePresence,
    sendCursor,
    notifications,
    clearNotifications,
    requestSync
  };
};

/**
 * useRealtimeInventory - Convenience hook for inventory real-time updates
 */
export const useRealtimeInventory = (onUpdate?: (payload: InventoryEventPayload) => void) => {
  const realtime = useRealtime();

  useEffect(() => {
    if (!onUpdate || !realtime.isAuthenticated) return;

    const unsubscribe = realtime.on<InventoryEventPayload>(
      RealtimeEvent.INVENTORY_UPDATE,
      onUpdate
    );

    return unsubscribe;
  }, [realtime, onUpdate]);

  const emitUpdate = useCallback((payload: Omit<InventoryEventPayload, 'timestamp'>) => {
    realtime.emit(RealtimeEvent.INVENTORY_UPDATE, {
      ...payload,
      timestamp: new Date().toISOString()
    });
  }, [realtime]);

  const emitAdd = useCallback((payload: Omit<InventoryEventPayload, 'timestamp'>) => {
    realtime.emit(RealtimeEvent.INVENTORY_ADD, {
      ...payload,
      timestamp: new Date().toISOString()
    });
  }, [realtime]);

  const emitRemove = useCallback((payload: Omit<InventoryEventPayload, 'timestamp'>) => {
    realtime.emit(RealtimeEvent.INVENTORY_REMOVE, {
      ...payload,
      timestamp: new Date().toISOString()
    });
  }, [realtime]);

  return {
    ...realtime,
    emitInventoryUpdate: emitUpdate,
    emitInventoryAdd: emitAdd,
    emitInventoryRemove: emitRemove
  };
};

/**
 * useRealtimeShopping - Convenience hook for shopping list real-time updates
 */
export const useRealtimeShopping = (onUpdate?: (payload: ShoppingEventPayload) => void) => {
  const realtime = useRealtime();

  useEffect(() => {
    if (!onUpdate || !realtime.isAuthenticated) return;

    const unsubscribe = realtime.on<ShoppingEventPayload>(
      RealtimeEvent.SHOPPING_UPDATE,
      onUpdate
    );

    return unsubscribe;
  }, [realtime, onUpdate]);

  const emitUpdate = useCallback((payload: Omit<ShoppingEventPayload, 'timestamp'>) => {
    realtime.emit(RealtimeEvent.SHOPPING_UPDATE, {
      ...payload,
      timestamp: new Date().toISOString()
    });
  }, [realtime]);

  const emitCheck = useCallback((payload: Omit<ShoppingEventPayload, 'timestamp'>) => {
    realtime.emit(RealtimeEvent.SHOPPING_CHECK, {
      ...payload,
      timestamp: new Date().toISOString()
    });
  }, [realtime]);

  return {
    ...realtime,
    emitShoppingUpdate: emitUpdate,
    emitShoppingCheck: emitCheck
  };
};

export default useRealtime;
