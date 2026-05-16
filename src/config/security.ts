/**
 * Security configuration for Smart Pantry Pro
 * Centralizes all security-related settings and constants
 */

// Rate limit configuration interface
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
  keyPrefix: string;
}

// API Rate Limits (requests per window)
export const API_RATE_LIMITS = {
  OPENAI: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50,
    message: 'Trop de requêtes IA. Réessayez dans 15 minutes.',
    keyPrefix: 'ai'
  },
  VISION: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
    message: 'Trop d\'analyses d\'images. Réessayez plus tard.',
    keyPrefix: 'vision'
  },
  OPENFOODFACTS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Trop de recherches de produits. Patientez une minute.',
    keyPrefix: 'off'
  },
  SOCIAL_MEDIA: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Limite d\'extraction de recettes atteinte. Réessayez dans une heure.',
    keyPrefix: 'social'
  }
} as const;

// CORS allowed origins
export const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'https://smart-pantry-pro.vercel.app',
  'https://smartpantrypro.com',
  'https://app.smartpantrypro.com'
];

// Security headers to apply
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=self, microphone=self, geolocation=()'
} as const;

// Content Security Policy
export const CSP_POLICY = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  // PRP-225 PR4 — `img-src` keeps `https:` so product images loaded
  // into <img> tags are allowed without listing each hostname
  // explicitly. The front-end no longer contacts OpenFoodFacts
  // directly (the OFF hostname was dropped from `connect-src`).
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'https://api.openai.com',
    'wss://*.supabase.co'
  ]
};

// Input validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  barcode: /^[0-9]{8,13}$/,
  safeString: /^[a-zA-Z0-9\s\-\_\.\,\!\?\@\#\$\%\&\*\(\)]+$/,
  frenchText: /^[a-zA-ZÀ-ÿ0-9\s\-\_\.\,\!\?\@\#\$\%\&\*\(\)]+$/
} as const;

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Session configuration
export const SESSION_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  refreshThreshold: 60 * 60 * 1000, // Refresh if less than 1 hour left
  cookieName: 'smart-pantry-session',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  httpOnly: true
};

// File upload restrictions
export const FILE_UPLOAD_CONFIG = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heif'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
  imageQuality: 0.8,
  maxDimension: 2048
};

// API timeout configurations
export const API_TIMEOUTS = {
  default: 30000, // 30 seconds
  recipeExtraction: 60000, // 60 seconds
  visionRecognition: 15000, // 15 seconds
  aiChat: 30000, // 30 seconds
  fileUpload: 120000 // 2 minutes
};

// Error messages for security failures
export const SECURITY_ERROR_MESSAGES = {
  UNAUTHORIZED: 'Vous n\'êtes pas autorisé à effectuer cette action.',
  INVALID_TOKEN: 'Session expirée. Veuillez vous reconnecter.',
  RATE_LIMITED: 'Trop de tentatives. Veuillez réessayer plus tard.',
  INVALID_INPUT: 'Les données fournies sont invalides.',
  FILE_TOO_LARGE: 'Le fichier est trop volumineux (max 5MB).',
  INVALID_FILE_TYPE: 'Type de fichier non autorisé.',
  NETWORK_ERROR: 'Erreur de connexion. Vérifiez votre réseau.',
  SERVER_ERROR: 'Une erreur s\'est produite. Réessayez plus tard.'
} as const;

// Sensitive data patterns to redact in logs
export const SENSITIVE_PATTERNS = [
  { pattern: /sk-[a-zA-Z0-9]{32,}/g, replacement: 'sk-***' },
  { pattern: /Bearer [a-zA-Z0-9\-._~+/]+=*/g, replacement: 'Bearer ***' },
  { pattern: /"password"\s*:\s*"[^"]+"/g, replacement: '"password":"***"' },
  { pattern: /"email"\s*:\s*"[^"]+"/g, replacement: '"email":"***@***.***"' },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, replacement: '****' }
];

/**
 * Sanitize logs by removing sensitive information
 */
export function sanitizeForLogging(data: any): any {
  let stringified = JSON.stringify(data);
  
  SENSITIVE_PATTERNS.forEach(({ pattern, replacement }) => {
    stringified = stringified.replace(pattern, replacement);
  });
  
  try {
    return JSON.parse(stringified);
  } catch {
    return stringified;
  }
}

/**
 * Generate CSP header string
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_POLICY)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
}

/**
 * Check if origin is allowed
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || 
         (process.env.NODE_ENV === 'development' && origin.includes('localhost'));
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Le mot de passe doit contenir au moins ${PASSWORD_REQUIREMENTS.minLength} caractères`);
  }
  
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  if (PASSWORD_REQUIREMENTS.requireSpecialChar && 
      !new RegExp(`[${PASSWORD_REQUIREMENTS.specialChars.replace(/[\[\]\\]/g, '\\$&')}]`).test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }
  
  return { valid: errors.length === 0, errors };
}