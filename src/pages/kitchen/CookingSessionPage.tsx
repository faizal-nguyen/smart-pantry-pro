import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { allocateCookingStock, type CookingAdjustment, type RecipeStockPreview } from '@smart/shared';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useOwnedValue } from '@/lib/ownedStorage';
import { CookingSessionSchema, patchCookingSession, confirmCookingSession, recoverCookingConfirmation, timerRemaining, type CookingSession } from '@/services/cookingSessions';
import { previewRecipeStock, undoStockCommand } from '@/services/stockCommands';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { pantryDateLabel } from '@smart/shared';
type Fields = Record<number,{ quantity:string; unit:string; lot:string; outside:boolean }>;
const stateLabels: Record<CookingSession['state'],string> = { prepared:'Prête à commencer',in_progress:'En cours',review:'À confirmer',pending:'Confirmation à vérifier',done:'Repas enregistré',error:'À corriger',abandoned:'Cuisine abandonnée' };
export default function CookingSessionPage() {
  const user = useAuthenticatedUser(), { sessionId } = useParams();
  const [sessions,,storageError] = useOwnedValue<CookingSession[]>(user.id,'cooking-sessions',[]);
  const [fields,setFields,fieldsError] = useOwnedValue<Fields>(user.id,`cooking-fields:${sessionId}`,{});
  const parsed = CookingSessionSchema.safeParse((Array.isArray(sessions) ? sessions : []).find(item => item.id === sessionId));
  const session = parsed.success && parsed.data.owner === user.id ? parsed.data : null;
  const [error,setError] = useState<string|null>(null), [busy,setBusy] = useState(false), [preview,setPreview] = useState<RecipeStockPreview|null>(null);
  const [now,setNow] = useState(Date.now()), [minutes,setMinutes] = useState('5'), [abandon,setAbandon] = useState(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (session?.state==='in_progress') stepHeading.current?.focus(); },[session?.state,session?.step]);
  useEffect(() => { if (session?.state==='done') setError(null); },[session?.state]);
  const fail = (value:unknown) => setError(value instanceof Error ? value.message : 'Action non confirmée.');
  const change = (patch:Partial<CookingSession>) => { if (!session) return; try { patchCookingSession(user.id,session.id,patch); setError(null); } catch (value) { fail(value); } };
  useEffect(() => { const ticker = window.setInterval(() => setNow(Date.now()),1000); return () => window.clearInterval(ticker); },[]);
  useEffect(() => {
    if (!session || !['review','error'].includes(session.state)) return;
    let active = true; setPreview(null);
    void previewRecipeStock(session.recipe,session.servings).then(value => { if (active) setPreview(value); }).catch(value => { if (active) fail(value); });
    return () => { active=false; };
    // Identity/scalars intentionally avoid re-fetching on each review-field edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[session?.id,session?.state,session?.servings,session?.recipe_version]);
  useEffect(() => {
    if (!session?.command || session.state !== 'pending') return;
    let active = true;
    void recoverCookingConfirmation(user.id,session.id).catch(value => {
      if (active) setError(value instanceof ApiError && value.status === 404 ? 'Le serveur n’a pas encore confirmé ce repas. Réessayez la même confirmation.' : value instanceof Error ? value.message : 'Résultat à vérifier.');
    });
    return () => { active=false; };
    // One receipt check per persisted command/state transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[user.id,session?.id,session?.command?.command_id,session?.state]);
  if (!session || storageError) return <div className="p-4 space-y-4"><h1 className="text-xl font-semibold">Session indisponible</h1><p role="alert">{storageError || 'Cette progression n’est pas accessible sur cet appareil et ce compte.'}</p><Button asChild><Link to="/kitchen">Aujourd’hui</Link></Button></div>;
  const field = (index:number) => fields[index] ?? { quantity:session.ingredients[index].quantity == null ? '' : String(Number((session.ingredients[index].quantity! * session.servings/session.base_servings).toFixed(9))),unit:session.ingredients[index].unit ?? '',lot:'',outside:session.outside_inventory.includes(index) };
  const updateField = (index:number,patch:Partial<Fields[number]>) => { try { setFields({ ...fields,[index]:{ ...field(index),...patch } }); } catch (value) { fail(value); } };
  const adjustments: CookingAdjustment[] = [], outside:number[] = [];
  let reviewError:string|null = fieldsError;
  try {
    session.ingredients.forEach((ingredient,index) => {
      const item = field(index);
      if (item.outside) { outside.push(index); return; }
      const quantity = Number(item.quantity.replace(',','.'));
      if (!item.quantity.trim() || !Number.isFinite(quantity) || quantity < 0 || quantity>1e9 || !item.unit.trim()) throw new Error(`Vérifiez la quantité et l’unité de ${ingredient.ingredient_name}.`);
      const lot = item.lot ? preview?.lots.find(row => row.id === item.lot) : undefined;
      if (item.lot && !lot) throw new Error(`Le lot choisi pour ${ingredient.ingredient_name} n’est plus accessible.`);
      adjustments.push({ ingredient_index:index,quantity,unit:item.unit,...(lot ? { inventory_id:lot.id,inventory_product_id:lot.product_id } : {}) });
    });
  } catch (value) { reviewError = (value as Error).message; }
  const allocation = preview && !reviewError ? allocateCookingStock(session.ingredients,preview.lots,session.base_servings,session.servings,adjustments,outside) : null;
  const confirm = async () => {
    if (busy) return; setBusy(true); setError(null);
    try {
      if (!session.command) patchCookingSession(user.id,session.id,{ adjustments,outside_inventory:outside });
      await confirmCookingSession(user.id,session.id,preview ?? undefined);
    } catch (value) { fail(value); }
    finally { setBusy(false); }
  };
  const frozen = session.state === 'pending' || session.state === 'done' || session.state === 'abandoned';
  return <div className="mx-auto max-w-2xl p-4 space-y-5">
    <Link className="inline-flex min-h-11 items-center underline" to={`/kitchen/recipes/${session.recipe.id}`}>Voir la recette</Link>
    <header><p className="text-sm text-muted-foreground" role="status">{stateLabels[session.state]}</p><h1 className="text-2xl font-semibold break-words">{session.name}</h1><p className="text-sm text-muted-foreground">Progression conservée sur cet appareil. Le stock change seulement après confirmation.</p></header>
    {(error || session.error || fieldsError) && <p role="alert" className="rounded-lg border border-destructive p-3 text-destructive">{error || session.error || fieldsError}</p>}
    {!frozen && <label className="flex items-center gap-3">Portions<Input aria-label="Nombre de portions" type="number" min="1" max="100" className="w-24 h-11" value={session.servings} onChange={e => {
      const value = Number(e.target.value); if (!Number.isFinite(value) || value<1 || value>100) return;
      try { setFields({}); change({ servings:value,adjustments:[],outside_inventory:[] }); } catch (failure) { fail(failure); }
    }} /></label>}
    {session.state === 'prepared' && <><ul className="space-y-2">{session.ingredients.map((ingredient,index) => <li key={index}>{ingredient.ingredient_name} · {ingredient.quantity == null ? 'quantité à vérifier' : Number((ingredient.quantity * session.servings/session.base_servings).toFixed(6))} {ingredient.unit}</li>)}</ul><Button className="min-h-11 w-full" onClick={() => change({ state:'in_progress' })}>Commencer les étapes</Button></>}
    {session.state === 'in_progress' && <>
      <Card><CardContent className="p-5 space-y-4"><h2 ref={stepHeading} tabIndex={-1} className="text-lg font-semibold">Étape {Math.min(session.step+1,session.steps.length || 1)} sur {session.steps.length || 1}</h2><p className="whitespace-pre-wrap text-lg">{session.steps[session.step] ?? 'Préparez le repas puis vérifiez les ingrédients réellement utilisés.'}</p><div className="flex flex-wrap gap-2"><Button className="min-h-11" variant="outline" disabled={session.step === 0} onClick={() => change({ step:session.step-1 })}>Précédente</Button>{session.step < session.steps.length-1 ? <Button className="min-h-11" onClick={() => change({ step:session.step+1 })}>Suivante</Button> : <Button className="min-h-11 h-auto whitespace-normal py-3" onClick={() => change({ state:'review' })}>J’ai terminé : vérifier les ingrédients</Button>}</div></CardContent></Card>
      <section className="space-y-3" aria-label="Minuteurs"><h2 className="font-semibold">Minuteur de cette étape</h2><div className="flex flex-wrap gap-2"><Input aria-label="Durée du minuteur en minutes" className="w-24 h-11" inputMode="decimal" value={minutes} onChange={e => setMinutes(e.target.value)} /><Button className="min-h-11" variant="outline" onClick={() => { const duration = Number(minutes.replace(',','.'))*60000; if (!Number.isFinite(duration) || duration<=0 || duration>86400000) { setError('Choisissez une durée entre 1 seconde et 24 heures.'); return; } change({ timers:[...session.timers,{ id:crypto.randomUUID(),step:session.step,duration_ms:duration,remaining_ms:duration,ends_at:Date.now()+duration }] }); }}>Démarrer le minuteur</Button></div>
        {session.timers.map(timer => { const left = timerRemaining(timer,now); return <div key={timer.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3"><span>Étape {timer.step+1} · {left === 0 ? 'Terminé' : `${Math.floor(left/60000)} min ${String(Math.floor(left/1000)%60).padStart(2,'0')} s`}</span><Button className="min-h-11" variant="outline" onClick={() => change({ timers:session.timers.map(item => item.id === timer.id ? { ...item,remaining_ms:left,ends_at:timer.ends_at == null ? Date.now()+left : null } : item) })}>{timer.ends_at == null ? 'Reprendre' : 'Pause'}</Button><Button className="min-h-11" variant="ghost" onClick={() => change({ timers:session.timers.filter(item => item.id !== timer.id) })}>Retirer le minuteur</Button></div>; })}
      </section>
    </>}
    {['review','error'].includes(session.state) && <section className="space-y-4" aria-label="Ingrédients réellement utilisés"><h2 className="text-xl font-semibold">Ce que vous avez utilisé</h2><p className="text-sm text-muted-foreground">Les quantités concernent le repas entier. Choisissez un autre lot pour déclarer une substitution, 0 pour un ingrédient non utilisé, ou « hors stock ».</p>
      {session.ingredients.map((ingredient,index) => { const item = field(index), missing = allocation?.missing.find(row => row.ingredient_index === index); return <fieldset key={index} className="rounded-xl border p-3 space-y-3"><legend className="px-1 font-medium">{ingredient.ingredient_name}</legend>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={item.outside} onChange={e => updateField(index,{ outside:e.target.checked })} />Utilisé hors de mon stock suivi</label>
        {!item.outside && <><div className="grid grid-cols-2 gap-2"><label className="text-sm">Quantité utilisée<Input inputMode="decimal" aria-label={`Quantité utilisée de ${ingredient.ingredient_name}`} value={item.quantity} onChange={e => updateField(index,{ quantity:e.target.value })} /></label><label className="text-sm">Unité<Input aria-label={`Unité utilisée de ${ingredient.ingredient_name}`} value={item.unit} onChange={e => updateField(index,{ unit:e.target.value })} /></label></div>
        <label className="block text-sm">Lot ou substitution<select className="mt-1 w-full h-11 rounded-md border bg-background px-2" aria-label={`Lot pour ${ingredient.ingredient_name}`} value={item.lot} onChange={e => updateField(index,{ lot:e.target.value })}><option value="">Lots correspondants, dates les plus proches en premier</option>{preview?.lots.filter(lot => lot.quantity>0).map(lot => <option key={lot.id} value={lot.id}>{lot.product_name} · {lot.quantity} {lot.unit} · {pantryDateLabel(lot.expiry_date)}</option>)}</select></label>
        {missing ? <p role="status" className="text-destructive">Stock insuffisant ou quantité/unité à vérifier.</p> : allocation?.allocations.filter(row => row.ingredient_index === index).map(row => <p className="text-sm text-muted-foreground" key={row.inventory_id}>Lot {preview?.lots.find(lot => lot.id===row.inventory_id)?.product_name} : retirer {row.quantity} {row.unit} · {pantryDateLabel(preview?.lots.find(lot => lot.id===row.inventory_id)?.expiry_date)}</p>)}</>}
      </fieldset>; })}
      {reviewError && <p role="alert" className="text-destructive">{reviewError}</p>}
      {preview && preview.recipe.version !== session.recipe_version && <><p role="alert">La recette a changé depuis le début de cette cuisine.</p><Button variant="outline" onClick={() => { try { setFields({}); change({ recipe_version:preview.recipe.version,ingredients:preview.recipe.ingredients,base_servings:preview.recipe.servings,adjustments:[],outside_inventory:[] }); } catch (failure) { fail(failure); } }}>Relire les ingrédients actuels</Button></>}
      {!preview && error && <Button className="min-h-11 h-auto whitespace-normal py-3" variant="outline" onClick={() => { setError(null); void previewRecipeStock(session.recipe,session.servings).then(setPreview).catch(fail); }}>Réessayer la vérification du stock</Button>}
      <div className="flex flex-col gap-2"><Button className="min-h-11 whitespace-normal h-auto py-3" disabled={busy || !preview || !!reviewError || !!allocation?.missing.length || preview.recipe.version !== session.recipe_version} onClick={() => void confirm()}>Confirmer et mettre à jour le stock</Button><Button className="min-h-11" variant="outline" onClick={() => change({ state:'in_progress' })}>Revenir aux étapes</Button></div>
    </section>}
    {session.state === 'pending' && <><p>La saisie envoyée est conservée. Le bouton vérifie le reçu puis reprend la même commande si nécessaire.</p><Button className="min-h-11" disabled={busy} onClick={() => void confirm()}>Vérifier la confirmation</Button></>}
    {session.state === 'done' && <><p role="status">Le stock et le journal sont confirmés. Ce repas ne sera pas enregistré une deuxième fois.</p><Button className="min-h-11" asChild><Link to="/pantry/inventory">Voir mon stock</Link></Button><Button className="min-h-11" variant="outline" disabled={busy} onClick={() => { if (!session.command) return; setBusy(true); void undoStockCommand(session.command.command_id).then(() => change({ state:'abandoned',error:null })).catch(fail).finally(() => setBusy(false)); }}>Annuler ce repas</Button><Button className="min-h-11" variant="ghost" asChild><Link to={`/kitchen/recipes/${session.recipe.id}`}>Mettre la recette en favori</Link></Button></>}
    {!frozen && <>{!abandon ? <Button className="min-h-11" variant="ghost" onClick={() => setAbandon(true)}>Abandonner cette cuisine</Button> : <div className="rounded-lg border p-3 space-y-2"><p>Aucun ingrédient ne sera déduit.</p><Button className="min-h-11" variant="outline" onClick={() => change({ state:'abandoned' })}>Confirmer l’abandon</Button><Button className="min-h-11" variant="ghost" onClick={() => setAbandon(false)}>Continuer la cuisine</Button></div>}</>}
  </div>;
}
