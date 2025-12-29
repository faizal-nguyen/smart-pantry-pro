# Guide de Déploiement Vercel - Smart Pantry Pro

## 📋 Vue d'ensemble

Ce guide explique comment déployer Smart Pantry Pro sur Vercel avec 3 environnements distincts (Development, Staging, Production).

## 🏗️ Architecture Multi-Environnements

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Development   │     │     Staging     │     │   Production    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ Branche: develop│     │ Branche: staging│     │  Branche: main  │
│ Auto-deploy: ✅ │     │ Auto-deploy: ✅ │     │ Manual review: ✅│
│ URL: *-dev.vercel│     │ URL: *-stg.vercel│     │ URL: production │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ↓                       ↓                         ↓
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Supabase Dev   │     │ Supabase Staging│     │  Supabase Prod  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 🚀 Configuration Initiale

### Étape 1: Prérequis

1. Compte Vercel (https://vercel.com)
2. Vercel CLI installé: `npm i -g vercel`
3. 3 projets Supabase (dev, staging, prod)

### Étape 2: Créer les Projets Vercel

#### A. Projet Development

```bash
# 1. Se connecter à Vercel
vercel login

# 2. Créer le projet dev
cd smart-pantry-pro
vercel --name smart-pantry-dev --prod=false

# 3. Lier à la branche develop
vercel link --project smart-pantry-dev
```

**Configuration dans Vercel Dashboard:**

1. Aller sur https://vercel.com/dashboard
2. Sélectionner `smart-pantry-dev`
3. Settings → Git → Branch Configuration:
   - Production Branch: `develop`
   - Deploy Previews: Enabled
4. Settings → Environment Variables:
   ```
   VITE_ENV=development
   VITE_SUPABASE_URL=https://your-dev-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-dev-anon-key
   VITE_OPENAI_API_KEY=sk-dev-key (optional)
   VITE_DEEPGRAM_API_KEY=dev-key (optional)
   VITE_CLOUDINARY_CLOUD_NAME=dev-cloudinary (optional)
   VITE_CLOUDINARY_API_KEY=dev-cloudinary-key (optional)
   ```
   ⚠️ Scope: Production + Preview

#### B. Projet Staging

```bash
# Créer le projet staging
vercel --name smart-pantry-staging --prod=false
vercel link --project smart-pantry-staging
```

**Configuration dans Vercel Dashboard:**

1. Sélectionner `smart-pantry-staging`
2. Settings → Git → Branch Configuration:
   - Production Branch: `staging`
3. Settings → Environment Variables:
   ```
   VITE_ENV=staging
   VITE_SUPABASE_URL=https://your-staging-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-staging-anon-key
   ```
   ⚠️ Utiliser des credentials staging différents

#### C. Projet Production

```bash
# Créer le projet prod
vercel --name smart-pantry-pro --prod
vercel link --project smart-pantry-pro
```

**Configuration dans Vercel Dashboard:**

1. Sélectionner `smart-pantry-pro`
2. Settings → Git → Branch Configuration:
   - Production Branch: `main`
   - Deploy Previews: Disabled (sécurité)
3. Settings → Environment Variables:
   ```
   VITE_ENV=production
   VITE_SUPABASE_URL=https://your-prod-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-prod-anon-key
   ```
   ⚠️ Credentials production avec RLS strict

### Étape 3: Configuration Build

Chaque projet utilise son propre fichier de configuration:

- Development: `vercel.dev.json`
- Staging: `vercel.staging.json`
- Production: `vercel.production.json`

**Pour utiliser ces configurations:**

```bash
# Development
vercel --config vercel.dev.json

# Staging
vercel --config vercel.staging.json

# Production
vercel --config vercel.production.json
```

## 🔐 Sécurité des Variables d'Environnement

### ⚠️ RÈGLES CRITIQUES

1. **JAMAIS** committer les fichiers `.env.local` ou `.env.*.local`
2. **TOUJOURS** utiliser des credentials différents par environnement
3. **TOUJOURS** activer RLS sur Supabase
4. **TOUJOURS** utiliser des clés API avec rate limiting

### Validation des Secrets

Vercel valide automatiquement les variables au build:

```typescript
// src/config/client.ts vérifie au runtime:
- ✅ Variables requises présentes
- ✅ Format URL valide pour Supabase
- ✅ Longueur minimale pour les clés
- ❌ Erreur explicite si invalide
```

## 📊 Workflow de Déploiement

### Development

```bash
# 1. Développer sur branche develop
git checkout develop
git pull origin develop

# 2. Faire vos changements
# ... modifications ...

# 3. Commit et push
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin develop

# ✅ Auto-deploy sur smart-pantry-dev
```

### Staging

```bash
# 1. Merger develop dans staging
git checkout staging
git pull origin staging
git merge develop

# 2. Tests de validation
npm run test
npm run build:staging

# 3. Push vers staging
git push origin staging

# ✅ Auto-deploy sur smart-pantry-staging
```

### Production

```bash
# 1. Merger staging dans main
git checkout main
git pull origin main
git merge staging

# 2. Tests complets
npm run test
npm run build:production

# 3. Tag de version
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin main --tags

# ✅ Deploy production (avec review)
```

## 🧪 Tests Avant Déploiement

### Checklist Pré-Déploiement

```bash
# 1. Build local
npm run build:production

# 2. Tests
npm run test

# 3. Vérification bundle size
npm run analyze

# 4. Scan sécurité
npm audit --production

# 5. Vérification variables
node scripts/check-env.js
```

## 🔍 Debugging

### Erreurs Courantes

#### 1. "Missing environment variables"

```bash
# Vérifier les variables dans Vercel Dashboard
# Settings → Environment Variables
# S'assurer que toutes les variables VITE_* sont définies
```

#### 2. "Supabase connection failed"

```bash
# Vérifier l'URL Supabase
echo $VITE_SUPABASE_URL

# Tester la connexion
curl https://your-project.supabase.co/rest/v1/
```

#### 3. "Build failed"

```bash
# Vérifier les logs dans Vercel Dashboard
# Deployments → [votre deploy] → Build Logs

# Reproduire localement:
npm run build:production
```

### Logs Vercel

```bash
# CLI
vercel logs smart-pantry-dev
vercel logs smart-pantry-staging
vercel logs smart-pantry-pro

# Dashboard
https://vercel.com/your-username/smart-pantry-dev/logs
```

## 📱 Domaines Personnalisés

### Configuration Domaine Production

1. Vercel Dashboard → smart-pantry-pro → Settings → Domains
2. Ajouter votre domaine: `smartpantrypro.com`
3. Configurer DNS selon instructions Vercel
4. Activer HTTPS automatique (Let's Encrypt)

### Sous-domaines

```
smartpantrypro.com        → Production (main)
staging.smartpantrypro.com → Staging
dev.smartpantrypro.com     → Development
```

## 🔄 Rollback

### Retour à une version précédente

```bash
# Via Vercel Dashboard
# 1. Deployments → [version précédente]
# 2. Click "..." → Promote to Production

# Via CLI
vercel rollback
```

## 📈 Monitoring

### Métriques Vercel

- **Analytics**: Vercel Dashboard → Analytics
- **Real-time logs**: `vercel logs --follow`
- **Performance**: Lighthouse intégré

### Alertes

Configurer dans Vercel Dashboard → Settings → Integrations:
- Slack pour notifications deploy
- Sentry pour erreurs runtime
- LogRocket pour monitoring utilisateur

## ✅ Checklist Déploiement Production

- [ ] Tests passent à 100%
- [ ] Build production réussit localement
- [ ] Variables d'environnement configurées dans Vercel
- [ ] RLS Supabase activé et testé
- [ ] Domaine personnalisé configuré
- [ ] HTTPS activé
- [ ] Monitoring configuré
- [ ] Backup database effectué
- [ ] Documentation à jour
- [ ] Équipe notifiée

## 🆘 Support

- Vercel Docs: https://vercel.com/docs
- Smart Pantry Issues: https://github.com/your-repo/issues
- Vercel Support: https://vercel.com/support

---

**Dernière mise à jour**: 2025-10-03
**Version**: 1.0.0
