#!/bin/bash

echo "🔄 Script de redémarrage du serveur API"
echo "======================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Trouver le PID du serveur API
PID=$(lsof -ti :3003)

if [ -z "$PID" ]; then
    echo -e "${YELLOW}⚠️  Aucun serveur API trouvé sur le port 3003${NC}"
    echo ""
    echo "Lancement du serveur API..."
    npm run api
else
    echo -e "${RED}🛑 Serveur API trouvé (PID: $PID)${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Ce script va tuer le processus existant${NC}"
    echo "Si vous préférez le faire manuellement :"
    echo "1. Allez dans le terminal où npm run api est en cours"
    echo "2. Appuyez sur Ctrl+C"
    echo "3. Relancez avec : npm run api"
    echo ""
    read -p "Voulez-vous que le script tue le processus ? (y/N) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Arrêt du serveur API..."
        kill -9 $PID
        sleep 2
        
        echo -e "${GREEN}✅ Serveur arrêté${NC}"
        echo ""
        echo "Lancement du nouveau serveur API..."
        echo -e "${YELLOW}Note: Gardez ce terminal ouvert${NC}"
        echo ""
        npm run api
    else
        echo ""
        echo "Opération annulée."
        echo ""
        echo "Pour redémarrer manuellement :"
        echo "1. Trouvez le terminal avec npm run api"
        echo "2. Ctrl+C pour arrêter"
        echo "3. npm run api pour relancer"
    fi
fi