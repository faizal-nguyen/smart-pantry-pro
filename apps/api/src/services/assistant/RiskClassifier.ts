/**
 * PRP-221 J3 — RiskClassifier.
 *
 * Pure function. Given a tool name + parsed args + execution context,
 * returns the *effective* risk tier and an explanation.
 *
 * Source-of-truth design (cf. PRP-221 §3.2 / §6) :
 *   - The LLM never decides the tier. It calls a tool; the server
 *     classifies. The LLM cannot lie its way out of a confirmation.
 *   - Default tier comes from the tool catalog (`TOOL_SPECS`).
 *   - Escalation rules below can ONLY raise the tier — never lower it.
 *
 * Escalation rules :
 *   - add_inventory_items / add_shopping_items / consume_inventory_items
 *     → escalate to 'high' if items.length > 10 (volume = needs explicit
 *     review).
 *   - consume_inventory_items → escalate to 'high' if any inventory_id
 *     resolves to a product the resolver flagged as ambiguous (passed
 *     via ctx.ambiguousInventoryIds).
 *   - update_inventory_item with quantity == 0 → escalate to 'high'
 *     (effectively a delete; user should confirm).
 *   - clear_* → already 'high' but we ensure no de-escalation.
 *
 * Future hooks (not in V1) :
 *   - read_inventory called > 100x in 1 minute → block (DOS pattern).
 *   - Cross-user side-effects (RLS catches but we want a tier signal
 *     before the call).
 */
import type { RiskTier, ToolSpec } from './schemas/tools.js';

export interface RiskClassificationContext {
  /** Tools called so far in this session (for cumulative volume rules). */
  callsInSession?: number;
  /** Inventory rows whose underlying product is ambiguous per ProductResolver. */
  ambiguousInventoryIds?: string[];
}

export interface RiskClassification {
  tier: RiskTier;
  /** Human-readable explanation surfaced in the confirmation card. */
  reason?: string;
  /**
   * Tool whose default tier was overridden (debug / log audit).
   * undefined when no escalation happened.
   */
  escalatedFrom?: RiskTier;
}

const TIER_ORDER: Record<RiskTier, number> = {
  read: 0,
  low: 1,
  medium: 2,
  high: 3,
};

function maxTier(a: RiskTier, b: RiskTier): RiskTier {
  return TIER_ORDER[a] >= TIER_ORDER[b] ? a : b;
}

const VOLUME_ESCALATION_THRESHOLD = 10;

/**
 * Classify a single tool call. `args` MUST already have passed the Zod
 * schema for this tool — the classifier doesn't re-validate.
 */
export function classifyRisk(
  spec: ToolSpec,
  args: unknown,
  context: RiskClassificationContext = {}
): RiskClassification {
  const baseTier = spec.defaultRiskTier;
  const argsObj = (args as Record<string, unknown>) ?? {};

  // Volume escalation : adds + consume with > 10 items
  if (
    (spec.name === 'add_inventory_items' ||
      spec.name === 'add_shopping_items' ||
      spec.name === 'consume_inventory_items') &&
    Array.isArray(argsObj.items) &&
    argsObj.items.length > VOLUME_ESCALATION_THRESHOLD
  ) {
    return {
      tier: maxTier(baseTier, 'high'),
      reason: `Volume élevé (${argsObj.items.length} items) — confirmation requise.`,
      escalatedFrom: baseTier,
    };
  }

  // Ambiguity escalation on consume_inventory_items
  if (
    spec.name === 'consume_inventory_items' &&
    Array.isArray(argsObj.items) &&
    context.ambiguousInventoryIds &&
    context.ambiguousInventoryIds.length > 0
  ) {
    const items = argsObj.items as Array<{ inventory_id?: string }>;
    const hasAmbiguous = items.some(
      (it) =>
        typeof it?.inventory_id === 'string' &&
        context.ambiguousInventoryIds!.includes(it.inventory_id)
    );
    if (hasAmbiguous) {
      return {
        tier: maxTier(baseTier, 'high'),
        reason: 'Inventaire ambigu — choisis lequel avant de décompter.',
        escalatedFrom: baseTier,
      };
    }
  }

  // update_inventory_item with quantity=0 = effectively a delete
  if (
    spec.name === 'update_inventory_item' &&
    typeof argsObj.quantity === 'number' &&
    argsObj.quantity === 0
  ) {
    return {
      tier: maxTier(baseTier, 'high'),
      reason: 'Quantité=0 équivaut à supprimer la ligne — confirme.',
      escalatedFrom: baseTier,
    };
  }

  // clear_inventory_category with sweeping category → already high,
  // but let's surface a clearer reason.
  if (spec.name === 'clear_inventory_category') {
    return {
      tier: 'high',
      reason: `Suppression de toute la catégorie "${argsObj.category ?? ''}".`,
    };
  }

  return { tier: baseTier };
}
