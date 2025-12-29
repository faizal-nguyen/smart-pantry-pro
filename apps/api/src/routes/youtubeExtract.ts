import { Router } from 'express';
import { UrlBody } from '@smart/shared';
import { extractYoutubeEnhanced } from '../services/youtubeEnhancedService.js';
import { YoutubeExtractResponse } from '@smart/shared';
import { route } from '../utils/route.js';

export const youtubeExtractRouter = Router();

// Accept { url } or { videoUrl } (clients should map videoUrl to url client-side)
youtubeExtractRouter.post('/', route({ schema: UrlBody, handler: async ({ req }) => {
  const { url } = (req as any).validated as { url: string };
  const dto = await extractYoutubeEnhanced(url);
  return YoutubeExtractResponse.parse(dto);
} }));
