import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, MoreHorizontal } from 'lucide-react';
import { useShoppingList, type ShoppingItem } from '@/hooks/useShoppingList';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useOwnedValue } from '@/lib/ownedStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ShoppingStorageReview from '@/components/shopping/ShoppingStorageReview';
import EditShoppingItemDialog from '@/components/shopping/EditShoppingItemDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
const defaults = { name:'',quantity:'',unit:'pièce' };
export default function SmartShoppingList() {
  const user = useAuthenticatedUser(), shopping = useShoppingList({ notify:false });
  const [form,setForm,storageError] = useOwnedValue(user.id,'shopping-add',defaults);
  const [search,setSearch] = useState(''), [review,setReview] = useState(false), [editing,setEditing] = useState<ShoppingItem|null>(null);
  const [busy,setBusy] = useState<string|null>(null), [error,setError] = useState<string|null>(null), [message,setMessage] = useState('');
  const [adding,setAdding]=useState(false),[quantityOpen,setQuantityOpen]=useState(false);
  const patch = (values:Partial<typeof defaults>) => { try { setForm({ ...form,...values }); } catch (failure) { setError((failure as Error).message); } };
  const run = async (id:string,operation:()=>Promise<unknown>) => {
    if (busy) return; setBusy(id); setError(null);
    try { await operation(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Action non confirmée.'); }
    finally { setBusy(null); }
  };
  const add = async () => {
    const quantity = Number(form.quantity.replace(',','.'));
    if (!form.name.trim() || !form.quantity.trim() || !Number.isFinite(quantity) || quantity<=0 || !form.unit.trim()) throw new Error('Indique le nom, une quantité positive et l’unité.');
    await shopping.addToShoppingList({ productName:form.name.trim(),quantity,unit:form.unit,category:'Autres' });
    setForm(defaults); setMessage('Produit ajouté aux courses.');setAdding(false);setQuantityOpen(false);
  };
  const matches = (item:ShoppingItem) => (item.product?.name ?? '').toLowerCase().includes(search.toLowerCase());
  const groups = [ { title:'À acheter',items:shopping.shoppingList.filter(item => !item.is_purchased && matches(item)) },{ title:'Achetés, à ranger',items:shopping.shoppingList.filter(item => item.is_purchased && matches(item)) } ];
  const bought = shopping.getPurchasedCount();
  return <div className="culinary-page mx-auto max-w-3xl p-4 space-y-4">
    <header className="flex items-start justify-between gap-3"><div className="min-w-0"><h1 className="culinary-title">Mes courses</h1><p className="mt-1 text-sm text-muted-foreground">Coche tes achats, puis range-les dans ton stock.</p></div>
      <Dialog open={adding} onOpenChange={value=>{ if (!busy) setAdding(value); }}><DialogTrigger asChild><Button className="min-h-11 shrink-0"><Plus aria-hidden="true" className="h-4 w-4 mr-1" />Ajouter</Button></DialogTrigger><DialogContent className="routine-dialog"><DialogHeader><DialogTitle>Ajouter aux courses</DialogTitle><DialogDescription>Commence par le nom. La quantité et l’unité seront confirmées avant l’ajout.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={e=>{ e.preventDefault(); if (!quantityOpen) { setQuantityOpen(true);return; } void run('add',add); }}>
          <label className="block text-sm space-y-1">Ajouter un produit<Input className="h-11" value={form.name} onChange={e=>patch({ name:e.target.value })} placeholder="Nom du produit" disabled={!!busy} /></label>
          {quantityOpen ? <div className="grid grid-cols-2 gap-3"><label className="text-sm space-y-1">Quantité<Input autoFocus className="h-11" inputMode="decimal" value={form.quantity} onChange={e=>patch({ quantity:e.target.value })} placeholder="Quantité" disabled={!!busy} /></label><label className="text-sm space-y-1">Unité<Input className="h-11" value={form.unit} onChange={e=>patch({ unit:e.target.value })} disabled={!!busy} /></label></div> : form.quantity && <p className="text-sm">Saisie conservée : {form.quantity} {form.unit}.</p>}
          {(error || storageError) && <p role="alert" className="text-sm text-destructive">{error || storageError}</p>}
          <div className="routine-dialog-footer"><Button type="submit" disabled={!!busy || !!storageError || !form.name.trim()} className="min-h-11 w-full">{busy==='add' ? 'Ajout en cours…' : quantityOpen ? 'Ajouter aux courses' : 'Préciser la quantité'}</Button></div>
        </form>
      </DialogContent></Dialog>
    </header>
    {(error || shopping.error || storageError) && <div role="alert" className="rounded-lg border border-destructive p-3 space-y-2"><p>{error || shopping.error || storageError}</p><Button variant="outline" className="min-h-11" onClick={() => void run('reload',shopping.refetch)}>Actualiser les courses</Button></div>}
    {message && <p role="status">{message} <Link className="inline-flex min-h-11 items-center underline" to="/pantry/inventory">Voir le stock</Link></p>}
    {(bought>0 || shopping.pendingTransfer) && <Button className="min-h-11 w-full" disabled={!!busy} onClick={() => setReview(true)}>{shopping.pendingTransfer ? 'Vérifier le rangement' : `Ranger mes achats (${bought})`}</Button>}
    <label className="block space-y-1 text-sm">Rechercher dans les courses<Input className="h-11" type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
    {shopping.loading ? <p role="status">Chargement des courses…</p> : groups.map(group => <section key={group.title} className="space-y-2"><h2 className="text-lg font-semibold">{group.title} ({group.items.length})</h2>{!group.items.length ? <p className="text-sm text-muted-foreground">{group.title==='À acheter' ? 'Aucun achat restant. Utilise Ajouter pour préparer tes courses.' : 'Tes achats cochés apparaîtront ici.'}</p> : <ul className="space-y-1">{group.items.map(item => <li key={item.id} className="border-b py-2"><div className="flex items-center gap-2"><label className="flex min-h-11 min-w-0 flex-1 items-center gap-3 cursor-pointer"><input className="h-5 w-5 shrink-0" type="checkbox" checked={item.is_purchased} disabled={!!busy || shopping.isTransferring || shopping.pendingTransfer} aria-label={`${item.is_purchased ? 'Remettre à acheter' : 'Marquer acheté'} : ${item.product?.name}`} onChange={e => { const checked=e.target.checked; void run(item.id,() => shopping.togglePurchased(item.id,checked)); }} /><span className="min-w-0"><span className="block font-medium break-words">{item.product?.name ?? 'Produit'}</span><span className="text-sm text-muted-foreground">{item.quantity} {item.unit ?? item.product?.unit_type ?? 'unité à vérifier'}{item.store_section ? ` · ${item.store_section}` : ''}</span></span></label><Button variant="ghost" className="h-11 w-11 shrink-0" size="icon" disabled={!!busy || shopping.pendingTransfer} aria-label={`Modifier ${item.product?.name}`} onClick={() => setEditing(item)}><Pencil className="h-4 w-4" aria-hidden="true" /></Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" disabled={!!busy || shopping.pendingTransfer} aria-label={`Autres actions pour ${item.product?.name}`}><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="min-h-11" onSelect={()=>void run(item.id,()=>shopping.removeFromShoppingList(item.id))}>Retirer des courses</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>{shopping.isTransferring && item.is_purchased && <p role="status" className="text-sm">Rangement en attente…</p>}</li>)}</ul>}</section>)}
    <Button className="min-h-11" variant="ghost" onClick={() => { void navigator.clipboard.writeText(shopping.generateShareableList()).then(()=>setMessage('Liste copiée.')).catch(()=>setError('Copie impossible. Tes achats restent consultables.')); }}>Copier la liste</Button>
    <ShoppingStorageReview open={review} onOpenChange={setReview} items={shopping.shoppingList} busy={shopping.isTransferring} onConfirm={async values => { const result=await shopping.addAllToInventory(values); if (result) setMessage('Achats rangés.'); return result; }} />
    {editing && <EditShoppingItemDialog item={editing} open onOpenChange={value => { if (!value) setEditing(null); }} onSave={shopping.updateShoppingItem} />}
  </div>;
}
