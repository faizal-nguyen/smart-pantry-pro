#!/bin/bash

# Smart Pantry Pro - Script de démarrage complet
# Ce script lance l'application avec toutes les dépendances nécessaires

echo "🚀 Démarrage de Smart Pantry Pro..."
echo "=================================="

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier si nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: package.json non trouvé!${NC}"
    echo "Assurez-vous d'être dans le répertoire smart-pantry-pro"
    exit 1
fi

# Fonction pour vérifier si un port est utilisé
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Le port $1 est déjà utilisé${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Le port $1 est disponible${NC}"
        return 0
    fi
}

# Vérifier les ports nécessaires
echo -e "\n📍 Vérification des ports..."
PORT_3002_FREE=$(check_port 3002 && echo "true" || echo "false")
PORT_3001_FREE=$(check_port 3001 && echo "true" || echo "false")

# Demander confirmation si des ports sont occupés
if [ "$PORT_3002_FREE" = "false" ] || [ "$PORT_3001_FREE" = "false" ]; then
    echo -e "\n${YELLOW}Certains ports sont déjà utilisés.${NC}"
    echo "Voulez-vous arrêter les processus existants? (o/n)"
    read -r response
    if [[ "$response" =~ ^([oO][uU][iI]|[oO])$ ]]; then
        echo "Arrêt des processus existants..."
        lsof -ti:3002 | xargs kill -9 2>/dev/null
        lsof -ti:3001 | xargs kill -9 2>/dev/null
        sleep 2
    else
        echo -e "${RED}❌ Arrêt du démarrage${NC}"
        exit 1
    fi
fi

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo -e "\n📦 Installation des dépendances..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Erreur lors de l'installation des dépendances${NC}"
        exit 1
    fi
fi

# Vérifier les variables d'environnement
if [ ! -f ".env" ] && [ ! -f ".env.local" ]; then
    echo -e "\n${YELLOW}⚠️  Aucun fichier .env trouvé${NC}"
    echo "Création d'un fichier .env de base..."
    cat > .env.local << EOF
# Configuration de base pour Smart Pantry Pro
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_OPENAI_API_KEY=your_openai_api_key_here
CIPHER_ENCRYPTION_KEY=your_cipher_encryption_key_here

# Optionnel
VITE_GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key_here
VITE_DEEPGRAM_API_KEY=your_deepgram_api_key_here
EOF
    echo -e "${YELLOW}⚠️  Veuillez configurer le fichier .env.local avec vos clés API${NC}"
fi

# Afficher les informations de démarrage
echo -e "\n${GREEN}🎉 Démarrage de l'application...${NC}"
echo "=================================="
echo "📱 Interface Web: http://localhost:3002"
echo "🔌 API Server: http://localhost:3001"
echo "📊 Mode: Développement"
echo "=================================="

# Afficher les fonctionnalités principales
echo -e "\n✨ Fonctionnalités disponibles:"
echo "  • 🔒 Chiffrement Cipher pour les plans de repas"
echo "  • 👨‍👩‍👧‍👦 Mode Famille avec profils multiples"
echo "  • 🧠 Navigation intelligente avec suggestions contextuelles"
echo "  • 📸 Scanner de produits avec IA"
echo "  • 🎙️ Reconnaissance vocale pour les commandes"
echo "  • 📅 Planification de repas intelligente"
echo "  • 🛒 Liste de courses optimisée"
echo "  • 📊 Tableaux de bord et insights"

# Démarrer l'application
echo -e "\n${GREEN}🚀 Lancement des serveurs...${NC}"
echo "Appuyez sur Ctrl+C pour arrêter l'application"
echo ""

# Démarrer avec npm run dev (qui lance API + Vite)
npm run dev

# Gérer l'arrêt propre
trap cleanup EXIT

cleanup() {
    echo -e "\n${YELLOW}🛑 Arrêt de Smart Pantry Pro...${NC}"
    # Arrêter tous les processus Node sur les ports utilisés
    lsof -ti:3002 | xargs kill -9 2>/dev/null
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✅ Application arrêtée proprement${NC}"
}