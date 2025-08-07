import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<{ user: any; error?: string }> {
  try {
    // First try to verify with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return { user: null, error: 'Invalid token' };
    }

    return { user };
  } catch (error) {
    console.error('Token verification error:', error);
    return { user: null, error: 'Token verification failed' };
  }
}

/**
 * Generate secure session token
 */
export function generateSessionToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  
  return jwt.sign(
    { 
      userId,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
    },
    secret
  );
}

/**
 * Verify session token
 */
export function verifySessionToken(token: string): { userId?: string; error?: string } {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(token, secret) as any;
    
    return { userId: decoded.userId };
  } catch (error) {
    return { error: 'Invalid session' };
  }
}

/**
 * Check if user has required permissions
 */
export async function checkPermissions(
  userId: string, 
  resource: string, 
  action: string
): Promise<boolean> {
  try {
    // For now, all authenticated users have access
    // In production, implement proper RBAC
    return true;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}