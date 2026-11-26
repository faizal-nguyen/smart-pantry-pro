import { ClientErrorReportSchema } from '@smart/shared';
import { ApiError } from '@/lib/apiError';
import { createErrorReporter, routePattern } from '../errorReporting';

const PRODUCT = 'Oignon rouge de Roscoff';
const RECIPE = '30000000-0000-4000-8000-000000000001';

function reporter(path = '/kitchen') {
  const send = jest.fn().mockResolvedValue(undefined);
  return { send, report: createErrorReporter({ send, build: 'abc123', path: () => path, origin: () => 'https://app.test' }) };
}
const sent = (send: jest.Mock) => send.mock.calls.map(call => call[0]);

// Audit 2026-11-07 (reliability P1 5): a crash left no trace. V11-06 D10: the trace carries no free text.
describe('client error reporting', () => {
  test('sends the kind, the error name, the route pattern and the build, never the message nor the address', async () => {
    const { send, report } = reporter(`/kitchen/recipes/${RECIPE}`);
    const error = new Error(`Ajout de ${PRODUCT} non confirmé`);
    error.stack = `Error: Ajout de ${PRODUCT} non confirmé\n    at addRow (https://app.test/assets/index.js:1:2)`;
    await report('render', error);

    const [payload] = sent(send);
    expect(payload).toEqual({ kind: 'render', name: 'Error', route: '/kitchen/recipes/:id', stack: 'at addRow (/assets/index.js:1:2)', build: 'abc123' });
    expect(JSON.stringify(payload)).not.toContain(PRODUCT);
    expect(JSON.stringify(payload)).not.toContain(RECIPE);
    expect(ClientErrorReportSchema.safeParse(payload).success).toBe(true);
  });

  test.each([
    ['/', '/'],
    ['/kitchen/recipes', '/kitchen/recipes'],
    [`/kitchen/recipes/${RECIPE}/edit`, '/kitchen/recipes/:id/edit'],
    [`/kitchen/cooking/${RECIPE}`, '/kitchen/cooking/:sessionId'],
    ['/settings', '/settings'],
    [`/une-adresse-tapée-${PRODUCT}`, '*'],
    ['/ai-assistant', '*'],
  ])('reduces %s to the route pattern %s', (pathname, pattern) => {
    expect(routePattern(pathname)).toBe(pattern);
  });

  test('keeps a known code, drops an unknown one, and names what is not a known error', async () => {
    const { send, report } = reporter();
    await report('promise', new ApiError('Ce repas est déjà marqué cuisiné.', { status: 409, code: 'ALREADY_COOKED' }));
    await report('promise', new ApiError(`${PRODUCT} introuvable`, { status: 400, code: 'OIGNON_INCONNU' }));
    await report('promise', `texte rejeté : ${PRODUCT}`);
    class OignonError extends Error { name = 'OignonError'; }
    await report('window', new OignonError(PRODUCT));

    const payloads = sent(send);
    expect(payloads.map(({ name, code }) => ({ name, code }))).toEqual([
      { name: 'ApiError', code: 'ALREADY_COOKED' },
      { name: 'ApiError', code: undefined },
      { name: 'NonError', code: undefined },
      { name: 'OtherError', code: undefined },
    ]);
    expect(JSON.stringify(payloads)).not.toContain(PRODUCT);
    payloads.forEach(payload => expect(ClientErrorReportSchema.safeParse(payload).success).toBe(true));
  });

  test('the same failure is sent once, whatever its message, and at most 10 per page', async () => {
    const { send, report } = reporter();
    await report('window', new Error(`${PRODUCT} 1`));
    await report('window', new Error(`${PRODUCT} 2`));
    expect(send).toHaveBeenCalledTimes(1);

    const kinds = ['render', 'route', 'window', 'promise'] as const;
    const names = [Error, TypeError, RangeError, ReferenceError, SyntaxError];
    for (const kind of kinds) for (const Make of names) await report(kind, new Make('x'));
    expect(send).toHaveBeenCalledTimes(10);
  });

  test('a report that cannot be sent never throws', async () => {
    const report = createErrorReporter({ send: jest.fn().mockRejectedValue(new Error('offline')), build: 'b', path: () => '/', origin: () => 'https://app.test' });
    await expect(report('promise', 'texte rejeté')).resolves.toBeUndefined();
  });

  test('a development build without identifier sends no build', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    await createErrorReporter({ send, build: '', path: () => '/', origin: () => 'https://app.test' })('render', new Error('x'));
    expect(sent(send)[0]).not.toHaveProperty('build');
  });
});
