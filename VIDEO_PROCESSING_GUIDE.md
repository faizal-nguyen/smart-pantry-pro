# 🎥 Guide d'Utilisation - Video Processing Backend

## 🚀 Installation et Configuration

### 1. Prérequis
- Python 3.8+
- Redis
- FFmpeg (pour le traitement vidéo)
- Au moins 4GB de RAM disponible

### 2. Installation des dépendances système

#### macOS
```bash
# Installer Homebrew si nécessaire
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer les dépendances
brew install python3 redis ffmpeg
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install python3 python3-pip redis-server ffmpeg
```

### 3. Configuration de l'API OpenAI

1. Obtenez une clé API OpenAI depuis [platform.openai.com](https://platform.openai.com)
2. Éditez `api/video-processor/.env`:
```bash
OPENAI_API_KEY=sk-...votre-clé-ici...
```

## 🎬 Démarrage du Backend

### Méthode Simple (Recommandée)
```bash
./start-video-backend.sh
```

### Méthode Manuelle
```bash
# Terminal 1 - Redis
redis-server

# Terminal 2 - API
cd api/video-processor
source venv/bin/activate
uvicorn app:app --reload

# Terminal 3 - Celery Worker
cd api/video-processor
source venv/bin/activate
celery -A celery_tasks worker --loglevel=info

# Terminal 4 - Flower (optionnel, monitoring)
cd api/video-processor
source venv/bin/activate
celery -A celery_tasks flower
```

## 📱 Utilisation dans l'Application

### 1. Import Vidéo Standard
- Cliquez sur le bouton flottant vidéo (en bas à droite)
- Collez une URL YouTube, Instagram ou TikTok
- L'application utilisera automatiquement le backend si disponible

### 2. Fonctionnalités Disponibles
- ✅ **Extraction de frames** : Une image toutes les 30 secondes
- ✅ **Transcription audio** : Conversion parole en texte (multi-langues)
- ✅ **OCR sur images** : Extraction du texte visible dans la vidéo
- ✅ **Analyse AI** : Extraction intelligente des recettes

### 3. Progression en Temps Réel
- Barre de progression détaillée
- Étapes du traitement visibles
- Estimation du temps restant

## 🔧 Configuration Avancée

### Limites et Quotas
Éditez `api/video-processor/config.py`:
```python
# Durée maximale des vidéos (secondes)
MAX_VIDEO_DURATION = 600  # 10 minutes

# Taille maximale des fichiers (bytes)
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB

# Nombre de frames à extraire
MAX_FRAMES = 20
FRAME_INTERVAL = 30  # secondes
```

### Modèles Whisper
Pour de meilleures performances, modifiez dans `.env`:
```bash
# Options: tiny, base, small, medium, large
WHISPER_MODEL=base
```

### Coûts Estimés
- **Extraction frames** : Gratuit (OpenCV)
- **Transcription** : Gratuit (Whisper local)
- **OCR** : ~0.01$ par frame (OpenAI Vision)
- **Total par vidéo** : ~0.20$ pour une vidéo de 10 minutes

## 🐛 Dépannage

### Erreur "Redis connection refused"
```bash
# Vérifier si Redis est lancé
redis-cli ping
# Doit répondre: PONG

# Si non, lancer Redis
redis-server
```

### Erreur "FFmpeg not found"
```bash
# Vérifier l'installation
ffmpeg -version

# Si non installé
brew install ffmpeg  # macOS
sudo apt install ffmpeg  # Ubuntu
```

### Vidéo trop longue
- Le backend limite les vidéos à 10 minutes par défaut
- Modifiez `MAX_VIDEO_DURATION` dans config.py si nécessaire

### Mémoire insuffisante
- Whisper nécessite ~1-4GB de RAM selon le modèle
- Utilisez un modèle plus petit: `WHISPER_MODEL=tiny`

## 📊 Monitoring

### Dashboard Flower
Accédez à http://localhost:5555 pour:
- Voir les tâches en cours
- Historique des traitements
- Performance des workers
- Files d'attente

### Logs
```bash
# Voir les logs de l'API
tail -f api/video-processor/logs/app.log

# Voir les logs Celery
tail -f api/video-processor/logs/celery.log
```

## 🔐 Sécurité

### API Key (Optionnel)
Pour sécuriser l'accès:
1. Générez une clé: `openssl rand -hex 32`
2. Ajoutez dans `.env`: `API_KEY=votre-clé`
3. L'app l'utilisera automatiquement

### CORS
Par défaut, seul localhost est autorisé. Pour modifier:
```python
# Dans app.py
ALLOWED_ORIGINS = ["http://localhost:5173", "https://votre-domaine.com"]
```

## 🚢 Déploiement Production

### Docker (Recommandé)
```bash
cd api/video-processor
docker-compose up -d
```

### Services Gérés
- **Heroku**: Utilisez le Procfile fourni
- **AWS**: EC2 avec au moins 4GB RAM
- **DigitalOcean**: Droplet 4GB minimum

### Variables d'Environnement Production
```bash
REDIS_URL=redis://your-redis-url
OPENAI_API_KEY=sk-...
API_KEY=your-secret-key
ENVIRONMENT=production
```

## 💡 Tips & Astuces

1. **Vidéos Instagram privées** : L'utilisateur doit être connecté
2. **Vidéos YouTube avec sous-titres** : Extraction automatique
3. **TikTok** : Fonctionne mieux avec l'URL complète (pas mobile)
4. **Performance** : Utilisez SSD pour stocker les fichiers temporaires

## 📞 Support

Si vous rencontrez des problèmes:
1. Vérifiez les logs dans `api/video-processor/logs/`
2. Consultez la documentation API: http://localhost:8000/docs
3. Vérifiez que toutes les dépendances sont installées

---

🎉 **Profitez de l'extraction automatique de recettes depuis vos vidéos préférées!**