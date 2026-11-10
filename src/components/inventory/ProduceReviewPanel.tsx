import {useState} from 'react';
import {produceReview} from '@smart/shared';
import type {InventoryItem} from '@/hooks/useInventory';
import {Button} from '@/components/ui/button';
export default function ProduceReviewPanel({items,now,disabled,onKeep,onConsumed,onCorrect,onDiscard}:{
 items:InventoryItem[];now:Date;disabled:boolean;onKeep:(item:InventoryItem)=>Promise<unknown>;onConsumed:(item:InventoryItem)=>Promise<unknown>;onCorrect:(item:InventoryItem)=>void;onDiscard:(item:InventoryItem)=>void;
}){
 const [busy,setBusy]=useState<string|null>(null),[error,setError]=useState<string|null>(null),[expanded,setExpanded]=useState(false);
 const due=items.flatMap(item=>{const review=produceReview(item,now);return review?[{item,...review}]:[];}).sort((a,b)=>b.days-a.days);
 if(!due.length)return null;
 const run=async(item:InventoryItem,action:(item:InventoryItem)=>Promise<unknown>)=>{if(busy||disabled)return;setBusy(item.id);setError(null);try{await action(item);}catch(e){setError(e instanceof Error?e.message:'Mise à jour non confirmée.');}finally{setBusy(null);}};
 return <section id="produce-review" aria-labelledby="produce-review-title" className="my-4 rounded-lg border p-4 space-y-3">
  <h2 id="produce-review-title" className="text-lg font-semibold">Encore dans ton stock ?</h2>
  <p className="text-sm text-muted-foreground">Ces fruits, légumes ou herbes n’ont pas été actualisés depuis un moment. Ce rappel ne signifie pas qu’ils sont périmés. Vérifie ce qu’il reste et leur état.</p>
  {busy&&<p role="status" className="text-sm">Mise à jour du stock…</p>}
  {error&&<p role="alert">{error}</p>}
  <ul className="space-y-4">{(expanded?due:due.slice(0,5)).map(({item,days})=><li key={item.id}>
   <p className="font-medium">{item.product?.name}</p><p className="text-sm text-muted-foreground">Stock non actualisé depuis {days} jours.</p>
   <div className="flex flex-wrap gap-2"><Button className="min-h-11" variant="outline" disabled={disabled||!!busy} onClick={()=>void run(item,onKeep)}>J’en ai encore<span className="sr-only"> : {item.product?.name}</span></Button>
    <Button className="min-h-11" variant="ghost" disabled={disabled||!!busy} onClick={()=>onCorrect(item)}>Corriger<span className="sr-only"> : {item.product?.name}</span></Button>
    <Button className="min-h-11" variant="ghost" disabled={disabled||!!busy} onClick={()=>void run(item,onConsumed)}>Tout consommé<span className="sr-only"> : {item.product?.name}</span></Button>
    <Button className="min-h-11" variant="ghost" disabled={disabled||!!busy} onClick={()=>onDiscard(item)}>Déclarer une perte<span className="sr-only"> : {item.product?.name}</span></Button></div>
  </li>)}</ul>
  {!expanded&&due.length>5&&<Button className="min-h-11" variant="outline" onClick={()=>setExpanded(true)}>Voir les {due.length-5} autres rappels</Button>}
 </section>;
}
