/**
 * OpenAI-backed implementation of the RecipeExtractionService contract
 * (PRP-220.11 interface, PRP-220.13 implementation).
 *
 * Pipeline:
 *   import row -> platform adapter -> PlatformContext
 *               -> system prompt + user payload
 *               -> OpenAI chat completion in JSON mode
 *               -> Zod-validated ImportedRecipeDraft
 *               -> confidence + warnings + cost
 *
 * The OpenAI client is injected (not constructed inline) so unit
 * tests can swap a mock and so PRP-220.15 can wrap it with a rate-
 * limiting / observability layer without touching this file.
 */
import {
  ImportedRecipeDraftSchema,
  type ImportedRecipeDraft,
  type SocialPlatform,
} from '@smart/shared';

import type { SocialImportRow } from './SocialImportRepository.js';
import type {
  ExtractionRequest,
  ExtractionResult,
  RecipeExtractionService,
} from './extractionContract.js';
import {
  findAdapter,
  type PlatformAdapter,
  type PlatformContext,
} from './platforms/types.js';

// ---- AI client contract ---------------------------------------------

/**
 * Minimal subset of the OpenAI SDK's chat completion shape we depend
 * on. Keeping it narrow lets tests mock with a one-liner and lets a
 * future swap to another provider (Anthropic, Mistral, ...) reuse the
 * same orchestration.
 */
export interface AICompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AICompletionRequest {
  model: string;
  messages: AICompletionMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

export interface AICompletionResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface AICompletionClient {
  complete(req: AICompletionRequest): Promise<AICompletionResponse>;
}

// ---- Cost table (USD per 1M tokens) ---------------------------------

const PRICES_PER_M: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4-turbo': { in: 10, out: 30 },
};

const DEFAULT_MODEL = 'gpt-4o-mini';

// ---- Prompt ---------------------------------------------------------

export const RECIPE_EXTRACTION_SYSTEM_PROMPT = `Tu es un expert en extraction de recettes a partir de contenu social (Instagram, TikTok, YouTube, blogs, sites web).

Reponds UNIQUEMENT en JSON valide avec cette structure :

{
  "title": string,
  "description"?: string,
  "ingredients": [{ "name": string, "quantity"?: number, "unit"?: string, "notes"?: string }],
  "instructions": [{ "step": number, "description": string, "durationSeconds"?: number }],
  "prepTimeMinutes"?: number,
  "cookTimeMinutes"?: number,
  "servings"?: number,
  "tags": string[],
  "cuisineCategory"?: string,
  "mealType"?: string
}

REGLES :
- Si une information n'est pas explicitement dans le texte, OMET le champ.
- N'INVENTE rien. Ne fais pas de suppositions.
- Si le contenu n'est manifestement pas une recette, retourne { "title": "", "ingredients": [], "instructions": [], "tags": [] }.
- Reponds dans la langue dominante du contenu (FR si FR, EN si EN, etc.).
- Quantites en nombres decimaux (0.5 plutot que "1/2").
- Unites en abregees standard (g, kg, ml, l, c.s., c.c., tasse).
- "step" est 1-indexed et incrementiel.`;

// ---- Confidence (mirror of client/helpers/confidence.ts) ------------

interface ConfidenceInput {
  hasTitle: boolean;
  ingredientCount: number;
  ingredientWithQuantityCount: number;
  instructionCount: number;
  hasImage: boolean;
  hasTimes: boolean;
  hasServings: boolean;
  hasOversizedIngredient: boolean;
  extractionMethod: PlatformContext['extractionMethod'];
}

function computeConfidence(input: ConfidenceInput): { confidence: number; warnings: string[] } {
  const warnings: string[] = [];
  let score = 0;

  if (input.hasTitle) score += 0.15;
  else warnings.push('Titre manquant');

  if (input.ingredientCount >= 3) score += 0.25;
  else if (input.ingredientCount > 0) {
    score += 0.1;
    warnings.push("Peu d'ingredients detectes (< 3)");
  } else {
    warnings.push('Aucun ingredient detecte');
  }

  if (input.ingredientCount > 0) {
    const ratio = input.ingredientWithQuantityCount / input.ingredientCount;
    if (ratio >= 0.5) score += 0.15;
    else warnings.push('Quantites souvent absentes');
  }

  if (input.instructionCount >= 2) score += 0.2;
  else if (input.instructionCount > 0) {
    score += 0.05;
    warnings.push('Peu d\'etapes detectees (< 2)');
  } else {
    warnings.push('Aucune etape detectee');
  }

  if (input.hasImage) score += 0.05;
  if (input.hasTimes) score += 0.1;
  if (input.hasServings) score += 0.05;

  if (input.hasOversizedIngredient) {
    score -= 0.1;
    warnings.push('Un ingredient semble suspicieusement long');
  }

  // Method ceiling: pure metadata cannot reach high confidence.
  const ceiling =
    input.extractionMethod === 'oembed' || input.extractionMethod === 'metadata' ? 0.6 : 1;
  if (score > ceiling) {
    score = ceiling;
    warnings.push('Extraction basee sur metadonnees seulement');
  }

  const confidence = Math.max(0, Math.min(1, Number(score.toFixed(3))));
  return { confidence, warnings };
}

// ---- Service --------------------------------------------------------

export interface OpenAIRecipeExtractionServiceOptions {
  model?: string;
  /** Override the default temperature (kept low to discourage hallucination). */
  temperature?: number;
  /** Override the default max tokens. */
  maxTokens?: number;
}

export class OpenAIRecipeExtractionService implements RecipeExtractionService {
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(
    private readonly adapters: readonly PlatformAdapter[],
    private readonly ai: AICompletionClient,
    options: OpenAIRecipeExtractionServiceOptions = {}
  ) {
    this.model = options.model ?? DEFAULT_MODEL;
    this.temperature = options.temperature ?? 0.2;
    this.maxTokens = options.maxTokens ?? 2048;
  }

  async extract(imp: SocialImportRow, opts: ExtractionRequest = {}): Promise<ExtractionResult> {
    const adapter = findAdapter(imp.source_url, this.adapters);
    if (!adapter) {
      throw new Error(`No platform adapter for URL: ${imp.source_url}`);
    }

    const context = await adapter.fetchContext(imp.source_url);
    // Seed the context with metadata that may already be on the import
    // row (e.g. captured by a previous oEmbed call).
    if (!context.metadata.title && imp.title) context.metadata.title = imp.title;
    if (!context.metadata.authorName && imp.author_name) {
      context.metadata.authorName = imp.author_name;
    }
    if (!context.metadata.authorHandle && imp.author_handle) {
      context.metadata.authorHandle = imp.author_handle;
    }
    if (!context.metadata.thumbnailUrl && imp.thumbnail_url) {
      context.metadata.thumbnailUrl = imp.thumbnail_url;
    }

    const start = Date.now();
    const userMessage = this.buildUserMessage(context, opts.hint);

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

    const draft = this.shapeIntoDraft(parsed, context);
    const validated = ImportedRecipeDraftSchema.parse(draft);
    const enriched = this.enrichWithConfidence(validated, context);

    return {
      draft: enriched,
      modelUsed: aiResponse.model || this.model,
      durationMs: Date.now() - start,
      cost: this.computeCost(aiResponse.model || this.model, aiResponse.usage),
    };
  }

  // ---- helpers ------------------------------------------------------

  private buildUserMessage(ctx: PlatformContext, hint?: string): string {
    const parts: string[] = [];
    parts.push(`Source platform: ${ctx.platform}`);
    parts.push(`Source URL: ${ctx.sourceUrl}`);
    if (ctx.metadata.title) parts.push(`Title: ${ctx.metadata.title}`);
    if (ctx.metadata.authorName) parts.push(`Author: ${ctx.metadata.authorName}`);
    if (ctx.metadata.description) {
      parts.push('');
      parts.push('Description / Caption:');
      parts.push(ctx.metadata.description.slice(0, 4000));
    }
    if (ctx.transcript) {
      parts.push('');
      parts.push('Transcript:');
      parts.push(ctx.transcript.slice(0, 6000));
    }
    if (ctx.rawText) {
      parts.push('');
      parts.push('Page text:');
      parts.push(ctx.rawText.slice(0, 6000));
    }
    if (hint) {
      parts.push('');
      parts.push(`User hint: ${hint.slice(0, 1000)}`);
    }
    return parts.join('\n');
  }

  /** Defensive normalisation of the AI JSON before Zod validation. */
  private shapeIntoDraft(input: unknown, ctx: PlatformContext): unknown {
    const obj = (input ?? {}) as Record<string, any>;

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

    return {
      title: (typeof obj.title === 'string' ? obj.title.trim() : '').slice(0, 300) ||
        (ctx.metadata.title?.slice(0, 300) ?? 'Recette importee'),
      description: typeof obj.description === 'string' ? obj.description.slice(0, 3000) : undefined,
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
      imageUrl: ctx.metadata.thumbnailUrl,
      // Confidence is overwritten by enrichWithConfidence below, but
      // the schema requires the field to be present pre-parse.
      confidence: 0,
      extractionWarnings: [],
      source: {
        platform: ctx.platform,
        sourceUrl: ctx.sourceUrl,
        canonicalUrl: ctx.canonicalUrl,
        authorName: ctx.metadata.authorName,
        authorHandle: ctx.metadata.authorHandle,
        authorUrl: ctx.metadata.authorUrl,
        thumbnailUrl: ctx.metadata.thumbnailUrl,
        originalTitle: ctx.metadata.title,
        originalDescription: ctx.metadata.description,
        importedAt: new Date().toISOString(),
        extractionMethod: ctx.extractionMethod,
      },
    };
  }

  private enrichWithConfidence(
    draft: ImportedRecipeDraft,
    ctx: PlatformContext
  ): ImportedRecipeDraft {
    const ingredientWithQuantityCount = draft.ingredients.filter((i) => i.quantity !== undefined).length;
    const hasOversizedIngredient = draft.ingredients.some((i) => i.name.length > 150);
    const { confidence, warnings } = computeConfidence({
      hasTitle: draft.title.trim().length > 0,
      ingredientCount: draft.ingredients.length,
      ingredientWithQuantityCount,
      instructionCount: draft.instructions.length,
      hasImage: !!draft.imageUrl,
      hasTimes: draft.prepTimeMinutes !== undefined || draft.cookTimeMinutes !== undefined,
      hasServings: draft.servings !== undefined,
      hasOversizedIngredient,
      extractionMethod: ctx.extractionMethod,
    });
    return { ...draft, confidence, extractionWarnings: warnings };
  }

  private computeCost(
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

// ---- Default OpenAI-backed AICompletionClient -----------------------

/**
 * Build a thin AICompletionClient that wraps the official `openai`
 * SDK (v4). Reads OPENAI_API_KEY at first call so a missing key does
 * not block module import; the failure surfaces as
 * `EXTRACTION_FAILED` with a clear message.
 */
export function createOpenAICompletionClient(): AICompletionClient {
  let cachedClient: any = null;
  return {
    async complete(req: AICompletionRequest): Promise<AICompletionResponse> {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set on the server.');
      }
      if (!cachedClient) {
        const mod = await import('openai');
        const OpenAI = (mod as any).default ?? (mod as any).OpenAI ?? mod;
        cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }
      const response = await cachedClient.chat.completions.create({
        model: req.model,
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        response_format: req.response_format,
      });
      const content = response.choices?.[0]?.message?.content ?? '';
      const usage = response.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
      return {
        content,
        model: response.model ?? req.model,
        usage: {
          prompt_tokens: usage.prompt_tokens ?? 0,
          completion_tokens: usage.completion_tokens ?? 0,
        },
      };
    },
  };
}

export type { SocialPlatform };
