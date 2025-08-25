#!/bin/bash

echo "🔍 Test de l'endpoint Instagram après redémarrage"
echo "================================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL de test
URL="https://www.instagram.com/reel/DHbVTRpo7p3/"

echo "1️⃣  Vérification du serveur API..."
HEALTH=$(curl -s http://localhost:3003/api/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Serveur API actif${NC}"
    echo "   Response: $HEALTH"
else
    echo -e "${RED}❌ Serveur API non accessible${NC}"
    echo "   Lancez: npm run api"
    exit 1
fi

echo ""
echo "2️⃣  Test de l'endpoint Instagram thumbnail..."
RESPONSE=$(curl -s -X POST http://localhost:3003/api/social/instagram-thumbnail \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"$URL\"}" \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "404" ]; then
    echo -e "${RED}❌ Endpoint non trouvé (404)${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Le serveur n'a pas été redémarré !${NC}"
    echo ""
    echo "Actions requises :"
    echo "1. Arrêtez le serveur API (Ctrl+C dans le terminal)"
    echo "2. Relancez avec : npm run api"
    echo "3. Réexécutez ce script : ./test-instagram-after-restart.sh"
elif [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint trouvé !${NC}"
    echo "Response: $BODY"
    
    # Vérifier si on a une vignette
    if echo "$BODY" | grep -q "thumbnail_url"; then
        echo -e "${GREEN}✅ Vignette trouvée !${NC}"
        THUMBNAIL=$(echo "$BODY" | grep -o '"thumbnail_url":"[^"]*"' | cut -d'"' -f4)
        echo "   URL: $THUMBNAIL"
    else
        echo -e "${YELLOW}⚠️  Pas de vignette dans la réponse${NC}"
    fi
else
    echo -e "${RED}❌ Erreur HTTP: $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi

echo ""
echo "3️⃣  Test du script Python directement..."
cd "/Users/faizel/Documents/Mes documents/3_Dev/Projets/Smart Grocery/smart-pantry-pro"
PYTHON_RESULT=$(python3 api/instagram_metadata.py "$URL" 2>&1)
if echo "$PYTHON_RESULT" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Script Python fonctionne${NC}"
else
    echo -e "${RED}❌ Problème avec le script Python${NC}"
    echo "$PYTHON_RESULT"
fi

echo ""
echo "4️⃣  Pour tester dans le navigateur :"
echo "   http://localhost:3002/test-instagram-direct.html"
echo ""