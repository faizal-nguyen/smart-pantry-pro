/**
 * RealtimeService - WebSocket real-time communication for Smart Pantry Pro
 * Phase 1 Implementation: Socket.io foundation for real-time events
 *
 * Features:
 * - User-scoped rooms (each user gets their own room)
 * - Family/household rooms (shared space for family members)
 * - Event broadcasting for inventory, shopping, notifications
 * - Connection management with authentication
 * - Presence tracking
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Event types for type-safe communication
export enum RealtimeEvent {
  // Connection events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // Authentication
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  AUTH_ERROR = 'auth_error',

  // Inventory events
  INVENTORY_UPDATE = 'inventory:update',
  INVENTORY_ADD = 'inventory:add',
  INVENTORY_REMOVE = 'inventory:remove',
  INVENTORY_CONSUME = 'inventory:consume',
  INVENTORY_RESTOCK = 'inventory:restock',
  INVENTORY_SYNC = 'inventory:sync',

  // Shopping list events
  SHOPPING_UPDATE = 'shopping:update',
  SHOPPING_ADD = 'shopping:add',
  SHOPPING_REMOVE = 'shopping:remove',
  SHOPPING_CHECK = 'shopping:check',
  SHOPPING_SYNC = 'shopping:sync',

  // Recipe events
  RECIPE_UPDATE = 'recipe:update',
  RECIPE_ADD = 'recipe:add',
  RECIPE_FAVORITE = 'recipe:favorite',

  // Meal planning events
  MEAL_PLAN_UPDATE = 'mealplan:update',
  MEAL_PLAN_ADD = 'mealplan:add',
  MEAL_PLAN_VOTE = 'mealplan:vote',

  // Family/collaboration events
  FAMILY_PRESENCE = 'family:presence',
  FAMILY_JOIN = 'family:join',
  FAMILY_LEAVE = 'family:leave',
  FAMILY_CURSOR = 'family:cursor',

  // Notification events
  NOTIFICATION_PUSH = 'notification:push',
  NOTIFICATION_EXPIRATION = 'notification:expiration',
  NOTIFICATION_LOW_STOCK = 'notification:low_stock',

  // Sync events
  SYNC_REQUEST = 'sync:request',
  SYNC_RESPONSE = 'sync:response'
}

// Payload types
export interface AuthPayload {
  token: string;
  userId: string;
  familyId?: string;
}

export interface InventoryPayload {
  itemId: string;
  item?: unknown;
  quantity?: number;
  action?: string;
  timestamp: string;
  userId: string;
}

export interface ShoppingPayload {
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

export interface CursorPayload {
  userId: string;
  username: string;
  x: number;
  y: number;
  elementId?: string;
}

export interface NotificationPayload {
  id: string;
  type: 'expiration' | 'low_stock' | 'info' | 'warning' | 'success';
  title: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

// Connected user tracking
interface ConnectedUser {
  socketId: string;
  userId: string;
  familyId?: string;
  username?: string;
  connectedAt: Date;
  lastActivity: Date;
  currentPage?: string;
}

class RealtimeService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds (multiple devices)

  /**
   * Initialize the Socket.io server
   */
  initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [
          'http://localhost:3002',
          'http://localhost:3000',
          'https://smart-pantry-pro.vercel.app'
        ],
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });

    this.setupConnectionHandlers();
    console.log('RealtimeService: Socket.io initialized');

    return this.io;
  }

  /**
   * Setup connection and event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.io) return;

    this.io.on(RealtimeEvent.CONNECTION, (socket: Socket) => {
      console.log(`RealtimeService: New connection ${socket.id}`);

      // Authentication handler
      socket.on(RealtimeEvent.AUTHENTICATE, (payload: AuthPayload) => {
        this.handleAuthentication(socket, payload);
      });

      // Disconnect handler
      socket.on(RealtimeEvent.DISCONNECT, (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Inventory event handlers
      socket.on(RealtimeEvent.INVENTORY_UPDATE, (payload: InventoryPayload) => {
        this.broadcastToUserRooms(socket, RealtimeEvent.INVENTORY_UPDATE, payload);
      });

      socket.on(RealtimeEvent.INVENTORY_ADD, (payload: InventoryPayload) => {
        this.broadcastToUserRooms(socket, RealtimeEvent.INVENTORY_ADD, payload);
      });

      socket.on(RealtimeEvent.INVENTORY_REMOVE, (payload: InventoryPayload) => {
        this.broadcastToUserRooms(socket, RealtimeEvent.INVENTORY_REMOVE, payload);
      });

      socket.on(RealtimeEvent.INVENTORY_CONSUME, (payload: InventoryPayload) => {
        this.broadcastToUserRooms(socket, RealtimeEvent.INVENTORY_CONSUME, payload);
      });

      // Shopping list event handlers
      socket.on(RealtimeEvent.SHOPPING_UPDATE, (payload: ShoppingPayload) => {
        this.broadcastToUserRooms(socket, RealtimeEvent.SHOPPING_UPDATE, payload);
      });

      socket.on(RealtimeEvent.SHOPPING_ADD, (payload: ShoppingPayload) => {
        this.broadcastToUserRooms(socket, RealtimeEvent.SHOPPING_ADD, payload);
      });

      socket.on(RealtimeEvent.SHOPPING_CHECK, (payload: ShoppingPayload) => {
        this.broadcastToUserRooms(socket, RealtimeEvent.SHOPPING_CHECK, payload);
      });

      // Presence event handlers
      socket.on(RealtimeEvent.FAMILY_PRESENCE, (payload: PresencePayload) => {
        this.handlePresenceUpdate(socket, payload);
      });

      socket.on(RealtimeEvent.FAMILY_CURSOR, (payload: CursorPayload) => {
        this.broadcastToFamilyRoom(socket, RealtimeEvent.FAMILY_CURSOR, payload);
      });

      // Sync handlers
      socket.on(RealtimeEvent.SYNC_REQUEST, () => {
        this.handleSyncRequest(socket);
      });
    });
  }

  /**
   * Handle user authentication
   */
  private handleAuthentication(socket: Socket, payload: AuthPayload): void {
    try {
      // TODO: Verify JWT token with Supabase
      // For now, we trust the payload (should be validated server-side)
      const { userId, familyId } = payload;

      // Store user connection
      const connectedUser: ConnectedUser = {
        socketId: socket.id,
        userId,
        familyId,
        connectedAt: new Date(),
        lastActivity: new Date()
      };

      this.connectedUsers.set(socket.id, connectedUser);

      // Track multiple sockets per user (multi-device support)
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Join family room if applicable
      if (familyId) {
        socket.join(`family:${familyId}`);
      }

      // Confirm authentication
      socket.emit(RealtimeEvent.AUTHENTICATED, {
        success: true,
        socketId: socket.id,
        rooms: Array.from(socket.rooms)
      });

      // Notify family members of presence
      if (familyId) {
        this.io?.to(`family:${familyId}`).emit(RealtimeEvent.FAMILY_JOIN, {
          userId,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
      }

      console.log(`RealtimeService: User ${userId} authenticated (socket: ${socket.id})`);
    } catch (error) {
      console.error('RealtimeService: Authentication error', error);
      socket.emit(RealtimeEvent.AUTH_ERROR, {
        error: 'Authentication failed'
      });
    }
  }

  /**
   * Handle user disconnect
   */
  private handleDisconnect(socket: Socket, reason: string): void {
    const user = this.connectedUsers.get(socket.id);

    if (user) {
      // Remove socket from user's socket set
      const userSocketSet = this.userSockets.get(user.userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(user.userId);

          // User is completely offline, notify family
          if (user.familyId) {
            this.io?.to(`family:${user.familyId}`).emit(RealtimeEvent.FAMILY_LEAVE, {
              userId: user.userId,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      this.connectedUsers.delete(socket.id);
      console.log(`RealtimeService: User ${user.userId} disconnected (reason: ${reason})`);
    }
  }

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(socket: Socket, payload: PresencePayload): void {
    const user = this.connectedUsers.get(socket.id);
    if (user) {
      user.lastActivity = new Date();
      user.currentPage = payload.currentPage;
      user.username = payload.username;

      if (user.familyId) {
        // Broadcast to family room excluding sender
        socket.to(`family:${user.familyId}`).emit(RealtimeEvent.FAMILY_PRESENCE, {
          ...payload,
          lastSeen: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Handle sync request
   */
  private handleSyncRequest(socket: Socket): void {
    const user = this.connectedUsers.get(socket.id);
    if (user) {
      socket.emit(RealtimeEvent.SYNC_RESPONSE, {
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Sync request received. Data will be pushed.'
      });
    }
  }

  /**
   * Broadcast to user's personal room and family room
   */
  private broadcastToUserRooms(socket: Socket, event: RealtimeEvent, payload: unknown): void {
    const user = this.connectedUsers.get(socket.id);
    if (!user) return;

    // Broadcast to user's other devices
    socket.to(`user:${user.userId}`).emit(event, payload);

    // Broadcast to family room
    if (user.familyId) {
      socket.to(`family:${user.familyId}`).emit(event, payload);
    }
  }

  /**
   * Broadcast to family room only
   */
  private broadcastToFamilyRoom(socket: Socket, event: RealtimeEvent, payload: unknown): void {
    const user = this.connectedUsers.get(socket.id);
    if (user?.familyId) {
      socket.to(`family:${user.familyId}`).emit(event, payload);
    }
  }

  // =========================================
  // Public API for emitting events from API routes
  // =========================================

  /**
   * Emit event to a specific user (all their connected devices)
   */
  emitToUser(userId: string, event: RealtimeEvent, payload: unknown): void {
    this.io?.to(`user:${userId}`).emit(event, payload);
  }

  /**
   * Emit event to a family/household
   */
  emitToFamily(familyId: string, event: RealtimeEvent, payload: unknown): void {
    this.io?.to(`family:${familyId}`).emit(event, payload);
  }

  /**
   * Emit inventory update notification
   */
  notifyInventoryUpdate(userId: string, payload: InventoryPayload, familyId?: string): void {
    this.emitToUser(userId, RealtimeEvent.INVENTORY_UPDATE, payload);
    if (familyId) {
      this.emitToFamily(familyId, RealtimeEvent.INVENTORY_UPDATE, payload);
    }
  }

  /**
   * Emit shopping list update notification
   */
  notifyShoppingUpdate(userId: string, payload: ShoppingPayload, familyId?: string): void {
    this.emitToUser(userId, RealtimeEvent.SHOPPING_UPDATE, payload);
    if (familyId) {
      this.emitToFamily(familyId, RealtimeEvent.SHOPPING_UPDATE, payload);
    }
  }

  /**
   * Send a push notification to user
   */
  pushNotification(userId: string, notification: NotificationPayload): void {
    this.emitToUser(userId, RealtimeEvent.NOTIFICATION_PUSH, notification);
  }

  /**
   * Send expiration alert
   */
  alertExpiration(userId: string, itemName: string, daysUntilExpiry: number): void {
    const notification: NotificationPayload = {
      id: `exp-${Date.now()}`,
      type: 'expiration',
      title: 'Alerte expiration',
      message: `${itemName} expire dans ${daysUntilExpiry} jours`,
      data: { itemName, daysUntilExpiry },
      timestamp: new Date().toISOString()
    };
    this.emitToUser(userId, RealtimeEvent.NOTIFICATION_EXPIRATION, notification);
  }

  /**
   * Send low stock alert
   */
  alertLowStock(userId: string, itemName: string, currentQuantity: number): void {
    const notification: NotificationPayload = {
      id: `low-${Date.now()}`,
      type: 'low_stock',
      title: 'Stock bas',
      message: `${itemName} est presque épuisé (${currentQuantity} restant)`,
      data: { itemName, currentQuantity },
      timestamp: new Date().toISOString()
    };
    this.emitToUser(userId, RealtimeEvent.NOTIFICATION_LOW_STOCK, notification);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get online family members
   */
  getOnlineFamilyMembers(familyId: string): ConnectedUser[] {
    const members: ConnectedUser[] = [];
    this.connectedUsers.forEach(user => {
      if (user.familyId === familyId) {
        members.push(user);
      }
    });
    return members;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

// Export singleton
export const realtimeService = new RealtimeService();
