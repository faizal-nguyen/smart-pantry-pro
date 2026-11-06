import { readShareCapture } from '@/services/shareCaptures';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Milk, Package } from 'lucide-react';
import KitchenWeekPreview from '@/components/meal-planning/KitchenWeekPreview';
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
import MealContextPanel from '@/components/recipes/MealContextPanel';
import { defaultMealContext } from '@/lib/mealContext';
import { useCulinaryDesign } from '@/contexts/CulinaryDesignContext';
import { useNutritionProfile } from '@/hooks/useNutritionProfile';
export default function KitchenDashboard() {
  const user = useAuthenticatedUser(), stock = useInventory(), shopping = useShoppingList(), preferences = useRoutinePreferences(), now = useCalendarNow();
  const [saved,,sessionsError] = useOwnedValue<CookingSession[]>(user.id,'cooking-sessions',[]);
  const emptyContext=defaultMealContext;
  const design=useCulinaryDesign();
  const profile=useNutritionProfile();
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
  const next = active ? { title:`Reprendre ${active.name}`,detail:active.state==='pending' ? 'Une confirmation reste à vérifier.' : `Étape ${active.step+1} · ${active.servings} ${active.servings===1 ? 'portion' : 'portions'}`,path:`/kitchen/cooking/${active.id}`,cta:'Reprendre ma cuisine' }
    : shopping.pendingTransfer || bought>0 ? { title:'Tes achats attendent leur rangement',detail:shopping.pendingTransfer ? 'Un rangement reste à confirmer.' : `${bought} ${bought===1 ? 'produit coché' : 'produits cochés'}.`,path:'/shopping/list',cta:'Ranger mes achats' }
    : null;
  const advance = async (introduction:'stock'|'recipe'|'done'|'skipped') => { if (saving) return; setSaving(true); setError(null); try { await preferences.update({ introduction }); } catch (failure) { setError((failure as Error).message); } finally { setSaving(false); } };
  const intro = preferences.data?.introduction;
  const updateContext = (values:Partial<typeof context>) => { try { setContext({ ...context,...values }); } catch (failure) { setError((failure as Error).message); } };
  return <div className="culinary-page kitchen-today" data-culinary-view={design}>
    <header className="kitchen-today-heading">
      <h1 className="culinary-title"><span className="hidden md:inline">Qu’est-ce qu’on cuisine {context.occasion==='lunch' ? 'ce midi' : context.occasion==='snack' ? 'pour une pause' : 'ce soir'} ?</span><span className="md:hidden">{context.occasion==='lunch' ? 'Ce midi' : context.occasion==='snack' ? 'Pour une pause' : 'Ce soir'}, on cuisine ?</span></h1>
      <p className="kitchen-date">{now.toLocaleDateString('fr-FR',{ weekday:'long',day:'numeric',month:'long',timeZone:'Europe/Paris' })}</p>
    </header>
    {next && <Card className="kitchen-next"><CardContent><div><h2>{next.title}</h2><p>{next.detail}</p></div><Button className="min-h-11" asChild><Link to={next.path}>{next.cta}</Link></Button></CardContent></Card>}
    {(stock.error || shopping.error || sessionsError) && <div role="alert" className="kitchen-notice"><p>Certaines données n’ont pas pu être lues.</p><Button variant="outline" onClick={() => { void stock.refetch(); void shopping.refetch().catch(() => undefined); }}>Réessayer</Button></div>}
    {share && !['saved','captured'].includes(share.status) && <div className="kitchen-notice"><p>Un lien de recette reste à reprendre.</p><Button variant="outline" asChild><Link to="/share-target">Reprendre le partage</Link></Button></div>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="kitchen-today-grid">
      <section className="min-w-0" aria-label="Idée pour ton repas"><PersonalizedRecipeSuggestions featured input={input} onAddStock={()=>setAdd(true)} /></section>
      <KitchenWeekPreview now={now} mealType={input.mealType ?? 'dinner'} />
    </div>
    <section className="kitchen-use-soon" aria-labelledby="use-soon">
      <h2 id="use-soon" className="kitchen-section-title">À utiliser bientôt</h2>
      {stock.loading ? <p className="text-sm text-muted-foreground" role="status">Lecture de ton stock…</p> : soon.length>0 ? <ul className="kitchen-stock-strip">{soon.map(item => {
        const days=calendarDaysUntil(item.expiry_date,now)!;
        const label=days<0 ? 'Date dépassée' : days===0 ? 'Aujourd’hui' : `${days} ${days===1 ? 'jour' : 'jours'}`;
        const photo=item.product?.image_url;
        const category=item.product?.category?.toLocaleLowerCase('fr-FR');
        const StockIcon=category==='légumes' || category==='fruits et légumes' ? Leaf : category==='produits laitiers' ? Milk : Package;
        return <li key={item.id}><Link className="kitchen-stock-item" to={`/pantry/inventory?product=${item.id}`}>
          <span className="kitchen-stock-symbol"><StockIcon aria-hidden="true" strokeWidth={1.25} />{photo && /^(https?:\/\/|\/(?!\/))/.test(photo) && <img key={photo} src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}} />}</span>
          <span><span className="font-medium">{item.product?.name ?? 'Produit à vérifier'}</span><span className="kitchen-stock-separator"> · </span><span className={days<0 ? 'text-destructive' : ''}>{label}</span><span className="sr-only"> · {item.quantity} {item.unit ?? item.product?.unit_type} · {pantryDateLabel(item.expiry_date,now)}</span></span>
        </Link></li>;
      })}</ul> : <p className="text-sm text-muted-foreground">{stock.error ? 'Dates non disponibles pour le moment.' : 'Aucune date proche renseignée.'}</p>}
    </section>
    <MealContextPanel variant="prompt" value={context} onChange={value=>updateContext(value)} defaults={profile.error ? undefined : { minutes:profile.data?.profile.settings.usualTimeMinutes,servings:profile.data?.profile.settings.usualServings }} />
    {intro && !['done','skipped'].includes(intro) && <details className="kitchen-onboarding"><summary>Prendre tes repères</summary><div><p className="text-sm text-muted-foreground">Ajoute quelques ingrédients, puis choisis un repas. Ton profil peut attendre.</p><div className="flex flex-wrap gap-2"><Button onClick={()=>setAdd(true)}>Ajouter des ingrédients</Button><Button variant="outline" asChild><Link to="/kitchen/recipes">Choisir une recette</Link></Button><Button variant="ghost" disabled={saving} onClick={()=>void advance('skipped')}>Passer l’introduction</Button><Button variant="ghost" disabled={saving} onClick={()=>void advance('done')}>J’ai pris mes repères</Button></div></div></details>}
    <QuickStockDialog firstUse open={add} onOpenChange={setAdd} onSaved={() => { void advance('recipe'); void stock.refetch(); setAdd(false); }} />
  </div>;
}
