import {useState} from 'react';
import {useRecipeLifecycle} from '@/hooks/useRecipeLifecycle';
import {Button} from '@/components/ui/button';
export default function RecipePendingChoice(){
  const life=useRecipeLifecycle();
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=life.pending;
  if(life.pendingError)return <p role="alert">Un choix sauvegardé est illisible. Vérifie ton historique avant de recommencer.</p>;
  if(!pending)return null;
  const retry=async()=>{setBusy(true);setError('');try{await life.save(pending!.recipe,pending!.action as 'queue'|'unqueue'|'cooked');}catch(e){setError(e instanceof Error?e.message:'Choix non confirmé.');}finally{setBusy(false);}};
  return <div role="status" className="mb-4 rounded-lg border p-3"><p>Ton dernier choix reste à confirmer.</p><Button disabled={busy} variant="outline" className="min-h-11" onClick={()=>void retry()}>Vérifier mon dernier choix</Button>{error&&<p role="alert">{error}</p>}</div>;
}
