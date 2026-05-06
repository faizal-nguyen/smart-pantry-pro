# Security incident report — 2026-05-06

> Document interne. Ne pas publier. Aucune valeur de secret n'apparait
> dans ce fichier.

## 1. Context

Le repo `smart-pantry-pro` (public sur GitHub) contenait, depuis le commit
initial `9696a47f` du 2025-12-29, des fichiers `.env` *traces par git* :

- `.env.development` -> contenait des clés API réelles
- `.env.staging` -> contenait uniquement des placeholders
- `.env.production` -> contenait uniquement des placeholders

Le `.gitignore` re-incluait explicitement ces fichiers via des regles
`!.env.development`, `!.env.staging`, `!.env.production`, ce qui bloquait
toute correction par simple ajout d'un pattern d'ignore.

## 2. Cles concernees

Toutes les cles ci-dessous sont considerees comme **compromises** car le
repo est public. Ne pas reutiliser, meme reactivees plus tard.

| Service | Variable(s) | Type |
|---|---|---|
| OpenAI | `OPENAI_API_KEY`, `VITE_OPENAI_API_KEY` | API key projet |
| Deepgram | `DEEPGRAM_API_KEY`, `VITE_DEEPGRAM_API_KEY` | API key |
| Cloudinary | `CLOUDINARY_API_SECRET` | API secret |
| Cloudinary | `CLOUDINARY_API_KEY`, `CLOUDINARY_CLOUD_NAME` | Public ID (rotation optionnelle) |
| Google / YouTube | `YOUTUBE_API_KEY`, `VITE_YOUTUBE_API_KEY` | API key |
| Supabase (project `jwoxacnflphclslpqfzs`) | `VITE_SUPABASE_ANON_KEY` | JWT anon (RLS-protege) |
| Supabase | `SUPABASE_SERVICE_KEY` (dans `apps/api/.env` non trace) | JWT service_role |

Aucune cle de paiement (Stripe), authentification (Auth0, Clerk) ou
webhook signe n'est concernee.

## 3. Timeline

- **2025-12-29** : commit `9696a47f` introduit `.env.development` avec secrets.
- **2025-09-12 a 2026-05-06** : repo public, secrets exfiltrables.
- **2026-05-06** : detection (audit interne, rapport Codex PRP-220).
- **2026-05-06** : revocation des cles chez tous les fournisseurs.
- **2026-05-06** : nettoyage du tracking git (PRP-220.01, branche `chore/security-prp-220-01`).

## 4. Mitigation immediate

| # | Action | Responsable | Statut |
|---|---|---|---|
| M1 | Revoquer cle OpenAI | Faizel | Done |
| M2 | Revoquer cle Deepgram | Faizel | Done |
| M3 | Regenerer secret Cloudinary | Faizel | Done |
| M4 | Regenerer cle YouTube | Faizel | Done |
| M5 | Regenerer cles Supabase (anon + service_role) | Faizel | Done |
| M6 | Untrack `.env.development`, `.env.staging`, `.env.production` | PRP-220.01 | Done (cette branche) |
| M7 | Corriger `.gitignore` (suppression negations) | PRP-220.01 | Done (cette branche) |
| M8 | Reecrire `.env.example` et `apps/api/.env.example` | PRP-220.01 | Done (cette branche) |
| M9 | Stocker les nouvelles cles dans le secret manager | Faizel | Done |

## 5. Decision : reecriture historique

**Non realisee.**

Justification :
- Repo public depuis ~8 mois -> les secrets ont ete collectes par les
  bots de scanning dès leur push. La reecriture n'a plus de valeur
  defensive.
- `git filter-repo` + force-push casserait :
  - les forks publics
  - les caches CI (Vercel, GitHub Actions)
  - les clones locaux des contributeurs
- La rotation (M1-M5) est la mitigation effective.

Si une reecriture est decidee plus tard, elle fera l'objet d'un PRP
dedie avec un plan de communication.

## 6. Suivi post-rotation

Pendant 30 jours apres rotation :

- [ ] Surveiller dashboard OpenAI : pic anormal de consommation -> alerte.
- [ ] Surveiller dashboard Deepgram : meme chose.
- [ ] Surveiller console Cloudinary : usage / bandwidth.
- [ ] Surveiller logs Supabase : 401/403 inhabituels.

Tout pic suspect -> nouvelle rotation immediate.

## 7. Mesures preventives a venir

| PRP | Mesure |
|---|---|
| 220.02 | Migration de tous les `VITE_OPENAI/DEEPGRAM/CLOUDINARY_API_SECRET` vers endpoints serveur. Aucune cle secrete cote client. |
| 220.03 | Pre-commit hook (Husky) + workflow CI qui scanne et bloque les patterns de secrets. Bundle scan apres `npm run build`. |

## 8. Apprentissages

1. Une regle `!.env.development` dans `.gitignore` est un anti-pattern.
   Toute exception explicite a `.env.*` doit etre revue en code review.
2. `VITE_*` expose au client = jamais de secret. A rendre explicite par
   un linter / hook (PRP-220.03).
3. Une rotation est plus rapide que la reecriture d'historique. Toujours
   commencer par la rotation.
