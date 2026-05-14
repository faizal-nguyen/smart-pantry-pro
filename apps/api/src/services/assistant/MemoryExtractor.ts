/**
 * PRP-223 PR5 — MemoryExtractor (V1 rules-based).
 *
 * Applies the 9 regex patterns of PRP-223 §8.2.5 to a user utterance and
 * emits 0..N memory candidates. Sync + deterministic + cheap. LLM-based
 * extraction is explicitly out of scope V1 — it would arrive as PR8 or
 * later, async best-effort.
 *
 * The orchestrator (VoiceAgentService) calls `extract()` right after
 * recording the user message and then forwards the candidates to
 * `MemoryService.createMemory` / `setSessionContext` via a microtask.
 * A candidate that fails to insert (quota, dup, DB error) is logged
 * and skipped — the response to the user is never blocked.
 */
import type {
  MemoryKind,
  MemoryScope,
  MemorySensitivity,
  MemoryStatus,
} from './MemoryService.js';

export interface MemoryExtractionInput {
  userId: string;
  conversationId?: string | null;
  messageId?: string | null;
  text: string;
  source: 'voice' | 'text' | 'recipe_feedback';
}

export interface MemoryCandidate {
  kind: MemoryKind;
  scope: MemoryScope;
  content: string;
  normalized_content: string;
  confidence: number;
  sensitivity: MemorySensitivity;
  status: MemoryStatus;
  source: 'user_explicit' | 'assistant_inferred' | 'recipe_feedback' | 'imported' | 'system';
  evidence: {
    message_id: string | null;
    quote: string;
    pattern: string;
  };
}

/** Temporary session-context candidate (not stored in memory_items). */
export interface SessionContextCandidate {
  kind: 'session_context';
  key: string;
  value: { quote: string; pattern: string };
  ttlMs: number;
}

export type ExtractionResult =
  | { kind: 'memory'; candidate: MemoryCandidate }
  | { kind: 'session'; candidate: SessionContextCandidate };

interface RuleDef {
  /** Free-form id used in evidence + tests. */
  pattern: string;
  /** Regex applied case-insensitive on the user utterance. Must capture the payload as group 1. */
  regex: RegExp;
  build: (match: RegExpMatchArray) => ExtractionResult | null;
}

const DAY_MS = 24 * 3600 * 1000;

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function takeBeforePunct(text: string): string {
  const trimmed = text.trim();
  const end = trimmed.search(/[.!?;]/);
  if (end < 0) return trimmed;
  return trimmed.slice(0, end).trim();
}

/** PRP-223 §8.2.5 — rules V1. Order matters: stronger patterns first. */
const RULES: RuleDef[] = [
  {
    pattern: 'souviens-toi',
    regex: /souviens[-\s]?toi(?:\s+(?:que|de))?\s+(.{3,300})/iu,
    build: (m) => {
      const payload = takeBeforePunct(m[1]!);
      return {
        kind: 'memory',
        candidate: {
          kind: 'preference',
          scope: 'global',
          content: payload,
          normalized_content: normalise(payload),
          confidence: 0.9,
          sensitivity: 'normal',
          status: 'active',
          source: 'user_explicit',
          evidence: { message_id: null, quote: m[0]!, pattern: 'souviens-toi' },
        },
      };
    },
  },
  {
    pattern: 'rappelle-toi',
    regex: /rappelle[-\s]?toi(?:\s+(?:que|de))?\s+(.{3,300})/iu,
    build: (m) => {
      const payload = takeBeforePunct(m[1]!);
      return {
        kind: 'memory',
        candidate: {
          kind: 'preference',
          scope: 'global',
          content: payload,
          normalized_content: normalise(payload),
          confidence: 0.85,
          sensitivity: 'normal',
          status: 'active',
          source: 'user_explicit',
          evidence: { message_id: null, quote: m[0]!, pattern: 'rappelle-toi' },
        },
      };
    },
  },
  {
    pattern: 'ne me repropose pas',
    regex: /ne me repropose pas\s+(.{2,200})/iu,
    build: (m) => {
      const payload = takeBeforePunct(m[1]!);
      return {
        kind: 'memory',
        candidate: {
          kind: 'negative_preference',
          scope: 'global',
          content: payload,
          normalized_content: normalise(payload),
          confidence: 0.85,
          sensitivity: 'normal',
          status: 'active',
          source: 'user_explicit',
          evidence: { message_id: null, quote: m[0]!, pattern: 'ne-me-repropose-pas' },
        },
      };
    },
  },
  {
    pattern: 'je suis allergique',
    regex: /je suis allergique(?:\s+(?:a|au|aux|à))?\s+(.{2,150})/iu,
    build: (m) => {
      const payload = takeBeforePunct(m[1]!);
      return {
        kind: 'memory',
        candidate: {
          kind: 'constraint',
          scope: 'ingredient',
          content: `allergie : ${payload}`,
          normalized_content: normalise(`allergie ${payload}`),
          confidence: 0.95,
          sensitivity: 'health_sensitive',
          status: 'candidate', // health_sensitive never auto-activates
          source: 'user_explicit',
          evidence: { message_id: null, quote: m[0]!, pattern: 'je-suis-allergique' },
        },
      };
    },
  },
  {
    pattern: 'je suis intolerant',
    regex: /je suis intol[eé]rant[e]?(?:\s+(?:a|au|aux|à\s+la))?\s+(.{2,150})/iu,
    build: (m) => {
      const payload = takeBeforePunct(m[1]!);
      return {
        kind: 'memory',
        candidate: {
          kind: 'constraint',
          scope: 'ingredient',
          content: `intolérance : ${payload}`,
          normalized_content: normalise(`intolerance ${payload}`),
          confidence: 0.9,
          sensitivity: 'health_sensitive',
          status: 'candidate',
          source: 'user_explicit',
          evidence: { message_id: null, quote: m[0]!, pattern: 'je-suis-intolerant' },
        },
      };
    },
  },
  {
    pattern: 'je veux perdre du poids',
    regex: /je veux perdre du poids/iu,
    build: (m) => ({
      kind: 'memory',
      candidate: {
        kind: 'diet_goal',
        scope: 'global',
        content: 'objectif : perte de poids',
        normalized_content: 'objectif perte de poids',
        confidence: 0.8,
        sensitivity: 'health_sensitive',
        status: 'candidate',
        source: 'user_explicit',
        evidence: { message_id: null, quote: m[0]!, pattern: 'je-veux-perdre-du-poids' },
      },
    }),
  },
  {
    pattern: "je n'aime pas",
    regex: /je n['’]?aime pas\s+(.{2,150})/iu,
    build: (m) => {
      const payload = takeBeforePunct(m[1]!);
      return {
        kind: 'memory',
        candidate: {
          kind: 'negative_preference',
          scope: 'ingredient',
          content: payload,
          normalized_content: normalise(payload),
          confidence: 0.7,
          sensitivity: 'normal',
          status: 'candidate',
          source: 'assistant_inferred',
          evidence: { message_id: null, quote: m[0]!, pattern: "je-n'aime-pas" },
        },
      };
    },
  },
  {
    pattern: 'je prefere',
    regex: /je pr[eé]f[eè]re\s+(.{2,200})/iu,
    build: (m) => {
      const payload = takeBeforePunct(m[1]!);
      return {
        kind: 'memory',
        candidate: {
          kind: 'preference',
          scope: 'global',
          content: payload,
          normalized_content: normalise(payload),
          confidence: 0.7,
          sensitivity: 'normal',
          status: 'candidate',
          source: 'assistant_inferred',
          evidence: { message_id: null, quote: m[0]!, pattern: 'je-prefere' },
        },
      };
    },
  },
  {
    pattern: 'ce soir / aujourd hui / maintenant',
    regex: /(ce soir|aujourd['’ ]?hui|maintenant)/iu,
    build: (m) => ({
      kind: 'session',
      candidate: {
        kind: 'session_context',
        key: 'time_window',
        value: { quote: m[0]!, pattern: 'time-window' },
        ttlMs: 12 * 3600 * 1000, // 12h horizon
      },
    }),
  },
];

export class MemoryExtractor {
  /**
   * Run all rules against the input text. Multiple rules may match the
   * same sentence; we keep all unique candidates (dedup is the writer's
   * job via `normalized_content`).
   */
  extract(input: MemoryExtractionInput): ExtractionResult[] {
    if (!input.text || input.text.trim().length === 0) return [];
    const out: ExtractionResult[] = [];
    const seen = new Set<string>();
    for (const rule of RULES) {
      const m = input.text.match(rule.regex);
      if (!m) continue;
      const built = rule.build(m);
      if (!built) continue;
      // Stamp the source message id for traceability.
      if (built.kind === 'memory' && input.messageId) {
        built.candidate.evidence.message_id = input.messageId;
      }
      if (input.source === 'recipe_feedback' && built.kind === 'memory') {
        built.candidate.source = 'recipe_feedback';
      }
      const key =
        built.kind === 'memory'
          ? `m:${built.candidate.kind}:${built.candidate.normalized_content}`
          : `s:${built.candidate.key}:${built.candidate.value.pattern}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(built);
    }
    return out;
  }
}

export const MEMORY_EXTRACTOR_RULES = RULES.map(r => r.pattern);
export const SESSION_CONTEXT_DEFAULT_TTL_MS = 12 * 3600 * 1000;
export const _DAY_MS = DAY_MS; // exported for tests if needed
