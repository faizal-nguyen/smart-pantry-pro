import { useState } from 'react';
import type { RecipeEvaluationInput } from '@smart/shared';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { useRecipeLifecycle } from '@/hooks/useRecipeLifecycle';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import AfterCookingFeedback from './AfterCookingFeedback';
export default function RecipeLibraryActions({recipe,name,detail=false}:{recipe:RecipeEvaluationInput['recipe'];name:string;detail?:boolean}){
  const life=useRecipeLifecycle(),owner=useAuthenticatedUser().id,state=life.stateFor(recipe);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false),[recorded,setRecorded]=useState(false);
  const save=async(action:'queue'|'unqueue'|'cooked')=>{
    if(busy)return;setBusy(true);setError('');
    try{await life.save(recipe,action);if(action==='cooked'){setConfirm(false);setRecorded(true);}}
    catch(e){setError(e instanceof Error?e.message:'Choix non confirmé. Réessaie.');}finally{setBusy(false);}
  };
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2"><Button variant={state?.queued_at?'secondary':'outline'} className="min-h-11 whitespace-normal" aria-label={`${state?.queued_at?'Retirer de':'Ajouter à'} À cuisiner bientôt : ${name}`} aria-pressed={!!state?.queued_at} disabled={busy||life.isLoading||life.isError} onClick={()=>void save(state?.queued_at?'unqueue':'queue')}>{state?.queued_at?'Dans À cuisiner bientôt':'À cuisiner bientôt'}</Button>
      {detail&&<Button variant="ghost" className="min-h-11" disabled={busy||life.isLoading||life.isError} onClick={()=>setConfirm(true)}>Je l’ai faite</Button>}
    </div>
    {detail&&<p className="text-sm text-muted-foreground">{life.isLoading?'Lecture de ton historique…':life.isError?'Historique indisponible.':state?.last_cooked_at?`Dernière préparation enregistrée : ${new Date(state.last_cooked_at).toLocaleDateString('fr-FR')}.`:'Aucune préparation enregistrée.'}</p>}
    {life.isError&&<p role="alert" className="text-sm">Ta sélection ne peut pas être relue. <Button className="min-h-11" variant="link" onClick={()=>void life.refetch()}>Réessayer</Button></p>}
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <Dialog open={confirm} onOpenChange={open=>{if(!busy)setConfirm(open);}}><DialogContent><DialogHeader><DialogTitle>Tu as préparé {name} ?</DialogTitle><DialogDescription>Ce retour enregistre le plat dans ton historique et le retire de « À cuisiner bientôt ». La mise à jour du stock se fait depuis le parcours « Commencer ».</DialogDescription></DialogHeader><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={()=>void save('cooked')}>Confirmer : je l’ai faite</Button><Button variant="outline" disabled={busy} onClick={()=>setConfirm(false)}>Annuler</Button></div>{error&&<p role="alert">{error}</p>}</DialogContent></Dialog>
    {recorded&&<p role="status" className="text-sm">Préparation enregistrée.</p>}
    {detail&&(recorded||state?.last_cooked_at)&&<AfterCookingFeedback owner={owner} recipe={recipe}/>}
  </div>;
}
