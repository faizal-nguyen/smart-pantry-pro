# 🚀 Guide de Déploiement Vercel - Smart Pantry Pro

## 📋 Résumé des Problèmes Résolus

### 1. ❌ **Erreur: Function Runtimes must have a valid version**
**Cause**: Configuration de fonctions serverless inexistantes dans `vercel.json`
```json
// ❌ Mauvais
"functions": {
  "app/api/**/*.ts": {
    "runtime": "nodejs18.x"
  }
}
```
**Solution**: Supprimer la section `functions` (pas de fonctions serverless dans ce projet)

### 2. ❌ **Erreur: vite: command not found**
**Cause**: Vite était dans `devDependencies`, mais Vercel n'installe que les `dependencies` en production
```bash
sh: line 1: vite: command not found
Error: Command "npm run build:optimized" exited with 127
```
**Solution**: Déplacer `vite` vers `dependencies` dans `package.json`

## ✅ Configuration Actuelle Fonctionnelle

### `vercel.json`
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install --legacy-peer-deps --force",
  "framework": "vite",
  "build": {
    "env": {
      "NODE_ENV": "production",
      "VITE_BUILD_OPTIMIZE": "true"
    }
  }
}
```

### `package.json` - Scripts de Build
```json
{
  "scripts": {
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "build:vercel": "./vercel-build.sh",
    "build:optimized": "NODE_ENV=production VITE_BUILD_OPTIMIZE=true vite build"
  },
  "dependencies": {
    // ... autres dépendances
    "vite": "^5.4.1"  // ⚠️ IMPORTANT: Dans dependencies, pas devDependencies
  }
}
```

## 🔧 Variables d'Environnement Vercel

### Requises
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Optionnelles (Optimisation)
```bash
NODE_ENV=production
VITE_BUILD_OPTIMIZE=true
VITE_DISABLE_SOURCEMAP=true
```

## 📊 Structure du Build

```
dist/
├── index.html                           # Point d'entrée HTML
├── manifest.json                        # PWA manifest
├── sw.js                               # Service Worker
├── assets/
│   ├── index-[hash].js                 # Bundle principal
│   ├── index-[hash].css                # Styles
│   ├── react-vendor-[hash].js          # React/React-DOM
│   ├── ui-vendor-[hash].js             # Composants UI
│   ├── utils-vendor-[hash].js          # Utilitaires
│   └── supabase-vendor-[hash].js       # Supabase/Query
└── icons/                              # Icônes PWA
```

## 🚨 Erreurs Communes et Solutions

### 1. **Build échoue avec des erreurs de dépendances**
```bash
# Solution
"installCommand": "npm install --legacy-peer-deps --force"
```

### 2. **Erreur de TypeScript pendant le build**
```bash
# Vérifier les types
npm run lint

# Build en mode développement pour plus de détails
npm run build:dev
```

### 3. **Bundle trop gros (> 500KB)**
- Vérifier les imports inutiles
- Utiliser l'analyse de bundle: `npm run analyze`
- Implémenter le lazy loading

### 4. **Variables d'environnement non reconnues**
- Les variables doivent commencer par `VITE_`
- Configurer dans Vercel Dashboard > Settings > Environment Variables

## 📈 Optimisations de Performance

### 1. **Réduire la Taille du Bundle**
```javascript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'ui-vendor': ['@radix-ui/*'],
        // etc...
      }
    }
  }
}
```

### 2. **Activer la Compression**
Vercel active automatiquement la compression Gzip/Brotli

### 3. **Headers de Cache**
```json
// vercel.json
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

## 🔄 Workflow de Déploiement

### 1. **Déploiement Automatique (Recommandé)**
- Push sur `main` → Déploiement automatique
- Pull Request → Preview deployment

### 2. **Déploiement Manuel**
```bash
# Via CLI Vercel
vercel --prod

# Via Git
git push origin main
```

### 3. **Rollback si Nécessaire**
- Vercel Dashboard > Deployments
- Cliquer sur "..." > "Promote to Production" sur un déploiement précédent

## 📝 Checklist Pré-Déploiement

- [ ] Variables d'environnement configurées dans Vercel
- [ ] `vite` dans `dependencies` (pas `devDependencies`)
- [ ] Build local réussi: `npm run build`
- [ ] Pas d'erreurs de lint: `npm run lint`
- [ ] Taille du bundle < 500KB par chunk
- [ ] Tests manuels de l'application

## 🆘 Support et Debugging

### Logs de Build
1. Vercel Dashboard > Project > Functions
2. Voir les logs détaillés du build

### Build Local pour Debug
```bash
# Simuler l'environnement Vercel
NODE_ENV=production npm run build

# Tester le build
npm run preview
```

### Analyser le Bundle
```bash
npm run analyze
# Ouvre automatiquement le visualiseur
```

## 🎯 Bonnes Pratiques

1. **Toujours tester le build localement** avant de push
2. **Utiliser les preview deployments** pour les PR
3. **Monitorer la taille du bundle** régulièrement
4. **Garder les dépendances à jour** (sécurité)
5. **Utiliser les variables d'environnement** pour les secrets

## 📚 Ressources

- [Documentation Vercel](https://vercel.com/docs)
- [Vite + Vercel Guide](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Optimisation Vite](https://vitejs.dev/guide/build.html#build-optimizations)