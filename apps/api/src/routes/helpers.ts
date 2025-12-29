import { Request, Response } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase.js';
import { logError } from '../config/logger.js';

/**
 * Helper to ensure user is authenticated and has user-scoped Supabase client
 * Returns null if not authenticated, otherwise returns userId and client
 */
export function getUserContext(req: Request): {
  userId: string;
  client: SupabaseClient<Database>;
} | null {
  const userId = req.user?.id;
  const client = req.supabaseClient;

  if (!userId || !client) {
    return null;
  }

  return { userId, client };
}

/**
 * Send unauthorized response
 */
export function sendUnauthorized(res: Response): void {
  res.status(401).json({ error: 'Unauthorized' });
}

/**
 * Send error response with structured logging
 */
export function sendError(
  res: Response,
  error: unknown,
  message: string,
  logContext?: string
): void {
  // Use structured logging instead of console.error
  logError(error instanceof Error ? error : new Error(String(error)), {
    context: logContext || 'API Error',
    userMessage: message,
  });

  res.status(500).json({ error: message });
}
