import { ApiError } from '@/lib/api';

/**
 * True only when the stock command route refused the command for a business reason, which
 * guarantees a complete rollback: the saved intention may then be dropped. Every other
 * failure leaves the outcome unknown and keeps the command identity, so the retry reads or
 * replays the receipt instead of creating a second command:
 * - 401: the session changed or expired;
 * - 409 `IDEMPOTENCY_CONFLICT`: a receipt already exists for this identity;
 * - 429: a limiter or proxy answered, possibly after the command ran;
 * - network errors and 5xx.
 */
export function isRolledBackRefusal(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500
    && error.status !== 401 && error.status !== 429 && error.code !== 'IDEMPOTENCY_CONFLICT';
}
