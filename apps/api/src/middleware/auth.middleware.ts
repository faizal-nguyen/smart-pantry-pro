import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';
import { createUserSupabaseClient } from '../config/supabase.js';

/**
 * Extend Express Request to include user information and user-scoped Supabase client
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        role?: string;
        /** Subscription tier (PRP-220.15). Defaults to 'free' when no
         * row exists in `user_subscriptions` or the table is missing. */
        tier?: 'free' | 'premium';
      };
      /** User-scoped Supabase client with RLS enforcement */
      supabaseClient?: SupabaseClient<Database>;
    }
  }
}

/**
 * Resolve the user's subscription tier (PRP-220.15). Uses the admin
 * client because the `user_subscriptions` table is read-only at this
 * stage and not exposed to RLS. Returns 'free' on any failure (table
 * absent, network error, expired subscription).
 */
async function resolveUserTier(
  admin: SupabaseClient<Database>,
  userId: string
): Promise<'free' | 'premium'> {
  try {
    const { data, error } = await admin
      .from('user_subscriptions' as any)
      .select('tier, expires_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return 'free';
    const row = data as { tier?: string; expires_at?: string | null };
    if (row.tier !== 'premium') return 'free';
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return 'free';
    return 'premium';
  } catch {
    return 'free';
  }
}

/**
 * Authentication middleware
 * Validates Supabase JWT token and attaches user + user-scoped client to request
 * CRITICAL: Creates a user-scoped Supabase client that enforces RLS
 */
export function createAuthMiddleware(supabase: SupabaseClient<Database>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No authorization token provided' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token with Supabase (using admin client for validation)
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Resolve subscription tier (defaults to 'free' on any error).
      const tier = await resolveUserTier(supabase, user.id);

      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        tier,
      };

      // CRITICAL: Create user-scoped client with RLS enforcement
      // This client uses the anon key + user JWT, which enforces RLS policies
      req.supabaseClient = createUserSupabaseClient(token);

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export function createOptionalAuthMiddleware(supabase: SupabaseClient<Database>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // No token, continue without user
      }

      const token = authHeader.substring(7);

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        const tier = await resolveUserTier(supabase, user.id);
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          tier,
        };
      }

      next();
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      next(); // Continue without user on error
    }
  };
}

/**
 * Role-based access control middleware
 * Requires user to have specific role
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.role || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(req: Request): boolean {
  return !!req.user?.id;
}

/**
 * Get authenticated user ID
 */
export function getAuthenticatedUserId(req: Request): string | null {
  return req.user?.id || null;
}
