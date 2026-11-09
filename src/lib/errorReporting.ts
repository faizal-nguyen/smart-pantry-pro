export type ClientErrorKind = 'render' | 'route' | 'window' | 'promise';
export interface ClientErrorReport { kind: ClientErrorKind; message: string; stack?: string; path: string; build?: string }

const MAX_REPORTS_PER_PAGE = 10;
const MAX_MESSAGE = 500;
const MAX_STACK = 1500;

/**
 * Reports a crash at most once per message and 10 times per page, with a short stack, the
 * page and the build. Sending must never fail the app.
 */
export function createErrorReporter({ send, build, path }:
  { send: (report: ClientErrorReport) => Promise<void>; build: string; path: () => string }) {
  const seen = new Set<string>();
  return async (kind: ClientErrorKind, error: unknown): Promise<void> => {
    const message = (error instanceof Error ? error.message : typeof error === 'string' ? error : 'Erreur inconnue').slice(0, MAX_MESSAGE) || 'Erreur inconnue';
    const key = `${kind}:${message}`;
    if (seen.has(key) || seen.size >= MAX_REPORTS_PER_PAGE) return;
    seen.add(key);
    const stack = error instanceof Error && error.stack ? error.stack.slice(0, MAX_STACK) : undefined;
    try {
      await send({ kind, message, ...(stack ? { stack } : {}), path: path().slice(0, 200), ...(build ? { build } : {}) });
    } catch {
      // The report is lost; the app keeps going.
    }
  };
}
