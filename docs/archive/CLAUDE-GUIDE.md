# 🥘 GUIDE D'UTILISATION CLAUDE COMMANDS

## 🚀 COMMANDES SIMPLES POUR SMART PANTRY

### 📝 Comment Utiliser

```bash
# Méthode 1: Direct avec node
node claude-runner.js /debug-voice "Le micro ne fonctionne pas"

# Méthode 2: Avec npm (plus simple)
npm run claude:voice "Le micro ne fonctionne pas"
npm run claude:scanner "Le scanner ne reconnaît pas les codes"
npm run claude:smart-pantry "L'application est lente sur mobile"
```

### 🎯 COMMANDES DISPONIBLES

#### 🎤 VOICE & AI
```bash
npm run claude:voice "La reconnaissance vocale ne comprend pas 'j'ai 2 litres de lait'"
npm run claude:voice-ai "L'IA ne comprend pas mon inventaire"
```

#### 📱 SCANNER & CAMERA
```bash
npm run claude:scanner "Le scanner ne reconnaît pas les codes EAN-13"
npm run claude:inventory-camera "La caméra ne s'active pas sur mobile"
```

#### 🥘 SMART PANTRY COMPLETE
```bash
npm run claude:smart-pantry "Le scan de code-barres ne remplit pas les champs automatiquement"
```

### 📊 EXEMPLES CONCRETS

#### Problème Actuel (API Codes-Barres)
```bash
npm run claude:smart-pantry "Le scan de code-barres ne remplit pas les champs automatiquement, l'API fonctionne mais pas l'intégration"
```

#### Problème Reconnaissance Vocale
```bash
npm run claude:voice "La reconnaissance vocale ne comprend pas les quantités, le micro fonctionne mais le parsing est incorrect"
```

#### Problème Scanner Mobile
```bash
npm run claude:scanner "Le scanner ne reconnaît pas les codes-barres sur mobile, la caméra s'active mais aucun code n'est détecté"
```

#### Problème Performance Mobile
```bash
npm run claude:smart-pantry "L'application est lente sur mobile, PWA ne s'installe pas, performance dégradée"
```

### 🎯 RÉSULTATS ATTENDUS

Chaque commande vous donnera :

1. **🎯 Agent Assigné** - Quel agent spécialisé traite votre problème
2. **📊 Confiance** - Pourcentage de confiance dans l'analyse
3. **🚨 Urgence** - Niveau d'urgence du problème
4. **🧩 Complexité** - Complexité technique du bug
5. **🥘 Fonctionnalités** - Fonctionnalités Smart Pantry affectées
6. **🔧 Solution** - Étapes de résolution proposées
7. **✅ Validation** - Confirmation de la résolution

### 📋 EXEMPLE DE SORTIE

```bash
🥘 CLAUDE COMMAND: /debug-smart-pantry
📝 INPUT: Le scan de code-barres ne remplit pas les champs automatiquement
🎯 AGENT: analyze
=====================================

🥘 SMART PANTRY DEBUG AGENT: Analyse spécialisée...

🎯 AGENT ASSIGNÉ: 📱 INVENTORY & CAMERA DEBUG AGENT
📊 Confiance: 87.5%
🔧 Expertise: Gestion inventaire en temps réel, Scanner codes-barres (ZXing/QuaggaJS), Upload et traitement photos, Supabase Storage intégration

🚨 URGENCE: HIGH
🧩 COMPLEXITÉ: MEDIUM
🥘 FONCTIONNALITÉS AFFECTÉES: Camera & Barcode, AI Integration

📋 RAPPORT CLAUDE COMMAND:
==========================
🎯 Agent: INVENTORY_CAMERA
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

### 🎯 AVANTAGES

- **🚀 Simple** - Une seule commande pour diagnostiquer
- **🎯 Précis** - Agents spécialisés Smart Pantry
- **🔧 Pratique** - Solutions concrètes proposées
- **📊 Complet** - Analyse + Solution + Validation
- **🥘 Spécialisé** - Expertise Smart Pantry uniquement

### 📚 FICHIERS CRÉÉS

- `claude-runner.js` - Exécuteur des commandes .claude
- `claude-commands.md` - Documentation des commandes
- `CLAUDE-GUIDE.md` - Ce guide d'utilisation
- Scripts npm ajoutés dans `package.json`

### 🎉 PRÊT À UTILISER !

Vous pouvez maintenant diagnostiquer tous vos problèmes Smart Pantry avec des commandes simples ! 🥘🔧 