import { Router, type Request, type Response } from 'express';
import { VideoBody } from '@smart/shared';
import { parseVideoRecipe } from '../services/videoParserService.js';
import { isVideoParseError } from '../services/errors.js';
import { ok, fail } from '../utils/responses.js';

export const parseVideoRecipeRouter = Router();

parseVideoRecipeRouter.post('/', async (req: Request, res: Response) => {
  const check = VideoBody.safeParse(req.body);
  if (!check.success) return fail(res, 'Invalid request body', 400, 'INVALID_BODY');

  const { videoUrl, platform } = check.data;

  try {
    const formattedRecipe = await parseVideoRecipe(videoUrl, platform);
    return ok(res, { ...formattedRecipe, code: 'PARSE_VIDEO_OK' }, 'Parsed');
  } catch (error: unknown) {
    // PRP-220.08: an extraction failure must surface as 422 so the UI
    // can show a real error message. We never re-attempt the parse and
    // we never fabricate a placeholder recipe (the old "Demo Recipe
    // from Video" code path was a footgun: users could save the
    // placeholder as if it were real).
    // Log the underlying cause server-side; return a generic message to
    // the client so internal paths / stack traces don't leak.
    if (isVideoParseError(error)) {
      console.error('[parseVideoRecipe] extraction failed:', {
        code: error.code,
        platform: error.platform,
        message: error.message,
      });
      return fail(res, 'Video extraction failed', 422, error.code);
    }
    console.error('[parseVideoRecipe] unexpected error:', error);
    return fail(res, 'Video extraction failed', 422, 'EXTRACTION_FAILED');
  }
});
