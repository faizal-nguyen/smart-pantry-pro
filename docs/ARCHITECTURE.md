# Architecture Technique - Smart Pantry Pro

## Vue d'ensemble de l'architecture

Smart Pantry Pro utilise une architecture moderne basée sur le JAMstack, optimisée pour la performance, la scalabilité et l'expérience développeur.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Pages     │  │  Components  │  │  Hooks & Store   │  │
│  │  (Routes)   │  │   (UI/UX)    │  │  (State Mgmt)    │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (RESTful)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Vercel     │  │   Supabase   │  │    External      │  │
│  │  Functions  │  │     Edge     │  │     APIs         │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer (Supabase)                      │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ PostgreSQL  │  │   Storage    │  │     Auth         │  │
│  │  Database   │  │   (Images)   │  │   (Users)        │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
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
- **OpenAI API** : Extraction intelligente de recettes
- **Puppeteer** : Web scraping pour sites SPA

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

#### Monitoring
- **Vercel Analytics** : Performance et usage
- **Sentry** : Error tracking (optionnel)
- **LogRocket** : Session replay (optionnel)

## Architecture des Données

### Schéma de Base de Données

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

### Modèles de Données

#### User Model
```typescript
interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}
```

#### Recipe Model
```typescript
interface Recipe {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  cuisine_type?: string;
  meal_type: MealType;
  prep_time: number;
  cook_time: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  image_url?: string;
  source_url?: string;
  ingredients: Ingredient[];
  instructions: string[];
  tags: string[];
  nutrition?: NutritionInfo;
  created_at: Date;
  updated_at: Date;
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
│   └── shopping/        # Composants métier courses
├── hooks/               # Custom React hooks
├── pages/               # Pages de l'application
├── lib/                 # Utilitaires et helpers
└── types/               # Types TypeScript
```

### 2. API Design Pattern

#### RESTful Endpoints
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

### 3. State Management Pattern

```typescript
// Store Zustand example
interface RecipeStore {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchRecipes: () => Promise<void>;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, data: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
}
```

### 4. Error Handling Pattern

```typescript
// Centralized error handling
class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}

// Usage in API
try {
  const recipe = await extractRecipe(url);
  return res.json({ success: true, recipe });
} catch (error) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
  // Generic error
  return res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
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

## Performance

### Optimisations Frontend

1. **Code Splitting**
   ```typescript
   const RecipeDetail = lazy(() => import('./pages/RecipeDetail'));
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

### Moyen Terme (6-12 mois)
- Microservices pour certaines features
- GraphQL API alternative
- Mobile app React Native

### Long Terme (12+ mois)
- ML pour recommandations
- Architecture event-driven
- Multi-tenancy pour B2B