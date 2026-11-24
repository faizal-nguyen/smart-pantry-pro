/**
 * V11-01 E2 — « Courses de la semaine », served on /shopping/week?week=AAAA-MM-JJ (D8: the week
 * is in the address). Opened from Menus with its week, and from Courses on the current week.
 */
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import KitchenPageHeader from '@/components/layout/KitchenPageHeader';
import WeekShoppingReview from '@/components/shopping/week/WeekShoppingReview';
import { Button } from '@/components/ui/button';
import { useCalendarNow } from '@/hooks/useCalendarNow';
import { currentMenuWeek, menuWeekFromParam, menuWeekLabel, shiftMenuWeek } from '@/lib/menuWeek';

export default function WeekShoppingPage() {
  const now = useCalendarNow();
  const [params, setParams] = useSearchParams();
  const week = menuWeekFromParam(params.get('week'), now);
  const current = currentMenuWeek(now);
  // Changing week replaces the address: going back leaves the review rather than stepping through weeks.
  const goTo = (next: string) => setParams(previous => {
    const copy = new URLSearchParams(previous);
    copy.set('week', next);
    return copy;
  }, { replace: true });

  return <div className="culinary-page kitchen-page kitchen-shopping-page kitchen-week-shopping-page has-purchases">
    <Link className="kitchen-week-back" to={`/kitchen/meal-planning?week=${week}`}><ArrowLeft className="h-4 w-4" aria-hidden="true" />Menus</Link>
    <KitchenPageHeader title="Courses de la semaine" description="Ce que tes repas demandent d’ici dimanche, moins ton stock et ta liste."
      actions={<Button asChild variant="outline" className="min-h-11"><Link to="/shopping/list">Voir ma liste</Link></Button>} />
    <nav className="kitchen-week-navigation" aria-label="Choisir la semaine">
      <Button type="button" variant="ghost" className="h-11 w-11" size="icon" aria-label="Semaine précédente" onClick={() => goTo(shiftMenuWeek(week, -1))}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <div className="flex flex-col items-center text-center">
        <p className="text-sm font-medium">{menuWeekLabel(week)}</p>
        {week !== current && <button type="button" className="min-h-11 text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => goTo(current)}>
          Revenir à cette semaine</button>}
      </div>
      <Button type="button" variant="ghost" className="h-11 w-11" size="icon" aria-label="Semaine suivante" onClick={() => goTo(shiftMenuWeek(week, 1))}>
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
    {/* A new week starts a new review: choices and outcomes never carry over. */}
    <WeekShoppingReview key={week} week={week} />
  </div>;
}
