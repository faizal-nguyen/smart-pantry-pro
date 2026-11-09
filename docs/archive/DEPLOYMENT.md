# Guide de Déploiement - Résolution des Conflits React

## Problème Identifié

Le projet rencontrait des erreurs `dispatcher.xxx` en production sur Vercel, causées par des conflits de versions React entre les composants Radix UI et l'application principale.

## Solution Implémentée

### 1. Résolution des Dépendances
- Ajout de `resolutions` et `overrides` dans `package.json`
- Configuration `.npmrc` pour forcer une seule version de React
- Utilisation de `--legacy-peer-deps` pour éviter les conflits

### 2. Optimisation Vite
- Configuration des alias pour forcer une seule version de React
- Séparation des chunks pour React et les composants UI
- Optimisation du build de production

### 3. Configuration Vercel
- Script de build personnalisé (`vercel-build.sh`)
- Configuration forcée des dépendances
- Nettoyage du cache avant déploiement

## Instructions de Déploiement

### Déploiement Local
```bash
npm run build
npm run preview
```

### Déploiement Vercel
```bash
# Option 1: Utiliser le script de déploiement
npm run deploy

# Option 2: Déploiement direct
vercel --prod
```

### Redéploiement Complet (si problème persiste)
```bash
# Nettoyer le cache Vercel
vercel --prod --force

# Ou supprimer et redéployer
vercel remove smart-pantry-pro
vercel --prod
```

## Vérification

Après déploiement, vérifiez que :
1. ✅ Les hooks React fonctionnent (useState, useEffect, etc.)
2. ✅ Les composants Radix UI s'affichent correctement
3. ✅ Le système de gestion d'images fonctionne
4. ✅ Aucune erreur `dispatcher.xxx` dans la console

## Troubleshooting

### Si les erreurs persistent :
1. Vérifiez les versions React : `npm ls react react-dom`
2. Nettoyez le cache : `rm -rf node_modules package-lock.json`
3. Réinstallez : `npm install --legacy-peer-deps`
4. Redéployez avec force : `vercel --prod --force`

### Logs de Debug
```bash
# Vérifier les versions installées
npm ls react react-dom @types/react @types/react-dom

# Vérifier le build
npm run build

# Tester localement
npm run dev
``` 