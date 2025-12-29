import { Router, Request, Response } from 'express';
import { logError } from '../config/logger.js';
import { SupabaseClient } from '@supabase/supabase-js';
import { UserService } from '../services/UserService.js';
import { Database } from '../types/supabase.js';

export function createUsersRouter(_adminClient: SupabaseClient<Database>) {
  const router = Router();

  /**
   * GET /api/v1/users/me
   * Get current user profile
   */
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new UserService(req.supabaseClient);
      const profile = await service.getProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      res.json({ data: profile });
    } catch (error) {
      logError(error, { context: 'Error fetching user profile:' });
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  /**
   * GET /api/v1/users/me/full
   * Get full user profile with statistics
   */
  router.get('/me/full', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new UserService(req.supabaseClient);
      const fullProfile = await service.getFullProfile(userId);
      res.json({ data: fullProfile });
    } catch (error) {
      logError(error, { context: 'Error fetching full user profile:' });
      res.status(500).json({ error: 'Failed to fetch full user profile' });
    }
  });

  /**
   * GET /api/v1/users/me/stats
   * Get user statistics summary
   */
  router.get('/me/stats', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new UserService(req.supabaseClient);
      const stats = await service.getStatsSummary(userId);
      res.json({ data: stats });
    } catch (error) {
      logError(error, { context: 'Error fetching user stats:' });
      res.status(500).json({ error: 'Failed to fetch user stats' });
    }
  });

  /**
   * GET /api/v1/users/me/completion
   * Get profile completion percentage
   */
  router.get('/me/completion', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new UserService(req.supabaseClient);
      const percentage = await service.getProfileCompletionPercentage(userId);
      const isComplete = await service.isProfileComplete(userId);

      res.json({
        data: {
          percentage,
          isComplete
        }
      });
    } catch (error) {
      logError(error, { context: 'Error fetching profile completion:' });
      res.status(500).json({ error: 'Failed to fetch profile completion' });
    }
  });

  /**
   * PUT /api/v1/users/me
   * Update user profile
   */
  router.put('/me', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new UserService(req.supabaseClient);
      const profile = await service.upsertProfile(userId, req.body);
      res.json({ data: profile });
    } catch (error) {
      logError(error, { context: 'Error updating user profile:' });
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  });

  /**
   * PUT /api/v1/users/me/preferences
   * Update user preferences
   */
  router.put('/me/preferences', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new UserService(req.supabaseClient);
      const profile = await service.updatePreferences(userId, req.body);
      res.json({ data: profile });
    } catch (error) {
      logError(error, { context: 'Error updating preferences:' });
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  /**
   * GET /api/v1/users/me/preferences/:key
   * Get a specific preference value
   */
  router.get('/me/preferences/:key', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new UserService(req.supabaseClient);
      const value = await service.getPreference(userId, req.params.key);
      res.json({ data: { key: req.params.key, value } });
    } catch (error) {
      logError(error, { context: 'Error fetching preference:' });
      res.status(500).json({ error: 'Failed to fetch preference' });
    }
  });

  /**
   * PUT /api/v1/users/me/preferences/:key
   * Set a specific preference value
   */
  router.put('/me/preferences/:key', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new UserService(req.supabaseClient);
      const { value } = req.body;
      const profile = await service.setPreference(userId, req.params.key, value);
      res.json({ data: profile });
    } catch (error) {
      logError(error, { context: 'Error setting preference:' });
      res.status(500).json({ error: 'Failed to set preference' });
    }
  });

  /**
   * PUT /api/v1/users/me/dietary-restrictions
   * Update dietary restrictions
   */
  router.put('/me/dietary-restrictions', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { restrictions } = req.body;
      if (!Array.isArray(restrictions)) {
        return res.status(400).json({ error: 'Restrictions must be an array' });
      }

      const service = new UserService(req.supabaseClient);
      const profile = await service.updateDietaryRestrictions(userId, restrictions);
      res.json({ data: profile });
    } catch (error) {
      logError(error, { context: 'Error updating dietary restrictions:' });
      res.status(500).json({ error: 'Failed to update dietary restrictions' });
    }
  });

  /**
   * PUT /api/v1/users/me/allergens
   * Update allergens
   */
  router.put('/me/allergens', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { allergens } = req.body;
      if (!Array.isArray(allergens)) {
        return res.status(400).json({ error: 'Allergens must be an array' });
      }

      const service = new UserService(req.supabaseClient);
      const profile = await service.updateAllergens(userId, allergens);
      res.json({ data: profile });
    } catch (error) {
      logError(error, { context: 'Error updating allergens:' });
      res.status(500).json({ error: 'Failed to update allergens' });
    }
  });

  /**
   * POST /api/v1/users/me/deactivate
   * Deactivate user account (soft delete)
   */
  router.post('/me/deactivate', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new UserService(req.supabaseClient);
      await service.deactivate(userId);
      res.status(204).send();
    } catch (error) {
      logError(error, { context: 'Error deactivating user:' });
      res.status(500).json({ error: 'Failed to deactivate user' });
    }
  });

  /**
   * POST /api/v1/users/me/reactivate
   * Reactivate user account
   */
  router.post('/me/reactivate', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId || !req.supabaseClient) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const service = new UserService(req.supabaseClient);
      const profile = await service.reactivate(userId);
      res.json({ data: profile });
    } catch (error) {
      logError(error, { context: 'Error reactivating user:' });
      res.status(500).json({ error: 'Failed to reactivate user' });
    }
  });

  return router;
}
