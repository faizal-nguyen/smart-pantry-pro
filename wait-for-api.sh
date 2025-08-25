#!/bin/bash

echo "⏳ Attente du démarrage du serveur API..."
echo ""

COUNTER=0
MAX_TRIES=30

while [ $COUNTER -lt $MAX_TRIES ]; do
    if curl -s http://localhost:3003/api/health > /dev/null 2>&1; then
        echo "✅ Serveur API démarré !"
        echo ""
        
        # Test l'endpoint Instagram
        echo "🔍 Test de l'endpoint Instagram thumbnail..."
        RESPONSE=$(curl -s -X POST http://localhost:3003/api/social/instagram-thumbnail \
            -H "Content-Type: application/json" \
            -d '{"url":"https://www.instagram.com/reel/DHbVTRpo7p3/"}' \
            -w "\n%{http_code}")
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -1)
        BODY=$(echo "$RESPONSE" | head -n -1)
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ Endpoint Instagram trouvé et fonctionnel !"
            echo "$BODY" | python3 -m json.tool
        elif [ "$HTTP_CODE" = "404" ]; then
            echo "❌ Endpoint Instagram non trouvé (404)"
            echo "Le serveur n'a pas chargé les nouvelles routes"
        else
            echo "❌ Erreur HTTP: $HTTP_CODE"
            echo "$BODY"
        fi
        
        exit 0
    fi
    
    echo -n "."
    sleep 1
    COUNTER=$((COUNTER + 1))
done

echo ""
echo "❌ Timeout - Le serveur API n'a pas démarré après 30 secondes"
echo ""
echo "Vérifiez le terminal où vous avez lancé npm run api pour les erreurs"