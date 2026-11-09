import { apiPost } from './api';
import { CURRENT_BUILD } from './appVersion';
import { createErrorReporter } from './errorReporting';

/** Sends crashes to the API, which logs them (signed in only: the route needs a token). */
export const reportClientError = createErrorReporter({
  send: report => apiPost('/v1/client-errors', report).then(() => undefined),
  build: CURRENT_BUILD,
  path: () => window.location.pathname,
});

/** Errors and rejected promises no component caught. */
export function installGlobalErrorReporting(): void {
  window.addEventListener('error', event => { void reportClientError('window', event.error ?? event.message); });
  window.addEventListener('unhandledrejection', event => { void reportClientError('promise', event.reason); });
}
