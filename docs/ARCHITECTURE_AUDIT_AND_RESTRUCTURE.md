# Smart Pantry Pro – Audit d’Architecture et Plan de Restructuration

Version: 2025-10-02
Auteur: Audit technique architecture front/back

## Objectifs
- Clarifier l’architecture (front, API, services) et supprimer les ambiguïtés entre Vite/React et Next.js.
- Unifier la couche API, isoler les dépendances serveur, renforcer sécurité/observabilité.
- Préparer une structure durable orientée « domain by feature » et micro‑service vidéo.

## Résumé exécutif
- Front: React 18 + TS via Vite (alias `@`), Tailwind + shadcn/ui, Zustand, React Query.
- API: Express local (`start-local-api.js` sur `:3003`), endpoints Node/TS sous `api/`, coexistence avec routes “Next API” dans `pages/api` et `src/app/api` (doublons/confusion).
- Service vidéo Python présent dans le repo (dockerisé), venv commitée sous `api/video-processor/venv` (ignorée par `.gitignore`).
- Problème clé: mélange Next.js (imports `next/*`, dossiers `pages/`, `src/app/`) et Vite/React Router → architecture hybride ambiguë, sources d’erreurs et de bundling.

Décision recommandée: Standardiser sur « Vite + Express » (Option A). Option B (migration 100% Next.js) détaillée plus bas si pivot souhaité.

---

## Constats détaillés

### Points forts
- Services métier segmentés par domaines (`src/services/*`) : vision, voice, planning, ai, pricing, social, etc.
- Sécurité centralisée (`src/config/security.ts`) avec CORS/CSP, rate limiting, messages d’erreurs et « sanitizeForLogging ».
- Vite config robuste (proxy `/api` → `:3003`, split de chunks, externalisation de deps serveur, alias).
- Base de tests Jest existante (services, voice, planning), scripts de debug/documentation nombreux.

### Problèmes structurants
- Frameworks mêlés:
  - Imports Next dans du code Vite: ex. `src/pages/CipherMealPlanningPage.tsx` → `next/navigation` (incompatible Vite/React Router).
  - Trois couches API concurrentes: `api/` (Express), `pages/api/*` (Next), `src/pages/api/*` (mock). Le proxy Vite cible Express, mais le code et la doc pointent aussi vers Next.
  - Présence `src/app/api/.../route.ts` (App Router Next) sans serveur Next actif.
- Duplication / fichiers ambigus:
  - `pages/api/parse-video-recipe.ts` vs `src/pages/api/parse-video-recipe.ts` (mock temporaire).
  - Fichiers avec espaces: `src/pages/InsightsPage 2.tsx`, `api/video-processor/frame_extractor 2.py`, `server 2.js`.
- Risques bundling:
  - Imports serveur (`openai`, `@google-cloud/vision`) sous `src/services/video/*`. Si une page client les importe transitivement, risque d’embarquer ces modules dans le bundle.
- Monolithisme du repo:
  - Front, API Node et service Python cohabitent sans frontières outillées (pas de règles « server-only/client-only »).
- DX/ops:
  - Scripts nombreux et parfois redondants; assets de debug lourds à la racine.

---

## Cible d’architecture

### Option A (recommandée): Vite + Express + service Python séparé
1) Front 100% Vite + React Router.
   - Supprimer toutes références Next: dossiers `pages/`, `src/app`, imports `next/*`.
2) API 100% via Express (`/api/*`) dans une app dédiée (TypeScript recommandé).
3) Service vidéo Python isolé sous `services/video-processor/` (Docker) appelé par l’API.
4) Model « domain by feature » côté front pour regrouper UI/hooks/facades par domaine.

### Option B (alternative): Next.js full
- Migrer totalement vers Next (App Router). Supprimer Vite/Express. Extraire le Python en microservice. À n’envisager que si SSR/RSC/Edge sont des besoins prioritaires.

---

## Plan d’exécution détaillé (Option A)

### 1) Normaliser le front Vite (supprimer Next)
Actions:
- Supprimer les dossiers et fichiers Next:
  - `smart-pantry-pro/pages/` (tout le dossier)
  - `smart-pantry-pro/src/app/` (tout le dossier)
- Remplacer les imports Next dans le front:
  - `src/pages/CipherMealPlanningPage.tsx`: remplacer `useRouter` (next/navigation) par `useNavigate` (react-router-dom) et adapter la navigation.
  - `src/pages/demo/inventory-visualization.tsx`: supprimer `NextPage`/`Head`, utiliser `<title>` via un wrapper interne ou `react-helmet-async` si nécessaire.
- Vérifier/retirer toute autre occurrence de `next/*` sous `src/`.

Livrables:
- Code front ne contenant plus de dépendances à Next.js.
- Routes client unifiées via React Router.

### 2) Consolider l’API sous Express (TypeScript conseillé)
Actions:
- Créer une app dédiée (proposition mono‑repo légère) :
  - `apps/api/` (TS) avec `src/routes/*`, `src/middlewares/*`, `src/services/*`, `src/integrations/*`.
  - Migrer la logique depuis `smart-pantry-pro/api/*` et `pages/api/*`.
  - Remplacer `src/pages/api/parse-video-recipe.ts` (mock) par un handler Express mockable via `DEMO_MODE=1`.
- Sécurité middleware:
  - Ajouter `helmet`, CORS dynamique (basé sur env `ALLOWED_ORIGINS`), `compression`, rate limiting (Redis/Memory selon env).
- Observabilité:
  - Ajouter `pino` + `pino-http`, `requestId`, redaction sensible (réutiliser `sanitizeForLogging`).
- Contrats:
  - Zod pour toutes payloads entrantes/sortantes (`apps/api/src/schemas/*`). Exposer types côté front via package partagé ou duplication contrôlée.

Livrables:
- `apps/api` compilable, démarrable sur `:3003`.
- Vite proxy configuré vers `http://localhost:3003` (déjà en place).

### 3) Extraire le service Python
Actions:
- Déplacer `smart-pantry-pro/api/video-processor/` → `services/video-processor/`.
- Dockeriser proprement (Dockerfile déjà présent). Exposer env `VIDEO_PROCESSOR_URL` consommé par `apps/api`.
- Nettoyer le venv local du repo; ignorer `services/video-processor/venv/` via `.gitignore`.

Livrables:
- Service vidéo autonome adressable en HTTP.
- L’API Express appelle le service Python via URL configurable.

### 4) Domain by feature (front)
Actions:
- Regrouper UI/hooks/facades par domaine: `src/features/<domaine>/{components,hooks,api,types}`.
- Conserver `src/shared/{ui,lib,config,types}` pour le transversal.
- Le code bas niveau serveur (scrapers, openai, etc.) sort du front et passe côté `apps/api`.

Livrables:
- Meilleure lisibilité et séparation client/serveur claire.

### 5) Quality gates et sécurité
Actions:
- ESLint « client‑only »: interdire imports serveur dans le client (ex: `openai`, `fs`, `node:`).
- Désactiver `script-src 'unsafe-inline'` en prod dans CSP; activer `helmet` côté API.
- Passer `ALLOWED_ORIGINS` en env (CSV) et parser côté API.
- Config `.env` par app: `apps/web/.env`, `apps/api/.env`.

Livrables:
- Lint empêchant les fuites serveur→client.
- CSP et CORS pilotés par env.

### 6) Nettoyage repo et DX
Actions:
- Renommer fichiers avec espaces:
  - `src/pages/InsightsPage 2.tsx` → `src/pages/InsightsPage.tsx` (ou `InsightsPagePreview.tsx`)
  - `api/video-processor/frame_extractor 2.py` → `services/video-processor/frame_extractor_alt.py`
  - `server 2.js` → `server.dev.js`
- Déplacer assets/tests/HTML de debug vers `examples/` ou `fixtures/`.
- Normaliser scripts npm:
  - `web:dev`, `api:dev`, `dev` (concurrently), `web:build`, `api:build`.

Livrables:
- Racine plus propre, scripts cohérents, onboarding simplifié.

---

## Liste précise des fichiers à modifier/supprimer

À supprimer (si Option A):
- Dossiers Next:
  - `smart-pantry-pro/pages/`
  - `smart-pantry-pro/src/app/`

À modifier (remplacer usages Next):
- `smart-pantry-pro/src/pages/CipherMealPlanningPage.tsx`
  - Remplacer `useRouter` (next/navigation) par `useNavigate` (react-router-dom)
  - Mettre à jour toute navigation utilisée
- `smart-pantry-pro/src/pages/demo/inventory-visualization.tsx`
  - Supprimer `NextPage` et `Head` (utiliser `react-helmet-async` ou simple `<title>` via un layout commun)
- Rechercher `import .* from 'next'` et `next/head`, `next/link`, `next/navigation` sous `src/` et corriger.

À renommer (sans espace):
- `smart-pantry-pro/src/pages/InsightsPage 2.tsx` → `smart-pantry-pro/src/pages/InsightsPage.tsx` (ou `InsightsPagePreview.tsx`)
- `smart-pantry-pro/api/video-processor/frame_extractor 2.py` → `services/video-processor/frame_extractor_alt.py`
- `smart-pantry-pro/server 2.js` → `smart-pantry-pro/server.dev.js`

API à migrer vers Express (apps/api):
- Depuis `smart-pantry-pro/pages/api/*`:
  - `social-media-recipe.ts`
  - `ai-assistant-enhanced.ts`
  - `vision-recognize.ts`
  - `parse-video-recipe.ts`
- Depuis `smart-pantry-pro/api/*` (Node/TS déjà existants): regrouper en routes TS, factoriser middlewares.

Service Python à déplacer:
- `smart-pantry-pro/api/video-processor/*` → `services/video-processor/*`
- Mettre à jour `.gitignore` pour ignorer `services/video-processor/venv/`

Sécurité/Configs:
- `smart-pantry-pro/src/config/security.ts`:
  - Déporter `ALLOWED_ORIGINS` en env côté API; conserver une `publicConfig` front (non sensible) si nécessaire.
- `smart-pantry-pro/vite.config.ts`:
  - Conserver proxy `/api` vers `:3003`; s’assurer qu’aucune route Next n’est référencée.

Linting:
- `smart-pantry-pro/eslint.config.js`: ajouter règles « server‑only/client‑only » (voir extrait plus bas).

---

## Extraits et gabarits (à intégrer)

### CORS dynamique (Express)
```ts
// apps/api/src/middlewares/cors.ts
import cors from 'cors';

const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

export const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes(origin) || origin.includes('localhost')) return cb(null, true);
    cb(new Error('CORS not allowed'));
  },
  credentials: true
});
```

### Helmet + CSP (prod)
```ts
// apps/api/src/middlewares/security.ts
import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    useDefaults: true,
    directives: {
      "script-src": ["'self'"],
      "img-src": ["'self'", 'data:', 'https:'],
      "connect-src": ["'self'", 'https://*.supabase.co', 'https://api.openai.com']
    }
  } : false
});
```

### Logger pino
```ts
// apps/api/src/middlewares/logger.ts
import pino from 'pino';
import pinoHttp from 'pino-http';

export const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
export const loggerMiddleware = pinoHttp({ logger, genReqId: () => crypto.randomUUID() });
```

### ESLint – interdire imports serveur en client
```js
// smart-pantry-pro/eslint.config.js (ajout)
export default [
  // ...config existant
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'openai', message: 'Server-only. Utiliser via API.' },
            { name: 'fs', message: 'Server-only.' },
            { name: 'path', message: 'Server-only.' },
          ],
          patterns: ['node:*']
        }
      ]
    }
  }
];
```

### Mocks et DEMO_MODE
```ts
// apps/api/src/routes/parse-video-recipe.ts (extrait)
if (process.env.DEMO_MODE === '1' || missingKeys) {
  return res.json({ success: true, data: demoRecipe, message: 'Mode démo' });
}
```

---

## Scripts npm proposés
```json
{
  "scripts": {
    "web:dev": "vite --port 3002",
    "api:dev": "ts-node-dev apps/api/src/index.ts",
    "dev": "concurrently \"npm:api:dev\" \"npm:web:dev\"",
    "web:build": "vite build",
    "api:build": "tsc -p apps/api/tsconfig.json",
    "build": "npm run api:build && npm run web:build"
  }
}
```

---

## Tests et validation
- Séparer projets Jest (ou passer Vitest pour le front):
  - Projet node (env node) pour `apps/api`.
  - Projet jsdom pour `apps/web`.
- Tests fumée API: `/api/health`, `/api/parse-video-recipe` (demo), `/api/youtube-extract`.
- S’assurer que le bundle client n’embarque pas `openai`, `googleapis`, etc. (inspecter `dist`, `vite build --mode analyze`).

Checklist validation:
- [ ] `npm run dev` OK, front accessible, API joignable via proxy.
- [ ] Aucune occurrence `next/*` dans `src/`.
- [ ] `pages/` et `src/app/` supprimés.
- [ ] ESLint interdit les imports serveur côté client.
- [ ] DEMO_MODE actif si clés manquantes; logs structurés pino visibles.
- [ ] Service Python déplacé et accessible via URL.

---

## Risques & mitigations
- Régressions sur endpoints (différences de contrats):
  - Mitiger avec Zod (validation) et tests de non-régression.
- Rupture d’imports suite à renommages/suppressions:
  - Script `rg` pour lister les références et CI qui casse à la moindre erreur de build.
- CSP trop stricte en prod:
  - Activer progressivement; whitelister domaines nécessaires.

---

## Timeline proposée (indicative)
- Semaine 1: Purge Next, corrections front (router, imports), renommages.
- Semaine 2: Extraction `apps/api` TS, migration routes critiques, CORS/helmet/pino.
- Semaine 3: Déplacement service Python, intégration URL, tests fumée.
- Semaine 4: Domain by feature (front), Zod DTOs, lint rules, nettoyage repo.

---

## Option B (Next.js full) – synthèse
- Migrer Vite → Next, supprimer Express, porter routes vers `app/api/*`, utiliser RSC/Edge si utile.
- Effort significatif car build, routing et tooling changent; non recommandé si l’app est déjà optimisée Vite.

---

## Prochaines étapes
1) Confirmer Option A vs Option B.
2) Lancer Quick Wins (renommages, suppression dossiers Next, corrections imports). 
3) Démarrer consolidation API (squelette `apps/api`).

Si vous validez, je peux préparer un premier patch: 
- suppression `pages/` + `src/app/`, 
- corrections `next/*` dans les pages concernées, 
- renommages de fichiers avec espaces, 
- ajout des règles ESLint.

