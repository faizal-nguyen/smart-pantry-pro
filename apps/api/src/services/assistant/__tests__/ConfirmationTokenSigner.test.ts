import {
  ConfirmationTokenSigner,
  ConfirmationTokenError,
} from '../ConfirmationTokenSigner.js';

function expectError(fn: () => unknown, code: ConfirmationTokenError['code']): void {
  let caught: unknown;
  try {
    fn();
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(ConfirmationTokenError);
  expect((caught as ConfirmationTokenError).code).toBe(code);
}

const SECRET = 'a'.repeat(64);
const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';
const SESSION = '33333333-3333-3333-3333-333333333333';
const ACTION_1 = '44444444-4444-4444-4444-444444444444';
const ACTION_2 = '55555555-5555-5555-5555-555555555555';

describe('ConfirmationTokenSigner', () => {
  it('rejects construction with a too-short secret', () => {
    expect(() => new ConfirmationTokenSigner('too-short')).toThrow(/at least 32/);
  });

  it('round-trips a signed token back to its payload', () => {
    const signer = new ConfirmationTokenSigner(SECRET);
    const expiresAt = Date.now() + 60_000;
    const token = signer.sign({
      userId: USER_A,
      sessionId: SESSION,
      actionLogIds: [ACTION_1, ACTION_2],
      expiresAt,
    });
    const payload = signer.verify(token, USER_A);
    expect(payload).toEqual({
      userId: USER_A,
      sessionId: SESSION,
      actionLogIds: [ACTION_1, ACTION_2],
      expiresAt,
    });
  });

  it('rejects a tampered body', () => {
    const signer = new ConfirmationTokenSigner(SECRET);
    const token = signer.sign({
      userId: USER_A,
      sessionId: SESSION,
      actionLogIds: [ACTION_1],
    });
    const [body, sig] = token.split('.');
    const tampered = `${body.slice(0, -2)}aa.${sig}`;
    expectError(() => signer.verify(tampered, USER_A), 'INVALID_SIGNATURE');
  });

  it('rejects a token signed by a different secret', () => {
    const a = new ConfirmationTokenSigner(SECRET);
    const b = new ConfirmationTokenSigner('b'.repeat(64));
    const token = a.sign({
      userId: USER_A,
      sessionId: SESSION,
      actionLogIds: [ACTION_1],
    });
    expectError(() => b.verify(token, USER_A), 'INVALID_SIGNATURE');
  });

  it('rejects when called with the wrong user', () => {
    const signer = new ConfirmationTokenSigner(SECRET);
    const token = signer.sign({
      userId: USER_A,
      sessionId: SESSION,
      actionLogIds: [ACTION_1],
    });
    expectError(() => signer.verify(token, USER_B), 'WRONG_USER');
  });

  it('rejects an expired token', () => {
    const signer = new ConfirmationTokenSigner(SECRET);
    const token = signer.sign({
      userId: USER_A,
      sessionId: SESSION,
      actionLogIds: [ACTION_1],
      expiresAt: Date.now() - 1000, // already expired
    });
    expectError(() => signer.verify(token, USER_A), 'EXPIRED');
  });

  it('rejects sign() with an empty actionLogIds array', () => {
    const signer = new ConfirmationTokenSigner(SECRET);
    expectError(
      () =>
        signer.sign({
          userId: USER_A,
          sessionId: SESSION,
          actionLogIds: [],
        }),
      'EMPTY_ACTIONS'
    );
  });

  it('rejects malformed token (no dot)', () => {
    const signer = new ConfirmationTokenSigner(SECRET);
    expectError(() => signer.verify('not-a-token', USER_A), 'INVALID_FORMAT');
  });

  it('uses the default TTL when expiresAt is omitted', () => {
    const signer = new ConfirmationTokenSigner(SECRET, { defaultTtlMs: 60_000 });
    const before = Date.now();
    const token = signer.sign({
      userId: USER_A,
      sessionId: SESSION,
      actionLogIds: [ACTION_1],
    });
    const payload = signer.verify(token, USER_A);
    expect(payload.expiresAt).toBeGreaterThanOrEqual(before + 60_000);
    expect(payload.expiresAt).toBeLessThan(before + 60_000 + 5_000);
  });
});
