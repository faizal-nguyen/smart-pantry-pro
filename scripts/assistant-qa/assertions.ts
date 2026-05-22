/**
 * Assistant QA — assertion runner.
 *
 * Pure functions over the API response shape. Designed to never throw —
 * each assertion returns `{ pass, detail }` so the report can list every
 * failure rather than die on the first one.
 */
import type { AssertionResult, QAAssertion, QAFixture } from './fixtures.js';

/**
 * Slim mirror of `AssistantPlanResponse` from the API. We only consume
 * the fields the assertions need, so the runner can stay decoupled
 * from the @smart/shared package.
 */
export interface AssistantApiResponse {
  message: string;
  actions_executed?: Array<{ tool: string }>;
  actions_pending?: Array<{ tool: string }>;
  cost?: { total_usd?: number };
  model_used?: string;
  duration_ms?: number;
}

/** Shorthand used by the chef post-check when it redacts. */
const REDACTED_MARKER = "Je n'ai pas pu produire une réponse conforme à la politique";

/** Off-DB section header the chef prompt instructs the LLM to emit. */
const OFF_DB_HEADER = /id[eé]es?\s+chef\s+hors\s+biblioth[eè]que/i;

/**
 * Run all assertions for a fixture. Always returns the full list.
 */
export function runAssertions(
  fixture: QAFixture,
  response: AssistantApiResponse,
  elapsedMs: number,
): AssertionResult[] {
  const out: AssertionResult[] = [];

  for (const a of fixture.assertions) {
    out.push(runOne(a, response));
  }

  // Always-on safety checks: cost + latency budgets.
  const maxCostUsd = fixture.maxCostUsd ?? 0.05;
  const cost = response.cost?.total_usd ?? 0;
  out.push({
    kind: 'expects_actions_executed', // reused as a tag — separate domain
    description: `Cost ≤ $${maxCostUsd.toFixed(3)}`,
    pass: cost <= maxCostUsd,
    detail: `actual $${cost.toFixed(4)}`,
  });

  const maxLatencyMs = fixture.maxLatencyMs ?? 15000;
  out.push({
    kind: 'expects_actions_executed',
    description: `Latency ≤ ${maxLatencyMs}ms`,
    pass: elapsedMs <= maxLatencyMs,
    detail: `actual ${elapsedMs}ms`,
  });

  return out;
}

function runOne(a: QAAssertion, response: AssistantApiResponse): AssertionResult {
  const executed = (response.actions_executed ?? []).map((x) => x.tool);
  const pending = (response.actions_pending ?? []).map((x) => x.tool);
  const allTools = [...executed, ...pending];
  const message = response.message ?? '';

  switch (a.kind) {
    case 'expects_tool': {
      const pass = allTools.includes(a.tool);
      return {
        kind: a.kind,
        description: `Expects tool "${a.tool}" called`,
        pass,
        detail: pass ? undefined : `actual: [${allTools.join(', ') || '(none)'}]`,
      };
    }

    case 'expects_no_tool': {
      const pass = !allTools.includes(a.tool);
      return {
        kind: a.kind,
        description: `Expects tool "${a.tool}" NOT called`,
        pass,
        detail: pass ? undefined : `tool was called: ${a.tool}`,
      };
    }

    case 'expects_any_tool_from': {
      const pass = a.tools.some((t) => allTools.includes(t));
      return {
        kind: a.kind,
        description: `Expects ANY of: ${a.tools.join(' | ')}`,
        pass,
        detail: pass ? undefined : `actual: [${allTools.join(', ') || '(none)'}]`,
      };
    }

    case 'expects_response_matches_any': {
      const haystack = a.ci ? message.toLowerCase() : message;
      const needles = a.ci ? a.tokens.map((t) => t.toLowerCase()) : a.tokens;
      const hit = needles.find((n) => haystack.includes(n));
      return {
        kind: a.kind,
        description: `Response contains ANY of: [${a.tokens.join(', ')}]`,
        pass: Boolean(hit),
        detail: hit
          ? undefined
          : `none matched in: "${message.slice(0, 140)}${message.length > 140 ? '…' : ''}"`,
      };
    }

    case 'expects_response_does_not_contain': {
      const haystack = a.ci ? message.toLowerCase() : message;
      const needles = a.ci ? a.tokens.map((t) => t.toLowerCase()) : a.tokens;
      const hit = needles.find((n) => haystack.includes(n));
      return {
        kind: a.kind,
        description: `Response does NOT contain: [${a.tokens.join(', ')}]`,
        pass: !hit,
        detail: hit ? `unexpectedly contains "${hit}"` : undefined,
      };
    }

    case 'expects_chef_redacted': {
      const pass = message.includes(REDACTED_MARKER);
      return {
        kind: a.kind,
        description: 'Chef post-check redacted the response',
        pass,
        detail: pass ? undefined : 'no redaction marker found',
      };
    }

    case 'expects_off_db_section': {
      const pass = OFF_DB_HEADER.test(message);
      return {
        kind: a.kind,
        description: 'Response includes "Idées chef hors bibliothèque" section',
        pass,
        detail: pass ? undefined : 'header missing in message',
      };
    }

    case 'expects_pending_actions': {
      const min = a.min ?? 1;
      const pass = pending.length >= min;
      return {
        kind: a.kind,
        description: `Pending actions ≥ ${min}`,
        pass,
        detail: pass ? undefined : `actual: ${pending.length}`,
      };
    }

    case 'expects_no_pending_actions': {
      const pass = pending.length === 0;
      return {
        kind: a.kind,
        description: 'No pending actions',
        pass,
        detail: pass ? undefined : `actual: [${pending.join(', ')}]`,
      };
    }

    case 'expects_actions_executed': {
      const min = a.min ?? 1;
      const pass = executed.length >= min;
      return {
        kind: a.kind,
        description: `Actions executed ≥ ${min}`,
        pass,
        detail: pass ? undefined : `actual: ${executed.length}`,
      };
    }
  }
}
