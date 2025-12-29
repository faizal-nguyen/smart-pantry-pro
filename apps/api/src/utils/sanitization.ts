/**
 * Input sanitization utilities to prevent XSS and injection attacks
 * CRITIQUE #10: Strengthened XSS sanitization
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes all HTML tags and dangerous characters
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol
    .replace(/data:/gi, '')
    .trim();
}

/**
 * Sanitize user input for safe display
 * Encodes special characters to prevent XSS
 */
export function sanitizeUserInput(input: string): string {
  if (!input) return '';

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Escape special characters in SQL LIKE queries to prevent SQL injection
 * CRITIQUE #11: Escape ilike queries
 */
export function escapeLikeQuery(query: string): string {
  if (!query) return '';

  // Escape special PostgreSQL LIKE characters: % _ \
  return query
    .replace(/\\/g, '\\\\')  // Escape backslash first
    .replace(/%/g, '\\%')    // Escape %
    .replace(/_/g, '\\_')    // Escape _
    .trim();
}

/**
 * Sanitize search query input
 * Combines HTML sanitization and LIKE escaping
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';

  // First sanitize HTML/XSS
  let sanitized = sanitizeHtml(query);

  // Then escape LIKE special characters
  sanitized = escapeLikeQuery(sanitized);

  // Limit length
  return sanitized.substring(0, 200);
}

/**
 * Sanitize object fields recursively
 * Useful for sanitizing request bodies
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  fieldsToSanitize: (keyof T)[]
): T {
  const sanitized = { ...obj };

  for (const field of fieldsToSanitize) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeUserInput(sanitized[field] as string) as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';

  return email
    .toLowerCase()
    .trim()
    .replace(/[<>]/g, ''); // Remove angle brackets
}

/**
 * Validate and sanitize URL
 * Only allows http and https protocols
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url.trim());

    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Remove null bytes from string (prevents null byte injection)
 */
export function removeNullBytes(input: string): string {
  if (!input) return '';
  return input.replace(/\0/g, '');
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return '';

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Only allow alphanumeric, dots, dashes, underscores
    .replace(/\.{2,}/g, '.')          // Replace multiple dots with single dot
    .replace(/^\.+/, '')              // Remove leading dots
    .substring(0, 255);               // Limit length
}

/**
 * Comprehensive input sanitization for user-generated content
 */
export function sanitizeContent(content: string, options?: {
  maxLength?: number;
  allowHtml?: boolean;
}): string {
  if (!content) return '';

  let sanitized = removeNullBytes(content);

  if (!options?.allowHtml) {
    sanitized = sanitizeHtml(sanitized);
  }

  if (options?.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized.trim();
}
