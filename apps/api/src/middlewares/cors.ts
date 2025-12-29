import cors from 'cors';

const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

type OriginFn = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void;

export const corsMiddleware = cors({
  origin: ((origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowed.length === 0) return origin.includes('localhost') ? cb(null, true) : cb(new Error('CORS not allowed'));
    return allowed.includes(origin) || origin.includes('localhost') ? cb(null, true) : cb(new Error('CORS not allowed'));
  }) as OriginFn,
  credentials: true
});
