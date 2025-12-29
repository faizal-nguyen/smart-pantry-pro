import helmet from 'helmet';

export const securityMiddleware = helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "img-src": ["'self'", 'data:', 'https:'],
      "connect-src": ["'self'", 'https://*.supabase.co', 'https://api.openai.com']
    }
  } : false
});

