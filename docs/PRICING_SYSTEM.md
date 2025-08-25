# Système de Prix des Fruits et Légumes

Ce système permet de récupérer et stocker les prix des fruits et légumes en utilisant l'API Piloterr.

## Architecture

### Fichiers principaux

- `src/services/pricing/piloterrPriceService.ts` - Service principal pour l'API Piloterr
- `src/services/pricing/priceScraper.ts` - Script de scraping avec options avancées
- `scripts/scrape-prices.js` - Script de ligne de commande
- `supabase/migrations/20250105000023_create_product_prices_table.sql` - Migration de la base de données

### Base de données

La table `product_prices` stocke :
- Informations produit (ID, nom, catégorie, unité)
- Prix et devise
- Localisation géographique
- Date et source des données
- Timestamps de création/modification

## Configuration

### Variables d'environnement requises

Ajoutez ces variables dans votre fichier `.env.local` :

```bash
# Clé API Piloterr
PILOTERR_API_KEY=votre_cle_api_piloterr

# Configuration Supabase (déjà configurée)
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

### Installation de la base de données

Exécutez la migration pour créer la table :

```bash
# Via Supabase CLI
supabase db push

# Ou manuellement via l'interface Supabase
```

## Utilisation

### Script de ligne de commande

```bash
# Scraping complet (fruits + légumes)
node scripts/scrape-prices.js --full

# Scraping uniquement les fruits
node scripts/scrape-prices.js --fruits

# Scraping uniquement les légumes
node scripts/scrape-prices.js --vegetables

# Recherche d'un produit spécifique
node scripts/scrape-prices.js --specific "pomme"

# Affichage des statistiques
node scripts/scrape-prices.js --stats

# Aide
node scripts/scrape-prices.js --help
```

### Utilisation programmatique

```typescript
import PiloterrPriceService from './src/services/pricing/piloterrPriceService';
import { PriceScraper } from './src/services/pricing/priceScraper';

// Initialisation
const piloterrService = new PiloterrPriceService('votre_cle_api');
const scraper = new PriceScraper('votre_cle_api');

// Récupération des prix
const fruits = await piloterrService.fetchFruitsPrices();
const vegetables = await piloterrService.fetchVegetablesPrices();

// Stockage
await piloterrService.storePrices(fruits);

// Récupération des prix stockés
const storedPrices = await piloterrService.getStoredPrices('fruits', 'France');

// Prix moyen d'un produit
const avgPrice = await piloterrService.getAveragePrice('pomme', 30); // 30 jours
```

## Fonctionnalités

### Récupération des données
- ✅ Fruits et légumes séparément
- ✅ Recherche de produits spécifiques
- ✅ Gestion des erreurs API
- ✅ Transformation des données

### Stockage
- ✅ Base de données Supabase
- ✅ Éviter les doublons (index unique)
- ✅ Timestamps automatiques
- ✅ Recherche full-text en français

### Analyse
- ✅ Statistiques des prix stockés
- ✅ Calcul de prix moyens
- ✅ Filtrage par catégorie/localisation
- ✅ Historique des prix

## API Piloterr

### Endpoints utilisés
- `/products/fruits` - Liste des fruits avec prix
- `/products/vegetables` - Liste des légumes avec prix
- `/products/search` - Recherche de produits

### Format des données attendu
```json
{
  "id": "product_id",
  "name": "Nom du produit",
  "category": "fruits|vegetables",
  "unit": "kg|piece|bunch",
  "price": 2.50,
  "currency": "EUR",
  "location": "France",
  "date": "2024-01-15"
}
```

## Sécurité

- 🔐 Authentification par clé API
- 🛡️ Row Level Security (RLS) activé
- 🔒 Politiques d'accès restrictives
- 📝 Logs d'erreurs détaillés

## Monitoring

### Logs
Le système génère des logs détaillés :
- Début/fin des opérations
- Nombre d'éléments traités
- Erreurs avec contexte
- Statistiques de performance

### Métriques
- Nombre total de prix stockés
- Répartition par catégorie
- Prix moyens
- Fréquence de mise à jour

## Maintenance

### Mise à jour automatique
Pour automatiser les mises à jour, créez un cron job :

```bash
# Mise à jour quotidienne à 6h du matin
0 6 * * * cd /path/to/project && node scripts/scrape-prices.js --full
```

### Nettoyage des données
Les anciennes données peuvent être nettoyées périodiquement :

```sql
-- Supprimer les données de plus de 1 an
DELETE FROM product_prices 
WHERE date < CURRENT_DATE - INTERVAL '1 year';
```

## Dépannage

### Erreurs courantes

1. **Clé API invalide**
   ```
   ❌ Erreur API Piloterr: 401 Unauthorized
   ```
   Solution : Vérifiez votre clé API Piloterr

2. **Variables d'environnement manquantes**
   ```
   ❌ Variable d'environnement PILOTERR_API_KEY manquante
   ```
   Solution : Ajoutez les variables dans `.env.local`

3. **Erreur de connexion Supabase**
   ```
   ❌ Erreur Supabase: connection failed
   ```
   Solution : Vérifiez les variables Supabase

### Debug
Activez les logs détaillés en ajoutant :
```bash
DEBUG=piloterr:* node scripts/scrape-prices.js
```

## Évolutions futures

- [ ] Support d'autres APIs de prix
- [ ] Analyse de tendances
- [ ] Alertes de prix
- [ ] API REST pour l'application
- [ ] Dashboard de monitoring
- [ ] Export des données
