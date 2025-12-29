#!/bin/bash

# Script de démarrage avec TSX (TypeScript execution)
# Contourne les problèmes de compilation et de chemins

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Démarrage Smart Pantry API avec TSX${NC}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Charger .env
if [ -f ".env" ]; then
    echo -e "${GREEN}✓ Variables d'environnement chargées${NC}"
    export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
else
    echo -e "${RED}✗ .env manquant${NC}"
    exit 1
fi

# Vérifier Supabase
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}✗ SUPABASE_URL manquant${NC}"
    exit 1
fi

PORT=${PORT:-3030}
echo -e "${YELLOW}  Port: $PORT${NC}"

# Tuer processus existants
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠  Arrêt du processus sur port $PORT${NC}"
    kill $(lsof -ti:$PORT) 2>/dev/null || true
    sleep 2
fi

echo -e "${GREEN}🎯 Lancement avec TSX (TypeScript direct)${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Lancer avec tsx (pas de compilation nécessaire!)
exec npx tsx src/index.ts
