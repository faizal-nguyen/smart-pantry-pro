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

### Shopping Lists - **Enhanced (PRP-004)**

#### Obtenir les listes de courses avec temps réel

```http
GET /api/v1/shopping-lists
```

**Query parameters:**
- `include_shared` (boolean): Inclure les listes partagées
- `status` (string): all | active | completed | archived

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Courses de la semaine",
      "created_at": "2025-08-18T10:00:00Z",
      "updated_at": "2025-08-18T10:15:00Z",
      "status": "active",
      "items_count": 12,
      "items_checked": 3,
      "estimated_total": 45.80,
      "shared_with": ["user-2", "user-3"],
      "store_layout": "carrefour_standard",
      "auto_organized": true
    }
  ],
  "total": 5
}
```

#### Créer une liste de courses intelligente

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
      "category": "Légumes",
      "estimated_price": 3.50,
      "priority": "high",
      "notes": "Bio de préférence"
    }
  ],
  "auto_organize": true,
  "share_with": ["user-uuid-2"],
  "store_preference": "carrefour_center_ville"
}
```

#### Synchronisation temps réel

```http
WebSocket: wss://api.smartpantrypro.com/v1/shopping-lists/{list_id}/realtime
```

**Messages reçus:**
```json
{
  "type": "item_checked",
  "data": {
    "item_id": "uuid",
    "checked": true,
    "checked_by": "user-uuid",
    "timestamp": "2025-08-18T10:30:00Z"
  }
}

{
  "type": "item_added",
  "data": {
    "item": {
      "id": "uuid",
      "product_name": "Baguette",
      "quantity": 1,
      "category": "Pain"
    },
    "added_by": "user-uuid",
    "timestamp": "2025-08-18T10:31:00Z"
  }
}

{
  "type": "user_presence",
  "data": {
    "user_id": "user-uuid",
    "status": "online",
    "current_section": "Fruits & Légumes",
    "last_seen": "2025-08-18T10:32:00Z"
  }
}
```

#### Mode magasin

```http
POST /api/v1/shopping-lists/{list_id}/start-shopping
```

**Body:**
```json
{
  "store_location": {
    "name": "Carrefour Centre Ville",
    "layout_id": "carrefour_standard"
  },
  "enable_geofencing": true
}
```

**Response:**
```json
{
  "shopping_session": {
    "id": "session-uuid",
    "optimized_route": [
      {
        "section": "Fruits & Légumes",
        "order": 1,
        "items": [...]
      }
    ],
    "estimated_duration": 25,
    "total_items": 12
  }
}
```

#### Compléter un item

```http
PATCH /api/v1/shopping-lists/{list_id}/items/{item_id}
```

**Body:**
```json
{
  "checked": true,
  "actual_price": 3.20,
  "notes": "Trouvé en promotion",
  "location": {
    "section": "Fruits & Légumes",
    "aisle": "A2"
  }
}
```

### Scanner & Vision - **Enhanced (PRP-010)**

#### Scanner un code-barres avec fallbacks

```http
POST /api/v1/scanner/barcode
```

**Body:**
```json
{
  "barcode": "3123456789012",
  "pantry_id": "uuid",
  "source_preference": "openfoodfacts" // optionnel
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Lait demi-écrémé",
    "brand": "Lactel",
    "category": "Produits laitiers",
    "unit": "L",
    "imageUrl": "https://images.openfoodfacts.org/...",
    "source": "openfoodfacts",
    "confidence": 0.95,
    "nutritionalInfo": {
      "calories": 46,
      "protein": 3.2,
      "fat": 1.6
    }
  },
  "fallbacks_used": ["barcode-spider", "upc-database"],
  "processing_time": 1.2
}
```

#### Diagnostics du scanner

```http
GET /api/v1/scanner/diagnostics
```

**Response:**
```json
{
  "capabilities": {
    "hasCamera": true,
    "cameraCount": 2,
    "hasMultipleCameras": true,
    "supportedFormats": ["EAN_13", "UPC_A", "CODE_128"],
    "permissions": "granted"
  },
  "apis_status": {
    "openfoodfacts": {
      "status": "operational",
      "response_time": 245
    },
    "barcode_spider": {
      "status": "limited",
      "daily_quota_remaining": 450
    },
    "upc_database": {
      "status": "operational",
      "response_time": 180
    }
  }
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
- `detect_multiple`: Boolean pour détection multi-produits

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
      "estimated_expiry": "2024-01-25",
      "bounding_box": {
        "x": 120, "y": 80, "width": 200, "height": 150
      }
    }
  ],
  "processing_time": 1.2,
  "image_quality": "good"
}
```

### AI Assistant - **Enhanced (PRP-002)**

#### Chat conversationnel avec streaming

```http
POST /api/v1/ai-assistant/chat/stream
```

**Body:**
```json
{
  "message": "Que puis-je cuisiner avec mes tomates et pâtes?",
  "conversation_id": "uuid", // optionnel pour historique
  "context": {
    "pantry_id": "uuid",
    "dietary_preferences": ["vegetarian"],
    "cooking_time": 30,
    "mode": "recipe-finder" // recipe-finder | cooking-guide | meal-planner
  },
  "stream": true
}
```

**Response (Server-Sent Events):**
```
data: {"type": "start", "conversation_id": "uuid"}

data: {"type": "token", "content": "Avec vos tomates"}

data: {"type": "token", "content": " et pâtes, je vous suggère"}

data: {"type": "suggestions", "data": [{"recipe_id": "uuid", "name": "Pâtes arrabbiata"}]}

data: {"type": "complete", "total_tokens": 45, "processing_time": 2.1}
```

#### Historique des conversations

```http
GET /api/v1/ai-assistant/conversations
```

**Query parameters:**
- `limit` (number): Nombre de conversations (défaut: 20)
- `offset` (number): Décalage pour la pagination

**Response:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "title": "Recettes avec tomates",
      "last_message": "Parfait ! La recette d'arrabbiata...",
      "created_at": "2025-08-18T10:00:00Z",
      "updated_at": "2025-08-18T10:15:00Z",
      "message_count": 8
    }
  ],
  "total": 15
}
```

#### Obtenir une conversation

```http
GET /api/v1/ai-assistant/conversations/{conversation_id}
```

**Response:**
```json
{
  "conversation": {
    "id": "uuid",
    "title": "Recettes avec tomates",
    "messages": [
      {
        "id": "msg-1",
        "role": "user",
        "content": "Que puis-je cuisiner avec mes tomates?",
        "timestamp": "2025-08-18T10:00:00Z"
      },
      {
        "id": "msg-2", 
        "role": "assistant",
        "content": "Avec vos tomates fraîches, je vous suggère...",
        "timestamp": "2025-08-18T10:00:15Z",
        "suggestions": [...]
      }
    ]
  }
}
```

### Voice Recognition - **Enhanced (PRP-009)**

#### Traitement de la reconnaissance vocale

```http
POST /api/v1/voice/process
```

**Body:**
```json
{
  "transcript": "ajoute deux litres de lait",
  "action_type": "inventory_add", // inventory_add | recipe_search | assistant_query
  "context": {
    "pantry_id": "uuid",
    "language": "fr-FR"
  }
}
```

**Response:**
```json
{
  "success": true,
  "parsed_action": {
    "action": "add_product",
    "product": {
      "name": "Lait",
      "quantity": 2,
      "unit": "L",
      "category": "Produits laitiers"
    },
    "confidence": 0.95
  },
  "suggested_alternatives": [
    {
      "product": "Lait entier",
      "confidence": 0.88
    }
  ],
  "needs_confirmation": false
}
```

#### Diagnostics vocaux

```http
GET /api/v1/voice/diagnostics
```

**Response:**
```json
{
  "browser_support": {
    "speech_recognition": true,
    "speech_synthesis": true,
    "supported_languages": ["fr-FR", "en-US"],
    "continuous_recognition": true
  },
  "vocabulary_status": {
    "french_food_terms": 1250,
    "cooking_actions": 85,
    "units_measures": 42,
    "last_updated": "2025-08-15T10:00:00Z"
  }
}
```

### Analytics & Insights - **Enhanced (PRP-007)**

#### Obtenir le dashboard insights

```http
GET /api/v1/analytics/dashboard
```

**Query parameters:**
- `period` (string): week | month | quarter | year
- `compare_to_previous` (boolean): Comparaison avec période précédente

**Response:**
```json
{
  "summary": {
    "waste_reduction": {
      "percentage": -47,
      "value_saved": 152.50,
      "trend": "improving"
    },
    "meals_cooked": {
      "count": 85,
      "vs_previous": 12,
      "trend": "improving"
    },
    "savings": {
      "monthly": 152.50,
      "yearly_projection": 1830,
      "roi_percentage": 340
    }
  },
  "charts": {
    "consumption_by_category": [
      {
        "category": "Fruits & Légumes",
        "value": 180.30,
        "percentage": 35,
        "trend": 5.2
      }
    ],
    "weekly_trends": [
      {
        "week": "2025-W33",
        "spending": 45.20,
        "waste": 3.50,
        "meals": 12
      }
    ]
  },
  "achievements": [
    {
      "id": "zero_waste_week",
      "title": "Semaine zéro déchet",
      "description": "Aucun produit gaspillé cette semaine",
      "unlocked_at": "2025-08-18T10:00:00Z",
      "points": 50
    }
  ]
}
```

#### Obtenir les métriques détaillées

```http
GET /api/v1/analytics/metrics
```

**Query parameters:**
- `metric` (string): waste | consumption | savings | sustainability
- `granularity` (string): daily | weekly | monthly
- `start_date` (string): Date de début (ISO 8601)
- `end_date` (string): Date de fin (ISO 8601)

**Response:**
```json
{
  "metric": "waste",
  "period": {
    "start": "2025-08-01T00:00:00Z",
    "end": "2025-08-18T23:59:59Z"
  },
  "data_points": [
    {
      "date": "2025-08-01",
      "value": 4.2,
      "unit": "kg",
      "estimated_value": 15.80,
      "categories": {
        "Fruits & Légumes": 2.1,
        "Produits laitiers": 1.5,
        "Pain": 0.6
      }
    }
  ],
  "aggregated": {
    "total": 28.4,
    "average_daily": 1.58,
    "trend": -15.3,
    "prediction_next_month": 22.1
  }
}
```

#### Obtenir les achievements

```http
GET /api/v1/analytics/achievements
```

**Response:**
```json
{
  "current_level": {
    "level": 15,
    "title": "Chef Eco-responsable",
    "points": 1250,
    "next_level_at": 1500
  },
  "recent_achievements": [
    {
      "id": "scanner_master",
      "title": "Maître du scanner",
      "description": "100 produits scannés avec succès",
      "icon": "📷",
      "points": 25,
      "unlocked_at": "2025-08-17T14:30:00Z",
      "category": "productivity"
    }
  ],
  "available_challenges": [
    {
      "id": "weekly_meal_prep",
      "title": "Préparation hebdomadaire",
      "description": "Planifiez 7 repas cette semaine",
      "reward_points": 35,
      "expires_at": "2025-08-25T00:00:00Z",
      "progress": {
        "current": 3,
        "target": 7
      }
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