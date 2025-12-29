import { Router, type Request, type Response } from 'express';

export const proxyRouter = Router();

function isAllowedHost(hostname: string, allowlist: string[]): boolean {
  return allowlist.some(h => hostname === h || hostname.endsWith(`.${h}`));
}

proxyRouter.get('/image', async (req: Request, res: Response) => {
  const url = req.query.url as string | undefined;
  if (!url) return res.status(400).send('URL parameter is required');

  const allowedHosts = (process.env.IMAGE_PROXY_HOSTS || 'instagram.com,cdninstagram.com,scontent.cdninstagram.com')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return res.status(400).send('Invalid URL');
  }

  if (!isAllowedHost(target.hostname, allowedHosts)) {
    return res.status(403).send('Host not allowed');
  }

  try {
    const response = await fetch(target.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    if (!response.ok) {
      return res.status(response.status).send('Upstream error');
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buf);
  } catch (e: any) {
    return res.status(500).send('Error fetching image');
  }
});

