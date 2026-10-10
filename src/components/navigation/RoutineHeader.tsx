import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageCircle, Settings } from 'lucide-react';
import { useFamilyMode } from '@/hooks/useFamilyMode';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useOwnedValue } from '@/lib/ownedStorage';
import { postAssistantText, newClientRequestId } from '@/services/assistantApi';
import { supabase } from '@/integrations/supabase/client';
import { CookingSessionSchema, type CookingSession } from '@/services/cookingSessions';
export default function RoutineHeader() {
  const user = useAuthenticatedUser(), location = useLocation();
  const { canAccessSection, isFamilyModeActive } = useFamilyMode();
  const [open,setOpen] = useState(false), [busy,setBusy] = useState(false), [answer,setAnswer] = useState(''), [error,setError] = useState<string|null>(null);
  const [question,setQuestion,storageError] = useOwnedValue(user.id,`assistant:${location.pathname}`, '');
  const [sessions] = useOwnedValue<CookingSession[]>(user.id,'cooking-sessions',[]);
  const cookingId = location.pathname.match(/^\/kitchen\/cooking\/([^/]+)/)?.[1];
  const cooking = CookingSessionSchema.safeParse((Array.isArray(sessions) ? sessions : []).find(item=>CookingSessionSchema.safeParse(item).success && item.id===cookingId && item.owner===user.id));
  const recipe = cooking.success ? cooking.data.recipe.id : location.pathname.match(/^\/kitchen\/recipes\/([^/]+)/)?.[1];
  const product = new URLSearchParams(location.search).get('product');
  const context = JSON.stringify({ route:location.pathname,...(recipe ? { recipe_id:recipe,recipe_source:cooking.success ? cooking.data.recipe.source : 'auto' } : {}),...(cooking.success ? { cooking_session_id:cooking.data.id,servings:cooking.data.servings,step:cooking.data.step } : {}),...(product ? { inventory_id:product } : {}) });
  const ask = async () => {
    if (!question.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await postAssistantText({ text:`Contexte de lecture explicite : ${context}\n${question}`,clientRequestId:newClientRequestId(),expectedUserId:user.id,
        allowedTools:['read_inventory','read_shopping_list','search_recipes','suggest_recipes_for_context','read_user_memories','ask_clarification'] });
      if ((await supabase.auth.getSession()).data.session?.user.id !== user.id) throw new Error('Le compte a changé. Reprenez avec le compte précédent.');
      setAnswer(result.message);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Aide indisponible. Ta question reste conservée.'); }
    finally { setBusy(false); }
  };
  return <>
    <header className="flex items-center justify-between gap-2 border-b px-4 py-2 safe-area-inset-top">
      <Link to="/kitchen" className="flex min-h-11 items-center font-semibold text-sm">Smart Pantry</Link>
      <div className="flex gap-1">
        {(!isFamilyModeActive || canAccessSection('assistant')) && <Button variant="ghost" className="min-h-11 gap-2" onClick={() => setOpen(true)}><MessageCircle className="w-4 h-4" aria-hidden="true" />Aide</Button>}
        {(!isFamilyModeActive || canAccessSection('settings')) && <Button variant="ghost" size="icon" className="h-11 w-11" asChild><Link to="/settings" aria-label="Profil et paramètres"><Settings className="w-5 h-5" aria-hidden="true" /></Link></Button>}
      </div>
    </header>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="routine-dialog"><DialogHeader><DialogTitle>Aide pour cette tâche</DialogTitle><DialogDescription>{recipe ? 'Cette recette accompagne ta question.' : product ? 'Ce lot accompagne ta question.' : 'Ta question sera accompagnée de la page ouverte.'}</DialogDescription></DialogHeader>
      <label className="space-y-2">Ta question<Textarea value={question} onChange={e => { try { setQuestion(e.target.value); } catch (failure) { setError((failure as Error).message); } }} placeholder="Par quoi remplacer cet ingrédient ?" /></label>
      {(error || storageError) && <p role="alert" className="text-destructive">{error || storageError}</p>}
      <Button className="min-h-11" disabled={busy || !question.trim() || !!storageError} onClick={() => void ask()}>{busy ? 'Recherche…' : 'Demander'}</Button>
      {answer && <p role="status" className="whitespace-pre-wrap text-sm">{answer}</p>}
      <Button variant="outline" className="min-h-11" asChild><Link to="/assistant" onClick={() => setOpen(false)}>Ouvrir les conversations</Link></Button>
      <Button variant="ghost" className="min-h-11" asChild><Link to="/settings?section=assistant-memory" onClick={()=>setOpen(false)}>Mémoire de l’assistant</Link></Button>
    </DialogContent></Dialog>
  </>;
}
