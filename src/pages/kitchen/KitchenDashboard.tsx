import { readShareCapture } from '@/services/shareCaptures';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import KitchenWeekPreview from '@/components/meal-planning/KitchenWeekPreview';
import { formatDate, calendarWeekStart, produceReview } from '@smart/shared';
import { useAuthenticatedUser } from '@/hooks/useAuthenticatedUser';
import { useInventory } from '@/hooks/useInventory';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useRoutinePreferences } from '@/hooks/useRoutinePreferences';
import { useWeeklyMenu } from '@/hooks/useWeeklyMenu';
import { useCalendarNow } from '@/hooks/useCalendarNow';
import { useOwnedValue } from '@/lib/ownedStorage';
import { CookingSessionSchema, type CookingSession } from '@/services/cookingSessions';
import { Button } from '@/components/ui/button';
import QuickStockDialog from '@/components/inventory/QuickStockDialog';
import type { SuggestRecommendationsInput } from '@/services/recommendationsApi';
import MealContextPanel from '@/components/recipes/MealContextPanel';
import { defaultMealContext } from '@/lib/mealContext';
import { useCulinaryDesign } from '@/contexts/CulinaryDesignContext';
import { useNutritionProfile } from '@/hooks/useNutritionProfile';
import DailyFoodGuidance from '@/components/recipes/DailyFoodGuidance';
import ResumeCard, { type ResumeAction } from '@/components/kitchen/today/ResumeCard';
import TodayAlert from '@/components/kitchen/today/TodayAlert';
import TonightBlock from '@/components/kitchen/today/TonightBlock';
import UseSoonStrip from '@/components/kitchen/today/UseSoonStrip';
import ToCheckFold from '@/components/kitchen/today/ToCheckFold';
import LazyFold from '@/components/kitchen/today/LazyFold';

/**
 * The home (PRP V11-06, section 8): resume, one alert, the meal of tonight (planned, else suggested),
 * the week on a computer, the stock to use soon, then what is left to check and the advice, folded.
 */
export default function KitchenDashboard() {
  const user = useAuthenticatedUser(), stock = useInventory(), shopping = useShoppingList(), preferences = useRoutinePreferences(), now = useCalendarNow();
  const menu = useWeeklyMenu(calendarWeekStart(now)!);
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
  const produceChecks=stock.loading || stock.error ? [] : stock.inventory.filter(item=>produceReview(item,now));
  const bought = shopping.getPurchasedCount();
  const next: ResumeAction | null = active ? { title:`Reprendre ${active.name}`,detail:active.state==='pending' ? 'Une confirmation reste à vérifier.' : `Étape ${active.step+1} · ${active.servings} ${active.servings===1 ? 'portion' : 'portions'}`,path:`/kitchen/cooking/${active.id}`,cta:'Reprendre ma cuisine' }
    : shopping.pendingTransfer || bought>0 ? { title:'Tes achats attendent leur rangement',detail:shopping.pendingTransfer ? 'Un rangement reste à confirmer.' : `${bought} ${bought===1 ? 'produit coché' : 'produits cochés'}.`,path:'/shopping/list',cta:'Ranger mes achats' }
    : null;
  const failures = [menu.isError && 'tes menus', stock.error && 'ton stock', shopping.error && 'tes courses', sessionsError && 'tes cuisines en cours'].filter((item): item is string => typeof item === 'string');
  const retryReads = () => { void menu.refetch(); void stock.refetch(); void shopping.refetch().catch(() => undefined); };
  const advance = async (introduction:'stock'|'recipe'|'done'|'skipped') => { if (saving) return; setSaving(true); setError(null); try { await preferences.update({ introduction }); } catch (failure) { setError((failure as Error).message); } finally { setSaving(false); } };
  const intro = preferences.data?.introduction;
  const updateContext = (values:Partial<typeof context>) => { try { setContext({ ...context,...values }); } catch (failure) { setError((failure as Error).message); } };
  const mealType = input.mealType ?? 'dinner';
  return <div className="culinary-page kitchen-today" data-culinary-view={design}>
    <header className="kitchen-today-heading">
      <h1 className="culinary-title"><span className="hidden md:inline">Qu’est-ce qu’on cuisine {context.occasion==='lunch' ? 'ce midi' : context.occasion==='snack' ? 'pour une pause' : 'ce soir'} ?</span><span className="md:hidden">{context.occasion==='lunch' ? 'Ce midi' : context.occasion==='snack' ? 'Pour une pause' : 'Ce soir'}, on cuisine ?</span></h1>
      <p className="kitchen-date">{formatDate(now, 'weekdayDayMonth')}</p>
    </header>
    {next && <ResumeCard next={next} />}
    <TodayAlert failures={failures} onRetry={menu.isError || stock.error || shopping.error ? retryReads : undefined} />
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="kitchen-today-grid">
      <TonightBlock menu={menu} now={now} mealType={mealType} input={input} owner={user.id} onAddStock={()=>setAdd(true)} />
      <KitchenWeekPreview now={now} mealType={mealType} menu={menu} />
    </div>
    <UseSoonStrip inventory={stock.inventory} loading={stock.loading} failed={!!stock.error} now={now} />
    <ToCheckFold sharePending={!!share && !['saved','captured'].includes(share.status)} produceCount={produceChecks.length} />
    <LazyFold heading summary="Mieux manger aujourd’hui"><DailyFoodGuidance now={now} heading={false} /></LazyFold>
    <MealContextPanel variant="prompt" value={context} onChange={value=>updateContext(value)} defaults={profile.error ? undefined : { minutes:profile.data?.profile.settings.usualTimeMinutes,servings:profile.data?.profile.settings.usualServings }} />
    {intro && !['done','skipped'].includes(intro) && <details className="kitchen-onboarding"><summary>Prendre tes repères</summary><div><p className="text-sm text-muted-foreground">Ajoute quelques ingrédients, puis choisis un repas. Ton profil peut attendre.</p><div className="flex flex-wrap gap-2"><Button className="min-h-11" onClick={()=>setAdd(true)}>Ajouter des ingrédients</Button><Button variant="outline" className="min-h-11" asChild><Link to="/kitchen/recipes">Choisir une recette</Link></Button><Button variant="ghost" className="min-h-11" disabled={saving} onClick={()=>void advance('skipped')}>Passer l’introduction</Button><Button variant="ghost" className="min-h-11" disabled={saving} onClick={()=>void advance('done')}>J’ai pris mes repères</Button></div></div></details>}
    <QuickStockDialog firstUse presentation="sheet" open={add} onOpenChange={setAdd} onSaved={() => { void advance('recipe'); void stock.refetch(); setAdd(false); }} />
  </div>;
}
