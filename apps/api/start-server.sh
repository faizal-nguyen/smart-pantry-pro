#!/bin/bash

# Script de démarrage robuste pour l'API Smart Pantry
# Gère les chemins avec espaces et charge les variables d'environnement

# Couleurs pour les logs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Démarrage du serveur API Smart Pantry${NC}"

# Définir le répertoire du script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Charger les variables d'environnement depuis .env
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ Chargement de .env${NC}"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}✗ Fichier .env non trouvé${NC}"
    exit 1
fi

# Vérifier que les variables critiques sont définies
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}✗ Variables Supabase manquantes dans .env${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Variables d'environnement chargées${NC}"
echo -e "${YELLOW}  PORT: ${PORT:-3030}${NC}"
echo -e "${YELLOW}  SUPABASE_URL: ${SUPABASE_URL}${NC}"

# Vérifier que dist/index.js existe
if [ ! -f "dist/index.js" ]; then
    echo -e "${YELLOW}⚠ dist/index.js n'existe pas, compilation...${NC}"
    npm run build:ts 2>&1 | tail -5
fi

# Tuer les anciens processus sur le port
PORT=${PORT:-3030}
echo -e "${YELLOW}🔍 Vérification du port $PORT${NC}"
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Port $PORT occupé, arrêt du processus...${NC}"
    kill $(lsof -ti:$PORT) 2>/dev/null || true
    sleep 1
fi

# Démarrer le serveur avec node
echo -e "${GREEN}🎯 Lancement du serveur sur le port $PORT${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Utiliser exec pour remplacer le shell par node (meilleure gestion des signaux)
exec node \
    --no-warnings \
    --experimental-specifier-resolution=node \
    dist/index.js
