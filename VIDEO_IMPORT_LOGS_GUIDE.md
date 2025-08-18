# 📊 Guide des Logs - Import Vidéo Ultra-Rapide

## 🎯 Vue d'ensemble

Le système d'import vidéo ultra-rapide inclut des logs détaillés à chaque étape pour faciliter le débogage et l'optimisation des performances.

## 🔍 Structure des Logs

### 1. **Frontend (React)**
```
🎆 [useFastVideoRecipe] Hook initialized
🎬 [useFastVideoRecipe] parseVideo called
📱 [useFastVideoRecipe] Platform: youtube
📡 [useFastVideoRecipe] Calling API endpoint...
```

### 2. **API Endpoint**
```
🎬 [API] Video recipe parser started
🔗 [API] Video URL: https://youtube.com/...
🚀 [API] Starting video processing...
```

### 3. **FastVideoParser (Service Principal)**
```
🎆 [FastVideoParser] Initializing...
🔑 [FastVideoParser] OpenAI API Key: Present
🚀 [FastVideoParser] Phase 1: Starting extraction...
🎯 [FastVideoParser] Launching 3 parallel tasks:
  1️⃣ Metadata extraction
  2️⃣ Audio transcription
  3️⃣ Frame extraction
```

### 4. **AudioExtractor (Deepgram)**
```
🎤 [AudioExtractor] Initializing...
🔑 [AudioExtractor] Deepgram API Key: Present (717a457d...)
📡 [AudioExtractor] Calling Deepgram API...
🎯 [AudioExtractor] Deepgram API call took 3542ms
📝 [AudioExtractor] Transcript stats:
  - Length: 2456 characters
  - Words: ~412 words
  - Confidence: 94.3%
```

## 🚦 Codes de Statut

- ✅ **Succès** : Opération réussie
- ⚠️ **Avertissement** : Fonctionnement dégradé ou fallback
- ❌ **Erreur** : Échec de l'opération
- 🚀 **Démarrage** : Début d'une opération
- 🎯 **Progression** : Étape intermédiaire
- 🏁 **Fin** : Opération terminée

## 📈 Analyse des Performances

### Temps Attendus par Phase

1. **Extraction Parallèle** (5-20 secondes)
   - Metadata: 1-2s
   - Audio (Deepgram): 3-5s
   - Frames (Cloudinary): 3-5s

2. **GPT-4 Synthesis** (10-15 secondes)

3. **Total**: 15-45 secondes

### Identifier les Goulots d'Étranglement

Recherchez ces patterns dans les logs :

```bash
# Temps excessif Deepgram (>10s)
🎯 [AudioExtractor] Deepgram API call took 15234ms

# Échec et fallback
⚠️ [AudioExtractor] Direct URL transcription failed
🔄 [AudioExtractor] Trying audio extraction fallback...

# Timeout
⏰ [API] Request timeout after 45 seconds
```

## 🛠️ Script de Test

Utilisez le script de test pour vérifier votre configuration :

```bash
# Installer les dépendances de test
npm install node-fetch @deepgram/sdk dotenv

# Lancer les tests
node test-video-import-logs.js
```

### Ce que teste le script :

1. **Variables d'environnement** ✅
   - DEEPGRAM_API_KEY
   - CLOUDINARY_CLOUD_NAME
   - OPENAI_API_KEY

2. **Connexion Deepgram** ✅
   - Test avec audio de démonstration
   - Vérification de la transcription

3. **API d'import vidéo** ✅
   - Test end-to-end complet
   - Mesure du temps de traitement

## 🔧 Filtrer les Logs

### Dans le navigateur (Console)

```javascript
// Voir uniquement les logs Deepgram
console.log = ((oldLog) => {
  return (...args) => {
    if (args[0]?.includes('[AudioExtractor]')) {
      oldLog(...args);
    }
  };
})(console.log);

// Voir uniquement les erreurs
console.log = ((oldLog) => {
  return (...args) => {
    if (args[0]?.includes('❌') || args[0]?.includes('⚠️')) {
      oldLog(...args);
    }
  };
})(console.log);
```

### Dans le terminal (Node.js)

```bash
# Voir uniquement les logs API
npm run dev | grep "\[API\]"

# Voir uniquement les erreurs
npm run dev | grep -E "❌|⚠️|Error"

# Voir les temps de traitement
npm run dev | grep -E "took|Total time|Processing time"
```

## 📊 Métriques Clés à Surveiller

1. **Temps de réponse Deepgram**
   - Optimal: < 5 secondes
   - Acceptable: 5-10 secondes
   - Problématique: > 10 secondes

2. **Taux de succès**
   - Transcription réussie vs fallback
   - Extraction frames réussie
   - Parse GPT-4 réussi

3. **Confidence Score**
   - > 0.9: Excellent
   - 0.7-0.9: Bon
   - < 0.7: Vérifier la qualité

## 🐛 Résolution des Problèmes Courants

### 1. "Deepgram API key not configured"
```bash
# Vérifier .env.local
cat .env.local | grep DEEPGRAM_API_KEY

# Solution : Ajouter la clé
echo "DEEPGRAM_API_KEY=your_key_here" >> .env.local
```

### 2. "Request timeout after 45 seconds"
- Vérifier la taille de la vidéo
- Utiliser une vidéo plus courte pour les tests
- Augmenter le timeout dans .env.local

### 3. "No transcript generated"
- Vérifier que la vidéo contient de l'audio
- Tester avec une URL directe (pas de restriction CORS)
- Vérifier les crédits Deepgram

## 💡 Tips d'Optimisation

1. **Réduire la latence Deepgram**
   ```javascript
   // Utiliser le streaming pour les longues vidéos
   model: 'nova-2-phonecall' // Plus rapide pour la voix
   ```

2. **Cache les résultats**
   - Implémenter un cache Redis pour les URLs déjà traitées
   - Stocker les transcriptions pour 24h

3. **Parallélisation maximale**
   - Lancer l'extraction de frames dès le début
   - Ne pas attendre la transcription complète

## 📝 Format des Logs en Production

Pour la production, adaptez les logs :

```javascript
// Production: Format JSON structuré
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  service: 'AudioExtractor',
  action: 'deepgram_call',
  duration_ms: 3542,
  success: true,
  metadata: {
    transcript_length: 2456,
    confidence: 0.943
  }
}));
```

Utilisez un service comme Datadog ou CloudWatch pour agréger et analyser ces logs structurés.