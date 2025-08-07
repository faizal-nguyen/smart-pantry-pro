# Architecture Technique - Smart Pantry Pro

## Vue d'ensemble de l'architecture

Smart Pantry Pro utilise une architecture moderne basée sur le JAMstack, optimisée pour la performance, la scalabilité et l'expérience développeur. Evolution V2 introduit une architecture modulaire et extensible qui s'appuie sur les fondations existantes tout en ajoutant 6 nouveaux modules majeurs.

### Architecture V1 + V2
```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React/Next.js)                  │
├─────────────────────────────────────────────────────────────────┤
│  UI Components  │  Hooks Layer  │  State Management (Zustand)   │
├─────────────────┬───────────────┴─────────────────────────────┤
│                 │           Service Layer                        │
│   Existing      ├──────────────────────────────────────────────┤
│   Services      │          Evolution V2 Services                 │
│                 │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  - Vision AI    │  │   AI    │ │  Meal   │ │Community│        │
│  - Voice Rec    │  │Nutrition│ │Planning │ │Services │        │
│  - Parser       │  └────┬────┘ └────┬────┘ └────┬────┘        │
│                 │  ┌────┴────┐ ┌────┴────┐ ┌────┴────┐        │
│                 │  │   IoT    │ │Analytics│ │ Offline │        │
│                 │  │   Hub    │ │ Engine  │ │  Sync   │        │
│                 │  └─────────┘ └─────────┘ └─────────┘        │
├─────────────────┴──────────────────────────────────────────────┤
│                    Data Layer (Supabase)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │Realtime  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Stack Technologique Détaillée

### Frontend

#### Core Technologies
- **React 18.3** : Framework UI avec Concurrent Features
- **TypeScript 5.6** : Typage statique et meilleure DX
- **Vite 5.4** : Build tool ultra-rapide avec HMR
- **React Router 6** : Navigation SPA

#### UI & Styling
- **Tailwind CSS 3.4** : Utility-first CSS framework
- **shadcn/ui** : Composants React accessibles et personnalisables
- **Radix UI** : Primitives UI headless
- **Lucide React** : Icônes SVG optimisées

#### State Management
- **Zustand 5.0** : State management léger et performant
- **React Query** : Data fetching et cache management
- **React Hook Form** : Gestion des formulaires performante
- **IndexedDB** : Storage local pour offline-first (V2)

### Backend

#### Infrastructure
- **Supabase** : Backend-as-a-Service complet
  - PostgreSQL 15 : Base de données relationnelle
  - Row Level Security (RLS) : Sécurité au niveau ligne
  - Realtime : Websockets pour temps réel
  - Storage : Stockage d'objets S3-compatible

#### API & Functions
- **Vercel Edge Functions** : Functions serverless
- **Express.js** : Serveur local de développement
- **OpenAI API** : Extraction intelligente de recettes et AI nutritionniste (V2)
- **Puppeteer** : Web scraping pour sites SPA
- **WebSocket** : Communication temps réel IoT (V2)

### DevOps & Infrastructure

#### Hosting & Deployment
- **Vercel** : Hosting et déploiement automatique
  - Edge Network : CDN global
  - Preview Deployments : PR automatiques
  - Analytics : Métriques de performance

#### CI/CD
- **GitHub Actions** : Pipeline d'intégration continue
- **ESLint & Prettier** : Qualité et formatage du code
- **TypeScript Compiler** : Vérification des types
- **Jest** : Tests unitaires et d'intégration (V2)

#### Monitoring
- **Vercel Analytics** : Performance et usage
- **Sentry** : Error tracking (optionnel)
- **LogRocket** : Session replay (optionnel)
- **Custom Analytics** : Métriques V2 spécifiques

## 🔧 Principes architecturaux V2

### 1. Extension vs Remplacement
- **Principe** : Étendre les services existants plutôt que les remplacer
- **Exemple** : `NutritionalAIService` étend `StreamingAIService`
- **Bénéfice** : Réutilisation du code, cohérence, maintenabilité

### 2. Modularité et découplage
- **Services indépendants** : Chaque module V2 peut fonctionner seul
- **Interfaces bien définies** : Contrats TypeScript stricts
- **Injection de dépendances** : Configuration flexible

### 3. Performance First
- **Lazy loading** : Chargement à la demande des modules
- **Code splitting** : Bundles optimisés par fonctionnalité
- **Caching intelligent** : Multi-niveaux (mémoire, localStorage, IndexedDB)

### 4. Offline-First Design
- **Queue d'opérations** : Toutes les actions sont queued
- **Sync bidirectionnelle** : Résolution automatique des conflits
- **Cache prédictif** : Anticipation des besoins utilisateur

## Architecture des Données

### Schéma de Base de Données V1
```sql
-- Tables principales
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│     users       │     │    pantries      │     │   products      │
│─────────────────│     │──────────────────│     │─────────────────│
│ id (uuid)       │────▶│ id (uuid)        │◀────│ id (uuid)       │
│ email           │     │ user_id (fk)     │     │ pantry_id (fk)  │
│ full_name       │     │ name             │     │ name            │
│ avatar_url      │     │ created_at       │     │ quantity        │
└─────────────────┘     └──────────────────┘     │ unit            │
                                                  │ expiry_date     │
                                                  └─────────────────┘
                                                           │
┌─────────────────┐     ┌──────────────────┐            │
│    recipes      │     │   ingredients    │            │
│─────────────────│     │──────────────────│            │
│ id (uuid)       │────▶│ id (uuid)        │            │
│ user_id (fk)    │     │ recipe_id (fk)   │            │
│ name            │     │ name             │            │
│ description     │     │ quantity         │            │
│ instructions    │     │ unit             │            │
│ image_url       │     └──────────────────┘            │
└─────────────────┘                                      │
         │                                               │
         ▼                                               ▼
┌─────────────────┐                          ┌─────────────────┐
│ shopping_lists  │                          │ notifications   │
│─────────────────│                          │─────────────────│
│ id (uuid)       │                          │ id (uuid)       │
│ user_id (fk)    │                          │ user_id (fk)    │
│ items (jsonb)   │                          │ type            │
│ status          │                          │ message         │
└─────────────────┘                          └─────────────────┘
```

### Extensions V2 du Schéma
```sql
-- Nouvelles tables Evolution V2
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ health_profiles │     │   meal_plans     │     │community_recipes│
│─────────────────│     │──────────────────│     │─────────────────│
│ id (uuid)       │     │ id (uuid)        │     │ id (uuid)       │
│ user_id (fk)    │     │ user_id (fk)     │     │ author_id (fk)  │
│ age             │     │ week_start_date  │     │ title           │
│ weight          │     │ budget           │     │ description     │
│ height          │     │ servings         │     │ rating          │
│ goals (jsonb)   │     │ meals (jsonb)    │     │ tags[]          │
└─────────────────┘     └──────────────────┘     └─────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   iot_devices   │     │ waste_predictions│     │  sync_queue     │
│─────────────────│     │──────────────────│     │─────────────────│
│ id (uuid)       │     │ id (uuid)        │     │ id (uuid)       │
│ user_id (fk)    │     │ product_id (fk)  │     │ user_id (fk)    │
│ device_type     │     │ risk_level       │     │ operation       │
│ brand           │     │ predicted_date   │     │ status          │
│ capabilities[]  │     │ confidence       │     │ retry_count     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## 🧠 AI Nutritionist Architecture

### Service Layer
```typescript
// Structure hiérarchique
StreamingAIService (Base)
    └── NutritionalAIService
            ├── analyzeNutritionalProfile()
            ├── generateHealthRecommendations()
            ├── calculateBMR()
            ├── calculateTDEE()
            └── trackMacronutrients()
```

### Data Flow
```
User Input → Health Profile → AI Analysis → Recommendations
     ↓              ↓              ↓              ↓
  Storage      Validation    OpenAI API    Visualization
```

### State Management
```typescript
// Zustand store structure
useNutritionalStore = {
  healthProfile: UserHealthProfile
  nutritionalAnalysis: NutritionalAnalysis
  recommendations: HealthRecommendation[]
  actions: {
    updateProfile: (profile) => void
    analyzeNutrition: () => Promise<void>
    clearAnalysis: () => void
  }
}
```

## 📅 Smart Meal Planning Architecture

### Algorithme d'optimisation
```
1. Collecte des contraintes
   - Budget, préférences, allergies, objectifs santé
   
2. Génération de plans candidats
   - Utilisation de l'IA pour proposer des combinaisons
   
3. Optimisation multi-critères
   - Coût, nutrition, variété, saisonnalité
   
4. Consolidation intelligente
   - Regroupement des ingrédients
   - Optimisation des quantités
   
5. Validation finale
   - Vérification des contraintes
   - Ajustements si nécessaire
```

## 👥 Community Architecture

### Real-time Features
```
WebSocket Connection (Supabase Realtime)
    ├── Recipe Updates
    ├── Challenge Progress
    ├── Expert Availability
    └── Social Feed
```

### Data Model
```typescript
// Hierarchie des entités
CommunityRecipe
    ├── RecipeRating[]
    ├── RecipeComment[]
    └── RecipeImage[]

CookingChallenge
    ├── ChallengeParticipant[]
    ├── ChallengeSubmission[]
    └── ChallengeVote[]

ExpertConsultation
    ├── ConsultationSlot[]
    ├── ConsultationBooking[]
    └── ConsultationReview[]
```

## 🏠 IoT Integration Architecture

### Protocol Support
```
IoTHubService
    ├── HTTP/REST APIs
    ├── WebSocket (Real-time)
    ├── MQTT (Lightweight devices)
    └── CoAP (Constrained devices)
```

### Device Abstraction Layer
```typescript
interface SmartDevice {
  id: string
  type: 'fridge' | 'oven' | 'scale' | 'sensor'
  capabilities: DeviceCapability[]
  status: DeviceStatus
  data: DeviceData
}

// Implémentations spécifiques
SmartFridgeAdapter implements SmartDevice
SmartOvenAdapter implements SmartDevice
SmartScaleAdapter implements SmartDevice
```

## 📊 Analytics Engine Architecture

### Machine Learning Pipeline
```
Data Collection → Feature Engineering → Model Training → Prediction
       ↓                  ↓                   ↓            ↓
   User Actions    Temporal Features    TensorFlow.js   Real-time
```

### Prediction Models
1. **Waste Prediction Model**
   - Input: Historique consommation, dates péremption, patterns
   - Output: Probabilité de gaspillage par produit
   - Accuracy: > 85%

2. **Buying Behavior Model**
   - Input: Historique achats, saisonnalité, prix
   - Output: Recommandations d'achat optimisées
   - Savings: ~30%

3. **Sustainability Scoring**
   - Input: Sources produits, emballages, transport
   - Output: Score 0-100 avec breakdown
   - Update: Temps réel

## 🔄 Offline Sync Architecture

### Sync Strategy
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│    Queue    │────▶│   Server    │
│   Changes   │     │  Manager    │     │    Sync     │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  Conflict    │
                    │  Resolver    │
                    └─────────────┘
```

### Storage Architecture
```typescript
// Multi-tier caching
CacheManager {
  L1: MemoryCache (50MB)
  L2: LocalStorage (5MB)
  L3: IndexedDB (100MB)
  L4: ServiceWorker Cache (200MB)
}

// Priority-based eviction
EvictionPolicy {
  - LRU for general data
  - Priority retention for critical data
  - TTL-based for temporal data
}
```

## Patterns d'Architecture

### 1. Component Architecture
```
src/
├── components/
│   ├── ui/              # Composants UI réutilisables
│   ├── layout/          # Composants de mise en page
│   ├── recipes/         # Composants métier recettes
│   ├── pantry/          # Composants métier garde-manger
│   ├── shopping/        # Composants métier courses
│   ├── nutrition/       # Composants nutrition V2
│   ├── community/       # Composants communauté V2
│   └── iot/            # Composants IoT V2
├── hooks/               # Custom React hooks
├── pages/               # Pages de l'application
├── lib/                 # Utilitaires et helpers
├── services/            # Services métier V2
└── types/               # Types TypeScript
```

### 2. API Design Pattern

#### RESTful Endpoints V1
```
GET    /api/recipes              # Liste des recettes
POST   /api/recipes              # Créer une recette
GET    /api/recipes/:id          # Détails d'une recette
PUT    /api/recipes/:id          # Modifier une recette
DELETE /api/recipes/:id          # Supprimer une recette

POST   /api/extract-recipe       # Extraire depuis URL
GET    /api/recipes/search       # Recherche de recettes
POST   /api/recipes/analyze      # Analyse nutritionnelle
```

#### RESTful Endpoints V2
```
# AI Nutritionist
PUT    /api/v2/nutrition/profile           # Profil de santé
POST   /api/v2/nutrition/analyze           # Analyse nutritionnelle

# Meal Planning
POST   /api/v2/meal-planning/generate      # Générer plan hebdo
POST   /api/v2/meal-planning/optimize      # Optimiser liste courses

# Community
POST   /api/v2/community/recipes           # Partager recette
POST   /api/v2/community/challenges/join   # Rejoindre challenge

# IoT
GET    /api/v2/iot/devices/discover        # Découvrir appareils
POST   /api/v2/iot/devices/:id/control     # Contrôler appareil

# Analytics
GET    /api/v2/analytics/waste-predictions # Prédictions gaspillage
GET    /api/v2/analytics/sustainability    # Score durabilité
```

### 3. State Management Pattern

```typescript
// Store Zustand example V2
interface NutritionalStore {
  healthProfile: UserHealthProfile | null;
  analysis: NutritionalAnalysis | null;
  recommendations: HealthRecommendation[];
  
  // Actions
  updateProfile: (profile: UserHealthProfile) => void;
  analyzeNutrition: () => Promise<void>;
  clearAnalysis: () => void;
}

interface CommunityStore {
  recipes: CommunityRecipe[];
  challenges: CookingChallenge[];
  
  // Actions
  shareRecipe: (recipe: Partial<CommunityRecipe>) => Promise<void>;
  joinChallenge: (challengeId: string) => Promise<void>;
}
```

### 4. Error Handling Pattern

```typescript
// Centralized error handling with V2 extensions
class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public feature?: 'nutrition' | 'iot' | 'community' | 'analytics'
  ) {
    super(message);
  }
}

// V2 specific errors
class AIServiceError extends AppError {
  constructor(message: string) {
    super(message, 'AI_SERVICE_ERROR', 503, 'nutrition');
  }
}

class IoTConnectionError extends AppError {
  constructor(deviceId: string) {
    super(`Cannot connect to device ${deviceId}`, 'IOT_CONNECTION_ERROR', 504, 'iot');
  }
}
```

## Sécurité

### Authentication Flow
```
┌──────────┐     ┌──────────────┐     ┌─────────────┐
│  Client  │────▶│   Supabase   │────▶│  Database   │
│ (React)  │◀────│    Auth      │◀────│   (RLS)     │
└──────────┘     └──────────────┘     └─────────────┘
     │                   │                     │
     │  1. Login        │  2. Verify          │
     │─────────────────▶│─────────────────────▶
     │                  │                     │
     │  4. JWT Token    │  3. Generate Token  │
     │◀─────────────────│◀─────────────────────
     │                  │                     │
     │  5. API Request  │  6. Validate JWT    │
     │─────────────────▶│─────────────────────▶
```

### Security Measures

1. **Row Level Security (RLS)**
   - Toutes les tables ont des politiques RLS
   - Isolation complète des données utilisateur
   - Vérification automatique des permissions

2. **API Security**
   - Rate limiting sur les endpoints sensibles
   - Validation des entrées avec Zod
   - CORS configuré correctement
   - Headers de sécurité (CSP, HSTS)

3. **Data Protection**
   - Chiffrement des données sensibles
   - Pas de stockage de secrets côté client
   - Variables d'environnement pour les clés API

### V2 Security Enhancements

1. **Health Data Protection**
   - Encryption at rest pour profils de santé
   - Anonymisation pour analytics
   - Conformité HIPAA (considérations)

2. **IoT Security**
   - Device authentication tokens
   - Command validation
   - Firmware verification

3. **Community Safety**
   - Content filtering AI
   - User verification
   - Expert credential validation

## Performance

### Optimisations Frontend

1. **Code Splitting**
   ```typescript
   const RecipeDetail = lazy(() => import('./pages/RecipeDetail'));
   const NutritionDashboard = lazy(() => import('./pages/NutritionDashboard'));
   ```

2. **Image Optimization**
   - Lazy loading des images
   - Format WebP avec fallback
   - Responsive images avec srcset

3. **Bundle Optimization**
   - Tree shaking automatique
   - Minification avec Terser
   - Compression Brotli

### Optimisations Backend

1. **Database Queries**
   - Indexes sur les colonnes fréquentes
   - Pagination des résultats
   - Requêtes optimisées avec EXPLAIN

2. **Caching Strategy**
   - Cache navigateur (assets statiques)
   - Cache API avec Redis (optionnel)
   - Memoization des calculs coûteux

3. **API Performance**
   - Compression gzip
   - Connection pooling
   - Lazy loading des relations

### V2 Performance Metrics
```typescript
interface PerformanceMetrics {
  // Service Level
  serviceInitTime: number      // Target: < 100ms
  moduleLoadTime: number       // Target: < 1s
  apiResponseTime: number      // Target: < 3s
  
  // User Experience
  firstContentfulPaint: number // Target: < 1.5s
  timeToInteractive: number    // Target: < 3s
  
  // Business Metrics
  predictionAccuracy: number   // Target: > 85%
  syncSuccessRate: number      // Target: > 95%
  conflictResolutionRate: number // Target: > 97%
}
```

## Scalabilité

### Horizontal Scaling

1. **Frontend**
   - CDN global avec Vercel Edge
   - Assets statiques sur 200+ PoPs
   - Cache invalidation automatique

2. **Backend**
   - Serverless functions auto-scaling
   - Database connection pooling
   - Read replicas pour les lectures

### Vertical Scaling

1. **Database**
   - Upgrade plan Supabase PRN
   - Partitioning des tables volumineuses
   - Archivage des données anciennes

2. **Storage**
   - CDN pour les images
   - Compression automatique
   - Lifecycle policies

### V2 Scaling Strategy

1. **Microservices Approach**
   ```
   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
   │   Frontend   │  │  AI Services │  │ IoT Gateway  │
   │   (Vercel)   │  │  (Deno Edge) │  │ (WebSocket)  │
   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
          │                 │                   │
          └─────────────────┴───────────────────┘
                            │
                     ┌──────▼───────┐
                     │   Supabase   │
                     │  (Database)  │
                     └──────────────┘
   ```

2. **Service-Specific Scaling**
   - AI services: Auto-scaling based on load
   - IoT gateway: Multiple instances with load balancing
   - Analytics: Distributed processing with workers

## Disaster Recovery

### Backup Strategy

1. **Database**
   - Backups automatiques quotidiens
   - Point-in-time recovery (7 jours)
   - Export manuel possible

2. **Code**
   - Versionning Git
   - Tags pour les releases
   - Rollback facile sur Vercel

### Monitoring & Alerting

1. **Uptime Monitoring**
   - Health checks toutes les 5 minutes
   - Alertes email/SMS
   - Status page publique

2. **Error Tracking**
   - Logs centralisés
   - Alertes sur erreurs critiques
   - Dashboard de monitoring

## Évolution Future

### Court Terme (3-6 mois)
- Migration vers Next.js 14 App Router
- Implémentation du cache Redis
- Tests E2E avec Playwright
- Optimisation des modèles ML

### Moyen Terme (6-12 mois)
- Microservices pour certaines features
- GraphQL API alternative
- Mobile app React Native
- Extension de l'écosystème IoT

### Long Terme (12+ mois)
- ML avancé pour recommandations
- Architecture event-driven complète
- Multi-tenancy pour B2B
- Blockchain pour traçabilité alimentaire

## Migration Strategy V2

### Phased Rollout
1. **Phase 1**: Beta users (10%)
   - Feature flags pour activation graduelle
   - A/B testing pour UX optimization

2. **Phase 2**: Power users (30%)
   - Performance monitoring
   - Feedback collection

3. **Phase 3**: General availability (100%)
   - Full feature enablement
   - Legacy deprecation plan

### Backward Compatibility
- V1 APIs maintenues 6 mois
- Migration tools fournis
- Data migration automatisée
- Pas de breaking changes pour features existantes

---

*Architecture Evolution V2 - Construire l'avenir de la cuisine intelligente* 🏗️