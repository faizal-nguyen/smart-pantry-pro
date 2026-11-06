import { Link } from 'react-router-dom';
import { calendarDate, calendarWeekStart } from '@smart/shared';
import { useWeeklyMenu, type MenuMealType } from '@/hooks/useWeeklyMenu';
import { Button } from '@/components/ui/button';

/** A read of this week's actual slots; an absent plan is never a sample meal. */
export default function KitchenWeekPreview({ now, mealType }: { now: Date; mealType: MenuMealType }) {
  const today = new Date(`${calendarDate(now)}T12:00:00Z`);
  const dayIndex = (today.getUTCDay() + 6) % 7;
  const menu = useWeeklyMenu(calendarWeekStart(now)!);
  const days = Array.from({ length: Math.min(3, 7 - dayIndex) }, (_, offset) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + offset);
    return { date, entry: menu.data?.entries.find(item => item.day_of_week === dayIndex + offset && item.meal_type === mealType) };
  });
  return <aside className="kitchen-week" aria-labelledby="kitchen-week-title">
    <h2 id="kitchen-week-title" className="kitchen-section-title">Cette semaine</h2>
    {menu.isLoading ? <p className="kitchen-week-status" role="status">Lecture de tes menus…</p>
      : menu.isError ? <div className="kitchen-week-status" role="alert"><p>Menus indisponibles pour le moment.</p><Button variant="ghost" onClick={() => void menu.refetch()}>Réessayer</Button></div>
      : <ul className="kitchen-week-days">{days.map(({ date, entry }, index) => <li key={date.toISOString()}>
        <Link to="/kitchen/meal-planning" className="kitchen-week-day" data-today={index === 0}>
          <span className="kitchen-week-label">{date.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')}</span>
          <span>{entry?.recipe_name || 'Choisir un repas'}</span>
        </Link>
      </li>)}</ul>}
    <Link className="kitchen-week-more" to="/kitchen/meal-planning">Voir mes menus</Link>
  </aside>;
}
