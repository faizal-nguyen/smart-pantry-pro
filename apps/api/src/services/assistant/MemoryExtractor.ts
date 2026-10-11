import { classifyMemoryFact, normalizeMemoryText, type ClassifiedMemoryFact } from '@smart/shared';
import type { MemoryKind, MemoryScope, MemorySensitivity, MemoryStatus } from './MemoryService.js';

export interface MemoryExtractionInput {
  userId: string; conversationId?: string | null; messageId?: string | null;
  text: string; source: 'voice' | 'text' | 'recipe_feedback';
}
export interface MemoryCandidate {
  kind: MemoryKind; scope: MemoryScope; content: string; normalized_content: string;
  confidence: number; sensitivity: MemorySensitivity; status: MemoryStatus;
  source: 'user_explicit' | 'assistant_inferred';
  evidence: { message_id: string | null; pattern: string; channel: 'text' | 'voice' | 'manual' };
  fact: ClassifiedMemoryFact;
}
export interface SessionContextCandidate {
  kind: 'session_context'; key: string; value: { text: string; pattern: string }; ttlMs: number;
}
export type ExtractionResult = { kind: 'memory'; candidate: MemoryCandidate } | { kind: 'session'; candidate: SessionContextCandidate };

/** Only the current voluntary input is extracted. Historical text is never replayed. */
export class MemoryExtractor {
  extract(input: MemoryExtractionInput): ExtractionResult[] {
    const results = new Map<string, ExtractionResult>();
    for (const text of input.text.split(/[.;\n]+/).map(v => v.trim()).filter(Boolean).slice(0, 8)) {
      const fact = classifyMemoryFact(text);
      if (!fact || fact.destination === 'feedback') continue;
      if (fact.destination === 'session') {
        results.set('session:meal_context', { kind: 'session', candidate: {
          kind: 'session_context', key: 'meal_context', value: { text, pattern: fact.pattern }, ttlMs: 24 * 3600 * 1000,
        } });
      } else {
        results.set(fact.destination + ':' + fact.semanticSubject, { kind: 'memory', candidate: {
          kind: fact.kind, scope: 'global', content: text, normalized_content: normalizeMemoryText(text),
          confidence: fact.source === 'user_explicit' ? 1 : 0.7, sensitivity: fact.sensitivity,
          status: fact.status, source: fact.source, fact,
          evidence: { message_id: input.messageId ?? null, pattern: fact.pattern,
            channel: input.source === 'recipe_feedback' ? 'manual' : input.source },
        } });
      }
    }
    return [...results.values()];
  }
}
