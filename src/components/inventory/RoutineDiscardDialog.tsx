import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useOwnedValue } from '@/lib/ownedStorage';
import { DiscardDraftSchema, confirmDiscard, editDiscard, abandonDiscardDraft, type DiscardDraft } from '@/services/stockDiscard';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function RoutineDiscardDialog({ open,onOpenChange,onSaved }: { open:boolean;onOpenChange:(open:boolean)=>void;onSaved:()=>void }) {
  const user=useAuthenticatedUser();
  const [raw,,storageError]=useOwnedValue<DiscardDraft|null>(user.id,'stock-discard',null);
  const parsed=DiscardDraftSchema.safeParse(raw), draft=parsed.success && parsed.data.owner===user.id ? parsed.data : null;
  const [busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null),[done,setDone]=useState(false);
  const patch=(values:Partial<Pick<DiscardDraft,'quantity'|'reason'|'notes'|'cost'>>) => {
    if (!draft) return;
    try { editDiscard(user.id,{ quantity:draft.quantity,reason:draft.reason,notes:draft.notes,cost:draft.cost,...values });setError(null); }
    catch (failure) { setError((failure as Error).message); }
  };
  const submit=async()=>{
    if (busy || !draft) return;setBusy(true);setError(null);
    try { await confirmDiscard(user.id);setDone(true);onSaved(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'La déclaration reste à vérifier.'); }
    finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value=>{ if (!busy) onOpenChange(value); }}><DialogContent className="routine-dialog"><DialogHeader><DialogTitle>{done ? 'Perte enregistrée' : `Jeter ${draft?.product_name ?? 'un ingrédient'}`}</DialogTitle><DialogDescription>Confirmez la quantité jetée et son motif. Un enregistrement interrompu reste reprenable.</DialogDescription></DialogHeader>
    {done ? <div role="status" className="space-y-3"><p>Le stock et la déclaration de perte sont confirmés.</p><Button className="min-h-11" asChild><Link to="/insights/waste">Voir mes pertes</Link></Button><Button className="min-h-11" variant="outline" onClick={()=>onOpenChange(false)}>Fermer</Button></div> : draft ? <>
      {draft.stock_confirmed ? <p role="status">Le stock a déjà été mis à jour. Seule la déclaration de perte reste à enregistrer.</p> : draft.command && <p role="status">Une confirmation reste à vérifier. La même commande sera reprise.</p>}
      <fieldset disabled={busy || !!draft.command || draft.stock_confirmed} className="space-y-3">
        <label className="block space-y-1">Quantité jetée<Input inputMode="decimal" value={draft.quantity} onChange={e=>patch({ quantity:e.target.value })} /></label><p className="text-sm">Unité : {draft.unit || 'à vérifier dans le stock'}</p>
        <label className="block space-y-1">Motif<select className="h-11 w-full rounded-md border bg-background px-2" value={draft.reason} onChange={e=>patch({ reason:e.target.value as DiscardDraft['reason'] })}><option value="expired">Périmé</option><option value="spoiled">Abîmé / moisi</option><option value="leftover">Reste de repas</option><option value="other">Autre</option></select></label>
        <label className="block space-y-1">Coût estimé en euros (facultatif)<Input inputMode="decimal" value={draft.cost} onChange={e=>patch({ cost:e.target.value })} /></label>
        <label className="block space-y-1">Note (facultative)<Textarea value={draft.notes} onChange={e=>patch({ notes:e.target.value })} /></label>
      </fieldset>
      {(error || storageError) && <p role="alert" className="text-destructive">{error || storageError}</p>}
      <div className="routine-dialog-footer space-y-2"><Button className="min-h-11 w-full" disabled={busy || !!storageError} onClick={()=>void submit()}>{busy ? 'Vérification…' : draft.stock_confirmed ? 'Enregistrer la perte' : draft.command ? 'Vérifier la confirmation' : 'Confirmer et jeter'}</Button><Button className="min-h-11 w-full" variant="outline" disabled={busy} onClick={()=>onOpenChange(false)}>Reprendre plus tard</Button>{!draft.command && !draft.stock_confirmed && <Button className="min-h-11 w-full" variant="ghost" disabled={busy} onClick={()=>{ try { abandonDiscardDraft(user.id);onOpenChange(false); } catch (failure) { setError((failure as Error).message); } }}>Abandonner la saisie</Button>}</div>
    </> : <p role="alert">{storageError || 'La déclaration conservée ne peut pas être relue.'}</p>}
  </DialogContent></Dialog>;
}
