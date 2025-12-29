# API Architecture - Smart Pantry Pro

## Overview

Smart Pantry Pro API follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│         Routes Layer                │
│  (HTTP endpoints, validation)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Service Layer               │
│  (Business logic, orchestration)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Repository Layer               │
│  (Data access, RLS enforcement)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         Supabase                    │
│  (PostgreSQL, Auth, Storage)        │
└─────────────────────────────────────┘
```

## Architecture Layers

### 1. Routes Layer (`src/routes/`)

**Responsibility**: HTTP request handling, response formatting

**Files**:
- `inventory.routes.ts` - Inventory management endpoints
- `recipes.routes.ts` - Recipe management endpoints
- `shopping.routes.ts` - Shopping list endpoints
- `users.routes.ts` - User profile endpoints
- `v1.ts` - Main v1 router with authentication

**Key Principles**:
- Thin controllers - minimal logic
- Input validation via middleware
- Authentication enforcement
- Error handling
- Response formatting

**Example**:
```typescript
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await service.getStats(userId);
    res.json({ data: stats });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
```

### 2. Service Layer (`src/services/`)

**Responsibility**: Business logic, data orchestration, complex operations

**Files**:
- `InventoryService.ts` - Inventory business logic
- `RecipeService.ts` - Recipe operations, cookable recipes
- `ShoppingService.ts` - Shopping list management
- `UserService.ts` - User profile management

**Key Features**:
- Cross-repository operations
- Business rule enforcement
- Data transformation
- Algorithm implementation (e.g., freshness calculation)

**Example - Freshness Calculation**:
```typescript
private calculateFreshness(expirationDate: string): number {
  const now = new Date();
  const expiry = new Date(expirationDate);
  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry <= 0) return 0; // Expired
  if (daysUntilExpiry >= 30) return 1; // Very fresh

  // Linear scale: 30 days = 100%, 0 days = 0%
  return daysUntilExpiry / 30;
}
```

**Example - Recipe Matching**:
```typescript
async findCookableRecipes(userId: string) {
  const [recipes, inventoryItems] = await Promise.all([
    this.recipeRepository.findAll(userId),
    this.inventoryRepository.findAll(userId)
  ]);

  const inventoryItemNames = new Set(
    inventoryItems.map(item => item.name.toLowerCase())
  );

  return recipes.map(recipe => {
    const ingredients = recipe.ingredients || [];
    const ingredientNames = ingredients.map(ing =>
      ing.name.toLowerCase()
    );

    const availableCount = ingredientNames.filter(name =>
      inventoryItemNames.has(name)
    ).length;

    const matchPercentage = ingredientNames.length > 0
      ? Math.round((availableCount / ingredientNames.length) * 100)
      : 0;

    return {
      recipe,
      matchPercentage,
      missingIngredients: ingredientNames.filter(
        name => !inventoryItemNames.has(name)
      )
    };
  }).sort((a, b) => b.matchPercentage - a.matchPercentage);
}
```

### 3. Repository Layer (`src/repositories/`)

**Responsibility**: Data access abstraction, RLS enforcement

**Files**:
- `BaseRepository.ts` - Abstract base class with CRUD operations
- `InventoryRepository.ts` - Inventory data access
- `RecipeRepository.ts` - Recipe data access
- `ShoppingRepository.ts` - Shopping list data access
- `UserRepository.ts` - User profile data access

**Key Features**:
- **Row Level Security (RLS)**: All queries filter by `user_id`
- **Type safety**: TypeScript generics for type-safe operations
- **Common patterns**: Shared CRUD operations in BaseRepository
- **Domain-specific queries**: Specialized methods per repository

**BaseRepository Pattern**:
```typescript
export abstract class BaseRepository<T> {
  protected supabase: SupabaseClient<Database>;
  protected tableName: string;

  async findById(id: string, userId: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)  // RLS enforcement
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as T;
  }

  async findAll(
    userId: string,
    filters?: Record<string, any>
  ): Promise<T[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);  // RLS enforcement

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as T[];
  }
}
```

**Specialized Repository Methods**:
```typescript
// InventoryRepository
async findExpiringSoon(userId: string, withinDays: number = 7) {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + withinDays);

  const { data, error } = await this.supabase
    .from(this.tableName)
    .select('*')
    .eq('user_id', userId)
    .lte('expiration_date', expirationDate.toISOString())
    .order('expiration_date', { ascending: true });

  if (error) throw error;
  return (data || []) as InventoryItem[];
}
```

### 4. Middleware Layer (`src/middleware/`)

**Responsibility**: Request processing, validation, authentication

**Files**:
- `auth.middleware.ts` - JWT authentication, RBAC
- `validation.middleware.ts` - Zod schema validation, sanitization

**Authentication Middleware**:
```typescript
export function createAuthMiddleware(supabase: SupabaseClient<Database>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'No authorization token provided'
        });
      }

      const token = authHeader.substring(7);

      // Verify with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({
          error: 'Invalid or expired token'
        });
      }

      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      next();
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}
```

**Validation Middleware**:
```typescript
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
}
```

## Data Flow

### Typical Request Flow

1. **Client Request** → API endpoint with JWT token
2. **Authentication Middleware** → Validates JWT, extracts user
3. **Validation Middleware** → Validates request body/params with Zod
4. **Route Handler** → Receives validated request
5. **Service Layer** → Executes business logic
6. **Repository Layer** → Performs database operations (with RLS)
7. **Supabase** → Returns data
8. **Response** → Formatted JSON response to client

### Example: Create Inventory Item

```
Client
  ↓ POST /api/v1/inventory { name: "Lait", ... }
  ↓ Authorization: Bearer <token>

Auth Middleware
  ↓ Validates JWT
  ↓ Attaches req.user = { id: "user-123" }

Validation Middleware
  ↓ Validates body with createInventoryItemSchema

Route Handler (inventory.routes.ts)
  ↓ service.create(userId, req.body)

InventoryService
  ↓ Calculates freshness
  ↓ repository.create({ ...data, user_id: userId })

InventoryRepository
  ↓ supabase.from('inventory_items').insert(...)

Supabase
  ↓ RLS policies check user_id
  ↓ Returns created item

Response
  ↓ { data: { id: "...", name: "Lait", ... } }
```

## Security

### Row Level Security (RLS)

All database operations enforce RLS through `user_id` filtering:

```typescript
// ✅ Every query includes user_id check
.eq('user_id', userId)

// ❌ Never query without user_id
.select('*')  // WRONG - no RLS
```

### Authentication

- **JWT tokens** from Supabase Auth
- **Token validation** on every protected endpoint
- **User context** attached to request object
- **Optional auth** for public endpoints

### Validation

- **Input validation** with Zod schemas
- **XSS prevention** via sanitization
- **Type safety** enforced at compile time
- **Runtime validation** catches malformed data

## Performance Optimizations

### 1. Batch Operations

```typescript
// Bulk create inventory items
async createBulk(userId: string, items: Item[]) {
  const results: Item[] = [];
  for (const item of items) {
    const created = await this.repository.create({
      ...item,
      user_id: userId
    });
    results.push(created);
  }
  return results;
}
```

### 2. Parallel Queries

```typescript
// Fetch multiple resources in parallel
const [recipes, inventory] = await Promise.all([
  this.recipeRepository.findAll(userId),
  this.inventoryRepository.findAll(userId)
]);
```

### 3. Computed Fields

Freshness is calculated once at creation/update:

```typescript
const freshness = this.calculateFreshness(expirationDate);
await repository.create({ ...data, freshness });
```

## Error Handling

### Centralized Error Responses

```typescript
try {
  const data = await service.getById(userId, id);
  res.json({ data });
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Failed to fetch resource'
  });
}
```

### Validation Errors

```typescript
// Zod validation errors are automatically formatted
{
  "error": "Validation failed",
  "details": [
    {
      "field": "quantity",
      "message": "Quantity must be positive"
    }
  ]
}
```

## Testing Strategy

### Unit Tests

- Service layer business logic
- Repository CRUD operations
- Middleware validation

### Integration Tests

- End-to-end API requests
- Database operations
- Authentication flows

### Example Test

```typescript
describe('InventoryService', () => {
  it('calculates freshness correctly', () => {
    const service = new InventoryService(mockSupabase);

    // 15 days until expiry = 50% freshness
    const freshness = service['calculateFreshness'](
      new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    );

    expect(freshness).toBe(0.5);
  });
});
```

## Deployment

### Environment Variables

Required variables:
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
PORT=4000
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
```

## Future Enhancements

1. **Caching Layer** - Redis for frequently accessed data
2. **GraphQL API** - Alternative to REST for complex queries
3. **WebSocket Support** - Real-time updates for collaborative lists
4. **Rate Limiting** - Per-user rate limits in database
5. **Monitoring** - APM integration (DataDog, New Relic)
6. **API Versioning** - Support for v2 with breaking changes
