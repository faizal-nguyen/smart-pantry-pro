import { Router, Request, Response } from 'express';
import { logError } from '../config/logger.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { RecipeService } from '../services/RecipeService.js';
import { Database } from '../types/supabase.js';

export function createRecipesRouter(_adminClient: SupabaseClient<Database>) {
  const router = Router();

  /**
   * GET /api/v1/recipes
   * Get all recipes with optional filters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { category, difficulty, maxPrepTime, favoritesOnly } = req.query;
      const filters = {
        category: category as string | undefined,
        difficulty: difficulty as string | undefined,
        maxPrepTime: maxPrepTime ? parseInt(maxPrepTime as string) : undefined,
        favoritesOnly: favoritesOnly === 'true'
      };

      const service = new RecipeService(req.supabaseClient);
      const recipes = await service.getAll(userId, filters);
      res.json({ data: recipes });
    } catch (error) {
      logError(error, { context: 'Error fetching recipes:' });
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  });

  /**
   * GET /api/v1/recipes/stats
   * Get recipe statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new RecipeService(req.supabaseClient);
      const stats = await service.getStats(userId);
      res.json({ data: stats });
    } catch (error) {
      logError(error, { context: 'Error fetching recipe stats:' });
      res.status(500).json({ error: 'Failed to fetch recipe stats' });
    }
  });

  /**
   * GET /api/v1/recipes/favorites
   * Get favorite recipes
   */
  router.get('/favorites', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new RecipeService(req.supabaseClient);
      const recipes = await service.getFavorites(userId);
      res.json({ data: recipes });
    } catch (error) {
      logError(error, { context: 'Error fetching favorite recipes:' });
      res.status(500).json({ error: 'Failed to fetch favorite recipes' });
    }
  });

  /**
   * GET /api/v1/recipes/recent
   * Get recently added recipes
   */
  router.get('/recent', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      const service = new RecipeService(req.supabaseClient);
      const recipes = await service.getRecent(userId, limit);
      res.json({ data: recipes });
    } catch (error) {
      logError(error, { context: 'Error fetching recent recipes:' });
      res.status(500).json({ error: 'Failed to fetch recent recipes' });
    }
  });

  /**
   * GET /api/v1/recipes/cookable
   * Get recipes that can be made with available inventory
   */
  router.get('/cookable', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new RecipeService(req.supabaseClient);
      const recipes = await service.findCookableRecipes(userId);
      res.json({ data: recipes });
    } catch (error) {
      logError(error, { context: 'Error fetching cookable recipes:' });
      res.status(500).json({ error: 'Failed to fetch cookable recipes' });
    }
  });

  /**
   * GET /api/v1/recipes/suggestions
   * Get recipe suggestions based on expiring inventory
   */
  router.get('/suggestions', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new RecipeService(req.supabaseClient);
      const suggestions = await service.getSuggestionsForExpiringItems(userId);
      res.json({ data: suggestions });
    } catch (error) {
      logError(error, { context: 'Error fetching recipe suggestions:' });
      res.status(500).json({ error: 'Failed to fetch recipe suggestions' });
    }
  });

  /**
   * GET /api/v1/recipes/search
   * Search recipes
   */
  router.get('/search', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const service = new RecipeService(req.supabaseClient);
      const recipes = await service.search(userId, query);
      res.json({ data: recipes });
    } catch (error) {
      logError(error, { context: 'Error searching recipes:' });
      res.status(500).json({ error: 'Failed to search recipes' });
    }
  });

  /**
   * GET /api/v1/recipes/:id
   * Get a single recipe
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new RecipeService(req.supabaseClient);
      const recipe = await service.getById(userId, req.params.id);
      if (!recipe) {
        return res.status(404).json({ error: 'Recipe not found' });
      }

      res.json({ data: recipe });
    } catch (error) {
      logError(error, { context: 'Error fetching recipe:' });
      res.status(500).json({ error: 'Failed to fetch recipe' });
    }
  });

  /**
   * POST /api/v1/recipes
   * Create a new recipe
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new RecipeService(req.supabaseClient);
      const recipe = await service.create(userId, req.body);
      res.status(201).json({ data: recipe });
    } catch (error) {
      logError(error, { context: 'Error creating recipe:' });
      res.status(500).json({ error: 'Failed to create recipe' });
    }
  });

  /**
   * PUT /api/v1/recipes/:id
   * Update a recipe
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new RecipeService(req.supabaseClient);
      const recipe = await service.update(userId, req.params.id, req.body);
      res.json({ data: recipe });
    } catch (error) {
      logError(error, { context: 'Error updating recipe:' });
      res.status(500).json({ error: 'Failed to update recipe' });
    }
  });

  /**
   * POST /api/v1/recipes/:id/favorite
   * Toggle favorite status
   */
  router.post('/:id/favorite', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new RecipeService(req.supabaseClient);
      const recipe = await service.toggleFavorite(userId, req.params.id);
      res.json({ data: recipe });
    } catch (error) {
      logError(error, { context: 'Error toggling favorite:' });
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  });

  /**
   * DELETE /api/v1/recipes/:id
   * Delete a recipe
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new RecipeService(req.supabaseClient);
      await service.delete(userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError(error, { context: 'Error deleting recipe:' });
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  });

  return router;
}
