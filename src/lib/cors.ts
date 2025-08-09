// Support both Next.js API and Vercel Functions
type Request = any;
type Response = any;

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
 * Simple CORS handler for Vercel Functions
 */
export function corsHandler(req: Request, res: Response): void {
  const origin = req.headers.origin;
  
  // Set basic CORS headers
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
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