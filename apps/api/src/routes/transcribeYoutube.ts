import { Router, type Request, type Response } from 'express';
import { transcribeYoutube as transcribeSvc } from '../services/transcribeService.js';
import { route } from '../utils/route.js';
import { TranscribeYoutubeBody, TranscribeResponse } from '@smart/shared';

export const transcribeYoutubeRouter = Router();

transcribeYoutubeRouter.post('/', route({ schema: TranscribeYoutubeBody, handler: async ({ req }) => {
  const { videoUrl, language } = (req as any).validated as { videoUrl: string, language?: string };
  const dto = await transcribeSvc(videoUrl, language);
  return TranscribeResponse.parse(dto);
} }));
