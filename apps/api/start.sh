#!/bin/bash

# Smart Pantry API - Script de démarrage
# Utilise TSX pour exécution TypeScript directe

set -e

cd "$(dirname "$0")"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Smart Pantry API${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Vérifier .env
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ Fichier .env manquant${NC}"
    echo -e "${YELLOW}  Copiez .env.example vers .env et configurez vos variables${NC}\n"
    exit 1
fi

# Charger variables
export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)

# Vérifier variables critiques
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}✗ SUPABASE_URL manquant dans .env${NC}\n"
    exit 1
fi

echo -e "${GREEN}✓ Configuration chargée${NC}"
echo -e "${YELLOW}  Port: ${PORT:-3030}${NC}"
echo -e "${YELLOW}  Supabase: ${SUPABASE_URL}${NC}\n"

# Tuer processus existants
if lsof -ti:${PORT:-3030} > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠  Arrêt du processus sur port ${PORT:-3030}${NC}"
    kill $(lsof -ti:${PORT:-3030}) 2>/dev/null || true
    sleep 2
fi

echo -e "${GREEN}🎯 Démarrage du serveur avec TSX...${NC}\n"

# Lancer avec tsx
exec npx tsx src/index.ts
