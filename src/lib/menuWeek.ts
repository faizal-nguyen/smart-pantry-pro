import { calendarWeekStart } from '@smart/shared';

const DAY_MS = 86_400_000;
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayOnly = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', timeZone: 'UTC' });

/** The Monday of the Paris week holding `now`, as AAAA-MM-JJ. */
export function currentMenuWeek(now: Date): string {
  return calendarWeekStart(now)!;
}

/** D8: the week in an address (`?week=`). Anything but a Monday opens the current week. */
export function menuWeekFromParam(value: string | null, now: Date): string {
  return value && calendarWeekStart(value) === value ? value : currentMenuWeek(now);
}

/** The Monday `weeks` weeks before or after this one. */
export function shiftMenuWeek(week: string, weeks: number): string {
  return new Date(Date.parse(`${week}T12:00:00Z`) + weeks * 7 * DAY_MS).toISOString().slice(0, 10);
}

/** « Semaine du 30 nov. → 6 déc. », or « Semaine du 1 → 7 déc. » within a month. */
export function menuWeekLabel(week: string): string {
  const monday = new Date(`${week}T12:00:00Z`);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const start = monday.getUTCMonth() === sunday.getUTCMonth() ? dayOnly.format(monday) : dayMonth.format(monday);
  return `Semaine du ${start} → ${dayMonth.format(sunday)}`;
}
