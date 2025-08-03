#!/bin/bash

# Script de build pour Vercel
# Force la résolution des conflits React

set -e

echo "🔧 Configuration du build Vercel..."

# Forcer l'installation avec legacy peer deps
npm install --legacy-peer-deps --force

# Vérifier qu'une seule version de React est installée
echo "🔍 Vérification des versions React..."
REACT_VERSIONS=$(npm ls react --depth=0 | grep react@ | wc -l)
if [ "$REACT_VERSIONS" -gt 1 ]; then
    echo "⚠️  Attention: Plusieurs versions de React détectées"
    npm ls react --depth=0
fi

# Build avec optimisations
echo "🔨 Build de production..."
npm run build

echo "✅ Build terminé avec succès!" 