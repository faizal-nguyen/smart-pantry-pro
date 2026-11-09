# Migration vers API unifiée (apps/api)

Objectif: remplacer l'ancien serveur local (`start-local-api.js`, `server.dev.js`) et les handlers dans `api/` par l'API TypeScript unifiée sous `apps/api`.

## Démarrage Dev

- Front + API: `npm run dev`
  - Front: `http://localhost:3002`
  - API: `http://localhost:4000` (Vite proxy `/api/*`)

## Endpoints clés

- Assistant IA (SSE): `POST /api/v1/assistant/stream`
  - Auth: `Authorization: Bearer <supabase_jwt>` (si `SUPABASE_JWT_SECRET` configuré)
  - Streaming OpenAI côté serveur si `OPENAI_API_KEY` défini; sinon mode démo.
  - Compat temporaire: `/api/ai-assistant-enhanced`

- Shopping parse: `POST /api/v1/shopping/parse-text` (schémas `@smart/shared`)

- Instagram:
  - OEmbed: `POST /api/v1/social/instagram/oembed`
  - Thumbnail: `POST /api/v1/social/instagram/thumbnail`
  - Image proxy: `GET /api/v1/proxy/image?url=...` (allowlist par `IMAGE_PROXY_HOSTS`)

## Variables d'environnement (API)

- `OPENAI_API_KEY` (requis pour streaming réel)
- `OPENAI_MODEL` (optionnel, defaut `gpt-4o-mini`)
- `SUPABASE_JWT_SECRET` ou `JWT_SECRET` (optionnel) pour valider le JWT côté serveur
- `ALLOWED_ORIGINS` (CSV) pour CORS
- `IMAGE_PROXY_HOSTS` (CSV) pour proxy d'images

## Scripts

- `npm run api:dev` – démarre `apps/api`
- `npm run dev` – démarre API + Vite (proxy `/api`)

## Statut Legacy

- Les fichiers `start-local-api.js` et `server.dev.js` ont été supprimés.
- Le dossier `api/` est obsolète et sera retiré une fois les dépendances restantes (s'il y en a) migrées.

## Notes

- Les réponses API sont standardisées via `{ success, data?, error?, code? }`.
- Les schémas/DTO sont partagés via `packages/shared`.

