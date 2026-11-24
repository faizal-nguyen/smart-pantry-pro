/**
 * V11-01 E3c (D9) — the week as an iCalendar file, made in the browser: one all-day event per meal
 * (slots carry no time), identified by the meal, so that a moved meal is updated on a new import. No
 * route, no public link (a subscription feed would need a secret token in a URL).
 */
import type { MenuEntryView } from '@/hooks/useWeeklyMenu';
import { menuWeekLabel } from '@/lib/menuWeek';
import { MEAL_LABELS, slotDate, slotMoment } from '@/lib/menuEdit';

const LINE_OCTETS = 75;
const UID_DOMAIN = 'menus.kitchen-os';

/** RFC 5545 §3.3.11: backslash, semicolon, comma and line breaks are escaped; other controls dropped. */
function text(value: string): string {
  return value
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
    // eslint-disable-next-line no-control-regex -- control characters are what is removed here
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '');
}

const utf8Octets = (codePoint: number) => (codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4);

/** RFC 5545 §3.1: lines of at most 75 octets, continued by a space, never inside a character. */
function fold(line: string): string {
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const character of line) {
    const size = utf8Octets(character.codePointAt(0)!);
    const limit = parts.length ? LINE_OCTETS - 1 : LINE_OCTETS;
    if (octets + size > limit) { parts.push(current); current = ''; octets = 0; }
    current += character;
    octets += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const date = (value: string) => value.replace(/-/g, '');
const stamp = (now: Date) => now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function menuCalendar(weekStart: string, entries: MenuEntryView[], now: Date): string {
  const events = [...entries].sort((a, b) => slotMoment(a) - slotMoment(b)).flatMap(entry => [
    'BEGIN:VEVENT',
    `UID:${text(entry.id)}@${UID_DOMAIN}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART;VALUE=DATE:${date(slotDate(weekStart, entry.day_of_week))}`,
    `DTEND;VALUE=DATE:${date(slotDate(weekStart, entry.day_of_week + 1))}`,
    // The meal's version rises with each edit: a calendar that follows SEQUENCE takes the change.
    `SEQUENCE:${Math.max(0, Math.trunc(entry.version))}`,
    `SUMMARY:${text(`${MEAL_LABELS[entry.meal_type]} : ${entry.recipe_name}`)}`,
    `DESCRIPTION:${entry.servings} portion${entry.servings > 1 ? 's' : ''}`,
    // An all-day meal does not make the day busy.
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ]);
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kitchen OS//Menus//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${text(`Menus — ${menuWeekLabel(weekStart)}`)}`, ...events, 'END:VCALENDAR'];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

export function menuCalendarFileName(weekStart: string): string {
  return `menus-semaine-${weekStart}.ics`;
}
