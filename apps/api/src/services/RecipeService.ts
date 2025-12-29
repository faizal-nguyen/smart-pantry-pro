import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';
import { RecipeRepository } from '../repositories/RecipeRepository.js';
import { InventoryRepository } from '../repositories/InventoryRepository.js';

type Recipe = Database['public']['Tables']['recipes']['Row'];
type CreateRecipeData = Database['public']['Tables']['recipes']['Insert'];
type UpdateRecipeData = Database['public']['Tables']['recipes']['Update'];

/**
 * RecipeService - Business logic for recipe management
 */
export class RecipeService {
  private repository: RecipeRepository;
  private inventoryRepository: InventoryRepository;

  constructor(supabase: SupabaseClient<Database>) {
    this.repository = new RecipeRepository(supabase);
    this.inventoryRepository = new InventoryRepository(supabase);
  }

  /**
   * Get all recipes for a user
   */
  async getAll(userId: string, filters?: {
    category?: string;
    difficulty?: string;
    maxPrepTime?: number;
    favoritesOnly?: boolean;
  }): Promise<Recipe[]> {
    if (filters?.favoritesOnly) {
      return this.repository.findFavorites(userId);
    }
    if (filters?.category) {
      return this.repository.findByCategory(userId, filters.category);
    }
    if (filters?.difficulty) {
      return this.repository.findByDifficulty(userId, filters.difficulty);
    }
    if (filters?.maxPrepTime) {
      return this.repository.findByMaxPrepTime(userId, filters.maxPrepTime);
    }
    return this.repository.findAll(userId);
  }

  /**
   * Get a single recipe
   */
  async getById(userId: string, recipeId: string): Promise<Recipe | null> {
    return this.repository.findById(recipeId, userId);
  }

  /**
   * Create a new recipe
   */
  async create(userId: string, data: Omit<CreateRecipeData, 'user_id'>): Promise<Recipe> {
    return this.repository.create({
      ...data,
      user_id: userId,
      is_favorite: false,
      created_at: new Date().toISOString()
    });
  }

  /**
   * Update a recipe
   */
  async update(
    userId: string,
    recipeId: string,
    data: UpdateRecipeData
  ): Promise<Recipe> {
    data.updated_at = new Date().toISOString();
    return this.repository.update(recipeId, userId, data);
  }

  /**
   * Delete a recipe
   */
  async delete(userId: string, recipeId: string): Promise<void> {
    return this.repository.delete(recipeId, userId);
  }

  /**
   * Search recipes
   */
  async search(userId: string, query: string): Promise<Recipe[]> {
    return this.repository.search(userId, query);
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(userId: string, recipeId: string): Promise<Recipe> {
    return this.repository.toggleFavorite(recipeId, userId);
  }

  /**
   * Get favorite recipes
   */
  async getFavorites(userId: string): Promise<Recipe[]> {
    return this.repository.findFavorites(userId);
  }

  /**
   * Get recently added recipes
   */
  async getRecent(userId: string, limit: number = 10): Promise<Recipe[]> {
    return this.repository.findRecent(userId, limit);
  }

  /**
   * Get recipe statistics
   */
  async getStats(userId: string) {
    return this.repository.getStats(userId);
  }

  /**
   * Find recipes that can be made with available inventory
   */
  async findCookableRecipes(userId: string): Promise<{
    recipe: Recipe;
    matchPercentage: number;
    missingIngredients: string[];
  }[]> {
    const [recipes, inventoryItems] = await Promise.all([
      this.repository.findAll(userId),
      this.inventoryRepository.findAll(userId)
    ]);

    const inventoryItemNames = new Set(
      inventoryItems.map(item => item.name.toLowerCase())
    );

    const cookableRecipes = recipes.map(recipe => {
      const ingredients = (recipe.ingredients as any[]) || [];
      const ingredientNames = ingredients.map(ing =>
        (ing.name || ing).toLowerCase()
      );

      const availableCount = ingredientNames.filter(name =>
        inventoryItemNames.has(name)
      ).length;

      const matchPercentage = ingredientNames.length > 0
        ? Math.round((availableCount / ingredientNames.length) * 100)
        : 0;

      const missingIngredients = ingredientNames.filter(name =>
        !inventoryItemNames.has(name)
      );

      return {
        recipe,
        matchPercentage,
        missingIngredients
      };
    });

    // Sort by match percentage (highest first)
    return cookableRecipes.sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  /**
   * Find recipes by specific ingredients
   */
  async findByIngredients(userId: string, ingredientIds: string[]): Promise<Recipe[]> {
    return this.repository.findByIngredients(userId, ingredientIds);
  }

  /**
   * Get recipe suggestions based on expiring inventory
   */
  async getSuggestionsForExpiringItems(userId: string): Promise<{
    recipe: Recipe;
    expiringIngredients: string[];
    urgency: 'high' | 'medium' | 'low';
  }[]> {
    const [recipes, expiringItems] = await Promise.all([
      this.repository.findAll(userId),
      this.inventoryRepository.findExpiringSoon(userId, 7)
    ]);

    const expiringItemNames = new Set(
      expiringItems.map(item => item.name.toLowerCase())
    );

    const suggestions = recipes
      .map(recipe => {
        const ingredients = (recipe.ingredients as any[]) || [];
        const ingredientNames = ingredients.map(ing =>
          (ing.name || ing).toLowerCase()
        );

        const expiringIngredients = ingredientNames.filter(name =>
          expiringItemNames.has(name)
        );

        if (expiringIngredients.length === 0) {
          return null;
        }

        // Determine urgency based on number of expiring ingredients
        let urgency: 'high' | 'medium' | 'low' = 'low';
        if (expiringIngredients.length >= 3) urgency = 'high';
        else if (expiringIngredients.length >= 2) urgency = 'medium';

        return {
          recipe,
          expiringIngredients,
          urgency
        };
      })
      .filter(Boolean) as {
        recipe: Recipe;
        expiringIngredients: string[];
        urgency: 'high' | 'medium' | 'low';
      }[];

    // Sort by urgency and number of expiring ingredients
    return suggestions.sort((a, b) => {
      const urgencyOrder = { high: 3, medium: 2, low: 1 };
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.expiringIngredients.length - a.expiringIngredients.length;
    });
  }
}
