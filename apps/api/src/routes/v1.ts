/**
 * API v1 Routes with Repository Pattern
 *
 * This module sets up the new repository-based API routes
 * These routes use:
 * - Repository pattern for data access
 * - Service layer for business logic
 * - Validation middleware (Zod)
 * - Authentication middleware (Supabase JWT)
 * - RLS enforcement via user-scoped Supabase clients
 */

import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import {
  createInventoryRouter,
  createRecipesRouter,
  createShoppingRouter,
  createUsersRouter,
  createReceiptsRouter
} from './index.js';

const v1Router = Router();

// Create auth middleware with admin client for JWT validation
// The middleware will create user-scoped clients with RLS enforcement
const authMiddleware = createAuthMiddleware(supabaseAdmin);

// Mount repository-based routes with authentication
// NOTE: Routes will receive req.supabaseClient (user-scoped, RLS-enforced)
// NOT the admin client passed here (only used for router factory)
v1Router.use('/inventory', authMiddleware, createInventoryRouter(supabaseAdmin));
v1Router.use('/recipes', authMiddleware, createRecipesRouter(supabaseAdmin));
v1Router.use('/shopping', authMiddleware, createShoppingRouter(supabaseAdmin));
v1Router.use('/users', authMiddleware, createUsersRouter(supabaseAdmin));
v1Router.use('/receipts', authMiddleware, createReceiptsRouter(supabaseAdmin));

export { v1Router };
