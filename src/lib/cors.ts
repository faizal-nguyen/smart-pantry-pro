import { NextApiRequest, NextApiResponse } from 'next';

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  'http://localhost:3000',
  'http://localhost:3001',
  'https://smart-pantry-pro.vercel.app'
].filter(Boolean);

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin'
];

/**
 * Validate CORS for API endpoints
 */
export function validateCORS(
  req: NextApiRequest,
  res: NextApiResponse
): boolean {
  const origin = req.headers.origin;
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).end();
    return false;
  }

  // Check origin
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.NODE_ENV === 'development') {
    // Allow any origin in development
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Reject request in production
    res.status(403).json({ error: 'CORS: Origin not allowed' });
    return false;
  }

  // Set other CORS headers
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));

  return true;
}

/**
 * CORS middleware for Express-style servers
 */
export function corsMiddleware(
  allowedOrigins: string[] = ALLOWED_ORIGINS
) {
  return (req: any, res: any, next: any) => {
    const origin = req.headers.origin;

    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
      res.header('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
      res.header('Access-Control-Max-Age', '86400');
      return res.sendStatus(204);
    }

    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    next();
  };
}