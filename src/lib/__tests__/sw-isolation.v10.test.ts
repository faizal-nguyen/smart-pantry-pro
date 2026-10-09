import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

type RequestLike = { url: string; method: string; mode: string; headers: { has: (name: string) => boolean } };
type WorkerEvent = { request?: RequestLike; data?: { type: string }; respondWith: jest.Mock; waitUntil: jest.Mock };
function worker() {
  const handlers: Record<string,(event: WorkerEvent) => void> = {};
  const match = jest.fn(); const put = jest.fn(); const fetch = jest.fn();
  const cache = { match,put,addAll: jest.fn() };
  const caches = { open: jest.fn(async () => cache), keys: jest.fn(async () => ['smart-grocery-v1','smart-grocery-static-v1','smart-grocery-static-v10-01','foreign-cache']), delete: jest.fn(async (_name: string) => true) };
  const self = { location: { origin: 'https://local.test' }, clients: { claim: jest.fn() },
    addEventListener: (name: string,callback: (event: WorkerEvent) => void) => { handlers[name] = callback; } };
  runInNewContext(readFileSync(resolve(process.cwd(),'public/sw.js'),'utf8'),{ self,caches,fetch,URL });
  const request = (path: string,method = 'GET',auth = false,mode = 'cors'): RequestLike => ({
    url: new URL(path,'https://local.test').href,method,mode,headers: { has: name => auth && name === 'authorization' },
  });
  const event = (req?: RequestLike): WorkerEvent => ({ request: req,respondWith: jest.fn(),waitUntil: jest.fn() });
  return { handlers,match,put,fetch,caches,request,event };
}
test('private reads, authenticated assets and every write bypass the service worker cache', () => {
  const app = worker();
  for (const request of [app.request('/api/stock'),app.request('/assets/private.json','GET',true),app.request('https://project.supabase.co/rest/v1/inventory'),app.request('/assets/write','POST')]) {
    const event = app.event(request); app.handlers.fetch(event);
    expect(event.respondWith).not.toHaveBeenCalled();
  }
  expect(app.caches.open).not.toHaveBeenCalled(); expect(app.put).not.toHaveBeenCalled();
});
test('offline navigation returns only the public shell, never a former private response', async () => {
  const app = worker(); const shell = { text: '<html>public shell</html>' };
  app.fetch.mockRejectedValueOnce(new Error('offline')); app.match.mockResolvedValueOnce(shell);
  const event = app.event(app.request('/pantry/inventory','GET',false,'navigate')); app.handlers.fetch(event);
  expect(await event.respondWith.mock.calls[0][0]).toBe(shell);
  expect(app.match).toHaveBeenCalledWith('/'); expect(app.put).not.toHaveBeenCalled();
});
test('versioned public assets may be cached without storing application data', async () => {
  const app = worker(); const cloned = { text: 'public code' }; const response = { ok: true,clone: () => cloned };
  app.match.mockResolvedValueOnce(undefined); app.fetch.mockResolvedValueOnce(response);
  const request = app.request('/assets/app-abc123.js'); const event = app.event(request); app.handlers.fetch(event);
  expect(await event.respondWith.mock.calls[0][0]).toBe(response);
  expect(app.put).toHaveBeenCalledWith(request,cloned);
});
test('upgrade and account change purge previous application caches while preserving the new shell', async () => {
  const app = worker(); const activate = app.event(); app.handlers.activate(activate);
  await activate.waitUntil.mock.calls[0][0];
  expect(app.caches.delete.mock.calls.map(([name]) => name)).toEqual(['smart-grocery-v1','smart-grocery-static-v1']);
  app.caches.delete.mockClear(); const message = { ...app.event(),data: { type: 'PURGE_PRIVATE_DATA' } }; app.handlers.message(message);
  await message.waitUntil.mock.calls[0][0];
  expect(app.caches.delete.mock.calls.map(([name]) => name)).toEqual(['smart-grocery-v1','smart-grocery-static-v1']);
});
