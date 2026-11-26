import { LoadingSkeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { formatDate, calendarDate } from '@smart/shared';
import type { MenuMealType } from '@/hooks/useWeeklyMenu';
import type { MenuRead } from '@/components/kitchen/today/TonightBlock';

/**
 * A read of this week's actual slots; an absent plan is never a sample meal. The home reads the menus
 * once and says a failure in its single alert (V11-06 E5): this block only shows the week.
 */
export default function KitchenWeekPreview({ now, mealType, menu }: { now: Date; mealType: MenuMealType; menu: MenuRead }) {
  const today = new Date(`${calendarDate(now)}T12:00:00Z`);
  const dayIndex = (today.getUTCDay() + 6) % 7;
  const days = Array.from({ length: Math.min(3, 7 - dayIndex) }, (_, offset) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + offset);
    return { date, entry: menu.data?.entries.find(item => item.day_of_week === dayIndex + offset && item.meal_type === mealType) };
  });
  return <aside className="kitchen-week" aria-labelledby="kitchen-week-title">
    <h2 id="kitchen-week-title" className="kitchen-section-title">Cette semaine</h2>
    {menu.isLoading ? <LoadingSkeleton label="Chargement de tes menus…" className="kitchen-week-status space-y-2" />
      : menu.isError ? <p className="kitchen-week-status">Semaine indisponible pour le moment.</p>
      : <ul className="kitchen-week-days">{days.map(({ date, entry }, index) => <li key={date.toISOString()}>
        <Link to="/kitchen/meal-planning" className="kitchen-week-day" data-today={index === 0}>
          <span className="kitchen-week-label">{formatDate(date, 'weekdayShort').replace('.', '')}</span>
          <span>{entry?.recipe_name || 'Choisir un repas'}</span>
        </Link>
      </li>)}</ul>}
    <Link className="kitchen-week-more" to="/kitchen/meal-planning">Voir mes menus</Link>
  </aside>;
}
