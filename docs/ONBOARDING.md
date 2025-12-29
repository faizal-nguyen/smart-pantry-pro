# Smart Pantry Pro – Onboarding Développeur (Option A: Vite + Express)

Bienvenue ! Ce guide vous aide à comprendre l’architecture, lancer l’environnement, et contribuer en sécurité.

## Architecture en bref
- Front: React 18 + TypeScript via Vite (`src/**`), Tailwind + shadcn/ui, Zustand, React Query.
- API: Express TypeScript dans `apps/api` (port `:4000` par défaut), exposée via proxy Vite (`/api`).
- Services: Modules métier sous `src/services/**`. Les intégrations lourdes (OpenAI, scraping, Python) doivent rester côté API.
- Python vidéo: `api/video-processor/**` (microservice à isoler plus tard).

## Démarrer
- Cloner le repo, installer les deps: `npm install` (Node 18+).
- Copier `.env.example` → `.env.local` et compléter clés:
  - `ALLOWED_ORIGINS=http://localhost:3002` (front Vite)
  - `PORT=4000` (optionnel)
- Dev: `npm run dev:full` (Vite + API Express)
- API Health: GET `http://localhost:4000/api/health`

## Schémas partagés (`@shared`)

- Contrats Zod centralisés sous `packages/shared`.
- Build nécessaire avant dev: `npm run shared:build` (le script `build` global le fait aussi).
- Import front: `const { UrlBody } = await import('@shared');`
- Import API: `import { UrlBody } from '../../../../packages/shared/dist/index.js';` (ou ajouter un alias TS côté API).

## Sécurité & bonnes pratiques
- Côté front, n’importez jamais des modules serveur (ex: `openai`, `fs`, `path`) — bloqué par ESLint.
- Toute donnée externe doit être validée (Zod) côté API avant traitement.
- Les logs redigent les éléments sensibles; évitez `console.log` de secrets.
- CORS dynamique via `ALLOWED_ORIGINS` (CSV). Image proxy limité par `IMAGE_PROXY_HOSTS`.

## Conventions de code
- Nom de fichiers: `kebab-case` pour fichiers, `PascalCase` pour composants.
- Dossier par domaine (progressif): `src/features/<domaine>/{components,hooks,api,types}`.
- Types partagés front: `src/types/**`. Valider avec Zod côté API, dériver types côté front.
- Tests: Jest. Tests front en JSDOM, tests Node séparés. Utiliser `MemoryRouter` pour pages.

## Points d’entrée utiles
- Front pages: `src/pages/**`
- UI/Design system: `src/components/ui/**`
- API server: unifié sous `apps/api` (Express + TS). Démarrage via `npm run api:dev` ou `npm run dev` (proxy Vite).
- Services métier: `src/services/**`
- Config sécurité (front): `src/config/security.ts`

## Déploiement (aperçu)
- Front: build Vite → artefacts statiques.
- API: Node app (Express) déployée séparément. Configurer `ALLOWED_ORIGINS`, rate limit, et `IMAGE_PROXY_HOSTS`.

## Roadmap technique
- Extraire API vers `apps/api` (TypeScript, pino, helmet, Zod schemas).
- Isoler le service Python sous `services/video-processor` + URL `VIDEO_PROCESSOR_URL`.
- Renforcer tests API (fumée + validation Zod) et ajouter lints “client-only/server-only”.

Bon dev !
