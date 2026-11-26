import { matchRoutes } from 'react-router-dom';
import {
  CLIENT_ERROR_BUILD_PATTERN,
  CLIENT_ERROR_CODES,
  CLIENT_ERROR_NAMES,
  CLIENT_ROUTE_PATTERNS,
  UNMATCHED_ROUTE,
  clientErrorStack,
  type ClientErrorCode,
  type ClientErrorKind,
  type ClientErrorName,
  type ClientErrorReport,
  type ClientErrorRoute,
} from '@smart/shared';

export type { ClientErrorKind, ClientErrorReport };

const MAX_REPORTS_PER_PAGE = 10;
const ROUTES = CLIENT_ROUTE_PATTERNS.map(path => ({ path }));
const NAMES = new Set<string>(CLIENT_ERROR_NAMES);
const CODES = new Set<string>(CLIENT_ERROR_CODES);

/** The router pattern of an address (`/kitchen/recipes/:id`), or `*`: never the address itself. */
export function routePattern(pathname: string): ClientErrorRoute {
  const path = matchRoutes(ROUTES, pathname)?.[0]?.route.path;
  return (CLIENT_ROUTE_PATTERNS as readonly string[]).includes(path ?? '') ? path as ClientErrorRoute : UNMATCHED_ROUTE;
}

function errorName(error: unknown): ClientErrorName {
  if (!(error instanceof Error)) return 'NonError';
  return NAMES.has(error.name) ? error.name as ClientErrorName : 'OtherError';
}

function errorCode(error: unknown): ClientErrorCode | undefined {
  const code = typeof error === 'object' && error !== null ? (error as { code?: unknown }).code : undefined;
  return typeof code === 'string' && CODES.has(code) ? code as ClientErrorCode : undefined;
}

/**
 * Reports a crash at most once per kind, error name, code and route, and 10 times per page. The
 * report holds no message and no address (V11-06 D10): see `ClientErrorReportSchema`. Sending must
 * never fail the app.
 */
export function createErrorReporter({ send, build, path, origin }:
  { send: (report: ClientErrorReport) => Promise<void>; build: string; path: () => string; origin: () => string }) {
  const seen = new Set<string>();
  return async (kind: ClientErrorKind, error: unknown): Promise<void> => {
    const name = errorName(error), code = errorCode(error), route = routePattern(path());
    const key = `${kind}:${name}:${code ?? ''}:${route}`;
    if (seen.has(key) || seen.size >= MAX_REPORTS_PER_PAGE) return;
    seen.add(key);
    const stack = error instanceof Error ? clientErrorStack(error.stack, origin()) : undefined;
    const report: ClientErrorReport = {
      kind, name, ...(code ? { code } : {}), route, ...(stack ? { stack } : {}),
      ...(CLIENT_ERROR_BUILD_PATTERN.test(build) ? { build } : {}),
    };
    try {
      await send(report);
    } catch {
      // The report is lost; the app keeps going.
    }
  };
}
