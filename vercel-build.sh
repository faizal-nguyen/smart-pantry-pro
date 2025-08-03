#!/bin/bash

# Script de build optimisé pour Vercel
# Optimisations de performance et résolution des conflits React

set -e

echo "🚀 Démarrage du build optimisé pour Vercel..."

# Variables d'environnement pour optimiser le build
export NODE_ENV=production
export VITE_BUILD_OPTIMIZE=true
export VITE_DISABLE_SOURCEMAP=true

# Nettoyer le cache si nécessaire
if [ -d "node_modules/.cache" ]; then
    echo "🧹 Nettoyage du cache..."
    rm -rf node_modules/.cache
fi

# Forcer l'installation avec legacy peer deps
echo "📦 Installation des dépendances optimisées..."
npm install --legacy-peer-deps --force --production=false

# Vérifier qu'une seule version de React est installée
echo "🔍 Vérification des versions React..."
REACT_VERSIONS=$(npm ls react --depth=0 | grep react@ | wc -l)
if [ "$REACT_VERSIONS" -gt 1 ]; then
    echo "⚠️  Attention: Plusieurs versions de React détectées"
    npm ls react --depth=0
fi

# Build avec optimisations
echo "🔨 Build de production optimisé..."
npm run build

# Vérifier la taille des chunks
echo "📊 Analyse des chunks générés..."
if [ -d "dist/assets" ]; then
    echo "Taille des fichiers générés:"
    ls -lh dist/assets/
    
    # Vérifier les chunks trop gros
    for file in dist/assets/*.js; do
        if [ -f "$file" ]; then
            size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
            if [ "$size" -gt 500000 ]; then
                echo "⚠️  Chunk volumineux détecté: $(basename "$file") - ${size} bytes"
            fi
        fi
    done
fi

echo "✅ Build terminé avec succès!"
echo "📁 Fichiers générés dans: dist/" 