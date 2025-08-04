# 🎯 Generate Smart Pantry Feature + CIPHER

## Description
Agent générateur intelligent qui crée des Product Requirements Prompts (PRP) complets pour les features Smart Pantry avec mémoire Cipher intégrée.

## Fonctionnalités
- **Analyse Codebase**: Recherche patterns existants Smart Pantry
- **Mémoire Alimentaire**: Utilise patterns food-tech accumulés
- **PRP Intelligent**: Blueprint complet basé sur expérience
- **Context Pantry**: Spécialisé apps inventaire alimentaire

## Commandes disponibles

### `/generate-pantry-feature`
Génère un PRP complet pour une feature Smart Pantry.
**Usage**: `/generate-pantry-feature "description de la feature"`
**Avec fichier**: `/generate-pantry-feature feature-request.md`

### `/analyze-pantry-patterns`
Analyse les patterns existants dans le codebase Smart Pantry.
**Usage**: `/analyze-pantry-patterns "type de pattern recherché"`

### `/generate-food-feature-prp`
Génère PRP spécialisé pour features alimentaires.
**Usage**: `/generate-food-feature-prp "feature avec gestion produits"`

### `/create-mobile-kitchen-prp`
Crée PRP optimisé pour usage mobile cuisine.
**Usage**: `/create-mobile-kitchen-prp "feature mobile performance"`

## Processus de Génération

### 1. 📖 Lecture & Analyse
```typescript
// Lecture demande feature
const featureRequest = await readFeatureRequest(input);

// Analyse patterns Smart Pantry existants
const pantryPatterns = await analyzePantryCodebase([
  'src/components/**/*.tsx',
  'src/hooks/**/*.ts',
  'src/services/**/*.ts',
  'src/lib/**/*.ts'
]);

// Recherche mémoire Cipher alimentaire
const foodPatterns = await cipher.search({
  query: `smart pantry patterns: ${featureRequest.type}`,
  categories: ['pantry_feature_patterns', 'food_tech_implementations']
});
```

### 2. 🧠 Intelligence Cipher
```typescript
// Patterns alimentaires spécialisés
const foodTechPatterns = await cipher.search({
  categories: [
    'voice_food_recognition_patterns',
    'barcode_scanning_optimizations',
    'recipe_ai_integration_patterns',
    'offline_pantry_sync_strategies'
  ]
});

// Performance mobile cuisine
const mobileKitchenPatterns = await cipher.search({
  categories: [
    'mobile_kitchen_ux_patterns',
    'camera_optimization_food_apps',
    'battery_usage_scanner_patterns'
  ]
});
```

### 3. 🎯 Génération PRP Intelligent
- Context Smart Pantry complet
- Patterns prouvés appliqués
- Spécialisations alimentaires
- Optimisations mobile cuisine

## Structure PRP Smart Pantry

### 1. 📋 Context & Documentation Alimentaire
- Architecture Smart Pantry (React + Supabase + OpenAI)
- Patterns reconnaissance vocale alimentaire
- API OpenFoodFacts + codes-barres
- Schema base données produits/inventaire

### 2. 🏗️ Plan d'Implémentation Intelligent
- Phases développement optimisées
- Composants avec patterns prouvés
- Intégrations IA alimentaires
- Stratégie testing food-tech

### 3. ✅ Gates de Validation Pantry
- Tests unitaires spécialisés alimentaire
- Scénarios intégration OpenFoodFacts
- Benchmarks performance mobile cuisine
- Critères UX usage cuisine/courses

### 4. 🛡️ Qualité & Sécurité Alimentaire
- Code review checklist food-tech
- Sécurité données alimentaires
- Accessibilité usage cuisine
- Responsive mobile-first

### 5. 📊 Métriques de Succès Pantry
- Validation fonctionnelle alimentaire
- Performance scanner + reconnaissance
- UX satisfaction cuisine/courses
- Impact business retention

## Spécialisations Smart Pantry

### 🎤 Reconnaissance Vocale Alimentaire
- Calculs précision produits français
- Gestion variations linguistiques
- Fallbacks intelligent produits non-reconnus
- Context inventaire pour suggestions

### 📸 Scanner & Photos Produits
- Optimisations codes-barres produits français
- Compression photos adaptée alimentaire
- Stratégies fallback API OpenFoodFacts
- Performance mobile scanner cuisine

### 🤖 IA Recettes Contextuelles
- Intégration OpenAI avec inventaire
- Suggestions basées produits disponibles
- Gestion préférences alimentaires
- Context familial et portions

### 📱 Mobile Kitchen UX
- Patterns usage mains occupées/mouillées
- Interface adaptée éclairage cuisine
- Feedback audio pour usage sans regard
- Optimisations battery scanner intensif

### 🔄 Sync Offline Courses
- Stratégies sync magasins sans réseau
- Gestion conflicts inventaire famille
- Priorisation données critiques
- Recovery automatique connexion

## Format Output PRP

```markdown
# 🥘 SMART PANTRY FEATURE PRP

## 🎯 FEATURE: [Nom Feature]

### 📋 CONTEXT CIPHER
- 🧠 **Patterns Trouvés**: 23 patterns similaires
- ⚡ **Optimisations**: 89% success rate
- 🥘 **Spécialisations**: Alimentaire + Mobile + Voice
- 📊 **Prédictions**: 67% plus rapide avec patterns

### 🏗️ IMPLEMENTATION BLUEPRINT
[Plan détaillé avec patterns appliqués]

### ✅ VALIDATION GATES
[Critères spécialisés Smart Pantry]

### 🛡️ QUALITY ASSURANCE
[Checklist food-tech + mobile cuisine]

### 📊 SUCCESS METRICS
[KPIs spécifiques apps alimentaires]

🚀 **CIPHER ADVANTAGE**: Implementation 3x plus rapide et qualité optimisée !
```

## Exemples d'Usage

```bash
# Génération PRP reconnaissance vocale
/generate-pantry-feature "Système dictée courses avec IA contextuelle"

# PRP scanner optimisé
/generate-food-feature-prp "Scanner codes-barres avec fallbacks intelligents"

# PRP mobile cuisine
/create-mobile-kitchen-prp "Interface adaptée usage cuisine mains occupées"
```

## Intelligence Évolutive
- **PRP 1**: Template de base + patterns codebase
- **PRP 5**: Intégration patterns Cipher alimentaires
- **PRP 15**: Expert PRP food-tech avec optimisations
- **PRP 30+**: Générateur super-intelligent pantry évolutif

Chaque PRP généré améliore automatiquement la qualité des suivants ! 🧠✨