import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

/**
 * Security middleware for Supabase Edge Functions
 * Implements OWASP best practices for API security
 */

export interface SecurityConfig {
  requireAuth?: boolean;
  validateInput?: boolean;
  sanitizeOutput?: boolean;
  checkUserPermissions?: boolean;
}

export class SecurityMiddleware {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Extract and validate JWT token from request
   */
  async validateAuth(req: Request): Promise<{ userId: string | null; error: string | null }> {
    try {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { userId: null, error: 'Missing or invalid authorization header' };
      }

      const token = authHeader.replace('Bearer ', '');
      
      // Verify JWT with Supabase
      const { data: { user }, error } = await this.supabase.auth.getUser(token);
      
      if (error || !user) {
        return { userId: null, error: 'Invalid or expired token' };
      }

      return { userId: user.id, error: null };
    } catch (error) {
      console.error('Auth validation error:', error);
      return { userId: null, error: 'Authentication error' };
    }
  }

  /**
   * Validate and sanitize input data
   */
  validateInput(data: any, schema: InputSchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip other validations if field is optional and not provided
      if (!rules.required && (value === undefined || value === null)) {
        continue;
      }

      // Type check
      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}`);
      }

      // Length checks
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must not exceed ${rules.maxLength} characters`);
      }

      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      // Pattern check
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} has invalid format`);
      }

      // Custom validator
      if (rules.validator) {
        const customError = rules.validator(value);
        if (customError) {
          errors.push(customError);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Sanitize output to prevent XSS
   */
  sanitizeOutput(data: any): any {
    if (typeof data === 'string') {
      return this.escapeHtml(data);
    } else if (Array.isArray(data)) {
      return data.map(item => this.sanitizeOutput(item));
    } else if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        sanitized[key] = this.sanitizeOutput(value);
      }
      return sanitized;
    }
    return data;
  }

  /**
   * Check user permissions for specific resources
   */
  async checkUserPermissions(
    userId: string, 
    resource: string, 
    action: string
  ): Promise<boolean> {
    try {
      // Check if user has permission for the resource
      const { data, error } = await this.supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId)
        .eq('resource', resource)
        .eq('action', action)
        .single();

      return !error && data !== null;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Apply security headers to response
   */
  applySecurityHeaders(headers: Headers): Headers {
    // Security headers based on OWASP recommendations
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    return headers;
  }

  /**
   * SQL injection prevention helper
   */
  sanitizeSqlIdentifier(identifier: string): string {
    // Remove any characters that aren't alphanumeric or underscore
    return identifier.replace(/[^a-zA-Z0-9_]/g, '');
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Input validation schema types
export interface InputSchema {
  [field: string]: {
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    validator?: (value: any) => string | null;
  };
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  safeString: /^[a-zA-Z0-9\s\-\_\.\,\!\?\@\#\$\%\&\*\(\)]+$/
};