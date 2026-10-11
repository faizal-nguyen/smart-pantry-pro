import { classifyMemoryFact, isSensitiveMemoryText, MemoryFactPayloadSchema, normalizeMemoryText,
  type MemoryPolicy, type NutritionProfileSettings } from '@smart/shared';
import type { AssistantMemoryItem, AssistantMessage, AssistantConversationSummary, AssistantSessionContext } from './MemoryService.js';

export type MemoryPurpose = 'personal_ui' | 'deterministic' | 'model_context' | 'model_tool';
export function sameMemoryPolicy(a: MemoryPolicy | null | undefined, b: MemoryPolicy | null | undefined): boolean {
  return !!a && !!b && a.userId === b.userId && a.revision === b.revision &&
    a.memoryEnabled === b.memoryEnabled && a.saveHistory === b.saveHistory &&
    a.shareProfile === b.shareProfile && a.profileVersion === b.profileVersion;
}
export function allowedMemory(row: AssistantMemoryItem, policy: MemoryPolicy, purpose: MemoryPurpose, now = Date.now()): boolean {
  if (row.user_id !== policy.userId || row.status === 'deleted' || row.status === 'rejected') return false;
  if (row.expires_at && (!Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at) <= now)) return false;
  if (purpose === 'personal_ui') return true;
  if (!policy.memoryEnabled || row.status !== 'active' || row.source !== 'user_explicit' ||
    row.sensitivity !== 'normal' || row.destination !== 'memory' || !row.approved_at ||
    !row.version || row.policy_revision == null || row.policy_revision > policy.revision ||
    isSensitiveMemoryText(row.content)) return false;
  const payload = MemoryFactPayloadSchema.safeParse(row.payload);
  if (!payload.success || payload.data.type === 'profile') return false;
  // Reclassification prevents historical/corrupted culinary profile values from
  // becoming a second profile even if their sensitivity column says "normal".
  const fact = classifyMemoryFact(row.content, { explicit: true, kind: row.kind });
  if (!fact || fact.destination !== 'memory') return false;
  if (payload.data.type === 'taste' && (fact.payload.type !== 'taste' || fact.payload.value !== payload.data.value)) return false;
  if (purpose === 'deterministic') return payload.data.type === 'taste';
  return true;
}
export function privateProfileTerms(settings: NutritionProfileSettings | null): string[] {
  if (!settings?.consent) return [];
  return [...settings.allergies, ...settings.excludedIngredients, ...settings.likedIngredients,
    ...settings.avoidedIngredients, ...settings.cuisines, ...settings.equipment,
    ...settings.diets].map(normalizeMemoryText).filter(term => term.length >= 3);
}
export function allowedHistoryText(text: string, policy: MemoryPolicy, privateTerms: string[] = []): boolean {
  const fact = classifyMemoryFact(text);
  // Durable facts come from their canonical source; past dialogue cannot
  // override it, promote a candidate, or revive a forgotten preference.
  if (fact && !['session', 'feedback'].includes(fact.destination)) return false;
  if (fact?.destination !== 'session' && /\b(souviens|retiens|memorise|prefer\w*|aime\w*|habitude\w*|habituellement)\b/.test(normalizeMemoryText(text))) return false;
  if (!policy.shareProfile && (isSensitiveMemoryText(text) ||
    privateTerms.some(term => normalizeMemoryText(text).includes(term)))) return false;
  return true;
}
export function allowedMessage(row: AssistantMessage, policy: MemoryPolicy, terms: string[] = []): boolean {
  if (row.expires_at && (!Number.isFinite(Date.parse(row.expires_at)) || Date.parse(row.expires_at) <= Date.now())) return false;
  if (classifyMemoryFact(row.content)?.destination === 'session' &&
    (!Number.isFinite(Date.parse(row.created_at)) || Date.parse(row.created_at) < Date.now() - 24 * 3600 * 1000)) return false;
  return policy.saveHistory && row.user_id === policy.userId && row.policy_revision === policy.revision &&
    ['user', 'assistant'].includes(row.role) && allowedHistoryText(row.content, policy, terms);
}
export function allowedSummary(row: AssistantConversationSummary, policy: MemoryPolicy, terms: string[] = []): boolean {
  return policy.saveHistory && row.user_id === policy.userId && row.policy_revision === policy.revision &&
    !!row.coverage_hash && row.covered_message_ids.length > 0 && allowedSummaryText(row.summary, policy, terms);
}
export function allowedSummaryText(text: string, policy: MemoryPolicy, terms: string[] = []): boolean {
  return classifyMemoryFact(text)?.destination !== 'session' && allowedHistoryText(text, policy, terms);
}
export function allowedSession(row: AssistantSessionContext, policy: MemoryPolicy, conversationId: string, terms: string[] = []): boolean {
  return policy.saveHistory && row.user_id === policy.userId && row.conversation_id === conversationId &&
    row.policy_revision === policy.revision && Date.parse(row.expires_at) > Date.now() &&
    allowedHistoryText(JSON.stringify(row.value), policy, terms);
}
export function modelMemoryView(row: AssistantMemoryItem) {
  return { id: row.id, version: row.version, destination: row.destination, source: row.source,
    content: row.content, expires_at: row.expires_at };
}
