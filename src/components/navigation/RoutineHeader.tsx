import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { keepsSessionTurns, type AssistantSessionMessage } from '@smart/shared';
import { useFamilyMode } from '@/hooks/useFamilyMode';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useOwnedValue } from '@/lib/ownedStorage';
import { appendDictation, useDictation } from '@/hooks/useDictation';
import { DictationMicButton, DictationStatusLine } from '@/components/assistant/DictationControls';
import { postAssistantText, newClientRequestId } from '@/services/assistantApi';
import { CookingSessionSchema, type CookingSession } from '@/services/cookingSessions';
import KitchenBrand from './KitchenBrand';
import { useNavigationConfig, type NavigationItem } from './NavigationHub';
import { isNavigationActive } from '@/lib/routineRoutes';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
const CONVERSATION_TTL = 24 * 3600 * 1000;
export default function RoutineHeader({ navigationConfig }: { navigationConfig?: { mainNavigation: NavigationItem[]; specialNavigation: NavigationItem[] } }) {
  const user = useAuthenticatedUser(), location = useLocation();
  const defaults = useNavigationConfig();
  const navigation = navigationConfig ?? defaults;
  const isHome = location.pathname === '/kitchen';
  const profileName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : user.email ?? 'Kitchen';
  const profileInitial = profileName.trim().slice(0,1).toLocaleUpperCase('fr-FR') || 'K';
  const { canAccessSection, isFamilyModeActive } = useFamilyMode();
  const product = new URLSearchParams(location.search).get('product');
  const task = location.pathname + (product ? '?product=' + product : '');
  const key = user.id + ':' + task;
  const active = useRef(key); active.current = key;
  const [open,setOpen] = useState(false);
  const helpTrigger=useRef<HTMLButtonElement>(null),profileTrigger=useRef<HTMLButtonElement>(null);
  const [state,setState] = useState<{ key: string; busy: boolean; answer: string; error: string | null;
    session: AssistantSessionMessage[]; revision?: number }>({ key, busy:false, answer:'', error:null, session:[] });
  const current = state.key === key ? state : { key, busy:false, answer:'', error:null, session:[] };
  const [question,setQuestion,storageError] = useOwnedValue(user.id, 'assistant:' + task, '');
  const [handle,setHandle,handleError] = useOwnedValue<{ id: string | null; at: number }>(user.id, 'assistant-conversation:' + task, { id:null, at:0 });
  const [sessions] = useOwnedValue<CookingSession[]>(user.id,'cooking-sessions',[]);
  const editQuestion = (value: string) => { try { setQuestion(value); } catch (failure) { setState({ ...current,error:(failure as Error).message }); } };
  // V10-03E — dictation fills the question; « Demander » keeps the same read-only scope.
  const dictation = useDictation({ owner:user.id, onTranscript:text => editQuestion(appendDictation(question,text)) });
  const dictating = dictation.status === 'recording' || dictation.status === 'transcribing';
  useEffect(() => dictation.cancel,[key,open,dictation.cancel]);
  useEffect(() => {
    const clear = (event: Event) => { if ((event as CustomEvent<{owner?:string}>).detail?.owner === user.id) setState({ key, busy:false, answer:'', error:null, session:[] }); };
    window.addEventListener('assistant-memory-changed',clear);
    return () => window.removeEventListener('assistant-memory-changed',clear);
  },[key,user.id]);
  const cookingId = location.pathname.match(/^\/kitchen\/cooking\/([^/]+)/)?.[1];
  const cooking = CookingSessionSchema.safeParse((Array.isArray(sessions) ? sessions : []).find(item=>CookingSessionSchema.safeParse(item).success && item.id===cookingId && item.owner===user.id));
  const recipe = cooking.success ? cooking.data.recipe.id : location.pathname.match(/^\/kitchen\/recipes\/([^/]+)/)?.[1];
  const context = JSON.stringify({ route:location.pathname,...(recipe ? { recipe_id:recipe,recipe_source:cooking.success ? cooking.data.recipe.source : 'auto' } : {}),...(cooking.success ? { cooking_session_id:cooking.data.id,servings:cooking.data.servings,step:cooking.data.step } : {}),...(product ? { inventory_id:product } : {}) });
  const ask = async () => {
    if (!question.trim() || current.busy || dictating) return;
    setState({ ...current, busy:true, error:null });
    try {
      const conversationId = handle && typeof handle.id === 'string' && Date.now() - handle.at < CONVERSATION_TTL ? handle.id : undefined;
      const result = await postAssistantText({ text: 'Contexte de lecture explicite : ' + context + '\n' + question,
        clientRequestId:newClientRequestId(), expectedUserId:user.id, conversationId,
        sessionMessages:current.session, sessionRevision:current.revision,
        allowedTools:['read_inventory','read_shopping_list','search_recipes','suggest_recipes_for_context','read_user_memories','ask_clarification'] });
      if (active.current !== key) return;
      if (result.conversation_id) setHandle({ id:result.conversation_id, at:Date.now() });
      setState({ key,busy:false,error:null,answer:result.message,revision:result.memory_revision,
        session:result.conversation_id ? [] : [...(keepsSessionTurns(current.revision, result) ? current.session : []),
          { role:'user',content:question.slice(0,500) },{ role:'assistant',content:result.message.slice(0,500) }].slice(-8) as AssistantSessionMessage[] });
    } catch (failure) {
      if (active.current === key) setState({ ...current,busy:false,error:failure instanceof Error ? failure.message : 'Aide indisponible. Votre question reste conservée.' });
    }
  };
  const startNew = () => {
    if (current.busy) return;
    try { setHandle({ id:null,at:0 }); setState({ key,busy:false,answer:'',error:null,session:[] }); }
    catch (failure) { setState({ ...current,error:(failure as Error).message }); }
  };
  return <>
    <header className="kitchen-header">
      <div className="kitchen-header-inner">
      <Link to="/kitchen" className="flex min-h-11 shrink-0 items-center" aria-label="Kitchen OS — accueil"><KitchenBrand /></Link>
      <nav className="kitchen-desktop-nav" aria-label="Navigation principale">
        {navigation.mainNavigation.map(item => {
          const active = isNavigationActive(location.pathname,item.path);
          return item.subItems?.length ? <DropdownMenu key={item.id}>
            <DropdownMenuTrigger asChild><button className="kitchen-nav-link" data-active={active} aria-current={active ? 'page' : undefined}>{item.label}<ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /></button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" sideOffset={10} className="w-64 p-2">
              <DropdownMenuItem asChild className="min-h-11"><Link to={item.path}>Toutes les recettes</Link></DropdownMenuItem>
              {item.subItems.map(sub => <DropdownMenuItem key={sub.id} asChild className="min-h-11"><Link to={sub.path}>{sub.label}</Link></DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu> : <Link key={item.id} to={item.path} className="kitchen-nav-link" data-active={active} aria-current={active ? 'page' : undefined}>{item.label}{!!item.badge && <span className={item.id==='shopping' ? 'kitchen-nav-count' : 'sr-only'}>{item.badge}<span className="sr-only"> à traiter</span></span>}</Link>;
        })}
      </nav>
      <div className="flex items-center gap-1">
        {!isHome && (!isFamilyModeActive || canAccessSection('assistant')) && <Button ref={helpTrigger} variant="ghost" className="min-h-11 gap-2" aria-label="Aide" onClick={() => setOpen(true)}><MessageCircle className="w-4 h-4" aria-hidden="true" /><span className="hidden xs:inline">Aide</span></Button>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button ref={profileTrigger} variant="ghost" size="icon" className="kitchen-profile h-11 w-11" aria-label="Profil et paramètres"><span className="kitchen-profile-initial" aria-hidden="true">{profileInitial}</span></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={10} className="w-64 p-2">
            <DropdownMenuLabel>Ma cuisine</DropdownMenuLabel>
            {(!isFamilyModeActive || canAccessSection('assistant')) && <DropdownMenuItem className="min-h-11" onSelect={()=>setOpen(true)}>Aide pour cette tâche</DropdownMenuItem>}
            {navigation.mainNavigation.flatMap(item=>item.subItems ?? []).map(sub=><DropdownMenuItem key={sub.id} asChild className="min-h-11"><Link to={sub.path}>{sub.label}</Link></DropdownMenuItem>)}
            <DropdownMenuSeparator />
            {navigation.specialNavigation.filter(item=>!isFamilyModeActive || canAccessSection(item.section)).map(item=><DropdownMenuItem key={item.id} asChild className="min-h-11"><Link to={item.path}>{item.label}</Link></DropdownMenuItem>)}
            {(!isFamilyModeActive || canAccessSection('settings')) && <DropdownMenuItem asChild className="min-h-11"><Link to="/settings?section=account">Mon compte et déconnexion</Link></DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>
    </header>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="routine-dialog" onCloseAutoFocus={event=>{const trigger=isHome ? profileTrigger.current:helpTrigger.current;if(trigger?.isConnected){event.preventDefault();trigger.focus();}}}><DialogHeader><DialogTitle>Aide pour cette tâche</DialogTitle><DialogDescription>{recipe ? 'Cette recette accompagne votre question.' : product ? 'Ce lot accompagne votre question.' : 'Votre question sera accompagnée de la page ouverte.'} Vous pouvez poursuivre cet échange.</DialogDescription></DialogHeader>
      <label className="space-y-2">Votre question<Textarea value={question} disabled={dictating} onChange={e => editQuestion(e.target.value)} placeholder="Par quoi remplacer cet ingrédient ?" /></label>
      <div className="flex items-center gap-2"><DictationMicButton dictation={dictation} disabled={current.busy || !!storageError || !!handleError} /><DictationStatusLine dictation={dictation} className="flex-1" />{dictation.status === 'idle' && <span className="text-sm text-muted-foreground">Dictez, relisez, puis demandez.</span>}</div>
      {(current.error || storageError || handleError) && <p role="alert" className="text-destructive">{current.error || storageError || handleError}</p>}
      <Button className="min-h-11" disabled={current.busy || dictating || !question.trim() || !!storageError || !!handleError} onClick={() => void ask()}>{current.busy ? 'Recherche…' : 'Demander'}</Button>
      {current.answer && <p role="status" className="whitespace-pre-wrap text-sm">{current.answer}</p>}
      <Button variant="outline" className="min-h-11" disabled={current.busy} onClick={startNew}>Nouvelle conversation</Button>
      <Button variant="outline" className="min-h-11" asChild><Link to="/assistant" onClick={() => setOpen(false)}>Ouvrir les conversations</Link></Button>
      <Button variant="ghost" className="min-h-11" asChild><Link to="/settings?section=assistant-memory" onClick={()=>setOpen(false)}>Mémoire de l’assistant</Link></Button>
    </DialogContent></Dialog>
  </>;
}
