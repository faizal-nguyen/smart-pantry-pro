# 🔧 Fix Instagram Thumbnail - Instructions

## État actuel
- ✅ Le script Python `api/instagram_metadata.py` fonctionne correctement
- ✅ L'endpoint `/api/v1/social/instagram/thumbnail` est fourni par `apps/api` (Express TS)
- ❌ Le serveur API doit être redémarré pour prendre en compte les changements

## Actions à effectuer

### 1. Redémarrer le serveur API

Dans le terminal où vous avez lancé `npm run api` :
1. Appuyez sur `Ctrl+C` pour arrêter le serveur
2. Relancez avec : `npm run api`

### 2. Vérifier que tout fonctionne

Ouvrez dans votre navigateur :
```
http://localhost:3002/test-instagram-direct.html
```

Cette page de test vous permettra de :
- 🟡 Tester l'API directement sur port 3003
- 🔵 Tester via le proxy Vite
- 🟢 Voir les commandes pour tester le script Python
- 🟣 Tester le flux complet

### 3. Résolution des problèmes

Si les vignettes ne s'affichent toujours pas :

#### Vérifier Python et Instaloader
```bash
# Vérifier Python
python3 --version

# Vérifier Instaloader
pip3 show instaloader

# Si Instaloader n'est pas installé
pip3 install instaloader
```

#### Tester le script Python directement
```bash
cd "/Users/faizel/Documents/Mes documents/3_Dev/Projets/Smart Grocery/smart-pantry-pro"
python3 api/instagram_metadata.py "https://www.instagram.com/reel/DHbVTRpo7p3/"
```

#### Vérifier les logs
Dans la console du navigateur (F12), vous devriez voir des logs colorés :
- 🎬 DÉBUT EXTRACTION INSTAGRAM (rose)
- 📍 URL (bleu)
- 🔧 Port (vert)
- 📦 DONNÉES REÇUES DE L'API (orange)

## Architecture mise en place

```
Frontend (Port 3002)
    ↓
Proxy Vite (/api/*)
    ↓
API Server (Port 3003)
    ↓
Endpoint /api/social/instagram-thumbnail
    ↓
Script Python (instagram_metadata.py)
    ↓
Instaloader → Instagram
```

## Fichiers modifiés

1. **apps/api** : Utiliser `POST /api/v1/social/instagram/thumbnail`
2. **InstagramVideoExtractor.tsx** : Ajout de logs détaillés et récupération séparée de vignette
3. **useInstagramThumbnail.ts** : Hook pour extraire les vignettes
4. **test-instagram-direct.html** : Page de test complète

## Logs à surveiller

Dans le terminal du serveur API :
```
📸 Instagram thumbnail endpoint called
[Instagram Thumbnail] Python process exited with code: 0
[Instagram Thumbnail] Result: { success: true, hasThumbnail: true }
```

Dans la console du navigateur :
```
🎬 DÉBUT EXTRACTION INSTAGRAM
📦 DONNÉES REÇUES DE L'API
✅ Thumbnail trouvée: { type: 'string', hasUrl: true }
```
