import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';
import { BaseRepository } from './BaseRepository.js';
import { sanitizeSearchQuery } from '../utils/sanitization.js';
import { NotFoundError } from '../utils/errors.js';

type Recipe = Database['public']['Tables']['recipes']['Row'];

export class RecipeRepository extends BaseRepository<Recipe, 'recipes'> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'recipes');
  }

  /**
   * Search recipes by name or description
   * Uses sanitized query to prevent SQL injection via ILIKE
   */
  async search(userId: string, query: string): Promise<Recipe[]> {
    // CRITICAL: Sanitize search query to prevent SQL injection
    const sanitizedQuery = sanitizeSearchQuery(query);

    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`)
      .order('title', { ascending: true });

    if (error) throw error;
    return (data || []) as Recipe[];
  }

  /**
   * Find recipes by category
   */
  async findByCategory(userId: string, category: string): Promise<Recipe[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('title', { ascending: true });

    if (error) throw error;
    return (data || []) as Recipe[];
  }

  /**
   * Find recipes by difficulty level
   */
  async findByDifficulty(userId: string, difficulty: string): Promise<Recipe[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .eq('difficulty', difficulty)
      .order('title', { ascending: true });

    if (error) throw error;
    return (data || []) as Recipe[];
  }

  /**
   * Find recipes by preparation time (max minutes)
   */
  async findByMaxPrepTime(userId: string, maxMinutes: number): Promise<Recipe[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .lte('prep_time_minutes', maxMinutes)
      .order('prep_time_minutes', { ascending: true });

    if (error) throw error;
    return (data || []) as Recipe[];
  }

  /**
   * Find favorite recipes
   */
  async findFavorites(userId: string): Promise<Recipe[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .eq('is_favorite', true)
      .order('title', { ascending: true });

    if (error) throw error;
    return (data || []) as Recipe[];
  }

  /**
   * Find recipes containing specific ingredients
   */
  async findByIngredients(userId: string, ingredientIds: string[]): Promise<Recipe[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .contains('ingredient_ids', ingredientIds)
      .order('title', { ascending: true });

    if (error) throw error;
    return (data || []) as Recipe[];
  }

  /**
   * Get recently added recipes
   */
  async findRecent(userId: string, limit: number = 10): Promise<Recipe[]> {
    const { data, error } = await this.table()
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as Recipe[];
  }

  /**
   * Get recipe statistics
   */
  async getStats(userId: string): Promise<{
    total: number;
    favorites: number;
    byCategory: Record<string, number>;
    byDifficulty: Record<string, number>;
    avgPrepTime: number;
  }> {
    const allRecipes = await this.findAll(userId);

    const total = allRecipes.length;
    const favorites = allRecipes.filter(r => r.is_favorite).length;

    // By category
    const byCategory: Record<string, number> = {};
    allRecipes.forEach(recipe => {
      const cat = recipe.category || 'Autres';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    // By difficulty
    const byDifficulty: Record<string, number> = {};
    allRecipes.forEach(recipe => {
      const diff = recipe.difficulty || 'Medium';
      byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;
    });

    // Average prep time
    const totalPrepTime = allRecipes.reduce(
      (sum, r) => sum + (r.prep_time_minutes || 0),
      0
    );
    const avgPrepTime = total > 0 ? Math.round(totalPrepTime / total) : 0;

    return {
      total,
      favorites,
      byCategory,
      byDifficulty,
      avgPrepTime
    };
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: string, userId: string): Promise<Recipe> {
    const recipe = await this.findById(id, userId);
    if (!recipe) {
      throw new NotFoundError('Recipe not found');
    }

    return this.update(id, userId, {
      is_favorite: !recipe.is_favorite
    });
  }
}
