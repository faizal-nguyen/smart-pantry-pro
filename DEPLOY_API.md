# Déploiement de l'API Smart Pantry

> **Pourquoi ce doc** : avant 2026-05-19, le frontend ship sur Vercel mais
> l'API Express `apps/api/` n'avait jamais été déployée. Tous les
> `POST /api/*` en prod retournaient `405 Method Not Allowed` parce que
> `vercel.json` rewrite tout vers `/index.html` (fallback SPA React Router).
> Ce guide explique comment monter l'API sur **Render.com** (free tier)
> et la connecter à Vercel.

---

## Architecture

```
┌────────────────────────────────────┐
│  Vercel — smart-pantry-pro.vercel  │
│  Frontend Vite/React               │
│                                    │
│  Vercel rewrite                    │
│  /api/*  ─►  Render API            │
│  /*      ─►  /index.html (SPA)     │
└─────────────┬──────────────────────┘
              │ HTTPS
              ▼
┌────────────────────────────────────┐
│  Render — smart-pantry-api.onrender│
│  Express 5 + Node 24               │
│  apps/api/dist/index.js            │
│                                    │
│  ─►  Supabase (DB + auth)          │
│  ─►  OpenAI (parser + assistant)   │
│  ─►  OpenFoodFacts (proxy)         │
└────────────────────────────────────┘
```

---

## Étape 1 — Créer le service Render

1. Connecte-toi à <https://dashboard.render.com>.
2. **New +** → **Blueprint**.
3. Connecte le repo `faizal-nguyen/smart-pantry-pro` (ou ton fork).
4. Render lit automatiquement `render.yaml` à la racine et propose la
   création du service `smart-pantry-api`.
5. **Apply** — la première construction prend ~3-5 min.

---

## Étape 2 — Configurer les variables d'environnement Render

Dans le dashboard du service `smart-pantry-api` → **Environment**.

### Variables **obligatoires** (sans elles l'API plante)

| Clé | Valeur | Notes |
|---|---|---|
| `OPENAI_API_KEY` | `sk-…` | Compte OpenAI avec credits |
| `SUPABASE_URL` | `https://jwoxacnflphclslpqfzs.supabase.co` | Même que celui du front |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ…` | Dashboard Supabase → Project Settings → API → `service_role` |
| `SUPABASE_ANON_KEY` | `eyJ…` | Idem, `anon public` |
| `ADMIN_TOKEN` | (≥ 32 chars random) | Génère avec `openssl rand -hex 32`. Requis pour `/api/admin/*` (worker deletion). |

### Variables **facultatives** (valeurs par défaut déjà OK)

Déjà déclarées dans `render.yaml` :

| Clé | Défaut |
|---|---|
| `ALLOWED_ORIGINS` | `https://smart-pantry-pro.vercel.app` |
| `OPENAI_PARSE_TEXT_MODEL` | `gpt-4o-mini` |
| `OPENFOODFACTS_USER_AGENT` | `SmartPantryPro/1.0 (+https://…)` |
| `NODE_ENV` | `production` |

Adapte `ALLOWED_ORIGINS` si tu utilises plusieurs domaines (séparés par virgule).

---

## Étape 3 — Récupérer l'URL publique Render

Après le premier deploy réussi, Render affiche une URL :

```
https://smart-pantry-api-XXXX.onrender.com
```

Copie-la.

---

## Étape 4 — Brancher Vercel sur Render

Édite `vercel.json` (commité dans ce repo) — ligne 7 :

```diff
- "destination": "https://SMART_PANTRY_API_URL.onrender.com/api/$1"
+ "destination": "https://smart-pantry-api-XXXX.onrender.com/api/$1"
```

Commit + push. Vercel redéploie automatiquement.

---

## Étape 5 — Smoke test

Une fois le redeploy Vercel terminé :

```bash
# 1. Health check direct sur Render
curl https://smart-pantry-api-XXXX.onrender.com/api/health
# → {"status":"ok","version":"1.0.0"}

# 2. Health check via Vercel rewrite
curl https://smart-pantry-pro.vercel.app/api/health
# → même réponse JSON (plus de 405)

# 3. Recommendations (auth required, 401 attendu mais PAS 405)
curl -X POST https://smart-pantry-pro.vercel.app/api/v1/recommendations/suggest \
  -H "Content-Type: application/json" \
  -d '{}'
# → 401 Unauthorized (route reconnue ✓)
```

Sur l'app web (`smart-pantry-pro.vercel.app`) :
- `/kitchen` charge sans erreur 405 dans la console
- Les recommendations Today populent
- L'assistant memoires peut être créées

---

## Limites du free tier Render

- **Sleeps après 15 min d'inactivité** → 1er hit suivant prend ~30s (cold start)
- **512 MB RAM** — l'API est légère, devrait tenir
- **750 h/mois** d'uptime — suffit largement pour un seul service

Si le cold start gêne, deux options :
1. Passer Render au plan payant `Starter` ($7/mois, always-on)
2. Cron Vercel qui ping `/api/health` toutes les 14 min (gratuit, garde l'API warm)

---

## Migrations Supabase à appliquer

Le code de cette PR référence 3 migrations qui doivent être appliquées
sur Supabase prod **avant** que l'API soit utilisable end-to-end :

```bash
# Depuis le repo local
supabase db push
```

Migrations concernées :
- `20260516140000_product_intelligence_schema.sql` (PRP-225 PR1)
- `20260517081500_process_deletion_requests.sql` (worker RGPD)
- `20260517161734_recipe_interactions_recipe_fk.sql` (FK manquante)

---

## Alternatives à Render

Si Render ne convient pas :

| Service | Free tier | Cold start | Setup |
|---|---|---|---|
| **Render** | ✓ (sleeps) | ~30s | `render.yaml` (ce repo) |
| **Railway** | $5 crédit/mois | jamais | `railway.toml` à créer |
| **Fly.io** | 3 VMs gratuites | jamais | `fly.toml` à créer |
| **Vercel Serverless** | inclus | <1s | déplacer `apps/api/` vers `/api/[…path].ts` racine |

Le `vercel.json` rewrite cible n'importe quelle URL HTTPS, donc le choix
du provider est trivial. Render est recommandé pour la simplicité du
`Blueprint`.

---

## Troubleshooting

### `502 Bad Gateway` sur `/api/*`
- L'API Render est en cold start ou crashée. Vérifier les logs Render.

### `CORS not allowed` dans la console navigateur
- `ALLOWED_ORIGINS` côté Render ne liste pas le domaine Vercel. L'ajouter
  (plusieurs valeurs séparées par virgule).

### `405 Method Not Allowed`
- Le `rewrite` Vercel n'est pas appliqué. Vérifier que `vercel.json` a
  bien l'URL Render correcte (pas le placeholder `SMART_PANTRY_API_URL`).
- Vercel a-t-il bien redeployé après ton edit `vercel.json` ?

### `V1_NOT_READY` 503
- L'API a démarré mais le lazy `v1Router` ou `adminRouter` n'a pas fini
  de charger. Devrait disparaître après ~2s. Si persistant, vérifier les
  logs Render pour une erreur d'import.
