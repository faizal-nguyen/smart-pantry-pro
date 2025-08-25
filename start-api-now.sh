#!/bin/bash

echo "🚀 Lancement du serveur API avec le nouvel endpoint Instagram"
echo "============================================================="
echo ""
echo "Le serveur va démarrer sur le port 3003"
echo "Gardez ce terminal ouvert pendant le développement"
echo ""
echo "Endpoints disponibles :"
echo "  - GET  http://localhost:3003/api/health"
echo "  - POST http://localhost:3003/api/social/instagram-thumbnail ← NOUVEAU !"
echo "  - POST http://localhost:3003/api/parse-video-recipe"
echo ""

npm run api