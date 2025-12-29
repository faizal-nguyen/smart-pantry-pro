# PRP-100 : Plan de Transformation Révolutionnaire - 4 Phases

> **Version** : 1.0.0
> **Date** : 2025-12-28
> **Statut** : Approuvé
> **Généré par** : Armée d'Agents IA (CTO Audit, CPO Market, Voice AI Futurist, Strategic Architect)

---

## Table des Matières

1. [Vision & Positionnement](#1-vision--positionnement)
2. [Phase 1 : Immédiat (30 jours)](#2-phase-1--immédiat-30-jours)
3. [Phase 2 : Court Terme (1-3 mois)](#3-phase-2--court-terme-1-3-mois)
4. [Phase 3 : Moyen Terme (3-6 mois)](#4-phase-3--moyen-terme-3-6-mois)
5. [Phase 4 : Long Terme (6-12 mois)](#5-phase-4--long-terme-6-12-mois)
6. [Architecture Technique Cible](#6-architecture-technique-cible)
7. [Métriques & KPIs](#7-métriques--kpis)

---

## 1. Vision & Positionnement

### 1.1 Mission Statement

**"Smart Pantry Pro : Le premier Kitchen Operating System propulsé par IA qui anticipe, planifie et exécute la gestion alimentaire de votre foyer - transformant votre cuisine en partenaire intelligent pour la nutrition et la durabilité."**

### 1.2 Positionnement Marché

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART PANTRY PRO                             │
│                                                                 │
│     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│     │  INVENTAIRE │───▶│   RECETTES  │───▶│   COURSES   │      │
│     │   TEMPS     │    │     IA      │    │   PRÉDIC-   │      │
│     │    RÉEL     │    │  SUGGESTION │    │    TIVES    │      │
│     └─────────────┘    └─────────────┘    └─────────────┘      │
│            │                  │                  │              │
│            └──────────────────┼──────────────────┘              │
│                               ▼                                 │
│                    ┌─────────────────┐                         │
│                    │   ZÉRO DÉCHET   │                         │
│                    │   NUTRITION     │                         │
│                    │   DURABILITÉ    │                         │
│                    └─────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Blue Ocean Identifié

| Opportunité | Statut Marché Actuel | Notre Avantage |
|-------------|---------------------|----------------|
| Écosystème Pantry-to-Plate | Fragmenté (5+ apps nécessaires) | Solution unifiée |
| Gestion vocale garde-manger | Inexistant | Voice-first natif |
| Scan caméra automatique | 2 apps tentent, mal | IA Vision avancée |
| Smart Home cuisine unifié | Aucun leader software | Hub universel |
| Coordination familiale | Single-user focus | Multi-user avec votes |
| Réapprovisionnement prédictif | Aucune solution | ML prédictif |

### 1.4 Personas Cibles

#### Persona 1 : "Family Food Manager"
```yaml
Profil:
  Age: 25-45 ans
  Situation: Parent gérant un foyer de 3-5 personnes
  Revenus: 40K-80K€/an

Frustrations:
  - Temps perdu sur les décisions alimentaires (45 min/jour)
  - Gaspillage alimentaire (30% du budget)
  - Coordination familiale difficile
  - Oublis constants au supermarché

Objectifs:
  - 30% moins de temps sur décisions food
  - 50% moins de gaspillage
  - Famille impliquée dans les choix

Comportement:
  - Smartphone toujours en main
  - Utilise assistants vocaux (Alexa/Google)
  - Achète en ligne + drive
```

#### Persona 2 : "Health-Optimized Professional"
```yaml
Profil:
  Age: 28-40 ans
  Situation: Célibataire ou couple sans enfants
  Revenus: 50K-100K€/an

Frustrations:
  - Tracking nutritionnel fastidieux
  - Meal prep time-consuming
  - Difficile de maintenir un régime

Objectifs:
  - Nutrition personnalisée sans effort
  - Macros automatiquement calculées
  - Repas adaptés au workout

Comportement:
  - Apps fitness (MyFitnessPal, Strava)
  - Quantified self
  - Premium-ready
```

#### Persona 3 : "Smart Home Enthusiast"
```yaml
Profil:
  Age: 30-55 ans
  Situation: Tech-forward, équipement smart home
  Revenus: 60K-120K€/an

Frustrations:
  - Appareils cuisine non connectés entre eux
  - Pas de hub unifié pour la cuisine
  - Voice assistants généralistes

Objectifs:
  - Contrôle vocal de toute la cuisine
  - Intégration seamless IoT
  - Automation intelligente

Comportement:
  - Early adopter
  - Samsung/LG smart appliances
  - HomeKit/Google Home user
```

---

## 2. Phase 1 : Immédiat (30 jours)

### 2.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                      PHASE 1 - IMMÉDIAT                         │
│                         (30 JOURS)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  SEMAINE 1-2          SEMAINE 2-3          SEMAINE 3-4         │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐          │
│  │  VOICE   │        │ WEBSOCKET│        │  QUICK   │          │
│  │   TTS    │        │ REALTIME │        │   WINS   │          │
│  │          │        │          │        │          │          │
│  │ 3 jours  │        │ 7 jours  │        │ 8 jours  │          │
│  └──────────┘        └──────────┘        └──────────┘          │
│                                                                 │
│  IMPACT:                                                        │
│  - Voice output fonctionnel                                     │
│  - Sync temps réel famille                                      │
│  - UX immédiatement améliorée                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Module 1.1 : Voice Output (TTS)

#### 2.2.1 Objectif
Transformer Smart Pantry en application **voice-first** avec feedback audio sur toutes les actions.

#### 2.2.2 Spécifications Techniques

```typescript
// ============================================================
// FICHIER: src/services/voice/voiceOutputService.ts
// ============================================================

/**
 * VoiceOutputService - Text-to-Speech Service
 * Utilise Web Speech API avec fallback ElevenLabs pour voix naturelles
 */

interface VoiceOutputConfig {
  language: 'fr-FR' | 'en-US' | 'es-ES';
  voice?: string;           // Nom de la voix spécifique
  rate: number;             // 0.1 - 10 (défaut: 1)
  pitch: number;            // 0 - 2 (défaut: 1)
  volume: number;           // 0 - 1 (défaut: 1)
  usePremiumVoice: boolean; // ElevenLabs pour premium
}

interface SpeechQueueItem {
  id: string;
  text: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  interruptible: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

class VoiceOutputService {
  private synth: SpeechSynthesis;
  private queue: SpeechQueueItem[];
  private currentUtterance: SpeechSynthesisUtterance | null;
  private config: VoiceOutputConfig;
  private voicesLoaded: boolean;
  private availableVoices: SpeechSynthesisVoice[];

  constructor(config?: Partial<VoiceOutputConfig>) {
    this.synth = window.speechSynthesis;
    this.queue = [];
    this.currentUtterance = null;
    this.voicesLoaded = false;
    this.availableVoices = [];

    this.config = {
      language: 'fr-FR',
      rate: 1,
      pitch: 1,
      volume: 1,
      usePremiumVoice: false,
      ...config
    };

    this.loadVoices();
  }

  /**
   * Charge les voix disponibles
   */
  private async loadVoices(): Promise<void> {
    return new Promise((resolve) => {
      const loadVoicesHandler = () => {
        this.availableVoices = this.synth.getVoices();
        this.voicesLoaded = true;
        resolve();
      };

      if (this.synth.getVoices().length > 0) {
        loadVoicesHandler();
      } else {
        this.synth.onvoiceschanged = loadVoicesHandler;
      }
    });
  }

  /**
   * Sélectionne la meilleure voix française
   */
  private getBestFrenchVoice(): SpeechSynthesisVoice | null {
    const frenchVoices = this.availableVoices.filter(
      v => v.lang.startsWith('fr')
    );

    // Priorité : voix "naturelles" ou "premium"
    const preferredVoices = ['Amelie', 'Thomas', 'Audrey', 'Google français'];

    for (const preferred of preferredVoices) {
      const match = frenchVoices.find(v =>
        v.name.toLowerCase().includes(preferred.toLowerCase())
      );
      if (match) return match;
    }

    return frenchVoices[0] || null;
  }

  /**
   * Parle un texte avec gestion de la queue
   */
  async speak(text: string, options?: Partial<SpeechQueueItem>): Promise<void> {
    const item: SpeechQueueItem = {
      id: crypto.randomUUID(),
      text,
      priority: 'normal',
      interruptible: true,
      ...options
    };

    // Gestion priorité
    if (item.priority === 'critical') {
      this.interrupt();
      this.queue.unshift(item);
    } else if (item.priority === 'high') {
      const insertIndex = this.queue.findIndex(i => i.priority === 'normal' || i.priority === 'low');
      this.queue.splice(insertIndex === -1 ? 0 : insertIndex, 0, item);
    } else {
      this.queue.push(item);
    }

    if (!this.currentUtterance) {
      await this.processQueue();
    }
  }

  /**
   * Interrompt la parole en cours
   */
  interrupt(): void {
    if (this.currentUtterance) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Traite la queue de parole
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const item = this.queue.shift()!;

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(item.text);

      utterance.lang = this.config.language;
      utterance.rate = this.config.rate;
      utterance.pitch = this.config.pitch;
      utterance.volume = this.config.volume;

      const voice = this.getBestFrenchVoice();
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        this.currentUtterance = utterance;
        item.onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        item.onEnd?.();
        resolve();
        this.processQueue(); // Continue avec le prochain
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        const error = new Error(`Speech synthesis error: ${event.error}`);
        item.onError?.(error);
        reject(error);
        this.processQueue();
      };

      this.synth.speak(utterance);
    });
  }

  /**
   * Feedback vocaux prédéfinis pour actions courantes
   */
  readonly feedbacks = {
    // Inventaire
    itemAdded: (name: string, qty: number, unit: string) =>
      this.speak(`${qty} ${unit} de ${name} ajouté à l'inventaire`),

    itemRemoved: (name: string) =>
      this.speak(`${name} retiré de l'inventaire`),

    itemExpiringSoon: (name: string, days: number) =>
      this.speak(`Attention, ${name} expire dans ${days} jours`, { priority: 'high' }),

    itemExpired: (name: string) =>
      this.speak(`${name} a expiré`, { priority: 'critical' }),

    // Shopping
    addedToList: (name: string) =>
      this.speak(`${name} ajouté à la liste de courses`),

    listCompleted: () =>
      this.speak(`Félicitations, votre liste de courses est complète !`),

    // Recettes
    recipeFound: (count: number) =>
      this.speak(`J'ai trouvé ${count} recettes possibles avec vos ingrédients`),

    recipeSuggestion: (name: string, time: number) =>
      this.speak(`Je vous suggère ${name}, prêt en ${time} minutes`),

    // Général
    welcome: (name: string) =>
      this.speak(`Bonjour ${name}, bienvenue dans votre cuisine intelligente`),

    error: (message: string) =>
      this.speak(`Désolé, une erreur s'est produite : ${message}`, { priority: 'high' }),

    confirmation: (action: string) =>
      this.speak(`${action} confirmé`),
  };
}

export const voiceOutput = new VoiceOutputService();
export default VoiceOutputService;
```

#### 2.2.3 Hook React

```typescript
// ============================================================
// FICHIER: src/hooks/useVoiceOutput.ts
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import { voiceOutput } from '@/services/voice/voiceOutputService';

interface UseVoiceOutputOptions {
  enabled?: boolean;
  language?: 'fr-FR' | 'en-US';
}

export function useVoiceOutput(options: UseVoiceOutputOptions = {}) {
  const { enabled = true, language = 'fr-FR' } = options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  const speak = useCallback(async (text: string, priority?: 'low' | 'normal' | 'high' | 'critical') => {
    if (!enabled || !isSupported) return;

    setIsSpeaking(true);
    try {
      await voiceOutput.speak(text, {
        priority,
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    } catch (error) {
      setIsSpeaking(false);
    }
  }, [enabled, isSupported]);

  const interrupt = useCallback(() => {
    voiceOutput.interrupt();
    setIsSpeaking(false);
  }, []);

  // Feedbacks prédéfinis
  const announceItemAdded = useCallback((name: string, qty: number, unit: string) => {
    if (enabled) voiceOutput.feedbacks.itemAdded(name, qty, unit);
  }, [enabled]);

  const announceExpiringSoon = useCallback((name: string, days: number) => {
    if (enabled) voiceOutput.feedbacks.itemExpiringSoon(name, days);
  }, [enabled]);

  const announceRecipeSuggestion = useCallback((name: string, time: number) => {
    if (enabled) voiceOutput.feedbacks.recipeSuggestion(name, time);
  }, [enabled]);

  return {
    speak,
    interrupt,
    isSpeaking,
    isSupported,
    announceItemAdded,
    announceExpiringSoon,
    announceRecipeSuggestion,
    feedbacks: voiceOutput.feedbacks,
  };
}
```

#### 2.2.4 Fichiers à Créer/Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/services/voice/voiceOutputService.ts` | CRÉER | Service TTS principal |
| `src/hooks/useVoiceOutput.ts` | CRÉER | Hook React pour TTS |
| `src/services/voice/enhancedVoiceService.ts` | MODIFIER | Intégrer TTS |
| `src/components/settings/VoiceSettings.tsx` | CRÉER | UI configuration voix |
| `src/stores/settingsStore.ts` | MODIFIER | Ajouter préférences voix |

#### 2.2.5 Critères d'Acceptation

- [ ] TTS fonctionne sur Chrome, Safari, Firefox, Edge
- [ ] Voix française naturelle sélectionnée automatiquement
- [ ] Système de queue avec priorités
- [ ] Interruption possible par l'utilisateur
- [ ] Feedbacks pour toutes les actions principales
- [ ] Toggle on/off dans les settings
- [ ] Latence < 200ms entre action et feedback vocal

---

### 2.3 Module 1.2 : WebSocket Real-time

#### 2.3.1 Objectif
Permettre la synchronisation temps réel entre tous les membres d'un foyer et entre tous les appareils.

#### 2.3.2 Architecture WebSocket

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE WEBSOCKET                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLIENT A              SERVER                 CLIENT B          │
│  (Mobile)              (API)                  (Tablet)          │
│  ┌───────┐            ┌───────┐              ┌───────┐         │
│  │       │───connect──▶│       │◀───connect──│       │         │
│  │       │            │       │              │       │         │
│  │       │──emit──────▶│ Room  │───broadcast─▶│       │         │
│  │       │            │Manager│              │       │         │
│  │       │◀──broadcast─│       │◀──emit──────│       │         │
│  └───────┘            └───────┘              └───────┘         │
│                            │                                    │
│                            ▼                                    │
│                    ┌───────────────┐                           │
│                    │   SUPABASE    │                           │
│                    │   (Persist)   │                           │
│                    └───────────────┘                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.3.3 Spécifications Backend

```typescript
// ============================================================
// FICHIER: apps/api/src/services/websocket/realtimeService.ts
// ============================================================

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyJWT } from '../middleware/auth';
import { logger } from '../utils/logger';

// Types d'événements
interface RealtimeEvents {
  // Connexion
  'user:connected': { userId: string; familyId: string; deviceType: string };
  'user:disconnected': { userId: string };

  // Présence
  'presence:update': { userId: string; status: 'online' | 'away' | 'offline'; lastSeen: Date };
  'presence:typing': { userId: string; context: 'shopping' | 'inventory' | 'recipe' };

  // Inventaire
  'inventory:item:added': { item: InventoryItem; userId: string };
  'inventory:item:updated': { item: InventoryItem; userId: string };
  'inventory:item:removed': { itemId: string; userId: string };
  'inventory:bulk:update': { items: InventoryItem[]; userId: string };

  // Shopping
  'shopping:item:added': { item: ShoppingItem; userId: string };
  'shopping:item:checked': { itemId: string; checked: boolean; userId: string };
  'shopping:list:cleared': { listId: string; userId: string };

  // Meal Planning
  'meal:plan:updated': { date: string; meals: MealPlanEntry[]; userId: string };
  'meal:vote:cast': { mealId: string; vote: 'up' | 'down'; userId: string };

  // Notifications
  'notification:push': { type: string; message: string; data?: any };
  'notification:expiry:alert': { items: ExpiringItem[] };
}

interface ConnectedUser {
  socketId: string;
  userId: string;
  familyId: string;
  deviceType: string;
  connectedAt: Date;
  lastActivity: Date;
}

class RealtimeService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private familyRooms: Map<string, Set<string>> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('RealtimeService initialized');
  }

  /**
   * Middleware d'authentification
   */
  private setupMiddleware(): void {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = await verifyJWT(token);
        socket.data.userId = decoded.sub;
        socket.data.familyId = decoded.familyId;

        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  /**
   * Configuration des event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);

      // Presence
      socket.on('presence:update', (data) => this.handlePresenceUpdate(socket, data));
      socket.on('presence:typing', (data) => this.handleTyping(socket, data));

      // Inventory
      socket.on('inventory:item:added', (data) => this.broadcastToFamily(socket, 'inventory:item:added', data));
      socket.on('inventory:item:updated', (data) => this.broadcastToFamily(socket, 'inventory:item:updated', data));
      socket.on('inventory:item:removed', (data) => this.broadcastToFamily(socket, 'inventory:item:removed', data));

      // Shopping
      socket.on('shopping:item:added', (data) => this.broadcastToFamily(socket, 'shopping:item:added', data));
      socket.on('shopping:item:checked', (data) => this.broadcastToFamily(socket, 'shopping:item:checked', data));
      socket.on('shopping:list:cleared', (data) => this.broadcastToFamily(socket, 'shopping:list:cleared', data));

      // Meal Planning
      socket.on('meal:plan:updated', (data) => this.broadcastToFamily(socket, 'meal:plan:updated', data));
      socket.on('meal:vote:cast', (data) => this.broadcastToFamily(socket, 'meal:vote:cast', data));

      // Déconnexion
      socket.on('disconnect', () => this.handleDisconnection(socket));
    });
  }

  /**
   * Gestion de la connexion
   */
  private handleConnection(socket: Socket): void {
    const { userId, familyId } = socket.data;
    const deviceType = socket.handshake.query.deviceType as string || 'unknown';

    // Enregistrer l'utilisateur
    const user: ConnectedUser = {
      socketId: socket.id,
      userId,
      familyId,
      deviceType,
      connectedAt: new Date(),
      lastActivity: new Date(),
    };

    this.connectedUsers.set(socket.id, user);

    // Rejoindre la room famille
    socket.join(`family:${familyId}`);

    // Tracker la room
    if (!this.familyRooms.has(familyId)) {
      this.familyRooms.set(familyId, new Set());
    }
    this.familyRooms.get(familyId)!.add(socket.id);

    // Notifier la famille
    this.broadcastToFamily(socket, 'user:connected', {
      userId,
      familyId,
      deviceType
    });

    // Envoyer la liste des utilisateurs connectés
    socket.emit('presence:list', this.getFamilyPresence(familyId));

    logger.info(`User ${userId} connected to family ${familyId}`);
  }

  /**
   * Gestion de la déconnexion
   */
  private handleDisconnection(socket: Socket): void {
    const user = this.connectedUsers.get(socket.id);

    if (user) {
      // Retirer de la room famille
      const familyRoom = this.familyRooms.get(user.familyId);
      if (familyRoom) {
        familyRoom.delete(socket.id);
        if (familyRoom.size === 0) {
          this.familyRooms.delete(user.familyId);
        }
      }

      // Notifier la famille
      socket.to(`family:${user.familyId}`).emit('user:disconnected', {
        userId: user.userId
      });

      this.connectedUsers.delete(socket.id);

      logger.info(`User ${user.userId} disconnected`);
    }
  }

  /**
   * Broadcast à tous les membres de la famille (sauf l'émetteur)
   */
  private broadcastToFamily(socket: Socket, event: string, data: any): void {
    const { familyId, userId } = socket.data;

    socket.to(`family:${familyId}`).emit(event, {
      ...data,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Obtenir la présence de tous les membres de la famille
   */
  private getFamilyPresence(familyId: string): ConnectedUser[] {
    const familySockets = this.familyRooms.get(familyId);
    if (!familySockets) return [];

    return Array.from(familySockets)
      .map(socketId => this.connectedUsers.get(socketId))
      .filter((user): user is ConnectedUser => user !== undefined);
  }

  /**
   * Mise à jour de présence
   */
  private handlePresenceUpdate(socket: Socket, data: { status: string }): void {
    const user = this.connectedUsers.get(socket.id);
    if (user) {
      user.lastActivity = new Date();
      this.broadcastToFamily(socket, 'presence:update', {
        userId: user.userId,
        status: data.status,
        lastSeen: user.lastActivity
      });
    }
  }

  /**
   * Indicateur de saisie
   */
  private handleTyping(socket: Socket, data: { context: string }): void {
    this.broadcastToFamily(socket, 'presence:typing', {
      context: data.context
    });
  }

  /**
   * Envoyer une notification à toute une famille
   */
  public notifyFamily(familyId: string, notification: { type: string; message: string; data?: any }): void {
    this.io.to(`family:${familyId}`).emit('notification:push', notification);
  }

  /**
   * Envoyer une alerte d'expiration
   */
  public sendExpiryAlert(familyId: string, items: any[]): void {
    this.io.to(`family:${familyId}`).emit('notification:expiry:alert', { items });
  }
}

export default RealtimeService;
```

#### 2.3.4 Intégration Express

```typescript
// ============================================================
// FICHIER: apps/api/src/index.ts (MODIFICATIONS)
// ============================================================

import express from 'express';
import { createServer } from 'http';
import RealtimeService from './services/websocket/realtimeService';

const app = express();
const httpServer = createServer(app);

// Initialiser le service WebSocket
const realtimeService = new RealtimeService(httpServer);

// Exposer pour utilisation dans les routes
app.set('realtimeService', realtimeService);

// ... reste du code existant ...

// IMPORTANT: Utiliser httpServer.listen au lieu de app.listen
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket ready`);
});
```

#### 2.3.5 Hook Client

```typescript
// ============================================================
// FICHIER: src/hooks/useRealtime.ts
// ============================================================

import { useEffect, useCallback, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface RealtimeOptions {
  autoConnect?: boolean;
  reconnectionAttempts?: number;
}

interface FamilyMember {
  userId: string;
  deviceType: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
}

export function useRealtime(options: RealtimeOptions = {}) {
  const { autoConnect = true, reconnectionAttempts = 5 } = options;
  const { user, token } = useAuth();
  const queryClient = useQueryClient();

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());

  // Connexion au serveur
  useEffect(() => {
    if (!autoConnect || !token || !user) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: { token },
      query: { deviceType: getDeviceType() },
      reconnectionAttempts,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Event handlers
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Realtime connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Realtime disconnected');
    });

    socket.on('presence:list', (members: FamilyMember[]) => {
      setFamilyMembers(members);
    });

    socket.on('user:connected', (data) => {
      setFamilyMembers(prev => [...prev, data]);
    });

    socket.on('user:disconnected', (data) => {
      setFamilyMembers(prev => prev.filter(m => m.userId !== data.userId));
    });

    socket.on('presence:typing', (data) => {
      setTypingUsers(prev => new Map(prev).set(data.userId, data.context));
      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }, 3000);
    });

    // Inventory updates
    socket.on('inventory:item:added', (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    });

    socket.on('inventory:item:updated', (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    });

    socket.on('inventory:item:removed', (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    });

    // Shopping updates
    socket.on('shopping:item:added', (data) => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    });

    socket.on('shopping:item:checked', (data) => {
      queryClient.invalidateQueries({ queryKey: ['shopping'] });
    });

    // Notifications
    socket.on('notification:push', (data) => {
      // Trigger notification UI
      window.dispatchEvent(new CustomEvent('pantry:notification', { detail: data }));
    });

    socket.on('notification:expiry:alert', (data) => {
      window.dispatchEvent(new CustomEvent('pantry:expiry-alert', { detail: data }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect, token, user, reconnectionAttempts, queryClient]);

  // Émettre un événement
  const emit = useCallback(<T>(event: string, data: T) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Helpers spécifiques
  const emitInventoryAdded = useCallback((item: any) => {
    emit('inventory:item:added', { item });
  }, [emit]);

  const emitInventoryUpdated = useCallback((item: any) => {
    emit('inventory:item:updated', { item });
  }, [emit]);

  const emitInventoryRemoved = useCallback((itemId: string) => {
    emit('inventory:item:removed', { itemId });
  }, [emit]);

  const emitShoppingAdded = useCallback((item: any) => {
    emit('shopping:item:added', { item });
  }, [emit]);

  const emitShoppingChecked = useCallback((itemId: string, checked: boolean) => {
    emit('shopping:item:checked', { itemId, checked });
  }, [emit]);

  const emitTyping = useCallback((context: 'shopping' | 'inventory' | 'recipe') => {
    emit('presence:typing', { context });
  }, [emit]);

  return {
    isConnected,
    familyMembers,
    typingUsers,
    emit,
    emitInventoryAdded,
    emitInventoryUpdated,
    emitInventoryRemoved,
    emitShoppingAdded,
    emitShoppingChecked,
    emitTyping,
  };
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}
```

#### 2.3.6 Fichiers à Créer/Modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `apps/api/src/services/websocket/realtimeService.ts` | CRÉER | Service WebSocket principal |
| `apps/api/src/services/websocket/presenceService.ts` | CRÉER | Gestion présence utilisateurs |
| `apps/api/src/index.ts` | MODIFIER | Intégrer Socket.io |
| `apps/api/package.json` | MODIFIER | Ajouter socket.io |
| `src/hooks/useRealtime.ts` | CRÉER | Hook client WebSocket |
| `src/components/collaboration/PresenceIndicator.tsx` | CRÉER | UI présence |
| `package.json` | MODIFIER | Ajouter socket.io-client |

#### 2.3.7 Critères d'Acceptation

- [ ] Connexion WebSocket stable avec reconnexion automatique
- [ ] Authentification JWT sur la connexion
- [ ] Rooms par famille pour isolation des données
- [ ] Indicateurs de présence temps réel
- [ ] Sync inventaire instantané entre appareils
- [ ] Sync liste de courses instantané
- [ ] Indicateur "X est en train d'écrire..."
- [ ] Notifications push via WebSocket
- [ ] Latence < 100ms pour les updates

---

### 2.4 Module 1.3 : Quick Wins

#### 2.4.1 Badge Expiration Countdown

```typescript
// ============================================================
// FICHIER: src/components/inventory/ExpirationBadge.tsx
// ============================================================

import { cn } from '@/lib/utils';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface ExpirationBadgeProps {
  expirationDate: string | Date;
  showDays?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

type ExpirationStatus = 'fresh' | 'good' | 'warning' | 'critical' | 'expired';

export function ExpirationBadge({
  expirationDate,
  showDays = true,
  size = 'md'
}: ExpirationBadgeProps) {
  const expDate = new Date(expirationDate);
  const today = new Date();
  const daysUntilExpiry = differenceInDays(expDate, today);

  const getStatus = (): ExpirationStatus => {
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 2) return 'critical';
    if (daysUntilExpiry <= 5) return 'warning';
    if (daysUntilExpiry <= 14) return 'good';
    return 'fresh';
  };

  const status = getStatus();

  const config = {
    expired: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      icon: XCircle,
      label: 'Expiré',
    },
    critical: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
      icon: AlertTriangle,
      label: `${daysUntilExpiry}j`,
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: Clock,
      label: `${daysUntilExpiry}j`,
    },
    good: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
      icon: Clock,
      label: `${daysUntilExpiry}j`,
    },
    fresh: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      icon: CheckCircle,
      label: `${daysUntilExpiry}j`,
    },
  };

  const { bg, text, border, icon: Icon, label } = config[status];

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        bg, text, border,
        sizeClasses[size]
      )}
      title={`Expire le ${format(expDate, 'dd MMMM yyyy', { locale: fr })}`}
    >
      <Icon className={cn(
        size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'
      )} />
      {showDays && <span>{label}</span>}
    </div>
  );
}
```

#### 2.4.2 Optimistic UI Updates

```typescript
// ============================================================
// FICHIER: src/hooks/useOptimisticInventory.ts
// ============================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtime } from './useRealtime';
import { useVoiceOutput } from './useVoiceOutput';
import { inventoryApi } from '@/services/api/inventory';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  expiration_date: string;
  // ... autres champs
}

export function useOptimisticInventory() {
  const queryClient = useQueryClient();
  const { emitInventoryAdded, emitInventoryUpdated, emitInventoryRemoved } = useRealtime();
  const { announceItemAdded, feedbacks } = useVoiceOutput();

  // Ajout optimiste
  const addItem = useMutation({
    mutationFn: inventoryApi.addItem,

    // Optimistic update AVANT l'appel API
    onMutate: async (newItem: Partial<InventoryItem>) => {
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey: ['inventory'] });

      // Snapshot de l'état précédent
      const previousItems = queryClient.getQueryData<InventoryItem[]>(['inventory']);

      // Créer un item temporaire avec ID provisoire
      const optimisticItem: InventoryItem = {
        id: `temp-${Date.now()}`,
        ...newItem,
        created_at: new Date().toISOString(),
      } as InventoryItem;

      // Mettre à jour le cache optimistiquement
      queryClient.setQueryData<InventoryItem[]>(['inventory'], (old) => {
        return [...(old || []), optimisticItem];
      });

      // Feedback vocal immédiat
      announceItemAdded(newItem.name!, newItem.quantity!, newItem.unit!);

      return { previousItems, optimisticItem };
    },

    // Si succès, remplacer l'item temporaire par le vrai
    onSuccess: (realItem, _, context) => {
      queryClient.setQueryData<InventoryItem[]>(['inventory'], (old) => {
        return (old || []).map(item =>
          item.id === context?.optimisticItem.id ? realItem : item
        );
      });

      // Notifier les autres membres de la famille
      emitInventoryAdded(realItem);
    },

    // Si erreur, rollback
    onError: (error, _, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['inventory'], context.previousItems);
      }

      feedbacks.error('Impossible d\'ajouter l\'item');
    },
  });

  // Mise à jour optimiste
  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InventoryItem> }) =>
      inventoryApi.updateItem(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] });

      const previousItems = queryClient.getQueryData<InventoryItem[]>(['inventory']);

      queryClient.setQueryData<InventoryItem[]>(['inventory'], (old) => {
        return (old || []).map(item =>
          item.id === id ? { ...item, ...data, updated_at: new Date().toISOString() } : item
        );
      });

      return { previousItems };
    },

    onSuccess: (updatedItem) => {
      emitInventoryUpdated(updatedItem);
    },

    onError: (_, __, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['inventory'], context.previousItems);
      }
    },
  });

  // Suppression optimiste
  const removeItem = useMutation({
    mutationFn: inventoryApi.deleteItem,

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] });

      const previousItems = queryClient.getQueryData<InventoryItem[]>(['inventory']);

      queryClient.setQueryData<InventoryItem[]>(['inventory'], (old) => {
        return (old || []).filter(item => item.id !== id);
      });

      return { previousItems };
    },

    onSuccess: (_, id) => {
      emitInventoryRemoved(id);
    },

    onError: (_, __, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['inventory'], context.previousItems);
      }
    },
  });

  return {
    addItem,
    updateItem,
    removeItem,
  };
}
```

#### 2.4.3 Push Notifications

```typescript
// ============================================================
// FICHIER: src/services/notifications/pushNotificationService.ts
// ============================================================

class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private permission: NotificationPermission = 'default';

  /**
   * Initialiser le service
   */
  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Enregistrer le service worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');

      // Vérifier la permission
      this.permission = Notification.permission;

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Demander la permission
   */
  async requestPermission(): Promise<boolean> {
    if (this.permission === 'granted') return true;
    if (this.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    this.permission = result;

    return result === 'granted';
  }

  /**
   * Afficher une notification
   */
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      ...options,
    };

    if (this.swRegistration) {
      await this.swRegistration.showNotification(title, defaultOptions);
    } else {
      new Notification(title, defaultOptions);
    }
  }

  /**
   * Notifications prédéfinies
   */
  readonly notifications = {
    expiryWarning: (itemName: string, daysLeft: number) =>
      this.showNotification('Produit bientôt périmé', {
        body: `${itemName} expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
        tag: 'expiry-warning',
        data: { type: 'expiry', itemName },
      }),

    expiryAlert: (items: string[]) =>
      this.showNotification('Alerte expiration', {
        body: `${items.length} produit${items.length > 1 ? 's' : ''} expire${items.length > 1 ? 'nt' : ''} bientôt`,
        tag: 'expiry-alert',
        requireInteraction: true,
      }),

    shoppingListShared: (memberName: string) =>
      this.showNotification('Liste de courses', {
        body: `${memberName} a modifié la liste de courses`,
        tag: 'shopping-update',
      }),

    mealPlanReady: () =>
      this.showNotification('Menu de la semaine', {
        body: 'Votre menu hebdomadaire est prêt !',
        tag: 'meal-plan',
      }),

    recipeSuggestion: (recipeName: string) =>
      this.showNotification('Suggestion de recette', {
        body: `Et si vous prépariez ${recipeName} ce soir ?`,
        tag: 'recipe-suggestion',
      }),
  };
}

export const pushNotifications = new PushNotificationService();
export default PushNotificationService;
```

---

## 3. Phase 2 : Court Terme (1-3 mois)

### 3.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 2 - COURT TERME                        │
│                        (1-3 MOIS)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MOIS 1               MOIS 2               MOIS 3              │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐          │
│  │  VOICE   │        │ REALTIME │        │  SMART   │          │
│  │  FIRST   │        │  COLLAB  │        │  CAMERA  │          │
│  │          │        │          │        │          │          │
│  │ 15 jours │        │ 12 jours │        │ 18 jours │          │
│  └──────────┘        └──────────┘        └──────────┘          │
│                                                                 │
│  LIVRABLES:                                                     │
│  - Wake word "Hey Pantry"                                       │
│  - Commandes vocales naturelles                                 │
│  - Live cursors shopping list                                   │
│  - Voting meal planning                                         │
│  - Scan produits caméra                                         │
│  - OCR tickets de caisse                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Module 2.1 : Voice-First Architecture

#### 3.2.1 Wake Word Detection

```typescript
// ============================================================
// FICHIER: src/services/voice/wakeWordService.ts
// ============================================================

/**
 * WakeWordService - Détection du mot d'activation "Hey Pantry"
 * Utilise Porcupine (Picovoice) pour la détection locale
 */

import { Porcupine, PorcupineKeyword } from '@picovoice/porcupine-web';

interface WakeWordConfig {
  accessKey: string;            // Clé API Picovoice
  keyword: 'hey_pantry' | 'ok_kitchen' | 'custom';
  sensitivity: number;          // 0.0 - 1.0 (défaut: 0.5)
  customKeywordPath?: string;   // Pour keyword custom
}

interface WakeWordCallbacks {
  onWakeWordDetected: () => void;
  onListeningStart?: () => void;
  onListeningStop?: () => void;
  onError?: (error: Error) => void;
}

class WakeWordService {
  private porcupine: Porcupine | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private isListening: boolean = false;
  private callbacks: WakeWordCallbacks | null = null;

  private readonly SAMPLE_RATE = 16000;
  private readonly FRAME_LENGTH = 512;

  /**
   * Initialiser le service
   */
  async initialize(config: WakeWordConfig, callbacks: WakeWordCallbacks): Promise<void> {
    this.callbacks = callbacks;

    try {
      // Charger Porcupine
      this.porcupine = await Porcupine.create(
        config.accessKey,
        [this.getKeyword(config.keyword, config.customKeywordPath)],
        [config.sensitivity]
      );

      console.log('WakeWordService initialized');
    } catch (error) {
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Obtenir la configuration du keyword
   */
  private getKeyword(keyword: string, customPath?: string): PorcupineKeyword {
    // Keywords pré-entraînés ou custom
    const builtInKeywords: Record<string, PorcupineKeyword> = {
      'hey_pantry': {
        label: 'Hey Pantry',
        publicPath: '/models/porcupine/hey_pantry.ppn',
      },
      'ok_kitchen': {
        label: 'OK Kitchen',
        publicPath: '/models/porcupine/ok_kitchen.ppn',
      },
    };

    if (keyword === 'custom' && customPath) {
      return {
        label: 'Custom',
        publicPath: customPath,
      };
    }

    return builtInKeywords[keyword] || builtInKeywords['hey_pantry'];
  }

  /**
   * Démarrer l'écoute passive
   */
  async startListening(): Promise<void> {
    if (this.isListening || !this.porcupine) return;

    try {
      // Demander l'accès au microphone
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: this.SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Créer le contexte audio
      this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Créer le processeur audio
      await this.audioContext.audioWorklet.addModule('/workers/audio-processor.js');
      const processor = new AudioWorkletNode(this.audioContext, 'audio-processor', {
        processorOptions: {
          frameLength: this.FRAME_LENGTH,
        },
      });

      // Traiter les frames audio
      processor.port.onmessage = (event) => {
        if (event.data.type === 'audio-frame') {
          this.processAudioFrame(event.data.frame);
        }
      };

      source.connect(processor);

      this.isListening = true;
      this.callbacks?.onListeningStart?.();

      console.log('Wake word listening started');
    } catch (error) {
      this.callbacks?.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Traiter une frame audio
   */
  private processAudioFrame(frame: Int16Array): void {
    if (!this.porcupine || !this.isListening) return;

    const keywordIndex = this.porcupine.process(frame);

    if (keywordIndex >= 0) {
      console.log('Wake word detected!');
      this.callbacks?.onWakeWordDetected();
    }
  }

  /**
   * Arrêter l'écoute
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    // Arrêter le stream
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Fermer le contexte audio
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isListening = false;
    this.callbacks?.onListeningStop?.();
  }

  /**
   * Nettoyer les ressources
   */
  async destroy(): Promise<void> {
    await this.stopListening();

    if (this.porcupine) {
      this.porcupine.release();
      this.porcupine = null;
    }
  }

  /**
   * État du service
   */
  get listening(): boolean {
    return this.isListening;
  }
}

export const wakeWord = new WakeWordService();
export default WakeWordService;
```

#### 3.2.2 Voice Command Router

```typescript
// ============================================================
// FICHIER: src/services/voice/voiceCommandRouter.ts
// ============================================================

import { streamingAI } from '@/services/ai/streamingAIService';

interface VoiceCommand {
  intent: VoiceIntent;
  entities: Record<string, string | number>;
  confidence: number;
  rawText: string;
}

type VoiceIntent =
  // Inventaire
  | 'inventory.add'
  | 'inventory.remove'
  | 'inventory.query'
  | 'inventory.expiring'
  // Shopping
  | 'shopping.add'
  | 'shopping.remove'
  | 'shopping.list'
  | 'shopping.clear'
  // Recettes
  | 'recipe.search'
  | 'recipe.suggest'
  | 'recipe.start'
  | 'recipe.next_step'
  // Meal planning
  | 'meal.plan'
  | 'meal.suggest_dinner'
  | 'meal.what_to_cook'
  // Smart Home
  | 'device.oven.preheat'
  | 'device.fridge.check'
  // Général
  | 'help'
  | 'cancel'
  | 'unknown';

interface CommandHandler {
  intent: VoiceIntent;
  patterns: RegExp[];
  entityExtractors?: Record<string, (text: string) => string | number | null>;
  execute: (entities: Record<string, any>, context: CommandContext) => Promise<CommandResult>;
}

interface CommandContext {
  userId: string;
  familyId: string;
  currentScreen?: string;
  conversationHistory?: string[];
}

interface CommandResult {
  success: boolean;
  response: string;       // Texte à prononcer
  data?: any;             // Données pour l'UI
  followUp?: string;      // Question de suivi
  action?: {              // Action UI à déclencher
    type: string;
    payload: any;
  };
}

class VoiceCommandRouter {
  private handlers: CommandHandler[] = [];
  private context: CommandContext | null = null;

  constructor() {
    this.registerDefaultHandlers();
  }

  /**
   * Enregistrer les handlers par défaut
   */
  private registerDefaultHandlers(): void {
    // ===== INVENTAIRE =====
    this.register({
      intent: 'inventory.add',
      patterns: [
        /ajoute?r?\s+(\d+)?\s*(\w+)?\s+(?:de\s+)?(.+?)(?:\s+à l'inventaire)?$/i,
        /j'ai acheté\s+(\d+)?\s*(\w+)?\s+(?:de\s+)?(.+)$/i,
        /met(?:s|tre)?\s+(\d+)?\s*(\w+)?\s+(?:de\s+)?(.+?)(?:\s+dans (?:le\s+)?(?:frigo|garde-manger))?$/i,
      ],
      entityExtractors: {
        quantity: (text) => {
          const match = text.match(/(\d+(?:[.,]\d+)?)/);
          return match ? parseFloat(match[1].replace(',', '.')) : 1;
        },
        unit: (text) => {
          const units = ['kg', 'g', 'l', 'ml', 'pièce', 'pièces', 'unité', 'unités', 'paquet', 'paquets'];
          for (const unit of units) {
            if (text.toLowerCase().includes(unit)) return unit;
          }
          return 'unité';
        },
        name: (text) => {
          // Extraire le nom du produit
          const cleanText = text
            .replace(/ajoute?r?|j'ai acheté|met(?:s|tre)?/gi, '')
            .replace(/\d+(?:[.,]\d+)?/g, '')
            .replace(/kg|g|l|ml|pièces?|unités?|paquets?/gi, '')
            .replace(/de\s+|à l'inventaire|dans (?:le\s+)?(?:frigo|garde-manger)/gi, '')
            .trim();
          return cleanText || null;
        },
      },
      execute: async (entities, context) => {
        // Appeler l'API pour ajouter l'item
        const result = await this.executeInventoryAdd(entities);

        return {
          success: true,
          response: `J'ai ajouté ${entities.quantity} ${entities.unit} de ${entities.name} à votre inventaire.`,
          data: result,
          action: {
            type: 'INVENTORY_REFRESH',
            payload: {},
          },
        };
      },
    });

    this.register({
      intent: 'inventory.expiring',
      patterns: [
        /qu(?:'|e\s+)est-ce qui expire\s*(?:bientôt)?/i,
        /produits?\s+(?:qui\s+)?expir(?:e|ent)\s*(?:bientôt)?/i,
        /(?:qu(?:'|e\s+)est-ce qu(?:'|e\s+)il y a\s+)?(?:à|de)\s+(?:finir|utiliser)\s+(?:rapidement|bientôt|vite)/i,
      ],
      execute: async (entities, context) => {
        const expiringItems = await this.getExpiringItems(context.userId);

        if (expiringItems.length === 0) {
          return {
            success: true,
            response: 'Bonne nouvelle ! Aucun produit n\'expire bientôt.',
          };
        }

        const itemList = expiringItems.slice(0, 3).map(i => i.name).join(', ');
        return {
          success: true,
          response: `${expiringItems.length} produits expirent bientôt : ${itemList}.`,
          data: expiringItems,
          action: {
            type: 'SHOW_EXPIRING_ITEMS',
            payload: { items: expiringItems },
          },
        };
      },
    });

    // ===== SHOPPING =====
    this.register({
      intent: 'shopping.add',
      patterns: [
        /ajoute?r?\s+(.+?)\s+(?:à|sur)\s+(?:la\s+)?liste(?:\s+de\s+courses)?/i,
        /(?:il\s+)?(?:me\s+)?faut\s+(.+)/i,
        /(?:on\s+)?(?:a\s+)?besoin\s+(?:de\s+|d')(.+)/i,
        /(?:n')?oublie(?:\s+pas)?\s+(?:de\s+prendre|d'acheter)\s+(.+)/i,
      ],
      entityExtractors: {
        items: (text) => {
          // Extraire les items (peut être une liste séparée par "et" ou ",")
          const cleanText = text
            .replace(/ajoute?r?|à|sur|la|liste|de|courses|il|me|faut|on|a|besoin|n'?oublie|pas|prendre|acheter/gi, '')
            .trim();

          return cleanText.split(/\s*(?:,|et)\s*/).filter(Boolean);
        },
      },
      execute: async (entities, context) => {
        const items = entities.items as string[];
        await this.addToShoppingList(items, context.userId);

        const itemText = items.length === 1
          ? items[0]
          : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;

        return {
          success: true,
          response: `J'ai ajouté ${itemText} à votre liste de courses.`,
          action: {
            type: 'SHOPPING_LIST_REFRESH',
            payload: {},
          },
        };
      },
    });

    // ===== RECETTES =====
    this.register({
      intent: 'recipe.suggest',
      patterns: [
        /qu(?:'|e\s+)est-ce qu(?:'|e\s+)(?:je|on)\s+(?:peut|pourrait)\s+(?:cuisiner|préparer|faire)/i,
        /(?:suggère|propose)(?:-moi)?\s+(?:une\s+)?recette/i,
        /(?:qu(?:'|e\s+)est-ce qu(?:'|e\s+))?on\s+mange\s+(?:ce\s+soir|aujourd'hui)/i,
        /(?:j'ai\s+)?(?:envie|faim)\s+(?:de\s+)?(?:quelque\s+chose)/i,
        /donne(?:-moi)?\s+(?:une\s+)?idée\s+(?:de\s+)?(?:repas|plat|recette)/i,
      ],
      execute: async (entities, context) => {
        const suggestion = await this.getRecipeSuggestion(context.userId);

        return {
          success: true,
          response: `Avec ce que vous avez, je vous suggère ${suggestion.name}. C'est prêt en ${suggestion.prepTime} minutes. Voulez-vous la recette détaillée ?`,
          data: suggestion,
          followUp: 'voulez_recette_detail',
          action: {
            type: 'SHOW_RECIPE_SUGGESTION',
            payload: { recipe: suggestion },
          },
        };
      },
    });

    // ===== SMART HOME =====
    this.register({
      intent: 'device.oven.preheat',
      patterns: [
        /préchauffe(?:r)?\s+(?:le\s+)?four\s+(?:à\s+)?(\d+)\s*(?:degrés|°)?/i,
        /(?:mets?|allume(?:r)?)\s+(?:le\s+)?four\s+(?:à\s+)?(\d+)\s*(?:degrés|°)?/i,
      ],
      entityExtractors: {
        temperature: (text) => {
          const match = text.match(/(\d+)\s*(?:degrés|°)?/);
          return match ? parseInt(match[1]) : 180;
        },
      },
      execute: async (entities, context) => {
        // Vérifier si un four connecté existe
        const ovenConnected = await this.checkSmartOven(context.userId);

        if (!ovenConnected) {
          return {
            success: false,
            response: `Je n'ai pas trouvé de four connecté. Voulez-vous configurer un appareil ?`,
          };
        }

        await this.preheatOven(entities.temperature as number, context.userId);

        return {
          success: true,
          response: `Le four préchauffe à ${entities.temperature} degrés. Je vous préviendrai quand il sera prêt.`,
          action: {
            type: 'OVEN_PREHEATING',
            payload: { temperature: entities.temperature },
          },
        };
      },
    });

    // ===== AIDE =====
    this.register({
      intent: 'help',
      patterns: [
        /(?:qu(?:'|e\s+)est-ce que\s+)?(?:tu\s+)?(?:peux|sais)\s+faire/i,
        /aide(?:-moi)?/i,
        /(?:quelles\s+sont\s+)?(?:tes|les)\s+commandes/i,
      ],
      execute: async () => {
        return {
          success: true,
          response: `Je peux gérer votre inventaire, suggérer des recettes, tenir votre liste de courses, et contrôler vos appareils connectés. Dites par exemple "Ajoute du lait" ou "Qu'est-ce qu'on mange ce soir ?"`,
          action: {
            type: 'SHOW_HELP',
            payload: {},
          },
        };
      },
    });
  }

  /**
   * Enregistrer un handler
   */
  register(handler: CommandHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Définir le contexte
   */
  setContext(context: CommandContext): void {
    this.context = context;
  }

  /**
   * Router une commande vocale
   */
  async route(text: string): Promise<CommandResult> {
    if (!this.context) {
      throw new Error('Context not set');
    }

    // Chercher le handler correspondant
    for (const handler of this.handlers) {
      for (const pattern of handler.patterns) {
        if (pattern.test(text)) {
          // Extraire les entités
          const entities: Record<string, any> = {};

          if (handler.entityExtractors) {
            for (const [key, extractor] of Object.entries(handler.entityExtractors)) {
              entities[key] = extractor(text);
            }
          }

          // Exécuter le handler
          try {
            return await handler.execute(entities, this.context);
          } catch (error) {
            return {
              success: false,
              response: `Désolé, je n'ai pas pu exécuter cette commande. ${(error as Error).message}`,
            };
          }
        }
      }
    }

    // Aucun handler trouvé - utiliser l'IA pour interpréter
    return this.handleWithAI(text);
  }

  /**
   * Utiliser l'IA pour les commandes non reconnues
   */
  private async handleWithAI(text: string): Promise<CommandResult> {
    try {
      const response = await streamingAI.chat([
        {
          role: 'system',
          content: `Tu es l'assistant vocal de Smart Pantry. L'utilisateur a dit : "${text}".
          Interprète sa demande et réponds de manière concise (max 2 phrases).
          Si tu ne peux pas aider, suggère des commandes alternatives.`
        }
      ]);

      return {
        success: true,
        response: response,
      };
    } catch (error) {
      return {
        success: false,
        response: `Je n'ai pas compris. Essayez "aide" pour voir ce que je peux faire.`,
      };
    }
  }

  // Méthodes helper (à implémenter avec les vrais appels API)
  private async executeInventoryAdd(entities: any): Promise<any> { /* ... */ }
  private async getExpiringItems(userId: string): Promise<any[]> { /* ... */ }
  private async addToShoppingList(items: string[], userId: string): Promise<void> { /* ... */ }
  private async getRecipeSuggestion(userId: string): Promise<any> { /* ... */ }
  private async checkSmartOven(userId: string): Promise<boolean> { /* ... */ }
  private async preheatOven(temp: number, userId: string): Promise<void> { /* ... */ }
}

export const voiceRouter = new VoiceCommandRouter();
export default VoiceCommandRouter;
```

#### 3.2.3 Hook useVoiceAgent

```typescript
// ============================================================
// FICHIER: src/hooks/useVoiceAgent.ts
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { wakeWord } from '@/services/voice/wakeWordService';
import { voiceRouter } from '@/services/voice/voiceCommandRouter';
import { voiceOutput } from '@/services/voice/voiceOutputService';
import { useAuth } from './useAuth';

type VoiceAgentState =
  | 'idle'           // En attente du wake word
  | 'listening'      // Wake word détecté, écoute active
  | 'processing'     // Traitement de la commande
  | 'speaking'       // Réponse vocale en cours
  | 'error';         // Erreur

interface UseVoiceAgentOptions {
  enabled?: boolean;
  wakeWordSensitivity?: number;
  autoRestart?: boolean;  // Redémarrer l'écoute après une commande
}

export function useVoiceAgent(options: UseVoiceAgentOptions = {}) {
  const {
    enabled = true,
    wakeWordSensitivity = 0.5,
    autoRestart = true
  } = options;

  const { user } = useAuth();
  const [state, setState] = useState<VoiceAgentState>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialiser le wake word
  useEffect(() => {
    if (!enabled || !user) return;

    const init = async () => {
      try {
        await wakeWord.initialize(
          {
            accessKey: process.env.NEXT_PUBLIC_PICOVOICE_KEY!,
            keyword: 'hey_pantry',
            sensitivity: wakeWordSensitivity,
          },
          {
            onWakeWordDetected: handleWakeWord,
            onError: (err) => {
              setError(err.message);
              setState('error');
            },
          }
        );

        // Configurer le contexte du router
        voiceRouter.setContext({
          userId: user.id,
          familyId: user.familyId || user.id,
        });

        // Démarrer l'écoute passive
        await wakeWord.startListening();
        setState('idle');

      } catch (err) {
        setError((err as Error).message);
        setState('error');
      }
    };

    init();

    return () => {
      wakeWord.destroy();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [enabled, user, wakeWordSensitivity]);

  // Handler wake word détecté
  const handleWakeWord = useCallback(async () => {
    setState('listening');
    setTranscript('');

    // Feedback audio
    await voiceOutput.speak('Oui ?', { priority: 'high' });

    // Démarrer la reconnaissance vocale
    startListening();
  }, []);

  // Démarrer la reconnaissance vocale
  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition not supported');
      setState('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;

      setTranscript(text);

      if (result.isFinal) {
        processCommand(text);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        // Pas de parole détectée, retour à idle
        setState('idle');
        if (autoRestart) {
          wakeWord.startListening();
        }
      } else {
        setError(`Recognition error: ${event.error}`);
        setState('error');
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();

    // Timeout si pas de parole
    timeoutRef.current = setTimeout(() => {
      if (state === 'listening') {
        recognition.stop();
        setState('idle');
        if (autoRestart) {
          wakeWord.startListening();
        }
      }
    }, 10000); // 10 secondes max
  }, [state, autoRestart]);

  // Traiter la commande
  const processCommand = useCallback(async (text: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState('processing');

    try {
      const result = await voiceRouter.route(text);

      setState('speaking');
      setLastResponse(result.response);

      // Réponse vocale
      await voiceOutput.speak(result.response);

      // Déclencher l'action UI si nécessaire
      if (result.action) {
        window.dispatchEvent(new CustomEvent('pantry:voice-action', {
          detail: result.action,
        }));
      }

      // Question de suivi ?
      if (result.followUp) {
        // Continuer l'écoute pour la réponse
        startListening();
      } else {
        // Retour à l'écoute passive
        setState('idle');
        if (autoRestart) {
          await wakeWord.startListening();
        }
      }

    } catch (err) {
      setError((err as Error).message);
      await voiceOutput.feedbacks.error('Une erreur est survenue');
      setState('error');
    }
  }, [autoRestart, startListening]);

  // Annuler manuellement
  const cancel = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    voiceOutput.interrupt();
    setState('idle');
    setTranscript('');
  }, []);

  // Activer manuellement (sans wake word)
  const activate = useCallback(() => {
    if (state === 'idle') {
      handleWakeWord();
    }
  }, [state, handleWakeWord]);

  return {
    state,
    transcript,
    lastResponse,
    error,
    cancel,
    activate,
    isListening: state === 'listening',
    isProcessing: state === 'processing',
    isSpeaking: state === 'speaking',
  };
}
```

### 3.3 Module 2.2 : Real-time Collaboration

*(Suite dans Phase 2 - détails sur LiveCursors, PresenceIndicator, Voting System...)*

### 3.4 Module 2.3 : Smart Camera Integration

*(Suite dans Phase 2 - détails sur TensorFlow.js, barcode scanning, OCR...)*

---

## 4. Phase 3 : Moyen Terme (3-6 mois)

### 4.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                   PHASE 3 - MOYEN TERME                         │
│                        (3-6 MOIS)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MOIS 3-4             MOIS 4-5             MOIS 5-6            │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐          │
│  │  MICRO   │        │   IoT    │        │  LOCAL   │          │
│  │  AGENTS  │        │ ECOSYS   │        │    AI    │          │
│  │          │        │          │        │          │          │
│  │ 25 jours │        │ 30 jours │        │ 35 jours │          │
│  └──────────┘        └──────────┘        └──────────┘          │
│                                                                 │
│  LIVRABLES:                                                     │
│  - Agent Orchestrator                                           │
│  - Inventory/Meal/Shopping Agents                               │
│  - Samsung SmartThings integration                              │
│  - Matter protocol support                                      │
│  - TensorFlow.js local models                                   │
│  - Ollama LLM integration                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Architecture Micro-Agents

*(Détails sur l'architecture agent, message bus, autonomy levels...)*

### 4.3 IoT Ecosystem

*(Détails sur SmartThings, Matter, device pairing...)*

### 4.4 Local AI Models

*(Détails sur TensorFlow.js, ONNX, Ollama integration...)*

---

## 5. Phase 4 : Long Terme (6-12 mois)

### 5.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                   PHASE 4 - LONG TERME                          │
│                       (6-12 MOIS)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MOIS 6-9             MOIS 8-10            MOIS 10-12          │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐          │
│  │ AMBIENT  │        │PREDICTIVE│        │COMMUNITY │          │
│  │COMPUTING │        │  INTEL   │        │MARKETPLACE│         │
│  │          │        │          │        │          │          │
│  │   TBD    │        │   TBD    │        │   TBD    │          │
│  └──────────┘        └──────────┘        └──────────┘          │
│                                                                 │
│  LIVRABLES:                                                     │
│  - Morning briefings automatiques                               │
│  - Contexte météo/calendrier/santé                              │
│  - Prédiction consommation 2 semaines                           │
│  - Auto-réapprovisionnement                                     │
│  - Community recipe sharing                                     │
│  - Marketplace integrations                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Architecture Technique Cible

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SMART PANTRY PRO - ARCHITECTURE FINALE             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                         CLIENT LAYER                               │ │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐ │ │
│  │  │   Web   │  │  iOS    │  │ Android │  │  Watch  │  │  Smart  │ │ │
│  │  │   App   │  │   App   │  │   App   │  │   App   │  │ Display │ │ │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘ │ │
│  │       └───────────┬┴──────────┬┴───────────┬┴─────────────┘      │ │
│  └───────────────────┼───────────┼────────────┼─────────────────────┘ │
│                      │           │            │                       │
│  ┌───────────────────┼───────────┼────────────┼─────────────────────┐ │
│  │                   ▼           ▼            ▼                     │ │
│  │              ┌─────────────────────────────────┐                 │ │
│  │              │        GATEWAY / API            │                 │ │
│  │              │  ┌─────────┐  ┌─────────────┐  │                 │ │
│  │              │  │   REST  │  │  WebSocket  │  │                 │ │
│  │              │  └─────────┘  └─────────────┘  │                 │ │
│  │              └───────────────┬─────────────────┘                 │ │
│  │                              │                                   │ │
│  │  ┌───────────────────────────┼───────────────────────────────┐  │ │
│  │  │                           ▼                               │  │ │
│  │  │                 AGENT ORCHESTRATOR                        │  │ │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │  │ │
│  │  │  │  Voice  │ │Inventory│ │  Meal   │ │Shopping │         │  │ │
│  │  │  │  Agent  │ │  Agent  │ │  Agent  │ │  Agent  │         │  │ │
│  │  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘         │  │ │
│  │  │       │           │           │           │               │  │ │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │  │ │
│  │  │  │ Health  │ │ Budget  │ │ Family  │ │Predictive│        │  │ │
│  │  │  │Enforcer │ │Guardian │ │  Coord  │ │  Engine │         │  │ │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │  │ │
│  │  │                    [MESSAGE BUS]                          │  │ │
│  │  └───────────────────────────────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────┐  │ │
│  │  │    AI SERVICES      │  │        IoT HUB                  │  │ │
│  │  │ ┌───────┐ ┌───────┐ │  │ ┌───────┐ ┌───────┐ ┌───────┐  │  │ │
│  │  │ │Local  │ │Cloud  │ │  │ │Smart  │ │ Smart │ │ Smart │  │  │ │
│  │  │ │  AI   │ │  AI   │ │  │ │Fridge │ │ Oven  │ │ Scale │  │  │ │
│  │  │ └───────┘ └───────┘ │  │ └───────┘ └───────┘ └───────┘  │  │ │
│  │  │ ┌───────┐ ┌───────┐ │  │ ┌───────────────────────────┐  │  │ │
│  │  │ │Vision │ │ Voice │ │  │ │     Matter / SmartThings  │  │  │ │
│  │  │ └───────┘ └───────┘ │  │ └───────────────────────────┘  │  │ │
│  │  └─────────────────────┘  └─────────────────────────────────┘  │ │
│  │                                                                  │ │
│  │  ┌───────────────────────────────────────────────────────────┐  │ │
│  │  │                      DATA LAYER                           │  │ │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐          │  │ │
│  │  │  │ IndexedDB  │  │  Supabase  │  │   Redis    │          │  │ │
│  │  │  │ (Offline)  │  │ (Primary)  │  │  (Cache)   │          │  │ │
│  │  │  └────────────┘  └────────────┘  └────────────┘          │  │ │
│  │  └───────────────────────────────────────────────────────────┘  │ │
│  │                         SERVICE LAYER                            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Métriques & KPIs

### 7.1 Métriques par Phase

| Phase | Métrique | Baseline | Target | Méthode |
|-------|----------|----------|--------|---------|
| **Phase 1** | Voice TTS Coverage | 0% | 100% | Feature flag |
| | WebSocket Success Rate | N/A | >99% | APM |
| | API P95 Latency | 500ms | <200ms | Monitoring |
| | DAU Growth | Baseline | +15% | Analytics |
| **Phase 2** | Voice Command Success | N/A | >85% | Voice analytics |
| | Wake Word Accuracy | N/A | >95% | Local metrics |
| | Realtime Sync Latency | N/A | <500ms | Monitoring |
| | Collaboration Adoption | 0% | 30% | Feature usage |
| | Camera Scan Accuracy | N/A | >90% | Vision metrics |
| **Phase 3** | Autonomous Actions/Day | 0 | 1000+ | Agent metrics |
| | IoT Connections | 0 | 10,000 | Device registry |
| | Local AI Usage | 0% | 70% | AI service logs |
| | Premium Conversion | TBD | 8% | Subscription |
| | MRR | 0 | 50K€ | Financial |
| **Phase 4** | MAU | TBD | 100,000 | Analytics |
| | Food Waste Reduction | 0% | 40% | User surveys |
| | NPS | TBD | >50 | NPS surveys |
| | ARR | 0 | 500K€ | Financial |
| | OEM Partnerships | 0 | 3 | Business dev |

### 7.2 User Satisfaction Targets

| Métrique | 3 mois | 6 mois | 12 mois |
|----------|--------|--------|---------|
| App Store Rating | 4.3 | 4.5 | 4.7 |
| 30-day Retention | 40% | 50% | 65% |
| Feature Adoption | 45% | 60% | 75% |
| Support Tickets | -20% | -40% | -60% |

### 7.3 Technical Performance

| Métrique | Current | 3 mois | 6 mois | 12 mois |
|----------|---------|--------|--------|---------|
| App Load Time | 3.5s | 2s | 1.5s | 1s |
| Voice Latency | N/A | 500ms | 300ms | 200ms |
| Offline Coverage | 60% | 75% | 85% | 95% |
| AI Success Rate | 95% | 97% | 98% | 99.5% |
| Camera Speed | 2s | 800ms | 500ms | 200ms |

---

## Annexes

### A. Glossaire

| Terme | Définition |
|-------|------------|
| **Wake Word** | Mot d'activation qui déclenche l'écoute active ("Hey Pantry") |
| **TTS** | Text-to-Speech - Synthèse vocale |
| **STT** | Speech-to-Text - Reconnaissance vocale |
| **CRDT** | Conflict-free Replicated Data Type - Structure de données pour sync |
| **Matter** | Protocole smart home universel (Apple, Google, Amazon) |
| **Porcupine** | Bibliothèque de détection wake word (Picovoice) |
| **ONNX** | Format universel pour modèles ML |

### B. Dépendances Techniques

```json
{
  "dependencies_phase1": {
    "socket.io": "^4.7.0",
    "socket.io-client": "^4.7.0"
  },
  "dependencies_phase2": {
    "@picovoice/porcupine-web": "^3.0.0",
    "@picovoice/web-voice-processor": "^4.0.0",
    "@tensorflow/tfjs": "^4.15.0",
    "tesseract.js": "^5.0.0",
    "@nicepkg/yjs": "^13.6.0"
  },
  "dependencies_phase3": {
    "ollama": "^0.5.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "matter-js": "^0.19.0"
  }
}
```

### C. Ressources

- [Picovoice Documentation](https://picovoice.ai/docs/)
- [TensorFlow.js Guide](https://www.tensorflow.org/js)
- [Socket.io Documentation](https://socket.io/docs/)
- [Matter Protocol](https://csa-iot.org/all-solutions/matter/)
- [Yjs CRDT](https://docs.yjs.dev/)

---

*Document généré le 2025-12-28 par l'armée d'agents IA Smart Pantry Pro*
