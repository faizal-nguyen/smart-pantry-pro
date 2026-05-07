import { encodeCursor, decodeCursor } from '../utils/cursor';

describe('cursor (PRP-220.10)', () => {
  it('round-trips a payload', () => {
    const payload = { ts: '2026-05-07T12:00:00.000Z', id: '11111111-1111-1111-1111-111111111111' };
    const encoded = encodeCursor(payload);
    expect(decodeCursor(encoded)).toEqual(payload);
  });

  it('returns base64url (no =, no /, no +)', () => {
    const encoded = encodeCursor({ ts: '2026-05-07T12:00:00.000Z', id: 'abc' });
    expect(encoded).not.toMatch(/[=+/]/);
  });

  it('returns null on garbage', () => {
    expect(decodeCursor('not-a-cursor')).toBeNull();
    expect(decodeCursor('')).toBeNull();
    expect(decodeCursor('!!!')).toBeNull();
  });

  it('returns null on a wrong-version payload', () => {
    const tampered = Buffer.from(JSON.stringify({ v: 999, ts: '...', id: '...' })).toString('base64url');
    expect(decodeCursor(tampered)).toBeNull();
  });

  it('returns null when ts/id are missing', () => {
    const partial = Buffer.from(JSON.stringify({ v: 1, ts: 'x' })).toString('base64url');
    expect(decodeCursor(partial)).toBeNull();
  });
});
