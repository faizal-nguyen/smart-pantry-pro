# API Codes-Barres - Smart Pantry Pro

## 🏆 APIs Gratuites Intégrées

### 1. **Open Food Facts** (Principal)
- **URL :** `https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- **Gratuit :** ✅ Oui
- **Limite :** Aucune
- **Données récupérées :**
  - Nom du produit
  - Marque
  - Catégorie
  - Image du produit
  - Ingrédients
  - Valeurs nutritionnelles
  - Allergènes

### 2. **UPC Database** (Secours)
- **URL :** `https://api.upcdatabase.org/product/{barcode}`
- **Gratuit :** ✅ Oui (avec clé API optionnelle)
- **Limite :** 100 requêtes/jour
- **Données récupérées :**
  - Nom du produit
  - Marque
  - Catégorie

## 🚀 Fonctionnalités Implémentées

### Scan Automatique
1. **Scan du code-barres** avec la caméra
2. **Recherche automatique** dans la base de données locale
3. **Récupération API** si le produit n'existe pas localement
4. **Auto-remplissage** des champs du formulaire

### Interface Utilisateur
- **Bouton de recherche** à côté du champ code-barres
- **Indicateur de chargement** pendant la recherche
- **Affichage des informations** récupérées
- **Notifications toast** pour le feedback utilisateur

## 📱 Utilisation

### Méthode 1 : Scan Caméra
1. Cliquez sur l'icône caméra 📷
2. Scannez le code-barres
3. Les informations sont automatiquement récupérées

### Méthode 2 : Saisie Manuelle
1. Saisissez le code-barres manuellement
2. Cliquez sur l'icône de recherche 🔍
3. Les informations sont récupérées via l'API

## 🔧 Configuration

### Variables d'Environnement (Optionnel)
```env
# Pour UPC Database (optionnel)
UPC_API_KEY=your_api_key_here
```

### APIs Alternatives
Si vous souhaitez ajouter d'autres APIs :

```typescript
// Ajouter dans useBarcodeAPI.ts
const fetchFromBarcodeLookup = async (barcode: string) => {
  const response = await fetch(
    `https://api.barcodelookup.com/v3/products?barcode=${barcode}`,
    {
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    }
  );
  // Traitement de la réponse...
};
```

## 📊 Statistiques

### Couverture des Produits
- **Open Food Facts :** ~2.5M+ produits
- **UPC Database :** ~1M+ produits
- **Couverture mondiale** des codes-barres

### Types de Produits Supportés
- ✅ Aliments et boissons
- ✅ Produits d'hygiène
- ✅ Produits d'entretien
- ✅ Médicaments (certains)

## 🐛 Dépannage

### Produit non trouvé
1. Vérifiez que le code-barres est correct
2. Essayez une autre API (UPC Database)
3. Saisissez manuellement les informations

### Erreur réseau
1. Vérifiez votre connexion internet
2. Réessayez dans quelques minutes
3. Les APIs peuvent être temporairement indisponibles

### Performance
- **Temps de réponse :** 1-3 secondes
- **Cache local :** Les produits déjà recherchés sont mis en cache
- **Fallback :** Si une API échoue, l'autre est essayée

## 🔄 Mise à Jour

Pour ajouter de nouveaux produits à la base de données Open Food Facts :
1. Allez sur [Open Food Facts](https://world.openfoodfacts.org/)
2. Scannez un produit non répertorié
3. Ajoutez les informations
4. Contribuez à la base de données mondiale !

## 📈 Améliorations Futures

- [ ] Cache local des recherches récentes
- [ ] Support d'autres APIs (Barcode Lookup, etc.)
- [ ] Reconnaissance d'images de produits
- [ ] Suggestions de produits similaires
- [ ] Historique des recherches 