import type { ModelCallReceipt } from '@smart/shared';
import type { AICompletionResponse } from '../imports/RecipeExtractionService.js';
export const PRICING_VERSION = 'openai-text-standard-usd-2026-10-11';
export const PRICING_METADATA = Object.freeze({
  effectiveDate: '2026-10-11', currency: 'USD', unit: 'million_tokens', mode: 'standard_short_context',
  sources: [
    'https://developers.openai.com/api/docs/models/gpt-4o-mini',
    'https://developers.openai.com/api/docs/models/gpt-4o',
    'https://developers.openai.com/api/docs/models/gpt-6-luna',
    'https://developers.openai.com/api/docs/models/gpt-6.1-sol',
    'https://developers.openai.com/api/docs/guides/prompt-caching',
  ],
});
/** Only explicitly documented aliases/snapshots. No prefix guessing or mini fallback. */
export const TEXT_PRICES: Record<string, { input: number; cached: number; output: number; cacheWrite?: number }> = {
  'gpt-4o-mini': { input: 0.15, cached: 0.075, output: 0.6 },
  'gpt-4o-mini-2024-07-18': { input: 0.15, cached: 0.075, output: 0.6 },
  'gpt-4o': { input: 2.5, cached: 1.25, output: 10 },
  'gpt-4o-2024-08-06': { input: 2.5, cached: 1.25, output: 10 },
  'gpt-4o-2024-11-20': { input: 2.5, cached: 1.25, output: 10 },
  'gpt-6-luna': { input: 0.1, cached: 0.01, cacheWrite: 0.125, output: 0.5 },
  'gpt-6.1-sol': { input: 2, cached: 0.1, cacheWrite: 2.5, output: 10 },
};
Object.values(TEXT_PRICES).forEach(Object.freeze);
Object.freeze(TEXT_PRICES);
export function measureCost(result: AICompletionResponse): Pick<ModelCallReceipt,'usd'|'quality'|'reason'> {
  const price = Object.prototype.hasOwnProperty.call(TEXT_PRICES,result.model) ? TEXT_PRICES[result.model] : undefined;
  if (!price) return { usd: null, quality: 'unknown', reason: 'unrecognized_served_model' };
  const u = result.usage;
  if (result.usageKnown === false || !u || ![u.prompt_tokens,u.completion_tokens,u.cached_tokens ?? 0,u.cache_write_tokens ?? 0,u.reasoning_tokens ?? 0].every(n=>Number.isInteger(n)&&n>=0) ||
      (u.cached_tokens ?? 0)+(u.cache_write_tokens ?? 0) > u.prompt_tokens || (u.reasoning_tokens ?? 0) > u.completion_tokens) return { usd:null, quality:'unknown', reason:'usage_absent_or_invalid' };
  if (result.serviceTier && result.serviceTier !== 'default') return { usd:null, quality:'unknown', reason:'unpriced_service_tier' };
  if (u.prompt_tokens > 272000) return { usd:null, quality:'unknown', reason:'long_context_not_priced' };
  // Reasoning is already inside completion_tokens; cached tokens are inside prompt_tokens.
  const usd = ((u.prompt_tokens-(u.cached_tokens ?? 0)-(u.cache_write_tokens ?? 0))*price.input+(u.cached_tokens ?? 0)*price.cached+(u.cache_write_tokens ?? 0)*(price.cacheWrite ?? price.input)+u.completion_tokens*price.output)/1000000;
  const missingWrites=price.cacheWrite!==undefined && u.cache_write_tokens===undefined;
  const missingReads=u.cached_tokens===undefined;
  return { usd, quality: missingWrites||missingReads ? 'estimated' : 'known',
    reason: missingWrites ? 'cache_write_usage_not_exposed' : missingReads ? 'cache_read_usage_not_exposed' : null };
}
export function maximumCallCost(model: string, inputBytes: number, maxOutput: number): number {
  const price = Object.prototype.hasOwnProperty.call(TEXT_PRICES,model) ? TEXT_PRICES[model] : undefined;
  if (!price) throw new Error('MODEL_PRICE_UNKNOWN');
  return ((inputBytes+4096)*Math.max(price.input,price.cacheWrite ?? 0)+maxOutput*price.output)/1000000;
}
