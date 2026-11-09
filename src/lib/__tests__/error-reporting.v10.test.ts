import { createErrorReporter } from '../errorReporting';

// Audit 2026-11-07 (reliability P1 5): Sentry was referenced but never set up; no crash was ever seen.
describe('client error reporting', () => {
  test('sends the message, a short stack, the page and the build', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const report = createErrorReporter({ send, build: 'abc123', path: () => '/kitchen' });
    const error = new Error('x is undefined'); error.stack = `Error: x is undefined\n${'    at frame\n'.repeat(200)}`;
    await report('render', error);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ kind: 'render', message: 'x is undefined', path: '/kitchen', build: 'abc123' }));
    expect(send.mock.calls[0][0].stack.length).toBeLessThanOrEqual(1500);
  });
  test('the same error is sent once, and at most 10 per page', async () => {
    const send = jest.fn().mockResolvedValue(undefined);
    const report = createErrorReporter({ send, build: 'b', path: () => '/' });
    await report('window', new Error('same')); await report('window', new Error('same'));
    for (let index = 0; index < 20; index++) await report('window', new Error(`other ${index}`));
    expect(send).toHaveBeenCalledTimes(10);
  });
  test('a report that cannot be sent never throws', async () => {
    const report = createErrorReporter({ send: jest.fn().mockRejectedValue(new Error('offline')), build: 'b', path: () => '/' });
    await expect(report('promise', 'texte rejeté')).resolves.toBeUndefined();
  });
});
