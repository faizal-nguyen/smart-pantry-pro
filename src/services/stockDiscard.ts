import { z } from 'zod';
import { StockCommandSchema } from '@smart/shared';
import type { InventoryItem } from '@/hooks/useInventory';
import { supabase } from '@/integrations/supabase/client';
import { readOwnedValue, writeOwnedValue } from '@/lib/ownedStorage';
import { ApiError } from '@/lib/api';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { executeStockCommand, getStockCommandResult } from './stockCommands';

export const DiscardDraftSchema = z.object({
  owner:z.string().uuid(), event_id:z.string().uuid(), inventory_id:z.string().uuid(), product_id:z.string().uuid(),
  product_name:z.string(), category:z.string().nullable(), quantity:z.string(), unit:z.string(),
  reason:z.enum(['expired','spoiled','leftover','other']), notes:z.string(), cost:z.string(), occurred_at:z.string(),
  command:StockCommandSchema.nullable(), stock_confirmed:z.boolean(),
}).strict().superRefine((draft,ctx)=>{
  if (draft.stock_confirmed && !draft.command) ctx.addIssue({ code:z.ZodIssueCode.custom,message:'Confirmation sans commande' });
  if (!draft.command) return;
  const quantity=Number(draft.quantity.replace(',','.'));
  if (draft.command.command_type!=='consume_inventory' || draft.command.payload.items.length!==1 ||
      draft.command.payload.items[0].id!==draft.inventory_id || draft.command.payload.items[0].quantity!==quantity || draft.command.payload.items[0].unit!==draft.unit || draft.command.command_id!==draft.event_id) {
    ctx.addIssue({ code:z.ZodIssueCode.custom,message:'La commande ne correspond pas à la déclaration' });
  }
});
export type DiscardDraft = z.infer<typeof DiscardDraftSchema>;
const key = 'stock-discard';
export function readDiscardDraft(owner:string): DiscardDraft|null {
  const raw = readOwnedValue<unknown>(owner,key,null);
  if (raw===null) return null;
  const parsed=DiscardDraftSchema.safeParse(raw);
  if (!parsed.success || parsed.data.owner!==owner) throw new Error('La déclaration conservée ne peut pas être relue. Elle reste enregistrée.');
  return parsed.data;
}
export function prepareDiscard(owner:string,item:InventoryItem): DiscardDraft {
  const existing=readDiscardDraft(owner);
  if (existing) {
    if (existing.inventory_id!==item.id) throw new Error('Reprenez la déclaration de perte précédente avant d’en commencer une autre.');
    return existing;
  }
  const draft=DiscardDraftSchema.parse({ owner,event_id:crypto.randomUUID(),inventory_id:item.id,product_id:item.product_id,
    product_name:item.product?.name ?? 'Produit',category:item.product?.category ?? null,quantity:String(item.quantity),unit:(item.unit ?? item.product?.unit_type ?? '').trim(),
    reason:'expired',notes:'',cost:'',occurred_at:new Date().toISOString(),command:null,stock_confirmed:false });
  writeOwnedValue(owner,key,draft);return draft;
}
export function editDiscard(owner:string,patch:Pick<DiscardDraft,'quantity'|'reason'|'notes'|'cost'>) {
  const draft=readDiscardDraft(owner);
  if (!draft || draft.command || draft.stock_confirmed) throw new Error('Vérifiez la déclaration envoyée avant de la modifier.');
  writeOwnedValue(owner,key,DiscardDraftSchema.parse({ ...draft,...patch }));
}
export function abandonDiscardDraft(owner:string) {
  const draft=readDiscardDraft(owner);
  if (draft?.command || draft?.stock_confirmed) throw new Error('Vérifiez la confirmation envoyée avant de terminer cette déclaration.');
  writeOwnedValue(owner,key,null);
}
async function requireOwner(owner:string) {
  if ((await supabase.auth.getSession()).data.session?.user.id!==owner) throw new Error('Reconnectez-vous au compte qui a commencé cette déclaration.');
}
/** Stock uses the V10 transaction; the existing waste log is a separately recoverable write. */
export async function confirmDiscard(owner:string): Promise<void> {
  await requireOwner(owner);
  let draft=readDiscardDraft(owner);
  if (!draft) throw new Error('Aucune déclaration à confirmer.');
  const quantity=Number(draft.quantity.replace(',','.')), cost=draft.cost.trim() ? Number(draft.cost.replace(',','.')) : null;
  if (!draft.quantity.trim() || !Number.isFinite(quantity) || quantity<=0 || quantity>1e9 || !draft.unit.trim()) throw new Error('Indiquez une quantité positive avec une unité connue.');
  if (cost!==null && (!Number.isFinite(cost) || cost<0 || cost>1e9)) throw new Error('Vérifiez le coût estimé ou laissez-le vide.');
  const wasSent=!!draft.command;
  if (!draft.command) {
    draft={ ...draft,command:StockCommandSchema.parse({ command_id:draft.event_id,command_type:'consume_inventory',payload_version:1,payload:{ items:[{ id:draft.inventory_id,quantity,unit:draft.unit }] } }) };
    writeOwnedValue(owner,key,draft);
  }
  try {
    if (wasSent) {
      try { await getStockCommandResult(draft.command!.command_id,owner); }
      catch (failure) {
        if (!(failure instanceof ApiError) || failure.status!==404 || draft.stock_confirmed) throw failure;
      }
    }
    // A receipt-only replay also checks that a concurrent tab did not submit different amounts.
    await executeStockCommand(draft.command!,owner);
  } catch (failure) {
    if (!draft.stock_confirmed && failure instanceof ApiError && failure.status>=400 && failure.status<500 && failure.status!==401 && failure.code!=='IDEMPOTENCY_CONFLICT') writeOwnedValue(owner,key,{ ...draft,command:null });
    throw failure;
  }
  await requireOwner(owner);
  draft={ ...draft,stock_confirmed:true };writeOwnedValue(owner,key,draft);
  const existing=await supabase.from('food_waste_events').select('id,user_id,product_id,product_name,category,quantity,unit_type,reason,notes,estimated_cost_eur,occurred_at').eq('id',draft.event_id).eq('user_id',owner).maybeSingle();
  await requireOwner(owner);
  if (existing.error) throw new Error('Le stock est confirmé. La perte reste à enregistrer : réessayez cette déclaration.');
  if (existing.data) {
    if (existing.data.user_id!==owner || existing.data.product_id!==draft.product_id || Number(existing.data.quantity)!==quantity || existing.data.unit_type!==draft.unit || existing.data.reason!==draft.reason ||
        existing.data.product_name!==draft.product_name || existing.data.category!==draft.category || existing.data.notes!==(draft.notes.trim() || null) ||
        (cost===null ? existing.data.estimated_cost_eur!==null : Number(existing.data.estimated_cost_eur)!==cost) ||
        new Date(existing.data.occurred_at).getTime()!==new Date(draft.occurred_at).getTime()) throw new Error('Le stock est confirmé, mais cette déclaration doit être vérifiée avant de poursuivre.');
  } else {
    const saved=await supabase.from('food_waste_events').insert({ id:draft.event_id,user_id:owner,product_id:draft.product_id,
      product_name:draft.product_name,category:draft.category,quantity,unit_type:draft.unit,reason:draft.reason,
      notes:draft.notes.trim() || null,estimated_cost_eur:cost,occurred_at:draft.occurred_at }).select('id').single();
    await requireOwner(owner);
    if (saved.error || saved.data?.id!==draft.event_id) throw new Error('Le stock est confirmé. La perte reste à enregistrer : réessayez cette déclaration.');
  }
  writeOwnedValue(owner,key,null);dispatchAgentDbChanged(['food_waste_events']);
}
