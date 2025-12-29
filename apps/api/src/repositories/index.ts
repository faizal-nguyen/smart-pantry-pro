/**
 * Repository Layer - Data Access Abstraction
 *
 * All repositories extend BaseRepository and provide:
 * - Type-safe database operations
 * - RLS enforcement (user_id filtering)
 * - Common CRUD operations
 * - Domain-specific queries
 */

export { BaseRepository } from './BaseRepository.js';
export { InventoryRepository } from './InventoryRepository.js';
export { RecipeRepository } from './RecipeRepository.js';
export { ShoppingRepository } from './ShoppingRepository.js';
export { UserRepository } from './UserRepository.js';
