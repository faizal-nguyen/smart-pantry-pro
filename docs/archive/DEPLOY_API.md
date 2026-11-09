# Déploiement de l'API Smart Pantry

Depuis la PR #58 (2026-11-05), l'API Express (`apps/api`) est servie par le même projet Vercel que l'app : `smart-pantry-pro`, formule Hobby, région `fra1`. Avant, elle tournait sur Render (formule gratuite), avec 30 à 50 s de démarrage à froid après 15 min d'inactivité ; Render est retiré.

---

## Architecture

```
Vercel — smart-pantry-pro.vercel.app (Hobby, fra1)

  fichiers de dist/ (dont /assets/*)  ─►  statiques
  /api/*                              ─►  fonction api/index.js
                                           └─ createApp() de apps/api/dist/app.js
                                              ─►  Supabase (base + auth)
                                              ─►  OpenAI (assistant, dictée, parseur)
                                              ─►  OpenFoodFacts (proxy)
  /assets/* absent                    ─►  404
  le reste                            ─►  /index.html (routes React)
```

- `vercel.json` porte les réécritures, la région et la commande de build : `npm run shared:build && npm run api:build:ts && npm run build:optimized`.
- Node 24 (`engines` de `package.json`).
- `apps/api/src/index.ts` (qui écoute un port) ne sert qu'en local : `npm run dev` lance l'API et l'app.

---

## Variables d'environnement

Vercel → projet `smart-pantry-pro` → **Settings → Environment Variables**. Cocher **Production** et **Preview**. Une variable ne s'applique qu'aux nouveaux déploiements : redéployer après chaque modification.

| Clé | Obligatoire | Notes |
|---|---|---|
| `OPENAI_API_KEY` | oui | Sans clé valide, l'assistant répond « L'assistant n'a pas pu répondre » en ~1 s |
| `SUPABASE_URL` | oui | Même projet que le front |
| `SUPABASE_SERVICE_KEY` | oui | Clé `service_role`. Le nom exact est `SUPABASE_SERVICE_KEY`, sans `_ROLE_` (`apps/api/src/config/supabase.ts`) |
| `SUPABASE_ANON_KEY` | oui | Clé `anon public` |
| `ASSISTANT_HMAC_SECRET` | oui | 32 caractères minimum |
| `ADMIN_TOKEN` | oui | 32 caractères minimum (`openssl rand -hex 32`), pour `/api/admin/*` |
| `ALLOWED_ORIGINS` | non | Origines supplémentaires, séparées par des virgules. Le domaine de l'app et ses previews sont acceptés d'office (même domaine) |
| `OPENFOODFACTS_USER_AGENT` | non | Identifie l'app auprès d'OpenFoodFacts |
| `OPENAI_PARSE_TEXT_MODEL` | non | Défaut `gpt-4o-mini` |

Ne pas définir `PORT`, `HOST` ni `NODE_ENV` : Vercel ne les utilise pas pour la fonction.

---

## Vérifier un déploiement

```bash
# La fonction doit apparaître : « λ api/index … [fra1] »
vercel inspect <url-du-déploiement> --logs

# Santé de l'API en production
curl https://smart-pantry-pro.vercel.app/api/health

# Journaux de la fonction (statut dans responseStatusCode, console dans logs[])
vercel logs <dpl_id> --since 30m --no-branch --json
```

Les previews de PR sont protégées par la connexion Vercel et **partagent la base de production**.

---

## Limites de la formule Hobby

- 300 s par requête, 4,5 Mo par requête et par réponse, 2 Go de mémoire.
- Une seule région, cron au plus une fois par jour, usage personnel non commercial.
- Pas de Skew Protection : un onglet ouvert avant un déploiement demande les fichiers de l'ancienne version. L'app se recharge alors toute seule (PR #61).
- Les limiteurs de débit comptent par instance de la fonction.

---

## Retour arrière

- Revert de la PR fautive sur `main` : Vercel redéploie.
- Ou, plus vite : tableau de bord Vercel → **Deployments** → **Instant Rollback** vers le déploiement de production précédent.

Les migrations Supabase ne sont pas appliquées par le déploiement : les appliquer avant de merger le code qui en dépend, et vérifier qu'un retour arrière reste compatible avec le schéma.

---

## Dépannage

- **« L'assistant n'a pas pu répondre », en ~1 s et à 0 $** : appel OpenAI refusé, souvent une clé invalide. `callLLMSafe` ne journalise pas l'erreur. Vérifier `OPENAI_API_KEY`, puis redéployer.
- **`CORS not allowed`** : la requête vient d'un domaine étranger. L'ajouter à `ALLOWED_ORIGINS`.
- **`404 ROUTE_NOT_FOUND` sur `/api/...`** : la route n'est pas montée dans `apps/api/src/app.ts`. Le contrôle CI « Routes mounted (no-404 contract) » doit l'attraper.
- **« Failed to fetch dynamically imported module »** : onglet ouvert avant un déploiement. L'app se recharge une fois ; sinon, la fermer et la rouvrir.
