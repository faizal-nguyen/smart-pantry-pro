/**
 * PRP-221 Sprint 1 — UI cache invalidation after agent writes.
 *
 * The voice agent writes directly to Supabase (shopping_list, inventory,
 * recipes, meal_plan_entries, cooking_journal) but custom hooks like
 * useShoppingList / useInventory / useRecipes use useState + manual
 * fetch (not React Query), so they don't auto-invalidate on writes from
 * another surface.
 *
 * This module ties the gap with a tiny custom event :
 *   - the agent's result handler calls dispatchAgentDbChanged(tables)
 *     after a /voice or /text round-trip succeeds (or after a confirm
 *     or undo).
 *   - hooks subscribe via useAgentDbInvalidation('shopping_list', refetch).
 *     If the dispatched event mentions any of their watched tables,
 *     they refetch.
 *
 * PRP-233 PR4 — this is the **invalidation bridge for agent writes**.
 * Do NOT replace it with a second event bus or swap to a generic
 * pub/sub. The `AssistantProvider` calls `dispatchAgentDbChanged()`
 * after every successful tool execution; downstream consumers
 * (`useInventory`, `useShoppingList`, `useRecipes`, `useUserRecipes`,
 * `useFoodWaste`) subscribe via `useAgentDbInvalidation()`. Adding a
 * new write tool means appending it to `TOOL_TABLES` below and adding
 * its target table(s) to `AgentAffectedTable`.
 */
import { useEffect } from 'react';

export type AgentAffectedTable =
  | 'shopping_list'
  | 'inventory'
  | 'recipes'
  | 'recipe_ingredients'
  | 'meal_plan_entries'
  | 'weekly_meal_plans'
  | 'products'
  // PRP-233 PR4 — added so `record_recipe_feedback` (PRP-223 PR5/PR7)
  // can invalidate `useCookingJournal` consumers.
  | 'cooking_journal'
  // PRP-233 PR4 — assistant memory writes (remember_preference,
  // forget_memory, update_response_style) so the MemoryPanel refetches.
  | 'assistant_memory_items'
  | 'assistant_conversations'
  | 'assistant_messages';

export const AGENT_DB_CHANGED_EVENT = 'agent:db-changed';

interface AgentDbChangedDetail {
  tables: AgentAffectedTable[];
}

/**
 * Map of tool name → tables it affects. The orchestrator writes to
 * `assistant_action_log`, but hooks don't care about that. This is the
 * downstream domain effect.
 */
const TOOL_TABLES: Record<string, AgentAffectedTable[]> = {
  // Reads — no invalidation needed
  read_inventory: [],
  read_shopping_list: [],
  read_recent_recipes: [],
  read_meal_plan: [],
  find_cookable_recipes: [],
  search_recipes: [],

  // Writes
  add_inventory_items: ['inventory', 'products'],
  add_shopping_items: ['shopping_list', 'products'],
  mark_shopping_items_bought: ['shopping_list'],
  unmark_shopping_items_bought: ['shopping_list'],
  add_recipe_to_meal_plan: ['meal_plan_entries', 'weekly_meal_plans'],
  consume_inventory_items: ['inventory'],
  update_inventory_item: ['inventory'],
  remove_shopping_items: ['shopping_list'],

  delete_recipe: ['recipes', 'recipe_ingredients'],
  clear_shopping_list: ['shopping_list'],
  clear_inventory_category: ['inventory'],
  import_recipe_from_url: ['recipes', 'recipe_ingredients'],

  // PRP-233 PR4 — assistant memory writes (PRP-223 PR5/PR7).
  remember_preference: ['assistant_memory_items'],
  forget_memory: ['assistant_memory_items'],
  update_response_style: ['assistant_memory_items'],
  record_recipe_feedback: ['cooking_journal'],

  // Meta — ask_clarification + summarize_session don't write
  ask_clarification: [],
  summarize_session: [],
  undo_action: [
    // Undo's actual effect depends on the inverse tool — we err on the
    // side of broad invalidation since undo can target anything.
    'inventory',
    'shopping_list',
    'recipes',
    'recipe_ingredients',
    'meal_plan_entries',
  ],

  // Internal handlers (only invoked through reversible_action)
  _remove_inventory_items: ['inventory'],
  _restore_inventory_quantities: ['inventory'],
  _restore_inventory_item_snapshot: ['inventory'],
  _restore_shopping_items: ['shopping_list'],
  _remove_meal_plan_entries: ['meal_plan_entries'],
};

export function tablesForTool(tool: string): AgentAffectedTable[] {
  return TOOL_TABLES[tool] ?? [];
}

/** Dispatched by AssistantProvider whenever an action mutates state. */
export function dispatchAgentDbChanged(tables: AgentAffectedTable[]): void {
  if (tables.length === 0) return;
  const unique = Array.from(new Set(tables));
  window.dispatchEvent(
    new CustomEvent<AgentDbChangedDetail>(AGENT_DB_CHANGED_EVENT, {
      detail: { tables: unique },
    })
  );
}

/**
 * Hook for data hooks (useInventory, useShoppingList, …) to refetch
 * when the agent has touched any of `watchedTables`. Pass the existing
 * refetch closure; this hook just wires the event listener.
 */
export function useAgentDbInvalidation(
  watchedTables: readonly AgentAffectedTable[],
  refetch: () => unknown
): void {
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AgentDbChangedDetail>).detail;
      if (!detail?.tables) return;
      const overlap = detail.tables.some((t) => watchedTables.includes(t));
      if (overlap) {
        try {
          const result = refetch();
          if (result instanceof Promise) {
            void result.catch(() => undefined);
          }
        } catch {
          /* refetch is best-effort; failures are not fatal */
        }
      }
    };
    window.addEventListener(AGENT_DB_CHANGED_EVENT, handler);
    return () => window.removeEventListener(AGENT_DB_CHANGED_EVENT, handler);
    // refetch closures are typically stable, but capture by value via deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedTables.join('|'), refetch]);
}
