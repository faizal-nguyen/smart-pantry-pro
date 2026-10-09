import LotQualificationFields,{ type LotDateKind,type QuantityQuality } from './LotQualificationFields';
import { useState, useEffect } from 'react';
import type { StockCommand } from '@smart/shared';
import { pendingIntent } from '@/services/stockCommands';
import { InventoryItem } from '@/hooks/useInventory';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useOwnedValue } from '@/lib/ownedStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
interface Fields { quantity:string;unit:string;location:string;date:string;dateKind:LotDateKind;quality:QuantityQuality }
export default function QuickStockCorrection({ item,open,onOpenChange,onSave }: { item:InventoryItem;open:boolean;onOpenChange:(value:boolean)=>void;onSave:(id:string,updates:Partial<InventoryItem>)=>Promise<void> }) {
  const user = useAuthenticatedUser();
  const defaults:Fields = { quantity:String(item.quantity),unit:item.unit ?? item.product?.unit_type ?? '',location:item.location ?? '',date:item.expiry_date ?? '',dateKind:item.date_kind ?? 'unknown',quality:item.quantity_quality ?? 'unknown' };
  const [fields,setFields,storageError] = useOwnedValue(user.id,`correction:${item.id}`,defaults);
  const [busy,setBusy] = useState(false), [error,setError] = useState<string|null>(null);
  const [pending,setPending] = useState<StockCommand|null>(null), [loading,setLoading] = useState(true);
  useEffect(() => {
    let active=true;
    void pendingIntent(`inventory-adjust:${item.id}`).then(command => {
      if (!active) return;
      setPending(command);
      if (command?.command_type==='adjust_inventory') {
        const sent=command.payload.items.find(row=>row.id===item.id);
        if (sent) setFields({ quantity:String(sent.quantity),unit:sent.unit,location:sent.location ?? '',date:sent.expiry_date ?? '',dateKind:sent.date_kind ?? 'unknown',quality:sent.quantity_quality ?? 'unknown' });
      }
    }).catch(failure=>{ if (active) setError((failure as Error).message); }).finally(()=>{ if (active) setLoading(false); });
    return()=>{ active=false; };
  },[item.id,setFields]);
  const patch = (value:Partial<Fields>) => { try { setFields({ ...fields,...value }); } catch (failure) { setError((failure as Error).message); } };
  const save = async () => {
    if (busy) return; const quantity = Number(fields.quantity.replace(',','.'));
    if (!fields.quantity.trim() || !Number.isFinite(quantity) || quantity<0 || !fields.unit.trim()) { setError('Indiquez une quantité positive ou nulle et son unité.'); return; }
    setBusy(true); setError(null);
    try { await onSave(item.id,{ quantity,unit:fields.unit,location:fields.location,expiry_date:fields.date,...(!pending || pending.command_type==='adjust_inventory' && pending.payload.items[0].date_kind!==undefined ? { date_kind:fields.dateKind ?? 'unknown' } : {}),...(!pending || pending.command_type==='adjust_inventory' && pending.payload.items[0].quantity_quality!==undefined ? { quantity_quality:fields.quality ?? 'unknown' } : {}) }); onOpenChange(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Correction non confirmée.'); setPending(await pendingIntent(`inventory-adjust:${item.id}`).catch(()=>null)); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}><DialogContent className="routine-dialog"><DialogHeader><DialogTitle>Corriger {item.product?.name}</DialogTitle><DialogDescription>La saisie reste conservée jusqu’à confirmation. La date peut rester inconnue.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}>
      {pending && <p role="status">Une correction envoyée reste à vérifier. Les valeurs envoyées sont conservées et figées jusqu’au résultat.</p>}
      <fieldset className="space-y-4" disabled={busy || loading || !!pending}>
      <label className="block space-y-1">Quantité<Input autoFocus inputMode="decimal" value={fields.quantity} onChange={e => patch({ quantity:e.target.value })} /></label>
      <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => patch({ quantity:String(Math.max(0,Number(fields.quantity.replace(',','.'))-1)) })}>− 1</Button><Button type="button" variant="outline" onClick={() => patch({ quantity:String(Number(fields.quantity.replace(',','.'))+1) })}>+ 1</Button><Button type="button" variant="outline" onClick={() => patch({ quantity:'0' })}>Il n’en reste plus</Button></div>
      <label className="block space-y-1">Unité<Input value={fields.unit} onChange={e => patch({ unit:e.target.value })} /></label>
      <label className="block space-y-1">Zone<Input list="stock-zones" value={fields.location} onChange={e => patch({ location:e.target.value })} /><datalist id="stock-zones"><option>Frigo</option><option>Congélateur</option><option>Placard</option></datalist></label>
      <label className="block space-y-1">Date utile (facultative)<Input type="date" value={fields.date} onChange={e => patch({ date:e.target.value })} /></label>
      <LotQualificationFields dateKind={fields.dateKind ?? 'unknown'} quality={fields.quality ?? 'unknown'} onDateKind={dateKind=>patch({ dateKind })} onQuality={quality=>patch({ quality })} />
      </fieldset>
      {(error || storageError) && <p role="alert" className="text-destructive">{error || storageError}</p>}
      <div className="routine-dialog-footer space-y-2"><Button className="min-h-11 w-full" type="submit" disabled={busy || loading || !!storageError}>{busy ? 'Vérification…' : pending ? 'Vérifier la correction' : 'Confirmer la correction'}</Button><Button className="min-h-11 w-full" type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Reprendre plus tard</Button></div>
    </form>
  </DialogContent></Dialog>;
}
