/**
 * PRP-221 J4 — HMAC-signed confirmation tokens for medium/high tier
 * action sets that need explicit user approval before execution.
 *
 * Token shape (URL-safe) :
 *   <base64url(payload_json)>.<hex(hmac_sha256(secret, payload_json))>
 *
 * Payload :
 *   {
 *     u : user_id,            // RLS-bound check at verify time
 *     a : action_log_ids[],   // rows in assistant_action_log status='planned'
 *     s : session_id,
 *     e : expires_at_ms       // Date.now() + ttl
 *   }
 *
 * Verification rules :
 *   - HMAC must match (constant-time compare)
 *   - user_id must match the auth context
 *   - expires_at must be in the future
 *   - action_log_ids must be a non-empty array of UUIDs
 *
 * The verifier does NOT load the rows from DB — that's the route
 * handler's job (so it can also enforce RLS and check the rows are
 * still status='planned').
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface ConfirmationPayload {
  /** user_id who can spend this token. */
  userId: string;
  /** assistant_action_log.id rows referenced by the token. */
  actionLogIds: string[];
  /** session_id of the planning request. */
  sessionId: string;
  /** UNIX ms timestamp at which the token expires. */
  expiresAt: number;
}

export class ConfirmationTokenError extends Error {
  constructor(
    readonly code:
      | 'INVALID_FORMAT'
      | 'INVALID_SIGNATURE'
      | 'EXPIRED'
      | 'WRONG_USER'
      | 'EMPTY_ACTIONS'
  ) {
    super(`ConfirmationTokenError: ${code}`);
    this.name = 'ConfirmationTokenError';
  }
}

export interface ConfirmationTokenSignerOptions {
  /** TTL applied by sign() when not provided in the call. Default 5min. */
  defaultTtlMs?: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ConfirmationTokenSigner {
  private readonly defaultTtlMs: number;

  constructor(
    private readonly secret: string,
    options: ConfirmationTokenSignerOptions = {}
  ) {
    if (!secret || secret.length < 32) {
      throw new Error(
        'ConfirmationTokenSigner: secret must be at least 32 characters (use ASSISTANT_HMAC_SECRET).'
      );
    }
    this.defaultTtlMs = options.defaultTtlMs ?? 5 * 60_000;
  }

  /**
   * Sign a payload. Pass `expiresAt` explicitly for deterministic tests;
   * otherwise it's `now() + defaultTtlMs`.
   */
  sign(
    payload: Omit<ConfirmationPayload, 'expiresAt'> & { expiresAt?: number }
  ): string {
    if (payload.actionLogIds.length === 0) {
      throw new ConfirmationTokenError('EMPTY_ACTIONS');
    }
    const expiresAt = payload.expiresAt ?? Date.now() + this.defaultTtlMs;
    const compact = {
      u: payload.userId,
      a: payload.actionLogIds,
      s: payload.sessionId,
      e: expiresAt,
    };
    const json = JSON.stringify(compact);
    const body = Buffer.from(json).toString('base64url');
    const sig = createHmac('sha256', this.secret).update(body).digest('hex');
    return `${body}.${sig}`;
  }

  verify(token: string, expectedUserId: string): ConfirmationPayload {
    const parts = token.split('.');
    if (parts.length !== 2) throw new ConfirmationTokenError('INVALID_FORMAT');
    const [body, sig] = parts;

    const expected = createHmac('sha256', this.secret).update(body).digest('hex');
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ConfirmationTokenError('INVALID_SIGNATURE');
    }

    let parsed: { u?: unknown; a?: unknown; s?: unknown; e?: unknown };
    try {
      parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      throw new ConfirmationTokenError('INVALID_FORMAT');
    }

    const userId = typeof parsed.u === 'string' ? parsed.u : '';
    const sessionId = typeof parsed.s === 'string' ? parsed.s : '';
    const expiresAt = typeof parsed.e === 'number' ? parsed.e : 0;
    const actionLogIds = Array.isArray(parsed.a)
      ? parsed.a.filter((x): x is string => typeof x === 'string' && UUID_RE.test(x))
      : [];

    if (!userId || !UUID_RE.test(userId) || !sessionId || !UUID_RE.test(sessionId)) {
      throw new ConfirmationTokenError('INVALID_FORMAT');
    }
    if (actionLogIds.length === 0) {
      throw new ConfirmationTokenError('EMPTY_ACTIONS');
    }
    if (userId !== expectedUserId) {
      throw new ConfirmationTokenError('WRONG_USER');
    }
    if (Date.now() > expiresAt) {
      throw new ConfirmationTokenError('EXPIRED');
    }

    return { userId, sessionId, actionLogIds, expiresAt };
  }
}
