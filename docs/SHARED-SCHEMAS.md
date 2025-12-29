# Schémas Partagés (`@shared`)

## Objet
Centraliser les contrats (Zod) utilisés par le front et l’API pour garantir une validation uniforme et éviter les divergences.

## Structure

```
packages/
  shared/
    src/
      schemas.ts      # Zod schemas
      index.ts        # exports
    dist/             # build TS → JS + d.ts
```

Schemas disponibles (extraits):
- `UrlBody` – `{ url: string }`
- `VideoBody` – `{ videoUrl: string; platform?: 'youtube'|'tiktok'|'instagram'|'generic' }`
- `TranscribeYoutubeBody` – `{ videoUrl: string; language?: string }`
- `ShoppingTextBody` – `{ text: string }`
- `ShoppingItemsBody` – `{ items: Array<{ productName: string; ... }> }`

## Utilisation

1) Build initial des schémas

```
npm run shared:build
```

2) Import via alias `@shared` (front)

```
// Exemple front (React/Vite)
const { UrlBody, VideoBody } = await import('@shared');
UrlBody.parse({ url });
VideoBody.parse({ videoUrl, platform: 'instagram' });
```

3) Import côté API (Node/TS)

```
// Exemple API (Express TS)
import { UrlBody } from '../../../../packages/shared/dist/index.js';
// ou configurer un alias TS côté API si souhaité
```

## Configuration

- Vite alias (front): `@shared` → `packages/shared/dist` (vite.config.ts)
- TS paths (root): `@shared` et `@shared/*` → `packages/shared/dist/*` (tsconfig.json)

## Bonnes pratiques

- Toujours valider les entrées utilisateur (front) AVANT l’appel API.
- Toujours valider les inputs API (route) via `route({ schema, handler })`.
- Centraliser les évolutions de schémas dans `packages/shared` (versionner si besoin).

