import type { MemoryPolicy } from '@smart/shared';
import { recommendationModelContext } from '../recommendations/RecommendationModelContext.js';

const blockedKeys = /^(profile|settings|allergies|excludedIngredients|diets|goals|targets|personal_notes|notes|evidence|transcript|request_text|tool_args|audio_transcript|health|memory_context)$/i;
function redact(value: unknown, share: boolean, depth = 0): unknown {
  if (depth > 8) return null;
  if (Array.isArray(value)) return value.slice(0, 30).map(v => redact(v, share, depth + 1));
  if (!value || typeof value !== 'object') return typeof value === 'string' ? value.slice(0, 800) : value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => share || !blockedKeys.test(key))
    .map(([key, val]) => [key, redact(val, share, depth + 1)]));
}
export function memoryModelToolResult(tool: string, result: unknown, policy: MemoryPolicy | null): unknown {
  const obj = result && typeof result === 'object' ? result as Record<string, unknown> : {};
  if (tool === 'read_user_memories' || tool === 'search_conversation_history') {
    if (!policy || obj.policy_revision !== policy.revision ||
      (tool === 'read_user_memories' ? !policy.memoryEnabled : !policy.saveHistory)) return { status: 'unavailable' };
    return result;
  }
  if (['remember_preference', 'forget_memory', 'update_response_style'].includes(tool))
    return Object.fromEntries(['status', 'destination', 'reason', 'version'].map(k => [k, obj[k]]).filter(([, v]) => v !== undefined));
  const recommendation = recommendationModelContext(result, policy?.shareProfile ? policy.profileVersion : undefined);
  if (recommendation !== null) return recommendation;
  return redact(result, !!policy?.shareProfile);
}
