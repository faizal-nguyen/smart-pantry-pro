# Documentation API - Smart Pantry Pro

## 📚 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Authentication](#authentication)
3. [Base API v1](#base-api-v1)
   - [Pantry Management](#pantry-management)
   - [Products](#products)
   - [Recipes](#recipes)
   - [Shopping Lists](#shopping-lists)
   - [Scanner & Vision](#scanner--vision)
   - [AI Assistant](#ai-assistant)
4. [Evolution V2 APIs](#evolution-v2-apis)
   - [AI Nutritionist API](#ai-nutritionist-api)
   - [Meal Planning API](#meal-planning-api)
   - [Community API](#community-api)
   - [IoT API](#iot-api)
   - [Analytics API](#analytics-api)
   - [Sync API](#sync-api)
5. [Sécurité et limites](#sécurité-et-limites)

## 🌐 Vue d'ensemble

L'API Smart Pantry Pro est une API RESTful qui permet d'interagir avec toutes les fonctionnalités de l'application. Elle est construite sur Supabase et Vercel Edge Functions.

### Base URLs

```
Production V1: https://api.smartpantrypro.com/v1
Production V2: https://api.smartpantrypro.com/v2
Staging: https://api-staging.smartpantrypro.com
Development: http://localhost:3000/api
```

### Headers standards

```http
Content-Type: application/json
Accept: application/json
X-API-Version: 2.0
```

### Codes de réponse

| Code | Description |
|------|-------------|
| 200 | Succès |
| 201 | Ressource créée |
| 400 | Requête invalide |
| 401 | Non authentifié |
| 403 | Non autorisé |
| 404 | Ressource non trouvée |
| 429 | Limite de taux dépassée |
| 500 | Erreur serveur |

## 🔐 Authentication

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

**Body:**
```json
{
  "email": "user@example.com",
  "password": "secure_password"
}
```

**Response:**
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

### Rafraîchir un token

```http
POST /auth/refresh
```

**Body:**
```json
{
  "refresh_token": "your_refresh_token"
}
```

## 📦 Base API v1

### Pantry Management

#### Obtenir tous les garde-mangers

```http
GET /api/v1/pantries
```

**Query parameters:**
- `limit` (number): Nombre d'éléments par page (défaut: 20)
- `offset` (number): Décalage pour la pagination
- `sort` (string): Champ de tri (défaut: created_at)

**Response:**
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
POST /api/v1/pantries
```

**Body:**
```json
{
  "name": "Garde-manger principal",
  "description": "Cuisine principale de la maison"
}
```

### Products

#### Obtenir les produits d'un garde-manger

```http
GET /api/v1/pantries/{pantry_id}/products
```

**Query parameters:**
- `category` (string): Filtrer par catégorie
- `expiring` (boolean): Produits proches de la péremption
- `search` (string): Recherche textuelle

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Lait demi-écrémé",
      "category": "Produits laitiers",
      "quantity": 2,
      "unit": "L",
      "expiry_date": "2024-01-20",
      "barcode": "3123456789012",
      "image_url": "https://storage.example.com/products/milk.jpg"
    }
  ],
  "total": 15
}
```

#### Ajouter un produit

```http
POST /api/v1/pantries/{pantry_id}/products
```

**Body:**
```json
{
  "name": "Pâtes complètes",
  "category": "Féculents",
  "quantity": 500,
  "unit": "g",
  "expiry_date": "2025-06-15",
  "barcode": "8001234567890"
}
```

### Recipes

#### Rechercher des recettes

```http
GET /api/v1/recipes/search
```

**Query parameters:**
- `ingredients` (array): Ingrédients disponibles
- `cuisine` (string): Type de cuisine
- `time` (number): Temps max en minutes
- `difficulty` (string): easy, medium, hard

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Spaghetti Carbonara",
      "cuisine": "Italienne",
      "prep_time": 10,
      "cook_time": 20,
      "difficulty": "easy",
      "servings": 4,
      "image_url": "https://storage.example.com/recipes/carbonara.jpg",
      "ingredients": [
        {
          "name": "Spaghetti",
          "quantity": 400,
          "unit": "g"
        }
      ],
      "instructions": [
        "Faire bouillir l'eau...",
        "Pendant ce temps..."
      ],
      "nutrition": {
        "calories": 420,
        "protein": 18,
        "carbs": 55,
        "fat": 15
      }
    }
  ],
  "total": 23
}
```

#### Importer une recette depuis une URL

```http
POST /api/v1/recipes/import
```

**Body:**
```json
{
  "url": "https://www.instagram.com/p/ABC123/",
  "pantry_id": "uuid"
}
```

### Shopping Lists

#### Obtenir les listes de courses

```http
GET /api/v1/shopping-lists
```

#### Créer une liste de courses

```http
POST /api/v1/shopping-lists
```

**Body:**
```json
{
  "name": "Courses de la semaine",
  "items": [
    {
      "product_name": "Tomates",
      "quantity": 1,
      "unit": "kg",
      "category": "Légumes"
    }
  ]
}
```

### Scanner & Vision

#### Scanner un code-barres

```http
POST /api/v1/scanner/barcode
```

**Body:**
```json
{
  "barcode": "3123456789012",
  "pantry_id": "uuid"
}
```

#### Analyser une image (Vision AI)

```http
POST /api/v1/scanner/vision
```

**Body (multipart/form-data):**
- `image`: Fichier image (JPEG, PNG)
- `pantry_id`: ID du garde-manger
- `auto_add`: Boolean pour ajout automatique

**Response:**
```json
{
  "detected_products": [
    {
      "name": "Pommes Golden",
      "confidence": 0.95,
      "quantity": 6,
      "unit": "pièces",
      "category": "Fruits",
      "freshness": "good",
      "estimated_expiry": "2024-01-25"
    }
  ],
  "processing_time": 1.2
}
```

### AI Assistant

#### Envoyer un message à l'assistant

```http
POST /api/v1/ai-assistant/chat
```

**Body:**
```json
{
  "message": "Que puis-je cuisiner avec mes tomates et pâtes?",
  "context": {
    "pantry_id": "uuid",
    "dietary_preferences": ["vegetarian"],
    "cooking_time": 30
  }
}
```

**Response:**
```json
{
  "response": "Avec vos tomates et pâtes, je vous suggère...",
  "suggestions": [
    {
      "recipe_id": "uuid",
      "name": "Pâtes à la sauce tomate fraîche",
      "match_score": 0.92
    }
  ]
}
```

## 🆕 Evolution V2 APIs

### 🧠 AI Nutritionist API

#### Profil de santé

##### Créer/Mettre à jour le profil

```http
PUT /api/v2/nutrition/profile
```

**Body:**
```json
{
  "age": 30,
  "gender": "male",
  "weight": 75,
  "height": 180,
  "activityLevel": "moderately_active",
  "goals": [
    {
      "type": "weight_loss",
      "priority": "high",
      "targetValue": 70,
      "targetDate": "2025-12-31"
    }
  ],
  "medicalConditions": ["hypertension"],
  "allergies": ["lactose", "gluten"],
  "dietaryPreferences": [
    {
      "type": "vegetarian",
      "strictness": "flexible"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "profile-123",
    "userId": "user-456",
    "bmr": 1750,
    "tdee": 2625,
    "dailyCalories": 2231,
    "macroTargets": {
      "protein": 150,
      "carbohydrates": 280,
      "fat": 62,
      "fiber": 35
    },
    "createdAt": "2025-08-07T10:00:00Z",
    "updatedAt": "2025-08-07T10:00:00Z"
  }
}
```

##### Obtenir le profil

```http
GET /api/v2/nutrition/profile
```

#### Analyse nutritionnelle

##### Analyser l'alimentation actuelle

```http
POST /api/v2/nutrition/analyze
```

**Body:**
```json
{
  "period": "week",
  "includeRecommendations": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalCalories": 2450,
    "averageDailyCalories": 2450,
    "macronutrients": {
      "protein": {
        "grams": 120,
        "percentage": 20,
        "vsTarget": -30
      },
      "carbohydrates": {
        "grams": 300,
        "percentage": 49,
        "vsTarget": 20
      },
      "fat": {
        "grams": 85,
        "percentage": 31,
        "vsTarget": 23
      },
      "fiber": {
        "grams": 22,
        "vsTarget": -13
      }
    },
    "micronutrients": {
      "vitamins": {
        "vitaminC": {
          "amount": 85,
          "unit": "mg",
          "dailyValuePercentage": 95
        }
      },
      "minerals": {
        "iron": {
          "amount": 12,
          "unit": "mg",
          "dailyValuePercentage": 67
        }
      }
    },
    "nutritionalScore": 78,
    "healthAlerts": [
      {
        "type": "deficiency",
        "nutrient": "protein",
        "severity": "medium",
        "message": "Apport en protéines insuffisant pour vos objectifs"
      }
    ],
    "recommendations": [
      {
        "priority": "high",
        "category": "protein",
        "suggestion": "Ajoutez 30g de protéines par jour",
        "foods": ["lentilles", "tofu", "quinoa"]
      }
    ]
  }
}
```

### 📅 Meal Planning API

#### Plans de repas

##### Générer un plan hebdomadaire

```http
POST /api/v2/meal-planning/generate
```

**Body:**
```json
{
  "weekStartDate": "2025-08-12",
  "preferences": {
    "budget": 150,
    "servings": 4,
    "cookingTime": "medium",
    "cuisineTypes": ["française", "italienne"],
    "avoidIngredients": ["porc", "fruits de mer"]
  },
  "useHealthProfile": true,
  "optimizeForBudget": true,
  "prioritizeSeasonal": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "plan-789",
    "weekStartDate": "2025-08-12",
    "meals": [
      {
        "id": "meal-001",
        "dayOfWeek": 1,
        "mealType": "lunch",
        "recipeId": "recipe-123",
        "recipeName": "Ratatouille provençale",
        "servings": 4,
        "prepTime": 20,
        "cookTime": 45,
        "estimatedCost": 8.50,
        "nutritionalInfo": {
          "calories": 220,
          "protein": 8,
          "carbs": 28,
          "fat": 10
        },
        "ingredients": [
          {
            "name": "Aubergine",
            "quantity": 2,
            "unit": "pièces",
            "estimatedCost": 3.00,
            "inInventory": false
          }
        ]
      }
    ],
    "totalCost": 145.80,
    "nutritionalSummary": {
      "averageDailyCalories": 2250,
      "macroBalance": "optimal",
      "micronutrientCoverage": 0.92
    },
    "savingsVsAverage": 25.50,
    "seasonalScore": 0.85
  }
}
```

#### Liste de courses

##### Optimiser la liste de courses

```http
POST /api/v2/meal-planning/shopping-list/optimize
```

**Body:**
```json
{
  "mealPlanId": "plan-789",
  "consolidate": true,
  "groupByStore": true,
  "includePrices": true
}
```

### 👥 Community API

#### Recettes communautaires

##### Partager une recette

```http
POST /api/v2/community/recipes
```

**Body:**
```json
{
  "title": "Tarte aux pommes de grand-mère",
  "description": "Une recette traditionnelle transmise de génération en génération",
  "ingredients": [
    {
      "name": "Pommes",
      "quantity": 6,
      "unit": "pièces"
    }
  ],
  "instructions": [
    "Préchauffer le four à 180°C",
    "Éplucher et couper les pommes en lamelles"
  ],
  "prepTime": 20,
  "cookTime": 35,
  "servings": 8,
  "difficulty": "easy",
  "tags": ["dessert", "traditionnel", "automne"],
  "images": ["image-url-1", "image-url-2"]
}
```

##### Rechercher des recettes

```http
GET /api/v2/community/recipes/search?q=végétarien&tags=rapide,budget&difficulty=easy
```

#### Challenges

##### Rejoindre un challenge

```http
POST /api/v2/community/challenges/{challengeId}/join
```

##### Soumettre une participation

```http
POST /api/v2/community/challenges/{challengeId}/submit
```

**Body:**
```json
{
  "recipeId": "recipe-community-123",
  "images": ["submission-image-1.jpg"],
  "cookingStory": "J'ai adapté cette recette en utilisant...",
  "timeSpent": 45
}
```

#### Consultations experts

##### Réserver une consultation

```http
POST /api/v2/community/consultations/book
```

**Body:**
```json
{
  "expertId": "expert-nutritionist-01",
  "preferredDate": "2025-08-15",
  "preferredTime": "14:00",
  "duration": 30,
  "topics": ["perte de poids", "alimentation végétarienne"],
  "notes": "Je souhaite discuter de mon plan alimentaire"
}
```

### 🏠 IoT API

#### Gestion des appareils

##### Découvrir les appareils

```http
GET /api/v2/iot/devices/discover
```

**Response:**
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "device-fridge-001",
        "type": "smart_fridge",
        "brand": "Samsung",
        "model": "Family Hub",
        "status": "online",
        "capabilities": ["temperature", "inventory", "camera"],
        "currentData": {
          "temperature": {
            "main": 4,
            "freezer": -18,
            "vegetable": 7
          }
        }
      }
    ]
  }
}
```

##### Contrôler un appareil

```http
POST /api/v2/iot/devices/{deviceId}/control
```

**Body:**
```json
{
  "command": "setTemperature",
  "parameters": {
    "zone": "main",
    "temperature": 5
  }
}
```

#### Sessions de cuisine

##### Démarrer une session guidée

```http
POST /api/v2/iot/cooking-sessions/start
```

**Body:**
```json
{
  "recipeId": "recipe-456",
  "devices": [
    {
      "deviceId": "device-oven-001",
      "role": "main_cooking"
    },
    {
      "deviceId": "device-scale-001",
      "role": "measuring"
    }
  ]
}
```

### 📊 Analytics API

#### Prédictions de gaspillage

##### Obtenir les prédictions

```http
GET /api/v2/analytics/waste-predictions
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "productId": "inv-item-123",
        "productName": "Bananes",
        "currentQuantity": 6,
        "unit": "pièces",
        "wasteRisk": "high",
        "predictedWasteDate": "2025-08-10",
        "confidence": 0.89,
        "reasons": [
          "Consommation habituelle: 2/semaine",
          "Mûrissement rapide détecté"
        ],
        "preventionSuggestions": [
          "Utilisez 3 bananes pour un banana bread",
          "Congelez les bananes mûres pour smoothies"
        ],
        "estimatedSavings": 2.50
      }
    ],
    "totalPotentialWaste": 15.80,
    "preventableWaste": 12.30
  }
}
```

#### Analyse comportementale

##### Analyser les habitudes d'achat

```http
POST /api/v2/analytics/buying-behavior
```

**Body:**
```json
{
  "period": {
    "start": "2025-01-01",
    "end": "2025-08-01"
  },
  "groupBy": "category",
  "includeSeasonality": true
}
```

#### Score de durabilité

##### Calculer le score

```http
GET /api/v2/analytics/sustainability-score
```

### 🔄 Sync API

#### État de synchronisation

##### Obtenir l'état actuel

```http
GET /api/v2/sync/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isOnline": true,
    "isSyncing": false,
    "lastSync": "2025-08-07T10:30:00Z",
    "pendingOperations": 3,
    "conflictCount": 0,
    "syncProgress": 100,
    "bandwidthMode": "high",
    "batteryOptimized": false
  }
}
```

##### Forcer la synchronisation

```http
POST /api/v2/sync/trigger
```

**Body:**
```json
{
  "priority": "high",
  "entities": ["inventory", "recipes"],
  "forceFull": false
}
```

#### Résolution de conflits

##### Obtenir les conflits

```http
GET /api/v2/sync/conflicts
```

##### Résoudre un conflit

```http
POST /api/v2/sync/conflicts/{conflictId}/resolve
```

**Body:**
```json
{
  "resolution": "client_wins",
  "mergeFields": ["quantity", "expiryDate"]
}
```

## 🔒 Sécurité et limites

### Rate Limiting

| Endpoint | Limite | Fenêtre |
|----------|---------|---------|
| Lecture | 1000/heure | 1 heure |
| Écriture | 100/heure | 1 heure |
| IA/ML | 50/heure | 1 heure |
| IoT | 500/heure | 1 heure |
| Vision AI | 100/heure | 1 heure |

### Headers de sécurité

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Webhooks

Pour recevoir des notifications en temps réel :

```http
POST /api/v2/webhooks/subscribe
```

**Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "events": [
    "waste.prediction.high",
    "iot.device.alert",
    "community.challenge.completed",
    "sync.conflict.detected",
    "product.expiring.soon"
  ],
  "secret": "your-webhook-secret"
}
```

### Gestion des erreurs

Toutes les erreurs suivent ce format :

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Description de l'erreur",
    "details": {
      "field": "email",
      "reason": "Format invalide"
    }
  },
  "timestamp": "2025-08-07T10:00:00Z",
  "request_id": "req_abc123"
}
```

### Pagination

La pagination utilise les paramètres standards :

```http
GET /api/v2/resource?page=2&limit=20
```

**Response headers:**
```http
X-Total-Count: 150
X-Page-Count: 8
Link: <https://api.smartpantrypro.com/v2/resource?page=3&limit=20>; rel="next"
```

---

*Documentation API Smart Pantry Pro - Version 2.0*