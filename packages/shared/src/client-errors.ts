import { z } from 'zod';

/**
 * V11-06 D10 — a crash report from the browser carries no free text: no message, no address, no
 * input. Only enumerations, the route pattern, stack frames and the build. A message can quote what
 * the user typed (a product, a label); an address holds identifiers or anything typed in it.
 */
export const CLIENT_ERROR_KINDS = ['render', 'route', 'window', 'promise'] as const;
export type ClientErrorKind = (typeof CLIENT_ERROR_KINDS)[number];

/** Paths of the client router (`src/App.tsx`), kept in step by a test. */
export const CLIENT_ROUTE_PATTERNS = [
  '/auth', '/share-target', '/onboarding',
  '/',
  '/pantry/inventory',
  '/kitchen', '/kitchen/recipes', '/kitchen/recipes/:id', '/kitchen/recipes/:id/edit',
  '/kitchen/meal-planning', '/kitchen/meal-planning/proposition', '/kitchen/cooking/:sessionId',
  '/shopping/list', '/shopping/week', '/shopping/ticket',
  '/assistant', '/insights', '/settings',
] as const;
/** No pattern matched: a page not found, or a legacy alias about to redirect. */
export const UNMATCHED_ROUTE = '*';
const ROUTES = [...CLIENT_ROUTE_PATTERNS, UNMATCHED_ROUTE] as const;
export type ClientErrorRoute = (typeof ROUTES)[number];

/** `NonError`: a rejected value that is not an Error. `OtherError`: an Error with another name. */
export const CLIENT_ERROR_NAMES = [
  'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError',
  'ApiError', 'PostgrestError', 'AbortError', 'NotAllowedError', 'WasteLogError',
  'NonError', 'OtherError',
] as const;
export type ClientErrorName = (typeof CLIENT_ERROR_NAMES)[number];

/**
 * Machine codes an error can carry to the browser; any other code is left out of the report.
 * API base errors, stock commands (a test keeps them in step), recipe discovery, receipts, codes
 * the client sets itself, and the Postgres and PostgREST codes it handles.
 */
export const CLIENT_ERROR_CODES = [
  // API base errors and middlewares
  'BAD_REQUEST', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'VALIDATION_ERROR',
  'RATE_LIMIT_EXCEEDED', 'RATE_LIMITED', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'ROUTE_NOT_FOUND',
  // Stock commands
  'ITEM_NOT_FOUND', 'RECIPE_NOT_FOUND', 'RECIPE_CHANGED', 'INSUFFICIENT_QUANTITY', 'QUANTITY_UNKNOWN',
  'UNIT_UNKNOWN', 'UNIT_INCOMPATIBLE', 'UNDO_CONFLICT', 'MENU_CHANGED', 'ALREADY_UNDONE',
  'IDEMPOTENCY_CONFLICT', 'INVALID_ALLOCATION', 'INVALID_QUANTITY', 'COMMAND_NOT_FOUND',
  'MIGRATION_REQUIRED', 'INVALID_COMMAND', 'DUPLICATE_ITEM', 'STOCK_CHANGED', 'ALREADY_COOKED',
  'MEAL_COOKED', 'LEFTOVER_CAPACITY', 'LEFTOVER_ORDER', 'PROPOSAL_EXPIRED', 'PROFILE_CHANGED',
  'INVALID_PROPOSAL', 'PROFILE_UNAVAILABLE', 'RECEIPT_ALREADY_APPLIED', 'RECEIPT_NOT_FOUND',
  'STOCK_WRITE_FAILED',
  // Recipe discovery
  'VERSION_CONFLICT', 'SELECTION_WINDOW_CHANGED', 'CREATOR_NOT_FOUND', 'KEEP_REQUIRED',
  'RECIPE_REQUIRED', 'COOKING_REQUIRED', 'QUOTA_EXCEEDED', 'ALREADY_ADDED', 'CREATOR_LIMIT',
  'ITEM_LIMIT', 'INVALID_URL', 'DISCOVERY_UNAVAILABLE',
  // Receipts
  'RECEIPT_UNREADABLE', 'RECEIPT_NO_FOOD', 'RECEIPT_TOO_LONG', 'RECEIPT_READ_FAILED',
  // Set by the client
  'NETWORK_ERROR', 'AUTH_CHANGED', 'REVISION_CONFLICT', 'PROFILE_PENDING', 'DISCOVERY_PENDING',
  'FEEDBACK_PENDING', 'INVALID_DISCOVERY_IMPORT', 'INVALID_DISCOVERY_ITEM', 'INVALID_DISCOVERY_OWNER',
  'INVALID_MENU_SHOPPING_PREVIEW', 'INVALID_RECEIPT_SCAN', 'INVALID_RECIPE_EVALUATION',
  'INVALID_WEEK_PROPOSAL', 'INVALID_WEEK_PROPOSAL_REQUEST', 'RECIPE_DETAILS_UNAVAILABLE',
  // Postgres and PostgREST
  '22P02', '23503', '23505', '42P01', '42703', 'PGRST116', 'PGRST202', 'PGRST204',
] as const;
export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];

export const CLIENT_ERROR_STACK_MAX_FRAMES = 10;
export const CLIENT_ERROR_STACK_MAX_LENGTH = 1500;
export const CLIENT_ERROR_BUILD_PATTERN = /^[a-z0-9]{1,40}$/;

const FRAME_FUNCTION = /^[\w$.<>[\]]{1,80}$/;
const FRAME_PATH = /^\/[\w./-]{1,200}\.(?:m?js|jsx?|tsx?)$/;
/**
 * The only frame form accepted: `at fn (/path/file.js:12:34)` or `at /path/file.js:12:34`. A
 * function name, the path of a file of the app and two numbers: no space, query, fragment, scheme or
 * free text, whatever the browser wrote (and whatever a forged report tries).
 */
export const CLIENT_STACK_FRAME = /^at (?:[\w$.<>[\]]{1,80} \(\/[\w./-]{1,200}\.(?:m?js|jsx?|tsx?):\d{1,7}:\d{1,7}\)|\/[\w./-]{1,200}\.(?:m?js|jsx?|tsx?):\d{1,7}:\d{1,7})$/;
/** V8: `    at fn (url:1:2)`, `    at url:1:2`. Safari and Firefox: `fn@url:1:2`, `@url:1:2`. */
const V8_FRAME = /^\s*at (?:(.*?) \()?(\S+?):(\d{1,7}):(\d{1,7})\)?$/;
const JSC_FRAME = /^([^@\s]*(?: [^@\s]+)?)@(\S+?):(\d{1,7}):(\d{1,7})$/;

/**
 * A browser frame rewritten to the accepted form, or `null`: frames from another origin, from
 * `blob:`, `data:`, an extension or `eval` go, and so do the query and the fragment of the address.
 */
function canonicalFrame(line: string, origin: string): string | null {
  const match = V8_FRAME.exec(line) ?? JSC_FRAME.exec(line);
  if (!match) return null;
  const [, rawName = '', address, row, column] = match;
  let url: URL;
  try { url = new URL(address); } catch { return null; }
  if (url.origin !== origin || !FRAME_PATH.test(url.pathname)) return null;
  const name = rawName.replace(/^(?:async|new) /, '').split(/\s/)[0];
  const place = `${url.pathname}:${row}:${column}`;
  return FRAME_FUNCTION.test(name) ? `at ${name} (${place})` : `at ${place}`;
}

/**
 * The frames of a stack in the accepted form, whole, at most 10 and 1500 characters. The first
 * line (`Error: <message>`) and any message line go. `undefined` when nothing is left.
 */
export function clientErrorStack(stack: string | undefined, origin: string): string | undefined {
  if (!stack) return undefined;
  const kept: string[] = [];
  let length = 0;
  for (const line of stack.split('\n')) {
    if (kept.length >= CLIENT_ERROR_STACK_MAX_FRAMES) break;
    const frame = canonicalFrame(line, origin);
    if (!frame) continue;
    const added = frame.length + (kept.length ? 1 : 0);
    if (length + added > CLIENT_ERROR_STACK_MAX_LENGTH) break;
    kept.push(frame);
    length += added;
  }
  return kept.length ? kept.join('\n') : undefined;
}

const StackSchema = z.string().max(CLIENT_ERROR_STACK_MAX_LENGTH).refine(stack => {
  // Length first: the refinement also runs when `max` failed.
  if (stack.length > CLIENT_ERROR_STACK_MAX_LENGTH) return false;
  const lines = stack.split('\n');
  return lines.length <= CLIENT_ERROR_STACK_MAX_FRAMES && lines.every(line => CLIENT_STACK_FRAME.test(line));
}, 'Only stack frames are accepted.');

export const ClientErrorReportSchema = z.object({
  kind: z.enum(CLIENT_ERROR_KINDS),
  name: z.enum(CLIENT_ERROR_NAMES),
  code: z.enum(CLIENT_ERROR_CODES).optional(),
  route: z.enum(ROUTES),
  stack: StackSchema.optional(),
  build: z.string().regex(CLIENT_ERROR_BUILD_PATTERN).optional(),
}).strict();
export type ClientErrorReport = z.infer<typeof ClientErrorReportSchema>;
