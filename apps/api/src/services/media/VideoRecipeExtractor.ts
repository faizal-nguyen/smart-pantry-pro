/**
 * Local-video → AI-extracted recipe pipeline.
 *
 * Input  : a video buffer that just landed in `req.file.buffer`
 *           (multipart upload from the UI).
 * Output : a Zod-validated `ImportedRecipeDraft` ready to be persisted
 *           via the existing `saveImportedDraftAsRecipe` (PRP-220.16).
 *
 * Pipeline (synchronous, ~15-30s for an 87s video):
 *   1. ffmpeg strips a 64 kbps mono mp3 audio track (AudioExtractor).
 *   2. OpenAI Whisper transcribes that audio (WhisperTranscriber).
 *   3. GPT-4o-mini receives the transcript + filename caption + the
 *      same system prompt the social-import flow uses, replies with
 *      the structured ImportedRecipeDraft JSON.
 *   4. We shape + Zod-validate + score confidence (mirrors
 *      OpenAIRecipeExtractionService.shapeIntoDraft so a reader of
 *      the resulting recipe row sees the same metadata layout
 *      regardless of capture origin).
 *
 * Failure mode: if Whisper returns an empty transcript (e.g. the
 * video has no narration), the GPT call still runs but with the
 * filename + caption only — confidence will be low and the draft
 * will likely have no instructions, which is exactly the signal the
 * caller needs to surface "we couldn't extract this — fill manually".
 */
import {
  ImportedRecipeDraftSchema,
  type ImportedRecipeDraft,
} from '@smart/shared';

import {
  RECIPE_EXTRACTION_SYSTEM_PROMPT,
  type AICompletionClient,
} from '../imports/RecipeExtractionService.js';
import {
  extractAudioFromVideoBuffer,
  type ExtractAudioOptions,
} from './AudioExtractor.js';
import {
  computeWhisperCostUsd,
  type WhisperClient,
} from './WhisperTranscriber.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const PRICES_PER_M: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4o': { in: 2.5, out: 10 },
};

export interface VideoExtractInput {
  /** Raw video bytes from the multipart upload. */
  videoBuffer: Buffer;
  /** Lowercase extension without the leading dot (e.g. "mp4"). */
  videoExtension: string;
  /** Original filename — fed to GPT as a strong title hint. */
  filename: string;
  /** Duration we already know from ffprobe at upload time. */
  durationSeconds: number;
  /** Optional caption / accompanying text the user pasted. */
  caption?: string;
  /** Public-facing URL of the source if it has one (e.g. an Insta reel). */
  sourceUrl?: string;
  /** ISO-639-1 language hint passed to Whisper. Auto-detect when omitted. */
  language?: string;
}

export interface VideoExtractCost {
  whisperUsd: number;
  llmInputTokens: number;
  llmOutputTokens: number;
  llmUsd: number;
  totalUsd: number;
}

export interface VideoExtractResult {
  draft: ImportedRecipeDraft;
  transcript: string;
  detectedLanguage?: string;
  modelUsed: string;
  durationMs: number;
  cost: VideoExtractCost;
}

export interface VideoRecipeExtractorOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  audioOptions?: ExtractAudioOptions;
}

export class VideoRecipeExtractor {
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(
    private readonly ai: AICompletionClient,
    private readonly whisper: WhisperClient,
    private readonly options: VideoRecipeExtractorOptions = {}
  ) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.temperature = options.temperature ?? 0.2;
    this.maxTokens = options.maxTokens ?? 2048;
  }

  async extract(input: VideoExtractInput): Promise<VideoExtractResult> {
    const start = Date.now();

    // 1. Audio extraction
    const audio = await extractAudioFromVideoBuffer(
      input.videoBuffer,
      input.videoExtension,
      this.options.audioOptions
    );

    let transcript = '';
    let detectedLanguage: string | undefined;
    try {
      // 2. Whisper
      const transcribed = await this.whisper.transcribe({
        audioPath: audio.audioPath,
        language: input.language,
      });
      transcript = transcribed.text.trim();
      detectedLanguage = transcribed.language;
    } finally {
      await audio.cleanup();
    }

    // 3. GPT-4o-mini
    const userMessage = this.buildUserMessage(input, transcript, detectedLanguage);
    const aiResponse = await this.ai.complete({
      model: this.model,
      messages: [
        { role: 'system', content: RECIPE_EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      response_format: { type: 'json_object' },
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(aiResponse.content);
    } catch (err) {
      throw new Error(
        `OpenAI returned non-JSON content (model=${aiResponse.model}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    // 4. Shape + validate + score
    const draftSeed = this.shapeIntoDraft(parsed, input);
    const validated = ImportedRecipeDraftSchema.parse(draftSeed);
    const enriched = this.enrichWithConfidence(validated, transcript);

    const whisperUsd = computeWhisperCostUsd(input.durationSeconds);
    const llmCost = this.computeLlmCost(aiResponse.model || this.model, aiResponse.usage);
    const cost: VideoExtractCost = {
      whisperUsd,
      llmInputTokens: llmCost.inputTokens,
      llmOutputTokens: llmCost.outputTokens,
      llmUsd: llmCost.usd,
      totalUsd: Number((whisperUsd + llmCost.usd).toFixed(6)),
    };

    return {
      draft: enriched,
      transcript,
      detectedLanguage,
      modelUsed: aiResponse.model || this.model,
      durationMs: Date.now() - start,
      cost,
    };
  }

  // ---- helpers ------------------------------------------------------

  private buildUserMessage(
    input: VideoExtractInput,
    transcript: string,
    detectedLanguage?: string
  ): string {
    const parts: string[] = [];
    parts.push('Source: local video upload (personal archive).');
    if (detectedLanguage) parts.push(`Detected language: ${detectedLanguage}`);
    parts.push(`Filename: ${input.filename}`);
    if (input.sourceUrl) parts.push(`Source URL: ${input.sourceUrl}`);
    if (input.caption?.trim()) {
      parts.push('');
      parts.push('Caption / description:');
      parts.push(input.caption.slice(0, 4000));
    }
    if (transcript) {
      parts.push('');
      parts.push('Transcript (auto-generated from the audio):');
      parts.push(transcript.slice(0, 8000));
    } else {
      parts.push('');
      parts.push(
        'Transcript: (empty — the video has no detectable speech). Extract whatever you can from the filename and caption only.'
      );
    }
    return parts.join('\n');
  }

  /** Mirrors OpenAIRecipeExtractionService.shapeIntoDraft for consistency. */
  private shapeIntoDraft(parsed: unknown, input: VideoExtractInput): unknown {
    const obj = (parsed ?? {}) as Record<string, any>;

    const ingredients = Array.isArray(obj.ingredients)
      ? obj.ingredients
          .map((raw: any) => {
            if (!raw || typeof raw !== 'object') return null;
            const name = typeof raw.name === 'string' ? raw.name.trim() : '';
            if (!name) return null;
            const out: any = { name: name.slice(0, 200) };
            if (typeof raw.quantity === 'number' && Number.isFinite(raw.quantity)) {
              out.quantity = Math.max(0, raw.quantity);
            }
            if (typeof raw.unit === 'string' && raw.unit.trim()) out.unit = raw.unit.trim().slice(0, 50);
            if (typeof raw.notes === 'string' && raw.notes.trim()) out.notes = raw.notes.trim().slice(0, 500);
            return out;
          })
          .filter(Boolean)
      : [];

    const instructions = Array.isArray(obj.instructions)
      ? obj.instructions
          .map((raw: any, idx: number) => {
            const description =
              typeof raw?.description === 'string' && raw.description.trim()
                ? raw.description.trim()
                : typeof raw === 'string'
                  ? raw.trim()
                  : '';
            if (!description) return null;
            const step = typeof raw?.step === 'number' && raw.step >= 1 ? raw.step : idx + 1;
            const out: any = { step, description: description.slice(0, 2000) };
            if (typeof raw?.durationSeconds === 'number' && raw.durationSeconds >= 0) {
              out.durationSeconds = Math.round(raw.durationSeconds);
            }
            return out;
          })
          .filter(Boolean)
      : [];

    const tags = Array.isArray(obj.tags)
      ? obj.tags
          .filter((t: any) => typeof t === 'string')
          .map((t: string) => t.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];

    const fallbackTitle = filenameToTitle(input.filename);
    const title =
      (typeof obj.title === 'string' ? obj.title.trim() : '').slice(0, 300) ||
      fallbackTitle;

    return {
      title,
      description:
        typeof obj.description === 'string' ? obj.description.slice(0, 3000) : undefined,
      ingredients,
      instructions,
      prepTimeMinutes: positiveInt(obj.prepTimeMinutes, 1440),
      cookTimeMinutes: positiveInt(obj.cookTimeMinutes, 1440),
      restTimeMinutes: positiveInt(obj.restTimeMinutes, 1440),
      servings: positiveInt(obj.servings, 50),
      cuisineCategory:
        typeof obj.cuisineCategory === 'string' ? obj.cuisineCategory.slice(0, 100) : undefined,
      mealType: typeof obj.mealType === 'string' ? obj.mealType.slice(0, 100) : undefined,
      tags,
      // No imageUrl yet — the future ThumbnailJob (PRP §5.14) will
      // extract a poster frame from the uploaded video and link it
      // back as a derived thumbnail asset.
      imageUrl: undefined,
      confidence: 0,
      extractionWarnings: [],
      source: {
        platform: 'manual',
        sourceUrl: input.sourceUrl ?? `local://${input.filename}`,
        canonicalUrl: undefined,
        authorName: undefined,
        authorHandle: undefined,
        authorUrl: undefined,
        thumbnailUrl: undefined,
        originalTitle: fallbackTitle,
        originalDescription: input.caption,
        importedAt: new Date().toISOString(),
        extractionMethod: 'transcript',
      },
    };
  }

  private enrichWithConfidence(
    draft: ImportedRecipeDraft,
    transcript: string
  ): ImportedRecipeDraft {
    const warnings: string[] = [];
    let score = 0;

    if (draft.title.trim().length > 0) score += 0.15;
    else warnings.push('Titre manquant');

    const ingredientWithQty = draft.ingredients.filter((i) => i.quantity !== undefined).length;
    if (draft.ingredients.length >= 3) score += 0.25;
    else if (draft.ingredients.length > 0) {
      score += 0.1;
      warnings.push("Peu d'ingredients detectes (< 3)");
    } else {
      warnings.push('Aucun ingredient detecte');
    }
    if (draft.ingredients.length > 0) {
      const ratio = ingredientWithQty / draft.ingredients.length;
      if (ratio >= 0.5) score += 0.15;
      else warnings.push('Quantites souvent absentes');
    }

    if (draft.instructions.length >= 2) score += 0.2;
    else if (draft.instructions.length > 0) {
      score += 0.05;
      warnings.push("Peu d'etapes detectees (< 2)");
    } else {
      warnings.push('Aucune etape detectee');
    }

    if (draft.prepTimeMinutes !== undefined || draft.cookTimeMinutes !== undefined) score += 0.1;
    if (draft.servings !== undefined) score += 0.05;

    if (transcript.length === 0) {
      warnings.push('Aucune narration audio detectee — extraction limitee');
    } else if (transcript.length < 200) {
      warnings.push('Transcript audio tres court');
    } else {
      score += 0.1;
    }

    const confidence = Math.max(0, Math.min(1, Number(score.toFixed(3))));
    return { ...draft, confidence, extractionWarnings: warnings };
  }

  private computeLlmCost(
    model: string,
    usage: { prompt_tokens: number; completion_tokens: number }
  ) {
    const price = PRICES_PER_M[model] ?? PRICES_PER_M[DEFAULT_MODEL];
    const usd =
      (usage.prompt_tokens * price.in + usage.completion_tokens * price.out) / 1_000_000;
    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      usd: Number(usd.toFixed(6)),
    };
  }
}

function positiveInt(value: unknown, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const n = Math.round(value);
  if (n < 0) return undefined;
  return n > max ? max : n;
}

function filenameToTitle(filename: string): string {
  const base = filename
    .replace(/\.[a-z0-9]{1,5}$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return base.slice(0, 300) || 'Recette video';
}
