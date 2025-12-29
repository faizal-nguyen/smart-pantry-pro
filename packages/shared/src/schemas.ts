import { z } from 'zod';

// Common URL bodies
export const UrlBody = z.object({ url: z.string().url().max(1000) });
export const VideoBody = z.object({
  videoUrl: z.string().url().max(1000),
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'generic']).optional()
});

export const TranscribeYoutubeBody = z.object({
  videoUrl: z.string().url().max(1000),
  language: z.string().optional()
});

// Shopping schema
export const ShoppingTextBody = z.object({ text: z.string().min(1).max(5000) });

export const ShoppingItem = z.object({
  productName: z.string().min(1),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  storeSection: z.string().optional(),
  estimatedPrice: z.number().optional(),
  addedVia: z.string().optional(),
  confidence: z.number().optional()
});
export const ShoppingItemsBody = z.object({ items: z.array(ShoppingItem).min(1) });

// Types
export type UrlBodyT = z.infer<typeof UrlBody>;
export type VideoBodyT = z.infer<typeof VideoBody>;
export type TranscribeYoutubeBodyT = z.infer<typeof TranscribeYoutubeBody>;
export type ShoppingTextBodyT = z.infer<typeof ShoppingTextBody>;
export type ShoppingItemsBodyT = z.infer<typeof ShoppingItemsBody>;

// Response DTOs
export const EnhancedRecipe = z.object({
  title: z.string(),
  description: z.string().optional(),
  steps: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export const YoutubeExtractResponse = z.object({
  recipe: EnhancedRecipe,
  source: z.string().url(),
  message: z.string().optional(),
  code: z.string().optional()
});

export const TranscriptionSegment = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  confidence: z.number().optional()
});

export const TranscriptionObject = z.object({
  text: z.string(),
  language: z.string(),
  confidence: z.number().optional(),
  duration: z.number().optional(),
  segments: z.array(TranscriptionSegment).optional(),
  method: z.string().optional()
});

export const TranscribeResponse = z.object({
  transcription: TranscriptionObject,
  source: z.string().url(),
  message: z.string().optional(),
  code: z.string().optional()
});

export type YoutubeExtractResponseT = z.infer<typeof YoutubeExtractResponse>;
export type TranscribeResponseT = z.infer<typeof TranscribeResponse>;

// Instagram responses
export const InstagramOEmbedResponse = z.object({
  oembed: z.object({
    title: z.string().optional(),
    author_name: z.string().optional(),
    provider_name: z.string().optional(),
    thumbnail_url: z.string().url().nullable().optional()
  }),
  source: z.string().url(),
  message: z.string().optional(),
  code: z.string().optional()
});

export const InstagramThumbnailResponse = z.object({
  thumbnail_url: z.string().url().nullable(),
  source: z.string().url(),
  method: z.string().optional(),
  message: z.string().optional(),
  code: z.string().optional()
});

export type InstagramOEmbedResponseT = z.infer<typeof InstagramOEmbedResponse>;
export type InstagramThumbnailResponseT = z.infer<typeof InstagramThumbnailResponse>;
