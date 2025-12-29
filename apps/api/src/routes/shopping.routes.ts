import { Router, Request, Response } from 'express';
import { logError } from '../config/logger.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { ShoppingService } from '../services/ShoppingService.js';
import { Database } from '../types/supabase.js';

export function createShoppingRouter(_adminClient: SupabaseClient<Database>) {
  const router = Router();

  /**
   * GET /api/v1/shopping
   * Get all shopping items with optional filters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { listId, category, uncheckedOnly } = req.query;
      const filters = {
        listId: listId as string | undefined,
        category: category as string | undefined,
        uncheckedOnly: uncheckedOnly === 'true'
      };

      const service = new ShoppingService(req.supabaseClient);
      const items = await service.getAll(userId, filters);
      res.json({ data: items });
    } catch (error) {
      logError(error, { context: 'Error fetching shopping items:' });
      res.status(500).json({ error: 'Failed to fetch shopping items' });
    }
  });

  /**
   * GET /api/v1/shopping/stats/:listId
   * Get shopping list statistics
   */
  router.get('/stats/:listId', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new ShoppingService(req.supabaseClient);
      const stats = await service.getStats(userId, req.params.listId);
      res.json({ data: stats });
    } catch (error) {
      logError(error, { context: 'Error fetching shopping stats:' });
      res.status(500).json({ error: 'Failed to fetch shopping stats' });
    }
  });

  /**
   * GET /api/v1/shopping/:id
   * Get a single shopping item
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new ShoppingService(req.supabaseClient);
      const item = await service.getById(userId, req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'Shopping item not found' });
      }

      res.json({ data: item });
    } catch (error) {
      logError(error, { context: 'Error fetching shopping item:' });
      res.status(500).json({ error: 'Failed to fetch shopping item' });
    }
  });

  /**
   * POST /api/v1/shopping
   * Create a new shopping item
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new ShoppingService(req.supabaseClient);
      const item = await service.create(userId, req.body);
      res.status(201).json({ data: item });
    } catch (error) {
      logError(error, { context: 'Error creating shopping item:' });
      res.status(500).json({ error: 'Failed to create shopping item' });
    }
  });

  /**
   * POST /api/v1/shopping/bulk
   * Create multiple shopping items
   */
  router.post('/bulk', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items must be an array' });
      }

      const service = new ShoppingService(req.supabaseClient);
      const createdItems = await service.createBulk(userId, items);
      res.status(201).json({ data: createdItems });
    } catch (error) {
      logError(error, { context: 'Error creating shopping items:' });
      res.status(500).json({ error: 'Failed to create shopping items' });
    }
  });

  /**
   * POST /api/v1/shopping/from-low-stock
   * Generate shopping list from low stock inventory
   */
  router.post('/from-low-stock', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { listId, threshold } = req.body;
      if (!listId) {
        return res.status(400).json({ error: 'List ID is required' });
      }

      const service = new ShoppingService(req.supabaseClient);
      const items = await service.generateFromLowStock(
        userId,
        listId,
        threshold || 2
      );
      res.status(201).json({ data: items });
    } catch (error) {
      logError(error, { context: 'Error generating from low stock:' });
      res.status(500).json({ error: 'Failed to generate shopping list' });
    }
  });

  /**
   * POST /api/v1/shopping/from-recipe
   * Add recipe ingredients to shopping list
   */
  router.post('/from-recipe', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { listId, ingredients } = req.body;
      if (!listId || !Array.isArray(ingredients)) {
        return res.status(400).json({
          error: 'List ID and ingredients array are required'
        });
      }

      const service = new ShoppingService(req.supabaseClient);
      const items = await service.addRecipeIngredients(
        userId,
        listId,
        ingredients
      );
      res.status(201).json({ data: items });
    } catch (error) {
      logError(error, { context: 'Error adding recipe ingredients:' });
      res.status(500).json({ error: 'Failed to add recipe ingredients' });
    }
  });

  /**
   * PUT /api/v1/shopping/:id
   * Update a shopping item
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new ShoppingService(req.supabaseClient);
      const item = await service.update(userId, req.params.id, req.body);
      res.json({ data: item });
    } catch (error) {
      logError(error, { context: 'Error updating shopping item:' });
      res.status(500).json({ error: 'Failed to update shopping item' });
    }
  });

  /**
   * POST /api/v1/shopping/:id/toggle
   * Toggle item checked status
   */
  router.post('/:id/toggle', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new ShoppingService(req.supabaseClient);
      const item = await service.toggleChecked(userId, req.params.id);
      res.json({ data: item });
    } catch (error) {
      logError(error, { context: 'Error toggling shopping item:' });
      res.status(500).json({ error: 'Failed to toggle shopping item' });
    }
  });

  /**
   * POST /api/v1/shopping/list/:listId/mark-all
   * Mark all items in a list as checked/unchecked
   */
  router.post('/list/:listId/mark-all', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { checked } = req.body;
      if (typeof checked !== 'boolean') {
        return res.status(400).json({ error: 'Checked must be a boolean' });
      }

      const service = new ShoppingService(req.supabaseClient);
      await service.markAllChecked(userId, req.params.listId, checked);
      res.status(204).send();
    } catch (error) {
      logError(error, { context: 'Error marking all items:' });
      res.status(500).json({ error: 'Failed to mark all items' });
    }
  });

  /**
   * DELETE /api/v1/shopping/list/:listId/checked
   * Delete all checked items from a list
   */
  router.delete('/list/:listId/checked', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new ShoppingService(req.supabaseClient);
      await service.deleteChecked(userId, req.params.listId);
      res.status(204).send();
    } catch (error) {
      logError(error, { context: 'Error deleting checked items:' });
      res.status(500).json({ error: 'Failed to delete checked items' });
    }
  });

  /**
   * DELETE /api/v1/shopping/:id
   * Delete a shopping item
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new ShoppingService(req.supabaseClient);
      await service.delete(userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError(error, { context: 'Error deleting shopping item:' });
      res.status(500).json({ error: 'Failed to delete shopping item' });
    }
  });

  return router;
}
