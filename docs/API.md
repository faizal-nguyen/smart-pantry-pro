# Documentation API - Smart Pantry Pro

## Vue d'ensemble

L'API Smart Pantry Pro est une API RESTful qui permet d'interagir avec toutes les fonctionnalités de l'application. Elle est construite sur Supabase et Vercel Edge Functions.

## Base URL

```
Production: https://api.smartpantrypro.com/v1
Staging: https://api-staging.smartpantrypro.com/v1
Local: http://localhost:3001/api
```

## Authentication

L'API utilise JWT (JSON Web Tokens) pour l'authentification. Toutes les requêtes doivent inclure le token dans le header.

### Headers requis

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Obtenir un token

```http
POST /auth/login
```

```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Réponse:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

## Endpoints

### 🏠 Pantry (Garde-manger)

#### Obtenir tous les garde-mangers

```http
GET /pantries
```

**Paramètres de requête:**
- `limit` (number): Nombre d'éléments par page (défaut: 20)
- `offset` (number): Décalage pour la pagination
- `sort` (string): Champ de tri (défaut: created_at)

**Réponse:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Ma Cuisine",
      "created_at": "2024-01-15T10:00:00Z",
      "updated_at": "2024-01-15T10:00:00Z",
      "products_count": 42
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

#### Créer un garde-manger

```http
POST /pantries
```

**Corps de la requête:**
```json
{
  "name": "Garde-manger principal",
  "description": "Cuisine principale de la maison"
}
```

### 📦 Products (Produits)

#### Lister les produits

```http
GET /pantries/{pantry_id}/products
```

**Paramètres de requête:**
- `category` (string): Filtrer par catégorie
- `expiring_soon` (boolean): Produits expirant dans 7 jours
- `low_stock` (boolean): Produits en stock faible
- `search` (string): Recherche textuelle

**Réponse:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Lait demi-écrémé",
      "quantity": 2,
      "unit": "L",
      "category": "dairy",
      "expiry_date": "2024-01-20",
      "barcode": "3123456789012",
      "image_url": "https://storage.smartpantrypro.com/products/milk.jpg",
      "minimum_quantity": 1,
      "location": "Frigo principal"
    }
  ]
}
```

#### Ajouter un produit

```http
POST /pantries/{pantry_id}/products
```

**Corps de la requête:**
```json
{
  "name": "Tomates cerises",
  "quantity": 500,
  "unit": "g",
  "category": "vegetables",
  "expiry_date": "2024-01-18",
  "barcode": "3123456789012",
  "location": "Bac à légumes"
}
```

#### Mettre à jour la quantité

```http
PATCH /products/{product_id}/quantity
```

**Corps de la requête:**
```json
{
  "operation": "add" | "subtract" | "set",
  "quantity": 100,
  "reason": "used_in_recipe" | "expired" | "manual_adjustment"
}
```

### 🍳 Recipes (Recettes)

#### Rechercher des recettes

```http
GET /recipes/search
```

**Paramètres de requête:**
- `q` (string): Terme de recherche
- `cuisine_type` (string): Type de cuisine
- `meal_type` (string): Type de repas
- `max_time` (number): Temps max en minutes
- `difficulty` (string): easy|medium|hard
- `with_available_ingredients` (boolean): Uniquement faisables

**Réponse:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Poulet Tikka Masala",
      "description": "Un délicieux curry indien",
      "cuisine_type": "indian",
      "meal_type": "dinner",
      "prep_time": 20,
      "cook_time": 30,
      "servings": 4,
      "difficulty": "medium",
      "image_url": "https://storage.smartpantrypro.com/recipes/tikka.jpg",
      "rating": 4.8,
      "reviews_count": 156,
      "can_make_now": true,
      "missing_ingredients": []
    }
  ]
}
```

#### Extraire une recette depuis URL

```http
POST /recipes/extract
```

**Corps de la requête:**
```json
{
  "url": "https://www.marmiton.org/recettes/recette_poulet-tikka-masala_12345.aspx",
  "translate_to_french": true
}
```

**Réponse:**
```json
{
  "success": true,
  "recipe": {
    "name": "Poulet Tikka Masala",
    "description": "Un curry indien crémeux et épicé",
    "ingredients": [
      {
        "name": "Poulet",
        "quantity": 600,
        "unit": "g",
        "notes": "coupé en cubes"
      }
    ],
    "instructions": [
      "Mariner le poulet dans le yaourt et les épices",
      "Faire cuire dans une poêle chaude"
    ],
    "nutrition": {
      "calories": 350,
      "protein": 35,
      "carbs": 15,
      "fat": 18
    }
  },
  "performance": {
    "extraction_time_ms": 2500,
    "model_used": "gpt-3.5-turbo"
  }
}
```

#### Analyser la faisabilité d'une recette

```http
POST /recipes/{recipe_id}/analyze
```

**Réponse:**
```json
{
  "can_make": true,
  "missing_ingredients": [
    {
      "name": "Garam masala",
      "quantity": 2,
      "unit": "cuillères à café",
      "alternatives": ["Curry en poudre", "Mélange d'épices maison"]
    }
  ],
  "expiring_ingredients": [
    {
      "name": "Yaourt",
      "expires_in_days": 2,
      "quantity_available": 200,
      "quantity_needed": 150
    }
  ],
  "nutrition_per_serving": {
    "calories": 350,
    "protein": 35,
    "carbs": 15,
    "fat": 18
  }
}
```

### 🛒 Shopping List (Liste de courses)

#### Obtenir la liste actuelle

```http
GET /shopping-list
```

**Réponse:**
```json
{
  "id": "uuid",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T14:30:00Z",
  "total_items": 24,
  "estimated_cost": 75.50,
  "items": [
    {
      "id": "uuid",
      "product_name": "Lait demi-écrémé",
      "quantity": 2,
      "unit": "L",
      "category": "dairy",
      "checked": false,
      "price_estimate": 2.40,
      "notes": "Marque habituelle",
      "added_from": "low_stock"
    }
  ]
}
```

#### Générer depuis planning

```http
POST /shopping-list/generate
```

**Corps de la requête:**
```json
{
  "from_date": "2024-01-15",
  "to_date": "2024-01-21",
  "include_low_stock": true,
  "include_expiring": true,
  "consolidate_similar": true
}
```

### 📅 Meal Planning (Planning repas)

#### Obtenir le planning

```http
GET /meal-plans
```

**Paramètres de requête:**
- `start_date` (date): Date de début
- `end_date` (date): Date de fin

**Réponse:**
```json
{
  "data": [
    {
      "date": "2024-01-15",
      "meals": {
        "breakfast": {
          "recipe_id": "uuid",
          "recipe_name": "Pancakes",
          "servings": 2
        },
        "lunch": {
          "recipe_id": "uuid",
          "recipe_name": "Salade César",
          "servings": 2
        },
        "dinner": {
          "recipe_id": "uuid",
          "recipe_name": "Poulet rôti",
          "servings": 4,
          "notes": "Invités ce soir"
        }
      }
    }
  ]
}
```

#### Suggestions IA pour planning

```http
POST /meal-plans/suggest
```

**Corps de la requête:**
```json
{
  "days": 7,
  "preferences": {
    "avoid_repeating_days": 3,
    "use_expiring_first": true,
    "dietary_restrictions": ["vegetarian"],
    "preferred_cuisines": ["french", "italian"],
    "max_prep_time": 45
  }
}
```

### 📊 Analytics

#### Tableau de bord

```http
GET /analytics/dashboard
```

**Paramètres de requête:**
- `period` (string): week|month|year|custom
- `start_date` (date): Pour période custom
- `end_date` (date): Pour période custom

**Réponse:**
```json
{
  "period": "month",
  "metrics": {
    "waste_reduction": {
      "percentage": 47,
      "value_saved": 152.30,
      "items_saved": 23
    },
    "shopping": {
      "total_spent": 580.45,
      "average_per_trip": 72.55,
      "trips_count": 8
    },
    "cooking": {
      "meals_cooked": 85,
      "recipes_tried": 12,
      "favorite_cuisine": "italian"
    },
    "inventory": {
      "total_items": 156,
      "expiring_soon": 8,
      "low_stock": 12,
      "categories": {
        "dairy": 15,
        "vegetables": 28,
        "meat": 12,
        "pantry": 45
      }
    }
  }
}
```

### 🔔 Notifications

#### Obtenir les notifications

```http
GET /notifications
```

**Paramètres de requête:**
- `unread_only` (boolean): Seulement non lues
- `type` (string): expiry|low_stock|meal_reminder|tip

**Réponse:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "expiry_warning",
      "title": "3 produits expirent bientôt",
      "message": "Yaourt, Salade, Fromage blanc expirent dans 2 jours",
      "created_at": "2024-01-15T08:00:00Z",
      "read": false,
      "action_url": "/pantry?filter=expiring",
      "priority": "high"
    }
  ]
}
```

## Codes d'erreur

| Code | Signification | Description |
|------|--------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée |
| 400 | Bad Request | Requête invalide |
| 401 | Unauthorized | Token manquant ou invalide |
| 403 | Forbidden | Accès refusé |
| 404 | Not Found | Ressource non trouvée |
| 409 | Conflict | Conflit (ex: doublon) |
| 429 | Too Many Requests | Rate limit atteint |
| 500 | Internal Server Error | Erreur serveur |

### Format des erreurs

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Le champ 'name' est requis",
    "details": {
      "field": "name",
      "constraint": "required"
    }
  }
}
```

## Rate Limiting

- **Anonyme**: 60 requêtes/heure
- **Authentifié Free**: 600 requêtes/heure
- **Authentifié Pro**: 6000 requêtes/heure

Headers de réponse:
```http
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 598
X-RateLimit-Reset: 1642435200
```

## Webhooks

### Configuration

```http
POST /webhooks
```

```json
{
  "url": "https://myapp.com/webhook",
  "events": ["product.expiring", "shopping_list.updated"],
  "secret": "webhook_secret_key"
}
```

### Événements disponibles

- `product.added`
- `product.updated`
- `product.expiring`
- `product.expired`
- `recipe.created`
- `shopping_list.updated`
- `meal_plan.updated`

### Format du payload

```json
{
  "event": "product.expiring",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "product_id": "uuid",
    "name": "Yaourt nature",
    "expires_in_days": 2
  }
}
```

## SDK et Exemples

### JavaScript/TypeScript

```typescript
import { SmartPantryClient } from '@smartpantrypro/sdk';

const client = new SmartPantryClient({
  apiKey: 'your_api_key',
  environment: 'production'
});

// Obtenir les produits
const products = await client.pantries.getProducts('pantry_id', {
  expiringOnly: true
});

// Extraire une recette
const recipe = await client.recipes.extractFromUrl({
  url: 'https://example.com/recipe'
});
```

### Python

```python
from smartpantrypro import Client

client = Client(api_key='your_api_key')

# Rechercher des recettes
recipes = client.recipes.search(
    query="poulet",
    max_time=30,
    with_available_ingredients=True
)

# Générer liste de courses
shopping_list = client.shopping_lists.generate(
    from_date="2024-01-15",
    to_date="2024-01-21"
)
```

### cURL

```bash
# Obtenir les produits expirant
curl -X GET "https://api.smartpantrypro.com/v1/products?expiring_soon=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Extraire une recette
curl -X POST "https://api.smartpantrypro.com/v1/recipes/extract" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/recipe"}'
```

## Environnement de test

Un environnement sandbox est disponible pour les tests:

```
Base URL: https://sandbox.smartpantrypro.com/api/v1
Test API Key: test_pk_1234567890
```

Données de test réinitialisées quotidiennement.