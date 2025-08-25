# Guide de Déploiement - Smart Pantry Pro

## Vue d'ensemble

Ce guide détaille le processus complet de déploiement de Smart Pantry Pro, de l'environnement de développement local jusqu'à la production.

## Prérequis

### Outils requis
- Node.js 18.17+ et npm 9+
- Git 2.34+
- Vercel CLI (`npm i -g vercel@latest`)
- Supabase CLI (`npm i -g supabase@latest`)
- TypeScript 5.5+ (global ou local)

### Comptes requis
- GitHub (pour le code source et CI/CD)
- Vercel (pour l'hébergement et Edge Functions)
- Supabase (pour la base de données et auth)
- OpenAI API (pour l'assistant IA et extraction de recettes)
- Optionnel : Barcode Spider API, UPC Database API (pour les fallbacks scanner)

## Architecture de déploiement

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub Repository                    │
│                  (main, develop, feature/*)              │
└────────────────────────┬───────────────────────────────┘
                         │ Push/PR
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    GitHub Actions                        │
│              (CI/CD, Tests, Linting)                    │
└────────────────────────┬───────────────────────────────┘
                         │ Deploy
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      Vercel                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Production  │  │   Preview    │  │ Development  │  │
│  │   (main)    │  │    (PRs)     │  │  (develop)   │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                     Supabase                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Production  │  │   Staging    │  │    Local     │  │
│  │  Database   │  │   Database   │  │  Database    │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 1. Configuration locale

### 1.1 Cloner le repository

```bash
git clone https://github.com/your-org/smart-pantry-pro.git
cd smart-pantry-pro
```

### 1.2 Installer les dépendances

```bash
npm install
```

### 1.3 Configuration des variables d'environnement

Créer un fichier `.env.local`:

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# APIs de fallback (optionnelles)
BARCODE_SPIDER_API_KEY=your_barcode_spider_key
UPC_DATABASE_API_KEY=your_upc_database_key

# Application
VITE_APP_URL=http://localhost:5173
NODE_ENV=development

# Features flags (optionelles)
VITE_ENABLE_VOICE_RECOGNITION=true
VITE_ENABLE_ADVANCED_SCANNER=true
VITE_ENABLE_REALTIME_SHOPPING=true
```

### 1.4 Base de données locale

```bash
# Démarrer Supabase local
supabase start

# Appliquer les migrations
supabase db push

# Seeder les données de test (optionnel)
npm run db:seed
```

### 1.5 Démarrer le développement

```bash
# Développement complet (frontend + API)
npm run dev

# Ou démarrage séparé
npm run dev:client  # Frontend seulement
npm run api:server  # API seulement

# Tests (optionnel)
npm test

# Linting et vérification TypeScript
npm run lint
npm run type-check
```

## 2. Configuration Supabase

### 2.1 Créer un projet Supabase

1. Aller sur [app.supabase.com](https://app.supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et les clés API

### 2.2 Configuration de la base de données

```sql
-- Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Appliquer les migrations
supabase db push --db-url postgresql://postgres:[password]@[host]:5432/postgres
```

### 2.3 Configuration du stockage

```sql
-- Créer les buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('recipes', 'recipes', true),
  ('products', 'products', true),
  ('avatars', 'avatars', true);
```

### 2.4 Row Level Security (RLS)

```sql
-- Exemple de politique pour les recettes
CREATE POLICY "Les utilisateurs peuvent voir leurs recettes"
ON recipes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer des recettes"
ON recipes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

### 2.5 Edge Functions

```bash
# Déployer les Edge Functions
supabase functions deploy ai-assistant-enhanced
supabase functions deploy cleanup-shopping-list
supabase functions deploy indian-price-estimator
supabase functions deploy recipe-assistant

# Vérifier le déploiement
supabase functions list
```

## 3. Configuration Vercel

### 3.1 Connecter le repository

```bash
# Se connecter à Vercel
vercel login

# Lier le projet
vercel link

# Configurer le projet
vercel env pull
```

### 3.2 Variables d'environnement

Dans le dashboard Vercel, ajouter:

```
# Variables Vercel Production
VITE_SUPABASE_URL=[Production URL]
VITE_SUPABASE_ANON_KEY=[Production Anon Key]
SUPABASE_SERVICE_ROLE_KEY=[Service Role Key]
OPENAI_API_KEY=[Your OpenAI Key]

# APIs optionnelles
BARCODE_SPIDER_API_KEY=[Barcode Spider Key]
UPC_DATABASE_API_KEY=[UPC Database Key]

# Features flags
VITE_ENABLE_VOICE_RECOGNITION=true
VITE_ENABLE_ADVANCED_SCANNER=true
VITE_ENABLE_REALTIME_SHOPPING=true

# App configuration
VITE_APP_URL=https://smartpantrypro.com
NODE_ENV=production
```

### 3.3 Configuration du build

`vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "framework": "vite",
  "functions": {
    "api/*.js": {
      "maxDuration": 30
    },
    "pages/api/*.ts": {
      "maxDuration": 60
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "origin-when-cross-origin" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/ai-assistant/(.*)",
      "destination": "/pages/api/ai-assistant-enhanced"
    }
  ]
}
```

## 4. Pipeline CI/CD

### 4.1 GitHub Actions

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Type check
        run: npm run type-check
        
      - name: Lint
        run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        run: |
          npm i -g vercel
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### 4.2 Preview deployments

Pour chaque PR:
```yaml
name: Preview Deployment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 5. Processus de déploiement

### 5.1 Développement → Staging

```bash
# Créer une branche feature
git checkout -b feature/new-feature

# Développer et commiter
git add .
git commit -m "feat: add new feature"

# Pousser et créer une PR
git push origin feature/new-feature
```

### 5.2 Staging → Production

```bash
# Merger dans main via GitHub PR
# Le déploiement se fait automatiquement

# Ou déploiement manuel
vercel --prod
```

### 5.3 Rollback

```bash
# Via Vercel Dashboard ou CLI
vercel rollback [deployment-url]

# Ou via Git
git revert [commit-hash]
git push origin main
```

## 6. Monitoring post-déploiement

### 6.1 Vérifications essentielles

```bash
# Health check
curl https://smartpantrypro.com/api/health

# Test d'extraction de recette
curl -X POST https://smartpantrypro.com/api/extract-recipe \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/recipe"}'
```

### 6.2 Monitoring continu

- **Vercel Analytics**: Performance et usage
- **Supabase Dashboard**: Métriques DB
- **Sentry** (optionnel): Error tracking
- **UptimeRobot**: Monitoring uptime

### 6.3 Alertes

Configuration des alertes pour:
- Erreurs 5xx > 1% du trafic
- Temps de réponse > 3s
- Utilisation DB > 80%
- Échecs de build

## 7. Optimisations de production

### 7.1 Performance

```javascript
// vite.config.ts optimisations
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-*'],
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
}
```

### 7.2 Caching

```javascript
// Headers de cache Vercel
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 7.3 Sécurité

```javascript
// Headers de sécurité
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

## 8. Troubleshooting

### Erreurs communes

#### Build failures
```bash
# Nettoyer le cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Database connection issues
```bash
# Vérifier la connexion
npx supabase db remote list
npx supabase db remote set [connection-string]
```

#### API timeouts
- Augmenter `maxDuration` dans vercel.json
- Optimiser les requêtes longues
- Implémenter du caching

### Logs et debugging

```bash
# Logs Vercel
vercel logs [deployment-url]

# Logs Supabase
supabase logs --tail
```

## 9. Checklist de déploiement

### Avant le déploiement

- [ ] Tests passent localement
- [ ] Linting sans erreurs
- [ ] Build de production réussi
- [ ] Variables d'environnement configurées
- [ ] Migrations DB appliquées
- [ ] Documentation à jour

### Après le déploiement

- [ ] Health check API OK
- [ ] Test des fonctionnalités critiques
- [ ] Monitoring actif
- [ ] Alertes configurées
- [ ] Backup DB vérifié
- [ ] Communication équipe

## 10. Contacts et support

### Urgences
- **Hotline DevOps**: +33 X XX XX XX XX
- **Email urgence**: urgent@smartpantrypro.com

### Support
- **Slack**: #smart-pantry-deploy
- **Documentation**: docs.smartpantrypro.com
- **Status page**: status.smartpantrypro.com