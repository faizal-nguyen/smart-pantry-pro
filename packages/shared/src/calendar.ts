/** Dates-only are calendar labels; timestamps are converted in one reference zone. */
export const PANTRY_TIME_ZONE = 'Europe/Paris';
const DAY = 86_400_000;
export function calendarDate(value: string | Date = new Date(), zone = PANTRY_TIME_ZONE): string | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value ? value : null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function calendarDaysUntil(value: string | null | undefined, now = new Date(), zone = PANTRY_TIME_ZONE): number | null {
  if (!value) return null;
  const target = calendarDate(value,zone), today = calendarDate(now,zone);
  return target && today ? (Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`))/DAY : null;
}
export function pantryDateLabel(value: string | null | undefined, now = new Date()): string {
  const days = calendarDaysUntil(value,now);
  if (days == null) return 'Date inconnue';
  const date = calendarDate(value!)!.split('-').reverse().join('/');
  const relative = days === 0 ? 'aujourd’hui' : days === 1 ? 'demain' : days < 0 ? `dépassée de ${-days} j` : `dans ${days} j`;
  return `${date} · ${relative}`;
}
