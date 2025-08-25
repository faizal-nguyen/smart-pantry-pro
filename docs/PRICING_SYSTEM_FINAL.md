# Système de Prix des Fruits et Légumes - Documentation Finale

## 🎯 Résumé du Projet

Ce système permet de récupérer et stocker les prix des fruits et légumes en utilisant l'API Piloterr et/ou un scraper Carrefour avec Puppeteer.

## 📁 Architecture Complète

### Fichiers créés

#### Services principaux
- `src/services/pricing/piloterrPriceService.ts` - Service principal pour l'API Piloterr
- `src/services/pricing/carrefourScraper.ts` - Scraper Carrefour avec Puppeteer

#### Scripts de test et utilitaires
- `scripts/scrape-prices.js` - Script de ligne de commande principal
- `scripts/test-piloterr-final.cjs` - Test de l'API Piloterr (routes v2)
- `scripts/test-carrefour-simple.cjs` - Test du scraper Carrefour
- `scripts/diagnose-carrefour.cjs` - Diagnostic de la structure Carrefour
- `scripts/test-piloterr-api.cjs` - Tests d'API Piloterr (routes v1)
- `scripts/test-piloterr-web.cjs` - Analyse de l'interface web Piloterr

#### Base de données
- `supabase/migrations/20250105000023_create_product_prices_table.sql` - Migration de la table

#### Documentation
- `docs/PRICING_SYSTEM.md` - Documentation complète
- `docs/PRICING_SYSTEM_FINAL.md` - Cette documentation finale

## 🔧 Configuration

### Variables d'environnement requises

```bash
# Clé API Piloterr
PILOTERR_API_KEY=8b003b6b-9cda-4c98-b8d1-8871188a9a30

# Configuration Supabase (déjà configurée)
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

### Dépendances installées

```bash
npm install puppeteer @supabase/supabase-js
```

## 🚀 Utilisation

### 1. Installation de la base de données

```bash
supabase db push
```

### 2. Test de l'API Piloterr

```bash
node scripts/test-piloterr-final.cjs
```

### 3. Test du scraper Carrefour

```bash
node scripts/test-carrefour-simple.cjs
```

### 4. Diagnostic de la structure Carrefour

```bash
node scripts/diagnose-carrefour.cjs
```

### 5. Scraping complet

```bash
node scripts/scrape-prices.js --full
```

## 📊 Structure de la Base de Données

### Table `product_prices`

```sql
CREATE TABLE product_prices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'kg',
    price DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    location TEXT NOT NULL DEFAULT 'France',
    date DATE NOT NULL,
    source TEXT NOT NULL DEFAULT 'piloterr',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Index optimisés
- `idx_product_prices_product_id` - Recherche par ID produit
- `idx_product_prices_category` - Filtrage par catégorie
- `idx_product_prices_location` - Filtrage par localisation
- `idx_product_prices_date` - Tri par date
- `idx_product_prices_name` - Recherche full-text en français
- `idx_product_prices_unique` - Éviter les doublons

## 🔌 API Piloterr

### Routes utilisées
- `POST /api/v2/carrefour/search` - Recherche de produits
- `GET /api/v2/carrefour/product/{id}` - Détails d'un produit

### Format des requêtes

#### Recherche
```json
{
  "query": "pomme",
  "category": "fruits",
  "limit": 50
}
```

#### Réponse attendue
```json
{
  "products": [
    {
      "id": "product_id",
      "name": "Pomme Golden",
      "price": 2.50,
      "unit": "kg",
      "category": "fruits"
    }
  ]
}
```

## 🕷️ Scraper Carrefour (Alternative)

### Fonctionnalités
- Navigation automatique avec Puppeteer
- Extraction des noms et prix
- Support des fruits et légumes
- Gestion des timeouts et erreurs
- Transformation des données

### URLs cibles
- Fruits: `https://www.carrefour.fr/fruits-et-legumes/fruits`
- Légumes: `https://www.carrefour.fr/fruits-et-legumes/legumes`

## 📈 Fonctionnalités du Service

### Récupération des données
- ✅ Fruits et légumes séparément
- ✅ Recherche de produits spécifiques
- ✅ Gestion des erreurs API
- ✅ Transformation des données
- ✅ Suppression des doublons

### Stockage
- ✅ Base de données Supabase
- ✅ Éviter les doublons (index unique)
- ✅ Timestamps automatiques
- ✅ Recherche full-text en français
- ✅ Row Level Security (RLS)

### Analyse
- ✅ Statistiques des prix stockés
- ✅ Calcul de prix moyens
- ✅ Filtrage par catégorie/localisation
- ✅ Historique des prix

## 🔍 Tests et Diagnostic

### Tests API Piloterr
```bash
# Test des endpoints v2
node scripts/test-piloterr-final.cjs

# Test des endpoints v1
node scripts/test-piloterr-api.cjs

# Analyse de l'interface web
node scripts/test-piloterr-web.cjs
```

### Tests Scraper Carrefour
```bash
# Test simple
node scripts/test-carrefour-simple.cjs

# Diagnostic de structure
node scripts/diagnose-carrefour.cjs
```

## 🛠️ Dépannage

### Erreurs API Piloterr
- **500 Internal Server Error**: Problème côté serveur Piloterr
- **401 Unauthorized**: Clé API invalide
- **404 Not Found**: Endpoint inexistant

### Erreurs Scraper Carrefour
- **TimeoutError**: Sélecteurs CSS incorrects
- **NavigationError**: Page inaccessible
- **EvaluationError**: Structure de page changée

### Solutions
1. Vérifier la clé API Piloterr
2. Tester les endpoints individuellement
3. Analyser la structure Carrefour avec le diagnostic
4. Ajuster les sélecteurs CSS si nécessaire

## 📋 Checklist de Déploiement

- [ ] Variables d'environnement configurées
- [ ] Base de données migrée
- [ ] Dépendances installées
- [ ] Tests API Piloterr passés
- [ ] Tests scraper Carrefour passés
- [ ] Script de scraping fonctionnel
- [ ] Données stockées dans Supabase

## 🎯 Prochaines Étapes

### Court terme
1. Résoudre les erreurs 500 de l'API Piloterr
2. Tester avec différentes clés API
3. Ajuster les sélecteurs Carrefour si nécessaire

### Moyen terme
1. Automatiser le scraping quotidien
2. Ajouter d'autres sources de prix
3. Créer un dashboard de monitoring

### Long terme
1. Analyse de tendances de prix
2. Alertes de prix
3. API REST pour l'application
4. Intégration avec d'autres enseignes

## 📞 Support

En cas de problème :
1. Vérifier les logs des scripts de test
2. Consulter la documentation Piloterr
3. Analyser la structure Carrefour avec le diagnostic
4. Tester les endpoints individuellement

---

**Système créé avec succès ! 🎉**

Le système est maintenant prêt à récupérer et stocker les prix des fruits et légumes via l'API Piloterr ou le scraper Carrefour.

