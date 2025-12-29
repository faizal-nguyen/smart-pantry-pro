/**
 * API Routes - v1
 *
 * All routes follow RESTful conventions:
 * - GET: Retrieve resources
 * - POST: Create resources
 * - PUT: Update resources (full)
 * - PATCH: Update resources (partial)
 * - DELETE: Delete resources
 */

export { createInventoryRouter } from './inventory.routes.js';
export { createRecipesRouter } from './recipes.routes.js';
export { createShoppingRouter } from './shopping.routes.js';
export { createUsersRouter } from './users.routes.js';
export { createReceiptsRouter } from './receipts.js';
