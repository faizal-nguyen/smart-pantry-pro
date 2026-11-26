# API Documentation - Smart Pantry Pro

## Overview

Smart Pantry Pro API v1 provides a comprehensive RESTful API for managing inventory, recipes, shopping lists, and user profiles. The API follows the repository pattern with business logic in services and validation at all layers.

**Base URL**: `http://localhost:4000/api/v1`
**Production URL**: `https://api.smartpantrypro.com/api/v1`

## Authentication

All API endpoints (except public ones) require authentication using Supabase JWT tokens.

### Request Headers

```http
Authorization: Bearer <your-supabase-jwt-token>
Content-Type: application/json
```

### Getting a Token

Users authenticate through Supabase Auth. The client should obtain a JWT token via:

```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

## Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "details": [
    {
      "field": "field.name",
      "message": "Validation error message"
    }
  ]
}
```

### HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `204 No Content` - Request successful, no content to return
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Inventory Endpoints

Retirées en V11-06 E4b (novembre 2026), sans appelant. Le stock passe par `/api/v1/stock` (commandes de stock, V11-05).

---

## Recipe Endpoints

### Get All Recipes

```http
GET /api/v1/recipes
```

**Query Parameters:**
- `category` (optional) - Filter by category
- `difficulty` (optional) - Filter by difficulty (Easy, Medium, Hard)
- `maxPrepTime` (optional) - Maximum prep time in minutes
- `favoritesOnly` (optional) - Show only favorites (true/false)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Poulet rôti",
      "description": "Un délicieux poulet rôti avec légumes",
      "category": "Plats principaux",
      "difficulty": "Medium",
      "prep_time_minutes": 15,
      "cook_time_minutes": 60,
      "servings": 4,
      "ingredients": [
        { "name": "Poulet", "quantity": 1, "unit": "kg" },
        { "name": "Carottes", "quantity": 3, "unit": "pièce" }
      ],
      "steps": [
        "Préchauffer le four à 200°C",
        "Assaisonner le poulet",
        "Cuire 60 minutes"
      ],
      "image_url": "https://...",
      "video_url": "https://...",
      "source_url": "https://...",
      "is_favorite": true,
      "created_at": "2025-10-01T12:00:00Z"
    }
  ]
}
```

### Get Recipe Statistics

```http
GET /api/v1/recipes/stats
```

**Response:**
```json
{
  "data": {
    "total": 25,
    "favorites": 8,
    "byCategory": {
      "Plats principaux": 10,
      "Desserts": 8,
      "Entrées": 7
    },
    "byDifficulty": {
      "Easy": 15,
      "Medium": 8,
      "Hard": 2
    },
    "avgPrepTime": 25
  }
}
```

### Get Favorite Recipes

```http
GET /api/v1/recipes/favorites
```

### Get Recent Recipes

```http
GET /api/v1/recipes/recent?limit=10
```

### Get Cookable Recipes

```http
GET /api/v1/recipes/cookable
```

Returns recipes sorted by match percentage with available inventory.

**Response:**
```json
{
  "data": [
    {
      "recipe": { ... },
      "matchPercentage": 85,
      "missingIngredients": ["sel", "poivre"]
    }
  ]
}
```

### Get Recipe Suggestions

```http
GET /api/v1/recipes/suggestions
```

Returns recipe suggestions based on expiring inventory items.

**Response:**
```json
{
  "data": [
    {
      "recipe": { ... },
      "expiringIngredients": ["lait", "oeufs"],
      "urgency": "high"
    }
  ]
}
```

### Search Recipes

```http
GET /api/v1/recipes/search?q=poulet
```

### Create Recipe

```http
POST /api/v1/recipes
Content-Type: application/json

{
  "title": "Poulet rôti",
  "description": "Un délicieux poulet rôti",
  "category": "Plats principaux",
  "difficulty": "Medium",
  "prep_time_minutes": 15,
  "cook_time_minutes": 60,
  "servings": 4,
  "ingredients": [
    { "name": "Poulet", "quantity": 1, "unit": "kg" }
  ],
  "steps": [
    "Préchauffer le four à 200°C"
  ]
}
```

### Update Recipe

```http
PUT /api/v1/recipes/:id
Content-Type: application/json

{
  "title": "Nouveau titre",
  "servings": 6
}
```

### Toggle Favorite

```http
POST /api/v1/recipes/:id/favorite
```

### Delete Recipe

```http
DELETE /api/v1/recipes/:id
```

---

## Shopping List Endpoints

Retirées en V11-06 E4b (novembre 2026), sans appelant. Les courses passent par `/api/v1/stock` (commandes de courses, V11-05) et `/api/v1/menus` (courses de la semaine, V11-01).

---

## User Endpoints

### Get Current User Profile

```http
GET /api/v1/users/me
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Jean Dupont",
    "avatar_url": "https://...",
    "dietary_restrictions": ["végétarien", "sans gluten"],
    "allergens": ["arachides", "lactose"],
    "preferences": {
      "theme": "dark",
      "notifications": true
    },
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### Get Full Profile with Stats

```http
GET /api/v1/users/me/full
```

**Response:**
```json
{
  "data": {
    "profile": { ... },
    "stats": {
      "inventoryItems": 45,
      "recipes": 25,
      "shoppingLists": 3
    }
  }
}
```

### Get User Stats

```http
GET /api/v1/users/me/stats
```

### Get Profile Completion

```http
GET /api/v1/users/me/completion
```

**Response:**
```json
{
  "data": {
    "percentage": 85,
    "isComplete": false
  }
}
```

### Update Profile

```http
PUT /api/v1/users/me
Content-Type: application/json

{
  "full_name": "Jean Dupont",
  "avatar_url": "https://..."
}
```

### Update Preferences

```http
PUT /api/v1/users/me/preferences
Content-Type: application/json

{
  "theme": "dark",
  "notifications": true,
  "language": "fr"
}
```

### Get Specific Preference

```http
GET /api/v1/users/me/preferences/:key
```

### Set Specific Preference

```http
PUT /api/v1/users/me/preferences/:key
Content-Type: application/json

{
  "value": "dark"
}
```

### Update Dietary Restrictions

```http
PUT /api/v1/users/me/dietary-restrictions
Content-Type: application/json

{
  "restrictions": ["végétarien", "sans gluten"]
}
```

### Update Allergens

```http
PUT /api/v1/users/me/allergens
Content-Type: application/json

{
  "allergens": ["arachides", "lactose"]
}
```

### Deactivate Account

```http
POST /api/v1/users/me/deactivate
```

Soft deletes the user profile (marks as inactive).

### Reactivate Account

```http
POST /api/v1/users/me/reactivate
```

---

## Data Models

### Inventory Item

```typescript
{
  id: string (uuid)
  user_id: string (uuid)
  name: string
  quantity: number
  unit: string
  category?: string
  location: {
    zone: string
    shelf?: string
  }
  expiration_date: string (ISO 8601)
  freshness: number (0-1)
  barcode?: string
  image_url?: string
  nutritional_value?: {
    vitamins?: number (0-100)
    minerals?: number (0-100)
    fiber?: number (0-100)
  }
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
}
```

### Recipe

```typescript
{
  id: string (uuid)
  user_id: string (uuid)
  title: string
  description?: string
  category?: string
  difficulty?: 'Easy' | 'Medium' | 'Hard'
  prep_time_minutes?: number
  cook_time_minutes?: number
  servings?: number
  ingredients: Array<{
    name: string
    quantity?: number
    unit?: string
  }>
  steps?: string[]
  image_url?: string
  video_url?: string
  source_url?: string
  is_favorite: boolean
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
}
```

### Shopping Item

```typescript
{
  id: string (uuid)
  user_id: string (uuid)
  shopping_list_id: string (uuid)
  name: string
  quantity: number
  unit: string
  category?: string
  estimated_price?: number
  store_section?: string
  is_checked: boolean
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
}
```

### User Profile

```typescript
{
  id: string (uuid)
  email: string
  full_name?: string
  avatar_url?: string
  dietary_restrictions?: string[]
  allergens?: string[]
  preferences?: Record<string, any>
  is_active: boolean
  created_at: string (ISO 8601)
  updated_at: string (ISO 8601)
}
```

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **General endpoints**: 100 requests per minute per IP
- **AI/Assistant endpoints**: 30 requests per minute per IP
- **Video processing**: 30 requests per minute per IP

When rate limit is exceeded, the API returns:

```json
{
  "error": "Too many requests, please try again later"
}
```

---

## Best Practices

1. **Always include Authorization header** for protected endpoints
2. **Validate data on client side** before sending to API
3. **Handle errors gracefully** with proper user feedback
4. **Use pagination** for large result sets (when available)
5. **Cache responses** when appropriate to reduce API calls
6. **Implement retry logic** with exponential backoff for failed requests
7. **Monitor rate limits** and implement client-side throttling

---

## Support

For API support and questions:
- Email: support@smartpantrypro.com
- GitHub Issues: https://github.com/smartpantrypro/api/issues
- Documentation: https://docs.smartpantrypro.com
