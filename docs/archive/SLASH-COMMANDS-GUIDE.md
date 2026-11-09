# 🥘 GUIDE COMMANDES SLASH SMART PANTRY

## 🚀 UTILISATION SIMPLE

### 📝 Comment Utiliser les Commandes Slash

Tapez simplement `/` dans l'interface Claude et vous verrez apparaître les commandes Smart Pantry :

```
/debug-voice [problème reconnaissance vocale]
/debug-scanner [problème scanner codes-barres]
/debug-smart-pantry [problème Smart Pantry complet]
/debug-voice-ai [problème IA conversationnelle]
/debug-inventory-camera [problème inventaire/caméra]
```

## 🎯 COMMANDES DISPONIBLES

### 🎤 `/debug-voice` - Reconnaissance Vocale & IA
**Pour :** Problèmes de micro, reconnaissance vocale, parsing des commandes
```bash
/debug-voice "La reconnaissance vocale ne comprend pas 'j'ai 2 litres de lait'"
/debug-voice "Le micro ne fonctionne pas sur mobile"
/debug-voice "L'IA ne comprend pas mon inventaire"
```

### 📱 `/debug-scanner` - Scanner Codes-Barres & Caméra
**Pour :** Problèmes de scanner, caméra, upload photos
```bash
/debug-scanner "Le scanner ne reconnaît pas les codes EAN-13"
/debug-scanner "La caméra ne s'active pas sur mobile"
/debug-scanner "Upload photos échoue sur Supabase"
```

### 🥘 `/debug-smart-pantry` - Analyse Complète (RECOMMANDÉ)
**Pour :** Tous les problèmes Smart Pantry, classification automatique
```bash
/debug-smart-pantry "Le scan de code-barres ne remplit pas les champs automatiquement"
/debug-smart-pantry "L'application est lente sur mobile"
/debug-smart-pantry "Sync problèmes entre devices"
```

### 🤖 `/debug-voice-ai` - IA Conversationnelle
**Pour :** Problèmes spécifiques d'IA, OpenAI, suggestions
```bash
/debug-voice-ai "L'IA ne comprend pas mon inventaire"
/debug-voice-ai "Pas de suggestions de recettes"
/debug-voice-ai "Réponses OpenAI incohérentes"
```

### 📦 `/debug-inventory-camera` - Inventaire & Caméra
**Pour :** Problèmes d'inventaire, base de données, photos
```bash
/debug-inventory-camera "Produits ne s'ajoutent pas à l'inventaire"
/debug-inventory-camera "La caméra ne s'active pas sur mobile"
/debug-inventory-camera "Upload photos échoue sur Supabase"
```

## 📊 EXEMPLES CONCRETS

### 🎯 Problème Actuel (API Codes-Barres)
```bash
/debug-smart-pantry "Le scan de code-barres ne remplit pas les champs automatiquement, l'API fonctionne mais pas l'intégration"
```

### 🎤 Problème Reconnaissance Vocale
```bash
/debug-voice "La reconnaissance vocale ne comprend pas les quantités, le micro fonctionne mais le parsing est incorrect"
```

### 📱 Problème Scanner Mobile
```bash
/debug-scanner "Le scanner ne reconnaît pas les codes-barres sur mobile, la caméra s'active mais aucun code n'est détecté"
```

### 🥘 Problème Performance Mobile
```bash
/debug-smart-pantry "L'application est lente sur mobile, PWA ne s'installe pas, performance dégradée"
```

## 🎯 RÉSULTATS ATTENDUS

Chaque commande slash vous donnera :

1. **🎯 Agent Assigné** - Quel agent spécialisé traite votre problème
2. **📊 Confiance** - Pourcentage de confiance dans l'analyse
3. **🚨 Urgence** - Niveau d'urgence du problème
4. **🧩 Complexité** - Complexité technique du bug
5. **🥘 Fonctionnalités** - Fonctionnalités Smart Pantry affectées
6. **🔧 Solution** - Étapes de résolution proposées
7. **✅ Validation** - Confirmation de la résolution

## 📋 EXEMPLE DE SORTIE

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

🔧 SOLUTION PROPOSÉE:
=====================
1. Tester accès caméra (navigator.mediaDevices)
2. Vérifier configuration scanner codes-barres
3. Analyser intégration OpenFoodFacts API
4. Tester upload photos Supabase Storage
5. Valider synchronisation inventaire temps réel
6. Confirmer optimisation mobile PWA

✅ CLAUDE COMMAND EXÉCUTÉE AVEC SUCCÈS!
```

## 🎯 AVANTAGES

- **🚀 Simple** - Tapez `/` et choisissez la commande
- **🎯 Précis** - Agents spécialisés Smart Pantry
- **🔧 Pratique** - Solutions concrètes proposées
- **📊 Complet** - Analyse + Solution + Validation
- **🥘 Spécialisé** - Expertise Smart Pantry uniquement

## 📚 FICHIERS CRÉÉS

- `slash-commands.md` - Documentation des commandes slash
- `claude-slash-config.json` - Configuration des commandes
- `SLASH-COMMANDS-GUIDE.md` - Ce guide d'utilisation

## 🎉 PRÊT À UTILISER !

Vous pouvez maintenant diagnostiquer tous vos problèmes Smart Pantry en tapant simplement `/` dans l'interface Claude ! 🥘🔧

### 🚀 COMMENCER MAINTENANT

Tapez `/debug-smart-pantry` suivi de votre problème pour commencer ! 