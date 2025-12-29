import { Router, type Request, type Response } from 'express';
import { transcribeShoppingAudio } from '../services/shoppingTranscribeService.js';
import { ok, fail } from '../utils/responses.js';

export const shoppingTranscribeRouter = Router();

shoppingTranscribeRouter.post('/', async (req: Request, res: Response) => {
  const payload: any = await transcribeShoppingAudio(req.body || {});
  return ok(res, payload, 'Transcribed');
});
