/**
 * Domain errors for the apps/api service layer (PRP-220.08).
 *
 * Routes can `instanceof`-check these to map to the right HTTP status
 * without leaking the underlying cause (which may include credentials
 * or stack traces from third-party libraries).
 */

export interface VideoParseErrorDetails {
  code: string;
  message: string;
  platform: string;
  cause?: unknown;
}

export class VideoParseError extends Error {
  readonly code: string;
  readonly platform: string;
  readonly cause?: unknown;

  constructor(details: VideoParseErrorDetails) {
    super(details.message);
    this.name = 'VideoParseError';
    this.code = details.code;
    this.platform = details.platform;
    this.cause = details.cause;
  }
}

export function isVideoParseError(err: unknown): err is VideoParseError {
  return err instanceof VideoParseError;
}
