import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useShoppingList, type ShoppingItem } from '@/hooks/useShoppingList';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useOwnedValue } from '@/lib/ownedStorage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ShoppingStorageReview from '@/components/shopping/ShoppingStorageReview';
import EditShoppingItemDialog from '@/components/shopping/EditShoppingItemDialog';
const defaults = { name:'',quantity:'',unit:'pièce' };
export default function SmartShoppingList() {
  const user = useAuthenticatedUser(), shopping = useShoppingList({ notify:false });
  const [form,setForm,storageError] = useOwnedValue(user.id,'shopping-add',defaults);
  const [search,setSearch] = useState(''), [review,setReview] = useState(false), [editing,setEditing] = useState<ShoppingItem|null>(null);
  const [busy,setBusy] = useState<string|null>(null), [error,setError] = useState<string|null>(null), [message,setMessage] = useState('');
  const patch = (values:Partial<typeof defaults>) => { try { setForm({ ...form,...values }); } catch (failure) { setError((failure as Error).message); } };
  const run = async (id:string,operation:()=>Promise<unknown>) => {
    if (busy) return; setBusy(id); setError(null);
    try { await operation(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Action non confirmée.'); }
    finally { setBusy(null); }
  };
  const add = async () => {
    const quantity = Number(form.quantity.replace(',','.'));
    if (!form.name.trim() || !form.quantity.trim() || !Number.isFinite(quantity) || quantity<=0 || !form.unit.trim()) throw new Error('Indiquez le nom, une quantité positive et l’unité.');
    await shopping.addToShoppingList({ productName:form.name.trim(),quantity,unit:form.unit,category:'Autres' });
    setForm(defaults); setMessage('Produit ajouté aux courses.');
  };
  const matches = (item:ShoppingItem) => (item.product?.name ?? '').toLowerCase().includes(search.toLowerCase());
  const groups = [ { title:'À acheter',items:shopping.shoppingList.filter(item => !item.is_purchased && matches(item)) },{ title:'Achetés, à ranger',items:shopping.shoppingList.filter(item => item.is_purchased && matches(item)) } ];
  const bought = shopping.getPurchasedCount();
  return <div className="mx-auto max-w-3xl p-4 space-y-5">
    <header><h1 className="text-2xl font-semibold">Mes courses</h1><p className="text-sm text-muted-foreground">Cochez vos achats, puis rangez-les dans votre stock.</p></header>
    <Button className="min-h-11" variant="outline" onClick={() => { void navigator.clipboard.writeText(shopping.generateShareableList()).then(()=>setMessage('Liste copiée.')).catch(()=>setError('Copie impossible. Vos achats restent consultables dans la liste.')); }}>Copier la liste</Button>
    <form className="rounded-xl border p-3 space-y-3" onSubmit={e => { e.preventDefault(); void run('add',add); }}>
      <label className="block text-sm space-y-1">Ajouter un produit<Input className="h-11" value={form.name} onChange={e => patch({ name:e.target.value })} placeholder="Nom du produit" /></label>
      <div className="flex flex-wrap gap-2"><label className="flex-1 min-w-[90px] text-sm space-y-1">Quantité<Input className="h-11" inputMode="decimal" value={form.quantity} onChange={e => patch({ quantity:e.target.value })} placeholder="Quantité" /></label><label className="flex-1 min-w-[90px] text-sm space-y-1">Unité<Input className="h-11" value={form.unit} onChange={e => patch({ unit:e.target.value })} /></label><Button type="submit" disabled={!!busy || !!storageError} className="h-11 self-end"><Plus aria-hidden="true" className="h-4 w-4 mr-1" />Ajouter</Button></div>
    </form>
    {(error || shopping.error || storageError) && <div role="alert" className="rounded-lg border border-destructive p-3 space-y-2"><p>{error || shopping.error || storageError}</p><Button variant="outline" className="min-h-11" onClick={() => void run('reload',shopping.refetch)}>Actualiser les courses</Button></div>}
    {message && <p role="status">{message} <Link className="underline" to="/pantry/inventory">Voir le stock</Link></p>}
    {(bought>0 || shopping.pendingTransfer) && <Button className="min-h-11 w-full" disabled={!!busy} onClick={() => setReview(true)}>{shopping.pendingTransfer ? 'Vérifier le rangement' : `Ranger mes achats (${bought})`}</Button>}
    <label className="block space-y-1 text-sm">Rechercher dans les courses<Input className="h-11" type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>
    {shopping.loading ? <p role="status">Chargement des courses…</p> : groups.map(group => <section key={group.title} className="space-y-2"><h2 className="text-lg font-semibold">{group.title} ({group.items.length})</h2>{!group.items.length ? <p className="text-sm text-muted-foreground">{group.title==='À acheter' ? 'Aucun achat restant.' : 'Vos achats cochés apparaîtront ici.'}</p> : <ul className="space-y-2">{group.items.map(item => <li key={item.id} className="rounded-xl border bg-card p-3"><div className="flex items-center gap-2"><label className="flex min-h-11 flex-1 items-center gap-3 cursor-pointer"><input className="h-5 w-5 shrink-0" type="checkbox" checked={item.is_purchased} disabled={!!busy || shopping.isTransferring || shopping.pendingTransfer} aria-label={`${item.is_purchased ? 'Remettre à acheter' : 'Marquer acheté'} : ${item.product?.name}`} onChange={e => { const checked=e.target.checked; void run(item.id,() => shopping.togglePurchased(item.id,checked)); }} /><span><span className="block font-medium break-words">{item.product?.name ?? 'Produit'}</span><span className="text-sm text-muted-foreground">{item.quantity} {item.unit ?? item.product?.unit_type ?? 'unité à vérifier'}{item.store_section ? ` · ${item.store_section}` : ''}</span></span></label><Button variant="ghost" className="h-11 w-11 shrink-0" size="icon" disabled={!!busy || shopping.pendingTransfer} aria-label={`Modifier ${item.product?.name}`} onClick={() => setEditing(item)}><Pencil className="h-4 w-4" aria-hidden="true" /></Button><Button variant="ghost" className="h-11 w-11 shrink-0" size="icon" disabled={!!busy || shopping.pendingTransfer} aria-label={`Retirer ${item.product?.name}`} onClick={() => void run(item.id,() => shopping.removeFromShoppingList(item.id))}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button></div>{shopping.isTransferring && item.is_purchased && <p role="status" className="text-sm">Rangement en attente…</p>}</li>)}</ul>}</section>)}
    <ShoppingStorageReview open={review} onOpenChange={setReview} items={shopping.shoppingList} busy={shopping.isTransferring} onConfirm={async values => { const result=await shopping.addAllToInventory(values); if (result) setMessage('Achats rangés.'); return result; }} />
    {editing && <EditShoppingItemDialog item={editing} open onOpenChange={value => { if (!value) setEditing(null); }} onSave={shopping.updateShoppingItem} />}
  </div>;
}
