import { z } from 'zod';

export const UrlBody = z.object({ url: z.string().url().max(1000) });
export const FlexibleUrlBody = z.object({
  url: z.string().url().max(1000).optional(),
  videoUrl: z.string().url().max(1000).optional()
}).refine(v => !!(v.url || v.videoUrl), { message: 'url or videoUrl is required' });
export const VideoBody = z.object({
  videoUrl: z.string().url().max(1000),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'generic']).optional()
});

export type UrlBodyT = z.infer<typeof UrlBody>;
export type FlexibleUrlBodyT = z.infer<typeof FlexibleUrlBody>;
export type VideoBodyT = z.infer<typeof VideoBody>;
