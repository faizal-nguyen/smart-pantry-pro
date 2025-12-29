import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { fetchInstagramOEmbed } from '../services/instagramOEmbedService.js';
import { getInstagramThumbnail } from '../services/instagramThumbnailService.js';
import { route } from '../utils/route.js';
import { UrlBody, InstagramOEmbedResponse, InstagramThumbnailResponse } from '@smart/shared';

export const instagramRouter = Router();

instagramRouter.post('/oembed', route({ schema: UrlBody, handler: async ({ req }) => {
  const { url } = (req as any).validated as { url: string };
  const payload = await fetchInstagramOembedSafe(url);
  return payload;
} }));

instagramRouter.post('/thumbnail', route({ schema: UrlBody, handler: async ({ req }) => {
  const { url } = (req as any).validated as { url: string };
  const payload = await getInstagramThumbnailSafe(url);
  return payload;
} }));

async function fetchInstagramOembedSafe(url: string) {
  const raw = await fetchInstagramOEmbed(url);
  const parsed = InstagramOEmbedResponse.safeParse({ oembed: (raw as any).oembed, source: (raw as any).source, message: (raw as any).message, code: (raw as any).code });
  return parsed.success ? parsed.data : raw;
}

async function getInstagramThumbnailSafe(url: string) {
  const raw = await getInstagramThumbnail(url);
  const parsed = InstagramThumbnailResponse.safeParse({ thumbnail_url: (raw as any).thumbnail_url ?? null, source: (raw as any).source, method: (raw as any).method, message: (raw as any).message, code: (raw as any).code });
  return parsed.success ? parsed.data : raw;
}
