# 🚀 Configuration des API Vercel Functions

## Variables d'environnement requises

Pour que les fonctionnalités d'import vidéo avec IA fonctionnent sur Vercel, vous devez configurer ces variables d'environnement dans votre dashboard Vercel :

### 1. **OPENAI_API_KEY** (Obligatoire)
- Obtenez une clé API sur [OpenAI Platform](https://platform.openai.com/api-keys)
- Utilisée pour l'analyse des recettes avec GPT-4

### 2. **DEEPGRAM_API_KEY** (Obligatoire)
- Obtenez une clé API sur [Deepgram Console](https://console.deepgram.com/)
- Utilisée pour la transcription audio des vidéos

### 3. **Variables Supabase** (Déjà configurées)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

## Configuration sur Vercel

1. Allez dans votre [Dashboard Vercel](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans Settings → Environment Variables
4. Ajoutez chaque variable :
   ```
   OPENAI_API_KEY = sk-...
   DEEPGRAM_API_KEY = ...
   ```
5. Redéployez votre application

## Endpoints API disponibles

Une fois déployé, ces endpoints seront automatiquement disponibles :

- **POST /api/parse-video-recipe** : Extraction de recettes depuis des vidéos (Instagram, TikTok, YouTube)
  - Utilise Deepgram pour la transcription
  - Utilise GPT-4 pour l'analyse
  - Temps de traitement : 5-10 secondes

## Test local

Pour tester localement avec le serveur API :

```bash
# Terminal 1 : API locale
npm run api

# Terminal 2 : App
npm run dev
```

## Coûts estimés

- **Deepgram** : ~$0.0125 par minute de vidéo
- **OpenAI GPT-4** : ~$0.03 par extraction de recette
- **Total par recette** : ~$0.04 - $0.06

## Limites

- Durée max par fonction : 30 secondes
- Taille max de la requête : 4.5MB
- Vidéos supportées : Instagram, TikTok, YouTube

## Support

En cas de problème :
1. Vérifiez les logs Vercel Functions
2. Vérifiez que les clés API sont valides
3. Testez d'abord en local avec `npm run api`