# Bug-fixing.md

## ✅ RÉSOLU : Extraction CookdTV avec Puppeteer

### Problème initial
```
🚀 Extracting recipe (optimized) from URL: https://cookdtv.com/recipes/moti-mahal-butter-chicken
POST http://localhost:3001/api/extract-recipe-ultra-optimized 400 (Bad Request)
❌ Recipe extraction error: Extraction impossible.
```

### Cause
CookdTV est une application React SPA qui nécessite l'exécution de JavaScript pour afficher le contenu.

### Solution appliquée
1. **Installation de Puppeteer** pour navigateur headless
2. **Création d'un extracteur dédié** (`extract-recipe-spa.js`)
3. **Intégration dans l'API** pour traiter automatiquement les sites SPA

### Statut actuel
⚠️ **Limitation** : L'extraction avec Puppeteer fonctionne mais est :
- Plus lente (15-20 secondes)
- Plus complexe à maintenir
- Consommatrice en ressources

### Recommandation
Pour les sites comme CookdTV, nous recommandons la **saisie manuelle** :
1. L'utilisateur visite la page de la recette
2. Copie les informations (titre, ingrédients, instructions)
3. Colle dans le formulaire manuel

C'est plus rapide et fiable que l'extraction automatique pour ces sites complexes.
