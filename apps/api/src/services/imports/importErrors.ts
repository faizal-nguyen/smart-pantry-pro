/**
 * Domain errors for the social-recipe-imports flow (PRP-220.11).
 *
 * Routes do `instanceof`-checks (via the type guards exported here) to
 * map each domain failure to the right HTTP status and stable error
 * code, without leaking the underlying cause to the client.
 *
 *   ImportNotFoundError       -> 404 NOT_FOUND
 *   ImportInvalidStateError   -> 409 INVALID_STATE
 *   NoDraftAvailableError     -> 409 NO_DRAFT_AVAILABLE
 *   ExtractionFailedError     -> 422 EXTRACTION_FAILED
 *   SaveFailedError           -> 422 SAVE_FAILED
 */

export class ImportNotFoundError extends Error {
  readonly code = 'NOT_FOUND' as const;

  constructor(public readonly importId: string) {
    super(`Import ${importId} not found`);
    this.name = 'ImportNotFoundError';
  }
}

export class ImportInvalidStateError extends Error {
  readonly code = 'INVALID_STATE' as const;

  constructor(public readonly currentStatus: string, message?: string) {
    super(message ?? `Cannot transition from status "${currentStatus}"`);
    this.name = 'ImportInvalidStateError';
  }
}

export class NoDraftAvailableError extends Error {
  readonly code = 'NO_DRAFT_AVAILABLE' as const;

  constructor(public readonly importId: string) {
    super(`No current draft for import ${importId}`);
    this.name = 'NoDraftAvailableError';
  }
}

export class ExtractionFailedError extends Error {
  readonly code = 'EXTRACTION_FAILED' as const;

  constructor(public readonly platform: string, message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ExtractionFailedError';
  }
}

export class SaveFailedError extends Error {
  readonly code = 'SAVE_FAILED' as const;

  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SaveFailedError';
  }
}

// ---- Type guards -----------------------------------------------------

export function isImportNotFound(e: unknown): e is ImportNotFoundError {
  return e instanceof ImportNotFoundError;
}

export function isImportInvalidState(e: unknown): e is ImportInvalidStateError {
  return e instanceof ImportInvalidStateError;
}

export function isNoDraftAvailable(e: unknown): e is NoDraftAvailableError {
  return e instanceof NoDraftAvailableError;
}

export function isExtractionFailed(e: unknown): e is ExtractionFailedError {
  return e instanceof ExtractionFailedError;
}

export function isSaveFailed(e: unknown): e is SaveFailedError {
  return e instanceof SaveFailedError;
}
