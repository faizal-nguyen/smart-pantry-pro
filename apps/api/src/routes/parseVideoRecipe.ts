import { Router, type Request, type Response } from 'express';
import { VideoBody } from '@smart/shared';
import { parseVideoRecipe } from '../services/videoParserService.js';
import { ok, fail } from '../utils/responses.js';

export const parseVideoRecipeRouter = Router();

parseVideoRecipeRouter.post('/', async (req: Request, res: Response) => {
  const check = VideoBody.safeParse(req.body);
  if (!check.success) return fail(res, 'Invalid request body', 400, 'INVALID_BODY');

  const { videoUrl, platform } = check.data;

  try {
    const formattedRecipe = await parseVideoRecipe(videoUrl, platform);
    return ok(res, { ...formattedRecipe, code: 'PARSE_VIDEO_OK' }, 'Parsed');
  } catch (error: any) {
    const fallback = await parseVideoRecipe(videoUrl, platform);
    return ok(res, { ...fallback, code: 'PARSE_VIDEO_FALLBACK' }, 'Parsed (fallback)');
  }
});
