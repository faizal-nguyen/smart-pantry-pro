# Guide de Configuration des Environnements - Smart Pantry Pro

## 📋 Vue d'ensemble

Ce guide explique comment configurer les environnements de développement, staging et production pour Smart Pantry Pro.

## 🎯 Architecture Multi-Environnements

Smart Pantry Pro utilise 3 environnements distincts:

```
Development  → .env.development  → localhost:3002
Staging      → .env.staging      → staging.vercel.app
Production   → .env.production   → smartpantrypro.com
```

Chaque environnement a:
- ✅ Base de données Supabase séparée
- ✅ Credentials API distincts
- ✅ Configuration adaptée (cache, rate limits, etc.)

## 🚀 Configuration Rapide (Development)

### Étape 1: Cloner le projet

```bash
git clone https://github.com/your-org/smart-pantry-pro.git
cd smart-pantry-pro
```

### Étape 2: Installer les dépendances

```bash
npm install
```

### Étape 3: Configurer l'environnement

Le projet inclut `.env.development` pré-configuré pour le développement local. Vérifiez les valeurs:

```bash
cat .env.development
```

**Variables critiques à vérifier:**
- `VITE_SUPABASE_URL`: URL de votre projet Supabase
- `VITE_SUPABASE_ANON_KEY`: Clé anonyme Supabase
- `VITE_ENV=development`

### Étape 4: Démarrer le serveur

```bash
npm run dev
```

L'application sera disponible sur http://localhost:3002

## 🔧 Configuration Détaillée

### Variables d'Environnement Requises

#### Supabase (OBLIGATOIRE)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Comment obtenir ces valeurs:**

1. Créer un compte sur https://supabase.com
2. Créer un nouveau projet
3. Aller dans Settings → API
4. Copier:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_ANON_KEY`

#### OpenAI (OPTIONNEL - Features IA)

```bash
VITE_OPENAI_API_KEY=sk-proj-...
```

**Features activées:**
- 🤖 Suggestions de recettes intelligentes
- 📝 Parsing de recettes depuis texte
- 🎯 Recommandations nutritionnelles

**Comment obtenir:**
1. Créer un compte sur https://platform.openai.com
2. Générer une API key
3. Copier dans `.env.development`

#### Deepgram (OPTIONNEL - Reconnaissance vocale)

```bash
VITE_DEEPGRAM_API_KEY=...
```

**Features activées:**
- 🎤 Ajout d'ingrédients par voix
- 🗣️ Dictée de recettes

#### Cloudinary (OPTIONNEL - Upload d'images)

```bash
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_API_KEY=123456789
```

**Features activées:**
- 📸 Upload photos de plats
- 🖼️ Galerie d'images recettes

## 🌍 Environnements

### Development (Local)

**Fichier:** `.env.development`

```bash
VITE_ENV=development
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=dev-anon-key

# Features optionnelles
VITE_OPENAI_API_KEY=sk-dev-key
VITE_DEEPGRAM_API_KEY=dev-key
```

**Caractéristiques:**
- ✅ Hot reload activé
- ✅ Console logs verbeux
- ✅ Source maps
- ✅ Cache désactivé
- ✅ Mock data disponible

**Démarrage:**
```bash
npm run dev
# ou
npm run dev:vite
```

### Staging (Pre-production)

**Fichier:** `.env.staging`

```bash
VITE_ENV=staging
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=staging-anon-key
```

**Caractéristiques:**
- ✅ Données de test isolées
- ✅ Rate limits réduits
- ✅ Monitoring activé
- ⚠️ Pas de mock data

**Déploiement:**
```bash
git push origin staging
# Auto-deploy sur Vercel
```

### Production

**Fichier:** `.env.production`

```bash
VITE_ENV=production
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod-anon-key
```

**Caractéristiques:**
- ✅ Optimisations maximales
- ✅ Rate limits production
- ✅ Monitoring complet
- ✅ Analytics activées
- ❌ Console logs désactivés

**Déploiement:**
```bash
git push origin main
# Deploy avec review manuel
```

## 🔒 Sécurité

### ⚠️ Règles Critiques

1. **JAMAIS** committer `.env.local` ou `.env.*.local`
2. **TOUJOURS** utiliser des credentials différents par environnement
3. **TOUJOURS** activer RLS sur Supabase
4. **TOUJOURS** utiliser HTTPS en production

### Fichiers .env à Committer

✅ **À committer** (templates sans secrets):
- `.env.example`
- `.env.development` (avec secrets de dev uniquement)
- `.env.staging` (avec placeholders)
- `.env.production` (avec placeholders)

❌ **À NE JAMAIS committer**:
- `.env.local`
- `.env.*.local`
- Tout fichier contenant des secrets production

### Validation des Secrets

Le projet valide automatiquement les variables d'environnement au démarrage:

```typescript
// src/config/client.ts
if (!env.VITE_SUPABASE_URL) {
  throw new Error('❌ VITE_SUPABASE_URL is required');
}
```

**Si erreur:**
1. Vérifier que le fichier `.env.development` existe
2. Vérifier que les variables sont définies
3. Redémarrer le serveur de dev

## 🧪 Tests

### Tester la Configuration

```bash
# 1. Vérifier les variables
npm run dev
# Regarder les logs de démarrage

# 2. Build de test
npm run build:dev

# 3. Tests automatisés
npm test
```

### Erreurs Courantes

#### "Missing Supabase environment variables"

**Solution:**
```bash
# Vérifier que .env.development existe
ls -la .env.development

# Vérifier le contenu
cat .env.development

# Si manquant, copier depuis example
cp .env.example .env.development
# Puis éditer avec vos valeurs
```

#### "Failed to connect to Supabase"

**Solution:**
1. Vérifier l'URL Supabase (format: `https://xxx.supabase.co`)
2. Vérifier que le projet Supabase est actif
3. Tester la connexion: `curl $VITE_SUPABASE_URL/rest/v1/`

#### "OpenAI API error"

**Solution:**
- L'API OpenAI est optionnelle
- Les features IA seront désactivées automatiquement
- Pour activer: ajouter `VITE_OPENAI_API_KEY` dans `.env.development`

## 📚 Ressources

### Documentation Externe

- [Supabase Quick Start](https://supabase.com/docs/guides/getting-started)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

### Documentation Interne

- [Déploiement Vercel](./VERCEL-DEPLOYMENT.md)
- [Checklist RLS](./SECURITY-RLS-CHECKLIST.md)
- [Architecture](../README.md)

## 🆘 Aide

### Support

- 📧 Email: support@smartpantrypro.com
- 💬 Discord: https://discord.gg/smartpantry
- 🐛 Issues: https://github.com/your-org/smart-pantry-pro/issues

### FAQ

**Q: Puis-je utiliser la même base Supabase pour dev et staging?**
R: ❌ Non recommandé. Utilisez des projets séparés pour éviter les conflits de données.

**Q: Les clés API sont-elles exposées côté client?**
R: ⚠️ Les variables `VITE_*` sont exposées. N'y mettez JAMAIS de secrets sensibles (service_role, etc). Utilisez des clés anon avec RLS.

**Q: Comment changer d'environnement?**
R: Utiliser les scripts npm: `npm run dev` (development), `npm run build:staging` (staging), `npm run build:production` (production)

---

**Dernière mise à jour**: 2025-10-03
**Version**: 1.0.0
