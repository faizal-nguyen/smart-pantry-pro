/**
 * Middleware Layer
 *
 * Provides:
 * - Authentication (JWT validation)
 * - Request validation (Zod schemas)
 * - Sanitization (XSS prevention)
 * - Role-based access control
 */

export {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  requireRole,
  isAuthenticated,
  getAuthenticatedUserId
} from './auth.middleware.js';

export {
  validateBody,
  validateQuery,
  validateParams,
  sanitizeBody,
  sanitizeString,
  sanitizeObject,
  // Common schemas
  uuidSchema,
  paginationSchema,
  createInventoryItemSchema,
  createRecipeSchema,
  createShoppingItemSchema,
  updateUserProfileSchema,
  updatePreferenceSchema,
  dietaryRestrictionsSchema,
  allergensSchema
} from './validation.middleware.js';
