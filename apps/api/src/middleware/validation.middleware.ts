import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Validation middleware factory
 * Validates request body against a Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace body with validated data
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

/**
 * Validate query parameters
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Query validation failed',
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

/**
 * Validate route parameters
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Parameter validation failed',
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

/**
 * Common validation schemas
 */

// UUID validation
export const uuidSchema = z.object({
  id: z.string().uuid('Invalid UUID format')
});

// Pagination validation
export const paginationSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

// Inventory item creation schema
export const createInventoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().optional(),
  location: z.object({
    zone: z.string().min(1, 'Zone is required'),
    shelf: z.string().optional()
  }),
  expiration_date: z.string().datetime('Invalid date format'),
  barcode: z.string().optional(),
  image_url: z.string().url().optional(),
  nutritional_value: z.object({
    vitamins: z.number().min(0).max(100).optional(),
    minerals: z.number().min(0).max(100).optional(),
    fiber: z.number().min(0).max(100).optional()
  }).optional()
});

// Recipe creation schema
export const createRecipeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  prep_time_minutes: z.number().int().positive().optional(),
  cook_time_minutes: z.number().int().positive().optional(),
  servings: z.number().int().positive().optional(),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.number().optional(),
    unit: z.string().optional()
  })),
  steps: z.array(z.string()).optional(),
  image_url: z.string().url().optional(),
  video_url: z.string().url().optional(),
  source_url: z.string().url().optional()
});

// Shopping item creation schema
export const createShoppingItemSchema = z.object({
  shopping_list_id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(255),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().optional(),
  estimated_price: z.number().min(0).optional(),
  store_section: z.string().optional()
});

// User profile update schema
export const updateUserProfileSchema = z.object({
  full_name: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().optional(),
  dietary_restrictions: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  preferences: z.record(z.any()).optional()
});

// Preference update schema
export const updatePreferenceSchema = z.object({
  value: z.any()
});

// Dietary restrictions schema
export const dietaryRestrictionsSchema = z.object({
  restrictions: z.array(z.string())
});

// Allergens schema
export const allergensSchema = z.object({
  allergens: z.array(z.string())
});

/**
 * Sanitization helpers
 */

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Sanitization middleware
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
}
