import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { StockCommand, StockCommandResult } from '@smart/shared';
import { ShoppingItem } from '@/hooks/useShoppingList';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useOwnedValue, removeOwnedValue } from '@/lib/ownedStorage';
import { pendingIntent } from '@/services/stockCommands';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
type TransferItems = Extract<StockCommand,{ command_type:'transfer_shopping' }>['payload']['items'];
interface Row { id:string;version:number;name:string;quantity:string;unit:string;location:string;date:string;selected:boolean }
export default function ShoppingStorageReview({ open,onOpenChange,items,busy,onConfirm }: { open:boolean;onOpenChange:(value:boolean)=>void;items:ShoppingItem[];busy:boolean;onConfirm:(items:TransferItems)=>Promise<StockCommandResult|undefined> }) {
  const user = useAuthenticatedUser();
  const [rows,setRows,storageError] = useOwnedValue<Row[]>(user.id,'shopping-review',[]);
  const [pending,setPending] = useState<StockCommand|null>(null), [loading,setLoading] = useState(true), [error,setError] = useState<string|null>(null), [success,setSuccess] = useState(false);
  useEffect(() => {
    if (!open) return; let active = true; setLoading(true);
    void pendingIntent('shopping-transfer').then(saved => {
      if (!active) return; setPending(saved); setSuccess(false);
      if (!rows.length) setRows(items.filter(item => item.is_purchased).map(item => ({ id:item.id,version:item.stock_version ?? 0,name:item.product?.name ?? 'Produit',quantity:String(item.quantity),unit:item.unit ?? item.product?.unit_type ?? '',location:'',date:'',selected:true })));
    }).catch(value => { if (active) setError((value as Error).message); }).finally(() => { if (active) setLoading(false); });
    return () => { active=false; };
    // Reopening preserves the edited snapshot; no implicit replacement by fresher rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[open,user.id]);
  const patch = (id:string,values:Partial<Row>) => { try { setRows(rows.map(row => row.id===id ? { ...row,...values } : row)); } catch (value) { setError((value as Error).message); } };
  const submit = async () => {
    if (busy || loading) return; setError(null);
    try {
      const selected = rows.filter(row => row.selected);
      const values = selected.map(row => {
        const quantity = Number(row.quantity.replace(',','.'));
        if (!row.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0 || !row.unit.trim()) throw new Error(`Vérifiez la quantité et l’unité de ${row.name}.`);
        return { id:row.id,expected_version:row.version,quantity,unit:row.unit.trim(),location:row.location.trim() || null,expiry_date:row.date || null };
      });
      if (!pending && !values.length) throw new Error('Sélectionnez au moins un achat à ranger.');
      const result = await onConfirm(values);
      if (result) { removeOwnedValue(user.id,'shopping-review'); setPending(null); setSuccess(true); }
    } catch (value) { setError((value as Error).message); setPending(await pendingIntent('shopping-transfer').catch(() => null)); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}><DialogContent className="routine-dialog"><DialogHeader><DialogTitle>Ranger mes achats</DialogTitle><DialogDescription>Vérifiez ce que vous avez acheté. La zone et la date sont facultatives. Le stock et les courses changent ensemble après confirmation.</DialogDescription></DialogHeader>
    {success ? <div className="space-y-3"><p role="status">Achats rangés. Le stock est à jour.</p><Button className="min-h-11 w-full" asChild><Link to="/pantry/inventory">Voir mon stock</Link></Button></div> : <>
      {loading && <p role="status">Lecture du rangement précédent…</p>}
      {pending && <p role="status">Un rangement envoyé reste à vérifier. Sa saisie est figée ; la même commande sera reprise.</p>}
      {rows.map(row => <fieldset key={row.id} className="border rounded-lg p-3 space-y-3" disabled={busy || !!pending}><legend className="px-1 font-medium">{row.name}</legend><label className="min-h-11 flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={row.selected} onChange={e => patch(row.id,{ selected:e.target.checked })} />Ranger ce produit</label><div className="grid grid-cols-2 gap-2"><label className="text-sm">Quantité<Input inputMode="decimal" aria-label={`Quantité de rangement de ${row.name}`} value={row.quantity} onChange={e => patch(row.id,{ quantity:e.target.value })} /></label><label className="text-sm">Unité<Input aria-label={`Unité de rangement de ${row.name}`} value={row.unit} onChange={e => patch(row.id,{ unit:e.target.value })} /></label></div><label className="block text-sm">Zone<Input list="shopping-zones" value={row.location} onChange={e => patch(row.id,{ location:e.target.value })} /></label><label className="block text-sm">Date utile (facultative)<Input type="date" value={row.date} onChange={e => patch(row.id,{ date:e.target.value })} /></label><p className="text-xs text-muted-foreground">{row.date ? `Date : ${row.date}` : 'Date inconnue, elle restera vide.'}</p></fieldset>)}
      <datalist id="shopping-zones"><option>Frigo</option><option>Congélateur</option><option>Placard</option></datalist>
      {(error || storageError) && <p role="alert" className="text-destructive">{error || storageError}</p>}
      {error && !pending && <Button className="min-h-11" variant="outline" onClick={() => { try { removeOwnedValue(user.id,'shopping-review'); setRows(items.filter(item => item.is_purchased).map(item => ({ id:item.id,version:item.stock_version ?? 0,name:item.product?.name ?? 'Produit',quantity:String(item.quantity),unit:item.unit ?? item.product?.unit_type ?? '',location:'',date:'',selected:true }))); setError(null); } catch (value) { setError((value as Error).message); } }}>Relire les achats et refaire le récapitulatif</Button>}
      <div className="routine-dialog-footer space-y-2"><Button className="min-h-11 h-auto whitespace-normal py-3 w-full" disabled={busy || loading || !!storageError} onClick={() => void submit()}>{busy ? 'Confirmation…' : pending ? 'Vérifier le rangement' : 'Confirmer le rangement'}</Button><Button className="min-h-11 w-full" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Reprendre plus tard</Button></div>
    </>}
  </DialogContent></Dialog>;
}
