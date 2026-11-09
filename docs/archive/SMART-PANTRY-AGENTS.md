# SMART PANTRY DEBUG AGENTS 🥘🔧

## MISSION
Débugger efficacement les problèmes spécifiques de l'application Smart Pantry avec expertise ciblée.

## AGENTS SPÉCIALISÉS

---

## 🎤 VOICE & AI INTEGRATION DEBUG AGENT

### SPÉCIALITÉ
- Reconnaissance vocale (Web Speech API)
- Intégration OpenAI API
- Parsing intelligent des commandes vocales
- Gestion des réponses IA contextuelles

### EXPERTISE TECHNIQUE
```yaml
Voice Recognition:
  - Web Speech API configuration
  - Browser compatibility issues
  - Microphone permissions handling
  - Language detection (français)
  - Noise cancellation problems

Text Processing:
  - NLP parsing ("2 pommes" → quantity: 2, item: "pommes")
  - Regex patterns pour quantités/unités
  - Gestion des variations linguistiques
  - Fallback sur parsing échoué

OpenAI Integration:
  - API rate limiting
  - Context management pour inventory
  - Prompt engineering pour recettes
  - Response formatting (JSON structured)
  - Error handling API timeouts

Smart Logic:
  - Inventory analysis pour suggestions
  - Matching ingrédients disponibles/recettes
  - Calcul automatique manquants
  - Shopping list generation
```

### INDICATEURS DE BUGS
```yaml
VOICE BUGS:
  - "Micro ne fonctionne pas"
  - "La reconnaissance est mauvaise"
  - "Rien ne se passe quand je parle"
  - "Le texte reconnu est incorrect"
  - "Permissions micro refusées"

AI BUGS:
  - "L'IA ne comprend pas mon inventaire"
  - "Pas de suggestions de recettes"
  - "Réponses OpenAI incohérentes"
  - "Erreur API OpenAI"
  - "Calcul ingrédients manquants faux"

PARSING BUGS:
  - "Quantités mal détectées"
  - "Produits non reconnus"
  - "Unités incorrectes"
  - "Commandes vocales ignorées"
```

### ACTIONS DE DEBUG
```yaml
Voice Investigation:
  - Test permissions navigator.mediaDevices
  - Vérification SpeechRecognition support
  - Log des événements speech (start, result, error)
  - Test différents navigateurs/devices
  - Analyse qualité audio input

AI Troubleshooting:
  - Log des prompts envoyés OpenAI
  - Analyse responses structure
  - Test avec différents contexts
  - Validation JSON parsing
  - Monitoring rate limits

Smart Logic Debug:
  - Trace inventory data flow
  - Test matching algorithms
  - Validation calculs quantités
  - Debug recipe suggestion logic
```

### COMMANDES SPÉCIALISÉES
```bash
npm run debug:voice [issue-description]           # Problèmes reconnaissance vocale
npm run debug:voice-ai [conversation-context]     # Bugs IA conversationnelle  
npm run debug:smart-pantry [voice-issue]          # Parsing text-to-data
```

---

## 📱 INVENTORY & CAMERA DEBUG AGENT

### SPÉCIALITÉ
- Gestion inventaire en temps réel
- Scanner codes-barres (ZXing/QuaggaJS)
- Upload et traitement photos
- Supabase Storage intégration

### EXPERTISE TECHNIQUE
```yaml
Inventory Management:
  - CRUD operations Supabase
  - Real-time updates
  - Data synchronization
  - Optimistic updates UX
  - State management (Context/Zustand)

Camera & Scanning:
  - Camera access (navigator.mediaDevices)
  - Barcode recognition libraries
  - OpenFoodFacts API integration
  - Image capture et compression
  - OCR pour tickets de caisse

Photo Management:
  - Supabase Storage upload
  - Image optimization (compression, resize)
  - Thumbnail generation
  - CDN delivery
  - Offline caching

Mobile Optimization:
  - PWA implementation
  - Service Workers
  - Offline functionality
  - Touch gestures
  - Responsive design
```

### INDICATEURS DE BUGS
```yaml
INVENTORY BUGS:
  - "Produits ne s'ajoutent pas"
  - "Quantités incorrectes"
  - "Dates expiration mal sauvées"
  - "Sync problèmes entre devices"
  - "Inventaire ne se rafraîchit pas"

CAMERA BUGS:
  - "Scanner ne fonctionne pas"
  - "Caméra ne s'active pas"
  - "Codes-barres non reconnus"
  - "Photos floues ou mal orientées"
  - "Upload photos échoue"

STORAGE BUGS:
  - "Images ne s'affichent pas"
  - "Upload Supabase lent/échoue"
  - "Thumbnails non générés"
  - "Problèmes permissions RLS"
  - "Cache images corrompu"

MOBILE BUGS:
  - "App lente sur mobile"
  - "PWA ne s'installe pas"
  - "Offline mode bugué"
  - "Touch gestures ratés"
  - "Interface non responsive"
```

### ACTIONS DE DEBUG
```yaml
Inventory Investigation:
  - Test Supabase connections
  - Analyse RLS policies
  - Debug state synchronization
  - Trace CRUD operations
  - Monitor real-time subscriptions

Camera Troubleshooting:
  - Test camera permissions
  - Debug barcode recognition
  - Analyse image quality
  - Test différents devices
  - Monitor API calls (OpenFoodFacts)

Storage Debug:
  - Test Supabase Storage upload
  - Analyse image compression
  - Debug CDN delivery
  - Test RLS bucket policies
  - Monitor bandwidth usage

Mobile Optimization:
  - Lighthouse audit
  - Performance profiling
  - PWA manifest validation
  - Service Worker debugging
  - Touch event analysis
```

### COMMANDES SPÉCIALISÉES
```bash
npm run debug:scanner [barcode-type]              # Scanner codes-barres
npm run debug:inventory-camera [device-info]       # Accès caméra mobile
npm run debug:smart-pantry [upload-error]          # Upload/storage images
```

## WORKFLOW DE RÉSOLUTION

### Étape 1: Classification Automatique
```yaml
Voice/AI Issues → VOICE & AI INTEGRATION AGENT
Inventory/Camera Issues → INVENTORY & CAMERA AGENT
Mixed Issues → Coordination des 2 agents
```

### Étape 2: Investigation Approfondie
```yaml
Context Collection:
  - User device/browser info
  - Console errors analysis
  - Network requests inspection
  - State/data examination
  - User journey reproduction
```

### Étape 3: Solution Ciblée
```yaml
Root Cause Analysis:
  - Identifier cause réelle
  - Tester reproduction locale
  - Développer fix spécifique
  - Valider sur différents devices
  - Confirmer résolution complète
```

## MÉTRIQUES DE SUCCÈS

### KPIs Smart Pantry
```yaml
Voice Recognition Accuracy: > 95%
Barcode Scan Success Rate: > 90%
Photo Upload Success: > 98%
AI Response Relevance: > 90%
Mobile Performance Score: > 85 (Lighthouse)
Offline Functionality: 100% core features
```

## EXEMPLES D'UTILISATION

### Bug Voice
```bash
npm run debug:voice "La reconnaissance vocale ne comprend pas 'j'ai 2 litres de lait'"

# Agent analyse:
# - Parsing regex pour quantité + unité + produit
# - Test language settings (fr-FR)
# - Debug speech recognition events
# - Fix: Améliorer regex patterns + fallback parsing
```

### Bug Scanner
```bash
npm run debug:scanner "Le scanner ne reconnaît pas les codes EAN-13"

# Agent analyse:
# - Test ZXing configuration
# - Vérification qualité image caméra  
# - Test sur différents codes-barres
# - Fix: Ajuster paramètres détection + améliorer éclairage UI
```

### Bug AI Integration (cas actuel)
```bash
npm run debug:smart-pantry "Le scan de code-barres ne remplit pas les champs automatiquement"

# Agent analyse:
# - Test API OpenFoodFacts
# - Debug intégration dans AddProductDialog
# - Vérification parsing des données
# - Fix: Améliorer gestion des réponses API + auto-fill
```

## COMMANDES DISPONIBLES

### Agents Génériques
```bash
npm run debug:analyze [bug-description]     # Analyse complète
npm run debug:quick [description]            # Analyse rapide
```

### Agents Smart Pantry Spécialisés
```bash
npm run debug:voice [voice-issue]            # Problèmes reconnaissance vocale
npm run debug:scanner [scanner-issue]        # Scanner codes-barres
npm run debug:smart-pantry [issue]           # Analyse Smart Pantry complète
npm run debug:voice-ai [ai-issue]            # Bugs IA conversationnelle
npm run debug:inventory-camera [camera-issue] # Accès caméra/inventaire
```

## RÉSULTATS ATTENDUS

### Rapport Typique Smart Pantry
```
🥘 SMART PANTRY DEBUG AGENTS
============================

🥘 SMART PANTRY DEBUG AGENT: Analyse spécialisée...

🎯 AGENT ASSIGNÉ: 📱 INVENTORY & CAMERA DEBUG AGENT
📊 Confiance: 87.5%
🔧 Expertise: Gestion inventaire en temps réel, Scanner codes-barres (ZXing/QuaggaJS), Upload et traitement photos, Supabase Storage intégration

🚨 URGENCE: HIGH
🧩 COMPLEXITÉ: MEDIUM
🥘 FONCTIONNALITÉS AFFECTÉES: Camera & Barcode, AI Integration

🔍 INVESTIGATION SMART PANTRY EN COURS...
   ├─ Analyse du contexte Smart Pantry...
   ├─ Vérification des fonctionnalités affectées...
   ├─ Test de reproduction sur mobile/web...
   ├─ Identification de la cause racine spécifique...
   └─ Planification de la solution Smart Pantry...

📋 RAPPORT SMART PANTRY COMPLET:
=================================
🎯 Agent Principal: 📱 INVENTORY & CAMERA DEBUG AGENT
📊 Confiance: 87.5%
🚨 Urgence: HIGH
🧩 Complexité: MEDIUM
🥘 Fonctionnalités: Camera & Barcode, AI Integration
✅ Validation: SUCCESS
```

## INTÉGRATION AVEC LE PROJET

Les agents Smart Pantry sont maintenant intégrés au projet et peuvent diagnostiquer automatiquement :

1. **Problèmes de reconnaissance vocale** - Micro, parsing, IA
2. **Bugs de scanner codes-barres** - Caméra, API OpenFoodFacts
3. **Problèmes d'inventaire** - Supabase, synchronisation
4. **Bugs d'upload photos** - Storage, compression
5. **Problèmes de performance mobile** - PWA, optimisation

### Utilisation dans le Contexte Actuel

```bash
# Pour diagnostiquer le problème d'API codes-barres actuel
npm run debug:smart-pantry "Le scan de code-barres ne remplit pas les champs automatiquement, l'API fonctionne mais pas l'intégration"

# Pour analyser les problèmes de reconnaissance vocale
npm run debug:voice "La reconnaissance vocale ne comprend pas les quantités"

# Pour diagnostiquer les problèmes de scanner
npm run debug:scanner "Le scanner ne reconnaît pas les codes-barres sur mobile"
```

## AVANTAGES SPÉCIFIQUES SMART PANTRY

### 🎯 Classification Intelligente Automatique
- "La reconnaissance vocale bug" → Agent Voice & AI
- "Le scanner marche pas" → Agent Inventory & Camera
- "Photos ne s'uploadent pas" → Agent Inventory & Camera
- "L'IA suggère n'importe quoi" → Agent Voice & AI

### 🔧 Expertise Ciblée
- **Voice & AI Agent** : Web Speech API, OpenAI, Parsing
- **Inventory & Camera Agent** : Supabase, ZXing, Mobile optimization

### ✅ Résolution Garantie
- Reproduction du bug sur votre stack spécifique
- Root cause analysis (pas de "essayez ça")
- Fix testé sur mobile + web
- Validation complète avant clôture 