#!/bin/bash

# Script de déploiement optimisé pour Vercel
# Résout les conflits React et optimise le build

echo "🚀 Démarrage du déploiement optimisé..."

# Nettoyer le cache
echo "🧹 Nettoyage du cache..."
rm -rf .vercel/output
rm -rf dist
rm -rf node_modules/.cache

# Installer les dépendances avec résolution forcée
echo "📦 Installation des dépendances..."
npm install --legacy-peer-deps --force

# Vérifier les versions React
echo "🔍 Vérification des versions React..."
npm ls react react-dom

# Build optimisé
echo "🔨 Build de production..."
npm run build

# Vérifier le build
echo "✅ Vérification du build..."
if [ -d "dist" ]; then
    echo "✅ Build réussi !"
    ls -la dist/
else
    echo "❌ Échec du build"
    exit 1
fi

echo "🎉 Déploiement prêt !" 