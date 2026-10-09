import { z } from 'zod';
import { CookingAdjustmentsSchema, RecipeReferenceSchema, StockCommandSchema, type RecipeStockPreview, type StockCommandResult } from '@smart/shared';
import { readOwnedValue, writeOwnedValue } from '@/lib/ownedStorage';
import { executeStockCommand, getStockCommandResult, previewRecipeStock, pendingIntent, finishIntent } from './stockCommands';
import { supabase } from '@/integrations/supabase/client';
import { ApiError } from '@/lib/api';
const IngredientSchema = z.object({ ingredient_name:z.string(),quantity:z.number().nullable().optional(),unit:z.string().nullable().optional(),inventory_product_id:z.string().nullable().optional(),is_essential:z.boolean().optional() });
export const CookingSessionSchema = z.object({
  id:z.string().uuid(),owner:z.string().uuid(),recipe:RecipeReferenceSchema,name:z.string(),
  base_servings:z.number().positive(),ingredients:z.array(IngredientSchema),steps:z.array(z.string()),recipe_version:z.string(),
  servings:z.number().positive().max(100),step:z.number().int().nonnegative(),
  state:z.enum(['prepared','in_progress','review','pending','done','error','abandoned']),
  timers:z.array(z.object({ id:z.string().uuid(),step:z.number().int().nonnegative(),duration_ms:z.number().positive(),ends_at:z.number().nullable(),remaining_ms:z.number().nonnegative() })),
  adjustments:CookingAdjustmentsSchema,outside_inventory:z.array(z.number().int().nonnegative()),
  command:StockCommandSchema.nullable(),journal_id:z.string().nullable(),error:z.string().nullable(),
  created_at:z.string(),updated_at:z.string(),
});
export type CookingSession = z.infer<typeof CookingSessionSchema>;
export function readCookingSessions(owner: string): CookingSession[] {
  const saved = z.array(CookingSessionSchema).parse(readOwnedValue(owner,'cooking-sessions',[]));
  if (saved.some(session => session.owner !== owner)) throw new Error('Cette progression appartient à un autre compte.');
  return saved;
}
export function saveCookingSession(owner: string, session: CookingSession): CookingSession {
  const valid = CookingSessionSchema.parse(session);
  if (valid.owner !== owner) throw new Error('Cette progression appartient à un autre compte.');
  const sessions = readCookingSessions(owner), next = { ...valid,updated_at:new Date().toISOString() };
  writeOwnedValue(owner,'cooking-sessions',[next,...sessions.filter(item => item.id !== next.id)]);
  return next;
}
export function patchCookingSession(owner: string,id:string,patch:Partial<CookingSession>): CookingSession {
  const previous = readCookingSessions(owner).find(item => item.id === id);
  if (!previous) throw new Error('Session introuvable sur cet appareil.');
  if (previous.state === 'pending' && Object.keys(patch).some(key => !['state','error','journal_id'].includes(key))) throw new Error('Vérifiez la confirmation envoyée avant de modifier les ingrédients.');
  return saveCookingSession(owner,{ ...previous,...patch,id:previous.id,owner });
}
async function requireOwner(owner: string) {
  if ((await supabase.auth.getSession()).data.session?.user.id !== owner) throw new Error('Reconnectez-vous au compte qui a commencé ce repas.');
}
export function instructionSteps(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item):item is string => typeof item === 'string' && !!item.trim());
  if (typeof value !== 'string') return [];
  try { const parsed: unknown = JSON.parse(value); if (Array.isArray(parsed)) return instructionSteps(parsed); } catch { /* Plain text */ }
  return value.split(/\n+/).map(item => item.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean);
}
export async function startCookingSession(owner: string,recipe: z.infer<typeof RecipeReferenceSchema>,steps: string[],servings?: number): Promise<CookingSession> {
  await requireOwner(owner);
  const previous = readCookingSessions(owner).find(item => item.recipe.id === recipe.id && !['done','abandoned'].includes(item.state));
  if (previous) return previous;
  const preview = await previewRecipeStock(recipe,servings);
  await requireOwner(owner);
  // A pre-V10-02 confirmation awaiting its reply keeps the original command.
  const legacy = await pendingIntent(`recipe:${recipe.id}:cooked`);
  const now = new Date().toISOString();
  return saveCookingSession(owner,{
    id:crypto.randomUUID(),owner,recipe:{ id:preview.recipe.id,source:preview.recipe.source },name:preview.recipe.name,
    base_servings:preview.recipe.servings,ingredients:preview.recipe.ingredients,steps,recipe_version:preview.recipe.version,
    servings:legacy?.command_type === 'consume_recipe' ? legacy.payload.servings : preview.servings,step:0,
    state:legacy ? 'pending' : 'prepared',timers:[],adjustments:[],outside_inventory:[],command:legacy,journal_id:null,error:null,created_at:now,updated_at:now,
  });
}
export function timerRemaining(timer: CookingSession['timers'][number],now=Date.now()): number {
  return timer.ends_at == null ? timer.remaining_ms : Math.min(timer.duration_ms,Math.max(0,timer.ends_at-now));
}
export async function recoverCookingConfirmation(owner: string,id:string): Promise<CookingSession> {
  const session = readCookingSessions(owner).find(item => item.id === id);
  if (!session?.command) throw new Error('Aucune confirmation envoyée à vérifier.');
  const result = await getStockCommandResult(session.command.command_id,owner);
  return complete(owner,session,result);
}
async function complete(owner: string,session:CookingSession,result:StockCommandResult): Promise<CookingSession> {
  if (result.command_type !== 'consume_recipe' || !result.journal_id) throw new Error('Le repas reste à vérifier sur le serveur.');
  const done = patchCookingSession(owner,session.id,{ state:'done',journal_id:result.journal_id,error:null });
  await finishIntent(`recipe:${session.recipe.id}:cooked`, { owner,commandId:session.command!.command_id });
  return done;
}
/** A missing receipt is not a rollback guarantee; resend only the saved, identical command. */
export async function confirmCookingSession(owner:string,id:string,preview?:RecipeStockPreview): Promise<CookingSession> {
  await requireOwner(owner);
  let session = readCookingSessions(owner).find(item => item.id === id);
  if (!session) throw new Error('Session introuvable.');
  if (session.state === 'done') return session;
  if (session.state === 'abandoned') throw new Error('Cette cuisine a été abandonnée.');
  if (session.command) {
    try { return await recoverCookingConfirmation(owner,id); }
    catch (error) { if (!(error instanceof ApiError) || error.status !== 404) throw error; }
  } else {
    if (!preview || preview.recipe.version !== session.recipe_version || preview.servings !== session.servings) throw new Error('La recette a changé. Relisez les ingrédients avant de confirmer.');
    const command = StockCommandSchema.parse({ command_id:crypto.randomUUID(),command_type:'consume_recipe',payload_version:1,
      payload:{ recipe:session.recipe,servings:session.servings,recipe_version:session.recipe_version,outside_inventory:session.outside_inventory,adjustments:session.adjustments } });
    session = saveCookingSession(owner,{ ...session,state:'pending',command,error:null });
  }
  try {
    const result = await executeStockCommand(session.command!,owner);
    await requireOwner(owner);
    return complete(owner,session,result);
  } catch (error) {
    // Business refusal is a complete rollback. Auth, 5xx or a lost response keep pending.
    const refused = error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.code !== 'IDEMPOTENCY_CONFLICT';
    if (refused) saveCookingSession(owner,{ ...session,state:'error',command:null,error:error.message });
    else patchCookingSession(owner,id,{ error:error instanceof Error ? error.message : 'Confirmation à vérifier.' });
    throw error;
  }
}
