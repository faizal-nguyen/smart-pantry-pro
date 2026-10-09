import { readShareCapture } from '@/services/shareCaptures';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { calendarDaysUntil, pantryDateLabel } from '@smart/shared';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useInventory } from '@/hooks/useInventory';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useRoutinePreferences } from '@/hooks/useRoutinePreferences';
import PersonalizedRecipeSuggestions from '@/components/recipes/PersonalizedRecipeSuggestions';
import { useCalendarNow } from '@/hooks/useCalendarNow';
import { useOwnedValue } from '@/lib/ownedStorage';
import { CookingSessionSchema, type CookingSession } from '@/services/cookingSessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import QuickStockDialog from '@/components/inventory/QuickStockDialog';
import type { SuggestRecommendationsInput } from '@/services/recommendationsApi';
export default function KitchenDashboard() {
  const user = useAuthenticatedUser(), stock = useInventory(), shopping = useShoppingList(), preferences = useRoutinePreferences(), now = useCalendarNow();
  const [saved,,sessionsError] = useOwnedValue<CookingSession[]>(user.id,'cooking-sessions',[]);
  const emptyContext={ minutes:'',query:'',occasion:'dinner',servings:'',craving:'any' };
  const [meal,setMeal]=useState({ owner:user.id,value:emptyContext });
  const context=meal.owner===user.id ? meal.value : emptyContext;
  const setContext=(value:typeof emptyContext)=>setMeal({ owner:user.id,value });
  const [add,setAdd] = useState(false), [error,setError] = useState<string|null>(null), [saving,setSaving] = useState(false);
  const input:SuggestRecommendationsInput = { goal:'tonight',...(context.minutes ? { timeLimitMinutes:Number(context.minutes) } : {}),mealType:context.occasion as 'lunch'|'dinner'|'snack',...(context.query ? { query:context.query } : {}),...(context.servings ? { servings:Number(context.servings) } : {}),craving:context.craving as SuggestRecommendationsInput['craving'] };
  let share = null;
  try { share = readShareCapture(user.id); } catch { /* Retain corrupt capture; opening the capture page displays the error. */ }
  const active = (Array.isArray(saved) ? saved : []).map(item => CookingSessionSchema.safeParse(item)).filter((parsed):parsed is { success:true;data:CookingSession } => parsed.success).map(parsed => parsed.data).find(item => item.owner===user.id && !['done','abandoned'].includes(item.state));
  const soon = stock.inventory.filter(item => { const days=calendarDaysUntil(item.expiry_date,now); return item.quantity>0 && days != null && days<=7; }).sort((a,b) => (a.expiry_date ?? '').localeCompare(b.expiry_date ?? '')).slice(0,3);
  const bought = shopping.getPurchasedCount();
  const next = active ? { title:`Reprendre ${active.name}`,detail:active.state==='pending' ? 'Une confirmation reste à vérifier.' : `Étape ${active.step+1} · ${active.servings} portion(s)`,path:`/kitchen/cooking/${active.id}`,cta:'Reprendre ma cuisine' }
    : shopping.pendingTransfer || bought>0 ? { title:'Vos achats attendent leur rangement',detail:`${bought} produit(s) coché(s).`,path:'/shopping/list',cta:'Ranger mes achats' }
    : soon.length ? { title:`Vérifier ${soon[0].product?.name ?? 'un produit'}`,detail:pantryDateLabel(soon[0].expiry_date,now),path:`/pantry/inventory?product=${soon[0].id}`,cta:'Vérifier mon stock' }
    : { title:'Choisir le prochain repas',detail:'Retrouvez vos recettes et les ingrédients disponibles.',path:'/kitchen/recipes',cta:'Choisir une recette' };
  const advance = async (introduction:'stock'|'recipe'|'done'|'skipped') => { if (saving) return; setSaving(true); setError(null); try { await preferences.update({ introduction }); } catch (failure) { setError((failure as Error).message); } finally { setSaving(false); } };
  const intro = preferences.data?.introduction;
  const updateContext = (values:Partial<typeof context>) => { try { setContext({ ...context,...values }); } catch (failure) { setError((failure as Error).message); } };
  return <div className="mx-auto max-w-4xl p-4 space-y-5">
    <header><h1 className="text-2xl font-semibold">Aujourd’hui</h1><p className="text-muted-foreground">Savoir quoi cuisiner avec ce que vous avez.</p></header>
    <Card><CardContent className="p-5 space-y-3"><h2 className="text-xl font-semibold">{next.title}</h2><p className="text-sm text-muted-foreground">{next.detail}</p><Button className="min-h-11 w-full sm:w-auto" asChild><Link to={next.path}>{next.cta}</Link></Button>{(stock.loading || shopping.loading) && <p role="status" className="text-sm">Vérification du stock et des achats…</p>}{(stock.error || shopping.error || sessionsError) && <p role="alert" className="text-sm">Certaines données n’ont pas pu être lues. <button className="underline min-h-11" onClick={() => { void stock.refetch(); void shopping.refetch().catch(() => undefined); }}>Réessayer</button></p>}</CardContent></Card>
    {share && !['saved','captured'].includes(share.status) && <div className="rounded-lg border p-3 space-y-2"><p>Un lien de recette reste à reprendre.</p><Button className="min-h-11" variant="outline" asChild><Link to="/share-target">Reprendre le partage</Link></Button></div>}
    {intro && !['done','skipped'].includes(intro) && <Card><CardContent className="p-4 space-y-3"><h2 className="font-semibold">Premiers pas, à votre rythme</h2><p className="text-sm">{intro==='new' || intro==='stock' ? 'Ajoutez quelques ingrédients, puis choisissez un repas. Aucun profil complet n’est nécessaire.' : 'Enregistrez ou commencez une recette. Vos préférences peuvent attendre.'}</p><div className="flex flex-wrap gap-2">{intro!=='recipe' && <Button className="min-h-11" onClick={() => setAdd(true)}>Ajouter quelques ingrédients</Button>}<Button className="min-h-11" variant="outline" asChild><Link to="/kitchen/recipes">Choisir une première recette</Link></Button><Button className="min-h-11" variant="ghost" disabled={saving} onClick={() => void advance('skipped')}>Passer l’introduction</Button><Button className="min-h-11" variant="ghost" disabled={saving} onClick={() => void advance('done')}>J’ai pris mes repères</Button></div></CardContent></Card>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <section className="space-y-3" aria-labelledby="meal-ideas"><h2 id="meal-ideas" className="text-xl font-semibold">Idées pour le repas</h2><div className="flex flex-wrap gap-2"><label className="text-sm flex-1 min-w-[130px]">Temps disponible<select className="mt-1 w-full h-11 rounded-md border bg-background px-2" value={context.minutes} onChange={e => updateContext({ minutes:e.target.value })}><option value="">Temps du profil</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 heure</option></select></label><label className="text-sm flex-1 min-w-[130px]">Repas<select className="mt-1 w-full h-11 rounded-md border bg-background px-2" value={context.occasion} onChange={e => updateContext({ occasion:e.target.value })}><option value="lunch">Déjeuner</option><option value="dinner">Dîner</option><option value="snack">Collation</option></select></label><label className="text-sm flex-1 min-w-[130px]">Envie<select className="mt-1 w-full h-11 rounded-md border bg-background px-2" value={context.query} onChange={e => updateContext({ query:e.target.value })}><option value="">Toutes les envies</option><option value="soupe">Soupe</option><option value="salade">Salade</option><option value="pâtes">Pâtes</option><option value="riz">Riz</option></select></label></div>
      <div className="flex flex-wrap gap-2"><label className="text-sm flex-1 min-w-[130px]">Portions pour ce repas<select className="mt-1 w-full h-11 rounded-md border bg-background px-2" value={context.servings} onChange={e=>updateContext({ servings:e.target.value })}><option value="">Profil ou recette</option>{[1,2,3,4,6,8].map(value=><option key={value} value={value}>{value} portion(s)</option>)}</select></label><label className="text-sm flex-1 min-w-[130px]">Style de repas<select className="mt-1 w-full h-11 rounded-md border bg-background px-2" value={context.craving} onChange={e=>updateContext({ craving:e.target.value })}><option value="any">Indifférent</option><option value="warm">Chaud</option><option value="fresh">Frais</option><option value="comfort">Réconfortant</option></select></label></div>
      <Button className="min-h-11" variant="ghost" onClick={()=>setContext({ minutes:'',query:'',occasion:'dinner',servings:'',craving:'any' })}>Réinitialiser ce repas</Button>
      <PersonalizedRecipeSuggestions input={input} onAddStock={()=>setAdd(true)} />
    </section>
    <section className="space-y-3" aria-labelledby="use-soon"><h2 id="use-soon" className="text-xl font-semibold">À utiliser bientôt</h2>{soon.length>0 ? <ul className="space-y-2">{soon.map(item => <li key={item.id}><Link className="min-h-11 flex flex-wrap justify-between items-center gap-2 rounded-lg border p-3" to={`/pantry/inventory?product=${item.id}`}><span>{item.product?.name} · {item.quantity} {item.unit ?? item.product?.unit_type}</span><span className="text-sm">{pantryDateLabel(item.expiry_date,now)}</span></Link></li>)}</ul> : <p className="text-sm text-muted-foreground">{stock.error ? 'Dates non disponibles pour le moment.' : 'Aucune date proche renseignée pour les produits disponibles.'}</p>}<Button className="min-h-11" variant="outline" asChild><Link to="/pantry/inventory">Voir mon stock</Link></Button></section>
    <nav className="flex flex-wrap gap-2" aria-label="Autres outils"><Button className="min-h-11" variant="ghost" asChild><Link to="/kitchen/meal-planning">Menus de la semaine</Link></Button><Button className="min-h-11" variant="ghost" asChild><Link to="/settings?section=cooking">Préférences alimentaires</Link></Button><Button className="min-h-11" variant="ghost" asChild><Link to="/kitchen/recipes?tab=import">Enregistrer une recette</Link></Button></nav>
    <QuickStockDialog firstUse open={add} onOpenChange={setAdd} onSaved={() => { void advance('recipe'); void stock.refetch(); setAdd(false); }} />
  </div>;
}
