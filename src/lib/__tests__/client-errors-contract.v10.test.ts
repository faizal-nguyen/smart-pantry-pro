import { ClientErrorReportSchema, clientErrorStack } from '@smart/shared';

const PRODUCT = 'Oignon rouge de Roscoff';
const ORIGIN = 'https://smart-pantry-pro.vercel.app';
const V8_STACK = [
  `Error: Ajout de ${PRODUCT} non confirmé`,
  'suite du message sur une deuxième ligne',
  '    at addRow (https://smart-pantry-pro.vercel.app/assets/index-a1b2c3.js:12:345)',
  '    at async submit (https://smart-pantry-pro.vercel.app/assets/QuickStockDialog-x9.js:3:21)',
  '    at https://smart-pantry-pro.vercel.app/assets/index-a1b2c3.js:1:2',
].join('\n');
const SAFARI_STACK = [
  'addRow@https://smart-pantry-pro.vercel.app/assets/index-a1b2c3.js:12:345',
  'global code@https://smart-pantry-pro.vercel.app/assets/index-a1b2c3.js:1:2',
].join('\n');

describe('client error contract — no free text (V11-06 D10)', () => {
  it('accepts a report made of enumerations, a route pattern, canonical stack frames and the build', () => {
    expect(ClientErrorReportSchema.safeParse({ kind: 'render', name: 'Error', route: '/kitchen' }).success).toBe(true);
    expect(ClientErrorReportSchema.safeParse({
      kind: 'promise', name: 'ApiError', code: 'ITEM_NOT_FOUND', route: '/kitchen/recipes/:id',
      stack: clientErrorStack(V8_STACK, ORIGIN), build: 'a1b2c3d4e5f6',
    }).success).toBe(true);
    expect(ClientErrorReportSchema.safeParse({ kind: 'window', name: 'NonError', route: '*' }).success).toBe(true);
  });

  it.each([
    ['a free message', { message: 'x is undefined' }],
    ['an address', { path: '/kitchen/recipes/30000000-0000-4000-8000-000000000001' }],
    ['an unknown error name', { name: 'OignonError' }],
    ['an unknown code', { code: 'OIGNON_ROUGE' }],
    ['an address instead of its pattern', { route: '/kitchen/recipes/30000000-0000-4000-8000-000000000001' }],
    ['a stack that carries the message', { stack: V8_STACK }],
    ['a stack longer than 10 frames', { stack: Array.from({ length: 11 }, (_, index) => `    at f${index} (https://x.test/a.js:1:${index})`).join('\n') }],
    ['a build that is not an identifier', { build: 'Build du 26 novembre' }],
    ['free text shaped like a frame', { stack: 'at Alice buys milk 12:3:4' }],
    ['a frame with a full address', { stack: 'at addRow (https://smart-pantry-pro.vercel.app/assets/index.js:1:2)' }],
    ['a frame with a query string', { stack: 'at addRow (/assets/index.js?recette=Poulet:1:2)' }],
  ])('refuses %s', (_label, change) => {
    expect(ClientErrorReportSchema.safeParse({ kind: 'render', name: 'Error', route: '/kitchen', ...change }).success).toBe(false);
  });

  it('rewrites frames to « at function (/path:line:column) »: the message never goes out, even on several lines', () => {
    expect(clientErrorStack(V8_STACK, ORIGIN)).toBe([
      'at addRow (/assets/index-a1b2c3.js:12:345)',
      'at submit (/assets/QuickStockDialog-x9.js:3:21)',
      'at /assets/index-a1b2c3.js:1:2',
    ].join('\n'));
    expect(clientErrorStack(SAFARI_STACK, ORIGIN)).toBe('at addRow (/assets/index-a1b2c3.js:12:345)\nat global (/assets/index-a1b2c3.js:1:2)');
    expect(clientErrorStack(`Error: ${PRODUCT}`, ORIGIN)).toBeUndefined();
  });

  it('keeps only frames of the app itself, without query, fragment or other scheme', () => {
    const stack = [
      `    at open (${ORIGIN}/assets/index.js?recette=${encodeURIComponent(PRODUCT)}#etape-2:4:5)`,
      '    at content (chrome-extension://abcdefghijklmnop/content.js:1:2)',
      `    at worker (blob:${ORIGIN}/0f3b-11ee:1:2)`,
      '    at inline (data:text/javascript,alert(1):1:2)',
      `    at eval (eval at render (${ORIGIN}/assets/index.js:9:9), <anonymous>:1:1)`,
      '    at tracker (https://autre-site.test/assets/t.js:1:2)',
      `    at Object.add [as onClick] (${ORIGIN}/assets/index.js:7:8)`,
    ].join('\n');
    expect(clientErrorStack(stack, ORIGIN)).toBe('at open (/assets/index.js:4:5)\nat Object.add (/assets/index.js:7:8)');
  });

  it('keeps at most 10 whole frames within 1500 characters', () => {
    const long = Array.from({ length: 40 }, (_, index) => `    at frame${index} (${ORIGIN}/assets/${'x'.repeat(150)}.js:1:${index})`).join('\n');
    const kept = clientErrorStack(long, ORIGIN) ?? '';
    expect(kept.length).toBeLessThanOrEqual(1500);
    expect(kept.split('\n').length).toBeLessThanOrEqual(10);
    expect(ClientErrorReportSchema.safeParse({ kind: 'render', name: 'Error', route: '/', stack: kept }).success).toBe(true);
  });
});
