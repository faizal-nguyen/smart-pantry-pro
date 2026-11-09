import { Link, useLocation } from 'react-router-dom';
import { BookOpen, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { to: '/kitchen/recipes', label: 'Recettes', icon: BookOpen },
  { to: '/kitchen/meal-planning', label: 'Menus', icon: CalendarDays },
] as const;

/** Menus live inside Recettes (audit 2026-11-07, UX P1 1: they were only in the avatar menu). */
export default function RecipesMenusSwitch() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Recettes et menus" className="mb-4 inline-flex gap-1 rounded-lg border bg-muted/40 p-1">
      {LINKS.map(({ to, label, icon: Icon }) => {
        const current = pathname.startsWith(to);
        return (
          <Link key={to} to={to} aria-current={current ? 'page' : undefined}
            className={cn('inline-flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              current ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
            <Icon className="h-4 w-4" aria-hidden="true" />{label}
          </Link>
        );
      })}
    </nav>
  );
}
