import { StockCommandSchema, type RecipeReference, type RecipeStockPreview, type StockCommand, type StockCommandResult } from '@smart/shared';
import { ApiError, apiGet, apiPost } from '@/lib/api';
import { dispatchAgentDbChanged, type AgentAffectedTable } from '@/lib/agentEvents';
import { supabase } from '@/integrations/supabase/client';

const owners = new WeakMap<object,string>();
function readSavedCommand(key: string): StockCommand | null {
  let raw: string | null;
  try { raw = localStorage.getItem(key); }
  catch { throw new Error('Impossible de relire l’intention sur cet appareil. Vérifiez le résultat avant de recommencer.'); }
  if (!raw) return null;
  try {
    const parsed = StockCommandSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch { /* Keep an unreadable intention; never silently assign it a new identity. */ }
  throw new Error('Action sauvegardée illisible. Vérifiez son résultat avant de la recommencer.');
}
export function newCommandId(): string { return crypto.randomUUID(); }

export async function previewRecipeStock(recipe: RecipeReference, servings?: number): Promise<RecipeStockPreview> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Reconnectez-vous pour vérifier le stock.');
  const owner = session.user.id;
  const preview = await apiPost<RecipeStockPreview>('/v1/stock/preview', { recipe, ...(servings === undefined ? {} : { servings }) }, { expectedUserId: owner });
  const current = await supabase.auth.getSession();
  if (current.data.session?.user.id !== owner) throw new ApiError('Le compte a changé. Rouvrez cette recette.',{ status: 401, code: 'AUTH_CHANGED' });
  return preview;
}

export async function executeStockCommand(input: StockCommand, expectedOwner?: string): Promise<StockCommandResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const owner = expectedOwner ?? owners.get(input) ?? session?.user.id;
  if (!owner) throw new Error('Reconnectez-vous pour reprendre cette action.');
  const command = StockCommandSchema.parse(input);
  let result: StockCommandResult;
  try {
    result = await apiPost('/v1/stock/commands', command, { expectedUserId: owner });
  } catch (error) {
    // Business rejections guarantee rollback. Network/5xx and auth failures keep the identity.
    if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.code !== 'IDEMPOTENCY_CONFLICT') {
      removeCommandIdentity(owner,command.command_id);
    }
    throw error;
  }
  if (result.status !== 'confirmed' || result.command_id !== command.command_id) throw new Error('Le résultat de cette action reste à vérifier.');
  const current = await supabase.auth.getSession();
  if (current.data.session?.user.id !== owner) throw new ApiError('Le compte a changé. Reconnectez-vous au compte qui a commencé l’action pour en retrouver le résultat.',{ status: 401, code: 'AUTH_CHANGED' });
  dispatchAgentDbChanged(result.affected_tables as AgentAffectedTable[]);
  return result;
}

function removeCommandIdentity(userId: string, commandId: string): void {
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(`v10-command:${userId}:`)) continue;
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
      const parsed = StockCommandSchema.safeParse(saved);
      if (parsed.success && parsed.data.command_id === commandId) localStorage.removeItem(key);
    } catch { /* An unrelated corrupt draft cannot change the result of this command. */ }
  }
}

export async function getStockCommandResult(commandId: string, expectedOwner?: string): Promise<StockCommandResult> {
  const session = await supabase.auth.getSession();
  const owner = expectedOwner ?? session.data.session?.user.id;
  if (!owner || session.data.session?.user.id !== owner) throw new Error('Reconnectez-vous au compte qui a commencé ce repas.');
  const result = await apiGet<StockCommandResult>(`/v1/stock/commands/${commandId}`,undefined,{ expectedUserId: owner });
  const current = await supabase.auth.getSession();
  if (current.data.session?.user.id !== owner) throw new ApiError('Le compte a changé. Reprenez ce repas avec son propriétaire.',{ status:401,code:'AUTH_CHANGED' });
  if (result.status !== 'confirmed' || result.command_id !== commandId) throw new Error('Le résultat de ce repas reste à vérifier.');
  dispatchAgentDbChanged(result.affected_tables as AgentAffectedTable[]);
  return result;
}

export async function undoStockCommand(originalId: string) {
  const command = await commandForIntent('undo_stock',`undo:${originalId}`,{ original_command_id: originalId });
  const result = await executeStockCommand(command);
  await finishIntent(`undo:${originalId}`);
  return result;
}

/** Recover the exact online intention after a lost response, even if the rows have changed. */
export async function pendingIntent(intent: string): Promise<StockCommand | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Reconnectez-vous pour reprendre cette action.');
  const saved = readSavedCommand(`v10-command:${session.user.id}:${intent}`);
  if (saved) owners.set(saved,session.user.id);
  return saved;
}

/** Keeps online intentions across reloads and browser restarts; no offline command is executed. */
export async function commandForIntent<T extends StockCommand['command_type']>(
  kind: T, intent: string, payload: Extract<StockCommand, { command_type: T }>['payload'],
): Promise<Extract<StockCommand, { command_type: T }>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Reconnectez-vous pour reprendre cette action.');
  const owner = session.user.id;
  const key = `v10-command:${owner}:${intent}`;
  const candidate = StockCommandSchema.parse({ command_id: newCommandId(), command_type: kind, payload_version: 1, payload });
  const saved = readSavedCommand(key);
  if (saved) {
    if (saved.command_type !== kind) throw new Error('Une intention sauvegardée reste à vérifier.');
    if (JSON.stringify(saved.payload) !== JSON.stringify(candidate.payload)) {
      throw new Error('Une action précédente reste à vérifier. Reprenez sa saisie avant de créer une nouvelle intention.');
    }
    owners.set(saved,owner);
    return saved as Extract<StockCommand, { command_type: T }>;
  }
  try { localStorage.setItem(key,JSON.stringify(candidate)); }
  catch { throw new Error('Cette intention ne peut pas être conservée sur cet appareil. L’action n’a pas été envoyée.'); }
  owners.set(candidate,owner);
  return candidate as Extract<StockCommand, { command_type: T }>;
}

export async function finishIntent(intent: string, expected?: { owner: string; commandId: string }): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user || (expected && session.user.id !== expected.owner)) return;
  const key = `v10-command:${session.user.id}:${intent}`;
  if (expected && readSavedCommand(key)?.command_id !== expected.commandId) return;
  localStorage.removeItem(key);
}
