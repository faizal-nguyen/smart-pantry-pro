# PRP-CODE-REVIEW-001 : Refactoring Architectural - Actions Jour 1

## 📋 Métadonnées

- **Référence:** PRP-CODE-REVIEW-001
- **Titre:** Plan de Refactoring Post Code Review - Jour 1
- **Date de création:** 2025-10-03
- **Auteur:** Panel d'experts internationaux (Google, Meta, Amazon, Microsoft, Netflix, Shopify, Stripe, Alibaba, Airbnb, MongoDB)
- **Priorité:** CRITIQUE
- **Statut:** À DÉMARRER
- **Sprint:** Q4 2025 - Sprints 1-3
- **Estimation totale:** 12-18 jours de travail
- **Dépendances:** Aucune
- **Impact:** Architecture, Sécurité, Performance, Scalabilité

---

## 🎯 Contexte et Objectifs

### Contexte

Suite au séminaire de code review world-class (Jour 1 - Architecture & Structure), 10 experts internationaux ont identifié des problèmes architecturaux critiques dans Smart Pantry Pro qui compromettent la sécurité, la performance et la capacité à déployer en production.

**Score actuel:** 6.2/10
**Score cible après actions:** 8.5/10
**Confiance production actuelle:** 4/10
**Confiance production cible:** 8/10

### Objectifs du PRP

Ce PRP détaille les 5 actions immédiates prioritaires identifiées lors du Jour 1, avec un plan d'implémentation concret, des critères de succès mesurables, et une roadmap d'exécution.

**Objectifs principaux:**

1. ✅ Sécuriser l'application (secrets, accès DB, multi-environnement)
2. ✅ Nettoyer l'architecture des dépendances (séparation client/server)
3. ✅ Renforcer la sécurité de type TypeScript (configuration stricte)
4. ✅ Créer une architecture API backend robuste
5. ✅ Améliorer la developer experience (organisation projet)

---

## 📊 Actions Prioritaires

### Vue d'ensemble

| # | Action | Priorité | Durée | Impact | Complexité | Responsable |
|---|--------|----------|-------|--------|------------|-------------|
| 1 | Sécurisation Critique | CRITICAL | 2-3j | Très élevé | Moyenne | DevOps + Backend Lead |
| 2 | Nettoyage Dépendances | CRITICAL | 1-2j | Élevé | Faible | Frontend Lead + Architect |
| 3 | TypeScript Strict | CRITICAL | 2-3j | Élevé | Moyenne | TypeScript Lead + Équipe |
| 4 | API Backend Intermédiaire | HIGH | 3-5j | Très élevé | Élevée | Backend Lead + API Architect |
| 5 | Réorganisation Projet | MEDIUM | 1-2j | Moyen | Faible | Tech Lead + Équipe |

**Durée totale estimée:** 9-15 jours (12-18 jours avec tests et validation)

---

## 🔐 ACTION #1 - Sécurisation Critique

### Priorité: CRITICAL ⚠️

**Durée estimée:** 2-3 jours
**Responsables:** DevOps Lead + Backend Lead
**Impact:** Très élevé (Sécurité, Multi-environnement, Production-ready)
**Complexité:** Moyenne

### Problèmes identifiés

❌ **Secrets hardcodés dans le code source**
- URL et clé Supabase dans `src/integrations/supabase/client.ts`
- Risque d'exposition des credentials sur GitHub
- Impossible de gérer plusieurs environnements

❌ **Absence de gestion multi-environnement**
- Un seul `.env.local` pour tous les environnements
- Pas de distinction dev/staging/prod
- Configuration Vercel non documentée

❌ **Sécurité Row Level Security (RLS) non auditée**
- Toute la sécurité repose sur RLS Supabase
- Aucune validation côté serveur
- Risque de failles de sécurité majeures

### Plan d'implémentation détaillé

#### Étape 1.1 - Externaliser les secrets (½ jour)

**Fichiers à modifier:**

1. **`src/integrations/supabase/client.ts`**

   ```typescript
   // ❌ AVANT (hardcodé)
   const supabaseUrl = 'https://abcdefgh.supabase.co';
   const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

   // ✅ APRÈS (variables d'environnement)
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error(
       'Missing Supabase environment variables. ' +
       'Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.'
     );
   }
   ```

2. **Créer `src/config/client.ts`**

   ```typescript
   import { z } from 'zod';

   const envSchema = z.object({
     VITE_SUPABASE_URL: z.string().url(),
     VITE_SUPABASE_ANON_KEY: z.string().min(1),
     VITE_OPENAI_API_KEY: z.string().optional(),
     VITE_DEEPGRAM_API_KEY: z.string().optional(),
     VITE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
   });

   export const env = envSchema.parse({
     VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
     VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
     VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
     VITE_DEEPGRAM_API_KEY: import.meta.env.VITE_DEEPGRAM_API_KEY,
     VITE_ENV: import.meta.env.VITE_ENV,
   });

   export const config = {
     supabase: {
       url: env.VITE_SUPABASE_URL,
       anonKey: env.VITE_SUPABASE_ANON_KEY,
     },
     openai: {
       apiKey: env.VITE_OPENAI_API_KEY,
     },
     deepgram: {
       apiKey: env.VITE_DEEPGRAM_API_KEY,
     },
     environment: env.VITE_ENV,
     isDevelopment: env.VITE_ENV === 'development',
     isStaging: env.VITE_ENV === 'staging',
     isProduction: env.VITE_ENV === 'production',
   } as const;
   ```

#### Étape 1.2 - Créer les fichiers d'environnement (½ jour)

**Fichiers à créer:**

1. **`.env.development`**
   ```bash
   # Development Environment
   VITE_ENV=development
   VITE_SUPABASE_URL=https://dev-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-dev-anon-key
   VITE_OPENAI_API_KEY=sk-dev-key
   VITE_DEEPGRAM_API_KEY=dev-key
   ```

2. **`.env.staging`**
   ```bash
   # Staging Environment
   VITE_ENV=staging
   VITE_SUPABASE_URL=https://staging-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-staging-anon-key
   VITE_OPENAI_API_KEY=sk-staging-key
   VITE_DEEPGRAM_API_KEY=staging-key
   ```

3. **`.env.production`**
   ```bash
   # Production Environment
   VITE_ENV=production
   VITE_SUPABASE_URL=https://prod-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-prod-anon-key
   VITE_OPENAI_API_KEY=sk-prod-key
   VITE_DEEPGRAM_API_KEY=prod-key
   ```

4. **Mettre à jour `.env.example`**
   ```bash
   # Smart Pantry Pro - Environment Variables Template

   # Environment (development | staging | production)
   VITE_ENV=development

   # Supabase Configuration (REQUIRED)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here

   # OpenAI API (OPTIONAL - for AI features)
   VITE_OPENAI_API_KEY=sk-your-openai-key

   # Deepgram API (OPTIONAL - for voice features)
   VITE_DEEPGRAM_API_KEY=your-deepgram-key

   # Google Cloud (OPTIONAL - for vision features)
   VITE_GOOGLE_CLOUD_API_KEY=your-google-cloud-key

   # Cloudinary (OPTIONAL - for image upload)
   VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
   VITE_CLOUDINARY_API_KEY=your-cloudinary-key
   ```

5. **Mettre à jour `.gitignore`**
   ```gitignore
   # Environment files
   .env
   .env.local
   .env.development.local
   .env.staging.local
   .env.production.local
   .env.*.local

   # Keep only the examples
   !.env.example
   !.env.development
   !.env.staging
   !.env.production
   ```

#### Étape 1.3 - Configuration Vercel (½ jour)

**Actions dans Vercel Dashboard:**

1. **Créer 3 projets Vercel:**
   - `smart-pantry-dev` (branche: `develop`)
   - `smart-pantry-staging` (branche: `staging`)
   - `smart-pantry-prod` (branche: `main`)

2. **Configurer les Environment Variables pour chaque projet:**

   Variables communes à tous:
   ```
   VITE_ENV = [development|staging|production]
   VITE_SUPABASE_URL = [URL spécifique à l'environnement]
   VITE_SUPABASE_ANON_KEY = [Clé spécifique à l'environnement]
   ```

3. **Créer `vercel.json` pour chaque environnement:**

   **`vercel.dev.json`**
   ```json
   {
     "version": 2,
     "env": {
       "VITE_ENV": "development"
     },
     "build": {
       "env": {
         "VITE_ENV": "development"
       }
     },
     "functions": {
       "apps/api/src/index.ts": {
         "maxDuration": 30
       }
     }
   }
   ```

#### Étape 1.4 - Audit et sécurisation RLS (1 jour)

**Créer un script d'audit:**

1. **`scripts/audit-rls.sql`**
   ```sql
   -- Audit de toutes les policies RLS
   SELECT
     schemaname,
     tablename,
     policyname,
     permissive,
     roles,
     cmd,
     qual,
     with_check
   FROM pg_policies
   WHERE schemaname = 'public'
   ORDER BY tablename, policyname;

   -- Vérifier les tables sans RLS activé
   SELECT
     schemaname,
     tablename,
     rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
     AND rowsecurity = false;
   ```

2. **Créer un checklist de sécurité RLS:**

   **`docs/SECURITY-RLS-CHECKLIST.md`**
   ```markdown
   # Checklist Sécurité Row Level Security (RLS)

   ## Tables Critiques

   ### ✅ users
   - [ ] RLS activé
   - [ ] Policy SELECT: Utilisateur ne peut voir que son profil
   - [ ] Policy UPDATE: Utilisateur ne peut modifier que son profil
   - [ ] Policy DELETE: Désactivé (soft delete uniquement)

   ### ✅ inventory
   - [ ] RLS activé
   - [ ] Policy SELECT: user_id = auth.uid()
   - [ ] Policy INSERT: user_id = auth.uid()
   - [ ] Policy UPDATE: user_id = auth.uid()
   - [ ] Policy DELETE: user_id = auth.uid()

   ### ✅ recipes
   - [ ] RLS activé
   - [ ] Policy SELECT: is_public = true OR user_id = auth.uid()
   - [ ] Policy INSERT: user_id = auth.uid()
   - [ ] Policy UPDATE: user_id = auth.uid()
   - [ ] Policy DELETE: user_id = auth.uid()

   ### ✅ shopping_lists
   - [ ] RLS activé
   - [ ] Policy SELECT: user_id = auth.uid() OR shared_with @> ARRAY[auth.uid()]
   - [ ] Policy INSERT: user_id = auth.uid()
   - [ ] Policy UPDATE: user_id = auth.uid()
   - [ ] Policy DELETE: user_id = auth.uid()

   ## Tests de Sécurité

   - [ ] Test: Utilisateur A ne peut pas accéder aux données de B
   - [ ] Test: Utilisateur anonyme ne peut rien lire
   - [ ] Test: Injection SQL impossible via RLS
   - [ ] Test: Bypass RLS impossible via service_role
   ```

3. **Appliquer les corrections RLS nécessaires**

#### Étape 1.5 - Scripts de développement (½ jour)

**Créer `scripts/setup-env.js`**

```javascript
#!/usr/bin/env node

import { input, select, confirm } from '@inquirer/prompts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupEnvironment() {
  console.log('🚀 Smart Pantry Pro - Environment Setup\n');

  // Sélection de l'environnement
  const environment = await select({
    message: 'Quel environnement voulez-vous configurer?',
    choices: [
      { name: 'Development (local)', value: 'development' },
      { name: 'Staging', value: 'staging' },
      { name: 'Production', value: 'production' },
    ],
  });

  // Supabase
  console.log('\n📦 Configuration Supabase');
  const supabaseUrl = await input({
    message: 'URL Supabase:',
    default: 'https://your-project.supabase.co',
    validate: (value) => value.startsWith('https://') || 'URL invalide',
  });

  const supabaseKey = await input({
    message: 'Clé anonyme Supabase:',
    validate: (value) => value.length > 0 || 'Clé requise',
  });

  // Features optionnelles
  const setupAI = await confirm({
    message: 'Configurer OpenAI (features IA)?',
    default: false,
  });

  let openaiKey = '';
  if (setupAI) {
    openaiKey = await input({
      message: 'Clé API OpenAI:',
      validate: (value) => value.startsWith('sk-') || 'Clé invalide',
    });
  }

  // Générer le fichier .env
  const envContent = `# ${environment.toUpperCase()} Environment
# Generated on ${new Date().toISOString()}

VITE_ENV=${environment}
VITE_SUPABASE_URL=${supabaseUrl}
VITE_SUPABASE_ANON_KEY=${supabaseKey}
${setupAI ? `VITE_OPENAI_API_KEY=${openaiKey}` : '# VITE_OPENAI_API_KEY=sk-your-key'}
`;

  const envFile = `.env.${environment}`;
  fs.writeFileSync(path.join(__dirname, '..', envFile), envContent);

  console.log(`\n✅ Fichier ${envFile} créé avec succès!`);
  console.log('\n📝 Prochaines étapes:');
  console.log(`1. Vérifiez le fichier ${envFile}`);
  console.log('2. Exécutez: npm run dev');
  console.log('3. Visitez: http://localhost:3002\n');
}

setupEnvironment().catch(console.error);
```

**Mettre à jour `package.json`:**

```json
{
  "scripts": {
    "setup": "node scripts/setup-env.js",
    "dev": "vite --mode development",
    "dev:staging": "vite --mode staging",
    "build:staging": "vite build --mode staging",
    "build:production": "vite build --mode production"
  }
}
```

### Critères de succès

✅ **Zéro secret hardcodé dans le code source**
- Grep search: `git grep -E "(supabase\\.co|sk-|eyJhbGciOiJIUzI1NiI)"` retourne 0 résultats dans `src/`

✅ **Multi-environnement fonctionnel**
- `.env.development`, `.env.staging`, `.env.production` créés
- Validation Zod fonctionnelle dans `src/config/client.ts`
- Erreur explicite si variables manquantes

✅ **Configuration Vercel complète**
- 3 projets Vercel configurés avec environment variables
- Déploiements automatiques par branche

✅ **Audit RLS passé**
- Checklist complétée à 100%
- Toutes les tables critiques ont RLS activé
- Tests de sécurité passés

✅ **Script de setup fonctionnel**
- `npm run setup` guide l'utilisateur
- Génération automatique du fichier `.env`

### Tests de validation

```bash
# Test 1: Vérifier absence de secrets
npm run test:secrets

# Test 2: Démarrage avec env invalide
VITE_SUPABASE_URL="" npm run dev  # Devrait échouer avec erreur claire

# Test 3: Build pour chaque environnement
npm run build:staging
npm run build:production

# Test 4: Audit RLS
npm run audit:rls
```

### Documentation à créer

- ✅ `docs/ENVIRONMENT-SETUP.md` - Guide de configuration des environnements
- ✅ `docs/SECURITY-RLS-CHECKLIST.md` - Checklist sécurité RLS
- ✅ `docs/VERCEL-DEPLOYMENT.md` - Guide de déploiement Vercel

---

## 🧹 ACTION #2 - Nettoyage des Dépendances Client/Server

### Priorité: CRITICAL ⚠️

**Durée estimée:** 1-2 jours
**Responsables:** Frontend Lead + Architect
**Impact:** Élevé (Performance, Bundle size, Sécurité)
**Complexité:** Faible

### Problèmes identifiés

❌ **Modules Node.js server-only dans les dépendances client**
- `puppeteer` (300MB+) - Browser automation, ne devrait JAMAIS être côté client
- `googleapis` - Google APIs server-only
- `google-cloud-vision` - Vision API server-only
- `@google-cloud/*` - Toutes les libs Google Cloud server-only

❌ **Dépendances ultra-lourdes côté client**
- `@ffmpeg/ffmpeg` (27MB core) - Processing vidéo, devrait être lazy-loaded ou server-side
- `tesseract.js` (2MB+) - OCR, devrait être lazy-loaded
- `three.js` (600KB) - 3D graphics, usage à vérifier

❌ **Configuration Vite en mode "pansement"**
- `external` explicite pour exclure modules Node.js
- Indique un problème architectural fondamental

### Plan d'implémentation détaillé

#### Étape 2.1 - Audit des dépendances (½ jour)

**Installer les outils d'audit:**

```bash
npm install -D depcheck webpack-bundle-analyzer rollup-plugin-visualizer
```

**Créer `scripts/audit-dependencies.js`:**

```javascript
#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔍 Audit des dépendances...\n');

// 1. Dépendances non utilisées
console.log('1️⃣ Recherche des dépendances non utilisées...');
try {
  execSync('npx depcheck --ignores="@types/*,eslint-*,prettier,husky"', {
    stdio: 'inherit',
  });
} catch (error) {
  console.log('✅ Audit depcheck terminé\n');
}

// 2. Analyse de la taille du bundle
console.log('2️⃣ Analyse de la taille du bundle...');
execSync('npm run build -- --mode development', { stdio: 'inherit' });
execSync('npx vite-bundle-visualizer', { stdio: 'inherit' });

// 3. Liste des dépendances lourdes
console.log('\n3️⃣ Top 10 des dépendances les plus lourdes:');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const deps = { ...packageJson.dependencies };

// Calculer la taille de chaque dépendance
const sizes = Object.keys(deps).map(dep => {
  try {
    const size = execSync(`du -sh node_modules/${dep}`, {
      encoding: 'utf-8',
    }).split('\t')[0];
    return { dep, size };
  } catch {
    return { dep, size: 'N/A' };
  }
});

sizes
  .sort((a, b) => {
    const aNum = parseFloat(a.size);
    const bNum = parseFloat(b.size);
    return bNum - aNum;
  })
  .slice(0, 10)
  .forEach(({ dep, size }) => {
    console.log(`  ${dep}: ${size}`);
  });

console.log('\n✅ Audit terminé. Consultez le rapport dans stats.html');
```

**Exécuter l'audit:**

```bash
npm run audit:deps
```

#### Étape 2.2 - Supprimer les dépendances server-only (½ jour)

**Créer `packages/server-deps/package.json`:**

```json
{
  "name": "@smart/server-deps",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "puppeteer": "^21.0.0",
    "googleapis": "^126.0.0",
    "@google-cloud/vision": "^4.0.0",
    "@google-cloud/speech": "^6.0.0",
    "sharp": "^0.33.0"
  }
}
```

**Supprimer du `package.json` principal:**

```bash
npm uninstall puppeteer googleapis @google-cloud/vision @google-cloud/speech
```

**Créer `apps/api/package.json` pour l'API:**

```json
{
  "name": "@smart/api",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@smart/shared": "workspace:*",
    "@smart/server-deps": "workspace:*",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "pino": "^8.16.0",
    "zod": "^3.22.4"
  }
}
```

#### Étape 2.3 - Lazy loading des dépendances lourdes (½ jour)

**Pour `@ffmpeg/ffmpeg` (si nécessaire côté client):**

**Créer `src/services/video/ffmpeg-loader.ts`:**

```typescript
// Lazy load FFmpeg uniquement quand nécessaire
let ffmpegInstance: any = null;

export async function loadFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  // Dynamic import - ne charge que si utilisé
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');

  ffmpegInstance = new FFmpeg();

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.4/dist/umd';
  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpegInstance;
}

export async function processVideo(file: File): Promise<Blob> {
  // Afficher un loading state pendant le chargement de FFmpeg
  const ffmpeg = await loadFFmpeg();

  // ... traitement vidéo
}
```

**Mettre à jour le composant:**

```typescript
import { Suspense, lazy } from 'react';

// Lazy load le composant de traitement vidéo
const VideoProcessor = lazy(() => import('./VideoProcessor'));

function VideoFeature() {
  return (
    <Suspense fallback={<LoadingSpinner message="Chargement du module vidéo..." />}>
      <VideoProcessor />
    </Suspense>
  );
}
```

**Pour `tesseract.js`:**

**Créer `src/services/ocr/tesseract-loader.ts`:**

```typescript
let tesseractInstance: any = null;

export async function loadTesseract() {
  if (tesseractInstance) return tesseractInstance;

  // Dynamic import
  const Tesseract = await import('tesseract.js');
  tesseractInstance = Tesseract;

  return tesseractInstance;
}

export async function recognizeText(image: File): Promise<string> {
  const Tesseract = await loadTesseract();

  const { data: { text } } = await Tesseract.recognize(image, 'fra', {
    logger: m => console.log(m),
  });

  return text;
}
```

#### Étape 2.4 - Configurer ESLint pour interdire imports server-only (½ jour)

**Mettre à jour `.eslintrc.cjs`:**

```javascript
module.exports = {
  // ... config existante

  rules: {
    // ... rules existantes

    // Interdire les imports server-only côté client
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'puppeteer',
            message: 'Puppeteer est server-only. Utilisez l\'API backend.',
          },
          {
            name: 'googleapis',
            message: 'Google APIs sont server-only. Utilisez l\'API backend.',
          },
          {
            name: '@google-cloud/vision',
            message: 'Google Cloud Vision est server-only. Utilisez l\'API backend.',
          },
          {
            name: 'fs',
            message: 'fs est un module Node.js. Utilisez l\'API File Web.',
          },
          {
            name: 'path',
            message: 'path est un module Node.js. Pas de système de fichiers côté client.',
          },
        ],
        patterns: [
          {
            group: ['@google-cloud/*'],
            message: 'Google Cloud libraries sont server-only. Utilisez l\'API backend.',
          },
        ],
      },
    ],
  },

  overrides: [
    {
      // Autoriser imports Node.js dans l'API backend uniquement
      files: ['apps/api/**/*'],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
```

#### Étape 2.5 - Vérifier et optimiser le bundle (½ jour)

**Créer `scripts/check-bundle-size.js`:**

```javascript
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist', 'assets');

console.log('📦 Analyse de la taille du bundle...\n');

const files = fs.readdirSync(distPath);
const jsFiles = files.filter(f => f.endsWith('.js'));

let totalSize = 0;
const sizes = [];

jsFiles.forEach(file => {
  const filePath = path.join(distPath, file);
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  totalSize += stats.size;

  sizes.push({ file, size: sizeKB });
});

// Trier par taille
sizes.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));

console.log('📄 Fichiers JavaScript (par taille):');
sizes.forEach(({ file, size }) => {
  const emoji = size > 500 ? '🔴' : size > 200 ? '🟡' : '🟢';
  console.log(`  ${emoji} ${file}: ${size} KB`);
});

const totalMB = (totalSize / 1024 / 1024).toFixed(2);
console.log(`\n📊 Taille totale: ${totalMB} MB`);

// Vérifications
const targetSizeKB = 500;
if (totalSize / 1024 > targetSizeKB) {
  console.log(`\n⚠️  ATTENTION: Bundle > ${targetSizeKB}KB (cible: 500KB)`);
  console.log('   Considérez le lazy loading ou le code splitting.');
  process.exit(1);
} else {
  console.log('\n✅ Taille du bundle acceptable!');
}
```

**Ajouter au `package.json`:**

```json
{
  "scripts": {
    "audit:deps": "node scripts/audit-dependencies.js",
    "check:bundle": "npm run build && node scripts/check-bundle-size.js",
    "analyze:bundle": "vite-bundle-visualizer"
  }
}
```

### Critères de succès

✅ **Aucune dépendance server-only côté client**
- `puppeteer`, `googleapis`, `@google-cloud/*` supprimés de `package.json` principal
- Déplacés dans `packages/server-deps/` ou `apps/api/`

✅ **Dépendances lourdes en lazy loading**
- `@ffmpeg/ffmpeg` et `tesseract.js` en dynamic import
- Composants wrappés dans `<Suspense>`

✅ **ESLint empêche les mauvais imports**
- `npm run lint` échoue si import server-only dans `src/`
- Règle `no-restricted-imports` configurée

✅ **Bundle size < 500KB gzipped (initial)**
- `npm run check:bundle` passe
- Rapport bundle analyzer vérifié

✅ **Audit depcheck propre**
- Aucune dépendance inutilisée
- `npm run audit:deps` ne trouve rien à supprimer

### Tests de validation

```bash
# Test 1: Vérifier les imports interdits
npm run lint

# Test 2: Vérifier la taille du bundle
npm run check:bundle

# Test 3: Audit dépendances
npm run audit:deps

# Test 4: Build production
npm run build:production
```

### Documentation à créer

- ✅ `docs/DEPENDENCIES-POLICY.md` - Politique de gestion des dépendances
- ✅ `docs/LAZY-LOADING-GUIDE.md` - Guide du lazy loading

---

## 🔒 ACTION #3 - TypeScript Configuration Stricte

### Priorité: CRITICAL ⚠️

**Durée estimée:** 2-3 jours
**Responsables:** TypeScript Lead + Toute l'équipe dev
**Impact:** Élevé (Qualité du code, Sécurité de type, Maintenabilité)
**Complexité:** Moyenne

### Problèmes identifiés

❌ **Configuration TypeScript dangereusement permissive**
```json
{
  "compilerOptions": {
    "noImplicitAny": false,           // ❌ Permet les any implicites
    "strictNullChecks": false,        // ❌ Pas de vérification null/undefined
    "noUnusedLocals": false,          // ❌ Variables inutilisées ignorées
    "noUnusedParameters": false,      // ❌ Paramètres inutilisés ignorés
    "strict": false                   // ❌ Mode strict désactivé
  }
}
```

**Conséquences:**
- Runtime errors non détectés à la compilation
- Bugs silencieux (null/undefined non gérés)
- Dette technique massive
- Perte des bénéfices de TypeScript

### Plan d'implémentation détaillé

#### Étape 3.1 - Audit de l'état actuel (½ jour)

**Créer `scripts/typescript-audit.sh`:**

```bash
#!/bin/bash

echo "🔍 Audit TypeScript - État actuel"
echo "================================"
echo ""

# Compter les 'any' explicites
echo "1️⃣ Types 'any' explicites:"
any_count=$(git grep -r ": any" src/ | wc -l)
echo "   Occurrences: $any_count"
echo ""

# Compter les 'any' implicites (avec strict: false)
echo "2️⃣ Potentiels 'any' implicites:"
echo "   (Activation de noImplicitAny révélera le nombre exact)"
echo ""

# Compter les variables non utilisées
echo "3️⃣ Variables/imports non utilisés:"
npx tsc --noUnusedLocals --noUnusedParameters --noEmit 2>&1 | grep -c "is declared but"
echo ""

# Générer un rapport détaillé
echo "4️⃣ Génération du rapport complet..."
npx tsc --noEmit --strict 2>&1 | tee typescript-audit-report.txt

echo ""
echo "📄 Rapport complet sauvegardé dans: typescript-audit-report.txt"
echo ""
echo "✅ Audit terminé"
```

**Exécuter:**

```bash
chmod +x scripts/typescript-audit.sh
npm run audit:typescript
```

#### Étape 3.2 - Migration progressive vers strict (1-1.5 jours)

**Stratégie de migration en 4 phases:**

**Phase 1: Activer noUnusedLocals et noUnusedParameters (2-3 heures)**

1. **Mettre à jour `tsconfig.json`:**
   ```json
   {
     "compilerOptions": {
       "noUnusedLocals": true,
       "noUnusedParameters": true
     }
   }
   ```

2. **Fixer les erreurs:**
   ```bash
   # Identifier toutes les erreurs
   npx tsc --noEmit > typescript-errors-phase1.txt

   # Les corriger:
   # - Supprimer les imports/variables inutilisés
   # - Préfixer par _ les paramètres intentionnellement non utilisés
   ```

   Exemple de correction:
   ```typescript
   // ❌ AVANT
   function handleClick(event: MouseEvent, index: number) {
     console.log('Clicked!');
   }

   // ✅ APRÈS
   function handleClick(_event: MouseEvent, _index: number) {
     console.log('Clicked!');
   }
   ```

**Phase 2: Activer noImplicitAny (4-6 heures)**

1. **Mettre à jour `tsconfig.json`:**
   ```json
   {
     "compilerOptions": {
       "noImplicitAny": true
     }
   }
   ```

2. **Stratégie de correction:**
   ```typescript
   // ❌ AVANT (any implicite)
   function processData(data) {
     return data.map(item => item.value);
   }

   // ⚠️ TEMPORAIRE (pour migration progressive)
   function processData(data: any) {  // TODO: Typer correctement
     return data.map((item: any) => item.value);
   }

   // ✅ FINAL (typé correctement)
   interface DataItem {
     value: string;
   }

   function processData(data: DataItem[]) {
     return data.map(item => item.value);
   }
   ```

3. **Créer des types utilitaires pour migration:**

   **`src/types/migration.ts`:**
   ```typescript
   /**
    * Type temporaire pour migration vers strict mode.
    * À remplacer par un type approprié dès que possible.
    *
    * @deprecated Utilisez un type approprié
    */
   export type TODO_Type = any;

   /**
    * Marque un type qui nécessite attention lors de la migration.
    */
   export type NeedsTyping<T = any> = T;
   ```

**Phase 3: Activer strictNullChecks (6-8 heures)**

1. **Mettre à jour `tsconfig.json`:**
   ```json
   {
     "compilerOptions": {
       "strictNullChecks": true
     }
   }
   ```

2. **Patterns de correction:**

   **a) Utiliser optional chaining:**
   ```typescript
   // ❌ AVANT
   const userName = user.profile.name;

   // ✅ APRÈS
   const userName = user?.profile?.name ?? 'Guest';
   ```

   **b) Utiliser type guards:**
   ```typescript
   // ❌ AVANT
   function processUser(user: User | null) {
     console.log(user.name);  // Error: Object is possibly 'null'
   }

   // ✅ APRÈS
   function processUser(user: User | null) {
     if (!user) {
       console.log('No user');
       return;
     }
     console.log(user.name);  // OK
   }
   ```

   **c) Utiliser nullish coalescing:**
   ```typescript
   // ❌ AVANT
   const count = data.count || 0;

   // ✅ APRÈS
   const count = data.count ?? 0;
   ```

**Phase 4: Activer strict mode complet (2-3 heures)**

1. **Mettre à jour `tsconfig.json`:**
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "strictBindCallApply": true,
       "strictPropertyInitialization": true,
       "noImplicitThis": true,
       "alwaysStrict": true
     }
   }
   ```

2. **Fixer les dernières erreurs:**
   - `strictFunctionTypes`: Vérifier la variance des types de fonctions
   - `strictBindCallApply`: Typer correctement bind/call/apply
   - `strictPropertyInitialization`: Initialiser les propriétés de classe
   - `noImplicitThis`: Typer `this` explicitement

#### Étape 3.3 - Guide et conventions TypeScript (½ jour)

**Créer `docs/TYPESCRIPT-GUIDE.md`:**

```markdown
# Guide TypeScript - Smart Pantry Pro

## Configuration

Nous utilisons le mode `strict` de TypeScript pour maximiser la sécurité de type.

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

## Conventions de typage

### 1. Préférer `interface` pour les objets

```typescript
// ✅ BON
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ ÉVITER (sauf cas spécifiques)
type User = {
  id: string;
  name: string;
  email: string;
};
```

**Quand utiliser `type`:**
- Unions: `type Status = 'pending' | 'success' | 'error'`
- Intersections: `type Admin = User & { role: 'admin' }`
- Type utilities: `type Partial<T> = ...`

### 2. Typer explicitement les retours de fonctions

```typescript
// ✅ BON
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ ÉVITER (inférence implicite)
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### 3. Utiliser `unknown` au lieu de `any`

```typescript
// ✅ BON
function processData(data: unknown) {
  if (typeof data === 'string') {
    return data.toUpperCase();
  }
  throw new Error('Invalid data type');
}

// ❌ ÉVITER
function processData(data: any) {
  return data.toUpperCase();  // Aucune vérification
}
```

### 4. Gérer null/undefined explicitement

```typescript
// ✅ BON
function getUser(id: string): User | null {
  const user = database.find(id);
  return user ?? null;
}

// Usage
const user = getUser('123');
if (user) {
  console.log(user.name);  // Safe
}
```

### 5. Utiliser les Type Guards

```typescript
// ✅ BON
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value
  );
}

if (isUser(data)) {
  console.log(data.name);  // TypeScript sait que c'est un User
}
```

### 6. Typer les props React

```typescript
// ✅ BON
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ label, onClick, variant = 'primary', disabled = false }: ButtonProps) {
  // ...
}
```

### 7. Typer les hooks personnalisés

```typescript
// ✅ BON
interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useUser(id: string): UseUserReturn {
  // ...
}
```

## Patterns avancés

### Utility Types

```typescript
// Partial - tous les champs optionnels
type PartialUser = Partial<User>;

// Pick - sélectionner certains champs
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit - exclure certains champs
type UserWithoutEmail = Omit<User, 'email'>;

// Record - créer un objet avec clés typées
type UserMap = Record<string, User>;
```

### Generic Types

```typescript
// ✅ BON
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  // ...
}

// Usage
const response = await fetchData<User>('/api/users/123');
console.log(response.data.name);  // Type-safe
```

## TSDoc

Documenter les fonctions publiques avec TSDoc:

```typescript
/**
 * Calcule le total d'une commande avec taxes et remises.
 *
 * @param items - Liste des articles de la commande
 * @param taxRate - Taux de taxe (ex: 0.2 pour 20%)
 * @param discount - Remise optionnelle en pourcentage (ex: 10 pour 10%)
 * @returns Le montant total avec taxes et remises appliquées
 *
 * @example
 * ```typescript
 * const total = calculateOrderTotal(
 *   [{ price: 10, quantity: 2 }],
 *   0.2,
 *   10
 * );
 * console.log(total); // 19.8
 * ```
 */
export function calculateOrderTotal(
  items: OrderItem[],
  taxRate: number,
  discount?: number
): number {
  // ...
}
```

## Migration de code legacy

Si vous devez temporairement utiliser `any`, documentez-le:

```typescript
// TODO: [TS-MIGRATION] Typer correctement après refactoring du service
function legacyFunction(data: any): any {
  // ...
}
```

Créez un ticket pour chaque `TODO` de migration.

## Outils recommandés

- **VS Code Extension**: ESLint, TypeScript Error Translator
- **Scripts**: `npm run type-check`, `npm run lint`
- **Pre-commit hook**: Vérification TypeScript automatique

## Ressources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)
```

#### Étape 3.4 - Outils et automation (½ jour)

**1. Pre-commit hook pour vérification TypeScript:**

**Installer Husky:**
```bash
npm install -D husky lint-staged
npx husky init
```

**Créer `.husky/pre-commit`:**
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

**Configurer `package.json`:**
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "tsc --noEmit"
    ]
  }
}
```

**2. Script de vérification TypeScript:**

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "audit:typescript": "./scripts/typescript-audit.sh"
  }
}
```

### Critères de succès

✅ **Mode strict activé**
- `tsconfig.json` avec `"strict": true`
- 0 erreurs TypeScript: `npm run type-check` passe

✅ **Aucun `any` implicite**
- Tous les types explicitement déclarés
- `any` utilisés seulement si documentés avec TODO

✅ **Null safety**
- `strictNullChecks: true` activé
- Toutes les valeurs nullables gérées explicitement

✅ **Variables inutilisées supprimées**
- `noUnusedLocals: true` et `noUnusedParameters: true`
- Aucun warning dans `npm run type-check`

✅ **Guide TypeScript documenté**
- `docs/TYPESCRIPT-GUIDE.md` créé et publié
- Équipe formée aux nouvelles conventions

### Tests de validation

```bash
# Test 1: Compilation TypeScript stricte
npm run type-check

# Test 2: Pre-commit hook
git commit -m "test"  # Devrait exécuter type-check

# Test 3: Build production
npm run build:production

# Test 4: Audit TypeScript
npm run audit:typescript
```

### Documentation à créer

- ✅ `docs/TYPESCRIPT-GUIDE.md` - Guide complet TypeScript
- ✅ `docs/TYPESCRIPT-MIGRATION.md` - Notes de migration vers strict mode

---

## 🔧 ACTION #4 - API Backend Intermédiaire

### Priorité: HIGH 🔥

**Durée estimée:** 3-5 jours
**Responsables:** Backend Lead + API Architect
**Impact:** Très élevé (Sécurité, Architecture, Scalabilité)
**Complexité:** Élevée

### Problèmes identifiés

❌ **Accès direct client → Supabase**
- Code frontend appelle directement `supabase.from('table')`
- Toute la sécurité repose sur Row Level Security (RLS)
- Impossible de valider côté serveur
- Impossible de cacher ou d'optimiser

❌ **Pas de validation serveur**
- Validation uniquement côté client (peut être bypassée)
- Risque de données corrompues dans la DB

❌ **Pas de couche de cache**
- Chaque requête frappe la DB ou les APIs externes
- Coûts élevés pour OpenAI, Deepgram, etc.

❌ **Architecture de déploiement confuse**
- Mix entre Vercel Functions et serveur Express
- Impossible à déployer proprement

### Plan d'implémentation détaillé

#### Étape 4.1 - Choisir l'architecture de déploiement (½ jour)

**Option A: Serverless complet (Vercel Functions) - RECOMMANDÉ**

**Avantages:**
- ✅ Scaling automatique
- ✅ Pay-per-use (coût optimisé)
- ✅ Edge deployment (latence minimale)
- ✅ Intégration Vercel simple

**Inconvénients:**
- ❌ Cold starts (première requête lente)
- ❌ Timeouts (30s max sur Vercel Pro)
- ❌ État non persistant entre requêtes

**Option B: Serveur Express sur container**

**Avantages:**
- ✅ Pas de cold starts
- ✅ État persistant (connexions DB pool)
- ✅ Pas de limitations de timeout
- ✅ WebSockets possibles

**Inconvénients:**
- ❌ Scaling manuel
- ❌ Coût fixe (serveur toujours up)
- ❌ Configuration infrastructure complexe

**DÉCISION RECOMMANDÉE:** Option A (Serverless) pour commencer, migration vers Option B si nécessaire.

#### Étape 4.2 - Créer la structure API backend (1 jour)

**Architecture des dossiers:**

```
apps/api/
├── src/
│   ├── routes/
│   │   ├── v1/
│   │   │   ├── inventory.ts      # Routes inventaire
│   │   │   ├── recipes.ts        # Routes recettes
│   │   │   ├── shopping.ts       # Routes courses
│   │   │   ├── users.ts          # Routes utilisateurs
│   │   │   └── index.ts          # Router principal v1
│   │   └── index.ts              # Router global
│   ├── repositories/
│   │   ├── InventoryRepository.ts
│   │   ├── RecipeRepository.ts
│   │   ├── ShoppingRepository.ts
│   │   └── UserRepository.ts
│   ├── services/
│   │   ├── InventoryService.ts
│   │   ├── RecipeService.ts
│   │   └── CacheService.ts
│   ├── middleware/
│   │   ├── auth.ts               # Authentification JWT
│   │   ├── validation.ts         # Validation Zod
│   │   ├── errorHandler.ts       # Gestion d'erreurs
│   │   └── rateLimit.ts          # Rate limiting
│   ├── types/
│   │   └── api.ts                # Types API
│   ├── config/
│   │   └── env.ts                # Configuration environnement
│   └── index.ts                  # Point d'entrée
├── package.json
└── tsconfig.json
```

**Créer `apps/api/src/repositories/BaseRepository.ts`:**

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@smart/shared/types';

export abstract class BaseRepository<T> {
  protected supabase: SupabaseClient<Database>;
  protected tableName: string;

  constructor(supabase: SupabaseClient<Database>, tableName: string) {
    this.supabase = supabase;
    this.tableName = tableName;
  }

  async findById(id: string, userId: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as T;
  }

  async findAll(userId: string, filters?: Record<string, any>): Promise<T[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;

    if (error) throw error;

    return data as T[];
  }

  async create(data: Partial<T>, userId: string): Promise<T> {
    const { data: created, error } = await this.supabase
      .from(this.tableName)
      .insert({ ...data, user_id: userId })
      .select()
      .single();

    if (error) throw error;

    return created as T;
  }

  async update(id: string, data: Partial<T>, userId: string): Promise<T> {
    const { data: updated, error } = await this.supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return updated as T;
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
```

**Créer `apps/api/src/repositories/InventoryRepository.ts`:**

```typescript
import { BaseRepository } from './BaseRepository';
import { InventoryItem } from '@smart/shared/types';

export class InventoryRepository extends BaseRepository<InventoryItem> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'inventory');
  }

  async findExpiringSoon(userId: string, days: number = 3): Promise<InventoryItem[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, product:products(*)')
      .eq('user_id', userId)
      .lte('expiry_date', targetDate.toISOString())
      .order('expiry_date', { ascending: true });

    if (error) throw error;

    return data as InventoryItem[];
  }

  async findByLocation(userId: string, location: string): Promise<InventoryItem[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, product:products(*)')
      .eq('user_id', userId)
      .eq('location', location);

    if (error) throw error;

    return data as InventoryItem[];
  }
}
```

#### Étape 4.3 - Créer les routes API avec validation Zod (1 jour)

**Créer `packages/shared/src/schemas/inventory.ts`:**

```typescript
import { z } from 'zod';

export const CreateInventoryItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().positive(),
  location: z.enum(['pantry', 'fridge', 'freezer']),
  expiry_date: z.string().datetime().optional(),
  purchase_date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial();

export const InventoryFiltersSchema = z.object({
  location: z.enum(['pantry', 'fridge', 'freezer']).optional(),
  expiringSoon: z.boolean().optional(),
  search: z.string().optional(),
});

export type CreateInventoryItemInput = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof UpdateInventoryItemSchema>;
export type InventoryFilters = z.infer<typeof InventoryFiltersSchema>;
```

**Créer `apps/api/src/middleware/validation.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateBody<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          type: 'validation_error',
          title: 'Invalid request body',
          status: 400,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

export function validateQuery<T extends ZodSchema>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          type: 'validation_error',
          title: 'Invalid query parameters',
          status: 400,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}
```

**Créer `apps/api/src/routes/v1/inventory.ts`:**

```typescript
import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { validateBody, validateQuery } from '../../middleware/validation';
import { InventoryRepository } from '../../repositories/InventoryRepository';
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  InventoryFiltersSchema
} from '@smart/shared/schemas/inventory';

const router = Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);

/**
 * GET /api/v1/inventory
 * Liste tous les items d'inventaire de l'utilisateur
 */
router.get(
  '/',
  validateQuery(InventoryFiltersSchema),
  async (req, res, next) => {
    try {
      const repository = new InventoryRepository(req.supabase);
      const filters = req.query;

      let items;
      if (filters.expiringSoon) {
        items = await repository.findExpiringSoon(req.userId);
      } else if (filters.location) {
        items = await repository.findByLocation(req.userId, filters.location);
      } else {
        items = await repository.findAll(req.userId);
      }

      // Filtrer par recherche si nécessaire
      if (filters.search) {
        items = items.filter(item =>
          item.product?.name.toLowerCase().includes(filters.search!.toLowerCase())
        );
      }

      res.json({
        data: items,
        meta: {
          total: items.length,
          filters,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/inventory/:id
 * Récupère un item d'inventaire spécifique
 */
router.get('/:id', async (req, res, next) => {
  try {
    const repository = new InventoryRepository(req.supabase);
    const item = await repository.findById(req.params.id, req.userId);

    if (!item) {
      return res.status(404).json({
        type: 'not_found',
        title: 'Inventory item not found',
        status: 404,
        detail: `No inventory item found with id: ${req.params.id}`,
      });
    }

    res.json({ data: item });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/inventory
 * Créer un nouvel item d'inventaire
 */
router.post(
  '/',
  validateBody(CreateInventoryItemSchema),
  async (req, res, next) => {
    try {
      const repository = new InventoryRepository(req.supabase);
      const item = await repository.create(req.body, req.userId);

      res.status(201).json({ data: item });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/inventory/:id
 * Mettre à jour un item d'inventaire
 */
router.patch(
  '/:id',
  validateBody(UpdateInventoryItemSchema),
  async (req, res, next) => {
    try {
      const repository = new InventoryRepository(req.supabase);
      const item = await repository.update(req.params.id, req.body, req.userId);

      res.json({ data: item });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v1/inventory/:id
 * Supprimer un item d'inventaire
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const repository = new InventoryRepository(req.supabase);
    await repository.delete(req.params.id, req.userId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```

#### Étape 4.4 - Middleware d'authentification (½ jour)

**Créer `apps/api/src/middleware/auth.ts`:**

```typescript
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@smart/shared/types';

// Étendre les types Express
declare global {
  namespace Express {
    interface Request {
      userId: string;
      supabase: ReturnType<typeof createClient<Database>>;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Récupérer le token du header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        type: 'unauthorized',
        title: 'Missing or invalid authorization header',
        status: 401,
        detail: 'Expected format: Authorization: Bearer <token>',
      });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Créer un client Supabase avec le token de l'utilisateur
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Vérifier le token
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        type: 'unauthorized',
        title: 'Invalid or expired token',
        status: 401,
      });
    }

    // Attacher l'userId et le client Supabase à la requête
    req.userId = user.id;
    req.supabase = supabase;

    next();
  } catch (error) {
    next(error);
  }
}
```

#### Étape 4.5 - Client API côté frontend (1 jour)

**Créer `src/lib/api-client.ts`:**

```typescript
import { env } from '@/config/client';
import { supabase } from '@/integrations/supabase/client';

class ApiError extends Error {
  constructor(
    public status: number,
    public type: string,
    message: string,
    public errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = '/api/v1') {
    this.baseURL = baseURL;
  }

  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    return session.access_token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(
        response.status,
        error.type || 'api_error',
        error.title || 'API Error',
        error.errors
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data = await response.json();
    return data.data as T;
  }

  // Inventory endpoints
  inventory = {
    list: (filters?: Record<string, any>) => {
      const params = new URLSearchParams(filters);
      return this.request<InventoryItem[]>(`/inventory?${params}`);
    },

    get: (id: string) => {
      return this.request<InventoryItem>(`/inventory/${id}`);
    },

    create: (data: CreateInventoryItemInput) => {
      return this.request<InventoryItem>('/inventory', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: (id: string, data: UpdateInventoryItemInput) => {
      return this.request<InventoryItem>(`/inventory/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: (id: string) => {
      return this.request<void>(`/inventory/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // Recipes endpoints
  recipes = {
    list: (filters?: Record<string, any>) => {
      const params = new URLSearchParams(filters);
      return this.request<Recipe[]>(`/recipes?${params}`);
    },

    get: (id: string) => {
      return this.request<Recipe>(`/recipes/${id}`);
    },

    create: (data: CreateRecipeInput) => {
      return this.request<Recipe>('/recipes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    update: (id: string, data: UpdateRecipeInput) => {
      return this.request<Recipe>(`/recipes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: (id: string) => {
      return this.request<void>(`/recipes/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // Shopping lists endpoints
  shopping = {
    lists: () => this.request<ShoppingList[]>('/shopping/lists'),

    createList: (data: CreateShoppingListInput) => {
      return this.request<ShoppingList>('/shopping/lists', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    addItem: (listId: string, data: CreateShoppingItemInput) => {
      return this.request<ShoppingItem>(`/shopping/lists/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    toggleItem: (listId: string, itemId: string) => {
      return this.request<ShoppingItem>(
        `/shopping/lists/${listId}/items/${itemId}/toggle`,
        { method: 'PATCH' }
      );
    },
  };
}

export const api = new ApiClient();
export { ApiError };
```

**Migrer les hooks pour utiliser le client API:**

**`src/hooks/useInventory.ts` - APRÈS:**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

export function useInventory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Liste de l'inventaire
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.inventory.list(),
  });

  // Items expirant bientôt
  const { data: expiringSoon } = useQuery({
    queryKey: ['inventory', 'expiring-soon'],
    queryFn: () => api.inventory.list({ expiringSoon: true }),
  });

  // Mutation pour ajouter un item
  const addMutation = useMutation({
    mutationFn: api.inventory.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: 'Produit ajouté',
        description: 'L\'item a été ajouté à votre inventaire.',
      });
    },
    onError: (error: ApiError) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message,
      });
    },
  });

  // Mutation pour mettre à jour un item
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateInventoryItemInput }) =>
      api.inventory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: 'Produit mis à jour',
        description: 'L\'item a été modifié avec succès.',
      });
    },
    onError: (error: ApiError) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message,
      });
    },
  });

  // Mutation pour supprimer un item
  const deleteMutation = useMutation({
    mutationFn: api.inventory.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({
        title: 'Produit supprimé',
        description: 'L\'item a été retiré de votre inventaire.',
      });
    },
    onError: (error: ApiError) => {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message,
      });
    },
  });

  return {
    inventory: inventory ?? [],
    expiringSoon: expiringSoon ?? [],
    isLoading,
    addItem: addMutation.mutate,
    updateItem: updateMutation.mutate,
    deleteItem: deleteMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
```

#### Étape 4.6 - Documentation OpenAPI (½ jour)

**Installer les dépendances:**

```bash
npm install -D @asteasolutions/zod-to-openapi swagger-ui-express
```

**Créer `apps/api/src/openapi/generator.ts`:**

```typescript
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  InventoryFiltersSchema,
} from '@smart/shared/schemas/inventory';

const registry = new OpenAPIRegistry();

// Enregistrer les schémas
registry.register('CreateInventoryItem', CreateInventoryItemSchema);
registry.register('UpdateInventoryItem', UpdateInventoryItemSchema);
registry.register('InventoryFilters', InventoryFiltersSchema);

// Définir les routes
registry.registerPath({
  method: 'get',
  path: '/api/v1/inventory',
  summary: 'List inventory items',
  tags: ['Inventory'],
  security: [{ bearerAuth: [] }],
  request: {
    query: InventoryFiltersSchema,
  },
  responses: {
    200: {
      description: 'Successful response',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/InventoryItem' },
              },
              meta: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/v1/inventory',
  summary: 'Create inventory item',
  tags: ['Inventory'],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateInventoryItemSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Item created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/InventoryItem' },
            },
          },
        },
      },
    },
  },
});

// Générer la spec OpenAPI
const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiSpec = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    title: 'Smart Pantry Pro API',
    version: '1.0.0',
    description: 'API pour Smart Pantry Pro - Gestion intelligente de garde-manger',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development',
    },
    {
      url: 'https://api.smartpantry.app',
      description: 'Production',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
});
```

**Servir Swagger UI:**

**`apps/api/src/routes/docs.ts`:**

```typescript
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../openapi/generator';

const router = Router();

// Servir la spec OpenAPI en JSON
router.get('/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

// Servir Swagger UI
router.use('/', swaggerUi.serve, swaggerUi.setup(openApiSpec));

export default router;
```

**Monter dans `apps/api/src/index.ts`:**

```typescript
import docsRouter from './routes/docs';

app.use('/api/docs', docsRouter);
```

### Critères de succès

✅ **Architecture de déploiement choisie et documentée**
- Décision entre serverless/container documentée
- Configuration Vercel ou infrastructure container en place

✅ **Pattern Repository implémenté**
- Tous les accès Supabase via repositories
- Aucun appel direct `supabase.from()` dans les routes

✅ **Validation Zod côté serveur**
- Tous les endpoints validés avec schémas Zod
- Erreurs de validation formatées en RFC 7807

✅ **Client API unifié côté frontend**
- `src/lib/api-client.ts` créé avec méthodes typées
- Tous les hooks migrés pour utiliser le client API

✅ **Documentation OpenAPI complète**
- Spec OpenAPI générée depuis schémas Zod
- Swagger UI accessible sur `/api/docs`

### Tests de validation

```bash
# Test 1: Vérifier aucun accès direct Supabase
npm run test:no-direct-supabase

# Test 2: Tests d'intégration API
npm run test:api

# Test 3: Validation Zod
npm run test:validation

# Test 4: Documentation OpenAPI
curl http://localhost:4000/api/docs/openapi.json
```

### Documentation à créer

- ✅ `docs/API-ARCHITECTURE.md` - Architecture API backend
- ✅ `docs/REPOSITORY-PATTERN.md` - Pattern Repository expliqué
- ✅ `docs/API-CLIENT-USAGE.md` - Guide d'utilisation du client API

---

## 📁 ACTION #5 - Réorganisation et Nettoyage du Projet

### Priorité: MEDIUM 📋

**Durée estimée:** 1-2 jours
**Responsables:** Tech Lead + Toute l'équipe
**Impact:** Moyen (Developer Experience, Professionalisme)
**Complexité:** Faible

### Problèmes identifiés

❌ **Racine du projet polluée**
- 40+ fichiers de scripts/tests à la racine
- `test-*.js`, `debug-*.js`, `verify-*.js`, `start-*.sh`
- Rend le projet intimidant et peu professionnel

❌ **Conventions de tests floues**
- Tests dispersés: racine, `__tests__/`, dossiers individuels
- Aucun pattern clair

❌ **Pas de Prettier configuré**
- Inconsistances de style entre développeurs
- Conflits dans les PRs

### Plan d'implémentation détaillé

#### Étape 5.1 - Créer la structure de dossiers (½ jour)

**Structure cible:**

```
smart-pantry-pro/
├── .claude/                 # Commandes Claude (existe)
├── .github/                 # GitHub Actions
├── .husky/                  # Git hooks
├── apps/
│   ├── api/                 # API backend
│   └── web/                 # Application web (src/)
├── packages/
│   ├── shared/              # Code partagé
│   └── server-deps/         # Dépendances server-only
├── scripts/                 # Scripts de développement
│   ├── setup/
│   │   ├── setup-env.js
│   │   └── setup-supabase.sh
│   ├── test/
│   │   ├── test-api.sh
│   │   └── test-integration.sh
│   ├── debug/
│   │   ├── debug-auth.js
│   │   └── debug-supabase.js
│   ├── audit/
│   │   ├── audit-dependencies.js
│   │   ├── audit-rls.sql
│   │   └── typescript-audit.sh
│   └── build/
│       ├── build-optimized.sh
│       └── vercel-build.sh
├── docs/                    # Documentation
│   ├── api/
│   ├── architecture/
│   ├── guides/
│   └── adr/                 # Architecture Decision Records
├── supabase/                # Supabase (existe)
├── dist/                    # Build output
├── node_modules/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .eslintrc.cjs
├── .prettierrc.json         # À créer
├── .gitignore
├── README.md
└── LICENSE
```

**Créer les dossiers:**

```bash
mkdir -p scripts/{setup,test,debug,audit,build}
mkdir -p docs/{api,architecture,guides,adr}
```

#### Étape 5.2 - Déplacer les fichiers (½ jour)

**Créer `scripts/reorganize.sh`:**

```bash
#!/bin/bash

echo "🗂️  Réorganisation du projet..."

# Créer les dossiers nécessaires
mkdir -p scripts/{setup,test,debug,audit,build}
mkdir -p docs/{api,architecture,guides,adr}

# Déplacer les scripts de test
mv test-*.js scripts/test/ 2>/dev/null || true
mv test-*.sh scripts/test/ 2>/dev/null || true

# Déplacer les scripts de debug
mv debug-*.js scripts/debug/ 2>/dev/null || true
mv debug-*.sh scripts/debug/ 2>/dev/null || true

# Déplacer les scripts de vérification
mv verify-*.js scripts/audit/ 2>/dev/null || true
mv verify-*.sh scripts/audit/ 2>/dev/null || true

# Déplacer les scripts de setup
mv setup-*.js scripts/setup/ 2>/dev/null || true
mv setup-*.sh scripts/setup/ 2>/dev/null || true

# Déplacer les scripts de build
mv build-*.sh scripts/build/ 2>/dev/null || true
mv start-*.sh scripts/build/ 2>/dev/null || true

# Déplacer la documentation existante
mv API.md docs/api/ 2>/dev/null || true
mv ARCHITECTURE.md docs/architecture/ 2>/dev/null || true
mv SECURITY.md docs/guides/ 2>/dev/null || true
mv DEPLOYMENT.md docs/guides/ 2>/dev/null || true

echo "✅ Réorganisation terminée!"
echo ""
echo "📝 Vérifiez que tout est en ordre, puis:"
echo "   git add -A"
echo "   git commit -m 'chore: reorganize project structure'"
```

**Exécuter:**

```bash
chmod +x scripts/reorganize.sh
./scripts/reorganize.sh
```

**Mettre à jour les références dans `package.json`:**

```json
{
  "scripts": {
    "setup": "node scripts/setup/setup-env.js",
    "test:api": "./scripts/test/test-api.sh",
    "test:integration": "./scripts/test/test-integration.sh",
    "debug:auth": "node scripts/debug/debug-auth.js",
    "audit:deps": "node scripts/audit/audit-dependencies.js",
    "audit:rls": "psql -f scripts/audit/audit-rls.sql",
    "audit:typescript": "./scripts/audit/typescript-audit.sh",
    "build:optimized": "./scripts/build/build-optimized.sh",
    "build:vercel": "./scripts/build/vercel-build.sh"
  }
}
```

#### Étape 5.3 - Configurer Prettier (½ jour)

**Installer Prettier:**

```bash
npm install -D prettier eslint-config-prettier
```

**Créer `.prettierrc.json`:**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "jsxSingleQuote": false,
  "quoteProps": "as-needed"
}
```

**Créer `.prettierignore`:**

```
# Build outputs
dist/
build/
.next/
out/

# Dependencies
node_modules/
.pnpm-store/

# Logs
*.log

# OS
.DS_Store

# IDE
.vscode/
.idea/

# Temp
*.tmp
*.temp

# Generated
*.generated.*
```

**Mettre à jour `.eslintrc.cjs`:**

```javascript
module.exports = {
  extends: [
    // ... config existante
    'prettier', // Doit être en DERNIER pour override les autres configs
  ],
  // ... reste de la config
};
```

**Ajouter scripts dans `package.json`:**

```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css,md}\"",
    "lint:fix": "eslint src --ext ts,tsx --fix && npm run format"
  }
}
```

**Mettre à jour `.husky/pre-commit`:**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Linter et formater automatiquement
npx lint-staged
```

**Configurer `lint-staged` dans `package.json`:**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "tsc --noEmit"
    ],
    "*.{js,jsx,json,css,md}": [
      "prettier --write"
    ]
  }
}
```

**Formater tout le codebase:**

```bash
npm run format
```

#### Étape 5.4 - Standardiser les tests (½ jour)

**Convention adoptée:** `src/**/__tests__/**/*.test.ts`

**Créer `scripts/test/move-tests.sh`:**

```bash
#!/bin/bash

echo "🧪 Standardisation des tests..."

# Fonction pour déplacer les tests
move_tests() {
  local dir=$1

  # Créer le dossier __tests__ si nécessaire
  mkdir -p "$dir/__tests__"

  # Déplacer tous les fichiers .test.ts et .spec.ts
  find "$dir" -maxdepth 1 -type f \( -name "*.test.ts" -o -name "*.spec.ts" \) \
    -exec mv {} "$dir/__tests__/" \;
}

# Parcourir src/ récursivement
find src -type d | while read -r dir; do
  if [ "$dir" != "src" ]; then
    move_tests "$dir"
  fi
done

echo "✅ Tests standardisés!"
echo ""
echo "📝 Convention: src/**/__tests__/**/*.test.ts"
```

**Mettre à jour `vitest.config.ts` ou `jest.config.js`:**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'build'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
```

**Créer `docs/guides/TESTING.md`:**

```markdown
# Guide de Testing - Smart Pantry Pro

## Convention

Tous les tests doivent être placés dans des dossiers `__tests__/`:

```
src/
├── components/
│   ├── Button/
│   │   ├── __tests__/
│   │   │   ├── Button.test.tsx
│   │   │   └── Button.a11y.test.tsx
│   │   ├── Button.tsx
│   │   └── index.ts
│   └── ...
├── hooks/
│   ├── __tests__/
│   │   ├── useInventory.test.ts
│   │   └── useRecipes.test.ts
│   ├── useInventory.ts
│   └── useRecipes.ts
└── services/
    ├── api/
    │   ├── __tests__/
    │   │   └── apiClient.test.ts
    │   └── apiClient.ts
    └── ...
```

## Commandes

```bash
# Lancer tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Tests avec coverage
npm run test:coverage

# Tests unitaires uniquement
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e
```

## Patterns de testing

### Composants React

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);

    await userEvent.click(screen.getByText('Click me'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### Hooks personnalisés

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useInventory } from '../useInventory';

describe('useInventory', () => {
  it('loads inventory items', async () => {
    const { result } = renderHook(() => useInventory());

    await waitFor(() => {
      expect(result.current.inventory).toHaveLength(10);
    });
  });
});
```

### Services/Repositories

```typescript
import { InventoryRepository } from '../InventoryRepository';
import { createMockSupabaseClient } from '@/test-utils';

describe('InventoryRepository', () => {
  it('finds items by user', async () => {
    const supabase = createMockSupabaseClient();
    const repository = new InventoryRepository(supabase);

    const items = await repository.findAll('user-123');

    expect(items).toHaveLength(5);
  });
});
```

## Ressources

- [Testing Library Docs](https://testing-library.com/)
- [Vitest Docs](https://vitest.dev/)
- [Jest Docs](https://jestjs.io/)
```

### Critères de succès

✅ **Racine du projet propre**
- Moins de 15 fichiers à la racine
- Tous les scripts dans `scripts/`
- Toute la documentation dans `docs/`

✅ **Tests standardisés**
- 100% des tests dans `src/**/__tests__/`
- Configuration de test mise à jour
- Guide de testing documenté

✅ **Prettier configuré**
- `.prettierrc.json` créé
- Intégration ESLint avec `eslint-config-prettier`
- Pre-commit hook avec `lint-staged`

✅ **Scripts npm mis à jour**
- Tous les scripts pointent vers les nouveaux emplacements
- Documentation des scripts dans README

### Tests de validation

```bash
# Test 1: Vérifier la racine
ls | wc -l  # Devrait être < 15

# Test 2: Vérifier les tests
npm test

# Test 3: Vérifier Prettier
npm run format:check

# Test 4: Pre-commit hook
git add .
git commit -m "test"  # Devrait formatter automatiquement
```

### Documentation à créer

- ✅ `docs/guides/PROJECT-STRUCTURE.md` - Structure du projet expliquée
- ✅ `docs/guides/TESTING.md` - Guide de testing
- ✅ `docs/guides/CONTRIBUTING.md` - Guide de contribution

---

## 📅 Planning d'Exécution

### Sprint 1 (Semaine 1) - Actions Critiques

**Jours 1-2:** ACTION #1 - Sécurisation Critique
**Jours 3-4:** ACTION #2 - Nettoyage Dépendances
**Jour 5:** Review et tests Sprint 1

### Sprint 2 (Semaine 2) - TypeScript & Organisation

**Jours 1-3:** ACTION #3 - TypeScript Strict Mode
**Jours 4-5:** ACTION #5 - Réorganisation Projet

### Sprint 3 (Semaine 3) - API Backend

**Jours 1-5:** ACTION #4 - API Backend Intermédiaire
(Le plus complexe, nécessite toute une semaine)

### Sprint 4 (Semaine 4) - Tests & Documentation

**Jours 1-2:** Tests d'intégration complets
**Jours 3-4:** Documentation finale
**Jour 5:** Review finale et déploiement staging

---

## 📊 Métriques de Succès

### Avant PRP

- ❌ Score architecture: **6.2/10**
- ❌ Confiance production: **4/10**
- ❌ Secrets hardcodés: **Oui**
- ❌ TypeScript strict: **Non**
- ❌ Bundle size: **~2MB** (estimé)
- ❌ Tests passing: **~60%**
- ❌ Documentation complète: **Non**

### Après PRP (Cible)

- ✅ Score architecture: **8.5/10**
- ✅ Confiance production: **8/10**
- ✅ Secrets hardcodés: **0**
- ✅ TypeScript strict: **Oui**
- ✅ Bundle size: **<500KB gzipped**
- ✅ Tests passing: **95%+**
- ✅ Documentation complète: **Oui**

---

## 🚧 Risques et Mitigation

### Risque 1: Migration TypeScript trop longue

**Probabilité:** Moyenne
**Impact:** Moyen
**Mitigation:**
- Migration progressive par phases
- Utiliser `TODO_Type` temporairement
- Paralléliser le travail par équipe

### Risque 2: Rupture de features existantes

**Probabilité:** Élevée
**Impact:** Élevé
**Mitigation:**
- Tests d'intégration complets avant migration
- Feature flags pour rollback rapide
- Migration progressive par module

### Risque 3: Équipe débordée

**Probabilité:** Moyenne
**Impact:** Élevé
**Mitigation:**
- Geler les nouvelles features pendant le refactoring
- Planning réaliste sur 4 sprints
- Priorisation stricte (CRITICAL first)

---

## 📚 Documentation Créée

- ✅ `docs/ENVIRONMENT-SETUP.md`
- ✅ `docs/SECURITY-RLS-CHECKLIST.md`
- ✅ `docs/VERCEL-DEPLOYMENT.md`
- ✅ `docs/DEPENDENCIES-POLICY.md`
- ✅ `docs/LAZY-LOADING-GUIDE.md`
- ✅ `docs/TYPESCRIPT-GUIDE.md`
- ✅ `docs/TYPESCRIPT-MIGRATION.md`
- ✅ `docs/API-ARCHITECTURE.md`
- ✅ `docs/REPOSITORY-PATTERN.md`
- ✅ `docs/API-CLIENT-USAGE.md`
- ✅ `docs/guides/PROJECT-STRUCTURE.md`
- ✅ `docs/guides/TESTING.md`
- ✅ `docs/guides/CONTRIBUTING.md`

---

## ✅ Validation Finale

### Checklist de Validation

- [ ] Tous les secrets externalisés (ACTION #1)
- [ ] Aucune dépendance server-only côté client (ACTION #2)
- [ ] TypeScript strict mode activé sans erreurs (ACTION #3)
- [ ] API backend intermédiaire fonctionnelle (ACTION #4)
- [ ] Projet réorganisé et propre (ACTION #5)
- [ ] Tests passing à 95%+
- [ ] Documentation complète publiée
- [ ] Déploiement staging réussi
- [ ] Review par le panel d'experts

---

## 🎯 Prochaines Étapes (Après PRP)

Une fois ce PRP complété, les actions suivantes seront recommandées:

1. **Jour 2 du séminaire** - Code Quality & Patterns
2. **Implémenter BullMQ** - Queue system pour tâches asynchrones
3. **Ajouter Redis/Upstash** - Cache backend pour optimisation
4. **Migration vers microservices** - Services lourds (vision, video) en serverless functions
5. **Monitoring & Observability** - Sentry, LogRocket, Datadog RUM

---

**Document préparé par:** Panel d'experts Code Review
**Date:** 2025-10-03
**Version:** 1.0
**Statut:** READY TO START 🚀
