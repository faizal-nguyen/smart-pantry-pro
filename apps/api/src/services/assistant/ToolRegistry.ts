/**
 * PRP-221 J3 — ToolRegistry.
 *
 * Aggregator over the static `TOOL_SPECS` catalog. Provides:
 *   - lookup by name
 *   - parse-with-Zod helper that returns the typed args
 *   - OpenAI function-calling spec generation, optionally filtered by
 *     a whitelist (e.g. `useWhisperGroceryInput` will scope the agent
 *     to add_shopping_items only)
 *
 * Handlers are NOT registered here — they live in J5 (the route layer).
 * This module is pure metadata + validation.
 */
import type { z } from 'zod';

import { TOOL_SPECS, type ToolSpec, type ToolName } from './schemas/tools.js';

export interface OpenAIToolSpec {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class UnknownToolError extends Error {
  constructor(toolName: string) {
    super(`Unknown tool: ${toolName}`);
    this.name = 'UnknownToolError';
  }
}

export class ToolArgsValidationError extends Error {
  constructor(
    readonly toolName: string,
    readonly issues: z.ZodIssue[]
  ) {
    super(
      `Invalid args for tool ${toolName}: ${issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ')}`
    );
    this.name = 'ToolArgsValidationError';
  }
}

export class ToolRegistry {
  private readonly byName: Map<string, ToolSpec>;

  constructor(private readonly specs: readonly ToolSpec[] = TOOL_SPECS) {
    this.byName = new Map(specs.map((s) => [s.name, s]));
    if (this.byName.size !== specs.length) {
      throw new Error('Duplicate tool name in TOOL_SPECS');
    }
  }

  /** All registered tool names (in declaration order). */
  list(): readonly string[] {
    return this.specs.map((s) => s.name);
  }

  has(name: string): boolean {
    return this.byName.has(name);
  }

  get(name: string): ToolSpec {
    const spec = this.byName.get(name);
    if (!spec) throw new UnknownToolError(name);
    return spec;
  }

  /**
   * Parse the LLM-emitted args with the tool's Zod schema. Throws
   * ToolArgsValidationError on failure so the caller can surface a
   * clear error to the LLM (potential dynamic-model escalation per
   * PRP-221 §18 Q4).
   */
  parseArgs<TArgs>(name: string, rawArgs: unknown): TArgs {
    const spec = this.get(name);
    const result = spec.schema.safeParse(rawArgs);
    if (!result.success) {
      throw new ToolArgsValidationError(name, result.error.issues);
    }
    return result.data as TArgs;
  }

  /**
   * Build the OpenAI Chat Completions `tools` array. Optionally
   * restrict to a whitelist of tool names (e.g. when the calling
   * surface only allows shopping list mutations).
   */
  toOpenAITools(allowedNames?: readonly string[]): OpenAIToolSpec[] {
    const allowed = allowedNames ? new Set(allowedNames) : null;
    return this.specs
      .filter((s) => !allowed || allowed.has(s.name))
      .map((s) => ({
        type: 'function' as const,
        function: {
          name: s.name,
          description: s.description,
          parameters: s.jsonSchema,
        },
      }));
  }
}

export const defaultToolRegistry = new ToolRegistry();
export type { ToolSpec, ToolName };
