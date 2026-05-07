/**
 * Opaque cursor for paginating `social_recipe_imports` (PRP-220.10).
 *
 * The list endpoint orders rows by (created_at DESC, id DESC), so a
 * cursor is the (timestamp, id) pair of the last row of the previous
 * page. We base64-encode it so the client treats it as opaque, but
 * decoding stays cheap and dependency-free.
 *
 * Forward-compat: if we change the order key later, we just bump the
 * `v` field and ignore older cursors.
 */
const VERSION = 1;

export interface CursorPayload {
  ts: string;
  id: string;
}

export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify({ v: VERSION, ts: payload.ts, id: payload.id });
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeCursor(encoded: string): CursorPayload | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as { v?: number; ts?: string; id?: string };
    if (parsed.v !== VERSION) return null;
    if (typeof parsed.ts !== 'string' || typeof parsed.id !== 'string') return null;
    return { ts: parsed.ts, id: parsed.id };
  } catch {
    return null;
  }
}
