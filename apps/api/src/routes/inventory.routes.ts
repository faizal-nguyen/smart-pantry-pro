import { Router, Request, Response } from 'express';
import { logError } from '../config/logger.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { InventoryService } from '../services/InventoryService.js';
import { Database } from '../types/supabase.js';

export function createInventoryRouter(_adminClient: SupabaseClient<Database>) {
  const router = Router();

  /**
   * GET /api/v1/inventory
   * Get all inventory items with optional filters
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { zone, category } = req.query;
      const filters = {
        zone: zone as string | undefined,
        category: category as string | undefined
      };

      // CRITICAL: Use user-scoped client with RLS enforcement
      const service = new InventoryService(req.supabaseClient!);
      const items = await service.getAll(userId, filters);
      res.json({ data: items });
    } catch (error) {
      logError(error, { context: 'Error fetching inventory:' });
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  });

  /**
   * GET /api/v1/inventory/stats
   * Get inventory statistics
   */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // CRITICAL: Use user-scoped client with RLS enforcement
      const service = new InventoryService(req.supabaseClient!);
      const stats = await service.getStats(userId);
      res.json({ data: stats });
    } catch (error) {
      logError(error, { context: 'Error fetching inventory stats:' });
      res.status(500).json({ error: 'Failed to fetch inventory stats' });
    }
  });

  /**
   * GET /api/v1/inventory/expiring
   * Get items expiring soon
   */
  router.get('/expiring', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new InventoryService(req.supabaseClient!);
      const withinDays = parseInt(req.query.days as string) || 7;
      const items = await service.getExpiringSoon(userId, withinDays);
      res.json({ data: items });
    } catch (error) {
      logError(error, { context: 'Error fetching expiring items:' });
      res.status(500).json({ error: 'Failed to fetch expiring items' });
    }
  });

  /**
   * GET /api/v1/inventory/low-stock
   * Get low stock items
   */
  router.get('/low-stock', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new InventoryService(req.supabaseClient!);
      const threshold = parseInt(req.query.threshold as string) || 2;
      const items = await service.getLowStock(userId, threshold);
      res.json({ data: items });
    } catch (error) {
      logError(error, { context: 'Error fetching low stock items:' });
      res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
  });

  /**
   * GET /api/v1/inventory/search
   * Search inventory items
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

      const service = new InventoryService(req.supabaseClient!);
      const items = await service.search(userId, query);
      res.json({ data: items });
    } catch (error) {
      logError(error, { context: 'Error searching inventory:' });
      res.status(500).json({ error: 'Failed to search inventory' });
    }
  });

  /**
   * GET /api/v1/inventory/:id
   * Get a single inventory item
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new InventoryService(req.supabaseClient!);
      const item = await service.getById(userId, req.params.id);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json({ data: item });
    } catch (error) {
      logError(error, { context: 'Error fetching inventory item:' });
      res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
  });

  /**
   * POST /api/v1/inventory
   * Create a new inventory item
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new InventoryService(req.supabaseClient!);
      const item = await service.create(userId, req.body);
      res.status(201).json({ data: item });
    } catch (error) {
      logError(error, { context: 'Error creating inventory item:' });
      res.status(500).json({ error: 'Failed to create inventory item' });
    }
  });

  /**
   * POST /api/v1/inventory/bulk
   * Create multiple inventory items
   */
  router.post('/bulk', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items must be an array' });
      }

      const service = new InventoryService(req.supabaseClient!);
      const createdItems = await service.createBulk(userId, items);
      res.status(201).json({ data: createdItems });
    } catch (error) {
      logError(error, { context: 'Error creating inventory items:' });
      res.status(500).json({ error: 'Failed to create inventory items' });
    }
  });

  /**
   * PUT /api/v1/inventory/:id
   * Update an inventory item
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new InventoryService(req.supabaseClient!);
      const item = await service.update(userId, req.params.id, req.body);
      res.json({ data: item });
    } catch (error) {
      logError(error, { context: 'Error updating inventory item:' });
      res.status(500).json({ error: 'Failed to update inventory item' });
    }
  });

  /**
   * POST /api/v1/inventory/:id/consume
   * Consume an item (decrease quantity)
   */
  router.post('/:id/consume', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be positive' });
      }

      const service = new InventoryService(req.supabaseClient!);
      const item = await service.consume(userId, req.params.id, amount);
      res.json({ data: item });
    } catch (error: any) {
      logError(error, { context: 'Error consuming inventory item:' });
      if (error.message === 'Insufficient quantity') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to consume inventory item' });
    }
  });

  /**
   * POST /api/v1/inventory/:id/restock
   * Restock an item (increase quantity)
   */
  router.post('/:id/restock', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be positive' });
      }

      const service = new InventoryService(req.supabaseClient!);
      const item = await service.restock(userId, req.params.id, amount);
      res.json({ data: item });
    } catch (error) {
      logError(error, { context: 'Error restocking inventory item:' });
      res.status(500).json({ error: 'Failed to restock inventory item' });
    }
  });

  /**
   * DELETE /api/v1/inventory/:id
   * Delete an inventory item
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new InventoryService(req.supabaseClient!);
      await service.delete(userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      logError(error, { context: 'Error deleting inventory item:' });
      res.status(500).json({ error: 'Failed to delete inventory item' });
    }
  });

  return router;
}
