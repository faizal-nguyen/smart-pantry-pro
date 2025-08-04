# 🔍 VALIDATE SMART PANTRY FEATURE + CIPHER

## Description
Agent de validation intelligente avec mémoire Cipher intégrée spécialisé pour les apps d'inventaire alimentaire.

## Fonctionnalités
- **Mémoire Alimentaire**: Recherche patterns similaires dans apps food-tech
- **Sécurité Alimentaire**: Validation dates péremption, allergènes, températures
- **Performance Mobile**: Checks spécifiques usage cuisine/courses
- **IA Prédictive**: Anticipe problèmes basés sur expériences passées

## Commandes disponibles

### `/validate-pantry-feature`
Valide une feature avec intelligence cumulative alimentaire.
**Usage**: `/validate-pantry-feature "description de la feature"`

### `/food-safety-check`
Vérifie les implications sécurité alimentaire d'une feature.
**Usage**: `/food-safety-check "feature avec gestion dates/allergènes"`

### `/mobile-kitchen-validation`
Valide optimisations pour usage cuisine mobile.
**Usage**: `/mobile-kitchen-validation "feature avec caméra/scanner"`

### `/voice-food-validation`
Valide reconnaissance vocale pour termes alimentaires français.
**Usage**: `/voice-food-validation "feature reconnaissance vocale produits"`

## Checks Spécialisés

### 🥘 Food Safety Validation
- Dates péremption: Format + alertes critiques
- Allergènes: Detection vocale + visuelle
- Température stockage: Validation par catégorie
- Contamination croisée: Séparation produits

### 🎤 Voice Recognition Food
- Produits français: "courgette", "yaourt", "bœuf"
- Quantités: "2 litres", "500g", "une douzaine"  
- Variations régionales: "pain de mie" vs "pain tranché"
- Marques vs génériques: Parsing intelligent

### 📱 Mobile Kitchen Performance
- Camera access: iOS Safari vs Android Chrome
- Storage quotas: Photos + offline data
- Battery usage: Scanner + reconnaissance
- Network: Sync offline → online

### 🔗 Integration Compatibility
- OpenFoodFacts API: Rate limits + fallbacks
- Supabase Storage: RLS policies photos
- OpenAI API: Context inventaire
- PWA capabilities: Installation + notifications

## Output Format
```
🔍 SMART PANTRY VALIDATION RESULTS:

✅ SAFE TO PROCEED
📊 Found 8 similar validations - 87% success rate
🎯 Applying 12 proven precautions automatically
⚡ Using optimization patterns from successful implementations

⚠️ PRECAUTIONS RECOMMANDÉES:
- Implement food safety validation for dates péremption
- Add voice recognition fallback for produits non-reconnus  
- Optimize camera performance pour scanning en cuisine
- Plan offline sync strategy pour usage courses

🚀 READY FOR IMPLEMENTATION with Cipher-enhanced intelligence
```