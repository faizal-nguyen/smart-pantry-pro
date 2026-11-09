# 🎥 Guide d'utilisation - Extraction de recettes vidéo

## 🚀 Démarrage rapide

### En développement local

Pour utiliser l'extraction de recettes depuis Instagram/TikTok/YouTube, vous devez lancer le serveur API local :

```bash
# Terminal 1 - Serveur API (OBLIGATOIRE)
npm run api

# Terminal 2 - Application
npm run dev
```

Le serveur API doit tourner sur `http://localhost:3001` pour que l'extraction fonctionne.

### En production (Vercel)

L'extraction fonctionne automatiquement sans configuration supplémentaire grâce aux Vercel Functions.

## 📱 Plateformes supportées

- **Instagram** : Posts et Reels
- **TikTok** : Vidéos  
- **YouTube** : Toutes les vidéos

## 🎯 Comment utiliser

1. Allez sur la page **Mes Recettes** (`/recipes`)
2. Cliquez sur le bouton **Import Vidéo IA** 
3. Collez l'URL de la vidéo Instagram/TikTok/YouTube
4. Cliquez sur **Extraire**
5. L'IA va :
   - Télécharger la vidéo
   - Extraire l'audio avec **Deepgram**
   - Analyser le contenu avec **GPT-4**
   - Structurer la recette automatiquement

## ⚡ Temps de traitement

- Instagram : ~10-15 secondes
- TikTok : ~10-15 secondes  
- YouTube : ~15-20 secondes

## 🔧 Dépannage

### Erreur "Le serveur API local n'est pas démarré"

**Solution** : Lancez `npm run api` dans un terminal séparé

### Erreur "Failed to fetch"

**Causes possibles** :
- Le serveur API n'est pas lancé
- Le port 3001 est occupé
- Problème de connexion réseau

### L'extraction ne fonctionne pas

**Vérifiez que** :
1. L'URL est valide et publique
2. La vidéo contient bien une recette
3. Les clés API sont configurées (voir `VERCEL_API_SETUP.md`)

## 💰 Coûts

- **Deepgram** : ~0.01€ par minute de vidéo
- **OpenAI GPT-4** : ~0.03€ par extraction
- **Total** : ~0.04-0.06€ par recette

## 🔑 Configuration des clés API

Pour le développement local, créez un fichier `.env.local` :

```env
OPENAI_API_KEY=sk-...
DEEPGRAM_API_KEY=...
```

Pour la production, configurez ces variables dans Vercel Dashboard.

## 📊 Logs et débogage

Les logs détaillés sont affichés dans :
- Console du navigateur (F12)
- Terminal du serveur API
- Logs Vercel Functions (en production)

## 🚨 Limitations

- Durée max vidéo : 5 minutes
- Taille max : 100MB
- Langues : Français, Anglais
- Vidéos privées non supportées