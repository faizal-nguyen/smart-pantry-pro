import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { createApp } from '../app.js';

// uuid ships ESM only, which this CommonJS jest setup cannot parse.
jest.mock('uuid', () => ({ v4: () => '00000000-0000-4000-8000-000000000000' }));

/**
 * A serverless instance hands its first request to the app in the same tick
 * as createApp(): /api/v1 and /api/admin must already be mounted. They used to
 * be imported lazily and answered 503 V1_NOT_READY / ADMIN_NOT_READY meanwhile.
 */
function firstRequest(app: ReturnType<typeof createApp>, method: string, url: string) {
  return new Promise<{ status: number; code?: string }>((resolve) => {
    const req = new IncomingMessage(new Socket());
    req.method = method;
    req.url = url;
    const res = new ServerResponse(req);
    res.end = function end(chunk?: unknown) {
      let code: string | undefined;
      try { code = JSON.parse(String(chunk ?? '{}')).code; } catch { code = undefined; }
      resolve({ status: this.statusCode, code });
      return this;
    } as ServerResponse['end'];
    app(req as never, res as never);
  });
}

describe('createApp on a cold start', () => {
  it('serves /api/v1 on the very first request', async () => {
    const res = await firstRequest(createApp(), 'GET', '/api/v1/settings');
    expect(res.code).not.toBe('V1_NOT_READY');
    expect(res.status).not.toBe(503);
    expect(res.status).not.toBe(404);
  });

  it('serves /api/admin on the very first request', async () => {
    const res = await firstRequest(createApp(), 'POST', '/api/admin/deletions/process');
    expect(res.code).not.toBe('ADMIN_NOT_READY');
    expect(res.status).not.toBe(404);
  });

  it('can leave /api/v1 unmounted', async () => {
    const res = await firstRequest(createApp({ skipV1: true }), 'GET', '/api/v1/settings');
    expect(res.status).toBe(404);
  });
});
