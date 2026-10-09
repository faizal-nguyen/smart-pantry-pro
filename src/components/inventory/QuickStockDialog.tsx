import LotQualificationFields,{ type LotDateKind,type QuantityQuality } from './LotQualificationFields';
import { useState } from 'react';
import { normalizeIngredientName } from '@smart/shared';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useInventory } from '@/hooks/useInventory';
import { useOwnedValue } from '@/lib/ownedStorage';
import { supabase } from '@/integrations/supabase/client';
import { dispatchAgentDbChanged } from '@/lib/agentEvents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
type Sent={ product_id:string;quantity:number;unit:string;expiry_date:string|null;date_kind:LotDateKind;quantity_quality:QuantityQuality };
interface Row { id:string;name:string;quantity:string;unit:string;selected:boolean;confirmed:boolean;date?:string;dateKind?:LotDateKind;quality?:QuantityQuality;sent?:Sent }
const common = ['Œufs','Riz','Tomates','Lait','Huile d’olive'];
export default function QuickStockDialog({ open,onOpenChange,firstUse=false,onSaved }: { open:boolean;onOpenChange:(value:boolean)=>void;firstUse?:boolean;onSaved?:()=>void }) {
  const user = useAuthenticatedUser(), { addProduct } = useInventory();
  const [rows,setRows,storageError] = useOwnedValue<Row[]>(user.id,firstUse ? 'first-stock' : 'quick-stock',[]);
  const [error,setError] = useState<string|null>(null), [busy,setBusy] = useState(false), [text,setText] = useOwnedValue(user.id,'quick-stock-names','');
  const saveRows = (value:Row[]) => { try { setRows(value); } catch (failure) { setError((failure as Error).message); } };
  const fill = (names:string[]) => saveRows([...rows,...names.filter(name => name.trim()).map(name => ({ id:crypto.randomUUID(),name:name.trim(),quantity:'',unit:'',selected:true,confirmed:false }))]);
  const save = async () => {
    if (busy) return; setBusy(true); setError(null);
    let current = [...rows];
    try {
      for (const row of current.filter(item => item.selected && !item.confirmed)) {
        const quantity = Number(row.quantity.replace(',','.'));
        if (!row.name.trim() || !row.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0 || !row.unit.trim()) throw new Error(`Indiquez une quantité positive et une unité pour ${row.name || 'chaque produit'}.`);
      }
      for (const row of current.filter(item => item.selected && !item.confirmed)) {
        if ((await supabase.auth.getSession()).data.session?.user.id !== user.id) throw new Error('Reconnectez-vous à ce compte pour reprendre cette saisie.');
        const previous = await supabase.from('inventory').select('id,product_id,quantity,unit,expiry_date,date_kind,quantity_quality').eq('id',row.id).eq('user_id',user.id).maybeSingle();
        if (previous.error) throw previous.error;
        if (!previous.data) {
          const found = await supabase.from('products').select('*').eq('normalized_name',normalizeIngredientName(row.name)).maybeSingle();
          if (found.error) throw found.error;
          const product = found.data ?? await addProduct({ name:row.name.trim(),unit_type:row.unit.trim(),category:'Autres' });
          const sent=row.sent ?? { product_id:product.id,quantity:Number(row.quantity.replace(',','.')),unit:row.unit.trim(),expiry_date:row.date || null,date_kind:row.dateKind ?? 'unknown',quantity_quality:row.quality ?? 'unknown' };
          current=current.map(item=>item.id===row.id ? { ...item,sent } : item);setRows(current);
          const { error:failure } = await supabase.from('inventory').insert({ id:row.id,user_id:user.id,...sent,location:null }).select('id').single();
          if (failure) throw new Error(`Ajout de ${row.name} non confirmé. La saisie est conservée ; réessayez pour vérifier ce lot.`);
        }
        if (previous.data) {
          const sent=row.sent ?? { quantity:Number(row.quantity.replace(',','.')),unit:row.unit.trim(),expiry_date:row.date || null,date_kind:row.dateKind ?? 'unknown',quantity_quality:row.quality ?? 'unknown' };
          if (Number(previous.data.quantity)!==sent.quantity || previous.data.unit!==sent.unit || previous.data.expiry_date!==sent.expiry_date || previous.data.date_kind!==sent.date_kind || previous.data.quantity_quality!==sent.quantity_quality) throw new Error(`Le lot ${row.name} existe avec d’autres valeurs. Vérifiez-le dans le stock avant de confirmer cette saisie.`);
        }
        if ((await supabase.auth.getSession()).data.session?.user.id !== user.id) throw new Error('Le compte a changé. Reprenez avec son propriétaire.');
        current = current.map(item => item.id === row.id ? { ...item,confirmed:true } : item); setRows(current);
        dispatchAgentDbChanged(['inventory']);
      }
      onSaved?.();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Ajout non confirmé. Votre saisie reste conservée.'); }
    finally { setBusy(false); }
  };
  const pending = rows.filter(row => row.selected && !row.confirmed).length;
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}><DialogContent className="routine-dialog"><DialogHeader><DialogTitle>{firstUse ? 'Quelques ingrédients pour commencer' : 'Ajouter au stock'}</DialogTitle><DialogDescription>Nom, quantité et unité suffisent. Zone, photo et date sont facultatives. Seuls les produits sélectionnés sont ajoutés.</DialogDescription></DialogHeader>
    {!rows.length && firstUse && <Button variant="outline" onClick={() => fill(common)}>Préparer cinq ingrédients courants</Button>}
    <label className="space-y-2">Saisie manuelle, un nom par ligne<textarea className="w-full rounded-md border bg-background p-2" rows={3} value={text} onChange={e => { try { setText(e.target.value); } catch (failure) { setError((failure as Error).message); } }} placeholder="Tomates\nRiz" /></label>
    <Button variant="outline" onClick={() => { fill(text.split(/[,;\n]+/)); try { setText(''); } catch (failure) { setError((failure as Error).message); } }} disabled={!text.trim() || busy}>Préparer ces produits</Button>
    <div className="space-y-3">{rows.map(row => <fieldset key={row.id} className="rounded-lg border p-3"><legend>{row.name || 'Produit'}</legend><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={row.selected} disabled={row.confirmed || busy || !!row.sent} onChange={e => saveRows(rows.map(item => item.id===row.id ? { ...item,selected:e.target.checked } : item))} />{row.confirmed ? 'Ajout confirmé' : 'Ajouter ce produit'}</label><div className="grid grid-cols-2 gap-2"><Input aria-label={`Quantité de ${row.name}`} inputMode="decimal" placeholder="Quantité" disabled={busy || row.confirmed || !!row.sent} value={row.quantity} onChange={e => saveRows(rows.map(item => item.id===row.id ? { ...item,quantity:e.target.value } : item))} /><Input aria-label={`Unité de ${row.name}`} placeholder="g, kg, L, pièce…" disabled={busy || row.confirmed || !!row.sent} value={row.unit} onChange={e => saveRows(rows.map(item => item.id===row.id ? { ...item,unit:e.target.value } : item))} /></div><div className="mt-3 space-y-3"><label className="block text-sm">Date utile (facultative)<Input type="date" disabled={busy || row.confirmed || !!row.sent} value={row.date ?? ''} onChange={event=>saveRows(rows.map(item=>item.id===row.id ? { ...item,date:event.target.value } : item))} /></label><fieldset disabled={busy || row.confirmed || !!row.sent}><LotQualificationFields dateKind={row.dateKind ?? 'unknown'} quality={row.quality ?? 'unknown'} onDateKind={dateKind=>saveRows(rows.map(item=>item.id===row.id ? { ...item,dateKind } : item))} onQuality={quality=>saveRows(rows.map(item=>item.id===row.id ? { ...item,quality } : item))} /></fieldset></div></fieldset>)}</div>
    {(error || storageError) && <p role="alert" className="text-destructive">{error || storageError}</p>}
    <div className="routine-dialog-footer space-y-2"><Button className="w-full min-h-11" disabled={busy || !pending || !!storageError} onClick={() => void save()}>{busy ? 'Vérification…' : `Ajouter ${pending} produit(s)`}</Button><Button variant="outline" className="w-full min-h-11" disabled={busy} onClick={() => onOpenChange(false)}>Reprendre plus tard</Button>{rows.length>0 && !pending && <Button variant="ghost" onClick={() => saveRows(rows.filter(row => !row.confirmed))}>Préparer un nouvel ajout</Button>}</div>
  </DialogContent></Dialog>;
}
